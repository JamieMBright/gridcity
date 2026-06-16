// North-East England & the Tyne — bespoke-hero registry (Wave W5). Each entry
// resolves a PLACED name from src/data/cities/northeast.ts's `named` list to a
// hand-built iso sprite + a bespoke night-electrification light. The region's
// signature reads come from THREE material families: honey/buff SANDSTONE
// (Newcastle's Grainger Town, the cathedrals, the country halls), green/grey
// STEEL (the Tyne bridges, the Angel, the Sage shell) and red INDUSTRIAL BRICK
// (BALTIC flour mill, the warehouses), all under a cold grey North-Sea sky.
//
// The placed list does NOT carry every regional icon, but the owner brief
// requires the famous Tyne reads authored anyway so they render the moment
// placement adds them: TYNE BRIDGE, the Gateshead MILLENNIUM BRIDGE, the ANGEL
// OF THE NORTH, DURHAM CATHEDRAL, GREY'S MONUMENT. Their `match` regexes hit the
// real names should they appear; until then they cost nothing (a hero only
// renders when its match hits a placed name). Everything that IS placed is
// covered first.
//
// SCOPE: this file only. registry.ts is already wired to import CITY_HEROES.

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
import { alpha, hex, lighten, type Pt, type RGBA } from '../raster';

// --- shared North-East palette ----------------------------------------------
const SAND = hex('#dcc79c'); // honey Newcastle sandstone (Grey St / Grainger Town)
const SAND_D = hex('#bda871'); // weathered sandstone shade
const SAND_L = hex('#ebdcb6'); // pale ashlar highlight
const NORMAN = hex('#cfc2a4'); // cooler ashlar of the Norman keeps / cathedrals
const NORMAN_D = hex('#ab9f82');
const BRICK = hex('#9d4f3a'); // North-East industrial red brick (BALTIC, warehouses)
const BRICK_D = hex('#7c3c2c');
const STEEL = hex('#8a97a3'); // pale structural steel (Millennium Bridge, masts)
const STEEL_D = hex('#5d6975');
const CORTEN = hex('#9a5236'); // the Angel's rust-brown weathering steel
const CORTEN_L = hex('#b96b48');
const SLATE = hex('#3d444b'); // dark Welsh-slate roofs (near-black at dusk)
const LEAD = hex('#5d6b80'); // lead cupolas / spire caps
const GLASSHOUSE = hex('#b9c6cf'); // the Sage's stainless-and-glass shell
const SEA = hex('#5f7c8a'); // cold North-Sea grey-blue
const LIGHTRED = hex('#b34a3f'); // Souter Lighthouse red band
const GILT = hex('#c8a24a');
const GREEN = hex('#7f9a6a'); // Northumberlandia / parkland grass

// --- shared primitives (small reusable bits; each hero gets its OWN draw fn) -

/** A slim stone column run (portico/peristyle) on the v-face between u's. */
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

/** A classical pediment triangle on a face at fixed v. */
function pediment(iso: Iso, v: number, uA: number, uB: number, zBase: number, rise: number, col: RGBA): void {
  const um = (uA + uB) / 2;
  iso.r.poly([iso.P(uA, v, zBase), iso.P(uB, v, zBase), iso.P(um, v, zBase + rise)], lighten(col, 0.12));
  iso.r.polyline([iso.P(uA, v, zBase), iso.P(uB, v, zBase), iso.P(um, v, zBase + rise)], INK_W * 0.8, INK, true);
}

/** A tall pointed gothic lancet drawn on the v-face (glass with a peaked head). */
function lancet(iso: Iso, v: number, u: number, w: number, zB: number, zT: number, glass: RGBA): void {
  iso.r.poly(
    [iso.P(u, v, zB), iso.P(u + w, v, zB), iso.P(u + w, v, zT), iso.P(u + w / 2, v, zT + w * 7), iso.P(u, v, zT)],
    glass,
  );
}

/** A square crocketed pinnacle standing at (u,v) from zBase, h tall. */
function pinnacle(iso: Iso, u: number, v: number, zBase: number, h: number, col: RGBA): void {
  const b = iso.P(u, v, zBase);
  const t = iso.P(u, v, zBase + h);
  iso.r.poly([[b[0] - 1.7 * RES, b[1]], [b[0] + 1.7 * RES, b[1]], t], lit(col, 0.1));
  iso.r.polyline([[b[0] - 1.7 * RES, b[1]], t, [b[0] + 1.7 * RES, b[1]]], INK_W * 0.5, alpha(INK, 0.7));
}

/** A conical/pepperpot roof on a small square turret at (u,v). */
function cap(iso: Iso, u: number, hw: number, v: number, zB: number, rise: number, col: RGBA): void {
  const apex = iso.P(u, v, zB + rise);
  const c0 = iso.P(u - hw, v + hw, zB);
  const c1 = iso.P(u + hw, v + hw, zB);
  const c2 = iso.P(u + hw, v - hw, zB);
  iso.r.poly([c0, c1, apex], shaded(col, 0.08));
  iso.r.poly([c1, c2, apex], lit(col, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.5, INK);
}

// =====================================================================
// THE TYNE BRIDGE — the region's signature: a single great GREEN steel
// through-arch springing between two pale-ashlar pier towers, the road deck
// hung from vertical hangers below the arch. SW-anchored 2×4 spanning the
// gorge (the long axis runs down v, like Tower Bridge). Drawn so the green
// parabola dominates the silhouette.
// =====================================================================
function tyneBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  // a compact 2×3 span (a long 4-tile span foreshortens the arch flat in iso);
  // springing points pulled in so the through-arch is upright and SOARS.
  const iso = new Iso(2, 3, { swAnchor: true, headroom: 250 });
  void seed;
  const deckZ = 28;
  const TA = 0.85; // north arch springing (v)
  const TB = 2.15; // south arch springing (v)
  iso.shadow(0.3, 0.4, 1.7, 2.7, 0.3, 0.22);
  // the river hint under the deck
  iso.box(0.1, 0.2, 1.9, 2.8, -8, -2, shaded(SEA, 0.1), { ink: false });
  // the two ashlar pier-towers (Cornish granite faced) carrying the deck ends
  for (const tv of [TA - 0.3, TB + 0.3] as const) {
    iso.box(0.42, tv - 0.18, 1.58, tv + 0.18, -2, 50, SAND_L);
    iso.box(0.4, tv - 0.2, 1.6, tv + 0.2, 44, 50, lighten(SAND_L, 0.06), { ink: false });
    // a row of tall openings up the tower face
    iso.windowsRight(1.6, tv - 0.14, tv + 0.14, 8, 40, 3, alpha(COLORS.glassDark, 0.85), SAND_L);
  }
  // the road deck ribbon between the towers
  for (const du of [0.46, 1.54] as const) {
    iso.r.poly(
      [iso.P(du, TA - 0.4, deckZ + 3), iso.P(du, TB + 0.4, deckZ + 3), iso.P(du, TB + 0.4, deckZ - 3), iso.P(du, TA - 0.4, deckZ - 3)],
      du < 1 ? shaded(STEEL, 0.1) : lit(STEEL, 0.08),
    );
    iso.r.line(iso.P(du, TA - 0.4, deckZ + 3), iso.P(du, TB + 0.4, deckZ + 3), INK_W * 0.7, INK);
  }
  // THE GREAT GREEN ARCH — a SOARING parabola each side of the deck, drawn as a
  // FILLED steel ribbon (outer edge out, inner edge back) so it reads as solid
  // riveted steel and clears the towers decisively; hangers drop to the deck.
  const apexZ = 196; // SOARS far above the z50 pier towers (the signature arch)
  const archZ = (t: number): number => deckZ + (apexZ - deckZ) * (1 - (2 * t - 1) * (2 * t - 1));
  const archGreen = hex('#4f8a68'); // a brighter oxidised green so it reads at dusk
  const archSide = (du: number, body: RGBA): void => {
    const outer: Pt[] = [];
    const inner: Pt[] = [];
    const half = 9; // thicker steel band
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const v = TA + (TB - TA) * t;
      outer.push(iso.P(du, v, archZ(t) + half));
      inner.push(iso.P(du, v, archZ(t) - half));
    }
    // the ribbon as a filled band
    iso.r.poly([...outer, ...inner.reverse()], body);
    const innerEdge: Pt[] = [];
    for (let i = 0; i <= 28; i++) { const t = i / 28; const v = TA + (TB - TA) * t; innerEdge.push(iso.P(du, v, archZ(t) - half)); }
    iso.r.polyline(outer, INK_W * 0.9, INK);
    iso.r.polyline(innerEdge, INK_W * 0.6, alpha(INK, 0.7));
    // vertical hangers dropping from the arch underside to the deck
    for (let i = 3; i <= 25; i += 2) {
      const t = i / 28;
      const v = TA + (TB - TA) * t;
      iso.r.line(iso.P(du, v, archZ(t) - half), iso.P(du, v, deckZ + 2), 0.8 * RES, alpha(shaded(body, 0.08), 0.9));
    }
  };
  archSide(0.46, archGreen);
  archSide(1.54, lighten(archGreen, 0.08));
  // cross-bracing between the two arch ribs over the crown (the lattice top)
  for (let i = 10; i <= 18; i += 2) {
    const t = i / 28;
    const v = TA + (TB - TA) * t;
    iso.r.line(iso.P(0.46, v, archZ(t)), iso.P(1.54, v, archZ(t)), 1.1 * RES, shaded(archGreen, 0.12));
  }
  return iso.build();
}

// =====================================================================
// GATESHEAD MILLENNIUM BRIDGE — the "blinking eye": two opposed steel arcs
// (the curved deck + the taller curved supporting arch) sharing pivot bearings,
// cables fanning between them. Slim pale steel over the Tyne. SW-anchored 2×3.
// =====================================================================
function millenniumBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const VA = 0.5;
  const VB = 2.5;
  const du = 1.0; // single plane, viewed broadside
  iso.shadow(0.4, 0.5, 1.6, 2.6, 0.3, 0.22);
  iso.box(0.1, 0.2, 1.9, 2.8, -8, -2, shaded(SEA, 0.1), { ink: false });
  // the two pivot piers on each bank
  for (const v of [VA, VB] as const) {
    iso.box(du - 0.22, v - 0.18, du + 0.22, v + 0.18, -2, 14, STEEL_D);
  }
  // a filled curved ribbon between two parabolic edges at z-offsets ±half.
  const ribbon = (apex: number, halfPx: number, body: RGBA): Pt[] => {
    const zAt = (t: number): number => 14 + apex * (1 - (2 * t - 1) * (2 * t - 1));
    const outer: Pt[] = [], inner: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, v = VA + (VB - VA) * t;
      outer.push(iso.P(du, v, zAt(t) + halfPx));
      inner.push(iso.P(du, v, zAt(t) - halfPx));
    }
    const innerCopy = inner.slice();
    iso.r.poly([...outer, ...inner.reverse()], body);
    iso.r.polyline(outer, INK_W * 0.6, alpha(INK, 0.7));
    iso.r.polyline(innerCopy, INK_W * 0.5, alpha(INK, 0.55));
    return outer; // the upper edge, for the cable anchors
  };
  // the tall supporting ARCH (the eyebrow) — bold, soaring
  const archTopZ = (t: number): number => 14 + 134 * (1 - (2 * t - 1) * (2 * t - 1));
  ribbon(134, 4, lit(STEEL, 0.04));
  // the gently-arched DECK bowing up from bank to bank (the eye's lower lid)
  const deckTopZ = (t: number): number => 14 + 26 * (1 - (2 * t - 1) * (2 * t - 1));
  ribbon(26, 3, lit(STEEL, 0.1));
  // the cable fan between arch and deck (the lashes of the blinking eye)
  for (let i = 2; i <= 22; i += 1) {
    const t = i / 24;
    const v = VA + (VB - VA) * t;
    iso.r.line(iso.P(du, v, archTopZ(t) - 4), iso.P(du, v, deckTopZ(t) + 3), 0.6 * RES, alpha(lighten(STEEL, 0.1), 0.85));
  }
  return iso.build();
}

// =====================================================================
// THE GLASSHOUSE (Sage Gateshead) — Foster's stainless-steel-and-glass shell:
// three swelling rounded humps (a big central one between two smaller) of
// curved silver shell, glazed at the gable ends, sitting on a glassy base over
// the Quayside. The blob silhouette IS the read. 2×2.
// =====================================================================
function glasshouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the glazed base the shell rests on
  iso.box(u0, v0, u1, v1, 0, 18, alpha(COLORS.glassSky, 0.92));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, shaded(STEEL_D, 0.1), { ink: false });
  // a curved-shell hump: a half-barrel along v at a given u-centre.
  const hump = (cu: number, hw: number, rise: number, body: RGBA): void => {
    const ribs: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18; // along v
      const v = v0 + 0.04 + (v1 - v0 - 0.08) * t;
      ribs.push(iso.P(cu, v, 18 + rise));
    }
    // build the shell as a stack of arcs across u (cross-section)
    for (let s = 0; s <= 8; s++) {
      const f = s / 8; // 0 centre → 1 edge
      const offu = hw * f;
      const z = 18 + rise * Math.sqrt(Math.max(0, 1 - f * f));
      const col = f < 0.4 ? top(body, 0.2) : f < 0.75 ? lit(body, 0.04) : shaded(body, 0.06);
      iso.r.polyline(
        [iso.P(cu - offu, v0 + 0.02, z), iso.P(cu - offu, v1 - 0.02, z)],
        1.6 * RES,
        col,
      );
      if (s > 0) {
        iso.r.polyline(
          [iso.P(cu + offu, v0 + 0.02, z), iso.P(cu + offu, v1 - 0.02, z)],
          1.6 * RES,
          shaded(body, 0.06),
        );
      }
    }
    // glazed gable arc at the near end (v1)
    const gable: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      gable.push(iso.P(cu + Math.cos(a) * hw, v1 - 0.02, 18 + Math.sin(a) * rise));
    }
    iso.r.poly(gable, alpha(COLORS.glassLit, 0.5));
    iso.r.polyline(gable, INK_W * 0.7, INK);
    void ribs;
  };
  // two smaller flanking humps, then the dominant central one
  hump(u0 + 0.42, 0.3, 40, GLASSHOUSE);
  hump(u1 - 0.42, 0.3, 40, GLASSHOUSE);
  hump((u0 + u1) / 2, 0.42, 62, lighten(GLASSHOUSE, 0.04));
  // a few transverse seam glints catching the dusk on the central shell
  for (const v of [v0 + 0.35, (v0 + v1) / 2, v1 - 0.35]) {
    iso.glint(iso.P((u0 + u1) / 2, v, 80), 1.8 * RES);
  }
  return iso.build();
}

// =====================================================================
// BALTIC CENTRE FOR CONTEMPORARY ART — the converted Baltic Flour Mills: a tall
// monolithic RED-BRICK block (the old silo) with the giant white "BALTIC"
// lettering band near the top, a flat roof, and the glazed external lift/stair
// towers bolted to the river face. 2×2, drawn tall and slab-like.
// =====================================================================
function balticTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  const H = 118;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the great brick silo block
  iso.box(u0, v0, u1, v1, 0, H, BRICK);
  // faint horizontal coursing bands
  for (let z = 14; z < H - 8; z += 16) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(BRICK_D, 0.5));
  }
  // the white lettering band near the top (the BALTIC sign)
  iso.box(u0, v0, u1, v1, H - 26, H - 14, alpha(COLORS.white, 0.92), { ink: false });
  // the glazed lift/stair towers clamped to the front-right (river face)
  iso.box(u1 - 0.04, v0 + 0.18, u1 + 0.14, v1 - 0.18, 0, H - 4, alpha(COLORS.glassSky, 0.9));
  for (let z = 12; z < H - 8; z += 12) {
    iso.r.line(iso.P(u1 + 0.05, v0 + 0.2, z), iso.P(u1 + 0.05, v1 - 0.2, z), 0.5 * RES, alpha(COLORS.white, 0.5));
  }
  // rooftop plant + the cantilevered viewing-box on top
  iso.box(u0 + 0.2, v0 + 0.2, u0 + 0.7, v0 + 0.7, H, H + 12, STEEL_D);
  iso.box(u1 - 0.5, v1 - 0.4, u1 + 0.06, v1 + 0.04, H - 2, H + 14, alpha(COLORS.glassLit, 0.85));
  return iso.build();
}

// =====================================================================
// THE BISCUIT FACTORY / industrial warehouse-gallery — a long red-brick
// Victorian works with a saw-tooth north-light glazed roof and arched windows.
// Serves The Biscuit Factory, the old warehouses. 2×2.
// =====================================================================
function warehouseGalleryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, BRICK);
  // stone band at the parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 46, 50, lighten(SAND, 0.04), { ink: false });
  // two rows of round-headed arched windows on the long face
  for (const zr of [12, 30] as const) {
    for (let i = 0; i < 7; i++) {
      const u = u0 + 0.12 + i * 0.2;
      const poly: Pt[] = [iso.P(u, v1, zr), iso.P(u, v1, zr + 9)];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        poly.push(iso.P(u + 0.1 * t, v1, zr + 9 + Math.sin(t * Math.PI) * 4));
      }
      poly.push(iso.P(u + 0.1, v1, zr + 9), iso.P(u + 0.1, v1, zr));
      iso.r.poly(poly, alpha(COLORS.glassDark, 0.85));
    }
  }
  // the saw-tooth north-light glazed roof
  for (let i = 0; i < 5; i++) {
    const vA = v0 + 0.06 + i * ((v1 - v0 - 0.1) / 5);
    const vB = vA + (v1 - v0 - 0.1) / 5;
    iso.r.poly([iso.P(u0, vA, 46), iso.P(u1, vA, 46), iso.P(u1, vA, 58), iso.P(u0, vA, 58)], alpha(COLORS.glassLit, 0.6));
    iso.r.poly([iso.P(u0, vA, 58), iso.P(u1, vA, 58), iso.P(u1, vB, 46), iso.P(u0, vB, 46)], shaded(SLATE, 0.05));
  }
  return iso.build();
}

// =====================================================================
// NEWCASTLE CATHEDRAL (St Nicholas) — its SIGNATURE: the rare 15th-century
// LANTERN tower — a square Perpendicular bell-tower crowned by an openwork
// crown spire carried on four flying-buttress "arms" rising to a central
// lantern pinnacle (one of only a handful in Britain). 2×2, towering.
// =====================================================================
function newcastleCathedralTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 220 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long low nave + aisles
  iso.box(u0, v0 + 0.1, u1, v1, 0, 44, NORMAN);
  iso.gable(u0, v0 + 0.1, u1, v1, 44, 16, 'u', SLATE, NORMAN);
  // big Perpendicular windows down the aisle
  for (let i = 0; i < 5; i++) lancet(iso, v1, u0 + 0.12 + i * 0.2, 0.1, 12, 30, alpha(COLORS.glassDark, 0.85));
  // the great west TOWER at the front-left corner
  const tu = u0 + 0.3, tv = v1 - 0.3, hw = 0.26;
  const towZ = 118;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, towZ, NORMAN);
  // belfry openings + clock
  for (const [pu, pz] of [[tu - 0.1, 70], [tu + 0.04, 70]] as const) {
    iso.r.poly([iso.P(pu, tv + hw, pz), iso.P(pu + 0.08, tv + hw, pz), iso.P(pu + 0.08, tv + hw, pz + 18), iso.P(pu + 0.04, tv + hw, pz + 24), iso.P(pu, tv + hw, pz + 18)], alpha(COLORS.glassDark, 0.85));
  }
  // battlemented parapet
  iso.box(tu - hw - 0.03, tv - hw - 0.03, tu + hw + 0.03, tv + hw + 0.03, towZ, towZ + 6, lighten(NORMAN, 0.06), { ink: false });
  // THE CROWN SPIRE: four corner pinnacles, flying arms to a central lantern.
  const corners: ReadonlyArray<readonly [number, number]> = [
    [tu - hw, tv - hw], [tu + hw, tv - hw], [tu - hw, tv + hw], [tu + hw, tv + hw],
  ];
  for (const [cu, cv] of corners) pinnacle(iso, cu, cv, towZ + 6, 40, NORMAN);
  const lanternBase = iso.P(tu, tv, towZ + 6);
  const lanternTop = iso.P(tu, tv, towZ + 78);
  // the flying arms from each corner pinnacle up to the lantern
  for (const [cu, cv] of corners) {
    const ct = iso.P(cu, cv, towZ + 36);
    iso.r.line(ct, [lanternBase[0], lanternBase[1] - 30 * RES], 1.2 * RES, NORMAN_D);
  }
  // the central lantern + crown spike
  iso.box(tu - 0.07, tv - 0.07, tu + 0.07, tv + 0.07, towZ + 30, towZ + 60, lighten(NORMAN, 0.04));
  iso.r.poly([[lanternTop[0] - 4 * RES, lanternTop[1] + 18 * RES], [lanternTop[0] + 4 * RES, lanternTop[1] + 18 * RES], lanternTop], lit(NORMAN, 0.1));
  iso.r.polyline([[lanternTop[0] - 4 * RES, lanternTop[1] + 18 * RES], lanternTop, [lanternTop[0] + 4 * RES, lanternTop[1] + 18 * RES]], INK_W * 0.6, INK);
  iso.r.line(lanternTop, [lanternTop[0], lanternTop[1] - 6 * RES], 1.2 * RES, GILT);
  return iso.build();
}

// =====================================================================
// GOTHIC-REVIVAL SPIRED CATHEDRAL — a stone nave with a single tall broach
// spire over a west tower (Pugin's St Mary's RC has a 222-ft spire). Serves
// Cathedral Church of St. Mary, St Mary's RC Church, and the big spired
// churches. 2×2, the spire towers.
// =====================================================================
function spiredCathedralTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 240 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // nave + steep slate roof (ridge along u)
  iso.box(u0, v0 + 0.12, u1, v1, 0, 50, NORMAN);
  iso.gable(u0, v0 + 0.12, u1, v1, 50, 24, 'u', SLATE, NORMAN);
  for (let i = 0; i < 5; i++) lancet(iso, v1, u0 + 0.1 + i * 0.2, 0.09, 12, 32, alpha(COLORS.glassDark, 0.85));
  // the west tower at the front-left, carrying the spire
  const tu = u0 + 0.26, tv = v1 - 0.26, hw = 0.2;
  const towZ = 96;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, towZ, NORMAN);
  // belfry louvres + clock face
  iso.r.poly([iso.P(tu - 0.1, tv + hw, 56), iso.P(tu + 0.1, tv + hw, 56), iso.P(tu + 0.1, tv + hw, 78), iso.P(tu - 0.1, tv + hw, 78)], alpha(COLORS.glassDark, 0.85));
  const [clx, cly] = iso.P(tu, tv + hw, 44);
  iso.r.poly(circlePts(clx, cly, 3.4 * RES), SAND_L);
  iso.r.polyline(circlePts(clx, cly, 3.4 * RES), INK_W * 0.5, INK, true);
  // the tall broach SPIRE + corner pinnacles
  for (const [cu, cv] of [[tu - hw, tv - hw], [tu + hw, tv - hw], [tu - hw, tv + hw], [tu + hw, tv + hw]] as const) {
    pinnacle(iso, cu, cv, towZ, 26, NORMAN);
  }
  const base = iso.P(tu, tv, towZ);
  const tip = iso.P(tu, tv, towZ + 116);
  iso.r.poly([[base[0] - 8 * RES, base[1]], tip, [base[0], base[1] - 3 * RES]], shaded(SLATE, 0.1));
  iso.r.poly([[base[0], base[1] - 3 * RES], tip, [base[0] + 8 * RES, base[1]]], lit(SLATE, 0.08));
  iso.r.polyline([[base[0] - 8 * RES, base[1]], tip, [base[0] + 8 * RES, base[1]]], INK_W * 0.8, INK);
  iso.r.line(tip, [tip[0], tip[1] - 6 * RES], 1 * RES, GILT);
  return iso.build();
}

/** circle helper (screen-space). */
function circlePts(cx: number, cy: number, r: number, ry = r): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]);
  }
  return pts;
}

// =====================================================================
// DURHAM CATHEDRAL — the great Norman cathedral: TWO massive square western
// towers + a taller square central crossing tower, a long Romanesque nave with
// round-headed arcading, in pale Durham sandstone on its peninsula. Authored
// for when placement adds it. 3×3 (broad + monumental).
// =====================================================================
function durhamCathedralTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long Romanesque nave + aisles + slate roof (ridge along u)
  iso.box(u0, v0 + 0.3, u1, v1, 0, 56, NORMAN);
  iso.gable(u0, v0 + 0.3, u1, v1, 56, 20, 'u', SLATE, NORMAN);
  // two storeys of round-headed Norman arcading down the south flank
  for (const zr of [12, 30] as const) {
    for (let i = 0; i < 9; i++) {
      const u = u0 + 0.12 + i * 0.26;
      const poly: Pt[] = [iso.P(u, v1, zr), iso.P(u, v1, zr + 8)];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        poly.push(iso.P(u + 0.13 * t, v1, zr + 8 + Math.sin(t * Math.PI) * 4));
      }
      poly.push(iso.P(u + 0.13, v1, zr + 8), iso.P(u + 0.13, v1, zr));
      iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
    }
  }
  // a square tower with battlement + corner pinnacles
  const tower = (cu: number, cv: number, hw: number, z: number): void => {
    iso.box(cu - hw, cv - hw, cu + hw, cv + hw, 0, z, NORMAN);
    // tall paired round-headed bell openings
    for (const off of [-0.08, 0.04] as const) {
      const poly: Pt[] = [iso.P(cu + off, cv + hw, z - 36), iso.P(cu + off + 0.07, cv + hw, z - 36)];
      for (let j = 0; j <= 5; j++) { const t = j / 5; poly.push(iso.P(cu + off + 0.07 * t, cv + hw, z - 14 + Math.sin(t * Math.PI) * 3)); }
      iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
    }
    iso.box(cu - hw - 0.03, cv - hw - 0.03, cu + hw + 0.03, cv + hw + 0.03, z, z + 6, lighten(NORMAN, 0.06), { ink: false });
    for (const [pu, pv] of [[cu - hw, cv - hw], [cu + hw, cv - hw], [cu - hw, cv + hw], [cu + hw, cv + hw]] as const) {
      pinnacle(iso, pu, pv, z + 6, 22, NORMAN);
    }
  };
  // the two western towers at the front (high v) and the dominant central tower
  tower(u0 + 0.34, v1 - 0.34, 0.26, 108);
  tower(u1 - 0.34, v1 - 0.34, 0.26, 108);
  tower((u0 + u1) / 2, (v0 + v1) / 2 + 0.1, 0.32, 150); // central crossing tower (tallest)
  return iso.build();
}

// =====================================================================
// THE ANGEL OF THE NORTH — Gormley's rust-CORTEN steel figure on the hill: a
// tall standing body-column with two huge horizontal aircraft-wing arms (54 m
// span, slightly pitched). The silhouette is the cross/aeroplane shape. 2×2,
// the wings spread wide, on a low grassy mound.
// =====================================================================
function angelOfTheNorthTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 180 });
  void seed;
  const cu = 1.0, cv = 1.0;
  iso.shadow(cu - 0.4, cv - 0.2, cu + 0.4, cv + 0.5, 0.3, 0.24);
  // the grassy mound it stands on
  iso.box(0.3, 0.3, 1.7, 1.7, 0, 8, shaded(GREEN, 0.06), { ink: false });
  // the body column — a broad-shouldered tapering ribbed steel torso (20 m)
  const bodyZ = 138;
  iso.box(cu - 0.12, cv - 0.09, cu + 0.12, cv + 0.09, 8, bodyZ, CORTEN);
  // a few vertical rib seams up the body (the welded steel ribs)
  for (const off of [-0.06, 0, 0.06] as const) {
    iso.r.line(iso.P(cu + off, cv + 0.09, 10), iso.P(cu + off, cv + 0.09, bodyZ - 4), 0.6 * RES, alpha(CORTEN_L, 0.7));
  }
  // the head block
  iso.box(cu - 0.07, cv - 0.06, cu + 0.07, cv + 0.06, bodyZ, bodyZ + 16, CORTEN_L);
  // THE WINGS: the signature — two ENORMOUS flat ribbed planes spanning almost
  // the whole footprint along the u axis (one tip toward screen lower-right, one
  // upper-left), set just below the head, raked slightly FORWARD (toward +v),
  // and drawn as thick slabs so they read as the 54 m wingspan, not threads.
  const shoulderZ = bodyZ - 18;
  const tipDrop = 6; // tips dip a touch below the shoulder
  const wingT = 12; // slab thickness (z) so the wing reads solid
  for (const dir of [-1, 1] as const) {
    const ut = cu + dir * 0.86; // wingtip u — out to the footprint edge
    // forward rake: the leading edge (toward +v) is a touch lower at the tip
    const topFace: Pt[] = [
      iso.P(cu + dir * 0.1, cv - 0.06, shoulderZ + wingT),
      iso.P(ut, cv - 0.12, shoulderZ - tipDrop + wingT),
      iso.P(ut, cv + 0.12, shoulderZ - tipDrop + wingT),
      iso.P(cu + dir * 0.1, cv + 0.06, shoulderZ + wingT),
    ];
    const frontFace: Pt[] = [
      iso.P(cu + dir * 0.1, cv + 0.06, shoulderZ + wingT),
      iso.P(ut, cv + 0.12, shoulderZ - tipDrop + wingT),
      iso.P(ut, cv + 0.12, shoulderZ - tipDrop),
      iso.P(cu + dir * 0.1, cv + 0.06, shoulderZ),
    ];
    // draw the far wing's underside first via the leading face, then top
    iso.r.poly(frontFace, dir < 0 ? shaded(CORTEN, 0.12) : shaded(CORTEN, 0.06));
    iso.r.poly(topFace, dir < 0 ? lit(CORTEN, 0.02) : lit(CORTEN, 0.08));
    iso.r.polyline(topFace, INK_W * 0.8, INK, true);
    iso.r.polyline(frontFace, INK_W * 0.6, alpha(INK, 0.8), true);
    // the vertical-rib feathering fanning out along the wing
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const u = cu + dir * (0.1 + 0.76 * t);
      iso.r.line(iso.P(u, cv - 0.1, shoulderZ - tipDrop * t + wingT), iso.P(u, cv + 0.1, shoulderZ - tipDrop * t), 0.6 * RES, alpha(CORTEN_L, 0.6));
    }
  }
  return iso.build();
}

// =====================================================================
// PENSHAW MONUMENT — the great Doric folly on the hill (a half-size echo of the
// Temple of Hephaestus): a black gritstone PERISTYLE of fat Doric columns
// carrying an entablature, open in the middle, on a stepped base, on a green
// mound. 2×2. Famously floodlit on its ridge.
// =====================================================================
function penshawMonumentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  const STONE = hex('#5b5750'); // sooty gritstone (it reads near-black)
  const STONE_L = hex('#7a766d');
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the green hill mound
  iso.box(0.28, 0.28, 1.72, 1.72, 0, 6, shaded(GREEN, 0.08), { ink: false });
  // the stepped stylobate
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 6, 16, STONE_L);
  iso.box(u0, v0, u1, v1, 16, 22, STONE_L, { ink: false });
  const colZ0 = 22, colZ1 = 64;
  // the entablature roof first (so columns read in front of the far side)
  // far-side columns (along v0)
  colonnade(iso, v0, u0 + 0.06, u1 - 0.06, colZ0, colZ1, 6, STONE);
  // the heavy entablature carried on top
  iso.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, colZ1, colZ1 + 10, STONE_L);
  // the two visible peristyle faces of fat Doric columns
  colonnade(iso, v1, u0 + 0.06, u1 - 0.06, colZ0, colZ1, 6, STONE);
  for (let i = 0; i <= 6; i++) {
    const v = v0 + 0.06 + ((v1 - v0 - 0.12) * i) / 6;
    iso.r.poly([iso.P(u1, v - 0.02, colZ1), iso.P(u1, v + 0.02, colZ1), iso.P(u1, v + 0.02, colZ0), iso.P(u1, v - 0.02, colZ0)], i % 2 ? lit(STONE, 0.06) : STONE);
  }
  return iso.build();
}

// =====================================================================
// COLUMN MONUMENT — a single tall fluted column on a square pedestal crowned by
// a standing statue (Grey's Monument; Collingwood's Monument). 1×1, spikes up.
// =====================================================================
function columnMonumentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const u = 0.5, v = 0.52;
  const STONE = hex('#cabfa6');
  iso.shadow(u - 0.18, v - 0.1, u + 0.18, v + 0.18, 0.3, 0.24);
  // the tall stepped pedestal
  iso.box(u - 0.16, v - 0.16, u + 0.16, v + 0.16, 0, 22, STONE);
  iso.box(u - 0.12, v - 0.12, u + 0.12, v + 0.12, 22, 34, lighten(STONE, 0.04));
  // the fluted column shaft
  const colZ = 150;
  iso.box(u - 0.07, v - 0.07, u + 0.07, v + 0.07, 34, colZ, lighten(STONE, 0.02));
  for (const off of [-0.04, 0, 0.04] as const) {
    iso.r.line(iso.P(u + off, v + 0.07, 36), iso.P(u + off, v + 0.07, colZ - 2), 0.5 * RES, alpha(SAND_D, 0.6));
  }
  // capital
  iso.box(u - 0.1, v - 0.1, u + 0.1, v + 0.1, colZ, colZ + 8, lighten(STONE, 0.06));
  // the standing statue silhouette on top
  const [sx, syB] = iso.P(u, v, colZ + 8);
  iso.r.poly([[sx - 2.4 * RES, syB], [sx + 2.4 * RES, syB], [sx + 1.4 * RES, syB - 16 * RES], [sx - 1.4 * RES, syB - 16 * RES]], shaded(STONE, 0.1));
  iso.r.line([sx, syB - 16 * RES], [sx, syB - 22 * RES], 1.2 * RES, STONE);
  return iso.build();
}

// =====================================================================
// WINGED-VICTORY WAR MEMORIAL — a stone obelisk/plinth crowned by a bronze
// winged figure (the South African War Memorial / Response). 1×1.
// =====================================================================
function warMemorialTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 160 });
  void seed;
  const u = 0.5, v = 0.52;
  const STONE = hex('#cabfa6');
  const BRONZE = hex('#6f7b62');
  iso.shadow(u - 0.2, v - 0.1, u + 0.2, v + 0.2, 0.3, 0.24);
  iso.box(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 0, 16, STONE);
  // tapering plinth
  iso.box(u - 0.12, v - 0.12, u + 0.12, v + 0.12, 16, 78, lighten(STONE, 0.03));
  iso.box(u - 0.14, v - 0.14, u + 0.14, v + 0.14, 78, 84, lighten(STONE, 0.06));
  // the bronze winged victory on top
  const [sx, syB] = iso.P(u, v, 84);
  iso.r.poly([[sx - 2 * RES, syB], [sx + 2 * RES, syB], [sx, syB - 20 * RES]], BRONZE);
  // outspread wings
  iso.r.poly([[sx - 1 * RES, syB - 12 * RES], [sx - 9 * RES, syB - 18 * RES], [sx - 1 * RES, syB - 6 * RES]], lit(BRONZE, 0.06));
  iso.r.poly([[sx + 1 * RES, syB - 12 * RES], [sx + 9 * RES, syB - 18 * RES], [sx + 1 * RES, syB - 6 * RES]], shaded(BRONZE, 0.06));
  return iso.build();
}

// =====================================================================
// NORTHUMBERLANDIA — "the Lady of the North": a vast reclining female LAND-FORM
// of grassed earth (the largest human-form landform). Not a building — a green
// sculpted hillscape of head, body and limbs. 3×3, very low, all green.
// =====================================================================
function northumberlandiaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 50 });
  void seed;
  iso.shadow(0.4, 0.5, 2.6, 2.6, 0.24, 0.2);
  const G = GREEN, GD = shaded(GREEN, 0.1), GL = lit(GREEN, 0.06);
  // a soft grassy base
  iso.box(0.3, 0.4, 2.7, 2.7, 0, 4, GD, { ink: false });
  // a reclining-figure of grassed mounds: head, breast, hip, knee — rising
  // ridges of differing heights along a diagonal.
  const mound = (cu: number, cv: number, ru: number, rv: number, h: number): void => {
    const [cx, cyB] = iso.P(cu, cv, 4);
    const R = ru * (CELL_W / 2);
    const RV = rv * (CELL_W / 2) * 0.5;
    const ring = (s: number, z: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; pts.push([cx + Math.cos(a) * R * s, cyB - z * RES + Math.sin(a) * RV * s]); }
      return pts;
    };
    iso.r.poly(ring(1, 0), G);
    iso.r.poly(ring(0.7, h * 0.6), GL);
    iso.r.poly(ring(0.4, h), top(G, 0.12));
    iso.r.polyline(ring(1, 0), INK_W * 0.5, alpha(INK, 0.45), true);
  };
  mound(0.85, 0.95, 0.34, 0.34, 30); // head
  mound(1.35, 1.4, 0.4, 0.5, 40); // breast/body (highest)
  mound(1.95, 1.95, 0.42, 0.5, 34); // hip
  mound(2.4, 2.45, 0.32, 0.36, 22); // knee
  // a winding path tracing the form
  iso.r.polyline([iso.P(0.7, 1.0, 6), iso.P(1.3, 1.5, 9), iso.P(2.0, 2.0, 8), iso.P(2.5, 2.5, 5)], 1.4 * RES, alpha(SAND_L, 0.7));
  return iso.build();
}

// =====================================================================
// ENGLISH-BAROQUE COUNTRY HALL — Vanbrugh's Seaton Delaval read: a tall central
// rusticated block with a balustraded roofline, paired giant columns/pilasters,
// flanking lower wings, twin square turrets. Serves Seaton Delaval Hall,
// Lambton/Lumley-scale halls. 2×2.
// =====================================================================
function baroqueHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const STONE = hex('#bdb49b'); // sober grey-buff Vanbrugh stone
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the two lower flanking wings
  iso.box(u0, v1 - 0.5, u0 + 0.34, v1, 0, 34, STONE);
  iso.box(u1 - 0.34, v1 - 0.5, u1, v1, 0, 34, STONE);
  // the tall central block
  iso.box(u0 + 0.34, v0 + 0.2, u1 - 0.34, v1, 0, 56, lighten(STONE, 0.03));
  // giant paired columns across the front
  colonnade(iso, v1, u0 + 0.42, u1 - 0.42, 8, 50, 6, COLORS.white);
  // balustraded parapet + central pediment
  iso.box(u0 + 0.32, v0 + 0.18, u1 - 0.32, v1 + 0.02, 56, 61, lighten(STONE, 0.08), { ink: false });
  pediment(iso, v1, u0 + 0.46, u1 - 0.46, 56, 12, STONE);
  // the two square corner turrets that crown the centre block
  for (const cu of [u0 + 0.42, u1 - 0.42] as const) {
    iso.box(cu - 0.1, v0 + 0.22, cu + 0.1, v0 + 0.42, 56, 78, STONE);
    iso.box(cu - 0.12, v0 + 0.2, cu + 0.12, v0 + 0.44, 78, 82, lighten(STONE, 0.06), { ink: false });
  }
  return iso.build();
}

// =====================================================================
// CASTELLATED GOTHIC-REVIVAL CASTLE — a romantic 19th-c. castle (Lambton): a
// tall keep-like block with battlemented round + square towers of varied height
// and a long curtain range. Serves Lambton, Ravensworth, Lumley. 2×2.
// =====================================================================
function castellatedCastleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the long curtain range
  iso.box(u0, v0 + 0.2, u1, v1, 0, 44, NORMAN);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 12, 32, 7, alpha(COLORS.glassDark, 0.85), NORMAN_D);
  // battlemented parapet on the range
  battlement(iso, u0, v1, u1, 44);
  // a tall square keep-tower
  const tu = u0 + 0.3, tv = v1 - 0.3;
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.18, 0, 100, NORMAN);
  battlementSquare(iso, tu, 0.18, tv, 100);
  // two flanking round towers of differing height
  for (const [cu, cv, h] of [[u1 - 0.28, v1 - 0.28, 72], [u1 - 0.5, v0 + 0.4, 56]] as const) {
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 0, h, NORMAN);
    iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, h, h + 4, lighten(NORMAN, 0.06), { ink: false });
    // crenel ring
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const [bx, by] = iso.P(cu + Math.cos(a) * 0.12, cv + Math.sin(a) * 0.12, h + 4);
      iso.r.rect(bx - 1.2 * RES, by - 4 * RES, bx + 1.2 * RES, by, NORMAN);
    }
  }
  return iso.build();
}

/** Battlemented parapet along the v1 (left) face from u0..u1 at top z. */
function battlement(iso: Iso, u0: number, v1: number, u1: number, z: number): void {
  iso.box(u0 - 0.02, v1 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 3, lighten(NORMAN, 0.06), { ink: false });
  const n = Math.round((u1 - u0) / 0.12);
  for (let i = 0; i <= n; i += 1) {
    const u = u0 + ((u1 - u0) * i) / n;
    const [bx, by] = iso.P(u, v1, z + 3);
    iso.r.rect(bx - 1.4 * RES, by - 4 * RES, bx + 1.4 * RES, by, lighten(NORMAN, 0.04));
  }
}

/** Battlemented crown on a square tower centred (u,v) half-width hw at top z. */
function battlementSquare(iso: Iso, u: number, hw: number, v: number, z: number): void {
  iso.box(u - hw - 0.03, v - hw - 0.03, u + hw + 0.03, v + hw + 0.03, z, z + 5, lighten(NORMAN, 0.06), { ink: false });
  for (const v2 of [v + hw, v - hw] as const) {
    for (let i = -2; i <= 2; i++) {
      const [bx, by] = iso.P(u + i * (hw / 2.5), v2, z + 5);
      iso.r.rect(bx - 1.5 * RES, by - 5 * RES, bx + 1.5 * RES, by, NORMAN);
    }
  }
}

// =====================================================================
// NORMAN KEEP / CASTLE RUIN — a stout square Norman great-tower with clasping
// corner buttresses + battlement, optionally a fragment of curtain wall (for
// the ruined castles). Serves Prudhoe, Hylton, Tynemouth Priory & Castle,
// Bywell, Aydon, Halton, Beaufront, Dilston, Vicar's Pele. 2×2.
// =====================================================================
function normanKeepTile(seed: number, ruin: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  const STONE = hex('#bcae8f'); // weathered Norman ragstone
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a low grassy bailey + fragment of curtain wall
  iso.box(0.3, 0.34, 1.7, 1.7, 0, 6, shaded(GREEN, 0.08), { ink: false });
  iso.box(u0, v1 - 0.16, u1 - (ruin ? 0.5 : 0.0), v1, 0, ruin ? 22 : 30, STONE);
  // the great square keep, front-left
  const ku = u0 + 0.36, kv = v1 - 0.36, hw = 0.3;
  const keepZ = ruin ? 70 : 92;
  iso.box(ku - hw, kv - hw, ku + hw, kv + hw, 0, keepZ, STONE);
  // narrow round-headed Norman windows up the face
  for (const [pu, pz] of [[ku - 0.1, 34], [ku + 0.06, 50], [ku - 0.02, 64]] as const) {
    iso.r.rect(...rectAt(iso, pu, kv + hw, pz, 0.04, 8), alpha(COLORS.glassDark, 0.8));
  }
  // clasping corner buttress-turrets, one taller (the forebuilding)
  for (const [cu, cv, extra] of [[ku - hw, kv - hw, 8], [ku + hw, kv - hw, 0], [ku - hw, kv + hw, 0], [ku + hw, kv + hw, 14]] as const) {
    iso.box(cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, 0, keepZ + extra, STONE);
  }
  if (ruin) {
    // a broken, jagged top edge on the keep (ruin read)
    const [tx, ty] = iso.P(ku, kv + hw, keepZ);
    iso.r.poly([[tx - 12 * RES, ty], [tx - 6 * RES, ty - 6 * RES], [tx, ty - 1 * RES], [tx + 6 * RES, ty - 7 * RES], [tx + 12 * RES, ty - 2 * RES], [tx + 12 * RES, ty + 4 * RES], [tx - 12 * RES, ty + 4 * RES]], shaded(STONE, 0.06));
  } else {
    battlementSquareStone(iso, ku, hw, kv, keepZ, STONE);
  }
  return iso.build();
}

/** rect-at helper returning the 4 numeric args for iso.r.rect on the v-face. */
function rectAt(iso: Iso, u: number, v: number, z: number, w: number, h: number): [number, number, number, number] {
  const [x, y] = iso.P(u, v, z);
  return [x - w * (CELL_W / 2), y - h * RES, x + w * (CELL_W / 2), y];
}

/** Stone battlement crown on a square tower (parameterised colour). */
function battlementSquareStone(iso: Iso, u: number, hw: number, v: number, z: number, col: RGBA): void {
  iso.box(u - hw - 0.03, v - hw - 0.03, u + hw + 0.03, v + hw + 0.03, z, z + 5, lighten(col, 0.06), { ink: false });
  for (const v2 of [v + hw, v - hw] as const) {
    for (let i = -2; i <= 2; i++) {
      const [bx, by] = iso.P(u + i * (hw / 2.5), v2, z + 5);
      iso.r.rect(bx - 1.6 * RES, by - 5 * RES, bx + 1.6 * RES, by, col);
    }
  }
}

// =====================================================================
// SEASIDE LIGHTHOUSE — a tall tapering tower with a glazed lantern + gallery.
// Two liveries: red-and-white banded (Souter) or plain white (St Mary's,
// Tynemouth). 1×1, on a rocky/island base, spikes up.
// =====================================================================
function lighthouseTile(seed: number, banded: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const u = 0.5, v = 0.52;
  const H = 150;
  iso.shadow(u - 0.2, v - 0.1, u + 0.22, v + 0.2, 0.3, 0.24);
  // rocky base / island
  iso.box(u - 0.26, v - 0.22, u + 0.26, v + 0.24, 0, 12, shaded(hex('#8a8478'), 0.08), { ink: false });
  // keeper's cottages at the foot
  iso.box(u - 0.28, v + 0.06, u - 0.06, v + 0.26, 12, 26, COLORS.white);
  iso.hip(u - 0.3, v + 0.04, u - 0.04, v + 0.28, 26, 6, LIGHTRED);
  // the tapering tower (drawn as a stack of narrowing rings)
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const z0 = 12 + (H - 12) * (i / segs);
    const z1 = 12 + (H - 12) * ((i + 1) / segs);
    const hw = 0.16 - 0.07 * (i / segs);
    const band = banded && i % 2 === 1 ? LIGHTRED : COLORS.white;
    iso.box(u - hw, v - hw, u + hw, v + hw, z0, z1, band);
  }
  // the gallery + glazed lantern room + dome cap
  const gw = 0.11;
  iso.box(u - gw, v - gw, u + gw, v + gw, H, H + 4, hex('#3a3f46'), { ink: false }); // gallery deck
  iso.box(u - 0.08, v - 0.08, u + 0.08, v + 0.08, H + 4, H + 18, alpha(COLORS.glassLit, 0.85)); // lantern glass
  cap(iso, u, 0.09, v, H + 18, 10, LIGHTRED);
  // the beam glint
  iso.glint(iso.P(u, v, H + 11), 2.4 * RES);
  return iso.build();
}

// =====================================================================
// SPANISH CITY — the Edwardian seaside pleasure dome at Whitley Bay: a white
// Baroque pavilion crowned by a big white ferro-concrete DOME flanked by two
// smaller cupola turrets, an arched colonnade front. 2×2.
// =====================================================================
function spanishCityTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  const WHITE = hex('#ece7da');
  const WSH = hex('#cdc7b8');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the white pavilion body
  iso.box(u0, v0 + 0.1, u1, v1, 0, 40, WHITE);
  // arched colonnade front
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.1 + i * 0.23;
    const poly: Pt[] = [iso.P(u, v1, 6), iso.P(u, v1, 22)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.14 * t, v1, 22 + Math.sin(t * Math.PI) * 6)); }
    poly.push(iso.P(u + 0.14, v1, 22), iso.P(u + 0.14, v1, 6));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.7));
  }
  iso.box(u0 - 0.03, v0 + 0.07, u1 + 0.03, v1 + 0.03, 40, 45, lighten(WHITE, 0.06), { ink: false });
  // the central DOME on a drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 + 0.06;
  iso.box(cx - 0.26, cy - 0.26, cx + 0.26, cy + 0.26, 45, 56, WHITE);
  domeWhite(iso, cx, cy, 56, 0.3 * (CELL_W / 2), 1.1, WHITE, WSH);
  // two flanking cupola turrets
  for (const tu of [u0 + 0.18, u1 - 0.18] as const) {
    iso.box(tu - 0.1, v1 - 0.34, tu + 0.1, v1 - 0.12, 40, 58, WHITE);
    domeWhite(iso, tu, v1 - 0.23, 58, 0.12 * (CELL_W / 2), 1.2, WHITE, WSH);
  }
  return iso.build();
}

/** A white half-dome (ferro-concrete / lead) at a tile point; tip carries a
 *  small finial. Returns nothing — a self-contained crown. */
function domeWhite(iso: Iso, cx: number, cy: number, baseZ: number, rPx: number, riseMul: number, body: RGBA, sh: RGBA): void {
  const [dx, dyB] = iso.P(cx, cy, baseZ);
  const rise = rPx * riseMul;
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); pts.push([dx + Math.cos(a) * rPx * s, dyB - Math.sin(a) * rise * s]); }
    return pts;
  };
  iso.r.poly(ring(1), sh, lit(body, 0.06));
  iso.r.poly(ring(0.6).map(([x, y]): Pt => [x + rPx * 0.14, y - rise * 0.12]), lit(body, 0.14));
  iso.r.polyline(ring(1), INK_W * 0.7, INK);
  iso.r.line([dx, dyB - rise], [dx, dyB - rise - 5 * RES], 1 * RES, GILT);
}

// =====================================================================
// MARSDEN ROCK — the great limestone SEA STACK off the coast: a flat-topped
// pillar of pale cliff-stone rising sheer from the sea, streaked white with
// guano, gulls wheeling. Not a building — a natural hero. 2×2, mostly sea.
// =====================================================================
function marsdenRockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ROCK = hex('#b7ab92'); // pale magnesian limestone
  const ROCK_D = hex('#94896f');
  // the sea plate
  iso.box(0.1, 0.2, 1.9, 1.85, -4, 2, shaded(SEA, 0.08), { ink: false });
  // foam ring around the base
  iso.r.poly(circlePts(...isoXY(iso, 1.0, 1.05, 2), 18 * RES, 9 * RES), alpha(COLORS.white, 0.3));
  // the sheer stack — a tapering faceted column with a flat top
  const cu = 1.0, cv = 1.05;
  iso.box(cu - 0.34, cv - 0.3, cu + 0.34, cv + 0.3, 2, 70, ROCK, { leftC: shaded(ROCK, 0.16), rightC: lit(ROCK, 0.06), topC: top(ROCK, 0.2) });
  // vertical erosion striations
  for (const off of [-0.2, -0.06, 0.1, 0.24] as const) {
    iso.r.line(iso.P(cu + off, cv + 0.3, 6), iso.P(cu + off, cv + 0.3, 66), 0.6 * RES, alpha(ROCK_D, 0.6));
  }
  // guano streaks near the top
  iso.r.line(iso.P(cu - 0.1, cv + 0.3, 60), iso.P(cu - 0.1, cv + 0.3, 50), 1 * RES, alpha(COLORS.white, 0.5));
  // a grassy tuft on the flat top
  iso.box(cu - 0.3, cv - 0.26, cu + 0.3, cv + 0.26, 70, 73, shaded(GREEN, 0.06), { ink: false });
  // wheeling gulls
  for (const [gu, gz] of [[cu - 0.5, 84], [cu + 0.4, 78], [cu + 0.1, 90]] as const) {
    const [gx, gy] = iso.P(gu, cv, gz);
    iso.r.line([gx - 3 * RES, gy + 1.5 * RES], [gx, gy], 0.7 * RES, INK);
    iso.r.line([gx, gy], [gx + 3 * RES, gy + 1.5 * RES], 0.7 * RES, INK);
  }
  return iso.build();
}

/** screen XY of a tile point (for circle helpers). */
function isoXY(iso: Iso, u: number, v: number, z: number): [number, number] {
  const [x, y] = iso.P(u, v, z);
  return [x, y];
}

// =====================================================================
// RIVERSIDE GLASS MUSEUM — the National Glass Centre read: a low building set
// into the riverbank under a great sloping GLASS ROOF you can walk on, all
// transparent panes on a steel grid. 2×2.
// =====================================================================
function glassCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a low stone/steel base
  iso.box(u0, v0, u1, v1, 0, 16, STEEL_D);
  // the big sloping glass roof (a single inclined glazed plane)
  iso.r.poly([iso.P(u0, v0, 40), iso.P(u1, v0, 40), iso.P(u1, v1, 16), iso.P(u0, v1, 16)], alpha(COLORS.glassLit, 0.6));
  // the steel grid on the glass
  for (let i = 0; i <= 6; i++) {
    const u = u0 + ((u1 - u0) * i) / 6;
    iso.r.line(iso.P(u, v0, 40), iso.P(u, v1, 16), 0.6 * RES, alpha(COLORS.white, 0.5));
  }
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    iso.r.line(iso.P(u0, v0 + (v1 - v0) * t, 40 - 24 * t), iso.P(u1, v0 + (v1 - v0) * t, 40 - 24 * t), 0.6 * RES, alpha(COLORS.white, 0.4));
  }
  iso.r.polyline([iso.P(u0, v0, 40), iso.P(u1, v0, 40), iso.P(u1, v1, 16), iso.P(u0, v1, 16)], INK_W * 0.7, INK, true);
  return iso.build();
}

// =====================================================================
// NEOCLASSICAL PORTICO MUSEUM/GALLERY — a grand civic stone block with a giant
// columned portico + pediment and a balustraded roof. Serves Great North
// Museum: Hancock, Laing Art Gallery (baroque), Shipley/Hatton galleries,
// Sunderland Museum, civic blocks. 2×2; `domed` adds a winter-garden dome.
// =====================================================================
function porticoMuseumTile(seed: number, domed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: domed ? 110 : 80 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, SAND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(SAND, 0.12), { ink: false });
  // a row of tall windows along the flank
  iso.windowsLeft(v1, u0 + 0.4, u1 - 0.1, 14, 36, 4, alpha(COLORS.glassDark, 0.85), SAND_L);
  // the projecting central portico: columns + pediment
  iso.box(u0 + 0.28, v1 - 0.18, u0 + 0.78, v1, 0, 44, lighten(SAND, 0.03));
  colonnade(iso, v1, u0 + 0.3, u0 + 0.76, 8, 42, 5, COLORS.white);
  pediment(iso, v1, u0 + 0.28, u0 + 0.78, 44, 12, SAND);
  // balustraded parapet + corner urns
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 46, 50, lighten(SAND, 0.08), { ink: false });
  if (domed) {
    // a glazed winter-garden dome to the rear
    const cx = u1 - 0.4, cy = v0 + 0.4;
    iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 46, 56, alpha(COLORS.glassSky, 0.9));
    domeWhite(iso, cx, cy, 56, 0.22 * (CELL_W / 2), 1.0, alpha(COLORS.glassLit, 0.85) as RGBA, alpha(COLORS.glassSky, 0.9) as RGBA);
  } else {
    // a small central cupola / clock turret
    const cx = (u0 + u1) / 2 + 0.1, cy = (v0 + v1) / 2;
    iso.box(cx - 0.1, cy - 0.1, cx + 0.1, cy + 0.1, 50, 66, SAND);
    iso.hip(cx - 0.12, cy - 0.12, cx + 0.12, cy + 0.12, 66, 10, LEAD);
  }
  return iso.build();
}

// =====================================================================
// EDWARDIAN BAROQUE CIVIC BLOCK with a domed corner turret — Discovery Museum /
// Blandford House read: a red-brick-and-stone palazzo with a tall ogee-domed
// corner tower. Serves Discovery Museum, Blandford House, Sunderland Empire,
// the big banks. 2×2.
// =====================================================================
function edwardianBaroqueTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // brick-and-stone body
  iso.box(u0, v0, u1, v1, 0, 52, hex('#a05c46'));
  // stone quoin bands at each storey
  for (let z = 14; z < 50; z += 18) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1 * RES, alpha(SAND_L, 0.7));
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.28, 16, 44, 6, alpha(COLORS.glassDark, 0.85), SAND_L);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 52, 56, lighten(SAND, 0.06), { ink: false });
  // the tall domed corner turret (front-right)
  const cu = u1 - 0.16, cv = v1 - 0.16;
  iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 78, SAND);
  iso.box(cu - 0.18, cv - 0.18, cu + 0.18, cv + 0.18, 78, 82, lighten(SAND, 0.06), { ink: false });
  // ogee lead dome + lantern
  const [dx, dyB] = iso.P(cu, cv, 82);
  const rPx = 0.18 * (CELL_W / 2);
  const ogee: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20; const a = t * Math.PI;
    const wob = Math.sin(a) * (1 + 0.3 * Math.sin(a * 1.5));
    ogee.push([dx + Math.cos(Math.PI - a) * rPx * wob, dyB - t * rPx * 2.2]);
  }
  const full = [...ogee];
  for (let i = ogee.length - 2; i >= 0; i--) { const p = ogee[i]!; full.push([2 * dx - p[0], p[1]]); }
  iso.r.poly(full, shaded(LEAD, 0.06), lit(LEAD, 0.08));
  iso.r.polyline(full, INK_W * 0.6, INK, true);
  const ty = dyB - rPx * 2.2;
  iso.r.line([dx, ty], [dx, ty - 8 * RES], 1.2 * RES, GILT);
  return iso.build();
}

// =====================================================================
// ARENA / SPORTS SHED — a big curved-roof entertainment shed (Utilita Arena) or
// a modern glazed sports box (Sport Central). Serves the arenas. 2×2.
// =====================================================================
function arenaShedTile(seed: number, modern: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  if (modern) {
    // a glazed rectilinear sports box with a coloured fin
    iso.box(u0, v0, u1, v1, 0, 44, alpha(COLORS.glassSky, 0.92));
    for (let z = 10; z < 42; z += 10) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.6 * RES, alpha(COLORS.white, 0.5));
    iso.box(u0 + 0.1, v0 + 0.1, u0 + 0.4, v1 - 0.1, 44, 56, hex('#3f7fae')); // a tall coloured stair fin
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 44, 48, lighten(STEEL, 0.06), { ink: false });
  } else {
    // a clad shed with a shallow curved (barrel) roof
    iso.box(u0, v0, u1, v1, 0, 34, hex('#8d97a1'));
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 24, 8, alpha(COLORS.glassDark, 0.8), undefined);
    // the curved roof as stacked arcs across u
    const cx = (u0 + u1) / 2;
    for (let s = -6; s <= 6; s++) {
      const f = s / 6;
      const u = cx + f * (u1 - u0) * 0.5;
      const z = 34 + 18 * Math.sqrt(Math.max(0, 1 - f * f));
      iso.r.line(iso.P(u, v0 + 0.04, z), iso.P(u, v1 - 0.04, z), 1.6 * RES, f < 0 ? lit(STEEL, 0.06) : shaded(STEEL, 0.06));
    }
    iso.r.polyline([iso.P(u0, v1, 34), iso.P(cx, v1, 52), iso.P(u1, v1, 34)], INK_W * 0.7, INK);
  }
  return iso.build();
}

// =====================================================================
// SCIENCE-VILLAGE — the Centre for Life read: a cluster of modern stone/zinc
// blocks with sweeping curved metallic roofs around a courtyard, a glazed
// concourse. 2×2.
// =====================================================================
function scienceVillageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  const ZN = hex('#9aa3ac');
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a low sandstone block range
  iso.box(u0, v0 + 0.6, u1, v1, 0, 30, SAND);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 24, 9, alpha(COLORS.glassLit, 0.7), SAND_L);
  // the glazed curved concourse hump
  const cx = (u0 + u1) / 2;
  for (let s = -6; s <= 6; s++) {
    const f = s / 6;
    const u = cx + f * (u1 - u0) * 0.46;
    const z = 30 + 26 * Math.sqrt(Math.max(0, 1 - f * f));
    iso.r.line(iso.P(u, v0 + 0.62, z), iso.P(u, v1 - 0.04, z), 1.5 * RES, alpha(COLORS.glassLit, 0.7));
  }
  // a couple of zinc roof pods behind
  iso.box(u0 + 0.2, v0 + 0.16, u0 + 0.6, v0 + 0.5, 0, 36, ZN);
  iso.hip(u0 + 0.18, v0 + 0.14, u0 + 0.62, v0 + 0.52, 36, 8, shaded(ZN, 0.1));
  iso.box(u1 - 0.55, v0 + 0.16, u1 - 0.15, v0 + 0.5, 0, 42, ZN);
  iso.hip(u1 - 0.57, v0 + 0.14, u1 - 0.13, v0 + 0.52, 42, 9, lit(ZN, 0.06));
  return iso.build();
}

// =====================================================================
// AIRPORT TERMINAL — Newcastle International: a long low glazed terminal with a
// sweeping curved canopy roof + the slim ATC control tower. A monster. 3×3.
// =====================================================================
function airportTerminalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // apron
  iso.box(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, -2, 1, shaded(COLORS.concrete, 0.06), { ink: false });
  // the long glazed terminal block
  iso.box(u0, v1 - 0.8, u1, v1, 0, 34, alpha(COLORS.glassSky, 0.92));
  for (let z = 8; z < 32; z += 8) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.6 * RES, alpha(COLORS.white, 0.5));
  // the big curved overhanging canopy roof
  const cv = v1 - 0.4;
  for (let i = 0; i <= 14; i++) {
    const u = u0 + ((u1 - u0) * i) / 14;
    const [bx, by] = iso.P(u, cv, 34);
    iso.r.line([bx, by], [bx, by - 16 * RES], 0.8 * RES, alpha(STEEL, 0.85));
  }
  iso.r.polyline([iso.P(u0, cv, 50), iso.P(u1, cv, 50)], 1.6 * RES, lit(STEEL, 0.08));
  iso.r.poly([iso.P(u0, v1 - 0.82, 34), iso.P(u1, v1 - 0.82, 34), iso.P(u1, v1, 30), iso.P(u0, v1, 30)], alpha(STEEL, 0.5));
  // the slim ATC control tower with glazed cab
  const tu = u1 - 0.4, tv = v0 + 0.4;
  iso.box(tu - 0.08, tv - 0.08, tu + 0.08, tv + 0.08, 0, 76, COLORS.white);
  iso.box(tu - 0.13, tv - 0.13, tu + 0.13, tv + 0.13, 76, 90, alpha(COLORS.glassLit, 0.85));
  iso.hip(tu - 0.15, tv - 0.15, tu + 0.15, tv + 0.15, 90, 8, STEEL_D);
  iso.r.line(iso.P(tu, tv, 98), iso.P(tu, tv, 110), 1 * RES, COLORS.steelDark);
  return iso.build();
}

// =====================================================================
// PARISH CHURCH — a modest medieval stone church: nave + a single west tower
// (battlemented or a small broach spire). Serves the region's churches:
// Blackfriars, St Hilda's, Sacred Heart, St Andrew's, Jesmond Parish, St
// George's, Saint Peter's (Monkwearmouth — the Anglo-Saxon one), St Mary &
// St Cuthbert. 2×2.
// =====================================================================
function parishChurchTile(seed: number, spired: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.52, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // nave + chancel under a slate roof
  iso.box(u0, v0 + 0.16, u1, v1, 0, 40, NORMAN);
  iso.gable(u0, v0 + 0.16, u1, v1, 40, 16, 'u', SLATE, NORMAN);
  for (let i = 0; i < 4; i++) lancet(iso, v1, u0 + 0.16 + i * 0.2, 0.08, 10, 26, alpha(COLORS.glassDark, 0.85));
  // the west tower, front-left
  const tu = u0 + 0.22, tv = v1 - 0.22, hw = 0.16;
  const towZ = 78;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, towZ, NORMAN);
  // belfry louvre + small clock
  iso.r.poly([iso.P(tu - 0.07, tv + hw, 48), iso.P(tu + 0.07, tv + hw, 48), iso.P(tu + 0.07, tv + hw, 64), iso.P(tu - 0.07, tv + hw, 64)], alpha(COLORS.glassDark, 0.85));
  if (spired) {
    const base = iso.P(tu, tv, towZ);
    const tip = iso.P(tu, tv, towZ + 70);
    iso.r.poly([[base[0] - 6 * RES, base[1]], tip, [base[0], base[1] - 2 * RES]], shaded(SLATE, 0.1));
    iso.r.poly([[base[0], base[1] - 2 * RES], tip, [base[0] + 6 * RES, base[1]]], lit(SLATE, 0.08));
    iso.r.polyline([[base[0] - 6 * RES, base[1]], tip, [base[0] + 6 * RES, base[1]]], INK_W * 0.7, INK);
  } else {
    battlementSquareStone(iso, tu, hw, tv, towZ, NORMAN);
    for (const [pu, pv] of [[tu - hw, tv - hw], [tu + hw, tv - hw], [tu - hw, tv + hw], [tu + hw, tv + hw]] as const) {
      pinnacle(iso, pu, pv, towZ + 5, 16, NORMAN);
    }
  }
  return iso.build();
}

// =====================================================================
// ENGLISH COUNTRY HOUSE — a Georgian/Jacobean stone hall: a broad symmetrical
// block, hipped roof, chimney-stacks, a pedimented or porticoed centre, sash
// windows. Serves Gibside, Beamish, Matfen, Blagdon, Kirkley, Slaley, Seaham
// Hall, Close House, Throckley, Jesmond Dene House, Biddick, Washington Old
// Hall, Hamsterley, Beamish Hall. 2×2.
// =====================================================================
function countryHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.46, v1 = 1.54;
  const STONE = hex('#cbbf9f');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, STONE);
  // two storeys of sash windows on the long front
  for (const zr of [10, 26] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zr, zr + 9, 7, alpha(COLORS.glassDark, 0.85), SAND_L);
  }
  // hipped slate roof
  iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 16, SLATE);
  // chimney stacks
  for (const cu of [u0 + 0.2, u1 - 0.2] as const) {
    iso.box(cu - 0.06, (v0 + v1) / 2 - 0.06, cu + 0.06, (v0 + v1) / 2 + 0.06, 48, 60, hex('#8a6f5a'));
  }
  // a small pedimented stone porch at the centre
  iso.box((u0 + u1) / 2 - 0.14, v1 - 0.12, (u0 + u1) / 2 + 0.14, v1, 0, 24, lighten(STONE, 0.05));
  pediment(iso, v1, (u0 + u1) / 2 - 0.14, (u0 + u1) / 2 + 0.14, 24, 6, STONE);
  return iso.build();
}

// =====================================================================
// SHOPPING CENTRE / CIVIC MALL — a big modern retail block with a glazed barrel
// atrium + signage band. Serves The Bridges, The Galleries, CitySpace, Monument
// Mall, The Gate. 2×2.
// =====================================================================
function mallBlockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 36, hex('#b9b1a4'));
  // signage band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 24, 30, hex('#3f6f9e'), { ink: false });
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 6, 22, 8, alpha(COLORS.glassLit, 0.7), COLORS.white);
  // the glazed barrel atrium on the roof
  const cx = (u0 + u1) / 2;
  iso.box(u0 + 0.3, v0 + 0.2, u1 - 0.3, v1 - 0.2, 36, 40, alpha(COLORS.glassSky, 0.9), { ink: false });
  for (let s = -4; s <= 4; s++) {
    const f = s / 4;
    const u = cx + f * (u1 - u0) * 0.34;
    const z = 40 + 12 * Math.sqrt(Math.max(0, 1 - f * f));
    iso.r.line(iso.P(u, v0 + 0.22, z), iso.P(u, v1 - 0.22, z), 1 * RES, alpha(COLORS.glassLit, 0.7));
  }
  return iso.build();
}

// =====================================================================
// THE REGISTRY — order matters (first match wins). Specific named icons first,
// then the parameterised families, so e.g. "St Mary's Cathedral" hits the
// spired-cathedral entry before any generic church regex.
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // --- the great Tyne bridges (authored for when placement adds them) ------
  {
    city: 'northeast', key: 'tyne-bridge', match: /\bTyne Bridge\b/i,
    foot: [2, 3], seed: 1, draw: tyneBridgeTile,
    light: { kind: 'archGlow', topZ: 196, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'gateshead-millennium-bridge', match: /Millennium Bridge|Blinking Eye/i,
    foot: [2, 3], seed: 2, draw: millenniumBridgeTile,
    light: { kind: 'archGlow', topZ: 132, halfW: 1.2 },
  },
  // --- Quayside icons -------------------------------------------------------
  {
    city: 'northeast', key: 'the-glasshouse', match: /Glasshouse|Sage(?: Gateshead)?/i,
    foot: [2, 2], seed: 3, draw: glasshouseTile,
    light: { kind: 'rimCycle', topZ: 80, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'baltic', match: /BALTIC|Baltic Centre|Baltic Flour/i,
    foot: [2, 2], seed: 4, draw: balticTile,
    light: { kind: 'towerCrown', topZ: 130, halfW: 0.9 },
  },
  {
    city: 'northeast', key: 'biscuit-factory', match: /Biscuit Factory/i,
    foot: [2, 2], seed: 5, draw: warehouseGalleryTile,
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.2 },
  },
  // --- the cathedrals -------------------------------------------------------
  {
    city: 'northeast', key: 'newcastle-cathedral', match: /St\.? ?Nicholas(?:'s)?(?: Cathedral)?|Newcastle Cathedral/i,
    foot: [2, 2], seed: 6, draw: newcastleCathedralTile,
    light: { kind: 'facadeFlood', topZ: 190, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-marys-cathedral', match: /(?:Cathedral Church of St\.? Mary|St\.? Mary'?s (?:RC )?(?:Cathedral|Church))/i,
    foot: [2, 2], seed: 7, draw: spiredCathedralTile,
    light: { kind: 'facadeFlood', topZ: 210, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'durham-cathedral', match: /Durham Cathedral/i,
    foot: [3, 3], seed: 8, draw: durhamCathedralTile,
    light: { kind: 'facadeFlood', topZ: 156, halfW: 1.6 },
  },
  // --- monuments & sculpture -----------------------------------------------
  {
    city: 'northeast', key: 'angel-of-the-north', match: /Angel of the North/i,
    foot: [2, 2], seed: 9, draw: angelOfTheNorthTile,
    light: { kind: 'genericGlow', topZ: 134, halfW: 1.4 },
  },
  {
    city: 'northeast', key: 'penshaw-monument', match: /Penshaw Monument/i,
    foot: [2, 2], seed: 10, draw: penshawMonumentTile,
    light: { kind: 'facadeFlood', topZ: 74, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'greys-monument', match: /Grey'?s Monument/i,
    foot: [1, 1], seed: 11, draw: columnMonumentTile,
    light: { kind: 'aerialBeacon', topZ: 174, halfW: 0.22 },
  },
  {
    city: 'northeast', key: 'collingwood-monument', match: /Collingwood (?:Monument|Memorial)/i,
    foot: [1, 1], seed: 12, draw: columnMonumentTile,
    light: { kind: 'aerialBeacon', topZ: 174, halfW: 0.22 },
  },
  {
    city: 'northeast', key: 'war-memorial', match: /War Memorial|The Response/i,
    foot: [1, 1], seed: 13, draw: warMemorialTile,
    light: { kind: 'genericGlow', topZ: 100, halfW: 0.3 },
  },
  {
    city: 'northeast', key: 'northumberlandia', match: /Northumberlandia/i,
    foot: [3, 3], seed: 14, draw: northumberlandiaTile,
    light: { kind: 'genericGlow', topZ: 40, halfW: 1.6 },
  },
  // --- halls & castles ------------------------------------------------------
  {
    city: 'northeast', key: 'seaton-delaval-hall', match: /Seaton Delaval Hall/i,
    foot: [2, 2], seed: 15, draw: baroqueHallTile,
    light: { kind: 'facadeFlood', topZ: 82, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'lambton-castle', match: /Lambton Castle/i,
    foot: [2, 2], seed: 16, draw: castellatedCastleTile,
    light: { kind: 'facadeFlood', topZ: 105, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'ravensworth-castle', match: /Ravensworth Castle/i,
    foot: [2, 2], seed: 17, draw: castellatedCastleTile,
    light: { kind: 'facadeFlood', topZ: 105, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'lumley-castle', match: /Lumley Castle/i,
    foot: [2, 2], seed: 18, draw: castellatedCastleTile,
    light: { kind: 'facadeFlood', topZ: 105, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'prudhoe-castle', match: /Prudhoe Castle/i,
    foot: [2, 2], seed: 19, draw: (s) => normanKeepTile(s, false),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'hylton-castle', match: /Hylton Castle/i,
    foot: [2, 2], seed: 20, draw: (s) => normanKeepTile(s, false),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'tynemouth-priory-castle', match: /Tynemouth Priory(?: and Castle)?/i,
    foot: [2, 2], seed: 21, draw: (s) => normanKeepTile(s, true),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'bywell-castle', match: /Bywell Castle/i,
    foot: [2, 2], seed: 22, draw: (s) => normanKeepTile(s, false),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'aydon-castle', match: /Aydon Castle/i,
    foot: [2, 2], seed: 23, draw: (s) => normanKeepTile(s, false),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'halton-castle', match: /Halton Castle/i,
    foot: [2, 2], seed: 24, draw: (s) => normanKeepTile(s, false),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'beaufront-castle', match: /Beaufront Castle/i,
    foot: [2, 2], seed: 25, draw: castellatedCastleTile,
    light: { kind: 'facadeFlood', topZ: 105, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'dilston-castle', match: /Dilston Castle/i,
    foot: [2, 2], seed: 26, draw: (s) => normanKeepTile(s, true),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },
  // --- coastal --------------------------------------------------------------
  {
    city: 'northeast', key: 'souter-lighthouse', match: /Souter Lighthouse/i,
    foot: [1, 1], seed: 27, draw: (s) => lighthouseTile(s, true),
    light: { kind: 'aerialBeacon', topZ: 168, halfW: 0.2 },
  },
  {
    city: 'northeast', key: 'st-marys-lighthouse', match: /St\.? ?Mary'?s Lighthouse/i,
    foot: [1, 1], seed: 28, draw: (s) => lighthouseTile(s, false),
    light: { kind: 'aerialBeacon', topZ: 168, halfW: 0.2 },
  },
  {
    city: 'northeast', key: 'tynemouth-lighthouse', match: /Tynemouth Lighthouse|St\.? ?Mary'?s Island/i,
    foot: [1, 1], seed: 29, draw: (s) => lighthouseTile(s, false),
    light: { kind: 'aerialBeacon', topZ: 168, halfW: 0.2 },
  },
  {
    city: 'northeast', key: 'spanish-city', match: /Spanish City/i,
    foot: [2, 2], seed: 30, draw: spanishCityTile,
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'marsden-rock', match: /Marsden Rock/i,
    foot: [2, 2], seed: 31, draw: marsdenRockTile,
    light: { kind: 'genericGlow', topZ: 73, halfW: 0.8 },
  },
  // --- museums, galleries, civic -------------------------------------------
  {
    city: 'northeast', key: 'national-glass-centre', match: /(?:National )?Glass Centre/i,
    foot: [2, 2], seed: 32, draw: glassCentreTile,
    light: { kind: 'rimCycle', topZ: 40, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'great-north-museum', match: /Great North Museum|Hancock/i,
    foot: [2, 2], seed: 33, draw: (s) => porticoMuseumTile(s, false),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'laing-art-gallery', match: /Laing Art Gallery/i,
    foot: [2, 2], seed: 34, draw: (s) => porticoMuseumTile(s, false),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'shipley-art-gallery', match: /Shipley Art Gallery/i,
    foot: [2, 2], seed: 35, draw: (s) => porticoMuseumTile(s, false),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'hatton-gallery', match: /Hatton Gallery/i,
    foot: [2, 2], seed: 36, draw: (s) => porticoMuseumTile(s, false),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'sunderland-museum-winter-gardens', match: /Sunderland Museum(?: and Winter Gardens)?|Winter Gardens/i,
    foot: [2, 2], seed: 37, draw: (s) => porticoMuseumTile(s, true),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'discovery-museum', match: /Discovery Museum|Blandford House/i,
    foot: [2, 2], seed: 38, draw: edwardianBaroqueTile,
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'sunderland-empire', match: /Sunderland Empire|Empire Theatre/i,
    foot: [2, 2], seed: 39, draw: edwardianBaroqueTile,
    light: { kind: 'towerCrown', topZ: 110, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'centre-for-life', match: /Centre for Life/i,
    foot: [2, 2], seed: 40, draw: scienceVillageTile,
    light: { kind: 'rimCycle', topZ: 56, halfW: 1.2 },
  },
  // --- arenas ---------------------------------------------------------------
  {
    city: 'northeast', key: 'utilita-arena', match: /Utilita Arena|Metro ?Radio Arena|Newcastle Arena/i,
    foot: [2, 2], seed: 41, draw: (s) => arenaShedTile(s, false),
    light: { kind: 'stadiumFlood', topZ: 52, halfW: 1.4 },
  },
  {
    city: 'northeast', key: 'sport-central', match: /Sport Central/i,
    foot: [2, 2], seed: 42, draw: (s) => arenaShedTile(s, true),
    light: { kind: 'stadiumFlood', topZ: 56, halfW: 1.3 },
  },
  // --- the airport (monster) -----------------------------------------------
  {
    city: 'northeast', key: 'newcastle-airport', match: /Newcastle International Airport|Newcastle Airport/i,
    foot: [3, 3], seed: 43, draw: airportTerminalTile,
    light: { kind: 'aerialBeacon', topZ: 110, halfW: 1.6 },
  },
  // --- the churches (parameterised; placed after the cathedrals) -----------
  {
    city: 'northeast', key: 'blackfriars-church', match: /Blackfriars(?: Church)?/i,
    foot: [2, 2], seed: 44, draw: (s) => parishChurchTile(s, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-hildas-church', match: /St\.? ?Hilda'?s(?: Church)?/i,
    foot: [2, 2], seed: 45, draw: (s) => parishChurchTile(s, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'sacred-heart-church', match: /Sacred Heart(?: Church)?/i,
    foot: [2, 2], seed: 46, draw: (s) => parishChurchTile(s, true),
    light: { kind: 'facadeFlood', topZ: 148, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-andrews-church', match: /St\.? ?Andrew'?s(?: Church)?/i,
    foot: [2, 2], seed: 47, draw: (s) => parishChurchTile(s, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'jesmond-parish-church', match: /Jesmond Parish Church/i,
    foot: [2, 2], seed: 48, draw: (s) => parishChurchTile(s, true),
    light: { kind: 'facadeFlood', topZ: 148, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-georges-church', match: /St\.? ?George'?s(?: Church)?/i,
    foot: [2, 2], seed: 49, draw: (s) => parishChurchTile(s, true),
    light: { kind: 'facadeFlood', topZ: 148, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-peters-monkwearmouth', match: /Saint Peter'?s|St\.? ?Peter\b|Monkwearmouth/i,
    foot: [2, 2], seed: 50, draw: (s) => parishChurchTile(s, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'st-mary-st-cuthbert', match: /St Mary and St Cuthbert|St\.? ?Cuthbert'?s/i,
    foot: [2, 2], seed: 51, draw: (s) => parishChurchTile(s, true),
    light: { kind: 'facadeFlood', topZ: 148, halfW: 1.0 },
  },
  {
    city: 'northeast', key: 'church-of-st-dominic', match: /St\.? ?Dominic/i,
    foot: [2, 2], seed: 52, draw: (s) => parishChurchTile(s, false),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  // --- the country houses (parameterised; placed last so specific halls win)
  {
    city: 'northeast', key: 'gibside', match: /Gibside(?! Banqueting)/i,
    foot: [2, 2], seed: 53, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'beamish', match: /Beamish(?: Hall| Museum)?/i,
    foot: [2, 2], seed: 54, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'matfen-hall', match: /Matfen Hall/i,
    foot: [2, 2], seed: 55, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'blagdon-hall', match: /Blagdon Hall/i,
    foot: [2, 2], seed: 56, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'kirkley-hall', match: /Kirkley Hall/i,
    foot: [2, 2], seed: 57, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'slaley-hall', match: /Slaley Hall/i,
    foot: [2, 2], seed: 58, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'seaham-hall', match: /Seaham Hall/i,
    foot: [2, 2], seed: 59, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'close-house', match: /Close House/i,
    foot: [2, 2], seed: 60, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'jesmond-dene-house', match: /Jesmond Dene House/i,
    foot: [2, 2], seed: 61, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'washington-old-hall', match: /Washington Old Hall/i,
    foot: [2, 2], seed: 62, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'biddick-hall', match: /Biddick Hall/i,
    foot: [2, 2], seed: 63, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'hamsterley-hall', match: /Hamsterley Hall/i,
    foot: [2, 2], seed: 64, draw: countryHouseTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  // --- the shopping centres -------------------------------------------------
  {
    city: 'northeast', key: 'the-bridges', match: /The Bridges/i,
    foot: [2, 2], seed: 65, draw: mallBlockTile,
    light: { kind: 'towerCrown', topZ: 52, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'the-galleries', match: /The Galleries|Galleries Shopping/i,
    foot: [2, 2], seed: 66, draw: mallBlockTile,
    light: { kind: 'towerCrown', topZ: 52, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'cityspace', match: /CitySpace|Cityspace/i,
    foot: [2, 2], seed: 67, draw: mallBlockTile,
    light: { kind: 'towerCrown', topZ: 52, halfW: 1.2 },
  },
];
