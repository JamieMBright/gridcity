// Cape Town & Table Bay — bespoke-hero registry (Wave W5, ROUND 1 of the ~99
// research target in docs/heroes/capetown/). Each entry resolves a PLACED name
// from src/data/cities/capetown.ts's `named` list to a hand-built iso sprite in
// the game's ink-contour dusk idiom + a bespoke night-electrification light.
//
// Cape Town's character (the brief): the Atlantic / Table Bay whitewash +
// honey-sandstone civic stock, lit by the colourful Bo-Kaap POP (Cape-Malay
// houses in pink/green/blue/yellow) and crowned by a few signature silhouettes.
// The mountain is terrain — these heroes are the BUILDINGS. Families:
//  • MARQUEE icons — the CASTLE OF GOOD HOPE (the five-pointed star fort, with
//    bespoke angular bastions), the BO-KAAP (a cluster of bright flat-roofed
//    Cape-Malay houses around a candy-stripe minaret mosque), ZEITZ MOCAA (the
//    carved cylindrical grain SILOS of the Waterfront), the GREEN POINT
//    LIGHTHOUSE (the red-and-white candy-stripe tower), GROOTE KERK (the Cape
//    Dutch mother-church + clock spire), the GOTHIC CATHEDRALS (St George's,
//    St Mary's), the GREEK ORTHODOX cathedral (Byzantine dome + cross), the
//    RHODES MEMORIAL (the granite Doric colonnade + steps), GREENMARKET SQUARE
//    (the cobbled market square ringed by Cape facades).
//  • CIVIC / CULTURAL — the neoclassical museums + gallery, Artscape's
//    modernist Foreshore block, Nervi's hyperbolic GOOD HOPE CENTRE shell, the
//    long CAPE TOWN STATION concourse, the CTICC convention halls, the EGYPTIAN
//    BUILDING (Egyptian-revival lotus columns), the Cape Dutch townhouses.
//  • FORESHORE TOWERS — Portside (the city's tallest), ABSA Centre, the
//    Southern Sun slabs — slim glass towers reading tall over the low CBD.
//  • GRAND HOTELS — the MOUNT NELSON ("the Pink Lady"), the Table Bay.
//
// SCOPE: this file only. The registry (registry.ts) is already wired to import
// CITY_HEROES; the atlas/fingerprint/placement/renderer all read it.

import type { BespokeHero } from './registry';
import {
  CELL_W,
  FLOOR_H,
  INK,
  INK_W,
  Iso,
  lit,
  RES,
  shaded,
  top,
} from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, mix, type Pt, type RGBA } from '../raster';

// --- shared Cape Town palette -------------------------------------------------
// Whitewash + Bath-stone sandstone is the heritage civic stock; the Bo-Kaap
// pop is the signature colour; the Atlantic blue + harbour granite for the
// waterfront; dark slate/iron roofs read near-black at dusk.
const WASH = hex('#eef0ea'); // Cape whitewash (lime-washed plaster)
const WASH_D = hex('#d3d6cf');
const SAND = hex('#e3c98f'); // honey Bath-stone (City Hall / Edwardian civic)
const SAND_D = hex('#c6ac72');
const SANDP = hex('#d8c39a'); // paler ashlar (museums / gallery)
const ROOFSL = hex('#3f4654'); // dark slate / iron roof (near-black at dusk)
const ROOFRED = hex('#b14a39'); // Cape terracotta / red corrugated iron
const TEAL = hex('#3f8f8a'); // Cape green (shutters / Bo-Kaap green)
const HARBOUR = hex('#3f6fae'); // Table Bay water (rich Atlantic blue)
const GRANITE = hex('#9c9388'); // grey Table-Mountain granite (Rhodes Memorial)
const GRANITE_L = hex('#b4ab9e');
const GLASSCT = hex('#5b8ec6'); // a Cape-blue tower glass (Foreshore CBD)
const GLASSCT_L = hex('#7da9d8');
const COPPER = hex('#5fa389'); // verdigris dome (Greek Orthodox)
const GILT = hex('#cda64a'); // gilt cross / finial
const GILT_HOT = hex('#e8c25a');
const STRIPE_R = hex('#cf4133'); // lighthouse / Bo-Kaap candy red
const PINK = hex('#e8a7b0'); // the Mount Nelson "Pink Lady"
const PINK_D = hex('#d2818d');
// Bo-Kaap house colours — the signature Cape-Malay pop (pink/green/blue/yellow…)
const BOKAAP: RGBA[] = [
  hex('#e85a9a'), // hot pink
  hex('#3aa6a0'), // turquoise
  hex('#4f86d6'), // cobalt blue
  hex('#e8b53f'), // marigold yellow
  hex('#7ec24a'), // lime green
  hex('#e8694a'), // coral
  hex('#9a6fc4'), // violet
];

// =====================================================================
// SMALL SHARED PRIMITIVES (new — not reused from other cities)
// =====================================================================

/** A half-dome / cupola as stacked poly arcs at a screen point. Returns the
 *  tip. `flat` (riseMul<1) squashes toward a saucer; `bulb` makes it onion-ish. */
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
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push([dx + Math.cos(a) * rPx * s, dyB - prof(a) * rise * s]);
    }
    return pts;
  };
  iso.r.poly(ring(1), shaded(body, 0.08), lit(body, 0.06));
  iso.r.poly(ring(0.58).map(([x, y]): Pt => [x + rPx * 0.16, y - rise * 0.12]), lit(body, 0.16));
  for (let k = 0; k < (opts.ribs ?? 0); k++) {
    const t = (k / Math.max(1, (opts.ribs ?? 1) - 1)) * 2 - 1;
    iso.r.line([dx + t * rPx, dyB], [dx + t * rPx * 0.12, dyB - rise], 0.7 * RES, alpha(darken(body, 0.22), 0.7));
  }
  iso.r.polyline(ring(1), INK_W * 0.85, INK);
  return { tipX: dx, tipY: dyB - rise };
}

/** A row of slim columns (a portico / peristyle) on a face at fixed v, from
 *  zBase to zTop. */
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

/** A pointed lancet / Gothic window on a v-face (arched top). */
function lancet(iso: Iso, v: number, u: number, w: number, zb: number, zt: number, glass: RGBA): void {
  iso.r.poly(
    [iso.P(u, v, zb), iso.P(u + w, v, zb), iso.P(u + w, v, zt), iso.P(u + w / 2, v, zt + w * 1.4), iso.P(u, v, zt)],
    glass,
  );
}

/** A small clustered Cape-Dutch / flat-roof house (the Bo-Kaap unit): a low
 *  colour-block box with a parapet and a couple of shuttered windows. */
function capeHouse(iso: Iso, u0: number, v0: number, u1: number, v1: number, z: number, body: RGBA): void {
  iso.box(u0, v0, u1, v1, 0, z, body);
  // raised parapet rim (flat-roof Cape-Malay terrace read)
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, z, z + 3, lighten(body, 0.12), { ink: false });
  // a couple of small dark sash windows + a green/white door on the front face
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, z * 0.38, z * 0.78, 2, alpha(COLORS.glassDark, 0.85), WASH);
}

// =====================================================================
// CASTLE OF GOOD HOPE — the 1666 Dutch East India Company STAR FORT: a low
// pentagonal stone rampart with five ANGULAR corner BASTIONS (Leerdam,
// Buuren, Catzenellenbogen, Nassau, Oranje), an ochre-plastered curtain, the
// bell-tower gateway (Anton Anreith's belfry over the entrance) and a tiled
// inner range (the Kat balcony). Drawn WIDE + low, exaggerated so the spiked
// star plan reads from above — the signature silhouette. 1×1 (wide).
// =====================================================================
function castleGoodHopeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 120 });
  void seed;
  const OCHRE = hex('#d8b27a'); // the castle's ochre-washed plaster
  const OCHRE_D = hex('#bd9760');
  const cx = 0.5, cy = 0.52;
  // five-pointed star plan: alternate rampart corners (R) and bastion tips (B).
  // Drawn WIDE so the spiked star fills the tile and reads as a hero from above.
  const R = 0.42; // rampart radius
  const B = 0.64; // bastion-tip radius (the spikes reach well past the curtain)
  // pentagon of curtain corners + the spike tips between them
  const ramp: Array<[number, number]> = [];
  const tips: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    ramp.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    const at = a + Math.PI / 5;
    tips.push([cx + Math.cos(at) * B, cy + Math.sin(at) * B]);
  }
  iso.shadow(cx - B, cy - B * 0.3, cx + B, cy + B, 0.42, 0.24);
  // tall, massive earthwork ramparts so the fort TOWERS over the fabric
  const wallZ = 54;
  // the ground star (the moat/parade footprint), as a faint stone apron
  const groundStar: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    groundStar.push(iso.P(ramp[i]![0], ramp[i]![1], 0));
    groundStar.push(iso.P(tips[i]![0], tips[i]![1], 0));
  }
  iso.r.poly(groundStar, shaded(OCHRE, 0.18));
  iso.r.polyline(groundStar, INK_W * 0.7, alpha(INK, 0.7), true);
  // the five angular BASTIONS — each a prism rising from a rampart edge to a
  // sharp spear-point, the diamond-shaped artillery bastion. Build per spike.
  for (let i = 0; i < 5; i++) {
    const r0 = ramp[i]!;
    const r1 = ramp[(i + 1) % 5]!;
    const tp = tips[i]!;
    const b0 = iso.P(r0[0], r0[1], 0);
    const b1 = iso.P(r1[0], r1[1], 0);
    const bt = iso.P(tp[0], tp[1], 0);
    const t0 = iso.P(r0[0], r0[1], wallZ);
    const t1 = iso.P(r1[0], r1[1], wallZ);
    const tt = iso.P(tp[0], tp[1], wallZ);
    // the two sloped bastion faces (left + right of the spike) — battered walls
    iso.r.poly([b0, bt, tt, t0], shaded(OCHRE, 0.06));
    iso.r.poly([bt, b1, t1, tt], lit(OCHRE, 0.05));
    // the flat top of the bastion
    iso.r.poly([t0, tt, t1], top(OCHRE, 0.22));
    // ink the spear edges
    iso.r.polyline([b0, bt, b1], INK_W * 0.8, INK);
    iso.r.polyline([t0, tt, t1], INK_W, INK);
    iso.edge(bt, tt);
    iso.edge(b0, t0);
    // a white watch-turret on each bastion tip (the corner sentry box)
    const wt = iso.P(tp[0], tp[1], wallZ);
    iso.r.rect(wt[0] - 2.6 * RES, wt[1] - 12 * RES, wt[0] + 2.6 * RES, wt[1], WASH);
    iso.r.poly([[wt[0] - 3 * RES, wt[1] - 12 * RES], [wt[0] + 3 * RES, wt[1] - 12 * RES], [wt[0], wt[1] - 19 * RES]], ROOFRED);
    iso.r.line([wt[0], wt[1] - 19 * RES], [wt[0], wt[1] - 23 * RES], 0.8 * RES, GILT); // flagpole
  }
  // the inner curtain pentagon top (the parade-ground deck inside the star)
  const innerTop: Pt[] = ramp.map((p) => iso.P(p[0], p[1], wallZ));
  iso.r.poly(innerTop, top(OCHRE_D, 0.18));
  iso.r.polyline(innerTop, INK_W * 0.8, INK, true);
  // the inner range building (the Kat) on the far side, tiled roof — taller so
  // it rises above the rampart deck (the Kat balcony block)
  const ku0 = cx - 0.2, ku1 = cx + 0.2, kv0 = cy - 0.2, kv1 = cy + 0.04;
  iso.box(ku0, kv0, ku1, kv1, wallZ, wallZ + 34, OCHRE);
  iso.gable(ku0, kv0, ku1, kv1, wallZ + 34, 14, 'u', ROOFRED, OCHRE);
  // the BELL-TOWER gateway (Anreith's belfry) over the front (low-v) curtain —
  // the tallest mass, the entrance the real castle is known for
  const gx = cx, gv = cy + R * 0.92;
  iso.box(gx - 0.08, gv - 0.06, gx + 0.08, gv + 0.06, wallZ, wallZ + 40, WASH);
  // the open belfry arch + little dome-bell cupola crowning the gateway
  const [bx, byB] = iso.P(gx, gv, wallZ + 40);
  iso.r.poly([[bx - 4 * RES, byB], [bx + 4 * RES, byB], [bx + 3 * RES, byB - 7 * RES], [bx - 3 * RES, byB - 7 * RES]], WASH_D);
  const dome = domeAt(iso, gx, gv, wallZ + 46, 3.4 * RES, 1.4, WASH, { bulb: true });
  iso.r.line([dome.tipX, dome.tipY], [dome.tipX, dome.tipY - 6 * RES], 1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// THE BO-KAAP — the Cape-Malay quarter: the SIGNATURE cluster of brightly-
// coloured flat-roofed cottages (pink/green/blue/yellow/coral) stepping up a
// cobbled lane, with a candy-stripe MINARET mosque rising among them. This is
// Cape Town's most recognisable streetscape — the colour POP is the point.
// Parameterised by the mosque's minaret colour so the three Bo-Kaap mosques
// (Auwal, Palm Tree, Jameah) each get their own. 2×2.
// =====================================================================
function boKaapTile(seed: number, minaret: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.18, u1 = 1.82, v0 = 0.2, v1 = 1.8;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a cobbled grey lane base under the whole block
  iso.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, 0, 3, shaded(COLORS.pavement, 0.08), { ink: false });
  // a 3×3 grid of colour-block cottages, each its own Bo-Kaap colour, the
  // back rows slightly TALLER (the lane climbs the hill toward the mosque).
  let ci = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // leave the centre-back cell for the mosque
      if (row === 0 && col === 1) continue;
      const cu0 = u0 + 0.06 + col * 0.56;
      const cv0 = v0 + 0.06 + row * 0.56;
      const cu1 = cu0 + 0.48;
      const cv1 = cv0 + 0.48;
      // back rows higher → the hillside terrace read
      const h = 26 + (2 - row) * 8 + (col % 2) * 4;
      const body = BOKAAP[(ci + row * 3 + col) % BOKAAP.length]!;
      ci++;
      capeHouse(iso, cu0, cv0, cu1, cv1, h, body);
    }
  }
  // the MOSQUE among the cottages: a whitewashed prayer hall + tall candy-
  // stripe MINARET with a little onion cap (the Cape-Malay mosque signature).
  const mu = u0 + 0.62, mv = v0 + 0.18;
  iso.box(mu - 0.02, mv - 0.02, mu + 0.48, mv + 0.42, 0, 36, WASH);
  // green-trim arched windows on the hall front
  for (let i = 0; i < 3; i++) {
    const u = mu + 0.06 + i * 0.13;
    iso.r.poly([iso.P(u, mv + 0.42, 8), iso.P(u + 0.07, mv + 0.42, 8), iso.P(u + 0.07, mv + 0.42, 22), iso.P(u + 0.035, mv + 0.42, 27), iso.P(u, mv + 0.42, 22)], alpha(TEAL, 0.8));
  }
  // the minaret: a slim tall shaft with horizontal candy stripes + balcony + cap
  const mx = mu + 0.4, mz = mv + 0.06;
  const SH = 96;
  iso.box(mx - 0.05, mz - 0.05, mx + 0.05, mz + 0.05, 0, SH, WASH);
  // candy stripes up the visible faces (alternating minaret colour bands)
  for (let i = 0; i < 7; i++) {
    const zb = 12 + i * 11;
    iso.r.poly([iso.P(mx - 0.05, mz + 0.05, zb), iso.P(mx + 0.05, mz + 0.05, zb), iso.P(mx + 0.05, mz + 0.05, zb + 5), iso.P(mx - 0.05, mz + 0.05, zb + 5)], i % 2 ? minaret : WASH_D);
  }
  // the balcony ring near the top
  iso.box(mx - 0.07, mz - 0.07, mx + 0.07, mz + 0.07, SH - 14, SH - 9, lighten(minaret, 0.1), { ink: false });
  // the onion cap + finial
  const cap = domeAt(iso, mx, mz, SH, 3.4 * RES, 1.5, minaret, { bulb: true });
  iso.r.line([cap.tipX, cap.tipY], [cap.tipX, cap.tipY - 7 * RES], 1.1 * RES, GILT_HOT);
  // a star-and-crescent glint
  iso.glint([cap.tipX, cap.tipY - 5 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// ZEITZ MOCAA — the grain-SILO museum at the V&A Waterfront: a cluster of
// 42 tall concrete grain SILOS, their tops sculpturally CARVED away to reveal
// the bulging atrium (the signature — the silo cylinders cut into rounded
// pillow-shapes) under the faceted bulging glass-pillow windows of the Silo
// Hotel above. Drawn as a packed grid of fat cylinders + the glazed crown. 2×2.
// =====================================================================
function zeitzMocaaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const CONC = hex('#d7d2c6'); // weathered concrete silo
  const CONC_D = hex('#b8b3a6');
  const u0 = 0.3, u1 = 1.7, v0 = 0.32, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the Table Bay harbour quay lapping the front of the Silo District
  iso.box(u0 - 0.06, v1, u1 + 0.06, v1 + 0.14, 0, 2, shaded(HARBOUR, 0.04), { ink: false });
  // a tight grid of fat vertical cylinders (the 42 silos), 5×5 packed
  const SILO_Z = 118;
  const cols = 5, rows = 5;
  const rPx = 0.13 * (CELL_W / 2);
  // draw back-to-front so nearer cylinders overlap correctly
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cu = u0 + 0.16 + (col / (cols - 1)) * (u1 - u0 - 0.32);
      const cv = v0 + 0.16 + (row / (rows - 1)) * (v1 - v0 - 0.32);
      const [bx, byB] = iso.P(cu, cv, 0);
      const [, tyB] = iso.P(cu, cv, SILO_Z);
      // the cylinder body: two shaded half-tubes
      iso.r.poly([[bx - rPx, byB], [bx - rPx, tyB], [bx, tyB], [bx, byB]], shaded(CONC, 0.06));
      iso.r.poly([[bx, byB], [bx, tyB], [bx + rPx, tyB], [bx + rPx, byB]], lit(CONC, 0.04));
      // the CARVED rounded top (the pillow-cut) — an ellipse cap
      const cap: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (i / 12);
        cap.push([bx + Math.cos(Math.PI - a) * rPx, tyB - Math.sin(a) * rPx * 0.5]);
      }
      iso.r.poly(cap, top(CONC, 0.2));
      iso.r.polyline([[bx - rPx, byB], [bx - rPx, tyB]], INK_W * 0.55, alpha(INK, 0.6));
      iso.r.polyline([[bx + rPx, byB], [bx + rPx, tyB]], INK_W * 0.55, alpha(INK, 0.6));
      iso.r.polyline(cap, INK_W * 0.55, alpha(INK, 0.6));
    }
  }
  // the bulging faceted GLASS crown (the Silo Hotel pillow windows) above the
  // silos — a band of convex glass cushions catching the dusk.
  const gz0 = SILO_Z, gz1 = SILO_Z + 44;
  iso.box(u0 + 0.12, v0 + 0.12, u1 - 0.12, v1 - 0.12, gz0, gz1, shaded(CONC_D, 0.04), { ink: false });
  // convex glass pillows across the visible faces
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.18 + i * 0.24;
    const [px, pyB] = iso.P(u, v1 - 0.12, gz0 + 6);
    const [, pyT] = iso.P(u, v1 - 0.12, gz1 - 4);
    const mid = (pyB + pyT) / 2;
    iso.r.poly([[px - 5 * RES, mid], [px, pyT], [px + 5 * RES, mid], [px, pyB]], alpha(COLORS.glassLit, 0.6));
    iso.r.polyline([[px - 5 * RES, mid], [px, pyT], [px + 5 * RES, mid], [px, pyB]], INK_W * 0.5, alpha(INK, 0.5), true);
  }
  iso.r.polyline([iso.P(u0 + 0.12, v0 + 0.12, gz1), iso.P(u1 - 0.12, v0 + 0.12, gz1), iso.P(u1 - 0.12, v1 - 0.12, gz1), iso.P(u0 + 0.12, v1 - 0.12, gz1)], INK_W, INK, true);
  return iso.build();
}

// =====================================================================
// GREEN POINT LIGHTHOUSE — Cape Town's oldest lighthouse: the candy-stripe
// (diagonal red-and-white) round tower with a black lantern gallery + a low
// keeper's cottage. A tall slim beacon; the stripes are the read. 1×1.
// =====================================================================
function lighthouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 200 });
  void seed;
  const cx = 0.54, cy = 0.54;
  iso.shadow(cx - 0.22, cy - 0.1, cx + 0.22, cy + 0.24, 0.34, 0.24);
  // the low keeper's cottage at the base
  iso.box(cx - 0.32, cy - 0.06, cx + 0.06, cy + 0.28, 0, 18, WASH);
  iso.gable(cx - 0.32, cy - 0.06, cx + 0.06, cy + 0.28, 18, 8, 'u', ROOFRED, WASH);
  // the tall round tower: a slim cylinder with DIAGONAL red/white candy stripes
  const TZ = 132;
  const rPx = 0.12 * (CELL_W / 2);
  const [bx, byB] = iso.P(cx, cy, 0);
  const [, tyB] = iso.P(cx, cy, TZ);
  // the white tube
  iso.r.poly([[bx - rPx, byB], [bx - rPx, tyB], [bx + rPx, tyB], [bx + rPx, byB]], WASH);
  // diagonal red barber-pole bands
  const N = 9;
  for (let i = 0; i < N; i++) {
    if (i % 2 === 1) continue;
    const f0 = i / N, f1 = (i + 1) / N;
    const y0 = byB + (tyB - byB) * f0;
    const y1 = byB + (tyB - byB) * f1;
    // skewed parallelogram band (diagonal stripe)
    iso.r.poly([[bx - rPx, y0], [bx - rPx, y1], [bx + rPx, y1 - (tyB - byB) / N * 0.8], [bx + rPx, y0 - (tyB - byB) / N * 0.8]], STRIPE_R);
  }
  iso.r.polyline([[bx - rPx, byB], [bx - rPx, tyB]], INK_W * 0.7, INK);
  iso.r.polyline([[bx + rPx, byB], [bx + rPx, tyB]], INK_W * 0.7, INK);
  // the black lantern gallery + light room at the top
  iso.r.rect(bx - rPx * 1.3, tyB - 3 * RES, bx + rPx * 1.3, tyB + 2 * RES, ROOFSL); // gallery rail
  const [, lyB] = iso.P(cx, cy, TZ + 16);
  iso.r.poly([[bx - rPx * 0.9, tyB - 2 * RES], [bx - rPx * 0.9, lyB], [bx + rPx * 0.9, lyB], [bx + rPx * 0.9, tyB - 2 * RES]], alpha(COLORS.glassLit, 0.8)); // glowing light room
  iso.r.poly([[bx - rPx * 1.1, lyB], [bx + rPx * 1.1, lyB], [bx, lyB - 9 * RES]], ROOFSL); // dome cap
  iso.glint([bx, lyB - 1 * RES], 2.6 * RES);
  return iso.build();
}

// =====================================================================
// GROOTE KERK — South Africa's oldest church (Dutch Reformed, 1841 body with
// the retained earlier TOWER): a white Cape-Dutch nave with a tall clock
// TOWER topped by an ornate baroque cupola + weathervane spire (the Adderley
// Street landmark). 1×1 (wide), towering tower. 
// =====================================================================
function grooteKerkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 220 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.24);
  // the broad whitewashed nave with a steep slate gable
  iso.box(u0, v0 + 0.14, u1, v1, 0, 52, WASH);
  iso.gable(u0, v0 + 0.14, u1, v1, 52, 22, 'v', ROOFSL, WASH);
  // tall round-headed nave windows on the visible face
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.08 + i * 0.16;
    iso.r.poly([iso.P(u, v1, 12), iso.P(u + 0.08, v1, 12), iso.P(u + 0.08, v1, 32), iso.P(u + 0.04, v1, 38), iso.P(u, v1, 32)], alpha(COLORS.glassDark, 0.85));
  }
  // the retained TOWER at the front-left: a tall square white shaft, clock,
  // baroque cupola + spire (the signature).
  const tx0 = u0 + 0.06, tx1 = u0 + 0.36, tv0 = v0 + 0.02, tv1 = v0 + 0.3;
  const TZ = 118;
  iso.box(tx0, tv0, tx1, tv1, 0, TZ, WASH);
  // string-courses banding the stages
  iso.r.line(iso.P(tx0, tv1, 56), iso.P(tx1, tv1, 56), 1.2 * RES, WASH_D);
  iso.r.line(iso.P(tx0, tv1, 86), iso.P(tx1, tv1, 86), 1.2 * RES, WASH_D);
  // the clock face high on the tower
  const [clx, cly] = iso.P((tx0 + tx1) / 2, tv1, 96);
  iso.r.poly(circlePts(clx, cly - 4 * RES, 3.4 * RES), WASH);
  iso.r.polyline(circlePts(clx, cly - 4 * RES, 3.4 * RES), INK_W * 0.6, INK, true);
  iso.r.line([clx, cly - 4 * RES], [clx, cly - 6.5 * RES], 0.9 * RES, INK);
  iso.r.line([clx, cly - 4 * RES], [clx + 2 * RES, cly - 4 * RES], 0.9 * RES, INK);
  // the ornate baroque cupola: a small drum + bulbous dome + tall finial spire
  const cx = (tx0 + tx1) / 2, cy = (tv0 + tv1) / 2;
  iso.box(cx - 0.08, cy - 0.08, cx + 0.08, cy + 0.08, TZ, TZ + 12, WASH_D);
  const cap = domeAt(iso, cx, cy, TZ + 12, 4.6 * RES, 1.5, WASH, { bulb: true, ribs: 4 });
  iso.r.line([cap.tipX, cap.tipY], [cap.tipX, cap.tipY - 16 * RES], 1.3 * RES, ROOFSL);
  // weathervane cross-arm
  iso.r.line([cap.tipX - 3 * RES, cap.tipY - 12 * RES], [cap.tipX + 3 * RES, cap.tipY - 12 * RES], 1 * RES, GILT);
  iso.glint([cap.tipX, cap.tipY - 4 * RES], 2.2 * RES);
  return iso.build();
}

/** A circle of points (for clock faces / round windows). */
function circlePts(cx: number, cy: number, r: number, squashY = 1): Pt[] {
  const p: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * squashY]);
  }
  return p;
}

// =====================================================================
// GOTHIC CATHEDRAL — a Cape sandstone Gothic-Revival church: a nave with steep
// roof, side aisles with lancet windows, a great rose/wheel window in the gable
// and a prominent front TOWER (Herbert Baker's St George's has a square tower;
// St Mary's a slimmer one). `tower` toggles a tall belfry tower vs a flèche.
// 2×2.
// =====================================================================
function gothicCathedralTile(seed: number, bigTower: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: bigTower ? 200 : 170 });
  void seed;
  const ST = SAND;
  const ROOF = ROOFSL;
  const GLASS = alpha(hex('#243a52'), 0.9);
  const u0 = 0.4, u1 = 1.6, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // side aisles flanking the nave
  iso.box(u0, v0 + 0.1, u0 + 0.26, v1, 0, 36, ST);
  iso.box(u1 - 0.26, v0 + 0.1, u1, v1, 0, 36, ST);
  iso.quad(u0, v0 + 0.1, u0 + 0.26, v1, 36, shaded(ROOF, 0.04));
  iso.quad(u1 - 0.26, v0 + 0.1, u1, v1, 36, lit(ROOF, 0.04));
  // a stone string-course banding the aisle wall, then lancet windows below it
  iso.r.line(iso.P(u0, v1, 30), iso.P(u1, v1, 30), 1 * RES, SAND_D);
  for (let i = 0; i < 6; i++) lancet(iso, v1, u0 + 0.06 + i * 0.18, 0.08, 10, 26, GLASS);
  // the nave + steep gable roof (ridge along v)
  const navH = 62;
  iso.box(u0 + 0.26, v0, u1 - 0.26, v1, 0, navH, ST);
  iso.gable(u0 + 0.26, v0, u1 - 0.26, v1, navH, 28, 'v', ROOF, ST);
  // the great rose window in the front gable
  const [rx, ry] = iso.P((u0 + u1) / 2, v1, 64);
  const RR = 9 * RES;
  iso.r.poly(circlePts(rx, ry, RR, 0.96), GLASS);
  iso.r.polyline(circlePts(rx, ry, RR, 0.96), INK_W * 0.7, INK, true);
  iso.r.line([rx - RR, ry], [rx + RR, ry], 1 * RES, alpha(COLORS.white, 0.5));
  iso.r.line([rx, ry - RR * 0.96], [rx, ry + RR * 0.96], 1 * RES, alpha(COLORS.white, 0.5));
  // the prominent front TOWER (right of the front), square belfry
  const tu = u1 - 0.13, tv = v1 - 0.13;
  const towerZ = bigTower ? 138 : 104;
  iso.box(tu - 0.16, tv - 0.16, tu + 0.13, tv + 0.13, 0, towerZ, ST);
  // belfry openings stacked on the front face
  for (const [zb, zt] of [[towerZ - 56, towerZ - 36], [towerZ - 28, towerZ - 10]] as const) {
    lancet(iso, tv + 0.13, tu - 0.12, 0.1, zb, zt, GLASS);
  }
  // crenellated parapet (St George's square tower has battlements) or a spire
  if (bigTower) {
    iso.box(tu - 0.18, tv - 0.18, tu + 0.15, tv + 0.15, towerZ, towerZ + 6, lighten(ST, 0.06), { ink: false });
    // corner pinnacles
    for (const [pu, pv] of [[tu - 0.16, tv + 0.13], [tu + 0.13, tv + 0.13], [tu + 0.13, tv - 0.16]] as const) {
      const pb = iso.P(pu, pv, towerZ + 6);
      iso.r.poly([[pb[0] - 2.2 * RES, pb[1]], [pb[0] + 2.2 * RES, pb[1]], [pb[0], pb[1] - 12 * RES]], lit(ST, 0.08));
    }
  } else {
    const apex = iso.P(tu - 0.015, tv - 0.015, towerZ + 40);
    const c0 = iso.P(tu - 0.16, tv + 0.13, towerZ);
    const c1 = iso.P(tu + 0.13, tv + 0.13, towerZ);
    const c2 = iso.P(tu + 0.13, tv - 0.16, towerZ);
    iso.r.poly([c0, c1, apex], shaded(ROOF, 0.1));
    iso.r.poly([c1, c2, apex], lit(ROOF, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.7, INK);
  }
  return iso.build();
}

// =====================================================================
// GREEK ORTHODOX CATHEDRAL OF ST GEORGE — a Byzantine church: a cross-plan
// body crowned by a big central DOME on a windowed drum + four small corner
// cupolas, an arcaded narthex front, all topped with Orthodox crosses. 1×1
// (wide).
// =====================================================================
function greekOrthodoxTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const ST = hex('#e0d4b8'); // warm cream byzantine stone
  const u0 = 0.16, u1 = 0.84, v0 = 0.18, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.24);
  // cruciform body
  iso.box(u0, v0, u1, v1, 0, 40, ST);
  // arcaded narthex (round-arched windows) on the front
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.08 + i * 0.16;
    const poly: Pt[] = [iso.P(u, v1, 10), iso.P(u, v1, 24)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.1 * t, v1, 24 + Math.sin(t * Math.PI) * 5)); }
    poly.push(iso.P(u + 0.1, v1, 24), iso.P(u + 0.1, v1, 10));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
  }
  const orthodoxCross = (x: number, y: number, s: number): void => {
    iso.r.line([x, y], [x, y - s], 1.2 * RES, GILT_HOT);
    iso.r.line([x - s * 0.35, y - s * 0.7], [x + s * 0.35, y - s * 0.7], 1 * RES, GILT_HOT);
    iso.r.line([x - s * 0.22, y - s * 0.45], [x + s * 0.22, y - s * 0.45], 0.9 * RES, GILT_HOT);
  };
  // four small corner cupolas
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  for (const [du, dv] of [[u0 + 0.14, v0 + 0.14], [u1 - 0.14, v0 + 0.14], [u0 + 0.14, v1 - 0.14], [u1 - 0.14, v1 - 0.14]] as const) {
    iso.box(du - 0.05, dv - 0.05, du + 0.05, dv + 0.05, 40, 52, lighten(ST, 0.04), { ink: false });
    const c = domeAt(iso, du, dv, 52, 0.09 * (CELL_W / 2), 1.0, COPPER, { bulb: true });
    orthodoxCross(c.tipX, c.tipY, 6 * RES);
  }
  // the big central drum + dome
  iso.box(cx - 0.14, cy - 0.14, cx + 0.14, cy + 0.14, 40, 72, lighten(ST, 0.05));
  // drum windows (a ring of slits)
  for (let i = 0; i < 4; i++) {
    const u = cx - 0.1 + i * 0.07;
    iso.r.poly([iso.P(u, cy + 0.14, 52), iso.P(u + 0.03, cy + 0.14, 52), iso.P(u + 0.03, cy + 0.14, 66), iso.P(u, cy + 0.14, 66)], alpha(COLORS.glassDark, 0.8));
  }
  const main = domeAt(iso, cx, cy, 72, 0.2 * (CELL_W / 2), 1.15, COPPER, { ribs: 6, bulb: true });
  orthodoxCross(main.tipX, main.tipY, 13 * RES);
  return iso.build();
}

// =====================================================================
// RHODES MEMORIAL — the granite Doric COLONNADE on the slopes of Devil's Peak:
// a monumental flight of STEPS rising between bronze lions to a U-shaped Greek
// temple of granite columns + a central bust, set against the mountain. The
// steps + colonnade are the read. 2×2 (open, monumental). 
// =====================================================================
function rhodesMemorialTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the broad granite STEPS climbing toward the temple (terraced platforms)
  const STEPS = 7;
  for (let i = 0; i < STEPS; i++) {
    const f0 = i / STEPS, f1 = (i + 1) / STEPS;
    const sv0 = v1 - f0 * (v1 - v0) * 0.55;
    const sv1 = v1 - f1 * (v1 - v0) * 0.55;
    const z = i * 4;
    iso.box(u0 + 0.1 + f0 * 0.06, sv1, u1 - 0.1 - f0 * 0.06, sv0, z, z + 4, i % 2 ? GRANITE : GRANITE_L, { ink: false });
  }
  const platZ = STEPS * 4;
  // bronze lions flanking the foot of the steps
  for (const lu of [u0 + 0.14, u1 - 0.14] as const) {
    const [lx, ly] = iso.P(lu, v1 - 0.04, 0);
    iso.r.rect(lx - 4 * RES, ly - 9 * RES, lx + 4 * RES, ly, hex('#7d6f4a')); // plinth
    iso.r.poly([[lx - 5 * RES, ly - 9 * RES], [lx + 5 * RES, ly - 9 * RES], [lx + 4 * RES, ly - 16 * RES], [lx - 6 * RES, ly - 16 * RES]], hex('#8a7d52')); // couchant lion mass
  }
  // the U-shaped temple platform at the top
  iso.box(u0 + 0.18, v0 + 0.06, u1 - 0.18, v0 + 0.5, platZ, platZ + 8, GRANITE);
  // the colonnade: a row of Doric granite columns across the front of the temple
  const colZ0 = platZ + 8, colZ1 = platZ + 52;
  colonnade(iso, v0 + 0.5, u0 + 0.22, u1 - 0.22, colZ0, colZ1, 9, GRANITE_L);
  // the entablature + low pediment over the columns
  iso.box(u0 + 0.16, v0 + 0.04, u1 - 0.16, v0 + 0.52, colZ1, colZ1 + 8, lighten(GRANITE, 0.08), { topC: top(GRANITE, 0.24) });
  pediment(iso, v0 + 0.52, u0 + 0.24, u1 - 0.24, colZ1 + 8, 12, GRANITE_L);
  // the central bronze bust on its pedestal between the columns
  const [bx, byB] = iso.P((u0 + u1) / 2, v0 + 0.5, colZ0);
  iso.r.rect(bx - 3 * RES, byB - 14 * RES, bx + 3 * RES, byB, hex('#5f6f5a'));
  iso.r.poly(circlePts(bx, byB - 18 * RES, 3 * RES), hex('#6f7d62'));
  return iso.build();
}

// =====================================================================
// GREENMARKET SQUARE — the historic cobbled market square: an open paved plaza
// ringed by Cape Georgian / Art-Deco facades with a scatter of bright market-
// stall canopies + a fountain in the middle (the flea-market read). The OPEN
// square + canopies are the signature. 2×2 (mostly open ground).
// =====================================================================
function greenmarketSquareTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.16, u1 = 1.84, v0 = 0.16, v1 = 1.84;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.18);
  // the cobbled plaza floor
  iso.box(u0, v0, u1, v1, 0, 2, shaded(COLORS.pavement, 0.04), { ink: false });
  // a chequer cobble hint
  for (let a = 0; a < 5; a++) {
    iso.r.line(iso.P(u0 + a * 0.34, v0, 2), iso.P(u0 + a * 0.34, v1, 2), 0.5 * RES, alpha(INK, 0.12));
    iso.r.line(iso.P(u0, v0 + a * 0.34, 2), iso.P(u1, v0 + a * 0.34, 2), 0.5 * RES, alpha(INK, 0.12));
  }
  // ringing facades along the two BACK edges (low + mid Cape buildings)
  const faceCols = [SANDP, WASH, hex('#cdbfa0'), PINK, WASH_D] as const;
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.04 + i * 0.34;
    const h = 30 + (i % 3) * 10;
    iso.box(u, v0, u + 0.3, v0 + 0.22, 0, h, faceCols[i]!);
    iso.windowsLeft(v0 + 0.22, u + 0.03, u + 0.27, h * 0.4, h * 0.82, 3, alpha(COLORS.glassDark, 0.8), WASH);
  }
  for (let i = 0; i < 5; i++) {
    const v = v0 + 0.26 + i * 0.31;
    const h = 28 + (i % 2) * 12;
    iso.box(u0, v, u0 + 0.2, v + 0.27, 0, h, faceCols[(i + 2) % 5]!);
  }
  // the bright market-stall canopies scattered across the plaza (the colour pop)
  const stallCols = [STRIPE_R, TEAL, hex('#e8b53f'), hex('#4f86d6'), hex('#7ec24a')] as const;
  let s = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cu = u0 + 0.62 + c * 0.34;
      const cv = v0 + 0.6 + r * 0.34;
      const cap = iso.P(cu, cv, 16);
      // a small pitched canopy (a coloured tent top on thin legs)
      iso.r.poly([[cap[0] - 6 * RES, cap[1]], [cap[0] + 6 * RES, cap[1]], [cap[0] + 4 * RES, cap[1] - 5 * RES], [cap[0] - 4 * RES, cap[1] - 5 * RES]], stallCols[s % stallCols.length]!);
      iso.r.line([cap[0] - 5 * RES, cap[1]], [cap[0] - 5 * RES, cap[1] + 8 * RES], 0.7 * RES, alpha(INK, 0.5));
      iso.r.line([cap[0] + 5 * RES, cap[1]], [cap[0] + 5 * RES, cap[1] + 8 * RES], 0.7 * RES, alpha(INK, 0.5));
      s++;
    }
  }
  return iso.build();
}

// =====================================================================
// NEOCLASSICAL CIVIC — a Cape sandstone museum / gallery / library: a symmetric
// stone block with a rusticated base, a giant pedimented portico of columns
// over the entrance and a low parapet. Serves the Iziko SA Museum, the National
// Gallery, the Central Library, the SA Archives. `cols` sizes the portico.
// 2×2.
// =====================================================================
function neoclassicalTile(seed: number, portico: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const ST = SANDP;
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the main stone block
  iso.box(u0, v0, u1, v1, 0, 46, ST);
  // rusticated base band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 11, shaded(ST, 0.12), { ink: false });
  // a row of tall windows on the visible wall
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 40, 7, alpha(COLORS.glassDark, 0.82), WASH);
  // cornice + low parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 46, 51, lighten(ST, 0.08), { topC: top(ST, 0.28) });
  if (portico) {
    // a projecting central pedimented portico (the museum/gallery front)
    const pu0 = u0 + 0.36, pu1 = u1 - 0.36;
    colonnade(iso, v1 + 0.02, pu0, pu1, 14, 44, 5, COLORS.white);
    iso.box(pu0 - 0.04, v1 - 0.02, pu1 + 0.04, v1 + 0.06, 44, 49, lighten(ST, 0.1));
    pediment(iso, v1 + 0.06, pu0, pu1, 49, 12, ST);
  }
  return iso.build();
}

// =====================================================================
// EGYPTIAN BUILDING — UCT's Michaelis Egyptian-Revival landmark: a sandy
// ochre block with BATTERED (inward-leaning) walls, a deep cavetto cornice and
// a row of papyrus/lotus-bundle COLUMNS with a winged-disc lintel — unmistakably
// Egyptian. 1×1 (wide).
// =====================================================================
function egyptianBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const SANDE = hex('#dcc081'); // Egyptian sandy ochre
  const u0 = 0.16, u1 = 0.84, v0 = 0.2, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  // the main block with slightly battered (tapering) walls — narrower at top
  const z = 50;
  const t0 = iso.P(u0 + 0.03, v1 - 0.03, z), t1 = iso.P(u1 - 0.03, v1 - 0.03, z);
  const b0 = iso.P(u0, v1, 0), b1 = iso.P(u1, v1, 0);
  iso.r.poly([b0, b1, t1, t0], shaded(SANDE, 0.04)); // battered left face
  const r0 = iso.P(u1, v0, 0), rt = iso.P(u1 - 0.03, v0 + 0.03, z), rt1 = iso.P(u1 - 0.03, v1 - 0.03, z);
  iso.r.poly([b1, r0, rt, rt1], lit(SANDE, 0.04)); // battered right face
  iso.quad(u0 + 0.03, v0 + 0.03, u1 - 0.03, v1 - 0.03, z, top(SANDE, 0.2));
  // the deep flaring CAVETTO cornice at the top (the Egyptian gorge cornice)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 10, lighten(SANDE, 0.06));
  iso.r.line(iso.P(u0, v1, z + 5), iso.P(u1, v1, z + 5), 1.2 * RES, alpha(STRIPE_R, 0.5)); // painted cornice band
  // a row of papyrus-bundle COLUMNS across the front (thick, with bell capitals)
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.1 + i * 0.14;
    iso.r.poly([iso.P(u - 0.02, v1, 4), iso.P(u + 0.02, v1, 4), iso.P(u + 0.02, v1, z - 8), iso.P(u - 0.02, v1, z - 8)], i % 2 ? SANDE : lighten(SANDE, 0.06));
    // bell capital
    const [bx, by] = iso.P(u, v1, z - 8);
    iso.r.poly([[bx - 2.4 * RES, by], [bx + 2.4 * RES, by], [bx + 1.6 * RES, by - 4 * RES], [bx - 1.6 * RES, by - 4 * RES]], shaded(GILT, 0.1));
  }
  return iso.build();
}

// =====================================================================
// GOOD HOPE CENTRE — Pier Luigi Nervi's defunct exhibition hall: a vast
// SHALLOW double-curved concrete SHELL roof (a hyperbolic-paraboloid saddle)
// over a low ribbed drum — the swooping white saddle is the read. 2×2.
// =====================================================================
function goodHopeCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const CONC = hex('#dad6cc');
  const u0 = 0.26, u1 = 1.74, v0 = 0.28, v1 = 1.72;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the low circular base drum
  iso.box(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1, 0, 24, shaded(CONC, 0.06));
  // ribbed glazing band around the drum
  for (let i = 0; i < 8; i++) {
    const u = u0 + 0.16 + i * 0.18;
    iso.r.poly([iso.P(u, v1 - 0.1, 6), iso.P(u + 0.09, v1 - 0.1, 6), iso.P(u + 0.09, v1 - 0.1, 22), iso.P(u, v1 - 0.1, 22)], alpha(COLORS.glassLit, 0.55));
  }
  // the great saddle SHELL: a thin curved roof dipping in the middle, rising at
  // the corners — build as a warped quad mesh (rows of arcs) in concrete white.
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  const saddleZ = (du: number, dv: number): number => 30 + 26 * (du * du + dv * dv) - 10; // up at corners
  const NU = 6, NV = 6;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const ua = u0 + 0.1 + (i / NU) * (u1 - u0 - 0.2);
      const ub = u0 + 0.1 + ((i + 1) / NU) * (u1 - u0 - 0.2);
      const va = v0 + 0.1 + (j / NV) * (v1 - v0 - 0.2);
      const vb = v0 + 0.1 + ((j + 1) / NV) * (v1 - v0 - 0.2);
      const za = saddleZ((ua - cx) / 0.7, (va - cy) / 0.7);
      const zb = saddleZ((ub - cx) / 0.7, (va - cy) / 0.7);
      const zc = saddleZ((ub - cx) / 0.7, (vb - cy) / 0.7);
      const zd = saddleZ((ua - cx) / 0.7, (vb - cy) / 0.7);
      const shade = 0.04 + (i + j) * 0.012;
      iso.r.poly([iso.P(ua, va, za), iso.P(ub, va, zb), iso.P(ub, vb, zc), iso.P(ua, vb, zd)], j < NV / 2 ? top(CONC, 0.18 - shade) : lit(CONC, 0.06));
    }
  }
  // ink the swooping front edge of the shell
  const edgePts: Pt[] = [];
  for (let i = 0; i <= NU; i++) {
    const ua = u0 + 0.1 + (i / NU) * (u1 - u0 - 0.2);
    edgePts.push(iso.P(ua, v1 - 0.1, saddleZ((ua - cx) / 0.7, (v1 - 0.1 - cy) / 0.7)));
  }
  iso.r.polyline(edgePts, INK_W, INK);
  return iso.build();
}

// =====================================================================
// CAPE TOWN STATION — the long modernist 1960s railway terminus on Adderley
// Street: a long low concrete concourse block with a continuous ribbon of
// glazing, a flat slab canopy and a clock/sign band — and the glazed train
// shed behind. A long broad station. 2×2.
// =====================================================================
function capeStationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const CONC = hex('#cbc6ba');
  const u0 = 0.22, u1 = 1.78, v0 = 0.34, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // the glazed train shed behind (a long low arched glow)
  iso.box(u0 + 0.1, v0 + 0.1, u1 - 0.1, v0 + 0.6, 0, 30, shaded(COLORS.glassSky, 0.06), { ink: false });
  for (let i = 0; i <= 12; i++) {
    const u = u0 + 0.16 + (i / 12) * (u1 - u0 - 0.32);
    const [bx, by] = iso.P(u, v0 + 0.35, 30);
    iso.r.line([bx, by], [bx, by - 14 * RES], 0.7 * RES, i % 3 === 0 ? alpha(COLORS.glassLit, 0.7) : alpha(COLORS.glassSky, 0.85));
  }
  // the long concourse block in front
  iso.box(u0, v1 - 0.5, u1, v1, 0, 44, CONC);
  // a continuous ribbon of glazing across the front
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 16, 36, 14, alpha(COLORS.glassLit, 0.5), COLORS.steelDark);
  // the flat projecting entrance canopy slab
  iso.box(u0 + 0.02, v1 - 0.02, u1 - 0.02, v1 + 0.08, 18, 22, shaded(CONC, 0.04));
  // the sign / clock band along the parapet
  iso.box(u0 - 0.02, v1 - 0.52, u1 + 0.02, v1 + 0.02, 44, 50, COLORS.steelDark, { ink: false });
  const [clx, cly] = iso.P(u0 + 0.3, v1, 47);
  iso.r.poly(circlePts(clx, cly, 2.6 * RES), WASH);
  return iso.build();
}

// =====================================================================
// CTICC — the Cape Town International Convention Centre: a big modern glass-
// and-steel hall with a sweeping curved metal roof, a glazed atrium front and
// a feature blade/fin. Parameterised (v2 is the newer extension). 2×2.
// =====================================================================
function cticcTile(seed: number, v2: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.26, u1 = 1.74, v0 = 0.3, v1 = 1.7;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the main hall mass
  iso.box(u0, v0, u1, v1, 0, v2 ? 56 : 46, COLORS.concrete);
  // a fully glazed atrium front (a big lit glass wall)
  iso.box(u0 + 0.04, v1 - 0.04, u1 - 0.04, v1, 0, v2 ? 50 : 40, alpha(GLASSCT, 0.7), { ink: false });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 8, v2 ? 48 : 38, 10, alpha(COLORS.glassLit, 0.5), COLORS.steelDark);
  // the sweeping curved metal roof (a shallow arc cresting front-to-back)
  const crest: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    const v = v0 + f * (v1 - v0);
    const z = (v2 ? 56 : 46) + Math.sin(f * Math.PI) * (v2 ? 26 : 18);
    crest.push(iso.P(u0, v, z));
  }
  // fill the curved roof as a band
  for (let i = 0; i < 10; i++) {
    const f0 = i / 10, f1 = (i + 1) / 10;
    const va = v0 + f0 * (v1 - v0), vb = v0 + f1 * (v1 - v0);
    const za = (v2 ? 56 : 46) + Math.sin(f0 * Math.PI) * (v2 ? 26 : 18);
    const zb = (v2 ? 56 : 46) + Math.sin(f1 * Math.PI) * (v2 ? 26 : 18);
    iso.r.poly([iso.P(u0, va, za), iso.P(u1, va, za), iso.P(u1, vb, zb), iso.P(u0, vb, zb)], i < 5 ? top(COLORS.steel, 0.16) : lit(COLORS.steel, 0.06));
  }
  iso.r.polyline(crest, INK_W, INK);
  // a feature blade fin rising at the front corner
  iso.box(u1 - 0.12, v1 - 0.1, u1 - 0.04, v1, 0, v2 ? 76 : 62, COLORS.steelDark);
  return iso.build();
}

// =====================================================================
// FORESHORE TOWER — a slim Cape-blue glass CBD tower (Portside, ABSA Centre,
// the Southern Sun slabs, 1 Thibault Square). A tall shaft with a banded
// curtain wall, a slight taper / chamfer and a flat or crowned parapet.
// `h` sets the height; `crown` adds a lit roof box. 1×1.
// =====================================================================
function foreshoreTowerTile(seed: number, h: number, crown: boolean, body: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: Math.max(80, h + 30) });
  void seed;
  const u0 = 0.26, u1 = 0.78, v0 = 0.26, v1 = 0.78;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  // a low stone podium
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 12, WASH_D);
  // the glass shaft
  iso.box(u0, v0, u1, v1, 12, h, body, {
    leftC: shaded(body, 0.06),
    rightC: lit(body, 0.05),
    topC: top(body, 0.18),
  });
  // horizontal floor banding (curtain-wall reflectivity)
  for (let z = 22; z < h - 4; z += 7) {
    iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.5 * RES, alpha(lighten(body, 0.18), 0.5));
    iso.r.line(iso.P(u1, v0, z), iso.P(u1, v1, z), 0.5 * RES, alpha(lighten(body, 0.18), 0.5));
  }
  // a couple of vertical mullion accents
  iso.r.line(iso.P((u0 + u1) / 2, v1, 14), iso.P((u0 + u1) / 2, v1, h), 0.6 * RES, alpha(shaded(body, 0.2), 0.6));
  if (crown) {
    iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, h, h + 12, COLORS.steelDark);
    iso.glint(iso.P((u0 + u1) / 2, (v0 + v1) / 2, h + 12), 2.4 * RES);
  }
  return iso.build();
}

// =====================================================================
// MOUNT NELSON HOTEL — "the Pink Lady": the famous 1899 colonial hotel painted
// signature PINK, a long low Edwardian wing with a central pedimented portico,
// white quoins + balustrade and palm-flanked grounds. The PINK is the read.
// 2×2.
// =====================================================================
function mountNelsonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.42, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // a green garden apron with two palms
  iso.box(u0 - 0.06, v1, u1 + 0.06, v1 + 0.12, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  // the long PINK hotel body
  iso.box(u0, v0, u1, v1, 0, 40, PINK, { leftC: shaded(PINK_D, 0.06), rightC: lit(PINK, 0.05) });
  // white quoins / cornice band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 40, 45, WASH, { topC: top(WASH, 0.2) });
  // two rows of white-framed sash windows
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 18, 9, alpha(COLORS.glassDark, 0.8), WASH);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 24, 36, 9, alpha(COLORS.glassDark, 0.8), WASH);
  // the central white pedimented portico (the grand entrance)
  const pu0 = u0 + 0.54, pu1 = u1 - 0.54;
  colonnade(iso, v1 + 0.02, pu0, pu1, 6, 30, 4, COLORS.white);
  iso.box(pu0 - 0.03, v1 - 0.02, pu1 + 0.03, v1 + 0.06, 30, 35, WASH);
  pediment(iso, v1 + 0.06, pu0, pu1, 35, 10, WASH);
  // a hipped slate roof + central cupola
  iso.hip(u0, v0, u1, v1, 45, 12, ROOFSL);
  // two palms flanking the front
  for (const pu of [u0 + 0.06, u1 - 0.06] as const) {
    const [px, py] = iso.P(pu, v1 + 0.06, 0);
    iso.r.line([px, py], [px, py - 16 * RES], 1.2 * RES, hex('#6f5a3a'));
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.5;
      iso.r.line([px, py - 16 * RES], [px + Math.cos(a) * 7 * RES, py - 16 * RES + Math.sin(a) * 7 * RES], 1 * RES, COLORS.treeGreen);
    }
  }
  return iso.build();
}

// =====================================================================
// CAPE DUTCH TOWNHOUSE — the whitewashed 18th-C Cape vernacular: a low broad
// white house with green shutters, a thatched or slate roof and the signature
// ornate curved Baroque GABLE (the "holbol" gable) over the front door. Serves
// Koopmans-de Wet House, the Old Town House, Martin Melck, the Slave Lodge-type
// heritage houses. 1×1 (wide).
// =====================================================================
function capeDutchHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.22, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the broad whitewashed body
  iso.box(u0, v0, u1, v1, 0, 30, WASH);
  // green-shuttered sash windows + a central door on the front
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 8, 22, 4, alpha(COLORS.glassDark, 0.8), TEAL);
  // a thatch/slate hipped roof
  iso.gable(u0, v0, u1, v1, 30, 14, 'u', hex('#9a7d52'), WASH);
  // the ornate curved BAROQUE GABLE over the centre front (the Cape-Dutch read)
  const gx = (u0 + u1) / 2;
  const [bx, byB] = iso.P(gx, v1, 30);
  // an S-curved scrolled gable silhouette
  const gable: Pt[] = [
    [bx - 7 * RES, byB], [bx - 7 * RES, byB - 6 * RES],
    [bx - 4 * RES, byB - 11 * RES], [bx - 5 * RES, byB - 15 * RES],
    [bx, byB - 20 * RES],
    [bx + 5 * RES, byB - 15 * RES], [bx + 4 * RES, byB - 11 * RES],
    [bx + 7 * RES, byB - 6 * RES], [bx + 7 * RES, byB],
  ];
  iso.r.poly(gable, lit(WASH, 0.04));
  iso.r.polyline(gable, INK_W * 0.7, INK, true);
  // a little date-cartouche oculus in the gable
  iso.r.poly(circlePts(bx, byB - 11 * RES, 2.2 * RES), alpha(COLORS.glassDark, 0.7));
  return iso.build();
}

// =====================================================================
// LUTHERAN CHURCH (Strand Street) — Anton Anreith's 1790s church: a plain
// whitewashed body fronted by a tall slim TOWER with a distinctive ogee /
// bell-shaped baroque steeple (added later) — the steeple is the read. 1×1.
// =====================================================================
function lutheranChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 170 });
  void seed;
  const u0 = 0.2, u1 = 0.82, v0 = 0.24, v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  // the plain whitewashed nave
  iso.box(u0, v0 + 0.12, u1, v1, 0, 40, WASH);
  iso.gable(u0, v0 + 0.12, u1, v1, 40, 16, 'v', ROOFSL, WASH);
  for (let i = 0; i < 3; i++) {
    const u = u0 + 0.1 + i * 0.16;
    iso.r.poly([iso.P(u, v1, 10), iso.P(u + 0.08, v1, 10), iso.P(u + 0.08, v1, 26), iso.P(u + 0.04, v1, 31), iso.P(u, v1, 26)], alpha(COLORS.glassDark, 0.82));
  }
  // the tall front tower with the bell-shaped baroque steeple
  const tx = u0 + 0.2, tv = v0 + 0.14;
  const TZ = 96;
  iso.box(tx - 0.1, tv - 0.1, tx + 0.1, tv + 0.1, 0, TZ, WASH);
  // the OGEE bell-steeple: a concave-then-convex curved roof + lantern + finial
  const [sx, syB] = iso.P(tx, tv, TZ);
  const steeple: Pt[] = [
    [sx - 6 * RES, syB], [sx - 4 * RES, syB - 8 * RES],
    [sx - 5 * RES, syB - 16 * RES], [sx, syB - 26 * RES],
    [sx + 5 * RES, syB - 16 * RES], [sx + 4 * RES, syB - 8 * RES],
    [sx + 6 * RES, syB],
  ];
  iso.r.poly(steeple, shaded(ROOFSL, 0.04));
  iso.r.polyline(steeple, INK_W * 0.7, INK, true);
  // lantern + gilt finial
  iso.r.rect(sx - 1.6 * RES, syB - 30 * RES, sx + 1.6 * RES, syB - 26 * RES, WASH);
  iso.r.line([sx, syB - 30 * RES], [sx, syB - 36 * RES], 1.1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// ARTSCAPE / MODERN CIVIC — a 1970s modernist Foreshore arts/civic block:
// a long horizontally-banded concrete slab with deep recessed window bands,
// a sculptural projecting fly-tower (Artscape) or podium. Serves Artscape
// Theatre, the Civic Centre Podium, Community House. `tower` adds the fly-tower.
// 2×2.
// =====================================================================
function modernCivicTile(seed: number, flyTower: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const CONC = hex('#cdc8bd');
  const u0 = 0.28, u1 = 1.72, v0 = 0.32, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the broad horizontally-banded slab
  const z = 52;
  iso.box(u0, v0, u1, v1, 0, z, CONC);
  // deep recessed window bands (alternating dark glass + concrete fascia)
  for (let i = 0; i < 4; i++) {
    const zb = 10 + i * 10;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zb + 6, 9, alpha(COLORS.glassDark, 0.8), undefined);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zb + 6, 9, alpha(COLORS.glassDark, 0.8), undefined);
  }
  // a low entrance canopy
  iso.box(u0 + 0.1, v1 - 0.02, u1 - 0.1, v1 + 0.08, 12, 16, shaded(CONC, 0.04));
  if (flyTower) {
    // the tall windowless stage fly-tower rising from the back (Artscape's mass)
    iso.box(u0 + 0.3, v0 + 0.06, u1 - 0.3, v0 + 0.5, z, z + 44, lighten(CONC, 0.03));
    iso.box(u0 + 0.28, v0 + 0.04, u1 - 0.28, v0 + 0.52, z + 44, z + 48, COLORS.steelDark, { ink: false });
  } else {
    // a flat parapet + a few rooftop plant boxes
    iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, lighten(CONC, 0.06), { ink: false });
    iso.box(u0 + 0.4, v0 + 0.3, u0 + 0.7, v0 + 0.6, z + 4, z + 14, COLORS.steelDark);
  }
  return iso.build();
}

// =====================================================================
// GRAND HOTEL / VICTORIAN BLOCK — a multi-storey Victorian/Edwardian hotel or
// civic block: a rendered body with regular windows, a corner turret or
// balconied facade and a parapet. Serves the Table Bay, the President, the
// Winchester, Southern Sun, Somerset Hospital, etc. `turret` adds a corner
// dome. 2×2.
// =====================================================================
function grandBlockTile(seed: number, body: RGBA, turret: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const z = 60;
  iso.box(u0, v0, u1, v1, 0, z, body);
  // rusticated base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(body, 0.1), { ink: false });
  // three rows of windows with white frames + little balconies
  for (let r = 0; r < 3; r++) {
    const zb = 18 + r * 13;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zb + 8, 7, alpha(COLORS.glassDark, 0.8), WASH);
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zb + 8, 7, alpha(COLORS.glassDark, 0.8), WASH);
  }
  // cornice + parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, z, z + 6, lighten(body, 0.1), { topC: top(body, 0.22) });
  if (turret) {
    // a corner turret with a small dome
    const c = domeAt(iso, u1 - 0.04, v1 - 0.04, z + 6, 0.12 * (CELL_W / 2), 1.3, ROOFSL, { bulb: true });
    iso.r.line([c.tipX, c.tipY], [c.tipX, c.tipY - 6 * RES], 1 * RES, GILT);
  }
  return iso.build();
}

// =====================================================================
// ROUND 2 — the next ~34 bespoke heroes, covering the placed names not yet
// matched: the harbour/Waterfront blocks, the Atlantic-seaboard apartment
// hotels (Sea Point / Camps Bay), the UCT + Observatory precinct, the
// Long-Street museums + theatres, libraries, the malls and Groote Schuur.
// Same Cape palette (Atlantic whitewash + honey sandstone + Bo-Kaap pop);
// each a custom silhouette + a bespoke light. (Round 1's 38 heroes above.)
// =====================================================================

/** A slim verdigris-copper flagpole + a tiny triangular burgee pennant, the
 *  yacht-club signature; returned tip for an optional glint. */
function burgee(iso: Iso, u: number, v: number, z0: number, hPx: number, col: RGBA): Pt {
  const [bx, byB] = iso.P(u, v, z0);
  const tipY = byB - hPx * RES;
  iso.r.line([bx, byB], [bx, tipY], 1 * RES, hex('#8a9a8f'));
  iso.r.poly([[bx, tipY], [bx + 7 * RES, tipY + 2 * RES], [bx, tipY + 5 * RES]], col);
  return [bx, tipY];
}

// =====================================================================
// ROYAL CAPE YACHT CLUB — the Duncan Dock clubhouse: a long low white
// waterfront pavilion with a broad veranda, a glazed upper commodore's deck
// looking over the marina, a flag mast crowned by the club burgee, and a
// foreground of moored-yacht MASTS bristling at the quay (the sailing read).
// 3×3 (waterfront, wide + low).
// =====================================================================
function yachtClubTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.55;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the marina water filling the front third (the quay the yachts lie against)
  iso.box(u0 - 0.1, v1 - 0.02, u1 + 0.1, v1 + 0.34, 0, 2, shaded(HARBOUR, 0.04), { ink: false });
  // the long white clubhouse body, set back at the rear
  const bodyZ = 30;
  iso.box(u0, v0, u1, v1 - 0.7, 0, bodyZ, WASH, { leftC: shaded(WASH_D, 0.04), rightC: lit(WASH, 0.05) });
  // a banded blue stripe (the club livery) along the parapet
  iso.r.line(iso.P(u0, v1 - 0.7, bodyZ - 3), iso.P(u1, v1 - 0.7, bodyZ - 3), 1.4 * RES, alpha(HARBOUR, 0.85));
  // a continuous veranda of windows facing the water
  iso.windowsLeft(v1 - 0.7, u0 + 0.08, u1 - 0.08, 8, bodyZ - 6, 11, alpha(COLORS.glassLit, 0.55), COLORS.steelDark);
  // the glazed upper commodore's deck (a set-back glass box on the roof)
  iso.box(u0 + 0.5, v0 + 0.2, u1 - 0.5, v0 + 0.9, bodyZ, bodyZ + 22, alpha(GLASSCT, 0.7), { ink: true });
  iso.windowsLeft(v0 + 0.9, u0 + 0.56, u1 - 0.56, bodyZ + 4, bodyZ + 18, 8, alpha(COLORS.glassLit, 0.6), COLORS.steelDark);
  iso.box(u0 + 0.48, v0 + 0.18, u1 - 0.48, v0 + 0.92, bodyZ + 22, bodyZ + 25, COLORS.steelDark, { ink: false });
  // the flag mast + club burgee on the deck
  const tip = burgee(iso, u0 + 0.6, v0 + 0.5, bodyZ + 25, 36, STRIPE_R);
  iso.glint(tip, 1.8 * RES);
  // a forest of yacht MASTS bristling along the quay (thin verticals + tiny
  // furled sails) — the unmistakable marina silhouette
  let mi = 0;
  for (let i = 0; i < 9; i++) {
    const mu = u0 + 0.2 + i * 0.26;
    const mv = v1 - 0.04;
    const [mx, myB] = iso.P(mu, mv, 2);
    const hh = (26 + ((mi * 37) % 13)) * RES;
    iso.r.line([mx, myB], [mx, myB - hh], 0.8 * RES, WASH);
    // a small hull at the waterline
    iso.r.poly([[mx - 4 * RES, myB], [mx + 4 * RES, myB], [mx + 2.5 * RES, myB + 3 * RES], [mx - 2.5 * RES, myB + 3 * RES]], i % 2 ? hex('#d8d2c4') : WASH_D);
    // a furled triangular sail/boom
    iso.r.line([mx, myB - hh * 0.62], [mx + 6 * RES, myB - hh * 0.34], 0.7 * RES, alpha(WASH, 0.7));
    mi++;
  }
  return iso.build();
}

// =====================================================================
// GROOTE SCHUUR — Cecil Rhodes's Herbert-Baker manor on the mountain slope:
// a long Cape-Dutch-REVIVAL house, whitewashed under a steep dark thatched
// roof, ranks of tall barley-twist CHIMNEYS, ornate curvilinear Cape gables
// at each end and shuttered sash windows, set in mountain gardens. The
// chimney-ranked thatched silhouette is the read. Serves The Woolsack too.
// 2×2 (wide).
// =====================================================================
function grooteSchuurTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 120 });
  void seed;
  const THATCH = hex('#8a6f47'); // dark Cape thatch
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.62;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a green garden apron
  iso.box(u0 - 0.06, v1, u1 + 0.06, v1 + 0.12, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  // the long whitewashed body
  const bodyZ = 40;
  iso.box(u0, v0 + 0.12, u1, v1, 0, bodyZ, WASH);
  // two ranks of green-shuttered sash windows
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 18, 7, alpha(COLORS.glassDark, 0.8), TEAL);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 24, 36, 7, alpha(COLORS.glassDark, 0.8), TEAL);
  // the steep dark thatched gable roof (ridge along u so the long slope shows)
  iso.gable(u0, v0 + 0.12, u1, v1, bodyZ, 30, 'u', THATCH, WASH);
  // ornate curvilinear CAPE GABLES at each end of the front
  for (const gx of [u0 + 0.16, u1 - 0.16] as const) {
    const [bx, byB] = iso.P(gx, v1, bodyZ);
    const gable: Pt[] = [
      [bx - 6 * RES, byB], [bx - 6 * RES, byB - 5 * RES], [bx - 3 * RES, byB - 10 * RES],
      [bx - 4 * RES, byB - 14 * RES], [bx, byB - 19 * RES],
      [bx + 4 * RES, byB - 14 * RES], [bx + 3 * RES, byB - 10 * RES],
      [bx + 6 * RES, byB - 5 * RES], [bx + 6 * RES, byB],
    ];
    iso.r.poly(gable, lit(WASH, 0.04));
    iso.r.polyline(gable, INK_W * 0.7, INK, true);
  }
  // the rank of tall barley-twist white CHIMNEYS along the ridge (the signature)
  for (let i = 0; i < 4; i++) {
    const cu = u0 + 0.28 + i * 0.36;
    const cv = (v0 + 0.12 + v1) / 2;
    iso.box(cu - 0.04, cv - 0.04, cu + 0.04, cv + 0.04, bodyZ + 26, bodyZ + 44, WASH, { topC: top(WASH, 0.2) });
    // a dark cap
    iso.box(cu - 0.055, cv - 0.055, cu + 0.055, cv + 0.055, bodyZ + 44, bodyZ + 47, ROOFSL, { ink: false });
  }
  return iso.build();
}

// =====================================================================
// ASTRONOMICAL OBSERVATORY — the SAAO McClean dome on the hill at
// Observatory: a low square white base block topped by a large hemispherical
// rotating DOME with the dark vertical telescope SLIT, the unmistakable
// observatory silhouette. 1×1 (wide), domed.
// =====================================================================
function observatoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const DOMEC = hex('#dfe2dc'); // pale metal observatory dome
  const u0 = 0.2, u1 = 0.8, v0 = 0.24, v1 = 0.8;
  const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.22);
  // the square white base block
  const baseZ = 34;
  iso.box(u0, v0, u1, v1, 0, baseZ, WASH);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 24, 3, alpha(COLORS.glassDark, 0.8), WASH);
  // a short drum the dome rotates on
  iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, baseZ, baseZ + 8, lighten(WASH, 0.04));
  // the big hemispherical DOME (a near-full half-sphere, tall rise)
  const dome = domeAt(iso, cx, cy, baseZ + 8, 0.26 * (CELL_W / 2), 1.05, DOMEC, { bulb: false });
  // the dark vertical telescope SLIT up the face of the dome
  const [sx, syB] = iso.P(cx, v1 - 0.06, baseZ + 8);
  iso.r.poly([
    [sx - 2.4 * RES, syB], [sx + 2.4 * RES, syB],
    [sx + 1.6 * RES, dome.tipY + 3 * RES], [sx - 1.6 * RES, dome.tipY + 3 * RES],
  ], alpha(hex('#222a38'), 0.92));
  // a hint of the telescope barrel peeking through the slit
  iso.r.line([sx, syB - 3 * RES], [sx + 4 * RES, dome.tipY + 10 * RES], 1.6 * RES, alpha(COLORS.steelDark, 0.8));
  return iso.build();
}

// =====================================================================
// LONG-STREET MUSEUM / VICTORIAN TERRACE — a tall narrow Cape-Victorian
// townhouse in the Long Street idiom: a rendered colour-block facade with
// ornate cast-iron BROEKIE-LACE balconies (the wrought-iron verandas), a
// bracketed cornice and a parapet. The lacy double-decker balcony is the
// read. Parameterised by body colour. Serves the Long-Street museums +
// guest-houses + small civic terraces. 1×1 (wide).
// =====================================================================
function longStreetTile(seed: number, body: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.24, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  const z = 52;
  iso.box(u0, v0, u1, v1, 0, z, body, { leftC: shaded(body, 0.06), rightC: lit(body, 0.05) });
  // a shop-front at the base (dark glazed)
  iso.r.poly([iso.P(u0 + 0.06, v1, 2), iso.P(u1 - 0.06, v1, 2), iso.P(u1 - 0.06, v1, 14), iso.P(u0 + 0.06, v1, 14)], alpha(COLORS.glassDark, 0.85));
  // two tiers of cast-iron BROEKIE-LACE balcony across the front
  for (const [zb, zt] of [[16, 30], [32, 46]] as const) {
    // the balcony deck slab
    iso.r.poly([iso.P(u0 + 0.02, v1 + 0.04, zb), iso.P(u1 - 0.02, v1 + 0.04, zb), iso.P(u1 - 0.02, v1 + 0.04, zb + 1.5), iso.P(u0 + 0.02, v1 + 0.04, zb + 1.5)], WASH);
    // the lacy rail (a row of fine white verticals + a top rail)
    const [lxA, ly] = iso.P(u0 + 0.06, v1 + 0.04, zb + 5);
    const [lxB] = iso.P(u1 - 0.06, v1 + 0.04, zb + 5);
    iso.r.line([lxA, ly], [lxB, ly], 0.8 * RES, WASH);
    for (let k = 0; k <= 10; k++) {
      const x = lxA + (lxB - lxA) * (k / 10);
      iso.r.line([x, ly], [x, ly + 5 * RES], 0.5 * RES, alpha(WASH, 0.85));
    }
    // the window band behind the balcony
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb + 1, zt, 3, alpha(COLORS.glassDark, 0.8), WASH);
    // a lacy frieze hanging under the upper balcony roof
    iso.r.line([lxA, ly - 1 * RES], [lxB, ly - 1 * RES], 0.5 * RES, alpha(WASH, 0.5));
  }
  // bracketed cornice + parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 5, lighten(body, 0.08), { topC: top(body, 0.24) });
  return iso.build();
}

// =====================================================================
// MODERN HOTEL SLAB — a contemporary Cape Town hotel/apartment tower: a
// rendered mid-rise slab with regular punched balcony windows, a darker glazed
// ground floor and a flat parapet with a rooftop plant box. Serves the City
// Lodge / Garden Court / Southern Sun / SunSquare / StayEasy stock. `h` height,
// `body` the render colour. 2×2.
// =====================================================================
function hotelSlabTile(seed: number, h: number, body: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: Math.max(90, h + 24) });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.42, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a darker glazed podium / ground floor
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, COLORS.steelDark, { ink: false });
  // the rendered slab body
  iso.box(u0, v0, u1, v1, 14, h, body, { leftC: shaded(body, 0.06), rightC: lit(body, 0.05) });
  // rows of punched balcony windows on both visible faces (the regular hotel
  // grid — alternating glass + a slim balcony shadow line)
  const rows = Math.max(4, Math.floor((h - 20) / 14));
  for (let r = 0; r < rows; r++) {
    const zb = 20 + r * 14;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zb + 8, 6, alpha(COLORS.glassLit, 0.5), WASH);
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zb + 8, 6, alpha(COLORS.glassLit, 0.5), WASH);
    // the balcony slab line
    iso.r.line(iso.P(u0 + 0.05, v1, zb - 1), iso.P(u1 - 0.05, v1, zb - 1), 0.5 * RES, alpha(shaded(body, 0.16), 0.6));
  }
  // cornice + parapet + a rooftop plant box
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, h, h + 5, lighten(body, 0.08), { topC: top(body, 0.22) });
  iso.box(u0 + 0.4, v0 + 0.3, u0 + 0.75, v0 + 0.65, h + 5, h + 14, COLORS.steelDark);
  return iso.build();
}

// =====================================================================
// ATLANTIC-SEABOARD APARTMENT — a Sea Point / Camps Bay seafront block: a
// crisp WHITE modernist apartment building with wraparound glass balconies
// (the curved or stepped Atlantic-facing balustrades), turquoise-glass rails
// catching the sea, and palms at the base. The white-and-glass seaside read.
// `h` height. 2×2.
// =====================================================================
function seaboardTile(seed: number, h: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: Math.max(90, h + 24) });
  void seed;
  const u0 = 0.4, u1 = 1.62, v0 = 0.44, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a sandy/garden apron with two palms
  iso.box(u0 - 0.08, v1, u1 + 0.08, v1 + 0.14, 0, 2, shaded(hex('#d8cba0'), 0.04), { ink: false });
  // the crisp white body
  iso.box(u0, v0, u1, v1, 0, h, WASH, { leftC: shaded(WASH_D, 0.05), rightC: lit(WASH, 0.05) });
  // wraparound glass balcony bands (turquoise-glass rails) every floor
  const rows = Math.max(4, Math.floor((h - 12) / 13));
  for (let r = 0; r < rows; r++) {
    const zb = 12 + r * 13;
    // the white slab edge
    iso.r.line(iso.P(u0, v1 + 0.03, zb), iso.P(u1, v1 + 0.03, zb), 1 * RES, WASH);
    // the turquoise glass balustrade sitting on it
    iso.r.poly([iso.P(u0 + 0.04, v1 + 0.03, zb), iso.P(u1 - 0.04, v1 + 0.03, zb), iso.P(u1 - 0.04, v1 + 0.03, zb + 5), iso.P(u0 + 0.04, v1 + 0.03, zb + 5)], alpha(hex('#5fc6c0'), 0.5));
    // the same on the right face
    iso.r.line(iso.P(u1 + 0.03, v0, zb), iso.P(u1 + 0.03, v1, zb), 1 * RES, WASH);
    iso.r.poly([iso.P(u1 + 0.03, v0 + 0.04, zb), iso.P(u1 + 0.03, v1 - 0.04, zb), iso.P(u1 + 0.03, v1 - 0.04, zb + 5), iso.P(u1 + 0.03, v0 + 0.04, zb + 5)], alpha(hex('#5fc6c0'), 0.4));
    // a strip of warm window behind each balcony
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb + 5, zb + 11, 5, alpha(COLORS.glassLit, 0.45), undefined);
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, h, h + 4, lighten(WASH, 0.06), { ink: false });
  // two palms flanking the front
  for (const pu of [u0 + 0.04, u1 - 0.04] as const) {
    const [px, py] = iso.P(pu, v1 + 0.08, 0);
    iso.r.line([px, py], [px, py - 15 * RES], 1.1 * RES, hex('#6f5a3a'));
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.55;
      iso.r.line([px, py - 15 * RES], [px + Math.cos(a) * 7 * RES, py - 15 * RES + Math.sin(a) * 7 * RES], 1 * RES, COLORS.treeGreen);
    }
  }
  return iso.build();
}

// =====================================================================
// MODERN LIBRARY / CIVIC PAVILION — a low 1960s-modern Cape library or
// research block: a horizontally-banded face-brick + concrete pavilion with a
// deep flat eave (brise-soleil) over a ribbon of glazing, raised on a low
// plinth. Serves Vredehoek / Jagger / Rondebosch libraries + small civic
// agencies. `brick` toggles the warm face-brick vs pale concrete. 1×1 (wide).
// =====================================================================
function libraryPavilionTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 70 });
  void seed;
  const BODY = brick ? hex('#b07a52') : hex('#cfcabe');
  const u0 = 0.14, u1 = 0.86, v0 = 0.2, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // a low plinth
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, shaded(COLORS.pavement, 0.06), { ink: false });
  // the banded body
  const z = 34;
  iso.box(u0, v0, u1, v1, 6, z, BODY);
  // a deep ribbon of glazing under a flat projecting eave
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 14, 26, 6, alpha(COLORS.glassLit, 0.5), undefined);
  // a couple of brick string-courses
  iso.r.line(iso.P(u0, v1, 12), iso.P(u1, v1, 12), 0.8 * RES, shaded(BODY, 0.18));
  iso.r.line(iso.P(u0, v1, 28), iso.P(u1, v1, 28), 0.8 * RES, shaded(BODY, 0.18));
  // the deep flat eave / brise-soleil slab oversailing the front
  iso.box(u0 - 0.05, v1 - 0.04, u1 + 0.05, v1 + 0.08, z - 4, z, lighten(BODY, 0.1), { topC: top(BODY, 0.24) });
  // a flat parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, lighten(BODY, 0.06), { ink: false });
  return iso.build();
}

// =====================================================================
// THEATRE / PERFORMING-ARTS — a Cape theatre: a low foyer block with a tall
// blank windowless STAGE/FLY-TOWER behind, a marquee canopy with warm sign
// lights over the entrance and a poster band. Serves the Baxter (its famous
// honey face-brick fly-tower) + the Magnet. `brick` = the Baxter's warm brick.
// 2×2.
// =====================================================================
function theatreTile(seed: number, brick: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const BODY = brick ? hex('#bd8a5a') : hex('#cdc8bd');
  const u0 = 0.3, u1 = 1.7, v0 = 0.34, v1 = 1.68;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the low foyer block in front
  iso.box(u0, v1 - 0.5, u1, v1, 0, 34, BODY);
  // a glazed foyer front
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 8, 26, 8, alpha(COLORS.glassLit, 0.5), COLORS.steelDark);
  // the projecting marquee CANOPY with warm sign-lights
  iso.box(u0 + 0.04, v1 - 0.02, u1 - 0.04, v1 + 0.09, 26, 30, lighten(BODY, 0.08));
  const [mx0, my] = iso.P(u0 + 0.1, v1 + 0.06, 27);
  const [mx1] = iso.P(u1 - 0.1, v1 + 0.06, 27);
  for (let k = 0; k <= 9; k++) {
    const x = mx0 + (mx1 - mx0) * (k / 9);
    iso.r.line([x, my], [x, my + 1.6 * RES], 1.4 * RES, alpha(GILT_HOT, 0.85));
  }
  // the tall blank windowless STAGE / FLY-TOWER rising behind (the read)
  const flyZ = 78;
  iso.box(u0 + 0.18, v0 + 0.06, u1 - 0.18, v0 + 0.62, 0, flyZ, BODY, { leftC: shaded(BODY, 0.08), rightC: lit(BODY, 0.04) });
  // a horizontal brick banding on the fly-tower (the Baxter's texture)
  for (let z = 16; z < flyZ - 6; z += 12) {
    iso.r.line(iso.P(u0 + 0.18, v0 + 0.62, z), iso.P(u1 - 0.18, v0 + 0.62, z), 0.5 * RES, alpha(shaded(BODY, 0.16), 0.5));
  }
  // a flat roof cap on the fly-tower
  iso.box(u0 + 0.16, v0 + 0.04, u1 - 0.16, v0 + 0.64, flyZ, flyZ + 5, COLORS.steelDark, { ink: false });
  return iso.build();
}

// =====================================================================
// SHOPPING MALL — a big low retail centre: a long sprawling pale block with a
// curved glazed entrance atrium, large blank signage parapets, a rooftop sea
// of plant + parking-deck banding, and a bright corporate fascia stripe.
// Serves Cavendish Square / Canal Walk / Century City retail. 2×2 (wide+low).
// =====================================================================
function mallTile(seed: number, accent: RGBA): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const CONC = hex('#d2cdC2');
  const u0 = 0.22, u1 = 1.78, v0 = 0.28, v1 = 1.72;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.2);
  // the long low retail mass
  const z = 38;
  iso.box(u0, v0, u1, v1, 0, z, CONC);
  // a bright corporate fascia stripe wrapping the parapet
  iso.r.poly([iso.P(u0, v1, z - 8), iso.P(u1, v1, z - 8), iso.P(u1, v1, z - 3), iso.P(u0, v1, z - 3)], accent);
  iso.r.poly([iso.P(u1, v0, z - 8), iso.P(u1, v1, z - 8), iso.P(u1, v1, z - 3), iso.P(u1, v0, z - 3)], shaded(accent, 0.1));
  // a big curved glazed entrance atrium bulging from the front-centre
  const [ax, ayB] = iso.P((u0 + u1) / 2, v1, 0);
  const [, ayT] = iso.P((u0 + u1) / 2, v1, z + 12);
  const atrium: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    atrium.push([ax - 14 * RES + t * 28 * RES, ayT + Math.sin(t * Math.PI) * -6 * RES]);
  }
  atrium.push([ax + 14 * RES, ayB], [ax - 14 * RES, ayB]);
  iso.r.poly(atrium, alpha(COLORS.glassLit, 0.55));
  iso.r.polyline(atrium, INK_W * 0.6, alpha(INK, 0.5), true);
  // mullions on the atrium glass
  for (let k = 1; k < 5; k++) {
    const x = ax - 14 * RES + (28 * RES) * (k / 5);
    iso.r.line([x, ayB], [x, ayT - 2 * RES], 0.5 * RES, alpha(COLORS.steelDark, 0.5));
  }
  // a rooftop sea of plant boxes + a parking-deck banding hint
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, lighten(CONC, 0.06), { ink: false });
  for (const [pu, pv] of [[u0 + 0.4, v0 + 0.4], [u0 + 0.9, v0 + 0.6], [u0 + 1.3, v0 + 0.35]] as const) {
    iso.box(pu, pv, pu + 0.22, pv + 0.22, z + 4, z + 11, COLORS.steelDark);
  }
  return iso.build();
}

// =====================================================================
// HARBOUR PIER-HEAD WAREHOUSE — a V&A Waterfront / Pierhead heritage block:
// a Victorian red-brick + stucco warehouse-turned-hotel with a corner clock
// turret, arched ground-floor openings (the old goods arches) and a pitched
// corrugated-iron roof — the working-harbour-restored read. Serves the
// Pierhead hotels (Harbour Bridge, Dock House, the V&A blocks). 2×2.
// =====================================================================
function pierheadTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const BRICK = hex('#b15a44'); // harbour red brick
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a strip of harbour water at the quay front
  iso.box(u0 - 0.06, v1, u1 + 0.06, v1 + 0.14, 0, 2, shaded(HARBOUR, 0.04), { ink: false });
  // the brick body
  const z = 50;
  iso.box(u0, v0, u1, v1, 0, z, BRICK, { leftC: shaded(BRICK, 0.08), rightC: lit(BRICK, 0.04) });
  // a stucco string-course banding (white pilasters / quoins)
  iso.r.line(iso.P(u0, v1, 20), iso.P(u1, v1, 20), 1 * RES, alpha(WASH, 0.7));
  iso.r.line(iso.P(u0, v1, z - 6), iso.P(u1, v1, z - 6), 1 * RES, alpha(WASH, 0.7));
  // arched ground-floor goods openings (the old harbour arches)
  for (let i = 0; i < 5; i++) {
    const u = u0 + 0.1 + i * 0.24;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 13)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.16 * t, v1, 13 + Math.sin(t * Math.PI) * 5)); }
    poly.push(iso.P(u + 0.16, v1, 13), iso.P(u + 0.16, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
  }
  // upper sash windows
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 24, 40, 7, alpha(COLORS.glassDark, 0.8), WASH);
  // the pitched corrugated-iron roof
  iso.gable(u0, v0, u1, v1, z, 14, 'u', ROOFRED, BRICK);
  // the corner CLOCK TURRET (the Pierhead landmark)
  const tx0 = u1 - 0.34, tx1 = u1 - 0.06, tv0 = v1 - 0.34, tv1 = v1 - 0.06;
  const TZ = 86;
  iso.box(tx0, tv0, tx1, tv1, 0, TZ, WASH);
  // clock face high on the turret
  const [clx, cly] = iso.P((tx0 + tx1) / 2, tv1, TZ - 12);
  iso.r.poly(circlePts(clx, cly, 3 * RES), WASH);
  iso.r.polyline(circlePts(clx, cly, 3 * RES), INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - 2 * RES], 0.8 * RES, INK);
  // a little pyramid cap + finial
  iso.hip(tx0, tv0, tx1, tv1, TZ, 12, ROOFSL);
  const [fx, fy] = iso.P((tx0 + tx1) / 2, (tv0 + tv1) / 2, TZ + 12);
  iso.r.line([fx, fy], [fx, fy - 6 * RES], 1 * RES, GILT);
  return iso.build();
}

// =====================================================================
// ROUND 3 — the WORLD-FAMOUS Cape Town landmarks still absent from the placed
// list (the enrichment wave adds their names): the CAPE TOWN STADIUM (the 2010
// World Cup bowl at Green Point), the EDWARDIAN CITY HALL on the Grand Parade,
// the V&A WATERFRONT CLOCK TOWER (the little red Victorian octagon), the SLAVE
// LODGE (one of the oldest buildings), the PARLIAMENT precinct (National
// Assembly + NCOP) and TUYNHUYS (the Presidency) in the Company's Gardens — plus
// a clutch of further notable buildings toward the ~90 target. Same Cape palette.
// =====================================================================

// =====================================================================
// CAPE TOWN STADIUM — the 2010 FIFA World Cup arena at Green Point: a huge
// circular BOWL wrapped in a translucent woven-fibreglass + glass MEMBRANE that
// glows like a paper lantern at dusk, sitting in the green Common under Signal
// Hill. The smooth luminous drum capped by a thin cable-net roof ring is the
// read — Cape Town's biggest modern silhouette. 3×3 (a monster, wide + tall).
// =====================================================================
function capeTownStadiumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const MEM = hex('#e6e9ee'); // the pale woven membrane skin
  const MEM_D = hex('#c7ccd6');
  const cx = 1.5, cy = 1.5;
  iso.shadow(cx - 1.25, cy - 0.5, cx + 1.25, cy + 1.2, 0.3, 0.22);
  // the green Common apron the bowl sits in
  iso.box(cx - 1.45, cy - 1.0, cx + 1.45, cy + 1.35, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  // the elliptical drum: build as stacked rings (an iso ellipse extruded up).
  const rx = 1.16 * (CELL_W / 2); // screen-x radius
  const ry = 1.16 * (FLOOR_H / 2); // screen-y radius (iso squash)
  const [ccx, ccyB] = iso.P(cx, cy, 0);
  const bowlZ = 92;
  const ccyT = ccyB - bowlZ * RES;
  const ringPts = (yc: number, s = 1): Pt[] => {
    const p: Pt[] = [];
    for (let i = 0; i <= 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      p.push([ccx + Math.cos(a) * rx * s, yc + Math.sin(a) * ry * s]);
    }
    return p;
  };
  // the curved outer membrane wall — front half as a tall band, faceted into
  // vertical louvre panels that catch the dusk light unevenly (the lantern read)
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI * (i / N); // front semicircle (screen-lower half)
    const a1 = Math.PI * ((i + 1) / N);
    const x0 = ccx + Math.cos(a0) * rx, x1 = ccx + Math.cos(a1) * rx;
    const yb0 = ccyB + Math.sin(a0) * ry, yb1 = ccyB + Math.sin(a1) * ry;
    const yt0 = ccyT + Math.sin(a0) * ry * 0.96, yt1 = ccyT + Math.sin(a1) * ry * 0.96;
    // alternate panel tint so the woven skin reads as faceted, brighter to the right
    const face = i / N; // 0 left → 1 right
    const base = mix(MEM_D, MEM, face);
    iso.r.poly([[x0, yt0], [x1, yt1], [x1, yb1], [x0, yb0]], i % 2 ? lit(base, 0.05) : base);
    iso.r.line([x0, yt0], [x0, yb0], 0.5 * RES, alpha(INK, 0.4));
  }
  // a glowing horizontal mid-band (the lit concourse ring seen through the skin)
  iso.r.polyline(ringPts(ccyB - bowlZ * RES * 0.5), 1.2 * RES, alpha(COLORS.glassLit, 0.5));
  // the top rim ring (the cable-net roof edge) + the dish of the inner roof
  iso.r.poly(ringPts(ccyT), top(MEM, 0.18));
  iso.r.polyline(ringPts(ccyT), INK_W, INK, true);
  // the inner roof void (the open oculus over the pitch) — a darker inset ellipse
  iso.r.poly(ringPts(ccyT + 4 * RES, 0.62), shaded(hex('#cfd4dc'), 0.1));
  iso.r.polyline(ringPts(ccyT + 4 * RES, 0.62), INK_W * 0.7, alpha(INK, 0.7), true);
  // a glint of the pitch floodlights inside the bowl
  iso.glint([ccx, ccyT + 6 * RES], 3 * RES);
  // the outer base ink ring (the bowl footprint)
  iso.r.polyline(ringPts(ccyB), INK_W * 0.85, INK, true);
  return iso.build();
}

// =====================================================================
// CAPE TOWN CITY HALL — the 1905 EDWARDIAN baroque pile on the Grand Parade,
// honey BATH-STONE: a long symmetrical facade with rusticated arcaded ground
// floor, giant order pilasters, a balustraded parapet topped by urns, and the
// signature central CLOCK TOWER (a slim campanile with a domed lantern — the
// "Cape Town Big Ben", whose carillon rang Mandela's 1990 release speech).
// 3×3 (wide, the tower towers).
// =====================================================================
function cityHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the grey cobbled Grand Parade apron in front
  iso.box(u0 - 0.08, v1, u1 + 0.08, v1 + 0.2, 0, 2, shaded(COLORS.pavement, 0.06), { ink: false });
  // the long honey-sandstone body, three storeys
  const bodyZ = 56;
  iso.box(u0, v0, u1, v1, 0, bodyZ, SAND, { leftC: shaded(SAND_D, 0.06), rightC: lit(SAND, 0.05) });
  // rusticated arcaded ground floor (a row of round-arched openings)
  for (let i = 0; i < 8; i++) {
    const u = u0 + 0.12 + i * 0.3;
    const poly: Pt[] = [iso.P(u, v1, 4), iso.P(u, v1, 14)];
    for (let j = 0; j <= 6; j++) { const t = j / 6; poly.push(iso.P(u + 0.18 * t, v1, 14 + Math.sin(t * Math.PI) * 6)); }
    poly.push(iso.P(u + 0.18, v1, 14), iso.P(u + 0.18, v1, 4));
    iso.r.poly(poly, alpha(COLORS.glassDark, 0.82));
  }
  // a string-course over the arcade, then two upper window rows w/ white frames
  iso.r.line(iso.P(u0, v1, 24), iso.P(u1, v1, 24), 1.2 * RES, lighten(SAND, 0.16));
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 28, 38, 8, alpha(COLORS.glassDark, 0.82), WASH);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 42, bodyZ - 4, 8, alpha(COLORS.glassDark, 0.82), WASH);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 28, bodyZ - 4, 7, alpha(COLORS.glassDark, 0.82), WASH);
  // the balustraded parapet with little urn finials
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyZ, bodyZ + 6, lighten(SAND, 0.12), { topC: top(SAND, 0.22) });
  for (let i = 0; i <= 7; i++) {
    const [ux, uy] = iso.P(u0 + 0.14 + i * 0.32, v1 + 0.03, bodyZ + 6);
    iso.r.rect(ux - 1.1 * RES, uy - 5 * RES, ux + 1.1 * RES, uy, lit(SAND, 0.1));
  }
  // a central pedimented frontispiece (the grand entrance bay)
  const fu0 = u0 + 0.86, fu1 = u1 - 0.86;
  colonnade(iso, v1 + 0.02, fu0, fu1, 4, 40, 4, lighten(SAND, 0.1));
  pediment(iso, v1 + 0.04, fu0, fu1, bodyZ + 6, 12, lighten(SAND, 0.14));
  // the signature CLOCK TOWER (a slim campanile rising behind the centre)
  const tcx = (u0 + u1) / 2, tcv = v0 + 0.5;
  const tw = 0.2;
  const TZ = 124;
  iso.box(tcx - tw, tcv - tw, tcx + tw, tcv + tw, bodyZ, TZ, SAND);
  // belfry string-courses
  iso.r.line(iso.P(tcx - tw, tcv + tw, bodyZ + 30), iso.P(tcx + tw, tcv + tw, bodyZ + 30), 1 * RES, lighten(SAND, 0.16));
  // the clock face high on the tower
  const [clx, cly] = iso.P(tcx, tcv + tw, TZ - 18);
  iso.r.poly(circlePts(clx, cly, 3.6 * RES), WASH);
  iso.r.polyline(circlePts(clx, cly, 3.6 * RES), INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - 2.6 * RES], 0.9 * RES, INK);
  iso.r.line([clx, cly], [clx + 1.8 * RES, cly + 0.6 * RES], 0.9 * RES, INK);
  // an open arcaded belfry stage + a small domed lantern cupola + finial
  iso.box(tcx - tw - 0.02, tcv - tw - 0.02, tcx + tw + 0.02, tcv + tw + 0.02, TZ, TZ + 6, lighten(SAND, 0.12));
  const dome = domeAt(iso, tcx, tcv, TZ + 6, 4.6 * RES, 1.25, hex('#6f7d72'), { ribs: 4 });
  iso.r.line([dome.tipX, dome.tipY], [dome.tipX, dome.tipY - 12 * RES], 1.2 * RES, GILT);
  iso.glint([dome.tipX, dome.tipY - 4 * RES], 2.2 * RES);
  return iso.build();
}

// =====================================================================
// V&A WATERFRONT CLOCK TOWER — the tiny but iconic 1882 red Victorian-Gothic
// OCTAGONAL tower at the Alfred Basin: a slender red-and-cream banded octagon in
// three diminishing stages, a clock on the upper stage, gothic windows, a steep
// pointed roof + finial, standing on the quay edge over the harbour water. The
// little red landmark of every Waterfront postcard. 1×1 (slim, tall).
// =====================================================================
function vaClockTowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 170 });
  void seed;
  const RED = hex('#b6452f'); // the tower's oxblood red
  const RED_D = hex('#984026');
  const CREAM = hex('#e8d6a8'); // the cream banding
  const cx = 0.52, cy = 0.54;
  iso.shadow(cx - 0.18, cy - 0.08, cx + 0.2, cy + 0.22, 0.3, 0.22);
  // the harbour water lapping the quay around the base
  iso.box(cx - 0.4, cy - 0.34, cx + 0.34, cy + 0.34, 0, 2, shaded(HARBOUR, 0.04), { ink: false });
  // a small stone quay plinth
  iso.box(cx - 0.18, cy - 0.16, cx + 0.18, cy + 0.16, 0, 8, GRANITE);
  // the slender OCTAGONAL tower as a faceted prism (approximate the octagon with
  // a narrow square + chamfer reads — drawn as a slim banded box with corner ink)
  const rPx = 0.13 * (CELL_W / 2);
  const [bx] = iso.P(cx, cy, 8);
  // three diminishing stages
  const stages: Array<[number, number, number]> = [
    [8, 56, 1.0],
    [56, 92, 0.86],
    [92, 116, 0.72],
  ];
  for (let s = 0; s < stages.length; s++) {
    const [z0, z1, sc] = stages[s]!;
    const r = rPx * sc;
    const [, y0] = iso.P(cx, cy, z0);
    const [, y1] = iso.P(cx, cy, z1);
    // left + right faces (the octagon reads via the two visible faces + chamfer)
    iso.r.poly([[bx - r, y0], [bx - r, y1], [bx, y1], [bx, y0]], shaded(RED, 0.05));
    iso.r.poly([[bx, y0], [bx, y1], [bx + r, y1], [bx + r, y0]], lit(RED, 0.04));
    // cream string-course bands at each stage division
    iso.r.poly([[bx - r, y1], [bx + r, y1], [bx + r * 0.92, y1 + 3 * RES], [bx - r * 0.92, y1 + 3 * RES]], CREAM);
    // a thin cream mid-band within the stage
    const ym = (y0 + y1) / 2;
    iso.r.line([bx - r, ym], [bx + r, ym], 1 * RES, alpha(CREAM, 0.8));
    iso.r.polyline([[bx - r, y0], [bx - r, y1]], INK_W * 0.6, INK);
    iso.r.polyline([[bx + r, y0], [bx + r, y1]], INK_W * 0.6, INK);
    iso.r.line([bx, y0], [bx, y1], 0.5 * RES, alpha(INK, 0.45)); // near chamfer edge
  }
  void RED_D;
  // gothic pointed windows on the lower stage (front face)
  for (const off of [-0.5, 0.5] as const) {
    const wx = bx + off * rPx * 0.7;
    const [, wy0] = iso.P(cx, cy, 20);
    const [, wy1] = iso.P(cx, cy, 42);
    iso.r.poly([[wx - 2 * RES, wy0], [wx + 2 * RES, wy0], [wx + 2 * RES, wy1], [wx, wy1 + 4 * RES], [wx - 2 * RES, wy1]], alpha(COLORS.glassLit, 0.6));
  }
  // the clock face on the upper stage
  const [, cyy] = iso.P(cx, cy, 104);
  iso.r.poly(circlePts(bx, cyy, 3.2 * RES), CREAM);
  iso.r.polyline(circlePts(bx, cyy, 3.2 * RES), INK_W * 0.6, INK, true);
  iso.r.line([bx, cyy], [bx, cyy - 2.4 * RES], 0.9 * RES, INK);
  iso.r.line([bx, cyy], [bx + 1.6 * RES, cyy], 0.9 * RES, INK);
  // the steep pointed octagonal roof + finial (the read)
  const rTop = rPx * 0.72;
  const [, ry0] = iso.P(cx, cy, 116);
  iso.r.poly([[bx - rTop, ry0], [bx + rTop, ry0], [bx, ry0 - 22 * RES]], shaded(ROOFSL, 0.04));
  iso.r.poly([[bx - rTop, ry0], [bx, ry0 - 22 * RES], [bx - rTop * 0.2, ry0 - 5 * RES]], lit(ROOFSL, 0.06));
  iso.r.polyline([[bx - rTop, ry0], [bx + rTop, ry0], [bx, ry0 - 22 * RES]], INK_W * 0.7, INK, true);
  iso.r.line([bx, ry0 - 22 * RES], [bx, ry0 - 28 * RES], 1 * RES, GILT);
  iso.glint([bx, ry0 - 26 * RES], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// SLAVE LODGE — one of Cape Town's oldest buildings (c.1679, VOC slave lodge,
// later the Old Supreme Court, now an Iziko museum): a long low TWO-STOREY
// whitewashed range at the corner of Adderley & Wale, a plain classical facade
// with a pedimented centre, sash windows + green shutters and a low hipped roof.
// Sober, broad and old — the antithesis of a tower. 2×2 (wide, low).
// =====================================================================
function slaveLodgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 80 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.42, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the long whitewashed two-storey body
  const bodyZ = 34;
  iso.box(u0, v0, u1, v1, 0, bodyZ, WASH, { leftC: shaded(WASH_D, 0.05), rightC: lit(WASH, 0.05) });
  // a plinth / dado band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, shaded(WASH_D, 0.08), { ink: false });
  // two storeys of green-shuttered sash windows on both visible faces
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 9, 16, 8, alpha(COLORS.glassDark, 0.8), TEAL);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 21, 30, 8, alpha(COLORS.glassDark, 0.8), TEAL);
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 9, 30, 6, alpha(COLORS.glassDark, 0.8), TEAL);
  // a string-course between the floors
  iso.r.line(iso.P(u0, v1, 18), iso.P(u1, v1, 18), 1 * RES, WASH_D);
  // a central pedimented entrance bay with a couple of slim columns
  const fu0 = u0 + 0.52, fu1 = u1 - 0.52;
  colonnade(iso, v1 + 0.02, fu0, fu1, 5, 22, 4, lighten(WASH, 0.06));
  pediment(iso, v1 + 0.04, fu0, fu1, bodyZ, 8, WASH);
  // a low hipped slate roof
  iso.hip(u0, v0, u1, v1, bodyZ, 11, ROOFSL);
  return iso.build();
}

// =====================================================================
// PARLIAMENT (NATIONAL ASSEMBLY) — the 1884 Cape colonial Parliament on the
// Company's Gardens: a grand symmetrical neoclassical block in cream + red
// (plastered cream over red brick), a giant Corinthian PORTICO with pediment up
// a flight of steps, flanking wings and a low central dome/lantern over the
// debating chamber. The seat of South Africa's legislature. 3×3 (wide, grand).
// =====================================================================
function parliamentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const CREAM = hex('#ecdcb8'); // plastered cream
  const CREAM_D = hex('#d3c096');
  const u0 = 0.4, u1 = 2.6, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a green garden apron (the Company's Gardens)
  iso.box(u0 - 0.08, v1, u1 + 0.08, v1 + 0.18, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  // the long cream body w/ red-brick base reveal
  const bodyZ = 52;
  iso.box(u0, v0, u1, v1, 0, bodyZ, CREAM, { leftC: shaded(CREAM_D, 0.05), rightC: lit(CREAM, 0.05) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, hex('#a85842'), { ink: false }); // brick plinth
  // upper window rows w/ white architraves
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 16, 26, 8, alpha(COLORS.glassDark, 0.82), WASH);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 30, 44, 8, alpha(COLORS.glassDark, 0.82), WASH);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 16, 44, 7, alpha(COLORS.glassDark, 0.82), WASH);
  // a cornice + balustrade
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyZ, bodyZ + 5, lighten(CREAM, 0.1), { topC: top(CREAM, 0.2) });
  // the giant central CORINTHIAN PORTICO up a flight of steps (the signature)
  const pu0 = u0 + 0.78, pu1 = u1 - 0.78;
  // the steps
  for (let s = 0; s < 4; s++) {
    iso.box(pu0 - 0.04 - s * 0.03, v1 + 0.02 + s * 0.04, pu1 + 0.04 + s * 0.03, v1 + 0.06 + s * 0.05, 0, 3 + s * 2, shaded(WASH_D, 0.04), { ink: false });
  }
  colonnade(iso, v1 + 0.04, pu0, pu1, 8, 46, 6, WASH);
  iso.box(pu0 - 0.04, v1 - 0.02, pu1 + 0.04, v1 + 0.04, 46, 52, WASH);
  pediment(iso, v1 + 0.06, pu0 - 0.04, pu1 + 0.04, 52, 14, WASH);
  // a low central dome + lantern over the chamber, set back
  const dome = domeAt(iso, (u0 + u1) / 2, v0 + 0.7, bodyZ + 5, 0.2 * (CELL_W / 2), 0.92, hex('#7a8a7e'), { ribs: 5 });
  iso.box((u0 + u1) / 2 - 0.05, v0 + 0.65, (u0 + u1) / 2 + 0.05, v0 + 0.75, 0, 0, CREAM, { ink: false });
  iso.r.line([dome.tipX, dome.tipY], [dome.tipX, dome.tipY - 10 * RES], 1.2 * RES, GILT);
  iso.glint([dome.tipX, dome.tipY - 3 * RES], 2 * RES);
  return iso.build();
}

// =====================================================================
// NATIONAL COUNCIL OF PROVINCES — the upper-house wing of the Parliament
// complex (the 1980s Senate addition): a more modern but still cream classical-
// derived block, lower and plainer than the National Assembly, a flat parapet,
// regular fenestration and a small flag-mast group on the roof. Reads as the
// quieter sibling beside Parliament. 2×2.
// =====================================================================
function ncopTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const CREAM = hex('#e6d7b6');
  const u0 = 0.36, u1 = 1.64, v0 = 0.44, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const bodyZ = 46;
  iso.box(u0, v0, u1, v1, 0, bodyZ, CREAM, { leftC: shaded(CREAM, 0.08), rightC: lit(CREAM, 0.05) });
  // a rusticated base band
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(CREAM, 0.12), { ink: false });
  // three regular window rows w/ recessed reveals
  for (let r = 0; r < 3; r++) {
    const zb = 14 + r * 11;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zb + 7, 7, alpha(COLORS.glassDark, 0.8), WASH);
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zb + 7, 7, alpha(COLORS.glassDark, 0.8), WASH);
  }
  // a flat parapet cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, bodyZ, bodyZ + 5, lighten(CREAM, 0.1), { topC: top(CREAM, 0.2) });
  // a small group of three flag-masts on the roof (Parliament precinct flags)
  for (let i = 0; i < 3; i++) {
    const [fx, fy] = iso.P(u0 + 0.5 + i * 0.3, v0 + 0.5, bodyZ + 5);
    iso.r.line([fx, fy], [fx, fy - 22 * RES], 0.9 * RES, hex('#8a9a8f'));
    iso.r.poly([[fx, fy - 22 * RES], [fx + 7 * RES, fy - 20 * RES], [fx, fy - 17 * RES]], i === 1 ? hex('#3aa64a') : (i === 0 ? STRIPE_R : GILT));
  }
  return iso.build();
}

// =====================================================================
// TUYNHUYS — the President's Cape Town office in the Company's Gardens: the
// quintessential CAPE-DUTCH-meets-Cape-Regency facade — a long low ochre-and-
// white range with a famous projecting central bay under a swan-necked baroque
// PEDIMENT, tall shuttered French windows opening onto a balcony, a slate hip
// roof and the rose-garden forecourt. Elegant, horizontal, presidential.
// 3×3 (wide, low, grand garden setting).
// =====================================================================
function tuynhuysTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 95 });
  void seed;
  const OCHRE = hex('#e3c88a'); // the Tuynhuys soft ochre
  const OCHRE_D = hex('#c9ac6c');
  const u0 = 0.42, u1 = 2.58, v0 = 0.5, v1 = 2.5;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the rose-garden forecourt (green w/ a formal path)
  iso.box(u0 - 0.1, v1, u1 + 0.1, v1 + 0.26, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  iso.box((u0 + u1) / 2 - 0.12, v1, (u0 + u1) / 2 + 0.12, v1 + 0.26, 0, 3, shaded(COLORS.pavement, 0.04), { ink: false });
  // the long low ochre body
  const bodyZ = 36;
  iso.box(u0, v0, u1, v1, 0, bodyZ, OCHRE, { leftC: shaded(OCHRE_D, 0.05), rightC: lit(OCHRE, 0.05) });
  // white quoins / cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, bodyZ, bodyZ + 4, WASH, { topC: top(WASH, 0.2) });
  // tall white-shuttered French windows across the front (two registers)
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 20, 9, alpha(COLORS.glassDark, 0.8), WASH);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 23, 33, 9, alpha(COLORS.glassDark, 0.8), WASH);
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 10, 33, 7, alpha(COLORS.glassDark, 0.8), WASH);
  // the projecting central BAY with the swan-necked baroque pediment + balcony
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.34, v1 - 0.04, cu + 0.34, v1 + 0.1, 0, bodyZ + 6, lighten(OCHRE, 0.06));
  // the balcony slab
  iso.box(cu - 0.4, v1 + 0.06, cu + 0.4, v1 + 0.12, 20, 22, WASH, { ink: false });
  // the swan-neck (broken-scroll) pediment over the centre bay
  const [bx, byB] = iso.P(cu, v1 + 0.1, bodyZ + 6);
  const ped: Pt[] = [
    [bx - 9 * RES, byB], [bx - 9 * RES, byB - 3 * RES],
    [bx - 5 * RES, byB - 9 * RES], [bx - 7 * RES, byB - 12 * RES], // left scroll curl
    [bx - 2 * RES, byB - 11 * RES], [bx, byB - 14 * RES], [bx + 2 * RES, byB - 11 * RES],
    [bx + 7 * RES, byB - 12 * RES], [bx + 5 * RES, byB - 9 * RES], // right scroll curl
    [bx + 9 * RES, byB - 3 * RES], [bx + 9 * RES, byB],
  ];
  iso.r.poly(ped, lit(WASH, 0.04));
  iso.r.polyline(ped, INK_W * 0.7, INK, true);
  // a central finial urn in the broken scroll
  iso.r.poly(circlePts(bx, byB - 11 * RES, 1.8 * RES), lit(OCHRE, 0.1));
  // the slate hip roof
  iso.hip(u0, v0, u1, v1, bodyZ + 4, 12, ROOFSL);
  return iso.build();
}

// =====================================================================
// TWO OCEANS AQUARIUM — the V&A Waterfront aquarium: a chunky low waterfront
// shed with a big curved-glass entrance front, blue maritime cladding, a wave-
// like canopy roof and harbour water at the quay. Reads as a modern public
// attraction on the water. 2×2 (wide, low).
// =====================================================================
function aquariumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const BLUE = hex('#3f7bb0'); // maritime blue cladding
  const u0 = 0.36, u1 = 1.64, v0 = 0.44, v1 = 1.58;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // harbour water lapping the quay front
  iso.box(u0 - 0.08, v1, u1 + 0.08, v1 + 0.2, 0, 2, shaded(HARBOUR, 0.04), { ink: false });
  // the low blue-clad body
  const bodyZ = 32;
  iso.box(u0, v0, u1, v1, 0, bodyZ, BLUE, { leftC: shaded(BLUE, 0.08), rightC: lit(BLUE, 0.05) });
  // a horizontal aqua-band livery
  iso.r.line(iso.P(u0, v1, 20), iso.P(u1, v1, 20), 1.6 * RES, alpha(hex('#5fc6d6'), 0.85));
  // the big curved-GLASS entrance front (a tall glazed bay)
  iso.box(u0 + 0.3, v1 - 0.04, u1 - 0.3, v1 + 0.04, 0, bodyZ + 8, alpha(COLORS.glassLit, 0.6), { ink: true });
  for (let i = 0; i < 6; i++) {
    const u = u0 + 0.34 + i * 0.16;
    iso.r.line(iso.P(u, v1 + 0.04, 4), iso.P(u, v1 + 0.04, bodyZ + 6), 0.5 * RES, alpha(COLORS.steelDark, 0.6));
  }
  // a wave-like canopy roof (a shallow curved ridge)
  const [lx, lyB] = iso.P(u0, v1, bodyZ);
  const [rx, ryB] = iso.P(u1, v1, bodyZ);
  iso.r.poly([[lx, lyB], [(lx + rx) / 2, (lyB + ryB) / 2 - 12 * RES], [rx, ryB], [rx, ryB - 4 * RES], [(lx + rx) / 2, (lyB + ryB) / 2 - 16 * RES], [lx, lyB - 4 * RES]], lit(hex('#5fa3c6'), 0.05));
  // a small marlin / fish weathervane motif on the roof crest
  const [fx, fy] = [(lx + rx) / 2, (lyB + ryB) / 2 - 16 * RES];
  iso.r.line([fx - 5 * RES, fy], [fx + 5 * RES, fy - 2 * RES], 1 * RES, GILT);
  iso.glint([fx, fy - 1 * RES], 1.8 * RES);
  return iso.build();
}

// =====================================================================
// NELSON MANDELA GATEWAY TO ROBBEN ISLAND — the museum + ferry terminal at the
// Clock Tower Precinct from which boats leave for Robben Island: a modern low
// glass-and-steel pavilion on the quay, a long glazed waterfront frontage, a
// flat oversailing roof and the jetty / gangway reaching into the harbour. A
// place of memory on the water. 2×2 (wide, low).
// =====================================================================
function mandelaGatewayTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 90 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.44, v1 = 1.5;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // a broad strip of harbour water + a jetty reaching out (the ferry departure)
  iso.box(u0 - 0.1, v1, u1 + 0.1, v1 + 0.34, 0, 2, shaded(HARBOUR, 0.05), { ink: false });
  iso.box((u0 + u1) / 2 - 0.1, v1 + 0.04, (u0 + u1) / 2 + 0.1, v1 + 0.34, 2, 5, hex('#8a7d63'), { ink: false }); // jetty deck
  // the low glass-and-steel pavilion
  const bodyZ = 30;
  iso.box(u0, v0, u1, v1, 0, bodyZ, alpha(GLASSCT, 0.72), { leftC: alpha(shaded(GLASSCT, 0.08), 0.72), rightC: alpha(lit(GLASSCT_L, 0.05), 0.72) });
  // a continuous glazed waterfront frontage (mullioned)
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 6, bodyZ - 4, 11, alpha(COLORS.glassLit, 0.6), COLORS.steelDark);
  // a steel base + a flat oversailing roof slab
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, COLORS.steelDark, { ink: false });
  iso.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, bodyZ, bodyZ + 4, COLORS.steel, { topC: top(COLORS.steel, 0.16) });
  // a tall slim entrance pylon w/ signage stripe (the gateway marker)
  iso.box(u0 + 0.06, v0 + 0.06, u0 + 0.2, v0 + 0.2, 0, bodyZ + 28, WASH);
  iso.r.line(iso.P(u0 + 0.13, v0 + 0.2, bodyZ), iso.P(u0 + 0.13, v0 + 0.2, bodyZ + 26), 3 * RES, alpha(STRIPE_R, 0.8));
  return iso.build();
}

// =====================================================================
// MOSTERT'S MILL — the 1796 Dutch-style WINDMILL on the Groote Schuur estate
// (the oldest surviving windmill in South Africa): a tapering whitewashed stone
// tower-mill with a thatched conical cap and four big lattice SAILS (the
// Cross), set on a green slope. The turning cross of sails is the unmistakable
// read. 1×1 (slim tower + broad sails).
// =====================================================================
function windmillTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 150 });
  void seed;
  const cx = 0.5, cy = 0.56;
  iso.shadow(cx - 0.2, cy - 0.1, cx + 0.2, cy + 0.2, 0.3, 0.22);
  // green slope apron
  iso.box(cx - 0.36, cy - 0.2, cx + 0.34, cy + 0.3, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  // the tapering whitewashed tower (a trapezoid: wider base, narrower top)
  const TZ = 70;
  const rB = 0.16 * (CELL_W / 2), rT = 0.1 * (CELL_W / 2);
  const [bx, byB] = iso.P(cx, cy, 0);
  const [, tyB] = iso.P(cx, cy, TZ);
  iso.r.poly([[bx - rB, byB], [bx - rT, tyB], [bx, tyB], [bx, byB]], shaded(WASH, 0.05));
  iso.r.poly([[bx, byB], [bx, tyB], [bx + rT, tyB], [bx + rB, byB]], lit(WASH, 0.04));
  iso.r.polyline([[bx - rB, byB], [bx - rT, tyB]], INK_W * 0.6, INK);
  iso.r.polyline([[bx + rB, byB], [bx + rT, tyB]], INK_W * 0.6, INK);
  // a small dark door + window
  iso.r.rect(bx - 2 * RES, byB - 10 * RES, bx + 2 * RES, byB, alpha(COLORS.glassDark, 0.8));
  // the thatched conical CAP
  iso.r.poly([[bx - rT * 1.15, tyB], [bx + rT * 1.15, tyB], [bx, tyB - 16 * RES]], hex('#9a7d52'));
  iso.r.polyline([[bx - rT * 1.15, tyB], [bx + rT * 1.15, tyB], [bx, tyB - 16 * RES]], INK_W * 0.6, INK, true);
  // the four lattice SAILS (the cross) radiating from the cap front
  const [hx, hy] = [bx, tyB - 4 * RES]; // hub
  const R = 30 * RES;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.5; // a slight tilt so it reads dynamic
    const ex = hx + Math.cos(a) * R, ey = hy + Math.sin(a) * R * 0.62;
    // the stock (arm)
    iso.r.line([hx, hy], [ex, ey], 1.4 * RES, hex('#6f5a3a'));
    // a few lattice cross-bars (the sail frame)
    for (let s = 1; s <= 3; s++) {
      const t = s / 3.4;
      const px = hx + Math.cos(a) * R * t, py = hy + Math.sin(a) * R * 0.62 * t;
      const pa = a + Math.PI / 2;
      iso.r.line([px - Math.cos(pa) * 4 * RES, py - Math.sin(pa) * 4 * RES * 0.62], [px + Math.cos(pa) * 4 * RES, py + Math.sin(pa) * 4 * RES * 0.62], 0.7 * RES, alpha(hex('#7a6442'), 0.85));
    }
  }
  iso.r.poly(circlePts(hx, hy, 2.4 * RES, 0.62), ROOFSL); // hub cap
  return iso.build();
}

// =====================================================================
// ROUND 4 — TOWARD THE 100/CITY DOCTRINE (owner, 2026-06-16). Fifteen more
// hand-built bespoke Cape Town landmarks from the unused docs/heroes/capetown/
// research, each its OWN draw fn (no reuse) + its own night-light spec. Pushes
// Cape Town 88 → 103 (bespoke, lit, placed).
// =====================================================================
const COOL_GLASS = hex('#9fc6e8'); // a cool dusk curtain-wall glass

// --- OLD TOWN HOUSE (Greenmarket Square) — the 1755 Cape ROCOCO burgher-watch
// house (the Michaelis art collection): a richly plastered honey-and-white
// double-storey with a flat balustraded roof, a central pedimented entrance bay
// breaking the parapet, and tall shuttered sash windows. The ornate plastered
// pediment-bay against the flat roofline is the read. 1×1 (wide).
// =====================================================================
function oldTownHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const u0 = 0.14, u1 = 0.86, v0 = 0.22, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  const z = 46;
  // the honey-plastered body with a rusticated base
  iso.box(u0, v0, u1, v1, 0, z, SAND, { leftC: shaded(SAND_D, 0.05), rightC: lit(SAND, 0.05) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(SAND_D, 0.04), { ink: false });
  // two storeys of white-framed shuttered sash windows
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 14, 22, 5, alpha(COLORS.glassDark, 0.8), WASH);
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 28, 38, 5, alpha(COLORS.glassDark, 0.8), WASH);
  // a flat roof with a white balustraded parapet (rows of little urn-balusters)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 3, WASH, { topC: top(WASH, 0.2) });
  const [bxA, by] = iso.P(u0, v1 + 0.02, z + 3);
  const [bxB] = iso.P(u1, v1 + 0.02, z + 3);
  for (let k = 0; k <= 12; k++) {
    const x = bxA + (bxB - bxA) * (k / 12);
    iso.r.line([x, by], [x, by - 2.4 * RES], 0.7 * RES, alpha(WASH, 0.9));
  }
  // the central ROCOCO entrance bay breaking up through the parapet — a bright
  // WHITE pilastered frontispiece capped by a scrolled segmental pediment (the
  // real Old Town House reads white-plastered against the honey body)
  const cu0 = u0 + 0.24, cu1 = u1 - 0.24;
  iso.box(cu0, v1 - 0.02, cu1, v1 + 0.07, 0, z + 8, lighten(WASH, 0.03), { leftC: WASH, rightC: lighten(WASH, 0.06) });
  // slim white pilasters framing the bay (catch the light)
  for (const pu of [cu0 + 0.03, cu1 - 0.03] as const) {
    iso.r.line(iso.P(pu, v1 + 0.07, 4), iso.P(pu, v1 + 0.07, z + 6), 1.2 * RES, lighten(WASH, 0.05));
  }
  const [px, pyB] = iso.P((cu0 + cu1) / 2, v1 + 0.07, z + 8);
  const wHalf = 6 * RES;
  // a swan-neck (broken segmental) pediment — two scrolls meeting a central vase
  const ped: Pt[] = [
    [px - wHalf, pyB], [px - wHalf, pyB - 3 * RES],
    [px - wHalf * 0.4, pyB - 7 * RES], [px - wHalf * 0.18, pyB - 5.4 * RES],
    [px, pyB - 8 * RES],
    [px + wHalf * 0.18, pyB - 5.4 * RES], [px + wHalf * 0.4, pyB - 7 * RES],
    [px + wHalf, pyB - 3 * RES], [px + wHalf, pyB],
  ];
  iso.r.poly(ped, lighten(WASH, 0.04));
  iso.r.polyline(ped, INK_W * 0.7, INK, true);
  iso.r.line([px, pyB - 8 * RES], [px, pyB - 12 * RES], 1.2 * RES, WASH); // central vase
  // a tall arched front door on the bright bay face
  const dc = (cu0 + cu1) / 2;
  iso.r.poly([iso.P(dc - 0.05, v1 + 0.07, 2), iso.P(dc + 0.05, v1 + 0.07, 2), iso.P(dc + 0.05, v1 + 0.07, 12), iso.P(dc, v1 + 0.07, 17), iso.P(dc - 0.05, v1 + 0.07, 12)], alpha(hex('#3a2d22'), 0.9));
  return iso.build();
}

// --- GARDENS SHUL (the Great Synagogue, 1905) — the Cape Town Hebrew
// Congregation in the Company's Garden: a honey-stone Baroque-revival facade
// crowned by TWIN domed octagonal TOWERS flanking a tall central arched window
// with a Star-of-David rondel above. The pair of onion-ish copper-green domes is
// the read. 2×2.
// =====================================================================
function gardensShulTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 140 });
  void seed;
  const u0 = 0.34, u1 = 1.66, v0 = 0.4, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 56;
  // the honey-stone body
  iso.box(u0, v0, u1, v1, 0, z, SAND, { leftC: shaded(SAND_D, 0.05), rightC: lit(SAND, 0.05) });
  // a great central arched window (the rose) on the front
  const cu = (u0 + u1) / 2;
  iso.r.poly([iso.P(cu - 0.18, v1, 18), iso.P(cu + 0.18, v1, 18), iso.P(cu + 0.18, v1, 40), iso.P(cu, v1, 50), iso.P(cu - 0.18, v1, 40)], alpha(GILT_HOT, 0.5));
  // a Star-of-David rondel above the arch
  const [sx, sy] = iso.P(cu, v1, 52);
  for (let k = 0; k < 2; k++) {
    const rot = k * Math.PI / 3 + Math.PI / 6;
    const tri: Pt[] = [];
    for (let t = 0; t < 3; t++) {
      const a = rot + (t / 3) * Math.PI * 2;
      tri.push([sx + Math.cos(a) * 3 * RES, sy + Math.sin(a) * 3 * RES]);
    }
    iso.r.polyline(tri, 0.7 * RES, alpha(GILT, 0.9), true);
  }
  // a parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, lighten(SAND, 0.06), { ink: false });
  // the TWIN domed octagonal towers flanking the front
  for (const tu of [u0 + 0.16, u1 - 0.16] as const) {
    const tv = v1 - 0.12;
    iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, z, z + 20, WASH, { rightC: lit(WASH, 0.05) });
    // a small arched belfry opening
    iso.r.poly([iso.P(tu - 0.05, tv + 0.12, z + 5), iso.P(tu + 0.05, tv + 0.12, z + 5), iso.P(tu + 0.05, tv + 0.12, z + 13), iso.P(tu, tv + 0.12, z + 16), iso.P(tu - 0.05, tv + 0.12, z + 13)], alpha(COLORS.glassDark, 0.7));
    const dm = domeAt(iso, tu, tv, z + 20, 7 * RES, 1.1, COPPER, { bulb: true, ribs: 5 });
    // a gilt ball-finial rising straight off the dome tip (no floating gap)
    iso.r.poly(circlePts(dm.tipX, dm.tipY - 1.5 * RES, 1.6 * RES), GILT_HOT);
    iso.r.line([dm.tipX, dm.tipY - 2.5 * RES], [dm.tipX, dm.tipY - 7 * RES], 1 * RES, GILT);
  }
  return iso.build();
}

// --- SOUTH AFRICAN JEWISH MUSEUM — a modern museum (in the Gardens Shul
// grounds): a glazed contemporary block bridging onto the old whitewashed Cape-
// Dutch Old Synagogue (1863). A low gabled white heritage wing beside a crisp
// glass-and-Jerusalem-stone modern hall with a clerestory ridge. 2×2.
// =====================================================================
function jewishMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const STONE = hex('#dac9a4'); // warm Jerusalem-stone
  const u0 = 0.32, u1 = 1.68, v0 = 0.36, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // the old whitewashed Cape-Dutch wing in front-left (low, gabled)
  iso.box(u0, v1 - 0.46, u0 + 0.62, v1, 0, 30, WASH, { rightC: lit(WASH, 0.05) });
  iso.gable(u0, v1 - 0.46, u0 + 0.62, v1, 30, 12, 'v', ROOFSL, WASH);
  iso.windowsLeft(v1, u0 + 0.05, u0 + 0.56, 8, 20, 3, alpha(COLORS.glassDark, 0.8), TEAL);
  // the modern stone-and-glass hall behind/right (taller, flat)
  const z = 52;
  iso.box(u0 + 0.5, v0, u1, v1 - 0.2, 0, z, STONE, { leftC: shaded(STONE, 0.06), rightC: lit(STONE, 0.05) });
  // a tall glazed curtain-wall slice catching the dusk
  iso.r.poly([iso.P(u1, v0 + 0.1, 10), iso.P(u1, v1 - 0.3, 10), iso.P(u1, v1 - 0.3, z - 6), iso.P(u1, v0 + 0.1, z - 6)], alpha(GLASSCT, 0.55));
  for (let k = 1; k < 6; k++) {
    iso.r.line(iso.P(u1, v0 + 0.1 + k * 0.07, 10), iso.P(u1, v0 + 0.1 + k * 0.07, z - 6), 0.5 * RES, alpha(WASH, 0.35));
  }
  iso.windowsLeft(v1 - 0.2, u0 + 0.56, u1 - 0.06, 12, z - 8, 6, alpha(COLORS.glassLit, 0.45), undefined);
  // a clerestory ridge lantern on the modern roof
  iso.box(u0 + 0.8, v0 + 0.3, u1 - 0.3, v0 + 0.55, z, z + 8, alpha(COOL_GLASS, 0.6), { ink: false });
  iso.box(u0 + 0.5, v0 - 0.02, u1 + 0.02, v1 - 0.18, z, z + 3, lighten(STONE, 0.06), { ink: false });
  return iso.build();
}

// --- MANDELA RHODES BUILDING (Herbert Baker) — a grand Edwardian Cape-Dutch-
// revival commercial block on St George's Mall: a honey-stone five-storey with a
// rusticated arcaded ground floor, regular pilastered windows, a heavy bracketed
// cornice and a big curved Baroque scrolled GABLE crowning the centre. 2×2.
// =====================================================================
function mandelaRhodesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.38, v1 = 1.64;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 76;
  iso.box(u0, v0, u1, v1, 0, z, SAND, { leftC: shaded(SAND_D, 0.05), rightC: lit(SAND, 0.05) });
  // a rusticated arcaded ground floor (a row of round arches)
  const [axA, ay] = iso.P(u0 + 0.06, v1, 16);
  const [axB] = iso.P(u1 - 0.06, v1, 16);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 16, shaded(SAND_D, 0.05), { ink: false });
  for (let k = 0; k < 6; k++) {
    const x = axA + (axB - axA) * ((k + 0.5) / 6);
    iso.r.poly([[x - 3 * RES, ay], [x - 3 * RES, ay - 6 * RES], [x, ay - 9 * RES], [x + 3 * RES, ay - 6 * RES], [x + 3 * RES, ay]], alpha(hex('#2c2218'), 0.8));
  }
  // four storeys of pilastered windows
  for (let r = 0; r < 4; r++) {
    const zb = 22 + r * 13;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zb + 8, 7, alpha(COLORS.glassDark, 0.78), WASH);
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zb + 8, 7, alpha(COLORS.glassDark, 0.78), WASH);
  }
  // heavy bracketed cornice + parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, z, z + 5, lighten(SAND, 0.08), { topC: top(SAND, 0.22) });
  // the big central scrolled Baroque GABLE (the Cape-Dutch-revival read)
  const cu = (u0 + u1) / 2;
  const [gx, gyB] = iso.P(cu, v1 + 0.03, z + 5);
  const gw = 10 * RES;
  const gable: Pt[] = [
    [gx - gw, gyB], [gx - gw, gyB - 4 * RES],
    [gx - gw * 0.5, gyB - 11 * RES], [gx - gw * 0.6, gyB - 15 * RES],
    [gx, gyB - 21 * RES],
    [gx + gw * 0.6, gyB - 15 * RES], [gx + gw * 0.5, gyB - 11 * RES],
    [gx + gw, gyB - 4 * RES], [gx + gw, gyB],
  ];
  iso.r.poly(gable, lit(SAND, 0.06));
  iso.r.polyline(gable, INK_W * 0.7, INK, true);
  iso.r.poly(circlePts(gx, gyB - 11 * RES, 2.4 * RES), alpha(COLORS.glassDark, 0.7)); // gable oculus
  return iso.build();
}

// --- CENTRAL METHODIST CHURCH (Greenmarket Square) — a tall honey-sandstone
// Gothic-Revival church wedged into the city block: a steep gabled nave with a
// huge pointed traceried window and a SLENDER corner spire/pinnacle turret. The
// city-tight verticality + the single corner spire is the read. 2×2.
// =====================================================================
function methodistChurchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 160 });
  void seed;
  const u0 = 0.36, u1 = 1.64, v0 = 0.42, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 70;
  // the tall sandstone nave
  iso.box(u0, v0, u1, v1, 0, z, SAND, { leftC: shaded(SAND_D, 0.06), rightC: lit(SAND, 0.05) });
  // a steep gable end on the front
  iso.gable(u0, v0, u1, v1, z, 30, 'v', ROOFSL, SAND);
  // a huge pointed traceried window dominating the front gable
  const cu = (u0 + u1) / 2;
  iso.r.poly([iso.P(cu - 0.28, v1, 16), iso.P(cu + 0.28, v1, 16), iso.P(cu + 0.28, v1, 52), iso.P(cu, v1, 72), iso.P(cu - 0.28, v1, 52)], alpha(GILT_HOT, 0.5));
  // stone mullions in the window
  for (const mu of [cu - 0.14, cu, cu + 0.14] as const) {
    iso.r.line(iso.P(mu, v1, 18), iso.P(mu, v1, 56), 0.7 * RES, alpha(SAND_D, 0.9));
  }
  // a band of small lancets along the aisle (right face)
  for (let k = 0; k < 4; k++) {
    const vv = v0 + 0.18 + k * 0.3;
    iso.r.poly([iso.P(u1, vv, 16), iso.P(u1, vv + 0.12, 16), iso.P(u1, vv + 0.12, 34), iso.P(u1, vv + 0.06, 40), iso.P(u1, vv, 34)], alpha(COLORS.glassDark, 0.75));
  }
  // the SLENDER corner spire/turret rising at the near corner
  const tu = u1 - 0.12, tv = v1 - 0.12;
  iso.box(tu - 0.1, tv - 0.1, tu + 0.1, tv + 0.1, 0, z + 18, SAND, { rightC: lit(SAND, 0.06) });
  const [spx, spyB] = iso.P(tu, tv, z + 18);
  // four corner pinnacles + the central octagonal spire
  for (const off of [-5, 5] as const) {
    iso.r.line([spx + off * RES, spyB], [spx + off * RES, spyB - 6 * RES], 1.1 * RES, SAND_D);
  }
  const spire: Pt[] = [[spx - 5 * RES, spyB], [spx + 5 * RES, spyB], [spx, spyB - 30 * RES]];
  iso.r.poly(spire, shaded(ROOFSL, 0.04));
  iso.r.polyline(spire, INK_W * 0.7, INK, true);
  iso.r.line([spx, spyB - 30 * RES], [spx, spyB - 35 * RES], 1 * RES, GILT); // finial
  return iso.build();
}

// --- QUEEN VICTORIA MOSQUE (Jamia Mosque, Bo-Kaap, 1850s) — the oldest, largest
// Bo-Kaap mosque on the corner of Chiappini & Castle: a bright Cape-Malay
// whitewashed double-storey with a tall slim GREEN-domed corner MINARET, a
// crescent finial, and arched fenestration. Bigger + grander than the little
// Bo-Kaap mosques. 2×2.
// =====================================================================
function queenVictoriaMosqueTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const GREEN = hex('#2e8b6a'); // Islamic green
  const u0 = 0.36, u1 = 1.64, v0 = 0.42, v1 = 1.6;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 50;
  // the bright whitewashed body
  iso.box(u0, v0, u1, v1, 0, z, WASH, { leftC: shaded(WASH_D, 0.05), rightC: lit(WASH, 0.05) });
  // a green dado band at the base + green-framed arched windows
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(GREEN, 0.04), { ink: false });
  for (let k = 0; k < 5; k++) {
    const uu = u0 + 0.1 + k * 0.27;
    iso.r.poly([iso.P(uu, v1, 14), iso.P(uu + 0.13, v1, 14), iso.P(uu + 0.13, v1, 28), iso.P(uu + 0.065, v1, 34), iso.P(uu, v1, 28)], alpha(COLORS.glassDark, 0.78));
  }
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 16, 26, 4, alpha(COLORS.glassDark, 0.75), GREEN);
  // a green parapet with little merlons
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 4, GREEN, { ink: false });
  // the tall slim corner MINARET with a green onion dome + crescent
  const tu = u1 - 0.14, tv = v1 - 0.14;
  const MZ = z + 46;
  iso.box(tu - 0.08, tv - 0.08, tu + 0.08, tv + 0.08, 0, MZ, WASH, { rightC: lit(WASH, 0.05) });
  // a ring balcony (the muezzin's gallery) near the top
  iso.box(tu - 0.11, tv - 0.11, tu + 0.11, tv + 0.11, MZ - 8, MZ - 5, GREEN, { ink: false });
  const dome = domeAt(iso, tu, tv, MZ, 5.5 * RES, 1.4, GREEN, { bulb: true });
  // the crescent finial
  iso.r.poly(circlePts(dome.tipX, dome.tipY - 5 * RES, 2.4 * RES), GILT_HOT);
  iso.r.poly(circlePts(dome.tipX + 1.2 * RES, dome.tipY - 5 * RES, 2 * RES), alpha(hex('#1b1430'), 1)); // crescent cut
  return iso.build();
}

// --- MTN SCIENCENTRE (Cape Town Science Centre, Observatory) — a fun modern
// science museum: a low industrial shed re-skinned in bright primary colour
// panels with a big tilted glazed entrance prism and rooftop solar/exhibit
// gizmos. The playful colour-block + glass prism is the read. 2×2.
// =====================================================================
function scienceCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.36, v1 = 1.66;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 38;
  // the low shed body in pale industrial grey
  iso.box(u0, v0, u1, v1, 0, z, hex('#cfcabe'));
  // bright primary colour panels banded across the front (yellow/red/blue/green)
  const panels = [BOKAAP[3]!, STRIPE_R, BOKAAP[2]!, hex('#6fbf4a')];
  for (let k = 0; k < 4; k++) {
    const uu0 = u0 + 0.06 + k * 0.34;
    iso.r.poly([iso.P(uu0, v1, 8), iso.P(uu0 + 0.3, v1, 8), iso.P(uu0 + 0.3, v1, z - 4), iso.P(uu0, v1, z - 4)], alpha(panels[k]!, 0.85));
  }
  // a big tilted glazed entrance prism projecting at the near corner
  const [gx0, gy0] = iso.P(u1 - 0.5, v1, 0);
  const [gx1] = iso.P(u1 - 0.06, v1, 0);
  const [, gyT] = iso.P(u1 - 0.5, v1, z + 12);
  iso.r.poly([[gx0, gy0], [gx1, gy0], [gx1, gy0 - 4 * RES], [gx0 + (gx1 - gx0) * 0.5, gyT]], alpha(COOL_GLASS, 0.6));
  iso.r.polyline([[gx0, gy0], [gx0 + (gx1 - gx0) * 0.5, gyT], [gx1, gy0 - 4 * RES]], INK_W * 0.7, INK);
  // a glazed clerestory ribbon on the right face
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.5, 14, 26, 5, alpha(COLORS.glassLit, 0.5), undefined);
  // parapet + rooftop exhibit gizmos (a dish + a little solar array)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 3, lighten(hex('#cfcabe'), 0.06), { ink: false });
  const [dx, dyB] = iso.P(u0 + 0.5, v0 + 0.5, z + 3);
  iso.r.line([dx, dyB], [dx, dyB - 10 * RES], 1 * RES, COLORS.steelDark);
  iso.r.poly(circlePts(dx, dyB - 11 * RES, 4 * RES, 0.5), alpha(WASH, 0.85)); // dish
  iso.box(u0 + 0.9, v0 + 0.3, u1 - 0.3, v0 + 0.5, z + 3, z + 6, alpha(GLASSCT, 0.7), { ink: false }); // solar
  return iso.build();
}

// --- BREAKWATER LODGE / UCT GSB (V&A Waterfront) — the 1859 Breakwater Prison,
// now the Graduate School of Business + a hotel: a long austere whitewashed
// three-storey range with deep tiny barred windows, low pitched roofs and a
// stubby castellated stair turret recalling its prison past. 2×2.
// =====================================================================
function breakwaterLodgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 100 });
  void seed;
  const u0 = 0.3, u1 = 1.7, v0 = 0.4, v1 = 1.62;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 50;
  // the long austere whitewashed range
  iso.box(u0, v0, u1, v1, 0, z, WASH, { leftC: shaded(WASH_D, 0.06), rightC: lit(WASH, 0.04) });
  // a grey stone plinth
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(GRANITE, 0.06), { ink: false });
  // three storeys of small deep barred windows (prison read: small + regular)
  for (let r = 0; r < 3; r++) {
    const zb = 16 + r * 12;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zb + 6, 9, alpha(COLORS.glassDark, 0.85), WASH_D);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zb + 6, 8, alpha(COLORS.glassDark, 0.85), WASH_D);
  }
  // a low pitched slate roof
  iso.gable(u0, v0, u1, v1, z, 12, 'u', ROOFSL, WASH);
  // the stubby castellated stair turret (the prison memory) at the near corner
  const tu = u1 - 0.16, tv = v1 - 0.16;
  iso.box(tu - 0.12, tv - 0.12, tu + 0.12, tv + 0.12, 0, z + 14, WASH_D, { rightC: lit(WASH_D, 0.05) });
  // crenellations on the turret top
  const [cxA, cy] = iso.P(tu - 0.12, tv + 0.12, z + 14);
  const [cxB] = iso.P(tu + 0.12, tv + 0.12, z + 14);
  for (let k = 0; k <= 4; k++) {
    const x = cxA + (cxB - cxA) * (k / 4);
    iso.r.rect(x - 1.2 * RES, cy - 3 * RES, x + 1.2 * RES, cy, GRANITE_L);
  }
  return iso.build();
}

// --- LEEUWENHOF (the Premier of the Western Cape's official residence,
// Gardens) — a grand 18th-C Cape-Dutch werf homestead on the mountain slope: a
// long whitewashed H-plan house with green shutters, a thatch hip roof and the
// signature tall ornate curved Baroque "holbol" gable + a flagpole, set in a
// vineyard/garden apron with oaks. 2×2.
// =====================================================================
function leeuwenhofTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.32, u1 = 1.68, v0 = 0.5, v1 = 1.62;
  // a green garden/vineyard apron with two oaks flanking
  iso.box(u0 - 0.08, v1 - 0.04, u1 + 0.08, v1 + 0.18, 0, 2, shaded(COLORS.grass, 0.06), { ink: false });
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  const z = 36;
  // the long low whitewashed homestead body
  iso.box(u0, v0, u1, v1, 0, z, WASH, { leftC: shaded(WASH_D, 0.05), rightC: lit(WASH, 0.05) });
  // green-shuttered sash windows + a central door
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 10, 24, 7, alpha(COLORS.glassDark, 0.8), TEAL);
  // a thatch hip roof
  iso.hip(u0, v0, u1, v1, z, 16, hex('#9a7d52'));
  // the ornate curved BAROQUE GABLE over the central entrance (the Cape read)
  const cu = (u0 + u1) / 2;
  const [gx, gyB] = iso.P(cu, v1, z);
  const gw = 8 * RES;
  const gable: Pt[] = [
    [gx - gw, gyB], [gx - gw, gyB - 5 * RES],
    [gx - gw * 0.5, gyB - 12 * RES], [gx - gw * 0.62, gyB - 17 * RES],
    [gx, gyB - 24 * RES],
    [gx + gw * 0.62, gyB - 17 * RES], [gx + gw * 0.5, gyB - 12 * RES],
    [gx + gw, gyB - 5 * RES], [gx + gw, gyB],
  ];
  iso.r.poly(gable, lit(WASH, 0.04));
  iso.r.polyline(gable, INK_W * 0.7, INK, true);
  iso.r.poly(circlePts(gx, gyB - 13 * RES, 2.2 * RES), alpha(COLORS.glassDark, 0.7)); // gable light
  // a flagpole at the gable
  iso.r.line([gx, gyB - 24 * RES], [gx, gyB - 32 * RES], 0.9 * RES, hex('#6f5a3a'));
  // two oaks flanking the front
  iso.ball(u0 + 0.04, v1 + 0.1, 0.2, 22, COLORS.treeGreen);
  iso.ball(u1 - 0.04, v1 + 0.1, 0.2, 22, COLORS.treeGreen);
  return iso.build();
}

// --- CHARLY'S BAKERY (Canterbury Street) — Cape Town's famously kitsch bakery:
// a small flat-roofed shop painted hot PINK and splashed all over with big
// POLKA-DOTS in candy colours, with a striped awning over the shopfront. The
// polka-dot pink box is unmistakable. 1×1 (wide).
// =====================================================================
function charlysBakeryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const HOTPINK = hex('#e8569a');
  const u0 = 0.16, u1 = 0.84, v0 = 0.26, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const z = 30;
  // the hot-pink box
  iso.box(u0, v0, u1, v1, 0, z, HOTPINK, { leftC: shaded(HOTPINK, 0.08), rightC: lit(HOTPINK, 0.06) });
  // big POLKA-DOTS scattered over the two visible faces (candy colours)
  const dotCols = [BOKAAP[3]!, BOKAAP[2]!, hex('#6fbf4a'), WASH, BOKAAP[1]!];
  const placeDots = (face: 'L' | 'R'): void => {
    for (let i = 0; i < 7; i++) {
      const a = (i * 0.61) % 1, b = (i * 0.37 + 0.2) % 1;
      const u = u0 + 0.08 + a * (u1 - u0 - 0.16);
      const zz = 6 + b * (z - 12);
      const [dx, dy] = face === 'L' ? iso.P(u, v1, zz) : iso.P(u1, v0 + 0.08 + a * (v1 - v0 - 0.16), zz);
      iso.r.poly(circlePts(dx, dy, 2.6 * RES), dotCols[i % dotCols.length]!);
      iso.r.polyline(circlePts(dx, dy, 2.6 * RES), 0.5 * RES, alpha(INK, 0.5), true);
    }
  };
  placeDots('L');
  placeDots('R');
  // a striped awning over the shopfront + a dark glazed shop window
  iso.r.poly([iso.P(u0 + 0.04, v1, 12), iso.P(u1 - 0.04, v1, 12), iso.P(u1 - 0.04, v1, 2), iso.P(u0 + 0.04, v1, 2)], alpha(COLORS.glassDark, 0.85));
  const [awA, awy] = iso.P(u0 + 0.02, v1 + 0.08, 14);
  const [awB] = iso.P(u1 - 0.02, v1 + 0.08, 14);
  for (let k = 0; k <= 8; k++) {
    const x = awA + (awB - awA) * (k / 8);
    iso.r.line([x, awy], [x, awy + 2.4 * RES], 1.5 * RES, k % 2 ? WASH : STRIPE_R);
  }
  // a flat parapet
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 3, lighten(HOTPINK, 0.1), { ink: false });
  return iso.build();
}

// --- ZIP ZAP ACADEMY (the circus school, Founders Garden / Foreshore) — a
// permanent big-top: a tall conical striped CIRCUS TENT (red-and-white canvas)
// with a peaked centre pole + pennant flags, ringed by a low entrance drum. The
// candy-striped tent cone is the read. 2×2.
// =====================================================================
function zipZapTentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const cu = 1.0, cv = 1.0;
  iso.shadow(cu - 0.6, cv - 0.4, cu + 0.6, cv + 0.5, 0.3, 0.2);
  // a low circular entrance drum (a ring of plain canvas)
  const drumZ = 14;
  const [drx, dry] = iso.P(cu, cv, drumZ);
  iso.r.poly(circlePts(drx, dry, 0.62 * (CELL_W / 2), 0.5), shaded(WASH, 0.05));
  // the big-top CONE — red-and-white radial canvas gores
  const baseR = 0.62 * (CELL_W / 2);
  const [bx, byB] = iso.P(cu, cv, drumZ);
  const apexZ = drumZ + 64;
  const [, apexYraw] = iso.P(cu, cv, apexZ);
  const apex: Pt = [bx, apexYraw];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const p0: Pt = [bx + Math.cos(a0) * baseR, byB + Math.sin(a0) * baseR * 0.5];
    const p1: Pt = [bx + Math.cos(a1) * baseR, byB + Math.sin(a1) * baseR * 0.5];
    // alternate red/white gores; shade the back-facing ones darker
    const stripe = i % 2 ? STRIPE_R : WASH;
    const shade = Math.sin((a0 + a1) / 2) > 0 ? lit(stripe, 0.05) : shaded(stripe, 0.08);
    iso.r.poly([p0, p1, apex], shade);
  }
  // the ink silhouette of the cone
  iso.r.polyline([apex, [bx - baseR, byB], [bx, byB + baseR * 0.5], [bx + baseR, byB], apex], INK_W * 0.7, INK);
  // a centre-pole finial + pennant flags
  iso.r.line([apex[0], apex[1]], [apex[0], apex[1] - 10 * RES], 1 * RES, COLORS.steelDark);
  for (let k = 0; k < 3; k++) {
    const fy = apex[1] - 10 * RES + k * 3 * RES;
    iso.r.poly([[apex[0], fy], [apex[0] + 7 * RES, fy + 1.5 * RES], [apex[0], fy + 3 * RES]], [STRIPE_R, BOKAAP[3]!, BOKAAP[2]!][k]!);
  }
  // a small striped entrance porch at the front
  iso.r.poly([iso.P(cu - 0.18, cv + 0.5, 0), iso.P(cu + 0.18, cv + 0.5, 0), iso.P(cu + 0.18, cv + 0.5, 16), iso.P(cu - 0.18, cv + 0.5, 16)], alpha(STRIPE_R, 0.85));
  return iso.build();
}

// --- MARTIN MELCK HOUSE (96 Strand Street) — a fine 18th-C Cape-Dutch townhouse
// beside the Lutheran Church: a whitewashed double-storey with a thatch roof, a
// tall ornate curved central gable and a teak-canopied stoep. Taller/narrower
// than the single-storey Cape-Dutch cottage. 1×1 (wide).
// =====================================================================
function martinMelckTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const u0 = 0.16, u1 = 0.84, v0 = 0.24, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  const z = 40;
  // the whitewashed double-storey body
  iso.box(u0, v0, u1, v1, 0, z, WASH, { leftC: shaded(WASH_D, 0.05), rightC: lit(WASH, 0.05) });
  // two storeys of green-shuttered sash windows
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 18, 26, 4, alpha(COLORS.glassDark, 0.8), TEAL);
  iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, 6, 14, 4, alpha(COLORS.glassDark, 0.8), TEAL);
  // a teak stoep canopy over the ground floor
  iso.r.poly([iso.P(u0 + 0.02, v1 + 0.06, 16), iso.P(u1 - 0.02, v1 + 0.06, 16), iso.P(u1 - 0.02, v1 + 0.06, 14), iso.P(u0 + 0.02, v1 + 0.06, 14)], hex('#7a5a38'));
  // a thatch hip roof
  iso.hip(u0, v0, u1, v1, z, 13, hex('#9a7d52'));
  // the tall ornate curved central GABLE
  const cu = (u0 + u1) / 2;
  const [gx, gyB] = iso.P(cu, v1, z);
  const gw = 7 * RES;
  const gable: Pt[] = [
    [gx - gw, gyB], [gx - gw, gyB - 6 * RES],
    [gx - gw * 0.45, gyB - 13 * RES], [gx - gw * 0.6, gyB - 17 * RES],
    [gx, gyB - 23 * RES],
    [gx + gw * 0.6, gyB - 17 * RES], [gx + gw * 0.45, gyB - 13 * RES],
    [gx + gw, gyB - 6 * RES], [gx + gw, gyB],
  ];
  iso.r.poly(gable, lit(WASH, 0.04));
  iso.r.polyline(gable, INK_W * 0.7, INK, true);
  iso.r.poly(circlePts(gx, gyB - 13 * RES, 2 * RES), alpha(COLORS.glassDark, 0.7));
  return iso.build();
}

// --- NATIONAL LIBRARY OF SOUTH AFRICA (Company's Garden) — the grand 1860
// neoclassical SA Public Library: a long honey-sandstone palazzo with a
// rusticated arcaded ground floor, a piano-nobile of round-arched windows, a
// heavy cornice + balustrade, and a central pedimented portico. A stately
// 3×3 civic block. 3×3.
// =====================================================================
function nationalLibraryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const u0 = 0.32, u1 = 2.68, v0 = 0.42, v1 = 2.62;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  const z = 56;
  iso.box(u0, v0, u1, v1, 0, z, SANDP, { leftC: shaded(SANDP, 0.06), rightC: lit(SANDP, 0.05) });
  // rusticated arcaded ground floor — a long row of round arches
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 16, shaded(SANDP, 0.05), { ink: false });
  const [axA, ay] = iso.P(u0 + 0.06, v1, 16);
  const [axB] = iso.P(u1 - 0.06, v1, 16);
  for (let k = 0; k < 9; k++) {
    const x = axA + (axB - axA) * ((k + 0.5) / 9);
    iso.r.poly([[x - 2.4 * RES, ay], [x - 2.4 * RES, ay - 5 * RES], [x, ay - 8 * RES], [x + 2.4 * RES, ay - 5 * RES], [x + 2.4 * RES, ay]], alpha(hex('#2c2218'), 0.8));
  }
  // a piano-nobile of round-arched windows
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 24, 40, 9, alpha(COLORS.glassDark, 0.78), WASH);
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 24, 40, 9, alpha(COLORS.glassDark, 0.78), WASH);
  // heavy cornice + a balustraded parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, z, z + 4, lighten(SANDP, 0.07), { topC: top(SANDP, 0.22) });
  const [bxA, by] = iso.P(u0, v1 + 0.03, z + 4);
  const [bxB] = iso.P(u1, v1 + 0.03, z + 4);
  for (let k = 0; k <= 20; k++) {
    const x = bxA + (bxB - bxA) * (k / 20);
    iso.r.line([x, by], [x, by - 2.4 * RES], 0.6 * RES, alpha(WASH, 0.85));
  }
  // a central raised ATTIC / clerestory storey breaks the empty roof — the
  // library's reading-room lantern crowning the palazzo
  const au0 = u0 + 0.7, au1 = u1 - 0.7, av0 = v0 + 0.7, av1 = v1 - 0.7;
  iso.box(au0, av0, au1, av1, z + 4, z + 22, SANDP, { leftC: shaded(SANDP, 0.07), rightC: lit(SANDP, 0.06) });
  // clerestory glazing round the attic
  iso.windowsLeft(av1, au0 + 0.1, au1 - 0.1, z + 8, z + 18, 7, alpha(COLORS.glassLit, 0.5), WASH);
  iso.windowsRight(au1, av0 + 0.1, av1 - 0.1, z + 8, z + 18, 7, alpha(COLORS.glassLit, 0.5), WASH);
  iso.box(au0 - 0.03, av0 - 0.03, au1 + 0.03, av1 + 0.03, z + 22, z + 26, lighten(SANDP, 0.08), { topC: top(SANDP, 0.24) });
  // a low pitched roof + a small central flag mast on the attic
  iso.hip(au0, av0, au1, av1, z + 26, 10, ROOFSL);
  const [mx, myB] = iso.P((au0 + au1) / 2, (av0 + av1) / 2, z + 36);
  iso.r.line([mx, myB], [mx, myB - 12 * RES], 0.9 * RES, hex('#6f5a3a'));
  // the GRAND central pedimented portico projecting forward, raised on a
  // stepped podium, with full-height columns + a deep pediment (the front read)
  const cu0 = u0 + 0.78, cu1 = u1 - 0.78;
  // a stepped podium / entrance stair the portico stands on
  iso.box(cu0 - 0.06, v1 - 0.02, cu1 + 0.06, v1 + 0.16, 0, 6, shaded(SANDP, 0.06));
  iso.box(cu0 - 0.02, v1 - 0.02, cu1 + 0.02, v1 + 0.12, 6, 12, lighten(SANDP, 0.04));
  // the deep portico architrave the columns carry
  iso.box(cu0 - 0.06, v1 + 0.02, cu1 + 0.06, v1 + 0.14, 48, 54, WASH, { topC: top(WASH, 0.2) });
  // full-height columns from the podium to the architrave
  colonnade(iso, v1 + 0.14, cu0, cu1, 12, 48, 6, WASH);
  // the deep crowning pediment
  pediment(iso, v1 + 0.14, cu0 - 0.04, cu1 + 0.04, 54, 16, WASH);
  return iso.build();
}

// --- PERSEVERANCE TAVERN (83 Buitenkant Street, 1808) — "The Percy", the oldest
// pub in South Africa: a small, cheerful single-storey corner tavern, rendered
// in a warm ochre with a green-painted dado, big timber-framed pub windows, a
// hanging sign bracket and a green corrugated-iron verandah roof. 1×1 (wide).
// =====================================================================
function perseveranceTavernTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 60 });
  void seed;
  const OCHRE = hex('#d99a4e');
  const PUBGREEN = hex('#2f6b4a');
  const u0 = 0.16, u1 = 0.84, v0 = 0.26, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const z = 28;
  // the warm ochre body with a green dado
  iso.box(u0, v0, u1, v1, 0, z, OCHRE, { leftC: shaded(OCHRE, 0.08), rightC: lit(OCHRE, 0.05) });
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 9, PUBGREEN, { ink: false });
  // big timber-framed pub windows (warm glow inside)
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 11, 22, 3, alpha(GILT_HOT, 0.45), hex('#5a3a22'));
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 11, 22, 3, alpha(GILT_HOT, 0.45), hex('#5a3a22'));
  // a green corrugated verandah roof over the stoep
  iso.box(u0 - 0.06, v1 - 0.02, u1 + 0.06, v1 + 0.12, 22, 25, PUBGREEN, { topC: top(PUBGREEN, 0.2) });
  // verandah posts
  for (const pu of [u0, u1] as const) {
    iso.r.line(iso.P(pu, v1 + 0.1, 0), iso.P(pu, v1 + 0.1, 22), 1 * RES, hex('#5a3a22'));
  }
  // a flat parapet + a hanging pub sign on a bracket
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z, z + 3, lighten(OCHRE, 0.08), { ink: false });
  const [hx, hy] = iso.P(u1, v1 - 0.1, 20);
  iso.r.line([hx, hy], [hx + 6 * RES, hy], 0.8 * RES, COLORS.steelDark);
  iso.r.rect(hx + 5 * RES, hy + 1 * RES, hx + 9 * RES, hy + 6 * RES, PUBGREEN);
  iso.r.polyline([[hx + 5 * RES, hy + 1 * RES], [hx + 9 * RES, hy + 1 * RES], [hx + 9 * RES, hy + 6 * RES], [hx + 5 * RES, hy + 6 * RES]], 0.6 * RES, alpha(GILT, 0.9), true);
  return iso.build();
}

// --- PALACE THEATRE (a city-block cinema/variety theatre) — a tall narrow
// Art-Deco entertainment frontage wedged into the street: a stepped Deco parapet,
// a horizontal marquee canopy with chasing bulb-lights, and a tall vertical NEON
// BLADE sign running up the facade. The lit Deco blade is the read. 1×1 (wide).
// =====================================================================
function palaceTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const DECO = hex('#c9b48a');
  const u0 = 0.18, u1 = 0.82, v0 = 0.26, v1 = 0.82;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const z = 70;
  // the tall narrow Deco frontage
  iso.box(u0, v0, u1, v1, 0, z, DECO, { leftC: shaded(DECO, 0.06), rightC: lit(DECO, 0.05) });
  // vertical Deco pilaster fluting on the front
  for (let k = 1; k < 5; k++) {
    const uu = u0 + (u1 - u0) * (k / 5);
    iso.r.line(iso.P(uu, v1, 20), iso.P(uu, v1, z - 6), 0.7 * RES, shaded(DECO, 0.14));
  }
  // a stepped Deco parapet crown
  iso.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, z, z + 5, lighten(DECO, 0.08), { ink: false });
  iso.box(u0 + 0.18, v0 + 0.18, u1 - 0.18, v1 - 0.18, z + 5, z + 9, lighten(DECO, 0.12), { ink: false });
  // the projecting horizontal marquee canopy with a row of bulb-lights
  iso.box(u0 - 0.06, v1 - 0.02, u1 + 0.06, v1 + 0.1, 20, 25, hex('#8a2f33'));
  const [mxA, my] = iso.P(u0, v1 + 0.08, 20);
  const [mxB] = iso.P(u1, v1 + 0.08, 20);
  for (let k = 0; k <= 9; k++) {
    const x = mxA + (mxB - mxA) * (k / 9);
    iso.r.line([x, my], [x, my + 1.6 * RES], 1.4 * RES, alpha(GILT_HOT, 0.9));
  }
  // a dark glazed entrance below the marquee
  iso.r.poly([iso.P(u0 + 0.06, v1, 2), iso.P(u1 - 0.06, v1, 2), iso.P(u1 - 0.06, v1, 18), iso.P(u0 + 0.06, v1, 18)], alpha(COLORS.glassDark, 0.85));
  // the tall vertical NEON BLADE sign running up the front-right corner
  const [blx, bly] = iso.P(u1, v1 - 0.06, 28);
  iso.r.rect(blx + 1 * RES, bly - 38 * RES, blx + 4 * RES, bly, hex('#7a1f3a'));
  iso.r.polyline([[blx + 1 * RES, bly - 38 * RES], [blx + 4 * RES, bly - 38 * RES], [blx + 4 * RES, bly], [blx + 1 * RES, bly]], 0.6 * RES, alpha(STRIPE_R, 0.95), true);
  for (let k = 0; k < 6; k++) {
    iso.r.poly(circlePts(blx + 2.5 * RES, bly - 4 * RES - k * 6 * RES, 1.1 * RES), alpha(GILT_HOT, 0.95));
  }
  return iso.build();
}

// =====================================================================
// THE REGISTRY — placed-name → bespoke sprite + bespoke electrification light.
// `match` is tested against Cape Town's placed `named` strings (see
// src/data/cities/capetown.ts); first match wins. `foot` MUST equal what each
// draw fn builds. Worked in notability / signature order.
// =====================================================================
export const CITY_HEROES: BespokeHero[] = [
  // ================= MARQUEE ICONS =================
  {
    city: 'capetown',
    key: 'castle-of-good-hope',
    match: /Castle of Good Hope/i,
    foot: [1, 1],
    seed: 5301,
    draw: (seed) => castleGoodHopeTile(seed),
    // floodlit ramparts + the warm bastion sentry boxes
    light: { kind: 'facadeFlood', topZ: 100, halfW: 1.2 },
  },
  {
    // Auwal — the first mosque in South Africa, the heart of the Bo-Kaap.
    city: 'capetown',
    key: 'auwal-masjid-bo-kaap',
    match: /Auwal Masjid/i,
    foot: [2, 2],
    seed: 5302,
    draw: (seed) => boKaapTile(seed, BOKAAP[2]!), // cobalt minaret
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'palm-tree-mosque-bo-kaap',
    match: /Palm Tree Mosque/i,
    foot: [2, 2],
    seed: 5303,
    draw: (seed) => boKaapTile(seed, BOKAAP[0]!), // pink minaret
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'jameah-masjid-bo-kaap',
    match: /Jameah Masjid/i,
    foot: [2, 2],
    seed: 5304,
    draw: (seed) => boKaapTile(seed, BOKAAP[1]!), // turquoise minaret
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'zeitz-mocaa',
    match: /Zeitz Museum|MOCAA/i,
    foot: [2, 2],
    seed: 5305,
    draw: (seed) => zeitzMocaaTile(seed),
    // the bulging glass crown glows at dusk (towerCrown over the silos)
    light: { kind: 'towerCrown', topZ: 162, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'green-point-lighthouse',
    match: /Green Point Lighthouse/i,
    foot: [1, 1],
    seed: 5306,
    draw: (seed) => lighthouseTile(seed),
    // the rotating light room beacon
    light: { kind: 'aerialBeacon', topZ: 148, halfW: 0.22 },
  },
  {
    city: 'capetown',
    key: 'groote-kerk',
    match: /Groote Kerk/i,
    foot: [1, 1],
    seed: 5307,
    draw: (seed) => grooteKerkTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 0.8 },
  },
  {
    city: 'capetown',
    key: 'st-georges-cathedral',
    match: /St\.?\s*George'?s? Cathedral/i,
    foot: [2, 2],
    seed: 5308,
    draw: (seed) => gothicCathedralTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 144, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'st-marys-cathedral',
    match: /St\.?\s*Mary'?s? Cathedral/i,
    foot: [2, 2],
    seed: 5309,
    draw: (seed) => gothicCathedralTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 144, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'greek-orthodox-cathedral',
    match: /Greek Orthodox Cathedral/i,
    foot: [1, 1],
    seed: 5310,
    draw: (seed) => greekOrthodoxTile(seed),
    light: { kind: 'facadeFlood', topZ: 100, halfW: 0.8 },
  },
  {
    city: 'capetown',
    key: 'rhodes-memorial',
    match: /Rhodes Memorial/i,
    foot: [2, 2],
    seed: 5311,
    draw: (seed) => rhodesMemorialTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.4 },
  },
  {
    city: 'capetown',
    key: 'greenmarket-square',
    match: /Greenmarket Square/i,
    foot: [2, 2],
    seed: 5312,
    draw: (seed) => greenmarketSquareTile(seed),
    light: { kind: 'genericGlow', topZ: 40, halfW: 1.4 },
  },

  // ================= CIVIC / CULTURAL =================
  {
    city: 'capetown',
    key: 'iziko-sa-museum',
    match: /Iziko South African Museum|South African Museum/i,
    foot: [2, 2],
    seed: 5313,
    draw: (seed) => neoclassicalTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'sa-national-gallery',
    match: /South African National Gallery/i,
    foot: [2, 2],
    seed: 5314,
    draw: (seed) => neoclassicalTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'cape-town-central-library',
    match: /Cape Town Central Library|Central Library/i,
    foot: [2, 2],
    seed: 5315,
    draw: (seed) => neoclassicalTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'western-cape-archives',
    match: /Western Cape Archives/i,
    foot: [2, 2],
    seed: 5316,
    draw: (seed) => neoclassicalTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'egyptian-building',
    match: /Egyptian Building/i,
    foot: [1, 1],
    seed: 5317,
    draw: (seed) => egyptianBuildingTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'good-hope-centre',
    match: /Good Hope Centre/i,
    foot: [2, 2],
    seed: 5318,
    draw: (seed) => goodHopeCentreTile(seed),
    light: { kind: 'stadiumFlood', topZ: 50, halfW: 1.5 },
  },
  {
    city: 'capetown',
    key: 'cape-town-station',
    match: /Cape Town Station|Cape Town railway station/i,
    foot: [2, 2],
    seed: 5319,
    draw: (seed) => capeStationTile(seed),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.4 },
  },
  {
    city: 'capetown',
    key: 'cticc',
    match: /Cape Town International Convention Centre|CTICC\b(?!\s*2)/i,
    foot: [2, 2],
    seed: 5320,
    draw: (seed) => cticcTile(seed, false),
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'cticc-2',
    match: /CTICC 2/i,
    foot: [2, 2],
    seed: 5321,
    draw: (seed) => cticcTile(seed, true),
    light: { kind: 'towerCrown', topZ: 82, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'artscape-theatre',
    match: /Artscape/i,
    foot: [2, 2],
    seed: 5322,
    draw: (seed) => modernCivicTile(seed, true),
    light: { kind: 'towerCrown', topZ: 100, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'civic-centre-podium',
    match: /Civic Centre/i,
    foot: [2, 2],
    seed: 5323,
    draw: (seed) => modernCivicTile(seed, false),
    light: { kind: 'genericGlow', topZ: 56, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'lutheran-church-strand',
    match: /Lutheran Church/i,
    foot: [1, 1],
    seed: 5324,
    draw: (seed) => lutheranChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 0.7 },
  },
  {
    // the old Methodist church now the District Six Museum
    city: 'capetown',
    key: 'district-six-museum',
    match: /District Six Museum/i,
    foot: [1, 1],
    seed: 5325,
    draw: (seed) => lutheranChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 0.7 },
  },

  // ================= CAPE DUTCH HERITAGE HOUSES =================
  {
    city: 'capetown',
    key: 'koopmans-de-wet-house',
    match: /Koopmans-?de Wet House/i,
    foot: [1, 1],
    seed: 5326,
    draw: (seed) => capeDutchHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'rust-en-vreugd',
    match: /Rust en Vreugd/i,
    foot: [1, 1],
    seed: 5327,
    draw: (seed) => capeDutchHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'genadendal-residence',
    match: /Genadendal Residence/i,
    foot: [1, 1],
    seed: 5328,
    draw: (seed) => capeDutchHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.9 },
  },

  // ================= FORESHORE CBD TOWERS =================
  {
    city: 'capetown',
    key: 'portside-tower',
    match: /Portside/i,
    foot: [1, 1],
    seed: 5329,
    draw: (seed) => foreshoreTowerTile(seed, 188, true, GLASSCT),
    light: { kind: 'towerCrown', topZ: 200, halfW: 0.5 },
  },
  {
    city: 'capetown',
    key: 'absa-centre',
    match: /ABSA Centre/i,
    foot: [1, 1],
    seed: 5330,
    draw: (seed) => foreshoreTowerTile(seed, 150, false, GLASSCT_L),
    light: { kind: 'towerCrown', topZ: 152, halfW: 0.5 },
  },
  {
    city: 'capetown',
    key: '1-thibault-square',
    match: /Thibault Square/i,
    foot: [1, 1],
    seed: 5331,
    draw: (seed) => foreshoreTowerTile(seed, 150, true, GLASSCT),
    light: { kind: 'towerCrown', topZ: 162, halfW: 0.5 },
  },
  {
    city: 'capetown',
    key: 'southern-sun-cullinan',
    match: /Southern Sun The Cullinan|The Cullinan/i,
    foot: [1, 1],
    seed: 5332,
    draw: (seed) => foreshoreTowerTile(seed, 120, false, hex('#c98a6a')),
    light: { kind: 'towerCrown', topZ: 122, halfW: 0.5 },
  },
  {
    city: 'capetown',
    key: 'golden-acre',
    match: /Golden Acre/i,
    foot: [1, 1],
    seed: 5333,
    draw: (seed) => foreshoreTowerTile(seed, 110, false, GLASSCT_L),
    light: { kind: 'towerCrown', topZ: 112, halfW: 0.5 },
  },

  // ================= GRAND HOTELS / VICTORIAN BLOCKS =================
  {
    city: 'capetown',
    key: 'mount-nelson-hotel',
    match: /Mount Nelson/i,
    foot: [2, 2],
    seed: 5334,
    draw: (seed) => mountNelsonTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.4 },
  },
  {
    city: 'capetown',
    key: 'table-bay-hotel',
    match: /Table Bay Hotel/i,
    foot: [2, 2],
    seed: 5335,
    draw: (seed) => grandBlockTile(seed, hex('#d8c39a'), true),
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'president-hotel',
    match: /The President Hotel/i,
    foot: [2, 2],
    seed: 5336,
    draw: (seed) => grandBlockTile(seed, WASH, false),
    light: { kind: 'facadeFlood', topZ: 66, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'winchester-mansions',
    match: /Winchester Mansions/i,
    foot: [2, 2],
    seed: 5337,
    draw: (seed) => grandBlockTile(seed, WASH, true),
    light: { kind: 'facadeFlood', topZ: 72, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'somerset-hospital',
    match: /Somerset Hospital/i,
    foot: [2, 2],
    seed: 5338,
    draw: (seed) => grandBlockTile(seed, hex('#e0d4b8'), false),
    light: { kind: 'facadeFlood', topZ: 66, halfW: 1.3 },
  },

  // ================= ROUND 2 — HARBOUR / WATERFRONT =================
  {
    city: 'capetown',
    key: 'royal-cape-yacht-club',
    match: /Royal Cape Yacht Club/i,
    foot: [3, 3],
    seed: 5339,
    draw: (seed) => yachtClubTile(seed),
    // floodlit pavilion + the lit commodore's deck over the dark marina
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.6 },
  },
  {
    // the V&A Pierhead heritage block, now the Harbour Bridge hotel
    city: 'capetown',
    key: 'harbour-bridge-hotel',
    match: /Harbour Bridge Hotel/i,
    foot: [2, 2],
    seed: 5340,
    draw: (seed) => pierheadTile(seed),
    // floodlit brick + a warm clock-turret glow
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.3 },
  },
  {
    // Dock House, Portswood Ridge — the other restored harbour block
    city: 'capetown',
    key: 'dock-house',
    match: /Dock House/i,
    foot: [2, 2],
    seed: 5341,
    draw: (seed) => pierheadTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.3 },
  },
  {
    // City Lodge V&A Waterfront — a Waterfront hotel slab
    city: 'capetown',
    key: 'city-lodge-waterfront',
    match: /City Lodge Hotel Victoria and Alfred|City Lodge/i,
    foot: [2, 2],
    seed: 5342,
    draw: (seed) => hotelSlabTile(seed, 92, hex('#d8c9a6')),
    light: { kind: 'towerCrown', topZ: 94, halfW: 1.2 },
  },

  // ================= ATLANTIC SEABOARD (Sea Point / Camps Bay) =================
  {
    city: 'capetown',
    key: 'the-bay-hotel',
    match: /The Bay Hotel/i,
    foot: [2, 2],
    seed: 5343,
    draw: (seed) => seaboardTile(seed, 92),
    // cool turquoise-glass balcony glow over the Atlantic
    light: { kind: 'towerCrown', topZ: 94, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'pod-camps-bay',
    match: /POD Camps Bay/i,
    foot: [2, 2],
    seed: 5344,
    draw: (seed) => seaboardTile(seed, 78),
    light: { kind: 'towerCrown', topZ: 80, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'camps-bay-retreat',
    match: /Camps Bay Retreat/i,
    foot: [2, 2],
    seed: 5345,
    draw: (seed) => seaboardTile(seed, 70),
    light: { kind: 'towerCrown', topZ: 72, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'hotel-on-the-promenade',
    match: /Hotel on the Promenade/i,
    foot: [2, 2],
    seed: 5346,
    draw: (seed) => seaboardTile(seed, 100),
    light: { kind: 'towerCrown', topZ: 102, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'blackheath-lodge',
    match: /Blackheath Lodge/i,
    foot: [1, 1],
    seed: 5347,
    draw: (seed) => longStreetTile(seed, WASH),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'brenwin-guest-house',
    match: /Brenwin Guest House/i,
    foot: [1, 1],
    seed: 5348,
    draw: (seed) => longStreetTile(seed, hex('#e8b53f')),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'green-elephant-guesthouse',
    match: /Green Elephant/i,
    foot: [1, 1],
    seed: 5349,
    draw: (seed) => longStreetTile(seed, TEAL),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },

  // ================= MORE HOTELS (City Bowl / Gardens / Foreshore) =================
  {
    city: 'capetown',
    key: 'garden-court-mandela-blvd',
    match: /Garden Court Nelson Mandela/i,
    foot: [2, 2],
    seed: 5350,
    draw: (seed) => hotelSlabTile(seed, 120, hex('#cdb88f')),
    light: { kind: 'towerCrown', topZ: 122, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'southern-sun-newlands',
    match: /Southern Sun Newlands/i,
    foot: [2, 2],
    seed: 5351,
    draw: (seed) => hotelSlabTile(seed, 84, hex('#c98a6a')),
    light: { kind: 'towerCrown', topZ: 86, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'sunsquare-gardens',
    match: /SunSquare Cape Town Gardens/i,
    foot: [2, 2],
    seed: 5352,
    draw: (seed) => hotelSlabTile(seed, 104, hex('#e0d4b8')),
    light: { kind: 'towerCrown', topZ: 106, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'stayeasy-city-bowl',
    match: /StayEasy Cape Town City Bowl/i,
    foot: [2, 2],
    seed: 5353,
    draw: (seed) => hotelSlabTile(seed, 88, hex('#d8c9a6')),
    light: { kind: 'towerCrown', topZ: 90, halfW: 1.2 },
  },
  {
    city: 'capetown',
    key: 'lady-hamilton-hotel',
    match: /Lady Hamilton/i,
    foot: [2, 2],
    seed: 5354,
    draw: (seed) => hotelSlabTile(seed, 80, WASH),
    light: { kind: 'towerCrown', topZ: 82, halfW: 1.2 },
  },

  // ================= UCT / OBSERVATORY PRECINCT =================
  {
    city: 'capetown',
    key: 'groote-schuur',
    match: /Groote Schuur(?! Zoo)/i,
    foot: [2, 2],
    seed: 5355,
    draw: (seed) => grooteSchuurTile(seed),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.3 },
  },
  {
    // The Woolsack — Rhodes's nearby Cape-Dutch-revival cottage on the estate
    city: 'capetown',
    key: 'the-woolsack',
    match: /The Woolsack/i,
    foot: [2, 2],
    seed: 5356,
    draw: (seed) => grooteSchuurTile(seed),
    light: { kind: 'facadeFlood', topZ: 86, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'sa-astronomical-observatory',
    match: /Astronomical Observatory/i,
    foot: [1, 1],
    seed: 5357,
    draw: (seed) => observatoryTile(seed),
    // the dome's open slit glows + a faint sky beacon (an observatory at night)
    light: { kind: 'aerialBeacon', topZ: 86, halfW: 0.5 },
  },
  {
    city: 'capetown',
    key: 'michaelis-school-of-fine-art',
    match: /Michaelis School of Fine Art/i,
    foot: [1, 1],
    seed: 5358,
    draw: (seed) => longStreetTile(seed, SANDP),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'baxter-theatre',
    match: /Baxter Theatre/i,
    foot: [2, 2],
    seed: 5359,
    draw: (seed) => theatreTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'magnet-theatre',
    match: /Magnet Theatre/i,
    foot: [2, 2],
    seed: 5360,
    draw: (seed) => theatreTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 84, halfW: 1.3 },
  },

  // ================= LIBRARIES =================
  {
    city: 'capetown',
    key: 'jagger-library',
    match: /Jagger Library/i,
    foot: [1, 1],
    seed: 5361,
    draw: (seed) => libraryPavilionTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'rondebosch-public-library',
    match: /Rondebosch Public Library/i,
    foot: [1, 1],
    seed: 5362,
    draw: (seed) => libraryPavilionTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'vredehoek-library',
    match: /Vredehoek Library/i,
    foot: [1, 1],
    seed: 5363,
    draw: (seed) => libraryPavilionTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 0.9 },
  },

  // ================= MUSEUMS (Long-Street terraces + waterfront) =================
  {
    city: 'capetown',
    key: 'irma-stern-museum',
    match: /Irma Stern Museum/i,
    foot: [1, 1],
    seed: 5364,
    draw: (seed) => longStreetTile(seed, hex('#cdbfa0')),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'heart-of-cape-town-museum',
    match: /Heart of Cape Town Museum/i,
    foot: [1, 1],
    seed: 5365,
    draw: (seed) => longStreetTile(seed, WASH_D),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'cape-medical-museum',
    match: /Cape Medical Museum/i,
    foot: [1, 1],
    seed: 5366,
    draw: (seed) => longStreetTile(seed, hex('#e0d4b8')),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },
  {
    city: 'capetown',
    key: 'chavonnes-battery-museum',
    match: /Chavonnes Battery/i,
    foot: [2, 2],
    seed: 5367,
    draw: (seed) => pierheadTile(seed),
    light: { kind: 'facadeFlood', topZ: 90, halfW: 1.3 },
  },
  {
    city: 'capetown',
    key: 'waterworks-museum',
    match: /Waterworks Museum/i,
    foot: [1, 1],
    seed: 5368,
    draw: (seed) => libraryPavilionTile(seed, true),
    light: { kind: 'facadeFlood', topZ: 40, halfW: 0.9 },
  },

  // ================= MALLS (retail centres) =================
  {
    city: 'capetown',
    key: 'cavendish-square',
    match: /Cavendish Square/i,
    foot: [2, 2],
    seed: 5369,
    draw: (seed) => mallTile(seed, hex('#4f86d6')),
    light: { kind: 'genericGlow', topZ: 42, halfW: 1.4 },
  },
  {
    city: 'capetown',
    key: 'canal-walk',
    match: /Canal Walk/i,
    foot: [2, 2],
    seed: 5370,
    draw: (seed) => mallTile(seed, hex('#e8694a')),
    light: { kind: 'genericGlow', topZ: 42, halfW: 1.4 },
  },
  {
    city: 'capetown',
    key: 'stayeasy-century-city',
    match: /StayEasy Century City/i,
    foot: [2, 2],
    seed: 5371,
    draw: (seed) => hotelSlabTile(seed, 96, hex('#d8c9a6')),
    light: { kind: 'towerCrown', topZ: 98, halfW: 1.2 },
  },

  // ================= CIVIC / OTHER =================
  {
    city: 'capetown',
    key: 'community-house-salt-river',
    match: /Community House/i,
    foot: [1, 1],
    seed: 5372,
    draw: (seed) => longStreetTile(seed, hex('#b15a44')),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },

  // ================= ROUND 3 — WORLD-FAMOUS ICONS (enrichment) =================
  {
    // the 2010 World Cup arena at Green Point — Cape Town's biggest silhouette.
    city: 'capetown',
    key: 'cape-town-stadium',
    match: /Cape Town Stadium|Green Point Stadium|DHL Stadium/i,
    foot: [3, 3],
    seed: 5373,
    draw: (seed) => capeTownStadiumTile(seed),
    // the woven membrane glows like a lantern; the bowl rim floodlit
    light: { kind: 'stadiumFlood', topZ: 96, halfW: 1.7 },
  },
  {
    // the Edwardian Grand Parade city hall + its carillon clock tower.
    city: 'capetown',
    key: 'cape-town-city-hall',
    match: /Cape Town City Hall|City Hall/i,
    foot: [3, 3],
    seed: 5374,
    draw: (seed) => cityHallTile(seed),
    // floodlit honey-stone facade + the lit clock-tower lantern
    light: { kind: 'facadeFlood', topZ: 138, halfW: 1.5 },
  },
  {
    // the little red Victorian octagon — every Waterfront postcard.
    city: 'capetown',
    key: 'va-clock-tower',
    match: /Clock Tower/i,
    foot: [1, 1],
    seed: 5375,
    draw: (seed) => vaClockTowerTile(seed),
    // the lit clock + a warm lantern glow on the red tower
    light: { kind: 'facadeFlood', topZ: 138, halfW: 0.4 },
  },
  {
    // one of Cape Town's oldest buildings (VOC slave lodge → Old Supreme Court).
    city: 'capetown',
    key: 'slave-lodge',
    match: /Slave Lodge/i,
    foot: [2, 2],
    seed: 5376,
    draw: (seed) => slaveLodgeTile(seed),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 1.3 },
  },
  {
    // Parliament — the National Assembly, seat of SA's legislature.
    city: 'capetown',
    key: 'national-assembly',
    match: /National Assembly|Houses of Parliament|Parliament of South Africa/i,
    foot: [3, 3],
    seed: 5377,
    draw: (seed) => parliamentTile(seed),
    light: { kind: 'facadeFlood', topZ: 78, halfW: 1.5 },
  },
  {
    // the upper house wing beside Parliament.
    city: 'capetown',
    key: 'national-council-of-provinces',
    match: /National Council of Provinces|NCOP/i,
    foot: [2, 2],
    seed: 5378,
    draw: (seed) => ncopTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.3 },
  },
  {
    // Tuynhuys — the President's Cape Town office, the Cape-Dutch facade.
    city: 'capetown',
    key: 'tuynhuys',
    match: /Tuynhuys|Tuinhuys/i,
    foot: [3, 3],
    seed: 5379,
    draw: (seed) => tuynhuysTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.5 },
  },

  // ================= ROUND 3 — FURTHER NOTABLE BUILDINGS (toward ~90) =================
  {
    // the V&A Waterfront aquarium where the two oceans meet.
    city: 'capetown',
    key: 'two-oceans-aquarium',
    match: /Two Oceans Aquarium/i,
    foot: [2, 2],
    seed: 5380,
    draw: (seed) => aquariumTile(seed),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 1.3 },
  },
  {
    // the ferry terminal + museum for Robben Island.
    city: 'capetown',
    key: 'mandela-gateway-robben-island',
    match: /Nelson Mandela Gateway|Robben Island/i,
    foot: [2, 2],
    seed: 5381,
    draw: (seed) => mandelaGatewayTile(seed),
    light: { kind: 'facadeFlood', topZ: 58, halfW: 1.3 },
  },
  {
    // Mostert's Mill — the 1796 Dutch windmill, oldest in South Africa.
    city: 'capetown',
    key: 'mosterts-mill',
    match: /Mostert'?s Mill/i,
    foot: [1, 1],
    seed: 5382,
    draw: (seed) => windmillTile(seed),
    // a warm glow on the whitewashed tower (a lit heritage monument)
    light: { kind: 'genericGlow', topZ: 70, halfW: 0.6 },
  },
  {
    // the Foreshore Media24/Naspers tower (93 m), part of the CBD skyline.
    city: 'capetown',
    key: 'naspers-centre',
    match: /Naspers|Media24/i,
    foot: [1, 1],
    seed: 5383,
    draw: (seed) => foreshoreTowerTile(seed, 150, true, GLASSCT),
    light: { kind: 'towerCrown', topZ: 150, halfW: 0.9 },
  },
  {
    // Southern Sun Cape Sun — a 105 m City Bowl hotel tower.
    city: 'capetown',
    key: 'southern-sun-cape-sun',
    match: /Cape Sun/i,
    foot: [1, 1],
    seed: 5384,
    draw: (seed) => foreshoreTowerTile(seed, 134, true, hex('#cdb88f')),
    light: { kind: 'towerCrown', topZ: 134, halfW: 0.9 },
  },
  {
    // Centre for the Book — the domed Edwardian building by the Gardens.
    city: 'capetown',
    key: 'centre-for-the-book',
    match: /Centre for the Book/i,
    foot: [2, 2],
    seed: 5385,
    draw: (seed) => neoclassicalTile(seed, false),
    light: { kind: 'facadeFlood', topZ: 52, halfW: 1.3 },
  },
  {
    // the Western Cape High Court (the old Supreme Court range).
    city: 'capetown',
    key: 'western-cape-high-court',
    match: /Western Cape Division|High Court/i,
    foot: [2, 2],
    seed: 5386,
    draw: (seed) => grandBlockTile(seed, SANDP, false),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.3 },
  },
  {
    // Desmond & Leah Tutu House — the 1812 Old Granary, Cape heritage.
    city: 'capetown',
    key: 'desmond-leah-tutu-house',
    match: /Desmond and Leah Tutu House|Old Granary/i,
    foot: [1, 1],
    seed: 5387,
    draw: (seed) => capeDutchHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 44, halfW: 0.9 },
  },
  {
    // SA Heritage Resources Agency — a heritage Harrington-Street townhouse.
    city: 'capetown',
    key: 'sahra-harrington-house',
    match: /South African Heritage Resources/i,
    foot: [1, 1],
    seed: 5388,
    draw: (seed) => longStreetTile(seed, SAND),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 0.9 },
  },

  // ================= ROUND 4 — TOWARD 100 (bespoke draws + lights) =================
  {
    // Old Town House — the 1755 Cape Rococo burgher house on Greenmarket Sq
    // (the Michaelis art collection).
    city: 'capetown',
    key: 'old-town-house',
    match: /Old Town House/i,
    foot: [1, 1],
    seed: 5389,
    draw: (seed) => oldTownHouseTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.9 },
  },
  {
    // Gardens Shul — the Great Synagogue (Cape Town Hebrew Congregation), 1905.
    city: 'capetown',
    key: 'gardens-shul',
    match: /Gardens Shul|Hebrew Congregation|Great Synagogue/i,
    foot: [2, 2],
    seed: 5390,
    draw: (seed) => gardensShulTile(seed),
    // the twin copper domes glow as lit lanterns
    light: { kind: 'facadeFlood', topZ: 120, halfW: 1.3 },
  },
  {
    // South African Jewish Museum — the modern glass+stone hall on the Old
    // Synagogue (in the Gardens Shul grounds).
    city: 'capetown',
    key: 'sa-jewish-museum',
    match: /Jewish Museum/i,
    foot: [2, 2],
    seed: 5391,
    draw: (seed) => jewishMuseumTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.3 },
  },
  {
    // Mandela Rhodes Building — Herbert Baker's Cape-Dutch-revival commercial
    // block on St George's Mall.
    city: 'capetown',
    key: 'mandela-rhodes-building',
    match: /Mandela Rhodes/i,
    foot: [2, 2],
    seed: 5392,
    draw: (seed) => mandelaRhodesTile(seed),
    light: { kind: 'towerCrown', topZ: 110, halfW: 1.3 },
  },
  {
    // Central Methodist Church — the Gothic-Revival mission church on
    // Greenmarket Square (slender corner spire).
    city: 'capetown',
    key: 'central-methodist-church',
    match: /Central Methodist|Metropolitan Methodist/i,
    foot: [2, 2],
    seed: 5393,
    draw: (seed) => methodistChurchTile(seed),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.3 },
  },
  {
    // Queen Victoria Mosque (Jamia Mosque) — the oldest/largest Bo-Kaap mosque.
    city: 'capetown',
    key: 'queen-victoria-mosque',
    match: /Queen Victoria Mosque|Jamia Mosque/i,
    foot: [2, 2],
    seed: 5394,
    draw: (seed) => queenVictoriaMosqueTile(seed),
    // the lit green minaret dome
    light: { kind: 'facadeFlood', topZ: 142, halfW: 1.2 },
  },
  {
    // Cape Town Science Centre (MTN Sciencentre) — the colourful Observatory
    // science museum.
    city: 'capetown',
    key: 'cape-town-science-centre',
    match: /Science Cent(re|er)|Sciencentre/i,
    foot: [2, 2],
    seed: 5395,
    draw: (seed) => scienceCentreTile(seed),
    light: { kind: 'genericGlow', topZ: 50, halfW: 1.4 },
  },
  {
    // Breakwater Lodge / UCT Graduate School of Business — the 1859 Breakwater
    // Prison on the Waterfront.
    city: 'capetown',
    key: 'breakwater-lodge',
    match: /Breakwater Lodge|Graduate School of Business/i,
    foot: [2, 2],
    seed: 5396,
    draw: (seed) => breakwaterLodgeTile(seed),
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.4 },
  },
  {
    // Leeuwenhof — the Premier of the Western Cape's official Cape-Dutch
    // residence in the Gardens.
    city: 'capetown',
    key: 'leeuwenhof',
    match: /Leeuwenhof/i,
    foot: [2, 2],
    seed: 5397,
    draw: (seed) => leeuwenhofTile(seed),
    light: { kind: 'facadeFlood', topZ: 56, halfW: 1.4 },
  },
  {
    // Charly's Bakery — the famous hot-pink polka-dot bakery on Canterbury St.
    city: 'capetown',
    key: 'charlys-bakery',
    match: /Charly'?s Bakery/i,
    foot: [1, 1],
    seed: 5398,
    draw: (seed) => charlysBakeryTile(seed),
    light: { kind: 'genericGlow', topZ: 40, halfW: 0.9 },
  },
  {
    // Zip Zap Academy — the circus-school big-top tent.
    city: 'capetown',
    key: 'zip-zap-academy',
    match: /Zip ?Zap/i,
    foot: [2, 2],
    seed: 5399,
    draw: (seed) => zipZapTentTile(seed),
    // a festoon ring + lit canvas (a stadium-style bowl flood reads as the tent)
    light: { kind: 'stadiumFlood', topZ: 90, halfW: 1.4 },
  },
  {
    // Martin Melck House — the 18th-C Cape-Dutch townhouse on Strand Street.
    city: 'capetown',
    key: 'martin-melck-house',
    match: /Martin Melck/i,
    foot: [1, 1],
    seed: 5400,
    draw: (seed) => martinMelckTile(seed),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.9 },
  },
  {
    // National Library of South Africa — the grand 1860 neoclassical library in
    // the Company's Garden.
    city: 'capetown',
    key: 'national-library-sa',
    match: /National Library/i,
    foot: [3, 3],
    seed: 5401,
    draw: (seed) => nationalLibraryTile(seed),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 1.6 },
  },
  {
    // Perseverance Tavern — "The Percy", the oldest pub in South Africa.
    city: 'capetown',
    key: 'perseverance-tavern',
    match: /Perseverance Tavern/i,
    foot: [1, 1],
    seed: 5402,
    draw: (seed) => perseveranceTavernTile(seed),
    light: { kind: 'genericGlow', topZ: 36, halfW: 0.9 },
  },
  {
    // Palace Theatre — an Art-Deco city-block cinema/variety theatre.
    city: 'capetown',
    key: 'palace-theatre',
    match: /Palace Theatre/i,
    foot: [1, 1],
    seed: 5403,
    draw: (seed) => palaceTheatreTile(seed),
    // the lit Deco blade sign + marquee
    light: { kind: 'towerCrown', topZ: 100, halfW: 0.6 },
  },
];
