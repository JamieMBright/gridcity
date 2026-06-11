// The player's own kit: power stations and substations. These are the
// hero objects of the game, so they read brand-first — navy steel, white
// frames and unmistakable UKPN orange — and they stay saturated when the
// grid view desaturates the city around them.

import { Rng } from '../../sim/rng';
import { Iso, lit, P, shaded } from './iso';
import { COLORS } from './palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from './raster';

const NAVY = hex('#39426e');
const NAVY_DEEP = hex('#252c52');
const PAD = hex('#aab0bd');

function padFloor(iso: Iso): void {
  iso.floor(PAD, darken(PAD, 0.1));
}

/** Perimeter security fence: slim posts + a light rail, with a gap gate. */
function fence(iso: Iso, inset: number, h: number): void {
  const a = inset;
  const b = 1 - inset;
  const post = (u: number, v: number): void => {
    iso.r.poly([P(u, v, h), P(u + 0.012, v, h), P(u + 0.012, v, 0), P(u, v, 0)], COLORS.steel);
  };
  for (let t = 0; t <= 1.001; t += 0.2) {
    post(a + (b - a) * t, b); // front-left edge
    post(b, a + (b - a) * t); // front-right edge
  }
  // rails along the two visible edges
  iso.r.poly([P(a, b, h), P(b, b, h), P(b, b, h - 1.5), P(a, b, h - 1.5)], alpha(COLORS.steel, 0.85));
  iso.r.poly([P(b, a, h), P(b, b, h), P(b, b, h - 1.5), P(b, a, h - 1.5)], alpha(COLORS.steel, 0.85));
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

/** 400/132 kV bulk supply point: the big yard. */
export function subBulkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  fence(iso, 0.05, 14);
  gantry(iso, 0.12, 0.88, 0.16, 78);
  gantry(iso, 0.12, 0.88, 0.4, 64);
  transformer(iso, 0.1, 0.56, 0.24, 30);
  transformer(iso, 0.4, 0.56, 0.24, 30);
  transformer(iso, 0.7, 0.56, 0.24, 30);
  iso.box(0.12, 0.84, 0.36, 0.95, 0, 14, COLORS.concrete);
  iso.quad(0.11, 0.83, 0.37, 0.96, 14, COLORS.orange);
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

/** Nuclear: white containment dome + turbine hall on the estuary site. */
export function nuclearTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  padFloor(iso);
  // turbine hall
  iso.shadow(0.08, 0.5, 0.9, 0.9, 0.16, 0.2);
  iso.box(0.08, 0.5, 0.9, 0.9, 0, 30, COLORS.concrete);
  iso.windowsLeft(0.9, 0.12, 0.84, 10, 22, 7, COLORS.glassLit, COLORS.white);
  // containment dome: faceted white dome on a drum
  const [cx, cy] = P(0.48, 0.28, 0);
  const drumH = 40;
  iso.shadow(0.26, 0.1, 0.7, 0.46, 0.2, 0.22);
  iso.box(0.28, 0.12, 0.68, 0.44, 0, drumH, COLORS.white, {
    leftC: shaded(COLORS.white, 0.18),
    rightC: lit(COLORS.white, 0.04),
    topC: COLORS.white,
  });
  const R = 0.2 * 64; // dome radius in px (cell half-width units)
  const dome = (s: number, c: RGBA): void => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      pts.push([cx + Math.cos(a) * R * s, cy - drumH - Math.sin(a) * R * 0.78 * s]);
    }
    iso.r.poly(pts, c);
  };
  dome(1, shaded(COLORS.white, 0.1));
  dome(0.72, lit(COLORS.white, 0.05));
  // orange beacon
  iso.r.poly([[cx - 1.5, cy - drumH - R * 0.78 - 4], [cx + 1.5, cy - drumH - R * 0.78 - 4], [cx + 1.5, cy - drumH - R * 0.78], [cx - 1.5, cy - drumH - R * 0.78]], COLORS.orange);
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

/** Wind turbine(s); offshore versions stand on yellow transition pieces
 *  straight out of the water (transparent floor). */
export function windTurbineTile(seed: number, offshore: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 53077 + 3);
  if (!offshore) iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);

  const turbine = (u: number, v: number, hub: number, scale: number): void => {
    if (offshore) {
      iso.box(u - 0.03, v - 0.03, u + 0.03, v + 0.03, -6, 14, hex('#e8c33f'));
    } else {
      iso.shadow(u - 0.05, v, u + 0.05, v + 0.12, 0.3, 0.16);
    }
    // tapered tower (two stacked boxes cheat the taper)
    iso.box(u - 0.022, v - 0.022, u + 0.022, v + 0.022, offshore ? 14 : 0, hub * 0.55, COLORS.white);
    iso.box(u - 0.015, v - 0.015, u + 0.015, v + 0.015, hub * 0.55, hub, COLORS.white);
    // nacelle
    iso.box(u - 0.03, v - 0.02, u + 0.035, v + 0.02, hub, hub + 6, lit(COLORS.white, 0.02));
    // rotor: three blades in screen space around the hub
    const [hx, hy] = P(u + 0.012, v - 0.012, hub + 3);
    const phase = rng.range(0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const a = phase + (i * 2 * Math.PI) / 3;
      const len = 34 * scale;
      const tipX = hx + Math.cos(a) * len;
      const tipY = hy + Math.sin(a) * len * 0.92;
      const px = Math.cos(a + Math.PI / 2) * 2.6;
      const py = Math.sin(a + Math.PI / 2) * 2.6;
      iso.r.poly(
        [[hx + px, hy + py], [hx - px, hy - py], [tipX, tipY]],
        i === 0 ? lit(COLORS.white, 0.05) : alpha(COLORS.white, 0.96),
      );
    }
    iso.r.poly([[hx - 2, hy - 2], [hx + 2, hy - 2], [hx + 2, hy + 2], [hx - 2, hy + 2]], COLORS.orange);
  };

  if (offshore) {
    turbine(0.3, 0.42, 96, 1.15);
    turbine(0.68, 0.7, 88, 1.05);
  } else {
    turbine(0.34, 0.4, 88, 1);
    turbine(0.72, 0.68, 76, 0.85);
  }
  return iso.build();
}
