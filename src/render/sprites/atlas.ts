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
  haussmannTile,
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
  allypallyTile,
  archTile,
  arenaTile,
  bttowerTile,
  carparkTile,
  churchTile,
  datacentreTile,
  domeTile,
  eiffelTile,
  EXCEL_H,
  EXCEL_W,
  excelTile,
  eyeTile,
  fortressTile,
  gherkinTile,
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
}

export interface SpriteAtlas {
  width: number;
  height: number;
  /** RGBA8, row-major. */
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Sprite name → its rectangle on the sheet (+ trim offset). */
  frames: Map<string, AtlasFrame>;
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
  // bespoke Paris stock (Haussmann blocks) — used when CityMap.fabric==='paris'.
  // many variants (height · stone · balconies · shopfronts) so the uniform
  // Parisian street wall still reads as many distinct buildings.
  for (let i = 0; i < 12; i++) set(`haussmann_${i}`, haussmannTile(351 + i, i));
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
  set('lm_notredame', notredameTile(353)); // bespoke Paris gothic cathedral
  set('lm_eiffel', eiffelTile(354), 3, 3, true); // bespoke Paris iron tower (massive)
  set('lm_arch', archTile(355)); // triumphal arch (Arc de Triomphe / gates)
  set('lm_basilica', sacrecoeurTile(356)); // Sacré-Cœur
  set('lm_louvre', louvreTile(357)); // the palace + glass pyramid
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
    frames.set(name, { x: pos.x, y: pos.y, w: cell.w, h: cell.h, ox: cell.ox, oy: cell.oy });
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
  return { width, height, pixels, frames };
}
