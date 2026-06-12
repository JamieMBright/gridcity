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
import { placePylons, priceLine, routeTiles } from './cost';
import { BIG_BUILDING_ZONES, TERRAIN, ZONE, type CityMap } from './map/types';
import { pushEvent, type GameState } from './state';
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
  /** Support tiles along an overhead route (line specs only). */
  pylons?: number[];
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

/** Every tile carrying an overhead-line support (pylon or pole). */
export function pylonTilesOf(assets: Iterable<PlacedAsset>): Set<number> {
  const taken = new Set<number>();
  for (const a of assets) {
    if (a.kind !== 'line') continue;
    for (const i of a.pylons ?? []) taken.add(i);
  }
  return taken;
}

/** Static siting rule for a tile build (terrain/zone/landmark only — no
 *  occupancy). Shared by checkBuild and the green/red suitability overlay.
 *  Returns undefined when the ground itself is suitable. */
export function siteErrorAt(
  map: CityMap,
  spec: { kind: 'gen'; gen: GenType } | { kind: 'sub'; sub: SubType } | { kind: 'depot' },
  x: number,
  y: number,
): string | undefined {
  const i = tileAt(map, x, y);
  if (i === undefined) return 'out of bounds';
  const t = map.terrain[i];
  const z = map.zone[i];
  if (map.landmark !== undefined && (map.landmark[i] ?? 0) !== 0)
    return 'that is a protected landmark';
  if (map.road[i] === 1) return 'cannot build on the road';

  if (spec.kind === 'gen') {
    const siting = GENS[spec.gen].siting;
    if (siting === 'solarSite') {
      if (z !== ZONE.solarSite) return 'solar farms need a surveyed solar site';
      return undefined;
    }
    if (siting === 'nuclearSite') {
      if (z !== ZONE.nuclearSite) return 'nuclear needs the licensed coastal site';
      return undefined;
    }
    if (siting === 'windSite') {
      if (z !== ZONE.windSite) return 'offshore wind belongs in the estuary wind zone';
      return undefined;
    }
    if (siting === 'water') {
      if (t !== TERRAIN.water) return 'tidal turbines sit in the water';
      return undefined;
    }
    // land plant
    if (t === TERRAIN.water) return 'cannot build on water';
    if (z === ZONE.posh) return 'the conservation area will never allow that';
    if (z === ZONE.park) return 'not in a royal park';
    return undefined;
  }

  if (spec.kind === 'sub' && spec.sub === 'vault') {
    if (!BIG_BUILDING_ZONES.has(z ?? ZONE.none))
      return 'underground substations go beneath large buildings, not houses';
    return undefined;
  }
  if (t === TERRAIN.water) return 'cannot build on water';
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
    const siteError = siteErrorAt(map, spec, spec.x, spec.y);
    if (siteError) return fail(siteError);
    const assetList = [...assets];
    if (assetAtTile(assetList, spec.x, spec.y)) return fail('tile already occupied');
    if (pylonTilesOf(assetList).has(spec.y * map.width + spec.x))
      return fail('an overhead-line support stands here');
    const capexK =
      spec.kind === 'gen'
        ? GENS[spec.gen].capexK
        : spec.kind === 'sub'
          ? SUBS[spec.sub].capexK
          : DEPOT.capexK;
    return { ok: true, capexK, lengthTiles: 0 };
  }

  // line: both endpoints must be assets carrying this voltage level
  const assetList = [...assets];
  const endA = assetAtTile(assetList, spec.ax, spec.ay);
  const endB = assetAtTile(assetList, spec.bx, spec.by);
  if (!endA || !endB) return fail('lines must run between two assets');
  if (endA.id === endB.id) return fail('a line needs two distinct endpoints');
  if (!assetLevels(endA).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the first endpoint`);
  if (!assetLevels(endB).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the second endpoint`);
  const priced = priceLine(map, spec.level, spec.build, spec.ax, spec.ay, spec.bx, spec.by);
  if (!priced.ok) return fail(priced.error ?? 'route blocked');
  let pylons: number[] = [];
  if (spec.build === 'overhead') {
    const taken = pylonTilesOf(assetList);
    for (const a of assetList) {
      if (a.kind !== 'line') taken.add(a.y * map.width + a.x);
    }
    pylons = placePylons(
      map,
      spec.level,
      routeTiles(spec.ax, spec.ay, spec.bx, spec.by),
      taken,
    );
  }
  return {
    ok: true,
    capexK: priced.capexK,
    lengthTiles: priced.lengthTiles,
    endA: endA.id,
    endB: endB.id,
    pylons,
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
        const g = GENS[spec.gen];
        const leadMin = (g.planningDays + g.buildDays) * 1440;
        state.assets.set(id, {
          id,
          kind: 'gen',
          gen: spec.gen,
          x: spec.x,
          y: spec.y,
          liveAtMin: state.simTimeMin + leadMin,
        });
        pushEvent(
          state,
          'info',
          `${g.name}: planning application in — commissioning in ${g.planningDays + g.buildDays} days`,
          spec.x,
          spec.y,
        );
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
          pylons: check.pylons ?? [],
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
