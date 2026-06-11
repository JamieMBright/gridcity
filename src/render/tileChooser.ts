// Decides which atlas sprite represents each map tile. Shared by the Pixi
// renderer and the Node preview tool so both always agree.

import { TERRAIN, ZONE, type CityMap } from '../sim/map/types';

function at(map: CityMap, x: number, y: number, arr: Uint8Array): number {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return 255;
  return arr[y * map.width + x] ?? 255;
}

/** NESW bitmask of neighbours that are LAND (for shorelines). */
function landMask(map: CityMap, x: number, y: number): number {
  const isLand = (xx: number, yy: number): boolean => {
    const t = at(map, xx, yy, map.terrain);
    return t !== TERRAIN.water && t !== 255; // map edge counts as open water
  };
  return (
    (isLand(x, y - 1) ? 1 : 0) |
    (isLand(x + 1, y) ? 2 : 0) |
    (isLand(x, y + 1) ? 4 : 0) |
    (isLand(x - 1, y) ? 8 : 0)
  );
}

/** NESW bitmask of neighbours that also carry road. */
function roadMask(map: CityMap, x: number, y: number): number {
  const r = (xx: number, yy: number): boolean => at(map, xx, yy, map.road) === 1;
  return (
    (r(x, y - 1) ? 1 : 0) | (r(x + 1, y) ? 2 : 0) | (r(x, y + 1) ? 4 : 0) | (r(x - 1, y) ? 8 : 0)
  );
}

export function spriteNameFor(map: CityMap, x: number, y: number): string {
  const i = y * map.width + x;
  const terrain = map.terrain[i];
  const zone = map.zone[i];
  const v = map.variant[i] ?? 0;

  if (terrain === TERRAIN.water) return `water_${landMask(map, x, y)}`;
  if (map.road[i] === 1) return `road_${roadMask(map, x, y)}`;
  if (terrain === TERRAIN.hill) return `hill_${v % 2}`;
  if (terrain === TERRAIN.trees) return `trees_${v % 3}`;

  switch (zone) {
    case ZONE.urbanCore:
      if (v % 7 < 2) return `tower_${v % 2}`;
      if (v % 7 === 2) return `office_${v % 2}`;
      return `terrace_${v % 4}`;
    case ZONE.urban:
      return `terrace_${v % 4}`;
    case ZONE.suburb:
      if (v % 19 === 0) return `trees_${v % 3}`; // leafy streets
      return `semi_${v % 4}`;
    case ZONE.posh:
      if (v % 11 === 0) return `trees_${v % 3}`;
      return `villa_${v % 2}`;
    case ZONE.rural:
      return `cottage_${v % 2}`;
    case ZONE.industrial:
      return v % 3 === 0 ? 'factory_0' : 'warehouse_0';
    case ZONE.greenhouse:
      return `greenhouse_${v % 2}`;
    case ZONE.park:
      return `park_${v % 2}`;
    case ZONE.solarSite:
      return 'solarsite_0';
    case ZONE.nuclearSite:
      return `field_${v % 2}`; // reserved coastal land until someone builds
    default: {
      // Open land. In the rural east it's a patchwork of golden field
      // parcels (coherent 4x4 blocks, not per-tile noise); in town it's
      // plain green.
      if (x > 112) {
        const parcel = Math.abs(((x >> 2) * 73856093) ^ ((y >> 2) * 19349663));
        if (parcel % 5 < 3) return `field_${parcel % 2 === 0 ? 0 : 1}`;
      }
      return `grass_${v % 4}`;
    }
  }
}
