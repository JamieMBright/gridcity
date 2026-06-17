// Visual-only shoreline smoothing: marching squares over the water mask,
// 2x Chaikin corner-cutting, then flat-colour band strips straddling the
// contour so the tile staircase disappears under a smooth bank. Gameplay
// semantics are untouched — tiles stay the unit of truth; this is paint.
//
// Shared by MapRenderer (static shoreG built once at init) and
// tools/preview.ts through the same polygon sink as the route ribbons.

import { TERRAIN, ZONE, type CityMap } from '../sim/map/types';
import { RIVER_PTS, riverCenterY, riverHalfWidth } from '../data/londonMap';
import { sampleRoute } from '../sim/map/routes';
import { emitRibbon, groundProj } from './routeRibbons';

export const SHORE_PALETTE = {
  /** Flat blend of the water sprite's surface + depth tones. */
  water: 0x356fb3,
  sand: 0xe8cf9e,
  marsh: 0x7d8a4e,
  /** Stone embankment through town. */
  stone: 0x9a93a6,
  ink: 0x1f1834,
  foam: 0xe8e2d2,
  /** A soft warm sheen the river surface catches at golden hour — a thin
   *  glint run down the Thames centreline so it reads its true course (and
   *  the Isle of Dogs loop) even at the far/top zoom. */
  glint: 0xf3ddc2,
} as const;

export interface ShoreChain {
  /** Tile-space contour points; water lies on the LEFT of the walk. */
  pts: Array<{ u: number; v: number }>;
  closed: boolean;
}

/** Marching squares over the terrain water mask. Deterministic. */
export function traceShorelines(map: CityMap): ShoreChain[] {
  const W = map.width;
  const H = map.height;
  const wet = (x: number, y: number): boolean =>
    x >= 0 && x < W && y >= 0 && y < H && map.terrain[y * W + x] === TERRAIN.water;

  interface Seg { x0: number; y0: number; x1: number; y1: number }
  const segs: Seg[] = [];
  for (let y = 0; y + 1 < H; y++) {
    for (let x = 0; x + 1 < W; x++) {
      const code =
        (wet(x, y) ? 1 : 0) | (wet(x + 1, y) ? 2 : 0) | (wet(x + 1, y + 1) ? 4 : 0) | (wet(x, y + 1) ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const T: [number, number] = [x + 0.5, y];
      const R: [number, number] = [x + 1, y + 0.5];
      const B: [number, number] = [x + 0.5, y + 1];
      const L: [number, number] = [x, y + 0.5];
      const add = (a: [number, number], b: [number, number]): void => {
        segs.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
      };
      // segments oriented so WATER IS ON THE LEFT of the walk direction
      switch (code) {
        case 1: add(L, T); break;
        case 2: add(T, R); break;
        case 3: add(L, R); break;
        case 4: add(R, B); break;
        case 5: add(L, T); add(R, B); break;
        case 6: add(T, B); break;
        case 7: add(L, B); break;
        case 8: add(B, L); break;
        case 9: add(B, T); break;
        case 10: add(T, R); add(B, L); break;
        case 11: add(B, R); break;
        case 12: add(R, L); break;
        case 13: add(R, T); break;
        case 14: add(T, L); break;
      }
    }
  }

  // chain segments end-to-start (coordinates land on a half-tile grid)
  const key = (x: number, y: number): number => Math.round(x * 2) * 100000 + Math.round(y * 2);
  const byStart = new Map<number, number[]>();
  const byEnd = new Map<number, number[]>();
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s) continue;
    const ks = key(s.x0, s.y0);
    const ke = key(s.x1, s.y1);
    (byStart.get(ks) ?? byStart.set(ks, []).get(ks))?.push(i);
    (byEnd.get(ke) ?? byEnd.set(ke, []).get(ke))?.push(i);
  }
  const used = new Array<boolean>(segs.length).fill(false);
  const takeFrom = (m: Map<number, number[]>, k: number): number | undefined => {
    const arr = m.get(k);
    if (!arr) return undefined;
    while (arr.length > 0) {
      const ix = arr.shift();
      if (ix !== undefined && !used[ix]) return ix;
    }
    return undefined;
  };

  const chains: ShoreChain[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    // walk backward to the chain head (or detect a loop)
    let head = i;
    const guard = segs.length + 1;
    for (let g = 0; g < guard; g++) {
      const s = segs[head];
      if (!s) break;
      const prevArr = byEnd.get(key(s.x0, s.y0)) ?? [];
      const prev = prevArr.find((ix) => !used[ix] && ix !== head);
      if (prev === undefined || prev === i) break;
      head = prev;
      if (head === i) break; // loop
    }
    // walk forward collecting points
    const first = segs[head];
    if (!first) continue;
    const pts: Array<{ u: number; v: number }> = [{ u: first.x0, v: first.y0 }];
    let cur: number | undefined = head;
    let closed = false;
    while (cur !== undefined && !used[cur]) {
      used[cur] = true;
      const s = segs[cur];
      if (!s) break;
      pts.push({ u: s.x1, v: s.y1 });
      const k = key(s.x1, s.y1);
      if (k === key(first.x0, first.y0)) {
        closed = true;
        break;
      }
      cur = takeFrom(byStart, k);
    }
    if (pts.length >= 3) chains.push({ pts, closed });
  }
  return chains;
}

/** One round of Chaikin corner cutting (endpoints kept on open chains). */
export function chaikin(
  pts: Array<{ u: number; v: number }>,
  closed: boolean,
): Array<{ u: number; v: number }> {
  if (pts.length < 3) return pts;
  const out: Array<{ u: number; v: number }> = [];
  const n = pts.length;
  if (!closed) {
    const h = pts[0];
    if (h) out.push(h);
  }
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    if (!a || !b) continue;
    out.push({ u: a.u * 0.75 + b.u * 0.25, v: a.v * 0.75 + b.v * 0.25 });
    out.push({ u: a.u * 0.25 + b.u * 0.75, v: a.v * 0.25 + b.v * 0.75 });
  }
  if (!closed) {
    const t = pts[n - 1];
    if (t) out.push(t);
  }
  return out;
}

type ShoreSink = (points: number[], color: number, alpha: number) => void;

/** Bank styling at a contour point: stone embankment through town, marsh
 *  on the estuary flats, sand elsewhere — sampled from the LAND side. */
function bankColorAt(map: CityMap, u: number, v: number, nu: number, nv: number): number {
  // water normal is (nu, nv); land lies the other way
  const x = Math.round(u - nu * 0.8);
  const y = Math.round(v - nv * 0.8);
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return SHORE_PALETTE.sand;
  const i = y * map.width + x;
  const zone = map.zone[i];
  if (
    zone === ZONE.urbanCore || zone === ZONE.cbd || zone === ZONE.urban ||
    zone === ZONE.industrial || zone === ZONE.newEstate
  ) {
    return SHORE_PALETTE.stone;
  }
  if (x > 180 && Math.abs(y - riverCenterY(x)) < 9) return SHORE_PALETTE.marsh;
  return SHORE_PALETTE.sand;
}

/** The glint's tasteful constants, shared by both the London spline path and
 *  the water-mask path so every city's river catches the SAME warm sheen at
 *  the SAME low alpha — subtle, never a bright stripe. */
const GLINT_ALPHA = 0.2;
/** Tile-space half-width clamp: a 0.12 hairline up the narrow reaches, never
 *  past 0.55 where the water fans wide (≈0.28 of the local half-width). */
const GLINT_MIN_HALF = 0.12;
const GLINT_MAX_HALF = 0.55;
const GLINT_HALF_OF_WIDTH = 0.28;

/** A thin warm sheen run down the Thames centreline — the "river glint" the
 *  golden-hour water catches. Drawn from the river spline (so it follows the
 *  bends and the Isle of Dogs loop), its width a gentle fraction of the local
 *  half-width (a hairline up west, a touch broader down the estuary) and its
 *  alpha low, so it never reads as a stripe up close yet lifts the river's
 *  course out of flat blue at the far/top zoom. London only — it owns the
 *  RIVER_PTS spine; the other cities derive the same glint from the water mask
 *  (emitRiverGlintFromMask), since they ship no river spline. */
function emitLondonRiverGlint(map: CityMap, sink: ShoreSink): void {
  const samples = sampleRoute({ kind: 'lane', pts: RIVER_PTS }, 0.5);
  if (samples.length < 2) return;
  // build a centreline polyline; clip to the actual water mask so the glint
  // never paints over reclaimed/strayed columns
  const pts: Array<{ u: number; v: number }> = [];
  for (const [sx, sy] of samples) {
    const x = Math.round(sx);
    const y = Math.round(sy);
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;
    if (map.terrain[y * map.width + x] !== TERRAIN.water) continue;
    pts.push({ u: sx, v: sy });
  }
  if (pts.length < 2) return;
  const s: number[] = pts.map((_, i) => i);
  // emit the glint segment-by-segment so its half-width can taper with the
  // river: a hairline up the narrow western reaches, a little broader where
  // the estuary fans open. Kept well inside the banks (≈0.3 of half-width).
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const hw = riverHalfWidth(a.u);
    const half = Math.min(GLINT_MAX_HALF, Math.max(GLINT_MIN_HALF, hw * GLINT_HALF_OF_WIDTH));
    emitRibbon([a, b], [s[i] ?? i, s[i + 1] ?? i + 1], half, 0, groundProj, (q) =>
      sink(q, SHORE_PALETTE.glint, GLINT_ALPHA),
    );
  }
}

/** Interior distance-to-shore (tiles), via a two-pass chamfer transform over
 *  the water mask: land tiles read 0, a water tile reads its approximate
 *  Euclidean distance to the nearest dry tile. Deterministic; O(W·H). This is
 *  what lets a city WITHOUT a river spline find its watercourse: the spine of
 *  a river is the ridge of this field, and its value is the local half-width
 *  — exactly the two things the glint needs. */
function distanceToShore(map: CityMap): Float32Array {
  const W = map.width;
  const H = map.height;
  const INF = 1e6;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = map.terrain[i] === TERRAIN.water ? INF : 0;
  const a = 1;
  const b = Math.SQRT2;
  // forward pass (top-left → bottom-right)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (d[i] === 0) continue;
      let m = d[i] ?? INF;
      if (x > 0) m = Math.min(m, (d[i - 1] ?? INF) + a);
      if (y > 0) m = Math.min(m, (d[i - W] ?? INF) + a);
      if (x > 0 && y > 0) m = Math.min(m, (d[i - W - 1] ?? INF) + b);
      if (x < W - 1 && y > 0) m = Math.min(m, (d[i - W + 1] ?? INF) + b);
      d[i] = m;
    }
  }
  // backward pass (bottom-right → top-left)
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (d[i] === 0) continue;
      let m = d[i] ?? INF;
      if (x < W - 1) m = Math.min(m, (d[i + 1] ?? INF) + a);
      if (y < H - 1) m = Math.min(m, (d[i + W] ?? INF) + a);
      if (x < W - 1 && y < H - 1) m = Math.min(m, (d[i + W + 1] ?? INF) + b);
      if (x > 0 && y < H - 1) m = Math.min(m, (d[i + W - 1] ?? INF) + b);
      d[i] = m;
    }
  }
  return d;
}

/** The water-mask river glint, for every NON-London city (Cairo's Nile, Pune's
 *  Mula-Mutha, the Tyne/Wear in the North-East, the Seine, the Spree…). With no
 *  river spline to trace, the centreline IS the medial axis of the water — the
 *  ridge of the distance-to-shore field — so the glint follows each river's
 *  true course and every bend/confluence for free.
 *
 *  Two things keep it tasteful and "river", not "lit-up sea":
 *   - a tile glints only where it is a LOCAL MAXIMUM of distance-to-shore (the
 *     spine), so the sheen is a thin centreline, never a surface wash; and
 *   - open sea/bays are SUPPRESSED by a distance cap (RIVER_REACH): a broad
 *     body's spine sits far from any shore, so it never lights — only narrow,
 *     river-like water within a few tiles of a bank catches the glint.
 *  Each spine tile gets a small warm ground-plane diamond whose half-width
 *  follows the SAME clamp as London (hairline → 0.55), at the SAME low alpha;
 *  neighbouring diamonds overlap into a continuous thread down the course. */
function emitRiverGlintFromMask(map: CityMap, sink: ShoreSink): void {
  const W = map.width;
  const H = map.height;
  const d = distanceToShore(map);
  // Open water beyond this many tiles from a shore is sea/bay, not a river —
  // its spine carries no glint. A river/estuary edge stays within it.
  const RIVER_REACH = 6;
  const NEIGH: ReadonlyArray<readonly [number, number]> = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (map.terrain[i] !== TERRAIN.water) continue;
      const dv = d[i] ?? 0;
      // need to be ON the water (≥ ~1 from shore) and not out in open sea
      if (dv < 0.9 || dv > RIVER_REACH) continue;
      // medial-axis test: a strict local maximum of distance (ties broken by a
      // stable index rule so the spine is deterministic and one-tile-thin)
      let isRidge = true;
      for (const [dx, dy] of NEIGH) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx;
        const nv = map.terrain[ni] === TERRAIN.water ? (d[ni] ?? 0) : 0;
        if (nv > dv || (nv === dv && ni < i)) {
          isRidge = false;
          break;
        }
      }
      if (!isRidge) continue;
      // a warm diamond on the spine tile, sized like London's glint width
      const half = Math.min(GLINT_MAX_HALF, Math.max(GLINT_MIN_HALF, dv * GLINT_HALF_OF_WIDTH));
      const cu = x + 0.5;
      const cv = y + 0.5;
      const quad: number[] = [];
      for (const [ou, ov] of [[half, 0], [0, half], [-half, 0], [0, -half]] as const) {
        const [px, py] = groundProj(cu + ou, cv + ov);
        quad.push(px, py);
      }
      sink(quad, SHORE_PALETTE.glint, GLINT_ALPHA);
    }
  }
}

/** Dispatch the warm river glint for this map: London traces its RIVER_PTS
 *  spine; every other city derives the same sheen from its water mask. */
function emitRiverGlint(map: CityMap, sink: ShoreSink): void {
  if (map.fabric === undefined || map.fabric === 'london') {
    emitLondonRiverGlint(map, sink);
  } else {
    emitRiverGlintFromMask(map, sink);
  }
}

/** Emit the smoothed shoreline bands: land bank, water band, ink waterline,
 *  a faint foam line offset into the water, and a thin warm river glint down
 *  the river's centreline (the Thames spline for London; the water-mask medial
 *  axis for every other city). Static (band-independent). */
export function emitShoreline(map: CityMap, sink: ShoreSink): void {
  const chains = traceShorelines(map);
  for (const chain of chains) {
    let pts = chain.pts;
    pts = chaikin(pts, chain.closed);
    pts = chaikin(pts, chain.closed);
    if (pts.length < 2) continue;
    const s: number[] = pts.map((_, i) => i);

    // land-side bank, split into runs of identical styling
    let runStart = 0;
    let runColor = -1;
    const flushRun = (end: number): void => {
      if (runColor < 0 || end - runStart < 1) return;
      const seg = pts.slice(Math.max(0, runStart), end + 1);
      const segS = s.slice(Math.max(0, runStart), end + 1);
      emitRibbon(seg, segS, 0.24, -0.205, groundProj, (q) => sink(q, runColor, 1));
    };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[Math.min(i + 1, pts.length - 1)];
      if (!p || !q) continue;
      const du = q.u - p.u;
      const dv = q.v - p.v;
      const len = Math.hypot(du, dv) || 1;
      const c = bankColorAt(map, p.u, p.v, dv / len, -du / len);
      if (c !== runColor) {
        flushRun(i);
        runStart = Math.max(0, i - 1);
        runColor = c;
      }
    }
    flushRun(pts.length - 1);

    // water-side flat band hides the staircase teeth
    emitRibbon(pts, s, 0.31, 0.27, groundProj, (q) => sink(q, SHORE_PALETTE.water, 1));
    // crisp ink waterline + a soft foam line a little way out
    emitRibbon(pts, s, 0.013, 0, groundProj, (q) => sink(q, SHORE_PALETTE.ink, 0.8));
    emitRibbon(pts, s, 0.008, 0.12, groundProj, (q) => sink(q, SHORE_PALETTE.foam, 0.45));
  }
  // the warm river glint rides on top of the finished water band
  emitRiverGlint(map, sink);
}
