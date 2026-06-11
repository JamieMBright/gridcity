// One simulation step: weather moves, vegetation creeps, faults roll, the
// orange vans race to site, councils electrify, applications and pitches
// arrive, the automated market dispatches, the DC power flow solves,
// overloaded kit heats up and trips (cascading within the tick), homes
// get power or don't, CI/CML and satisfaction accrue, and every cost
// rolls into the bill.

import { busId, deriveNetwork, lineBranchId, txBranchId } from './assets';
import { LINES, SUBS, VEG_POLICY } from './catalog';
import { COV } from './coverage';
import { routeTiles } from './cost';
import { solveDcPowerFlow } from './grid/dcpf';
import type { Network, PowerFlowResult } from './grid/types';
import { V_BROWNOUT, V_COLLAPSE } from './grid/voltage';
import { runDispatch, type DispatchResult } from './market/dispatch';
import { stepWeather, sunFactor, windFactor } from './events/weather';
import {
  GEN_OF_KIND,
  LATE_PENALTY_K_PER_DAY,
  maybeSpawnApplication,
} from './events/applications';
import {
  DLR_RATING_MUL,
  DRONE_VEG_COST_MUL,
  DRONE_VEG_GROWTH_MUL,
  maybeSpawnPitch,
} from './events/innovation';
import {
  adoptionMilestones,
  newCouncilState,
  stepAdoption,
  stepSatisfaction,
} from './customers/adoption';
import { growVegetation, isStorm, rollFaults } from './reliability/faults';
import { stepFleet, syncVans } from './fleet/fleet';
import { computeBill, type BillBreakdown } from './regulation/bill';
import { updateReliability } from './regulation/kpis';
import { Rng } from './rng';
import { assetAtTile } from './commands';
import { assignServiceAreas, computeSubLoads, type ServiceAreas } from './service';
import { NO_COUNCIL } from './map/types';
import { pushEvent, type GameState, type SimContext } from './state';
import { GENS } from './catalog';
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
const MIN_PER_YEAR = 525_600;

export interface Derived {
  version: string;
  net: Network;
  service: ServiceAreas;
  /** line asset id → woodland density along its route, 0..1. */
  routeVeg: Map<number, number>;
}

export function deriveKey(state: GameState): string {
  return `${state.assetsVersion}:${state.sitesVersion}:${state.tech.dlr ? 1 : 0}`;
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
  /** Customer-weighted council satisfaction, 0..100. */
  satisfactionAvg: number;
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
    version: deriveKey(state),
    net: deriveNetwork(state.assets.values(), state.tech.dlr ? DLR_RATING_MUL : 1),
    service: assignServiceAreas(ctx.map, state.assets.values(), state.loadSites),
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
  ctx: SimContext,
  derived: Derived,
  dtMin: number,
): { dispatch: DispatchResult; pf: PowerFlowResult } {
  const loads = computeSubLoads(
    ctx.map,
    derived.service.tilesOfSub,
    state.councils,
    state.loadSites,
  );
  const dispatch = runDispatch(derived.net, state.assets.values(), loads, {
    simTimeMin: state.simTimeMin,
    weather: state.weather,
    soc: state.soc,
    dtMin,
    tech: { smartEv: state.tech.smartEv, flexMarket: state.tech.flexMarket },
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

const TECH_NAMES = { ev: 'EVs', hp: 'heat pumps', pv: 'rooftop solar' } as const;

/** Solve the current operating point; when `accumulate` is set the tick's
 *  game-time elapses. False for command-triggered re-solves so paused
 *  inspection changes nothing. */
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
      (VEG_POLICY[state.vegPolicy]?.growthMul ?? 1) *
        (state.tech.droneVeg ? DRONE_VEG_GROWTH_MUL : 1),
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

    // a new connection application?
    const connectedCustomers = [...derived.service.customersOfSub.values()].reduce(
      (a, b) => a + b,
      0,
    );
    const taken = (x: number, y: number): boolean =>
      assetAtTile(state.assets.values(), x, y) !== undefined ||
      state.loadSites.some((l) => l.x === x && l.y === y) ||
      state.applications.some((a) => a.status === 'open' && a.x === x && a.y === y);
    const app = maybeSpawnApplication(
      ctx.map,
      rng,
      dtMin,
      state.simTimeMin,
      connectedCustomers,
      state.nextAppId,
      taken,
    );
    if (app) {
      state.nextAppId++;
      state.applications.push(app);
      pushEvent(
        state,
        'warn',
        `connection application: ${app.name} (${app.mw} MW ${GEN_OF_KIND[app.kind] ? 'generation' : 'demand'})`,
        app.x,
        app.y,
      );
    }
    for (const a of state.applications) {
      if (a.status === 'open' && state.simTimeMin > a.decideByMin) {
        a.status = 'expired';
        pushEvent(state, 'info', `${a.name} withdrew their application`);
      }
    }

    // innovation pipeline
    const pitch = maybeSpawnPitch(
      rng,
      dtMin,
      state.simTimeMin,
      state.tech,
      state.pitches,
      state.nextAppId,
    );
    if (pitch) {
      state.nextAppId++;
      state.pitches.push(pitch);
      pushEvent(state, 'warn', `innovation pitch: ${pitch.title}`);
    }
    for (const p of state.pitches) {
      if (p.status === 'open' && state.simTimeMin > p.decideByMin) {
        p.status = 'expired';
      } else if (
        p.status === 'funded' &&
        p.completesAtMin !== undefined &&
        state.simTimeMin >= p.completesAtMin
      ) {
        if (rng.chance(p.successPct / 100)) {
          p.status = 'succeeded';
          state.tech[p.tech] = true;
          if (p.tech === 'dlr') state.assetsVersion++; // re-derive ratings
          pushEvent(state, 'info', `${p.title}: delivered — capability unlocked`);
        } else {
          p.status = 'failed';
          pushEvent(state, 'bad', `${p.title}: the project failed`);
        }
      }
    }
  }

  applyOutages(derived.net, state);
  let { dispatch, pf } = runPowerFlow(state, ctx, derived, dtMin);

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
      ({ dispatch, pf } = runPowerFlow(state, ctx, derived, 0));
    }

    // rolling KPIs
    const alpha = dtMin / (dtMin + KPI_EMA_TAU_MIN);
    state.energyCostYrK += (dispatch.costKPerHour * 8760 - state.energyCostYrK) * alpha;
    state.carbonEMA += (dispatch.carbonG - state.carbonEMA) * alpha;
    state.flexYrK += (dispatch.flexCostKPerHour * 8760 - state.flexYrK) * alpha;
    state.constraintYrK += (dispatch.constraintKPerHour * 8760 - state.constraintYrK) * alpha;
    state.curtailedFirmMWh += (dispatch.curtailedFirmMW * dtMin) / 60;
    state.curtailedFlexMWh += (dispatch.curtailedFlexMW * dtMin) / 60;
    state.rngState = rng.getState();
  }

  const coverage = buildCoverage(state, derived, dispatch, pf, ctx);
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

  // councils: adoption + satisfaction (and accepted-connection progress)
  const satisfactionAvg = stepCouncils(state, ctx, derived, coverage, pf, dtMin);

  const branches = buildBranchViews(state, pf);
  const volts: Array<[number, number, number]> = [];
  for (const bus of derived.net.buses) {
    const asset = state.assets.get(Math.floor(bus.id / 4));
    if (!asset) continue;
    volts.push([asset.id, bus.level, pf.voltage.get(bus.id) ?? 0]);
  }

  // liquidated damages run-rate for accepted-but-dark connections
  let overdue = 0;
  for (const a of state.applications) {
    if (
      (a.status === 'firm' || a.status === 'flex') &&
      a.connectByMin !== undefined &&
      state.simTimeMin > a.connectByMin
    ) {
      overdue++;
    }
  }

  const bill = computeBill({
    assets: state.assets.values(),
    energyYrK: state.energyCostYrK,
    servedCustomers,
    totalCustomers: derived.service.totalCustomers,
    fleetSize: state.fleetSize,
    vegPolicy: state.vegPolicy,
    vegCostMul: state.tech.droneVeg ? DRONE_VEG_COST_MUL : 1,
    flexYrK: state.flexYrK,
    constraintYrK: state.constraintYrK,
    penaltyYrK: overdue * LATE_PENALTY_K_PER_DAY * 365,
    levyPct: state.levyPct,
  });

  if (dtMin > 0) {
    state.innovationFundK += (bill.innovationYrK * dtMin) / MIN_PER_YEAR;
  }

  // indicative frequency: sags with unserved connected demand
  const deficit = dispatch.connectedMW > 0 ? 1 - dispatch.servedMW / dispatch.connectedMW : 0;
  const freqHz = Math.max(47.5, 50 - 1.5 * deficit) + (dtMin > 0 ? (rng.next() - 0.5) * 0.04 : 0);
  if (dtMin > 0) state.rngState = rng.getState();

  return {
    pf,
    dispatch,
    coverage,
    branches,
    volts,
    servedCustomers,
    bill,
    freqHz,
    satisfactionAvg,
  };
}

/** Adoption + satisfaction per council; also marks accepted connections
 *  live once they're actually energized. Returns avg satisfaction. */
function stepCouncils(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  coverage: Uint8Array,
  pf: PowerFlowResult,
  dtMin: number,
): number {
  const { map } = ctx;
  interface Agg {
    tot: number;
    on: number;
    brown: number;
    off: number;
  }
  const byCouncil = new Map<number, Agg>();
  for (const i of derived.service.demandTiles) {
    const cid = map.council[i] ?? NO_COUNCIL;
    if (cid === NO_COUNCIL) continue;
    const customers = map.customers[i] ?? 0;
    if (customers === 0) continue;
    let agg = byCouncil.get(cid);
    if (!agg) {
      agg = { tot: 0, on: 0, brown: 0, off: 0 };
      byCouncil.set(cid, agg);
    }
    agg.tot += customers;
    const cov = coverage[i];
    if (cov === COV.on) agg.on += customers;
    else if (cov === COV.brownout) agg.brown += customers;
    else if (cov === COV.off) agg.off += customers;
  }

  let satNum = 0;
  let satDen = 0;
  for (const profile of map.councils) {
    const agg = byCouncil.get(profile.id);
    if (!agg) continue;
    let cs = state.councils.get(profile.id);
    if (!cs) {
      cs = newCouncilState();
      state.councils.set(profile.id, cs);
    }
    if (dtMin > 0) {
      const energized = agg.on + agg.brown;
      const target =
        energized + agg.off > 0
          ? (85 * agg.on + 45 * agg.brown + 5 * agg.off) / (energized + agg.off)
          : 0;
      stepSatisfaction(cs, target, dtMin);
      const before = { ev: cs.ev, hp: cs.hp, pv: cs.pv };
      stepAdoption(
        cs,
        profile,
        agg.tot > 0 ? energized / agg.tot : 0,
        0.3 + 0.7 * (cs.satisfaction / 100),
        dtMin,
      );
      for (const m of adoptionMilestones(before, cs)) {
        pushEvent(
          state,
          'warn',
          `${profile.name}: ${m.pct}% of homes now have ${TECH_NAMES[m.tech]}`,
        );
      }
    }
    satNum += cs.satisfaction * agg.tot;
    satDen += agg.tot;
  }

  // accepted connections go live when their kit is actually energized
  if (dtMin > 0) {
    for (const a of state.applications) {
      if (a.status !== 'firm' && a.status !== 'flex') continue;
      let live = false;
      if (a.assetId !== undefined) {
        const asset = state.assets.get(a.assetId);
        if (asset?.kind === 'gen') {
          live = (pf.voltage.get(busId(a.assetId, GENS[asset.gen].level)) ?? 0) > 0;
        }
      } else {
        live = coverage[a.y * map.width + a.x] === COV.on;
      }
      if (live) {
        a.status = 'connected';
        pushEvent(state, 'info', `${a.name} is connected and live`, a.x, a.y);
      } else if (a.connectByMin !== undefined && state.simTimeMin > a.connectByMin) {
        if (!a.overdueNotified) {
          a.overdueNotified = true;
          pushEvent(state, 'bad', `${a.name} is overdue — paying liquidated damages`, a.x, a.y);
        }
      }
    }
  }

  return satDen > 0 ? satNum / satDen : 0;
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
  derived: Derived,
  dispatch: DispatchResult,
  pf: PowerFlowResult,
  ctx: SimContext,
): Uint8Array {
  const { map } = ctx;
  const coverage = new Uint8Array(map.width * map.height);
  const { service } = derived;

  // every demand tile starts unserved; assignment upgrades it below
  for (const tile of service.demandTiles) coverage[tile] = COV.unserved;

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
  const lineMul = state.tech.dlr ? DLR_RATING_MUL : 1;
  const views: BranchView[] = [];
  for (const a of state.assets.values()) {
    if (a.kind === 'line') {
      const id = lineBranchId(a.id);
      views.push({
        assetId: a.id,
        kind: 'line',
        flowMW: pf.flowMW.get(id) ?? 0,
        ratingMW: LINES[a.level].ratingMW * lineMul,
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
