// One simulation step: weather moves, vegetation creeps, faults roll, the
// orange vans race to site, the network and service areas are derived
// (cached on asset changes), the automated market dispatches, the DC
// power flow solves, overloaded kit heats up and trips (cascading within
// the tick), homes get power or don't, CI/CML accrue, and the costs roll
// into the bill.

import { busId, deriveNetwork, lineBranchId, txBranchId } from './assets';
import { LINES, SUBS, VEG_POLICY } from './catalog';
import { COV } from './coverage';
import { routeTiles } from './cost';
import { solveDcPowerFlow } from './grid/dcpf';
import type { Network, PowerFlowResult } from './grid/types';
import { V_BROWNOUT, V_COLLAPSE } from './grid/voltage';
import { runDispatch, type DispatchResult } from './market/dispatch';
import { stepWeather, sunFactor, windFactor } from './events/weather';
import { growVegetation, isStorm, rollFaults } from './reliability/faults';
import { stepFleet, syncVans } from './fleet/fleet';
import { computeBill, type BillBreakdown } from './regulation/bill';
import { updateReliability } from './regulation/kpis';
import { Rng } from './rng';
import { assignServiceAreas, type ServiceAreas } from './service';
import { pushEvent, type GameState, type SimContext } from './state';
import { MINUTES_PER_TICK } from './protocol';

export { COV } from './coverage';

/** Smoothing time constant for rolling KPIs, game-minutes (≈2 game-days). */
const KPI_EMA_TAU_MIN = 2880;
/** Overload heat (loading-above-rating · minutes) that trips a branch. */
const TRIP_HEAT = 60;
/** Loading that trips instantly (protection can't ride through). */
const TRIP_INSTANT = 2.0;
/** Thermal trips auto-reclose once the kit cools, game-minutes. */
const TRIP_RECLOSE_MIN = 90;
/** Outage sentinel: waiting on a repair crew (no auto timer). */
export const AWAITING_CREW = -1;
const MAX_CASCADE = 5;

export interface Derived {
  version: number;
  net: Network;
  service: ServiceAreas;
  /** line asset id → woodland density along its route, 0..1. */
  routeVeg: Map<number, number>;
}

export interface BranchView {
  /** Owning asset id (line asset, or substation for its transformer). */
  assetId: number;
  kind: 'line' | 'tx';
  flowMW: number;
  ratingMW: number;
  /** Out of service: repair game-minutes remaining, or -1 awaiting crew. */
  outMin?: number | undefined;
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
  /** Indicative system frequency for the dial, Hz. */
  freqHz: number;
}

export function derive(state: GameState, ctx: SimContext): Derived {
  const routeVeg = new Map<number, number>();
  for (const a of state.assets.values()) {
    if (a.kind !== 'line' || a.build !== 'overhead') continue;
    const endA = state.assets.get(a.a);
    const endB = state.assets.get(a.b);
    if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
    let sum = 0;
    const tiles = routeTiles(endA.x, endA.y, endB.x, endB.y);
    for (const [x, y] of tiles) {
      sum += (ctx.map.vegetation[y * ctx.map.width + x] ?? 0) / 255;
    }
    routeVeg.set(a.id, tiles.length > 0 ? sum / tiles.length : 0);
  }
  return {
    version: state.assetsVersion,
    net: deriveNetwork(state.assets.values()),
    service: assignServiceAreas(ctx.map, state.assets.values()),
    routeVeg,
  };
}

/** Advance game time by one tick (no-op at speed 0). */
export function advanceTime(state: GameState): void {
  if (state.speed === 0) return;
  state.tick += 1;
  state.simTimeMin += MINUTES_PER_TICK * state.speed;
}

function applyOutages(net: Network, state: GameState): void {
  for (const br of net.branches) br.inService = !state.outages.has(br.id);
}

function runPowerFlow(
  state: GameState,
  derived: Derived,
  dtMin: number,
): { dispatch: DispatchResult; pf: PowerFlowResult } {
  const dispatch = runDispatch(derived.net, state.assets.values(), derived.service.loadOfSub, {
    simTimeMin: state.simTimeMin,
    weather: state.weather,
    soc: state.soc,
    dtMin,
  });
  const pf = solveDcPowerFlow(derived.net, dispatch.injections, {
    slackPreference: dispatch.slackPreference,
  });
  return { dispatch, pf };
}

function assetLabel(state: GameState, assetId: number): string {
  const a = state.assets.get(assetId);
  if (!a) return 'asset';
  if (a.kind === 'line') return `${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'}`;
  if (a.kind === 'sub') return SUBS[a.sub].name.split(' (')[0] ?? 'substation';
  return 'asset';
}

/** Solve the current operating point; when `accumulate` is set the tick's
 *  game-time elapses (weather, faults, vans, heating/trips, SoC, rolling
 *  KPIs). False for command-triggered re-solves so paused inspection
 *  changes nothing. */
export function solveTick(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  accumulate: boolean,
): TickOutputs {
  const dtMin = accumulate && state.speed > 0 ? MINUTES_PER_TICK * state.speed : 0;
  const rng = new Rng(state.rngState);

  if (dtMin > 0) {
    stepWeather(state.weather, rng, dtMin);
    if (isStorm(state.weather.wind) && !state.stormAnnounced) {
      state.stormAnnounced = true;
      pushEvent(state, 'warn', 'storm over the region — overhead lines at risk');
    } else if (!isStorm(state.weather.wind) && state.weather.wind < 0.7) {
      state.stormAnnounced = false;
    }

    growVegetation(
      state.lineVeg,
      state.assets.values(),
      derived.routeVeg,
      VEG_POLICY[state.vegPolicy]?.growthMul ?? 1,
      dtMin,
    );

    // new faults open repair jobs and de-energize their branch
    const faults = rollFaults(
      state.assets.values(),
      state.assets,
      new Set(state.outages.keys()),
      state.lineVeg,
      state.weather.wind,
      rng,
      dtMin,
    );
    for (const f of faults) {
      state.outages.set(f.branchId, AWAITING_CREW);
      state.jobs.set(f.branchId, {
        branchId: f.branchId,
        assetId: f.assetId,
        x: f.x,
        y: f.y,
        repairMin: f.repairMin,
        waitedMin: 0,
        label: f.label,
      });
      pushEvent(state, 'bad', f.label, f.x, f.y);
    }

    // thermal trips auto-reclose on their timer; crew jobs have none
    for (const [id, left] of [...state.outages]) {
      if (left === AWAITING_CREW) continue;
      if (left - dtMin <= 0) {
        state.outages.delete(id);
        state.heat.delete(id);
        pushEvent(state, 'info', `${assetLabel(state, Math.floor(id / 4))} back in service`);
      } else {
        state.outages.set(id, left - dtMin);
      }
    }

    // the orange vans
    state.vans = syncVans(state.vans, state.fleetSize, state.assets.values());
    const fleet = stepFleet(state.vans, state.jobs, state.assets.values(), dtMin);
    for (const r of fleet.restored) {
      state.outages.delete(r.branchId);
      state.heat.delete(r.branchId);
      pushEvent(
        state,
        'info',
        r.by === 'crew'
          ? `crew restored the ${assetLabel(state, r.assetId)}`
          : `contractors finally restored the ${assetLabel(state, r.assetId)}`,
      );
    }
  }

  applyOutages(derived.net, state);
  let { dispatch, pf } = runPowerFlow(state, derived, dtMin);

  if (dtMin > 0) {
    // overload heating → trips → cascade re-solve
    for (let round = 0; round < MAX_CASCADE; round++) {
      const tripped: number[] = [];
      for (const br of derived.net.branches) {
        if (!br.inService) continue;
        const loading = Math.abs(pf.flowMW.get(br.id) ?? 0) / Math.max(1e-6, br.ratingMW);
        if (loading > TRIP_INSTANT) {
          tripped.push(br.id);
        } else if (loading > 1) {
          const heat = (state.heat.get(br.id) ?? 0) + (loading - 1) * dtMin;
          state.heat.set(br.id, heat);
          if (heat > TRIP_HEAT) tripped.push(br.id);
        } else {
          const heat = state.heat.get(br.id) ?? 0;
          if (heat > 0) state.heat.set(br.id, Math.max(0, heat - 0.5 * dtMin));
        }
      }
      if (tripped.length === 0) break;
      for (const id of tripped) {
        state.outages.set(id, TRIP_RECLOSE_MIN);
        pushEvent(state, 'warn', `overload tripped the ${assetLabel(state, Math.floor(id / 4))}`);
      }
      applyOutages(derived.net, state);
      ({ dispatch, pf } = runPowerFlow(state, derived, 0));
    }

    // rolling KPIs
    const alpha = dtMin / (dtMin + KPI_EMA_TAU_MIN);
    state.energyCostYrK += (dispatch.costKPerHour * 8760 - state.energyCostYrK) * alpha;
    state.carbonEMA += (dispatch.carbonG - state.carbonEMA) * alpha;
    state.curtailedMWh += (dispatch.curtailedMW * dtMin) / 60;
    state.rngState = rng.getState();
  }

  const coverage = buildCoverage(state, ctx, derived, dispatch, pf);
  if (dtMin > 0) {
    updateReliability(state.reliability, state.offTiles, coverage, ctx.map, dtMin);
  }

  let servedCustomers = 0;
  for (const tile of derived.service.subOfTile.keys()) {
    const cov = coverage[tile] ?? COV.empty;
    if (cov === COV.on || cov === COV.brownout) {
      servedCustomers += ctx.map.customers[tile] ?? 0;
    }
  }

  const branches = buildBranchViews(state, pf);
  const volts: Array<[number, number, number]> = [];
  for (const bus of derived.net.buses) {
    const asset = state.assets.get(Math.floor(bus.id / 4));
    if (!asset) continue;
    volts.push([asset.id, bus.level, pf.voltage.get(bus.id) ?? 0]);
  }

  const bill = computeBill(
    state.assets.values(),
    state.energyCostYrK,
    servedCustomers,
    derived.service.totalCustomers,
    state.fleetSize,
    state.vegPolicy,
  );

  // indicative frequency: sags with unserved connected demand
  const deficit = dispatch.connectedMW > 0 ? 1 - dispatch.servedMW / dispatch.connectedMW : 0;
  const freqHz = Math.max(47.5, 50 - 1.5 * deficit) + (dtMin > 0 ? (rng.next() - 0.5) * 0.04 : 0);
  if (dtMin > 0) state.rngState = rng.getState();

  return { pf, dispatch, coverage, branches, volts, servedCustomers, bill, freqHz };
}

/** Current weather/renewable factors for the HUD. */
export function weatherView(state: GameState): { sun: number; wind: number; cloud: number } {
  return {
    sun: sunFactor(state.simTimeMin, state.weather),
    wind: windFactor(state.weather, false),
    cloud: state.weather.cloud,
  };
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

function buildBranchViews(state: GameState, pf: PowerFlowResult): BranchView[] {
  const views: BranchView[] = [];
  for (const a of state.assets.values()) {
    if (a.kind === 'line') {
      const id = lineBranchId(a.id);
      views.push({
        assetId: a.id,
        kind: 'line',
        flowMW: pf.flowMW.get(id) ?? 0,
        ratingMW: LINES[a.level].ratingMW,
        outMin: state.outages.get(id),
      });
    } else if (a.kind === 'sub' && SUBS[a.sub].levels.length === 2) {
      const id = txBranchId(a.id);
      views.push({
        assetId: a.id,
        kind: 'tx',
        flowMW: pf.flowMW.get(id) ?? 0,
        ratingMW: SUBS[a.sub].txRatingMW,
        outMin: state.outages.get(id),
      });
    }
  }
  return views;
}
