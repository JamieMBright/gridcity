// Authoritative game state (lives in the worker) and its serialization.

import type { PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type SubType } from './catalog';
import type { CityMap } from './map/types';
import { buildDemandField, type DemandField } from './map/demand';
import { newWeather, type WeatherState } from './events/weather';
import { getLondonMap } from '../data/londonMap';
import type { SimSpeed } from './protocol';

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
  /** lifetime curtailed renewable energy, MWh. */
  curtailedMWh: number;
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
    curtailedMWh: 0,
  };
}

export function newContext(): SimContext {
  const map = getLondonMap();
  return { map, demand: buildDemandField(map) };
}

// --- save / load -----------------------------------------------------------

export interface SaveData {
  v: 1 | 2;
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
  curtailedMWh?: number;
}

export function serialize(s: GameState): SaveData {
  return {
    v: 2,
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
    curtailedMWh: s.curtailedMWh,
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
    curtailedMWh: d.curtailedMWh ?? 0,
  };
}

export function isGenType(s: string): s is GenType {
  return s in GENS;
}
export function isSubType(s: string): s is SubType {
  return s in SUBS;
}
