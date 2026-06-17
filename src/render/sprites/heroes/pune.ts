// Pune's bespoke-hero registry — ROUND 1 of the ~33-hero target (docs/heroes/
// pune/ holds 33 researched landmarks; Pune's real OSM/Wikidata hero count).
// Each entry resolves a PLACED name from src/data/cities/pune.ts's `named` list
// to a hand-built iso sprite + a bespoke night-electrification light.
//
// PUNE CHARACTER — warm DECCAN basalt-stone (the near-black volcanic rock the
// Peshwa city is built from), saffron / marigold temple orange under gilded
// shikhara, teak carved-wood wada facades, Mughal pale-yellow Italianate
// (Aga Khan Palace), Maratha brick (Lal Mahal), British colonial Gothic
// (the Mandai market, Lal Deval synagogue, Pune Junction), and the modern
// mirror-glass of the Hinjawadi IT belt. Every silhouette is built from Iso
// boxes/roofs/dome-loops so it reads as the real building; tall heroes use
// headroom so they TOWER over the ordinary fabric.
//
// Per the owner's hero doctrine the famous Pune icons are authored even where
// the current placement data hasn't yet dropped a matching name (Dagdusheth
// Ganpati, Vishrambaug Wada, Sinhagad fort, COEP boat-club, the IT towers) —
// they render the moment placement adds the name; the rest hit real placed
// names today (Shaniwar Wada, Aga Khan Palace, Shinde Chhatri, Lal Mahal,
// Pataleshwar, the temples, the malls, the colonial civics…).
//
// SCOPE: this file only. The registry is already wired to import CITY_HEROES.

import type { BespokeHero } from './registry';
import type { HeroLightSpec } from '../../heroLights';
import {
  CELL_W,
  INK,
  INK_W,
  Iso,
  lit,
  RES,
  shaded,
  top,
} from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';

// ============================================================================
// PUNE PALETTE
// ============================================================================
const BASALT = hex('#5a5560'); // Deccan basalt ashlar (the fort/wada stone) — warm grey-black
const BASALT_D = hex('#403c46'); // deep basalt shade
const BASALT_L = hex('#736d79'); // lit basalt
const LATER = hex('#c9a36b'); // laterite / lime-render ochre
const LATER_D = hex('#a8854f');
const TEAK = hex('#7a4a2c'); // carved teak woodwork (wada balconies, brackets)
const TEAK_D = hex('#5c361f');
const TEAK_L = hex('#9a6238');
const SAFFRON = hex('#e08a2e'); // temple saffron / marigold render
const SAFFRON_HOT = hex('#f2a93f');
const GOLD = hex('#e6b948'); // gilded shikhara / kalash brass
const GOLD_HOT = hex('#f6cf63');
const TEMPLE_W = hex('#efe6d2'); // limewashed temple white
const MUGHAL_Y = hex('#e9d49a'); // Aga Khan pale Mughal yellow (Italianate render)
const MUGHAL_Y_D = hex('#cdb476');
const BRICKR = hex('#a85a44'); // Maratha / colonial red brick (Lal Mahal, Mandai, Lal Deval)
const BRICKR_D = hex('#84422f');
const ROOFTILE = hex('#9c5a3c'); // terracotta Mangalore-tile pitched roofs
const ROOFTILE_D = hex('#7c4530');
const DOMEWHITE = hex('#e4dcc8'); // plastered dome (chhatri, dargah, synagogue)
const GLASSIT = hex('#9fc4c0'); // mirror-glass of the IT towers (teal-green dusk reflection)
const GLASSIT_D = hex('#6f9c98');

// ============================================================================
// SEED JITTER — a deterministic per-hero variation so a parametric family draw
// (peth temple, wada, bungalow, statue, school…) yields a DISTINCT silhouette
// for every registry seed: each entry's `seed` perturbs heights, feature counts
// and colour so no two placed heroes render identically (the bespoke mandate).
// ============================================================================
/** Deterministic [0,1) from a seed + salt (no runtime RNG). */
function jit(seed: number, salt: number): number {
  const s = Math.sin((seed * 127.1 + salt * 311.7) * 0.97) * 43758.5453;
  return s - Math.floor(s);
}
/** Seed-jittered value in [lo,hi]. */
function jrange(seed: number, salt: number, lo: number, hi: number): number {
  return lo + (hi - lo) * jit(seed, salt);
}
/** Seed-jittered colour: nudge a base toward warm/cool by a small amount. */
function jcol(seed: number, salt: number, c: RGBA, amt = 0.1): RGBA {
  const t = (jit(seed, salt) - 0.5) * 2 * amt;
  return t >= 0 ? lighten(c, t) : darken(c, -t);
}

// ============================================================================
// SHARED PRIMITIVES (each hero composes these into its own bespoke silhouette)
// ============================================================================

/** A gilded KALASH finial (the brass pot-and-spike crowning Hindu shikhara /
 *  chhatri / domes): a small bulb, a disc and a point. Returns nothing. */
function kalash(iso: Iso, x: number, yBase: number, scale = 1): void {
  const s = RES * scale;
  // the bulb pot
  iso.r.poly(
    [[x - 2 * s, yBase], [x + 2 * s, yBase], [x + 1.4 * s, yBase - 3 * s], [x - 1.4 * s, yBase - 3 * s]],
    GOLD,
  );
  // a flat disc
  iso.r.line([x - 2.6 * s, yBase - 3 * s], [x + 2.6 * s, yBase - 3 * s], 1 * s, GOLD_HOT);
  // the rising spike
  iso.r.line([x, yBase - 3 * s], [x, yBase - 9 * s], 1.1 * s, GOLD_HOT);
  iso.r.line([x - 1.3 * s, yBase - 6.5 * s], [x + 1.3 * s, yBase - 6.5 * s], 0.8 * s, GOLD_HOT);
}

/** A NAGARA SHIKHARA — the curvilinear beehive temple-tower of Maharashtra:
 *  a tall parabolic spire built as nested stepped tiers tapering to an amalaka
 *  ring + kalash. Anchored at tile (cu,cv), springing from zBase, half-base
 *  `rad` tiles, total rise `riseZ` px. `col` is the render colour (saffron /
 *  stone). Bold + tall — it is the silhouette of a Pune temple. */
function shikhara(
  iso: Iso,
  cu: number,
  cv: number,
  zBase: number,
  rad: number,
  riseZ: number,
  col: RGBA,
): { tipX: number; tipY: number } {
  const [dx, dyB] = iso.P(cu, cv, zBase);
  const R = rad * (CELL_W / 2);
  const H = riseZ * RES;
  // the curvilinear profile: x narrows on a convex curve, like a sugarloaf
  const prof = (t: number): number => Math.pow(1 - t, 0.72); // 1 at base → 0 at tip
  const ring = (t: number, s: number): Pt[] => {
    const w = R * prof(t) * s;
    const y = dyB - H * t;
    // a squashed diamond cross-section (iso footprint of a square tower)
    return [
      [dx - w, y],
      [dx, y - w * 0.5],
      [dx + w, y],
      [dx, y + w * 0.5],
    ];
  };
  // body as a stack of horizontal courses (gives the stepped beehive read)
  const COURSES = 9;
  for (let i = 0; i < COURSES; i++) {
    const t0 = i / COURSES;
    const t1 = (i + 1) / COURSES;
    const r0 = ring(t0, 1);
    const r1 = ring(t1, 1);
    // left + right faces of this course band
    iso.r.poly([r0[0]!, r0[3]!, r1[3]!, r1[0]!], shaded(col, 0.12 + 0.02 * (i % 2)));
    iso.r.poly([r0[3]!, r0[2]!, r1[2]!, r1[3]!], lit(col, 0.05 + 0.02 * (i % 2)));
    // a thin ledge line marks each course (the bhumi tiers)
    iso.r.line([r0[0]![0], r0[0]![1]], [r0[2]![0], r0[2]![1]], 0.7 * RES, alpha(INK, 0.4));
  }
  // crisp silhouette contour up both visible edges
  const edgeL: Pt[] = [];
  const edgeR: Pt[] = [];
  for (let i = 0; i <= COURSES; i++) {
    const r = ring(i / COURSES, 1);
    edgeL.push(r[0]!);
    edgeR.push(r[2]!);
  }
  iso.r.polyline(edgeL, INK_W * 0.8, INK);
  iso.r.polyline(edgeR, INK_W * 0.8, INK);
  // urushringa (mini-spires) clustering up the lower corners — the Nagara tell
  for (const side of [-1, 1] as const) {
    for (const t of [0.12, 0.34] as const) {
      const w = R * prof(t);
      const bx = dx + side * w * 0.92;
      const by = dyB - H * t;
      const tipY = by - H * 0.16;
      iso.r.poly([[bx - 2.4 * RES, by], [bx + 2.4 * RES, by], [bx, tipY]], shaded(col, 0.06));
      iso.r.polyline([[bx - 2.4 * RES, by], [bx, tipY], [bx + 2.4 * RES, by]], INK_W * 0.5, alpha(INK, 0.7));
    }
  }
  // the amalaka ring (a flattened fluted disc) + kalash at the tip
  const tipY = dyB - H;
  iso.r.poly(
    [[dx - 4 * RES, tipY + 2 * RES], [dx, tipY + 4 * RES], [dx + 4 * RES, tipY + 2 * RES], [dx, tipY]],
    lit(col, 0.1),
  );
  kalash(iso, dx, tipY, 1.1);
  return { tipX: dx, tipY };
}

/** A bulbous Indo-Islamic ONION DOME on a drum (chhatri / dargah / synagogue /
 *  Aga Khan corner kiosks): a pinched-bulb profile, optional ribs, finial.
 *  Anchored at (cu,cv), drum-top zBase, radius `rad` tiles, rise `riseZ` px. */
function onionDome(
  iso: Iso,
  cu: number,
  cv: number,
  zBase: number,
  rad: number,
  riseZ: number,
  col: RGBA,
  opts: { ribs?: number; crescent?: boolean; star?: boolean } = {},
): { tipX: number; tipY: number } {
  const [dx, dyB] = iso.P(cu, cv, zBase);
  const R = rad * (CELL_W / 2);
  const H = riseZ * RES;
  // onion profile: bulge out below the middle then pinch to a neck + point
  const half: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20; // 0 base → 1 tip
    const a = t * Math.PI;
    const bulge = Math.sin(a) * (1 + 0.42 * Math.sin(a * 1.7));
    half.push([dx + Math.cos(Math.PI - a) * R * bulge * 0.62, dyB - t * H]);
  }
  const full = [...half];
  for (let i = half.length - 2; i >= 0; i--) {
    const p = half[i]!;
    full.push([2 * dx - p[0], p[1]]);
  }
  iso.r.poly(full, shaded(col, 0.08), lit(col, 0.08));
  // a lit crescent of highlight up the left bulge
  iso.r.poly(half.map(([x, y]): Pt => [x + R * 0.14, y]), lit(col, 0.14));
  for (let k = 0; k < (opts.ribs ?? 0); k++) {
    const f = (k / Math.max(1, (opts.ribs ?? 1) - 1)) * 2 - 1;
    iso.r.line([dx + f * R * 0.5, dyB], [dx + f * R * 0.06, dyB - H * 0.92], 0.7 * RES, alpha(darken(col, 0.22), 0.7));
  }
  iso.r.polyline(full, INK_W * 0.8, INK, true);
  const tipY = dyB - H;
  if (opts.crescent) {
    // Islamic crescent finial (dargah)
    iso.r.line([dx, tipY], [dx, tipY - 6 * RES], 1 * RES, GOLD_HOT);
    iso.r.poly(
      [[dx, tipY - 6 * RES], [dx + 3 * RES, tipY - 9 * RES], [dx + 1.4 * RES, tipY - 6 * RES], [dx + 3 * RES, tipY - 3 * RES]],
      GOLD_HOT,
    );
  } else if (opts.star) {
    // Star of David finial (synagogue)
    iso.r.line([dx, tipY], [dx, tipY - 4 * RES], 1 * RES, GOLD_HOT);
    const sy = tipY - 7 * RES;
    iso.r.poly([[dx - 3 * RES, sy + 1.6 * RES], [dx + 3 * RES, sy + 1.6 * RES], [dx, sy - 2.8 * RES]], GOLD_HOT);
    iso.r.poly([[dx - 3 * RES, sy - 1.6 * RES], [dx + 3 * RES, sy - 1.6 * RES], [dx, sy + 2.8 * RES]], GOLD_HOT);
  } else {
    kalash(iso, dx, tipY, 1);
  }
  return { tipX: dx, tipY };
}

/** A small CHHATRI — the domed pillared kiosk that crowns Rajput/Maratha
 *  roofs and corners: four slim columns under a little onion dome. */
function chhatri(iso: Iso, cu: number, cv: number, zBase: number, rad: number, col: RGBA): void {
  const [cx, cyB] = iso.P(cu, cv, zBase);
  const R = rad * (CELL_W / 2);
  // four little columns
  for (const [sx, sy] of [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]] as const) {
    const px = cx + sx * R * 0.8;
    const py = cyB + sy * R * 0.8;
    iso.r.line([px, py], [px, py - 9 * RES], 1.3 * RES, sx > 0 ? lit(col, 0.06) : shaded(col, 0.1));
  }
  // a flat canopy slab
  iso.r.poly(
    [[cx - R, cyB - 9 * RES], [cx, cyB - 9 * RES - R * 0.5], [cx + R, cyB - 9 * RES], [cx, cyB - 9 * RES + R * 0.5]],
    lit(col, 0.08),
  );
  // the little onion cap on top
  const half: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const a = t * Math.PI;
    const bulge = Math.sin(a) * (1 + 0.4 * Math.sin(a * 1.7));
    half.push([cx + Math.cos(Math.PI - a) * R * bulge * 0.5, cyB - 9 * RES - t * 16 * RES]);
  }
  const full = [...half];
  for (let i = half.length - 2; i >= 0; i--) full.push([2 * cx - half[i]![0], half[i]![1]]);
  iso.r.poly(full, shaded(col, 0.06), lit(col, 0.08));
  iso.r.polyline(full, INK_W * 0.55, alpha(INK, 0.8), true);
  kalash(iso, cx, cyB - 9 * RES - 16 * RES, 0.7);
}

/** A run of CUSPED (multifoil) ARCHES along a face at fixed v — the Indo-
 *  Saracenic / Mughal arcade that fronts so many Pune heritage buildings
 *  (Aga Khan verandahs, Lal Deval, the Mandai). Draws `n` arched openings
 *  between u positions, from zBase up to the springing+arch crown. */
function archArcade(
  iso: Iso,
  v: number,
  uA: number,
  uB: number,
  zBase: number,
  zSpring: number,
  arch: number,
  n: number,
  glass: RGBA,
): void {
  const span = (uB - uA) / n;
  for (let i = 0; i < n; i++) {
    const u0 = uA + span * i + span * 0.16;
    const u1 = uA + span * (i + 1) - span * 0.16;
    const um = (u0 + u1) / 2;
    const poly: Pt[] = [iso.P(u0, v, zBase), iso.P(u0, v, zSpring)];
    // a pointed/cusped crown
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      const cu = u0 + (u1 - u0) * t;
      const lift = Math.sin(t * Math.PI) * arch + (Math.abs(t - 0.5) < 0.12 ? arch * 0.18 : 0);
      poly.push(iso.P(cu, v, zSpring + lift));
    }
    poly.push(iso.P(u1, v, zSpring), iso.P(u1, v, zBase));
    iso.r.poly(poly, glass);
    iso.r.polyline(poly, INK_W * 0.5, alpha(INK, 0.7));
    void um;
  }
}

/** A merloned (crenellated) PARAPET cap running round a footprint top — the
 *  battlement of a Maratha fort/wada wall. Drawn as a thin band + teeth on the
 *  two visible faces. */
function battlement(iso: Iso, u0: number, v0: number, u1: number, v1: number, z: number, col: RGBA): void {
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, lighten(col, 0.06), { ink: false });
  // teeth along the left (v1) and right (u1) faces
  const teeth = 9;
  for (let i = 0; i < teeth; i++) {
    const fu = u0 + ((u1 - u0) * (i + 0.5)) / teeth;
    if (i % 2 === 0) {
      const a = iso.P(fu - 0.038, v1, z + 4);
      const b = iso.P(fu + 0.038, v1, z + 4);
      iso.r.poly([a, b, [b[0], b[1] - 7 * RES], [a[0], a[1] - 7 * RES]], lit(col, 0.05));
      iso.r.polyline([a, [a[0], a[1] - 7 * RES], [b[0], b[1] - 7 * RES], b], INK_W * 0.4, alpha(INK, 0.6));
    }
    const fv = v0 + ((v1 - v0) * (i + 0.5)) / teeth;
    if (i % 2 === 0) {
      const a = iso.P(u1, fv - 0.038, z + 4);
      const b = iso.P(u1, fv + 0.038, z + 4);
      iso.r.poly([a, b, [b[0], b[1] - 7 * RES], [a[0], a[1] - 7 * RES]], shaded(col, 0.06));
      iso.r.polyline([a, [a[0], a[1] - 7 * RES], [b[0], b[1] - 7 * RES], b], INK_W * 0.4, alpha(INK, 0.55));
    }
  }
}

/** A pitched terracotta (Mangalore-tile) HIP roof finished with a ridge — the
 *  common roof of Pune's older institutional/colonial buildings. Thin wrapper
 *  over iso.hip with a ridge highlight. */
function tileRoof(iso: Iso, u0: number, v0: number, u1: number, v1: number, z: number, rise: number): void {
  iso.hip(u0, v0, u1, v1, z, rise, ROOFTILE);
  const apex = iso.P((u0 + u1) / 2, (v0 + v1) / 2, z + rise);
  iso.r.line([apex[0] - 3 * RES, apex[1]], [apex[0] + 3 * RES, apex[1]], 1 * RES, lit(ROOFTILE, 0.12));
  void ROOFTILE_D;
}

// ============================================================================
// HERO DRAW FNS (notability order)
// ============================================================================

// --- 1. SHANIWAR WADA — the great fortified Peshwa palace. The icon is the
// DELHI DARWAZA gate: a tall basalt gatehouse with two flanking bastions, a
// massive teak-spiked arch, behind it the bastioned curtain wall ramparts of
// the fort enclosure. Broad 2×2 with headroom. ----------------------------
function shaniwarWadaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.24, v1 = 1.76;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.26);
  // the great bastioned curtain wall enclosure (battered basalt) — the body
  iso.box(u0, v0, u1, v1, 0, 52, BASALT, { leftC: shaded(BASALT, 0.18), rightC: BASALT_L });
  // a battered (sloping) plinth course at the foot
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 12, BASALT_D, { ink: false });
  // crenellated rampart walk all round
  battlement(iso, u0, v0, u1, v1, 52, BASALT);
  // five great bastions — round drum towers at the corners + gate flanks
  const bastion = (cu: number, cv: number, h: number): void => {
    const [bx, byB] = iso.P(cu, cv, 0);
    const BR = 0.2 * (CELL_W / 2);
    const drum = (z: number, s: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pts.push([bx + Math.cos(a) * BR * s, byB - z * RES + Math.sin(a) * BR * s * 0.5]);
      }
      return pts;
    };
    iso.r.poly([...drum(0, 1), ...drum(h, 0.86).reverse()], BASALT, shaded(BASALT, 0.16));
    iso.r.poly(drum(h, 0.86), lit(BASALT, 0.05));
    iso.r.polyline(drum(0, 1).slice(0, 11), INK_W * 0.7, INK);
    // a merloned cap ring
    iso.r.poly(drum(h + 4, 0.92), lighten(BASALT, 0.08));
    iso.r.polyline(drum(h + 4, 0.92), INK_W * 0.6, alpha(INK, 0.8), true);
  };
  bastion(u0, v0, 60);
  bastion(u1, v0, 60);
  bastion(u0, v1, 56);
  // the DELHI DARWAZA gatehouse rising over the front (v1) face, centred,
  // taller than the wall — the unmistakable silhouette
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.32, v1 - 0.28, gcx + 0.32, v1, 0, 86, BASALT, { rightC: lit(BASALT, 0.05) });
  // the deep recessed pointed arch of the gateway (teak-shadowed)
  const poly: Pt[] = [iso.P(gcx - 0.18, v1, 6), iso.P(gcx - 0.18, v1, 40)];
  for (let j = 0; j <= 8; j++) {
    const t = j / 8;
    poly.push(iso.P(gcx - 0.18 + 0.36 * t, v1, 40 + Math.sin(t * Math.PI) * 18));
  }
  poly.push(iso.P(gcx + 0.18, v1, 40), iso.P(gcx + 0.18, v1, 6));
  iso.r.poly(poly, TEAK_D);
  iso.r.polyline(poly, INK_W * 0.6, INK);
  // the spiked teak doors (rows of elephant-spikes) hinted as studs
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const [sx, sy] = iso.P(gcx - 0.12 + c * 0.12, v1, 14 + r * 7);
      iso.r.line([sx, sy], [sx + 1.4 * RES, sy - 1.4 * RES], 1.4 * RES, GOLD);
    }
  }
  // a nagarkhana (drum-house) gallery over the arch + flanking guard kiosks
  iso.box(gcx - 0.3, v1 - 0.26, gcx + 0.3, v1 - 0.02, 86, 92, lighten(BASALT, 0.05));
  battlement(iso, gcx - 0.3, v1 - 0.26, gcx + 0.3, v1 - 0.02, 92, BASALT);
  chhatri(iso, gcx - 0.22, v1 - 0.14, 96, 0.1, DOMEWHITE);
  chhatri(iso, gcx + 0.22, v1 - 0.14, 96, 0.1, DOMEWHITE);
  // a glow of the fountain/garden hint inside (open courtyard)
  iso.r.poly(
    [iso.P(u0 + 0.2, v0 + 0.2, 52), iso.P(u1 - 0.2, v0 + 0.2, 52), iso.P(u1 - 0.2, v1 - 0.4, 52), iso.P(u0 + 0.2, v1 - 0.4, 52)],
    alpha(shaded(BASALT, 0.2), 0.6),
  );
  return iso.build();
}

// --- 2. AGA KHAN PALACE — Italianate 1892 palace: two storeys of arched
// VERANDAHS (cusped arcades) wrapping the body, pale Mughal-yellow render,
// shallow hip roofs, and corner domed pavilions. Broad, low, elegant. 2×2.
function agaKhanPalaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a green garden plinth (the palace stands in 19 acres of grounds)
  iso.box(u0 - 0.16, v0 - 0.16, u1 + 0.16, v1 + 0.16, 0, 4, shaded(COLORS.grass, 0.12), { ink: false });
  // the main two-storey block
  iso.box(u0, v0, u1, v1, 4, 46, MUGHAL_Y, { leftC: MUGHAL_Y_D, rightC: lit(MUGHAL_Y, 0.04) });
  // ground-floor arched verandah arcade wrapping the two visible faces
  archArcade(iso, v1, u0 + 0.04, u1 - 0.04, 6, 22, 8, 9, alpha(BASALT_D, 0.8));
  // first-floor arcade (slimmer arches)
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 26, 40, 6, 9, alpha(BASALT_D, 0.7));
  // right-face verandahs too
  for (let i = 0; i < 7; i++) {
    const vv = v0 + 0.1 + i * 0.2;
    const poly: Pt[] = [iso.P(u1, vv, 6), iso.P(u1, vv, 22)];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      poly.push(iso.P(u1, vv + 0.12 * t, 22 + Math.sin(t * Math.PI) * 7));
    }
    poly.push(iso.P(u1, vv + 0.12, 22), iso.P(u1, vv + 0.12, 6));
    iso.r.poly(poly, alpha(BASALT_D, 0.75));
  }
  // a deep eaves cornice + shallow Mangalore-tile hip roof
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 46, 50, lighten(MUGHAL_Y, 0.08), { topC: top(MUGHAL_Y, 0.3) });
  tileRoof(iso, u0, v0, u1, v1, 50, 14);
  // four corner domed pavilions (the Italianate cupolas) raised above the roof
  for (const [cu, cv] of [[u0 + 0.18, v0 + 0.18], [u1 - 0.18, v0 + 0.18], [u0 + 0.18, v1 - 0.18], [u1 - 0.18, v1 - 0.18]] as const) {
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 46, 58, lighten(MUGHAL_Y, 0.05));
    onionDome(iso, cu, cv, 58, 0.12, 18, DOMEWHITE);
  }
  // a central larger dome over the entrance
  onionDome(iso, (u0 + u1) / 2, (v0 + v1) / 2, 50, 0.18, 30, DOMEWHITE, { ribs: 6 });
  return iso.build();
}

// --- 3. DAGDUSHETH HALWAI GANPATI — the famous ornate temple: a towering
// gilded NAGARA shikhara over a tall pillared mandap, dense gold ornament,
// flanked by smaller spires. The most opulent silhouette in the city. 2×2.
function dagdushethTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 230 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the temple base (sabha-mandap) — a tall pillared hall in saffron + gold
  iso.box(u0, v0, u1, v1, 0, 48, SAFFRON, { leftC: shaded(SAFFRON, 0.14), rightC: lit(SAFFRON, 0.06) });
  // a colonnade of gilt pillars across the front (the open mandap)
  for (let i = 0; i <= 7; i++) {
    const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 7;
    iso.r.poly(
      [iso.P(u - 0.018, v1, 38), iso.P(u + 0.018, v1, 38), iso.P(u + 0.018, v1, 6), iso.P(u - 0.018, v1, 6)],
      i % 2 ? GOLD : GOLD_HOT,
    );
  }
  // a deep ornamented entablature band (carved frieze) in gold
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 48, 56, GOLD, { topC: top(GOLD, 0.2) });
  // two smaller flanking shikhara at the LEFT/RIGHT corners (the cluster read),
  // set wide + forward of the great tower so neither is occluded by it
  shikhara(iso, u0 + 0.2, v1 - 0.2, 56, 0.12, 50, SAFFRON_HOT);
  shikhara(iso, u1 - 0.2, v0 + 0.2, 56, 0.12, 50, SAFFRON_HOT);
  // the GREAT central gilded shikhara — towers above all (set slightly back)
  shikhara(iso, (u0 + u1) / 2, (v0 + v1) / 2 - 0.02, 56, 0.34, 150, GOLD);
  // a saffron flag-staff (dhwaja) beside it
  const [fx, fyB] = iso.P(u1 - 0.16, v0 + 0.2, 56);
  iso.r.line([fx, fyB], [fx, fyB - 120 * RES], 1.2 * RES, GOLD_HOT);
  iso.r.poly([[fx, fyB - 120 * RES], [fx + 12 * RES, fyB - 114 * RES], [fx, fyB - 108 * RES]], SAFFRON_HOT);
  return iso.build();
}

// --- 4. SHINDE CHHATRI — the Anglo-Rajasthani memorial of Mahadji Shinde: a
// richly carved stone cenotaph hall with a tall central dome on a drum, cusped
// arcades, corner chhatris and a kalash. Greyish carved stone + gold. 2×2.
function shindeChhatriTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 160 });
  void seed;
  const ST = hex('#b9a890'); // warm carved sandstone
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a stepped plinth
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 10, shaded(ST, 0.14), { ink: false });
  // the cenotaph hall body
  iso.box(u0, v0, u1, v1, 10, 44, ST, { rightC: lit(ST, 0.05) });
  // richly cusped arcade on the front + right
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 14, 34, 8, 5, alpha(BASALT_D, 0.8));
  for (let i = 0; i < 4; i++) {
    const vv = v0 + 0.14 + i * 0.3;
    const poly: Pt[] = [iso.P(u1, vv, 14), iso.P(u1, vv, 34)];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      poly.push(iso.P(u1, vv + 0.16 * t, 34 + Math.sin(t * Math.PI) * 8));
    }
    poly.push(iso.P(u1, vv + 0.16, 34), iso.P(u1, vv + 0.16, 14));
    iso.r.poly(poly, alpha(BASALT_D, 0.75));
  }
  // ornate cornice + parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 44, 50, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  // four corner chhatris
  chhatri(iso, u0 + 0.16, v0 + 0.16, 50, 0.12, ST);
  chhatri(iso, u1 - 0.16, v0 + 0.16, 50, 0.12, ST);
  chhatri(iso, u0 + 0.16, v1 - 0.16, 50, 0.12, ST);
  chhatri(iso, u1 - 0.16, v1 - 0.16, 50, 0.12, ST);
  // the tall central drum + dome (the focal silhouette)
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.28, cy - 0.28, cx + 0.28, cy + 0.28, 50, 74, lighten(ST, 0.04));
  // a colonnaded gallery on the drum
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI;
    const [dx, dyB] = iso.P(cx, cy + 0.28, 0);
    const DR = 0.28 * (CELL_W / 2);
    const px = dx + Math.cos(a) * DR;
    const py = dyB - 64 * RES + Math.sin(a) * DR * 0.5;
    iso.r.line([px, py - 7 * RES], [px, py + 7 * RES], 1.1 * RES, a < Math.PI * 0.45 ? lit(ST, 0.1) : ST);
  }
  onionDome(iso, cx, cy, 74, 0.28, 50, DOMEWHITE, { ribs: 6 });
  return iso.build();
}

// --- 5. LAL MAHAL — Shivaji's reconstructed red-brick Maratha palace: a low
// fortified brick block with a crenellated parapet, a recessed arched gateway,
// jharokha balconies and corner kiosks. 2×2. ------------------------------
function lalMahalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.24, u1 = 1.76, v0 = 0.32, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the brick body
  iso.box(u0, v0, u1, v1, 0, 50, BRICKR, { leftC: shaded(BRICKR, 0.16), rightC: lit(BRICKR, 0.05) });
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, BRICKR_D, { ink: false });
  // a row of arched windows + a central recessed gateway on the front
  archArcade(iso, v1, u0 + 0.06, u0 + 0.62, 12, 34, 7, 3, alpha(BASALT_D, 0.8));
  archArcade(iso, v1, u1 - 0.62, u1 - 0.06, 12, 34, 7, 3, alpha(BASALT_D, 0.8));
  const gcx = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(gcx - 0.16, v1, 6), iso.P(gcx - 0.16, v1, 32)];
  for (let j = 0; j <= 8; j++) {
    const t = j / 8;
    poly.push(iso.P(gcx - 0.16 + 0.32 * t, v1, 32 + Math.sin(t * Math.PI) * 14));
  }
  poly.push(iso.P(gcx + 0.16, v1, 32), iso.P(gcx + 0.16, v1, 6));
  iso.r.poly(poly, TEAK_D);
  iso.r.polyline(poly, INK_W * 0.6, INK);
  // jharokha projecting balcony over the gate (teak)
  iso.box(gcx - 0.2, v1 - 0.02, gcx + 0.2, v1 + 0.06, 36, 46, TEAK, { topC: top(TEAK, 0.2) });
  iso.r.poly([iso.P(gcx - 0.22, v1 + 0.06, 36), iso.P(gcx + 0.22, v1 + 0.06, 36), iso.P(gcx + 0.2, v1, 36), iso.P(gcx - 0.2, v1, 36)], TEAK_D);
  // crenellated parapet + corner domed kiosks
  battlement(iso, u0, v0, u1, v1, 50, BRICKR);
  chhatri(iso, u0 + 0.16, v0 + 0.16, 54, 0.11, DOMEWHITE);
  chhatri(iso, u1 - 0.16, v0 + 0.16, 54, 0.11, DOMEWHITE);
  chhatri(iso, u0 + 0.16, v1 - 0.16, 54, 0.11, DOMEWHITE);
  chhatri(iso, u1 - 0.16, v1 - 0.16, 54, 0.11, DOMEWHITE);
  return iso.build();
}

// --- 6. PATALESHWAR — the 8th-c. rock-cut basalt CAVE temple: a low monolith
// carved from a single black-basalt outcrop, a square pillared Nandi-mandap
// pavilion in front, deep shadowed cave mouth. Low + dark + ancient. 2×2. ---
function pataleshwarTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.22, u1 = 1.78, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.24);
  // the rock outcrop the temple is hewn from (an irregular basalt mass)
  iso.box(u0, v0, u1, v1, 0, 34, BASALT, { leftC: shaded(BASALT, 0.2), rightC: lit(BASALT, 0.03) });
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 9, BASALT_D, { ink: false });
  // a flat rough rock top (it's cut into the ground, not a built roof)
  iso.quad(u0, v0, u1, v1, 34, top(BASALT, 0.16));
  // the deep cave-mouth pillared facade on the front: square columns + dark gaps
  for (let i = 0; i <= 4; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 4;
    iso.r.poly([iso.P(u - 0.04, v1, 30), iso.P(u + 0.04, v1, 30), iso.P(u + 0.04, v1, 4), iso.P(u - 0.04, v1, 4)], shaded(BASALT, 0.06));
  }
  // dark recessed bays between the columns (the cave interior)
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.24 + ((u1 - u0 - 0.4) * i) / 4;
    iso.r.poly([iso.P(u, v1, 28), iso.P(u + 0.12, v1, 28), iso.P(u + 0.12, v1, 4), iso.P(u, v1, 4)], alpha(BASALT_D, 0.92));
  }
  // the free-standing square NANDI-MANDAP pavilion in the courtyard front: a
  // flat-roofed slab on stubby pillars (Pataleshwar's signature umbrella shrine)
  const mcx = (u0 + u1) / 2, mcy = v1 + 0.0;
  void mcy;
  const px = mcx, py = v0 + 0.7;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const cu = px + sx * 0.18, cv = py + sy * 0.18;
    iso.box(cu - 0.025, cv - 0.025, cu + 0.025, cv + 0.025, 34, 50, BASALT, { rightC: lit(BASALT, 0.05) });
  }
  // the round umbrella slab roof
  const [sx2, syB] = iso.P(px, py, 50);
  const SR = 0.24 * (CELL_W / 2);
  const disc: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    disc.push([sx2 + Math.cos(a) * SR, syB + Math.sin(a) * SR * 0.5]);
  }
  iso.r.poly(disc, shaded(BASALT, 0.04), lit(BASALT, 0.06));
  iso.r.polyline(disc, INK_W * 0.7, INK, true);
  return iso.build();
}

// --- 7. VISHRAMBAUG WADA — the Peshwa mansion famed for its CARVED TEAK
// facade + balcony: a long render-and-teak block, an ornate projecting first-
// floor wooden gallery (sajja) on carved brackets, tiled roof. 2×2. ---------
function vishrambaugWadaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.2, u1 = 1.8, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the lime-render ground floor
  iso.box(u0, v0, u1, v1, 0, 28, LATER, { leftC: shaded(LATER, 0.16), rightC: lit(LATER, 0.05) });
  // ground-floor arched shopfronts on the front
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 6, 22, 6, 8, alpha(TEAK_D, 0.85));
  // the famous projecting CARVED TEAK first-floor gallery overhanging the street
  iso.box(u0 + 0.02, v1 - 0.06, u1 - 0.02, v1 + 0.1, 28, 48, TEAK, { leftC: shaded(TEAK, 0.14), rightC: lit(TEAK, 0.06) });
  // the underside brackets (carved cusped struts) holding the sajja out
  for (let i = 0; i <= 9; i++) {
    const u = u0 + 0.08 + ((u1 - u0 - 0.16) * i) / 9;
    const a = iso.P(u, v1 + 0.1, 28);
    iso.r.poly([[a[0], a[1]], [a[0] + 3 * RES, a[1] + 3 * RES], [a[0], a[1] + 6 * RES]], TEAK_D);
  }
  // a long row of carved-wood lattice windows (jali) along the gallery
  iso.windowsLeft(v1 + 0.1, u0 + 0.06, u1 - 0.06, 32, 46, 9, alpha(GOLD, 0.5), TEAK_L);
  // a teak cornice + Mangalore-tile roof oversailing
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.12, 48, 52, TEAK_D, { ink: false });
  tileRoof(iso, u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.12, 52, 16);
  // a small central wooden pediment over the entrance
  const gcx = (u0 + u1) / 2;
  iso.r.poly([iso.P(gcx - 0.18, v1 + 0.1, 48), iso.P(gcx + 0.18, v1 + 0.1, 48), iso.P(gcx, v1 + 0.1, 60)], lit(TEAK, 0.1));
  iso.r.polyline([iso.P(gcx - 0.18, v1 + 0.1, 48), iso.P(gcx, v1 + 0.1, 60), iso.P(gcx + 0.18, v1 + 0.1, 48)], INK_W * 0.7, INK);
  return iso.build();
}

// --- 8. SINHAGAD / PURANDAR HILL FORT — a Maratha basalt fort crowning a
// steep rocky hill: tiered black-basalt ramparts with bastions zig-zagging up
// a green-brown massif, a flag, the Pune Darwaza gate. A MONSTER landform
// hero. 3×3 with big headroom. Also serves the Taljai Watch Tower. ---------
function hillFortTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 180 });
  void seed;
  const u0 = 0.1, u1 = 2.9, v0 = 0.1, v1 = 2.9;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  const HILL = hex('#7c7a52'); // dry Deccan hill scrub
  const HILL_D = hex('#5e5d3e');
  // the hill massif: three diminishing rocky tiers
  iso.box(u0, v0, u1, v1, 0, 30, HILL, { leftC: shaded(HILL, 0.18), rightC: lit(HILL, 0.04), topC: shaded(HILL, 0.02) });
  iso.box(u0 + 0.5, v0 + 0.5, u1 - 0.5, v1 - 0.5, 30, 58, HILL, { leftC: shaded(HILL, 0.2), rightC: lit(HILL, 0.03) });
  iso.box(u0 + 1.0, v0 + 1.0, u1 - 1.0, v1 - 1.0, 58, 84, HILL, { leftC: shaded(HILL, 0.22), rightC: lit(HILL, 0.02) });
  // scree / rock outcrops on the slopes
  for (const [pu, pv, pz] of [[u0 + 0.3, v1 - 0.3, 12], [u1 - 0.3, v0 + 0.4, 12], [u0 + 0.8, v1 - 0.8, 40], [u1 - 0.8, v0 + 0.9, 40]] as const) {
    iso.r.poly([iso.P(pu, pv, pz), iso.P(pu + 0.16, pv, pz + 4), iso.P(pu + 0.1, pv - 0.1, pz + 10), iso.P(pu - 0.04, pv - 0.06, pz + 4)], shaded(BASALT, 0.06));
  }
  void HILL_D;
  // basalt RAMPARTS wrapping each tier (the fortification read)
  const rampart = (a0: number, b0: number, a1: number, b1: number, z: number): void => {
    iso.box(a0, b0, a1, b1, z, z + 12, BASALT, { rightC: lit(BASALT, 0.05) });
    battlement(iso, a0, b0, a1, b1, z + 12, BASALT);
  };
  rampart(u0, v0, u1, v1, 30);
  rampart(u0 + 0.5, v0 + 0.5, u1 - 0.5, v1 - 0.5, 58);
  // the summit bastion/citadel
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 84, 108, BASALT, { rightC: lit(BASALT, 0.06) });
  battlement(iso, cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 108, BASALT);
  // a square summit watch-turret (the ध्वजस्तंभ bastion) rising clear of the
  // citadel parapet — reads as a tower at every zoom, unlike a tiny drum
  const tu = cx + 0.18, tv = cy - 0.18;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 108, 134, BASALT, { rightC: BASALT_L });
  battlement(iso, tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 134, BASALT);
  // an arrow-slit on the turret front
  iso.r.poly([iso.P(tu - 0.03, tv + 0.1, 116), iso.P(tu + 0.03, tv + 0.1, 116), iso.P(tu + 0.03, tv + 0.1, 128), iso.P(tu - 0.03, tv + 0.1, 128)], alpha(BASALT_D, 0.9));
  // the saffron Maratha flag on the summit (the bhagwa dhwaj)
  const [fx, fyB] = iso.P(cx - 0.1, cy + 0.1, 108);
  iso.r.line([fx, fyB], [fx, fyB - 40 * RES], 1.3 * RES, hex('#cfcabf'));
  iso.r.poly([[fx, fyB - 40 * RES], [fx + 18 * RES, fyB - 34 * RES], [fx, fyB - 26 * RES]], SAFFRON_HOT);
  iso.r.polyline([[fx, fyB - 40 * RES], [fx + 18 * RES, fyB - 34 * RES], [fx, fyB - 26 * RES]], INK_W * 0.5, alpha(INK, 0.6));
  return iso.build();
}

// --- 9. PUNE JUNCTION (the colonial railway station + MSRTC stand) — a long
// low British-era station: a buff stone frontage with repeated arched bays, a
// pitched glazed train-shed behind, a central clock-gable and a porte-cochère.
// Long 3×2. -----------------------------------------------------------------
function puneJunctionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.2, u1 = 2.8, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the long glazed train-shed (a glowing barrel vault) behind the frontage
  const sx0 = u0 + 0.24, sx1 = u1 - 0.24, sv0 = v0 + 0.16, sv1 = v1 - 0.56;
  iso.box(sx0, sv0, sx1, sv1, 0, 34, shaded(COLORS.glassSky, 0.1), { topC: alpha(COLORS.glassLit, 0.35) });
  const shedV = (sv0 + sv1) / 2;
  const VAULT = 20 * RES;
  for (let i = 0; i <= 16; i++) {
    const u = sx0 + ((sx1 - sx0) * i) / 16;
    const [bx, by] = iso.P(u, shedV, 34);
    iso.r.line([bx, by], [bx, by - VAULT], 0.9 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.75) : alpha(COLORS.glassSky, 0.9));
  }
  // the longitudinal ridge skylight catching the dusk
  const [rgx0, rgy0] = iso.P(sx0, shedV, 34);
  const [rgx1] = iso.P(sx1, shedV, 34);
  iso.r.line([rgx0, rgy0 - VAULT], [rgx1, rgy0 - VAULT], 1.5 * RES, alpha(COLORS.glassLit, 0.8));
  // the long buff-stone frontage block
  iso.box(u0, v1 - 0.6, u1, v1, 0, 40, LATER, { rightC: lit(LATER, 0.05) });
  iso.box(u0 - 0.02, v1 - 0.62, u1 + 0.02, v1 + 0.02, 0, 9, LATER_D, { ink: false });
  // repeated arched bays along the platform-side frontage
  archArcade(iso, v1, u0 + 0.1, u1 - 0.1, 6, 28, 8, 12, alpha(BASALT_D, 0.78));
  // deep eaves cornice
  iso.box(u0 - 0.03, v1 - 0.62, u1 + 0.03, v1 + 0.03, 40, 45, lighten(LATER, 0.08), { topC: top(LATER, 0.3) });
  tileRoof(iso, u0, v1 - 0.6, u1, v1, 45, 10);
  // the central clock gable
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.26, v1 - 0.6, gcx + 0.26, v1, 0, 54, LATER, { rightC: lit(LATER, 0.06) });
  const [clx, cly] = iso.P(gcx, v1, 46);
  const RR = 4.4 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]);
  }
  iso.r.poly(ring, TEMPLE_W);
  iso.r.polyline(ring, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly - RR], [clx, cly - RR - 2.4 * RES], 1 * RES, INK);
  iso.r.line([clx, cly - RR], [clx + 2 * RES, cly - RR], 1 * RES, INK);
  iso.r.poly([iso.P(gcx - 0.28, v1, 54), iso.P(gcx + 0.28, v1, 54), iso.P(gcx, v1, 64)], lit(LATER, 0.12));
  iso.r.polyline([iso.P(gcx - 0.28, v1, 54), iso.P(gcx, v1, 64), iso.P(gcx + 0.28, v1, 54)], INK_W * 0.7, INK);
  return iso.build();
}

// --- 10. PUNE METRO (elevated station / the system) — a modern elevated
// metro: a long curved viaduct deck on V-piers carrying a glazed station box
// with a wavy canopy. Long 3×2 with headroom. Serves the metro names. -------
function puneMetroTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.2, u1 = 2.8, v0 = 0.6, v1 = 1.4;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  const PIER = hex('#b9b3bf'); // pale concrete
  // a row of V-shaped piers carrying the deck
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 5;
    const [bx, byB] = iso.P(u, (v0 + v1) / 2, 0);
    iso.r.line([bx - 5 * RES, byB - 40 * RES], [bx, byB], 3 * RES, shaded(PIER, 0.1));
    iso.r.line([bx + 5 * RES, byB - 40 * RES], [bx, byB], 3 * RES, lit(PIER, 0.06));
  }
  // the elevated deck (a long box)
  iso.box(u0, v0 + 0.2, u1, v1 - 0.2, 40, 50, PIER, { rightC: lit(PIER, 0.05) });
  // the glazed station box riding the deck
  iso.box(u0 + 0.4, v0 + 0.24, u1 - 0.4, v1 - 0.24, 50, 70, alpha(COLORS.glassSky, 0.85), { topC: alpha(COLORS.glassLit, 0.5) });
  iso.windowsLeft(v1 - 0.24, u0 + 0.42, u1 - 0.42, 54, 68, 12, alpha(COLORS.glassLit, 0.6), COLORS.steel);
  // a wavy cantilever canopy roof (the Aqua Line signature)
  const cv = (v0 + v1) / 2;
  for (let i = 0; i <= 18; i++) {
    const u = u0 + 0.4 + ((u1 - u0 - 0.8) * i) / 18;
    const w = 4 + Math.sin(i * 0.6) * 3;
    const [bx, by] = iso.P(u, cv, 70);
    iso.r.line([bx, by - w * RES], [bx, by], 0.9 * RES, COLORS.steel);
  }
  const [rx0, ry0] = iso.P(u0 + 0.4, cv, 76);
  const [rx1] = iso.P(u1 - 0.4, cv, 76);
  iso.r.line([rx0, ry0], [rx1, ry0], 1.6 * RES, lit(PIER, 0.1));
  void GLASSIT_D;
  return iso.build();
}

// --- 11. IT TOWER (Hinjawadi / EON mirror-glass) — a sleek modern office
// tower: a slim tapering curtain-wall slab of teal mirror-glass with a crown
// notch + a smaller podium. Slim + very tall. 1×1 with big headroom. --------
function itTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 250 });
  void seed;
  const u = 0.5, v = 0.5, b = 0.28;
  iso.shadow(u - b, v - b, u + b, v + b, 0.22, 0.22);
  // a low landscaped podium
  iso.box(u - 0.4, v - 0.4, u + 0.4, v + 0.4, 0, 14, hex('#b9b3bf'), { ink: false });
  // the main glass slab (tall, slightly tapering)
  iso.box(u - b, v - b, u + b, v + b, 14, 150, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.08), topC: alpha(COLORS.glassLit, 0.4) });
  iso.box(u - b * 0.84, v - b * 0.84, u + b * 0.84, v + b * 0.84, 150, 196, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.1) });
  // horizontal floor-band glazing (the curtain-wall read)
  for (let z = 22; z < 192; z += 9) {
    const s = z < 150 ? b : b * 0.84;
    iso.r.line(iso.P(u - s, v + s, z), iso.P(u + s, v + s, z), 0.7 * RES, alpha(COLORS.glassLit, z % 27 === 22 % 27 ? 0.5 : 0.22));
  }
  // a lit vertical mullion strip
  iso.r.line(iso.P(u + b, v, 16), iso.P(u + b * 0.84, v, 194), 1 * RES, alpha(COLORS.glassLit, 0.5));
  // the crown notch + a slim mast
  const [tx, tyB] = iso.P(u, v, 196);
  iso.r.poly([[tx - b * (CELL_W / 2) * 0.84, tyB], [tx, tyB - 8 * RES], [tx + b * (CELL_W / 2) * 0.84, tyB]], lit(GLASSIT, 0.12));
  iso.r.line([tx, tyB - 8 * RES], [tx, tyB - 22 * RES], 1.1 * RES, COLORS.steel);
  return iso.build();
}

// --- 12. AUNDH VITTHAL MANDIR — a classic Maharashtrian Nagara temple: a
// saffron sabha-mandap with a tiered terracotta-and-render porch and a single
// bold curvilinear shikhara + kalash. 1×1 with headroom. --------------------
function vitthalMandirTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 170 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.24);
  // the mandap hall in saffron render
  iso.box(u0, v0, u1, v1, 0, 30, SAFFRON, { leftC: shaded(SAFFRON, 0.14), rightC: lit(SAFFRON, 0.06) });
  // a small pillared entrance porch + tiled pent roof
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 6, 22, 5, 3, alpha(TEAK_D, 0.85));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 30, 34, GOLD, { ink: false });
  tileRoof(iso, u0, v0, u1, v1, 34, 8);
  // a white antarala band, then the shikhara over the sanctum (set back)
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.04;
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 34, 44, TEMPLE_W);
  shikhara(iso, cx, cy, 44, 0.2, 100, SAFFRON_HOT);
  return iso.build();
}

// --- 13. CHATURSHRUNGI MANDIR — the famous hillside temple reached by a long
// flight of steps: a saffron temple with shikhara perched atop a stepped
// basalt hill, the zig-zag staircase climbing the slope. 2×2 headroom. ------
function chaturshrungiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 180 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.16, v1 = 1.84;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  const HILL = hex('#80794e');
  // the hill the temple sits on (two tiers)
  iso.box(u0, v0, u1, v1, 0, 26, HILL, { leftC: shaded(HILL, 0.18), rightC: lit(HILL, 0.04) });
  iso.box(u0 + 0.4, v0 + 0.4, u1 - 0.4, v1 - 0.4, 26, 52, HILL, { leftC: shaded(HILL, 0.2), rightC: lit(HILL, 0.03) });
  // the long flight of STEPS climbing the front-left slope (the pilgrimage way)
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const u = u0 + 0.2 + t * 0.5;
    const vv = v1 - 0.2 - t * 0.5;
    const z = 4 + t * 46;
    iso.r.poly([iso.P(u, vv, z), iso.P(u + 0.1, vv, z), iso.P(u + 0.1, vv - 0.04, z + 3), iso.P(u, vv - 0.04, z + 3)], i % 2 ? lighten(TEMPLE_W, 0.04) : TEMPLE_W);
  }
  // a white temple platform on the summit + saffron shrine + shikhara
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 52, 60, TEMPLE_W);
  iso.box(cx - 0.24, cy - 0.24, cx + 0.24, cy + 0.24, 60, 78, SAFFRON, { rightC: lit(SAFFRON, 0.06) });
  archArcade(iso, cy + 0.24, cx - 0.2, cx + 0.2, 64, 76, 4, 3, alpha(TEAK_D, 0.85));
  shikhara(iso, cx, cy, 78, 0.22, 92, SAFFRON_HOT);
  // a couple of small corner deepmalas (lamp-towers)
  for (const [du, dv] of [[cx - 0.28, cy + 0.24], [cx + 0.28, cy - 0.24]] as const) {
    iso.box(du - 0.02, dv - 0.02, du + 0.02, dv + 0.02, 60, 84, BASALT);
    const [lx, ly] = iso.P(du, dv, 84);
    iso.r.poly([[lx - 2.4 * RES, ly], [lx + 2.4 * RES, ly], [lx, ly - 5 * RES]], GOLD_HOT);
  }
  return iso.build();
}

// --- 14. OHEL DAVID SYNAGOGUE ("Lal Deval") — the red-brick English-Gothic
// synagogue with a tall corner CLOCK TOWER + spire, the largest in Asia
// outside Israel. Brick-red with stone dressings + a Star of David. 2×2. ----
function ohelDavidTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 220 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the red-brick nave body with stone banding
  iso.box(u0, v0, u1, v1 - 0.16, 0, 52, BRICKR, { leftC: shaded(BRICKR, 0.16), rightC: lit(BRICKR, 0.05) });
  iso.gable(u0, v0, u1, v1 - 0.16, 52, 22, 'v', BRICKR_D, BRICKR);
  // tall lancet windows with pale stone surrounds down the flank
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.1 + i * 0.3;
    iso.r.poly([iso.P(u, v1 - 0.16, 10), iso.P(u + 0.06, v1 - 0.16, 10), iso.P(u + 0.06, v1 - 0.16, 30), iso.P(u + 0.03, v1 - 0.16, 38), iso.P(u, v1 - 0.16, 30)], alpha(BASALT_D, 0.85));
    iso.r.polyline([iso.P(u, v1 - 0.16, 10), iso.P(u, v1 - 0.16, 30), iso.P(u + 0.03, v1 - 0.16, 38), iso.P(u + 0.06, v1 - 0.16, 30), iso.P(u + 0.06, v1 - 0.16, 10)], INK_W * 0.4, alpha(TEMPLE_W, 0.7));
  }
  // the west front with a rose / Star window
  iso.box(u0 + 0.06, v1 - 0.16, u1 - 0.06, v1, 0, 60, BRICKR, { rightC: lit(BRICKR, 0.06) });
  const [rx, ry] = iso.P((u0 + u1) / 2, v1, 42);
  const sy = ry - 1 * RES;
  iso.r.poly([[rx - 4 * RES, sy + 2 * RES], [rx + 4 * RES, sy + 2 * RES], [rx, sy - 4 * RES]], alpha(GOLD, 0.6));
  iso.r.poly([[rx - 4 * RES, sy - 2 * RES], [rx + 4 * RES, sy - 2 * RES], [rx, sy + 4 * RES]], alpha(GOLD, 0.6));
  // the tall CORNER CLOCK TOWER + broach spire (the Lal Deval landmark)
  const tu = u1 - 0.1, tv = v1 - 0.06;
  iso.box(tu - 0.14, tv - 0.14, tu + 0.14, tv + 0.06, 0, 96, BRICKR, { rightC: lit(BRICKR, 0.06) });
  // stone belfry stage + clock face
  iso.box(tu - 0.15, tv - 0.15, tu + 0.15, tv + 0.07, 96, 116, LATER);
  const [clx, cly] = iso.P(tu, tv + 0.07, 106);
  const RR = 3.2 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]);
  }
  iso.r.poly(ring, TEMPLE_W);
  iso.r.polyline(ring, INK_W * 0.5, INK, true);
  // the broach spire
  const apex = iso.P(tu, tv - 0.04, 168);
  const c0 = iso.P(tu - 0.15, tv + 0.07, 116);
  const c1 = iso.P(tu + 0.15, tv + 0.07, 116);
  const c2 = iso.P(tu + 0.15, tv - 0.15, 116);
  iso.r.poly([c0, c1, apex], shaded(BRICKR_D, 0.06));
  iso.r.poly([c1, c2, apex], lit(BRICKR_D, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  // a Star of David finial
  const [fx, fyB] = apex;
  iso.r.poly([[fx - 2.4 * RES, fyB - 2 * RES], [fx + 2.4 * RES, fyB - 2 * RES], [fx, fyB - 6.6 * RES]], GOLD_HOT);
  iso.r.poly([[fx - 2.4 * RES, fyB - 4.6 * RES], [fx + 2.4 * RES, fyB - 4.6 * RES], [fx, fyB]], GOLD_HOT);
  return iso.build();
}

// --- 15. MAHATMA PHULE MANDAI — the 1882 Victorian-Gothic vegetable market: a
// cruciform cast-iron-and-brick hall radiating EIGHT wings from a tall central
// octagonal CLOCK TOWER with a steep spire. Broad 2×2. ----------------------
function phuleMandaiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.28, v1 = 1.72;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  // the radiating market wings (a cross of long low brick halls)
  iso.box(u0, cy - 0.28, u1, cy + 0.28, 0, 30, BRICKR, { rightC: lit(BRICKR, 0.05) }); // E-W wing
  iso.box(cx - 0.28, v0, cx + 0.28, v1, 0, 30, BRICKR, { rightC: lit(BRICKR, 0.05) }); // N-S wing
  // glazed clerestory roof ridges on the wings
  iso.gable(u0, cy - 0.28, u1, cy + 0.28, 30, 12, 'u', ROOFTILE, BRICKR);
  iso.gable(cx - 0.28, v0, cx + 0.28, v1, 30, 12, 'v', ROOFTILE, BRICKR);
  // arched market openings along the visible wing fronts
  archArcade(iso, cy + 0.28, u0 + 0.06, u1 - 0.06, 6, 24, 6, 9, alpha(BASALT_D, 0.8));
  // the tall central octagonal CLOCK TOWER
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 0, 70, LATER, { rightC: lit(LATER, 0.06) });
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 70, 84, BRICKR);
  // clock face on the front
  const [clx, cly] = iso.P(cx, cy + 0.2, 78);
  const RR = 3.6 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]);
  }
  iso.r.poly(ring, TEMPLE_W);
  iso.r.polyline(ring, INK_W * 0.5, INK, true);
  iso.r.line([clx, cly - RR], [clx, cly - RR - 2.2 * RES], 1 * RES, INK);
  // the steep spire crowning the tower
  const apex = iso.P(cx, cy, 150);
  const c0 = iso.P(cx - 0.2, cy + 0.2, 84);
  const c1 = iso.P(cx + 0.2, cy + 0.2, 84);
  const c2 = iso.P(cx + 0.2, cy - 0.2, 84);
  iso.r.poly([c0, c1, apex], shaded(ROOFTILE_D, 0.06));
  iso.r.poly([c1, c2, apex], lit(ROOFTILE_D, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  iso.r.line(apex, [apex[0], apex[1] - 5 * RES], 1 * RES, GOLD_HOT);
  return iso.build();
}

// --- 16. RAJA DINKAR KELKAR MUSEUM — a three-storey museum in a richly carved
// Rajasthani-Maratha idiom: ornate jharokha bay windows, carved stone screens,
// a small dome + tiled roof. Tall 1×1. --------------------------------------
function kelkarMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 140 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.24);
  // the tall three-storey render body
  iso.box(u0, v0, u1, v1, 0, 78, LATER, { leftC: shaded(LATER, 0.16), rightC: lit(LATER, 0.05) });
  // three storeys of arched / bracketed windows on the front
  for (const z of [12, 36, 60] as const) {
    archArcade(iso, v1, u0 + 0.06, u1 - 0.06, z, z + 16, 5, 4, alpha(BASALT_D, 0.82));
  }
  // a projecting carved jharokha bay over the entrance (the museum tell)
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.16, v1 - 0.02, gcx + 0.16, v1 + 0.08, 30, 56, TEAK, { topC: top(TEAK, 0.2) });
  iso.r.poly([iso.P(gcx - 0.18, v1 + 0.08, 30), iso.P(gcx + 0.18, v1 + 0.08, 30), iso.P(gcx + 0.16, v1, 30), iso.P(gcx - 0.16, v1, 30)], TEAK_D);
  // a little hip roof on the jharokha
  iso.hip(gcx - 0.18, v1 - 0.02, gcx + 0.18, v1 + 0.1, 56, 8, ROOFTILE);
  // cornice + tiled roof + a small central dome
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 78, 82, lighten(LATER, 0.08), { topC: top(LATER, 0.3) });
  tileRoof(iso, u0, v0, u1, v1, 82, 10);
  onionDome(iso, gcx, (v0 + v1) / 2, 82, 0.14, 22, DOMEWHITE);
  return iso.build();
}

// --- 17. SHOPPING MALL (Phoenix Marketcity / Nexus Westend / The Pavillion) —
// a big modern retail mass: a long stone-and-glass block with a glowing
// multi-storey glass atrium frontage, a curved entrance canopy + signage
// pylon. Broad 2×2. The `tall` flag bumps Phoenix (the biggest). -----------
function mallTile(seed: number, tall: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: tall ? 100 : 70 });
  void seed;
  const CLAD = hex('#cbb79a'); // warm stone cladding
  const u0 = 0.16, u1 = 1.84, v0 = 0.24, v1 = 1.76;
  const topZ = tall ? 64 : 50;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the big retail box
  iso.box(u0, v0, u1, v1, 0, topZ, CLAD, { leftC: shaded(CLAD, 0.16), rightC: lit(CLAD, 0.05) });
  // a tall glowing glass atrium curtain across the front
  iso.box(u0 + 0.2, v1 - 0.06, u1 - 0.2, v1, 0, topZ - 6, alpha(COLORS.glassSky, 0.85), { topC: alpha(COLORS.glassLit, 0.5) });
  for (let i = 0; i < 10; i++) {
    const u = u0 + 0.24 + i * 0.135;
    iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, topZ - 8), 0.8 * RES, alpha(COLORS.glassLit, i % 2 ? 0.5 : 0.28));
  }
  for (let z = 14; z < topZ - 6; z += 12) {
    iso.r.line(iso.P(u0 + 0.2, v1, z), iso.P(u1 - 0.2, v1, z), 0.7 * RES, alpha(COLORS.glassLit, 0.3));
  }
  // a curved cantilever entrance canopy
  const gcx = (u0 + u1) / 2;
  iso.r.poly([iso.P(gcx - 0.3, v1 + 0.04, 18), iso.P(gcx + 0.3, v1 + 0.04, 18), iso.P(gcx + 0.26, v1, 22), iso.P(gcx - 0.26, v1, 22)], lit(COLORS.steel, 0.06));
  // parapet + roof plant
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, topZ, topZ + 5, lighten(CLAD, 0.06), { ink: false });
  iso.box(u0 + 0.3, v0 + 0.3, u0 + 0.6, v0 + 0.6, topZ, topZ + 12, COLORS.steelDark, { ink: false });
  // a tall illuminated signage pylon standing at the front-right corner
  const [px, pyB] = iso.P(u1 - 0.06, v1 - 0.06, 0);
  const sgH = (tall ? 70 : 52) * RES;
  iso.r.line([px, pyB], [px, pyB - sgH], 2.4 * RES, COLORS.steelDark);
  iso.r.rect(px - 5 * RES, pyB - sgH, px + 5 * RES, pyB - sgH + (tall ? 18 : 14) * RES, alpha(COLORS.glassHot, 0.9));
  iso.r.polyline(
    [[px - 5 * RES, pyB - sgH], [px + 5 * RES, pyB - sgH], [px + 5 * RES, pyB - sgH + (tall ? 18 : 14) * RES], [px - 5 * RES, pyB - sgH + (tall ? 18 : 14) * RES]],
    INK_W * 0.5, alpha(INK, 0.7), true,
  );
  return iso.build();
}

// --- 18. IUCAA — Charles Correa's celebrated modernist astronomy campus: a
// composition of cubic ochre-render volumes, deep-set square windows, a
// pergola court and a small DOME observatory. Low, sculptural. 2×2. ---------
function iucaaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const OCHRE = hex('#d2a96e'); // Correa's warm ochre render
  const u0 = 0.18, u1 = 1.82, v0 = 0.26, v1 = 1.74;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a cluster of cubic volumes at different heights (the Correa massing)
  iso.box(u0, v0, u1 - 0.5, v1, 0, 40, OCHRE, { rightC: lit(OCHRE, 0.05) });
  iso.box(u1 - 0.6, v0, u1, v1 - 0.4, 0, 56, OCHRE, { rightC: lit(OCHRE, 0.06) });
  iso.box(u0 + 0.3, v1 - 0.5, u1 - 0.7, v1, 0, 28, lighten(OCHRE, 0.04));
  // deep-set square punched windows (the modernist grid)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const u = u0 + 0.16 + c * 0.26;
      const z = 8 + r * 11;
      if (u > u1 - 0.5) continue;
      iso.r.poly([iso.P(u, v1, z), iso.P(u + 0.08, v1, z), iso.P(u + 0.08, v1, z + 7), iso.P(u, v1, z + 7)], alpha(BASALT_D, 0.8));
    }
  }
  // a pergola court (open beams) in the front-left
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.1 + i * 0.12;
    iso.r.line(iso.P(u, v1 - 0.04, 30), iso.P(u, v1 - 0.04, 34), 0.8 * RES, OCHRE);
  }
  // the little observatory dome on the tall block
  onionDome(iso, u1 - 0.3, (v0 + v1 - 0.4) / 2, 56, 0.16, 18, DOMEWHITE);
  // a flat parapet roof
  iso.box(u0 - 0.02, v0 - 0.02, u1 - 0.48, v1 + 0.02, 40, 43, lighten(OCHRE, 0.06), { ink: false });
  return iso.build();
}

// --- 19. NATIONAL CHEMICAL LABORATORY — a long 1950s modernist research block
// in cream render: a horizontal slab with ribbon windows, a taller stair/lab
// tower, and a science emblem. 2×2. -----------------------------------------
function nclTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const CREAM = hex('#ddd2bb');
  const u0 = 0.18, u1 = 1.82, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long horizontal slab
  iso.box(u0, v0, u1, v1, 0, 40, CREAM, { rightC: lit(CREAM, 0.05) });
  // ribbon windows (long horizontal glazing bands) on the front
  for (const z of [12, 24] as const) {
    iso.r.poly([iso.P(u0 + 0.08, v1, z), iso.P(u1 - 0.08, v1, z), iso.P(u1 - 0.08, v1, z + 6), iso.P(u0 + 0.08, v1, z + 6)], alpha(COLORS.glassSky, 0.8));
    for (let i = 0; i <= 12; i++) {
      const u = u0 + 0.08 + ((u1 - u0 - 0.16) * i) / 12;
      iso.r.line(iso.P(u, v1, z), iso.P(u, v1, z + 6), 0.6 * RES, alpha(CREAM, 0.7));
    }
  }
  // a taller stair/lab tower at one end
  iso.box(u1 - 0.4, v0 + 0.1, u1, v0 + 0.5, 0, 66, CREAM, { rightC: lit(CREAM, 0.06) });
  iso.windowsRight(u1, v0 + 0.14, v0 + 0.48, 10, 60, 5, alpha(COLORS.glassSky, 0.8), CREAM);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 44, lighten(CREAM, 0.06), { ink: false });
  // a small rooftop research mast
  const [mx, myB] = iso.P(u0 + 0.4, v0 + 0.4, 44);
  iso.r.line([mx, myB], [mx, myB - 18 * RES], 1 * RES, COLORS.steel);
  return iso.build();
}

// --- 20. COLLEGE (AIT / MIT-WPU / Sinhgad / engineering campuses) — a grand
// institutional academic block: a symmetrical render building with a central
// pedimented/domed entrance bay, repeated arched windows + wings. 2×2. ------
function collegeTile(seed: number, domed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long academic block (two storeys) with set-back end wings
  iso.box(u0, v0, u1, v1, 0, 44, LATER, { rightC: lit(LATER, 0.05) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, LATER_D, { ink: false });
  // two storeys of arched windows
  archArcade(iso, v1, u0 + 0.08, u1 - 0.08, 8, 22, 6, 11, alpha(BASALT_D, 0.78));
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 26, 38, 11, alpha(COLORS.glassDark, 0.8), TEMPLE_W);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 44, 48, lighten(LATER, 0.08), { topC: top(LATER, 0.3) });
  tileRoof(iso, u0, v0, u1, v1, 48, 12);
  // the central entrance bay — taller, projecting
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.24, v1 - 0.04, gcx + 0.24, v1 + 0.06, 0, 58, lighten(LATER, 0.04), { rightC: lit(LATER, 0.06) });
  colonnadeFront(iso, gcx, v1 + 0.06);
  if (domed) {
    iso.box(gcx - 0.16, (v0 + v1) / 2 - 0.16, gcx + 0.16, (v0 + v1) / 2 + 0.16, 48, 58, TEMPLE_W);
    onionDome(iso, gcx, (v0 + v1) / 2, 58, 0.16, 26, DOMEWHITE);
  } else {
    // a clock pediment
    iso.r.poly([iso.P(gcx - 0.26, v1 + 0.06, 58), iso.P(gcx + 0.26, v1 + 0.06, 58), iso.P(gcx, v1 + 0.06, 70)], lit(LATER, 0.12));
    iso.r.polyline([iso.P(gcx - 0.26, v1 + 0.06, 58), iso.P(gcx, v1 + 0.06, 70), iso.P(gcx + 0.26, v1 + 0.06, 58)], INK_W * 0.7, INK);
  }
  return iso.build();
}

/** A little four-column entrance portico on a front bay. */
function colonnadeFront(iso: Iso, cu: number, v: number): void {
  for (let i = 0; i <= 4; i++) {
    const u = cu - 0.2 + (i * 0.4) / 4;
    iso.r.poly([iso.P(u - 0.014, v, 34), iso.P(u + 0.014, v, 34), iso.P(u + 0.014, v, 4), iso.P(u - 0.014, v, 4)], i % 2 ? COLORS.white : lit(COLORS.white, 0.08));
  }
}

// --- 21. HOSPITAL (Hardikar / ONP Leela / Deccan) — a modern multi-storey
// hospital: a clean render slab with a glazed stair-core, a rooftop helipad H
// and a red-cross sign, balconied ward floors. Tall 1×1. --------------------
function hospitalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const CLAD = hex('#e2dcd0');
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 92, CLAD, { leftC: shaded(CLAD, 0.14), rightC: lit(CLAD, 0.05) });
  // balconied ward floors (window bands) on the front
  for (let z = 12; z < 84; z += 11) {
    iso.r.poly([iso.P(u0 + 0.06, v1, z), iso.P(u1 - 0.06, v1, z), iso.P(u1 - 0.06, v1, z + 6), iso.P(u0 + 0.06, v1, z + 6)], alpha(COLORS.glassSky, 0.8));
    iso.r.line(iso.P(u0 + 0.06, v1, z), iso.P(u1 - 0.06, v1, z), 0.7 * RES, alpha(CLAD, 0.6));
  }
  // a glazed stair core on the right face
  iso.box(u1 - 0.18, v0 + 0.06, u1, v0 + 0.4, 0, 96, alpha(COLORS.glassSky, 0.8), { topC: alpha(COLORS.glassLit, 0.4) });
  // parapet + rooftop helipad
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 92, 96, lighten(CLAD, 0.06), { ink: false });
  const [hx, hyB] = iso.P((u0 + u1) / 2, (v0 + v1) / 2, 96);
  const HR = 0.18 * (CELL_W / 2);
  const disc: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    disc.push([hx + Math.cos(a) * HR, hyB + Math.sin(a) * HR * 0.5]);
  }
  iso.r.poly(disc, shaded(COLORS.concrete, 0.06));
  iso.r.polyline(disc, INK_W * 0.5, alpha(INK, 0.7), true);
  // the red cross emblem on the front parapet
  const [cx2, cy2] = iso.P((u0 + u1) / 2, v1, 88);
  iso.r.rect(cx2 - 1 * RES, cy2 - 3 * RES, cx2 + 1 * RES, cy2 + 3 * RES, hex('#d6442e'));
  iso.r.rect(cx2 - 3 * RES, cy2 - 1 * RES, cx2 + 3 * RES, cy2 + 1 * RES, hex('#d6442e'));
  return iso.build();
}

// --- 22. THORLA SHEIKH SALLA DARGAH — a Sufi shrine: a small white domed
// tomb-chamber with a green-and-white bulbous onion dome, cusped arches, a
// crescent finial + corner finials, and a low enclosure. 1×1. --------------
function dargahTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const GREEN = hex('#3f7d5a'); // the Sufi green
  const u0 = 0.18, u1 = 0.82, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a low enclosure wall
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 10, DOMEWHITE, { ink: false });
  // the white tomb chamber
  iso.box(u0, v0, u1, v1, 0, 40, DOMEWHITE, { leftC: shaded(DOMEWHITE, 0.12), rightC: lit(DOMEWHITE, 0.05) });
  // cusped arched openings (green-shadowed)
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 6, 26, 7, 3, alpha(GREEN, 0.7));
  // parapet + corner finials
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 44, lighten(DOMEWHITE, 0.06), { ink: false });
  for (const [cu, cv] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) {
    const [px, pyB] = iso.P(cu, cv, 44);
    iso.r.line([px, pyB], [px, pyB - 8 * RES], 1.4 * RES, GREEN);
    iso.r.poly([[px - 1.6 * RES, pyB - 8 * RES], [px + 1.6 * RES, pyB - 8 * RES], [px, pyB - 13 * RES]], GREEN);
  }
  // the big green-banded onion dome on a drum
  iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, 44, 54, lighten(DOMEWHITE, 0.04));
  onionDome(iso, (u0 + u1) / 2, (v0 + v1) / 2, 54, 0.2, 34, GREEN, { ribs: 5, crescent: true });
  return iso.build();
}

// --- 23. THEATRE (Bal Gandharva Ranga Mandir) — a 1960s civic theatre: a
// curved render auditorium drum with a tall glazed foyer, a fly-tower behind,
// and a marquee canopy. 2×2. ------------------------------------------------
function theatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const CLAD = hex('#d7c2a0');
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the curved auditorium body
  iso.box(u0 + 0.2, v0 + 0.2, u1, v1, 0, 46, CLAD, { rightC: lit(CLAD, 0.05) });
  // the taller fly-tower (stage house) behind
  iso.box(u0 + 0.4, v0, u1 - 0.3, v0 + 0.5, 0, 70, shaded(CLAD, 0.06));
  // a tall glazed foyer curtain across the front
  iso.box(u0, v1 - 0.3, u1 - 0.5, v1, 0, 40, alpha(COLORS.glassSky, 0.85), { topC: alpha(COLORS.glassLit, 0.4) });
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.54, 6, 36, 8, alpha(COLORS.glassLit, 0.55), COLORS.steel);
  // a cantilevered marquee canopy over the entrance
  iso.r.poly([iso.P(u0, v1 + 0.06, 22), iso.P(u1 - 0.5, v1 + 0.06, 22), iso.P(u1 - 0.54, v1, 26), iso.P(u0 - 0.04, v1, 26)], lit(COLORS.steel, 0.06));
  iso.box(u0 - 0.02, v0 + 0.18, u1 + 0.02, v1 + 0.02, 46, 50, lighten(CLAD, 0.06), { ink: false });
  // a vertical neon name-sign fin
  const [px, pyB] = iso.P(u0 + 0.1, v1 - 0.1, 40);
  iso.r.rect(px - 1.4 * RES, pyB - 26 * RES, px + 1.4 * RES, pyB, alpha(SAFFRON_HOT, 0.85));
  return iso.build();
}

// --- 24. ASHRAM / SAMADHI (Anandashram / Jangli Maharaj) — a serene white
// spiritual complex: a low pillared prayer-hall with a saffron-trimmed roof
// and a small central shikhara/dome over the samadhi. 1×1. ------------------
function ashramTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the white prayer hall
  iso.box(u0, v0, u1, v1, 0, 34, TEMPLE_W, { rightC: lit(TEMPLE_W, 0.05) });
  // a pillared verandah on the front
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.08 + ((u1 - u0 - 0.16) * i) / 5;
    iso.r.poly([iso.P(u - 0.02, v1, 28), iso.P(u + 0.02, v1, 28), iso.P(u + 0.02, v1, 4), iso.P(u - 0.02, v1, 4)], i % 2 ? COLORS.white : lit(COLORS.white, 0.06));
  }
  // a saffron-trimmed pent roof
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 34, 38, SAFFRON, { ink: false });
  tileRoof(iso, u0, v0, u1, v1, 38, 9);
  // a small shikhara over the samadhi shrine
  shikhara(iso, (u0 + u1) / 2, (v0 + v1) / 2, 38, 0.16, 56, SAFFRON_HOT);
  return iso.build();
}

// --- 25. COEP BOAT CLUB — the riverside heritage boat-club on the Mula-Mutha:
// a low colonial timber-and-stone pavilion with a deep pitched veranda roof,
// a flag, sitting at the water's edge with moored rowing sculls. 2×1. -------
function boatClubTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.2, v1 = 0.8;
  // a strip of river in front
  iso.r.poly([iso.P(u0 - 0.1, v1 + 0.16, 0), iso.P(u1 + 0.1, v1 + 0.16, 0), iso.P(u1 + 0.1, v1 + 0.02, 0), iso.P(u0 - 0.1, v1 + 0.02, 0)], alpha(COLORS.water, 0.9));
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // the timber-and-stone clubhouse
  iso.box(u0, v0, u1, v1, 0, 28, LATER, { rightC: lit(LATER, 0.05) });
  // a wraparound verandah with slim posts + arched openings
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 4, 20, 5, 9, alpha(TEAK_D, 0.8));
  // a deep pitched Mangalore-tile veranda roof oversailing
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 28, 31, TEAK_D, { ink: false });
  iso.gable(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.08, 31, 16, 'u', ROOFTILE, LATER);
  // a flagstaff
  const [fx, fyB] = iso.P(u0 + 0.2, v0 + 0.2, 47);
  iso.r.line([fx, fyB], [fx, fyB - 22 * RES], 1 * RES, COLORS.steel);
  iso.r.poly([[fx, fyB - 22 * RES], [fx + 10 * RES, fyB - 18 * RES], [fx, fyB - 14 * RES]], SAFFRON_HOT);
  // a moored rowing scull on the water
  const [bx, byB] = iso.P((u0 + u1) / 2, v1 + 0.12, 0);
  iso.r.poly([[bx - 12 * RES, byB], [bx + 12 * RES, byB], [bx + 9 * RES, byB - 2 * RES], [bx - 9 * RES, byB - 2 * RES]], TEAK_L);
  return iso.build();
}

// --- 26. NFAI / RADIO (National Film Archive / All India Radio) — a civic
// modernist block in cream render with a glazed entrance, and a tall lattice
// BROADCAST MAST beside it (the AIR transmitter / NFAI tower). 1×1 headroom.
function broadcastTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const CREAM = hex('#dcd3bd');
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the civic block
  iso.box(u0, v0, u1, v1, 0, 44, CREAM, { rightC: lit(CREAM, 0.05) });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 10, 38, 5, alpha(COLORS.glassSky, 0.8), CREAM);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 44, 47, lighten(CREAM, 0.06), { ink: false });
  // a tall guyed lattice mast rising beside the block
  const mu = u0 + 0.16, mv = v0 + 0.16;
  const [mx, myB] = iso.P(mu, mv, 47);
  const MH = 150 * RES;
  // the lattice (two converging rails + cross-braces)
  iso.r.line([mx - 3 * RES, myB], [mx, myB - MH], 1 * RES, COLORS.steelDark);
  iso.r.line([mx + 3 * RES, myB], [mx, myB - MH], 1 * RES, COLORS.steel);
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const y = myB - MH * t;
    const w = 3 * (1 - t) * RES;
    iso.r.line([mx - w, y], [mx + w, y], 0.6 * RES, alpha(COLORS.steel, 0.8));
  }
  // guy wires
  iso.r.line([mx, myB - MH * 0.7], iso.P(mu + 0.3, mv + 0.3, 0) as Pt, 0.5 * RES, alpha(COLORS.steelDark, 0.6));
  iso.r.line([mx, myB - MH * 0.7], iso.P(mu - 0.1, mv + 0.34, 0) as Pt, 0.5 * RES, alpha(COLORS.steelDark, 0.6));
  // the red aircraft beacon at the tip
  iso.r.poly([[mx - 1.4 * RES, myB - MH], [mx + 1.4 * RES, myB - MH], [mx, myB - MH - 4 * RES]], hex('#e8503a'));
  return iso.build();
}

// --- 27. MEMORIAL / WATCH TOWER (National War Memorial Southern Command /
// Taljai Watch Tower / generic civic memorial) — a tall slim stone tower /
// obelisk-pillar on a plinth, a flame/finial on top. Slim 1×1 headroom. -----
function memorialTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 160 });
  void seed;
  const ST = hex('#c2b594');
  const u = 0.5, v = 0.5, b = 0.12;
  iso.shadow(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 0.22, 0.24);
  // a broad stepped plinth
  iso.box(u - 0.3, v - 0.3, u + 0.3, v + 0.3, 0, 8, shaded(ST, 0.12), { ink: false });
  iso.box(u - 0.22, v - 0.22, u + 0.22, v + 0.22, 8, 16, ST);
  // a tall tapering pillar/obelisk
  iso.box(u - b, v - b, u + b, v + b, 16, 110, ST, { leftC: shaded(ST, 0.16), rightC: lit(ST, 0.05) });
  iso.box(u - b * 0.7, v - b * 0.7, u + b * 0.7, v + b * 0.7, 110, 128, ST);
  // an obelisk cap
  const apex = iso.P(u, v, 142);
  const c0 = iso.P(u - b * 0.7, v + b * 0.7, 128);
  const c1 = iso.P(u + b * 0.7, v + b * 0.7, 128);
  const c2 = iso.P(u + b * 0.7, v - b * 0.7, 128);
  iso.r.poly([c0, c1, apex], shaded(ST, 0.08));
  iso.r.poly([c1, c2, apex], lit(ST, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  // an eternal-flame finial
  const [fx, fyB] = apex;
  iso.r.poly([[fx - 2 * RES, fyB], [fx + 2 * RES, fyB], [fx, fyB - 7 * RES]], SAFFRON_HOT);
  iso.glint([fx, fyB - 3 * RES], 2 * RES);
  return iso.build();
}

// --- 28. PMPML / MSRTC BUS STAND & DEPOT — a long low transit shed: a flat
// canopy roof on columns over bus bays, a glazed terminal block, signage. A
// long 2×1 fabric-scale civic. ----------------------------------------------
function busStandTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 60 });
  void seed;
  const CLAD = hex('#cbbfa6');
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // a glazed terminal building at one end
  iso.box(u0, v0, u0 + 0.5, v1, 0, 38, CLAD, { rightC: lit(CLAD, 0.05) });
  iso.windowsLeft(v1, u0 + 0.04, u0 + 0.46, 6, 32, 4, alpha(COLORS.glassLit, 0.55), COLORS.steel);
  iso.box(u0 - 0.02, v0 - 0.02, u0 + 0.52, v1 + 0.02, 38, 41, lighten(CLAD, 0.06), { ink: false });
  // a long flat canopy roof on slim columns over the bus bays
  for (let i = 0; i <= 7; i++) {
    const u = u0 + 0.6 + ((u1 - u0 - 0.7) * i) / 7;
    iso.r.line(iso.P(u, v1 - 0.04, 0), iso.P(u, v1 - 0.04, 24), 1.4 * RES, shaded(COLORS.steel, 0.06));
    iso.r.line(iso.P(u, v0 + 0.1, 0), iso.P(u, v0 + 0.1, 24), 1.4 * RES, shaded(COLORS.steel, 0.06));
  }
  iso.box(u0 + 0.56, v0 + 0.06, u1, v1 - 0.02, 24, 28, COLORS.steel, { topC: lit(COLORS.steel, 0.08) });
  // a couple of bus hints under the canopy
  for (const cu of [u0 + 0.9, u1 - 0.4] as const) {
    const [bx, byB] = iso.P(cu, v1 - 0.2, 0);
    iso.r.rect(bx - 8 * RES, byB - 8 * RES, bx + 8 * RES, byB, alpha(SAFFRON, 0.85));
  }
  // a signage pylon
  const [px, pyB] = iso.P(u0 + 0.25, v0 + 0.2, 41);
  iso.r.rect(px - 1.4 * RES, pyB - 16 * RES, px + 1.4 * RES, pyB, alpha(COLORS.glassHot, 0.85));
  return iso.build();
}

// ============================================================================
// ROUND 2 — the push to 100. New bespoke silhouettes for Pune's full sweep:
// the Peshwa wadas + ghats of the old city, the temples of the seven hills,
// the colonial-Deccan civic stone of the Cantonment + Camp, the modern glass
// of the IT/township belt, the riverbanks, gardens and academia. Each is a
// hand-built iso silhouette (no archetype reuse) and earns its own light.
// ============================================================================

// --- PARVATI HILL (Devdeveshwar) — the Shiv-panchayatan temple complex atop
// Pune's holy hill, reached by the famous wide black-stone steps: a basalt
// summit platform carrying a CENTRAL shikhara ringed by FOUR smaller corner
// shrines (Surya/Ganesha/Vishnu/Bhavani), copper kalashas, the long stair
// climbing the green slope. 3×3 monster landform. -------------------------
function parvatiHillTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.1, u1 = 2.9, v0 = 0.1, v1 = 2.9;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  const HILL = hex('#7e7a50');
  // the hill: two broad green tiers
  iso.box(u0, v0, u1, v1, 0, 34, HILL, { leftC: shaded(HILL, 0.18), rightC: lit(HILL, 0.04), topC: shaded(HILL, 0.02) });
  iso.box(u0 + 0.6, v0 + 0.6, u1 - 0.6, v1 - 0.6, 34, 64, HILL, { leftC: shaded(HILL, 0.2), rightC: lit(HILL, 0.03) });
  // the wide ceremonial black-stone staircase climbing the front-left slope
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const u = u0 + 0.3 + t * 0.7;
    const vv = v1 - 0.3 - t * 0.7;
    const z = 4 + t * 56;
    iso.r.poly([iso.P(u, vv, z), iso.P(u + 0.16, vv, z), iso.P(u + 0.16, vv - 0.05, z + 3.5), iso.P(u, vv - 0.05, z + 3.5)], i % 2 ? BASALT_L : BASALT);
  }
  // the white summit platform
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.5, cy - 0.5, cx + 0.5, cy + 0.5, 64, 72, TEMPLE_W, { rightC: lit(TEMPLE_W, 0.05) });
  // four corner shrines in black stone, each a small shikhara (panchayatan)
  for (const [du, dv] of [[cx - 0.34, cy - 0.34], [cx + 0.34, cy - 0.34], [cx - 0.34, cy + 0.34], [cx + 0.34, cy + 0.34]] as const) {
    iso.box(du - 0.1, dv - 0.1, du + 0.1, dv + 0.1, 72, 84, BASALT, { rightC: BASALT_L });
    shikhara(iso, du, dv, 84, 0.1, 36, BASALT_L);
  }
  // the GREAT central Devdeveshwar shikhara in black stone, copper-kalash crowned
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 72, 90, BASALT, { rightC: BASALT_L });
  shikhara(iso, cx, cy, 90, 0.2, 96, BASALT_L);
  // a saffron temple flag beside the sanctum
  const [fx, fyB] = iso.P(cx + 0.4, cy - 0.4, 72);
  iso.r.line([fx, fyB], [fx, fyB - 44 * RES], 1.2 * RES, hex('#cfcabf'));
  iso.r.poly([[fx, fyB - 44 * RES], [fx + 16 * RES, fyB - 38 * RES], [fx, fyB - 30 * RES]], SAFFRON_HOT);
  return iso.build();
}

// --- A GHAT temple on the river: the riverside stepped-bathing-ghat shrines
// of the Mula-Mutha (Omkareshwar / the cremation & bathing ghats) — a saffron
// or stone temple with a shikhara standing over a broad flight of stone steps
// descending into a strip of water, deepmala lamp-pillars flanking. 2×2. ----
function ghatTempleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.2, v1 = 1.5;
  // a band of river along the front
  iso.r.poly([iso.P(u0 - 0.12, v1 + 0.34, 0), iso.P(u1 + 0.12, v1 + 0.34, 0), iso.P(u1 + 0.12, v1 + 0.04, 0), iso.P(u0 - 0.12, v1 + 0.04, 0)], alpha(COLORS.water, 0.92));
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the broad descending ghat steps down to the water
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const z = 22 - t * 22;
    const vv = v1 - 0.02 + t * 0.32;
    iso.r.poly([iso.P(u0, vv, z), iso.P(u1, vv, z), iso.P(u1, vv + 0.05, z - 3), iso.P(u0, vv + 0.05, z - 3)], i % 2 ? lighten(BASALT, 0.16) : BASALT_L);
  }
  // the temple platform + saffron shrine
  iso.box(u0 + 0.2, v0, u1 - 0.2, v1, 22, 30, BASALT, { rightC: lit(BASALT, 0.05) });
  iso.box(u0 + 0.34, v0 + 0.1, u1 - 0.34, v1 - 0.1, 30, 46, SAFFRON, { rightC: lit(SAFFRON, 0.06) });
  archArcade(iso, v1 - 0.1, u0 + 0.4, u1 - 0.4, 34, 44, 5, 3, alpha(TEAK_D, 0.85));
  shikhara(iso, (u0 + u1) / 2, (v0 + v1) / 2, 46, 0.2, 84, SAFFRON_HOT);
  // two deepmala lamp-pillars flanking the steps
  for (const du of [u0 + 0.1, u1 - 0.1] as const) {
    iso.box(du - 0.03, v1 - 0.04, du + 0.03, v1 + 0.02, 22, 60, BASALT, { rightC: BASALT_L });
    const [lx, ly] = iso.P(du, v1 - 0.01, 60);
    iso.r.poly([[lx - 3 * RES, ly], [lx + 3 * RES, ly], [lx, ly - 7 * RES]], GOLD_HOT);
    // little lamp-niches up the pillar
    for (let k = 1; k < 5; k++) iso.r.rect(lx - 1.4 * RES, ly + k * 8 * RES, lx + 1.4 * RES, ly + k * 8 * RES + 2 * RES, alpha(GOLD, 0.7));
  }
  return iso.build();
}

// --- A TWIN-TOWER GLASS COMPLEX (ICC Trade Tower, SB Road; Panchshil/EON twin
// blocks) — two slender mirror-glass office towers of unequal height linked by
// a low glazed podium, a sky-bridge between them. The corporate-Pune skyline
// motif. Tall 2×2 headroom. -------------------------------------------------
function twinTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 250 });
  void seed;
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the glazed link podium
  iso.box(u0, v0, u1, v1, 0, 30, GLASSIT_D, { topC: alpha(COLORS.glassLit, 0.4) });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 6, 26, 8, alpha(COLORS.glassLit, 0.5), COLORS.steel);
  // tower A (taller), front-left
  const aU = u0 + 0.42, aV = v1 - 0.42, ab = 0.26;
  iso.box(aU - ab, aV - ab, aU + ab, aV + ab, 30, 168, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.08), topC: alpha(COLORS.glassLit, 0.4) });
  // tower B (shorter), back-right
  const bU = u1 - 0.42, bV = v0 + 0.42, bb = 0.24;
  iso.box(bU - bb, bV - bb, bU + bb, bV + bb, 30, 128, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.08), topC: alpha(COLORS.glassLit, 0.4) });
  // floor-band glazing on both
  for (const [cu, cv, bb2, zt] of [[aU, aV, ab, 168], [bU, bV, bb, 128]] as const) {
    for (let z = 38; z < zt; z += 9) iso.r.line(iso.P(cu - bb2, cv + bb2, z), iso.P(cu + bb2, cv + bb2, z), 0.7 * RES, alpha(COLORS.glassLit, z % 27 < 9 ? 0.45 : 0.2));
  }
  // the sky-bridge between the two towers, high up
  iso.r.poly([iso.P(aU, aV - ab, 110), iso.P(bU, bV + bb, 110), iso.P(bU, bV + bb, 102), iso.P(aU, aV - ab, 102)], lit(COLORS.steel, 0.06));
  // slim crown masts
  for (const [cu, cv, zt] of [[aU, aV, 168], [bU, bV, 128]] as const) {
    const [tx, tyB] = iso.P(cu, cv, zt);
    iso.r.line([tx, tyB], [tx, tyB - 16 * RES], 1.1 * RES, COLORS.steel);
  }
  return iso.build();
}

// --- AMANORA / GATEWAY TOWERS — the tallest residential cluster in Pune
// (Hadapsar): three tapering high-rise apartment slabs of pale render + glass
// balconies, stepping in height, on a green podium. Tall 2×2 headroom. ------
function highriseClusterTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 250 });
  void seed;
  const CLAD = hex('#cdc3b4');
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // landscaped podium
  iso.box(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, 0, 12, shaded(COLORS.grass, 0.1), { ink: false });
  // three residential slabs at staggered positions + heights
  const slab = (cu: number, cv: number, bw: number, h: number): void => {
    iso.box(cu - bw, cv - bw, cu + bw, cv + bw, 12, h, CLAD, { leftC: shaded(CLAD, 0.16), rightC: lit(CLAD, 0.05) });
    // glass balcony bands down the front + right
    for (let z = 22; z < h - 4; z += 8) {
      iso.r.line(iso.P(cu - bw, cv + bw, z), iso.P(cu + bw, cv + bw, z), 0.8 * RES, alpha(COLORS.glassSky, 0.6));
      iso.r.line(iso.P(cu + bw, cv - bw, z), iso.P(cu + bw, cv + bw, z), 0.8 * RES, alpha(COLORS.glassSky, 0.5));
    }
    iso.box(cu - bw - 0.02, cv - bw - 0.02, cu + bw + 0.02, cv + bw + 0.02, h, h + 4, lighten(CLAD, 0.06), { ink: false });
  };
  slab(u0 + 0.4, v1 - 0.4, 0.22, 184); // tallest, front
  slab(u1 - 0.42, v0 + 0.42, 0.2, 150);
  slab(u1 - 0.46, v1 - 0.46, 0.18, 120);
  return iso.build();
}

// --- A TOWNSHIP CYBERTECH BLOCK (Magarpatta Cybercity / SEZ; Hinjawadi EON
// campus) — a low-rise but very long curved glass office curve wrapping a
// landscaped court, continuous ribbon glazing, a tree-lined forecourt. The
// "walk-to-work" township look. Broad 2×2. ---------------------------------
function cybercityTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.26, v1 = 1.74;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a long curved glass office curve (stepped boxes describing a crescent)
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const cv = v0 + 0.1 + t * 1.3;
    const off = Math.sin(t * Math.PI) * 0.3; // the crescent bow
    iso.box(u0 + off, cv, u0 + off + 0.5, cv + 0.26, 0, 44 - Math.abs(t - 0.5) * 14, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.07), topC: alpha(COLORS.glassLit, 0.35) });
  }
  // a second, taller block at the right
  iso.box(u1 - 0.6, v0 + 0.2, u1, v1 - 0.2, 0, 58, GLASSIT, { leftC: GLASSIT_D, rightC: lit(GLASSIT, 0.08), topC: alpha(COLORS.glassLit, 0.4) });
  for (let z = 12; z < 54; z += 8) iso.r.line(iso.P(u1 - 0.6, v1 - 0.2, z), iso.P(u1, v1 - 0.2, z), 0.7 * RES, alpha(COLORS.glassLit, 0.3));
  // a landscaped forecourt with a couple of trees
  iso.ball(u0 + 0.7, v1 - 0.1, 0.12, 24, hex('#5c8a4a'));
  iso.ball(u0 + 1.0, v1 - 0.05, 0.1, 20, hex('#5c8a4a'));
  return iso.build();
}

// --- COLONIAL GOTHIC CIVIC (SPPU main building / the Council Hall / GPO /
// District Court) — a grand British-Raj basalt-Gothic block: pointed-arch
// arcades, balustrades, a corner ITALIAN BELL TOWER (campanile) with a
// pyramid cap, gabled wings. The "Oxford of the East" idiom. 2×2. ----------
function gothicCivicTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 180 });
  void seed;
  const STONE = hex('#8a8270'); // weathered basalt-Gothic ashlar
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the long two-storey Gothic block
  iso.box(u0, v0, u1, v1, 0, 50, STONE, { leftC: shaded(STONE, 0.16), rightC: lit(STONE, 0.05) });
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(STONE, 0.2), { ink: false });
  // two storeys of pointed-arch arcades on the front
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 8, 24, 9, 10, alpha(BASALT_D, 0.8));
  archArcade(iso, v1, u0 + 0.08, u1 - 0.08, 28, 42, 7, 10, alpha(BASALT_D, 0.72));
  // gabled bays breaking the eaves
  for (const gu of [u0 + 0.4, u1 - 0.4] as const) {
    iso.gable(gu - 0.2, v1 - 0.04, gu + 0.2, v1 + 0.04, 50, 14, 'v', STONE, STONE);
  }
  // balustraded parapet between the gables
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 50, 54, lighten(STONE, 0.06), { ink: false });
  battlement(iso, u0, v0, u1, v1, 54, STONE);
  // the tall corner ITALIAN BELL TOWER (campanile) with louvred belfry + pyramid cap
  const tu = u1 - 0.16, tv = v1 - 0.12;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.08, 0, 110, STONE, { leftC: shaded(STONE, 0.16), rightC: lit(STONE, 0.06) });
  // louvred belfry openings near the top
  for (const z of [88, 96] as const) {
    iso.r.poly([iso.P(tu - 0.1, tv + 0.08, z), iso.P(tu + 0.1, tv + 0.08, z), iso.P(tu + 0.1, tv + 0.08, z + 6), iso.P(tu - 0.1, tv + 0.08, z + 6)], alpha(BASALT_D, 0.85));
  }
  iso.box(tu - 0.17, tv - 0.17, tu + 0.17, tv + 0.09, 110, 116, lighten(STONE, 0.06));
  iso.hip(tu - 0.17, tv - 0.17, tu + 0.17, tv + 0.09, 116, 30, BASALT);
  return iso.build();
}

// --- THE PYRAMID AUDITORIUM (Osho International, Koregaon Park) — Hafeez
// Contractor's black-marble-clad PYRAMID housing the meditation auditorium, set
// in a bamboo garden with a reflecting black pool. Stark, modern, geometric.
// 2×2. ---------------------------------------------------------------------
function pyramidHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const MARBLE = hex('#36333b'); // polished black marble
  const u0 = 0.24, u1 = 1.76, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.26);
  // a black reflecting pool plinth
  iso.box(u0 - 0.14, v0 - 0.14, u1 + 0.14, v1 + 0.14, 0, 5, hex('#23222a'), { ink: false });
  // a low base course
  iso.box(u0, v0, u1, v1, 5, 16, MARBLE, { leftC: shaded(MARBLE, 0.12), rightC: lit(MARBLE, 0.06) });
  // the great pyramid (two visible faces) rising from the base
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  const apex = iso.P(cx, cy, 116);
  const c0 = iso.P(u0, v1, 16);
  const c1 = iso.P(u1, v1, 16);
  const c2 = iso.P(u1, v0, 16);
  iso.r.poly([c0, c1, apex], shaded(MARBLE, 0.08)); // left face
  iso.r.poly([c1, c2, apex], lit(MARBLE, 0.05)); // right face
  // crisp marble-panel seams up the faces
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    iso.r.line([c0[0] + (apex[0] - c0[0]) * t, c0[1] + (apex[1] - c0[1]) * t], [c1[0] + (apex[0] - c1[0]) * t, c1[1] + (apex[1] - c1[1]) * t], 0.6 * RES, alpha(lighten(MARBLE, 0.18), 0.6));
    iso.r.line([c1[0] + (apex[0] - c1[0]) * t, c1[1] + (apex[1] - c1[1]) * t], [c2[0] + (apex[0] - c2[0]) * t, c2[1] + (apex[1] - c2[1]) * t], 0.6 * RES, alpha(lighten(MARBLE, 0.12), 0.5));
  }
  iso.r.polyline([c0, apex, c2], INK_W, INK);
  iso.r.line(c0, c1, INK_W, INK);
  iso.r.line(c1, c2, INK_W, INK);
  // a lit glass entrance slot at the base front
  iso.r.poly([iso.P(cx - 0.16, v1, 6), iso.P(cx + 0.16, v1, 6), iso.P(cx + 0.16, v1, 16), iso.P(cx - 0.16, v1, 16)], alpha(COLORS.glassLit, 0.6));
  // a glint at the apex
  iso.glint(apex, 2.4 * RES);
  return iso.build();
}

// --- A CARVED-TEAK WADA (the smaller Peshwa-era mansions: Nana Wada, Naro-
// shankar, Moroba Dada, the peths' courtyard houses) — a compact two-storey
// lime-render-and-teak house: a deep carved-wood balcony (sajja) on brackets,
// a tiled roof, a central nagarkhana arch. Distinct from Vishrambaug by its
// COURTYARD massing + corner tower. 2×2. -----------------------------------
function wadaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  // seed-varied render tone (lime/laterite/ochre wash) for each wada
  const REN = jcol(seed, 1, jit(seed, 9) > 0.5 ? LATER : hex('#c2a874'), 0.1);
  const u0 = 0.22, u1 = 1.78, v0 = 0.32, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // two render wings around a courtyard gap (an L of building)
  iso.box(u0, v0, u1, v0 + 0.6, 0, 44, REN, { rightC: lit(REN, 0.05) }); // back wing
  iso.box(u0, v0, u0 + 0.6, v1, 0, 44, REN, { rightC: lit(REN, 0.05) }); // left wing
  iso.box(u1 - 0.5, v0 + 0.4, u1, v1, 0, 40, lighten(REN, 0.03)); // short front-right wing
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 9, LATER_D, { ink: false });
  // the carved-teak first-floor balcony along the front (v1) of the left wing
  iso.box(u0 + 0.02, v1 - 0.06, u0 + 0.6, v1 + 0.08, 24, 42, TEAK, { rightC: lit(TEAK, 0.06) });
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.08 + (i * 0.46) / 5;
    const a = iso.P(u, v1 + 0.08, 24);
    iso.r.poly([[a[0], a[1]], [a[0] + 3 * RES, a[1] + 3 * RES], [a[0], a[1] + 6 * RES]], TEAK_D);
  }
  iso.windowsLeft(v1 + 0.08, u0 + 0.06, u0 + 0.58, 28, 40, 5, alpha(GOLD, 0.5), TEAK_L);
  // a small central nagarkhana arch (gateway) on the courtyard front-right wing
  const gcx = u1 - 0.25;
  const poly: Pt[] = [iso.P(gcx - 0.12, v1, 6), iso.P(gcx - 0.12, v1, 28)];
  for (let j = 0; j <= 6; j++) {
    const t = j / 6;
    poly.push(iso.P(gcx - 0.12 + 0.24 * t, v1, 28 + Math.sin(t * Math.PI) * 10));
  }
  poly.push(iso.P(gcx + 0.12, v1, 28), iso.P(gcx + 0.12, v1, 6));
  iso.r.poly(poly, TEAK_D);
  iso.r.polyline(poly, INK_W * 0.6, INK);
  // tiled hip roofs on the wings
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v0 + 0.64, 44, 48, TEAK_D, { ink: false });
  tileRoof(iso, u0 - 0.02, v0 - 0.02, u1 + 0.02, v0 + 0.62, 48, 12);
  tileRoof(iso, u0 - 0.02, v0 + 0.6, u0 + 0.62, v1 + 0.02, 48, 12);
  // a small corner watch-kiosk
  chhatri(iso, u1 - 0.12, v0 + 0.12, 48, 0.1, DOMEWHITE);
  return iso.build();
}

// --- A PESHWA / DECCAN TEMPLE with a SABHA-MANDAP + DEEPMALA (the city's many
// peth temples: Trishund Ganpati, Omkareshwar, Kasba Ganpati the gramadaivat,
// Tulsibaug Ram Mandir, Nageshwar, Tambdi Jogeshwari) — a saffron/stone temple
// with a pillared open hall, a tiered shikhara, and a tall stone DEEPMALA
// lamp-tower out front. 1×1 headroom. The everyday Pune temple silhouette. --
function pethTempleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 170 });
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  // seed-varied palette + height so each peth temple reads distinct
  const body = jit(seed, 1) > 0.55 ? jcol(seed, 2, SAFFRON, 0.12) : jcol(seed, 2, LATER, 0.1);
  const spireH = jrange(seed, 3, 78, 104);
  const spireCol = jit(seed, 4) > 0.5 ? SAFFRON_HOT : jcol(seed, 5, GOLD, 0.08);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.24);
  // the sabha-mandap (pillared hall)
  iso.box(u0, v0, u1, v1, 0, 28, body, { leftC: shaded(body, 0.14), rightC: lit(body, 0.06) });
  // an open pillared porch on the front
  for (let i = 0; i <= 4; i++) {
    const u = u0 + 0.08 + ((u1 - u0 - 0.16) * i) / 4;
    iso.r.poly([iso.P(u - 0.02, v1, 24), iso.P(u + 0.02, v1, 24), iso.P(u + 0.02, v1, 4), iso.P(u - 0.02, v1, 4)], i % 2 ? GOLD : GOLD_HOT);
  }
  // entablature + a short tiered antarala
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 28, 34, GOLD, { topC: top(GOLD, 0.2) });
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.02;
  iso.box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, 34, 42, TEMPLE_W);
  // the shikhara over the sanctum (seed-varied height + colour)
  shikhara(iso, cx, cy, 42, 0.18, spireH, spireCol);
  // a tall stone deepmala (lamp pillar) standing out front-left
  const du = u0 + 0.06, dv = v1 + 0.0;
  iso.box(du - 0.025, dv - 0.025, du + 0.025, dv + 0.025, 0, 70, BASALT, { rightC: BASALT_L });
  const [lx, ly] = iso.P(du, dv, 70);
  iso.r.poly([[lx - 3 * RES, ly], [lx + 3 * RES, ly], [lx, ly - 7 * RES]], GOLD_HOT);
  for (let k = 1; k < 6; k++) iso.r.rect(lx - 1.6 * RES, ly + k * 9 * RES, lx + 1.6 * RES, ly + k * 9 * RES + 2 * RES, alpha(GOLD, 0.7));
  return iso.build();
}

// --- A DECCAN CANTONMENT BUNGALOW / CLUB (the Camp & Cantonment heritage:
// the Poona Club, Boat Club, Royal Connaught Boat Club, the gymkhanas, the
// old churches' rectories) — a long low colonial bungalow: a deep pitched
// Mangalore-tile roof, a pillared monkey-top verandah, dormers, chimneys. The
// leafy Cantonment idiom. 2×1. ---------------------------------------------
function bungalowTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 70 });
  // seed-varied render + roof tint + body height
  const CLAD = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#ddcfae') : hex('#d6c6a0'), 0.1);
  const bH = jrange(seed, 2, 22, 30);
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // the render body
  iso.box(u0, v0, u1, v1, 0, bH, CLAD, { rightC: lit(CLAD, 0.05) });
  // a pillared verandah with arched openings along the front
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 4, Math.min(20, bH - 2), 5, 9, alpha(TEAK_D, 0.8));
  // a deep oversailing pitched Mangalore-tile roof
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.08, bH, bH + 3, TEAK_D, { ink: false });
  iso.gable(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.1, bH + 3, 18, 'u', ROOFTILE, CLAD);
  // two dormer windows in the roof + a chimney
  for (const du of [u0 + 0.5, u1 - 0.6] as const) {
    const [dx, dy] = iso.P(du, (v0 + v1) / 2, bH + 12);
    iso.r.poly([[dx - 4 * RES, dy], [dx + 4 * RES, dy], [dx + 4 * RES, dy - 6 * RES], [dx, dy - 10 * RES], [dx - 4 * RES, dy - 6 * RES]], lit(CLAD, 0.04));
    iso.r.rect(dx - 2 * RES, dy - 5 * RES, dx + 2 * RES, dy - 1 * RES, alpha(COLORS.glassLit, 0.45));
  }
  iso.box(u0 + 0.2, v0 + 0.1, u0 + 0.28, v0 + 0.18, bH + 12, bH + 24, BRICKR, { rightC: lit(BRICKR, 0.05) });
  return iso.build();
}

// --- A COLONIAL CHURCH (St Mary's / St Patrick's Cathedral / All Saints' —
// the Camp's English churches) — a stone Gothic-Revival church: a nave with
// lancet windows, a steep pitched roof, and a tall front BELL TOWER with a
// pointed broach spire + a cross. 2×2 headroom. ----------------------------
function churchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  // seed-varied stone tone + spire height per church
  const STONE = jit(seed, 9) > 0.5 ? jcol(seed, 1, hex('#b7ac92'), 0.1) : jcol(seed, 1, BRICKR, 0.08);
  const spireTop = jrange(seed, 2, 138, 162);
  const u0 = 0.3, u1 = 1.7, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the nave
  iso.box(u0, v0, u1, v1 - 0.18, 0, 44, STONE, { leftC: shaded(STONE, 0.16), rightC: lit(STONE, 0.05) });
  iso.gable(u0, v0, u1, v1 - 0.18, 44, 22, 'v', STONE, STONE);
  // lancet windows down the flank
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.1 + i * 0.3;
    iso.r.poly([iso.P(u, v1 - 0.18, 10), iso.P(u + 0.06, v1 - 0.18, 10), iso.P(u + 0.06, v1 - 0.18, 28), iso.P(u + 0.03, v1 - 0.18, 36), iso.P(u, v1 - 0.18, 28)], alpha(BASALT_D, 0.85));
  }
  // the front bell tower with a tall broach spire + a cross
  const tu = u0 + 0.24, tv = v1 - 0.1;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.06, 0, 92, STONE, { rightC: lit(STONE, 0.06) });
  // belfry louvres + a small rose window
  for (const sx of [-1, 1] as const) iso.r.poly([iso.P(tu + sx * 0.06, tv + 0.06, 70), iso.P(tu + sx * 0.06 + 0.04, tv + 0.06, 70), iso.P(tu + sx * 0.06 + 0.04, tv + 0.06, 82), iso.P(tu + sx * 0.06, tv + 0.06, 82)], alpha(BASALT_D, 0.8));
  const apex = iso.P(tu, tv - 0.04, spireTop);
  const cc0 = iso.P(tu - 0.16, tv + 0.06, 92);
  const cc1 = iso.P(tu + 0.16, tv + 0.06, 92);
  const cc2 = iso.P(tu + 0.16, tv - 0.16, 92);
  iso.r.poly([cc0, cc1, apex], shaded(BASALT, 0.06));
  iso.r.poly([cc1, cc2, apex], lit(BASALT, 0.06));
  iso.r.polyline([cc0, apex, cc2], INK_W * 0.7, INK);
  // the cross finial
  const [fx, fyB] = apex;
  iso.r.line([fx, fyB], [fx, fyB - 8 * RES], 1.2 * RES, GOLD_HOT);
  iso.r.line([fx - 2.6 * RES, fyB - 5.5 * RES], [fx + 2.6 * RES, fyB - 5.5 * RES], 1.2 * RES, GOLD_HOT);
  return iso.build();
}

// --- A MODERN STADIUM / SPORTS ARENA (MCA Gahunje cricket stadium; Balewadi
// Shree Shiv Chhatrapati sports complex; the Nehru / PYC grounds) — a big
// elliptical bowl with a swooping cantilever roof canopy on masts + floodlight
// pylons, the green pitch glowing within. Broad 3×2. -----------------------
function stadiumBowlTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const CLAD = hex('#c4bca8');
  const cx = 1.5, cy = 1.0;
  iso.shadow(0.2, 0.3, 2.8, 1.7, 0.24, 0.22);
  // the elliptical bowl wall (a ring of raked stands)
  const RX = 1.2 * (CELL_W / 2), RY = 0.7 * (CELL_W / 2);
  const [bx, byB] = iso.P(cx, cy, 0);
  const ring = (z: number, s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([bx + Math.cos(a) * RX * s, byB - z * RES + Math.sin(a) * RY * s]);
    }
    return pts;
  };
  iso.r.poly([...ring(0, 1), ...ring(34, 0.82).reverse()], CLAD, shaded(CLAD, 0.14));
  // the green pitch inside (glowing)
  iso.r.poly(ring(34, 0.82), shaded(COLORS.grass, 0.06));
  iso.r.polyline(ring(0, 1).slice(0, 15), INK_W * 0.7, INK);
  iso.r.polyline(ring(34, 0.82), INK_W * 0.5, alpha(INK, 0.7), true);
  // a swooping translucent cantilever roof canopy ringing the rim
  iso.r.poly([...ring(34, 0.82), ...ring(48, 1.06).reverse()], alpha(COLORS.glassSky, 0.5));
  iso.r.polyline(ring(48, 1.06), INK_W * 0.4, alpha(COLORS.steel, 0.7), true);
  // four floodlight pylons at the corners
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const px = bx + Math.cos(a) * RX * 1.1;
    const py = byB + Math.sin(a) * RY * 1.1;
    iso.r.line([px, py], [px, py - 56 * RES], 1.6 * RES, COLORS.steelDark);
    iso.r.rect(px - 5 * RES, py - 62 * RES, px + 5 * RES, py - 56 * RES, alpha(GOLD_HOT, 0.85));
  }
  return iso.build();
}

// --- A RIVER BRIDGE (the Mula-Mutha crossings: Wellesley/Sangam Bridge,
// Bund Garden Bridge, Z Bridge, Lakdi Pul, Shivaji Bridge) — a multi-arch
// stone/iron road bridge spanning a band of water, lamp standards along the
// parapet. Long 3×1 over water. --------------------------------------------
function bridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 1, { swAnchor: true, headroom: 60 });
  void seed;
  const STONE = hex('#9a8f78');
  const u0 = 0.1, u1 = 2.9, v0 = 0.3, v1 = 0.7;
  // the river band the bridge spans
  iso.r.poly([iso.P(u0 - 0.1, v1 + 0.28, 0), iso.P(u1 + 0.1, v1 + 0.28, 0), iso.P(u1 + 0.1, v0 - 0.24, 0), iso.P(u0 - 0.1, v0 - 0.24, 0)], alpha(COLORS.water, 0.92));
  // the bridge deck
  iso.box(u0, v0, u1, v1, 18, 26, STONE, { leftC: shaded(STONE, 0.14), rightC: lit(STONE, 0.05) });
  // the arches under the deck (on the front face v1)
  const arches = 5;
  for (let i = 0; i < arches; i++) {
    const u0a = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / arches;
    const u1a = u0 + 0.1 + ((u1 - u0 - 0.2) * (i + 1)) / arches - 0.08;
    const poly: Pt[] = [iso.P(u0a, v1, 0), iso.P(u0a, v1, 10)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      poly.push(iso.P(u0a + (u1a - u0a) * t, v1, 10 + Math.sin(t * Math.PI) * 8));
    }
    poly.push(iso.P(u1a, v1, 10), iso.P(u1a, v1, 0));
    iso.r.poly(poly, shaded(STONE, 0.1));
    iso.r.polyline(poly, INK_W * 0.5, alpha(INK, 0.7));
    // pier between arches
    iso.r.poly([iso.P(u1a, v1, 0), iso.P(u1a + 0.06, v1, 0), iso.P(u1a + 0.06, v1, 18), iso.P(u1a, v1, 18)], shaded(STONE, 0.16));
  }
  // a parapet + lamp standards along the deck
  iso.box(u0, v1 - 0.02, u1, v1 + 0.02, 26, 30, lighten(STONE, 0.06), { ink: false });
  for (let i = 0; i <= 6; i++) {
    const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 6;
    const [px, pyB] = iso.P(u, v1, 30);
    iso.r.line([px, pyB], [px, pyB - 12 * RES], 1 * RES, COLORS.steelDark);
    iso.r.poly([[px - 1.8 * RES, pyB - 12 * RES], [px + 1.8 * RES, pyB - 12 * RES], [px, pyB - 15 * RES]], alpha(GOLD_HOT, 0.85));
  }
  return iso.build();
}

// --- A FORMAL GARDEN PAVILION / BOTANICAL GLASSHOUSE (Empress Botanical /
// Saras Baug island temple grounds / Bund Garden / Peshwe Park / Sambhaji
// Park) — a Victorian iron-and-glass garden glasshouse with a curved ridge +
// a little ornamental bandstand, set in lawns with palms. 2×2. -------------
function gardenPavilionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.2, u1 = 1.8, v0 = 0.3, v1 = 1.7;
  // a green lawn plinth
  iso.box(u0 - 0.16, v0 - 0.16, u1 + 0.16, v1 + 0.16, 0, 4, shaded(COLORS.grass, 0.1), { ink: false });
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the glasshouse body (iron frame + glass)
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.1, v1 - 0.1, 4, 32, alpha(COLORS.glassSky, 0.7), { topC: alpha(COLORS.glassLit, 0.4) });
  // an arched-roof barrel-vault ridge of glass
  const gv = (v0 + 0.3 + v1 - 0.1) / 2;
  for (let i = 0; i <= 12; i++) {
    const u = u0 + 0.34 + ((u1 - u0 - 0.5) * i) / 12;
    const [bx, by] = iso.P(u, gv, 32);
    iso.r.line([bx, by], [bx, by - 12 * RES], 0.8 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : alpha(COLORS.steel, 0.8));
  }
  const [rgx0, rgy0] = iso.P(u0 + 0.34, gv, 32);
  const [rgx1] = iso.P(u1 - 0.16, gv, 32);
  iso.r.line([rgx0, rgy0 - 12 * RES], [rgx1, rgy0 - 12 * RES], 1.4 * RES, lit(COLORS.steel, 0.08));
  // an ornamental bandstand (a little domed kiosk) front-left
  const bu = u0 + 0.34, bv = v1 - 0.26;
  for (const [sx, sy] of [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]] as const) {
    const px = bu + sx * 0.12, py = bv + sy * 0.12;
    iso.r.line(iso.P(px, py, 0), iso.P(px, py, 16), 1.1 * RES, COLORS.steel);
  }
  onionDome(iso, bu, bv, 16, 0.14, 14, DOMEWHITE);
  // palms on the lawn
  for (const [pu, pv] of [[u1 - 0.16, v1 - 0.1], [u1 - 0.06, v0 + 0.4]] as const) {
    iso.cone(pu, pv, 0.08, 26, hex('#4f7a44'));
  }
  return iso.build();
}

// --- A MODERN UNIVERSITY / INSTITUTE TOWER (Symbiosis SIU; FLAME; the new
// glassy academic campuses; Gokhale Institute; Fergusson's newer blocks) — a
// crisp contemporary academic block: a render-and-glass mass with a glazed
// double-height entrance atrium, brise-soleil fins, and a feature stair-tower.
// Tall 1×1. ----------------------------------------------------------------
function modernCampusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  // seed-varied render tone + block height per campus
  const CLAD = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#d6cdbb') : hex('#cdc4b1'), 0.1);
  const bH = jrange(seed, 2, 66, 84);
  const u0 = 0.12, u1 = 0.88, v0 = 0.12, v1 = 0.88;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the academic block
  iso.box(u0, v0, u1, v1, 0, bH, CLAD, { leftC: shaded(CLAD, 0.16), rightC: lit(CLAD, 0.05) });
  // a double-height glazed entrance atrium on the front
  iso.box(u0 + 0.16, v1 - 0.06, u1 - 0.16, v1, 0, 36, alpha(COLORS.glassSky, 0.8), { topC: alpha(COLORS.glassLit, 0.4) });
  // brise-soleil horizontal fins up the front
  for (let z = 12; z < bH - 4; z += 10) iso.r.line(iso.P(u0 + 0.06, v1, z), iso.P(u1 - 0.06, v1, z), 0.9 * RES, alpha(COLORS.steel, 0.7));
  // a feature stair-tower glazed on the right
  iso.box(u1 - 0.16, v0 + 0.06, u1, v0 + 0.4, 0, bH + 12, alpha(COLORS.glassSky, 0.8), { topC: alpha(COLORS.glassLit, 0.4) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, bH, bH + 4, lighten(CLAD, 0.06), { ink: false });
  // a rooftop logo pylon
  const [px, pyB] = iso.P(u0 + 0.3, v0 + 0.3, bH + 4);
  iso.r.line([px, pyB], [px, pyB - 18 * RES], 1.4 * RES, COLORS.steelDark);
  iso.r.rect(px - 4 * RES, pyB - 18 * RES, px + 4 * RES, pyB - 10 * RES, alpha(COLORS.glassHot, 0.85));
  return iso.build();
}

// --- A SAMADHI / VRINDAVAN MEMORIAL SHRINE (the saints' samadhis: Dnyaneshwar
// link-shrines, Tukaram-related, the math/mutts, Nana Phadnavis-era cenotaphs)
// — a small white domed memorial chamber on a stepped plinth with a tulsi-
// vrindavan, cusped niches, a kalash + saffron pennant. 1×1. ----------------
function samadhiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  // seed-varied dome height + tint so each samadhi reads distinct
  const domeH = jrange(seed, 1, 22, 32);
  const domeCol = jit(seed, 2) > 0.5 ? DOMEWHITE : jcol(seed, 3, hex('#e4dcc8'), 0.08);
  const u0 = 0.18, u1 = 0.82, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a stepped plinth
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 8, shaded(TEMPLE_W, 0.1), { ink: false });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 8, 14, lighten(TEMPLE_W, 0.04), { ink: false });
  // the white domed chamber
  iso.box(u0, v0, u1, v1, 14, 42, TEMPLE_W, { leftC: shaded(TEMPLE_W, 0.12), rightC: lit(TEMPLE_W, 0.05) });
  // cusped niche arches on the front
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 18, 36, 6, 3, alpha(SAFFRON, 0.5));
  // parapet + corner kalash finials
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 42, 46, lighten(TEMPLE_W, 0.06), { ink: false });
  for (const [cu, cv] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) kalash(iso, ...(iso.P(cu, cv, 46) as Pt) as [number, number], 0.6);
  // the central dome (seed-varied)
  onionDome(iso, (u0 + u1) / 2, (v0 + v1) / 2, 46, 0.2, domeH, domeCol);
  // a little tulsi-vrindavan planter out front
  iso.box(u0 + 0.34, v1 + 0.04, u0 + 0.46, v1 + 0.14, 14, 24, SAFFRON, { rightC: lit(SAFFRON, 0.06) });
  return iso.build();
}

// --- A CINEMA / MULTIPLEX (the city's deco & modern halls: Vijay/Prabhat/
// Alka talkies, the E-Square, the City Pride / Mangala / Victory cinemas) — a
// streamline-modern picture-house: a curved render facade with a tall fluted
// neon name-fin, a marquee canopy + poster bays, porthole windows. 2×1. -----
function cinemaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 90 });
  // seed-varied facade tone + neon-fin colour per picture-house
  const CLAD = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#d8c19c') : hex('#cfb791'), 0.1);
  const neon = [hex('#d6442e'), hex('#2e7bd6'), hex('#d68a2e')][Math.floor(jit(seed, 2) * 3)] ?? hex('#d6442e');
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // the streamline body
  iso.box(u0, v0, u1, v1, 0, 42, CLAD, { rightC: lit(CLAD, 0.05) });
  // streamline speed-lines across the front
  for (const z of [16, 20, 24] as const) iso.r.line(iso.P(u0 + 0.06, v1, z), iso.P(u1 - 0.4, v1, z), 0.8 * RES, alpha(shaded(CLAD, 0.2), 0.7));
  // porthole windows
  for (const u of [u0 + 0.3, u0 + 0.5] as const) {
    const [px, py] = iso.P(u, v1, 30);
    iso.r.line([px - 3 * RES, py], [px + 3 * RES, py], 4 * RES, alpha(COLORS.glassLit, 0.4));
  }
  // a marquee canopy over the entrance
  iso.r.poly([iso.P(u0, v1 + 0.06, 14), iso.P(u1 - 0.4, v1 + 0.06, 14), iso.P(u1 - 0.44, v1, 18), iso.P(u0 - 0.04, v1, 18)], lit(COLORS.steel, 0.06));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 42, 46, lighten(CLAD, 0.06), { ink: false });
  // a tall fluted NEON NAME-FIN at the right corner
  const [fx, fyB] = iso.P(u1 - 0.08, v1 - 0.08, 0);
  iso.r.rect(fx - 2.4 * RES, fyB - 64 * RES, fx + 2.4 * RES, fyB, alpha(neon, 0.5));
  for (let z = 6; z < 60; z += 7) iso.r.line([fx - 2.4 * RES, fyB - z * RES], [fx + 2.4 * RES, fyB - z * RES], 1 * RES, alpha(GOLD_HOT, 0.9));
  return iso.build();
}

// --- A WHOLESALE MARKET / MANDI (Market Yard / Gultekdi APMC; the grain & veg
// wholesale halls; Juna Bazaar) — long repetitive market sheds with saw-tooth
// north-light glazed roofs, open arcaded fronts, a tall water-tank + signage.
// Broad 2×2. ---------------------------------------------------------------
function marketYardTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const CLAD = hex('#c9bca0');
  const u0 = 0.16, u1 = 1.84, v0 = 0.26, v1 = 1.74;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // three long parallel market sheds
  for (let s = 0; s < 3; s++) {
    const cv0 = v0 + 0.1 + s * 0.5;
    iso.box(u0, cv0, u1, cv0 + 0.34, 0, 24, CLAD, { rightC: lit(CLAD, 0.05) });
    // saw-tooth north-light glazing on each shed
    for (let i = 0; i <= 6; i++) {
      const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 6;
      iso.r.poly([iso.P(u, cv0 + 0.17, 24), iso.P(u + 0.1, cv0 + 0.17, 24), iso.P(u + 0.1, cv0 + 0.17, 32), iso.P(u, cv0 + 0.17, 30)], alpha(COLORS.glassSky, 0.6));
    }
    // arched open fronts
    archArcade(iso, cv0 + 0.34, u0 + 0.06, u1 - 0.06, 4, 18, 5, 8, alpha(BASALT_D, 0.75));
  }
  // a tall elevated water tank at the corner
  const tu = u1 - 0.16, tv = v0 + 0.16;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const px = tu + sx * 0.08, py = tv + sy * 0.08;
    iso.r.line(iso.P(px, py, 0), iso.P(px, py, 46), 1.4 * RES, COLORS.steelDark);
  }
  iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 46, 62, hex('#9aa0a6'), { rightC: lit(hex('#9aa0a6'), 0.06) });
  iso.hip(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 62, 8, hex('#7d8288'));
  return iso.build();
}

// --- A LAKE / DAM WATERWORKS (Khadakwasla dam wall; Panshet; Pashan/Katraj
// lakes; the waterworks) — a long curved masonry dam wall holding back a sheet
// of water, sluice gates, a valve-tower, the spillway. Long 3×1. -----------
function damTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 1, { swAnchor: true, headroom: 60 });
  void seed;
  const STONE = hex('#8d8675');
  const u0 = 0.1, u1 = 2.9, v0 = 0.3, v1 = 0.7;
  // the reservoir behind (a big band of water at the back)
  iso.r.poly([iso.P(u0 - 0.1, v0 - 0.24, 0), iso.P(u1 + 0.1, v0 - 0.24, 0), iso.P(u1 + 0.1, v0 + 0.02, 0), iso.P(u0 - 0.1, v0 + 0.02, 0)], alpha(COLORS.water, 0.92));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the battered (sloping) dam wall
  iso.box(u0, v0, u1, v1, 0, 34, STONE, { leftC: shaded(STONE, 0.16), rightC: lit(STONE, 0.05) });
  iso.box(u0 - 0.04, v1 - 0.04, u1 + 0.04, v1 + 0.06, 0, 10, shaded(STONE, 0.2), { ink: false });
  // sluice gates along the front face
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 6;
    iso.r.poly([iso.P(u, v1, 6), iso.P(u + 0.18, v1, 6), iso.P(u + 0.18, v1, 26), iso.P(u, v1, 26)], shaded(STONE, 0.1));
    iso.r.poly([iso.P(u + 0.02, v1, 8), iso.P(u + 0.16, v1, 8), iso.P(u + 0.16, v1, 24), iso.P(u + 0.02, v1, 24)], hex('#6b5e44'));
  }
  // the road parapet on top + lamp posts
  iso.box(u0, v0, u1, v0 + 0.06, 34, 38, lighten(STONE, 0.06), { ink: false });
  // a valve / control tower mid-wall
  const tu = (u0 + u1) / 2;
  iso.box(tu - 0.1, v0 + 0.06, tu + 0.1, v0 + 0.24, 34, 60, STONE, { rightC: lit(STONE, 0.06) });
  iso.hip(tu - 0.12, v0 + 0.04, tu + 0.12, v0 + 0.26, 60, 10, ROOFTILE);
  return iso.build();
}

// --- A METRO/RAIL FLYOVER INTERCHANGE (the elevated junctions, the big road
// flyovers, the University circle / Nal Stop / Swargate interchanges) — a
// stacked double-deck concrete flyover curving on tall piers, a small control
// cabin. Long 3×2 headroom. ------------------------------------------------
function flyoverTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const PIER = hex('#b7b1bd');
  const u0 = 0.2, u1 = 2.8, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // tall round piers
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 5;
    iso.box(u - 0.05, 1.0 - 0.05, u + 0.05, 1.0 + 0.05, 0, 36, PIER, { rightC: lit(PIER, 0.06) });
  }
  // lower deck (a long curving box)
  iso.box(u0, 0.86, u1, 1.14, 36, 44, PIER, { rightC: lit(PIER, 0.05) });
  // upper deck (offset, narrower)
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.3 + ((u1 - u0 - 0.6) * i) / 5;
    iso.box(u - 0.04, 0.78 - 0.04, u + 0.04, 0.78 + 0.04, 44, 64, PIER, { rightC: lit(PIER, 0.06) });
  }
  iso.box(u0 + 0.2, 0.7, u1 - 0.2, 0.92, 64, 72, lighten(PIER, 0.04), { rightC: lit(PIER, 0.06) });
  // parapet lamp pips along both decks
  for (let i = 0; i <= 6; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 6;
    const [px, py] = iso.P(u, 1.14, 44);
    iso.r.poly([[px - 1.4 * RES, py - 2 * RES], [px + 1.4 * RES, py - 2 * RES], [px, py - 5 * RES]], alpha(GOLD_HOT, 0.8));
  }
  return iso.build();
}

// --- A MILITARY / DEFENCE INSTITUTE (NDA Sudan Block, Khadakwasla; the Command
// HQ; AFMC; College of Military Engineering) — a monumental symmetrical pale-
// sandstone block with a deep colonnaded portico, a central pediment + a low
// dome, flanking wings + a flagstaff. The grand parade-ground architecture.
// Broad 2×2. ---------------------------------------------------------------
function defenceInstituteTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const SAND = hex('#cbb78c');
  const u0 = 0.16, u1 = 1.84, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the long symmetrical block
  iso.box(u0, v0, u1, v1, 0, 46, SAND, { leftC: shaded(SAND, 0.16), rightC: lit(SAND, 0.05) });
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(SAND, 0.2), { ink: false });
  // repeated windows on the wings
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 12, 38, 12, alpha(COLORS.glassDark, 0.8), SAND);
  // a deep central colonnaded portico (the parade frontispiece)
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.32, v1 - 0.04, gcx + 0.32, v1 + 0.1, 0, 52, lighten(SAND, 0.04), { rightC: lit(SAND, 0.06) });
  for (let i = 0; i <= 6; i++) {
    const u = gcx - 0.28 + (i * 0.56) / 6;
    iso.r.poly([iso.P(u - 0.02, v1 + 0.1, 44), iso.P(u + 0.02, v1 + 0.1, 44), iso.P(u + 0.02, v1 + 0.1, 4), iso.P(u - 0.02, v1 + 0.1, 4)], i % 2 ? COLORS.white : lit(COLORS.white, 0.06));
  }
  // a triangular pediment over the portico
  iso.r.poly([iso.P(gcx - 0.34, v1 + 0.1, 52), iso.P(gcx + 0.34, v1 + 0.1, 52), iso.P(gcx, v1 + 0.1, 64)], lit(SAND, 0.1));
  iso.r.polyline([iso.P(gcx - 0.34, v1 + 0.1, 52), iso.P(gcx, v1 + 0.1, 64), iso.P(gcx + 0.34, v1 + 0.1, 52)], INK_W * 0.7, INK);
  // cornice + a central low dome behind
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 46, 50, lighten(SAND, 0.06), { ink: false });
  onionDome(iso, gcx, (v0 + v1) / 2, 50, 0.2, 28, DOMEWHITE, { ribs: 6 });
  // a flagstaff
  const [fx, fyB] = iso.P(u0 + 0.3, v0 + 0.3, 50);
  iso.r.line([fx, fyB], [fx, fyB - 30 * RES], 1 * RES, COLORS.steel);
  iso.r.poly([[fx, fyB - 30 * RES], [fx + 12 * RES, fyB - 26 * RES], [fx, fyB - 22 * RES]], hex('#e2922f'));
  return iso.build();
}

// --- AN OBSERVATORY / SCIENCE DOME (IMD Pune meteorological; GMRT-adjacent;
// the planetarium; ARIES-style domes) — a cylindrical drum carrying a big
// hemispherical white OBSERVATORY DOME with a vertical telescope slit, on a
// science-block podium. 1×1 headroom. --------------------------------------
function observatoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const CLAD = hex('#dad2c2');
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // science-block podium
  iso.box(u0, v0, u1, v1, 0, 34, CLAD, { rightC: lit(CLAD, 0.05) });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 8, 30, 5, alpha(COLORS.glassSky, 0.8), CLAD);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 34, 38, lighten(CLAD, 0.06), { ink: false });
  // the cylindrical drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 38, 52, lighten(CLAD, 0.03), { rightC: lit(CLAD, 0.06) });
  // the big white hemispherical dome
  const [dx, dyB] = iso.P(cx, cy, 52);
  const DR = 0.26 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI;
    dome.push([dx - DR + (2 * DR * i) / 20, dyB - Math.sin(a) * DR * 1.05]);
  }
  dome.push([dx + DR, dyB], [dx - DR, dyB]);
  iso.r.poly(dome, DOMEWHITE, lit(DOMEWHITE, 0.06));
  iso.r.polyline(dome.slice(0, 21), INK_W * 0.7, INK);
  // the dark vertical telescope slit
  iso.r.poly([[dx - 2 * RES, dyB], [dx + 2 * RES, dyB], [dx + 1.4 * RES, dyB - DR * 1.0], [dx - 1.4 * RES, dyB - DR * 1.0]], alpha(BASALT_D, 0.9));
  return iso.build();
}

// --- A MODERN HOTEL TOWER (the JW Marriott / Conrad / Westin / O Hotel /
// Hyatt — Pune's flagship hotels) — a sleek tapering glass hotel slab with a
// double-height lobby canopy, a curved balcony face, a roof sign + helipad
// ring. Tall 1×1. ----------------------------------------------------------
function hotelTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  // seed-varied glass tint so each flagship hotel reads distinct
  const GLASS = [hex('#a9c2cf'), hex('#b7c0a9'), hex('#c0b3c4'), hex('#a9bccf')][Math.floor(jit(seed, 1) * 4)] ?? hex('#a9c2cf');
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a low entrance podium with a cantilever porte-cochère
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 16, hex('#cfc6b6'), { rightC: lit(hex('#cfc6b6'), 0.05) });
  iso.r.poly([iso.P(u0 - 0.06, v1 + 0.1, 16), iso.P(u1 + 0.06, v1 + 0.1, 16), iso.P(u1, v1, 18), iso.P(u0, v1, 18)], lit(COLORS.steel, 0.06));
  // the tower slab (tapering)
  iso.box(u0, v0, u1, v1, 16, 132, GLASS, { leftC: shaded(GLASS, 0.14), rightC: lit(GLASS, 0.08), topC: alpha(COLORS.glassLit, 0.4) });
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 132, 160, GLASS, { rightC: lit(GLASS, 0.1) });
  // balcony floor-bands curving across the front
  for (let z = 24; z < 156; z += 8) {
    const s = z < 132 ? 0 : 0.06;
    iso.r.line(iso.P(u0 + s, v1 - s, z), iso.P(u1 - s, v1 - s, z), 0.7 * RES, alpha(COLORS.glassLit, z % 24 < 8 ? 0.5 : 0.22));
  }
  // a lit vertical lobby strip
  iso.r.line(iso.P(u1, (v0 + v1) / 2, 18), iso.P(u1 - 0.06, (v0 + v1) / 2, 158), 1 * RES, alpha(COLORS.glassLit, 0.5));
  // a rooftop sign + helipad ring
  iso.box(u0 - 0.02, v0 - 0.02, u1 - 0.04, v1 - 0.04, 160, 164, lighten(GLASS, 0.06), { ink: false });
  const [hx, hyB] = iso.P((u0 + u1) / 2 - 0.02, (v0 + v1) / 2 - 0.02, 164);
  const HR = 0.14 * (CELL_W / 2);
  const disc: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; disc.push([hx + Math.cos(a) * HR, hyB + Math.sin(a) * HR * 0.5]); }
  iso.r.polyline(disc, INK_W * 0.5, alpha(INK, 0.6), true);
  return iso.build();
}

// --- A SPORTS / SWIM COMPLEX feature: the Balewadi aquatic / indoor arena —
// a curved swooping double-wave roof (the Shiv Chhatrapati signature) on a low
// glazed base, a forecourt. Broad 2×1. -------------------------------------
function arenaWaveTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // glazed base
  iso.box(u0, v0 + 0.1, u1, v1, 0, 30, alpha(COLORS.glassSky, 0.8), { topC: alpha(COLORS.glassLit, 0.4) });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 6, 26, 11, alpha(COLORS.glassLit, 0.5), COLORS.steel);
  // a swooping double-wave roof (two arcs of steel ribs)
  const cv = (v0 + 0.1 + v1) / 2;
  for (let i = 0; i <= 18; i++) {
    const u = u0 + ((u1 - u0) * i) / 18;
    const w = 14 + Math.sin(i * 0.45) * 9; // the double wave
    const [bx, by] = iso.P(u, cv, 30);
    iso.r.line([bx, by - w * RES], [bx, by], 0.9 * RES, i % 2 ? lit(COLORS.steel, 0.06) : COLORS.steel);
  }
  // the two ridge curves
  const ridge = (amp: number, ph: number, col: RGBA): void => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const u = u0 + ((u1 - u0) * i) / 18;
      const w = 14 + Math.sin(i * 0.45 + ph) * amp;
      pts.push([iso.P(u, cv, 30)[0], iso.P(u, cv, 30)[1] - w * RES]);
    }
    iso.r.polyline(pts, 1.4 * RES, col);
  };
  ridge(9, 0, lit(COLORS.steel, 0.1));
  return iso.build();
}

// --- A TV / TELECOM TOWER (the Pune Doordarshan Kendra mast; mobile-network
// macro towers; the Sinhagad-road TV tower) — a tall slim free-standing
// lattice telecom tower on a small equipment hut, microwave drums + a warm
// beacon. Slim 1×1 headroom. ------------------------------------------------
function telecomTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 0.2, 0.22);
  // a small equipment hut
  iso.box(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 0, 14, hex('#cfc6b6'), { rightC: lit(hex('#cfc6b6'), 0.05) });
  // the tapering lattice mast
  const [mx, myB] = iso.P(u, v, 14);
  const MH = 170 * RES;
  iso.r.line([mx - 6 * RES, myB], [mx, myB - MH], 1.2 * RES, COLORS.steelDark);
  iso.r.line([mx + 6 * RES, myB], [mx, myB - MH], 1.2 * RES, COLORS.steel);
  for (let i = 1; i < 16; i++) {
    const t = i / 16;
    const y = myB - MH * t;
    const w = 6 * (1 - t) * RES;
    iso.r.line([mx - w, y], [mx + w, y], 0.6 * RES, alpha(COLORS.steel, 0.8));
    if (i % 4 === 0) iso.r.line([mx - w, y + 6 * RES], [mx + w, y], 0.45 * RES, alpha(COLORS.steelDark, 0.6));
  }
  // microwave drums partway up
  for (const t of [0.5, 0.66] as const) {
    const y = myB - MH * t;
    iso.r.line([mx - 4 * RES, y], [mx + 4 * RES, y], 5 * RES, alpha(hex('#d8d2c4'), 0.9));
  }
  // a warm beacon at the tip
  iso.r.poly([[mx - 1.6 * RES, myB - MH], [mx + 1.6 * RES, myB - MH], [mx, myB - MH - 5 * RES]], hex('#ff8a52'));
  return iso.build();
}

// --- A POWER / SUBSTATION-GRID ICON (the MSEDCL grid stations; the thermal /
// switchyard; the Mundhwa / Parvati pumping & power works) — an industrial
// block with a lattice GANTRY of busbars + insulator stacks, a control room,
// transformer tanks. Fits the game's own theme. Broad 2×1. -----------------
function gridWorksTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 90 });
  void seed;
  const CLAD = hex('#c2b7a4');
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // the control-room block
  iso.box(u0, v0 + 0.2, u0 + 0.5, v1, 0, 30, CLAD, { rightC: lit(CLAD, 0.05) });
  iso.windowsLeft(v1, u0 + 0.04, u0 + 0.46, 6, 26, 4, alpha(COLORS.glassLit, 0.5), COLORS.steel);
  // the open switchyard: a lattice gantry carrying horizontal busbars
  for (let i = 0; i <= 4; i++) {
    const u = u0 + 0.7 + ((u1 - u0 - 0.8) * i) / 4;
    const [gx, gyB] = iso.P(u, v0 + 0.5, 0);
    iso.r.line([gx, gyB], [gx, gyB - 48 * RES], 1.4 * RES, COLORS.steelDark);
    // cross-beam
    if (i < 4) {
      const [gx2] = iso.P(u0 + 0.7 + ((u1 - u0 - 0.8) * (i + 1)) / 4, v0 + 0.5, 0);
      iso.r.line([gx, gyB - 44 * RES], [gx2, gyB - 44 * RES], 1.1 * RES, COLORS.steel);
      iso.r.line([gx, gyB - 36 * RES], [gx2, gyB - 36 * RES], 0.8 * RES, alpha(COLORS.steel, 0.7));
    }
    // insulator stack
    for (let k = 0; k < 4; k++) iso.r.line([gx - 2 * RES, gyB - 30 * RES + k * 3 * RES], [gx + 2 * RES, gyB - 30 * RES + k * 3 * RES], 1.2 * RES, alpha(hex('#d8d2c4'), 0.85));
  }
  // transformer tanks with radiator fins + bushings
  for (const cu of [u0 + 0.8, u1 - 0.5] as const) {
    iso.box(cu - 0.08, v1 - 0.18, cu + 0.08, v1 - 0.02, 0, 16, hex('#8a8f95'), { rightC: lit(hex('#8a8f95'), 0.06) });
    for (let k = 0; k < 3; k++) { const [bx, by] = iso.P(cu - 0.05 + k * 0.05, v1 - 0.1, 16); iso.r.line([bx, by], [bx, by - 6 * RES], 1.2 * RES, hex('#b8b2a4')); }
  }
  return iso.build();
}

// --- A LIBRARY / READING-ROOM (the David Sassoon / Poona Sarvajanik Sabha /
// the British Library / the Jaikar SPPU library) — a dignified two-storey
// stone reading-house: tall round-arched windows, a pedimented entrance with
// a clock, a low pitched roof + a small cupola lantern. 2×1. ---------------
function libraryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 90 });
  // seed-varied stone tone per reading-house
  const STONE = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#bfb393') : hex('#b6a98a'), 0.1);
  const u0 = 0.16, u1 = 1.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  iso.box(u0, v0, u1, v1, 0, 42, STONE, { leftC: shaded(STONE, 0.16), rightC: lit(STONE, 0.05) });
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 9, shaded(STONE, 0.2), { ink: false });
  // tall round-arched windows (two storeys)
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 8, 24, 7, 9, alpha(BASALT_D, 0.8));
  archArcade(iso, v1, u0 + 0.08, u1 - 0.08, 28, 38, 5, 9, alpha(BASALT_D, 0.7));
  // a pedimented central entrance with a clock
  const gcx = (u0 + u1) / 2;
  iso.r.poly([iso.P(gcx - 0.22, v1, 42), iso.P(gcx + 0.22, v1, 42), iso.P(gcx, v1, 54)], lit(STONE, 0.1));
  iso.r.polyline([iso.P(gcx - 0.22, v1, 42), iso.P(gcx, v1, 54), iso.P(gcx + 0.22, v1, 42)], INK_W * 0.7, INK);
  const [clx, cly] = iso.P(gcx, v1, 38);
  const RR = 3 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
  iso.r.poly(ring, TEMPLE_W);
  iso.r.polyline(ring, INK_W * 0.5, INK, true);
  // cornice + low pitched roof + cupola lantern
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 42, 46, lighten(STONE, 0.06), { ink: false });
  tileRoof(iso, u0, v0, u1, v1, 46, 9);
  chhatri(iso, gcx, (v0 + v1) / 2, 55, 0.12, DOMEWHITE);
  return iso.build();
}

// --- A SMALL GANPATI MANDAL PANDAL / SHRINE (the famous Ganpati mandals of
// the festival route: Tulshibaug, Guruji Talim, Tambdi Jogeshwari, Kesariwada,
// Akhil Mandai) — a tall festival GOPURA-arch gateway in painted plaster with
// a Ganesh medallion, flanking pillars, festoon-strung. 1×1 headroom. -------
function ganpatiPandalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  // seed-varied gopura crown colour + pillar tone per mandal
  const crown = jit(seed, 1) > 0.5 ? GOLD_HOT : jcol(seed, 2, SAFFRON_HOT, 0.08);
  const pillar = jit(seed, 3) > 0.5 ? BRICKR : jcol(seed, 4, hex('#b06848'), 0.08);
  const u0 = 0.18, u1 = 0.82, v0 = 0.34, v1 = 0.7;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // a low shrine base
  iso.box(u0, v0, u1, v1, 0, 22, SAFFRON, { rightC: lit(SAFFRON, 0.06) });
  // two tall flanking gateway pillars
  for (const su of [u0, u1] as const) {
    iso.box(su - 0.05, v1 - 0.05, su + 0.05, v1 + 0.03, 0, 72, pillar, { rightC: lit(pillar, 0.06) });
    kalash(iso, ...(iso.P(su, v1 - 0.01, 72) as Pt) as [number, number], 0.8);
  }
  // a tall arched gopura crown between the pillars (painted plaster)
  const gcx = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(u0, v1, 30), iso.P(u0, v1, 60)];
  for (let j = 0; j <= 8; j++) { const t = j / 8; poly.push(iso.P(u0 + (u1 - u0) * t, v1, 60 + Math.sin(t * Math.PI) * 24)); }
  poly.push(iso.P(u1, v1, 60), iso.P(u1, v1, 30));
  iso.r.poly(poly, crown);
  iso.r.polyline(poly, INK_W * 0.6, INK);
  // a Ganesh medallion in the tympanum
  const [mx, my] = iso.P(gcx, v1, 50);
  iso.r.line([mx - 4 * RES, my], [mx + 4 * RES, my], 8 * RES, alpha(SAFFRON_HOT, 0.9));
  iso.glint([mx, my], 2.4 * RES);
  return iso.build();
}

// --- AN ART-DECO / HERITAGE COMMERCIAL BLOCK (the Deccan Gymkhana deco shops,
// the Camp's MG-Road blocks: Dorabjee's, the West-End/Capitol, the Pune-Camp
// arcades) — a curved-corner three-storey deco block: a rounded corner with a
// little finial, banded balconies, ground-floor shopfronts. 2×2. -----------
function decoBlockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  // seed-varied render tone + height per deco block
  const CLAD = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#d3c4a4') : hex('#cbb89a'), 0.1);
  const bH = jrange(seed, 2, 48, 60);
  const u0 = 0.18, u1 = 1.82, v0 = 0.28, v1 = 1.72;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the deco block body
  iso.box(u0, v0, u1, v1, 0, bH, CLAD, { leftC: shaded(CLAD, 0.16), rightC: lit(CLAD, 0.05) });
  // banded balcony lines wrapping the front + right
  for (const z of [20, 34, 48] as const) {
    iso.r.line(iso.P(u0 + 0.04, v1, z), iso.P(u1 - 0.04, v1, z), 1.1 * RES, alpha(lighten(CLAD, 0.12), 0.8));
    iso.r.line(iso.P(u1, v0 + 0.04, z), iso.P(u1, v1 - 0.04, z), 1 * RES, alpha(lighten(CLAD, 0.08), 0.7));
  }
  // ground-floor glazed shopfronts
  iso.box(u0 + 0.06, v1 - 0.04, u1 - 0.06, v1, 0, 14, alpha(COLORS.glassLit, 0.5), { ink: false });
  // window rows
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 18, 50, 9, alpha(COLORS.glassDark, 0.7), CLAD);
  // the rounded deco CORNER (a quarter-cylinder) at front-right with a finial
  const cu = u1, cv = v1;
  const [ccx, ccyB] = iso.P(cu, cv, 0);
  const CR = 0.16 * (CELL_W / 2);
  for (let z = 0; z <= bH + 4; z += 6) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * (Math.PI / 2); pts.push([ccx + Math.cos(a) * CR, ccyB - z * RES + Math.sin(a) * CR * 0.5]); }
    iso.r.polyline(pts, 0.7 * RES, alpha(lit(CLAD, 0.06), 0.6));
  }
  iso.box(cu - 0.14, cv - 0.14, cu, cv, bH, bH + 6, lighten(CLAD, 0.05));
  const [fx, fyB] = iso.P(cu - 0.07, cv - 0.07, bH + 6);
  iso.r.line([fx, fyB], [fx, fyB - 16 * RES], 1.4 * RES, COLORS.steelDark);
  iso.r.poly([[fx - 2 * RES, fyB - 16 * RES], [fx + 2 * RES, fyB - 16 * RES], [fx, fyB - 22 * RES]], alpha(GOLD_HOT, 0.85));
  return iso.build();
}

// --- A STATUE / EQUESTRIAN MEMORIAL ON A PLINTH (Shivaji equestrian statues,
// the many putlas: Tilak, Phule, Ambedkar, Tanaji, Savarkar, Karve) — a tall
// stepped stone plinth carrying a dark bronze figure (standing or mounted), a
// railing + flame lamps. Slim 1×1 headroom. The civic-statue catch-all. -----
function statuePlinthTile(seed: number, mounted: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  // seed-varied plinth stone + plinth height so each putla reads distinct
  const ST = jit(seed, 1) > 0.5 ? jcol(seed, 2, hex('#c2b594'), 0.1) : jcol(seed, 2, hex('#b3a98f'), 0.1);
  const BRONZE = jit(seed, 3) > 0.5 ? hex('#5c5042') : hex('#4a5448');
  const pH = jrange(seed, 4, 34, 48);
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.26, v - 0.26, u + 0.26, v + 0.26, 0.22, 0.24);
  // a broad stepped plinth (seed-varied height)
  iso.box(u - 0.3, v - 0.3, u + 0.3, v + 0.3, 0, 10, shaded(ST, 0.12), { ink: false });
  iso.box(u - 0.22, v - 0.22, u + 0.22, v + 0.22, 10, pH * 0.5, ST, { rightC: lit(ST, 0.05) });
  iso.box(u - 0.16, v - 0.16, u + 0.16, v + 0.16, pH * 0.5, pH, lighten(ST, 0.03), { rightC: lit(ST, 0.06) });
  // a dedication panel on the front
  iso.r.poly([iso.P(u - 0.1, v + 0.16, pH - 14), iso.P(u + 0.1, v + 0.16, pH - 14), iso.P(u + 0.1, v + 0.16, pH - 4), iso.P(u - 0.1, v + 0.16, pH - 4)], alpha(BASALT_D, 0.7));
  // the bronze figure on top
  const [fx, fyB] = iso.P(u, v, pH);
  if (mounted) {
    // a horse body + rider silhouette
    iso.r.poly([[fx - 8 * RES, fyB - 6 * RES], [fx + 8 * RES, fyB - 6 * RES], [fx + 9 * RES, fyB - 14 * RES], [fx + 4 * RES, fyB - 18 * RES], [fx - 8 * RES, fyB - 16 * RES]], BRONZE);
    // legs
    for (const lx of [-6, -2, 4, 8] as const) iso.r.line([fx + lx * RES, fyB - 6 * RES], [fx + lx * RES, fyB], 1.4 * RES, darken(BRONZE, 0.1));
    // rider
    iso.r.line([fx + 2 * RES, fyB - 16 * RES], [fx + 2 * RES, fyB - 28 * RES], 2.2 * RES, BRONZE);
    iso.r.line([fx + 2 * RES, fyB - 28 * RES], [fx + 9 * RES, fyB - 30 * RES], 1.4 * RES, BRONZE); // raised sword arm
    iso.r.line([fx + 9 * RES, fyB - 30 * RES], [fx + 14 * RES, fyB - 40 * RES], 1.2 * RES, lit(BRONZE, 0.1));
  } else {
    // a standing figure
    iso.r.line([fx, fyB], [fx, fyB - 22 * RES], 3 * RES, BRONZE);
    iso.r.line([fx, fyB - 22 * RES], [fx, fyB - 30 * RES], 4 * RES, BRONZE); // torso
    iso.r.line([fx, fyB - 18 * RES], [fx + 6 * RES, fyB - 26 * RES], 1.4 * RES, BRONZE); // arm out (pointing)
    iso.r.line([fx, fyB - 30 * RES], [fx, fyB - 35 * RES], 3 * RES, BRONZE); // head
  }
  // a couple of flame lamps at the plinth corners
  for (const sx of [-1, 1] as const) {
    const [lx, ly] = iso.P(u + sx * 0.24, v + 0.24, pH * 0.5);
    iso.r.poly([[lx - 1.6 * RES, ly], [lx + 1.6 * RES, ly], [lx, ly - 5 * RES]], alpha(SAFFRON_HOT, 0.9));
  }
  return iso.build();
}

// --- A SCHOOL / OLD SCHOOLHOUSE (the heritage schools: New English School,
// Nutan Marathi Vidyalaya, BMCC, SP College, the Deccan Education Society) — a
// long two-storey institutional schoolhouse with a verandah arcade, a central
// clock gable + bell, a tiled roof + a sports-ground flag. 2×2. ------------
function schoolTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  // seed-varied render tone so each heritage school reads distinct
  const CLAD = jcol(seed, 1, jit(seed, 9) > 0.5 ? hex('#d2bf99') : hex('#c9b88f'), 0.1);
  const u0 = 0.16, u1 = 1.84, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, 42, CLAD, { rightC: lit(CLAD, 0.05) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(CLAD, 0.18), { ink: false });
  // verandah arcade + upper windows
  archArcade(iso, v1, u0 + 0.06, u1 - 0.06, 6, 22, 6, 11, alpha(BASALT_D, 0.78));
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 26, 38, 11, alpha(COLORS.glassDark, 0.8), CLAD);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 42, 46, lighten(CLAD, 0.06), { ink: false });
  tileRoof(iso, u0, v0, u1, v1, 46, 12);
  // a central clock-and-bell gable
  const gcx = (u0 + u1) / 2;
  iso.box(gcx - 0.2, v1 - 0.04, gcx + 0.2, v1 + 0.04, 0, 56, lighten(CLAD, 0.04), { rightC: lit(CLAD, 0.06) });
  const [clx, cly] = iso.P(gcx, v1 + 0.04, 44);
  const RR = 3 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
  iso.r.poly(ring, TEMPLE_W);
  iso.r.polyline(ring, INK_W * 0.5, INK, true);
  iso.r.poly([iso.P(gcx - 0.22, v1 + 0.04, 56), iso.P(gcx + 0.22, v1 + 0.04, 56), iso.P(gcx, v1 + 0.04, 66)], lit(CLAD, 0.1));
  iso.r.polyline([iso.P(gcx - 0.22, v1 + 0.04, 56), iso.P(gcx, v1 + 0.04, 66), iso.P(gcx + 0.22, v1 + 0.04, 56)], INK_W * 0.6, INK);
  // a sports-ground flagstaff
  const [fx, fyB] = iso.P(u1 - 0.2, v0 + 0.2, 46);
  iso.r.line([fx, fyB], [fx, fyB - 26 * RES], 1 * RES, COLORS.steel);
  iso.r.poly([[fx, fyB - 26 * RES], [fx + 11 * RES, fyB - 22 * RES], [fx, fyB - 18 * RES]], hex('#e2922f'));
  return iso.build();
}

// ============================================================================
// REGISTRY — match each draw fn to its placed name(s). First match wins, so
// the SPECIFIC named icons precede the GENERIC families (mall/college/hospital/
// memorial). Native + English variants kept where the data carries them.
// ============================================================================
const G = (kind: HeroLightSpec['kind'], topZ?: number, halfW?: number): HeroLightSpec => ({ kind, topZ, halfW });

export const CITY_HEROES: BespokeHero[] = [
  // --- the marquee Pune icons (placed names) ---
  {
    city: 'pune', key: 'shaniwar-wada', match: /Shaniwar\s*Wada|शनिवार\s*वाडा/i,
    foot: [2, 2], seed: 71, draw: shaniwarWadaTile, light: G('facadeFlood', 100, 1.3),
  },
  {
    city: 'pune', key: 'aga-khan-palace', match: /Aga\s*Khan\s*Palace|आगा\s*खान/i,
    foot: [2, 2], seed: 72, draw: agaKhanPalaceTile, light: G('facadeFlood', 70, 1.3),
  },
  {
    city: 'pune', key: 'dagdusheth-ganpati', match: /Dagdu(sheth)?|दगडूशेठ|Dagadusheth/i,
    foot: [2, 2], seed: 73, draw: dagdushethTile, light: G('towerCrown', 210, 0.6),
  },
  {
    city: 'pune', key: 'shinde-chhatri', match: /Shinde\s*Chhatri|शिंदे\s*छत्री/i,
    foot: [2, 2], seed: 74, draw: shindeChhatriTile, light: G('facadeFlood', 110, 1.0),
  },
  {
    city: 'pune', key: 'lal-mahal', match: /Lal\s*Mahal|लाल\s*महाल/i,
    foot: [2, 2], seed: 75, draw: lalMahalTile, light: G('facadeFlood', 60, 1.3),
  },
  {
    city: 'pune', key: 'pataleshwar', match: /Pataleshwar|पाताळेश्वर/i,
    foot: [2, 2], seed: 76, draw: pataleshwarTile, light: G('facadeFlood', 40, 1.4),
  },
  {
    city: 'pune', key: 'vishrambaug-wada', match: /Vishrambaug|विश्रामबाग/i,
    foot: [2, 2], seed: 77, draw: vishrambaugWadaTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    // hill forts + the placed Taljai Watch Tower read as the basalt fort hero
    city: 'pune', key: 'hill-fort', match: /Sinhagad|Sinhgad\b(?!\s*College)|Purandar|सिंहगड|Taljai\s*Watch/i,
    foot: [3, 3], seed: 78, draw: hillFortTile, light: G('facadeFlood', 130, 1.6),
  },
  {
    city: 'pune', key: 'pune-junction', match: /Pune\s*Railway\s*Station\s*MSRTC|Pune\s*Junction|पुणे\s*रेल्वे/i,
    foot: [3, 2], seed: 79, draw: puneJunctionTile, light: G('facadeFlood', 64, 1.5),
  },
  {
    city: 'pune', key: 'pune-metro', match: /Pune\s*Railway\s*Station\s*metro|Pune\s*Metro|पुणे\s*मेट्रो/i,
    foot: [3, 2], seed: 80, draw: puneMetroTile, light: G('towerCrown', 70, 1.4),
  },
  {
    city: 'pune', key: 'it-tower', match: /Hinjawadi|Rajiv\s*Gandhi\s*Infotech|EON|IT\s*Park|हिंजवडी/i,
    foot: [1, 1], seed: 81, draw: itTowerTile, light: G('towerCrown', 230, 0.4),
  },
  {
    city: 'pune', key: 'aundh-vitthal-mandir', match: /Aundh\s*Vitthal|Vitthal\s*Mandir|विठ्ठल\s*मंदिर/i,
    foot: [1, 1], seed: 82, draw: vitthalMandirTile, light: G('towerCrown', 150, 0.5),
  },
  {
    city: 'pune', key: 'chaturshrungi-mandir', match: /Chaturshrungi|Chatu(h)?shrungi|चतुःशृंगी/i,
    foot: [2, 2], seed: 83, draw: chaturshrungiTile, light: G('facadeFlood', 150, 1.1),
  },
  {
    city: 'pune', key: 'ohel-david-synagogue', match: /Ohel\s*David|Lal\s*Deval|Laal\s*Deval|ओहेल\s*डेव्हिड/i,
    foot: [2, 2], seed: 84, draw: ohelDavidTile, light: G('facadeFlood', 168, 0.9),
  },
  {
    city: 'pune', key: 'phule-mandai', match: /Phule\s*Mand(a)?i|Mahatma\s*Phule\s*Mand|फुले\s*मंडई|Mandai/i,
    foot: [2, 2], seed: 85, draw: phuleMandaiTile, light: G('facadeFlood', 150, 1.0),
  },
  {
    city: 'pune', key: 'kelkar-museum', match: /Kelkar\s*Museum|Raja\s*Dinkar|केळकर/i,
    foot: [1, 1], seed: 86, draw: kelkarMuseumTile, light: G('facadeFlood', 100, 0.6),
  },
  {
    city: 'pune', key: 'iucaa', match: /IUCAA|Inter\s*University\s*Cent(er|re)\s*for\s*Astronomy|खगोल/i,
    foot: [2, 2], seed: 87, draw: iucaaTile, light: G('genericGlow', 56, 1.2),
  },
  {
    city: 'pune', key: 'national-chemical-laboratory', match: /National\s*Chemical\s*Lab|\bNCL\b|रासायनिक/i,
    foot: [2, 2], seed: 88, draw: nclTile, light: G('genericGlow', 66, 1.3),
  },
  // --- the big retail malls (specific, before the generic mall family) ---
  {
    city: 'pune', key: 'phoenix-marketcity', match: /Phoenix\s*Market\s*city|फिनिक्स/i,
    foot: [2, 2], seed: 89, draw: (s) => mallTile(s, true), light: G('towerCrown', 64, 1.4),
  },
  {
    city: 'pune', key: 'westend-mall', match: /Westend\s*Mall|Nexus\s*Westend|वेस्टएंड/i,
    foot: [2, 2], seed: 90, draw: (s) => mallTile(s, false), light: G('towerCrown', 50, 1.4),
  },
  {
    city: 'pune', key: 'pavillion-mall', match: /Pavill?ion|पॅव्हेलियन/i,
    foot: [2, 2], seed: 91, draw: (s) => mallTile(s, false), light: G('towerCrown', 50, 1.4),
  },
  // --- the broadcast / archive civics (mast hero) ---
  {
    city: 'pune', key: 'broadcast', match: /National\s*Film\s*Archive|All\s*India\s*Radio|Akashvani|आकाशवाणी|NFAI/i,
    foot: [1, 1], seed: 92, draw: broadcastTile, light: G('aerialBeacon', 200, 0.3),
  },
  // --- the theatre ---
  {
    city: 'pune', key: 'theatre', match: /Bal\s*gandharva|Balgandharva|Ranga?mandir|Rang\s*Mandir|बालगंधर्व/i,
    foot: [2, 2], seed: 93, draw: theatreTile, light: G('facadeFlood', 60, 1.2),
  },
  // --- the dargah ---
  {
    city: 'pune', key: 'dargah', match: /Dargah|Sheikh\s*Salla|दर्गा/i,
    foot: [1, 1], seed: 94, draw: dargahTile, light: G('facadeFlood', 80, 0.6),
  },
  // --- ashrams / samadhis ---
  {
    city: 'pune', key: 'ashram', match: /Ashram|Anand\s*ashram|Samadhi|Jangli\s*Maharaj|Pratishthan|आश्रम|समाधी/i,
    foot: [1, 1], seed: 95, draw: ashramTile, light: G('towerCrown', 90, 0.5),
  },
  // --- the COEP boat club ---
  {
    city: 'pune', key: 'boat-club', match: /Boat\s*Club|COEP|Regatta|बोट\s*क्लब/i,
    foot: [2, 1], seed: 96, draw: boatClubTile, light: G('genericGlow', 47, 1.2),
  },
  // --- engineering colleges (domed) + MIT/Sinhgad (plain) ---
  {
    city: 'pune', key: 'college-domed', match: /Army\s*Institute|\bAIT\b|College\s*of\s*Engineering|MITCOE|Sinhgad\s*College|MIT\s*Boys|MIT-WPU/i,
    foot: [2, 2], seed: 97, draw: (s) => collegeTile(s, true), light: G('facadeFlood', 80, 1.3),
  },
  // --- hospitals ---
  {
    city: 'pune', key: 'hospital', match: /Hospital|Hardikar|ONP|Leela\b/i,
    foot: [1, 1], seed: 98, draw: hospitalTile, light: G('towerCrown', 150, 0.5),
  },
  // --- bus stands & depots ---
  {
    city: 'pune', key: 'bus-stand', match: /Bus\s*Stand|MSRTC|PMPML|Depot|BRT\s*Stop|एसटी\s*स्थानक/i,
    foot: [2, 1], seed: 99, draw: busStandTile, light: G('genericGlow', 41, 1.3),
  },
  // ==========================================================================
  // ROUND 2 — the push to 100. SPECIFIC named Pune heroes (each placed in the
  // city `named` list), ordered BEFORE the generic institute/memorial catch-
  // alls so first-match-wins lands the bespoke silhouette. Native + English.
  // ==========================================================================

  // --- the seven holy hills + the river ghats + the peth temples ---
  {
    city: 'pune', key: 'parvati-hill', match: /Parvati\s*Hill|Devdeveshwar|Parvati\s*Temple|पर्वती/i,
    foot: [3, 3], seed: 120, draw: parvatiHillTile, light: G('facadeFlood', 150, 1.6),
  },
  {
    city: 'pune', key: 'omkareshwar-ghat', match: /Omkareshwar|ओंकारेश्वर/i,
    foot: [2, 2], seed: 121, draw: ghatTempleTile, light: G('facadeFlood', 90, 1.2),
  },
  {
    city: 'pune', key: 'kasba-ganpati', match: /Kasba\s*Ganpati|Kasba\s*Ganapati|कसबा\s*गणपती/i,
    foot: [1, 1], seed: 122, draw: pethTempleTile, light: G('towerCrown', 100, 0.5),
  },
  {
    city: 'pune', key: 'tulshibaug-ram-mandir', match: /Tulshibaug|Tulsibaug|Tulshi\s*Baug|तुळशीबाग/i,
    foot: [1, 1], seed: 123, draw: pethTempleTile, light: G('towerCrown', 100, 0.5),
  },
  {
    city: 'pune', key: 'trishund-ganpati', match: /Trishund|Trishunda|त्रिशुंड/i,
    foot: [1, 1], seed: 124, draw: pethTempleTile, light: G('towerCrown', 95, 0.5),
  },
  {
    city: 'pune', key: 'nageshwar-mandir', match: /Nageshwar|नागेश्वर/i,
    foot: [1, 1], seed: 125, draw: pethTempleTile, light: G('towerCrown', 95, 0.5),
  },
  {
    city: 'pune', key: 'tambdi-jogeshwari', match: /Tambdi\s*Jogeshwari|Jogeshwari|तांबडी\s*जोगेश्वरी/i,
    foot: [1, 1], seed: 126, draw: pethTempleTile, light: G('towerCrown', 98, 0.5),
  },
  {
    city: 'pune', key: 'belbaug-vishnu-mandir', match: /Belbaug|Bel\s*Baug|बेलबाग/i,
    foot: [1, 1], seed: 127, draw: pethTempleTile, light: G('towerCrown', 92, 0.5),
  },
  {
    city: 'pune', key: 'mrityunjayeshwar-mandir', match: /Mrityunjayeshwar|मृत्युंजयेश्वर/i,
    foot: [1, 1], seed: 128, draw: pethTempleTile, light: G('towerCrown', 95, 0.5),
  },
  {
    city: 'pune', key: 'amruteshwar-ghat', match: /Amruteshwar|अमृतेश्वर/i,
    foot: [2, 2], seed: 129, draw: ghatTempleTile, light: G('facadeFlood', 88, 1.2),
  },

  // --- the Peshwa wadas of the old city (carved teak + courtyard) ---
  {
    city: 'pune', key: 'nana-wada', match: /Nana\s*Wada|नाना\s*वाडा/i,
    foot: [2, 2], seed: 130, draw: wadaTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'naro-shankar-wada', match: /Naro\s*Shankar|नारो\s*शंकर/i,
    foot: [2, 2], seed: 131, draw: wadaTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'moroba-dada-wada', match: /Moroba\s*Dada|मोरोबा/i,
    foot: [2, 2], seed: 132, draw: wadaTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'raste-wada', match: /Raste\s*Wada|रास्ते\s*वाडा/i,
    foot: [2, 2], seed: 133, draw: wadaTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'purandare-wada', match: /Purandare\s*Wada|पुरंदरे\s*वाडा/i,
    foot: [2, 2], seed: 134, draw: wadaTile, light: G('facadeFlood', 55, 1.3),
  },

  // --- the colonial-Gothic & Deccan civic stone (the Raj heritage) ---
  {
    city: 'pune', key: 'sppu-main-building', match: /Savitribai\s*Phule\s*Pune\s*University|SPPU\s*Main|Pune\s*University\s*Main|University\s*Main\s*Building|सावित्रीबाई/i,
    foot: [2, 2], seed: 135, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },
  {
    city: 'pune', key: 'council-hall', match: /Council\s*Hall|Vidhan\s*Bhavan|विधान\s*भवन/i,
    foot: [2, 2], seed: 136, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },
  {
    city: 'pune', key: 'pune-gpo', match: /Pune\s*GPO|General\s*Post\s*Office|टपाल/i,
    foot: [2, 2], seed: 137, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },
  {
    city: 'pune', key: 'district-court', match: /District\s*Court|Shivajinagar\s*Court|न्यायालय/i,
    foot: [2, 2], seed: 138, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },
  {
    city: 'pune', key: 'pmc-building', match: /Pune\s*Municipal\s*Corporation|PMC\s*Building|महानगरपालिका/i,
    foot: [2, 2], seed: 139, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },

  // --- the Camp & Cantonment churches + bungalows + clubs ---
  {
    city: 'pune', key: 'st-marys-church', match: /St\.?\s*Mary'?s\s*Church|Saint\s*Mary/i,
    foot: [2, 2], seed: 140, draw: churchTile, light: G('facadeFlood', 150, 0.9),
  },
  {
    city: 'pune', key: 'st-patricks-cathedral', match: /St\.?\s*Patrick'?s\s*Cathedral|Saint\s*Patrick/i,
    foot: [2, 2], seed: 141, draw: churchTile, light: G('facadeFlood', 152, 0.9),
  },
  {
    city: 'pune', key: 'all-saints-church', match: /All\s*Saints'?\s*Church/i,
    foot: [2, 2], seed: 142, draw: churchTile, light: G('facadeFlood', 148, 0.9),
  },
  {
    city: 'pune', key: 'poona-club', match: /Poona\s*Club|Pune\s*Club/i,
    foot: [2, 1], seed: 143, draw: bungalowTile, light: G('facadeFlood', 48, 1.4),
  },
  {
    city: 'pune', key: 'royal-connaught-boat-club', match: /Royal\s*Connaught|Connaught\s*Boat/i,
    foot: [2, 1], seed: 144, draw: bungalowTile, light: G('facadeFlood', 48, 1.4),
  },
  {
    city: 'pune', key: 'deccan-gymkhana', match: /Deccan\s*Gymkhana|गायकवाड|Gymkhana/i,
    foot: [2, 1], seed: 145, draw: bungalowTile, light: G('facadeFlood', 48, 1.4),
  },

  // --- the modern glass: IT/SEZ/township + corporate towers ---
  {
    city: 'pune', key: 'icc-trade-tower', match: /ICC\s*Trade\s*Tower|International\s*Convention\s*Cent(er|re)|Trade\s*Tower/i,
    foot: [2, 2], seed: 146, draw: twinTowerTile, light: G('towerCrown', 168, 1.3),
  },
  {
    city: 'pune', key: 'amanora-gateway-towers', match: /Amanora|Gateway\s*Towers|अमानोरा/i,
    foot: [2, 2], seed: 147, draw: highriseClusterTile, light: G('towerCrown', 184, 1.3),
  },
  {
    city: 'pune', key: 'magarpatta-cybercity', match: /Magarpatta|Cybercity|मगरपट्टा/i,
    foot: [2, 2], seed: 148, draw: cybercityTile, light: G('towerCrown', 58, 1.4),
  },
  {
    city: 'pune', key: 'eon-it-park', match: /EON\s*Free\s*Zone|EON\s*IT|Kharadi\s*IT/i,
    foot: [2, 2], seed: 149, draw: cybercityTile, light: G('towerCrown', 58, 1.4),
  },
  {
    city: 'pune', key: 'world-trade-center-pune', match: /World\s*Trade\s*Cent(er|re)\s*Pune|WTC\s*Pune|Kharadi\s*WTC/i,
    foot: [2, 2], seed: 150, draw: twinTowerTile, light: G('towerCrown', 168, 1.3),
  },
  {
    city: 'pune', key: 'panchshil-tower', match: /Panchshil\s*Tower|Business\s*Bay|Yerawada\s*IT/i,
    foot: [2, 2], seed: 151, draw: twinTowerTile, light: G('towerCrown', 168, 1.3),
  },

  // --- the flagship hotels ---
  {
    city: 'pune', key: 'jw-marriott-pune', match: /JW\s*Marriott|Marriott\s*Pune/i,
    foot: [1, 1], seed: 152, draw: hotelTowerTile, light: G('towerCrown', 162, 0.5),
  },
  {
    city: 'pune', key: 'conrad-pune', match: /Conrad\s*Pune|Conrad\b/i,
    foot: [1, 1], seed: 153, draw: hotelTowerTile, light: G('towerCrown', 162, 0.5),
  },
  {
    city: 'pune', key: 'westin-pune', match: /Westin\s*Pune|Westin\b/i,
    foot: [1, 1], seed: 154, draw: hotelTowerTile, light: G('towerCrown', 162, 0.5),
  },
  {
    city: 'pune', key: 'hyatt-pune', match: /Hyatt\s*Pune|Hyatt\s*Regency/i,
    foot: [1, 1], seed: 155, draw: hotelTowerTile, light: G('towerCrown', 162, 0.5),
  },

  // --- the modern campuses & academia ---
  {
    city: 'pune', key: 'symbiosis-siu', match: /Symbiosis|SIU\b|सिंबायोसिस/i,
    foot: [1, 1], seed: 156, draw: modernCampusTile, light: G('facadeFlood', 84, 0.6),
  },
  {
    city: 'pune', key: 'fergusson-college', match: /Fergusson\s*College|फर्ग्युसन/i,
    foot: [2, 2], seed: 157, draw: gothicCivicTile, light: G('facadeFlood', 116, 1.3),
  },
  {
    city: 'pune', key: 'gokhale-institute', match: /Gokhale\s*Institute|Gokhale\s*Inst|गोखले/i,
    foot: [1, 1], seed: 158, draw: modernCampusTile, light: G('facadeFlood', 84, 0.6),
  },
  {
    city: 'pune', key: 'ftii', match: /FTII|Film\s*and\s*Television\s*Inst|फिल्म\s*अँड/i,
    foot: [1, 1], seed: 159, draw: modernCampusTile, light: G('facadeFlood', 84, 0.6),
  },
  {
    city: 'pune', key: 'flame-university', match: /FLAME\s*University|FLAME\b/i,
    foot: [1, 1], seed: 160, draw: modernCampusTile, light: G('facadeFlood', 84, 0.6),
  },
  {
    city: 'pune', key: 'bmcc', match: /BMCC|Brihan\s*Maharashtra\s*College|बीएमसीसी/i,
    foot: [2, 2], seed: 161, draw: schoolTile, light: G('facadeFlood', 66, 1.3),
  },
  {
    city: 'pune', key: 'new-english-school', match: /New\s*English\s*School|न्यू\s*इंग्लिश/i,
    foot: [2, 2], seed: 162, draw: schoolTile, light: G('facadeFlood', 66, 1.3),
  },
  {
    city: 'pune', key: 'sp-college', match: /\bSP\s*College|Sir\s*Parashurambhau|एस\.?\s*पी\.?\s*कॉलेज/i,
    foot: [2, 2], seed: 163, draw: schoolTile, light: G('facadeFlood', 66, 1.3),
  },
  {
    city: 'pune', key: 'nutan-marathi-vidyalaya', match: /Nutan\s*Marathi|नूतन\s*मराठी/i,
    foot: [2, 2], seed: 164, draw: schoolTile, light: G('facadeFlood', 66, 1.3),
  },

  // --- the riverbanks: bridges + ghats + gardens ---
  {
    city: 'pune', key: 'sangam-bridge', match: /Sangam\s*Bridge|Wellesley\s*Bridge|संगम\s*पूल/i,
    foot: [3, 1], seed: 165, draw: bridgeTile, light: G('genericGlow', 30, 1.6),
  },
  {
    city: 'pune', key: 'z-bridge', match: /\bZ\s*Bridge|झेड\s*पूल/i,
    foot: [3, 1], seed: 166, draw: bridgeTile, light: G('genericGlow', 30, 1.6),
  },
  {
    city: 'pune', key: 'lakdi-pul', match: /Lakdi\s*Pul|Sambhaji\s*Bridge|लकडी\s*पूल/i,
    foot: [3, 1], seed: 167, draw: bridgeTile, light: G('genericGlow', 30, 1.6),
  },
  {
    city: 'pune', key: 'bund-garden-bridge', match: /Bund\s*Garden\s*Bridge|Fitzgerald\s*Bridge/i,
    foot: [3, 1], seed: 168, draw: bridgeTile, light: G('genericGlow', 30, 1.6),
  },
  {
    city: 'pune', key: 'empress-garden', match: /Empress\s*Garden|Empress\s*Botanical|एम्प्रेस/i,
    foot: [2, 2], seed: 169, draw: gardenPavilionTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'bund-garden', match: /Bund\s*Garden|Mahatma\s*Gandhi\s*Udyan|बंड\s*गार्डन/i,
    foot: [2, 2], seed: 170, draw: gardenPavilionTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'saras-baug', match: /Saras\s*Baug|Sarasbaug|सारस\s*बाग/i,
    foot: [2, 2], seed: 171, draw: ghatTempleTile, light: G('facadeFlood', 84, 1.2),
  },
  {
    city: 'pune', key: 'peshwe-park', match: /Peshwe\s*Park|पेशवे\s*पार्क/i,
    foot: [2, 2], seed: 172, draw: gardenPavilionTile, light: G('genericGlow', 46, 1.3),
  },

  // --- the spiritual modern + samadhis ---
  {
    city: 'pune', key: 'osho-pyramid', match: /Osho|Rajneesh|ओशो/i,
    foot: [2, 2], seed: 173, draw: pyramidHallTile, light: G('genericGlow', 116, 1.3),
  },
  {
    city: 'pune', key: 'nanasaheb-peshwe-samadhi', match: /Nanasaheb\s*Peshwe\s*Samadhi|Peshwe\s*Samadhi|पेशवे\s*समाधी/i,
    foot: [1, 1], seed: 174, draw: samadhiTile, light: G('facadeFlood', 46, 0.6),
  },
  {
    city: 'pune', key: 'vishrambaug-samadhi', match: /Nana\s*Phadnavis\s*Samadhi|Phadnavis\s*Cenotaph/i,
    foot: [1, 1], seed: 175, draw: samadhiTile, light: G('facadeFlood', 46, 0.6),
  },
  {
    city: 'pune', key: 'pataleshwar-samadhi', match: /Jangli\s*Maharaj\s*Math|Math\s*Samadhi/i,
    foot: [1, 1], seed: 176, draw: samadhiTile, light: G('facadeFlood', 46, 0.6),
  },

  // --- the festival Ganpati mandals (the immersion route) ---
  {
    city: 'pune', key: 'guruji-talim-ganpati', match: /Guruji\s*Talim|गुरुजी\s*तालीम/i,
    foot: [1, 1], seed: 177, draw: ganpatiPandalTile, light: G('facadeFlood', 84, 0.5),
  },
  {
    city: 'pune', key: 'tulshibaug-ganpati-mandal', match: /Tulshibaug\s*Ganpati|Tulshibaug\s*Mandal/i,
    foot: [1, 1], seed: 178, draw: ganpatiPandalTile, light: G('facadeFlood', 84, 0.5),
  },
  {
    city: 'pune', key: 'kesariwada-ganpati', match: /Kesariwada|Kesari\s*Wada|केसरी\s*वाडा/i,
    foot: [1, 1], seed: 179, draw: ganpatiPandalTile, light: G('facadeFlood', 84, 0.5),
  },
  {
    city: 'pune', key: 'akhil-mandai-ganpati', match: /Akhil\s*Mandai|Mandai\s*Ganpati|अखिल\s*मंडई/i,
    foot: [1, 1], seed: 180, draw: ganpatiPandalTile, light: G('facadeFlood', 84, 0.5),
  },

  // --- cinemas, deco commercial, library, market ---
  {
    city: 'pune', key: 'prabhat-talkies', match: /Prabhat\s*Talkies|Prabhat\s*Cinema|प्रभात/i,
    foot: [2, 1], seed: 181, draw: cinemaTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'alka-talkies', match: /Alka\s*Talkies|Alka\s*Cinema|अलका/i,
    foot: [2, 1], seed: 182, draw: cinemaTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'vijay-talkies', match: /Vijay\s*Talkies|Victory\s*Cinema|विजय\s*टॉकीज/i,
    foot: [2, 1], seed: 183, draw: cinemaTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'e-square', match: /E[-\s]?Square|City\s*Pride|Mangala\s*Cinema/i,
    foot: [2, 1], seed: 184, draw: cinemaTile, light: G('genericGlow', 46, 1.3),
  },
  {
    city: 'pune', key: 'dorabjees', match: /Dorabjee|Capitol\b|West\s*End\s*Cinema/i,
    foot: [2, 2], seed: 185, draw: decoBlockTile, light: G('facadeFlood', 60, 1.3),
  },
  {
    city: 'pune', key: 'mg-road-arcade', match: /MG\s*Road\s*Arcade|Main\s*Street\s*Camp|एम\.?\s*जी\.?\s*रोड/i,
    foot: [2, 2], seed: 186, draw: decoBlockTile, light: G('facadeFlood', 60, 1.3),
  },
  {
    city: 'pune', key: 'david-sassoon-library', match: /David\s*Sassoon\s*Library|Sassoon\s*Library/i,
    foot: [2, 1], seed: 187, draw: libraryTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'jaikar-library', match: /Jaikar\s*Library|Jayakar\s*Library|University\s*Library/i,
    foot: [2, 1], seed: 188, draw: libraryTile, light: G('facadeFlood', 55, 1.3),
  },
  {
    city: 'pune', key: 'market-yard', match: /Market\s*Yard|Gultekdi\s*APMC|APMC|मार्केट\s*यार्ड/i,
    foot: [2, 2], seed: 189, draw: marketYardTile, light: G('genericGlow', 62, 1.4),
  },
  {
    city: 'pune', key: 'juna-bazaar', match: /Juna\s*Bazaar|Juna\s*Bazar|जुना\s*बाजार/i,
    foot: [2, 2], seed: 190, draw: marketYardTile, light: G('genericGlow', 62, 1.4),
  },

  // --- sports, defence, science, infrastructure ---
  {
    city: 'pune', key: 'mca-stadium', match: /MCA\s*Stadium|Gahunje|Maharashtra\s*Cricket|Subrata\s*Roy\s*Sahara/i,
    foot: [3, 2], seed: 191, draw: stadiumBowlTile, light: G('stadiumFlood', 48, 1.6),
  },
  {
    city: 'pune', key: 'balewadi-stadium', match: /Balewadi|Shiv\s*Chhatrapati\s*Sports|Shree\s*Shiv\s*Chhatrapati|बालेवाडी/i,
    foot: [3, 2], seed: 192, draw: stadiumBowlTile, light: G('stadiumFlood', 48, 1.6),
  },
  {
    city: 'pune', key: 'nehru-stadium', match: /Nehru\s*Stadium|PYC\s*Hindu\s*Gymkhana|PCA\b/i,
    foot: [3, 2], seed: 193, draw: stadiumBowlTile, light: G('stadiumFlood', 48, 1.6),
  },
  {
    city: 'pune', key: 'balewadi-aquatic', match: /Balewadi\s*Aquatic|Aquatic\s*Complex|Indoor\s*Stadium/i,
    foot: [2, 1], seed: 194, draw: arenaWaveTile, light: G('genericGlow', 36, 1.4),
  },
  {
    city: 'pune', key: 'nda-sudan-block', match: /NDA\b|National\s*Defence\s*Academy|Sudan\s*Block|एनडीए/i,
    foot: [2, 2], seed: 195, draw: defenceInstituteTile, light: G('facadeFlood', 64, 1.3),
  },
  {
    city: 'pune', key: 'afmc', match: /AFMC|Armed\s*Forces\s*Medical|Command\s*Hospital/i,
    foot: [2, 2], seed: 196, draw: defenceInstituteTile, light: G('facadeFlood', 64, 1.3),
  },
  {
    city: 'pune', key: 'cme-dapodi', match: /College\s*of\s*Military\s*Engineering|\bCME\b|Bombay\s*Engineer/i,
    foot: [2, 2], seed: 197, draw: defenceInstituteTile, light: G('facadeFlood', 64, 1.3),
  },
  {
    city: 'pune', key: 'imd-observatory', match: /IMD\s*Pune|Meteorolog|Simla\s*Office|वेधशाळा/i,
    foot: [1, 1], seed: 198, draw: observatoryTile, light: G('facadeFlood', 78, 0.5),
  },
  {
    city: 'pune', key: 'gmrt-dish', match: /GMRT|Giant\s*Metrewave|Khodad/i,
    foot: [1, 1], seed: 199, draw: observatoryTile, light: G('facadeFlood', 78, 0.5),
  },
  {
    city: 'pune', key: 'khadakwasla-dam', match: /Khadakwasla|खडकवासला/i,
    foot: [3, 1], seed: 200, draw: damTile, light: G('genericGlow', 38, 1.6),
  },
  {
    city: 'pune', key: 'panshet-dam', match: /Panshet|Varasgaon|पानशेत/i,
    foot: [3, 1], seed: 201, draw: damTile, light: G('genericGlow', 38, 1.6),
  },
  {
    city: 'pune', key: 'katraj-lake', match: /Katraj\s*Lake|Pashan\s*Lake|कात्रज\s*तलाव/i,
    foot: [3, 1], seed: 202, draw: damTile, light: G('genericGlow', 38, 1.6),
  },
  {
    city: 'pune', key: 'university-flyover', match: /University\s*Flyover|University\s*Circle|Ganeshkhind\s*Flyover/i,
    foot: [3, 2], seed: 203, draw: flyoverTile, light: G('genericGlow', 64, 1.5),
  },
  {
    city: 'pune', key: 'nal-stop-flyover', match: /Nal\s*Stop|Karve\s*Road\s*Flyover/i,
    foot: [3, 2], seed: 204, draw: flyoverTile, light: G('genericGlow', 64, 1.5),
  },
  {
    city: 'pune', key: 'mahatma-society-substation', match: /Parvati\s*Pumping|Mahatma\s*Society\s*Sub|MSEDCL\s*Grid|Grid\s*Station/i,
    foot: [2, 1], seed: 205, draw: gridWorksTile, light: G('aerialBeacon', 52, 1.4),
  },
  {
    city: 'pune', key: 'mundhwa-switchyard', match: /Mundhwa\s*Switchyard|Switchyard|Thermal\s*Power|पॉवर\s*स्टेशन/i,
    foot: [2, 1], seed: 206, draw: gridWorksTile, light: G('aerialBeacon', 52, 1.4),
  },
  {
    city: 'pune', key: 'doordarshan-kendra', match: /Doordarshan|DD\s*Sahyadri|दूरदर्शन/i,
    foot: [1, 1], seed: 207, draw: telecomTowerTile, light: G('aerialBeacon', 184, 0.3),
  },
  {
    city: 'pune', key: 'sinhagad-tv-tower', match: /Sinhagad\s*Road\s*TV|TV\s*Tower|Telecom\s*Tower/i,
    foot: [1, 1], seed: 208, draw: telecomTowerTile, light: G('aerialBeacon', 184, 0.3),
  },

  // --- the equestrian/standing civic statues (putlas on plinths) ---
  {
    city: 'pune', key: 'shivaji-equestrian', match: /Shivaji\s*Maharaj\s*Statue|Shivaji\s*Putla|Shivaji\s*Equestrian|शिवाजी\s*महाराज\s*पुतळा/i,
    foot: [1, 1], seed: 209, draw: (s) => statuePlinthTile(s, true), light: G('facadeFlood', 44, 0.5),
  },
  {
    city: 'pune', key: 'tilak-statue', match: /Tilak\s*Statue|Lokmanya\s*Tilak\s*Putla|टिळक\s*पुतळा/i,
    foot: [1, 1], seed: 210, draw: (s) => statuePlinthTile(s, false), light: G('facadeFlood', 44, 0.5),
  },
  {
    city: 'pune', key: 'phule-statue', match: /Jyotiba\s*Phule\s*Statue|Mahatma\s*Phule\s*Putla|फुले\s*पुतळा/i,
    foot: [1, 1], seed: 211, draw: (s) => statuePlinthTile(s, false), light: G('facadeFlood', 44, 0.5),
  },
  {
    city: 'pune', key: 'ambedkar-statue', match: /Ambedkar\s*Statue|Babasaheb\s*Ambedkar\s*Putla|आंबेडकर\s*पुतळा/i,
    foot: [1, 1], seed: 212, draw: (s) => statuePlinthTile(s, false), light: G('facadeFlood', 44, 0.5),
  },
  {
    city: 'pune', key: 'bajirao-equestrian', match: /Bajirao\s*Statue|Bajirao\s*Equestrian|Peshwa\s*Bajirao\s*Putla|बाजीराव\s*पुतळा/i,
    foot: [1, 1], seed: 213, draw: (s) => statuePlinthTile(s, true), light: G('facadeFlood', 44, 0.5),
  },

  // --- the research/history institutes + generic museums (broad civic block) ---
  {
    city: 'pune', key: 'institute', match: /Itihas\s*Sanshodhak|Bhaskaracharya|Agharkar|Research\s*Inst|\bCDAC\b|Centre\s*for\s*Development|Museum|Sangrahalaya|संशोधक/i,
    foot: [1, 1], seed: 100, draw: kelkarMuseumTile, light: G('facadeFlood', 100, 0.6),
  },
  // --- war / civic memorials, watch towers, statues-on-plinths (catch-all) ---
  {
    city: 'pune', key: 'memorial', match: /War\s*Memorial|Memorial|Watch\s*Tower|Chhatrapati\s*Shivaji|Tower|Pillar|Putla|Statue|स्मारक/i,
    foot: [1, 1], seed: 101, draw: memorialTowerTile, light: G('facadeFlood', 142, 0.4),
  },
];
