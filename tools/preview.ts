// Renders PNG previews of the sprite atlas and a composited city crop so
// the art can be reviewed without booting the game:
//   npx tsx tools/preview.ts [x0 y0 x1 y1 [scale [name]]] → preview/{atlas,<name|city>}.png
//   npx tsx tools/preview.ts sprite <name...>             → preview/sprite_<name>.png
// Composites ground → smoothed shoreline → transport ribbons → structures,
// in the renderer's painter order. The shoreline + ribbon geometry comes
// from the SAME shared emitters the game renderer uses (routeRibbons /
// shoreline), rasterised here in software — so the art-review loop is
// never blind to transport. The zoom band is derived from the downscale
// factor exactly like the in-game camera scale (s = 1/scale).

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAtlas, type SpriteAtlas } from '../src/render/sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H } from '../src/render/sprites/iso';
import { emitRouteRibbons, zoomKeyFor } from '../src/render/routeRibbons';
import { emitShoreline } from '../src/render/shoreline';
import { groundSpriteFor, structureSpriteFor } from '../src/render/tileChooser';
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

/** Alpha-blend one atlas frame onto the canvas at (px, py). */
function blit(
  atlas: SpriteAtlas,
  name: string,
  img: Uint8ClampedArray,
  W: number,
  H: number,
  px: number,
  py: number,
): void {
  const frame = atlas.frames.get(name);
  if (!frame) return;
  for (let yy = 0; yy < frame.h; yy++) {
    for (let xx = 0; xx < frame.w; xx++) {
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

/** Software polygon rasteriser: non-zero-winding scanline fill with alpha
 *  blending — the Node-side twin of Graphics.poly().fill(). Sampled at
 *  pixel centres; the box-filter downscale supplies the anti-aliasing. */
function fillPoly(
  img: Uint8ClampedArray,
  W: number,
  H: number,
  pts: number[],
  color: number,
  alphaV: number,
): void {
  const n = pts.length >> 1;
  if (n < 3) return;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const y = pts[i * 2 + 1] ?? 0;
    const x = pts[i * 2] ?? 0;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (maxY < 0 || minY >= H || maxX < 0 || minX >= W) return;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const y0 = Math.max(0, Math.ceil(minY - 0.5));
  const y1 = Math.min(H - 1, Math.floor(maxY - 0.5) + 1);
  const xs: number[] = [];
  const ws: number[] = [];
  for (let py = y0; py <= y1; py++) {
    const yc = py + 0.5;
    xs.length = 0;
    ws.length = 0;
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2] ?? 0;
      const ay = pts[i * 2 + 1] ?? 0;
      const bx = pts[((i + 1) % n) * 2] ?? 0;
      const by = pts[((i + 1) % n) * 2 + 1] ?? 0;
      if (ay <= yc && by > yc) {
        xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        ws.push(1);
      } else if (by <= yc && ay > yc) {
        xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        ws.push(-1);
      }
    }
    if (xs.length === 0) continue;
    const order = xs.map((_, i) => i).sort((a2, b2) => (xs[a2] ?? 0) - (xs[b2] ?? 0));
    let wind = 0;
    for (let k = 0; k + 1 < order.length; k++) {
      const ix = order[k];
      const jx = order[k + 1];
      if (ix === undefined || jx === undefined) continue;
      wind += ws[ix] ?? 0;
      if (wind === 0) continue;
      const sx = Math.max(0, Math.ceil((xs[ix] ?? 0) - 0.5));
      const ex = Math.min(W - 1, Math.floor((xs[jx] ?? 0) - 0.5));
      for (let px = sx; px <= ex; px++) {
        const o = (py * W + px) * 4;
        img[o] = r * alphaV + (img[o] ?? 0) * (1 - alphaV);
        img[o + 1] = g * alphaV + (img[o + 1] ?? 0) * (1 - alphaV);
        img[o + 2] = b * alphaV + (img[o + 2] ?? 0) * (1 - alphaV);
        img[o + 3] = 255;
      }
    }
  }
}

function dumpSprites(atlas: SpriteAtlas, names: string[]): void {
  for (const name of names) {
    const f = atlas.frames.get(name);
    if (!f) {
      console.error(`no such sprite: ${name}`);
      continue;
    }
    const img = new Uint8ClampedArray(f.w * f.h * 4);
    // dusk backdrop so transparent floors read clearly
    for (let i = 0; i < f.w * f.h; i++) {
      img[i * 4] = 27;
      img[i * 4 + 1] = 20;
      img[i * 4 + 2] = 48;
      img[i * 4 + 3] = 255;
    }
    blit(atlas, name, img, f.w, f.h, 0, 0);
    writeFileSync(`preview/sprite_${name}.png`, encodePng(f.w, f.h, img));
    console.log(`preview/sprite_${name}.png  ${f.w}x${f.h}`);
  }
}

function main(): void {
  mkdirSync('preview', { recursive: true });
  const atlas = buildAtlas();

  if (process.argv[2] === 'sprite') {
    dumpSprites(atlas, process.argv.slice(3));
    return;
  }

  const args = process.argv.slice(2);
  const [x0 = 38, y0 = 56, x1 = 100, y1 = 102, scale = 4] = args.slice(0, 5).map(Number);
  const outName = args[5] && Number.isNaN(Number(args[5])) ? args[5] : 'city';
  const at = downscale(atlas.pixels, atlas.width, atlas.height, 2);
  writeFileSync('preview/atlas.png', encodePng(at.w, at.h, at.img));
  console.log(`preview/atlas.png  ${at.w}x${at.h}, ${atlas.frames.size} sprites`);

  // composite a city crop in the renderer's painter order:
  // ground → shoreline → transport ribbons → structures
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
  const tilePass = (pass: 'ground' | 'structure'): void => {
    for (let k = 0; k <= cols + rows - 2; k++) {
      for (let cx = Math.max(0, k - rows + 1); cx <= Math.min(cols - 1, k); cx++) {
        const cy = k - cx;
        const name =
          pass === 'ground'
            ? groundSpriteFor(map, x0 + cx, y0 + cy)
            : structureSpriteFor(map, x0 + cx, y0 + cy);
        if (!name) continue;
        const px = originX + (cx - cy) * HW - HW;
        const py = (cx + cy) * HH;
        blit(atlas, name, img, W, H, px, py);
      }
    }
  };
  tilePass('ground');

  // the transport vector layer — same emitters as the game renderer.
  // World scale equivalent of this crop: tile = 256/scale screen px.
  const sEff = 1 / scale;
  const key = zoomKeyFor(sEff);
  const offX = originX - (x0 - y0) * HW;
  const offY = CELL_H - HH - (x0 + y0) * HH;
  const shift = (pts: number[]): number[] => {
    const out = new Array<number>(pts.length);
    for (let i = 0; i < pts.length; i += 2) {
      out[i] = (pts[i] ?? 0) + offX;
      out[i + 1] = (pts[i + 1] ?? 0) + offY;
    }
    return out;
  };
  // clip to the crop's tile rect so geometry beyond the painted diamond
  // doesn't smear over the backdrop
  const inCrop = (pts: number[]): boolean => {
    for (let i = 0; i < pts.length; i += 2) {
      const wx = pts[i] ?? 0;
      const wy = pts[i + 1] ?? 0;
      const u = (wx / HW + wy / HH) / 2;
      const v = (wy / HH - wx / HW) / 2;
      if (u >= x0 - 1.2 && u <= x1 + 1.2 && v >= y0 - 1.2 && v <= y1 + 1.2) return true;
    }
    return false;
  };
  emitShoreline(map, (pts, color, alpha) => {
    if (inCrop(pts)) fillPoly(img, W, H, shift(pts), color, alpha);
  });
  const bridgeTop: Array<{ pts: number[]; color: number; alpha: number }> = [];
  emitRouteRibbons(map, { band: key.band, scale: sEff }, (pts, color, alpha, layer) => {
    if (!inCrop(pts)) return;
    if (layer === 'bridgeTop') bridgeTop.push({ pts: shift(pts), color, alpha });
    else fillPoly(img, W, H, shift(pts), color, alpha);
  });
  for (const p of bridgeTop) fillPoly(img, W, H, p.pts, p.color, p.alpha);
  console.log(`transport: zoom band Z${key.band} (s=${sEff.toFixed(3)})`);

  tilePass('structure');
  const sc = downscale(img, W, H, scale);
  writeFileSync(`preview/${outName}.png`, encodePng(sc.w, sc.h, sc.img));
  console.log(`preview/${outName}.png   tiles (${x0},${y0})–(${x1},${y1}) at ${sc.w}x${sc.h}`);
}

main();
