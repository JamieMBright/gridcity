// Build-cost rules: terrain/zone multipliers along a route, posh
// underground-only enforcement, and line pricing. Pure functions shared by
// command validation (worker) and ghost previews (UI).

import { LINES, PYLON_SPACING, type LineBuild } from './catalog';
import type { VoltageLevel } from './grid/types';
import { RC, TERRAIN, ZONE, type CityMap } from './map/types';

export interface RouteCheck {
  ok: boolean;
  error?: string;
  lengthTiles: number;
  capexK: number;
}

function tileMultiplier(map: CityMap, x: number, y: number, build: LineBuild): number | string {
  const i = y * map.width + x;
  const t = map.terrain[i];
  const z = map.zone[i];
  let m = 1;
  if (t === TERRAIN.water) m *= build === 'underground' ? 10 : 8;
  if (t === TERRAIN.hill) m *= 2;
  if (t === TERRAIN.trees) m *= 1.5;
  if (z === ZONE.park) m *= 3;
  if (z === ZONE.urbanCore) m *= 2;
  if (z === ZONE.posh) {
    if (build === 'overhead') return 'conservation area: underground cables only';
    m *= 5;
  }
  return m;
}

/** Tiles along a straight route (Bresenham). */
export function routeTiles(ax: number, ay: number, bx: number, by: number): Array<[number, number]> {
  const tiles: Array<[number, number]> = [];
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx - dy;
  let x = ax;
  let y = ay;
  for (;;) {
    tiles.push([x, y]);
    if (x === bx && y === by) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return tiles;
}

/** True if a tile can carry an overhead-line support. Pylons stand on open
 *  ground: not water, not heavy transport (A-roads/motorway/rail), not a
 *  building plot, not already taken. Quiet streets are fine — poles line
 *  them in real life. */
export function pylonSiteOk(map: CityMap, x: number, y: number, taken: Set<number>): boolean {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  const i = y * map.width + x;
  return (
    map.terrain[i] !== TERRAIN.water &&
    (map.road[i] ?? 0) < RC.arterial &&
    (map.customers[i] ?? 0) === 0 &&
    (map.landmark === undefined || map.landmark[i] === 0) &&
    !taken.has(i)
  );
}

/** Place supports along an overhead route at the level's spacing, snapping
 *  each one to the nearest available square along the route (slide up to
 *  two tiles onward; an unplaceable support just leaves a longer span).
 *  Endpoints are excluded — the line lands on the asset's own gantry. */
export function placePylons(
  map: CityMap,
  level: VoltageLevel,
  route: Array<[number, number]>,
  taken: Set<number>,
): number[] {
  const spacing = PYLON_SPACING[level];
  const pylons: number[] = [];
  const placed = new Set(taken);
  for (let k = spacing; k < route.length - 1; k += spacing) {
    for (let slide = 0; slide <= 2 && k + slide < route.length - 1; slide++) {
      const [x, y] = route[k + slide] ?? [-1, -1];
      if (pylonSiteOk(map, x, y, placed)) {
        const i = y * map.width + x;
        pylons.push(i);
        placed.add(i);
        break;
      }
    }
  }
  return pylons;
}

export function priceLine(
  map: CityMap,
  level: VoltageLevel,
  build: LineBuild,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): RouteCheck {
  const tiles = routeTiles(ax, ay, bx, by);
  const spec = LINES[level];
  let capexK = 0;
  for (const [x, y] of tiles) {
    const m = tileMultiplier(map, x, y, build);
    if (typeof m === 'string') return { ok: false, error: m, lengthTiles: tiles.length, capexK: 0 };
    capexK += spec.capexKPerTile[build] * m;
  }
  return { ok: true, lengthTiles: tiles.length, capexK: Math.round(capexK) };
}
