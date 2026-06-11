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
  const R = 0.2 * (CELL_W / 2); // dome radius in px
  const drumPx = drumH * RES;
  const dome = (s: number, c: RGBA): void => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      pts.push([cx + Math.cos(a) * R * s, cy - drumPx - Math.sin(a) * R * 0.78 * s]);
    }
    iso.r.poly(pts, c);
  };
  dome(1, shaded(COLORS.white, 0.1));
  dome(0.72, lit(COLORS.white, 0.05));
  {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      pts.push([cx + Math.cos(a) * R, cy - drumPx - Math.sin(a) * R * 0.78]);
    }
    iso.r.polyline(pts, INK_W, INK);
  }
  // orange beacon
  iso.r.poly([[cx - 1.5 * RES, cy - drumPx - R * 0.78 - 4 * RES], [cx + 1.5 * RES, cy - drumPx - R * 0.78 - 4 * RES], [cx + 1.5 * RES, cy - drumPx - R * 0.78], [cx - 1.5 * RES, cy - drumPx - R * 0.78]], COLORS.orange);
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

/** Construction site: the tower crane and scaffold that stand in for any
 *  plant while its planning + build clock runs. */
export function constructionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  iso.floor(lighten(COLORS.sand, 0.04), COLORS.sand);
  // hoarding line + barriers
  for (const [a, b, c2, d] of [
    [0.06, 0.06, 0.94, 0.1],
    [0.06, 0.9, 0.94, 0.94],
  ] as const) {
    iso.box(a, b, c2, d, 0, 5, COLORS.orange, { ink: false });
  }
  // scaffolded half-built block
  iso.box(0.5, 0.34, 0.84, 0.66, 0, 20, COLORS.concrete);
  for (const z of [7, 14]) {
    iso.r.line(P(0.5, 0.66, z), P(0.84, 0.66, z), 0.9 * RES, INK);
    iso.r.line(P(0.84, 0.66, z), P(0.84, 0.34, z), 0.9 * RES, INK);
  }
  // tower crane: mast, jib, counter-jib, hook
  const [mx, myB] = P(0.3, 0.42, 0);
  const mh = 64 * RES;
  iso.r.line([mx, myB], [mx, myB - mh], 1.8 * RES, COLORS.orange);
  for (let i = 0; i < 6; i++) {
    const y0 = myB - (mh / 6) * i;
    iso.r.line([mx - 1.6 * RES, y0], [mx + 1.6 * RES, y0 - mh / 6], 0.8 * RES, darken(COLORS.orange, 0.25));
  }
  const jy = myB - mh;
  iso.r.line([mx - 14 * RES, jy + 3 * RES], [mx + 34 * RES, jy], 1.4 * RES, COLORS.orange);
  iso.r.line([mx, jy - 7 * RES], [mx + 34 * RES, jy], 0.8 * RES, INK); // tie
  iso.r.line([mx, jy - 7 * RES], [mx - 14 * RES, jy + 3 * RES], 0.8 * RES, INK);
  iso.r.rect(mx - 16 * RES, jy + 2 * RES, mx - 11 * RES, jy + 6 * RES, COLORS.concrete); // counterweight
  iso.r.line([mx + 26 * RES, jy], [mx + 26 * RES, jy + 26 * RES], 0.8 * RES, INK); // hoist
  iso.r.rect(mx + 24.6 * RES, jy + 26 * RES, mx + 27.4 * RES, jy + 29 * RES, COLORS.steelDark);
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

/** Hub centre offset within the cell, device px at sprite resolution. */
export function windHubOffset(spec: WindHubSpec): Pt {
  return P(spec.u + 0.012, spec.v - 0.012, spec.hub + 3);
}

/** Wind turbine towers; offshore versions stand on yellow transition
 *  pieces straight out of the water (transparent floor). The rotors are
 *  not baked — the renderer draws them live so they actually turn. */
export function windTurbineTile(seed: number, offshore: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  if (!offshore) iso.floor(lighten(COLORS.grass, 0.06), COLORS.grassDark);

  const turbine = ({ u, v, hub }: WindHubSpec): void => {
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
  };

  for (const spec of WIND_HUBS[offshore ? 'offshore' : 'onshore']) turbine(spec);
  return iso.build();
}
