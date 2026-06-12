// Decides which atlas sprites represent each map tile. Shared by the Pixi
// renderer and the Node preview tool so both always agree. Tiles split into
// two passes: a flat GROUND sprite (always present) and an optional
// STRUCTURE sprite with a transparent floor — the renderer draws its vector
// road ribbons between the two.

import { FLAG_SHOPS } from '../data/londonMap';
import { LANDMARK, RC, TERRAIN, ZONE, type CityMap, type Landmark } from '../sim/map/types';

const LANDMARK_SPRITE: Partial<Record<Landmark, string>> = {
  [LANDMARK.parliament]: 'lm_parliament',
  [LANDMARK.eye]: 'lm_eye',
  [LANDMARK.dome]: 'lm_dome',
  [LANDMARK.spire]: 'lm_spire',
  [LANDMARK.fortress]: 'lm_fortress',
  [LANDMARK.towerBridge]: 'lm_bridge',
  [LANDMARK.stadium]: 'lm_stadium',
  [LANDMARK.arena]: 'lm_arena',
  [LANDMARK.mall]: 'lm_mall',
  [LANDMARK.zoo]: 'lm_zoo',
  [LANDMARK.powerstation]: 'lm_power',
  [LANDMARK.station]: 'lm_station',
  [LANDMARK.school]: 'lm_school',
  [LANDMARK.townhall]: 'lm_townhall',
  [LANDMARK.watertower]: 'lm_watertower',
  [LANDMARK.sewage]: 'lm_sewage',
  [LANDMARK.carpark]: 'lm_carpark',
  [LANDMARK.church]: 'lm_church',
  [LANDMARK.datacentre]: 'lm_datacentre',
};

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

/** Estates were built all-at-once: an 8x8-block hash that clusters housing
 *  styles so streets read as coherent developments, not per-tile noise. */
function estateOf(x: number, y: number): number {
  return (((x >> 3) * 73856093) ^ ((y >> 3) * 19349663)) >>> 0;
}

/** The flat ground sprite under everything — ALWAYS returns a sprite. */
export function groundSpriteFor(map: CityMap, x: number, y: number): string {
  const i = y * map.width + x;
  const terrain = map.terrain[i];
  const zone = map.zone[i];
  const v = map.variant[i] ?? 0;

  if (terrain === TERRAIN.water) return `water_${landMask(map, x, y)}`;
  if (terrain === TERRAIN.hill) return 'ground_moor';

  switch (zone) {
    case ZONE.urbanCore:
    case ZONE.cbd:
    case ZONE.urban:
    case ZONE.industrial:
    case ZONE.newEstate:
      return `ground_pave_${v % 2}`;
    case ZONE.park:
      return 'ground_park';
    case ZONE.greenhouse:
    case ZONE.solarSite:
    case ZONE.nuclearSite:
      return `ground_field_${v % 2}`;
    default: {
      // Open land (and the garden zones). In the rural east it's a
      // patchwork of golden field parcels (coherent 4x4 blocks, not
      // per-tile noise); in town it's plain green.
      if (zone === ZONE.none && x > 140) {
        const parcel = Math.abs(((x >> 2) * 73856093) ^ ((y >> 2) * 19349663));
        if (parcel % 5 < 3) return `ground_field_${parcel % 2 === 0 ? 0 : 1}`;
      }
      return `ground_grass_${v % 4}`;
    }
  }
}

/** What stands on the tile (transparent floor), or undefined for open
 *  ground. Streets/arterials/rails through the tile centre clear it —
 *  the carriageway ribbon runs where the structure would stand. */
export function structureSpriteFor(map: CityMap, x: number, y: number): string | undefined {
  const i = y * map.width + x;
  const terrain = map.terrain[i];
  const zone = map.zone[i];
  const v = map.variant[i] ?? 0;

  // landmarks are protected fabric — they render even where routes pass
  // (the tower bridge carries the road between its towers)
  const lm = (map.landmark?.[i] ?? LANDMARK.none) as Landmark;
  if (lm !== LANDMARK.none) {
    const name = LANDMARK_SPRITE[lm];
    if (name) return lm === LANDMARK.zoo ? `${name}_${x % 2}` : name;
  }

  const rc = map.road[i] ?? 0;
  if (rc === RC.street || rc >= RC.arterial) return undefined;

  if (terrain === TERRAIN.water) return undefined;
  if (terrain === TERRAIN.hill) return `hill_${v % 2}`;
  if (terrain === TERRAIN.trees) return `trees_${v % 3}`;

  const estate = estateOf(x, y);
  const shops = ((map.flags?.[i] ?? 0) & FLAG_SHOPS) !== 0;

  switch (zone) {
    case ZONE.cbd:
      return `sky_${v % 3}`;
    case ZONE.urbanCore:
      if (v % 7 < 2) return `tower_${v % 2}`;
      if (v % 7 === 2) return `office_${v % 2}`;
      return `terrace_${v % 4}`;
    case ZONE.urban: {
      if (shops) return `vicshop_${v % 2}`;
      const pick = estate % 5;
      if (pick === 2) return `terrace_${v % 4}`;
      if (pick === 4) return `councilflat_${v % 2}`;
      // whole streets share the estate's style, with a subtle per-tile
      // alternation between two adjacent variants
      return `victerrace_${(estate + (v % 2)) % 4}`;
    }
    case ZONE.suburb: {
      if (v % 19 === 0) return `trees_${v % 3}`; // leafy streets
      if (shops) return `vicshop_${v % 2}`;
      const pick = estate % 5;
      if (pick === 2) return `victerrace_${estate % 4}`;
      if (pick === 3) return `newbuild_${v % 3}`;
      return `semi_${(estate + (v % 2)) % 4}`;
    }
    case ZONE.newEstate:
      return `newbuild_${1 + (v % 2)}`; // bias to the solar-roof variants
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
    default:
      return undefined; // open land, nuclearSite reserve, wind sites
  }
}
