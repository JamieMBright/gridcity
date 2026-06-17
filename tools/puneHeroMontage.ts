// Render a montage of Pune's bespoke hero sprites to a PNG for the design-gate.
//   npx tsx tools/puneHeroMontage.ts [page]
// Lays every hero_pune_<key> buffer on a dusk-navy grid so the silhouettes can
// be critiqued for distinctness + recognisability. Pages of 30 keep it sharp.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAtlas } from '../src/render/sprites/atlas';
import { applyCityFabric } from '../src/render/sprites/buildingSprites';
import { bespokeHeroesFor, frameIdFor } from '../src/render/sprites/heroes/registry';

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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ] as unknown as Uint8Array[]);
}

function main(): void {
  applyCityFabric('pune');
  const atlas = buildAtlas();
  const heroes = bespokeHeroesFor('pune');
  const page = Math.max(0, Number(process.argv[2]) || 0);
  const PER = 30;
  const slice = heroes.slice(page * PER, page * PER + PER);
  if (slice.length === 0) {
    console.log('no heroes on page', page);
    return;
  }
  const cols = 6;
  const cellW = 230;
  const cellH = 230;
  const rows = Math.ceil(slice.length / cols);
  const W = cols * cellW;
  const H = rows * cellH;
  const img = new Uint8ClampedArray(W * H * 4);
  // dusk-navy background
  for (let i = 0; i < W * H; i++) {
    img[i * 4] = 24;
    img[i * 4 + 1] = 22;
    img[i * 4 + 2] = 44;
    img[i * 4 + 3] = 255;
  }
  slice.forEach((hero, idx) => {
    const id = frameIdFor('pune', hero.key);
    const hb = atlas.heroes.get(id);
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const cx0 = c * cellW;
    const cy0 = r * cellH;
    if (!hb) return;
    // fit the buffer into the cell (downscale if needed), bottom-aligned
    const pad = 14;
    const availW = cellW - pad * 2;
    const availH = cellH - pad * 2 - 12;
    const s = Math.min(1, availW / hb.w, availH / hb.h);
    const dw = Math.round(hb.w * s);
    const dh = Math.round(hb.h * s);
    const ox = cx0 + Math.round((cellW - dw) / 2);
    const oy = cy0 + (cellH - 12) - dh; // bottom align (sky above)
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const sx = Math.min(hb.w - 1, Math.floor(xx / s));
        const sy = Math.min(hb.h - 1, Math.floor(yy / s));
        const so = (sy * hb.w + sx) * 4;
        const sa = (hb.pixels[so + 3] ?? 0) / 255;
        if (sa <= 0) continue;
        const dx = ox + xx;
        const dy = oy + yy;
        if (dx < 0 || dx >= W || dy < 0 || dy >= H) continue;
        const o = (dy * W + dx) * 4;
        img[o] = (hb.pixels[so] ?? 0) * sa + (img[o] ?? 0) * (1 - sa);
        img[o + 1] = (hb.pixels[so + 1] ?? 0) * sa + (img[o + 1] ?? 0) * (1 - sa);
        img[o + 2] = (hb.pixels[so + 2] ?? 0) * sa + (img[o + 2] ?? 0) * (1 - sa);
        img[o + 3] = 255;
      }
    }
  });
  mkdirSync('preview', { recursive: true });
  const out = `preview/pune-heroes-p${page}.png`;
  writeFileSync(out, encodePng(W, H, img));
  console.log(`${out}  ${W}x${H}  (${slice.length} heroes, page ${page})`);
}
main();
