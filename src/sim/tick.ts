// One simulation step: derive the network and service areas (cached on
// asset changes), run the automated market dispatch, solve the DC power
// flow, decide which homes have power, and roll the costs into the bill.

import { busId, deriveNetwork, lineBranchId, txBranchId, type PlacedAsset } from './assets';
import { LINES, SUBS } from './catalog';
import { solveDcPowerFlow } from './grid/dcpf';
import type { Network, PowerFlowResult } from './grid/types';
import { V_BROWNOUT, V_COLLAPSE } from './grid/voltage';
import { runDispatch, type DispatchResult } from './market/dispatch';
import { computeBill, type BillBreakdown } from './regulation/bill';
import { assignServiceAreas, type ServiceAreas } from './service';
import type { GameState, SimContext } from './state';
import { MINUTES_PER_TICK } from './protocol';

/** Tile power status, in the snapshot coverage array. */
export const COV = {
  /** No demand on this tile. */
  empty: 0,
  /** Demand but no serving substation. */
  unserved: 1,
  /** Powered normally. */
  on: 2,
  /** Powered but degraded: low voltage, overloaded substation, or rationing. */
  brownout: 3,
  /** Serving substation exists but is de-energized. */
  off: 4,
} as const;

/** Smoothed-energy-cost time constant, game-minutes (≈2 game-days). */
const ENERGY_EMA_TAU_MIN = 2880;

export interface Derived {
  version: number;
  net: Network;
  service: ServiceAreas;
}

export interface BranchView {
  /** Owning asset id (line asset, or substation for its transformer). */
  assetId: number;
  kind: 'line' | 'tx';
  flowMW: number;
  ratingMW: number;
}

export interface TickOutputs {
  pf: PowerFlowResult;
  dispatch: DispatchResult;
  /** COV code per tile, row-major. */
  coverage: Uint8Array;
  branches: BranchView[];
  /** [assetId, level, voltage pu] for every bus. */
  volts: Array<[number, number, number]>;
  servedCustomers: number;
  bill: BillBreakdown;
}

export function derive(state: GameState, ctx: SimContext): Derived {
  return {
    version: state.assetsVersion,
    net: deriveNetwork(state.assets.values()),
    service: assignServiceAreas(ctx.map, state.assets.values()),
  };
}

/** Advance game time by one tick (no-op at speed 0). */
export function advanceTime(state: GameState): void {
  if (state.speed === 0) return;
  state.tick += 1;
  state.simTimeMin += MINUTES_PER_TICK * state.speed;
}

/** Solve the current operating point; optionally roll cost accumulators
 *  forward by one tick of game-time (false for command-triggered re-solves
 *  so paused inspection never advances costs). */
export function solveTick(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  accumulate: boolean,
): TickOutputs {
  const { net, service } = derived;
  const dispatch = runDispatch(net, state.assets.values(), service.loadMWOfSub);
  const pf = solveDcPowerFlow(net, dispatch.injections, {
    slackPreference: dispatch.slackPreference,
  });

  // smoothed wholesale cost (annualized), advanced by this tick's game-time
  if (accumulate && state.speed > 0) {
    const dtMin = MINUTES_PER_TICK * state.speed;
    const alpha = dtMin / (dtMin + ENERGY_EMA_TAU_MIN);
    const instYrK = dispatch.costKPerHour * 8760;
    state.energyCostYrK += (instYrK - state.energyCostYrK) * alpha;
  }

  const coverage = buildCoverage(state, ctx, derived, dispatch, pf);
  let servedCustomers = 0;
  for (const tile of service.subOfTile.keys()) {
    const cov = coverage[tile] ?? COV.empty;
    if (cov === COV.on || cov === COV.brownout) {
      servedCustomers += ctx.map.customers[tile] ?? 0;
    }
  }

  const branches = buildBranchViews(state.assets, pf);
  const volts: Array<[number, number, number]> = [];
  for (const bus of net.buses) {
    const asset = state.assets.get(Math.floor(bus.id / 4));
    if (!asset) continue;
    volts.push([asset.id, bus.level, pf.voltage.get(bus.id) ?? 0]);
  }

  const bill = computeBill(
    state.assets.values(),
    state.energyCostYrK,
    servedCustomers,
    service.totalCustomers,
  );

  return { pf, dispatch, coverage, branches, volts, servedCustomers, bill };
}

function buildCoverage(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  dispatch: DispatchResult,
  pf: PowerFlowResult,
): Uint8Array {
  const { map } = ctx;
  const coverage = new Uint8Array(map.width * map.height);
  const { service } = derived;

  // every demand tile starts unserved; assignment upgrades it below
  for (const tile of ctx.demand.byTile.keys()) coverage[tile] = COV.unserved;

  for (const [tile, subId] of service.subOfTile) {
    const sub = state.assets.get(subId);
    if (!sub || sub.kind !== 'sub') continue;
    const v = pf.voltage.get(busId(subId, 33)) ?? 0;
    const frac = dispatch.servedFracOfSub.get(subId) ?? 0;
    if (v < V_COLLAPSE || frac <= 0) {
      coverage[tile] = COV.off;
    } else if (v < V_BROWNOUT || frac < 0.999) {
      coverage[tile] = COV.brownout;
    } else {
      coverage[tile] = COV.on;
    }
  }
  return coverage;
}

function buildBranchViews(assets: Map<number, PlacedAsset>, pf: PowerFlowResult): BranchView[] {
  const views: BranchView[] = [];
  for (const a of assets.values()) {
    if (a.kind === 'line') {
      views.push({
        assetId: a.id,
        kind: 'line',
        flowMW: pf.flowMW.get(lineBranchId(a.id)) ?? 0,
        ratingMW: LINES[a.level].ratingMW,
      });
    } else if (a.kind === 'sub' && SUBS[a.sub].levels.length === 2) {
      views.push({
        assetId: a.id,
        kind: 'tx',
        flowMW: pf.flowMW.get(txBranchId(a.id)) ?? 0,
        ratingMW: SUBS[a.sub].txRatingMW,
      });
    }
  }
  return views;
}
