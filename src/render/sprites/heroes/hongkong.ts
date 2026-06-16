// Hong Kong's bespoke-hero registry — ROUND 1 of the 100-hero target
// (docs/heroes/hongkong/ holds 100 researched landmarks; index.json ranks them).
// Each entry resolves a PLACED name from src/data/cities/hongkong.ts's `named`
// list (bilingual: native script + English) to a hand-built iso sprite + a
// bespoke night-electrification light.
//
// HONG KONG is the most VERTICAL city in the world: slim, very tall glass towers
// in TEAL / cool-grey, packed shoulder-to-shoulder against Victoria Harbour, lit
// at night by supertall beacons and a neon shimmer (Symphony of Lights). The
// signature heroes are sculptural towers whose SILHOUETTE alone reads:
//   • Bank of China Tower — the angular triangular-prism glass tower with its
//     crossed diagonal bracing and the twin mast antennae.
//   • HSBC Main Building — the exposed-structure "ladder" with its suspension
//     masts and the stepped sun-scoop atrium.
//   • Two IFC + ICC — the supertalls: slim, hugely tall, notched/tapered crowns
//     with beacons (ICC at 484 m is HK's tallest).
//   • Central Plaza — the gold-glass triangular prism with the pyramid-and-mast
//     top; The Center — the slim blue-glass tube with its lit vertical neon ribs.
//   • Tsim Sha Tsui Clock Tower; the Peak Tower (the "wok"/anvil viewing deck);
//     Tian Tan Big Buddha (seated bronze on its lotus + the long flight of steps);
//     Man Mo Temple; the Cultural Centre (the swooping wingless slope roof); the
//     Convention Centre (the great wing/bird roof over the harbour); Jardine
//     House (the "house of a thousand orifices" — round porthole windows).
//
// Two tiers of footprint truth: `foot` MUST equal each draw fn's own `new Iso`.
// Tall heroes use HEADROOM so they tower past the footprint-derived height cap.
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
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';

// --- shared Hong Kong palette (teal/cool-grey glass, steel, harbour) ----------
const TEAL = hex('#3f7f86'); // the city's signature teal curtain-wall glass
const TEAL_L = hex('#5ba0a6');
const TEAL_D = hex('#2c5e66');
const SLATEGLASS = hex('#4d6f86'); // cool blue-grey commercial glass
const SILVER = hex('#9fb2bd'); // bright aluminium mullion / silver glass
const STEELG = hex('#6c7a86'); // structural steel grey
const STONE = hex('#d3c9b4'); // colonial granite / Bauhaus render
const STONE_D = hex('#b3a98f');
const REDBRICK = hex('#9c5b46'); // temple / colonial brick + tile
const GOLDGLASS = hex('#c9a85a'); // Central Plaza's amber-gold glass
const GOLDGLASS_L = hex('#e3c878');
const BRONZE = hex('#8a6e4b'); // the Big Buddha bronze
const BRONZE_L = hex('#a98a5e');
const JADE = hex('#5b8c6e'); // temple roof green-tile / verdigris
const TILE_GREEN = hex('#3f6b54');
const NEON_TEAL = hex('#7fe6e0'); // the neon-ish HK night rim

// =====================================================================
// SHARED PRIMITIVES — small reusable bits; every hero builds its own massing.
// =====================================================================

/** A slim antenna mast + a beacon pip at a screen point (HK supertalls + BoC). */
function mast(iso: Iso, x: number, yBase: number, h: number, col: RGBA = SILVER): void {
  iso.r.line([x, yBase], [x, yBase - h * RES], 1.2 * RES, col);
  iso.r.line([x - 1.6 * RES, yBase - h * RES * 0.55], [x + 1.6 * RES, yBase - h * RES * 0.55], 0.9 * RES, col);
  iso.glint([x, yBase - h * RES], 1.8 * RES);
}

/** Faint horizontal floor banding across a curtain-wall face (u-edge or v-edge):
 *  ties the glass tower together so it reads as storeys, not a blank slab. */
function floorsLeft(iso: Iso, v: number, u0: number, u1: number, z0: number, z1: number, step: number): void {
  for (let z = z0 + step; z < z1; z += step) {
    iso.r.line(iso.P(u0, v, z), iso.P(u1, v, z), 0.4 * RES, alpha(COLORS.white, 0.16));
  }
}
function floorsRight(iso: Iso, u: number, v0: number, v1: number, z0: number, z1: number, step: number): void {
  for (let z = z0 + step; z < z1; z += step) {
    iso.r.line(iso.P(u, v0, z), iso.P(u, v1, z), 0.4 * RES, alpha(COLORS.white, 0.16));
  }
}

/** A small low podium under a tower (HK towers sit on retail/lobby podia). */
function podium(iso: Iso, u0: number, v0: number, u1: number, v1: number, h: number, col: RGBA = STEELG): void {
  iso.box(u0, v0, u1, v1, 0, h, col, { topC: lit(col, 0.06) });
}

// =====================================================================
// BANK OF CHINA TOWER — I.M. Pei's signature: a square base sliced by diagonals
// into rising triangular prisms of clear/teal glass, the famous X-bracing on the
// faces, stepping back to a single tall prism crowned by two slender masts. The
// silhouette is a faceted crystal that TWISTS upward. Slim 2×2, big headroom.
// =====================================================================
function bankOfChinaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 360 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.5, 0.3);
  const GL = hex('#cfe0e6'); // pale crystal glass
  const GLL = hex('#e8f1f4');
  const GLD = hex('#7f9fb0');
  // The tower as four quadrant-prisms that terminate at staggered heights — the
  // Pei "growing bamboo" set-back. We draw them back-to-front so the tall one
  // (north/back) reads behind, the short one (south/front) in front.
  // Each prism is a triangular wedge: a vertical box whose top is cut to a slope.
  const prism = (qu0: number, qv0: number, qu1: number, qv1: number, h: number, slopeTo: 'n' | 'e' | 's' | 'w'): void => {
    iso.box(qu0, qv0, qu1, qv1, 0, h, GL, { topC: GLL, leftC: GLD, rightC: lit(GL, 0.04) });
    // the sloped glass cap (a triangular plane to the apex edge)
    const apexZ = h + 70;
    let a: Pt, b: Pt, c: Pt;
    if (slopeTo === 'n') { a = iso.P(qu0, qv0, h); b = iso.P(qu1, qv0, h); c = iso.P((qu0 + qu1) / 2, qv1, apexZ); }
    else if (slopeTo === 's') { a = iso.P(qu0, qv1, h); b = iso.P(qu1, qv1, h); c = iso.P((qu0 + qu1) / 2, qv0, apexZ); }
    else if (slopeTo === 'e') { a = iso.P(qu1, qv0, h); b = iso.P(qu1, qv1, h); c = iso.P(qu0, (qv0 + qv1) / 2, apexZ); }
    else { a = iso.P(qu0, qv0, h); b = iso.P(qu0, qv1, h); c = iso.P(qu1, (qv0 + qv1) / 2, apexZ); }
    iso.r.poly([a, b, c], lit(GL, 0.12));
    iso.r.polyline([a, c, b], INK_W * 0.7, alpha(INK, 0.8));
  };
  // Draw back-to-front so the tall prism (front-right quadrant) is NOT occluded
  // and its full triangular body — base to single sharp peak — stays visible,
  // with the masts sitting right on that peak (the BoC's defining read).
  // back quadrants (lower), drawn first so they sit behind
  prism(u0, v0, cx, cy, 150, 'n'); // back-left
  prism(cx, v0, u1, cy, 200, 'e'); // back-right
  prism(u0, cy, cx, v1, 110, 'w'); // front-left (lowest, slopes to viewer)
  // the TALL front-right prism, drawn LAST (fully visible), slopes 's' so its
  // apex faces back-up — a clean single spike carrying the antennae.
  prism(cx, cy, u1, v1, 300, 's');
  // The signature crossed X-bracing on the two visible faces, drawn as bright
  // diagonal seams up the whole mass (the BoC's defining graphic).
  const faceX = (uA: number, vA: number, uB: number, vB: number, zb: number, zt: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const z0 = zb + ((zt - zb) * i) / n;
      const z1 = zb + ((zt - zb) * (i + 1)) / n;
      iso.r.line(iso.P(uA, vA, z0), iso.P(uB, vB, z1), 0.9 * RES, alpha(COLORS.white, 0.5));
      iso.r.line(iso.P(uA, vA, z1), iso.P(uB, vB, z0), 0.9 * RES, alpha(COLORS.white, 0.5));
      // the bracing nodes catch teal
      iso.r.line(iso.P(uA, vA, z0), iso.P(uB, vB, z0), 0.5 * RES, alpha(TEAL_L, 0.4));
    }
  };
  // X-bracing on the tall front-right prism's two visible faces (its defining
  // graphic). Front-right prism spans (cx,cy)–(u1,v1); its v1 wall + u1 wall.
  faceX(cx, v1, u1, v1, 8, 290, 8); // front (v1) face of the tall prism
  faceX(u1, cy, u1, v1, 8, 290, 8); // right (u1) face of the tall prism
  // the twin masts rising from the tall prism's SHARP PEAK (the cap tip). The
  // tall front-right prism slopes 's': its triangular cap rises from the box top
  // (z=300) along edge v1→v0 to the apex at ((cx+u1)/2, cy, 370). Plant the
  // masts right at that apex so they spring straight from the visible spike.
  const peak = iso.P((cx + u1) / 2, cy, 370);
  const HM = hex('#cdd8de'); // bright steel that catches the light
  iso.r.line([peak[0] - 1.5 * RES, peak[1]], [peak[0] - 1.5 * RES, peak[1] - 78 * RES], 1.4 * RES, HM);
  iso.r.line([peak[0] + 1.5 * RES, peak[1]], [peak[0] + 1.5 * RES, peak[1] - 60 * RES], 1.4 * RES, HM);
  iso.glint([peak[0] - 1.5 * RES, peak[1] - 78 * RES], 2 * RES);
  iso.glint([peak[0] + 1.5 * RES, peak[1] - 60 * RES], 1.6 * RES);
  return iso.build();
}

// =====================================================================
// HSBC MAIN BUILDING — Foster's high-tech machine: stacked suspension "coathanger"
// trusses hung between paired steel masts, the open belly atrium with the sun-
// scoop, ladder-like exposed structure, stepping back in three vertical bays.
// Steely grey + aluminium, NOT a glass curtain. 2×2.
// =====================================================================
function hsbcTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 250 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.4, 0.28);
  const STL = hex('#8e99aa'); // aluminium grey
  const STLD = hex('#5c6a78');
  const H = 190;
  // the building is a slab; massing steps back in three storeyed bands
  iso.box(u0, v0, u1, v1, 0, H * 0.34, STL, { leftC: STLD });
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, H * 0.34, H * 0.66, STL, { leftC: STLD });
  iso.box(u0 + 0.14, v0 + 0.14, u1 - 0.14, v1 - 0.14, H * 0.66, H, STL, { leftC: STLD });
  // the open undercroft (the famous public plaza beneath — a dark void at base)
  iso.box(u0 + 0.18, v0 + 0.18, u1 - 0.18, v1 - 0.18, 0, 18, alpha(COLORS.glassDark, 0.85), { ink: false });
  // the exposed "ladder" structure: paired masts at quarter points + the
  // suspension truss bands strung between them (the coathanger floors).
  for (const mu of [u0 + 0.04, (u0 + u1) / 2, u1 - 0.04] as const) {
    // mast columns up the front face (v1) and right face read as a steel frame
    iso.r.line(iso.P(mu, v1, 0), iso.P(mu, v1, H + 16), 1.6 * RES, STLD);
    iso.r.line(iso.P(mu + 0.015, v1, 0), iso.P(mu + 0.015, v1, H + 16), 1 * RES, lighten(STL, 0.1));
  }
  // the horizontal truss bands (the double-height coathanger trusses)
  for (const z of [H * 0.16, H * 0.34, H * 0.5, H * 0.66, H * 0.82] as const) {
    iso.r.line(iso.P(u0 + 0.02, v1, z), iso.P(u1 - 0.02, v1, z), 1.8 * RES, STLD);
    iso.r.line(iso.P(u0 + 0.02, v1, z + 4), iso.P(u1 - 0.02, v1, z + 4), 0.7 * RES, alpha(COLORS.white, 0.4));
    // the diagonal truss webs
    iso.r.line(iso.P(u0 + 0.04, v1, z), iso.P(u0 + 0.18, v1, z + 16), 0.7 * RES, alpha(COLORS.white, 0.35));
    iso.r.line(iso.P(u1 - 0.18, v1, z), iso.P(u1 - 0.04, v1, z + 16), 0.7 * RES, alpha(COLORS.white, 0.35));
  }
  floorsRight(iso, u1, v0, v1, 8, H, 12);
  // the twin maintenance masts rising above the roof
  const [mx, myB] = iso.P(u0 + 0.3, v0 + 0.3, H);
  mast(iso, mx, myB, 70, SILVER);
  const [mx2, myB2] = iso.P(u1 - 0.3, v0 + 0.3, H);
  mast(iso, mx2, myB2, 64, SILVER);
  return iso.build();
}

// =====================================================================
// SUPERTALL — a slim, hugely tall curtain-wall tower (ICC 484 m / Two IFC 412 m):
// a tapering shaft of cool glass with a stepped/notched crown and a beacon. The
// tallest things on the HK map; very slim footprint so they spike skyward.
// Parameterised by height + crown style + glass colour. 2×2.
// =====================================================================
function supertallTile(seed: number, opts: { h: number; glass: RGBA; crown: 'notch' | 'taper' | 'curve'; mastH: number }): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 460 });
  void seed;
  const { h, glass, crown, mastH } = opts;
  const gl = glass, glL = lit(glass, 0.1), glD = shaded(glass, 0.16);
  // the shaft tapers slightly inward toward the crown (set-backs at thirds)
  const b0 = 0.34, b1 = 1.66; // wide base
  const t0 = 0.46, t1 = 1.54; // narrower mid
  const c0 = 0.56, c1 = 1.44; // crown
  iso.shadow(b0, b0, b1, b1, 0.6, 0.32);
  // a darker teal plinth band grounds the shaft (the HK podium shade)
  iso.box(b0 - 0.02, b0 - 0.02, b1 + 0.02, b1 + 0.02, 0, 18, TEAL_D, { ink: false });
  iso.box(b0, b0, b1, b1, 0, h * 0.4, gl, { topC: glL, leftC: glD, rightC: lit(gl, 0.04) });
  iso.box(t0, t0, t1, t1, h * 0.4, h * 0.82, gl, { topC: glL, leftC: glD, rightC: lit(gl, 0.04) });
  iso.box(c0, c0, c1, c1, h * 0.82, h, gl, { topC: glL, leftC: glD, rightC: lit(gl, 0.04) });
  // facet seams + floor banding so the glass reads as a tower not a prism
  floorsLeft(iso, b1, b0, b1, 8, h * 0.4, 14);
  floorsLeft(iso, t1, t0, t1, h * 0.4, h * 0.82, 13);
  floorsRight(iso, b1, b0, b1, 8, h * 0.4, 14);
  floorsRight(iso, t1, t0, t1, h * 0.4, h * 0.82, 13);
  // a gleam on the crown's sun-facing rim so the supertall catches the dusk
  iso.gleam(iso.P(c1, c0, h), iso.P(c1, c1, h), 1.1 * RES);
  // bright vertical mullion accents up the corners (the HK supertall sheen)
  for (const [uu, vv] of [[b1, b1], [t1, t0]] as const) {
    iso.r.line(iso.P(uu, vv, 8), iso.P(uu, vv, h * 0.8), 0.8 * RES, alpha(SILVER, 0.5));
  }
  const cm = (c0 + c1) / 2;
  const [cxp, cyB] = iso.P(cm, cm, h);
  if (crown === 'notch') {
    // ICC: a notched, stepped parapet crown — four little pinnacle prisms
    for (const [du, dv] of [[c0, c0], [c1, c0], [c0, c1], [c1, c1]] as const) {
      iso.box(du - 0.06, dv - 0.06, du + 0.06, dv + 0.06, h, h + 24, glL, { ink: false });
    }
    iso.box(c0 + 0.12, c0 + 0.12, c1 - 0.12, c1 - 0.12, h, h + 14, glD, { ink: false });
    mast(iso, cxp, cyB - 24 * RES, mastH, SILVER);
  } else if (crown === 'taper') {
    // Two IFC: the curved, fingered crown — a cluster of tapering blades
    for (const off of [-0.14, -0.05, 0.05, 0.14] as const) {
      const bx = cxp + off * (CELL_W / 2);
      iso.r.poly([[bx - 2.4 * RES, cyB], [bx + 2.4 * RES, cyB], [bx, cyB - (34 - Math.abs(off) * 80) * RES]], lit(gl, 0.16));
    }
    mast(iso, cxp, cyB, mastH, SILVER);
  } else {
    // a gentle domed/curved cap
    iso.box(c0 + 0.08, c0 + 0.08, c1 - 0.08, c1 - 0.08, h, h + 18, glL);
    mast(iso, cxp, cyB - 18 * RES, mastH, SILVER);
  }
  return iso.build();
}

// =====================================================================
// CENTRAL PLAZA — the gold-glass triangular-prism tower: a tall triangular shaft
// of amber/gold curtain glass, chamfered corners, crowned by a glass pyramid and
// a tall mast that carries the "lightbar" clock. 374 m. Slim 2×2 + big headroom.
// =====================================================================
function centralPlazaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 420 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.42, v1 = 1.58;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.55, 0.3);
  const GG = GOLDGLASS, GGL = GOLDGLASS_L, GGD = shaded(GOLDGLASS, 0.18);
  const H = 300;
  // a triangular-section shaft: build it as a box with the SW corner chamfered
  // off (a bevel face) so the plan reads triangular rather than square.
  iso.box(u0, v0, u1, v1, 0, H, GG, { topC: GGL, leftC: GGD, rightC: lit(GG, 0.05) });
  // the chamfer: a bright bevel plane cutting the near (south-west) vertical edge
  iso.r.poly([iso.P(u0, cy, 8), iso.P(cx, v1, 8), iso.P(cx, v1, H), iso.P(u0, cy, H)], lit(GG, 0.14));
  // gold mullions + floor banding (the amber glow that defines it)
  floorsLeft(iso, v1, u0, u1, 8, H, 13);
  floorsRight(iso, u1, v0, v1, 8, H, 13);
  for (const uu of [u0 + 0.28, u0 + 0.58, u0 + 0.88] as const) {
    iso.r.line(iso.P(uu, v1, 8), iso.P(uu, v1, H), 0.7 * RES, alpha(GGL, 0.55));
  }
  // the crowning glass pyramid
  const apex = iso.P(cx, cy, H + 54);
  const c0 = iso.P(u0 + 0.18, v1 - 0.18, H);
  const c1 = iso.P(u1 - 0.18, v1 - 0.18, H);
  const c2 = iso.P(u1 - 0.18, v0 + 0.18, H);
  iso.r.poly([c0, c1, apex], lit(GG, 0.18));
  iso.r.poly([c1, c2, apex], lit(GG, 0.28));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, alpha(INK, 0.8));
  // the tall mast (carries the Central Plaza neon clock bars)
  mast(iso, apex[0], apex[1], 70, SILVER);
  return iso.build();
}

// =====================================================================
// THE CENTRE / SLIM LIT-TUBE TOWER — a very slim square shaft of blue glass with
// strong vertical neon ribs that change colour at night (The Center's signature
// rainbow shaft); a stepped little crown. Serves The Centre + other slim towers.
// 2×2 (drawn slim) + headroom.
// =====================================================================
function slimNeonTowerTile(seed: number, glass: RGBA, h: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 420 });
  void seed;
  const u0 = 0.6, u1 = 1.4, v0 = 0.6, v1 = 1.4; // slim square
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.5, 0.3);
  const gl = glass, glL = lit(glass, 0.1), glD = shaded(glass, 0.18);
  iso.box(u0, v0, u1, v1, 0, h, gl, { topC: glL, leftC: glD, rightC: lit(gl, 0.05) });
  // strong vertical neon ribs (the colour-changing pinstripes) up both faces
  for (const uu of [u0 + 0.12, u0 + 0.4, u0 + 0.68] as const) {
    iso.r.line(iso.P(uu, v1, 8), iso.P(uu, v1, h - 6), 0.9 * RES, alpha(NEON_TEAL, 0.45));
  }
  for (const vv of [v0 + 0.12, v0 + 0.4, v0 + 0.68] as const) {
    iso.r.line(iso.P(u1, vv, 8), iso.P(u1, vv, h - 6), 0.9 * RES, alpha(NEON_TEAL, 0.4));
  }
  floorsLeft(iso, v1, u0, u1, 8, h, 14);
  // a small stepped crown + a short mast
  iso.box(u0 + 0.08, v0 + 0.08, u1 - 0.08, v1 - 0.08, h, h + 20, glL);
  const [cxp, cyB] = iso.P(cx, cy, h + 20);
  mast(iso, cxp, cyB, 48, SILVER);
  return iso.build();
}

// =====================================================================
// CYLINDER TOWER (HOPEWELL CENTRE) — HK's first circular skyscraper: a tall
// smooth cylinder of pale glass banded by storeys, a slightly domed top with a
// mast. 222 m. 3×3 + headroom.
// =====================================================================
function cylinderTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 360 });
  void seed;
  const cx = 1.5, cy = 1.5;
  iso.shadow(0.7, 0.7, 2.3, 2.3, 0.55, 0.3);
  const GL = hex('#c4d4dc'), GLD = hex('#7d97a6');
  const H = 260;
  const R = 0.7 * (CELL_W / 2); // screen radius
  const [bx, byB] = iso.P(cx, cy, 0);
  const yAt = (z: number): number => byB - z * RES;
  // the cylinder body: a tall capsule (two vertical edges + top/bottom ellipses)
  const ringN = 24;
  const ellipse = (z: number, s = 1): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= ringN; i++) {
      const a = (i / ringN) * Math.PI * 2;
      pts.push([bx + Math.cos(a) * R * s, yAt(z) + Math.sin(a) * R * 0.42 * s]);
    }
    return pts;
  };
  // body as a filled rect between the two side tangents, shaded left→right
  iso.r.poly([[bx - R, yAt(8)], [bx + R, yAt(8)], [bx + R, yAt(H)], [bx - R, yAt(H)]], GL, GLD);
  // lit eastern flank
  iso.r.poly([[bx + R * 0.2, yAt(8)], [bx + R, yAt(8)], [bx + R, yAt(H)], [bx + R * 0.2, yAt(H)]], alpha(lit(GL, 0.1), 0.6));
  // storey bands (concentric ellipse arcs up the shaft) — the Hopewell rings
  for (let z = 18; z < H; z += 13) {
    iso.r.polyline(ellipse(z), 0.45 * RES, alpha(COLORS.white, 0.22));
  }
  // top dome + base
  iso.r.poly(ellipse(H), top(GL, 0.2));
  iso.r.polyline(ellipse(H), INK_W * 0.7, alpha(INK, 0.8), true);
  iso.r.line([bx - R, yAt(8)], [bx - R, yAt(H)], INK_W * 0.7, alpha(INK, 0.7));
  iso.r.line([bx + R, yAt(8)], [bx + R, yAt(H)], INK_W * 0.7, alpha(INK, 0.7));
  mast(iso, bx, yAt(H), 56, SILVER);
  return iso.build();
}

// =====================================================================
// LIPPO CENTRE — Paul Rudolph's "koala in a tree" twin towers: two slender
// brutalist shafts whose facades step out in clustered, rounded bay-window
// blocks (the koala lumps clinging to the trunk). Cool blue-grey glass. 3×3.
// =====================================================================
function lippoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 320 });
  void seed;
  iso.shadow(0.5, 0.5, 2.5, 2.5, 0.5, 0.3);
  const GL = SLATEGLASS, GLD = shaded(SLATEGLASS, 0.18);
  // two towers, one taller (Tower I) and slightly forward of the other
  const tower = (cu: number, cv: number, h: number): void => {
    const w = 0.34;
    iso.box(cu - w, cv - w, cu + w, cv + w, 0, h, GL, { topC: lit(GL, 0.08), leftC: GLD });
    floorsLeft(iso, cv + w, cu - w, cu + w, 8, h, 13);
    floorsRight(iso, cu + w, cv - w, cv + w, 8, h, 13);
    // the "koala bears clinging to a tree": clustered bay-window blocks that
    // hug the shaft in a STACKED run up both visible faces, each projecting a
    // little and offset left/right so they read as the lumpy Lippo cluster, not
    // separate cubes. Many small bays, tightly stacked, the Rudolph signature.
    const nBays = 7;
    for (let i = 0; i < nBays; i++) {
      const z0 = h * 0.12 + (h * 0.72 * i) / nBays;
      const z1 = z0 + (h * 0.72) / nBays - 2;
      const off = (i % 3) * 0.07; // bays clamber up in a staggered cluster
      // front (v) face bay
      iso.box(cu - 0.2 + off, cv + w, cu + 0.04 + off, cv + w + 0.1, z0, z1, lit(GL, 0.04), { topC: lit(GL, 0.12) });
      // right (u) face bay (offset the other way)
      iso.box(cu + w, cv - 0.04 - off, cu + w + 0.1, cv + 0.2 - off, z0, z1, GL, { topC: lit(GL, 0.1) });
    }
  };
  tower(1.0, 1.2, 250); // Tower I (taller, forward)
  tower(1.78, 1.8, 215); // Tower II (set back)
  // a low shared podium (kept low so the towers dominate)
  podium(iso, 0.6, 0.6, 2.4, 2.4, 16, STEELG);
  return iso.build();
}

// =====================================================================
// EXCHANGE SQUARE — three pink-granite-and-glass towers on a raised podium, the
// faces a chequer of round-cornered window bands. The HK Stock Exchange. Broad
// 5×5 complex. The placed name footprint is large (~5.4 tiles).
// =====================================================================
function exchangeSquareTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 300 });
  void seed;
  iso.shadow(0.6, 0.6, 4.4, 4.4, 0.7, 0.3);
  const GRAN = hex('#b98a86'); // the warm pink granite
  const GRAND = shaded(GRAN, 0.16);
  const GL = hex('#86a0b0');
  // the big stepped podium
  podium(iso, 0.5, 0.5, 4.5, 4.5, 40, hex('#9a8a86'));
  // three towers of differing heights, granite piers + glass infill bands
  const tower = (cu: number, cv: number, w: number, h: number): void => {
    iso.box(cu - w, cv - w, cu + w, cv + w, 40, h, GRAN, { topC: lit(GRAN, 0.08), leftC: GRAND });
    // alternating granite/glass storey bands on the front face
    for (let z = 50; z < h - 10; z += 18) {
      iso.r.poly([iso.P(cu - w + 0.04, cv + w, z), iso.P(cu + w - 0.04, cv + w, z), iso.P(cu + w - 0.04, cv + w, z + 9), iso.P(cu - w + 0.04, cv + w, z + 9)], alpha(GL, 0.8));
    }
  };
  tower(1.5, 1.7, 0.55, 220);
  tower(2.9, 1.6, 0.55, 240);
  tower(2.3, 3.0, 0.55, 200);
  return iso.build();
}

// =====================================================================
// CHEUNG KONG CENTER — César Pelli's crisp aluminium-and-glass rectangular slab,
// a simple very-tall box with a flat top and a grid of lit windows (it sits
// between HSBC and BoC). 283 m. 2×2 + headroom.
// =====================================================================
function cheungKongTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 400 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.55, 0.3);
  const GL = hex('#8fb0bf'), GLD = shaded(hex('#8fb0bf'), 0.16);
  const H = 290;
  iso.box(u0, v0, u1, v1, 0, H, GL, { topC: lit(GL, 0.1), leftC: GLD, rightC: lit(GL, 0.04) });
  // the crisp glazing grid (vertical mullions + floor lines, very regular)
  for (let i = 1; i < 8; i++) {
    const uu = u0 + ((u1 - u0) * i) / 8;
    iso.r.line(iso.P(uu, v1, 8), iso.P(uu, v1, H - 4), 0.5 * RES, alpha(SILVER, 0.4));
  }
  for (let i = 1; i < 8; i++) {
    const vv = v0 + ((v1 - v0) * i) / 8;
    iso.r.line(iso.P(u1, vv, 8), iso.P(u1, vv, H - 4), 0.5 * RES, alpha(SILVER, 0.32));
  }
  floorsLeft(iso, v1, u0, u1, 8, H, 12);
  // the lit roof feature line (Pelli's crowns glow at night)
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, H, H + 10, lit(GL, 0.16));
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H), 1.2 * RES);
  const [cxp, cyB] = iso.P((u0 + u1) / 2, (v0 + v1) / 2, H + 10);
  mast(iso, cxp, cyB, 34, SILVER);
  return iso.build();
}

// =====================================================================
// JARDINE HOUSE — "the house of a thousand orifices": a tall silver slab whose
// entire facade is a dense grid of round PORTHOLE windows (its unmistakable
// signature). 178 m. 2×2 + headroom.
// =====================================================================
function jardineHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 260 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.45, 0.3);
  const AL = hex('#aebcc4'), ALD = shaded(hex('#aebcc4'), 0.16);
  const H = 190;
  iso.box(u0, v0, u1, v1, 0, H, AL, { topC: lit(AL, 0.1), leftC: ALD, rightC: lit(AL, 0.04) });
  // the round porthole windows — a grid of dark circles on both visible faces
  const portholes = (face: 'v' | 'u'): void => {
    const cols = 5, rows = 16;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const t = 0.12 + (c / (cols - 1)) * 0.76; // along the face
        const z = 16 + (r / (rows - 1)) * (H - 30);
        const p = face === 'v' ? iso.P(u0 + (u1 - u0) * t, v1, z) : iso.P(u1, v0 + (v1 - v0) * t, z);
        iso.r.line([p[0] - 1.5 * RES, p[1]], [p[0] + 1.5 * RES, p[1]], 1.5 * RES, alpha(COLORS.glassDark, 0.8));
      }
    }
  };
  portholes('v');
  portholes('u');
  return iso.build();
}

// =====================================================================
// PEAK TOWER — the anvil / "wok" viewing deck on Victoria Peak: a curved
// concave-topped building flaring out at the top (a bowl held up on a tapering
// base), set on the green peak. Its silhouette is the upturned wok. 2×2.
// =====================================================================
function peakTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const cx = 1.0, cy = 1.0;
  iso.shadow(0.5, 0.5, 1.5, 1.5, 0.3, 0.26);
  // a green peak plinth
  iso.box(0.42, 0.42, 1.58, 1.58, 0, 8, shaded(COLORS.grass, 0.1), { ink: false });
  const GL = hex('#9fb3bd'), GLD = shaded(hex('#9fb3bd'), 0.16);
  // the tapering base (narrow at the waist)
  iso.box(0.66, 0.66, 1.34, 1.34, 8, 56, GL, { leftC: GLD, topC: lit(GL, 0.06) });
  floorsLeft(iso, 1.34, 0.66, 1.34, 12, 56, 12);
  // the flaring "wok" deck: a wide shallow bowl that overhangs the base, drawn
  // as a broad box with a concave (dished) top edge.
  const [bx, byB] = iso.P(cx, cy, 56);
  const W = 0.92 * (CELL_W / 2);
  // the underside of the overhanging rim
  iso.r.poly([[bx - W, byB], [bx + W, byB], [bx + W * 0.7, byB + 10 * RES], [bx - W * 0.7, byB + 10 * RES]], GLD);
  // the deck box
  iso.box(0.5, 0.5, 1.5, 1.5, 56, 86, GL, { leftC: GLD, topC: lit(GL, 0.1) });
  // the concave dish on top (the wok hollow) — a dark ellipse pressed in
  const [tx, tyB] = iso.P(cx, cy, 86);
  iso.r.poly(
    [[tx - W, tyB], [tx, tyB - 6 * RES], [tx + W, tyB], [tx, tyB + 6 * RES]],
    shaded(GL, 0.1),
  );
  iso.r.poly(
    [[tx - W * 0.6, tyB], [tx, tyB - 4 * RES], [tx + W * 0.6, tyB], [tx, tyB + 4 * RES]],
    alpha(COLORS.glassSky, 0.7),
  );
  iso.r.polyline([[tx - W, tyB], [tx, tyB - 6 * RES], [tx + W, tyB], [tx, tyB + 6 * RES]], INK_W * 0.7, alpha(INK, 0.75), true);
  return iso.build();
}

// =====================================================================
// TIAN TAN BIG BUDDHA — the great seated bronze Buddha on a three-tier lotus
// throne atop a broad podium reached by a long flight of steps. A bronze figure
// (head, shoulders, lap, one raised hand) on the green hill. 3×3.
// =====================================================================
function bigBuddhaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 300 });
  void seed;
  const cx = 1.5, cy = 1.5;
  iso.shadow(0.6, 0.6, 2.4, 2.4, 0.5, 0.28);
  // green hilltop
  iso.box(0.4, 0.4, 2.6, 2.6, 0, 10, shaded(COLORS.grass, 0.08), { ink: false });
  // the long flight of approach steps on the front (v) face
  for (let i = 0; i < 9; i++) {
    const z = 10 + i * 5;
    iso.box(1.1, 2.4 - i * 0.04, 1.9, 2.6 - i * 0.04, z, z + 5, STONE, { ink: false });
  }
  // the broad three-tier podium
  iso.box(0.7, 0.7, 2.3, 2.3, 10, 30, STONE, { topC: lit(STONE, 0.06), leftC: STONE_D });
  iso.box(0.85, 0.85, 2.15, 2.15, 30, 48, STONE, { topC: lit(STONE, 0.08), leftC: STONE_D });
  // the lotus throne (a flared ring of petals) — a tapered drum with petal ticks
  const lotusZ = 48;
  iso.box(1.05, 1.05, 1.95, 1.95, lotusZ, lotusZ + 26, BRONZE_L, { topC: lit(BRONZE_L, 0.1), leftC: shaded(BRONZE_L, 0.16) });
  const [lx, lyB] = iso.P(cx, cy, lotusZ);
  for (let i = 0; i < 9; i++) {
    const fx = lx - 24 * RES + i * 6 * RES;
    iso.r.poly([[fx, lyB], [fx + 5 * RES, lyB], [fx + 2.5 * RES, lyB - 7 * RES]], alpha(BRONZE, 0.85));
  }
  // the seated Buddha: a bronze mass — crossed-leg lap (wide), torso, shoulders,
  // and the head, with one raised right hand (abhaya mudra).
  const bodyZ0 = lotusZ + 26;
  // lap (widest)
  iso.box(1.12, 1.12, 1.88, 1.88, bodyZ0, bodyZ0 + 22, BRONZE, { topC: lit(BRONZE, 0.08), leftC: darken(BRONZE, 0.12) });
  // torso (narrower)
  iso.box(1.25, 1.25, 1.75, 1.75, bodyZ0 + 22, bodyZ0 + 70, BRONZE, { topC: lit(BRONZE, 0.1), leftC: darken(BRONZE, 0.12) });
  // shoulders (slight widen)
  iso.box(1.2, 1.2, 1.8, 1.8, bodyZ0 + 70, bodyZ0 + 84, BRONZE_L, { topC: lit(BRONZE_L, 0.1), leftC: shaded(BRONZE_L, 0.14) });
  // the head — a rounded bronze mass with the ushnisha crown-bump, drawn large
  // enough to read as a seated Buddha's head from afar.
  const [hx, hyB] = iso.P(cx, cy, bodyZ0 + 84);
  const HW = 12 * RES, HH = 30 * RES;
  // a neck
  iso.r.rect(hx - 5 * RES, hyB - 6 * RES, hx + 5 * RES, hyB + 2 * RES, BRONZE);
  // the head (rounded — an octagon)
  const head: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * (i / 8) - Math.PI / 2;
    head.push([hx + Math.cos(a) * HW, hyB - HH * 0.5 + Math.sin(a) * HH * 0.5]);
  }
  iso.r.poly(head, BRONZE_L);
  iso.r.polyline(head, INK_W * 0.7, alpha(INK, 0.8), true);
  // the ushnisha (top-knot) crowning the head
  iso.r.poly([[hx - 4 * RES, hyB - HH + 2 * RES], [hx + 4 * RES, hyB - HH + 2 * RES], [hx, hyB - HH - 8 * RES]], lit(BRONZE_L, 0.08));
  iso.glint([hx + HW * 0.3, hyB - HH * 0.55], 2 * RES);
  // the raised right hand (abhaya mudra) on the screen-left, a bronze forearm
  const [px, pyB] = iso.P(1.22, 1.5, bodyZ0 + 50);
  iso.r.line([px, pyB], [px - 2 * RES, pyB - 30 * RES], 4 * RES, BRONZE);
  iso.r.line([px - 2 * RES, pyB - 30 * RES], [px - 2 * RES, pyB - 40 * RES], 5 * RES, BRONZE_L); // open palm
  iso.glint([px - 2 * RES, pyB - 40 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// HK CONVENTION & EXHIBITION CENTRE — the great curved "bird-wing" / lotus-leaf
// roof sweeping out over Victoria Harbour on its reclaimed peninsula. A low broad
// glass mass under huge swooping aluminium roof shells. The Handover building.
// Broad 5×5 on the water's edge.
// =====================================================================
function conventionCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 160 });
  void seed;
  iso.shadow(0.5, 0.5, 4.5, 4.5, 0.6, 0.28);
  const GL = hex('#7fa0b2'), GLD = shaded(hex('#7fa0b2'), 0.16);
  const AL = hex('#aeb9c0'); // the aluminium roof
  // the low glass podium block
  iso.box(0.5, 0.5, 4.5, 4.5, 0, 34, GL, { topC: lit(GL, 0.06), leftC: GLD });
  floorsLeft(iso, 4.5, 0.5, 4.5, 8, 34, 12);
  // the two great swooping roof shells (the wing). Each shell is a curved ribbon
  // rising from a low eave to a high ridge then dipping — drawn as a filled
  // multi-point strip following a sine sweep across the u axis.
  const shell = (vMid: number, peak: number, col: RGBA): void => {
    const front: Pt[] = [];
    const back: Pt[] = [];
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const u = 0.4 + t * 4.2;
      const z = 34 + Math.sin(t * Math.PI) * peak; // rise to a crest mid-span
      front.push(iso.P(u, vMid + 0.5, z));
      back.unshift(iso.P(u, vMid - 0.5, z + 6));
    }
    iso.r.poly([...front, ...back], col, shaded(col, 0.16));
    iso.r.polyline(front, INK_W * 0.7, alpha(INK, 0.7));
    // ribs across the shell
    for (let i = 1; i < N; i += 2) {
      const t = i / N;
      const u = 0.4 + t * 4.2;
      const z = 34 + Math.sin(t * Math.PI) * peak;
      iso.r.line(iso.P(u, vMid - 0.5, z + 6), iso.P(u, vMid + 0.5, z), 0.6 * RES, alpha(COLORS.white, 0.3));
    }
  };
  shell(1.6, 70, AL); // the big front wing
  shell(3.2, 56, lighten(AL, 0.04)); // the second wing behind
  return iso.build();
}

// =====================================================================
// HK CULTURAL CENTRE — the controversial windowless concert hall: a long low
// building under a great swooping double-curved tiled roof that slopes down to
// the harbour, clad in pink-beige tiles, NO harbour-facing windows. 4×4.
// =====================================================================
function culturalCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 150 });
  void seed;
  iso.shadow(0.5, 0.5, 3.5, 3.5, 0.55, 0.28);
  const TILE = hex('#d6b09c'); // the pinkish wall tile (lifted so the roof reads at dusk)
  const TILED = shaded(TILE, 0.14);
  // the long windowless body
  iso.box(0.5, 0.5, 3.5, 3.5, 0, 44, TILE, { topC: lit(TILE, 0.06), leftC: TILED });
  // the great swooping roof: two slopes meeting at a curved ridge that dips at
  // the ends (the upturned-eave wing). Drawn as a wide curved gable along u.
  const ridge: Pt[] = [];
  const eaveF: Pt[] = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 0.5 + t * 3.0;
    const rz = 44 + 30 + Math.sin(t * Math.PI) * 22; // ridge bows up in the middle
    ridge.push(iso.P(u, 2.0, rz));
    eaveF.unshift(iso.P(u, 3.5, 44));
  }
  iso.r.poly([...ridge, ...eaveF], lit(TILE, 0.08), TILED); // near (front) slope
  // far slope just peeking above the ridge
  const eaveB: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 0.5 + t * 3.0;
    eaveB.push(iso.P(u, 0.5, 44));
  }
  iso.r.poly([...eaveB, ...[...ridge].reverse()], top(TILE, 0.2));
  iso.r.polyline(ridge, INK_W * 0.8, alpha(INK, 0.8));
  // tile courses raking up the near slope
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const u = 0.5 + t * 3.0;
    const rz = 44 + 30 + Math.sin(t * Math.PI) * 22;
    iso.r.line(iso.P(u, 2.0, rz), iso.P(u, 3.5, 44), 0.5 * RES, alpha(STONE_D, 0.4));
  }
  return iso.build();
}

// =====================================================================
// TSIM SHA TSUI CLOCK TOWER — the lone red-brick + granite campanile (all that
// remains of the old Kowloon Station): a square tapering brick shaft with stone
// quoins, a clock face, an open belfry, and a little domed cupola + finial.
// Slim 1×1 with headroom.
// =====================================================================
function clockTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 240 });
  void seed;
  const u = 0.5, v = 0.52, b = 0.2;
  const H = 150;
  iso.shadow(u - b, v - b * 0.4, u + b, v + b, 0.4, 0.26);
  // a small granite base
  iso.box(u - 0.28, v - 0.28, u + 0.28, v + 0.28, 0, 14, STONE, { topC: lit(STONE, 0.06), leftC: STONE_D });
  // the tapering red-brick shaft (two diminishing stages)
  iso.box(u - b, v - b, u + b, v + b, 14, H * 0.66, REDBRICK, { topC: lit(REDBRICK, 0.06), leftC: shaded(REDBRICK, 0.16) });
  iso.box(u - b * 0.9, v - b * 0.9, u + b * 0.9, v + b * 0.9, H * 0.66, H * 0.86, REDBRICK, { leftC: shaded(REDBRICK, 0.16) });
  // stone quoins up the corners + a string course
  iso.r.line(iso.P(u - b, v + b, 14), iso.P(u - b, v + b, H * 0.66), 1 * RES, alpha(STONE, 0.7));
  iso.r.line(iso.P(u + b, v + b, 14), iso.P(u + b, v + b, H * 0.66), 1 * RES, alpha(STONE, 0.7));
  iso.r.line(iso.P(u - b, v + b, H * 0.4), iso.P(u + b, v + b, H * 0.4), 1.2 * RES, alpha(STONE, 0.6));
  // the clock face high on the front
  const [clx, cly] = iso.P(u, v + b, H * 0.56);
  const RR = 4 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ring.push([clx + Math.cos(a) * RR, cly + Math.sin(a) * RR]);
  }
  iso.r.poly(ring, COLORS.white);
  iso.r.polyline(ring, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - RR * 0.8], 0.9 * RES, INK);
  iso.r.line([clx, cly], [clx + RR * 0.6, cly], 0.9 * RES, INK);
  // open belfry stage (dark arched void)
  iso.box(u - b * 0.7, v - b * 0.7, u + b * 0.7, v + b * 0.7, H * 0.86, H * 0.96, alpha(COLORS.glassDark, 0.8), { ink: false });
  // the little domed cupola + finial
  const [dx, dyB] = iso.P(u, v, H * 0.96);
  const dome: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    dome.push([dx - 6 * RES + Math.cos(Math.PI - a) * 6 * RES, dyB - Math.sin(a) * 14 * RES]);
  }
  iso.r.poly(dome, shaded(STONE, 0.06), lit(STONE, 0.08));
  iso.r.polyline(dome, INK_W * 0.6, alpha(INK, 0.8));
  iso.r.line([dx, dyB - 14 * RES], [dx, dyB - 22 * RES], 1 * RES, hex('#9a8a6a'));
  return iso.build();
}

// =====================================================================
// MAN MO TEMPLE — a low traditional Chinese temple: a green-tiled double-eaved
// hip roof with upturned ridge ends and roof figurines, red-brick + granite
// walls, a small forecourt. Incense-smoke amber within. 2×2.
// =====================================================================
function manMoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.24);
  // granite plinth + red walls
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, STONE, { ink: false });
  iso.box(u0, v0, u1, v1, 8, 34, REDBRICK, { topC: lit(REDBRICK, 0.04), leftC: shaded(REDBRICK, 0.16) });
  // a warm glowing doorway (incense light)
  iso.box(u0 + 0.4, v1, u1 - 0.4, v1 + 0.001, 10, 26, alpha(COLORS.glassHot, 0.8), { ink: false });
  // the green double-eaved hip roof
  const eaveZ = 34;
  iso.hip(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, eaveZ, 20, TILE_GREEN);
  // upper (smaller) eave
  iso.hip(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, eaveZ + 18, 18, JADE);
  // upturned ridge ends + a central ridge ornament (the temple read)
  const [rx, ryB] = iso.P((u0 + u1) / 2, (v0 + v1) / 2, eaveZ + 36);
  iso.r.line([rx - 18 * RES, ryB + 2 * RES], [rx + 18 * RES, ryB + 2 * RES], 1.4 * RES, TILE_GREEN);
  iso.r.poly([[rx - 18 * RES, ryB + 2 * RES], [rx - 24 * RES, ryB - 6 * RES], [rx - 16 * RES, ryB - 2 * RES]], JADE); // left upturn
  iso.r.poly([[rx + 18 * RES, ryB + 2 * RES], [rx + 24 * RES, ryB - 6 * RES], [rx + 16 * RES, ryB - 2 * RES]], JADE); // right upturn
  iso.r.poly([[rx - 4 * RES, ryB - 2 * RES], [rx + 4 * RES, ryB - 2 * RES], [rx, ryB - 12 * RES]], hex('#caa64a')); // gold pearl finial
  return iso.build();
}

// =====================================================================
// GOTHIC-REVIVAL CATHEDRAL — a stone English-Gothic church: nave + steep roof,
// a pointed-arch west front with a rose window, and a tower/flèche. Serves the
// Cathedral of the Immaculate Conception + St John's Cathedral. 2×2.
// =====================================================================
function gothicCathedralTile(seed: number, spire: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const ST = hex('#cbbfa6'), STD = hex('#a99e85');
  const ROOF = hex('#5a6470');
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.35, 0.26);
  // nave + steep gable roof
  iso.box(u0, v0, u1, v1 - 0.16, 0, 50, ST, { leftC: STD });
  iso.gable(u0, v0, u1, v1 - 0.16, 50, 24, 'v', ROOF, ST);
  // pointed lancet windows along the aisle
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.12 + i * 0.18;
    iso.r.poly([iso.P(u, v1 - 0.16, 10), iso.P(u + 0.06, v1 - 0.16, 10), iso.P(u + 0.06, v1 - 0.16, 28), iso.P(u + 0.03, v1 - 0.16, 34), iso.P(u, v1 - 0.16, 28)], alpha(COLORS.glassDark, 0.85));
  }
  // west front + rose window
  iso.box(u0 + 0.06, v1 - 0.16, u1 - 0.06, v1, 0, 64, ST, { leftC: STD });
  const [rx, ry] = iso.P((u0 + u1) / 2, v1, 46);
  const RR = 6 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.95]);
  }
  iso.r.poly(rose, alpha(COLORS.glassDark, 0.9));
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  if (spire) {
    // a tower + spire over the crossing (St John's has a low tower)
    const cu = u0 + 0.16, cv = v1 - 0.08;
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 0, 84, ST, { leftC: STD });
    const apex = iso.P(cu, cv, 132);
    const c0 = iso.P(cu - 0.12, cv + 0.12, 84);
    const c1 = iso.P(cu + 0.12, cv + 0.12, 84);
    const c2 = iso.P(cu + 0.12, cv - 0.12, 84);
    iso.r.poly([c0, c1, apex], shaded(ROOF, 0.08));
    iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
  } else {
    // twin pinnacle turrets flanking the west front (Immaculate Conception)
    for (const tu of [u0 + 0.12, u1 - 0.12] as const) {
      iso.box(tu - 0.07, v1 - 0.12, tu + 0.07, v1, 0, 76, ST, { leftC: STD });
      const apex = iso.P(tu, v1 - 0.06, 100);
      const c0 = iso.P(tu - 0.07, v1, 76);
      const c2 = iso.P(tu + 0.07, v1 - 0.12, 76);
      iso.r.poly([c0, iso.P(tu + 0.07, v1, 76), apex], shaded(ROOF, 0.06));
      iso.r.polyline([c0, apex, c2], INK_W * 0.5, INK);
    }
  }
  return iso.build();
}

// =====================================================================
// COLONIAL DOMED BLOCK — the Court of Final Appeal (Old Supreme Court): a
// neoclassical granite block with an Ionic colonnade, a central pediment with
// the blindfolded Themis statue, and a low domed roof. 2×2.
// =====================================================================
function colonialDomeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#d6cdb6'), STD = shaded(hex('#d6cdb6'), 0.14);
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.32, 0.24);
  iso.box(u0, v0, u1, v1, 0, 38, ST, { topC: lit(ST, 0.06), leftC: STD });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.1), { ink: false });
  // the Ionic colonnade across the front (v1)
  for (let i = 0; i <= 10; i++) {
    const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 10;
    iso.r.poly([iso.P(u - 0.014, v1, 34), iso.P(u + 0.014, v1, 34), iso.P(u + 0.014, v1, 10), iso.P(u - 0.014, v1, 10)], i % 2 ? COLORS.white : lit(COLORS.white, 0.06));
  }
  // entablature + central pediment
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 38, 43, lighten(ST, 0.06), { topC: top(ST, 0.2) });
  const pu0 = u0 + 0.36, pu1 = u1 - 0.36, um = (pu0 + pu1) / 2;
  iso.r.poly([iso.P(pu0, v1, 43), iso.P(pu1, v1, 43), iso.P(um, v1, 43 + 11)], lighten(ST, 0.08));
  iso.r.polyline([iso.P(pu0, v1, 43), iso.P(um, v1, 43 + 11), iso.P(pu1, v1, 43)], INK_W * 0.7, INK);
  // the low central dome
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 43, 52, ST); // drum
  const [dx, dyB] = iso.P(cx, cy, 52);
  const dome: Pt[] = [];
  const DR = 0.24 * (CELL_W / 2);
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    dome.push([dx + Math.cos(Math.PI - a) * DR, dyB - Math.sin(a) * DR * 0.9]);
  }
  iso.r.poly(dome, shaded(ST, 0.06), lit(ST, 0.08));
  iso.r.polyline(dome, INK_W * 0.6, alpha(INK, 0.8));
  iso.r.line([dx, dyB - DR * 0.9], [dx, dyB - DR * 0.9 - 5 * RES], 1 * RES, hex('#9a8a6a'));
  return iso.build();
}

// =====================================================================
// M+ MUSEUM — Herzog & de Meuron's inverted-T: a long low horizontal podium
// slab + a thin tall vertical screen-tower rising from it (the LED media facade
// that faces the harbour). Dark ceramic-tile cladding. 4×4.
// =====================================================================
function mPlusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 220 });
  void seed;
  iso.shadow(0.5, 0.5, 3.5, 3.5, 0.5, 0.28);
  const CER = hex('#5c6b6f'); // dark green-grey ceramic tile
  const CERD = shaded(CER, 0.16);
  // the long horizontal podium slab
  iso.box(0.5, 0.5, 3.5, 3.5, 0, 40, CER, { topC: lit(CER, 0.06), leftC: CERD });
  floorsLeft(iso, 3.5, 0.5, 3.5, 8, 40, 12);
  // the thin tall vertical screen-tower (the LED facade) rising at the back
  iso.box(0.7, 0.7, 3.3, 1.1, 40, 150, CER, { topC: lit(CER, 0.06), leftC: CERD });
  // the great media-screen face (a darker glowing panel of pixels) on the v1
  // side of the tower
  iso.box(0.72, 1.1, 3.28, 1.12, 44, 146, alpha(hex('#243038'), 0.92), { ink: false });
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 12; c++) {
      const u = 0.8 + c * 0.2;
      const z = 50 + r * 12;
      iso.r.line(iso.P(u, 1.1, z), iso.P(u + 0.1, 1.1, z), 1.2 * RES, alpha(c % 3 === r % 3 ? NEON_TEAL : COLORS.glassLit, 0.5));
    }
  }
  return iso.build();
}

// =====================================================================
// BAUHAUS BLOCK — Central Market / Wan Chai Market: a streamlined 1930s
// Bauhaus building with horizontal banding, rounded corners, ribbon windows,
// painted cream render. Low + broad. 3×3.
// =====================================================================
function bauhausTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  iso.shadow(0.5, 0.5, 2.5, 2.5, 0.45, 0.26);
  const CR = hex('#e0d8c4'), CRD = shaded(hex('#e0d8c4'), 0.12);
  iso.box(0.5, 0.5, 2.5, 2.5, 0, 46, CR, { topC: lit(CR, 0.06), leftC: CRD });
  // horizontal ribbon windows (the streamline-moderne bands) on both faces
  for (const z of [14, 26, 38] as const) {
    iso.r.poly([iso.P(0.6, 2.5, z), iso.P(2.4, 2.5, z), iso.P(2.4, 2.5, z + 7), iso.P(0.6, 2.5, z + 7)], alpha(COLORS.glassSky, 0.78));
    iso.r.poly([iso.P(2.5, 0.6, z), iso.P(2.5, 2.4, z), iso.P(2.5, 2.4, z + 7), iso.P(2.5, 0.6, z + 7)], alpha(COLORS.glassSky, 0.6));
  }
  // a low parapet + a roof clerestory box
  iso.box(0.5, 0.5, 2.5, 2.5, 46, 50, lighten(CR, 0.06), { ink: false });
  iso.box(1.1, 1.1, 1.9, 1.9, 50, 60, CR, { topC: lit(CR, 0.08) });
  return iso.build();
}

// =====================================================================
// COLONIAL VERANDAH HOUSE — Flagstaff House / Béthanie: a low 19th-century
// colonial building with a deep arched/columned verandah on the ground floor, a
// pitched tiled roof, set in green grounds. 2×2.
// =====================================================================
function colonialHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.32, 0.24);
  // green grounds
  iso.box(0.34, 0.34, 1.66, 1.66, 0, 4, shaded(COLORS.grass, 0.1), { ink: false });
  const CR = hex('#ead8be'), CRD = shaded(hex('#ead8be'), 0.12);
  iso.box(u0, v0, u1, v1, 4, 38, CR, { topC: lit(CR, 0.06), leftC: CRD });
  // the deep verandah: a colonnade in front of a shaded recess on the front face
  iso.box(u0 + 0.06, v1 - 0.08, u1 - 0.06, v1, 4, 22, shaded(CR, 0.2), { ink: false });
  for (let i = 0; i <= 8; i++) {
    const u = u0 + 0.08 + ((u1 - u0 - 0.16) * i) / 8;
    iso.r.line(iso.P(u, v1, 4), iso.P(u, v1, 24), 1.4 * RES, COLORS.white);
    // round arch tops between columns
    if (i < 8) {
      const um = u + ((u1 - u0 - 0.16) / 8) / 2;
      iso.r.line(iso.P(u, v1, 22), iso.P(um, v1, 26), 0.8 * RES, alpha(COLORS.white, 0.7));
    }
  }
  // a pitched tiled hip roof
  iso.hip(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 38, 20, REDBRICK);
  return iso.build();
}

// =====================================================================
// MODERN GLASS TOWER (generic HK commercial high-rise) — a clean teal/grey glass
// box with floor banding + a lit crown; parameterised by height + glass colour +
// footprint, so it serves the many placed HK office/hotel towers handsomely
// (Conrad, New World Millennium, Chater House, World Trade Centre, Bank of
// America, COSCO, Revenue Tower, Sky100, K11/ARTUS, Festival Walk podium-tower).
// =====================================================================
function glassTowerTile(
  seed: number,
  opts: { w: number; h: number; head: number; glass: RGBA; crown?: 'flat' | 'step' | 'mast' | 'slope'; podiumH?: number },
): Uint8ClampedArray<ArrayBuffer> {
  const { w, h, head, glass } = opts;
  const crown = opts.crown ?? 'step';
  const iso = new Iso(w, w, { swAnchor: true, headroom: head });
  void seed;
  const m = w >= 4 ? 0.5 : w >= 3 ? 0.46 : 0.44;
  const u0 = m, u1 = w - m, v0 = m, v1 = w - m;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.4 + w * 0.05, 0.3);
  const gl = glass, glL = lit(glass, 0.1), glD = shaded(glass, 0.18);
  if (opts.podiumH) podium(iso, u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, opts.podiumH, STEELG);
  const z0 = opts.podiumH ?? 8;
  iso.box(u0, v0, u1, v1, opts.podiumH ? opts.podiumH : 0, h, gl, { topC: glL, leftC: glD, rightC: lit(gl, 0.04) });
  floorsLeft(iso, v1, u0, u1, z0, h, 13);
  floorsRight(iso, u1, v0, v1, z0, h, 13);
  // a couple of bright mullion accents
  iso.r.line(iso.P(u0 + (u1 - u0) * 0.34, v1, z0), iso.P(u0 + (u1 - u0) * 0.34, v1, h - 4), 0.7 * RES, alpha(SILVER, 0.4));
  iso.r.line(iso.P(u1, v0 + (v1 - v0) * 0.5, z0), iso.P(u1, v0 + (v1 - v0) * 0.5, h - 4), 0.6 * RES, alpha(SILVER, 0.32));
  const [cxp, cyB] = iso.P(cx, cy, h);
  // a warm gleam along the sun-facing crown rim so the tower catches the dusk
  // light on top (the env-art hero "catches the light" read) instead of going flat
  iso.gleam(iso.P(u1, v0, h), iso.P(u1, v1, h), 1.1 * RES);
  if (crown === 'mast') {
    iso.box(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1, h, h + 12, glL);
    mast(iso, cxp, cyB - 12 * RES, 46, SILVER);
  } else if (crown === 'step') {
    iso.box(u0 + 0.12, v0 + 0.12, u1 - 0.12, v1 - 0.12, h, h + 16, glL);
    iso.box(u0 + 0.24, v0 + 0.24, u1 - 0.24, v1 - 0.24, h + 16, h + 26, glL);
  } else if (crown === 'slope') {
    // a sloped/feature roofline
    const apex = iso.P(cx, v0 + 0.1, h + 28);
    const c0 = iso.P(u0 + 0.1, v1 - 0.1, h);
    const c1 = iso.P(u1 - 0.1, v1 - 0.1, h);
    iso.r.poly([c0, c1, apex], glL);
    iso.r.polyline([c0, apex, c1], INK_W * 0.6, alpha(INK, 0.7));
  } else {
    iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, h, h + 6, glL);
  }
  return iso.build();
}

// =====================================================================
// THE REGISTRY
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // ---- the sculptural marquee towers (placed + the owner-named icons) -------
  {
    city: 'hongkong',
    key: 'bank-of-china-tower',
    match: /Bank of China Tower|中銀大廈/,
    foot: [2, 2],
    seed: 7301,
    draw: bankOfChinaTile,
    light: { kind: 'spireBeacon', topZ: 372, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'central-plaza',
    match: /Central Plaza|中環廣場/,
    foot: [2, 2],
    seed: 7302,
    draw: centralPlazaTile,
    light: { kind: 'towerCrown', topZ: 374, halfW: 0.55 },
  },
  {
    city: 'hongkong',
    key: 'hsbc-building',
    match: /HSBC|Hongkong and Shanghai Bank|滙豐|汇丰/,
    foot: [2, 2],
    seed: 7303,
    draw: hsbcTile,
    light: { kind: 'towerCrown', topZ: 206, halfW: 0.55 },
  },
  {
    city: 'hongkong',
    key: 'international-commerce-centre',
    match: /International Commerce Centre|環球貿易廣場|\bICC\b/,
    foot: [2, 2],
    seed: 7304,
    draw: (s) => supertallTile(s, { h: 360, glass: SLATEGLASS, crown: 'notch', mastH: 60 }),
    light: { kind: 'spireBeacon', topZ: 384, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'two-ifc',
    match: /Two International Finance|International Finance Centre|國際金融中心|\bIFC\b(?! Mall)/,
    foot: [2, 2],
    seed: 7305,
    draw: (s) => supertallTile(s, { h: 320, glass: TEAL_L, crown: 'taper', mastH: 40 }),
    light: { kind: 'spireBeacon', topZ: 344, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'the-center',
    match: /The Cent(er|re)\b|中環中心/,
    foot: [2, 2],
    seed: 7306,
    draw: (s) => slimNeonTowerTile(s, TEAL, 300),
    light: { kind: 'towerCrown', topZ: 320, halfW: 0.42 },
  },
  {
    city: 'hongkong',
    key: 'cheung-kong-center',
    match: /Cheung Kong Cent(er|re)|長江集團中心|长江/,
    foot: [2, 2],
    seed: 7307,
    draw: cheungKongTile,
    light: { kind: 'towerCrown', topZ: 300, halfW: 0.55 },
  },
  {
    city: 'hongkong',
    key: 'jardine-house',
    match: /Jardine House|怡和大廈|康樂大廈/,
    foot: [2, 2],
    seed: 7308,
    draw: jardineHouseTile,
    light: { kind: 'towerCrown', topZ: 190, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'hopewell-centre',
    match: /Hopewell Cent(re|er)|合和中心/,
    foot: [3, 3],
    seed: 7309,
    draw: cylinderTowerTile,
    light: { kind: 'towerCrown', topZ: 270, halfW: 0.7 },
  },
  {
    city: 'hongkong',
    key: 'lippo-centre',
    match: /Lippo Cent(re|er)|力寶中心/,
    foot: [3, 3],
    seed: 7310,
    draw: lippoTile,
    light: { kind: 'towerCrown', topZ: 250, halfW: 0.6 },
  },
  {
    city: 'hongkong',
    key: 'exchange-square',
    match: /Exchange Square|交易廣場/,
    foot: [5, 5],
    seed: 7311,
    draw: exchangeSquareTile,
    light: { kind: 'towerCrown', topZ: 245, halfW: 1.4 },
  },
  {
    city: 'hongkong',
    key: 'cosco-tower',
    match: /COSCO Tower|中遠大廈|Grand Millennium Plaza/i,
    foot: [2, 2],
    seed: 7312,
    draw: (s) => glassTowerTile(s, { w: 2, h: 250, head: 340, glass: hex('#7f99ad'), crown: 'mast' }),
    light: { kind: 'towerCrown', topZ: 262, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'sky100',
    match: /Sky\s?100|天際100/,
    foot: [2, 2],
    seed: 7313,
    draw: (s) => glassTowerTile(s, { w: 2, h: 300, head: 380, glass: hex('#8fb0c0'), crown: 'step' }),
    light: { kind: 'towerCrown', topZ: 312, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'revenue-tower',
    match: /Revenue Tower|稅務大樓/,
    foot: [2, 2],
    seed: 7314,
    draw: (s) => glassTowerTile(s, { w: 2, h: 240, head: 320, glass: hex('#7d9ba0'), crown: 'mast' }),
    light: { kind: 'towerCrown', topZ: 252, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'chater-house',
    match: /Chater House|遮打大廈/,
    foot: [2, 2],
    seed: 7315,
    draw: (s) => glassTowerTile(s, { w: 2, h: 220, head: 300, glass: hex('#88a7b3'), crown: 'flat', podiumH: 20 }),
    light: { kind: 'towerCrown', topZ: 232, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'world-trade-centre',
    match: /World Trade Cent(re|er) Hong Kong|世界貿易中心/,
    foot: [3, 3],
    seed: 7316,
    draw: (s) => glassTowerTile(s, { w: 3, h: 210, head: 300, glass: hex('#7f9fa8'), crown: 'step', podiumH: 24 }),
    light: { kind: 'towerCrown', topZ: 222, halfW: 0.7 },
  },
  {
    city: 'hongkong',
    key: 'bank-of-america-tower',
    match: /Bank of America Tower|美國銀行中心/,
    foot: [2, 2],
    seed: 7317,
    draw: (s) => glassTowerTile(s, { w: 2, h: 200, head: 280, glass: hex('#84a0ab'), crown: 'flat' }),
    light: { kind: 'towerCrown', topZ: 212, halfW: 0.5 },
  },
  // ---- the harbour-front venues + cultural icons ----------------------------
  {
    city: 'hongkong',
    key: 'convention-centre',
    match: /Convention and Exhibition|會議展覽中心|Convention Cent(re|er)/,
    foot: [5, 5],
    seed: 7320,
    draw: conventionCentreTile,
    light: { kind: 'stadiumFlood', topZ: 110, halfW: 1.7 },
  },
  {
    city: 'hongkong',
    key: 'cultural-centre',
    match: /Cultural Cent(re|er)|文化中心/,
    foot: [4, 4],
    seed: 7321,
    draw: culturalCentreTile,
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.3 },
  },
  {
    city: 'hongkong',
    key: 'tsim-sha-tsui-clock-tower',
    match: /Clock Tower|鐘樓/,
    foot: [1, 1],
    seed: 7322,
    draw: clockTowerTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.3 },
  },
  {
    city: 'hongkong',
    key: 'peak-tower',
    match: /Peak Tower|凌霄閣|爐峰/,
    foot: [2, 2],
    seed: 7323,
    draw: peakTowerTile,
    light: { kind: 'towerCrown', topZ: 86, halfW: 0.9 },
  },
  {
    city: 'hongkong',
    key: 'big-buddha',
    match: /Big Buddha|Tian Tan Buddha|天壇大佛|寶蓮/,
    foot: [3, 3],
    seed: 7324,
    draw: bigBuddhaTile,
    light: { kind: 'facadeFlood', topZ: 230, halfW: 0.6 },
  },
  {
    city: 'hongkong',
    key: 'man-mo-temple',
    match: /Man Mo Temple|文武廟/,
    foot: [2, 2],
    seed: 7325,
    draw: manMoTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'cathedral-immaculate-conception',
    match: /Cathedral of the Immaculate Conception|無原罪主教座堂/,
    foot: [2, 2],
    seed: 7326,
    draw: (s) => gothicCathedralTile(s, false),
    light: { kind: 'facadeFlood', topZ: 100, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'st-johns-cathedral',
    match: /St\.? John'?s Cathedral|聖約翰座堂/,
    foot: [2, 2],
    seed: 7327,
    draw: (s) => gothicCathedralTile(s, true),
    light: { kind: 'facadeFlood', topZ: 132, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'court-of-final-appeal',
    match: /Court of Final Appeal|Legislative Council Building|終審法院|立法會大樓/,
    foot: [2, 2],
    seed: 7328,
    draw: colonialDomeTile,
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'legislative-council-complex',
    match: /Legislative Council Complex|立法會綜合大樓/,
    foot: [4, 4],
    seed: 7329,
    draw: (s) => glassTowerTile(s, { w: 4, h: 90, head: 120, glass: hex('#9fb6bf'), crown: 'flat', podiumH: 30 }),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.3 },
  },
  {
    city: 'hongkong',
    key: 'm-plus',
    match: /^M\+$|M\+ |博物館.*M\+|M\+$/,
    foot: [4, 4],
    seed: 7330,
    draw: mPlusTile,
    light: { kind: 'aerialBeacon', topZ: 150, halfW: 1.3 },
  },
  {
    city: 'hongkong',
    key: 'central-market',
    match: /Central Market|中環街市/,
    foot: [3, 3],
    seed: 7331,
    draw: bauhausTile,
    light: { kind: 'genericGlow', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'flagstaff-house',
    match: /Flagstaff House|茶具文物館|Tea Ware/,
    foot: [2, 2],
    seed: 7332,
    draw: colonialHouseTile,
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'bethanie',
    match: /Béthanie|伯大尼/,
    foot: [2, 2],
    seed: 7333,
    draw: colonialHouseTile,
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'science-museum',
    match: /Science Museum|科學館/,
    foot: [3, 3],
    seed: 7334,
    draw: (s) => glassTowerTile(s, { w: 3, h: 60, head: 90, glass: hex('#a06a52'), crown: 'flat', podiumH: 20 }),
    light: { kind: 'genericGlow', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'hongkong',
    key: 'heritage-discovery-centre',
    match: /Heritage Discovery Centre|文物探知館/,
    foot: [2, 2],
    seed: 7335,
    draw: colonialHouseTile,
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  // ---- placed hotels / mixed-use towers (the dense vertical fabric heroes) ---
  {
    city: 'hongkong',
    key: 'conrad-hong-kong',
    match: /Conrad Hong Kong|港麗酒店/,
    foot: [2, 2],
    seed: 7340,
    draw: (s) => glassTowerTile(s, { w: 2, h: 230, head: 310, glass: hex('#8aa9b4'), crown: 'mast' }),
    light: { kind: 'towerCrown', topZ: 242, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'new-world-millennium',
    match: /New World Millennium|千禧新世界/,
    foot: [2, 2],
    seed: 7341,
    draw: (s) => glassTowerTile(s, { w: 2, h: 210, head: 290, glass: hex('#7f9eaa'), crown: 'step' }),
    light: { kind: 'towerCrown', topZ: 222, halfW: 0.5 },
  },
  {
    city: 'hongkong',
    key: 'k11-artus',
    match: /K11 ARTUS|Victoria Dockside/i,
    foot: [4, 4],
    seed: 7342,
    draw: (s) => glassTowerTile(s, { w: 4, h: 240, head: 320, glass: hex('#86a3ae'), crown: 'slope', podiumH: 30 }),
    light: { kind: 'towerCrown', topZ: 252, halfW: 0.9 },
  },
  {
    city: 'hongkong',
    key: 'k11',
    match: /K11(?! ARTUS)|藝術購物/,
    foot: [4, 4],
    seed: 7343,
    draw: (s) => glassTowerTile(s, { w: 4, h: 150, head: 200, glass: hex('#8c9aa4'), crown: 'step', podiumH: 28 }),
    light: { kind: 'towerCrown', topZ: 150, halfW: 0.9 },
  },
  {
    city: 'hongkong',
    key: 'festival-walk',
    match: /Festival Walk|又一城/,
    foot: [4, 4],
    seed: 7344,
    draw: (s) => glassTowerTile(s, { w: 4, h: 120, head: 160, glass: hex('#93a6ad'), crown: 'flat', podiumH: 40 }),
    light: { kind: 'genericGlow', topZ: 120, halfW: 1.1 },
  },
];
