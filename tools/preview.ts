// Renders PNG previews of the sprite atlas and a composited city crop so
// the art can be reviewed without booting the game:
//   npx tsx tools/preview.ts [x0 y0 x1 y1]   → preview/{atlas,city}.png
// Uses the exact same atlas + tile chooser as the renderer.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAtlas } from '../src/render/sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H } from '../src/render/sprites/iso';
import { spriteNameFor } from '../src/render/tileChooser';
import { buildLondonMap } from '../src/data/londonMap';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] ?? 0;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/** Integer box-filter downscale. */
function downscale(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  f: number,
): { img: Uint8ClampedArray; w: number; h: number } {
  if (f <= 1) return { img: rgba, w, h };
  const W = Math.floor(w / f);
  const H = Math.floor(h / f);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const acc = [0, 0, 0, 0];
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * w + x * f + dx) * 4;
          for (let c = 0; c < 4; c++) acc[c] = (acc[c] ?? 0) + (rgba[o + c] ?? 0);
        }
      }
      const oo = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) out[oo + c] = (acc[c] ?? 0) / (f * f);
    }
  }
  return { img: out, w: W, h: H };
}

function main(): void {
  const [x0 = 38, y0 = 56, x1 = 100, y1 = 102, scale = 4] = process.argv.slice(2).map(Number);
  mkdirSync('preview', { recursive: true });

  const atlas = buildAtlas();
  const at = downscale(atlas.pixels, atlas.width, atlas.height, 2);
  writeFileSync('preview/atlas.png', encodePng(at.w, at.h, at.img));
  console.log(`preview/atlas.png  ${at.w}x${at.h}, ${atlas.frames.size} sprites`);

  // composite a city crop in painter order
  const map = buildLondonMap();
  const HW = CELL_W / 2;
  const HH = FLOOR_H / 2;
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  const W = (cols + rows) * HW;
  const H = (cols + rows) * HH + (CELL_H - FLOOR_H);
  const img = new Uint8ClampedArray(W * H * 4);
  // night-sky backdrop
  for (let i = 0; i < W * H; i++) {
    img[i * 4] = 27;
    img[i * 4 + 1] = 20;
    img[i * 4 + 2] = 48;
    img[i * 4 + 3] = 255;
  }
  const originX = rows * HW;
  for (let k = 0; k <= cols + rows - 2; k++) {
    for (let cx = Math.max(0, k - rows + 1); cx <= Math.min(cols - 1, k); cx++) {
      const cy = k - cx;
      const name = spriteNameFor(map, x0 + cx, y0 + cy);
      const frame = atlas.frames.get(name);
      if (!frame) continue;
      const px = originX + (cx - cy) * HW - HW;
      const py = (cx + cy) * HH;
      for (let yy = 0; yy < CELL_H; yy++) {
        for (let xx = 0; xx < CELL_W; xx++) {
          const so = ((frame.y + yy) * atlas.width + frame.x + xx) * 4;
          const sa = (atlas.pixels[so + 3] ?? 0) / 255;
          if (sa <= 0) continue;
          const dx = px + xx;
          const dy = py + yy;
          if (dx < 0 || dx >= W || dy < 0 || dy >= H) continue;
          const o = (dy * W + dx) * 4;
          for (let c = 0; c < 3; c++) {
            img[o + c] = (atlas.pixels[so + c] ?? 0) * sa + (img[o + c] ?? 0) * (1 - sa);
          }
          img[o + 3] = 255;
        }
      }
    }
  }
  const sc = downscale(img, W, H, scale);
  writeFileSync('preview/city.png', encodePng(sc.w, sc.h, sc.img));
  console.log(`preview/city.png   tiles (${x0},${y0})–(${x1},${y1}) at ${sc.w}x${sc.h}`);
}

main();
