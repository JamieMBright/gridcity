// Renders the sprite sheet and isometric map mockups to PNG for art
// review. Usage: npx tsx scripts/renderPreview.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { buildLondonMap } from '../src/data/londonMap';
import { buildAtlas, type SpriteAtlas } from '../src/render/sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H } from '../src/render/sprites/iso';
import { spriteNameFor } from '../src/render/tileChooser';
import { encodePng } from './png';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;

// dusk sky gradient backdrop
const SKY_TOP = [58, 43, 80] as const;
const SKY_BOTTOM = [27, 20, 48] as const;

class Canvas {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    public width: number,
    public height: number,
  ) {
    this.pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = SKY_TOP[0] + (SKY_BOTTOM[0] - SKY_TOP[0]) * t;
      const g = SKY_TOP[1] + (SKY_BOTTOM[1] - SKY_TOP[1]) * t;
      const b = SKY_TOP[2] + (SKY_BOTTOM[2] - SKY_TOP[2]) * t;
      for (let x = 0; x < this.width; x++) {
        const o = (y * this.width + x) * 4;
        this.pixels[o] = r;
        this.pixels[o + 1] = g;
        this.pixels[o + 2] = b;
        this.pixels[o + 3] = 255;
      }
    }
  }

  /** Alpha-composite an atlas cell at (dx, dy). */
  blit(atlas: SpriteAtlas, name: string, dx: number, dy: number): void {
    const frame = atlas.frames.get(name);
    if (!frame) throw new Error(`unknown sprite: ${name}`);
    for (let y = 0; y < CELL_H; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= this.height) continue;
      for (let x = 0; x < CELL_W; x++) {
        const tx = dx + x;
        if (tx < 0 || tx >= this.width) continue;
        const s = ((frame.y + y) * atlas.width + frame.x + x) * 4;
        const sa = (atlas.pixels[s + 3] ?? 0) / 255;
        if (sa === 0) continue;
        const d = (ty * this.width + tx) * 4;
        for (let i = 0; i < 3; i++) {
          const sc = atlas.pixels[s + i] ?? 0;
          const dc = this.pixels[d + i] ?? 0;
          this.pixels[d + i] = sc * sa + dc * (1 - sa);
        }
        this.pixels[d + 3] = 255;
      }
    }
  }

  /** Composite the full atlas sheet (for sprite review). */
  blitSheet(atlas: SpriteAtlas): void {
    for (const name of atlas.frames.keys()) {
      const f = atlas.frames.get(name);
      if (f) this.blit(atlas, name, f.x, f.y);
    }
  }

  save(path: string): void {
    writeFileSync(path, encodePng(this.width, this.height, this.pixels));
    console.log(`wrote ${path} (${this.width}x${this.height})`);
  }
}

function renderMapRegion(
  atlas: SpriteAtlas,
  x0: number,
  y0: number,
  w: number,
  h: number,
  path: string,
): void {
  const map = buildLondonMap();
  // bounding box of all cells in the region
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const place = (x: number, y: number): { px: number; py: number } => {
    const cx = (x - y) * HALF_W;
    const cy = (x + y) * HALF_H;
    return { px: cx - HALF_W, py: cy + HALF_H - CELL_H };
  };
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const { px, py } = place(x, y);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px + CELL_W);
      maxY = Math.max(maxY, py + CELL_H);
    }
  }
  const c = new Canvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY));
  // painter order along diagonals
  for (let k = x0 + y0; k <= x0 + w - 1 + (y0 + h - 1); k++) {
    for (let x = Math.max(x0, k - (y0 + h - 1)); x <= Math.min(x0 + w - 1, k - y0); x++) {
      const y = k - x;
      const { px, py } = place(x, y);
      c.blit(atlas, spriteNameFor(map, x, y), Math.round(px - minX), Math.round(py - minY));
    }
  }
  c.save(path);
}

mkdirSync('preview', { recursive: true });
const atlas = buildAtlas();

// 1) Sprite sheet
{
  const c = new Canvas(atlas.width, atlas.height);
  c.blitSheet(atlas);
  c.save('preview/spritesheet.png');
}

// 2) City core close-up (Thames, towers, terraces)
renderMapRegion(atlas, 38, 50, 22, 18, 'preview/city-core.png');

// 3) Suburbia + posh fringe
renderMapRegion(atlas, 20, 26, 22, 18, 'preview/suburbs.png');

// 4) Essex: greenhouses, villages, fields
renderMapRegion(atlas, 138, 32, 26, 20, 'preview/essex.png');

// 5) Wide city view
renderMapRegion(atlas, 28, 40, 48, 44, 'preview/city-wide.png');
