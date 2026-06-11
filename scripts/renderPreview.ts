// Renders the sprite sheet and map mockups to PNG for art review.
// Usage: npx tsx scripts/renderPreview.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { buildLondonMap } from '../src/data/londonMap';
import { buildAtlas, type SpriteAtlas } from '../src/render/sprites/atlas';
import { TILE } from '../src/render/sprites/spriteBuilder';
import { spriteNameFor } from '../src/render/tileChooser';
import { hexToRgb } from '../src/render/sprites/palette';
import { encodePng } from './png';

const NAVY = hexToRgb('#101630');

class Canvas {
  pixels: Uint8ClampedArray;
  constructor(
    public width: number,
    public height: number,
  ) {
    this.pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      this.pixels[i * 4] = NAVY[0];
      this.pixels[i * 4 + 1] = NAVY[1];
      this.pixels[i * 4 + 2] = NAVY[2];
      this.pixels[i * 4 + 3] = 255;
    }
  }

  blit(atlas: SpriteAtlas, name: string, dx: number, dy: number): void {
    const frame = atlas.frames.get(name);
    if (!frame) throw new Error(`unknown sprite: ${name}`);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const s = ((frame.y + y) * atlas.width + frame.x + x) * 4;
        if ((atlas.pixels[s + 3] ?? 0) === 0) continue;
        const d = ((dy + y) * this.width + dx + x) * 4;
        this.pixels[d] = this.pixels[d] = atlas.pixels[s] ?? 0;
        this.pixels[d + 1] = atlas.pixels[s + 1] ?? 0;
        this.pixels[d + 2] = atlas.pixels[s + 2] ?? 0;
        this.pixels[d + 3] = 255;
      }
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
  const c = new Canvas(w * TILE, h * TILE);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      c.blit(atlas, spriteNameFor(map, x0 + x, y0 + y), x * TILE, y * TILE);
    }
  }
  c.save(path);
}

mkdirSync('preview', { recursive: true });
const atlas = buildAtlas();

// 1) Sprite sheet, 4x scale for inspection
{
  const scale = 4;
  const c = new Canvas(atlas.width * scale, atlas.height * scale);
  for (let y = 0; y < atlas.height; y++) {
    for (let x = 0; x < atlas.width; x++) {
      const s = (y * atlas.width + x) * 4;
      if ((atlas.pixels[s + 3] ?? 0) === 0) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const d = ((y * scale + dy) * c.width + x * scale + dx) * 4;
          c.pixels[d] = atlas.pixels[s] ?? 0;
          c.pixels[d + 1] = atlas.pixels[s + 1] ?? 0;
          c.pixels[d + 2] = atlas.pixels[s + 2] ?? 0;
          c.pixels[d + 3] = 255;
        }
      }
    }
  }
  c.save('preview/spritesheet.png');
}

// 2) City core close-up (40x28 tiles around the Thames)
renderMapRegion(atlas, 30, 44, 40, 28, 'preview/city-core.png');

// 3) Essex: greenhouses, villages, solar sites, nuclear coast
renderMapRegion(atlas, 128, 28, 60, 40, 'preview/essex.png');

// 4) Posh district and suburbs
renderMapRegion(atlas, 16, 22, 40, 28, 'preview/suburbs.png');

// 5) Full map
renderMapRegion(atlas, 0, 0, 192, 128, 'preview/full-map.png');
