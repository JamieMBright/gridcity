// Draw EVERY real OSM building footprint as a blank, textureless extruded mass
// — an evaluation layer to judge the true building fabric of a city before any
// styling (owner, 2026-06-14: "get the real building shapes from OSM and give
// me a textureless drawing of all the buildings as blank objects").
//
//   npx tsx tools/buildingShapes.ts "Paris, France" paris [--span=11] [--scale=4]
//   → preview/shapes-paris.png
//
// Map data © OpenStreetMap contributors (ODbL).

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { geocode } from './osm/nominatim';
import { fetchAllBuildings } from './osm/overpass';
import { projectorFromCentre, type TileProjector } from './osm/project';

const HW = 32; // half tile width in px (iso); HH = HW/2
const HH = 16;

function arg(flag: string, d: number): number {
  const a = process.argv.find((s) => s.startsWith(`--${flag}=`));
  return a ? Number(a.slice(flag.length + 3)) : d;
}

// --- minimal PNG ------------------------------------------------------------
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
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}
function downscale(rgba: Uint8ClampedArray, w: number, h: number, f: number): { img: Uint8ClampedArray; w: number; h: number } {
  if (f <= 1) return { img: rgba, w, h };
  const W = Math.floor(w / f);
  const H = Math.floor(h / f);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const acc = [0, 0, 0, 0];
      for (let dy = 0; dy < f; dy++)
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * w + x * f + dx) * 4;
          for (let c = 0; c < 4; c++) acc[c] = (acc[c] ?? 0) + (rgba[o + c] ?? 0);
        }
      const oo = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) out[oo + c] = (acc[c] ?? 0) / (f * f);
    }
  return { img: out, w: W, h: H };
}

function fillPoly(img: Uint8ClampedArray, W: number, H: number, pts: number[], r: number, g: number, b: number): void {
  const n = pts.length >> 1;
  if (n < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = pts[i * 2 + 1] ?? 0;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.ceil(minY));
  const y1 = Math.min(H - 1, Math.floor(maxY));
  const xs: number[] = [];
  for (let py = y0; py <= y1; py++) {
    const yc = py + 0.5;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2] ?? 0;
      const ay = pts[i * 2 + 1] ?? 0;
      const bx = pts[((i + 1) % n) * 2] ?? 0;
      const by = pts[((i + 1) % n) * 2 + 1] ?? 0;
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(0, Math.ceil((xs[k] ?? 0) - 0.5));
      const ex = Math.min(W - 1, Math.floor((xs[k + 1] ?? 0) - 0.5));
      for (let px = sx; px <= ex; px++) {
        const o = (py * W + px) * 4;
        img[o] = r;
        img[o + 1] = g;
        img[o + 2] = b;
        img[o + 3] = 255;
      }
    }
  }
}

interface Bldg {
  rings: Array<Array<[number, number]>>; // tile-space outer ring(s)
  z: number; // extrusion height in px
  depth: number; // painter sort key (max u+v)
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const id = process.argv[3] ?? 'city';
  if (!query) {
    console.error('usage: npx tsx tools/buildingShapes.ts "<query>" <id> [--span=11] [--scale=4]');
    process.exit(1);
    return;
  }
  const span = arg('span', 11);
  const scale = arg('scale', 4);
  mkdirSync('preview', { recursive: true });
  const g = await geocode(query);
  console.log(`${g.displayName}`);
  const proj: TileProjector = projectorFromCentre(g.centre, span, 256, 160);
  console.log(`Fetching ALL OSM buildings… (span ${span} km, ${proj.metresPerTile().toFixed(0)} m/tile)`);
  const buildings = await fetchAllBuildings(proj.bbox());
  console.log(`  ${buildings.length} building footprints`);

  const mPerTile = proj.metresPerTile();
  const bldgs: Bldg[] = [];
  for (const b of buildings) {
    const rings = b.poly.map((ring) => ring.map(([lon, lat]) => proj.toTile(lon, lat)));
    const outer = rings[0];
    if (!outer || outer.length < 3) continue;
    let depth = -Infinity;
    let inBounds = false;
    for (const [u, v] of outer) {
      depth = Math.max(depth, u + v);
      if (u > -2 && u < 258 && v > -2 && v < 162) inBounds = true;
    }
    if (!inBounds) continue;
    // height: real metres → px (3 storeys default), modest so the plan reads
    const hM = b.heightM > 0 ? b.heightM : 9;
    const z = (hM / mPerTile) * HH * 1.7;
    bldgs.push({ rings, z, depth });
  }
  bldgs.sort((a, b) => a.depth - b.depth);
  console.log(`  ${bldgs.length} in view`);

  // canvas covering the whole 256×160 grid in iso (the `scale` downscale at
  // the end supplies the anti-aliasing, so no supersample needed)
  const SS = 1;
  const originX = 160 * HW * SS;
  const W = (256 + 160) * HW * SS;
  const Hpx = (256 + 160) * HH * SS + 400 * SS;
  const img = new Uint8ClampedArray(W * Hpx * 4);
  for (let i = 0; i < W * Hpx; i++) {
    img[i * 4] = 24;
    img[i * 4 + 1] = 26;
    img[i * 4 + 2] = 38;
    img[i * 4 + 3] = 255;
  }
  const sx = (u: number, v: number): number => originX + (u - v) * HW * SS;
  const sy = (u: number, v: number, z: number): number => (u + v) * HH * SS + 300 * SS - z * SS;

  let drawn = 0;
  for (const b of bldgs) {
    const ring = b.rings[0];
    if (!ring) continue;
    // walls (darker), each edge as a quad from ground to roof
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const c = ring[(i + 1) % ring.length]!;
      fillPoly(
        img, W, Hpx,
        [sx(a[0], a[1]), sy(a[0], a[1], 0), sx(c[0], c[1]), sy(c[0], c[1], 0), sx(c[0], c[1]), sy(c[0], c[1], b.z), sx(a[0], a[1]), sy(a[0], a[1], b.z)],
        96, 99, 112,
      );
    }
    // roof (lighter), the footprint lifted to the building height
    const roof: number[] = [];
    for (const [u, v] of ring) {
      roof.push(sx(u, v), sy(u, v, b.z));
    }
    fillPoly(img, W, Hpx, roof, 150, 154, 168);
    drawn++;
  }
  console.log(`  drew ${drawn} masses`);

  const sc = downscale(img, W, Hpx, scale * SS);
  writeFileSync(`preview/shapes-${id}.png`, encodePng(sc.w, sc.h, sc.img));
  console.log(`preview/shapes-${id}.png  ${sc.w}×${sc.h}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
