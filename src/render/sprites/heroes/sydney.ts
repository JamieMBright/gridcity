// Sydney & the Harbour — bespoke-hero registry (Wave W5, ROUND 1 of the ~99
// research target in docs/heroes/sydney/). Each entry resolves a PLACED name
// from src/data/cities/sydney.ts's `named` list to a hand-built iso sprite in
// the game's ink-contour dusk idiom + a bespoke night-electrification light.
//
// Sydney's character (owner: "super rich blues of Sydney"): the deep harbour
// blue is the backdrop; the heroes split into three families —
//  • MARQUEE bespoke icons — the OPERA HOUSE (white sail shells), the HARBOUR
//    BRIDGE (the great steel arch + granite pylons), SYDNEY TOWER (golden
//    turret on a tall shaft), the gothic CATHEDRALS (St Mary's / St Andrew's),
//    LUNA PARK (the smiling face entrance), QUEEN VICTORIA BUILDING (Romanesque
//    copper domes) — each a unique draw fn, never reused.
//  • HARBOUR SKYLINE towers — the curved-glass CBD/Barangaroo stock (Aurora
//    Place, Grosvenor Place, Deutsche Bank, the Seidler residential slabs…),
//    parameterised glass-tower draws so each placed tower reads tall + slim.
//  • HERITAGE SANDSTONE civic stock — the warm Sydney sandstone of the GPO,
//    Government House, the Observatory, the Barracks, the Mint, the museums.
//
// SCOPE: this file only. The registry (registry.ts) is already wired to import
// CITY_HEROES; the atlas/fingerprint/placement/renderer all read it.

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

// --- shared Sydney palette ----------------------------------------------------
// Sandstone is the heritage stock; the harbour blue + steel for the bridge;
// the Opera sails are warm-white shells; copper-green crowns the QVB.
const SAND = hex('#e6d3a8'); // warm Sydney "yellowblock" sandstone
const SAND_D = hex('#c9b486');
const SHELL = hex('#eef1f4'); // the Opera House sail concrete (cool warm-white)
const SHELL_D = hex('#cdd6df'); // the shaded underside of a sail
const STEELB = hex('#5b6b86'); // the Harbour Bridge weathered steel grey-blue
const STEELB_L = hex('#7d8ea8');
const GRANITE = hex('#b9a98f'); // the bridge pylon granite
const COPPER = hex('#5fa389'); // verdigris copper dome (QVB / GPO turret)
const COPPER_HOT = hex('#74b89c');
const ROOFSL = hex('#3f4856'); // dark slate / lead roof (reads near-black at dusk)
const GLASSB = hex('#3a6fae'); // a saturated Sydney-blue tower glass
const GLASSB_L = hex('#5b8fce');
const BRONZE = hex('#8a7d5c'); // bronze-tinted office glass (Grosvenor Place)
const GILT = hex('#cda64a'); // Sydney Tower's gold turret
const GILT_HOT = hex('#e8c25a');
const BRICKR = hex('#b5654a'); // the convict-brick (Hyde Park Barracks)
const HARBOUR = hex('#3f6fb0'); // the rich harbour water under the bridge/quay

/** Pull a colour toward neutral grey (used for the Opera House granite podium
 *  so it reads as stone, not sandy beach). */
function mixGrey(c: RGBA): RGBA {
  const g = hex('#9a948c');
  return [(c[0] + g[0] * 2) / 3, (c[1] + g[1] * 2) / 3, (c[2] + g[2] * 2) / 3, 1];
}

// =====================================================================
// SMALL SHARED PRIMITIVES (new — not reused from other cities)
// =====================================================================

/** A square-shaft tower with a flat or stepped parapet — the workhorse for
 *  the harbour-skyline glass towers. Returns the crown centre + top Y.
 *  `taper` shrinks the top; `slab` makes a thin-edged residential slab. */
function towerShaft(
  iso: Iso,
  cu: number,
  cv: number,
  halfU: number,
  halfV: number,
  z0: number,
  z1: number,
  body: RGBA,
  opts: { taper?: number; litGlass?: boolean } = {},
): void {
  const taper = opts.taper ?? 0;
  const tHU = halfU * (1 - taper);
  const tHV = halfV * (1 - taper);
  // a single trapezoidal prism approximated as a box (taper applied to top
  // face only via a thin cap) — keeps the silhouette slim + tall
  iso.box(cu - halfU, cv - halfV, cu + halfU, cv + halfV, z0, z1, body);
  if (taper > 0.001) {
    iso.box(cu - tHU, cv - tHV, cu + tHU, cv + tHV, z1, z1 + 6, lighten(body, 0.05), { ink: false });
  }
  // a glazing grid hint on the two visible faces (faint floor lines)
  const glass = opts.litGlass ? alpha(COLORS.glassLit, 0.16) : alpha(COLORS.white, 0.1);
  for (let z = z0 + 10; z < z1 - 6; z += 12) {
    iso.r.line(iso.P(cu - halfU, cv + halfV, z), iso.P(cu + halfU, cv + halfV, z), 0.5 * RES, glass);
    iso.r.line(iso.P(cu + halfU, cv - halfV, z), iso.P(cu + halfU, cv + halfV, z), 0.5 * RES, glass);
  }
}

/** A classical colonnade across a face at fixed v, zBase..zTop. */
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

/** A copper saucer/onion dome at a screen point on a square drum; returns the
 *  finial tip. `bulb` gives the QVB's flatter copper cap. */
function copperDome(
  iso: Iso,
  cx: number,
  cy: number,
  baseZ: number,
  rPx: number,
  rise: number,
  body: RGBA,
): { tipX: number; tipY: number } {
  const [dx, dyB] = iso.P(cx, cy, baseZ);
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push([dx + Math.cos(a) * rPx * s, dyB - Math.sin(a) ** 0.82 * rise * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), shaded(body, 0.06), lit(body, 0.08));
  iso.r.poly(ring(0.58).map(([x, y]): Pt => [x + rPx * 0.16, y - rise * 0.14]), lit(body, 0.16));
  for (let k = -2; k <= 2; k++) {
    iso.r.line([dx + (k / 2) * rPx, dyB], [dx + (k / 2) * rPx * 0.14, dyB - rise], 0.6 * RES, alpha(darken(body, 0.2), 0.6));
  }
  iso.r.polyline(ring(1), INK_W * 0.85, INK);
  return { tipX: dx, tipY: dyB - rise };
}

// =====================================================================
// SYDNEY OPERA HOUSE — the signature: the cluster of gleaming white sail
// SHELLS rising from a broad granite podium on its harbour point, two ranks
// of diminishing shells over the two halls + the small restaurant shell.
// Bespoke night light = coloured sail projections (rimCycle). 5×5.
// =====================================================================
function operaHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 280 });
  void seed;
  // the building sits on a point jutting into rich blue water
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  // the PODIUM is a tighter pedestal under the shells (not the whole tile) so
  // the sails dominate; pink-grey granite (greyer than sand so it doesn't read
  // as beach), with the monumental harbour steps on the front-right.
  const PG = mixGrey(GRANITE); // grey-tinted granite
  const u0 = 1.0, u1 = 4.4, v0 = 1.1, v1 = 4.4;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 24, PG, { topC: top(PG, 0.16) });
  // the great granite steps cascading down the harbour front (v1)
  for (let i = 0; i < 4; i++) {
    iso.box(u0 - 0.04 - i * 0.12, v1 + i * 0.16, u1 + 0.04, v1 + 0.16 + i * 0.16, 0, 18 - i * 5, shaded(PG, 0.06 + i * 0.03), { ink: false });
  }
  // the glass foyer walls under the shells, glowing
  iso.r.poly(
    [iso.P(u0 + 0.2, v1, 6), iso.P(u1 - 0.2, v1, 6), iso.P(u1 - 0.2, v1, 22), iso.P(u0 + 0.2, v1, 22)],
    alpha(COLORS.glassDark, 0.82),
  );

  // ---- the SAIL SHELLS: each a pair of leaning ribbed arcs meeting at a
  // ridge, drawn as a tall pointed sail. A shell rib runs from a base point
  // up to a high tip and back down to a second base point — the spherical
  // segments of the real roof. We draw two ranks (the two main halls) plus a
  // small shell, each rank a row of three diminishing sails leaning back. ----
  const shell = (
    bu: number, // base u (the open mouth faces +v, toward the harbour/viewer)
    bv: number,
    spanU: number, // half-width of the shell mouth across u
    h: number, // tip height
    lean: number, // how far the tip leans back (−v)
  ): void => {
    const tipV = bv - lean;
    const [lx, ly] = iso.P(bu - spanU, bv, 24);
    const [rx, ry] = iso.P(bu + spanU, bv, 24);
    const [tx, ty] = iso.P(bu, tipV, 24 + h);
    // the sail face (sun-lit warm white), a smooth curved gore from each base
    // corner up to the tip
    const gore = (sx: number, sy: number, bulge: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        // quadratic toward the tip, bowed outward by `bulge`
        const mx = sx + (tx - sx) * t + Math.sin(t * Math.PI) * bulge;
        const my = sy + (ty - sy) * t;
        pts.push([mx, my]);
      }
      return pts;
    };
    const left = gore(lx, ly, -3.2 * RES);
    const right = gore(rx, ry, 3.2 * RES);
    // outer (lit) face
    iso.r.poly([...left, ...right.slice().reverse()], SHELL, SHELL_D);
    // the shaded inner concave face peeking on the left edge
    iso.r.poly([[lx, ly], ...gore(lx + (tx - lx) * 0.06, ly, -1.2 * RES), [tx, ty]], SHELL_D);
    // ribbed seams up the shell (the chevron tile ribs)
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const a: Pt = [lx + (tx - lx) * t - Math.sin(t * Math.PI) * 1.6 * RES, ly + (ty - ly) * t];
      const b: Pt = [rx + (tx - rx) * t + Math.sin(t * Math.PI) * 1.6 * RES, ry + (ty - ry) * t];
      iso.r.line(a, b, 0.5 * RES, alpha(SHELL_D, 0.7));
    }
    // crisp ink ridge + mouth contour
    iso.r.polyline([[lx, ly], [tx, ty], [rx, ry]], INK_W * 0.9, INK);
    iso.r.line([lx, ly], [rx, ry], INK_W * 0.7, alpha(INK, 0.6));
  };

  // RANK A — the eastern (Concert Hall) sails: three BIG shells, tips leaning
  // back, diminishing toward the point. Sized large so they fill the podium
  // and read unmistakably as the white shells from any zoom.
  shell(3.5, 3.7, 0.92, 198, 2.0);
  shell(3.2, 2.6, 0.82, 162, 1.7);
  shell(2.95, 1.7, 0.66, 122, 1.4);
  // RANK B — the western (Opera Theatre) sails: a parallel slightly-smaller row
  // set toward the other side so the two interleaved clusters read side-by-side.
  shell(2.2, 3.8, 0.78, 168, 1.8);
  shell(2.0, 2.7, 0.66, 134, 1.5);
  shell(1.8, 1.8, 0.5, 98, 1.2);
  // the little Bennelong (restaurant) shell down at the harbour tip
  shell(2.7, 4.15, 0.46, 72, 1.0);
  // a warm gleam catching the tallest eastern sail ridge at dusk
  iso.gleam(iso.P(3.5, 1.7, 222), iso.P(3.5, 3.6, 30), 1.4 * RES);
  return iso.build();
}

// =====================================================================
// SYDNEY HARBOUR BRIDGE — "the Coathanger": the single great through-arch of
// steel trusses springing between two pairs of granite-faced PYLONS, the deck
// slung beneath on vertical hangers, the roadway crossing the rich blue
// harbour. A hero bridge. 5×5 (the arch spans the whole square diagonally
// across v; the pylons anchor each end). Towers in headroom.
// =====================================================================
function harbourBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 260 });
  void seed;
  // the harbour fills the footprint; the bridge crosses along v (low v = north
  // shore, high v = the city). Centre the structure on u≈2.5.
  iso.floor(shaded(HARBOUR, 0.06), lit(HARBOUR, 0.05));
  // a few warm glints on the water
  for (const [gu, gv] of [[1.4, 1.2], [3.6, 4.0], [3.9, 1.9], [1.1, 3.4]] as const) {
    iso.r.line(iso.P(gu, gv, 0), iso.P(gu + 0.5, gv, 0), 1.4 * RES, alpha(COLORS.waterGlint, 0.5));
  }
  const cu = 2.5; // the bridge runs up the centre line in u
  const halfRoad = 0.5; // the carriageway half-width
  const vN = 0.7; // north abutment
  const vS = 4.3; // south (city) abutment
  const deckZ = 30; // the high deck over the shipping channel

  // ---- the two PYLON pairs (granite towers at each end of the arch) ----
  const pylonPair = (vp: number): void => {
    for (const du of [cu - halfRoad - 0.2, cu + halfRoad + 0.2] as const) {
      iso.box(du - 0.24, vp - 0.24, du + 0.24, vp + 0.24, 0, 104, GRANITE);
      // a darker recessed top stage + flat cap (the pylons' distinctive crown)
      iso.box(du - 0.2, vp - 0.2, du + 0.2, vp + 0.2, 104, 118, shaded(GRANITE, 0.06), { ink: false });
      iso.box(du - 0.26, vp - 0.26, du + 0.26, vp + 0.26, 118, 123, lighten(GRANITE, 0.1), { ink: false });
      // vertical pier shading lines
      iso.r.line(iso.P(du, vp + 0.24, 6), iso.P(du, vp + 0.24, 116), 0.6 * RES, alpha(shaded(GRANITE, 0.2), 0.6));
    }
  };
  pylonPair(vN);
  pylonPair(vS);

  // ---- the great ARCH: an upper + lower chord of steel sweeping between the
  // springing points just inside the pylons, with vertical web posts. Drawn on
  // both sides of the carriageway. ----
  const springV0 = vN + 0.05;
  const springV1 = vS - 0.05;
  const archTopZ = 216; // crown of the arch (well above the deck) — towers
  // parabola helpers (the arch crown sits at the mid-span)
  const arcZ = (t: number, lift: number): number => 18 + (lift - 18) * 4 * t * (1 - t);
  const upperLift = archTopZ;
  const lowerLift = archTopZ - 52; // the lower chord — a DEEP truss for the bold "coathanger"
  const drawArchSide = (du: number, frontFace: boolean): void => {
    const col = frontFace ? lit(STEELB, 0.06) : shaded(STEELB, 0.06);
    const N = 28;
    const upper: Pt[] = [];
    const lower: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const v = springV0 + (springV1 - springV0) * t;
      upper.push(iso.P(du, v, arcZ(t, upperLift)));
      lower.push(iso.P(du, v, arcZ(t, lowerLift)));
    }
    // the truss web between the chords (filled steel band)
    iso.r.poly([...upper, ...lower.slice().reverse()], alpha(col, 0.95));
    // BOLD chord lines (a thick upper + lower steel chord — the unmistakable arc)
    iso.r.polyline(upper, INK_W * 1.5, INK);
    iso.r.polyline(upper.map(([x, y]): Pt => [x, y + 1.6 * RES]), 1.4 * RES, STEELB_L); // chord depth highlight
    iso.r.polyline(lower, INK_W * 1.2, alpha(INK, 0.85));
    // vertical + diagonal web posts (the lattice read)
    for (let i = 0; i <= N; i += 2) {
      const t = i / N;
      const v = springV0 + (springV1 - springV0) * t;
      iso.r.line(iso.P(du, v, arcZ(t, upperLift)), iso.P(du, v, arcZ(t, lowerLift)), 0.7 * RES, alpha(STEELB_L, 0.8));
    }
    for (let i = 0; i < N; i += 2) {
      const t0 = i / N, t1 = (i + 2) / N;
      const v0 = springV0 + (springV1 - springV0) * t0;
      const v1 = springV0 + (springV1 - springV0) * t1;
      iso.r.line(iso.P(du, v0, arcZ(t0, lowerLift)), iso.P(du, v1, arcZ(t1, upperLift)), 0.5 * RES, alpha(STEELB_L, 0.6));
    }
  };
  // back side first (so it tucks behind), then the deck, then the front
  drawArchSide(cu - halfRoad, false);

  // ---- the DECK: the roadway ribbon slung under the arch crown, on hangers ----
  // hangers drop from the lower chord to the deck
  const hangerSide = (du: number): void => {
    for (let i = 2; i < 24; i += 2) {
      const t = i / 26;
      const v = springV0 + (springV1 - springV0) * t;
      const zTop = arcZ(t, lowerLift);
      if (zTop > deckZ + 6) iso.r.line(iso.P(du, v, zTop), iso.P(du, v, deckZ + 3), 0.45 * RES, alpha(STEELB_L, 0.75));
    }
  };
  hangerSide(cu - halfRoad);
  hangerSide(cu + halfRoad);
  // the deck slab
  iso.box(cu - halfRoad, vN - 0.05, cu + halfRoad, vS + 0.05, deckZ - 4, deckZ, shaded(STEELB, 0.1), { ink: false });
  iso.quad(cu - halfRoad, vN - 0.05, cu + halfRoad, vS + 0.05, deckZ, COLORS.road);
  // lane markings down the deck
  for (const lu of [cu - 0.22, cu, cu + 0.22]) {
    iso.r.line(iso.P(lu, vN, deckZ + 0.5), iso.P(lu, vS, deckZ + 0.5), 0.5 * RES, alpha(COLORS.marking, 0.7));
  }
  // deck balustrades
  for (const du of [cu - halfRoad, cu + halfRoad] as const) {
    iso.r.line(iso.P(du, vN, deckZ + 3), iso.P(du, vS, deckZ + 3), INK_W * 0.55, INK);
  }
  // approach spans beyond the pylons, stepping down to the shores
  iso.box(cu - halfRoad, vS + 0.05, cu + halfRoad, vS + 0.5, deckZ - 6, deckZ - 1, shaded(STEELB, 0.12), { ink: false });
  iso.box(cu - halfRoad, vN - 0.5, cu + halfRoad, vN - 0.05, deckZ - 6, deckZ - 1, shaded(STEELB, 0.12), { ink: false });

  // the FRONT arch chord (drawn last so it reads in front of the deck)
  drawArchSide(cu + halfRoad, true);
  // a warm gleam on the front arch crown
  const crown = iso.P(cu + halfRoad, (springV0 + springV1) / 2, archTopZ);
  iso.gleam([crown[0] - 10 * RES, crown[1] + 3 * RES], [crown[0] + 10 * RES, crown[1] + 3 * RES], 1.2 * RES);
  return iso.build();
}

// =====================================================================
// SYDNEY TOWER (Sydney Tower Eye) — the golden TURRET (a ringed observation/
// restaurant pod) carried on a tall slim shaft braced by cables, the tallest
// thing on the skyline. Bespoke light = aerial-gallery beacon. 1×1, huge
// headroom — it spikes far above the CBD.
// =====================================================================
function sydneyTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 420 });
  void seed;
  const u = 0.5, v = 0.52;
  const shaftH = 250; // the golden shaft
  const turretZ = shaftH; // the turret base
  iso.shadow(u - 0.12, v - 0.06, u + 0.12, v + 0.14, 0.4, 0.26);
  // a small plaza/podium base
  iso.box(u - 0.26, v - 0.26, u + 0.26, v + 0.26, 0, 16, shaded(SAND, 0.06), { ink: false });
  // the slim octagonal shaft (drawn as a narrow box with bracing cables)
  const sb = 0.06;
  iso.box(u - sb, v - sb, u + sb, v + sb, 16, shaftH, lit(GILT, 0.04), {
    leftC: shaded(GILT, 0.12),
    rightC: lit(GILT, 0.1),
    topC: top(GILT, 0.2),
  });
  // the bundle of guy cables flaring out to the base corners
  const [bx, byTop] = iso.P(u, v, shaftH - 20);
  for (const [du, dv] of [[-0.24, 0.24], [0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]] as const) {
    iso.r.line([bx, byTop], iso.P(u + du, v + dv, 18), 0.5 * RES, alpha(STEELB_L, 0.55));
  }
  // ---- the golden TURRET: a stack of rings (the restaurant + observation
  // decks + the gold "bucket"), widest in the middle ----
  const [tx, tyB] = iso.P(u, v, turretZ);
  const ringR = 13 * RES;
  const turretLevels: ReadonlyArray<readonly [number, number, RGBA]> = [
    [0, 1.0, GILT],
    [8, 1.05, GILT_HOT],
    [16, 0.92, GILT],
    [24, 0.62, lighten(GILT, 0.1)],
  ];
  for (const [dz, s, col] of turretLevels) {
    const y = tyB - dz * RES;
    const r = ringR * s;
    iso.r.poly(
      [[tx - r, y], [tx + r, y], [tx + r, y - 7 * RES], [tx - r, y - 7 * RES]],
      col,
      shaded(col, 0.1),
    );
    iso.r.polyline([[tx - r, y - 7 * RES], [tx - r, y], [tx + r, y], [tx + r, y - 7 * RES]], INK_W * 0.6, INK);
    // lit window band
    iso.r.line([tx - r * 0.9, y - 3.5 * RES], [tx + r * 0.9, y - 3.5 * RES], 1.1 * RES, alpha(COLORS.glassLit, 0.7));
  }
  // the spire/antenna above the turret with the warning beacon
  const top0 = tyB - 30 * RES;
  iso.r.line([tx, top0], [tx, top0 - 70 * RES], 1.4 * RES, STEELB_L);
  iso.r.line([tx, top0 - 70 * RES], [tx, top0 - 96 * RES], 0.8 * RES, STEELB_L);
  iso.glint([tx, tyB - 8 * RES], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// ST MARY'S CATHEDRAL — Sydney's great Gothic-Revival sandstone cathedral:
// a long nave with a steep roof, the twin southern SPIRES over the front, a
// big rose / wheel window, pinnacled buttresses. 3×3, towers in headroom.
// (St Andrew's reuses a shorter twin-tower variant.)
// =====================================================================
function gothicCathedralTile(seed: number, tall: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: tall ? 240 : 150 });
  void seed;
  const ST = SAND;
  const ROOF = ROOFSL;
  const GLASS = alpha(hex('#243a52'), 0.9);
  const u0 = 0.5, u1 = 2.5, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // side aisles flanking the nave
  iso.box(u0, v0 + 0.1, u0 + 0.4, v1, 0, 40, ST);
  iso.box(u1 - 0.4, v0 + 0.1, u1, v1, 0, 40, ST);
  iso.quad(u0, v0 + 0.1, u0 + 0.4, v1, 40, shaded(ROOF, 0.04));
  iso.quad(u1 - 0.4, v0 + 0.1, u1, v1, 40, lit(ROOF, 0.04));
  // a stone string-course banding the aisle wall
  iso.r.line(iso.P(u0, v1, 30), iso.P(u1, v1, 30), 1 * RES, SAND_D);
  // tall pointed lancet windows down the visible aisle wall
  for (let i = 0; i < 7; i++) {
    const u = u0 + 0.06 + i * 0.27;
    iso.r.poly(
      [iso.P(u, v1, 10), iso.P(u + 0.1, v1, 10), iso.P(u + 0.1, v1, 28), iso.P(u + 0.05, v1, 34), iso.P(u, v1, 28)],
      GLASS,
    );
  }
  // the nave + steep gable roof (ridge front-to-back along v)
  const navH = tall ? 80 : 64;
  iso.box(u0 + 0.4, v0, u1 - 0.4, v1, 0, navH, ST);
  iso.gable(u0 + 0.4, v0, u1 - 0.4, v1, navH, tall ? 34 : 26, 'v', ROOF, ST);
  // a square crossing/lantern tower with a small spirelet (St Mary's has a
  // tower over the crossing besides the front spires)
  if (tall) {
    // a LOW square lantern over the crossing — kept well below the front
    // spires so the twin-spire silhouette dominates (St Mary's signature)
    const cu = (u0 + u1) / 2, cv = v0 + (v1 - v0) * 0.42;
    iso.box(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, navH, navH + 26, ST);
    iso.hip(cu - 0.22, cv - 0.22, cu + 0.22, cv + 0.22, navH + 26, 14, ROOF);
  }
  // the twin front SPIRES (the southern spires) at high v — the TALLEST,
  // dominant masses (drawn wide + tall so they read as the cathedral)
  const spireZ = tall ? 210 : 120;
  const towerZ = tall ? 132 : 92;
  for (const tu of [u0 + 0.42, u1 - 0.42] as const) {
    iso.box(tu - 0.24, v1 - 0.26, tu + 0.24, v1, 0, towerZ, ST);
    // stacked belfry openings on the front face
    for (const [zb, zt, zp] of (tall ? [[64, 94, 104], [108, 128, 138]] : [[52, 76, 84]]) as ReadonlyArray<readonly [number, number, number]>) {
      iso.r.poly(
        [iso.P(tu - 0.12, v1, zb), iso.P(tu + 0.12, v1, zb), iso.P(tu + 0.12, v1, zt), iso.P(tu, v1, zp), iso.P(tu - 0.12, v1, zt)],
        GLASS,
      );
    }
    // the octagonal stone spire (pointed, with corner pinnacles)
    const apex = iso.P(tu, v1 - 0.13, spireZ);
    const c0 = iso.P(tu - 0.24, v1, towerZ);
    const c1 = iso.P(tu + 0.24, v1, towerZ);
    const c2 = iso.P(tu + 0.24, v1 - 0.26, towerZ);
    iso.r.poly([c0, c1, apex], shaded(ROOF, 0.1));
    iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
    // corner pinnacles
    for (const [pu, pv] of [[tu - 0.24, v1], [tu + 0.24, v1]] as const) {
      const pb = iso.P(pu, pv, towerZ);
      iso.r.poly([[pb[0] - 2 * RES, pb[1]], [pb[0] + 2 * RES, pb[1]], [pb[0], pb[1] - 12 * RES]], lit(ST, 0.08));
    }
  }
  // the great rose / wheel window in the front gable, between the towers
  const [rx, ry] = iso.P((u0 + u1) / 2, v1, tall ? 70 : 58);
  const RR = 10 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.94]);
  }
  iso.r.poly(rose, GLASS);
  iso.r.polyline(rose, INK_W * 0.7, INK, true);
  iso.r.line([rx - RR, ry], [rx + RR, ry], 1 * RES, alpha(COLORS.white, 0.5));
  iso.r.line([rx, ry - RR * 0.94], [rx, ry + RR * 0.94], 1 * RES, alpha(COLORS.white, 0.5));
  return iso.build();
}

// =====================================================================
// QUEEN VICTORIA BUILDING — the Romanesque-Revival grand market block: a long
// arcaded sandstone palazzo filling its city block, crowned by the great
// central COPPER DOME and a row of smaller corner copper cupolas, arched
// windows along the flanks. 5×5 (drawn long + low, the dome towering).
// =====================================================================
function qvbTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.4, u1 = 4.6, v0 = 1.2, v1 = 3.8; // a LONG narrow block
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long three-storey sandstone palazzo body
  iso.box(u0, v0, u1, v1, 0, 46, SAND);
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 11, shaded(SAND, 0.1), { ink: false });
  // ranks of round-headed arched windows down the long visible flank (v1)
  for (let row = 0; row < 2; row++) {
    const zb = 16 + row * 16;
    for (let i = 0; i < 12; i++) {
      const u = u0 + 0.2 + i * 0.36;
      const poly: Pt[] = [iso.P(u, v1, zb), iso.P(u, v1, zb + 9)];
      for (let j = 0; j <= 5; j++) {
        const t = j / 5;
        poly.push(iso.P(u + 0.16 * t, v1, zb + 9 + Math.sin(t * Math.PI) * 4));
      }
      poly.push(iso.P(u + 0.16, v1, zb + 9), iso.P(u + 0.16, v1, zb));
      iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
    }
  }
  // cornice + balustraded parapet
  iso.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, 46, 52, lighten(SAND, 0.08), { topC: top(SAND, 0.3) });

  // the great central COPPER DOME on a drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.42, cy - 0.42, cx + 0.42, cy + 0.42, 52, 70, lighten(SAND, 0.04)); // square drum
  iso.box(cx - 0.36, cy - 0.36, cx + 0.36, cy + 0.36, 70, 78, COPPER, { ink: false }); // copper drum ring
  const { tipX, tipY } = copperDome(iso, cx, cy, 78, 0.42 * (CELL_W / 2), 56 * RES, COPPER);
  // lantern + finial on the dome
  iso.r.rect(tipX - 2.6 * RES, tipY - 9 * RES, tipX + 2.6 * RES, tipY + 1 * RES, COPPER_HOT);
  iso.r.line([tipX, tipY - 9 * RES], [tipX, tipY - 18 * RES], 1.2 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 4 * RES], 2 * RES);
  // the ring of smaller copper cupolas along the roofline
  for (const cu of [u0 + 0.5, u0 + 1.5, u1 - 1.5, u1 - 0.5] as const) {
    copperDome(iso, cu, cy, 52, 0.16 * (CELL_W / 2), 22 * RES, COPPER);
  }
  return iso.build();
}

// =====================================================================
// LUNA PARK — the famous harbourside funfair entrance: the enormous smiling
// FACE arch flanked by two slim Art-Deco towers, the open mouth the gateway,
// behind it the Ferris wheel hint. Colourful, festive. 3×3.
// =====================================================================
function lunaParkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const FACE = hex('#f3e7d0'); // the cream face
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // a low entry forecourt
  iso.box(u0, v0, u1, v1, 0, 6, shaded(SAND, 0.08), { ink: false });
  // the big Ferris wheel behind (a glowing ring on the harbour side)
  const [wx, wy] = iso.P((u0 + u1) / 2, v0 + 0.3, 70);
  const WR = 26 * RES;
  const wheel: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    wheel.push([wx + Math.cos(a) * WR, wy - 6 * RES + Math.sin(a) * WR]);
  }
  iso.r.polyline(wheel, 1.4 * RES, STEELB_L, true);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    iso.r.line([wx, wy - 6 * RES], [wx + Math.cos(a) * WR, wy - 6 * RES + Math.sin(a) * WR], 0.5 * RES, alpha(STEELB_L, 0.6));
  }
  // ---- the giant smiling FACE: a big disc on the v1 face with the arched
  // mouth (the entrance) cut into it ----
  const fc = iso.P((u0 + u1) / 2, v1, 36);
  const FR = 30 * RES;
  const faceRing: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    faceRing.push([fc[0] + Math.cos(a) * FR, fc[1] - FR + Math.sin(a) * FR]);
  }
  iso.r.poly(faceRing, FACE, shaded(FACE, 0.08));
  iso.r.polyline(faceRing, INK_W * 0.8, INK, true);
  // the two eyes
  for (const ex of [-1, 1] as const) {
    iso.r.line([fc[0] + ex * 11 * RES, fc[1] - FR - 5 * RES], [fc[0] + ex * 11 * RES, fc[1] - FR - 11 * RES], 2 * RES, INK);
  }
  // the big smiling mouth = the arched entrance (a dark arch under the nose)
  const mouth: Pt[] = [[fc[0] - 13 * RES, fc[1]]];
  for (let j = 0; j <= 10; j++) {
    const t = j / 10;
    mouth.push([fc[0] - 13 * RES + 26 * RES * t, fc[1] - Math.sin(t * Math.PI) * 14 * RES]);
  }
  iso.r.poly([...mouth, [fc[0] + 13 * RES, fc[1]]], alpha(hex('#2a1c30'), 0.92));
  // teeth (a row of bright pillars in the mouth)
  for (let i = 0; i < 7; i++) {
    const tx = fc[0] - 11 * RES + i * 3.6 * RES;
    iso.r.line([tx, fc[1] - 1 * RES], [tx, fc[1] - 8 * RES], 1.2 * RES, alpha(COLORS.white, 0.85));
  }
  // the two slim Art-Deco entry towers flanking the face
  for (const tu of [u0 + 0.2, u1 - 0.2] as const) {
    iso.box(tu - 0.12, v1 - 0.16, tu + 0.12, v1, 0, 96, COLORS.white);
    iso.box(tu - 0.08, v1 - 0.12, tu + 0.08, v1, 96, 112, lighten(COLORS.orange, 0.1), { ink: false });
    const ft = iso.P(tu, v1 - 0.08, 112);
    iso.r.line(ft, [ft[0], ft[1] - 12 * RES], 1.4 * RES, COLORS.glassLit);
    // candy banding
    for (let z = 14; z < 92; z += 14) {
      iso.r.line(iso.P(tu - 0.12, v1, z), iso.P(tu + 0.12, v1, z), 1 * RES, alpha(COLORS.orange, 0.5));
    }
  }
  return iso.build();
}

// =====================================================================
// NEOCLASSICAL CIVIC (sandstone) — a parameterised draw for Sydney's heritage
// stone stock: a sandstone block with a giant portico/colonnade + pediment,
// rusticated base, balustraded parapet. `tower` adds a clock/bell tower (Town
// Hall, GPO); `dome` adds a low dome. Serves the Australian Museum, Town Hall,
// GPO, the Mint, etc. Size varies by entry via `n` tiles.
// =====================================================================
function neoclassicalTile(seed: number, n: number, opts: { tower?: boolean; clockTower?: boolean }): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(n, n, { swAnchor: true, headroom: opts.tower || opts.clockTower ? 180 : 90 });
  void seed;
  const m = n / 3; // scale factor vs the 3-tile reference
  const u0 = 0.4, u1 = n - 0.4, v0 = 0.42, v1 = n - 0.42;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const bodyH = 44 * m;
  iso.box(u0, v0, u1, v1, 0, bodyH, SAND);
  // rusticated base
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12 * m, shaded(SAND, 0.12), { ink: false });
  // windows down the flank
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16 * m, bodyH - 6, Math.round(n * 3), alpha(COLORS.glassDark, 0.82), COLORS.white);
  // the giant portico colonnade across the front (v1) under a pediment
  colonnade(iso, v1, u0 + 0.16, u1 - 0.16, 12 * m, bodyH - 4, Math.round(n * 3), COLORS.white);
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, bodyH, bodyH + 6, lighten(SAND, 0.08), { topC: top(SAND, 0.3) }); // entablature
  pediment(iso, v1, u0 + 0.24, u1 - 0.24, bodyH + 6, 12 * m, SAND);
  // a flat lead roof behind
  iso.quad(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.5, bodyH + 6, shaded(ROOFSL, 0.05));

  if (opts.clockTower) {
    // a Victorian sandstone CLOCK tower rising over the front-centre (Town Hall
    // / GPO) — the dominant vertical, towering in headroom
    const cu = (u0 + u1) / 2, cv = v1 - 0.4 * m;
    const tw = 0.3 * m;
    iso.box(cu - tw, cv - tw, cu + tw, cv + tw, 0, bodyH + 70 * m, SAND);
    // stacked arched openings
    for (let row = 0; row < 3; row++) {
      const zb = bodyH + 10 + row * 18 * m;
      iso.r.poly([iso.P(cu - tw * 0.6, cv + tw, zb), iso.P(cu + tw * 0.6, cv + tw, zb), iso.P(cu + tw * 0.6, cv + tw, zb + 12 * m), iso.P(cu, cv + tw, zb + 16 * m), iso.P(cu - tw * 0.6, cv + tw, zb + 12 * m)], alpha(COLORS.glassDark, 0.85));
    }
    // the CLOCK face near the top
    const [clx, cly] = iso.P(cu, cv + tw, bodyH + 56 * m);
    const CR = 5 * RES * m;
    const ring: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ring.push([clx + Math.cos(a) * CR, cly - CR + Math.sin(a) * CR]);
    }
    iso.r.poly(ring, COLORS.white);
    iso.r.polyline(ring, INK_W * 0.7, INK, true);
    iso.r.line([clx, cly - CR], [clx, cly - CR - 2.6 * RES], 1 * RES, INK);
    iso.r.line([clx, cly - CR], [clx + 2 * RES, cly - CR], 1 * RES, INK);
    // a mansard cap + finial
    iso.hip(cu - tw - 0.02, cv - tw - 0.02, cu + tw + 0.02, cv + tw + 0.02, bodyH + 70 * m, 20 * m, ROOFSL);
    const ft = iso.P(cu, cv, bodyH + 70 * m + 24 * m);
    iso.r.line(ft, [ft[0], ft[1] - 6 * RES], 1.2 * RES, GILT_HOT);
  } else if (opts.tower) {
    // a low central dome (museum/library variant)
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
    iso.box(cx - 0.3 * m, cy - 0.3 * m, cx + 0.3 * m, cy + 0.3 * m, bodyH + 6, bodyH + 18, lighten(SAND, 0.04));
    copperDome(iso, cx, cy, bodyH + 18, 0.3 * m * (CELL_W / 2), 34 * RES * m, COPPER);
  }
  return iso.build();
}

// =====================================================================
// GOVERNMENT HOUSE — the Gothic-Revival vice-regal residence: a castellated
// sandstone mansion with a battlemented square TOWER, pinnacles, mullioned
// bays and a porte-cochère, in its harbourside gardens. 3×3.
// =====================================================================
function governmentHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.44, v1 = 2.56;
  // gardens around it
  iso.floor(shaded(COLORS.grass, 0.08), lit(COLORS.grass, 0.05));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(SAND, 0.12), { ink: false });
  // battlemented parapet (a notched crown)
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 46, 51, lighten(SAND, 0.06), { ink: false });
  for (let i = 0; i < 9; i++) {
    const u = u0 + 0.1 + i * 0.26;
    iso.box(u, v1 - 0.02, u + 0.12, v1 + 0.04, 51, 55, SAND, { ink: false });
  }
  // mullioned bay windows on the front
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 12, 38, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // steep slate roofs behind
  iso.gable(u0 + 0.2, v0, u1 - 0.2, v1 - 0.4, 46, 16, 'u', ROOFSL, SAND);
  // the dominant battlemented square TOWER (front-left)
  const tu = u0 + 0.5, tv = v1 - 0.4;
  iso.box(tu - 0.26, tv - 0.26, tu + 0.26, tv + 0.26, 0, 92, SAND);
  iso.box(tu - 0.3, tv - 0.3, tu + 0.3, tv + 0.3, 92, 98, lighten(SAND, 0.06), { ink: false });
  for (let i = 0; i < 4; i++) {
    const u = tu - 0.24 + i * 0.16;
    iso.box(u, tv + 0.26, u + 0.08, tv + 0.32, 98, 104, SAND, { ink: false });
  }
  // tall mullioned window up the tower front + corner pinnacles
  iso.r.poly([iso.P(tu - 0.12, tv + 0.26, 40), iso.P(tu + 0.12, tv + 0.26, 40), iso.P(tu + 0.12, tv + 0.26, 78), iso.P(tu - 0.12, tv + 0.26, 78)], alpha(COLORS.glassDark, 0.85));
  for (const [pu, pv] of [[tu - 0.26, tv + 0.26], [tu + 0.26, tv + 0.26], [tu - 0.26, tv - 0.26]] as const) {
    const pb = iso.P(pu, pv, 98);
    iso.r.poly([[pb[0] - 2.4 * RES, pb[1]], [pb[0] + 2.4 * RES, pb[1]], [pb[0], pb[1] - 14 * RES]], lit(SAND, 0.08));
  }
  return iso.build();
}

// =====================================================================
// SYDNEY OBSERVATORY — the Italianate sandstone observatory on its hill: a
// symmetrical villa with arched loggia, a square tower carrying the famous
// TIME-BALL mast + a small copper dome over the telescope. 2×2.
// =====================================================================
function observatoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.42, v1 = 1.58;
  iso.floor(shaded(COLORS.grass, 0.08), lit(COLORS.grass, 0.05));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the ochre-rendered villa body
  const OCH = hex('#d8a25c');
  iso.box(u0, v0, u1, v1, 0, 36, OCH);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(OCH, 0.12), { ink: false });
  // arched loggia along the front
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.12 + i * 0.24;
    const poly: Pt[] = [iso.P(u, v1, 8), iso.P(u, v1, 22)];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      poly.push(iso.P(u + 0.1 * t, v1, 22 + Math.sin(t * Math.PI) * 5));
    }
    poly.push(iso.P(u + 0.1, v1, 22), iso.P(u + 0.1, v1, 8));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.8));
  }
  iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 36, 12, hex('#9a5a3a')); // terracotta hip roof
  // the square TIME-BALL tower (front-right)
  const tu = u1 - 0.32, tv = v1 - 0.3;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 0, 70, OCH);
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.18, 70, 76, lighten(OCH, 0.06), { ink: false });
  // the mast + the red time-ball
  const mb = iso.P(tu, tv, 76);
  iso.r.line(mb, [mb[0], mb[1] - 30 * RES], 1 * RES, STEELB_L);
  iso.r.poly(
    (() => { const c: Pt[] = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.push([mb[0] + Math.cos(a) * 4 * RES, mb[1] - 20 * RES + Math.sin(a) * 4 * RES]); } return c; })(),
    hex('#c0392b'),
  );
  // a small copper telescope dome (front-left)
  copperDome(iso, u0 + 0.34, v1 - 0.34, 36, 0.18 * (CELL_W / 2), 18 * RES, COPPER);
  return iso.build();
}

// =====================================================================
// GEORGIAN BRICK — Hyde Park Barracks / The Mint: a restrained Georgian
// brick-and-sandstone block with a hipped roof, a pedimented centre and a
// small clock/cupola. Parameterised (brick vs render). 2×2.
// =====================================================================
function georgianTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const WALL = brick ? BRICKR : hex('#d9c8a4');
  const u0 = 0.42, u1 = 1.58, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, WALL);
  // sandstone quoins/base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, SAND_D, { ink: false });
  // three rows of small Georgian sash windows
  for (let row = 0; row < 3; row++) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 12 + row * 9, 12 + row * 9 + 6, 6, alpha(COLORS.glassDark, 0.8), SAND);
  }
  iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 14, ROOFSL);
  // a pedimented centre bay
  iso.box((u0 + u1) / 2 - 0.2, v1 - 0.06, (u0 + u1) / 2 + 0.2, v1, 0, 44, lighten(WALL, 0.04));
  pediment(iso, v1, (u0 + u1) / 2 - 0.22, (u0 + u1) / 2 + 0.22, 44, 8, SAND);
  // the little white clock cupola on the ridge (the Barracks' signature)
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  iso.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, 54, 66, COLORS.white);
  const [clx, cly] = iso.P(cu, cv + 0.1, 62);
  iso.r.poly((() => { const c: Pt[] = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.push([clx + Math.cos(a) * 2.6 * RES, cly + Math.sin(a) * 2.6 * RES]); } return c; })(), COLORS.white);
  iso.r.polyline((() => { const c: Pt[] = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.push([clx + Math.cos(a) * 2.6 * RES, cly + Math.sin(a) * 2.6 * RES]); } return c; })(), INK_W * 0.5, INK, true);
  iso.hip(cu - 0.11, cv - 0.11, cu + 0.11, cv + 0.11, 66, 8, COPPER);
  return iso.build();
}

// =====================================================================
// HARBOUR GLASS TOWER — the workhorse for the CBD/Barangaroo skyline. A tall
// slim glass tower; variants set the crown + colour:
//   'sail'    curved glass sail crown (Aurora Place / Renzo Piano)
//   'bronze'  curved bronze tower (Grosvenor Place)
//   'crystal' faceted crystalline crown (Deutsche Bank Plaza / Chifley)
//   'blades'  open roof "crown" of blades on columns (Governor Phillip Tower)
//   'slab'    a thin residential slab (Blues Point Tower / Seidler)
//   'wave'    curved/scalloped balcony tower (Horizon)
// 2×2, big headroom. Each towers far over the fabric.
// =====================================================================
type TowerKind = 'sail' | 'bronze' | 'crystal' | 'blades' | 'slab' | 'wave' | 'plain';
function harbourTowerTile(seed: number, kind: TowerKind, hz: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  const cu = 1.0, cv = 1.02;
  const body =
    kind === 'bronze' ? BRONZE :
    kind === 'slab' || kind === 'wave' ? hex('#cdbfa0') : // pale concrete residential
    GLASSB;
  const litG = kind === 'sail' || kind === 'crystal' || kind === 'plain';
  iso.shadow(cu - 0.34, cv - 0.2, cu + 0.34, cv + 0.34, 0.4, 0.26);
  // small podium
  iso.box(cu - 0.4, cv - 0.4, cu + 0.4, cv + 0.4, 0, 18, shaded(SAND, 0.06), { ink: false });

  if (kind === 'slab') {
    // a thin slab: wide on one axis, narrow on the other (Blues Point Tower)
    towerShaft(iso, cu, cv, 0.36, 0.13, 18, hz, body, { litGlass: true });
    // exposed balcony floor slabs (the brutalist read)
    for (let z = 30; z < hz - 8; z += 11) {
      iso.r.line(iso.P(cu - 0.36, cv + 0.13, z), iso.P(cu + 0.36, cv + 0.13, z), 1 * RES, alpha(shaded(body, 0.18), 0.7));
    }
    iso.box(cu - 0.34, cv - 0.11, cu + 0.34, cv + 0.11, hz, hz + 6, shaded(body, 0.1), { ink: false });
    return iso.build();
  }
  if (kind === 'wave') {
    // Horizon: stacked curved balcony bands bowing out
    towerShaft(iso, cu, cv, 0.24, 0.24, 18, hz, body);
    for (let z = 26; z < hz - 6; z += 9) {
      const [lx, ly] = iso.P(cu - 0.24, cv + 0.24, z);
      const [rx, ry] = iso.P(cu + 0.24, cv + 0.24, z);
      const mid: Pt = [(lx + rx) / 2, (ly + ry) / 2 + 3 * RES];
      iso.r.polyline([[lx, ly], mid, [rx, ry]], 1.1 * RES, alpha(COLORS.white, 0.7));
    }
    // a slim mast
    const tp = iso.P(cu, cv, hz);
    iso.r.line(tp, [tp[0], tp[1] - 16 * RES], 1 * RES, STEELB_L);
    return iso.build();
  }

  // the standard tapering glass shaft
  const taper = kind === 'sail' || kind === 'crystal' ? 0.18 : 0.08;
  towerShaft(iso, cu, cv, 0.26, 0.26, 18, hz, body, { taper, litGlass: litG });

  if (kind === 'sail') {
    // a curved glass "sail" sweeping up past the roof on one edge (Aurora Place)
    const [bx, byB] = iso.P(cu - 0.26, cv + 0.26, hz - 40);
    const tip = iso.P(cu - 0.26, cv - 0.26, hz + 70);
    const curve: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      curve.push([bx + (tip[0] - bx) * t + Math.sin(t * Math.PI) * 5 * RES, byB + (tip[1] - byB) * t]);
    }
    iso.r.poly([[bx, byB], ...curve], alpha(GLASSB_L, 0.85), alpha(GLASSB, 0.85));
    iso.r.polyline([[bx, byB], ...curve], INK_W * 0.6, INK);
  } else if (kind === 'crystal') {
    // a faceted crystalline crown of glass prisms
    const cz = hz;
    for (const [du, dv, h] of [[-0.16, -0.16, 40], [0.16, 0.1, 30], [0.0, 0.16, 24]] as const) {
      const base = iso.P(cu + du, cv + dv, cz);
      iso.r.poly([[base[0] - 4 * RES, base[1]], [base[0] + 4 * RES, base[1]], [base[0], base[1] - h * RES]], alpha(GLASSB_L, 0.9), alpha(GLASSB, 0.9));
      iso.r.polyline([[base[0] - 4 * RES, base[1]], [base[0], base[1] - h * RES], [base[0] + 4 * RES, base[1]]], INK_W * 0.5, INK);
    }
  } else if (kind === 'blades') {
    // an open roof crown: a colonnade of tall blades standing above the roof
    // on the structure (Governor Phillip Tower's signature open "crown")
    for (let i = 0; i <= 6; i++) {
      const u = cu - 0.26 + (0.52 * i) / 6;
      const b0 = iso.P(u, cv + 0.26, hz);
      const b1 = iso.P(u, cv - 0.26, hz);
      iso.r.line(b0, [b0[0], b0[1] - 34 * RES], 1.2 * RES, STEELB_L);
      iso.r.line(b1, [b1[0], b1[1] - 34 * RES], 1.2 * RES, shaded(STEELB, 0.1));
      iso.r.line([b0[0], b0[1] - 34 * RES], [b1[0], b1[1] - 34 * RES], 0.7 * RES, alpha(STEELB_L, 0.6));
    }
  } else if (kind === 'bronze') {
    // a gently bowed bronze top + a flat cap
    iso.box(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, hz, hz + 10, lighten(BRONZE, 0.06), { ink: false });
  }
  return iso.build();
}

// =====================================================================
// CABLE-STAYED BRIDGE — the Anzac Bridge: two tall concrete A-frame PYLONS
// with fans of stay cables holding the deck across the bay. A bespoke hero.
// 4×4 (the deck runs up v; the pylons stand mid-span). Towers in headroom.
// =====================================================================
function cableStayedBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 200 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.06), lit(HARBOUR, 0.05));
  const cu = 2.0, halfRoad = 0.42;
  const vN = 0.6, vS = 3.4;
  const deckZ = 24;
  // the deck
  iso.box(cu - halfRoad, vN, cu + halfRoad, vS, deckZ - 4, deckZ, shaded(COLORS.concrete, 0.08), { ink: false });
  iso.quad(cu - halfRoad, vN, cu + halfRoad, vS, deckZ, COLORS.road);
  iso.r.line(iso.P(cu, vN, deckZ + 0.5), iso.P(cu, vS, deckZ + 0.5), 0.5 * RES, alpha(COLORS.marking, 0.7));
  // two A-frame pylons
  const pylonZ = 150;
  const pylons = [vN + 0.9, vS - 0.9];
  for (const pv of pylons) {
    const apex = iso.P(cu, pv, pylonZ);
    for (const du of [cu - halfRoad, cu + halfRoad] as const) {
      iso.r.line(iso.P(du, pv, deckZ), apex, 2 * RES, lit(COLORS.concrete, 0.04));
      iso.r.line(iso.P(du, pv, deckZ), apex, 2 * RES, alpha(INK, 0.25));
    }
    // a small mast above the apex
    iso.r.line(apex, [apex[0], apex[1] - 14 * RES], 1.2 * RES, COLORS.steelDark);
    // the cable fans down to the deck both ways
    for (const du of [cu - halfRoad, cu + halfRoad] as const) {
      for (let i = 1; i <= 5; i++) {
        const dv = (i / 5) * 1.1;
        iso.r.line(apex, iso.P(du, pv - dv, deckZ + 1), 0.4 * RES, alpha(COLORS.white, 0.55));
        iso.r.line(apex, iso.P(du, pv + dv, deckZ + 1), 0.4 * RES, alpha(COLORS.white, 0.55));
      }
    }
  }
  // deck balustrades
  for (const du of [cu - halfRoad, cu + halfRoad] as const) {
    iso.r.line(iso.P(du, vN, deckZ + 2.5), iso.P(du, vS, deckZ + 2.5), INK_W * 0.5, INK);
  }
  return iso.build();
}

// =====================================================================
// CASINO / WHARF / MODERN — small bespoke draws for the remaining placed set.
// =====================================================================

// The Star: a broad entertainment podium with a slim glass hotel tower. 5×5.
function casinoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 260 });
  void seed;
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the big podium
  iso.box(u0, v0, u1, v1, 0, 40, hex('#cdb88f'));
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 10, shaded(SAND, 0.1), { ink: false });
  // a glowing glass atrium band
  iso.r.poly([iso.P(u0 + 0.3, v1, 8), iso.P(u1 - 0.3, v1, 8), iso.P(u1 - 0.3, v1, 36), iso.P(u0 + 0.3, v1, 36)], alpha(COLORS.glassLit, 0.45));
  iso.windowsLeft(v1, u0 + 0.3, u1 - 0.3, 8, 36, 12, alpha(COLORS.glassLit, 0.3), undefined);
  // the slim hotel tower at the back
  const cu = u0 + 1.4, cv = v0 + 1.2;
  towerShaft(iso, cu, cv, 0.34, 0.34, 40, 200, GLASSB, { taper: 0.1, litGlass: true });
  iso.box(cu - 0.28, cv - 0.28, cu + 0.28, cv + 0.28, 200, 210, lighten(GLASSB, 0.08), { ink: false });
  return iso.build();
}

// Powerhouse Museum: a long industrial SAWTOOTH-roofed shed (former tram
// powerhouse) with a brick chimney. 4×4.
function sawtoothTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.4, u1 = 3.6, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = hex('#a8694e'); // industrial brick
  iso.box(u0, v0, u1, v1, 0, 30, WALL);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(WALL, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 24, 10, alpha(COLORS.glassDark, 0.8), undefined);
  // the sawtooth roof: a row of triangular monitor roofs with glazed faces
  const teeth = 5;
  for (let i = 0; i < teeth; i++) {
    const ua = u0 + (i * (u1 - u0)) / teeth;
    const ub = u0 + ((i + 1) * (u1 - u0)) / teeth;
    const um = (ua + ub) / 2;
    // the solid back slope
    iso.r.poly([iso.P(ua, v0, 30), iso.P(um, v0, 42), iso.P(um, v1, 42), iso.P(ua, v1, 30)], shaded(WALL, 0.06));
    // the glazed front slope (catches light)
    iso.r.poly([iso.P(um, v0, 42), iso.P(ub, v0, 30), iso.P(ub, v1, 30), iso.P(um, v1, 42)], alpha(COLORS.glassSky, 0.8));
    iso.r.line(iso.P(um, v0, 42), iso.P(um, v1, 42), INK_W * 0.5, INK);
  }
  // the tall brick chimney
  iso.box(u1 - 0.5, v0 + 0.2, u1 - 0.34, v0 + 0.36, 0, 76, WALL);
  iso.box(u1 - 0.52, v0 + 0.18, u1 - 0.32, v0 + 0.38, 76, 80, shaded(WALL, 0.06), { ink: false });
  return iso.build();
}

// Modern stone+glass civic (Museum of Sydney / Sydney Jewish Museum): a
// crisp contemporary block of stone with a deep glass slot. 2×2.
function modernCivicTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 56, hex('#cfc3ad'));
  // a tall glass slot up the front
  iso.r.poly([iso.P(u0 + 0.4, v1, 6), iso.P(u0 + 0.7, v1, 6), iso.P(u0 + 0.7, v1, 52), iso.P(u0 + 0.4, v1, 52)], alpha(COLORS.glassLit, 0.5));
  // stone fins down the rest of the front
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.75 + i * 0.12;
    iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, 50), 0.8 * RES, alpha(shaded(SAND, 0.16), 0.7));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 56, 60, lighten(SAND, 0.06), { ink: false });
  return iso.build();
}

// Westfield Bondi Junction: a broad retail box + a residential tower over it. 5×5.
function westfieldBondiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 220 });
  void seed;
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  iso.box(u0, v0, u1, v1, 0, 44, hex('#bfb6c2'));
  iso.windowsLeft(v1, u0 + 0.2, u1 - 0.2, 10, 38, 14, alpha(COLORS.glassLit, 0.3), undefined);
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 44, 48, lighten(COLORS.concrete, 0.06), { ink: false });
  // the tower over the centre
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  towerShaft(iso, cu, cv, 0.4, 0.4, 48, 168, GLASSB_L, { litGlass: true });
  iso.box(cu - 0.34, cv - 0.34, cu + 0.34, cv + 0.34, 168, 176, lighten(GLASSB_L, 0.06), { ink: false });
  return iso.build();
}

// =====================================================================
// REGISTRY — first match wins; order MARQUEE → towers → heritage → others.
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // ================= MARQUEE ICONS =================
  {
    city: 'sydney',
    key: 'sydney-opera-house',
    match: /Sydney Opera House/i,
    foot: [5, 5],
    seed: 4501,
    draw: (seed) => operaHouseTile(seed),
    // coloured sail projections (the Vivid-style light show on the shells)
    light: { kind: 'rimCycle', topZ: 210, halfW: 1.9 },
  },
  {
    city: 'sydney',
    key: 'sydney-harbour-bridge',
    match: /Sydney Harbour Bridge/i,
    foot: [5, 5],
    seed: 4502,
    draw: (seed) => harbourBridgeTile(seed),
    // the great arch lit with a travelling sweep + the NYE flood
    light: { kind: 'archGlow', topZ: 216, halfW: 1.8 },
  },
  {
    city: 'sydney',
    key: 'sydney-tower',
    match: /Sydney Tower/i,
    foot: [1, 1],
    seed: 4503,
    draw: (seed) => sydneyTowerTile(seed),
    // the golden turret crown + the aircraft beacon at the antenna tip
    light: { kind: 'aerialBeacon', topZ: 280, halfW: 0.34 },
  },
  {
    city: 'sydney',
    key: 'st-marys-cathedral',
    match: /St\.?\s*Mary'?s? Cathedral/i,
    foot: [3, 3],
    seed: 4504,
    draw: (seed) => gothicCathedralTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 188, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'st-andrews-cathedral',
    match: /St\.?\s*Andrews? Cathedral/i,
    foot: [3, 3],
    seed: 4505,
    draw: (seed) => gothicCathedralTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    // QVB — drawn + ready; matches "Queen Victoria Building". (Only the Queen
    // Victoria MONUMENT is placed today, handled separately below, so this is
    // dormant until a QVB place lands — the draw is ready either way.)
    city: 'sydney',
    key: 'queen-victoria-building',
    match: /Queen Victoria Building/i,
    foot: [5, 5],
    seed: 4506,
    draw: (seed) => qvbTile(seed),
    light: { kind: 'facadeFlood', topZ: 134, halfW: 1.9 },
  },
  {
    city: 'sydney',
    key: 'luna-park',
    match: /Luna Park/i,
    foot: [3, 3],
    seed: 4507,
    draw: (seed) => lunaParkTile(seed),
    light: { kind: 'rimCycle', topZ: 112, halfW: 1.3 },
  },

  // ================= NEOCLASSICAL SANDSTONE CIVIC =================
  {
    city: 'sydney',
    key: 'australian-museum',
    match: /Australian Museum/i,
    foot: [3, 3],
    seed: 4510,
    draw: (seed) => neoclassicalTile(seed, 3, { tower: false }),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.3 },
  },
  {
    // "Town Hall House" is the placed Sydney Town Hall complex — the Victorian
    // sandstone hall with its great clock tower.
    city: 'sydney',
    key: 'sydney-town-hall',
    match: /Town Hall(?: House)?/i,
    foot: [3, 3],
    seed: 4511,
    draw: (seed) => neoclassicalTile(seed, 3, { clockTower: true }),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'sydney-gpo',
    match: /General Post Office|Sydney GPO/i,
    foot: [3, 3],
    seed: 4512,
    draw: (seed) => neoclassicalTile(seed, 3, { clockTower: true }),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.3 },
  },
  {
    // Customs House — drawn + ready (neoclassical). Dormant until placed.
    city: 'sydney',
    key: 'customs-house',
    match: /Customs House/i,
    foot: [2, 2],
    seed: 4513,
    draw: (seed) => neoclassicalTile(seed, 2, { tower: false }),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'government-house',
    match: /Government House/i,
    foot: [3, 3],
    seed: 4514,
    draw: (seed) => governmentHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 104, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'sydney-observatory',
    match: /Sydney Observatory/i,
    foot: [2, 2],
    seed: 4515,
    draw: (seed) => observatoryTile(seed),
    light: { kind: 'aerialBeacon', topZ: 106, halfW: 0.9 },
  },
  {
    city: 'sydney',
    key: 'hyde-park-barracks',
    match: /Hyde Park Barracks/i,
    foot: [2, 2],
    seed: 4516,
    draw: (seed) => georgianTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 66, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'the-mint',
    match: /^The Mint$/i,
    foot: [2, 2],
    seed: 4517,
    draw: (seed) => georgianTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 66, halfW: 1.0 },
  },

  // ================= HARBOUR SKYLINE TOWERS =================
  {
    city: 'sydney',
    key: 'aurora-place',
    match: /Aurora Place/i,
    foot: [2, 2],
    seed: 4520,
    draw: (seed) => harbourTowerTile(seed, 'sail', 230),
    light: { kind: 'towerCrown', topZ: 290, halfW: 0.7 },
  },
  {
    city: 'sydney',
    key: 'grosvenor-place',
    match: /Grosvenor Place/i,
    foot: [2, 2],
    seed: 4521,
    draw: (seed) => harbourTowerTile(seed, 'bronze', 210),
    light: { kind: 'towerCrown', topZ: 220, halfW: 0.7 },
  },
  {
    city: 'sydney',
    key: 'deutsche-bank-plaza',
    match: /Deutsche Bank Pla(?:za|ce)/i,
    foot: [2, 2],
    seed: 4522,
    draw: (seed) => harbourTowerTile(seed, 'crystal', 220),
    light: { kind: 'towerCrown', topZ: 260, halfW: 0.7 },
  },
  {
    // Governor Phillip Tower — drawn + ready (its open blade crown). The placed
    // companion "Museum of Sydney" resolves to the modern-civic draw below.
    city: 'sydney',
    key: 'governor-phillip-tower',
    match: /Governor Phillip Tower/i,
    foot: [2, 2],
    seed: 4523,
    draw: (seed) => harbourTowerTile(seed, 'blades', 220),
    light: { kind: 'towerCrown', topZ: 254, halfW: 0.7 },
  },
  {
    city: 'sydney',
    key: 'chifley-tower',
    match: /Chifley Tower/i,
    foot: [2, 2],
    seed: 4524,
    draw: (seed) => harbourTowerTile(seed, 'crystal', 230),
    light: { kind: 'towerCrown', topZ: 270, halfW: 0.7 },
  },
  {
    city: 'sydney',
    key: 'century-tower',
    match: /Century Tower/i,
    foot: [2, 2],
    seed: 4525,
    draw: (seed) => harbourTowerTile(seed, 'plain', 180),
    light: { kind: 'towerCrown', topZ: 200, halfW: 0.6 },
  },
  {
    city: 'sydney',
    key: 'blues-point-tower',
    match: /Blues Point Tower/i,
    foot: [2, 2],
    seed: 4526,
    draw: (seed) => harbourTowerTile(seed, 'slab', 180),
    light: { kind: 'towerCrown', topZ: 190, halfW: 0.7 },
  },
  {
    city: 'sydney',
    key: 'horizon-apartments',
    match: /Horizon Apartments/i,
    foot: [2, 2],
    seed: 4527,
    draw: (seed) => harbourTowerTile(seed, 'wave', 200),
    light: { kind: 'towerCrown', topZ: 216, halfW: 0.6 },
  },
  {
    city: 'sydney',
    key: 'lumina',
    match: /^Lumina$/i,
    foot: [2, 2],
    seed: 4528,
    draw: (seed) => harbourTowerTile(seed, 'plain', 170),
    light: { kind: 'towerCrown', topZ: 190, halfW: 0.6 },
  },
  {
    city: 'sydney',
    key: 'roden-cutler-house',
    match: /Roden Cutler House/i,
    foot: [2, 2],
    seed: 4529,
    draw: (seed) => harbourTowerTile(seed, 'plain', 160),
    light: { kind: 'towerCrown', topZ: 180, halfW: 0.6 },
  },

  // ================= MUSEUMS / CASINO / MALL / BRIDGES / INDUSTRIAL =================
  {
    city: 'sydney',
    key: 'the-star',
    match: /^The Star$/i,
    foot: [5, 5],
    seed: 4540,
    draw: (seed) => casinoTile(seed),
    light: { kind: 'towerCrown', topZ: 200, halfW: 1.6 },
  },
  {
    city: 'sydney',
    key: 'powerhouse-museum',
    match: /Powerhouse Museum/i,
    foot: [4, 4],
    seed: 4541,
    draw: (seed) => sawtoothTile(seed),
    light: { kind: 'genericGlow', topZ: 80, halfW: 1.6 },
  },
  {
    city: 'sydney',
    key: 'museum-of-sydney',
    match: /Museum of Sydney/i,
    foot: [2, 2],
    seed: 4542,
    draw: (seed) => modernCivicTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'sydney-jewish-museum',
    match: /Sydney Jewish Museum/i,
    foot: [2, 2],
    seed: 4543,
    draw: (seed) => modernCivicTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'westfield-bondi-junction',
    match: /Westfield Bondi Junction/i,
    foot: [5, 5],
    seed: 4544,
    draw: (seed) => westfieldBondiTile(seed),
    light: { kind: 'towerCrown', topZ: 168, halfW: 1.7 },
  },
  {
    city: 'sydney',
    key: 'anzac-bridge',
    match: /Anzac Bridge/i,
    foot: [4, 4],
    seed: 4545,
    draw: (seed) => cableStayedBridgeTile(seed),
    light: { kind: 'archGlow', topZ: 150, halfW: 1.5 },
  },
  {
    // Paddington Town Hall (placed, landmark) — a smaller sandstone town hall
    // with a clock tower; reuse the neoclassical clock-tower draw at 2 tiles.
    city: 'sydney',
    key: 'paddington-town-hall',
    match: /Paddington Town Hall/i,
    foot: [2, 2],
    seed: 4546,
    draw: (seed) => neoclassicalTile(seed, 2, { clockTower: true }),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
];
