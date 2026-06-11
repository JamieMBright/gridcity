// Build-cost rules: terrain/zone multipliers along a route, posh
// underground-only enforcement, and line pricing. Pure functions shared by
// command validation (worker) and ghost previews (UI).

import { LINES, type LineBuild } from './catalog';
import type { VoltageLevel } from './grid/types';
import { TERRAIN, ZONE, type CityMap } from './map/types';

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
