// World/terrain tiles in the clean low-poly style. Connectivity-dependent
// families (water shores, roads) are baked as 16 variants indexed by a
// NESW bitmask. Edge mapping in iso: N neighbour shares the v=0 edge,
// E shares u=1, S shares v=1, W shares u=0.

import { Rng } from '../../sim/rng';
import { INK, INK_W, Iso, lit, P, RES, shaded, top } from './iso';
import { COLORS } from './palette';
import { alpha, darken, lighten } from './raster';

function grassBase(iso: Iso): void {
  iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);
}

export function grassTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 9176 + 5);
  grassBase(iso);
  // occasional soft meadow facet for variety
  if (rng.chance(0.6)) {
    const u = rng.range(0.2, 0.7);
    const v = rng.range(0.2, 0.7);
    iso.quad(u, v, u + 0.25, v + 0.25, 0, alpha(lighten(COLORS.grass, 0.12), 0.5));
  }
  if (rng.chance(0.4)) {
    iso.ball(rng.range(0.25, 0.75), rng.range(0.25, 0.75), 0.07, 14, COLORS.treeLime);
  }
  return iso.build();
}

export function fieldTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7333 + 3);
  iso.floor(COLORS.field, COLORS.fieldDark);
  // crop rows along the u axis
  for (let v = 0.12; v < 0.95; v += 0.18) {
    iso.quad(0.04, v, 0.96, v + 0.05, 0, alpha(darken(COLORS.fieldDark, 0.12), 0.55));
  }
  if (rng.chance(0.25)) iso.ball(0.85, 0.15, 0.06, 12, COLORS.treeDeep);
  return iso.build();
}

export function hillTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5210 + 7);
  iso.floor(lighten(COLORS.moor, 0.05), darken(COLORS.moor, 0.12));
  // faceted plateau rise
  const h = 12 + rng.int(6);
  iso.r.poly([P(0.15, 0.85, h), P(0.85, 0.85, h), P(1, 1, 0), P(0, 1, 0)], shaded(COLORS.moor, 0.16));
  iso.r.poly([P(0.85, 0.15, h), P(0.85, 0.85, h), P(1, 1, 0), P(1, 0, 0)], lit(COLORS.moor, 0.06));
  iso.quad(0.15, 0.15, 0.85, 0.85, h, top(COLORS.moor, 0.16));
  if (rng.chance(0.5)) iso.cone(0.5, 0.4, 0.09, 24, COLORS.treeDeep, h);
  return iso.build();
}

export function waterTile(seed: number, landMask: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 6121 + landMask * 17 + 1);
  iso.floor(COLORS.water, COLORS.waterDeep);
  // sunset glint streaks
  for (let i = 0; i < 3; i++) {
    const u = rng.range(0.05, 0.6);
    const v = rng.range(0.1, 0.75);
    const len = rng.range(0.18, 0.4);
    iso.quad(u, v, u + len, v + 0.045, 0, alpha(COLORS.waterGlint, 0.4));
  }
  // sandy shore bands along land edges
  const sandTop = lighten(COLORS.sand, 0.05);
  const w = 0.14;
  if (landMask & 1) iso.quad(0, 0, 1, w, 0, sandTop, COLORS.sand); // N edge (v=0)
  if (landMask & 2) iso.quad(1 - w, 0, 1, 1, 0, sandTop, COLORS.sand); // E edge (u=1)
  if (landMask & 4) iso.quad(0, 1 - w, 1, 1, 0, sandTop, COLORS.sand); // S edge (v=1)
  if (landMask & 8) iso.quad(0, 0, w, 1, 0, sandTop, COLORS.sand); // W edge (u=0)
  return iso.build();
}

export function roadTile(seed: number, mask: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  iso.floor(COLORS.pavement, darken(COLORS.pavement, 0.08));
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const s = (mask & 4) !== 0;
  const w = (mask & 8) !== 0;
  const a = 0.3; // road half-band start
  const b = 0.7; // road half-band end
  const R = COLORS.road;
  const Rd = COLORS.roadDark;
  // arms from each connected edge to the centre block
  if (n) iso.quad(a, 0, b, 0.5, 0, R, Rd);
  if (s) iso.quad(a, 0.5, b, 1, 0, R, Rd);
  if (w) iso.quad(0, a, 0.5, b, 0, R, Rd);
  if (e) iso.quad(0.5, a, 1, b, 0, R, Rd);
  iso.quad(a, a, b, b, 0, R, Rd);
  // crisp kerb lines along each arm
  const kerb = alpha(INK, 0.4);
  if (n) {
    iso.r.line(P(a, 0, 0), P(a, a, 0), INK_W * 0.7, kerb);
    iso.r.line(P(b, 0, 0), P(b, a, 0), INK_W * 0.7, kerb);
  }
  if (s) {
    iso.r.line(P(a, b, 0), P(a, 1, 0), INK_W * 0.7, kerb);
    iso.r.line(P(b, b, 0), P(b, 1, 0), INK_W * 0.7, kerb);
  }
  if (w) {
    iso.r.line(P(0, a, 0), P(a, a, 0), INK_W * 0.7, kerb);
    iso.r.line(P(0, b, 0), P(a, b, 0), INK_W * 0.7, kerb);
  }
  if (e) {
    iso.r.line(P(b, a, 0), P(1, a, 0), INK_W * 0.7, kerb);
    iso.r.line(P(b, b, 0), P(1, b, 0), INK_W * 0.7, kerb);
  }
  const connections = (n ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0);
  if (connections >= 3) {
    // crosswalk stripes on each arm
    const stripe = alpha(COLORS.marking, 0.85);
    for (const [dir, on] of [
      ['n', n],
      ['s', s],
      ['w', w],
      ['e', e],
    ] as const) {
      if (!on) continue;
      for (let t = 0; t < 5; t++) {
        const c0 = a + 0.04 + t * 0.08;
        if (dir === 'n') iso.quad(c0, 0.16, c0 + 0.045, 0.26, 0, stripe);
        if (dir === 's') iso.quad(c0, 0.74, c0 + 0.045, 0.84, 0, stripe);
        if (dir === 'w') iso.quad(0.16, c0, 0.26, c0 + 0.045, 0, stripe);
        if (dir === 'e') iso.quad(0.74, c0, 0.84, c0 + 0.045, 0, stripe);
      }
    }
  } else {
    // centre dashes on straight stretches
    const dash = alpha(COLORS.marking, 0.7);
    if (n && s && !e && !w) {
      for (let t = 0.06; t < 0.95; t += 0.25) iso.quad(0.485, t, 0.515, t + 0.12, 0, dash);
    }
    if (e && w && !n && !s) {
      for (let t = 0.06; t < 0.95; t += 0.25) iso.quad(t, 0.485, t + 0.12, 0.515, 0, dash);
    }
  }
  void seed;
  return iso.build();
}

/** Road deck over water: stone piers, parapets, the road riding above the
 *  river. Arms follow the same NESW mask as plain roads. */
export function bridgeTile(seed: number, mask: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  iso.floor(COLORS.water, COLORS.waterDeep);
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const s = (mask & 4) !== 0;
  const w = (mask & 8) !== 0;
  const a = 0.32;
  const b = 0.68;
  const z = 5;
  const deck = COLORS.road;
  const deckD = COLORS.roadDark;
  const stone = COLORS.concrete;
  // piers down into the water
  for (const [u, v] of [
    [0.42, 0.42],
    [0.62, 0.62],
  ] as const) {
    iso.box(u - 0.04, v - 0.04, u + 0.04, v + 0.04, -3, z - 1, stone, { ink: false });
  }
  // deck arms + centre, lifted above the river
  if (n) iso.quad(a, 0, b, 0.5, z, deck, deckD);
  if (s) iso.quad(a, 0.5, b, 1, z, deck, deckD);
  if (w) iso.quad(0, a, 0.5, b, z, deck, deckD);
  if (e) iso.quad(0.5, a, 1, b, z, deck, deckD);
  iso.quad(a, a, b, b, z, deck, deckD);
  // parapets along the deck edges (the long sides of each arm)
  const par = lighten(stone, 0.08);
  const rail = (p0: ReturnType<typeof P>, p1: ReturnType<typeof P>): void => {
    iso.r.line(p0, p1, 1.6 * RES, par);
    iso.r.line([p0[0], p0[1] - 1.2 * RES], [p1[0], p1[1] - 1.2 * RES], 0.8 * RES, INK);
  };
  if (n || s) {
    rail(P(a, n ? 0 : a, z + 2), P(a, s ? 1 : b, z + 2));
    rail(P(b, n ? 0 : a, z + 2), P(b, s ? 1 : b, z + 2));
  }
  if (e || w) {
    rail(P(w ? 0 : a, a, z + 2), P(e ? 1 : b, a, z + 2));
    rail(P(w ? 0 : a, b, z + 2), P(e ? 1 : b, b, z + 2));
  }
  // centre dashes
  const dash = alpha(COLORS.marking, 0.7);
  if (n && s && !e && !w) {
    for (let t = 0.08; t < 0.92; t += 0.25) iso.quad(0.485, t, 0.515, t + 0.12, z, dash);
  } else if (e && w && !n && !s) {
    for (let t = 0.08; t < 0.92; t += 0.25) iso.quad(t, 0.485, t + 0.12, 0.515, z, dash);
  }
  return iso.build();
}

export function treesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 4421 + 9);
  grassBase(iso);
  const spots: Array<[number, number]> = [
    [0.3, 0.3],
    [0.68, 0.45],
    [0.4, 0.72],
    [0.78, 0.78],
  ];
  const count = 3 + (seed % 2);
  for (let i = 0; i < count && i < spots.length; i++) {
    const spot = spots[i];
    if (!spot) continue;
    const [u, v] = spot;
    const kind = rng.chance(0.5);
    const c = rng.chance(0.5) ? COLORS.treeGreen : COLORS.treeDeep;
    if (kind) iso.cone(u + rng.range(-0.05, 0.05), v + rng.range(-0.05, 0.05), 0.13, 34, c);
    else iso.ball(u + rng.range(-0.05, 0.05), v + rng.range(-0.05, 0.05), 0.12, 26, c);
  }
  return iso.build();
}

export function parkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 3344 + 11);
  grassBase(iso);
  // diagonal gravel path
  iso.quad(0, 0.42, 1, 0.58, 0, alpha(COLORS.pavement, 0.9), alpha(darken(COLORS.pavement, 0.08), 0.9));
  // flowerbed
  iso.quad(0.6, 0.66, 0.86, 0.9, 0, lighten(COLORS.grass, 0.1));
  for (let i = 0; i < 7; i++) {
    const u = rng.range(0.62, 0.84);
    const v = rng.range(0.68, 0.88);
    iso.quad(u, v, u + 0.03, v + 0.03, 1, rng.chance(0.5) ? COLORS.glassSunset : COLORS.glassHot);
  }
  iso.ball(0.25, 0.25, 0.12, 26, COLORS.treeGreen);
  iso.cone(0.75, 0.2, 0.11, 30, COLORS.treeDeep);
  iso.ball(0.2, 0.78, 0.1, 22, COLORS.treeLime);
  return iso.build();
}

export function solarSiteTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 2210 + 13);
  iso.floor(COLORS.field, COLORS.fieldDark);
  for (let i = 0; i < 4; i++) {
    const u = rng.range(0.15, 0.8);
    const v = rng.range(0.15, 0.8);
    iso.box(u, v, u + 0.02, v + 0.02, 0, 10, COLORS.steel);
    iso.quad(u - 0.02, v - 0.02, u + 0.045, v + 0.045, 10, COLORS.orange);
  }
  return iso.build();
}
