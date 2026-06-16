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
