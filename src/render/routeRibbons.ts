// Projected ground-plane transport ribbons — the single shared source of
// truth for how the vector route network becomes pixels. Both the Pixi
// MapRenderer and tools/preview.ts consume this module through the same
// emission callback, so the art-review loop can never again go blind to
// transport (the process root cause of "still goofy").
//
// Geometry doctrine (docs/transport-overhaul.md):
// - Ribbons are tessellated in TILE space (constant tile-space half-width,
//   mitred joins) and every vertex is projected through the iso transform,
//   so a road is a quad strip lying IN the ground plane, foreshortened like
//   every floor diamond — never a screen-space noodle laid on top.
// - Cartographic two-pass painting: ALL casings (class ascending), then ALL
//   fills (class ascending) — crossings overpaint each other's casings so
//   junctions merge for free and arterials ride over streets.
// - Five zoom bands with screen-px width floors and declutter: far zoom is
//   motorways + arterials + rail only, so the M25 always reads as the
//   map's signature ring instead of vanishing into the fields.
// - Junction discs, roundabouts, motorway grade separation and bridge
//   spans are DERIVED from the existing routes at build time — no CityMap
//   geometry change, no SAVE_VERSION risk.

import { sampleRoute } from '../sim/map/routes';
import { LANDMARK, TERRAIN, type CityMap, type RouteClass, type TransportRoute } from '../sim/map/types';
import { CELL_W, FLOOR_H, RES } from './sprites/iso';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;
/** Mitre spikes at sharp lattice corners are clamped to this multiple of
 *  the ribbon half-width. */
export const MITER_LIMIT = 3;

/** Where a polygon belongs in the painter stack. 'routes' sits between the
 *  boat layer and the road-vehicle layer; 'bridgeTop' (near parapets) sits
 *  ABOVE road vehicles so cars cross bridges behind the near railing. */
export type RibbonLayer = 'routes' | 'bridgeTop';

/** Renderer-agnostic emission: a flat [x0,y0,x1,y1,...] polygon in world
 *  pixels, already projected through the iso transform. */
export type RibbonSink = (points: number[], color: number, alpha: number, layer: RibbonLayer) => void;

// --- palette (dusk world: fills LIGHTER than the ground, casing near-black)

export const RIBBON_PALETTE = {
  casing: 0x1f1834,
  motorwayFill: 0x777287,
  /** Far bands have no edge-line detail: a lighter fill keeps the M25
   *  reading as the map's signature ring. */
  motorwayFillFar: 0x9591a1,
  motorwayEdge: 0xe8e2d2,
  reservation: 0x3f8f4e,
  arterialFill: 0x6e6a7c,
  streetFill: 0x605c6b,
  laneFill: 0x8a7a5e,
  railBallast: 0x4a4555,
  railSteel: 0x9aa4b5,
  railFar: 0x2b2440,
  /** Cross-tick symbology (OS Landranger): cream ticks across the line. */
  railTick: 0xe8e2d2,
  /** Station platform slab beside the line. */
  platform: 0xc9c2b4,
  sleeper: 0x6e5a43,
  dash: 0xe8e2d2,
  parapet: 0xb8b2c4,
  pier: 0x4a4458,
  pierWood: 0x8a6f4f,
  reflection: 0x9fd0e8,
  shadow: 0x06080f,
  island: 0x4a8f54,
} as const;

// --- zoom bands -------------------------------------------------------------

/** World-scale thresholds between bands Z0..Z4 (tile screen width = 256·s). */
export const BAND_EDGES = [0.08, 0.18, 0.45, 0.9] as const;
const BAND_LO = [0.02, 0.08, 0.18, 0.45, 0.9] as const;
const BAND_HI = [0.08, 0.18, 0.45, 0.9, 1.8] as const;

export function bandFor(scale: number): number {
  for (let b = 0; b < BAND_EDGES.length; b++) {
    const e = BAND_EDGES[b];
    if (e !== undefined && scale < e) return b;
  }
  return 4;
}

/** A zoom rebuild key: band picks class visibility/decimation, the bucket
 *  sub-divides wide bands geometrically so screen-px width floors stay
 *  honest (floors are computed at the bucket's representative scale). */
export interface ZoomKey {
  id: string;
  band: number;
  /** Representative scale for width-floor maths (bucket geometric mean). */
  scale: number;
  lo: number;
  hi: number;
}

/** Pick the rebuild key for a world scale. Pass the previous key for
 *  ±10 % hysteresis so pinching across a boundary doesn't thrash. */
export function zoomKeyFor(scale: number, prev?: ZoomKey): ZoomKey {
  if (prev && scale > prev.lo * 0.9 && scale < prev.hi * 1.1) return prev;
  const s = Math.min(1.79, Math.max(0.0201, scale));
  const band = bandFor(s);
  const lo = BAND_LO[band] ?? 0.02;
  const hi = BAND_HI[band] ?? 1.8;
  const n = Math.max(1, Math.round(Math.log(hi / lo) / Math.log(1.8)));
  const t = Math.log(s / lo) / Math.log(hi / lo);
  const bucket = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
  const blo = lo * Math.pow(hi / lo, bucket / n);
  const bhi = lo * Math.pow(hi / lo, (bucket + 1) / n);
  return { id: `${band}.${bucket}`, band, scale: Math.sqrt(blo * bhi), lo: blo, hi: bhi };
}

// --- class styling ----------------------------------------------------------

const RANK: Record<RouteClass, number> = { lane: 0, street: 1, arterial: 2, motorway: 3, rail: 4 };
const ROAD_ORDER: RouteClass[] = ['lane', 'street', 'arterial', 'motorway'];

interface RoadStyle {
  /** Natural half-width in tile units. */
  half: number;
  fill: number;
  /** First band the class is visible at (0 = always). */
  minBand: number;
  /** First band the class draws a casing outline at. */
  casingMinBand: number;
  /** Fill width floor in SCREEN px per band Z0..Z4 (full width). */
  fillFloor: readonly [number, number, number, number, number];
  /** Fill alpha per band (declutter: faint streets at Z1). */
  alpha: readonly [number, number, number, number, number];
}

const ROAD: Record<Exclude<RouteClass, 'rail'>, RoadStyle> = {
  lane: {
    half: 0.035, fill: RIBBON_PALETTE.laneFill, minBand: 2, casingMinBand: 3,
    fillFloor: [0, 0, 1, 1, 1], alpha: [0, 0, 0.9, 1, 1],
  },
  street: {
    half: 0.05, fill: RIBBON_PALETTE.streetFill, minBand: 1, casingMinBand: 2,
    fillFloor: [0, 1.5, 1.2, 1, 1], alpha: [0, 0.65, 1, 1, 1],
  },
  arterial: {
    half: 0.09, fill: RIBBON_PALETTE.arterialFill, minBand: 0, casingMinBand: 2,
    fillFloor: [2.5, 3, 2, 1.5, 1.5], alpha: [1, 1, 1, 1, 1],
  },
  motorway: {
    half: 0.15, fill: RIBBON_PALETTE.motorwayFill, minBand: 0, casingMinBand: 0,
    fillFloor: [4, 5, 3, 2, 2], alpha: [1, 1, 1, 1, 1],
  },
};
const RAIL_HALF = 0.05;
const RAIL_FAR_HALF = 0.03;
/** One cartographic cross-tick every this many tiles of railway. */
export const RAIL_TICK_SPACING = 1.5;

/** Deck lift above the waterline, world px, per route class — used by the
 *  bridge tessellation AND the vehicle animator so cars ride the deck. */
const DECK_FACTOR: Record<RouteClass, number> = {
  motorway: 1.3, arterial: 1.1, rail: 1.2, street: 0.9, lane: 0.8,
};
export function deckLiftWorldPx(kind: RouteClass): number {
  return 9 * RES * DECK_FACTOR[kind];
}
const OVERPASS_Z = 7 * RES;

function pxToTiles(px: number, scale: number): number {
  return px / (CELL_W * scale);
}

/** Effective fill half-width (tile units) after the screen-px floor. */
export function fillHalfFor(kind: Exclude<RouteClass, 'rail'>, band: number, scale: number): number {
  const st = ROAD[kind];
  return Math.max(st.half, pxToTiles(st.fillFloor[band] ?? 0, scale) / 2);
}

function casingExtra(scale: number): number {
  return Math.max(0.025, pxToTiles(1.2, scale));
}

function lightenHex(c: number, t: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 0xff) + (255 - ((c >> 16) & 0xff)) * t));
  const g = Math.min(255, Math.round(((c >> 8) & 0xff) + (255 - ((c >> 8) & 0xff)) * t));
  const b = Math.min(255, Math.round((c & 0xff) + (255 - (c & 0xff)) * t));
  return (r << 16) | (g << 8) | b;
}

// --- derived geometry (cached per map) ---------------------------------------

export interface RibbonPathPoint { u: number; v: number; water: boolean }
export interface RibbonPath {
  kind: RouteClass;
  pts: RibbonPathPoint[];
  /** Cumulative tile-space distance per point. */
  cum: number[];
  total: number;
}
export interface JunctionNode { u: number; v: number; kind: RouteClass }
export interface Overpass { pathIx: number; s: number }
/** A platform slab beside a rail path at a station landmark. `side` is the
 *  sign of the offset along the path's LEFT normal ((dv, -du)) that points
 *  toward the landmark. */
export interface StationSlab { pathIx: number; s: number; side: 1 | -1 }
export interface BridgeSpan {
  pathIx: number;
  s0: number;
  s1: number;
  /** plain = inside a landmark reservation (Tower Bridge draws itself). */
  mode: 'bridge' | 'pier' | 'plain';
}
export interface TransportGeometry {
  /** Fine sampling (step 0.35) for near bands; coarse (1.0) for Z0/Z1. */
  fine: RibbonPath[];
  coarse: RibbonPath[];
  junctions: JunctionNode[];
  roundabouts: Array<{ u: number; v: number }>;
  overpasses: Overpass[];
  spans: BridgeSpan[];
  /** Station platforms, derived from `lm_station` landmarks beside lines. */
  stations: StationSlab[];
}

const geomCache = new WeakMap<CityMap, TransportGeometry>();

function buildPath(map: CityMap, route: TransportRoute, step: number): RibbonPath | undefined {
  const samples = sampleRoute(route, step);
  if (samples.length < 2) return undefined;
  const pts: RibbonPathPoint[] = [];
  const cum: number[] = [];
  let d = 0;
  for (let k = 0; k < samples.length; k++) {
    const s = samples[k];
    if (!s) continue;
    const prev = pts[pts.length - 1];
    if (prev) {
      const step2 = Math.hypot(s[0] - prev.u, s[1] - prev.v);
      if (step2 < 1e-6) continue;
      d += step2;
    }
    const tx = Math.round(s[0]);
    const ty = Math.round(s[1]);
    const water =
      tx >= 0 && tx < map.width && ty >= 0 && ty < map.height
        ? map.terrain[ty * map.width + tx] === TERRAIN.water
        : false;
    pts.push({ u: s[0], v: s[1], water });
    cum.push(d);
  }
  if (pts.length < 2) return undefined;
  return { kind: route.kind, pts, cum, total: d };
}

interface CrossEvent { u: number; v: number; aIx: number; bIx: number; aS: number; bS: number }

/** All pairwise route crossings, found via a unit-tile grid hash. */
function findCrossings(paths: RibbonPath[]): CrossEvent[] {
  const grid = new Map<string, Array<{ p: number; i: number }>>();
  for (let p = 0; p < paths.length; p++) {
    const path = paths[p];
    if (!path) continue;
    for (let i = 0; i + 1 < path.pts.length; i++) {
      const a = path.pts[i];
      const b = path.pts[i + 1];
      if (!a || !b) continue;
      const x0 = Math.floor(Math.min(a.u, b.u));
      const x1 = Math.floor(Math.max(a.u, b.u));
      const y0 = Math.floor(Math.min(a.v, b.v));
      const y1 = Math.floor(Math.max(a.v, b.v));
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const key = `${cx},${cy}`;
          let cell = grid.get(key);
          if (!cell) {
            cell = [];
            grid.set(key, cell);
          }
          cell.push({ p, i });
        }
      }
    }
  }
  const out: CrossEvent[] = [];
  const seen = new Set<string>();
  for (const cell of grid.values()) {
    for (let m = 0; m < cell.length; m++) {
      for (let n = m + 1; n < cell.length; n++) {
        const A = cell[m];
        const B = cell[n];
        if (!A || !B || A.p === B.p) continue;
        const lo = A.p < B.p ? A : B;
        const hi = A.p < B.p ? B : A;
        const key = `${lo.p}:${lo.i}:${hi.p}:${hi.i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const pa = paths[lo.p];
        const pb = paths[hi.p];
        if (!pa || !pb) continue;
        const a0 = pa.pts[lo.i];
        const a1 = pa.pts[lo.i + 1];
        const b0 = pb.pts[hi.i];
        const b1 = pb.pts[hi.i + 1];
        if (!a0 || !a1 || !b0 || !b1) continue;
        const rx = a1.u - a0.u;
        const ry = a1.v - a0.v;
        const sx = b1.u - b0.u;
        const sy = b1.v - b0.v;
        const den = rx * sy - ry * sx;
        if (Math.abs(den) < 1e-9) continue;
        const qx = b0.u - a0.u;
        const qy = b0.v - a0.v;
        const t = (qx * sy - qy * sx) / den;
        const w = (qx * ry - qy * rx) / den;
        if (t < -1e-9 || t > 1 + 1e-9 || w < -1e-9 || w > 1 + 1e-9) continue;
        out.push({
          u: a0.u + rx * t,
          v: a0.v + ry * t,
          aIx: lo.p,
          bIx: hi.p,
          aS: (pa.cum[lo.i] ?? 0) + t * Math.hypot(rx, ry),
          bS: (pb.cum[hi.i] ?? 0) + w * Math.hypot(sx, sy),
        });
      }
    }
  }
  return out;
}

function clusterPoints<T extends { u: number; v: number }>(
  events: T[],
  radius: number,
): Array<{ u: number; v: number; members: T[] }> {
  const clusters: Array<{ u: number; v: number; members: T[] }> = [];
  for (const e of events) {
    let best: { u: number; v: number; members: T[] } | undefined;
    let bestD = radius;
    for (const c of clusters) {
      const d = Math.hypot(c.u - e.u, c.v - e.v);
      if (d <= bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best) {
      best.members.push(e);
      best.u = best.members.reduce((s, m) => s + m.u, 0) / best.members.length;
      best.v = best.members.reduce((s, m) => s + m.v, 0) / best.members.length;
    } else {
      clusters.push({ u: e.u, v: e.v, members: [e] });
    }
  }
  return clusters;
}

/** Derive everything once per map: junction discs, roundabout sites,
 *  motorway grade separations and water-crossing spans. Deterministic. */
export function transportGeometry(map: CityMap): TransportGeometry {
  const cached = geomCache.get(map);
  if (cached) return cached;

  const fine: RibbonPath[] = [];
  const coarse: RibbonPath[] = [];
  for (const route of map.routes ?? []) {
    const f = buildPath(map, route, 0.35);
    const c = buildPath(map, route, 1.0);
    if (f && c) {
      fine.push(f);
      coarse.push(c);
    }
  }

  const crossings = findCrossings(fine);

  // grade separation: anything crossing a motorway goes over it
  const overEvents: Array<{ u: number; v: number; pathIx: number; s: number }> = [];
  for (const c of crossings) {
    const ka = fine[c.aIx]?.kind;
    const kb = fine[c.bIx]?.kind;
    if (!ka || !kb) continue;
    if (ka === 'motorway' && kb === 'motorway') {
      overEvents.push({ u: c.u, v: c.v, pathIx: c.bIx, s: c.bS });
    } else if (ka === 'motorway') {
      overEvents.push({ u: c.u, v: c.v, pathIx: c.bIx, s: c.bS });
    } else if (kb === 'motorway') {
      overEvents.push({ u: c.u, v: c.v, pathIx: c.aIx, s: c.aS });
    }
  }
  const overpasses: Overpass[] = [];
  for (const cl of clusterPoints(overEvents, 1.2)) {
    const m = cl.members[0];
    if (!m) continue;
    // one overpass per cluster, on the first (deterministic) minor path
    const s = cl.members.filter((e) => e.pathIx === m.pathIx).reduce((a, e) => a + e.s, 0) /
      cl.members.filter((e) => e.pathIx === m.pathIx).length;
    overpasses.push({ pathIx: m.pathIx, s });
  }

  // junction discs: clusters of ≥3 ends/crossings, no motorway involved
  const nodeEvents: Array<{ u: number; v: number; kind: RouteClass }> = [];
  for (const c of crossings) {
    const ka = fine[c.aIx]?.kind;
    const kb = fine[c.bIx]?.kind;
    if (!ka || !kb || ka === 'motorway' || kb === 'motorway' || ka === 'rail' || kb === 'rail') continue;
    nodeEvents.push({ u: c.u, v: c.v, kind: (RANK[ka] >= RANK[kb] ? ka : kb) });
  }
  for (const p of fine) {
    if (p.kind === 'motorway' || p.kind === 'rail') continue;
    const a = p.pts[0];
    const b = p.pts[p.pts.length - 1];
    if (a) nodeEvents.push({ u: a.u, v: a.v, kind: p.kind });
    if (b) nodeEvents.push({ u: b.u, v: b.v, kind: p.kind });
  }
  const junctions: JunctionNode[] = [];
  for (const cl of clusterPoints(nodeEvents, 0.4)) {
    if (cl.members.length < 3) continue;
    let kind: RouteClass = 'lane';
    for (const m of cl.members) if (RANK[m.kind] > RANK[kind]) kind = m.kind;
    junctions.push({ u: cl.u, v: cl.v, kind });
  }

  // roundabouts: arterial × arterial crossings, spaced out, capped
  const artEvents = crossings.filter(
    (c) => fine[c.aIx]?.kind === 'arterial' && fine[c.bIx]?.kind === 'arterial',
  );
  const roundabouts: Array<{ u: number; v: number }> = [];
  for (const cl of clusterPoints(artEvents, 1.0)) {
    if (roundabouts.length >= 14) break;
    if (roundabouts.every((r) => Math.hypot(r.u - cl.u, r.v - cl.v) >= 8)) {
      roundabouts.push({ u: cl.u, v: cl.v });
    }
  }

  // bridge spans: maximal water runs + 0.7 t approaches each side
  const spans: BridgeSpan[] = [];
  for (let p = 0; p < fine.length; p++) {
    const path = fine[p];
    if (!path) continue;
    let runStart = -1;
    for (let i = 0; i <= path.pts.length; i++) {
      const wet = i < path.pts.length && (path.pts[i]?.water ?? false);
      if (wet && runStart < 0) runStart = i;
      if (!wet && runStart >= 0) {
        const i1 = i - 1;
        const sA = path.cum[runStart] ?? 0;
        const sB = path.cum[i1] ?? 0;
        if (sB - sA >= 0.55) {
          let tower = false;
          for (let k = runStart; k <= i1; k++) {
            const pt = path.pts[k];
            if (!pt) continue;
            const tx = Math.round(pt.u);
            const ty = Math.round(pt.v);
            if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height &&
              (map.landmark?.[ty * map.width + tx] ?? 0) === LANDMARK.towerBridge) {
              tower = true;
              break;
            }
          }
          const endsInWater = i1 >= path.pts.length - 1 || runStart === 0;
          const mode: BridgeSpan['mode'] = tower
            ? 'plain'
            : endsInWater && (path.kind === 'street' || path.kind === 'lane')
              ? 'pier'
              : 'bridge';
          spans.push({
            pathIx: p,
            s0: Math.max(0, sA - 0.7),
            s1: Math.min(path.total, sB + 0.7),
            mode,
          });
        }
        runStart = -1;
      }
    }
  }
  // merge overlapping spans on the same path (keep the stronger mode)
  spans.sort((a, b) => a.pathIx - b.pathIx || a.s0 - b.s0);
  const merged: BridgeSpan[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && last.pathIx === s.pathIx && s.s0 <= last.s1 + 0.2) {
      last.s1 = Math.max(last.s1, s.s1);
      if (s.mode === 'plain') last.mode = 'plain';
    } else {
      merged.push({ ...s });
    }
  }

  // station platforms: a slab beside the line wherever a rail path passes
  // close to a station landmark (the central termini sit ON their lines;
  // town stations are placed one tile off the nearest rail sample). All
  // derived — no CityMap change.
  const stations: StationSlab[] = [];
  if (map.landmark) {
    for (let i = 0; i < map.landmark.length; i++) {
      if (map.landmark[i] !== LANDMARK.station) continue;
      const tx = i % map.width;
      const ty = Math.floor(i / map.width);
      let best: StationSlab | undefined;
      let bestD = 1.6;
      for (let p = 0; p < fine.length; p++) {
        const path = fine[p];
        if (!path || path.kind !== 'rail') continue;
        for (let k = 0; k + 1 < path.pts.length; k++) {
          const a = path.pts[k];
          const b = path.pts[k + 1];
          if (!a || !b) continue;
          const du = b.u - a.u;
          const dv = b.v - a.v;
          const len2 = du * du + dv * dv;
          if (len2 < 1e-9) continue;
          const tt = Math.min(1, Math.max(0, ((tx - a.u) * du + (ty - a.v) * dv) / len2));
          const pu = a.u + du * tt;
          const pv = a.v + dv * tt;
          const d = Math.hypot(tx - pu, ty - pv);
          if (d < bestD) {
            const ln = Math.sqrt(len2);
            // left normal (the ribbon offset axis): (dv, -du)
            const side: 1 | -1 = ((tx - pu) * dv + (ty - pv) * -du) / ln >= 0 ? 1 : -1;
            bestD = d;
            best = { pathIx: p, s: (path.cum[k] ?? 0) + tt * ln, side };
          }
        }
      }
      if (best) stations.push(best);
    }
    // termini share tiles with their approach fans: merge slabs that landed
    // on the same stretch of the same line
    stations.sort((a, b) => a.pathIx - b.pathIx || a.s - b.s);
    for (let i = stations.length - 1; i > 0; i--) {
      const a = stations[i];
      const b = stations[i - 1];
      if (a && b && a.pathIx === b.pathIx && Math.abs(a.s - b.s) < 1.4) stations.splice(i, 1);
    }
  }

  const geom: TransportGeometry = { fine, coarse, junctions, roundabouts, overpasses, spans: merged, stations };
  geomCache.set(map, geom);
  return geom;
}

// --- low-level tessellation ---------------------------------------------------

type Proj = (u: number, v: number, s: number) => [number, number];

export function groundProj(u: number, v: number): [number, number] {
  return [(u - v) * HALF_W, (u + v) * HALF_H];
}

interface SlicePts { pts: Array<{ u: number; v: number; water: boolean }>; s: number[] }

function slicePath(path: RibbonPath, sA: number, sB: number): SlicePts | undefined {
  const a = Math.max(0, sA);
  const b = Math.min(path.total, sB);
  if (b - a < 1e-3) return undefined;
  const pts: SlicePts['pts'] = [];
  const s: number[] = [];
  const lerpAt = (sv: number): { u: number; v: number; water: boolean } | undefined => {
    let lo = 0;
    let hi = path.cum.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if ((path.cum[mid] ?? 0) <= sv) lo = mid;
      else hi = mid;
    }
    const c0 = path.cum[lo] ?? 0;
    const c1 = path.cum[lo + 1] ?? c0 + 1;
    const p0 = path.pts[lo];
    const p1 = path.pts[lo + 1];
    if (!p0 || !p1) return undefined;
    const t = Math.min(1, Math.max(0, (sv - c0) / Math.max(1e-9, c1 - c0)));
    return { u: p0.u + (p1.u - p0.u) * t, v: p0.v + (p1.v - p0.v) * t, water: t < 0.5 ? p0.water : p1.water };
  };
  const head = lerpAt(a);
  if (head) {
    pts.push(head);
    s.push(a);
  }
  for (let i = 0; i < path.pts.length; i++) {
    const c = path.cum[i] ?? 0;
    if (c <= a + 1e-6 || c >= b - 1e-6) continue;
    const p = path.pts[i];
    if (p) {
      pts.push(p);
      s.push(c);
    }
  }
  const tail = lerpAt(b);
  if (tail) {
    pts.push(tail);
    s.push(b);
  }
  return pts.length >= 2 ? { pts, s } : undefined;
}

/** Emit a mitred quad strip along tile-space points. `offset` shifts the
 *  centreline along the LEFT normal ((dv, -du)); each quad shares its
 *  mitred edge vertices with the next, so strips are seam- and
 *  overlap-free even at alpha < 1. */
function ribbonQuads(
  pts: ArrayLike<{ u: number; v: number }>,
  sArr: number[],
  half: number,
  offset: number,
  proj: Proj,
  out: (quad: number[]) => void,
): void {
  const n = pts.length;
  if (n < 2 || half <= 0) return;
  const dirU: number[] = [];
  const dirV: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) {
      dirU.push(0);
      dirV.push(0);
      continue;
    }
    const du = b.u - a.u;
    const dv = b.v - a.v;
    const len = Math.hypot(du, dv) || 1;
    dirU.push(du / len);
    dirV.push(dv / len);
  }
  const Lx: number[] = [];
  const Ly: number[] = [];
  const Rx: number[] = [];
  const Ry: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (!p) continue;
    const dpu = dirU[Math.max(0, i - 1)] ?? 0;
    const dpv = dirV[Math.max(0, i - 1)] ?? 0;
    const dnu = dirU[Math.min(dirU.length - 1, i)] ?? 0;
    const dnv = dirV[Math.min(dirV.length - 1, i)] ?? 0;
    let mu = dpu + dnu;
    let mv = dpv + dnv;
    const mlen = Math.hypot(mu, mv);
    if (mlen < 1e-6) {
      mu = dnu;
      mv = dnv;
    } else {
      mu /= mlen;
      mv /= mlen;
    }
    // left normal of the mitre direction
    const nu = mv;
    const nv = -mu;
    // mitre length: 1/cos(half-angle vs the prev segment's left normal),
    // clamped to MITER_LIMIT so lattice L-corners can't spike
    const dot = nu * dpv - nv * dpu;
    const sc = 1 / Math.max(Math.abs(dot) > 1e-6 ? Math.abs(dot) : 1, 1 / MITER_LIMIT);
    const s = sArr[i] ?? 0;
    const lu = p.u + nu * (offset + half) * sc;
    const lv = p.v + nv * (offset + half) * sc;
    const ru = p.u + nu * (offset - half) * sc;
    const rv = p.v + nv * (offset - half) * sc;
    const [lxp, lyp] = proj(lu, lv, s);
    const [rxp, ryp] = proj(ru, rv, s);
    Lx.push(lxp);
    Ly.push(lyp);
    Rx.push(rxp);
    Ry.push(ryp);
  }
  for (let i = 0; i + 1 < Lx.length; i++) {
    out([
      Lx[i] ?? 0, Ly[i] ?? 0,
      Lx[i + 1] ?? 0, Ly[i + 1] ?? 0,
      Rx[i + 1] ?? 0, Ry[i + 1] ?? 0,
      Rx[i] ?? 0, Ry[i] ?? 0,
    ]);
  }
}

/** Public ribbon emitter (shared with the shoreline module). */
export function emitRibbon(
  pts: ArrayLike<{ u: number; v: number }>,
  sArr: number[],
  half: number,
  offset: number,
  proj: Proj,
  out: (quad: number[]) => void,
): void {
  ribbonQuads(pts, sArr, half, offset, proj, out);
}

/** Walker: point + unit tangent at tile distance s along a slice. */
function makeWalker(slice: SlicePts): (s: number) => { u: number; v: number; du: number; dv: number } | undefined {
  return (s: number) => {
    const arr = slice.s;
    if (arr.length < 2) return undefined;
    const first = arr[0] ?? 0;
    const last = arr[arr.length - 1] ?? 0;
    const sv = Math.min(Math.max(s, first), last);
    let lo = 0;
    let hi = arr.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if ((arr[mid] ?? 0) <= sv) lo = mid;
      else hi = mid;
    }
    const p0 = slice.pts[lo];
    const p1 = slice.pts[lo + 1];
    const c0 = arr[lo] ?? 0;
    const c1 = arr[lo + 1] ?? c0 + 1;
    if (!p0 || !p1) return undefined;
    const t = Math.min(1, Math.max(0, (sv - c0) / Math.max(1e-9, c1 - c0)));
    const du = p1.u - p0.u;
    const dv = p1.v - p0.v;
    const len = Math.hypot(du, dv) || 1;
    return { u: p0.u + du * t, v: p0.v + dv * t, du: du / len, dv: dv / len };
  };
}

/** Projected disc (a tile-space circle becomes an iso ellipse). */
function discPoly(u: number, v: number, r: number, proj: Proj): number[] {
  const out: number[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const [x, y] = proj(u + Math.cos(a) * r, v + Math.sin(a) * r, 0);
    out.push(x, y);
  }
  return out;
}

function keptRanges(total: number, skips: Array<[number, number]>): Array<[number, number]> {
  if (skips.length === 0) return [[0, total]];
  const sorted = [...skips].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  let cursor = 0;
  for (const [a, b] of sorted) {
    if (a > cursor + 1e-3) out.push([cursor, Math.min(a, total)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < total - 1e-3) out.push([cursor, total]);
  return out;
}

// --- emission ----------------------------------------------------------------

export interface RibbonOptions {
  band: number;
  /** World scale used for screen-px width floors. */
  scale: number;
}

/** Tessellate the whole transport network for one zoom band and stream the
 *  projected polygons to the sink. Pure: no Pixi, no DOM. */
export function emitRouteRibbons(map: CityMap, opts: RibbonOptions, sink: RibbonSink): void {
  const band = Math.min(4, Math.max(0, Math.floor(opts.band)));
  const scale = opts.scale;
  const geom = transportGeometry(map);
  const paths = band <= 1 ? geom.coarse : geom.fine;
  const P = RIBBON_PALETTE;
  const ground: Proj = (u, v) => [(u - v) * HALF_W, (u + v) * HALF_H];
  const extra = casingExtra(scale);

  const visible = (kind: RouteClass): boolean =>
    kind === 'rail' ? true : ROAD[kind].minBand <= band;

  // skip ranges (bridge decks + overpass decks redraw these stretches lifted)
  const skipsByPath = new Map<number, Array<[number, number]>>();
  const addSkip = (pathIx: number, a: number, b: number): void => {
    let arr = skipsByPath.get(pathIx);
    if (!arr) {
      arr = [];
      skipsByPath.set(pathIx, arr);
    }
    arr.push([a, b]);
  };
  for (const sp of geom.spans) {
    if (sp.mode !== 'plain') addSkip(sp.pathIx, sp.s0, sp.s1);
  }
  if (band >= 1) {
    for (const op of geom.overpasses) addSkip(op.pathIx, op.s - 0.9, op.s + 0.9);
  }

  const slicesFor = (pathIx: number): SlicePts[] => {
    const path = paths[pathIx];
    if (!path) return [];
    const skips = skipsByPath.get(pathIx) ?? [];
    const out: SlicePts[] = [];
    for (const [a, b] of keptRanges(path.total, skips)) {
      const sl = slicePath(path, a, b);
      if (sl) out.push(sl);
    }
    return out;
  };

  const quad = (color: number, alpha: number, layer: RibbonLayer = 'routes') =>
    (q: number[]): void => sink(q, color, alpha, layer);

  // pass 1 — ALL casings, class ascending
  for (const kind of ROAD_ORDER) {
    if (kind === 'rail') continue;
    const st = ROAD[kind as Exclude<RouteClass, 'rail'>];
    if (!visible(kind) || band < st.casingMinBand) continue;
    const fh = fillHalfFor(kind as Exclude<RouteClass, 'rail'>, band, scale);
    const ch = fh + extra;
    for (let p = 0; p < paths.length; p++) {
      if (paths[p]?.kind !== kind) continue;
      for (const sl of slicesFor(p)) ribbonQuads(sl.pts, sl.s, ch, 0, ground, quad(P.casing, 0.96));
    }
    if (band >= 2) {
      for (const j of geom.junctions) {
        if (j.kind !== kind) continue;
        sink(discPoly(j.u, j.v, fh * 1.2 + extra, ground), P.casing, 0.96, 'routes');
      }
    }
  }

  // pass 2 — ALL fills, class ascending (junctions merge here)
  for (const kind of ROAD_ORDER) {
    if (kind === 'rail') continue;
    const st = ROAD[kind as Exclude<RouteClass, 'rail'>];
    if (!visible(kind)) continue;
    const fh = fillHalfFor(kind as Exclude<RouteClass, 'rail'>, band, scale);
    const alpha = st.alpha[band] ?? 1;
    // far bands have no edge-line detail, so the motorway leans on a
    // lighter fill to read as the map's signature ring
    const fill = kind === 'motorway' && band <= 1 ? RIBBON_PALETTE.motorwayFillFar : st.fill;
    for (let p = 0; p < paths.length; p++) {
      if (paths[p]?.kind !== kind) continue;
      for (const sl of slicesFor(p)) ribbonQuads(sl.pts, sl.s, fh, 0, ground, quad(fill, alpha));
    }
    if (band >= 2) {
      for (const j of geom.junctions) {
        if (j.kind !== kind) continue;
        sink(discPoly(j.u, j.v, fh * 1.2, ground), fill, alpha, 'routes');
      }
    }
  }

  // roundabouts at the big arterial meets (annulus + green island)
  if (band >= 2) {
    const fh = fillHalfFor('arterial', band, scale);
    for (const r of geom.roundabouts) {
      sink(discPoly(r.u, r.v, fh + 0.2 + extra, ground), P.casing, 0.96, 'routes');
      sink(discPoly(r.u, r.v, fh + 0.2, ground), P.arterialFill, 1, 'routes');
      sink(discPoly(r.u, r.v, 0.16 + extra * 0.7, ground), P.casing, 0.96, 'routes');
      sink(discPoly(r.u, r.v, 0.16, ground), P.island, 1, 'routes');
    }
  }

  // pass 3 — road furniture (dashes, edge lines, reservation)
  if (band >= 2) {
    const dashHalf = Math.max(0.011, pxToTiles(0.6, scale));
    const emitDashes = (sl: SlicePts, offset: number, dash: number, gap: number, color: number, alpha: number): void => {
      const walk = makeWalker(sl);
      const first = sl.s[0] ?? 0;
      const last = sl.s[sl.s.length - 1] ?? 0;
      for (let s = first + 0.3; s + dash < last; s += dash + gap) {
        const a = walk(s);
        const b = walk(s + dash);
        if (!a || !b) continue;
        const nuA = a.dv;
        const nvA = -a.du;
        const pts = [
          { u: a.u + nuA * (offset + dashHalf), v: a.v + nvA * (offset + dashHalf) },
          { u: b.u + nuA * (offset + dashHalf), v: b.v + nvA * (offset + dashHalf) },
          { u: b.u + nuA * (offset - dashHalf), v: b.v + nvA * (offset - dashHalf) },
          { u: a.u + nuA * (offset - dashHalf), v: a.v + nvA * (offset - dashHalf) },
        ];
        const flat: number[] = [];
        for (const p of pts) {
          const [x, y] = ground(p.u, p.v, 0);
          flat.push(x, y);
        }
        sink(flat, color, alpha, 'routes');
      }
    };
    const lineHalf = Math.max(0.011, pxToTiles(0.55, scale));
    for (let p = 0; p < paths.length; p++) {
      const path = paths[p];
      if (!path) continue;
      if (path.kind === 'arterial') {
        for (const sl of slicesFor(p)) emitDashes(sl, 0, 0.45, 0.65, P.dash, 0.7);
      } else if (path.kind === 'motorway') {
        const fh = fillHalfFor('motorway', band, scale);
        for (const sl of slicesFor(p)) {
          // cream edge lines, offset perpendicular IN TILE SPACE (this is
          // the fix for the old screen-Y offset bug)
          ribbonQuads(sl.pts, sl.s, lineHalf, fh - 0.032, ground, quad(P.motorwayEdge, 0.85));
          ribbonQuads(sl.pts, sl.s, lineHalf, -(fh - 0.032), ground, quad(P.motorwayEdge, 0.85));
          if (band >= 3) {
            // dual carriageways: central reservation + per-carriageway dashes
            ribbonQuads(sl.pts, sl.s, 0.028, 0, ground, quad(P.reservation, 0.95));
            emitDashes(sl, fh * 0.52, 0.5, 0.9, P.dash, 0.6);
            emitDashes(sl, -fh * 0.52, 0.5, 0.9, P.dash, 0.6);
          } else {
            ribbonQuads(sl.pts, sl.s, 0.018, 0, ground, quad(P.reservation, 0.9));
          }
        }
      }
    }
  }

  // pass 4 — rail, after roads (it bridges/level-crosses them). Identity
  // doctrine (P5): the classic map symbology — a dark line with cream
  // cross-ticks — at every band below the sleeper zoom, so a railway can
  // never be misread as a thin street.
  {
    const farHalf = Math.max(RAIL_FAR_HALF, pxToTiles(2, scale) / 2);
    const ballastHalf = Math.max(RAIL_HALF, pxToTiles(1.6, scale) / 2);
    /** Perpendicular quad centred on the line every RAIL_TICK_SPACING t. */
    const emitTicks = (
      sl: SlicePts,
      halfLen: number,
      halfWid: number,
      alpha: number,
    ): void => {
      const walk = makeWalker(sl);
      const first = sl.s[0] ?? 0;
      const last = sl.s[sl.s.length - 1] ?? 0;
      for (let s = first + RAIL_TICK_SPACING * 0.5; s < last; s += RAIL_TICK_SPACING) {
        const a = walk(s);
        if (!a) continue;
        const nu = a.dv;
        const nv = -a.du;
        const flat: number[] = [];
        for (const [du2, dv2] of [
          [nu * halfLen - a.du * halfWid, nv * halfLen - a.dv * halfWid],
          [nu * halfLen + a.du * halfWid, nv * halfLen + a.dv * halfWid],
          [-nu * halfLen + a.du * halfWid, -nv * halfLen + a.dv * halfWid],
          [-nu * halfLen - a.du * halfWid, -nv * halfLen - a.dv * halfWid],
        ] as const) {
          const [x, y] = ground(a.u + du2, a.v + dv2, 0);
          flat.push(x, y);
        }
        sink(flat, P.railTick, alpha, 'routes');
      }
    };
    for (let p = 0; p < paths.length; p++) {
      const path = paths[p];
      if (path?.kind !== 'rail') continue;
      for (const sl of slicesFor(p)) {
        if (band <= 1) {
          // far zoom: line + cross-ticks (never "thin street")
          ribbonQuads(sl.pts, sl.s, farHalf, 0, ground, quad(P.railFar, 0.92));
          emitTicks(sl, farHalf * 2.6, Math.max(0.014, pxToTiles(0.7, scale)), 0.9);
          continue;
        }
        ribbonQuads(sl.pts, sl.s, ballastHalf + extra * 0.8, 0, ground, quad(P.casing, 0.85));
        ribbonQuads(sl.pts, sl.s, ballastHalf, 0, ground, quad(P.railBallast, 1));
        if (band >= 3) {
          // close zoom: ballast bed + sleeper ticks + twin steel
          const walk = makeWalker(sl);
          const first = sl.s[0] ?? 0;
          const last = sl.s[sl.s.length - 1] ?? 0;
          for (let s = first + 0.15; s < last; s += 0.3) {
            const a = walk(s);
            if (!a) continue;
            const nu = a.dv;
            const nv = -a.du;
            const hl = 0.034;
            const hw = 0.009;
            const flat: number[] = [];
            for (const [du2, dv2] of [
              [nu * hl - a.du * hw, nv * hl - a.dv * hw],
              [nu * hl + a.du * hw, nv * hl + a.dv * hw],
              [-nu * hl + a.du * hw, -nv * hl + a.dv * hw],
              [-nu * hl - a.du * hw, -nv * hl - a.dv * hw],
            ] as const) {
              const [x, y] = ground(a.u + du2, a.v + dv2, 0);
              flat.push(x, y);
            }
            sink(flat, P.sleeper, 0.9, 'routes');
          }
          for (const side of [-0.024, 0.024]) {
            ribbonQuads(sl.pts, sl.s, 0.006, side, ground, quad(P.railSteel, 0.95));
          }
        } else {
          // default zoom: cross-ticks poking past the ballast + thin steel
          emitTicks(sl, ballastHalf * 1.7, Math.max(0.012, pxToTiles(0.55, scale)), 0.75);
          ribbonQuads(sl.pts, sl.s, 0.006, 0, ground, quad(P.railSteel, 0.55));
        }
      }
    }

    // station platform slabs beside the line at their named landmarks
    if (band >= 2) {
      for (const st of geom.stations) {
        const path = paths[st.pathIx];
        if (!path) continue;
        const sl = slicePath(path, st.s - 0.7, st.s + 0.7);
        if (!sl) continue;
        const off = st.side * (ballastHalf + extra * 0.8 + 0.055);
        ribbonQuads(sl.pts, sl.s, 0.05 + extra * 0.6, off, ground, quad(P.casing, 0.9));
        ribbonQuads(sl.pts, sl.s, 0.05, off, ground, quad(P.platform, 1));
        if (band >= 3) {
          // canopy strip along the platform's back edge
          ribbonQuads(sl.pts, sl.s, 0.016, off + st.side * 0.028, ground, quad(P.parapet, 0.9));
        }
      }
    }
  }

  // pass 5 — grade separation decks over motorways
  if (band >= 1) {
    for (const op of geom.overpasses) {
      const path = paths[op.pathIx];
      if (!path || !visible(path.kind)) continue;
      const kind = path.kind;
      const fh = kind === 'rail'
        ? Math.max(RAIL_HALF, pxToTiles(1.6, scale) / 2)
        : fillHalfFor(kind as Exclude<RouteClass, 'rail'>, band, scale);
      const fill = kind === 'rail' ? P.railBallast : ROAD[kind as Exclude<RouteClass, 'rail'>].fill;
      const sl = slicePath(path, op.s - 0.9, op.s + 0.9);
      if (!sl) continue;
      const sMid0 = sl.s[0] ?? 0;
      const sMid1 = sl.s[sl.s.length - 1] ?? 0;
      const zOf = (s: number): number => {
        const edge = Math.min(s - sMid0, sMid1 - s);
        return OVERPASS_Z * Math.min(1, Math.max(0, edge / 0.55));
      };
      const lifted: Proj = (u, v, s) => {
        const [x, y] = ground(u, v, s);
        return [x, y - zOf(s)];
      };
      const shadow: Proj = (u, v, s) => {
        const [x, y] = ground(u, v, s);
        const z = zOf(s);
        return [x - z * 0.55, y + z * 0.3];
      };
      ribbonQuads(sl.pts, sl.s, fh + 0.02, 0, shadow, quad(P.shadow, 0.18));
      ribbonQuads(sl.pts, sl.s, fh + 0.02 + extra, 0, lifted, quad(P.casing, 0.96));
      ribbonQuads(sl.pts, sl.s, fh + 0.02, 0, lifted, quad(lightenHex(fill, 0.16), 1));
      if (band >= 2) {
        for (const side of [-1, 1]) {
          const parapet: Proj = (u, v, s) => {
            const [x, y] = lifted(u, v, s);
            return [x, y - 2 * RES * Math.min(1, zOf(s) / OVERPASS_Z)];
          };
          ribbonQuads(sl.pts, sl.s, 0.008, side * (fh + 0.012), parapet, quad(P.parapet, 0.95));
        }
      }
    }
  }

  // pass 6 — bridges as structures: shadow → piers → deck → parapets
  for (const sp of geom.spans) {
    if (sp.mode === 'plain') continue;
    const path = paths[sp.pathIx];
    if (!path || !visible(path.kind)) continue;
    const kind = path.kind;
    const sl = slicePath(path, sp.s0, sp.s1);
    if (!sl) continue;
    const isPier = sp.mode === 'pier';
    const fh = kind === 'rail'
      ? Math.max(RAIL_HALF, pxToTiles(1.6, scale) / 2)
      : fillHalfFor(kind as Exclude<RouteClass, 'rail'>, band, scale);
    const deckHalf = isPier ? fh * 0.8 : fh + 0.02;
    const deckZ = isPier ? 4 * RES : deckLiftWorldPx(kind);
    const fill = isPier
      ? P.pierWood
      : kind === 'rail'
        ? lightenHex(P.railBallast, 0.18)
        : lightenHex(ROAD[kind as Exclude<RouteClass, 'rail'>].fill, 0.18);
    const s0 = sl.s[0] ?? 0;
    const s1 = sl.s[sl.s.length - 1] ?? 0;
    const zOf = (s: number): number => {
      const edge = Math.min(s - s0, s1 - s);
      return deckZ * Math.min(1, Math.max(0, edge / 0.7));
    };
    const lifted: Proj = (u, v, s) => {
      const [x, y] = ground(u, v, s);
      return [x, y - zOf(s)];
    };
    if (!isPier) {
      const shadow: Proj = (u, v, s) => {
        const [x, y] = ground(u, v, s);
        const z = zOf(s);
        return [x - z * 0.55, y + z * 0.3];
      };
      ribbonQuads(sl.pts, sl.s, deckHalf, 0, shadow, quad(P.shadow, 0.18));
    }
    // piers / piles from the waterline up to the deck
    if (band >= 1) {
      const walk = makeWalker(sl);
      const step = isPier ? 0.8 : 1.2;
      const pw = isPier
        ? 1.2 * RES
        : Math.min(5 * RES, Math.max(1.6 * RES, deckHalf * CELL_W * 0.3));
      for (let s = s0 + 0.7; s <= s1 - 0.7; s += step) {
        const a = walk(s);
        if (!a) continue;
        const [x, y] = ground(a.u, a.v, s);
        const zTop = zOf(s) - 1.5 * RES;
        if (zTop <= 0) continue;
        if (isPier) {
          const nu = a.dv;
          const nv = -a.du;
          for (const side of [-deckHalf * 0.7, deckHalf * 0.7]) {
            const [px, py] = ground(a.u + nu * side, a.v + nv * side, s);
            sink([px - pw, py - zTop, px + pw, py - zTop, px + pw, py + RES, px - pw, py + RES], P.pier, 0.9, 'routes');
          }
        } else {
          sink([x - pw, y - zTop, x + pw, y - zTop, x + pw, y + 1.5 * RES, x - pw, y + 1.5 * RES], P.pier, 0.95, 'routes');
          sink([x - pw * 0.7, y + 2 * RES, x + pw * 0.7, y + 2 * RES, x + pw * 0.7, y + 4.5 * RES, x - pw * 0.7, y + 4.5 * RES], P.reflection, 0.25, 'routes');
        }
      }
    }
    // deck
    if (!isPier) ribbonQuads(sl.pts, sl.s, deckHalf + extra, 0, lifted, quad(P.casing, 0.96));
    ribbonQuads(sl.pts, sl.s, deckHalf, 0, lifted, quad(fill, 1));
    // parapets: near side rides ABOVE road vehicles
    if (band >= 2 && !isPier) {
      // which offset side faces the camera (greater projected y)?
      const a0 = sl.pts[0];
      const a1 = sl.pts[sl.pts.length - 1];
      let nearSide = 1;
      if (a0 && a1) {
        const du = a1.u - a0.u;
        const dv = a1.v - a0.v;
        const len = Math.hypot(du, dv) || 1;
        const nu = dv / len;
        const nv = -du / len;
        nearSide = nu + nv > 0 ? 1 : -1;
      }
      for (const side of [-1, 1]) {
        const parapet: Proj = (u, v, s) => {
          const [x, y] = lifted(u, v, s);
          return [x, y - 2.2 * RES * Math.min(1, zOf(s) / Math.max(1, deckZ))];
        };
        ribbonQuads(
          sl.pts, sl.s, 0.009, side * (deckHalf - 0.006), parapet,
          quad(P.parapet, 0.95, side === nearSide ? 'bridgeTop' : 'routes'),
        );
      }
    }
  }
}

// --- boat wakes (P6) ----------------------------------------------------------

/** Hard per-frame cap on wake quads — the layer must stay trivially cheap. */
export const WAKE_MAX_SEGS = 60;
export const WAKE_COLOR = 0xdfe9f2;

export interface WakeBoat {
  /** Hull position in world px (already projected + lane-offset). */
  x: number;
  y: number;
  /** Unit FORWARD direction of travel, in world px. */
  nx: number;
  ny: number;
  /** Hull length in world px — the wake scales with the vessel. */
  size: number;
}

/** V-wake foam trailing each moving boat: two diverging arms of three
 *  segments each, alpha fading with age (distance astern). Pure world-px
 *  geometry, deterministic, capped — rebuilt per frame ONLY while boats
 *  are visible at the current zoom band. Returns the quad count. */
export function emitBoatWakes(
  boats: WakeBoat[],
  sink: (pts: number[], alpha: number) => void,
): number {
  let segs = 0;
  for (const b of boats) {
    if (segs + 6 > WAKE_MAX_SEGS) break;
    const bx = -b.nx;
    const by = -b.ny;
    // lateral spread, squashed in screen-y so the V lies in the water plane
    const lx = -b.ny;
    const ly = b.nx * 0.55;
    for (const side of [1, -1] as const) {
      let px = b.x + bx * b.size * 0.55 + side * lx * b.size * 0.16;
      let py = b.y + by * b.size * 0.55 + side * ly * b.size * 0.16;
      for (let k = 1; k <= 3; k++) {
        const d = b.size * (0.55 + k * 0.85);
        const w = b.size * (0.16 + k * 0.34);
        const cx = b.x + bx * d + side * lx * w;
        const cy = b.y + by * d + side * ly * w;
        const dx = cx - px;
        const dy = cy - py;
        const len = Math.hypot(dx, dy) || 1;
        const half = (1.7 - k * 0.35) * (b.size / 10);
        const ox = (-dy / len) * half;
        const oy = (dx / len) * half;
        sink(
          [px + ox, py + oy, cx + ox, cy + oy, cx - ox, cy - oy, px - ox, py - oy],
          0.42 - k * 0.11,
        );
        segs++;
        px = cx;
        py = cy;
      }
    }
  }
  return segs;
}
