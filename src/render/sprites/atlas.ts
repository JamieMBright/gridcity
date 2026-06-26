// Builds the master sprite atlas: every named sprite rendered by the
// vector rasterizer into one RGBA sheet. Sprites are variable-sized now
// (multi-tile plant like the coal station), so cells carry their own
// dimensions and a simple shelf packer lays the sheet out. The browser
// uploads this to a Pixi texture; the preview tool encodes it to PNG.

import { isoDims, swAnchorDims } from './iso';
import { activeFabric } from './buildingSprites';
import { bespokeHeroesFor, frameIdFor } from './heroes/registry';
import {
  altbauTile,
  berlinlowTile,
  berlintowerTile,
  bokaapTile,
  brickterraceTile,
  brownstoneTile,
  cairoblockTile,
  capecottageTile,
  cottageTile,
  cottageflatsTile,
  councilflatTile,
  factoryTile,
  georgianTile,
  greenhouseTile,
  haussmannTile,
  hktowerTile,
  necornershopTile,
  nedetachedTile,
  nemodernblockTile,
  newbuildTile,
  officeTile,
  pebbledashsemiTile,
  plattenbauTile,
  polykatoikiaTile,
  puneflatTile,
  punelowTile,
  punetowerTile,
  semiTile,
  setbackTile,
  shikumenTile,
  shwalkupTile,
  solarFarmTile,
  sydbungalowTile,
  sydterraceTile,
  terraceTile,
  tonglauTile,
  towerTile,
  tynesideflatTile,
  vicshopTile,
  victerraceTile,
  villaTile,
  wadaTile,
  warehouseTile,
} from './buildingSprites';
import {
  airportTile,
  allypallyTile,
  archTile,
  arenaTile,
  bttowerTile,
  carparkTile,
  churchTile,
  civicTile,
  datacentreTile,
  domeTile,
  eiffelTile,
  EXCEL_H,
  EXCEL_W,
  excelTile,
  eyeTile,
  fortressTile,
  gherkinTile,
  grandTile,
  skyscraperHeroTile,
  HEATHROW_H,
  HEATHROW_W,
  heathrowTile,
  kewhouseTile,
  louvreTile,
  mallTile,
  notredameTile,
  O2_H,
  O2_W,
  o2domeTile,
  orbitTile,
  palacemastTile,
  parliamentTile,
  powerstationTile,
  PYRAMID_FOOT,
  pyramidTile,
  SPHINX_H,
  SPHINX_W,
  sphinxTile,
  sacrecoeurTile,
  schoolTile,
  sewageTile,
  skyscraperTile,
  spireTile,
  STADIUM_H,
  STADIUM_W,
  stadiumTile,
  stationTile,
  towerBridgeTile,
  townhallTile,
  velodromeTile,
  watertowerTile,
  WEMBLEY_H,
  WEMBLEY_W,
  wembleyTile,
  westfieldTile,
  zooTile,
} from './landmarkSprites';
import {
  batteryTile,
  biomassTile,
  capBankTile,
  coalPlantTile,
  constructionTile,
  depotTile,
  electrolyserTile,
  gasPeakerTile,
  gasPlantTile,
  interconnectorTile,
  nuclearTile,
  pole33Tile,
  pylon132Tile,
  pylon400Tile,
  subBulkTile,
  subDistTile,
  subGridTile,
  subPoleTile,
  subVaultTile,
  tidalTile,
  damTile,
  vanTile,
  windTurbineTile,
} from './networkSprites';
import {
  groundFieldTile,
  groundMarshTile,
  groundPloughTile,
  groundRapeTile,
  groundRunwayTile,
  hedgerowTile,
  orchardTile,
  groundGrassTile,
  groundMoorTile,
  groundParkTile,
  groundPaveTile,
  hillTile,
  parkTile,
  solarSiteTile,
  treesTile,
  waterTile,
} from './worldSprites';

/** A registered atlas frame. `ox/oy` are the transparent margin trimmed off
 *  the LEFT/TOP of the sprite's original canvas; both renderers add them back
 *  to the placement so trimming never shifts a pixel on screen. */
export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  /** Extra sky rows the sprite reserved ABOVE its footprint (Iso headroom).
   *  Both renderers LIFT the placement by this so a taller-than-footprint
   *  hero keeps its floor pinned. 0 for every ordinary sprite. */
  headroom: number;
}

export interface SpriteAtlas {
  width: number;
  height: number;
  /** RGBA8, row-major. */
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Sprite name → its rectangle on the sheet (+ trim offset). */
  frames: Map<string, AtlasFrame>;
  /** BESPOKE per-city heroes, baked to their OWN tight buffers — NOT packed
   *  into the shared sheet (W2b). Heroes are sparse (≤~100/city) + large + static,
   *  so a per-hero texture keeps the shared sheet under the 4096px ceiling no
   *  matter how many heroes a city carries (100 sprites would overflow a single
   *  sheet — 2 already pushed Paris to 4014/4096). Empty for a heroless fabric
   *  (London) ⇒ byte-identical. Each value is a tight w×h RGBA buffer + the
   *  trim offset (added back at placement, exactly like a frame). */
  heroes: Map<string, HeroBuf>;
}

/** A bespoke hero baked to its own tight texture buffer (off the shared sheet). */
export interface HeroBuf {
  /** Tight RGBA8 buffer, row-major, exactly w×h (the trimmed art). */
  pixels: Uint8ClampedArray<ArrayBuffer>;
  w: number;
  h: number;
  /** Transparent margin trimmed off the original canvas left/top (add back at placement). */
  ox: number;
  oy: number;
  /** Iso headroom baked in (extra sky above the footprint; the renderer lifts by it). */
  headroom: number;
}

interface Cell {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Trimmed frame size on the sheet. */
  w: number;
  h: number;
  /** Transparent margin trimmed off the original canvas left/top. */
  ox: number;
  oy: number;
  /** Row stride of `pixels` (the sprite's full canvas width). */
  stride: number;
  /** Iso headroom baked into this sprite (extra sky above the footprint). */
  headroom: number;
}

/** Sprites are placed by their top-left corner in both renderers, so the
 *  fully-transparent margin around the drawn art can be dropped from the
 *  registered frame — as long as the trimmed left/top offset (ox, oy) is
 *  added back at placement. Trimming ALL FOUR sides (not just right/bottom)
 *  reclaims the big empty sky above the tall heroes (the Shard, BT Tower,
 *  the multi-tile palaces and the Heathrow island), which is what keeps the
 *  sheet under the 4096px mobile-GPU ceiling as the landmark set grows. */
function trimmedExtent(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): { w: number; h: number; ox: number; oy: number } {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((pixels[(y * w + x) * 4 + 3] ?? 0) > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { w: 1, h: 1, ox: 0, oy: 0 }; // fully transparent
  // a 1px transparent guard band keeps linear-filter neighbours clean
  const ox = Math.max(0, minX - 1);
  const oy = Math.max(0, minY - 1);
  return {
    w: Math.min(w, maxX + 2) - ox,
    h: Math.min(h, maxY + 2) - oy,
    ox,
    oy,
  };
}

/** Compute a Cell (trimmed extent + stride + auto-detected headroom) from a
 *  raw sprite buffer. Shared by the sheet packer (`set`) and the off-sheet hero
 *  baker (`buildHeroBufs`). dims mirror the Iso constructor (sw = SW-anchored
 *  landmark blocks). A hero's Iso may have added HEADROOM — extra sky rows above
 *  the footprint so it can exceed the footprint-derived height cap; infer it
 *  from the ACTUAL buffer height vs the footprint height (dims.w is the true row
 *  stride, unaffected by headroom). 0 for every ordinary sprite ⇒ byte-identical. */
function makeCell(
  pixels: Uint8ClampedArray<ArrayBuffer>,
  wTiles: number,
  hTiles: number,
  sw: boolean,
): Cell {
  const dims = sw ? swAnchorDims(wTiles, hTiles) : isoDims(wTiles, hTiles);
  const totalH = pixels.length / 4 / dims.w;
  const headroom = Math.max(0, Math.round(totalH - dims.h));
  return { pixels, ...trimmedExtent(pixels, dims.w, totalH), stride: dims.w, headroom };
}

/** Bake the ACTIVE fabric's BESPOKE heroes to their OWN tight buffers (W2b),
 *  OFF the shared sheet so 100 heroes/city never overflow the 4096 packer. Each
 *  hero's trimmed art is copied into a tight w×h buffer; the renderer makes a
 *  per-hero Texture from it and the preview blits it directly. Empty for a
 *  heroless fabric (London) ⇒ atlas.heroes is empty ⇒ byte-identical. */
function buildHeroBufs(): Map<string, HeroBuf> {
  const heroes = new Map<string, HeroBuf>();
  for (const hero of bespokeHeroesFor(activeFabric())) {
    const c = makeCell(hero.draw(hero.seed), hero.foot[0], hero.foot[1], true);
    const tight = new Uint8ClampedArray(c.w * c.h * 4);
    for (let row = 0; row < c.h; row++) {
      const src = ((c.oy + row) * c.stride + c.ox) * 4;
      tight.set(c.pixels.subarray(src, src + c.w * 4), row * c.w * 4);
    }
    heroes.set(frameIdFor(hero.city, hero.key), {
      pixels: tight,
      w: c.w,
      h: c.h,
      ox: c.ox,
      oy: c.oy,
      headroom: c.headroom,
    });
  }
  return heroes;
}

/** Copy one 1×1 sprite's trimmed art into a tight off-atlas HeroBuf, keyed by
 *  its plain sprite name. Same packing as buildHeroBufs but for ordinary (non-
 *  SW) 1×1 building cells. The renderer/preview resolve a HeroBuf by name
 *  identically to an atlas frame, so the tile chooser can return these names. */
function tightBuf(name: string, pixels: Uint8ClampedArray<ArrayBuffer>): [string, HeroBuf] {
  const c = makeCell(pixels, 1, 1, false);
  const tight = new Uint8ClampedArray(c.w * c.h * 4);
  for (let row = 0; row < c.h; row++) {
    const src = ((c.oy + row) * c.stride + c.ox) * 4;
    tight.set(c.pixels.subarray(src, src + c.w * 4), row * c.w * 4);
  }
  return [name, { pixels: tight, w: c.w, h: c.h, ox: c.ox, oy: c.oy, headroom: c.headroom }];
}

/** Bake the ACTIVE fabric's bespoke DOMESTIC stock (WP6 + WAVE ζ) to OWN
 *  off-atlas buffers, exactly like the heroes — so a city wears era/region-
 *  appropriate housing WITHOUT bloating the ~3968px shared sheet (the tall
 *  NYC/HK towers are big cells; adding 8–12 to the packed sheet pushed it to
 *  ~4090/4096). Off-atlas, they cost only a per-sprite texture (a handful per
 *  city, tiled across the map). Empty for London (and Paris, whose Haussmann
 *  blocks predate this mechanism and stay in-sheet) ⇒ those sheets stay
 *  byte-identical. PATTERN for any future city: add a `<city>` archetype in
 *  buildingSprites.ts, register its variants under a new `case` here, and branch
 *  on `map.fabric === '<city>'` in tileChooser.cityStockFor. */
function buildCityStockBufs(): Map<string, HeroBuf> {
  const stock = new Map<string, HeroBuf>();
  const add = (name: string, px: Uint8ClampedArray<ArrayBuffer>): void => {
    const [k, v] = tightBuf(name, px);
    stock.set(k, v);
  };
  switch (activeFabric()) {
    case 'newyork':
      // brownstone rows (stoops · cornices · bays) + setback "wedding-cake" towers
      for (let i = 0; i < 4; i++) add(`brownstone_${i}`, brownstoneTile(361 + i, i));
      for (let i = 0; i < 4; i++) add(`setback_${i}`, setbackTile(371 + i, i));
      break;
    case 'hongkong':
      // dense flat-topped slabs on retail podiums + older tong-lau walk-ups
      for (let i = 0; i < 4; i++) add(`hktower_${i}`, hktowerTile(381 + i, i));
      for (let i = 0; i < 4; i++) add(`tonglau_${i}`, tonglauTile(391 + i, i));
      break;
    case 'cairo':
      // red-brick / concrete-frame walk-ups with unfinished rebar tops + clutter
      for (let i = 0; i < 6; i++) add(`cairoblock_${i}`, cairoblockTile(401 + i, i));
      break;
    case 'sydney':
      // Federation iron-lace verandah terraces + brick-and-tile bungalows
      for (let i = 0; i < 4; i++) add(`sydterrace_${i}`, sydterraceTile(411 + i, i));
      for (let i = 0; i < 4; i++) add(`sydbungalow_${i}`, sydbungalowTile(421 + i, i));
      break;
    case 'berlin':
      // VARIETY: a real height/era MIX, not one repeated mid-rise — ornate stucco
      // Altbau blocks (now 6 variants stepping 3–7 storeys) + GDR Plattenbau slabs
      // (6 variants, 4–11 storeys) + tall modern point-block towers (the vertical
      // accent) + low 2–3 storey corner houses (the low end).
      for (let i = 0; i < 6; i++) add(`altbau_${i}`, altbauTile(431 + i, i));
      for (let i = 0; i < 6; i++) add(`plattenbau_${i}`, plattenbauTile(441 + i, i));
      for (let i = 0; i < 5; i++) add(`berlintower_${i}`, berlintowerTile(631 + i, i));
      for (let i = 0; i < 4; i++) add(`berlinlow_${i}`, berlinlowTile(641 + i, i));
      break;
    case 'shanghai':
      // grey-brick shikumen stone-gate lane houses + concrete/glassy walk-ups
      for (let i = 0; i < 4; i++) add(`shikumen_${i}`, shikumenTile(451 + i, i));
      for (let i = 0; i < 4; i++) add(`shwalkup_${i}`, shwalkupTile(461 + i, i));
      break;
    case 'capetown':
      // candy-coloured Bo-Kaap flat-roof rows + Cape-Victorian / face-brick cottages
      for (let i = 0; i < 4; i++) add(`bokaap_${i}`, bokaapTile(471 + i, i));
      for (let i = 0; i < 4; i++) add(`capecottage_${i}`, capecottageTile(481 + i, i));
      break;
    case 'athens':
      // the ubiquitous pale polykatoikia: deep-balconied concrete-frame flats
      for (let i = 0; i < 6; i++) add(`polykatoikia_${i}`, polykatoikiaTile(491 + i, i));
      break;
    case 'pune':
      // VARIETY: warm-ochre RCC mid-rise flats (now 7 variants stepping 3–12
      // storeys) + heritage Maratha wadas + tall modern IT/residential highrises
      // (the vertical accent) + low 2–3 storey older pukka houses (the low end),
      // so Pune reads as a varied skyline, not a homogenous layering of towers.
      for (let i = 0; i < 7; i++) add(`puneflat_${i}`, puneflatTile(501 + i, i));
      for (let i = 0; i < 3; i++) add(`wada_${i}`, wadaTile(507 + i, i));
      for (let i = 0; i < 5; i++) add(`punetower_${i}`, punetowerTile(651 + i, i));
      for (let i = 0; i < 4; i++) add(`punelow_${i}`, punelowTile(661 + i, i));
      break;
    case 'northeast':
      // a VARIED Tyneside/Wearside street: paired-door Tyneside flats + interwar
      // pebbledash semis, PLUS plain single-family brick terraces (varied roof
      // colours/ridges/eras), 3-storey cottage-flats walk-ups (the odd taller
      // block), the postwar detached/large semi (suburb variety), a corner-shop
      // parade, and a modest modern low-rise infill — all brick + slate.
      for (let i = 0; i < 4; i++) add(`tynesideflat_${i}`, tynesideflatTile(511 + i, i));
      for (let i = 0; i < 4; i++) add(`pebbledashsemi_${i}`, pebbledashsemiTile(521 + i, i));
      for (let i = 0; i < 4; i++) add(`brickterrace_${i}`, brickterraceTile(531 + i, i));
      for (let i = 0; i < 4; i++) add(`cottageflats_${i}`, cottageflatsTile(541 + i, i));
      for (let i = 0; i < 4; i++) add(`nedetached_${i}`, nedetachedTile(551 + i, i));
      for (let i = 0; i < 4; i++) add(`necornershop_${i}`, necornershopTile(561 + i, i));
      for (let i = 0; i < 4; i++) add(`nemodernblock_${i}`, nemodernblockTile(571 + i, i));
      break;
    default:
      break;
  }
  return stock;
}

function buildSpriteCells(): Map<string, Cell> {
  const m = new Map<string, Cell>();
  const set = (
    name: string,
    pixels: Uint8ClampedArray<ArrayBuffer>,
    wTiles = 1,
    hTiles = 1,
    sw = false,
  ): void => {
    m.set(name, makeCell(pixels, wTiles, hTiles, sw));
  };
  // ground pass (flat tiles, no structures)
  for (let i = 0; i < 4; i++) set(`ground_grass_${i}`, groundGrassTile(i + 1));
  for (let i = 0; i < 2; i++) set(`ground_pave_${i}`, groundPaveTile(i + 6));
  for (let i = 0; i < 2; i++) set(`ground_field_${i}`, groundFieldTile(i + 11));
  set('ground_moor', groundMoorTile(15));
  set('ground_rape', groundRapeTile(16));
  set('ground_plough', groundPloughTile(18));
  for (let i = 0; i < 2; i++) set(`ground_marsh_${i}`, groundMarshTile(19 + i));
  for (let i = 0; i < 2; i++) set(`hedgerow_${i}`, hedgerowTile(23 + i, i));
  set('orchard_0', orchardTile(27));
  set('ground_runway', groundRunwayTile(28));
  set('ground_park', groundParkTile(17));
  for (let mask = 0; mask < 16; mask++) set(`water_${mask}`, waterTile(61, mask));
  // world structures (transparent floors)
  for (let i = 0; i < 2; i++) set(`hill_${i}`, hillTile(i + 21));
  for (let i = 0; i < 3; i++) set(`trees_${i}`, treesTile(i + 31));
  for (let i = 0; i < 2; i++) set(`park_${i}`, parkTile(i + 41));
  set('solarsite_0', solarSiteTile(51));
  // buildings
  set('terrace_0', terraceTile(81, false));
  set('terrace_1', terraceTile(82, false));
  set('terrace_2', terraceTile(83, true)); // high-street shops
  set('terrace_3', terraceTile(84, false));
  for (let i = 0; i < 4; i++) set(`victerrace_${i}`, victerraceTile(251 + i, i));
  for (let i = 0; i < 2; i++) set(`vicshop_${i}`, vicshopTile(261 + i, i));
  for (let i = 0; i < 2; i++) set(`georgian_${i}`, georgianTile(295 + i, i));
  for (let i = 0; i < 2; i++) set(`councilflat_${i}`, councilflatTile(265 + i, i));
  for (let i = 0; i < 3; i++) set(`newbuild_${i}`, newbuildTile(271 + i, i));
  for (let i = 0; i < 4; i++) set(`semi_${i}`, semiTile(91 + i));
  set('villa_0', villaTile(101));
  set('villa_1', villaTile(102));
  // bespoke Paris stock (Haussmann blocks) — used when CityMap.fabric==='paris'.
  // many variants (height · stone · balconies · shopfronts) so the uniform
  // Parisian street wall still reads as many distinct buildings.
  for (let i = 0; i < 12; i++) set(`haussmann_${i}`, haussmannTile(351 + i, i));
  // NOTE (WP6): the NEW per-city domestic stock (brownstone/setback/hktower/
  // tonglau/cairoblock) is NOT registered on this shared sheet — it rides its
  // OWN off-atlas buffers (buildCityStockBufs), exactly like the bespoke heroes,
  // so the ~3968px shared sheet stays well under the 4096 mobile-GPU ceiling and
  // every city's sheet (London included) is byte-identical. (Paris's Haussmann
  // predates that mechanism and stays in-sheet; it fits, so it's left as-is.)
  // many tower/office variants (colour · height · crown) for a diverse skyline
  for (let i = 0; i < 8; i++) set(`tower_${i}`, towerTile(111 + i, i));
  for (let i = 0; i < 6; i++) set(`office_${i}`, officeTile(121 + i, i));
  set('cottage_0', cottageTile(131));
  set('cottage_1', cottageTile(132));
  set('warehouse_0', warehouseTile(141));
  set('factory_0', factoryTile(151));
  set('greenhouse_0', greenhouseTile(161));
  set('greenhouse_1', greenhouseTile(162));
  set('solarfarm_0', solarFarmTile(171));
  // skyscraper districts + landmarks
  for (let i = 0; i < 3; i++) set(`sky_${i}`, skyscraperTile(201 + i, i));
  // multi-tile icons are SW-anchored sprites: the chooser emits them on
  // their block's (min x, max y) tile and standard placement covers all
  set('lm_parliament', parliamentTile(211), 3, 5, true);
  set('lm_eye', eyeTile(212));
  set('lm_dome', domeTile(213), 2, 2, true);
  set('lm_spire', spireTile(214));
  set('lm_notredame', notredameTile(353), 2, 2, true); // bespoke Paris gothic cathedral (towering 2×2)
  set('lm_eiffel', eiffelTile(354), 3, 3, true); // bespoke Paris iron tower (massive)
  set('lm_arch', archTile(355)); // triumphal arch (Arc de Triomphe / gates)
  set('lm_basilica', sacrecoeurTile(356)); // Sacré-Cœur
  set('lm_louvre', louvreTile(357)); // the palace + glass pyramid
  // the Pyramids of Giza — SPLIT into separate free-standing heroes (owner,
  // 2026-06-15): three broad+low pyramids in their own sizes + the Sphinx, each
  // SW-anchored on its own tawny apron so the pipelines spread them apart.
  set('lm_pyramid_great', pyramidTile(358, 'great'), PYRAMID_FOOT.great.w, PYRAMID_FOOT.great.h, true);
  set('lm_pyramid_khafre', pyramidTile(359, 'khafre'), PYRAMID_FOOT.khafre.w, PYRAMID_FOOT.khafre.h, true);
  set('lm_pyramid_menkaure', pyramidTile(361, 'menkaure'), PYRAMID_FOOT.menkaure.w, PYRAMID_FOOT.menkaure.h, true);
  set('lm_sphinx', sphinxTile(362), SPHINX_W, SPHINX_H, true);
  // the ~100-hero grand-civic generator: 12 variants (dome/towers/clock/
  // balustrade × stone × height), 2×2 SW-anchored blocks
  for (let i = 0; i < 4; i++) set(`lm_grand${i}`, grandTile(360 + i, i), 3, 3, true);
  // generic skyscraper heroes: tall towers (slim tower + plaza) on a 3×3 frame,
  // for notable tall buildings — the 3×3 canvas gives the height to TOWER
  for (let i = 0; i < 4; i++) set(`lm_sky${i}`, skyscraperHeroTile(370 + i, i), 3, 3, true);
  set('lm_gherkin', gherkinTile(223));
  set('lm_fortress', fortressTile(215));
  set('lm_bridge', towerBridgeTile(216), 1, 4, true);
  set('lm_stadium', stadiumTile(217), STADIUM_W, STADIUM_H, true);
  set('lm_arena', arenaTile(218));
  set('lm_mall', mallTile(219));
  set('lm_zoo_0', zooTile(220, 0));
  set('lm_zoo_1', zooTile(221, 1));
  set('lm_power', powerstationTile(222), 2, 2, true);
  // Wave 9 heroes (map-overhaul §5)
  set('lm_wembley', wembleyTile(311), WEMBLEY_W, WEMBLEY_H, true);
  set('lm_o2dome', o2domeTile(312), O2_W, O2_H, true);
  set('lm_palacemast', palacemastTile(313));
  set('lm_allypally', allypallyTile(314), 2, 1, true);
  set('lm_excel', excelTile(315), EXCEL_W, EXCEL_H, true);
  set('lm_kewhouse', kewhouseTile(316));
  set('lm_bttower', bttowerTile(317));
  set('lm_heathrow', heathrowTile(318), HEATHROW_W, HEATHROW_H, true);
  // Queen Elizabeth Olympic Park, Stratford (stadium reuses lm_stadium)
  set('lm_velodrome', velodromeTile(321));
  set('lm_orbit', orbitTile(322));
  set('lm_westfield', westfieldTile(323), 2, 2, true);
  // civic fabric
  set('lm_station', stationTile(281));
  set('lm_school', schoolTile(282));
  set('lm_townhall', townhallTile(283));
  // ordinary civic: a tile-sized municipal building in the city palette (no
  // marble grand block, no apron). Four palette variants so a run of civic
  // buildings reads as a varied street, not one sprite tiled.
  for (let i = 0; i < 4; i++) set(`lm_civic${i}`, civicTile(364 + i, i));
  set('lm_watertower', watertowerTile(284));
  set('lm_sewage', sewageTile(285));
  set('lm_carpark', carparkTile(286));
  set('lm_church', churchTile(287));
  set('lm_datacentre', datacentreTile(288));
  set('lm_airport', airportTile(289));
  // network assets (the player's kit)
  set('sub_dist', subDistTile(181));
  set('sub_grid', subGridTile(182));
  set('sub_bulk', subBulkTile(183), 2, 2);
  set('sub_pole', subPoleTile(184));
  set('sub_vault', subVaultTile(185));
  set('sub_capbank', capBankTile(186));
  set('gen_gas', gasPlantTile(191));
  set('gen_peaker', gasPeakerTile(199));
  set('gen_coal', coalPlantTile(291), 4, 3);
  set('gen_nuclear', nuclearTile(192), 3, 2);
  set('gen_windon', windTurbineTile(193, false));
  set('gen_windoff', windTurbineTile(194, true));
  set('gen_solar', solarFarmTile(195));
  set('gen_tidal', tidalTile(231));
  set('gen_hydro', damTile(233), 2, 2);
  set('gen_biomass', biomassTile(232));
  set('gen_battery', batteryTile(196));
  set('gen_interconnector', interconnectorTile(246));
  set('gen_electrolyser', electrolyserTile(247));
  set('depot', depotTile(197));
  set('van', vanTile(198));
  set('pylon_400', pylon400Tile(241));
  set('pylon_132', pylon132Tile(242));
  set('pole_33', pole33Tile(243));
  // construction-site variants by build-progress quartile (#43): the
  // MapRenderer picks construction_0..3 from the remaining lead-time;
  // 'construction' stays as the late/default alias for any caller that
  // doesn't know the stage.
  set('construction', constructionTile(244, 3));
  for (let s = 0; s < 4; s++) set(`construction_${s}`, constructionTile(244, s));
  // BESPOKE per-city heroes do NOT bake into this shared sheet anymore (W2b) —
  // they go to their own tight buffers via buildHeroBufs(), so 100 heroes/city
  // can't overflow the 4096 packer. (Keeping them here capped the city at a
  // handful: 2 already pushed Paris to 4014/4096.)
  return m;
}

/** GPU texture ceiling: the shelf packer must stay within this square. */
const MAX_SHEET = 4096;

interface FreeRect { x: number; y: number; w: number; h: number }

/** MaxRects bin packer (Best-Short-Side-Fit). Maintains a list of maximal
 *  free rectangles and places each sprite in the free rect whose leftover
 *  short side is smallest, then splits + prunes. Reliably ~95% dense — it
 *  fits the multi-tile Wave-9 heroes (incl. the Heathrow island) under the
 *  4096px mobile-GPU ceiling where the old single-row shelf packer (which
 *  wasted the gap under every short sprite) could not. Deterministic: rects
 *  packed largest-first with a name tiebreak, ties broken by lowest y then
 *  leftmost, so the layout is stable across runs. */
function packMaxRects(
  order: Array<[string, Cell]>,
  binW: number,
  binH: number,
): { width: number; height: number; frames: Map<string, AtlasFrame> } | undefined {
  const frames = new Map<string, AtlasFrame>();
  const free: FreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }];
  let usedW = 0;
  let usedH = 0;

  // Bottom-Left placement (robust MaxRects rule): the free rect that puts
  // the sprite's TOP edge lowest, ties → leftmost, ties → tightest fit. BL
  // rarely fails the way Best-Short-Side-Fit can fragment.
  const place = (w: number, h: number): { x: number; y: number } | undefined => {
    let best: { x: number; y: number; top: number; fit: number } | undefined;
    for (const fr of free) {
      if (fr.w < w || fr.h < h) continue;
      const top = fr.y + h;
      const fit = Math.min(fr.w - w, fr.h - h);
      if (
        !best ||
        top < best.top ||
        (top === best.top && fr.x < best.x) ||
        (top === best.top && fr.x === best.x && fit < best.fit)
      ) {
        best = { x: fr.x, y: fr.y, top, fit };
      }
    }
    return best ? { x: best.x, y: best.y } : undefined;
  };

  const splitFree = (placed: FreeRect): void => {
    const next: FreeRect[] = [];
    for (const fr of free) {
      // no overlap → keep
      if (
        placed.x >= fr.x + fr.w ||
        placed.x + placed.w <= fr.x ||
        placed.y >= fr.y + fr.h ||
        placed.y + placed.h <= fr.y
      ) {
        next.push(fr);
        continue;
      }
      // split fr into up to four maximal rects around the placed rect
      if (placed.x > fr.x) next.push({ x: fr.x, y: fr.y, w: placed.x - fr.x, h: fr.h });
      if (placed.x + placed.w < fr.x + fr.w) next.push({ x: placed.x + placed.w, y: fr.y, w: fr.x + fr.w - (placed.x + placed.w), h: fr.h });
      if (placed.y > fr.y) next.push({ x: fr.x, y: fr.y, w: fr.w, h: placed.y - fr.y });
      if (placed.y + placed.h < fr.y + fr.h) next.push({ x: fr.x, y: placed.y + placed.h, w: fr.w, h: fr.y + fr.h - (placed.y + placed.h) });
    }
    // prune: drop any free rect fully contained in another
    free.length = 0;
    for (let i = 0; i < next.length; i++) {
      const a = next[i]!;
      let contained = false;
      for (let j = 0; j < next.length; j++) {
        if (i === j) continue;
        const b = next[j]!;
        if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
          // tie: keep the earlier index to stay deterministic
          if (a.w === b.w && a.h === b.h && a.x === b.x && a.y === b.y && j > i) continue;
          contained = true;
          break;
        }
      }
      if (!contained) free.push(a);
    }
  };

  for (const [name, cell] of order) {
    const pos = place(cell.w, cell.h);
    if (!pos) return undefined; // doesn't fit this bin
    frames.set(name, { x: pos.x, y: pos.y, w: cell.w, h: cell.h, ox: cell.ox, oy: cell.oy, headroom: cell.headroom });
    splitFree({ x: pos.x, y: pos.y, w: cell.w, h: cell.h });
    if (pos.x + cell.w > usedW) usedW = pos.x + cell.w;
    if (pos.y + cell.h > usedH) usedH = pos.y + cell.h;
  }
  return { width: usedW, height: usedH, frames };
}

export function buildAtlas(): SpriteAtlas {
  const cells = buildSpriteCells();
  // largest-area first (max-side then name tiebreak) — the standard MaxRects
  // feed order; deterministic.
  const order = [...cells.entries()].sort((a, b) => {
    const aa = a[1].w * a[1].h;
    const bb = b[1].w * b[1].h;
    if (aa !== bb) return bb - aa;
    const am = Math.max(a[1].w, a[1].h);
    const bm = Math.max(b[1].w, b[1].h);
    if (am !== bm) return bm - am;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  // search bin widths: a narrower bin can pack the tall heroes denser. Pick
  // the layout with the smallest longer side that fits ≤ MAX_SHEET on both
  // axes (the GPU ceiling). Deterministic: fixed width ladder + stable order.
  const widest = order.reduce((m, [, c]) => Math.max(m, c.w), 0);
  let best: ReturnType<typeof packMaxRects> | undefined;
  for (let w = Math.max(2048, widest); w <= MAX_SHEET; w += 128) {
    const packed = packMaxRects(order, w, MAX_SHEET);
    if (!packed || packed.width > MAX_SHEET || packed.height > MAX_SHEET) continue;
    if (!best || Math.max(packed.width, packed.height) < Math.max(best.width, best.height)) {
      best = packed;
    }
  }
  if (!best) throw new Error('sprite atlas overflow: no bin width fits under the 4096px ceiling');
  const { width, height, frames } = best;
  if (height > MAX_SHEET || width > MAX_SHEET) {
    throw new Error(`sprite atlas overflow: ${width}x${height}px`);
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (const [name, cell] of cells) {
    const f = frames.get(name);
    if (!f) continue;
    // copy the trimmed sub-rect: content starts at (ox, oy) in the canvas
    for (let row = 0; row < cell.h; row++) {
      const src = ((cell.oy + row) * cell.stride + cell.ox) * 4;
      const dst = ((f.y + row) * width + f.x) * 4;
      pixels.set(cell.pixels.subarray(src, src + cell.w * 4), dst);
    }
  }
  // bespoke heroes AND per-city domestic stock (WP6) ride their OWN buffers,
  // off this packed sheet (W2b), so neither bloats the ≤4096px shared sheet.
  const heroes = buildHeroBufs();
  for (const [name, buf] of buildCityStockBufs()) heroes.set(name, buf);
  return { width, height, pixels, frames, heroes };
}
