// Road graph + A* path-finding so the orange vans DRIVE on the street
// network (owner playtest W7b: "follow roads where possible, else move
// orthogonally through building-free tiles") instead of flying straight
// across fields.
//
// The graph is derived from the map's VECTOR routes (the same polylines the
// renderer draws): every drivable route (motorway → street; not rail, not
// the river) is sampled at ~1-tile spacing, each sample QUANTISED to a
// coarse grid so coincident/crossing points collapse onto one shared node —
// that's what lets a van turn where two roads meet. Consecutive samples of a
// route become bidirectional edges. Built once per map and memoised by map
// reference (the map is immutable scenario data).
//
// A van routes depot → fault by driving off-road (straight) to the nearest
// node, following roads, then off-road to the exact site — exactly how a real
// crew leaves the yard, takes the road network, and turns off at the fault.
// Determinism: nodes are integer-keyed, neighbours kept in insertion order,
// and A* breaks ties on the integer key, so a path is a pure function of
// (map, from, to) — the sim stays reproducible.

import { sampleRoute } from '../map/routes';
import type { CityMap, RouteClass } from '../map/types';

/** Road classes a van can drive on (rail + the river barge lane excluded). */
const DRIVABLE: ReadonlySet<RouteClass> = new Set<RouteClass>([
  'motorway',
  'arterial',
  'street',
  'lane',
]);

/** Grid resolution for node quantisation (tiles). Coarser = more merging of
 *  nearby/crossing points into shared junctions; ~0.6 tile keeps junctions
 *  joined without collapsing parallel roads together. */
const NODE_GRID = 0.6;

interface RoadGraph {
  /** Node x,y in tile space (index === node id). */
  xs: Float32Array;
  ys: Float32Array;
  /** neighbours[id] = adjacent node ids. */
  neighbours: number[][];
}

const CACHE = new WeakMap<CityMap, RoadGraph | null>();

function quantKey(x: number, y: number): number {
  const qx = Math.round(x / NODE_GRID);
  const qy = Math.round(y / NODE_GRID);
  // pack into one integer (maps are < ~4096 tiles per side → 13 bits is ample,
  // /NODE_GRID stays well within 16 bits)
  return (qy & 0xffff) * 0x10000 + (qx & 0xffff);
}

/** Build (and memoise) the drivable road graph for a map. Returns null when a
 *  map carries no drivable routes (campaign mini-maps) — callers fall back to
 *  straight-line travel. */
export function roadGraph(map: CityMap): RoadGraph | null {
  const cached = CACHE.get(map);
  if (cached !== undefined) return cached;

  const routes = map.routes ?? [];
  const idOf = new Map<number, number>();
  const xs: number[] = [];
  const ys: number[] = [];
  const neighbours: number[][] = [];

  const node = (x: number, y: number): number => {
    const k = quantKey(x, y);
    let id = idOf.get(k);
    if (id === undefined) {
      id = xs.length;
      idOf.set(k, id);
      xs.push(x);
      ys.push(y);
      neighbours.push([]);
    }
    return id;
  };
  const link = (a: number, b: number): void => {
    if (a === b) return;
    const na = neighbours[a]!;
    const nb = neighbours[b]!;
    if (!na.includes(b)) na.push(b);
    if (!nb.includes(a)) nb.push(a);
  };

  for (const route of routes) {
    if (!DRIVABLE.has(route.kind)) continue;
    const pts = sampleRoute(route, 1.0);
    let prev = -1;
    for (const [x, y] of pts) {
      const id = node(x, y);
      if (prev >= 0) link(prev, id);
      prev = id;
    }
  }

  if (xs.length === 0) {
    CACHE.set(map, null);
    return null;
  }
  const g: RoadGraph = {
    xs: Float32Array.from(xs),
    ys: Float32Array.from(ys),
    neighbours,
  };
  CACHE.set(map, g);
  return g;
}

/** Nearest graph node to a tile, capped at `maxDist` tiles (so a van far from
 *  any road doesn't snap across the county). Returns -1 if none in range. */
function nearestNode(g: RoadGraph, x: number, y: number, maxDist = 18): number {
  let best = -1;
  let bestD = maxDist * maxDist;
  for (let i = 0; i < g.xs.length; i++) {
    const dx = g.xs[i]! - x;
    const dy = g.ys[i]! - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** A* over the road graph between two node ids. Returns the node-id path
 *  (inclusive of both ends) or null if disconnected. Deterministic: the open
 *  set is a simple array scanned for the min f, ties broken by node id. */
function aStar(g: RoadGraph, start: number, goal: number): number[] | null {
  if (start === goal) return [start];
  const n = g.xs.length;
  const gScore = new Float64Array(n).fill(Infinity);
  const fScore = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const open = new Set<number>([start]);
  const h = (i: number): number => Math.hypot(g.xs[i]! - g.xs[goal]!, g.ys[i]! - g.ys[goal]!);
  gScore[start] = 0;
  fScore[start] = h(start);

  let guard = 0;
  const guardCap = n * 4 + 64;
  while (open.size > 0 && guard++ < guardCap) {
    // pick the open node with the lowest f (id-tiebreak for determinism)
    let cur = -1;
    let curF = Infinity;
    for (const i of open) {
      const f = fScore[i]!;
      if (f < curF || (f === curF && i < cur)) {
        curF = f;
        cur = i;
      }
    }
    if (cur === goal) {
      const path: number[] = [cur];
      let c = cur;
      while (came[c]! >= 0) {
        c = came[c]!;
        path.push(c);
      }
      path.reverse();
      return path;
    }
    open.delete(cur);
    const cx = g.xs[cur]!;
    const cy = g.ys[cur]!;
    for (const nb of g.neighbours[cur]!) {
      const tentative = gScore[cur]! + Math.hypot(g.xs[nb]! - cx, g.ys[nb]! - cy);
      if (tentative < gScore[nb]!) {
        came[nb] = cur;
        gScore[nb] = tentative;
        fScore[nb] = tentative + h(nb);
        open.add(nb);
      }
    }
  }
  return null;
}

/** Plan a drive from (fromX,fromY) to (toX,toY) along the road network.
 *  Returns a list of tile waypoints to follow: a straight hop onto the
 *  nearest road, the on-road A* route, then a straight hop off to the exact
 *  destination. Falls back to a single straight segment ([to]) when there is
 *  no usable road (no graph, ends not near a road, or the two ends are on
 *  disconnected road fragments) — the van still gets there, just direct. */
export function planRoute(
  map: CityMap,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Array<[number, number]> {
  const g = roadGraph(map);
  if (!g) return [[toX, toY]];
  // short hops aren't worth routing onto a road
  if (Math.hypot(toX - fromX, toY - fromY) < 3) return [[toX, toY]];
  const a = nearestNode(g, fromX, fromY);
  const b = nearestNode(g, toX, toY);
  if (a < 0 || b < 0) return [[toX, toY]];
  const nodePath = aStar(g, a, b);
  if (!nodePath) return [[toX, toY]];
  const out: Array<[number, number]> = [];
  for (const id of nodePath) out.push([g.xs[id]!, g.ys[id]!]);
  out.push([toX, toY]); // final hop off the road to the exact site
  return out;
}
