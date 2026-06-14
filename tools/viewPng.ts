// Quick downscaler so the huge full-res city renders are viewable for design
// review. Our encoder always writes 8-bit RGBA with filter-type 0 (none), so
// decoding our own PNGs is just: parse IHDR, concat IDAT, inflate, drop the
// per-row filter byte. Box-downsample, re-encode.  preview only — not committed.
//
//   npx tsx tools/viewPng.ts preview/seeded-newyork.png 4   → *-sm.png (1/4)

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, Buffer.from(data), crc]);
}
function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function decode(file: string): { w: number; h: number; rgba: Uint8Array } {
  const buf = readFileSync(file);
  let p = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('only 8-bit RGBA supported');
    } else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    if (f !== 0) throw new Error(`row ${y} uses filter ${f} (only "none" supported)`);
    rgba.set(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride), y * stride);
  }
  return { w, h, rgba };
}

function box(rgba: Uint8Array, w: number, h: number, f: number): { img: Uint8Array; w: number; h: number } {
  const W = Math.floor(w / f);
  const H = Math.floor(h / f);
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < f; dy++)
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * w + x * f + dx) * 4;
          r += rgba[o]!; g += rgba[o + 1]!; b += rgba[o + 2]!; a += rgba[o + 3]!;
        }
      const oo = (y * W + x) * 4;
      const n = f * f;
      out[oo] = r / n; out[oo + 1] = g / n; out[oo + 2] = b / n; out[oo + 3] = a / n;
    }
  return { img: out, w: W, h: H };
}

const src = process.argv[2]!;
const f = Number(process.argv[3] ?? 4);
const { w, h, rgba } = decode(src);
const d = box(rgba, w, h, f);
const out = src.replace(/\.png$/, '-sm.png');
writeFileSync(out, encodePng(d.w, d.h, d.img));
console.log(`${out}  ${d.w}x${d.h}`);
