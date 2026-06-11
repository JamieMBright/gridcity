// Authoritative game state (lives in the worker) and its serialization.

import type { PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type SubType } from './catalog';
import type { CityMap } from './map/types';
import { buildDemandField, type DemandField } from './map/demand';
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
  };
}

export function newContext(): SimContext {
  const map = getLondonMap();
  return { map, demand: buildDemandField(map) };
}

// --- save / load -----------------------------------------------------------

export interface SaveData {
  v: 1;
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  nextAssetId: number;
  assets: PlacedAsset[];
  rngState: number;
  energyCostYrK: number;
}

export function serialize(s: GameState): SaveData {
  return {
    v: 1,
    tick: s.tick,
    simTimeMin: s.simTimeMin,
    speed: s.speed,
    nextAssetId: s.nextAssetId,
    assets: [...s.assets.values()],
    rngState: s.rngState,
    energyCostYrK: s.energyCostYrK,
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
  };
}

export function isGenType(s: string): s is GenType {
  return s in GENS;
}
export function isSubType(s: string): s is SubType {
  return s in SUBS;
}
