// Berlin's bespoke-hero registry — ROUND 1 of the 100-hero target (docs/heroes/
// berlin/ holds 100 researched landmarks). Each entry resolves a PLACED name
// from src/data/cities/berlin.ts's `named` list to a hand-built iso sprite + a
// bespoke night-electrification light.
//
// Berlin reads GREY and HORIZONTAL: restrained Prussian sandstone + render
// (stucco) + grey zinc and verdigris copper, low and broad rather than spiky —
// so the palette here is sandstone/render/grey, and the marquee icons (the
// Brandenburg Gate's quadriga, the Reichstag's glass dome, the Berliner Dom's
// green copper dome, the Siegessäule's gold Victoria, the Museumsinsel
// colonnades) are what carry the silhouette. NB: the Fernsehturm/TV-Tower is
// NOT in this city's placed `named` list, so it cannot render as a hero this
// round (flagged to the parent) — a dormant entry would never resolve.
//
// `match` is tested against the PLACED name (German, incl. umlauts). The first
// hero whose `match` hits a name wins, so the BESPOKE Brandenburg is registered
// FIRST and matched tightly so the generic arch never steals it. `foot` MUST
// equal what each draw() builds (its `new Iso(w,h,…)`).
//
// SCOPE: this file only. The registry is already wired to import CITY_HEROES.

import type { BespokeHero } from './registry';
import { CELL_W, INK, INK_W, Iso, lit, RES, shaded, top } from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';

// --- shared Berlin palette (Prussian sandstone, render, grey zinc, copper) ---
const SAND = hex('#d8cbb0'); // warm Prussian sandstone (Reichstag, museums)
const SAND_D = hex('#bcae90');
const RENDER = hex('#e0ddd2'); // pale render / stucco (Schinkel, palaces)
const STONE = hex('#cfc7b6'); // cool ashlar (gothic, civic)
const ZINC = hex('#727a82'); // the grey zinc / lead mansard that crowns Berlin
const SLATE = hex('#3a424b'); // dark slate roofs (read near-black at dusk)
const COPPER = hex('#5fa389'); // verdigris copper dome (the Dom, cupolas)
const COPPER_D = hex('#4d8773');
const GILT = hex('#c8a24a'); // gilded quadriga / Victoria / dome ribs
const GILT_HOT = hex('#e8c25a');
const BRICK = hex('#9e4a3c'); // the Rotes Rathaus / Oberbaum red brick
const BRICK_D = hex('#823c31');
const STEEL = hex('#2b3138'); // Mies black steel (Neue Nationalgalerie)
const TENT = hex('#d9b14e'); // the Philharmonie's golden tent skin

// =====================================================================
// SHARED PRIMITIVES (Berlin-flavoured; each hero composes these freshly).
// =====================================================================

/** A half-dome / cupola as a stack of poly arcs at a screen point. Returns the
 *  tip Y for finials. `riseMul` scales the height; `bulb` rounds it toward an
 *  onion. The raster has no circle primitive, so domes are poly rings. */
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
  const prof = (a: number): number => (opts.bulb ? Math.sin(a) ** 0.8 : Math.sin(a));
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      pts.push([dx + Math.cos(a) * rPx * s, dyB - prof(a) * rise * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), shaded(body, 0.08), lit(body, 0.06));
  iso.r.poly(ring(0.58).map(([x, y]): Pt => [x + rPx * 0.16, y - rise * 0.12]), lit(body, 0.16));
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

/** A lantern drum + ball-finial crowning a dome tip. */
function lantern(iso: Iso, x: number, y: number, h: number, body: RGBA, finialCol: RGBA): void {
  iso.r.rect(x - 2.2 * RES, y - h * RES - 1 * RES, x + 2.2 * RES, y + 1.5 * RES, lighten(body, 0.12));
  iso.r.polyline(
    [[x - 2.2 * RES, y - h * RES], [x + 2.2 * RES, y - h * RES], [x + 2.2 * RES, y + 1.5 * RES]],
    INK_W * 0.5,
    alpha(INK, 0.7),
  );
  iso.r.line([x, y - h * RES], [x, y - h * RES - 6 * RES], 1.3 * RES, finialCol);
  iso.r.line([x - 2 * RES, y - h * RES - 4 * RES], [x + 2 * RES, y - h * RES - 4 * RES], 1 * RES, finialCol);
}

/** A row of slim columns (a portico/peristyle) on a face at fixed v, from u=uA
 *  to u=uB, between zBase and zTop. */
function colonnadeL(
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

/** A row of columns on the RIGHT face (fixed u), from v=vA to v=vB. */
function colonnadeR(
  iso: Iso,
  u: number,
  vA: number,
  vB: number,
  zBase: number,
  zTop: number,
  n: number,
  col: RGBA,
): void {
  for (let i = 0; i <= n; i++) {
    const v = vA + ((vB - vA) * i) / n;
    iso.r.poly(
      [iso.P(u, v - 0.012, zTop), iso.P(u, v + 0.012, zTop), iso.P(u, v + 0.012, zBase), iso.P(u, v - 0.012, zBase)],
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

/** A square corner pavilion-tower with a hipped slate/zinc cap. */
function cornerTower(
  iso: Iso,
  cu: number,
  cv: number,
  half: number,
  z0: number,
  body: number,
  cap: number,
  bodyC: RGBA,
  capC: RGBA,
): void {
  iso.box(cu - half, cv - half, cu + half, cv + half, z0, body, bodyC);
  const apex = iso.P(cu, cv, body + cap);
  const c0 = iso.P(cu - half, cv + half, body);
  const c1 = iso.P(cu + half, cv + half, body);
  const c2 = iso.P(cu + half, cv - half, body);
  iso.r.poly([c0, c1, apex], shaded(capC, 0.08));
  iso.r.poly([c1, c2, apex], lit(capC, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
}

// =====================================================================
// BRANDENBURGER TOR — Berlin's icon: a broad sandstone Doric SCREEN of six
// fluted columns per face carrying a deep entablature, crowned at the centre by
// the bronze QUADRIGA (Victoria in a four-horse chariot). Low and wide, set on
// open Pariser Platz. 2×2.
// =====================================================================
function brandenburgerTorTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.28, u1 = 1.72, v0 = 0.62, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a broad paved plaza apron (Pariser Platz)
  iso.box(0.1, 0.42, 1.9, 1.62, 0, 3, shaded(COLORS.pavement, 0.06), { ink: false });
  // the gate is a DEEP screen: a thick attic block carried on two ranks of
  // columns with a shaded passage between. Build the rear rank, then front.
  const ATT0 = 46, ATT1 = 60; // the great entablature/attic band
  // rear wall of the screen (dark passage behind the front colonnade)
  iso.box(u0 + 0.06, v0, u1 - 0.06, v0 + 0.16, 0, ATT0, shaded(SAND, 0.16), { ink: false });
  // front Doric colonnade across the long face (v1) — six bays + thick piers
  colonnadeL(iso, v1, u0 + 0.08, u1 - 0.08, 4, ATT0 - 2, 11, COLORS.white);
  // the thick end-piers (the gate's solid flanks read heavier than the columns)
  iso.box(u0, v0, u0 + 0.18, v1, 0, ATT0, SAND);
  iso.box(u1 - 0.18, v0, u1, v1, 0, ATT0, SAND);
  // the deep entablature + attic the columns carry
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, ATT0, ATT1, lighten(SAND, 0.06), {
    topC: top(SAND, 0.28),
  });
  // the metope frieze — a row of fine dark ticks along the entablature
  for (let i = 0; i <= 14; i++) {
    const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 14;
    iso.r.line(iso.P(u, v1, ATT0 + 3), iso.P(u, v1, ATT0 + 9), 0.7 * RES, alpha(SAND_D, 0.8));
  }
  // ---- the QUADRIGA on the central attic: Victoria + four horses, bronze ----
  const cx = (u0 + u1) / 2;
  const baseZ = ATT1;
  const [qx, qyB] = iso.P(cx, v1 - 0.18, baseZ);
  const QH = 26 * RES; // chariot-group height
  // a low plinth under the group
  iso.r.rect(qx - 9 * RES, qyB - 2 * RES, qx + 9 * RES, qyB + 1 * RES, lighten(SAND, 0.08));
  // four horses abreast: overlapping legs + bodies + arched necks, all bronze
  for (let k = 0; k < 4; k++) {
    const hx = qx - 7 * RES + k * 4.2 * RES;
    iso.r.poly(
      [
        [hx - 2.4 * RES, qyB - 2 * RES],
        [hx + 2.4 * RES, qyB - 2 * RES],
        [hx + 2.4 * RES, qyB - 9 * RES],
        [hx + 0.6 * RES, qyB - 9 * RES],
        [hx - 2.4 * RES, qyB - 6 * RES],
      ],
      k % 2 ? COPPER : lit(COPPER, 0.12),
      COPPER_D,
    );
    // arched neck + head
    iso.r.line([hx + 1.6 * RES, qyB - 8 * RES], [hx + 3.4 * RES, qyB - 13 * RES], 1.4 * RES, lit(COPPER, 0.1));
    // legs
    iso.r.line([hx - 1.6 * RES, qyB - 2 * RES], [hx - 1.6 * RES, qyB + 1 * RES], 1 * RES, COPPER_D);
    iso.r.line([hx + 1.4 * RES, qyB - 2 * RES], [hx + 1.4 * RES, qyB + 1 * RES], 1 * RES, COPPER_D);
  }
  // Victoria standing in the chariot behind the team, holding the staff
  const vicX = qx - 6 * RES;
  iso.r.poly(
    [[vicX - 1.6 * RES, qyB - 2 * RES], [vicX + 1.6 * RES, qyB - 2 * RES], [vicX + 1 * RES, qyB - QH], [vicX - 1 * RES, qyB - QH]],
    lit(COPPER, 0.14),
    COPPER_D,
  );
  // the iron standard with the Prussian eagle/wreath
  iso.r.line([vicX, qyB - QH], [vicX, qyB - QH - 9 * RES], 1.2 * RES, GILT_HOT);
  iso.r.poly(
    [[vicX - 2.2 * RES, qyB - QH - 9 * RES], [vicX + 2.2 * RES, qyB - QH - 9 * RES], [vicX, qyB - QH - 13 * RES]],
    GILT,
  );
  iso.glint([vicX, qyB - QH - 4 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// REICHSTAGSGEBÄUDE — the Wilhelmine sandstone parliament: a massive rusticated
// block with four corner pavilion-towers and a giant western portico under a
// pediment ("DEM DEUTSCHEN VOLKE"), crowned at the centre by Foster's modern
// GLASS DOME with its inverted mirror-cone — a beacon at dusk. 4×4, broad.
// =====================================================================
function reichstagTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.36, u1 = 3.64, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the great rusticated stone block — a TALL heavy mass (3 grand storeys)
  iso.box(u0, v0, u1, v1, 0, 84, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 16, shaded(SAND, 0.14), { ink: false });
  // three storeys of regular windows down the visible flanks
  iso.windowsLeft(v1, u0 + 0.18, u1 - 0.18, 20, 38, 12, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsLeft(v1, u0 + 0.18, u1 - 0.18, 44, 60, 12, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsLeft(v1, u0 + 0.18, u1 - 0.18, 66, 78, 12, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsRight(u1, v0 + 0.18, v1 - 0.18, 20, 38, 11, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsRight(u1, v0 + 0.18, v1 - 0.18, 44, 60, 11, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  // a balustraded parapet capping the block
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 84, 90, lighten(SAND, 0.08), { topC: top(SAND, 0.3) });
  // the giant western PORTICO + pediment projecting from the front (v1)
  const pcx = (u0 + u1) / 2;
  iso.box(pcx - 0.56, v1 - 0.2, pcx + 0.56, v1, 0, 88, lighten(SAND, 0.03));
  colonnadeL(iso, v1, pcx - 0.48, pcx + 0.48, 14, 84, 7, COLORS.white);
  pediment(iso, v1, pcx - 0.54, pcx + 0.54, 88, 16, SAND);
  // the four corner pavilion-towers (tall + square, with pyramidal zinc caps + flags)
  for (const [cu, cv] of [
    [u0 + 0.32, v0 + 0.32],
    [u1 - 0.32, v0 + 0.32],
    [u0 + 0.32, v1 - 0.32],
    [u1 - 0.32, v1 - 0.32],
  ] as const) {
    cornerTower(iso, cu, cv, 0.3, 0, 108, 14, SAND, ZINC);
    const ft = iso.P(cu, cv, 122);
    iso.r.line(ft, [ft[0], ft[1] - 8 * RES], 1 * RES, GILT);
    iso.r.line([ft[0], ft[1] - 8 * RES], [ft[0] + 5 * RES, ft[1] - 6 * RES], 0.9 * RES, alpha(COLORS.glassLit, 0.9));
  }
  // ---- Foster's modern GLASS DOME over the centre (big, on a stone drum) ----
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  // a circular stone drum the dome springs from
  iso.box(cx - 0.62, cy - 0.62, cx + 0.62, cy + 0.62, 84, 100, lighten(SAND, 0.04));
  const [dx, dyB] = iso.P(cx, cy, 100);
  const DR = 0.78 * (CELL_W / 2);
  // glass dome: a glowing hemisphere of pale sky-glass with spiral mullions
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.sin(a) * DR * 1.02 * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), alpha(COLORS.glassSky, 0.92), alpha(COLORS.glassLit, 0.5));
  // ramp/mullion lines spiralling up the glass
  for (let k = -4; k <= 4; k++) {
    iso.r.line([dx + (k / 4.2) * DR, dyB], [dx + (k / 12) * DR, dyB - DR], 0.6 * RES, alpha(COLORS.white, 0.7));
  }
  for (const z of [0.3, 0.58, 0.82]) {
    const r = DR * (1 - z * 0.7);
    iso.r.line([dx - r, dyB - z * DR], [dx + r, dyB - z * DR], 0.5 * RES, alpha(COLORS.white, 0.55));
  }
  iso.r.polyline(ring(1), INK_W * 0.8, INK);
  // the central inverted mirror-cone glinting inside, + tip light-funnel
  iso.r.poly([[dx - 4 * RES, dyB - 2 * RES], [dx + 4 * RES, dyB - 2 * RES], [dx, dyB - DR * 0.72]], alpha(COLORS.glassLit, 0.6));
  iso.glint([dx, dyB - DR * 0.5], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// BERLINER DOM — the great High-Renaissance/Baroque cathedral on Museum
// Island: a domed central mass (huge ribbed verdigris-COPPER dome + lantern)
// flanked by four smaller corner cupola-towers, over a heavy sandstone body
// with a columned portico to the Lustgarten. 4×4, broad and tall.
// =====================================================================
function berlinerDomTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 260 });
  void seed;
  const u0 = 0.42, u1 = 3.58, v0 = 0.52, v1 = 3.48;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the heavy sandstone body — taller so the roof reads as a wall, not a slab
  iso.box(u0, v0, u1, v1, 0, 74, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 14, shaded(SAND, 0.14), { ink: false });
  // two tiers of tall round-headed windows down the flanks
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 18, 40, 9, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 46, 64, 9, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsRight(u1, v0 + 0.16, v1 - 0.16, 18, 40, 8, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  iso.windowsRight(u1, v0 + 0.16, v1 - 0.16, 46, 64, 8, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.1));
  // columned portico + pediment toward the Lustgarten (front v1)
  const pcx = (u0 + u1) / 2;
  iso.box(pcx - 0.5, v1 - 0.16, pcx + 0.5, v1, 0, 78, lighten(SAND, 0.03));
  colonnadeL(iso, v1, pcx - 0.44, pcx + 0.44, 16, 74, 7, COLORS.white);
  pediment(iso, v1, pcx - 0.48, pcx + 0.48, 78, 15, SAND);
  // a heavy attic balustrade
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 74, 82, lighten(SAND, 0.08), { topC: top(SAND, 0.3) });
  // ---- four corner copper CUPOLA-towers (bigger, taller) ----
  for (const [cu, cv] of [
    [u0 + 0.4, v0 + 0.4],
    [u1 - 0.4, v0 + 0.4],
    [u0 + 0.4, v1 - 0.4],
    [u1 - 0.4, v1 - 0.4],
  ] as const) {
    iso.box(cu - 0.28, cv - 0.28, cu + 0.28, cv + 0.28, 74, 116, lighten(SAND, 0.04));
    const { tipX, tipY } = domeAt(iso, cu, cv, 116, 0.28 * (CELL_W / 2), 1.3, COPPER, { bulb: true, ribs: 4 });
    iso.r.line([tipX, tipY], [tipX, tipY - 8 * RES], 1 * RES, GILT);
    iso.r.line([tipX - 2 * RES, tipY - 6 * RES], [tipX + 2 * RES, tipY - 6 * RES], 0.8 * RES, GILT_HOT);
  }
  // ---- the great central DOME on a tall colonnaded drum — DOMINATES ----
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  // a big square base filling much of the roof
  iso.box(cx - 0.86, cy - 0.86, cx + 0.86, cy + 0.86, 74, 104, lighten(SAND, 0.04));
  // tall round colonnaded drum
  const [drx, dryB] = iso.P(cx, cy + 0.86, 0);
  const DRr = 0.86 * (CELL_W / 2);
  iso.box(cx - 0.78, cy - 0.78, cx + 0.78, cy + 0.78, 104, 148, lighten(SAND, 0.03));
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    const px = drx + Math.cos(a) * DRr * 0.9;
    const py = dryB - 124 * RES + Math.sin(a) * DRr * 0.9 * 0.46;
    iso.r.line([px, py - 14 * RES], [px, py + 14 * RES], 1.3 * RES, a < Math.PI * 0.45 ? lit(COLORS.white, 0.1) : COLORS.white);
  }
  // the gallery ring the dome springs from
  iso.box(cx - 0.8, cy - 0.8, cx + 0.8, cy + 0.8, 156, 164, lighten(SAND, 0.08), { ink: false });
  // the great ribbed verdigris-copper dome (tall, bulbous — towers over Mitte)
  const { tipX, tipY } = domeAt(iso, cx, cy, 164, DRr * 0.88, 1.5, COPPER, { ribs: 8, bulb: true });
  // gilt lantern + cross/orb at the very top
  lantern(iso, tipX, tipY, 16, COPPER_D, GILT_HOT);
  iso.r.line([tipX, tipY - 16 * RES], [tipX, tipY - 28 * RES], 1.4 * RES, GILT_HOT);
  iso.r.line([tipX - 3 * RES, tipY - 24 * RES], [tipX + 3 * RES, tipY - 24 * RES], 1 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 8 * RES], 2.8 * RES);
  return iso.build();
}

// =====================================================================
// SIEGESSÄULE — the Victory Column: a tall fluted sandstone column banded with
// three drums of gilded captured cannon-barrels, on a red-granite colonnaded
// plinth, crowned by the gilt-bronze VICTORIA ("Goldelse") with wreath + staff.
// Slim 1×1 with big headroom — it SPIKES up over the Tiergarten roundabout.
// =====================================================================
function siegessauleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 320 });
  void seed;
  const GRANITE = hex('#7a4a44'); // red polished granite plinth
  const u = 0.5, v = 0.5;
  const H = 196;
  iso.shadow(u - 0.26, v - 0.16, u + 0.26, v + 0.3, 0.34, 0.24);
  // grass roundabout (Großer Stern)
  iso.box(u - 0.46, v - 0.46, u + 0.46, v + 0.46, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // square stepped plinth
  iso.box(u - 0.26, v - 0.22, u + 0.26, v + 0.22, 3, 22, GRANITE);
  // the colonnaded hall ring around the base (a band of short columns)
  colonnadeL(iso, v + 0.22, u - 0.24, u + 0.24, 24, 36, 7, lit(GRANITE, 0.12));
  iso.box(u - 0.28, v - 0.24, u + 0.28, v + 0.24, 36, 40, lighten(GRANITE, 0.06), { ink: false });
  // the tall fluted column shaft, three diminishing drums
  const b = 0.12;
  iso.box(u - b, v - b, u + b, v + b, 40, H * 0.55, SAND);
  iso.box(u - b * 0.92, v - b * 0.92, u + b * 0.92, v + b * 0.92, H * 0.55, H * 0.82, SAND);
  iso.box(u - b * 0.84, v - b * 0.84, u + b * 0.84, v + b * 0.84, H * 0.82, H * 0.96, SAND);
  // the gilded cannon-barrel bands glinting on each drum (the famous gold)
  for (const z of [40, H * 0.55, H * 0.82] as const) {
    const a = iso.P(u - b, v + b, z + 3);
    const c = iso.P(u + b, v + b, z + 3);
    iso.r.line(a, c, 2.4 * RES, GILT);
    iso.r.line([a[0], a[1] - 1.5 * RES], [c[0], c[1] - 1.5 * RES], 0.8 * RES, GILT_HOT);
    const d = iso.P(u + b, v - b, z + 3);
    iso.r.line(c, d, 2.4 * RES, lit(GILT, 0.1));
  }
  // ---- VICTORIA on the capital: a gilt winged figure, wreath raised ----
  const capZ = H * 0.96;
  const [vx, vyB] = iso.P(u, v, capZ + 4);
  const VH = 22 * RES;
  // body
  iso.r.poly([[vx - 2 * RES, vyB], [vx + 2 * RES, vyB], [vx + 1.2 * RES, vyB - VH], [vx - 1.2 * RES, vyB - VH]], GILT, COPPER_D);
  // the big wings spreading behind
  iso.r.poly([[vx - 1 * RES, vyB - VH * 0.7], [vx - 7 * RES, vyB - VH * 1.1], [vx - 2 * RES, vyB - VH * 0.3]], lit(GILT, 0.12));
  iso.r.poly([[vx + 1 * RES, vyB - VH * 0.7], [vx + 7 * RES, vyB - VH * 1.1], [vx + 2 * RES, vyB - VH * 0.3]], GILT);
  // the staff with the iron cross, and the raised wreath arm
  iso.r.line([vx, vyB - VH], [vx, vyB - VH - 8 * RES], 1.2 * RES, GILT_HOT);
  iso.r.line([vx - 3 * RES, vyB - VH - 2 * RES], [vx + 2 * RES, vyB - VH + 2 * RES], 1.1 * RES, GILT_HOT);
  iso.glint([vx, vyB - VH * 0.6], 2.4 * RES);
  return iso.build();
}

// =====================================================================
// ROTES RATHAUS — the Red Town Hall: a long red-BRICK Renaissance-Revival block
// in Rundbogenstil (round-arched arcades), with a tall central CLOCK-TOWER
// (74 m) over the entrance. Berlin's civic landmark. 4×4.
// =====================================================================
function rotesRathausTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.4, u1 = 3.6, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the long red-brick body, three storeys
  iso.box(u0, v0, u1, v1, 0, 52, BRICK);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(BRICK, 0.16), { ink: false });
  // a sandstone string-course banding the storeys (the brick read needs relief)
  for (const z of [18, 36] as const) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.3 * RES, lighten(SAND, 0.06));
    iso.r.line(iso.P(u1, v0, z), iso.P(u1, v1, z), 1.3 * RES, lighten(SAND, 0.06));
  }
  // round-arched window arcades down the flanks (Rundbogenstil)
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 8, 16, 14, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 22, 32, 14, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 40, 48, 14, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsRight(u1, v0 + 0.16, v1 - 0.16, 22, 32, 13, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  // a sandstone cornice + low hipped roof
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 52, 56, lighten(SAND, 0.06), { topC: top(SAND, 0.3) });
  iso.gable(u0, v0, u1, v1, 56, 8, 'v', SLATE, BRICK);
  // ---- the central CLOCK-TOWER over the entrance (front v1) ----
  const cx = (u0 + u1) / 2;
  const tw = 0.32;
  iso.box(cx - tw, v1 - 0.4, cx + tw, v1 - 0.02, 0, 120, BRICK);
  // string-courses up the tower
  for (const z of [40, 74, 100] as const) {
    iso.r.line(iso.P(cx - tw, v1 - 0.02, z), iso.P(cx + tw, v1 - 0.02, z), 1.2 * RES, lighten(SAND, 0.06));
  }
  // the clock dial near the top
  const [clx, cly] = iso.P(cx, v1 - 0.02, 102);
  const RR = 4.4 * RES;
  const dial: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    dial.push([clx + Math.cos(a) * RR, cly - RR * 0.8 + Math.sin(a) * RR]);
  }
  iso.r.poly(dial, COLORS.white);
  iso.r.polyline(dial, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly - RR * 0.8], [clx, cly - RR * 0.8 - 2.4 * RES], 0.9 * RES, INK);
  iso.r.line([clx, cly - RR * 0.8], [clx + 2 * RES, cly - RR * 0.8], 0.9 * RES, INK);
  // belfry arches + a sandstone cornice + low pyramidal roof with finial
  colonnadeL(iso, v1 - 0.02, cx - tw + 0.04, cx + tw - 0.04, 108, 118, 3, lighten(SAND, 0.04));
  iso.box(cx - tw - 0.03, v1 - 0.42, cx + tw + 0.03, v1, 118, 122, lighten(SAND, 0.08), { ink: false });
  const apex = iso.P(cx, v1 - 0.21, 138);
  const e0 = iso.P(cx - tw, v1 - 0.02, 122);
  const e1 = iso.P(cx + tw, v1 - 0.02, 122);
  const e2 = iso.P(cx + tw, v1 - 0.4, 122);
  iso.r.poly([e0, e1, apex], shaded(SLATE, 0.06));
  iso.r.poly([e1, e2, apex], lit(SLATE, 0.06));
  iso.r.polyline([e0, apex, e2], INK_W * 0.6, INK);
  iso.r.line(apex, [apex[0], apex[1] - 6 * RES], 1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// ALTES MUSEUM — Schinkel's neoclassical museum: a long low stone block whose
// entire front is a magnificent screen of EIGHTEEN Ionic columns under a plain
// attic, with a central drum/ROTUNDA (a Pantheon-like dome) glimpsed behind.
// The purest Berlin horizontal. 5×5 broad.
// =====================================================================
function altesMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.18);
  // the long stone block — a little taller so it reads as a building, not a pad
  iso.box(u0, v0, u1, v1, 0, 56, RENDER);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 11, shaded(RENDER, 0.12), { ink: false });
  // the great Ionic colonnade screen across the WHOLE front (v1) — 18 columns
  colonnadeL(iso, v1, u0 + 0.08, u1 - 0.08, 12, 52, 18, COLORS.white);
  // a recessed wall behind the colonnade so the columns read in relief
  iso.windowsLeft(v1 - 0.06, u0 + 0.12, u1 - 0.12, 14, 50, 9, alpha(COLORS.glassDark, 0.7), undefined);
  // also a colonnade returning down the right (u1) flank
  colonnadeR(iso, u1, v0 + 0.1, v1 - 0.1, 12, 52, 18, COLORS.white);
  // a plain deep attic over the columns (the inscription band)
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 56, 66, lighten(RENDER, 0.06), { topC: top(RENDER, 0.28) });
  // the central rotunda drum + Pantheon dome rising behind the attic (bigger)
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 + 0.1;
  iso.box(cx - 0.74, cy - 0.74, cx + 0.74, cy + 0.74, 56, 86, lighten(RENDER, 0.03));
  domeAt(iso, cx, cy, 86, 0.74 * (CELL_W / 2), 0.82, ZINC, { ribs: 7 });
  // the eagle/quadriga sculptures flanking the attic corners (small bronze pips)
  for (const cu of [u0 + 0.3, u1 - 0.3] as const) {
    const q = iso.P(cu, v1, 54);
    iso.r.poly([[q[0] - 3 * RES, q[1]], [q[0] + 3 * RES, q[1]], [q[0], q[1] - 5 * RES]], COPPER);
  }
  return iso.build();
}

// =====================================================================
// PERGAMONMUSEUM — Messel's Stripped-Classicism museum: a monumental U-plan of
// three heavy ashlar wings around an open court, with a giant temple-like
// pier-portico (square antae, no capitals) facing the Kupfergraben. Massive,
// austere, grey. 5×5.
// =====================================================================
function pergamonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.4, u1 = 4.6, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.18);
  // three tall wings forming a U open toward the viewer (court at front-centre)
  iso.box(u0, v0, u1, v0 + 1.05, 0, 78, STONE); // back wing (taller)
  iso.box(u0, v0, u0 + 1.05, v1, 0, 72, STONE); // left wing
  iso.box(u1 - 1.05, v0, u1, v1, 0, 72, STONE); // right wing
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(STONE, 0.14), { ink: false });
  // the open court floor between the wings
  iso.box(u0 + 1.05, v0 + 1.05, u1 - 1.05, v1, 0, 4, shaded(COLORS.pavement, 0.06), { ink: false });
  // rows of tall narrow windows up the outer flanks (massive austere walls)
  iso.windowsLeft(v1, u0 + 0.12, u0 + 0.95, 24, 64, 4, alpha(COLORS.glassDark, 0.8), lighten(STONE, 0.08));
  iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, 24, 64, 7, alpha(COLORS.glassDark, 0.8), lighten(STONE, 0.08));
  // the giant square-pier PORTICO: tall heavy square antae marching along the
  // court-facing inner faces of the side wings (the austere Messel colonnade).
  const PT0 = 14, PT1 = 70;
  for (const cu of [u0 + 0.6, u1 - 0.6] as const) {
    for (let i = 0; i < 4; i++) {
      const vv = v1 - 0.12 - i * 0.26;
      iso.box(cu - 0.06, vv - 0.04, cu + 0.06, vv + 0.04, PT0, PT1, lighten(STONE, 0.05));
    }
  }
  // a deep entablature/attic band capping all wings (the austere skyline)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v0 + 1.07, 78, 86, lighten(STONE, 0.06), { topC: top(STONE, 0.26) });
  iso.box(u0 - 0.02, v0 - 0.02, u0 + 1.07, v1 + 0.02, 72, 80, lighten(STONE, 0.06), { topC: top(STONE, 0.26) });
  iso.box(u1 - 1.07, v0 - 0.02, u1 + 0.02, v1 + 0.02, 72, 80, lighten(STONE, 0.06), { topC: top(STONE, 0.26) });
  return iso.build();
}

// =====================================================================
// BODE-MUSEUM — Ihne's Baroque-Revival museum on the northern SPIT of Museum
// Island: a long stone palace mass with a dramatic rounded prow capped by a
// great verdigris-COPPER dome + lantern at the point of the island. 4×4.
// =====================================================================
function bodeMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 160 });
  void seed;
  const u0 = 0.4, u1 = 3.6, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // water around the spit (the Spree)
  iso.box(0.05, 0.05, 3.95, 3.95, 0, 1, shaded(COLORS.water, 0.04), { ink: false });
  // the long baroque body — taller, two grand storeys
  iso.box(u0, v0 + 0.5, u1, v1, 0, 70, RENDER);
  iso.box(u0 - 0.03, v0 + 0.47, u1 + 0.03, v1 + 0.03, 0, 12, shaded(RENDER, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 16, 36, 12, alpha(COLORS.glassDark, 0.85), lighten(RENDER, 0.1));
  iso.windowsLeft(v1, u0 + 0.16, u1 - 0.16, 42, 60, 12, alpha(COLORS.glassDark, 0.85), lighten(RENDER, 0.1));
  iso.windowsRight(u1, v0 + 0.6, v1 - 0.16, 16, 60, 9, alpha(COLORS.glassDark, 0.85), lighten(RENDER, 0.1));
  // a balustraded parapet + steep zinc mansard
  iso.box(u0 - 0.02, v0 + 0.48, u1 + 0.02, v1 + 0.02, 70, 74, lighten(RENDER, 0.06), { topC: top(RENDER, 0.3) });
  iso.gable(u0, v0 + 0.5, u1, v1, 74, 12, 'v', ZINC, RENDER);
  // ---- the rounded PROW at the point (north end, low v) + great dome ----
  const cx = (u0 + u1) / 2, cy = v0 + 0.5;
  // a tall cylindrical prow drum across the front
  iso.box(cx - 0.66, cy - 0.5, cx + 0.66, cy + 0.18, 0, 82, lighten(RENDER, 0.02));
  // two tiers of columns wrapping the curved prow
  colonnadeL(iso, cy + 0.18, cx - 0.6, cx + 0.6, 16, 44, 9, COLORS.white);
  colonnadeL(iso, cy + 0.18, cx - 0.6, cx + 0.6, 50, 78, 9, COLORS.white);
  iso.box(cx - 0.68, cy - 0.52, cx + 0.68, cy + 0.2, 82, 90, lighten(RENDER, 0.08), { ink: false });
  // the great copper dome + lantern over the prow (bigger, towers)
  const { tipX, tipY } = domeAt(iso, cx, cy - 0.16, 90, 0.62 * (CELL_W / 2), 1.32, COPPER, { ribs: 8, bulb: true });
  lantern(iso, tipX, tipY, 13, COPPER_D, GILT_HOT);
  iso.r.line([tipX, tipY - 13 * RES], [tipX, tipY - 22 * RES], 1.2 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 6 * RES], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// BERLINER PHILHARMONIE — Scharoun's expressionist concert hall: a sculptural
// cluster of faceted tent-like masses clad in GOLD anodized aluminium, the big
// peaked auditorium roof billowing up over lower foyer volumes. No columns, no
// symmetry — the silhouette is jagged golden tents. 3×3.
// =====================================================================
function philharmonieTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // a low golden podium base
  iso.box(u0, v0, u1, v1, 0, 22, lit(TENT, 0.04));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 7, shaded(TENT, 0.14), { ink: false });
  // facets of glazing round the podium
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 6, 18, 9, alpha(COLORS.glassLit, 0.5), undefined);
  // ---- the big billowing auditorium tent (an off-centre faceted peak) ----
  const cx = u0 + 1.15, cy = v0 + 1.05;
  const peak = iso.P(cx, cy, 86);
  // five faceted roof panels fanning from the peak down to the podium rim
  const rim: Pt[] = [
    iso.P(u0 + 0.2, v1 - 0.2, 22),
    iso.P(u1 - 0.5, v1 - 0.1, 22),
    iso.P(u1 - 0.2, v0 + 0.5, 22),
    iso.P(cx + 0.3, v0 + 0.2, 22),
    iso.P(u0 + 0.3, v0 + 0.4, 22),
  ];
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i]!;
    const b = rim[(i + 1) % rim.length]!;
    const shade = i % 2 ? shaded(TENT, 0.06) : lit(TENT, 0.1);
    iso.r.poly([a, b, peak], shade);
    iso.r.line(a, peak, INK_W * 0.55, alpha(INK, 0.7));
  }
  iso.r.polyline(rim, INK_W * 0.7, INK, true);
  // ---- a second, smaller tent (the chamber-music hall) beside it ----
  const cx2 = u1 - 0.7, cy2 = v1 - 0.7;
  const peak2 = iso.P(cx2, cy2, 56);
  const rim2: Pt[] = [
    iso.P(cx2 - 0.4, cy2 + 0.35, 22),
    iso.P(cx2 + 0.35, cy2 + 0.3, 22),
    iso.P(cx2 + 0.35, cy2 - 0.35, 22),
    iso.P(cx2 - 0.35, cy2 - 0.3, 22),
  ];
  for (let i = 0; i < rim2.length; i++) {
    const a = rim2[i]!;
    const b = rim2[(i + 1) % rim2.length]!;
    iso.r.poly([a, b, peak2], i % 2 ? shaded(TENT, 0.05) : lit(TENT, 0.08));
    iso.r.line(a, peak2, INK_W * 0.5, alpha(INK, 0.6));
  }
  iso.glint(peak, 2.4 * RES);
  return iso.build();
}

// =====================================================================
// NEUE NATIONALGALERIE — Mies van der Rohe's temple of glass + steel: a single
// vast flat black STEEL coffered roof-plate floating on eight slim cruciform
// steel columns over an all-glass pavilion, on a broad granite podium. The most
// minimal hero on the map — its silhouette is a thin floating slab. 3×3.
// =====================================================================
function neueNationalgalerieTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.4, v1 = 2.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the broad granite podium
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 10, shaded(hex('#8d8a86'), 0.1));
  // the all-glass pavilion (set in from the roof edge — the roof oversails)
  const g0 = 0.62, g1u = u1 - 0.32, g1v = v1 - 0.32;
  iso.box(g0, g0, g1u, g1v, 10, 40, alpha(COLORS.glassSky, 0.5), {
    leftC: alpha(COLORS.glassDark, 0.6),
    rightC: alpha(COLORS.glassLit, 0.35),
    ink: false,
  });
  // mullions on the glass
  for (let i = 1; i < 7; i++) {
    const u = g0 + ((g1u - g0) * i) / 7;
    iso.r.line(iso.P(u, g1v, 10), iso.P(u, g1v, 40), 0.6 * RES, alpha(STEEL, 0.7));
  }
  // the eight slim cruciform steel columns carrying the plate (at the edges)
  for (const [cu, cv] of [
    [u0 + 0.2, v0 + 0.2], [u0 + 1.2, v0 + 0.15], [u1 - 0.2, v0 + 0.2],
    [u0 + 0.18, v1 - 0.2], [u0 + 1.2, v1 - 0.12], [u1 - 0.2, v1 - 0.2],
    [u1 - 0.15, v0 + 1.2], [u0 + 0.2, v0 + 1.2],
  ] as const) {
    iso.r.line(iso.P(cu, cv, 10), iso.P(cu, cv, 44), 1.4 * RES, STEEL);
  }
  // ---- the great floating flat ROOF-PLATE (thin, oversailing, black) ----
  iso.box(u0, v0, u1, v1, 44, 50, STEEL, { topC: lighten(STEEL, 0.06) });
  // a fine coffer grid on the underside edge (the famous waffle slab)
  for (let i = 1; i < 8; i++) {
    const u = u0 + ((u1 - u0) * i) / 8;
    iso.r.line(iso.P(u, v1, 44), iso.P(u, v1, 44), 0.5 * RES, alpha(STEEL, 0.4));
  }
  iso.r.line(iso.P(u0, v1, 44), iso.P(u1, v1, 44), 0.8 * RES, alpha(lighten(STEEL, 0.1), 0.8));
  return iso.build();
}

// =====================================================================
// DEUTSCHER DOM / domed Gendarmenmarkt tower — a tall stone DRUM-tower crowned
// by a domed colonnaded tempietto + lantern (the matching pair on Gendarmenmarkt:
// the German & French cathedrals are tower-monuments, not churches). The placed
// name is "Deutscher Dom". A tall slim domed tower over a low church body. 2×2.
// =====================================================================
function gendarmenmarktDomTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // low church body with a pedimented portico
  iso.box(u0, v0, u1, v1 - 0.2, 0, 36, RENDER);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 - 0.18, 0, 8, shaded(RENDER, 0.12), { ink: false });
  iso.box(u0 + 0.16, v1 - 0.2, u1 - 0.16, v1, 0, 30, lighten(RENDER, 0.03));
  colonnadeL(iso, v1, u0 + 0.22, u1 - 0.22, 8, 28, 5, COLORS.white);
  pediment(iso, v1, u0 + 0.2, u1 - 0.2, 30, 9, RENDER);
  // ---- the tall domed TOWER behind ----
  const cx = (u0 + u1) / 2, cy = v0 + 0.42;
  iso.box(cx - 0.26, cy - 0.26, cx + 0.26, cy + 0.26, 36, 96, RENDER); // tall square drum
  iso.windowsRight(cx + 0.26, cy - 0.2, cy + 0.2, 56, 88, 2, alpha(COLORS.glassDark, 0.85), lighten(RENDER, 0.1));
  // a circular colonnaded tempietto stage
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 96, 106, lighten(RENDER, 0.04));
  colonnadeL(iso, cy + 0.22, cx - 0.2, cx + 0.2, 96, 106, 4, COLORS.white);
  // copper-grey ribbed dome + gilt lantern
  const { tipX, tipY } = domeAt(iso, cx, cy, 106, 0.24 * (CELL_W / 2), 1.2, ZINC, { ribs: 5, bulb: true });
  lantern(iso, tipX, tipY, 9, ZINC, GILT_HOT);
  return iso.build();
}

// =====================================================================
// ST. HEDWIGS-KATHEDRALE — the Catholic cathedral modelled on the Pantheon: a
// squat cylindrical rotunda with a portico and a broad shallow green-COPPER
// saucer dome + lantern. Low and round. 2×2.
// =====================================================================
function stHedwigTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const cx = 1.0, cy = 1.0;
  iso.shadow(0.4, 0.5, 1.6, 1.5, 0.2, 0.22);
  // the cylindrical rotunda body (square base read as a drum)
  iso.box(0.42, 0.5, 1.58, 1.5, 0, 44, RENDER);
  iso.box(0.4, 0.48, 1.6, 1.52, 0, 9, shaded(RENDER, 0.12), { ink: false });
  // a temple portico on the front
  iso.box(0.5, 1.46, 1.5, 1.56, 0, 34, lighten(RENDER, 0.03));
  colonnadeL(iso, 1.56, 0.56, 1.44, 8, 32, 6, COLORS.white);
  pediment(iso, 1.56, 0.54, 1.46, 34, 10, RENDER);
  // attic ring the dome springs from
  iso.box(0.46, 0.54, 1.54, 1.46, 44, 50, lighten(RENDER, 0.06), { ink: false });
  // the broad shallow green saucer-dome
  const { tipX, tipY } = domeAt(iso, cx, cy, 50, 0.52 * (CELL_W / 2), 0.74, COPPER, { ribs: 7 });
  lantern(iso, tipX, tipY, 8, COPPER_D, GILT_HOT);
  return iso.build();
}

// =====================================================================
// NEUE SYNAGOGE — the Moorish-Revival synagogue on Oranienburger Straße: a
// striped brick-and-terracotta facade rising to a dramatic gilded, RIBBED bulb
// DOME flanked by two smaller turret-domes — the gleaming gold landmark of the
// Spandauer Vorstadt. 2×2.
// =====================================================================
function neueSynagogeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const BRICKM = hex('#a86a52'); // warm Moorish brick
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the body
  iso.box(u0, v0, u1, v1, 0, 50, BRICKM);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(BRICKM, 0.16), { ink: false });
  // polychrome banding (terracotta string-courses)
  for (const z of [18, 32, 46] as const) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.2 * RES, lit(GILT, 0.08));
  }
  // a big horseshoe-arched portal + rose on the front
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 16, 40, 5, alpha(COLORS.glassDark, 0.85), lit(GILT, 0.06));
  // two flanking turret-domes
  for (const cu of [u0 + 0.16, u1 - 0.16] as const) {
    iso.box(cu - 0.1, v1 - 0.22, cu + 0.1, v1 - 0.02, 50, 62, lighten(BRICKM, 0.04));
    const { tipX, tipY } = domeAt(iso, cu, v1 - 0.12, 62, 0.1 * (CELL_W / 2), 1.4, GILT, { bulb: true, ribs: 4 });
    iso.r.line([tipX, tipY], [tipX, tipY - 5 * RES], 0.9 * RES, GILT_HOT);
  }
  // ---- the great central gilded RIBBED bulb dome ----
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 50, 74, lighten(BRICKM, 0.03)); // drum
  // gilt lattice band on the drum
  iso.r.line(iso.P(cx - 0.22, cy + 0.22, 70), iso.P(cx + 0.22, cy + 0.22, 70), 1.6 * RES, GILT_HOT);
  const { tipX, tipY } = domeAt(iso, cx, cy, 74, 0.24 * (CELL_W / 2), 1.7, GILT, { ribs: 8, bulb: true });
  // the gilt orb + Star of David finial
  iso.r.line([tipX, tipY], [tipX, tipY - 9 * RES], 1.3 * RES, GILT_HOT);
  iso.r.poly([[tipX - 2.4 * RES, tipY - 5 * RES], [tipX + 2.4 * RES, tipY - 5 * RES], [tipX, tipY - 9 * RES]], GILT_HOT);
  iso.glint([tipX, tipY - 4 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// SCHLOSS BELLEVUE — the President's neoclassical palace on the Spree: a long
// white render corps-de-logis with a central pedimented frontispiece + two
// short side wings, a low hipped roof. Restrained, horizontal. 4×4.
// =====================================================================
function schlossBellevueTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.4, u1 = 3.6, v0 = 0.6, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the long main range + two short forward wings (a shallow cour d'honneur)
  iso.box(u0, v0, u1, v0 + 0.8, 0, 40, RENDER);
  iso.box(u0, v0 + 0.8, u0 + 0.5, v1, 0, 38, RENDER);
  iso.box(u1 - 0.5, v0 + 0.8, u1, v1, 0, 38, RENDER);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(RENDER, 0.12), { ink: false });
  // regular windows along the main range + wing inner faces
  iso.windowsLeft(v0 + 0.8, u0 + 0.08, u1 - 0.08, 10, 34, 16, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsRight(u0 + 0.5, v0 + 0.84, v1 - 0.04, 10, 32, 4, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // low hipped roofs
  iso.hip(u0 - 0.02, v0 - 0.02, u1 + 0.02, v0 + 0.82, 40, 10, ZINC);
  iso.hip(u0 - 0.03, v0 + 0.8, u0 + 0.52, v1 + 0.02, 38, 8, ZINC);
  iso.hip(u1 - 0.52, v0 + 0.8, u1 + 0.03, v1 + 0.02, 38, 8, ZINC);
  // central frontispiece + pediment carrying the eagle
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.28, v0 + 0.7, cx + 0.28, v0 + 0.82, 0, 46, lighten(RENDER, 0.04));
  colonnadeL(iso, v0 + 0.82, cx - 0.24, cx + 0.24, 10, 42, 5, COLORS.white);
  pediment(iso, v0 + 0.82, cx - 0.26, cx + 0.26, 46, 9, RENDER);
  const q = iso.P(cx, v0 + 0.82, 55);
  iso.r.poly([[q[0] - 3 * RES, q[1]], [q[0] + 3 * RES, q[1]], [q[0], q[1] - 5 * RES]], COPPER);
  return iso.build();
}

// =====================================================================
// OBERBAUMBRÜCKE — the famous double-deck red-BRICK bridge over the Spree: a
// row of arches carrying a road deck, an upper U-Bahn viaduct arcade, and a
// pair of tall neogothic brick TOWERS with pointed spires at the centre. A
// bridge hero. 3×3 (drawn long across the water).
// =====================================================================
function oberbaumbrueckeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.2, u1 = 2.8, vm = 1.5;
  // the Spree
  iso.box(0.05, 0.05, 2.95, 2.95, 0, 1, shaded(COLORS.water, 0.04), { ink: false });
  iso.shadow(u0, vm - 0.3, u1, vm + 0.3, 0.16, 0.2);
  // the row of round arches carrying the deck (a long low brick viaduct)
  const DZ = 26; // deck height
  iso.box(u0, vm - 0.16, u1, vm + 0.16, 0, DZ, BRICK);
  // arch voids cut into the visible face (v = vm+0.16)
  for (let i = 0; i < 7; i++) {
    const u = u0 + 0.12 + i * 0.37;
    const poly: Pt[] = [iso.P(u, vm + 0.16, 2), iso.P(u, vm + 0.16, 14)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      poly.push(iso.P(u + 0.26 * t, vm + 0.16, 14 + Math.sin(t * Math.PI) * 6));
    }
    poly.push(iso.P(u + 0.26, vm + 0.16, 14), iso.P(u + 0.26, vm + 0.16, 2));
    iso.r.poly(poly, alpha(COLORS.waterDeep, 0.7));
  }
  // the deck parapet
  iso.box(u0 - 0.02, vm - 0.18, u1 + 0.02, vm + 0.18, DZ, DZ + 4, lighten(BRICK, 0.06), { ink: false });
  // the upper U-Bahn arcade (a colonnade of small pointed arches along the deck)
  colonnadeL(iso, vm + 0.18, u0 + 0.1, u1 - 0.1, DZ + 4, DZ + 20, 16, lit(BRICK, 0.06));
  iso.box(u0, vm - 0.16, u1, vm + 0.16, DZ + 20, DZ + 24, lighten(BRICK, 0.04), { ink: false });
  // ---- the two central neogothic brick TOWERS with pointed spires ----
  const cw = 0.16;
  for (const cu of [1.5 - 0.34, 1.5 + 0.34] as const) {
    iso.box(cu - cw, vm - cw, cu + cw, vm + cw, DZ + 24, DZ + 64, BRICK);
    // crenellated parapet
    iso.box(cu - cw - 0.02, vm - cw - 0.02, cu + cw + 0.02, vm + cw + 0.02, DZ + 64, DZ + 68, lit(BRICK, 0.06), { ink: false });
    // tall octagonal pointed spire
    const apex = iso.P(cu, vm, DZ + 108);
    const s0 = iso.P(cu - cw, vm + cw, DZ + 68);
    const s1 = iso.P(cu + cw, vm + cw, DZ + 68);
    const s2 = iso.P(cu + cw, vm - cw, DZ + 68);
    iso.r.poly([s0, s1, apex], shaded(BRICK_D, 0.04));
    iso.r.poly([s1, s2, apex], lit(BRICK_D, 0.06));
    iso.r.polyline([s0, apex, s2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 5 * RES], 0.9 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// JÜDISCHES MUSEUM — Libeskind's "Between the Lines": a continuous jagged
// ZIGZAG of titanium-ZINC-clad volumes slashed by sharp irregular window
// incisions, windowless and silver-grey, beside the old baroque Kollegienhaus.
// The most modern silhouette — a lightning-bolt plan. 4×4.
// =====================================================================
function juedischesMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const TZ = hex('#9aa0a4'); // titanium-zinc silver-grey
  iso.shadow(0.4, 0.5, 3.6, 3.5, 0.22, 0.2);
  // the old baroque Kollegienhaus (a low rendered block at one corner)
  iso.box(0.4, 2.7, 1.9, 3.5, 0, 30, RENDER);
  iso.hip(0.38, 2.68, 1.92, 3.52, 30, 9, ZINC);
  iso.windowsLeft(3.5, 0.5, 1.8, 8, 26, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // ---- the zigzag zinc volumes (a chain of canted blocks) ----
  const segs: Array<[number, number, number, number, number]> = [
    // u0, v0, u1, v1, h
    [0.5, 0.5, 1.5, 1.3, 48],
    [1.3, 1.0, 2.3, 1.7, 52],
    [2.0, 0.6, 2.9, 1.4, 46],
    [2.4, 1.3, 3.4, 2.1, 50],
    [1.7, 1.8, 2.7, 2.6, 44],
  ];
  for (const [a0, b0, a1, b1, h] of segs) {
    iso.box(a0, b0, a1, b1, 0, h, TZ);
    // sharp diagonal window-slashes on the visible faces
    for (let k = 0; k < 4; k++) {
      const t = 0.2 + k * 0.18;
      const za = 8 + k * 9;
      iso.r.line(
        iso.P(a0 + (a1 - a0) * t, b1, za),
        iso.P(a0 + (a1 - a0) * (t + 0.12), b1, za + 14),
        1.1 * RES,
        alpha(STEEL, 0.85),
      );
    }
    for (let k = 0; k < 3; k++) {
      const t = 0.25 + k * 0.22;
      const za = 10 + k * 11;
      iso.r.line(
        iso.P(a1, b0 + (b1 - b0) * t, za),
        iso.P(a1, b0 + (b1 - b0) * (t + 0.1), za + 12),
        1 * RES,
        alpha(STEEL, 0.8),
      );
    }
  }
  return iso.build();
}

// =====================================================================
// FRIEDRICHSWERDERSCHE KIRCHE — Schinkel's neogothic brick church: a compact
// red-BRICK hall with a pair of stepped octagonal brick towers + pinnacles at
// the west front. England-by-way-of-Prussia brick gothic. 2×2.
// =====================================================================
function friedrichswerderscheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 140 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the brick hall with a steep roof
  iso.box(u0, v0, u1, v1 - 0.18, 0, 50, BRICK);
  iso.gable(u0, v0, u1, v1 - 0.18, 50, 14, 'v', SLATE, BRICK);
  // pointed brick windows down the flank
  iso.windowsLeft(v1 - 0.18, u0 + 0.06, u1 - 0.06, 12, 40, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.08));
  // ---- twin stepped octagonal brick towers at the front ----
  for (const tu of [u0 + 0.16, u1 - 0.16] as const) {
    iso.box(tu - 0.13, v1 - 0.18, tu + 0.13, v1, 0, 78, BRICK);
    // a stepped string-course belt
    iso.r.line(iso.P(tu - 0.13, v1, 52), iso.P(tu + 0.13, v1, 52), 1.2 * RES, lit(BRICK, 0.1));
    // tall pinnacle cap
    iso.box(tu - 0.1, v1 - 0.15, tu + 0.1, v1 - 0.03, 78, 90, BRICK, { ink: false });
    const apex = iso.P(tu, v1 - 0.09, 112);
    const c0 = iso.P(tu - 0.1, v1 - 0.03, 90);
    const c1 = iso.P(tu + 0.1, v1 - 0.03, 90);
    const c2 = iso.P(tu + 0.1, v1 - 0.15, 90);
    iso.r.poly([c0, c1, apex], shaded(BRICK_D, 0.04));
    iso.r.poly([c1, c2, apex], lit(BRICK_D, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    // corner pinnacles
    for (const [pu, pv] of [[tu - 0.1, v1 - 0.03], [tu + 0.1, v1 - 0.03]] as const) {
      const pb = iso.P(pu, pv, 90);
      iso.r.line(pb, [pb[0], pb[1] - 8 * RES], 1 * RES, lit(BRICK, 0.06));
    }
  }
  return iso.build();
}

// =====================================================================
// BACKSTEINGOTIK CHURCH — a generic North-German red-BRICK gothic parish church
// with a single tall west tower + pointed spire and a steep-roofed nave. Serves
// St. Marienkirche, Sophienkirche, St. Adalbert, the Gedächtniskirches, etc.
// `domeCap` swaps the spire for a baroque copper bonnet (Sophienkirche). 2×2.
// =====================================================================
function brickChurchTile(seed: number, baroque: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.52, u1 = 1.48, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the nave
  iso.box(u0, v0 + 0.2, u1, v1, 0, 46, BRICK);
  iso.gable(u0, v0 + 0.2, u1, v1, 46, 18, 'u', SLATE, BRICK);
  iso.windowsRight(u1, v0 + 0.26, v1 - 0.06, 10, 36, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.08));
  // the tall west tower at the front-left (low v)
  const tu = u0 + 0.34, tv = v0 + 0.2;
  iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.18, 0, 96, BRICK);
  iso.r.line(iso.P(tu - 0.2, tv + 0.18, 64), iso.P(tu + 0.2, tv + 0.18, 64), 1.1 * RES, lit(BRICK, 0.1));
  iso.windowsLeft(tv + 0.18, tu - 0.14, tu + 0.14, 70, 88, 2, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.08));
  if (baroque) {
    // a baroque copper bonnet (Welsche Haube) + lantern
    iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 96, 104, lighten(BRICK, 0.04), { ink: false });
    const { tipX, tipY } = domeAt(iso, tu, tv, 104, 0.16 * (CELL_W / 2), 1.5, COPPER, { bulb: true, ribs: 4 });
    lantern(iso, tipX, tipY, 8, COPPER_D, GILT_HOT);
  } else {
    // a tall green-copper pointed spire
    iso.box(tu - 0.17, tv - 0.17, tu + 0.17, tv + 0.17, 96, 102, lighten(BRICK, 0.04), { ink: false });
    const apex = iso.P(tu, tv, 150);
    const c0 = iso.P(tu - 0.17, tv + 0.17, 102);
    const c1 = iso.P(tu + 0.17, tv + 0.17, 102);
    const c2 = iso.P(tu + 0.17, tv - 0.17, 102);
    iso.r.poly([c0, c1, apex], shaded(COPPER, 0.06));
    iso.r.poly([c1, c2, apex], lit(COPPER, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 6 * RES], 0.9 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// PRUSSIAN SCHLOSS / PALAIS — a baroque/rococo palace block: a render corps-
// de-logis with a central pedimented risalit, regular windows, a balustraded
// hipped roof + corner urns. Serves the many placed Schlösser & Palais
// (Friedrichsfelde, Schönhausen, Biesdorf, Hohenschönhausen, Ephraim-Palais,
// Prinzessinnenpalais, Palais Podewils…). `domed` adds a small belvedere
// cupola (Biesdorf). 3×3.
// =====================================================================
function schlossTile(seed: number, domed: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: domed ? 120 : 80 });
  void seed;
  const u0 = 0.36, u1 = 2.64, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  iso.box(u0, v0, u1, v1, 0, 40, RENDER);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(RENDER, 0.12), { ink: false });
  // two storeys of regular windows
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 10, 22, 11, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 26, 37, 11, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 26, 37, 10, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // central pedimented risalit
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.3, v1 - 0.14, cx + 0.3, v1, 0, 44, lighten(RENDER, 0.04));
  colonnadeL(iso, v1, cx - 0.26, cx + 0.26, 8, 42, 5, COLORS.white);
  pediment(iso, v1, cx - 0.28, cx + 0.28, 44, 10, RENDER);
  // balustraded hipped roof + corner urns
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 43, lighten(RENDER, 0.06), { ink: false });
  iso.hip(u0, v0, u1, v1, 43, 12, ZINC);
  for (const [cu, cv] of [[u0 + 0.08, v1 - 0.08], [u1 - 0.08, v1 - 0.08], [u1 - 0.08, v0 + 0.08]] as const) {
    const p = iso.P(cu, cv, 43);
    iso.r.rect(p[0] - 1.4 * RES, p[1] - 4 * RES, p[0] + 1.4 * RES, p[1], lighten(RENDER, 0.08));
  }
  if (domed) {
    // a small belvedere cupola over the centre
    iso.box(cx - 0.16, (v0 + v1) / 2 - 0.16, cx + 0.16, (v0 + v1) / 2 + 0.16, 43, 60, lighten(RENDER, 0.03));
    const { tipX, tipY } = domeAt(iso, cx, (v0 + v1) / 2, 60, 0.16 * (CELL_W / 2), 1.1, ZINC, { bulb: true });
    lantern(iso, tipX, tipY, 7, ZINC, GILT_HOT);
  }
  return iso.build();
}

// =====================================================================
// WILHELMINE PALAIS / civic block — a smaller grand stucco town-palace: a
// render block with rusticated base, a cornice, a low roof and a central
// balcony bay. Serves the lesser Palais / civic buildings (Ephraim-Palais,
// Prinzessinnenpalais, Ribbeck-Haus, Staatsratsgebäude, Bundesrat,
// Märkisches Museum…). 2×2.
// =====================================================================
function palaisTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.46, v1 = 1.54;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 44, RENDER);
  // rusticated base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(RENDER, 0.14), { ink: false });
  // windows over two storeys
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 27, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 31, 41, 7, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 16, 41, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // cornice + low hipped roof
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 44, 48, lighten(RENDER, 0.06), { topC: top(RENDER, 0.3) });
  iso.hip(u0, v0, u1, v1, 48, 9, ZINC);
  // central balcony bay
  const cx = (u0 + u1) / 2;
  iso.r.rect(iso.P(cx - 0.16, v1, 16)[0], iso.P(cx, v1, 16)[1] - 1 * RES, iso.P(cx + 0.16, v1, 16)[0], iso.P(cx, v1, 16)[1] + 1.5 * RES, lighten(RENDER, 0.1));
  return iso.build();
}

// =====================================================================
// AEG TURBINENFABRIK — Behrens' pioneering industrial temple: a vast glazed
// steel hall with a polygonal gable end framed by battered concrete corner
// pylons, a stepped roofline, and a long glazed flank. Modernism's birthplace.
// Serves the AEG / industrial halls. 3×3.
// =====================================================================
function turbinenfabrikTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const CONC = hex('#b9b2a4'); // pale concrete pylons
  const u0 = 0.34, u1 = 2.66, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the long glazed steel hall
  iso.box(u0 + 0.18, v0, u1 - 0.18, v1, 0, 56, alpha(COLORS.glassSky, 0.6), {
    leftC: alpha(COLORS.glassDark, 0.7),
    rightC: alpha(COLORS.glassLit, 0.4),
  });
  // steel mullion grid on the long flank
  for (let i = 1; i < 12; i++) {
    const v = v0 + ((v1 - v0) * i) / 12;
    iso.r.line(iso.P(u1 - 0.18, v, 4), iso.P(u1 - 0.18, v, 56), 0.6 * RES, alpha(STEEL, 0.7));
  }
  for (const z of [20, 38] as const) iso.r.line(iso.P(u1 - 0.18, v0, z), iso.P(u1 - 0.18, v1, z), 0.6 * RES, alpha(STEEL, 0.6));
  // the two battered concrete corner pylons (front gable)
  iso.box(u0, v1 - 0.4, u0 + 0.2, v1, 0, 64, CONC);
  iso.box(u1 - 0.2, v1 - 0.4, u1, v1, 0, 64, CONC);
  // the polygonal gable end (a flattened pediment) between the pylons
  const gcx = (u0 + u1) / 2;
  iso.r.poly(
    [iso.P(u0 + 0.2, v1, 56), iso.P(u1 - 0.2, v1, 56), iso.P(u1 - 0.2, v1, 64), iso.P(gcx, v1, 74), iso.P(u0 + 0.2, v1, 64)],
    lit(CONC, 0.06),
  );
  iso.r.polyline(
    [iso.P(u0 + 0.2, v1, 64), iso.P(gcx, v1, 74), iso.P(u1 - 0.2, v1, 64)],
    INK_W * 0.7,
    INK,
  );
  // big glazed gable window
  iso.r.poly([iso.P(u0 + 0.3, v1, 12), iso.P(u1 - 0.3, v1, 12), iso.P(u1 - 0.3, v1, 52), iso.P(u0 + 0.3, v1, 52)], alpha(COLORS.glassLit, 0.4));
  return iso.build();
}

// =====================================================================
// KAISER-WILHELM-GEDÄCHTNISKIRCHE — the "hollow tooth": the war-ruined neo-
// Romanesque BELL-TOWER with its jagged broken top, beside Eiermann's modern
// blue-glass honeycomb octagon + slim new bell tower. A unique paired
// silhouette. The placed name is "Neue Kaiser-Wilhelm-Gedächtniskirche". 2×2.
// =====================================================================
function gedaechtniskircheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const BLUEG = hex('#2f5aa0'); // Eiermann's cobalt glass
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // ---- the ruined old tower (the hollow tooth) at the left ----
  const tu = u0 + 0.28, tv = v0 + 0.5;
  iso.box(tu - 0.22, tv - 0.22, tu + 0.22, tv + 0.22, 0, 104, STONE);
  iso.windowsLeft(tv + 0.22, tu - 0.16, tu + 0.16, 30, 60, 3, alpha(COLORS.glassDark, 0.85), lighten(STONE, 0.08));
  // the jagged broken crown — an uneven ragged top edge
  const jag: Pt[] = [];
  const bz = 104;
  const pts = [
    [tu - 0.22, tv + 0.22, bz + 4],
    [tu - 0.05, tv + 0.22, bz + 26],
    [tu + 0.1, tv + 0.22, bz + 8],
    [tu + 0.22, tv + 0.22, bz + 20],
    [tu + 0.22, tv - 0.22, bz + 14],
    [tu + 0.05, tv - 0.22, bz + 30],
    [tu - 0.22, tv - 0.22, bz + 6],
  ] as const;
  for (const [a, b, z] of pts) jag.push(iso.P(a, b, z));
  iso.r.poly(jag, shaded(STONE, 0.06), lit(STONE, 0.05));
  iso.r.polyline(jag, INK_W * 0.7, INK, true);
  // ---- Eiermann's modern blue-glass octagon (low) + slim new tower (right) --
  const ocx = u1 - 0.34, ocy = v1 - 0.3;
  iso.box(ocx - 0.28, ocy - 0.28, ocx + 0.28, ocy + 0.28, 0, 36, BLUEG, {
    leftC: shaded(BLUEG, 0.1),
    rightC: lit(BLUEG, 0.06),
  });
  // the honeycomb glass grid
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    iso.r.line(iso.P(ocx - 0.28 + 0.56 * t, ocy + 0.28, 4), iso.P(ocx - 0.28 + 0.56 * t, ocy + 0.28, 36), 0.5 * RES, alpha(COLORS.white, 0.4));
  }
  // the slim new hexagonal bell tower
  const nu = u1 - 0.16, nv = v0 + 0.5;
  iso.box(nu - 0.1, nv - 0.1, nu + 0.1, nv + 0.1, 0, 96, BLUEG, { leftC: shaded(BLUEG, 0.1), rightC: lit(BLUEG, 0.06) });
  for (let z = 12; z < 92; z += 10) iso.r.line(iso.P(nu - 0.1, nv + 0.1, z), iso.P(nu + 0.1, nv + 0.1, z), 0.5 * RES, alpha(COLORS.white, 0.35));
  iso.r.line(iso.P(nu, nv, 96), iso.P(nu, nv, 102), 1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// REGISTRY — order matters: the BESPOKE Brandenburg is FIRST + tightly matched
// so it beats any generic arch resolver. Each `match` hits a PLACED name from
// src/data/cities/berlin.ts's `named` list (German, incl. umlauts).
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // ---- MARQUEE ICONS (bespoke draws) ----
  {
    city: 'berlin',
    key: 'brandenburger-tor',
    match: /Brandenburger Tor/i,
    foot: [2, 2],
    seed: 1815,
    draw: (seed) => brandenburgerTorTile(seed),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'reichstag',
    match: /Reichstagsgeb[äa]ude|Reichstag/i,
    foot: [4, 4],
    seed: 1894,
    draw: (seed) => reichstagTile(seed),
    light: { kind: 'aerialBeacon', topZ: 150, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'berliner-dom',
    match: /Berliner Dom/i,
    foot: [4, 4],
    seed: 1905,
    draw: (seed) => berlinerDomTile(seed),
    light: { kind: 'facadeFlood', topZ: 226, halfW: 1.5 },
  },
  {
    city: 'berlin',
    key: 'siegessaule',
    match: /Siegess[äa]ule/i,
    foot: [1, 1],
    seed: 1873,
    draw: (seed) => siegessauleTile(seed),
    light: { kind: 'aerialBeacon', topZ: 318, halfW: 0.3 },
  },
  {
    city: 'berlin',
    key: 'rotes-rathaus',
    match: /Rotes Rathaus/i,
    foot: [4, 4],
    seed: 1869,
    draw: (seed) => rotesRathausTile(seed),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.5 },
  },
  {
    city: 'berlin',
    key: 'altes-museum',
    match: /Altes Museum/i,
    foot: [5, 5],
    seed: 1830,
    draw: (seed) => altesMuseumTile(seed),
    light: { kind: 'facadeFlood', topZ: 108, halfW: 1.9 },
  },
  {
    city: 'berlin',
    key: 'pergamon',
    match: /Pergamon/i,
    foot: [5, 5],
    seed: 1910,
    draw: (seed) => pergamonTile(seed),
    light: { kind: 'facadeFlood', topZ: 98, halfW: 1.9 },
  },
  {
    city: 'berlin',
    key: 'bode-museum',
    match: /Bode[- ]?Museum/i,
    foot: [4, 4],
    seed: 1904,
    draw: (seed) => bodeMuseumTile(seed),
    light: { kind: 'facadeFlood', topZ: 156, halfW: 1.5 },
  },
  {
    city: 'berlin',
    key: 'berliner-philharmonie',
    match: /Philharmonie/i,
    foot: [3, 3],
    seed: 1963,
    draw: (seed) => philharmonieTile(seed),
    light: { kind: 'genericGlow', topZ: 86, halfW: 1.2 },
  },
  {
    city: 'berlin',
    key: 'neue-nationalgalerie',
    match: /Neue Nationalgalerie/i,
    foot: [3, 3],
    seed: 1968,
    draw: (seed) => neueNationalgalerieTile(seed),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.4 },
  },

  // ---- OTHER NOTABLE BESPOKE ----
  {
    city: 'berlin',
    key: 'deutscher-dom',
    match: /Deutscher Dom/i,
    foot: [2, 2],
    seed: 1708,
    draw: (seed) => gendarmenmarktDomTile(seed),
    light: { kind: 'facadeFlood', topZ: 168, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'st-hedwigs-kathedrale',
    match: /St\.?\s*Hedwig/i,
    foot: [2, 2],
    seed: 1773,
    draw: (seed) => stHedwigTile(seed),
    light: { kind: 'facadeFlood', topZ: 108, halfW: 1.2 },
  },
  {
    city: 'berlin',
    key: 'neue-synagoge',
    match: /Neue Synagoge/i,
    foot: [2, 2],
    seed: 1866,
    draw: (seed) => neueSynagogeTile(seed),
    light: { kind: 'facadeFlood', topZ: 168, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'schloss-bellevue',
    match: /Schloss Bellevue/i,
    foot: [4, 4],
    seed: 1786,
    draw: (seed) => schlossBellevueTile(seed),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'oberbaumbruecke',
    match: /Oberbaumbr[üu]cke/i,
    foot: [3, 3],
    seed: 1896,
    draw: (seed) => oberbaumbrueckeTile(seed),
    light: { kind: 'facadeFlood', topZ: 116, halfW: 1.3 },
  },
  {
    city: 'berlin',
    key: 'juedisches-museum',
    match: /J[üu]disches Museum/i,
    foot: [4, 4],
    seed: 1999,
    draw: (seed) => juedischesMuseumTile(seed),
    light: { kind: 'genericGlow', topZ: 88, halfW: 1.5 },
  },
  {
    city: 'berlin',
    key: 'friedrichswerdersche-kirche',
    match: /Friedrichswerdersche/i,
    foot: [2, 2],
    seed: 1830,
    draw: (seed) => friedrichswerderscheTile(seed),
    light: { kind: 'facadeFlood', topZ: 138, halfW: 1.0 },
  },

  // ---- BACKSTEINGOTIK CHURCHES (brick gothic family) ----
  {
    city: 'berlin',
    key: 'st-marienkirche',
    match: /St\.?\s*Marienkirche|Marienkirche/i,
    foot: [2, 2],
    seed: 1294,
    draw: (seed) => brickChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'sophienkirche',
    match: /Sophienkirche/i,
    foot: [2, 2],
    seed: 1712,
    draw: (seed) => brickChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'st-adalbert-kirche',
    match: /St\.?\s*Adalbert/i,
    foot: [2, 2],
    seed: 1933,
    draw: (seed) => brickChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'gethsemanekirche',
    match: /Gethsemane/i,
    foot: [2, 2],
    seed: 1893,
    draw: (seed) => brickChurchTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'bethanien-kirche',
    match: /Bethanien-Kirche/i,
    foot: [2, 2],
    seed: 1847,
    draw: (seed) => brickChurchTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'gedaechtniskirche',
    match: /Kaiser-Wilhelm-Ged[äa]chtniskirche/i,
    foot: [2, 2],
    seed: 1895,
    draw: (seed) => gedaechtniskircheTile(seed),
    light: { kind: 'facadeFlood', topZ: 166, halfW: 1.0 },
  },

  // ---- PRUSSIAN SCHLÖSSER & PALAIS (palace family) ----
  {
    city: 'berlin',
    key: 'schloss-friedrichsfelde',
    match: /Schloss Friedrichsfelde/i,
    foot: [3, 3],
    seed: 1695,
    draw: (seed) => schlossTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'schloss-schoenhausen',
    match: /Schloss Sch[öo]nhausen/i,
    foot: [3, 3],
    seed: 1664,
    draw: (seed) => schlossTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'schloss-biesdorf',
    match: /Schloss Biesdorf/i,
    foot: [3, 3],
    seed: 1868,
    draw: (seed) => schlossTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 116, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'schloss-hohenschoenhausen',
    match: /Schloss Hohensch[öo]nhausen/i,
    foot: [3, 3],
    seed: 1620,
    draw: (seed) => schlossTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.4 },
  },

  // ---- WILHELMINE PALAIS / civic blocks (town-palace family) ----
  {
    city: 'berlin',
    key: 'ephraim-palais',
    match: /Ephraim-Palais/i,
    foot: [2, 2],
    seed: 1766,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'prinzessinnenpalais',
    match: /Prinzessinnenpalais/i,
    foot: [2, 2],
    seed: 1733,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'palais-podewils',
    match: /Palais Podewils/i,
    foot: [2, 2],
    seed: 1704,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'ribbeck-haus',
    match: /Ribbeck-Haus/i,
    foot: [2, 2],
    seed: 1624,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'staatsratsgebaeude',
    match: /Staatsratsgeb[äa]ude/i,
    foot: [2, 2],
    seed: 1964,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'maerkisches-museum',
    match: /M[äa]rkisches Museum/i,
    foot: [2, 2],
    seed: 1908,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'neuer-pavillon',
    match: /Neuer Pavillon/i,
    foot: [2, 2],
    seed: 1825,
    draw: (seed) => palaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },

  // ---- INDUSTRIAL / MODERNIST ----
  {
    city: 'berlin',
    key: 'aeg-turbinenfabrik',
    match: /AEG Turbinenfabrik|Turbinenfabrik/i,
    foot: [3, 3],
    seed: 1909,
    draw: (seed) => turbinenfabrikTile(seed),
    light: { kind: 'genericGlow', topZ: 74, halfW: 1.4 },
  },
];
