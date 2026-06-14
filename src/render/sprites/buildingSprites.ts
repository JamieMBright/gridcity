// Building tiles in the clean low-poly style: colour-blocked walls, white
// frames and floor bands, gable/hip roofs, faceted garden trees, soft cast
// shadows, and warm windows that glow against the dusk. Variants rotate
// wall/roof colours so streets feel hand-placed, never tiled. Floors are
// TRANSPARENT — the ground pass supplies grass/pavement beneath, with the
// road ribbons drawn between the two passes.

import { Rng } from '../../sim/rng';
import { INK, INK_W, Iso, lit, P, shaded, top } from './iso';
import { COLORS, roofColor, setWallRoofPalette, wallColor } from './palette';
import { alpha, darken, hex, lighten, type RGBA } from './raster';

function glass(rng: Rng, litP: number): RGBA {
  // the city glows at dusk: most windows have somebody home
  const p = Math.min(0.92, litP + 0.24);
  return rng.chance(p) ? (rng.chance(0.4) ? COLORS.glassHot : COLORS.glassLit) : COLORS.glassDark;
}

// Building fabric: London's Victorian default (brick reds/browns, render and
// pebbledash, slate roofs). These are `let` so a generated city can swap the
// whole colourway (e.g. Paris: cream limestone + grey zinc mansard) via
// applyCityFabric() before the atlas is baked — London stays the default, so
// the live game's atlas is unchanged unless a city opts in.
let BRICK_RED = hex('#a64b37');
let BRICK_BROWN = hex('#8a5240');
let BRICK_ORANGE = hex('#b5664a');
let RENDER_CREAM = hex('#ddd2bc');
let PEBBLEDASH = hex('#c2b89f');
let SLATE = hex('#6e6884');
let SLATE_DARK = hex('#575d78');
let TILE_RED = hex('#8f4438');
let POT_CLAY = hex('#9c5a3a');
let BUFF_BRICK = hex('#c8a878');

/** Built-in city colourways. London = the default Victorian fabric; Paris =
 *  Haussmann cream limestone walls + grey zinc mansard roofs (uniform, pale,
 *  grid-like). Walls/roofs feed the tower/office rotations via the palette. */
export type CityFabric = 'london' | 'paris';

const PARIS_WALLS: RGBA[] = [
  hex('#e7dec9'), hex('#ded3ba'), hex('#ebe3d2'), hex('#d6caac'),
  hex('#e2d8c1'), hex('#cfc3a4'), hex('#e9e1cd'), hex('#d9ceb2'),
];
const PARIS_ROOFS: RGBA[] = [hex('#6b7079'), hex('#585e68'), hex('#777d86'), hex('#4f545d')];

export function applyCityFabric(city: CityFabric): void {
  if (city === 'paris') {
    BRICK_RED = hex('#ded3ba'); // limestone, not brick
    BRICK_BROWN = hex('#cfc3a4');
    BRICK_ORANGE = hex('#e7dec9');
    RENDER_CREAM = hex('#ebe3d2');
    PEBBLEDASH = hex('#d6caac');
    SLATE = hex('#6b7079'); // grey zinc
    SLATE_DARK = hex('#585e68');
    TILE_RED = hex('#6b7079'); // roofs are zinc, never red tile
    POT_CLAY = hex('#8a8f99'); // grey chimney pots
    BUFF_BRICK = hex('#e2d8c1');
    setWallRoofPalette(PARIS_WALLS, PARIS_ROOFS);
  } else {
    BRICK_RED = hex('#a64b37');
    BRICK_BROWN = hex('#8a5240');
    BRICK_ORANGE = hex('#b5664a');
    RENDER_CREAM = hex('#ddd2bc');
    PEBBLEDASH = hex('#c2b89f');
    SLATE = hex('#6e6884');
    SLATE_DARK = hex('#575d78');
    TILE_RED = hex('#8f4438');
    POT_CLAY = hex('#9c5a3a');
    BUFF_BRICK = hex('#c8a878');
    setWallRoofPalette(COLORS.walls, COLORS.roofs);
  }
}

/** Row of three attached townhouses (urban terraces / high street). */
export function terraceTile(seed: number, shops: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7919 + 13);
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

/** Victorian terrace row: bay windows, slate roof, chimney pots in rows.
 *  Wall treatments and frames vary per variant; variant 3 has dormer loft
 *  conversions and variant 1 carries retrofit rooftop solar. */
export function victerraceTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 8839 + variant * 101 + 21);
  const v0 = 0.14;
  const v1 = 0.76;
  const vm = (v0 + v1) / 2;
  const H = 38;
  const rise = 15;
  const roof = ([SLATE, SLATE_DARK, TILE_RED, SLATE] as RGBA[])[variant % 4] ?? SLATE;
  const frame = variant % 2 === 0 ? COLORS.white : hex('#ece2cc');
  const wallSets: RGBA[][] = [
    [BRICK_RED, BRICK_RED, BRICK_BROWN],
    [BRICK_BROWN, BRICK_ORANGE, BRICK_BROWN],
    [RENDER_CREAM, BRICK_RED, PEBBLEDASH],
    [BRICK_RED, BRICK_BROWN, BRICK_RED],
  ];
  const walls = wallSets[variant % 4] ?? wallSets[0]!;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  // z on the near roof slope at a given v (between ridge vm and eave v1)
  const slopeZ = (v: number): number => H + rise * ((v1 - v) / (v1 - vm));
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // upper sash windows
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 25, 34, 2, glass(rng, 0.4), frame);
    // two-storey bay window with its own little cap
    const b0 = u0 + 0.035;
    const b1 = u0 + 0.165;
    iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 18, lighten(wall, 0.1));
    iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 14, 1, glass(rng, 0.5), frame);
    iso.quad(b0 - 0.012, v1 - 0.001, b1 + 0.012, v1 + 0.062, 18, frame);
    iso.edge(P(b0 - 0.012, v1 + 0.062, 18), P(b1 + 0.012, v1 + 0.062, 18), INK_W * 0.8);
    // front door beside the bay, with a stone lintel
    iso.r.poly(
      [P(u1 - 0.12, v1, 13), P(u1 - 0.045, v1, 13), P(u1 - 0.045, v1, 0), P(u1 - 0.12, v1, 0)],
      darken(([hex('#3f6048'), hex('#5d3a52'), hex('#46518f'), hex('#7a3328')] as RGBA[])[(variant + i) % 4] ?? INK, 0.05),
    );
    iso.r.poly(
      [P(u1 - 0.13, v1, 15), P(u1 - 0.035, v1, 15), P(u1 - 0.035, v1, 13), P(u1 - 0.13, v1, 13)],
      frame,
    );
  }
  // gable-end windows on the right wall
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 23, 33, 2, glass(rng, 0.3), frame);
  // slate roof + party-wall chimney stacks with clay pot rows
  iso.gable(0, v0, 1, v1, H, rise, 'u', roof, walls[2] ?? BRICK_RED);
  for (const cu of [0.05, 0.345, 0.655, 0.95]) {
    iso.box(cu - 0.028, vm - 0.05, cu + 0.028, vm + 0.05, H + 11, H + 22, darken(walls[0] ?? BRICK_RED, 0.08));
    for (const dv of [-0.028, 0.022]) {
      iso.box(cu - 0.011, vm + dv, cu + 0.011, vm + dv + 0.024, H + 22, H + 27, POT_CLAY, { ink: false });
    }
  }
  if (variant === 3) {
    // dormer loft conversions on the near slope
    for (const du of [0.135, 0.468, 0.8]) {
      const dv0 = vm + 0.1;
      const z0 = slopeZ(dv0 + 0.1);
      iso.box(du, dv0, du + 0.09, dv0 + 0.1, z0, z0 + 9, lighten(walls[0] ?? BRICK_RED, 0.12));
      iso.windowsLeft(dv0 + 0.1, du + 0.012, du + 0.078, z0 + 2, z0 + 7, 1, glass(rng, 0.5), frame);
      iso.quad(du - 0.008, dv0 - 0.008, du + 0.098, dv0 + 0.108, z0 + 9, shaded(roof, 0.05));
    }
  }
  if (variant === 1) {
    // retrofit solar on the middle house's near slope
    const pv0 = vm + 0.08;
    const pv1 = v1 - 0.06;
    iso.r.poly(
      [P(0.37, pv0, slopeZ(pv0) + 1), P(0.63, pv0, slopeZ(pv0) + 1), P(0.63, pv1, slopeZ(pv1) + 1), P(0.37, pv1, slopeZ(pv1) + 1)],
      COLORS.panel,
    );
    iso.r.line(P(0.37, pv0, slopeZ(pv0) + 1.5), P(0.63, pv0, slopeZ(pv0) + 1.5), INK_W * 0.7, COLORS.panelGlint);
  }
  return iso.build();
}

/** Victorian high-street parade: shops below (awnings, big glazing, a
 *  hanging sign), flats above, parapet roof. */
export function vicshopTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 6661 + variant * 71 + 17);
  const v0 = 0.14;
  const v1 = 0.76;
  const H = 42;
  const walls: RGBA[] =
    variant === 0 ? [BRICK_RED, RENDER_CREAM, BRICK_BROWN] : [BRICK_BROWN, BRICK_ORANGE, RENDER_CREAM];
  const awnings: RGBA[] =
    variant === 0
      ? [COLORS.orange, hex('#3f8f8a'), hex('#d6566e')]
      : [hex('#46518f'), COLORS.orange, hex('#5d7a45')];
  const frame = COLORS.white;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // big shopfront glazing + stallriser
    iso.r.poly(
      [P(u0 + 0.03, v1, 16), P(u1 - 0.03, v1, 16), P(u1 - 0.03, v1, 3), P(u0 + 0.03, v1, 3)],
      glass(rng, 0.75),
    );
    iso.r.poly(
      [P(u0 + 0.03, v1, 3), P(u1 - 0.03, v1, 3), P(u1 - 0.03, v1, 0), P(u0 + 0.03, v1, 0)],
      darken(wall, 0.3),
    );
    // fascia sign band + striped awning
    const awn = awnings[i] ?? COLORS.orange;
    iso.r.poly([P(u0 + 0.02, v1, 24), P(u1 - 0.02, v1, 24), P(u1 - 0.02, v1, 19), P(u0 + 0.02, v1, 19)], frame);
    iso.r.poly(
      [P(u0 + 0.03, v1, 19), P(u1 - 0.03, v1, 19), P(u1 - 0.04, v1 + 0.085, 14), P(u0 + 0.04, v1 + 0.085, 14)],
      awn,
    );
    for (let t = 0; t < 4; t++) {
      const a0 = u0 + 0.055 + t * 0.072;
      iso.r.poly(
        [P(a0, v1, 19), P(a0 + 0.03, v1, 19), P(a0 + 0.02, v1 + 0.085, 14), P(a0 - 0.01, v1 + 0.085, 14)],
        alpha(COLORS.white, 0.85),
      );
    }
    iso.edge(P(u0 + 0.04, v1 + 0.085, 14), P(u1 - 0.04, v1 + 0.085, 14), INK_W * 0.8);
    // flat-above sash windows
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 28, 37, 2, glass(rng, 0.45), frame);
  }
  // hanging sign on a bracket at the middle shop
  iso.r.line(P(0.36, v1, 30), P(0.36, v1 + 0.05, 30), INK_W * 0.8, INK);
  iso.r.poly(
    [P(0.36, v1 + 0.05, 30), P(0.36, v1 + 0.05, 24), P(0.36, v1 + 0.012, 24), P(0.36, v1 + 0.012, 30)],
    variant === 0 ? hex('#46518f') : hex('#7a3328'),
  );
  // gable-end windows + parapet roof with chimneys at the back
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 26, 36, 2, glass(rng, 0.3), frame);
  iso.box(0, v0, 1, v1, H, H + 4, walls[0] ?? BRICK_RED, { topC: shaded(SLATE, 0.05) });
  iso.r.poly([P(0, v1, H + 5.5), P(1, v1, H + 5.5), P(1, v1, H + 4), P(0, v1, H + 4)], frame);
  for (const cu of [0.2, 0.52, 0.84]) {
    iso.box(cu, v0 + 0.08, cu + 0.05, v0 + 0.17, H + 4, H + 18, darken(walls[0] ?? BRICK_RED, 0.1));
    iso.box(cu + 0.008, v0 + 0.095, cu + 0.026, v0 + 0.115, H + 18, H + 22, POT_CLAY, { ink: false });
  }
  return iso.build();
}

/** Post-war council slab block: 4–5 storeys of deck-access balconies with
 *  pastel infill panels and a stair tower. */
export function councilflatTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5443 + variant * 37 + 29);
  const u0 = 0.08;
  const u1 = 0.84;
  const v0 = 0.26;
  const v1 = 0.62;
  const storeys = variant === 0 ? 4 : 5;
  const fh = 13;
  const H = storeys * fh + 4;
  const body = variant === 0 ? hex('#c9c2b2') : hex('#bdb8ad');
  const pastels: RGBA[] =
    variant === 0
      ? [hex('#e8b9a8'), hex('#a8c8d8'), hex('#d8c8a0')]
      : [hex('#b9d0b4'), hex('#d8b4c0'), hex('#c0c4dd')];
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, body);
  for (let s = 0; s < storeys; s++) {
    const z = 4 + s * fh;
    // deck-access balcony slab protruding from the street face
    iso.r.poly(
      [P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), P(u1, v1, z + 1.6), P(u0, v1, z + 1.6)],
      lit(body, 0.12),
    );
    iso.r.poly(
      [P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z - 0.4), P(u0, v1 + 0.035, z - 0.4)],
      shaded(body, 0.12),
    );
    // balcony rail
    iso.r.line(P(u0, v1 + 0.035, z + 5), P(u1, v1 + 0.035, z + 5), INK_W * 0.7, alpha(COLORS.white, 0.9));
    iso.edge(P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), INK_W * 0.7, alpha(INK, 0.6));
    // pastel infill panels + doors/windows along the deck
    for (let k = 0; k < 5; k++) {
      const a = u0 + 0.03 + k * 0.145;
      iso.r.poly(
        [P(a, v1, z + fh - 2.5), P(a + 0.06, v1, z + fh - 2.5), P(a + 0.06, v1, z + 2), P(a, v1, z + 2)],
        pastels[(k + s) % 3] ?? body,
      );
      iso.r.poly(
        [P(a + 0.07, v1, z + fh - 3.5), P(a + 0.115, v1, z + fh - 3.5), P(a + 0.115, v1, z + 2), P(a + 0.07, v1, z + 2)],
        glass(rng, 0.4),
      );
    }
    // gable-end windows
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, z + 3, z + fh - 2.5, 2, glass(rng, 0.3), COLORS.white);
  }
  // stair tower at the left end, slightly proud and taller
  iso.box(u0 - 0.035, v0 + 0.04, u0 + 0.07, v1 - 0.04, 0, H + 7, shaded(body, 0.06));
  iso.windowsLeft(v1 - 0.04, u0 - 0.02, u0 + 0.055, 6, H - 4, 1, alpha(COLORS.glassSky, 0.85), COLORS.white);
  // flat roof: parapet + plant box + TV aerials
  iso.box(u0, v0, u1, v1, H, H + 3, body, { ink: false, topC: shaded(body, 0.18) });
  iso.box(0.6, 0.36, 0.72, 0.5, H + 3, H + 10, COLORS.concrete);
  for (const au of [0.2, 0.42]) {
    iso.r.line(P(au, 0.44, H + 3), P(au, 0.44, H + 14), INK_W * 0.6, alpha(INK, 0.7));
    iso.r.line(P(au - 0.025, 0.44, H + 12), P(au + 0.025, 0.44, H + 12), INK_W * 0.6, alpha(INK, 0.7));
  }
  return iso.build();
}

/** Boxy new-build estate home: integral garage, tight paved drive, small
 *  windows. Variants 1–2 carry rooftop solar from day one. */
export function newbuildTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 4129 + variant * 53 + 31);
  const wall = ([BUFF_BRICK, BRICK_RED, hex('#bf9a6a')] as RGBA[])[variant % 3] ?? BUFF_BRICK;
  const roof = variant === 0 ? hex('#6a6276') : hex('#5c5468');
  const u0 = 0.14;
  const u1 = 0.58;
  const v0 = 0.2;
  const v1 = 0.62;
  const H = 24;
  iso.shadow(u0, v0, u1 + 0.22, v1, 0.16, 0.2);
  // house body + concrete-tile gable roof
  iso.box(u0, v0, u1, v1, 0, H, wall);
  iso.gable(u0 - 0.012, v0 - 0.012, u1 + 0.012, v1 + 0.012, H, 11, 'u', roof, wall);
  // small uPVC windows
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.05, 15, 21, 2, glass(rng, 0.45), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.04, u0 + 0.16, 5, 11, 1, glass(rng, 0.4), COLORS.white);
  // front door with a little canopy
  iso.r.poly([P(u1 - 0.14, v1, 11), P(u1 - 0.06, v1, 11), P(u1 - 0.06, v1, 0), P(u1 - 0.14, v1, 0)], darken(wall, 0.4));
  iso.r.poly(
    [P(u1 - 0.16, v1, 13), P(u1 - 0.04, v1, 13), P(u1 - 0.05, v1 + 0.035, 11), P(u1 - 0.15, v1 + 0.035, 11)],
    COLORS.white,
  );
  // integral garage wing with a white roller door
  const g0 = u1;
  const g1 = u1 + 0.2;
  iso.box(g0, v0 + 0.1, g1, v1, 0, 13, wall, { topC: top(roof, 0.1) });
  iso.r.poly(
    [P(g0 + 0.025, v1, 10), P(g1 - 0.025, v1, 10), P(g1 - 0.025, v1, 0), P(g0 + 0.025, v1, 0)],
    lighten(COLORS.white, 0.02),
  );
  for (let z = 2; z < 10; z += 2.4) {
    iso.r.line(P(g0 + 0.03, v1, z), P(g1 - 0.03, v1, z), INK_W * 0.5, alpha(INK, 0.35));
  }
  // tight paved drive to the plot edge + slab path to the door
  iso.quad(g0 + 0.01, v1 + 0.005, g1 + 0.01, 0.98, 0, alpha(COLORS.pavement, 0.92), alpha(darken(COLORS.pavement, 0.08), 0.92));
  iso.quad(u1 - 0.14, v1 + 0.005, u1 - 0.06, 0.86, 0, alpha(COLORS.pavement, 0.85));
  if (variant >= 1) {
    // rooftop solar on the near slope, fitted at build time
    const vm = (v0 + v1) / 2;
    const rise = 11;
    const sz = (v: number): number => H + rise * ((v1 - v) / (v1 - vm));
    const pv0 = vm + 0.05;
    const pv1 = v1 - 0.045;
    const pu0 = variant === 1 ? u0 + 0.05 : u0 + 0.03;
    const pu1 = variant === 1 ? u1 - 0.12 : u1 - 0.05;
    iso.r.poly(
      [P(pu0, pv0, sz(pv0) + 1), P(pu1, pv0, sz(pv0) + 1), P(pu1, pv1, sz(pv1) + 1), P(pu0, pv1, sz(pv1) + 1)],
      COLORS.panel,
    );
    iso.r.line(P(pu0, pv0, sz(pv0) + 1.5), P(pu1, pv0, sz(pv0) + 1.5), INK_W * 0.7, COLORS.panelGlint);
  }
  // a sapling in the handkerchief garden
  if (rng.chance(0.6)) iso.ball(0.12, 0.82, 0.055, 13, COLORS.treeLime);
  return iso.build();
}

/** Two suburban semis with gardens and hedges. */
export function semiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 104729 + 7);
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
/** Georgian stucco terrace — Mayfair/Belgravia: flat white fronts, tall
 *  sash windows in strict rhythm, parapet roofline, black doors and
 *  railings. The West End in one tile. */
export function georgianTile(seed: number, variantIx: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 88811 + variantIx * 31 + 7);
  const stucco = lighten(COLORS.white, 0.03);
  const ink = hex('#1c1a22');
  const v0 = 0.14;
  const v1 = 0.74;
  const H = 46;
  iso.shadow(0.02, v0, 0.98, v1, 0.18, 0.2);
  iso.box(0.02, v0, 0.98, v1, 0, H, stucco, { topC: darken(stucco, 0.12) });
  // parapet line + rusticated ground-floor band
  iso.r.poly([iso.P(0.02, v1, H), iso.P(0.98, v1, H), iso.P(0.98, v1, H - 2.5), iso.P(0.02, v1, H - 2.5)], COLORS.white);
  iso.r.poly([iso.P(0.02, v1, 13), iso.P(0.98, v1, 13), iso.P(0.98, v1, 12), iso.P(0.02, v1, 12)], darken(stucco, 0.18));
  // storeys of tall sashes, diminishing upward — the Georgian tell
  iso.windowsLeft(v1, 0.06, 0.94, 26, 40, 5, glass(rng, 0.35), darken(stucco, 0.25));
  iso.windowsLeft(v1, 0.06, 0.94, 15, 24, 5, glass(rng, 0.3), darken(stucco, 0.25));
  // black doors with fanlights, every other bay
  for (const u of [0.12, 0.5, 0.88]) {
    iso.r.poly([iso.P(u - 0.035, v1, 11), iso.P(u + 0.035, v1, 11), iso.P(u + 0.035, v1, 0), iso.P(u - 0.035, v1, 0)], ink);
    iso.r.poly([iso.P(u - 0.02, v1, 11), iso.P(u + 0.02, v1, 11), iso.P(u + 0.02, v1, 9.5), iso.P(u - 0.02, v1, 9.5)], COLORS.glassLit);
  }
  // railings along the pavement
  iso.r.line(iso.P(0.02, v1 + 0.12, 4), iso.P(0.98, v1 + 0.12, 4), 1.4, ink);
  for (let u = 0.05; u < 0.97; u += 0.06) {
    iso.r.line(iso.P(u, v1 + 0.12, 0), iso.P(u, v1 + 0.12, 4), 1.1, ink);
  }
  // chimney row behind the parapet
  for (const cu of variantIx === 0 ? [0.2, 0.55, 0.85] : [0.3, 0.7]) {
    iso.box(cu, 0.3, cu + 0.05, 0.36, H, H + 9, darken(stucco, 0.2));
  }
  return iso.build();
}

export function villaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 31337 + 3);
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

/**
 * Bespoke PARIS building stock: a Haussmann apartment block. Researched from
 * the reference photos (owner, 2026-06-14): uniform ~6-storey cream
 * pierre-de-taille ashlar facade with a strong cornice, regular tall French
 * windows, continuous wrought-iron *balcons filants* (typically the 2nd and
 * top floors), and the signature steep GREY ZINC MANSARD roof with dormer
 * windows (lucarnes) + chimney stacks. Drawn full-tile so a street of them
 * reads as the grid-like, pale, uniform Paris the owner described.
 */
export function haussmannTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 36497 + variant * 131 + 7);
  // pierre de taille — warm pale limestone, a touch of per-block variation
  const stoneSet: RGBA[] = [hex('#e6ddc6'), hex('#e1d7bf'), hex('#eae2cd'), hex('#dcd2b8')];
  const stone = stoneSet[variant % stoneSet.length] ?? stoneSet[0]!;
  // the grey zinc roofscape — VARIED per block (this is what reads from above)
  const roofShades: RGBA[] = [
    hex('#6b7079'), hex('#595f6a'), hex('#787e88'), hex('#535963'),
    hex('#6c6675'), hex('#626a6e'), hex('#70757e'), hex('#4f555f'),
  ];
  const zinc = roofShades[variant % roofShades.length] ?? roofShades[0]!;
  const zincTop = lighten(zinc, 0.12);
  const iron = hex('#34343d'); // balcony railings + window guards
  const band = hex('#d8cdb1'); // string-course / cornice shadow line
  const frame = hex('#f1ebdb');
  const u0 = 0;
  const u1 = 1;
  const v0 = 0.08;
  const v1 = 0.86;
  const floors = 5 + (variant % 3); // 5–7 storeys, near-uniform along the street
  const shop = variant % 3 === 2; // some blocks have ground-floor commerce
  const fh = 8.4;
  const H = Math.round(10 + floors * fh); // top of the stone facade (cornice)
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);

  // the limestone block
  iso.box(u0, v0, u1, v1, 0, H, stone);

  // ground floor: mark the taller porte-cochère band with a sill line
  iso.edge(P(u0, v1, fh + 2), P(u1, v1, fh + 2), INK_W * 0.6, alpha(INK, 0.5));

  // horizontal string courses between floors (the strong Parisian horizontals)
  for (let f = 1; f <= floors; f++) {
    const z = 10 + f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.7, alpha(band, 0.9));
    iso.r.line(P(u1, v0, z), P(u1, v1, z), INK_W * 0.7, alpha(band, 0.9));
  }

  // regular tall French windows on both visible walls, one row per floor
  for (let f = 0; f < floors; f++) {
    const zb = 12 + f * fh + 1.4;
    const zt = 12 + f * fh + fh - 1.2;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 5, glass(rng, 0.45), frame);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 5, glass(rng, 0.4), frame);
  }

  // ground-floor commerce on some blocks: bright glazed shopfronts under a
  // coloured awning + fascia — the lived-in Parisian street wall
  if (shop) {
    const awn = ([COLORS.orange, hex('#3f8f8a'), hex('#b5485f'), hex('#4a6ba8')] as RGBA[])[
      (seed + variant) % 4
    ]!;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 1.5, fh - 0.6, 5, COLORS.glassLit, frame);
    iso.r.poly(
      [P(u0 + 0.04, v1, fh + 0.6), P(u1 - 0.04, v1, fh + 0.6), P(u1 - 0.04, v1, fh - 1), P(u0 + 0.04, v1, fh - 1)],
      awn,
    );
    iso.edge(P(u0 + 0.04, v1, fh - 1), P(u1 - 0.04, v1, fh - 1), INK_W * 0.6, alpha(INK, 0.4));
  }

  // continuous wrought-iron balconies (balcons filants) on the 2nd + top floors
  const balconyFloors = variant % 2 === 0 ? [1, floors - 1] : [1, floors - 2, floors - 1];
  for (const f of balconyFloors) {
    if (f < 1 || f >= floors) continue;
    const z = 12 + f * fh;
    drawBalcony(iso, u0 + 0.04, u1 - 0.04, v1, z, iron, frame);
  }

  // the cornice: a crisp protruding ledge crowning the stone
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H - 2, H + 1.5, lighten(stone, 0.06), {
    topC: top(stone, 0.3),
  });

  // the steep grey-zinc MANSARD roof: slopes inward from the cornice
  const mr = 12 + (variant % 4) * 4; // 12..24 — visible roof-height variety
  const ui = 0.16; // inward inset of the mansard's flat top (u)
  const vi = 0.12; // inward inset (v)
  const zT = H + mr;
  // near (left, v1) slope — shaded
  iso.r.poly(
    [P(u0, v1, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u0 + ui, v1 - vi, zT)],
    shaded(zinc, 0.18),
  );
  // right (u1) slope — lit
  iso.r.poly(
    [P(u1, v0, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT)],
    lit(zinc, 0.06),
  );
  // ink the mansard silhouette
  iso.r.polyline([P(u0, v1, H), P(u0 + ui, v1 - vi, zT), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT), P(u1, v0, H)], INK_W, INK);
  iso.edge(P(u1, v1, H), P(u1 - ui, v1 - vi, zT));

  // the roof top — most blocks are HOLLOW around a central courtyard (cour),
  // the dark well that gives the Paris roofscape its characteristic texture
  // instead of a solid identical diamond.
  iso.quad(u0 + ui, v0 + vi, u1 - ui, v1 - vi, zT, zincTop); // the leaded roof
  if (variant % 5 !== 0) {
    // the central light-well / cour: a dark recessed square, the Paris-from-
    // above texture (read flat at the roof plane so it never looks raised)
    const cu0 = 0.38;
    const cu1 = 0.64;
    const cv0 = 0.37;
    const cv1 = 0.57;
    iso.quad(cu0, cv0, cu1, cv1, zT, shaded(zinc, 0.52));
    iso.quad(cu0 + 0.03, cv0 + 0.025, cu1 - 0.03, cv1 - 0.025, zT, shaded(zinc, 0.66));
    iso.r.polyline([P(cu0, cv0, zT), P(cu1, cv0, zT), P(cu1, cv1, zT), P(cu0, cv1, zT), P(cu0, cv0, zT)], INK_W * 0.6, alpha(INK, 0.6));
  }

  // dormer windows (lucarnes) on the near slope — count varies
  const dormers = 2 + (variant % 3);
  for (let i = 0; i < dormers; i++) {
    const u = 0.18 + (i * 0.64) / Math.max(1, dormers - 1);
    const vd = v1 - vi * 0.45;
    const zd = H + mr * 0.32;
    iso.box(u - 0.045, vd, u + 0.045, vd + 0.04, zd, zd + 7, lighten(zinc, 0.14));
    iso.windowsLeft(vd + 0.04, u - 0.034, u + 0.034, zd + 1.5, zd + 6, 1, glass(rng, 0.55), frame);
    iso.r.poly([P(u - 0.055, vd, zd + 7), P(u + 0.055, vd, zd + 7), P(u, vd, zd + 11)], shaded(zinc, 0.05));
  }

  // chimney stacks with pale pots — placement varies per block
  const chimUs = ([[0.1, 0.9], [0.14, 0.5, 0.88], [0.22, 0.78]] as number[][])[variant % 3]!;
  for (const cu of chimUs) {
    const cvm = (v0 + v1) / 2;
    iso.box(cu - 0.028, cvm - 0.035, cu + 0.028, cvm + 0.035, zT, zT + 8, shaded(stone, 0.08));
    for (const dv of [-0.028, 0.018]) {
      iso.box(cu - 0.011, cvm + dv, cu + 0.011, cvm + dv + 0.02, zT + 8, zT + 12, hex('#9a8f78'), { ink: false });
    }
  }
  return iso.build();
}

/** A continuous wrought-iron balcony ledge + balusters across a left wall. */
function drawBalcony(
  iso: Iso,
  uA: number,
  uB: number,
  v: number,
  z: number,
  iron: RGBA,
  rail: RGBA,
): void {
  const out = v + 0.03; // protrudes from the facade
  // the stone slab the balcony sits on
  iso.r.poly([P(uA, v, z), P(uB, v, z), P(uB, out, z), P(uA, out, z)], lighten(iron, 0.55));
  iso.r.poly([P(uA, out, z), P(uB, out, z), P(uB, out, z - 0.8), P(uA, out, z - 0.8)], rail);
  // the iron railing band
  iso.r.poly([P(uA, out, z + 4.2), P(uB, out, z + 4.2), P(uB, out, z), P(uA, out, z)], alpha(iron, 0.92));
  // top rail + balusters (ink)
  iso.r.line(P(uA, out, z + 4.2), P(uB, out, z + 4.2), INK_W * 0.8, iron);
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const u = uA + ((uB - uA) * i) / n;
    iso.r.line(P(u, out, z + 4.2), P(u, out, z + 0.4), INK_W * 0.45, alpha(iron, 0.8));
  }
}

/** Residential tower block with colour-block walls and floor bands. */
export function towerTile(seed: number, variant = 0): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 49157 + variant * 277 + 11);
  // variant drives the WHOLE look so a skyline of these reads diverse: colour
  // (the full wall rotation), height, slab width, window rhythm and crown.
  const wall = wallColor(variant);
  const slim = variant % 3 === 1; // some slimmer point blocks
  const u0 = slim ? 0.26 : 0.18;
  const v0 = slim ? 0.24 : 0.18;
  const u1 = 1 - u0;
  const v1 = 1 - v0;
  const H = 84 + (variant % 4) * 19 + (seed % 3) * 5;
  const cols = 3 + (variant % 2);
  const band = variant % 4 === 0; // banded vs plain spandrels
  iso.shadow(u0, v0, u1, v1, 0.3, 0.26);
  iso.box(u0, v0, u1, v1, 0, H, wall);
  for (let z = 12; z < H - 8; z += 15) {
    if (band) {
      iso.r.poly([P(u0, v1, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u0, v1, z + 9)], alpha(COLORS.white, 0.9));
      iso.r.poly([P(u1, v0, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u1, v0, z + 9)], alpha(COLORS.white, 0.75));
    }
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, z, z + 8, cols, glass(rng, 0.35));
    iso.windowsRight(u1, v0 + 0.04, v1 - 0.04, z, z + 8, cols, glass(rng, 0.3));
  }
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H, H + 4, COLORS.white);
  const crown = variant % 3;
  if (crown === 0) {
    // plant room + beacon
    iso.box(0.5, 0.3, 0.72, 0.5, H + 4, H + 14, COLORS.concrete);
    iso.box(u0 + 0.06, u0 + 0.06, u0 + 0.09, u0 + 0.09, H + 4, H + 12, COLORS.steelDark);
    iso.quad(u0 + 0.045, u0 + 0.045, u0 + 0.105, u0 + 0.105, H + 12, COLORS.orange);
  } else if (crown === 1) {
    // stepped setback
    iso.box(u0 + 0.08, v0 + 0.08, u1 - 0.08, v1 - 0.08, H + 4, H + 18, wall);
    iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, H + 18, H + 28, lighten(wall, 0.08));
  } else {
    // pitched cap
    iso.hip(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H + 4, 12, roofColor(variant + 1));
  }
  return iso.build();
}

/** Glass office tower with a sunset-reflecting curtain wall and setback crown.
 *  variant rotates the curtain-wall tint, height and crown for skyline variety. */
export function officeTile(seed: number, variant = 0): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 65537 + variant * 313 + 5);
  // a rotation of curtain-wall glazings: bronze/blue/teal/dusk-pink
  const tints: Array<[RGBA, RGBA]> = [
    [COLORS.glassSunset, COLORS.glassSky],
    [hex('#6f86a8'), hex('#9fb4cf')], // cool blue
    [hex('#5f8f86'), hex('#9ac0b4')], // green/teal
    [hex('#b58a5f'), hex('#d6b98f')], // bronze
  ];
  const [faceR, faceL] = tints[variant % tints.length] ?? tints[0]!;
  const u0 = 0.16;
  const v0 = 0.16;
  const u1 = 0.84;
  const v1 = 0.84;
  const H = 108 + (variant % 4) * 16 + (seed % 2) * 8;
  iso.shadow(u0, v0, u1, v1, 0.34, 0.28);
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, 0), P(u0, v1, 0)], COLORS.glassDark, shaded(faceL, 0.2));
  iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1, v1, 0), P(u1, v0, 0)], faceR, faceL);
  iso.quad(u0, v0, u1, v1, H, COLORS.white);
  for (let z = 14; z < H - 6; z += 14) {
    iso.r.poly([P(u0, v1, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u0, v1, z)], alpha(COLORS.white, 0.85));
    iso.r.poly([P(u1, v0, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u1, v0, z)], alpha(COLORS.white, 0.7));
  }
  for (let z = 16; z < H - 10; z += 14) {
    if (rng.chance(0.4)) {
      const a = rng.range(u0 + 0.05, 0.55);
      iso.r.poly([P(a, v1, z + 9), P(a + 0.2, v1, z + 9), P(a + 0.2, v1, z + 2), P(a, v1, z + 2)], alpha(COLORS.glassLit, 0.8));
    }
  }
  // crown varies: flat setback, or a slim mast, or a stepped top
  if (variant % 3 === 0) {
    iso.box(0.3, 0.3, 0.7, 0.7, H, H + 16, COLORS.white, { topC: COLORS.white });
    iso.box(0.44, 0.44, 0.56, 0.56, H + 16, H + 26, COLORS.steel);
  } else if (variant % 3 === 1) {
    iso.box(0.28, 0.28, 0.72, 0.72, H, H + 10, COLORS.white);
    iso.box(0.46, 0.46, 0.5, 0.5, H + 10, H + 34, COLORS.steelDark); // comms mast
  } else {
    iso.box(0.26, 0.26, 0.74, 0.74, H, H + 8, COLORS.white);
    iso.box(0.34, 0.34, 0.66, 0.66, H + 8, H + 18, lighten(COLORS.steel, 0.1));
    iso.box(0.42, 0.42, 0.58, 0.58, H + 18, H + 26, COLORS.steel);
  }
  return iso.build();
}

/** Essex cottage with a vegetable garden and apple tree. */
export function cottageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 24593 + 9);
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

/** Built-out solar farm: tilted panel rows over the field beneath. */
export function solarFarmTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
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
