// Paris's bespoke-hero registry — ROUND 1 of the 99-hero target (docs/heroes/
// paris/ holds 99 researched landmarks). Each entry resolves a PLACED name from
// src/data/cities/paris.ts's `named` list to a hand-built iso sprite + a bespoke
// night-electrification light.
//
// Two tiers:
//  • MARQUEE — the five icons that already have dedicated draw fns in
//    landmarkSprites.ts (Eiffel, Notre-Dame, Louvre, Arc de Triomphe). We wire
//    them here so the override fires on their real placed names (today they fall
//    back to a generic archetype). `foot` MUST equal each fn's own footprint:
//      eiffelTile    → new Iso(3,3,{swAnchor})              ⇒ [3,3]
//      notredameTile → new Iso(2,2,{swAnchor,headroom:260}) ⇒ [2,2]
//      louvreTile    → new Iso()                            ⇒ [1,1]
//      archTile      → new Iso()                            ⇒ [1,1]
//  • BESPOKE — NEW draw fns below for the rest of the placed Paris landmarks
//    (Opéra Garnier, the Madeleine, the Invalides golden dome, Grand Palais,
//    Musée d'Orsay, Tour Saint-Jacques, the château donjon, the Russo-Byzantine
//    cathedrals, baroque churches, the Lion de Belfort, hôtels particuliers…).
//    Each builds its silhouette from Iso boxes/roofs/dome-loops so it reads as
//    the real building, with per-hero size + a distinct light.
//
// SCOPE: this file only. The registry is already wired to import CITY_HEROES.

import type { BespokeHero } from './registry';
import {
  archTile,
  eiffelTile,
  louvreTile,
  notredameTile,
} from '../landmarkSprites';
import {
  CELL_W,
  INK,
  INK_W,
  Iso,
  lit,
  RES,
  shaded,
  SHADOW,
  top,
} from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';

// --- shared Paris palette (Haussmann cream stone, grey zinc, gilt, lead) -----
const LIME = hex('#e2d8bf'); // warm Paris limestone (Louvre / Haussmann)
const LIME_D = hex('#c2b696');
const ZINC = hex('#6c7682'); // the grey zinc mansard that crowns the city
const LEADG = hex('#7c948a'); // the grey-green lead dome (Panthéon / Invalides drum)
const GILT = hex('#cda64a'); // gilded dome / finial gold (Invalides, Opéra)
const GILT_HOT = hex('#e8c25a');
const COPPER = hex('#5fa389'); // verdigris copper (Opéra / Garnier sculpture, gares)
const SLATE = hex('#3d444b'); // dark slate roofs (read near-black at dusk)
const ONION_GOLD = hex('#d8b24e'); // Russian-orthodox gilded onion
const ONION_BLUE = hex('#3a6ea5'); // azure onion (Saint-Alexandre-Nevsky)

/** A half-dome / cupola as a stack of poly arcs at a screen point. Returns the
 *  tip Y (for finials). `flat` < 1 squashes it toward a saucer dome. */
function domeAt(
  iso: Iso,
  cx: number,
  cy: number,
  baseZ: number,
  rPx: number,
  riseMul: number,
  body: RGBA,
  opts: { ribs?: number; bulb?: boolean } = {},
): { tipX: number; tipY: number } {
  const [dx, dyB] = iso.P(cx, cy, baseZ);
  const rise = rPx * riseMul;
  const prof = (a: number): number => (opts.bulb ? Math.sin(a) ** 0.78 : Math.sin(a));
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push([dx + Math.cos(a) * rPx * s, dyB - prof(a) * rise * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), shaded(body, 0.08), lit(body, 0.06));
  iso.r.poly(ring(0.6).map(([x, y]): Pt => [x + rPx * 0.16, y - rise * 0.12]), lit(body, 0.16));
  for (let k = 0; k < (opts.ribs ?? 0); k++) {
    const t = (k / Math.max(1, (opts.ribs ?? 1) - 1)) * 2 - 1;
    iso.r.line(
      [dx + t * rPx, dyB],
      [dx + t * rPx * 0.12, dyB - rise],
      0.7 * RES,
      alpha(darken(body, 0.22), 0.7),
    );
  }
  iso.r.polyline(ring(1), INK_W * 0.85, INK);
  return { tipX: dx, tipY: dyB - rise };
}

/** A small lantern + finial spike crowning a dome tip. */
function finial(iso: Iso, x: number, y: number, h: number, col: RGBA): void {
  iso.r.rect(x - 1.8 * RES, y - 5 * RES, x + 1.8 * RES, y + 1 * RES, lighten(LIME, 0.1));
  iso.r.line([x, y - 5 * RES], [x, y - 5 * RES - h * RES], 1.2 * RES, col);
  iso.r.line([x - 2 * RES, y - 5 * RES - h * RES * 0.6], [x + 2 * RES, y - 5 * RES - h * RES * 0.6], 1 * RES, col);
}

/** A row of slim columns (a portico/peristyle) on a face at fixed v, between u
 *  positions, from zBase up to zTop. */
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

/** A classical pediment triangle sitting on a face at fixed v. */
function pediment(iso: Iso, v: number, uA: number, uB: number, zBase: number, rise: number, col: RGBA): void {
  const um = (uA + uB) / 2;
  iso.r.poly([iso.P(uA, v, zBase), iso.P(uB, v, zBase), iso.P(um, v, zBase + rise)], lighten(col, 0.12));
  iso.r.polyline([iso.P(uA, v, zBase), iso.P(uB, v, zBase), iso.P(um, v, zBase + rise)], INK_W * 0.8, INK, true);
}

// =====================================================================
// MARQUEE wrappers (reuse the dedicated landmarkSprites fns) — see header.
// =====================================================================

// =====================================================================
// OPÉRA GARNIER — Second-Empire opera house: a Beaux-Arts mass under a green
// COPPER ellipsoidal cupola crowned by Apollo's gilt group, a colonnaded loggia
// front, paired columns, and the two flanking pavilions. 2×2.
// =====================================================================
function operaGarnierTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.36, v1 = 1.64;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // main stone body
  iso.box(u0, v0, u1, v1, 0, 40, LIME);
  // rusticated base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 11, shaded(LIME, 0.12), { ink: false });
  // the famous loggia: paired columns along the front (v1) under a gilt frieze
  colonnade(iso, v1, u0 + 0.12, u1 - 0.12, 14, 34, 14, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 40, 45, GILT, { topC: top(GILT, 0.2) }); // gilt frieze cornice
  // two flanking pavilions (Emperor's & abonnés rotundas), slightly taller
  for (const cu of [u0 + 0.12, u1 - 0.12] as const) {
    iso.box(cu - 0.16, v1 - 0.34, cu + 0.16, v1, 0, 52, LIME);
    iso.hip(cu - 0.18, v1 - 0.36, cu + 0.18, v1 + 0.02, 52, 12, COPPER);
    const ft = iso.P(cu, v1 - 0.17, 64);
    iso.r.line(ft, [ft[0], ft[1] - 4 * RES], 1 * RES, GILT_HOT);
  }
  // the stage-house mass behind, then the great cupola over the auditorium
  iso.box(u0 + 0.24, v0 + 0.1, u1 - 0.24, v0 + 0.7, 0, 58, LIME_D);
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.08;
  iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 45, 60, lighten(LIME, 0.04)); // drum
  // green copper saucer-cupola
  const { tipX, tipY } = domeAt(iso, cx, cy, 60, 0.42 * (CELL_W / 2), 0.95, COPPER, { ribs: 6, bulb: true });
  // Apollo's gilt sculptural group + lyre finial
  iso.r.poly([[tipX - 3.4 * RES, tipY + 2 * RES], [tipX + 3.4 * RES, tipY + 2 * RES], [tipX, tipY - 9 * RES]], GILT);
  iso.glint([tipX, tipY - 4 * RES], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// ÉGLISE DE LA MADELEINE — a Napoleonic Greek temple: a windowless stone box
// wrapped on ALL sides by a giant Corinthian peristyle under a low pediment and
// a continuous lead roof. No dome, no tower — the silhouette IS the colonnade.
// 2×2.
// =====================================================================
function madeleineTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the tall stepped stylobate (the temple sits on a high podium)
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 16, shaded(LIME, 0.14));
  // the cella (inner stone box), lower than the colonnade tops
  iso.box(u0 + 0.18, v0 + 0.18, u1 - 0.18, v1 - 0.18, 16, 58, LIME_D, { ink: false });
  // the peristyle: Corinthian columns wrapping the two visible faces
  const colZ0 = 16, colZ1 = 56;
  colonnade(iso, v1, u0 + 0.06, u1 - 0.06, colZ0, colZ1, 13, COLORS.white);
  for (let i = 0; i <= 11; i++) {
    const v = v0 + 0.06 + ((v1 - v0 - 0.12) * i) / 11;
    iso.r.poly(
      [iso.P(u1, v - 0.012, colZ1), iso.P(u1, v + 0.012, colZ1), iso.P(u1, v + 0.012, colZ0), iso.P(u1, v - 0.012, colZ0)],
      i % 2 ? COLORS.white : lit(COLORS.white, 0.08),
    );
  }
  // entablature + cornice band over the columns
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, colZ1, colZ1 + 7, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  // shallow lead roof + the sculptural pediment on the front
  iso.gable(u0, v0, u1, v1, colZ1 + 7, 12, 'v', LEADG, LIME);
  pediment(iso, v1, u0 + 0.1, u1 - 0.1, colZ1 + 7, 13, LIME);
  return iso.build();
}

// =====================================================================
// CATHÉDRALE SAINT-LOUIS DES INVALIDES — the Dôme des Invalides: a tall
// baroque drum + colonnaded peristyle under the great GILDED dome (the tallest
// church in Paris) topped by a lantern + spire. A broad classical court block.
// 2×2.
// =====================================================================
function invalidesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the cruciform stone base block
  iso.box(u0, v0, u1, v1, 0, 46, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(LIME, 0.12), { ink: false });
  // a two-tier portico front (paired Doric over Corinthian) + pediment
  colonnade(iso, v1, u0 + 0.2, u1 - 0.2, 8, 26, 8, COLORS.white);
  colonnade(iso, v1, u0 + 0.24, u1 - 0.24, 28, 44, 7, COLORS.white);
  pediment(iso, v1, u0 + 0.22, u1 - 0.22, 46, 12, LIME);
  // the tall colonnaded DRUM rising over the crossing
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.04;
  iso.box(cx - 0.4, cy - 0.4, cx + 0.4, cy + 0.4, 46, 70, lighten(LIME, 0.03));
  // drum peristyle (ring of columns drawn across the visible front)
  const [drx, dryB] = iso.P(cx, cy + 0.4, 0);
  const DR = 0.42 * (CELL_W / 2);
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    const px = drx + Math.cos(a) * DR;
    const py = dryB - 58 * RES + Math.sin(a) * DR * 0.46;
    iso.r.line([px, py - 9 * RES], [px, py + 9 * RES], 1.2 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.1) : COLORS.white);
  }
  iso.box(cx - 0.34, cy - 0.34, cx + 0.34, cy + 0.34, 70, 80, GILT_HOT, { ink: false }); // gilded attic ring
  // the great GILDED dome, ribbed, with gilt trophies
  const { tipX, tipY } = domeAt(iso, cx, cy, 80, DR * 0.94, 1.28, GILT, { ribs: 7, bulb: true });
  // lantern + slender spire (107 m — towers over Paris)
  iso.r.rect(tipX - 3 * RES, tipY - 12 * RES, tipX + 3 * RES, tipY + 1 * RES, lighten(GILT, 0.12));
  iso.r.line([tipX, tipY - 12 * RES], [tipX, tipY - 30 * RES], 1.6 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 6 * RES], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// GRAND PALAIS — Belle-Époque exhibition hall: a long stone Beaux-Arts facade
// with a giant Ionic colonnade and corner quadriga groups, behind it the vast
// GLASS-and-IRON barrel-vaulted nave glowing at dusk. 3×3 (a monster venue).
// =====================================================================
function grandPalaisTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the great iron-and-glass barrel vault behind the facade (the signature):
  // a glowing glass mass with transverse ribs arcing to a gold ridge skylight.
  const vx0 = u0 + 0.2, vx1 = u1 - 0.2;
  const vaultMidV = (v0 + 0.2 + v1 - 0.7) / 2;
  iso.box(vx0, v0 + 0.2, vx1, v1 - 0.7, 0, 30, shaded(COLORS.glassSky, 0.08), { ink: false });
  const ribCol = alpha(COLORS.glassSky, 0.85);
  const VAULT = 32 * RES; // vault rise above the eaves
  for (let i = 0; i <= 16; i++) {
    const u = vx0 + ((vx1 - vx0) * i) / 16;
    const [bx, by] = iso.P(u, vaultMidV, 30);
    iso.r.line([bx, by], [bx, by - VAULT], 0.8 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : ribCol);
  }
  // the longitudinal ridge skylight catching gold
  const [rx0, ry0] = iso.P(vx0, vaultMidV, 30);
  const [rx1] = iso.P(vx1, vaultMidV, 30);
  iso.r.line([rx0, ry0 - VAULT], [rx1, ry0 - VAULT], 1.6 * RES, alpha(COLORS.glassLit, 0.8));
  // the long stone facade screen in front (v1 side)
  iso.box(u0, v1 - 0.6, u1, v1, 0, 50, LIME);
  iso.box(u0 - 0.02, v1 - 0.62, u1 + 0.02, v1 + 0.02, 0, 10, shaded(LIME, 0.12), { ink: false });
  colonnade(iso, v1, u0 + 0.16, u1 - 0.16, 14, 44, 22, COLORS.white);
  iso.box(u0 - 0.04, v1 - 0.64, u1 + 0.04, v1 + 0.04, 50, 56, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  // corner pavilions carrying the bronze quadrigae
  for (const cu of [u0 + 0.2, u1 - 0.2] as const) {
    iso.box(cu - 0.2, v1 - 0.62, cu + 0.2, v1, 0, 58, LIME);
    iso.box(cu - 0.22, v1 - 0.64, cu + 0.22, v1 + 0.02, 58, 64, COPPER, { ink: false });
    const q = iso.P(cu, v1 - 0.31, 70);
    iso.r.poly([[q[0] - 4 * RES, q[1] + 2 * RES], [q[0] + 4 * RES, q[1] + 2 * RES], [q[0], q[1] - 6 * RES]], COPPER);
  }
  return iso.build();
}

// =====================================================================
// MUSÉE D'ORSAY — the former Gare d'Orsay: a long Beaux-Arts riverfront block
// with the two giant ROUND STATION CLOCK faces, rusticated arches, a sculptural
// attic, and the arched glazed train-shed roof behind. 3×3 (a long station).
// =====================================================================
function orsayTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.34, u1 = 2.66, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the long arched glass train-shed roof behind the facade
  iso.box(u0 + 0.2, v0 + 0.3, u1 - 0.2, v1 - 0.6, 0, 34, shaded(COLORS.glassSky, 0.08), { ink: false });
  const shedV = (v0 + 0.3 + v1 - 0.6) / 2;
  for (let i = 0; i <= 14; i++) {
    const u = u0 + 0.3 + ((u1 - u0 - 0.6) * i) / 14;
    const [bx, by] = iso.P(u, shedV, 34);
    iso.r.line([bx, by], [bx, by - 22 * RES], 0.8 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : alpha(COLORS.glassSky, 0.85));
  }
  // the riverfront facade block
  iso.box(u0, v1 - 0.6, u1, v1, 0, 48, LIME);
  iso.box(u0 - 0.02, v1 - 0.62, u1 + 0.02, v1 + 0.02, 0, 11, shaded(LIME, 0.12), { ink: false });
  // the rusticated ground-arches (tall round-headed bays)
  for (let i = 0; i < 7; i++) {
    const u = u0 + 0.16 + i * 0.32;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 22)];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      poly.push(iso.P(u + 0.22 * t, v1, 22 + Math.sin(t * Math.PI) * 8));
    }
    poly.push(iso.P(u + 0.22, v1, 22), iso.P(u + 0.22, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.85));
  }
  // sculptural attic + cornice
  iso.box(u0 - 0.04, v1 - 0.64, u1 + 0.04, v1 + 0.04, 48, 56, lighten(LIME, 0.06), { topC: top(LIME, 0.28) });
  // the two giant station CLOCK faces near each end
  for (const cu of [u0 + 0.5, u1 - 0.5] as const) {
    const [clx, cly] = iso.P(cu, v1, 38);
    const RR = 5.2 * RES;
    const ring: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]);
    }
    iso.r.poly(ring, COLORS.white);
    iso.r.polyline(ring, INK_W * 0.7, INK, true);
    iso.r.line([clx, cly - RR], [clx, cly - RR - 2.6 * RES], 1 * RES, INK); // hands
    iso.r.line([clx, cly - RR], [clx + 2 * RES, cly - RR], 1 * RES, INK);
  }
  // two end pavilions (the old hotel towers) slightly taller
  for (const cu of [u0 + 0.16, u1 - 0.16] as const) {
    iso.box(cu - 0.14, v1 - 0.62, cu + 0.14, v1, 0, 60, LIME);
    iso.hip(cu - 0.16, v1 - 0.64, cu + 0.16, v1 + 0.02, 60, 12, ZINC);
  }
  return iso.build();
}

// =====================================================================
// GALERIE VIVIENNE — a covered Belle-Époque shopping arcade: a long low stone
// range with a glowing GLAZED BARREL ROOF down its spine + a mosaic-pavement
// hint and a neoclassical end-portal. Modest 2×2 (it's a narrow passage).
// =====================================================================
function galerieVivienneTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 40 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // the two stone ranges flanking the passage
  iso.box(u0, v0, u0 + 0.34, v1, 0, 30, LIME);
  iso.box(u1 - 0.34, v0, u1, v1, 0, 30, LIME);
  // round-headed shop windows down the visible range
  iso.windowsLeft(v1, u0 + 0.04, u0 + 0.3, 6, 24, 3, alpha(COLORS.glassLit, 0.7), COLORS.white);
  // the glazed barrel skylight glowing between them
  const midU = (u0 + u1) / 2;
  iso.box(u0 + 0.34, v0 + 0.06, u1 - 0.34, v1 - 0.06, 0, 24, shaded(COLORS.glassSky, 0.06), { ink: false });
  for (let i = 0; i <= 10; i++) {
    const v = v0 + 0.06 + ((v1 - v0 - 0.12) * i) / 10;
    const [bx, by] = iso.P(midU, v, 24);
    iso.r.line([bx, by], [bx, by - 10 * RES], 0.8 * RES, i % 2 ? alpha(COLORS.glassLit, 0.8) : alpha(COLORS.glassSky, 0.85));
  }
  const [rx0, ry0] = iso.P(midU, v0 + 0.06, 24);
  const [rx1] = iso.P(midU, v1 - 0.06, 24);
  void rx1;
  iso.r.line([rx0, ry0 - 10 * RES], iso.P(midU, v1 - 0.06, 34) as Pt, 1.4 * RES, alpha(COLORS.glassLit, 0.75));
  // a neoclassical end-frame with a pediment over the entrance
  iso.box(u0 + 0.3, v1 - 0.12, u1 - 0.3, v1, 0, 36, lighten(LIME, 0.04));
  pediment(iso, v1, u0 + 0.34, u1 - 0.34, 36, 8, LIME);
  return iso.build();
}

// =====================================================================
// TOUR SAINT-JACQUES — the lone 52 m FLAMBOYANT-GOTHIC bell tower (all that
// remains of Saint-Jacques-de-la-Boucherie): a tall square stone shaft dense
// with vertical tracery, crocketed corner pinnacles, an open lacework crown and
// the statue of Saint James on top. Slim 1×1 with headroom — it spikes up.
// =====================================================================
function tourSaintJacquesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 300 });
  void seed;
  const ST = hex('#cdc6b4'); // cool gothic limestone
  const STD = hex('#aaa48f');
  const u = 0.5, v = 0.52, b = 0.2;
  const H = 188;
  iso.shadow(u - b, v - b * 0.4, u + b, v + b, 0.4, 0.26);
  // a small green garden plinth (it stands in a square)
  iso.box(u - 0.3, v - 0.3, u + 0.3, v + 0.3, 0, 5, shaded(COLORS.grass, 0.1), { ink: false });
  // the tall square shaft, three diminishing stages
  iso.box(u - b, v - b, u + b, v + b, 5, H * 0.62, ST);
  iso.box(u - b * 0.92, v - b * 0.92, u + b * 0.92, v + b * 0.92, H * 0.62, H * 0.86, ST);
  // dense vertical gothic tracery on both visible faces
  for (let i = 0; i < 5; i++) {
    const t = -b + 0.06 + (i * 2 * (b - 0.06)) / 4;
    const poly: Pt[] = [iso.P(u + t, v + b, 14), iso.P(u + t, v + b, H * 0.5)];
    poly.push(iso.P(u + t + 0.018, v + b, H * 0.5 + 6));
    poly.push(iso.P(u + t + 0.036, v + b, H * 0.5), iso.P(u + t + 0.036, v + b, 14));
    iso.r.poly(poly, alpha(darken(STD, 0.18), 0.8));
  }
  // crocketed corner pinnacles at the gallery
  const galZ = H * 0.86;
  for (const [pu, pv] of [[u - b, v - b], [u + b, v - b], [u - b, v + b], [u + b, v + b]] as const) {
    const pb = iso.P(pu, pv, galZ);
    const pt = iso.P(pu, pv, galZ + 30);
    iso.r.poly([[pb[0] - 2.2 * RES, pb[1]], [pb[0] + 2.2 * RES, pb[1]], pt], lit(ST, 0.1));
    iso.r.polyline([[pb[0] - 2.2 * RES, pb[1]], pt, [pb[0] + 2.2 * RES, pb[1]]], INK_W * 0.5, alpha(INK, 0.7));
  }
  // the open lacework crown + the statue of Saint James
  iso.box(u - b * 0.6, v - b * 0.6, u + b * 0.6, v + b * 0.6, galZ, galZ + 14, lighten(ST, 0.06));
  const [sx, syB] = iso.P(u, v, galZ + 14);
  // a small standing figure silhouette
  iso.r.poly([[sx - 2.4 * RES, syB], [sx + 2.4 * RES, syB], [sx + 1.4 * RES, syB - 12 * RES], [sx - 1.4 * RES, syB - 12 * RES]], STD);
  iso.r.line([sx, syB - 12 * RES], [sx, syB - 17 * RES], 1.2 * RES, lit(ST, 0.1));
  return iso.build();
}

// =====================================================================
// CHÂTEAU (donjon) — a medieval French keep: a tall square stone tower-house
// with machicolated parapet + corner bartizans + steep pepperpot conical roofs,
// behind a low curtain wall. Parameterised so it serves the placed châteaux
// (Vincennes, Réghat, Parangon, Rothschild, d'Asnières…). 2×2.
// =====================================================================
function chateauTile(seed: number, tall: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: tall ? 160 : 90 });
  void seed;
  const ST = hex('#c8bda2'); // pale ashlar (lightened so it reads at dusk)
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // a low curtain-wall court + corner round towers
  iso.box(u0, v0, u1, v1, 0, tall ? 32 : 36, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.12), { ink: false });
  // windows on the visible long face (a residential château front)
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 12, tall ? 28 : 30, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // steep slate mansard roof over the body
  iso.gable(u0, v0, u1, v1, tall ? 32 : 36, tall ? 14 : 22, 'u', SLATE, ST);
  // four corner round towers with conical pepperpot roofs (the château read)
  const keepH = tall ? 78 : 50;
  for (const [cu, cv, big] of [
    [u0, v0, tall],
    [u1, v0, false],
    [u0, v1, false],
    [u1, v1, tall],
  ] as const) {
    const h = big ? keepH : keepH * 0.62;
    iso.box(cu - 0.13, cv - 0.13, cu + 0.13, cv + 0.13, 0, h, ST);
    // machicolated parapet ring
    iso.box(cu - 0.15, cv - 0.15, cu + 0.15, cv + 0.15, h, h + 4, lighten(ST, 0.06), { ink: false });
    // conical pepperpot roof
    const apex = iso.P(cu, cv, h + (big ? 30 : 22));
    const c0 = iso.P(cu - 0.15, cv + 0.15, h + 4);
    const c1 = iso.P(cu + 0.15, cv + 0.15, h + 4);
    const c2 = iso.P(cu + 0.15, cv - 0.15, h + 4);
    iso.r.poly([c0, c1, apex], shaded(SLATE, 0.06));
    iso.r.poly([c1, c2, apex], lit(SLATE, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  }
  // the dominant central DONJON keep (Vincennes' signature) — a tall square
  // tower-house with a machicolated crown, towering over the curtain.
  if (tall) {
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
    const kh = 132;
    iso.box(cx - 0.24, cy - 0.24, cx + 0.24, cy + 0.24, 0, kh, ST);
    // tall vertical window slits up the visible faces
    iso.windowsLeft(cy + 0.24, cx - 0.2, cx + 0.2, 24, kh - 14, 3, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.windowsRight(cx + 0.24, cy - 0.2, cy + 0.2, 24, kh - 14, 3, alpha(COLORS.glassDark, 0.85), COLORS.white);
    // overhanging machicolated parapet
    iso.box(cx - 0.27, cy - 0.27, cx + 0.27, cy + 0.27, kh, kh + 6, lighten(ST, 0.06));
    // four small corner bartizans crowning the keep
    for (const [bu, bv] of [[cx - 0.24, cy - 0.24], [cx + 0.24, cy - 0.24], [cx - 0.24, cy + 0.24], [cx + 0.24, cy + 0.24]] as const) {
      iso.box(bu - 0.05, bv - 0.05, bu + 0.05, bv + 0.05, kh + 6, kh + 16, ST, { ink: false });
      const ap = iso.P(bu, bv, kh + 28);
      const q0 = iso.P(bu - 0.05, bv + 0.05, kh + 16);
      const q2 = iso.P(bu + 0.05, bv - 0.05, kh + 16);
      iso.r.poly([q0, iso.P(bu + 0.05, bv + 0.05, kh + 16), ap], shaded(SLATE, 0.04));
      iso.r.polyline([q0, ap, q2], INK_W * 0.5, INK);
    }
  }
  return iso.build();
}

// =====================================================================
// CATHÉDRALE ORTHODOXE — a Russo-Byzantine church: a cross-plan stone body
// crowned by GILDED (or azure) ONION DOMES on tall drums — one big central +
// four smaller — each with an orthodox cross. Serves Saint-Alexandre-Nevsky,
// Saint-Vladimir, the American cathedral (gothic variant), Saint-Étienne. 2×2.
// =====================================================================
function orthodoxCathedralTile(seed: number, onionCol: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = hex('#d3c8b0');
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // cruciform stone body with shallow arched gables
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(ST, 0.12), { ink: false });
  // three tall arched windows on the front
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.24 + i * 0.34;
    const poly: Pt[] = [iso.P(u, v1, 12), iso.P(u, v1, 28)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      poly.push(iso.P(u + 0.14 * t, v1, 28 + Math.sin(t * Math.PI) * 6));
    }
    poly.push(iso.P(u + 0.14, v1, 28), iso.P(u + 0.14, v1, 12));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.85));
  }
  // an onion dome on a drum at a position
  const onion = (cu: number, cv: number, drumZ0: number, drumH: number, rPx: number): void => {
    iso.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, 40, 40 + drumZ0 + drumH, lighten(ST, 0.04));
    const [dx, dyB] = iso.P(cu, cv, 40 + drumZ0 + drumH);
    // onion profile: bulge out then pinch to a point
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20; // 0 base → 1 tip
      const a = t * Math.PI;
      const wob = Math.sin(a) * (1 + 0.5 * Math.sin(a * 1.6)) * 0.62;
      pts.push([dx + Math.cos(Math.PI - a) * rPx * wob, dyB - t * rPx * 2.0]);
    }
    // mirror for full onion
    const full = [...pts];
    for (let i = pts.length - 2; i >= 0; i--) {
      const p = pts[i]!;
      full.push([2 * dx - p[0], p[1]]);
    }
    iso.r.poly(full, shaded(onionCol, 0.06), lit(onionCol, 0.1));
    iso.r.polyline(full, INK_W * 0.7, INK, true);
    // orthodox cross finial
    const ty = dyB - rPx * 2.0;
    iso.r.line([dx, ty], [dx, ty - 9 * RES], 1.2 * RES, GILT_HOT);
    iso.r.line([dx - 2.4 * RES, ty - 5 * RES], [dx + 2.4 * RES, ty - 5 * RES], 1 * RES, GILT_HOT);
    iso.r.line([dx - 1.6 * RES, ty - 1.5 * RES], [dx + 1.6 * RES, ty - 1.5 * RES], 0.9 * RES, GILT_HOT);
  };
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  // four corner onions (smaller) then the great central one
  onion(u0 + 0.18, v0 + 0.18, 6, 14, 0.16 * (CELL_W / 2));
  onion(u1 - 0.18, v0 + 0.18, 6, 14, 0.16 * (CELL_W / 2));
  onion(u0 + 0.18, v1 - 0.18, 4, 12, 0.15 * (CELL_W / 2));
  onion(u1 - 0.18, v1 - 0.18, 4, 12, 0.15 * (CELL_W / 2));
  onion(cx, cy, 18, 24, 0.26 * (CELL_W / 2));
  return iso.build();
}

// =====================================================================
// CATHÉDRALE / ÉGLISE GOTHIQUE — a stone gothic church: a nave with a steep
// roof, a rose window and a pair of front spires/towers. Serves the American
// Cathedral, Saint-Étienne and the like (neo-gothic Paris churches). 2×2.
// =====================================================================
function gothicChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const ST = hex('#cbc4b2');
  const STD = hex('#a8a28d');
  const ROOF = hex('#4f5a6b');
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the nave + steep gable roof
  iso.box(u0, v0, u1, v1 - 0.18, 0, 56, ST);
  iso.gable(u0, v0, u1, v1 - 0.18, 56, 26, 'v', ROOF, ST);
  // aisle windows
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.08 + i * 0.18;
    iso.r.poly([iso.P(u, v1 - 0.18, 10), iso.P(u + 0.05, v1 - 0.18, 10), iso.P(u + 0.05, v1 - 0.18, 30), iso.P(u + 0.025, v1 - 0.18, 36), iso.P(u, v1 - 0.18, 30)], alpha(COLORS.glassDark, 0.85));
  }
  // the west front + rose window between two spires
  iso.box(u0 + 0.06, v1 - 0.18, u1 - 0.06, v1, 0, 78, ST);
  const [rx, ry] = iso.P((u0 + u1) / 2, v1, 52);
  const RR = 8 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.95]);
  }
  iso.r.poly(rose, alpha(COLORS.glassDark, 0.9));
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  // twin spired towers
  for (const tu of [u0 + 0.12, u1 - 0.12] as const) {
    iso.box(tu - 0.1, v1 - 0.14, tu + 0.1, v1, 0, 92, ST);
    const apex = iso.P(tu, v1 - 0.07, 132);
    const c0 = iso.P(tu - 0.1, v1, 92);
    const c1 = iso.P(tu + 0.1, v1, 92);
    const c2 = iso.P(tu + 0.1, v1 - 0.14, 92);
    iso.r.poly([c0, c1, apex], shaded(ROOF, 0.08));
    iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    // a stone string-course banding the belfry stage
    iso.r.line(iso.P(tu - 0.1, v1, 64), iso.P(tu + 0.1, v1, 64), 1.4 * RES, STD);
  }
  return iso.build();
}

// =====================================================================
// ÉGLISE BAROQUE — a French baroque parish church: a two-tier scrolled stone
// facade with a pediment + a single dome-and-lantern over the crossing. Serves
// Saint-Roch, the Chapelle expiatoire, Saint-Michel, Saint-Pierre-Saint-Paul,
// Notre-Dame de Boulogne. 2×2.
// =====================================================================
function baroqueChurchTile(seed: number, domed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = hex('#d6cdb6');
  const u0 = 0.48, u1 = 1.52, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // nave body
  iso.box(u0, v0, u1, v1 - 0.16, 0, 50, ST);
  iso.gable(u0, v0, u1, v1 - 0.16, 50, 14, 'v', ZINC, ST);
  // the two-storey scrolled facade
  iso.box(u0 + 0.05, v1 - 0.16, u1 - 0.05, v1, 0, 40, lighten(ST, 0.03));
  // lower order: four columns + door
  colonnade(iso, v1, u0 + 0.16, u1 - 0.16, 6, 24, 6, COLORS.white);
  // upper order narrower + pediment
  iso.box(u0 + 0.22, v1 - 0.14, u1 - 0.22, v1, 40, 56, ST);
  colonnade(iso, v1, u0 + 0.3, u1 - 0.3, 42, 54, 4, COLORS.white);
  pediment(iso, v1, u0 + 0.24, u1 - 0.24, 56, 11, ST);
  if (domed) {
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.06;
    iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 50, 64, lighten(ST, 0.04)); // drum
    const { tipX, tipY } = domeAt(iso, cx, cy, 64, 0.26 * (CELL_W / 2), 1.05, LEADG, { ribs: 5 });
    finial(iso, tipX, tipY, 9, GILT_HOT);
  } else {
    // a single bell turret over the front-right
    const tu = u1 - 0.16;
    iso.box(tu - 0.1, v1 - 0.3, tu + 0.1, v1 - 0.08, 56, 84, ST);
    iso.hip(tu - 0.12, v1 - 0.32, tu + 0.12, v1 - 0.06, 84, 14, ZINC);
  }
  return iso.build();
}

// =====================================================================
// LE LION DE BELFORT — the monumental copper LION couchant on a tall stone
// plinth at Place Denfert-Rochereau (a scaled echo of Bartholdi's Belfort
// lion). A bespoke statue hero: a big reclining beast in verdigris on an ashlar
// pedestal in a roundabout. 1×1.
// =====================================================================
function lionDeBelfortTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const ST = hex('#cabfa6'); // ashlar plinth
  const LIONL = lit(COPPER, 0.16); // sun-lit verdigris
  const LIOND = shaded(COPPER, 0.08);
  const u = 0.5, v = 0.5;
  iso.shadow(u - 0.34, v - 0.22, u + 0.34, v + 0.34, 0.22, 0.24);
  // grass roundabout
  iso.box(u - 0.44, v - 0.44, u + 0.44, v + 0.44, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // the tall stone pedestal (the lion sits high so it reads as a monument)
  iso.box(u - 0.27, v - 0.19, u + 0.27, v + 0.19, 3, 40, ST);
  iso.windowsLeft(v + 0.19, u - 0.2, u + 0.2, 14, 30, 3, alpha(shaded(ST, 0.2), 0.6), undefined); // relief panels
  iso.box(u - 0.3, v - 0.22, u + 0.3, v + 0.22, 40, 44, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  // ---- the great couchant lion in verdigris copper, oriented head-right ----
  const z = 44; // plinth top
  const P = (du: number, dv: number, dz: number): Pt => iso.P(u + du, v + dv, z + dz);
  // the long body barrel (haunch left, shoulders right), drawn as a big mass
  iso.r.poly(
    [P(-0.2, 0.13, 0), P(0.16, 0.13, 0), P(0.2, 0.0, 24), P(0.04, -0.02, 30), P(-0.18, 0.0, 22)],
    LIOND,
    LIONL,
  );
  // the lit upper flank
  iso.r.poly([P(-0.16, 0.0, 22), P(0.04, -0.02, 30), P(0.18, -0.02, 24), P(0.14, -0.06, 22)], LIONL);
  iso.r.polyline([P(-0.2, 0.13, 0), P(-0.18, 0.0, 22), P(0.04, -0.02, 30), P(0.2, 0.0, 24), P(0.16, 0.13, 0)], INK_W * 0.8, INK);
  // the maned head, raised and gazing out to the right
  const hd = P(0.2, -0.06, 30);
  iso.r.poly(
    [[hd[0] - 7 * RES, hd[1] + 6 * RES], [hd[0] + 2 * RES, hd[1] + 7 * RES], [hd[0] + 8 * RES, hd[1] - 2 * RES], [hd[0] + 5 * RES, hd[1] - 12 * RES], [hd[0] - 6 * RES, hd[1] - 10 * RES]],
    LIONL,
    LIOND,
  );
  iso.r.polyline([[hd[0] - 7 * RES, hd[1] + 6 * RES], [hd[0] - 6 * RES, hd[1] - 10 * RES], [hd[0] + 5 * RES, hd[1] - 12 * RES], [hd[0] + 8 * RES, hd[1] - 2 * RES]], INK_W * 0.7, INK);
  // muzzle jutting forward
  iso.r.poly([[hd[0] + 6 * RES, hd[1] - 1 * RES], [hd[0] + 11 * RES, hd[1] + 1 * RES], [hd[0] + 8 * RES, hd[1] + 5 * RES]], LIOND);
  // the two forepaws stretched out in front (the couchant pose)
  for (const dv of [0.02, 0.12]) {
    iso.r.line(P(0.04, dv, 2), P(0.22, dv - 0.04, 3), 3.2 * RES, dv > 0.07 ? LIOND : LIONL);
  }
  // the tail curling along the haunch
  iso.r.polyline([P(-0.18, 0.1, 4), P(-0.24, 0.04, 14), P(-0.18, -0.02, 20)], 1.6 * RES, LIOND);
  iso.glint([hd[0] + 2 * RES, hd[1] - 4 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// HÔTEL DE SENS — a rare medieval (flamboyant-gothic) Paris mansion: a stone
// body with a turreted gate, a stair tower, dormered steep roof and corner
// bartizans. 2×2.
// =====================================================================
function hotelDeSensTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const ST = hex('#c7bca2');
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 42, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.12), { ink: false });
  // dormered steep slate roof
  iso.gable(u0, v0, u1, v1, 42, 24, 'u', SLATE, ST);
  for (const du of [u0 + 0.3, u1 - 0.3]) {
    const d = iso.P(du, v1, 50);
    iso.r.poly([[d[0] - 3 * RES, d[1]], [d[0] + 3 * RES, d[1]], [d[0] + 3 * RES, d[1] - 7 * RES], [d[0], d[1] - 11 * RES], [d[0] - 3 * RES, d[1] - 7 * RES]], lighten(ST, 0.06));
  }
  // a tall round stair-tower with a conical roof + an entrance turret
  for (const [cu, cv, h] of [[u1 - 0.16, v1 - 0.16, 70], [u0 + 0.14, v1 - 0.1, 54]] as const) {
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 0, h, ST);
    const apex = iso.P(cu, cv, h + 26);
    const c0 = iso.P(cu - 0.12, cv + 0.12, h);
    const c1 = iso.P(cu + 0.12, cv + 0.12, h);
    const c2 = iso.P(cu + 0.12, cv - 0.12, h);
    iso.r.poly([c0, c1, apex], shaded(SLATE, 0.06));
    iso.r.poly([c1, c2, apex], lit(SLATE, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// HÔTEL PARTICULIER — a grand Parisian classical town-mansion: a stone corps-
// de-logis between two wings round a cour d'honneur, a mansard roof, a central
// frontispiece + pediment. Serves the many placed hôtels. 2×2.
// =====================================================================
function hotelParticulierTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // main range (set back) + two short wings forming a court toward the viewer
  iso.box(u0, v0, u1, v0 + 0.7, 0, 40, LIME);
  iso.box(u0, v0 + 0.7, u0 + 0.3, v1, 0, 36, LIME);
  iso.box(u1 - 0.3, v0 + 0.7, u1, v1, 0, 36, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(LIME, 0.12), { ink: false });
  // windows
  iso.windowsRight(u1, v0 + 0.74, v1 - 0.04, 10, 30, 4, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(v0 + 0.7, u0 + 0.06, u1 - 0.06, 10, 34, 8, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // steep zinc mansard roofs
  iso.gable(u0, v0, u1, v0 + 0.7, 40, 14, 'u', ZINC, LIME);
  iso.hip(u0 - 0.02, v0 + 0.7, u0 + 0.32, v1, 36, 10, ZINC);
  iso.hip(u1 - 0.32, v0 + 0.7, u1 + 0.02, v1, 36, 10, ZINC);
  // central frontispiece + pediment on the main range
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.22, v0 + 0.62, cx + 0.22, v0 + 0.72, 0, 44, lighten(LIME, 0.04));
  colonnade(iso, v0 + 0.72, cx - 0.18, cx + 0.18, 8, 40, 4, COLORS.white);
  pediment(iso, v0 + 0.72, cx - 0.2, cx + 0.2, 44, 9, LIME);
  return iso.build();
}

// =====================================================================
// PORTE / triumphal gate — reuse archTile (the lesser triumphal gates).
// =====================================================================

// =====================================================================
// ROUND 2 — the next batch of bespoke Paris heroes (placed-name targets from
// src/data/cities/paris.ts that round 1 left on the archetype fabric). The W5
// hero-table fix resolves a bespoke hero for EVERY named place (not only
// landmark:true), so each of these renders the moment its `match` hits its
// placed name. Distinctive silhouettes first (windmills, a circus rotunda, the
// Ledoux toll-rotunda, museum drums, a Belle-Époque theatre…), then a small
// FAMILY of distinct hôtel-particulier draws spread across the ~40 placed
// hôtels so the Marais/Faubourg mansions read varied, not stamped.
// =====================================================================

const BRICKR = hex('#9c5640'); // Paris industrial red brick (Cirque, halles)
const BRICKR_D = hex('#7c4232');
const SAILW = hex('#d8cdb4'); // weathered windmill sail canvas / timber
const CONCR = hex('#b8b2a4'); // raw board-marked concrete (memorial, modernist)
const GLASSY = COLORS.glassSky;

// =====================================================================
// MOULIN (windmill) — a Montmartre guinguette windmill: a stout round/square
// stone-and-timber tower-mill on a green mound, capped by a turning cap, with
// the four great lattice SAILS (the croix) at a jaunty angle and a stage/
// gallery hut at its foot. Serves Moulin de la Galette + Moulin de la Charité
// (Radet). The sails ARE the silhouette. 2×2 with headroom. `gallery` adds the
// raised dance-hall deck of the Galette. 2×2.
// =====================================================================
function moulinTile(seed: number, gallery: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ST = hex('#cdbfa2');
  const TIMB = hex('#6f4a33');
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a small green hillock the mill sits on (Montmartre's butte)
  iso.box(u0 - 0.34, v0 - 0.34, u1 + 0.34, v1 + 0.34, 0, 6, shaded(COLORS.grass, 0.1), { ink: false });
  // an optional low timber gallery/dance-hall deck wrapping the foot (Galette)
  if (gallery) {
    iso.box(u0 - 0.28, v0 - 0.28, u1 + 0.28, v1 + 0.28, 6, 20, lighten(ST, 0.02));
    iso.hip(u0 - 0.3, v0 - 0.3, u1 + 0.3, v1 + 0.3, 20, 8, SLATE);
    // little lit windows of the guinguette
    iso.windowsLeft(v1 + 0.28, u0 - 0.2, u1 + 0.2, 8, 17, 7, alpha(COLORS.glassLit, 0.7), TIMB);
  }
  // the tapering round mill body (drawn as a battered stone drum), tall enough
  // to lift the sail-cross clear of the surrounding mansard fabric
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  const bz0 = gallery ? 18 : 6;
  const bodyH = 88;
  const [bx, byB] = iso.P(cx, cy + 0.3, 0);
  const BR = 0.32 * (CELL_W / 2);
  const drum = (z: number, s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([bx + Math.cos(a) * BR * s, byB - z * RES + Math.sin(a) * BR * s * 0.5]);
    }
    return pts;
  };
  // body wall as a tapered band (wide base → narrow top)
  iso.r.poly([...drum(bz0, 1), ...drum(bodyH, 0.72).reverse()], ST, shaded(ST, 0.16));
  iso.r.poly(drum(bodyH, 0.72), lit(ST, 0.04));
  iso.r.polyline(drum(bz0, 1).slice(0, 13), INK_W * 0.7, INK);
  // a couple of stone window slits + a door
  for (const fz of [26, 50]) {
    const [wx, wy] = [bx + BR * 0.5, byB - fz * RES + BR * 0.34];
    iso.r.rect(wx - 1.4 * RES, wy - 3 * RES, wx + 1.4 * RES, wy + 1 * RES, alpha(COLORS.glassDark, 0.85));
  }
  // the turning cap (a domed timber bonnet)
  const cap = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      pts.push([bx + Math.cos(a) * BR * 0.76 * s, byB - bodyH * RES - Math.sin(a) * 16 * RES * s]);
    }
    return pts;
  };
  iso.r.poly(cap(1), shaded(TIMB, 0.05), lit(TIMB, 0.08));
  iso.r.polyline(cap(1), INK_W * 0.7, INK);
  // ---- the four great SAILS: a bold cross of latticed canvas frames ----
  const hubX = bx + BR * 0.4;
  const hubY = byB - (bodyH - 4) * RES;
  const SAIL = 42 * RES; // long arms — the cross must dominate the silhouette
  const WIDTH = 8 * RES; // broad sail-cloth
  const ang = 0.5; // jaunty tilt of the cross
  for (let k = 0; k < 4; k++) {
    const a = ang + (k * Math.PI) / 2;
    const tx = hubX + Math.cos(a) * SAIL;
    const ty = hubY + Math.sin(a) * SAIL;
    const px = Math.cos(a + Math.PI / 2) * WIDTH;
    const py = Math.sin(a + Math.PI / 2) * WIDTH;
    // sail-cloth: a broad parallelogram on the leading side of the spar
    iso.r.poly(
      [[hubX, hubY], [tx, ty], [tx + px, ty + py], [hubX + px * 0.5, hubY + py * 0.5]],
      alpha(SAILW, 0.9),
      alpha(shaded(SAILW, 0.18), 0.9),
    );
    // the spar over the cloth (bold)
    iso.r.line([hubX, hubY], [tx, ty], 2 * RES, TIMB);
    // lattice ribs across the cloth
    for (const t of [0.35, 0.6, 0.85]) {
      iso.r.line(
        [hubX + (tx - hubX) * t, hubY + (ty - hubY) * t],
        [hubX + (tx - hubX) * t + px, hubY + (ty - hubY) * t + py],
        0.7 * RES,
        alpha(TIMB, 0.75),
      );
    }
    iso.r.polyline([[hubX, hubY], [tx, ty], [tx + px, ty + py]], INK_W * 0.5, alpha(INK, 0.6));
  }
  // the central hub cap
  iso.r.line([hubX - 2.4 * RES, hubY], [hubX + 2.4 * RES, hubY], 3.4 * RES, TIMB);
  iso.glint([hubX, hubY], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// CIRQUE D'HIVER — Napoleon-III permanent circus: a low 20-sided POLYGONAL
// drum of cream stone with a shallow conical zinc roof, a pilastered ring, a
// columned entrance portico under a pediment, and the little finial lantern at
// the apex. The faceted polygon ring IS the read. 2×2.
// =====================================================================
function cirqueHiverTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = hex('#ddd0b3');
  const cx = 1.0, cy = 1.0;
  iso.shadow(0.42, 0.46, 1.58, 1.54, 0.2, 0.22);
  const [px, pyB] = iso.P(cx, cy, 0);
  const R = 0.62 * (CELL_W / 2);
  const N = 20;
  const ringPts = (z: number, s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push([px + Math.cos(a) * R * s, pyB - z * RES + Math.sin(a) * R * s * 0.5]);
    }
    return pts;
  };
  // the polygon wall band
  iso.r.poly([...ringPts(0, 1), ...ringPts(34, 1).reverse()], ST, shaded(ST, 0.16));
  // pilaster ticks around the visible front half + a window per bay
  for (let i = 0; i <= N / 2; i++) {
    const a = (i / N) * Math.PI * 2;
    const wx = px + Math.cos(a) * R;
    const wyT = pyB - 30 * RES + Math.sin(a) * R * 0.5;
    const wyB = pyB - 6 * RES + Math.sin(a) * R * 0.5;
    iso.r.line([wx, wyT], [wx, wyB], 0.7 * RES, alpha(INK, 0.5));
    iso.r.rect(wx - 1.2 * RES, wyT + 2 * RES, wx + 1.2 * RES, wyB - 2 * RES, alpha(COLORS.glassDark, 0.8));
  }
  iso.r.polyline(ringPts(0, 1).slice(0, N / 2 + 2), INK_W * 0.7, INK);
  iso.r.polyline(ringPts(34, 1), INK_W * 0.6, alpha(INK, 0.7), true);
  // cornice band
  iso.r.poly([...ringPts(34, 1.02), ...ringPts(38, 1.02).reverse()], lighten(ST, 0.08));
  // shallow conical zinc roof
  const apexY = pyB - 64 * RES;
  const roofBase = ringPts(38, 0.98);
  for (let i = 0; i < N; i++) {
    const p0 = roofBase[i]!;
    const p1 = roofBase[i + 1]!;
    iso.r.poly([p0, p1, [px, apexY]], i < N / 2 ? lit(ZINC, 0.04) : shaded(ZINC, 0.06));
  }
  iso.r.polyline([roofBase[0]!, [px, apexY], roofBase[N / 2]!], INK_W * 0.5, alpha(INK, 0.6));
  // apex finial lantern
  finial(iso, px, apexY + 4 * RES, 7, GILT_HOT);
  // entrance portico jutting toward the viewer
  iso.box(cx - 0.2, cy + 0.5, cx + 0.2, cy + 0.66, 0, 26, lighten(ST, 0.03));
  colonnade(iso, cy + 0.66, cx - 0.16, cx + 0.16, 4, 24, 4, COLORS.white);
  pediment(iso, cy + 0.66, cx - 0.18, cx + 0.18, 26, 7, ST);
  return iso.build();
}

// =====================================================================
// ROTONDE DE LA VILLETTE — Ledoux's neoclassical toll-rotunda (a barrière of
// the Mur des Fermiers généraux): a square stone block pierced by arcaded
// loggias, carrying a tall CYLINDRICAL drum ringed with a colonnade, capped by
// a low saucer dome. Severe, geometric, monumental. 2×2.
// =====================================================================
function rotondeVilletteTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#d2c6ac');
  const u0 = 0.42, u1 = 1.58, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the square podium block
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(ST, 0.12), { ink: false });
  // arcaded loggia — round-headed openings down the two visible faces
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.16 + i * 0.28;
    const poly: Pt[] = [iso.P(u, v1, 8), iso.P(u, v1, 26)];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      poly.push(iso.P(u + 0.18 * t, v1, 26 + Math.sin(t * Math.PI) * 8));
    }
    poly.push(iso.P(u + 0.18, v1, 26), iso.P(u + 0.18, v1, 8));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
  }
  for (let i = 0; i < 4; i++) {
    const v = v0 + 0.16 + i * 0.28;
    const poly: Pt[] = [iso.P(u1, v, 8), iso.P(u1, v, 26)];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      poly.push(iso.P(u1, v + 0.18 * t, 26 + Math.sin(t * Math.PI) * 8));
    }
    poly.push(iso.P(u1, v + 0.18, 26), iso.P(u1, v + 0.18, 8));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.7));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 40, 45, lighten(ST, 0.07), { topC: top(ST, 0.3) });
  // the tall cylindrical drum
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  const [dx, dyB] = iso.P(cx, cy + 0.34, 0);
  const DR = 0.4 * (CELL_W / 2);
  const dz0 = 45, dz1 = 98; // taller drum so the rotunda towers over the fabric
  const drum = (z: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([dx + Math.cos(a) * DR, dyB - z * RES + Math.sin(a) * DR * 0.5]);
    }
    return pts;
  };
  iso.r.poly([...drum(dz0), ...drum(dz1).reverse()], lighten(ST, 0.02), shaded(ST, 0.14));
  // ring of columns around the visible front of the drum
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    const colx = dx + Math.cos(a) * DR;
    const colyB = dyB - dz0 * RES + Math.sin(a) * DR * 0.5;
    const colyT = dyB - dz1 * RES + Math.sin(a) * DR * 0.5;
    iso.r.line([colx, colyT], [colx, colyB], 1.2 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.1) : COLORS.white);
  }
  iso.r.polyline(drum(dz1), INK_W * 0.6, alpha(INK, 0.7), true);
  // a low saucer dome on top
  domeAt(iso, cx, cy + 0.34, dz1, DR * 0.96, 0.55, LEADG, { ribs: 6 });
  return iso.build();
}

// =====================================================================
// MUSÉE GUIMET — Belle-Époque Asian-art museum: a stone Beaux-Arts block whose
// signature is the great glazed ROTUNDA on the corner (a cylindrical library
// drum with a domed glass roof) beside a colonnaded entrance. 2×2.
// =====================================================================
function museeGuimetTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // main stone wing
  iso.box(u0, v0, u1 - 0.2, v1, 0, 44, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(LIME, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.3, 14, 38, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.gable(u0, v0, u1 - 0.2, v1, 44, 10, 'u', ZINC, LIME);
  // entrance colonnade on the front
  colonnade(iso, v1, u0 + 0.12, u1 - 0.42, 8, 40, 7, COLORS.white);
  // the corner glazed rotunda (the Guimet read)
  const cx = u1 - 0.18, cy = v0 + 0.4;
  const [dx, dyB] = iso.P(cx, cy, 0);
  const DR = 0.26 * (CELL_W / 2);
  const drumZ = 52;
  const drum = (z: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([dx + Math.cos(a) * DR, dyB - z * RES + Math.sin(a) * DR * 0.5]);
    }
    return pts;
  };
  iso.r.poly([...drum(0), ...drum(drumZ).reverse()], lighten(LIME, 0.03), shaded(LIME, 0.14));
  // tall round-headed glazing around the drum
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    const gx = dx + Math.cos(a) * DR * 0.96;
    const gyB = dyB - 10 * RES + Math.sin(a) * DR * 0.5;
    const gyT = dyB - (drumZ - 6) * RES + Math.sin(a) * DR * 0.5;
    iso.r.line([gx, gyT], [gx, gyB], 1.4 * RES, alpha(GLASSY, 0.7));
  }
  iso.r.polyline(drum(drumZ), INK_W * 0.6, alpha(INK, 0.7), true);
  // the glass cupola
  domeAt(iso, cx, cy, drumZ, DR * 0.98, 0.9, GLASSY, { ribs: 7, bulb: true });
  return iso.build();
}

// =====================================================================
// THÉÂTRE (Belle-Époque / Art-Deco playhouse) — a slim stone music-hall front:
// a glazed marquee canopy, a tall arched first-floor loggia window, a sculpted
// attic and a little corner cupola. Serves Théâtre Daunou + Musée Grévin (both
// boulevard show-fronts). `deco` flattens it to Art-Deco geometry. 2×2.
// =====================================================================
function theatreTile(seed: number, deco: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = deco ? hex('#d9cdb6') : hex('#e0d6bd');
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, deco ? 66 : 60, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.12), { ink: false });
  // a glazed marquee canopy over the entrance
  iso.box(u0 + 0.06, v1, u1 - 0.06, v1 + 0.12, 16, 19, COPPER, { ink: false });
  iso.r.poly(
    [iso.P(u0 + 0.06, v1 + 0.12, 16), iso.P(u1 - 0.06, v1 + 0.12, 16), iso.P(u1 - 0.06, v1 + 0.12, 8), iso.P(u0 + 0.06, v1 + 0.12, 8)],
    alpha(COLORS.glassLit, 0.6),
  );
  // tall arched loggia windows on the first floor
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.18 + i * 0.32;
    if (deco) {
      iso.r.poly([iso.P(u, v1, 24), iso.P(u + 0.18, v1, 24), iso.P(u + 0.18, v1, 52), iso.P(u, v1, 52)], alpha(COLORS.glassLit, 0.55));
    } else {
      const poly: Pt[] = [iso.P(u, v1, 24), iso.P(u, v1, 46)];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        poly.push(iso.P(u + 0.18 * t, v1, 46 + Math.sin(t * Math.PI) * 8));
      }
      poly.push(iso.P(u + 0.18, v1, 46), iso.P(u + 0.18, v1, 24));
      iso.r.poly(poly, alpha(COLORS.glassLit, 0.55));
    }
  }
  // sculpted attic / cornice
  const bodyTop = deco ? 66 : 60;
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyTop, bodyTop + 6, lighten(ST, 0.07), { topC: top(ST, 0.3) });
  if (deco) {
    // a stepped Art-Deco crown (a ziggurat tower over the corner)
    iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, bodyTop + 6, bodyTop + 22, ST);
    iso.box(u0 + 0.34, v0 + 0.34, u1 - 0.34, v1 - 0.34, bodyTop + 22, bodyTop + 34, lighten(ST, 0.05));
    const ft = iso.P((u0 + u1) / 2, (v0 + v1) / 2, bodyTop + 34);
    iso.r.line(ft, [ft[0], ft[1] - 6 * RES], 1.2 * RES, GILT_HOT);
  } else {
    // a tall corner cupola + a gilt finial group
    const tu = u1 - 0.16, tv = v0 + 0.2;
    iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, bodyTop + 6, bodyTop + 24, ST);
    domeAt(iso, tu, tv, bodyTop + 24, 0.14 * (CELL_W / 2), 1.2, COPPER, { ribs: 4, bulb: true });
    const ft = iso.P(u0 + 0.3, v1, bodyTop + 12);
    iso.r.poly([[ft[0] - 3 * RES, ft[1] + 2 * RES], [ft[0] + 3 * RES, ft[1] + 2 * RES], [ft[0], ft[1] - 6 * RES]], GILT);
  }
  return iso.build();
}

// =====================================================================
// FONTAINE / monumental fountain-grotto — a Medici-style baroque grotto: a
// rusticated stone aedicule (a tall round-arched niche between paired columns
// under a pediment) with a basin of glowing water at its foot. Serves Fontaine
// Médicis + Maison du Fontainier (the water-house). 1×1.
// =====================================================================
function fontaineTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const ST = hex('#c9bda2');
  const u = 0.5, v = 0.5;
  iso.shadow(0.18, 0.24, 0.82, 0.8, 0.18, 0.22);
  // long basin of water in front
  iso.box(u - 0.42, v + 0.04, u + 0.42, v + 0.42, 0, 4, alpha(COLORS.glassSky, 0.7), { ink: false });
  iso.r.poly([iso.P(u - 0.42, v + 0.42, 4), iso.P(u + 0.42, v + 0.42, 4), iso.P(u + 0.42, v + 0.42, 0), iso.P(u - 0.42, v + 0.42, 0)], shaded(ST, 0.1));
  // the rusticated aedicule wall
  iso.box(u - 0.36, v - 0.36, u + 0.36, v + 0.04, 4, 44, ST);
  // the tall round-arched central niche (dark grotto)
  const poly: Pt[] = [iso.P(u - 0.16, v + 0.04, 8), iso.P(u - 0.16, v + 0.04, 30)];
  for (let j = 0; j <= 10; j++) {
    const t = j / 10;
    poly.push(iso.P(u - 0.16 + 0.32 * t, v + 0.04, 30 + Math.sin(t * Math.PI) * 12));
  }
  poly.push(iso.P(u + 0.16, v + 0.04, 30), iso.P(u + 0.16, v + 0.04, 8));
  iso.r.poly(poly, alpha(SHADOW, 0.5));
  // paired flanking columns
  for (const cu of [u - 0.26, u + 0.26]) {
    iso.r.poly(
      [iso.P(cu - 0.03, v + 0.04, 42), iso.P(cu + 0.03, v + 0.04, 42), iso.P(cu + 0.03, v + 0.04, 6), iso.P(cu - 0.03, v + 0.04, 6)],
      COLORS.white,
    );
  }
  // entablature + pediment
  iso.box(u - 0.4, v - 0.4, u + 0.4, v + 0.06, 44, 49, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  pediment(iso, v + 0.06, u - 0.34, u + 0.34, 49, 11, ST);
  iso.glint(iso.P(u, v + 0.3, 2), 2 * RES);
  return iso.build();
}

// =====================================================================
// MÉMORIAL DES MARTYRS DE LA DÉPORTATION — Pingusson's austere modern memorial
// at the eastern tip of the Île de la Cité: a low raw-CONCRETE bastion set into
// the ground, a narrow slit-stair descending between angular walls, a single
// barred aperture to the river. Deliberately stark — the silhouette is a low,
// sharp concrete prism, NOT a monument. 1×1.
// =====================================================================
function memorialTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 30 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(0.16, 0.2, 0.84, 0.84, 0.16, 0.24);
  // a paved riverside terrace
  iso.box(u - 0.44, v - 0.44, u + 0.44, v + 0.44, 0, 3, shaded(CONCR, 0.06), { ink: false });
  // two low angular concrete walls flanking a sunken slit
  iso.box(u - 0.36, v - 0.3, u - 0.06, v + 0.36, 3, 22, CONCR);
  iso.box(u + 0.06, v - 0.3, u + 0.36, v + 0.36, 3, 22, lighten(CONCR, 0.03));
  // the descending stair-slit between them (dark)
  iso.r.poly([iso.P(u - 0.06, v + 0.36, 3), iso.P(u + 0.06, v + 0.36, 3), iso.P(u + 0.06, v - 0.3, 14), iso.P(u - 0.06, v - 0.3, 14)], alpha(SHADOW, 0.55));
  // a single barred aperture facing the viewer (the cell window to the Seine)
  const [wx, wy] = iso.P(u + 0.36, v + 0.06, 14);
  iso.r.rect(wx - 2 * RES, wy - 5 * RES, wx + 2 * RES, wy - 1 * RES, alpha(SHADOW, 0.6));
  for (const bx of [-1, 0, 1] as const) {
    iso.r.line([wx + bx * RES, wy - 5 * RES], [wx + bx * RES, wy - 1 * RES], 0.5 * RES, alpha(INK, 0.6));
  }
  // a thin bronze inscription band
  iso.r.line(iso.P(u - 0.34, v + 0.36, 18), iso.P(u + 0.34, v + 0.36, 18), 1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// PYRAMIDE (small glass pyramid) — a freestanding modern glass pyramid pavilion
// (a sibling of the Louvre's, placed in the east as its own landmark): a clean
// glazed tetrahedron of glowing lattice glass on a dark granite base, smaller
// and slimmer than the Louvre court. 1×1.
// =====================================================================
function pyramidePavilionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const u = 0.5, v = 0.5;
  iso.shadow(0.2, 0.24, 0.8, 0.8, 0.2, 0.24);
  // granite plaza base
  iso.box(u - 0.42, v - 0.42, u + 0.42, v + 0.42, 0, 5, shaded(COLORS.steel, 0.1), { ink: false });
  // the glass pyramid
  const apex = iso.P(u, v, 56);
  const c0 = iso.P(u - 0.34, v + 0.34, 5); // front
  const c1 = iso.P(u + 0.34, v + 0.34, 5);
  const c2 = iso.P(u + 0.34, v - 0.34, 5);
  const c3 = iso.P(u - 0.34, v - 0.34, 5);
  iso.r.poly([c0, c1, apex], alpha(lighten(GLASSY, 0.08), 0.9)); // SE lit
  iso.r.poly([c1, c2, apex], alpha(GLASSY, 0.82)); // E
  iso.r.poly([c3, c0, apex], alpha(shaded(GLASSY, 0.06), 0.85)); // SW shade
  // lattice mullions
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    iso.r.line([c0[0] + (apex[0] - c0[0]) * t, c0[1] + (apex[1] - c0[1]) * t], [c1[0] + (apex[0] - c1[0]) * t, c1[1] + (apex[1] - c1[1]) * t], 0.5 * RES, alpha(COLORS.white, 0.5));
    iso.r.line([c1[0] + (apex[0] - c1[0]) * t, c1[1] + (apex[1] - c1[1]) * t], [c2[0] + (apex[0] - c2[0]) * t, c2[1] + (apex[1] - c2[1]) * t], 0.5 * RES, alpha(COLORS.white, 0.4));
  }
  iso.r.polyline([c3, c0, c1, c2], INK_W * 0.6, alpha(INK, 0.7));
  iso.r.line(c0, apex, INK_W * 0.7, alpha(INK, 0.8));
  iso.r.line(c1, apex, INK_W * 0.6, alpha(INK, 0.7));
  iso.glint([apex[0], apex[1] + 6 * RES], 2.4 * RES);
  return iso.build();
}

// =====================================================================
// HALLE INDUSTRIELLE — a 19th-C iron-and-brick works hall (the Manufacture des
// œillets / Bercy wine warehouses / artist-studio sheds): a long low red-brick
// range with tall round-arched windows, a saw-tooth or twin-gable glazed roof
// and a brick chimney/water-tower stub. `chimney` adds the stack. 3×3.
// =====================================================================
function halleIndustrielleTile(seed: number, chimney: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long brick range
  iso.box(u0, v0, u1, v1, 0, 34, BRICKR);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, BRICKR_D, { ink: false });
  // tall round-arched windows down the front
  for (let i = 0; i < 9; i++) {
    const u = u0 + 0.18 + i * 0.26;
    const poly: Pt[] = [iso.P(u, v1, 6), iso.P(u, v1, 22)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      poly.push(iso.P(u + 0.16 * t, v1, 22 + Math.sin(t * Math.PI) * 6));
    }
    poly.push(iso.P(u + 0.16, v1, 22), iso.P(u + 0.16, v1, 6));
    iso.r.poly(poly, alpha(COLORS.glassLit, 0.55));
  }
  // a brick string-course / cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 34, 38, lighten(BRICKR, 0.06), { ink: false });
  // twin glazed monitor roofs running the length
  for (const vc of [v0 + 0.55, v1 - 0.95] as const) {
    iso.box(u0 + 0.16, vc, u1 - 0.16, vc + 0.4, 38, 48, shaded(GLASSY, 0.06), { ink: false });
    for (let i = 0; i <= 12; i++) {
      const u = u0 + 0.16 + ((u1 - u0 - 0.32) * i) / 12;
      const [bx, by] = iso.P(u, vc + 0.2, 48);
      iso.r.line([bx, by], [bx, by - 8 * RES], 0.7 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : alpha(GLASSY, 0.85));
    }
    iso.gable(u0 + 0.16, vc, u1 - 0.16, vc + 0.4, 48, 6, 'u', SLATE, BRICKR);
  }
  if (chimney) {
    // a square brick chimney/water-tower stub at the rear corner
    const cu = u0 + 0.3, cv = v0 + 0.3;
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 0, 84, BRICKR);
    iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, 84, 90, BRICKR_D, { ink: false });
  }
  return iso.build();
}

// =====================================================================
// BARRIÈRE / toll-gate pavilion — a pair of monumental Doric columns or a small
// rusticated toll-house flanking the old customs road (Barrière du Trône): two
// tall stone columns on plinths carrying statues, with a low guard-pavilion
// between. 1×1. (The Colonnes du Trône echo.)
// =====================================================================
function barriereTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 160 });
  void seed;
  const ST = hex('#cdc1a6');
  const u = 0.5, v = 0.5;
  iso.shadow(0.16, 0.22, 0.84, 0.84, 0.18, 0.22);
  // low guard pavilion
  iso.box(u - 0.22, v - 0.22, u + 0.22, v + 0.22, 0, 18, ST);
  iso.hip(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 18, 8, SLATE);
  // two tall Doric columns (in front-left and back-right)
  for (const [cu, cv] of [[u - 0.3, v + 0.28], [u + 0.3, v - 0.28]] as const) {
    iso.box(cu - 0.06, cv - 0.06, cu + 0.06, cv + 0.06, 0, 6, lighten(ST, 0.06)); // plinth
    const shaftB = iso.P(cu, cv, 6);
    const shaftT = iso.P(cu, cv, 96);
    iso.r.line([shaftB[0], shaftB[1]], [shaftT[0], shaftT[1]], 3 * RES, lit(COLORS.white, 0.04));
    iso.r.line([shaftB[0] - 1.5 * RES, shaftB[1]], [shaftT[0] - 1.5 * RES, shaftT[1]], 0.6 * RES, alpha(INK, 0.4));
    // capital
    iso.r.rect(shaftT[0] - 3 * RES, shaftT[1] - 3 * RES, shaftT[0] + 3 * RES, shaftT[1], lighten(ST, 0.08));
    // a small statue on top
    iso.r.poly([[shaftT[0] - 2 * RES, shaftT[1] - 3 * RES], [shaftT[0] + 2 * RES, shaftT[1] - 3 * RES], [shaftT[0] + 1.4 * RES, shaftT[1] - 12 * RES], [shaftT[0] - 1.4 * RES, shaftT[1] - 12 * RES]], COPPER);
    iso.glint([shaftT[0], shaftT[1] - 8 * RES], 1.4 * RES);
  }
  return iso.build();
}

// =====================================================================
// MAISON MODERNE — a 20th-C modern-movement landmark house: a flat-roofed white
// volume on slender pilotis with ribbon windows and a roof terrace (Le
// Corbusier idiom — Maison Planeix), OR a glass-and-steel curtain-wall slab
// (Prouvé's Maison du Peuple). `slab` picks the metal-curtain version. 2×2.
// =====================================================================
function maisonModerneTile(seed: number, slab: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.22);
  if (slab) {
    // a steel-and-glass curtain-wall block (Maison du Peuple)
    iso.box(u0, v0, u1, v1, 0, 56, COLORS.steel);
    // glazed grid on the front
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 8, 50, 8, alpha(COLORS.glassLit, 0.6), COLORS.steel);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 8, 50, 8, alpha(GLASSY, 0.55), COLORS.steel);
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 56, 60, lighten(COLORS.steel, 0.08), { topC: top(COLORS.steel, 0.2) });
  } else {
    // a white modernist villa on pilotis (Maison Planeix)
    const WHT = hex('#e6e2d6');
    // pilotis (the lifted ground floor)
    for (const cu of [u0 + 0.08, (u0 + u1) / 2, u1 - 0.08]) {
      iso.box(cu - 0.03, v1 - 0.06, cu + 0.03, v1, 0, 14, shaded(WHT, 0.2));
    }
    // the main floating white box
    iso.box(u0, v0, u1, v1, 14, 48, WHT);
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 14, 16, shaded(WHT, 0.14), { ink: false });
    // a long ribbon window band
    iso.r.poly([iso.P(u0 + 0.08, v1, 26), iso.P(u1 - 0.08, v1, 26), iso.P(u1 - 0.08, v1, 38), iso.P(u0 + 0.08, v1, 38)], alpha(COLORS.glassDark, 0.85));
    // roof terrace parapet + a curved stair-bulkhead
    iso.box(u0, v0, u1, v1, 48, 51, lighten(WHT, 0.05), { ink: false });
    domeAt(iso, u0 + 0.4, v0 + 0.4, 51, 0.16 * (CELL_W / 2), 0.7, WHT);
  }
  return iso.build();
}

// =====================================================================
// STATUE ÉQUESTRE — a bronze equestrian monument on a tall stone plinth (the
// Henri IV statue on the Pont Neuf): a verdigris horse-and-rider raised high on
// an ashlar pedestal in a little plaza. 1×1.
// =====================================================================
function equestrianTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const ST = hex('#cabfa6');
  const u = 0.5, v = 0.5;
  iso.shadow(0.28, 0.28, 0.72, 0.72, 0.2, 0.24);
  // plaza
  iso.box(u - 0.4, v - 0.4, u + 0.4, v + 0.4, 0, 3, shaded(ST, 0.08), { ink: false });
  // the tall pedestal
  iso.box(u - 0.18, v - 0.14, u + 0.18, v + 0.14, 3, 40, ST);
  iso.r.line(iso.P(u - 0.16, v + 0.14, 22), iso.P(u + 0.16, v + 0.14, 22), 0.8 * RES, alpha(INK, 0.4));
  iso.box(u - 0.21, v - 0.17, u + 0.21, v + 0.17, 40, 44, lighten(ST, 0.08), { topC: top(ST, 0.3) });
  // ---- the bronze horse + rider on top ----
  const z = 44;
  const P = (du: number, dv: number, dz: number): Pt => iso.P(u + du, v + dv, z + dz);
  const BR = lit(COPPER, 0.12), BRD = shaded(COPPER, 0.08);
  // horse body barrel
  iso.r.poly([P(-0.1, 0.04, 6), P(0.1, 0.04, 6), P(0.12, -0.02, 18), P(-0.08, -0.02, 16)], BRD, BR);
  // four legs
  for (const du of [-0.08, -0.02, 0.04, 0.1]) iso.r.line(P(du, 0.02, 0), P(du, 0.02, 7), 1.2 * RES, BRD);
  // neck + head raised front-right, with a muzzle jutting forward
  const head = P(0.2, -0.02, 26);
  iso.r.poly([P(0.1, 0.0, 14), P(0.16, -0.02, 22), head, P(0.14, 0.0, 16)], BR);
  iso.r.poly([head, [head[0] + 3 * RES, head[1] + 1 * RES], [head[0] + 1.5 * RES, head[1] + 4 * RES]], BRD);
  // the rider on the saddle
  const riderTop = P(0.0, 0.0, 30);
  iso.r.line(P(0.0, 0.0, 18), riderTop, 1.4 * RES, BRD);
  iso.r.poly([[riderTop[0] - 1.6 * RES, riderTop[1]], [riderTop[0] + 1.6 * RES, riderTop[1]], [riderTop[0], riderTop[1] - 5 * RES]], BR);
  iso.glint([P(0.04, 0, 24)[0], P(0.04, 0, 24)[1]], 1.6 * RES);
  return iso.build();
}

// =====================================================================
// REGARD (well-house) — a tiny stone aqueduct inspection-house of the old Pré-
// Saint-Gervais/Belleville water network: a small square ashlar hut with a
// pyramidal stone roof and an iron door. Modest 1×1 — a humble historic
// landmark, drawn small and characterful. Serves the several "Regard …". 1×1.
// =====================================================================
function regardTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 40 });
  void seed;
  const ST = hex('#c6bca3');
  const u = 0.5, v = 0.5;
  iso.shadow(0.3, 0.3, 0.7, 0.72, 0.16, 0.2);
  // grass apron
  iso.box(u - 0.4, v - 0.4, u + 0.4, v + 0.4, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // the little square hut
  iso.box(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 3, 26, ST);
  // a low arched iron door on the front
  const poly: Pt[] = [iso.P(u - 0.1, v + 0.24, 5), iso.P(u - 0.1, v + 0.24, 16)];
  for (let j = 0; j <= 6; j++) {
    const t = j / 6;
    poly.push(iso.P(u - 0.1 + 0.2 * t, v + 0.24, 16 + Math.sin(t * Math.PI) * 5));
  }
  poly.push(iso.P(u + 0.1, v + 0.24, 16), iso.P(u + 0.1, v + 0.24, 5));
  iso.r.poly(poly, alpha(SLATE, 0.85));
  // a steep pyramidal stone roof + ball finial
  iso.hip(u - 0.26, v - 0.26, u + 0.26, v + 0.26, 26, 16, shaded(ST, 0.08));
  const ft = iso.P(u, v, 42);
  iso.r.line(ft, [ft[0], ft[1] - 3 * RES], 1 * RES, lighten(ST, 0.1));
  return iso.build();
}

// =====================================================================
// HÔTEL PARTICULIER variants — a small FAMILY so the ~40 placed Paris mansions
// read as DISTINCT buildings, not one stamped block. All share the corps-de-
// logis + cour d'honneur idea, but differ in massing/roof/material:
//   0 'court'   — classical entre cour et jardin (the default round-1 shape,
//                 kept via hotelParticulierTile for Pavillon de Vendôme)
//   1 'block'   — a deep urban Faubourg block, tall mansard, balconied front
//   2 'marais'  — a Marais hôtel: brick-and-stone (chaînage), steep slate, a
//                 round corner stair-tourelle (Sully/Marle idiom)
//   3 'rococo'  — a Rococo garden front: a curved central avant-corps bay + a
//                 carved cartouche pediment (Soubise/Biron idiom)
// One function, variant-switched, each visibly different in silhouette. 2×2.
// =====================================================================
function hotelVariantTile(seed: number, variant: 0 | 1 | 2 | 3): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.38, u1 = 1.62, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const STONE_BR = hex('#d6cdb6'); // brick-pink-cream for the marais variant body
  if (variant === 1) {
    // deep Faubourg block, tall zinc mansard, balconied piano nobile
    iso.box(u0, v0, u1, v1, 0, 52, LIME);
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(LIME, 0.12), { ink: false });
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 14, 30, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 34, 48, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
    // a continuous wrought balcony at the piano nobile
    iso.r.line(iso.P(u0 + 0.06, v1, 32), iso.P(u1 - 0.06, v1, 32), 1 * RES, alpha(INK, 0.5));
    iso.gable(u0, v0, u1, v1, 52, 16, 'u', ZINC, LIME);
    // dormers in the mansard
    for (const du of [u0 + 0.3, (u0 + u1) / 2, u1 - 0.3]) {
      const d = iso.P(du, v1, 58);
      iso.r.poly([[d[0] - 2.4 * RES, d[1]], [d[0] + 2.4 * RES, d[1]], [d[0] + 2.4 * RES, d[1] - 6 * RES], [d[0], d[1] - 9 * RES], [d[0] - 2.4 * RES, d[1] - 6 * RES]], lighten(LIME, 0.05));
    }
  } else if (variant === 2) {
    // Marais hôtel: brick-and-stone, steep slate, corner round stair-tourelle
    iso.box(u0, v0, u1, v1, 0, 40, STONE_BR);
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(STONE_BR, 0.12), { ink: false });
    // stone quoin chaining at the corners (vertical light bands)
    for (const cu of [u0 + 0.02, u1 - 0.06]) {
      iso.r.poly([iso.P(cu, v1, 8), iso.P(cu + 0.05, v1, 8), iso.P(cu + 0.05, v1, 40), iso.P(cu, v1, 40)], lighten(LIME, 0.06));
    }
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 12, 34, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.gable(u0, v0, u1, v1, 40, 24, 'u', SLATE, STONE_BR);
    // the round corner stair-tourelle with a tall conical roof
    const cu = u1 - 0.14, cv = v1 - 0.14;
    iso.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, 0, 54, STONE_BR);
    const apex = iso.P(cu, cv, 86);
    const c0 = iso.P(cu - 0.12, cv + 0.12, 54);
    const c1 = iso.P(cu + 0.12, cv + 0.12, 54);
    const c2 = iso.P(cu + 0.12, cv - 0.12, 54);
    iso.r.poly([c0, c1, apex], shaded(SLATE, 0.06));
    iso.r.poly([c1, c2, apex], lit(SLATE, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  } else if (variant === 3) {
    // Rococo garden front: a curved central avant-corps bay + carved pediment
    iso.box(u0, v0, u1, v1, 0, 44, LIME);
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(LIME, 0.12), { ink: false });
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 12, 36, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.gable(u0, v0, u1, v1, 44, 12, 'u', ZINC, LIME);
    // the bowed central avant-corps (a shallow curved bay pushing toward viewer)
    const cx = (u0 + u1) / 2;
    const [bx, byB] = iso.P(cx, v1, 0);
    const BR = 0.28 * (CELL_W / 2);
    const bay = (z: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (0.1 + 0.8 * (i / 10));
        pts.push([bx + Math.cos(a) * BR, byB - z * RES + Math.sin(a) * BR * 0.32]);
      }
      return pts;
    };
    iso.r.poly([...bay(6), ...bay(46).reverse()], lighten(LIME, 0.04), shaded(LIME, 0.1));
    iso.r.polyline(bay(46), INK_W * 0.5, alpha(INK, 0.6));
    // carved cartouche pediment crowning the bay
    pediment(iso, v1, cx - 0.22, cx + 0.22, 46, 12, LIME);
    iso.glint(iso.P(cx, v1, 50), 2 * RES);
  } else {
    // 'court' — delegate to the round-1 classical entre-cour-et-jardin shape
    return hotelParticulierTile(seed);
  }
  return iso.build();
}

// =====================================================================
// PAGODE (Maison Loo) — the startling red Chinese PAGODA on the rue de
// Courcelles (C.T. Loo's pagoda, 1926): a stack of two-or-three diminishing
// tiers each with an up-curled (sweeping-eave) tiled roof in vermilion-and-gold
// over a deep-red lacquer body, crowned by a finial. A genuine Paris oddity —
// bespoke. 2×2.
// =====================================================================
function pagodeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const REDLAC = hex('#a83a2e'); // Chinese-red lacquer wall
  const ROOFT = hex('#c2462f'); // vermilion tile
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // an up-curled tiered roof at height z over a footprint inset s
  const tier = (s: number, z: number, rise: number): void => {
    const a0 = u0 + s, a1 = u1 - s, b0 = v0 + s, b1 = v1 - s;
    const am = (a0 + a1) / 2, bm = (b0 + b1) / 2;
    // four roof planes meeting at the apex, eaves flicked UP at the corners
    const cFL = iso.P(a0 - 0.06, b1 + 0.06, z + rise * 0.18); // flicked corners
    const cFR = iso.P(a1 + 0.06, b1 + 0.06, z + rise * 0.18);
    const cBR = iso.P(a1 + 0.06, b0 - 0.06, z + rise * 0.18);
    const cBL = iso.P(a0 - 0.06, b0 - 0.06, z + rise * 0.18);
    const apex = iso.P(am, bm, z + rise);
    iso.r.poly([cBL, cFL, apex], shaded(ROOFT, 0.06)); // left
    iso.r.poly([cFL, cFR, apex], lit(ROOFT, 0.05)); // front-left lit
    iso.r.poly([cFR, cBR, apex], lit(ROOFT, 0.1)); // right
    iso.r.polyline([cFL, cFR, cBR], INK_W * 0.6, INK);
    iso.r.polyline([cBL, cFL, apex], INK_W * 0.5, alpha(INK, 0.7));
    iso.r.line([cFR[0], cFR[1]], [apex[0], apex[1]], INK_W * 0.5, alpha(INK, 0.7));
    // a gilt ridge accent along the front eave
    iso.r.line(cFL, cFR, 1 * RES, GILT_HOT);
  };
  // ground tier body
  iso.box(u0, v0, u1, v1, 0, 30, REDLAC);
  // lattice shop-front windows
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 26, 5, alpha(GILT, 0.5), hex('#7c2a22'));
  tier(0.0, 30, 16);
  // middle tier (inset)
  iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, 38, 60, REDLAC);
  iso.windowsLeft(v1 - 0.16, u0 + 0.22, u1 - 0.22, 44, 56, 4, alpha(GILT, 0.5), hex('#7c2a22'));
  tier(0.16, 60, 14);
  // top tier (smaller) + finial
  iso.box(u0 + 0.32, v0 + 0.32, u1 - 0.32, v1 - 0.32, 66, 84, REDLAC);
  tier(0.32, 84, 12);
  const ft = iso.P((u0 + u1) / 2, (v0 + v1) / 2, 96);
  iso.r.line(ft, [ft[0], ft[1] - 8 * RES], 1.4 * RES, GILT_HOT);
  iso.r.line([ft[0] - 2 * RES, ft[1] - 5 * RES], [ft[0] + 2 * RES, ft[1] - 5 * RES], 1 * RES, GILT_HOT);
  iso.glint([ft[0], ft[1] - 6 * RES], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// ABBAYE (small medieval abbey/church) — a modest Romanesque abbey: a stone
// nave with a steep roof, small round-arched windows, an apse and a squat
// crossing bell-tower with a pyramidal cap. Serves Abbaye de Saint-Maur. 2×2.
// =====================================================================
function abbayeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const ST = hex('#cabfa6'); // pale ashlar
  const ROOF = hex('#6a5746');
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long nave
  iso.box(u0, v0 + 0.2, u1, v1, 0, 36, ST);
  iso.gable(u0, v0 + 0.2, u1, v1, 36, 22, 'u', ROOF, ST);
  // small round-arched windows down the nave flank
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.12 + i * 0.2;
    const poly: Pt[] = [iso.P(u, v1, 10), iso.P(u, v1, 22)];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      poly.push(iso.P(u + 0.08 * t, v1, 22 + Math.sin(t * Math.PI) * 4));
    }
    poly.push(iso.P(u + 0.08, v1, 22), iso.P(u + 0.08, v1, 10));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.85));
  }
  // a rounded apse at the rear (a half-drum)
  const [ax, ayB] = iso.P((u0 + u1) / 2, v0 + 0.2, 0);
  const AR = 0.3 * (CELL_W / 2);
  const apse = (z: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      pts.push([ax + Math.cos(a) * AR, ayB - z * RES + Math.sin(a) * AR * 0.5]);
    }
    return pts;
  };
  iso.r.poly([...apse(0), ...apse(30).reverse()], ST, shaded(ST, 0.14));
  // the squat crossing bell-tower with a pyramidal cap
  const tu = u1 - 0.22, tv = v0 + 0.42;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 0, 58, ST);
  // belfry openings
  for (const fz of [44]) {
    const [wx, wy] = iso.P(tu, tv + 0.16, fz);
    iso.r.rect(wx - 1.4 * RES, wy - 6 * RES, wx + 1.4 * RES, wy, alpha(SHADOW, 0.6));
  }
  const apex = iso.P(tu, tv, 84);
  const c0 = iso.P(tu - 0.16, tv + 0.16, 58);
  const c1 = iso.P(tu + 0.16, tv + 0.16, 58);
  const c2 = iso.P(tu + 0.16, tv - 0.16, 58);
  iso.r.poly([c0, c1, apex], shaded(ROOF, 0.06));
  iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
  iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  return iso.build();
}

// =====================================================================
// FAMOUS-ICON ROUND (enrichment wave): the world-famous Paris landmarks that
// were absent from the placed `named` list. Each a bespoke draw + bespoke light.
// =====================================================================

// =====================================================================
// PANTHÉON — Soufflot's neoclassical mausoleum on the Montagne Sainte-Geneviève:
// a Greek-cross stone body fronted by a huge Corinthian portico + pediment, a
// tall colonnaded DRUM and the great ribbed LEAD-GREY dome crowned by a lantern.
// Like a grey-domed sibling of the Invalides. 2×2.
// =====================================================================
function pantheonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the cruciform stone base (windowless walls — the Panthéon's blank facades)
  iso.box(u0, v0, u1, v1, 0, 48, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(LIME, 0.12), { ink: false });
  // the great Corinthian portico across the front (the famous pronaos)
  colonnade(iso, v1, u0 + 0.12, u1 - 0.12, 10, 44, 12, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 48, 53, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  pediment(iso, v1, u0 + 0.14, u1 - 0.14, 53, 13, LIME);
  // the tall colonnaded drum over the crossing
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.04;
  iso.box(cx - 0.38, cy - 0.38, cx + 0.38, cy + 0.38, 53, 78, lighten(LIME, 0.03));
  const [drx, dryB] = iso.P(cx, cy + 0.38, 0);
  const DR = 0.4 * (CELL_W / 2);
  for (let i = 0; i <= 11; i++) {
    const a = (i / 11) * Math.PI;
    const px = drx + Math.cos(a) * DR;
    const py = dryB - 65 * RES + Math.sin(a) * DR * 0.46;
    iso.r.line([px, py - 9 * RES], [px, py + 9 * RES], 1.2 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.1) : COLORS.white);
  }
  iso.box(cx - 0.32, cy - 0.32, cx + 0.32, cy + 0.32, 78, 86, shaded(LIME, 0.06), { ink: false }); // attic balustrade ring
  // the great ribbed LEAD dome + stone lantern (no gold — a sober grey-lead read)
  const { tipX, tipY } = domeAt(iso, cx, cy, 86, DR * 0.9, 1.12, LEADG, { ribs: 8, bulb: true });
  iso.r.rect(tipX - 2.6 * RES, tipY - 13 * RES, tipX + 2.6 * RES, tipY + 1 * RES, lighten(LIME, 0.12)); // lantern
  iso.r.line([tipX, tipY - 13 * RES], [tipX, tipY - 22 * RES], 1.2 * RES, LIME_D); // finial
  iso.glint([tipX, tipY - 7 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// CENTRE POMPIDOU — Rogers & Piano high-tech: a transparent rectangular box
// with the STRUCTURE and SERVICES thrown OUTSIDE — white cross-braced frame,
// the glazed diagonal ESCALATOR tube snaking up the front, and the famous
// COLOUR-CODED ducts (blue air / green water / yellow electrics / red circulation).
// 2×2.
// =====================================================================
function pompidouTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const STEEL = hex('#dfe3e6'); // white structural steel
  const STEEL_D = hex('#b6bcc2');
  const GLASSB = hex('#7fa6c8');
  const PIPE_BLUE = hex('#3f7fd0');
  const PIPE_GREEN = hex('#3fae7a');
  const PIPE_YEL = hex('#e7c245');
  const PIPE_RED = hex('#d8533f');
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  const H = 96;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a small open piazza (the sloping Place Beaubourg) on the front
  iso.box(u0 - 0.04, v1, u1 + 0.04, v1 + 0.16, 0, 2, shaded(LIME, 0.2), { ink: false });
  // the glazed box — read as glass through a white frame
  iso.box(u0, v0, u1, v1, 0, H, alpha(GLASSB, 0.9), { topC: top(STEEL, 0.2) });
  // the white exo-structure: storey floor bands + cross-braces on the front face
  for (let f = 0; f <= 5; f++) {
    const z = (H * f) / 5;
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.4 * RES, f % 1 === 0 ? STEEL : STEEL_D);
  }
  // diagonal cross-bracing (the gerberette trusses) on the front face
  for (let i = 0; i < 5; i++) {
    const ua = u0 + (i * (u1 - u0)) / 5, ub = u0 + ((i + 1) * (u1 - u0)) / 5;
    const z0 = (H * i) / 5, z1 = (H * (i + 1)) / 5;
    iso.r.line(iso.P(ua, v1, z0), iso.P(ub, v1, z1), 0.8 * RES, alpha(STEEL, 0.8));
    iso.r.line(iso.P(ub, v1, z0), iso.P(ua, v1, z1), 0.8 * RES, alpha(STEEL, 0.8));
  }
  // the signature glazed ESCALATOR tube climbing diagonally across the front
  const tube: Pt[] = [
    iso.P(u0 + 0.06, v1 + 0.02, 4), iso.P(u1 - 0.1, v1 + 0.02, H - 6),
    iso.P(u1 - 0.02, v1 + 0.02, H - 6), iso.P(u0 + 0.14, v1 + 0.02, 4),
  ];
  iso.r.poly(tube, alpha(GLASSB, 0.95), lit(STEEL, 0.1));
  iso.r.polyline(tube, INK_W * 0.7, INK, true);
  // rungs in the tube
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    iso.r.line(
      iso.P(u0 + 0.06 + (u1 - u0 - 0.16) * t, v1 + 0.02, 4 + (H - 10) * t),
      iso.P(u0 + 0.1 + (u1 - u0 - 0.16) * t, v1 + 0.02, 4 + (H - 10) * t),
      0.6 * RES, alpha(STEEL, 0.7),
    );
  }
  // the COLOUR-CODED service ducts running up the RIGHT (rear) face — Pompidou's signature
  const pipes = [PIPE_BLUE, PIPE_GREEN, PIPE_YEL, PIPE_RED];
  for (let i = 0; i < 4; i++) {
    const v = v0 + 0.12 + i * 0.26;
    iso.box(u1 - 0.005, v - 0.04, u1 + 0.06, v + 0.04, 6, H - 4, pipes[i]!, { ink: false });
  }
  // a couple of big round duct mouths on top (the rooftop plant)
  for (const [pu, pv, col] of [[u0 + 0.3, v0 + 0.3, PIPE_BLUE], [u0 + 0.7, v0 + 0.5, STEEL_D]] as const) {
    const [mx, my] = iso.P(pu, pv, H);
    iso.r.line([mx, my - 8 * RES], [mx, my], 3 * RES, col as RGBA);
  }
  return iso.build();
}

// =====================================================================
// TOUR MONTPARNASSE — the lone 210 m bronze-black glass monolith that stands
// apart from every other Paris building: a slim slab with gently curved long
// faces, a uniform dark curtain wall and a flat plant-room crown. Slim 1×1 with
// big headroom — it spikes far above the fabric.
// =====================================================================
function montparnasseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 360 });
  void seed;
  const GLASS = hex('#2c333f'); // bronze-smoked near-black glass
  const GLASS_L = hex('#454e5d');
  const MULL = hex('#1c222b');
  const u = 0.5, v = 0.52, b = 0.26, H = 250;
  iso.shadow(u - b, v - b * 0.4, u + b, v + b, 0.5, 0.3);
  // a low granite plaza base
  iso.box(u - 0.34, v - 0.34, u + 0.34, v + 0.34, 0, 8, shaded(hex('#5a5f66'), 0.1), { ink: false });
  // the great dark slab — long axis along v so the broad curved face reads
  iso.box(u - b, v - b * 0.62, u + b, v + b * 0.62, 8, H, GLASS, {
    leftC: shaded(GLASS, 0.18),
    rightC: GLASS_L,
    topC: shaded(GLASS, 0.28),
  });
  // dense vertical mullions on both visible faces (the curtain-wall grid)
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    iso.r.line(iso.P(u - b + 2 * b * t, v + b * 0.62, 10), iso.P(u - b + 2 * b * t, v + b * 0.62, H - 4), 0.5 * RES, alpha(MULL, 0.55));
  }
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    iso.r.line(iso.P(u + b, v - b * 0.62 + 1.24 * b * t, 10), iso.P(u + b, v - b * 0.62 + 1.24 * b * t, H - 4), 0.5 * RES, alpha(MULL, 0.45));
  }
  // faint horizontal floor bands
  for (let f = 1; f < 16; f++) {
    const z = 10 + ((H - 14) * f) / 16;
    iso.r.line(iso.P(u - b, v + b * 0.62, z), iso.P(u + b, v + b * 0.62, z), 0.4 * RES, alpha(GLASS_L, 0.3));
  }
  // a subtle warm sky-reflection catch down the lit (right) face
  iso.gleam(iso.P(u + b, v - b * 0.5, H - 20), iso.P(u + b, v + b * 0.5, 40), 0.9 * RES);
  // flat plant-room crown + a tiny mast
  iso.box(u - b * 0.92, v - b * 0.56, u + b * 0.92, v + b * 0.56, H, H + 10, MULL, { ink: false });
  const [tx, ty] = iso.P(u, v, H + 10);
  iso.r.line([tx, ty], [tx, ty - 14 * RES], 1 * RES, alpha(COLORS.white, 0.7));
  return iso.build();
}

// =====================================================================
// HÔTEL DE VILLE — Ballu's Renaissance-Revival city hall: a long ornate stone
// facade studded with statue niches and dormers under steep blue-grey roofs,
// rising at the centre to a tall pavilion carrying the great CLOCK and an
// ornate roof-lantern, with matching corner pavilions + their own roofs. 2×2.
// =====================================================================
function hotelDeVilleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const ROOF = hex('#46566b'); // bluish slate
  const u0 = 0.32, u1 = 1.68, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the long ornate stone body
  iso.box(u0, v0, u1, v1, 0, 52, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 11, shaded(LIME, 0.12), { ink: false });
  // two storeys of tall arched windows + a statue niche rhythm on the front
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 14, 28, 9, alpha(COLORS.glassLit, 0.55), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 32, 46, 9, alpha(COLORS.glassLit, 0.5), COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 52, 56, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  // steep slate mansard with dormers over the wings
  iso.gable(u0, v0, u1, v1, 56, 18, 'u', ROOF, LIME);
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.16 + i * 0.24;
    const [dx, dy] = iso.P(u, v1, 60);
    iso.r.poly([[dx - 2 * RES, dy], [dx + 2 * RES, dy], [dx + 2 * RES, dy - 5 * RES], [dx, dy - 8 * RES], [dx - 2 * RES, dy - 5 * RES]], lit(ROOF, 0.08));
    iso.r.rect(dx - 1 * RES, dy - 4 * RES, dx + 1 * RES, dy, alpha(COLORS.glassDark, 0.8));
  }
  // corner pavilions, taller, with their own steep pyramidal roofs
  for (const cu of [u0 + 0.14, u1 - 0.14] as const) {
    iso.box(cu - 0.16, v1 - 0.34, cu + 0.16, v1, 0, 64, LIME);
    iso.hip(cu - 0.18, v1 - 0.36, cu + 0.18, v1 + 0.02, 64, 18, ROOF);
    const ap = iso.P(cu, v1 - 0.17, 82);
    iso.r.line(ap, [ap[0], ap[1] - 4 * RES], 0.9 * RES, GILT);
  }
  // the dominant CENTRAL pavilion — a tall ornate stone mass that towers over
  // the wings (so the city hall reads as a civic monument, not just fabric)
  const cx = (u0 + u1) / 2, cy = v1 - 0.22;
  iso.box(cx - 0.24, cy - 0.24, cx + 0.24, cy, 0, 98, lighten(LIME, 0.03));
  // the great gilt clock face high on the front
  const [clx, cly] = iso.P(cx, cy, 78);
  const RR = 5.4 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; ring.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
  iso.r.poly(ring, GILT_HOT);
  iso.r.polyline(ring, INK_W * 0.7, INK, true);
  iso.r.line([clx, cly - RR], [clx, cly - RR - 3 * RES], 1 * RES, INK);
  iso.r.line([clx, cly - RR], [clx + 2.4 * RES, cly - RR + 1 * RES], 1 * RES, INK);
  // statue niches flanking the clock
  for (const su of [cx - 0.16, cx + 0.16] as const) {
    const [sx, syB] = iso.P(su, cy, 50);
    iso.r.poly([[sx - 1.4 * RES, syB], [sx + 1.4 * RES, syB], [sx + 0.8 * RES, syB - 11 * RES], [sx - 0.8 * RES, syB - 11 * RES]], lighten(LIME, 0.06));
  }
  // a tall steep ornate roof + lantern crowning the central pavilion
  iso.hip(cx - 0.26, cy - 0.26, cx + 0.26, cy + 0.02, 98, 22, ROOF);
  const [lx, lyB] = iso.P(cx, cy - 0.12, 120);
  iso.r.rect(lx - 2.8 * RES, lyB - 12 * RES, lx + 2.8 * RES, lyB, lighten(LIME, 0.1));
  iso.r.line([lx, lyB - 12 * RES], [lx, lyB - 24 * RES], 1.2 * RES, GILT);
  iso.glint([lx, lyB - 6 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// LA SORBONNE — the Chapelle Sainte-Ursule de la Sorbonne: a baroque college
// chapel with a pedimented stone facade and a tall drummed LEAD dome + lantern,
// fronting the long ranges of the university. 2×2.
// =====================================================================
function sorbonneTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long college ranges (a quiet stone block with regular windows)
  iso.box(u0, v0, u1, v1, 0, 50, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(LIME, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 14, 42, 10, alpha(COLORS.glassDark, 0.8), COLORS.white);
  iso.gable(u0, v0, u1, v1, 50, 12, 'u', ZINC, LIME);
  // the chapel's pedimented temple-front projecting on the front-left
  const fu = u0 + 0.42;
  iso.box(fu - 0.26, v1 - 0.14, fu + 0.26, v1, 0, 54, lighten(LIME, 0.04));
  colonnade(iso, v1, fu - 0.22, fu + 0.22, 8, 44, 6, COLORS.white);
  pediment(iso, v1, fu - 0.24, fu + 0.24, 54, 12, LIME);
  // the tall drummed LEAD dome over the crossing (the Sorbonne's signature) —
  // raised well above the college ranges so it reads as the dome of the Latin Quarter
  const cx = u0 + 0.62, cy = (v0 + v1) / 2;
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 50, 92, lighten(LIME, 0.03)); // tall drum
  // ring of drum columns
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI;
    const [px, pyB] = iso.P(cx, cy + 0.22, 0);
    const x = px + Math.cos(a) * 0.22 * (CELL_W / 2);
    const y = pyB - 80 * RES + Math.sin(a) * 0.22 * (CELL_W / 2) * 0.46;
    iso.r.line([x, y - 8 * RES], [x, y + 7 * RES], 1 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.08) : COLORS.white);
  }
  iso.box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 92, 98, shaded(LIME, 0.06), { ink: false }); // attic ring
  const { tipX, tipY } = domeAt(iso, cx, cy, 98, 0.26 * (CELL_W / 2), 1.22, LEADG, { ribs: 7, bulb: true });
  iso.r.rect(tipX - 2.2 * RES, tipY - 11 * RES, tipX + 2.2 * RES, tipY + 1 * RES, lighten(LIME, 0.1)); // lantern
  iso.r.line([tipX, tipY - 11 * RES], [tipX, tipY - 20 * RES], 1 * RES, LIME_D);
  iso.glint([tipX, tipY - 6 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// INSTITUT DE FRANCE — Le Vau's Collège des Quatre-Nations: a sweeping CONCAVE
// Baroque facade whose curved wings embrace a central pavilion carrying the
// famous saucer DOME of the Académie française, flanked by two pedimented
// pavilions. The river-facing crescent. 2×1 (broad + shallow).
// =====================================================================
function institutDeFranceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.22, u1 = 1.78, v = 0.72;
  iso.shadow(u0, 0.4, u1, v + 0.2, 0.18, 0.2);
  // the concave crescent of wings — drawn as a shallow arc of stone bays
  const N = 11;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const u = u0 + (u1 - u0) * t;
    // concave: ends step forward (toward v larger), centre recedes
    const bulge = (Math.cos((t - 0.5) * Math.PI)) * 0.12;
    const vv = v - 0.18 + bulge;
    const h = 46 + Math.sin(t * Math.PI) * 6;
    iso.box(u - 0.05, vv, u + 0.05, vv + 0.16, 0, h, i % 2 ? LIME : lighten(LIME, 0.04));
  }
  // the two flanking pavilions (ends), pedimented + taller
  for (const cu of [u0 + 0.1, u1 - 0.1] as const) {
    iso.box(cu - 0.13, v - 0.06, cu + 0.13, v + 0.12, 0, 58, lighten(LIME, 0.03));
    pediment(iso, v + 0.12, cu - 0.14, cu + 0.14, 58, 12, LIME);
    iso.hip(cu - 0.14, v - 0.07, cu + 0.14, v + 0.13, 58, 12, ZINC);
  }
  // the central domed pavilion (the Mazarin dome — the building's whole identity),
  // raised tall so the saucer dome clearly tops the riverfront crescent
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.18, v - 0.22, cx + 0.18, v - 0.02, 0, 60, LIME);
  colonnade(iso, v - 0.02, cx - 0.15, cx + 0.15, 10, 54, 4, COLORS.white);
  pediment(iso, v - 0.02, cx - 0.16, cx + 0.16, 60, 10, LIME);
  iso.box(cx - 0.16, v - 0.2, cx + 0.16, v - 0.04, 70, 88, lighten(LIME, 0.04)); // tall drum
  // little drum buttress columns
  for (let i = 0; i <= 5; i++) {
    const a = (i / 5) * Math.PI;
    const [px, pyB] = iso.P(cx, v - 0.04, 0);
    const x = px + Math.cos(a) * 0.16 * (CELL_W / 2);
    const y = pyB - 78 * RES + Math.sin(a) * 0.16 * (CELL_W / 2) * 0.46;
    iso.r.line([x, y - 6 * RES], [x, y + 6 * RES], 0.9 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.08) : COLORS.white);
  }
  const { tipX, tipY } = domeAt(iso, cx, v - 0.12, 88, 0.2 * (CELL_W / 2), 0.95, LEADG, { ribs: 7, bulb: true });
  // gilt lantern + finial
  iso.r.rect(tipX - 2.2 * RES, tipY - 10 * RES, tipX + 2.2 * RES, tipY + 1 * RES, lighten(LIME, 0.1));
  iso.r.line([tipX, tipY - 10 * RES], [tipX, tipY - 18 * RES], 1 * RES, GILT);
  iso.glint([tipX, tipY - 5 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// CONCIERGERIE — the medieval royal palace on the Seine quay: a long fortified
// stone range with the TWIN ROUND towers (Tour de César + Tour d'Argent) and the
// square Tour de l'Horloge carrying Paris's first public clock, all under steep
// conical/pyramidal lead roofs. 2×1 (a riverfront wall).
// =====================================================================
function conciergerieTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true, headroom: 130 });
  void seed;
  const ST = hex('#c9bfa6');
  const ROOF = hex('#3f4a5a');
  const u0 = 0.18, u1 = 1.82, v0 = 0.46, v1 = 0.86;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the long curtain range with machicolation + small windows
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(ST, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 32, 10, alpha(COLORS.glassDark, 0.85), ST);
  iso.gable(u0, v0, u1, v1, 40, 10, 'u', ROOF, ST);
  // a round tower with a tall conical pepperpot roof
  const roundTower = (cu: number, h: number, r = 0.15): void => {
    iso.box(cu - r, v1 - r * 1.5, cu + r, v1 + r * 0.2, 0, h, ST);
    iso.box(cu - r - 0.02, v1 - r * 1.5 - 0.02, cu + r + 0.02, v1 + r * 0.2 + 0.02, h, h + 4, lighten(ST, 0.06), { ink: false }); // machicolated ring
    const apex = iso.P(cu, v1 - r * 0.65, h + 34);
    const c0 = iso.P(cu - r, v1 + r * 0.2, h + 4);
    const c1 = iso.P(cu + r, v1 + r * 0.2, h + 4);
    const c2 = iso.P(cu + r, v1 - r * 1.5, h + 4);
    iso.r.poly([c0, c1, apex], shaded(ROOF, 0.06));
    iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  };
  // the famous twin round towers near the left (Tour d'Argent + Tour de César)
  roundTower(u0 + 0.26, 74);
  roundTower(u0 + 0.56, 74);
  // the square Tour de l'Horloge with its gilt clock, on the right corner
  const tu = u1 - 0.22, th = 92;
  iso.box(tu - 0.15, v1 - 0.3, tu + 0.15, v1, 0, th, ST);
  const [clx, cly] = iso.P(tu, v1, 66);
  const RR = 3.6 * RES;
  const cr: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; cr.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
  iso.r.poly(cr, GILT_HOT);
  iso.r.polyline(cr, INK_W * 0.6, INK, true);
  // a steep slate cap + finial on the clock tower
  iso.hip(tu - 0.16, v1 - 0.32, tu + 0.16, v1 + 0.02, th, 16, ROOF);
  const ap = iso.P(tu, v1 - 0.15, th + 16);
  iso.r.line(ap, [ap[0], ap[1] - 6 * RES], 1 * RES, GILT);
  iso.glint([clx, cly - RR], 2 * RES);
  return iso.build();
}

// =====================================================================
// SAINTE-CHAPELLE — Saint Louis's reliquary chapel: a tall, narrow High-Gothic
// jewel-box that is almost ALL glass between slim buttresses, crowned by the
// breathtakingly tall, slender, crocketed FLÈCHE. Slim 1×1, big headroom — the
// spire spikes far above the island.
// =====================================================================
function sainteChapelleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 320 });
  void seed;
  const ST = hex('#cfc7b3'); // pale gothic limestone
  const ROOF = hex('#46566b');
  const GLOW = hex('#c97a8a'); // rose-glass warmth at dusk
  const u = 0.5, v = 0.5, b = 0.22, H = 112;
  iso.shadow(u - b, v - b * 0.4, u + b, v + b, 0.4, 0.26);
  // the tall narrow chapel body — read as glass between slim stone piers
  iso.box(u - b, v - b, u + b, v + b, 0, H, alpha(GLOW, 0.55), { topC: top(ST, 0.2) });
  // slim buttress piers up the visible faces
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    iso.r.line(iso.P(u - b + 2 * b * t, v + b, 4), iso.P(u - b + 2 * b * t, v + b, H - 4), 1.1 * RES, i % 2 ? lit(ST, 0.06) : ST);
  }
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    iso.r.line(iso.P(u + b, v - b + 2 * b * t, 4), iso.P(u + b, v - b + 2 * b * t, H - 4), 1.1 * RES, ST);
  }
  // tall lancet window tops (pointed arches) glowing rose
  for (let i = 0; i < 3; i++) {
    const uu = u - b + 0.06 + i * (2 * b - 0.12) / 2;
    const [ax, ay] = iso.P(uu, v + b, H - 8);
    iso.r.poly([[ax - 2.4 * RES, ay], [ax + 2.4 * RES, ay], [ax, ay - 8 * RES]], alpha(GLOW, 0.8));
  }
  // a steep lead roof ridge
  iso.gable(u - b, v - b, u + b, v + b, H, 14, 'v', ROOF, ST);
  // the soaring crocketed FLÈCHE — a very tall slim spire (the signature)
  const [sx, syB] = iso.P(u, v, H + 14);
  const tipY = syB - 130 * RES;
  iso.r.poly([[sx - 4 * RES, syB], [sx + 4 * RES, syB], [sx, tipY]], lit(ROOF, 0.04));
  iso.r.polyline([[sx - 4 * RES, syB], [sx, tipY], [sx + 4 * RES, syB]], INK_W * 0.6, INK);
  // crockets — little barbs up the spire edges
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const ex = sx + 4 * RES * (1 - t), ey = syB - 130 * RES * t;
    iso.r.line([ex, ey], [ex + 2.2 * RES, ey + 0.6 * RES], 0.8 * RES, GILT);
    iso.r.line([2 * sx - ex, ey], [2 * sx - ex - 2.2 * RES, ey + 0.6 * RES], 0.8 * RES, GILT);
  }
  iso.r.line([sx, tipY], [sx, tipY - 8 * RES], 1 * RES, GILT_HOT); // finial cross stem
  iso.glint([sx, tipY], 2 * RES);
  return iso.build();
}

// =====================================================================
// PETIT PALAIS — Girault's Belle-Époque art museum: a low Beaux-Arts stone
// palace with a grand arched ENTRANCE PORCH under a flat-saucer LEAD dome, an
// Ionic colonnade wrapping the wings, and a gilded wrought-iron gate. 2×2.
// =====================================================================
function petitPalaisTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the low wings
  iso.box(u0, v0, u1, v1, 0, 38, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(LIME, 0.12), { ink: false });
  // an Ionic colonnade wrapping the front wings
  colonnade(iso, v1, u0 + 0.08, u1 - 0.08, 8, 34, 16, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 38, 43, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  // the grand central entrance porch — a tall arched bay projecting on the front
  const cx = (u0 + u1) / 2, cy = v1 - 0.12;
  iso.box(cx - 0.22, cy - 0.06, cx + 0.22, cy + 0.12, 0, 50, lighten(LIME, 0.04));
  // the big round-headed arch
  const arch: Pt[] = [iso.P(cx - 0.16, cy + 0.12, 6), iso.P(cx - 0.16, cy + 0.12, 28)];
  for (let j = 0; j <= 10; j++) { const t = j / 10; arch.push(iso.P(cx - 0.16 + 0.32 * t, cy + 0.12, 28 + Math.sin(t * Math.PI) * 12)); }
  arch.push(iso.P(cx + 0.16, cy + 0.12, 28), iso.P(cx + 0.16, cy + 0.12, 6));
  iso.r.poly(arch, alpha(COLORS.glassDark, 0.85));
  iso.r.polyline(arch, INK_W * 0.6, INK, true);
  // the flat-saucer LEAD dome over the porch
  iso.box(cx - 0.2, cy - 0.08, cx + 0.2, cy + 0.1, 50, 56, lighten(LIME, 0.04));
  const { tipX, tipY } = domeAt(iso, cx, cy + 0.01, 56, 0.24 * (CELL_W / 2), 0.55, LEADG, { ribs: 7 });
  iso.r.line([tipX, tipY], [tipX, tipY - 8 * RES], 1.2 * RES, GILT); // finial
  // gilt railing pips along the parapet (the famous golden gate read)
  for (let i = 0; i <= 8; i++) {
    const [gx, gy] = iso.P(u0 + 0.1 + i * (u1 - u0 - 0.2) / 8, v1, 44);
    iso.r.line([gx, gy], [gx, gy - 3 * RES], 0.7 * RES, GILT_HOT);
  }
  iso.glint([tipX, tipY - 3 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// PALAIS DE CHAILLOT — the 1937 Trocadéro palace: TWO sweeping curved
// colonnaded stone wings (the pavillons de Paris & de Passy) that frame a wide
// empty terrace between them — the gap deliberately FRAMES the Eiffel view. Gilt
// inscriptions band the friezes. 2×2 (with an open centre).
// =====================================================================
function chaillotTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the wide terrace floor (the famous esplanade, open in the middle)
  iso.box(u0, v0, u1, v1, 0, 6, shaded(LIME, 0.14), { ink: false });
  iso.quad(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 6, top(LIME, 0.36)); // bright terrace deck
  // a curved colonnaded wing as an arc of columned bays
  const wing = (sign: number): void => {
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      // arc sweeping from the centre-back out toward a front corner
      const cu = (u0 + u1) / 2 + sign * (0.18 + t * 0.5);
      const cv = v1 - 0.12 - Math.sin(t * Math.PI * 0.5) * 0.5;
      iso.box(cu - 0.05, cv - 0.05, cu + 0.05, cv + 0.07, 6, 40, i % 2 ? LIME : lighten(LIME, 0.05));
      // column shafts hint
      iso.r.line(iso.P(cu, cv + 0.07, 8), iso.P(cu, cv + 0.07, 36), 0.7 * RES, COLORS.white);
    }
    // the gilt frieze band capping the wing
    const eu = (u0 + u1) / 2 + sign * 0.68, ev = v1 - 0.12 - 0.5;
    const cu0 = (u0 + u1) / 2 + sign * 0.18;
    iso.r.line(iso.P(cu0, v1 - 0.05, 41), iso.P(eu, ev + 0.02, 41), 1.4 * RES, GILT_HOT);
    // a corner pavilion block at the wing's outer end
    iso.box(eu - 0.1, ev - 0.06, eu + 0.1, ev + 0.08, 6, 48, LIME);
    iso.box(eu - 0.11, ev - 0.07, eu + 0.11, ev + 0.09, 48, 52, ZINC, { ink: false });
  };
  wing(-1);
  wing(1);
  // a couple of gilt statues on the terrace edge (the Trocadéro golden figures)
  for (const su of [(u0 + u1) / 2 - 0.5, (u0 + u1) / 2 + 0.5] as const) {
    const [stx, sty] = iso.P(su, v1 - 0.16, 6);
    iso.r.poly([[stx - 1.4 * RES, sty], [stx + 1.4 * RES, sty], [stx + 0.8 * RES, sty - 9 * RES], [stx - 0.8 * RES, sty - 9 * RES]], GILT);
    iso.glint([stx, sty - 7 * RES], 1.6 * RES);
  }
  return iso.build();
}

// =====================================================================
// LA GRANDE ARCHE DE LA DÉFENSE — von Spreckelsen's hollow CUBE: a colossal
// open-centred marble-and-glass cube (a 20th-c. Arc de Triomphe) standing on the
// historic axis, with the soft suspended "cloud" canopy slung within the void.
// 2×2 with headroom — a clean monumental silhouette.
// =====================================================================
function grandeArcheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 180 });
  void seed;
  const MARBLE = hex('#e9eaec'); // white Carrara cladding
  const MARBLE_D = hex('#c4c7cc');
  const GLASS = hex('#8fb0cc');
  const u0 = 0.42, u1 = 1.58, v0 = 0.44, v1 = 1.56;
  const H = 132, T = 0.2; // cube height + frame thickness (in u/v units)
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the parvis slab the cube stands on
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 6, shaded(MARBLE, 0.14), { ink: false });
  // the cube as a thick square frame: two side piers + top + bottom lintel,
  // leaving the centre VOID (the hole that makes it the Grande Arche).
  // left pier (front-left leg)
  iso.box(u0, v1 - T, u1, v1, 6, H, MARBLE, { rightC: lit(MARBLE, 0.1), leftC: shaded(MARBLE, 0.14) });
  // right pier (the far leg, drawn behind)
  iso.box(u0, v0, u1, v0 + T, 6, H, MARBLE_D, { ink: true });
  // the glazed inner reveals of the two legs (the office windows lining the hole)
  iso.windowsLeft(v1 - T, u0 + 0.06, u1 - 0.06, 12, H - 8, 8, alpha(GLASS, 0.7), MARBLE);
  // bottom lintel (the base bridge across the legs) + top roof slab
  iso.box(u0, v0, u1, v1, 6, 6 + T * 60, MARBLE_D, { ink: false });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H - T * 60, H, MARBLE, { topC: top(MARBLE, 0.3) });
  // the deep square VOID read: a dark inner opening between the legs/lintels
  const void0 = iso.P(u0 + 0.18, v1 - T - 0.02, 6 + T * 60);
  const voidPts: Pt[] = [
    iso.P(u0 + 0.16, v1 - T, 6 + T * 60), iso.P(u1 - 0.16, v1 - T, 6 + T * 60),
    iso.P(u1 - 0.16, v1 - T, H - T * 60), iso.P(u0 + 0.16, v1 - T, H - T * 60),
  ];
  void void0;
  iso.r.poly(voidPts, alpha(hex('#3a4250'), 0.55));
  // grid lines cladding the front faces (the marble panel joints)
  for (let i = 1; i < 6; i++) {
    const z = 6 + ((H - 12) * i) / 6;
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.4 * RES, alpha(MARBLE_D, 0.5));
  }
  // the suspended "nuage" canopy slung in the void (a soft pale membrane)
  const nuage: Pt[] = [
    iso.P(u0 + 0.24, v1 - T - 0.01, 44), iso.P(u1 - 0.24, v1 - T - 0.01, 50),
    iso.P(u1 - 0.3, v1 - T - 0.01, 62), iso.P(u0 + 0.3, v1 - T - 0.01, 56),
  ];
  iso.r.poly(nuage, alpha(COLORS.white, 0.5));
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H), 0.9 * RES); // catch on the top-right edge
  return iso.build();
}

// =====================================================================
// STADE DE FRANCE — the great national stadium at Saint-Denis: a vast elliptical
// bowl ringed by a FLOATING elliptical roof (the "saturn" canopy) carried on a
// ring of slim masts, glowing from the floodlit pitch within. A monster venue. 3×3.
// =====================================================================
function stadeDeFranceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const STEEL = hex('#c3c9cf');
  const ROOF = hex('#9aa3ab');
  const cx = 1.5, cy = 1.5;
  iso.shadow(0.4, 0.4, 2.6, 2.6, 0.22, 0.2);
  const RU = 1.0; // ellipse radius in tile units (u), screen ellipse is 2:1
  const ellipse = (rad: number, z: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(iso.P(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, z));
    }
    return pts;
  };
  // the outer bowl wall (raked concrete tiers) as a stack of rings
  iso.r.poly(ellipse(RU, 0), shaded(STEEL, 0.14)); // ground footprint
  // bowl outer skin
  const outerLow = ellipse(RU, 4), outerHigh = ellipse(RU * 0.96, 40);
  for (let i = 0; i < 40; i++) {
    iso.r.poly([outerLow[i]!, outerLow[i + 1]!, outerHigh[i + 1]!, outerHigh[i]!], i < 20 ? lit(STEEL, 0.06) : shaded(STEEL, 0.1));
  }
  iso.r.polyline(ellipse(RU, 4), INK_W * 0.8, INK, true);
  // the glowing pitch + seating bowl inside (floodlit green)
  iso.r.poly(ellipse(RU * 0.82, 40), shaded(STEEL, 0.2)); // inner upper rim
  iso.r.poly(ellipse(RU * 0.5, 18), alpha(hex('#3f7d4a'), 0.9)); // the lit pitch
  iso.r.poly(ellipse(RU * 0.66, 30), alpha(hex('#243042'), 0.6)); // seating shadow band
  // the FLOATING elliptical roof ring (the saturn canopy) hovering above the rim
  const roofZ = 64;
  const roofOuter = ellipse(RU * 1.06, roofZ), roofInner = ellipse(RU * 0.74, roofZ);
  for (let i = 0; i < 40; i++) {
    iso.r.poly([roofOuter[i]!, roofOuter[i + 1]!, roofInner[i + 1]!, roofInner[i]!], i < 20 ? lit(ROOF, 0.08) : ROOF);
  }
  iso.r.polyline(roofOuter, INK_W * 0.8, INK, true);
  iso.r.polyline(roofInner, INK_W * 0.7, INK, true); // the inner oculus rim
  // slim masts carrying the roof + a sparkle of floodlights on the inner edge
  for (let i = 0; i < 40; i += 5) {
    const a = (i / 40) * Math.PI * 2;
    const base = iso.P(cx + Math.cos(a) * RU * 1.0, cy + Math.sin(a) * RU * 1.0, 40);
    const tip = iso.P(cx + Math.cos(a) * RU * 1.06, cy + Math.sin(a) * RU * 1.06, roofZ);
    iso.r.line(base, tip, 0.7 * RES, alpha(STEEL, 0.8));
  }
  for (let i = 0; i < 40; i += 4) {
    const a = (i / 40) * Math.PI * 2;
    const [fx, fy] = iso.P(cx + Math.cos(a) * RU * 0.74, cy + Math.sin(a) * RU * 0.74, roofZ);
    iso.glint([fx, fy], 1.6 * RES);
  }
  return iso.build();
}

// =====================================================================
// GALERIES LAFAYETTE — the Boulevard Haussmann flagship store: a Haussmann
// stone block crowned by the famous Art-Nouveau steel-and-STAINED-GLASS corner
// CUPOLA (a great glowing neo-Byzantine dome of coloured glass) with flagpoles.
// 2×2.
// =====================================================================
function galeriesLafayetteTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.44, v1 = 1.56;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the Haussmann department-store block (big glazed shopfronts at street level)
  iso.box(u0, v0, u1, v1, 0, 56, LIME);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, alpha(COLORS.glassLit, 0.6), { ink: false }); // lit shopfronts
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 18, 50, 10, alpha(COLORS.glassLit, 0.5), COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 56, 61, lighten(LIME, 0.08), { topC: top(LIME, 0.3) });
  // ornate mansard with the gold "GALERIES LAFAYETTE" frieze band
  iso.gable(u0, v0, u1, v1, 61, 12, 'u', ZINC, LIME);
  iso.r.line(iso.P(u0, v1, 58), iso.P(u1, v1, 58), 1.6 * RES, GILT_HOT);
  // the great STAINED-GLASS cupola on the corner (the icon) — a glowing coloured dome
  const cx = u0 + 0.5, cy = v0 + 0.5;
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 56, 72, lighten(LIME, 0.04)); // drum the dome sits on
  const [dx, dyB] = iso.P(cx, cy, 72);
  const rPx = 0.26 * (CELL_W / 2), rise = rPx * 1.5;
  // coloured-glass dome built as tinted gores so it reads stained-glass
  const tints = [hex('#caa24a'), hex('#9c6f3e'), hex('#b5894a'), hex('#d8b65c')];
  const gores = 8;
  for (let g = 0; g < gores; g++) {
    const a0 = (g / gores) * Math.PI, a1 = ((g + 1) / gores) * Math.PI;
    const pts: Pt[] = [];
    for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * (i / 6); pts.push([dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rise]); }
    pts.push([dx + Math.cos(a1) * rPx * 0.05, dyB - rise * 0.96]);
    iso.r.poly(pts, alpha(tints[g % tints.length]!, 0.9));
  }
  iso.r.polyline([[dx - rPx, dyB], ...Array.from({ length: 13 }, (_, i): Pt => { const a = (i / 12) * Math.PI; return [dx + Math.cos(a) * rPx, dyB - Math.sin(a) * rise]; })], INK_W * 0.8, INK);
  // a gilt lantern + finial + two flagpoles
  const tipY = dyB - rise;
  iso.r.rect(dx - 2 * RES, tipY - 8 * RES, dx + 2 * RES, tipY + 1 * RES, GILT_HOT);
  iso.r.line([dx, tipY - 8 * RES], [dx, tipY - 16 * RES], 1 * RES, GILT);
  for (const fu of [u1 - 0.16, u1 - 0.34] as const) {
    const [fx, fy] = iso.P(fu, v1 - 0.05, 61);
    iso.r.line([fx, fy], [fx, fy - 16 * RES], 0.7 * RES, alpha(COLORS.white, 0.8));
  }
  iso.glint([dx, tipY - 4 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// OPÉRA BASTILLE — Ott's 1989 modern opera house: a big curved DRUM-fronted
// glass-and-stone mass, its convex façade a grid of grey granite squares and
// dark glass, stepped setbacks and the great glazed foyer glowing at dusk. 2×2.
// =====================================================================
function operaBastilleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const STONE = hex('#aeb4ba'); // grey granite cladding
  const STONE_D = hex('#8d949b');
  const GLASS = hex('#5c7488');
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  const H = 84;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the main mass
  iso.box(u0, v0, u1, v1, 0, H, STONE, { rightC: lit(STONE, 0.08), leftC: shaded(STONE, 0.14), topC: top(STONE, 0.24) });
  // the convex curved glass FRONT drum (the signature) bulging on the v1 face
  const N = 12;
  const front: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = u0 + 0.1 + (u1 - u0 - 0.2) * t;
    const bulge = Math.sin(t * Math.PI) * 0.16; // convex toward viewer
    front.push(iso.P(u, v1 + bulge, H - 6));
  }
  for (let i = 0; i <= N; i++) {
    const t = (N - i) / N;
    const u = u0 + 0.1 + (u1 - u0 - 0.2) * t;
    const bulge = Math.sin(t * Math.PI) * 0.16;
    front.push(iso.P(u, v1 + bulge, 4));
  }
  iso.r.poly(front, alpha(GLASS, 0.88));
  iso.r.polyline(front, INK_W * 0.7, INK, true);
  // the granite-square grid + glass mullions across the curved front
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const u = u0 + 0.1 + (u1 - u0 - 0.2) * t;
    const bulge = Math.sin(t * Math.PI) * 0.16;
    iso.r.line(iso.P(u, v1 + bulge, 6), iso.P(u, v1 + bulge, H - 8), 0.6 * RES, t < 0.5 ? alpha(STONE_D, 0.6) : alpha(GLASS, 0.6));
  }
  for (let f = 1; f < 6; f++) {
    const z = (H * f) / 6;
    const band: Pt[] = [];
    for (let i = 0; i <= N; i++) { const t = i / N; const u = u0 + 0.1 + (u1 - u0 - 0.2) * t; band.push(iso.P(u, v1 + Math.sin(t * Math.PI) * 0.16, z)); }
    iso.r.polyline(band, 0.5 * RES, alpha(STONE_D, 0.5));
  }
  // a glowing glazed foyer slot at the base + a stepped setback crown
  iso.box(u0 + 0.12, v1 - 0.04, u1 - 0.12, v1 + 0.04, 4, 18, alpha(COLORS.glassLit, 0.7), { ink: false });
  iso.box(u0 + 0.14, v0 + 0.14, u1 - 0.14, v1 - 0.5, H, H + 14, STONE_D); // flytower setback behind
  iso.gleam(iso.P(u1, v0 + 0.1, H), iso.P(u1, v1 - 0.1, H), 0.9 * RES);
  return iso.build();
}

// =====================================================================
// GARE (terminus family) — a grand Paris railway terminus: a long Beaux-Arts
// stone head-house with a great arched lunette window, an arched glazed
// TRAIN-SHED glowing behind, and (per variant) a parapet of statues, twin
// pavilions, or a CLOCK CAMPANILE. `variant`: 'nord' | 'est' | 'lyon'. 2×2.
// =====================================================================
function gareTile(seed: number, variant: 'nord' | 'est' | 'lyon'): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: variant === 'lyon' ? 180 : 110 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the arched glazed train-shed behind the head-house (glowing iron-and-glass)
  iso.box(u0 + 0.18, v0 + 0.2, u1 - 0.18, v1 - 0.62, 0, 38, shaded(COLORS.glassSky, 0.08), { ink: false });
  const shedV = (v0 + 0.2 + v1 - 0.62) / 2;
  for (let i = 0; i <= 14; i++) {
    const u = u0 + 0.24 + ((u1 - u0 - 0.48) * i) / 14;
    const [bx, by] = iso.P(u, shedV, 38);
    iso.r.line([bx, by], [bx, by - 24 * RES], 0.8 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : alpha(COLORS.glassSky, 0.85));
  }
  const [sx0, sy0] = iso.P(u0 + 0.24, shedV, 38);
  const [sx1] = iso.P(u1 - 0.24, shedV, 38);
  iso.r.line([sx0, sy0 - 24 * RES], [sx1, sy0 - 24 * RES], 1.4 * RES, alpha(COLORS.glassLit, 0.7)); // ridge
  // the stone head-house facade block (tall + monumental so it clears the fabric)
  iso.box(u0, v1 - 0.6, u1, v1, 0, 68, LIME);
  iso.box(u0 - 0.02, v1 - 0.62, u1 + 0.02, v1 + 0.02, 0, 13, shaded(LIME, 0.12), { ink: false });
  // the great arched LUNETTE window dominating the facade
  const cx = (u0 + u1) / 2;
  const lun: Pt[] = [iso.P(cx - 0.34, v1, 16), iso.P(cx - 0.34, v1, 40)];
  for (let j = 0; j <= 12; j++) { const t = j / 12; lun.push(iso.P(cx - 0.34 + 0.68 * t, v1, 40 + Math.sin(t * Math.PI) * 20)); }
  lun.push(iso.P(cx + 0.34, v1, 40), iso.P(cx + 0.34, v1, 16));
  iso.r.poly(lun, alpha(COLORS.glassLit, 0.6));
  iso.r.polyline(lun, INK_W * 0.7, INK, true);
  // radiating glazing bars in the lunette
  const [lcx, lcy] = iso.P(cx, v1, 40);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); iso.r.line([lcx, lcy], [lcx + Math.cos(a) * 0.34 * (CELL_W / 2), lcy - Math.sin(a) * 20 * RES], 0.5 * RES, alpha(LIME, 0.5)); }
  // side bays with tall windows
  iso.windowsLeft(v1, u0 + 0.06, cx - 0.38, 16, 46, 3, alpha(COLORS.glassDark, 0.8), COLORS.white);
  iso.windowsLeft(v1, cx + 0.38, u1 - 0.06, 16, 46, 3, alpha(COLORS.glassDark, 0.8), COLORS.white);
  iso.box(u0 - 0.03, v1 - 0.62, u1 + 0.03, v1 + 0.03, 68, 75, lighten(LIME, 0.06), { topC: top(LIME, 0.28) });

  if (variant === 'nord') {
    // Gare du Nord: a tall attic gable + a parapet crowned by allegorical STATUES
    pediment(iso, v1, cx - 0.4, cx + 0.4, 75, 18, LIME);
    for (let i = 0; i <= 8; i++) {
      const [stx, sty] = iso.P(u0 + 0.12 + i * (u1 - u0 - 0.24) / 8, v1, 75);
      iso.r.poly([[stx - 1.6 * RES, sty], [stx + 1.6 * RES, sty], [stx + 0.9 * RES, sty - 13 * RES], [stx - 0.9 * RES, sty - 13 * RES]], lighten(LIME, 0.08));
      iso.r.line([stx, sty - 13 * RES], [stx, sty - 17 * RES], 0.8 * RES, LIME_D);
    }
  } else if (variant === 'est') {
    // Gare de l'Est: a tall central pedimented gable + a great clock + twin end pavilions
    pediment(iso, v1, cx - 0.4, cx + 0.4, 75, 20, LIME);
    const [clx, cly] = iso.P(cx, v1, 82);
    const RR = 4.4 * RES, cr: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; cr.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
    iso.r.poly(cr, COLORS.white); iso.r.polyline(cr, INK_W * 0.6, INK, true);
    iso.r.line([clx, cly - RR], [clx, cly - RR - 2.6 * RES], 0.9 * RES, INK);
    iso.r.line([clx, cly - RR], [clx + 2 * RES, cly - RR + 1 * RES], 0.9 * RES, INK);
    for (const cu of [u0 + 0.14, u1 - 0.14] as const) {
      iso.box(cu - 0.13, v1 - 0.32, cu + 0.13, v1, 0, 84, LIME);
      iso.hip(cu - 0.15, v1 - 0.34, cu + 0.15, v1 + 0.02, 84, 16, ZINC);
    }
  } else {
    // Gare de Lyon: the famous tall CLOCK CAMPANILE (the Tour de l'Horloge) on the right
    const tu = u1 - 0.18, tv = v1 - 0.2, th = 150;
    iso.box(tu - 0.13, tv - 0.13, tu + 0.13, tv + 0.13, 0, th, lighten(LIME, 0.03));
    // four clock faces near the top (show the two visible ones)
    for (const [fv, fu] of [[tv + 0.13, tu], [tv, tu + 0.13]] as const) {
      const [clx, cly] = iso.P(fu, fv, th - 16);
      const RR = 3.4 * RES, cr: Pt[] = [];
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; cr.push([clx + Math.cos(a) * RR, cly - RR + Math.sin(a) * RR]); }
      iso.r.poly(cr, GILT_HOT); iso.r.polyline(cr, INK_W * 0.6, INK, true);
      iso.r.line([clx, cly - RR], [clx, cly - RR - 2 * RES], 0.9 * RES, INK);
      iso.r.line([clx, cly - RR], [clx + 1.6 * RES, cly - RR + 1 * RES], 0.9 * RES, INK);
    }
    // a steep pavilion roof + finial crowning the campanile
    iso.hip(tu - 0.14, tv - 0.14, tu + 0.14, tv + 0.14, th, 18, ZINC);
    const ap = iso.P(tu, tv, th + 18);
    iso.r.line(ap, [ap[0], ap[1] - 8 * RES], 1 * RES, GILT_HOT);
    iso.glint(iso.P(tu + 0.13, tv, th - 16), 2 * RES);
    // a central pediment on the head-house
    pediment(iso, v1, cx - 0.34, cx + 0.34, 75, 14, LIME);
  }
  return iso.build();
}

// =====================================================================
// REGISTRY
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // ---- MARQUEE (reuse the dedicated fns) ----
  {
    city: 'paris',
    key: 'eiffel-tower',
    match: /^Tour Eiffel$/i,
    foot: [3, 3],
    seed: 243,
    draw: (seed) => eiffelTile(seed),
    light: { kind: 'eiffelSparkle', topZ: 252, halfW: 1.5 },
  },
  {
    city: 'paris',
    key: 'notre-dame-de-paris',
    match: /Notre-Dame de Paris/i,
    foot: [2, 2],
    seed: 2981,
    draw: (seed) => notredameTile(seed),
    light: { kind: 'facadeFlood', topZ: 152, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'louvre-palace',
    match: /Palais du Louvre/i,
    foot: [1, 1],
    seed: 1075,
    draw: (seed) => louvreTile(seed),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'arc-de-triomphe',
    match: /^Arc de Triomphe$/i,
    foot: [1, 1],
    seed: 64436,
    draw: (seed) => archTile(seed),
    light: { kind: 'archGlow', topZ: 40, halfW: 0.7 },
  },
  {
    city: 'paris',
    key: 'porte-saint-denis',
    match: /Porte Saint-Denis/i,
    foot: [1, 1],
    seed: 64437,
    draw: (seed) => archTile(seed),
    light: { kind: 'archGlow', topZ: 40, halfW: 0.7 },
  },

  // ---- NEW BESPOKE draws ----
  {
    // DORMANT until city data flags "Opéra Garnier" landmark:true — only
    // landmark:true named places reach resolveBespokeKey (cityData.ts). The
    // draw fn is ready; one data-flag flip lights it up. (Same for the next two.)
    city: 'paris',
    key: 'palais-garnier',
    match: /Op[ée]ra Garnier|Palais Garnier/i,
    foot: [2, 2],
    seed: 187840,
    draw: (seed) => operaGarnierTile(seed),
    light: { kind: 'facadeFlood', topZ: 132, halfW: 1.2 },
  },
  {
    city: 'paris',
    key: 'la-madeleine',
    match: /Église de la Madeleine|La Madeleine/i,
    foot: [2, 2],
    seed: 330564,
    draw: (seed) => madeleineTile(seed),
    light: { kind: 'facadeFlood', topZ: 92, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'les-invalides',
    match: /Saint-Louis des Invalides|Les Invalides/i,
    foot: [2, 2],
    seed: 188977,
    draw: (seed) => invalidesTile(seed),
    light: { kind: 'facadeFlood', topZ: 190, halfW: 1.2 },
  },
  {
    // DORMANT until "Grand Palais" is flagged landmark:true in city data.
    city: 'paris',
    key: 'grand-palais',
    match: /Grand Palais/i,
    foot: [3, 3],
    seed: 457318,
    draw: (seed) => grandPalaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.6 },
  },
  {
    // DORMANT until "Musée d'Orsay" is flagged landmark:true in city data.
    city: 'paris',
    key: 'musee-d-orsay',
    match: /Mus[ée]e d'Orsay/i,
    foot: [3, 3],
    seed: 23402,
    draw: (seed) => orsayTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.6 },
  },
  {
    city: 'paris',
    key: 'galerie-vivienne',
    match: /Galerie Vivienne/i,
    foot: [2, 2],
    seed: 1314020,
    draw: (seed) => galerieVivienneTile(seed),
    light: { kind: 'genericGlow', topZ: 40, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'tour-saint-jacques',
    match: /Tour Saint-Jacques/i,
    foot: [1, 1],
    seed: 901,
    draw: (seed) => tourSaintJacquesTile(seed),
    light: { kind: 'aerialBeacon', topZ: 200, halfW: 0.28 },
  },

  // ---- châteaux (donjon family) ----
  {
    city: 'paris',
    key: 'chateau-de-vincennes',
    match: /Ch[âa]teau de Vincennes/i,
    foot: [2, 2],
    seed: 902,
    draw: (seed) => chateauTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'chateau-de-reghat',
    match: /Ch[âa]teau de R[ée]ghat/i,
    foot: [2, 2],
    seed: 903,
    draw: (seed) => chateauTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'chateau-du-parangon',
    match: /Ch[âa]teau du Parangon/i,
    foot: [2, 2],
    seed: 904,
    draw: (seed) => chateauTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'chateau-rothschild',
    match: /Ch[âa]teau Rothschild/i,
    foot: [2, 2],
    seed: 905,
    draw: (seed) => chateauTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'chateau-d-asnieres',
    match: /Ch[âa]teau d'Asni[èe]res/i,
    foot: [2, 2],
    seed: 906,
    draw: (seed) => chateauTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },
  {
    // the Domaine/Petit Bellevue country estate cluster (west) — both the
    // plain and the landmark "Bellevue" entries resolve here.
    city: 'paris',
    key: 'domaine-de-bellevue',
    match: /Bellevue/i,
    foot: [2, 2],
    seed: 907,
    draw: (seed) => chateauTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },

  // ---- orthodox / gothic cathedrals ----
  {
    city: 'paris',
    key: 'cathedrale-saint-alexandre-nevsky',
    match: /Saint-Alexandre-Nevsky/i,
    foot: [2, 2],
    seed: 910,
    draw: (seed) => orthodoxCathedralTile(seed, ONION_GOLD),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.1 },
  },
  {
    city: 'paris',
    key: 'cathedrale-saint-vladimir',
    match: /Saint-Vladimir/i,
    foot: [2, 2],
    seed: 911,
    draw: (seed) => orthodoxCathedralTile(seed, ONION_BLUE),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.1 },
  },
  {
    city: 'paris',
    key: 'cathedrale-saint-etienne',
    match: /Cath[ée]drale Saint-[ÉE]tienne/i,
    foot: [2, 2],
    seed: 912,
    draw: (seed) => gothicChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.1 },
  },
  {
    city: 'paris',
    key: 'cathedrale-americaine',
    match: /Cath[ée]drale am[ée]ricaine/i,
    foot: [2, 2],
    seed: 913,
    draw: (seed) => gothicChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.1 },
  },

  // ---- baroque / neoclassical churches ----
  {
    city: 'paris',
    key: 'saint-roch',
    match: /Église Saint-Roch/i,
    foot: [2, 2],
    seed: 920,
    draw: (seed) => baroqueChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'chapelle-expiatoire',
    match: /Chapelle expiatoire/i,
    foot: [2, 2],
    seed: 921,
    draw: (seed) => baroqueChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'basilique-notre-dame-de-boulogne',
    match: /Basilique Notre-Dame de Boulogne/i,
    foot: [2, 2],
    seed: 922,
    draw: (seed) => baroqueChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'eglise-saint-michel-des-batignolles',
    match: /Saint-Michel des Batignolles/i,
    foot: [2, 2],
    seed: 923,
    draw: (seed) => baroqueChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'eglise-saint-pierre-saint-paul',
    match: /Saint-Pierre - Saint-Paul/i,
    foot: [2, 2],
    seed: 924,
    draw: (seed) => baroqueChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },

  // ---- monuments + hôtels ----
  {
    city: 'paris',
    key: 'lion-de-belfort',
    match: /Lion de Belfort/i,
    foot: [1, 1],
    seed: 930,
    draw: (seed) => lionDeBelfortTile(seed),
    light: { kind: 'genericGlow', topZ: 52, halfW: 0.6 },
  },
  {
    city: 'paris',
    key: 'hotel-de-sens',
    match: /H[ôo]tel de Sens/i,
    foot: [2, 2],
    seed: 931,
    draw: (seed) => hotelDeSensTile(seed),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.0 },
  },
  {
    // DORMANT until "Pavillon de Vendôme" is flagged landmark:true in city data
    // (the hôtel-particulier draw also fits the many other placed hôtels once
    // they gain the flag).
    city: 'paris',
    key: 'pavillon-de-vendome',
    match: /Pavillon de Vend[ôo]me/i,
    foot: [2, 2],
    seed: 932,
    draw: (seed) => hotelParticulierTile(seed),
    light: { kind: 'genericGlow', topZ: 44, halfW: 1.0 },
  },

  // =====================================================================
  // ROUND 2 — distinctive bespoke landmarks (placed names, now live via W5).
  // =====================================================================
  {
    city: 'paris',
    key: 'moulin-de-la-galette',
    match: /Moulin de la Galette/i,
    foot: [2, 2],
    seed: 940,
    draw: (seed) => moulinTile(seed, true),
    light: { kind: 'aerialBeacon', topZ: 96, halfW: 0.9 }, // lit cap + turning sails
  },
  {
    city: 'paris',
    key: 'moulin-de-la-charite',
    match: /Moulin de la Charit[ée]/i,
    foot: [2, 2],
    seed: 941,
    draw: (seed) => moulinTile(seed, false),
    light: { kind: 'aerialBeacon', topZ: 96, halfW: 0.9 },
  },
  {
    city: 'paris',
    key: 'cirque-d-hiver',
    match: /Cirque d'Hiver/i,
    foot: [2, 2],
    seed: 942,
    draw: (seed) => cirqueHiverTile(seed),
    light: { kind: 'stadiumFlood', topZ: 64, halfW: 1.2 }, // a lit big-top ring
  },
  {
    city: 'paris',
    key: 'rotonde-de-la-villette',
    match: /Rotonde de la Villette/i,
    foot: [2, 2],
    seed: 943,
    draw: (seed) => rotondeVilletteTile(seed),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.1 },
  },
  {
    city: 'paris',
    key: 'musee-guimet',
    match: /Mus[ée]e Guimet/i,
    foot: [2, 2],
    seed: 944,
    draw: (seed) => museeGuimetTile(seed),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.1 },
  },
  {
    city: 'paris',
    key: 'theatre-daunou',
    match: /Th[ée][âa]tre Daunou/i,
    foot: [2, 2],
    seed: 945,
    draw: (seed) => theatreTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.0 }, // a glowing Deco marquee
  },
  {
    city: 'paris',
    key: 'musee-grevin',
    match: /Mus[ée]e Gr[ée]vin/i,
    foot: [2, 2],
    seed: 946,
    draw: (seed) => theatreTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'fontaine-medicis',
    match: /Fontaine M[ée]dicis/i,
    foot: [1, 1],
    seed: 947,
    draw: (seed) => fontaineTile(seed),
    light: { kind: 'genericGlow', topZ: 50, halfW: 0.7 }, // lit basin + grotto glow
  },
  {
    city: 'paris',
    key: 'maison-du-fontainier',
    match: /Maison du Fontainier/i,
    foot: [1, 1],
    seed: 948,
    draw: (seed) => fontaineTile(seed),
    light: { kind: 'genericGlow', topZ: 50, halfW: 0.7 },
  },
  {
    city: 'paris',
    key: 'memorial-deportation',
    match: /M[ée]morial des Martyrs de la D[ée]portation/i,
    foot: [1, 1],
    seed: 949,
    draw: (seed) => memorialTile(seed),
    light: { kind: 'genericGlow', topZ: 22, halfW: 0.7 }, // a single solemn glow
  },
  {
    city: 'paris',
    key: 'pyramide-de-bercy',
    match: /^Pyramide$/i,
    foot: [1, 1],
    seed: 950,
    draw: (seed) => pyramidePavilionTile(seed),
    light: { kind: 'spireBeacon', topZ: 56, halfW: 0.6 }, // cool glass + tip glint
  },
  {
    city: 'paris',
    key: 'manufacture-des-oeillets',
    match: /Manufacture des (?:œillets|oeillets)/i, // ligature or ascii spelling
    foot: [3, 3],
    seed: 951,
    draw: (seed) => halleIndustrielleTile(seed, true),
    light: { kind: 'genericGlow', topZ: 48, halfW: 1.4 },
  },
  {
    city: 'paris',
    key: 'chais-de-bercy',
    match: /Chais et Entrep[ôo]ts de Bercy/i,
    foot: [3, 3],
    seed: 952,
    draw: (seed) => halleIndustrielleTile(seed, false),
    light: { kind: 'genericGlow', topZ: 48, halfW: 1.4 },
  },
  {
    city: 'paris',
    key: 'la-ville-a-des-arts',
    match: /La Ville A des Arts/i,
    foot: [3, 3],
    seed: 954,
    draw: (seed) => halleIndustrielleTile(seed, false),
    light: { kind: 'genericGlow', topZ: 48, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'barriere-du-trone',
    match: /Barri[èe]re du Tr[ôo]ne/i,
    foot: [1, 1],
    seed: 955,
    draw: (seed) => barriereTile(seed),
    light: { kind: 'aerialBeacon', topZ: 100, halfW: 0.4 }, // lit column statues
  },
  {
    city: 'paris',
    key: 'maison-planeix',
    match: /Maison Planeix/i,
    foot: [2, 2],
    seed: 956,
    draw: (seed) => maisonModerneTile(seed, false),
    light: { kind: 'towerCrown', topZ: 51, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'maison-du-peuple',
    match: /Maison du Peuple/i,
    foot: [2, 2],
    seed: 957,
    draw: (seed) => maisonModerneTile(seed, true),
    light: { kind: 'towerCrown', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'henri-iv',
    match: /^Henri IV$/i,
    foot: [1, 1],
    seed: 958,
    draw: (seed) => equestrianTile(seed),
    light: { kind: 'genericGlow', topZ: 74, halfW: 0.5 }, // a floodlit bronze
  },
  // the old water-network well-houses (the several "Regard …")
  {
    city: 'paris',
    key: 'regard-saint-martin',
    match: /Regard Saint-Martin/i,
    foot: [1, 1],
    seed: 959,
    draw: (seed) => regardTile(seed),
    light: { kind: 'genericGlow', topZ: 42, halfW: 0.5 },
  },
  {
    city: 'paris',
    key: 'regard-de-la-prise-des-eaux',
    match: /Regard de la Prise des Eaux/i,
    foot: [1, 1],
    seed: 960,
    draw: (seed) => regardTile(seed),
    light: { kind: 'genericGlow', topZ: 42, halfW: 0.5 },
  },
  {
    city: 'paris',
    key: 'regard-des-maussins',
    match: /Regard des Maussins/i,
    foot: [1, 1],
    seed: 961,
    draw: (seed) => regardTile(seed),
    light: { kind: 'genericGlow', topZ: 42, halfW: 0.5 },
  },

  // =====================================================================
  // ROUND 2 — the hôtel-particulier FAMILY (variant-switched, spread across the
  // placed Marais/Faubourg mansions so they read distinct). variant: 1 block,
  // 2 marais (tourelle), 3 rococo (bowed avant-corps). The default 'court'
  // shape (round-1 hotelParticulierTile) is kept for Pavillon de Vendôme above.
  // =====================================================================
  {
    // Hôtel des Chardons — Art-Nouveau apartment-hôtel (the rococo/ornate bay
    // reads its sinuous façade); placed as "Les Chardons".
    city: 'paris',
    key: 'les-chardons',
    match: /Les Chardons/i,
    foot: [2, 2],
    seed: 970,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-biron',
    match: /H[ôo]tel Biron/i,
    foot: [2, 2],
    seed: 971,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    // a Marais hôtel (Hôtel de Marle / de Sully idiom) — brick-and-stone with a
    // corner stair-tourelle.
    city: 'paris',
    key: 'hotel-de-marle',
    match: /H[ôo]tel de Marle/i,
    foot: [2, 2],
    seed: 1013,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    // a Faubourg-Saint-Antoine craft courtyard (entre cour et jardin) — the
    // classical court hôtel; placed as "Cour de l'Etoile d'Or".
    city: 'paris',
    key: 'cour-de-l-etoile-d-or',
    match: /Cour de l'[ÉE]toile d'Or/i,
    foot: [2, 2],
    seed: 972,
    draw: (seed) => hotelVariantTile(seed, 0),
    light: { kind: 'facadeFlood', topZ: 48, halfW: 1.0 },
  },
  {
    // the parish presbytery — a modest classical court house.
    city: 'paris',
    key: 'presbytere',
    match: /^Presbyt[èe]re$/i,
    foot: [2, 2],
    seed: 973,
    draw: (seed) => hotelVariantTile(seed, 0),
    light: { kind: 'facadeFlood', topZ: 48, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-beauharnais',
    match: /H[ôo]tel de Beauharnais/i,
    foot: [2, 2],
    seed: 974,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-massa',
    match: /H[ôo]tel de Massa/i,
    foot: [2, 2],
    seed: 975,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-la-marine',
    match: /H[ôo]tel de la Marine/i,
    foot: [2, 2],
    seed: 976,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-lutetia',
    match: /H[ôo]tel Lut[ée]tia/i,
    foot: [2, 2],
    seed: 977,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-cassini',
    match: /H[ôo]tel de Cassini/i,
    foot: [2, 2],
    seed: 978,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-clermont',
    match: /H[ôo]tel de Clermont/i,
    foot: [2, 2],
    seed: 979,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-chaulnes',
    match: /H[ôo]tel de Chaulnes/i,
    foot: [2, 2],
    seed: 980,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-broglie',
    match: /H[ôo]tel de Broglie/i,
    foot: [2, 2],
    seed: 981,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-marigny',
    match: /H[ôo]tel de Marigny/i,
    foot: [2, 2],
    seed: 982,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-seignelay',
    match: /H[ôo]tel de Seignelay/i,
    foot: [2, 2],
    seed: 983,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-beauffremont',
    match: /H[ôo]tel de Beauffremont/i,
    foot: [2, 2],
    seed: 984,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-choiseul-praslin',
    match: /H[ôo]tel de Choiseul-Praslin/i,
    foot: [2, 2],
    seed: 985,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-salomon-de-rothschild',
    match: /H[ôo]tel Salomon de Rothschild/i,
    foot: [2, 2],
    seed: 986,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-comans-d-astry',
    match: /H[ôo]tel de Comans d'Astry/i,
    foot: [2, 2],
    seed: 987,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-rosambo',
    match: /H[ôo]tel de Rosambo/i,
    foot: [2, 2],
    seed: 988,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-fontpertuis',
    match: /H[ôo]tel de Fontpertuis/i,
    foot: [2, 2],
    seed: 989,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-montbrun',
    match: /H[ôo]tel de Montbrun/i,
    foot: [2, 2],
    seed: 990,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-montalivet',
    match: /H[ôo]tel de Montalivet/i,
    foot: [2, 2],
    seed: 991,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-d-asfeldt',
    match: /H[ôo]tel d'Asfeldt/i,
    foot: [2, 2],
    seed: 992,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-crozat',
    match: /H[ôo]tel Crozat/i,
    foot: [2, 2],
    seed: 993,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-colbert',
    match: /H[ôo]tel Colbert/i,
    foot: [2, 2],
    seed: 994,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-mansart',
    match: /H[ôo]tel Mansart/i,
    foot: [2, 2],
    seed: 995,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-walewska',
    match: /H[ôo]tel Walewska/i,
    foot: [2, 2],
    seed: 996,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-lebrun',
    match: /H[ôo]tel Lebrun/i,
    foot: [2, 2],
    seed: 997,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-moreau',
    match: /H[ôo]tel Moreau/i,
    foot: [2, 2],
    seed: 998,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-bony',
    match: /H[ôo]tel Bony/i,
    foot: [2, 2],
    seed: 999,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-mezzara',
    match: /H[ôo]tel Mezzara/i,
    foot: [2, 2],
    seed: 1000,
    draw: (seed) => hotelVariantTile(seed, 3),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-elysees-ceramic',
    match: /H[ôo]tel Elys[ée]es C[ée]ramic/i,
    foot: [2, 2],
    seed: 1001,
    draw: (seed) => hotelVariantTile(seed, 1),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'hotel-de-montmorin',
    match: /H[ôo]tel de Montmorin/i,
    foot: [2, 2],
    seed: 1002,
    draw: (seed) => hotelVariantTile(seed, 2),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.0 },
  },

  // ---- the last distinctive placed oddities ----
  {
    // La Pagode / Maison Loo — the red Chinese pagoda on rue de Courcelles.
    city: 'paris',
    key: 'maison-de-loo',
    match: /Maison de Loo/i,
    foot: [2, 2],
    seed: 1010,
    draw: (seed) => pagodeTile(seed),
    light: { kind: 'aerialBeacon', topZ: 96, halfW: 1.0 }, // gilt-ridge glow + finial
  },
  {
    // Adolf Loos's house for Tristan Tzara — austere modern-movement villa.
    city: 'paris',
    key: 'maison-de-tristan-tzara',
    match: /Maison de Tristan Tzara/i,
    foot: [2, 2],
    seed: 1011,
    draw: (seed) => maisonModerneTile(seed, false),
    light: { kind: 'towerCrown', topZ: 51, halfW: 1.0 },
  },
  {
    city: 'paris',
    key: 'abbaye-de-saint-maur',
    match: /Abbaye de Saint-Maur/i,
    foot: [2, 2],
    seed: 1012,
    draw: (seed) => abbayeTile(seed),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.0 },
  },

  // ---- FAMOUS ICONS (enrichment wave): world-famous landmarks now placed ----
  {
    city: 'paris',
    key: 'pantheon',
    match: /Panth[ée]on/i,
    foot: [2, 2],
    seed: 510101,
    draw: (seed) => pantheonTile(seed),
    light: { kind: 'facadeFlood', topZ: 200, halfW: 1.2 },
  },
  {
    city: 'paris',
    key: 'centre-pompidou',
    match: /(?:Centre (?:Georges[- ])?Pompidou|Beaubourg)/i,
    foot: [2, 2],
    seed: 197719,
    draw: (seed) => pompidouTile(seed),
    light: { kind: 'towerCrown', topZ: 96, halfW: 1.2 },
  },
  {
    city: 'paris',
    key: 'tour-montparnasse',
    match: /Tour Montparnasse|Tour Maine-Montparnasse/i,
    foot: [1, 1],
    seed: 210210,
    draw: (seed) => montparnasseTile(seed),
    light: { kind: 'towerCrown', topZ: 250, halfW: 0.3 },
  },
  {
    city: 'paris',
    key: 'hotel-de-ville-paris',
    match: /H[ôo]tel de Ville/i,
    foot: [2, 2],
    seed: 135700,
    draw: (seed) => hotelDeVilleTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'la-sorbonne',
    match: /Sorbonne/i,
    foot: [2, 2],
    seed: 125701,
    draw: (seed) => sorbonneTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.2 },
  },
  {
    city: 'paris',
    key: 'institut-de-france',
    match: /Institut de France|Coll[èe]ge des Quatre-Nations/i,
    foot: [2, 1],
    seed: 166201,
    draw: (seed) => institutDeFranceTile(seed),
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'conciergerie',
    match: /Conciergerie/i,
    foot: [2, 1],
    seed: 130101,
    draw: (seed) => conciergerieTile(seed),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'sainte-chapelle',
    match: /Sainte-Chapelle/i,
    foot: [1, 1],
    seed: 124801,
    draw: (seed) => sainteChapelleTile(seed),
    light: { kind: 'spireBeacon', topZ: 230, halfW: 0.3 },
  },
  {
    city: 'paris',
    key: 'petit-palais',
    match: /Petit Palais/i,
    foot: [2, 2],
    seed: 190001,
    draw: (seed) => petitPalaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'palais-de-chaillot',
    match: /(?:Palais de Chaillot|Trocad[ée]ro)/i,
    foot: [2, 2],
    seed: 193701,
    draw: (seed) => chaillotTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.4 },
  },
  {
    city: 'paris',
    key: 'grande-arche-de-la-defense',
    match: /(?:Grande Arche|Arche de la D[ée]fense)/i,
    foot: [2, 2],
    seed: 198901,
    draw: (seed) => grandeArcheTile(seed),
    light: { kind: 'archGlow', topZ: 132, halfW: 1.2 },
  },
  {
    city: 'paris',
    key: 'stade-de-france',
    match: /Stade de France/i,
    foot: [3, 3],
    seed: 199801,
    draw: (seed) => stadeDeFranceTile(seed),
    light: { kind: 'stadiumFlood', topZ: 64, halfW: 1.7 },
  },
  {
    city: 'paris',
    key: 'galeries-lafayette-haussmann',
    match: /Galeries Lafayette/i,
    foot: [2, 2],
    seed: 189401,
    draw: (seed) => galeriesLafayetteTile(seed),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'opera-bastille',
    match: /Op[ée]ra Bastille/i,
    foot: [2, 2],
    seed: 198902,
    draw: (seed) => operaBastilleTile(seed),
    light: { kind: 'towerCrown', topZ: 84, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'gare-du-nord',
    match: /Gare du Nord/i,
    foot: [2, 2],
    seed: 186401,
    draw: (seed) => gareTile(seed, 'nord'),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'gare-de-l-est',
    match: /Gare de l'Est/i,
    foot: [2, 2],
    seed: 184901,
    draw: (seed) => gareTile(seed, 'est'),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.3 },
  },
  {
    city: 'paris',
    key: 'gare-de-lyon',
    match: /Gare de Lyon/i,
    foot: [2, 2],
    seed: 190101,
    draw: (seed) => gareTile(seed, 'lyon'),
    light: { kind: 'aerialBeacon', topZ: 168, halfW: 1.3 },
  },
];
