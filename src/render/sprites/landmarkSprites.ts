// London's icons, in the sharp-line low-poly style: the skyscraper
// districts and the named landmarks the map places along the river.
// Like everything else they're pure code — ink contours over colour
// blocks, lit by the same lofi sunset.

import { Rng } from '../../sim/rng';
import { CELL_W, INK, INK_W, Iso, lit, P, RES, shaded } from './iso';
import { COLORS } from './palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from './raster';

const STONE = hex('#d9cdb4');
const STONE_DARK = hex('#b3a78e');
const BRICK = hex('#a8543c');

function pavedFloor(iso: Iso): void {
  iso.floor(COLORS.pavement, darken(COLORS.pavement, 0.08));
}

function grassFloor(iso: Iso): void {
  iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);
}

// --- Skyscrapers (CBD districts) -------------------------------------------

/** Glass towers for the City/Canary clusters: three silhouettes — flat-top
 *  slab, slanted crown, and a stepped spire-top. */
export function skyscraperTile(seed: number, kind: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 77191 + kind * 17 + 5);
  pavedFloor(iso);
  const u0 = 0.2;
  const v0 = 0.2;
  const u1 = 0.8;
  const v1 = 0.8;
  const H = 150 + kind * 22 + (seed % 2) * 12;
  iso.shadow(u0, v0, u1, v1, 0.4, 0.3);
  // glass body: dusk face + sunset face
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, 0), P(u0, v1, 0)], COLORS.glassDark, shaded(COLORS.glassSky, 0.2));
  iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1, v1, 0), P(u1, v0, 0)], COLORS.glassSunset, COLORS.glassSky);
  iso.quad(u0, v0, u1, v1, H, COLORS.white);
  // mullion bands
  for (let z = 12; z < H - 6; z += 12) {
    iso.r.poly([P(u0, v1, z + 1.4), P(u1, v1, z + 1.4), P(u1, v1, z), P(u0, v1, z)], alpha(COLORS.white, 0.8));
    iso.r.poly([P(u1, v0, z + 1.4), P(u1, v1, z + 1.4), P(u1, v1, z), P(u1, v0, z)], alpha(COLORS.white, 0.65));
  }
  // lit offices scattered up the dusk face
  for (let z = 14; z < H - 12; z += 12) {
    if (rng.chance(0.45)) {
      const a = rng.range(u0 + 0.04, 0.55);
      iso.r.poly([P(a, v1, z + 8), P(a + 0.18, v1, z + 8), P(a + 0.18, v1, z + 2), P(a, v1, z + 2)], alpha(COLORS.glassLit, 0.85));
    }
  }
  // ink silhouette
  iso.edge(P(u0, v1, H), P(u0, v1, 0));
  iso.edge(P(u1, v1, H), P(u1, v1, 0));
  iso.edge(P(u1, v0, H), P(u1, v0, 0));
  iso.r.polyline([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H), P(u0, v1, H)], INK_W, INK, true);

  if (kind === 0) {
    // flat top: plant screen + twin masts
    iso.box(0.34, 0.34, 0.66, 0.66, H, H + 10, COLORS.steel);
    iso.r.line(P(0.42, 0.42, H + 10), P(0.42, 0.42, H + 26), 1.2 * RES, COLORS.steelDark);
    iso.quad(0.4, 0.4, 0.44, 0.44, H + 26, COLORS.orange);
  } else if (kind === 1) {
    // slanted crown
    iso.r.poly([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H + 18), P(u0, v1, H + 18)], COLORS.glassSky);
    iso.r.polyline([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H + 18), P(u0, v1, H + 18)], INK_W, INK, true);
  } else {
    // stepped spire
    iso.box(0.3, 0.3, 0.7, 0.7, H, H + 12, COLORS.white);
    iso.box(0.4, 0.4, 0.6, 0.6, H + 12, H + 24, COLORS.white);
    iso.r.line(P(0.5, 0.5, H + 24), P(0.5, 0.5, H + 42), 1.4 * RES, COLORS.steelDark);
  }
  return iso.build();
}

// --- Riverside icons ---------------------------------------------------------

/** Parliament: the long gothic hall and the clock tower. */
export function parliamentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  // the hall
  iso.shadow(0.08, 0.36, 0.7, 0.74, 0.18, 0.22);
  iso.box(0.08, 0.36, 0.7, 0.74, 0, 26, STONE);
  iso.gable(0.08, 0.36, 0.7, 0.74, 26, 8, 'u', darken(STONE_DARK, 0.15), STONE);
  // gothic window ribs along the front
  for (let u = 0.12; u < 0.66; u += 0.07) {
    iso.r.line(P(u, 0.74, 4), P(u, 0.74, 22), 0.9 * RES, shaded(STONE, 0.3));
  }
  // pinnacles
  for (const u of [0.08, 0.38, 0.7]) {
    iso.box(u - 0.012, 0.34, u + 0.012, 0.38, 26, 40, STONE);
  }
  // the clock tower
  const tu = 0.8;
  const tv = 0.62;
  iso.box(tu - 0.05, tv - 0.05, tu + 0.05, tv + 0.05, 0, 64, STONE);
  // clock faces (left + right) with hands
  for (const side of ['l', 'r'] as const) {
    const f: Pt = side === 'l' ? P(tu, tv + 0.051, 56) : P(tu + 0.051, tv, 56);
    const r = 4.6 * RES;
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pts.push([f[0] + Math.cos(a) * r, f[1] + Math.sin(a) * r * 0.92]);
    }
    iso.r.poly(pts, COLORS.white);
    iso.r.polyline(pts, INK_W * 0.7, INK, true);
    iso.r.line(f, [f[0] + r * 0.55, f[1] - r * 0.3], 0.8 * RES, INK);
    iso.r.line(f, [f[0] - r * 0.2, f[1] - r * 0.55], 0.8 * RES, INK);
  }
  // belfry + spire
  iso.box(tu - 0.055, tv - 0.055, tu + 0.055, tv + 0.055, 64, 72, STONE_DARK);
  iso.hip(tu - 0.05, tv - 0.05, tu + 0.05, tv + 0.05, 72, 16, hex('#46518f'));
  return iso.build();
}

/** The big observation wheel, pods and all. */
export function eyeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  grassFloor(iso);
  const [cx, cyB] = P(0.5, 0.55, 0);
  const R = 0.36 * (CELL_W / 2);
  const cy = cyB - 52 * RES;
  // A-frame legs
  iso.r.line([cx - 14 * RES, cyB], [cx, cy], 2 * RES, COLORS.white);
  iso.r.line([cx + 14 * RES, cyB], [cx, cy], 2 * RES, COLORS.white);
  // rim (two strokes for depth) + spokes + pods
  const rim: Pt[] = [];
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    rim.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.96]);
  }
  iso.r.polyline(rim, 1.6 * RES, COLORS.steel);
  iso.r.polyline(rim.map(([x, y]): Pt => [x, y - 1.6 * RES]), 0.9 * RES, alpha(COLORS.white, 0.85));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = cx + Math.cos(a) * R;
    const sy = cy + Math.sin(a) * R * 0.96;
    iso.r.line([cx, cy], [sx, sy], 0.7 * RES, alpha(COLORS.steel, 0.8));
    // pod
    iso.r.poly(
      [[sx - 2.4 * RES, sy - 1.8 * RES], [sx + 2.4 * RES, sy - 1.8 * RES], [sx + 2.4 * RES, sy + 1.8 * RES], [sx - 2.4 * RES, sy + 1.8 * RES]],
      i % 3 === 0 ? COLORS.orange : COLORS.glassSky,
    );
  }
  iso.r.poly([[cx - 2.5 * RES, cy - 2.5 * RES], [cx + 2.5 * RES, cy - 2.5 * RES], [cx + 2.5 * RES, cy + 2.5 * RES], [cx - 2.5 * RES, cy + 2.5 * RES]], COLORS.white);
  return iso.build();
}

/** The cathedral: nave, drum, dome and lantern. */
export function domeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  iso.shadow(0.12, 0.3, 0.86, 0.72, 0.2, 0.22);
  iso.box(0.12, 0.3, 0.86, 0.72, 0, 24, STONE);
  // columned front (right face)
  for (let v = 0.34; v < 0.7; v += 0.06) {
    iso.r.line(P(0.86, v, 2), P(0.86, v, 20), 1 * RES, shaded(STONE, 0.25));
  }
  // drum + dome
  const [cx, cyB] = P(0.48, 0.5, 0);
  const drum = 34 * RES;
  iso.box(0.36, 0.38, 0.6, 0.62, 24, 34, STONE_DARK);
  const R = 0.17 * (CELL_W / 2);
  const domePts = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (i / 10);
      pts.push([cx + Math.cos(a) * R * s, cyB - drum - Math.sin(a) * R * 1.1 * s]);
    }
    return pts;
  };
  iso.r.poly(domePts(1), shaded(hex('#5e7d6b'), 0.1));
  iso.r.poly(domePts(0.7), lit(hex('#5e7d6b'), 0.12));
  iso.r.polyline(domePts(1), INK_W, INK);
  // lantern + gold cross
  iso.r.rect(cx - 1.6 * RES, cyB - drum - R * 1.1 - 8 * RES, cx + 1.6 * RES, cyB - drum - R * 1.1, COLORS.white);
  iso.r.line([cx, cyB - drum - R * 1.1 - 8 * RES], [cx, cyB - drum - R * 1.1 - 13 * RES], 1 * RES, COLORS.glassLit);
  iso.r.line([cx - 2 * RES, cyB - drum - R * 1.1 - 11 * RES], [cx + 2 * RES, cyB - drum - R * 1.1 - 11 * RES], 1 * RES, COLORS.glassLit);
  return iso.build();
}

/** The glass shard: a tapering spire of sunset glass. */
export function spireTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  const H = 200;
  const u = 0.5;
  const v = 0.5;
  const base = 0.26;
  iso.shadow(u - base, v - base * 0.5, u + base, v + base, 0.42, 0.3);
  const apex = P(u + 0.02, v - 0.02, H);
  // three visible shards
  iso.r.poly([P(u - base, v + base, 0), P(u + base * 0.2, v + base, 0), apex], COLORS.glassDark);
  iso.r.poly([P(u + base * 0.2, v + base, 0), P(u + base, v + base * 0.2, 0), apex], COLORS.glassSunset);
  iso.r.poly([P(u + base, v + base * 0.2, 0), P(u + base, v - base, 0), apex], COLORS.glassSky);
  iso.edge(P(u - base, v + base, 0), apex);
  iso.edge(P(u + base * 0.2, v + base, 0), apex);
  iso.edge(P(u + base, v + base * 0.2, 0), apex);
  iso.edge(P(u + base, v - base, 0), apex);
  // splinter top
  iso.r.line(apex, [apex[0] + 1.5 * RES, apex[1] - 6 * RES], 1 * RES, alpha(COLORS.glassSky, 0.9));
  return iso.build();
}

/** The fortress: stone keep, corner turrets, banner. */
export function fortressTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  grassFloor(iso);
  // curtain wall
  iso.box(0.14, 0.14, 0.86, 0.86, 0, 10, STONE_DARK);
  iso.quad(0.18, 0.18, 0.82, 0.82, 10, lighten(COLORS.grass, 0.02));
  // keep
  iso.shadow(0.32, 0.32, 0.68, 0.68, 0.16, 0.2);
  iso.box(0.32, 0.32, 0.68, 0.68, 10, 42, STONE);
  // corner turrets with caps
  for (const [u, v] of [
    [0.32, 0.32],
    [0.68, 0.32],
    [0.32, 0.68],
    [0.68, 0.68],
  ] as const) {
    iso.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, 10, 50, STONE);
    iso.hip(u - 0.06, v - 0.06, u + 0.06, v + 0.06, 50, 9, hex('#46518f'));
  }
  // arrow slits + banner
  iso.r.line(P(0.5, 0.68, 22), P(0.5, 0.68, 32), 1 * RES, INK);
  iso.r.line(P(0.6, 0.68, 20), P(0.6, 0.68, 30), 1 * RES, INK);
  const flag = P(0.68, 0.32, 50);
  iso.r.line(flag, [flag[0], flag[1] - 9 * RES], 0.9 * RES, INK);
  iso.r.poly([[flag[0], flag[1] - 9 * RES], [flag[0] + 6 * RES, flag[1] - 7.5 * RES], [flag[0], flag[1] - 6 * RES]], COLORS.orange);
  return iso.build();
}

/** Twin-tower bascule bridge deck, one river tile's worth. The deck runs
 *  with the road (N–S through the cell); towers rise beside the carriageway. */
export function towerBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  iso.floor(COLORS.water, COLORS.waterDeep);
  const deckZ = 7;
  // deck slab carrying the road N–S
  iso.r.poly([P(0.3, 0, deckZ), P(0.7, 0, deckZ), P(0.7, 1, deckZ), P(0.3, 1, deckZ)], COLORS.road, COLORS.roadDark);
  iso.r.line(P(0.5, 0.04, deckZ), P(0.5, 0.96, deckZ), 0.9 * RES, alpha(COLORS.marking, 0.7));
  // side girders in the brand blue
  for (const u of [0.3, 0.7]) {
    iso.r.poly([P(u, 0, deckZ + 3), P(u, 1, deckZ + 3), P(u, 1, deckZ - 2), P(u, 0, deckZ - 2)], hex('#5e8fc2'));
    iso.r.line(P(u, 0, deckZ + 3), P(u, 1, deckZ + 3), INK_W, INK);
  }
  // stone towers either side of the deck with navy caps
  for (const [u, v] of [
    [0.2, 0.3],
    [0.8, 0.7],
  ] as const) {
    iso.shadow(u - 0.07, v - 0.05, u + 0.07, v + 0.08, 0.1, 0.16);
    iso.box(u - 0.07, v - 0.07, u + 0.07, v + 0.07, -2, 40, STONE);
    iso.hip(u - 0.085, v - 0.085, u + 0.085, v + 0.085, 40, 11, hex('#46518f'));
  }
  // suspension chains swooping between the towers
  const a = P(0.2, 0.3, 38);
  const b = P(0.8, 0.7, 38);
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 14 * RES];
  const chain: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    chain.push([
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mid[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * mid[1] + t * t * b[1],
    ]);
  }
  iso.r.polyline(chain, 1.1 * RES, COLORS.white);
  return iso.build();
}

/** The Olympic bowl: sweeping white ring over an orange seat line. */
export function stadiumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  grassFloor(iso);
  const [cx, cyB] = P(0.5, 0.5, 0);
  const ringPts = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  const RX = 0.42 * (CELL_W / 2);
  const RY = RX * 0.5;
  iso.shadow(0.16, 0.3, 0.86, 0.74, 0.16, 0.2);
  // bowl wall
  iso.r.poly([...ringPts(RX, RY, 0), ...ringPts(RX, RY, 16 * RES).reverse()], COLORS.white);
  // seating ring + pitch
  iso.r.poly(ringPts(RX * 0.92, RY * 0.92, 16 * RES), COLORS.orange);
  iso.r.poly(ringPts(RX * 0.62, RY * 0.62, 14 * RES), darken(COLORS.orange, 0.25));
  iso.r.poly(ringPts(RX * 0.5, RY * 0.5, 12 * RES), hex('#5f9e4e'));
  iso.r.polyline(ringPts(RX, RY, 16 * RES), INK_W, INK, true);
  iso.r.polyline(ringPts(RX, RY, 0), INK_W * 0.8, alpha(INK, 0.55), true);
  // floodlight masts
  for (const a of [0.8, 2.4, 4.0, 5.5]) {
    const sx = cx + Math.cos(a) * RX * 1.04;
    const sy = cyB + Math.sin(a) * RY * 1.04;
    iso.r.line([sx, sy], [sx, sy - 26 * RES], 0.9 * RES, COLORS.steelDark);
    iso.r.rect(sx - 2 * RES, sy - 29 * RES, sx + 2 * RES, sy - 26 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** A football ground: tighter bowl, navy stands, green pitch. */
export function arenaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  const [cx, cyB] = P(0.5, 0.5, 0);
  const RX = 0.36 * (CELL_W / 2);
  const RY = RX * 0.52;
  const ring = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  iso.shadow(0.2, 0.32, 0.82, 0.72, 0.14, 0.18);
  iso.r.poly([...ring(RX, RY, 0), ...ring(RX, RY, 13 * RES).reverse()], hex('#46518f'));
  iso.r.poly(ring(RX * 0.9, RY * 0.9, 13 * RES), COLORS.white);
  iso.r.poly(ring(RX * 0.58, RY * 0.58, 11 * RES), hex('#5f9e4e'));
  // pitch markings
  iso.r.line([cx - RX * 0.45, cyB - 11 * RES], [cx + RX * 0.45, cyB - 11 * RES], 0.7 * RES, alpha(COLORS.white, 0.8));
  iso.r.polyline(ring(RX, RY, 13 * RES), INK_W, INK, true);
  return iso.build();
}

/** The glass-roofed mall, anchor store and car park. */
export function mallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  iso.shadow(0.06, 0.12, 0.8, 0.66, 0.18, 0.22);
  iso.box(0.06, 0.12, 0.8, 0.66, 0, 24, hex('#e0d6c2'));
  // barrel glass roof along the spine
  for (let i = 0; i < 3; i++) {
    const v0 = 0.16 + i * 0.17;
    iso.r.poly(
      [P(0.1, v0, 24), P(0.76, v0, 24), P(0.76, v0 + 0.07, 30), P(0.1, v0 + 0.07, 30)],
      alpha(COLORS.glassSky, 0.92),
    );
    iso.r.poly(
      [P(0.1, v0 + 0.07, 30), P(0.76, v0 + 0.07, 30), P(0.76, v0 + 0.14, 24), P(0.1, v0 + 0.14, 24)],
      alpha(lighten(COLORS.glassSky, 0.15), 0.92),
    );
    iso.r.line(P(0.1, v0 + 0.07, 30), P(0.76, v0 + 0.07, 30), 0.8 * RES, alpha(COLORS.white, 0.9));
  }
  // grand glass entrance + orange sign band
  iso.r.poly([P(0.8 + 0.001, 0.24, 18), P(0.8 + 0.001, 0.54, 18), P(0.8 + 0.001, 0.54, 0), P(0.8 + 0.001, 0.24, 0)], COLORS.glassLit);
  iso.r.poly([P(0.8 + 0.001, 0.18, 23), P(0.8 + 0.001, 0.6, 23), P(0.8 + 0.001, 0.6, 19), P(0.8 + 0.001, 0.18, 19)], COLORS.orange);
  // car park rows
  const carColors: RGBA[] = [COLORS.glassDark, hex('#c9453a'), COLORS.white, COLORS.steel];
  for (const v of [0.76, 0.86]) {
    for (let u = 0.12; u < 0.72; u += 0.11) {
      const [px, py] = P(u, v, 1);
      const c = carColors[Math.floor(u * 10) % carColors.length] ?? COLORS.white;
      iso.r.rect(px - 3.4 * RES, py - 2 * RES, px + 3.4 * RES, py + 2 * RES, c);
    }
  }
  return iso.build();
}

/** The zoo: variant 0 is the paddocks (giraffes!), 1 the great aviary. */
export function zooTile(seed: number, variantIx: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60601 + variantIx * 13 + 7);
  grassFloor(iso);
  if (variantIx === 0) {
    // perimeter fence
    for (const [a, b, c, d] of [
      [0.06, 0.06, 0.94, 0.09],
      [0.06, 0.91, 0.94, 0.94],
      [0.06, 0.06, 0.09, 0.94],
      [0.91, 0.06, 0.94, 0.94],
    ] as const) {
      iso.box(a, b, c, d, 0, 4, hex('#7a5a3c'), { ink: false });
    }
    // pond + sandy paddock
    iso.quad(0.14, 0.6, 0.4, 0.84, 0, COLORS.water);
    iso.quad(0.5, 0.16, 0.86, 0.5, 0, lighten(COLORS.sand, 0.05), COLORS.sand);
    // giraffes: necks and legs in ink with tan bodies
    for (const [u, v] of [
      [0.6, 0.3],
      [0.74, 0.4],
    ] as const) {
      const [bx, by] = P(u, v, 0);
      iso.r.rect(bx - 3 * RES, by - 8 * RES, bx + 3.4 * RES, by - 4.5 * RES, hex('#e3b863'));
      iso.r.line([bx - 2.2 * RES, by - 4.5 * RES], [bx - 2.2 * RES, by], 0.9 * RES, INK);
      iso.r.line([bx + 2.6 * RES, by - 4.5 * RES], [bx + 2.6 * RES, by], 0.9 * RES, INK);
      iso.r.line([bx + 3 * RES, by - 8 * RES], [bx + 5 * RES, by - 15 * RES], 1.1 * RES, hex('#e3b863'));
      iso.r.rect(bx + 4.2 * RES, by - 17 * RES, bx + 6.4 * RES, by - 15 * RES, hex('#e3b863'));
    }
    // a keeper's hut
    iso.box(0.2, 0.2, 0.34, 0.34, 0, 9, hex('#5d7a45'));
    iso.hip(0.18, 0.18, 0.36, 0.36, 9, 5, hex('#46518f'));
  } else {
    // the great aviary: a netted lattice dome
    const [cx, cyB] = P(0.5, 0.52, 0);
    const R = 0.3 * (CELL_W / 2);
    const H = 36 * RES;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = Math.PI * t;
      // meridians
      iso.r.line([cx - Math.cos(a) * R, cyB - Math.sin(a) * 4 * RES], [cx - Math.cos(a) * R * 0.1, cyB - H], 0.8 * RES, COLORS.steelDark);
    }
    for (let j = 1; j <= 3; j++) {
      const t = j / 4;
      const ring: Pt[] = [];
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ring.push([cx + Math.cos(a) * R * (1 - t * 0.85), cyB - H * t + Math.sin(a) * R * 0.32 * (1 - t * 0.8)]);
      }
      iso.r.polyline(ring, 0.7 * RES, alpha(COLORS.steelDark, 0.8), true);
    }
    // birds
    for (let i = 0; i < 4; i++) {
      const bx = cx + rng.range(-R * 0.5, R * 0.5);
      const by = cyB - rng.range(H * 0.4, H * 0.9);
      iso.r.line([bx - 2 * RES, by], [bx, by - 1.6 * RES], 0.8 * RES, INK);
      iso.r.line([bx, by - 1.6 * RES], [bx + 2 * RES, by], 0.8 * RES, INK);
    }
    // flamingo pool
    iso.quad(0.6, 0.7, 0.84, 0.9, 0, COLORS.water);
    for (const u of [0.66, 0.74]) {
      const [fx, fy] = P(u, 0.79, 0);
      iso.r.line([fx, fy], [fx, fy - 4 * RES], 0.8 * RES, hex('#d6566e'));
      iso.r.rect(fx - 1.6 * RES, fy - 6.4 * RES, fx + 1.6 * RES, fy - 4 * RES, hex('#d6566e'));
    }
  }
  return iso.build();
}

/** The decommissioned river power station: brick cathedral, four chimneys. */
export function powerstationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  pavedFloor(iso);
  iso.shadow(0.1, 0.2, 0.86, 0.74, 0.2, 0.24);
  iso.box(0.1, 0.2, 0.86, 0.74, 0, 38, BRICK);
  // long window strips
  iso.windowsLeft(0.74, 0.16, 0.8, 16, 30, 5, alpha(COLORS.glassDark, 0.95), COLORS.white);
  // four white chimneys at the corners
  for (const [u, v] of [
    [0.16, 0.26],
    [0.8, 0.26],
    [0.16, 0.68],
    [0.8, 0.68],
  ] as const) {
    iso.box(u - 0.035, v - 0.035, u + 0.035, v + 0.035, 38, 86, COLORS.white);
    iso.quad(u - 0.04, v - 0.04, u + 0.04, v + 0.04, 86, COLORS.steelDark);
  }
  return iso.build();
}
