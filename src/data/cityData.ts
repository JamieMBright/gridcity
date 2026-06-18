// Serialized city maps produced by the OSM authoring pipeline (tools/osm).
//
// A generated city ships as a CityData record: the small set of rasters that
// can't be derived (terrain, zone, council, road, landmark, flags) as base64
// typed arrays, plus the vector routes, council profiles and named places as
// plain JSON. The runtime reconstructs a full CityMap with buildCityFromData,
// deriving customers / vegetation / sprite-variant from terrain + zone so the
// committed artifact stays lean. This keeps the game fully offline — no OSM
// egress at play time — while the heavy GIS work happens once, at authoring.
//
// Data © OpenStreetMap contributors (ODbL) — see the in-game credits.

import {
  CUSTOMERS_PER_TILE,
  HERO_BASE,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type HeroSlot,
  type MapAirport,
  type MapPlace,
  type MapTown,
  type TransportRoute,
  type Zone,
} from '../sim/map/types';
import { buildHeritageLoads } from '../sim/map/demand';
import { footFor, resolveBespokeKey } from '../render/sprites/heroes/registry';

export interface CityNamedPlace {
  x: number;
  y: number;
  name: string;
  /** true if this place also stamps a landmark sprite. */
  landmark?: boolean;
}

export interface CityData {
  id: string;
  name: string;
  tagline: string;
  width: number;
  height: number;
  /** base64 Uint8Array rasters (row-major, width*height). */
  terrain: string;
  zone: string;
  council: string;
  road: string;
  landmark: string;
  flags: string;
  routes: TransportRoute[];
  councils: CouncilProfile[];
  named: CityNamedPlace[];
  /** Town/village labels (render scenery). Optional: a generated city without
   *  a town layer just labels its named places. */
  towns?: MapTown[];
  /** Airports the render-side air layer flies from. Optional: omitted = empty
   *  skies (and a per-fabric fallback may apply — see buildCityFromData). */
  airports?: MapAirport[];
  /** Per-city building colourway (render hint; default London). */
  fabric?: CityMap['fabric'];
  /** Required ODbL attribution string. */
  attribution: string;
}

/** Per-fabric airport fallback for committed artifacts that predate the
 *  `airports` field (e.g. the first Paris build). Real terminal positions,
 *  approximate on the 256×160 grid; the air layer only needs a tile to fly
 *  arcs from. London ships its airports on the code-drawn map, not here. */
const FABRIC_AIRPORTS: Partial<Record<NonNullable<CityMap['fabric']>, MapAirport[]>> = {
  paris: [
    { name: 'Charles de Gaulle', x: 178, y: 34, hdg: 'EW' },
    { name: 'Orly', x: 116, y: 138, hdg: 'EW' },
  ],
};

// --- universal base64 for typed arrays (works in Node 18+ and the browser) --

const B64_CHUNK = 0x8000;

export function encodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  }
  return btoa(bin);
}

export function decodeBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Overhead-line fault exposure by terrain/zone — leafy edges are riskier. */
export function vegetationFor(terrainCode: number, z: Zone): number {
  if (terrainCode === TERRAIN.trees) return 210;
  if (terrainCode === TERRAIN.water) return 0;
  switch (z) {
    case ZONE.park:
      return 130;
    case ZONE.none:
    case ZONE.rural:
      return 90;
    case ZONE.suburb:
    case ZONE.posh:
      return 45;
    case ZONE.urban:
      return 18;
    case ZONE.urbanCore:
    case ZONE.cbd:
    case ZONE.industrial:
      return 6;
    default:
      return 30;
  }
}

/** Stable per-tile sprite-variant seed so streets don't visibly repeat. */
export function variantFor(i: number): number {
  return (((i * 2654435761) >>> 0) % 251) & 0xff;
}

/**
 * Populate the derived layers (customers, vegetation, variant) of a map from
 * its terrain + zone. The single source of truth shared by the authoring
 * builder and the runtime loader, so a re-derived map is bit-identical to the
 * one that was serialized.
 */
export function fillDerivedLayers(map: CityMap): void {
  const n = map.width * map.height;
  for (let i = 0; i < n; i++) {
    const z = (map.zone[i] ?? ZONE.none) as Zone;
    map.customers[i] = CUSTOMERS_PER_TILE[z] ?? 0;
    map.vegetation[i] = vegetationFor(map.terrain[i] ?? TERRAIN.land, z);
    map.variant[i] = variantFor(i);
  }
}

/** Reconstruct a full CityMap from a serialized CityData record. */
export function buildCityFromData(d: CityData): CityMap {
  const n = d.width * d.height;
  const named: MapPlace[] = d.named.map((p) => ({
    x: p.x,
    y: p.y,
    name: p.name,
    ...(p.landmark ? { landmark: true } : {}),
  }));
  const airports = d.airports ?? (d.fabric ? FABRIC_AIRPORTS[d.fabric] : undefined) ?? [];
  const map: CityMap = {
    width: d.width,
    height: d.height,
    terrain: decodeBytes(d.terrain),
    zone: decodeBytes(d.zone),
    council: decodeBytes(d.council),
    road: decodeBytes(d.road),
    landmark: decodeBytes(d.landmark),
    flags: decodeBytes(d.flags),
    routes: d.routes,
    customers: new Uint16Array(n),
    vegetation: new Uint8Array(n),
    variant: new Uint8Array(n),
    councils: d.councils,
    ...(d.fabric ? { fabric: d.fabric } : {}),
    // render scenery off the map (the renderer reads these instead of a
    // London-specific import)
    named,
    ...(d.towns ? { towns: d.towns } : {}),
    airports,
  };
  fillDerivedLayers(map);
  buildHeroTable(map);
  // Heritage point-loads (Giza Sound-&-Light…) sit on the bespoke heroes just
  // stamped above, so derive them AFTER buildHeroTable. Deterministic + never
  // serialized — like the hero table itself.
  buildHeritageLoads(map);
  return map;
}

/**
 * Build the RUNTIME bespoke-hero table from the city's `named` places (no
 * artifact regen — the placement is re-resolved from the committed names at
 * load). For every landmark place whose name matches a bespoke hero in this
 * city's registry, allocate a heroTable slot and STAMP `HERO_BASE + index`
 * across the hero's footprint in the landmark raster (SW-anchored: the named
 * place's (x, y) is the south-west corner, the block extends E +x and N −y —
 * exactly the convention tools/osm/buildCityFromOsm.placeHeroes uses), so the
 * tile chooser draws the bespoke sprite instead of the archetype it had.
 *
 * Additive by construction: a place with NO bespoke match keeps its existing
 * archetype landmark value untouched, and a city with an empty registry
 * (London for now) builds an empty table and never writes a `>= HERO_BASE`
 * value — so it renders byte-identically.
 */
export function buildHeroTable(map: CityMap): void {
  const fabric = map.fabric ?? 'london';
  const named = map.named;
  const landmark = map.landmark;
  if (!named || !landmark) return;
  const table: HeroSlot[] = [];
  for (const place of named) {
    // PLACEMENT-GAP FIX (W5): consider EVERY named place, not just `landmark:true`
    // ones. The OSM classifier flags only ~20-25 names per city as landmarks, so
    // famous buildings the hero waves drew (Empire State, Cairo Tower, Opéra
    // Garnier…) were placed as label-only pins and never rendered. A bespoke hero
    // exists ⇒ it IS a hero, so place it regardless of the flag. The `match`
    // regexes are specific (proper nouns / native script), so a plain label never
    // false-matches. A place with NO bespoke match is still skipped below, keeping
    // its archetype landmark value (if any) untouched — additive as before.
    const key = resolveBespokeKey(fabric, place.name);
    if (!key) continue; // no bespoke hero → keep its archetype landmark value
    const foot = footFor(fabric, key);
    const value = HERO_BASE + table.length;
    // stamp the W×H footprint, SW-anchored on (x, y): extend E (+x) and N (−y),
    // clipped to the map (off-map tiles are simply skipped).
    //
    // ADDITIVITY FOR CODE-DRAWN LONDON: the OSM pipeline stamps a placeholder
    // archetype/marquee landmark under each hero name that the hero is meant to
    // REPLACE, so for those fabrics the hero overwrites freely. London is
    // code-drawn: its marquee icons (St Paul's, Parliament, the O2, Wembley,
    // the Olympic venues …) are ALREADY hand-placed in the landmark raster by
    // buildLondonMap's enum pass — the very same bespoke art, with reserved
    // precincts (some reaching over the river) that the map's tests guard. So
    // for `london` a hero must NOT clobber an existing enum landmark, nor stamp
    // a water tile a marquee's precinct happens to span: it writes ONLY free
    // (none) LAND / already-hero tiles. A marquee whose footprint is wholly
    // enum+water therefore stamps nothing and stays a label that renders +
    // lights via its enum placement, while the NEW London heroes (termini,
    // museums, palaces, the South-Bank set, the City civics) sit on open ground
    // and stamp in full. Other fabrics keep the original overwrite behaviour.
    const guard = fabric === 'london';
    const terrain = map.terrain;
    const [fw, fh] = foot;
    let stamped = 0;
    for (let dx = 0; dx < fw; dx++) {
      for (let dy = 0; dy < fh; dy++) {
        const tx = place.x + dx;
        const ty = place.y - dy;
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;
        const li = ty * map.width + tx;
        if (guard) {
          const cur = landmark[li] ?? 0;
          if (cur > 0 && cur < HERO_BASE) continue; // keep London's enum icon
          if (terrain[li] === TERRAIN.water) continue; // don't stamp the river
        }
        landmark[li] = value;
        stamped++;
      }
    }
    if (stamped === 0) continue; // nothing placed (London marquee on its enum) → no slot
    table.push({ key, foot, name: place.name });
    place.heroKey = key;
  }
  if (table.length > 0) map.heroTable = table;
}
