// Builds the master sprite atlas: every named sprite rendered by the
// vector rasterizer into one RGBA sheet. Sprites are variable-sized now
// (multi-tile plant like the coal station), so cells carry their own
// dimensions and a simple shelf packer lays the sheet out. The browser
// uploads this to a Pixi texture; the preview tool encodes it to PNG.

import { isoDims, swAnchorDims } from './iso';
import {
  cottageTile,
  councilflatTile,
  factoryTile,
  georgianTile,
  greenhouseTile,
  newbuildTile,
  officeTile,
  semiTile,
  solarFarmTile,
  terraceTile,
  towerTile,
  vicshopTile,
  victerraceTile,
  villaTile,
  warehouseTile,
} from './buildingSprites';
import {
  airportTile,
  arenaTile,
  carparkTile,
  churchTile,
  datacentreTile,
  domeTile,
  eyeTile,
  fortressTile,
  gherkinTile,
  mallTile,
  parliamentTile,
  powerstationTile,
  schoolTile,
  sewageTile,
  skyscraperTile,
  spireTile,
  stadiumTile,
  stationTile,
  towerBridgeTile,
  townhallTile,
  watertowerTile,
  zooTile,
} from './landmarkSprites';
import {
  batteryTile,
  biomassTile,
  coalPlantTile,
  constructionTile,
  depotTile,
  gasPeakerTile,
  gasPlantTile,
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

export interface SpriteAtlas {
  width: number;
  height: number;
  /** RGBA8, row-major. */
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Sprite name → its rectangle on the sheet. */
  frames: Map<string, { x: number; y: number; w: number; h: number }>;
}

interface Cell {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Frame size on the sheet (transparent right/bottom margins trimmed). */
  w: number;
  h: number;
  /** Row stride of `pixels` (the sprite's full canvas width). */
  stride: number;
}

/** Sprites are placed by their top-left corner in both renderers, so
 *  fully-transparent right columns and bottom rows can be dropped from
 *  the registered frame without moving a single pixel. Keeps the sheet
 *  under the 4096px mobile-GPU ceiling as landmarks grow multi-tile. */
function trimmedExtent(pixels: Uint8ClampedArray, w: number, h: number): { w: number; h: number } {
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = w - 1; x >= 0; x--) {
      if ((pixels[(y * w + x) * 4 + 3] ?? 0) > 0) {
        if (x > maxX) maxX = x;
        maxY = y;
        break;
      }
    }
  }
  return { w: Math.min(w, maxX + 2), h: Math.min(h, maxY + 2) };
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
    // dims mirror the Iso constructor (sw = SW-anchored landmark blocks)
    const dims = sw ? swAnchorDims(wTiles, hTiles) : isoDims(wTiles, hTiles);
    m.set(name, { pixels, ...trimmedExtent(pixels, dims.w, dims.h), stride: dims.w });
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
  set('tower_0', towerTile(111));
  set('tower_1', towerTile(112));
  set('office_0', officeTile(121));
  set('office_1', officeTile(122));
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
  set('lm_gherkin', gherkinTile(223));
  set('lm_fortress', fortressTile(215));
  set('lm_bridge', towerBridgeTile(216), 1, 4, true);
  set('lm_stadium', stadiumTile(217));
  set('lm_arena', arenaTile(218));
  set('lm_mall', mallTile(219));
  set('lm_zoo_0', zooTile(220, 0));
  set('lm_zoo_1', zooTile(221, 1));
  set('lm_power', powerstationTile(222), 2, 2, true);
  // civic fabric
  set('lm_station', stationTile(281));
  set('lm_school', schoolTile(282));
  set('lm_townhall', townhallTile(283));
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
  set('gen_gas', gasPlantTile(191));
  set('gen_peaker', gasPeakerTile(199));
  set('gen_coal', coalPlantTile(291), 3, 2);
  set('gen_nuclear', nuclearTile(192), 3, 2);
  set('gen_windon', windTurbineTile(193, false));
  set('gen_windoff', windTurbineTile(194, true));
  set('gen_solar', solarFarmTile(195));
  set('gen_tidal', tidalTile(231));
  set('gen_biomass', biomassTile(232));
  set('gen_battery', batteryTile(196));
  set('depot', depotTile(197));
  set('van', vanTile(198));
  set('pylon_400', pylon400Tile(241));
  set('pylon_132', pylon132Tile(242));
  set('pole_33', pole33Tile(243));
  set('construction', constructionTile(244));
  return m;
}

/** GPU texture ceiling: the shelf packer must stay within this square. */
const MAX_SHEET = 4096;

export function buildAtlas(): SpriteAtlas {
  const cells = buildSpriteCells();
  // shelf packing: tallest first so each shelf holds near-equal heights
  // (stable + name tiebreak keeps the layout deterministic)
  const order = [...cells.entries()].sort(
    (a, b) => b[1].h - a[1].h || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const frames = new Map<string, { x: number; y: number; w: number; h: number }>();
  let x = 0;
  let y = 0;
  let shelfH = 0;
  let usedW = 0;
  for (const [name, cell] of order) {
    if (x + cell.w > MAX_SHEET) {
      y += shelfH;
      x = 0;
      shelfH = 0;
    }
    frames.set(name, { x, y, w: cell.w, h: cell.h });
    x += cell.w;
    if (cell.h > shelfH) shelfH = cell.h;
    if (x > usedW) usedW = x;
  }
  const width = usedW;
  const height = y + shelfH;
  if (height > MAX_SHEET) throw new Error(`sprite atlas overflow: ${height}px tall`);

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (const [name, cell] of cells) {
    const f = frames.get(name);
    if (!f) continue;
    for (let row = 0; row < cell.h; row++) {
      const src = row * cell.stride * 4;
      const dst = ((f.y + row) * width + f.x) * 4;
      pixels.set(cell.pixels.subarray(src, src + cell.w * 4), dst);
    }
  }
  return { width, height, pixels, frames };
}
