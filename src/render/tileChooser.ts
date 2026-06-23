// Decides which atlas sprites represent each map tile. Shared by the Pixi
// renderer and the Node preview tool so both always agree. Tiles split into
// two passes: a flat GROUND sprite (always present) and an optional
// STRUCTURE sprite with a transparent floor — the renderer draws its vector
// road ribbons between the two.

import { FLAG_RUNWAY, FLAG_SHOPS, riverCenterY } from '../data/londonMap';
import { HERO_BASE, LANDMARK, RC, TERRAIN, ZONE, type CityMap, type Landmark } from '../sim/map/types';
import { frameIdFor } from './sprites/heroes/registry';

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
  // bespoke Paris heroes (OSM pipeline): a massive 3×3 Eiffel + the towering
  // 2×2 Notre-Dame
  LANDMARK.eiffel,
  LANDMARK.notredame,
  // the Pyramids of Giza — SPLIT into free-standing heroes (owner, 2026-06-15),
  // each a broad+low SW-anchored block on its own desert apron + the Sphinx
  LANDMARK.pyramidGreat,
  LANDMARK.pyramidKhafre,
  LANDMARK.pyramidMenkaure,
  LANDMARK.sphinx,
]);

export const LANDMARK_SPRITE: Partial<Record<Landmark, string>> = {
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
  [LANDMARK.notredame]: 'lm_notredame',
  [LANDMARK.eiffel]: 'lm_eiffel',
  [LANDMARK.arch]: 'lm_arch',
  [LANDMARK.basilica]: 'lm_basilica',
  [LANDMARK.louvre]: 'lm_louvre',
  // the old monolithic Giza group (LANDMARK.pyramid, deprecated 2026-06-15) was
  // split into the separate heroes below; alias it to the Great Pyramid so any
  // old save baking landmark value 41 still resolves to a real sprite.
  [LANDMARK.pyramid]: 'lm_pyramid_great',
  [LANDMARK.pyramidGreat]: 'lm_pyramid_great',
  [LANDMARK.pyramidKhafre]: 'lm_pyramid_khafre',
  [LANDMARK.pyramidMenkaure]: 'lm_pyramid_menkaure',
  [LANDMARK.sphinx]: 'lm_sphinx',
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

/** A well-mixed PER-TILE hash — for buildings that should differ from their
 *  neighbours (towers/offices), so a skyline reads as many distinct blocks
 *  rather than the same sprite tiled. */
function tileHash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return h >>> 0;
}

/** Farmland is enclosed in 4x4 parcels; this hash keeps each parcel one
 *  coherent crop (and decides hedgerows + orchards along its bounds). */
function parcelOf(x: number, y: number): number {
  return Math.abs(((x >> 2) * 73856093) ^ ((y >> 2) * 19349663));
}

/** The Giza plateau — Cairo's SW desert corner where the Pyramids + the Great
 *  Sphinx stand. The OSM source tags this open archaeological zone as PARK, and
 *  the park/countryside renderers dress it with VIVID green palm trees (Cairo's
 *  `treeGreen` stays jungle-green so the irrigated Nile reads lush) — which left
 *  the monuments standing in a grove instead of open sand (owner, 2026-06-16:
 *  "the Pyramids render on GREEN TREES, but Giza is open DESERT"). This guard
 *  flags the plateau west of the Nile (the river, which returns early, is the
 *  natural eastern edge) so the ground reads as bare tawny sand and NO
 *  vegetation/built structure is dressed over it — the bespoke pyramid/Sphinx
 *  heroes (each on its own `sandApron`) then sit on open desert, as they should.
 *  Cairo-only and bounded to the corner, so no other city/quarter is touched. */
function isGizaDesert(map: CityMap, x: number, y: number): boolean {
  return (map.fabric ?? 'london') === 'cairo' && x <= 33 && y >= 147;
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
  // Giza plateau: bare tawny desert sand (Cairo's `field` is sandy ochre), so
  // the park/lawn dressing never paints a green carpet under the monuments.
  if (isGizaDesert(map, x, y)) return `ground_field_${v % 2}`;

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
        // estuary flats: marsh where the land runs low beside the wide river.
        // London-only — riverCenterY is the Thames profile, meaningless on
        // another city's map (it would paint phantom marsh down the east edge).
        if ((map.fabric ?? 'london') === 'london' && x > 180 && Math.abs(y - riverCenterY(x)) < 9) {
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

/** Bespoke per-city DOMESTIC stock (WP6 + WAVE ζ). Maps a city fabric + zone to
 *  the city's own archetype sprites so each place reads as ITSELF, not recoloured
 *  London terraces. Returns undefined for fabrics with no bespoke stock (London,
 *  Paris's non-Haussmann zones) AND for zones a converted city doesn't override
 *  (civic/industrial/rural/CBD glass/etc.), so the caller falls through to the
 *  shared London logic. The sprite KEYS here are only baked into the atlas when
 *  that fabric is active (atlas.ts buildCityStockBufs, off the shared sheet), so
 *  this must agree with which cities register stock there. Variant blends the
 *  ESTATE hash (8×8 block coherence — whole streets share a family) with a
 *  per-tile alternation, the same texture London/Paris use. All 11 non-London
 *  cities now carry bespoke stock: Paris (Haussmann), New York (brownstone +
 *  setback), Hong Kong (tower + tong-lau), Cairo (concrete-frame walk-up), and
 *  WAVE ζ — Sydney (iron-lace terrace + brick-and-tile bungalow), Berlin (Altbau
 *  mietshaus + Plattenbau slab), Shanghai (shikumen lilong + concrete/glass
 *  walk-up), Cape Town (Bo-Kaap colour row + Cape-Victorian cottage), Athens
 *  (polykatoikia), Pune (RCC mid-rise flat + Maratha wada), North-East England
 *  (Tyneside flat + pebbledash semi). */
function cityStockFor(
  fabric: CityMap['fabric'],
  zone: number | undefined,
  shops: boolean,
  estate: number,
  th: number,
  v: number,
): string | undefined {
  switch (fabric) {
    case 'paris':
      // the pale, grid-like Haussmann street wall across the urban fabric
      if (zone === ZONE.urbanCore || zone === ZONE.urban) return `haussmann_${th % 12}`;
      return undefined;
    case 'newyork': {
      // setback "wedding-cake" masonry towers form the dense canyon walls of the
      // core + CBD; brownstone rows (stoops, cornices) fill the boroughs.
      if (zone === ZONE.cbd) {
        const k = th % 6;
        if (k < 3) return `sky_${estate % 3}`; // generic glass supertalls stay
        return `setback_${estate % 4}`;
      }
      if (zone === ZONE.urbanCore) {
        return th % 5 < 3 ? `setback_${estate % 4}` : `brownstone_${(estate + (v % 2)) % 4}`;
      }
      if (zone === ZONE.urban || zone === ZONE.suburb) {
        return `brownstone_${(estate + (v % 2)) % 4}`;
      }
      return undefined;
    }
    case 'hongkong': {
      // the wall-of-towers: flat-topped residential slabs on podiums dominate the
      // core + CBD; older tong-lau walk-ups fill the denser urban/suburb fabric.
      if (zone === ZONE.cbd) {
        const k = th % 6;
        if (k < 2) return `sky_${estate % 3}`; // harbour glass supertalls stay
        return `hktower_${estate % 4}`;
      }
      if (zone === ZONE.urbanCore) return `hktower_${estate % 4}`;
      if (zone === ZONE.urban) return `tonglau_${(estate + (v % 2)) % 4}`;
      if (zone === ZONE.suburb) return th % 3 === 0 ? `hktower_${estate % 4}` : `tonglau_${(estate + (v % 2)) % 4}`;
      return undefined;
    }
    case 'cairo': {
      // the uniform brown-ochre sprawl: red-brick / concrete-frame walk-ups
      // across the whole residential fabric, jagged mismatched heights.
      void shops;
      if (zone === ZONE.urbanCore || zone === ZONE.urban || zone === ZONE.suburb) {
        return `cairoblock_${(estate + (v % 2)) % 6}`;
      }
      return undefined;
    }
    case 'sydney': {
      // inner-suburb iron-lace verandah terraces fill the dense core/urban
      // fabric; the brick-and-tile bungalow dominates the leafy suburbs. The
      // glassy harbour CBD keeps the generic supertall mix (London default).
      if (zone === ZONE.urbanCore || zone === ZONE.urban) {
        return `sydterrace_${(estate + (v % 2)) % 4}`;
      }
      if (zone === ZONE.suburb) {
        return th % 5 === 0 ? `sydterrace_${(estate + (v % 2)) % 4}` : `sydbungalow_${(estate + (v % 2)) % 4}`;
      }
      return undefined;
    }
    case 'berlin': {
      // the ornate stucco Altbau perimeter-block fills the dense inner fabric
      // (Mitte/Kreuzberg); the GDR Plattenbau panel slab fills the outer estates
      // (Marzahn). Potsdamer-Platz CBD keeps the generic glass supertalls.
      void shops;
      if (zone === ZONE.urbanCore || zone === ZONE.urban) {
        return `altbau_${(estate + (v % 2)) % 4}`;
      }
      if (zone === ZONE.suburb) {
        return th % 3 === 0 ? `altbau_${(estate + (v % 2)) % 4}` : `plattenbau_${(estate + (v % 2)) % 4}`;
      }
      return undefined;
    }
    case 'shanghai': {
      // grey-brick shikumen lane houses fill the dense old core; concrete/glassy
      // walk-ups fill the broad mid-rise fabric. Lujiazui/Pudong CBD keeps the
      // generic glass supertalls (the Bund-facing skyline).
      void shops;
      if (zone === ZONE.urbanCore) {
        return th % 5 < 3 ? `shikumen_${(estate + (v % 2)) % 4}` : `shwalkup_${(estate + (v % 2)) % 4}`;
      }
      if (zone === ZONE.urban || zone === ZONE.suburb) {
        return th % 7 === 0 ? `shikumen_${(estate + (v % 2)) % 4}` : `shwalkup_${(estate + (v % 2)) % 4}`;
      }
      return undefined;
    }
    case 'capetown': {
      // the candy Bo-Kaap colour rows fill the dense City-Bowl core; Cape-
      // Victorian / face-brick cottages fill the suburbs. The Foreshore CBD keeps
      // the generic glass towers.
      void shops;
      if (zone === ZONE.urbanCore || zone === ZONE.urban) {
        return `bokaap_${(estate + (v % 2)) % 4}`;
      }
      if (zone === ZONE.suburb) {
        return th % 4 === 0 ? `bokaap_${(estate + (v % 2)) % 4}` : `capecottage_${(estate + (v % 2)) % 4}`;
      }
      return undefined;
    }
    case 'athens': {
      // the pale deep-balconied polykatoikia blankets the WHOLE residential
      // fabric — near-uniform, like the real Attic basin. The Syntagma/Marousi
      // CBD keeps the generic glass towers.
      void shops;
      if (zone === ZONE.urbanCore || zone === ZONE.urban || zone === ZONE.suburb) {
        return `polykatoikia_${(estate + (v % 2)) % 6}`;
      }
      return undefined;
    }
    case 'pune': {
      // warm-ochre RCC mid-rise flats blanket the residential fabric; heritage
      // Maratha wadas (carved-timber verandah under red Mangalore-tile) seed the
      // dense old core (Kasba/Shaniwar Peth). Hinjewadi-style IT CBD keeps glass.
      void shops;
      if (zone === ZONE.urbanCore) {
        return th % 6 === 0 ? `wada_${(estate + (v % 2)) % 3}` : `puneflat_${(estate + (v % 2)) % 5}`;
      }
      if (zone === ZONE.urban || zone === ZONE.suburb) {
        return `puneflat_${(estate + (v % 2)) % 5}`;
      }
      return undefined;
    }
    case 'northeast': {
      // a VARIED Tyneside/Wearside fabric, not endless identical terraces. Whole
      // BLOCKS share a family (estate hash) so a street stays coherent, but
      // neighbouring blocks differ by type/era/height, with the odd accent —
      // a 3-storey cottage-flats walk-up, a corner shop, a modern infill block.
      // The variant blends the estate hash with a per-tile alternation (v) so a
      // family still reads as several distinct buildings along its run.
      const vt = (estate + (v % 2)) % 4;
      if (zone === ZONE.urbanCore || zone === ZONE.urban) {
        // an accent tile (corner of the block): a local corner shop where the
        // tile is flagged for retail, otherwise the odd taller cottage-flats
        // walk-up — both punctuate the terraced street, ~1 in 7 tiles.
        if (th % 7 === 0) return shops ? `necornershop_${vt}` : `cottageflats_${vt}`;
        if (shops && th % 11 === 3) return `necornershop_${vt}`;
        // the block family: alternate Tyneside flats with plain brick terraces
        // (and, denser cores only, the occasional modern infill block).
        const fam = estate % 5;
        if (fam === 4) return `cottageflats_${vt}`;
        if (fam === 3) return zone === ZONE.urbanCore ? `nemodernblock_${vt}` : `brickterrace_${vt}`;
        if (fam % 2 === 1) return `brickterrace_${vt}`;
        return `tynesideflat_${vt}`;
      }
      if (zone === ZONE.suburb) {
        // leafy suburb: pebbledash semis dominate, mixed with plain brick
        // terraces, the odd detached/large house and an occasional small block.
        if (th % 9 === 0) return `cottageflats_${vt}`;
        const fam = estate % 6;
        if (fam === 5) return `nedetached_${vt}`;
        if (fam === 4) return th % 2 === 0 ? `nedetached_${vt}` : `brickterrace_${vt}`;
        if (fam % 3 === 1) return `brickterrace_${vt}`;
        return `pebbledashsemi_${vt}`;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/** What stands on the tile (transparent floor), or undefined for open
 *  ground. Streets/arterials/rails through the tile centre clear it —
 *  the carriageway ribbon runs where the structure would stand. */
/** Non-London (OSM-seeded) cities carry a much DENSER building fabric than
 *  curated London — their streets read cluttered (owner, 2026-06-22: "too many
 *  buildings on the maps other than London ... fewer is better"). We thin this
 *  percentage of their ordinary building tiles in the RENDERER only; dropped
 *  tiles fall through to open ground so the city breathes. Sim zones / customers
 *  / demand are untouched, and London is gated out entirely (byte-identical). */
const CITY_BUILDING_THIN_PCT = 35;
/** Ordinary building zones that the thin applies to — the residential /
 *  commercial / industrial fabric. Excludes rural (already sparse), newEstate
 *  (gameplay-significant iDNO estates), parks, glasshouse and generation sites. */
const THINNABLE_ZONES: ReadonlySet<number> = new Set<number>([
  ZONE.urbanCore,
  ZONE.urban,
  ZONE.suburb,
  ZONE.posh,
  ZONE.cbd,
  ZONE.industrial,
]);

export function structureSpriteFor(map: CityMap, x: number, y: number): string | undefined {
  const i = y * map.width + x;
  const terrain = map.terrain[i];
  const zone = map.zone[i];
  const v = map.variant[i] ?? 0;

  // landmarks are protected fabric — they render even where routes pass
  // (the tower bridge carries the road between its towers)
  const lmRaw = map.landmark?.[i] ?? LANDMARK.none;
  // BESPOKE HERO (raster value >= HERO_BASE): a per-city string-keyed sprite
  // placed via the runtime heroTable, drawn exactly like the multi-tile enum
  // heroes (one SW-anchored sprite on the reservation's (min x, max y) tile).
  if (lmRaw >= HERO_BASE) {
    const slot = map.heroTable?.[lmRaw - HERO_BASE];
    if (slot) {
      // anchor = the reservation's (min x, max y) SW corner — no same-index
      // tile to the W, S or SW — exactly the enum BLOCK_LANDMARKS rule, so the
      // standard 1×1 placement pins the whole SW-anchored foot. The footprint
      // is a clean w×h rectangle of this exact index value (stamped from its
      // SW corner in buildCityFromData, extending E +x and N −y).
      const sameH = (xx: number, yy: number): boolean =>
        xx >= 0 && xx < map.width && yy >= 0 && yy < map.height &&
        (map.landmark?.[yy * map.width + xx] ?? LANDMARK.none) === lmRaw;
      const anchor = !sameH(x - 1, y) && !sameH(x, y + 1) && !sameH(x - 1, y + 1);
      return anchor ? frameIdFor(map.fabric ?? 'london', slot.key) : undefined;
    }
    // a dangling index (no slot) just falls through to open ground
    return undefined;
  }
  const lm = lmRaw as Landmark;
  if (lm !== LANDMARK.none) {
    // ORDINARY civic: a 1×1 tile-sized municipal building in the city palette
    // (no apron, no grand marble block). Variant by per-tile hash so a run of
    // civic buildings reads as a varied street.
    if (lm === LANDMARK.civic) return `lm_civic${tileHash(x, y) % 4}`;
    // the grand-civic generator: a 2×2 block whose VARIANT is chosen by the
    // anchor-tile hash, so the ~100 notable buildings read as many distinct
    // hero buildings from one family.
    if (lm === LANDMARK.grand) {
      const sameG = (xx: number, yy: number): boolean =>
        xx >= 0 && xx < map.width && yy >= 0 && yy < map.height &&
        (map.landmark?.[yy * map.width + xx] ?? LANDMARK.none) === LANDMARK.grand;
      const anchorG = !sameG(x - 1, y) && !sameG(x, y + 1) && !sameG(x - 1, y + 1);
      return anchorG ? `lm_grand${tileHash(x, y) % 4}` : undefined;
    }
    // generic skyscraper heroes: a 2×2 reservation, variant by anchor hash, so
    // the tall tail of notable buildings reads as many distinct towers.
    if (lm === LANDMARK.skyscraper) {
      const sameK = (xx: number, yy: number): boolean =>
        xx >= 0 && xx < map.width && yy >= 0 && yy < map.height &&
        (map.landmark?.[yy * map.width + xx] ?? LANDMARK.none) === LANDMARK.skyscraper;
      const anchorK = !sameK(x - 1, y) && !sameK(x, y + 1) && !sameK(x - 1, y + 1);
      return anchorK ? `lm_sky${tileHash(x, y) % 4}` : undefined;
    }
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
  // Giza plateau: open desert. Bespoke pyramid/Sphinx heroes were already
  // emitted above (lmRaw >= HERO_BASE); every remaining non-hero tile here is
  // bare sand — suppress the park palms, countryside copses and town fabric the
  // PARK/suburb zoning would otherwise dress, so the monuments stand alone.
  if (isGizaDesert(map, x, y)) return undefined;
  if (terrain === TERRAIN.hill) return `hill_${v % 2}`;
  if (terrain === TERRAIN.trees) return `trees_${v % 3}`;

  // Declutter the generated (non-London) cities: drop a deterministic per-tile
  // hash fraction of ORDINARY building tiles so the dense OSM fabric breathes.
  // Heroes/landmarks/hills/trees above are already handled; rural, newEstate,
  // parks and generation sites are excluded; London is gated out (byte-identical).
  // Render-only — the sim's zones/customers/demand are unchanged.
  if (
    (map.fabric ?? 'london') !== 'london' &&
    zone !== undefined &&
    THINNABLE_ZONES.has(zone) &&
    tileHash(x + 101, y + 53) % 100 < CITY_BUILDING_THIN_PCT
  ) {
    return undefined;
  }

  const estate = estateOf(x, y);
  const shops = ((map.flags?.[i] ?? 0) & FLAG_SHOPS) !== 0;
  const th = tileHash(x, y);

  // bespoke per-city building stock (WP6): a city wears its OWN archetypes
  // across its residential/core fabric so it never reads as recoloured London
  // terraces. Returns a sprite for the cities that have bespoke stock, else
  // undefined to fall through to the London default below. London/Paris and the
  // un-converted cities are unaffected (Paris keeps its Haussmann path here).
  const bespoke = cityStockFor(map.fabric, zone, shops, estate, th, v);
  if (bespoke !== undefined) return bespoke;

  switch (zone) {
    case ZONE.cbd: {
      // a varied financial-district skyline. The TYPE mixes per-tile, but the
      // COLOUR/variant is keyed on the ESTATE (8×8 block) so a cluster of
      // towers shares a family — coherent districts, not per-tile confetti.
      const k = th % 6;
      if (k < 3) return `sky_${estate % 3}`;
      if (k < 5) return `office_${estate % 6}`;
      return `tower_${estate % 8}`;
    }
    case ZONE.urbanCore: {
      const k = th % 7;
      if (k < 2) return `tower_${estate % 8}`;
      if (k === 2) return `office_${estate % 6}`;
      return `terrace_${(estate + (v % 2)) % 4}`;
    }
    case ZONE.urban: {
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
      // (London-only marsh guard — see groundSpriteFor)
      if ((map.fabric ?? 'london') === 'london' && x > 180 && Math.abs(y - riverCenterY(x)) < 9) {
        return undefined; // marsh stays open
      }
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
