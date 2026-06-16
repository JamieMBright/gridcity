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

// =====================================================================
// THE REGISTRY — placed Greek names → bespoke draw. Order matters (first match
// wins); the marquee ancient monuments are listed before generic blocks so a
// specific temple never falls through to the neoclassical workhorse.
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
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
];
