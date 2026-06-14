// Renders a contact sheet of every London hero landmark sprite onto one dusk
// PNG, so the whole set can be design-reviewed at a glance:
//   npx tsx tools/landmarkSheet.ts → preview/landmarks.png
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAtlas } from '../src/render/sprites/atlas';

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
function encodePng(w: number, h: number, rgba: Uint8ClampedArray): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

// London heroes, reading order (named landmarks; skips generic civic fabric).
const HEROES = [
  'lm_parliament', 'lm_bridge', 'lm_dome', 'lm_spire', 'lm_gherkin',
  'lm_fortress', 'lm_eye', 'lm_o2dome', 'lm_wembley', 'lm_stadium',
  'lm_excel', 'lm_arena', 'lm_mall', 'lm_bttower', 'lm_allypally',
  'lm_kewhouse', 'lm_velodrome', 'lm_orbit', 'lm_westfield', 'lm_palacemast',
  'lm_heathrow', 'lm_power',
];

function main(): void {
  mkdirSync('preview', { recursive: true });
  const atlas = buildAtlas();
  const COLS = 5;
  const CW = 340;
  const CH = 360;
  const PAD = 16;
  const rows = Math.ceil(HEROES.length / COLS);
  const W = COLS * CW;
  const H = rows * CH;
  const img = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    img[i * 4] = 24;
    img[i * 4 + 1] = 18;
    img[i * 4 + 2] = 44;
    img[i * 4 + 3] = 255;
  }
  HEROES.forEach((name, idx) => {
    const f = atlas.frames.get(name);
    if (!f) {
      console.warn(`missing frame: ${name}`);
      return;
    }
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const maxW = CW - 2 * PAD;
    const maxH = CH - 2 * PAD;
    const s = Math.min(maxW / f.w, maxH / f.h, 1);
    const dw = Math.round(f.w * s);
    const dh = Math.round(f.h * s);
    const ox = col * CW + Math.round((CW - dw) / 2);
    const oy = row * CH + (CH - PAD - dh); // bottom-anchored on a baseline
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const sx = f.x + Math.min(f.w - 1, Math.floor(xx / s));
        const sy = f.y + Math.min(f.h - 1, Math.floor(yy / s));
        const so = (sy * atlas.width + sx) * 4;
        const a = (atlas.pixels[so + 3] ?? 0) / 255;
        if (a <= 0) continue;
        const dx = ox + xx;
        const dy = oy + yy;
        if (dx < 0 || dx >= W || dy < 0 || dy >= H) continue;
        const o = (dy * W + dx) * 4;
        img[o] = (atlas.pixels[so] ?? 0) * a + (img[o] ?? 0) * (1 - a);
        img[o + 1] = (atlas.pixels[so + 1] ?? 0) * a + (img[o + 1] ?? 0) * (1 - a);
        img[o + 2] = (atlas.pixels[so + 2] ?? 0) * a + (img[o + 2] ?? 0) * (1 - a);
      }
    }
  });
  writeFileSync('preview/landmarks.png', encodePng(W, H, img));
  console.log(`preview/landmarks.png ${W}x${H} — ${HEROES.length} heroes`);
}
main();
