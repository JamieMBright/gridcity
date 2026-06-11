// Player commands: validation + application. checkBuild is pure and shared
// by the worker (authoritative) and the UI (ghost previews), so the cost a
// player is quoted is exactly the cost that lands on the bill.

import { assetLevels, type PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type LineBuild, type SubType } from './catalog';
import type { VoltageLevel } from './grid/types';
import { priceLine } from './cost';
import { TERRAIN, ZONE, type CityMap } from './map/types';
import type { GameState } from './state';
import type { SimSpeed } from './protocol';

export type Command =
  | { type: 'setSpeed'; speed: SimSpeed }
  | { type: 'build'; spec: BuildSpec }
  | { type: 'demolish'; assetId: number };

export type BuildSpec =
  | { kind: 'gen'; gen: GenType; x: number; y: number }
  | { kind: 'sub'; sub: SubType; x: number; y: number }
  | {
      kind: 'line';
      level: VoltageLevel;
      build: LineBuild;
      ax: number;
      ay: number;
      bx: number;
      by: number;
    };

export interface CommandResult {
  ok: boolean;
  error?: string | undefined;
  assetId?: number | undefined;
}

export interface BuildCheck {
  ok: boolean;
  error?: string;
  capexK: number;
  lengthTiles: number;
  /** Line endpoints resolved to asset ids (line specs only). */
  endA?: number;
  endB?: number;
}

function tileAt(map: CityMap, x: number, y: number): number | undefined {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return undefined;
  return y * map.width + x;
}

export function assetAtTile(
  assets: Iterable<PlacedAsset>,
  x: number,
  y: number,
): PlacedAsset | undefined {
  for (const a of assets) {
    if (a.kind !== 'line' && a.x === x && a.y === y) return a;
  }
  return undefined;
}

/** Validate and price a build without mutating anything. */
export function checkBuild(
  map: CityMap,
  assets: Iterable<PlacedAsset>,
  spec: BuildSpec,
): BuildCheck {
  const fail = (error: string): BuildCheck => ({ ok: false, error, capexK: 0, lengthTiles: 0 });

  if (spec.kind === 'gen' || spec.kind === 'sub') {
    const i = tileAt(map, spec.x, spec.y);
    if (i === undefined) return fail('out of bounds');
    const t = map.terrain[i];
    const z = map.zone[i];
    if (spec.kind === 'gen') {
      const siting = GENS[spec.gen].siting;
      if (siting === 'solarSite' && z !== ZONE.solarSite)
        return fail('solar farms need a surveyed solar site');
      if (siting === 'nuclearSite' && z !== ZONE.nuclearSite)
        return fail('nuclear needs the licensed coastal site');
      if (siting === 'windSite' && z !== ZONE.windSite)
        return fail('offshore wind belongs in the estuary wind zone');
      if (siting === 'land') {
        if (t === TERRAIN.water) return fail('cannot build on water');
        if (z === ZONE.posh) return fail('the conservation area will never allow that');
      }
    } else {
      if (t === TERRAIN.water) return fail('cannot build on water');
    }
    if (assetAtTile(assets, spec.x, spec.y)) return fail('tile already occupied');
    const capexK = spec.kind === 'gen' ? GENS[spec.gen].capexK : SUBS[spec.sub].capexK;
    return { ok: true, capexK, lengthTiles: 0 };
  }

  // line: both endpoints must be assets carrying this voltage level
  const endA = assetAtTile(assets, spec.ax, spec.ay);
  const endB = assetAtTile(assets, spec.bx, spec.by);
  if (!endA || !endB) return fail('lines must run between two assets');
  if (endA.id === endB.id) return fail('a line needs two distinct endpoints');
  if (!assetLevels(endA).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the first endpoint`);
  if (!assetLevels(endB).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the second endpoint`);
  const priced = priceLine(map, spec.level, spec.build, spec.ax, spec.ay, spec.bx, spec.by);
  if (!priced.ok) return fail(priced.error ?? 'route blocked');
  return {
    ok: true,
    capexK: priced.capexK,
    lengthTiles: priced.lengthTiles,
    endA: endA.id,
    endB: endB.id,
  };
}

export function applyCommand(state: GameState, map: CityMap, cmd: Command): CommandResult {
  switch (cmd.type) {
    case 'setSpeed':
      state.speed = cmd.speed;
      return { ok: true };

    case 'build': {
      const spec = cmd.spec;
      const check = checkBuild(map, state.assets.values(), spec);
      if (!check.ok) return { ok: false, error: check.error };
      const id = state.nextAssetId++;
      if (spec.kind === 'gen') {
        state.assets.set(id, { id, kind: 'gen', gen: spec.gen, x: spec.x, y: spec.y });
      } else if (spec.kind === 'sub') {
        state.assets.set(id, { id, kind: 'sub', sub: spec.sub, x: spec.x, y: spec.y });
      } else {
        state.assets.set(id, {
          id,
          kind: 'line',
          level: spec.level,
          build: spec.build,
          a: check.endA ?? -1,
          b: check.endB ?? -1,
          lengthTiles: check.lengthTiles,
          capexK: check.capexK,
        });
      }
      state.assetsVersion++;
      return { ok: true, assetId: id };
    }

    case 'demolish': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset) return { ok: false, error: 'no such asset' };
      state.assets.delete(cmd.assetId);
      if (asset.kind !== 'line') {
        // cascade: remove lines that referenced this endpoint
        for (const a of [...state.assets.values()]) {
          if (a.kind === 'line' && (a.a === asset.id || a.b === asset.id)) {
            state.assets.delete(a.id);
          }
        }
      }
      state.assetsVersion++;
      return { ok: true };
    }
  }
}
