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
// ROUND-2 SHARED PRIMITIVES — memorials, stations, modernist civic & a wider
// church family. Each hero below composes these (or the Round-1 ones) freshly.
// =====================================================================

/** Speckled fieldstone (Feldstein) rubble texture dabbed over the visible walls
 *  of a footprint — the look of Berlin's oldest medieval village churches. */
function fieldstone(iso: Iso, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, seed: number): void {
  let s = seed | 0;
  const rnd = (): number => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const grey = hex('#8f8a82');
  for (let i = 0; i < 46; i++) {
    const t = rnd(), zz = z0 + (z1 - z0) * rnd();
    // left face (v1) and right face (u1) alternately
    if (rnd() < 0.5) {
      const u = u0 + (u1 - u0) * t;
      const p = iso.P(u, v1, zz);
      iso.r.rect(p[0] - 1.1 * RES, p[1] - 1.0 * RES, p[0] + 1.1 * RES, p[1] + 1.0 * RES, rnd() < 0.5 ? shaded(grey, 0.1) : darken(grey, 0.16));
    } else {
      const v = v0 + (v1 - v0) * t;
      const p = iso.P(u1, v, zz);
      iso.r.rect(p[0] - 1.1 * RES, p[1] - 1.0 * RES, p[0] + 1.1 * RES, p[1] + 1.0 * RES, rnd() < 0.5 ? lit(grey, 0.06) : grey);
    }
  }
}

/** A tall industrial round brick CHIMNEY at a screen footprint point. */
function chimney(iso: Iso, u: number, v: number, h: number, rad = 0.07): void {
  iso.box(u - rad, v - rad, u + rad, v + rad, 0, h, BRICK_D);
  // banded top
  iso.r.line(iso.P(u - rad, v + rad, h - 6), iso.P(u + rad, v + rad, h - 6), 1.4 * RES, lit(BRICK, 0.08));
  iso.box(u - rad - 0.01, v - rad - 0.01, u + rad + 0.01, v + rad + 0.01, h, h + 3, lighten(BRICK, 0.04), { ink: false });
  iso.r.line(iso.P(u, v, h + 3), iso.P(u, v, h + 7), 0.8 * RES, alpha(SLATE, 0.7));
}

/** A faceted barrel-VAULT train-shed / market roof spanning u0..u1 along v,
 *  from springing zS to crown zC. Returns nothing; draws glass facets + ribs. */
function barrelVault(iso: Iso, u0: number, u1: number, v0: number, v1: number, zS: number, zC: number, glassC: RGBA): void {
  const vm = (v0 + v1) / 2;
  // near slope (front half of the arch) + far slope, as canted glass planes
  iso.r.poly([iso.P(u0, vm, zC), iso.P(u1, vm, zC), iso.P(u1, v1, zS), iso.P(u0, v1, zS)], alpha(glassC, 0.6));
  iso.r.poly([iso.P(u0, v0, zS), iso.P(u1, v0, zS), iso.P(u1, vm, zC), iso.P(u0, vm, zC)], alpha(lit(glassC, 0.1), 0.5));
  // ribs across the span
  const n = Math.max(3, Math.round((u1 - u0) * 4));
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    iso.r.polyline([iso.P(u, v0, zS), iso.P(u, vm, zC), iso.P(u, v1, zS)], 0.7 * RES, alpha(STEEL, 0.8));
  }
  iso.r.polyline([iso.P(u0, v0, zS), iso.P(u0, vm, zC), iso.P(u0, v1, zS)], INK_W * 0.8, INK);
  iso.r.polyline([iso.P(u1, v0, zS), iso.P(u1, vm, zC), iso.P(u1, v1, zS)], INK_W * 0.8, INK);
  iso.r.line(iso.P(u0, vm, zC), iso.P(u1, vm, zC), INK_W * 0.7, INK);
}

// =====================================================================
// SOWJETISCHES EHRENMAL (TREPTOW) — the colossal Soviet war memorial: a long
// axial park closed by a great kurgan MOUND topped by the bronze "Soviet
// Warrior" (a soldier holding a child, sword lowered over a smashed swastika),
// approached between two huge red-granite PYLONS shaped as lowered banners. The
// most monumental thing on the map. 5×5.
// =====================================================================
function sovietTreptowTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 220 });
  void seed;
  const GRAN = hex('#6e3b39'); // Soviet red granite
  const u0 = 0.3, u1 = 4.7, v0 = 0.4, v1 = 4.6;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // the long sunken lawn of honour (axis runs front→back)
  iso.box(u0, v0, u1, v1, 0, 3, shaded(COLORS.grass, 0.12), { ink: false });
  // the central axial path
  iso.box(2.2, v0, 2.8, v1, 3, 5, shaded(COLORS.pavement, 0.05), { ink: false });
  // the two great lowered-banner PYLONS flanking the entry (front, low v)
  for (const cu of [1.0, 4.0] as const) {
    // a wedge: tall at the path side, sloping down outward (a furled flag)
    const hi = 92, lo = 40;
    iso.box(cu - 0.28, v0 + 0.4, cu + 0.28, v0 + 0.9, 0, lo, GRAN);
    iso.r.poly(
      [iso.P(cu - 0.28, v0 + 0.9, lo), iso.P(cu + 0.28, v0 + 0.9, lo), iso.P(cu + 0.28, v0 + 0.9, hi), iso.P(cu - 0.28, v0 + 0.9, hi)],
      lit(GRAN, 0.06),
    );
    iso.r.poly(
      [iso.P(cu + 0.28, v0 + 0.4, lo), iso.P(cu + 0.28, v0 + 0.9, lo), iso.P(cu + 0.28, v0 + 0.9, hi)],
      shaded(GRAN, 0.1),
    );
    iso.r.polyline([iso.P(cu - 0.28, v0 + 0.9, hi), iso.P(cu + 0.28, v0 + 0.9, hi), iso.P(cu + 0.28, v0 + 0.9, lo)], INK_W * 0.8, INK);
    // a carved gilt wreath on the banner face
    iso.glint(iso.P(cu, v0 + 0.9, lo + 20), 2.4 * RES);
  }
  // ---- the great kurgan MOUND at the far end (high v) ----
  const mcx = (u0 + u1) / 2, mcy = v1 - 0.7;
  // stepped green mound as concentric shrinking boxes
  iso.box(mcx - 1.3, mcy - 0.9, mcx + 1.3, mcy + 0.9, 3, 26, shaded(COLORS.grass, 0.06), { topC: top(COLORS.grass, 0.16) });
  iso.box(mcx - 0.95, mcy - 0.65, mcx + 0.95, mcy + 0.65, 26, 46, shaded(COLORS.grass, 0.04), { topC: top(COLORS.grass, 0.18) });
  // the round granite mausoleum-plinth/pedestal the warrior stands on
  iso.box(mcx - 0.46, mcy - 0.38, mcx + 0.46, mcy + 0.38, 46, 64, lit(GRAN, 0.04));
  // a stepped sub-plinth so the bronze reads as raised
  iso.box(mcx - 0.28, mcy - 0.24, mcx + 0.28, mcy + 0.24, 64, 72, lighten(GRAN, 0.06));
  // ---- the colossal bronze Soviet Warrior — the ICON: he must dominate the
  // whole mound, sword down, child on the arm ----
  const [sx, syB] = iso.P(mcx, mcy, 72);
  const SH = 68 * RES; // big — towers over the pedestal
  // greatcoat skirt (broad, flaring)
  iso.r.poly([[sx - 5 * RES, syB], [sx + 5 * RES, syB], [sx + 3 * RES, syB - SH * 0.58], [sx - 3 * RES, syB - SH * 0.58]], COPPER, COPPER_D);
  // torso
  iso.r.poly([[sx - 3 * RES, syB - SH * 0.54], [sx + 3.6 * RES, syB - SH * 0.54], [sx + 2 * RES, syB - SH * 0.86], [sx - 2 * RES, syB - SH * 0.86]], lit(COPPER, 0.1), COPPER_D);
  // the cradled rescued child bundle on the left arm
  iso.r.poly([[sx - 7 * RES, syB - SH * 0.62], [sx - 2.5 * RES, syB - SH * 0.7], [sx - 2.5 * RES, syB - SH * 0.5], [sx - 6 * RES, syB - SH * 0.44]], lit(COPPER, 0.16), COPPER_D);
  // head
  iso.r.rect(sx - 2 * RES, syB - SH - 1 * RES, sx + 2 * RES, syB - SH * 0.86, lit(COPPER, 0.14));
  iso.r.polyline([[sx - 2 * RES, syB - SH - 1 * RES], [sx + 2 * RES, syB - SH - 1 * RES], [sx + 2 * RES, syB - SH * 0.86]], INK_W * 0.5, alpha(INK, 0.6));
  // the great lowered sword resting point-down on the broken swastika
  iso.r.line([sx + 3.6 * RES, syB - SH * 0.5], [sx + 9 * RES, syB + 3 * RES], 2.2 * RES, lit(COPPER, 0.16));
  iso.r.line([sx + 3 * RES, syB - SH * 0.52], [sx + 4.6 * RES, syB - SH * 0.48], 1.4 * RES, GILT); // hilt cross-guard
  iso.glint([sx, syB - SH * 0.74], 2.8 * RES);
  return iso.build();
}

// =====================================================================
// SOWJETISCHES EHRENMAL TIERGARTEN — the smaller Soviet memorial on Straße des
// 17. Juni: a concave curved COLONNADE screen carrying a bronze soldier on a
// central plinth, flanked by two real T-34 tanks + field guns. Low, axial,
// pale stone. 3×3.
// =====================================================================
function sovietTiergartenTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the plaza apron
  iso.box(u0, v0, u1, v1, 0, 3, shaded(COLORS.pavement, 0.05), { ink: false });
  // the curved colonnade screen across the back (low v) — a band of columns on
  // a low wall, stepped slightly forward at the wings to read concave
  iso.box(u0 + 0.2, v0 + 0.15, u1 - 0.2, v0 + 0.45, 0, 18, RENDER);
  colonnadeL(iso, v0 + 0.45, u0 + 0.3, u1 - 0.3, 18, 50, 9, COLORS.white);
  iso.box(u0 + 0.18, v0 + 0.13, u1 - 0.18, v0 + 0.47, 50, 56, lighten(RENDER, 0.06), { topC: top(RENDER, 0.28) });
  // the wing end-blocks stepped forward (the tanks sit on these)
  for (const cu of [u0 + 0.3, u1 - 0.3] as const) {
    iso.box(cu - 0.22, v0 + 0.5, cu + 0.22, v0 + 0.9, 0, 20, lighten(RENDER, 0.03));
    // a stubby T-34 tank silhouette on the plinth (hull + turret + gun)
    const [tx, tyB] = iso.P(cu, v0 + 0.7, 20);
    iso.r.rect(tx - 4 * RES, tyB - 5 * RES, tx + 4 * RES, tyB - 1 * RES, shaded(COLORS.grass, 0.2));
    iso.r.rect(tx - 2 * RES, tyB - 8 * RES, tx + 1.5 * RES, tyB - 5 * RES, darken(hex('#5a6650'), 0.05));
    iso.r.line([tx + 1.5 * RES, tyB - 6.5 * RES], [tx + 8 * RES, tyB - 6.5 * RES], 1.2 * RES, hex('#4a5442'));
  }
  // ---- the central plinth + bronze soldier ----
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.22, v0 + 0.3, cx + 0.22, v0 + 0.62, 50, 66, lit(RENDER, 0.02));
  const [sx, syB] = iso.P(cx, v0 + 0.46, 66);
  const SH = 30 * RES;
  iso.r.poly([[sx - 2.2 * RES, syB], [sx + 2.2 * RES, syB], [sx + 1.4 * RES, syB - SH], [sx - 1.4 * RES, syB - SH]], COPPER, COPPER_D);
  iso.r.rect(sx - 1.3 * RES, syB - SH - 3.5 * RES, sx + 1.3 * RES, syB - SH, lit(COPPER, 0.1)); // head
  iso.r.line([sx, syB - SH], [sx - 4 * RES, syB - SH - 7 * RES], 1.2 * RES, lit(COPPER, 0.12)); // raised arm
  iso.glint([sx, syB - SH * 0.6], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// GEDENKSTÄTTE BERLINER MAUER — the Berlin Wall Memorial on Bernauer Straße: a
// preserved stretch of the death strip — the rounded-top concrete Hinterland
// WALL, the raked sand strip, a cylindrical "Lichtgrenze" watchTOWER, and the
// rusted steel "Wall of Remembrance" rod-screen. Grey + rust + sand. 3×3.
// =====================================================================
function berlinWallMemorialTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const CONC = hex('#c3beb4'); // weathered wall concrete
  const RUST = hex('#9a6a44'); // corten / rusted steel rods
  const SANDY = hex('#cdbf9e'); // raked death-strip sand
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the raked death-strip sand
  iso.box(u0, v0, u1, v1, 0, 3, shaded(SANDY, 0.06), { ink: false });
  // raking lines in the sand
  for (let i = 1; i < 7; i++) {
    const v = v0 + ((v1 - v0) * i) / 7;
    iso.r.line(iso.P(u0, v, 3), iso.P(u1, v, 3), 0.5 * RES, alpha(darken(SANDY, 0.12), 0.7));
  }
  // ---- the concrete WALL segment along the front edge (high v), with the
  // characteristic rounded sewer-pipe top ----
  const wz = 40;
  iso.box(u0 + 0.1, v1 - 0.3, u1 - 0.1, v1 - 0.16, 0, wz, CONC);
  // rounded top cap (a half-round bead)
  const a = iso.P(u0 + 0.1, v1 - 0.23, wz), b = iso.P(u1 - 0.1, v1 - 0.23, wz);
  iso.r.line(a, b, 3.2 * RES, lighten(CONC, 0.1));
  iso.r.line([a[0], a[1] - 1.4 * RES], [b[0], b[1] - 1.4 * RES], 1.2 * RES, top(CONC, 0.2));
  // panel seams down the wall
  for (let i = 1; i < 7; i++) {
    const u = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 7;
    iso.r.line(iso.P(u, v1 - 0.16, 2), iso.P(u, v1 - 0.16, wz), 0.6 * RES, alpha(shaded(CONC, 0.2), 0.8));
  }
  // ---- the rusted-rod Wall-of-Remembrance screen (a rank of vertical rods,
  // gappy, behind the wall) ----
  for (let i = 0; i <= 22; i++) {
    const u = u0 + 0.16 + ((u1 - u0 - 0.32) * i) / 22;
    if (i % 5 === 2) continue; // the symbolic gaps
    iso.r.line(iso.P(u, v0 + 0.7, 4), iso.P(u, v0 + 0.7, 30), 0.8 * RES, i % 2 ? RUST : lit(RUST, 0.06));
  }
  // ---- the cylindrical watchTOWER at one end ----
  const tu = u1 - 0.5, tv = v0 + 0.45;
  iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 0, 64, lighten(CONC, 0.02));
  // glazed octagonal cabin on top
  iso.box(tu - 0.17, tv - 0.17, tu + 0.17, tv + 0.17, 64, 78, alpha(COLORS.glassDark, 0.8), {
    leftC: alpha(COLORS.glassDark, 0.85), rightC: alpha(COLORS.glassLit, 0.4),
  });
  iso.r.line(iso.P(tu - 0.17, tv + 0.17, 71), iso.P(tu + 0.17, tv + 0.17, 71), 0.7 * RES, alpha(COLORS.white, 0.5));
  // shallow cap + a swept floodlight
  iso.box(tu - 0.19, tv - 0.19, tu + 0.19, tv + 0.19, 78, 82, shaded(SLATE, 0.04), { ink: false });
  iso.glint(iso.P(tu, tv, 74), 2.2 * RES);
  return iso.build();
}

// =====================================================================
// DENKMAL FÜR DIE ERMORDETEN JUDEN EUROPAS — Eisenman's Holocaust Memorial: a
// vast undulating FIELD of 2,711 grey concrete STELAE in a strict grid on a
// rolling sunken ground, the blocks rising toward the centre. Abstract, grey,
// silent — its silhouette is a sea of slabs. 5×5.
// =====================================================================
function holocaustMemorialTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 90 });
  void seed;
  const CONC = hex('#9c9a96'); // dark concrete stele grey
  const u0 = 0.34, u1 = 4.66, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.18);
  // the rolling ground
  iso.box(u0, v0, u1, v1, 0, 3, shaded(COLORS.pavement, 0.08), { ink: false });
  // a strict grid of stelae; height swells toward the centre (a smooth bump),
  // drawn back-to-front so nearer blocks overlap farther ones correctly.
  const NU = 11, NV = 11;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const gw = (u1 - u0) / NU, gh = (v1 - v0) / NV;
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const bu = u0 + gw * (i + 0.5), bv = v0 + gh * (j + 0.5);
      const dist = Math.hypot((bu - cu) / (u1 - u0), (bv - cv) / (v1 - v0));
      const h = 6 + Math.max(0, 1 - dist * 1.9) * 64; // tall in the middle
      const hw = gw * 0.32, hh = gh * 0.32;
      iso.box(bu - hw, bv - hh, bu + hw, bv + hh, 0, h, CONC, {
        topC: top(CONC, 0.22), leftC: shaded(CONC, 0.26), rightC: lit(CONC, 0.05), ink: h > 14,
      });
    }
  }
  return iso.build();
}

// =====================================================================
// TRÄNENPALAST — the "Palace of Tears", the former GDR border departure hall at
// Friedrichstraße: a single-storey 1960s pavilion of pale STEEL + glass with a
// distinctive scalloped/folded blue roof fascia and a long glazed curtain wall.
// Low, wide, transparent. 3×3.
// =====================================================================
function traenenpalastTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const BLUE = hex('#3d6e8e'); // the GDR petrol-blue roof fascia
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // a low pale podium
  iso.box(u0, v0, u1, v1, 0, 8, lighten(STONE, 0.06));
  // the all-glass hall (set in a touch under the oversailing roof)
  iso.box(u0 + 0.12, v0 + 0.12, u1 - 0.12, v1 - 0.12, 8, 40, alpha(COLORS.glassSky, 0.55), {
    leftC: alpha(COLORS.glassDark, 0.6), rightC: alpha(COLORS.glassLit, 0.4),
  });
  // tall slim mullions all round
  for (let i = 1; i < 12; i++) {
    const u = u0 + 0.12 + ((u1 - u0 - 0.24) * i) / 12;
    iso.r.line(iso.P(u, v1 - 0.12, 8), iso.P(u, v1 - 0.12, 40), 0.6 * RES, alpha(COLORS.white, 0.5));
  }
  for (let i = 1; i < 10; i++) {
    const v = v0 + 0.12 + ((v1 - v0 - 0.24) * i) / 10;
    iso.r.line(iso.P(u1 - 0.12, v, 8), iso.P(u1 - 0.12, v, 40), 0.6 * RES, alpha(COLORS.white, 0.4));
  }
  // ---- the folded/scalloped blue roof fascia (a row of shallow peaks) ----
  const rz = 40;
  iso.box(u0, v0, u1, v1, rz, rz + 4, BLUE, { topC: lit(BLUE, 0.08), ink: false });
  // a sawtooth of small peaks along the front fascia
  const n = 10;
  for (let i = 0; i < n; i++) {
    const ua = u0 + ((u1 - u0) * i) / n, ub = u0 + ((u1 - u0) * (i + 1)) / n, um = (ua + ub) / 2;
    iso.r.poly([iso.P(ua, v1, rz + 4), iso.P(ub, v1, rz + 4), iso.P(um, v1, rz + 11)], i % 2 ? lit(BLUE, 0.1) : BLUE);
    iso.r.polyline([iso.P(ua, v1, rz + 4), iso.P(um, v1, rz + 11), iso.P(ub, v1, rz + 4)], INK_W * 0.6, INK);
  }
  iso.r.polyline([iso.P(u0, v0, rz + 4), iso.P(u1, v0, rz + 4), iso.P(u1, v1, rz + 4), iso.P(u0, v1, rz + 4)], INK_W, INK, true);
  return iso.build();
}

// =====================================================================
// NEUE WACHE — Schinkel's neoclassical guardhouse on Unter den Linden: a small
// austere stone CUBE fronted by a deep Doric portico of six columns under a
// plain pediment, with solid corner pylons (a Roman castrum gate). Now the
// central war memorial. Low, grave, perfectly symmetrical. 2×2.
// =====================================================================
function neueWacheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const u0 = 0.4, u1 = 1.6, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the solid stone block
  iso.box(u0, v0, u1, v1, 0, 40, STONE);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(STONE, 0.14), { ink: false });
  // the heavy corner pylons (project slightly, taller than the wall)
  for (const [pu, pv] of [[u0 + 0.12, v1 - 0.12], [u1 - 0.12, v1 - 0.12], [u1 - 0.12, v0 + 0.12]] as const) {
    iso.box(pu - 0.12, pv - 0.12, pu + 0.12, pv + 0.12, 0, 46, lighten(STONE, 0.04));
  }
  // the deep Doric portico across the front (v1)
  const cx = (u0 + u1) / 2;
  colonnadeL(iso, v1, cx - 0.34, cx + 0.34, 6, 40, 6, COLORS.white);
  // entablature + plain pediment with a low-relief tympanum
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 40, 46, lighten(STONE, 0.06), { topC: top(STONE, 0.26) });
  pediment(iso, v1, cx - 0.4, cx + 0.4, 46, 13, STONE);
  // a row of Victory figures in the tympanum (tiny dark pips)
  for (let i = 0; i < 4; i++) {
    const q = iso.P(cx - 0.22 + i * 0.15, v1, 48);
    iso.r.rect(q[0] - 1 * RES, q[1] - 3 * RES, q[0] + 1 * RES, q[1], alpha(shaded(STONE, 0.3), 0.8));
  }
  return iso.build();
}

// =====================================================================
// BELVEDERE (CHARLOTTENBURG) — the rococo garden teahouse in the Schlosspark: a
// tall slim three-storey RENDER tower, oval in plan, with a bell-curved roof
// rising to a lantern crowned by three gilt putti carrying a basket. Tall,
// delicate, pale. 2×2 with headroom. =====================================================================
function belvedereTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const cx = 1.0, cy = 1.0;
  iso.shadow(0.5, 0.55, 1.5, 1.5, 0.2, 0.22);
  // garden lawn
  iso.box(0.3, 0.35, 1.7, 1.65, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // a low rusticated base
  iso.box(0.5, 0.55, 1.5, 1.5, 0, 12, shaded(RENDER, 0.06));
  // the slim three-storey oval body (taper slightly upward)
  iso.box(0.56, 0.6, 1.44, 1.44, 12, 50, RENDER);
  iso.box(0.6, 0.64, 1.4, 1.4, 50, 84, lighten(RENDER, 0.02));
  // tall round-headed windows over the storeys, both faces
  iso.windowsLeft(1.44, 0.62, 1.38, 18, 44, 3, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(1.4, 0.66, 1.34, 54, 80, 3, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsRight(1.4, 0.66, 1.34, 54, 80, 3, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // cornice
  iso.box(0.58, 0.62, 1.42, 1.42, 84, 88, lighten(RENDER, 0.06), { topC: top(RENDER, 0.3) });
  // ---- the bell-curved (ogee) roof rising to a lantern ----
  const { tipX, tipY } = domeAt(iso, cx, cy, 88, 0.42 * (CELL_W / 2), 1.25, ZINC, { bulb: true, ribs: 6 });
  lantern(iso, tipX, tipY, 12, lighten(ZINC, 0.06), GILT_HOT);
  // three gilt putti + basket finial (a little gold cluster)
  iso.r.poly([[tipX - 3 * RES, tipY - 12 * RES], [tipX + 3 * RES, tipY - 12 * RES], [tipX, tipY - 19 * RES]], GILT);
  iso.glint([tipX, tipY - 14 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// MAUSOLEUM (CHARLOTTENBURG) — the royal mausoleum at the end of a dark avenue:
// a small grave Greek-DORIC temple of grey granite — four baseless columns in
// antis under a low pediment, a windowless cella behind, deep in the trees.
// Tiny, solemn. 2×2. =====================================================================
function mausoleumCharlottenburgTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const GRAN = hex('#7d7a74'); // grey granite
  const u0 = 0.46, u1 = 1.54, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a screen of dark conifers behind it
  iso.cone(u0 + 0.06, v0 + 0.1, 0.22, 64, hex('#2f4636'));
  iso.cone(u1 - 0.04, v0 + 0.16, 0.2, 56, hex('#2f4636'));
  // stepped crepidoma
  iso.box(u0, v0 + 0.18, u1, v1, 0, 8, shaded(GRAN, 0.08));
  // the windowless cella
  iso.box(u0 + 0.16, v0 + 0.24, u1 - 0.16, v1 - 0.16, 8, 40, GRAN);
  // four Doric columns in antis across the front
  colonnadeL(iso, v1, u0 + 0.22, u1 - 0.22, 8, 40, 4, lighten(GRAN, 0.12));
  // the projecting anta walls flanking the porch
  iso.box(u0 + 0.1, v1 - 0.16, u0 + 0.22, v1, 8, 42, lighten(GRAN, 0.05));
  iso.box(u1 - 0.22, v1 - 0.16, u1 - 0.1, v1, 8, 42, lighten(GRAN, 0.05));
  // entablature + low pediment
  iso.box(u0 + 0.06, v0 + 0.2, u1 - 0.06, v1 + 0.02, 40, 46, lighten(GRAN, 0.06), { topC: top(GRAN, 0.22) });
  pediment(iso, v1, u0 + 0.1, u1 - 0.1, 46, 11, GRAN);
  return iso.build();
}

// =====================================================================
// BAHNHOF ALEXANDERPLATZ — the great brick S-/U-Bahn through-station: a long
// yellow-BRICK viaduct of round arches carrying a wide glazed BARREL-VAULT train
// shed that runs across the whole footprint, with arched portals at the ends. A
// long station hero. 4×4 drawn long. =====================================================================
function bahnhofAlexTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 110 });
  void seed;
  const YBRICK = hex('#c9a36a'); // Berlin S-Bahn yellow brick
  const u0 = 0.3, u1 = 3.7, v0 = 0.7, v1 = 3.3;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the brick viaduct base running the length
  iso.box(u0, v0, u1, v1, 0, 30, YBRICK);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(YBRICK, 0.16), { ink: false });
  // round-arched windows along the long flank (the viaduct arcade)
  for (let i = 0; i < 9; i++) {
    const u = u0 + 0.18 + i * 0.38;
    const poly: Pt[] = [iso.P(u, v1, 6), iso.P(u, v1, 20)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.26 * t, v1, 20 + Math.sin(t * Math.PI) * 7)); }
    poly.push(iso.P(u + 0.26, v1, 20), iso.P(u + 0.26, v1, 6));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.8), lit(YBRICK, 0.06));
  }
  // a brick cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 30, 34, lighten(YBRICK, 0.06), { topC: top(YBRICK, 0.24) });
  // ---- the wide glazed barrel-vault train shed running across the top ----
  barrelVault(iso, u0 + 0.05, u1 - 0.05, v0 + 0.05, v1 - 0.05, 34, 78, COLORS.glassSky);
  // the big arched glazed gable portals at each end
  for (const vv of [v0 + 0.05, v1 - 0.05] as const) {
    const um = (u0 + u1) / 2;
    const poly: Pt[] = [iso.P(u0 + 0.05, vv, 34), iso.P(um, vv, 78), iso.P(u1 - 0.05, vv, 34)];
    iso.r.poly(poly, alpha(COLORS.glassLit, 0.4));
    iso.r.polyline(poly, INK_W * 0.7, INK);
  }
  return iso.build();
}

// =====================================================================
// PORTIKUS DES ANHALTER BAHNHOFS — the lone surviving fragment of the demolished
// Anhalter Bahnhof: a craggy ruined yellow-BRICK entrance PORTICO — a tall
// central arch flanked by two pillars carrying broken cornice stumps and the two
// figures of "Day & Night", standing alone on grass. Evocative ruin. 2×2.
// =====================================================================
function anhalterPortikusTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const YBRICK = hex('#c2a06a');
  const u0 = 0.42, u1 = 1.58, v0 = 0.6, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // grass it stands on
  iso.box(0.3, 0.4, 1.7, 1.65, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // the broad brick portico wall (thin in depth — a screen)
  iso.box(u0, v1 - 0.2, u1, v1, 0, 56, YBRICK);
  iso.box(u0 - 0.02, v1 - 0.22, u1 + 0.02, v1, 0, 9, shaded(YBRICK, 0.16), { ink: false });
  // the great central arch void
  const cx = (u0 + u1) / 2;
  const arch: Pt[] = [iso.P(cx - 0.22, v1, 4), iso.P(cx - 0.22, v1, 30)];
  for (let j = 0; j <= 8; j++) { const t = j / 8; arch.push(iso.P(cx - 0.22 + 0.44 * t, v1, 30 + Math.sin(t * Math.PI) * 14)); }
  arch.push(iso.P(cx + 0.22, v1, 30), iso.P(cx + 0.22, v1, 4));
  iso.r.poly(arch, alpha(COLORS.waterDeep, 0.7));
  // flanking pillars rise higher than the centre, with broken (jagged) tops
  for (const pu of [u0 + 0.14, u1 - 0.14] as const) {
    const bz = 56;
    const jag: Pt[] = [
      iso.P(pu - 0.13, v1, bz), iso.P(pu - 0.05, v1, bz + 16), iso.P(pu + 0.04, v1, bz + 4), iso.P(pu + 0.13, v1, bz + 12),
    ];
    iso.r.poly([iso.P(pu - 0.13, v1, bz - 2), ...jag, iso.P(pu + 0.13, v1, bz - 2)], lit(YBRICK, 0.05), shaded(YBRICK, 0.1));
    iso.r.polyline(jag, INK_W * 0.7, INK);
    // a stone figure (Day/Night) on the pillar
    const f = iso.P(pu, v1, bz + 14);
    iso.r.rect(f[0] - 1.6 * RES, f[1] - 7 * RES, f[0] + 1.6 * RES, f[1], alpha(lighten(STONE, 0.06), 0.95));
  }
  // a broken stub of entablature over the arch
  iso.box(cx - 0.26, v1 - 0.04, cx + 0.26, v1, 50, 58, lighten(YBRICK, 0.04), { ink: false });
  return iso.build();
}

// =====================================================================
// TOPOGRAPHIE DES TERRORS — the documentation centre on the former Gestapo site:
// a low, single-storey grey pavilion of horizontal louvred METAL bands + glass
// (Wandel Hoefer Lorch), sitting on raw gravel beside a surviving WALL segment.
// Deliberately mute, horizontal, grey. 3×3. =====================================================================
function topographieTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const MET = hex('#8d9094'); // grey metal louvre
  const CONC = hex('#c3beb4');
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.18);
  // grey gravel ground
  iso.box(u0, v0, u1, v1, 0, 3, shaded(hex('#a9a59c'), 0.06), { ink: false });
  // the low louvred pavilion (set back a little)
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.1, v1 - 0.1, 3, 34, MET, { topC: top(MET, 0.18) });
  // horizontal louvre bands wrapping the two faces
  for (let z = 8; z < 32; z += 4) {
    iso.r.line(iso.P(u0 + 0.3, v1 - 0.1, z), iso.P(u1 - 0.1, v1 - 0.1, z), 1.0 * RES, z % 8 === 0 ? shaded(MET, 0.18) : alpha(COLORS.glassDark, 0.5));
    iso.r.line(iso.P(u1 - 0.1, v0 + 0.3, z), iso.P(u1 - 0.1, v1 - 0.1, z), 1.0 * RES, z % 8 === 0 ? lit(MET, 0.08) : alpha(COLORS.glassLit, 0.3));
  }
  // a thin oversailing roof slab
  iso.box(u0 + 0.26, v0 + 0.26, u1 - 0.06, v1 - 0.06, 34, 37, lighten(MET, 0.06), { ink: false });
  // ---- the surviving rounded-top WALL segment running along the front edge ----
  iso.box(u0 + 0.05, v1 - 0.06, u1 - 0.5, v1, 0, 22, CONC);
  const a = iso.P(u0 + 0.05, v1 - 0.03, 22), b = iso.P(u1 - 0.5, v1 - 0.03, 22);
  iso.r.line(a, b, 2.4 * RES, lighten(CONC, 0.1));
  for (let i = 1; i < 5; i++) { const u = u0 + 0.05 + ((u1 - 0.55) * i) / 5; iso.r.line(iso.P(u, v1, 2), iso.P(u, v1, 22), 0.6 * RES, alpha(shaded(CONC, 0.2), 0.7)); }
  return iso.build();
}

// =====================================================================
// AMERIKA-GEDENKBIBLIOTHEK — the 1950s West-Berlin memorial library: a long low
// pale-stone modernist block on a podium, its facade an austere grid of square
// windows, with a taller set-back glazed reading-room volume behind and a flat
// roof. Horizontal, calm, Bauhaus-by-1954. 3×3. =====================================================================
function amerikaBibliothekTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const STN = hex('#d3cdbf'); // travertine
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // podium
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, shaded(STN, 0.1));
  // the long low front block
  iso.box(u0, v0 + 0.6, u1, v1, 8, 46, STN);
  // a regular grid of square windows on the long facade
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 16, 26, 14, alpha(COLORS.glassDark, 0.85), lighten(STN, 0.06));
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 30, 40, 14, alpha(COLORS.glassDark, 0.85), lighten(STN, 0.06));
  iso.windowsRight(u1, v0 + 0.64, v1 - 0.1, 16, 40, 10, alpha(COLORS.glassDark, 0.85), lighten(STN, 0.06));
  // thin roof fascia
  iso.box(u0 - 0.02, v0 + 0.58, u1 + 0.02, v1 + 0.02, 46, 49, lighten(STN, 0.06), { topC: top(STN, 0.26) });
  // ---- the taller set-back glazed reading-room volume behind ----
  iso.box(u0 + 0.3, v0 + 0.1, u1 - 0.3, v0 + 0.62, 8, 64, alpha(COLORS.glassSky, 0.5), {
    leftC: alpha(COLORS.glassDark, 0.6), rightC: alpha(COLORS.glassLit, 0.4),
  });
  for (let i = 1; i < 9; i++) { const u = u0 + 0.3 + ((u1 - u0 - 0.6) * i) / 9; iso.r.line(iso.P(u, v0 + 0.62, 10), iso.P(u, v0 + 0.62, 64), 0.6 * RES, alpha(COLORS.white, 0.45)); }
  iso.box(u0 + 0.28, v0 + 0.08, u1 - 0.28, v0 + 0.64, 64, 67, lighten(STN, 0.04), { ink: false });
  return iso.build();
}

// =====================================================================
// CORBUSIERHAUS — Le Corbusier's Berlin Unité d'Habitation ("Typ Berlin"): a
// huge long béton-brut SLAB lifted on massive pilotis, the facade a deep
// concrete brise-soleil grid punched with panels painted in primary RED / BLUE /
// YELLOW, crowned by a sculptural roofscape. A monster modernist hero. 4×4.
// =====================================================================
function corbusierhausTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 200 });
  void seed;
  const BETON = hex('#bdb6a8'); // raw concrete
  const RED = hex('#b5503e'), BLU = hex('#3f6ea0'), YEL = hex('#cb9b4a');
  const u0 = 1.0, u1 = 3.0, v0 = 0.5, v1 = 3.5; // a SLAB: narrow in u, long in v
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the massive pilotis lifting the slab
  for (let i = 0; i <= 5; i++) {
    const v = v0 + 0.2 + ((v1 - v0 - 0.4) * i) / 5;
    iso.box(u0 + 0.3, v - 0.06, u0 + 0.5, v + 0.06, 0, 20, shaded(BETON, 0.1));
    iso.box(u1 - 0.5, v - 0.06, u1 - 0.3, v + 0.06, 0, 20, shaded(BETON, 0.1));
  }
  // the great slab body
  iso.box(u0 + 0.3, v0 + 0.1, u1 - 0.3, v1 - 0.1, 20, 150, BETON);
  // the deep brise-soleil grid with coloured panels on the long (left, v1) face
  const vL = v1 - 0.1;
  for (let row = 0; row < 9; row++) {
    const z = 26 + row * 14;
    iso.r.line(iso.P(u0 + 0.3, vL, z), iso.P(u1 - 0.3, vL, z), 0.7 * RES, alpha(shaded(BETON, 0.2), 0.8));
    for (let col = 0; col < 9; col++) {
      const va = (v1 - v0 - 0.2);
      const vv = v0 + 0.1 + va * (col / 9) + va * 0.04;
      const w = va * (1 / 9) * 0.5;
      const cols = [RED, BLU, YEL, BETON, BETON];
      const cc = cols[(row * 3 + col) % cols.length]!;
      if (cc === BETON) continue;
      iso.r.poly([iso.P(u0 + 0.3, vv, z + 2), iso.P(u0 + 0.3, vv + w, z + 2), iso.P(u0 + 0.3, vv + w, z + 10), iso.P(u0 + 0.3, vv, z + 10)], alpha(cc, 0.92));
    }
  }
  // mullions on the short right (u1) end
  for (let i = 1; i < 6; i++) { const v = v0 + 0.1 + ((v1 - v0 - 0.2) * i) / 6; void v; }
  iso.windowsRight(u1 - 0.3, v0 + 0.14, v1 - 0.14, 30, 144, 14, alpha(COLORS.glassDark, 0.7), undefined);
  // ---- the sculptural concrete roofscape (a set-back penthouse + fin) ----
  iso.box(u0 + 0.5, v0 + 0.4, u1 - 0.5, v0 + 1.4, 150, 168, lighten(BETON, 0.04), { topC: top(BETON, 0.2) });
  iso.r.poly([iso.P(u0 + 0.5, v0 + 0.9, 168), iso.P(u1 - 0.5, v0 + 0.9, 168), iso.P(u1 - 0.5, v0 + 0.9, 182), iso.P(u0 + 0.5, v0 + 0.9, 182)], shaded(BETON, 0.06));
  return iso.build();
}

// =====================================================================
// ZOO PALAST — the iconic 1950s West-Berlin premiere cinema: a long horizontal
// modernist block with a sweeping cantilevered marquee CANOPY over the entry, a
// big blank wall for the film posters/lettering, and a slim vertical sign-fin.
// Curtain-glass foyer below. The Berlinale's old home. 3×3. =====================================================================
function zooPalastTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const CRM = hex('#d8d0c0'); // cream cladding
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the long block
  iso.box(u0, v0, u1, v1, 0, 52, CRM);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(CRM, 0.12), { ink: false });
  // the glazed foyer band along the bottom of the front (v1)
  iso.box(u0 + 0.06, v1 - 0.05, u1 - 0.06, v1, 0, 18, alpha(COLORS.glassLit, 0.5), { ink: false });
  for (let i = 1; i < 10; i++) { const u = u0 + ((u1 - u0) * i) / 10; iso.r.line(iso.P(u, v1, 2), iso.P(u, v1, 18), 0.5 * RES, alpha(STEEL, 0.6)); }
  // a big blank poster panel on the upper facade with warm "lettering" glints
  iso.r.poly([iso.P(u0 + 0.2, v1, 24), iso.P(u1 - 0.6, v1, 24), iso.P(u1 - 0.6, v1, 46), iso.P(u0 + 0.2, v1, 46)], shaded(CRM, 0.08));
  for (let i = 0; i < 5; i++) iso.glint(iso.P(u0 + 0.34 + i * 0.18, v1, 36), 1.6 * RES);
  // ---- the sweeping cantilevered marquee canopy over the entry ----
  iso.box(u0 + 0.02, v1 - 0.02, u1 - 0.5, v1 + 0.22, 18, 22, hex('#c64f3e'), { topC: lit(hex('#c64f3e'), 0.1) });
  iso.r.line(iso.P(u0 + 0.02, v1 + 0.22, 20), iso.P(u1 - 0.5, v1 + 0.22, 20), 1.2 * RES, GILT_HOT);
  // the slim vertical sign-fin
  iso.box(u1 - 0.4, v1 - 0.06, u1 - 0.28, v1 + 0.06, 0, 70, hex('#b5483a'));
  for (let z = 14; z < 66; z += 8) iso.glint(iso.P(u1 - 0.34, v1, z), 1.4 * RES);
  return iso.build();
}

// =====================================================================
// SYNAGOGE RYKESTRASSE — Germany's largest synagogue: a tall red-BRICK
// Romanesque-Revival basilica reached through a gatehouse arch in a courtyard,
// with a high gabled west front pierced by a great rose window + round-arched
// portal, and a steep slate roof. Brick, rose, rounded. 3×3. =====================================================================
function rykestrasseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.5, u1 = 2.5, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the tall basilica nave (set back, runs front→back)
  iso.box(u0 + 0.4, v0 + 0.2, u1 - 0.4, v1, 0, 70, BRICK);
  iso.gable(u0 + 0.4, v0 + 0.2, u1 - 0.4, v1, 70, 26, 'u', SLATE, BRICK);
  // round-arched clerestory windows down the flank
  iso.windowsRight(u1 - 0.4, v0 + 0.26, v1 - 0.06, 30, 60, 6, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.08));
  // string-courses
  for (const z of [26, 50] as const) iso.r.line(iso.P(u1 - 0.4, v0 + 0.2, z), iso.P(u1 - 0.4, v1, z), 1.0 * RES, lit(SAND, 0.06));
  // ---- the high gabled west front facing the viewer (v1) ----
  const cx = (u0 + u1) / 2;
  iso.box(u0 + 0.34, v1 - 0.04, u1 - 0.34, v1, 0, 78, lit(BRICK, 0.02));
  iso.gable(u0 + 0.34, v1 - 0.16, u1 - 0.34, v1, 78, 18, 'u', SLATE, BRICK);
  // the great rose window
  const [rx, ry] = iso.P(cx, v1, 56);
  const RR = 5.5 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; rose.push([rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.92]); }
  iso.r.poly(rose, alpha(GILT, 0.5), alpha(GILT_HOT, 0.3));
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; iso.r.line([rx, ry], [rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.92], 0.5 * RES, alpha(INK, 0.5)); }
  // the round-arched portal
  const portal: Pt[] = [iso.P(cx - 0.16, v1, 4), iso.P(cx - 0.16, v1, 26)];
  for (let j = 0; j <= 6; j++) { const t = j / 6; portal.push(iso.P(cx - 0.16 + 0.32 * t, v1, 26 + Math.sin(t * Math.PI) * 9)); }
  portal.push(iso.P(cx + 0.16, v1, 26), iso.P(cx + 0.16, v1, 4));
  iso.r.poly(portal, alpha(COLORS.waterDeep, 0.7), lit(GILT, 0.05));
  // small flanking turrets at the gable shoulders
  for (const tu of [u0 + 0.42, u1 - 0.42] as const) {
    iso.box(tu - 0.06, v1 - 0.08, tu + 0.06, v1, 78, 90, lighten(BRICK, 0.04), { ink: false });
    const ap = iso.P(tu, v1 - 0.04, 100);
    iso.r.poly([iso.P(tu - 0.06, v1, 90), iso.P(tu + 0.06, v1, 90), ap], shaded(COPPER, 0.06));
    iso.r.line(ap, [ap[0], ap[1] - 4 * RES], 0.8 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// FELDSTEINKIRCHE — a medieval Brandenburg VILLAGE church of grey fieldstone
// rubble: a short broad nave with a steep saddle roof and a squat west TOWER
// carrying a hipped or saddle cap. Serves the oldest village churches (Alte
// Dorfkirche, Sankt-Annen-Kirche Dahlem). Speckled grey stone. 2×2. =====================================================================
function feldsteinkircheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  const grey = hex('#8f8a82');
  const u0 = 0.52, u1 = 1.48, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // an old churchyard with a couple of trees
  iso.box(0.34, 0.4, 1.66, 1.64, 0, 3, shaded(COLORS.grass, 0.12), { ink: false });
  iso.ball(1.6, 0.5, 0.16, 30, hex('#4a6240'));
  // the broad low nave
  iso.box(u0, v0 + 0.34, u1, v1, 0, 34, grey);
  fieldstone(iso, u0, v0 + 0.34, u1, v1, 0, 34, seed);
  iso.gable(u0, v0 + 0.34, u1, v1, 34, 16, 'u', SLATE, grey);
  // a small round-arched window or two on the flank
  iso.windowsRight(u1, v0 + 0.42, v1 - 0.08, 12, 26, 3, alpha(COLORS.glassDark, 0.85), lit(grey, 0.06));
  // ---- the squat west tower ----
  const tu = u0 + 0.36, tv = v0 + 0.34;
  iso.box(tu - 0.22, tv - 0.2, tu + 0.22, tv + 0.16, 0, 58, grey);
  fieldstone(iso, tu - 0.22, tv - 0.2, tu + 0.22, tv + 0.16, 0, 58, seed + 7);
  // belfry openings near the top
  iso.windowsLeft(tv + 0.16, tu - 0.16, tu + 0.16, 42, 54, 2, alpha(COLORS.glassDark, 0.8), lit(grey, 0.06));
  // a steep saddle (Satteldach) cap with two slate gables
  iso.gable(tu - 0.22, tv - 0.2, tu + 0.22, tv + 0.16, 58, 18, 'v', SLATE, grey);
  return iso.build();
}

// =====================================================================
// STÜLER-KIRCHE — a Stüler/Schinkel-school POLYCHROME-BRICK Rundbogenstil church:
// a yellow + red banded brick basilica with a free-standing Italianate CAMPANILE
// tower and a round-arched arcaded west front. Serves Sankt Matthäus-Kirche (the
// Kulturforum landmark). Striped brick, campanile. 2×2. =====================================================================
function stuelerKircheTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 160 });
  void seed;
  const RBR = hex('#b25a45'), YBR = hex('#cdab6e'); // red & yellow brick bands
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the banded-brick nave
  iso.box(u0, v0 + 0.18, u1 - 0.16, v1, 0, 46, RBR);
  // yellow string-courses banding the red brick
  for (const z of [10, 22, 34] as const) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1 - 0.16, v1, z), 1.6 * RES, YBR);
    iso.r.line(iso.P(u1 - 0.16, v0 + 0.18, z), iso.P(u1 - 0.16, v1, z), 1.6 * RES, lit(YBR, 0.06));
  }
  iso.gable(u0, v0 + 0.18, u1 - 0.16, v1, 46, 16, 'u', SLATE, RBR);
  // round-arched windows
  iso.windowsRight(u1 - 0.16, v0 + 0.24, v1 - 0.06, 14, 38, 5, alpha(COLORS.glassDark, 0.85), YBR);
  // a small apse bump at the back
  iso.box(u0 + 0.2, v0 + 0.06, u0 + 0.6, v0 + 0.2, 0, 30, RBR);
  // ---- the free-standing Italianate campanile at the front-right ----
  const tu = u1 - 0.18, tv = v1 - 0.2;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 0, 104, RBR);
  for (const z of [26, 52, 78] as const) iso.r.line(iso.P(tu - 0.16, tv + 0.16, z), iso.P(tu + 0.16, tv + 0.16, z), 1.4 * RES, YBR);
  // arcaded belfry openings near the top (Rundbogenstil)
  iso.windowsLeft(tv + 0.16, tu - 0.12, tu + 0.12, 84, 98, 2, alpha(COLORS.glassDark, 0.85), YBR);
  // a low pyramidal tiled cap with deep eaves
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.18, 104, 108, lit(RBR, 0.04), { ink: false });
  iso.hip(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 108, 18, hex('#7a4030'));
  return iso.build();
}

// =====================================================================
// BACKSTEIN TWIN-TOWER CHURCH — a 19th-c brick church with a tall pair of
// matching west TOWERS + pointed copper spires framing a gabled, rose-windowed
// front. Serves St. Joseph (and other Wilhelmine twin-spire parishes). Brick,
// symmetrical, twin spikes. 2×2. =====================================================================
function twinTowerChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the nave behind
  iso.box(u0 + 0.12, v0 + 0.1, u1 - 0.12, v1 - 0.28, 0, 52, BRICK);
  iso.gable(u0 + 0.12, v0 + 0.1, u1 - 0.12, v1 - 0.28, 52, 18, 'u', SLATE, BRICK);
  // the gabled front wall between the towers, with a rose
  const cx = (u0 + u1) / 2;
  iso.box(u0 + 0.28, v1 - 0.3, u1 - 0.28, v1 - 0.18, 0, 60, lit(BRICK, 0.02));
  const [rx, ry] = iso.P(cx, v1 - 0.18, 42);
  const RR = 4 * RES; const rose: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; rose.push([rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.9]); }
  iso.r.poly(rose, alpha(COLORS.glassDark, 0.7)); iso.r.polyline(rose, INK_W * 0.6, INK, true);
  // ---- the twin west towers + pointed copper spires ----
  for (const tu of [u0 + 0.16, u1 - 0.16] as const) {
    const tv = v1 - 0.18;
    iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.1, 0, 96, BRICK);
    iso.r.line(iso.P(tu - 0.12, tv + 0.1, 64), iso.P(tu + 0.12, tv + 0.1, 64), 1.0 * RES, lit(BRICK, 0.1));
    iso.windowsLeft(tv + 0.1, tu - 0.09, tu + 0.09, 70, 88, 1, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
    // copper spire
    iso.box(tu - 0.13, tv - 0.13, tu + 0.13, tv + 0.11, 96, 102, lighten(BRICK, 0.04), { ink: false });
    const apex = iso.P(tu, tv - 0.01, 150);
    const c0 = iso.P(tu - 0.13, tv + 0.11, 102), c1 = iso.P(tu + 0.13, tv + 0.11, 102), c2 = iso.P(tu + 0.13, tv - 0.13, 102);
    iso.r.poly([c0, c1, apex], shaded(COPPER, 0.06));
    iso.r.poly([c1, c2, apex], lit(COPPER, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 6 * RES], 0.9 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// MARIA REGINA MARTYRUM — the modernist Catholic memorial church (1963) for the
// martyrs of Nazism: a stark windowless raised concrete WORSHIP-BOX floating on
// piers over an austere walled atrium, with a free-standing slab CAMPANILE.
// Béton-brut, abstract, grave. 3×3. =====================================================================
function mariaReginaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const BETON = hex('#bcb6aa');
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the low walled atrium enclosing the court
  iso.box(u0, v0, u1, v1, 0, 18, shaded(BETON, 0.06), { topC: top(BETON, 0.14) });
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 0, 4, shaded(COLORS.pavement, 0.06), { ink: false });
  // piers lifting the worship-box at the back
  for (const [pu, pv] of [[u0 + 0.7, v0 + 0.5], [u1 - 0.7, v0 + 0.5], [u0 + 0.7, v0 + 1.1], [u1 - 0.7, v0 + 1.1]] as const) {
    iso.box(pu - 0.05, pv - 0.05, pu + 0.05, pv + 0.05, 18, 40, shaded(BETON, 0.12));
  }
  // ---- the raised windowless concrete worship-box ----
  iso.box(u0 + 0.5, v0 + 0.35, u1 - 0.5, v0 + 1.3, 40, 78, BETON, { topC: top(BETON, 0.2) });
  // a sparse grid of relief panels (the cast concrete texture)
  for (let i = 1; i < 6; i++) { const v = v0 + 0.4 + ((0.85) * i) / 6; iso.r.line(iso.P(u1 - 0.5, v, 44), iso.P(u1 - 0.5, v, 74), 0.6 * RES, alpha(shaded(BETON, 0.2), 0.7)); }
  for (const z of [52, 64] as const) iso.r.line(iso.P(u1 - 0.5, v0 + 0.35, z), iso.P(u1 - 0.5, v0 + 1.3, z), 0.6 * RES, alpha(shaded(BETON, 0.18), 0.7));
  // ---- the free-standing slab campanile ----
  const tu = u1 - 0.4, tv = v1 - 0.4;
  iso.box(tu - 0.06, tv - 0.18, tu + 0.06, tv + 0.18, 0, 96, lighten(BETON, 0.02));
  // open bell slot near the top
  iso.r.rect(iso.P(tu, tv + 0.18, 78)[0] - 1.6 * RES, iso.P(tu, tv + 0.18, 78)[1] - 6 * RES, iso.P(tu, tv + 0.18, 78)[0] + 1.6 * RES, iso.P(tu, tv + 0.18, 78)[1], alpha(COLORS.waterDeep, 0.7));
  const crossB = iso.P(tu, tv, 96);
  iso.r.line(crossB, [crossB[0], crossB[1] - 16 * RES], 1 * RES, alpha(STEEL, 0.8)); // a thin cross
  iso.r.line([crossB[0] - 3 * RES, crossB[1] - 11 * RES], [crossB[0] + 3 * RES, crossB[1] - 11 * RES], 1 * RES, alpha(STEEL, 0.8));
  return iso.build();
}

// =====================================================================
// BRICK BASILICA — a Wilhelmine red-BRICK basilica with a tall single corner
// tower, a long clerestoried nave + lower aisles, and a round apse. Serves the
// larger neo-Romanesque/gothic parishes (Rosenkranz-Basilika, Zum Guten Hirten,
// Königin-Luise-Gedächtniskirche w/ octagon variant). `octagon` swaps the spire
// for an octagonal lantern dome. 2×2. =====================================================================
function brickBasilikaTile(seed: number, octagon: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: octagon ? 150 : 190 });
  void seed;
  const u0 = 0.5, u1 = 1.5, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // lower aisle + tall clerestory nave (two stacked masses)
  iso.box(u0, v0 + 0.2, u1, v1, 0, 30, BRICK); // aisle band
  iso.box(u0 + 0.16, v0 + 0.2, u1 - 0.16, v1, 0, 54, lit(BRICK, 0.02)); // clerestory
  iso.gable(u0 + 0.16, v0 + 0.2, u1 - 0.16, v1, 54, 16, 'u', SLATE, BRICK);
  // round apse at the back
  iso.box(u0 + 0.28, v0 + 0.04, u0 + 0.72, v0 + 0.22, 0, 36, BRICK);
  // round-arched windows
  iso.windowsRight(u1, v0 + 0.28, v1 - 0.06, 10, 26, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  iso.windowsRight(u1 - 0.16, v0 + 0.28, v1 - 0.06, 38, 50, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  // ---- the single corner tower ----
  const tu = u0 + 0.26, tv = v1 - 0.22;
  iso.box(tu - 0.2, tv - 0.18, tu + 0.2, tv + 0.18, 0, 92, BRICK);
  for (const z of [40, 68] as const) iso.r.line(iso.P(tu - 0.2, tv + 0.18, z), iso.P(tu + 0.2, tv + 0.18, z), 1.0 * RES, lit(BRICK, 0.08));
  iso.windowsLeft(tv + 0.18, tu - 0.14, tu + 0.14, 72, 88, 2, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  if (octagon) {
    // an octagonal lantern + low cap
    iso.box(tu - 0.17, tv - 0.17, tu + 0.17, tv + 0.17, 92, 110, lit(BRICK, 0.04));
    iso.windowsLeft(tv + 0.17, tu - 0.13, tu + 0.13, 94, 106, 2, alpha(COLORS.glassLit, 0.4), lit(BRICK, 0.06));
    const { tipX, tipY } = domeAt(iso, tu, tv, 110, 0.17 * (CELL_W / 2), 0.9, COPPER, { ribs: 6, bulb: true });
    lantern(iso, tipX, tipY, 8, COPPER_D, GILT_HOT);
  } else {
    // a tall pointed copper spire
    iso.box(tu - 0.21, tv - 0.19, tu + 0.21, tv + 0.19, 92, 98, lighten(BRICK, 0.04), { ink: false });
    const apex = iso.P(tu, tv, 144);
    const c0 = iso.P(tu - 0.21, tv + 0.19, 98), c1 = iso.P(tu + 0.21, tv + 0.19, 98), c2 = iso.P(tu + 0.21, tv - 0.19, 98);
    iso.r.poly([c0, c1, apex], shaded(COPPER, 0.06));
    iso.r.poly([c1, c2, apex], lit(COPPER, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
    iso.r.line(apex, [apex[0], apex[1] - 6 * RES], 0.9 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// BACKSTEIN HALL-CHURCH (tall single spire) — a slim Wilhelmine red-BRICK gothic
// church dominated by ONE very tall west tower + a soaring pointed spire over a
// modest nave. Serves Apostel-Paulus-Kirche, Zwölf-Apostel-Kirche, Kirche Zum
// Vaterhaus. Brick, one big spike. 2×2. =====================================================================
function spireChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 230 });
  void seed;
  const u0 = 0.54, u1 = 1.46, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the modest nave
  iso.box(u0, v0 + 0.24, u1, v1, 0, 44, BRICK);
  iso.gable(u0, v0 + 0.24, u1, v1, 44, 16, 'u', SLATE, BRICK);
  iso.windowsRight(u1, v0 + 0.3, v1 - 0.06, 10, 38, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.08));
  // ---- the dominant single west tower ----
  const tu = u0 + 0.34, tv = v0 + 0.24;
  iso.box(tu - 0.22, tv - 0.22, tu + 0.22, tv + 0.18, 0, 112, BRICK);
  for (const z of [40, 72, 100] as const) iso.r.line(iso.P(tu - 0.22, tv + 0.18, z), iso.P(tu + 0.22, tv + 0.18, z), 1.0 * RES, lit(BRICK, 0.08));
  // a pointed-arch belfry pair near the top
  iso.windowsLeft(tv + 0.18, tu - 0.16, tu + 0.16, 86, 106, 2, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  // gablets at the tower top
  iso.gable(tu - 0.22, tv - 0.22, tu + 0.22, tv + 0.18, 112, 8, 'u', SLATE, BRICK);
  // the soaring copper spire with corner pinnacles
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.16, 120, 126, lighten(BRICK, 0.04), { ink: false });
  const apex = iso.P(tu, tv - 0.01, 196);
  const c0 = iso.P(tu - 0.18, tv + 0.16, 126), c1 = iso.P(tu + 0.18, tv + 0.16, 126), c2 = iso.P(tu + 0.18, tv - 0.18, 126);
  iso.r.poly([c0, c1, apex], shaded(COPPER, 0.06));
  iso.r.poly([c1, c2, apex], lit(COPPER, 0.06));
  iso.r.polyline([c0, apex, c2], INK_W * 0.6, INK);
  for (const [pu, pv] of [[tu - 0.18, tv + 0.16], [tu + 0.18, tv + 0.16], [tu + 0.18, tv - 0.18]] as const) {
    const pb = iso.P(pu, pv, 126);
    iso.r.line(pb, [pb[0], pb[1] - 12 * RES], 1.1 * RES, lit(BRICK, 0.06));
    iso.r.line([pb[0], pb[1] - 12 * RES], [pb[0], pb[1] - 18 * RES], 0.8 * RES, shaded(COPPER, 0.06));
  }
  iso.r.line(apex, [apex[0], apex[1] - 7 * RES], 0.9 * RES, GILT);
  return iso.build();
}

// =====================================================================
// KULTURBRAUEREI — the great Prenzlauer Berg brewery, now a cultural quarter: a
// dense ensemble of red-and-yellow BRICK industrial halls of varying heights
// around courts, gabled and stepped, with a tall round brick CHIMNEY. Rambling,
// muscular, polychrome brick. 4×4. =====================================================================
function kulturbrauereiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 130 });
  void seed;
  const RBR = hex('#a8513c'), YBR = hex('#cdab6e');
  const u0 = 0.3, u1 = 3.7, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // a cluster of brick wings of different heights
  const wings: Array<[number, number, number, number, number]> = [
    [u0, v0, 1.7, 1.7, 56],
    [1.6, v0, u1, 1.5, 44],
    [u0, 1.6, 1.5, v1, 48],
    [1.5, 1.5, u1, v1, 60],
    [1.2, 1.2, 2.6, 2.6, 38],
  ];
  for (const [a0, b0, a1, b1, h] of wings) {
    iso.box(a0, b0, a1, b1, 0, h, RBR);
    // yellow brick string-courses
    for (const z of [12, h - 10]) if (z > 14) iso.r.line(iso.P(a0, b1, z), iso.P(a1, b1, z), 1.4 * RES, YBR);
    // segmental factory windows on the long face
    iso.windowsLeft(b1, a0 + 0.1, a1 - 0.1, 14, h - 14, Math.max(3, Math.round((a1 - a0) * 4)), alpha(COLORS.glassDark, 0.82), YBR);
    // a shallow gable cap
    iso.gable(a0, b0, a1, b1, h, 7, 'u', SLATE, RBR);
  }
  // the tall round brick chimney
  chimney(iso, u1 - 0.55, v0 + 0.5, 116, 0.09);
  return iso.build();
}

// =====================================================================
// WASSERTURM — a historic round red-BRICK water tower: a tall cylindrical brick
// shaft widening to a corbelled brick TANK-house drum near the top under a
// conical or domed slate cap. A Berlin skyline punctuation. 2×2 with headroom.
// =====================================================================
function wasserturmTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 170 });
  void seed;
  const u = 1.0, v = 1.0;
  iso.shadow(u - 0.4, v - 0.28, u + 0.4, v + 0.46, 0.26, 0.26);
  // small green base
  iso.box(0.42, 0.48, 1.58, 1.52, 0, 4, shaded(COLORS.grass, 0.1), { ink: false });
  // a SHORTER, modest brick shaft (the Prenzlauer Berg tower is squat — the
  // fat tank-house drum dominates, not the stalk)
  iso.box(u - 0.24, v - 0.24, u + 0.24, v + 0.24, 4, 56, BRICK);
  // string-courses up the shaft
  for (const z of [22, 42] as const) iso.r.line(iso.P(u - 0.24, v + 0.24, z), iso.P(u + 0.24, v + 0.24, z), 1.2 * RES, lit(BRICK, 0.08));
  // narrow slit windows
  iso.windowsLeft(v + 0.24, u - 0.16, u + 0.16, 18, 48, 2, alpha(COLORS.glassDark, 0.8), lit(BRICK, 0.06));
  // ---- the great corbelled tank-house drum (MUCH wider + tall — the signature
  // fat brick cylinder) ----
  // a corbel band flaring out from the shaft to the drum
  iso.box(u - 0.34, v - 0.34, u + 0.34, v + 0.34, 56, 62, shaded(BRICK, 0.06), { ink: false });
  iso.box(u - 0.46, v - 0.46, u + 0.46, v + 0.46, 62, 118, lit(BRICK, 0.03));
  // two tiers of round-arched windows round the tank
  iso.windowsLeft(v + 0.46, u - 0.4, u + 0.4, 68, 86, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  iso.windowsLeft(v + 0.46, u - 0.4, u + 0.4, 92, 110, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  iso.windowsRight(u + 0.46, v - 0.4, v + 0.4, 68, 110, 5, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  // a heavy corbelled brick cornice crowning the drum
  iso.r.line(iso.P(u - 0.46, v + 0.46, 113), iso.P(u + 0.46, v + 0.46, 113), 1.8 * RES, lit(BRICK, 0.1));
  iso.box(u - 0.5, v - 0.5, u + 0.5, v + 0.5, 118, 122, lighten(BRICK, 0.04), { topC: top(BRICK, 0.2), ink: false });
  // ---- the prominent conical slate cap (tall, with a finial) ----
  const { tipX, tipY } = domeAt(iso, u, v, 122, 0.5 * (CELL_W / 2), 1.35, SLATE, { ribs: 8 });
  iso.r.line([tipX, tipY], [tipX, tipY - 9 * RES], 1.1 * RES, GILT);
  iso.glint([tipX, tipY - 5 * RES], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// MARKTHALLE — a 19th-c iron + BRICK market hall: a long red-brick shell with
// big round-arched portals and a wide glazed BARREL-VAULT iron roof with a raised
// clerestory ridge. Serves Arminiusmarkthalle, Markthalle VII (Marheineke).
// Brick + glass span. 3×3 drawn long. =====================================================================
function marktHalleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.6, v1 = 2.4;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the brick base shell
  iso.box(u0, v0, u1, v1, 0, 34, BRICK);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(BRICK, 0.16), { ink: false });
  // big round-arched portals along the front (v1)
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.22 + i * 0.6;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 22)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.34 * t, v1, 22 + Math.sin(t * Math.PI) * 9)); }
    poly.push(iso.P(u + 0.34, v1, 22), iso.P(u + 0.34, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.8), lit(BRICK, 0.05));
  }
  // sandstone string-course + cornice
  iso.r.line(iso.P(u0, v1, 28), iso.P(u1, v1, 28), 1.2 * RES, lighten(SAND, 0.06));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 34, 38, lighten(BRICK, 0.06), { topC: top(BRICK, 0.2) });
  // ---- the glazed barrel-vault iron roof with a clerestory ridge ----
  barrelVault(iso, u0 + 0.06, u1 - 0.06, v0 + 0.06, v1 - 0.06, 38, 70, COLORS.glassSky);
  // a raised lantern ridge along the crown
  const vm = (v0 + v1) / 2;
  iso.box(u0 + 0.1, vm - 0.12, u1 - 0.1, vm + 0.12, 70, 78, alpha(COLORS.glassLit, 0.45), { ink: false });
  iso.r.line(iso.P(u0 + 0.1, vm, 78), iso.P(u1 - 0.1, vm, 78), 0.9 * RES, alpha(STEEL, 0.7));
  return iso.build();
}

// =====================================================================
// SCHWERBELASTUNGSKÖRPER — the surreal Nazi-era "heavy load-bearing body": a
// single colossal raw-CONCRETE cylinder sunk into the ground (a soil-compression
// test for Speer's Germania triumphal arch), standing alone, stained and grim.
// A pure dark concrete drum. 2×2. =====================================================================
function schwerbelastungTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const CONC = hex('#aaa49a'); // stained grey concrete
  const u = 1.0, v = 1.0;
  iso.shadow(u - 0.34, v - 0.24, u + 0.34, v + 0.38, 0.24, 0.26);
  // bare ground
  iso.box(0.4, 0.45, 1.6, 1.55, 0, 3, shaded(hex('#9a958c'), 0.06), { ink: false });
  // the colossal cylinder (a tall, slightly tapering drum)
  iso.box(u - 0.34, v - 0.34, u + 0.34, v + 0.34, 0, 96, CONC, { topC: top(CONC, 0.16), leftC: shaded(CONC, 0.24), rightC: lit(CONC, 0.04) });
  // formwork ring lines + vertical board-marks + dark water-staining
  for (let z = 10; z < 92; z += 12) iso.r.line(iso.P(u - 0.34, v + 0.34, z), iso.P(u + 0.34, v + 0.34, z), 0.8 * RES, alpha(shaded(CONC, 0.22), 0.7));
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    iso.r.line(iso.P(u - 0.34 + 0.68 * t, v + 0.34, 2), iso.P(u - 0.34 + 0.68 * t, v + 0.34, 94), 0.5 * RES, alpha(darken(CONC, 0.12), 0.5));
  }
  // a couple of dark vertical stains
  iso.r.line(iso.P(u - 0.1, v + 0.34, 90), iso.P(u - 0.1, v + 0.34, 30), 1.6 * RES, alpha(darken(CONC, 0.2), 0.35));
  // a small measuring cabin doorway at the base
  iso.r.rect(iso.P(u, v + 0.34, 2)[0] - 2 * RES, iso.P(u, v + 0.34, 16)[1], iso.P(u, v + 0.34, 2)[0] + 2 * RES, iso.P(u, v + 0.34, 2)[1], alpha(COLORS.waterDeep, 0.7));
  return iso.build();
}

// =====================================================================
// BUNDESRAT (former Preußisches Herrenhaus) — the grand neo-Baroque former
// Prussian House of Lords on Leipziger Straße: a long sandstone palace front
// with a strong rusticated base, a giant-order central PORTICO of engaged
// columns under a pediment + cartouche, and a balustraded roof. 3×3. =====================================================================
function bundesratTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.3, u1 = 2.7, v0 = 0.55, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the long palace block, two grand storeys on a rusticated base
  iso.box(u0, v0, u1, v1, 0, 62, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 16, shaded(SAND, 0.16), { ink: false });
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 20, 36, 13, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 42, 56, 13, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, 20, 56, 11, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  // balustraded roof
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 62, 68, lighten(SAND, 0.08), { topC: top(SAND, 0.28) });
  // ---- the giant central portico + pediment + cartouche ----
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.46, v1 - 0.16, cx + 0.46, v1, 0, 66, lighten(SAND, 0.03));
  colonnadeL(iso, v1, cx - 0.4, cx + 0.4, 16, 62, 6, COLORS.white);
  pediment(iso, v1, cx - 0.44, cx + 0.44, 66, 13, SAND);
  // cartouche / sculpture group on the pediment
  const q = iso.P(cx, v1, 70);
  iso.r.poly([[q[0] - 4 * RES, q[1]], [q[0] + 4 * RES, q[1]], [q[0], q[1] - 6 * RES]], COPPER);
  iso.glint([q[0], q[1] - 3 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// GARTENPALAIS — a small late-baroque/neoclassical garden manor: a compact
// render villa of two storeys with a low hipped roof, a pedimented centre and a
// little belvedere or balustrade, set in a green plot. Serves Schoeler-
// Schlösschen, Gutshaus Steglitz (Wrangelschlösschen). 2×2. =====================================================================
function gartenpalaisTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.44, u1 = 1.56, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // garden
  iso.box(0.3, 0.36, 1.7, 1.64, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  iso.ball(0.36, 1.5, 0.14, 26, hex('#4a6240'));
  // the villa body
  iso.box(u0, v0, u1, v1, 0, 40, RENDER);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, shaded(RENDER, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 10, 20, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 24, 34, 6, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 10, 34, 5, alpha(COLORS.glassDark, 0.85), COLORS.white);
  // cornice + low hipped mansard
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 40, 44, lighten(RENDER, 0.06), { topC: top(RENDER, 0.3) });
  iso.hip(u0, v0, u1, v1, 44, 12, ZINC);
  // central pedimented frontispiece
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.22, v1 - 0.1, cx + 0.22, v1, 0, 44, lighten(RENDER, 0.04));
  pediment(iso, v1, cx - 0.24, cx + 0.24, 44, 8, RENDER);
  return iso.build();
}

// =====================================================================
// HISTORISTENBLOCK — a Wilhelmine historicist civic/industrial brick block with
// a render-and-brick facade, a strong cornice, paired pilasters and a low roof.
// Serves Hubertusbad (the grand Lichtenberg baths) and Heeresbäckerei (the
// military bakery). Brick + render, monumental but earthbound. 3×3. =====================================================================
function historistenblockTile(seed: number, baths: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const body = baths ? hex('#c9bfa6') : BRICK; // baths = render+stone; bakery = brick
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  iso.box(u0, v0, u1, v1, 0, 52, body);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(body, 0.14), { ink: false });
  // three storeys of windows
  for (const [zb, zt] of [[16, 26], [30, 40], [44, 50]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 12, alpha(COLORS.glassDark, 0.85), baths ? lighten(body, 0.08) : lit(SAND, 0.04));
  }
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 16, 50, 11, alpha(COLORS.glassDark, 0.85), baths ? lighten(body, 0.08) : lit(SAND, 0.04));
  // a strong cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 52, 57, lighten(body, 0.06), { topC: top(body, 0.26) });
  if (baths) {
    // a central glazed gable hall + flanking corner pavilions (the swimming hall)
    const cx = (u0 + u1) / 2;
    iso.box(cx - 0.5, v0 + 0.1, cx + 0.5, v1, 57, 74, lighten(body, 0.03));
    iso.gable(cx - 0.5, v0 + 0.1, cx + 0.5, v1, 74, 14, 'v', ZINC, body);
    // big arched hall window in the gable
    iso.r.poly([iso.P(cx - 0.4, v1, 60), iso.P(cx, v1, 84), iso.P(cx + 0.4, v1, 60)], alpha(COLORS.glassLit, 0.4));
    for (const cu of [u0 + 0.18, u1 - 0.18] as const) cornerTower(iso, cu, v1 - 0.18, 0.16, 57, 12, 14, body, ZINC);
  } else {
    // the bakery: a long low hipped roof + roof vents
    iso.hip(u0, v0, u1, v1, 57, 12, SLATE);
    for (const cu of [u0 + 0.6, (u0 + u1) / 2, u1 - 0.6] as const) {
      const p = iso.P(cu, (v0 + v1) / 2, 65);
      iso.r.rect(p[0] - 2 * RES, p[1] - 6 * RES, p[0] + 2 * RES, p[1], shaded(ZINC, 0.1));
    }
  }
  return iso.build();
}

// =====================================================================
// ROUND-3 SHARED PRIMITIVES — the famous icons (TV tower, airport, stadium,
// stations, department stores) + a wider modern/civic family toward the 100.
// =====================================================================

/** A faceted SPHERE (ball-on-a-stick) at a screen point + base height — the
 *  Fernsehturm's steel ball, a planetarium, a gasometer crown. Returns the
 *  sphere's top Y (for the antenna/finial). Drawn as stacked horizontal poly
 *  rings so it reads round in the iso; `mer` adds vertical meridian lines. */
function sphereAt(
  iso: Iso,
  cx: number,
  cy: number,
  baseZ: number,
  rPx: number,
  body: RGBA,
  opts: { mer?: number; band?: RGBA } = {},
): { topX: number; topY: number; cyPx: number } {
  const [sx, syGround] = iso.P(cx, cy, baseZ);
  const cyPx = syGround - rPx; // sphere centre sits a radius above its base
  // outline disc (slightly squashed for the iso)
  const disc = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([sx + Math.cos(a) * rPx * s, cyPx + Math.sin(a) * rPx * 0.98 * s]);
    }
    return pts;
  };
  iso.r.poly(disc(1), shaded(body, 0.1), lit(body, 0.06));
  // a lit crescent toward the sun (upper-right)
  iso.r.poly(disc(0.62).map(([x, y]): Pt => [x + rPx * 0.22, y - rPx * 0.2]), lit(body, 0.14));
  // latitude bands
  for (const f of [-0.45, 0, 0.45] as const) {
    const yy = cyPx + f * rPx;
    const hw = Math.sqrt(Math.max(0, 1 - f * f)) * rPx;
    iso.r.line([sx - hw, yy], [sx + hw, yy], 0.7 * RES, alpha(shaded(body, 0.2), 0.7));
  }
  // meridians (the disco-ball facet seams)
  for (let k = 0; k < (opts.mer ?? 0); k++) {
    const f = (k / Math.max(1, (opts.mer ?? 1) - 1)) * 2 - 1;
    iso.r.line([sx + f * rPx, cyPx], [sx + f * rPx * 0.2, cyPx - rPx * 0.96], 0.5 * RES, alpha(shaded(body, 0.16), 0.6));
  }
  if (opts.band) {
    // a bright equatorial band (windows of the observation deck)
    iso.r.line([sx - rPx, cyPx], [sx + rPx, cyPx], 2.6 * RES, opts.band);
    iso.r.line([sx - rPx, cyPx - 1.6 * RES], [sx + rPx, cyPx - 1.6 * RES], 0.8 * RES, lit(opts.band, 0.1));
  }
  iso.r.polyline(disc(1), INK_W * 0.8, INK, true);
  return { topX: sx, topY: cyPx - rPx, cyPx };
}

// =====================================================================
// FERNSEHTURM — Berlin's tallest structure and unmistakable icon: a slim
// tapering CONCRETE shaft rising 250 m to the great stainless-steel SPHERE
// (observation deck + revolving café, its facets catching the sun as the
// "Pope's Revenge" cross), then a tall red-and-white antenna mast spiking far
// higher. The whole East-Berlin skyline in one silhouette. 2×2, huge headroom.
// =====================================================================
function fernsehturmTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 440 });
  void seed;
  const CONC = COLORS.concrete;
  const u = 1.0, v = 1.0;
  iso.shadow(u - 0.4, v - 0.28, u + 0.42, v + 0.5, 0.42, 0.26);
  // a small paved plaza apron (the foot at Alexanderplatz)
  iso.box(0.36, 0.42, 1.64, 1.62, 0, 3, shaded(COLORS.pavement, 0.05), { ink: false });
  // the splayed concrete foot (a low flaring base)
  iso.box(u - 0.32, v - 0.32, u + 0.32, v + 0.32, 3, 20, shaded(CONC, 0.08));
  // the VERY tall tapering shaft — the Fernsehturm must tower over everything
  // (368 m, by far Berlin's tallest). Three diminishing drums; sphere at H2.
  const H1 = 200, H2 = 286; // sphere springs around H2
  iso.box(u - 0.15, v - 0.15, u + 0.15, v + 0.15, 20, H1, CONC, {
    leftC: shaded(CONC, 0.16), rightC: lit(CONC, 0.05),
  });
  iso.box(u - 0.105, v - 0.105, u + 0.105, v + 0.105, H1, H2, lit(CONC, 0.02), {
    leftC: shaded(CONC, 0.14), rightC: lit(CONC, 0.06),
  });
  // fine concrete form-lines up the shaft (vertical relief)
  for (const du of [-0.08, 0, 0.08] as const) {
    iso.r.line(iso.P(u + du, v + 0.15, 22), iso.P(u + du, v + 0.15, H1), 0.5 * RES, alpha(shaded(CONC, 0.18), 0.5));
  }
  // ---- the great stainless-steel SPHERE (the observation deck + café) ----
  const STEELB = hex('#9fb0bd'); // brushed stainless
  const { topX, topY } = sphereAt(iso, u, v, H2, 0.46 * (CELL_W / 2), STEELB, {
    mer: 9, band: alpha(COLORS.glassLit, 0.85),
  });
  // a glint where the famous reflective cross catches the light
  iso.glint([topX + 6 * RES, topY + 13 * RES], 2.6 * RES);
  // a thin collar where the shaft re-emerges above the sphere
  iso.r.line([topX, topY + 4 * RES], [topX, topY - 8 * RES], 2.0 * RES, lit(CONC, 0.04));
  // ---- the tall red/white antenna mast spiking far above the sphere ----
  let z = topY - 8 * RES;
  const seg = 13 * RES;
  for (let i = 0; i < 9; i++) {
    iso.r.line([topX, z], [topX, z - seg], (2.2 - i * 0.2) * RES, i % 2 ? hex('#c94436') : COLORS.white);
    z -= seg;
  }
  // the warning beacon at the very tip
  iso.r.line([topX - 1.4 * RES, z], [topX + 1.4 * RES, z], 2 * RES, hex('#ff5a4a'));
  return iso.build();
}

// =====================================================================
// FLUGHAFEN TEMPELHOF — the colossal Nazi-era airport, one of the world's
// largest buildings: a vast limestone-clad block that sweeps in a gentle 1.2 km
// ARC, fronted by a continuous cantilevered hangar CANOPY over the apron and
// crowned by stone eagle-piers. A true MONSTER footprint. 5×5, drawn long+curved.
// =====================================================================
function tempelhofTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 130 });
  void seed;
  const LIME = hex('#cabf9f'); // Muschelkalk limestone
  const u0 = 0.3, u1 = 4.7, v0 = 0.6, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // the open apron / Tempelhofer Feld in front
  iso.box(u0, v1 - 0.9, u1, v1, 0, 3, shaded(COLORS.pavement, 0.06), { ink: false });
  // the long head block, stepped in plan to suggest the gentle curve: three
  // wings at receding v so the front edge bows toward the viewer.
  const wings: Array<[number, number, number, number, number]> = [
    // u0, v0, u1, v1, height
    [u0, v0, u0 + 1.7, v0 + 1.5, 70],
    [u0 + 1.5, v0 + 0.18, u1 - 1.5, v0 + 1.62, 74], // centre, pushed a touch forward + taller
    [u1 - 1.7, v0, u1, v0 + 1.5, 70],
  ];
  for (const [a0, b0, a1, b1, h] of wings) {
    iso.box(a0, b0, a1, b1, 0, h, LIME);
    // the dense regular grid of windows on the long stone flank (v1 face)
    iso.windowsLeft(b1, a0 + 0.1, a1 - 0.1, 16, 30, Math.round((a1 - a0) * 6), alpha(COLORS.glassDark, 0.85), lighten(LIME, 0.06));
    iso.windowsLeft(b1, a0 + 0.1, a1 - 0.1, 36, 50, Math.round((a1 - a0) * 6), alpha(COLORS.glassDark, 0.85), lighten(LIME, 0.06));
    iso.windowsLeft(b1, a0 + 0.1, a1 - 0.1, 56, h - 6, Math.round((a1 - a0) * 6), alpha(COLORS.glassDark, 0.85), lighten(LIME, 0.06));
    // a heavy stone cornice
    iso.box(a0 - 0.02, b0 - 0.02, a1 + 0.02, b1 + 0.02, h, h + 5, lighten(LIME, 0.06), { topC: top(LIME, 0.24) });
  }
  // ---- the great cantilevered hangar CANOPY sweeping along the apron front ----
  const cz0 = 40, cz1 = 52;
  iso.box(u0 + 0.2, v1 - 0.5, u1 - 0.2, v1 - 0.32, cz0, cz1, lit(LIME, 0.03), { topC: top(LIME, 0.2) });
  // the row of tall slim columns carrying the canopy lip
  for (let i = 0; i <= 16; i++) {
    const uu = u0 + 0.3 + ((u1 - u0 - 0.6) * i) / 16;
    iso.r.line(iso.P(uu, v1 - 0.34, 0), iso.P(uu, v1 - 0.34, cz0), 1.0 * RES, shaded(LIME, 0.14));
  }
  iso.r.line(iso.P(u0 + 0.2, v1 - 0.34, cz0), iso.P(u1 - 0.2, v1 - 0.34, cz0), INK_W, INK);
  // stone eagle-piers projecting at the wing ends (square pylons w/ a dark cap)
  for (const cu of [u0 + 0.3, u1 - 0.3] as const) {
    iso.box(cu - 0.14, v0 + 0.1, cu + 0.14, v0 + 0.38, 0, 84, lighten(LIME, 0.04));
    const q = iso.P(cu, v0 + 0.24, 84);
    iso.r.poly([[q[0] - 4 * RES, q[1]], [q[0] + 4 * RES, q[1]], [q[0] + 5 * RES, q[1] - 5 * RES], [q[0] - 3 * RES, q[1] - 4 * RES]], shaded(hex('#6f6a5c'), 0.05));
  }
  return iso.build();
}

// =====================================================================
// OLYMPIASTADION — the 1936 Olympic stadium: a vast shallow elliptical stone
// BOWL ringed by a colonnade of pale travertine piers, sunk into the ground so
// only the upper tier shows, with the iconic MARATHONTOR gap and the modern
// translucent ring-ROOF floating on a forest of slender masts. Monster. 5×5.
// =====================================================================
function olympiastadionTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 90 });
  void seed;
  const TRAV = hex('#d2c8b2'); // travertine
  const cu = 2.5, cv = 2.5;
  const [cx, cyB] = iso.P(cu, cv, 0);
  iso.shadow(0.3, 0.5, 4.7, 4.5, 0.24, 0.2);
  const RX = 0.52 * 5 * (CELL_W / 2);
  const RY = RX * 0.5;
  const ring = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  const WALL = 42 * RES;
  // the outer stone bowl wall (the travertine ring)
  iso.r.poly([...ring(RX, RY, 0), ...ring(RX, RY, WALL).reverse()], TRAV);
  // the colonnade of piers round the outer wall (vertical ticks)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const x = cx + Math.cos(a) * RX, y = cyB + Math.sin(a) * RY;
    iso.r.line([x, y], [x, y - WALL], 1.0 * RES, i % 2 ? shaded(TRAV, 0.16) : lit(TRAV, 0.05));
  }
  // seating tiers + the green pitch
  iso.r.poly(ring(RX * 0.9, RY * 0.9, WALL), shaded(hex('#b8ae97'), 0.06));
  iso.r.poly(ring(RX * 0.66, RY * 0.66, WALL - 3 * RES), darken(COLORS.orange, 0.3));
  iso.r.poly(ring(RX * 0.5, RY * 0.5, WALL - 5 * RES), hex('#5f9e4e'));
  // the blue running track ring
  iso.r.polyline(ring(RX * 0.6, RY * 0.6, WALL - 4 * RES), 2.2 * RES, alpha(hex('#3f6ea0'), 0.8), true);
  iso.r.polyline(ring(RX, RY, WALL), INK_W, INK, true);
  iso.r.polyline(ring(RX, RY, 0), INK_W * 0.7, alpha(INK, 0.5), true);
  // ---- the floating translucent ring-roof on slender masts ----
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = cx + Math.cos(a) * RX * 1.02, y = cyB + Math.sin(a) * RY * 1.02;
    iso.r.line([x, y - WALL], [x, y - WALL - 28 * RES], 0.9 * RES, COLORS.steelDark);
  }
  // the translucent roof band itself (a pale ring riding the mast tops)
  iso.r.poly([...ring(RX * 1.1, RY * 1.1, WALL + 28 * RES), ...ring(RX * 0.74, RY * 0.74, WALL + 28 * RES).reverse()], alpha(COLORS.glassSky, 0.42));
  iso.r.polyline(ring(RX * 1.1, RY * 1.1, WALL + 28 * RES), INK_W * 0.7, alpha(INK, 0.5), true);
  // the Marathontor break (the open end with the cauldron) — a gleam
  iso.gleam([cx - RX * 0.9, cyB - WALL - 10 * RES], [cx - RX * 0.5, cyB - RY * 0.7 - WALL], 1.4 * RES);
  return iso.build();
}

// =====================================================================
// EAST SIDE GALLERY — the longest surviving stretch of the BERLIN WALL, now an
// open-air gallery: a long run of the rounded-top concrete Hinterland-wall
// segments painted in vivid murals (Brezhnev–Honecker "Fraternal Kiss", the
// Trabant breaking through), running along the Spree by the Oberbaumbrücke. 3×3.
// =====================================================================
function eastSideGalleryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const CONC = hex('#cdc7bb'); // wall concrete
  const u0 = 0.2, u1 = 2.8, vm = 1.7;
  // the Spree behind the wall (low v) + the riverside walk in front
  iso.box(0.05, 0.05, 2.95, vm - 0.2, 0, 1, shaded(COLORS.water, 0.04), { ink: false });
  iso.box(u0, vm - 0.1, u1, 2.7, 0, 3, shaded(COLORS.pavement, 0.05), { ink: false });
  iso.shadow(u0, vm - 0.16, u1, vm + 0.12, 0.16, 0.2);
  // the long wall: a single run with the characteristic rounded sewer-pipe top
  const wz = 38;
  iso.box(u0, vm - 0.12, u1, vm, 0, wz, CONC, { leftC: shaded(CONC, 0.14), rightC: lit(CONC, 0.04) });
  const a = iso.P(u0, vm - 0.06, wz), b = iso.P(u1, vm - 0.06, wz);
  iso.r.line(a, b, 3.0 * RES, lighten(CONC, 0.1));
  iso.r.line([a[0], a[1] - 1.4 * RES], [b[0], b[1] - 1.4 * RES], 1.0 * RES, top(CONC, 0.2));
  // the murals: blocks of vivid colour panelled along the river-facing (v=vm) face
  const palette = [hex('#c64f3e'), hex('#e0b34a'), hex('#3f8e84'), hex('#3f6ea0'), hex('#a8567f'), hex('#6f9e4e')];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const ua = u0 + ((u1 - u0) * i) / N + 0.02, ub = u0 + ((u1 - u0) * (i + 1)) / N - 0.02;
    const c = palette[i % palette.length]!;
    iso.r.poly([iso.P(ua, vm, 4), iso.P(ub, vm, 4), iso.P(ub, vm, wz - 3), iso.P(ua, vm, wz - 3)], alpha(c, 0.9));
    // a couple of mural "figures" — simpler darker accents
    iso.r.line(iso.P((ua + ub) / 2, vm, 8), iso.P((ua + ub) / 2, vm, wz - 6), 0.8 * RES, alpha(darken(c, 0.25), 0.7));
  }
  // panel seams
  for (let i = 0; i <= N; i++) {
    const uu = u0 + ((u1 - u0) * i) / N;
    iso.r.line(iso.P(uu, vm, 2), iso.P(uu, vm, wz), 0.6 * RES, alpha(shaded(CONC, 0.2), 0.7));
  }
  return iso.build();
}

// =====================================================================
// KAUFHAUS DES WESTENS (KaDeWe) — continental Europe's grandest department
// store: a massive seven-storey stone-and-render block on Tauentzienstraße,
// a strong horizontal cornice, ranks of big shop windows, a glazed top-floor
// food-hall/winter-garden and a flat roof with the rooftop dome lantern. 4×4.
// =====================================================================
function kadeweTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 120 });
  void seed;
  const STN = hex('#d4cbb6');
  const u0 = 0.34, u1 = 3.66, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the great block — tall, six trading storeys
  iso.box(u0, v0, u1, v1, 0, 78, STN);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(STN, 0.14), { ink: false });
  // a big glazed shop-window band at street level (the display windows, lit)
  iso.box(u0 + 0.04, v1 - 0.05, u1 - 0.04, v1, 0, 14, alpha(COLORS.glassLit, 0.6), { ink: false });
  for (let i = 1; i < 14; i++) iso.r.line(iso.P(u0 + ((u1 - u0) * i) / 14, v1, 2), iso.P(u0 + ((u1 - u0) * i) / 14, v1, 14), 0.6 * RES, alpha(STEEL, 0.6));
  // four storeys of regular windows up the two faces
  for (const [zb, zt] of [[20, 32], [36, 48], [52, 64], [68, 76]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 16, alpha(COLORS.glassDark, 0.85), lighten(STN, 0.06));
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, 14, alpha(COLORS.glassDark, 0.85), lighten(STN, 0.06));
  }
  // a strong stone cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 78, 84, lighten(STN, 0.06), { topC: top(STN, 0.26) });
  // ---- the glazed top-floor food-hall / winter garden set back on the roof ----
  iso.box(u0 + 0.4, v0 + 0.4, u1 - 0.4, v1 - 0.4, 84, 100, alpha(COLORS.glassSky, 0.55), {
    leftC: alpha(COLORS.glassDark, 0.6), rightC: alpha(COLORS.glassLit, 0.4),
  });
  for (let i = 1; i < 10; i++) { const u = u0 + 0.4 + ((u1 - u0 - 0.8) * i) / 10; iso.r.line(iso.P(u, v1 - 0.4, 86), iso.P(u, v1 - 0.4, 100), 0.6 * RES, alpha(COLORS.white, 0.5)); }
  // a low glazed barrel skylight over the winter garden
  barrelVault(iso, u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, 100, 112, COLORS.glassSky);
  iso.glint(iso.P((u0 + u1) / 2, (v0 + v1) / 2, 112), 2.4 * RES);
  return iso.build();
}

// =====================================================================
// BERLIN HAUPTBAHNHOF — Europe's largest crossing-station: a vast glittering
// GLASS hall, a long curved barrel-vault train-shed pierced at right angles by
// two big GLASS office "bridge" blocks straddling the tracks — a luminous glass
// CROSS. All steel + glass, modern, transparent. A monster station. 5×5.
// =====================================================================
function hauptbahnhofTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 120 });
  void seed;
  const u0 = 0.3, u1 = 4.7, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // a low glazed concourse podium
  iso.box(u0, v0, u1, v1, 0, 20, alpha(COLORS.glassSky, 0.55), {
    leftC: alpha(COLORS.glassDark, 0.62), rightC: alpha(COLORS.glassLit, 0.42),
  });
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 6, shaded(hex('#9aa3ab'), 0.1), { ink: false });
  // glazing mullions on the podium so it reads as a glass building, not a lot
  for (let i = 1; i < 18; i++) iso.r.line(iso.P(u0 + ((u1 - u0) * i) / 18, v1, 4), iso.P(u0 + ((u1 - u0) * i) / 18, v1, 20), 0.5 * RES, alpha(COLORS.white, 0.4));
  // the long low glazed train shed running NE–SW across the middle (a shallow
  // segmental glass roof — kept LOW so the cross-blocks read as the icon, not
  // a busy vault). A single bowed plane + a few ribs, no end-gable triangles.
  {
    const vS0 = 1.75, vS1 = 3.25, vSm = (vS0 + vS1) / 2;
    iso.r.poly([iso.P(u0 + 0.1, vSm, 40), iso.P(u1 - 0.1, vSm, 40), iso.P(u1 - 0.1, vS1, 22), iso.P(u0 + 0.1, vS1, 22)], alpha(COLORS.glassSky, 0.5));
    iso.r.poly([iso.P(u0 + 0.1, vS0, 22), iso.P(u1 - 0.1, vS0, 22), iso.P(u1 - 0.1, vSm, 40), iso.P(u0 + 0.1, vSm, 40)], alpha(lit(COLORS.glassSky, 0.1), 0.45));
    iso.r.line(iso.P(u0 + 0.1, vSm, 40), iso.P(u1 - 0.1, vSm, 40), 0.9 * RES, alpha(COLORS.white, 0.6));
    for (let i = 1; i < 9; i++) { const uu = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 9; iso.r.polyline([iso.P(uu, vS0, 22), iso.P(uu, vSm, 40), iso.P(uu, vS1, 22)], 0.5 * RES, alpha(STEEL, 0.5)); }
  }
  // the two GLASS office bridge-blocks straddling the tracks at right angles
  // (crossing the shed) — the famous glass cross. They run in v, set wide apart,
  // and rise tall + bright so the cross dominates the silhouette.
  for (const cu of [1.5, u1 - 1.5] as const) {
    iso.box(cu - 0.46, v0 + 0.1, cu + 0.46, v1 - 0.1, 36, 112, alpha(COLORS.glassSky, 0.72), {
      leftC: alpha(COLORS.glassDark, 0.72), rightC: alpha(COLORS.glassLit, 0.5),
    });
    // a fine mullion grid on the long glass flank
    for (let i = 1; i < 17; i++) { const vv = v0 + 0.1 + ((v1 - v0 - 0.2) * i) / 17; iso.r.line(iso.P(cu - 0.46, vv, 38), iso.P(cu - 0.46, vv, 112), 0.5 * RES, alpha(COLORS.white, 0.5)); }
    for (const z of [54, 70, 86, 102] as const) iso.r.line(iso.P(cu - 0.46, v0 + 0.1, z), iso.P(cu - 0.46, v1 - 0.1, z), 0.5 * RES, alpha(COLORS.white, 0.45));
    iso.windowsRight(cu + 0.46, v0 + 0.12, v1 - 0.12, 40, 108, 14, alpha(COLORS.glassLit, 0.5), undefined);
    // a thin bowed glass roof on each bridge
    iso.box(cu - 0.48, v0 + 0.08, cu + 0.48, v1 - 0.08, 112, 117, alpha(COLORS.glassLit, 0.55), { ink: false });
    iso.r.polyline([iso.P(cu - 0.46, v0 + 0.1, 112), iso.P(cu + 0.46, v0 + 0.1, 112), iso.P(cu + 0.46, v1 - 0.1, 112), iso.P(cu - 0.46, v1 - 0.1, 112)], INK_W * 0.8, INK, true);
  }
  iso.glint(iso.P(1.5, 2.5, 112), 2.6 * RES);
  iso.glint(iso.P(u1 - 1.5, 2.5, 112), 2.6 * RES);
  return iso.build();
}

// =====================================================================
// HACKESCHE HÖFE — the largest interlinked COURTYARD complex in Germany: a
// dense block of Jugendstil tenement wings around eight hidden courts, the
// signature first court faced in glazed POLYCHROME tiles (cream + blue +
// geometric patterns), steep mansard roofs, gabled dormers. 3×3.
// =====================================================================
function hackescheHoefeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const FACE = hex('#dcd2bd'); // cream render
  const TILE = hex('#cdb86a'); // ochre/cream glazed tile
  const BLU = hex('#3f6ea0'); // the blue Jugendstil tilework
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // a ring of wings around an open court (a square donut)
  const H = 64;
  iso.box(u0, v0, u1, v0 + 0.7, 0, H, FACE); // back wing (taller, the tiled facade)
  iso.box(u0, v1 - 0.7, u1, v1, 0, H - 6, FACE); // front wing
  iso.box(u0, v0, u0 + 0.7, v1, 0, H - 4, FACE); // left wing
  iso.box(u1 - 0.7, v0, u1, v1, 0, H - 4, FACE); // right wing
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(FACE, 0.14), { ink: false });
  // the open courtyard floor
  iso.box(u0 + 0.7, v0 + 0.7, u1 - 0.7, v1 - 0.7, 0, 3, shaded(COLORS.pavement, 0.06), { ink: false });
  // ---- the signature glazed-tile facade on the front wing (v1 face) ----
  // geometric tile bands in ochre + blue between the window rows
  for (const z of [16, 30, 44] as const) {
    iso.r.line(iso.P(u0 + 0.1, v1, z), iso.P(u1 - 0.1, v1, z), 2.0 * RES, TILE);
    iso.r.line(iso.P(u0 + 0.1, v1, z + 2), iso.P(u1 - 0.1, v1, z + 2), 0.8 * RES, alpha(BLU, 0.8));
    // little diamond accents
    for (let i = 0; i < 8; i++) {
      const p = iso.P(u0 + 0.2 + i * 0.28, v1, z + 1);
      iso.r.rect(p[0] - 1.2 * RES, p[1] - 1.2 * RES, p[0] + 1.2 * RES, p[1] + 1.2 * RES, alpha(BLU, 0.7));
    }
  }
  // windows on the courtyard + outer faces
  for (const [zb, zt] of [[20, 28], [34, 42], [48, 56]] as const) {
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, zb, zt, 9, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, zb, zt, 8, alpha(COLORS.glassDark, 0.85), lighten(FACE, 0.06));
  }
  // steep mansard roofs with dormers on each wing
  iso.gable(u0, v0, u1, v0 + 0.72, H, 14, 'u', SLATE, FACE);
  iso.hip(u0, v1 - 0.72, u1, v1, H - 6, 12, ZINC);
  // a couple of gabled dormers poking from the front mansard
  for (const cu of [u0 + 0.7, (u0 + u1) / 2, u1 - 0.7] as const) {
    const d = iso.P(cu, v1, H - 4);
    iso.r.poly([[d[0] - 3 * RES, d[1]], [d[0] + 3 * RES, d[1]], [d[0], d[1] - 7 * RES]], lit(ZINC, 0.06));
  }
  return iso.build();
}

// =====================================================================
// BATCH B — bespoke draws covering already-PLACED Berlin names that had no
// hero yet (Brücke-Museum, AVUS-Tribüne, Stasi prison, Soho House, the Spree
// warehouse, the Eierhäuschen). No named[] edit needed — these names exist.
// =====================================================================

// --- BRÜCKE-MUSEUM — Düttmann's 1967 pavilion in the Grunewald: a low, calm
// single-storey block of pale rendered walls + a flat oversailing roof, glazed
// to a sculpture court, set among pines. Quiet modernism. 3×3.
function bruckeMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const STN = hex('#ddd6c6');
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.18);
  // pines around it
  iso.cone(u0 + 0.04, v0 + 0.06, 0.2, 56, hex('#2f4636'));
  iso.cone(u1 - 0.02, v1 - 0.04, 0.18, 48, hex('#33503c'));
  // the low rendered block (an L of two wings round a court)
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.1, v0 + 1.2, 0, 30, STN);
  iso.box(u0 + 0.2, v0 + 1.1, u0 + 1.2, v1 - 0.1, 0, 30, STN);
  iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.06, v1 - 0.06, 0, 4, shaded(STN, 0.1), { ink: false });
  // the open sculpture court
  iso.box(u0 + 1.2, v0 + 1.2, u1 - 0.2, v1 - 0.2, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // glazed court-facing walls
  iso.windowsRight(u1 - 0.1, v0 + 0.26, v0 + 1.14, 6, 26, 7, alpha(COLORS.glassLit, 0.5), undefined);
  iso.windowsLeft(v1 - 0.1, u0 + 0.26, u0 + 1.14, 6, 26, 7, alpha(COLORS.glassLit, 0.5), undefined);
  // a few small clerestory windows on the outer walls
  iso.windowsLeft(v0 + 0.2, u0 + 0.3, u1 - 0.2, 18, 26, 8, alpha(COLORS.glassDark, 0.8), lighten(STN, 0.06));
  // the thin flat oversailing roof
  iso.box(u0 + 0.14, v0 + 0.14, u1 - 0.04, v0 + 1.24, 30, 34, lighten(STN, 0.06), { topC: top(STN, 0.24) });
  iso.box(u0 + 0.14, v0 + 1.04, u0 + 1.24, v1 - 0.04, 30, 34, lighten(STN, 0.06), { topC: top(STN, 0.24) });
  return iso.build();
}

// --- AVUS-TRIBÜNE — the 1937 grandstand of the AVUS motor-racing circuit: a
// long stepped concrete SPECTATOR STAND with a cantilevered roof, beside the
// slim brick-and-render race CONTROL TOWER with a clock. Modernist sport. 3×3.
function avusTribuneTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const CONC = hex('#cfc8b8');
  const u0 = 0.3, u1 = 2.7, v0 = 0.6, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the track apron in front
  iso.box(u0, v1 - 0.5, u1, v1, 0, 3, shaded(hex('#8d8a86'), 0.06), { ink: false });
  iso.r.line(iso.P(u0, v1 - 0.25, 3), iso.P(u1, v1 - 0.25, 3), 1.0 * RES, alpha(COLORS.marking, 0.7));
  // the raked grandstand: a wedge of stepped seating
  const sz0 = 6, sz1 = 40;
  iso.box(u0 + 0.2, v0 + 0.3, u1 - 0.7, v0 + 0.9, 0, sz1, CONC);
  // stepped seat rows on the front (v0+0.9) face
  for (let i = 0; i < 6; i++) {
    const z = sz0 + (sz1 - sz0) * (i / 6);
    iso.r.line(iso.P(u0 + 0.2, v0 + 0.9, z), iso.P(u1 - 0.7, v0 + 0.9, z), 1.6 * RES, i % 2 ? shaded(CONC, 0.16) : lit(CONC, 0.05));
  }
  // the cantilevered roof slab over the stand
  iso.box(u0 + 0.16, v0 + 0.26, u1 - 0.66, v0 + 1.2, sz1, sz1 + 5, lighten(CONC, 0.06), { topC: top(CONC, 0.22) });
  for (let i = 0; i <= 6; i++) { const uu = u0 + 0.24 + ((u1 - 0.94 - u0) * i) / 6; iso.r.line(iso.P(uu, v0 + 1.2, 0), iso.P(uu, v0 + 1.2, sz1), 0.9 * RES, shaded(CONC, 0.14)); }
  // ---- the slim control tower at the right end ----
  const tu = u1 - 0.4, tv = v0 + 0.5;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.16, tv + 0.16, 0, 72, lighten(CONC, 0.02));
  iso.windowsLeft(tv + 0.16, tu - 0.12, tu + 0.12, 40, 64, 3, alpha(COLORS.glassDark, 0.85), lighten(CONC, 0.06));
  // a clock dial near the top
  const [clx, cly] = iso.P(tu, tv + 0.16, 60);
  const RR = 3.4 * RES; const dial: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; dial.push([clx + Math.cos(a) * RR, cly - RR * 0.7 + Math.sin(a) * RR]); }
  iso.r.poly(dial, COLORS.white); iso.r.polyline(dial, INK_W * 0.6, INK, true);
  iso.box(tu - 0.18, tv - 0.18, tu + 0.18, tv + 0.18, 72, 76, shaded(CONC, 0.04), { ink: false });
  return iso.build();
}

// --- GEDENKSTÄTTE BERLIN-HOHENSCHÖNHAUSEN — the former Stasi remand prison: a
// long, grim, windowless-looking rendered cell-block with tiny barred slit
// windows, a perimeter WALL with a watch-corner, and a barrier gate. Bleak,
// institutional, grey-render. 4×4.
function stasiPrisonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  const REND = hex('#b9b3a4'); // GDR grey render
  const u0 = 0.3, u1 = 3.7, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the perimeter wall enclosing the yard
  iso.box(u0, v0, u1, v1, 0, 16, shaded(REND, 0.06), { topC: top(REND, 0.12) });
  iso.box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, 0, 3, shaded(COLORS.pavement, 0.08), { ink: false });
  // the long cell-block (set back), three storeys, mean little windows
  iso.box(u0 + 0.5, v0 + 0.4, u1 - 0.5, v0 + 1.5, 0, 50, REND);
  for (const [zb, zt] of [[12, 18], [24, 30], [36, 42]] as const) {
    iso.windowsLeft(v0 + 1.5, u0 + 0.6, u1 - 0.6, zb, zt, 20, alpha(COLORS.glassDark, 0.9), shaded(REND, 0.08));
  }
  // the bars on the windows (a faint grille hatch)
  for (let i = 0; i < 20; i++) { const uu = u0 + 0.62 + ((u1 - 1.24 - u0) * i) / 20; iso.r.line(iso.P(uu, v0 + 1.5, 12), iso.P(uu, v0 + 1.5, 42), 0.4 * RES, alpha(STEEL, 0.5)); }
  iso.box(u0 + 0.48, v0 + 0.38, u1 - 0.48, v0 + 1.52, 50, 54, lighten(REND, 0.04), { topC: top(REND, 0.2) });
  // a watch-corner box on the wall + a swept floodlight
  const wu = u1 - 0.24, wv = v1 - 0.24;
  iso.box(wu - 0.14, wv - 0.14, wu + 0.14, wv + 0.14, 16, 34, lighten(REND, 0.02));
  iso.box(wu - 0.17, wv - 0.17, wu + 0.17, wv + 0.17, 34, 42, alpha(COLORS.glassDark, 0.8), { leftC: alpha(COLORS.glassDark, 0.85), rightC: alpha(COLORS.glassLit, 0.35) });
  iso.glint(iso.P(wu, wv, 38), 1.8 * RES);
  // a red-white barrier at the gate (front wall)
  const g = iso.P((u0 + u1) / 2, v1, 16);
  iso.r.line([g[0] - 6 * RES, g[1] - 4 * RES], [g[0] + 6 * RES, g[1] - 7 * RES], 1.4 * RES, hex('#c94436'));
  return iso.build();
}

// --- SOHO HOUSE BERLIN — the 1928 Bauhaus-era former department store
// (Jonass, later the FDJ HQ) now a members' club: a big rounded-corner brick-
// and-render block, strong horizontal window bands, a stepped-back rooftop with
// a pool, a corner tower. Weimar modernism. 3×3.
function sohoHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const BR = hex('#a85a44'); // warm brick
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the big block, six storeys
  iso.box(u0, v0, u1, v1, 0, 70, BR);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(BR, 0.14), { ink: false });
  // strong horizontal window bands (the Neues-Bauen ribbon windows)
  for (const z of [16, 28, 40, 52, 62] as const) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 2.4 * RES, alpha(COLORS.glassDark, 0.85));
    iso.r.line(iso.P(u0, v1, z - 2.2), iso.P(u1, v1, z - 2.2), 0.7 * RES, lit(BR, 0.08));
    iso.r.line(iso.P(u1, v0, z), iso.P(u1, v1, z), 2.4 * RES, alpha(COLORS.glassDark, 0.8));
  }
  // a rounded corner emphasis (a chamfered corner pier)
  iso.box(u1 - 0.16, v1 - 0.16, u1, v1, 0, 78, lit(BR, 0.03));
  // the stepped-back rooftop storey + the famous rooftop pool
  iso.box(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, 70, 80, lighten(BR, 0.04), { topC: top(BR, 0.18) });
  iso.box(u0 + 0.5, v0 + 0.5, u0 + 1.4, v0 + 1.2, 80, 83, alpha(COLORS.glassSky, 0.7), { ink: false });
  iso.glint(iso.P(u0 + 0.95, v0 + 0.85, 83), 2.0 * RES);
  return iso.build();
}

// --- PALMKERNÖLSPEICHER — a tall historic Spree-side brick WAREHOUSE (palm-
// kernel-oil store): a gaunt multi-storey red-brick block with regular loading
// bays, a roof hoist gable, on the waterfront. Industrial heritage. 3×3.
function speicherTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.55, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // a strip of Spree water along the front
  iso.box(0.1, v1 - 0.2, 2.9, 2.95, 0, 1, shaded(COLORS.water, 0.04), { ink: false });
  // the tall gaunt brick block
  iso.box(u0, v0, u1, v1 - 0.25, 0, 78, BRICK);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 - 0.22, 0, 10, shaded(BRICK, 0.16), { ink: false });
  // regular loading-bay windows in tight columns over six floors
  for (const [zb, zt] of [[14, 22], [26, 34], [38, 46], [50, 58], [62, 72]] as const) {
    iso.windowsLeft(v1 - 0.25, u0 + 0.1, u1 - 0.1, zb, zt, 8, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.35, zb, zt, 7, alpha(COLORS.glassDark, 0.85), lit(BRICK, 0.06));
  }
  // brick pilaster strips between the bays
  for (let i = 0; i <= 4; i++) { const uu = u0 + 0.06 + ((u1 - u0 - 0.12) * i) / 4; iso.r.line(iso.P(uu, v1 - 0.25, 4), iso.P(uu, v1 - 0.25, 74), 0.7 * RES, lit(BRICK, 0.08)); }
  // a steep slate roof with the central hoist gable (Zwerchgiebel) over the doors
  iso.gable(u0, v0, u1, v1 - 0.25, 78, 14, 'u', SLATE, BRICK);
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.24, v1 - 0.27, cx + 0.24, v1 - 0.25, 78, 96, lit(BRICK, 0.02));
  iso.gable(cx - 0.24, v1 - 0.45, cx + 0.24, v1 - 0.25, 96, 10, 'u', SLATE, BRICK);
  // the projecting hoist beam + pulley
  const hb = iso.P(cx, v1 - 0.25, 92);
  iso.r.line(hb, [hb[0], hb[1] + 8 * RES], 1.2 * RES, hex('#5a4a38'));
  return iso.build();
}

// --- EIERHÄUSCHEN — the historic Spree excursion restaurant in Plänterwald: a
// romantic late-19c stuccoed villa with a steep many-gabled roof, a little
// belvedere turret with a bell-curved cap, a verandah, on the riverbank. 2×2.
function eierhaeuschenTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const REND = hex('#e2d3b8'); // warm stucco
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // riverbank + water
  iso.box(0.05, 1.2, 1.95, 1.95, 0, 1, shaded(COLORS.water, 0.04), { ink: false });
  iso.box(0.3, 0.4, 1.7, 1.3, 0, 3, shaded(COLORS.grass, 0.1), { ink: false });
  // the villa body, two storeys
  iso.box(u0, v0, u1, v1 - 0.1, 0, 40, REND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 - 0.08, 0, 8, shaded(REND, 0.12), { ink: false });
  iso.windowsLeft(v1 - 0.1, u0 + 0.1, u1 - 0.1, 10, 20, 5, alpha(COLORS.glassDark, 0.85), COLORS.white);
  iso.windowsLeft(v1 - 0.1, u0 + 0.1, u1 - 0.1, 24, 34, 5, alpha(COLORS.glassHot, 0.6), COLORS.white);
  // a verandah on the river side (a low canopy on posts)
  iso.box(u0 + 0.06, v1 - 0.12, u1 - 0.06, v1, 0, 14, alpha(COLORS.glassLit, 0.4), { ink: false });
  for (const uu of [u0 + 0.1, (u0 + u1) / 2, u1 - 0.1] as const) iso.r.line(iso.P(uu, v1, 0), iso.P(uu, v1, 14), 0.8 * RES, hex('#7a5a3c'));
  // a steep many-gabled roof
  iso.gable(u0, v0, u1, v1 - 0.1, 40, 18, 'u', hex('#7a4030'), REND);
  // a little cross-gable dormer on the front slope
  const cx = (u0 + u1) / 2;
  iso.r.poly([iso.P(cx - 0.16, v1 - 0.1, 40), iso.P(cx, v1 - 0.1, 54), iso.P(cx + 0.16, v1 - 0.1, 40)], lit(REND, 0.06));
  // ---- the belvedere turret with a bell-curved cap ----
  const tu = u1 - 0.2, tv = v0 + 0.2;
  iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 40, 60, lighten(REND, 0.03));
  const { tipX, tipY } = domeAt(iso, tu, tv, 60, 0.12 * (CELL_W / 2), 1.3, ZINC, { bulb: true });
  iso.r.line([tipX, tipY], [tipX, tipY - 6 * RES], 0.9 * RES, GILT);
  return iso.build();
}

// =====================================================================
// BATCH C — more famous/notable Berlin landmarks (ADDED to named[] too) toward
// the 100: hotels, modern complexes, halls/arenas, government, university,
// reconstruction, power-hall, station, and the French cathedral.
// =====================================================================

// --- HOTEL ADLON — the grand luxury hotel by the Brandenburg Gate: a stately
// sandstone-and-render palace block, mansard roof, a central pedimented bay,
// flags, a porte-cochère canopy at the door. 4×4.
function hotelAdlonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.34, u1 = 3.66, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  iso.box(u0, v0, u1, v1, 0, 64, RENDER);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(RENDER, 0.12), { ink: false });
  // five storeys of regular windows
  for (const [zb, zt] of [[16, 26], [30, 40], [44, 54], [56, 62]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 16, alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, 14, alpha(COLORS.glassDark, 0.85), COLORS.white);
  }
  // cornice + steep zinc mansard with dormers
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 64, 69, lighten(RENDER, 0.06), { topC: top(RENDER, 0.26) });
  iso.hip(u0, v0, u1, v1, 69, 16, ZINC);
  for (const cu of [u0 + 0.6, (u0 + u1) / 2, u1 - 0.6] as const) {
    const d = iso.P(cu, v1, 69);
    iso.r.poly([[d[0] - 3 * RES, d[1]], [d[0] + 3 * RES, d[1]], [d[0], d[1] - 6 * RES]], lit(ZINC, 0.06));
  }
  // central pedimented frontispiece + flags
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.34, v1 - 0.14, cx + 0.34, v1, 0, 68, lighten(RENDER, 0.04));
  pediment(iso, v1, cx - 0.36, cx + 0.36, 68, 11, RENDER);
  for (const du of [-0.3, 0.3] as const) { const f = iso.P(cx + du, v1, 80); iso.r.line(f, [f[0], f[1] - 10 * RES], 0.9 * RES, GILT); iso.r.line([f[0], f[1] - 10 * RES], [f[0] + 5 * RES, f[1] - 8 * RES], 0.8 * RES, alpha(hex('#c94436'), 0.9)); }
  // the porte-cochère canopy at the door
  iso.box(cx - 0.3, v1 - 0.02, cx + 0.3, v1 + 0.2, 14, 18, GILT, { topC: lit(GILT, 0.1) });
  return iso.build();
}

// --- EUROPA-CENTER — the 1965 West-Berlin landmark: a slim tall white office
// SLAB on a low retail podium, crowned by the giant rotating Mercedes star.
// Mid-century modern tower. 5×5 (slim tower in a broad podium block).
function europaCenterTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 180 });
  void seed;
  const WHT = hex('#dfe1e3');
  const u0 = 0.3, u1 = 4.7, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the broad low retail podium
  iso.box(u0, v0, u1, v1, 0, 24, hex('#cfcabd'));
  iso.box(u0 + 0.06, v1 - 0.06, u1 - 0.06, v1, 0, 16, alpha(COLORS.glassLit, 0.55), { ink: false });
  // ---- the slim tall white office slab rising off the podium ----
  const tu0 = 1.4, tu1 = 3.0, tv0 = 1.5, tv1 = 2.3; // a slab, narrow in v
  iso.box(tu0, tv0, tu1, tv1, 24, 150, WHT, { leftC: shaded(WHT, 0.12), rightC: lit(WHT, 0.05) });
  // dense curtain-wall window grid
  for (const [zb, zt] of [[30, 142]] as const) {
    iso.windowsLeft(tv1, tu0 + 0.06, tu1 - 0.06, zb, zt, 12, alpha(COLORS.glassDark, 0.8), undefined);
    iso.windowsRight(tu1, tv0 + 0.06, tv1 - 0.06, zb, zt, 7, alpha(COLORS.glassDark, 0.75), undefined);
  }
  // horizontal floor lines
  for (let z = 36; z < 146; z += 10) iso.r.line(iso.P(tu0, tv1, z), iso.P(tu1, tv1, z), 0.4 * RES, alpha(shaded(WHT, 0.16), 0.6));
  iso.box(tu0 - 0.02, tv0 - 0.02, tu1 + 0.02, tv1 + 0.02, 150, 155, lighten(WHT, 0.06), { topC: top(WHT, 0.2) });
  // ---- the rotating Mercedes star on the roof ----
  const [mx, my] = iso.P((tu0 + tu1) / 2, (tv0 + tv1) / 2, 155);
  const SR = 7 * RES;
  const ring: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push([mx + Math.cos(a) * SR, my - 8 * RES + Math.sin(a) * SR]); }
  iso.r.polyline(ring, 1.0 * RES, alpha(COLORS.steel, 0.9), true);
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k / 3) * Math.PI * 2; iso.r.line([mx, my - 8 * RES], [mx + Math.cos(a) * SR, my - 8 * RES + Math.sin(a) * SR], 1.3 * RES, alpha(COLORS.white, 0.95)); }
  iso.glint([mx, my - 8 * RES], 2.0 * RES);
  return iso.build();
}

// --- BIKINI BERLIN — the listed 1950s "Zentrum am Zoo": a long low concept
// mall with a glazed colonnaded ground floor, a continuous ribbon-window upper
// block, a flat roof terrace overlooking the zoo. West-Berlin 50s. 4×4.
function bikiniBerlinTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 70 });
  void seed;
  const STN = hex('#d6cdba');
  const u0 = 0.3, u1 = 3.7, v0 = 0.6, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // a glazed colonnaded ground floor (the building floats on pilotis/glass)
  iso.box(u0 + 0.1, v0 + 0.4, u1 - 0.1, v1, 0, 16, alpha(COLORS.glassLit, 0.5), { ink: false });
  for (let i = 0; i <= 12; i++) { const uu = u0 + 0.16 + ((u1 - u0 - 0.32) * i) / 12; iso.r.line(iso.P(uu, v1, 0), iso.P(uu, v1, 16), 0.9 * RES, COLORS.steelDark); }
  // the long upper block with continuous ribbon windows
  iso.box(u0, v0 + 0.3, u1, v1 - 0.05, 16, 46, STN);
  for (const z of [22, 32, 42] as const) {
    iso.r.line(iso.P(u0, v1 - 0.05, z), iso.P(u1, v1 - 0.05, z), 2.0 * RES, alpha(COLORS.glassDark, 0.82));
    iso.r.line(iso.P(u0, v1 - 0.05, z - 1.8), iso.P(u1, v1 - 0.05, z - 1.8), 0.6 * RES, lit(STN, 0.06));
  }
  iso.windowsRight(u1, v0 + 0.34, v1 - 0.1, 20, 44, 9, alpha(COLORS.glassDark, 0.8), lighten(STN, 0.06));
  // flat roof terrace + a couple of pavilions
  iso.box(u0 - 0.02, v0 + 0.28, u1 + 0.02, v1 - 0.03, 46, 49, lighten(STN, 0.06), { topC: top(STN, 0.24) });
  iso.box(u0 + 0.4, v0 + 0.5, u0 + 1.0, v0 + 1.1, 49, 56, alpha(COLORS.glassSky, 0.6), { ink: false });
  return iso.build();
}

// --- BUNDESKANZLERAMT — the Federal Chancellery, the "washing machine": a vast
// pale concrete block with a tall central cube pierced by a great round window
// and deep loggias, flanked by long office wings, by the Spree. Bombastic 90s
// civic modernism. 5×5, monster.
function chancelleryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 130 });
  void seed;
  const BETON = hex('#dad5c8');
  const u0 = 0.3, u1 = 4.7, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the long flanking office wings (lower)
  iso.box(u0, v0 + 0.4, u0 + 1.0, v1 - 0.4, 0, 52, BETON);
  iso.box(u1 - 1.0, v0 + 0.4, u1, v1 - 0.4, 0, 52, BETON);
  iso.windowsLeft(v1 - 0.4, u0 + 0.1, u0 + 0.9, 12, 46, 10, alpha(COLORS.glassDark, 0.82), lighten(BETON, 0.06));
  iso.windowsRight(u1, v0 + 0.5, v1 - 0.5, 12, 46, 11, alpha(COLORS.glassDark, 0.82), lighten(BETON, 0.06));
  iso.box(u0 - 0.02, v0 + 0.38, u0 + 1.02, v1 - 0.38, 52, 56, lighten(BETON, 0.06), { topC: top(BETON, 0.22) });
  iso.box(u1 - 1.02, v0 + 0.38, u1 + 0.02, v1 - 0.38, 52, 56, lighten(BETON, 0.06), { topC: top(BETON, 0.22) });
  // ---- the tall central cube ----
  const cu0 = 1.5, cu1 = 3.5, cv0 = 1.2, cv1 = 3.2;
  iso.box(cu0, cv0, cu1, cv1, 0, 96, lit(BETON, 0.02));
  // deep loggia columns on the front (cv1) face
  for (let i = 0; i <= 5; i++) { const uu = cu0 + 0.1 + ((cu1 - cu0 - 0.2) * i) / 5; iso.box(uu - 0.04, cv1 - 0.06, uu + 0.04, cv1, 0, 92, lighten(BETON, 0.05)); }
  // the great round window high in the cube (the "washing-machine porthole")
  const [rx, ry] = iso.P((cu0 + cu1) / 2, cv1, 72);
  const RR = 8 * RES; const ring: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; ring.push([rx + Math.cos(a) * RR, ry + Math.sin(a) * RR * 0.92]); }
  iso.r.poly(ring, alpha(COLORS.glassSky, 0.6), alpha(COLORS.glassLit, 0.35));
  iso.r.polyline(ring, INK_W * 0.7, INK, true);
  iso.r.line([rx - RR, ry], [rx + RR, ry], 0.6 * RES, alpha(COLORS.white, 0.5));
  iso.r.line([rx, ry - RR * 0.9], [rx, ry + RR * 0.9], 0.6 * RES, alpha(COLORS.white, 0.5));
  iso.box(cu0 - 0.03, cv0 - 0.03, cu1 + 0.03, cv1 + 0.03, 96, 102, lighten(BETON, 0.06), { topC: top(BETON, 0.2) });
  // a couple of curved screen-walls (the famous concave flanks) as low arcs
  iso.glint(iso.P((cu0 + cu1) / 2, cv1, 86), 2.2 * RES);
  return iso.build();
}

// --- HAUS DER KULTUREN DER WELT — the "pregnant oyster": the 1957 congress
// hall with its dramatic doubly-curved hyperbolic-paraboloid white ROOF arching
// over a glazed hall on a podium, with a reflecting pool. Unique sweep. 4×4.
function hkwTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const WHT = hex('#e6e3da');
  const u0 = 0.3, u1 = 3.7, v0 = 0.5, v1 = 3.5;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // reflecting pool in front
  iso.box(u0, v1 - 0.5, u1, v1, 0, 2, shaded(COLORS.water, 0.05), { ink: false });
  // the podium
  iso.box(u0 + 0.2, v0 + 0.3, u1 - 0.2, v1 - 0.3, 0, 12, hex('#cfcabd'));
  // the glazed hall under the roof
  iso.box(u0 + 0.5, v0 + 0.6, u1 - 0.5, v1 - 0.6, 12, 34, alpha(COLORS.glassSky, 0.55), {
    leftC: alpha(COLORS.glassDark, 0.6), rightC: alpha(COLORS.glassLit, 0.4),
  });
  for (let i = 1; i < 8; i++) { const uu = u0 + 0.5 + ((u1 - u0 - 1.0) * i) / 8; iso.r.line(iso.P(uu, v1 - 0.6, 14), iso.P(uu, v1 - 0.6, 34), 0.5 * RES, alpha(COLORS.white, 0.5)); }
  // ---- the dramatic sweeping saddle ROOF: two raised arch lips + a dipped
  // centre, drawn as a curved shell from the two high points down to the low
  // sides (a hypar). Build it as triangle fans from the two peaks. ----
  const peakA = iso.P(cx, v0 + 0.5, 70); // back lip raised
  const peakB = iso.P(cx, v1 - 0.5, 70); // front lip raised
  const dip = iso.P(cx, cy, 44); // dipped centre
  const sideL = iso.P(u0 + 0.3, cy, 30);
  const sideR = iso.P(u1 - 0.3, cy, 30);
  // the two sweeping halves
  iso.r.poly([sideL, peakA, dip], lit(WHT, 0.08));
  iso.r.poly([peakA, sideR, dip], top(WHT, 0.2));
  iso.r.poly([sideL, peakB, dip], shaded(WHT, 0.06));
  iso.r.poly([peakB, sideR, dip], lit(WHT, 0.04));
  // the bold ink edges of the shell
  iso.r.polyline([sideL, peakA, sideR], INK_W, INK);
  iso.r.polyline([sideL, peakB, sideR], INK_W, INK);
  iso.r.polyline([peakA, dip, peakB], INK_W * 0.7, alpha(INK, 0.7));
  iso.gleam([sideR[0] - 4 * RES, sideR[1] - 2 * RES], [peakA[0] + 2 * RES, peakA[1] + 2 * RES], 1.3 * RES);
  return iso.build();
}

// --- ROUND HALL (multi-purpose) — a big round/oval arena with a low dished
// tensile ROOF on a ring of masts and a glazed concourse drum. Serves Velodrom
// + Tempodrom (tented variant) + Uber Arena (boxier variant via `style`). 4×4.
function roundHallTile(seed: number, style: 'velo' | 'tent' | 'arena'): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: style === 'tent' ? 110 : 80 });
  void seed;
  const SKIN = style === 'arena' ? hex('#9aa3ab') : hex('#d8d2c4');
  const cu = 2.0, cv = 2.0;
  const [cx, cyB] = iso.P(cu, cv, 0);
  iso.shadow(0.3, 0.5, 3.7, 3.5, 0.24, 0.2);
  const RX = 0.48 * 4 * (CELL_W / 2), RY = RX * 0.5;
  const ring = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]); }
    return pts;
  };
  const WALL = 30 * RES;
  // the glazed concourse drum
  iso.r.poly([...ring(RX, RY, 0), ...ring(RX, RY, WALL).reverse()], style === 'arena' ? SKIN : alpha(COLORS.glassSky, 0.5));
  if (style !== 'arena') for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; const x = cx + Math.cos(a) * RX, y = cyB + Math.sin(a) * RY; iso.r.line([x, y], [x, y - WALL], 0.5 * RES, alpha(COLORS.white, 0.4)); }
  iso.r.polyline(ring(RX, RY, WALL), INK_W, INK, true);
  iso.r.polyline(ring(RX, RY, 0), INK_W * 0.7, alpha(INK, 0.5), true);
  if (style === 'tent') {
    // Tempodrom: a faceted white tent of peaks
    const peak = [cx, cyB - WALL - 56 * RES] as const;
    const rimN = 10;
    for (let i = 0; i < rimN; i++) {
      const a0 = (i / rimN) * Math.PI * 2, a1 = ((i + 1) / rimN) * Math.PI * 2;
      const p0: Pt = [cx + Math.cos(a0) * RX * 0.96, cyB - WALL + Math.sin(a0) * RY * 0.96];
      const p1: Pt = [cx + Math.cos(a1) * RX * 0.96, cyB - WALL + Math.sin(a1) * RY * 0.96];
      iso.r.poly([p0, p1, [peak[0], peak[1]]], i % 2 ? shaded(SKIN, 0.06) : top(SKIN, 0.16));
      iso.r.line(p0, [peak[0], peak[1]], INK_W * 0.5, alpha(INK, 0.6));
    }
  } else {
    // a low dished tensile roof on a ring of masts (velodrome/arena)
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const x = cx + Math.cos(a) * RX * 1.0, y = cyB + Math.sin(a) * RY * 1.0; iso.r.line([x, y - WALL], [x, y - WALL - 16 * RES], 0.7 * RES, COLORS.steelDark); }
    iso.r.poly(ring(RX * 0.98, RY * 0.98, WALL + 16 * RES), style === 'arena' ? lit(SKIN, 0.06) : alpha(COLORS.glassSky, 0.4));
    iso.r.poly(ring(RX * 0.5, RY * 0.5, WALL + 10 * RES), shaded(SKIN, 0.1)); // the dish dips to centre
    iso.r.polyline(ring(RX * 0.98, RY * 0.98, WALL + 16 * RES), INK_W * 0.7, alpha(INK, 0.5), true);
  }
  iso.glint([cx + RX * 0.2, cyB - RY * 0.5 - WALL], 2.0 * RES);
  return iso.build();
}

// --- KARL-MARX-ALLEE TOWERS — the great Stalinist boulevard's twin domed
// gate-towers at Frankfurter Tor: a pair of tall tiled "wedding-cake" towers
// with copper-green cupola drums + lanterns flanking the avenue. Socialist
// classicism. 4×4 (two towers + a low linking block).
function karlMarxAlleeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 180 });
  void seed;
  const TILE = hex('#cdbf9e'); // pale Meissen tile
  const u0 = 0.3, u1 = 3.7, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // low linking ranges along the boulevard
  iso.box(u0, v1 - 0.9, u1, v1, 0, 50, TILE);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 12, 44, 18, alpha(COLORS.glassDark, 0.85), lighten(TILE, 0.06));
  iso.box(u0 - 0.02, v1 - 0.92, u1 + 0.02, v1 + 0.02, 50, 54, lighten(TILE, 0.06), { topC: top(TILE, 0.24) });
  // ---- the twin towers ----
  for (const tu of [u0 + 0.8, u1 - 0.8] as const) {
    const tv = v1 - 0.5;
    iso.box(tu - 0.4, tv - 0.4, tu + 0.4, tv + 0.4, 0, 96, TILE);
    for (const z of [40, 70] as const) iso.r.line(iso.P(tu - 0.4, tv + 0.4, z), iso.P(tu + 0.4, tv + 0.4, z), 1.2 * RES, lit(TILE, 0.08));
    iso.windowsLeft(tv + 0.4, tu - 0.32, tu + 0.32, 16, 90, 4, alpha(COLORS.glassDark, 0.85), lighten(TILE, 0.06));
    // a set-back drum + copper cupola + lantern
    iso.box(tu - 0.28, tv - 0.28, tu + 0.28, tv + 0.28, 96, 116, lighten(TILE, 0.04));
    colonnadeL(iso, tv + 0.28, tu - 0.24, tu + 0.24, 96, 114, 5, COLORS.white);
    const { tipX, tipY } = domeAt(iso, tu, tv, 116, 0.28 * (CELL_W / 2), 1.2, COPPER, { ribs: 6, bulb: true });
    lantern(iso, tipX, tipY, 9, COPPER_D, GILT_HOT);
    iso.r.line([tipX, tipY - 9 * RES], [tipX, tipY - 18 * RES], 1.1 * RES, GILT_HOT);
  }
  return iso.build();
}

// --- GEMÄLDEGALERIE — the Kulturforum picture gallery (Hilmer & Sattler): a
// long, austere, almost windowless pale-stone block on a podium with a deep
// recessed colonnaded entrance loggia and a flat roof of glazed light-monitors.
// Calm 90s museum. 4×4.
function gemaeldegalerieTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 70 });
  void seed;
  const STN = hex('#d3ccbb');
  const u0 = 0.3, u1 = 3.7, v0 = 0.5, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  iso.box(u0, v0, u1, v1, 0, 46, STN);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 10, shaded(STN, 0.12), { ink: false });
  // a deep recessed entrance loggia in the front (a shadowed slot + columns)
  iso.box(u0 + 0.8, v1 - 0.18, u1 - 0.8, v1, 0, 40, shaded(STN, 0.16), { ink: false });
  colonnadeL(iso, v1, u0 + 0.9, u1 - 0.9, 6, 40, 7, COLORS.white);
  // a very sparse band of high windows (the gallery is mostly solid)
  iso.windowsRight(u1, v0 + 0.2, v1 - 0.2, 30, 40, 8, alpha(COLORS.glassDark, 0.8), lighten(STN, 0.06));
  // flat roof of glazed light-monitors (north-light sheds)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 46, 50, lighten(STN, 0.06), { topC: top(STN, 0.24) });
  for (let j = 0; j < 4; j++) {
    const vv = v0 + 0.4 + j * 0.7;
    iso.r.poly([iso.P(u0 + 0.3, vv, 50), iso.P(u1 - 0.3, vv, 50), iso.P(u1 - 0.3, vv + 0.18, 56), iso.P(u0 + 0.3, vv + 0.18, 56)], alpha(COLORS.glassSky, 0.5));
    iso.r.line(iso.P(u0 + 0.3, vv + 0.18, 56), iso.P(u1 - 0.3, vv + 0.18, 56), 0.6 * RES, alpha(COLORS.white, 0.6));
  }
  return iso.build();
}

// --- BAHNHOF FRIEDRICHSTRASSE — the famous through-station + Cold-War crossing:
// a long glazed steel BARREL-VAULT shed over the elevated tracks on a brick-
// arched viaduct, with glazed end screens. A historic glass shed. 4×4 (long).
function friedrichstrasseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.3, u1 = 3.7, v0 = 0.8, v1 = 3.2;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the brick viaduct base
  iso.box(u0, v0, u1, v1, 0, 26, BRICK);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 8, shaded(BRICK, 0.16), { ink: false });
  // arched openings along the viaduct
  for (let i = 0; i < 8; i++) {
    const u = u0 + 0.18 + i * 0.42;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 16)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.28 * t, v1, 16 + Math.sin(t * Math.PI) * 6)); }
    poly.push(iso.P(u + 0.28, v1, 16), iso.P(u + 0.28, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.8), lit(BRICK, 0.05));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 26, 30, lighten(BRICK, 0.06), { topC: top(BRICK, 0.2) });
  // the long glazed barrel-vault shed
  barrelVault(iso, u0 + 0.06, u1 - 0.06, v0 + 0.06, v1 - 0.06, 30, 72, COLORS.glassSky);
  // glazed end screens
  for (const vv of [v0 + 0.06, v1 - 0.06] as const) {
    const um = (u0 + u1) / 2;
    const poly: Pt[] = [iso.P(u0 + 0.06, vv, 30), iso.P(um, vv, 72), iso.P(u1 - 0.06, vv, 30)];
    iso.r.poly(poly, alpha(COLORS.glassLit, 0.42));
    iso.r.polyline(poly, INK_W * 0.7, INK);
  }
  return iso.build();
}

// --- HUMBOLDT-UNIVERSITÄT — the main building on Unter den Linden (former
// Palais of Prince Heinrich): a long late-baroque palace with a central
// pedimented corps-de-logis, two forward wings round a cour d'honneur, a
// balustraded roof. Grand academic. 4×4.
function humboldtUniTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.34, u1 = 3.66, v0 = 0.6, v1 = 3.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // main range + two forward wings (cour d'honneur open to viewer)
  iso.box(u0, v0, u1, v0 + 0.9, 0, 52, SAND);
  iso.box(u0, v0 + 0.9, u0 + 0.7, v1, 0, 48, SAND);
  iso.box(u1 - 0.7, v0 + 0.9, u1, v1, 0, 48, SAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 12, shaded(SAND, 0.14), { ink: false });
  // the courtyard
  iso.box(u0 + 0.7, v0 + 0.9, u1 - 0.7, v1, 0, 3, shaded(COLORS.pavement, 0.06), { ink: false });
  // windows on the main range + wing inner faces
  iso.windowsLeft(v0 + 0.9, u0 + 0.1, u1 - 0.1, 14, 26, 16, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsLeft(v0 + 0.9, u0 + 0.1, u1 - 0.1, 30, 44, 16, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  iso.windowsRight(u0 + 0.7, v0 + 0.94, v1 - 0.04, 14, 44, 4, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  // balustraded roof
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v0 + 0.92, 52, 57, lighten(SAND, 0.06), { topC: top(SAND, 0.26) });
  iso.hip(u0, v0 + 0.9, u0 + 0.72, v1, 48, 10, ZINC);
  iso.hip(u1 - 0.72, v0 + 0.9, u1, v1, 48, 10, ZINC);
  // central pedimented frontispiece
  const cx = (u0 + u1) / 2;
  iso.box(cx - 0.4, v0 + 0.8, cx + 0.4, v0 + 0.92, 0, 58, lighten(SAND, 0.04));
  colonnadeL(iso, v0 + 0.92, cx - 0.34, cx + 0.34, 14, 54, 6, COLORS.white);
  pediment(iso, v0 + 0.92, cx - 0.38, cx + 0.38, 58, 12, SAND);
  return iso.build();
}

// --- HUMBOLDT FORUM (Berliner Schloss reconstruction) — the rebuilt royal
// palace: a colossal baroque quadrangle of sandstone wings round a court, three
// reconstructed facades of giant-order pilasters + a great domed gate-CUPOLA
// with a lantern + cross over the western portal. Monster. 5×5.
function humboldtForumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.3, u1 = 4.7, v0 = 0.5, v1 = 4.5;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.2);
  // the great quadrangle of wings round an inner court
  const H = 78;
  iso.box(u0, v0, u1, v0 + 1.1, 0, H, SAND); // back
  iso.box(u0, v1 - 1.1, u1, v1, 0, H, SAND); // front
  iso.box(u0, v0, u0 + 1.1, v1, 0, H, SAND); // left
  iso.box(u1 - 1.1, v0, u1, v1, 0, H, SAND); // right
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 14, shaded(SAND, 0.14), { ink: false });
  iso.box(u0 + 1.1, v0 + 1.1, u1 - 1.1, v1 - 1.1, 0, 4, shaded(COLORS.pavement, 0.06), { ink: false });
  // giant-order pilasters + two window tiers on the front + right faces
  for (const [zb, zt] of [[18, 38], [44, 64]] as const) {
    iso.windowsLeft(v1, u0 + 0.14, u1 - 0.14, zb, zt, 22, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
    iso.windowsRight(u1, v0 + 0.14, v1 - 0.14, zb, zt, 22, alpha(COLORS.glassDark, 0.85), lighten(SAND, 0.08));
  }
  for (let i = 0; i <= 12; i++) { const uu = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / 12; iso.r.line(iso.P(uu, v1, 14), iso.P(uu, v1, 70), 0.6 * RES, alpha(lighten(SAND, 0.1), 0.6)); }
  // balustraded roofline + corner sculptures
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v0 + 1.12, H, H + 6, lighten(SAND, 0.08), { topC: top(SAND, 0.28) });
  iso.box(u0 - 0.02, v1 - 1.12, u1 + 0.02, v1 + 0.02, H, H + 6, lighten(SAND, 0.08), { topC: top(SAND, 0.28) });
  // ---- the great western gate-cupola over the front-centre portal ----
  const cx = (u0 + u1) / 2, cy = v1 - 0.55;
  iso.box(cx - 0.5, cy - 0.4, cx + 0.5, cy + 0.4, H, H + 26, lighten(SAND, 0.04));
  colonnadeL(iso, cy + 0.4, cx - 0.44, cx + 0.44, H + 4, H + 24, 7, COLORS.white);
  const { tipX, tipY } = domeAt(iso, cx, cy, H + 26, 0.5 * (CELL_W / 2), 1.2, COPPER, { ribs: 8, bulb: true });
  lantern(iso, tipX, tipY, 11, COPPER_D, GILT_HOT);
  iso.r.line([tipX, tipY - 11 * RES], [tipX, tipY - 22 * RES], 1.2 * RES, GILT_HOT);
  iso.r.line([tipX - 3 * RES, tipY - 18 * RES], [tipX + 3 * RES, tipY - 18 * RES], 1 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 6 * RES], 2.6 * RES);
  return iso.build();
}

// --- KRAFTWERK BERLIN — the monumental former GDR power station (now techno
// cathedral): a towering raw-concrete + brick turbine HALL with a tall slab
// massing, big industrial mullioned windows, and a chimney. Brutalist heat. 3×3.
function kraftwerkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 140 });
  void seed;
  const BETON = hex('#b4ada0');
  const u0 = 0.3, u1 = 2.7, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.2);
  // the tall turbine hall (a big slab)
  iso.box(u0, v0 + 0.3, u1, v1, 0, 100, BETON);
  iso.box(u0 - 0.03, v0 + 0.27, u1 + 0.03, v1 + 0.03, 0, 12, shaded(BETON, 0.14), { ink: false });
  // tall industrial mullioned window walls
  iso.box(u0 + 0.1, v1 - 0.05, u1 - 0.1, v1, 16, 88, alpha(COLORS.glassDark, 0.7), { ink: false });
  for (let i = 1; i < 9; i++) { const uu = u0 + 0.1 + ((u1 - u0 - 0.2) * i) / 9; iso.r.line(iso.P(uu, v1, 16), iso.P(uu, v1, 88), 0.6 * RES, alpha(STEEL, 0.6)); }
  for (let z = 28; z < 86; z += 14) iso.r.line(iso.P(u0 + 0.1, v1, z), iso.P(u1 - 0.1, v1, z), 0.5 * RES, alpha(STEEL, 0.5));
  iso.windowsRight(u1, v0 + 0.36, v1 - 0.1, 16, 88, 8, alpha(COLORS.glassDark, 0.7), shaded(BETON, 0.08));
  // a heavy concrete parapet
  iso.box(u0 - 0.02, v0 + 0.28, u1 + 0.02, v1 + 0.02, 100, 106, lighten(BETON, 0.04), { topC: top(BETON, 0.18) });
  // a lower boiler-house annex at the back
  iso.box(u0 + 0.2, v0, u1 - 0.2, v0 + 0.4, 0, 56, shaded(BETON, 0.04));
  // the tall round brick chimney
  chimney(iso, u1 - 0.4, v0 + 0.18, 132, 0.1);
  return iso.build();
}

// --- PARK INN ALEXANDERPLATz — the great GDR-era slab HOTEL tower on
// Alexanderplatz (~125 m): a tall, slim, flat curtain-walled white slab on a
// low podium — the boxy counterpoint to the Fernsehturm. 3×3 (slim slab).
function parkInnTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 200 });
  void seed;
  const WHT = hex('#dadcde');
  const u0 = 0.6, u1 = 2.4, v0 = 0.7, v1 = 2.3;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a low podium
  iso.box(u0 - 0.3, v0 - 0.2, u1 + 0.3, v1 + 0.2, 0, 16, hex('#cfcabd'));
  // the tall slim slab (narrow in v)
  const tu0 = u0, tu1 = u1, tv0 = 1.2, tv1 = 1.8;
  iso.box(tu0, tv0, tu1, tv1, 16, 168, WHT, { leftC: shaded(WHT, 0.12), rightC: lit(WHT, 0.05) });
  // dense curtain-wall grid on the broad (v1) face
  iso.windowsLeft(tv1, tu0 + 0.05, tu1 - 0.05, 22, 162, 16, alpha(COLORS.glassDark, 0.78), undefined);
  for (let z = 28; z < 164; z += 8) iso.r.line(iso.P(tu0, tv1, z), iso.P(tu1, tv1, z), 0.4 * RES, alpha(shaded(WHT, 0.16), 0.55));
  iso.windowsRight(tu1, tv0 + 0.05, tv1 - 0.05, 22, 162, 5, alpha(COLORS.glassDark, 0.72), undefined);
  iso.box(tu0 - 0.02, tv0 - 0.02, tu1 + 0.02, tv1 + 0.02, 168, 173, lighten(WHT, 0.06), { topC: top(WHT, 0.2) });
  // a lit sign band near the top
  iso.r.line(iso.P(tu0 + 0.1, tv1, 158), iso.P(tu1 - 0.1, tv1, 158), 2.0 * RES, alpha(hex('#c94436'), 0.8));
  return iso.build();
}

// --- FRANZÖSISCHER DOM — the French Cathedral on Gendarmenmarkt (twin of the
// Deutscher Dom): a low Huguenot church with a tall domed colonnaded TOWER
// (Carl von Gontard) carrying a viewing gallery + green-copper dome + lantern.
// 2×2 (its own variant — mirrors the German one). Reuses the dom tower idiom.
function franzoesischerDomTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 175 });
  void seed;
  const u0 = 0.42, u1 = 1.58, v0 = 0.5, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // low church body + portico
  iso.box(u0, v0, u1, v1 - 0.2, 0, 36, RENDER);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 - 0.18, 0, 8, shaded(RENDER, 0.12), { ink: false });
  iso.box(u0 + 0.16, v1 - 0.2, u1 - 0.16, v1, 0, 30, lighten(RENDER, 0.03));
  colonnadeL(iso, v1, u0 + 0.22, u1 - 0.22, 8, 28, 5, COLORS.white);
  pediment(iso, v1, u0 + 0.2, u1 - 0.2, 30, 9, RENDER);
  // ---- the tall domed tower behind, with TWO colonnaded gallery stages ----
  const cx = (u0 + u1) / 2, cy = v0 + 0.42;
  iso.box(cx - 0.26, cy - 0.26, cx + 0.26, cy + 0.26, 36, 92, RENDER);
  iso.windowsRight(cx + 0.26, cy - 0.2, cy + 0.2, 52, 84, 2, alpha(COLORS.glassDark, 0.85), lighten(RENDER, 0.1));
  // first gallery (columned ring)
  iso.box(cx - 0.24, cy - 0.24, cx + 0.24, cy + 0.24, 92, 100, lighten(RENDER, 0.04));
  colonnadeL(iso, cy + 0.24, cx - 0.2, cx + 0.2, 92, 100, 5, COLORS.white);
  // second, smaller gallery drum
  iso.box(cx - 0.18, cy - 0.18, cx + 0.18, cy + 0.18, 100, 110, lighten(RENDER, 0.03));
  colonnadeL(iso, cy + 0.18, cx - 0.15, cx + 0.15, 100, 110, 4, COLORS.white);
  // green-copper dome + gilt lantern
  const { tipX, tipY } = domeAt(iso, cx, cy, 110, 0.2 * (CELL_W / 2), 1.3, COPPER, { ribs: 6, bulb: true });
  lantern(iso, tipX, tipY, 9, COPPER_D, GILT_HOT);
  iso.r.line([tipX, tipY - 9 * RES], [tipX, tipY - 17 * RES], 1.0 * RES, GILT_HOT);
  iso.glint([tipX, tipY - 5 * RES], 2.0 * RES);
  return iso.build();
}

export const CITY_HEROES: BespokeHero[] = [
  // ---- WORLD-FAMOUS ICONS (Round 3 bespoke draws) ----
  {
    city: 'berlin',
    key: 'fernsehturm',
    match: /Fernsehturm|Berliner Fernsehturm|TV[- ]?Tower/i,
    foot: [2, 2],
    seed: 1969,
    draw: (seed) => fernsehturmTile(seed),
    light: { kind: 'aerialBeacon', topZ: 400, halfW: 0.46 },
  },
  {
    city: 'berlin',
    key: 'tempelhof',
    match: /Tempelhof|Flughafen Tempelhof/i,
    foot: [5, 5],
    seed: 1936,
    draw: (seed) => tempelhofTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 2.2 },
  },
  {
    city: 'berlin',
    key: 'olympiastadion',
    match: /Olympiastadion|Olympic Stadium/i,
    foot: [5, 5],
    seed: 1936,
    draw: (seed) => olympiastadionTile(seed),
    light: { kind: 'stadiumFlood', topZ: 56, halfW: 2.0 },
  },
  {
    city: 'berlin',
    key: 'east-side-gallery',
    match: /East Side Gallery/i,
    foot: [3, 3],
    seed: 1990,
    draw: (seed) => eastSideGalleryTile(seed),
    light: { kind: 'genericGlow', topZ: 40, halfW: 1.5 },
  },
  {
    city: 'berlin',
    key: 'kadewe',
    match: /KaDeWe|Kaufhaus des Westens/i,
    foot: [4, 4],
    seed: 1907,
    draw: (seed) => kadeweTile(seed),
    light: { kind: 'facadeFlood', topZ: 112, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'hauptbahnhof',
    match: /Hauptbahnhof|Berlin Central Station|Berlin Hauptbahnhof/i,
    foot: [5, 5],
    seed: 2006,
    draw: (seed) => hauptbahnhofTile(seed),
    light: { kind: 'genericGlow', topZ: 117, halfW: 2.0 },
  },
  {
    city: 'berlin',
    key: 'hackesche-hoefe',
    match: /Hackesche H[öo]fe/i,
    foot: [3, 3],
    seed: 1906,
    draw: (seed) => hackescheHoefeTile(seed),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.4 },
  },

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

  // =====================================================================
  // ROUND 2 — memorials, stations, modernist civic, a wider church family,
  // industrial & market halls. Specific matches precede family matchers so a
  // named hero always wins its own sprite. Each `match` hits a PLACED name.
  // =====================================================================

  // ---- MONUMENTS & MEMORIALS ----
  {
    city: 'berlin',
    key: 'soviet-memorial-treptow',
    // Treptow is the colossal one; the plain "Sowjetisches Ehrenmal" placed name
    // (x181,y114 = Treptower Park) resolves here. Tiergarten variant matched first below.
    match: /Sowjetisches Ehrenmal(?!\s*Tiergarten)/i,
    foot: [5, 5],
    seed: 1949,
    draw: (seed) => sovietTreptowTile(seed),
    light: { kind: 'facadeFlood', topZ: 200, halfW: 1.9 },
  },
  {
    city: 'berlin',
    key: 'soviet-memorial-tiergarten',
    match: /Sowjetisches Ehrenmal Tiergarten/i,
    foot: [3, 3],
    seed: 1945,
    draw: (seed) => sovietTiergartenTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'berlin-wall-memorial',
    match: /Gedenkst[äa]tte Berliner Mauer/i,
    foot: [3, 3],
    seed: 1961,
    draw: (seed) => berlinWallMemorialTile(seed),
    light: { kind: 'aerialBeacon', topZ: 82, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'holocaust-memorial',
    match: /Denkmal f[üu]r die ermordeten Juden Europas/i,
    foot: [5, 5],
    seed: 2005,
    draw: (seed) => holocaustMemorialTile(seed),
    light: { kind: 'genericGlow', topZ: 70, halfW: 1.9 },
  },
  {
    city: 'berlin',
    key: 'schwerbelastungskoerper',
    match: /Schwerbelastungsk[öo]rper/i,
    foot: [2, 2],
    seed: 1941,
    draw: (seed) => schwerbelastungTile(seed),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 0.9 },
  },

  // ---- STATIONS & RUINS ----
  {
    city: 'berlin',
    key: 'bahnhof-alexanderplatz',
    match: /Bahnhof Alexanderplatz/i,
    foot: [4, 4],
    seed: 1882,
    draw: (seed) => bahnhofAlexTile(seed),
    light: { kind: 'genericGlow', topZ: 78, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'anhalter-portikus',
    match: /Portikus des zerst[öo]rten Anhalter Bahnhofs/i,
    foot: [2, 2],
    seed: 1880,
    draw: (seed) => anhalterPortikusTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },

  // ---- MODERNIST CIVIC ----
  {
    city: 'berlin',
    key: 'topographie-des-terrors',
    match: /Topographie des Terrors/i,
    foot: [3, 3],
    seed: 2010,
    draw: (seed) => topographieTile(seed),
    light: { kind: 'genericGlow', topZ: 37, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'amerika-gedenkbibliothek',
    match: /Amerika-Gedenkbibliothek/i,
    foot: [3, 3],
    seed: 1954,
    draw: (seed) => amerikaBibliothekTile(seed),
    light: { kind: 'genericGlow', topZ: 64, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'corbusierhaus',
    match: /Corbusierhaus/i,
    foot: [4, 4],
    seed: 1957,
    draw: (seed) => corbusierhausTile(seed),
    light: { kind: 'towerCrown', topZ: 182, halfW: 1.2 },
  },
  {
    city: 'berlin',
    key: 'zoo-palast',
    match: /Zoo Palast/i,
    foot: [3, 3],
    seed: 1957,
    draw: (seed) => zooPalastTile(seed),
    light: { kind: 'genericGlow', topZ: 70, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'traenenpalast',
    match: /Tr[äa]nenpalast/i,
    foot: [3, 3],
    seed: 1962,
    draw: (seed) => traenenpalastTile(seed),
    light: { kind: 'genericGlow', topZ: 51, halfW: 1.4 },
  },

  // ---- CHARLOTTENBURG OUTBUILDINGS & GARDEN PALAIS ----
  {
    city: 'berlin',
    key: 'neue-wache',
    match: /Neue Wache/i,
    foot: [2, 2],
    seed: 1818,
    draw: (seed) => neueWacheTile(seed),
    light: { kind: 'facadeFlood', topZ: 59, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'belvedere-charlottenburg',
    match: /Belvedere/i,
    foot: [2, 2],
    seed: 1788,
    draw: (seed) => belvedereTile(seed),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'mausoleum-charlottenburg',
    match: /Mausoleum Charlottenburg/i,
    foot: [2, 2],
    seed: 1810,
    draw: (seed) => mausoleumCharlottenburgTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'schoeler-schloesschen',
    match: /Schoeler-Schl[öo]sschen/i,
    foot: [2, 2],
    seed: 1751,
    draw: (seed) => gartenpalaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'gutshaus-steglitz',
    match: /Gutshaus Steglitz/i,
    foot: [2, 2],
    seed: 1804,
    draw: (seed) => gartenpalaisTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.0 },
  },

  // ---- INDUSTRIAL / MARKET / UTILITY ----
  {
    city: 'berlin',
    key: 'kulturbrauerei',
    match: /Museum in der Kulturbrauerei|Kulturbrauerei/i,
    foot: [4, 4],
    seed: 1890,
    draw: (seed) => kulturbrauereiTile(seed),
    light: { kind: 'genericGlow', topZ: 116, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'wasserturm-bergstrasse',
    match: /Wasserturm Bergstra[ßs]e|Wasserturm/i,
    foot: [2, 2],
    seed: 1888,
    draw: (seed) => wasserturmTile(seed),
    light: { kind: 'aerialBeacon', topZ: 150, halfW: 0.9 },
  },
  {
    city: 'berlin',
    key: 'arminiusmarkthalle',
    match: /Arminiusmarkthalle/i,
    foot: [3, 3],
    seed: 1891,
    draw: (seed) => marktHalleTile(seed),
    light: { kind: 'genericGlow', topZ: 70, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'markthalle-vii',
    match: /Markthalle VII/i,
    foot: [3, 3],
    seed: 1892,
    draw: (seed) => marktHalleTile(seed),
    light: { kind: 'genericGlow', topZ: 70, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'hubertusbad',
    match: /Hubertusbad/i,
    foot: [3, 3],
    seed: 1928,
    draw: (seed) => historistenblockTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'heeresbaeckerei',
    match: /Heeresb[äa]ckerei/i,
    foot: [3, 3],
    seed: 1890,
    draw: (seed) => historistenblockTile(seed, false),
    light: { kind: 'genericGlow', topZ: 65, halfW: 1.4 },
  },

  // ---- CIVIC ----
  {
    city: 'berlin',
    key: 'bundesrat',
    match: /Bundesrat/i,
    foot: [3, 3],
    seed: 1904,
    draw: (seed) => bundesratTile(seed),
    light: { kind: 'facadeFlood', topZ: 68, halfW: 1.5 },
  },

  // ---- WIDER CHURCH FAMILY (each bespoke draw) ----
  {
    city: 'berlin',
    key: 'sankt-matthaeus-kirche',
    match: /Sankt Matth[äa]us-Kirche|St\.?\s*Matth[äa]us/i,
    foot: [2, 2],
    seed: 1846,
    draw: (seed) => stuelerKircheTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'synagoge-rykestrasse',
    match: /Synagoge Rykestra[ßs]e/i,
    foot: [3, 3],
    seed: 1904,
    draw: (seed) => rykestrasseTile(seed),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'st-joseph-kirche',
    match: /St\.?\s*Joseph/i,
    foot: [2, 2],
    seed: 1909,
    draw: (seed) => twinTowerChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'maria-regina-martyrum',
    match: /Maria Regina Martyrum/i,
    foot: [3, 3],
    seed: 1963,
    draw: (seed) => mariaReginaTile(seed),
    light: { kind: 'genericGlow', topZ: 96, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'koenigin-luise-kirche',
    match: /K[öo]nigin-Luise-Ged[äa]chtniskirche|K[öo]nigin-Luise/i,
    foot: [2, 2],
    seed: 1912,
    draw: (seed) => brickBasilikaTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'rosenkranz-basilika',
    match: /Rosenkranz-Basilika/i,
    foot: [2, 2],
    seed: 1900,
    draw: (seed) => brickBasilikaTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'zum-guten-hirten',
    match: /Zum Guten Hirten/i,
    foot: [2, 2],
    seed: 1893,
    draw: (seed) => brickBasilikaTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'apostel-paulus-kirche',
    match: /Apostel-Paulus-Kirche/i,
    foot: [2, 2],
    seed: 1894,
    draw: (seed) => spireChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'zwoelf-apostel-kirche',
    match: /Zw[öo]lf-Apostel-Kirche/i,
    foot: [2, 2],
    seed: 1874,
    draw: (seed) => spireChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'kirche-zum-vaterhaus',
    match: /Kirche Zum Vaterhaus/i,
    foot: [2, 2],
    seed: 1905,
    draw: (seed) => spireChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 196, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'alte-dorfkirche',
    match: /Alte Dorfkirche/i,
    foot: [2, 2],
    seed: 1250,
    draw: (seed) => feldsteinkircheTile(seed),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },
  {
    city: 'berlin',
    key: 'sankt-annen-kirche',
    match: /Sankt-Annen-Kirche|St\.?\s*Annen/i,
    foot: [2, 2],
    seed: 1390,
    draw: (seed) => feldsteinkircheTile(seed),
    light: { kind: 'facadeFlood', topZ: 76, halfW: 1.0 },
  },

  // =====================================================================
  // ROUND 3 — BATCH B: bespoke heroes for already-PLACED names that lacked one.
  // =====================================================================
  {
    city: 'berlin',
    key: 'bruecke-museum',
    match: /Br[üu]cke-Museum/i,
    foot: [3, 3],
    seed: 1967,
    draw: (seed) => bruckeMuseumTile(seed),
    light: { kind: 'genericGlow', topZ: 34, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'avus-tribuene',
    match: /AVUS-Trib[üu]ne/i,
    foot: [3, 3],
    seed: 1937,
    draw: (seed) => avusTribuneTile(seed),
    light: { kind: 'stadiumFlood', topZ: 45, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'gedenkstaette-hohenschoenhausen',
    match: /Gedenkst[äa]tte Berlin-Hohensch[öo]nhausen/i,
    foot: [4, 4],
    seed: 1951,
    draw: (seed) => stasiPrisonTile(seed),
    light: { kind: 'aerialBeacon', topZ: 42, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'soho-house',
    match: /Soho House/i,
    foot: [3, 3],
    seed: 1928,
    draw: (seed) => sohoHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 80, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'palmkernoelspeicher',
    match: /Palmkern[öo]lspeicher/i,
    foot: [3, 3],
    seed: 1890,
    draw: (seed) => speicherTile(seed),
    light: { kind: 'facadeFlood', topZ: 96, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'eierhaeuschen',
    match: /Eierh[äa]uschen/i,
    foot: [2, 2],
    seed: 1892,
    draw: (seed) => eierhaeuschenTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.0 },
  },

  // =====================================================================
  // ROUND 3 — BATCH C: more famous/notable landmarks (also ADDED to named[]).
  // =====================================================================
  {
    city: 'berlin',
    key: 'hotel-adlon',
    match: /Hotel Adlon|Adlon/i,
    foot: [4, 4],
    seed: 1907,
    draw: (seed) => hotelAdlonTile(seed),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'europa-center',
    match: /Europa-Center/i,
    foot: [5, 5],
    seed: 1965,
    draw: (seed) => europaCenterTile(seed),
    light: { kind: 'towerCrown', topZ: 155, halfW: 0.8 },
  },
  {
    city: 'berlin',
    key: 'bikini-berlin',
    match: /Bikini Berlin/i,
    foot: [4, 4],
    seed: 1957,
    draw: (seed) => bikiniBerlinTile(seed),
    light: { kind: 'genericGlow', topZ: 56, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'bundeskanzleramt',
    match: /Bundeskanzleramt|Federal Chancellery/i,
    foot: [5, 5],
    seed: 2001,
    draw: (seed) => chancelleryTile(seed),
    light: { kind: 'facadeFlood', topZ: 102, halfW: 2.0 },
  },
  {
    city: 'berlin',
    key: 'haus-der-kulturen-der-welt',
    match: /Haus der Kulturen der Welt/i,
    foot: [4, 4],
    seed: 1957,
    draw: (seed) => hkwTile(seed),
    light: { kind: 'archGlow', topZ: 70, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'velodrom',
    match: /Velodrom/i,
    foot: [4, 4],
    seed: 1997,
    draw: (seed) => roundHallTile(seed, 'velo'),
    light: { kind: 'stadiumFlood', topZ: 46, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'tempodrom',
    match: /Tempodrom/i,
    foot: [4, 4],
    seed: 2001,
    draw: (seed) => roundHallTile(seed, 'tent'),
    light: { kind: 'stadiumFlood', topZ: 86, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'uber-arena',
    match: /Uber Arena|Mercedes-Benz Arena|O2 World/i,
    foot: [4, 4],
    seed: 2008,
    draw: (seed) => roundHallTile(seed, 'arena'),
    light: { kind: 'stadiumFlood', topZ: 46, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'karl-marx-allee-towers',
    match: /Karl-Marx-Allee|Frankfurter Tor/i,
    foot: [4, 4],
    seed: 1953,
    draw: (seed) => karlMarxAlleeTile(seed),
    light: { kind: 'facadeFlood', topZ: 134, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'gemaeldegalerie',
    match: /Gem[äa]ldegalerie/i,
    foot: [4, 4],
    seed: 1998,
    draw: (seed) => gemaeldegalerieTile(seed),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'bahnhof-friedrichstrasse',
    match: /Bahnhof Friedrichstra[ßs]e|Friedrichstra[ßs]e (Railway )?[Ss]tation/i,
    foot: [4, 4],
    seed: 1882,
    draw: (seed) => friedrichstrasseTile(seed),
    light: { kind: 'genericGlow', topZ: 72, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'humboldt-universitaet',
    match: /Humboldt-Universit[äa]t|Humboldt University/i,
    foot: [4, 4],
    seed: 1810,
    draw: (seed) => humboldtUniTile(seed),
    light: { kind: 'facadeFlood', topZ: 57, halfW: 1.6 },
  },
  {
    city: 'berlin',
    key: 'humboldt-forum',
    match: /Humboldt Forum|Berliner Schloss|Berlin City Palace|Stadtschloss/i,
    foot: [5, 5],
    seed: 2020,
    draw: (seed) => humboldtForumTile(seed),
    light: { kind: 'facadeFlood', topZ: 132, halfW: 2.0 },
  },
  {
    city: 'berlin',
    key: 'kraftwerk-berlin',
    match: /Kraftwerk Berlin|Kraftwerk Mitte/i,
    foot: [3, 3],
    seed: 1964,
    draw: (seed) => kraftwerkTile(seed),
    light: { kind: 'aerialBeacon', topZ: 132, halfW: 1.4 },
  },
  {
    city: 'berlin',
    key: 'park-inn-alexanderplatz',
    match: /Park Inn|Hotel Stadt Berlin/i,
    foot: [3, 3],
    seed: 1970,
    draw: (seed) => parkInnTile(seed),
    light: { kind: 'towerCrown', topZ: 173, halfW: 0.9 },
  },
  {
    city: 'berlin',
    key: 'franzoesischer-dom',
    match: /Franz[öo]sischer Dom|French Cathedral/i,
    foot: [2, 2],
    seed: 1705,
    draw: (seed) => franzoesischerDomTile(seed),
    light: { kind: 'facadeFlood', topZ: 172, halfW: 1.0 },
  },
];
