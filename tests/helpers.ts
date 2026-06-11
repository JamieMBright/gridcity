// Shared fixtures: a small synthetic map and a connected starter network so
// gameplay-level tests don't depend on the London map's geography.

import { applyCommand, type Command } from '../src/sim/commands';
import { buildDemandField } from '../src/sim/map/demand';
import {
  CUSTOMERS_PER_TILE,
  NO_COUNCIL,
  TERRAIN,
  ZONE,
  type CityMap,
  type Zone,
} from '../src/sim/map/types';
import { newGame, type GameState, type SimContext } from '../src/sim/state';

export function makeTestMap(width: number, height: number): CityMap {
  const n = width * height;
  return {
    width,
    height,
    terrain: new Uint8Array(n).fill(TERRAIN.land),
    zone: new Uint8Array(n),
    council: new Uint8Array(n).fill(NO_COUNCIL),
    road: new Uint8Array(n),
    customers: new Uint16Array(n),
    vegetation: new Uint8Array(n),
    variant: new Uint8Array(n),
    councils: [],
  };
}

export function setZone(map: CityMap, x: number, y: number, zone: Zone): void {
  const i = y * map.width + x;
  map.zone[i] = zone;
  map.customers[i] = CUSTOMERS_PER_TILE[zone];
}

export function makeContext(map: CityMap): SimContext {
  return { map, demand: buildDemandField(map) };
}

export function mustApply(state: GameState, map: CityMap, cmd: Command): number {
  const r = applyCommand(state, map, cmd);
  if (!r.ok) throw new Error(`command failed: ${r.error}`);
  return r.assetId ?? -1;
}

/** Skip planning/construction lead times so fixtures power up at once. */
export function commissionAll(state: GameState): void {
  for (const a of state.assets.values()) {
    if (a.kind === 'gen') a.liveAtMin = 0;
  }
}

/** A 30x30 map with a 3x3 suburb block at (20,20) and a powered network:
 *  gas plant (5,5) → 132 kV line → grid sub (15,15) → 33 kV line →
 *  dist sub (20,20 area). Returns the asset ids. */
export function poweredFixture(): {
  state: GameState;
  ctx: SimContext;
  ids: { gas: number; grid: number; dist: number; line132: number; line33: number };
} {
  const map = makeTestMap(30, 30);
  for (let y = 19; y <= 21; y++) {
    for (let x = 19; x <= 21; x++) setZone(map, x, y, ZONE.suburb);
  }
  const ctx = makeContext(map);
  const state = newGame();
  const gas = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
  });
  const grid = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'sub', sub: 'grid', x: 15, y: 15 },
  });
  const dist = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'sub', sub: 'dist', x: 18, y: 18 },
  });
  const line132 = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 15, by: 15 },
  });
  const line33 = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 15, ay: 15, bx: 18, by: 18 },
  });
  commissionAll(state);
  return { state, ctx, ids: { gas, grid, dist, line132, line33 } };
}
