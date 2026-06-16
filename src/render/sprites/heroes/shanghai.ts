// Shanghai's bespoke-hero registry — ROUND 1 (docs/heroes/shanghai/ holds 92
// researched landmarks). Each entry resolves a PLACED name from
// src/data/cities/shanghai.ts's `named` list (native Chinese script) to a
// hand-built iso sprite + a bespoke night-electrification light.
//
// Two worlds, two palettes (owner brief):
//  • PUDONG — jade/teal modern glass supertalls across the Huangpu: the
//    Oriental Pearl (pink/grey spheres on splayed tripod legs), Shanghai Tower
//    (the twisting glass megatall — tallest, towers via headroom), Jin Mao (the
//    tiered SOM pagoda), the SWFC "bottle-opener" trapezoid aperture, plus a
//    reusable teal-glass tower for the Lujiazui/Puxi CBD fabric.
//  • THE BUND — grey colonial stone: the Customs House clock ("Big Ching"), the
//    General Post Office dome+colonnade, the Peace Hotel's green pyramid, and a
//    reusable neoclassical waterfront range. Plus Art-Deco brick (Broadway
//    Mansions, Park Hotel, No.1 Dept Store, the Wukang flatiron), curved-eave
//    Chinese temples/pagodas (Longhua, Jade Buddha, Chenxiang), People's-Square
//    civics (the Museum's bronze ding, the Grand Theatre's lifted roof, the
//    China Art Museum's inverted-red dougong, the Power Station chimney), and
//    the concession churches/mosques (St Nicholas' onion, Holy Trinity's spire).
//
// Each builds its silhouette from Iso boxes/prisms/roofs so it reads as the
// real building, with a per-hero size + a distinct electrification light.
//
// SCOPE: this file only. The registry is already wired to import CITY_HEROES.

import type { BespokeHero } from './registry';
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
import { alpha, darken, hex, lighten, mix, type Pt, type RGBA } from '../raster';

// --- shared Shanghai palette --------------------------------------------------
// Pudong jade/teal modern glass:
const JADE = hex('#7fb6ad'); // the teal-green Pudong curtain wall
const JADE_L = hex('#a6d2c9');
const JADE_SKY = hex('#bcdad6'); // pale jade reflecting the dusk sky
const STEELG = hex('#8fa0a8'); // cool silver-grey mullion steel
// The Bund colonial stone (grey, slightly warm):
const BUND = hex('#c7c1b2'); // weathered Bund ashlar
const BUND_D = hex('#a8a392');
const GRANITE = hex('#9a978c'); // dark granite rusticated base
const COPPER = hex('#5f9e86'); // verdigris copper roof (Customs / Post Office)
const DECO = hex('#9a7d63'); // Art-Deco warm brown brick (Broadway / Park Hotel)
const DECO_D = hex('#7c6450');
const PYR_GREEN = hex('#3f7a5e'); // the Peace Hotel's patinated copper pyramid
// Chinese temple:
const TEMPLE_WALL = hex('#c0532f'); // cinnabar temple wall
const TEMPLE_TILE = hex('#6b5440'); // grey-brown glazed roof tile
const GOLD = hex('#d8b24e'); // gilt finial / temple trim
const GOLD_HOT = hex('#f0cf6a');
const JADE_ROOF = hex('#caa64a'); // golden-tiled hall roof (Jade Buddha)

// =====================================================================
// shared primitives
// =====================================================================

/** A sphere (the Pearl tower's signature globes) as nested screen-space rings
 *  at a point. Returns the screen centre. `body` shaded, with a warm sunset
 *  highlight crescent toward the upper-right. */
function sphereAt(
  iso: Iso,
  cx: number,
  cy: number,
  z: number,
  rPx: number,
  body: RGBA,
): Pt {
  const [sx, sy] = iso.P(cx, cy, z);
  const ring = (s: number, oxr = 0, oyr = 0): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      pts.push([sx + oxr + Math.cos(a) * rPx * s, sy + oyr + Math.sin(a) * rPx * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), shaded(body, 0.12));
  // sunlit crescent toward upper-right
  iso.r.poly(ring(0.82, rPx * 0.16, -rPx * 0.16), lit(body, 0.1));
  iso.r.poly(ring(0.42, rPx * 0.28, -rPx * 0.3), top(body, 0.22));
  iso.r.polyline(ring(1), INK_W * 0.7, INK, true);
  return [sx, sy];
}

/** A run of slim columns (a colonnade) on the LEFT face at fixed v, from zBase
 *  up to zTop, between u positions. */
function colonnade(
  iso: Iso,
  v: number,
  uA: number,
  uB: number,
  zBase: number,
  zTop: number,
  n: number,
  col: RGBA,
): void {
  for (let i = 0; i <= n; i++) {
    const u = uA + ((uB - uA) * i) / n;
    iso.r.poly(
      [iso.P(u - 0.012, v, zTop), iso.P(u + 0.012, v, zTop), iso.P(u + 0.012, v, zBase), iso.P(u - 0.012, v, zBase)],
      i % 2 ? col : lighten(col, 0.08),
    );
  }
}

/** A glowing curtain-wall grid (Pudong glass): faint floor + mullion lines and
 *  a few warm lit offices on the LEFT (v1) and RIGHT (u1) faces of a box. */
function glassSkin(
  iso: Iso,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  seedish: number,
): void {
  const floors = Math.max(5, Math.round((z1 - z0) / 11));
  for (let f = 1; f < floors; f++) {
    const z = z0 + (f * (z1 - z0)) / floors;
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.white, 0.22));
    iso.r.line(iso.P(u1, v0, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.white, 0.16));
    // a couple of warm lit windows per band (deterministic)
    const h = Math.sin((f + seedish) * 12.9898) * 43758.5453;
    if (h - Math.floor(h) > 0.6) {
      const t = (h * 7) % 1;
      const u = u0 + 0.12 + t * (u1 - u0 - 0.24);
      iso.r.poly(
        [iso.P(u, v1, z + 4), iso.P(u + 0.12, v1, z + 4), iso.P(u + 0.12, v1, z + 1), iso.P(u, v1, z + 1)],
        alpha(COLORS.glassLit, 0.8),
      );
    }
  }
}

// =====================================================================
// ORIENTAL PEARL TOWER — the city's signature: three big PINK/grey spheres
// threaded on a slim shaft that splays into a tripod of three angled legs at the
// base; smaller upper spheres + a needle antenna on top. 468 m — towers. 3×3
// with open plaza (it stands in a riverside park). PINK glass spheres.
// =====================================================================
function orientalPearlTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 360 });
  void seed;
  const PINK = hex('#d98aa0'); // the famous rose-pink spheres
  const SHAFT = hex('#b9c2cc'); // pale grey concrete columns
  const cx = 1.5, cy = 1.5;
  iso.shadow(cx - 0.7, cy - 0.5, cx + 0.7, cy + 0.7, 0.4, 0.22);
  // small plaza disc
  iso.r.poly(
    [iso.P(cx - 0.9, cy, 0), iso.P(cx, cy + 0.9, 0), iso.P(cx + 0.9, cy, 0), iso.P(cx, cy - 0.9, 0)],
    shaded(COLORS.grass, 0.12),
  );
  // THE TRIPOD LEGS: three splayed slanted columns from the ground up to the
  // lower sphere. Drawn as tapered quads so they read as angled pylons.
  const legTop = 96; // where legs meet the shaft
  const legFeet: Array<[number, number]> = [
    [cx - 0.42, cy + 0.42],
    [cx + 0.46, cy + 0.18],
    [cx - 0.02, cy - 0.46],
  ];
  for (const [fu, fv] of legFeet) {
    const b0 = iso.P(fu - 0.07, fv, 0);
    const b1 = iso.P(fu + 0.07, fv, 0);
    const t0 = iso.P(cx - 0.05, cy, legTop);
    const t1 = iso.P(cx + 0.05, cy, legTop);
    iso.r.poly([b0, b1, t1, t0], shaded(SHAFT, 0.16), lit(SHAFT, 0.06));
    iso.r.polyline([b0, t0, t1, b1], INK_W * 0.7, INK);
  }
  // the central shaft (two stacked columns through the spheres)
  iso.box(cx - 0.07, cy - 0.07, cx + 0.07, cy + 0.07, 0, 250, SHAFT);
  // LOWER big sphere (the largest), the upper sphere, and the small top pod
  sphereAt(iso, cx, cy, 118, 0.5 * (CELL_W / 2), PINK);
  // mid "spacer" small spheres on the shaft
  sphereAt(iso, cx, cy, 168, 0.14 * (CELL_W / 2), PINK);
  sphereAt(iso, cx, cy, 196, 0.34 * (CELL_W / 2), PINK); // upper sphere
  // top observation pod + needle
  sphereAt(iso, cx, cy, 250, 0.16 * (CELL_W / 2), PINK);
  const [nx, nyB] = iso.P(cx, cy, 258);
  iso.r.line([nx, nyB], [nx, nyB - 40 * RES], 1.8 * RES, STEELG);
  iso.r.line([nx, nyB - 34 * RES], [nx, nyB - 42 * RES], 3 * RES, GOLD_HOT);
  return iso.build();
}

// =====================================================================
// SHANGHAI TOWER — the 632 m twisting glass megatall (the tallest in China):
// a rounded-triangular prism that ROTATES ~120° as it rises, sheathed in a
// double-skin transparent jade-green curtain wall, tapering to a soft top.
// Drawn as a stack of progressively rotated/shrunk plates so the silhouette
// spirals. 3×3, the city's headroom champion. JADE glass.
// =====================================================================
function shanghaiTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 470 });
  void seed;
  const cx = 1.5, cy = 1.5;
  const H = 432; // exaggerated hero height
  const R0 = 0.62; // base radius in tile units
  const [gx, gyB] = iso.P(cx, cy, 0);
  iso.shadow(cx - 0.7, cy - 0.5, cx + 0.7, cy + 0.7, 0.4, 0.22);
  const SKY = JADE_SKY, SUN = lit(JADE, 0.12), SHA = shaded(JADE, 0.16);
  // rounded-triangle vertex offsets (screen space), rotated by `rot`
  const triPt = (rot: number, rad: number, k: number): Pt => {
    const a = rot + (k / 3) * Math.PI * 2;
    return [gx + Math.cos(a) * rad * (CELL_W / 2), gyB + Math.sin(a) * rad * (CELL_W / 2) * 0.5];
  };
  const STEPS = 26;
  for (let s = 0; s < STEPS; s++) {
    const t0 = s / STEPS, t1 = (s + 1) / STEPS;
    const yz0 = -t0 * H * RES, yz1 = -t1 * H * RES;
    const rot0 = t0 * 2.4, rot1 = t1 * 2.4; // ~137° total twist
    const rad0 = R0 * (1 - 0.42 * t0), rad1 = R0 * (1 - 0.42 * t1);
    for (let k = 0; k < 3; k++) {
      const a0 = triPt(rot0, rad0, k);
      const a0b = triPt(rot0, rad0, k + 1);
      const a1 = triPt(rot1, rad1, k);
      const a1b = triPt(rot1, rad1, k + 1);
      // shade each of the three faces differently; cycle so the twist catches light
      const phase = (rot0 + (k / 3) * Math.PI * 2) % (Math.PI * 2);
      const face = phase < 2.1 ? SUN : phase < 4.2 ? SKY : SHA;
      iso.r.poly(
        [[a0[0], gyB + yz0 - (gyB - a0[1])], [a0b[0], gyB + yz0 - (gyB - a0b[1])],
         [a1b[0], gyB + yz1 - (gyB - a1b[1])], [a1[0], gyB + yz1 - (gyB - a1[1])]],
        face,
      );
    }
  }
  // a soft vertical seam line spiralling up the leading edge + faint floor bands
  let prev: Pt | null = null;
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const p = triPt(t * 2.4, R0 * (1 - 0.42 * t), 0);
    const pt: Pt = [p[0], gyB - t * H * RES - (gyB - p[1])];
    if (prev) iso.r.line(prev, pt, INK_W * 0.6, alpha(INK, 0.5));
    prev = pt;
  }
  // crisp silhouette ink down the two outer screen edges (sample extreme x)
  // soft rounded crown cap
  const capY = gyB - H * RES;
  iso.r.poly(
    [[gx - 7 * RES, capY + 6 * RES], [gx + 7 * RES, capY + 6 * RES], [gx + 3 * RES, capY - 6 * RES], [gx - 3 * RES, capY - 6 * RES]],
    top(JADE_L, 0.2),
  );
  iso.glint([gx, capY], 3 * RES);
  return iso.build();
}

// =====================================================================
// JIN MAO TOWER — the 421 m SOM pagoda: a stepped, tapering octagonal shaft
// whose setbacks accelerate toward the top in a pagoda rhythm, in silver-grey
// metal & glass, capped by a slim crown + mast. 3×3. SILVER/jade.
// =====================================================================
function jinMaoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 420 });
  void seed;
  const cx = 1.5, cy = 1.5;
  const SILV = hex('#aab6bd'); // brushed silver-grey
  iso.shadow(cx - 0.7, cy - 0.5, cx + 0.7, cy + 0.7, 0.4, 0.22);
  iso.box(cx - 0.78, cy - 0.78, cx + 0.78, cy + 0.78, 0, 18, shaded(SILV, 0.14), { ink: false }); // podium
  // 13 diminishing setback segments accelerating upward (the pagoda profile)
  const segs = 13;
  let z = 18;
  let half = 0.62;
  for (let i = 0; i < segs; i++) {
    const segH = 24 + i * 2.2; // taller bands lower, but tighter steps up top
    const z1 = z + segH;
    const body = mix(SILV, JADE_SKY, 0.18 + 0.02 * i);
    iso.box(cx - half, cy - half, cx + half, cy + half, z, z1, body);
    // glazing on the two visible faces
    glassSkin(iso, cx - half, cy - half, cx + half, cy + half, z, z1, i * 3 + 1);
    // a tiny ledge cornice at each setback (the pagoda "eave")
    iso.box(cx - half - 0.03, cy - half - 0.03, cx + half + 0.03, cy + half + 0.03, z1, z1 + 2.5, lighten(SILV, 0.08), { ink: false });
    z = z1 + 2.5;
    half *= 0.93; // accelerate the taper near the top
    if (i > 7) half *= 0.97;
  }
  // slim crown lantern + antenna mast
  iso.box(cx - 0.12, cy - 0.12, cx + 0.12, cy + 0.12, z, z + 26, lighten(SILV, 0.1));
  const [mx, myB] = iso.P(cx, cy, z + 26);
  iso.r.line([mx, myB], [mx, myB - 42 * RES], 1.8 * RES, STEELG);
  iso.r.line([mx, myB - 36 * RES], [mx, myB - 44 * RES], 3 * RES, GOLD_HOT);
  return iso.build();
}

// =====================================================================
// SHANGHAI WORLD FINANCIAL CENTER — the 492 m "bottle opener": a flat tapering
// trapezoid slab, square at the base, narrowing to a thin top edge, pierced by
// a huge TRAPEZOIDAL APERTURE near the crown. 2×2, very tall. Dark teal glass.
// =====================================================================
function swfcTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 430 });
  void seed;
  const GL = hex('#3d5b62'); // dark teal-green glass
  const GL_SUN = hex('#5e8489');
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  const H = 408;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  const cx = 1.0, cy = 1.0;
  // The slab tapers: the two broad faces converge to a thin top. Build the
  // front-left and right faces as trapezoids that pinch toward the crown.
  const topPinch = 0.16; // top half-width fraction
  const fL = (t: number): number => 0.5 - (0.5 - topPinch) * t; // half-extent in u at height fraction t
  // left (v1) face
  const lL0 = iso.P(cx - fL(0), v1, 0);
  const lR0 = iso.P(cx + fL(0), v1, 0);
  const lL1 = iso.P(cx - fL(1), v1, H);
  const lR1 = iso.P(cx + fL(1), v1, H);
  iso.r.poly([lL1, lR1, lR0, lL0], shaded(GL, 0.06), lit(GL, 0.04));
  // right (u1) face
  const rB0 = iso.P(u1, cy + fL(0), 0);
  const rF0 = iso.P(u1, cy - fL(0), 0);
  const rB1 = iso.P(u1, cy + fL(1), H);
  const rF1 = iso.P(u1, cy - fL(1), H);
  iso.r.poly([rF1, rB1, rB0, rF0], GL_SUN);
  // floor bands across the left face
  for (let f = 1; f < 30; f++) {
    const t = f / 30;
    iso.r.line(
      iso.P(cx - fL(t), v1, t * H), iso.P(cx + fL(t), v1, t * H), 0.45 * RES, alpha(COLORS.white, 0.16),
    );
  }
  // THE APERTURE: a trapezoid hole punched near the top (z ~0.78..0.95 H).
  const ap = (t: number, k: number): Pt => {
    const w = fL(t) * 0.62 * k; // narrower than the slab
    return iso.P(cx - w, v1, t * H);
  };
  const apR = (t: number, k: number): Pt => {
    const w = fL(t) * 0.62 * k;
    return iso.P(cx + w, v1, t * H);
  };
  iso.r.poly([ap(0.79, 1), apR(0.79, 1), apR(0.95, 1), ap(0.95, 1)], hex('#0f1d22'));
  // a thin lit rim around the aperture (the night-lit trapezoid edge)
  iso.r.polyline([ap(0.79, 1), apR(0.79, 1), apR(0.95, 1), ap(0.95, 1)], 0.9 * RES, alpha(COLORS.glassLit, 0.6), true);
  // crisp silhouette ink: the pinched top edge + outer verticals
  iso.r.polyline([lL0, lL1, lR1, lR0], INK_W, INK);
  iso.r.line(lR1, rF1, INK_W, INK);
  iso.r.line(iso.P(u1, cy - fL(1), H), iso.P(u1, cy - fL(0), 0), INK_W, INK);
  // a couple of warm lit offices low-down
  glassSkin(iso, cx - 0.3, v1, cx + 0.3, v1, 6, H * 0.7, 9);
  return iso.build();
}

// =====================================================================
// SHANGHAI SCIENCE & TECHNOLOGY MUSEUM (上海科技馆) — a vast curving glass-
// and-steel building with a great transparent SPHERE/atrium cradled in a swept
// arc of curtain wall. 5×5 monster. Teal glass.
// =====================================================================
function scienceMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.5, u1 = 4.5, v0 = 0.5, v1 = 4.5;
  const cx = 2.5, cy = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.2);
  // two swept low wings flanking a central glazed atrium
  iso.box(u0, v0, u1, v0 + 1.0, 0, 40, shaded(JADE, 0.06), { ink: true });
  iso.box(u0, v1 - 1.0, u1, v1, 0, 40, shaded(JADE, 0.06), { ink: true });
  iso.box(u0, v0 + 1.0, u0 + 1.0, v1 - 1.0, 0, 46, JADE);
  iso.box(u1 - 1.0, v0 + 1.0, u1, v1 - 1.0, 0, 46, JADE);
  glassSkin(iso, u0, v0, u1, v0 + 1.0, 4, 38, 2);
  // the big transparent sphere in the central court
  const [sx, syB] = iso.P(cx, cy, 0);
  const R = 1.05 * (CELL_W / 2);
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([sx + Math.cos(a) * R * s, syB - R * 0.92 + Math.sin(a) * R * 0.92 * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), alpha(JADE_SKY, 0.55), alpha(shaded(JADE, 0.1), 0.5));
  // a few latitude/longitude wires on the sphere
  for (let k = 1; k < 4; k++) {
    iso.r.line([sx - R, syB - R * 0.92], [sx + R, syB - R * 0.92], 0.4 * RES, alpha(COLORS.white, 0.3));
  }
  for (let k = -2; k <= 2; k++) {
    iso.r.line([sx + (k / 3) * R, syB - R * 0.1], [sx + (k / 3) * R, syB - R * 1.8], 0.4 * RES, alpha(COLORS.white, 0.25));
  }
  iso.r.polyline(ring(1), INK_W * 0.8, alpha(INK, 0.7), true);
  iso.glint([sx + R * 0.3, syB - R * 1.2], 3 * RES);
  return iso.build();
}

// =====================================================================
// THE BUND — CUSTOMS HOUSE (上海海关): a granite neoclassical block with a
// rusticated colonnaded base and the famous square CLOCK TOWER ("Big Ching")
// rising above, topped by a stepped tower lantern. 1×1, towers via headroom.
// =====================================================================
function customsHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const u0 = 0.12, u1 = 0.88, v0 = 0.12, v1 = 0.88;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  // the broad stone office block
  iso.box(u0, v0, u1, v1, 0, 56, BUND);
  // rusticated granite base + Doric colonnade across the front
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, GRANITE, { ink: false });
  colonnade(iso, v1, u0 + 0.08, u1 - 0.08, 14, 30, 7, COLORS.white);
  // cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 56, 60, lighten(BUND, 0.08), { topC: top(BUND, 0.3) });
  // the square CLOCK TOWER rising over the rear-centre
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.04;
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 60, 132, BUND_D);
  // clock faces on the two visible sides
  for (const [fu, fv, side] of [[cx, cy + 0.18, 'L'], [cx + 0.18, cy, 'R']] as const) {
    const [clx, cly] = iso.P(fu, fv, 118);
    const RR = 3.6 * RES;
    const ring: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]);
    }
    iso.r.poly(ring, COLORS.white);
    iso.r.polyline(ring, INK_W * 0.6, INK, true);
    iso.r.line([clx, cly], [clx, cly - 2.4 * RES], 0.9 * RES, INK);
    iso.r.line([clx, cly], [clx + (side === 'R' ? 1.6 : -1.6) * RES, cly], 0.9 * RES, INK);
  }
  // stepped tower lantern + flagpole (the customs beacon)
  iso.box(cx - 0.14, cy - 0.14, cx + 0.14, cy + 0.14, 132, 146, lighten(BUND, 0.05));
  iso.box(cx - 0.09, cy - 0.09, cx + 0.09, cy + 0.09, 146, 158, GRANITE, { ink: false });
  const [px, pyB] = iso.P(cx, cy, 158);
  iso.r.line([px, pyB], [px, pyB - 18 * RES], 1.2 * RES, STEELG);
  return iso.build();
}

// =====================================================================
// THE BUND — GENERAL POST OFFICE (上海邮政总局大楼): a monumental 1924 block
// with a giant Corinthian colonnaded front, a tall clock-tower with a green
// COPPER baroque cupola, and sculptural figures. 3×3. Bund stone + copper.
// =====================================================================
function postOfficeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 180 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, 64, BUND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, GRANITE, { ink: false });
  // giant colonnade across the long front
  colonnade(iso, v1, u0 + 0.14, u1 - 0.14, 16, 56, 18, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 64, 68, lighten(BUND, 0.08), { topC: top(BUND, 0.3) });
  // the clock tower with a green copper baroque cupola, set toward one end
  const cx = u0 + 0.7, cy = (v0 + v1) / 2 - 0.1;
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 64, 120, BUND_D);
  // little colonnaded belfry stage
  colonnade(iso, cy + 0.2, cx - 0.16, cx + 0.16, 120, 134, 4, COLORS.white);
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 134, 138, lighten(BUND, 0.06), { ink: false });
  // green copper dome (a stack of arcs) + lantern + finial
  const [dx, dyB] = iso.P(cx, cy, 138);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    const rPx = 0.22 * (CELL_W / 2);
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      pts.push([dx + Math.cos(a) * rPx * s, dyB - Math.sin(a) * rPx * 1.4 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(COPPER, 0.08), lit(COPPER, 0.06));
  iso.r.polyline(dome(1), INK_W * 0.7, INK);
  const ty = dyB - 0.22 * (CELL_W / 2) * 1.4;
  iso.r.rect(dx - 2 * RES, ty - 5 * RES, dx + 2 * RES, ty + 1 * RES, lighten(BUND, 0.1));
  iso.r.line([dx, ty - 5 * RES], [dx, ty - 16 * RES], 1.2 * RES, GOLD_HOT);
  return iso.build();
}

// =====================================================================
// THE BUND — neoclassical waterfront RANGE (reusable): a grey-stone colonial
// block with a rusticated base, a giant order of pilasters/columns on the
// piano nobile, a balustraded cornice, and (optionally) a corner dome or a
// low pediment. Serves the Bund row: 罗斯福/外滩27 (former Jardine), 有利大楼
// (Union), 外滩史陈列室, 香港上海… style banks. `domed` adds a small cupola.
// 2×2.
// =====================================================================
function bundRangeTile(seed: number, domed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: domed ? 120 : 80 });
  void seed;
  const u0 = 0.38, u1 = 1.62, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, 52, BUND);
  // rusticated granite ground + first floor
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 16, GRANITE, { ink: false });
  // giant order of engaged columns on the front
  colonnade(iso, v1, u0 + 0.1, u1 - 0.1, 16, 44, 12, COLORS.white);
  // window rows on the right face
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 18, 46, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // balustraded cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 52, 57, lighten(BUND, 0.08), { topC: top(BUND, 0.3) });
  for (let i = 0; i <= 12; i++) {
    const u = u0 + ((u1 - u0) * i) / 12;
    iso.r.line(iso.P(u, v1 + 0.03, 52), iso.P(u, v1 + 0.03, 57), 0.7 * RES, alpha(BUND_D, 0.7));
  }
  if (domed) {
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
    iso.box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, 57, 64, lighten(BUND, 0.04));
    const [dx, dyB] = iso.P(cx, cy, 64);
    const rPx = 0.2 * (CELL_W / 2);
    const dome: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.25]);
    }
    iso.r.poly(dome, shaded(COPPER, 0.08), lit(COPPER, 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    const ty = dyB - rPx * 1.25;
    iso.r.line([dx, ty], [dx, ty - 9 * RES], 1 * RES, GOLD_HOT);
  }
  return iso.build();
}

// =====================================================================
// THE BUND — PEACE HOTEL / PALACE (和平饭店南楼): the granite Art-Deco-meets-
// neoclassical block crowned by the unmistakable green PYRAMID copper roof
// (Sassoon House). 3×3, headroom for the pyramid spike. Granite + green pyramid.
// =====================================================================
function peaceHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 160 });
  void seed;
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the tall granite block
  iso.box(u0, v0, u1, v1, 0, 96, mix(BUND, GRANITE, 0.4));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, GRANITE, { ink: false });
  // strong vertical Deco window mullions on both faces
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 16, 90, 14, alpha(COLORS.glassDark, 0.85), lighten(GRANITE, 0.1));
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 16, 90, 12, alpha(COLORS.glassDark, 0.85), lighten(GRANITE, 0.1));
  // set-back attic
  iso.box(u0 + 0.24, v0 + 0.24, u1 - 0.24, v1 - 0.24, 96, 108, lighten(GRANITE, 0.06));
  // THE GREEN COPPER PYRAMID ROOF (the signature)
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  const apex = iso.P(cx, cy, 168);
  const c0 = iso.P(u0 + 0.24, v1 - 0.24, 108);
  const c1 = iso.P(u1 - 0.24, v1 - 0.24, 108);
  const c2 = iso.P(u1 - 0.24, v0 + 0.24, 108);
  iso.r.poly([c0, c1, apex], shaded(PYR_GREEN, 0.06));
  iso.r.poly([c1, c2, apex], lit(PYR_GREEN, 0.08));
  iso.r.polyline([c0, apex, c2], INK_W, INK);
  iso.r.polyline([c0, c1, c2], INK_W * 0.8, INK);
  // ridge highlight + finial
  iso.r.line(c1, apex, 0.7 * RES, alpha(COLORS.white, 0.4));
  iso.r.line([apex[0], apex[1]], [apex[0], apex[1] - 8 * RES], 1.2 * RES, GOLD_HOT);
  return iso.build();
}

// =====================================================================
// ART DECO TOWER (reusable) — a stepped, ziggurat-crowned brown-brick tower:
// the 1930s Shanghai deco family. Serves Broadway Mansions (上海大厦), Park
// Hotel (国际饭店), Pacific Hotel, etc. `tall` for Park Hotel's slim dark
// stepped shaft, otherwise Broadway's broader massed E-plan block. 2×2.
// =====================================================================
function decoTowerTile(seed: number, tall: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: tall ? 230 : 150 });
  void seed;
  const brick = tall ? hex('#5d5247') : DECO; // Park Hotel is a darker shaft
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  const baseH = tall ? 150 : 84;
  iso.box(u0, v0, u1, v1, 0, baseH, brick);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, DECO_D, { ink: false });
  // strong vertical piers between window strips (the Deco emphasis)
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 12, baseH - 6, tall ? 8 : 10, alpha(COLORS.glassDark, 0.82), lighten(brick, 0.12));
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 12, baseH - 6, tall ? 7 : 9, alpha(COLORS.glassDark, 0.82), lighten(brick, 0.12));
  // ziggurat setbacks crowning the tower
  let z = baseH, hw = 0.5, hd = 0.5;
  const steps = tall ? 5 : 3;
  for (let i = 0; i < steps; i++) {
    hw *= 0.78; hd *= 0.78;
    const z1 = z + (tall ? 16 : 12);
    iso.box(1.0 - hw, 1.0 - hd, 1.0 + hw, 1.0 + hd, z, z1, lighten(brick, 0.04 + 0.03 * i));
    z = z1;
  }
  // a slim crown finial / flagpole
  const [fx, fyB] = iso.P(1.0, 1.0, z);
  iso.r.line([fx, fyB], [fx, fyB - (tall ? 22 : 14) * RES], 1.3 * RES, STEELG);
  return iso.build();
}

// =====================================================================
// WUKANG MANSION (武康大楼) — the French-Renaissance "flatiron": a long ship-
// prow apartment block coming to a rounded point, brown brick with white
// banding and a steep mansard. 2×2 (drawn as a wedge). Brick + cream.
// =====================================================================
function wukangTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const BR = hex('#9c6a4e'); // warm Normandie brick
  const CR = hex('#d8cdb6'); // cream string-course bands
  // a wedge: wide at the back (v0), narrowing to a prow at the front corner.
  const backU0 = 0.5, backU1 = 1.5, v0 = 0.55, v1 = 1.5;
  iso.shadow(backU0, v0, backU1, v1, 0.22, 0.22);
  const H = 64;
  // build the body as two converging boxes toward a prow at (1.0, v1)
  iso.box(backU0, v0, 1.02, v1, 0, H, BR);
  iso.box(0.98, v0, backU1, v1, 0, H, lit(BR, 0.04));
  // cream banding (two horizontal string courses)
  for (const z of [22, 44] as const) {
    iso.box(backU0 - 0.01, v0 - 0.01, backU1 + 0.01, v1 + 0.01, z, z + 3, CR, { ink: false });
  }
  // rows of windows
  iso.windowsLeft(v1, backU0 + 0.06, backU1 - 0.06, 8, H - 6, 9, alpha(COLORS.glassDark, 0.82), CR);
  // steep grey mansard roof
  iso.gable(backU0, v0, backU1, v1, H, 16, 'v', hex('#54585f'), CR);
  // the rounded prow accent at the front corner
  const [px, pyB] = iso.P(1.0, v1, 0);
  iso.r.poly([[px - 5 * RES, pyB], [px + 5 * RES, pyB], [px + 5 * RES, pyB - H * 1.6 * RES], [px - 5 * RES, pyB - H * 1.6 * RES]], lit(BR, 0.06));
  iso.r.line([px, pyB], [px, pyB - H * 1.6 * RES], 0.8 * RES, alpha(CR, 0.5));
  return iso.build();
}

// =====================================================================
// SHANGHAI No.1 DEPARTMENT STORE (上海市第一百货商店) — a 1934 Art-Deco
// department store: a rounded corner block with horizontal banding, a small
// stepped corner tower. 2×2. Cream stone.
// =====================================================================
function deptStoreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#cfc4ad');
  const u0 = 0.45, u1 = 1.55, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 60, ST);
  // horizontal Deco banding
  for (let z = 12; z < 58; z += 11) {
    iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 2, lighten(ST, 0.1), { ink: false });
  }
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 6, 54, 10, alpha(COLORS.glassLit, 0.5), COLORS.white);
  // a stepped corner tower at the rounded corner (u1,v1)
  iso.box(u1 - 0.34, v1 - 0.34, u1, v1, 60, 78, lighten(ST, 0.04));
  iso.box(u1 - 0.26, v1 - 0.26, u1 - 0.04, v1 - 0.04, 78, 90, ST);
  const [fx, fyB] = iso.P(u1 - 0.15, v1 - 0.15, 90);
  iso.r.line([fx, fyB], [fx, fyB - 14 * RES], 1.2 * RES, STEELG);
  return iso.build();
}

// =====================================================================
// SIHANG WAREHOUSE (四行仓库) — the heroic 1930s reinforced-concrete warehouse
// (the 1937 defence): a big, plain, fortress-like grey block, flat roof,
// regular small windows, battle-scarred west wall. 3×3. Grey concrete.
// =====================================================================
function sihangTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const CONC = hex('#9d978b');
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, 64, CONC);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, darken(CONC, 0.1), { ink: false });
  // regular grid of small windows on both faces
  for (let f = 0; f < 5; f++) {
    const zb = 10 + f * 11, zt = zb + 7;
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 11, alpha(COLORS.glassDark, 0.8), darken(CONC, 0.06));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 10, alpha(COLORS.glassDark, 0.8), darken(CONC, 0.06));
  }
  // parapet + a flag (the defenders' flag)
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 64, 68, lighten(CONC, 0.06));
  const [fx, fyB] = iso.P(u0 + 0.3, v1 - 0.3, 68);
  iso.r.line([fx, fyB], [fx, fyB - 18 * RES], 1.2 * RES, INK);
  iso.r.poly([[fx, fyB - 18 * RES], [fx + 9 * RES, fyB - 15 * RES], [fx, fyB - 12 * RES]], COLORS.orange);
  return iso.build();
}

// =====================================================================
// LONGHUA PAGODA (龙华塔) — the 44 m octagonal brick-and-timber Song pagoda:
// seven diminishing storeys, each with upturned eaves hung with bells, a brick
// core with timber balconies, capped by a tall gilt finial. 2×2, headroom.
// Cinnabar + grey-tile.
// =====================================================================
function longhuaPagodaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 240 });
  void seed;
  const cx = 1.0, cy = 1.0;
  iso.shadow(cx - 0.4, cy - 0.3, cx + 0.4, cy + 0.45, 0.26, 0.24);
  // stone plinth
  iso.box(cx - 0.4, cy - 0.4, cx + 0.4, cy + 0.4, 0, 8, GRANITE, { ink: false });
  const tiers = 7;
  let z = 8;
  let half = 0.32;
  for (let i = 0; i < tiers; i++) {
    const bodyH = 22 - i * 1.4;
    const z1 = z + bodyH;
    // the cinnabar brick body of the storey
    iso.box(cx - half, cy - half, cx + half, cy + half, z, z1, TEMPLE_WALL);
    // a vertical window slit per visible face
    iso.r.poly([iso.P(cx, cy + half, z + 3), iso.P(cx + 0.04, cy + half, z + 3), iso.P(cx + 0.04, cy + half, z1 - 3), iso.P(cx, cy + half, z1 - 3)], hex('#2a1d18'));
    // upturned EAVES: a wide flat roof ring with corners flicked up
    const eHalf = half + 0.16;
    const [lx, lyB] = iso.P(cx - eHalf, cy + eHalf, z1);
    const [fx, fyB] = iso.P(cx + eHalf, cy + eHalf, z1);
    const [rx, ryB] = iso.P(cx + eHalf, cy - eHalf, z1);
    const [bx, byB] = iso.P(cx - eHalf, cy - eHalf, z1);
    const flick = 4 * RES;
    iso.r.poly(
      [[lx, lyB - flick], [fx, fyB - flick], [rx, ryB - flick], [bx, byB - flick],
       iso.P(cx, cy, z1 + 5)],
      shaded(TEMPLE_TILE, 0.06), lit(TEMPLE_TILE, 0.06),
    );
    // the flicked-up corner ridges
    for (const [ex, ey] of [[lx, lyB], [fx, fyB], [rx, ryB]] as const) {
      iso.r.line([ex, ey], [ex, ey - flick - 3 * RES], 1 * RES, GOLD);
    }
    iso.r.polyline([[lx, lyB - flick], [fx, fyB - flick], [rx, ryB - flick]], INK_W * 0.7, INK);
    z = z1 + 4;
    half *= 0.88;
  }
  // tall gilt finial spire with rings (the sōrin)
  const [tx, tyB] = iso.P(cx, cy, z);
  iso.r.line([tx, tyB], [tx, tyB - 30 * RES], 1.6 * RES, GOLD);
  for (let k = 1; k <= 4; k++) {
    iso.r.line([tx - 2.2 * RES, tyB - k * 6 * RES], [tx + 2.2 * RES, tyB - k * 6 * RES], 1 * RES, GOLD_HOT);
  }
  return iso.build();
}

// =====================================================================
// CHINESE TEMPLE HALL (reusable) — a curved-eave Buddhist hall: a low body
// with a great hip-and-gable upturned roof on timber brackets, cinnabar walls.
// `gold` swaps the grey tile for golden glazed tiles (Jade Buddha / Longhua
// monastery main hall). Serves 龙华寺, 玉佛禅寺, 沉香阁. 2×2.
// =====================================================================
function templeHallTile(seed: number, gold: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const roofC = gold ? JADE_ROOF : TEMPLE_TILE;
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  // stone terrace
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, GRANITE, { ink: false });
  // cinnabar hall body
  iso.box(u0, v0, u1, v1, 8, 44, TEMPLE_WALL);
  // a row of round timber columns across the front veranda
  colonnade(iso, v1, u0 + 0.08, u1 - 0.08, 8, 42, 8, lit(hex('#7a3a24'), 0.1));
  // golden trim band under the eaves
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 44, 48, GOLD, { topC: top(GOLD, 0.2), ink: false });
  // the great sweeping double-eave roof: a broad low gable with flicked corners
  const ridgeRise = 30;
  const eaveOver = 0.22;
  const um = (u0 + u1) / 2;
  // lower roof (overhanging eave)
  const eL = iso.P(u0 - eaveOver, v1 + eaveOver, 48);
  const eF = iso.P(u1 + eaveOver, v1 + eaveOver, 48);
  const eR = iso.P(u1 + eaveOver, v0 - eaveOver, 48);
  const ridgeF = iso.P(um, v1 + eaveOver, 48 + ridgeRise);
  const ridgeB = iso.P(um, v0 - eaveOver, 48 + ridgeRise);
  iso.r.poly([eL, eF, ridgeF, ridgeB], shaded(roofC, 0.06));
  iso.r.poly([eF, eR, ridgeB, ridgeF], lit(roofC, 0.08));
  // flick the front corners up
  iso.r.line([eL[0], eL[1]], [eL[0] - 3 * RES, eL[1] - 5 * RES], 1.4 * RES, gold ? GOLD_HOT : lit(roofC, 0.1));
  iso.r.line([eF[0], eF[1]], [eF[0] + 3 * RES, eF[1] - 5 * RES], 1.4 * RES, gold ? GOLD_HOT : lit(roofC, 0.1));
  // ridge + the two ridge-end ornaments (chiwen)
  iso.r.polyline([ridgeB, ridgeF], INK_W, INK);
  iso.r.line([ridgeF[0], ridgeF[1]], [ridgeF[0], ridgeF[1] - 5 * RES], 1.4 * RES, GOLD);
  iso.r.line([ridgeB[0], ridgeB[1]], [ridgeB[0], ridgeB[1] - 5 * RES], 1.4 * RES, GOLD);
  iso.r.polyline([eL, eF, eR], INK_W * 0.8, INK);
  iso.r.polyline([eL, ridgeB], INK_W * 0.6, alpha(INK, 0.6));
  return iso.build();
}

// =====================================================================
// CHENXIANG PAVILION (沉香阁) — a small two-storey Buddhist pavilion (nunnery):
// a square cinnabar tower with two tiers of upturned eaves and a gilded
// hip-roof crown. 2×2, modest headroom. Cinnabar + gold tile.
// =====================================================================
function chenxiangTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const cx = 1.0, cy = 1.0;
  iso.shadow(cx - 0.4, cy - 0.35, cx + 0.4, cy + 0.45, 0.24, 0.24);
  iso.box(cx - 0.42, cy - 0.42, cx + 0.42, cy + 0.42, 0, 6, GRANITE, { ink: false });
  // two diminishing storeys, each with an eave
  const eave = (z: number, half: number): void => {
    const eHalf = half + 0.18;
    const apex = iso.P(cx, cy, z + 16);
    const c0 = iso.P(cx - eHalf, cy + eHalf, z);
    const c1 = iso.P(cx + eHalf, cy + eHalf, z);
    const c2 = iso.P(cx + eHalf, cy - eHalf, z);
    iso.r.poly([c0, c1, apex], shaded(JADE_ROOF, 0.06));
    iso.r.poly([c1, c2, apex], lit(JADE_ROOF, 0.08));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
    for (const [ex, ey] of [[c0[0], c0[1]], [c1[0], c1[1]]] as const) {
      iso.r.line([ex, ey], [ex, ey - 4 * RES], 1.2 * RES, GOLD_HOT);
    }
  };
  iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 6, 40, TEMPLE_WALL);
  eave(40, 0.34);
  iso.box(cx - 0.24, cy - 0.24, cx + 0.24, cy + 0.24, 52, 78, TEMPLE_WALL);
  eave(78, 0.24);
  const [tx, tyB] = iso.P(cx, cy, 94);
  iso.r.line([tx, tyB], [tx, tyB - 10 * RES], 1.4 * RES, GOLD);
  return iso.build();
}

// =====================================================================
// DAJING GE PAVILION (大境阁) — the last fragment of the Old City WALL with a
// temple pavilion riding on top: a thick grey rampart with a small curved-eave
// hall above. 2×2. Grey brick wall + cinnabar pavilion.
// =====================================================================
function dajingGeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const WALLC = hex('#8c8579');
  const u0 = 0.36, u1 = 1.64, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the thick city-wall rampart (battered, slightly tapering)
  iso.box(u0, v0, u1, v1, 0, 30, WALLC);
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 30, 34, lighten(WALLC, 0.06), { ink: false });
  // crenellation merlons along the front
  for (let i = 0; i < 7; i++) {
    const u = u0 + 0.08 + i * 0.2;
    iso.box(u, v1 - 0.04, u + 0.1, v1, 30, 36, WALLC, { ink: false });
  }
  // the cinnabar pavilion riding on top
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.26, cy - 0.22, cx + 0.26, cy + 0.22, 34, 60, TEMPLE_WALL);
  colonnade(iso, cy + 0.22, cx - 0.22, cx + 0.22, 34, 58, 5, lit(hex('#7a3a24'), 0.1));
  // upturned eave hip roof
  const apex = iso.P(cx, cy, 78);
  const c0 = iso.P(cx - 0.36, cy + 0.34, 60);
  const c1 = iso.P(cx + 0.36, cy + 0.34, 60);
  const c2 = iso.P(cx + 0.36, cy - 0.34, 60);
  iso.r.poly([c0, c1, apex], shaded(TEMPLE_TILE, 0.06));
  iso.r.poly([c1, c2, apex], lit(TEMPLE_TILE, 0.08));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  for (const [ex, ey] of [[c0[0], c0[1]], [c1[0], c1[1]]] as const) {
    iso.r.line([ex, ey], [ex, ey - 4 * RES], 1.2 * RES, GOLD);
  }
  return iso.build();
}

// =====================================================================
// SHANGHAI MUSEUM (上海博物馆) — the bronze DING vessel: a round drum on a
// square base with two arched "handles" rising from the round top, in warm
// stone with a green-glass dome. 4×4. Stone + bronze-green.
// =====================================================================
function shanghaiMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#cdbfa2'); // warm museum stone
  const BRZ = hex('#6f8f6a'); // bronze-green patina
  const u0 = 0.5, u1 = 3.5, v0 = 0.5, v1 = 3.5;
  const cx = 2.0, cy = 2.0;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  // the square podium base
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 34, 12, alpha(COLORS.glassDark, 0.82), COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 40, 44, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  // the round drum (the ding body) on top
  const [dx, dyB] = iso.P(cx, cy, 44);
  const R = 1.15 * (CELL_W / 2);
  const drumRing = (z: number, s = 1): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([dx + Math.cos(a) * R * s, dyB - z * RES + Math.sin(a) * R * 0.5 * s]);
    }
    return pts;
  };
  // drum wall (two stacked rings)
  iso.r.poly([...drumRing(0), ...drumRing(36).reverse()], shaded(ST, 0.06), lit(ST, 0.06));
  // the round green-glass dome roof
  const dome: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    dome.push([dx + Math.cos(a) * R, dyB - 36 * RES - Math.sin(a) * R * 0.55]);
  }
  for (let i = 0; i <= 24; i++) dome.push([dx - Math.cos((i / 24) * Math.PI) * R, dyB - 36 * RES]);
  iso.r.poly(dome, alpha(BRZ, 0.85), lit(BRZ, 0.08));
  iso.r.polyline(drumRing(0), INK_W * 0.7, INK, true);
  // the TWO arched ding-handles rising from the drum top
  for (const sx of [-1, 1] as const) {
    const hx = dx + sx * R * 0.6;
    const hy = dyB - 36 * RES - R * 0.55;
    iso.r.poly(
      [[hx - 2 * RES, hy + 4 * RES], [hx + 2 * RES, hy + 4 * RES], [hx + 4 * RES, hy - 16 * RES], [hx - 2 * RES, hy - 16 * RES]],
      shaded(BRZ, 0.04),
    );
    iso.r.polyline([[hx - 2 * RES, hy + 4 * RES], [hx - 2 * RES, hy - 16 * RES], [hx + 4 * RES, hy - 16 * RES]], INK_W * 0.7, INK);
  }
  return iso.build();
}

// =====================================================================
// SHANGHAI GRAND THEATRE (上海大剧院) — Charpentier's "crystal palace": a
// glowing glass cube under an upward-sweeping concave white ROOF whose corners
// curl up to the sky (catching heaven, gong-like). 3×3. White + glowing glass.
// =====================================================================
function grandTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.5, u1 = 2.5, v0 = 0.5, v1 = 2.5;
  const cx = 1.5, cy = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.2);
  // the luminous glass cube
  iso.box(u0, v0, u1, v1, 0, 70, alpha(JADE_SKY, 0.9));
  glassSkin(iso, u0, v0, u1, v1, 4, 68, 5);
  // white structural columns at the corners + along the front
  colonnade(iso, v1, u0 + 0.06, u1 - 0.06, 4, 70, 9, COLORS.white);
  // THE UPWARD-CURLING ROOF: a thin white canopy whose four corners flick up
  const z = 72;
  const corners: Pt[] = [
    iso.P(u0 - 0.1, v1 + 0.1, z),
    iso.P(u1 + 0.1, v1 + 0.1, z),
    iso.P(u1 + 0.1, v0 - 0.1, z),
    iso.P(u0 - 0.1, v0 - 0.1, z),
  ];
  // lift each corner up
  const lifted = corners.map(([x, y]): Pt => [x, y - 20 * RES]);
  const mid = iso.P(cx, cy, z - 6); // sagging centre
  iso.r.poly([lifted[0]!, lifted[1]!, mid], top(COLORS.white, 0.2));
  iso.r.poly([lifted[1]!, lifted[2]!, mid], lit(COLORS.white, 0.1));
  iso.r.poly([lifted[2]!, lifted[3]!, mid], shaded(COLORS.white, 0.06));
  iso.r.poly([lifted[3]!, lifted[0]!, mid], shaded(COLORS.white, 0.1));
  iso.r.polyline([lifted[0]!, lifted[1]!, lifted[2]!, lifted[3]!], INK_W, INK, true);
  // the upturned eave edges
  for (let i = 0; i < 4; i++) {
    iso.r.line(corners[i]!, lifted[i]!, 1.2 * RES, alpha(INK, 0.6));
  }
  return iso.build();
}

// =====================================================================
// SHANGHAI CONCERT HALL (上海音乐厅) — a 1930 neoclassical Beaux-Arts hall: a
// stone block with a grand Corinthian portico under a pediment, low hip roof.
// 2×2. Cream stone.
// =====================================================================
function concertHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#d6cdb6');
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 44, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(ST, 0.12), { ink: false });
  // a tall projecting Corinthian portico across the front
  colonnade(iso, v1, u0 + 0.16, u1 - 0.16, 12, 40, 8, COLORS.white);
  // entablature + pediment
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 44, 49, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  const um = (u0 + u1) / 2;
  iso.r.poly([iso.P(u0 + 0.12, v1, 49), iso.P(u1 - 0.12, v1, 49), iso.P(um, v1, 49 + 11)], lighten(ST, 0.12));
  iso.r.polyline([iso.P(u0 + 0.12, v1, 49), iso.P(um, v1, 49 + 11), iso.P(u1 - 0.12, v1, 49)], INK_W * 0.8, INK);
  // low hip roof behind
  iso.hip(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.5, 49, 8, hex('#6a6f78'));
  return iso.build();
}

// =====================================================================
// SHANGHAI URBAN PLANNING EXHIBITION CENTER (上海城市规划展示馆) — a stone
// block crowned by FOUR distinctive flared "magnolia-petal" white corner
// canopies framing a glass core. 2×2. Stone + white petals.
// =====================================================================
function urbanPlanningTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#cdc3ad');
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 58, ST);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 52, 9, alpha(COLORS.glassDark, 0.82), COLORS.white);
  // glass core rising slightly above
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 58, 70, alpha(JADE_SKY, 0.9));
  // four flared white "petal" canopies at the corners
  for (const [pu, pv] of [[u0 + 0.1, v0 + 0.1], [u1 - 0.1, v0 + 0.1], [u0 + 0.1, v1 - 0.1], [u1 - 0.1, v1 - 0.1]] as const) {
    const base = iso.P(pu, pv, 58);
    const tip = iso.P(pu, pv, 80);
    iso.r.poly([[base[0] - 5 * RES, base[1]], [base[0] + 5 * RES, base[1]], [tip[0] + 2 * RES, tip[1]], [tip[0] - 2 * RES, tip[1]]], lit(COLORS.white, 0.1));
    // flare the top outward
    iso.r.poly([[tip[0] - 2 * RES, tip[1]], [tip[0] + 2 * RES, tip[1]], [tip[0] + 6 * RES, tip[1] - 6 * RES], [tip[0] - 6 * RES, tip[1] - 6 * RES]], top(COLORS.white, 0.2));
    iso.r.polyline([[base[0] - 5 * RES, base[1]], [tip[0] - 6 * RES, tip[1] - 6 * RES], [tip[0] + 6 * RES, tip[1] - 6 * RES], [base[0] + 5 * RES, base[1]]], INK_W * 0.5, alpha(INK, 0.7));
  }
  return iso.build();
}

// =====================================================================
// CHINA ART MUSEUM (中华艺术宫) — the Expo 2010 China Pavilion "Oriental
// Crown": an upturned, inverted-pyramid red crown of stacked DOUGONG bracket
// beams, broader at the top than the base. 4×4 monster. Vermilion red.
// =====================================================================
function chinaArtMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 160 });
  void seed;
  const RED = hex('#b23a2e'); // China-red
  const RED_D = hex('#8c2c22');
  const cx = 2.0, cy = 2.0;
  iso.shadow(cx - 1.0, cy - 0.8, cx + 1.0, cy + 1.0, 0.3, 0.22);
  // four big legs (the inverted crown rests on a cross of four pillars)
  for (const [pu, pv] of [[cx - 0.7, cy + 0.7], [cx + 0.7, cy + 0.7], [cx + 0.7, cy - 0.7], [cx - 0.7, cy - 0.7]] as const) {
    iso.box(pu - 0.14, pv - 0.14, pu + 0.14, pv + 0.14, 0, 70, RED_D);
  }
  // the INVERTED crown: stacked dougong layers, each WIDER than the one below,
  // each layer a slatted red beam grid.
  let z = 70, half = 0.66;
  for (let i = 0; i < 5; i++) {
    const z1 = z + 16;
    const body = lighten(RED, 0.02 * i);
    iso.box(cx - half, cy - half, cx + half, cy + half, z, z1, body);
    // horizontal beam slats (the dougong rhythm) on the front face
    for (let s = 0; s < 4; s++) {
      const zz = z + 3 + s * 3.2;
      iso.r.line(iso.P(cx - half, cy + half, zz), iso.P(cx + half, cy + half, zz), 0.8 * RES, alpha(RED_D, 0.7));
    }
    z = z1 + 1.5;
    half += 0.1; // WIDER as it rises (the inverted crown)
  }
  // flat top cap
  iso.box(cx - half, cy - half, cx + half, cy + half, z, z + 4, lit(RED, 0.06), { topC: top(RED, 0.2) });
  return iso.build();
}

// =====================================================================
// POWER STATION OF ART (上海当代艺术博物馆) — the former Nanshi power plant: a
// long brick industrial hall with a tall slim white CHIMNEY (now a thermometer
// landmark). 3×3, headroom for the stack. Brick + white chimney.
// =====================================================================
function powerStationArtTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 220 });
  void seed;
  const BR = hex('#8f6a55');
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the long brick turbine hall
  iso.box(u0, v0, u1, v1, 0, 60, BR);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 10, 54, 12, alpha(COLORS.glassDark, 0.82), darken(BR, 0.06));
  // a clerestory monitor roof
  iso.box(u0 + 0.2, v0 + 0.3, u1 - 0.2, v1 - 0.6, 60, 70, lighten(BR, 0.06));
  glassSkin(iso, u0 + 0.2, v0 + 0.3, u1 - 0.2, v0 + 0.32, 62, 68, 3);
  // the tall slim white CHIMNEY at one corner
  const sx = u1 - 0.4, sy = v0 + 0.5;
  iso.box(sx - 0.12, sy - 0.12, sx + 0.12, sy + 0.12, 0, 168, hex('#d8d2c4'));
  // a faint scale band (the "thermometer")
  for (let k = 1; k < 9; k++) {
    iso.r.line(iso.P(sx, sy + 0.12, k * 18), iso.P(sx + 0.12, sy + 0.12, k * 18), 0.6 * RES, alpha(INK, 0.5));
  }
  iso.box(sx - 0.13, sy - 0.13, sx + 0.13, sy + 0.13, 168, 174, lighten(hex('#d8d2c4'), 0.08), { ink: false });
  return iso.build();
}

// =====================================================================
// ST NICHOLAS' ORTHODOX CHURCH (东正教堂) — a small Russo-Byzantine church: a
// white cross-plan body with a central blue-and-gold ONION dome on a drum +
// four smaller ones, each with an orthodox cross. 1×1, headroom. White + azure.
// =====================================================================
function orthodoxTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const ST = hex('#e0dac9');
  const AZ = hex('#3a6ea5'); // azure onion
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 36, ST);
  // arched windows
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.14 + i * 0.2;
    iso.r.poly([iso.P(u, v1, 8), iso.P(u + 0.08, v1, 8), iso.P(u + 0.08, v1, 22), iso.P(u, v1, 22)], alpha(COLORS.glassDark, 0.85));
  }
  const onion = (cu: number, cv: number, drumH: number, rPx: number): void => {
    iso.box(cu - 0.06, cv - 0.06, cu + 0.06, cv + 0.06, 36, 36 + drumH, lighten(ST, 0.04));
    const [dx, dyB] = iso.P(cu, cv, 36 + drumH);
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const a = t * Math.PI;
      const wob = Math.sin(a) * (1 + 0.5 * Math.sin(a * 1.6)) * 0.62;
      pts.push([dx + Math.cos(Math.PI - a) * rPx * wob, dyB - t * rPx * 2.0]);
    }
    const full = [...pts];
    for (let i = pts.length - 2; i >= 0; i--) full.push([2 * dx - pts[i]![0], pts[i]![1]]);
    iso.r.poly(full, shaded(AZ, 0.06), lit(AZ, 0.1));
    iso.r.polyline(full, INK_W * 0.6, INK, true);
    const ty = dyB - rPx * 2.0;
    iso.r.line([dx, ty], [dx, ty - 8 * RES], 1 * RES, GOLD_HOT);
    iso.r.line([dx - 2 * RES, ty - 4 * RES], [dx + 2 * RES, ty - 4 * RES], 0.8 * RES, GOLD_HOT);
  };
  onion(u0 + 0.16, v0 + 0.16, 4, 0.12 * (CELL_W / 2));
  onion(u1 - 0.16, v0 + 0.16, 4, 0.12 * (CELL_W / 2));
  onion(u0 + 0.16, v1 - 0.16, 4, 0.11 * (CELL_W / 2));
  onion(u1 - 0.16, v1 - 0.16, 4, 0.11 * (CELL_W / 2));
  onion((u0 + u1) / 2, (v0 + v1) / 2, 16, 0.22 * (CELL_W / 2));
  return iso.build();
}

// =====================================================================
// HOLY TRINITY CHURCH (圣三一堂) — the "Red Church": a red-brick English-Gothic
// Anglican cathedral with a tall corner SPIRE + steep nave. 1×1, headroom.
// Red brick + slate spire.
// =====================================================================
function holyTrinityTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const BR = hex('#a8453a'); // the famous red brick
  const SL = hex('#4f5a6b'); // slate spire
  const u0 = 0.18, u1 = 0.82, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // nave + steep gable
  iso.box(u0, v0, u1 - 0.16, v1, 0, 44, BR);
  iso.gable(u0, v0, u1 - 0.16, v1, 44, 20, 'v', SL, BR);
  // tall pointed lancet windows
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.06 + i * 0.14;
    iso.r.poly([iso.P(u, v1, 8), iso.P(u + 0.05, v1, 8), iso.P(u + 0.05, v1, 26), iso.P(u + 0.025, v1, 32), iso.P(u, v1, 26)], alpha(COLORS.glassDark, 0.85));
  }
  // the tall corner tower + broach SPIRE
  const tu = u1 - 0.12, tv = v1 - 0.12;
  iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 0, 78, BR);
  // belfry louvres
  iso.r.poly([iso.P(tu, tv + 0.12, 56), iso.P(tu + 0.06, tv + 0.12, 56), iso.P(tu + 0.06, tv + 0.12, 70), iso.P(tu, tv + 0.12, 70)], alpha(INK, 0.5));
  const apex = iso.P(tu, tv, 150);
  const c0 = iso.P(tu - 0.12, tv + 0.12, 78);
  const c1 = iso.P(tu + 0.12, tv + 0.12, 78);
  const c2 = iso.P(tu + 0.12, tv - 0.12, 78);
  iso.r.poly([c0, c1, apex], shaded(SL, 0.06));
  iso.r.poly([c1, c2, apex], lit(SL, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  const [tx, tyB] = iso.P(tu, tv, 150);
  iso.r.line([tx, tyB], [tx, tyB - 6 * RES], 1 * RES, GOLD);
  iso.r.line([tx - 2 * RES, tyB - 4 * RES], [tx + 2 * RES, tyB - 4 * RES], 0.8 * RES, GOLD);
  return iso.build();
}

// =====================================================================
// MOSQUE (reusable) — a Chinese-Islamic mosque: a pale prayer hall with a
// green ribbed DOME and a slim minaret with a small cupola. Serves 小桃园清真寺
// (Xiaotaoyuan) + 浦东清真寺 (Pudong). 2×2, headroom for the minaret.
// =====================================================================
function mosqueTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = hex('#dcd6c4');
  const GRN = hex('#3f8a6a'); // Islamic green dome
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  // pointed-arch windows
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.12 + i * 0.24;
    iso.r.poly([iso.P(u, v1, 8), iso.P(u + 0.08, v1, 8), iso.P(u + 0.08, v1, 22), iso.P(u + 0.04, v1, 28), iso.P(u, v1, 22)], alpha(COLORS.glassDark, 0.85));
  }
  // central green dome on a drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 40, 50, lighten(ST, 0.04));
  const [dx, dyB] = iso.P(cx, cy, 50);
  const rPx = 0.26 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI;
    dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.5]);
  }
  iso.r.poly(dome, shaded(GRN, 0.06), lit(GRN, 0.08));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  const ty = dyB - rPx * 1.5;
  iso.r.line([dx, ty], [dx, ty - 10 * RES], 1.2 * RES, GOLD_HOT); // crescent finial
  // a slim minaret at the front corner
  const mu = u0 + 0.14, mv = v1 - 0.14;
  iso.box(mu - 0.07, mv - 0.07, mu + 0.07, mv + 0.07, 0, 84, ST);
  iso.box(mu - 0.09, mv - 0.09, mu + 0.09, mv + 0.09, 84, 90, lighten(ST, 0.06), { ink: false });
  const apex = iso.P(mu, mv, 104);
  const m0 = iso.P(mu - 0.09, mv + 0.09, 90);
  const m2 = iso.P(mu + 0.09, mv - 0.09, 90);
  iso.r.poly([m0, iso.P(mu + 0.09, mv + 0.09, 90), apex], shaded(GRN, 0.04));
  iso.r.polyline([m0, apex, m2], INK_W * 0.6, INK);
  return iso.build();
}

// =====================================================================
// MODERN PUDONG GLASS TOWER (reusable) — a slim teal-glass office tower with a
// distinctive crown, for the Lujiazui/Puxi CBD fabric heroes. `kind` varies the
// crown: 0 flat-lit parapet, 1 tapered glass prow, 2 twin-mast. Serves Bund
// Center (外滩中心), Aurora/震旦, 上海信息大楼, 太平金融大厦, 创兴金融中心,
// 仙乐斯广场, 东海广场, 香港新世界大厦, Wheelock Square. 2×2, headroom.
// =====================================================================
function pudongTowerTile(seed: number, kind: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 260 });
  void seed;
  const cx = 1.0, cy = 1.0;
  const skin = kind === 1 ? mix(JADE, COLORS.glassSunset, 0.2) : JADE;
  const u0 = 0.62, u1 = 1.38, v0 = 0.68, v1 = 1.32;
  const H = 196 + kind * 14;
  iso.shadow(u0, v0, u1 + 0.3, v1 + 0.3, 0.3, 0.2);
  iso.box(u0 - 0.16, v0 - 0.16, u1 + 0.16, v1 + 0.16, 0, 16, shaded(skin, 0.14), { ink: false }); // podium
  iso.box(u0, v0, u1, v1, 0, H, skin);
  glassSkin(iso, u0, v0, u1, v1, 6, H, kind * 5 + 2);
  // vertical mullion ribs
  for (let u = u0 + 0.1; u <= u1 - 0.05; u += 0.18) {
    iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, H), 1 * RES, alpha(shaded(skin, 0.2), 0.5));
  }
  const topZ = H;
  if (kind === 1) {
    // tapered glass prow crown
    iso.r.poly([iso.P(u0, v0, topZ), iso.P(u1, v0, topZ), iso.P(u1, v1, topZ + 24), iso.P(u0, v1, topZ + 24)], lit(JADE_L, 0.1));
    iso.r.polyline([iso.P(u0, v0, topZ), iso.P(u1, v0, topZ), iso.P(u1, v1, topZ + 24), iso.P(u0, v1, topZ + 24)], INK_W, INK, true);
  } else if (kind === 2) {
    iso.box(cx - 0.28, cy - 0.28, cx + 0.28, cy + 0.28, topZ, topZ + 10, lighten(skin, 0.06));
    for (const mu of [cx - 0.16, cx + 0.16] as const) {
      const [mx, myB] = iso.P(mu, cy, topZ + 10);
      iso.r.line([mx, myB], [mx, myB - 24 * RES], 1.4 * RES, STEELG);
      iso.r.line([mx, myB - 20 * RES], [mx, myB - 26 * RES], 2.4 * RES, GOLD_HOT);
    }
  } else {
    // flat-lit parapet + corner beacon
    iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, topZ, topZ + 12, mix(skin, JADE_SKY, 0.4), { topC: top(JADE_L, 0.2) });
    const [mx, myB] = iso.P(cx, cy, topZ + 12);
    iso.r.line([mx, myB], [mx, myB - 20 * RES], 1.4 * RES, STEELG);
    iso.r.line([mx, myB - 16 * RES], [mx, myB - 22 * RES], 2.2 * RES, GOLD_HOT);
  }
  return iso.build();
}

// =====================================================================
// the registry
// =====================================================================

export const CITY_HEROES: BespokeHero[] = [
  // --- PUDONG marquee supertalls -----------------------------------------
  {
    city: 'shanghai',
    key: 'oriental-pearl-tower',
    match: /东方明珠/,
    foot: [3, 3],
    seed: 4680,
    draw: orientalPearlTile,
    light: { kind: 'spireBeacon', topZ: 300, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-tower',
    match: /上海中心大厦/,
    foot: [3, 3],
    seed: 6320,
    draw: shanghaiTowerTile,
    light: { kind: 'spireBeacon', topZ: 432, halfW: 0.62 },
  },
  {
    city: 'shanghai',
    key: 'jin-mao-tower',
    match: /金茂大厦/,
    foot: [3, 3],
    seed: 4205,
    draw: jinMaoTile,
    light: { kind: 'towerCrown', topZ: 380, halfW: 0.55 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-world-financial-center',
    match: /环球金融中心/,
    foot: [2, 2],
    seed: 4920,
    draw: swfcTile,
    light: { kind: 'spireBeacon', topZ: 408, halfW: 0.45 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-science-museum',
    match: /上海科技馆/,
    foot: [5, 5],
    seed: 2001,
    draw: scienceMuseumTile,
    light: { kind: 'stadiumFlood', topZ: 96, halfW: 1.6 },
  },

  // --- THE BUND ----------------------------------------------------------
  {
    city: 'shanghai',
    key: 'customs-house',
    match: /上海海关/,
    foot: [1, 1],
    seed: 1927,
    draw: customsHouseTile,
    light: { kind: 'facadeFlood', topZ: 158, halfW: 0.6 },
  },
  {
    city: 'shanghai',
    key: 'general-post-office',
    match: /上海邮政总局/,
    foot: [3, 3],
    seed: 1924,
    draw: postOfficeTile,
    light: { kind: 'facadeFlood', topZ: 168, halfW: 1.2 },
  },
  {
    city: 'shanghai',
    key: 'peace-hotel',
    match: /和平饭店/,
    foot: [3, 3],
    seed: 1929,
    draw: peaceHotelTile,
    light: { kind: 'towerCrown', topZ: 168, halfW: 1.1 },
  },
  {
    // the former Jardine / Roosevelt House — a domed Bund neoclassical block
    city: 'shanghai',
    key: 'bund-roosevelt-27',
    match: /罗斯福|外滩27/,
    foot: [2, 2],
    seed: 1920,
    draw: (s) => bundRangeTile(s, true),
    light: { kind: 'facadeFlood', topZ: 100, halfW: 1.0 },
  },
  {
    // 有利大楼 — the Union Building, a flat-corniced Bund range
    city: 'shanghai',
    key: 'union-building',
    match: /有利大楼/,
    foot: [2, 2],
    seed: 1916,
    draw: (s) => bundRangeTile(s, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.0 },
  },
  {
    // 外滩史陈列室 — Bund history exhibition room (a small neoclassical range)
    city: 'shanghai',
    key: 'bund-history-room',
    match: /外滩史陈列室/,
    foot: [2, 2],
    seed: 1903,
    draw: (s) => bundRangeTile(s, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.0 },
  },

  // --- ART DECO ----------------------------------------------------------
  {
    city: 'shanghai',
    key: 'broadway-mansions',
    match: /上海大厦/,
    foot: [2, 2],
    seed: 1934,
    draw: (s) => decoTowerTile(s, false),
    light: { kind: 'towerCrown', topZ: 132, halfW: 0.6 },
  },
  {
    // 国际饭店 — Park Hotel, the slim dark Deco shaft (tallest in Asia to 1963)
    city: 'shanghai',
    key: 'park-hotel',
    match: /国际饭店/,
    foot: [2, 2],
    seed: 1933,
    draw: (s) => decoTowerTile(s, true),
    light: { kind: 'towerCrown', topZ: 210, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'no1-department-store',
    match: /第一百货/,
    foot: [2, 2],
    seed: 1936,
    draw: deptStoreTile,
    light: { kind: 'towerCrown', topZ: 90, halfW: 0.8 },
  },
  {
    city: 'shanghai',
    key: 'wukang-mansion',
    match: /武康大楼/,
    foot: [2, 2],
    seed: 1924,
    draw: wukangTile,
    light: { kind: 'genericGlow', topZ: 80, halfW: 0.9 },
  },
  {
    city: 'shanghai',
    key: 'sihang-warehouse',
    match: /四行仓库/,
    foot: [3, 3],
    seed: 1937,
    draw: sihangTile,
    light: { kind: 'facadeFlood', topZ: 68, halfW: 1.3 },
  },

  // --- CHINESE TEMPLES & PAGODAS -----------------------------------------
  {
    city: 'shanghai',
    key: 'longhua-pagoda',
    match: /龙华塔/,
    foot: [2, 2],
    seed: 977,
    draw: longhuaPagodaTile,
    light: { kind: 'facadeFlood', topZ: 230, halfW: 0.6 },
  },
  {
    city: 'shanghai',
    key: 'longhua-temple',
    match: /龙华寺/,
    foot: [2, 2],
    seed: 242,
    draw: (s) => templeHallTile(s, false),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.1 },
  },
  {
    city: 'shanghai',
    key: 'jade-buddha-temple',
    match: /玉佛禅寺|玉佛寺/,
    foot: [2, 2],
    seed: 1882,
    draw: (s) => templeHallTile(s, true),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.1 },
  },
  {
    city: 'shanghai',
    key: 'chenxiang-pavilion',
    match: /沉香阁/,
    foot: [2, 2],
    seed: 1815,
    draw: chenxiangTile,
    light: { kind: 'facadeFlood', topZ: 94, halfW: 0.6 },
  },
  {
    city: 'shanghai',
    key: 'dajing-ge-pavilion',
    match: /大境阁/,
    foot: [2, 2],
    seed: 1815,
    draw: dajingGeTile,
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.0 },
  },

  // --- PEOPLE'S SQUARE & CIVIC --------------------------------------------
  {
    city: 'shanghai',
    key: 'shanghai-museum',
    match: /上海博物馆/,
    foot: [4, 4],
    seed: 1996,
    draw: shanghaiMuseumTile,
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.5 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-grand-theatre',
    match: /上海大剧院/,
    foot: [3, 3],
    seed: 1998,
    draw: grandTheatreTile,
    light: { kind: 'stadiumFlood', topZ: 92, halfW: 1.3 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-concert-hall',
    match: /上海音乐厅/,
    foot: [2, 2],
    seed: 1930,
    draw: concertHallTile,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'shanghai',
    key: 'urban-planning-center',
    match: /城市规划展示馆/,
    foot: [2, 2],
    seed: 2000,
    draw: urbanPlanningTile,
    light: { kind: 'towerCrown', topZ: 80, halfW: 0.9 },
  },
  {
    // 中华艺术宫 — the Expo China Pavilion "Oriental Crown"
    city: 'shanghai',
    key: 'china-art-museum',
    match: /中华艺术宫/,
    foot: [4, 4],
    seed: 2010,
    draw: chinaArtMuseumTile,
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.6 },
  },
  {
    // 上海当代艺术博物馆 — the Power Station of Art (chimney)
    city: 'shanghai',
    key: 'power-station-of-art',
    match: /当代艺术博物馆/,
    foot: [3, 3],
    seed: 1985,
    draw: powerStationArtTile,
    light: { kind: 'aerialBeacon', topZ: 174, halfW: 1.2 },
  },

  // --- CHURCHES & MOSQUES -------------------------------------------------
  {
    city: 'shanghai',
    key: 'st-nicholas-orthodox',
    match: /东正教堂/,
    foot: [1, 1],
    seed: 1934,
    draw: orthodoxTile,
    light: { kind: 'facadeFlood', topZ: 84, halfW: 0.6 },
  },
  {
    city: 'shanghai',
    key: 'holy-trinity-church',
    match: /圣三一堂/,
    foot: [1, 1],
    seed: 1869,
    draw: holyTrinityTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'xiaotaoyuan-mosque',
    match: /小桃园清真寺/,
    foot: [2, 2],
    seed: 1917,
    draw: mosqueTile,
    light: { kind: 'facadeFlood', topZ: 104, halfW: 0.9 },
  },
  {
    city: 'shanghai',
    key: 'pudong-mosque',
    match: /浦东清真寺/,
    foot: [2, 2],
    seed: 1935,
    draw: mosqueTile,
    light: { kind: 'facadeFlood', topZ: 104, halfW: 0.9 },
  },

  // --- MODERN CBD TOWERS (reusable teal-glass) ----------------------------
  {
    city: 'shanghai',
    key: 'bund-center',
    match: /外滩中心/,
    foot: [2, 2],
    seed: 2002,
    draw: (s) => pudongTowerTile(s, 1),
    light: { kind: 'towerCrown', topZ: 220, halfW: 0.5 },
  },
  {
    // 震旦国际大楼 — Aurora Plaza (the gold-topped riverfront tower)
    city: 'shanghai',
    key: 'aurora-plaza',
    match: /震旦国际大楼/,
    foot: [2, 2],
    seed: 2003,
    draw: (s) => pudongTowerTile(s, 2),
    light: { kind: 'towerCrown', topZ: 224, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'shanghai-information-tower',
    match: /上海信息大楼/,
    foot: [2, 2],
    seed: 2001,
    draw: (s) => pudongTowerTile(s, 0),
    light: { kind: 'towerCrown', topZ: 196, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'taiping-financial',
    match: /太平金融大厦/,
    foot: [2, 2],
    seed: 2007,
    draw: (s) => pudongTowerTile(s, 0),
    light: { kind: 'towerCrown', topZ: 196, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'chong-hing-finance',
    match: /创兴金融中心/,
    foot: [2, 2],
    seed: 2010,
    draw: (s) => pudongTowerTile(s, 1),
    light: { kind: 'towerCrown', topZ: 210, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'ciros-plaza',
    match: /仙乐斯广场/,
    foot: [2, 2],
    seed: 2005,
    draw: (s) => pudongTowerTile(s, 2),
    light: { kind: 'towerCrown', topZ: 224, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'donghai-plaza',
    match: /东海广场/,
    foot: [2, 2],
    seed: 2004,
    draw: (s) => pudongTowerTile(s, 0),
    light: { kind: 'towerCrown', topZ: 196, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'hk-new-world-tower',
    match: /香港新世界大厦/,
    foot: [2, 2],
    seed: 2002,
    draw: (s) => pudongTowerTile(s, 1),
    light: { kind: 'towerCrown', topZ: 210, halfW: 0.5 },
  },
  {
    city: 'shanghai',
    key: 'wheelock-square',
    match: /Wheelock Square/,
    foot: [2, 2],
    seed: 2009,
    draw: (s) => pudongTowerTile(s, 2),
    light: { kind: 'towerCrown', topZ: 224, halfW: 0.5 },
  },
];
