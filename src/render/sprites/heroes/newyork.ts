// New York & the Harbor — the bespoke-hero registry (Wave W5, round 1).
//
// The owner's note for NYC: the city must read DRAB GREY — steel, concrete and
// grey glass, NOT the warm London brick. Manhattan's heroes are SLIM and VERY
// TALL: they tower over the ordinary fabric on headroom-extended canvases, slim
// in footprint so they spike skyward without burying their neighbours. A bridge,
// a fort, a lighthouse, a station can each be a hero.
//
// Every hero below is a hand-authored iso sprite built from the iso.ts kit
// (boxes / prisms / roofs / contours) in the same ink-contour dusk idiom as
// landmarkSprites.ts — none reuse another hero's draw fn. Each is matched to a
// REAL placed name in src/data/cities/newyork.ts `named` (the only things that
// render), and each carries a bespoke night electrification light (the Empire
// State crown colour-cycles; the Chrysler sunburst and One-WTC-style spires get
// a tip beacon; Beaux-Arts civics are floodlit; the Washington Square Arch
// glows; obelisks/lighthouses get an aerial beacon).
//
// Drab-grey gamut (kept local so it never leaks into the shared palette):
//   LIMESTONE  pale grey Indiana-limestone / granite ashlar (Deco towers, civics)
//   GRANITE    darker grey base course / rusticated plinths
//   STEEL_GLASS cool grey-blue curtain-wall glass (post-war slabs)
//   BRONZE     Seagram's bronze-black mullioned metal
//   COPPER     weathered green copper (Woolworth / mansard crowns / statues)
//   DECO_BRICK desaturated grey-buff brick (the GE / Deco shafts — NOT warm red)
//   LEADROOF   dark lead / slate mansard + spire roofs
// All read grey/cool at dusk, so the skyline greys out exactly as asked.

import type { BespokeHero } from './registry';
import { CELL_W, INK, INK_W, Iso, lit, RES, shaded, top } from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';

// --- the New York grey gamut ------------------------------------------------
const LIMESTONE = hex('#cbc7bd'); // pale grey Indiana limestone / granite
const GRANITE = hex('#8e8a86'); // darker grey base course
const STEEL_GLASS = hex('#8f9cab'); // cool grey-blue curtain wall
const STEEL_GLASS_D = hex('#5d6675');
const BRONZE = hex('#4a4332'); // Seagram bronze-black metal
const BRONZE_LIT = hex('#6e6346');
const COPPER = hex('#5f8f7c'); // weathered green copper
const DECO_BRICK = hex('#9a948a'); // desaturated grey-buff Deco brick
const LEADROOF = hex('#4b5560'); // dark lead / slate
const GOLDLEAF = hex('#c8a24a'); // gilded caps / finials
const DIALSTONE = hex('#e6e0cf'); // pale clock dial

// shorthand glints used in several crowns
const GLASS_DK = COLORS.glassDark;
const GLASS_LIT = COLORS.glassLit;

// ===========================================================================
//  HELPERS — small shared primitives. Each hero still has its own draw fn;
//  these only build common sub-shapes (a stepped Deco shaft, a slim spire,
//  a stone window grid) so the silhouettes stay consistent and authored.
// ===========================================================================

/** A vertical run of recessed window slots up a tower face. `face` 'r' = the
 *  right (u=u1) wall between v∈[a,b]; 'l' = the left (v=v1) wall between u∈[a,b].
 *  Drawn as thin dark glass columns separated by stone piers — the regular
 *  gridded skin that makes a slab read as a skyscraper, not a blank box. */
function gridFace(
  iso: Iso,
  face: 'l' | 'r',
  fixed: number,
  a: number,
  b: number,
  zb: number,
  zt: number,
  cols: number,
  glass: RGBA,
): void {
  const d = (b - a) / cols;
  for (let i = 0; i < cols; i++) {
    const p = a + d * i + d * 0.26;
    const q = a + d * (i + 1) - d * 0.26;
    if (face === 'r') {
      iso.r.poly([iso.P(fixed, p, zt), iso.P(fixed, q, zt), iso.P(fixed, q, zb), iso.P(fixed, p, zb)], glass);
    } else {
      iso.r.poly([iso.P(p, fixed, zt), iso.P(q, fixed, zt), iso.P(q, fixed, zb), iso.P(p, fixed, zb)], glass);
    }
  }
}

/** A slim faceted spire/needle rising from (u,v) at zBase to height h, two lit
 *  faces + an ink ridge + a gilt finial pip. The Deco/Gothic crowning needle. */
function needle(iso: Iso, u: number, v: number, zBase: number, h: number, halfPx: number, c: RGBA, finial = GOLDLEAF): void {
  const apex = iso.P(u, v, zBase + h);
  const bL = iso.P(u, v, zBase);
  bL[0] -= halfPx;
  const bR = iso.P(u, v, zBase);
  bR[0] += halfPx;
  const bN = iso.P(u, v, zBase);
  iso.r.poly([bL, bN, apex], shaded(c, 0.1));
  iso.r.poly([bN, bR, apex], lit(c, 0.08));
  iso.r.polyline([bL, apex, bR], INK_W * 0.5, INK);
  iso.r.line(apex, [apex[0], apex[1] - 7 * RES], 1.2 * RES, finial);
}

// ===========================================================================
//  THE MARQUEE TRIO — Empire State, Chrysler, Woolworth
// ===========================================================================

/** EMPIRE STATE BUILDING — the definitive Art-Deco setback tower (1931, 381 m
 *  to the roof, 443 m to the mast tip). Grey Indiana-limestone shaft with the
 *  long unbroken central mast of windows, three great setbacks, then the
 *  slender mooring-mast lantern. Its signature is the COLOUR-CHANGING CROWN —
 *  the lit lantern (rimCycle drives the night colour-cycle). Slim 2×2 footprint
 *  on big headroom so it spikes far above the Midtown fabric. */
function empireStateTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 520 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.3, 0.5, 1.7, 1.66, 0.3, 0.26);

  // five-storey granite base spanning the full block
  iso.box(0.2, 0.32, 1.8, 1.78, 0, 26, GRANITE);
  // a broad lower massing (the 30-storey podium with its first great setbacks)
  iso.box(0.42, 0.5, 1.58, 1.6, 26, 150, ST);
  gridFace(iso, 'r', 1.58, 0.56, 1.54, 36, 144, 9, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.6, 0.48, 1.52, 36, 144, 9, alpha(GLASS_DK, 0.92));
  // first setback
  iso.box(0.5, 0.58, 1.5, 1.52, 150, 168, ST, { topC: lighten(ST, 0.06) });

  // the soaring central shaft — narrow, with the tall unbroken window mast that
  // gives the ESB its vertical Deco rhythm; rises to z360
  iso.box(0.62, 0.7, 1.38, 1.4, 168, 360, ST);
  // strong vertical limestone piers between continuous window strips (both faces)
  gridFace(iso, 'r', 1.38, 0.76, 1.34, 176, 350, 7, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.4, 0.66, 1.32, 176, 350, 7, alpha(GLASS_DK, 0.92));
  for (const v of [0.82, 0.95, 1.08, 1.21] as const) iso.r.line(iso.P(1.38, v, 176), iso.P(1.38, v, 352), 0.7 * RES, lighten(ST, 0.12));
  for (const u of [0.74, 0.87, 1.0, 1.13, 1.26] as const) iso.r.line(iso.P(u, 1.4, 176), iso.P(u, 1.4, 352), 0.7 * RES, lighten(ST, 0.1));

  // two upper setbacks stepping the shaft inward toward the crown
  iso.box(0.7, 0.78, 1.3, 1.32, 360, 378, ST, { topC: lighten(ST, 0.06) });
  iso.box(0.8, 0.88, 1.2, 1.22, 378, 404, ST, { topC: lighten(ST, 0.06) });

  // the Art-Deco crown: a stepped octagonal observation lantern (the lit dome),
  // then the mooring-mast tower and the antenna needle
  const cu = 1.0;
  const cv = 1.05;
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 404, 440, lighten(ST, 0.05));
  // the famous lit crown band — pale stone ribs that the night light colour-cycles
  for (let z = 410; z <= 436; z += 6) {
    iso.r.line(iso.P(cu - 0.16, cv + 0.16, z), iso.P(cu + 0.16, cv + 0.16, z), 0.8 * RES, alpha(lighten(ST, 0.2), 0.9));
    iso.r.line(iso.P(cu + 0.16, cv - 0.16, z), iso.P(cu + 0.16, cv + 0.16, z), 0.8 * RES, alpha(lighten(ST, 0.16), 0.85));
  }
  // observation-deck setback + the round mooring mast
  iso.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, 440, 462, ST);
  iso.box(cu - 0.055, cv - 0.055, cu + 0.055, cv + 0.055, 462, 496, lighten(ST, 0.04));
  iso.r.polyline(
    [iso.P(cu - 0.055, cv + 0.055, 496), iso.P(cu + 0.055, cv + 0.055, 496), iso.P(cu + 0.055, cv - 0.055, 496)],
    INK_W * 0.5,
    INK,
  );
  // the slim antenna mast spiking to the tip
  const mb = iso.P(cu, cv, 496);
  iso.r.line(mb, [mb[0], mb[1] - 60 * RES], 1.6 * RES, STEEL_GLASS_D);
  iso.r.line([mb[0], mb[1] - 60 * RES], [mb[0], mb[1] - 70 * RES], 1.0 * RES, GLASS_LIT);
  return iso.build();
}

/** CHRYSLER BUILDING — the 1930 Art-Deco masterpiece (319 m). Grey-white brick
 *  shaft with the unmistakable STAINLESS-STEEL SUNBURST CROWN: seven radiant
 *  terraced arches pierced with triangular windows, each tier smaller, capped by
 *  the slender spire. Slim 2×2 on headroom; the crown is the whole point. */
function chryslerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 470 });
  void seed;
  const ST = lighten(LIMESTONE, 0.04);
  const STEELC = hex('#b9c2cb'); // bright stainless steel (the Nirosta crown)
  const STEELC_D = hex('#8b95a1');
  iso.shadow(0.34, 0.52, 1.66, 1.62, 0.28, 0.26);

  // granite base + broad lower massing
  iso.box(0.26, 0.4, 1.74, 1.7, 0, 24, GRANITE);
  iso.box(0.46, 0.54, 1.54, 1.56, 24, 150, ST);
  gridFace(iso, 'r', 1.54, 0.6, 1.5, 34, 144, 8, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.56, 0.5, 1.48, 34, 144, 8, alpha(GLASS_DK, 0.92));

  // the slim soaring shaft (with the dark corner brick quoins ESB-style)
  iso.box(0.64, 0.72, 1.36, 1.38, 150, 300, ST);
  gridFace(iso, 'r', 1.36, 0.78, 1.32, 158, 292, 6, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.38, 0.68, 1.3, 158, 292, 6, alpha(GLASS_DK, 0.92));
  for (const v of [0.84, 0.98, 1.12, 1.26] as const) iso.r.line(iso.P(1.36, v, 158), iso.P(1.36, v, 294), 0.7 * RES, lighten(ST, 0.12));

  // --- THE SUNBURST CROWN: seven terraced semicircular arches, each tier set
  //     back and smaller, pierced with triangular "sunburst" windows. Built as
  //     stacked stainless fans facing the SE (the right/u face the sun lights).
  const cx0 = 1.0;
  const cy0 = 1.05;
  // a transitional setback under the arches
  iso.box(cx0 - 0.3, cy0 - 0.3, cx0 + 0.3, cy0 + 0.3, 300, 318, ST, { topC: lighten(ST, 0.06) });
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const f = i / (tiers - 1);
    const zb = 318 + i * 19;
    const halfW = (0.3 - f * 0.24) * (CELL_W / 2); // narrowing fan
    const rise = 30 - i * 2.4;
    const [ax, ay] = iso.P(cx0, cy0, zb); // arch springing-line centre (screen px)
    // the semicircular steel arch (front face), brighter on the sun side
    const arc: Pt[] = [];
    const STEPS = 14;
    for (let s = 0; s <= STEPS; s++) {
      const a = Math.PI * (s / STEPS);
      arc.push([ax - halfW + (Math.cos(Math.PI - a) + 1) * halfW, ay - Math.sin(a) * rise * RES]);
    }
    iso.r.poly([[ax - halfW, ay], ...arc, [ax + halfW, ay]], i % 2 === 0 ? STEELC : lighten(STEELC, 0.05), STEELC_D);
    iso.r.polyline(arc, INK_W * 0.5, alpha(INK, 0.7));
    // the radiating "sunburst" triangular windows piercing this tier
    const rays = 6 - Math.floor(i * 0.6);
    for (let r = 1; r < rays; r++) {
      const a = Math.PI * (r / rays);
      const rx = ax + Math.cos(Math.PI - a) * halfW * 0.86;
      const ry = ay - Math.sin(a) * rise * RES * 0.86;
      iso.r.poly(
        [[rx, ry], [rx - 1.4 * RES, ay - 1 * RES], [rx + 1.4 * RES, ay - 1 * RES]],
        alpha(GLASS_DK, 0.85),
      );
    }
    // the chevron seam lines that make the Nirosta cladding read as ribbed steel
    iso.r.line([ax - halfW, ay], [ax, ay - rise * RES], 0.6 * RES, alpha(lighten(STEELC, 0.2), 0.8));
    iso.r.line([ax + halfW, ay], [ax, ay - rise * RES], 0.6 * RES, alpha(lighten(STEELC, 0.2), 0.8));
  }
  // the slender needle spire spiking from the top tier
  needle(iso, cx0, cy0, 318 + (tiers - 1) * 19 + 24, 92, 3 * RES, STEELC, GLASS_LIT);
  return iso.build();
}

/** WOOLWORTH BUILDING — the 1913 "Cathedral of Commerce" (241 m), the great
 *  neo-Gothic terracotta tower: a broad U-shaped base, a slim central tower with
 *  vertical Gothic piers, gargoyled setbacks and a steep GREEN-COPPER pyramidal
 *  crown with corner pinnacles and a gilt finial. Slim 2×2 on headroom. */
function woolworthTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 380 });
  void seed;
  const TC = hex('#cdc4b2'); // pale cream-grey terracotta (reads grey at dusk)
  const TC_D = hex('#a89f8d');
  iso.shadow(0.3, 0.5, 1.7, 1.66, 0.3, 0.26);

  // the big 30-storey base block (the U-shaped massing, fronting the street)
  iso.box(0.24, 0.36, 1.76, 1.74, 0, 132, TC);
  // tall continuous Gothic window bays (pointed, vertical) on the two faces
  gridFace(iso, 'r', 1.76, 0.42, 1.7, 14, 124, 11, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.74, 0.3, 1.7, 14, 124, 11, alpha(GLASS_DK, 0.92));
  // vertical piers (the strong Gothic verticality)
  for (let v = 0.46; v < 1.72; v += 0.12) iso.r.line(iso.P(1.76, v, 8), iso.P(1.76, v, 130), 0.7 * RES, lighten(TC, 0.12));
  // a crenellated parapet over the base
  iso.box(0.24, 0.36, 1.76, 1.74, 132, 137, lighten(TC, 0.05), { ink: false });

  // the slim central tower rising from the centre-front of the base
  const tu = 1.06;
  const tv = 1.16;
  iso.box(tu - 0.28, tv - 0.28, tu + 0.28, tv + 0.28, 137, 286, TC);
  gridFace(iso, 'r', tu + 0.28, tv - 0.24, tv + 0.24, 146, 278, 4, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', tv + 0.28, tu - 0.24, tu + 0.24, 146, 278, 4, alpha(GLASS_DK, 0.92));
  for (const v of [tv - 0.14, tv, tv + 0.14] as const) iso.r.line(iso.P(tu + 0.28, v, 146), iso.P(tu + 0.28, v, 280), 0.7 * RES, lighten(TC, 0.14));

  // gothic setback with corner pinnacles (the gargoyle stage)
  iso.box(tu - 0.3, tv - 0.3, tu + 0.3, tv + 0.3, 286, 296, lighten(TC, 0.04), { ink: false });
  for (const [du, dv] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]] as const) {
    needle(iso, tu + du, tv + dv, 296, 30, 2.4 * RES, COPPER, GOLDLEAF);
  }
  // the green-copper steep pyramidal crown (the signature) + flèche
  iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 296, 312, TC_D);
  iso.hip(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 312, 44, COPPER);
  needle(iso, tu, tv, 356, 26, 2 * RES, COPPER, GOLDLEAF);
  return iso.build();
}

// ===========================================================================
//  MIDTOWN / PARK AVENUE TOWERS
// ===========================================================================

/** SEAGRAM BUILDING — Mies van der Rohe's 1958 bronze-and-glass modernist
 *  monolith (157 m), set back on its granite plaza. A pure dark rectangular
 *  prism: bronze-black metal mullions running unbroken top to bottom over amber
 *  glass, no crown. The archetype of the post-war curtain-wall slab. Slim 2×2. */
function seagramTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  iso.shadow(0.34, 0.52, 1.66, 1.62, 0.26, 0.24);
  // the raised granite plaza
  iso.box(0.18, 0.3, 1.82, 1.8, 0, 6, GRANITE, { topC: lighten(GRANITE, 0.08) });
  // the slab: a clean bronze prism set back on the plaza, rising to z250
  const u0 = 0.5;
  const u1 = 1.5;
  const v0 = 0.58;
  const v1 = 1.5;
  iso.box(u0, v0, u1, v1, 6, 250, BRONZE, {
    leftC: darken(BRONZE, 0.12),
    rightC: BRONZE_LIT,
    topC: lighten(BRONZE, 0.1),
  });
  // the continuous bronze mullions + warm amber glass between (the Seagram skin)
  gridFace(iso, 'r', u1, v0 + 0.04, v1 - 0.04, 12, 246, 14, alpha(hex('#caa45f'), 0.55));
  gridFace(iso, 'l', v1, u0 + 0.04, u1 - 0.04, 12, 246, 14, alpha(hex('#caa45f'), 0.45));
  // unbroken vertical bronze I-beam mullions (the famous detail)
  for (let i = 0; i <= 14; i++) {
    const v = v0 + ((v1 - v0) * i) / 14;
    iso.r.line(iso.P(u1, v, 8), iso.P(u1, v, 248), 0.8 * RES, BRONZE_LIT);
    const u = u0 + ((u1 - u0) * i) / 14;
    iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, 248), 0.8 * RES, darken(BRONZE, 0.04));
  }
  return iso.build();
}

/** GENERAL ELECTRIC BUILDING (570 Lexington, 1931) — the wild Art-Deco brick
 *  tower with the openwork "crown of thorns" Gothic spiky crown meant to evoke
 *  radio waves. Grey-buff brick octagonal shaft, deep setbacks, then the pierced
 *  filigree steel-and-terracotta crown. Slim 2×2 on headroom. */
function geBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 360 });
  void seed;
  const BK = DECO_BRICK;
  const CR = hex('#b08a52'); // ruddy terracotta crown filigree
  iso.shadow(0.32, 0.5, 1.68, 1.64, 0.28, 0.26);
  iso.box(0.28, 0.4, 1.72, 1.72, 0, 120, BK);
  gridFace(iso, 'r', 1.72, 0.46, 1.68, 12, 112, 9, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.72, 0.36, 1.68, 12, 112, 9, alpha(GLASS_DK, 0.92));
  // setback, then the slim shaft
  iso.box(0.5, 0.6, 1.5, 1.52, 120, 138, BK, { topC: lighten(BK, 0.05) });
  iso.box(0.66, 0.74, 1.34, 1.36, 138, 270, BK);
  gridFace(iso, 'r', 1.34, 0.8, 1.3, 146, 262, 5, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.36, 0.7, 1.3, 146, 262, 5, alpha(GLASS_DK, 0.92));
  // the "crown of thorns": a ring of slim pierced terracotta spikes + a central
  // burst — built as a cluster of needles of varying height
  const cu = 1.0;
  const cv = 1.05;
  iso.box(cu - 0.18, cv - 0.18, cu + 0.18, cv + 0.18, 270, 284, lighten(BK, 0.04));
  for (const [du, dv, h] of [
    [-0.16, -0.16, 30], [0.16, -0.16, 34], [-0.16, 0.16, 34], [0.16, 0.16, 30],
    [0, -0.18, 40], [0, 0.18, 40], [-0.18, 0, 38], [0.18, 0, 38],
  ] as const) {
    needle(iso, cu + du, cv + dv, 284, h, 1.8 * RES, CR, GLASS_LIT);
  }
  needle(iso, cu, cv, 284, 56, 2.6 * RES, CR, GLASS_LIT); // tall central burst
  return iso.build();
}

/** HELMSLEY BUILDING (230 Park / former New York Central, 1929) — the great
 *  Beaux-Arts tower that straddles Park Avenue, capped by a gilded pyramidal
 *  copper roof + cupola and lit gold at night. Broad grey-limestone base, slim
 *  upper shaft, the gilt pyramidal crown. 2×2 on headroom. */
function helmsleyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.3, 0.5, 1.7, 1.66, 0.28, 0.26);
  // broad base with the two great vehicle archways through it
  iso.box(0.22, 0.34, 1.78, 1.76, 0, 96, ST);
  gridFace(iso, 'r', 1.78, 0.4, 1.74, 12, 88, 8, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.76, 0.3, 1.72, 12, 88, 8, alpha(GLASS_DK, 0.92));
  // dark archway portals at the base (the Park Ave underpass)
  for (const v of [0.7, 1.1] as const) {
    iso.r.poly(
      [iso.P(1.78, v - 0.12, 4), iso.P(1.78, v + 0.12, 4), iso.P(1.78, v + 0.12, 22), iso.P(1.78, v, 30), iso.P(1.78, v - 0.12, 22)],
      darken(GRANITE, 0.2),
    );
  }
  // setback + slim shaft
  iso.box(0.44, 0.56, 1.56, 1.54, 96, 112, ST, { topC: lighten(ST, 0.05) });
  iso.box(0.62, 0.72, 1.38, 1.38, 112, 210, ST);
  gridFace(iso, 'r', 1.38, 0.78, 1.34, 120, 202, 6, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.38, 0.72, 1.32, 120, 202, 6, alpha(GLASS_DK, 0.92));
  // a colonnaded crown stage, then the gilt copper pyramid + lantern cupola
  const cu = 1.0;
  const cv = 1.05;
  iso.box(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, 210, 230, lighten(ST, 0.04));
  iso.hip(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, 230, 30, COPPER);
  iso.box(cu - 0.07, cv - 0.07, cu + 0.07, cv + 0.07, 260, 274, GOLDLEAF, { ink: false });
  iso.hip(cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, 274, 16, GOLDLEAF);
  return iso.build();
}

/** DAVID N. DINKINS MUNICIPAL BUILDING (1914) — McKim, Mead & White's vast
 *  "wedding-cake" civic skyscraper: a broad colonnaded base with a triumphal
 *  central arch, a tiered tower of stacked temples, and the gilded statue
 *  "Civic Fame" on top. Grey granite/limestone, 3×3, on headroom. */
function municipalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 340 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.4, 0.7, 2.6, 2.5, 0.32, 0.26);
  // the broad C-shaped base (full block) with a colonnade screen
  iso.box(0.3, 0.5, 2.7, 2.6, 0, 96, ST);
  // ground colonnade — a row of columns on the show face
  for (let v = 0.6; v < 2.55; v += 0.18) iso.r.line(iso.P(2.7, v, 6), iso.P(2.7, v, 30), 1.4 * RES, lighten(ST, 0.16));
  gridFace(iso, 'r', 2.7, 0.6, 2.5, 36, 90, 12, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 2.6, 0.5, 2.5, 36, 90, 12, alpha(GLASS_DK, 0.92));
  // central triumphal arch through the base
  iso.r.poly(
    [iso.P(2.7, 1.45, 6), iso.P(2.7, 1.75, 6), iso.P(2.7, 1.75, 26), iso.P(2.7, 1.6, 40), iso.P(2.7, 1.45, 26)],
    darken(GRANITE, 0.18),
  );
  // tiered "wedding cake" tower rising centre-back
  const cu = 1.5;
  const cv = 1.6;
  iso.box(cu - 0.6, cv - 0.6, cu + 0.6, cv + 0.6, 96, 150, ST, { topC: lighten(ST, 0.04) });
  iso.box(cu - 0.42, cv - 0.42, cu + 0.42, cv + 0.42, 150, 196, ST);
  gridFace(iso, 'r', cu + 0.42, cv - 0.38, cv + 0.38, 156, 190, 5, alpha(GLASS_DK, 0.9));
  // stacked circular temple stages (colonnaded drums)
  for (const [zb, zt, r] of [[196, 224, 0.3], [224, 246, 0.2]] as const) {
    iso.box(cu - r, cv - r, cu + r, cv + r, zb, zt, lighten(ST, 0.03));
    for (let a = 0; a <= 8; a++) {
      const ang = (a / 8) * Math.PI;
      const [px, py] = iso.P(cu + Math.cos(ang) * r * 0.92, cv - Math.sin(ang) * r * 0.92, (zb + zt) / 2 - 8);
      iso.r.line([px, py - 7 * RES], [px, py + 7 * RES], 1 * RES, lighten(ST, 0.18));
    }
  }
  // the cupola + the gilded "Civic Fame" statue
  iso.hip(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 246, 22, COPPER);
  const sb = iso.P(cu, cv, 268);
  iso.r.line(sb, [sb[0], sb[1] - 16 * RES], 2.2 * RES, GOLDLEAF); // the statue figure
  iso.r.poly([[sb[0] - 4 * RES, sb[1] - 14 * RES], [sb[0] + 4 * RES, sb[1] - 14 * RES], [sb[0], sb[1] - 20 * RES]], GOLDLEAF);
  return iso.build();
}

// ===========================================================================
//  CATHEDRALS & CHURCHES (grey gothic stone, slim twin spires)
// ===========================================================================

/** SAINT PATRICK'S CATHEDRAL (1878) — the great white-grey Gothic Revival
 *  cathedral on Fifth Avenue: the long nave under a steep roof, the great rose
 *  window over triple portals, and the TWIN openwork spires (101 m) flanking the
 *  west front. Marble that reads pale grey. 2×2 SW + headroom for the spires. */
function stPatricksTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 360 });
  void seed;
  const ST = hex('#d3cec1'); // pale grey-white marble
  const ST_D = hex('#b1ab9c');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  iso.shadow(0.3, 0.5, 1.74, 1.74, 0.26, 0.24);
  // the long nave + steep gable roof (ridge front-to-back) — taller than the
  // ordinary fabric so the cathedral mass alone already reads grand
  iso.box(0.58, 0.46, 1.22, 1.7, 0, 92, ST);
  iso.gable(0.58, 0.46, 1.22, 1.7, 92, 38, 'v', LEADROOF, ST);
  // clerestory window band + flying buttresses down the long visible flank
  gridFace(iso, 'l', 1.7, 0.64, 1.16, 40, 84, 9, GLASS);
  // side aisles (lower) with tall pointed lancets
  iso.box(0.3, 0.54, 0.58, 1.66, 0, 50, ST);
  iso.box(1.22, 0.54, 1.5, 1.66, 0, 50, ST);
  for (let i = 0; i < 8; i++) {
    const u = 0.36 + i * 0.13;
    iso.r.poly([iso.P(u, 1.66, 12), iso.P(u + 0.06, 1.66, 12), iso.P(u + 0.06, 1.66, 38), iso.P(u + 0.03, 1.66, 46), iso.P(u, 1.66, 38)], GLASS);
    iso.r.line(iso.P(u + 0.03, 1.66, 46), iso.P(u + 0.03, 1.7, 64), 1.2 * RES, shaded(ST, 0.12)); // flying buttress
  }
  // the crossing flèche
  needle(iso, 0.9, 1.08, 92, 50, 3.4 * RES, LEADROOF, GLASS_LIT);
  // west front gable + the great rose window between the towers (front = high v)
  iso.box(0.62, 1.66, 1.18, 1.82, 0, 104, ST);
  const [rx, ry] = iso.P(0.9, 1.82, 74);
  const RR = 11 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92]);
  }
  iso.r.poly(rose, GLASS);
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    iso.r.line([rx, ry], [rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92], 0.7 * RES, alpha(ST, 0.6)); // tracery spokes
  }
  // triple pointed portals below
  for (const pu of [0.74, 0.9, 1.06] as const) {
    iso.r.poly([iso.P(pu - 0.05, 1.82, 0), iso.P(pu + 0.05, 1.82, 0), iso.P(pu + 0.05, 1.82, 16), iso.P(pu, 1.82, 24), iso.P(pu - 0.05, 1.82, 16)], darken(ST_D, 0.2));
  }
  // the TWIN openwork Gothic spires flanking the west front — they must TOWER
  // (the real spires reach ~101 m, well over the Midtown blocks): square belfry
  // tower to z150, then a tall pierced stone needle spiking to ~z330.
  for (const tu of [0.56, 1.24] as const) {
    iso.box(tu - 0.15, 1.66, tu + 0.15, 1.86, 0, 150, ST);
    gridFace(iso, 'l', 1.86, tu - 0.11, tu + 0.11, 40, 120, 3, GLASS);
    // tall pointed belfry openings on the front face
    for (const z of [96, 128] as const) {
      iso.r.poly([iso.P(tu - 0.1, 1.86, z), iso.P(tu + 0.1, 1.86, z), iso.P(tu + 0.1, 1.86, z + 16), iso.P(tu, 1.86, z + 24), iso.P(tu - 0.1, 1.86, z + 16)], GLASS);
    }
    // gallery + four corner pinnacles, then the great pierced spire
    iso.box(tu - 0.16, 1.65, tu + 0.16, 1.87, 150, 158, lighten(ST, 0.04), { ink: false });
    for (const [du, dv] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const) {
      needle(iso, tu + du, 1.76 + dv, 158, 36, 1.8 * RES, ST_D, GLASS_LIT);
    }
    needle(iso, tu, 1.76, 158, 172, 4.6 * RES, ST_D, GLASS_LIT);
    // crockets up the spire (little ink ticks)
    const [ax, ay] = iso.P(tu, 1.76, 158);
    for (let k = 1; k <= 6; k++) {
      const yy = ay - (172 * RES * k) / 7;
      iso.r.line([ax - 3 * RES, yy], [ax - 5 * RES, yy + 1 * RES], 0.7 * RES, ST_D);
      iso.r.line([ax + 3 * RES, yy], [ax + 5 * RES, yy + 1 * RES], 0.7 * RES, ST_D);
    }
  }
  return iso.build();
}

/** CATHEDRAL OF SAINT JOHN THE DIVINE (Morningside Heights) — one of the world's
 *  largest cathedrals, a colossal Romanesque/Gothic pile: a vast long nave under
 *  a high roof, a broad crossing, the great rose window, and the squat unfinished
 *  west towers. Grey granite. 3×3 SW + headroom (it is enormous + broad). */
function stJohnDivineTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 220 });
  void seed;
  const ST = hex('#c4bfb1');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.28, 0.26);
  // the immense nave + roof
  iso.box(0.8, 0.5, 1.7, 2.7, 0, 96, ST);
  iso.gable(0.8, 0.5, 1.7, 2.7, 96, 40, 'v', LEADROOF, ST);
  // long aisle walls with tall lancets + buttresses
  iso.box(0.4, 0.6, 0.8, 2.6, 0, 56, ST);
  iso.box(1.7, 0.6, 2.1, 2.6, 0, 56, ST);
  for (let i = 0; i < 9; i++) {
    const u = 0.46 + i * 0.16;
    iso.r.poly([iso.P(u, 2.6, 14), iso.P(u + 0.08, 2.6, 14), iso.P(u + 0.08, 2.6, 44), iso.P(u + 0.04, 2.6, 52), iso.P(u, 2.6, 44)], GLASS);
    iso.r.line(iso.P(u + 0.04, 2.6, 52), iso.P(u + 0.04, 2.7, 70), 1.4 * RES, shaded(ST, 0.1)); // flying buttress
  }
  // the great crossing with a broad pyramidal lantern (the dome was never built)
  const cu = 1.25;
  const cv = 1.5;
  iso.box(cu - 0.34, cv - 0.34, cu + 0.34, cv + 0.34, 96, 150, ST);
  iso.hip(cu - 0.36, cv - 0.36, cu + 0.36, cv + 0.36, 150, 40, LEADROOF);
  // west front: squat twin towers + the great rose window
  for (const tu of [0.62, 1.88] as const) {
    iso.box(tu - 0.22, 2.5, tu + 0.22, 2.78, 0, 124, ST);
    gridFace(iso, 'l', 2.78, tu - 0.18, tu + 0.18, 40, 116, 3, GLASS);
    iso.box(tu - 0.24, 2.48, tu + 0.24, 2.8, 124, 130, lighten(ST, 0.05), { ink: false });
  }
  iso.box(0.86, 2.64, 1.64, 2.76, 0, 110, ST);
  const [rx, ry] = iso.P(1.25, 2.76, 80);
  const RR = 13 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92]);
  }
  iso.r.poly(rose, GLASS);
  iso.r.polyline(rose, INK_W * 0.7, INK, true);
  return iso.build();
}

/** TRINITY CHURCH (Wall Street, 1846) — the grey-brownstone Gothic Revival
 *  church whose single great spire (86 m) was the tallest thing in NY for
 *  decades: a compact nave, the square west tower with louvred belfry, and the
 *  tall octagonal stone spire with corner pinnacles. 1×1 + headroom. */
function trinityChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 240 });
  void seed;
  const ST = hex('#a59b88'); // brownstone, greyed
  const ST_D = hex('#8a8170');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  iso.shadow(0.28, 0.4, 0.78, 0.74, 0.2, 0.22);
  // nave
  iso.box(0.46, 0.3, 0.78, 0.8, 0, 40, ST);
  iso.gable(0.46, 0.3, 0.78, 0.8, 40, 14, 'v', LEADROOF, ST);
  for (let i = 0; i < 3; i++) {
    const u = 0.52 + i * 0.08;
    iso.r.poly([iso.P(u, 0.8, 8), iso.P(u + 0.04, 0.8, 8), iso.P(u + 0.04, 0.8, 26), iso.P(u + 0.02, 0.8, 32), iso.P(u, 0.8, 26)], GLASS);
  }
  // the square west tower
  const tu = 0.34;
  const tv = 0.58;
  iso.box(tu - 0.14, tv - 0.14, tu + 0.14, tv + 0.14, 0, 84, ST);
  // pointed belfry openings
  for (const z of [40, 60] as const) {
    iso.r.poly([iso.P(tu, tv + 0.14, z), iso.P(tu + 0.12, tv + 0.14, z), iso.P(tu + 0.12, tv + 0.14, z + 12), iso.P(tu + 0.06, tv + 0.14, z + 18), iso.P(tu, tv + 0.14, z + 12)], GLASS);
  }
  // corner pinnacles + the tall octagonal spire
  iso.box(tu - 0.15, tv - 0.15, tu + 0.15, tv + 0.15, 84, 90, lighten(ST, 0.04), { ink: false });
  for (const [du, dv] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]] as const) {
    needle(iso, tu + du, tv + dv, 90, 22, 1.6 * RES, ST_D, GLASS_LIT);
  }
  needle(iso, tu, tv, 90, 96, 3 * RES, ST_D, GLASS_LIT);
  return iso.build();
}

// ===========================================================================
//  CIVIC / BEAUX-ARTS (broad grey limestone)
// ===========================================================================

/** ALEXANDER HAMILTON U.S. CUSTOM HOUSE (1907, Cass Gilbert) — a monumental
 *  Beaux-Arts block at Bowling Green: a grand columned façade with a heavy
 *  cornice, a mansard attic, and the four allegorical sculpture groups flanking
 *  the entrance steps. Broad, grey granite, 3×3 SW. */
function customHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.4, 0.7, 2.6, 2.55, 0.22, 0.22);
  // the deep rusticated base
  iso.box(0.36, 0.56, 2.64, 2.62, 0, 16, GRANITE);
  // the main block
  iso.box(0.4, 0.6, 2.6, 2.58, 16, 64, ST);
  // a giant order of engaged columns across the show face
  for (let v = 0.7; v < 2.55; v += 0.16) iso.r.line(iso.P(2.6, v, 18), iso.P(2.6, v, 58), 1.6 * RES, lighten(ST, 0.16));
  gridFace(iso, 'l', 2.58, 0.6, 2.5, 22, 56, 12, alpha(GLASS_DK, 0.9));
  // heavy cornice + a low mansard attic with dormers
  iso.box(0.36, 0.56, 2.64, 2.62, 64, 70, lighten(ST, 0.06), { ink: false });
  iso.hip(0.46, 0.66, 2.54, 2.52, 70, 22, LEADROOF);
  // the central entrance pediment + steps + the four sculpture groups
  iso.r.poly([iso.P(2.6, 1.3, 64), iso.P(2.6, 1.9, 64), iso.P(2.6, 1.6, 80)], lighten(ST, 0.1));
  iso.r.polyline([iso.P(2.6, 1.3, 64), iso.P(2.6, 1.9, 64), iso.P(2.6, 1.6, 80)], INK_W * 0.7, INK);
  for (const v of [1.0, 1.35, 1.85, 2.2] as const) {
    const [px, py] = iso.P(2.62, v, 16);
    iso.r.line([px, py], [px, py - 12 * RES], 2.4 * RES, lighten(ST, 0.12)); // a seated allegory
  }
  return iso.build();
}

/** STEPHEN A. SCHWARZMAN BUILDING (NY Public Library main branch, 1911, Carrère
 *  & Hastings) — the great white-marble Beaux-Arts library: a long columned
 *  portico fronted by the two stone lions, tall arched windows, a heavy cornice
 *  and a low attic. Broad, pale grey, 3×3 SW. */
function nyplTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#d2cdc0'); // white Vermont marble (greyed)
  iso.shadow(0.4, 0.7, 2.6, 2.55, 0.22, 0.22);
  iso.box(0.36, 0.56, 2.64, 2.62, 0, 12, GRANITE);
  iso.box(0.42, 0.62, 2.58, 2.56, 12, 58, ST);
  // the projecting central portico — three great arched bays with paired columns
  iso.box(2.5, 1.0, 2.74, 2.1, 6, 56, lighten(ST, 0.03));
  for (const v of [1.15, 1.45, 1.75, 2.0] as const) {
    iso.r.poly([iso.P(2.74, v - 0.1, 16), iso.P(2.74, v + 0.1, 16), iso.P(2.74, v + 0.1, 40), iso.P(2.74, v, 48), iso.P(2.74, v - 0.1, 40)], alpha(GLASS_DK, 0.85));
  }
  for (let v = 1.05; v < 2.08; v += 0.1) iso.r.line(iso.P(2.74, v, 8), iso.P(2.74, v, 50), 1.4 * RES, lighten(ST, 0.18));
  // tall arched windows along the wings
  gridFace(iso, 'l', 2.56, 0.66, 0.98, 20, 50, 4, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 2.56, 2.12, 2.5, 20, 50, 4, alpha(GLASS_DK, 0.9));
  // cornice + low attic balustrade
  iso.box(0.38, 0.58, 2.62, 2.6, 58, 64, lighten(ST, 0.06), { ink: false });
  iso.box(0.46, 0.66, 2.54, 2.52, 64, 72, ST, { ink: false });
  // the two famous lions flanking the entrance steps
  for (const v of [1.18, 1.92] as const) {
    const [px, py] = iso.P(2.78, v, 12);
    iso.r.poly([[px - 3 * RES, py], [px + 3 * RES, py], [px + 3 * RES, py - 4 * RES], [px - 3 * RES, py - 5 * RES]], lighten(ST, 0.1));
  }
  return iso.build();
}

/** GUGGENHEIM MUSEUM (Frank Lloyd Wright, 1959) — the SIGNATURE white spiral:
 *  the inverted-ziggurat rotunda of stacked widening ribbon bands, beside the
 *  smaller "monitor" cylinder. Off-white concrete that reads pale grey. A broad,
 *  LOW, sculptural 2×2 (it's wide, not tall) — its silhouette alone identifies
 *  it, so the spiral must read unmistakably. */
function guggenheimTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const WC = hex('#dcd8cd'); // FLW off-white concrete (greyed)
  const WC_D = hex('#b3aea1');
  iso.shadow(0.4, 0.66, 1.66, 1.62, 0.22, 0.22);
  // the smaller flat "monitor" slab beside the rotunda (the original tower)
  iso.box(0.34, 1.18, 0.74, 1.74, 0, 64, WC, { topC: lighten(WC, 0.06) });
  gridFace(iso, 'l', 1.74, 0.4, 0.68, 16, 56, 4, alpha(GLASS_DK, 0.7));
  // the great spiral rotunda — the inverted ziggurat: stacked ribbon bands each
  // WIDER than the one below, with a deep shadow groove between (the ramp). Tall
  // enough + stepped enough that the silhouette alone says "Guggenheim".
  const cu = 1.24;
  const cv = 1.08;
  const [cx, cyB] = iso.P(cu, cv, 0);
  const bands = 6;
  const bandH = 13; // px per band
  const ringPts = (rad: number, zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rad, cyB - zPx + Math.sin(a) * rad * 0.5]);
    }
    return pts;
  };
  for (let b = 0; b < bands; b++) {
    const rad = (0.3 + b * 0.075) * (CELL_W / 2); // clearly widening upward
    const zBot = (b * bandH) * RES;
    const zTop = ((b + 1) * bandH + 3) * RES; // overlap so the ribbon overhangs
    // the ribbon wall — sun side lighter, dusk side cool
    iso.r.poly(
      [...ringPts(rad, zBot), ...ringPts(rad, zTop).reverse()],
      shaded(WC, 0.05),
      lit(WC, 0.06),
    );
    // the deep recessed groove (the spiral ramp shadow) under each band lip
    iso.r.polyline(ringPts(rad, zBot + 1.5 * RES), 1.6 * RES, alpha(WC_D, 0.9), true);
    // the bright sun-lit top lip on the right arc
    iso.r.polyline(ringPts(rad, zTop).slice(2, 13), 1 * RES, alpha(lighten(WC, 0.2), 0.85), true);
  }
  // cap the top band + a small central clerestory dome
  const topRad = (0.3 + (bands - 1) * 0.075) * (CELL_W / 2);
  const topZ = (bands * bandH + 3) * RES;
  iso.r.poly(ringPts(topRad, topZ), top(WC, 0.22));
  iso.r.polyline(ringPts(topRad, topZ), INK_W * 0.55, alpha(INK, 0.6), true);
  iso.r.poly(ringPts(topRad * 0.4, topZ + 8 * RES), top(WC, 0.3));
  return iso.build();
}

/** NEW YORK CITY CENTER (1923) — the neo-Moorish former Shriners' temple on West
 *  55th: a broad masonry block with a banded façade and a distinctive tiled
 *  polygonal DOME with a lantern. Reads grey-buff with a teal-tiled dome. 2×2. */
function cityCenterTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#bdb6a6');
  const TILE = hex('#3f8f8a'); // teal Moorish dome tiles
  iso.shadow(0.36, 0.62, 1.66, 1.62, 0.2, 0.22);
  iso.box(0.34, 0.5, 1.66, 1.7, 0, 60, ST);
  // horizontal banding (the polychrome courses)
  for (const z of [20, 34, 48] as const) {
    iso.r.line(iso.P(1.66, 0.5, z), iso.P(1.66, 1.7, z), 0.9 * RES, shaded(ST, 0.2));
    iso.r.line(iso.P(0.34, 1.7, z), iso.P(1.66, 1.7, z), 0.9 * RES, shaded(ST, 0.16));
  }
  // big horseshoe-arch windows on the face
  for (let v = 0.66; v < 1.6; v += 0.26) {
    iso.r.poly([iso.P(1.66, v, 14), iso.P(1.66, v + 0.16, 14), iso.P(1.66, v + 0.16, 36), iso.P(1.66, v + 0.08, 44), iso.P(1.66, v, 36)], alpha(GLASS_DK, 0.85));
  }
  // parapet + the tiled polygonal dome with lantern
  iso.box(0.34, 0.5, 1.66, 1.7, 60, 66, lighten(ST, 0.05), { ink: false });
  const cu = 1.0;
  const cv = 1.1;
  const [dx, dyB] = iso.P(cu, cv, 66);
  const DR = 0.4 * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.sin(a) * DR * 1.05 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(TILE, 0.08), lit(TILE, 0.06));
  // ribbed gores
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    iso.r.line([dx + k * DR, dyB], [dx + k * DR * 0.1, dyB - DR * 1.04], 0.8 * RES, alpha(darken(TILE, 0.2), 0.85));
  }
  iso.r.polyline(dome(1), INK_W * 0.7, INK);
  const tipY = dyB - DR * 1.05;
  iso.r.line([dx, tipY], [dx, tipY - 9 * RES], 1.2 * RES, GOLDLEAF); // lantern finial
  return iso.build();
}

// ===========================================================================
//  UPPER WEST SIDE APARTMENT LANDMARKS (twin-tower mansard rooflines)
// ===========================================================================

/** THE DAKOTA (1884) — the German-Renaissance apartment fortress on 72nd/CWP:
 *  a deep buff-grey mass with steep slate gables, dormers, finials and corner
 *  pavilions — a dense, picturesque roofline. 2×2 SW. */
function dakotaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#b3a892'); // buff sandstone/brick, greyed
  iso.shadow(0.36, 0.62, 1.66, 1.66, 0.22, 0.22);
  iso.box(0.34, 0.5, 1.66, 1.74, 0, 70, ST);
  gridFace(iso, 'r', 1.66, 0.56, 1.7, 12, 64, 10, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.74, 0.42, 1.62, 12, 64, 8, alpha(GLASS_DK, 0.92));
  // the steep slate gable roof + a forest of dormers + finials (the signature)
  iso.gable(0.34, 0.5, 1.66, 1.74, 70, 30, 'v', LEADROOF, ST);
  for (let u = 0.5; u < 1.6; u += 0.26) {
    // dormers poking from the near roof slope
    const [dx, dy] = iso.P(u, 1.74, 84);
    iso.r.poly([[dx - 4 * RES, dy], [dx + 4 * RES, dy], [dx + 4 * RES, dy - 6 * RES], [dx, dy - 11 * RES], [dx - 4 * RES, dy - 6 * RES]], lighten(ST, 0.04));
    iso.r.line([dx, dy - 11 * RES], [dx, dy - 16 * RES], 1 * RES, hex('#6f4a33'));
  }
  // corner pavilion turrets with tall finials
  for (const [u, v] of [[0.4, 1.68], [1.6, 1.68], [0.4, 0.56], [1.6, 0.56]] as const) {
    iso.box(u - 0.06, v - 0.06, u + 0.06, v + 0.06, 70, 92, ST);
    iso.hip(u - 0.07, v - 0.07, u + 0.07, v + 0.07, 92, 14, LEADROOF);
    const [fx, fy] = iso.P(u, v, 106);
    iso.r.line([fx, fy], [fx, fy - 9 * RES], 1 * RES, GOLDLEAF);
  }
  return iso.build();
}

/** THE ANSONIA (1904) — the great Beaux-Arts hotel on Broadway: a curved
 *  limestone mass with round corner towers, deep cornices, and a multi-tiered
 *  mansard roof with domed corner turrets. Pale grey, 2×2 SW. */
function ansoniaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 140 });
  void seed;
  const ST = hex('#c9c3b4');
  iso.shadow(0.36, 0.62, 1.66, 1.66, 0.22, 0.22);
  iso.box(0.34, 0.5, 1.66, 1.74, 0, 88, ST);
  gridFace(iso, 'r', 1.66, 0.56, 1.7, 12, 80, 12, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.74, 0.42, 1.62, 12, 80, 9, alpha(GLASS_DK, 0.92));
  // projecting cornice
  iso.box(0.32, 0.48, 1.68, 1.76, 88, 94, lighten(ST, 0.06), { ink: false });
  // the mansard roof
  iso.hip(0.4, 0.56, 1.6, 1.68, 94, 26, LEADROOF);
  // round corner towers with domed turret caps (the Ansonia's distinctive
  // rounded corners) + tall finials
  for (const [u, v] of [[0.4, 1.68], [1.6, 1.68], [0.4, 0.56]] as const) {
    iso.box(u - 0.08, v - 0.08, u + 0.08, v + 0.08, 0, 100, ST);
    gridFace(iso, 'l', v + 0.08, u - 0.06, u + 0.06, 20, 92, 3, alpha(GLASS_DK, 0.9));
    iso.box(u - 0.085, v - 0.085, u + 0.085, v + 0.085, 100, 106, lighten(ST, 0.05), { ink: false });
    // a small domed cap
    const [dx, dyB] = iso.P(u, v, 106);
    const dr = 5.4 * RES;
    const cap: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      cap.push([dx + Math.cos(a) * dr, dyB - Math.sin(a) * dr * 1.1]);
    }
    iso.r.poly(cap, LEADROOF);
    iso.r.polyline(cap, INK_W * 0.5, INK);
    iso.r.line([dx, dyB - dr * 1.1], [dx, dyB - dr * 1.1 - 7 * RES], 1 * RES, GOLDLEAF);
  }
  return iso.build();
}

/** THE BERESFORD (1929, Emery Roth) — the grand Central-Park-West apartment
 *  building famous for its THREE octagonal copper-capped corner towers over a
 *  big limestone mass. Pale grey body, three lantern towers. 2×2 SW. */
function beresfordTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.36, 0.62, 1.66, 1.66, 0.22, 0.22);
  iso.box(0.34, 0.5, 1.66, 1.74, 0, 90, ST);
  gridFace(iso, 'r', 1.66, 0.56, 1.7, 12, 84, 12, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.74, 0.42, 1.62, 12, 84, 9, alpha(GLASS_DK, 0.92));
  iso.box(0.4, 0.56, 1.6, 1.68, 90, 104, ST, { topC: lighten(ST, 0.05) });
  // the three signature corner towers with octagonal copper-domed lanterns
  for (const [u, v] of [[0.46, 1.62], [1.56, 1.62], [0.46, 0.62]] as const) {
    iso.box(u - 0.13, v - 0.13, u + 0.13, v + 0.13, 104, 134, ST);
    gridFace(iso, 'l', v + 0.13, u - 0.1, u + 0.1, 110, 128, 2, alpha(GLASS_DK, 0.9));
    // the colonnaded lantern
    iso.box(u - 0.1, v - 0.1, u + 0.1, v + 0.1, 134, 148, lighten(ST, 0.04));
    iso.hip(u - 0.11, v - 0.11, u + 0.11, v + 0.11, 148, 18, COPPER);
    const [fx, fy] = iso.P(u, v, 166);
    iso.r.line([fx, fy], [fx, fy - 7 * RES], 1 * RES, GOLDLEAF);
  }
  return iso.build();
}

/** THE APTHORP / BELNORD — the great full-block Italian-Renaissance courtyard
 *  apartment palazzi (1908): a low, broad, uniform limestone block ringing a big
 *  interior court, with a heavy rusticated base, a strong cornice and grand
 *  arched carriage entrances. Broad + LOW, 3×3 SW. (Shared by both blocks.) */
function courtyardBlockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#c7c1b2');
  iso.shadow(0.42, 0.72, 2.58, 2.55, 0.2, 0.22);
  // rusticated base
  iso.box(0.32, 0.52, 2.68, 2.64, 0, 14, GRANITE);
  // the perimeter block, ring around a sunken court — draw as a full block then
  // press a darker court well into the top
  iso.box(0.36, 0.56, 2.64, 2.6, 14, 64, ST);
  gridFace(iso, 'r', 2.64, 0.64, 2.54, 22, 58, 14, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 2.6, 0.5, 2.56, 22, 58, 14, alpha(GLASS_DK, 0.92));
  // the open interior courtyard (a darker recessed top quad)
  iso.quad(1.0, 1.1, 2.0, 2.0, 50, darken(GRANITE, 0.1));
  iso.box(1.0, 1.1, 2.0, 2.0, 50, 56, ST, { topC: shaded(ST, 0.1), ink: false });
  // heavy projecting cornice + a balustrade
  iso.box(0.34, 0.54, 2.66, 2.62, 64, 70, lighten(ST, 0.06), { ink: false });
  // the grand arched carriage entrance on the show face
  iso.r.poly([iso.P(2.64, 1.3, 6), iso.P(2.64, 1.7, 6), iso.P(2.64, 1.7, 30), iso.P(2.64, 1.5, 42), iso.P(2.64, 1.3, 30)], darken(GRANITE, 0.2));
  return iso.build();
}

// ===========================================================================
//  MONUMENTS, FORTS, TOWERS, THE HARBOR
// ===========================================================================

/** WASHINGTON SQUARE ARCH (Stanford White, 1892) — the white-marble triumphal
 *  arch in Greenwich Village: a single great arch with paired columns, a high
 *  attic frieze, and the two Washington statues in the spandrel niches. Pale
 *  grey marble, 1×1. */
function washSquareArchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const ST = hex('#d6d1c4');
  const u0 = 0.28;
  const u1 = 0.72;
  const v0 = 0.36;
  const v1 = 0.66;
  const H = 44;
  iso.shadow(u0, v0, u1, v1, 0.16, 0.2);
  // the two great piers
  iso.box(u0, v0, u0 + 0.12, v1, 0, H, ST);
  iso.box(u1 - 0.12, v0, u1, v1, 0, H, ST);
  // the spanning attic block over the opening
  iso.box(u0, v0, u1, v1, H - 12, H, ST);
  // the arched opening (dark void) on the front face
  const am = (v0 + v1) / 2;
  iso.r.poly(
    [iso.P(u1, v0 + 0.04, 0), iso.P(u1, v1 - 0.04, 0), iso.P(u1, v1 - 0.04, H - 18), iso.P(u1, am, H - 8), iso.P(u1, v0 + 0.04, H - 18)],
    darken(GRANITE, 0.24),
  );
  // paired engaged columns on the front of each pier
  for (const v of [v0 + 0.04, v0 + 0.1, v1 - 0.1, v1 - 0.04] as const) {
    iso.r.line(iso.P(u1, v, 2), iso.P(u1, v, H - 14), 1.3 * RES, lighten(ST, 0.16));
  }
  // attic cornice + a low parapet
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H, H + 4, lighten(ST, 0.08), { ink: false });
  // the two Washington statues in their niches at the springing line
  for (const v of [v0 + 0.07, v1 - 0.07] as const) {
    const [px, py] = iso.P(u1 + 0.005, v, H - 24);
    iso.r.line([px, py], [px, py - 8 * RES], 1.8 * RES, lighten(ST, 0.1));
  }
  return iso.build();
}

/** CLEOPATRA'S NEEDLE (Central Park, 1881) — the ancient Egyptian granite
 *  obelisk on its stepped base with the four bronze crab supports. A tall slim
 *  red-grey granite shaft tapering to a pyramidion. 1×1 + headroom. */
function obeliskTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 160 });
  void seed;
  const GR = hex('#9a8a82'); // weathered pinkish-grey granite
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.12, cv - 0.06, cu + 0.12, cv + 0.12, 0.16, 0.2);
  // the stepped granite pedestal
  iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, 0, 8, GRANITE);
  iso.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, 8, 22, lighten(GRANITE, 0.04));
  // the tapering obelisk shaft (narrows slightly toward the top)
  const w0 = 0.06;
  const w1 = 0.042;
  const Z0 = 22;
  const Z1 = 128;
  iso.r.poly([iso.P(cu - w0, cv + w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], shaded(GR, 0.08)); // left
  iso.r.poly([iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu + w1, cv - w1, Z1)], lit(GR, 0.08)); // right
  iso.r.poly([iso.P(cu - w1, cv - w1, Z1), iso.P(cu + w1, cv - w1, Z1), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], top(GR, 0.18)); // top
  iso.edge(iso.P(cu - w0, cv + w0, Z0), iso.P(cu - w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w1, cv - w1, Z1));
  // faint hieroglyph banding
  for (let z = Z0 + 12; z < Z1 - 8; z += 14) iso.r.line(iso.P(cu + w1, cv - w1, z), iso.P(cu + w1, cv + w1, z), 0.5 * RES, alpha(darken(GR, 0.2), 0.6));
  // the pyramidion cap
  const apex = iso.P(cu, cv, Z1 + 14);
  iso.r.poly([iso.P(cu - w1, cv + w1, Z1), iso.P(cu + w1, cv + w1, Z1), apex], shaded(GR, 0.06));
  iso.r.poly([iso.P(cu + w1, cv - w1, Z1), iso.P(cu + w1, cv + w1, Z1), apex], lit(GR, 0.08));
  iso.r.polyline([iso.P(cu - w1, cv + w1, Z1), apex, iso.P(cu + w1, cv - w1, Z1)], INK_W * 0.5, INK);
  return iso.build();
}

/** CASTLE CLINTON (Battery Park, 1811) — the circular red-grey sandstone coastal
 *  fort: a low ring of thick masonry walls with gun embrasures, an entrance
 *  gateway, open in the centre. Broad + low, 2×2 SW. */
function castleClintonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const ST = hex('#9c8f80'); // brownstone, greyed
  const cu = 1.0;
  const cv = 1.1;
  const [cx, cyB] = iso.P(cu, cv, 0);
  iso.shadow(0.4, 0.7, 1.6, 1.55, 0.18, 0.2);
  const R = 0.62 * (CELL_W / 2);
  const Z = 24;
  const ring = (rad: number, zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rad, cyB - zPx + Math.sin(a) * rad * 0.5]);
    }
    return pts;
  };
  // outer wall band (sun side lighter)
  iso.r.poly([...ring(R, 0), ...ring(R, Z * RES).reverse()], shaded(ST, 0.06), lit(ST, 0.06));
  // the open interior (recessed darker floor)
  iso.r.poly(ring(R * 0.74, Z * RES), darken(GRANITE, 0.06));
  iso.r.poly([...ring(R * 0.74, Z * RES), ...ring(R * 0.74, (Z - 6) * RES).reverse()], shaded(ST, 0.16));
  // gun embrasures around the parapet
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (Math.sin(a) > -0.2) {
      const x = cx + Math.cos(a) * R;
      const y = cyB - Z * RES + Math.sin(a) * R * 0.5;
      iso.r.rect(x - 1.4 * RES, y - 1 * RES, x + 1.4 * RES, y + 2 * RES, darken(GRANITE, 0.15));
    }
  }
  iso.r.polyline(ring(R, Z * RES), INK_W * 0.7, INK, true);
  // the entrance sally-port on the front
  const [gx, gy] = [cx, cyB - 2 * RES];
  iso.r.poly([[gx - 4 * RES, gy], [gx + 4 * RES, gy], [gx + 4 * RES, gy - 12 * RES], [gx - 4 * RES, gy - 12 * RES]], darken(GRANITE, 0.2));
  return iso.build();
}

/** FORT JAY (Governors Island, 1794/1806) — the granite-faced star fort: a low
 *  earthwork with four arrowhead bastions, a sandstone sally-port gate, and the
 *  flag. Built as a low star plan, 2×2 SW. */
function fortJayTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const ST = hex('#a39884'); // sandstone/earthwork, greyed
  const cu = 1.0;
  const cv = 1.1;
  iso.shadow(0.4, 0.72, 1.6, 1.55, 0.18, 0.2);
  // grassy glacis floor
  iso.quad(0.36, 0.56, 1.64, 1.66, 0, shaded(COLORS.grass, 0.04));
  // the star ramparts: a square keep with four projecting triangular bastions
  iso.box(cu - 0.34, cv - 0.34, cu + 0.34, cv + 0.34, 0, 18, ST);
  for (const [du, dv] of [[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]] as const) {
    const bx = cu + du;
    const bv = cv + dv;
    // a low triangular bastion pointing outward
    const tip = iso.P(bx + du * 0.6, bv + dv * 0.6, 14);
    const a = iso.P(cu + du * 0.3 - dv * 0.3, cv + dv * 0.3 - du * 0.3, 14);
    const b = iso.P(cu + du * 0.3 + dv * 0.3, cv + dv * 0.3 + du * 0.3, 14);
    iso.r.poly([a, tip, b], lit(ST, 0.04));
    iso.r.polyline([a, tip, b], INK_W * 0.5, alpha(INK, 0.7));
    const a0 = iso.P(cu + du * 0.3 - dv * 0.3, cv + dv * 0.3 - du * 0.3, 0);
    iso.r.poly([a, [a[0], a0[1]], [tip[0], tip[1] + 14 * RES], tip], shaded(ST, 0.1));
  }
  // the inner barracks block + the sally-port gate on the front
  iso.box(cu - 0.22, cv - 0.22, cu + 0.22, cv + 0.22, 18, 34, lighten(ST, 0.03));
  iso.r.poly([iso.P(cu + 0.34, cv - 0.05, 0), iso.P(cu + 0.34, cv + 0.05, 0), iso.P(cu + 0.34, cv + 0.05, 12), iso.P(cu + 0.34, cv, 16), iso.P(cu + 0.34, cv - 0.05, 12)], darken(GRANITE, 0.2));
  // the flag
  const f = iso.P(cu, cv, 34);
  iso.r.line(f, [f[0], f[1] - 18 * RES], 1.2 * RES, INK);
  iso.r.poly([[f[0], f[1] - 18 * RES], [f[0] + 9 * RES, f[1] - 16 * RES], [f[0], f[1] - 12 * RES]], COLORS.orange);
  return iso.build();
}

/** COLGATE CLOCK (Jersey City waterfront, 1924) — the giant octagonal façade
 *  clock (one of the world's largest) standing on a low frame at the river edge,
 *  facing Manhattan. A great pale dial with bold hands on a slim grey frame.
 *  1×1 + a little headroom. */
function colgateClockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const FR = STEEL_GLASS_D;
  const cu = 0.52;
  const cv = 0.54;
  iso.shadow(cu - 0.16, cv - 0.06, cu + 0.16, cv + 0.12, 0.14, 0.18);
  // the supporting steel frame legs
  iso.box(cu - 0.16, cv + 0.04, cu - 0.12, cv + 0.08, 0, 30, FR);
  iso.box(cu + 0.12, cv + 0.04, cu + 0.16, cv + 0.08, 0, 30, FR);
  iso.box(cu - 0.16, cv + 0.04, cu + 0.16, cv + 0.08, 28, 34, FR, { ink: false });
  // the great octagonal dial standing on the frame, facing the river (front)
  const [dx, dyB] = iso.P(cu, cv + 0.06, 34);
  const RAD = 22 * RES;
  const cyc = dyB - RAD - 6 * RES;
  const oct: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    oct.push([dx + Math.cos(a) * RAD, cyc + Math.sin(a) * RAD]);
  }
  iso.r.poly(oct, DIALSTONE);
  iso.r.polyline(oct, INK_W * 0.7, INK, true);
  // hour ticks + the bold hands
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    iso.r.line([dx + Math.cos(a) * RAD * 0.82, cyc + Math.sin(a) * RAD * 0.82], [dx + Math.cos(a) * RAD * 0.92, cyc + Math.sin(a) * RAD * 0.92], 1 * RES, INK);
  }
  iso.r.line([dx, cyc], [dx + RAD * 0.5, cyc - RAD * 0.3], 2 * RES, hex('#c9453a')); // minute hand (Colgate red)
  iso.r.line([dx, cyc], [dx - RAD * 0.1, cyc - RAD * 0.5], 2.4 * RES, hex('#c9453a')); // hour hand
  iso.r.line([dx - 2 * RES, cyc], [dx + 2 * RES, cyc], 2.4 * RES, INK);
  return iso.build();
}

/** HARLEM FIRE WATCHTOWER (Marcus Garvey Park, 1857) — the last cast-iron fire
 *  watchtower: a slim open lattice octagonal frame of cast-iron columns rising to
 *  a lookout gallery with the great alarm bell on top. Dark grey iron, 1×1 +
 *  headroom. */
function fireWatchtowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const IRON = hex('#566069'); // cast iron, greyed
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.1, cv - 0.05, cu + 0.1, cv + 0.1, 0.14, 0.18);
  // the splayed lattice legs (wider at the base, converging upward)
  const top1 = 96;
  const legs: Array<[number, number]> = [[-0.12, 0.12], [0.12, 0.12], [0.12, -0.12], [-0.12, -0.12]];
  const topR = 0.05;
  for (const [du, dv] of legs) {
    const b = iso.P(cu + du, cv + dv, 0);
    const tu = du > 0 ? topR : -topR;
    const tv = dv > 0 ? topR : -topR;
    const t = iso.P(cu + tu, cv + tv, top1);
    iso.r.line(b, t, 1.6 * RES, IRON);
  }
  // X-bracing between the legs up the height
  for (let z = 14; z < top1 - 10; z += 18) {
    const f = z / top1;
    const w = 0.12 - (0.12 - topR) * f;
    const bl = iso.P(cu - w, cv + w, z);
    const br = iso.P(cu + w, cv + w, z);
    const fr = iso.P(cu + w, cv - w, z);
    iso.r.polyline([bl, br, fr], 0.7 * RES, alpha(IRON, 0.85));
    const w2 = 0.12 - (0.12 - topR) * ((z + 9) / top1);
    iso.r.line(bl, iso.P(cu + w2, cv + w2, z + 9), 0.6 * RES, alpha(IRON, 0.7));
    iso.r.line(br, iso.P(cu - w2, cv + w2, z + 9), 0.6 * RES, alpha(IRON, 0.7));
  }
  // the lookout gallery + the pyramidal cap
  iso.box(cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, top1, top1 + 12, IRON);
  iso.hip(cu - 0.09, cv - 0.09, cu + 0.09, cv + 0.09, top1 + 12, 14, LEADROOF);
  // the great bell hung in the gallery
  const [bx, by] = iso.P(cu, cv, top1 + 6);
  iso.r.poly([[bx - 3 * RES, by], [bx + 3 * RES, by], [bx + 2 * RES, by - 6 * RES], [bx - 2 * RES, by - 6 * RES]], hex('#7a6f4a'));
  return iso.build();
}

/** BLACKWELL ISLAND LIGHT (1872) — the small grey-granite Gothic-Revival
 *  lighthouse at the north tip of Roosevelt Island: a tapering octagonal stone
 *  tower with a small lantern room. 1×1 + headroom; a beacon lights it. */
function blackwellLightTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const ST = hex('#a7a097'); // grey granite
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.1, cv - 0.05, cu + 0.1, cv + 0.1, 0.14, 0.18);
  // a rocky base
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 8, GRANITE);
  // the tapering octagonal stone tower
  const Z0 = 8;
  const Z1 = 76;
  const w0 = 0.11;
  const w1 = 0.07;
  iso.r.poly([iso.P(cu - w0, cv + w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], shaded(ST, 0.08));
  iso.r.poly([iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu + w1, cv - w1, Z1)], lit(ST, 0.08));
  iso.r.poly([iso.P(cu - w1, cv - w1, Z1), iso.P(cu + w1, cv - w1, Z1), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], top(ST, 0.16));
  iso.edge(iso.P(cu - w0, cv + w0, Z0), iso.P(cu - w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w1, cv - w1, Z1));
  // small pointed Gothic windows up the shaft
  for (const z of [28, 48] as const) {
    iso.r.poly([iso.P(cu + w1 + 0.002, cv - 0.02, z), iso.P(cu + w1 + 0.002, cv + 0.02, z), iso.P(cu + w1 + 0.002, cv + 0.02, z + 8), iso.P(cu + w1 + 0.002, cv, z + 12), iso.P(cu + w1 + 0.002, cv - 0.02, z + 8)], alpha(GLASS_DK, 0.85));
  }
  // a crenellated gallery + the glazed lantern room + cap
  iso.box(cu - w1 - 0.02, cv - w1 - 0.02, cu + w1 + 0.02, cv + w1 + 0.02, Z1, Z1 + 6, lighten(ST, 0.05), { ink: false });
  iso.box(cu - 0.05, cv - 0.05, cu + 0.05, cv + 0.05, Z1 + 6, Z1 + 18, alpha(GLASS_LIT, 0.7)); // the lit lantern glass
  iso.hip(cu - 0.06, cv - 0.06, cu + 0.06, cv + 0.06, Z1 + 18, 12, LEADROOF);
  return iso.build();
}

/** SMALLPOX HOSPITAL (Renwick Ruin, Roosevelt Island, 1856) — the dramatic
 *  roofless Gothic-Revival hospital RUIN: grey gneiss stone walls with empty
 *  pointed-arch window openings (sky behind), broken gables, no roof. A famous
 *  illuminated ruin. 2×2 SW. */
function smallpoxRuinTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const ST = hex('#9b958a'); // grey gneiss
  const ST_D = hex('#807b71');
  const SKY = alpha(hex('#3a2b50'), 0.7); // dusk sky showing through the openings
  iso.shadow(0.36, 0.62, 1.66, 1.62, 0.2, 0.22);
  // the U-shaped shell: a long front wall + two end wings, NO roof
  iso.box(0.4, 1.5, 1.6, 1.66, 0, 56, ST, { topC: ST_D });
  iso.box(0.4, 0.56, 0.6, 1.66, 0, 50, ST, { topC: ST_D });
  iso.box(1.4, 0.56, 1.6, 1.66, 0, 50, ST, { topC: ST_D });
  // empty pointed-arch window openings (sky behind) ranked along the front face
  for (let i = 0; i < 6; i++) {
    const v = 0.66 + i * 0.16;
    iso.r.poly([iso.P(1.6, v, 14), iso.P(1.6, v + 0.1, 14), iso.P(1.6, v + 0.1, 36), iso.P(1.6, v + 0.05, 44), iso.P(1.6, v, 36)], SKY);
    iso.r.polyline([iso.P(1.6, v, 14), iso.P(1.6, v, 36), iso.P(1.6, v + 0.05, 44), iso.P(1.6, v + 0.1, 36), iso.P(1.6, v + 0.1, 14)], INK_W * 0.45, alpha(INK, 0.6));
  }
  // broken, irregular wall tops (the ruined parapet — jagged ink crenellation)
  const [tx0, ty0] = iso.P(0.4, 1.66, 56);
  const [tx1] = iso.P(1.6, 1.66, 56);
  let prev: Pt = [tx0, ty0];
  for (let k = 1; k <= 10; k++) {
    const x = tx0 + ((tx1 - tx0) * k) / 10;
    const y = ty0 + (k % 2 === 0 ? -3 : 2) * RES + (k % 3 === 0 ? -4 * RES : 0);
    iso.r.line(prev, [x, y], INK_W * 0.6, INK);
    prev = [x, y];
  }
  // a corner stair-tower stub (the one taller surviving element)
  iso.box(0.42, 1.5, 0.58, 1.66, 56, 72, ST);
  return iso.build();
}

/** HOBOKEN TERMINAL (1907, K.M. Murchison) — the grand Beaux-Arts rail+ferry
 *  terminal on the Hudson: a long copper-clad headhouse with the tall clock
 *  tower (originally), big arched windows, and the great train sheds behind. A
 *  monster of a building. 5×5 SW (its OSM extent is ~9.6 tiles). */
function hobokenTerminalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 160 });
  void seed;
  const CU = hex('#5f8f7c'); // weathered copper façade (the Hoboken green)
  const CU_D = hex('#487163');
  const ST = LIMESTONE;
  iso.shadow(0.5, 1.2, 4.5, 4.4, 0.3, 0.24);
  // the long copper headhouse fronting the river
  iso.box(3.4, 0.6, 4.6, 4.6, 0, 70, CU, { leftC: CU_D, rightC: lit(CU, 0.04), topC: lighten(CU, 0.06) });
  // the great arched windows along the headhouse face
  for (let v = 0.8; v < 4.5; v += 0.42) {
    iso.r.poly([iso.P(4.6, v, 14), iso.P(4.6, v + 0.26, 14), iso.P(4.6, v + 0.26, 48), iso.P(4.6, v + 0.13, 58), iso.P(4.6, v, 48)], alpha(GLASS_DK, 0.85));
  }
  // a strong copper cornice
  iso.box(3.38, 0.58, 4.62, 4.62, 70, 76, lighten(CU, 0.08), { ink: false });
  // the tall Beaux-Arts clock tower at the north corner
  const tu = 4.2;
  const tv = 1.1;
  iso.box(tu - 0.34, tv - 0.34, tu + 0.34, tv + 0.34, 0, 150, ST);
  gridFace(iso, 'l', tv + 0.34, tu - 0.28, tu + 0.28, 80, 130, 3, alpha(GLASS_DK, 0.9));
  // the clock face high on the tower
  const [cx, cy] = iso.P(tu, tv + 0.34 + 0.004, 138);
  const cr = 8 * RES;
  const dial: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    dial.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
  }
  iso.r.poly(dial, DIALSTONE);
  iso.r.polyline(dial, INK_W * 0.5, INK, true);
  iso.r.line([cx, cy], [cx + cr * 0.5, cy - cr * 0.3], 1 * RES, INK);
  iso.r.line([cx, cy], [cx, cy - cr * 0.6], 1 * RES, INK);
  // tower cornice + a low pyramidal copper cap
  iso.box(tu - 0.36, tv - 0.36, tu + 0.36, tv + 0.36, 150, 156, lighten(ST, 0.05), { ink: false });
  iso.hip(tu - 0.34, tv - 0.34, tu + 0.34, tv + 0.34, 156, 22, CU);
  // the long low train sheds behind (a run of barrel/butterfly roofs)
  for (let i = 0; i < 5; i++) {
    const u0 = 0.6 + i * 0.56;
    iso.box(u0, 0.7, u0 + 0.44, 4.5, 0, 30, STEEL_GLASS_D, { topC: STEEL_GLASS });
    iso.gable(u0, 0.7, u0 + 0.44, 4.5, 30, 8, 'v', LEADROOF, STEEL_GLASS_D);
  }
  return iso.build();
}

// ===========================================================================
//  ADDITIONAL FLAGGED HEROES — these placed names ARE landmark:true in the NYC
//  data, so they render now (unlike the un-flagged skyscrapers above). Grant's
//  Tomb is a genuine marquee; LaGuardia is the obligatory monster airport.
// ===========================================================================

/** GENERAL GRANT NATIONAL MEMORIAL (Grant's Tomb, 1897) — the colossal grey-
 *  granite domed mausoleum on Riverside Drive, the largest in North America: a
 *  cubic Doric base with a deep columned portico, surmounted by a stepped conical
 *  drum and a shallow dome. Broad, monumental, 3×3 SW. */
function grantsTombTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = hex('#c6c2b8'); // grey granite
  iso.shadow(0.42, 0.72, 2.56, 2.5, 0.24, 0.22);
  // the great cubic base
  iso.box(0.5, 0.7, 2.5, 2.5, 0, 70, ST);
  // the projecting Doric portico (a temple front on the show face)
  iso.box(2.5, 1.1, 2.78, 2.1, 0, 64, lighten(ST, 0.03));
  for (let v = 1.16; v < 2.06; v += 0.13) iso.r.line(iso.P(2.78, v, 6), iso.P(2.78, v, 52), 1.8 * RES, lighten(ST, 0.18));
  // pediment over the portico
  iso.r.poly([iso.P(2.78, 1.1, 64), iso.P(2.78, 2.1, 64), iso.P(2.78, 1.6, 80)], lighten(ST, 0.1));
  iso.r.polyline([iso.P(2.78, 1.1, 64), iso.P(2.78, 2.1, 64), iso.P(2.78, 1.6, 80)], INK_W * 0.7, INK);
  // heavy cornice + a stepped attic parapet
  iso.box(0.48, 0.68, 2.52, 2.52, 70, 78, lighten(ST, 0.06), { ink: false });
  iso.box(0.7, 0.9, 2.3, 2.3, 78, 88, ST, { ink: false });
  // the colonnaded conical drum
  const cu = 1.5;
  const cv = 1.6;
  const [dx, dyB] = iso.P(cu, cv, 88);
  const DR = 0.5 * (CELL_W / 2);
  const ring = (s: number, zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([dx + Math.cos(a) * DR * s, dyB - zPx + Math.sin(a) * DR * s * 0.5]);
    }
    return pts;
  };
  iso.r.poly([...ring(1, 0), ...ring(1, 34 * RES).reverse()], shaded(ST, 0.04), lit(ST, 0.05));
  // peristyle columns round the visible front of the drum
  for (let t = 0; t <= 12; t++) {
    const a = (t / 12) * Math.PI;
    const px = dx + Math.cos(a) * DR;
    const py = dyB - 17 * RES + Math.sin(a) * DR * 0.5;
    iso.r.line([px, py - 9 * RES], [px, py + 9 * RES], 1.1 * RES, a < Math.PI * 0.45 ? lit(ST, 0.18) : lighten(ST, 0.12));
  }
  iso.r.polyline(ring(1, 34 * RES), INK_W * 0.6, alpha(INK, 0.6), true);
  // the shallow stepped dome + finial
  const domeR = DR * 0.92;
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push([dx + Math.cos(a) * domeR * s, dyB - 34 * RES - Math.sin(a) * domeR * 0.62 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(ST, 0.06), lit(ST, 0.05));
  iso.r.poly(dome(0.6), lit(ST, 0.12));
  iso.r.polyline(dome(1), INK_W * 0.7, INK);
  const tipY = dyB - 34 * RES - domeR * 0.62;
  iso.r.line([dx, tipY], [dx, tipY - 9 * RES], 1.2 * RES, GOLDLEAF);
  return iso.build();
}

/** THE JEWISH MUSEUM (Warburg Mansion, 1908, C.P.H. Gilbert) — the French-
 *  Gothic château on Fifth Avenue: a grey-limestone mansion with steep slate
 *  roofs, pointed dormers, a corner turret with a conical cap, and ornate Gothic
 *  tracery. 2×2 SW. */
function jewishMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#c8c3b6'); // grey limestone
  iso.shadow(0.36, 0.62, 1.66, 1.64, 0.22, 0.22);
  iso.box(0.36, 0.52, 1.62, 1.72, 0, 60, ST);
  gridFace(iso, 'r', 1.62, 0.58, 1.68, 12, 54, 7, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.72, 0.44, 1.58, 12, 54, 6, alpha(GLASS_DK, 0.92));
  // steep château roof with pointed dormers
  iso.gable(0.36, 0.52, 1.62, 1.72, 60, 28, 'v', LEADROOF, ST);
  for (let u = 0.5; u < 1.55; u += 0.28) {
    const [dx, dy] = iso.P(u, 1.72, 74);
    iso.r.poly([[dx - 4 * RES, dy], [dx + 4 * RES, dy], [dx, dy - 12 * RES]], lighten(ST, 0.04));
    iso.r.polyline([[dx - 4 * RES, dy], [dx, dy - 12 * RES], [dx + 4 * RES, dy]], INK_W * 0.4, INK);
  }
  // the signature corner turret with a tall conical cap
  const tu = 1.56;
  const tv = 1.68;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, 74, ST);
  gridFace(iso, 'l', tv + 0.1, tu - 0.08, tu + 0.08, 16, 66, 2, alpha(GLASS_DK, 0.9));
  needle(iso, tu, tv, 74, 40, 4 * RES, LEADROOF, GOLDLEAF);
  return iso.build();
}

/** LAGUARDIA AIRPORT — the MONSTER: a vast low terminal complex on the harbor
 *  edge. A long curved glass headhouse (the new Terminal B), control tower, and
 *  the apron with jet bridges and an aircraft tail. Sprawls across a 5×5 block.
 *  Drab steel + grey glass; it dwarfs everything by footprint, not height. */
function laGuardiaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 130 });
  void seed;
  const GL = STEEL_GLASS;
  const GL_D = STEEL_GLASS_D;
  iso.shadow(0.5, 1.0, 4.6, 4.5, 0.28, 0.2);
  // the grey concrete apron the whole thing sits on, with painted taxi-lane
  // markings + a dashed runway centreline so the ground reads as airfield
  iso.quad(0.4, 0.6, 4.6, 4.6, 0, COLORS.concrete);
  for (let v = 0.9; v < 4.4; v += 0.6) iso.r.line(iso.P(0.6, v, 0.4), iso.P(3.0, v, 0.4), 1.2 * RES, alpha(COLORS.marking, 0.55));
  for (let u = 0.7; u < 2.9; u += 0.22) iso.r.line(iso.P(u, 2.5, 0.5), iso.P(u + 0.12, 2.5, 0.5), 1.4 * RES, alpha(COLORS.marking, 0.7)); // runway dashes
  // the long low terminal headhouse along the back, its GLAZED face toward the
  // viewer (the u=4.5 right wall), with a continuous curtain-wall band
  iso.box(3.5, 0.7, 4.5, 4.5, 0, 46, GL, { leftC: GL_D, rightC: lit(GL, 0.05), topC: lighten(GL, 0.1) });
  gridFace(iso, 'r', 4.5, 0.78, 4.42, 8, 42, 22, alpha(hex('#cfe2f0'), 0.6));
  for (const z of [16, 30, 44] as const) iso.r.line(iso.P(4.5, 0.7, z), iso.P(4.5, 4.5, z), 0.7 * RES, lighten(GL, 0.14));
  // a bright cantilevered roof fascia (the headhouse cornice catches light)
  iso.box(3.48, 0.68, 4.52, 4.52, 46, 50, lighten(GL, 0.16), { ink: false });
  // the CONTROL TOWER — unmistakable: a slim shaft flaring to a wide glazed cab
  // under a flat cap, set at the terminal's north end. The tallest element.
  const tu = 4.0;
  const tv = 1.15;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, 92, GL_D);
  iso.box(tu - 0.13, tv - 0.13, tu + 0.13, tv + 0.13, 92, 100, GL); // flared corbel under the cab
  // the wide glazed observation cab (lit teal glass, the obvious "control tower")
  iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 100, 120, alpha(hex('#bfe0ff'), 0.85), {
    leftC: alpha(hex('#9cc3ec'), 0.85),
    rightC: alpha(hex('#d6ecff'), 0.85),
    topC: alpha(hex('#e6f4ff'), 0.85),
  });
  iso.box(tu - 0.22, tv - 0.22, tu + 0.22, tv + 0.22, 120, 126, GL_D, { ink: false }); // the dark cap roof
  const tt = iso.P(tu, tv, 126);
  iso.r.line(tt, [tt[0], tt[1] - 16 * RES], 1.2 * RES, STEEL_GLASS_D); // antenna
  // satellite concourse fingers reaching out onto the apron + jet bridges
  for (let i = 0; i < 3; i++) {
    const u0 = 0.9 + i * 0.95;
    iso.box(u0, 3.2, u0 + 0.55, 3.9, 0, 24, GL, { topC: lighten(GL, 0.08) });
    gridFace(iso, 'l', 3.9, u0 + 0.06, u0 + 0.49, 6, 20, 5, alpha(hex('#cfe2f0'), 0.55));
    iso.box(u0 + 0.55, 3.4, u0 + 0.78, 3.5, 0, 14, GL_D, { ink: false }); // jet bridge
  }
  // two parked airliners on the apron: a fat white fuselage + a tall swept
  // tail-fin + the swept wings — the silhouette that says "AIRPORT" at a glance
  const plane = (fx: number, fy: number): void => {
    iso.box(fx - 0.6, fy - 0.09, fx + 0.6, fy + 0.09, 6, 20, COLORS.white, { topC: lighten(COLORS.white, 0.05), rightC: lighten(COLORS.white, 0.02) });
    // nose cone taper
    const nz = iso.P(fx + 0.6, fy, 13);
    iso.r.poly([[nz[0], nz[1] - 7 * RES], [nz[0] + 10 * RES, nz[1] - 2 * RES], [nz[0], nz[1] + 7 * RES]], lighten(COLORS.white, 0.04));
    // swept tail-fin at the rear
    const tb = iso.P(fx - 0.56, fy, 20);
    iso.r.poly([[tb[0], tb[1]], [tb[0] + 13 * RES, tb[1]], [tb[0] + 17 * RES, tb[1] - 26 * RES], [tb[0] + 7 * RES, tb[1] - 26 * RES]], STEEL_GLASS);
    iso.r.polyline([[tb[0], tb[1]], [tb[0] + 7 * RES, tb[1] - 26 * RES], [tb[0] + 17 * RES, tb[1] - 26 * RES], [tb[0] + 13 * RES, tb[1]]], INK_W * 0.45, alpha(INK, 0.7));
    // the swept wings sweeping off both sides
    const wb = iso.P(fx, fy + 0.09, 12);
    iso.r.poly([[wb[0], wb[1]], [wb[0] - 30 * RES, wb[1] + 13 * RES], [wb[0] - 22 * RES, wb[1] + 15 * RES], [wb[0] + 8 * RES, wb[1] + 2 * RES]], lighten(COLORS.steel, 0.06));
    const wb2 = iso.P(fx, fy - 0.09, 12);
    iso.r.poly([[wb2[0], wb2[1]], [wb2[0] + 26 * RES, wb2[1] - 11 * RES], [wb2[0] + 20 * RES, wb2[1] - 13 * RES], [wb2[0] - 6 * RES, wb2[1] - 2 * RES]], lighten(COLORS.steel, 0.02));
    iso.r.polyline([iso.P(fx - 0.6, fy + 0.09, 6), iso.P(fx + 0.6, fy + 0.09, 6), iso.P(fx + 0.6, fy + 0.09, 20)], INK_W * 0.5, alpha(INK, 0.7));
  };
  plane(1.6, 1.5);
  plane(2.2, 2.7);
  return iso.build();
}

/** A compact grey Gothic-Revival church/cathedral: a stone nave under a steep
 *  roof, the great pointed west window, and a single corner spire-tower. Shared
 *  by the lesser placed cathedrals (Old St Patrick's, St James, St Sava) — each
 *  registered separately with its own seed so they vary slightly. 1×1 + headroom. */
function gothicChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 180 });
  const ST = hex('#a9a08d'); // grey-brown stone
  const ST_D = hex('#8d8472');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  // a stable per-instance jitter so the three shared churches aren't identical
  const tall = 56 + (seed % 3) * 8;
  const spireH = 78 + ((seed >> 1) % 3) * 14;
  const spireLeft = seed % 2 === 0;
  iso.shadow(0.28, 0.4, 0.8, 0.76, 0.2, 0.22);
  // nave + steep gable roof
  iso.box(0.4, 0.34, 0.74, 0.82, 0, tall, ST);
  iso.gable(0.4, 0.34, 0.74, 0.82, tall, 16, 'v', LEADROOF, ST);
  for (let i = 0; i < 4; i++) {
    const u = 0.45 + i * 0.07;
    iso.r.poly([iso.P(u, 0.82, 10), iso.P(u + 0.035, 0.82, 10), iso.P(u + 0.035, 0.82, tall - 14), iso.P(u + 0.017, 0.82, tall - 6), iso.P(u, 0.82, tall - 14)], GLASS);
  }
  // the great pointed west window on the gable end (front, high v)
  iso.r.poly([iso.P(0.5, 0.82, 16), iso.P(0.64, 0.82, 16), iso.P(0.64, 0.82, tall - 6), iso.P(0.57, 0.82, tall + 6), iso.P(0.5, 0.82, tall - 6)], GLASS);
  // the single square spire-tower at a front corner
  const tu = spireLeft ? 0.34 : 0.78;
  const tv = 0.78;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, tall + 18, ST);
  for (const z of [tall * 0.5, tall * 0.8] as const) {
    iso.r.poly([iso.P(tu - 0.07, tv + 0.1, z), iso.P(tu + 0.07, tv + 0.1, z), iso.P(tu + 0.07, tv + 0.1, z + 10), iso.P(tu, tv + 0.1, z + 15), iso.P(tu - 0.07, tv + 0.1, z + 10)], GLASS);
  }
  // corner pinnacles + the spire
  iso.box(tu - 0.11, tv - 0.11, tu + 0.11, tv + 0.11, tall + 18, tall + 24, lighten(ST, 0.04), { ink: false });
  for (const [du, dv] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]] as const) {
    needle(iso, tu + du, tv + dv, tall + 24, 14, 1.2 * RES, ST_D, GOLDLEAF);
  }
  needle(iso, tu, tv, tall + 24, spireH, 3 * RES, ST_D, GLASS_LIT);
  return iso.build();
}

/** A small Federal / Greek-Revival historic HOUSE on its lawn — a grey clapboard
 *  or fieldstone block with a columned porch, shutters, a hipped roof and
 *  chimneys. Shared by the placed historic-house memorials (Hamilton Grange, Van
 *  Wagenen/Apple-Tree House). 1×1, low. */
function historicHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 40 });
  const ST = (seed % 2 === 0 ? hex('#c4c0b4') : hex('#a89e8a')); // pale clapboard / fieldstone
  iso.shadow(0.28, 0.38, 0.78, 0.74, 0.16, 0.2);
  iso.box(0.34, 0.34, 0.74, 0.78, 0, 26, ST);
  // hipped roof
  iso.hip(0.32, 0.32, 0.76, 0.8, 26, 14, LEADROOF);
  // chimneys
  for (const [u, v] of [[0.42, 0.44], [0.66, 0.66]] as const) iso.box(u - 0.025, v - 0.025, u + 0.025, v + 0.025, 36, 44, GRANITE, { ink: false });
  // a columned porch on the show face
  for (let v = 0.42; v < 0.74; v += 0.1) iso.r.line(iso.P(0.74, v, 2), iso.P(0.74, v, 22), 1.3 * RES, lighten(ST, 0.18));
  iso.r.poly([iso.P(0.76, 0.36, 22), iso.P(0.76, 0.76, 22), iso.P(0.76, 0.56, 30)], LEADROOF);
  // shuttered windows
  gridFace(iso, 'l', 0.78, 0.4, 0.72, 8, 18, 3, alpha(GLASS_DK, 0.85));
  return iso.build();
}

/** BLOCKHOUSE NO. 1 (Central Park, 1814) — the squat War-of-1812 fieldstone
 *  redoubt: a low rough-stone cube with a sloped earth top and a flagstaff on
 *  the rocky outcrop. 1×1, low. */
function blockhouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 50 });
  void seed;
  const ST = hex('#8f8576'); // rough grey fieldstone
  iso.shadow(0.3, 0.42, 0.74, 0.72, 0.16, 0.2);
  // rocky base
  iso.box(0.3, 0.34, 0.76, 0.78, 0, 6, GRANITE);
  // the squat blockhouse cube
  iso.box(0.36, 0.4, 0.72, 0.74, 6, 34, ST);
  // rough random stone coursing (ink ticks)
  for (let z = 12; z < 32; z += 6) {
    for (let v = 0.44; v < 0.72; v += 0.09) iso.r.line(iso.P(0.72, v, z), iso.P(0.72, v + 0.05, z), 0.5 * RES, alpha(darken(ST, 0.2), 0.6));
  }
  // a couple of gun embrasures
  for (const v of [0.5, 0.64] as const) {
    const [ex, ey] = iso.P(0.72, v, 20);
    iso.r.rect(ex, ey, ex + 3 * RES, ey + 3 * RES, darken(GRANITE, 0.2));
  }
  // sloped earth/parapet top + the flagstaff
  iso.box(0.38, 0.42, 0.7, 0.72, 34, 38, shaded(COLORS.grass, 0.06), { ink: false });
  const f = iso.P(0.54, 0.57, 38);
  iso.r.line(f, [f[0], f[1] - 20 * RES], 1.2 * RES, INK);
  iso.r.poly([[f[0], f[1] - 20 * RES], [f[0] + 9 * RES, f[1] - 18 * RES], [f[0], f[1] - 14 * RES]], COLORS.orange);
  return iso.build();
}

/** CENTER FOR BROOKLYN HISTORY (1881) — the landmark Queen-Anne terracotta-and-
 *  brick library on Pierrepont St: a richly modelled grey-buff block with a
 *  steep tiled roof, terracotta bands, arched windows and a corner gable. 2×2. */
function brooklynHistoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#a99b88'); // greyed terracotta-brown
  iso.shadow(0.36, 0.6, 1.64, 1.62, 0.2, 0.22);
  iso.box(0.36, 0.5, 1.62, 1.7, 0, 56, ST);
  // terracotta banding
  for (const z of [20, 38] as const) iso.r.line(iso.P(1.62, 0.5, z), iso.P(1.62, 1.7, z), 0.9 * RES, lighten(ST, 0.16));
  // big arched ground windows + smaller upper windows
  for (let v = 0.6; v < 1.6; v += 0.24) {
    iso.r.poly([iso.P(1.62, v, 12), iso.P(1.62, v + 0.14, 12), iso.P(1.62, v + 0.14, 30), iso.P(1.62, v + 0.07, 38), iso.P(1.62, v, 30)], alpha(GLASS_DK, 0.85));
  }
  gridFace(iso, 'r', 1.62, 0.56, 1.66, 42, 52, 8, alpha(GLASS_DK, 0.9));
  // steep tiled roof + a prominent front gable
  iso.gable(0.36, 0.5, 1.62, 1.7, 56, 26, 'v', hex('#9a5a3f'), ST);
  iso.r.poly([iso.P(0.9, 1.7, 56), iso.P(1.3, 1.7, 56), iso.P(1.1, 1.7, 78)], shaded(ST, 0.06));
  iso.r.polyline([iso.P(0.9, 1.7, 56), iso.P(1.1, 1.7, 78), iso.P(1.3, 1.7, 56)], INK_W * 0.5, INK);
  return iso.build();
}

// ===========================================================================
//  ROUND 2 — more of the placed `named` set. These match REAL placed names
//  (Midtown commercial towers, the harbor's ships & sculptures, the church
//  spires, the Fifth-Ave mansions, the Central-Park clocks & monuments). Same
//  drab-grey gamut, slim+tall via headroom; each its own draw fn + bespoke light.
// ===========================================================================

/** BRYANT PARK HOTEL — the AMERICAN RADIATOR BUILDING (Raymond Hood, 1924):
 *  the famous BLACK-BRICK-AND-GOLD Gothic tower meant to look like a glowing
 *  coal — a near-black shaft with gilded terracotta setbacks and crown. Its
 *  black-on-gold is unmistakable; slim 2×2 on headroom. */
function bryantParkHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 320 });
  void seed;
  const BK = hex('#33302e'); // near-black brick (the "coal")
  const BK_D = hex('#222020');
  const GOLD = hex('#c79a47'); // the gilded Gothic ornament + crown
  iso.shadow(0.32, 0.5, 1.68, 1.64, 0.3, 0.28);
  // a gilded stone base (the lobby storey glows gold)
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 22, GOLD, { topC: lighten(GOLD, 0.08) });
  // the black shaft with strong vertical Gothic piers
  iso.box(0.5, 0.58, 1.5, 1.52, 22, 230, BK, { leftC: BK_D, rightC: lighten(BK, 0.06) });
  gridFace(iso, 'r', 1.5, 0.64, 1.46, 30, 222, 6, alpha(hex('#0d0c0b'), 0.9));
  gridFace(iso, 'l', 1.52, 0.54, 1.44, 30, 222, 6, alpha(hex('#0d0c0b'), 0.92));
  // continuous gilt-tipped piers between the window bays (the gold edges)
  for (const v of [0.7, 0.86, 1.02, 1.18, 1.34] as const) iso.r.line(iso.P(1.5, v, 26), iso.P(1.5, v, 226), 0.8 * RES, GOLD);
  for (const u of [0.66, 0.82, 0.98, 1.14, 1.3] as const) iso.r.line(iso.P(u, 1.52, 26), iso.P(u, 1.52, 226), 0.7 * RES, darken(GOLD, 0.18));
  // the gilded Gothic crown: stepped black setbacks with gold pinnacle tips
  for (const [inset, zb, zt] of [[0.62, 230, 250], [0.74, 250, 268]] as const) {
    iso.box(inset, inset, 2 - inset, 2 - inset, zb, zt, BK, { topC: GOLD });
    for (const [du, dv] of [[0, 0], [-0.1, 0], [0.1, 0], [0, -0.1], [0, 0.1]] as const) {
      needle(iso, 1 + du, 1.05 + dv, zt, 16 + (du === 0 && dv === 0 ? 12 : 0), 1.4 * RES, GOLD, GOLD);
    }
  }
  return iso.build();
}

/** NEW YORK COCOA EXCHANGE BUILDING (1904) — the small grey-brick FLATIRON wedge
 *  at the fork of Beaver/Pearl/Wall: an acute triangular plan rising to a
 *  rounded prow, a cornice and a little cupola. The wedge silhouette is the
 *  whole point. 2×2 SW + headroom. */
function cocoaExchangeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const BK = hex('#aba293'); // grey-buff brick
  const ST = LIMESTONE;
  iso.shadow(0.36, 0.5, 1.66, 1.62, 0.26, 0.24);
  // A flatiron wedge with a BLUNT prow. CRITICAL for iso readability: the
  // footprint must span the screen-x axis (u−v), not collapse along the depth
  // axis (u+v) into a knife. So the BACK is a wide face spanning low-u-high-v to
  // high-u-low-v, and the prow pushes toward the viewer (both u and v larger).
  // Corners (u,v): back-left (low u, high v) and back-right (high u, low v) give
  // the wide base; the prow is a short flat face out front.
  const bL = { u: 0.4, v: 1.5 }; // back-left  (screen far-left)
  const bR = { u: 1.5, v: 0.4 }; // back-right (screen far-right)
  const pL = { u: 1.18, v: 1.74 }; // prow-left
  const pR = { u: 1.74, v: 1.18 }; // prow-right
  const Z = 150; // taller — a proper little tower
  // right (sun) street wall: bR → pR
  iso.r.poly([iso.P(bR.u, bR.v, 0), iso.P(pR.u, pR.v, 0), iso.P(pR.u, pR.v, Z), iso.P(bR.u, bR.v, Z)], lit(BK, 0.05));
  // left (dusk) street wall: bL → pL
  iso.r.poly([iso.P(bL.u, bL.v, 0), iso.P(pL.u, pL.v, 0), iso.P(pL.u, pL.v, Z), iso.P(bL.u, bL.v, Z)], shaded(BK, 0.08));
  // the short blunt PROW face: pL → pR (the rounded nose, drawn flat + lit)
  iso.r.poly([iso.P(pL.u, pL.v, 0), iso.P(pR.u, pR.v, 0), iso.P(pR.u, pR.v, Z), iso.P(pL.u, pL.v, Z)], lit(BK, 0.1));
  // back wall: bL → bR
  iso.r.poly([iso.P(bL.u, bL.v, 0), iso.P(bR.u, bR.v, 0), iso.P(bR.u, bR.v, Z), iso.P(bL.u, bL.v, Z)], shaded(BK, 0.16));
  // the top
  iso.r.poly([iso.P(bL.u, bL.v, Z), iso.P(bR.u, bR.v, Z), iso.P(pR.u, pR.v, Z), iso.P(pL.u, pL.v, Z)], top(BK, 0.2));
  iso.r.polyline([iso.P(bL.u, bL.v, Z), iso.P(bR.u, bR.v, Z), iso.P(pR.u, pR.v, Z), iso.P(pL.u, pL.v, Z), iso.P(bL.u, bL.v, Z)], INK_W * 0.7, INK, true);
  // the prow vertical edges (the two nose corners) + the back-right vertical
  iso.edge(iso.P(pL.u, pL.v, 0), iso.P(pL.u, pL.v, Z));
  iso.edge(iso.P(pR.u, pR.v, 0), iso.P(pR.u, pR.v, Z));
  iso.edge(iso.P(bR.u, bR.v, 0), iso.P(bR.u, bR.v, Z));
  // window rows down both street faces + the prow face
  for (let z = 18; z < Z - 14; z += 15) {
    iso.r.line(iso.P(bR.u, bR.v, z), iso.P(pR.u, pR.v, z), 0.6 * RES, alpha(GLASS_DK, 0.5));
    iso.r.line(iso.P(bL.u, bL.v, z), iso.P(pL.u, pL.v, z), 0.6 * RES, alpha(GLASS_DK, 0.45));
    iso.r.line(iso.P(pL.u, pL.v, z), iso.P(pR.u, pR.v, z), 0.6 * RES, alpha(GLASS_DK, 0.55));
  }
  // a strong limestone cornice ring + a low parapet
  iso.r.poly([iso.P(bL.u, bL.v, Z), iso.P(bR.u, bR.v, Z), iso.P(pR.u, pR.v, Z), iso.P(pL.u, pL.v, Z)], alpha(lighten(ST, 0.1), 0.4));
  // a small cupola/flagpole over the prow nose
  const nu = (pL.u + pR.u) / 2;
  const nv = (pL.v + pR.v) / 2;
  iso.box(nu - 0.08, nv - 0.08, nu + 0.08, nv + 0.08, Z, Z + 12, ST);
  iso.hip(nu - 0.09, nv - 0.09, nu + 0.09, nv + 0.09, Z + 12, 10, LEADROOF);
  const [fx, fy] = iso.P(nu, nv, Z + 22);
  iso.r.line([fx, fy], [fx, fy - 10 * RES], 0.9 * RES, GOLDLEAF);
  return iso.build();
}

/** CANDLER BUILDING (1914, Times Square) — a slim white-glazed-terracotta
 *  commercial tower with a bright ornamented base, a tall plain shaft and a
 *  richly modelled crown of arched loggias and a cornice. Pale grey, slim 2×2
 *  on headroom. */
function candlerBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 320 });
  void seed;
  const TC = hex('#d5d0c2'); // white-glazed terracotta (greyed)
  iso.shadow(0.32, 0.5, 1.68, 1.64, 0.3, 0.28);
  // bright ornamented base
  iso.box(0.28, 0.4, 1.72, 1.72, 0, 30, lighten(TC, 0.04));
  gridFace(iso, 'r', 1.72, 0.46, 1.68, 8, 26, 8, alpha(GLASS_DK, 0.85));
  // the tall plain shaft
  iso.box(0.5, 0.58, 1.5, 1.52, 30, 238, TC);
  gridFace(iso, 'r', 1.5, 0.56, 1.46, 38, 226, 7, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.52, 0.54, 1.44, 38, 226, 7, alpha(GLASS_DK, 0.92));
  for (const v of [0.7, 0.86, 1.02, 1.18, 1.34] as const) iso.r.line(iso.P(1.5, v, 38), iso.P(1.5, v, 228), 0.6 * RES, lighten(TC, 0.12));
  // the modelled crown: an arcaded loggia stage + a heavy cornice + parapet
  iso.box(0.48, 0.56, 1.52, 1.54, 238, 258, lighten(TC, 0.05));
  for (let v = 0.6; v < 1.48; v += 0.18) {
    iso.r.poly([iso.P(1.52, v, 240), iso.P(1.52, v + 0.1, 240), iso.P(1.52, v + 0.1, 252), iso.P(1.52, v + 0.05, 257), iso.P(1.52, v, 252)], alpha(GLASS_DK, 0.85));
  }
  iso.box(0.44, 0.52, 1.56, 1.58, 258, 266, lighten(TC, 0.1), { ink: false });
  iso.box(0.5, 0.58, 1.5, 1.52, 266, 276, TC, { ink: false });
  return iso.build();
}

/** INTERNATIONAL MERCANTILE MARINE CO. BUILDING (1 Broadway, 1884/1921) — the
 *  great grey-granite shipping-line headquarters at Bowling Green: a broad block
 *  with a rusticated base, a richly carved entrance, ranks of windows and a
 *  strong cornice — and the carved ship's-prows over the doors. 3×3 SW. */
function immBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 200 });
  void seed;
  const ST = hex('#bdb7aa'); // grey granite
  iso.shadow(0.42, 0.7, 2.58, 2.55, 0.26, 0.24);
  iso.box(0.36, 0.52, 2.64, 2.6, 0, 24, GRANITE); // rusticated base
  iso.box(0.42, 0.58, 2.58, 2.54, 24, 150, ST);
  // dense window grid on the two faces (a commercial palazzo)
  gridFace(iso, 'r', 2.58, 0.66, 2.5, 34, 140, 12, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 2.54, 0.58, 2.46, 34, 140, 12, alpha(GLASS_DK, 0.92));
  for (let v = 0.7; v < 2.5; v += 0.16) iso.r.line(iso.P(2.58, v, 30), iso.P(2.58, v, 144), 0.5 * RES, lighten(ST, 0.1));
  // the grand arched entrance with the carved ship's-prow over it
  iso.r.poly([iso.P(2.58, 1.35, 4), iso.P(2.58, 1.7, 4), iso.P(2.58, 1.7, 24), iso.P(2.58, 1.52, 34), iso.P(2.58, 1.35, 24)], darken(GRANITE, 0.2));
  // heavy cornice + a low attic
  iso.box(0.34, 0.5, 2.66, 2.62, 150, 158, lighten(ST, 0.07), { ink: false });
  iso.box(0.5, 0.66, 2.5, 2.46, 158, 168, ST, { ink: false });
  return iso.build();
}

/** CHARLES SCRIBNER'S SONS BUILDING (Ernest Flagg, 1913) — the elegant Fifth-Ave
 *  bookshop: a slim Beaux-Arts façade with a great two-storey arched IRON-AND-
 *  GLASS storefront below ranks of windows, a delicate cornice. Pale grey,
 *  slim, 2×2 SW. */
function scribnersTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#cdc8ba');
  const IRON = hex('#3f4750');
  iso.shadow(0.36, 0.58, 1.64, 1.62, 0.22, 0.22);
  iso.box(0.4, 0.54, 1.6, 1.7, 0, 78, ST);
  // the great two-storey arched iron-and-glass storefront (the signature)
  iso.r.poly([iso.P(1.6, 0.62, 4), iso.P(1.6, 1.6, 4), iso.P(1.6, 1.6, 30), iso.P(1.6, 1.1, 44), iso.P(1.6, 0.62, 30)], alpha(hex('#1c2740'), 0.9));
  // the iron tracery ribs of the arch
  for (const v of [0.78, 0.94, 1.1, 1.26, 1.42] as const) iso.r.line(iso.P(1.602, v, 6), iso.P(1.602, v, 32), 0.7 * RES, IRON);
  iso.r.polyline([iso.P(1.6, 0.62, 30), iso.P(1.6, 1.1, 44), iso.P(1.6, 1.6, 30)], INK_W * 0.6, IRON);
  // upper ranks of windows + a delicate cornice
  gridFace(iso, 'r', 1.6, 0.6, 1.62, 48, 72, 5, alpha(GLASS_DK, 0.9));
  iso.box(0.38, 0.52, 1.62, 1.72, 78, 84, lighten(ST, 0.07), { ink: false });
  return iso.build();
}

// ===========================================================================
//  ROUND-2 CHURCHES — each a distinct silhouette (a Byzantine dome, a marble
//  Gothic spire, a Georgian steeple, twin Baroque towers). Grey stone gamut.
// ===========================================================================

/** ST. BARTHOLOMEW'S CHURCH (Bertram Goodhue, 1918) — the Park-Ave Byzantine-
 *  Romanesque church: a broad low body of salmon-grey brick and limestone bands,
 *  the great triple-arched Stanford-White PORCH, and the wide polychrome TILED
 *  DOME over the crossing. The dome + porch identify it. 2×2 SW + headroom. */
function stBartholomewTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = hex('#c2b6a4'); // salmon-grey brick + limestone
  const TILE = hex('#b08a4e'); // the polychrome-tile dome (gold-buff at dusk)
  iso.shadow(0.34, 0.56, 1.66, 1.64, 0.22, 0.22);
  // the broad low cruciform body
  iso.box(0.4, 0.5, 1.6, 1.72, 0, 58, ST);
  // banded coursing
  for (const z of [20, 38] as const) iso.r.line(iso.P(1.6, 0.5, z), iso.P(1.6, 1.72, z), 0.8 * RES, lighten(ST, 0.14));
  // the great triple-arched front PORCH (the Stanford White doors)
  for (const v of [0.66, 0.96, 1.26] as const) {
    iso.r.poly([iso.P(1.6, v, 6), iso.P(1.6, v + 0.2, 6), iso.P(1.6, v + 0.2, 30), iso.P(1.6, v + 0.1, 42), iso.P(1.6, v, 30)], alpha(hex('#2a2233'), 0.85));
    iso.r.polyline([iso.P(1.6, v, 30), iso.P(1.6, v + 0.1, 42), iso.P(1.6, v + 0.2, 30)], INK_W * 0.5, INK);
  }
  // the wide tiled crossing dome on a low drum
  const cu = 0.94;
  const cv = 1.0;
  iso.box(cu - 0.26, cv - 0.26, cu + 0.26, cv + 0.26, 58, 72, lighten(ST, 0.04));
  const [dx, dyB] = iso.P(cu, cv, 72);
  const DR = 0.5 * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.sin(a) * DR * 0.72 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(TILE, 0.06), lit(TILE, 0.06));
  for (const k of [-0.62, -0.22, 0.22, 0.62]) iso.r.line([dx + k * DR, dyB], [dx + k * DR * 0.1, dyB - DR * 0.7], 0.7 * RES, alpha(darken(TILE, 0.18), 0.8)); // gores
  iso.r.polyline(dome(1), INK_W * 0.7, INK);
  iso.r.line([dx, dyB - DR * 0.72], [dx, dyB - DR * 0.72 - 8 * RES], 1.1 * RES, GOLDLEAF);
  return iso.build();
}

/** GRACE CHURCH (James Renwick, 1846) — the exquisite white-MARBLE Gothic
 *  Revival church on Broadway, terminating the bend: a nave under a steep roof
 *  and a tall lacy octagonal marble spire over the entrance tower. Pale grey-
 *  white, 1×1 + big headroom (the spire towers). */
function graceChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const ST = hex('#d4cfc2'); // white marble
  const ST_D = hex('#b4ae9f');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  iso.shadow(0.28, 0.4, 0.8, 0.78, 0.2, 0.22);
  // nave + steep roof
  iso.box(0.46, 0.32, 0.8, 0.82, 0, 46, ST);
  iso.gable(0.46, 0.32, 0.8, 0.82, 46, 16, 'v', LEADROOF, ST);
  for (let i = 0; i < 4; i++) {
    const u = 0.52 + i * 0.07;
    iso.r.poly([iso.P(u, 0.82, 8), iso.P(u + 0.035, 0.82, 8), iso.P(u + 0.035, 0.82, 30), iso.P(u + 0.017, 0.82, 38), iso.P(u, 0.82, 30)], GLASS);
  }
  // the front tower + the great west window
  const tu = 0.36;
  const tv = 0.66;
  iso.box(tu - 0.14, tv - 0.14, tu + 0.14, tv + 0.14, 0, 88, ST);
  iso.r.poly([iso.P(tu - 0.08, tv + 0.14, 18), iso.P(tu + 0.08, tv + 0.14, 18), iso.P(tu + 0.08, tv + 0.14, 56), iso.P(tu, tv + 0.14, 66), iso.P(tu - 0.08, tv + 0.14, 56)], GLASS);
  // corner pinnacles + the tall lacy octagonal marble spire
  iso.box(tu - 0.15, tv - 0.15, tu + 0.15, tv + 0.15, 88, 94, lighten(ST, 0.04), { ink: false });
  for (const [du, dv] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]] as const) {
    needle(iso, tu + du, tv + dv, 94, 26, 1.5 * RES, ST_D, GOLDLEAF);
  }
  needle(iso, tu, tv, 94, 104, 3.2 * RES, ST_D, GLASS_LIT);
  // crockets up the spire
  const [ax, ay] = iso.P(tu, tv, 94);
  for (let k = 1; k <= 6; k++) {
    const yy = ay - (104 * RES * k) / 7;
    iso.r.line([ax - 2.6 * RES, yy], [ax - 4.6 * RES, yy + 1 * RES], 0.6 * RES, ST_D);
    iso.r.line([ax + 2.6 * RES, yy], [ax + 4.6 * RES, yy + 1 * RES], 0.6 * RES, ST_D);
  }
  return iso.build();
}

/** SAINT PAUL'S CHAPEL (1766) — Manhattan's oldest church, a Georgian/Classical
 *  brownstone-and-stucco chapel with a pedimented portico, a square tower and a
 *  tiered white steeple with a weathervane. Pale grey, 1×1 + headroom. */
function stPaulsChapelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 180 });
  void seed;
  const ST = hex('#ccc6b6'); // pale stucco
  const ST_W = hex('#dcd7ca'); // white-painted steeple
  iso.shadow(0.28, 0.4, 0.8, 0.78, 0.18, 0.22);
  // the body + a hipped roof
  iso.box(0.42, 0.34, 0.78, 0.82, 0, 44, ST);
  gridFace(iso, 'r', 0.78, 0.4, 0.78, 8, 38, 4, alpha(GLASS_DK, 0.85));
  iso.hip(0.4, 0.32, 0.8, 0.84, 44, 12, LEADROOF);
  // the pedimented classical portico on the show face
  for (let v = 0.42; v < 0.76; v += 0.1) iso.r.line(iso.P(0.78, v, 4), iso.P(0.78, v, 36), 1.3 * RES, lighten(ST, 0.16));
  iso.r.poly([iso.P(0.78, 0.4, 36), iso.P(0.78, 0.78, 36), iso.P(0.78, 0.59, 46)], lighten(ST, 0.1));
  // the square tower + the tiered white steeple (Georgian) at the back/centre
  const tu = 0.5;
  const tv = 0.5;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 44, 74, ST_W);
  iso.box(tu - 0.085, tv - 0.085, tu + 0.085, tv + 0.085, 74, 96, ST_W);
  // an octagonal lantern stage (drawn as a narrower box) + spire
  iso.box(tu - 0.06, tv - 0.06, tu + 0.06, tv + 0.06, 96, 112, lighten(ST_W, 0.04));
  needle(iso, tu, tv, 112, 44, 2.4 * RES, ST_W, GOLDLEAF);
  return iso.build();
}

/** A grand TWIN-TOWER church/cathedral: a long basilica nave, a great rose
 *  window between two square towers, each capped per the building (pyramidal
 *  copper, stone pinnacle, or octagonal lantern). Shared by St Paul the
 *  Apostle, St Ignatius Loyola and St George's — distinguished by seed
 *  (tower height, cap style, body height). 2×2 SW + headroom. */
function twinTowerChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 240 });
  const ST = hex('#bcb3a1'); // grey stone
  const ST_D = hex('#9c9483');
  const GLASS = alpha(hex('#2b3350'), 0.9);
  const towerH = 150 + (seed % 3) * 22; // 150 / 172 / 194
  const cap = seed % 3; // 0 pyramid, 1 stone pinnacle, 2 octagonal lantern
  const bodyH = 78 + ((seed >> 1) % 2) * 10;
  iso.shadow(0.34, 0.52, 1.66, 1.7, 0.26, 0.24);
  // the long nave + steep roof (ridge front→back)
  iso.box(0.58, 0.44, 1.18, 1.6, 0, bodyH, ST);
  iso.gable(0.58, 0.44, 1.18, 1.6, bodyH, 26, 'v', LEADROOF, ST);
  gridFace(iso, 'l', 1.6, 0.64, 1.14, 16, bodyH - 14, 7, GLASS); // clerestory flank
  // aisle walls
  iso.box(0.34, 0.5, 0.58, 1.56, 0, bodyH * 0.6, ST);
  iso.box(1.18, 0.5, 1.42, 1.56, 0, bodyH * 0.6, ST);
  // the great rose window on the west front (high v) between the towers
  iso.box(0.6, 1.56, 1.16, 1.74, 0, bodyH + 14, ST);
  const [rx, ry] = iso.P(0.88, 1.74, bodyH * 0.7);
  const RR = 9 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92]);
  }
  iso.r.poly(rose, GLASS);
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  // triple portals
  for (const pu of [0.72, 0.88, 1.04] as const) {
    iso.r.poly([iso.P(pu - 0.045, 1.74, 0), iso.P(pu + 0.045, 1.74, 0), iso.P(pu + 0.045, 1.74, 14), iso.P(pu, 1.74, 22), iso.P(pu - 0.045, 1.74, 14)], darken(ST_D, 0.2));
  }
  // the twin square towers flanking the west front
  for (const tu of [0.54, 1.22] as const) {
    iso.box(tu - 0.15, 1.56, tu + 0.15, 1.78, 0, towerH, ST);
    gridFace(iso, 'l', 1.78, tu - 0.11, tu + 0.11, 24, towerH - 22, 3, GLASS);
    // belfry openings near the top
    for (const z of [towerH - 50, towerH - 26] as const) {
      iso.r.poly([iso.P(tu - 0.1, 1.78, z), iso.P(tu + 0.1, 1.78, z), iso.P(tu + 0.1, 1.78, z + 12), iso.P(tu, 1.78, z + 18), iso.P(tu - 0.1, 1.78, z + 12)], GLASS);
    }
    iso.box(tu - 0.16, 1.55, tu + 0.16, 1.79, towerH, towerH + 6, lighten(ST, 0.04), { ink: false });
    if (cap === 0) {
      iso.hip(tu - 0.15, 1.56, tu + 0.15, 1.78, towerH + 6, 30, COPPER); // pyramidal copper
      needle(iso, tu, 1.67, towerH + 36, 14, 1.2 * RES, COPPER, GOLDLEAF);
    } else if (cap === 1) {
      for (const [du, dv] of [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.1], [0.13, 0.1]] as const) {
        needle(iso, tu + du, 1.67 + dv, towerH + 6, 18, 1.2 * RES, ST_D, GOLDLEAF);
      }
      needle(iso, tu, 1.67, towerH + 6, 46, 2.4 * RES, ST_D, GLASS_LIT); // stone pinnacle
    } else {
      iso.box(tu - 0.1, 1.57, tu + 0.1, 1.77, towerH + 6, towerH + 24, lighten(ST, 0.05)); // octagonal lantern
      iso.hip(tu - 0.11, 1.56, tu + 0.11, 1.78, towerH + 24, 18, LEADROOF);
      iso.r.line(iso.P(tu, 1.67, towerH + 42), [iso.P(tu, 1.67, towerH + 42)[0], iso.P(tu, 1.67, towerH + 42)[1] - 8 * RES], 1 * RES, GOLDLEAF);
    }
  }
  return iso.build();
}

/** A single-STEEPLE neighbourhood church: a brownstone Gothic nave under a steep
 *  roof, the pointed west window, and one tall square tower with an octagonal
 *  spire at a front corner. Shared by Saint Mark's in-the-Bowery, St Luke's and
 *  the Church of Saint Mary the Virgin (varied by seed). 1×1 + headroom. */
function steepleChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  const palette = [hex('#a89a86'), hex('#b0a690'), hex('#9f968a')] as const;
  const ST = palette[seed % 3]!;
  const ST_D = darken(ST, 0.16);
  const GLASS = alpha(hex('#2b3350'), 0.9);
  const tall = 50 + (seed % 3) * 6;
  const spireH = 88 + ((seed >> 1) % 3) * 14;
  const spireLeft = seed % 2 === 1;
  iso.shadow(0.28, 0.4, 0.8, 0.78, 0.2, 0.22);
  iso.box(0.42, 0.34, 0.76, 0.82, 0, tall, ST);
  iso.gable(0.42, 0.34, 0.76, 0.82, tall, 16, 'v', LEADROOF, ST);
  for (let i = 0; i < 4; i++) {
    const u = 0.47 + i * 0.07;
    iso.r.poly([iso.P(u, 0.82, 10), iso.P(u + 0.035, 0.82, 10), iso.P(u + 0.035, 0.82, tall - 12), iso.P(u + 0.017, 0.82, tall - 4), iso.P(u, 0.82, tall - 12)], GLASS);
  }
  iso.r.poly([iso.P(0.51, 0.82, 16), iso.P(0.66, 0.82, 16), iso.P(0.66, 0.82, tall - 4), iso.P(0.585, 0.82, tall + 8), iso.P(0.51, 0.82, tall - 4)], GLASS); // west window
  // the steeple tower at a front corner
  const tu = spireLeft ? 0.34 : 0.78;
  const tv = 0.78;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, tall + 22, ST);
  for (const z of [tall * 0.5, tall * 0.82] as const) {
    iso.r.poly([iso.P(tu - 0.07, tv + 0.1, z), iso.P(tu + 0.07, tv + 0.1, z), iso.P(tu + 0.07, tv + 0.1, z + 9), iso.P(tu, tv + 0.1, z + 14), iso.P(tu - 0.07, tv + 0.1, z + 9)], GLASS);
  }
  iso.box(tu - 0.11, tv - 0.11, tu + 0.11, tv + 0.11, tall + 22, tall + 28, lighten(ST, 0.04), { ink: false });
  for (const [du, dv] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]] as const) {
    needle(iso, tu + du, tv + dv, tall + 28, 16, 1.2 * RES, ST_D, GOLDLEAF);
  }
  needle(iso, tu, tv, tall + 28, spireH, 3 * RES, ST_D, GLASS_LIT);
  return iso.build();
}

// ===========================================================================
//  ROUND-2 MANSIONS, HOTELS & APARTMENTS — the Fifth-Ave palazzi, the Beaux-
//  Arts hotels, the Queen-Anne tenements, the Governors-Island Federal houses.
// ===========================================================================

/** OTTO H. KAHN HOUSE (1918, now Convent of the Sacred Heart) — the grandest
 *  surviving Fifth-Ave mansion: an Italian-Renaissance palazzo modelled on a
 *  Florentine cortile — a rusticated grey-limestone block with a strong cornice,
 *  arched ground openings and an interior courtyard. Broad + stately, 2×2 SW. */
function kahnHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#cac4b6'); // grey limestone
  iso.shadow(0.34, 0.56, 1.66, 1.66, 0.2, 0.22);
  iso.box(0.34, 0.5, 1.66, 1.72, 0, 16, GRANITE); // rusticated base
  iso.box(0.38, 0.54, 1.62, 1.68, 16, 70, ST);
  // rusticated coursing on the lower storey
  for (const z of [24, 32, 40] as const) iso.r.line(iso.P(1.62, 0.54, z), iso.P(1.62, 1.68, z), 0.5 * RES, shaded(ST, 0.16));
  // arched ground openings + ranks of windows above
  for (const v of [0.66, 1.0, 1.34] as const) {
    iso.r.poly([iso.P(1.62, v, 18), iso.P(1.62, v + 0.18, 18), iso.P(1.62, v + 0.18, 36), iso.P(1.62, v + 0.09, 44), iso.P(1.62, v, 36)], alpha(GLASS_DK, 0.85));
  }
  gridFace(iso, 'r', 1.62, 0.6, 1.64, 48, 64, 7, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.68, 0.56, 1.6, 48, 64, 6, alpha(GLASS_DK, 0.92));
  // a heavy projecting Florentine cornice + a low pitched roof set back
  iso.box(0.32, 0.48, 1.68, 1.74, 70, 78, lighten(ST, 0.08), { ink: false });
  iso.hip(0.46, 0.62, 1.54, 1.6, 78, 12, LEADROOF);
  return iso.build();
}

/** A grand FIFTH-AVE TOWNHOUSE on its lawn — a 5–6-storey grey-limestone or red-
 *  brick-and-marble mansion with a mansard or hipped roof, dormers, a balustrade
 *  and a columned/arched entrance. Shared by the George F. Baker Houses, the Lucy
 *  Drexel Dahlgren House and the Richard Morris Hunt set (varied by seed). 1×1. */
function fifthAveTownhouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  const brick = seed % 2 === 0;
  const ST = brick ? hex('#a98f7e') : hex('#cdc7b9'); // greyed red-brick / limestone
  const TRIM = hex('#d6d0c2');
  const mansard = seed % 2 === 1;
  iso.shadow(0.28, 0.4, 0.78, 0.76, 0.16, 0.2);
  iso.box(0.34, 0.34, 0.76, 0.8, 0, 46, ST);
  // a marble/stone ground storey
  iso.box(0.34, 0.34, 0.76, 0.8, 0, 12, TRIM, { ink: false });
  // ranks of tall windows with stone surrounds
  gridFace(iso, 'r', 0.76, 0.4, 0.76, 16, 42, 4, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 0.8, 0.38, 0.72, 16, 42, 3, alpha(GLASS_DK, 0.92));
  for (let v = 0.42; v < 0.74; v += 0.1) iso.r.line(iso.P(0.76, v, 14), iso.P(0.76, v, 44), 0.5 * RES, lighten(ST, 0.12));
  // cornice
  iso.box(0.32, 0.32, 0.78, 0.82, 46, 50, lighten(ST, 0.06), { ink: false });
  if (mansard) {
    // a slate mansard with dormers
    iso.hip(0.34, 0.34, 0.76, 0.8, 50, 16, LEADROOF);
    for (let u = 0.42; u < 0.72; u += 0.12) {
      const [dx, dy] = iso.P(u, 0.8, 58);
      iso.r.poly([[dx - 3 * RES, dy], [dx + 3 * RES, dy], [dx + 3 * RES, dy - 5 * RES], [dx - 3 * RES, dy - 5 * RES]], lighten(ST, 0.04));
    }
  } else {
    // a balustraded flat roof
    iso.box(0.36, 0.36, 0.74, 0.78, 50, 56, TRIM, { ink: false });
  }
  return iso.build();
}

/** HOTEL WOLCOTT (1904) — a slim Beaux-Arts hotel: a tall pale-limestone block
 *  with a richly ornamented two-storey base, a plain mid-shaft, an ornate
 *  bracketed top with a heavy cornice. Slim, 2×2 SW + headroom. */
function hotelWolcottTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const ST = hex('#cec9bb');
  iso.shadow(0.36, 0.56, 1.64, 1.62, 0.24, 0.24);
  iso.box(0.4, 0.54, 1.6, 1.7, 0, 30, lighten(ST, 0.04)); // ornate base
  gridFace(iso, 'r', 1.6, 0.46, 1.66, 6, 26, 6, alpha(GLASS_DK, 0.85));
  iso.box(0.46, 0.6, 1.54, 1.62, 30, 150, ST); // plain shaft
  gridFace(iso, 'r', 1.54, 0.66, 1.5, 38, 142, 7, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.62, 0.6, 1.5, 38, 142, 6, alpha(GLASS_DK, 0.92));
  // ornate bracketed top + heavy cornice
  iso.box(0.44, 0.58, 1.56, 1.64, 150, 166, lighten(ST, 0.05));
  gridFace(iso, 'r', 1.56, 0.64, 1.52, 152, 162, 7, alpha(GLASS_DK, 0.85));
  iso.box(0.4, 0.54, 1.6, 1.68, 166, 174, lighten(ST, 0.1), { ink: false });
  return iso.build();
}

/** THE GRAND HOTEL (Broadway, 1868) — a Second-Empire hotel: a buff-grey block
 *  with arched windows, a strong cornice, and a tall slate MANSARD roof with
 *  iron cresting and dormers. 2×2 SW + headroom. */
function grandHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const ST2 = hex('#c4bdac'); // buff-grey
  iso.shadow(0.36, 0.58, 1.64, 1.64, 0.22, 0.22);
  iso.box(0.36, 0.52, 1.64, 1.7, 0, 70, ST2);
  // arched windows in ranks
  for (let z = 14; z < 64; z += 16) {
    for (let v = 0.6; v < 1.62; v += 0.18) {
      iso.r.poly([iso.P(1.64, v, z), iso.P(1.64, v + 0.1, z), iso.P(1.64, v + 0.1, z + 9), iso.P(1.64, v + 0.05, z + 13), iso.P(1.64, v, z + 9)], alpha(GLASS_DK, 0.85));
    }
  }
  // strong cornice + the tall mansard with dormers + iron cresting
  iso.box(0.34, 0.5, 1.66, 1.72, 70, 76, lighten(ST2, 0.07), { ink: false });
  iso.hip(0.38, 0.54, 1.62, 1.68, 76, 30, LEADROOF);
  for (let u = 0.5; u < 1.55; u += 0.22) {
    const [dx, dy] = iso.P(u, 1.7, 88);
    iso.r.poly([[dx - 3.5 * RES, dy], [dx + 3.5 * RES, dy], [dx + 3.5 * RES, dy - 6 * RES], [dx, dy - 10 * RES], [dx - 3.5 * RES, dy - 6 * RES]], lighten(ST2, 0.04));
  }
  // iron cresting ridge
  const [c0x, c0y] = iso.P(0.5, 1.1, 106);
  const [c1x] = iso.P(1.5, 1.1, 106);
  for (let x = c0x; x < c1x; x += 4 * RES) iso.r.line([x, c0y], [x, c0y - 3 * RES], 0.6 * RES, INK);
  return iso.build();
}

/** ASTRAL APARTMENTS (Lamb & Rich, 1886, Greenpoint) — the great Queen-Anne
 *  model-tenement block built for Standard Oil workers: a long buff-brick-and-
 *  terracotta range with bay windows, banded courses, gabled dormers and a busy
 *  picturesque roofline. Broad + low, 3×3 SW. */
function astralApartmentsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#a99a86'); // greyed buff brick
  iso.shadow(0.42, 0.7, 2.58, 2.58, 0.2, 0.22);
  iso.box(0.36, 0.52, 2.64, 2.6, 0, 64, ST);
  // banded terracotta courses
  for (const z of [22, 42] as const) iso.r.line(iso.P(2.64, 0.52, z), iso.P(2.64, 2.6, z), 0.8 * RES, lighten(ST, 0.14));
  // projecting bay windows down the long face (the Queen-Anne rhythm)
  for (let v = 0.7; v < 2.5; v += 0.4) {
    iso.box(2.64, v, 2.74, v + 0.22, 6, 58, lighten(ST, 0.02));
    gridFace(iso, 'r', 2.74, v + 0.03, v + 0.19, 12, 54, 3, alpha(GLASS_DK, 0.9));
  }
  // a steep tiled roof + a row of gabled dormers
  iso.gable(0.36, 0.52, 2.64, 2.6, 64, 22, 'v', hex('#8a5236'), ST);
  for (let u = 0.6; u < 2.5; u += 0.42) {
    const [dx, dy] = iso.P(u, 2.6, 76);
    iso.r.poly([[dx - 4 * RES, dy], [dx + 4 * RES, dy], [dx, dy - 11 * RES]], lighten(ST, 0.04));
    iso.r.polyline([[dx - 4 * RES, dy], [dx, dy - 11 * RES], [dx + 4 * RES, dy]], INK_W * 0.4, INK);
  }
  return iso.build();
}

/** A FEDERAL-era HOUSE on Governors / Roosevelt Island — a trim grey-painted or
 *  buff brick two-storey block with a hipped roof, dormers, end chimneys and a
 *  small classical porch. Shared by Blackwell House and Quarters A (varied by
 *  seed). 1×1, low. */
function federalHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 40 });
  const ST = seed % 2 === 0 ? hex('#c8c4b6') : hex('#b6a78f');
  iso.shadow(0.28, 0.38, 0.78, 0.76, 0.16, 0.2);
  iso.box(0.34, 0.36, 0.76, 0.78, 0, 30, ST);
  // hipped roof + dormers + end chimneys
  iso.hip(0.32, 0.34, 0.78, 0.8, 30, 14, LEADROOF);
  for (let u = 0.42; u < 0.72; u += 0.14) {
    const [dx, dy] = iso.P(u, 0.78, 38);
    iso.r.poly([[dx - 2.5 * RES, dy], [dx + 2.5 * RES, dy], [dx + 2.5 * RES, dy - 4 * RES], [dx - 2.5 * RES, dy - 4 * RES]], lighten(ST, 0.05));
  }
  for (const [u, v] of [[0.4, 0.42], [0.7, 0.72]] as const) iso.box(u - 0.02, v - 0.02, u + 0.02, v + 0.02, 40, 48, GRANITE, { ink: false });
  // small classical entrance porch + shuttered windows
  for (let v = 0.44; v < 0.74; v += 0.12) iso.r.line(iso.P(0.76, v, 2), iso.P(0.76, v, 24), 1.1 * RES, lighten(ST, 0.16));
  gridFace(iso, 'l', 0.78, 0.42, 0.72, 8, 26, 3, alpha(GLASS_DK, 0.85));
  return iso.build();
}

/** HOSTELLING INTERNATIONAL NYC (the former Association Residence / R. Morris
 *  Hunt almshouse, 1883) — a long grey-stone Victorian-Gothic / Châteauesque
 *  block with steep roofs, a corner tower, pointed dormers and tall chimneys.
 *  Broad, 2×2 SW + headroom. */
function hostellingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#b3a997'); // grey stone
  iso.shadow(0.36, 0.58, 1.64, 1.64, 0.22, 0.22);
  iso.box(0.36, 0.5, 1.64, 1.7, 0, 58, ST);
  gridFace(iso, 'r', 1.64, 0.56, 1.66, 12, 52, 9, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 1.7, 0.46, 1.6, 12, 52, 7, alpha(GLASS_DK, 0.92));
  // steep roof + pointed dormers
  iso.gable(0.36, 0.5, 1.64, 1.7, 58, 24, 'v', LEADROOF, ST);
  for (let u = 0.5; u < 1.55; u += 0.28) {
    const [dx, dy] = iso.P(u, 1.7, 70);
    iso.r.poly([[dx - 3.5 * RES, dy], [dx + 3.5 * RES, dy], [dx, dy - 10 * RES]], lighten(ST, 0.04));
    iso.r.polyline([[dx - 3.5 * RES, dy], [dx, dy - 10 * RES], [dx + 3.5 * RES, dy]], INK_W * 0.4, INK);
  }
  // a corner tower with a tall conical cap (the Châteauesque accent)
  const tu = 1.58;
  const tv = 1.66;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, 76, ST);
  gridFace(iso, 'l', tv + 0.1, tu - 0.08, tu + 0.08, 14, 68, 2, alpha(GLASS_DK, 0.9));
  needle(iso, tu, tv, 76, 34, 3.4 * RES, LEADROOF, GOLDLEAF);
  // tall chimneys
  for (const [u, v] of [[0.5, 0.6], [1.0, 1.0]] as const) iso.box(u - 0.03, v - 0.03, u + 0.03, v + 0.03, 58, 82, hex('#7a5240'), { ink: false });
  return iso.build();
}

// ===========================================================================
//  ROUND-2 HARBOR FLEET — the museum ships moored along the rivers. Drab navy
//  grey hulls; the carrier is a MONSTER, the tall ship a forest of masts.
// ===========================================================================

/** USS INTREPID — the WWII Essex-class aircraft carrier, now the Intrepid Sea,
 *  Air & Space Museum at Pier 86: a vast battleship-grey hull, the long flat
 *  flight deck with parked aircraft, the starboard ISLAND superstructure with
 *  its mast and radar, and the angled deck. A monster — it dwarfs the pier.
 *  5×5 SW + headroom; the unmistakable carrier silhouette. */
function intrepidTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 130 });
  void seed;
  const HULL = hex('#6b7178'); // battleship grey
  const HULL_D = hex('#4e545b');
  const DECK = hex('#4a4f55'); // dark deck
  iso.shadow(0.5, 1.1, 4.6, 4.5, 0.3, 0.22);
  // the water the ship sits in (a sliver, so it reads as moored)
  iso.quad(0.4, 0.5, 4.7, 4.7, 0, shaded(COLORS.water, 0.05));
  // the great hull — a long grey block, the bow tapering toward high v (front)
  const u0 = 0.7;
  const u1 = 4.5;
  iso.box(u0, 1.0, u1, 3.9, 0, 34, HULL, { leftC: HULL_D, rightC: lit(HULL, 0.04), topC: DECK });
  // the bow taper (a wedge added at the front, v>3.9)
  iso.r.poly([iso.P(u0, 3.9, 0), iso.P(u1, 3.9, 0), iso.P((u0 + u1) / 2, 4.4, 0), iso.P((u0 + u1) / 2, 4.4, 30), iso.P(u1, 3.9, 34), iso.P(u0, 3.9, 34)], HULL);
  iso.r.poly([iso.P(u0, 3.9, 34), iso.P(u1, 3.9, 34), iso.P((u0 + u1) / 2, 4.4, 30)], DECK); // deck point
  // the flight deck top surface, with the painted centreline + landing stripes
  iso.quad(u0, 1.0, u1, 3.9, 34, DECK);
  for (let v = 1.2; v < 3.8; v += 0.4) iso.r.line(iso.P((u0 + u1) / 2 - 0.4, v, 34.5), iso.P((u0 + u1) / 2 + 0.4, v, 34.5), 1.2 * RES, alpha(COLORS.marking, 0.5));
  // the angled deck stripe (the carrier's signature offset runway)
  iso.r.line(iso.P(u0 + 0.4, 1.4, 34.6), iso.P(u1 - 0.9, 3.6, 34.6), 1.4 * RES, alpha(hex('#d8d2bf'), 0.6));
  // hull portholes / catwalk line
  for (let v = 1.1; v < 3.8; v += 0.3) iso.r.line(iso.P(u1, v, 14), iso.P(u1, v + 0.1, 14), 0.8 * RES, alpha(hex('#2a2e33'), 0.7));
  // the starboard ISLAND superstructure (toward the viewer, right side)
  const iu = u1 - 0.5;
  const iv = 2.4;
  iso.box(iu - 0.4, iv - 0.5, iu + 0.1, iv + 0.5, 34, 78, HULL, { leftC: HULL_D });
  gridFace(iso, 'r', iu + 0.1, iv - 0.42, iv + 0.42, 40, 72, 5, alpha(hex('#1c2026'), 0.85));
  iso.box(iu - 0.3, iv - 0.3, iu - 0.05, iv + 0.3, 78, 90, HULL_D); // the bridge top
  // the lattice mast + radar dish + antennae rising from the island
  const [mx, my] = iso.P(iu - 0.18, iv, 90);
  iso.r.line([mx, my], [mx, my - 30 * RES], 1.4 * RES, hex('#3a3e44'));
  iso.r.line([mx - 5 * RES, my - 12 * RES], [mx + 5 * RES, my - 12 * RES], 0.8 * RES, hex('#3a3e44')); // yardarm
  iso.r.poly([[mx - 1 * RES, my - 24 * RES], [mx + 7 * RES, my - 27 * RES], [mx + 7 * RES, my - 21 * RES], [mx - 1 * RES, my - 18 * RES]], hex('#55595f')); // radar
  // a couple of parked aircraft on the deck (tiny swept silhouettes)
  const jet = (ju: number, jv: number): void => {
    iso.box(ju - 0.2, jv - 0.05, ju + 0.2, jv + 0.05, 34, 40, hex('#7f858c'), { topC: hex('#9aa0a7') });
    const [tx, ty] = iso.P(ju - 0.18, jv, 40);
    iso.r.poly([[tx, ty], [tx + 4 * RES, ty], [tx + 5 * RES, ty - 8 * RES], [tx + 2 * RES, ty - 8 * RES]], hex('#6b7178')); // tail-fin
    const [wx, wy] = iso.P(ju, jv + 0.05, 37);
    iso.r.poly([[wx, wy], [wx - 11 * RES, wy + 5 * RES], [wx - 8 * RES, wy + 6 * RES], [wx + 3 * RES, wy + 1 * RES]], hex('#888e95')); // wing
  };
  jet(1.5, 1.7);
  jet(2.3, 2.5);
  jet(3.1, 1.9);
  return iso.build();
}

/** A moored HISTORIC SHIP — a dark hull at the quay with a deckhouse and tall
 *  masts + rigging. Shared by WAVERTREE (a great iron square-rigger, three tall
 *  masts) and AMBROSE (the red lightship, one mast + lantern) — distinguished by
 *  seed (mast count, hull colour, the lightship lantern). 2×2 SW + headroom. */
function historicShipTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 220 });
  const lightship = seed % 2 === 1; // Ambrose = the red lightship
  const HULL = lightship ? hex('#8c4a3c') : hex('#3c4047'); // red lightship / black iron hull
  const HULL_D = darken(HULL, 0.18);
  const DECK = hex('#7a6a4e'); // timber deck
  const MAST = hex('#5a4632');
  iso.shadow(0.4, 0.62, 1.62, 1.58, 0.26, 0.22);
  // the water sliver
  iso.quad(0.34, 0.46, 1.7, 1.7, 0, shaded(COLORS.water, 0.05));
  // the long hull, the bow toward high v (front), with a sheer line
  const u0 = 0.5;
  const u1 = 1.5;
  iso.box(u0, 0.7, u1, 1.5, 0, 26, HULL, { leftC: HULL_D, rightC: lit(HULL, 0.05), topC: DECK });
  // bow wedge
  iso.r.poly([iso.P(u0, 1.5, 0), iso.P(u1, 1.5, 0), iso.P((u0 + u1) / 2, 1.78, 0), iso.P((u0 + u1) / 2, 1.78, 22), iso.P(u1, 1.5, 26), iso.P(u0, 1.5, 26)], HULL);
  iso.r.poly([iso.P(u0, 1.5, 26), iso.P(u1, 1.5, 26), iso.P((u0 + u1) / 2, 1.78, 22)], DECK);
  // a white waterline / boot-stripe
  iso.r.line(iso.P(u1, 0.72, 6), iso.P(u1, 1.48, 6), 1 * RES, alpha(hex('#d8d2bf'), 0.7));
  // the deckhouse
  iso.box(0.74, 0.92, 1.26, 1.28, 26, 42, lightship ? lighten(HULL, 0.1) : hex('#b9b3a4'));
  gridFace(iso, 'r', 1.26, 0.98, 1.22, 30, 38, 4, alpha(GLASS_LIT, 0.5));
  if (lightship) {
    // the single mast with the great lantern cage (the lightship beacon)
    const [mx, my] = iso.P(1.0, 1.1, 42);
    iso.r.line([mx, my], [mx, my - 70 * RES], 1.8 * RES, MAST);
    iso.r.poly([[mx - 4 * RES, my - 40 * RES], [mx + 4 * RES, my - 40 * RES], [mx + 4 * RES, my - 52 * RES], [mx - 4 * RES, my - 52 * RES]], alpha(hex('#ffe6a0'), 0.85)); // lit lantern
    iso.r.polyline([[mx - 4 * RES, my - 40 * RES], [mx - 4 * RES, my - 52 * RES], [mx + 4 * RES, my - 52 * RES], [mx + 4 * RES, my - 40 * RES]], 0.7 * RES, INK);
  } else {
    // three tall masts with yards + furled-sail rigging (the square-rigger)
    for (const [mu, mh] of [[0.78, 150], [1.02, 168], [1.26, 138]] as const) {
      const [mx, my] = iso.P(mu, 1.1, 42);
      iso.r.line([mx, my], [mx, my - mh * RES], 1.6 * RES, MAST);
      // yardarms (horizontal spars) at three heights
      for (const f of [0.45, 0.66, 0.85]) {
        const yy = my - mh * RES * f;
        iso.r.line([mx - 9 * RES, yy], [mx + 9 * RES, yy], 0.9 * RES, MAST);
      }
      iso.r.line([mx, my], [mx, my - mh * RES], 0.5 * RES, alpha(hex('#cdbf9e'), 0.5)); // glint
    }
    // forestay/backstay rigging from the bowsprit to the tallest masthead
    const [bx, by] = iso.P(1.0, 1.78, 26);
    const [topx, topy] = iso.P(1.02, 1.1, 42);
    iso.r.line([bx, by], [topx, topy - 168 * RES], 0.5 * RES, alpha(INK, 0.5));
    const [sternx, sterny] = iso.P(1.0, 0.72, 26);
    iso.r.line([sternx, sterny], [topx, topy - 168 * RES], 0.5 * RES, alpha(INK, 0.45));
  }
  return iso.build();
}

/** FIREBOAT JOHN J. HARVEY (1931) — the preserved red FDNY fireboat: a low red
 *  hull with a white deckhouse, a tall funnel and the water-cannon monitors that
 *  throw great arcs. Moored at Pier 66. 2×2 SW + a little headroom. */
function fireboatTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const HULL = hex('#a23c30'); // FDNY red (greyed a touch)
  const HULL_D = darken(HULL, 0.18);
  const WHITE = hex('#d6d0c2');
  iso.shadow(0.4, 0.62, 1.62, 1.58, 0.22, 0.22);
  iso.quad(0.34, 0.46, 1.7, 1.7, 0, shaded(COLORS.water, 0.05));
  // low hull, bow to front
  const u0 = 0.52;
  const u1 = 1.48;
  iso.box(u0, 0.74, u1, 1.46, 0, 20, HULL, { leftC: HULL_D, rightC: lit(HULL, 0.05), topC: hex('#6b6452') });
  iso.r.poly([iso.P(u0, 1.46, 0), iso.P(u1, 1.46, 0), iso.P((u0 + u1) / 2, 1.74, 0), iso.P((u0 + u1) / 2, 1.74, 16), iso.P(u1, 1.46, 20), iso.P(u0, 1.46, 20)], HULL);
  // white superstructure (two tiers) + wheelhouse
  iso.box(0.74, 0.9, 1.26, 1.3, 20, 38, WHITE);
  gridFace(iso, 'r', 1.26, 0.96, 1.24, 24, 34, 4, alpha(GLASS_DK, 0.85));
  iso.box(0.84, 1.0, 1.16, 1.2, 38, 50, lighten(WHITE, 0.04));
  // the tall black funnel
  iso.box(0.96, 1.04, 1.08, 1.16, 50, 66, hex('#3a3e44'));
  // water-cannon monitors (little nozzles) up on the deckhouse
  for (const [u, v] of [[0.8, 0.96], [1.2, 1.24]] as const) {
    const [nx, ny] = iso.P(u, v, 50);
    iso.r.line([nx, ny], [nx + 7 * RES, ny - 7 * RES], 1.2 * RES, hex('#888e95'));
  }
  return iso.build();
}

// ===========================================================================
//  ROUND-2 SCULPTURES, FOUNTAINS, CLOCKS & MONUMENTS — small focal pieces.
// ===========================================================================

/** THE SPHERE (Fritz Koenig, 1971) — the great bronze GLOBE that stood between
 *  the Twin Towers, damaged on 9/11 and now a memorial in Liberty Park: a tall
 *  battered metal sphere of riveted bronze gores on a low granite base, with a
 *  memorial flame. Its globe is unmistakable. 1×1 + headroom. */
function sphereTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const BRZ = hex('#8a7a52'); // weathered bronze
  const BRZ_D = hex('#6a5d3e');
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.16, cv - 0.06, cu + 0.16, cv + 0.14, 0.16, 0.2);
  // low granite plinth
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 10, GRANITE);
  // the great sphere — a faceted bronze ball (sun side bright, dusk side cool)
  const [bx, byB] = iso.P(cu, cv, 10);
  const R = 0.34 * (CELL_W / 2);
  const ZR = R * 1.02;
  const cy = byB - ZR - 2 * RES;
  const ball = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([bx + Math.cos(a) * R * s, cy + Math.sin(a) * ZR * s]);
    }
    return pts;
  };
  iso.r.poly(ball(1), shaded(BRZ, 0.08));
  iso.r.polyline(ball(1), INK_W * 0.7, INK, true);
  // lit facet toward upper-right
  const lit2 = ball(0.6).map(([x, y]): Pt => [x + R * 0.22, y - ZR * 0.24]);
  iso.r.poly(lit2, lit(BRZ, 0.12));
  // the riveted gore seams (meridians, bowing out at the equator) + an equator
  for (const k of [-0.66, -0.33, 0.33, 0.66]) {
    iso.r.polyline([[bx + k * R, cy - ZR], [bx + k * R * 0.55, cy], [bx + k * R, cy + ZR]], 0.6 * RES, alpha(BRZ_D, 0.7));
  }
  iso.r.line([bx - R, cy], [bx + R, cy], 0.6 * RES, alpha(BRZ_D, 0.7)); // equator
  // a battered gash (the damage) + the small memorial flame at the base
  iso.r.poly([[bx + R * 0.2, cy - ZR * 0.3], [bx + R * 0.5, cy], [bx + R * 0.3, cy + ZR * 0.2]], darken(BRZ_D, 0.15));
  const [fx, fy] = iso.P(cu + 0.2, cv + 0.1, 10);
  iso.r.poly([[fx, fy], [fx - 2 * RES, fy - 6 * RES], [fx, fy - 9 * RES], [fx + 2 * RES, fy - 6 * RES]], alpha(hex('#ffcf6a'), 0.9)); // flame
  return iso.build();
}

/** A bronze STATUE / MONUMENT GROUP on a stone pedestal — a figure (or group)
 *  in dark bronze atop a granite plinth, sometimes with steps. Shared by the
 *  Women's Rights Pioneers Monument (three figures + a table), the Triumph of
 *  the Human Spirit (a tall abstract Noguchi-esque granite form), the Verdi
 *  Monument (a figure on a tall column) — varied by seed. 1×1. */
function monumentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  const mode = seed % 3; // 0 figure-group, 1 abstract granite form, 2 figure-on-column
  const BRZ = hex('#5d6b54'); // weathered bronze-green
  const GR = hex('#9a948a'); // granite pedestal
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.14, cv - 0.06, cu + 0.14, cv + 0.12, 0.16, 0.2);
  if (mode === 1) {
    // Triumph of the Human Spirit — a tall black-granite abstract antelope/canoe
    // form on a low base, rising in a sweeping curve.
    iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 8, GR);
    const GRAN = hex('#3f4348');
    const [bx, byB] = iso.P(cu, cv, 8);
    iso.r.poly([
      [bx - 4 * RES, byB], [bx + 4 * RES, byB], [bx + 9 * RES, byB - 40 * RES],
      [bx + 2 * RES, byB - 64 * RES], [bx - 3 * RES, byB - 58 * RES], [bx + 1 * RES, byB - 36 * RES], [bx - 6 * RES, byB - 16 * RES],
    ], shaded(GRAN, 0.06), lit(GRAN, 0.06));
    iso.r.polyline([
      [bx - 4 * RES, byB], [bx + 9 * RES, byB - 40 * RES], [bx + 2 * RES, byB - 64 * RES], [bx - 3 * RES, byB - 58 * RES],
    ], INK_W * 0.6, INK);
    return iso.build();
  }
  if (mode === 2) {
    // Verdi — a bronze figure standing on a tall granite column with a base
    iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, 0, 12, GR);
    iso.box(cu - 0.07, cv - 0.07, cu + 0.07, cv + 0.07, 12, 54, lighten(GR, 0.04));
    // small figures at the column base (the opera characters)
    for (const du of [-0.1, 0.1]) {
      const [px, py] = iso.P(cu + du, cv + 0.1, 12);
      iso.r.line([px, py], [px, py - 8 * RES], 1.6 * RES, BRZ);
    }
    const [sx, sy] = iso.P(cu, cv, 54);
    iso.r.line([sx, sy], [sx, sy - 14 * RES], 2.2 * RES, BRZ); // the figure
    iso.r.poly([[sx - 3 * RES, sy - 12 * RES], [sx + 3 * RES, sy - 12 * RES], [sx, sy - 18 * RES]], BRZ);
    return iso.build();
  }
  // mode 0 — a figure GROUP on a broad low pedestal (Women's Rights Pioneers)
  iso.box(cu - 0.18, cv - 0.14, cu + 0.18, cv + 0.16, 0, 14, GR);
  iso.box(cu - 0.18, cv - 0.14, cu + 0.18, cv + 0.16, 0, 4, lighten(GR, 0.06), { ink: false });
  for (const du of [-0.12, 0, 0.12]) {
    const [px, py] = iso.P(cu + du, cv, 14);
    iso.r.line([px, py], [px, py - 13 * RES], 2 * RES, BRZ);
    iso.r.poly([[px - 2.4 * RES, py - 11 * RES], [px + 2.4 * RES, py - 11 * RES], [px, py - 16 * RES]], BRZ);
  }
  return iso.build();
}

/** A granite MEMORIAL OBELISK / shaft on a stepped base — a slim tapering grey
 *  granite needle with a small cap, the kind that marks a square. Shared by the
 *  General Worth Monument (a true obelisk over a tomb) and similar shafts. 1×1
 *  + headroom; an aerial beacon tips it. */
function memorialObeliskTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const GR = hex('#9d958a');
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.12, cv - 0.06, cu + 0.12, cv + 0.12, 0.16, 0.2);
  // a railed stepped base
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 10, GRANITE);
  iso.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, 10, 22, lighten(GRANITE, 0.04));
  // the tapering shaft
  const w0 = 0.055;
  const w1 = 0.03;
  const Z0 = 22;
  const Z1 = 118;
  iso.r.poly([iso.P(cu - w0, cv + w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], shaded(GR, 0.08));
  iso.r.poly([iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1), iso.P(cu + w1, cv - w1, Z1)], lit(GR, 0.08));
  iso.r.poly([iso.P(cu - w1, cv - w1, Z1), iso.P(cu + w1, cv - w1, Z1), iso.P(cu + w1, cv + w1, Z1), iso.P(cu - w1, cv + w1, Z1)], top(GR, 0.18));
  iso.edge(iso.P(cu - w0, cv + w0, Z0), iso.P(cu - w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv + w0, Z0), iso.P(cu + w1, cv + w1, Z1));
  iso.edge(iso.P(cu + w0, cv - w0, Z0), iso.P(cu + w1, cv - w1, Z1));
  // a small pyramidion cap
  const apex = iso.P(cu, cv, Z1 + 12);
  iso.r.poly([iso.P(cu - w1, cv + w1, Z1), iso.P(cu + w1, cv + w1, Z1), apex], shaded(GR, 0.06));
  iso.r.poly([iso.P(cu + w1, cv - w1, Z1), iso.P(cu + w1, cv + w1, Z1), apex], lit(GR, 0.08));
  iso.r.polyline([iso.P(cu - w1, cv + w1, Z1), apex, iso.P(cu + w1, cv - w1, Z1)], INK_W * 0.5, INK);
  return iso.build();
}

/** A SCULPTED MEMORIAL FOUNTAIN — a low circular granite basin with a central
 *  bronze figure/pedestal and a thin water jet. Shared by the Burnett Memorial
 *  Fountain (the Secret-Garden children) and similar. 1×1, low. */
function fountainTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 50 });
  void seed;
  const ST = hex('#bdb6a6');
  const cu = 0.5;
  const cv = 0.52;
  const [cx, cyB] = iso.P(cu, cv, 0);
  iso.shadow(cu - 0.2, cv - 0.1, cu + 0.2, cv + 0.16, 0.14, 0.18);
  // the circular basin (an ellipse ring)
  const R = 0.32 * (CELL_W / 2);
  const ring = (rad: number, zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rad, cyB - zPx + Math.sin(a) * rad * 0.5]);
    }
    return pts;
  };
  iso.r.poly([...ring(R, 0), ...ring(R, 8 * RES).reverse()], shaded(ST, 0.06), lit(ST, 0.06)); // basin wall
  iso.r.poly(ring(R * 0.86, 8 * RES), alpha(COLORS.water, 0.7)); // the water surface
  iso.r.polyline(ring(R, 8 * RES), INK_W * 0.6, INK, true);
  // the central bronze pedestal + figure + a thin jet
  iso.box(cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04, 8, 22, lighten(ST, 0.04));
  const [sx, sy] = iso.P(cu, cv, 22);
  iso.r.line([sx, sy], [sx, sy - 9 * RES], 1.6 * RES, hex('#5d6b54'));
  iso.r.line([sx, sy - 9 * RES], [sx, sy - 16 * RES], 0.7 * RES, alpha(COLORS.waterGlint, 0.7)); // jet
  return iso.build();
}

/** THE DELACORTE MUSICAL CLOCK (Central Park Zoo, 1965) — the beloved bronze
 *  glockenspiel: a stone-and-bronze arch carrying a clock, surmounted by a band
 *  of dancing bronze ANIMAL musicians, with two bronze monkeys striking a bell
 *  on top. Small, charming, 1×1 + headroom. */
function delacorteClockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const ST = hex('#bdb6a6'); // brick-and-stone pier
  const BRZ = hex('#5d6b54'); // bronze
  const cu = 0.5;
  const cv = 0.52;
  iso.shadow(cu - 0.18, cv - 0.08, cu + 0.18, cv + 0.14, 0.16, 0.2);
  // the two stone piers carrying the arch
  iso.box(cu - 0.18, cv - 0.04, cu - 0.1, cv + 0.06, 0, 40, ST);
  iso.box(cu + 0.1, cv - 0.04, cu + 0.18, cv + 0.06, 0, 40, ST);
  // the arch spanning between them (a band) with the clock dial
  iso.box(cu - 0.18, cv - 0.04, cu + 0.18, cv + 0.06, 40, 50, lighten(ST, 0.04));
  const [dx, dy] = iso.P(cu, cv + 0.06 + 0.004, 38);
  const cr = 6 * RES;
  const dial: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    dial.push([dx + Math.cos(a) * cr, dy + Math.sin(a) * cr]);
  }
  iso.r.poly(dial, DIALSTONE);
  iso.r.polyline(dial, INK_W * 0.5, INK, true);
  iso.r.line([dx, dy], [dx + cr * 0.5, dy - cr * 0.3], 0.9 * RES, INK);
  iso.r.line([dx, dy], [dx, dy - cr * 0.6], 0.9 * RES, INK);
  // the band of dancing bronze animal musicians on the arch top
  for (const du of [-0.13, -0.04, 0.05, 0.14]) {
    const [px, py] = iso.P(cu + du, cv, 50);
    iso.r.line([px, py], [px, py - 7 * RES], 1.4 * RES, BRZ);
    iso.r.poly([[px - 1.6 * RES, py - 6 * RES], [px + 1.6 * RES, py - 6 * RES], [px, py - 9 * RES]], BRZ);
  }
  // the two monkeys + the bell on the very top
  const [bx, by] = iso.P(cu, cv, 64);
  iso.r.poly([[bx - 3 * RES, by], [bx + 3 * RES, by], [bx + 2 * RES, by - 5 * RES], [bx - 2 * RES, by - 5 * RES]], hex('#7a6f4a')); // bell
  return iso.build();
}

// ===========================================================================
//  ROUND-2 CIVIC / MUSEUM / SPECIAL — the flagged museums, the historic bar,
//  the heliport pier.
// ===========================================================================

/** STONEWALL INN (1843/1930) — the historic Greenwich-Village tavern, birthplace
 *  of the gay-rights movement: a low two-storey brick row building with the
 *  arched storefront, the famous frontage and the rainbow flags. Small, warm-lit,
 *  1×1. (Its rainbow flags are the one colour note in the drab gamut.) */
function stonewallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 40 });
  void seed;
  const BK = hex('#9a8d7c'); // greyed brick
  iso.shadow(0.28, 0.4, 0.78, 0.78, 0.16, 0.2);
  iso.box(0.34, 0.36, 0.78, 0.82, 0, 30, BK);
  // the arched ground-floor storefront (warm-lit windows — the bar inside)
  for (const v of [0.44, 0.6] as const) {
    iso.r.poly([iso.P(0.78, v, 4), iso.P(0.78, v + 0.12, 4), iso.P(0.78, v + 0.12, 16), iso.P(0.78, v + 0.06, 20), iso.P(0.78, v, 16)], alpha(hex('#ffcf7a'), 0.8));
  }
  // upper windows
  gridFace(iso, 'r', 0.78, 0.42, 0.78, 20, 28, 3, alpha(GLASS_DK, 0.85));
  iso.box(0.32, 0.34, 0.8, 0.84, 30, 34, lighten(BK, 0.06), { ink: false }); // cornice
  // the rainbow flags flying from the facade (the colour note)
  const stripes = [hex('#e23b3b'), hex('#e2873b'), hex('#e2d23b'), hex('#3ba84e'), hex('#3b6fe2'), hex('#8a3be2')] as const;
  for (const [u, vbase] of [[0.6, 0.84], [0.74, 0.84]] as const) {
    const [fx, fy] = iso.P(u, vbase, 30);
    iso.r.line([fx, fy], [fx + 2 * RES, fy - 14 * RES], 0.8 * RES, INK); // pole
    for (let s = 0; s < stripes.length; s++) {
      const yy = fy - 13 * RES + s * 1.6 * RES;
      iso.r.line([fx + 2 * RES, yy], [fx + 10 * RES, yy + 1 * RES], 1.4 * RES, stripes[s]!);
    }
  }
  return iso.build();
}

/** A landmark ROWHOUSE / small museum building — a grey-brick Italianate or
 *  Federal row block with a stoop, cornice and ranks of windows. Shared by the
 *  Lower East Side Tenement Museum, the Yeshiva University Museum and the
 *  Museum of the Moving Image (varied by seed). 1×1, low. */
function rowhouseMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  const palette = [hex('#a4937e'), hex('#bdb6a6'), hex('#c8c3b6')] as const;
  const ST = palette[seed % 3]!;
  const tall = 40 + (seed % 3) * 8;
  iso.shadow(0.28, 0.4, 0.78, 0.78, 0.16, 0.2);
  iso.box(0.34, 0.36, 0.78, 0.82, 0, tall, ST);
  // ranks of windows (tenement rhythm) + a cornice
  gridFace(iso, 'r', 0.78, 0.42, 0.78, 8, tall - 6, 4, alpha(GLASS_DK, 0.9));
  gridFace(iso, 'l', 0.82, 0.4, 0.74, 8, tall - 6, 3, alpha(GLASS_DK, 0.92));
  iso.box(0.32, 0.34, 0.8, 0.84, tall, tall + 4, lighten(ST, 0.07), { ink: false });
  // a stoop on the show face
  const [sx, sy] = iso.P(0.78, 0.6, 0);
  iso.r.poly([[sx, sy], [sx + 7 * RES, sy + 3 * RES], [sx + 7 * RES, sy - 4 * RES], [sx, sy - 8 * RES]], shaded(ST, 0.1));
  return iso.build();
}

/** STOREFRONT FOR ART AND ARCHITECTURE (Acconci & Holl, 1993) — the famous
 *  experimental gallery on Kenmare St: a razor-thin triangular grey façade
 *  whose wall PIVOTS open in hinged concrete-and-fibreboard panels. A very
 *  narrow, very flat wedge — quirky. 1×1, low. */
function storefrontTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 50 });
  void seed;
  const ST = hex('#b8b2a4'); // grey fibreboard/concrete
  iso.shadow(0.3, 0.42, 0.76, 0.74, 0.14, 0.18);
  // a long thin low wall (the gallery is essentially a façade)
  iso.box(0.3, 0.56, 0.78, 0.66, 0, 32, ST);
  // the hinged pivoting panels — a grid of rectangles, some kicked out at angles
  const [wx0, wy0] = iso.P(0.78, 0.58, 4);
  const [wx1] = iso.P(0.78, 0.66, 4);
  let x = wx0;
  const dx = (wx1 - wx0) / 5;
  for (let i = 0; i < 5; i++) {
    const kick = i % 2 === 0 ? -3 * RES : 0; // alternate panels pivot out
    iso.r.poly([[x, wy0], [x + dx * 0.85, wy0 + kick], [x + dx * 0.85, wy0 - 22 * RES + kick], [x, wy0 - 22 * RES]], i % 2 === 0 ? lit(ST, 0.06) : shaded(ST, 0.08));
    iso.r.polyline([[x, wy0], [x + dx * 0.85, wy0 + kick], [x + dx * 0.85, wy0 - 22 * RES + kick], [x, wy0 - 22 * RES]], 0.6 * RES, alpha(INK, 0.7));
    x += dx;
  }
  return iso.build();
}

/** WEST 30TH STREET HELIPORT — the Hudson-River-edge heliport: a low concrete
 *  pier deck with the big circular "H" helipad, perimeter lights, a windsock and
 *  a parked helicopter. Reads as an airfield-on-the-water. 2×2 SW, low. */
function heliportTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const cu = 1.0;
  const cv = 1.1;
  iso.shadow(0.4, 0.7, 1.6, 1.55, 0.16, 0.18);
  // the water + the concrete pier deck
  iso.quad(0.3, 0.5, 1.7, 1.7, 0, shaded(COLORS.water, 0.05));
  iso.box(0.4, 0.6, 1.6, 1.6, 0, 8, COLORS.concrete, { topC: lighten(COLORS.concrete, 0.06) });
  // the big painted helipad circle + "H"
  const [cx, cyB] = iso.P(cu, cv, 8.5);
  const R = 0.42 * (CELL_W / 2);
  const ring: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ring.push([cx + Math.cos(a) * R, cyB + Math.sin(a) * R * 0.5]);
  }
  iso.r.polyline(ring, 1.4 * RES, alpha(COLORS.marking, 0.8), true);
  // the H
  iso.r.line([cx - 5 * RES, cyB - 4 * RES], [cx - 5 * RES, cyB + 4 * RES], 1.6 * RES, alpha(COLORS.marking, 0.85));
  iso.r.line([cx + 5 * RES, cyB - 4 * RES], [cx + 5 * RES, cyB + 4 * RES], 1.6 * RES, alpha(COLORS.marking, 0.85));
  iso.r.line([cx - 5 * RES, cyB], [cx + 5 * RES, cyB], 1.6 * RES, alpha(COLORS.marking, 0.85));
  // a small parked helicopter (a pod + tail boom + rotor disc) toward a corner
  const hu = 0.7;
  const hv = 0.8;
  iso.box(hu - 0.12, hv - 0.08, hu + 0.12, hv + 0.08, 8, 20, STEEL_GLASS, { topC: lighten(STEEL_GLASS, 0.08) });
  const [tx, ty] = iso.P(hu - 0.12, hv, 14);
  iso.r.line([tx, ty], [tx - 16 * RES, ty - 2 * RES], 1.6 * RES, STEEL_GLASS_D); // tail boom
  const [rx, ry] = iso.P(hu, hv, 20);
  iso.r.line([rx - 16 * RES, ry - 1 * RES], [rx + 16 * RES, ry - 1 * RES], 0.7 * RES, alpha(INK, 0.6)); // rotor
  // a windsock pole at the deck edge
  const [px, py] = iso.P(1.5, 0.7, 8);
  iso.r.line([px, py], [px, py - 16 * RES], 0.8 * RES, INK);
  iso.r.poly([[px, py - 16 * RES], [px + 9 * RES, py - 14 * RES], [px + 9 * RES, py - 11 * RES], [px, py - 12 * RES]], alpha(COLORS.orange, 0.8)); // sock
  return iso.build();
}

// ===========================================================================
//  THE WORLD-FAMOUS ICONS — round 3. The signature New York silhouettes the
//  earlier rounds left out: One WTC, the Statue of Liberty, the Brooklyn
//  Bridge, Grand Central, 30 Rock, the Met / Whitney / Frick, MetLife,
//  432 Park, Hudson Yards (the Vessel + 30 HY), Lincoln Center, the UN
//  Secretariat slab, Yankee Stadium, and the Coney Island Wonder Wheel +
//  Parachute Jump. All drab-grey, slim+tall on headroom, each its own light.
// ===========================================================================

/** ONE WORLD TRADE CENTER (2014, 541 m / 1776 ft) — the tapered glass obelisk
 *  of Lower Manhattan: a square antiprism whose plan rotates from a square base
 *  to a square top turned 45°, so the eight elevations read as long isosceles
 *  triangles of cool grey curtain-wall glass, capped by a square parapet and the
 *  tall mast/spire with its beacon. Slim 2×2 on huge headroom — it spikes far
 *  above the Financial District. */
function oneWtcTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 560 });
  void seed;
  const GL = STEEL_GLASS;
  const GL_D = STEEL_GLASS_D;
  const GL_L = lighten(STEEL_GLASS, 0.12);
  iso.shadow(0.34, 0.52, 1.66, 1.62, 0.3, 0.26);
  // granite podium (the blast-resistant base) spanning the block
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 30, GRANITE, { topC: lighten(GRANITE, 0.06) });
  // ---- the tapered antiprism shaft. Base square (z30) is axis-aligned; the
  //      top square (z440) is rotated 45° and smaller. We draw the two visible
  //      faces as the long tapering triangle-pair chamfers that give 1WTC its
  //      unmistakable twisting-obelisk read.
  const Zb = 30;
  const Zt = 440;
  const cu = 1.0;
  const cv = 1.05;
  const wb = 0.5; // base half-width (square)
  const wt = 0.2; // top half-width
  // base corners (square) and top corners (rotated 45°, i.e. mid-edge points)
  const bR = [cu + wb, cv - wb] as const; // right base corner (toward sun)
  const bF = [cu + wb, cv + wb] as const; // front/near base corner
  const bL = [cu - wb, cv + wb] as const; // left base corner
  const bB = [cu - wb, cv - wb] as const; // back base corner
  // top square rotated 45° → its corners sit over the base EDGE midpoints
  const tRf = [cu + wt, cv] as const; // top corner over the right edge mid
  const tF = [cu, cv + wt] as const; // top corner over the front edge mid
  const tL = [cu - wt, cv] as const; // top corner over the left edge mid
  // RIGHT elevation (sun-lit): a tall chamfered ribbon from base corner bR up
  // and the two triangular facets meeting the rotated top corners.
  iso.r.poly([iso.P(bF[0], bF[1], Zb), iso.P(bR[0], bR[1], Zb), iso.P(tRf[0], tRf[1], Zt), iso.P(tF[0], tF[1], Zt)], lit(GL, 0.04), GL_L);
  // LEFT elevation (dusk-shaded)
  iso.r.poly([iso.P(bL[0], bL[1], Zb), iso.P(bF[0], bF[1], Zb), iso.P(tF[0], tF[1], Zt), iso.P(tL[0], tL[1], Zt)], shaded(GL, 0.06), GL_D);
  // the chamfer slivers on the back two faces, just visible past the silhouette
  iso.r.poly([iso.P(bR[0], bR[1], Zb), iso.P(bB[0], bB[1], Zb), iso.P(tL[0], tL[1], Zt), iso.P(tRf[0], tRf[1], Zt)], shaded(GL, 0.16));
  // mullion grid up the two big visible facets (thin vertical glass piers)
  for (let i = 1; i < 9; i++) {
    const f = i / 9;
    // right facet: interpolate base-edge → top corner
    const xb = bF[0] + (bR[0] - bF[0]) * f, yb = bF[1] + (bR[1] - bF[1]) * f;
    const xt = tF[0] + (tRf[0] - tF[0]) * f, yt = tF[1] + (tRf[1] - tF[1]) * f;
    iso.r.line(iso.P(xb, yb, Zb + 6), iso.P(xt, yt, Zt - 4), 0.6 * RES, alpha(GL_L, 0.5));
    const xb2 = bL[0] + (bF[0] - bL[0]) * f, yb2 = bL[1] + (bF[1] - bL[1]) * f;
    const xt2 = tL[0] + (tF[0] - tL[0]) * f, yt2 = tL[1] + (tF[1] - tL[1]) * f;
    iso.r.line(iso.P(xb2, yb2, Zb + 6), iso.P(xt2, yt2, Zt - 4), 0.6 * RES, alpha(GL_D, 0.55));
  }
  // a few lit horizontal floor-bands (the spandrel reflections)
  for (let z = Zb + 60; z < Zt; z += 70) {
    const f = (z - Zb) / (Zt - Zb);
    const wr = wb + (0 - wb) * f;
    iso.r.line(iso.P(cu + wr, cv, z), iso.P(cu, cv + wr, z), 0.5 * RES, alpha(GL_L, 0.4));
  }
  // sharp ink silhouette edges (the crisp prism corners)
  iso.edge(iso.P(bF[0], bF[1], Zb), iso.P(tF[0], tF[1], Zt));
  iso.edge(iso.P(bR[0], bR[1], Zb), iso.P(tRf[0], tRf[1], Zt));
  iso.edge(iso.P(bL[0], bL[1], Zb), iso.P(tL[0], tL[1], Zt));
  iso.r.polyline([iso.P(tL[0], tL[1], Zt), iso.P(tF[0], tF[1], Zt), iso.P(tRf[0], tRf[1], Zt)], INK_W * 0.6, INK);
  // the square glass parapet ring + the soaring mast/spire with its beacon
  iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, Zt, Zt + 14, GL_L, { ink: false });
  const mb = iso.P(cu, cv, Zt + 14);
  iso.r.line(mb, [mb[0], mb[1] - 78 * RES], 1.7 * RES, GL_D); // the 124 m mast
  iso.r.line([mb[0], mb[1] - 78 * RES], [mb[0], mb[1] - 92 * RES], 1.0 * RES, COLORS.glassLit);
  return iso.build();
}

/** STATUE OF LIBERTY (1886, 93 m to the torch) — Bartholdi's colossus on Liberty
 *  Island: the great eleven-point star FORT pedestal (Fort Wood) carrying the
 *  tall granite plinth, then the verdigris-copper robed figure striding forward,
 *  raised right arm + TORCH (the beacon), the spiked radiate crown, and the
 *  tablet in the left arm. Read green-grey copper. 2×2 SW + headroom. */
function statueLibertyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  const CU = COPPER; // weathered verdigris
  const CU_L = lit(COPPER, 0.14);
  const CU_D = shaded(COPPER, 0.08);
  const ST = LIMESTONE;
  const cu = 1.0;
  const cv = 1.08;
  iso.shadow(0.32, 0.5, 1.68, 1.66, 0.28, 0.24);
  // the star-fort base (Fort Wood) — a low broad granite plinth with angled
  // bastion points hinted by chamfered corners
  iso.box(0.34, 0.5, 1.66, 1.72, 0, 26, GRANITE, { topC: lighten(GRANITE, 0.05) });
  for (const [du, dv] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]] as const) {
    iso.box(cu + du - 0.12, cv + dv - 0.12, cu + du + 0.12, cv + dv + 0.12, 18, 30, lighten(GRANITE, 0.03), { ink: false });
  }
  // the tall square granite PEDESTAL (Hunt's plinth) with its loggia banding
  iso.box(cu - 0.3, cv - 0.3, cu + 0.3, cv + 0.3, 30, 96, ST);
  gridFace(iso, 'r', cu + 0.3, cv - 0.26, cv + 0.26, 40, 88, 4, alpha(GLASS_DK, 0.85));
  gridFace(iso, 'l', cv + 0.3, cu - 0.26, cu + 0.26, 40, 88, 4, alpha(GLASS_DK, 0.88));
  for (const z of [50, 74] as const) iso.r.line(iso.P(cu - 0.3, cv + 0.3, z), iso.P(cu + 0.3, cv + 0.3, z), 0.8 * RES, lighten(ST, 0.14));
  iso.box(cu - 0.32, cv - 0.32, cu + 0.32, cv + 0.32, 96, 104, lighten(ST, 0.06), { ink: false }); // cornice balcony
  // ---- the figure: a tapering robed column of copper rising from the pedestal,
  //      drapery folds suggested by vertical ink seams, shoulders, the head with
  //      its radiate crown, the tablet (left) and the torch arm (right).
  const fz0 = 104;
  const fz1 = 176; // shoulders
  // the robed body (a slightly tapering faceted column)
  iso.r.poly([iso.P(cu - 0.17, cv + 0.17, fz0), iso.P(cu + 0.04, cv + 0.17, fz0), iso.P(cu + 0.02, cv + 0.08, fz1), iso.P(cu - 0.1, cv + 0.08, fz1)], CU_D); // left drape (shade)
  iso.r.poly([iso.P(cu + 0.04, cv + 0.17, fz0), iso.P(cu + 0.17, cv - 0.04, fz0), iso.P(cu + 0.08, cv - 0.02, fz1), iso.P(cu + 0.02, cv + 0.08, fz1)], CU_L); // right drape (sun)
  iso.r.polyline([iso.P(cu - 0.17, cv + 0.17, fz0), iso.P(cu - 0.1, cv + 0.08, fz1), iso.P(cu + 0.08, cv - 0.02, fz1), iso.P(cu + 0.17, cv - 0.04, fz0)], INK_W * 0.6, INK);
  // drapery fold seams
  for (const t of [0.3, 0.5, 0.7] as const) {
    const xb = cu - 0.17 + 0.34 * t, yb = cv + 0.17 - 0.21 * t;
    iso.r.line(iso.P(xb, yb, fz0 + 2), iso.P(cu - 0.1 + 0.18 * t, cv + 0.08 - 0.1 * t, fz1 - 2), 0.6 * RES, alpha(CU_D, 0.7));
  }
  // the shoulders / upper chest block
  iso.box(cu - 0.1, cv - 0.02, cu + 0.06, cv + 0.1, fz1, fz1 + 14, CU, { ink: false });
  // the HEAD + radiate crown
  const [hx, hyB] = iso.P(cu - 0.02, cv + 0.04, fz1 + 14);
  const headTop = hyB - 16 * RES;
  iso.r.poly([[hx - 4 * RES, hyB], [hx + 4 * RES, hyB], [hx + 3 * RES, headTop], [hx - 3 * RES, headTop]], CU_L, CU_D); // head
  iso.r.polyline([[hx - 4 * RES, hyB], [hx - 3 * RES, headTop], [hx + 3 * RES, headTop], [hx + 4 * RES, hyB]], INK_W * 0.5, INK);
  // the seven crown spikes radiating from the head top
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.5 + (k - 3) * 0.42;
    iso.r.line([hx, headTop + 1 * RES], [hx + Math.cos(a) * 11 * RES, headTop + 1 * RES + Math.sin(a) * 11 * RES], 1.1 * RES, CU);
  }
  // the left arm holding the TABLET (a tilted slab held against the body)
  const [tbx, tby] = iso.P(cu - 0.16, cv + 0.12, fz1 - 4);
  iso.r.poly([[tbx, tby], [tbx - 9 * RES, tby - 5 * RES], [tbx - 11 * RES, tby - 16 * RES], [tbx - 2 * RES, tby - 11 * RES]], CU, CU_D); // tablet
  iso.r.polyline([[tbx, tby], [tbx - 9 * RES, tby - 5 * RES], [tbx - 11 * RES, tby - 16 * RES], [tbx - 2 * RES, tby - 11 * RES]], INK_W * 0.5, INK, true);
  // the raised right ARM + the TORCH high overhead (the beacon sits here)
  const shoulderR = iso.P(cu + 0.06, cv + 0.0, fz1 + 6);
  const torchBase: Pt = [shoulderR[0] + 7 * RES, shoulderR[1] - 40 * RES];
  iso.r.line(shoulderR, torchBase, 2.6 * RES, CU); // the upraised arm
  iso.r.polyline([shoulderR, torchBase], INK_W * 0.5, alpha(INK, 0.7));
  // the torch cup + golden flame
  iso.r.poly([[torchBase[0] - 3 * RES, torchBase[1]], [torchBase[0] + 3 * RES, torchBase[1]], [torchBase[0] + 2 * RES, torchBase[1] - 4 * RES], [torchBase[0] - 2 * RES, torchBase[1] - 4 * RES]], GOLDLEAF);
  iso.r.poly([[torchBase[0] - 2 * RES, torchBase[1] - 4 * RES], [torchBase[0] + 2 * RES, torchBase[1] - 4 * RES], [torchBase[0], torchBase[1] - 13 * RES]], hex('#ffd873'));
  iso.glint([torchBase[0], torchBase[1] - 7 * RES], 2.4 * RES);
  return iso.build();
}

/** BROOKLYN BRIDGE (1883) — the great hybrid suspension/cable-stayed span: the
 *  two TWIN GOTHIC stone towers with their paired pointed arches, the long
 *  catenary main cables and the fan of diagonal stays, and the roadway deck
 *  crossing the East River. Drawn spanning the footprint diagonal so it reads
 *  as a river crossing. Grey granite + steel-grey cables. 4×4 SW + headroom. */
function brooklynBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 200 });
  void seed;
  const ST = hex('#a59c8d'); // the warm-grey Maine granite, greyed
  const ST_D = hex('#857d70');
  const CABLE = hex('#6f7782'); // steel cable grey
  const DECK = hex('#7a766e');
  // the river surface under the span
  iso.quad(0.2, 0.2, 3.8, 3.8, 0, shaded(COLORS.water, 0.04));
  iso.r.line(iso.P(0.4, 2.0, 0.3), iso.P(3.6, 2.0, 0.3), 1.0 * RES, alpha(COLORS.waterGlint, 0.4));
  // the bridge runs along the footprint diagonal from the near corner (high v,
  // the Manhattan anchor) toward the far corner — towers at 1/3 and 2/3.
  // deck line endpoints (approach abutments) + the two tower centres
  const aA = [0.5, 3.4] as const; // near (Manhattan) approach
  const aB = [3.4, 0.5] as const; // far (Brooklyn) approach
  const t1 = [1.45, 2.45] as const; // Manhattan-side tower
  const t2 = [2.45, 1.45] as const; // Brooklyn-side tower
  const deckZ = 26;
  const towerH = 150;
  const cableTop = 132;
  // the suspended DECK (a long grey ribbon between the abutments)
  iso.r.poly(
    [iso.P(aA[0] - 0.12, aA[1] + 0.12, deckZ), iso.P(aB[0] - 0.12, aB[1] + 0.12, deckZ), iso.P(aB[0] + 0.12, aB[1] - 0.12, deckZ), iso.P(aA[0] + 0.12, aA[1] - 0.12, deckZ)],
    DECK,
    lit(DECK, 0.05),
  );
  iso.r.polyline([iso.P(aA[0], aA[1], deckZ), iso.P(aB[0], aB[1], deckZ)], INK_W * 0.6, alpha(INK, 0.7));
  // the abutment masonry at each end
  for (const a of [aA, aB] as const) iso.box(a[0] - 0.16, a[1] - 0.16, a[0] + 0.16, a[1] + 0.16, 0, deckZ + 6, ST);
  // the main suspension CABLE: a catenary from abutment up over each tower top
  // and down — drawn as two swooping polylines (one per tower span).
  const sag = (p: readonly [number, number], q: readonly [number, number], topZ: number, n = 10): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const u = p[0] + (q[0] - p[0]) * f;
      const v = p[1] + (q[1] - p[1]) * f;
      // parabolic sag: high at ends, low at middle relative to topZ
      const z = deckZ + 8 + (topZ - deckZ - 8) * (1 - 4 * f * (1 - f));
      pts.push(iso.P(u, v, z));
    }
    return pts;
  };
  // ---- the two GOTHIC TOWERS (twin paired pointed arches) ----
  for (const tc of [t1, t2] as const) {
    iso.box(tc[0] - 0.18, tc[1] - 0.18, tc[0] + 0.18, tc[1] + 0.18, 0, towerH, ST, { leftC: ST_D, rightC: lit(ST, 0.06) });
    // the two tall pointed-arch portals on the near (left) face
    for (const dv of [-0.075, 0.075] as const) {
      const av = tc[1] + dv;
      iso.r.poly(
        [iso.P(tc[0] - 0.18, av - 0.05, deckZ + 6), iso.P(tc[0] - 0.18, av + 0.05, deckZ + 6), iso.P(tc[0] - 0.18, av + 0.05, towerH * 0.52), iso.P(tc[0] - 0.18, av, towerH * 0.62), iso.P(tc[0] - 0.18, av - 0.05, towerH * 0.52)],
        darken(ST_D, 0.22),
      );
    }
    // a string-course + the flat granite cap
    iso.r.line(iso.P(tc[0] - 0.18, tc[1] + 0.18, towerH * 0.68), iso.P(tc[0] + 0.18, tc[1] + 0.18, towerH * 0.68), 0.8 * RES, lighten(ST, 0.12));
    iso.box(tc[0] - 0.2, tc[1] - 0.2, tc[0] + 0.2, tc[1] + 0.2, towerH, towerH + 5, lighten(ST, 0.06), { ink: false });
  }
  // draw the cables AFTER the near tower so they drape correctly over the tops:
  // the catenary runs anchor → over tower1 → over tower2 → anchor.
  for (const seg of [[aA, t1] as const, [t1, t2] as const, [t2, aB] as const]) {
    iso.r.polyline(sag(seg[0], seg[1], cableTop), 1.4 * RES, CABLE);
  }
  // the fan of diagonal STAYS from each tower top down to the deck (the bridge's
  // signature web) — a few rays each side
  for (const tc of [t1, t2] as const) {
    const top = iso.P(tc[0], tc[1], towerH);
    for (const f of [0.35, 0.6, 0.85] as const) {
      // stays toward each approach
      iso.r.line(top, iso.P(tc[0] - (tc[0] - aA[0]) * f, tc[1] - (tc[1] - aA[1]) * f, deckZ + 2), 0.6 * RES, alpha(CABLE, 0.8));
      iso.r.line(top, iso.P(tc[0] + (aB[0] - tc[0]) * f, tc[1] + (aB[1] - tc[1]) * f, deckZ + 2), 0.6 * RES, alpha(CABLE, 0.8));
    }
  }
  // vertical suspender ropes from the main cable to the deck along the centre span
  for (let i = 1; i < 9; i++) {
    const f = i / 9;
    const u = t1[0] + (t2[0] - t1[0]) * f;
    const v = t1[1] + (t2[1] - t1[1]) * f;
    const z = deckZ + 8 + (cableTop - deckZ - 8) * (1 - 4 * f * (1 - f));
    iso.r.line(iso.P(u, v, z), iso.P(u, v, deckZ + 2), 0.4 * RES, alpha(CABLE, 0.6));
  }
  return iso.build();
}

/** GRAND CENTRAL TERMINAL (1913, Warren & Wetmore) — the Beaux-Arts station: a
 *  broad granite-and-limestone block with the great triple-arch 42nd-St window
 *  bays, paired columns, a heavy cornice, and the crowning sculptural group
 *  (Mercury/Hercules/Minerva) over the central CLOCK. Read pale grey. Broad
 *  3×2 SW + headroom (it is long & monumental, not tall). */
function grandCentralTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = LIMESTONE;
  const u0 = 0.34, u1 = 2.66, v0 = 0.42, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  // rusticated granite base
  iso.box(u0, v0, u1, v1, 0, 18, GRANITE);
  // the main limestone mass
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1, 18, 84, ST);
  // ---- the three great arched windows on the show (v1) face ----
  for (const uc of [0.85, 1.5, 2.15] as const) {
    const poly: Pt[] = [iso.P(uc - 0.26, v1, 26), iso.P(uc - 0.26, v1, 60)];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      poly.push(iso.P(uc - 0.26 + 0.52 * t, v1, 60 + Math.sin(t * Math.PI) * 16));
    }
    poly.push(iso.P(uc + 0.26, v1, 60), iso.P(uc + 0.26, v1, 26));
    iso.r.poly(poly, alpha(hex('#cfe2f0'), 0.5));
    iso.r.polyline(poly, INK_W * 0.5, alpha(INK, 0.7));
    // the paired columns flanking each arch
    for (const du of [-0.3, -0.24, 0.24, 0.3] as const) iso.r.line(iso.P(uc + du, v1, 22), iso.P(uc + du, v1, 64), 1.3 * RES, lighten(ST, 0.16));
  }
  // heavy cornice + low attic
  iso.box(u0, v0, u1, v1, 84, 92, lighten(ST, 0.06), { ink: false });
  iso.box(u0 + 0.2, v0 + 0.1, u1 - 0.2, v1 - 0.06, 92, 100, ST, { ink: false });
  // ---- the crowning sculptural GROUP over the central clock ----
  const sc = 1.5;
  const [scx, scy] = iso.P(sc, v1, 100);
  // the great clock disc
  const RR = 6 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; ring.push([scx + Math.cos(a) * RR, scy - RR - 4 * RES + Math.sin(a) * RR]); }
  iso.r.poly(ring, DIALSTONE);
  iso.r.polyline(ring, INK_W * 0.6, INK, true);
  iso.r.line([scx, scy - RR - 4 * RES], [scx, scy - RR - 8 * RES], 0.9 * RES, INK);
  iso.r.line([scx, scy - RR - 4 * RES], [scx + 3 * RES, scy - RR - 4 * RES], 0.9 * RES, INK);
  // the statue group (a central figure flanked by two reclining figures)
  iso.r.line([scx, scy - RR - 8 * RES], [scx, scy - RR - 20 * RES], 2.4 * RES, lighten(ST, 0.08));
  iso.r.poly([[scx - 9 * RES, scy - RR - 4 * RES], [scx - 3 * RES, scy - RR - 4 * RES], [scx - 4 * RES, scy - RR - 12 * RES]], lighten(ST, 0.06));
  iso.r.poly([[scx + 9 * RES, scy - RR - 4 * RES], [scx + 3 * RES, scy - RR - 4 * RES], [scx + 4 * RES, scy - RR - 12 * RES]], lighten(ST, 0.06));
  return iso.build();
}

/** 30 ROCKEFELLER PLAZA (1933, the RCA/GE/Comcast Building) — the great Art-Deco
 *  limestone SLAB of Rockefeller Center: a thin broad tablet of stone with
 *  strong unbroken vertical window strips, a series of slender setbacks up its
 *  narrow ends, and a flat top. The signature is the SLAB proportion — wide, thin
 *  and tall. Slim-in-depth 2×2 on big headroom. */
function rockefellerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 420 });
  void seed;
  const ST = LIMESTONE;
  iso.shadow(0.34, 0.5, 1.66, 1.64, 0.3, 0.26);
  // granite base
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 24, GRANITE);
  // ---- the slab: WIDE on the v (left) face, THIN on the u (right) face ----
  const u0 = 0.66, u1 = 1.34; // thin depth
  const v0 = 0.34, v1 = 1.66; // broad width
  iso.box(u0, v0, u1, v1, 24, 320, ST, { rightC: lit(ST, 0.05), leftC: shaded(ST, 0.04) });
  // the strong continuous vertical window strips down the broad left face — the
  // unbroken piers that give the RCA slab its soaring verticality
  gridFace(iso, 'l', v1, u0 + 0.04, u1 - 0.04, 34, 312, 6, alpha(GLASS_DK, 0.92));
  for (let i = 0; i <= 14; i++) {
    const v = v0 + ((v1 - v0) * i) / 14;
    iso.r.line(iso.P(u0, v, 30), iso.P(u0, v, 314), 0.7 * RES, lighten(ST, 0.13));
  }
  // the thin right (u1) face gets a couple of window columns too
  gridFace(iso, 'r', u1, v0 + 0.06, v1 - 0.06, 34, 312, 3, alpha(GLASS_DK, 0.9));
  // the slender setbacks stepping the narrow ENDS inward near the top (Deco)
  for (const [iv0, iv1, zb, zt] of [[v0 + 0.12, v1 - 0.12, 320, 338], [v0 + 0.26, v1 - 0.26, 338, 356]] as const) {
    iso.box(u0 + 0.02, iv0, u1 - 0.02, iv1, zb, zt, ST, { topC: lighten(ST, 0.06) });
    gridFace(iso, 'l', iv1, u0 + 0.06, u1 - 0.06, zb + 2, zt - 2, 4, alpha(GLASS_DK, 0.85));
  }
  // a slim rooftop mast
  const [mx, my] = iso.P(1.0, 1.0, 356);
  iso.r.line([mx, my], [mx, my - 30 * RES], 1.2 * RES, STEEL_GLASS_D);
  return iso.build();
}

/** THE METROPOLITAN MUSEUM OF ART (the Fifth-Ave facade, R.M. Hunt 1902) — the
 *  great Beaux-Arts museum: a long limestone front with the monumental central
 *  triple-arch entrance under paired columns + heavy attic, flanking arched wings
 *  with the four uncarved stone "blocks" over the columns, and a low roof behind.
 *  Broad pale grey, 3×3 SW + modest headroom. */
function metMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#cdc8bb'); // Indiana limestone (greyed)
  const u0 = 0.36, u1 = 2.66, v0 = 0.5, v1 = 2.6;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 12, GRANITE);
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1, 12, 58, ST);
  // the projecting central pavilion (the three great arches)
  iso.box(2.48, 0.95, 2.74, 2.15, 6, 70, lighten(ST, 0.03));
  for (const vc of [1.25, 1.55, 1.85] as const) {
    const poly: Pt[] = [iso.P(2.74, vc - 0.13, 16), iso.P(2.74, vc - 0.13, 42)];
    for (let j = 0; j <= 8; j++) { const t = j / 8; poly.push(iso.P(2.74, vc - 0.13 + 0.26 * t, 42 + Math.sin(t * Math.PI) * 13)); }
    poly.push(iso.P(2.74, vc + 0.13, 42), iso.P(2.74, vc + 0.13, 16));
    iso.r.poly(poly, alpha(GLASS_DK, 0.82));
    iso.r.polyline(poly, INK_W * 0.5, alpha(INK, 0.7));
  }
  // the paired giant columns across the central pavilion + the four attic blocks
  for (let v = 1.05; v < 2.12; v += 0.14) iso.r.line(iso.P(2.74, v, 8), iso.P(2.74, v, 58), 1.4 * RES, lighten(ST, 0.16));
  iso.box(2.46, 0.93, 2.76, 2.17, 70, 78, lighten(ST, 0.06), { ink: false }); // attic
  for (const vc of [1.1, 1.45, 1.7, 2.05] as const) {
    const [bx, by] = iso.P(2.76, vc, 78);
    iso.r.rect(bx - 2.4 * RES, by - 9 * RES, bx + 2.4 * RES, by, lighten(ST, 0.08)); // uncarved block
  }
  // the long flanking wings with tall arched windows
  gridFace(iso, 'l', 2.6, 0.6, 0.92, 16, 50, 4, alpha(GLASS_DK, 0.85));
  gridFace(iso, 'l', 2.6, 2.18, 2.54, 16, 50, 4, alpha(GLASS_DK, 0.85));
  // cornice across the wings + the low glazed roof behind (the galleries)
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1, 58, 64, lighten(ST, 0.06), { ink: false });
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.5, v1 - 0.4, 58, 70, shaded(COLORS.glassSky, 0.06), { ink: false });
  return iso.build();
}

/** THE WHITNEY MUSEUM OF AMERICAN ART (Renzo Piano, 2015, Gansevoort St) — the
 *  asymmetric industrial-modern mass beside the High Line: stacked grey steel-
 *  and-glass volumes that cantilever and step back toward the river, with broad
 *  outdoor terraces, an external stair, and a glazed ground floor. Reads pale
 *  grey-blue steel. A broad, low, sculptural 2×2 SW. */
function whitneyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = hex('#9aa3ac'); // pale grey industrial steel
  const GL = alpha(hex('#bcd2e2'), 0.6);
  iso.shadow(0.34, 0.52, 1.66, 1.64, 0.24, 0.22);
  // the glazed transparent ground floor (a glowing plinth)
  iso.box(0.34, 0.5, 1.66, 1.7, 0, 18, alpha(hex('#cfe2f0'), 0.55), { topC: lighten(ST, 0.1) });
  // the main asymmetric massing — a tall blank-clad block toward the back-left
  iso.box(0.34, 0.5, 1.2, 1.7, 18, 96, ST, { leftC: shaded(ST, 0.06), rightC: lit(ST, 0.04) });
  // a lower stepped volume to the front-right (cantilevering toward the river)
  iso.box(1.2, 0.5, 1.66, 1.7, 18, 64, lighten(ST, 0.03));
  iso.box(1.2, 0.5, 1.66, 1.7, 64, 72, lighten(ST, 0.08), { ink: false }); // its roof terrace slab
  // the stepped outdoor TERRACES on the river side (the signature steel decks)
  for (const [zb, depth] of [[72, 0.2], [84, 0.34], [50, 0.12]] as const) {
    iso.box(1.2, 1.7 - depth, 1.66, 1.7, zb, zb + 4, lighten(ST, 0.06), { ink: false });
    // terrace railings
    iso.r.line(iso.P(1.2, 1.7, zb + 4), iso.P(1.66, 1.7, zb + 4), 0.6 * RES, alpha(INK, 0.6));
  }
  // big glazed window bands on the tall block (asymmetric ribbon windows)
  gridFace(iso, 'l', 1.7, 0.42, 1.14, 30, 88, 5, GL);
  gridFace(iso, 'r', 1.2, 0.56, 1.64, 30, 60, 3, GL);
  // the external steel stair / escape running up the left face (diagonal ink)
  for (let z = 24; z < 90; z += 16) iso.r.line(iso.P(0.34, 1.0, z), iso.P(0.34, 1.3, z + 12), 0.7 * RES, alpha(ST, 0.9));
  // a rooftop mechanical box + a flagpole
  iso.box(0.5, 0.66, 0.8, 0.96, 96, 106, shaded(ST, 0.08), { ink: false });
  const [fx, fy] = iso.P(0.4, 0.6, 96);
  iso.r.line([fx, fy], [fx, fy - 16 * RES], 0.7 * RES, INK);
  return iso.build();
}

/** THE FRICK COLLECTION (Carrère & Hastings, 1914) — the Gilded-Age mansion on
 *  Fifth Avenue: a low, wide, refined limestone palace, a rusticated base, tall
 *  French windows behind a screen of pilasters, a deep cornice and balustraded
 *  roofline, set back behind its garden wall + railing. Pale grey, broad LOW
 *  2×2 SW. */
function frickTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const ST = hex('#d0cbbe');
  const u0 = 0.32, u1 = 1.7, v0 = 0.46, v1 = 1.72;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the low garden wall + railing toward the avenue (front, v1)
  iso.box(u0 - 0.02, v1 + 0.04, u1 + 0.02, v1 + 0.1, 0, 10, lighten(ST, 0.04), { ink: false });
  for (let u = u0; u < u1; u += 0.1) iso.r.line(iso.P(u, v1 + 0.07, 10), iso.P(u, v1 + 0.07, 16), 0.5 * RES, alpha(INK, 0.55));
  // rusticated base
  iso.box(u0, v0, u1, v1, 0, 14, shaded(ST, 0.1));
  // the main palace body (low + broad)
  iso.box(u0 + 0.02, v0 + 0.02, u1 - 0.02, v1, 14, 50, ST);
  // tall French windows behind a pilaster screen on the show face
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 20, 44, 8, alpha(hex('#cfe2f0'), 0.5), lighten(ST, 0.1));
  for (let u = u0 + 0.1; u < u1 - 0.05; u += 0.16) iso.r.line(iso.P(u, v1, 16), iso.P(u, v1, 48), 1.0 * RES, lighten(ST, 0.14));
  // a slightly projecting central pavilion
  iso.box(0.78, v1 - 0.1, 1.24, v1, 14, 54, lighten(ST, 0.03));
  // deep cornice + the balustraded roofline
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 50, 56, lighten(ST, 0.07), { ink: false });
  for (let u = u0; u < u1; u += 0.09) iso.r.line(iso.P(u, v1 + 0.02, 56), iso.P(u, v1 + 0.02, 61), 0.5 * RES, alpha(lighten(ST, 0.1), 0.85)); // balusters
  return iso.build();
}

/** METLIFE BUILDING (200 Park Ave, the former Pan Am Building, 1963) — the vast
 *  precast-concrete slab that straddles Park Avenue behind Grand Central: a broad
 *  tapered octagonal tower (chamfered short ends) of grey concrete with a dense
 *  regular window grid and a flat top once bearing the rooftop heliport. The bulk
 *  is the point. Slim-depth, broad, tall 2×2 on headroom. */
function metLifeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 330 });
  void seed;
  const CC = hex('#a7a59e'); // precast concrete grey
  iso.shadow(0.34, 0.5, 1.66, 1.64, 0.3, 0.26);
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 30, GRANITE); // the base podium
  // the broad slab with chamfered (octagonal) short ends — drawn as a wide thin
  // box with the corners cut. Broad on v, thin on u.
  const u0 = 0.64, u1 = 1.36, v0 = 0.3, v1 = 1.7;
  iso.box(u0, v0 + 0.12, u1, v1 - 0.12, 30, 300, CC, { rightC: lit(CC, 0.04), leftC: shaded(CC, 0.05) });
  // the chamfer faces at each short end (the octagon)
  iso.r.poly([iso.P(u0, v0 + 0.12, 30), iso.P(u1, v0 + 0.12, 30), iso.P(u1, v0 + 0.12, 300), iso.P(u0, v0 + 0.12, 300)], shaded(CC, 0.12));
  iso.r.poly([iso.P(u0, v1 - 0.12, 30), iso.P(u1, v1 - 0.12, 30), iso.P(u1, v1 - 0.12, 300), iso.P(u0, v1 - 0.12, 300)], lit(CC, 0.02));
  // the dense regular window grid (its monolithic skin) on the broad left face
  gridFace(iso, 'l', v1 - 0.12, u0 + 0.04, u1 - 0.04, 40, 292, 5, alpha(GLASS_DK, 0.85));
  for (let z = 46; z < 292; z += 12) iso.r.line(iso.P(u0, v0 + 0.12, z), iso.P(u0, v1 - 0.12, z), 0.4 * RES, alpha(lighten(CC, 0.1), 0.5));
  for (let i = 1; i < 10; i++) { const v = v0 + 0.12 + ((v1 - v0 - 0.24) * i) / 10; iso.r.line(iso.P(u0, v, 40), iso.P(u0, v, 292), 0.4 * RES, alpha(darken(CC, 0.08), 0.5)); }
  // the thin right face window columns
  gridFace(iso, 'r', u1, v0 + 0.16, v1 - 0.16, 40, 292, 4, alpha(GLASS_DK, 0.82));
  // flat top + the (former) heliport pad outline
  iso.box(u0 - 0.02, v0 + 0.1, u1 + 0.02, v1 - 0.1, 300, 308, lighten(CC, 0.06), { ink: false });
  const [hx, hy] = iso.P(1.0, 1.0, 308);
  iso.r.line([hx - 5 * RES, hy], [hx + 5 * RES, hy], 0.6 * RES, alpha(COLORS.marking, 0.5));
  return iso.build();
}

/** 432 PARK AVENUE (Rafael Viñoly, 2015, 426 m) — the pencil-thin supertall: an
 *  almost-perfectly-square white concrete grid tube, a lattice of identical big
 *  square windows, punctuated every twelfth floor by an OPEN double-height void
 *  (left unglazed for wind). The slimmest, tallest read in the skyline — a slender
 *  square shaft on a 2×2 footprint with the largest headroom of all. */
function park432Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 560 });
  void seed;
  const WC = hex('#d6d2c8'); // off-white concrete (greyed)
  const WC_D = hex('#aea99d');
  iso.shadow(0.4, 0.56, 1.6, 1.56, 0.26, 0.24);
  // a very slim square tube
  const u0 = 0.78, u1 = 1.22, v0 = 0.78, v1 = 1.22;
  iso.box(u0, v0, u1, v1, 0, 500, WC, { leftC: WC_D, rightC: lit(WC, 0.05), topC: lighten(WC, 0.1) });
  // the signature square-window LATTICE: a regular grid of big square openings
  // on both visible faces, with the concrete grid between reading as white piers
  const cols = 6;
  for (let z = 14; z < 492; z += 16) {
    // skip a band every ~6th row for the open mechanical voids
    const isVoid = Math.floor((z - 14) / 16) % 12 === 5 || Math.floor((z - 14) / 16) % 12 === 6;
    const glass = isVoid ? alpha(hex('#1b2233'), 0.95) : alpha(GLASS_DK, 0.85);
    for (let i = 0; i < cols; i++) {
      const a = u0 + ((u1 - u0) * (i + 0.18)) / cols;
      const b = u0 + ((u1 - u0) * (i + 0.82)) / cols;
      iso.r.poly([iso.P(b, v1, z + 11), iso.P(a, v1, z + 11), iso.P(a, v1, z), iso.P(b, v1, z)], glass); // left face
      const c = v0 + ((v1 - v0) * (i + 0.18)) / cols;
      const d = v0 + ((v1 - v0) * (i + 0.82)) / cols;
      iso.r.poly([iso.P(u1, d, z + 11), iso.P(u1, c, z + 11), iso.P(u1, c, z), iso.P(u1, d, z)], isVoid ? alpha(hex('#1b2233'), 0.92) : alpha(GLASS_DK, 0.82)); // right face
    }
  }
  // the crisp concrete-grid piers (vertical) reinforcing the lattice read
  for (let i = 0; i <= cols; i++) {
    const u = u0 + ((u1 - u0) * i) / cols;
    iso.r.line(iso.P(u, v1, 10), iso.P(u, v1, 494), 0.5 * RES, lighten(WC, 0.1));
    const v = v0 + ((v1 - v0) * i) / cols;
    iso.r.line(iso.P(u1, v, 10), iso.P(u1, v, 494), 0.5 * RES, darken(WC, 0.05));
  }
  // flat parapet cap
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, 500, 506, lighten(WC, 0.08), { ink: false });
  return iso.build();
}

/** THE VESSEL (Heatherwick, 2019, Hudson Yards) — the honeycomb of interlocking
 *  copper-clad STAIRCASES: a tapering bronze lattice basket, wider at the top
 *  than the base, built of stacked angled flights that read as a woven hive. A
 *  sculptural, mid-height 1×1 (its silhouette alone identifies it). Bronze-grey. */
function vesselTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const CU = hex('#a07e54'); // copper-bronze (greyed)
  const CU_L = lit(hex('#a07e54'), 0.14);
  const CU_D = hex('#7e6440');
  const cu = 0.5, cv = 0.52;
  iso.shadow(cu - 0.3, cv - 0.12, cu + 0.3, cv + 0.24, 0.2, 0.2);
  // low plaza plinth
  iso.box(cu - 0.32, cv - 0.3, cu + 0.32, cv + 0.3, 0, 6, GRANITE);
  // the basket: stacked rings that WIDEN upward, each ring a faceted band, with
  // the criss-cross stair flights drawn as diagonals between levels.
  const [bx, byB] = iso.P(cu, cv, 6);
  const levels = 7;
  const ringPts = (rad: number, zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2; pts.push([bx + Math.cos(a) * rad, byB - zPx + Math.sin(a) * rad * 0.5]); }
    return pts;
  };
  const radAt = (l: number): number => (0.16 + l * 0.035) * (CELL_W / 2);
  const zAt = (l: number): number => (8 + l * 14) * RES;
  // draw from back to front: the body facets
  for (let l = 0; l < levels; l++) {
    const r0 = radAt(l), r1 = radAt(l + 1);
    const z0 = zAt(l), z1 = zAt(l + 1);
    // the outward-canting wall band of this tier
    iso.r.poly([...ringPts(r0, z0).slice(0, 5), ...ringPts(r1, z1).slice(0, 5).reverse()], shaded(CU, 0.06), CU_L);
    // the criss-cross stair diagonals (the honeycomb)
    const a0 = ringPts(r0, z0), a1 = ringPts(r1, z1);
    for (let i = 0; i < 4; i++) {
      iso.r.line(a0[i]!, a1[i + 1]!, 0.7 * RES, alpha(CU_D, 0.85));
      iso.r.line(a0[i + 1]!, a1[i]!, 0.7 * RES, alpha(CU_L, 0.8));
    }
    iso.r.polyline(ringPts(r1, z1), 0.7 * RES, alpha(CU_D, 0.7), true); // tier rim
  }
  // the bright top rim catching the light
  iso.r.polyline(ringPts(radAt(levels), zAt(levels)).slice(1, 6), 1.0 * RES, alpha(lighten(CU_L, 0.16), 0.9));
  iso.glint([bx + radAt(levels) * 0.4, byB - zAt(levels) + 2 * RES], 2 * RES);
  return iso.build();
}

/** 30 HUDSON YARDS (2019, 387 m) — the tallest Hudson Yards tower: a faceted grey-
 *  glass shaft that shears off near the top into the cantilevered triangular
 *  OBSERVATION DECK ("Edge") jutting out over the street. Slim+tall 2×2 on big
 *  headroom; the jutting wedge near the crown is the signature. */
function hudsonYards30Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 430 });
  void seed;
  const GL = STEEL_GLASS;
  const GL_D = STEEL_GLASS_D;
  iso.shadow(0.34, 0.5, 1.66, 1.64, 0.3, 0.26);
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 26, GRANITE);
  // the faceted shaft (a chamfered prism)
  const u0 = 0.6, u1 = 1.4, v0 = 0.5, v1 = 1.5;
  iso.box(u0, v0, u1, v1, 26, 340, GL, { leftC: GL_D, rightC: lit(GL, 0.05), topC: lighten(GL, 0.1) });
  gridFace(iso, 'r', u1, v0 + 0.04, v1 - 0.04, 34, 332, 7, alpha(hex('#cfe2f0'), 0.5));
  gridFace(iso, 'l', v1, u0 + 0.04, u1 - 0.04, 34, 332, 6, alpha(hex('#bcd2e2'), 0.5));
  // strong vertical mullion accents
  for (let i = 0; i <= 7; i++) { const v = v0 + ((v1 - v0) * i) / 7; iso.r.line(iso.P(u1, v, 34), iso.P(u1, v, 334), 0.5 * RES, lighten(GL, 0.14)); }
  // the upper shaft shears: a setback then the crown block
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 340, 372, GL, { topC: lighten(GL, 0.08) });
  // ---- the cantilevered triangular OBSERVATION DECK jutting from the corner ----
  const [ex, ey] = iso.P(u1, v0, 318); // springing from the SE corner
  iso.r.poly([[ex, ey], [ex + 20 * RES, ey + 4 * RES], [ex + 18 * RES, ey + 12 * RES], [ex, ey + 10 * RES]], lit(GL, 0.06), GL_D); // the deck slab
  iso.r.polyline([[ex, ey], [ex + 20 * RES, ey + 4 * RES], [ex + 18 * RES, ey + 12 * RES]], INK_W * 0.5, INK);
  // the glass balustrade up the deck edge
  iso.r.line([ex + 20 * RES, ey + 4 * RES], [ex + 20 * RES, ey - 5 * RES], 0.6 * RES, alpha(hex('#cfe2f0'), 0.7));
  // a slim crown mast
  const [mx, my] = iso.P(1.0, 1.0, 372);
  iso.r.line([mx, my], [mx, my - 34 * RES], 1.2 * RES, GL_D);
  iso.r.line([mx, my - 34 * RES], [mx, my - 44 * RES], 0.9 * RES, COLORS.glassLit);
  return iso.build();
}

/** LINCOLN CENTER (1962, the central plaza) — the three travertine modernist
 *  concert halls round the fountain plaza: a row of tall colonnaded white-stone
 *  fronts (Met Opera in the centre, broad and arched; Avery Fisher + the David
 *  Koch theatre flanking), each with a screen of slender full-height piers and a
 *  glazed glowing facade, framing the round plaza FOUNTAIN. Broad pale grey, 3×3
 *  SW. */
function lincolnCenterTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#d4cfc2'); // travertine (greyed)
  iso.shadow(0.4, 0.6, 2.62, 2.6, 0.24, 0.22);
  // the raised plaza
  iso.box(0.34, 0.5, 2.66, 2.66, 0, 8, lighten(GRANITE, 0.04), { topC: lighten(ST, 0.06) });
  // ---- the central hall (Met Opera): tall, with five great arched bays ----
  iso.box(1.0, 0.5, 2.0, 1.1, 8, 86, ST);
  for (let i = 0; i < 5; i++) {
    const uc = 1.1 + i * 0.18;
    const poly: Pt[] = [iso.P(uc, 1.1, 16), iso.P(uc, 1.1, 56)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(uc + 0.12 * t, 1.1, 56 + Math.sin(t * Math.PI) * 14)); }
    poly.push(iso.P(uc + 0.12, 1.1, 56), iso.P(uc + 0.12, 1.1, 16));
    iso.r.poly(poly, alpha(hex('#e8c878'), 0.4)); // the warm-lit glazed lobby behind the arches
    iso.r.polyline(poly, INK_W * 0.5, alpha(INK, 0.7));
  }
  iso.box(1.0, 0.5, 2.0, 1.1, 86, 92, lighten(ST, 0.06), { ink: false });
  // ---- the two flanking halls (lower, colonnaded screens) ----
  for (const [bu0, bu1, bv0, bv1] of [[0.4, 0.98, 0.6, 1.2], [2.02, 2.62, 0.6, 1.2]] as const) {
    iso.box(bu0, bv0, bu1, bv1, 8, 62, lighten(ST, 0.02));
    for (let u = bu0 + 0.06; u < bu1 - 0.02; u += 0.1) iso.r.line(iso.P(u, bv1, 14), iso.P(u, bv1, 58), 1.1 * RES, lighten(ST, 0.16)); // the full-height piers
    gridFace(iso, 'l', bv1, bu0 + 0.06, bu1 - 0.06, 16, 56, 5, alpha(hex('#e8c878'), 0.4));
    iso.box(bu0, bv0, bu1, bv1, 62, 68, lighten(ST, 0.06), { ink: false });
  }
  // the round plaza FOUNTAIN in front of the central hall
  const [fx, fyB] = iso.P(1.5, 1.7, 8);
  const FR = 0.34 * (CELL_W / 2);
  const fr: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; fr.push([fx + Math.cos(a) * FR, fyB + Math.sin(a) * FR * 0.5]); }
  iso.r.poly(fr, shaded(COLORS.water, 0.04));
  iso.r.polyline(fr, 1.0 * RES, lighten(ST, 0.12), true);
  // the central jet
  iso.r.line([fx, fyB], [fx, fyB - 14 * RES], 1.4 * RES, alpha(COLORS.waterGlint, 0.7));
  iso.glint([fx, fyB - 14 * RES], 2.2 * RES);
  return iso.build();
}

/** UNITED NATIONS SECRETARIAT (1952, Harrison/Le Corbusier/Niemeyer) — the
 *  pioneering glass curtain-wall SLAB on the East River: a thin tall rectangular
 *  tablet whose two BROAD faces are sheer green-grey glass (the long elevations)
 *  and whose two narrow ENDS are blank white-marble walls. Beside it the low
 *  curved General Assembly with its shallow dome. Slim slab, 2×2 on headroom. */
function unSecretariatTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 320 });
  void seed;
  const GL = hex('#7f93a0'); // the green-grey glass curtain wall
  const GL_L = lighten(GL, 0.12);
  const MB = hex('#cfcabc'); // the white-marble blank ends
  iso.shadow(0.34, 0.5, 1.66, 1.64, 0.3, 0.26);
  iso.box(0.3, 0.42, 1.7, 1.7, 0, 14, GRANITE); // plaza base
  // ---- the slab: broad glass faces on v, blank marble ends on u ----
  const u0 = 0.72, u1 = 1.28, v0 = 0.34, v1 = 1.66;
  // the two glass long-faces
  iso.box(u0, v0, u1, v1, 14, 290, GL, { leftC: shaded(GL, 0.04), rightC: lit(GL, 0.04), topC: lighten(GL, 0.08) });
  // dense horizontal floor reflections + thin vertical mullions on the broad
  // left (v1) face — the sheer glass read
  for (let z = 24; z < 286; z += 8) iso.r.line(iso.P(u0, v0, z), iso.P(u0, v1, z), 0.4 * RES, alpha(GL_L, 0.45));
  for (let i = 1; i < 14; i++) { const v = v0 + ((v1 - v0) * i) / 14; iso.r.line(iso.P(u0, v, 20), iso.P(u0, v, 286), 0.4 * RES, alpha(darken(GL, 0.1), 0.5)); }
  // the blank white-marble END wall (the narrow u1 short face, toward the sun)
  // overlaid as solid stone — the Secretariat's famous blank-marble ends.
  iso.r.poly([iso.P(u1, v0, 14), iso.P(u1, v1, 14), iso.P(u1, v1, 290), iso.P(u1, v0, 290)], lit(MB, 0.03));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 290, 298, lighten(MB, 0.06), { ink: false }); // thin top cap
  iso.edge(iso.P(u1, v0, 14), iso.P(u1, v0, 298));
  iso.edge(iso.P(u1, v1, 14), iso.P(u1, v1, 298));
  // ---- the low General Assembly building beside it (curved, concave roof) ----
  iso.box(0.34, 1.2, 0.66, 1.7, 0, 40, MB, { topC: lighten(MB, 0.08) });
  const [gx, gyB] = iso.P(0.5, 1.7, 40);
  // a shallow concave sweep + the small dome
  iso.r.poly([[gx - 9 * RES, gyB], [gx + 9 * RES, gyB], [gx + 7 * RES, gyB - 5 * RES], [gx - 7 * RES, gyB - 5 * RES]], lighten(MB, 0.04));
  const dome: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); dome.push([gx + Math.cos(a) * 6 * RES, gyB - 5 * RES - Math.sin(a) * 4 * RES]); }
  iso.r.poly(dome, shaded(MB, 0.05), lit(MB, 0.05));
  iso.r.polyline(dome, INK_W * 0.5, INK);
  return iso.build();
}

/** YANKEE STADIUM (the 2009 ballpark, the Bronx) — the great open-air baseball
 *  bowl: the tall limestone-clad outer FACADE with its arched window frieze
 *  (echoing the 1923 original), the tiered grandstand decks sweeping round, the
 *  bright green diamond + outfield, and the ring of light masts. Broad LOW 3×3
 *  SW. */
function yankeeStadiumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#cfc9bb'); // limestone facade (greyed)
  const cu = 1.5, cv = 1.55;
  iso.shadow(0.4, 0.6, 2.62, 2.6, 0.26, 0.22);
  // the green field inside
  iso.quad(0.6, 0.8, 2.5, 2.5, 0, shaded(COLORS.grass, 0.06));
  // the outer bowl wall — an elliptical limestone ring drawn as a faceted band
  const [bx, byB] = iso.P(cu, cv, 0);
  const RW = 1.04 * (CELL_W / 2);
  const RH = RW * 0.5;
  const ring = (rad: number, z: number, sh: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; pts.push([bx + Math.cos(a) * rad, byB - z + Math.sin(a) * rad * 0.5 * sh]); }
    return pts;
  };
  // the outer facade wall (tall)
  const outer0 = ring(RW, 4, 1);
  const outer1 = ring(RW, 56, 1);
  iso.r.poly([...outer0.slice(0, 15), ...outer1.slice(0, 15).reverse()], lit(ST, 0.03), shaded(ST, 0.06)); // front arc wall
  void RH;
  // the arched window frieze along the facade (the signature)
  for (let i = 2; i < 13; i++) {
    const a = (i / 28) * Math.PI * 2;
    const px = bx + Math.cos(a) * RW * 0.99;
    const py = byB - 30 + Math.sin(a) * RW * 0.5 * 0.99;
    iso.r.poly([[px - 1.6 * RES, py + 8 * RES], [px + 1.6 * RES, py + 8 * RES], [px + 1.6 * RES, py - 4 * RES], [px, py - 8 * RES], [px - 1.6 * RES, py - 4 * RES]], alpha(GLASS_DK, 0.8));
  }
  iso.r.polyline(outer1.slice(0, 15), INK_W * 0.6, INK); // cornice rim
  // the tiered grandstand decks (inner) sweeping round, stepping down to the field
  for (const [rad, z, col] of [[0.86, 44, shaded(COLORS.concrete, 0.04)], [0.7, 30, shaded(COLORS.concrete, 0.0)], [0.56, 18, lighten(COLORS.concrete, 0.04)]] as const) {
    const r0 = ring(rad * (CELL_W / 2), z, 1).slice(2, 16);
    iso.r.polyline(r0, 2.2 * RES, col);
  }
  // the baseball DIAMOND (the infield) + base lines
  const [dx, dyB] = iso.P(1.3, 1.9, 1);
  iso.r.poly([[dx, dyB - 6 * RES], [dx + 9 * RES, dyB], [dx, dyB + 6 * RES], [dx - 9 * RES, dyB]], shaded(hex('#b08a52'), 0.05)); // dirt diamond
  iso.r.polyline([[dx, dyB - 6 * RES], [dx + 9 * RES, dyB], [dx, dyB + 6 * RES], [dx - 9 * RES, dyB]], 0.6 * RES, alpha(COLORS.white, 0.7), true);
  // the ring of tall light MASTS around the rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - 0.2;
    if (a > 0.2 && a < Math.PI - 0.2) continue; // only the visible front-ish ones
    const mx = bx + Math.cos(a) * RW * 1.0;
    const my = byB - 56 + Math.sin(a) * RW * 0.5;
    iso.r.line([mx, my], [mx, my - 18 * RES], 0.7 * RES, STEEL_GLASS_D);
    iso.r.rect(mx - 4 * RES, my - 22 * RES, mx + 4 * RES, my - 18 * RES, alpha(hex('#fff4d0'), 0.7)); // the lamp bank
  }
  return iso.build();
}

/** THE WONDER WHEEL (1920, Coney Island) — Deno's eccentric Ferris wheel: the
 *  great steel ring with its spokes + the ring of swinging cars, on its A-frame
 *  trusses by the boardwalk. Drawn as a big upright wheel; the rim cars + the
 *  colour-cycle lights are the read. Slim 2×2 SW + headroom. */
function wonderWheelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const STL = hex('#8f9aa5'); // painted steel (greyed)
  const cu = 1.0, cv = 1.1;
  iso.shadow(cu - 0.4, cv - 0.1, cu + 0.4, cv + 0.3, 0.22, 0.2);
  // a sandy boardwalk plinth
  iso.box(0.4, 0.7, 1.6, 1.6, 0, 8, COLORS.sand, { topC: lighten(COLORS.sand, 0.06) });
  // the A-frame support trusses straddling the wheel
  const hub = iso.P(cu, cv, 150);
  const baseL = iso.P(cu - 0.34, cv + 0.34, 8);
  const baseR = iso.P(cu + 0.34, cv - 0.34, 8);
  const baseF = iso.P(cu + 0.3, cv + 0.3, 8);
  iso.r.line(baseL, hub, 2.2 * RES, shaded(STL, 0.08));
  iso.r.line(baseR, hub, 2.2 * RES, lit(STL, 0.06));
  iso.r.line(baseF, hub, 2.0 * RES, STL);
  // ---- the great wheel ring (drawn facing the viewer, slightly foreshortened) ----
  const [hx, hy] = hub;
  const R = 0.62 * (CELL_W / 2);
  const ZR = R * 0.96; // near-upright
  const rim: Pt[] = [];
  for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2; rim.push([hx + Math.cos(a) * R, hy + Math.sin(a) * ZR]); }
  // the spokes
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; iso.r.line([hx, hy], [hx + Math.cos(a) * R, hy + Math.sin(a) * ZR], 0.5 * RES, alpha(STL, 0.8)); }
  // two concentric rings (outer + inner track) — the eccentric wheel's twin rims
  iso.r.polyline(rim, 1.6 * RES, lit(STL, 0.06), true);
  const inner: Pt[] = rim.map(([x, y]): Pt => [hx + (x - hx) * 0.82, hy + (y - hy) * 0.82]);
  iso.r.polyline(inner, 1.0 * RES, alpha(STL, 0.85), true);
  // the ring of swinging cars on the rim (small bright pods)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const cx2 = hx + Math.cos(a) * R * 0.9;
    const cy2 = hy + Math.sin(a) * ZR * 0.9;
    iso.r.rect(cx2 - 2 * RES, cy2 - 1.4 * RES, cx2 + 2 * RES, cy2 + 2.6 * RES, alpha(i % 2 ? hex('#c44') : hex('#46c'), 0.85));
  }
  // the hub
  iso.r.line([hx - 3 * RES, hy], [hx + 3 * RES, hy], 4 * RES, shaded(STL, 0.1));
  iso.glint([hx, hy], 2.2 * RES);
  return iso.build();
}

/** THE PARACHUTE JUMP (1939, Coney Island, "the Eiffel Tower of Brooklyn") — the
 *  76 m open lattice STEEL tower: a tapering square truss mast flaring to the
 *  twelve-armed radial top frame (where the parachute cables once hung), now lit
 *  red. A slim red-grey lattice spike. 1×1 + big headroom. */
function parachuteJumpTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const STL = hex('#9a8f8a'); // weathered steel (greyed, faintly warm)
  const STL_D = hex('#7c726d');
  const cu = 0.5, cv = 0.52;
  iso.shadow(cu - 0.16, cv - 0.06, cu + 0.16, cv + 0.14, 0.16, 0.2);
  // a small concrete pad
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 8, COLORS.concrete);
  // ---- the tapering open lattice mast (four legs converging) ----
  const Z0 = 8, Z1 = 170;
  const wb = 0.13, wt = 0.03;
  const legs: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const legTop: Pt[] = [];
  const legBot: Pt[] = [];
  for (const [sx, sy] of legs) {
    const b = iso.P(cu + sx * wb, cv + sy * wb, Z0);
    const t = iso.P(cu + sx * wt, cv + sy * wt, Z1);
    legBot.push(b); legTop.push(t);
    iso.r.line(b, t, 1.3 * RES, sx > 0 ? lit(STL, 0.06) : shaded(STL, 0.06));
  }
  // the X-bracing lattice between the front legs (the open truss read)
  const frontPairs: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];
  for (const [iA, iB] of frontPairs) {
    for (let s = 0; s < 7; s++) {
      const f0 = s / 7, f1 = (s + 1) / 7;
      const aA: Pt = [legBot[iA]![0] + (legTop[iA]![0] - legBot[iA]![0]) * f0, legBot[iA]![1] + (legTop[iA]![1] - legBot[iA]![1]) * f0];
      const aB: Pt = [legBot[iB]![0] + (legTop[iB]![0] - legBot[iB]![0]) * f1, legBot[iB]![1] + (legTop[iB]![1] - legBot[iB]![1]) * f1];
      iso.r.line(aA, aB, 0.5 * RES, alpha(STL_D, 0.7));
    }
  }
  // ---- the radial TOP FRAME (the twelve arms the chutes hung from) ----
  const [tx, ty] = iso.P(cu, cv, Z1);
  const TR = 9 * RES;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    iso.r.line([tx, ty], [tx + Math.cos(a) * TR, ty + Math.sin(a) * TR * 0.6], 0.8 * RES, STL);
    // the little hanging tackle pip at each arm end
    iso.r.line([tx + Math.cos(a) * TR, ty + Math.sin(a) * TR * 0.6], [tx + Math.cos(a) * TR, ty + Math.sin(a) * TR * 0.6 + 3 * RES], 0.6 * RES, STL_D);
  }
  // the central finial spike + the top warning light
  iso.r.line([tx, ty], [tx, ty - 16 * RES], 1.1 * RES, STL_D);
  iso.r.poly([[tx - 2 * RES, ty - 16 * RES], [tx + 2 * RES, ty - 16 * RES], [tx, ty - 22 * RES]], alpha(hex('#ff6a5a'), 0.9));
  return iso.build();
}

// ===========================================================================
//  REGISTRY — match against the REAL placed names in newyork.ts `named`.
//  Order matters (first match wins). More-specific names first.
// ===========================================================================

export const CITY_HEROES: BespokeHero[] = [
  // --- the marquee trio ----------------------------------------------------
  {
    city: 'newyork',
    key: 'empire-state-building',
    match: /Empire State Building/i,
    foot: [2, 2],
    seed: 5101,
    draw: empireStateTile,
    // its signature is the COLOUR-CHANGING crown — the rim colour-cycle lands
    // on the lit lantern crown high up the mast.
    light: { kind: 'rimCycle', topZ: 470, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'chrysler-building',
    match: /Chrysler Building/i,
    foot: [2, 2],
    seed: 5102,
    draw: chryslerTile,
    // the stainless sunburst crown + needle: a spire beacon caps it.
    light: { kind: 'spireBeacon', topZ: 458, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'woolworth-building',
    match: /Woolworth Building/i,
    foot: [2, 2],
    seed: 5103,
    light: { kind: 'towerCrown', topZ: 356, halfW: 0.5 },
    draw: woolworthTile,
  },
  // --- midtown / park ave towers ------------------------------------------
  {
    city: 'newyork',
    key: 'seagram-building',
    match: /Seagram Building/i,
    foot: [2, 2],
    seed: 5104,
    draw: seagramTile,
    light: { kind: 'towerCrown', topZ: 250, halfW: 0.55 },
  },
  {
    city: 'newyork',
    key: 'general-electric-building',
    match: /General Electric Building/i,
    foot: [2, 2],
    seed: 5105,
    draw: geBuildingTile,
    light: { kind: 'spireBeacon', topZ: 340, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'helmsley-building',
    match: /Helmsley Building/i,
    foot: [2, 2],
    seed: 5106,
    draw: helmsleyTile,
    light: { kind: 'towerCrown', topZ: 290, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'municipal-building',
    // the Manhattan Municipal Building (placed as "David N. Dinkins Manhattan
    // Municipal Building"); avoid matching the Brooklyn Municipal Building.
    match: /Manhattan Municipal Building/i,
    foot: [3, 3],
    seed: 5107,
    draw: municipalTile,
    light: { kind: 'towerCrown', topZ: 268, halfW: 0.7 },
  },
  // --- cathedrals & churches ----------------------------------------------
  {
    city: 'newyork',
    key: 'st-patricks-cathedral',
    // Fifth-Ave St Patrick's — NOT the Old Cathedral on Mulberry St.
    match: /Saint Patrick.s Cathedral/i,
    foot: [2, 2],
    seed: 5108,
    draw: stPatricksTile,
    light: { kind: 'facadeFlood', topZ: 330, halfW: 1.0 },
  },
  {
    city: 'newyork',
    key: 'st-john-the-divine',
    match: /Cathedral of Saint John the Divine/i,
    foot: [3, 3],
    seed: 5109,
    draw: stJohnDivineTile,
    light: { kind: 'facadeFlood', topZ: 190, halfW: 1.2 },
  },
  {
    city: 'newyork',
    key: 'trinity-church',
    match: /Trinity Church/i,
    foot: [1, 1],
    seed: 5110,
    draw: trinityChurchTile,
    light: { kind: 'facadeFlood', topZ: 186, halfW: 0.4 },
  },
  // --- civic / beaux-arts --------------------------------------------------
  {
    city: 'newyork',
    key: 'custom-house',
    match: /Custom House/i,
    foot: [3, 3],
    seed: 5111,
    draw: customHouseTile,
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'ny-public-library',
    // the NYPL main branch is placed as "Stephen A. Schwarzman Building".
    match: /Schwarzman Building/i,
    foot: [3, 3],
    seed: 5112,
    draw: nyplTile,
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'guggenheim-museum',
    match: /Guggenheim/i,
    foot: [2, 2],
    seed: 5113,
    draw: guggenheimTile,
    light: { kind: 'facadeFlood', topZ: 78, halfW: 0.7 },
  },
  {
    city: 'newyork',
    key: 'city-center',
    match: /New York City Center/i,
    foot: [2, 2],
    seed: 5114,
    draw: cityCenterTile,
    light: { kind: 'facadeFlood', topZ: 110, halfW: 0.6 },
  },
  // --- upper west side apartment landmarks --------------------------------
  {
    city: 'newyork',
    key: 'the-dakota',
    match: /The Dakota/i,
    foot: [2, 2],
    seed: 5115,
    draw: dakotaTile,
    light: { kind: 'facadeFlood', topZ: 106, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'the-ansonia',
    match: /The Ansonia/i,
    foot: [2, 2],
    seed: 5116,
    draw: ansoniaTile,
    light: { kind: 'facadeFlood', topZ: 132, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'the-beresford',
    match: /The Beresford/i,
    foot: [2, 2],
    seed: 5117,
    draw: beresfordTile,
    light: { kind: 'towerCrown', topZ: 166, halfW: 0.7 },
  },
  {
    city: 'newyork',
    key: 'apthorp-apartments',
    match: /Apthorp Apartments/i,
    foot: [3, 3],
    seed: 5118,
    draw: courtyardBlockTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'belnord-apartments',
    match: /Belnord Apartments/i,
    foot: [3, 3],
    seed: 5119,
    draw: courtyardBlockTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.1 },
  },
  // --- monuments, forts, towers, the harbor --------------------------------
  {
    city: 'newyork',
    key: 'washington-square-arch',
    match: /Washington Square Arch/i,
    foot: [1, 1],
    seed: 5120,
    draw: washSquareArchTile,
    light: { kind: 'archGlow', topZ: 48, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'cleopatras-needle',
    match: /Cleopatra.s Needle/i,
    foot: [1, 1],
    seed: 5121,
    draw: obeliskTile,
    light: { kind: 'aerialBeacon', topZ: 142, halfW: 0.12 },
  },
  {
    city: 'newyork',
    key: 'castle-clinton',
    match: /Castle Clinton/i,
    foot: [2, 2],
    seed: 5122,
    draw: castleClintonTile,
    light: { kind: 'facadeFlood', topZ: 26, halfW: 1.2 },
  },
  {
    city: 'newyork',
    key: 'fort-jay',
    match: /Fort Jay/i,
    foot: [2, 2],
    seed: 5123,
    draw: fortJayTile,
    light: { kind: 'facadeFlood', topZ: 34, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'colgate-clock',
    match: /Colgate Clock/i,
    foot: [1, 1],
    seed: 5124,
    draw: colgateClockTile,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'harlem-fire-watchtower',
    match: /Harlem Fire Watchtower/i,
    foot: [1, 1],
    seed: 5125,
    draw: fireWatchtowerTile,
    light: { kind: 'aerialBeacon', topZ: 118, halfW: 0.14 },
  },
  {
    city: 'newyork',
    key: 'blackwell-island-light',
    match: /Blackwell Island Light/i,
    foot: [1, 1],
    seed: 5126,
    draw: blackwellLightTile,
    light: { kind: 'aerialBeacon', topZ: 100, halfW: 0.12 },
  },
  {
    city: 'newyork',
    key: 'smallpox-hospital',
    match: /Smallpox Hospital/i,
    foot: [2, 2],
    seed: 5127,
    draw: smallpoxRuinTile,
    light: { kind: 'facadeFlood', topZ: 72, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'hoboken-terminal',
    match: /Hoboken Terminal/i,
    foot: [5, 5],
    seed: 5128,
    draw: hobokenTerminalTile,
    light: { kind: 'facadeFlood', topZ: 178, halfW: 1.6 },
  },
  // --- additional FLAGGED heroes (these placed names ARE landmark:true, so
  //     they render now). Grant's Tomb is a marquee; LaGuardia is the monster.
  {
    city: 'newyork',
    key: 'grants-tomb',
    match: /Grant National Memorial/i,
    foot: [3, 3],
    seed: 5129,
    draw: grantsTombTile,
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'jewish-museum',
    match: /Jewish Museum/i,
    foot: [2, 2],
    seed: 5130,
    draw: jewishMuseumTile,
    light: { kind: 'facadeFlood', topZ: 114, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'laguardia-airport',
    match: /LaGuardia Airport/i,
    foot: [5, 5],
    seed: 5131,
    draw: laGuardiaTile,
    light: { kind: 'stadiumFlood', topZ: 124, halfW: 1.7 },
  },
  // the lesser cathedrals (NOT Fifth-Ave St Pat's — that matched earlier).
  {
    city: 'newyork',
    key: 'old-st-patricks-cathedral',
    match: /Saint Patrick's Old Cathedral/i,
    foot: [1, 1],
    seed: 5132,
    draw: gothicChurchTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'st-james-cathedral',
    match: /Saint James Cathedral/i,
    foot: [1, 1],
    seed: 5133,
    draw: gothicChurchTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'cathedral-of-st-sava',
    match: /Cathedral of St\.? ?Sava/i,
    foot: [1, 1],
    seed: 5134,
    draw: gothicChurchTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.4 },
  },
  // historic-house memorials
  {
    city: 'newyork',
    key: 'hamilton-grange',
    match: /Hamilton Grange/i,
    foot: [1, 1],
    seed: 5135,
    draw: historicHouseTile,
    light: { kind: 'genericGlow', topZ: 40, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'van-wagenen-house',
    match: /Van Wagenen House/i,
    foot: [1, 1],
    seed: 5136,
    draw: historicHouseTile,
    light: { kind: 'genericGlow', topZ: 40, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'blockhouse-no-1',
    match: /Blockhouse No\.? ?1/i,
    foot: [1, 1],
    seed: 5137,
    draw: blockhouseTile,
    light: { kind: 'genericGlow', topZ: 38, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'center-for-brooklyn-history',
    match: /Center for Brooklyn History/i,
    foot: [2, 2],
    seed: 5138,
    draw: brooklynHistoryTile,
    light: { kind: 'facadeFlood', topZ: 78, halfW: 0.8 },
  },

  // =========================================================================
  //  ROUND 2 — the rest of the placed `named` set (Midtown commercial towers,
  //  the church spires, the Fifth-Ave mansions, the harbor fleet & sculptures,
  //  the flagged museums). Order: specific names before the shared-fn families.
  // =========================================================================

  // --- round-2 commercial towers -------------------------------------------
  {
    city: 'newyork',
    key: 'bryant-park-hotel',
    // the American Radiator Building — black-and-gold Gothic.
    match: /Bryant Park Hotel/i,
    foot: [2, 2],
    seed: 5201,
    draw: bryantParkHotelTile,
    light: { kind: 'towerCrown', topZ: 300, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'cocoa-exchange-building',
    match: /Cocoa Exchange Building/i,
    foot: [2, 2],
    seed: 5202,
    draw: cocoaExchangeTile,
    light: { kind: 'towerCrown', topZ: 132, halfW: 0.55 },
  },
  {
    city: 'newyork',
    key: 'candler-building',
    match: /Candler Building/i,
    foot: [2, 2],
    seed: 5203,
    draw: candlerBuildingTile,
    light: { kind: 'towerCrown', topZ: 276, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'imm-building',
    match: /International Mercantile Marine Company Building/i,
    foot: [3, 3],
    seed: 5204,
    draw: immBuildingTile,
    light: { kind: 'towerCrown', topZ: 168, halfW: 1.0 },
  },
  {
    city: 'newyork',
    key: 'scribners-building',
    match: /Charles Scribner.s Sons Building/i,
    foot: [2, 2],
    seed: 5205,
    draw: scribnersTile,
    light: { kind: 'facadeFlood', topZ: 84, halfW: 0.6 },
  },
  // --- round-2 churches (specific caps via seed) ---------------------------
  {
    city: 'newyork',
    key: 'st-bartholomews',
    match: /St\.? ?Bartholomew/i,
    foot: [2, 2],
    seed: 5206,
    draw: stBartholomewTile,
    light: { kind: 'facadeFlood', topZ: 110, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'grace-church',
    match: /Grace Church/i,
    foot: [1, 1],
    seed: 5207,
    draw: graceChurchTile,
    light: { kind: 'facadeFlood', topZ: 200, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'st-pauls-chapel',
    match: /Saint Paul.s Chapel/i,
    foot: [1, 1],
    seed: 5208,
    draw: stPaulsChapelTile,
    light: { kind: 'facadeFlood', topZ: 156, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'church-of-st-paul-the-apostle',
    match: /Church of Saint Paul the Apostle/i,
    foot: [2, 2],
    seed: 5209, // cap 0 → pyramidal copper, tall towers
    draw: twinTowerChurchTile,
    light: { kind: 'facadeFlood', topZ: 200, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'st-ignatius-loyola',
    match: /Saint Ignatius Loyola/i,
    foot: [2, 2],
    seed: 5210, // cap 1 → stone pinnacle
    draw: twinTowerChurchTile,
    light: { kind: 'facadeFlood', topZ: 210, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'st-georges-church',
    match: /St\.? ?George.s Church/i,
    foot: [2, 2],
    seed: 5211, // cap 2 → octagonal lantern
    draw: twinTowerChurchTile,
    light: { kind: 'facadeFlood', topZ: 190, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'st-marks-in-the-bowery',
    match: /Saint Mark.s in-the-Bowery/i,
    foot: [1, 1],
    seed: 5212,
    draw: steepleChurchTile,
    light: { kind: 'facadeFlood', topZ: 170, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'st-lukes-church',
    match: /St\.? ?Luke.s Church/i,
    foot: [1, 1],
    seed: 5213,
    draw: steepleChurchTile,
    light: { kind: 'facadeFlood', topZ: 160, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'church-of-st-mary-the-virgin',
    match: /Church of Saint Mary the Virgin/i,
    foot: [1, 1],
    seed: 5214,
    draw: steepleChurchTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.4 },
  },
  // --- round-2 mansions, hotels & apartments -------------------------------
  {
    city: 'newyork',
    key: 'otto-kahn-house',
    match: /Otto H\.? ?Kahn House/i,
    foot: [2, 2],
    seed: 5215,
    draw: kahnHouseTile,
    light: { kind: 'facadeFlood', topZ: 78, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'george-baker-houses',
    match: /George F\.? ?Baker/i,
    foot: [1, 1],
    seed: 5216,
    draw: fifthAveTownhouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'lucy-dahlgren-house',
    match: /Lucy Drexel Dahlgren House/i,
    foot: [1, 1],
    seed: 5217,
    draw: fifthAveTownhouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'richard-morris-hunt-house',
    // the "Richard Morris Hunt" memorial / associated townhouse.
    match: /Richard Morris Hunt/i,
    foot: [1, 1],
    seed: 5218,
    draw: fifthAveTownhouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'hotel-wolcott',
    match: /Hotel Wolcott/i,
    foot: [2, 2],
    seed: 5219,
    draw: hotelWolcottTile,
    light: { kind: 'towerCrown', topZ: 174, halfW: 0.55 },
  },
  {
    city: 'newyork',
    key: 'the-grand-hotel',
    match: /The Grand Hotel/i,
    foot: [2, 2],
    seed: 5220,
    draw: grandHotelTile,
    light: { kind: 'facadeFlood', topZ: 106, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'astral-apartments',
    match: /Astral Apartments/i,
    foot: [3, 3],
    seed: 5221,
    draw: astralApartmentsTile,
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.1 },
  },
  {
    city: 'newyork',
    key: 'blackwell-house',
    match: /Blackwell House/i,
    foot: [1, 1],
    seed: 5222,
    draw: federalHouseTile,
    light: { kind: 'genericGlow', topZ: 44, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'quarters-a',
    match: /Quarters A/i,
    foot: [1, 1],
    seed: 5223,
    draw: federalHouseTile,
    light: { kind: 'genericGlow', topZ: 44, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'hostelling-international',
    match: /Hostelling International/i,
    foot: [2, 2],
    seed: 5224,
    draw: hostellingTile,
    light: { kind: 'facadeFlood', topZ: 110, halfW: 0.8 },
  },
  // --- round-2 harbor fleet ------------------------------------------------
  {
    city: 'newyork',
    key: 'uss-intrepid',
    match: /USS Intrepid/i,
    foot: [5, 5],
    seed: 5225,
    draw: intrepidTile,
    light: { kind: 'stadiumFlood', topZ: 90, halfW: 1.7 },
  },
  {
    city: 'newyork',
    key: 'wavertree',
    match: /Wavertree/i,
    foot: [2, 2],
    seed: 5226, // even → square-rigger (three masts)
    draw: historicShipTile,
    light: { kind: 'aerialBeacon', topZ: 200, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'ambrose-lightship',
    match: /Ambrose/i,
    foot: [2, 2],
    seed: 5227, // odd → the red lightship (mast + lantern)
    draw: historicShipTile,
    light: { kind: 'aerialBeacon', topZ: 130, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'fireboat-john-j-harvey',
    match: /Fireboat John J\.? ?Harvey/i,
    foot: [2, 2],
    seed: 5228,
    draw: fireboatTile,
    light: { kind: 'genericGlow', topZ: 66, halfW: 0.5 },
  },
  // --- round-2 sculptures, fountains, clocks & monuments -------------------
  {
    city: 'newyork',
    key: 'the-sphere',
    match: /The Sphere/i,
    foot: [1, 1],
    seed: 5229,
    draw: sphereTile,
    light: { kind: 'genericGlow', topZ: 80, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'womens-rights-pioneers-monument',
    match: /Women.s Rights Pioneers Monument/i,
    foot: [1, 1],
    seed: 5230, // mode 0 → figure group
    draw: monumentTile,
    light: { kind: 'genericGlow', topZ: 32, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'triumph-of-the-human-spirit',
    match: /Triumph of the Human Spirit/i,
    foot: [1, 1],
    seed: 5231, // mode 1 → abstract black-granite form
    draw: monumentTile,
    light: { kind: 'genericGlow', topZ: 64, halfW: 0.3 },
  },
  {
    city: 'newyork',
    key: 'giuseppe-verdi-monument',
    match: /Giuseppe Verdi Monument/i,
    foot: [1, 1],
    seed: 5232, // mode 2 → figure-on-column
    draw: monumentTile,
    light: { kind: 'genericGlow', topZ: 70, halfW: 0.3 },
  },
  {
    city: 'newyork',
    key: 'general-worth-monument',
    match: /General Worth Monument/i,
    foot: [1, 1],
    seed: 5233,
    draw: memorialObeliskTile,
    light: { kind: 'aerialBeacon', topZ: 132, halfW: 0.12 },
  },
  {
    city: 'newyork',
    key: 'burnett-memorial-fountain',
    match: /Burnett Memorial Fountain/i,
    foot: [1, 1],
    seed: 5234,
    draw: fountainTile,
    light: { kind: 'genericGlow', topZ: 22, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'delacorte-musical-clock',
    match: /Delacorte Musical Clock/i,
    foot: [1, 1],
    seed: 5235,
    draw: delacorteClockTile,
    light: { kind: 'genericGlow', topZ: 64, halfW: 0.4 },
  },
  // --- round-2 civic / museum / special ------------------------------------
  {
    city: 'newyork',
    key: 'stonewall-inn',
    match: /Stonewall Inn/i,
    foot: [1, 1],
    seed: 5236,
    draw: stonewallTile,
    light: { kind: 'genericGlow', topZ: 34, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'lower-east-side-tenement-museum',
    match: /Lower East Side Tenement Museum/i,
    foot: [1, 1],
    seed: 5237,
    draw: rowhouseMuseumTile,
    light: { kind: 'genericGlow', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'yeshiva-university-museum',
    match: /Yeshiva University Museum/i,
    foot: [1, 1],
    seed: 5238,
    draw: rowhouseMuseumTile,
    light: { kind: 'genericGlow', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'museum-of-the-moving-image',
    match: /Museum of the Moving Image/i,
    foot: [1, 1],
    seed: 5239,
    draw: rowhouseMuseumTile,
    light: { kind: 'genericGlow', topZ: 56, halfW: 0.45 },
  },
  {
    city: 'newyork',
    key: 'storefront-for-art-and-architecture',
    match: /Storefront for Art and Architecture/i,
    foot: [1, 1],
    seed: 5240,
    draw: storefrontTile,
    light: { kind: 'genericGlow', topZ: 32, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: 'west-30th-street-heliport',
    match: /West 30th Street Heliport/i,
    foot: [2, 2],
    seed: 5241,
    draw: heliportTile,
    light: { kind: 'stadiumFlood', topZ: 60, halfW: 1.0 },
  },

  // =========================================================================
  //  ROUND 3 — the WORLD-FAMOUS NYC icons (placed in newyork.ts `named` by the
  //  enrichment pass): One WTC, Liberty, the Brooklyn Bridge, Grand Central,
  //  30 Rock, the Met / Whitney / Frick, MetLife, 432 Park, Hudson Yards
  //  (Vessel + 30 HY), Lincoln Center, the UN, Yankee Stadium, Coney Island.
  // =========================================================================
  {
    city: 'newyork',
    key: 'one-world-trade-center',
    // "One World Trade Center" / "1 WTC" — NOT the (gone) twin towers.
    match: /One World Trade Center|1 World Trade Center/i,
    foot: [2, 2],
    seed: 5301,
    draw: oneWtcTile,
    // the tapering glass spike — a spire beacon caps the 1776-ft mast.
    light: { kind: 'spireBeacon', topZ: 546, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'statue-of-liberty',
    match: /Statue of Liberty|Liberty Enlightening/i,
    foot: [2, 2],
    seed: 5302,
    draw: statueLibertyTile,
    // the upraised torch is the beacon (its real light); floodlit copper below.
    light: { kind: 'aerialBeacon', topZ: 240, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'brooklyn-bridge',
    match: /Brooklyn Bridge/i,
    foot: [4, 4],
    seed: 5303,
    draw: brooklynBridgeTile,
    // the floodlit twin gothic towers + the necklace-lit cables.
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.6 },
  },
  {
    city: 'newyork',
    key: 'grand-central-terminal',
    match: /Grand Central Terminal/i,
    foot: [3, 2],
    seed: 5304,
    draw: grandCentralTile,
    // floodlit Beaux-Arts facade + the glowing clock/sculpture group.
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.4 },
  },
  {
    city: 'newyork',
    key: 'rockefeller-center',
    // 30 Rock / Rockefeller Plaza / Comcast Building.
    match: /Rockefeller (Center|Plaza|Centre)|30 Rock|Comcast Building/i,
    foot: [2, 2],
    seed: 5305,
    draw: rockefellerTile,
    light: { kind: 'towerCrown', topZ: 356, halfW: 0.7 },
  },
  {
    city: 'newyork',
    key: 'metropolitan-museum-of-art',
    // the Met — be specific so it doesn't grab other "museum" names.
    match: /Metropolitan Museum/i,
    foot: [3, 3],
    seed: 5306,
    draw: metMuseumTile,
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.2 },
  },
  {
    city: 'newyork',
    key: 'whitney-museum',
    match: /Whitney Museum/i,
    foot: [2, 2],
    seed: 5307,
    draw: whitneyTile,
    light: { kind: 'towerCrown', topZ: 106, halfW: 0.8 },
  },
  {
    city: 'newyork',
    key: 'frick-collection',
    match: /Frick Collection|Frick Museum/i,
    foot: [2, 2],
    seed: 5308,
    draw: frickTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'newyork',
    key: 'metlife-building',
    // the MetLife Building / former Pan Am Building (NOT the MetLife Tower at
    // Madison Sq — this is 200 Park).
    match: /MetLife Building|Pan Am Building|200 Park/i,
    foot: [2, 2],
    seed: 5309,
    draw: metLifeTile,
    light: { kind: 'towerCrown', topZ: 300, halfW: 0.7 },
  },
  {
    city: 'newyork',
    key: '432-park-avenue',
    match: /432 Park/i,
    foot: [2, 2],
    seed: 5310,
    draw: park432Tile,
    light: { kind: 'towerCrown', topZ: 500, halfW: 0.32 },
  },
  {
    city: 'newyork',
    key: 'vessel-hudson-yards',
    match: /Vessel/i,
    foot: [1, 1],
    seed: 5311,
    draw: vesselTile,
    light: { kind: 'genericGlow', topZ: 100, halfW: 0.4 },
  },
  {
    city: 'newyork',
    key: '30-hudson-yards',
    match: /30 Hudson Yards/i,
    foot: [2, 2],
    seed: 5312,
    draw: hudsonYards30Tile,
    light: { kind: 'spireBeacon', topZ: 372, halfW: 0.5 },
  },
  {
    city: 'newyork',
    key: 'lincoln-center',
    match: /Lincoln Center|Lincoln Centre/i,
    foot: [3, 3],
    seed: 5313,
    draw: lincolnCenterTile,
    light: { kind: 'facadeFlood', topZ: 92, halfW: 1.3 },
  },
  {
    city: 'newyork',
    key: 'un-secretariat',
    match: /United Nations (Secretariat|Headquarters)|U\.?N\.? Secretariat/i,
    foot: [2, 2],
    seed: 5314,
    draw: unSecretariatTile,
    light: { kind: 'towerCrown', topZ: 290, halfW: 0.7 },
  },
  {
    city: 'newyork',
    key: 'yankee-stadium',
    match: /Yankee Stadium/i,
    foot: [3, 3],
    seed: 5315,
    draw: yankeeStadiumTile,
    light: { kind: 'stadiumFlood', topZ: 56, halfW: 1.6 },
  },
  {
    city: 'newyork',
    key: 'coney-wonder-wheel',
    match: /Wonder Wheel/i,
    foot: [2, 2],
    seed: 5316,
    draw: wonderWheelTile,
    // a colour-cycling LED rim — the fairground wheel lit.
    light: { kind: 'rimCycle', topZ: 150, halfW: 0.62 },
  },
  {
    city: 'newyork',
    key: 'coney-parachute-jump',
    match: /Parachute Jump/i,
    foot: [1, 1],
    seed: 5317,
    draw: parachuteJumpTile,
    light: { kind: 'aerialBeacon', topZ: 170, halfW: 0.14 },
  },
];
