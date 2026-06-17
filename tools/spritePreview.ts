// Dev helper: composite a city's bespoke domestic-stock sprites side-by-side on
// a dusk background, so each new archetype can be eyeballed in isolation (the
// in-map crop mixes them with roads/heroes). NOT a test.
//   npx tsx tools/spritePreview.ts <city> <fn:variantCount> ...
// e.g. npx tsx tools/spritePreview.ts sydney sydterraceTile:4 sydbungalowTile:4
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import * as B from '../src/render/sprites/buildingSprites';
import { CELL_W, CELL_H } from '../src/render/sprites/iso';

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
function png(w: number, h: number, rgba: Uint8ClampedArray): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const z = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', z),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

const city = process.argv[2] ?? 'sydney';
const specs = process.argv.slice(3);
(B as unknown as { applyCityFabric(c: string): void }).applyCityFabric(city);
const fns = B as unknown as Record<string, (seed: number, variant: number) => Uint8ClampedArray<ArrayBuffer>>;
const tiles: Uint8ClampedArray<ArrayBuffer>[] = [];
let seed = 411;
for (const spec of specs) {
  const [fn, n] = spec.split(':');
  const count = Number(n ?? 1);
  const f = fns[fn!];
  if (!f) throw new Error(`no sprite fn ${fn}`);
  for (let i = 0; i < count; i++) tiles.push(f(seed++, i));
}
const cols = Math.min(4, tiles.length);
const rows = Math.ceil(tiles.length / cols);
const W = cols * CELL_W;
const Hh = rows * CELL_H;
const out = new Uint8ClampedArray(W * Hh * 4);
for (let i = 0; i < out.length; i += 4) {
  out[i] = 22;
  out[i + 1] = 18;
  out[i + 2] = 40;
  out[i + 3] = 255;
}
tiles.forEach((t, idx) => {
  const cx = (idx % cols) * CELL_W;
  const cy = Math.floor(idx / cols) * CELL_H;
  const th = t.length / 4 / CELL_W;
  for (let y = 0; y < th; y++)
    for (let x = 0; x < CELL_W; x++) {
      const a = t[(y * CELL_W + x) * 4 + 3] ?? 0;
      if (a > 0) {
        const dy = cy + (CELL_H - th) + y;
        const di = (dy * W + cx + x) * 4;
        const sa = a / 255;
        for (let c = 0; c < 3; c++)
          out[di + c] = Math.round((t[(y * CELL_W + x) * 4 + c] ?? 0) * sa + (out[di + c] ?? 0) * (1 - sa));
        out[di + 3] = 255;
      }
    }
});
mkdirSync('preview', { recursive: true });
writeFileSync(`preview/sprite_${city}.png`, png(W, Hh, out));
console.log(`wrote preview/sprite_${city}.png ${W}x${Hh} (${tiles.length} tiles)`);
