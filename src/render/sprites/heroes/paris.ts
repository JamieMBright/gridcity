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
];
