// Player commands: validation + application. checkBuild is pure and shared
// by the worker (authoritative) and the UI (ghost previews), so the cost a
// player is quoted is exactly the cost that lands on the bill.

import { assetLevels, type PlacedAsset } from './assets';
import {
  DEPOT,
  GENS,
  SUBS,
  type GenType,
  type LineBuild,
  type SubType,
  type VegPolicy,
} from './catalog';
import { CONNECT_DAYS, GEN_OF_KIND } from './events/applications';
import { MAX_VANS } from './fleet/fleet';
import type { VoltageLevel } from './grid/types';
import { priceLine } from './cost';
import { TERRAIN, ZONE, type CityMap } from './map/types';
import type { GameState } from './state';
import type { SimSpeed } from './protocol';

export type Command =
  | { type: 'setSpeed'; speed: SimSpeed }
  | { type: 'build'; spec: BuildSpec }
  | { type: 'demolish'; assetId: number }
  | { type: 'setFleet'; vans: number }
  | { type: 'setVegPolicy'; policy: VegPolicy }
  | { type: 'respondApplication'; appId: number; response: 'firm' | 'flex' | 'decline' }
  | { type: 'fundPitch'; pitchId: number }
  | { type: 'setLevy'; pct: number };

export type BuildSpec =
  | { kind: 'gen'; gen: GenType; x: number; y: number }
  | { kind: 'sub'; sub: SubType; x: number; y: number }
  | { kind: 'depot'; x: number; y: number }
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

  if (spec.kind === 'gen' || spec.kind === 'sub' || spec.kind === 'depot') {
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
    const capexK =
      spec.kind === 'gen'
        ? GENS[spec.gen].capexK
        : spec.kind === 'sub'
          ? SUBS[spec.sub].capexK
          : DEPOT.capexK;
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
      } else if (spec.kind === 'depot') {
        state.assets.set(id, { id, kind: 'depot', x: spec.x, y: spec.y });
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
      if (asset.kind === 'gen' && asset.customer) {
        return { ok: false, error: "that's customer-owned plant — you only own the wires" };
      }
      state.assets.delete(cmd.assetId);
      if (asset.kind !== 'line' && asset.kind !== 'depot') {
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

    case 'setFleet':
      if (!Number.isInteger(cmd.vans) || cmd.vans < 0 || cmd.vans > MAX_VANS) {
        return { ok: false, error: `fleet must be 0–${MAX_VANS} vans` };
      }
      state.fleetSize = cmd.vans;
      return { ok: true };

    case 'setVegPolicy':
      state.vegPolicy = cmd.policy;
      return { ok: true };

    case 'respondApplication': {
      const app = state.applications.find((a) => a.id === cmd.appId);
      if (!app) return { ok: false, error: 'no such application' };
      if (app.status !== 'open') return { ok: false, error: 'application already decided' };
      if (cmd.response === 'decline') {
        app.status = 'declined';
        return { ok: true };
      }
      const gen = GEN_OF_KIND[app.kind];
      if (gen) {
        if (assetAtTile(state.assets.values(), app.x, app.y)) {
          return { ok: false, error: 'the site has been built over' };
        }
        const id = state.nextAssetId++;
        state.assets.set(id, {
          id,
          kind: 'gen',
          gen,
          x: app.x,
          y: app.y,
          customer: true,
          flex: cmd.response === 'flex',
        });
        app.assetId = id;
        state.assetsVersion++;
      } else {
        state.loadSites.push({
          id: app.id,
          x: app.x,
          y: app.y,
          mw: app.mw,
          customers: app.customers,
          name: app.name,
        });
        state.sitesVersion++;
      }
      app.status = cmd.response;
      app.connectByMin = state.simTimeMin + CONNECT_DAYS * 1440;
      return { ok: true };
    }

    case 'fundPitch': {
      const pitch = state.pitches.find((p) => p.id === cmd.pitchId);
      if (!pitch) return { ok: false, error: 'no such pitch' };
      if (pitch.status !== 'open') return { ok: false, error: 'pitch already decided' };
      if (state.innovationFundK < pitch.costK) {
        return { ok: false, error: 'innovation fund too small — raise the levy and wait' };
      }
      state.innovationFundK -= pitch.costK;
      pitch.status = 'funded';
      pitch.completesAtMin = state.simTimeMin + pitch.durationDays * 1440;
      return { ok: true };
    }

    case 'setLevy': {
      if (cmd.pct < 0 || cmd.pct > 3) return { ok: false, error: 'levy must be 0–3%' };
      state.levyPct = Math.round(cmd.pct * 2) / 2;
      return { ok: true };
    }
  }
}
