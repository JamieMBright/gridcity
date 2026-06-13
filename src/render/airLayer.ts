// P7 air layer: flight arcs, animated planes and their ground shadows over
// the airports (docs/transport-overhaul.md §5 "Air"). Everything here is
// pure, deterministic geometry — quadratic arcs in tile space, projected
// through the same iso transform as the route ribbons, streamed through a
// renderer-agnostic sink so MapRenderer and tools/preview.ts draw the
// IDENTICAL picture. No RNG anywhere: plane positions are a pure function
// of time, so the animation can never disturb the sim's determinism.
//
// Westerly operation, like the real airfield: departures lift off to the
// west and climb out over the M25; arrivals descend in from the east over
// town. Planes carry an altitude-scaled ground shadow displaced the same
// way every lifted deck displaces its shadow (z · (−0.55, +0.3)).

import type { AirportSpec } from '../data/londonMap';
import { CELL_W, FLOOR_H, RES } from './sprites/iso';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;

export const AIR_PALETTE = {
  plane: 0xf4f1ea,
  tail: 0xff8a1e,
  shadow: 0x06080f,
  arc: 0xe8e2d2,
} as const;

/** Cruise altitude in world px (plane lift = alt · this). */
export const AIR_LIFT_WPX = 130 * RES;
/** Planes declutter IN from the mid band outward (bands 0..this). */
export const AIR_MAX_BAND = 2;

export interface FlightArc {
  kind: 'departure' | 'arrival';
  /** Quadratic Bézier in tile space: runway end / map edge + control. */
  p0: [number, number];
  c: [number, number];
  p1: [number, number];
  /** Seconds for one full run (the animation loops). */
  dur: number;
  /** Phase offset (0..1) so the fleet never bunches. */
  phase: number;
}

/** Two departure + two arrival arcs per airport, aligned with the real
 *  westerly operation. Deterministic: same airports, same arcs. */
export function flightArcsFor(airports: AirportSpec[]): FlightArc[] {
  const arcs: FlightArc[] = [];
  for (const ap of airports) {
    // runway thresholds sit just east of the terminal, one per runway
    const north: [number, number] = [ap.x + 9, ap.y - 2.5];
    const south: [number, number] = [ap.x + 9, ap.y + 2.5];
    arcs.push(
      { kind: 'departure', p0: north, c: [ap.x - 30, ap.y - 12], p1: [0, ap.y - 34], dur: 95, phase: 0 },
      { kind: 'departure', p0: south, c: [ap.x - 28, ap.y + 14], p1: [0, ap.y + 38], dur: 105, phase: 0.45 },
      { kind: 'arrival', p0: [255, ap.y - 44], c: [ap.x + 95, ap.y - 18], p1: north, dur: 115, phase: 0.2 },
      { kind: 'arrival', p0: [255, ap.y + 40], c: [ap.x + 100, ap.y + 16], p1: south, dur: 100, phase: 0.7 },
    );
  }
  return arcs;
}

/** Altitude profile along an arc: fast climb-out / long descent, on the
 *  ground exactly at the runway end. */
export function altAt(arc: FlightArc, t: number): number {
  const CLIMB = 0.5;
  return arc.kind === 'departure'
    ? Math.sqrt(Math.min(1, Math.max(0, t) / CLIMB))
    : Math.sqrt(Math.min(1, Math.max(0, 1 - t) / CLIMB));
}

export interface PlaneState {
  /** Tile-space position. */
  u: number;
  v: number;
  /** Unit tile-space heading. */
  du: number;
  dv: number;
  /** 0 = on the runway, 1 = cruise. */
  alt: number;
  /** Fades in/out at the map edge so planes never pop. */
  fade: number;
  /** Loop parameter actually used (handy for tests). */
  t: number;
}

/** The plane on `arc` at absolute animation time `tSec`. Pure. */
export function planeAt(arc: FlightArc, tSec: number): PlaneState {
  const raw = (tSec / arc.dur + arc.phase) % 1;
  const t = raw < 0 ? raw + 1 : raw;
  const m = 1 - t;
  const u = m * m * arc.p0[0] + 2 * m * t * arc.c[0] + t * t * arc.p1[0];
  const v = m * m * arc.p0[1] + 2 * m * t * arc.c[1] + t * t * arc.p1[1];
  let du = m * (arc.c[0] - arc.p0[0]) + t * (arc.p1[0] - arc.c[0]);
  let dv = m * (arc.c[1] - arc.p0[1]) + t * (arc.p1[1] - arc.c[1]);
  const len = Math.hypot(du, dv) || 1;
  du /= len;
  dv /= len;
  const edge = arc.kind === 'departure' ? (1 - t) / 0.08 : t / 0.08;
  return { u, v, du, dv, alt: altAt(arc, t), fade: Math.max(0, Math.min(1, edge)), t };
}

export type AirSink = (points: number[], color: number, alpha: number) => void;

function ground(u: number, v: number): [number, number] {
  return [(u - v) * HALF_W, (u + v) * HALF_H];
}

/** Faint dashed flight-path arcs, lifted along the altitude profile and
 *  fading toward the map edge. Static per zoom bucket — build once, not
 *  per frame. `scale` feeds the screen-px thickness floor. */
export function emitFlightArcs(airports: AirportSpec[], scale: number, sink: AirSink): void {
  const half = Math.max(1.4 * RES, 0.6 / Math.max(scale, 1e-6));
  for (const arc of flightArcsFor(airports)) {
    const N = 44;
    const at = (t: number): [number, number] => {
      const m = 1 - t;
      const u = m * m * arc.p0[0] + 2 * m * t * arc.c[0] + t * t * arc.p1[0];
      const v = m * m * arc.p0[1] + 2 * m * t * arc.c[1] + t * t * arc.p1[1];
      const [x, y] = ground(u, v);
      return [x, y - altAt(arc, t) * AIR_LIFT_WPX];
    };
    for (let i = 0; i < N; i += 2) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const tm = (t0 + t1) / 2;
      // taper toward both ends of the run
      const taper = Math.min(1, Math.min(tm, 1 - tm) / 0.12);
      if (taper <= 0.02) continue;
      const [ax, ay] = at(t0);
      const [bx, by] = at(t1);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * half;
      const oy = (dx / len) * half;
      sink([ax + ox, ay + oy, bx + ox, by + oy, bx - ox, by - oy, ax - ox, ay - oy], AIR_PALETTE.arc, 0.16 * taper);
    }
  }
}

/** Tiny lofi silhouette: fuselage + swept wings + tailplane, one polygon
 *  in (forward, right) units of the plane's size. */
const PLANE_OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0],
  [0.32, 0.05],
  [0.1, 0.07],
  [-0.06, 0.44],
  [-0.18, 0.44],
  [-0.16, 0.07],
  [-0.36, 0.05],
  [-0.44, 0.24],
  [-0.52, 0.24],
  [-0.5, 0.03],
  [-0.5, -0.03],
  [-0.52, -0.24],
  [-0.44, -0.24],
  [-0.36, -0.05],
  [-0.16, -0.07],
  [-0.18, -0.44],
  [-0.06, -0.44],
  [0.1, -0.07],
  [0.32, -0.05],
];

/** One plane per arc: ground shadow first (scaled + faded by altitude),
 *  then the lifted silhouette with its orange tailfin. Per-frame, but a
 *  handful of polys — call only while the layer is visible at the band. */
export function emitPlanes(airports: AirportSpec[], tSec: number, scale: number, sink: AirSink): void {
  for (const arc of flightArcsFor(airports)) {
    const st = planeAt(arc, tSec);
    if (st.fade <= 0.02) continue;
    const [gx, gy] = ground(st.u, st.v);
    const lift = st.alt * AIR_LIFT_WPX;
    // screen-px size floor keeps planes readable at the far band
    const size = Math.max((11 + 7 * st.alt) * RES, 5.5 / Math.max(scale, 1e-6));
    // heading projected into screen space
    let fx = (st.du - st.dv) * HALF_W;
    let fy = (st.du + st.dv) * HALF_H;
    const fl = Math.hypot(fx, fy) || 1;
    fx /= fl;
    fy /= fl;
    const rx = -fy;
    const ry = fx;
    // ground shadow, displaced like every lifted deck: z · (−0.55, +0.3)
    const sx = gx - lift * 0.55;
    const sy = gy + lift * 0.3;
    const srx = size * 0.42;
    const sry = size * 0.2;
    const sh: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      sh.push(sx + Math.cos(a) * srx, sy + Math.sin(a) * sry);
    }
    sink(sh, AIR_PALETTE.shadow, 0.22 * (1 - st.alt * 0.55) * st.fade);
    const px = gx;
    const py = gy - lift;
    const body: number[] = [];
    for (const [f, r] of PLANE_OUTLINE) {
      body.push(px + (fx * f + rx * r) * size, py + (fy * f + ry * r) * size);
    }
    sink(body, AIR_PALETTE.plane, 0.95 * st.fade);
    // orange tailfin accent
    const tail: number[] = [];
    for (const [f, r] of [
      [-0.3, 0],
      [-0.52, 0.15],
      [-0.52, -0.15],
    ] as const) {
      tail.push(px + (fx * f + rx * r) * size, py + (fy * f + ry * r) * size);
    }
    sink(tail, AIR_PALETTE.tail, 0.95 * st.fade);
  }
}
