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
// THE HIGH LEVEL BRIDGE — Robert Stephenson's 1849 double-decker: a row of
// tall ASHLAR PIERS carrying flat iron tied-arch (bowstring) spans, the RAIL
// deck riding ON TOP of the arches and the ROAD deck slung BELOW them between
// the piers. Reads as a stiff stone-and-iron grid, NOT a single soaring arch
// (that's the Tyne Bridge). SW-anchored 2×3 spanning the gorge along v.
// =====================================================================
function highLevelBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const VA = 0.5, VB = 2.5;
  const IRON = hex('#6f7d72'); // dull oxidised structural iron
  const railZ = 78, roadZ = 40;
  iso.shadow(0.4, 0.5, 1.6, 2.6, 0.3, 0.22);
  iso.box(0.1, 0.2, 1.9, 2.8, -8, -2, shaded(SEA, 0.1), { ink: false });
  // the tall ashlar piers (five bays) straight up from the riverbed
  for (let i = 0; i <= 4; i++) {
    const v = VA + (VB - VA) * (i / 4);
    iso.box(0.6, v - 0.1, 1.4, v + 0.1, -2, railZ - 8, SAND_L);
    // a tall pointed pier-opening
    iso.r.poly([iso.P(1.4, v - 0.07, 6), iso.P(1.4, v + 0.07, 6), iso.P(1.4, v + 0.07, roadZ - 6), iso.P(1.4, v - 0.07, roadZ - 6)], alpha(COLORS.glassDark, 0.7));
  }
  // the ROAD deck slung between piers (lower ribbon)
  for (const du of [0.62, 1.38] as const) {
    iso.r.line(iso.P(du, VA - 0.2, roadZ), iso.P(du, VB + 0.2, roadZ), 1.4 * RES, du < 1 ? shaded(IRON, 0.08) : lit(IRON, 0.06));
  }
  // the flat bowstring (tied-arch) spans between piers, carrying the rail deck
  for (let i = 0; i < 4; i++) {
    const v0 = VA + (VB - VA) * (i / 4) + 0.06;
    const v1 = VA + (VB - VA) * ((i + 1) / 4) - 0.06;
    for (const du of [0.62, 1.38] as const) {
      const arc: Pt[] = [];
      for (let j = 0; j <= 10; j++) { const t = j / 10; const v = v0 + (v1 - v0) * t; arc.push(iso.P(du, v, railZ - 8 + 16 * Math.sin(t * Math.PI))); }
      iso.r.polyline(arc, 1.3 * RES, du < 1 ? IRON : lit(IRON, 0.06));
      // tie chord (the straight bottom of the bowstring)
      iso.r.line(iso.P(du, v0, railZ - 8), iso.P(du, v1, railZ - 8), 1 * RES, shaded(IRON, 0.1));
    }
  }
  // the RAIL deck riding on top (upper ribbon) + a parapet
  for (const du of [0.6, 1.4] as const) {
    iso.r.line(iso.P(du, VA - 0.2, railZ), iso.P(du, VB + 0.2, railZ), 1.6 * RES, du < 1 ? shaded(IRON, 0.06) : lit(IRON, 0.08));
    iso.r.line(iso.P(du, VA - 0.2, railZ + 6), iso.P(du, VB + 0.2, railZ + 6), 0.7 * RES, alpha(lighten(IRON, 0.1), 0.8));
  }
  iso.r.line(iso.P(0.6, VA - 0.2, railZ), iso.P(0.6, VA - 0.2, railZ + 6), INK_W * 0.6, INK);
  return iso.build();
}

// =====================================================================
// THE SWING BRIDGE — Armstrong's 1876 hydraulic LOW swing bridge: a long flat
// iron girder deck sitting just above the water on a big central round PIVOT
// DRUM crowned by a little control cabin/cupola. The low horizontal read +
// central drum is the signature. SW-anchored 2×3 spanning along v.
// =====================================================================
function swingBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const VA = 0.5, VB = 2.5, du = 1.0;
  const IRON = hex('#7a5b46'); // the bridge's warm red-brown ironwork
  const deckZ = 16;
  iso.shadow(0.4, 0.5, 1.6, 2.6, 0.3, 0.22);
  iso.box(0.1, 0.2, 1.9, 2.8, -8, -2, shaded(SEA, 0.1), { ink: false });
  // the long low girder deck (a flat slab spanning bank to bank)
  iso.box(du - 0.18, VA, du + 0.18, VB, deckZ - 7, deckZ, IRON);
  // lattice girder side webbing
  for (let i = 0; i <= 16; i++) { const v = VA + (VB - VA) * (i / 16); iso.r.line(iso.P(du + 0.18, v, deckZ - 7), iso.P(du + 0.18, v + (VB - VA) / 16, deckZ), 0.5 * RES, alpha(shaded(IRON, 0.1), 0.7)); }
  // the big round PIVOT DRUM at midspan
  const cv = (VA + VB) / 2;
  iso.box(du - 0.26, cv - 0.26, du + 0.26, cv + 0.26, deckZ, deckZ + 14, lit(IRON, 0.04));
  const [dx, dyB] = iso.P(du, cv, deckZ + 14);
  // the control cabin/cupola on the drum
  iso.box(du - 0.12, cv - 0.12, du + 0.12, cv + 0.12, deckZ + 14, deckZ + 26, hex('#b7ae98'));
  iso.r.poly(circlePts(dx, dyB - 26 * RES, 3 * RES), alpha(COLORS.glassLit, 0.85));
  cap(iso, du, 0.13, cv, deckZ + 26, 8, hex('#6a7a5c'));
  // a small glint off the wet deck
  iso.glint(iso.P(du, VA + 0.5, deckZ), 1.6 * RES);
  return iso.build();
}

// =====================================================================
// THE CASTLE KEEP, NEWCASTLE — the great Norman square keep ("the New Castle"
// that named the city): a tall, near-cubic ashlar great-tower with four
// clasping corner turrets (one carrying the taller forebuilding stair), a
// machicolated battlement, slim Norman windows. Squarer + grander than the
// generic ruined keep. 1×1, towering.
// =====================================================================
function castleKeepTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const u = 0.5, v = 0.52, hw = 0.3;
  const STONE = hex('#c2b594'); // weathered Newcastle keep ashlar
  const keepZ = 132;
  iso.shadow(u - hw - 0.06, v - hw, u + hw + 0.06, v + hw + 0.12, 0.3, 0.24);
  // the great square keep body
  iso.box(u - hw, v - hw, u + hw, v + hw, 0, keepZ, STONE);
  // three storeys of slim round-headed Norman windows on the SE face
  for (const z of [34, 64, 94] as const) {
    for (const off of [-0.12, 0.06] as const) {
      const poly: Pt[] = [iso.P(u + off, v + hw, z), iso.P(u + off + 0.05, v + hw, z)];
      for (let j = 0; j <= 5; j++) { const t = j / 5; poly.push(iso.P(u + off + 0.05 * t, v + hw, z + 12 + Math.sin(t * Math.PI) * 2.5)); }
      iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
    }
  }
  // four clasping corner turrets — the SE one taller (the forebuilding)
  const corners: ReadonlyArray<readonly [number, number, number]> = [
    [u - hw, v - hw, 8], [u + hw, v - hw, 8], [u - hw, v + hw, 8], [u + hw, v + hw, 26],
  ];
  for (const [cu, cv, extra] of corners) {
    iso.box(cu - 0.09, cv - 0.09, cu + 0.09, cv + 0.09, 0, keepZ + extra, lighten(STONE, 0.02));
    battlementSquareStone(iso, cu, 0.09, cv, keepZ + extra, STONE);
  }
  // the machicolated main battlement crown
  battlementSquareStone(iso, u, hw, v, keepZ, STONE);
  return iso.build();
}

// =====================================================================
// ST JAMES' PARK — Newcastle United's ground: a great closed bowl with WILDLY
// ASYMMETRIC stands — the colossal cantilevered Milburn/Leazes double-decker on
// the far (N/W) side TOWERING over the lower Gallowgate side, the white roof
// trusses springing out over the pitch. The lopsided silhouette IS the read.
// 2×2. Floodlit.
// =====================================================================
function stJamesParkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  const STAND = hex('#9aa1a8'); // pale grey concrete-and-steel stand
  const ROOF = hex('#e4e6e7'); // bright white cantilever roof
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the green pitch sunk in the middle
  iso.box(u0 + 0.18, v0 + 0.18, u1 - 0.18, v1 - 0.18, 0, 6, shaded(GREEN, 0.04), { ink: false });
  // the lower Gallowgate stand (front-right / near, low)
  iso.box(u1 - 0.22, v0 + 0.1, u1, v1 - 0.1, 6, 34, STAND);
  iso.box(u0 + 0.1, v1 - 0.22, u1 - 0.1, v1, 6, 30, lit(STAND, 0.04)); // east stand (near-left)
  // the COLOSSAL Milburn/Leazes double-decker on the far two sides
  iso.box(u0, v0 + 0.1, u0 + 0.24, v1 - 0.1, 6, 96, shaded(STAND, 0.04)); // west (tall)
  iso.box(u0 + 0.1, v0, u1 - 0.1, v0 + 0.22, 6, 96, STAND); // north (tall)
  // seating-rake hints on the tall stands
  for (let i = 1; i <= 5; i++) { const z = 6 + 90 * (i / 6); iso.r.line(iso.P(u0 + 0.24, v0 + 0.12, z), iso.P(u0 + 0.24, v1 - 0.12, z), 0.5 * RES, alpha(shaded(STAND, 0.1), 0.6)); }
  // the great white cantilever roof springing out over the pitch from the tall side
  const roofZ = 100;
  iso.r.poly([iso.P(u0 + 0.24, v0 + 0.1, roofZ), iso.P(u0 + 0.24, v1 - 0.1, roofZ), iso.P(u0 + 0.7, v1 - 0.2, roofZ - 10), iso.P(u0 + 0.7, v0 + 0.2, roofZ - 10)], ROOF);
  iso.r.poly([iso.P(u0 + 0.1, v0 + 0.24, roofZ), iso.P(u1 - 0.1, v0 + 0.24, roofZ), iso.P(u1 - 0.2, v0 + 0.7, roofZ - 10), iso.P(u0 + 0.2, v0 + 0.7, roofZ - 10)], lit(ROOF, 0.04));
  iso.r.polyline([iso.P(u0 + 0.24, v0 + 0.1, roofZ), iso.P(u0 + 0.24, v1 - 0.1, roofZ)], INK_W * 0.7, INK);
  // the white truss spars
  for (let i = 0; i <= 5; i++) { const v = v0 + 0.12 + (v1 - v0 - 0.24) * (i / 5); iso.r.line(iso.P(u0 + 0.24, v, roofZ), iso.P(u0 + 0.7, v, roofZ - 10), 0.7 * RES, alpha(INK, 0.5)); }
  return iso.build();
}

// =====================================================================
// THE STADIUM OF LIGHT — Sunderland AFC: a clean modern enclosed BOWL with a
// continuous shallow-curved white roof ringing the pitch, four corner
// FLOODLIGHT pylons spiking up, and (alongside) the slim "Beacon of Light"
// mast. More symmetric than St James'. 2×2. Floodlit.
// =====================================================================
function stadiumOfLightTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  const BOWL = hex('#a4abb1');
  const ROOF = hex('#e7e9ea');
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // pitch
  iso.box(u0 + 0.22, v0 + 0.22, u1 - 0.22, v1 - 0.22, 0, 5, shaded(GREEN, 0.04), { ink: false });
  // the continuous bowl ring (a hollow box: four stands of even height)
  iso.box(u0, v0, u1, v0 + 0.2, 5, 52, BOWL); // far (N)
  iso.box(u0, v1 - 0.2, u1, v1, 5, 44, lit(BOWL, 0.04)); // near (S)
  iso.box(u0, v0, u0 + 0.2, v1, 5, 50, shaded(BOWL, 0.04)); // W
  iso.box(u1 - 0.2, v0, u1, v1, 5, 46, lit(BOWL, 0.06)); // E
  // the white curved roof ring overhanging the pitch
  for (const [a, b, z, col] of [
    [iso.P(u0, v0 + 0.2, 56), iso.P(u1, v0 + 0.2, 56), iso.P(u1 - 0.18, v0 + 0.42, 50), col0(ROOF)],
  ] as const) { void a; void b; void z; void col; }
  iso.r.poly([iso.P(u0 + 0.06, v0 + 0.2, 56), iso.P(u1 - 0.06, v0 + 0.2, 56), iso.P(u1 - 0.22, v0 + 0.42, 50), iso.P(u0 + 0.22, v0 + 0.42, 50)], ROOF);
  iso.r.poly([iso.P(u0 + 0.2, v0 + 0.06, 54), iso.P(u0 + 0.2, v1 - 0.06, 54), iso.P(u0 + 0.42, v1 - 0.22, 48), iso.P(u0 + 0.42, v0 + 0.22, 48)], shaded(ROOF, 0.05));
  iso.r.poly([iso.P(u1 - 0.2, v0 + 0.06, 50), iso.P(u1 - 0.2, v1 - 0.06, 50), iso.P(u1 - 0.42, v1 - 0.22, 46), iso.P(u1 - 0.42, v0 + 0.22, 46)], lit(ROOF, 0.04));
  // four corner floodlight pylons
  for (const [cu, cv] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) {
    iso.r.line(iso.P(cu, cv, 50), iso.P(cu, cv, 84), 1 * RES, STEEL_D);
    const [px, py] = iso.P(cu, cv, 84);
    iso.r.rect(px - 3 * RES, py - 4 * RES, px + 3 * RES, py, alpha(hex('#fff3c4'), 0.9)); // the lamp bank
  }
  return iso.build();
}

/** tiny passthrough so the eslint no-unused doesn't flag the inline tuple loop. */
function col0(c: RGBA): RGBA { return c; }

// =====================================================================
// GRAINGER MARKET — Newcastle's grand 1835 covered market hall: a long low
// honey-sandstone block, a run of big round-headed arched entrances along the
// street, and a broad shallow-pitched glazed iron roof over the halls. Wide
// not tall. 1×1 drawn broad.
// =====================================================================
function graingerMarketTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.16, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  iso.box(u0, v0, u1, v1, 0, 30, SAND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, shaded(SAND, 0.12), { ink: false });
  // a run of tall round-headed arched market entrances along the SE face
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.06 + i * 0.15;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 18)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.1 * t, v1, 18 + Math.sin(t * Math.PI) * 6)); }
    poly.push(iso.P(u + 0.1, v1, 18), iso.P(u + 0.1, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
  }
  // a cornice band + the broad shallow glazed iron roof
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 30, 34, lighten(SAND, 0.06), { ink: false });
  for (let i = 0; i < 4; i++) {
    const vA = v0 + 0.04 + i * ((v1 - v0 - 0.08) / 4);
    iso.r.poly([iso.P(u0, vA, 34), iso.P(u1, vA, 34), iso.P(u1, vA, 44), iso.P(u0, vA, 44)], alpha(COLORS.glassLit, 0.55));
    iso.r.line(iso.P(u0, vA, 44), iso.P(u1, vA, 44), 0.6 * RES, alpha(STEEL, 0.7));
  }
  return iso.build();
}

// =====================================================================
// ELDON SQUARE — the big 1970s indoor shopping centre over Old Eldon Square: a
// massive low-rise concrete megablock with deep modelled fascia bands, a long
// glazed mall-spine roof, and a stair/lift tower. Reads as a bulky modern slab.
// 3×3 (the city's biggest mall). Differentiated from the small mallBlock.
// =====================================================================
function eldonSquareTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.4, v1 = 2.6;
  const CONC = hex('#b3aa9c');
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, CONC);
  // deep horizontal fascia bands (the brutalist modelling)
  for (const [z0, z1] of [[14, 20], [28, 34]] as const) iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, z0, z1, shaded(CONC, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 6, 12, 11, alpha(COLORS.glassLit, 0.65), COLORS.white);
  // the long glazed mall-spine roof down the middle
  iso.box(u0 + 0.5, v0 + 0.4, u1 - 0.5, v1 - 0.4, 40, 50, alpha(COLORS.glassSky, 0.9));
  for (let i = 0; i <= 8; i++) { const u = u0 + 0.5 + (u1 - u0 - 1) * (i / 8); iso.r.line(iso.P(u, v0 + 0.42, 50), iso.P(u, v1 - 0.42, 50), 0.5 * RES, alpha(COLORS.white, 0.5)); }
  // a service stair/lift tower
  iso.box(u0 + 0.2, v0 + 0.2, u0 + 0.6, v0 + 0.6, 40, 58, shaded(CONC, 0.06));
  return iso.build();
}

// =====================================================================
// MODERN GLASS OFFICE — a clean rectilinear curtain-walled office slab with a
// crisp glass skin + a slim service core, sat on the Quayside. Serves HMRC,
// Ernst & Young, Partnership House, 1 Neville Street, the modern offices. 2×2.
// =====================================================================
function glassOfficeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  const H = 96;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, alpha(COLORS.glassSky, 0.94));
  // floor-line mullions
  for (let z = 10; z < H - 4; z += 9) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.white, 0.45));
  for (let i = 1; i < 5; i++) { const u = u0 + (u1 - u0) * (i / 5); iso.r.line(iso.P(u, v1, 4), iso.P(u, v1, H - 4), 0.4 * RES, alpha(COLORS.white, 0.35)); }
  // a contrasting solid service core to one side
  iso.box(u1 - 0.28, v0 + 0.1, u1, v0 + 0.5, 0, H + 8, hex('#7e8893'));
  // a flat parapet + roof plant
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 4, lighten(STEEL, 0.06), { ink: false });
  iso.box(u0 + 0.2, v0 + 0.2, u0 + 0.6, v0 + 0.55, H, H + 10, STEEL_D);
  return iso.build();
}

// =====================================================================
// GOTHIC-REVIVAL UNIVERSITY RANGE — Armstrong Building / the university core: a
// long honey-sandstone range with mullioned windows, a steep slate roof, and a
// central pinnacled CLOCK TOWER over an arched entrance. 2×2.
// =====================================================================
function universityRangeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0 + 0.1, u1, v1, 0, 46, SAND);
  iso.gable(u0, v0 + 0.1, u1, v1, 46, 14, 'u', SLATE, SAND);
  // two storeys of mullioned windows
  for (const zr of [12, 30] as const) iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zr, zr + 10, 7, alpha(COLORS.glassDark, 0.85), SAND_L);
  // the central clock tower with a pyramidal slate cap + corner pinnacles
  const tu = (u0 + u1) / 2, tv = v1 - 0.16, hw = 0.2;
  const towZ = 86;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, towZ, lighten(SAND, 0.02));
  // arched entrance at the base
  const poly: Pt[] = [iso.P(tu - 0.08, tv + hw, 4), iso.P(tu - 0.08, tv + hw, 20)];
  for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(tu - 0.08 + 0.16 * t, tv + hw, 20 + Math.sin(t * Math.PI) * 7)); }
  poly.push(iso.P(tu + 0.08, tv + hw, 20), iso.P(tu + 0.08, tv + hw, 4));
  iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
  // clock face
  const [clx, cly] = iso.P(tu, tv + hw, 58);
  iso.r.poly(circlePts(clx, cly, 3 * RES), SAND_L);
  iso.r.polyline(circlePts(clx, cly, 3 * RES), INK_W * 0.5, INK, true);
  iso.hip(tu - hw - 0.02, tv - hw - 0.02, tu + hw + 0.02, tv + hw + 0.02, towZ, 22, SLATE);
  for (const [pu, pv] of [[tu - hw, tv - hw], [tu + hw, tv - hw], [tu - hw, tv + hw], [tu + hw, tv + hw]] as const) pinnacle(iso, pu, pv, towZ, 18, SAND);
  return iso.build();
}

// =====================================================================
// VICTORIAN-CLASSICAL HOTEL/BLOCK — a grand stone palazzo: rusticated ground,
// rows of pedimented sash windows, a heavy bracketed cornice + balustraded
// parapet, corner end-pavilions. Serves the Royal Station Hotel, Fenwick, the
// big commercial palazzos (Milburn House, Exchange/Co-op/Princes Buildings). 2×2.
// =====================================================================
function classicalBlockTile(seed: number, corner: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const H = 60;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, SAND);
  // rusticated ground band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, shaded(SAND, 0.1), { ink: false });
  // three storeys of windows with sill bands
  for (const zr of [20, 34, 48] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zr, zr + 8, 8, alpha(COLORS.glassDark, 0.85), SAND_L);
    iso.r.line(iso.P(u0, v1, zr - 2), iso.P(u1, v1, zr - 2), 0.5 * RES, alpha(SAND_L, 0.7));
  }
  // heavy cornice + balustraded parapet
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 5, lighten(SAND, 0.08), { ink: false });
  // corner end-pavilions raised a touch
  for (const cu of [u0 + 0.18, u1 - 0.18] as const) iso.box(cu - 0.16, v1 - 0.32, cu + 0.16, v1, H, H + 8, lighten(SAND, 0.04));
  if (corner) {
    // a rounded corner turret with a small lead dome (Fenwick / station hotel)
    const cu = u1 - 0.12, cv = v1 - 0.12;
    iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, 0, H + 14, lighten(SAND, 0.03));
    domeWhite(iso, cu, cv, H + 14, 0.14 * (CELL_W / 2), 1.2, LEAD, shaded(LEAD, 0.08));
  }
  return iso.build();
}

// =====================================================================
// POSTMODERN QUAYSIDE CIVIC — Newcastle Law Courts read: a chunky 1980s
// brown-brick-and-stone block with a stepped pyramidal glazed roof / barrel
// lantern and a deep recessed entrance. 2×2.
// =====================================================================
function quaysideCivicTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.4, v1 = 1.6;
  const PMBRICK = hex('#b08a5e'); // pale postmodern sand-brick
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0 + 0.2, u1, v1, 0, 44, PMBRICK);
  // banded stone string-courses
  for (let z = 12; z < 42; z += 12) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.7 * RES, alpha(SAND_L, 0.7));
  // deep recessed glazed entrance
  iso.box(u0 + 0.3, v1 - 0.06, u1 - 0.3, v1, 4, 30, alpha(COLORS.glassDark, 0.8), { ink: false });
  iso.box(u0 - 0.02, v0 + 0.18, u1 + 0.02, v1 + 0.02, 44, 48, lighten(SAND, 0.06), { ink: false });
  // a central stepped pyramidal glazed lantern
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 + 0.1;
  iso.box(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 44, 54, PMBRICK);
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 54, 62, alpha(COLORS.glassSky, 0.9));
  iso.hip(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 62, 12, alpha(COLORS.glassLit, 0.85) as RGBA);
  return iso.build();
}

// =====================================================================
// STRIPPED-CLASSICAL CONCERT/CIVIC HALL — Newcastle City Hall (O2) read: a
// 1920s buff-brick block with a tall arched/Diocletian window range, plain
// pilaster strips, a deep flat cornice. Serves the City Hall, civic halls. 2×2.
// =====================================================================
function concertHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const BUFF = hex('#cdbb95');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 48, BUFF);
  // pilaster strips
  for (let i = 0; i <= 6; i++) { const u = u0 + (u1 - u0) * (i / 6); iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, 40), 0.7 * RES, alpha(shaded(BUFF, 0.12), 0.7)); }
  // a tall central arched (Diocletian) window
  const cu = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(cu - 0.18, v1, 14), iso.P(cu - 0.18, v1, 32)];
  for (let j = 0; j <= 8; j++) { const t = j / 8; poly.push(iso.P(cu - 0.18 + 0.36 * t, v1, 32 + Math.sin(t * Math.PI) * 9)); }
  poly.push(iso.P(cu + 0.18, v1, 32), iso.P(cu + 0.18, v1, 14));
  iso.r.poly(poly, alpha(COLORS.glassLit, 0.6));
  // deep flat cornice + a low parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 48, 53, lighten(BUFF, 0.08), { ink: false });
  return iso.build();
}

// =====================================================================
// EDWARDIAN-BAROQUE TOWN HALL — South Shields Municipal Buildings read: a
// stone civic block with a grand pedimented centre and a tall baroque CLOCK
// TOWER crowned by a lead cupola. Serves the town halls. 2×2.
// =====================================================================
function townHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.42, v1 = 1.58;
  const STONE = hex('#cabf9f');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0 + 0.1, u1, v1, 0, 48, STONE);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.4, 14, 38, 5, alpha(COLORS.glassDark, 0.85), SAND_L);
  // pedimented centre
  iso.box(u0 + 0.3, v1 - 0.12, u0 + 0.74, v1, 0, 44, lighten(STONE, 0.03));
  colonnade(iso, v1, u0 + 0.32, u0 + 0.72, 8, 42, 4, COLORS.white);
  pediment(iso, v1, u0 + 0.3, u0 + 0.74, 44, 12, STONE);
  iso.box(u0 - 0.03, v0 + 0.08, u1 + 0.03, v1 + 0.03, 48, 52, lighten(STONE, 0.08), { ink: false });
  // the tall baroque clock tower (front-right)
  const tu = u1 - 0.22, tv = v1 - 0.22, hw = 0.16;
  const towZ = 96;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, towZ, STONE);
  // clock face + belfry
  const [clx, cly] = iso.P(tu, tv + hw, 70);
  iso.r.poly(circlePts(clx, cly, 3 * RES), SAND_L);
  iso.r.polyline(circlePts(clx, cly, 3 * RES), INK_W * 0.5, INK, true);
  iso.box(tu - hw - 0.02, tv - hw - 0.02, tu + hw + 0.02, tv + hw + 0.02, towZ, towZ + 6, lighten(STONE, 0.06), { ink: false });
  // lead ogee cupola
  domeWhite(iso, tu, tv, towZ + 6, 0.16 * (CELL_W / 2), 1.4, LEAD, shaded(LEAD, 0.08));
  return iso.build();
}

// =====================================================================
// MODERN FACETED CIVIC — City Hall Sunderland (2021) read: a crisp, angular
// glass-and-anodised-fin block with a faceted/folded facade and a sharp
// cantilevered upper storey. 2×2.
// =====================================================================
function facetedCivicTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const FIN = hex('#9fa6ab');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 50, alpha(COLORS.glassSky, 0.92));
  // vertical anodised fins (the folded facade)
  for (let i = 0; i <= 8; i++) { const u = u0 + (u1 - u0) * (i / 8); iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, 46), 0.8 * RES, i % 2 ? alpha(FIN, 0.85) : alpha(lighten(FIN, 0.12), 0.7)); }
  for (let z = 12; z < 46; z += 11) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.4 * RES, alpha(COLORS.white, 0.4));
  // a sharp cantilevered top storey overhanging to the near side
  iso.box(u0 - 0.06, v1 - 0.4, u1 + 0.06, v1 + 0.06, 50, 60, FIN);
  iso.box(u0 - 0.04, v1 - 0.38, u1 + 0.04, v1 + 0.04, 52, 58, alpha(COLORS.glassLit, 0.7), { ink: false });
  return iso.build();
}

// =====================================================================
// SEASIDE RAILWAY STATION — Whitley Bay Station read: a long low Edwardian
// brick range with a domed/cupola booking-hall centre, a canopy, and a curved
// glazed train-shed roof behind. Serves the stations, transport halls. 2×2.
// =====================================================================
function seasideStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  const RED = hex('#a8674a'); // warm seaside red brick
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long booking-hall range
  iso.box(u0, v1 - 0.55, u1, v1, 0, 34, RED);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 26, 9, alpha(COLORS.glassLit, 0.7), SAND_L);
  // a platform canopy
  iso.r.poly([iso.P(u0, v1 - 0.06, 34), iso.P(u1, v1 - 0.06, 34), iso.P(u1, v1, 28), iso.P(u0, v1, 28)], alpha(STEEL, 0.5));
  // the domed booking-hall centrepiece
  const cx = (u0 + u1) / 2, cy = v1 - 0.3;
  iso.box(cx - 0.22, cy - 0.16, cx + 0.22, cy + 0.16, 34, 46, lighten(RED, 0.04));
  domeWhite(iso, cx, cy, 46, 0.2 * (CELL_W / 2), 1.1, LEAD, shaded(LEAD, 0.08));
  // the curved glazed train-shed roof behind
  const tcx = (u0 + u1) / 2;
  for (let s = -6; s <= 6; s++) { const f = s / 6; const u = tcx + f * (u1 - u0) * 0.5; const z = 24 + 22 * Math.sqrt(Math.max(0, 1 - f * f)); iso.r.line(iso.P(u, v0 + 0.06, z), iso.P(u, v1 - 0.55, z), 1.4 * RES, f < 0 ? alpha(COLORS.glassLit, 0.6) : alpha(shaded(STEEL, 0.06), 0.7)); }
  return iso.build();
}

// =====================================================================
// ART-DECO FACTORY — the Wills Building read: a long buff-faience Art-Deco
// block with a tall stepped central ENTRANCE TOWER (vertical fluting, a flat
// crown) flanked by lower symmetrical wings. 2×2.
// =====================================================================
function artDecoFactoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.42, v1 = 1.58;
  const FAI = hex('#d8cdae'); // cream faience
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long flanking wings
  iso.box(u0, v0 + 0.2, u1, v1, 0, 38, FAI);
  for (let z = 12; z < 34; z += 10) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(shaded(FAI, 0.1), 0.6));
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 10, 30, 9, alpha(COLORS.glassDark, 0.8), undefined);
  iso.box(u0 - 0.02, v0 + 0.18, u1 + 0.02, v1 + 0.02, 38, 42, lighten(FAI, 0.06), { ink: false });
  // the tall stepped central entrance tower
  const cu = (u0 + u1) / 2, hw = 0.24;
  iso.box(cu - hw, v1 - 0.4, cu + hw, v1, 0, 78, lighten(FAI, 0.03));
  iso.box(cu - hw + 0.04, v1 - 0.36, cu + hw - 0.04, v1, 78, 88, FAI); // a stepped setback
  // vertical fluting on the tower
  for (let i = 0; i <= 5; i++) { const u = cu - hw + 0.04 + (2 * hw - 0.08) * (i / 5); iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, 76), 0.5 * RES, alpha(shaded(FAI, 0.12), 0.7)); }
  // a tall stair window up the tower centre
  iso.r.poly([iso.P(cu - 0.06, v1, 14), iso.P(cu + 0.06, v1, 14), iso.P(cu + 0.06, v1, 72), iso.P(cu - 0.06, v1, 72)], alpha(COLORS.glassLit, 0.65));
  return iso.build();
}

// =====================================================================
// GEORGIAN ALMSHOUSE — the Keelmen's Hospital read: a plain brick quadrangle
// of two-storey ranges around a court, with a central pedimented clock turret
// + a small cupola. Serves the almshouses, Georgian institutional ranges. 2×2.
// =====================================================================
function almshouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const BR = hex('#9c6b50'); // plain Georgian brick
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a U of ranges around a court (front range lower so the court reads)
  iso.box(u0, v0, u0 + 0.3, v1, 0, 36, BR); // left range
  iso.box(u1 - 0.3, v0, u1, v1, 0, 36, lit(BR, 0.04)); // right range
  iso.box(u0, v0, u1, v0 + 0.3, 0, 36, shaded(BR, 0.04)); // back range
  iso.box(u0, v1 - 0.22, u1, v1, 0, 24, BR); // low front range
  for (const cu of [u0 + 0.15, u1 - 0.15] as const) iso.windowsRight(cu, v0 + 0.08, v1 - 0.08, 10, 30, 7, alpha(COLORS.glassDark, 0.8), SAND_L);
  iso.hip(u0, v0, u1, v0 + 0.3, 36, 8, SLATE);
  // the central pedimented clock turret + cupola
  const cx = (u0 + u1) / 2, cy = v0 + 0.4;
  iso.box(cx - 0.14, cy - 0.14, cx + 0.14, cy + 0.14, 36, 52, lighten(BR, 0.05));
  const [clx, cly] = iso.P(cx, cy + 0.14, 44);
  iso.r.poly(circlePts(clx, cly, 2.4 * RES), SAND_L);
  iso.r.polyline(circlePts(clx, cly, 2.4 * RES), INK_W * 0.4, INK, true);
  cap(iso, cx, 0.12, cy, 52, 12, LEAD);
  return iso.build();
}

// =====================================================================
// SEVEN STORIES — the National Centre for Children's Books, in a tall converted
// Victorian Ouseburn flour WAREHOUSE: a slim, very tall red-brick warehouse
// block of seven floors (the name), small regular windows up the gable end, a
// hoist gantry on the canalside face, and bright banners hung down it. Slim +
// tall (it stands head-and-shoulders over the Ouseburn). 1×1, towering.
// =====================================================================
function sevenStoriesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const u0 = 0.2, u1 = 0.82, v0 = 0.2, v1 = 0.82;
  const BR = hex('#9a5340'); // Ouseburn warehouse red brick
  const H = 104;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // seven floors of small regular windows on the long (left) face
  for (let f = 0; f < 7; f++) {
    const z = 8 + f * 13;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, z, z + 7, 3, alpha(COLORS.glassDark, 0.82), SAND_L);
  }
  // a tall colourful banner hung down the brick (the centre's branding)
  for (const [bu, col] of [[u0 + 0.16, hex('#d8743a')], [u0 + 0.34, hex('#4f86a8')]] as const) {
    iso.r.poly([iso.P(bu, v1, 18), iso.P(bu + 0.08, v1, 18), iso.P(bu + 0.08, v1, H - 6), iso.P(bu, v1, H - 6)], alpha(col, 0.92));
  }
  // brick string-courses
  for (const z of [7, 7 + 13 * 3, 7 + 13 * 6] as const) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.6 * RES, alpha(shaded(BR, 0.14), 0.7));
  // a flat parapet + a loading hoist gantry projecting from the gable top
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(BR, 0.05), { ink: false });
  const [hx, hy] = iso.P(u1, (v0 + v1) / 2, H);
  iso.r.line([hx, hy], [hx + 7 * RES, hy - 5 * RES], 1.4 * RES, SLATE);
  iso.r.line([hx + 7 * RES, hy - 5 * RES], [hx + 7 * RES, hy + 4 * RES], 0.8 * RES, alpha(SLATE, 0.8)); // hoist rope
  return iso.build();
}

// =====================================================================
// GEORGE STEPHENSON'S BIRTHPLACE — the tiny National-Trust stone COTTAGE at
// Wylam where "the Father of Railways" was born: a low, single-storey rubble-
// stone cottage with a heavy stone-slate roof, a single end chimney, small
// windows, set by the old waggonway. Humble but a national shrine — kept small,
// raised a touch so it still reads as a hero. 1×1.
// =====================================================================
function stephensonsBirthplaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.34, v1 = 0.84;
  const STONE = hex('#b9ad92'); // Tyne-valley rubble stone
  iso.shadow(u0 - 0.04, v0, u1 + 0.04, v1 + 0.06, 0.22, 0.22);
  // a sliver of grass + the waggonway rail in front
  iso.box(u0 - 0.04, v1, u1 + 0.04, v1 + 0.12, 0, 2, shaded(GREEN, 0.06), { ink: false });
  iso.r.line(iso.P(u0, v1 + 0.08, 2), iso.P(u1, v1 + 0.08, 2), 0.8 * RES, alpha(STEEL_D, 0.7));
  // the low cottage body
  iso.box(u0, v0, u1, v1, 0, 22, STONE);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 15, 2, alpha(COLORS.glassLit, 0.7), SAND_L);
  // a low door
  iso.box(u0 + 0.3, v1 - 0.02, u0 + 0.42, v1, 0, 14, hex('#5c4633'), { ink: false });
  // heavy stone-slate gable roof (ridge along u) + an end chimney
  iso.gable(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 22, 13, 'u', SLATE, STONE);
  iso.box(u0 + 0.04, (v0 + v1) / 2 - 0.05, u0 + 0.16, (v0 + v1) / 2 + 0.05, 30, 42, hex('#7e6750'));
  return iso.build();
}

// =====================================================================
// CHERRYBURN — Thomas Bewick's birthplace farm above the Tyne: a small
// whitewashed Northumbrian FARMSTEAD — the low white cottage with a stone-slate
// roof set at right angles to a darker rubble-stone BYRE/barn range, a couple of
// chimneys, all in a green hill clearing. The white-against-green farm cluster
// is the read. 2×2 (it sprawls low).
// =====================================================================
function cherryburnTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const WHITE = hex('#e6e0d2'); // limewashed farmhouse
  const RUBBLE = hex('#a99d82'); // darker stone byre
  iso.shadow(0.34, 0.4, 1.66, 1.62, 0.22, 0.22);
  // the green farm clearing
  iso.box(0.28, 0.34, 1.72, 1.7, 0, 4, shaded(GREEN, 0.06), { ink: false });
  // the darker rubble-stone byre/barn range along the back (ridge along v)
  iso.box(0.42, 0.42, 0.86, 1.5, 4, 30, RUBBLE);
  iso.gable(0.4, 0.42, 0.88, 1.5, 30, 11, 'v', SLATE, RUBBLE);
  // a barn door + slit vents on the byre
  iso.box(0.86, 0.6, 0.88, 0.86, 4, 22, hex('#4f3f2e'), { ink: false });
  // the white limewashed farmhouse set at right angles in front-right
  iso.box(0.92, 0.96, 1.6, 1.46, 4, 28, WHITE);
  iso.windowsLeft(1.46, 1.0, 1.54, 12, 20, 3, alpha(COLORS.glassLit, 0.72), undefined);
  iso.box(1.18, 1.44, 1.3, 1.46, 4, 18, hex('#5c4633'), { ink: false }); // door
  iso.gable(0.9, 0.94, 1.62, 1.48, 28, 12, 'u', SLATE, WHITE);
  // two chimneys
  iso.box(0.5, 0.5, 0.6, 0.6, 38, 50, hex('#8a6f5a'));
  iso.box(1.46, 1.0, 1.56, 1.1, 36, 48, hex('#8a6f5a'));
  return iso.build();
}

// =====================================================================
// JARROW HALL (BEDE MUSEUM) — celebrating the Venerable Bede: a trim Georgian
// brick HALL (symmetrical three-bay, hipped roof, central pedimented door) sat
// beside a low modern museum range with a monastic feel — a slim Anglo-Saxon
// stone bell-tower hint rising at the join (a nod to St Paul's, Jarrow). 2×2.
// =====================================================================
function jarrowHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.58;
  const BR = hex('#a06b4f'); // warm Georgian brick
  const STONE = hex('#c4b896');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the low modern museum range across the back-left
  iso.box(u0, v0 + 0.1, u0 + 0.7, v1, 0, 26, shaded(STONE, 0.04));
  iso.windowsLeft(v1, u0 + 0.06, u0 + 0.64, 8, 18, 4, alpha(COLORS.glassLit, 0.65), undefined);
  // the trim Georgian brick hall, front-right (symmetrical, three bays)
  iso.box(u0 + 0.74, v0 + 0.2, u1, v1, 0, 40, BR);
  for (const zr of [12, 28] as const) iso.windowsLeft(v1, u0 + 0.82, u1 - 0.06, zr, zr + 9, 3, alpha(COLORS.glassDark, 0.84), SAND_L);
  // central pedimented stone door
  const du = (u0 + 0.74 + u1) / 2;
  iso.box(du - 0.07, v1 - 0.04, du + 0.07, v1, 0, 18, lighten(STONE, 0.04));
  pediment(iso, v1, du - 0.09, du + 0.09, 18, 4, STONE);
  iso.hip(u0 + 0.72, v0 + 0.18, u1 + 0.02, v1 + 0.02, 40, 12, SLATE);
  // the slim Anglo-Saxon stone bell-tower at the join (Bede's monastery nod)
  const tu = u0 + 0.72, tv = v0 + 0.36, hw = 0.11;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 0, 70, STONE);
  // a tiny twin Saxon belfry opening + a pyramidal cap
  iso.r.poly([iso.P(tu - 0.05, tv + hw, 52), iso.P(tu + 0.05, tv + hw, 52), iso.P(tu + 0.05, tv + hw, 62), iso.P(tu - 0.05, tv + hw, 62)], alpha(COLORS.glassDark, 0.8));
  iso.r.line(iso.P(tu, tv + hw, 52), iso.P(tu, tv + hw, 62), 0.6 * RES, alpha(STONE, 0.8));
  iso.hip(tu - hw - 0.02, tv - hw - 0.02, tu + hw + 0.02, tv + hw + 0.02, 70, 12, SLATE);
  return iso.build();
}

// =====================================================================
// SEGEDUNUM ROMAN FORT & MUSEUM — Wallsend, the eastern end of Hadrian's Wall:
// the signature is the tall steel-and-glass VIEWING TOWER overlooking the
// excavated fort outline, beside a low museum hall and a reconstructed length of
// Roman wall with its V-ditch. The slim tower + the wall on the ground is the
// read. 1×1, drawn wide; the tower spikes up.
// =====================================================================
function segedunumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.16, v1 = 0.86;
  const STONE = hex('#b6aa8e'); // Roman wall stone
  const GLASS = hex('#9fb2bd');
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // the excavated turf platform with the pale outline of fort walls
  iso.box(u0, v0, u1, v1, 0, 5, shaded(GREEN, 0.05), { ink: false });
  for (const [a, b] of [[[u0 + 0.08, v0 + 0.08], [u1 - 0.3, v0 + 0.08]], [[u1 - 0.3, v0 + 0.08], [u1 - 0.3, v1 - 0.3]]] as const) {
    iso.r.line(iso.P(a[0], a[1], 5), iso.P(b[0], b[1], 5), 1.4 * RES, alpha(STONE, 0.75));
  }
  // a reconstructed length of Hadrian's Wall along the near edge
  iso.box(u0 + 0.06, v1 - 0.1, u1 - 0.32, v1, 5, 17, STONE);
  // the low museum hall (back-left)
  iso.box(u0 + 0.04, v0 + 0.06, u0 + 0.34, v0 + 0.5, 5, 22, shaded(STONE, 0.04));
  // the tall steel-and-glass VIEWING TOWER (the signature), front-right
  const tu = u1 - 0.16, tv = v1 - 0.18, hw = 0.12;
  const towZ = 122;
  iso.box(tu - hw, tv - hw, tu + hw, tv + hw, 5, towZ, alpha(GLASS, 0.9));
  // floor mullions + a corner steel mast
  for (let z = 16; z < towZ - 6; z += 12) iso.r.line(iso.P(tu - hw, tv + hw, z), iso.P(tu + hw, tv + hw, z), 0.4 * RES, alpha(COLORS.white, 0.4));
  iso.r.line(iso.P(tu + hw, tv - hw, 5), iso.P(tu + hw, tv - hw, towZ + 14), 1 * RES, STEEL_D);
  // the glazed observation cap with an overhanging flat roof
  iso.box(tu - hw - 0.03, tv - hw - 0.03, tu + hw + 0.03, tv + hw + 0.03, towZ, towZ + 8, STEEL);
  iso.box(tu - hw + 0.02, tv - hw + 0.02, tu + hw - 0.02, tv + hw - 0.02, towZ - 14, towZ, alpha(COLORS.glassLit, 0.7), { ink: false });
  return iso.build();
}

// =====================================================================
// STEPHENSON RAILWAY MUSEUM — North Shields engine shed: a long low industrial
// SHED in pale corrugated-and-brick with a shallow-pitched roof and a big
// arch-headed locomotive doorway, a black STEAM ENGINE with a tall chimney
// standing out front on a length of rail, a water tower at one end. The engine
// + shed is the read. 2×2 (drawn long).
// =====================================================================
function stephensonRailwayMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.5, v1 = 1.6;
  const SHED = hex('#9aa0a3'); // corrugated grey shed
  const BR = hex('#9c6450');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long shed with brick gable ends + a shallow pitched roof (ridge along u)
  iso.box(u0, v0, u1, v1, 0, 34, SHED);
  iso.box(u0 - 0.02, v0 - 0.02, u0 + 0.12, v1 + 0.02, 0, 34, BR); // brick end
  iso.box(u1 - 0.12, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 34, BR); // brick end
  iso.gable(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 34, 12, 'u', SLATE, SHED);
  // corrugation lines on the shed wall + a big arch-headed engine doorway
  for (let i = 1; i < 10; i++) { const u = u0 + (u1 - u0) * (i / 10); iso.r.line(iso.P(u, v1, 4), iso.P(u, v1, 32), 0.35 * RES, alpha(shaded(SHED, 0.12), 0.5)); }
  const du = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(du - 0.16, v1, 4), iso.P(du - 0.16, v1, 22)];
  for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(du - 0.16 + 0.32 * t, v1, 22 + Math.sin(t * Math.PI) * 7)); }
  poly.push(iso.P(du + 0.16, v1, 22), iso.P(du + 0.16, v1, 4));
  iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
  // a water tower at the far end
  iso.box(u0 + 0.02, v0 + 0.04, u0 + 0.18, v0 + 0.2, 34, 56, shaded(BR, 0.04));
  iso.box(u0 - 0.01, v0 + 0.01, u0 + 0.21, v0 + 0.23, 56, 64, hex('#5d6975'));
  // the black STEAM ENGINE standing out front on a length of rail
  const eu0 = du - 0.26, eu1 = du + 0.1, ev = v1 + 0.18;
  iso.r.line(iso.P(u0 + 0.1, v1 + 0.24, 2), iso.P(u1 - 0.1, v1 + 0.24, 2), 0.7 * RES, alpha(STEEL_D, 0.7)); // rail
  iso.box(eu0, ev - 0.05, eu1, ev + 0.05, 2, 18, hex('#33373c')); // boiler block
  iso.r.poly(circlePts(...isoXY(iso, eu0 + 0.02, ev, 18), 4 * RES), hex('#2a2d31')); // smokebox door end
  iso.box(eu1 - 0.06, ev - 0.06, eu1, ev + 0.06, 2, 24, hex('#3c4045')); // cab
  iso.box(eu0 + 0.02, ev - 0.03, eu0 + 0.08, ev + 0.03, 18, 30, hex('#2a2d31')); // chimney
  iso.glint(iso.P(eu0 + 0.05, ev, 31), 1.4 * RES); // steam wisp
  return iso.build();
}

// =====================================================================
// CORBRIDGE ROMAN TOWN (Coria) — the Roman supply town on Dere Street: low
// excavated STONE FOUNDATIONS laid out in a grid, a pair of standing GRANARY
// (horreum) walls with their ventilation slots and buttresses, a couple of
// re-erected COLUMNS, and a fragment of paved road — all sober grey stone on
// turf. The ruined grid + standing fragments is the read. 2×2, low.
// =====================================================================
function corbridgeRomanTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const STONE = hex('#b3a988');
  const STONE_D = hex('#928868');
  iso.shadow(0.32, 0.4, 1.66, 1.62, 0.2, 0.22);
  // the turf the town is excavated into
  iso.box(0.28, 0.34, 1.72, 1.7, 0, 4, shaded(GREEN, 0.06), { ink: false });
  // a fragment of the paved Roman road (Dere Street) running through
  iso.r.poly([iso.P(0.34, 0.9, 5), iso.P(1.66, 0.74, 5), iso.P(1.66, 0.92, 5), iso.P(0.34, 1.08, 5)], alpha(STONE_D, 0.7));
  // a grid of low excavated foundation walls (knee-high stone footings)
  for (const [cu, cv] of [[0.5, 1.2], [0.9, 1.3], [1.3, 1.2]] as const) {
    iso.box(cu - 0.14, cv - 0.12, cu + 0.14, cv + 0.12, 4, 9, STONE, { ink: false });
    iso.r.line(iso.P(cu, cv - 0.12, 9), iso.P(cu, cv + 0.12, 9), 0.4 * RES, alpha(STONE_D, 0.6));
  }
  // the two standing GRANARY walls — taller, buttressed, with vent slots
  for (const gu of [0.7, 1.12] as const) {
    iso.box(gu - 0.1, 0.5, gu + 0.1, 0.74, 4, 34, STONE);
    // raised-floor ventilation slots along the base
    for (const z of [10, 18] as const) iso.r.line(iso.P(gu - 0.08, 0.74, z), iso.P(gu + 0.08, 0.74, z), 0.8 * RES, alpha(STONE_D, 0.7));
    // sloped buttress at the corner
    iso.r.poly([iso.P(gu + 0.1, 0.62, 4), iso.P(gu + 0.16, 0.62, 4), iso.P(gu + 0.1, 0.62, 24)], shaded(STONE, 0.06));
  }
  // a pair of re-erected stone columns by the road
  for (const xu of [1.42, 1.54] as const) {
    iso.box(xu - 0.03, 1.0, xu + 0.03, 1.06, 5, 30, lighten(STONE, 0.04));
    const [cx, cy] = iso.P(xu, 1.03, 30);
    iso.r.rect(cx - 2 * RES, cy - 3 * RES, cx + 2 * RES, cy, lighten(STONE, 0.06)); // capital
  }
  return iso.build();
}

// =====================================================================
// CLIFFORD'S FORT — the 17th-c. coastal artillery fort guarding the Tyne mouth
// at North Shields: a long LOW stone rampart wall hard against the river with a
// row of GUN EMBRASURES and cannon, a small gabled guardhouse/magazine block,
// all weathered grey stone on the quay. The long low gun-wall is the read. 2×2.
// =====================================================================
function cliffordsFortTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.5, v1 = 1.6;
  const STONE = hex('#a99e84');
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  // a strip of river water along the far edge
  iso.box(u0 - 0.06, v0 - 0.1, u1 + 0.06, v0, -4, 2, shaded(SEA, 0.08), { ink: false });
  // the long low stone rampart wall facing the river
  iso.box(u0, v0 + 0.2, u1, v1, 0, 22, STONE);
  // a sloping earth glacis / battered base
  iso.r.poly([iso.P(u0, v1, 0), iso.P(u1, v1, 0), iso.P(u1, v1 - 0.1, 14), iso.P(u0, v1 - 0.1, 14)], shaded(STONE, 0.1));
  // a row of gun embrasures (crenel notches) + stub cannon barrels poking out
  iso.box(u0 - 0.02, v0 + 0.18, u1 + 0.02, v0 + 0.24, 22, 28, lighten(STONE, 0.04), { ink: false });
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.12 + i * 0.24;
    const [gx, gy] = iso.P(u, v0 + 0.2, 24);
    iso.r.rect(gx - 1.6 * RES, gy - 5 * RES, gx + 1.6 * RES, gy - 1 * RES, alpha(SLATE, 0.5)); // embrasure gap
    iso.r.line([gx, gy - 2 * RES], [gx - 4 * RES, gy - 1 * RES], 1.2 * RES, hex('#33373c')); // cannon barrel
  }
  // a small gabled guardhouse / magazine block behind
  iso.box(u1 - 0.4, v1 - 0.42, u1 - 0.06, v1 - 0.06, 0, 26, lighten(STONE, 0.02));
  iso.gable(u1 - 0.42, v1 - 0.44, u1 - 0.04, v1 - 0.04, 26, 9, 'u', SLATE, STONE);
  return iso.build();
}

// =====================================================================
// PATH HEAD WATERMILL — a restored working CORN MILL near Blaydon: a stout
// stone-and-brick mill building with a steep pantile roof, set over a leat, with
// a big timber overshot WATER WHEEL on its gable end and a small kiln cowl. The
// turning wheel on the stone gable is the read. 1×1, drawn broad.
// =====================================================================
function pathHeadWatermillTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const u0 = 0.16, u1 = 0.82, v0 = 0.2, v1 = 0.82;
  const STONE = hex('#b0a488');
  const PANTILE = hex('#9d5b3e'); // warm pantile roof
  iso.shadow(u0 - 0.06, v0, u1 + 0.06, v1 + 0.04, 0.2, 0.22);
  // the mill leat (a sliver of water down the right side)
  iso.box(u1, v0 + 0.1, u1 + 0.14, v1, -3, 1, shaded(SEA, 0.06), { ink: false });
  // the stout mill body
  iso.box(u0, v0, u1, v1, 0, 32, STONE);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 10, 18, 3, alpha(COLORS.glassDark, 0.8), SAND_L);
  iso.box(u0 + 0.28, v1 - 0.02, u0 + 0.4, v1, 0, 16, hex('#5c4633'), { ink: false }); // door
  // steep pantile roof (ridge along u) + a little kiln cowl
  iso.gable(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 32, 16, 'u', PANTILE, STONE);
  const [kx, kyB] = iso.P(u0 + 0.2, v0 + 0.2, 48);
  iso.r.poly(circlePts(kx, kyB - 4 * RES, 3 * RES, 2 * RES), hex('#6a5240')); // conical kiln cowl
  // the big timber overshot WATER WHEEL on the right gable end (u1 face)
  const [wx, wy] = iso.P(u1 + 0.02, v0 + 0.42, 16);
  const R = 13 * RES;
  iso.r.poly(circlePts(wx, wy, R, R), alpha(hex('#6f5640'), 0.95));
  iso.r.poly(circlePts(wx, wy, R * 0.66, R * 0.66), STONE);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; iso.r.line([wx, wy], [wx + Math.cos(a) * R, wy + Math.sin(a) * R], 0.5 * RES, alpha(hex('#4f3f2e'), 0.8)); }
  iso.r.polyline(circlePts(wx, wy, R, R), INK_W * 0.6, INK, true);
  return iso.build();
}

// =====================================================================
// HEXHAM OLD GAOL — reputedly England's first purpose-built PRISON (1333): a
// tall, stark, near-windowless square stone TOWER-KEEP with a battered base, a
// few tiny barred slit windows high up, a corbelled parapet and a small forebuilding
// stair turret. Grim and vertical. 1×1, towering.
// =====================================================================
function hexhamGaolTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const u = 0.5, v = 0.52, hw = 0.28;
  const STONE = hex('#a89d82'); // grim weathered gaol stone
  const H = 96;
  iso.shadow(u - hw - 0.04, v - hw, u + hw + 0.04, v + hw + 0.08, 0.26, 0.24);
  // a battered (sloping) base
  iso.r.poly([iso.P(u - hw - 0.05, v + hw + 0.05, 0), iso.P(u + hw + 0.05, v + hw + 0.05, 0), iso.P(u + hw, v + hw, 18), iso.P(u - hw, v + hw, 18)], shaded(STONE, 0.12));
  // the tall stark tower body
  iso.box(u - hw, v - hw, u + hw, v + hw, 0, H, STONE);
  // a very few tiny barred slit windows high up
  for (const [pu, pz] of [[u - 0.1, 56], [u + 0.08, 74], [u - 0.02, 40]] as const) {
    const [sx, sy] = iso.P(pu, v + hw, pz);
    iso.r.rect(sx - 0.8 * RES, sy - 6 * RES, sx + 0.8 * RES, sy, alpha(SLATE, 0.75));
  }
  // a small forebuilding stair turret clasping one corner, a touch taller
  iso.box(u - hw, v + hw - 0.06, u - hw + 0.12, v + hw + 0.06, 0, H + 12, lighten(STONE, 0.02));
  // a corbelled / machicolated parapet crown
  iso.box(u - hw - 0.03, v - hw - 0.03, u + hw + 0.03, v + hw + 0.03, H, H + 6, lighten(STONE, 0.05), { ink: false });
  battlementSquareStone(iso, u, hw, v, H + 1, STONE);
  return iso.build();
}

// =====================================================================
// DERWENTCOTE STEEL FURNACE — the oldest surviving cementation steel furnace
// (c.1730) in the Derwent valley: the signature is the tall tapering CONICAL
// stone-and-brick furnace chimney rising from a squat square base, flanked by
// low stone working-shed ranges where the chests were charged. The big stone
// cone is the read. 1×1, the cone spikes up.
// =====================================================================
function derwentcoteFurnaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const u = 0.5, v = 0.54;
  const STONE = hex('#9b8f74'); // sooted furnace stone
  const STONE_L = hex('#b3a888');
  iso.shadow(u - 0.34, v - 0.2, u + 0.34, v + 0.3, 0.24, 0.24);
  // low stone working-shed ranges flanking the furnace base
  iso.box(u - 0.36, v + 0.04, u - 0.12, v + 0.3, 0, 20, STONE);
  iso.gable(u - 0.38, v + 0.02, u - 0.1, v + 0.32, 20, 7, 'v', SLATE, STONE);
  iso.box(u + 0.12, v + 0.04, u + 0.36, v + 0.3, 0, 20, lit(STONE, 0.04));
  iso.gable(u + 0.1, v + 0.02, u + 0.38, v + 0.32, 20, 7, 'v', SLATE, STONE);
  // the squat square furnace base
  iso.box(u - 0.18, v - 0.06, u + 0.18, v + 0.18, 0, 32, STONE_L);
  // a low arched charging opening at the base
  const poly: Pt[] = [iso.P(u - 0.08, v + 0.18, 4), iso.P(u - 0.08, v + 0.18, 12)];
  for (let j = 0; j <= 5; j++) { const t = j / 5; poly.push(iso.P(u - 0.08 + 0.16 * t, v + 0.18, 12 + Math.sin(t * Math.PI) * 4)); }
  poly.push(iso.P(u + 0.08, v + 0.18, 12), iso.P(u + 0.08, v + 0.18, 4));
  iso.r.poly(poly, alpha(hex('#2a2522'), 0.85));
  // the tall tapering CONICAL furnace chimney (a stack of narrowing rings)
  const segs = 8;
  const z0 = 32, top1 = 116;
  for (let i = 0; i < segs; i++) {
    const za = z0 + (top1 - z0) * (i / segs);
    const zb = z0 + (top1 - z0) * ((i + 1) / segs);
    const hw = 0.17 - 0.13 * (i / segs);
    iso.box(u - hw, v - hw + 0.04, u + hw, v + hw + 0.04, za, zb, i % 2 ? STONE : lighten(STONE, 0.03));
  }
  // a wisp of heat-shimmer at the cone tip
  iso.glint(iso.P(u, v + 0.04, top1 + 4), 1.6 * RES);
  return iso.build();
}

// =====================================================================
// NORTH EAST LAND, SEA & AIR MUSEUMS — the regional aviation museum on the old
// RAF Usworth airfield (Washington): a big curved-roof aircraft HANGAR in pale
// corrugated cladding with a wide sliding-door front, an AIRCRAFT with swept
// wings + tailfin parked on the apron out front, and a small control-tower cabin.
// The hangar + parked jet is the read. 2×2 (drawn broad).
// =====================================================================
function airMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.46, v1 = 1.5;
  const CLAD = hex('#aeb3b6'); // pale corrugated hangar cladding
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the apron
  iso.box(u0 - 0.04, v1 - 0.02, u1 + 0.04, v1 + 0.16, 0, 2, shaded(hex('#8f8d86'), 0.06), { ink: false });
  // the hangar body with a curved (barrel) roof
  iso.box(u0, v0 + 0.2, u1, v1, 0, 30, CLAD);
  const cx = (u0 + u1) / 2;
  for (let s = -6; s <= 6; s++) {
    const f = s / 6;
    const u = cx + f * (u1 - u0) * 0.5;
    const z = 30 + 18 * Math.sqrt(Math.max(0, 1 - f * f));
    iso.r.line(iso.P(u, v0 + 0.22, z), iso.P(u, v1, z - 2), 1.3 * RES, f < 0 ? lit(CLAD, 0.05) : shaded(CLAD, 0.06));
  }
  // the wide sliding-door front with a tall slot opening
  for (let i = 1; i < 8; i++) { const u = u0 + (u1 - u0) * (i / 8); iso.r.line(iso.P(u, v1, 4), iso.P(u, v1, 28), 0.4 * RES, alpha(shaded(CLAD, 0.12), 0.5)); }
  iso.box(cx - 0.16, v1 - 0.02, cx + 0.16, v1, 4, 26, alpha(COLORS.glassDark, 0.7), { ink: false });
  // a small control-tower cabin at one corner
  iso.box(u0 + 0.02, v0 + 0.04, u0 + 0.16, v0 + 0.18, 0, 34, shaded(CLAD, 0.04));
  iso.box(u0, v0 + 0.02, u0 + 0.18, v0 + 0.2, 34, 40, alpha(COLORS.glassLit, 0.7));
  // the parked AIRCRAFT out front on the apron — fuselage, swept wings, tailfin
  const au = cx, av = v1 + 0.08;
  iso.box(au - 0.22, av - 0.025, au + 0.18, av + 0.025, 2, 7, hex('#5c6166')); // fuselage
  iso.r.poly([iso.P(au - 0.16, av, 5), iso.P(au + 0.04, av, 5), iso.P(au - 0.06, av + 0.18, 4), iso.P(au - 0.18, av + 0.16, 4)], lit(hex('#5c6166'), 0.06)); // wing
  iso.r.poly([iso.P(au - 0.16, av, 5), iso.P(au + 0.04, av, 5), iso.P(au - 0.06, av - 0.18, 4), iso.P(au - 0.18, av - 0.16, 4)], shaded(hex('#5c6166'), 0.06)); // far wing
  iso.r.poly([iso.P(au + 0.14, av, 7), iso.P(au + 0.18, av, 7), iso.P(au + 0.16, av, 15)], hex('#7a4a3a')); // tailfin
  iso.glint(iso.P(au - 0.06, av, 7), 1.4 * RES); // canopy glint
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
  {
    city: 'northeast', key: 'high-level-bridge', match: /High[- ]Level Bridge/i,
    foot: [2, 3], seed: 68, draw: highLevelBridgeTile,
    light: { kind: 'archGlow', topZ: 84, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'swing-bridge', match: /\bSwing Bridge\b/i,
    foot: [2, 3], seed: 69, draw: swingBridgeTile,
    light: { kind: 'facadeFlood', topZ: 42, halfW: 1.2 },
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
    city: 'northeast', key: 'newcastle-castle-keep', match: /Castle Keep|Newcastle Castle|The Castle, Newcastle|Black Gate/i,
    foot: [1, 1], seed: 70, draw: castleKeepTile,
    light: { kind: 'facadeFlood', topZ: 132, halfW: 0.5 },
  },
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
  // --- the football grounds -------------------------------------------------
  {
    city: 'northeast', key: 'st-james-park', match: /St\.? ?James'?(?:’)? Park|Newcastle United/i,
    foot: [2, 2], seed: 71, draw: stJamesParkTile,
    light: { kind: 'stadiumFlood', topZ: 100, halfW: 1.4 },
  },
  {
    city: 'northeast', key: 'stadium-of-light', match: /Stadium of Light|Sunderland A\.?F\.?C/i,
    foot: [2, 2], seed: 72, draw: stadiumOfLightTile,
    light: { kind: 'stadiumFlood', topZ: 84, halfW: 1.4 },
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
  // --- Newcastle/Sunderland civic & commercial heroes (doc-driven, W6) ------
  {
    city: 'northeast', key: 'grainger-market', match: /Grainger Market/i,
    foot: [1, 1], seed: 73, draw: graingerMarketTile,
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.5 },
  },
  {
    city: 'northeast', key: 'eldon-square', match: /Eldon Square/i,
    foot: [3, 3], seed: 74, draw: eldonSquareTile,
    light: { kind: 'towerCrown', topZ: 58, halfW: 1.6 },
  },
  {
    city: 'northeast', key: 'hm-revenue-customs', match: /HM Revenue|Revenue and Customs/i,
    foot: [2, 2], seed: 75, draw: glassOfficeTile,
    light: { kind: 'towerCrown', topZ: 96, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'ernst-young', match: /Ernst (?:&|and) Young/i,
    foot: [2, 2], seed: 76, draw: glassOfficeTile,
    light: { kind: 'towerCrown', topZ: 96, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'partnership-house', match: /Partnership House/i,
    foot: [2, 2], seed: 77, draw: glassOfficeTile,
    light: { kind: 'towerCrown', topZ: 96, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'armstrong-building', match: /Armstrong Building/i,
    foot: [2, 2], seed: 78, draw: universityRangeTile,
    light: { kind: 'facadeFlood', topZ: 104, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'newcastle-business-school', match: /Business School and School of Law|Newcastle Business School/i,
    foot: [2, 2], seed: 79, draw: universityRangeTile,
    light: { kind: 'facadeFlood', topZ: 104, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'royal-station-hotel', match: /Royal Station Hotel/i,
    foot: [2, 2], seed: 80, draw: (s) => classicalBlockTile(s, true),
    light: { kind: 'facadeFlood', topZ: 74, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'fenwick', match: /\bFenwick\b/i,
    foot: [2, 2], seed: 81, draw: (s) => classicalBlockTile(s, true),
    light: { kind: 'facadeFlood', topZ: 74, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'milburn-house', match: /Milburn House|Exchange Buildings|Princes Buildings|St Nicholas Buildings/i,
    foot: [2, 2], seed: 82, draw: (s) => classicalBlockTile(s, false),
    light: { kind: 'facadeFlood', topZ: 65, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'law-courts', match: /Law Courts/i,
    foot: [2, 2], seed: 83, draw: quaysideCivicTile,
    light: { kind: 'facadeFlood', topZ: 62, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'newcastle-city-hall', match: /Newcastle City Hall|O2 City Hall|City Hall, Newcastle/i,
    foot: [2, 2], seed: 84, draw: concertHallTile,
    light: { kind: 'facadeFlood', topZ: 53, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'municipal-buildings', match: /Municipal Buildings|Town Hall/i,
    foot: [2, 2], seed: 85, draw: townHallTile,
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'city-hall-sunderland', match: /City Hall, Sunderland|Sunderland City Hall/i,
    foot: [2, 2], seed: 86, draw: facetedCivicTile,
    light: { kind: 'rimCycle', topZ: 60, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'whitley-bay-station', match: /Whitley Bay Station|Station Main Building/i,
    foot: [2, 2], seed: 87, draw: seasideStationTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'wills-building', match: /Wills Building/i,
    foot: [2, 2], seed: 88, draw: artDecoFactoryTile,
    light: { kind: 'towerCrown', topZ: 88, halfW: 1.2 },
  },
  {
    city: 'northeast', key: 'keelmens-hospital', match: /Keelmen'?s Hospital|Master Mariners/i,
    foot: [2, 2], seed: 89, draw: almshouseTile,
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.2 },
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
  // --- the long tail (W7): Ouseburn, the heritage/Roman sites, the mills ----
  {
    city: 'northeast', key: 'seven-stories', match: /Seven Stories/i,
    foot: [1, 1], seed: 90, draw: sevenStoriesTile,
    light: { kind: 'facadeFlood', topZ: 104, halfW: 0.5 },
  },
  {
    city: 'northeast', key: 'stephensons-birthplace', match: /Stephenson'?s Birthplace|George Stephenson/i,
    foot: [1, 1], seed: 91, draw: stephensonsBirthplaceTile,
    light: { kind: 'facadeFlood', topZ: 36, halfW: 0.5 },
  },
  {
    city: 'northeast', key: 'cherryburn', match: /Cherryburn|Thomas Bewick/i,
    foot: [2, 2], seed: 92, draw: cherryburnTile,
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'jarrow-hall', match: /Jarrow Hall|Bede(?: Museum| World| Museum & Anglo-Saxon)?/i,
    foot: [2, 2], seed: 93, draw: jarrowHallTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.1 },
  },
  {
    city: 'northeast', key: 'segedunum', match: /Segedunum/i,
    foot: [1, 1], seed: 94, draw: segedunumTile,
    light: { kind: 'aerialBeacon', topZ: 130, halfW: 0.3 },
  },
  {
    city: 'northeast', key: 'stephenson-railway-museum', match: /Stephenson Railway Museum|North Tyneside Steam Railway/i,
    foot: [2, 2], seed: 95, draw: stephensonRailwayMuseumTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'corbridge-roman', match: /Corbridge Roman|Coria/i,
    foot: [2, 2], seed: 96, draw: corbridgeRomanTile,
    light: { kind: 'facadeFlood', topZ: 34, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'cliffords-fort', match: /Cliff?ord'?s Fort/i,
    foot: [2, 2], seed: 97, draw: cliffordsFortTile,
    light: { kind: 'facadeFlood', topZ: 28, halfW: 1.3 },
  },
  {
    city: 'northeast', key: 'path-head-watermill', match: /Path Head Watermill|Path Head Water Mill/i,
    foot: [1, 1], seed: 98, draw: pathHeadWatermillTile,
    light: { kind: 'facadeFlood', topZ: 46, halfW: 0.5 },
  },
  {
    city: 'northeast', key: 'hexham-old-gaol', match: /Hexham Old Gaol|Hexham Gaol/i,
    foot: [1, 1], seed: 99, draw: hexhamGaolTile,
    light: { kind: 'facadeFlood', topZ: 96, halfW: 0.5 },
  },
  {
    city: 'northeast', key: 'derwentcote-furnace', match: /Derwentcote(?: Steel Furnace)?/i,
    foot: [1, 1], seed: 100, draw: derwentcoteFurnaceTile,
    light: { kind: 'aerialBeacon', topZ: 116, halfW: 0.4 },
  },
  {
    city: 'northeast', key: 'air-museum', match: /Land,? Sea and Air Museum|North East Aircraft Museum|NELSAM/i,
    foot: [2, 2], seed: 101, draw: airMuseumTile,
    light: { kind: 'aerialBeacon', topZ: 50, halfW: 1.4 },
  },
];
