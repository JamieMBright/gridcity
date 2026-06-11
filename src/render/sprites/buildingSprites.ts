// Building tiles in the clean low-poly style: colour-blocked walls, white
// frames and floor bands, gable/hip roofs, faceted garden trees, soft cast
// shadows, and warm windows that glow against the dusk. Variants rotate
// wall/roof colours so streets feel hand-placed, never tiled.

import { Rng } from '../../sim/rng';
import { Iso, lit, P, shaded, top } from './iso';
import { COLORS, roofColor, wallColor } from './palette';
import { alpha, darken, lighten, type RGBA } from './raster';

function glass(rng: Rng, litP: number): RGBA {
  return rng.chance(litP) ? (rng.chance(0.4) ? COLORS.glassHot : COLORS.glassLit) : COLORS.glassDark;
}

function grassFloor(iso: Iso): void {
  iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);
}

function pavedFloor(iso: Iso): void {
  iso.floor(COLORS.pavement, darken(COLORS.pavement, 0.08));
}

/** Row of three attached townhouses (urban terraces / high street). */
export function terraceTile(seed: number, shops: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7919 + 13);
  pavedFloor(iso);
  const v0 = 0.12;
  const v1 = 0.78;
  const H = 40;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = wallColor(seed + i);
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // windows on the left (street-facing) wall
    if (shops) {
      // shopfront: big window + striped awning, flat with sign band
      iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, 6, 16, 1, glass(rng, 0.7), COLORS.white);
      const awn: RGBA = rng.chance(0.5) ? COLORS.orange : (COLORS.walls[1] ?? COLORS.orange);
      iso.r.poly(
        [P(u0 + 0.02, v1, 22), P(u1 - 0.02, v1, 22), P(u1 - 0.02, v1 + 0.09, 17), P(u0 + 0.02, v1 + 0.09, 17)],
        awn,
      );
      iso.r.poly(
        [P(u0 + 0.02, v1, 27), P(u1 - 0.02, v1, 27), P(u1 - 0.02, v1, 22), P(u0 + 0.02, v1, 22)],
        COLORS.white,
      );
      iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 30, 37, 2, glass(rng, 0.4), COLORS.white);
    } else {
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 24, 34, 2, glass(rng, 0.4), COLORS.white);
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.16, 6, 17, 1, glass(rng, 0.35), COLORS.white);
      // front door
      iso.r.poly(
        [P(u1 - 0.13, v1, 14), P(u1 - 0.05, v1, 14), P(u1 - 0.05, v1, 0), P(u1 - 0.13, v1, 0)],
        darken(wall, 0.35),
      );
    }
  }
  // windows on the right gable-end wall of the last house
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 22, 34, 2, glass(rng, 0.3), COLORS.white);
  // continuous roof with chimneys
  const roof = roofColor(seed);
  iso.gable(0, v0, 1, v1, H, 16, 'u', roof, wallColor(seed + 2));
  for (const cu of [0.18, 0.5, 0.82]) {
    iso.box(cu, (v0 + v1) / 2 - 0.05, cu + 0.05, (v0 + v1) / 2 + 0.05, H + 12, H + 24, COLORS.concrete);
  }
  return iso.build();
}

/** Two suburban semis with gardens and hedges. */
export function semiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 104729 + 7);
  grassFloor(iso);
  for (const [u0, u1] of [
    [0.06, 0.45],
    [0.55, 0.94],
  ] as const) {
    const wall = wallColor(seed + (u0 < 0.5 ? 0 : 3));
    const roof = roofColor(seed + (u0 < 0.5 ? 1 : 2));
    const v0 = 0.18;
    const v1 = 0.62;
    const H = 26;
    iso.shadow(u0, v0, u1, v1, 0.16, 0.2);
    iso.box(u0, v0, u1, v1, 0, H, wall);
    iso.gable(u0 - 0.015, v0 - 0.015, u1 + 0.015, v1 + 0.015, H, 13, 'u', roof, wall);
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.12, 15, 23, 2, glass(rng, 0.4), COLORS.white);
    // bay window + door
    iso.box(u0 + 0.04, v1, u0 + 0.16, v1 + 0.05, 0, 12, COLORS.white);
    iso.r.poly(
      [P(u1 - 0.1, v1, 12), P(u1 - 0.03, v1, 12), P(u1 - 0.03, v1, 0), P(u1 - 0.1, v1, 0)],
      darken(wall, 0.4),
    );
    // garden path
    iso.quad(u1 - 0.1, v1 + 0.05, u1 - 0.03, 1, 0, alpha(COLORS.pavement, 0.9));
  }
  // street hedge
  iso.box(0.02, 0.93, 0.98, 0.99, 0, 6, COLORS.treeDeep);
  if (rng.chance(0.6)) iso.ball(0.5, 0.8, 0.07, 16, COLORS.treeLime);
  return iso.build();
}

/** Detached villa in a hedged garden — posh districts. */
export function villaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 31337 + 3);
  grassFloor(iso);
  // perimeter hedge
  for (const [a, b, c, d] of [
    [0.02, 0.02, 0.98, 0.06],
    [0.02, 0.94, 0.98, 0.98],
    [0.02, 0.02, 0.06, 0.98],
    [0.94, 0.02, 0.98, 0.98],
  ] as const) {
    iso.box(a, b, c, d, 0, 5, COLORS.treeDeep);
  }
  const wall = lighten(COLORS.walls[5] ?? COLORS.white, 0.04); // cream villa
  const roof = roofColor(seed);
  iso.shadow(0.24, 0.2, 0.78, 0.66, 0.18, 0.2);
  // main wing + side wing
  iso.box(0.24, 0.2, 0.62, 0.66, 0, 30, wall);
  iso.box(0.62, 0.28, 0.8, 0.66, 0, 22, wall);
  iso.hip(0.22, 0.18, 0.64, 0.68, 30, 16, roof);
  iso.gable(0.62, 0.26, 0.82, 0.68, 22, 10, 'u', roof, wall);
  iso.windowsLeft(0.66, 0.28, 0.58, 17, 26, 3, glass(rng, 0.45), COLORS.white);
  iso.windowsLeft(0.66, 0.28, 0.46, 4, 13, 2, glass(rng, 0.4), COLORS.white);
  // grand door
  iso.r.poly([P(0.52, 0.66, 13), P(0.58, 0.66, 13), P(0.58, 0.66, 0), P(0.52, 0.66, 0)], darken(roof, 0.2));
  // gravel drive + garden trees
  iso.quad(0.52, 0.7, 0.6, 1, 0, alpha(COLORS.pavement, 0.85));
  iso.ball(0.14, 0.76, 0.09, 20, COLORS.treeGreen);
  iso.cone(0.86, 0.8, 0.08, 22, COLORS.treeDeep);
  return iso.build();
}

/** Residential tower block with colour-block walls and floor bands. */
export function towerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 49157 + 11);
  pavedFloor(iso);
  const wall = wallColor(seed + 4);
  const u0 = 0.18;
  const v0 = 0.18;
  const u1 = 0.82;
  const v1 = 0.82;
  const H = 104 + (seed % 3) * 14;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.26);
  iso.box(u0, v0, u1, v1, 0, H, wall);
  // white floor bands + window rows on both visible faces
  for (let z = 12; z < H - 8; z += 16) {
    iso.r.poly([P(u0, v1, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u0, v1, z + 9)], alpha(COLORS.white, 0.9));
    iso.r.poly([P(u1, v0, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u1, v0, z + 9)], alpha(COLORS.white, 0.75));
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, z, z + 8, 4, glass(rng, 0.35));
    iso.windowsRight(u1, v0 + 0.04, v1 - 0.04, z, z + 8, 4, glass(rng, 0.3));
  }
  // parapet + plant room + beacon
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H, H + 4, COLORS.white);
  iso.box(0.55, 0.3, 0.75, 0.5, H + 4, H + 14, COLORS.concrete);
  iso.box(0.27, 0.27, 0.3, 0.3, H + 4, H + 12, COLORS.steelDark);
  iso.quad(0.255, 0.255, 0.315, 0.315, H + 12, COLORS.orange);
  return iso.build();
}

/** Glass office tower with a sunset-reflecting curtain wall and setback crown. */
export function officeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 65537 + 5);
  pavedFloor(iso);
  const u0 = 0.16;
  const v0 = 0.16;
  const u1 = 0.84;
  const v1 = 0.84;
  const H = 124 + (seed % 2) * 18;
  iso.shadow(u0, v0, u1, v1, 0.34, 0.28);
  // glass body: left face cool dusk, right face catching the sunset
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, 0), P(u0, v1, 0)], COLORS.glassDark, shaded(COLORS.glassSky, 0.2));
  iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1, v1, 0), P(u1, v0, 0)], COLORS.glassSunset, COLORS.glassSky);
  iso.quad(u0, v0, u1, v1, H, COLORS.white);
  // white mullion bands
  for (let z = 14; z < H - 6; z += 14) {
    iso.r.poly([P(u0, v1, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u0, v1, z)], alpha(COLORS.white, 0.85));
    iso.r.poly([P(u1, v0, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u1, v0, z)], alpha(COLORS.white, 0.7));
  }
  // lit floors scattered through the dusk face
  for (let z = 16; z < H - 10; z += 14) {
    if (rng.chance(0.4)) {
      const a = rng.range(u0 + 0.05, 0.55);
      iso.r.poly([P(a, v1, z + 9), P(a + 0.2, v1, z + 9), P(a + 0.2, v1, z + 2), P(a, v1, z + 2)], alpha(COLORS.glassLit, 0.8));
    }
  }
  // setback crown
  iso.box(0.3, 0.3, 0.7, 0.7, H, H + 16, COLORS.white, { topC: COLORS.white });
  iso.box(0.44, 0.44, 0.56, 0.56, H + 16, H + 26, COLORS.steel);
  return iso.build();
}

/** Essex cottage with a vegetable garden and apple tree. */
export function cottageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 24593 + 9);
  grassFloor(iso);
  const wall = COLORS.walls[5] ?? COLORS.white;
  const v0 = 0.26;
  const v1 = 0.64;
  iso.shadow(0.3, v0, 0.74, v1, 0.14, 0.18);
  iso.box(0.3, v0, 0.74, v1, 0, 20, wall);
  iso.gable(0.285, v0 - 0.015, 0.755, v1 + 0.015, 20, 12, 'u', COLORS.roofs[3] ?? COLORS.field, wall);
  iso.windowsLeft(v1, 0.34, 0.56, 6, 14, 2, glass(rng, 0.5), COLORS.white);
  iso.r.poly([P(0.62, v1, 13), P(0.69, v1, 13), P(0.69, v1, 0), P(0.62, v1, 0)], darken(wall, 0.42));
  // chimney
  iso.box(0.4, 0.42, 0.46, 0.48, 30, 40, COLORS.concrete);
  // vegetable rows
  for (let v = 0.74; v < 0.95; v += 0.07) {
    iso.quad(0.45, v, 0.92, v + 0.035, 0, alpha(darken(COLORS.grassDark, 0.15), 0.7));
  }
  iso.ball(0.14, 0.36, 0.1, 22, COLORS.treeGreen);
  return iso.build();
}

/** Distribution warehouse with skylights and roller doors. */
export function warehouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50221 + 15);
  pavedFloor(iso);
  const body = COLORS.steel;
  iso.shadow(0.06, 0.1, 0.94, 0.7, 0.2, 0.2);
  iso.box(0.06, 0.1, 0.94, 0.7, 0, 30, body, { topC: lighten(COLORS.white, 0.02) });
  // roof skylight strips
  for (let u = 0.14; u < 0.86; u += 0.16) {
    iso.quad(u, 0.16, u + 0.07, 0.64, 30, alpha(COLORS.glassSky, 0.85));
  }
  // roller doors on the street face
  for (const a of [0.16, 0.42]) {
    iso.r.poly([P(a, 0.7, 18), P(a + 0.18, 0.7, 18), P(a + 0.18, 0.7, 0), P(a, 0.7, 0)], lighten(body, 0.18));
    iso.r.poly([P(a, 0.7, 18), P(a + 0.18, 0.7, 18), P(a + 0.18, 0.7, 16), P(a, 0.7, 16)], COLORS.steelDark);
  }
  iso.r.poly([P(0.72, 0.7, 12), P(0.79, 0.7, 12), P(0.79, 0.7, 0), P(0.72, 0.7, 0)], COLORS.glassDark);
  // yard pallets
  iso.box(0.16, 0.82, 0.24, 0.9, 0, 6, COLORS.orange);
  if (rng.chance(0.5)) iso.box(0.3, 0.84, 0.36, 0.9, 0, 5, darken(COLORS.orange, 0.2));
  return iso.build();
}

/** Brick factory: sawtooth roof and twin stacks. */
export function factoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60013 + 17);
  pavedFloor(iso);
  const wall = COLORS.walls[6] ?? COLORS.orange;
  iso.shadow(0.08, 0.12, 0.92, 0.68, 0.2, 0.22);
  iso.box(0.08, 0.12, 0.92, 0.68, 0, 32, wall);
  // sawtooth roof: three glass-faced teeth along u
  for (let i = 0; i < 3; i++) {
    const u0 = 0.08 + i * 0.28;
    const u1 = u0 + 0.28;
    iso.r.poly([P(u0, 0.12, 32), P(u1, 0.12, 32), P(u1, 0.4, 46), P(u0, 0.4, 46)], top(wall, 0.3));
    iso.r.poly([P(u0, 0.4, 46), P(u1, 0.4, 46), P(u1, 0.68, 32), P(u0, 0.68, 32)], alpha(COLORS.glassSky, 0.9));
  }
  iso.windowsLeft(0.68, 0.14, 0.6, 16, 26, 3, glass(rng, 0.3), COLORS.white);
  iso.r.poly([P(0.68, 0.68, 16), P(0.84, 0.68, 16), P(0.84, 0.68, 0), P(0.68, 0.68, 0)], COLORS.steelDark);
  // twin stacks
  iso.box(0.76, 0.2, 0.83, 0.27, 32, 78, lighten(wall, 0.06));
  iso.box(0.62, 0.2, 0.69, 0.27, 32, 70, lighten(wall, 0.06));
  iso.quad(0.755, 0.195, 0.835, 0.275, 78, COLORS.steelDark);
  iso.quad(0.615, 0.195, 0.695, 0.275, 70, COLORS.steelDark);
  return iso.build();
}

/** Glasshouse ranges — Essex's growing empire. */
export function greenhouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 70001 + 19);
  grassFloor(iso);
  for (const [v0, v1] of [
    [0.06, 0.3],
    [0.38, 0.62],
    [0.7, 0.94],
  ] as const) {
    iso.shadow(0.06, v0, 0.94, v1, 0.08, 0.14);
    // glass walls
    const wallGlass = alpha(COLORS.greenhouseGlass, 0.92);
    iso.box(0.06, v0, 0.94, v1, 0, 12, wallGlass, {
      leftC: alpha(shaded(COLORS.greenhouseGlass, 0.12), 0.92),
      rightC: alpha(lit(COLORS.greenhouseGlass, 0.1), 0.95),
      topC: alpha(COLORS.greenhouseGlass, 0.4),
    });
    // glass gable roof catching the light
    iso.gable(0.06, v0, 0.94, v1, 12, 8, 'u', lighten(COLORS.greenhouseGlass, 0.12), COLORS.white);
    // white frame ribs
    for (let u = 0.12; u < 0.92; u += 0.1) {
      iso.r.poly([P(u, v1, 12), P(u + 0.012, v1, 12), P(u + 0.012, v1, 0), P(u, v1, 0)], alpha(COLORS.white, 0.8));
    }
    // crops glowing through
    iso.quad(0.1, v0 + 0.05, 0.9, v1 - 0.05, 1, alpha(COLORS.treeLime, rng.chance(0.5) ? 0.45 : 0.3));
  }
  return iso.build();
}

/** Built-out solar farm: tilted panel rows on golden grass. */
export function solarFarmTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  iso.floor(COLORS.field, COLORS.fieldDark);
  for (let v = 0.1; v < 0.9; v += 0.2) {
    iso.shadow(0.08, v, 0.92, v + 0.1, 0.05, 0.12);
    // tilted panel: back edge raised
    iso.r.poly(
      [P(0.08, v, 12), P(0.92, v, 12), P(0.92, v + 0.1, 4), P(0.08, v + 0.1, 4)],
      COLORS.panel,
      COLORS.panelGlint,
    );
    iso.r.poly([P(0.08, v, 12.5), P(0.92, v, 12.5), P(0.92, v, 11), P(0.08, v, 11)], alpha(COLORS.panelGlint, 0.9));
  }
  void seed;
  return iso.build();
}
