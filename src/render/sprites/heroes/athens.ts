// Athens's bespoke-hero registry — ROUND 1 of the 100-hero target (docs/heroes/
// athens/ holds 100 researched landmarks). Each entry resolves a PLACED name
// from src/data/cities/athens.ts's `named` list (Greek script) to a hand-built
// iso sprite in the game's ink-contour dusk idiom + a bespoke night-
// electrification light. NOTHING here is reused from another city — every draw
// fn is new, built from Iso boxes/prisms/columns so the SILHOUETTE reads as the
// real monument.
//
// THE ATHENS PALETTE: pale Pentelic/Mediterranean MARBLE (warm honey-white that
// floodlights pick up gold at dusk), terracotta-tile + whitewash, the dry tawny
// Attic rock the Acropolis sits on, and a verdigris/bronze accent for finials.
// The marquee is the PARTHENON — the Doric peripteral temple on its elevated
// rock, floodlit gold at night (its bespoke light).
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

// --- shared Athens palette ---------------------------------------------------
const MARBLE = hex('#ece4cf'); // warm Pentelic marble (the temples + neoclassical stone)
const MARBLE_L = hex('#f6f0e0'); // sun-bleached marble highlight
const MARBLE_D = hex('#cdc2a4'); // weathered/shadowed marble
const MARBLE_W = hex('#d8cdb0'); // a cooler weathered marble (ancient ruins)
const TERRA = hex('#c98a5c'); // terracotta roof tile
const TERRA_D = hex('#a96f47');
const ROCK = hex('#bcae8c'); // the dry Attic limestone rock (the Acropolis crag)
const ROCK_D = hex('#9c8f6e');
const OCHRE = hex('#e0c074'); // the ochre neoclassical wash (Old Royal Palace)
const OCHRE_D = hex('#c2a258');
const BRONZE = hex('#6f9f86'); // verdigris bronze (finials, statues, acroteria)
const BRONZE_HOT = hex('#86c0a2');
const GILT = hex('#d8b24e'); // gilt detail / lit lantern
const SLATEBLUE = hex('#5a6680'); // a few cool slate/lead roofs

/** Deterministic hash → [0,1) for stable scatter (no runtime RNG). */
function frac(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** A filled disc at a screen point (the Raster has no circle primitive). */
function disc(iso: Iso, x: number, y: number, r: number, col: RGBA): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  iso.r.poly(pts, col);
}

/** A single classical COLUMN drawn as a slim lit prism standing on a face at
 *  fixed v, at u, from zBase up to zTop. `order` tints the capital. Columns are
 *  the soul of Athens — every temple/portico reads by its colonnade. */
function column(
  iso: Iso,
  v: number,
  u: number,
  zBase: number,
  zTop: number,
  rad: number,
  col: RGBA,
  capital: 'doric' | 'ionic' | 'corinthian' = 'doric',
): void {
  // shaft: a thin box (slight entasis read via the lit/shade split)
  iso.r.poly(
    [iso.P(u - rad, v, zTop), iso.P(u + rad, v, zTop), iso.P(u + rad, v, zBase), iso.P(u - rad, v, zBase)],
    col,
  );
  // a sliver of shade on the left of the shaft so it reads round, not flat
  iso.r.poly(
    [iso.P(u - rad, v, zTop), iso.P(u - rad * 0.4, v, zTop), iso.P(u - rad * 0.4, v, zBase), iso.P(u - rad, v, zBase)],
    shaded(col, 0.14),
  );
  // fluting hint: two faint vertical lines
  iso.r.line(iso.P(u - rad * 0.3, v, zTop), iso.P(u - rad * 0.3, v, zBase), 0.5 * RES, alpha(darken(col, 0.16), 0.5));
  iso.r.line(iso.P(u + rad * 0.3, v, zTop), iso.P(u + rad * 0.3, v, zBase), 0.5 * RES, alpha(darken(col, 0.16), 0.5));
  // capital
  const capH = capital === 'doric' ? 2.2 : 3.0;
  iso.r.poly(
    [iso.P(u - rad * 1.5, v, zTop + capH), iso.P(u + rad * 1.5, v, zTop + capH), iso.P(u + rad * 1.5, v, zTop), iso.P(u - rad * 1.5, v, zTop)],
    lit(col, 0.12),
  );
  if (capital === 'ionic') {
    // two little volute scrolls
    const a = iso.P(u - rad * 1.3, v, zTop + capH);
    const b = iso.P(u + rad * 1.3, v, zTop + capH);
    iso.r.line(a, [a[0], a[1] + 1.6 * RES], 1.1 * RES, shaded(col, 0.1));
    iso.r.line(b, [b[0], b[1] + 1.6 * RES], 1.1 * RES, shaded(col, 0.1));
  } else if (capital === 'corinthian') {
    // a flared acanthus crown
    iso.r.poly(
      [iso.P(u - rad * 1.4, v, zTop + capH), iso.P(u + rad * 1.4, v, zTop + capH), iso.P(u + rad * 0.9, v, zTop + capH + 2.2), iso.P(u - rad * 0.9, v, zTop + capH + 2.2)],
      lit(col, 0.18),
    );
  }
  iso.r.line(iso.P(u - rad, v, zBase), iso.P(u + rad, v, zBase), 0.6 * RES, alpha(INK, 0.5));
}

/** A ROW of columns (a colonnade / peristyle) along a face at fixed v, between
 *  uA and uB, n columns inclusive. The Athens workhorse. */
function colonnade(
  iso: Iso,
  v: number,
  uA: number,
  uB: number,
  zBase: number,
  zTop: number,
  n: number,
  col: RGBA,
  rad = 0.028,
  order: 'doric' | 'ionic' | 'corinthian' = 'doric',
): void {
  for (let i = 0; i <= n; i++) {
    const u = uA + ((uB - uA) * i) / n;
    column(iso, v, u, zBase, zTop, rad, i % 2 ? col : lighten(col, 0.05), order);
  }
}

/** A colonnade along the RIGHT face (fixed u, between vA and vB). */
function colonnadeRight(
  iso: Iso,
  u: number,
  vA: number,
  vB: number,
  zBase: number,
  zTop: number,
  n: number,
  col: RGBA,
  rad = 0.028,
  order: 'doric' | 'ionic' | 'corinthian' = 'doric',
): void {
  for (let i = 0; i <= n; i++) {
    const v = vA + ((vB - vA) * i) / n;
    const c = i % 2 ? col : lighten(col, 0.05);
    iso.r.poly(
      [iso.P(u, v - rad, zTop), iso.P(u, v + rad, zTop), iso.P(u, v + rad, zBase), iso.P(u, v - rad, zBase)],
      lit(c, 0.04),
    );
    iso.r.poly(
      [iso.P(u, v - rad, zTop), iso.P(u, v - rad * 0.4, zTop), iso.P(u, v - rad * 0.4, zBase), iso.P(u, v - rad, zBase)],
      shaded(c, 0.12),
    );
    const capH = order === 'doric' ? 2.2 : 3.0;
    iso.r.poly(
      [iso.P(u, v - rad * 1.5, zTop + capH), iso.P(u, v + rad * 1.5, zTop + capH), iso.P(u, v + rad * 1.5, zTop), iso.P(u, v - rad * 1.5, zTop)],
      lit(c, 0.12),
    );
  }
}

/** A low classical PEDIMENT (the temple gable triangle) on a face at fixed v.
 *  The Parthenon's sculptural gable — kept shallow (Greek temples are low-
 *  pitched, ~15°), so it reads as a temple, not a steep house gable. */
function pediment(iso: Iso, v: number, uA: number, uB: number, zBase: number, rise: number, col: RGBA, sculpt = false): void {
  const um = (uA + uB) / 2;
  // tympanum face
  iso.r.poly([iso.P(uA, v, zBase), iso.P(uB, v, zBase), iso.P(um, v, zBase + rise)], lit(col, 0.06));
  // the raking cornice (ink)
  iso.r.polyline([iso.P(uA, v, zBase), iso.P(um, v, zBase + rise), iso.P(uB, v, zBase)], INK_W * 0.85, INK);
  iso.r.line(iso.P(uA, v, zBase), iso.P(uB, v, zBase), INK_W * 0.8, INK);
  if (sculpt) {
    // a hint of pediment statuary: a few small marble figures in the tympanum
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const u = uA + (uB - uA) * t;
      const h = rise * (1 - Math.abs(t - 0.5) * 1.4);
      if (h <= 1) continue;
      iso.r.poly(
        [iso.P(u - 0.02, v, zBase + 1), iso.P(u + 0.02, v, zBase + 1), iso.P(u + 0.012, v, zBase + h * 0.7), iso.P(u - 0.012, v, zBase + h * 0.7)],
        shaded(MARBLE_L, 0.04),
      );
    }
  }
  // acroteria: bronze finial at the apex + two corners
  for (const [pu, ph] of [[um, rise], [uA, 0], [uB, 0]] as const) {
    const p = iso.P(pu, v, zBase + ph);
    iso.r.line(p, [p[0], p[1] - 3 * RES], 1 * RES, BRONZE);
  }
}

/** A flat marble entablature/cornice band over a colonnade (architrave +
 *  triglyph frieze hint), on a face at fixed v. */
function entablature(iso: Iso, v: number, uA: number, uB: number, z0: number, h: number, col: RGBA, triglyphs = true): void {
  iso.r.poly([iso.P(uA, v, z0 + h), iso.P(uB, v, z0 + h), iso.P(uB, v, z0), iso.P(uA, v, z0)], lit(col, 0.08));
  iso.r.line(iso.P(uA, v, z0 + h), iso.P(uB, v, z0 + h), INK_W * 0.7, INK);
  iso.r.line(iso.P(uA, v, z0), iso.P(uB, v, z0), INK_W * 0.6, alpha(INK, 0.6));
  if (triglyphs) {
    const n = Math.max(4, Math.round((uB - uA) / 0.05));
    for (let i = 0; i <= n; i++) {
      const u = uA + ((uB - uA) * i) / n;
      iso.r.line(iso.P(u, v, z0 + h * 0.55), iso.P(u, v, z0 + h), 0.7 * RES, alpha(darken(col, 0.2), 0.55));
    }
  }
}

// =====================================================================
// THE PARTHENON — the marquee. The Doric peripteral temple of Athena on the
// Athenian Acropolis: a marble platform (stylobate) carrying a continuous
// COLONNADE of fluted Doric columns on all sides, a low pediment at each end
// with sculpture, all raised on the elevated golden ROCK of the Acropolis. It
// must read unmistakably. 2×2 (wide), big headroom so the rock + temple tower.
// =====================================================================
function parthenonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 210 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.16, v1 = 1.84;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.24);

  // --- THE SACRED ROCK: the Acropolis crag the temple stands on. A craggy
  // tawny limestone mass with stepped fortification terraces, lifting the
  // temple HIGH above the fabric so the Parthenon towers over its dense
  // neighbours as THE marquee (the real rock is 70 m above the city). ---
  const rockH = 46;
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, rockH, ROCK, {
    leftC: shaded(ROCK_D, 0.16),
    rightC: lit(ROCK, 0.08),
    topC: top(ROCK, 0.1),
  });
  // rough rock striations climbing the two tall faces (craggy terraced cliff)
  for (let band = 0; band < 4; band++) {
    const z = 6 + band * 10;
    for (let i = 0; i < 5; i++) {
      const vv = v0 + 0.06 + i * 0.34;
      iso.r.line(iso.P(u1 + 0.04, vv, z + 2), iso.P(u1 + 0.04, vv + 0.22, z), 0.8 * RES, alpha(ROCK_D, 0.45));
    }
    for (let i = 0; i < 5; i++) {
      const uu = u0 + 0.06 + i * 0.34;
      iso.r.line(iso.P(uu, v1 + 0.04, z + 2), iso.P(uu + 0.22, v1 + 0.04, z), 0.8 * RES, alpha(ROCK_D, 0.38));
    }
  }
  // a fortification retaining-wall lip at the rock top
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, rockH, rockH + 3, lighten(ROCK, 0.08), { ink: false });

  // --- THE STYLOBATE: the temple's three-stepped marble platform. The temple
  // fills most of the rock-top so it reads BIG (the real Parthenon is huge). ---
  const tu0 = u0 + 0.1, tu1 = u1 - 0.1, tv0 = v0 + 0.1, tv1 = v1 - 0.1;
  const baseZ = rockH + 3;
  for (let s = 0; s < 3; s++) {
    const e = 0.03 * (2 - s);
    iso.box(tu0 - e, tv0 - e, tu1 + e, tv1 + e, baseZ + s * 4, baseZ + (s + 1) * 4, MARBLE, { ink: s === 0 });
  }
  const colBase = baseZ + 12;
  const colTop = colBase + 72; // tall, exaggerated Doric columns — the dominant read

  // --- the cella (inner sanctuary wall), set WELL back + in deep shadow so the
  // bright marble columns in front of it pop and the gaps between them read as
  // the dark naos interior (the real Parthenon's colonnade is its whole read).
  iso.box(tu0 + 0.16, tv0 + 0.16, tu1 - 0.16, tv1 - 0.16, colBase - 4, colTop + 2, shaded(MARBLE_D, 0.42), { ink: false });

  // --- THE PERISTYLE: fluted Doric columns wrapping the two visible faces.
  // This colonnade IS the Parthenon read — bold, tall, regular, MANY. ---
  colonnade(iso, tv1, tu0, tu1, colBase, colTop, 8, MARBLE_L, 0.038, 'doric');
  colonnadeRight(iso, tu1, tv0, tv1, colBase, colTop, 8, MARBLE_L, 0.038, 'doric');

  // --- entablature (architrave + Doric triglyph frieze) over the columns ---
  iso.box(tu0 - 0.05, tv0 - 0.05, tu1 + 0.05, tv1 + 0.05, colTop, colTop + 9, MARBLE_L, {
    topC: top(MARBLE_L, 0.2),
  });
  entablature(iso, tv1, tu0, tu1, colTop, 9, MARBLE_L, true);
  // right-face triglyphs
  {
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const v = tv0 + ((tv1 - tv0) * i) / n;
      iso.r.line(iso.P(tu1, v, colTop + 5), iso.P(tu1, v, colTop + 9), 0.7 * RES, alpha(MARBLE_D, 0.6));
    }
  }

  // --- the low marble roof + the two sculptural PEDIMENTS (front + side) ---
  const roofZ = colTop + 9;
  iso.gable(tu0, tv0, tu1, tv1, roofZ, 12, 'v', MARBLE_W, MARBLE_L);
  pediment(iso, tv1, tu0, tu1, roofZ, 12, MARBLE_L, true);
  // a hint of the far pediment on the right (v0) face
  {
    const um = (tu0 + tu1) / 2;
    iso.r.poly([iso.P(tu0, tv0, roofZ), iso.P(tu1, tv0, roofZ), iso.P(um, tv0, roofZ + 10)], lit(MARBLE_W, 0.04));
  }

  // a couple of pale-marble pillar fragments on the rock around it (ruins)
  iso.box(u0 + 0.06, v1 - 0.12, u0 + 0.1, v1 - 0.06, rockH + 3, rockH + 22, MARBLE_D, { ink: false });
  iso.box(u1 - 0.12, v0 + 0.06, u1 - 0.08, v0 + 0.1, rockH + 3, rockH + 18, MARBLE_D, { ink: false });
  return iso.build();
}

// =====================================================================
// THE ERECHTHEION — the asymmetric Ionic temple on the Acropolis, famous for
// the CARYATID PORCH: six draped maiden-statues standing in for columns,
// carrying a flat marble roof. A smaller marble temple body with an Ionic
// portico + the caryatid porch on its flank. 1×1, headroom. (Matches the
// "Pandroseion / Erechtheion"-adjacent Acropolis names; here keyed to the
// caryatid read.) 1×1.
// =====================================================================
function erechtheionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a low rock plinth
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, ROCK, { ink: false });
  // the marble temple body
  const bz = 6;
  iso.box(u0 + 0.1, v0 + 0.06, u1, v1 - 0.18, bz, bz + 44, MARBLE, { topC: top(MARBLE, 0.2) });
  // an Ionic portico on the front-right
  colonnadeRight(iso, u1, v0 + 0.08, v1 - 0.22, bz, bz + 40, 3, MARBLE_L, 0.026, 'ionic');
  // entablature
  iso.box(u0 + 0.08, v0 + 0.04, u1 + 0.02, v1 - 0.16, bz + 44, bz + 49, MARBLE_L, { ink: false });
  // shallow roof
  iso.gable(u0 + 0.1, v0 + 0.06, u1, v1 - 0.18, bz + 49, 6, 'u', MARBLE_W, MARBLE_L);

  // --- THE CARYATID PORCH on the left flank (v1 side): six maiden-statues as
  // columns under a flat marble entablature. The signature. ---
  const pz0 = bz, pz1 = bz + 30;
  // porch floor + roof slab
  iso.box(u0 + 0.06, v1 - 0.2, u1 - 0.1, v1, pz0 - 2, pz0, MARBLE_W, { ink: false });
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.1 + (i * (u1 - 0.24 - u0)) / 5;
    // a draped female figure: a tapered marble column with a "head" + shoulders
    const [bx, byB] = iso.P(u, v1, pz0);
    const [, byT] = iso.P(u, v1, pz1);
    const w = 1.7 * RES;
    iso.r.poly([[bx - w, byT + 3 * RES], [bx + w, byT + 3 * RES], [bx + w * 1.2, byB], [bx - w * 1.2, byB]], i % 2 ? MARBLE_L : MARBLE);
    // shoulders + head
    iso.r.poly([[bx - w * 1.3, byT + 3 * RES], [bx + w * 1.3, byT + 3 * RES], [bx + w, byT - 1 * RES], [bx - w, byT - 1 * RES]], lit(MARBLE_L, 0.08));
    disc(iso, bx, byT - 3 * RES, 1.4 * RES, MARBLE_L);
    // drapery lines
    iso.r.line([bx - w * 0.4, byT + 3 * RES], [bx - w * 0.5, byB], 0.5 * RES, alpha(MARBLE_D, 0.6));
    iso.r.line([bx + w * 0.4, byT + 3 * RES], [bx + w * 0.5, byB], 0.5 * RES, alpha(MARBLE_D, 0.6));
  }
  // the flat porch roof the caryatids carry
  iso.box(u0 + 0.04, v1 - 0.22, u1 - 0.08, v1 + 0.02, pz1, pz1 + 5, MARBLE_L, { topC: top(MARBLE_L, 0.22) });
  return iso.build();
}

// =====================================================================
// TEMPLE OF OLYMPIAN ZEUS — the Olympieion: the largest temple in Greece, now a
// cluster of a few TOWERING Corinthian columns standing free, with one fallen
// column lying as a stack of marble drums on the ground. The silhouette is "a
// few colossal columns + a fallen one". 2×2 with big headroom (they are huge).
// =====================================================================
function olympianZeusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.2, u1 = 1.8, v0 = 0.2, v1 = 1.8;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // a low marble stylobate platform
  iso.box(u0, v0, u1, v1, 0, 8, MARBLE_W, { topC: top(MARBLE_W, 0.16) });
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, 8, 11, MARBLE, { ink: false });

  // --- a standing cluster of colossal Corinthian columns at the back-right.
  // Tall, fluted, with flared acanthus capitals + a surviving architrave block
  // spanning two of them. ---
  const colZ0 = 11, colZ1 = colZ0 + 120;
  const cluster: ReadonlyArray<readonly [number, number]> = [
    [u1 - 0.5, v0 + 0.4],
    [u1 - 0.5, v0 + 0.72],
    [u1 - 0.22, v0 + 0.4],
    [u1 - 0.22, v0 + 0.72],
    [u1 - 0.5, v0 + 1.04],
  ];
  // draw back-to-front (sort by u+v ascending = far first)
  const sorted = [...cluster].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [cu, cv] of sorted) {
    const rad = 0.07;
    const [bx, byB] = iso.P(cu, cv, colZ0);
    const [, byT] = iso.P(cu, cv, colZ1);
    const wB = rad * (CELL_W / 2);
    // shaft (slight taper)
    iso.r.poly([[bx - wB * 0.84, byT], [bx + wB * 0.84, byT], [bx + wB, byB], [bx - wB, byB]], MARBLE);
    iso.r.poly([[bx - wB, byB], [bx - wB * 0.5, byB], [bx - wB * 0.42, byT], [bx - wB * 0.84, byT]], shaded(MARBLE_D, 0.12));
    // fluting
    for (let f = -2; f <= 2; f++) {
      iso.r.line([bx + f * wB * 0.32, byT], [bx + f * wB * 0.36, byB], 0.5 * RES, alpha(MARBLE_D, 0.45));
    }
    // flared Corinthian capital
    iso.r.poly([[bx - wB, byT], [bx + wB, byT], [bx + wB * 1.5, byT - 7 * RES], [bx - wB * 1.5, byT - 7 * RES]], lit(MARBLE_L, 0.14));
    iso.r.poly([[bx - wB * 1.5, byT - 7 * RES], [bx + wB * 1.5, byT - 7 * RES], [bx + wB, byT - 11 * RES], [bx - wB, byT - 11 * RES]], lit(MARBLE_L, 0.2));
    iso.r.polyline([[bx - wB, byB], [bx - wB * 0.84, byT], [bx + wB * 0.84, byT], [bx + wB, byB]], INK_W * 0.6, alpha(INK, 0.6));
  }
  // a surviving architrave block bridging the two back columns
  {
    const a = iso.P(u1 - 0.5, v0 + 0.4, colZ1);
    const b = iso.P(u1 - 0.5, v0 + 0.72, colZ1);
    iso.r.poly([[a[0], a[1] - 11 * RES], [b[0], b[1] - 11 * RES], [b[0], b[1] - 18 * RES], [a[0], a[1] - 18 * RES]], MARBLE_L);
    iso.r.polyline([[a[0], a[1] - 11 * RES], [b[0], b[1] - 11 * RES], [b[0], b[1] - 18 * RES], [a[0], a[1] - 18 * RES]], INK_W * 0.6, INK, true);
  }

  // --- THE FALLEN COLUMN: a famous toppled column lying in the foreground as a
  // row of cylindrical marble DRUMS (like a string of giant cotton-reels). ---
  const fv = v1 - 0.34;
  for (let i = 0; i < 7; i++) {
    const fu = u0 + 0.24 + i * 0.16;
    const [dx, dy] = iso.P(fu, fv, 11);
    const rr = 5 * RES;
    // drum as a squat ellipse-capped cylinder
    iso.r.poly([[dx - rr, dy - rr * 0.5], [dx - rr, dy + rr * 0.5], [dx + rr, dy + rr * 0.5 - 3 * RES], [dx + rr, dy - rr * 0.5 - 3 * RES]], i % 2 ? MARBLE : MARBLE_W);
    disc(iso, dx - rr, dy, rr * 0.5, shaded(MARBLE_D, 0.1));
    disc(iso, dx + rr, dy - 3 * RES, rr * 0.5, lit(MARBLE_L, 0.1));
    iso.r.line([dx - rr, dy - rr * 0.5], [dx + rr, dy - rr * 0.5 - 3 * RES], 0.6 * RES, alpha(INK, 0.5));
  }
  return iso.build();
}

// =====================================================================
// HADRIAN'S ARCH — the Roman triumphal gateway (Πύλη του Αδριανού): a tall
// marble arch with a single great archway below and a slender colonnaded attic
// screen (a small Corinthian aedicule) above. Free-standing. 1×1, headroom.
// =====================================================================
function hadriansArchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 130 });
  void seed;
  const u = 0.5, v = 0.5, b = 0.34;
  iso.shadow(u - b, v - b * 0.5, u + b, v + b, 0.24, 0.22);
  const FACE = v + b; // the front face we draw the arch on
  const z0 = 0, lowTop = 56, attTop = 96;
  // the lower marble block (the pier), with the archway void
  iso.box(u - b, v - b, u + b, v + b, z0, lowTop, MARBLE, { topC: top(MARBLE, 0.18) });
  // the great arch opening on the front face
  const arch: Pt[] = [iso.P(u - b * 0.42, FACE, 6), iso.P(u - b * 0.42, FACE, 32)];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    arch.push(iso.P(u - b * 0.42 + b * 0.84 * t, FACE, 32 + Math.sin(t * Math.PI) * 16));
  }
  arch.push(iso.P(u + b * 0.42, FACE, 6));
  iso.r.poly(arch, shaded(MARBLE_D, 0.22));
  iso.r.polyline(arch, INK_W * 0.7, alpha(INK, 0.7));
  // pilasters flanking the arch
  for (const pu of [u - b * 0.72, u + b * 0.72] as const) {
    iso.r.poly([iso.P(pu - 0.02, FACE, 6), iso.P(pu + 0.02, FACE, 6), iso.P(pu + 0.02, FACE, lowTop), iso.P(pu - 0.02, FACE, lowTop)], lit(MARBLE_L, 0.06));
  }
  // a cornice band over the lower storey
  iso.box(u - b - 0.02, v - b - 0.02, u + b + 0.02, v + b + 0.02, lowTop, lowTop + 4, MARBLE_L, { ink: false });

  // --- the upper ATTIC: a colonnaded screen (three slim Corinthian columns
  // carrying a light pediment-topped aedicule), narrower than the base. ---
  iso.box(u - b * 0.6, v - b * 0.6, u + b * 0.6, v + b * 0.6, lowTop + 4, lowTop + 8, MARBLE_W, { ink: false });
  colonnade(iso, v + b * 0.6, u - b * 0.55, u + b * 0.55, lowTop + 8, attTop, 3, MARBLE_L, 0.022, 'corinthian');
  // central aedicule pediment
  iso.box(u - b * 0.6, v - b * 0.6, u + b * 0.6, v + b * 0.6, attTop, attTop + 4, MARBLE_L, { ink: false });
  pediment(iso, v + b * 0.6, u - b * 0.3, u + b * 0.3, attTop + 4, 7, MARBLE_L);
  return iso.build();
}

// =====================================================================
// ODEON OF HERODES ATTICUS — the great stone Roman theatre on the Acropolis
// south slope: a tall, multi-storey arcaded SCENE-WALL (rows of round-arched
// niches in honey stone) curving slightly, fronting a semicircular bank of
// stone seats. The arcaded wall is the read. 2×2, headroom.
// =====================================================================
function odeonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.2, v1 = 1.8;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // a low rock terrace
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, ROCK, { ink: false });

  // --- THE SCENE WALL (frons scaenae) at the BACK (v0): a tall honey-stone
  // facade with two tiers of round-arched openings — the signature wall.
  // Drawn FIRST so the seating bowl in front of it reads on top. ---
  const wallZ0 = 6, wallZ1 = wallZ0 + 80;
  iso.box(u0 + 0.06, v0, u1 - 0.06, v0 + 0.3, wallZ0, wallZ1, TERRA, {
    leftC: shaded(TERRA_D, 0.12),
    rightC: lit(TERRA, 0.08),
    topC: top(TERRA, 0.12),
  });
  // two rows of arched niches on the inward (v0+0.3) face the audience sees
  for (let row = 0; row < 2; row++) {
    const az0 = wallZ0 + 10 + row * 34;
    for (let i = 0; i < 6; i++) {
      const uu = u0 + 0.16 + i * 0.26;
      const archP: Pt[] = [iso.P(uu, v0 + 0.3, az0), iso.P(uu, v0 + 0.3, az0 + 16)];
      for (let j = 0; j <= 7; j++) {
        const t = j / 7;
        archP.push(iso.P(uu + 0.16 * t, v0 + 0.3, az0 + 16 + Math.sin(t * Math.PI) * 7));
      }
      archP.push(iso.P(uu + 0.16, v0 + 0.3, az0));
      iso.r.poly(archP, alpha(shaded(MARBLE_D, 0.34), 0.92));
    }
  }
  // a crowning cornice on the wall
  iso.box(u0 + 0.04, v0 - 0.02, u1 - 0.04, v0 + 0.32, wallZ1, wallZ1 + 5, lit(TERRA, 0.1), { ink: false });

  // --- the semicircular CAVEA (stone seating bank) sweeping toward the viewer,
  // opening to the front. Concentric tiered arcs, the bowl read. ---
  const [cx, cyB] = iso.P((u0 + u1) / 2, v0 + 0.42, 6);
  for (let r = 0; r < 6; r++) {
    const rad = (0.28 + r * 0.1) * (u1 - u0) * (CELL_W / 2) * 0.5;
    const lift = 6 * RES + (5 - r) * 10 * RES; // outer rows higher (up the slope)
    const seats: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * (i / 24); // front-opening semicircle
      seats.push([cx - Math.cos(a) * rad, cyB + lift * 0 + Math.sin(a) * rad * 0.46 - lift]);
    }
    // fill a thin band for each tier so the bowl reads solid, not as wire
    const seatsLo: Pt[] = seats.map(([x, y]) => [x, y + 5 * RES]);
    iso.r.poly([...seats, ...seatsLo.reverse()], r % 2 ? shaded(MARBLE_W, 0.06) : lighten(ROCK, 0.04));
    iso.r.polyline(seats, 1.4 * RES, alpha(INK, 0.5));
  }
  // the semicircular orchestra floor at the bottom-front
  const orad = 0.26 * (u1 - u0) * (CELL_W / 2) * 0.5;
  const orch: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * (i / 24);
    orch.push([cx - Math.cos(a) * orad, cyB + Math.sin(a) * orad * 0.46]);
  }
  orch.push([cx + orad, cyB]);
  iso.r.poly(orch, lit(MARBLE_W, 0.06));
  iso.r.polyline(orch, INK_W * 0.6, alpha(INK, 0.6));
  return iso.build();
}

// =====================================================================
// THEATRE OF DIONYSUS — the ancient Greek theatre on the Acropolis south slope:
// a great fan of curved stone seat-rows (the koilon) sweeping up the hillside
// around a circular orchestra, with a low ruined skene wall at the front. The
// read is the SEMICIRCULAR TIERED SEATING carved into the slope. 2×2.
// =====================================================================
function theatreOfDionysusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.18, v1 = 1.82;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the hillside terrace
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, ROCK, { ink: false });
  // the circular orchestra (a paved disc) at the front-centre
  const [ox, oy] = iso.P((u0 + u1) / 2, v1 - 0.4, 5);
  const orad = 0.26 * (u1 - u0) * (CELL_W / 2) * 0.5;
  const disc: Pt[] = [];
  for (let i = 0; i <= 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    disc.push([ox + Math.cos(a) * orad, oy + Math.sin(a) * orad * 0.5]);
  }
  iso.r.poly(disc, lit(MARBLE_W, 0.04));
  iso.r.polyline(disc, INK_W * 0.6, alpha(INK, 0.6), true);

  // the great fan of tiered stone seats rising up the slope behind
  const [cx, cyB] = iso.P((u0 + u1) / 2, v1 - 0.4, 5);
  for (let r = 0; r < 9; r++) {
    const rad = orad + (0.05 + r * 0.085) * (u1 - u0) * (CELL_W / 2);
    const lift = r * 8 * RES;
    const seats: Pt[] = [];
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI * 0.04 + Math.PI * 0.92 * (i / 26);
      seats.push([cx - Math.cos(a) * rad, cyB - lift - Math.sin(a) * rad * 0.46]);
    }
    iso.r.polyline(seats, 2.6 * RES, r % 2 ? shaded(MARBLE_W, 0.08) : lighten(ROCK, 0.06));
    // a few radial stair gangways
    if (r === 8) {
      for (const frac of [0.18, 0.5, 0.82]) {
        const a = Math.PI * 0.04 + Math.PI * 0.92 * frac;
        iso.r.line([cx - Math.cos(a) * orad, cyB - Math.sin(a) * orad * 0.46], [cx - Math.cos(a) * rad, cyB - lift - Math.sin(a) * rad * 0.46], 1 * RES, alpha(ROCK_D, 0.5));
      }
    }
  }
  // a couple of marble thrones (the front-row seats of honour) at the orchestra edge
  for (const fu of [-0.12, 0.12]) {
    const [bx, byB] = [ox + fu * (CELL_W / 2), oy - 2 * RES];
    iso.r.rect(bx - 2 * RES, byB - 5 * RES, bx + 2 * RES, byB, MARBLE_L);
  }
  return iso.build();
}

// =====================================================================
// TEMPLE OF HEPHAESTUS — the best-preserved Doric temple in Greece (the
// Hephaisteion / Theseion): a complete small marble Doric peripteral temple
// with its colonnade intact and an intact low roof + pediments. Like a compact,
// pristine Parthenon. 2×2 (drawn a touch smaller within the square), headroom.
// =====================================================================
function hephaestusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // a small green/rock knoll
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 7, ROCK, { ink: false });
  // stepped marble stylobate
  const baseZ = 7;
  for (let s = 0; s < 2; s++) {
    const e = 0.03 * (1 - s);
    iso.box(u0 - e, v0 - e, u1 + e, v1 + e, baseZ + s * 4, baseZ + (s + 1) * 4, MARBLE, { ink: s === 0 });
  }
  const colBase = baseZ + 8, colTop = colBase + 38;
  // cella
  iso.box(u0 + 0.18, v0 + 0.18, u1 - 0.18, v1 - 0.18, colBase, colTop - 3, MARBLE_W, { ink: false });
  // Doric peristyle on both faces
  colonnade(iso, v1, u0, u1, colBase, colTop, 6, MARBLE, 0.028, 'doric');
  colonnadeRight(iso, u1, v0, v1, colBase, colTop, 6, MARBLE, 0.028, 'doric');
  // entablature
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, colTop, colTop + 6, MARBLE_L, { topC: top(MARBLE_L, 0.2) });
  entablature(iso, v1, u0, u1, colTop, 6, MARBLE_L, true);
  // intact low roof + pediment
  iso.gable(u0, v0, u1, v1, colTop + 6, 9, 'v', TERRA, MARBLE_L);
  pediment(iso, v1, u0, u1, colTop + 6, 9, MARBLE_L, true);
  return iso.build();
}

// =====================================================================
// TEMPLE OF ATHENA NIKE — the tiny, exquisite Ionic temple on the Acropolis
// bastion: four slender Ionic columns front and back on a high marble bastion.
// Small + jewel-like, perched up high. 1×1, headroom.
// =====================================================================
function athenaNikeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 100 });
  void seed;
  const u0 = 0.28, u1 = 0.72, v0 = 0.28, v1 = 0.72;
  iso.shadow(u0 - 0.12, v0 - 0.06, u1 + 0.04, v1 + 0.12, 0.22, 0.24);
  // the tall marble BASTION it stands on
  iso.box(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, 0, 30, ROCK, {
    leftC: shaded(ROCK_D, 0.14), rightC: lit(ROCK, 0.06), topC: top(ROCK, 0.08),
  });
  iso.box(u0 - 0.08, v0 - 0.08, u1 + 0.08, v1 + 0.08, 30, 33, lighten(MARBLE_W, 0.04), { ink: false });
  // the little temple
  const bz = 33, colBase = bz + 3, colTop = colBase + 22;
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, colBase, colTop - 2, MARBLE_W, { ink: false });
  colonnade(iso, v1, u0, u1, colBase, colTop, 3, MARBLE_L, 0.022, 'ionic');
  colonnadeRight(iso, u1, v0, v1, colBase, colTop, 3, MARBLE_L, 0.022, 'ionic');
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, colTop, colTop + 4, MARBLE_L, { ink: false });
  iso.gable(u0, v0, u1, v1, colTop + 4, 5, 'v', MARBLE_W, MARBLE_L);
  pediment(iso, v1, u0, u1, colTop + 4, 5, MARBLE_L);
  return iso.build();
}

// =====================================================================
// STOA OF ATTALOS — the reconstructed Hellenistic stoa in the Agora: a long
// two-storey marble colonnaded gallery — a Doric ground colonnade + an Ionic
// upper colonnade, under a long terracotta-tiled pitched roof, with a solid
// back wall. A long market portico. 3×3 (long), headroom.
// =====================================================================
function stoaOfAttalosTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.9, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // stepped stylobate
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 5, MARBLE_W, { ink: true });
  // the solid back wall (far side, v0)
  iso.box(u0, v0, u1, v0 + 0.3, 5, 64, MARBLE, { topC: top(MARBLE, 0.16) });
  // ground floor: Doric colonnade along the long front (v1)
  colonnade(iso, v1, u0 + 0.04, u1 - 0.04, 5, 32, 16, MARBLE_L, 0.02, 'doric');
  // mid floor band
  iso.box(u0, v0, u1, v0 + 0.3, 32, 37, lit(MARBLE_L, 0.08), { ink: false });
  iso.box(u0, v1 - 0.06, u1, v1, 32, 37, lit(MARBLE_L, 0.06), { ink: false });
  // upper floor: Ionic colonnade
  colonnade(iso, v1, u0 + 0.04, u1 - 0.04, 37, 60, 16, MARBLE_L, 0.018, 'ionic');
  // entablature + long terracotta roof
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 60, 65, MARBLE_L, { ink: false });
  iso.gable(u0, v0, u1, v1, 65, 12, 'u', TERRA, MARBLE_L);
  return iso.build();
}

// =====================================================================
// ROMAN AGORA / TOWER OF THE WINDS — the Horologion of Andronikos: a tall
// OCTAGONAL marble tower (the ancient clocktower/weathervane) with a low
// conical roof and a small portico, standing in the Roman Agora. The
// octagon-on-end is the unmistakable read. Keyed to the Roman Agora name. 2×2.
// =====================================================================
function towerOfWindsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a low marble Agora pavement with a few column stubs (the gateway ruins)
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 5, MARBLE_W, { ink: false });
  for (const [cu, cv, h] of [[u0 + 0.2, v1 - 0.2, 24], [u0 + 0.42, v1 - 0.14, 18], [u1 - 0.22, v1 - 0.3, 20]] as const) {
    iso.box(cu - 0.03, cv - 0.03, cu + 0.03, cv + 0.03, 5, 5 + h, MARBLE, { ink: false });
    iso.r.poly([iso.P(cu - 0.04, cv, 5 + h), iso.P(cu + 0.04, cv, 5 + h), iso.P(cu + 0.04, cv, 5 + h - 3), iso.P(cu - 0.04, cv, 5 + h - 3)], lit(MARBLE_L, 0.1));
  }

  // --- THE OCTAGONAL TOWER, centred + big so it dominates the read ---
  const cx = (u0 + u1) / 2 + 0.1, cy = (v0 + v1) / 2 - 0.05;
  const [ox, ground] = iso.P(cx, cy, 5);
  const rad = 0.34 * (CELL_W / 2);
  const towZ = 98;
  // build the 8 vertical faces as a stack of trapezoids facing the viewer
  const oct: Pt[] = [];
  const octT: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    oct.push([ox + Math.cos(a) * rad, ground + Math.sin(a) * rad * 0.5]);
    octT.push([ox + Math.cos(a) * rad, ground + Math.sin(a) * rad * 0.5 - towZ * RES]);
  }
  // the visible front faces (lower half of the octagon, facing viewer)
  for (let i = 0; i < 8; i++) {
    const p0 = oct[i]!, p1 = oct[i + 1]!;
    const t0 = octT[i]!, t1 = octT[i + 1]!;
    // light faces on the right, shaded on the left
    const facing = (p0[0] + p1[0]) / 2 > ox;
    iso.r.poly([t0, t1, p1, p0], facing ? lit(MARBLE, 0.08) : shaded(MARBLE_D, 0.08));
  }
  // the octagonal top
  iso.r.poly(octT, top(MARBLE_L, 0.16));
  iso.r.polyline(octT, INK_W * 0.7, INK, true);
  // a frieze of the eight wind-gods near the top (a band)
  for (let i = 0; i < 8; i++) {
    const p0 = octT[i]!, p1 = octT[i + 1]!;
    iso.r.line([p0[0], p0[1] + 8 * RES], [p1[0], p1[1] + 8 * RES], 1.4 * RES, alpha(MARBLE_D, 0.5));
  }
  iso.r.polyline(oct.slice(0, 5), INK_W * 0.6, alpha(INK, 0.6));
  // low conical roof + a weathervane finial
  const apex: Pt = [ox, ground - (towZ + 16) * RES];
  for (let i = 0; i < 8; i++) {
    iso.r.poly([octT[i]!, octT[i + 1]!, apex], (octT[i]![0] + octT[i + 1]![0]) / 2 > ox ? lit(MARBLE_W, 0.06) : shaded(MARBLE_W, 0.08));
  }
  iso.r.line(apex, [apex[0], apex[1] - 6 * RES], 1.2 * RES, BRONZE);
  iso.r.line([apex[0] - 3 * RES, apex[1] - 4 * RES], [apex[0] + 3 * RES, apex[1] - 6 * RES], 1 * RES, BRONZE_HOT);
  return iso.build();
}

// =====================================================================
// CHORAGIC MONUMENT OF LYSICRATES — the small circular marble monument: a
// square plinth carrying a slim CYLINDER ringed by six engaged Corinthian
// columns, capped by a domed marble roof + a finial. A jewel. 1×1, headroom.
// =====================================================================
function lysicratesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.2, v - 0.1, u + 0.2, v + 0.2, 0.2, 0.22);
  // square plinth
  iso.box(u - 0.22, v - 0.22, u + 0.22, v + 0.22, 0, 22, MARBLE, { topC: top(MARBLE, 0.16) });
  // the cylindrical drum with engaged columns
  const [cx, ground] = iso.P(u, v, 22);
  const rad = 0.17 * (CELL_W / 2);
  const drumZ = 30;
  // drum body
  iso.r.poly([
    [cx - rad, ground], [cx + rad, ground],
    [cx + rad, ground - drumZ * RES], [cx - rad, ground - drumZ * RES],
  ], MARBLE_W);
  // six engaged columns across the front
  for (let i = 0; i <= 5; i++) {
    const fx = cx - rad + (2 * rad * i) / 5;
    iso.r.line([fx, ground], [fx, ground - drumZ * RES], 1.4 * RES, i % 2 ? MARBLE_L : lit(MARBLE, 0.1));
    disc(iso, fx, ground - drumZ * RES, 1.2 * RES, lit(MARBLE_L, 0.16));
  }
  iso.r.polyline([[cx - rad, ground], [cx - rad, ground - drumZ * RES], [cx + rad, ground - drumZ * RES], [cx + rad, ground]], INK_W * 0.6, alpha(INK, 0.6));
  // domed marble roof (a shallow scaled cap)
  const top0 = ground - drumZ * RES;
  const dome: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    dome.push([cx + Math.cos(a) * rad, top0 - Math.sin(a) * 12 * RES]);
  }
  iso.r.poly(dome, lit(MARBLE_L, 0.1));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  // the famous finial (the acanthus-leaf tripod stand)
  iso.r.line([cx, top0 - 12 * RES], [cx, top0 - 22 * RES], 1.4 * RES, BRONZE);
  iso.r.poly([[cx - 2.4 * RES, top0 - 22 * RES], [cx + 2.4 * RES, top0 - 22 * RES], [cx, top0 - 28 * RES]], BRONZE_HOT);
  return iso.build();
}

// =====================================================================
// THE NEOCLASSICAL TRILOGY (Academy / University / National Library) — Theophil
// Hansen's Pentelic-marble masterpieces: a grand symmetrical block with a
// projecting central Ionic PORTICO (columns + pediment), flanking wings, and
// statuary (Athena/Apollo on tall columns, seated Plato/Socrates). The ochre-
// and-marble neoclassical read. Parameterised. 3×3, headroom.
// =====================================================================
function trilogyTile(seed: number, kind: 'academy' | 'university' | 'library'): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 130 });
  void seed;
  const body = kind === 'university' ? OCHRE : MARBLE; // the University is famously polychrome/ochre
  const u0 = 0.3, u1 = 2.7, v0 = 0.72, v1 = 2.5;
  const bodyH = 62; // taller: a stately two-storey neoclassical block, not a slab
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the long marble body + a low base
  iso.box(u0, v0, u1, v1, 0, bodyH, body, { topC: top(body, 0.18) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(body, 0.12), { ink: false });
  // two storeys of regular windows along the wings (front face v1) + pilasters
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 14, 30, 11, alpha(COLORS.glassDark, 0.85), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 36, 54, 11, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 14, 30, 8, alpha(COLORS.glassDark, 0.78), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 36, 54, 8, alpha(COLORS.glassDark, 0.72), MARBLE_L);
  // marble cornice + low parapet crowning the block
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 5, MARBLE_L, { topC: top(MARBLE_L, 0.18) });

  // --- the projecting central PORTICO: a marble plinth carrying tall Ionic
  // columns under a sculptural pediment, rising the FULL height of the block.
  // The civic signature — make it dominate the centre. ---
  const pu0 = u0 + 0.74, pu1 = u1 - 0.74;
  iso.box(pu0 - 0.06, v1 - 0.2, pu1 + 0.06, v1 + 0.18, 0, 16, MARBLE_L); // the stepped podium projecting forward
  colonnade(iso, v1 + 0.18, pu0, pu1, 16, bodyH, 6, MARBLE_L, 0.03, 'ionic');
  iso.box(pu0 - 0.08, v1 - 0.04, pu1 + 0.08, v1 + 0.2, bodyH, bodyH + 6, MARBLE_L, { topC: top(MARBLE_L, 0.2) });
  pediment(iso, v1 + 0.18, pu0, pu1, bodyH + 6, 13, MARBLE_L, true);

  if (kind === 'academy') {
    // the two famous tall IONIC COLUMNS bearing Athena + Apollo, flanking the steps
    for (const cu of [pu0 - 0.36, pu1 + 0.36] as const) {
      const [bx, byB] = iso.P(cu, v1 + 0.24, 0);
      iso.r.line([bx, byB], [bx, byB - 78 * RES], 2.4 * RES, MARBLE_L);
      disc(iso, bx, byB - 78 * RES, 1.8 * RES, lit(MARBLE_L, 0.2));
      // the statue
      iso.r.poly([[bx - 2.4 * RES, byB - 78 * RES], [bx + 2.4 * RES, byB - 78 * RES], [bx + 1.3 * RES, byB - 92 * RES], [bx - 1.3 * RES, byB - 92 * RES]], BRONZE_HOT);
    }
  } else if (kind === 'university') {
    // a long painted frieze band under the portico (the University's mural)
    iso.r.line(iso.P(pu0, v1 + 0.18, bodyH - 3), iso.P(pu1, v1 + 0.18, bodyH - 3), 2 * RES, alpha(TERRA, 0.7));
  } else {
    // the National Library's grand curved double STAIRCASE hint at the front
    for (const sx of [-1, 1] as const) {
      const a = iso.P((pu0 + pu1) / 2 + sx * 0.3, v1 + 0.24, 0);
      const b = iso.P((pu0 + pu1) / 2 + sx * 0.06, v1 + 0.18, 16);
      iso.r.line(a, b, 2.6 * RES, MARBLE_D);
    }
  }
  return iso.build();
}

// =====================================================================
// OLD ROYAL PALACE / HELLENIC PARLIAMENT — the ochre neoclassical block on
// Syntagma: a long, austere two-storey OCHRE building with a marble-pilastered
// ground floor, a Doric marble portico at the centre, a flat roof, and the
// guarded Tomb of the Unknown Soldier terrace in front. The ochre civic mass is
// the read. 3×3, headroom.
// =====================================================================
function oldRoyalPalaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.28, u1 = 2.72, v0 = 0.72, v1 = 2.5;
  const bodyH = 60; // taller austere two-storey palace
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the long ochre body
  iso.box(u0, v0, u1, v1, 0, bodyH, OCHRE, { topC: top(OCHRE, 0.14), leftC: shaded(OCHRE_D, 0.12) });
  // a marble-rusticated ground floor band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 18, MARBLE_W, { ink: false });
  // two storeys of regular windows (both visible faces)
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 22, 36, 14, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 40, 54, 14, alpha(COLORS.glassLit, 0.45), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 22, 36, 10, alpha(COLORS.glassDark, 0.76), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 40, 54, 10, alpha(COLORS.glassDark, 0.7), MARBLE_L);
  // a marble cornice + flat parapet roof
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 4, MARBLE_L, { topC: top(MARBLE_L, 0.18) });
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, bodyH + 4, bodyH + 6, MARBLE_W, { ink: false });

  // --- the central marble Doric PORTICO, full height ---
  const pu0 = u0 + 0.86, pu1 = u1 - 0.86;
  iso.box(pu0 - 0.05, v1 - 0.16, pu1 + 0.05, v1 + 0.12, 0, 14, MARBLE_L);
  colonnade(iso, v1 + 0.12, pu0, pu1, 14, bodyH, 5, MARBLE_L, 0.028, 'doric');
  iso.box(pu0 - 0.06, v1 - 0.04, pu1 + 0.06, v1 + 0.14, bodyH, bodyH + 5, MARBLE_L, { ink: false });
  pediment(iso, v1 + 0.12, pu0, pu1, bodyH + 5, 10, MARBLE_L);
  // the Tomb of the Unknown Soldier terrace + a flagpole in front
  iso.box(u0 + 0.3, v1 + 0.06, u1 - 0.3, v1 + 0.22, 0, 4, MARBLE_W, { ink: false });
  const fp = iso.P((u0 + u1) / 2, v1 + 0.18, 4);
  iso.r.line(fp, [fp[0], fp[1] - 30 * RES], 1.2 * RES, MARBLE_D);
  iso.r.rect(fp[0], fp[1] - 30 * RES, fp[0] + 8 * RES, fp[1] - 24 * RES, hex('#2f6fb0')); // blue flag
  iso.r.rect(fp[0], fp[1] - 30 * RES, fp[0] + 8 * RES, fp[1] - 28 * RES, COLORS.white);
  return iso.build();
}

// =====================================================================
// OLD PARLIAMENT HOUSE — the neoclassical National Historical Museum on Stadiou:
// a marble building with a recessed PROPYLAEA-style Doric portico in an
// entrance court, fronted by the bronze equestrian statue of Kolokotronis. A
// dignified marble civic block. 2×2, headroom.
// =====================================================================
function oldParliamentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.28, u1 = 1.72, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 42, MARBLE, { topC: top(MARBLE, 0.16) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, MARBLE_W, { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 36, 8, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  // two slightly projecting end pavilions
  for (const cu of [u0 + 0.18, u1 - 0.18] as const) {
    iso.box(cu - 0.16, v1 - 0.1, cu + 0.16, v1 + 0.04, 0, 46, lighten(MARBLE, 0.03));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 42, 47, MARBLE_L, { topC: top(MARBLE_L, 0.18) });
  // a recessed central Doric portico in a shallow court
  const pu0 = u0 + 0.5, pu1 = u1 - 0.5;
  colonnade(iso, v1 - 0.04, pu0, pu1, 12, 40, 4, MARBLE_L, 0.024, 'doric');
  pediment(iso, v1 - 0.04, pu0, pu1, 45, 8, MARBLE_L);
  // the bronze equestrian Kolokotronis out front
  const [hx, hy] = iso.P((u0 + u1) / 2, v1 + 0.16, 0);
  iso.r.rect(hx - 5 * RES, hy - 9 * RES, hx + 4 * RES, hy - 5 * RES, BRONZE); // horse body
  iso.r.rect(hx - 5 * RES, hy - 5 * RES, hx - 3 * RES, hy, BRONZE);
  iso.r.rect(hx + 2 * RES, hy - 5 * RES, hx + 4 * RES, hy, BRONZE);
  iso.r.poly([[hx + 4 * RES, hy - 9 * RES], [hx + 7 * RES, hy - 11 * RES], [hx + 5 * RES, hy - 6 * RES]], BRONZE); // head/neck
  iso.r.rect(hx - 2 * RES, hy - 15 * RES, hx + 1 * RES, hy - 9 * RES, BRONZE_HOT); // rider
  return iso.build();
}

// =====================================================================
// ZAPPEION — the great neoclassical hall by the National Gardens: a long marble
// palace with a deep Corinthian portico front and, behind it, the famous
// circular interior PERISTYLE (a ring of columns around an open atrium) read
// here as a colonnaded rotunda rising at the centre. 3×3, headroom.
// =====================================================================
function zappeionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.72, v1 = 2.5;
  const bodyH = 56;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, MARBLE, { topC: top(MARBLE, 0.16) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, MARBLE_W, { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 32, 12, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 38, 50, 12, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 16, 50, 8, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 5, MARBLE_L, { topC: top(MARBLE_L, 0.18) });

  // the deep central Corinthian PORTICO (the grand columned entrance), full height
  const pu0 = u0 + 0.76, pu1 = u1 - 0.76;
  iso.box(pu0 - 0.06, v1 - 0.22, pu1 + 0.06, v1 + 0.18, 0, 14, MARBLE_L);
  colonnade(iso, v1 + 0.18, pu0, pu1, 14, bodyH, 6, MARBLE_L, 0.03, 'corinthian');
  iso.box(pu0 - 0.08, v1 - 0.06, pu1 + 0.08, v1 + 0.2, bodyH, bodyH + 6, MARBLE_L, { topC: top(MARBLE_L, 0.2) });
  pediment(iso, v1 + 0.18, pu0, pu1, bodyH + 6, 12, MARBLE_L);

  // the circular interior peristyle rising as a low colonnaded rotunda at centre
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.1;
  const [rx, rgY] = iso.P(cx, cy, bodyH + 5);
  const rrad = 0.4 * (CELL_W / 2);
  iso.r.poly([
    [rx - rrad, rgY], [rx + rrad, rgY],
    [rx + rrad, rgY - 18 * RES], [rx - rrad, rgY - 18 * RES],
  ], MARBLE_W);
  for (let i = 0; i <= 9; i++) {
    const fx = rx - rrad + (2 * rrad * i) / 9;
    iso.r.line([fx, rgY], [fx, rgY - 18 * RES], 1.2 * RES, i % 2 ? MARBLE_L : lit(MARBLE, 0.08));
  }
  iso.r.poly([[rx - rrad, rgY - 18 * RES], [rx + rrad, rgY - 18 * RES], [rx + rrad * 0.7, rgY - 22 * RES], [rx - rrad * 0.7, rgY - 22 * RES]], top(MARBLE_L, 0.2));
  return iso.build();
}

// =====================================================================
// METROPOLITAN CATHEDRAL OF ATHENS — the big Greek-Orthodox cathedral
// (Mitropoli): a cream/marble basilica with a tall central DOME on a drum, two
// flanking belltowers with small cupolas, and a triple-arched narthex front.
// 1×1 (its real extent is small), big headroom. 1×1.
// =====================================================================
function metropolitanCathedralTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 140 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  const ST = hex('#e6dcc4');
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // basilica body
  iso.box(u0, v0, u1, v1, 0, 44, ST, { topC: top(ST, 0.16) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.1), { ink: false });
  // triple arched narthex on the front
  for (let i = 0; i < 3; i++) {
    const uu = u0 + 0.12 + i * 0.22;
    const arch: Pt[] = [iso.P(uu, v1, 6), iso.P(uu, v1, 22)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      arch.push(iso.P(uu + 0.14 * t, v1, 22 + Math.sin(t * Math.PI) * 7));
    }
    arch.push(iso.P(uu + 0.14, v1, 6));
    iso.r.poly(arch, alpha(COLORS.glassDark, 0.8));
  }
  // two flanking belltowers with cupolas
  for (const cu of [u0 + 0.06, u1 - 0.06] as const) {
    iso.box(cu - 0.08, v1 - 0.14, cu + 0.08, v1, 0, 58, ST);
    iso.box(cu - 0.09, v1 - 0.15, cu + 0.09, v1 + 0.01, 58, 62, lighten(ST, 0.06), { ink: false });
    const [bx, by] = iso.P(cu, v1 - 0.07, 62);
    const cup: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      cup.push([bx + Math.cos(a) * 4.4 * RES, by - Math.sin(a) * 9 * RES]);
    }
    iso.r.poly(cup, lit(SLATEBLUE, 0.1));
    iso.r.polyline(cup, INK_W * 0.6, INK);
    // orthodox cross
    iso.r.line([bx, by - 9 * RES], [bx, by - 16 * RES], 1.1 * RES, GILT);
    iso.r.line([bx - 2.4 * RES, by - 13 * RES], [bx + 2.4 * RES, by - 13 * RES], 0.9 * RES, GILT);
  }
  // the great central dome on a drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.02;
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 44, 66, lighten(ST, 0.04)); // drum
  const [dx, dyB] = iso.P(cx, cy, 66);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    dome.push([dx + Math.cos(a) * 9 * RES, dyB - Math.sin(a) * 18 * RES]);
  }
  iso.r.poly(dome, lit(SLATEBLUE, 0.12));
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // big gilt orthodox cross on the dome
  const ty = dyB - 18 * RES;
  iso.r.line([dx, ty], [dx, ty - 12 * RES], 1.4 * RES, GILT);
  iso.r.line([dx - 3 * RES, ty - 8 * RES], [dx + 3 * RES, ty - 8 * RES], 1.1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// BYZANTINE CHAPEL — the little stone Byzantine churches of Athens (Agios
// Eleftherios "Little Metropolis", Kapnikarea, Agia Irini, Saint Nicholas…):
// a small cruciform stone chapel with a tiled cross-gable roof and a single
// tiled DOME on an octagonal drum. Parameterised by `whitewashed`. 1×1.
// =====================================================================
function byzantineChapelTile(seed: number, whitewashed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const ST = whitewashed ? hex('#eee7d6') : hex('#cdbf9e'); // whitewash vs honey stone
  const u0 = 0.22, u1 = 0.78, v0 = 0.22, v1 = 0.78;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // cruciform body
  iso.box(u0, v0, u1, v1, 0, 26, ST, { topC: top(ST, 0.14) });
  // a small apse on the right
  iso.box(u1 - 0.02, v0 + 0.16, u1 + 0.12, v1 - 0.16, 0, 20, ST, { ink: false });
  // tiled cross-gable roofs
  iso.gable(u0, v0, u1, v1, 26, 8, 'v', TERRA, ST);
  // the dome on an octagonal drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.1, cy - 0.1, cx + 0.1, cy + 0.1, 30, 42, lighten(ST, 0.04));
  const [dx, dyB] = iso.P(cx, cy, 42);
  const dome: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    dome.push([dx + Math.cos(a) * 6 * RES, dyB - Math.sin(a) * 10 * RES]);
  }
  iso.r.poly(dome, lit(TERRA, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - 10 * RES], [dx, dyB - 17 * RES], 1 * RES, GILT);
  iso.r.line([dx - 2 * RES, dyB - 14 * RES], [dx + 2 * RES, dyB - 14 * RES], 0.8 * RES, GILT);
  return iso.build();
}

// =====================================================================
// CATHOLIC BASILICA (St Dionysius) — the Renaissance-Revival Catholic cathedral:
// a marble basilica with a tall arched facade, a rose window, and a single
// square campanile. A western (not orthodox) church read. 1×1, headroom.
// =====================================================================
function catholicBasilicaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const ST = hex('#e8e0cc');
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1 - 0.16, v1, 0, 50, ST, { topC: top(ST, 0.14) });
  iso.gable(u0, v0, u1 - 0.16, v1, 50, 12, 'v', TERRA, ST);
  // arched facade with a rose window
  iso.box(u0 + 0.04, v1 - 0.04, u1 - 0.2, v1, 0, 62, lighten(ST, 0.03));
  const [rx, ry] = iso.P((u0 + u1 - 0.16) / 2, v1, 44);
  const rose: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * 5 * RES, ry + Math.sin(a) * 5 * RES]);
  }
  iso.r.poly(rose, alpha(COLORS.glassLit, 0.5));
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  // big arched portal
  const portal: Pt[] = [iso.P(u0 + 0.24, v1, 4), iso.P(u0 + 0.24, v1, 24)];
  for (let j = 0; j <= 6; j++) {
    const t = j / 6;
    portal.push(iso.P(u0 + 0.24 + 0.16 * t, v1, 24 + Math.sin(t * Math.PI) * 8));
  }
  portal.push(iso.P(u0 + 0.4, v1, 4));
  iso.r.poly(portal, alpha(COLORS.glassDark, 0.85));
  // the square campanile on the right
  iso.box(u1 - 0.18, v0 + 0.1, u1, v1 - 0.1, 0, 78, ST);
  iso.box(u1 - 0.2, v0 + 0.08, u1 + 0.02, v1 - 0.08, 78, 82, lighten(ST, 0.06), { ink: false });
  iso.hip(u1 - 0.2, v0 + 0.08, u1 + 0.02, v1 - 0.08, 82, 12, TERRA);
  return iso.build();
}

// =====================================================================
// HOTEL GRANDE BRETAGNE — the grand Syntagma hotel: a stately ochre-and-marble
// neoclassical palace-block, many storeys of regular windows, a marble-banded
// ground floor with awnings, a strong cornice + flat roof, and the GB roof
// signage. The grand-hotel mass. 2×2, headroom.
// =====================================================================
function grandeBretagneTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#e3d2ac'); // warm ochre-cream
  const u0 = 0.26, u1 = 1.74, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 64, ST, { topC: top(ST, 0.12) });
  // marble ground-floor band with awnings
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, MARBLE_W, { ink: false });
  for (let i = 0; i < 6; i++) {
    const uu = u0 + 0.12 + i * 0.24;
    iso.r.poly([iso.P(uu, v1, 8), iso.P(uu + 0.14, v1, 8), iso.P(uu + 0.16, v1 + 0.06, 5), iso.P(uu - 0.02, v1 + 0.06, 5)], hex('#9c3b34'));
  }
  // four storeys of regular windows
  for (let s = 0; s < 4; s++) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 16 + s * 12, 24 + s * 12, 7, alpha(s === 1 ? COLORS.glassLit : COLORS.glassDark, s === 1 ? 0.45 : 0.8), MARBLE_L);
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 16 + s * 12, 24 + s * 12, 6, alpha(COLORS.glassDark, 0.78), MARBLE_L);
  }
  // strong cornice + flat parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 64, 68, MARBLE_L, { topC: top(MARBLE_L, 0.16) });
  // the rooftop GB sign + a couple of pavilions
  const sgn = iso.P((u0 + u1) / 2, v1 - 0.2, 68);
  iso.r.rect(sgn[0] - 8 * RES, sgn[1] - 9 * RES, sgn[0] + 8 * RES, sgn[1] - 4 * RES, alpha(hex('#2a2438'), 0.9));
  iso.r.line([sgn[0] - 5 * RES, sgn[1] - 6.5 * RES], [sgn[0] + 5 * RES, sgn[1] - 6.5 * RES], 1.4 * RES, GILT);
  return iso.build();
}

// =====================================================================
// ATHENS CONCERT HALL (Megaron) — the big modern Stripped-Classicism cultural
// block: a clean, broad MARBLE-clad cube, a tall glazed entrance front, a flat
// roof, monumental and austere. The polished-marble modern mass. 3×3.
// =====================================================================
function megaronTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const ST = hex('#e8e1d0');
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, 50, ST, { topC: top(ST, 0.16) });
  // a tall glazed entrance slot on the front
  iso.box(u0 + 0.5, v1 - 0.06, u1 - 0.5, v1, 0, 44, alpha(COLORS.glassSky, 0.9), { ink: false });
  for (let i = 0; i < 9; i++) {
    const uu = u0 + 0.54 + i * ((u1 - u0 - 1.08) / 9);
    iso.r.line(iso.P(uu, v1, 4), iso.P(uu, v1, 44), 0.7 * RES, alpha(COLORS.white, 0.6));
  }
  // a clean marble cornice/parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 50, 54, MARBLE_L, { topC: top(MARBLE_L, 0.18) });
  // shallow marble grid scoring on the side wall (the stripped-classical reveal)
  for (let i = 0; i < 7; i++) {
    const vv = v0 + 0.2 + i * ((v1 - v0 - 0.4) / 7);
    iso.r.line(iso.P(u1, vv, 8), iso.P(u1, vv, 48), 0.6 * RES, alpha(MARBLE_D, 0.5));
  }
  return iso.build();
}

// =====================================================================
// MODERN HIGH-RISE (Athens Tower 1 / Apollo Tower / hotel towers) — the rare
// Athens skyscraper: a slim glass-and-concrete slab TOWERING far over the low
// white fabric. Parameterised by height + glass tint. 1×1, big headroom.
// =====================================================================
function highriseTile(seed: number, floors: number, glass: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 + floors * 5 });
  void seed;
  const u0 = 0.24, u1 = 0.76, v0 = 0.24, v1 = 0.76;
  const top0 = 60 + floors * 7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a podium base
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 12, hex('#d8cdb6'));
  // the slim tower shaft
  iso.box(u0, v0, u1, v1, 12, top0, hex('#c8c0b0'), { topC: top(hex('#c8c0b0'), 0.14) });
  // glazed window grid both faces
  const cols = 5, rows = floors;
  iso.windowsLeft(v1, u0 + 0.02, u1 - 0.02, 16, top0 - 3, cols, alpha(glass, 0.85), alpha(COLORS.steelDark, 0.5));
  iso.windowsRight(u1, v0 + 0.02, v1 - 0.02, 16, top0 - 3, cols, alpha(glass, 0.8), alpha(COLORS.steelDark, 0.5));
  void rows;
  for (let s = 1; s < floors; s++) {
    const z = 16 + s * ((top0 - 19) / floors);
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(COLORS.steelDark, 0.4));
  }
  // a thin roof crown + mast
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, top0, top0 + 4, hex('#b4ab98'), { ink: false });
  const m = iso.P((u0 + u1) / 2, (v0 + v1) / 2, top0 + 4);
  iso.r.line(m, [m[0], m[1] - 14 * RES], 1 * RES, COLORS.steelDark);
  return iso.build();
}

// =====================================================================
// NEOCLASSICAL MUSEUM / CIVIC BLOCK (National Archaeological Museum, Benaki,
// City Hall, ministries, mansions…) — the Athenian neoclassical workhorse: a
// symmetrical marble/ochre block with a projecting columned PORTICO, pilastered
// wings, regular windows, low pediment, flat or low-tiled roof. Parameterised
// by size, palette + portico order. (foot square N.)
// =====================================================================
function neoclassicalBlock(
  seed: number,
  n: number,
  opts: { ochre?: boolean; order?: 'doric' | 'ionic' | 'corinthian'; head?: number } = {},
): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(n, n, { swAnchor: true, headroom: opts.head ?? 90 });
  void seed;
  const body = opts.ochre ? OCHRE : MARBLE;
  const order = opts.order ?? 'ionic';
  const m = 0.5 / n; // proportional margin
  const u0 = m, u1 = n - m, v0 = m + 0.12, v1 = n - m - 0.12;
  const bodyH = 34 + n * 11; // taller: reads as a multi-storey block, not a slab
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, body, {
    topC: top(body, 0.15),
    leftC: opts.ochre ? shaded(OCHRE_D, 0.12) : shaded(MARBLE_D, 0.14),
  });
  // marble ground band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 11, MARBLE_W, { ink: false });
  // two storeys of regular windows on both visible faces
  const nCols = Math.max(4, Math.round(n * 3.2));
  const nRows = Math.max(3, Math.round(n * 2.6));
  const split = (bodyH - 14) / 2;
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 15, 15 + split - 4, nCols, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 15 + split + 2, bodyH - 5, nCols, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 15, 15 + split - 4, nRows, alpha(COLORS.glassDark, 0.76), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 15 + split + 2, bodyH - 5, nRows, alpha(COLORS.glassDark, 0.7), MARBLE_L);
  // cornice + low parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 4, MARBLE_L, { topC: top(MARBLE_L, 0.16) });
  // projecting central portico — full height, the civic signature
  const span = (u1 - u0) * (n >= 3 ? 0.44 : 0.56);
  const pu0 = (u0 + u1) / 2 - span / 2, pu1 = (u0 + u1) / 2 + span / 2;
  iso.box(pu0 - 0.05, v1 - 0.18, pu1 + 0.05, v1 + 0.14, 0, 13, MARBLE_L);
  colonnade(iso, v1 + 0.14, pu0, pu1, 13, bodyH, Math.max(4, Math.round(n * 1.8)), MARBLE_L, 0.026, order);
  iso.box(pu0 - 0.06, v1 - 0.04, pu1 + 0.06, v1 + 0.16, bodyH, bodyH + 5, MARBLE_L, { ink: false });
  pediment(iso, v1 + 0.14, pu0, pu1, bodyH + 5, 9 + n, MARBLE_L, n >= 3);
  return iso.build();
}

// #####################################################################
// ROUND 2 — APPENDED BESPOKE HEROES (seeds 138+). Each resolves an as-yet-
// unmatched PLACED name from src/data/cities/athens.ts: the Philopappos/Pnyx
// hill monuments, the Kerameikos + Roman-Agora + Epigraphic museums, Benaki
// annexes + Frissiras, National-Gardens-fringe monuments, Kotzia-Square
// neoclassical blocks, the Athens Observatory, Daphni/Kaisariani monasteries,
// the Piraeus cluster (the Averof battleship, the Olympias trireme, the
// submarine, naval/maritime museums), plus more ministries/mansions/churches.
// Pale Mediterranean marble + terracotta + whitewash throughout. Every one is
// a NEW draw fn (no round-1 fn reused except the deliberately-archetypal
// workhorses) with its own bespoke electrification light.
// #####################################################################

/** A small grey naval-grey for warships / steel maritime heroes. */
const NAVY_STEEL = hex('#8a93a0');
const NAVY_STEEL_D = hex('#6b7480');
const HULL_DK = hex('#37414f'); // a dark warship hull below the waterline
const SEA = hex('#3f5d72'); // the dusk harbour water
const WOOD = hex('#9a6a40'); // ancient ship timber
const WOOD_D = hex('#7a5230');

/** A standing bronze STATUE on a marble plinth (the Athenian square monument:
 *  Kolokotronis/Venizelos/Karaiskakis type). `equestrian` puts a horse under
 *  the rider; otherwise a standing figure. The plinth is tall + the bronze
 *  reads dark against marble. 1×1, headroom. */
function statueTile(seed: number, equestrian: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.22, v - 0.1, u + 0.22, v + 0.22, 0.2, 0.22);
  // a stepped marble plinth, tall + dignified
  iso.box(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 0, 6, MARBLE_W, { ink: false });
  iso.box(u - 0.18, v - 0.18, u + 0.18, v + 0.18, 6, 34, MARBLE, { topC: top(MARBLE, 0.16) });
  // a moulded cornice band + an inscription tablet on the front
  iso.box(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 34, 37, MARBLE_L, { ink: false });
  iso.r.poly([iso.P(u - 0.1, v + 0.18, 14), iso.P(u + 0.1, v + 0.18, 14), iso.P(u + 0.1, v + 0.18, 26), iso.P(u - 0.1, v + 0.18, 26)], shaded(MARBLE_D, 0.16));
  // the bronze figure
  const [bx, byB] = iso.P(u, v, 37);
  if (equestrian) {
    // a horse + rider in profile bronze (reads as a mounted general)
    iso.r.poly([[bx - 6 * RES, byB - 4 * RES], [bx + 6 * RES, byB - 4 * RES], [bx + 6 * RES, byB - 11 * RES], [bx - 6 * RES, byB - 11 * RES]], BRONZE); // body
    iso.r.rect(bx - 6 * RES, byB - 11 * RES, bx - 4 * RES, byB, BRONZE_HOT); // foreleg
    iso.r.rect(bx + 4 * RES, byB - 11 * RES, bx + 6 * RES, byB, BRONZE); // hindleg
    iso.r.poly([[bx + 6 * RES, byB - 11 * RES], [bx + 11 * RES, byB - 15 * RES], [bx + 10 * RES, byB - 9 * RES], [bx + 6 * RES, byB - 8 * RES]], BRONZE); // neck/head
    iso.r.rect(bx - 2 * RES, byB - 20 * RES, bx + 2 * RES, byB - 11 * RES, BRONZE_HOT); // rider torso
    disc(iso, bx, byB - 22 * RES, 2 * RES, BRONZE_HOT); // head
  } else {
    // a standing orator/statesman in a frock coat, one arm out
    iso.r.poly([[bx - 3 * RES, byB], [bx + 3 * RES, byB], [bx + 2.4 * RES, byB - 18 * RES], [bx - 2.4 * RES, byB - 18 * RES]], BRONZE); // body/coat
    iso.r.line([bx + 2 * RES, byB - 14 * RES], [bx + 7 * RES, byB - 12 * RES], 1.6 * RES, BRONZE_HOT); // outstretched arm
    iso.r.line([bx - 2 * RES, byB - 14 * RES], [bx - 3 * RES, byB - 4 * RES], 1.4 * RES, BRONZE); // other arm
    disc(iso, bx, byB - 21 * RES, 2.2 * RES, BRONZE_HOT); // head
    iso.glint([bx + 1 * RES, byB - 16 * RES]);
  }
  return iso.build();
}

/** A portrait BUST on a tall slim marble column/pillar (the Προτομή /
 *  Ανδριάντας / herm type that dots the Athenian parks). 1×1, headroom. */
function bustTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.14, v - 0.08, u + 0.14, v + 0.16, 0.18, 0.22);
  // a square base
  iso.box(u - 0.14, v - 0.14, u + 0.14, v + 0.14, 0, 5, MARBLE_W, { ink: false });
  // a tall tapered herm pillar
  iso.box(u - 0.08, v - 0.08, u + 0.08, v + 0.08, 5, 30, MARBLE, { topC: top(MARBLE, 0.14) });
  iso.box(u - 0.1, v - 0.1, u + 0.1, v + 0.1, 30, 33, MARBLE_L, { ink: false });
  // the bronze bust: shoulders + head
  const [bx, byB] = iso.P(u, v, 33);
  iso.r.poly([[bx - 4 * RES, byB], [bx + 4 * RES, byB], [bx + 3 * RES, byB - 5 * RES], [bx - 3 * RES, byB - 5 * RES]], BRONZE); // shoulders/chest
  disc(iso, bx, byB - 8 * RES, 3 * RES, BRONZE_HOT); // head
  iso.glint([bx + 1.2 * RES, byB - 9 * RES]);
  return iso.build();
}

// =====================================================================
// DAPHNI MONASTERY (Μονή Δαφνίου) — the 11th-c. Byzantine walled monastery: a
// cross-in-square KATHOLIKON crowned by a broad tiled dome on a high drum,
// inside a fortified rubble-stone enclosure with an arcaded narthex. The dome-
// in-a-walled-court is the read. 2×2, headroom.
// =====================================================================
function daphniMonasteryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const STONE = hex('#cbbd9c'); // honey rubble stone
  const u0 = 0.18, u1 = 1.82, v0 = 0.18, v1 = 1.82;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the fortified enclosure wall (low, runs the perimeter)
  iso.box(u0, v0, u1, v1, 0, 16, STONE, { topC: top(STONE, 0.12), leftC: shaded(STONE, 0.14) });
  // sink the courtyard so the church stands proud inside the walls
  iso.box(u0 + 0.14, v0 + 0.14, u1 - 0.14, v1 - 0.14, 0, 4, shaded(STONE, 0.2), { ink: false });
  // the cruciform katholikon body in the centre
  const cu0 = u0 + 0.46, cu1 = u1 - 0.46, cv0 = v0 + 0.46, cv1 = v1 - 0.46;
  iso.box(cu0, cv0, cu1, cv1, 4, 40, STONE, { topC: top(STONE, 0.14) });
  // tiled cross-gable roofs over the arms
  iso.gable(cu0, cv0, cu1, cv1, 40, 9, 'v', TERRA, STONE);
  // a small apse on the right (east end)
  iso.box(cu1 - 0.02, cv0 + 0.14, cu1 + 0.12, cv1 - 0.14, 4, 30, STONE, { ink: false });
  // arcaded narthex porch on the front (v1)
  for (let i = 0; i < 3; i++) {
    const uu = cu0 + 0.06 + i * 0.18;
    const archP: Pt[] = [iso.P(uu, cv1, 6), iso.P(uu, cv1, 18)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; archP.push(iso.P(uu + 0.12 * t, cv1, 18 + Math.sin(t * Math.PI) * 6)); }
    archP.push(iso.P(uu + 0.12, cv1, 6));
    iso.r.poly(archP, alpha(shaded(STONE, 0.4), 0.9));
  }
  // THE BROAD DOME on a high octagonal drum — the signature
  const cx = (cu0 + cu1) / 2, cy = (cv0 + cv1) / 2;
  iso.box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, 46, 64, lighten(STONE, 0.05)); // drum
  // drum windows
  for (let i = 0; i < 4; i++) iso.r.line(iso.P(cx - 0.14 + i * 0.09, cy + 0.16, 50), iso.P(cx - 0.14 + i * 0.09, cy + 0.16, 60), 1.2 * RES, alpha(COLORS.glassDark, 0.7));
  const [dx, dyB] = iso.P(cx, cy, 64);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); dome.push([dx + Math.cos(a) * 13 * RES, dyB - Math.sin(a) * 16 * RES]); }
  iso.r.poly(dome, lit(TERRA, 0.06));
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // gilt cross
  iso.r.line([dx, dyB - 16 * RES], [dx, dyB - 25 * RES], 1.4 * RES, GILT);
  iso.r.line([dx - 3 * RES, dyB - 21 * RES], [dx + 3 * RES, dyB - 21 * RES], 1.1 * RES, GILT);
  // a cypress in the courtyard corner (the monastery garden)
  iso.cone(u0 + 0.28, v1 - 0.26, 0.08, 30, hex('#4d6048'), 4);
  return iso.build();
}

// =====================================================================
// NATIONAL OBSERVATORY OF ATHENS (Εθνικό Αστεροσκοπείο) — Hansen's small white-
// marble cross-plan temple of science on the Hill of the Nymphs, crowned by a
// hemispherical metal TELESCOPE DOME with its slotted shutter. The cross body
// + silver dome is the read. 2×2, headroom.
// =====================================================================
function observatoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.26, u1 = 1.74, v0 = 0.26, v1 = 1.74;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // a low rock terrace (the hilltop)
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 6, ROCK, { ink: false });
  // the cruciform marble body (a Greek cross: a central block with four arms)
  const bz = 6;
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, bz, bz + 34, MARBLE, { topC: top(MARBLE, 0.16) }); // core
  iso.box(u0 + 0.3, v0, u1 - 0.3, v0 + 0.36, bz, bz + 26, MARBLE, { ink: false }); // far arm
  iso.box(u0 + 0.3, v1 - 0.36, u1 - 0.3, v1, bz, bz + 26, MARBLE, { topC: top(MARBLE, 0.14) }); // near arm
  iso.box(u1 - 0.36, v0 + 0.3, u1, v1 - 0.3, bz, bz + 26, MARBLE, { topC: top(MARBLE, 0.14) }); // right arm
  iso.box(u0, v0 + 0.3, u0 + 0.36, v1 - 0.3, bz, bz + 26, MARBLE, { ink: false }); // left arm
  // a little Ionic porch on the front arm
  colonnade(iso, v1, u0 + 0.42, u1 - 0.42, bz, bz + 24, 3, MARBLE_L, 0.02, 'ionic');
  pediment(iso, v1, u0 + 0.42, u1 - 0.42, bz + 26, 6, MARBLE_L);
  // regular windows on the arms
  iso.windowsRight(u1, v0 + 0.36, v1 - 0.36, bz + 6, bz + 22, 3, alpha(COLORS.glassDark, 0.78), MARBLE_L);
  // THE TELESCOPE DOME on the crossing — a hemispherical metal cap with a slot
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, bz + 34, bz + 42, lighten(MARBLE_W, 0.04)); // round base ring
  const [dx, dyB] = iso.P(cx, cy, bz + 42);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); dome.push([dx + Math.cos(a) * 15 * RES, dyB - Math.sin(a) * 15 * RES]); }
  iso.r.poly(dome, lit(hex('#c2c8cf'), 0.1)); // silvered metal dome
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // the observing slot (a dark slit up the dome)
  iso.r.poly([[dx - 1.6 * RES, dyB], [dx + 1.6 * RES, dyB], [dx + 1 * RES, dyB - 15 * RES], [dx - 1 * RES, dyB - 15 * RES]], shaded(HULL_DK, 0.1));
  iso.glint([dx - 7 * RES, dyB - 7 * RES]);
  return iso.build();
}

// =====================================================================
// PHILOPAPPOS MONUMENT (Μνημείο Φιλοπάππου) — the Roman marble mausoleum on the
// Hill of the Muses: a tall slightly-CONCAVE two-storey marble facade-screen
// (now partly ruined) with statue-niches, crowning the bare hill. The curved
// facade on the rock is the read. 1×1, big headroom.
// =====================================================================
function philopapposTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const u0 = 0.18, u1 = 0.82, v = 0.66;
  iso.shadow(u0 - 0.06, v - 0.3, u1 + 0.06, v + 0.16, 0.22, 0.22);
  // the bare hilltop rock
  iso.box(u0 - 0.1, v - 0.34, u1 + 0.1, v + 0.12, 0, 10, ROCK, { leftC: shaded(ROCK_D, 0.14), topC: top(ROCK, 0.08) });
  // the concave facade — built as a shallow arc of marble panels facing v (front)
  const z0 = 10, lowTop = 44, hiTop = 78;
  const N = 5;
  for (let i = 0; i < N; i++) {
    const uu = u0 + (u1 - u0) * (i / N);
    const uu2 = u0 + (u1 - u0) * ((i + 1) / N);
    const dip = Math.sin((i / (N - 1)) * Math.PI) * 0.05; // bow the wall toward the viewer at the centre
    const vv = v + 0.04 - dip;
    iso.box(uu, vv, uu2, vv + 0.06, z0, i === Math.floor(N / 2) ? hiTop : lowTop, MARBLE, {
      topC: top(MARBLE, 0.16), leftC: shaded(MARBLE_D, 0.12),
    });
    // a statue niche (dark recess) in each lower bay
    const [nx, nyB] = iso.P((uu + uu2) / 2, vv, z0 + 8);
    const [, nyT] = iso.P((uu + uu2) / 2, vv, z0 + 30);
    iso.r.poly([[nx - 3 * RES, nyB], [nx + 3 * RES, nyB], [nx + 3 * RES, nyT + 4 * RES], [nx, nyT], [nx - 3 * RES, nyT + 4 * RES]], alpha(shaded(MARBLE_D, 0.4), 0.92));
    // a marble figure in the central + flanking niches
    if (i === 2) iso.r.poly([[nx - 2 * RES, nyB], [nx + 2 * RES, nyB], [nx + 1.4 * RES, nyT + 6 * RES], [nx - 1.4 * RES, nyT + 6 * RES]], lit(MARBLE_L, 0.06));
  }
  // a crowning cornice fragment over the tall central bay
  const cm = (u0 + u1) / 2;
  iso.box(cm - 0.1, v - 0.02, cm + 0.1, v + 0.06, hiTop, hiTop + 4, MARBLE_L, { ink: false });
  iso.gleam(iso.P(u0, v + 0.04, lowTop), iso.P(u1, v + 0.04, lowTop));
  return iso.build();
}

// =====================================================================
// THE PNYX (Πνύκα) — the ancient assembly place of Athenian democracy: a great
// curved stone RETAINING WALL of huge polygonal blocks holding up the semi-
// circular speaking-ground, with the rock-cut BEMA (orator's step) projecting
// at the centre. The curved wall + bema is the read. 2×2.
// =====================================================================
function pnyxTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const STONE = hex('#bdb189');
  const u0 = 0.18, u1 = 1.82, v0 = 0.2, v1 = 1.8;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the sloping rock ground
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, ROCK, { topC: top(ROCK, 0.08) });
  // the great curved retaining wall sweeping across the front (a thick arc band)
  const [cx, cyB] = iso.P((u0 + u1) / 2, v1 - 0.5, 8);
  const rad = 0.62 * (u1 - u0) * (CELL_W / 2) * 0.5;
  const arcTop: Pt[] = [], arcBot: Pt[] = [];
  for (let i = 0; i <= 22; i++) {
    const a = Math.PI * (0.04 + 0.92 * (i / 22));
    arcTop.push([cx - Math.cos(a) * rad, cyB - Math.sin(a) * rad * 0.5 - 28 * RES]);
    arcBot.push([cx - Math.cos(a) * rad, cyB - Math.sin(a) * rad * 0.5]);
  }
  iso.r.poly([...arcTop, ...arcBot.reverse()], lit(STONE, 0.04));
  iso.r.polyline(arcTop, INK_W * 0.7, INK);
  // huge polygonal masonry joints across the wall face
  for (let i = 2; i < 21; i += 3) {
    iso.r.line([arcTop[i]![0], arcTop[i]![1]], [arcTop[i]![0] + 2 * RES, arcTop[i]![1] + 28 * RES], 0.8 * RES, alpha(ROCK_D, 0.5));
  }
  // the rock-cut BEMA — a stepped speaker's platform projecting at the centre
  const [mx, myB] = iso.P((u0 + u1) / 2, v1 - 0.5, 8);
  for (let s = 0; s < 3; s++) {
    iso.r.poly([
      [mx - (8 - s * 2) * RES, myB - 30 * RES - s * 5 * RES],
      [mx + (8 - s * 2) * RES, myB - 30 * RES - s * 5 * RES],
      [mx + (8 - s * 2) * RES, myB - 35 * RES - s * 5 * RES],
      [mx - (8 - s * 2) * RES, myB - 35 * RES - s * 5 * RES],
    ], s % 2 ? lit(STONE, 0.06) : shaded(STONE, 0.06));
  }
  return iso.build();
}

// =====================================================================
// HADRIAN'S AQUEDUCT (Αδριάνειο Υδραγωγείο) — the Roman water-supply work,
// rendered as a run of tall arched stone AQUEDUCT ARCHES marching across the
// ground (a recognisable Roman-arcade silhouette) ending in a small reservoir
// house. 2×2, headroom.
// =====================================================================
function aqueductTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const STONE = hex('#c7b994');
  const u0 = 0.16, u1 = 1.84, v = 1.2;
  iso.shadow(u0, v - 0.3, u1, v + 0.2, 0.22, 0.2);
  // a low ground berm
  iso.box(u0 - 0.04, v - 0.34, u1 + 0.04, v + 0.06, 0, 5, ROCK, { ink: false });
  // a row of round-arched piers carrying a continuous parapet (the aqueduct)
  const z0 = 5, archTop = 40, parapet = 50;
  const piers = 6;
  for (let i = 0; i <= piers; i++) {
    const uu = u0 + (u1 - u0) * (i / piers);
    iso.box(uu - 0.05, v, uu + 0.05, v + 0.06, z0, parapet, STONE, { topC: top(STONE, 0.12), leftC: shaded(STONE, 0.14) });
  }
  // the arches between piers (dark voids on the front face) + the spandrels
  for (let i = 0; i < piers; i++) {
    const uA = u0 + (u1 - u0) * (i / piers) + 0.05;
    const uB = u0 + (u1 - u0) * ((i + 1) / piers) - 0.05;
    const archP: Pt[] = [iso.P(uA, v + 0.03, z0), iso.P(uA, v + 0.03, archTop - 10)];
    for (let j = 0; j <= 8; j++) { const t = j / 8; archP.push(iso.P(uA + (uB - uA) * t, v + 0.03, archTop - 10 + Math.sin(t * Math.PI) * 12)); }
    archP.push(iso.P(uB, v + 0.03, z0));
    iso.r.poly(archP, alpha(shaded(STONE, 0.42), 0.9));
    iso.r.polyline(archP, INK_W * 0.55, alpha(INK, 0.55));
  }
  // the continuous parapet band + water channel on top
  iso.box(u0 - 0.02, v - 0.01, u1 + 0.02, v + 0.07, parapet, parapet + 4, lit(STONE, 0.08), { ink: false });
  // a small reservoir house at the right end
  iso.box(u1 - 0.18, v - 0.16, u1 + 0.02, v + 0.06, z0, archTop, STONE, { topC: top(STONE, 0.12) });
  iso.gable(u1 - 0.18, v - 0.16, u1 + 0.02, v + 0.06, archTop, 8, 'u', TERRA, STONE);
  return iso.build();
}

// =====================================================================
// TOMB OF THE UNKNOWN SOLDIER (Μνημείο Αγνώστου Στρατιώτου) — the great marble
// memorial below the Parliament: a broad rusticated marble RETAINING WALL with
// a central relief of a fallen hoplite, flanked by inscriptions, on a wide
// terrace where two Evzone guards stand. The carved wall + guards is the read.
// 2×2.
// =====================================================================
function unknownSoldierTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the broad terrace
  iso.box(u0, v1 - 0.1, u1, v1 + 0.06, 0, 4, MARBLE_W, { ink: false });
  // the long rusticated marble wall
  iso.box(u0, v0, u1, v0 + 0.34, 4, 40, MARBLE, { topC: top(MARBLE, 0.16), leftC: shaded(MARBLE_D, 0.12) });
  // ashlar courses scored across the wall
  for (let zr = 10; zr < 38; zr += 8) iso.r.line(iso.P(u0, v0 + 0.34, zr), iso.P(u1, v0 + 0.34, zr), 0.6 * RES, alpha(MARBLE_D, 0.4));
  // the central relief panel (the recumbent hoplite) — a shaded sunken rectangle
  const cm = (u0 + u1) / 2;
  iso.r.poly([iso.P(cm - 0.2, v0 + 0.34, 10), iso.P(cm + 0.2, v0 + 0.34, 10), iso.P(cm + 0.2, v0 + 0.34, 32), iso.P(cm - 0.2, v0 + 0.34, 32)], shaded(MARBLE_D, 0.28));
  // a faint recumbent figure carved in the panel
  iso.r.poly([iso.P(cm - 0.14, v0 + 0.34, 16), iso.P(cm + 0.14, v0 + 0.34, 15), iso.P(cm + 0.13, v0 + 0.34, 20), iso.P(cm - 0.13, v0 + 0.34, 21)], lit(MARBLE_L, 0.04));
  // flanking inscription bands
  for (const fu of [u0 + 0.2, u1 - 0.4] as const) iso.r.poly([iso.P(fu, v0 + 0.34, 14), iso.P(fu + 0.2, v0 + 0.34, 14), iso.P(fu + 0.2, v0 + 0.34, 30), iso.P(fu, v0 + 0.34, 30)], alpha(MARBLE_D, 0.3));
  // two Evzone guards on the terrace (a fez + kilt read in cream + a red cap)
  for (const gu of [cm - 0.4, cm + 0.4] as const) {
    const [gx, gyB] = iso.P(gu, v1 - 0.06, 4);
    iso.r.poly([[gx - 2 * RES, gyB], [gx + 2 * RES, gyB], [gx + 1.6 * RES, gyB - 8 * RES], [gx - 1.6 * RES, gyB - 8 * RES]], MARBLE_L); // foustanella
    iso.r.rect(gx - 1.6 * RES, gyB - 13 * RES, gx + 1.6 * RES, gyB - 8 * RES, hex('#8a2f2a')); // tunic
    disc(iso, gx, gyB - 15 * RES, 1.4 * RES, hex('#b03a30')); // red fez
  }
  return iso.build();
}

// =====================================================================
// MONUMENT OF THE EPONYMOUS HEROES (Μνημείο επωνύμων ηρώων) — the long marble
// statue-base in the Agora that carried ten bronze tribal heroes over the
// public notice-boards: a long low marble PLINTH topped by a row of small
// bronze standing figures, ringed by a stone fence. 2×2.
// =====================================================================
function eponymousHeroesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const u0 = 0.24, u1 = 1.76, v0 = 0.7, v1 = 1.3;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the marble ground + a low surrounding fence (posts)
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 3, MARBLE_W, { ink: false });
  for (let i = 0; i <= 6; i++) {
    const uu = u0 + (u1 - u0) * (i / 6);
    iso.box(uu - 0.012, v1 - 0.02, uu + 0.012, v1 + 0.02, 3, 12, MARBLE_D, { ink: false });
  }
  // the long stepped marble plinth
  iso.box(u0, v0 + 0.1, u1, v1 - 0.16, 3, 8, MARBLE, { ink: true });
  iso.box(u0 + 0.04, v0 + 0.14, u1 - 0.04, v1 - 0.2, 8, 18, MARBLE_L, { topC: top(MARBLE_L, 0.16) });
  // notice-boards hung along the plinth face
  for (let i = 0; i < 5; i++) {
    const uu = u0 + 0.1 + i * 0.32;
    iso.r.poly([iso.P(uu, v1 - 0.2, 9), iso.P(uu + 0.18, v1 - 0.2, 9), iso.P(uu + 0.18, v1 - 0.2, 15), iso.P(uu, v1 - 0.2, 15)], shaded(MARBLE_D, 0.2));
  }
  // the row of ten little bronze heroes on top
  for (let i = 0; i < 10; i++) {
    const uu = u0 + 0.08 + i * ((u1 - u0 - 0.16) / 9);
    const [hx, hyB] = iso.P(uu, (v0 + v1) / 2 - 0.02, 18);
    iso.r.rect(hx - 1.2 * RES, hyB - 9 * RES, hx + 1.2 * RES, hyB, i % 2 ? BRONZE : BRONZE_HOT);
    disc(iso, hx, hyB - 11 * RES, 1.2 * RES, BRONZE_HOT);
  }
  return iso.build();
}

// =====================================================================
// HELLENISTIC RUIN COURT (Ἐλευσίνιον / Δελφίνιον / Φυλακή Σωκράτη / Ηρώο
// Μουσαίου) — an excavated ancient sanctuary: a low marble foundation grid of
// wall-stubs + a couple of standing column fragments + a stretch of stepped
// terrace, on the tawny rock. The dig-site footprint is the read. `caves` adds
// rock-cut chambers (the "Prison of Socrates"). 1×1.
// =====================================================================
function ruinCourtTile(seed: number, caves: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 50 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // the rock / earth ground
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 5, ROCK, { topC: top(ROCK, 0.08) });
  if (caves) {
    // rock-cut chamber doorways in a low cliff at the back
    iso.box(u0, v0, u1, v0 + 0.22, 5, 30, ROCK, { leftC: shaded(ROCK_D, 0.16), topC: top(ROCK, 0.06) });
    for (let i = 0; i < 3; i++) {
      const uu = u0 + 0.1 + i * 0.22;
      iso.r.poly([iso.P(uu, v0 + 0.22, 6), iso.P(uu + 0.1, v0 + 0.22, 6), iso.P(uu + 0.1, v0 + 0.22, 20), iso.P(uu, v0 + 0.22, 20)], shaded(HULL_DK, 0.06));
    }
  } else {
    // a grid of low marble wall-stub foundations
    for (let i = 0; i < 4; i++) {
      const uu = u0 + 0.08 + i * 0.18;
      iso.box(uu, v0 + 0.1, uu + 0.04, v1 - 0.1, 5, 9 + (i % 2) * 3, MARBLE_W, { ink: false });
    }
    for (let j = 0; j < 3; j++) {
      const vv = v0 + 0.16 + j * 0.22;
      iso.box(u0 + 0.1, vv, u1 - 0.1, vv + 0.04, 5, 8, MARBLE_W, { ink: false });
    }
    // two standing column fragments + a fallen drum
    iso.box(u0 + 0.2, v0 + 0.2, u0 + 0.26, v0 + 0.26, 5, 26, MARBLE, { ink: false });
    iso.box(u1 - 0.28, v1 - 0.3, u1 - 0.22, v1 - 0.24, 5, 20, MARBLE, { ink: false });
    const [dx, dy] = iso.P(u1 - 0.2, v1 - 0.18, 5);
    disc(iso, dx, dy, 3.4 * RES, lit(MARBLE_W, 0.06));
  }
  return iso.build();
}

// =====================================================================
// THE AVEROF BATTLESHIP (Θωρηκτό Γεώργιος Αβέρωφ) — the 1911 armoured cruiser,
// now a floating museum at Faliro: a long grey steel HULL on the dusk water,
// two big gun TURRETS fore + aft, a tall central superstructure with the
// foremast + funnels, and the Greek ensign. The warship silhouette is the
// read. 3×3 (long), headroom.
// =====================================================================
function averofBattleshipTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.2, u1 = 2.8, vC = 1.5; // the ship runs along u, centred on v
  // the harbour water
  iso.box(0, 0, 3, 3, 0, 3, SEA, { topC: top(SEA, 0.1), ink: false });
  // a faint wake ellipse around the hull
  const [wx, wy] = iso.P((u0 + u1) / 2, vC, 3);
  iso.r.poly([[wx - 90 * RES, wy], [wx, wy - 22 * RES], [wx + 90 * RES, wy], [wx, wy + 22 * RES]], alpha(lighten(SEA, 0.08), 0.5));
  // THE HULL: a long box with a raked clipper bow at the right (u1) end
  const hz0 = 3, deck = 26;
  iso.box(u0 + 0.2, vC - 0.22, u1 - 0.2, vC + 0.22, hz0, deck, NAVY_STEEL, {
    topC: top(NAVY_STEEL, 0.1), leftC: shaded(HULL_DK, 0.1), rightC: lit(NAVY_STEEL, 0.06),
  });
  // dark hull below + a white boot-top stripe
  iso.box(u0 + 0.2, vC - 0.22, u1 - 0.2, vC + 0.22, hz0, hz0 + 7, HULL_DK, { ink: false });
  iso.r.line(iso.P(u0 + 0.2, vC + 0.22, hz0 + 8), iso.P(u1 - 0.2, vC + 0.22, hz0 + 8), 1.2 * RES, alpha(MARBLE_L, 0.6));
  // the raked bow prow (a wedge at u1)
  iso.r.poly([iso.P(u1 - 0.2, vC - 0.22, hz0), iso.P(u1 + 0.06, vC, deck), iso.P(u1 - 0.2, vC + 0.22, hz0)], lit(NAVY_STEEL, 0.06));
  // a row of portholes / casemate guns along the hull
  for (let i = 0; i < 9; i++) { const uu = u0 + 0.34 + i * 0.26; iso.r.line(iso.P(uu, vC + 0.22, 14), iso.P(uu, vC + 0.22, 17), 1.4 * RES, alpha(HULL_DK, 0.7)); }
  // fore + aft main TURRETS (big rounded gun-houses with twin barrels)
  for (const [tu, dir] of [[u1 - 0.6, 1], [u0 + 0.6, -1]] as const) {
    iso.box(tu - 0.18, vC - 0.18, tu + 0.18, vC + 0.18, deck, deck + 14, NAVY_STEEL_D, { topC: top(NAVY_STEEL_D, 0.12) });
    const [bx, by] = iso.P(tu + dir * 0.18, vC, deck + 9);
    // two thick twin gun barrels jutting out over the bow/stern
    iso.r.line([bx, by - 1.6 * RES], [bx + dir * 20 * RES, by - 3.4 * RES], 2.8 * RES, HULL_DK);
    iso.r.line([bx, by + 2.6 * RES], [bx + dir * 20 * RES, by + 0.8 * RES], 2.8 * RES, HULL_DK);
    iso.r.polyline([[bx, by - 1.6 * RES], [bx + dir * 20 * RES, by - 3.4 * RES]], 0.7 * RES, alpha(INK, 0.5));
  }
  // the central SUPERSTRUCTURE (bridge tower + the two funnels + foremast)
  iso.box(1.06, vC - 0.18, 1.7, vC + 0.18, deck, deck + 24, NAVY_STEEL, { topC: top(NAVY_STEEL, 0.12) });
  iso.windowsRight(1.7, vC - 0.16, vC + 0.16, deck + 8, deck + 20, 4, alpha(COLORS.glassLit, 0.5));
  // two raked funnels
  for (const fu of [1.24, 1.5] as const) {
    iso.box(fu - 0.07, vC - 0.09, fu + 0.07, vC + 0.09, deck + 24, deck + 48, NAVY_STEEL_D, { topC: top(NAVY_STEEL_D, 0.08) });
    iso.r.poly([iso.P(fu - 0.07, vC, deck + 48), iso.P(fu + 0.07, vC, deck + 48), iso.P(fu + 0.06, vC, deck + 45), iso.P(fu - 0.06, vC, deck + 45)], HULL_DK); // smoke cap
  }
  // the tall tripod FOREMAST (the Averof's signature) with a fighting top
  const [mx, myB] = iso.P(1.04, vC, deck + 24);
  iso.r.line([mx, myB], [mx, myB - 56 * RES], 2 * RES, NAVY_STEEL_D); // main pole
  iso.r.line([mx, myB - 20 * RES], [mx - 7 * RES, myB], 1.2 * RES, alpha(NAVY_STEEL_D, 0.8)); // tripod leg
  iso.r.line([mx, myB - 20 * RES], [mx + 7 * RES, myB], 1.2 * RES, alpha(NAVY_STEEL_D, 0.8)); // tripod leg
  iso.r.rect(mx - 4 * RES, myB - 42 * RES, mx + 4 * RES, myB - 36 * RES, NAVY_STEEL); // fighting top
  iso.r.polyline([[mx - 4 * RES, myB - 42 * RES], [mx + 4 * RES, myB - 42 * RES], [mx + 4 * RES, myB - 36 * RES], [mx - 4 * RES, myB - 36 * RES]], 0.6 * RES, alpha(INK, 0.6), true);
  iso.glint([mx, myB - 50 * RES]);
  // the Greek ensign at the stern
  const [ex, ey] = iso.P(u0 + 0.16, vC, deck);
  iso.r.line([ex, ey], [ex, ey - 26 * RES], 1.1 * RES, MARBLE_D);
  iso.r.rect(ex - 9 * RES, ey - 26 * RES, ex, ey - 19 * RES, hex('#2f6fb0'));
  iso.r.line([ex - 9 * RES, ey - 22.5 * RES], [ex, ey - 22.5 * RES], 1.2 * RES, COLORS.white);
  return iso.build();
}

// =====================================================================
// THE OLYMPIAS TRIREME (Τριήρης Ολυμπιάς) — the reconstructed ancient Athenian
// war-galley: a long low slender WOODEN hull with a sweeping curved stern
// (aphlaston), a bronze RAM at the waterline bow, three banks of oars out each
// side, and a single square sail on a central mast. The oared galley is the
// read. 2×2 (long), headroom.
// =====================================================================
function triremeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.12, u1 = 1.88, vC = 1.0;
  // the water
  iso.box(0, 0, 2, 2, 0, 3, SEA, { topC: top(SEA, 0.1), ink: false });
  // the long slender hull (a shallow boat-shaped box)
  const hz0 = 3, gun = 16;
  iso.box(u0 + 0.18, vC - 0.12, u1 - 0.3, vC + 0.12, hz0, gun, WOOD, {
    topC: top(WOOD, 0.12), leftC: shaded(WOOD_D, 0.12), rightC: lit(WOOD, 0.06),
  });
  // the bronze RAM jutting at the bow (right)
  iso.r.poly([iso.P(u1 - 0.3, vC - 0.06, hz0), iso.P(u1 + 0.02, vC, hz0 + 3), iso.P(u1 - 0.3, vC + 0.06, hz0)], BRONZE);
  iso.r.polyline([iso.P(u1 - 0.3, vC - 0.06, hz0), iso.P(u1 + 0.02, vC, hz0 + 3), iso.P(u1 - 0.3, vC + 0.06, hz0)], INK_W * 0.55, alpha(INK, 0.6));
  // the curved stern (aphlaston) sweeping up at the left
  const [sx, syB] = iso.P(u0 + 0.18, vC, gun);
  const stern: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; stern.push([sx - t * 10 * RES, syB - t * 22 * RES + Math.sin(t * Math.PI) * 4 * RES]); }
  iso.r.polyline(stern, 2 * RES, WOOD_D);
  iso.r.polyline(stern, 0.8 * RES, lit(WOOD, 0.1));
  // a painted eye at the bow + a wale stripe
  iso.r.line(iso.P(u0 + 0.18, vC + 0.12, gun - 2), iso.P(u1 - 0.3, vC + 0.12, gun - 2), 1 * RES, alpha(hex('#5a3a22'), 0.7));
  const [eyx, eyy] = iso.P(u1 - 0.42, vC + 0.12, 11);
  disc(iso, eyx, eyy, 2 * RES, MARBLE_L);
  disc(iso, eyx, eyy, 0.9 * RES, HULL_DK);
  // three banks of OARS fanning out from the near (v+) side
  for (let i = 0; i < 14; i++) {
    const uu = u0 + 0.26 + i * 0.1;
    const [ox, oy] = iso.P(uu, vC + 0.12, 8);
    iso.r.line([ox, oy], [ox - 3 * RES, oy + 9 * RES], 0.8 * RES, alpha(WOOD_D, 0.85));
  }
  // the central mast + a square linen sail
  const [mx, myB] = iso.P((u0 + u1) / 2 - 0.1, vC, gun);
  iso.r.line([mx, myB], [mx, myB - 46 * RES], 1.6 * RES, WOOD_D);
  iso.r.line([mx - 16 * RES, myB - 44 * RES], [mx + 16 * RES, myB - 44 * RES], 1.4 * RES, WOOD_D); // yard
  iso.r.poly([[mx - 15 * RES, myB - 43 * RES], [mx + 15 * RES, myB - 43 * RES], [mx + 13 * RES, myB - 22 * RES], [mx - 13 * RES, myB - 22 * RES]], lit(MARBLE_W, 0.04)); // sail
  iso.r.polyline([[mx - 15 * RES, myB - 43 * RES], [mx + 15 * RES, myB - 43 * RES], [mx + 13 * RES, myB - 22 * RES], [mx - 13 * RES, myB - 22 * RES]], INK_W * 0.5, alpha(INK, 0.5), true);
  return iso.build();
}

// =====================================================================
// SUBMARINE PAPANIKOLIS (Υ/Β Παπανικολής) — a grey submarine museum on the
// water at Palaio Faliro: a long low cylindrical steel HULL mostly awash, a
// central conning-tower (sail) with a periscope, deck-line + dive planes. 2×2.
// =====================================================================
function submarineTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const u0 = 0.14, u1 = 1.86, vC = 1.0;
  iso.box(0, 0, 2, 2, 0, 3, SEA, { topC: top(SEA, 0.1), ink: false });
  // the long rounded hull (a low cylinder)
  const [hx, hy] = iso.P((u0 + u1) / 2, vC, 3);
  const halfL = ((u1 - u0) / 2) * (CELL_W / 2);
  iso.r.poly([
    [hx - halfL, hy - 5 * RES], [hx + halfL * 0.96, hy - 8 * RES],
    [hx + halfL, hy - 2 * RES], [hx + halfL * 0.9, hy + 4 * RES],
    [hx - halfL, hy + 3 * RES],
  ], NAVY_STEEL);
  iso.r.polyline([[hx - halfL, hy - 5 * RES], [hx + halfL * 0.96, hy - 8 * RES], [hx + halfL, hy - 2 * RES]], INK_W * 0.6, INK);
  // dark waterline + a deck casing line
  iso.r.line([hx - halfL, hy + 3 * RES], [hx + halfL * 0.9, hy + 4 * RES], 1.4 * RES, alpha(HULL_DK, 0.8));
  iso.r.line([hx - halfL * 0.9, hy - 4 * RES], [hx + halfL * 0.85, hy - 6 * RES], 0.8 * RES, alpha(NAVY_STEEL_D, 0.7));
  // the conning tower (sail) just aft of centre
  iso.box((u0 + u1) / 2 - 0.18, vC - 0.06, (u0 + u1) / 2 + 0.02, vC + 0.06, 6, 22, NAVY_STEEL_D, { topC: top(NAVY_STEEL_D, 0.1) });
  // periscope + a small mast
  const [px, pyB] = iso.P((u0 + u1) / 2 - 0.08, vC, 22);
  iso.r.line([px, pyB], [px, pyB - 16 * RES], 1.1 * RES, HULL_DK);
  iso.r.line([px - 3 * RES, pyB - 12 * RES], [px, pyB - 16 * RES], 1 * RES, NAVY_STEEL);
  iso.glint([hx + halfL * 0.4, hy - 6 * RES]);
  return iso.build();
}

// =====================================================================
// EUGENIDES PLANETARIUM (Νέο Ψηφιακό Πλανητάριο) — the great modern domed
// planetarium: a broad low cylindrical drum carrying a smooth hemispherical
// PROJECTION DOME, with a glazed entrance band. The big clean dome is the read.
// 2×2, headroom.
// =====================================================================
function planetariumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const SHELL = hex('#dad3c4');
  const u0 = 0.22, u1 = 1.78, v0 = 0.22, v1 = 1.78;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // a low plaza podium
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 8, hex('#cfc6b4'), { ink: false });
  // the cylindrical drum (glazed entry band on the front)
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(u0, v0, u1, v1, 8, 34, SHELL, { topC: top(SHELL, 0.14), leftC: shaded(SHELL, 0.12) });
  iso.box(u0 + 0.1, v1 - 0.04, u1 - 0.1, v1, 8, 26, alpha(COLORS.glassSky, 0.9), { ink: false });
  for (let i = 0; i < 8; i++) { const uu = u0 + 0.14 + i * ((u1 - u0 - 0.28) / 8); iso.r.line(iso.P(uu, v1, 10), iso.P(uu, v1, 26), 0.6 * RES, alpha(COLORS.white, 0.5)); }
  // THE HEMISPHERICAL DOME
  const [dx, dyB] = iso.P(cx, cy, 34);
  const R = 0.5 * (u1 - u0) * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); dome.push([dx + Math.cos(a) * R, dyB - Math.sin(a) * R * 0.92]); }
  iso.r.poly(dome, lit(SHELL, 0.08));
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // a couple of latitude seams + a top vent
  for (const f of [0.4, 0.7] as const) {
    const seam: Pt[] = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); seam.push([dx + Math.cos(a) * R * f, dyB - Math.sin(a) * R * 0.92 * f - R * 0.92 * (1 - f) * 0.0]); }
    // a horizontal seam ellipse at height f
    const sy = dyB - R * 0.92 * f;
    iso.r.poly([[dx - R * Math.sqrt(Math.max(0, 1 - f * f)), sy], [dx + R * Math.sqrt(Math.max(0, 1 - f * f)), sy], [dx + R * Math.sqrt(Math.max(0, 1 - f * f)), sy + 1.2 * RES], [dx - R * Math.sqrt(Math.max(0, 1 - f * f)), sy + 1.2 * RES]], alpha(shaded(SHELL, 0.16), 0.6));
    void seam;
  }
  iso.glint([dx - R * 0.4, dyB - R * 0.6]);
  return iso.build();
}

// =====================================================================
// BENAKI PIREOS ANNEX (Μουσείο Μπενάκη, Κτήριο Οδού Πειραιώς) — the austere
// modern museum: a long low GREY-RENDER industrial-conversion box with a tall
// blank facade, a slot of glazing, and a clean parapet — pointedly NOT
// neoclassical (it's the contemporary Benaki). 2×2.
// =====================================================================
function benakiPireosTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const SHELL = hex('#b9b3a6'); // cool grey render
  const u0 = 0.18, u1 = 1.82, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, SHELL, { topC: top(SHELL, 0.12), leftC: shaded(SHELL, 0.14) });
  // a tall blank rendered front with a narrow full-height glazed slot
  iso.box(u0 + 0.5, v1 - 0.04, u0 + 0.66, v1, 0, 38, alpha(COLORS.glassSky, 0.85), { ink: false });
  // a few horizontal score lines (the board-marked concrete)
  for (let zr = 10; zr < 38; zr += 9) iso.r.line(iso.P(u0, v1, zr), iso.P(u1, v1, zr), 0.5 * RES, alpha(shaded(SHELL, 0.2), 0.5));
  // a clean flat parapet + a roof clerestory box
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 43, lit(SHELL, 0.08), { topC: top(SHELL, 0.14) });
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, 43, 48, lighten(SHELL, 0.04), { ink: false });
  // the Benaki name band over the entrance
  iso.r.line(iso.P(u0 + 0.2, v1, 30), iso.P(u1 - 0.2, v1, 30), 1.4 * RES, alpha(hex('#7a3530'), 0.7));
  return iso.build();
}

// =====================================================================
// FRISSIRAS MUSEUM (Μουσείο Φρυσίρα) — the contemporary-art museum housed in
// TWO restored Plaka neoclassical townhouses: a paired pastel facade with
// pilasters, tall shuttered windows, low tiled roofs + acroteria. Two joined
// houses is the read. 1×1, headroom.
// =====================================================================
function frissirasTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const A = hex('#e7d3b0'); // a warm ochre house
  const B = hex('#dcd7cb'); // a cool cream house
  const u0 = 0.12, u1 = 0.88, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // two adjoining townhouses (split across u)
  const um = (u0 + u1) / 2;
  iso.box(u0, v0, um, v1, 0, 44, A, { topC: top(A, 0.14), leftC: shaded(A, 0.12) });
  iso.box(um, v0, u1, v1, 0, 48, B, { topC: top(B, 0.14) });
  // marble ground band + pilasters
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, MARBLE_W, { ink: false });
  for (const pu of [u0 + 0.04, um - 0.04, um + 0.04, u1 - 0.04] as const) iso.r.line(iso.P(pu, v1, 8), iso.P(pu, v1, 42), 1.1 * RES, alpha(MARBLE_L, 0.6));
  // two storeys of tall shuttered windows
  iso.windowsLeft(v1, u0 + 0.06, um - 0.04, 12, 24, 2, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.06, um - 0.04, 28, 40, 2, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.windowsLeft(v1, um + 0.04, u1 - 0.06, 12, 26, 2, alpha(COLORS.glassLit, 0.4), MARBLE_L);
  iso.windowsLeft(v1, um + 0.04, u1 - 0.06, 30, 44, 2, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  // low tiled roofs + a corniced parapet
  iso.box(u0 - 0.03, v0 - 0.03, um + 0.01, v1 + 0.03, 44, 47, MARBLE_L, { ink: false });
  iso.box(um - 0.01, v0 - 0.03, u1 + 0.03, v1 + 0.03, 48, 51, MARBLE_L, { ink: false });
  iso.gable(u0, v0, um, v1, 47, 6, 'v', TERRA, A);
  iso.gable(um, v0, u1, v1, 51, 6, 'v', TERRA, B);
  return iso.build();
}

// =====================================================================
// MEGARO MELA (Μέγαρο Μελά) — Ziller's lavish Kotzia-Square neoclassical
// palazzo (the old Post Office / National Bank): a richly-modelled stone block,
// rusticated arcaded ground floor, two upper storeys of pedimented windows
// behind a giant pilaster order, a strong bracketed cornice, corner quoins.
// 1×1, headroom. (Ziller ornament = the read.)
// =====================================================================
function megaroMelaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const ST = hex('#e6d8ba');
  const u0 = 0.1, u1 = 0.9, v0 = 0.12, v1 = 0.88;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 58, ST, { topC: top(ST, 0.14), leftC: shaded(ST, 0.12) });
  // rusticated arcaded ground floor
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 18, MARBLE_W, { ink: false });
  for (let i = 0; i < 4; i++) {
    const uu = u0 + 0.08 + i * 0.2;
    const archP: Pt[] = [iso.P(uu, v1, 4), iso.P(uu, v1, 12)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; archP.push(iso.P(uu + 0.12 * t, v1, 12 + Math.sin(t * Math.PI) * 4)); }
    archP.push(iso.P(uu + 0.12, v1, 4));
    iso.r.poly(archP, alpha(COLORS.glassDark, 0.8));
  }
  // giant pilaster order rising through the two upper storeys
  for (const pu of [u0 + 0.06, u0 + 0.3, u0 + 0.54, u1 - 0.06] as const) iso.r.line(iso.P(pu, v1, 18), iso.P(pu, v1, 54), 1.3 * RES, alpha(MARBLE_L, 0.55));
  // two storeys of pedimented windows
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 22, 34, 4, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 40, 52, 4, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 22, 52, 3, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  // a strong bracketed cornice + a low balustrade with corner urns
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 58, 63, MARBLE_L, { topC: top(MARBLE_L, 0.18) });
  for (const cu of [u0, u1] as const) for (const cv of [v0, v1] as const) {
    const [ux, uy] = iso.P(cu, cv, 63); iso.r.rect(ux - 2 * RES, uy - 6 * RES, ux + 2 * RES, uy, MARBLE_L);
  }
  iso.gleam(iso.P(u0, v1, 58), iso.P(u1, v1, 58));
  return iso.build();
}

// =====================================================================
// COVERED MARKET HALL (Βαρβάκειος / Κυψέλη Municipal Market) — the 19th/20th-c.
// market: a long stone hall with a clerestory-raised central nave under a low
// pitched roof, big arched openings down the sides, and a vented roof lantern.
// The market shed is the read. `n` sizes it. 2×2 / 1×1.
// =====================================================================
function marketHallTile(seed: number, n: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(n, n, { swAnchor: true, headroom: 60 });
  void seed;
  const ST = hex('#ddcfb0');
  const m = 0.5 / n;
  const u0 = m, u1 = n - m, v0 = m + 0.1, v1 = n - m - 0.1;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the aisle walls
  iso.box(u0, v0, u1, v1, 0, 22 + n * 3, ST, { topC: top(ST, 0.12), leftC: shaded(ST, 0.12) });
  // big arched openings along the front
  const arches = Math.max(3, Math.round(n * 2.5));
  for (let i = 0; i < arches; i++) {
    const uu = u0 + 0.08 + i * ((u1 - u0 - 0.16) / arches);
    const w = ((u1 - u0 - 0.16) / arches) * 0.7;
    const archP: Pt[] = [iso.P(uu, v1, 4), iso.P(uu, v1, 14 + n * 2)];
    for (let j = 0; j <= 7; j++) { const t = j / 7; archP.push(iso.P(uu + w * t, v1, 14 + n * 2 + Math.sin(t * Math.PI) * 6)); }
    archP.push(iso.P(uu + w, v1, 4));
    iso.r.poly(archP, alpha(shaded(ST, 0.4), 0.9));
    iso.r.polyline(archP, INK_W * 0.5, alpha(INK, 0.5));
  }
  // a corniced parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 22 + n * 3, 25 + n * 3, MARBLE_L, { ink: false });
  // the RAISED CLERESTORY NAVE running down the centre, under a low pitched roof
  const cz = 25 + n * 3;
  iso.box(u0 + 0.18, (v0 + v1) / 2 - 0.18, u1 - 0.18, (v0 + v1) / 2 + 0.18, cz, cz + 10 + n * 2, lighten(ST, 0.04), { topC: top(ST, 0.12) });
  // clerestory windows
  iso.windowsRight(u1 - 0.18, (v0 + v1) / 2 - 0.16, (v0 + v1) / 2 + 0.16, cz + 3, cz + 9 + n * 2, Math.max(3, n * 2), alpha(COLORS.glassLit, 0.4));
  iso.gable(u0 + 0.18, (v0 + v1) / 2 - 0.18, u1 - 0.18, (v0 + v1) / 2 + 0.18, cz + 10 + n * 2, 7, 'u', TERRA, ST);
  // a small roof vent lantern
  const [lx, lyB] = iso.P((u0 + u1) / 2, (v0 + v1) / 2, cz + 17 + n * 2);
  iso.r.rect(lx - 4 * RES, lyB - 6 * RES, lx + 4 * RES, lyB, lit(ST, 0.1));
  return iso.build();
}

// =====================================================================
// PIRAEUS RAILWAY TERMINUS (Πελοποννήσου station — keyed broadly) — Ziller's
// metre-gauge terminal: a symmetrical stone head-building with a central
// clock/pediment block, flanking wings, and a long iron-and-glass TRAIN-SHED
// barrel-roof running off the back. The shed + head-house is the read. 2×2.
// =====================================================================
function railwayStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const ST = hex('#e2d4b6');
  const u0 = 0.18, u1 = 1.82, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the head-building (front block on v1)
  iso.box(u0, v1 - 0.4, u1, v1, 0, 36, ST, { topC: top(ST, 0.14), leftC: shaded(ST, 0.12) });
  iso.box(u0 - 0.02, v1 - 0.42, u1 + 0.02, v1 + 0.02, 0, 10, MARBLE_W, { ink: false });
  // arched ground openings + upper windows
  for (let i = 0; i < 5; i++) {
    const uu = u0 + 0.12 + i * 0.32;
    const archP: Pt[] = [iso.P(uu, v1, 4), iso.P(uu, v1, 14)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; archP.push(iso.P(uu + 0.16 * t, v1, 14 + Math.sin(t * Math.PI) * 5)); }
    archP.push(iso.P(uu + 0.16, v1, 4));
    iso.r.poly(archP, alpha(COLORS.glassDark, 0.78));
  }
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 20, 32, 7, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  // central pediment + clock block
  const cm = (u0 + u1) / 2;
  iso.box(cm - 0.24, v1 - 0.44, cm + 0.24, v1 + 0.02, 0, 44, ST, { topC: top(ST, 0.14) });
  pediment(iso, v1 + 0.02, cm - 0.24, cm + 0.24, 44, 8, MARBLE_L);
  const [clx, cly] = iso.P(cm, v1 + 0.02, 36);
  disc(iso, clx, cly, 3.4 * RES, MARBLE_L); disc(iso, clx, cly, 2.6 * RES, shaded(MARBLE_D, 0.1));
  iso.r.line([clx, cly], [clx, cly - 2 * RES], 0.8 * RES, INK); iso.r.line([clx, cly], [clx + 1.6 * RES, cly], 0.7 * RES, INK);
  // the long iron-and-glass TRAIN SHED barrel running back (toward v0)
  iso.box(u0 + 0.1, v0, u1 - 0.1, v1 - 0.42, 0, 20, shaded(ST, 0.08), { ink: false });
  const [bx, byB] = iso.P((u0 + u1) / 2, v0 + 0.1, 20);
  const halfW = ((u1 - u0 - 0.2) / 2) * (CELL_W / 2);
  const barrel: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); barrel.push([bx - halfW + (2 * halfW) * (i / 16), byB - Math.sin(a) * 22 * RES]); }
  iso.r.poly([...barrel, [bx + halfW, byB], [bx - halfW, byB]], alpha(COLORS.glassSky, 0.5));
  iso.r.polyline(barrel, INK_W * 0.6, alpha(INK, 0.6));
  for (let i = 2; i < 16; i += 2) iso.r.line([barrel[i]![0], barrel[i]![1]], [bx - halfW + (2 * halfW) * (i / 16), byB], 0.5 * RES, alpha(COLORS.steelDark, 0.5));
  return iso.build();
}

// =====================================================================
// INDUSTRIAL HALL (Δημόσιον Καπνεργοστάσιον — the Public Tobacco Factory, and
// kindred long civic works): a long brick-and-stone industrial block, many
// regular tall round-headed windows, a rhythm of pilaster bays, a low roofline
// with a small central pediment, and a chimney. The factory rhythm is the read.
// 3×3.
// =====================================================================
function tobaccoFactoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const ST = hex('#d9c7a6');
  const u0 = 0.26, u1 = 2.74, v0 = 0.6, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  iso.box(u0, v0, u1, v1, 0, 46, ST, { topC: top(ST, 0.12), leftC: shaded(ST, 0.12) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, MARBLE_W, { ink: false });
  // a long rhythm of pilaster bays + tall round-headed windows (two storeys)
  const bays = 11;
  for (let i = 0; i <= bays; i++) { const uu = u0 + (u1 - u0) * (i / bays); iso.r.line(iso.P(uu, v1, 10), iso.P(uu, v1, 44), 1 * RES, alpha(MARBLE_L, 0.45)); }
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 14, 26, bays, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 30, 42, bays, alpha(COLORS.glassDark, 0.72), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 14, 42, 8, alpha(COLORS.glassDark, 0.72), MARBLE_L);
  // cornice + a small central pediment over the entrance
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 46, 50, MARBLE_L, { topC: top(MARBLE_L, 0.16) });
  pediment(iso, v1, (u0 + u1) / 2 - 0.3, (u0 + u1) / 2 + 0.3, 50, 8, MARBLE_L);
  // a slim brick chimney at the back-left
  iso.box(u0 + 0.16, v0 + 0.16, u0 + 0.26, v0 + 0.26, 46, 92, hex('#9c6f54'), { topC: top(hex('#9c6f54'), 0.1) });
  return iso.build();
}

// =====================================================================
// BUS TERMINUS (ΚΤΕΛ Κηφισού) — the big interurban coach station: a long low
// flat-roofed concrete CONCOURSE with a deep projecting cantilever canopy over
// the gates, a glazed front, and a roof sign pylon. The transit shed is the
// read. 3×3.
// =====================================================================
function busTerminalTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const SHELL = hex('#cfc8ba');
  const u0 = 0.24, u1 = 2.76, v0 = 0.7, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // the apron
  iso.box(u0 - 0.08, v1 - 0.02, u1 + 0.08, v1 + 0.2, 0, 2, hex('#8c8678'), { ink: false });
  // the long concourse block
  iso.box(u0, v0, u1, v1, 0, 30, SHELL, { topC: top(SHELL, 0.12), leftC: shaded(SHELL, 0.12) });
  // a fully-glazed front
  iso.box(u0 + 0.1, v1 - 0.04, u1 - 0.1, v1, 0, 26, alpha(COLORS.glassSky, 0.9), { ink: false });
  for (let i = 0; i < 12; i++) { const uu = u0 + 0.14 + i * ((u1 - u0 - 0.28) / 12); iso.r.line(iso.P(uu, v1, 3), iso.P(uu, v1, 26), 0.5 * RES, alpha(COLORS.white, 0.5)); }
  // a flat roof slab
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 30, 33, lit(SHELL, 0.08), { topC: top(SHELL, 0.14) });
  // a deep cantilever canopy projecting forward over the gates
  iso.box(u0 + 0.04, v1, u1 - 0.04, v1 + 0.18, 18, 21, shaded(SHELL, 0.06), { topC: top(SHELL, 0.1) });
  for (let i = 0; i < 6; i++) { const uu = u0 + 0.2 + i * 0.42; iso.r.line(iso.P(uu, v1 + 0.16, 0), iso.P(uu, v1 + 0.16, 18), 1 * RES, alpha(COLORS.steelDark, 0.5)); } // canopy posts
  // a roof sign pylon
  const [sx, syB] = iso.P((u0 + u1) / 2, v0 + 0.2, 33);
  iso.r.rect(sx - 10 * RES, syB - 14 * RES, sx + 10 * RES, syB - 4 * RES, alpha(hex('#2f5fa0'), 0.9));
  iso.r.line([sx - 7 * RES, syB - 9 * RES], [sx + 7 * RES, syB - 9 * RES], 1.6 * RES, COLORS.white);
  return iso.build();
}

// =====================================================================
// PALATAKI ("Little Palace", Chaidari — Οικία Λέλας Καραγιάννη / Παλατάκι type)
// — a small romantic castellated stone VILLA: a compact stone house with a
// square corner TOWER, battlemented parapet, pointed-arch windows + a steep
// tiled roof. A toy-castle silhouette. 1×1, headroom.
// =====================================================================
function palatakiVillaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const ST = hex('#d3c4a2');
  const u0 = 0.16, u1 = 0.84, v0 = 0.16, v1 = 0.84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the house body
  iso.box(u0, v0 + 0.14, u1 - 0.16, v1, 0, 40, ST, { topC: top(ST, 0.14), leftC: shaded(ST, 0.12) });
  iso.gable(u0, v0 + 0.14, u1 - 0.16, v1, 40, 12, 'v', TERRA, ST);
  // pointed-arch windows
  for (let i = 0; i < 3; i++) {
    const uu = u0 + 0.1 + i * 0.2;
    iso.r.poly([iso.P(uu, v1, 8), iso.P(uu + 0.1, v1, 8), iso.P(uu + 0.1, v1, 22), iso.P(uu + 0.05, v1, 28), iso.P(uu, v1, 22)], alpha(COLORS.glassDark, 0.8));
  }
  // the square corner TOWER (taller, battlemented)
  iso.box(u1 - 0.2, v0, u1, v0 + 0.2, 0, 60, ST, { topC: top(ST, 0.14) });
  // crenellated parapet on the tower
  for (let i = 0; i < 3; i++) {
    const uu = u1 - 0.18 + i * 0.07;
    iso.box(uu, v0 + 0.01, uu + 0.04, v0 + 0.05, 60, 65, lit(ST, 0.08), { ink: false });
  }
  // a slim pennant on the tower
  const [px, pyB] = iso.P(u1 - 0.1, v0 + 0.1, 65);
  iso.r.line([px, pyB], [px, pyB - 16 * RES], 0.9 * RES, MARBLE_D);
  iso.r.poly([[px, pyB - 16 * RES], [px + 7 * RES, pyB - 14 * RES], [px, pyB - 12 * RES]], hex('#2f6fb0'));
  return iso.build();
}

// =====================================================================
// MODERN CULTURAL CUBE (Ταινιοθήκη / Μουσείο Αφής / Ψηφιακό Μουσείο / Ελληνικό
// Μουσείο Πληροφορικής / Πληροφορικής — the contemporary museum/archive): a
// clean rendered cube with a bold coloured entrance portal, a ribbon window, a
// flat parapet + a rooftop plant box. Crisp + modern, NOT neoclassical.
// Parameterised by accent. 1×1.
// =====================================================================
function modernCultureCubeTile(seed: number, accent: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const SHELL = hex('#d7d0c2');
  const u0 = 0.14, u1 = 0.86, v0 = 0.14, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 40, SHELL, { topC: top(SHELL, 0.13), leftC: shaded(SHELL, 0.12) });
  // a bold coloured full-height entrance portal slot
  iso.box(u0 + 0.42, v1 - 0.04, u0 + 0.6, v1, 0, 34, accent, { ink: false });
  // a horizontal ribbon window band
  iso.box(u0 + 0.06, v1 - 0.03, u1 - 0.06, v1, 22, 30, alpha(COLORS.glassSky, 0.85), { ink: false });
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 22, 30, 3, alpha(COLORS.glassSky, 0.8));
  // flat parapet + a rooftop plant/AC box
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 43, lit(SHELL, 0.08), { topC: top(SHELL, 0.14) });
  iso.box(u0 + 0.2, v0 + 0.2, u0 + 0.42, v0 + 0.42, 43, 48, shaded(SHELL, 0.06), { ink: false });
  return iso.build();
}

// #####################################################################
// ROUND 3 — APPENDED BESPOKE HEROES (seeds 185+). The final push to 100:
// the modern marquees (Acropolis Museum, Onassis Stegi, the National Hellenic
// Research Foundation, the Conservatoire), the great mansions (Villa Ilissia /
// Duchess of Plaisance, Sarogleio), Athens City Hall on Kotzia Square, the
// open-air Lycabettus Theatre on its pine hilltop, plus more ministries,
// mansions, churches, hotels and the Piraeus/Larissa stations placed via the
// established marble workhorses. Each marquee is a NEW draw fn; every entry
// carries its own bespoke electrification light.
// #####################################################################

const CONCRETE = hex('#cbb89a'); // warm modernist exposed concrete (Tschumi / Bauhaus)
const CONCRETE_D = hex('#a99b80');
const GLASS_MUS = hex('#9fb4c0'); // the cool museum curtain-glass (dusk-reflecting)

// =====================================================================
// ACROPOLIS MUSEUM — Bernard Tschumi's modern museum below the rock: a glass-
// and-concrete machine in three stacked tiers — a base on PILOTIS (slim
// columns over the excavated ruins), a broad glass-clad middle, and a top
// gallery box ROTATED off-axis (aligned to the Parthenon, not the street).
// Wide, flat, modern — the deliberate counterpoint to the marble temples. 3×3.
// =====================================================================
function acropolisMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.2, u1 = 2.8, v0 = 0.4, v1 = 2.6;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the excavation under glass: a dark recessed ground showing the ruins
  iso.box(u0, v0, u1, v1, 0, 6, shaded(CONCRETE_D, 0.24), { ink: false });
  // PILOTIS — slim concrete columns lifting the museum off the dig
  for (let i = 0; i <= 5; i++) {
    const u = u0 + 0.12 + ((u1 - u0 - 0.24) * i) / 5;
    iso.box(u - 0.03, v1 - 0.07, u + 0.03, v1 - 0.01, 6, 22, CONCRETE, { ink: false });
    iso.box(u - 0.03, v0 + 0.01, u + 0.03, v0 + 0.07, 6, 22, shaded(CONCRETE_D, 0.1), { ink: false });
  }
  // --- the broad GLASS middle gallery (the curtain-walled level) ---
  const mz0 = 22, mz1 = 56;
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, mz0, mz1, alpha(GLASS_MUS, 0.9), {
    topC: top(CONCRETE, 0.16), leftC: alpha(shaded(GLASS_MUS, 0.18), 0.9), rightC: alpha(lit(GLASS_MUS, 0.12), 0.9),
  });
  // mullions: a fine grid of glazing bars on both glass faces
  iso.windowsLeft(v1 - 0.06, u0 + 0.1, u1 - 0.1, mz0 + 2, mz1 - 2, 12, alpha(GLASS_MUS, 0.5), lighten(CONCRETE, 0.06));
  iso.windowsRight(u1 - 0.06, v0 + 0.1, v1 - 0.1, mz0 + 2, mz1 - 2, 10, alpha(GLASS_MUS, 0.46), lighten(CONCRETE, 0.06));
  // a flat concrete slab capping the middle
  iso.box(u0, v0, u1, v1, mz1, mz1 + 4, lit(CONCRETE, 0.06), { topC: top(CONCRETE, 0.14) });

  // --- the TOP gallery box, ROTATED off the building axis (the Parthenon
  // gallery). Drawn as a slab inset + skewed: pulled in on one pair of corners
  // so it reads as a separate, twisted volume sitting on the slab. ---
  const tz0 = mz1 + 4, tz1 = tz0 + 26;
  // the rotation read: offset the box footprint diagonally within the slab
  const ru0 = u0 + 0.34, ru1 = u1 - 0.18, rv0 = v0 + 0.18, rv1 = v1 - 0.34;
  iso.box(ru0, rv0, ru1, rv1, tz0, tz1, alpha(GLASS_MUS, 0.92), {
    topC: top(CONCRETE, 0.18), leftC: alpha(shaded(GLASS_MUS, 0.2), 0.92),
  });
  iso.windowsLeft(rv1, ru0 + 0.06, ru1 - 0.06, tz0 + 2, tz1 - 3, 11, alpha(GLASS_MUS, 0.55), lighten(CONCRETE, 0.08));
  iso.windowsRight(ru1, rv0 + 0.06, rv1 - 0.06, tz0 + 2, tz1 - 3, 9, alpha(GLASS_MUS, 0.5), lighten(CONCRETE, 0.08));
  // thin flat roof + a couple of rooftop light-monitors
  iso.box(ru0 - 0.02, rv0 - 0.02, ru1 + 0.02, rv1 + 0.02, tz1, tz1 + 3, lit(CONCRETE, 0.08), { topC: top(CONCRETE, 0.16) });
  return iso.build();
}

// =====================================================================
// ATHENS CITY HALL — the Kotzia Square civic block (Kalkos, 1872): a low,
// broad neoclassical building with a deep recessed GROUND ARCADE (an open
// loggia of arches under a colonnaded piano-nobile), a painted frieze band and
// a flat parapet topped by a clock cartouche + a small flagstaff. 2×2. The
// civic read is the arcade + the central flag. Distinct from the museum blocks.
// =====================================================================
function cityHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.22, u1 = 1.78, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const bz = 0, bodyH = 66;
  iso.box(u0, v0, u1, v1, bz, bodyH, OCHRE, { topC: top(OCHRE, 0.14), leftC: shaded(OCHRE_D, 0.12) });
  // pale ground arcade band (the open loggia): a row of recessed arches on the front
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, bz, 20, MARBLE_W, { ink: false });
  for (let i = 0; i < 7; i++) {
    const uu = u0 + 0.08 + i * ((u1 - u0 - 0.16) / 7);
    const w = (u1 - u0 - 0.16) / 7 - 0.02;
    const archP: Pt[] = [iso.P(uu, v1, 3), iso.P(uu, v1, 12)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      archP.push(iso.P(uu + w * t, v1, 12 + Math.sin(t * Math.PI) * 5));
    }
    archP.push(iso.P(uu + w, v1, 3));
    iso.r.poly(archP, shaded(MARBLE_D, 0.34));
  }
  // a painted frieze band just above the arcade (Fotis Kontoglou's frescoes)
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, 30, 35, hex('#8a5a3c'), { ink: false });
  // two storeys of tall windows over the arcade (piano nobile + upper)
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 38, bodyH - 4, 7, alpha(COLORS.glassDark, 0.78), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 38, bodyH - 4, 6, alpha(COLORS.glassDark, 0.72), MARBLE_L);
  // cornice + parapet
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, bodyH, bodyH + 5, MARBLE_L, { topC: top(MARBLE_L, 0.16) });
  // central clock cartouche + flagstaff
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.14, v1 - 0.05, cu + 0.14, v1, bodyH + 5, bodyH + 12, MARBLE_L, { ink: false });
  disc(iso, iso.P(cu, v1, bodyH + 9)[0], iso.P(cu, v1, bodyH + 9)[1], 2.4 * RES, BRONZE);
  const fp = iso.P(cu, v0 + 0.4, bodyH + 5);
  iso.r.line(fp, [fp[0], fp[1] - 16 * RES], 1 * RES, INK);
  iso.r.poly([[fp[0], fp[1] - 16 * RES], [fp[0] + 9 * RES, fp[1] - 13 * RES], [fp[0], fp[1] - 10 * RES]], hex('#3f6fb0'));
  return iso.build();
}

// =====================================================================
// ONASSIS STEGI — the contemporary cultural centre on Syngrou (AB Architects):
// a tall rectangular volume entirely VEILED in horizontal MARBLE LOUVRE BANDS
// (thin bridge-like strips of Thassos marble), glowing as a lantern from
// within at night, set back behind an open forecourt. The horizontal striping
// over a glassy core is the unmistakable read. 2×2, tall, big headroom.
// =====================================================================
function onassisStegiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 180 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // forecourt plinth
  iso.box(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, 0, 4, MARBLE_W, { ink: false });
  const bz = 4, top1 = 150;
  // the glowing glass core (warm at night) inside the louvre veil
  iso.box(u0 + 0.03, v0 + 0.03, u1 - 0.03, v1 - 0.03, bz, top1, alpha(hex('#e8d8b0'), 0.85), { ink: false });
  // the marble louvre cage: many thin horizontal bands wrapping both faces,
  // with narrow slots of the glowing core showing between them
  const bands = 22;
  for (let i = 0; i < bands; i++) {
    const z0 = bz + (i * (top1 - bz)) / bands;
    const z1 = z0 + ((top1 - bz) / bands) * 0.62; // slot gap between bands
    // left face strip
    iso.r.poly([iso.P(u0, v1, z1), iso.P(u1, v1, z1), iso.P(u1, v1, z0), iso.P(u0, v1, z0)], i % 2 ? MARBLE_L : MARBLE);
    // right face strip
    iso.r.poly([iso.P(u1, v0, z1), iso.P(u1, v1, z1), iso.P(u1, v1, z0), iso.P(u1, v0, z0)], i % 2 ? lit(MARBLE, 0.06) : MARBLE_W);
  }
  // silhouette ink + flat roof slab
  iso.r.polyline([iso.P(u0, v1, top1), iso.P(u1, v1, top1), iso.P(u1, v0, top1)], INK_W, INK);
  iso.r.line(iso.P(u0, v1, bz), iso.P(u1, v1, bz), INK_W * 0.7, INK);
  iso.r.line(iso.P(u1, v1, bz), iso.P(u1, v0, bz), INK_W * 0.7, INK);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, top1, top1 + 5, MARBLE_L, { topC: top(MARBLE_L, 0.18) });
  return iso.build();
}

// =====================================================================
// SAROGLEIO MANSION — the grand baroque-revival officers' mansion (Nikoloudis,
// 1933): a symmetrical ashlar block with a heavily rusticated ground floor, a
// projecting central bay topped by a curved BAROQUE PEDIMENT, tall French
// windows with balustrades and a slate MANSARD roof with dormers. 2×2.
// =====================================================================
function baroqueMansionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.26, u1 = 1.74, v0 = 0.32, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const bodyH = 50;
  iso.box(u0, v0, u1, v1, 0, bodyH, MARBLE, { topC: top(MARBLE, 0.14), leftC: shaded(MARBLE_D, 0.13) });
  // rusticated ground floor (banded ashlar) — a darker base with score lines
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 16, MARBLE_W, { ink: false });
  for (let z = 4; z < 16; z += 4) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.6 * RES, alpha(MARBLE_D, 0.5));
    iso.r.line(iso.P(u1, v0, z), iso.P(u1, v1, z), 0.6 * RES, alpha(MARBLE_D, 0.4));
  }
  // two storeys of tall French windows w/ balustrade hints
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 19, 32, 6, alpha(COLORS.glassDark, 0.8), MARBLE_L);
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 35, bodyH - 4, 6, alpha(COLORS.glassDark, 0.74), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, 19, 32, 5, alpha(COLORS.glassDark, 0.76), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, 35, bodyH - 4, 5, alpha(COLORS.glassDark, 0.7), MARBLE_L);
  // projecting central bay
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.22, v1 - 0.06, cu + 0.22, v1 + 0.05, 0, bodyH + 4, lit(MARBLE, 0.04), { topC: top(MARBLE, 0.14) });
  // cornice
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, bodyH, bodyH + 4, MARBLE_L, { ink: false });
  // the slate MANSARD roof with dormers
  iso.box(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, bodyH + 4, bodyH + 18, SLATEBLUE, {
    topC: top(SLATEBLUE, 0.16), leftC: shaded(SLATEBLUE, 0.14),
  });
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.2 + i * 0.32;
    iso.box(u - 0.04, v1 - 0.1, u + 0.04, v1 - 0.05, bodyH + 6, bodyH + 12, MARBLE_L, { ink: false });
  }
  // a curved baroque pediment over the central bay
  const pa = iso.P(cu - 0.22, v1, bodyH + 4), pb = iso.P(cu + 0.22, v1, bodyH + 4);
  const pm: Pt = [(pa[0] + pb[0]) / 2, pa[1] - 10 * RES];
  const curve: Pt[] = [pa];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    curve.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] - Math.sin(t * Math.PI) * 10 * RES]);
  }
  curve.push(pb);
  iso.r.poly([pa, ...curve, pb], lit(MARBLE_L, 0.08));
  iso.r.polyline(curve, INK_W * 0.8, INK);
  void pm;
  return iso.build();
}

// =====================================================================
// VILLA ILISSIA / DUCHESS OF PLAISANCE MANSION — Kleanthis's romantic 1840s
// villa (now the Byzantine & Christian Museum): an ochre Florentine-cloister
// villa built around a courtyard, with arched loggias on two storeys and a low
// square corner TOWER with a pyramidal tile roof. Picturesque, asymmetric. 2×2.
// =====================================================================
function villaIlissiaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.24, u1 = 1.76, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const bodyH = 40;
  // the ochre villa wings around the court (a U; we read two wings + the void)
  iso.box(u0, v0, u1, v0 + 0.5, 0, bodyH, OCHRE, { topC: top(OCHRE, 0.14), leftC: shaded(OCHRE_D, 0.12) });
  iso.box(u0, v0, u0 + 0.5, v1, 0, bodyH, OCHRE, { topC: top(OCHRE, 0.13), leftC: shaded(OCHRE_D, 0.13) });
  iso.box(u1 - 0.5, v0, u1, v1, 0, bodyH, lit(OCHRE, 0.03), { topC: top(OCHRE, 0.14) });
  // the open courtyard floor (a warm paved void at the front-near)
  iso.box(u0 + 0.5, v0 + 0.5, u1 - 0.5, v1, 0, 4, MARBLE_W, { ink: false });
  // two storeys of arched LOGGIA on the inward courtyard faces (the signature)
  for (let row = 0; row < 2; row++) {
    const az0 = 8 + row * 16;
    for (let i = 0; i < 4; i++) {
      const uu = u0 + 0.56 + i * 0.26;
      const archP: Pt[] = [iso.P(uu, v0 + 0.5, az0), iso.P(uu, v0 + 0.5, az0 + 8)];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        archP.push(iso.P(uu + 0.18 * t, v0 + 0.5, az0 + 8 + Math.sin(t * Math.PI) * 4));
      }
      archP.push(iso.P(uu + 0.18, v0 + 0.5, az0));
      iso.r.poly(archP, shaded(OCHRE_D, 0.26));
    }
  }
  // outward windows
  iso.windowsLeft(v1, u0 + 0.06, u0 + 0.46, 14, bodyH - 4, 3, alpha(COLORS.glassDark, 0.76), MARBLE_L);
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 14, bodyH - 4, 5, alpha(COLORS.glassDark, 0.72), MARBLE_L);
  // tile cornices + a low pitched tile roof on the wings
  iso.gable(u0, v0, u1, v0 + 0.5, bodyH, 8, 'u', TERRA, OCHRE);
  iso.gable(u0, v0 + 0.5, u0 + 0.5, v1, bodyH, 8, 'v', TERRA, OCHRE);
  // the square corner TOWER with a pyramidal tile roof (back-left corner)
  const tz1 = bodyH + 24;
  iso.box(u0 + 0.02, v0 + 0.02, u0 + 0.34, v0 + 0.34, bodyH, tz1, lit(OCHRE, 0.04), { topC: top(OCHRE, 0.14) });
  iso.windowsLeft(v0 + 0.34, u0 + 0.06, u0 + 0.3, tz1 - 14, tz1 - 4, 2, alpha(COLORS.glassDark, 0.7), MARBLE_L);
  iso.hip(u0 + 0.02, v0 + 0.02, u0 + 0.34, v0 + 0.34, tz1, 12, TERRA);
  return iso.build();
}

// =====================================================================
// LYCABETTUS THEATRE — the open-air amphitheatre quarried into the top of
// pine-clad Lycabettus Hill (Zenetos, 1965): the city's tallest natural peak —
// a steep wooded GREEN CONE that TOWERS, with the carved stone seating bowl +
// flat stage notched into its near face. Read = a commanding pine peak. 3×3,
// big headroom so the cone soars over the fabric.
// =====================================================================
function lycabettusTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 220 });
  void seed;
  const u0 = 0.06, u1 = 2.94, v0 = 0.06, v1 = 2.94;
  const PINE = hex('#566a40'), PINE_L = hex('#6b8050'), PINE_D = hex('#3c4a2b');
  iso.shadow(u0, v0, u1, v1, 0.34, 0.26);
  // a tawny rock skirt at the base
  iso.box(u0, v0, u1, v1, 0, 16, ROCK, { leftC: shaded(ROCK_D, 0.16), rightC: lit(ROCK, 0.06), topC: top(ROCK, 0.08) });
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const halfW = (u1 - u0) * (CELL_W / 2) * 0.5; // screen half-width of the footprint
  const hillH = 150; // tall — the peak soars
  // --- the steep wooded CONE: a stack of filled rings drawn bottom→top so the
  // silhouette is a SOLID tapering green peak (not see-through). Each ring is a
  // band between its own ellipse and the next-smaller one above it. ---
  const RINGS = 20;
  let prev: Pt[] | null = null;
  for (let i = 0; i <= RINGS; i++) {
    const f = i / RINGS;
    const r = halfW * (1 - f * 0.96) ** 0.85; // steep taper to a point
    const zc = 16 + f * hillH; // band height up the cone
    const [bx, by] = iso.P(cu, cv, zc);
    const ring: Pt[] = [];
    for (let k = 0; k <= 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      ring.push([bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.5]);
    }
    if (prev) {
      // fill the band (this ring's front arc + previous ring's front arc);
      // gentle tonal drift up the cone (lighter near the sunlit top) rather
      // than hard stripes, so it reads as foliage, not a spiral.
      const band = [...ring, ...[...prev].reverse()];
      iso.r.poly(band, lighten(PINE, f * 0.12));
    } else {
      iso.r.poly(ring, PINE);
    }
    prev = ring;
  }
  // dappled pine clumps scattered densely over the cone face (breaks the banding
  // into foliage; front face only so the back stays a clean silhouette)
  for (let i = 0; i < 60; i++) {
    const f = 0.06 + 0.9 * frac(i * 1.7 + 3);
    const r = halfW * (1 - f * 0.96) ** 0.85;
    const [bx, by] = iso.P(cu, cv, 16 + f * hillH);
    const a = frac(i * 2.13) * Math.PI * 2;
    if (Math.sin(a) < -0.05) continue; // front face only
    const rr = (1.6 + 1.4 * frac(i * 5.1)) * RES;
    disc(iso, bx + Math.cos(a) * r * 0.78, by + Math.sin(a) * r * 0.4, rr, i % 3 === 0 ? PINE_D : i % 3 === 1 ? PINE : PINE_L);
  }

  // --- the carved seating BOWL + stage notched into the near (v1) face,
  // partway up the cone (drawn last so it sits ON the green) ---
  const bowlZ = 16 + hillH * 0.34;
  const [bcx, bcy] = iso.P(cu, v1 - 0.6, bowlZ);
  for (let r = 0; r < 7; r++) {
    const rad = (0.12 + r * 0.05) * (u1 - u0) * (CELL_W / 2);
    const lift = r * 5 * RES;
    const seats: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * 0.16 + Math.PI * 0.68 * (i / 20);
      seats.push([bcx - Math.cos(a) * rad, bcy - lift - Math.sin(a) * rad * 0.42]);
    }
    // a thin filled band per tier so the bowl reads as carved stone, not wire
    const lo = seats.map(([x, y]) => [x, y + 3.4 * RES] as Pt);
    iso.r.poly([...seats, ...lo.reverse()], r % 2 ? lighten(ROCK, 0.08) : shaded(MARBLE_W, 0.04));
    iso.r.polyline(seats, 1 * RES, alpha(INK, 0.4));
  }
  // the flat marble stage + a slim white canopy at the bowl foot
  const srad = 0.1 * (u1 - u0) * (CELL_W / 2);
  const stage: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    stage.push([bcx - Math.cos(a) * srad, bcy + Math.sin(a) * srad * 0.4]);
  }
  stage.push([bcx + srad, bcy]);
  iso.r.poly(stage, lit(MARBLE_W, 0.08));
  iso.r.polyline(stage, 1.2 * RES, alpha(INK, 0.5));
  for (const sx of [-srad, srad]) iso.r.line([bcx + sx, bcy], [bcx + sx, bcy - 11 * RES], 1 * RES, MARBLE_L);
  iso.r.line([bcx - srad, bcy - 11 * RES], [bcx + srad, bcy - 11 * RES], 1.4 * RES, MARBLE_L);
  return iso.build();
}

// =====================================================================
// NATIONAL HELLENIC RESEARCH FOUNDATION — Constantinidis's late-modernist
// research slab on Vassileos Konstantinou (1958): a long horizontal building
// with a deep concrete BRISE-SOLEIL grid of sun-fins over a glass curtain, a
// recessed glazed ground floor and a flat roof. Crisp, gridded, modern. 3×3.
// =====================================================================
function modernResearchBlockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.24, u1 = 2.76, v0 = 0.7, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  const bodyH = 56;
  // recessed dark glazed ground floor
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, 0, 14, shaded(GLASS_MUS, 0.3), { ink: false });
  // the gridded slab on top
  iso.box(u0, v0, u1, v1, 14, bodyH, CONCRETE, { topC: top(CONCRETE, 0.15), leftC: shaded(CONCRETE_D, 0.12) });
  // the glass curtain behind the fins
  iso.box(u0 + 0.02, v1 - 0.04, u1 - 0.02, v1, 18, bodyH - 4, alpha(GLASS_MUS, 0.85), { ink: false });
  // the brise-soleil: a deep GRID of horizontal + vertical concrete fins on the front
  const cols = 14, rows = 4;
  for (let c = 0; c <= cols; c++) {
    const uu = u0 + 0.06 + ((u1 - u0 - 0.12) * c) / cols;
    iso.r.line(iso.P(uu, v1, 18), iso.P(uu, v1, bodyH - 4), 1.1 * RES, c % 2 ? CONCRETE : lit(CONCRETE, 0.06));
  }
  for (let rr = 0; rr <= rows; rr++) {
    const z = 18 + ((bodyH - 22) * rr) / rows;
    iso.r.line(iso.P(u0 + 0.06, v1, z), iso.P(u1 - 0.06, v1, z), 1.1 * RES, lit(CONCRETE, 0.04));
  }
  // right face: simpler vertical fins over glass
  iso.box(u1 - 0.04, v0 + 0.02, u1, v1 - 0.02, 18, bodyH - 4, alpha(GLASS_MUS, 0.8), { ink: false });
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 18, bodyH - 4, 8, alpha(GLASS_MUS, 0.4), CONCRETE);
  // flat roof + parapet, a rooftop plant box
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyH, bodyH + 4, lit(CONCRETE, 0.08), { topC: top(CONCRETE, 0.15) });
  iso.box(u0 + 0.3, v0 + 0.2, u0 + 0.9, v0 + 0.5, bodyH + 4, bodyH + 9, shaded(CONCRETE_D, 0.08), { ink: false });
  return iso.build();
}

// =====================================================================
// ATHENS CONSERVATOIRE — Despotopoulos's rigorous Bauhaus-modern music school
// (1969): a strict, low, flat-roofed exposed-concrete block on a podium, a
// regular rhythm of deep square window-bays, utterly orthogonal — the modern-
// movement counterpoint to the neoclassical trilogy. 3×3.
// =====================================================================
function conservatoireTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.6, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // a low podium
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 7, shaded(CONCRETE_D, 0.08), { ink: false });
  const bz = 7, bodyH = 42;
  iso.box(u0, v0, u1, v1, bz, bodyH, CONCRETE, {
    topC: top(CONCRETE, 0.14), leftC: shaded(CONCRETE_D, 0.12), rightC: lit(CONCRETE, 0.05),
  });
  // a strict grid of deep recessed square window bays on both faces (dark, regular)
  const colL = 9, rowH = 3;
  for (let r = 0; r < rowH; r++) {
    const z0 = bz + 6 + r * 11;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, z0, z0 + 7, colL, alpha(COLORS.glassDark, 0.82), shaded(CONCRETE_D, 0.06));
  }
  const colR = 7;
  for (let r = 0; r < rowH; r++) {
    const z0 = bz + 6 + r * 11;
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, z0, z0 + 7, colR, alpha(COLORS.glassDark, 0.78), shaded(CONCRETE_D, 0.06));
  }
  // a deep flat roof slab oversailing the walls (the modern-movement cap)
  iso.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, bodyH, bodyH + 4, lit(CONCRETE, 0.08), { topC: top(CONCRETE, 0.16) });
  return iso.build();
}

// =====================================================================
// THE REGISTRY — placed Greek names → bespoke draw. Order matters (first match
// wins); the marquee ancient monuments are listed before generic blocks so a
// specific temple never falls through to the neoclassical workhorse.
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // The Acropolis MUSEUM must be tested BEFORE the Parthenon: its name contains
  // "Ακρόπολη" (which the Parthenon's broad match would otherwise eat), but it
  // requires the word "Μουσείο", so the bare "Ακρόπολη" rock still hits parthenon.
  {
    city: 'athens', key: 'acropolis-museum',
    match: /Μουσείο Ακρόπολης|Μουσείο Ακροπόλεως|Acropolis Museum|Νέο Μουσείο Ακρόπολης/i,
    foot: [3, 3], seed: 185, draw: acropolisMuseumTile,
    light: { kind: 'towerCrown', topZ: 90, halfW: 1.6 }, // the lit glass galleries
  },
  // ---- THE ACROPOLIS + ancient monuments (marquee) ----
  {
    city: 'athens', key: 'parthenon',
    match: /Ακρόπολη|Parthenon|Παρθεν/i,
    foot: [2, 2], seed: 101, draw: parthenonTile,
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.6 }, // the Parthenon floodlit gold
  },
  {
    city: 'athens', key: 'erechtheion',
    match: /Ερέχθει|Erechthe|Καρυάτιδ|Pandros|Πανδρόσ/i,
    foot: [1, 1], seed: 102, draw: erechtheionTile,
    light: { kind: 'facadeFlood', topZ: 88, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'temple-olympian-zeus',
    match: /Ολυμπίου Διός|Olympian Zeus|Olympieion/i,
    foot: [2, 2], seed: 103, draw: olympianZeusTile,
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.4 },
  },
  {
    city: 'athens', key: 'hadrians-arch',
    match: /Πύλη του Αδριανού|Hadrian.?s Arch|Αψίδα Αδριανού/i,
    foot: [1, 1], seed: 104, draw: hadriansArchTile,
    light: { kind: 'archGlow', topZ: 100, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'odeon-herodes-atticus',
    match: /Ωδείο Ηρώδου|Herodes Atticus|Ηρώδειο/i,
    foot: [2, 2], seed: 105, draw: odeonTile,
    light: { kind: 'facadeFlood', topZ: 82, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'theatre-of-dionysus',
    match: /Θέατρο του Διονύσου|Theatre of Dionysus|Διονύσου/i,
    foot: [2, 2], seed: 106, draw: theatreOfDionysusTile,
    light: { kind: 'stadiumFlood', topZ: 60, halfW: 1.6 },
  },
  {
    city: 'athens', key: 'temple-hephaestus',
    match: /Ναός Ηφαίστου|Hephaestus|Hephaisteion|Θησεί/i,
    foot: [2, 2], seed: 107, draw: hephaestusTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.2 },
  },
  {
    city: 'athens', key: 'temple-athena-nike',
    match: /Αθηνάς Νίκης|Athena Nike/i,
    foot: [1, 1], seed: 108, draw: athenaNikeTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'stoa-of-attalos',
    match: /Στοά Αττάλου|Stoa of Attalos|Βασίλειος Στοά|Στοά Βασίλει/i,
    foot: [3, 3], seed: 109, draw: stoaOfAttalosTile,
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.6 },
  },
  {
    city: 'athens', key: 'tower-of-winds',
    match: /Ρωμαϊκή Αγορά|Roman Agora|Αέρηδες|Tower of the Winds|Ανέμων/i,
    foot: [2, 2], seed: 110, draw: towerOfWindsTile,
    light: { kind: 'facadeFlood', topZ: 80, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'monument-lysicrates',
    match: /Λυσικράτους|Lysicrates|Φανάρι του Διογένη/i,
    foot: [1, 1], seed: 111, draw: lysicratesTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 0.4 },
  },

  // ---- THE NEOCLASSICAL TRILOGY (Hansen's marble masterpieces) ----
  {
    city: 'athens', key: 'academy-of-athens',
    match: /Ακαδημία Αθηνών|Academy of Athens|Ακαδημίας Αθηνών/i,
    foot: [3, 3], seed: 112, draw: (s) => trilogyTile(s, 'academy'),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'university-of-athens',
    match: /Πανεπιστήμι|University of Athens|Πανεπιστημίου Αθηνών/i,
    foot: [3, 3], seed: 113, draw: (s) => trilogyTile(s, 'university'),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'national-library',
    match: /Εθνική Βιβλιοθήκη|National Library/i,
    foot: [3, 3], seed: 114, draw: (s) => trilogyTile(s, 'library'),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.5 },
  },

  // ---- CIVIC / PALACES ----
  {
    city: 'athens', key: 'old-royal-palace',
    match: /Βουλή των Ελλήνων|Old Royal Palace|Παλαιά Ανάκτορα|Ελληνικό Κοινοβούλιο/i,
    foot: [3, 3], seed: 115, draw: oldRoyalPalaceTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'old-parliament-house',
    match: /Παλαιά Βουλή|Old Parliament|Εθνικό Ιστορικό Μουσείο/i,
    foot: [2, 2], seed: 116, draw: oldParliamentTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.2 },
  },
  {
    city: 'athens', key: 'zappeion',
    match: /Ζάππειο|Zappeion/i,
    foot: [3, 3], seed: 117, draw: zappeionTile,
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.5 },
  },

  // ---- CHURCHES ----
  {
    city: 'athens', key: 'metropolitan-cathedral',
    match: /Μητροπολιτικός Ναός|Metropolitan Cathedral|Μητρόπολη Αθηνών/i,
    foot: [1, 1], seed: 118, draw: metropolitanCathedralTile,
    light: { kind: 'facadeFlood', topZ: 90, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'catholic-basilica-dionysius',
    match: /Διονυσίου Αρεοπαγίτου|St\.? Dionysius|Καθολικός Καθεδρικός|Άγιος Διονύσιος/i,
    foot: [1, 1], seed: 119, draw: catholicBasilicaTile,
    light: { kind: 'facadeFlood', topZ: 90, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'church-saint-irene',
    match: /Αγία Ειρήνη|Saint Irene|Αγίας Ειρήνης/i,
    foot: [1, 1], seed: 120, draw: (s) => byzantineChapelTile(s, true),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'church-saint-nicholas',
    match: /Άγιος Νικόλαος|Saint Nicholas|Αγίου Νικολάου/i,
    foot: [1, 1], seed: 121, draw: (s) => byzantineChapelTile(s, false),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'church-saint-panteleimon',
    match: /Άγιος Παντελεήμων|Saint Panteleimon|Παντελεήμον/i,
    foot: [1, 1], seed: 122, draw: (s) => byzantineChapelTile(s, true),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'church-agia-triada',
    match: /Αγία Τριάς|Αγία Τριάδα|Agia Triada|Holy Trinity/i,
    foot: [1, 1], seed: 123, draw: (s) => byzantineChapelTile(s, false),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },

  // ---- GRAND HOTELS ----
  {
    city: 'athens', key: 'hotel-grande-bretagne',
    match: /Μεγάλη Βρεταννία|Grande Bretagne|Μεγάλη Βρετανία/i,
    foot: [2, 2], seed: 124, draw: grandeBretagneTile,
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.1 },
  },

  // ---- MODERN CULTURAL / TOWERS ----
  {
    city: 'athens', key: 'athens-concert-hall',
    match: /Μέγαρο Μουσικής|Concert Hall|Megaron/i,
    foot: [3, 3], seed: 125, draw: megaronTile,
    light: { kind: 'facadeFlood', topZ: 54, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'athens-tower-1',
    match: /Πύργος Αθηνών|Athens Tower|Athens Towers/i,
    foot: [1, 1], seed: 126, draw: (s) => highriseTile(s, 22, COLORS.glassSky),
    light: { kind: 'towerCrown', topZ: 200, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'apollo-tower',
    match: /Πύργος Απόλλων|Apollo Tower/i,
    foot: [1, 1], seed: 127, draw: (s) => highriseTile(s, 18, COLORS.glassSunset),
    light: { kind: 'towerCrown', topZ: 170, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'conrad-ilisian',
    match: /Conrad Athens|Ilisian|Χίλτον|Hilton/i,
    foot: [2, 2], seed: 128, draw: (s) => highriseTile(s, 14, COLORS.glassSky),
    light: { kind: 'towerCrown', topZ: 140, halfW: 0.6 },
  },
  {
    city: 'athens', key: 'titania-hotel',
    match: /Titania|Τιτάνια/i,
    foot: [1, 1], seed: 129, draw: (s) => highriseTile(s, 13, COLORS.glassSunset),
    light: { kind: 'towerCrown', topZ: 130, halfW: 0.5 },
  },

  // ---- NEOCLASSICAL MUSEUMS + CIVIC BLOCKS (the workhorse, but each placed) ----
  {
    city: 'athens', key: 'national-archaeological-museum',
    match: /Εθνικό Αρχαιολογικό Μουσείο|National Archaeological/i,
    foot: [4, 4], seed: 130, draw: (s) => neoclassicalBlock(s, 4, { order: 'ionic', head: 90 }),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.8 },
  },
  {
    city: 'athens', key: 'benaki-museum',
    match: /Μουσείο Μπενάκη(?!.*Πειραιώς)|Benaki Museum/i,
    foot: [2, 2], seed: 131, draw: (s) => neoclassicalBlock(s, 2, { order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'numismatic-museum-iliou-melathron',
    match: /Νομισματικό Μουσείο|Ιλίου Μέλαθρον|Numismatic Museum|Σλήμαν/i,
    foot: [2, 2], seed: 132, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'cycladic-art-museum',
    match: /Κυκλαδικής Τέχνης|Cycladic Art/i,
    foot: [2, 2], seed: 133, draw: (s) => neoclassicalBlock(s, 2, { order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'byzantine-christian-museum',
    match: /Βυζαντινό και Χριστιανικό|Byzantine and Christian|Βυζαντινό Μουσείο/i,
    foot: [2, 2], seed: 134, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'corinthian' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'war-museum',
    match: /Πολεμικό Μουσείο|War Museum/i,
    foot: [2, 2], seed: 135, draw: (s) => neoclassicalBlock(s, 2, { order: 'doric' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'university-history-museum',
    match: /Μουσείο Ιστορίας Πανεπιστημίου|University History/i,
    foot: [2, 2], seed: 136, draw: (s) => neoclassicalBlock(s, 2, { order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'areopagus-court',
    match: /Άρειος Πάγος|Areopagus|Areios Pagos/i,
    foot: [3, 3], seed: 137, draw: (s) => neoclassicalBlock(s, 3, { order: 'corinthian', head: 90 }),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.5 },
  },

  // ===================================================================
  // ROUND 2 — appended bespoke heroes (placed-name coverage). SPECIFIC
  // matches FIRST so e.g. the Averof BATTLESHIP wins over a Γ. Αβέρωφ statue
  // and the Benaki PIREOS annex wins over the generic Benaki.
  // ===================================================================

  // ---- Piraeus / maritime cluster ----
  {
    city: 'athens', key: 'averof-battleship',
    match: /Θωρηκτό.*Αβέρωφ|Αβέρωφ.*Θωρηκτό|Averof.*(battleship|warship)|Θ\/Κ Αβέρωφ/i,
    foot: [3, 3], seed: 138, draw: averofBattleshipTile,
    light: { kind: 'stadiumFlood', topZ: 90, halfW: 1.7 }, // floodlit warship deck
  },
  {
    city: 'athens', key: 'trireme-olympias',
    match: /Τριήρης|Ολυμπιάς|Trireme|Olympias/i,
    foot: [2, 2], seed: 139, draw: triremeTile,
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.4 },
  },
  {
    city: 'athens', key: 'submarine-papanikolis',
    match: /Παπανικολής|Υ\/Β|Submarine|Papanikolis/i,
    foot: [2, 2], seed: 140, draw: submarineTile,
    light: { kind: 'stadiumFlood', topZ: 40, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'piraeus-archaeological-museum',
    match: /Αρχαιολογικό Μουσείο Πειραιά|Piraeus Archaeological/i,
    foot: [2, 2], seed: 141, draw: (s) => neoclassicalBlock(s, 2, { order: 'doric' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'piraeus-municipal-gallery',
    match: /Δημοτική Πινακοθήκη Πειραιά|Piraeus Municipal Gallery/i,
    foot: [2, 2], seed: 142, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'electric-railways-museum',
    match: /Μουσείο Ηλεκτρικών Σιδηροδρόμων|Electric Railway/i,
    foot: [2, 2], seed: 143, draw: railwayStationTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.4 },
  },
  {
    city: 'athens', key: 'theatre-of-zea',
    match: /Θέατρο Ζέας|Zea|Ζέας/i,
    foot: [1, 1], seed: 144, draw: (s) => ruinCourtTile(s, false),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 0.6 },
  },

  // ---- Hill of the Muses / Pnyx monuments ----
  {
    city: 'athens', key: 'philopappos-monument',
    match: /Φιλοπάππου|Philopappos|Φιλόπαππος/i,
    foot: [1, 1], seed: 145, draw: philopapposTile,
    light: { kind: 'facadeFlood', topZ: 90, halfW: 0.6 },
  },
  {
    city: 'athens', key: 'pnyx',
    match: /Πνύκα|Pnyx|Πνύκας/i,
    foot: [2, 2], seed: 146, draw: pnyxTile,
    light: { kind: 'facadeFlood', topZ: 44, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'prison-of-socrates',
    match: /Φυλακή του Σωκράτη|Prison of Socrates|Σωκράτη/i,
    foot: [1, 1], seed: 147, draw: (s) => ruinCourtTile(s, true),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.6 },
  },
  {
    city: 'athens', key: 'mouseion-heroon',
    match: /Ηρώο του Μουσαίου|Μουσαίου|Mouseion/i,
    foot: [1, 1], seed: 148, draw: (s) => ruinCourtTile(s, false),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.6 },
  },

  // ---- monuments / memorials ----
  {
    city: 'athens', key: 'tomb-unknown-soldier',
    match: /Αγνώστου Στρατιώτου|Unknown Soldier/i,
    foot: [2, 2], seed: 149, draw: unknownSoldierTile,
    light: { kind: 'facadeFlood', topZ: 44, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'eponymous-heroes',
    match: /επωνύμων ηρώων|Eponymous Heroes/i,
    foot: [2, 2], seed: 150, draw: eponymousHeroesTile,
    light: { kind: 'facadeFlood', topZ: 30, halfW: 1.3 },
  },
  {
    city: 'athens', key: 'kaisariani-resistance-memorial',
    match: /Εθνικής Αντίστασης|Polytechni|Πολυτεχνείου|EAM|ΕΑΜικής|Resistance/i,
    foot: [1, 1], seed: 151, draw: (s) => ruinCourtTile(s, false),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.6 },
  },

  // ---- ancient-site museums + Agora sanctuaries ----
  {
    city: 'athens', key: 'kerameikos-museum',
    match: /Μουσείο Κεραμεικού|Kerameikos.*Museum|Κεραμεικού/i,
    foot: [1, 1], seed: 152, draw: (s) => neoclassicalBlock(s, 1, { order: 'doric', head: 70 }),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'epigraphic-museum',
    match: /Επιγραφικό|Epigraphic/i,
    foot: [2, 2], seed: 153, draw: (s) => neoclassicalBlock(s, 2, { order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'agora-museum',
    match: /Μουσείο Αρχαίας Αγοράς|Agora Museum/i,
    foot: [3, 3], seed: 154, draw: stoaOfAttalosTile,
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.6 },
  },
  {
    city: 'athens', key: 'eleusinion',
    match: /Ἐλευσίνιον|Ελευσίνιον|Eleusinion/i,
    foot: [1, 1], seed: 155, draw: (s) => ruinCourtTile(s, false),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.6 },
  },
  {
    city: 'athens', key: 'delphinion',
    match: /Δελφίνιον|Delphinion/i,
    foot: [1, 1], seed: 156, draw: (s) => ruinCourtTile(s, false),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.6 },
  },

  // ---- Benaki annexes + contemporary museums ----
  {
    city: 'athens', key: 'benaki-pireos-annex',
    match: /Μπενάκη.*Πειραιώς|Πειραιώς.*Μπενάκη|Benaki.*Pireos/i,
    foot: [2, 2], seed: 157, draw: benakiPireosTile,
    light: { kind: 'facadeFlood', topZ: 48, halfW: 1.4 },
  },
  {
    city: 'athens', key: 'frissiras-museum',
    match: /Φρυσίρα|Frissiras/i,
    foot: [1, 1], seed: 158, draw: frissirasTile,
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'tactual-museum',
    match: /Μουσείο Αφής|Tactual/i,
    foot: [1, 1], seed: 159, draw: (s) => modernCultureCubeTile(s, hex('#c98a5c')),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'greek-film-archive',
    match: /Ταινιοθήκη|Film Archive/i,
    foot: [1, 1], seed: 160, draw: (s) => modernCultureCubeTile(s, hex('#8a2f2a')),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'plato-academy-digital-museum',
    match: /Ψηφιακό Μουσείο.*Ακαδημίας Πλάτωνος|Ακαδημίας Πλάτωνος/i,
    foot: [1, 1], seed: 161, draw: (s) => modernCultureCubeTile(s, hex('#2f6fa0')),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'hellenic-it-museum',
    match: /Μουσείο Πληροφορικής|Information.*Museum|Πληροφορικής/i,
    foot: [1, 1], seed: 162, draw: (s) => modernCultureCubeTile(s, hex('#4d7a52')),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'theatre-studies-museum',
    match: /Μελέτης Ελληνικού Θεάτρου|Theatre Studies/i,
    foot: [2, 2], seed: 163, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'corinthian' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'acropolis-study-centre',
    match: /Κέντρο Μελετών Ακροπόλεως|Acropolis Study|Weiler/i,
    foot: [3, 3], seed: 164, draw: (s) => neoclassicalBlock(s, 3, { order: 'doric', head: 80 }),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.5 },
  },

  // ---- religious + observatory + Daphni ----
  {
    city: 'athens', key: 'daphni-monastery',
    match: /Μονή Δαφνίου|Daphni|Δαφνίου/i,
    foot: [2, 2], seed: 165, draw: daphniMonasteryTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'athens', key: 'national-observatory',
    match: /Αστεροσκοπείο|Observatory/i,
    foot: [2, 2], seed: 166, draw: observatoryTile,
    light: { kind: 'spireBeacon', topZ: 90, halfW: 0.9 }, // a telescope-dome beacon under the stars
  },
  {
    city: 'athens', key: 'panagia-marmariotissa',
    match: /Παναγία Μαρμαριώτισσα|Marmariotissa|Μαρμαριώτισσα/i,
    foot: [1, 1], seed: 167, draw: (s) => byzantineChapelTile(s, false),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'saint-nicholas-pefkakia',
    match: /Άγιος Νικόλαος|Saint Nicholas|Αγίου Νικολάου/i,
    foot: [1, 1], seed: 168, draw: (s) => byzantineChapelTile(s, true),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },

  // ---- Kotzia-Square / civic neoclassical + halls ----
  {
    city: 'athens', key: 'megaro-mela',
    match: /Μέγαρο Μελά|Megaro Mela|Μελά/i,
    foot: [1, 1], seed: 169, draw: megaroMelaTile,
    light: { kind: 'facadeFlood', topZ: 58, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'varvakeios-market',
    match: /Βαρβάκειος|Varvakeios|Βαρβάκειο/i,
    foot: [2, 2], seed: 170, draw: (s) => marketHallTile(s, 2),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 1.3 },
  },
  {
    city: 'athens', key: 'kypseli-market',
    match: /Κυψέλη.*Αγορά|Δημοτική Αγορά Κυψέλης|Kypseli.*Market/i,
    foot: [1, 1], seed: 171, draw: (s) => marketHallTile(s, 1),
    light: { kind: 'facadeFlood', topZ: 30, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'tobacco-factory',
    match: /Καπνεργοστάσιον|Καπνεργοστάσιο|Tobacco Factory/i,
    foot: [3, 3], seed: 172, draw: tobaccoFactoryTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.6 },
  },
  {
    city: 'athens', key: 'kifissos-bus-terminal',
    match: /ΚΤΕΛ|Σταθμός Υπεραστικών|Κηφισού|Bus Terminal/i,
    foot: [3, 3], seed: 173, draw: busTerminalTile,
    light: { kind: 'towerCrown', topZ: 54, halfW: 1.6 },
  },
  {
    city: 'athens', key: 'aqueduct-hadrian',
    match: /Υδραγωγείο|Aqueduct/i,
    foot: [2, 2], seed: 174, draw: aqueductTile,
    light: { kind: 'archGlow', topZ: 54, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'municipal-library',
    match: /Δημοτική Βιβλιοθήκη|Municipal Library/i,
    foot: [2, 2], seed: 175, draw: (s) => neoclassicalBlock(s, 2, { order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'army-geographical-service',
    match: /Γεωγραφική Υπηρεσία Στρατού|Geographical Service|Στρατού/i,
    foot: [2, 2], seed: 176, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'doric' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'pontian-studies',
    match: /Ποντιακών Μελετών|Pontian Studies|Ποντιακ/i,
    foot: [1, 1], seed: 177, draw: (s) => neoclassicalBlock(s, 1, { order: 'ionic', head: 70 }),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'palataki-villa',
    match: /Παλατάκι|Λέλας Καραγιάννη|Palataki|Καραγιάννη/i,
    foot: [1, 1], seed: 178, draw: palatakiVillaTile,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'eugenides-planetarium',
    match: /Πλανητάριο|Ευγενίδου|Planetarium/i,
    foot: [2, 2], seed: 179, draw: planetariumTile,
    light: { kind: 'rimCycle', topZ: 60, halfW: 1.4 }, // the dome lit like a starfield
  },
  {
    city: 'athens', key: 'kotopouli-museum',
    match: /Μαρίκας Κοτοπούλη|Kotopouli/i,
    foot: [1, 1], seed: 180, draw: (s) => neoclassicalBlock(s, 1, { order: 'ionic', head: 70 }),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'motor-museum',
    match: /Μουσείο Αυτοκινήτου|Motor Museum|Αυτοκινήτου/i,
    foot: [1, 1], seed: 184, draw: (s) => modernCultureCubeTile(s, hex('#b85a30')),
    light: { kind: 'towerCrown', topZ: 44, halfW: 0.7 },
  },

  // ===================================================================
  // ROUND 3 — the final push to 100 (seeds 185+). Modern marquees, great
  // mansions, City Hall, the Lycabettus stage, more ministries/churches/hotels
  // and the Larissa/Peloponnese stations. SPECIFIC names; placed in named[].
  // ===================================================================

  // ---- modern marquees (bespoke draw); acropolis-museum is registered at the
  // TOP of the array (before parthenon) so "Μουσείο Ακρόπολης" wins the museum,
  // not the temple ----
  {
    city: 'athens', key: 'onassis-stegi',
    match: /Στέγη.*Ωνάση|Ωνάσ.*Στέγη|Onassis Stegi|Στέγη Γραμμάτων/i,
    foot: [2, 2], seed: 186, draw: onassisStegiTile,
    light: { kind: 'towerCrown', topZ: 120, halfW: 1.2 }, // the marble lantern aglow
  },
  {
    city: 'athens', key: 'national-hellenic-research-foundation',
    match: /Εθνικό Ίδρυμα Ερευνών|Ελληνικό Ίδρυμα Ερευνών|National Hellenic Research|ΕΙΕ/i,
    foot: [3, 3], seed: 187, draw: modernResearchBlockTile,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.7 },
  },
  {
    city: 'athens', key: 'athens-conservatoire',
    match: /Ωδείο Αθηνών|Athens Conservatoire|Κρατικό Ωδείο/i,
    foot: [3, 3], seed: 188, draw: conservatoireTile,
    light: { kind: 'facadeFlood', topZ: 46, halfW: 1.6 },
  },

  // ---- great mansions + City Hall (bespoke draw) ----
  {
    city: 'athens', key: 'athens-city-hall',
    match: /Δημαρχείο Αθηνών|Δημαρχιακό Μέγαρο|Athens City Hall/i,
    foot: [2, 2], seed: 189, draw: cityHallTile,
    light: { kind: 'facadeFlood', topZ: 62, halfW: 1.2 },
  },
  {
    city: 'athens', key: 'duchess-of-plaisance-mansion',
    match: /Δούκισσας Πλακεντίας|Βίλα Ιλίσσια|Villa Ilissia|Plaisance|Πλακεντίας/i,
    foot: [2, 2], seed: 190, draw: villaIlissiaTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.2 },
  },
  {
    city: 'athens', key: 'sarogleio-mansion',
    match: /Σαρόγλειο|Μέγαρο Σαρόγλου|Sarogleio|Σαρόγλου/i,
    foot: [2, 2], seed: 191, draw: baroqueMansionTile,
    light: { kind: 'facadeFlood', topZ: 68, halfW: 1.2 },
  },

  // ---- the Lycabettus open-air theatre (bespoke draw) ----
  {
    city: 'athens', key: 'lycabettus-theatre',
    match: /Θέατρο Λυκαβηττού|Λυκαβηττού Θέατρο|Lycabettus Theatre/i,
    foot: [3, 3], seed: 192, draw: lycabettusTheatreTile,
    light: { kind: 'stadiumFlood', topZ: 150, halfW: 1.3 },
  },

  // ---- the old railway stations (Ziller) — placed via the station workhorse ----
  {
    city: 'athens', key: 'larissa-station',
    match: /Σταθμός Λαρίσης|Larissa Station|Σιδηροδρομικός Σταθμός Αθηνών/i,
    foot: [2, 2], seed: 193, draw: railwayStationTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.4 },
  },
  {
    city: 'athens', key: 'peloponnese-station',
    match: /Πελοποννήσου.*Σταθμός|Σταθμός Πελοποννήσου|Peloponnese.*[Ss]tation/i,
    foot: [2, 2], seed: 194, draw: railwayStationTile,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.4 },
  },

  // ---- more ministries / civic blocks (the marble workhorse, each placed) ----
  {
    city: 'athens', key: 'ministry-of-justice',
    match: /Υπουργείο Δικαιοσύνης|Ministry of Justice|Θέμιδος Μέλαθρον|Themidos/i,
    foot: [3, 3], seed: 195, draw: (s) => neoclassicalBlock(s, 3, { order: 'corinthian', head: 88 }),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.5 },
  },
  {
    city: 'athens', key: 'ministry-of-health',
    match: /Υπουργείο Υγείας|Ministry of Health/i,
    foot: [2, 2], seed: 196, draw: (s) => neoclassicalBlock(s, 2, { ochre: true, order: 'ionic' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },
  {
    city: 'athens', key: 'national-printing-office',
    match: /Εθνικό Τυπογραφείο|National Printing|Τυπογραφεί/i,
    foot: [2, 2], seed: 197, draw: (s) => neoclassicalBlock(s, 2, { order: 'doric' }),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.1 },
  },

  // ---- mansions / hotels / churches rounding out the 100 ----
  {
    city: 'athens', key: 'athinogenis-mansion',
    match: /Μέγαρο Αθηνογένη|Αθηνογένη|Athinogenis/i,
    foot: [1, 1], seed: 198, draw: (s) => neoclassicalBlock(s, 1, { ochre: true, order: 'ionic', head: 72 }),
    light: { kind: 'facadeFlood', topZ: 46, halfW: 0.7 },
  },
  {
    city: 'athens', key: 'king-george-hotel',
    match: /King George|Ξενοδοχείο King George|Μέγα Ξενοδοχείο Βασιλεύς Γεώργιος/i,
    foot: [1, 1], seed: 199, draw: (s) => highriseTile(s, 11, COLORS.glassSunset),
    light: { kind: 'towerCrown', topZ: 110, halfW: 0.5 },
  },
  {
    city: 'athens', key: 'church-saint-george-lycabettus',
    match: /Άγιος Γεώργιος Λυκαβηττού|Saint George.*Lycabettus|Άι Γιώργης/i,
    foot: [1, 1], seed: 200, draw: (s) => byzantineChapelTile(s, true),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.5 },
  },

  // ---- the square statues + busts (broad catch, LAST so named buildings win) ----
  {
    city: 'athens', key: 'statue-equestrian',
    match: /Καραϊσκάκης|Κολοκοτρώνης|Ανδριάντας/i,
    foot: [1, 1], seed: 181, draw: (s) => statueTile(s, true),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.4 },
  },
  {
    city: 'athens', key: 'statue-standing',
    match: /Βενιζέλου|Άγαλμα|Τρικούπης|Ελύτης|Κάνινγκ|Πλάτων|Παναγούλης|Φλέμινγκ|Γερμανός|Παλάντιος|Πέταγμα|Βλαχάκου|Αβέρωφ/i,
    foot: [1, 1], seed: 182, draw: (s) => statueTile(s, false),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.4 },
  },
  {
    city: 'athens', key: 'bust-herm',
    match: /Προτομή|Δασκαλογίαννη|ΓΑΛΛΟΥ/i,
    foot: [1, 1], seed: 183, draw: bustTile,
    light: { kind: 'facadeFlood', topZ: 36, halfW: 0.3 },
  },
];
