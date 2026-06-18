// Rebuild the NORTH-EAST terrain water so the rivers read as REAL rivers
// (owner, 2026-06-18): "river system is better that it's smaller/less dominant,
// but make the main rivers more dominant, like the Tyne. Make rivers contiguous
// — atm they are lots of little ponds."
//
// The committed terrain is a baked raster fetched from OSM; OSM's small
// reservoirs/ponds + the coarse 256×160 rasterisation shattered the Tyne and
// Wear into ~1700 disconnected water blobs (1500+ of them 1–3 tiles). This tool
// regenerates the water layer deterministically + OFFLINE:
//   1. keep the trees + the open SEA (the largest water component on the east),
//   2. drop EVERY other water tile (the orphan ponds + the fragmented rivers),
//   3. redraw the TYNE and the WEAR as single CONTIGUOUS channels through their
//      real relative positions (anchored on the committed town + bridge places),
//      wide + dominant for the trunk and tapering for the connected tributaries,
//      each flowing into the sea,
//   4. re-encode the `terrain:` field of src/data/cities/northeast.ts in place.
//
// Recognisable-not-literal: the channels are clean stylised splines through the
// true anchors (Newcastle/Gateshead bridges, the Tyne mouth at Tynemouth/South
// Shields, the Wear mouth at Sunderland), not the literal OSM meander. The
// overall water:land ratio stays LOW (well under the old 29%).
//
// Re-runnable + idempotent: it always rebuilds from the decoded sea + the
// hard-coded channels, so running it twice produces the same bytes.
//
//   npx tsx tools/rebuildNortheastWater.ts          (writes the file)
//   npx tsx tools/rebuildNortheastWater.ts --dry     (report only)

import { readFileSync, writeFileSync } from 'node:fs';
import { decodeBytes, encodeBytes } from '../src/data/cityData';
import { NORTHEAST_CITY } from '../src/data/cities/northeast';
import { TERRAIN } from '../src/sim/map/types';
import type { Pt } from './osm/geometry';

const FILE = new URL('../src/data/cities/northeast.ts', import.meta.url).pathname;

const W = NORTHEAST_CITY.width;
const H = NORTHEAST_CITY.height;
const N = W * H;
const idx = (x: number, y: number): number => y * W + x;

const src = decodeBytes(NORTHEAST_CITY.terrain);
if (src.length !== N) throw new Error(`terrain length ${src.length} != ${N}`);

// --- 1) find the open SEA = the largest 4-connected water component ----------
const comp = new Int32Array(N).fill(-1);
let best = -1;
let bestSize = 0;
for (let i = 0; i < N; i++) {
  if (src[i] !== TERRAIN.water || comp[i] >= 0) continue;
  const id = i;
  let size = 0;
  const stack = [i];
  comp[i] = id;
  while (stack.length) {
    const j = stack.pop()!;
    size++;
    const x = j % W;
    const y = (j / W) | 0;
    for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
      const k = idx(ax, ay);
      if (src[k] === TERRAIN.water && comp[k] < 0) {
        comp[k] = id;
        stack.push(k);
      }
    }
  }
  if (size > bestSize) {
    bestSize = size;
    best = id;
  }
}

// --- 2) new terrain: trees preserved, water = sea only (drop the ponds) ------
const out = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (src[i] === TERRAIN.trees) out[i] = TERRAIN.trees;
  else if (src[i] === TERRAIN.water && comp[i] === best) out[i] = TERRAIN.water;
  else out[i] = TERRAIN.land;
}

// --- 3) draw the rivers as contiguous, variable-width channels ---------------
// A river is a polyline of [x, y, halfWidth] control points; halfWidth is
// linearly interpolated along each segment and a filled disk is stamped every
// half-tile, so the channel is gap-free + smoothly tapered. Water overwrites
// land AND trees (a river cuts through woods).
type WPt = [number, number, number]; // x, y, halfWidth (tiles)
function stampDisk(cx: number, cy: number, r: number): void {
  const x0 = Math.max(0, Math.floor(cx - r - 0.5));
  const x1 = Math.min(W - 1, Math.ceil(cx + r - 0.5));
  const y0 = Math.max(0, Math.floor(cy - r - 0.5));
  const y1 = Math.min(H - 1, Math.ceil(cy + r - 0.5));
  const r2 = r * r;
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      const ddx = ix + 0.5 - cx;
      const ddy = iy + 0.5 - cy;
      if (ddx * ddx + ddy * ddy <= r2) out[idx(ix, iy)] = TERRAIN.water;
    }
  }
}
function carveRiver(pts: WPt[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay, ar] = pts[i]!;
    const [bx, by, br] = pts[i + 1]!;
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len * 3));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      stampDisk(ax + (bx - ax) * t, ay + (by - ay) * t, ar + (br - ar) * t);
    }
  }
}

// THE TYNE — W edge → Corbridge → Prudhoe → Blaydon → the Newcastle/Gateshead
// bridge gorge → Wallsend/Jarrow → the mouth at Tynemouth(N)/South Shields(S) →
// the North Sea. Wide + dominant trunk (half ≈ 2.2 tiles ⇒ ~4–5 tiles across)
// through the conurbation, tapering inland to the western edge.
// Half-widths kept MODERATE through the Newcastle/Gateshead conurbation: a wide
// "lake" channel floated the quayside heroes (owner, 2026-06-18: "all the
// buildings are in the water"). ~1.5–1.7 reads as a dominant trunk river (~3
// tiles across) without drowning the banks; the §3b halo drain then keeps any
// individual building on dry land, and the mouth still flares to the sea.
const TYNE: WPt[] = [
  [-2, 67, 1.1],
  [16, 66, 1.2],
  [31, 65, 1.3], // Corbridge
  [52, 67, 1.4],
  [70, 71, 1.5],
  [86, 73, 1.5], // Prudhoe
  [110, 75, 1.6],
  [130, 76, 1.6],
  [143, 76, 1.7], // Blaydon (Derwent joins here)
  [154, 73, 1.6],
  [162, 71, 1.6],
  [167, 70, 1.7], // the bridges (Tyne/High Level/Swing/Millennium)
  [176, 67, 1.6],
  [188, 63, 1.6],
  [200, 57, 1.7],
  [210, 53, 1.8],
  [217, 51, 1.9],
  [221, 49, 2.0], // the narrows at the piers
  [226, 47, 2.4], // opening to the sea
  [232, 45, 3.2],
];

// THE WEAR — inland from the Durham approach → Chester-le-Street → Washington →
// the Penshaw kink → the mouth at Sunderland (Stadium of Light N bank, the
// Bridges / National Glass Centre / St Peter's at the mouth) → the North Sea.
const WEAR: WPt[] = [
  [167, 152, 1.0],
  [170, 138, 1.2],
  [176, 127, 1.3], // Chester-le-Street
  [184, 116, 1.4],
  [192, 108, 1.5], // Washington
  [200, 110, 1.5],
  [206, 115, 1.5], // Penshaw kink (the loop)
  [213, 108, 1.6],
  [219, 101, 1.7],
  [226, 99, 1.8], // below the Stadium of Light (N bank)
  [233, 100, 1.9], // the Bridges
  [238, 101, 2.0], // the mouth (Glass Centre / St Peter's)
  [243, 100, 2.8], // opening to the sea
];

// THE DERWENT — a connected tributary from the Consett/Derwent valley down to
// the Tyne at Blaydon (joins the trunk, so NO orphan pond).
const DERWENT: WPt[] = [
  [104, 110, 0.7], // Consett valley
  [118, 98, 0.8],
  [131, 86, 0.9],
  [140, 79, 1.0],
  [143, 76, 1.2], // confluence with the Tyne at Blaydon
];

// THE TEAM — a short connected beck joining the Tyne at Gateshead from the south
// (Team valley), so Gateshead reads on a watercourse too.
const TEAM: WPt[] = [
  [170, 96, 0.6],
  [169, 85, 0.7],
  [168, 76, 0.8],
  [167, 71, 1.0], // confluence at the bridges
];

carveRiver(TYNE);
carveRiver(WEAR);
carveRiver(DERWENT);
carveRiver(TEAM);

// --- 3b) keep the principal buildings OUT of the water -----------------------
// A dominant Tyne/Wear through the dense quaysides still floated ~22 hero
// buildings on the channel (owner, 2026-06-18: "all the buildings are in the
// water"). Drain a small LAND halo around every NAMED place that is NOT a bridge
// (bridges legitimately span the river) so the principal buildings sit on the
// bank. Water→land only, so the rivers stay contiguous wherever a building
// isn't; the bridge channel is re-asserted afterwards so the crossings keep
// their water.
const isBridge = (name: string): boolean => /\bbridge\b/i.test(name);
function drainHalo(cx: number, cy: number, r: number): void {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      const dx = ix - cx;
      const dy = iy - cy;
      if (dx * dx + dy * dy <= r2 && out[idx(ix, iy)] === TERRAIN.water) {
        out[idx(ix, iy)] = TERRAIN.land;
      }
    }
  }
}
for (const p of NORTHEAST_CITY.named) {
  if (isBridge(p.name)) continue;
  // hero footprints are SW-anchored (extend E +x, N −y); a radius-2 halo around
  // the anchor clears the small footprints + a one-tile dry bank.
  drainHalo(p.x, p.y, 2);
}
// re-assert a SLENDER channel under the four central bridges so the crossings
// still span open water after the quayside halos (their neighbours' halos can
// nibble the bridge tiles). Thin (half ≈ 1) — just the gorge, not a lake.
carveRiver([
  [167, 70, 1.0],
  [169, 71, 1.0],
  [171, 73, 1.0],
]);

// --- 4) report + write -------------------------------------------------------
function stats(t: Uint8Array): { water: number; trees: number; comps: number; ponds: number; top: number } {
  let water = 0;
  let trees = 0;
  for (let i = 0; i < N; i++) {
    if (t[i] === TERRAIN.water) water++;
    else if (t[i] === TERRAIN.trees) trees++;
  }
  const c = new Int32Array(N).fill(-1);
  let comps = 0;
  let ponds = 0;
  let top = 0;
  for (let i = 0; i < N; i++) {
    if (t[i] !== TERRAIN.water || c[i] >= 0) continue;
    comps++;
    let size = 0;
    const stack = [i];
    c[i] = i;
    while (stack.length) {
      const j = stack.pop()!;
      size++;
      const x = j % W;
      const y = (j / W) | 0;
      for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
        const k = idx(ax, ay);
        if (t[k] === TERRAIN.water && c[k] < 0) {
          c[k] = i;
          stack.push(k);
        }
      }
    }
    if (size <= 3) ponds++;
    if (size > top) top = size;
  }
  return { water, trees, comps, ponds, top };
}

const before = stats(src);
const after = stats(out);
const pct = (v: number): string => `${((100 * v) / N).toFixed(1)}%`;
console.log(`BEFORE: water ${before.water} (${pct(before.water)})  trees ${before.trees} (${pct(before.trees)})  components ${before.comps}  ponds(≤3) ${before.ponds}  biggest ${before.top}`);
console.log(`AFTER : water ${after.water} (${pct(after.water)})  trees ${after.trees} (${pct(after.trees)})  components ${after.comps}  ponds(≤3) ${after.ponds}  biggest ${after.top}`);

if (process.argv.includes('--dry')) {
  console.log('(dry run — no file written)');
} else {
  const text = readFileSync(FILE, 'utf8');
  const encoded = encodeBytes(out);
  const re = /terrain:\s*"([A-Za-z0-9+/=]+)"/;
  if (!re.test(text)) throw new Error('could not find terrain: "..." field in northeast.ts');
  const next = text.replace(re, `terrain: "${encoded}"`);
  writeFileSync(FILE, next, 'utf8');
  console.log(`wrote ${FILE} (terrain ${encoded.length} b64 chars)`);
}

export { TYNE, WEAR, DERWENT, TEAM };
export type { Pt, WPt };
