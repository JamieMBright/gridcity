// Decides which atlas sprites represent each map tile. Shared by the Pixi
// renderer and the Node preview tool so both always agree. Tiles split into
// two passes: a flat GROUND sprite (always present) and an optional
// STRUCTURE sprite with a transparent floor — the renderer draws its vector
// road ribbons between the two.

import { FLAG_RUNWAY, FLAG_SHOPS, riverCenterY } from '../data/londonMap';
import { LANDMARK, RC, TERRAIN, ZONE, type CityMap, type Landmark } from '../sim/map/types';

/** Landmarks drawn as ONE multi-tile sprite covering their whole map
 *  reservation. The sprite is SW-anchored (see Iso swAnchor): emitting it
 *  on the block's (min x, max y) tile makes the standard 1x1 placement
 *  formula — used identically by MapRenderer and the preview tool — pin
 *  the full footprint, with no per-renderer special-casing. */
const BLOCK_LANDMARKS: ReadonlySet<Landmark> = new Set<Landmark>([
  LANDMARK.parliament,
  LANDMARK.dome,
  LANDMARK.towerBridge,
  LANDMARK.powerstation,
  LANDMARK.allypally,
  LANDMARK.excel,
  LANDMARK.heathrow,
  // Westfield Stratford City: a 2×2 retail/quarter precinct (velodrome +
  // the Orbit stay compact 1×1 icons emitted per-tile).
  LANDMARK.westfield,
  // Owner playtest (2026-06-13): the hero venues are ENORMOUS in reality and
  // read as dots at 1×1 — sized up to dominant multi-tile footprints, so they
  // become SW-anchored block sprites too. Olympic Stadium 3×3, the O2 3×3,
  // Wembley 2×2.
  LANDMARK.stadium,
  LANDMARK.o2dome,
  LANDMARK.wembley,
]);

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
  [LANDMARK.airport]: 'lm_airport',
  [LANDMARK.wembley]: 'lm_wembley',
  [LANDMARK.o2dome]: 'lm_o2dome',
  [LANDMARK.palacemast]: 'lm_palacemast',
  [LANDMARK.allypally]: 'lm_allypally',
  [LANDMARK.excel]: 'lm_excel',
  [LANDMARK.kewhouse]: 'lm_kewhouse',
  [LANDMARK.bttower]: 'lm_bttower',
  [LANDMARK.gherkin]: 'lm_gherkin',
  [LANDMARK.heathrow]: 'lm_heathrow',
  [LANDMARK.velodrome]: 'lm_velodrome',
  [LANDMARK.orbit]: 'lm_orbit',
  [LANDMARK.westfield]: 'lm_westfield',
  [LANDMARK.eiffel]: 'lm_eiffel',
  [LANDMARK.arc]: 'lm_arc',
  [LANDMARK.sacreCoeur]: 'lm_sacrecoeur',
  [LANDMARK.notreDame]: 'lm_notredame',
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

/** Farmland is enclosed in 4x4 parcels; this hash keeps each parcel one
 *  coherent crop (and decides hedgerows + orchards along its bounds). */
function parcelOf(x: number, y: number): number {
  return Math.abs(((x >> 2) * 73856093) ^ ((y >> 2) * 19349663));
}

/** The flat ground sprite under everything — ALWAYS returns a sprite. */
export function groundSpriteFor(map: CityMap, x: number, y: number): string {
  const i = y * map.width + x;
  const terrain = map.terrain[i];
  const zone = map.zone[i];
  const v = map.variant[i] ?? 0;

  if (terrain === TERRAIN.water) return `water_${landMask(map, x, y)}`;
  if (((map.flags?.[i] ?? 0) & FLAG_RUNWAY) !== 0) return 'ground_runway';
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
      if (zone === ZONE.none || zone === ZONE.rural) {
        // estuary flats: marsh where the land runs low beside the wide river
        if (x > 180 && Math.abs(y - riverCenterY(x)) < 9) {
          return `ground_marsh_${v % 2}`;
        }
        // enclosed countryside: each ORGANIC field (the variant carries the
        // map's variable-size enclosure hash, not a rigid 4×4 grid) takes
        // ONE coherent crop, so the belt reads as hedged English fields of
        // honestly varied size rather than an American chequerboard. The
        // mix is grass-led (green-belt, not arable monoculture): mostly
        // pasture/meadow, a minority barley/rape/plough.
        const kind = v % 13;
        if (kind === 0 || kind === 1) return `ground_field_${v % 2}`; // barley
        if (kind === 2) return 'ground_rape';
        if (kind === 3) return 'ground_plough';
        if (kind === 4 || kind === 5) return 'ground_park'; // mown pasture
        // 6..12: rough meadow grass (the green-belt majority)
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
    if (name && BLOCK_LANDMARKS.has(lm)) {
      // one sprite per reservation: only the (min x, max y) tile emits
      // it; the rest stay clear beneath the sprite. The diagonal probes
      // keep the anchor unique when the reservation staircases along the
      // river bank (parliament) rather than filling a rectangle.
      const same = (xx: number, yy: number): boolean =>
        xx >= 0 && xx < map.width && yy >= 0 && yy < map.height &&
        (map.landmark?.[yy * map.width + xx] ?? LANDMARK.none) === lm;
      const anchor =
        !same(x - 1, y) && !same(x, y + 1) && !same(x - 1, y + 1) && !same(x - 1, y + 2);
      return anchor ? name : undefined;
    }
    if (name) return lm === LANDMARK.zoo ? `${name}_${x % 2}` : name;
  }

  // the great wheel overhangs its cell: keep the two tiles that paint
  // after it (east + south) clear so nothing stands across the rim —
  // that's the Jubilee-Gardens apron around the real thing
  const lmAt = (xx: number, yy: number): number =>
    xx >= 0 && xx < map.width && yy >= 0 && yy < map.height
      ? (map.landmark?.[yy * map.width + xx] ?? LANDMARK.none)
      : LANDMARK.none;
  if (
    lmAt(x - 1, y) === LANDMARK.eye ||
    lmAt(x, y - 1) === LANDMARK.eye ||
    lmAt(x, y + 1) === LANDMARK.eye ||
    lmAt(x - 1, y + 1) === LANDMARK.eye
  ) {
    return undefined;
  }
  // ...and the bridge approaches stay open along both banks so nothing
  // stands inside the sweep of the suspension chains
  if (lmAt(x - 1, y) === LANDMARK.towerBridge || lmAt(x + 1, y) === LANDMARK.towerBridge) {
    return undefined;
  }
  // pockets enclosed by the parliament precinct stay open forecourt —
  // nothing builds in the crook of the palace's river steps
  if (
    (lmAt(x - 1, y) === LANDMARK.parliament ? 1 : 0) +
      (lmAt(x + 1, y) === LANDMARK.parliament ? 1 : 0) +
      (lmAt(x, y - 1) === LANDMARK.parliament ? 1 : 0) +
      (lmAt(x, y + 1) === LANDMARK.parliament ? 1 : 0) >=
    2
  ) {
    return undefined;
  }

  const rc = map.road[i] ?? 0;
  if (rc === RC.street || rc >= RC.arterial) return undefined;

  if (terrain === TERRAIN.water) return undefined;
  if (terrain === TERRAIN.hill) return `hill_${v % 2}`;
  if (terrain === TERRAIN.trees) return `trees_${v % 3}`;

  const estate = estateOf(x, y);
  const shops = ((map.flags?.[i] ?? 0) & FLAG_SHOPS) !== 0;
  // Paris wears one uniform street wall: the cream Haussmann mid-rise with
  // its grey mansard, across the whole dense core (La Défense keeps towers).
  const haussmann = map.style === 'paris';

  switch (zone) {
    case ZONE.cbd:
      // the Gherkin now carries its own LANDMARK id (handled above), so the
      // CBD fabric is plain skyscrapers — no fixed-tile special-case
      return `sky_${v % 3}`;
    case ZONE.urbanCore:
      if (haussmann) return `haussmann_${v % 3}`;
      if (v % 7 < 2) return `tower_${v % 2}`;
      if (v % 7 === 2) return `office_${v % 2}`;
      return `terrace_${v % 4}`;
    case ZONE.urban: {
      if (haussmann) return `haussmann_${(estate + v) % 3}`;
      if (shops) return `vicshop_${v % 2}`;
      const pick = estate % 5;
      // sector character: the East End leans terraces + council blocks,
      // the West End leans Georgian stucco
      if (x > 128) {
        if (pick >= 3) return `councilflat_${v % 2}`;
        if (pick === 2) return `terrace_${v % 4}`;
        return `victerrace_${(estate + (v % 2)) % 4}`;
      }
      if (x < 110 && pick <= 1) return `georgian_${(estate + (v % 2)) % 2}`;
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
    case ZONE.posh: {
      if (v % 11 === 0) return `trees_${v % 3}`;
      // Mayfair/Belgravia are stucco terraces; the outer quarters, villas
      const central = Math.hypot(x - 118, y - 80) < 14;
      return central ? `georgian_${v % 2}` : `villa_${v % 2}`;
    }
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
    default: {
      if (zone !== ZONE.none) return undefined; // nuclearSite reserve, wind sites
      // open countryside furniture: hedgerows trace the parcel bounds,
      // the odd parcel is an orchard, the odd corner grows a copse
      if (x > 180 && Math.abs(y - riverCenterY(x)) < 9) return undefined; // marsh stays open
      const p = parcelOf(x, y);
      if (p % 11 === 6 && (x & 3) !== 0 && (y & 3) !== 0) return 'orchard_0';
      const xe = (x & 3) === 3;
      const ye = (y & 3) === 3;
      if (xe && p % 3 === 0) return 'hedgerow_1';
      if (ye && p % 3 === 1) return 'hedgerow_0';
      if (!xe && !ye && p % 29 === 7 && v % 3 === 0) return `trees_${v % 3}`;
      return undefined;
    }
  }
}
