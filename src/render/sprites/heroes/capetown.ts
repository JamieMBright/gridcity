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
];
