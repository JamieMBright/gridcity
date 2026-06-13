// The player's own kit: power stations and substations. These are the
// hero objects of the game, so they read brand-first — navy steel, white
// frames and unmistakable UKPN orange — and they stay saturated when the
// grid view desaturates the city around them.

import { Rng } from '../../sim/rng';
import { CELL_W, INK, INK_W, Iso, lit, P, RES, shaded } from './iso';
import { COLORS } from './palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from './raster';

const NAVY = hex('#39426e');
const NAVY_DEEP = hex('#252c52');
const PAD = hex('#aab0bd');

function padFloor(iso: Iso): void {
  iso.floor(PAD, darken(PAD, 0.1));
}

/** Perimeter security fence: slim posts + a light rail, with a gap gate.
 *  Spans the Iso's whole footprint (multi-tile pads included). */
function fence(iso: Iso, inset: number, h: number): void {
  const a = inset;
  const bU = iso.wTiles - inset;
  const bV = iso.hTiles - inset;
  const post = (u: number, v: number): void => {
    iso.r.poly([iso.P(u, v, h), iso.P(u + 0.012, v, h), iso.P(u + 0.012, v, 0), iso.P(u, v, 0)], COLORS.steel);
  };
  const postsU = 5 * iso.wTiles;
  const postsV = 5 * iso.hTiles;
  for (let i = 0; i <= postsU; i++) post(a + ((bU - a) * i) / postsU, bV); // front-left edge
  for (let i = 0; i <= postsV; i++) post(bU, a + ((bV - a) * i) / postsV); // front-right edge
  // rails along the two visible edges
  iso.r.poly([iso.P(a, bV, h), iso.P(bU, bV, h), iso.P(bU, bV, h - 1.5), iso.P(a, bV, h - 1.5)], alpha(COLORS.steel, 0.85));
  iso.r.poly([iso.P(bU, a, h), iso.P(bU, bV, h), iso.P(bU, bV, h - 1.5), iso.P(bU, a, h - 1.5)], alpha(COLORS.steel, 0.85));
}

/** A transformer unit: navy tank, cooling fins, white bushings. */
function transformer(iso: Iso, u0: number, v0: number, w: number, h: number): void {
  const u1 = u0 + w;
  const v1 = v0 + w * 0.9;
  iso.shadow(u0, v0, u1, v1, 0.1, 0.2);
  iso.box(u0, v0, u1, v1, 0, h, NAVY);
  // cooling fins on the left face
  for (let t = 0.12; t < 0.9; t += 0.2) {
    const u = u0 + (u1 - u0) * t;
    iso.r.poly(
      [P(u, v1 + 0.012, h * 0.85), P(u + 0.02, v1 + 0.012, h * 0.85), P(u + 0.02, v1 + 0.012, 2), P(u, v1 + 0.012, 2)],
      shaded(NAVY, 0.12),
    );
  }
  // orange hazard band
  iso.r.poly(
    [P(u1 + 0.001, v0, h * 0.45), P(u1 + 0.001, v1, h * 0.45), P(u1 + 0.001, v1, h * 0.3), P(u1 + 0.001, v0, h * 0.3)],
    alpha(COLORS.orange, 0.95),
  );
  // three bushings
  for (let t = 0.2; t < 0.95; t += 0.3) {
    const u = u0 + (u1 - u0) * t;
    const v = v0 + (v1 - v0) * 0.5;
    iso.box(u, v, u + 0.018, v + 0.018, h, h + 9, COLORS.white);
    iso.quad(u - 0.004, v - 0.004, u + 0.022, v + 0.022, h + 9, COLORS.steelDark);
  }
}

/** Steel lattice gantry: two legs + crossbar, busbar drops. */
function gantry(iso: Iso, u0: number, u1: number, v: number, h: number): void {
  const leg = (u: number): void => {
    iso.r.poly([P(u, v, h), P(u + 0.016, v, h), P(u + 0.016, v, 0), P(u, v, 0)], COLORS.steelDark);
  };
  leg(u0);
  leg(u1);
  iso.r.poly([P(u0 - 0.02, v, h), P(u1 + 0.036, v, h), P(u1 + 0.036, v, h - 2.5), P(u0 - 0.02, v, h - 2.5)], COLORS.steel);
  // insulator drops
  for (let t = 0.25; t < 0.9; t += 0.25) {
    const u = u0 + (u1 - u0) * t;
    iso.r.poly([P(u, v, h - 2.5), P(u + 0.008, v, h - 2.5), P(u + 0.008, v, h - 9), P(u, v, h - 9)], COLORS.white);
  }
}

/** 33 kV/LV distribution substation: one transformer in a small compound. */
export function subDistTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.14, 12);
  transformer(iso, 0.34, 0.3, 0.3, 22);
  // orange wayleave door on the right fence line
  iso.r.poly([P(0.86, 0.45, 11), P(0.86, 0.6, 11), P(0.86, 0.6, 0), P(0.86, 0.45, 0)], COLORS.orange);
  return iso.build();
}

/** 132/33 kV grid substation: twin transformers + gantry. */
export function subGridTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.08, 12);
  gantry(iso, 0.2, 0.78, 0.22, 52);
  transformer(iso, 0.18, 0.42, 0.26, 24);
  transformer(iso, 0.56, 0.42, 0.26, 24);
  // control kiosk
  iso.box(0.16, 0.78, 0.34, 0.9, 0, 12, COLORS.concrete);
  iso.quad(0.15, 0.77, 0.35, 0.91, 12, COLORS.orange);
  return iso.build();
}

/** 400/132 kV bulk supply point (GSP): a 2x2 sprawling switchyard —
 *  ranks of lattice gantries with insulator drops, busbar runs, banks
 *  of transformers, the control house in the corner. */
export function subBulkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2);
  void seed;
  iso.floor(PAD, darken(PAD, 0.1));
  fence(iso, 0.06, 14);

  // multi-tile-safe local kit (the 1x1 helpers project with the bare P)
  const yardGantry = (u0: number, u1: number, v: number, h: number): void => {
    for (const u of [u0, u1]) {
      iso.r.poly([iso.P(u, v, h), iso.P(u + 0.018, v, h), iso.P(u + 0.018, v, 0), iso.P(u, v, 0)], COLORS.steelDark);
      // lattice hint
      iso.r.line(iso.P(u, v, h * 0.55), iso.P(u + 0.018, v, h * 0.75), INK_W * 0.6, alpha(COLORS.steel, 0.9));
      iso.r.line(iso.P(u, v, h * 0.75), iso.P(u + 0.018, v, h * 0.55), INK_W * 0.6, alpha(COLORS.steel, 0.9));
    }
    iso.r.poly(
      [iso.P(u0 - 0.03, v, h), iso.P(u1 + 0.05, v, h), iso.P(u1 + 0.05, v, h - 3), iso.P(u0 - 0.03, v, h - 3)],
      COLORS.steel,
    );
    for (let t = 0.18; t < 0.95; t += 0.16) {
      const u = u0 + (u1 - u0) * t;
      iso.r.poly(
        [iso.P(u, v, h - 3), iso.P(u + 0.01, v, h - 3), iso.P(u + 0.01, v, h - 11), iso.P(u, v, h - 11)],
        COLORS.white,
      );
    }
  };
  const yardTx = (u0: number, v0: number, w: number, h: number): void => {
    const u1 = u0 + w;
    const v1 = v0 + w * 0.9;
    iso.shadow(u0, v0, u1, v1, 0.1, 0.2);
    iso.box(u0, v0, u1, v1, 0, h, NAVY);
    iso.r.poly(
      [iso.P(u1 + 0.002, v0, h * 0.45), iso.P(u1 + 0.002, v1, h * 0.45), iso.P(u1 + 0.002, v1, h * 0.28), iso.P(u1 + 0.002, v0, h * 0.28)],
      alpha(COLORS.orange, 0.95),
    );
    for (let t = 0.2; t < 0.95; t += 0.3) {
      const u = u0 + (u1 - u0) * t;
      const v = v0 + (v1 - v0) * 0.5;
      iso.box(u, v, u + 0.022, v + 0.022, h, h + 10, COLORS.white);
    }
  };

  // three ranks of portal gantries marching down the yard, 400 side tall
  yardGantry(0.2, 1.75, 0.3, 86);
  yardGantry(0.2, 1.75, 0.75, 74);
  yardGantry(0.2, 1.75, 1.2, 62);
  // busbar runs between the ranks
  for (const u of [0.45, 0.95, 1.5]) {
    iso.r.line(iso.P(u, 0.3, 74), iso.P(u, 0.75, 64), INK_W * 0.7, alpha(COLORS.steelDark, 0.85));
    iso.r.line(iso.P(u, 0.75, 64), iso.P(u, 1.2, 54), INK_W * 0.7, alpha(COLORS.steelDark, 0.85));
  }
  // transformer bank along the low side
  yardTx(0.18, 1.5, 0.3, 32);
  yardTx(0.66, 1.5, 0.3, 32);
  yardTx(1.14, 1.5, 0.3, 32);
  yardTx(1.62, 1.52, 0.26, 28);
  // control house with the brand roof
  iso.box(0.14, 0.06, 0.55, 0.3, 0, 18, COLORS.concrete);
  iso.quad(0.12, 0.04, 0.57, 0.32, 18, COLORS.orange);
  return iso.build();
}

/** Gas CCGT: navy turbine hall, glowing service windows, twin stacks. */
export function gasPlantTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 91003 + 7);
  padFloor(iso);
  iso.shadow(0.06, 0.14, 0.78, 0.7, 0.22, 0.24);
  iso.box(0.06, 0.14, 0.78, 0.7, 0, 44, NAVY);
  iso.gable(0.06, 0.14, 0.78, 0.7, 44, 14, 'u', NAVY_DEEP, NAVY);
  // white floor band + warm window strip
  iso.r.poly([P(0.06, 0.7, 10), P(0.78, 0.7, 10), P(0.78, 0.7, 7), P(0.06, 0.7, 7)], COLORS.white);
  iso.windowsLeft(0.7, 0.1, 0.72, 14, 30, 6, rng.chance(0.8) ? COLORS.glassLit : COLORS.glassHot, COLORS.white);
  iso.windowsRight(0.78, 0.2, 0.64, 14, 30, 4, COLORS.glassDark, COLORS.white);
  // orange brand chevron on the gable end
  iso.r.poly([P(0.78, 0.2, 38), P(0.78, 0.32, 38), P(0.78, 0.32, 20), P(0.78, 0.2, 20)], COLORS.orange);
  // twin exhaust stacks with white collars
  for (const [u, v, h] of [
    [0.84, 0.3, 96],
    [0.84, 0.5, 88],
  ] as const) {
    iso.box(u, v, u + 0.07, v + 0.07, 0, h, lighten(NAVY, 0.12));
    iso.r.poly([P(u - 0.005, v + 0.07, h - 10), P(u + 0.075, v + 0.07, h - 10), P(u + 0.075, v + 0.07, h - 16), P(u - 0.005, v + 0.07, h - 16)], COLORS.white);
    iso.quad(u - 0.005, v - 0.005, u + 0.075, v + 0.075, h, COLORS.steelDark);
  }
  return iso.build();
}

/** Nuclear: a Hinkley-class 3x2 campus — the great pale reactor hall,
 *  its slightly lower twin, the long turbine hall, fuel silos, a slim
 *  vent stack and the white containment dome over the far hall. */
export function nuclearTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2);
  void seed;
  iso.floor(PAD, darken(PAD, 0.1));
  fence(iso, 0.05, 13);
  const HALL = hex('#b9c6d6'); // pale reactor-blue cladding
  const HALL_DK = darken(HALL, 0.12);

  // long low turbine hall along the front of the site
  iso.shadow(0.2, 1.25, 2.1, 1.78, 0.14, 0.2);
  iso.box(0.2, 1.25, 2.1, 1.78, 0, 34, COLORS.concrete);
  iso.gable(0.2, 1.25, 2.1, 1.78, 34, 8, 'u', darken(COLORS.concrete, 0.12), COLORS.concrete);
  iso.windowsLeft(1.78, 0.3, 2.0, 12, 24, 10, COLORS.glassLit, COLORS.white);

  // the great reactor hall: tall pale-blue block with a stepped annex
  iso.shadow(0.35, 0.3, 1.25, 1.15, 0.2, 0.24);
  iso.box(0.35, 0.3, 1.25, 1.15, 0, 92, HALL, {
    leftC: shaded(HALL, 0.16),
    rightC: lit(HALL, 0.05),
    topC: lighten(HALL, 0.08),
  });
  // glazed crown band (the Hinkley B green-glass parapet)
  iso.r.poly(
    [iso.P(0.35, 1.15, 92), iso.P(1.25, 1.15, 92), iso.P(1.25, 1.15, 82), iso.P(0.35, 1.15, 82)],
    COLORS.glassDark,
  );
  iso.r.poly(
    [iso.P(1.25, 0.3, 92), iso.P(1.25, 1.15, 92), iso.P(1.25, 1.15, 82), iso.P(1.25, 0.3, 82)],
    shaded(COLORS.glassDark, 0.1),
  );
  // its slightly lower twin behind, stepping down
  iso.shadow(1.3, 0.42, 2.0, 1.15, 0.16, 0.2);
  iso.box(1.3, 0.42, 2.0, 1.15, 0, 70, HALL_DK, {
    leftC: shaded(HALL_DK, 0.14),
    rightC: lit(HALL_DK, 0.05),
    topC: lighten(HALL_DK, 0.07),
  });

  // white containment dome on a drum at the seaward end
  {
    const drumH = 56;
    iso.box(2.18, 0.5, 2.66, 0.98, 0, drumH, COLORS.white, {
      leftC: shaded(COLORS.white, 0.18),
      rightC: lit(COLORS.white, 0.04),
      topC: COLORS.white,
    });
    const [cx, cy] = iso.P(2.42, 0.74, 0);
    const R = 0.24 * (CELL_W / 2);
    const drumPx = drumH * RES;
    const dome = (sc: number, c: RGBA): void => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (i / 8);
        pts.push([cx + Math.cos(a) * R * sc, cy - drumPx - Math.sin(a) * R * 0.78 * sc]);
      }
      iso.r.poly(pts, c);
    };
    dome(1, shaded(COLORS.white, 0.1));
    dome(0.72, lit(COLORS.white, 0.05));
    iso.r.poly(
      [[cx - 1.5 * RES, cy - drumPx - R * 0.78 - 4 * RES], [cx + 1.5 * RES, cy - drumPx - R * 0.78 - 4 * RES], [cx + 1.5 * RES, cy - drumPx - R * 0.78], [cx - 1.5 * RES, cy - drumPx - R * 0.78]],
      COLORS.orange,
    );
  }

  // slim vent stack with the white collar + a row of fuel silos
  iso.box(1.16, 1.2, 1.26, 1.3, 0, 118, lighten(NAVY, 0.12));
  iso.r.poly(
    [iso.P(1.155, 1.3, 106), iso.P(1.265, 1.3, 106), iso.P(1.265, 1.3, 98), iso.P(1.155, 1.3, 98)],
    COLORS.white,
  );
  for (let k = 0; k < 4; k++) {
    const u = 0.16 + k * 0.13;
    iso.box(u, 0.14, u + 0.09, 0.23, 0, 26, COLORS.white);
    iso.quad(u - 0.005, 0.135, u + 0.095, 0.235, 26, shaded(COLORS.white, 0.12));
  }
  return iso.build();
}

/** A little orange crew van (shared by the depot and the moving fleet). */
function van(iso: Iso, u: number, v: number, heading: 'u' | 'v' = 'u'): void {
  const lw = heading === 'u' ? 0.16 : 0.09;
  const lh = heading === 'u' ? 0.09 : 0.16;
  iso.shadow(u, v, u + lw, v + lh, 0.04, 0.18);
  // body
  iso.box(u, v, u + lw, v + lh, 0, 9, COLORS.orange);
  // cab + windshield
  if (heading === 'u') {
    iso.box(u + lw * 0.72, v, u + lw, v + lh, 0, 7, COLORS.orange);
    iso.r.poly(
      [P(u + lw, v + 0.01, 6.5), P(u + lw, v + lh - 0.01, 6.5), P(u + lw, v + lh - 0.01, 2.5), P(u + lw, v + 0.01, 2.5)],
      COLORS.glassDark,
    );
  } else {
    iso.r.poly(
      [P(u + 0.01, v + lh, 6.5), P(u + lw - 0.01, v + lh, 6.5), P(u + lw - 0.01, v + lh, 2.5), P(u + 0.01, v + lh, 2.5)],
      COLORS.glassDark,
    );
  }
  // white roof stripe
  iso.quad(u + 0.01, v + 0.01, u + lw - 0.01, v + lh - 0.01, 9.2, COLORS.white);
}

/** Moving fleet sprite: just a van on a transparent cell. */
export function vanTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  van(iso, 0.42, 0.45);
  return iso.build();
}

/** Field operations depot: navy shed, orange roller door, vans on the yard. */
export function depotTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  iso.shadow(0.1, 0.1, 0.66, 0.62, 0.18, 0.22);
  iso.box(0.1, 0.1, 0.66, 0.62, 0, 26, NAVY);
  iso.gable(0.1, 0.1, 0.66, 0.62, 26, 9, 'u', NAVY_DEEP, NAVY);
  // orange roller door on the right face
  iso.r.poly(
    [P(0.66 + 0.001, 0.2, 18), P(0.66 + 0.001, 0.52, 18), P(0.66 + 0.001, 0.52, 0), P(0.66 + 0.001, 0.2, 0)],
    COLORS.orange,
  );
  // white sign band
  iso.r.poly([P(0.12, 0.62, 22), P(0.64, 0.62, 22), P(0.64, 0.62, 18), P(0.12, 0.62, 18)], COLORS.white);
  van(iso, 0.74, 0.3, 'v');
  van(iso, 0.34, 0.74, 'u');
  return iso.build();
}

/** Grid battery: container rows with orange end doors + inverter kiosk. */
export function batteryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.1, 10);
  for (const v0 of [0.2, 0.45, 0.7] as const) {
    iso.shadow(0.16, v0, 0.72, v0 + 0.16, 0.08, 0.16);
    iso.box(0.16, v0, 0.72, v0 + 0.16, 0, 16, NAVY);
    // orange door on the right end
    iso.r.poly(
      [P(0.72 + 0.001, v0 + 0.02, 14), P(0.72 + 0.001, v0 + 0.14, 14), P(0.72 + 0.001, v0 + 0.14, 1), P(0.72 + 0.001, v0 + 0.02, 1)],
      COLORS.orange,
    );
    // cooling vents along the top
    iso.quad(0.2, v0 + 0.03, 0.68, v0 + 0.13, 16.2, shaded(NAVY, 0.1));
  }
  iso.box(0.8, 0.4, 0.92, 0.56, 0, 13, COLORS.concrete);
  iso.quad(0.79, 0.39, 0.93, 0.57, 13, COLORS.orange);
  return iso.build();
}

/** HVDC interconnector terminal: the valves live indoors, so the site
 *  reads as a tall boxy converter hall (navy, windowless, white roof
 *  stripe, orange brand band) beside a modest DC switchyard — one
 *  gantry, a converter transformer and a pair of white smoothing-
 *  reactor drums. The submarine cable leaves off-map. */
export function interconnectorTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.06, 12);
  // converter hall
  iso.shadow(0.1, 0.12, 0.56, 0.62, 0.22, 0.26);
  iso.box(0.1, 0.12, 0.56, 0.62, 0, 36, NAVY);
  iso.quad(0.12, 0.14, 0.54, 0.6, 36.2, lighten(NAVY, 0.08));
  // white sign band high on the front face, orange band below it
  iso.r.poly(
    [P(0.12, 0.62 + 0.001, 32), P(0.54, 0.62 + 0.001, 32), P(0.54, 0.62 + 0.001, 28), P(0.12, 0.62 + 0.001, 28)],
    COLORS.white,
  );
  iso.r.poly(
    [P(0.56 + 0.001, 0.14, 26), P(0.56 + 0.001, 0.6, 26), P(0.56 + 0.001, 0.6, 21), P(0.56 + 0.001, 0.14, 21)],
    COLORS.orange,
  );
  // DC yard: gantry across the back, converter transformer, drums
  gantry(iso, 0.66, 0.92, 0.2, 42);
  transformer(iso, 0.64, 0.4, 0.24, 18);
  for (const v0 of [0.7, 0.82] as const) {
    iso.shadow(0.66, v0, 0.78, v0 + 0.09, 0.06, 0.12);
    iso.box(0.66, v0, 0.78, v0 + 0.09, 0, 10, COLORS.white);
    iso.quad(0.665, v0 + 0.005, 0.775, v0 + 0.085, 10.2, COLORS.steel);
  }
  return iso.build();
}

/** 33 kV capacitor bank (#19): a single-bay shunt-compensation yard —
 *  three elevated steel racks carrying stacks of capacitor cans on
 *  porcelain post insulators, a busbar run along each rack, the control
 *  kiosk in the corner. Quiet kit that moves volts, not megawatts. */
export function capBankTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.1, 10);

  const rack = (v0: number): void => {
    const u0 = 0.16;
    const u1 = 0.74;
    const beamH = 10;
    // frame legs
    for (const u of [u0 + 0.01, (u0 + u1) / 2, u1 - 0.02]) {
      iso.r.poly(
        [P(u, v0 + 0.05, beamH), P(u + 0.013, v0 + 0.05, beamH), P(u + 0.013, v0 + 0.05, 0), P(u, v0 + 0.05, 0)],
        COLORS.steelDark,
      );
    }
    // elevated deck the cans stand on
    iso.quad(u0 - 0.015, v0, u1 + 0.015, v0 + 0.1, beamH, COLORS.steel, darken(COLORS.steel, 0.12));
    iso.r.line(P(u0 - 0.015, v0 + 0.1, beamH), P(u1 + 0.015, v0 + 0.1, beamH), INK_W * 0.7, alpha(INK, 0.7));
    // three phases: porcelain post + a stack of three cans each
    for (let p = 0; p < 3; p++) {
      const u = u0 + 0.06 + p * 0.2;
      iso.box(u + 0.018, v0 + 0.03, u + 0.038, v0 + 0.05, beamH, beamH + 4, COLORS.white, { ink: false });
      for (let c = 0; c < 3; c++) {
        const z0 = beamH + 4 + c * 5.5;
        iso.box(u, v0 + 0.005, u + 0.062, v0 + 0.075, z0, z0 + 4.6, c === 2 ? lighten(NAVY, 0.18) : COLORS.steel);
      }
      // bushing on the top can
      iso.box(u + 0.024, v0 + 0.03, u + 0.038, v0 + 0.044, beamH + 4 + 16.5, beamH + 4 + 21, COLORS.white, { ink: false });
    }
    // busbar tying the three phases together
    const busZ = beamH + 4 + 21;
    iso.r.line(P(u0 + 0.09, v0 + 0.04, busZ), P(u1 - 0.06, v0 + 0.04, busZ), INK_W * 0.7, alpha(COLORS.steelDark, 0.9));
  };
  rack(0.18);
  rack(0.42);
  rack(0.66);

  // control kiosk with the brand roof + orange wayleave door on the fence
  iso.box(0.8, 0.66, 0.94, 0.82, 0, 10, COLORS.concrete);
  iso.quad(0.79, 0.65, 0.95, 0.83, 10, COLORS.orange);
  iso.r.poly([P(0.9, 0.14, 9), P(0.9, 0.26, 9), P(0.9, 0.26, 0), P(0.9, 0.14, 0)], COLORS.orange);
  return iso.build();
}

/** Hydrogen electrolyser (#23): the power-to-gas works — a pale process
 *  hall (stacks go in, hydrogen comes out), a farm of four white
 *  cylindrical H₂ storage tanks with domed crowns, and the pipework
 *  manifold running hall → tanks. Soaks curtailed MWh into the tanks. */
export function electrolyserTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const HALL = hex('#c3cdd8'); // pale process-plant cladding
  padFloor(iso);
  fence(iso, 0.06, 11);

  // process hall with a gable along its length
  iso.shadow(0.08, 0.1, 0.5, 0.64, 0.2, 0.24);
  iso.box(0.08, 0.1, 0.5, 0.64, 0, 28, HALL);
  iso.gable(0.08, 0.1, 0.5, 0.64, 28, 9, 'u', darken(HALL, 0.16), HALL);
  // warm service windows + the white sign band and orange brand stripe
  iso.windowsLeft(0.64, 0.12, 0.46, 9, 20, 5, COLORS.glassLit, COLORS.white);
  iso.r.poly([P(0.1, 0.64 + 0.001, 26), P(0.48, 0.64 + 0.001, 26), P(0.48, 0.64 + 0.001, 23), P(0.1, 0.64 + 0.001, 23)], COLORS.white);
  iso.r.poly([P(0.5 + 0.001, 0.14, 20), P(0.5 + 0.001, 0.6, 20), P(0.5 + 0.001, 0.6, 15), P(0.5 + 0.001, 0.14, 15)], COLORS.orange);
  // rooftop vent stack (hydrogen plants breathe)
  iso.box(0.14, 0.16, 0.19, 0.21, 28, 40, COLORS.steel);

  // H₂ tank farm: four vertical white cylinders with domed crowns
  const tank = (u: number, v: number, s: number): void => {
    const r = 0.062 * s;
    const h = 24 * s;
    iso.shadow(u - r, v, u + r, v + r * 1.4, 0.08, 0.16);
    iso.box(u - r, v - r, u + r, v + r, 0, h, COLORS.white, {
      leftC: shaded(COLORS.white, 0.16),
      rightC: lit(COLORS.white, 0.04),
      topC: COLORS.white,
    });
    // domed crown: stacked ellipse caps over the drum
    const [cx, cy] = P(u, v, h);
    const R = r * (CELL_W / 2) * 1.35;
    for (const [sc, c] of [
      [1, shaded(COLORS.white, 0.1)],
      [0.62, lit(COLORS.white, 0.05)],
    ] as const) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (i / 8);
        pts.push([cx + Math.cos(a) * R * sc, cy - Math.sin(a) * R * 0.5 * sc]);
      }
      iso.r.poly(pts, c);
    }
    // mint H₂ band on the drum
    iso.r.poly(
      [P(u + r + 0.001, v - r + 0.01, h * 0.55), P(u + r + 0.001, v + r - 0.01, h * 0.55), P(u + r + 0.001, v + r - 0.01, h * 0.38), P(u + r + 0.001, v - r + 0.01, h * 0.38)],
      hex('#79c7a8'),
    );
  };
  tank(0.66, 0.22, 1);
  tank(0.85, 0.32, 0.95);
  tank(0.62, 0.46, 0.95);
  tank(0.81, 0.56, 0.9);

  // pipework: an elevated manifold from the hall's right face into the
  // tank farm — ink underlay, steel body, bright highlight, on stub legs
  const pipe = (a: Pt, b: Pt, w = 1.6): void => {
    iso.r.line(a, b, w * RES + 1.6 * RES, alpha(INK, 0.8));
    iso.r.line(a, b, w * RES, COLORS.steel);
    iso.r.line([a[0], a[1] - 0.5 * RES], [b[0], b[1] - 0.5 * RES], w * RES * 0.4, lighten(COLORS.steel, 0.3));
  };
  const leg = (u: number, v: number, z: number): void => {
    iso.r.line(P(u, v, z), P(u, v, 0), 0.9 * RES, COLORS.steelDark);
  };
  leg(0.58, 0.32, 11);
  leg(0.6, 0.45, 9);
  pipe(P(0.5, 0.3, 12), P(0.66, 0.3, 12));
  pipe(P(0.66, 0.3, 12), P(0.66, 0.24, 12), 1.2);
  pipe(P(0.5, 0.44, 9), P(0.62, 0.46, 9));
  pipe(P(0.66, 0.27, 11), P(0.83, 0.42, 11), 1.1);
  // compressor skid between hall and tanks
  iso.box(0.56, 0.66, 0.72, 0.78, 0, 8, NAVY);
  iso.quad(0.555, 0.655, 0.725, 0.785, 8.2, lighten(NAVY, 0.1));
  return iso.build();
}

/** Steel lattice transmission pylon, drawn as a true line figure: legs,
 *  zig-zag bracing, taper, three crossarm pairs with insulator drops. */
function latticePylon(iso: Iso, u: number, v: number, hgt: number, span: number): void {
  const [cx, cyB] = P(u, v, 0);
  const h = hgt * RES;
  const steel: RGBA = COLORS.steelDark;
  const W = 1.3 * RES;
  const baseHalf = 11 * RES;
  const waistHalf = 3.2 * RES;
  const waistY = cyB - h * 0.72;
  iso.shadow(u - 0.1, v - 0.04, u + 0.1, v + 0.1, 0.12, 0.14);
  // legs to the waist
  iso.r.line([cx - baseHalf, cyB], [cx - waistHalf, waistY], W, steel);
  iso.r.line([cx + baseHalf, cyB], [cx + waistHalf, waistY], W, steel);
  // zig-zag bracing
  let dir = 1;
  for (let i = 0; i < 5; i++) {
    const t0 = i / 5;
    const t1 = (i + 1) / 5;
    const y0 = cyB - h * 0.72 * t0;
    const y1 = cyB - h * 0.72 * t1;
    const half0 = baseHalf + (waistHalf - baseHalf) * t0;
    const half1 = baseHalf + (waistHalf - baseHalf) * t1;
    iso.r.line([cx - dir * half0, y0], [cx + dir * half1, y1], W * 0.7, steel);
    dir = -dir;
  }
  // mast above the waist to the peak
  iso.r.line([cx - waistHalf, waistY], [cx - 1 * RES, cyB - h], W, steel);
  iso.r.line([cx + waistHalf, waistY], [cx + 1 * RES, cyB - h], W, steel);
  // crossarms with insulator drops
  for (const [t, s] of [
    [0.78, 1],
    [0.87, 0.78],
    [0.95, 0.56],
  ] as const) {
    const y = cyB - h * t;
    const arm = span * RES * s;
    iso.r.line([cx - arm, y], [cx + arm, y], W, steel);
    for (const sx of [-1, 1]) {
      iso.r.line([cx + sx * arm * 0.92, y], [cx + sx * arm * 0.92, y + 4 * RES], W * 0.7, COLORS.white);
    }
  }
}

/** Free-standing 400 kV pylon on open ground (transparent floor). */
export function pylon400Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  latticePylon(iso, 0.5, 0.5, 92, 17);
  return iso.build();
}

/** Smaller 132 kV pylon. */
export function pylon132Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  latticePylon(iso, 0.5, 0.5, 62, 12);
  return iso.build();
}

/** Wooden 33 kV pole with a three-phase crossarm — lower, humbler kit. */
export function pole33Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const wood = hex('#7a5a3c');
  const [cx, cyB] = P(0.5, 0.5, 0);
  const h = 34 * RES;
  iso.shadow(0.44, 0.48, 0.56, 0.58, 0.1, 0.12);
  iso.r.line([cx, cyB], [cx, cyB - h], 2.4 * RES, wood);
  // crossarm + three pin insulators
  iso.r.line([cx - 9 * RES, cyB - h * 0.9], [cx + 9 * RES, cyB - h * 0.9], 1.6 * RES, wood);
  for (const sx of [-7, 0, 7]) {
    iso.r.line(
      [cx + sx * RES, cyB - h * 0.9],
      [cx + sx * RES, cyB - h * 0.9 - 3.5 * RES],
      1.4 * RES,
      COLORS.white,
    );
  }
  return iso.build();
}

/** Pole-mounted transformer: the pole, the can, and an LV drop. */
export function subPoleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const wood = hex('#7a5a3c');
  const [cx, cyB] = P(0.5, 0.5, 0);
  const h = 34 * RES;
  iso.shadow(0.42, 0.48, 0.58, 0.6, 0.1, 0.12);
  iso.r.line([cx, cyB], [cx, cyB - h], 2.4 * RES, wood);
  iso.r.line([cx - 9 * RES, cyB - h * 0.92], [cx + 9 * RES, cyB - h * 0.92], 1.6 * RES, wood);
  for (const sx of [-7, 0, 7]) {
    iso.r.line(
      [cx + sx * RES, cyB - h * 0.92],
      [cx + sx * RES, cyB - h * 0.92 - 3.5 * RES],
      1.4 * RES,
      COLORS.white,
    );
  }
  // the grey can, strapped two-thirds up, with an orange hazard plate
  iso.r.rect(cx + 2 * RES, cyB - h * 0.72, cx + 9 * RES, cyB - h * 0.45, COLORS.steel, COLORS.steelDark);
  iso.r.polyline(
    [[cx + 2 * RES, cyB - h * 0.72], [cx + 9 * RES, cyB - h * 0.72], [cx + 9 * RES, cyB - h * 0.45], [cx + 2 * RES, cyB - h * 0.45]],
    INK_W,
    INK,
    true,
  );
  iso.r.rect(cx + 4 * RES, cyB - h * 0.62, cx + 7 * RES, cyB - h * 0.55, COLORS.orange);
  // LV service drop swinging away
  iso.r.line([cx, cyB - h * 0.45], [cx - 16 * RES, cyB - h * 0.1], 1 * RES, INK);
  return iso.build();
}

/** Underground vault substation: the city keeps its building; all you see
 *  is the hatch, the vent kiosk and the wayleave sign on the pavement. */
export function subVaultTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  // pavement apron
  iso.quad(0.2, 0.55, 0.8, 0.95, 0, COLORS.pavement, darken(COLORS.pavement, 0.08));
  // steel access hatch with tread lines
  iso.quad(0.28, 0.62, 0.5, 0.8, 0.5, COLORS.steel);
  for (let t = 0; t < 4; t++) {
    const u = 0.3 + t * 0.045;
    iso.r.line(P(u, 0.63, 0.8), P(u + 0.02, 0.79, 0.8), 0.8 * RES, COLORS.steelDark);
  }
  iso.r.polyline([P(0.28, 0.62, 0.6), P(0.5, 0.62, 0.6), P(0.5, 0.8, 0.6), P(0.28, 0.8, 0.6)], INK_W, INK, true);
  // vent kiosk
  iso.box(0.56, 0.62, 0.72, 0.78, 0, 9, hex('#4f7a52'));
  for (let z = 2; z < 8; z += 2.2) {
    iso.r.line(P(0.57, 0.78, z), P(0.71, 0.78, z), 0.7 * RES, shaded(hex('#4f7a52'), 0.3));
  }
  // orange DNO marker post
  iso.box(0.24, 0.86, 0.27, 0.89, 0, 8, COLORS.orange);
  return iso.build();
}

/** Gas peaker (OCGT): one container hall, one slim stack, ready to sprint. */
export function gasPeakerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.12, 10);
  iso.shadow(0.2, 0.3, 0.7, 0.62, 0.14, 0.18);
  iso.box(0.2, 0.3, 0.7, 0.62, 0, 22, NAVY);
  iso.r.poly(
    [P(0.7 + 0.001, 0.36, 16), P(0.7 + 0.001, 0.56, 16), P(0.7 + 0.001, 0.56, 0), P(0.7 + 0.001, 0.36, 0)],
    COLORS.orange,
  );
  // intake filter house + slim exhaust stack
  iso.box(0.3, 0.64, 0.5, 0.74, 0, 14, COLORS.steel);
  iso.box(0.76, 0.4, 0.82, 0.46, 0, 58, lighten(NAVY, 0.12));
  iso.quad(0.755, 0.395, 0.825, 0.465, 58, COLORS.steelDark);
  return iso.build();
}

/** Tidal stream array: yellow masts and nacelles working the current. */
export function tidalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const buoy = hex('#e8c33f');
  iso.floor(COLORS.water, COLORS.waterDeep);
  for (const [u, v, s] of [
    [0.32, 0.4, 1],
    [0.68, 0.66, 0.85],
  ] as const) {
    // wake streaks around the mast
    iso.quad(u - 0.16, v + 0.05, u + 0.2, v + 0.09, 0, alpha(COLORS.waterGlint, 0.5));
    iso.box(u - 0.025 * s, v - 0.025 * s, u + 0.025 * s, v + 0.025 * s, -4, 16 * s, buoy);
    // nacelle riding above the surface with twin rotor hint
    iso.box(u - 0.05 * s, v - 0.02, u + 0.05 * s, v + 0.02, 16 * s, 22 * s, COLORS.white);
    const [hx, hy] = P(u, v, 19 * s);
    for (const sx of [-1, 1]) {
      iso.r.line([hx + sx * 7 * RES, hy], [hx + sx * 13 * RES, hy], 1.4 * RES, COLORS.white);
    }
  }
  return iso.build();
}

/** Biomass CHP: twin silver silos, a fuel shed and a stack. */
export function biomassTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.1, 10);
  // fuel shed with an open face
  iso.shadow(0.14, 0.5, 0.6, 0.84, 0.12, 0.16);
  iso.box(0.14, 0.5, 0.6, 0.84, 0, 18, hex('#5d7a45'));
  iso.gable(0.14, 0.5, 0.6, 0.84, 18, 8, 'u', darken(hex('#5d7a45'), 0.2), hex('#5d7a45'));
  // twin silos
  for (const [u, v] of [
    [0.62, 0.28],
    [0.78, 0.36],
  ] as const) {
    iso.shadow(u - 0.06, v, u + 0.06, v + 0.1, 0.1, 0.14);
    iso.box(u - 0.06, v - 0.06, u + 0.06, v + 0.06, 0, 34, COLORS.steel);
    iso.hip(u - 0.07, v - 0.07, u + 0.07, v + 0.07, 34, 8, COLORS.steelDark);
  }
  // stack
  iso.box(0.3, 0.24, 0.36, 0.3, 0, 48, COLORS.concrete);
  iso.quad(0.295, 0.235, 0.365, 0.305, 48, COLORS.steelDark);
  return iso.build();
}

/** Construction site (#43): the building-site stand-in for any plant or
 *  substation while its planning + build clock runs. Four progress stages
 *  read the lead-time arc at a glance — earth-moving → frame rising →
 *  scaffolded shell → topped-out & fitting-out — each clearly a SITE, not
 *  a finished building: churned earth, hi-vis orange hoarding, a slim
 *  tower crane and (from stage 1) a poled scaffold cage. The MapRenderer
 *  picks the variant by `underConstruction` remaining-time quartile and
 *  swaps to the real sprite the instant it commissions.
 *
 *  stage 0 = groundworks (bare foundation + spoil + crane)
 *  stage 1 = frame (first lift of structure, low scaffold)
 *  stage 2 = scaffolded shell (full-height cage, sheeted)
 *  stage 3 = topping out (near-complete block, scaffold coming down) */
export function constructionTile(seed: number, stage = 3): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5471 + stage * 97 + 11);
  // churned, muddier ground than the clean sand pad — this is a dig
  const earth = hex('#b59a6a');
  iso.floor(lighten(earth, 0.05), darken(earth, 0.12));
  // a few darker spoil/excavation patches scuffed into the plot
  for (let k = 0; k < 5; k++) {
    const u = 0.18 + rng.next() * 0.6;
    const v = 0.18 + rng.next() * 0.6;
    const r = 0.05 + rng.next() * 0.06;
    iso.quad(u, v, u + r, v + r, 0, darken(earth, 0.22 + rng.next() * 0.12));
  }

  // HOARDING: hi-vis orange site boarding around the two near edges, with
  // a darker base rail so it reads as a solid hoarding, not a fence.
  const hoarding = (u0: number, v0: number, u1: number, v1: number): void => {
    iso.box(u0, v0, u1, v1, 0, 6, COLORS.orange, { ink: false });
    // diagonal hazard ticks along the top of the near (left) face
    if (v1 > 0.8) {
      for (let t = 0.04; t < 0.96; t += 0.12) {
        const u = u0 + (u1 - u0) * t;
        iso.r.line(P(u, v1, 6), P(u + 0.03, v1, 2.5), 1.2 * RES, alpha(INK, 0.5));
      }
    }
  };
  hoarding(0.05, 0.05, 0.95, 0.1);
  hoarding(0.05, 0.9, 0.95, 0.95);

  // SCAFFOLD CAGE around the rising block — poles + lifts of boards. Only
  // from stage 1 (groundworks has no frame to clamp it to yet).
  const bu0 = 0.46;
  const bv0 = 0.3;
  const bu1 = 0.86;
  const bv1 = 0.7;
  const scaffold = (h: number): void => {
    const post = (u: number, v: number): void => {
      iso.r.poly([P(u, v, h), P(u + 0.01, v, h), P(u + 0.01, v, 0), P(u, v, 0)], COLORS.steel);
    };
    // the two visible faces of the cage (near-left v=bv1, near-right u=bu1)
    const N = 5;
    for (let i = 0; i <= N; i++) {
      post(bu0 + ((bu1 - bu0) * i) / N, bv1);
      post(bu1, bv0 + ((bv1 - bv0) * i) / N);
    }
    // horizontal board lifts every ~7 px
    for (let z = 7; z <= h; z += 7) {
      iso.r.line(P(bu0, bv1, z), P(bu1, bv1, z), 1.0 * RES, alpha(COLORS.steelDark, 0.9));
      iso.r.line(P(bu1, bv0, z), P(bu1, bv1, z), 1.0 * RES, alpha(COLORS.steelDark, 0.9));
    }
  };

  // THE RISING STRUCTURE, taller per stage
  if (stage === 0) {
    // groundworks: a low poured-concrete foundation slab + rebar stubs
    iso.box(bu0, bv0, bu1, bv1, 0, 4, COLORS.concrete);
    for (let i = 0; i <= 4; i++) {
      const u = bu0 + ((bu1 - bu0) * i) / 4;
      iso.r.line(P(u, bv1, 4), P(u, bv1, 11), 0.8 * RES, COLORS.steelDark); // rebar
      const v = bv0 + ((bv1 - bv0) * i) / 4;
      iso.r.line(P(bu1, v, 4), P(bu1, v, 11), 0.8 * RES, COLORS.steelDark);
    }
  } else {
    const h = stage === 1 ? 12 : stage === 2 ? 22 : 28;
    iso.box(bu0, bv0, bu1, bv1, 0, h, COLORS.concrete);
    // floor-slab ink lines so it reads as an unfinished multi-storey frame
    for (let z = 8; z < h; z += 7) {
      iso.r.line(P(bu0, bv1, z), P(bu1, bv1, z), 0.9 * RES, alpha(INK, 0.7));
      iso.r.line(P(bu1, bv0, z), P(bu1, bv1, z), 0.9 * RES, alpha(INK, 0.7));
    }
    // scaffold rises a little above the current top; stage 3 sheds it back
    scaffold(stage === 3 ? h - 6 : h + 4);
    // stage 3: a couple of finished glazing panels going in near the top
    if (stage === 3) {
      iso.windowsLeft(bv1, bu0, bu1, h - 12, h - 3, 4, alpha(hex('#9fd0e8'), 0.85));
    }
  }

  // TOWER CRANE: mast, jib, counter-jib, hook. Shorter on early stages
  // (climbs with the build), tallest at topping-out.
  const [mx, myB] = P(0.28, 0.42, 0);
  const mh = (40 + stage * 10) * RES;
  iso.r.line([mx, myB], [mx, myB - mh], 1.8 * RES, COLORS.orange);
  for (let i = 0; i < 6; i++) {
    const y0 = myB - (mh / 6) * i;
    iso.r.line([mx - 1.6 * RES, y0], [mx + 1.6 * RES, y0 - mh / 6], 0.8 * RES, darken(COLORS.orange, 0.25));
  }
  const jy = myB - mh;
  // the hook hangs over the block, a little further out the further along
  const hookX = mx + (22 + stage * 4) * RES;
  iso.r.line([mx - 14 * RES, jy + 3 * RES], [hookX + 8 * RES, jy], 1.4 * RES, COLORS.orange);
  iso.r.line([mx, jy - 7 * RES], [hookX + 8 * RES, jy], 0.8 * RES, INK); // jib tie
  iso.r.line([mx, jy - 7 * RES], [mx - 14 * RES, jy + 3 * RES], 0.8 * RES, INK);
  iso.r.rect(mx - 16 * RES, jy + 2 * RES, mx - 11 * RES, jy + 6 * RES, COLORS.concrete); // counterweight
  const hookDrop = (18 + (3 - stage) * 6) * RES; // longer cable early on
  iso.r.line([hookX, jy], [hookX, jy + hookDrop], 0.8 * RES, INK); // hoist cable
  iso.r.rect(hookX - 1.4 * RES, jy + hookDrop, hookX + 1.4 * RES, jy + hookDrop + 3 * RES, COLORS.steelDark);
  return iso.build();
}

/** Turbine geometry per tile: tile-local hub positions so the renderer can
 *  spin live rotors exactly on the baked towers. */
export interface WindHubSpec {
  u: number;
  v: number;
  hub: number;
  /** Blade length in original (RES=1) pixels. */
  bladePx: number;
}
export const WIND_HUBS: Record<'onshore' | 'offshore', WindHubSpec[]> = {
  onshore: [
    { u: 0.34, v: 0.4, hub: 88, bladePx: 34 },
    { u: 0.72, v: 0.68, hub: 76, bladePx: 29 },
  ],
  offshore: [
    { u: 0.3, v: 0.42, hub: 96, bladePx: 39 },
    { u: 0.68, v: 0.7, hub: 88, bladePx: 36 },
  ],
};

/** Hub centre offset within the cell, device px at sprite resolution. The
 *  rotor hub sits ON the mast axis (u,v) at the nacelle's front-top, so the
 *  live/ghost blades centre exactly on the mast (owner playtest: the rotor
 *  was offset from the mast — the old +0.012/-0.012 skew is gone). */
export function windHubOffset(spec: WindHubSpec): Pt {
  return P(spec.u, spec.v, spec.hub + 3);
}

/** Wind turbine towers; offshore versions stand on yellow transition
 *  pieces straight out of the water. Both stand on a TRANSPARENT floor —
 *  onshore machines rise straight out of whatever crop the tile grows,
 *  so a capacity-scaled farm's spread turbine tiles read as turbines
 *  amid farmland, not a checkerboard of pasted lawns. The rotors are
 *  not baked — the renderer draws them live so they actually turn. */
export function windTurbineTile(seed: number, offshore: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;

  const turbine = ({ u, v, hub }: WindHubSpec): void => {
    if (offshore) {
      iso.box(u - 0.03, v - 0.03, u + 0.03, v + 0.03, -6, 14, hex('#e8c33f'));
    } else {
      iso.shadow(u - 0.05, v, u + 0.05, v + 0.12, 0.3, 0.16);
    }
    // tapered tower (two stacked boxes cheat the taper)
    iso.box(u - 0.022, v - 0.022, u + 0.022, v + 0.022, offshore ? 14 : 0, hub * 0.55, COLORS.white);
    iso.box(u - 0.015, v - 0.015, u + 0.015, v + 0.015, hub * 0.55, hub, COLORS.white);
    // nacelle — kept SYMMETRIC about the mast axis (u,v) so the rotor hub,
    // which the renderer centres on (u,v), sits dead-centre on the nacelle
    iso.box(u - 0.032, v - 0.02, u + 0.032, v + 0.02, hub, hub + 6, lit(COLORS.white, 0.02));
  };

  for (const spec of WIND_HUBS[offshore ? 'offshore' : 'onshore']) turbine(spec);
  return iso.build();
}

/** Coal station on a 4x3 footprint — a Drax/Ratcliffe-class campus, the
 *  biggest thing the player can put on the map: SIX hyperboloid cooling
 *  towers in two ranks of three breathing steam, the tall boiler house
 *  with its chimney, the long glazed turbine hall, a coal yard with twin
 *  spoil cones and an enclosed conveyor gallery climbing into the boiler
 *  house, and a rail siding of loaded hopper wagons along the front. */
export function coalPlantTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 3);
  const rng = new Rng(seed * 90121 + 23);
  iso.floor(PAD, darken(PAD, 0.1));
  fence(iso, 0.04, 12);

  // slim chimney with a white collar, behind the boiler house
  iso.box(0.68, 0.5, 0.8, 0.62, 0, 124, lighten(NAVY, 0.12));
  iso.r.poly(
    [iso.P(0.675, 0.62, 112), iso.P(0.805, 0.62, 112), iso.P(0.805, 0.62, 103), iso.P(0.675, 0.62, 103)],
    COLORS.white,
  );
  iso.quad(0.675, 0.495, 0.805, 0.625, 124, COLORS.steelDark);

  // boiler house: the tall block the conveyors feed
  iso.shadow(0.95, 0.35, 1.75, 1.25, 0.18, 0.22);
  iso.box(0.95, 0.35, 1.75, 1.25, 0, 64, lighten(NAVY, 0.05));
  iso.windowsLeft(1.25, 1.05, 1.65, 44, 56, 4, COLORS.glassDark, COLORS.white);
  iso.r.poly(
    [iso.P(1.75, 0.5, 56), iso.P(1.75, 0.74, 56), iso.P(1.75, 0.74, 28), iso.P(1.75, 0.5, 28)],
    COLORS.orange,
  );

  // coal yard: twin dark spoil cones along the west boundary
  const coalHeap = (hu: number, hv: number, s: number): void => {
    const apex = iso.P(hu, hv, 16 * s);
    const L = iso.P(hu - 0.38 * s, hv + 0.22 * s, 0);
    const B = iso.P(hu + 0.12 * s, hv + 0.32 * s, 0);
    const Rt = iso.P(hu + 0.42 * s, hv - 0.1 * s, 0);
    iso.shadow(hu - 0.32 * s, hv - 0.15 * s, hu + 0.37 * s, hv + 0.25 * s, 0.12, 0.2);
    iso.r.poly([apex, L, B], hex('#2c2836'));
    iso.r.poly([apex, B, Rt], hex('#3c3648'));
    iso.r.polyline([L, apex, Rt], INK_W * 0.8, alpha(INK, 0.7));
  };
  coalHeap(0.48, 1.75, 1);
  coalHeap(0.6, 2.45, 0.85);

  // long navy turbine hall with a gable along its length + warm glazing
  iso.shadow(0.95, 1.45, 2.0, 2.2, 0.18, 0.22);
  iso.box(0.95, 1.45, 2.0, 2.2, 0, 36, NAVY);
  iso.gable(0.95, 1.45, 2.0, 2.2, 36, 12, 'u', NAVY_DEEP, NAVY);
  iso.r.poly([iso.P(0.95, 2.2, 9), iso.P(2.0, 2.2, 9), iso.P(2.0, 2.2, 6), iso.P(0.95, 2.2, 6)], COLORS.white);
  iso.windowsLeft(2.2, 1.02, 1.92, 13, 27, 6, rng.chance(0.8) ? COLORS.glassLit : COLORS.glassHot, COLORS.white);

  // enclosed conveyor gallery climbing from the yard into the boiler
  // house through the clear gap north of the turbine hall
  {
    const a0 = iso.P(0.52, 1.95, 12);
    const a1 = iso.P(1.05, 1.32, 54);
    const wTop = 5 * RES;
    const wBot = 2 * RES;
    // support trestles first, so the gallery sits over them
    for (const t of [0.3, 0.65]) {
      const x = a0[0] + (a1[0] - a0[0]) * t;
      const yTop = a0[1] + (a1[1] - a0[1]) * t + wBot;
      const [, yG] = iso.P(0.52 + (1.05 - 0.52) * t, 1.95 + (1.32 - 1.95) * t, 0);
      iso.r.line([x, yTop], [x, yG], INK_W * 0.8, COLORS.steelDark);
      iso.r.line([x - 2.5 * RES, yG + 1 * RES], [x + 2.5 * RES, yG + 1 * RES], INK_W * 0.7, COLORS.steelDark);
    }
    iso.r.poly(
      [[a0[0], a0[1] - wTop], [a1[0], a1[1] - wTop], [a1[0], a1[1] + wBot], [a0[0], a0[1] + wBot]],
      COLORS.steelDark,
    );
    iso.r.poly(
      [[a0[0], a0[1] - wTop], [a1[0], a1[1] - wTop], [a1[0], a1[1] - wTop + 2 * RES], [a0[0], a0[1] - wTop + 2 * RES]],
      COLORS.steel,
    );
    iso.r.line([a0[0], a0[1] - wTop], [a1[0], a1[1] - wTop], INK_W * 0.8, INK);
    iso.r.line([a0[0], a0[1] + wBot], [a1[0], a1[1] + wBot], INK_W * 0.8, INK);
  }

  // hyperboloid cooling tower + steam wisp
  const coolingTower = (u: number, v: number, hgt: number, rad: number): void => {
    const [cx, cyB] = iso.P(u, v, 0);
    const H = hgt * RES;
    const prof = (t: number): number => {
      const tw = 0.76;
      const rb = 1;
      const rw = 0.56;
      const rt = 0.64;
      const s =
        t <= tw
          ? rw + (rb - rw) * Math.pow((tw - t) / tw, 1.6)
          : rw + (rt - rw) * Math.pow((t - tw) / (1 - tw), 1.4);
      return s * rad * (CELL_W / 2);
    };
    iso.shadow(u - rad * 0.8, v - rad * 0.2, u + rad * 0.8, v + rad * 0.6, 0.22, 0.22);
    const N = 16;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = prof(t);
      const y = cyB - t * H;
      left.push([cx - r, y]);
      right.push([cx + r, y]);
    }
    // shell: shaded body + a lit band on the sunset side
    iso.r.poly([...left, ...right.slice().reverse()], shaded(COLORS.concrete, 0.08));
    const litBand: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      litBand.push([cx + prof(t) * 0.35, cyB - t * H]);
    }
    iso.r.poly([...litBand, ...right.slice().reverse()], lit(COLORS.concrete, 0.1));
    // throat opening: ellipse rim, dark inside
    {
      const rT = prof(1);
      const pts: Pt[] = [];
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * rT, cyB - H + Math.sin(a) * rT * 0.32]);
      }
      iso.r.poly(pts, shaded(COLORS.concrete, 0.35));
      iso.r.polyline(pts, INK_W * 0.8, INK, true);
    }
    // ink silhouette + base line
    iso.r.polyline(left, INK_W, INK);
    iso.r.polyline(right, INK_W, INK);
    iso.r.line([cx - prof(0), cyB], [cx + prof(0), cyB], INK_W * 0.8, alpha(INK, 0.7));
    // subtle steam wisp drifting up-left
    for (let k = 0; k < 3; k++) {
      const wx = cx - k * 6 * RES + rng.range(-2, 2) * RES;
      const wy = cyB - H - (6 + k * 9) * RES;
      const wr = (7 - k * 1.4) * RES;
      const pts: Pt[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pts.push([wx + Math.cos(a) * wr, wy + Math.sin(a) * wr * 0.7]);
      }
      iso.r.poly(pts, alpha(COLORS.white, 0.16 - k * 0.035));
    }
  };
  // SIX towers, two staggered ranks of three marching across the east yard
  coolingTower(2.15, 0.62, 80, 0.3);
  coolingTower(2.8, 0.62, 80, 0.3);
  coolingTower(3.55, 0.62, 80, 0.3);
  coolingTower(2.25, 1.55, 80, 0.3);
  coolingTower(3.0, 1.55, 80, 0.3);
  coolingTower(3.68, 1.62, 80, 0.3);

  // rail siding along the front apron: ballast strip, twin rails,
  // loaded hopper wagons queued for the tippler
  {
    const v0 = 2.42;
    const v1 = 2.56;
    iso.r.poly(
      [iso.P(1.55, v0 - 0.06, 0), iso.P(3.9, v0 - 0.06, 0), iso.P(3.9, v1 + 0.06, 0), iso.P(1.55, v1 + 0.06, 0)],
      shaded(PAD, 0.12),
    );
    for (let t = 0; t < 12; t++) {
      const u = 1.62 + t * 0.19;
      iso.r.line(iso.P(u, v0 - 0.02, 0.3), iso.P(u, v1 + 0.02, 0.3), 1 * RES, shaded(PAD, 0.3));
    }
    for (const v of [v0, v1]) {
      iso.r.line(iso.P(1.55, v, 0.6), iso.P(3.9, v, 0.6), 0.9 * RES, COLORS.steelDark);
    }
    // buffer stop at the head of the siding
    iso.box(1.56, v0 - 0.02, 1.62, v1 + 0.02, 0, 5, COLORS.orange, { ink: false });
    // hopper wagons: dark steel tubs heaped with coal
    for (const u of [1.78, 2.12, 2.46, 2.96]) {
      iso.shadow(u, v0 - 0.02, u + 0.28, v1 + 0.02, 0.04, 0.16);
      iso.box(u, v0 - 0.03, u + 0.28, v1 + 0.03, 1, 10, hex('#454152'));
      iso.quad(u + 0.02, v0 - 0.01, u + 0.26, v1 + 0.01, 10.5, hex('#2c2836'));
    }
  }

  return iso.build();
}
