// One simulation step: weather moves, vegetation creeps, faults roll, the
// orange vans race to site, councils electrify, applications and pitches
// arrive, the automated market dispatches, the DC power flow solves,
// overloaded kit heats up and trips (cascading within the tick), homes
// get power or don't, CI/CML and satisfaction accrue, and every cost
// rolls into the bill.

import { assetOfId, busId, deriveNetwork, lineBranchId, subMva, txBranchId } from './assets';
import { LINE_UPRATE_MUL, LINES, SUB_UPGRADE_AT, SUBS, TX_PAIR, VEG_POLICY } from './catalog';
import { COV } from './coverage';
import { routeTiles } from './cost';
import { solveDcPowerFlow } from './grid/dcpf';
import { findIslands } from './grid/topology';
import type { Network, PowerFlowResult } from './grid/types';
import { V_BROWNOUT, V_COLLAPSE } from './grid/voltage';
import { runDispatch, underConstruction, type DispatchResult } from './market/dispatch';
import { systemFrequencyHz } from './market/frequency';
import { stepWeather, sunFactor, windFactor } from './events/weather';
import { LONDON_PROFILE, type WeatherProfile } from './powerProfile';
import {
  buildHeathrowScheme,
  LATE_PENALTY_K_PER_DAY,
  maybeSpawnApplications,
  stepAppeals,
} from './events/applications';
import {
  bumpAllMoods,
  developerOf,
  dingCurtailedDevelopers,
  stepTenders,
} from './events/developers';
import {
  maybeAmbientNews,
  newsAppealOutcome,
  newsApplicationSubmitted,
} from './events/news';
import { stepIncidents } from './events/incidents';
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
import {
  SMART_CHARGE_SAT_BONUS,
  shapeSubLoads,
  smartChargingCostK,
} from './customers/smartCharging';
import { touSatisfactionOffset } from './events/innovation';
import { applyMaintenanceWindows, maintRateYrK, networkHealthPct } from './reliability/ageing';
import { growVegetation, isStorm, rollFaults } from './reliability/faults';
import { callCsatDelta, callHandlingView, scoutSpeedMul, stormPrepYrK } from './reliability/stormprep';
import { hseFineYrK, rolloverSafetyPeriod, stepSafety } from './reliability/safety';
import {
  connectionCadenceMul,
  earlyWarnFrac,
  fleetSpeedMul,
  innovationSuccessMul,
  orgYrK,
  riioCompositeDelta,
  satisfactionBonus,
  vegGrowthMul,
} from './events/directorates';
import {
  claimsYrK,
  maybeSeedGroupClaim,
  seedInjuryClaim,
  stepLitigation,
} from './events/litigation';
import { stepFleet, syncVans } from './fleet/fleet';
import {
  assetCapexK,
  assetOpexFrac,
  computeBill,
  type BillBreakdown,
} from './regulation/bill';
import { kpiRates, updateReliability } from './regulation/kpis';
import {
  actualNetworkTotexYrK,
  allowedRevenue,
  networkCapexOnRegisterK,
  ravEngaged,
  reliabilityIncentiveYrK,
  rollRav,
  type AllowedRevenue,
} from './regulation/rav';
import {
  closePeriod,
  gradeOf,
  newPeriod,
  nextTargets,
  resolveWeights,
  PERIOD_MIN,
  PERIOD_YEARS,
  type PeriodActuals,
} from './regulation/riio';
import { Rng } from './rng';
import { assetAtTile, footprintTiles } from './commands';
import { assignServiceAreas, computeSubLoads, type ServiceAreas } from './service';
import { CUSTOMERS_PER_TILE, NO_COUNCIL, RC, TERRAIN, ZONE, type Zone } from './map/types';
import { buildDemandField } from './map/demand';
import { pushEvent, type BillDetailState, type GameState, type SimContext } from './state';
import { ANNUITY_FACTOR, GENS } from './catalog';
import { MINUTES_PER_TICK, type BillDetailLine, type BillDetailRow } from './protocol';
import type { PlacedAsset } from './assets';

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

/** Ofgem-benchmark efficient NETWORK totex the TIM measures actual against,
 *  £k per served customer per year (~£110/customer/yr of annuitised network
 *  capex + opex for a reasonable mature DNO). A lean grid (low totex per
 *  customer) beats this → sharing reward; a gold-plated one overspends →
 *  penalty. The yardstick is the served base, not the operator's own
 *  spend, so it is a genuine efficiency lever. */
const EFFICIENT_TOTEX_PER_CUSTOMER_K = 0.11;

/** The regulator's rebuild grace after "the Night the Grid Vanished":
 *  the first ~3 game-months. CI/CML scoring and firm-curtailment
 *  constraint payments are both suspended in this window — you're
 *  rebuilding the inherited blank grid, not running a failing one.
 *  London only; missions have their own framing. */
export const REBUILD_GRACE_MIN = 90 * 1440; // ~3 months
function rebuildGraceActive(state: GameState): boolean {
  return state.scenarioId === 'london' && state.simTimeMin < REBUILD_GRACE_MIN;
}

export interface Derived {
  version: string;
  net: Network;
  service: ServiceAreas;
  /** line asset id → woodland density along its route, 0..1. */
  routeVeg: Map<number, number>;
  /** council id → pylon blight: overhead route tiles passing homes,
   *  weighted by voltage (residents hate a 400 kV crossing; section
   *  undergrounding through town is the cure). */
  blight: Map<number, number>;
}

export function deriveKey(state: GameState): string {
  // the fortnightly epoch re-runs service assignment so DER growth
  // (EVs, heat pumps) slowly squeezes catchments between asset changes
  const epoch = Math.floor(state.simTimeMin / 20_160);
  return `${state.assetsVersion}:${state.sitesVersion}:${state.tech.dlr ? 1 : 0}:${epoch}`;
}

export interface BranchView {
  /** Owning asset id (line asset, or substation for its transformer). */
  assetId: number;
  kind: 'line' | 'tx';
  flowMW: number;
  ratingMW: number;
  /** I²R loss at the current flow, MW (absent when out / no flow). */
  lossMW?: number | undefined;
  /** Out of service: repair game-minutes remaining, or -1 awaiting crew. */
  outMin?: number | undefined;
  /** Why it's out (storm/tree/overload) — the inspector's diagnosis. */
  cause?: string | undefined;
}

// --- network losses (I²R) ------------------------------------------------
//
// Per-unit I²R on the catalog's 100 MVA system base: with V ≈ 1 pu,
// loss_pu = flow_pu² · r_pu, i.e. lossMW = flowMW² · r / S_BASE. No
// extra calibration constant is needed — the catalog's r values already
// land a heavily loaded long 132 kV run in the real 2–4% band: 240 MW
// over 30 km (r = 30 · 0.0004 = 0.012 pu) loses 240² · 0.012 / 100
// ≈ 6.9 MW ≈ 2.9% of its flow. Resistance never changes after build:
// re-conductoring (uprating) raises ratings, not r, and the catalog
// carries the same rPerTile for cable as for overhead — only shorter
// or lower-r routes cut losses.
export const LOSS_S_BASE_MVA = 100;

/** I²R loss of one branch at a given flow, MW. */
export function branchLossMW(flowMW: number, rPu: number): number {
  return (flowMW * flowMW * rPu) / LOSS_S_BASE_MVA;
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
  /** Load-weighted system frequency for the dial, Hz — undefined when no
   *  island is electrified (HUD shows N/A). */
  freqHz: number | undefined;
  /** Customer-weighted council satisfaction, 0..100. */
  satisfactionAvg: number;
  /** The price-control money (regulation/rav.ts): RAV £k, allowed revenue
   *  vs actual totex, sharing + incentive. Present ONLY once the layer has
   *  phased in (the network is up and running); undefined keeps day-0
   *  uncluttered. */
  regulatory?: RegulatoryView | undefined;
}

/** The regulatory-finance readout surfaced once the RAV layer engages. */
export interface RegulatoryView {
  /** RAV — depreciated book value of the network built, £k. */
  ravK: number;
  /** Cumulative network capex committed (RAV gross pool), £k. */
  ravGrossK: number;
  /** Allowed-revenue building blocks, £k/yr. */
  revenue: AllowedRevenue;
}

const BLIGHT_WEIGHT: Record<number, number> = { 400: 3, 132: 2, 33: 1 };

export function derive(state: GameState, ctx: SimContext): Derived {
  const { map } = ctx;
  const routeVeg = new Map<number, number>();
  const blight = new Map<number, number>();
  for (const a of state.assets.values()) {
    if (a.kind !== 'line' || a.build !== 'overhead') continue;
    const endA = state.assets.get(a.a);
    const endB = state.assets.get(a.b);
    if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
    let sum = 0;
    const tiles = routeTiles(endA.x, endA.y, endB.x, endB.y);
    for (const [x, y] of tiles) {
      sum += (map.vegetation[y * map.width + x] ?? 0) / 255;
      // wires over the garden fence: each route tile beside homes blights
      // the council whose residents live under it
      let bestCouncil = -1;
      let bestCustomers = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
          const ni = ny * map.width + nx;
          const cust = map.customers[ni] ?? 0;
          const cid = map.council[ni] ?? NO_COUNCIL;
          if (cust > bestCustomers && cid !== NO_COUNCIL) {
            bestCustomers = cust;
            bestCouncil = cid;
          }
        }
      }
      if (bestCouncil >= 0) {
        blight.set(bestCouncil, (blight.get(bestCouncil) ?? 0) + (BLIGHT_WEIGHT[a.level] ?? 1));
      }
    }
    routeVeg.set(a.id, tiles.length > 0 ? sum / tiles.length : 0);
  }
  return {
    version: deriveKey(state),
    net: deriveNetwork(state.assets.values(), state.tech.dlr ? DLR_RATING_MUL : 1),
    service: assignServiceAreas(ctx.map, state.assets.values(), state.loadSites, state.councils),
    routeVeg,
    blight,
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
  // demand-side programmes (#18 smart charging per council, #24 ToU
  // tariff) re-shape the aggregated loads so dispatch's global diurnal
  // factors land on the programme shapes — see customers/smartCharging.ts
  shapeSubLoads(
    loads,
    derived.service.tilesOfSub,
    ctx.map,
    state.councils,
    state.tech,
    state.simTimeMin,
  );
  const dispatch = runDispatch(derived.net, state.assets.values(), loads, {
    simTimeMin: state.simTimeMin,
    weather: state.weather,
    soc: state.soc,
    dtMin,
    tech: { smartEv: state.tech.smartEv, flexMarket: state.tech.flexMarket },
    weatherProfile: ctx.profile.weather,
    power: ctx.profile.power,
    market: ctx.profile.market,
  });
  const pf = solveDcPowerFlow(derived.net, dispatch.injections, {
    slackPreference: dispatch.slackPreference,
  });
  return { dispatch, pf };
}

/** Sites that drop off supply get an explanation, not a mystery: on
 *  every live→dark transition of a service substation, diagnose its
 *  island and say WHY (sun set on a solar-only island, wind died, kit
 *  tripped upstream, plant still under construction…). */
function explainSupplyLosses(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  pf: PowerFlowResult,
): void {
  const first = state.subLive.size === 0; // first tick after load: baseline silently
  let islands: ReturnType<typeof findIslands> | undefined;
  for (const a of state.assets.values()) {
    if (a.kind !== 'sub' || SUBS[a.sub].serviceRadius === undefined) continue;
    const live = (pf.voltage.get(busId(a.id, 33)) ?? 0) > 0;
    const was = state.subLive.get(a.id);
    state.subLive.set(a.id, live);
    if (first || was !== true || live) continue;

    islands ??= findIslands(derived.net);
    const gi = islands.islandOf.get(busId(a.id, 33)) ?? -1;
    let reason = 'no generation reaches it — look for tripped lines or transformers upstream';
    if (gi >= 0) {
      let any = false;
      let best = 0;
      let solar = false;
      let wind = false;
      let building = false;
      for (const g of state.assets.values()) {
        if (g.kind !== 'gen') continue;
        if ((islands.islandOf.get(busId(g.id, GENS[g.gen].level)) ?? -2) !== gi) continue;
        any = true;
        if (underConstruction(g, state.simTimeMin)) {
          building = true;
          continue;
        }
        if (g.gen === 'solarFarm') solar = true;
        if (g.gen === 'windOnshore' || g.gen === 'windOffshore') wind = true;
        const avail =
          g.gen === 'solarFarm'
            ? sunFactor(state.simTimeMin, state.weather, ctx.profile.weather)
            : g.gen === 'windOnshore' || g.gen === 'windOffshore'
              ? windFactor(state.weather, g.gen === 'windOffshore')
              : g.gen === 'battery'
                ? (state.soc.get(g.id) ?? 0) > 1
                  ? 1
                  : 0
                : 1;
        best = Math.max(best, avail);
      }
      if (any && best < 0.05) {
        reason = solar
          ? 'the sun has set on its only supply — solar makes nothing at night; add a battery or firm backup'
          : wind
            ? 'the wind has died on its only supply — pair it with storage or firm plant'
            : building
              ? 'its plant is still under construction'
              : 'its generation is unavailable right now';
      } else if (any) {
        reason = 'supply shortfall — its circuit cannot carry the load right now';
      }
    }
    pushEvent(state, 'warn', `${SUBS[a.sub].name.split(' (')[0]} dark — ${reason}`, a.x, a.y);
  }
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
  // Tutorial missions stay focused: a beginner mid-lesson must not be
  // ambushed by UNRELATED connection applications, innovation pitches or
  // random storm faults that have nothing to do with the thing they're
  // learning (owner playtest feedback — "prevent unrelated applications/
  // events spawning during tutorials, they confuse learners"). Scripted
  // mission content is unaffected: m3's storm fault is injected directly by
  // its script (tripSeededLine, not rollFaults) and m4's data-centre is
  // pushed by its seed(), so suppressing the RANDOM spawners below leaves
  // the deterministic lesson beats intact. Sandbox ('london') is untouched.
  const inMission = state.scenarioId !== 'london';

  if (dtMin > 0) {
    stepWeather(state.weather, rng, dtMin, state.simTimeMin, ctx.profile.weather);
    // the live storm banner (UI reads stormAnnounced): the named-storm
    // regime gets its own richer banner via stepIncidents below, so only
    // announce the generic one for a windy-wet front that gusts past the
    // fault threshold without being a named storm.
    if (isStorm(state.weather.wind) && !state.stormAnnounced) {
      state.stormAnnounced = true;
      if (state.weather.regime !== 'storm') {
        pushEvent(state, 'warn', 'storm over the region — overhead lines at risk');
      }
    } else if (!isStorm(state.weather.wind) && state.weather.wind < 0.7) {
      state.stormAnnounced = false;
    }

    growVegetation(
      state.lineVeg,
      state.assets.values(),
      derived.routeVeg,
      // proactive tree maintenance (#53 Asset Management × engagement):
      // a resourced, engaged asset team trims ahead of the season, so
      // overgrowth creeps slower (fewer tree faults)
      (VEG_POLICY[state.vegPolicy]?.growthMul ?? 1) *
        (state.tech.droneVeg ? DRONE_VEG_GROWTH_MUL : 1) *
        vegGrowthMul(state.org),
      dtMin,
    );

    // new faults open repair jobs and de-energize their branch; aged
    // kit faults more (simTimeMin + heat feed the ageing hazard curve).
    // In a tutorial mission we suppress the RANDOM roll entirely — the
    // only fault a lesson should ever see is the one its script injects
    // (m3's storm), so an unrelated tree-fall never blindsides a learner.
    const faults = inMission
      ? []
      : rollFaults(
          state.assets.values(),
          state.assets,
          new Set(state.outages.keys()),
          state.lineVeg,
          state.weather.wind,
          rng,
          dtMin,
          state.simTimeMin,
          state.heat,
          state.weather.activeStormName,
        );
    for (const f of faults) {
      state.outages.set(f.branchId, AWAITING_CREW);
      state.outageCause.set(f.branchId, f.label);
      state.jobs.set(f.branchId, {
        branchId: f.branchId,
        assetId: f.assetId,
        x: f.x,
        y: f.y,
        repairMin: f.repairMin,
        waitedMin: 0,
        label: f.label,
      });
      pushEvent(state, 'bad', f.label, f.x, f.y, f.major);
    }

    // thermal trips auto-reclose on their timer; crew jobs have none
    for (const [id, left] of [...state.outages]) {
      if (left === AWAITING_CREW) continue;
      if (left - dtMin <= 0) {
        state.outages.delete(id);
        state.outageCause.delete(id);
        state.heat.delete(id);
        pushEvent(state, 'info', `${assetLabel(state, assetOfId(id))} back in service`);
      } else {
        state.outages.set(id, left - dtMin);
      }
    }

    // planned maintenance (#16): open due windows as timed outages (no
    // fleet job — the night crew is booked), complete expired ones
    // (outage cleared, health restored). reliability/ageing.ts.
    applyMaintenanceWindows(state);

    // the orange vans (+ any surge contractor crews still on hire)
    state.vans = syncVans(
      state.vans,
      state.fleetSize +
        (state.simTimeMin < (state.surgeUntilMin ?? 0) ? (state.surgeVans ?? 0) : 0),
      state.assets.values(),
    );
    // faster fault response (#53 Network Operations × engagement): an
    // engaged, well-staffed control room drives and repairs faster, so
    // faults clear sooner (lower CML). Scaling the fleet step's dtMin
    // speeds travel AND repair proportionally — without touching fleet.ts.
    // Storm-prep SCOUTS stack on top: office staff driving the lines find
    // faults sooner, so jobs hand off (and the contractor clock ticks)
    // faster over the scout window — the eyes-on-the-network restoration
    // benefit (reliability/stormprep.ts scoutSpeedMul).
    const fleet = stepFleet(
      state.vans,
      state.jobs,
      state.assets.values(),
      dtMin * fleetSpeedMul(state.org) * scoutSpeedMul(state),
      ctx.map, // drive on the road network (W7b)
    );
    for (const r of fleet.restored) {
      state.outages.delete(r.branchId);
      state.outageCause.delete(r.branchId);
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
      state.applications.some(
        (a) => (a.status === 'open' || a.status === 'appeal') && a.x === x && a.y === y,
      );
    // faster application cadence + more opportunities (#53 Connections ×
    // engagement): a staffed, engaged team turns offers around quicker,
    // so the pipeline flows faster (scaling dtMin lifts the arrival rate
    // without changing the RNG draw count — one chance() either way)
    const cadence = connectionCadenceMul(state.org);
    // live council satisfaction reader, so a contented (NIMBY) electorate
    // weights its planning determinations harder
    const satOf = (councilId: number): number =>
      state.councils.get(councilId)?.satisfaction ?? 50;
    // No unsolicited connection applications during a tutorial: the only
    // application a lesson shows is the one its seed() places (m4's Eastbox
    // Compute), so a learner is never distracted by a random data-centre or
    // solar farm landing mid-lesson.
    const apps = inMission
      ? []
      : maybeSpawnApplications(
          ctx.map,
          rng,
          dtMin * cadence,
          state.simTimeMin,
          connectedCustomers,
          state.nextAppId,
          taken,
          satOf,
        );
    for (const app of apps) {
      state.nextAppId++;
      state.applications.push(app);
      // brownfield-favoured / appeal-aware planning headline (council-named,
      // coord-tagged so it click-to-jumps like every other event)
      newsApplicationSubmitted(state, app);
    }
    // step open planning appeals: when a council's ~30-day determination
    // window closes, realise the pre-rolled outcome and feature it on the
    // news banner (approved → ready to connect; refused → lapses)
    for (const outcome of stepAppeals(state.applications, state.simTimeMin)) {
      newsAppealOutcome(state, outcome.app, outcome.approved);
    }
    // the bespoke once-per-game Heathrow PV+BESS scheme: fires when the
    // deterministic (dedicated-seed) schedule passes, routing through the
    // normal firm/flex + connection-study flow and the news banner
    if (
      state.scenarioId === 'london' &&
      state.heathrowSchemeFired !== true &&
      state.heathrowSchemeMin !== undefined &&
      state.simTimeMin >= state.heathrowSchemeMin
    ) {
      const scheme = buildHeathrowScheme(ctx.map, state.simTimeMin, state.nextAppId, taken);
      state.heathrowSchemeFired = true; // once per game, even if siting fails
      if (scheme) {
        state.nextAppId++;
        state.applications.push(scheme);
        pushEvent(
          state,
          'warn',
          `Heathrow Airport applies to connect a ${scheme.mw} MW solar + ${scheme.bessMw} MW battery scheme`,
          scheme.x,
          scheme.y,
        );
      }
    }

    for (const a of state.applications) {
      if (a.status === 'open' && state.simTimeMin > a.decideByMin) {
        a.status = 'expired';
        pushEvent(state, 'info', `${a.name} withdrew their application`);
      }
    }

    // innovation pipeline
    // the region keeps muttering between real events
    maybeAmbientNews(state, rng, dtMin);

    // Innovation pitches are sandbox colour too — a beginner learning to
    // wire a village should never field a tech-funding proposal.
    const pitch = inMission
      ? undefined
      : maybeSpawnPitch(
          rng,
          dtMin * cadence,
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
    // developer market: bids accrue on open tenders, deadlines pass
    stepTenders(state, rng, dtMin);

    for (const p of state.pitches) {
      if (p.status === 'open' && state.simTimeMin > p.decideByMin) {
        p.status = 'expired';
      } else if (
        p.status === 'funded' &&
        p.completesAtMin !== undefined &&
        state.simTimeMin >= p.completesAtMin
      ) {
        // bigger innovation benefit (#53 engagement): engaged teams
        // deliver projects more reliably (the odds lift, clamped ≤ 0.99)
        if (rng.chance(Math.min(0.99, (p.successPct / 100) * innovationSuccessMul(state.org)))) {
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

    // H&S incidents (#55) and litigation (#54) — gated to the live London
    // game: tutorial missions stay free of suits and injuries (beginners
    // must not get sued or hurt while learning). Both roll off `rng`, so
    // they ride the seeded stream like every other event here.
    if (state.scenarioId === 'london') {
      // named weather disasters (storm / flooding / heatwave) + their
      // consequences. Flood damage registers through the same job/outage
      // bookkeeping as a fault, so the orange vans turn out for it too.
      stepIncidents(state, rng, dtMin, (branchId, assetId, x, y, repairMin, label, major) => {
        state.outages.set(branchId, AWAITING_CREW);
        state.outageCause.set(branchId, label);
        state.jobs.set(branchId, { branchId, assetId, x, y, repairMin, waitedMin: 0, label });
        pushEvent(state, 'bad', label, x, y, major);
      });

      const healthForSafety = networkHealthPct(state);
      const incident = stepSafety(state, rng, dtMin, healthForSafety, isStorm(state.weather.wind));
      // an LTI seeds a personal-injury claim (#54 ← #55)
      if (incident.lti) seedInjuryClaim(state, incident.lti.cause);
      stepLitigation(state, rng, dtMin, derived.blight, (cid) => councilCoord(ctx, cid));
    }
  }

  if (dtMin > 0) {
    // construction completing this tick → the plant is commissioned
    for (const a of state.assets.values()) {
      if (a.kind !== 'gen' || a.liveAtMin === undefined) continue;
      if (a.liveAtMin <= state.simTimeMin && a.liveAtMin > state.simTimeMin - dtMin) {
        pushEvent(state, 'info', `${GENS[a.gen].name} commissioned — first power`, a.x, a.y);
      }
    }

    // earlier overload early-warnings (#53 Asset Management × engagement):
    // a resourced, engaged asset team spots a transformer creeping toward
    // its rating sooner. Fired at most once a game-day (the day-boundary
    // gate dedupes without per-sub state) so an under-pressure catchment
    // surfaces before it auto-reinforces or trips.
    const warnFrac = earlyWarnFrac(state.org);
    const dayBoundary =
      Math.floor(state.simTimeMin / 1440) > Math.floor((state.simTimeMin - dtMin) / 1440);

    // auto-reinforcement: a substation running hot against its fitted
    // transformer steps up to the next MVA size (capex lands on bills)
    let reinforced = false;
    for (const a of state.assets.values()) {
      if (a.kind !== 'sub' || a.idno || a.mvaAuto === false) continue;
      const steps = SUBS[a.sub].mvaSteps;
      if (!steps) continue;
      const mva = subMva(a);
      const peak = derived.service.peakOfSub.get(a.id) ?? 0;
      const next = steps.find((s) => s > mva);
      if (next !== undefined && peak > SUB_UPGRADE_AT * mva) {
        a.mva = next;
        reinforced = true;
        pushEvent(
          state,
          'warn',
          `reinforcement: ${SUBS[a.sub].name.split(' (')[0]} uprated to ${next} MVA`,
          a.x,
          a.y,
        );
      } else if (
        dayBoundary &&
        next !== undefined &&
        peak > warnFrac * mva &&
        peak <= SUB_UPGRADE_AT * mva
      ) {
        pushEvent(
          state,
          'warn',
          `early warning: ${SUBS[a.sub].name.split(' (')[0]} is at ${Math.round((peak / mva) * 100)}% of its ${mva} MVA — reinforce before it bites`,
          a.x,
          a.y,
        );
      }
    }
    if (reinforced) state.assetsVersion++;
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
        state.outageCause.set(id, 'overload — ran past its thermal rating and tripped');
        pushEvent(state, 'warn', `overload tripped the ${assetLabel(state, assetOfId(id))}`);
      }
      applyOutages(derived.net, state);
      ({ dispatch, pf } = runPowerFlow(state, ctx, derived, 0));
    }
  }

  // network losses at the final operating point: per branch (for the
  // line inspector, even while paused) and per owning asset (for the
  // bill drill-down)
  const lossOfBranch = new Map<number, number>();
  const lossOfAsset = new Map<number, number>();
  let lossMWTotal = 0;
  for (const br of derived.net.branches) {
    if (!br.inService) continue;
    const mw = branchLossMW(pf.flowMW.get(br.id) ?? 0, br.r);
    if (mw <= 0) continue;
    lossOfBranch.set(br.id, mw);
    const owner = assetOfId(br.id);
    lossOfAsset.set(owner, (lossOfAsset.get(owner) ?? 0) + mw);
    lossMWTotal += mw;
  }

  if (dtMin > 0) {
    // rolling KPIs
    const alpha = dtMin / (dtMin + KPI_EMA_TAU_MIN);
    state.energyCostYrK += (dispatch.costKPerHour * 8760 - state.energyCostYrK) * alpha;
    state.genCostYrK += (dispatch.ppaTopupKPerHour * 8760 - state.genCostYrK) * alpha;
    state.carbonEMA += (dispatch.carbonG - state.carbonEMA) * alpha;
    state.flexYrK += (dispatch.flexCostKPerHour * 8760 - state.flexYrK) * alpha;
    // rebuild grace: firm-curtailment constraint payments are real (you
    // promised firm access and can't deliver it) — but not while you're
    // rebuilding the vanished grid. For the first ~3 months they're
    // waived; the curtailment still physically happens, it just isn't
    // billed. After the grace, over-procuring firm gen costs as it should.
    const constraintK = rebuildGraceActive(state) ? 0 : dispatch.constraintKPerHour;
    state.constraintYrK += (constraintK * 8760 - state.constraintYrK) * alpha;
    // losses bought at the running marginal price (the DNO's energy)
    const lossKPerHour = (lossMWTotal * dispatch.priceMWh) / 1000;
    state.lossYrK += (lossKPerHour * 8760 - state.lossYrK) * alpha;
    foldBillDetail(state.billDetail, dispatch, lossOfAsset, dispatch.priceMWh, alpha);
    state.curtailedFirmMWh += (dispatch.curtailedFirmMW * dtMin) / 60;
    state.curtailedFlexMWh += (dispatch.curtailedFlexMW * dtMin) / 60;
    // roll the Regulated Asset Value: absorb newly-committed network capex
    // into the pool, then depreciate it straight-line. The gross pool
    // tracks the register total (so a demolition retires its iron), and
    // the RAV (net) builds quietly from day 0 even before the layer's
    // revenue/incentive surfaces — exactly the owner's "starts at zero,
    // builds up as the network grows, engages once we're running".
    rollRav(state.rav, networkCapexOnRegisterK(state.assets.values()), dtMin);
    state.rngState = rng.getState();
  }

  const coverage = buildCoverage(state, derived, dispatch, pf, ctx);
  if (dtMin > 0) {
    updateReliability(
      state.reliability,
      state.offTiles,
      coverage,
      ctx.map,
      dtMin,
      !rebuildGraceActive(state),
    );
    explainSupplyLosses(state, ctx, derived, pf);
  }

  let servedCustomers = 0;
  for (const tile of derived.service.subOfTile.keys()) {
    const cov = coverage[tile] ?? COV.empty;
    if (cov === COV.on || cov === COV.brownout) {
      servedCustomers += ctx.map.customers[tile] ?? 0;
    }
  }
  // high-water mark of customers ever simultaneously served (transient)
  const everServed = Math.max(state.everServedCustomers ?? 0, servedCustomers);
  state.everServedCustomers = everServed;

  if (state.scenarioId === 'london' && dtMin > 0) {
    // group litigation (#54): customer-minutes lost in the CURRENT
    // continuous mass-outage episode. A group action is a LOSS from a
    // grid you actually ran — gated on having energized a real base
    // (everServed), so the day-0 blank grid you're rebuilding and the
    // seeded-but-unconnected iDNO estates never trigger it. Once the
    // accumulator clears (few served customers are off) it resets, so
    // only a genuinely prolonged mass outage seeds a group action.
    const GROUP_MIN_EVER_SERVED = 5_000; // you've run a town before suing applies
    const darkServed = Math.max(0, everServed - servedCustomers);
    const GROUP_RESET_CUSTOMERS = 200; // episode "over" below this many lost
    if (everServed >= GROUP_MIN_EVER_SERVED && darkServed >= GROUP_RESET_CUSTOMERS) {
      let worst = { x: 0, y: 0, c: 0 };
      for (const tile of state.offTiles) {
        if (!derived.service.subOfTile.has(tile)) continue;
        const c = ctx.map.customers[tile] ?? 0;
        if (c > worst.c) worst = { x: tile % ctx.map.width, y: Math.floor(tile / ctx.map.width), c };
      }
      state.groupOutageCustMin = (state.groupOutageCustMin ?? 0) + darkServed * dtMin;
      if (maybeSeedGroupClaim(state, state.groupOutageCustMin, worst.x, worst.y)) {
        state.groupOutageCustMin = 0; // a claim is filed: don't re-file this episode
      }
    } else {
      state.groupOutageCustMin = undefined;
    }
  }

  // storm call-handling CSAT: the interrupted-customer count drives call
  // volume; if it overwhelms the (baseline + drafted) call-handling
  // capacity the answer time blows past the < 5 s target and CSAT takes a
  // transient hit (reliability/stormprep.ts). We measure interruptions as
  // customers who HAD supply and lost it (everServed − servedCustomers) —
  // the same dark-served proxy the group-litigation accumulator uses — so
  // a day-0 unenergized grid raises no calls. Folds into the satisfaction
  // TARGET in stepCouncils (anger-fast per adoption.ts).
  const interruptedCustomers = Math.max(0, everServed - servedCustomers);
  const callView = callHandlingView(state, interruptedCustomers);
  const callCsat = callCsatDelta(callView.answerSeconds);

  // councils: adoption + satisfaction (and accepted-connection progress)
  const { satisfactionAvg, smartChargingYrK } = stepCouncils(
    state,
    ctx,
    derived,
    coverage,
    pf,
    dtMin,
    callCsat,
  );

  const branches = buildBranchViews(state, pf, lossOfBranch);
  const volts: Array<[number, number, number]> = [];
  for (const bus of derived.net.buses) {
    const asset = state.assets.get(assetOfId(bus.id));
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
  // the market watches how you treat connections: every overdue one
  // drains all developer moods at −10 per 30 game-days
  if (dtMin > 0 && overdue > 0) {
    bumpAllMoods(state, (-10 * overdue * dtMin) / (30 * 1440));
  }

  const bill = computeBill({
    assets: state.assets.values(),
    energyYrK: state.energyCostYrK,
    ppaYrK: state.genCostYrK,
    lossYrK: state.lossYrK,
    servedCustomers,
    totalCustomers: derived.service.totalCustomers,
    fleetSize: state.fleetSize,
    vegPolicy: state.vegPolicy,
    vegCostMul: state.tech.droneVeg ? DRONE_VEG_COST_MUL : 1,
    // funded smart-charging programmes (#18) are demand-side flexibility
    // spend: their live £k/yr rate (per-council EV count × programme
    // price, from stepCouncils) rides the flexibility bill line the way
    // stormPrepYrK rides penaltyYrK below — bill.ts itself is untouched
    flexYrK: state.flexYrK + smartChargingYrK,
    constraintYrK: state.constraintYrK,
    // storm-prep + maintenance/replacement spend ride the constraint/
    // damages line (each decays in its own module). The network business
    // dials (#53 directorate staffing + pay + safety, orgYrK), litigation
    // settlements (#54 claimsYrK) and HSE fines (#55 hseFineYrK) ride the
    // same line — all spend comes off the bill, bill.ts untouched.
    penaltyYrK:
      overdue * LATE_PENALTY_K_PER_DAY * 365 +
      stormPrepYrK(state, dtMin) +
      maintRateYrK(state, dtMin) +
      orgYrK(state.org) +
      claimsYrK(state, dtMin) +
      hseFineYrK(state, dtMin),
    levyPct: state.levyPct,
    economy: ctx.profile.economy,
    generation: ctx.profile.generation,
  });

  if (dtMin > 0) {
    state.innovationFundK += (bill.innovationYrK * dtMin) / MIN_PER_YEAR;

    // month boundary: curtailment grievances + town growth
    const MONTH_MIN = 43_200;
    if (
      Math.floor(state.simTimeMin / MONTH_MIN) >
      Math.floor((state.simTimeMin - dtMin) / MONTH_MIN)
    ) {
      dingCurtailedDevelopers(state, bill.genYrK);
      growTown(state, ctx, derived, rng, coverage, everServed);
    }

    // regulatory period bookkeeping + report card at period end
    const p = state.period;
    p.billIntegral += bill.perCustomerYr * dtMin;
    p.carbonIntegral += state.carbonEMA * dtMin;
    p.satIntegral += satisfactionAvg * dtMin;
    p.custIntegral += servedCustomers * dtMin;
    p.weightMin += dtMin;
    if (state.simTimeMin >= p.startMin + PERIOD_MIN) {
      const actuals = currentPeriodActuals(state);
      // the active regulator weighs the report-card columns its own way
      // (Ofgem default unless the country profile overrides — HK reliability,
      // AU affordability + PV-hosting, etc.)
      const card = closePeriod(p, actuals, resolveWeights(ctx.profile.regulator.kpiWeights));
      // #53 Regulation & Finance writes better submissions (a small
      // composite nudge); #55 safety performance bites the rating — each
      // LTI this period dents it (no deaths, ever — but injuries cost).
      const ltiThisPeriod = state.safety
        ? state.safety.ltiTotal - state.safety.ltiPeriodStart
        : 0;
      const adjusted = Math.max(
        0,
        Math.min(100, card.composite + riioCompositeDelta(state.org) - Math.min(15, 3 * ltiThisPeriod)),
      );
      card.composite = adjusted;
      card.grade = gradeOf(adjusted);
      state.lastReport = card;
      rolloverSafetyPeriod(state);
      pushEvent(
        state,
        card.composite >= 55 ? 'info' : 'bad',
        `RIIO-${card.index} closed: grade ${card.grade} (${card.composite}/100)`,
      );
      const next = newPeriod(p.index + 1, p.startMin + PERIOD_MIN, nextTargets(p.targets, actuals));
      next.ciStart = state.reliability.ciCustomers;
      next.cmlStart = state.reliability.cmlCustomerMin;
      next.curtailedFirmStart = state.curtailedFirmMWh;
      state.period = next;
    }
  }

  // system frequency: the load-weighted mean of every ELECTRIFIED island's
  // own supply/demand-balance frequency (market/frequency.ts). With no
  // island carrying load (the day-0 blank grid) there is nothing spinning
  // — freqHz is undefined and the HUD shows N/A rather than a made-up
  // deficit. A small seeded jitter rides a live, served grid.
  const sysHz = systemFrequencyHz(dispatch.freqSamples);
  const freqHz =
    sysHz === undefined ? undefined : sysHz + (dtMin > 0 ? (rng.next() - 0.5) * 0.04 : 0);
  if (dtMin > 0) state.rngState = rng.getState();

  // the price-control money: surface the RAV / allowed-revenue / sharing /
  // incentive once the layer has phased in. Engagement is sticky (once the
  // network is up and running it stays shown), gated past the rebuild
  // grace, a real RAV and a real served base. Computed every solve (so the
  // panel reads live even while paused), but kept undefined before
  // engagement so day-0 has no regulatory clutter.
  let regulatory: RegulatoryView | undefined;
  if (ravEngaged(state.rav, servedCustomers, rebuildGraceActive(state))) {
    state.rav.engaged = true;
    const totex = actualNetworkTotexYrK(state.assets.values());
    const actualTotexYrK = totex.capexYrK + totex.opexYrK;
    // the efficient totex ALLOWANCE: an Ofgem benchmark scaled to the
    // network being run (£/served customer/yr), NOT the operator's own
    // spend — so it is a real yardstick. Build a lean grid (low totex per
    // customer) and you beat allowance → the TIM rewards you; gold-plate
    // (heavy iron per customer) and you overspend → it bites. The £/
    // customer figure is calibrated to a reasonable mature DNO totex
    // (~£110/served customer/yr of network annuity+opex).
    const totexAllowanceYrK = (EFFICIENT_TOTEX_PER_CUSTOMER_K * servedCustomers);
    const rates = kpiRates(state.reliability, derived.service.totalCustomers, state.simTimeMin);
    const incentiveYrK = reliabilityIncentiveYrK(
      rates.ciPer100PerYr,
      state.period.targets.ci,
      rates.cmlMinPerYr,
      state.period.targets.cml,
      servedCustomers,
    );
    const revenue = allowedRevenue({
      rav: state.rav,
      actualTotexYrK,
      opexAllowanceYrK: totex.opexYrK,
      incentiveYrK,
      totexAllowanceYrK,
    });
    regulatory = { ravK: state.rav.netK, ravGrossK: state.rav.grossK, revenue };
  }

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
    regulatory,
  };
}

/** A representative map tile for a council (its first land tile) — the
 *  jump-to coordinate for a wayleave/blight claim. Scans once per claim
 *  roll (rare), so the linear search is fine. */
function councilCoord(ctx: SimContext, councilId: number): { x: number; y: number } | undefined {
  const { map } = ctx;
  for (let i = 0; i < map.council.length; i++) {
    if (map.council[i] === councilId) return { x: i % map.width, y: Math.floor(i / map.width) };
  }
  return undefined;
}

/** Adoption + satisfaction per council; also marks accepted connections
 *  live once they're actually energized. Returns avg satisfaction plus
 *  the live smart-charging programme rate (#18) for the bill. */
function stepCouncils(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  coverage: Uint8Array,
  pf: PowerFlowResult,
  dtMin: number,
  callCsat: number,
): { satisfactionAvg: number; smartChargingYrK: number } {
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
  let smartChargingYrK = 0;
  // ToU launch grumble (#24): a licence-wide satisfaction-target dip that
  // fades over the weeks after the pilot lands (derived from the pitch —
  // no extra state, identical paused or running)
  const touOffset = touSatisfactionOffset(state.simTimeMin, state.pitches);
  for (const profile of map.councils) {
    const agg = byCouncil.get(profile.id);
    if (!agg) continue;
    let cs = state.councils.get(profile.id);
    if (!cs) {
      cs = newCouncilState();
      state.councils.set(profile.id, cs);
    }
    // funded smart charging (#18) bills at the live programme rate —
    // recomputed every solve from the council's CURRENT EV count, so the
    // line grows with adoption and stops the moment the programme does
    if (cs.smartCharging === true) {
      smartChargingYrK += smartChargingCostK(agg.tot * cs.ev);
    }
    if (dtMin > 0) {
      const energized = agg.on + agg.brown;
      let target =
        energized + agg.off > 0
          ? (85 * agg.on + 45 * agg.brown + 5 * agg.off) / (energized + agg.off)
          : 0;
      // pylon blight: overhead circuits over the rooftops cap the mood —
      // amenity undergrounding through town buys it back
      if (target > 0) {
        target = Math.max(0, target - Math.min(12, 0.35 * (derived.blight.get(profile.id) ?? 0)));
      }
      // demand-side programmes move the mood: being paid to plug in is
      // popular (#18); the ToU launch grumble fades to nothing (#24)
      if (target > 0) {
        if (cs.smartCharging === true) target += SMART_CHARGE_SAT_BONUS;
        // satisfaction recovery (#53 Customer Service × engagement): a
        // resourced, engaged customer team lifts the mood and wins trust
        // back faster after an outage
        target = Math.min(100, Math.max(0, target + touOffset + satisfactionBonus(state.org)));
        // storm call-handling: if the call centre can't answer inside the
        // < 5 s target during the surge, the residents who are OFF supply
        // and can't get through punish the mood. The licence-wide answer-
        // time CSAT delta lands in proportion to THIS council's off
        // fraction — the people actually on hold — so a well-supplied
        // council barely feels it (their lights are on, they're not
        // calling). Negative only; adequate call handling = no hit.
        if (callCsat < 0) {
          const offFrac = agg.tot > 0 ? agg.off / agg.tot : 0;
          target = Math.max(0, target + callCsat * offFrac);
        }
      }
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
        // an on-time connection cheers the whole developer market
        if (a.connectByMin === undefined || state.simTimeMin <= a.connectByMin) {
          bumpAllMoods(state, 5);
        }
      } else if (a.connectByMin !== undefined && state.simTimeMin > a.connectByMin) {
        if (!a.overdueNotified) {
          a.overdueNotified = true;
          pushEvent(state, 'bad', `${a.name} is overdue — paying liquidated damages`, a.x, a.y);
        }
      }
    }
  }

  return {
    satisfactionAvg: satDen > 0 ? satNum / satDen : 0,
    smartChargingYrK,
  };
}

/** Demand "pressure" 0..1 driving how fast towns build out and densify.
 *  A saturating function of the customers the network has EVER served at
 *  once (everServed) — so a small starter grid sees gentle infill and a
 *  mature, demand-heavy network sees real intensification, but the rate is
 *  always bounded. Deterministic: everServed is persisted, so the pressure
 *  rebuilds exactly from a save. HALF is the served base at which pressure
 *  reaches 0.5 (~a mid-size town fully lit). */
const GROWTH_PRESSURE_HALF = 60_000;
export function growthPressure(everServed: number): number {
  const e = Math.max(0, everServed);
  return e / (e + GROWTH_PRESSURE_HALF);
}

/** The densification ladder: a served, built-up tile of zone `from`
 *  intensifies into `to` as demand rises (semis → terraces → towers).
 *  Posh villas, new-build estates, industry and glasshouses are NOT on the
 *  ladder — they keep their character (and estates are already maxed). The
 *  rural fringe takes a first step to suburb when it is served. */
const DENSIFY_LADDER: Partial<Record<number, number>> = {
  [ZONE.rural]: ZONE.suburb,
  [ZONE.suburb]: ZONE.urban,
  [ZONE.urban]: ZONE.urbanCore,
};

const DENSIFY_LABEL: Partial<Record<number, string>> = {
  [ZONE.suburb]: 'cottages give way to semis as the area fills out',
  [ZONE.urban]: 'semis make way for terraces and shops — the district densifies',
  [ZONE.urbanCore]: 'low terraces rise into tower blocks as demand climbs',
};

/** Monthly town growth, in two motions, both tied to served demand:
 *  (1) SPRAWL — open or rural tiles next to served streets fill in with new
 *      semis (the original infill), at a rate that lifts as the network
 *      matures; (2) DENSIFICATION — existing SERVED built-up tiles intensify
 *      up the ladder (suburb → urban → urbanCore) as demand rises, so the
 *      satellite towns grow UP, not just out, across a playthrough.
 *  Every mutation lands on the worker's map copy, is recorded append-only in
 *  state.growth (a GrowthRecord carries the new zone + customers, replayed on
 *  load by applyGrowth — additive, so no SAVE_VERSION bump) and is mirrored
 *  to the main thread via the snapshot. Deterministic on the seeded rng. */
function growTown(
  state: GameState,
  ctx: SimContext,
  derived: Derived,
  rng: Rng,
  coverage: Uint8Array,
  everServed: number,
): void {
  const { map } = ctx;
  // farms keep their fields: capacity-scaled plant claims its tiles by
  // derivation (footprintTiles), so infill must not build between the
  // panel rows / turbines (the claim would self-heal, but why force it)
  const claimed = new Set<number>();
  for (const a of state.assets.values()) {
    for (const i of footprintTiles(map, a)) claimed.add(i);
  }

  const pressure = growthPressure(everServed); // 0..1, rises with served demand
  let grown = 0;

  // (1) SPRAWL — greenfield infill on open/rural land beside served tiles.
  const sprawl = new Set<number>();
  for (const tile of derived.service.subOfTile.keys()) {
    const x = tile % map.width;
    const y = Math.floor(tile / map.width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const i = ny * map.width + nx;
      const z = map.zone[i];
      if (z !== ZONE.none && z !== ZONE.rural) continue;
      if (map.terrain[i] !== TERRAIN.land) continue;
      if ((map.road[i] ?? 0) >= RC.arterial) continue;
      if ((map.landmark?.[i] ?? 0) !== 0) continue;
      if (claimed.has(i)) continue;
      sprawl.add(i);
    }
  }
  if (sprawl.size > 0) {
    const pool = [...sprawl].sort((a, b) => a - b);
    // 1..3 early, lifting toward ~1..5 a month as the network matures
    const sprawlEvents = Math.min(pool.length, 1 + rng.int(3 + Math.round(pressure * 2)));
    for (let k = 0; k < sprawlEvents; k++) {
      const i = pool.splice(rng.int(pool.length), 1)[0];
      if (i === undefined) break;
      const customers = CUSTOMERS_PER_TILE[ZONE.suburb];
      map.zone[i] = ZONE.suburb;
      map.customers[i] = customers;
      state.growth.push({ i, zone: ZONE.suburb, customers });
      grown++;
      pushEvent(
        state,
        'info',
        `new homes: ${customers} semis go up beside the wires`,
        i % map.width,
        Math.floor(i / map.width),
      );
    }
  }

  // (2) DENSIFICATION — served, built-up tiles climb the ladder as demand
  //     rises. Only tiles actually ON supply intensify (you don't get tower
  //     blocks on a dark field); the rate scales with pressure, so early
  //     play sees little and a mature, demand-heavy network sees real
  //     vertical growth. A tile already mutated this session is still a fair
  //     candidate to climb the next rung (growth records are append-only and
  //     applyGrowth keeps only the latest zone per tile on replay).
  const densify: number[] = [];
  for (const [tile, subId] of derived.service.subOfTile) {
    const cov = coverage[tile] ?? COV.empty;
    if (cov !== COV.on && cov !== COV.brownout) continue; // served only
    if (subId === undefined) continue;
    const z = map.zone[tile] ?? ZONE.none;
    if (DENSIFY_LADDER[z] === undefined) continue; // not on the ladder
    if ((map.landmark?.[tile] ?? 0) !== 0) continue; // protect landmark fabric
    if (claimed.has(tile)) continue; // don't intensify a farm/asset footprint
    densify.push(tile);
  }
  if (densify.length > 0) {
    densify.sort((a, b) => a - b); // deterministic candidate order
    // ~0 early, lifting to a few rungs a month as demand bites; never a
    // wholesale rezone (gentle, bounded — towns mature, they don't teleport).
    const densEvents = Math.min(densify.length, Math.round(pressure * 4 + rng.next() * pressure));
    for (let k = 0; k < densEvents; k++) {
      const idx = rng.int(densify.length);
      const i = densify.splice(idx, 1)[0];
      if (i === undefined) break;
      const from = map.zone[i] ?? ZONE.none;
      const to = DENSIFY_LADDER[from];
      if (to === undefined) continue;
      const customers = CUSTOMERS_PER_TILE[to as Zone];
      map.zone[i] = to;
      map.customers[i] = customers;
      state.growth.push({ i, zone: to, customers });
      grown++;
      pushEvent(
        state,
        'info',
        DENSIFY_LABEL[to] ?? 'the district densifies as demand rises',
        i % map.width,
        Math.floor(i / map.width),
      );
    }
  }

  if (grown > 0) {
    ctx.demand = buildDemandField(map);
    state.sitesVersion++; // service areas re-derive over the new fabric
  }
}

/** Running KPI actuals for the current regulatory period. */
export function currentPeriodActuals(state: GameState): PeriodActuals {
  const p = state.period;
  const w = Math.max(p.weightMin, 1);
  const avgCust = Math.max(p.custIntegral / w, 1);
  const years = Math.max(p.weightMin / (PERIOD_YEARS * 525_600), 1e-6) * PERIOD_YEARS;
  return {
    bill: p.billIntegral / w,
    ci: ((state.reliability.ciCustomers - p.ciStart) / (avgCust * years)) * 100,
    cml: (state.reliability.cmlCustomerMin - p.cmlStart) / (avgCust * years),
    carbon: p.carbonIntegral / w,
    curtailedFirm: (state.curtailedFirmMWh - p.curtailedFirmStart) / years,
    satisfaction: p.satIntegral / w,
  };
}

/** Current weather/renewable factors for the HUD, plus the multi-day
 *  regime (current + pre-rolled next) for the forecast strip. */
export function weatherView(
  state: GameState,
  weatherProfile: WeatherProfile = LONDON_PROFILE.weather,
): {
  sun: number;
  wind: number;
  cloud: number;
  regime: string;
  nextRegime: string;
  regimeEndsMin: number;
} {
  return {
    sun: sunFactor(state.simTimeMin, state.weather, weatherProfile),
    wind: windFactor(state.weather, false),
    cloud: state.weather.cloud,
    // fallbacks cover pre-season saves before their first stepWeather
    regime: state.weather.regime ?? 'mild',
    nextRegime: state.weather.nextRegime ?? 'mild',
    regimeEndsMin: state.weather.regimeEndsMin ?? state.simTimeMin,
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

// --- bill drill-down (#52) -------------------------------------------------

/** Detail entries whose every component decays below this fall out of
 *  the maps (compact state, not a ledger). Small enough that an EMA
 *  still ramping up from zero is never culled — only entries whose
 *  source has been quiet for many taus. £k/yr / MWh/yr scale. */
const DETAIL_EPS = 1e-6;

/** Fold one tick's per-unit dispatch detail into the state's itemised
 *  EMA maps — the SAME alpha as the headline lines (energyCostYrK et
 *  al.), so each list's sum tracks its bill line exactly (± pruning). */
function foldBillDetail(
  detail: BillDetailState,
  dispatch: DispatchResult,
  lossOfAsset: Map<number, number>,
  priceMWh: number,
  alpha: number,
): void {
  // constraints: per curtailed firm unit, annualized
  const cTarget = new Map<number, { mwhYr: number; kYr: number }>();
  for (const [id, mw, k] of dispatch.constraintDetail) {
    const t = cTarget.get(id) ?? { mwhYr: 0, kYr: 0 };
    t.mwhYr += mw * 8760;
    t.kYr += k * 8760;
    cTarget.set(id, t);
  }
  for (const id of new Set([...detail.constraints.keys(), ...cTarget.keys()])) {
    const cur = detail.constraints.get(id) ?? { mwhYr: 0, kYr: 0 };
    const t = cTarget.get(id) ?? { mwhYr: 0, kYr: 0 };
    const mwhYr = cur.mwhYr + (t.mwhYr - cur.mwhYr) * alpha;
    const kYr = cur.kYr + (t.kYr - cur.kYr) * alpha;
    if (Math.max(mwhYr, kYr) < DETAIL_EPS) detail.constraints.delete(id);
    else detail.constraints.set(id, { mwhYr, kYr });
  }

  // PPA top-ups: per delivering unit with a strike
  const pTarget = new Map<number, { mwhYr: number; topupKYr: number }>();
  for (const [id, mw, k] of dispatch.ppaDetail) {
    const t = pTarget.get(id) ?? { mwhYr: 0, topupKYr: 0 };
    t.mwhYr += mw * 8760;
    t.topupKYr += k * 8760;
    pTarget.set(id, t);
  }
  for (const id of new Set([...detail.ppa.keys(), ...pTarget.keys()])) {
    const cur = detail.ppa.get(id) ?? { mwhYr: 0, topupKYr: 0 };
    const t = pTarget.get(id) ?? { mwhYr: 0, topupKYr: 0 };
    const mwhYr = cur.mwhYr + (t.mwhYr - cur.mwhYr) * alpha;
    const topupKYr = cur.topupKYr + (t.topupKYr - cur.topupKYr) * alpha;
    if (Math.max(mwhYr, topupKYr) < DETAIL_EPS) detail.ppa.delete(id);
    else detail.ppa.set(id, { mwhYr, topupKYr });
  }

  // losses: per owning asset, priced at the running marginal price
  const lTarget = new Map<number, number>();
  for (const [id, mw] of lossOfAsset) lTarget.set(id, (mw * priceMWh * 8760) / 1000);
  for (const id of new Set([...detail.losses.keys(), ...lTarget.keys()])) {
    const cur = detail.losses.get(id) ?? 0;
    const kYr = cur + ((lTarget.get(id) ?? 0) - cur) * alpha;
    if (kYr < DETAIL_EPS) detail.losses.delete(id);
    else detail.losses.set(id, kYr);
  }
}

/** Top contributors shown when a bill line is tapped. */
const DETAIL_TOP_ROWS = 12;

/** Itemise one bill line: stored EMA maps for the flow-derived lines
 *  (constraints / ppa / losses), the live asset register for capex /
 *  opex (same inclusion rule as computeBill). Sorted by £, top 12. */
export function billDetailRows(state: GameState, line: BillDetailLine): BillDetailRow[] {
  const place = (
    a: PlacedAsset | undefined,
  ): { x?: number | undefined; y?: number | undefined } => {
    if (!a) return {};
    if (a.kind !== 'line') return { x: a.x, y: a.y };
    const ea = state.assets.get(a.a);
    const eb = state.assets.get(a.b);
    if (!ea || ea.kind === 'line' || !eb || eb.kind === 'line') return {};
    return { x: Math.round((ea.x + eb.x) / 2), y: Math.round((ea.y + eb.y) / 2) };
  };
  const label = (a: PlacedAsset | undefined): string => {
    if (!a) return 'demolished asset';
    if (a.kind === 'gen') {
      const dev = a.developer !== undefined ? developerOf(a.developer)?.name : undefined;
      return dev ? `${GENS[a.gen].name} — ${dev}` : GENS[a.gen].name;
    }
    if (a.kind === 'sub') return SUBS[a.sub].name.split(' (')[0] ?? 'substation';
    if (a.kind === 'depot') return 'Field depot';
    return `${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'} · ${a.lengthTiles} km`;
  };

  const rows: BillDetailRow[] = [];
  if (line === 'constraints') {
    for (const [id, v] of state.billDetail.constraints) {
      const a = state.assets.get(id);
      rows.push({ assetId: id, label: label(a), mwhYr: v.mwhYr, kYr: v.kYr, ...place(a) });
    }
  } else if (line === 'ppa') {
    for (const [id, v] of state.billDetail.ppa) {
      const a = state.assets.get(id);
      rows.push({ assetId: id, label: label(a), mwhYr: v.mwhYr, kYr: v.topupKYr, ...place(a) });
    }
  } else if (line === 'losses') {
    for (const [id, kYr] of state.billDetail.losses) {
      const a = state.assets.get(id);
      rows.push({ assetId: id, label: label(a), kYr, ...place(a) });
    }
  } else {
    // capex / opex: derived live, mirroring computeBill — generation is
    // private spend (interconnector excepted: the player's own asset),
    // and the iDNO's iron never bills
    for (const a of state.assets.values()) {
      if (a.kind === 'gen' && a.gen !== 'interconnector') continue;
      if (a.kind === 'sub' && a.idno) continue;
      const capex = assetCapexK(a);
      const kYr = line === 'capex' ? capex * ANNUITY_FACTOR : capex * assetOpexFrac(a);
      if (kYr <= 0) continue;
      rows.push({ assetId: a.id, label: label(a), kYr, ...place(a) });
    }
  }
  rows.sort((a, b) => b.kYr - a.kYr);
  return rows.slice(0, DETAIL_TOP_ROWS);
}

function buildBranchViews(
  state: GameState,
  pf: PowerFlowResult,
  lossOfBranch: Map<number, number>,
): BranchView[] {
  const lineMul = state.tech.dlr ? DLR_RATING_MUL : 1;
  const views: BranchView[] = [];
  for (const a of state.assets.values()) {
    if (a.kind === 'line') {
      const id = lineBranchId(a.id);
      views.push({
        assetId: a.id,
        kind: 'line',
        flowMW: pf.flowMW.get(id) ?? 0,
        ratingMW: LINES[a.level].ratingMW * lineMul * (a.uprated ? LINE_UPRATE_MUL : 1),
        lossMW: lossOfBranch.get(id),
        outMin: state.outages.get(id),
        cause: state.outageCause.get(id),
      });
    } else if (a.kind === 'sub' && SUBS[a.sub].levels.length >= 2) {
      const levels = SUBS[a.sub].levels;
      for (let k = 0; k + 1 < levels.length; k++) {
        const id = txBranchId(a.id, k);
        views.push({
          assetId: a.id,
          kind: 'tx',
          flowMW: pf.flowMW.get(id) ?? 0,
          ratingMW: TX_PAIR[`${levels[k]}/${levels[k + 1]}`]?.ratingMW ?? SUBS[a.sub].txRatingMW,
          lossMW: lossOfBranch.get(id),
          outMin: state.outages.get(id),
          cause: state.outageCause.get(id),
        });
      }
    }
  }
  return views;
}
