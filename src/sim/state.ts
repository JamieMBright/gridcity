// Authoritative game state (lives in the worker) and its serialization.

import type { PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type SubType, type VegPolicy } from './catalog';
import type { CityMap } from './map/types';
import { buildDemandField, type DemandField } from './map/demand';
import { newWeather, type WeatherState } from './events/weather';
import type { Application } from './events/applications';
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
import { getLondonMap } from '../data/londonMap';
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
  nextAssetId: number;
  assets: Map<number, PlacedAsset>;
  /** bumped on any asset change → network re-derivation. */
  assetsVersion: number;
  rngState: number;
  /** rolling annualized energy cost, £k/yr (exponentially smoothed). */
  energyCostYrK: number;
  weather: WeatherState;
  /** battery asset id → state of charge, MWh. */
  soc: Map<number, number>;
  /** branch id → accumulated overload heat, loading·minutes. */
  heat: Map<number, number>;
  /** branch id → repair game-minutes remaining (tripped/out of service). */
  outages: Map<number, number>;
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
  /** lifetime curtailed energy by connection type, MWh. */
  curtailedFirmMWh: number;
  curtailedFlexMWh: number;
  nextAppId: number;
  period: PeriodState;
  lastReport?: ReportCard | undefined;
}

export interface SimContext {
  map: CityMap;
  demand: DemandField;
}

export function newGame(): GameState {
  return {
    tick: 0,
    simTimeMin: 0,
    speed: 1,
    nextAssetId: 1,
    assets: new Map(),
    assetsVersion: 0,
    rngState: 0xc0ffee,
    energyCostYrK: 0,
    weather: newWeather(),
    soc: new Map(),
    heat: new Map(),
    outages: new Map(),
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
    curtailedFirmMWh: 0,
    curtailedFlexMWh: 0,
    nextAppId: 1,
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

export function newContext(): SimContext {
  const map = getLondonMap();
  return { map, demand: buildDemandField(map) };
}

// --- save / load -----------------------------------------------------------

export const SAVE_VERSION = 6;

/** Guard for untrusted save payloads; lives beside SAVE_VERSION so the two
 *  can never drift apart again (a stale guard silently discarded saves). */
export function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const v = (d as { v?: unknown }).v;
  // v6 rebuilt the map (bigger region, new geography); older saves
  // reference tiles that no longer exist, so they can't be migrated.
  return typeof v === 'number' && v >= 6 && v <= SAVE_VERSION;
}

export interface SaveData {
  v: 6;
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  nextAssetId: number;
  assets: PlacedAsset[];
  rngState: number;
  energyCostYrK: number;
  weather?: WeatherState;
  soc?: Array<[number, number]>;
  heat?: Array<[number, number]>;
  outages?: Array<[number, number]>;
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
  curtailedFirmMWh?: number;
  curtailedFlexMWh?: number;
  nextAppId?: number;
  period?: PeriodState;
  lastReport?: ReportCard;
}

export function serialize(s: GameState): SaveData {
  return {
    v: SAVE_VERSION,
    tick: s.tick,
    simTimeMin: s.simTimeMin,
    speed: s.speed,
    nextAssetId: s.nextAssetId,
    assets: [...s.assets.values()],
    rngState: s.rngState,
    energyCostYrK: s.energyCostYrK,
    weather: { ...s.weather },
    soc: [...s.soc.entries()],
    heat: [...s.heat.entries()],
    outages: [...s.outages.entries()],
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
    curtailedFirmMWh: s.curtailedFirmMWh,
    curtailedFlexMWh: s.curtailedFlexMWh,
    nextAppId: s.nextAppId,
    period: { ...s.period, targets: { ...s.period.targets } },
    ...(s.lastReport ? { lastReport: { ...s.lastReport, scores: { ...s.lastReport.scores } } } : {}),
  };
}

export function deserialize(d: SaveData): GameState {
  const assets = new Map<number, PlacedAsset>();
  for (const a of d.assets) assets.set(a.id, a);
  return {
    tick: d.tick,
    simTimeMin: d.simTimeMin,
    speed: d.speed,
    nextAssetId: d.nextAssetId,
    assets,
    assetsVersion: 1,
    rngState: d.rngState,
    energyCostYrK: d.energyCostYrK,
    weather: d.weather ? { ...d.weather } : newWeather(),
    soc: new Map(d.soc ?? []),
    heat: new Map(d.heat ?? []),
    outages: new Map(d.outages ?? []),
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
    curtailedFirmMWh: d.curtailedFirmMWh ?? 0,
    curtailedFlexMWh: d.curtailedFlexMWh ?? 0,
    nextAppId: d.nextAppId ?? 1,
    period: d.period
      ? { ...d.period, targets: { ...d.period.targets } }
      : newPeriod(1, d.simTimeMin, initialTargets()),
    lastReport: d.lastReport ? { ...d.lastReport, scores: { ...d.lastReport.scores } } : undefined,
  };
}

export function isGenType(s: string): s is GenType {
  return s in GENS;
}
export function isSubType(s: string): s is SubType {
  return s in SUBS;
}
