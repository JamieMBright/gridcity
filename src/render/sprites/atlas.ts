// Builds the master sprite atlas: every named sprite decoded from its char
// grid into one RGBA sheet, 16 sprites per row. The browser uploads this to
// a Pixi texture; the preview tool encodes it straight to PNG.

import { hexToRgb, PALETTE } from './palette';
import { TILE } from './spriteBuilder';
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
  /** Sprite name → top-left pixel of its 32x32 cell. */
  frames: Map<string, { x: number; y: number }>;
}

function buildSpriteGrids(): Map<string, string[]> {
  const m = new Map<string, string[]>();
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
  m.set('terrace_0', terraceTile(81, 'b', 's'));
  m.set('terrace_1', terraceTile(82, 'b', 'l'));
  m.set('terrace_2', terraceTile(83, 'c', 's'));
  m.set('terrace_3', terraceTile(84, 'b', 'l'));
  m.set('semi_0', semiTile(91, 'b'));
  m.set('semi_1', semiTile(92, 'c'));
  m.set('semi_2', semiTile(93, 'b'));
  m.set('semi_3', semiTile(94, 'c'));
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
  const grids = buildSpriteGrids();
  const cols = 16;
  const rows = Math.ceil(grids.size / cols);
  const width = cols * TILE;
  const height = rows * TILE;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const frames = new Map<string, { x: number; y: number }>();

  let cell = 0;
  for (const [name, grid] of grids) {
    const ox = (cell % cols) * TILE;
    const oy = Math.floor(cell / cols) * TILE;
    frames.set(name, { x: ox, y: oy });
    for (let y = 0; y < TILE; y++) {
      const row = grid[y] ?? '';
      for (let x = 0; x < TILE; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        const hex = PALETTE[ch];
        if (!hex) throw new Error(`sprite ${name} uses unknown palette char '${ch}'`);
        const [r, g, b] = hexToRgb(hex);
        const o = ((oy + y) * width + ox + x) * 4;
        pixels[o] = r;
        pixels[o + 1] = g;
        pixels[o + 2] = b;
        pixels[o + 3] = 255;
      }
    }
    cell++;
  }
  return { width, height, pixels, frames };
}
