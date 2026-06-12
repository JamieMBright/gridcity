// World/terrain tiles in the clean low-poly style. The ground pass is a
// family of FLAT tiles (no structures — roads are vector ribbons drawn by
// the renderer between ground and structures); the structure pass holds
// hills, trees and park furniture with transparent floors. Water shores
// are baked as 16 variants indexed by a NESW landmask. Edge mapping in
// iso: N neighbour shares the v=0 edge, E shares u=1, S shares v=1, W
// shares u=0.

import { Rng } from '../../sim/rng';
import { INK, INK_W, Iso, lit, P, RES, shaded, top } from './iso';
import { COLORS } from './palette';
import { alpha, darken, hex, lighten } from './raster';

// --- Flat ground tiles (the ground pass) ------------------------------------

/** Plain meadow ground: soft facets, occasional flower dots. */
export function groundGrassTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 9176 + 5);
  iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);
  // soft meadow facets for variety
  const facets = 1 + rng.int(3);
  for (let i = 0; i < facets; i++) {
    const u = rng.range(0.1, 0.65);
    const v = rng.range(0.1, 0.65);
    const s = rng.range(0.16, 0.3);
    const c = rng.chance(0.5)
      ? alpha(lighten(COLORS.grass, 0.12), 0.5)
      : alpha(darken(COLORS.grassDark, 0.08), 0.4);
    iso.quad(u, v, u + s, v + s, 0, c);
  }
  // occasional flower dots
  if (rng.chance(0.45)) {
    const n = 2 + rng.int(4);
    for (let i = 0; i < n; i++) {
      const u = rng.range(0.15, 0.85);
      const v = rng.range(0.15, 0.85);
      const c = rng.chance(0.5) ? COLORS.glassSunset : rng.chance(0.5) ? COLORS.glassHot : COLORS.white;
      iso.quad(u, v, u + 0.025, v + 0.025, 0, alpha(c, 0.85));
    }
  }
  return iso.build();
}

/** Urban pavement ground: faint paving-slab lines. */
export function groundPaveTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5897 + 3);
  iso.floor(COLORS.pavement, darken(COLORS.pavement, 0.08));
  const slab = alpha(INK, 0.1);
  const off = rng.chance(0.5) ? 0.125 : 0;
  for (let t = 0.25 + off; t < 0.99; t += 0.25) {
    iso.r.line(P(t, 0.02, 0), P(t, 0.98, 0), INK_W * 0.55, slab);
    iso.r.line(P(0.02, t, 0), P(0.98, t, 0), INK_W * 0.55, slab);
  }
  // the odd repaired/stained slab
  if (rng.chance(0.5)) {
    const u = 0.25 * (1 + rng.int(3));
    const v = 0.25 * (1 + rng.int(3));
    iso.quad(u - 0.24, v - 0.24, u - 0.01, v - 0.01, 0, alpha(darken(COLORS.pavement, 0.1), 0.5));
  }
  return iso.build();
}

/** Golden crop-field ground: rows along the u axis, no structures. */
export function groundFieldTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7333 + 3);
  iso.floor(COLORS.field, COLORS.fieldDark);
  const off = rng.range(0, 0.06);
  for (let v = 0.1 + off; v < 0.95; v += 0.18) {
    iso.quad(0.04, v, 0.96, v + 0.05, 0, alpha(darken(COLORS.fieldDark, 0.12), 0.55));
  }
  return iso.build();
}

/** Moorland ground under the hills. */
export function groundMoorTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5210 + 7);
  iso.floor(lighten(COLORS.moor, 0.05), darken(COLORS.moor, 0.12));
  // heather patches
  for (let i = 0; i < 2; i++) {
    const u = rng.range(0.1, 0.7);
    const v = rng.range(0.1, 0.7);
    iso.quad(u, v, u + rng.range(0.12, 0.25), v + rng.range(0.12, 0.25), 0, alpha(darken(COLORS.moor, 0.1), 0.45));
  }
  return iso.build();
}

/** Brighter mown park grass. */
export function groundParkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 3344 + 11);
  iso.floor(lighten(COLORS.grass, 0.16), lighten(COLORS.grassDark, 0.1));
  // mowing stripes
  const stripe = alpha(lighten(COLORS.grass, 0.26), 0.5);
  for (let t = 0.14 + (rng.chance(0.5) ? 0.07 : 0); t < 0.95; t += 0.28) {
    iso.quad(0.02, t, 0.98, t + 0.14, 0, stripe);
  }
  return iso.build();
}

/** Rapeseed in bloom: the violently yellow parcel every spring drive knows. */
export function groundRapeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 8443 + 9);
  const rape = hex('#e8d23f');
  iso.floor(rape, darken(rape, 0.12));
  // blossom froth: lighter daubs over the bloom
  for (let i = 0; i < 5; i++) {
    const u = rng.range(0.05, 0.7);
    const v = rng.range(0.05, 0.7);
    iso.quad(u, v, u + rng.range(0.1, 0.25), v + rng.range(0.1, 0.25), 0, alpha(lighten(rape, 0.16), 0.6));
  }
  // tractor tramlines
  for (let v = 0.18 + rng.range(0, 0.08); v < 0.95; v += 0.3) {
    iso.quad(0.04, v, 0.96, v + 0.025, 0, alpha(darken(rape, 0.2), 0.5));
  }
  return iso.build();
}

/** Ploughed earth: bare brown furrows waiting for the drill. */
export function groundPloughTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 9341 + 7);
  const soil = hex('#8a6242');
  iso.floor(soil, darken(soil, 0.14));
  const off = rng.range(0, 0.05);
  for (let v = 0.06 + off; v < 0.97; v += 0.09) {
    iso.quad(0.02, v, 0.98, v + 0.035, 0, alpha(darken(soil, 0.22), 0.65));
  }
  if (rng.chance(0.3)) {
    // a chalky patch
    const u = rng.range(0.2, 0.6);
    iso.quad(u, rng.range(0.2, 0.6), u + 0.2, rng.range(0.5, 0.8), 0, alpha(lighten(soil, 0.18), 0.4));
  }
  return iso.build();
}

/** Estuary marsh: wet olive flats, reed tufts, standing water glints. */
export function groundMarshTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7717 + 5);
  const marsh = hex('#7d8a4e');
  iso.floor(marsh, darken(marsh, 0.14));
  // standing water pools
  for (let i = 0; i < 2 + rng.int(2); i++) {
    const u = rng.range(0.1, 0.6);
    const v = rng.range(0.1, 0.6);
    iso.quad(u, v, u + rng.range(0.12, 0.3), v + rng.range(0.1, 0.22), 0, alpha(COLORS.water, 0.55));
    iso.quad(u + 0.02, v + 0.02, u + 0.08, v + 0.05, 0, alpha(COLORS.waterGlint, 0.5));
  }
  // reed tufts
  for (let i = 0; i < 5; i++) {
    const [px, py] = P(rng.range(0.1, 0.9), rng.range(0.1, 0.9), 0);
    for (let r = -1; r <= 1; r++) {
      iso.r.line([px + r * 1.2 * RES, py], [px + r * 2 * RES, py - (4 + rng.int(3)) * RES], 0.7 * RES, darken(marsh, 0.3));
    }
  }
  return iso.build();
}

/** Hedgerow along the parcel boundary (S + E edges), with a field oak. */
export function hedgerowTile(seed: number, variantIx: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 6553 + variantIx * 29 + 3);
  const hedge = COLORS.treeDeep;
  if (variantIx === 0) {
    iso.box(0.02, 0.9, 0.98, 0.99, 0, 5 + rng.int(3), hedge, { ink: false });
  } else {
    iso.box(0.9, 0.02, 0.99, 0.98, 0, 5 + rng.int(3), hedge, { ink: false });
  }
  // gappy field gate
  if (rng.chance(0.4)) {
    const u = rng.range(0.3, 0.6);
    if (variantIx === 0) {
      const [gx, gy] = P(u, 0.95, 0);
      iso.r.line([gx - 4 * RES, gy], [gx + 4 * RES, gy - 2 * RES], 0.9 * RES, hex('#7a5a3c'));
      iso.r.line([gx - 4 * RES, gy - 3 * RES], [gx + 4 * RES, gy - 5 * RES], 0.9 * RES, hex('#7a5a3c'));
    }
  }
  if (rng.chance(0.45)) {
    iso.ball(rng.range(0.25, 0.7), rng.range(0.2, 0.6), 0.12, 26, COLORS.treeGreen);
  }
  return iso.build();
}

/** Orchard: fruit trees in tidy rows over grass. */
export function orchardTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5471 + 13);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const u = 0.18 + col * 0.3 + rng.range(-0.03, 0.03);
      const v = 0.18 + row * 0.3 + rng.range(-0.03, 0.03);
      iso.ball(u, v, 0.075, 13 + rng.int(4), rng.chance(0.3) ? COLORS.treeLime : COLORS.treeGreen);
    }
  }
  return iso.build();
}

// --- Water (ground pass, keeps its own surface) -----------------------------

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

// --- Structures (transparent floors, drawn over the ground + roads) ---------

/** Moorland plateau (no base floor — ground_moor shows beneath). */
export function hillTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5210 + 7);
  // faceted plateau rise straight off the tile edges
  const h = 12 + rng.int(6);
  iso.r.poly([P(0.15, 0.85, h), P(0.85, 0.85, h), P(1, 1, 0), P(0, 1, 0)], shaded(COLORS.moor, 0.16));
  iso.r.poly([P(0.85, 0.15, h), P(0.85, 0.85, h), P(1, 1, 0), P(1, 0, 0)], lit(COLORS.moor, 0.06));
  iso.r.poly([P(0.15, 0.15, h), P(0.85, 0.15, h), P(1, 0, 0), P(0, 0, 0)], top(COLORS.moor, 0.08));
  iso.r.poly([P(0.15, 0.15, h), P(0.15, 0.85, h), P(0, 1, 0), P(0, 0, 0)], top(COLORS.moor, 0.02));
  iso.quad(0.15, 0.15, 0.85, 0.85, h, top(COLORS.moor, 0.16));
  // ink rim around the plateau top + the two visible foot lines
  iso.r.polyline(
    [P(0.15, 0.15, h), P(0.85, 0.15, h), P(0.85, 0.85, h), P(0.15, 0.85, h)],
    INK_W * 0.8,
    alpha(INK, 0.55),
    true,
  );
  if (seed % 2 === 0) iso.cone(0.5, 0.4, 0.09, 24, COLORS.treeDeep, h);
  return iso.build();
}

/** Tree clumps on a transparent floor (ground pass supplies the grass). */
export function treesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 4421 + 9);
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

/** Park furniture: gravel path, flowerbed and trees on a transparent
 *  floor — ground_park supplies the bright lawn beneath. */
export function parkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 3344 + 11);
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

/** Pre-sited solar field markers (transparent floor — ground_field shows). */
export function solarSiteTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 2210 + 13);
  for (let i = 0; i < 4; i++) {
    const u = rng.range(0.15, 0.8);
    const v = rng.range(0.15, 0.8);
    iso.box(u, v, u + 0.02, v + 0.02, 0, 10, COLORS.steel);
    iso.quad(u - 0.02, v - 0.02, u + 0.045, v + 0.045, 10, COLORS.orange);
  }
  return iso.build();
}
