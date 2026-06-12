// Authoritative game state (lives in the worker) and its serialization.

import type { PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type SubType, type VegPolicy } from './catalog';
import { TERRAIN, ZONE, type CityMap } from './map/types';
import { buildDemandField, type DemandField } from './map/demand';
import { newWeather, type WeatherState } from './events/weather';
import type { Application } from './events/applications';
import { newDevMood, nextRoundOpensMin, type Tender } from './events/developers';
import { newTech, type Pitch, type TechState } from './events/innovation';
import type { CouncilState } from './customers/adoption';
import type { RepairJob, Van } from './fleet/fleet';
import type { LoadSite } from './service';
import type { ReliabilityTotals } from './regulation/kpis';
import {
  initialTargets,
  newPeriod,
  type PeriodState,
  type ReportCard,
} from './regulation/riio';
import { EXISTING_GENERATION, NEW_ESTATES } from '../data/londonMap';
import { getScenario } from '../data/cityRegistry';
import type { SimSpeed } from './protocol';

export interface GameEvent {
  seq: number;
  /** Game time of the event, minutes. */
  tMin: number;
  sev: 'info' | 'warn' | 'bad';
  msg: string;
  x?: number | undefined;
  y?: number | undefined;
}

export interface GameState {
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  /** Active scenario ('london', or a tutorial-mission id). Decides which
   *  map newContext builds and which mission rules the worker runs. */
  scenarioId: string;
  /** Tutorial missions: the win predicate has fired (sticky). */
  missionComplete?: boolean | undefined;
  /** Tutorial missions: bitmask of scripted beats already fired, so
   *  storms/faults trigger exactly once across saves and skips. */
  missionBeats?: number | undefined;
  nextAssetId: number;
  assets: Map<number, PlacedAsset>;
  /** bumped on any asset change → network re-derivation. */
  assetsVersion: number;
  rngState: number;
  /** rolling annualized energy cost, £k/yr (exponentially smoothed). */
  energyCostYrK: number;
  /** rolling PPA top-ups above wholesale, £k/yr (exponentially smoothed). */
  genCostYrK: number;
  weather: WeatherState;
  /** battery asset id → state of charge, MWh. */
  soc: Map<number, number>;
  /** branch id → accumulated overload heat, loading·minutes. */
  heat: Map<number, number>;
  /** branch id → repair game-minutes remaining (tripped/out of service). */
  outages: Map<number, number>;
  /** Transient (not saved): last tick's energization per service sub,
   *  for "why did my site go dark" transition events. */
  subLive: Map<number, boolean>;
  /** branch id -> why it's out (storm/tree/overload), for the inspector. */
  outageCause: Map<number, string>;
  /** rolling carbon intensity, g/kWh (exponentially smoothed). */
  carbonEMA: number;
  /** Paid-for crewed vans. */
  fleetSize: number;
  /** Vegetation management programme (index into VEG_POLICY). */
  vegPolicy: VegPolicy;
  /** line asset id → overgrowth 0..1. */
  lineVeg: Map<number, number>;
  vans: Van[];
  /** branch id → open repair job. */
  jobs: Map<number, RepairJob>;
  reliability: ReliabilityTotals;
  /** Tiles currently dark (for CI transition detection). */
  offTiles: Set<number>;
  events: GameEvent[];
  eventSeq: number;
  /** True while the current storm has already been announced. */
  stormAnnounced: boolean;
  /** council id → adoption + satisfaction. */
  councils: Map<number, CouncilState>;
  applications: Application[];
  loadSites: LoadSite[];
  /** bumped when loadSites change → service re-assignment. */
  sitesVersion: number;
  pitches: Pitch[];
  tech: TechState;
  innovationFundK: number;
  /** Innovation levy, % of the bill (0–3 in 0.5 steps). */
  levyPct: number;
  /** rolling flexibility-market spend, £k/yr. */
  flexYrK: number;
  /** rolling constraint compensation, £k/yr. */
  constraintYrK: number;
  /** rolling network I²R losses priced at the running marginal price,
   *  £k/yr — a DNO cost, recovered through the bill's losses line. */
  lossYrK: number;
  /** Bill drill-down (#52): per-asset itemised accumulators, EMA-decayed
   *  with the SAME tau as their headline lines so each list reconciles
   *  to its bill line. capex/opex detail is never stored — it's derived
   *  on demand from the asset register (tick.billDetailRows). */
  billDetail: BillDetailState;
  /** lifetime curtailed energy by connection type, MWh. */
  curtailedFirmMWh: number;
  curtailedFlexMWh: number;
  nextAppId: number;
  /** Generation tenders (planning signals) and their developer bids. */
  tenders: Tender[];
  /** CfD allocation rounds (#14): game-minute the next quarterly round
   *  opens… */
  roundOpensMin: number;
  /** …the latest round number (0 = none yet)… */
  roundId: number;
  /** …and the last round whose clearance (loser souring) has settled —
   *  persisted so a save/load mid-round can't sour the losers twice. */
  roundClearedId: number;
  /** developer id → mood 0..100 (starts at 70). */
  devMood: Map<number, number>;
  /** Town growth/infill mutations applied to the map (append-only;
   *  replayed onto a fresh map on load). */
  growth: GrowthRecord[];
  period: PeriodState;
  lastReport?: ReportCard | undefined;
  /** Early-game goal ladder progress: index into scenario/goals GOALS
   *  (undefined = start of the ladder; past the end = done/dismissed). */
  goalIndex?: number | undefined;
  /** Storm prep (reliability/stormprep.ts): surge contractor crews ride
   *  the van roster until this game-minute… */
  surgeUntilMin?: number | undefined;
  /** …and this many of them (tick.ts adds them at the syncVans site). */
  surgeVans?: number | undefined;
  /** Rolling annualized storm-prep spend, £k/yr (one-off prep costs land
   *  here and decay with a 1-game-year tau; rides the bill's
   *  constraint/damages line via computeBill's penaltyYrK input). */
  stormPrepYrK?: number | undefined;
  /** Planned maintenance windows (#16): queued/open outages applied by
   *  tick.ts at their 01:00–05:00 window (reliability/ageing.ts). */
  maintenance?: MaintenanceWindow[] | undefined;
  /** Rolling annualized maintenance/replacement spend, £k/yr —
   *  stormPrepYrK's exact sibling (decays in reliability/ageing.ts and
   *  rides the same penaltyYrK bill input). */
  maintYrK?: number | undefined;
}

/** One scheduled maintenance night (#16): `branchId` goes out as a
 *  planned outage from startMin for durMin, then health is restored. */
export interface MaintenanceWindow {
  branchId: number;
  startMin: number;
  durMin: number;
}

/** Itemised bill accumulators (compact: pruned EMAs, not ledgers). */
export interface BillDetailState {
  /** gen asset id → constraint compensation {MWh/yr curtailed, £k/yr}. */
  constraints: Map<number, { mwhYr: number; kYr: number }>;
  /** gen asset id → PPA delivery {MWh/yr delivered, top-up £k/yr}. */
  ppa: Map<number, { mwhYr: number; topupKYr: number }>;
  /** owning asset id (line, or sub for its transformers) → I²R loss
   *  cost at the running marginal price, £k/yr. */
  losses: Map<number, number>;
}

export function newBillDetail(): BillDetailState {
  return { constraints: new Map(), ppa: new Map(), losses: new Map() };
}

/** One infill mutation: tile `i` became `zone` with `customers`. */
export interface GrowthRecord {
  i: number;
  zone: number;
  customers: number;
}

/** Replay recorded growth onto a (fresh) map copy. */
export function applyGrowth(map: CityMap, growth: GrowthRecord[]): void {
  for (const g of growth) {
    map.zone[g.i] = g.zone;
    map.customers[g.i] = g.customers;
  }
}

export interface SimContext {
  map: CityMap;
  demand: DemandField;
}

export function newGame(scenarioId = 'london'): GameState {
  return {
    tick: 0,
    simTimeMin: 0,
    speed: 1,
    scenarioId,
    nextAssetId: 1,
    assets: new Map(),
    assetsVersion: 0,
    rngState: 0xc0ffee,
    energyCostYrK: 0,
    genCostYrK: 0,
    weather: newWeather(),
    soc: new Map(),
    heat: new Map(),
    outages: new Map(),
    subLive: new Map(),
    outageCause: new Map(),
    carbonEMA: 0,
    fleetSize: 2,
    vegPolicy: 0,
    lineVeg: new Map(),
    vans: [],
    jobs: new Map(),
    reliability: { ciCustomers: 0, cmlCustomerMin: 0 },
    offTiles: new Set(),
    events: [],
    eventSeq: 0,
    stormAnnounced: false,
    councils: new Map(),
    applications: [],
    loadSites: [],
    sitesVersion: 0,
    pitches: [],
    tech: newTech(),
    innovationFundK: 0,
    levyPct: 0.5,
    flexYrK: 0,
    constraintYrK: 0,
    lossYrK: 0,
    billDetail: newBillDetail(),
    curtailedFirmMWh: 0,
    curtailedFlexMWh: 0,
    nextAppId: 1,
    tenders: [],
    roundOpensMin: nextRoundOpensMin(0),
    roundId: 0,
    roundClearedId: 0,
    devMood: newDevMood(),
    growth: [],
    period: newPeriod(1, 0, initialTargets()),
    lastReport: undefined,
  };
}

export function pushEvent(
  s: GameState,
  sev: GameEvent['sev'],
  msg: string,
  x?: number,
  y?: number,
): void {
  s.events.push({ seq: ++s.eventSeq, tMin: s.simTimeMin, sev, msg, x, y });
  if (s.events.length > 40) s.events.splice(0, s.events.length - 40);
}

export function newContext(scenarioId = 'london'): SimContext {
  // a fresh map every time: town growth mutates the context's copy, so
  // a new game (or a load) must never inherit a previous run's infill
  const map = getScenario(scenarioId).build();
  return { map, demand: buildDemandField(map) };
}

// --- scenario seeding --------------------------------------------------------

/** Set up the opening scenario on a fresh game: the iDNO's estate
 *  substations and a few starter connection applications so the inbox
 *  has decisions from minute one. Called by the worker on 'newGame'
 *  only — unit fixtures stay clean. */
export function seedScenario(state: GameState, ctx: SimContext): void {
  const { map } = ctx;

  // (a) new-build estates arrive with the iDNO's transformer already in
  for (const e of NEW_ESTATES) {
    const id = state.nextAssetId++;
    state.assets.set(id, {
      id,
      kind: 'sub',
      sub: 'dist',
      x: e.x,
      y: e.y,
      mva: 10,
      mvaAuto: false,
      idno: true,
    });
  }
  // (a2) the real-world foundations: generation already on the system,
  // developer-owned and operational — it just needs your wires
  let devIx = 0;
  for (const g of EXISTING_GENERATION) {
    const id = state.nextAssetId++;
    state.assets.set(id, {
      id,
      kind: 'gen',
      gen: g.gen,
      x: g.x,
      y: g.y,
      developer: (devIx++ % 6) + 1,
      liveAtMin: 0,
    });
  }
  state.assetsVersion++;

  // (b) starter generation applications through the normal machinery
  const used = new Set<number>();
  const findTile = (ok: (i: number, x: number, y: number) => boolean) => {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x;
        if (used.has(i)) continue;
        if (ok(i, x, y)) {
          used.add(i);
          return { x, y };
        }
      }
    }
    return undefined;
  };
  const starters: Array<{
    kind: Application['kind'];
    name: string;
    mw: number;
    site: { x: number; y: number } | undefined;
  }> = [
    {
      kind: 'solarFarm',
      name: 'Estuary Sun Co-op',
      mw: 50,
      site: findTile((i) => map.zone[i] === ZONE.solarSite),
    },
    {
      kind: 'windOnshore',
      name: 'Marsh Ridge Wind',
      mw: 100,
      site: findTile(
        (i, x) => map.zone[i] === ZONE.none && map.terrain[i] === TERRAIN.land && x > 110,
      ),
    },
    {
      kind: 'battery',
      name: 'GridStore Ltd',
      mw: 100,
      site: findTile(
        (i, x) => map.zone[i] === ZONE.none && map.terrain[i] === TERRAIN.land && x > 120,
      ),
    },
  ];
  for (const s of starters) {
    if (!s.site) continue;
    state.applications.push({
      id: state.nextAppId++,
      kind: s.kind,
      name: s.name,
      x: s.site.x,
      y: s.site.y,
      mw: s.mw,
      customers: 0,
      decideByMin: state.simTimeMin + 30 * 1440,
      status: 'open',
    });
    pushEvent(state, 'warn', `connection application: ${s.name} (${s.mw} MW generation)`, s.site.x, s.site.y);
  }
}

// --- save / load -----------------------------------------------------------

export const SAVE_VERSION = 9;

/** Guard for untrusted save payloads; lives beside SAVE_VERSION so the two
 *  can never drift apart again (a stale guard silently discarded saves). */
export function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const v = (d as { v?: unknown }).v;
  // v9: streets re-laid on the tile-edge lattice + landmark precincts
  // claimed new tiles - v8 saves' assets can sit on what is now road or
  // protected fabric. (v8 moved the whole geography; v7 the id scheme.)
  return typeof v === 'number' && v >= 9 && v <= SAVE_VERSION;
}

export interface SaveData {
  v: 9;
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  /** Scenario the save belongs to (additive; absent hydrates to
   *  'london', so every pre-campaign save keeps its map). */
  scenarioId?: string;
  /** Wall-clock ms when this save was WRITTEN (additive; stamped by the
   *  persistence layer, never the sim — determinism stays intact). Boot
   *  arbitration prefers the most recently saved copy, so a fresh new
   *  game beats an old long-played cloud save. */
  savedAt?: number;
  /** Tutorial-mission progress (additive). */
  missionComplete?: boolean;
  missionBeats?: number;
  nextAssetId: number;
  assets: PlacedAsset[];
  rngState: number;
  energyCostYrK: number;
  genCostYrK?: number;
  weather?: WeatherState;
  soc?: Array<[number, number]>;
  heat?: Array<[number, number]>;
  outages?: Array<[number, number]>;
  outageCause?: Array<[number, string]>;
  carbonEMA?: number;
  fleetSize?: number;
  vegPolicy?: VegPolicy;
  lineVeg?: Array<[number, number]>;
  vans?: Van[];
  jobs?: Array<[number, RepairJob]>;
  reliability?: ReliabilityTotals;
  offTiles?: number[];
  events?: GameEvent[];
  eventSeq?: number;
  councils?: Array<[number, CouncilState]>;
  applications?: Application[];
  loadSites?: LoadSite[];
  pitches?: Pitch[];
  tech?: TechState;
  innovationFundK?: number;
  levyPct?: number;
  flexYrK?: number;
  constraintYrK?: number;
  lossYrK?: number;
  /** Bill drill-down maps, flattened: [assetId, mwhYr, kYr]. */
  billConstraints?: Array<[number, number, number]>;
  /** [assetId, mwhYr, topupKYr]. */
  billPpa?: Array<[number, number, number]>;
  /** [assetId, kYr]. */
  billLosses?: Array<[number, number]>;
  curtailedFirmMWh?: number;
  curtailedFlexMWh?: number;
  nextAppId?: number;
  tenders?: Tender[];
  /** CfD allocation round state (#14, additive). */
  roundOpensMin?: number;
  roundId?: number;
  roundClearedId?: number;
  devMood?: Array<[number, number]>;
  growth?: GrowthRecord[];
  period?: PeriodState;
  lastReport?: ReportCard;
  goalIndex?: number | undefined;
  surgeUntilMin?: number;
  surgeVans?: number;
  stormPrepYrK?: number;
  /** Planned maintenance windows (#16, additive). */
  maintenance?: MaintenanceWindow[];
  /** Rolling maintenance/replacement spend, £k/yr (#15/#16, additive). */
  maintYrK?: number;
}

export function serialize(s: GameState): SaveData {
  // structuredClone at the end makes this a true snapshot: the worker's
  // undo/redo stacks hold these, and shallow copies once let in-place
  // mutations (GIS converts, uprates, MVA resizes, tick updates) leak
  // backwards into the stack — undo "restored" an already-mutated state.
  const data: SaveData = {
    v: SAVE_VERSION,
    tick: s.tick,
    simTimeMin: s.simTimeMin,
    speed: s.speed,
    nextAssetId: s.nextAssetId,
    assets: [...s.assets.values()],
    rngState: s.rngState,
    energyCostYrK: s.energyCostYrK,
    genCostYrK: s.genCostYrK,
    weather: { ...s.weather },
    soc: [...s.soc.entries()],
    heat: [...s.heat.entries()],
    outages: [...s.outages.entries()],
    outageCause: [...s.outageCause.entries()],
    carbonEMA: s.carbonEMA,
    fleetSize: s.fleetSize,
    vegPolicy: s.vegPolicy,
    lineVeg: [...s.lineVeg.entries()],
    vans: s.vans.map((v) => ({ ...v })),
    jobs: [...s.jobs.entries()].map(([k, j]) => [k, { ...j }]),
    reliability: { ...s.reliability },
    offTiles: [...s.offTiles],
    events: s.events.map((e) => ({ ...e })),
    eventSeq: s.eventSeq,
    councils: [...s.councils.entries()].map(([k, c]) => [k, { ...c }]),
    applications: s.applications.map((a) => ({ ...a })),
    loadSites: s.loadSites.map((l) => ({ ...l })),
    pitches: s.pitches.map((p) => ({ ...p })),
    tech: { ...s.tech },
    innovationFundK: s.innovationFundK,
    levyPct: s.levyPct,
    flexYrK: s.flexYrK,
    constraintYrK: s.constraintYrK,
    lossYrK: s.lossYrK,
    billConstraints: [...s.billDetail.constraints.entries()].map(
      ([id, v]): [number, number, number] => [id, v.mwhYr, v.kYr],
    ),
    billPpa: [...s.billDetail.ppa.entries()].map(
      ([id, v]): [number, number, number] => [id, v.mwhYr, v.topupKYr],
    ),
    billLosses: [...s.billDetail.losses.entries()],
    curtailedFirmMWh: s.curtailedFirmMWh,
    curtailedFlexMWh: s.curtailedFlexMWh,
    nextAppId: s.nextAppId,
    tenders: s.tenders.map((t) => ({ ...t, bids: t.bids.map((b) => ({ ...b })) })),
    roundOpensMin: s.roundOpensMin,
    roundId: s.roundId,
    roundClearedId: s.roundClearedId,
    devMood: [...s.devMood.entries()],
    growth: s.growth.map((g) => ({ ...g })),
    period: { ...s.period, targets: { ...s.period.targets } },
    ...(s.lastReport ? { lastReport: { ...s.lastReport, scores: { ...s.lastReport.scores } } } : {}),
    ...(s.goalIndex !== undefined ? { goalIndex: s.goalIndex } : {}),
    ...(s.surgeUntilMin !== undefined ? { surgeUntilMin: s.surgeUntilMin } : {}),
    ...(s.surgeVans !== undefined ? { surgeVans: s.surgeVans } : {}),
    ...(s.stormPrepYrK !== undefined ? { stormPrepYrK: s.stormPrepYrK } : {}),
    ...(s.maintenance && s.maintenance.length > 0
      ? { maintenance: s.maintenance.map((m) => ({ ...m })) }
      : {}),
    ...(s.maintYrK !== undefined ? { maintYrK: s.maintYrK } : {}),
    // scenario tag only when off the default: london saves stay
    // byte-identical to pre-campaign ones
    ...(s.scenarioId !== 'london' ? { scenarioId: s.scenarioId } : {}),
    ...(s.missionComplete !== undefined ? { missionComplete: s.missionComplete } : {}),
    ...(s.missionBeats !== undefined ? { missionBeats: s.missionBeats } : {}),
  };
  return structuredClone(data);
}

export function deserialize(d: SaveData): GameState {
  const assets = new Map<number, PlacedAsset>();
  for (const a of d.assets) assets.set(a.id, a);
  return {
    tick: d.tick,
    simTimeMin: d.simTimeMin,
    speed: d.speed,
    scenarioId: d.scenarioId ?? 'london',
    missionComplete: d.missionComplete,
    missionBeats: d.missionBeats,
    nextAssetId: d.nextAssetId,
    assets,
    assetsVersion: 1,
    rngState: d.rngState,
    energyCostYrK: d.energyCostYrK,
    genCostYrK: d.genCostYrK ?? 0,
    weather: d.weather ? { ...d.weather } : newWeather(),
    soc: new Map(d.soc ?? []),
    heat: new Map(d.heat ?? []),
    outages: new Map(d.outages ?? []),
    subLive: new Map(),
    outageCause: new Map(d.outageCause ?? []),
    carbonEMA: d.carbonEMA ?? 0,
    fleetSize: d.fleetSize ?? 2,
    vegPolicy: d.vegPolicy ?? 0,
    lineVeg: new Map(d.lineVeg ?? []),
    vans: (d.vans ?? []).map((v) => ({ ...v })),
    jobs: new Map((d.jobs ?? []).map(([k, j]) => [k, { ...j }])),
    reliability: d.reliability ? { ...d.reliability } : { ciCustomers: 0, cmlCustomerMin: 0 },
    offTiles: new Set(d.offTiles ?? []),
    events: (d.events ?? []).map((e) => ({ ...e })),
    eventSeq: d.eventSeq ?? 0,
    stormAnnounced: false,
    councils: new Map((d.councils ?? []).map(([k, c]) => [k, { ...c }])),
    applications: (d.applications ?? []).map((a) => ({ ...a })),
    loadSites: (d.loadSites ?? []).map((l) => ({ ...l })),
    sitesVersion: 1,
    pitches: (d.pitches ?? []).map((p) => ({ ...p })),
    tech: d.tech ? { ...d.tech } : newTech(),
    innovationFundK: d.innovationFundK ?? 0,
    levyPct: d.levyPct ?? 0.5,
    flexYrK: d.flexYrK ?? 0,
    constraintYrK: d.constraintYrK ?? 0,
    lossYrK: d.lossYrK ?? 0,
    billDetail: {
      constraints: new Map(
        (d.billConstraints ?? []).map(([id, mwhYr, kYr]) => [id, { mwhYr, kYr }]),
      ),
      ppa: new Map((d.billPpa ?? []).map(([id, mwhYr, topupKYr]) => [id, { mwhYr, topupKYr }])),
      losses: new Map(d.billLosses ?? []),
    },
    curtailedFirmMWh: d.curtailedFirmMWh ?? 0,
    curtailedFlexMWh: d.curtailedFlexMWh ?? 0,
    nextAppId: d.nextAppId ?? 1,
    tenders: (d.tenders ?? []).map((t) => ({ ...t, bids: t.bids.map((b) => ({ ...b })) })),
    // pre-round saves join the quarterly schedule at the next boundary
    roundOpensMin: d.roundOpensMin ?? nextRoundOpensMin(d.simTimeMin),
    roundId: d.roundId ?? 0,
    roundClearedId: d.roundClearedId ?? d.roundId ?? 0,
    devMood: d.devMood ? new Map(d.devMood) : newDevMood(),
    growth: (d.growth ?? []).map((g) => ({ ...g })),
    period: d.period
      ? { ...d.period, complaints: d.period.complaints ?? 0, targets: { ...d.period.targets } }
      : newPeriod(1, d.simTimeMin, initialTargets()),
    lastReport: d.lastReport ? { ...d.lastReport, scores: { ...d.lastReport.scores } } : undefined,
    goalIndex: d.goalIndex,
    surgeUntilMin: d.surgeUntilMin,
    surgeVans: d.surgeVans,
    stormPrepYrK: d.stormPrepYrK,
    maintenance: d.maintenance?.map((m) => ({ ...m })),
    maintYrK: d.maintYrK,
  };
}

export function isGenType(s: string): s is GenType {
  return s in GENS;
}
export function isSubType(s: string): s is SubType {
  return s in SUBS;
}
