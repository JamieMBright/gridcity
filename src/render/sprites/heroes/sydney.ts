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
// ROUND 2 — more bespoke harbour/heritage Sydney. Each a NEW draw fn (small
// shared primitives reused; the silhouette per hero is hand-built from the
// research photo). Three new families:
//   • MARITIME — the museum fleet (a destroyer hull, a black submarine), the
//     world's-longest timber Finger Wharf, the Maritime Museum's wave roof,
//     a candy-striped lighthouse, the convict-shipyard island.
//   • PERFORMING / CIVIC HERITAGE — Walsh Bay wharf theatre, Art-Deco theatre
//     marquees, an atmospheric picture-palace front, a Venetian-Gothic
//     mortuary station, the Rocks' Argyle Cut, gothic + Georgian churches,
//     the zoo's Deco gate, a memorial pavilion, Regency/Italianate villas.
//   • COMMERCIAL TOWERS — the "pink palace" bank, the cantilevered AMP/Quay
//     Quarter stack, a Gothic-skyscraper hotel, Seidler's column-and-spire
//     Capita, the brutalist UTS slab + AWA's lattice-mast Deco tower, Gehry's
//     crumpled-brick business school, Academic-Gothic Great Hall.
// =====================================================================

// --- extra round-2 palette additions ---------------------------------------
const PINKSTONE = hex('#e7c9b4'); // the State Savings Bank "pink palace" trachyte
const PINKSTONE_D = hex('#cda894');
const DECO_CREAM = hex('#ece2cf'); // Art-Deco rendered cream (Enmore / AWA base)
const HULL_GREY = hex('#6a7682'); // warship haze-grey
const HULL_DK = hex('#4d5963');
const SUB_BLACK = hex('#2c333b'); // submarine matte black
const TIMBER = hex('#9c7b54'); // the Finger Wharf's aged hardwood
const TIMBER_D = hex('#7d6040');
const TERRA = hex('#9a5a3a'); // terracotta tile (villas)

/** A pitched ridge roof drawn directly as two slopes meeting at a ridge line
 *  running along U (front-to-side), for the smaller heritage blocks where the
 *  Iso.gable axis convention doesn't suit. Returns nothing. */
function ridgeRoofU(iso: Iso, u0: number, v0: number, u1: number, v1: number, z: number, rise: number, roof: RGBA): void {
  const vm = (v0 + v1) / 2;
  // front slope (toward +v, lit) and back slope (toward -v, shaded)
  iso.r.poly([iso.P(u0, v1, z), iso.P(u1, v1, z), iso.P(u1, vm, z + rise), iso.P(u0, vm, z + rise)], lit(roof, 0.05));
  iso.r.poly([iso.P(u0, v0, z), iso.P(u1, v0, z), iso.P(u1, vm, z + rise), iso.P(u0, vm, z + rise)], shaded(roof, 0.06));
  iso.r.line(iso.P(u0, vm, z + rise), iso.P(u1, vm, z + rise), INK_W * 0.6, INK);
}

// =====================================================================
// CARRIAGEWORKS — the vast former Eveleigh railway CARRIAGE WORKSHOPS: a long
// row of saw-tooth-and-gable brick sheds with tall arched windows and an
// overhead travelling-crane gantry; Australia's largest such arts precinct.
// 5×5, drawn long + low with the gantry catching the dusk. NEW draw.
// =====================================================================
function carriageworksTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 110 });
  void seed;
  const BR = hex('#9d6047'); // soot-darkened Sydney brick
  const u0 = 0.4, u1 = 4.6, v0 = 0.6, v1 = 4.4;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a low rail forecourt with a track stub
  iso.box(u0 - 0.06, v1, u1 + 0.06, v1 + 0.5, 0, 3, shaded(COLORS.concrete, 0.1), { ink: false });
  iso.r.line(iso.P(u0, v1 + 0.22, 3.5), iso.P(u1, v1 + 0.22, 3.5), 0.6 * RES, alpha(STEELB_L, 0.5));
  // the long brick workshop body
  iso.box(u0, v0, u1, v1, 0, 34, BR);
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, shaded(BR, 0.14), { ink: false });
  // tall round-arched workshop windows down the visible flank (the bays)
  for (let i = 0; i < 11; i++) {
    const u = u0 + 0.18 + i * 0.39;
    const poly: Pt[] = [iso.P(u, v1, 8), iso.P(u, v1, 24)];
    for (let j = 0; j <= 5; j++) { const t = j / 5; poly.push(iso.P(u + 0.18 * t, v1, 24 + Math.sin(t * Math.PI) * 5)); }
    poly.push(iso.P(u + 0.18, v1, 24), iso.P(u + 0.18, v1, 8));
    iso.r.poly(poly, alpha(hex('#2b3a48'), 0.85));
  }
  // a long run of parallel GABLE ridges (the workshop bays) along v
  const bays = 4;
  for (let i = 0; i < bays; i++) {
    const va = v0 + (i * (v1 - v0)) / bays;
    const vb = v0 + ((i + 1) * (v1 - v0)) / bays;
    iso.gable(u0 + 0.05, va + 0.04, u1 - 0.05, vb - 0.04, 34, 18, 'v', ROOFSL, BR);
  }
  // the overhead travelling-crane GANTRY: two rails on posts + a crane bridge
  const gz = 52;
  for (const gu of [u0 + 0.9, u1 - 0.9] as const) {
    iso.r.line(iso.P(gu, v0 + 0.2, 34), iso.P(gu, v0 + 0.2, gz), 1.2 * RES, STEELB);
    iso.r.line(iso.P(gu, v1 - 0.2, 34), iso.P(gu, v1 - 0.2, gz), 1.2 * RES, STEELB);
  }
  iso.r.line(iso.P(u0 + 0.9, v0 + 1.6, gz), iso.P(u1 - 0.9, v0 + 1.6, gz), 1.6 * RES, STEELB_L);
  iso.r.line(iso.P(u0 + 0.9, v0 + 1.6, gz - 5), iso.P(u1 - 0.9, v0 + 1.6, gz - 5), 0.8 * RES, alpha(INK, 0.5));
  // the crane hoist trolley
  iso.box(2.1, v0 + 1.5, 2.5, v0 + 1.72, gz - 8, gz - 2, hex('#c08a2e'), { ink: false });
  return iso.build();
}

// =====================================================================
// AUSTRALIAN NATIONAL MARITIME MUSEUM — Philip Cox's Darling Harbour landmark:
// a low museum hall under a sweeping WHITE TENSILE WAVE ROOF (a row of swept
// steel masts with cable-stayed sail canopies, echoing sails over water), a
// glass front to the harbour. 5×5. NEW draw.
// =====================================================================
function maritimeMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.5, u1 = 4.5, v0 = 1.0, v1 = 4.2;
  // the museum sits at the water's edge
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // a low dark glass-and-steel hall (so the white roof reads above it)
  iso.box(u0, v0, u1, v1, 0, 22, hex('#3a4654'));
  iso.r.poly([iso.P(u0 + 0.2, v1, 5), iso.P(u1 - 0.2, v1, 5), iso.P(u1 - 0.2, v1, 20), iso.P(u0 + 0.2, v1, 20)], alpha(COLORS.glassLit, 0.45));
  iso.windowsLeft(v1, u0 + 0.2, u1 - 0.2, 5, 20, 12, alpha(COLORS.glassSky, 0.5), undefined);
  // the great swept WHITE tensile WAVE roof: a row of tall peaked sail membranes
  // each springing from a low front eave up to a high backward-leaning mast tip,
  // catching the light like canvas — the Philip Cox signature.
  const sailRoof = (cuC: number, halfU: number, peakZ: number): void => {
    const tip = iso.P(cuC - 0.15, v0 + 0.3, peakZ); // the high tip leans back (-v)
    const eaveL = iso.P(cuC - halfU, v1 - 0.15, 26);
    const eaveR = iso.P(cuC + halfU, v1 - 0.15, 26);
    const ridgeBack = iso.P(cuC, v0 + 0.3, 30);
    // the mast under the tip
    iso.r.line(iso.P(cuC - 0.15, v0 + 0.3, 26), tip, 1.4 * RES, STEELB_L);
    // a bowed gore from each front eave up to the tip (convex canvas)
    const gore = (a: Pt, bow: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (tip[0] - a[0]) * t + Math.sin(t * Math.PI) * bow, a[1] + (tip[1] - a[1]) * t - Math.sin(t * Math.PI) * 3 * RES]); }
      return pts;
    };
    // sun-lit front face
    iso.r.poly([eaveL, ...gore(eaveL, -3.4 * RES).slice(1), tip, ...gore(eaveR, 3.4 * RES).slice(1).reverse()], SHELL, SHELL_D);
    // the shaded backward slope to the rear ridge
    iso.r.poly([tip, ridgeBack, eaveR, eaveL], SHELL_D);
    // ribbed seams across the canopy
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const a: Pt = [eaveL[0] + (tip[0] - eaveL[0]) * t, eaveL[1] + (tip[1] - eaveL[1]) * t];
      const b: Pt = [eaveR[0] + (tip[0] - eaveR[0]) * t, eaveR[1] + (tip[1] - eaveR[1]) * t];
      iso.r.line(a, b, 0.5 * RES, alpha(SHELL_D, 0.7));
    }
    // crisp ridge contour + front eave line
    iso.r.polyline([eaveL, tip, eaveR], INK_W * 0.8, INK);
    iso.r.line(eaveL, eaveR, INK_W * 0.55, alpha(INK, 0.55));
    // stay cables fanning from the tip to the front eaves
    iso.r.line(tip, eaveL, 0.4 * RES, alpha(STEELB_L, 0.6));
    iso.r.line(tip, eaveR, 0.4 * RES, alpha(STEELB_L, 0.6));
  };
  // three sails across the hall (front-to-back ranks), diminishing toward +u
  sailRoof(1.5, 0.85, 92);
  sailRoof(2.8, 0.8, 104);
  sailRoof(3.9, 0.62, 78);
  // a warm gleam catching the tallest membrane ridge
  iso.gleam(iso.P(2.65, v0 + 0.3, 108), iso.P(2.8, v1 - 0.15, 30), 1.2 * RES);
  return iso.build();
}

// =====================================================================
// HMAS VAMPIRE — the museum DESTROYER moored at the maritime museum: a long
// grey warship HULL with a raked bow, a stepped superstructure, a tripod
// lattice MAST + funnel and gun turrets fore & aft. 3×3 (the hull runs along
// u in the water). NEW draw.
// =====================================================================
function destroyerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  const cv = 1.5, dz = 12; // waterline deck height
  const bowU = 2.78, sternU = 0.22, halfB = 0.34;
  // the HULL: a long box tapering to a raked bow (built as a body + bow wedge)
  iso.box(sternU, cv - halfB, 2.4, cv + halfB, 0, dz, HULL_GREY, { topC: top(HULL_GREY, 0.16) });
  // the raked bow wedge
  iso.r.poly([iso.P(2.4, cv - halfB, 0), iso.P(2.4, cv - halfB, dz), iso.P(bowU, cv, dz + 3), iso.P(bowU, cv, 0)], shaded(HULL_DK, 0.05));
  iso.r.poly([iso.P(2.4, cv + halfB, 0), iso.P(2.4, cv + halfB, dz), iso.P(bowU, cv, dz + 3), iso.P(bowU, cv, 0)], lit(HULL_GREY, 0.04));
  // boot-topping waterline stripe
  iso.r.line(iso.P(sternU, cv + halfB, 2), iso.P(2.4, cv + halfB, 2), 1 * RES, alpha(hex('#1d1014'), 0.7));
  // a long low deckhouse
  iso.box(0.7, cv - 0.22, 2.05, cv + 0.22, dz, dz + 14, lit(HULL_GREY, 0.05));
  // the bridge superstructure (stepped, toward the bow)
  iso.box(1.5, cv - 0.2, 1.95, cv + 0.2, dz + 14, dz + 30, lighten(HULL_GREY, 0.04));
  iso.box(1.6, cv - 0.15, 1.9, cv + 0.15, dz + 30, dz + 40, lighten(HULL_GREY, 0.08), { ink: false });
  // a tripod LATTICE mast above the bridge
  const mb = iso.P(1.75, cv, dz + 40);
  iso.r.line(mb, [mb[0], mb[1] - 44 * RES], 1.2 * RES, STEELB);
  iso.r.line(iso.P(1.62, cv + 0.1, dz + 40), [mb[0], mb[1] - 30 * RES], 0.5 * RES, alpha(STEELB_L, 0.7));
  iso.r.line(iso.P(1.88, cv - 0.1, dz + 40), [mb[0], mb[1] - 30 * RES], 0.5 * RES, alpha(STEELB_L, 0.7));
  iso.glint([mb[0], mb[1] - 44 * RES], 1.6 * RES); // masthead light
  // the funnel (raked, aft of the bridge)
  iso.box(1.05, cv - 0.13, 1.35, cv + 0.13, dz + 14, dz + 30, HULL_DK);
  iso.r.poly([iso.P(1.05, cv + 0.13, dz + 30), iso.P(1.35, cv + 0.13, dz + 30), iso.P(1.4, cv + 0.13, dz + 26), iso.P(1.1, cv + 0.13, dz + 26)], shaded(HULL_DK, 0.1));
  // twin gun TURRETS fore (toward bow) + aft
  for (const tu of [2.2, 0.55] as const) {
    iso.box(tu - 0.13, cv - 0.14, tu + 0.13, cv + 0.14, dz, dz + 8, lighten(HULL_GREY, 0.04));
    // the gun barrels
    const g = iso.P(tu + 0.13, cv, dz + 5);
    iso.r.line(g, [g[0] + 12 * RES, g[1] - 2 * RES], 1 * RES, HULL_DK);
  }
  return iso.build();
}

// =====================================================================
// HMAS ONSLOW — the museum SUBMARINE: a long low matte-black Oberon hull
// (rounded casing just above the water), a tall sail/fin (conning tower) with
// periscope masts, the bow and stern tapering to points. 2×2. NEW draw.
// =====================================================================
function submarineTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.06), lit(HARBOUR, 0.05));
  const cv = 1.0, wz = 6;
  // the long rounded casing — a low box with tapered bow (+u) and stern (−u)
  iso.box(0.42, cv - 0.18, 1.58, cv + 0.18, 0, wz, SUB_BLACK, { topC: top(SUB_BLACK, 0.14) });
  // bow taper
  iso.r.poly([iso.P(1.58, cv - 0.18, 0), iso.P(1.58, cv - 0.18, wz), iso.P(1.82, cv, wz - 1), iso.P(1.82, cv, 0)], shaded(SUB_BLACK, 0.05));
  iso.r.poly([iso.P(1.58, cv + 0.18, 0), iso.P(1.58, cv + 0.18, wz), iso.P(1.82, cv, wz - 1), iso.P(1.82, cv, 0)], lit(SUB_BLACK, 0.06));
  // stern taper
  iso.r.poly([iso.P(0.42, cv - 0.18, 0), iso.P(0.42, cv - 0.18, wz), iso.P(0.2, cv, wz - 1), iso.P(0.2, cv, 0)], shaded(SUB_BLACK, 0.08));
  // a faint deck centreline
  iso.r.line(iso.P(0.3, cv, wz + 0.5), iso.P(1.78, cv, wz + 0.5), 0.5 * RES, alpha(lighten(SUB_BLACK, 0.18), 0.6));
  // the SAIL (fin / conning tower) amidships — the unmistakable feature
  iso.box(0.86, cv - 0.1, 1.18, cv + 0.1, wz, wz + 26, lighten(SUB_BLACK, 0.05));
  iso.r.poly([iso.P(0.86, cv + 0.1, wz + 26), iso.P(1.18, cv + 0.1, wz + 26), iso.P(1.14, cv + 0.1, wz + 30), iso.P(0.9, cv + 0.1, wz + 30)], lighten(SUB_BLACK, 0.08));
  // periscope + radar masts from the sail top
  const st = iso.P(1.0, cv, wz + 30);
  iso.r.line(st, [st[0], st[1] - 18 * RES], 0.9 * RES, STEELB_L);
  iso.r.line([st[0] + 3 * RES, st[1]], [st[0] + 3 * RES, st[1] - 12 * RES], 0.7 * RES, STEELB_L);
  iso.glint([st[0], st[1] - 18 * RES], 1.3 * RES);
  return iso.build();
}

// =====================================================================
// FINGER WHARF (Woolloomooloo) — the world's LONGEST timber-piled wharf: an
// enormously long low timber shed with a continuous gabled roof, ranks of
// windows, set out over the bay on piles, a small Edwardian gabled entry. 5×5,
// drawn very long and low over water. NEW draw.
// =====================================================================
function fingerWharfTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 90 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  const u0 = 0.3, u1 = 4.7, v0 = 1.4, v1 = 3.6;
  // the timber PILES under the deck (a forest of posts in the water)
  for (let i = 0; i <= 12; i++) {
    const u = u0 + (i * (u1 - u0)) / 12;
    iso.r.line(iso.P(u, v1 + 0.1, 0), iso.P(u, v1 + 0.1, 6), 1 * RES, alpha(TIMBER_D, 0.7));
    iso.r.line(iso.P(u, v0 - 0.05, 0), iso.P(u, v0 - 0.05, 6), 0.8 * RES, alpha(darken(TIMBER_D, 0.1), 0.6));
  }
  // the deck platform
  iso.box(u0, v0, u1, v1, 5, 8, shaded(TIMBER, 0.1), { ink: false });
  // the long timber shed body
  iso.box(u0 + 0.15, v0 + 0.1, u1 - 0.15, v1 - 0.1, 8, 30, TIMBER);
  // a long rank of windows + bays
  iso.windowsLeft(v1 - 0.1, u0 + 0.3, u1 - 0.3, 12, 26, 16, alpha(hex('#33414e'), 0.8), lighten(TIMBER, 0.08));
  // the continuous gabled roof (ridge along u)
  ridgeRoofU(iso, u0 + 0.1, v0 + 0.05, u1 - 0.1, v1 - 0.05, 30, 16, hex('#7a6a55'));
  // a slightly taller gabled ENTRY pavilion at the shore end (+u)
  iso.box(u1 - 0.7, v0 + 0.05, u1 - 0.1, v1 - 0.05, 8, 36, lighten(TIMBER, 0.05));
  iso.gable(u1 - 0.7, v0 + 0.05, u1 - 0.1, v1 - 0.05, 36, 12, 'u', hex('#6f5f4c'), TIMBER);
  return iso.build();
}

// =====================================================================
// HORNBY LIGHTHOUSE — the candy-striped South Head lighthouse: a tapering
// round tower in bold RED-AND-WHITE vertical stripes, a black gallery + dome
// lantern, a little keeper's cottage at the base on the headland. 1×1, big
// headroom (a slim spike on the cliff). NEW draw.
// =====================================================================
function lighthouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const u = 0.5, v = 0.52;
  iso.floor(shaded(COLORS.grass, 0.1), lit(COLORS.grass, 0.04)); // the grassy headland
  iso.shadow(u - 0.12, v - 0.06, u + 0.12, v + 0.16, 0.34, 0.24);
  // a low keeper's cottage beside the tower
  iso.box(u + 0.1, v + 0.08, u + 0.34, v + 0.3, 0, 14, COLORS.white);
  iso.hip(u + 0.09, v + 0.07, u + 0.35, v + 0.31, 14, 7, hex('#b04632'));
  // the tapering striped TOWER drawn as a stack of narrowing rings on a screen
  const baseZ = 0, topZ = 150;
  const [cx, cyB] = iso.P(u - 0.04, v, baseZ);
  const ringAt = (z: number): { y: number; r: number } => {
    const t = (z - baseZ) / (topZ - baseZ);
    return { y: cyB - z * RES, r: (9 - t * 3.2) * RES };
  };
  // vertical candy stripes: draw the tower as alternating red/white gores
  const N = 10;
  const b = ringAt(baseZ), tp = ringAt(topZ);
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI * (i / N), a1 = Math.PI * ((i + 1) / N);
    const col = i % 2 ? hex('#d23b2e') : COLORS.white;
    iso.r.poly([
      [cx + Math.cos(a0) * b.r, b.y], [cx + Math.cos(a1) * b.r, b.y],
      [cx + Math.cos(a1) * tp.r, tp.y], [cx + Math.cos(a0) * tp.r, tp.y],
    ], i % 2 ? shaded(col, 0.04) : shaded(col, 0.02));
  }
  iso.r.line([cx - b.r, b.y], [cx - tp.r, tp.y], INK_W * 0.6, INK);
  iso.r.line([cx + b.r, b.y], [cx + tp.r, tp.y], INK_W * 0.6, INK);
  // the black gallery ring + domed lantern + the LIGHT
  const g = ringAt(topZ);
  iso.r.rect(cx - g.r - 1.5 * RES, g.y - 2 * RES, cx + g.r + 1.5 * RES, g.y, hex('#2a2f36'));
  iso.r.rect(cx - g.r + 0.5 * RES, g.y - 12 * RES, cx + g.r - 0.5 * RES, g.y - 2 * RES, alpha(GILT_HOT, 0.85)); // glazed lamp room
  iso.r.poly([[cx - g.r, g.y - 12 * RES], [cx + g.r, g.y - 12 * RES], [cx, g.y - 22 * RES]], hex('#2a2f36'));
  iso.glint([cx, g.y - 7 * RES], 3 * RES);
  return iso.build();
}

// =====================================================================
// COCKATOO ISLAND — the UNESCO convict + naval-SHIPYARD island: a sandstone
// island plateau ringed by water, with industrial workshop sheds, the great
// HAMMERHEAD/luffing dock CRANES, a tall chimney and the dry-dock slot. 3×3.
// NEW draw.
// =====================================================================
function shipyardIslandTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  const u0 = 0.5, u1 = 2.5, v0 = 0.6, v1 = 2.5;
  // the rocky sandstone island shelf rising from the water
  iso.box(u0, v0, u1, v1, 0, 12, shaded(SAND, 0.04), { topC: top(shaded(SAND, 0.02), 0.1) });
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 5, shaded(GRANITE, 0.1), { ink: false });
  // a long corrugated workshop shed
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.5, v0 + 0.9, 12, 32, hex('#8a9099'));
  ridgeRoofU(iso, u0 + 0.2, v0 + 0.2, u1 - 0.5, v0 + 0.9, 32, 10, hex('#5c636b'));
  // the dry-dock SLOT cut into the rock (a dark rectangle with a ship hint)
  iso.r.poly([iso.P(u0 + 0.3, v1 - 0.5, 12), iso.P(u1 - 0.7, v1 - 0.5, 12), iso.P(u1 - 0.7, v1 - 0.1, 12), iso.P(u0 + 0.3, v1 - 0.1, 12)], alpha(hex('#23303b'), 0.85));
  // the great HAMMERHEAD crane: a tall lattice tower with a long horizontal jib
  const ct = iso.P(u1 - 0.7, v0 + 1.5, 92);
  const cb = iso.P(u1 - 0.7, v0 + 1.5, 12);
  iso.r.line(cb, ct, 2 * RES, STEELB);
  iso.r.line([cb[0] - 5 * RES, cb[1]], ct, 0.6 * RES, alpha(STEELB_L, 0.7));
  iso.r.line([cb[0] + 5 * RES, cb[1]], ct, 0.6 * RES, alpha(STEELB_L, 0.7));
  // the cantilevered jib (the "hammerhead")
  iso.r.line([ct[0] - 22 * RES, ct[1] + 2 * RES], [ct[0] + 14 * RES, ct[1] - 2 * RES], 2.2 * RES, STEELB_L);
  iso.r.line([ct[0] - 22 * RES, ct[1] + 6 * RES], [ct[0] + 14 * RES, ct[1] + 2 * RES], 0.6 * RES, alpha(INK, 0.4));
  // a tall brick chimney
  iso.box(u0 + 0.3, v0 + 1.4, u0 + 0.44, v0 + 1.54, 12, 78, hex('#9a5f47'));
  iso.box(u0 + 0.28, v0 + 1.38, u0 + 0.46, v0 + 1.56, 78, 82, shaded(hex('#9a5f47'), 0.08), { ink: false });
  return iso.build();
}

// =====================================================================
// AWA TOWER — Sydney's Art-Deco "little Eiffel": a stepped cream Deco office
// block crowned by a tall steel LATTICE radio MAST (for decades the city's
// tallest structure). 2×2, big headroom for the mast. NEW draw.
// =====================================================================
function awaTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 280 });
  void seed;
  const cu = 1.0, cv = 1.02;
  iso.shadow(cu - 0.34, cv - 0.2, cu + 0.34, cv + 0.34, 0.36, 0.24);
  // the stepped Deco office base
  iso.box(cu - 0.4, cv - 0.4, cu + 0.4, cv + 0.4, 0, 70, DECO_CREAM);
  iso.box(cu - 0.34, cv - 0.34, cu + 0.34, cv + 0.34, 70, 96, lighten(DECO_CREAM, 0.04));
  iso.box(cu - 0.26, cv - 0.26, cu + 0.26, cv + 0.26, 96, 116, lighten(DECO_CREAM, 0.06), { ink: false });
  // vertical Deco window piers up the front
  for (let i = 0; i < 5; i++) {
    const u = cu - 0.32 + i * 0.16;
    iso.r.line(iso.P(u, cv + 0.4, 10), iso.P(u, cv + 0.4, 66), 1.4 * RES, alpha(hex('#34424f'), 0.7));
  }
  iso.r.line(iso.P(cu - 0.34, cv + 0.34, 70), iso.P(cu + 0.34, cv + 0.34, 70), 1 * RES, SAND_D);
  // the great riveted LATTICE MAST (a square steel tower tapering to the tip)
  const [mx, myB] = iso.P(cu, cv, 116);
  const segs = 7, baseR = 7 * RES, topZ = 150 * RES;
  const legX = (t: number): number => baseR * (1 - t * 0.86);
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = myB - t0 * topZ, y1 = myB - t1 * topZ;
    const r0 = legX(t0), r1 = legX(t1);
    // the two visible legs + cross-bracing X
    iso.r.line([mx - r0, y0], [mx - r1, y1], 0.9 * RES, STEELB);
    iso.r.line([mx + r0, y0], [mx + r1, y1], 0.9 * RES, STEELB_L);
    iso.r.line([mx - r0, y0], [mx + r1, y1], 0.4 * RES, alpha(STEELB_L, 0.6));
    iso.r.line([mx + r0, y0], [mx - r1, y1], 0.4 * RES, alpha(STEELB_L, 0.6));
  }
  // the aerial finial + beacon
  iso.r.line([mx, myB - topZ], [mx, myB - topZ - 14 * RES], 0.7 * RES, STEELB_L);
  iso.glint([mx, myB - topZ], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// MORTUARY STATION — the exquisite Venetian-Gothic sandstone railway station
// (built for funeral trains): a long single-storey pavilion with a steep
// polychrome roof, an arcaded canopy of pointed arches on colonnettes, a
// pinnacled clock TOWER/flèche. 2×2, towers a little. NEW draw.
// =====================================================================
function mortuaryStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the sandstone body
  iso.box(u0, v0, u1, v1, 0, 30, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 7, shaded(SAND, 0.12), { ink: false });
  // the arcaded canopy of POINTED arches along the platform front (v1)
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.08 + i * 0.24;
    const poly: Pt[] = [iso.P(u, v1, 8), iso.P(u, v1, 20)];
    for (let j = 0; j <= 4; j++) { const t = j / 4; poly.push(iso.P(u + 0.1 * t, v1, 20 + (t < 0.5 ? t : 1 - t) * 10)); }
    poly.push(iso.P(u + 0.1, v1, 20), iso.P(u + 0.1, v1, 8));
    iso.r.poly(poly, alpha(hex('#2a3a30'), 0.82));
    // the colonnette between arches
    iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, 20), 0.8 * RES, lit(SAND, 0.06));
  }
  // the steep POLYCHROME gabled roof (banded slate)
  iso.gable(u0 + 0.05, v0, u1 - 0.05, v1 - 0.4, 30, 22, 'u', ROOFSL, SAND);
  // a polychrome band line on the roof
  // the pinnacled clock-tower FLÈCHE rising at one end
  const tu = u0 + 0.34, tv = v0 + 0.4;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 30, 64, SAND);
  // a tall steep spire with corner pinnacles
  const apex = iso.P(tu, tv, 116);
  const c0 = iso.P(tu - 0.16, tv + 0.16, 64), c1 = iso.P(tu + 0.16, tv + 0.16, 64), c2 = iso.P(tu + 0.16, tv - 0.16, 64);
  iso.r.poly([c0, c1, apex], shaded(ROOFSL, 0.08));
  iso.r.poly([c1, c2, apex], lit(ROOFSL, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  for (const [pu, pv] of [[tu - 0.16, tv + 0.16], [tu + 0.16, tv + 0.16]] as const) {
    const pb = iso.P(pu, pv, 64);
    iso.r.poly([[pb[0] - 1.8 * RES, pb[1]], [pb[0] + 1.8 * RES, pb[1]], [pb[0], pb[1] - 10 * RES]], lit(SAND, 0.08));
  }
  return iso.build();
}

// =====================================================================
// ARGYLE CUT — the Rocks' great convict-hewn road CUTTING: a deep slot blasted
// through the sandstone ridge, sheer chiselled rock walls on both sides, the
// roadway running through, terrace houses perched on the rock above and a
// stone overbridge spanning the cut. 2×2 (the cut runs along v). NEW draw.
// =====================================================================
function argyleCutTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.6;
  // two sandstone rock MASSES either side of a central slot in u
  const cutL = 0.82, cutR = 1.18; // the roadway slot
  const rockH = 40;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // left rock mass
  iso.box(u0, v0, cutL, v1, 0, rockH, shaded(SAND, 0.03), { topC: top(SAND, 0.08) });
  // right rock mass
  iso.box(cutR, v0, u1, v1, 0, rockH, SAND, { topC: top(SAND, 0.1) });
  // the sheer chiselled inner walls of the cut (darker, tool-marked)
  iso.r.poly([iso.P(cutL, v0, 0), iso.P(cutL, v1, 0), iso.P(cutL, v1, rockH), iso.P(cutL, v0, rockH)], shaded(SAND_D, 0.1));
  iso.r.poly([iso.P(cutR, v0, 0), iso.P(cutR, v1, 0), iso.P(cutR, v1, rockH), iso.P(cutR, v0, rockH)], shaded(SAND_D, 0.04));
  for (let z = 6; z < rockH; z += 7) {
    iso.r.line(iso.P(cutL, v0, z), iso.P(cutL, v1, z), 0.4 * RES, alpha(SAND_D, 0.5));
  }
  // the roadway through the slot
  iso.quad(cutL, v0, cutR, v1, 2, COLORS.road);
  iso.r.line(iso.P((cutL + cutR) / 2, v0, 2.5), iso.P((cutL + cutR) / 2, v1, 2.5), 0.4 * RES, alpha(COLORS.marking, 0.6));
  // the stone OVERBRIDGE spanning the cut near the back
  iso.box(cutL - 0.04, v0 + 0.3, cutR + 0.04, v0 + 0.5, rockH - 8, rockH, shaded(GRANITE, 0.04));
  iso.r.poly([iso.P(cutL, v0 + 0.4, 2), iso.P(cutL, v0 + 0.4, rockH - 10), iso.P(cutR, v0 + 0.4, rockH - 10), iso.P(cutR, v0 + 0.4, 2)], alpha(hex('#241a16'), 0.5)); // arch shadow under bridge
  // little terrace houses perched on the right rock above the cut
  for (let i = 0; i < 2; i++) {
    const tu = cutR + 0.16 + i * 0.22;
    iso.box(tu, v0 + 0.5, tu + 0.18, v0 + 0.8, rockH, rockH + 18, i % 2 ? BRICKR : hex('#d8c7a0'));
    ridgeRoofU(iso, tu, v0 + 0.5, tu + 0.18, v0 + 0.8, rockH + 18, 6, ROOFSL);
  }
  return iso.build();
}

// =====================================================================
// REGENCY / ITALIANATE VILLA — Admiralty / Kirribilli / Elizabeth Bay houses:
// a refined two-storey sandstone villa with a deep verandah / colonnade, a
// hipped or terracotta roof. Variants:
//   'colonnade' — Italianate verandah villa (Admiralty House)
//   'gothic'    — Gothic-Revival gabled cottage with bargeboards (Kirribilli)
//   'dome'      — Regency villa with a central domed saloon (Elizabeth Bay)
// 2×2, in harbourside gardens. NEW draw.
// =====================================================================
type VillaKind = 'colonnade' | 'gothic' | 'dome';
function villaTile(seed: number, kind: VillaKind): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.44, v1 = 1.56;
  iso.floor(shaded(COLORS.grass, 0.08), lit(COLORS.grass, 0.05));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = kind === 'gothic' ? hex('#dcc9a6') : hex('#e3d2ad'); // pale render/sandstone
  iso.box(u0, v0, u1, v1, 0, 38, WALL);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(WALL, 0.12), { ink: false });

  if (kind === 'gothic') {
    // steep cross-gables with decorative bargeboards
    iso.gable(u0 + 0.1, v0, u1 - 0.1, v1 - 0.3, 38, 18, 'u', ROOFSL, WALL);
    // a projecting front gable bay
    iso.box(u0 + 0.5, v1 - 0.36, u0 + 0.96, v1, 0, 42, lighten(WALL, 0.03));
    const ga = iso.P(u0 + 0.5, v1, 42), gb = iso.P(u0 + 0.96, v1, 42), gt = iso.P(u0 + 0.73, v1, 62);
    iso.r.poly([ga, gb, gt], lit(ROOFSL, 0.05));
    iso.r.polyline([ga, gt, gb], INK_W * 0.7, INK);
    // pointed window in the gable
    iso.r.poly([iso.P(u0 + 0.64, v1, 44), iso.P(u0 + 0.82, v1, 44), iso.P(u0 + 0.82, v1, 52), iso.P(u0 + 0.73, v1, 57), iso.P(u0 + 0.64, v1, 52)], alpha(hex('#2c3a4a'), 0.85));
    iso.windowsLeft(v1, u0 + 0.12, u0 + 0.46, 14, 30, 2, alpha(hex('#33414e'), 0.8), WALL);
  } else if (kind === 'dome') {
    // hipped roof + a central low DOMED saloon (Elizabeth Bay's famous oval salon)
    iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 38, 8, TERRA);
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
    iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 38, 46, lighten(WALL, 0.04));
    copperDome(iso, cx, cy, 46, 0.22 * (CELL_W / 2), 24 * RES, hex('#8aa0a6'));
    // a colonnaded ground-floor verandah
    colonnade(iso, v1, u0 + 0.12, u1 - 0.12, 8, 26, 6, COLORS.white);
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 28, 34, 6, alpha(hex('#33414e'), 0.7), WALL);
  } else {
    // Italianate: a deep two-tier colonnaded verandah across the front + a low
    // hipped terracotta roof with bracketed eaves
    iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 38, 9, TERRA);
    colonnade(iso, v1, u0 + 0.1, u1 - 0.1, 6, 21, 7, COLORS.white);
    colonnade(iso, v1, u0 + 0.1, u1 - 0.1, 22, 35, 7, lighten(COLORS.white, 0.02));
    // verandah floor line
    iso.r.line(iso.P(u0 + 0.1, v1, 21), iso.P(u1 - 0.1, v1, 21), 1 * RES, alpha(SAND_D, 0.7));
    iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 24, 33, 5, alpha(hex('#33414e'), 0.6), WALL);
  }
  return iso.build();
}

// =====================================================================
// GOTHIC CHURCH (parish) — Christ Church St Laurence / St Brigid's: a
// sandstone Gothic-Revival church, a steep-roofed nave, a square corner
// TOWER (with a spire for the larger one) and pointed lancet windows.
// `spire` adds a broached stone spire. 2×2, towers in headroom. NEW draw.
// =====================================================================
function parishChurchTile(seed: number, spire: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: spire ? 150 : 110 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  const GLASS = alpha(hex('#243a52'), 0.88);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the nave body + steep roof (ridge along u)
  iso.box(u0 + 0.06, v0, u1 - 0.34, v1, 0, 40, SAND);
  iso.gable(u0 + 0.06, v0, u1 - 0.34, v1, 40, 20, 'u', ROOFSL, SAND);
  // lancet windows down the nave flank
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.14 + i * 0.2;
    iso.r.poly([iso.P(u, v1, 12), iso.P(u + 0.08, v1, 12), iso.P(u + 0.08, v1, 28), iso.P(u + 0.04, v1, 33), iso.P(u, v1, 28)], GLASS);
  }
  // a pointed west window in the gable end (+u toward viewer-right)
  // the square corner TOWER (front, toward high u + high v)
  const tu = u1 - 0.22, tv = v1 - 0.22;
  const towerZ = spire ? 78 : 64;
  iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 0, towerZ, SAND);
  iso.box(tu - 0.22, tv - 0.22, tu + 0.22, tv + 0.22, towerZ, towerZ + 5, lighten(SAND, 0.06), { ink: false });
  // belfry louvres on the tower face
  iso.r.poly([iso.P(tu - 0.12, tv + 0.2, towerZ - 22), iso.P(tu + 0.12, tv + 0.2, towerZ - 22), iso.P(tu + 0.12, tv + 0.2, towerZ - 8), iso.P(tu, tv + 0.2, towerZ - 3), iso.P(tu - 0.12, tv + 0.2, towerZ - 8)], GLASS);
  if (spire) {
    // a broached stone spire + corner pinnacles
    const apex = iso.P(tu, tv, towerZ + 56);
    const c0 = iso.P(tu - 0.2, tv + 0.2, towerZ + 5), c1 = iso.P(tu + 0.2, tv + 0.2, towerZ + 5), c2 = iso.P(tu + 0.2, tv - 0.2, towerZ + 5);
    iso.r.poly([c0, c1, apex], shaded(ROOFSL, 0.08));
    iso.r.poly([c1, c2, apex], lit(ROOFSL, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
    for (const [pu, pv] of [[tu - 0.2, tv + 0.2], [tu + 0.2, tv + 0.2]] as const) {
      const pb = iso.P(pu, pv, towerZ + 5);
      iso.r.poly([[pb[0] - 1.8 * RES, pb[1]], [pb[0] + 1.8 * RES, pb[1]], [pb[0], pb[1] - 9 * RES]], lit(SAND, 0.08));
    }
  } else {
    // a battlemented parapet (Christ Church-style square tower)
    for (let i = 0; i < 3; i++) {
      const u = tu - 0.16 + i * 0.16;
      iso.box(u, tv + 0.18, u + 0.08, tv + 0.24, towerZ + 5, towerZ + 11, SAND, { ink: false });
    }
  }
  return iso.build();
}

// =====================================================================
// GEORGIAN TOWN CHURCH (St James') — Greenway's restrained Georgian church: a
// plain warm-brick + stone body with round-headed windows and a slim COPPER
// SPIRE over a square tower at one end. 2×2, towers in headroom. NEW draw.
// =====================================================================
function georgianChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = hex('#c08a63'); // Greenway's warm brick
  iso.box(u0 + 0.04, v0, u1 - 0.3, v1, 0, 34, WALL);
  iso.box(u0 + 0.02, v0 - 0.02, u1 - 0.28, v0 + 0.02, 0, 7, SAND_D, { ink: false });
  // round-headed Georgian windows down the flank
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.14 + i * 0.22;
    const poly: Pt[] = [iso.P(u, v1, 10), iso.P(u, v1, 24)];
    for (let j = 0; j <= 4; j++) { const t = j / 4; poly.push(iso.P(u + 0.12 * t, v1, 24 + Math.sin(t * Math.PI) * 4)); }
    poly.push(iso.P(u + 0.12, v1, 24), iso.P(u + 0.12, v1, 10));
    iso.r.poly(poly, alpha(hex('#2c3a4a'), 0.82));
  }
  // a plain hipped roof
  iso.hip(u0 + 0.04, v0, u1 - 0.3, v1, 34, 12, ROOFSL);
  // the square tower (toward +u/+v) carrying the slim COPPER SPIRE
  const tu = u1 - 0.2, tv = v1 - 0.2;
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.18, 0, 56, SAND);
  iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 56, 62, lighten(SAND, 0.06), { ink: false });
  // a clock face on the tower
  const [clx, cly] = iso.P(tu, tv + 0.18, 48);
  const CR = 3.2 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push([clx + Math.cos(a) * CR, cly - CR + Math.sin(a) * CR]); }
  iso.r.poly(ring, COLORS.white); iso.r.polyline(ring, INK_W * 0.5, INK, true);
  // the slim verdigris-copper octagonal spire + ball finial
  const apex = iso.P(tu, tv, 132);
  const c0 = iso.P(tu - 0.18, tv + 0.18, 62), c1 = iso.P(tu + 0.18, tv + 0.18, 62), c2 = iso.P(tu + 0.18, tv - 0.18, 62);
  iso.r.poly([c0, c1, apex], shaded(COPPER, 0.06));
  iso.r.poly([c1, c2, apex], lit(COPPER, 0.08));
  iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
  iso.glint([apex[0], apex[1] + 2 * RES], 1.4 * RES);
  return iso.build();
}

// =====================================================================
// SCOTS CHURCH — the unusual stacked landmark: a Gothic sandstone church at
// street level with a slim modern glass APARTMENT TOWER rising right out of
// its roof (built 2005 over the 1929 church). 2×2, big headroom. NEW draw.
// =====================================================================
function scotsChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 260 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the Gothic church base in sandstone
  iso.box(u0, v0, u1, v1, 0, 42, SAND);
  iso.gable(u0 + 0.05, v0, u1 - 0.05, v1 - 0.3, 42, 16, 'u', ROOFSL, SAND);
  // a pointed tracery window on the front gable
  iso.r.poly([iso.P(u0 + 0.55, v1, 14), iso.P(u0 + 0.85, v1, 14), iso.P(u0 + 0.85, v1, 30), iso.P(u0 + 0.7, v1, 38), iso.P(u0 + 0.55, v1, 30)], alpha(hex('#243a52'), 0.85));
  // a small corner pinnacle turret
  iso.box(u0 + 0.04, v1 - 0.24, u0 + 0.24, v1, 0, 56, SAND);
  const pb = iso.P(u0 + 0.14, v1, 56);
  iso.r.poly([[pb[0] - 3 * RES, pb[1]], [pb[0] + 3 * RES, pb[1]], [pb[0], pb[1] - 14 * RES]], shaded(ROOFSL, 0.05));
  // the slim modern glass APARTMENT TOWER rising from the church roof
  const cu = (u0 + u1) / 2 + 0.1, cv = (v0 + v1) / 2;
  towerShaft(iso, cu, cv, 0.28, 0.24, 50, 218, GLASSB_L, { litGlass: true });
  iso.box(cu - 0.24, cv - 0.2, cu + 0.24, cv + 0.2, 218, 226, lighten(GLASSB_L, 0.06), { ink: false });
  return iso.build();
}

// =====================================================================
// ATMOSPHERIC THEATRE (Capitol) — a grand picture-palace: a wide rendered
// facade with a deep marquee canopy, arched feature window, the fly-tower
// behind. NEW draw (distinct from the Deco theatre). 2×2.
// =====================================================================
function picturePalaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.38, u1 = 1.62, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = hex('#d9c3a0'); // warm rendered stone
  iso.box(u0, v0, u1, v1, 0, 44, WALL);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 9, shaded(WALL, 0.12), { ink: false });
  // a tall arched feature window over the entrance
  const cm = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(cm - 0.2, v1, 18), iso.P(cm - 0.2, v1, 32)];
  for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(cm - 0.2 + 0.4 * t, v1, 32 + Math.sin(t * Math.PI) * 8)); }
  poly.push(iso.P(cm + 0.2, v1, 32), iso.P(cm + 0.2, v1, 18));
  iso.r.poly(poly, alpha(hex('#2b3a48'), 0.82));
  // side windows
  iso.windowsLeft(v1, u0 + 0.1, cm - 0.3, 16, 34, 2, alpha(hex('#33414e'), 0.7), WALL);
  iso.windowsLeft(v1, cm + 0.3, u1 - 0.1, 16, 34, 2, alpha(hex('#33414e'), 0.7), WALL);
  // a parapet cornice
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 44, 50, lighten(WALL, 0.06), { topC: top(WALL, 0.2) });
  // the deep illuminated MARQUEE canopy over the footpath
  iso.box(u0 + 0.1, v1, u1 - 0.1, v1 + 0.34, 14, 19, hex('#7a2d2d'));
  iso.r.line(iso.P(u0 + 0.12, v1 + 0.32, 15), iso.P(u1 - 0.12, v1 + 0.32, 15), 1.4 * RES, alpha(GILT_HOT, 0.85));
  // the fly-tower behind
  iso.box(u0 + 0.3, v0 + 0.1, u1 - 0.3, v0 + 0.5, 44, 72, shaded(WALL, 0.06));
  return iso.build();
}

// =====================================================================
// ART-DECO THEATRE (Enmore) — a suburban picture palace: a stepped Deco
// parapet facade in cream + a tall vertical blade SIGN and a projecting
// illuminated marquee. 1×1. NEW draw.
// =====================================================================
function decoTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.2, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  iso.box(u0, v0, u1, v1, 0, 40, DECO_CREAM);
  // a stepped Deco parapet
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 40, 48, lighten(DECO_CREAM, 0.04), { ink: false });
  iso.box(u0 + 0.22, v0 + 0.22, u1 - 0.22, v1 - 0.22, 48, 56, lighten(DECO_CREAM, 0.06), { ink: false });
  // vertical Deco pilaster grooves on the front
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.1 + i * 0.18;
    iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, 38), 0.8 * RES, alpha(shaded(DECO_CREAM, 0.16), 0.7));
  }
  // the tall vertical BLADE sign projecting from the corner
  const [bx, by] = iso.P(u1 - 0.1, v1, 24);
  iso.r.rect(bx - 1.6 * RES, by - 60 * RES, bx + 1.6 * RES, by + 8 * RES, hex('#b83b3b'));
  iso.r.rect(bx - 0.8 * RES, by - 58 * RES, bx + 0.8 * RES, by + 6 * RES, alpha(GILT_HOT, 0.8)); // lit letters strip
  // the projecting marquee canopy
  iso.box(u0 + 0.06, v1, u1 - 0.06, v1 + 0.18, 12, 16, hex('#6f2a2a'));
  iso.r.line(iso.P(u0 + 0.08, v1 + 0.16, 13), iso.P(u1 - 0.08, v1 + 0.16, 13), 1.2 * RES, alpha(GILT_HOT, 0.85));
  return iso.build();
}

// =====================================================================
// WHARF THEATRE (Roslyn Packer) — a converted Walsh Bay finger-wharf cargo
// store: a long low timber-and-corrugated shed gable-end-on to the water with
// a glazed foyer, set on piles. 3×3. NEW draw.
// =====================================================================
function wharfTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  const u0 = 0.4, u1 = 2.6, v0 = 0.7, v1 = 2.4;
  // piles
  for (let i = 0; i <= 7; i++) { const u = u0 + (i * (u1 - u0)) / 7; iso.r.line(iso.P(u, v1 + 0.08, 0), iso.P(u, v1 + 0.08, 6), 0.9 * RES, alpha(TIMBER_D, 0.7)); }
  iso.box(u0, v0, u1, v1, 5, 8, shaded(TIMBER, 0.1), { ink: false });
  // the long shed body in timber
  iso.box(u0 + 0.12, v0 + 0.08, u1 - 0.12, v1 - 0.08, 8, 34, TIMBER);
  // a big glazed FOYER slot at the gable end (+u, toward the viewer)
  iso.r.poly([iso.P(u1 - 0.12, v0 + 0.3, 10), iso.P(u1 - 0.12, v1 - 0.3, 10), iso.P(u1 - 0.12, v1 - 0.3, 32), iso.P(u1 - 0.12, v0 + 0.3, 32)], alpha(COLORS.glassLit, 0.5));
  // timber boarding lines on the flank
  iso.windowsLeft(v1 - 0.08, u0 + 0.2, u1 - 0.4, 12, 28, 8, alpha(hex('#33414e'), 0.7), lighten(TIMBER, 0.06));
  // the long gabled corrugated roof (ridge along u)
  ridgeRoofU(iso, u0 + 0.1, v0 + 0.05, u1 - 0.1, v1 - 0.05, 34, 16, hex('#6f5f4c'));
  return iso.build();
}

// =====================================================================
// HORDERN PAVILION — the classical Moore Park exhibition hall: a broad
// rendered hall with a grand arched/colonnaded entrance front under a low
// pediment, a big barrel-vaulted roof behind. 2×2. NEW draw.
// =====================================================================
function pavilionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = hex('#e0d4bd'); // rendered cream classicism
  iso.box(u0, v0, u1, v1, 0, 34, WALL);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(WALL, 0.12), { ink: false });
  // a grand triple-arched entrance front
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.18 + i * 0.36;
    const poly: Pt[] = [iso.P(u, v1, 8), iso.P(u, v1, 22)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.26 * t, v1, 22 + Math.sin(t * Math.PI) * 7)); }
    poly.push(iso.P(u + 0.26, v1, 22), iso.P(u + 0.26, v1, 8));
    iso.r.poly(poly, alpha(hex('#2b3a48'), 0.8));
  }
  // entablature + a low pediment over the centre
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 34, 40, lighten(WALL, 0.06), { topC: top(WALL, 0.2) });
  pediment(iso, v1, u0 + 0.3, u1 - 0.3, 40, 9, WALL);
  // the big barrel-vault roof behind (a low curved ridge)
  const rb0 = iso.P(u0 + 0.1, v0 + 0.15, 40), rb1 = iso.P(u1 - 0.1, v0 + 0.15, 40);
  const rTop: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; rTop.push([rb0[0] + (rb1[0] - rb0[0]) * t, rb0[1] + (rb1[1] - rb0[1]) * t - Math.sin(t * Math.PI) * 16 * RES]); }
  iso.r.poly([rb0, ...rTop, rb1], shaded(hex('#b9aa8c'), 0.05));
  iso.r.polyline(rTop, INK_W * 0.5, alpha(INK, 0.7));
  return iso.build();
}

// =====================================================================
// SEA LIFE AQUARIUM — the Darling Harbour aquarium: a low blue pavilion with a
// big curved/vaulted glazed roof over the oceanarium, a glowing harbour-side
// entrance, set at the water's edge (the tanks float in the harbour). 4×4.
// NEW draw.
// =====================================================================
function aquariumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 120 });
  void seed;
  iso.floor(shaded(HARBOUR, 0.05), lit(HARBOUR, 0.06));
  const u0 = 0.5, u1 = 3.5, v0 = 1.0, v1 = 3.3;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // a low blue base hall
  iso.box(u0, v0, u1, v1, 0, 26, hex('#2f6aa0'));
  iso.r.poly([iso.P(u0 + 0.2, v1, 5), iso.P(u1 - 0.2, v1, 5), iso.P(u1 - 0.2, v1, 23), iso.P(u0 + 0.2, v1, 23)], alpha(COLORS.glassLit, 0.45));
  // the great curved GLAZED vault roof over the oceanarium: two big deep barrel
  // vaults running along v, their curved glazed flanks catching the sky
  const cv0 = v0 + 0.15, cv1 = v1 - 0.15;
  const vaultBase = 26, rise = 44 * RES;
  for (let seg = 0; seg < 2; seg++) {
    const ua = u0 + 0.4 + seg * 1.45;
    const ub = ua + 1.25;
    const um = (ua + ub) / 2;
    // the curved front glazed face (an arch profile across u, full depth in v)
    const left = iso.P(ua, cv1, vaultBase), right = iso.P(ub, cv1, vaultBase);
    const apex = iso.P(um, cv1, vaultBase) ;
    const arc: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; arc.push([left[0] + (right[0] - left[0]) * t, left[1] + (right[1] - left[1]) * t - Math.sin(t * Math.PI) * rise]); }
    iso.r.poly([left, ...arc, right], alpha(COLORS.glassSky, 0.78));
    // glazing mullion ribs following the arch curve (short ticks, not full verticals)
    for (let i = 2; i < 11; i += 2) { const t = i / 12; const ax = left[0] + (right[0] - left[0]) * t; const ay = left[1] + (right[1] - left[1]) * t - Math.sin(t * Math.PI) * rise; iso.r.line([ax, ay], [ax, ay + 8 * RES], 0.4 * RES, alpha(SHELL, 0.45)); }
    // the crisp roof ridge running back in v (apex line)
    const apexFront: Pt = [apex[0], apex[1] - rise];
    const apexBack = iso.P(um, cv0, vaultBase); const apexBackTop: Pt = [apexBack[0], apexBack[1] - rise];
    iso.r.poly([apexFront, apexBackTop, iso.P(ua, cv0, vaultBase), iso.P(ua, cv1, vaultBase)], alpha(shaded(hex('#2f6aa0'), 0.04), 0.9)); // shaded back slope
    iso.r.line(apexFront, apexBackTop, INK_W * 0.6, INK);
    iso.r.polyline(arc, INK_W * 0.55, INK);
  }
  return iso.build();
}

// =====================================================================
// FEDERATION-BRICK CIVIC (Sydney Dental Hospital / Seymour Centre / Justice &
// Police Museum) — a parameterised Federation/Edwardian institutional block:
// red brick with sandstone dressings, a hipped roof, a central gabled bay.
// `modern` swaps to a 1970s brown-brick performing-arts block. 2×2. NEW draw.
// =====================================================================
function federationBrickTile(seed: number, modern: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = modern ? hex('#8a6a52') : hex('#a85a44'); // 70s brown vs Federation red
  iso.box(u0, v0, u1, v1, 0, modern ? 50 : 42, WALL);
  // sandstone base band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, SAND, { ink: false });
  if (modern) {
    // a recessed glazed entrance + brick fins (Seymour Centre idiom)
    iso.r.poly([iso.P(u0 + 0.4, v1, 6), iso.P(u0 + 0.8, v1, 6), iso.P(u0 + 0.8, v1, 46), iso.P(u0 + 0.4, v1, 46)], alpha(COLORS.glassLit, 0.45));
    for (let i = 0; i < 5; i++) { const u = u0 + 0.85 + i * 0.13; iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, 46), 1 * RES, alpha(shaded(WALL, 0.2), 0.7)); }
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 50, 54, shaded(COLORS.concrete, 0.04), { ink: false });
  } else {
    // rows of sash windows + sandstone string-courses, a central gabled bay
    for (let row = 0; row < 3; row++) iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 14 + row * 9, 14 + row * 9 + 6, 6, alpha(hex('#33414e'), 0.78), SAND);
    iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 42, 14, ROOFSL);
    // central gabled entrance bay with sandstone surround
    const cm = (u0 + u1) / 2;
    iso.box(cm - 0.22, v1 - 0.06, cm + 0.22, v1, 0, 46, lighten(WALL, 0.03));
    const ga = iso.P(cm - 0.22, v1, 46), gb = iso.P(cm + 0.22, v1, 46), gt = iso.P(cm, v1, 60);
    iso.r.poly([ga, gb, gt], lit(ROOFSL, 0.05));
    iso.r.polyline([ga, gt, gb], INK_W * 0.7, INK);
  }
  return iso.build();
}

// =====================================================================
// TARONGA ZOO — the famous Art-Deco harbourside ZOO ENTRANCE: a symmetrical
// rendered gateway with two pylon towers flanking the arched entry, low
// flanking wings, set in bushland on the hill. 1×1. NEW draw.
// =====================================================================
function zooGateTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const u0 = 0.12, u1 = 0.88, v0 = 0.3, v1 = 0.82;
  iso.floor(shaded(COLORS.grass, 0.1), lit(COLORS.grass, 0.04));
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const WALL = hex('#e2d3b6');
  // low flanking wings
  iso.box(u0, v0 + 0.1, u1, v1, 0, 18, WALL);
  // two Deco pylon towers
  for (const tu of [u0 + 0.12, u1 - 0.12] as const) {
    iso.box(tu - 0.08, v1 - 0.14, tu + 0.08, v1, 0, 42, lighten(WALL, 0.03));
    iso.box(tu - 0.06, v1 - 0.1, tu + 0.06, v1, 42, 48, lighten(WALL, 0.06), { ink: false });
    // a Deco fluting line
    iso.r.line(iso.P(tu, v1, 8), iso.P(tu, v1, 40), 1 * RES, alpha(shaded(WALL, 0.16), 0.7));
  }
  // the arched ENTRY between the pylons
  const cm = (u0 + u1) / 2;
  const poly: Pt[] = [iso.P(cm - 0.16, v1, 4), iso.P(cm - 0.16, v1, 18)];
  for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(cm - 0.16 + 0.32 * t, v1, 18 + Math.sin(t * Math.PI) * 8)); }
  poly.push(iso.P(cm + 0.16, v1, 18), iso.P(cm + 0.16, v1, 4));
  iso.r.poly(poly, alpha(hex('#2a3a30'), 0.85));
  // a signboard across the wings
  iso.r.rect(iso.P(cm, v1, 28)[0] - 16 * RES, iso.P(cm, v1, 28)[1] - 2 * RES, iso.P(cm, v1, 28)[0] + 16 * RES, iso.P(cm, v1, 28)[1] + 2 * RES, alpha(GILT_HOT, 0.6));
  return iso.build();
}

// =====================================================================
// FEDERATION PAVILION — the small domed commemorative pavilion in Centennial
// Park: an octagonal classical temple with eight columns and a copper-green
// cupola dome (built over the 1901 Federation site). 1×1. NEW draw.
// =====================================================================
function memorialPavilionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const cu = 0.5, cv = 0.52;
  iso.floor(shaded(COLORS.grass, 0.1), lit(COLORS.grass, 0.04));
  iso.shadow(cu - 0.22, cv - 0.12, cu + 0.22, cv + 0.24, 0.3, 0.22);
  // a stepped circular base
  iso.box(cu - 0.26, cv - 0.26, cu + 0.26, cv + 0.26, 0, 8, shaded(SAND, 0.04), { ink: false });
  iso.box(cu - 0.22, cv - 0.22, cu + 0.22, cv + 0.22, 8, 12, lighten(SAND, 0.04), { ink: false });
  // a ring of eight slim columns
  const colZ0 = 12, colZ1 = 40;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const u = cu + Math.cos(a) * 0.18, v = cv + Math.sin(a) * 0.18;
    if (v < cv - 0.1) continue; // hide the far-back columns behind the dome
    const b = iso.P(u, v, colZ0), t = iso.P(u, v, colZ1);
    iso.r.line([b[0], b[1]], [t[0], t[1]], 1.6 * RES, i % 2 ? COLORS.white : lighten(COLORS.white, 0.04));
  }
  // the entablature ring
  iso.box(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, colZ1, colZ1 + 5, lighten(SAND, 0.06), { ink: false });
  // the copper-green cupola dome + finial
  const { tipX, tipY } = copperDome(iso, cu, cv, colZ1 + 5, 0.2 * (CELL_W / 2), 26 * RES, COPPER);
  iso.r.line([tipX, tipY], [tipX, tipY - 8 * RES], 1 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 3 * RES], 1.4 * RES);
  return iso.build();
}

// =====================================================================
// WHITE BAY POWER STATION — the heritage brick power station: a tall blocky
// red-brick turbine HALL with industrial steel-framed windows and a pair of
// great brick CHIMNEYS rising above it on the bay. 1×1, headroom for stacks.
// NEW draw.
// =====================================================================
function powerStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.22, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  const BR = hex('#9a5440'); // sooty brick-red
  // the big turbine hall block
  iso.box(u0, v0, u1, v1, 0, 70, BR);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 9, shaded(BR, 0.14), { ink: false });
  // tall industrial steel-framed windows (gridded glazing)
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.1 + i * 0.18;
    iso.r.poly([iso.P(u, v1, 12), iso.P(u + 0.12, v1, 12), iso.P(u + 0.12, v1, 60), iso.P(u, v1, 60)], alpha(hex('#33414e'), 0.78));
    // mullion grid
    for (let z = 18; z < 60; z += 10) iso.r.line(iso.P(u, v1, z), iso.P(u + 0.12, v1, z), 0.4 * RES, alpha(STEELB_L, 0.5));
  }
  // a brick parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 70, 76, lighten(BR, 0.04), { ink: false });
  // the two great CHIMNEYS
  for (const [cu, cvv, h] of [[u0 + 0.22, v0 + 0.2, 150], [u0 + 0.5, v0 + 0.3, 132]] as const) {
    iso.box(cu - 0.06, cvv - 0.06, cu + 0.06, cvv + 0.06, 70, h, shaded(BR, 0.03));
    iso.box(cu - 0.07, cvv - 0.07, cu + 0.07, cvv + 0.07, h, h + 5, lighten(BR, 0.04), { ink: false });
    // a soot band near the top
    iso.r.line(iso.P(cu - 0.06, cvv + 0.06, h - 16), iso.P(cu + 0.06, cvv + 0.06, h - 16), 1.2 * RES, alpha(darken(BR, 0.2), 0.6));
  }
  return iso.build();
}

// =====================================================================
// CADMAN'S COTTAGE — Sydney's OLDEST surviving house: a tiny symmetrical
// Georgian sandstone cottage, a hipped roof, central door, four-pane sash
// windows, on the harbour edge at the Rocks. 1×1. NEW draw.
// =====================================================================
function cottageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const u0 = 0.22, u1 = 0.8, v0 = 0.3, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 22, hex('#ddc9a3')); // pale sandstone
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, shaded(SAND, 0.1), { ink: false });
  // a symmetrical front: door + two flanking sash windows
  const cm = (u0 + u1) / 2;
  iso.r.poly([iso.P(cm - 0.05, v1, 4), iso.P(cm + 0.05, v1, 4), iso.P(cm + 0.05, v1, 16), iso.P(cm - 0.05, v1, 16)], alpha(hex('#5a3c28'), 0.85)); // door
  for (const wu of [u0 + 0.1, u1 - 0.18] as const) iso.r.poly([iso.P(wu, v1, 8), iso.P(wu + 0.08, v1, 8), iso.P(wu + 0.08, v1, 16), iso.P(wu, v1, 16)], alpha(hex('#33414e'), 0.8));
  // a steep hipped roof
  iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 22, 12, hex('#8a5a3a'));
  // a little chimney
  iso.box(u0 + 0.36, v0 + 0.1, u0 + 0.46, v0 + 0.2, 22, 36, hex('#c8a276'), { ink: false });
  return iso.build();
}

// =====================================================================
// COMMERCIAL HERITAGE BANK / OFFICE — parameterised early-20thC masonry block:
//   'pink'  — the State Savings Bank "pink palace": a monumental classical
//             banking hall, giant order of engaged columns, attic storey.
//   'gothic'— Federation Gothic-skyscraper (Grace Building): a stepped tower
//             with vertical gothic piers + small corner pinnacle turrets.
//   'comm'  — restrained Edwardian commercial block (Perpetual Trustee).
// 2×2, the gothic one towers. NEW draw.
// =====================================================================
type BankKind = 'pink' | 'gothic' | 'comm';
function heritageBankTile(seed: number, kind: BankKind): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: kind === 'gothic' ? 240 : 110 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);

  if (kind === 'pink') {
    const W = PINKSTONE;
    iso.box(u0, v0, u1, v1, 0, 58, W);
    iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 14, PINKSTONE_D, { ink: false }); // rusticated base
    // a giant order of engaged columns across the front
    colonnade(iso, v1, u0 + 0.14, u1 - 0.14, 14, 50, 8, lighten(W, 0.04));
    // deep entablature + attic storey
    iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 58, 64, lighten(W, 0.06), { topC: top(W, 0.18) });
    iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 64, 76, W);
    iso.windowsLeft(v1 - 0.06, u0 + 0.16, u1 - 0.16, 66, 73, 6, alpha(hex('#33414e'), 0.6), W);
  } else if (kind === 'gothic') {
    const W = hex('#cdb79a'); // pale stone
    // a stepped tower with strong vertical gothic piers
    iso.box(u0, v0, u1, v1, 0, 120, W);
    iso.box(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1, 120, 170, lighten(W, 0.03));
    iso.box(u0 + 0.22, v0 + 0.22, u1 - 0.22, v1 - 0.22, 170, 196, lighten(W, 0.05));
    // continuous vertical piers up the two visible faces (the gothic-skyscraper read)
    for (let i = 0; i <= 6; i++) {
      const u = u0 + (i * (u1 - u0)) / 6;
      iso.r.line(iso.P(u, v1, 10), iso.P(u, v1, 116), 1 * RES, alpha(shaded(W, 0.2), 0.75));
    }
    for (let i = 0; i <= 6; i++) {
      const v = v0 + (i * (v1 - v0)) / 6;
      iso.r.line(iso.P(u1, v, 10), iso.P(u1, v, 116), 0.7 * RES, alpha(shaded(W, 0.16), 0.6));
    }
    // small corner pinnacle turrets crowning the top step
    for (const [pu, pv] of [[u0 + 0.24, v1 - 0.24], [u1 - 0.24, v1 - 0.24], [u1 - 0.24, v0 + 0.24]] as const) {
      const pb = iso.P(pu, pv, 196);
      iso.r.poly([[pb[0] - 2.4 * RES, pb[1]], [pb[0] + 2.4 * RES, pb[1]], [pb[0], pb[1] - 14 * RES]], lit(W, 0.06));
    }
  } else {
    const W = hex('#d3c0a0');
    iso.box(u0, v0, u1, v1, 0, 56, W);
    iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(W, 0.12), { ink: false });
    // arched ground floor + ranks of windows above
    for (let i = 0; i < 4; i++) {
      const u = u0 + 0.12 + i * 0.24;
      const poly: Pt[] = [iso.P(u, v1, 12), iso.P(u, v1, 22)];
      for (let j = 0; j <= 4; j++) { const t = j / 4; poly.push(iso.P(u + 0.14 * t, v1, 22 + Math.sin(t * Math.PI) * 4)); }
      poly.push(iso.P(u + 0.14, v1, 22), iso.P(u + 0.14, v1, 12));
      iso.r.poly(poly, alpha(hex('#2b3a48'), 0.8));
    }
    for (let row = 0; row < 3; row++) iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 28 + row * 8, 28 + row * 8 + 5, 5, alpha(hex('#33414e'), 0.7), W);
    iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 56, 61, lighten(W, 0.06), { topC: top(W, 0.2) });
  }
  return iso.build();
}

// =====================================================================
// AMP / QUAY QUARTER TOWER — the radically re-formed harbour tower: a stack of
// five shifted glass VOLUMES, each rotated/cantilevered off the one below
// (Sydney's "vertical village"), an atrium seam up one face. 2×2, big
// headroom. NEW draw.
// =====================================================================
function quayQuarterTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  const cu = 1.0, cv = 1.02;
  iso.shadow(cu - 0.34, cv - 0.2, cu + 0.34, cv + 0.34, 0.42, 0.26);
  iso.box(cu - 0.4, cv - 0.4, cu + 0.4, cv + 0.4, 0, 18, shaded(SAND, 0.06), { ink: false }); // podium
  // five stacked volumes, each shifted in u (cantilevering toward the harbour)
  const body = hex('#5c87b8'); // cool harbour glass
  const vols: ReadonlyArray<readonly [number, number, number]> = [
    [18, 60, -0.04], [60, 100, 0.06], [100, 142, -0.02], [142, 186, 0.08], [186, 226, 0.02],
  ];
  for (const [z0, z1, shift] of vols) {
    const c = cu + shift;
    towerShaft(iso, c, cv, 0.26, 0.24, z0, z1, body, { litGlass: true });
    // expose the cantilever underside as a thin shaded slab
    iso.box(c - 0.26, cv - 0.24, c + 0.26, cv + 0.24, z0, z0 + 4, shaded(body, 0.16), { ink: false });
  }
  // the glazed atrium seam (a brighter vertical strip up the front-right)
  iso.r.line(iso.P(cu + 0.2, cv + 0.24, 20), iso.P(cu + 0.24, cv + 0.24, 224), 1.4 * RES, alpha(COLORS.glassLit, 0.5));
  iso.box(cu - 0.2, cv - 0.2, cu + 0.2, cv + 0.2, 226, 234, lighten(body, 0.06), { ink: false });
  return iso.build();
}

// =====================================================================
// CAPITA CENTRE — Harry Seidler's tower: a sheer rectilinear shaft with a
// single dramatic EXTERNAL ROUND COLUMN running its full height up one side
// and a tall slender mast/SPIRE. 2×2, big headroom. NEW draw.
// =====================================================================
function capitaCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 300 });
  void seed;
  const cu = 1.0, cv = 1.02;
  iso.shadow(cu - 0.3, cv - 0.18, cu + 0.3, cv + 0.3, 0.42, 0.26);
  iso.box(cu - 0.4, cv - 0.4, cu + 0.4, cv + 0.4, 0, 16, shaded(SAND, 0.06), { ink: false });
  // the sheer shaft
  towerShaft(iso, cu, cv, 0.24, 0.22, 16, 200, hex('#9fb0c2'), { litGlass: true });
  // the single bold external white round COLUMN up the front-left corner
  const cb = iso.P(cu - 0.24, cv + 0.22, 16), ct = iso.P(cu - 0.24, cv + 0.22, 214);
  iso.r.line(cb, ct, 3 * RES, COLORS.white);
  iso.r.line([cb[0] + 1.4 * RES, cb[1]], [ct[0] + 1.4 * RES, ct[1]], 1 * RES, alpha(shaded(COLORS.white, 0.1), 0.6));
  // the flat cap + the slender mast/spire
  iso.box(cu - 0.2, cv - 0.18, cu + 0.2, cv + 0.18, 200, 208, lighten(hex('#9fb0c2'), 0.06), { ink: false });
  const tp = iso.P(cu + 0.1, cv, 208);
  iso.r.line(tp, [tp[0], tp[1] - 48 * RES], 1.2 * RES, STEELB_L);
  iso.glint([tp[0], tp[1] - 48 * RES], 1.6 * RES);
  return iso.build();
}

// =====================================================================
// UTS TOWER — the brutalist concrete monolith: a sheer rectilinear board-marked
// concrete SLAB with deep regular window recesses, a heavy projecting top, on
// a podium at Broadway. 3×3, towers in headroom. NEW draw.
// =====================================================================
function utsTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 240 });
  void seed;
  const cu = 1.5, cv = 1.5;
  iso.shadow(cu - 0.6, cv - 0.4, cu + 0.6, cv + 0.6, 0.4, 0.26);
  // a low podium
  iso.box(cu - 0.8, cv - 0.8, cu + 0.8, cv + 0.8, 0, 22, shaded(COLORS.concrete, 0.08), { ink: false });
  // the sheer concrete slab tower
  const CC = hex('#9c958a'); // weathered board-marked concrete
  iso.box(cu - 0.46, cv - 0.4, cu + 0.46, cv + 0.4, 22, 196, CC, {
    leftC: shaded(CC, 0.1), rightC: lit(CC, 0.05), topC: top(CC, 0.16),
  });
  // deep regular window-recess grid on the two visible faces (the brutalist read)
  for (let z = 36; z < 188; z += 12) {
    iso.r.line(iso.P(cu - 0.44, cv + 0.4, z), iso.P(cu + 0.44, cv + 0.4, z), 1 * RES, alpha(shaded(CC, 0.22), 0.7));
    iso.r.line(iso.P(cu + 0.46, cv - 0.38, z), iso.P(cu + 0.46, cv + 0.38, z), 0.7 * RES, alpha(shaded(CC, 0.18), 0.6));
  }
  for (let i = 1; i < 6; i++) {
    const u = cu - 0.44 + (0.88 * i) / 6;
    iso.r.line(iso.P(u, cv + 0.4, 36), iso.P(u, cv + 0.4, 188), 0.6 * RES, alpha(shaded(CC, 0.18), 0.55));
  }
  // the heavy projecting top storey (the plant-room crown)
  iso.box(cu - 0.5, cv - 0.44, cu + 0.5, cv + 0.44, 196, 210, shaded(CC, 0.06));
  return iso.build();
}

// =====================================================================
// DR CHAU CHAK WING — Gehry's "crumpled paper bag": an irregular sculptural
// brick mass whose front face BULGES and undulates in stepped brick courses,
// with large angular glass openings. 2×2, towers a little. NEW draw.
// =====================================================================
function gehryBrickTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const BR = hex('#c08a5e'); // the custom golden-brown brick
  const topZ = 70;
  // a base box
  iso.box(u0, v0, u1, v1, 0, topZ, BR);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(BR, 0.12), { ink: false });
  // the UNDULATING front face: redraw the v1 face as stacked horizontal brick
  // courses that bulge outward by a sine wave in z (the crumpled read)
  for (let z = 8; z < topZ; z += 5) {
    const bulge = Math.sin((z / topZ) * Math.PI * 2.2) * 0.06; // outward in v
    const a = iso.P(u0 + 0.04, v1 + bulge, z), b = iso.P(u1 - 0.04, v1 + bulge, z);
    iso.r.line(a, b, 1.4 * RES, z % 10 < 5 ? lit(BR, 0.05) : shaded(BR, 0.06));
  }
  // a couple of big angular glass openings punched into the bulge
  iso.r.poly([iso.P(u0 + 0.2, v1 + 0.04, 24), iso.P(u0 + 0.5, v1 + 0.05, 22), iso.P(u0 + 0.5, v1 + 0.05, 44), iso.P(u0 + 0.2, v1 + 0.04, 42)], alpha(COLORS.glassLit, 0.5));
  iso.r.poly([iso.P(u1 - 0.5, v1 + 0.02, 30), iso.P(u1 - 0.22, v1 + 0.01, 32), iso.P(u1 - 0.22, v1 + 0.01, 52), iso.P(u1 - 0.5, v1 + 0.02, 50)], alpha(COLORS.glassSky, 0.5));
  // an irregular stepped parapet (no clean cornice — Gehry)
  iso.box(u0 + 0.06, v0 + 0.04, u1 - 0.2, v1 - 0.1, topZ, topZ + 10, shaded(BR, 0.04));
  iso.box(u0 + 0.3, v0 + 0.2, u1 - 0.06, v1 - 0.3, topZ, topZ + 18, lighten(BR, 0.03));
  return iso.build();
}

// =====================================================================
// ACADEMIC-GOTHIC HALL (Great Hall, University of Sydney) — a Victorian
// Academic-Gothic hall: a long buttressed sandstone hall with a steep roof,
// tall traceried windows, pinnacled buttresses and a crocketed end gable with
// a great perpendicular window. 1×1 (but a tall, rich silhouette). NEW draw.
// =====================================================================
function greatHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const u0 = 0.12, u1 = 0.88, v0 = 0.22, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, SAND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(SAND, 0.1), { ink: false });
  // tall traceried windows + pinnacled buttresses down the flank
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.1 + i * 0.19;
    // buttress
    iso.box(u - 0.02, v1 - 0.02, u + 0.02, v1 + 0.04, 0, 52, lighten(SAND, 0.03), { ink: false });
    const pb = iso.P(u, v1 + 0.02, 52);
    iso.r.poly([[pb[0] - 1.4 * RES, pb[1]], [pb[0] + 1.4 * RES, pb[1]], [pb[0], pb[1] - 8 * RES]], lit(SAND, 0.06)); // pinnacle
    // traceried window between buttresses
    iso.r.poly([iso.P(u + 0.04, v1, 12), iso.P(u + 0.13, v1, 12), iso.P(u + 0.13, v1, 34), iso.P(u + 0.085, v1, 40), iso.P(u + 0.04, v1, 34)], alpha(hex('#243a52'), 0.86));
  }
  // the steep gabled roof (ridge along u)
  iso.gable(u0 + 0.04, v0, u1 - 0.04, v1, 46, 26, 'u', ROOFSL, SAND);
  // the crocketed END gable (+u face toward viewer-right) with a great window
  // a great perpendicular window on the front-right gable end
  const gx = iso.P(u1, (v0 + v1) / 2, 30)[0], gy = iso.P(u1, (v0 + v1) / 2, 30)[1];
  iso.r.poly([[gx - 5 * RES, gy], [gx + 5 * RES, gy], [gx + 5 * RES, gy - 16 * RES], [gx, gy - 24 * RES], [gx - 5 * RES, gy - 16 * RES]], alpha(hex('#243a52'), 0.85));
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

  // ============================================================
  // ROUND 2 — MARITIME (the museum fleet, wharves, lighthouse, island)
  // ============================================================
  {
    // the Philip Cox wave-roof maritime museum at Darling Harbour (placed: the
    // HMAS vessels berth here; the museum itself drawn + ready if placed).
    city: 'sydney',
    key: 'australian-national-maritime-museum',
    match: /Australian National Maritime Museum|National Maritime Museum/i,
    foot: [5, 5],
    seed: 4560,
    draw: (seed) => maritimeMuseumTile(seed),
    light: { kind: 'archGlow', topZ: 150, halfW: 1.8 },
  },
  {
    city: 'sydney',
    key: 'hmas-vampire',
    match: /HMAS Vampire/i,
    foot: [3, 3],
    seed: 4561,
    draw: (seed) => destroyerTile(seed),
    // deck-lit warship + the masthead navigation light
    light: { kind: 'aerialBeacon', topZ: 96, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'hmas-onslow',
    match: /HMAS Onslow/i,
    foot: [2, 2],
    seed: 4562,
    draw: (seed) => submarineTile(seed),
    light: { kind: 'aerialBeacon', topZ: 58, halfW: 0.9 },
  },
  {
    city: 'sydney',
    key: 'finger-wharf',
    match: /Finger Wharf|Woolloomooloo Wharf/i,
    foot: [5, 5],
    seed: 4563,
    draw: (seed) => fingerWharfTile(seed),
    light: { kind: 'genericGlow', topZ: 46, halfW: 1.9 },
  },
  {
    city: 'sydney',
    key: 'hornby-lighthouse',
    match: /Hornby Lighthouse/i,
    foot: [1, 1],
    seed: 4564,
    draw: (seed) => lighthouseTile(seed),
    // the rotating lamp beacon at the lantern
    light: { kind: 'aerialBeacon', topZ: 160, halfW: 0.3 },
  },
  {
    city: 'sydney',
    key: 'cockatoo-island',
    match: /Cockatoo Island/i,
    foot: [3, 3],
    seed: 4565,
    draw: (seed) => shipyardIslandTile(seed),
    light: { kind: 'genericGlow', topZ: 92, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'sea-life-sydney-aquarium',
    match: /SEA LIFE Sydney Aquarium|Sydney Aquarium/i,
    foot: [4, 4],
    seed: 4566,
    draw: (seed) => aquariumTile(seed),
    light: { kind: 'rimCycle', topZ: 90, halfW: 1.6 },
  },

  // ============================================================
  // ROUND 2 — PERFORMING ARTS / CIVIC HERITAGE
  // ============================================================
  {
    city: 'sydney',
    key: 'carriageworks',
    match: /Carriageworks/i,
    foot: [5, 5],
    seed: 4570,
    draw: (seed) => carriageworksTile(seed),
    light: { kind: 'genericGlow', topZ: 56, halfW: 1.9 },
  },
  {
    city: 'sydney',
    key: 'roslyn-packer-theatre',
    match: /Roslyn Packer Theatre|Wharf Theatre/i,
    foot: [3, 3],
    seed: 4571,
    draw: (seed) => wharfTheatreTile(seed),
    light: { kind: 'genericGlow', topZ: 56, halfW: 1.3 },
  },
  {
    city: 'sydney',
    key: 'seymour-centre',
    match: /Seymour Centre/i,
    foot: [2, 2],
    seed: 4572,
    draw: (seed) => federationBrickTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 54, halfW: 1.0 },
  },
  {
    // the atmospheric picture-palace (placed: The Enmore Theatre resolves to the
    // Deco theatre below; Capitol's draw is ready if placed).
    city: 'sydney',
    key: 'capitol-theatre',
    match: /Capitol Theatre/i,
    foot: [2, 2],
    seed: 4573,
    draw: (seed) => picturePalaceTile(seed),
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'enmore-theatre',
    match: /Enmore Theatre/i,
    foot: [1, 1],
    seed: 4574,
    draw: (seed) => decoTheatreTile(seed),
    // the vertical neon blade sign + lit marquee
    light: { kind: 'rimCycle', topZ: 84, halfW: 0.5 },
  },
  {
    city: 'sydney',
    key: 'hordern-pavilion',
    match: /Hordern Pavilion/i,
    foot: [2, 2],
    seed: 4575,
    draw: (seed) => pavilionTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'mortuary-station',
    match: /^Mortuary$|Mortuary Station/i,
    foot: [2, 2],
    seed: 4576,
    draw: (seed) => mortuaryStationTile(seed),
    light: { kind: 'facadeFlood', topZ: 116, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'argyle-cut',
    match: /Argyle Cut/i,
    foot: [2, 2],
    seed: 4577,
    draw: (seed) => argyleCutTile(seed),
    light: { kind: 'genericGlow', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'taronga-zoo',
    match: /Taronga Zoo/i,
    foot: [1, 1],
    seed: 4578,
    draw: (seed) => zooGateTile(seed),
    light: { kind: 'facadeFlood', topZ: 48, halfW: 0.5 },
  },
  {
    city: 'sydney',
    key: 'federation-pavilion',
    match: /Federation Pavilion/i,
    foot: [1, 1],
    seed: 4579,
    draw: (seed) => memorialPavilionTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.5 },
  },
  {
    city: 'sydney',
    key: 'sydney-dental-hospital',
    match: /Sydney Dental Hospital/i,
    foot: [2, 2],
    seed: 4580,
    draw: (seed) => federationBrickTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'justice-police-museum',
    match: /Justice (?:&|and) Police Museum/i,
    foot: [2, 2],
    seed: 4581,
    draw: (seed) => federationBrickTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },

  // ============================================================
  // ROUND 2 — CHURCHES (gothic + Georgian + the stacked Scots Church)
  // ============================================================
  {
    city: 'sydney',
    key: 'christ-church-st-laurence',
    match: /Christ Church St\.? Laurence/i,
    foot: [2, 2],
    seed: 4585,
    draw: (seed) => parishChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'st-brigids-church',
    match: /St\.? Brigid'?s? Church/i,
    foot: [2, 2],
    seed: 4586,
    draw: (seed) => parishChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
  {
    // St James' Church (Greenway's Georgian copper spire) — drawn + ready.
    city: 'sydney',
    key: 'st-james-church',
    match: /St\.? James'?\s*Church/i,
    foot: [2, 2],
    seed: 4587,
    draw: (seed) => georgianChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
  {
    // Scots Church (Gothic church under a glass apartment tower) — drawn + ready.
    city: 'sydney',
    key: 'scots-church',
    match: /Scots Church/i,
    foot: [2, 2],
    seed: 4588,
    draw: (seed) => scotsChurchTile(seed),
    light: { kind: 'towerCrown', topZ: 224, halfW: 0.7 },
  },

  // ============================================================
  // ROUND 2 — HARBOURSIDE VILLAS / HOUSES
  // ============================================================
  {
    city: 'sydney',
    key: 'admiralty-house',
    match: /Admiralty House/i,
    foot: [2, 2],
    seed: 4590,
    draw: (seed) => villaTile(seed, 'colonnade'),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'kirribilli-house',
    match: /Kirribilli House/i,
    foot: [2, 2],
    seed: 4591,
    draw: (seed) => villaTile(seed, 'gothic'),
    light: { kind: 'facadeFlood', topZ: 62, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'elizabeth-bay-house',
    match: /Elizabeth Bay House/i,
    foot: [2, 2],
    seed: 4592,
    draw: (seed) => villaTile(seed, 'dome'),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'sydney',
    key: 'cadmans-cottage',
    match: /Cadman'?s? Cottage/i,
    foot: [1, 1],
    seed: 4593,
    draw: (seed) => cottageTile(seed),
    light: { kind: 'facadeFlood', topZ: 34, halfW: 0.5 },
  },

  // ============================================================
  // ROUND 2 — COMMERCIAL / OFFICE TOWERS (heritage banks + modern)
  // ============================================================
  {
    city: 'sydney',
    key: 'awa-tower',
    match: /AWA Tower/i,
    foot: [2, 2],
    seed: 4600,
    draw: (seed) => awaTowerTile(seed),
    // the lattice-mast aerial beacon — Sydney's "little Eiffel"
    light: { kind: 'aerialBeacon', topZ: 266, halfW: 0.6 },
  },
  {
    // State Savings Bank "pink palace" (drawn + ready if placed).
    city: 'sydney',
    key: 'state-savings-bank',
    match: /State Savings Bank|50 Martin Place/i,
    foot: [2, 2],
    seed: 4601,
    draw: (seed) => heritageBankTile(seed, 'pink'),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },
  {
    // Grace Building — Federation Gothic skyscraper (drawn + ready if placed).
    city: 'sydney',
    key: 'grace-building',
    match: /Grace Building|Grace Hotel/i,
    foot: [2, 2],
    seed: 4602,
    draw: (seed) => heritageBankTile(seed, 'gothic'),
    light: { kind: 'towerCrown', topZ: 200, halfW: 0.7 },
  },
  {
    // Perpetual Trustee Company Building (drawn + ready if placed).
    city: 'sydney',
    key: 'perpetual-trustee-building',
    match: /Perpetual Trustee/i,
    foot: [2, 2],
    seed: 4603,
    draw: (seed) => heritageBankTile(seed, 'comm'),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    // AMP Centre / Quay Quarter Tower — cantilevered stack (drawn + ready).
    city: 'sydney',
    key: 'quay-quarter-tower',
    match: /Quay Quarter Tower|AMP Centre/i,
    foot: [2, 2],
    seed: 4604,
    draw: (seed) => quayQuarterTile(seed),
    light: { kind: 'towerCrown', topZ: 234, halfW: 0.7 },
  },
  {
    // ANZ Bank Centre — a glass skyscraper (drawn + ready if placed).
    city: 'sydney',
    key: 'anz-bank-centre',
    match: /ANZ Bank Centre/i,
    foot: [2, 2],
    seed: 4605,
    draw: (seed) => harbourTowerTile(seed, 'plain', 200),
    light: { kind: 'towerCrown', topZ: 220, halfW: 0.7 },
  },
  {
    // Capita Centre — Seidler's external-column + spire tower (drawn + ready).
    city: 'sydney',
    key: 'capita-centre',
    match: /Capita Centre|9 Castlereagh/i,
    foot: [2, 2],
    seed: 4606,
    draw: (seed) => capitaCentreTile(seed),
    light: { kind: 'aerialBeacon', topZ: 250, halfW: 0.6 },
  },

  // ============================================================
  // ROUND 2 — UNIVERSITY / EDUCATION
  // ============================================================
  {
    // UTS Tower — brutalist concrete slab (drawn + ready if placed).
    city: 'sydney',
    key: 'uts-tower',
    match: /UTS Tower|UTS Building 1/i,
    foot: [3, 3],
    seed: 4610,
    draw: (seed) => utsTowerTile(seed),
    light: { kind: 'towerCrown', topZ: 210, halfW: 1.2 },
  },
  {
    // Dr Chau Chak Wing — Gehry's crumpled brick (drawn + ready if placed).
    city: 'sydney',
    key: 'dr-chau-chak-wing',
    match: /Chau Chak Wing/i,
    foot: [2, 2],
    seed: 4611,
    draw: (seed) => gehryBrickTile(seed),
    light: { kind: 'facadeFlood', topZ: 88, halfW: 1.0 },
  },
  {
    // Great Hall of the University of Sydney — Academic Gothic (placed:
    // "University Hall"; the Great Hall draw is the richer landmark).
    city: 'sydney',
    key: 'great-hall-university-of-sydney',
    match: /Great Hall|University Hall/i,
    foot: [1, 1],
    seed: 4612,
    draw: (seed) => greatHallTile(seed),
    light: { kind: 'facadeFlood', topZ: 72, halfW: 0.5 },
  },
  {
    // White Bay Power Station — heritage brick turbine hall + chimneys.
    city: 'sydney',
    key: 'white-bay-power-station',
    match: /White Bay Power Station/i,
    foot: [1, 1],
    seed: 4613,
    draw: (seed) => powerStationTile(seed),
    light: { kind: 'genericGlow', topZ: 150, halfW: 0.5 },
  },
];
