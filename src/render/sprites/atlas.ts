// Builds the master sprite atlas: every named sprite rendered by the
// vector rasterizer into one RGBA sheet, 8 cells per row. The browser
// uploads this to a Pixi texture; the preview tool encodes it to PNG.

import { CELL_H, CELL_W } from './iso';
import {
  cottageTile,
  factoryTile,
  greenhouseTile,
  officeTile,
  semiTile,
  solarFarmTile,
  terraceTile,
  towerTile,
  villaTile,
  warehouseTile,
} from './buildingSprites';
import {
  fieldTile,
  grassTile,
  hillTile,
  parkTile,
  roadTile,
  solarSiteTile,
  treesTile,
  waterTile,
} from './worldSprites';

export interface SpriteAtlas {
  width: number;
  height: number;
  /** RGBA8, row-major. */
  pixels: Uint8ClampedArray<ArrayBuffer>;
  /** Sprite name → top-left pixel of its CELL_W x CELL_H cell. */
  frames: Map<string, { x: number; y: number }>;
}

function buildSpriteCells(): Map<string, Uint8ClampedArray<ArrayBuffer>> {
  const m = new Map<string, Uint8ClampedArray<ArrayBuffer>>();
  // world
  for (let i = 0; i < 4; i++) m.set(`grass_${i}`, grassTile(i + 1));
  for (let i = 0; i < 2; i++) m.set(`field_${i}`, fieldTile(i + 11));
  for (let i = 0; i < 2; i++) m.set(`hill_${i}`, hillTile(i + 21));
  for (let i = 0; i < 3; i++) m.set(`trees_${i}`, treesTile(i + 31));
  for (let i = 0; i < 2; i++) m.set(`park_${i}`, parkTile(i + 41));
  m.set('solarsite_0', solarSiteTile(51));
  for (let mask = 0; mask < 16; mask++) m.set(`water_${mask}`, waterTile(61, mask));
  for (let mask = 0; mask < 16; mask++) m.set(`road_${mask}`, roadTile(71, mask));
  // buildings
  m.set('terrace_0', terraceTile(81, false));
  m.set('terrace_1', terraceTile(82, false));
  m.set('terrace_2', terraceTile(83, true)); // high-street shops
  m.set('terrace_3', terraceTile(84, false));
  for (let i = 0; i < 4; i++) m.set(`semi_${i}`, semiTile(91 + i));
  m.set('villa_0', villaTile(101));
  m.set('villa_1', villaTile(102));
  m.set('tower_0', towerTile(111));
  m.set('tower_1', towerTile(112));
  m.set('office_0', officeTile(121));
  m.set('office_1', officeTile(122));
  m.set('cottage_0', cottageTile(131));
  m.set('cottage_1', cottageTile(132));
  m.set('warehouse_0', warehouseTile(141));
  m.set('factory_0', factoryTile(151));
  m.set('greenhouse_0', greenhouseTile(161));
  m.set('greenhouse_1', greenhouseTile(162));
  m.set('solarfarm_0', solarFarmTile(171));
  return m;
}

export function buildAtlas(): SpriteAtlas {
  const cells = buildSpriteCells();
  const cols = 8;
  const rows = Math.ceil(cells.size / cols);
  const width = cols * CELL_W;
  const height = rows * CELL_H;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const frames = new Map<string, { x: number; y: number }>();

  let cell = 0;
  for (const [name, cellPixels] of cells) {
    const ox = (cell % cols) * CELL_W;
    const oy = Math.floor(cell / cols) * CELL_H;
    frames.set(name, { x: ox, y: oy });
    for (let y = 0; y < CELL_H; y++) {
      const src = y * CELL_W * 4;
      const dst = ((oy + y) * width + ox) * 4;
      pixels.set(cellPixels.subarray(src, src + CELL_W * 4), dst);
    }
    cell++;
  }
  return { width, height, pixels, frames };
}
