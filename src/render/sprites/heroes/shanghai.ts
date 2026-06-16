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
// ROUND 2 — additional bespoke heroes (append-only). Each resolves a PLACED
// name in src/data/cities/shanghai.ts and builds its own silhouette.
// =====================================================================

// ---------------------------------------------------------------------
// SHANGHAI RAILWAY STATION (上海站) — the 1987 "New Station": a vast, long
// terminal with a horizontal banded concourse block and a great curved
// double-barrel TRAIN-SHED vault behind, flanked by two slim clock pylons.
// 5×5 MONSTER, drawn WIDE. Pale stone + steel-grey vault.
// ---------------------------------------------------------------------
function railwayStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 130 });
  void seed;
  const STN = hex('#cdc6b6'); // travertine concourse
  const VAULT = hex('#8b97a0'); // steel-grey shed roof
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  // the long low concourse block across the front
  iso.box(u0, v1 - 1.3, u1, v1, 0, 56, STN);
  // strong horizontal banding (the 1980s ribbon glazing)
  for (let z = 12; z < 52; z += 10) {
    iso.box(u0 - 0.01, v1 - 1.31, u1 + 0.01, v1 + 0.01, z, z + 3, lighten(STN, 0.08), { ink: false });
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 50, 22, alpha(COLORS.glassDark, 0.78), lighten(STN, 0.06));
  // the two great barrel TRAIN SHEDS behind (semi-cylinder roofs running back)
  for (const shedV of [v0 + 0.6, v0 + 1.9] as const) {
    const [ax, ayB] = iso.P(u0 + 0.3, shedV, 60);
    const [bx, byB] = iso.P(u1 - 0.3, shedV, 60);
    const rise = 40 * RES;
    // arc roof as a filled polyline band
    const archTop: Pt[] = [];
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = ax + (bx - ax) * t;
      const y = ayB + (byB - ayB) * t - Math.sin(t * Math.PI) * rise;
      archTop.push([x, y]);
    }
    const archBot = [[bx, byB], [ax, ayB]] as Pt[];
    iso.r.poly([...archTop, ...archBot], shaded(VAULT, 0.06), lit(VAULT, 0.06));
    iso.r.polyline(archTop, INK_W * 0.8, INK);
    // glazed end ribs
    for (let i = 2; i < N - 1; i += 3) {
      iso.r.line(archTop[i]!, [archTop[i]![0], byB], 0.5 * RES, alpha(COLORS.white, 0.18));
    }
  }
  // two slim clock pylons flanking the entrance
  for (const pu of [u0 + 0.5, u1 - 0.5] as const) {
    iso.box(pu - 0.12, v1 - 0.2, pu + 0.12, v1, 0, 76, lighten(STN, 0.04));
    const [clx, cly] = iso.P(pu, v1, 68);
    const RR = 2.6 * RES;
    const ring: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]);
    }
    iso.r.poly(ring, COLORS.white);
    iso.r.polyline(ring, INK_W * 0.5, INK, true);
    iso.r.line([clx, cly], [clx, cly - 1.8 * RES], 0.7 * RES, INK);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// ELEVATED METRO STATION (reusable) — 曹杨路 / 娄山关路: a long glass-and-steel
// viaduct station box riding on two rows of round columns above the street,
// with a shallow curved standing-seam roof and a lit platform glow beneath.
// 4×4 (drawn long + low). Teal-tinted glass + steel.
// ---------------------------------------------------------------------
function metroStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  const SteelW = hex('#9aa6ad');
  const u0 = 0.4, u1 = 3.6, v0 = 1.2, v1 = 2.8;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // viaduct deck on columns
  for (let u = u0 + 0.3; u <= u1 - 0.2; u += 0.7) {
    iso.box(u - 0.06, v1 - 0.06, u + 0.06, v1 + 0.02, 0, 26, GRANITE, { ink: false });
    iso.box(u - 0.06, v0 - 0.02, u + 0.06, v0 + 0.06, 0, 26, GRANITE, { ink: false });
  }
  // the long glazed station box
  iso.box(u0, v0, u1, v1, 26, 52, mix(JADE, SteelW, 0.4));
  // platform light spilling out below the box (warm under-glow line)
  iso.r.line(iso.P(u0, v1, 28), iso.P(u1, v1, 28), 2 * RES, alpha(COLORS.glassLit, 0.5));
  // ribbon glazing
  for (let z = 32; z < 50; z += 6) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.white, 0.22));
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 32, 48, 16, alpha(COLORS.glassLit, 0.45), undefined);
  // shallow curved standing-seam roof
  const [ax, ayB] = iso.P(u0, v0, 52);
  const [bx, byB] = iso.P(u1, v0, 52);
  const [cx2, cyB2] = iso.P(u1, v1, 52);
  const [dx, dyB] = iso.P(u0, v1, 52);
  iso.r.poly([[ax, ayB - 9 * RES], [bx, byB - 9 * RES], [cx2, cyB2 - 9 * RES], [dx, dyB - 9 * RES]], top(SteelW, 0.18));
  iso.r.polyline([[dx, dyB - 9 * RES], [ax, ayB - 9 * RES], [bx, byB - 9 * RES], [cx2, cyB2 - 9 * RES]], INK_W * 0.7, INK);
  // overhang eaves
  iso.r.line([dx, dyB], [dx, dyB - 9 * RES], INK_W * 0.6, INK);
  iso.r.line([cx2, cyB2], [cx2, cyB2 - 9 * RES], INK_W * 0.6, INK);
  return iso.build();
}

// ---------------------------------------------------------------------
// TWIN CONJOINED CBD TOWER (reusable) — for the Lujiazui/Puxi twin towers and
// big hotels: two slim teal-glass shafts joined by a low podium, one a touch
// taller, each with a flat lit parapet. Serves 龙之梦大酒店 (Longemont),
// 上海东锦江希尔顿逸林酒店 (DoubleTree), 上海犹太? no. 2×2, headroom.
// ---------------------------------------------------------------------
function twinTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 250 });
  void seed;
  iso.shadow(0.5, 0.5, 1.5, 1.5, 0.3, 0.2);
  iso.box(0.42, 0.42, 1.58, 1.58, 0, 18, shaded(JADE, 0.14), { ink: false }); // podium
  // two shafts (back-left taller, front-right shorter), offset on the diamond
  const shafts: Array<[number, number, number, number, number]> = [
    [0.5, 0.5, 0.98, 0.98, 218], // tall
    [1.04, 1.04, 1.5, 1.5, 176], // shorter
  ];
  for (const [a0, b0, a1, b1, H] of shafts) {
    iso.box(a0, b0, a1, b1, 18, H, JADE);
    glassSkin(iso, a0, b0, a1, b1, 22, H, Math.round(H));
    iso.box(a0 - 0.02, b0 - 0.02, a1 + 0.02, b1 + 0.02, H, H + 8, mix(JADE, JADE_SKY, 0.4), { topC: top(JADE_L, 0.2) });
    const [mx, myB] = iso.P((a0 + a1) / 2, (b0 + b1) / 2, H + 8);
    iso.r.line([mx, myB], [mx, myB - 16 * RES], 1.3 * RES, STEELG);
    iso.r.line([mx, myB - 12 * RES], [mx, myB - 18 * RES], 2.2 * RES, GOLD_HOT);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// CYLINDRICAL HOTEL TOWER (新锦江大酒店 New Jin Jiang) — a round, faintly
// tapering glass cylinder (the famous revolving-restaurant hotel), capped by a
// drum + mast. 2×2, headroom. Teal-glass cylinder.
// ---------------------------------------------------------------------
function cylinderTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 250 });
  void seed;
  const cx = 1.0, cy = 1.0;
  const H = 222;
  iso.shadow(cx - 0.4, cy - 0.3, cx + 0.4, cy + 0.45, 0.3, 0.2);
  iso.box(cx - 0.46, cy - 0.46, cx + 0.46, cy + 0.46, 0, 16, shaded(JADE, 0.14), { ink: false });
  const [gx, gyB] = iso.P(cx, cy, 0);
  const R = 0.34 * (CELL_W / 2);
  // a point on the cylinder rim: angle s (0=right, π=left), height z.
  const col = (s: number, z: number): Pt => [gx + Math.cos(s) * R, gyB - z * RES + Math.sin(s) * R * 0.5];
  // THE VISIBLE WALL = the front semicircle (s: 0..π, +sin drops it toward the
  // viewer) extruded from base z=16 to top z=H, as ONE closed band: top arc
  // forward then bottom arc back. Two halves (lit right s<π/2, shaded left).
  const wall = (sA: number, sB: number, c: RGBA): void => {
    const pts: Pt[] = [];
    const N = 8;
    for (let i = 0; i <= N; i++) pts.push(col(sA + (sB - sA) * (i / N), H));
    for (let i = N; i >= 0; i--) pts.push(col(sA + (sB - sA) * (i / N), 16));
    iso.r.poly(pts, c);
  };
  wall(0, Math.PI / 2, lit(JADE, 0.06)); // right (lit) front quarter
  wall(Math.PI / 2, Math.PI, shaded(JADE, 0.08)); // left (shaded) front quarter
  // floor rings (only the FRONT arc reads; full ring as a faint band)
  for (let z = 28; z < H; z += 12) {
    const ring: Pt[] = [];
    for (let i = 0; i <= 12; i++) ring.push(col((i / 12) * Math.PI, z));
    iso.r.polyline(ring, 0.4 * RES, alpha(COLORS.white, 0.18), false);
  }
  // silhouette ink: the two outer verticals + bottom + top front arc
  iso.r.line(col(0, 16), col(0, H), INK_W, INK);
  iso.r.line(col(Math.PI, 16), col(Math.PI, H), INK_W, INK);
  const botArc: Pt[] = [];
  for (let i = 0; i <= 12; i++) botArc.push(col((i / 12) * Math.PI, 16));
  iso.r.polyline(botArc, INK_W * 0.7, INK, false);
  // the full top ellipse cap
  const topRing: Pt[] = [];
  for (let i = 0; i <= 18; i++) topRing.push(col((i / 18) * Math.PI * 2, H));
  iso.r.poly(topRing, top(JADE_L, 0.18));
  iso.r.polyline(topRing, INK_W * 0.8, INK, true);
  // crown drum + mast
  const [mx, myB] = iso.P(cx, cy, H);
  iso.r.line([mx, myB], [mx, myB - 22 * RES], 1.4 * RES, STEELG);
  iso.r.line([mx, myB - 18 * RES], [mx, myB - 24 * RES], 2.4 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// BIG RETAIL MALL (reusable) — 正大广场 Super Brand / 梅龙镇广场 Westgate /
// 世博源 Expo Source: a broad, deep, many-floored retail box with horizontal
// banded glazing, a rounded glass corner atrium, and a low set-back crown.
// `tower` adds a slim office stub (Westgate's Isetan tower). 5×5 wide.
// ---------------------------------------------------------------------
function mallTile(seed: number, tower: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: tower ? 200 : 90 });
  void seed;
  const SK = hex('#b9c3c4'); // pale grey commercial glass
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  iso.box(u0, v0, u1, v1, 0, 70, SK);
  // strong horizontal floor bands (mall glazing rhythm)
  for (let z = 12; z < 68; z += 9) {
    iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 3, lighten(SK, 0.1), { ink: false });
    iso.r.line(iso.P(u0, v1, z + 1.5), iso.P(u1, v1, z + 1.5), 0.5 * RES, alpha(COLORS.glassLit, 0.3));
  }
  // a warm-lit ground retail band (shopfront glow)
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 6, 22, 18, alpha(COLORS.glassLit, 0.55), undefined);
  // rounded glazed corner atrium at (u1,v1)
  const [qx, qyB] = iso.P(u1 - 0.1, v1 - 0.1, 0);
  iso.r.poly(
    [[qx - 7 * RES, qyB], [qx + 7 * RES, qyB], [qx + 7 * RES, qyB - 74 * RES], [qx - 7 * RES, qyB - 74 * RES]],
    alpha(JADE_SKY, 0.85),
  );
  iso.r.polyline([[qx - 7 * RES, qyB - 74 * RES], [qx - 7 * RES, qyB], [qx + 7 * RES, qyB], [qx + 7 * RES, qyB - 74 * RES]], INK_W * 0.7, INK);
  iso.glint([qx + 2 * RES, qyB - 56 * RES], 3 * RES);
  // low set-back crown / signage parapet
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, 70, 78, lighten(SK, 0.06), { topC: top(SK, 0.2) });
  if (tower) {
    // a slim department-store office tower rising from the back
    iso.box(u0 + 0.7, v0 + 0.7, u0 + 1.7, v0 + 1.7, 78, 188, mix(SK, JADE, 0.3));
    glassSkin(iso, u0 + 0.7, v0 + 0.7, u0 + 1.7, v0 + 1.7, 84, 188, 7);
    iso.box(u0 + 0.74, v0 + 0.74, u0 + 1.66, v0 + 1.66, 188, 196, lighten(SK, 0.08), { topC: top(SK, 0.2) });
    const [mx, myB] = iso.P(u0 + 1.2, v0 + 1.2, 196);
    iso.r.line([mx, myB], [mx, myB - 18 * RES], 1.3 * RES, STEELG);
    iso.r.line([mx, myB - 14 * RES], [mx, myB - 20 * RES], 2.2 * RES, GOLD_HOT);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// GLOBAL HARBOR (环球港) — the gilded "European palace" mega-mall: a vast
// banded retail block with a green-copper MANSARD roofline and TWO golden
// baroque corner CUPOLAS (its signature). 5×5 monster. Cream + copper + gold.
// ---------------------------------------------------------------------
function globalHarborTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 150 });
  void seed;
  const CR = hex('#cfc2a6'); // cream palace stone
  const MAN = hex('#5f8f78'); // verdigris copper mansard
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  iso.box(u0, v0, u1, v1, 0, 70, CR);
  for (let z = 14; z < 66; z += 13) {
    iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 3, lighten(CR, 0.1), { ink: false });
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 10, 62, 20, alpha(COLORS.glassDark, 0.78), COLORS.white);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 10, 62, 18, alpha(COLORS.glassDark, 0.78), COLORS.white);
  // a balustraded stone cornice caps the block (ties the roof to the facade)
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 70, 76, lighten(CR, 0.08), { topC: top(CR, 0.25) });
  // the green-copper MANSARD as a sloped band: a smaller recessed roof block so
  // the green reads as a pitched roof sitting ON the building, not a flat plane.
  iso.box(u0 + 0.25, v0 + 0.25, u1 - 0.25, v1 - 0.25, 76, 94, shaded(MAN, 0.06), { topC: top(MAN, 0.14) });
  // a lighter recessed roof court + ridge lines so the green plane reads as a
  // structured palace roof, not a bald slab
  iso.box(u0 + 0.9, v0 + 0.9, u1 - 0.9, v1 - 0.9, 94, 97, lit(MAN, 0.06), { ink: false });
  for (let k = 1; k < 5; k++) {
    const vv = v0 + 0.25 + ((v1 - v0 - 0.5) * k) / 5;
    iso.r.line(iso.P(u0 + 0.25, vv, 94), iso.P(u1 - 0.25, vv, 94), 0.6 * RES, alpha(darken(MAN, 0.12), 0.6));
  }
  // copper roof dormers along the front mansard slope
  for (let i = 0; i < 6; i++) {
    const du = u0 + 0.6 + i * 0.6;
    const [dx0, dy0] = iso.P(du, v1 - 0.25, 80);
    iso.r.rect(dx0 - 1.6 * RES, dy0 - 7 * RES, dx0 + 1.6 * RES, dy0 - 1 * RES, alpha(GOLD_HOT, 0.55));
  }
  // a central pediment over the front entrance to anchor the composition
  const um = (u0 + u1) / 2;
  iso.r.poly([iso.P(um - 0.6, v1, 76), iso.P(um + 0.6, v1, 76), iso.P(um, v1, 90)], lighten(CR, 0.12));
  iso.r.polyline([iso.P(um - 0.6, v1, 76), iso.P(um, v1, 90), iso.P(um + 0.6, v1, 76)], INK_W * 0.7, INK);
  // TWO big golden baroque cupolas crowning the front, pulled inboard so they
  // sit on the visible roof mass (not floating at the far corners).
  for (const [cu, cv] of [[um - 1.0, v1 - 0.9], [um + 1.0, v1 - 0.9]] as const) {
    // square base drum
    iso.box(cu - 0.32, cv - 0.32, cu + 0.32, cv + 0.32, 94, 112, lighten(CR, 0.04));
    iso.windowsLeft(cv + 0.32, cu - 0.26, cu + 0.26, 98, 110, 3, alpha(COLORS.glassDark, 0.7), COLORS.white);
    const [dx, dyB] = iso.P(cu, cv, 112);
    const rPx = 0.34 * (CELL_W / 2);
    const dome: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const a = t * Math.PI;
      const wob = Math.sin(a) * (1 + 0.4 * Math.sin(a * 1.6));
      dome.push([dx + Math.cos(Math.PI - a) * rPx * wob * 0.62, dyB - t * rPx * 2.1]);
    }
    const full = [...dome];
    for (let i = dome.length - 2; i >= 0; i--) full.push([2 * dx - dome[i]![0], dome[i]![1]]);
    iso.r.poly(full, shaded(GOLD, 0.04), lit(GOLD_HOT, 0.08));
    iso.r.polyline(full, INK_W * 0.7, INK, true);
    const ty = dyB - rPx * 2.1;
    iso.r.line([dx, ty], [dx, ty - 12 * RES], 1.3 * RES, GOLD_HOT);
    iso.glint([dx, dyB - rPx * 1.2], 2.4 * RES);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// METRO CITY (美罗城) — the Xujiahui landmark: a curved silver mall podium
// crowned by a giant faceted GLASS SPHERE (the "crystal ball" on the roof).
// 4×4. Silver + glowing glass sphere.
// ---------------------------------------------------------------------
function metroCityTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 150 });
  void seed;
  const SK = hex('#aab4ba');
  const u0 = 0.5, u1 = 3.5, v0 = 0.5, v1 = 3.5;
  const cx = 2.0, cy = 2.0;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  // curved silver podium
  iso.box(u0, v0, u1, v1, 0, 56, SK);
  for (let z = 12; z < 52; z += 10) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.white, 0.2));
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 6, 20, 14, alpha(COLORS.glassLit, 0.5), undefined);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 56, 60, lighten(SK, 0.06), { topC: top(SK, 0.2) });
  // the big faceted glass SPHERE on the roof
  const [sx, syB] = iso.P(cx, cy, 60);
  const R = 0.92 * (CELL_W / 2);
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      pts.push([sx + Math.cos(a) * R * s, syB - R * 0.9 + Math.sin(a) * R * 0.9 * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), alpha(JADE_SKY, 0.6), alpha(shaded(JADE, 0.1), 0.5));
  iso.r.poly(ring(0.6), alpha(JADE_L, 0.5));
  // faceting lat/long wires
  for (let k = -2; k <= 2; k++) {
    iso.r.line([sx + (k / 3) * R, syB - R * 0.05], [sx + (k / 3) * R, syB - R * 1.75], 0.4 * RES, alpha(COLORS.white, 0.25));
  }
  iso.r.line([sx - R, syB - R * 0.9], [sx + R, syB - R * 0.9], 0.4 * RES, alpha(COLORS.white, 0.3));
  iso.r.polyline(ring(1), INK_W * 0.8, alpha(INK, 0.7), true);
  iso.glint([sx + R * 0.3, syB - R * 1.2], 3.4 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// THE BUND FINANCE CENTER / FOSUN (复星艺术中心) — the riverfront pair of
// stone-clad towers wrapped in three layers of moving golden vertical TUBES
// (a "bronze bamboo curtain" inspired by theatre curtains). 3×3, headroom.
// Stone core + shimmering bronze tube screen.
// ---------------------------------------------------------------------
function fosunBfcTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const STONE = hex('#b7ab93');
  const BRONZE = hex('#c69a52');
  const BRONZE_H = hex('#e6c074');
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  // the stone core (two stepped blocks)
  iso.box(u0, v0, u1 - 0.7, v1, 0, 116, STONE);
  iso.box(u1 - 0.8, v0 + 0.3, u1, v1, 0, 92, lighten(STONE, 0.04));
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 12, 110, 12, alpha(COLORS.glassDark, 0.8), lighten(STONE, 0.08));
  // THE MOVING BRONZE TUBE CURTAIN: a dense palisade of vertical golden rods
  // standing just off the left (v1) and right (u1) faces, three overlapping
  // depths so it reads as the shimmering layered screen.
  for (const depth of [0.0, 0.06, 0.12] as const) {
    const a = depth === 0 ? 1 : depth === 0.06 ? 0.7 : 0.45;
    for (let u = u0 + 0.05; u <= u1 - 0.05; u += 0.07) {
      const top0 = iso.P(u, v1 + depth, 124);
      const bot0 = iso.P(u, v1 + depth, 4);
      const h = (Math.sin(u * 53.1 + depth * 30) * 0.5 + 0.5);
      iso.r.line([top0[0], top0[1] + h * 6 * RES], bot0, 0.9 * RES, alpha(h > 0.6 ? BRONZE_H : BRONZE, a));
    }
  }
  // a few bright catch-lights along the curtain top (the gilt shimmer)
  for (let u = u0 + 0.2; u <= u1 - 0.2; u += 0.4) {
    const [gx, gyB] = iso.P(u, v1 + 0.06, 124);
    iso.glint([gx, gyB], 2.2 * RES);
  }
  iso.r.polyline([iso.P(u0, v1 + 0.12, 124), iso.P(u1, v1 + 0.12, 124)], INK_W * 0.5, alpha(INK, 0.5));
  return iso.build();
}

// ---------------------------------------------------------------------
// ST IGNATIUS CATHEDRAL, XUJIAHUI (徐家汇圣依纳爵主教座堂) — Shanghai's great
// red-brick French-Gothic cathedral: a tall nave with TWIN slim spired towers
// over the west front and pointed lancet windows. 2×2, big headroom. Red brick
// + grey-slate spires. THE most prominent church here — drawn tall.
// ---------------------------------------------------------------------
function stIgnatiusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 240 });
  void seed;
  const BR = hex('#a14a3c'); // the cathedral red brick
  const SL = hex('#586679'); // slate spire
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the long nave + steep roof, ridge along u
  iso.box(u0, v0 + 0.2, u1, v1 - 0.05, 0, 58, BR);
  iso.gable(u0, v0 + 0.2, u1, v1 - 0.05, 58, 22, 'u', SL, BR);
  // tall pointed lancet windows down the side
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.08 + i * 0.22;
    iso.r.poly([iso.P(u, v1 - 0.05, 10), iso.P(u + 0.06, v1 - 0.05, 10), iso.P(u + 0.06, v1 - 0.05, 34), iso.P(u + 0.03, v1 - 0.05, 42), iso.P(u, v1 - 0.05, 34)], alpha(COLORS.glassDark, 0.85));
  }
  // a rose window on the front gable
  const [rx, ryB] = iso.P(u1, (v0 + v1) / 2, 48);
  iso.r.line([rx - 3 * RES, ryB], [rx + 3 * RES, ryB], 2 * RES, alpha(COLORS.glassLit, 0.6));
  // TWIN west-front towers with tall broach spires
  for (const tv of [v0 + 0.32, v1 - 0.32] as const) {
    const tu = u1 - 0.16;
    iso.box(tu - 0.14, tv - 0.14, tu + 0.14, tv + 0.14, 0, 104, BR);
    // belfry louvres
    iso.r.poly([iso.P(tu, tv + 0.14, 78), iso.P(tu + 0.07, tv + 0.14, 78), iso.P(tu + 0.07, tv + 0.14, 96), iso.P(tu, tv + 0.14, 96)], alpha(INK, 0.5));
    const apex = iso.P(tu, tv, 200);
    const c0 = iso.P(tu - 0.14, tv + 0.14, 104);
    const c1 = iso.P(tu + 0.14, tv + 0.14, 104);
    const c2 = iso.P(tu + 0.14, tv - 0.14, 104);
    iso.r.poly([c0, c1, apex], shaded(SL, 0.06));
    iso.r.poly([c1, c2, apex], lit(SL, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
    iso.r.line([apex[0], apex[1]], [apex[0], apex[1] - 8 * RES], 1 * RES, GOLD);
    iso.r.line([apex[0] - 2 * RES, apex[1] - 5 * RES], [apex[0] + 2 * RES, apex[1] - 5 * RES], 0.8 * RES, GOLD);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// NEO-BAROQUE CATHEDRAL (董家渡圣方济各沙勿略堂 St Francis Xavier / Dongjiadu)
// — a 1850s white Neo-Baroque church: a broad stuccoed nave with a single
// central pedimented bell-tower + small cupola lantern. 2×2, headroom.
// Cream stucco + grey roof.
// ---------------------------------------------------------------------
function baroqueChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = hex('#ddd6c4');
  const RF = hex('#6c7079');
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, ST);
  iso.gable(u0, v0, u1, v1, 46, 14, 'u', RF, ST);
  // arched windows
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.12 + i * 0.24;
    iso.r.poly([iso.P(u, v1, 8), iso.P(u + 0.08, v1, 8), iso.P(u + 0.08, v1, 24), iso.P(u + 0.04, v1, 30), iso.P(u, v1, 24)], alpha(COLORS.glassDark, 0.85));
  }
  // central bell-tower with a baroque pediment + cupola
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.02;
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 46, 96, lighten(ST, 0.03));
  // pediment scroll suggestion
  iso.r.poly([iso.P(cx - 0.18, cy + 0.18, 96), iso.P(cx + 0.18, cy + 0.18, 96), iso.P(cx, cy + 0.18, 104)], lighten(ST, 0.1));
  // copper cupola lantern
  iso.box(cx - 0.1, cy - 0.1, cx + 0.1, cy + 0.1, 104, 114, ST);
  const [dx, dyB] = iso.P(cx, cy, 114);
  const rPx = 0.13 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.5]);
  }
  iso.r.poly(dome, shaded(COPPER, 0.06), lit(COPPER, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - rPx * 1.5], [dx, dyB - rPx * 1.5 - 9 * RES], 1.2 * RES, GOLD_HOT);
  iso.r.line([dx - 2 * RES, dyB - rPx * 1.5 - 5 * RES], [dx + 2 * RES, dyB - rPx * 1.5 - 5 * RES], 0.8 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// TWIN-SPIRE GOTHIC CHURCH (reusable) — 若瑟堂 St Joseph's (Yangjingbang),
// a compact brick Gothic church with two slim octagonal spires over the front
// and a steep nave. 1×1, headroom. Warm brick + slate spires.
// ---------------------------------------------------------------------
function twinSpireChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 180 });
  void seed;
  const BR = hex('#9c7a5e'); // sandy brick
  const SL = hex('#525d6e');
  const u0 = 0.18, u1 = 0.82, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0 + 0.1, u1 - 0.06, v1, 0, 42, BR);
  iso.gable(u0, v0 + 0.1, u1 - 0.06, v1, 42, 16, 'u', SL, BR);
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.08 + i * 0.18;
    iso.r.poly([iso.P(u, v1, 8), iso.P(u + 0.05, v1, 8), iso.P(u + 0.05, v1, 24), iso.P(u + 0.025, v1, 30), iso.P(u, v1, 24)], alpha(COLORS.glassDark, 0.85));
  }
  for (const tv of [v0 + 0.22, v1 - 0.22] as const) {
    const tu = u1 - 0.1;
    iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, 82, BR);
    const apex = iso.P(tu, tv, 152);
    const c0 = iso.P(tu - 0.1, tv + 0.1, 82);
    const c1 = iso.P(tu + 0.1, tv + 0.1, 82);
    const c2 = iso.P(tu + 0.1, tv - 0.1, 82);
    iso.r.poly([c0, c1, apex], shaded(SL, 0.06));
    iso.r.poly([c1, c2, apex], lit(SL, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
    iso.r.line([apex[0], apex[1]], [apex[0], apex[1] - 6 * RES], 1 * RES, GOLD);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// OHEL RACHEL SYNAGOGUE (拉结会堂) — the 1920 Sephardic synagogue: a stately
// stone hall behind a tall colonnaded GREEK-REVIVAL portico (Ionic columns +
// pediment), with round-arched windows. 1×1, modest headroom. Cream stone.
// ---------------------------------------------------------------------
function ohelRachelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const ST = hex('#d8d0bb');
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.12), { ink: false });
  // round-arched windows on the side
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.14 + i * 0.2;
    iso.r.poly([iso.P(u, v1, 12), iso.P(u + 0.08, v1, 12), iso.P(u + 0.08, v1, 26), iso.P(u + 0.04, v1, 32), iso.P(u, v1, 26)], alpha(COLORS.glassDark, 0.85));
  }
  // tall projecting Ionic portico across the front
  colonnade(iso, v1, u0 + 0.1, u1 - 0.1, 8, 44, 6, COLORS.white);
  // entablature + pediment
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 46, 51, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  const um = (u0 + u1) / 2;
  iso.r.poly([iso.P(u0 + 0.06, v1, 51), iso.P(u1 - 0.06, v1, 51), iso.P(um, v1, 51 + 12)], lighten(ST, 0.12));
  iso.r.polyline([iso.P(u0 + 0.06, v1, 51), iso.P(um, v1, 51 + 12), iso.P(u1 - 0.06, v1, 51)], INK_W * 0.7, INK);
  // a small Star-of-David finial hint on the apex
  iso.r.line([iso.P(um, v1, 63)[0], iso.P(um, v1, 63)[1]], [iso.P(um, v1, 63)[0], iso.P(um, v1, 63)[1] - 6 * RES], 1 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// OHEL MOISHE / JEWISH REFUGEES MUSEUM (上海犹太难民纪念馆) — the Hongkou
// red-brick former synagogue: a tall brick gabled hall with a round-arched
// front, a small rose window and a slim corner stair-turret. 1×1, headroom.
// Warm red brick + cream trim.
// ---------------------------------------------------------------------
function jewishRefugeesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const BR = hex('#a55a44'); // Hongkou brick
  const CR = hex('#d6cbb4');
  const u0 = 0.18, u1 = 0.82, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1 - 0.04, v1, 0, 52, BR);
  iso.gable(u0, v0, u1 - 0.04, v1, 52, 16, 'u', hex('#6a6f78'), BR);
  // cream string-course
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, 24, 27, CR, { ink: false });
  // round-arched front windows
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.1 + i * 0.2;
    iso.r.poly([iso.P(u, v1, 10), iso.P(u + 0.07, v1, 10), iso.P(u + 0.07, v1, 26), iso.P(u + 0.035, v1, 32), iso.P(u, v1, 26)], alpha(COLORS.glassDark, 0.85));
  }
  // rose window on the gable end
  const [rx, ryB] = iso.P(u1 - 0.04, (v0 + v1) / 2, 44);
  iso.r.line([rx - 2.4 * RES, ryB], [rx + 2.4 * RES, ryB], 1.6 * RES, alpha(COLORS.glassLit, 0.55));
  // slim corner stair-turret with a small cap
  const tu = u1 - 0.1, tv = v1 - 0.1;
  iso.box(tu - 0.08, tv - 0.08, tu + 0.08, tv + 0.08, 0, 66, lighten(BR, 0.04));
  iso.hip(tu - 0.08, tv - 0.08, tu + 0.08, tv + 0.08, 66, 8, CR);
  return iso.build();
}

// ---------------------------------------------------------------------
// CONFUCIAN TEMPLE (文庙上海文庙) — the Shanghai Wen Miao: a curved-eave
// timber hall (Dacheng Hall) on a stone terrace, fronted by a small triple
// PAIFANG gateway arch. 2×2. Cinnabar walls + grey-tile sweeping roof + gold.
// ---------------------------------------------------------------------
function confucianTempleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.42;
  iso.shadow(u0, v0, u1, v1 + 0.2, 0.24, 0.24);
  // stone terrace
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 9, GRANITE, { ink: false });
  // cinnabar hall body
  iso.box(u0, v0, u1, v1, 9, 46, TEMPLE_WALL);
  colonnade(iso, v1, u0 + 0.08, u1 - 0.08, 9, 44, 7, lit(hex('#7a3a24'), 0.1));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 46, 50, GOLD, { topC: top(GOLD, 0.2), ink: false });
  // sweeping double-eave hip roof with flicked corners
  const ridgeRise = 30, eaveOver = 0.22, um = (u0 + u1) / 2;
  const eL = iso.P(u0 - eaveOver, v1 + eaveOver, 50);
  const eF = iso.P(u1 + eaveOver, v1 + eaveOver, 50);
  const eR = iso.P(u1 + eaveOver, v0 - eaveOver, 50);
  const ridgeF = iso.P(um, v1 + eaveOver, 50 + ridgeRise);
  const ridgeB = iso.P(um, v0 - eaveOver, 50 + ridgeRise);
  iso.r.poly([eL, eF, ridgeF, ridgeB], shaded(TEMPLE_TILE, 0.06));
  iso.r.poly([eF, eR, ridgeB, ridgeF], lit(TEMPLE_TILE, 0.08));
  iso.r.line([eL[0], eL[1]], [eL[0] - 3 * RES, eL[1] - 5 * RES], 1.4 * RES, lit(TEMPLE_TILE, 0.1));
  iso.r.line([eF[0], eF[1]], [eF[0] + 3 * RES, eF[1] - 5 * RES], 1.4 * RES, lit(TEMPLE_TILE, 0.1));
  iso.r.polyline([ridgeB, ridgeF], INK_W, INK);
  iso.r.line([ridgeF[0], ridgeF[1]], [ridgeF[0], ridgeF[1] - 5 * RES], 1.4 * RES, GOLD);
  iso.r.line([ridgeB[0], ridgeB[1]], [ridgeB[0], ridgeB[1] - 5 * RES], 1.4 * RES, GOLD);
  iso.r.polyline([eL, eF, eR], INK_W * 0.8, INK);
  // small triple paifang gateway in front
  for (const gu of [um - 0.34, um, um + 0.34] as const) {
    iso.box(gu - 0.03, v1 + 0.16, gu + 0.03, v1 + 0.22, 0, 22, hex('#7a3a24'));
  }
  iso.box(um - 0.42, v1 + 0.15, um + 0.42, v1 + 0.23, 22, 27, TEMPLE_WALL, { topC: top(TEMPLE_TILE, 0.1) });
  iso.r.line([iso.P(um - 0.42, v1 + 0.23, 27)[0], iso.P(um - 0.42, v1 + 0.23, 27)[1] - 3 * RES], [iso.P(um + 0.42, v1 + 0.23, 27)[0], iso.P(um + 0.42, v1 + 0.23, 27)[1] - 3 * RES], 1.2 * RES, GOLD);
  return iso.build();
}

// ---------------------------------------------------------------------
// MERCEDES-BENZ ARENA (梅赛德斯-奔驰文化中心) — the World-Expo "flying saucer":
// a huge shallow silver DISC/UFO roof floating on a glazed drum, ringed with
// coloured LED edge-lighting. 4×4 monster. Silver disc + jade glass drum.
// ---------------------------------------------------------------------
function mercedesArenaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const DISC = hex('#aeb8be');
  const cx = 2.0, cy = 2.0;
  const u0 = 0.5, u1 = 3.5, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  // glazed drum base
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 0, 34, alpha(JADE_SKY, 0.9));
  glassSkin(iso, u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 4, 32, 4);
  // the big shallow saucer DISC roof (a wide flat ellipse with a domed centre)
  const [sx, syB] = iso.P(cx, cy, 34);
  const R = 1.7 * (CELL_W / 2);
  const disc = (s: number, lift = 0): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([sx + Math.cos(a) * R * s, syB - lift + Math.sin(a) * R * 0.46 * s]);
    }
    return pts;
  };
  // underside rim (shaded), then top (lit)
  iso.r.poly(disc(1), shaded(DISC, 0.1));
  iso.r.poly(disc(1, 8 * RES), lit(DISC, 0.06));
  iso.r.poly(disc(0.5, 14 * RES), top(DISC, 0.22)); // domed centre cap
  // coloured LED edge ring (the arena's signature) — discrete cool/warm pips
  const rim = disc(1, 4 * RES);
  for (let i = 0; i < rim.length; i += 2) {
    iso.r.line(rim[i]!, rim[i]!, 1.6 * RES, alpha(i % 4 === 0 ? COLORS.glassLit : JADE_L, 0.7));
  }
  iso.r.polyline(disc(1, 8 * RES), INK_W * 0.8, INK, true);
  iso.glint([sx + R * 0.2, syB - 16 * RES], 3 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// SHANGHAI NATURAL HISTORY MUSEUM (上海自然博物馆) — the 2015 building shaped
// like a NAUTILUS SHELL: a green-roofed spiral wing curling around a great
// glazed "cell-wall" atrium face. 5×5 monster. Living-green roof + glass spiral.
// ---------------------------------------------------------------------
function naturalHistoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 90 });
  void seed;
  const GRN = hex('#7d9c6b'); // planted green roof
  const cx = 2.5, cy = 2.5;
  const u0 = 0.5, u1 = 4.5, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.22);
  // the spiralling shell wing: a chain of diminishing green-roofed arcs
  // sweeping around the centre, each a low box stepping up in height + in.
  const arcs = 7;
  for (let i = 0; i < arcs; i++) {
    const ang = (i / arcs) * Math.PI * 1.7;
    const rad = 1.7 - i * 0.2;
    const bu = cx + Math.cos(ang) * rad * 0.8;
    const bv = cy + Math.sin(ang) * rad * 0.8;
    const h = 20 + i * 6;
    iso.box(bu - 0.5, bv - 0.5, bu + 0.5, bv + 0.5, 0, h, mix(GRN, JADE, 0.2));
    // green roof cap
    iso.box(bu - 0.5, bv - 0.5, bu + 0.5, bv + 0.5, h, h + 3, lit(GRN, 0.08), { ink: false });
  }
  // the great glazed atrium "cell wall" face at the open side of the spiral
  const [ax, ayB] = iso.P(u1 - 0.2, cy + 1.2, 0);
  iso.r.poly(
    [[ax - 16 * RES, ayB], [ax + 6 * RES, ayB - 8 * RES], [ax + 6 * RES, ayB - 70 * RES], [ax - 16 * RES, ayB - 58 * RES]],
    alpha(JADE_SKY, 0.85),
  );
  // organic cell mullions
  for (let k = 1; k < 6; k++) {
    iso.r.line([ax - 16 * RES, ayB - k * 11 * RES], [ax + 6 * RES, ayB - 8 * RES - k * 10 * RES], 0.5 * RES, alpha(COLORS.white, 0.25));
  }
  iso.r.polyline([[ax - 16 * RES, ayB], [ax + 6 * RES, ayB - 8 * RES], [ax + 6 * RES, ayB - 70 * RES], [ax - 16 * RES, ayB - 58 * RES]], INK_W * 0.7, INK, true);
  iso.glint([ax - 4 * RES, ayB - 40 * RES], 3 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// SHANGHAI OCEAN AQUARIUM (上海海洋水族馆) — a Lujiazui landmark with a wavy
// blue-glass facade and a stepped, sail-like fin over the entrance. 3×3.
// Deep ocean-blue glass.
// ---------------------------------------------------------------------
function oceanAquariumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const BLU = hex('#3f6f8a'); // ocean blue glass
  const BLU_L = hex('#6f9cb4');
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  iso.box(u0, v0, u1, v1, 0, 56, BLU);
  glassSkin(iso, u0, v0, u1, v1, 6, 54, 6);
  // a curved wave-band of lighter glass sweeping across the front
  for (let i = 0; i <= 10; i++) {
    const u = u0 + (u1 - u0) * (i / 10);
    const z = 30 + Math.sin((i / 10) * Math.PI * 2) * 8;
    iso.r.line(iso.P(u, v1, z), iso.P(u, v1, z + 4), 1.4 * RES, alpha(BLU_L, 0.7));
  }
  // the stepped sail fin over the entrance corner
  const fu = u1 - 0.3, fv = v1 - 0.3;
  let z = 56, hw = 0.5;
  for (let i = 0; i < 3; i++) {
    hw *= 0.7;
    iso.box(fu - hw, fv - hw, fu + hw, fv + hw, z, z + 18, mix(BLU, BLU_L, 0.3 + 0.1 * i));
    z += 18;
  }
  const [mx, myB] = iso.P(fu, fv, z);
  iso.r.line([mx, myB], [mx, myB - 14 * RES], 1.3 * RES, STEELG);
  iso.glint([mx, myB - 12 * RES], 2.4 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// FRENCH MANSION (reusable) — the concession "little white house": a 1920s
// villa with a mansard roof, dormers, a corner bay and shuttered windows.
// Serves 上海工艺美术博物馆 (Arts&Crafts), 上海中山故居 (Sun Yat-sen residence,
// `brick`=true → brown), 王伯群? 1×1. Cream stucco + grey mansard.
// ---------------------------------------------------------------------
function frenchMansionTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const WALL = brick ? hex('#9a6f55') : hex('#dcd5c2');
  const MAN = hex('#54585f');
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 38, WALL);
  // shuttered windows (two rows)
  for (const zb of [10, 24] as const) {
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zb + 9, 4, alpha(COLORS.glassDark, 0.8), lighten(WALL, 0.1));
  }
  // a rounded corner bay
  const [bx, byB] = iso.P(u1 - 0.06, v1 - 0.06, 0);
  iso.r.poly([[bx - 4 * RES, byB], [bx + 4 * RES, byB], [bx + 4 * RES, byB - 40 * RES], [bx - 4 * RES, byB - 40 * RES]], lit(WALL, 0.06));
  // steep mansard roof with dormers
  iso.gable(u0, v0, u1, v1, 38, 13, 'u', MAN, WALL);
  for (const du of [u0 + 0.2, u0 + 0.45] as const) {
    const [dx, dyB] = iso.P(du, v1, 42);
    iso.r.rect(dx - 2 * RES, dyB - 8 * RES, dx + 2 * RES, dyB - 2 * RES, alpha(COLORS.glassLit, 0.6));
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// FORMER RACE CLUB / SHANGHAI HISTORY MUSEUM (上海市历史博物馆) — the 1933
// brown-brick clubhouse beside the old racecourse (now People's Square): a long
// arcaded block with a tall square CLOCK TOWER + colonnaded belvedere. 3×3,
// headroom. Brown brick + grey clock tower.
// ---------------------------------------------------------------------
function raceClubTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const BR = hex('#9c7456'); // race-club brick
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, 58, BR);
  // ground arcade (round arches)
  for (let i = 0; i < 8; i++) {
    const u = u0 + 0.16 + i * 0.28;
    iso.r.poly([iso.P(u, v1, 6), iso.P(u + 0.14, v1, 6), iso.P(u + 0.14, v1, 18), iso.P(u + 0.07, v1, 24), iso.P(u, v1, 18)], alpha(INK, 0.45));
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 28, 52, 10, alpha(COLORS.glassDark, 0.8), lighten(BR, 0.1));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 58, 62, lighten(BR, 0.06), { topC: top(BR, 0.2) });
  // tall square clock tower toward one end
  const cx = u0 + 0.6, cy = (v0 + v1) / 2 - 0.05;
  const TWR = hex('#8d8579');
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 62, 120, TWR);
  // clock faces
  for (const [fu, fv, side] of [[cx, cy + 0.22, 'L'], [cx + 0.22, cy, 'R']] as const) {
    const [clx, cly] = iso.P(fu, fv, 106);
    const RR = 3.2 * RES;
    const ring: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]);
    }
    iso.r.poly(ring, COLORS.white);
    iso.r.polyline(ring, INK_W * 0.6, INK, true);
    iso.r.line([clx, cly], [clx, cly - 2.2 * RES], 0.8 * RES, INK);
    iso.r.line([clx, cly], [clx + (side === 'R' ? 1.4 : -1.4) * RES, cly], 0.8 * RES, INK);
  }
  // open colonnaded belvedere + green cupola
  colonnade(iso, cy + 0.22, cx - 0.18, cx + 0.18, 120, 132, 4, COLORS.white);
  const [dx, dyB] = iso.P(cx, cy, 132);
  const rPx = 0.18 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.3]);
  }
  iso.r.poly(dome, shaded(COPPER, 0.06), lit(COPPER, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - rPx * 1.3], [dx, dyB - rPx * 1.3 - 10 * RES], 1.2 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// CONCESSION THEATRE (reusable) — 兰心大戏院 Lyceum / 黄浦剧场 Huangpu: a
// compact Art-Deco theatre, rendered corner block with a stepped marquee
// fin + vertical sign pylon and banded brick. 1×1, headroom. `brick` swaps
// cream stone for brown brick. Warm stone + lit marquee.
// ---------------------------------------------------------------------
function theatreTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const WALL = brick ? hex('#9a6f52') : hex('#cdbfa3');
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 50, WALL);
  // horizontal deco banding
  for (let z = 10; z < 48; z += 9) {
    iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 2, lighten(WALL, 0.1), { ink: false });
  }
  // lit marquee band over the entrance (warm glow)
  iso.r.poly([iso.P(u0 + 0.04, v1, 16), iso.P(u1 - 0.04, v1, 16), iso.P(u1 - 0.04, v1, 22), iso.P(u0 + 0.04, v1, 22)], alpha(COLORS.glassLit, 0.7));
  // a vertical sign pylon rising at the corner
  const su = u1 - 0.12, sv = v1 - 0.12;
  iso.box(su - 0.05, sv - 0.05, su + 0.05, sv + 0.05, 50, 86, lighten(WALL, 0.04));
  const [px, pyB] = iso.P(su, sv, 86);
  iso.r.line([px, pyB], [px, pyB - 12 * RES], 1.4 * RES, alpha(GOLD_HOT, 0.9));
  iso.glint([px, pyB - 6 * RES], 2.2 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// SMALL DECO CIVIC BLOCK (reusable) — 上海市中华路电话局 telephone exchange /
// 徐家汇藏书楼 Bibliotheca Zikawei / 光华楼: a modest brick-or-stone civic
// building with a flat parapet, regular tall windows and a low central
// accent. 1×1, light headroom. `brick` toggles palette.
// ---------------------------------------------------------------------
function civicBlockTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const WALL = brick ? hex('#9a7458') : hex('#cabfa9');
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 44, WALL);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(WALL, 0.12), { ink: false });
  // tall regular windows on both faces
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 12, 38, 5, alpha(COLORS.glassDark, 0.8), lighten(WALL, 0.1));
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 12, 38, 4, alpha(COLORS.glassDark, 0.8), lighten(WALL, 0.1));
  // flat cornice + a low central accent
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 44, 48, lighten(WALL, 0.08), { topC: top(WALL, 0.25) });
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.12, cy - 0.12, cx + 0.12, cy + 0.12, 48, 56, lighten(WALL, 0.04));
  return iso.build();
}

// ---------------------------------------------------------------------
// SHIKUMEN / LILONG BLOCK (reusable) — the iconic Shanghai stone-gate lane
// houses. Serves 中共一大会址 (Site of 1st CPC Congress), 鲁迅故居 (Lu Xun
// residence), 中共中央与中央军委联络点旧址, 1927·鲁迅与内山纪念书局: a row of
// joined two-storey grey-brick townhouses with red-trim STONE-GATE doorways,
// pitched tile roofs and a small front courtyard wall. 2×2. Grey brick + red.
// ---------------------------------------------------------------------
function shikumenTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const BRK = hex('#9a958a'); // grey qing-brick
  const TRIM = hex('#8a4a36'); // red-brown stone-gate trim
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a terrace of three joined units along u
  const units = 3;
  for (let i = 0; i < units; i++) {
    const a = u0 + ((u1 - u0) * i) / units;
    const b = u0 + ((u1 - u0) * (i + 1)) / units;
    iso.box(a, v0, b - 0.01, v1, 0, 40, mix(BRK, lighten(BRK, 0.05 * (i % 2)), 0.5));
    // pitched tile roof per unit (ridge along v)
    iso.gable(a, v0, b - 0.01, v1, 40, 11, 'v', hex('#5c564c'), BRK);
    // the STONE-GATE doorway: a red-trim arched/lintelled portal on the front
    const du = (a + b) / 2;
    iso.r.poly([iso.P(du - 0.07, v1, 0), iso.P(du + 0.07, v1, 0), iso.P(du + 0.07, v1, 16), iso.P(du - 0.07, v1, 16)], shaded(TRIM, 0.06));
    // lintel pediment over the gate
    iso.r.poly([iso.P(du - 0.09, v1, 16), iso.P(du + 0.09, v1, 16), iso.P(du, v1, 21)], lit(TRIM, 0.08));
    // upstairs window
    iso.r.poly([iso.P(du - 0.05, v1, 24), iso.P(du + 0.05, v1, 24), iso.P(du + 0.05, v1, 34), iso.P(du - 0.05, v1, 34)], alpha(COLORS.glassDark, 0.85));
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// MONUMENT TO THE PEOPLE'S HEROES (人民英雄纪念塔) — the Bund's three soaring
// tapering granite SHAFTS (a tripod of pylons) on a low plinth, gun-grey stone.
// 1×1, headroom. Pale granite.
// ---------------------------------------------------------------------
function heroesMonumentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const GR = hex('#b6b1a4');
  const cx = 0.5, cy = 0.5;
  iso.shadow(cx - 0.3, cy - 0.2, cx + 0.3, cy + 0.35, 0.22, 0.24);
  // low round plinth
  iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 0, 12, GRANITE, { ink: false });
  // three tapering shafts leaning slightly together
  const feet: Array<[number, number]> = [[cx - 0.16, cy + 0.12], [cx + 0.16, cy + 0.12], [cx, cy - 0.18]];
  for (const [fu, fv] of feet) {
    const b0 = iso.P(fu - 0.07, fv, 12);
    const b1 = iso.P(fu + 0.07, fv, 12);
    const t0 = iso.P(cx - 0.018, cy, 176);
    const t1 = iso.P(cx + 0.018, cy, 176);
    iso.r.poly([b0, b1, t1, t0], shaded(GR, 0.1), lit(GR, 0.06));
    iso.r.polyline([b0, t0, t1, b1], INK_W * 0.7, INK);
  }
  iso.glint([iso.P(cx, cy, 176)[0], iso.P(cx, cy, 176)[1]], 2.6 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// GUTZLAFF SIGNAL TOWER (外滩信号台) — the Bund's slim round 1907 Beaux-Arts
// SIGNAL MAST: a tall tapering cylindrical brick tower with a small cabin and
// a tall steel signal mast with yardarm. 1×1, headroom. Dusty-rose brick.
// ---------------------------------------------------------------------
function signalTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const BR = hex('#a8806e');
  const cx = 0.5, cy = 0.5;
  iso.shadow(cx - 0.2, cy - 0.15, cx + 0.2, cy + 0.25, 0.2, 0.24);
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 0, 8, GRANITE, { ink: false });
  const [gx, gyB] = iso.P(cx, cy, 8);
  const Rb = 0.16 * (CELL_W / 2), Rt = 0.1 * (CELL_W / 2), H = 120;
  // tapering cylinder as a trapezoidal silhouette
  iso.r.poly([[gx - Rb, gyB], [gx + Rb, gyB], [gx + Rt, gyB - H * RES], [gx - Rt, gyB - H * RES]], shaded(BR, 0.06), lit(BR, 0.06));
  // floor bands
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    const y = gyB - t * H * RES;
    const r = Rb + (Rt - Rb) * t;
    iso.r.line([gx - r, y], [gx + r, y], 0.5 * RES, alpha(INK, 0.4));
  }
  iso.r.polyline([[gx - Rb, gyB], [gx - Rt, gyB - H * RES], [gx + Rt, gyB - H * RES], [gx + Rb, gyB]], INK_W * 0.8, INK);
  // small cabin at top
  iso.r.rect(gx - Rt - 1 * RES, gyB - H * RES - 7 * RES, gx + Rt + 1 * RES, gyB - H * RES, lighten(BR, 0.08));
  // the tall signal mast + yardarm + ball
  const my = gyB - H * RES - 7 * RES;
  iso.r.line([gx, my], [gx, my - 54 * RES], 1.6 * RES, STEELG);
  iso.r.line([gx - 8 * RES, my - 40 * RES], [gx + 8 * RES, my - 40 * RES], 1 * RES, STEELG); // yardarm
  iso.r.line([gx - 8 * RES, my - 22 * RES], [gx + 8 * RES, my - 22 * RES], 1 * RES, STEELG);
  iso.r.line([gx, my - 54 * RES], [gx, my - 60 * RES], 3 * RES, GOLD_HOT); // time-ball
  return iso.build();
}

// ---------------------------------------------------------------------
// PACIFIC HOTEL (金门大酒店) — the 1926 People's-Park Art-Deco hotel: a
// rendered stone block with strong vertical bays crowned by a small green-
// copper baroque CLOCK TURRET. 2×2, headroom. Cream stone + copper turret.
// ---------------------------------------------------------------------
function pacificHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const ST = hex('#cdc1a6');
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  iso.box(u0, v0, u1, v1, 0, 104, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(ST, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 14, 98, 9, alpha(COLORS.glassDark, 0.82), lighten(ST, 0.1));
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 14, 98, 8, alpha(COLORS.glassDark, 0.82), lighten(ST, 0.1));
  iso.box(u0 + 0.08, v0 + 0.08, u1 - 0.08, v1 - 0.08, 104, 112, lighten(ST, 0.06));
  // the green-copper clock turret on the roof
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, 112, 134, lighten(ST, 0.03));
  const [clx, cly] = iso.P(cx, cy + 0.16, 126);
  const RR = 2.6 * RES;
  const cring: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; cring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]); }
  iso.r.poly(cring, COLORS.white); iso.r.polyline(cring, INK_W * 0.5, INK, true);
  const [dx, dyB] = iso.P(cx, cy, 134);
  const rPx = 0.16 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.4]); }
  iso.r.poly(dome, shaded(COPPER, 0.06), lit(COPPER, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - rPx * 1.4], [dx, dyB - rPx * 1.4 - 10 * RES], 1.2 * RES, GOLD_HOT);
  return iso.build();
}

// =====================================================================
// ROUND 3 — Lujiazui glass icons + the Bund banks + Hongqiao + Zhujiajiao
// water-town + more lilong. Each resolves a PLACED name and builds its own
// silhouette (Pudong jade-teal glass / Bund grey stone), per the owner brief.
// =====================================================================

// ---------------------------------------------------------------------
// BOCOM FINANCIAL TOWERS (交通银行金融大厦) — TWO conjoined postmodern slabs
// joined at a shared core: a taller and a shorter teal-glass shaft with
// chamfered crowns and a low shared podium. 265 m — towers. 3×3, headroom.
// ---------------------------------------------------------------------
function bocomTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 320 });
  void seed;
  const SKIN = mix(JADE, STEELG, 0.25); // cool teal-steel curtain wall
  iso.shadow(0.5, 0.5, 2.5, 2.5, 0.4, 0.22);
  iso.box(0.5, 0.5, 2.5, 2.5, 0, 22, shaded(SKIN, 0.16), { ink: false }); // shared podium
  // two conjoined shafts offset along the diamond, sharing a central seam
  const shafts: Array<[number, number, number, number, number]> = [
    [0.6, 0.6, 1.5, 1.94, 286], // taller north slab
    [1.5, 1.06, 2.4, 2.4, 232], // shorter south slab
  ];
  for (const [a0, b0, a1, b1, H] of shafts) {
    iso.box(a0, b0, a1, b1, 22, H, SKIN);
    glassSkin(iso, a0, b0, a1, b1, 26, H, Math.round(H));
    // strong vertical mullion piers (the postmodern ribbing)
    for (let u = a0 + 0.12; u <= a1 - 0.05; u += 0.2) {
      iso.r.line(iso.P(u, b1, 26), iso.P(u, b1, H), 1 * RES, alpha(shaded(SKIN, 0.22), 0.5));
    }
    // a chamfered notched crown
    iso.box(a0 + 0.06, b0 + 0.06, a1 - 0.06, b1 - 0.06, H, H + 12, mix(SKIN, JADE_SKY, 0.45), { topC: top(JADE_L, 0.2) });
    const [mx, myB] = iso.P((a0 + a1) / 2, (b0 + b1) / 2, H + 12);
    iso.r.line([mx, myB], [mx, myB - 18 * RES], 1.3 * RES, STEELG);
    iso.r.line([mx, myB - 14 * RES], [mx, myB - 20 * RES], 2.2 * RES, GOLD_HOT);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// BANK OF CHINA TOWER, SHANGHAI (中国银行大厦) — a Nikken-Sekkei 53-storey
// shaft with a distinctive STEPPED grey-granite-and-glass crown (a stack of
// receding setbacks suggesting a Chinese cap). 2×2, headroom. Steel-grey.
// ---------------------------------------------------------------------
function bankOfChinaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 290 });
  void seed;
  const SKIN = mix(STEELG, JADE, 0.3); // grey-teal granite/glass
  const u0 = 0.52, u1 = 1.48, v0 = 0.56, v1 = 1.44;
  const H = 250;
  iso.shadow(u0, v0, u1, v1, 0.32, 0.22);
  iso.box(u0 - 0.12, v0 - 0.12, u1 + 0.12, v1 + 0.12, 0, 20, shaded(SKIN, 0.16), { ink: false });
  iso.box(u0, v0, u1, v1, 0, H, SKIN);
  glassSkin(iso, u0, v0, u1, v1, 24, H, 31);
  // deep vertical granite piers framing the glass
  for (const u of [u0 + 0.02, (u0 + u1) / 2, u1 - 0.02]) {
    iso.r.line(iso.P(u, v1, 22), iso.P(u, v1, H), 1.6 * RES, alpha(shaded(SKIN, 0.26), 0.7));
  }
  // the STEPPED crown: three receding granite setbacks (the Chinese "cap")
  let z = H, hw = 0.48, hh = 0.44;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  for (let i = 0; i < 3; i++) {
    iso.box(cx - hw, cy - hh, cx + hw, cy + hh, z, z + 14, lighten(SKIN, 0.04 + i * 0.03));
    z += 14; hw *= 0.7; hh *= 0.7;
  }
  const [mx, myB] = iso.P(cx, cy, z);
  iso.r.line([mx, myB], [mx, myB - 26 * RES], 1.4 * RES, STEELG);
  iso.r.line([mx, myB - 20 * RES], [mx, myB - 28 * RES], 2.4 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// CITIGROUP TOWER (花旗集团大厦) — a 180 m Pudong office shaft with a clean
// flat top and a slim setback antenna mast; pale silver-teal curtain wall
// with a chamfered corner. 3×3 (drawn wide), headroom. Silver-teal glass.
// ---------------------------------------------------------------------
function citigroupTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 250 });
  void seed;
  const SKIN = mix(JADE_SKY, STEELG, 0.4);
  const u0 = 0.6, u1 = 2.4, v0 = 0.66, v1 = 2.34;
  const H = 218;
  iso.shadow(u0, v0, u1, v1, 0.36, 0.22);
  iso.box(u0 - 0.08, v0 - 0.08, u1 + 0.08, v1 + 0.08, 0, 20, shaded(SKIN, 0.16), { ink: false });
  iso.box(u0, v0, u1, v1, 0, H, SKIN);
  glassSkin(iso, u0, v0, u1, v1, 24, H, 17);
  // a vertical chamfer seam down the near corner (the cut corner)
  iso.r.line(iso.P(u1, v1, 24), iso.P(u1, v1, H), 1.6 * RES, alpha(lit(SKIN, 0.12), 0.6));
  // clean flat parapet + slim antenna mast
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, H, H + 10, mix(SKIN, JADE_SKY, 0.5), { topC: top(JADE_L, 0.22) });
  const [mx, myB] = iso.P((u0 + u1) / 2, (v0 + v1) / 2, H + 10);
  iso.r.line([mx, myB], [mx, myB - 30 * RES], 1.4 * RES, STEELG);
  iso.r.line([mx, myB - 24 * RES], [mx, myB - 32 * RES], 2.2 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// ONE LUJIAZUI (陆家嘴1号) — a slim 269 m glass office tower with a softly
// curved/tapered prow and a crisp crown, by Lujiazui Central Park. 1×1,
// tall via headroom. Jade-teal glass.
// ---------------------------------------------------------------------
function oneLujiazuiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 300 });
  void seed;
  const u0 = 0.18, u1 = 0.82, v0 = 0.2, v1 = 0.8;
  const H = 256;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 16, shaded(JADE, 0.16), { ink: false });
  iso.box(u0, v0, u1, v1, 0, H, JADE);
  glassSkin(iso, u0, v0, u1, v1, 20, H, 8);
  // a softly rounded glass prow — a thin lit lens up the near corner
  iso.r.line(iso.P(u1, v1, 20), iso.P(u1, v1, H), 1.8 * RES, alpha(lit(JADE_L, 0.14), 0.6));
  // tapered crown: a short setback drum + cap
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, H, H + 18, mix(JADE, JADE_SKY, 0.4), { topC: top(JADE_L, 0.22) });
  const [mx, myB] = iso.P(cx, cy, H + 18);
  iso.r.line([mx, myB], [mx, myB - 20 * RES], 1.3 * RES, STEELG);
  iso.r.line([mx, myB - 16 * RES], [mx, myB - 22 * RES], 2 * RES, GOLD_HOT);
  iso.glint([mx, myB - 4 * RES], 2 * RES);
  return iso.build();
}

// ---------------------------------------------------------------------
// SHANGHAI IFC (上海国金中心) — César Pelli's TWIN tapering towers (north
// taller, south shorter) with curved-shoulder tops + lantern crowns over a
// big mall podium, by the river opposite the Pearl. 2×2, headroom. Teal glass.
// ---------------------------------------------------------------------
function shanghaiIfcTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 320 });
  void seed;
  const SKIN = mix(JADE, JADE_SKY, 0.3);
  iso.shadow(0.4, 0.4, 1.6, 1.6, 0.32, 0.22);
  // broad shared mall podium
  iso.box(0.4, 0.4, 1.6, 1.6, 0, 28, shaded(SKIN, 0.14));
  glassSkin(iso, 0.4, 0.4, 1.6, 1.6, 6, 26, 3);
  // two Pelli towers: each tapers in steps and rounds to a lantern crown
  const towers: Array<[number, number, number, number]> = [
    [0.52, 0.52, 286, 0.46], // north (taller)
    [1.06, 1.06, 232, 0.4], // south (shorter)
  ];
  for (const [bcx, bcy, H, hw0] of towers) {
    let z = 28, hw = hw0;
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const z1 = 28 + ((H - 28) * (i + 1)) / segs;
      iso.box(bcx - hw, bcy - hw, bcx + hw, bcy + hw, z, z1, SKIN);
      glassSkin(iso, bcx - hw, bcy - hw, bcx + hw, bcy + hw, z + 2, z1, i * 4 + Math.round(H));
      z = z1; hw *= 0.86;
    }
    // rounded lantern crown
    const [tx, tyB] = iso.P(bcx, bcy, z);
    const rPx = hw * 1.6 * (CELL_W / 2);
    const crown: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; crown.push([tx + Math.cos(a) * rPx, tyB - Math.sin(a) * rPx * 1.5]); }
    iso.r.poly(crown, shaded(JADE_L, 0.06), lit(JADE_L, 0.08));
    iso.r.polyline(crown, INK_W * 0.7, INK);
    iso.r.line([tx, tyB - rPx * 1.5], [tx, tyB - rPx * 1.5 - 12 * RES], 1.3 * RES, GOLD_HOT);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// TOMORROW SQUARE (明天广场) — Portman's striking Puxi tower: a square shaft
// that ROTATES 45° partway up into a diamond, splitting into four blade-like
// pinnacles around a notch (the People's-Square "rocket"). 3×3, very tall.
// Silver-grey glass.
// ---------------------------------------------------------------------
function tomorrowSquareTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 320 });
  void seed;
  const SKIN = hex('#9fb0b8'); // cool silver-grey
  const cx = 1.5, cy = 1.5;
  iso.shadow(cx - 0.6, cy - 0.5, cx + 0.6, cy + 0.6, 0.4, 0.22);
  iso.box(cx - 0.72, cy - 0.72, cx + 0.72, cy + 0.72, 0, 22, shaded(SKIN, 0.16), { ink: false }); // podium
  // lower SQUARE shaft (aligned to the tile axes)
  const Hbase = 150;
  iso.box(cx - 0.5, cy - 0.5, cx + 0.5, cy + 0.5, 22, Hbase, SKIN);
  glassSkin(iso, cx - 0.5, cy - 0.5, cx + 0.5, cy + 0.5, 26, Hbase, 12);
  // the ROTATED diamond upper shaft (45°): drawn as a tapering prism whose
  // plan is a square turned 45°, built from screen-space diamond rings.
  const [gx, gyB] = iso.P(cx, cy, 0);
  const Htop = 282;
  const diamond = (z: number, rad: number): [Pt, Pt, Pt, Pt] => {
    const cz = gyB - z * RES;
    const rx = rad * (CELL_W / 2), ry = rad * (CELL_W / 2) * 0.5;
    // a square rotated 45° projects to a tall diamond in iso
    return [[gx, cz - ry * 1.4], [gx + rx, cz], [gx, cz + ry * 1.4], [gx - rx, cz]];
  };
  // four blade pinnacles: model as the diamond prism tapering + a top notch
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const z0 = Hbase + (Htop - Hbase) * t0, z1 = Hbase + (Htop - Hbase) * t1;
    const r0 = 0.46 * (1 - 0.5 * t0), r1 = 0.46 * (1 - 0.5 * t1);
    const d0 = diamond(z0, r0), d1 = diamond(z1, r1);
    // left+right faces of the diamond prism
    iso.r.poly([d0[3], d0[0], d1[0], d1[3]], lit(SKIN, 0.06));
    iso.r.poly([d0[0], d0[1], d1[1], d1[0]], shaded(SKIN, 0.04));
    iso.r.poly([d0[1], d0[2], d1[2], d1[1]], shaded(SKIN, 0.12));
  }
  // crisp silhouette ink up the diamond's outer edges
  const dBot = diamond(Hbase, 0.46), dTop = diamond(Htop, 0.23);
  iso.r.polyline([dBot[3], dTop[3], dTop[0], dBot[0]], INK_W, INK);
  iso.r.line(dBot[1], dTop[1], INK_W, INK);
  // the four blade pinnacles + central spike
  for (const dx of [-0.18, 0.18]) {
    const [px, pyB] = [dTop[0][0] + dx * (CELL_W / 2), dTop[0][1] + 4 * RES];
    iso.r.line([px, pyB], [px, pyB - 26 * RES], 1.4 * RES, lighten(SKIN, 0.1));
  }
  iso.r.line([dTop[0][0], dTop[0][1]], [dTop[0][0], dTop[0][1] - 34 * RES], 1.6 * RES, STEELG);
  iso.r.line([dTop[0][0], dTop[0][1] - 28 * RES], [dTop[0][0], dTop[0][1] - 36 * RES], 2.4 * RES, GOLD_HOT);
  return iso.build();
}

// ---------------------------------------------------------------------
// BUND BANK (reusable colonial range) — a grey granite/ashlar block with a
// rusticated base, a giant order of pilasters across the front, a balustraded
// or pedimented cornice, and a per-bank CROWN: a pediment, a corner cupola, a
// stepped attic or a small dome. Serves the Bund banks (Yokohama Specie, Glen
// Line, Banque de l'Indochine, Jardine Matheson, Palace Hotel). 2×2, headroom.
//   crown: 0 balustrade · 1 pediment · 2 corner cupola · 3 stepped attic ·
//          4 central dome (Palace Hotel red-brick + dome)
// ---------------------------------------------------------------------
function bundBankTile(seed: number, crown: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: crown >= 2 ? 130 : 90 });
  void seed;
  const WALL = brick ? hex('#a8714f') : BUND; // Palace Hotel red brick vs grey ashlar
  const WALL_D = brick ? hex('#894f33') : BUND_D;
  const u0 = 0.36, u1 = 1.64, v0 = 0.4, v1 = 1.6;
  const bodyH = 60;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, WALL);
  // rusticated granite two-storey base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 18, GRANITE, { ink: false });
  // giant order of engaged columns / pilasters on the front (piano nobile)
  colonnade(iso, v1, u0 + 0.1, u1 - 0.1, 18, 50, 11, COLORS.white);
  // window rows on the right return
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 20, 52, 6, alpha(COLORS.glassDark, 0.85), lighten(WALL, 0.08));
  // a couple of warm-lit windows (banking hall)
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 22, 34, 6, alpha(COLORS.glassLit, 0.5), undefined);
  // cornice band
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 5, lighten(WALL, 0.08), { topC: top(WALL, 0.3) });
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  if (crown === 0) {
    // balustrade rail
    for (let i = 0; i <= 12; i++) {
      const u = u0 + ((u1 - u0) * i) / 12;
      iso.r.line(iso.P(u, v1 + 0.03, bodyH), iso.P(u, v1 + 0.03, bodyH + 5), 0.7 * RES, alpha(WALL_D, 0.7));
    }
  } else if (crown === 1) {
    // central pediment
    iso.r.poly([iso.P(u0 + 0.3, v1, bodyH + 5), iso.P(u1 - 0.3, v1, bodyH + 5), iso.P(cx, v1, bodyH + 16)], lighten(WALL, 0.1));
    iso.r.polyline([iso.P(u0 + 0.3, v1, bodyH + 5), iso.P(u1 - 0.3, v1, bodyH + 5), iso.P(cx, v1, bodyH + 16)], INK_W * 0.8, INK, true);
  } else if (crown === 2) {
    // a corner CUPOLA (Glen Line / Yokohama baroque corner turret)
    const tu = u1 - 0.18, tv = v1 - 0.18;
    iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, bodyH + 5, bodyH + 26, lighten(WALL, 0.04));
    const [dx, dyB] = iso.P(tu, tv, bodyH + 26);
    const rPx = 0.17 * (CELL_W / 2);
    const dome: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.5]); }
    iso.r.poly(dome, shaded(COPPER, 0.06), lit(COPPER, 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    iso.r.line([dx, dyB - rPx * 1.5], [dx, dyB - rPx * 1.5 - 10 * RES], 1.1 * RES, GOLD_HOT);
  } else if (crown === 3) {
    // stepped attic storeys (Jardine Matheson's later upper floors)
    iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, bodyH + 5, bodyH + 18, lighten(WALL, 0.05));
    iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, bodyH + 18, bodyH + 28, lighten(WALL, 0.08));
  } else {
    // central DOME on a drum (Palace Hotel)
    iso.box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, bodyH + 5, bodyH + 20, lighten(WALL, 0.04));
    const [dx, dyB] = iso.P(cx, cy, bodyH + 20);
    const rPx = 0.2 * (CELL_W / 2);
    const dome: Pt[] = [];
    for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI; dome.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rPx * 1.3]); }
    iso.r.poly(dome, shaded(COPPER, 0.06), lit(COPPER, 0.08));
    iso.r.polyline(dome, INK_W * 0.7, INK);
    const ty = dyB - rPx * 1.3;
    iso.r.rect(dx - 2 * RES, ty - 5 * RES, dx + 2 * RES, ty + 1 * RES, lighten(WALL, 0.1));
    iso.r.line([dx, ty - 5 * RES], [dx, ty - 14 * RES], 1.2 * RES, GOLD_HOT);
  }
  return iso.build();
}

// ---------------------------------------------------------------------
// HONGQIAO TRANSPORT HUB (虹桥火车站 / 虹桥机场航站楼) — a MONSTER terminal:
// a vast low travertine concourse with a great sweeping standing-seam wave
// ROOF on slim columns, long ribbon glazing, and a tall control/clock pylon.
// 5×5, drawn very wide. Pale stone + steel-grey wave roof.
// ---------------------------------------------------------------------
function hongqiaoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 120 });
  void seed;
  const STN = hex('#cfc8b8'); // travertine
  const ROOF = hex('#94a0a8'); // steel wave roof
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.34, 0.2);
  // the long low concourse block
  iso.box(u0, v0 + 0.6, u1, v1, 0, 44, STN);
  // ribbon glazing across the front
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 40, 26, alpha(COLORS.glassLit, 0.42), lighten(STN, 0.06));
  for (let z = 14; z < 42; z += 9) {
    iso.box(u0 - 0.01, v1 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 2.5, lighten(STN, 0.08), { ink: false });
  }
  // the great sweeping WAVE ROOF: a broad shallow vault floating above on a
  // forest of slim columns, oversailing the front edge.
  const colZ = 52;
  for (let u = u0 + 0.4; u <= u1 - 0.2; u += 0.8) {
    iso.box(u - 0.04, v1 - 0.3, u + 0.04, v1 - 0.22, 0, colZ, GRANITE, { ink: false });
  }
  const [ax, ayB] = iso.P(u0, v0 + 0.4, colZ);
  const [bx, byB] = iso.P(u1, v0 + 0.4, colZ);
  const [cx2, cyB2] = iso.P(u1, v1 + 0.1, colZ);
  const [dx2, dyB2] = iso.P(u0, v1 + 0.1, colZ);
  const wave = 20 * RES;
  // a gently undulating front eave (the wave)
  const eaveFront: Pt[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    eaveFront.push([dx2 + (cx2 - dx2) * t, dyB2 + (cyB2 - dyB2) * t - wave - Math.sin(t * Math.PI * 2) * 5 * RES]);
  }
  const eaveBack: Pt[] = [[bx, byB - wave * 1.3], [ax, ayB - wave * 1.3]];
  iso.r.poly([...eaveFront, ...eaveBack], shaded(ROOF, 0.05), lit(ROOF, 0.08));
  iso.r.polyline(eaveFront, INK_W * 0.9, INK);
  // standing-seam lines fanning across the roof
  for (let i = 2; i < N - 1; i += 2) {
    iso.r.line(eaveFront[i]!, [ax + (bx - ax) * (i / N), ayB - wave * 1.3], 0.5 * RES, alpha(COLORS.white, 0.2));
  }
  // a tall control/clock pylon at one end
  const pu = u1 - 0.6;
  iso.box(pu - 0.14, v1 - 0.3, pu + 0.14, v1 - 0.04, 0, 92, lighten(STN, 0.04));
  const [clx, cly] = iso.P(pu, v1 - 0.04, 82);
  const RR = 3 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]); }
  iso.r.poly(ring, COLORS.white); iso.r.polyline(ring, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - 2.2 * RES], 0.8 * RES, INK);
  return iso.build();
}

// ---------------------------------------------------------------------
// ZHUJIAJIAO WATER TOWN (朱家角古镇) — the canal old-town: a cluster of low
// white-walled, dark-tiled Jiangnan houses with sweeping curved-ridge roofs
// along a green CANAL, crossed by the humpbacked Fangsheng stone arch BRIDGE.
// 3×3. Whitewash walls + grey-tile curved roofs + jade canal.
// ---------------------------------------------------------------------
function zhujiajiaoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const WALL = hex('#ddd6c6'); // jiangnan whitewash
  const TILE = hex('#5b5650'); // dark grey curved roof tile
  const u0 = 0.4, u1 = 2.6, v0 = 0.4, v1 = 2.6;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // the green canal running diagonally through the middle (a sunken jade strip)
  iso.r.poly(
    [iso.P(u0, 1.2, 0), iso.P(u1, 1.2, 0), iso.P(u1, 1.7, 0), iso.P(u0, 1.7, 0)],
    shaded(JADE, 0.18),
  );
  // a row of canal-side houses on the FAR bank (small, tiled, curved ridges)
  const house = (a: number, b: number, vv: number, h: number): void => {
    iso.box(a, vv - 0.18, b, vv, 0, h, WALL);
    // curved Jiangnan ridge: a low gable with upturned ends suggested by a peak
    iso.gable(a, vv - 0.18, b, vv, h, 9, 'v', TILE, WALL);
    const [ex, ey] = iso.P((a + b) / 2, vv, h + 9);
    iso.r.line([ex - 5 * RES, ey + 2 * RES], [ex - 7 * RES, ey - 2 * RES], 1 * RES, TILE); // upturned eave tip
    iso.r.line([ex + 5 * RES, ey + 2 * RES], [ex + 7 * RES, ey - 2 * RES], 1 * RES, TILE);
    // a little dark lattice window + door reflecting in the canal
    iso.r.poly([iso.P(a + 0.06, vv, 6), iso.P(a + 0.16, vv, 6), iso.P(a + 0.16, vv, 18), iso.P(a + 0.06, vv, 18)], alpha(hex('#3a4a44'), 0.85));
  };
  house(u0 + 0.05, u0 + 0.7, 1.16, 34);
  house(u0 + 0.75, u0 + 1.4, 1.16, 40);
  house(u0 + 1.45, u1 - 0.1, 1.16, 32);
  // a row on the NEAR bank too
  house(u0 + 0.2, u0 + 0.85, v1, 30);
  house(u0 + 0.9, u0 + 1.6, v1, 36);
  house(u0 + 1.7, u1, v1, 30);
  // THE humpbacked stone ARCH BRIDGE crossing the canal (Fangsheng Bridge)
  const bu = u0 + 1.5;
  const [b0x, b0y] = iso.P(bu, 1.7, 0);
  const [b1x, b1y] = iso.P(bu, 1.2, 0);
  const apexY = Math.min(b0y, b1y) - 26 * RES;
  const archMidX = (b0x + b1x) / 2;
  const span: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = b0x + (b1x - b0x) * t;
    const y = b0y + (b1y - b0y) * t - Math.sin(t * Math.PI) * 26 * RES;
    span.push([x, y]);
  }
  iso.r.polyline(span, 4 * RES, lit(hex('#b9b2a0'), 0.06)); // the pale stone hump
  iso.r.polyline(span, 4.6 * RES, alpha(INK, 0.5));
  iso.r.polyline(span, 3 * RES, lit(hex('#cfc8b6'), 0.1));
  // the arch reflection / opening under the hump
  void archMidX; void apexY;
  iso.r.line([span[6]![0], span[6]![1] + 2 * RES], [span[6]![0], span[6]![1] + 16 * RES], 1 * RES, alpha(shaded(JADE, 0.3), 0.6));
  return iso.build();
}

// ---------------------------------------------------------------------
// LILONG / SHIKUMEN BLOCK (reusable, variant) — a denser longtang block of
// joined stone-gate terraces along an alley, with a brick pailou alley-gate
// at the front. Distinct from the existing shikumenTile (a single terrace):
// this draws an L of two terrace rows + the entry arch, for Tianzifang /
// Xintiandi / the Jing'an lilong. 2×2. Grey qing-brick + red-brown trim.
// ---------------------------------------------------------------------
function lilongBlockTile(seed: number, withGate: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const BRK = hex('#9a958a'); // grey qing-brick
  const BRK2 = hex('#a59f93');
  const TRIM = hex('#8a4a36'); // stone-gate red-brown trim
  const ROOF = hex('#564f46');
  const u0 = 0.36, u1 = 1.64, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // back terrace row (along u, set back)
  const rowFront = (a: number, b: number, vA: number, vB: number, h: number, units: number): void => {
    for (let i = 0; i < units; i++) {
      const ua = a + ((b - a) * i) / units;
      const ub = a + ((b - a) * (i + 1)) / units;
      iso.box(ua, vA, ub - 0.008, vB, 0, h, mix(BRK, BRK2, i % 2));
      iso.gable(ua, vA, ub - 0.008, vB, h, 10, 'v', ROOF, BRK);
      // stone-gate doorway with a small pedimented lintel
      const du = (ua + ub) / 2;
      iso.r.poly([iso.P(du - 0.06, vB, 0), iso.P(du + 0.06, vB, 0), iso.P(du + 0.06, vB, 14), iso.P(du - 0.06, vB, 14)], shaded(TRIM, 0.06));
      iso.r.poly([iso.P(du - 0.08, vB, 14), iso.P(du + 0.08, vB, 14), iso.P(du, vB, 19)], lit(TRIM, 0.08));
      // a lit upstairs window
      iso.r.poly([iso.P(du - 0.045, vB, 22), iso.P(du + 0.045, vB, 22), iso.P(du + 0.045, vB, 31), iso.P(du - 0.045, vB, 31)], alpha(COLORS.glassLit, 0.55));
    }
  };
  rowFront(u0, u1, v0, v0 + 0.5, 38, 3); // back row
  rowFront(u0, u1, v1 - 0.5, v1, 34, 3); // front row (the visible alley terrace)
  if (withGate) {
    // a brick PAILOU alley-gate (the lane entrance) at the near-right
    const gu = u1 - 0.2;
    iso.box(gu - 0.05, v1 - 0.5, gu - 0.02, v1, 0, 46, lighten(BRK, 0.04));
    iso.box(gu + 0.18, v1 - 0.5, gu + 0.21, v1, 0, 46, lighten(BRK, 0.04));
    iso.box(gu - 0.07, v1 - 0.5, gu + 0.23, v1 - 0.46, 40, 50, TRIM, { ink: false }); // lintel beam
    // a small horizontal name-plaque
    iso.r.rect(iso.P(gu + 0.08, v1, 44)[0] - 5 * RES, iso.P(gu + 0.08, v1, 44)[1] - 4 * RES, iso.P(gu + 0.08, v1, 44)[0] + 5 * RES, iso.P(gu + 0.08, v1, 44)[1] + 1 * RES, lighten(GOLD, 0.1));
  }
  return iso.build();
}

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

  // === ROUND 2 ===========================================================
  // --- transport: the station shed + elevated metro -----------------------
  {
    city: 'shanghai',
    key: 'shanghai-railway-station',
    match: /上海站/,
    foot: [5, 5],
    seed: 1987,
    draw: railwayStationTile,
    light: { kind: 'facadeFlood', topZ: 76, halfW: 2.0 },
  },
  {
    city: 'shanghai',
    key: 'caoyang-road-station',
    match: /曹杨路/,
    foot: [4, 4],
    seed: 2000,
    draw: metroStationTile,
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.5 },
  },
  {
    city: 'shanghai',
    key: 'loushanguan-road-station',
    match: /娄山关路/,
    foot: [4, 4],
    seed: 2001,
    draw: metroStationTile,
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.5 },
  },

  // --- Pudong / CBD glass towers (jade-teal) ------------------------------
  {
    // 龙之梦大酒店 — the Longemont (twin shafts on a podium)
    city: 'shanghai',
    key: 'longemont-shanghai',
    match: /龙之梦/,
    foot: [2, 2],
    seed: 2005,
    draw: twinTowerTile,
    light: { kind: 'towerCrown', topZ: 218, halfW: 0.6 },
  },
  {
    // 上海东锦江希尔顿逸林酒店 — DoubleTree by Hilton
    city: 'shanghai',
    key: 'doubletree-dongjinjiang',
    match: /东锦江/,
    foot: [2, 2],
    seed: 2008,
    draw: twinTowerTile,
    light: { kind: 'towerCrown', topZ: 218, halfW: 0.6 },
  },
  {
    // 新锦江大酒店 — New Jin Jiang (the round revolving-restaurant hotel)
    city: 'shanghai',
    key: 'new-jinjiang-tower',
    match: /新锦江/,
    foot: [2, 2],
    seed: 1990,
    draw: cylinderTowerTile,
    light: { kind: 'spireBeacon', topZ: 222, halfW: 0.34 },
  },

  // --- malls --------------------------------------------------------------
  {
    // 正大广场 — Super Brand Mall (Lujiazui)
    city: 'shanghai',
    key: 'super-brand-mall',
    match: /正大广场/,
    foot: [5, 5],
    seed: 2002,
    draw: (s) => mallTile(s, false),
    light: { kind: 'stadiumFlood', topZ: 78, halfW: 1.9 },
  },
  {
    // 梅龙镇广场 — Westgate Mall (Isetan tower)
    city: 'shanghai',
    key: 'westgate-mall',
    match: /梅龙镇广场/,
    foot: [5, 5],
    seed: 1997,
    draw: (s) => mallTile(s, true),
    light: { kind: 'towerCrown', topZ: 196, halfW: 1.0 },
  },
  {
    // 世博源 — Expo Source mall (low retail spine)
    city: 'shanghai',
    key: 'expo-source-mall',
    match: /世博源/,
    foot: [5, 5],
    seed: 2010,
    draw: (s) => mallTile(s, false),
    light: { kind: 'stadiumFlood', topZ: 78, halfW: 1.9 },
  },
  {
    // 环球港 / Global Harbor — gilt palace mega-mall with twin cupolas
    city: 'shanghai',
    key: 'global-harbor',
    match: /Global Harbor|环球港/,
    foot: [5, 5],
    seed: 2013,
    draw: globalHarborTile,
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.9 },
  },
  {
    // 美罗城 — Metro City (the Xujiahui glass sphere)
    city: 'shanghai',
    key: 'metro-city',
    match: /美罗城/,
    foot: [4, 4],
    seed: 1999,
    draw: metroCityTile,
    light: { kind: 'rimCycle', topZ: 120, halfW: 0.9 },
  },

  // --- the riverfront Fosun / Bund Finance Center -------------------------
  {
    city: 'shanghai',
    key: 'fosun-bund-finance-center',
    match: /复星/,
    foot: [3, 3],
    seed: 2017,
    draw: fosunBfcTile,
    light: { kind: 'towerCrown', topZ: 124, halfW: 1.0 },
  },

  // --- churches, synagogues, temple ---------------------------------------
  {
    // 徐家汇圣依纳爵主教座堂 — St Ignatius Cathedral (the great twin-spire)
    city: 'shanghai',
    key: 'st-ignatius-cathedral',
    match: /圣依纳爵/,
    foot: [2, 2],
    seed: 1910,
    draw: stIgnatiusTile,
    light: { kind: 'facadeFlood', topZ: 200, halfW: 0.7 },
  },
  {
    // 董家渡圣方济各沙勿略堂 — St Francis Xavier / Dongjiadu (Neo-Baroque)
    city: 'shanghai',
    key: 'st-francis-xavier-church',
    match: /圣方济各|董家渡/,
    foot: [2, 2],
    seed: 1853,
    draw: baroqueChurchTile,
    light: { kind: 'facadeFlood', topZ: 114, halfW: 0.8 },
  },
  {
    // 若瑟堂 — St Joseph's (Yangjingbang), twin octagonal spires
    city: 'shanghai',
    key: 'st-joseph-church',
    match: /若瑟堂/,
    foot: [1, 1],
    seed: 1860,
    draw: twinSpireChurchTile,
    light: { kind: 'facadeFlood', topZ: 152, halfW: 0.5 },
  },
  {
    // 拉结会堂 — Ohel Rachel Synagogue (Greek-revival portico)
    city: 'shanghai',
    key: 'ohel-rachel-synagogue',
    match: /拉结/,
    foot: [1, 1],
    seed: 1920,
    draw: ohelRachelTile,
    light: { kind: 'facadeFlood', topZ: 63, halfW: 0.6 },
  },
  {
    // 上海犹太难民纪念馆 — Ohel Moishe / Jewish Refugees Museum (brick synagogue)
    city: 'shanghai',
    key: 'jewish-refugees-museum',
    match: /犹太难民/,
    foot: [1, 1],
    seed: 1927,
    draw: jewishRefugeesTile,
    light: { kind: 'facadeFlood', topZ: 68, halfW: 0.6 },
  },
  {
    // 文庙 — the Shanghai Confucian Temple
    city: 'shanghai',
    key: 'confucian-temple',
    match: /文庙/,
    foot: [2, 2],
    seed: 1855,
    draw: confucianTempleTile,
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.1 },
  },

  // --- civic / cultural ---------------------------------------------------
  {
    // 梅赛德斯-奔驰文化中心 — Mercedes-Benz Arena (the Expo "flying saucer")
    city: 'shanghai',
    key: 'mercedes-benz-arena',
    match: /梅赛德斯|奔驰/,
    foot: [4, 4],
    seed: 2010,
    draw: mercedesArenaTile,
    light: { kind: 'stadiumFlood', topZ: 56, halfW: 1.8 },
  },
  {
    // 上海自然博物馆 — Natural History Museum (the nautilus shell)
    city: 'shanghai',
    key: 'natural-history-museum',
    match: /自然博物馆/,
    foot: [5, 5],
    seed: 2015,
    draw: naturalHistoryTile,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.9 },
  },
  {
    // 上海海洋水族馆 — Ocean Aquarium (wavy blue-glass)
    city: 'shanghai',
    key: 'ocean-aquarium',
    match: /海洋水族馆/,
    foot: [3, 3],
    seed: 2002,
    draw: oceanAquariumTile,
    light: { kind: 'rimCycle', topZ: 110, halfW: 1.1 },
  },
  {
    // 上海工艺美术博物馆 — Museum of Arts & Crafts (the "little white house")
    city: 'shanghai',
    key: 'arts-crafts-museum',
    match: /工艺美术/,
    foot: [1, 1],
    seed: 1905,
    draw: (s) => frenchMansionTile(s, false),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.6 },
  },
  {
    // 上海中山故居 — Former Residence of Sun Yat-sen (brick French villa)
    city: 'shanghai',
    key: 'sun-yat-sen-residence',
    match: /中山故居/,
    foot: [1, 1],
    seed: 1918,
    draw: (s) => frenchMansionTile(s, true),
    light: { kind: 'genericGlow', topZ: 50, halfW: 0.6 },
  },
  {
    // 上海市历史博物馆 — former Race Club clubhouse (brick clock tower)
    city: 'shanghai',
    key: 'shanghai-history-museum',
    match: /历史博物馆/,
    foot: [3, 3],
    seed: 1933,
    draw: raceClubTile,
    light: { kind: 'facadeFlood', topZ: 132, halfW: 1.2 },
  },
  {
    // 兰心大戏院 — Lyceum Theatre (Art-Deco, brick)
    city: 'shanghai',
    key: 'lyceum-theatre',
    match: /兰心/,
    foot: [1, 1],
    seed: 1931,
    draw: (s) => theatreTile(s, true),
    light: { kind: 'towerCrown', topZ: 86, halfW: 0.6 },
  },
  {
    // 黄浦剧场 — Huangpu Theatre (Art-Deco, stone)
    city: 'shanghai',
    key: 'huangpu-theatre',
    match: /黄浦剧场/,
    foot: [1, 1],
    seed: 1936,
    draw: (s) => theatreTile(s, false),
    light: { kind: 'towerCrown', topZ: 86, halfW: 0.6 },
  },
  {
    // 上海市中华路电话局 — South District telephone exchange
    city: 'shanghai',
    key: 'telephone-exchange-south',
    match: /电话局/,
    foot: [1, 1],
    seed: 1921,
    draw: (s) => civicBlockTile(s, true),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.6 },
  },
  {
    // 徐家汇藏书楼 — Bibliotheca Zikawei (the old Jesuit library)
    city: 'shanghai',
    key: 'zikawei-library',
    match: /藏书楼/,
    foot: [1, 1],
    seed: 1897,
    draw: (s) => civicBlockTile(s, false),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.6 },
  },
  {
    // 光华楼 — Guanghua Tower (Fudan), a stone civic block
    city: 'shanghai',
    key: 'guanghua-tower',
    match: /光华楼/,
    foot: [1, 1],
    seed: 2005,
    draw: (s) => civicBlockTile(s, false),
    light: { kind: 'genericGlow', topZ: 56, halfW: 0.6 },
  },

  // --- shikumen / lilong (the stone-gate lane houses) ---------------------
  {
    // 中共一大会址 — Site of the 1st CPC National Congress (iconic shikumen)
    city: 'shanghai',
    key: 'shikumen-first-congress',
    match: /中共一大会址/,
    foot: [2, 2],
    seed: 1921,
    draw: shikumenTile,
    light: { kind: 'facadeFlood', topZ: 51, halfW: 1.0 },
  },
  {
    // 鲁迅故居 — Lu Xun's Former Residence
    city: 'shanghai',
    key: 'shikumen-lu-xun',
    match: /鲁迅故居/,
    foot: [2, 2],
    seed: 1933,
    draw: shikumenTile,
    light: { kind: 'genericGlow', topZ: 51, halfW: 1.0 },
  },
  {
    // 中共中央与中央军委联络点旧址 — CPC liaison-point site
    city: 'shanghai',
    key: 'shikumen-cpc-liaison',
    match: /联络点/,
    foot: [2, 2],
    seed: 1928,
    draw: shikumenTile,
    light: { kind: 'genericGlow', topZ: 51, halfW: 1.0 },
  },
  {
    // 1927·鲁迅与内山纪念书局 — Lu Xun & Uchiyama Memorial Bookstore
    city: 'shanghai',
    key: 'shikumen-uchiyama',
    match: /内山/,
    foot: [2, 2],
    seed: 1927,
    draw: shikumenTile,
    light: { kind: 'genericGlow', topZ: 51, halfW: 1.0 },
  },

  // --- monuments / Bund miscellany ----------------------------------------
  {
    // 人民英雄纪念塔 — Monument to the People's Heroes (the Bund tripod)
    city: 'shanghai',
    key: 'peoples-heroes-monument',
    match: /人民英雄/,
    foot: [1, 1],
    seed: 1993,
    draw: heroesMonumentTile,
    light: { kind: 'spireBeacon', topZ: 176, halfW: 0.2 },
  },
  {
    // 小南门警钟楼 — Xiaonanmen Alarm-Bell Tower (the slim signal tower)
    city: 'shanghai',
    key: 'xiaonanmen-bell-tower',
    match: /警钟楼|信号台/,
    foot: [1, 1],
    seed: 1910,
    draw: signalTowerTile,
    light: { kind: 'aerialBeacon', topZ: 178, halfW: 0.18 },
  },
  {
    // 金门大酒店 — Pacific Hotel (People's Park Art-Deco, copper clock turret)
    city: 'shanghai',
    key: 'pacific-hotel',
    match: /金门大酒店/,
    foot: [2, 2],
    seed: 1926,
    draw: pacificHotelTile,
    light: { kind: 'towerCrown', topZ: 134, halfW: 0.6 },
  },

  // --- ROUND 3: Lujiazui glass icons --------------------------------------
  {
    // 交通银行金融大厦 — Bocom Financial Towers (twin conjoined slabs)
    city: 'shanghai',
    key: 'bocom-financial-towers',
    match: /交通银行金融|交银金融|Bocom/,
    foot: [3, 3],
    seed: 2002,
    draw: bocomTile,
    light: { kind: 'towerCrown', topZ: 298, halfW: 1.2 },
  },
  {
    // 中国银行大厦 — Bank of China Tower, Shanghai (stepped granite crown)
    city: 'shanghai',
    key: 'bank-of-china-tower-shanghai',
    match: /中国银行大厦|中银大厦/,
    foot: [2, 2],
    seed: 2000,
    draw: bankOfChinaTile,
    light: { kind: 'towerCrown', topZ: 290, halfW: 0.8 },
  },
  {
    // 花旗集团大厦 — Citigroup Tower (flat-top Pudong office shaft + mast)
    city: 'shanghai',
    key: 'citigroup-tower',
    match: /花旗集团|花旗银行|Citigroup/,
    foot: [3, 3],
    seed: 2005,
    draw: citigroupTile,
    light: { kind: 'towerCrown', topZ: 228, halfW: 1.2 },
  },
  {
    // 陆家嘴1号 — One Lujiazui (slim curved-prow glass tower)
    city: 'shanghai',
    key: 'one-lujiazui',
    match: /陆家嘴1号|陆家嘴一号|One Lujiazui/,
    foot: [1, 1],
    seed: 2008,
    draw: oneLujiazuiTile,
    light: { kind: 'towerCrown', topZ: 274, halfW: 0.34 },
  },
  {
    // 上海国金中心 — Shanghai IFC (Pelli twin towers + mall podium)
    city: 'shanghai',
    key: 'shanghai-ifc',
    match: /国金中心|国际金融中心|IFC/,
    foot: [2, 2],
    seed: 2010,
    draw: shanghaiIfcTile,
    light: { kind: 'towerCrown', topZ: 300, halfW: 0.9 },
  },
  {
    // 明天广场 — Tomorrow Square (the rotated-diamond Portman "rocket")
    city: 'shanghai',
    key: 'tomorrow-square',
    match: /明天广场/,
    foot: [3, 3],
    seed: 2003,
    draw: tomorrowSquareTile,
    light: { kind: 'spireBeacon', topZ: 300, halfW: 1.0 },
  },

  // --- ROUND 3: the Bund banks (grey colonial stone) ----------------------
  {
    // 横滨正金银行大楼 — Yokohama Specie Bank (baroque corner cupola)
    city: 'shanghai',
    key: 'yokohama-specie-bank',
    match: /横滨正金/,
    foot: [2, 2],
    seed: 1924,
    draw: (s) => bundBankTile(s, 2, false),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    // 格林邮船大楼 — Glen Line Building (1922 stone range, pediment crown)
    city: 'shanghai',
    key: 'glen-line-building',
    match: /格林邮船|字林大楼/,
    foot: [2, 2],
    seed: 1922,
    draw: (s) => bundBankTile(s, 1, false),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },
  {
    // 东方汇理银行大楼 — Banque de l'Indochine (balustraded stone bank)
    city: 'shanghai',
    key: 'banque-de-l-indochine-building',
    match: /东方汇理/,
    foot: [2, 2],
    seed: 1914,
    draw: (s) => bundBankTile(s, 0, false),
    light: { kind: 'facadeFlood', topZ: 65, halfW: 1.0 },
  },
  {
    // 怡和洋行大楼 — Jardine Matheson Building (stepped-attic stone bank)
    city: 'shanghai',
    key: 'jardine-matheson-building',
    match: /怡和洋行/,
    foot: [2, 2],
    seed: 1922,
    draw: (s) => bundBankTile(s, 3, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    // 汇中饭店 — Palace Hotel (Sassoon, the red-brick domed north Peace Hotel)
    city: 'shanghai',
    key: 'palace-hotel',
    match: /汇中饭店|宫殿饭店/,
    foot: [2, 2],
    seed: 1908,
    draw: (s) => bundBankTile(s, 4, true),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.0 },
  },

  // --- ROUND 3: Hongqiao hub, Zhujiajiao water-town, more lilong ----------
  {
    // 虹桥火车站 / 虹桥机场航站楼 — Hongqiao transport hub (wave-roof terminal)
    city: 'shanghai',
    key: 'hongqiao-terminal',
    match: /虹桥火车站|虹桥站/,
    foot: [5, 5],
    seed: 2010,
    draw: hongqiaoTile,
    light: { kind: 'stadiumFlood', topZ: 72, halfW: 2.0 },
  },
  {
    // 朱家角古镇 — Zhujiajiao water town (canal houses + Fangsheng arch bridge)
    city: 'shanghai',
    key: 'zhujiajiao-water-town',
    match: /朱家角/,
    foot: [3, 3],
    seed: 1571,
    draw: zhujiajiaoTile,
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.3 },
  },
  {
    // 田子坊 — Tianzifang lilong (longtang terraces + alley pailou gate)
    city: 'shanghai',
    key: 'lilong-tianzifang',
    match: /田子坊/,
    foot: [2, 2],
    seed: 1930,
    draw: (s) => lilongBlockTile(s, true),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.0 },
  },
  {
    // 新天地里弄 — Xintiandi shikumen lilong block
    city: 'shanghai',
    key: 'lilong-xintiandi',
    match: /新天地里弄|新天地石库门/,
    foot: [2, 2],
    seed: 1926,
    draw: (s) => lilongBlockTile(s, false),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.0 },
  },
  {
    // 静安别墅 — Jing'an Villa lilong (a classic longtang block)
    city: 'shanghai',
    key: 'lilong-jingan',
    match: /静安别墅/,
    foot: [2, 2],
    seed: 1932,
    draw: (s) => lilongBlockTile(s, true),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.0 },
  },
];
