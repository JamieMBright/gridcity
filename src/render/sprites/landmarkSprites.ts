// London's icons, in the sharp-line low-poly style: the skyscraper
// districts and the named landmarks the map places along the river.
// Like everything else they're pure code — ink contours over colour
// blocks, lit by the same lofi sunset.

import { Rng } from '../../sim/rng';
import { CELL_W, INK, INK_W, Iso, lit, P, RES, shaded, top } from './iso';
import { COLORS } from './palette';
import { alpha, darken, hex, lighten, mix, type Pt, type RGBA } from './raster';

const STONE = hex('#d9cdb4');
const STONE_DARK = hex('#b3a78e');
const BRICK = hex('#a8543c');
/** Warm Bath-stone gold — the Palace of Westminster. */
const BATH = hex('#e3cf9d');
/** Pale Portland stone — St Paul's, Tower Bridge. */
const PORTLAND = hex('#e0d9c6');
/** Lead-grey roofs, cupolas and turret caps. */
const LEAD = hex('#5d6b80');

// --- Skyscrapers (CBD districts) -------------------------------------------

/** Glass towers for the City/Canary clusters: three silhouettes — flat-top
 *  slab, slanted crown, and a stepped spire-top. */
export function skyscraperTile(seed: number, kind: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 77191 + kind * 17 + 5);
  const u0 = 0.2;
  const v0 = 0.2;
  const u1 = 0.8;
  const v1 = 0.8;
  // kept under ~170 incl. crowns so the landmark towers (the glass shard
  // above all) clearly out-scale the ordinary CBD fabric
  const H = 96 + kind * 14 + (seed % 2) * 8;
  iso.shadow(u0, v0, u1, v1, 0.4, 0.3);
  // glass body: dusk face + sunset face
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, 0), P(u0, v1, 0)], COLORS.glassDark, shaded(COLORS.glassSky, 0.2));
  iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1, v1, 0), P(u1, v0, 0)], COLORS.glassSunset, COLORS.glassSky);
  iso.quad(u0, v0, u1, v1, H, COLORS.white);
  // mullion bands
  for (let z = 12; z < H - 6; z += 12) {
    iso.r.poly([P(u0, v1, z + 1.4), P(u1, v1, z + 1.4), P(u1, v1, z), P(u0, v1, z)], alpha(COLORS.white, 0.8));
    iso.r.poly([P(u1, v0, z + 1.4), P(u1, v1, z + 1.4), P(u1, v1, z), P(u1, v0, z)], alpha(COLORS.white, 0.65));
  }
  // lit offices scattered up the dusk face
  for (let z = 14; z < H - 12; z += 12) {
    if (rng.chance(0.45)) {
      const a = rng.range(u0 + 0.04, 0.55);
      iso.r.poly([P(a, v1, z + 8), P(a + 0.18, v1, z + 8), P(a + 0.18, v1, z + 2), P(a, v1, z + 2)], alpha(COLORS.glassLit, 0.85));
    }
  }
  // ink silhouette
  iso.edge(P(u0, v1, H), P(u0, v1, 0));
  iso.edge(P(u1, v1, H), P(u1, v1, 0));
  iso.edge(P(u1, v0, H), P(u1, v0, 0));
  iso.r.polyline([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H), P(u0, v1, H)], INK_W, INK, true);

  if (kind === 0) {
    // flat top: plant screen + twin masts
    iso.box(0.34, 0.34, 0.66, 0.66, H, H + 10, COLORS.steel);
    iso.r.line(P(0.42, 0.42, H + 10), P(0.42, 0.42, H + 26), 1.2 * RES, COLORS.steelDark);
    iso.quad(0.4, 0.4, 0.44, 0.44, H + 26, COLORS.orange);
  } else if (kind === 1) {
    // slanted crown
    iso.r.poly([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H + 18), P(u0, v1, H + 18)], COLORS.glassSky);
    iso.r.polyline([P(u0, v0, H), P(u1, v0, H), P(u1, v1, H + 18), P(u0, v1, H + 18)], INK_W, INK, true);
  } else {
    // stepped spire
    iso.box(0.3, 0.3, 0.7, 0.7, H, H + 12, COLORS.white);
    iso.box(0.4, 0.4, 0.6, 0.6, H + 12, H + 24, COLORS.white);
    iso.r.line(P(0.5, 0.5, H + 24), P(0.5, 0.5, H + 42), 1.4 * RES, COLORS.steelDark);
  }
  return iso.build();
}

// --- Riverside icons ---------------------------------------------------------

/** The Palace of Westminster, redrawn to read unmistakably as the Houses
 *  of Parliament from across the river: ONE continuous perpendicular-gothic
 *  river quadrangle in honey Bath-stone under a crested, pinnacled parapet,
 *  with the three towers in their TRUE height order — VICTORIA TOWER the
 *  tallest and most massive at the SW end (98.5 m), BIG BEN's Elizabeth
 *  Tower slightly shorter and slimmer at the NE end by the bridge (96.3 m:
 *  gilt-ringed clock faces over a belfry under the tall framed spire), and
 *  the slender octagonal CENTRAL spire between them (91.4 m). SW-anchored on
 *  a 3x5 canvas (the chooser emits it on the reservation's (min x, max y)
 *  tile); the long river face fronts SE toward the water and the wheel. */
export function parliamentTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 5, { swAnchor: true });
  void seed;
  const ROOFDK = hex('#3d444b'); // dark slate palace roofs (read near-black at dusk)
  const IRON = hex('#3b4750'); // dark iron cresting, flagstaff, spire frame
  const GILT = hex('#c8a24a'); // gilded clock rings, finials
  const DIAL = hex('#f2ead4'); // off-white clock dial
  const BLUE = hex('#1f3a5f'); // the Prussian-blue clock surround (2017 restoration)
  const WARM = hex('#ffce86'); // the floodlit ground-arcade window glow
  const RIB = shaded(BATH, 0.3); // stone buttress ribs / mullions

  // A slim crocketed stone pinnacle standing at (u,v) from zBase, h tall.
  const pinnacle = (u: number, v: number, zBase: number, h: number, r = 1.1): void => {
    const b = iso.P(u, v, zBase + h * 0.45);
    const t = iso.P(u, v, zBase + h);
    iso.r.line(iso.P(u, v, zBase), b, r * RES, lit(BATH, 0.04));
    iso.r.poly([[b[0] - r * 1.4, b[1]], [b[0] + r * 1.4, b[1]], [t[0], t[1]]], lit(BATH, 0.14));
    iso.r.polyline([[b[0] - r * 1.4, b[1]], [t[0], t[1]], [b[0] + r * 1.4, b[1]]], INK_W * 0.4, alpha(INK, 0.6));
  };
  // A small intermediate pavilion turret with a pyramidal slate cap, like
  // the lesser towers (St Stephen's, the Speaker's) studding the roofline.
  const pavilion = (u: number, v: number, w: number, zBot: number, bodyTop: number): void => {
    iso.box(u - w, v - w, u + w, v + w, zBot, bodyTop, BATH);
    const apex = iso.P(u, v, bodyTop + 12);
    const c0 = iso.P(u - w, v + w, bodyTop);
    const c1 = iso.P(u + w, v + w, bodyTop);
    const c2 = iso.P(u + w, v - w, bodyTop);
    iso.r.poly([c0, c1, apex], shaded(ROOFDK, 0.08));
    iso.r.poly([c1, c2, apex], lit(ROOFDK, 0.06));
    iso.r.polyline([c0, apex, c2], INK_W * 0.45, INK);
    iso.r.line(apex, [apex[0], apex[1] - 4 * RES], 0.9 * RES, GILT);
  };
  // Pointed-arch Gothic lancets — the Perpendicular tracery that makes the
  // façade read as carved Victorian Gothic rather than a plain modern wall.
  const lancetR = (u: number, a: number, b: number, zb: number, zt: number, glass: RGBA): void => {
    const ah = (zt - zb) * 0.34;
    const m = (a + b) / 2;
    iso.r.poly([iso.P(u, a, zb), iso.P(u, b, zb), iso.P(u, b, zt - ah), iso.P(u, m, zt), iso.P(u, a, zt - ah)], glass);
    iso.r.line(iso.P(u, m, zb), iso.P(u, m, zt - ah * 0.5), 0.5 * RES, alpha(RIB, 0.7)); // central mullion
  };
  const lancetL = (v: number, a: number, b: number, zb: number, zt: number, glass: RGBA): void => {
    const ah = (zt - zb) * 0.34;
    const m = (a + b) / 2;
    iso.r.poly([iso.P(a, v, zb), iso.P(b, v, zb), iso.P(b, v, zt - ah), iso.P(m, v, zt), iso.P(a, v, zt - ah)], glass);
    iso.r.line(iso.P(m, v, zb), iso.P(m, v, zt - ah * 0.5), 0.5 * RES, alpha(RIB, 0.7));
  };
  // a row of `cols` lancets across a face span
  const rowR = (u: number, vA: number, vB: number, zb: number, zt: number, cols: number, glass: RGBA): void => {
    const dv = (vB - vA) / cols;
    for (let i = 0; i < cols; i++) lancetR(u, vA + dv * i + dv * 0.24, vA + dv * (i + 1) - dv * 0.24, zb, zt, glass);
  };
  const rowL = (v: number, uA: number, uB: number, zb: number, zt: number, cols: number, glass: RGBA): void => {
    const du = (uB - uA) / cols;
    for (let i = 0; i < cols; i++) lancetL(v, uA + du * i + du * 0.24, uA + du * (i + 1) - du * 0.24, zb, zt, glass);
  };

  // The palace reads from the river as a LONG, LOW horizontal range — many
  // storeys of fine regular windows over a floodlit ground arcade, a spiky
  // pinnacled parapet, and the three great towers soaring far above it.
  const ru0 = 1.44;
  const ru1 = 2.54;
  const rv0 = 0.6;
  const rv1 = 4.66;
  const EAVE = 36; // a grander 4-storey river front (tower:façade ≈ 4:1)
  iso.shadow(0.3, 0.58, 2.6, 4.7, 0.26, 0.22);

  // inland (back) range — lower, glimpsed as dark roofs poking up behind
  iso.box(0.32, 0.9, 1.5, 4.32, 0, 28, BATH);
  iso.gable(0.32, 0.9, 1.5, 4.32, 28, 5, 'v', ROOFDK, BATH);

  // CENTRAL TOWER — a slender octagonal lantern that tapers to a sharp
  // needle high over the middle of the range (91.4 m). Drawn before the
  // front range so the range occludes its foot.
  {
    const cu = 1.56;
    const cv = 2.46;
    const cw = 0.125;
    iso.box(cu - cw, cv - cw, cu + cw, cv + cw, 28, 60, BATH);
    iso.windowsRight(cu + cw, cv - cw + 0.02, cv + cw - 0.02, 40, 56, 2, alpha(COLORS.glassDark, 0.9), lighten(BATH, 0.14));
    iso.hip(cu - cw - 0.01, cv - cw - 0.01, cu + cw + 0.01, cv + cw + 0.01, 60, 3, ROOFDK);
    const apex = iso.P(cu, cv, 132);
    const bL = iso.P(cu - cw, cv + cw, 63);
    const bN = iso.P(cu + cw, cv + cw, 63);
    const bR = iso.P(cu + cw, cv - cw, 63);
    iso.r.poly([bL, bN, apex], shaded(ROOFDK, 0.1)); // left spire face
    iso.r.poly([bN, bR, apex], lit(ROOFDK, 0.05)); // right spire face
    iso.r.polyline([bL, apex, bR], INK_W * 0.5, INK);
    iso.r.line(bN, apex, INK_W * 0.4, alpha(INK, 0.5));
    iso.r.line(apex, [apex[0], apex[1] - 7 * RES], 1.1 * RES, GILT);
  }
  // two intermediate pavilion turrets along the ridge
  pavilion(2.18, 1.92, 0.07, EAVE, 50);
  pavilion(2.18, 3.46, 0.07, EAVE, 50);

  // front river range — the long show frontage
  iso.box(ru0, rv0, ru1, rv1, 0, EAVE, BATH);
  iso.gable(ru0, rv0, ru1, rv1, EAVE, 6, 'v', ROOFDK, BATH);
  // delicate iron ridge cresting along the roof ridge (breaks the plain slope)
  {
    const um = (ru0 + ru1) / 2;
    iso.r.line(iso.P(um, rv0, EAVE + 6), iso.P(um, rv1, EAVE + 6), 0.8 * RES, IRON);
    for (let v = rv0 + 0.18; v < rv1; v += 0.2) {
      const p = iso.P(um, v, EAVE + 6);
      iso.r.line(p, [p[0], p[1] - 3 * RES], 0.7 * RES, IRON);
    }
  }

  // the river (right) face: a fine regular grid of windows in storey bands,
  // the ground floor a continuous floodlit gold arcade, between slim ribs
  {
    const bays = 22;
    const va = rv0 + 0.16;
    const vb = rv1 - 0.16;
    const dv = (vb - va) / bays;
    const storeys: Array<[number, number, RGBA]> = [
      [4, 14, alpha(WARM, 0.95)], // floodlit ground arcade — tall pointed lights
      [16, 22, alpha(COLORS.glassDark, 0.92)],
      [24, 29, alpha(COLORS.glassDark, 0.92)],
      [31, 35, alpha(COLORS.glassDark, 0.92)], // attic storey
    ];
    for (let i = 0; i < bays; i++) {
      const a = va + dv * i + dv * 0.24;
      const b = va + dv * (i + 1) - dv * 0.24;
      for (const [zb, zt, c] of storeys) lancetR(ru1, a, b, zb, zt, c);
    }
    for (let i = 0; i <= bays; i++) {
      iso.r.line(iso.P(ru1, va + dv * i, 3), iso.P(ru1, va + dv * i, EAVE), 0.7 * RES, RIB);
    }
    for (const z of [15, 23, 30, EAVE]) iso.r.line(iso.P(ru1, rv0, z), iso.P(ru1, rv1, z), 0.7 * RES, shaded(BATH, 0.22));

    // a low parapet over the eave, then a dense run of stone pinnacles +
    // the occasional taller pinnacle and a pointed gablet — the spiky skyline
    iso.box(ru1 - 0.05, rv0, ru1, rv1, EAVE, EAVE + 4, lit(BATH, 0.05));
    iso.r.polyline([iso.P(ru1, rv0, EAVE + 4), iso.P(ru1, rv1, EAVE + 4)], INK_W * 0.55, alpha(INK, 0.7));
    for (let i = 0; i <= bays; i++) {
      const v = va + dv * i;
      const tall = i % 4 === 0;
      pinnacle(ru1 - 0.012, v, EAVE + 4, tall ? 9 : 5, tall ? 1.25 : 0.9);
      if (i % 5 === 2) {
        const ga = iso.P(ru1, v - dv * 0.55, EAVE + 4);
        const gb = iso.P(ru1, v + dv * 0.55, EAVE + 4);
        const gt = iso.P(ru1, v, EAVE + 11);
        iso.r.poly([ga, gb, gt], lit(BATH, 0.08));
        iso.r.polyline([ga, gt, gb], INK_W * 0.4, alpha(INK, 0.55));
      }
    }
  }
  // the SW (left) gable end gets a great pointed perpendicular window
  {
    const wv = rv1 + 0.004;
    const wm = (ru0 + ru1) / 2;
    iso.r.poly(
      [iso.P(wm - 0.34, wv, 6), iso.P(wm + 0.34, wv, 6), iso.P(wm + 0.34, wv, 26), iso.P(wm, wv, 36), iso.P(wm - 0.34, wv, 26)],
      alpha(COLORS.glassDark, 0.95),
    );
    iso.r.polyline(
      [iso.P(wm - 0.34, wv, 6), iso.P(wm - 0.34, wv, 26), iso.P(wm, wv, 36), iso.P(wm + 0.34, wv, 26), iso.P(wm + 0.34, wv, 6)],
      INK_W * 0.45,
      lighten(BATH, 0.2),
      true,
    );
  }

  // --- VICTORIA TOWER — the SW end: the tallest, most MASSIVE element, a
  //     broad square tower with corner pinnacle turrets, an openwork crested
  //     crown and the tall iron flagstaff flying the colours (98.5 m) --------
  {
    const vu = 0.92;
    const vv = 4.06;
    const vw = 0.4; // bulky — distinctly wider than Big Ben
    iso.shadow(vu - vw, vv - vw, vu + vw, vv + vw, 0.22, 0.22);
    iso.box(vu - vw, vv - vw, vu + vw, vv + vw, 0, 118, BATH);
    // three tiers of tall POINTED perpendicular windows, three bays per face
    for (const [zb, zt] of [[14, 44], [52, 82], [90, 114]] as const) {
      rowL(vv + vw, vu - vw + 0.07, vu + vw - 0.07, zb, zt, 3, alpha(COLORS.glassDark, 0.9));
      rowR(vu + vw, vv - vw + 0.07, vv + vw - 0.07, zb, zt, 3, alpha(COLORS.glassDark, 0.9));
    }
    // buttress ribs dividing the three bays on each visible face (+ corners)
    for (let k = 0; k <= 3; k++) {
      const u = vu - vw + (2 * vw * k) / 3;
      const v = vv - vw + (2 * vw * k) / 3;
      iso.r.line(iso.P(u, vv + vw, 0), iso.P(u, vv + vw, 120), 1.2 * RES, RIB);
      iso.r.line(iso.P(vu + vw, v, 0), iso.P(vu + vw, v, 120), 1.2 * RES, RIB);
    }
    // corbelled crown band + four SLENDER corner turrets with tall crocketed
    // spirelets, and a pierced merlon parapet between them
    iso.box(vu - vw - 0.025, vv - vw - 0.025, vu + vw + 0.025, vv + vw + 0.025, 118, 126, lit(BATH, 0.04));
    for (const [du, dv] of [[-vw, -vw], [vw, -vw], [-vw, vw], [vw, vw]] as const) {
      iso.box(vu + du - 0.05, vv + dv - 0.05, vu + du + 0.05, vv + dv + 0.05, 126, 146, BATH);
      pinnacle(vu + du, vv + dv, 146, 22, 1.7); // tall crocketed spirelet
    }
    for (let k = 0; k < 5; k++) {
      const u = vu - vw + 0.07 + ((2 * vw - 0.14) * k) / 4;
      const v = vv - vw + 0.07 + ((2 * vw - 0.14) * k) / 4;
      iso.box(u - 0.025, vv + vw - 0.018, u + 0.025, vv + vw, 126, 133, lit(BATH, 0.03));
      iso.box(vu + vw - 0.018, v - 0.025, vu + vw, v + 0.025, 126, 133, lit(BATH, 0.03));
    }
    // the tall thin iron flagstaff + pennant rising from the centre
    const f = iso.P(vu, vv, 132);
    iso.r.line(f, [f[0], f[1] - 48 * RES], 1.2 * RES, IRON);
    iso.r.poly([[f[0], f[1] - 48 * RES], [f[0] + 12 * RES, f[1] - 46 * RES], [f[0] + 12 * RES, f[1] - 40 * RES], [f[0], f[1] - 42 * RES]], COLORS.orange);
  }

  // --- ELIZABETH TOWER (BIG BEN) — the NE end by the bridge: slimmer and a
  //     touch shorter, the four gilt-ringed clock faces set HIGH up the
  //     shaft, a louvred belfry, then the steep ornate spire and gilt finial
  //     (96.3 m) ---------------------------------------------------------------
  {
    const bu = 2.43;
    const bv = 1.34;
    const bw = 0.19; // slender — distinctly thinner than Victoria
    iso.shadow(bu - bw, bv - bw, bu + bw, bv + bw, 0.16, 0.2);
    iso.box(bu - bw, bv - bw, bu + bw, bv + bw, 0, 80, lighten(BATH, 0.04));
    for (const [du, dv] of [[-bw, bw], [bw, bw], [bw, -bw]] as const) {
      iso.r.line(iso.P(bu + du, bv + dv, 0), iso.P(bu + du, bv + dv, 82), 1.2 * RES, RIB);
    }
    // small pointed shaft windows up the long plain shaft (two visible faces)
    for (const z of [24, 50] as const) {
      lancetL(bv + bw, bu - bw + 0.05, bu + bw - 0.05, z, z + 14, alpha(COLORS.glassDark, 0.85));
      lancetR(bu + bw, bv - bw + 0.05, bv + bw - 0.05, z, z + 14, alpha(COLORS.glassDark, 0.85));
    }
    // clock stage, slightly proud — dials at ~58% of the tower height (the
    // real dials sit ~55 m up the 96 m tower), NOT jammed near the top
    const cw = bw + 0.03;
    iso.box(bu - cw, bv - cw, bu + cw, bv + cw, 80, 104, BATH);
    for (const side of ['l', 'r'] as const) {
      const f: Pt = side === 'l' ? iso.P(bu, bv + cw + 0.004, 92) : iso.P(bu + cw + 0.004, bv, 92);
      const r = 7.4 * RES;
      const ring: Pt[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ring.push([f[0] + Math.cos(a) * r, f[1] + Math.sin(a) * r * 0.92]);
      }
      const surround = ring.map(([x, y]): Pt => [f[0] + (x - f[0]) * 1.22, f[1] + (y - f[1]) * 1.22]);
      iso.r.poly(surround, BLUE); // Prussian-blue framed surround
      iso.r.polyline(surround, INK_W * 0.45, INK, true);
      iso.r.poly(ring, DIAL);
      iso.r.polyline(ring, 1.4 * RES, GILT, true); // gilt ring
      iso.r.polyline(ring, INK_W * 0.45, INK, true);
      iso.r.line(f, [f[0] + r * 0.5, f[1] - r * 0.26], 1.2 * RES, INK); // minute hand
      iso.r.line(f, [f[0] - r * 0.18, f[1] - r * 0.56], 1.2 * RES, INK); // hour hand
    }
    // louvred belfry above the clocks, with small corner pinnacles
    iso.box(bu - bw, bv - bw, bu + bw, bv + bw, 104, 120, BATH);
    for (let z = 106; z <= 118; z += 2.2) {
      iso.r.line(iso.P(bu, bv + bw + 0.002, z), iso.P(bu + bw, bv + bw + 0.002, z), 0.8 * RES, shaded(BATH, 0.45));
      iso.r.line(iso.P(bu + bw + 0.002, bv, z), iso.P(bu + bw + 0.002, bv + bw, z), 0.8 * RES, shaded(BATH, 0.3));
    }
    for (const [du, dv] of [[-bw, -bw], [bw, -bw], [-bw, bw], [bw, bw]] as const) pinnacle(bu + du, bv + dv, 120, 6, 0.9);
    // the steep ornate spire + gilt finial (the Ayrton light)
    iso.box(bu - bw - 0.012, bv - bw - 0.012, bu + bw + 0.012, bv + bw + 0.012, 120, 125, IRON);
    const apex = iso.P(bu, bv, 152);
    const bL = iso.P(bu - bw, bv + bw, 125);
    const bN = iso.P(bu + bw, bv + bw, 125);
    const bR = iso.P(bu + bw, bv - bw, 125);
    iso.r.poly([bL, bN, apex], shaded(IRON, 0.08)); // left spire face
    iso.r.poly([bN, bR, apex], lit(IRON, 0.06)); // right spire face
    iso.r.polyline([bL, apex, bR], INK_W * 0.55, INK);
    iso.r.line(bN, apex, INK_W * 0.45, alpha(INK, 0.6));
    iso.r.line(apex, [apex[0], apex[1] - 8 * RES], 1.4 * RES, GILT); // gilt finial
    iso.r.poly([[apex[0] - 2 * RES, apex[1] - 8 * RES], [apex[0] + 2 * RES, apex[1] - 8 * RES], [apex[0], apex[1] - 12 * RES]], GILT);
  }
  return iso.build();
}

/** The GREAT observation wheel on the south bank: a thin white rim and
 *  spokes nearly three houses' height across, capsules dotted around the
 *  outside, A-frame legs and a back-stay. Fills the cell's full headroom. */
export function eyeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const [cx, cyB] = P(0.55, 0.58, 0);
  const R = 57 * RES; // great wheel radius — the whole cell width
  const cy = cyB - 72 * RES; // hub height
  iso.shadow(0.28, 0.5, 0.78, 0.72, 0.22, 0.16);
  // support: A-frame legs to the hub + a slim back-stay
  iso.r.line([cx + 30 * RES, cyB + 2 * RES], [cx, cy], 1.6 * RES, shaded(COLORS.white, 0.2));
  iso.r.line([cx - 28 * RES, cyB + 3 * RES], [cx, cy], 2.6 * RES, COLORS.white);
  iso.r.line([cx - 8 * RES, cyB + 5 * RES], [cx, cy], 2.6 * RES, COLORS.white);
  iso.r.line([cx - 24 * RES, cyB - 16 * RES], [cx - 11 * RES, cyB - 22 * RES], 1.1 * RES, COLORS.white);
  // rim: white outer + slim steel inner ring
  const ring = (r: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.97]);
    }
    return pts;
  };
  iso.r.polyline(ring(R), 1.7 * RES, COLORS.white, true);
  iso.r.polyline(ring(R - 2.8 * RES), 0.9 * RES, alpha(COLORS.steel, 0.85), true);
  // spokes — thin cables to the hub
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.13;
    iso.r.line([cx, cy], [cx + Math.cos(a) * (R - 2.8 * RES), cy + Math.sin(a) * (R - 2.8 * RES) * 0.97], 0.55 * RES, alpha(COLORS.steel, 0.7));
  }
  // capsules riding the OUTSIDE of the rim
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.13;
    const sx = cx + Math.cos(a) * (R + 3.4 * RES);
    const sy = cy + Math.sin(a) * (R + 3.4 * RES) * 0.97;
    iso.r.poly(
      [[sx - 2.8 * RES, sy - 2 * RES], [sx + 2.8 * RES, sy - 2 * RES], [sx + 2.8 * RES, sy + 2 * RES], [sx - 2.8 * RES, sy + 2 * RES]],
      i === 6 ? COLORS.orange : COLORS.glassSky,
    );
    iso.r.polyline(
      [[sx - 2.8 * RES, sy - 2 * RES], [sx + 2.8 * RES, sy - 2 * RES], [sx + 2.8 * RES, sy + 2 * RES], [sx - 2.8 * RES, sy + 2 * RES]],
      INK_W * 0.35,
      alpha(INK, 0.6),
      true,
    );
  }
  // hub
  const hub: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    hub.push([cx + Math.cos(a) * 4.4 * RES, cy + Math.sin(a) * 4.2 * RES]);
  }
  iso.r.poly(hub, COLORS.white);
  iso.r.polyline(hub, INK_W * 0.6, INK, true);
  // boarding platform under the wheel
  iso.box(0.36, 0.6, 0.74, 0.76, 0, 4.5, COLORS.white, { ink: false, topC: lighten(COLORS.pavement, 0.1) });
  return iso.build();
}

/** St Paul's, to scale on a 2x2 block: long classical nave with two
 *  storeys of windows, transept, the colonnaded drum, the great
 *  grey-green dome with its lantern and gold cross, twin west towers
 *  and the pedimented portico. SW-anchored multi-tile sprite. */
export function domeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true });
  void seed;
  const DOME = hex('#7c948a'); // the grey-green lead dome
  // the cathedral keeps to the WEST of its close (the east strip stays
  // open lawn): its tall masses then never fight the fabric drawn after
  // it to the north-east
  iso.shadow(0.12, 0.5, 1.56, 1.5, 0.22, 0.24);

  // transept arms first (north-south), then the long nave over them
  iso.box(0.66, 0.5, 1.08, 1.52, 0, 28, PORTLAND);
  iso.box(0.12, 0.62, 1.58, 1.44, 0, 30, PORTLAND);
  // two storeys of round-headed windows down the east flank
  iso.windowsRight(1.58, 0.68, 1.4, 3.5, 12, 6, alpha(COLORS.glassDark, 0.9), COLORS.white);
  iso.windowsRight(1.58, 0.68, 1.4, 16, 25, 6, alpha(COLORS.glassDark, 0.9), COLORS.white);
  // balustraded parapet
  iso.box(0.1, 0.6, 1.6, 1.46, 30, 33, lighten(PORTLAND, 0.1), { ink: false });

  // the show front faces the street: portico columns under a pediment,
  // flanked by the twin towers with their lead cupolas
  iso.box(0.5, 1.44, 1.2, 1.55, 0, 26, PORTLAND, { ink: false });
  for (let cu = 0.54; cu <= 1.12; cu += 0.067) {
    iso.r.poly([iso.P(cu, 1.552, 24), iso.P(cu + 0.026, 1.552, 24), iso.P(cu + 0.026, 1.552, 2), iso.P(cu, 1.552, 2)], COLORS.white);
  }
  iso.r.poly([iso.P(0.5, 1.552, 30), iso.P(1.2, 1.552, 30), iso.P(1.2, 1.552, 26), iso.P(0.5, 1.552, 26)], lighten(PORTLAND, 0.12));
  iso.r.poly([iso.P(0.5, 1.552, 30), iso.P(1.2, 1.552, 30), iso.P(0.85, 1.552, 41)], lighten(PORTLAND, 0.16));
  iso.r.polyline([iso.P(0.5, 1.552, 30), iso.P(1.2, 1.552, 30), iso.P(0.85, 1.552, 41)], INK_W * 0.8, INK, true);
  for (const tu of [0.26, 1.44] as const) {
    iso.box(tu - 0.12, 1.32, tu + 0.12, 1.56, 0, 50, PORTLAND);
    iso.hip(tu - 0.14, 1.3, tu + 0.14, 1.58, 50, 12, LEAD);
    const tt = iso.P(tu, 1.44, 62);
    iso.r.line(tt, [tt[0], tt[1] - 4 * RES], 1 * RES, COLORS.glassLit);
  }

  // the drum: a square base, then the colonnaded ring
  iso.box(0.62, 0.77, 1.12, 1.27, 28, 38, PORTLAND);
  const [dx, dyB] = iso.P(0.87, 1.02, 0);
  const DR = 0.52 * (CELL_W / 2);
  const ring = (s: number, z: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([dx + Math.cos(a) * DR * s, dyB - z * RES + Math.sin(a) * DR * s * 0.48]);
    }
    return pts;
  };
  iso.r.poly([...ring(0.92, 38), ...ring(0.92, 56).reverse()], PORTLAND);
  // peristyle columns around the visible front of the drum
  for (let t = 0; t <= 10; t++) {
    const a = (t / 10) * Math.PI;
    const px = dx + Math.cos(a) * DR * 0.92;
    const py = dyB - 47 * RES + Math.sin(a) * DR * 0.92 * 0.48;
    iso.r.line([px, py - 8 * RES], [px, py + 8 * RES], 1.1 * RES, a < Math.PI * 0.45 ? lit(PORTLAND, 0.2) : COLORS.white);
  }
  iso.r.polyline(ring(0.92, 56), INK_W * 0.6, alpha(INK, 0.6), true);
  // the stone gallery — the gold-touched band the dome springs from
  iso.r.poly([...ring(0.98, 56), ...ring(0.98, 60).reverse()], lighten(PORTLAND, 0.14));

  // the great dome itself, ribs and all
  const domeR = DR * 0.95;
  const dome = (s: number, dzx = 0): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push([dx + dzx + Math.cos(a) * domeR * s, dyB - 60 * RES - Math.sin(a) * domeR * 1.12 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(DOME, 0.08), lit(DOME, 0.05));
  iso.r.poly(dome(0.66, domeR * 0.16), lit(DOME, 0.16));
  // meridian ribs
  for (const k of [-0.62, -0.2, 0.24, 0.66]) {
    const baseX = dx + k * domeR;
    const topX = dx + k * domeR * 0.12;
    iso.r.line([baseX, dyB - 60 * RES], [topX, dyB - 60 * RES - domeR * 1.09], 0.8 * RES, alpha(darken(DOME, 0.25), 0.8));
  }
  iso.r.polyline(dome(1), INK_W * 0.9, INK);
  // lantern + the gold ball and cross
  const topY = dyB - 60 * RES - domeR * 1.12;
  iso.r.rect(dx - 2.6 * RES, topY - 9 * RES, dx + 2.6 * RES, topY + 1 * RES, COLORS.white);
  iso.r.polyline(
    [[dx - 2.6 * RES, topY - 9 * RES], [dx + 2.6 * RES, topY - 9 * RES], [dx + 2.6 * RES, topY + 1 * RES]],
    INK_W * 0.5,
    alpha(INK, 0.7),
  );
  iso.r.poly([[dx - 2 * RES, topY - 9 * RES], [dx + 2 * RES, topY - 9 * RES], [dx, topY - 13 * RES]], LEAD);
  iso.r.line([dx, topY - 13 * RES], [dx, topY - 18 * RES], 1 * RES, COLORS.glassLit);
  iso.r.line([dx - 2 * RES, topY - 16.4 * RES], [dx + 2 * RES, topY - 16.4 * RES], 1 * RES, COLORS.glassLit);
  return iso.build();
}

/** THE SHARD: the tallest thing on the map — a slender tapering spike of
 *  pale sky-reflecting glass, facet seams up its faces and the
 *  characteristic open splintered tip where the facets stop short. */
export function spireTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const u = 0.5;
  const v = 0.52;
  const b = 0.3;
  const H = 176;
  iso.shadow(u - b, v - b * 0.4, u + b, v + b, 0.45, 0.28);
  const apex = P(u + 0.02, v - 0.02, H);
  const L = P(u - b, v + b * 0.85, 0);
  const F = P(u + b * 0.15, v + b, 0);
  const Rr = P(u + b, v + b * 0.15, 0);
  const Bk = P(u + b * 0.78, v - b, 0);
  const along = (c: Pt, t: number): Pt => [c[0] + (apex[0] - c[0]) * t, c[1] + (apex[1] - c[1]) * t];
  // facets: each stops at its own height — the open splintered crown.
  // Pale glass, brighter toward the sky reflection at the top.
  iso.r.poly([L, F, along(F, 0.86), along(L, 0.93)], hex('#dceaf2'), hex('#9fb3cf'));
  iso.r.poly([F, Rr, along(Rr, 0.955), along(F, 0.86)], hex('#eef5fa'), hex('#c4d9e8'));
  iso.r.poly([Rr, Bk, along(Bk, 0.89), along(Rr, 0.955)], hex('#c2d2e6'), hex('#8b9fc0'));
  // splinter blades continuing past each facet edge, gaps between
  const blade = (c: Pt, t0: number, t1: number, w: number, col: RGBA): void => {
    const a0 = along(c, t0);
    const a1 = along(c, t1);
    iso.r.poly([[a0[0] - w, a0[1]], [a0[0] + w, a0[1]], a1], col);
  };
  blade(L, 0.93, 1.0, 1.6 * RES, hex('#b7c8de'));
  blade(F, 0.86, 0.97, 2 * RES, hex('#d3e3ee'));
  blade(Rr, 0.955, 1.06, 1.7 * RES, hex('#e4eef6'));
  blade(Bk, 0.89, 1.0, 1.3 * RES, hex('#a9bcd6'));
  // faint floor lines across the two big faces
  for (let z = 12; z < 150; z += 11) {
    const t = z / H;
    iso.r.line(along(L, t), along(F, t), 0.45 * RES, alpha(COLORS.white, 0.28));
    iso.r.line(along(F, t), along(Rr, t), 0.45 * RES, alpha(COLORS.white, 0.22));
  }
  // facet seams + a light silhouette ink (glass, not stone)
  iso.r.line(F, along(F, 0.97), 0.8 * RES, alpha(COLORS.white, 0.9));
  iso.r.line(Rr, along(Rr, 1.06), 0.7 * RES, alpha(COLORS.white, 0.75));
  iso.r.line(L, along(L, 1.0), INK_W * 0.7, alpha(INK, 0.7));
  iso.r.line(Bk, along(Bk, 1.0), INK_W * 0.6, alpha(INK, 0.55));
  // street-level podium + canopy
  iso.box(u - b * 0.9, v - b * 0.4, u + b * 0.9, v + b * 0.95, 0, 6, COLORS.glassDark, { topC: COLORS.steel });
  return iso.build();
}

/** The Gherkin: the City's rounded glass bullet with its diagonal
 *  lattice — bulging waist, tapering to a lens at the tip. */
export function gherkinTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  iso.shadow(0.32, 0.34, 0.68, 0.66, 0.3, 0.26);
  const [cx, cyB] = P(0.5, 0.5, 0);
  const H = 126;
  const Rm = 25 * RES;
  // bullet profile: waisted at the base, widest a third up, closing to a tip
  const prof = (t: number): number => Rm * Math.sin(Math.PI * (0.24 + 0.76 * t));
  const yAt = (t: number): number => cyB - H * RES * t;
  const STEPS = 22;
  const outline: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) outline.push([cx - prof(i / STEPS), yAt(i / STEPS)]);
  for (let i = STEPS; i >= 0; i--) outline.push([cx + prof(i / STEPS), yAt(i / STEPS)]);
  iso.r.poly(outline, lighten(COLORS.glassSky, 0.28), hex('#48587c'));
  // sunset-lit eastern flank
  const litSide: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) litSide.push([cx + prof(i / STEPS) * 0.35, yAt(i / STEPS)]);
  for (let i = STEPS; i >= 0; i--) litSide.push([cx + prof(i / STEPS) * 0.96, yAt(i / STEPS)]);
  iso.r.poly(litSide, alpha(COLORS.glassSunset, 0.4), alpha(hex('#46518f'), 0.35));
  // the diagonal lattice, both helix families wrapping the shell
  for (const dir of [1, -1]) {
    for (let k = 0; k < 6; k++) {
      const pts: Pt[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const a = (k / 6) * Math.PI * 2 + dir * t * 4.2;
        const c = Math.cos(a);
        if (c < -0.15) {
          if (pts.length > 1) iso.r.polyline(pts, 0.65 * RES, alpha(hex('#2e3d57'), 0.75));
          pts.length = 0;
          continue;
        }
        pts.push([cx + prof(t) * c, yAt(t)]);
      }
      if (pts.length > 1) iso.r.polyline(pts, 0.65 * RES, alpha(hex('#2e3d57'), 0.75));
    }
  }
  // crown lens + silhouette ink
  iso.r.poly(
    [[cx - 2.4 * RES, yAt(0.965)], [cx + 2.4 * RES, yAt(0.965)], [cx, yAt(1) - 1.5 * RES]],
    alpha(COLORS.white, 0.85),
  );
  iso.r.polyline(outline, INK_W * 0.6, alpha(INK, 0.75), true);
  return iso.build();
}

/** The fortress: stone keep, corner turrets, banner. */
export function fortressTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  // curtain wall
  iso.box(0.14, 0.14, 0.86, 0.86, 0, 10, STONE_DARK);
  iso.quad(0.18, 0.18, 0.82, 0.82, 10, lighten(COLORS.grass, 0.02));
  // keep
  iso.shadow(0.32, 0.32, 0.68, 0.68, 0.16, 0.2);
  iso.box(0.32, 0.32, 0.68, 0.68, 10, 42, STONE);
  // corner turrets with caps
  for (const [u, v] of [
    [0.32, 0.32],
    [0.68, 0.32],
    [0.32, 0.68],
    [0.68, 0.68],
  ] as const) {
    iso.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, 10, 50, STONE);
    iso.hip(u - 0.06, v - 0.06, u + 0.06, v + 0.06, 50, 9, hex('#46518f'));
  }
  // arrow slits + banner
  iso.r.line(P(0.5, 0.68, 22), P(0.5, 0.68, 32), 1 * RES, INK);
  iso.r.line(P(0.6, 0.68, 20), P(0.6, 0.68, 30), 1 * RES, INK);
  const flag = P(0.68, 0.32, 50);
  iso.r.line(flag, [flag[0], flag[1] - 9 * RES], 0.9 * RES, INK);
  iso.r.poly([[flag[0], flag[1] - 9 * RES], [flag[0] + 6 * RES, flag[1] - 7.5 * RES], [flag[0], flag[1] - 6 * RES]], COLORS.orange);
  return iso.build();
}

/**
 * NOTRE-DAME DE PARIS: bespoke gothic cathedral (owner reference photos,
 * 2026-06-14). The twin FLAT-TOPPED west towers with the great rose window
 * between them, the long nave under a steep dark-lead roof, the central
 * flèche spire over the crossing, a rounded apse (chevet) and suggested
 * flying buttresses. Cool grey gothic limestone. Compact 1×1 so the pipeline
 * places it like any hero (with its cleared parvis apron around it).
 */
export function notredameTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const GST = hex('#cdc6b4'); // cool gothic limestone
  const GST_D = hex('#aaa48f');
  const ROOF = hex('#4f5a6b'); // dark lead nave roof
  const GLASS = alpha(hex('#2b3350'), 0.9);
  iso.shadow(0.16, 0.22, 0.9, 0.92, 0.2, 0.24);

  const nu0 = 0.34;
  const nu1 = 0.66;
  const nv0 = 0.3; // apse (back)
  const nv1 = 0.82; // crossing toward the front
  const navH = 26;

  // side aisles (lower) flanking the nave, with lean-to lead roofs
  iso.box(0.22, nv0 + 0.04, nu0, nv1, 0, 15, GST);
  iso.box(nu1, nv0 + 0.04, 0.78, nv1, 0, 15, GST);
  iso.quad(0.22, nv0 + 0.04, nu0, nv1, 15, shaded(ROOF, 0.04));
  iso.quad(nu1, nv0 + 0.04, 0.78, nv1, 15, lit(ROOF, 0.04));
  // tall pointed lancet windows down the visible (left) aisle wall
  for (let i = 0; i < 5; i++) {
    const u = 0.26 + i * 0.064;
    iso.r.poly(
      [P(u, nv1, 4), P(u + 0.03, nv1, 4), P(u + 0.03, nv1, 11), P(u + 0.015, nv1, 13.5), P(u, nv1, 11)],
      GLASS,
    );
  }

  // the nave clerestory + steep gable roof (ridge front-to-back along v)
  iso.box(nu0, nv0, nu1, nv1, 0, navH, GST);
  iso.gable(nu0, nv0, nu1, nv1, navH, 16, 'v', ROOF, GST);

  // rounded apse / chevet at the back (low v) under a conical roof
  iso.box(nu0 + 0.02, nv0 - 0.08, nu1 - 0.02, nv0 + 0.04, 0, navH - 5, GST);
  iso.hip(nu0, nv0 - 0.1, nu1, nv0 + 0.06, navH - 5, 11, ROOF);

  // suggested flying buttresses along the apse flanks
  for (const v of [nv0 + 0.02, nv0 + 0.16, nv0 + 0.3]) {
    iso.r.line(P(0.22, v, 14), P(nu0, v, navH - 3), 1.1 * RES, GST_D);
    iso.r.line(P(0.78, v, 14), P(nu1, v, navH - 3), 1.1 * RES, GST_D);
  }

  // the central flèche (spire) over the crossing — taller than the towers
  const su = (nu0 + nu1) / 2;
  const sv = nv0 + (nv1 - nv0) * 0.4;
  iso.box(su - 0.028, sv - 0.028, su + 0.028, sv + 0.028, navH + 16, navH + 24, GST_D, { ink: false });
  const base = P(su, sv, navH + 24);
  const tip = P(su, sv, navH + 60);
  iso.r.poly([[base[0] - 4 * RES, base[1]], tip, [base[0], base[1] - 1.5 * RES]], shaded(ROOF, 0.12));
  iso.r.poly([[base[0], base[1] - 1.5 * RES], tip, [base[0] + 4 * RES, base[1]]], lit(ROOF, 0.1));
  iso.r.polyline([[base[0] - 4 * RES, base[1]], tip, [base[0] + 4 * RES, base[1]]], INK_W * 0.7, INK);
  iso.r.line(tip, [tip[0], tip[1] - 5 * RES], 1 * RES, COLORS.glassLit);

  // twin FLAT-TOPPED west towers at the front (high v)
  for (const tu of [0.28, 0.72] as const) {
    iso.box(tu - 0.1, 0.78, tu + 0.1, 0.92, 0, 46, GST);
    // pointed belfry opening on the front face
    iso.r.poly(
      [P(tu - 0.05, 0.92, 26), P(tu + 0.05, 0.92, 26), P(tu + 0.05, 0.92, 39), P(tu, 0.92, 43), P(tu - 0.05, 0.92, 39)],
      GLASS,
    );
    // the gallery parapet + four corner pinnacles (flat top, no spire)
    iso.box(tu - 0.11, 0.77, tu + 0.11, 0.93, 46, 49, lighten(GST, 0.08), { ink: false });
    for (const [pu, pv] of [[tu - 0.1, 0.78], [tu + 0.1, 0.78], [tu - 0.1, 0.92], [tu + 0.1, 0.92]] as const) {
      iso.box(pu - 0.013, pv - 0.013, pu + 0.013, pv + 0.013, 49, 55, GST_D, { ink: false });
    }
  }

  // west-front gable wall + the great ROSE WINDOW + three portals
  iso.box(0.38, 0.86, 0.62, 0.92, 0, 33, GST);
  const [rx, ry] = P(0.5, 0.92, 23);
  const RR = 6.5 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92]);
  }
  iso.r.poly(rose, GLASS);
  iso.r.polyline(rose, INK_W * 0.7, INK, true);
  iso.r.line([rx - RR, ry], [rx + RR, ry], 0.8 * RES, alpha(COLORS.white, 0.55));
  iso.r.line([rx, ry - RR * 0.92], [rx, ry + RR * 0.92], 0.8 * RES, alpha(COLORS.white, 0.55));
  for (const pu of [0.43, 0.5, 0.57]) {
    iso.r.poly(
      [P(pu - 0.02, 0.92, 0), P(pu + 0.02, 0.92, 0), P(pu + 0.02, 0.92, 7), P(pu, 0.92, 9), P(pu - 0.02, 0.92, 7)],
      darken(GST_D, 0.22),
    );
  }
  return iso.build();
}

/**
 * ARC DE TRIOMPHE: bespoke Paris icon. A single great triumphal arch in warm
 * limestone — the deep arched passage, a sculptural attic and cornice — atop
 * the Étoile where the avenues radiate. Also serves the city's lesser
 * triumphal gates (Porte Saint-Denis/Saint-Martin).
 */
export function archTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const ST = hex('#e0d6bb'); // warm Paris limestone
  const u0 = 0.26;
  const u1 = 0.74;
  const v0 = 0.32;
  const v1 = 0.72;
  const H = 30;
  const S = RES;
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  iso.shadow(u0, v0, u1, v1, 0.16, 0.2);
  iso.box(u0, v0, u1, v1, 0, H, ST);
  // sculptural attic crown
  iso.box(u0 - 0.015, v0 - 0.015, u1 + 0.015, v1 + 0.015, H, H + 9, lighten(ST, 0.05), {
    topC: top(ST, 0.3),
  });
  iso.r.line(P(u0, v1, H), P(u1, v1, H), INK_W * 0.7, alpha(INK, 0.5));

  // the deep arched passage on the visible (left, v1) face
  const drawArch = (face: 'v' | 'u'): void => {
    const aL = (face === 'v' ? u0 : v0) + 0.11;
    const aR = (face === 'v' ? u1 : v1) - 0.11;
    const at = (a: number, z: number): Pt => (face === 'v' ? P(a, v1, z) : P(u1, a, z));
    const poly: Pt[] = [at(aL, 2), at(aL, 16)];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      poly.push(at(lerp(aL, aR, t), 16 + Math.sin(t * Math.PI) * 9));
    }
    poly.push(at(aR, 16), at(aR, 2));
    iso.r.poly(poly, shaded(ST, 0.52));
    iso.r.polyline(poly.slice(1, poly.length - 1), INK_W * 0.5, alpha(INK, 0.6));
    // keystone
    const mid = at((aL + aR) / 2, 25);
    iso.r.rect(mid[0] - 1.6 * S, mid[1] - 2 * S, mid[0] + 1.6 * S, mid[1] + 2 * S, lighten(ST, 0.1));
  };
  drawArch('u'); // the cross passage (drawn first, behind)
  drawArch('v');
  return iso.build();
}

/**
 * SACRÉ-CŒUR: bespoke Paris icon. The white Romano-Byzantine basilica on
 * Montmartre — a tall ovoid central dome flanked by smaller domes and a square
 * campanile, in pale travertine that stays white. Sits on the city's high hill.
 */
export function sacrecoeurTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const WHITE = hex('#eee9dc'); // travertine, famously self-whitening
  const SHAD = hex('#cfc8b8');
  const S = RES;
  iso.shadow(0.2, 0.26, 0.84, 0.82, 0.18, 0.22);
  // the body
  iso.box(0.24, 0.3, 0.8, 0.78, 0, 22, WHITE);
  iso.windowsLeft(0.78, 0.3, 0.74, 6, 16, 5, alpha(COLORS.glassDark, 0.85), WHITE);
  iso.box(0.22, 0.28, 0.82, 0.8, 22, 25, lighten(WHITE, 0.06), { ink: false });

  const ovoid = (cx: number, cy: number, r: number, z0: number, rise: number, s = 1): void => {
    const [dx, dyB] = iso.P(cx, cy, z0);
    const R = r * (CELL_W / 2);
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push([dx + Math.cos(a) * R * s, dyB - Math.sin(a) * rise * S]);
    }
    iso.r.poly(pts, WHITE, SHAD);
    iso.r.polyline(pts, INK_W * 0.7, alpha(INK, 0.7));
    // lantern + cross
    iso.r.line([dx, dyB - rise * S], [dx, dyB - rise * S - 5 * S], 1 * S, WHITE);
    iso.r.line([dx - 1.6 * S, dyB - rise * S - 4 * S], [dx + 1.6 * S, dyB - rise * S - 4 * S], 0.8 * S, WHITE);
  };
  // three flanking small domes, then the great central ovoid dome
  ovoid(0.4, 0.42, 0.16, 25, 16, 0.85);
  ovoid(0.66, 0.66, 0.16, 25, 16, 0.85);
  ovoid(0.4, 0.66, 0.15, 25, 14, 0.8);
  iso.box(0.44, 0.46, 0.62, 0.64, 25, 32, WHITE); // drum
  ovoid(0.53, 0.55, 0.27, 32, 40, 1);
  // the square campanile to the rear-right
  iso.box(0.72, 0.34, 0.84, 0.46, 0, 50, WHITE);
  iso.hip(0.71, 0.33, 0.85, 0.47, 50, 8, SHAD);
  return iso.build();
}

/**
 * GRAND CIVIC BUILDING — a parameterized hero generator (owner, 2026-06-14:
 * "I want ~100 hero buildings, not every building real"). One flexible 2×2
 * block — stone body + grand windows + a columned portico & pediment — with a
 * variant-driven CROWN (central dome / twin corner towers / a clock-bell tower
 * / a statued balustrade) × stone colour × height. The pipeline routes notable
 * OSM buildings (museums, theatres, palaces, ministries, big named civic
 * blocks) to these, so the map carries many distinct, large hero buildings
 * without hand-drawing each one. Bigger than the ordinary stock, so heroes read.
 */
export function grandTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true });
  const rng = new Rng(seed * 22699 + variant * 191 + 3);
  const S = RES;
  const stoneSet: RGBA[] = [BATH, STONE, hex('#ded3b8'), PORTLAND, hex('#d3c7a8'), hex('#e4dcc6')];
  const stone = stoneSet[variant % stoneSet.length] ?? STONE;
  const roofSet: RGBA[] = [LEAD, hex('#5b5f68'), hex('#7d7494'), hex('#69604f'), hex('#4f6552')];
  const roof = roofSet[(variant >> 1) % roofSet.length] ?? LEAD;
  const crown = variant % 4;
  const H = 34 + (variant % 3) * 12; // 34..58 — a tall, dominant civic mass
  const u0 = 0.36;
  const u1 = 2.64;
  const v0 = 0.45;
  const v1 = 2.55;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);

  // the stone body
  iso.box(u0, v0, u1, v1, 0, H, stone);
  // string course + storeys of tall round/arched windows on both faces
  const floors = 3 + (variant % 2);
  for (let f = 0; f < floors; f++) {
    const zb = 5 + (f * (H - 8)) / floors + 1.5;
    const zt = 5 + ((f + 1) * (H - 8)) / floors - 1.5;
    const lit = rng.chance(0.4) ? COLORS.glassLit : alpha(COLORS.glassDark, 0.85);
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, zb, zt, 10, lit, COLORS.white);
    iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, zb, zt, 10, lit, COLORS.white);
  }
  // a balustraded cornice
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 3, lighten(stone, 0.08), { topC: top(stone, 0.3) });

  // a columned PORTICO + pediment projecting from the front (v1)
  const pcU0 = 0.95;
  const pcU1 = 2.05;
  iso.box(pcU0, v1, pcU1, v1 + 0.2, 0, H - 5, stone, { ink: false });
  for (let c = 0; c <= 9; c++) {
    const cu = pcU0 + ((pcU1 - pcU0) * c) / 9;
    iso.r.poly([P(cu - 0.015, v1 + 0.2, H - 8), P(cu + 0.015, v1 + 0.2, H - 8), P(cu + 0.015, v1 + 0.2, 2), P(cu - 0.015, v1 + 0.2, 2)], c % 2 ? lit(COLORS.white, 0.1) : COLORS.white);
  }
  // pediment triangle
  iso.r.poly([P(pcU0 - 0.05, v1 + 0.2, H - 5), P(pcU1 + 0.05, v1 + 0.2, H - 5), P((pcU0 + pcU1) / 2, v1 + 0.2, H + 10)], lighten(stone, 0.12));
  iso.r.polyline([P(pcU0 - 0.05, v1 + 0.2, H - 5), P(pcU1 + 0.05, v1 + 0.2, H - 5), P((pcU0 + pcU1) / 2, v1 + 0.2, H + 10)], INK_W * 0.8, INK, true);

  const cx = (u0 + u1) / 2;
  const cy = (v0 + v1) / 2;
  if (crown === 0) {
    // a great green-grey DOME on a colonnaded drum (Panthéon / Invalides)
    iso.box(cx - 0.5, cy - 0.5, cx + 0.5, cy + 0.5, H, H + 11, stone);
    const [dx, dyB] = iso.P(cx, cy, H + 11);
    const DR = 0.62 * (CELL_W / 2);
    for (let i = 0; i <= 10; i++) {
      iso.r.line([dx - DR + (2 * DR * i) / 10, dyB], [dx - DR + (2 * DR * i) / 10, dyB - 7 * S], 1.2 * S, i % 2 ? COLORS.white : lit(stone, 0.1));
    }
    const dome: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      dome.push([dx + Math.cos(a) * DR, dyB - 7 * S - Math.sin(a) * DR * 1.2]);
    }
    iso.r.poly(dome, shaded(roof, 0.05), lit(roof, 0.06));
    iso.r.polyline(dome, INK_W * 0.9, INK);
    const tipY = dyB - 7 * S - DR * 1.2;
    iso.r.line([dx, tipY], [dx, tipY - 10 * S], 1.2 * S, COLORS.glassLit);
  } else if (crown === 1) {
    // twin corner towers (a grand hôtel / station frontage)
    for (const tu of [u0 + 0.34, u1 - 0.34]) {
      iso.box(tu - 0.24, v1 - 0.74, tu + 0.24, v1 - 0.26, H, H + 24, stone);
      iso.hip(tu - 0.27, v1 - 0.77, tu + 0.27, v1 - 0.23, H + 24, 13, roof);
    }
  } else if (crown === 2) {
    // a clock / bell campanile rising at the rear
    iso.box(cx - 0.24, v0 + 0.3, cx + 0.24, v0 + 0.78, H, H + 38, stone);
    iso.windowsLeft(v0 + 0.78, cx - 0.18, cx + 0.18, H + 24, H + 34, 1, alpha(COLORS.glassDark, 0.8), COLORS.white);
    const [clx, cly] = iso.P(cx, v0 + 0.78, H + 20);
    iso.r.line([clx - 3.4 * S, cly], [clx + 3.4 * S, cly], 1.4 * S, COLORS.white); // clock face hint
    iso.hip(cx - 0.27, v0 + 0.27, cx + 0.27, v0 + 0.81, H + 38, 15, roof);
  } else {
    // a flat roof with a statued balustrade + central acroterion
    iso.box(cx - 0.75, cy - 0.63, cx + 0.75, cy + 0.63, H + 3, H + 7, lighten(stone, 0.04), { ink: false });
    for (const su of [u0 + 0.18, cx, u1 - 0.18]) {
      iso.box(su - 0.04, v1 - 0.09, su + 0.04, v1, H + 3, H + 13, lighten(stone, 0.1), { ink: false });
    }
  }
  return iso.build();
}

/**
 * THE LOUVRE: bespoke Paris icon. The long classical palace wings in cream
 * stone with grey mansard roofs and corner pavilions, wrapped around the court
 * where I.M. Pei's glass PYRAMID stands — the unmistakable signature.
 */
export function louvreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const ST = hex('#e2d8bf'); // Louvre limestone
  const ROOF = hex('#5b5f68'); // grey mansard/zinc
  const S = RES;
  iso.shadow(0.1, 0.16, 0.92, 0.9, 0.2, 0.22);
  // a wing: stone block + steep mansard + a row of tall windows
  const wing = (u0: number, v0: number, u1: number, v1: number, h: number): void => {
    iso.box(u0, v0, u1, v1, 0, h, ST);
    iso.windowsLeft(v1, u0 + 0.03, u1 - 0.03, 5, h - 4, Math.max(2, Math.round((u1 - u0) * 9)), alpha(COLORS.glassDark, 0.85), COLORS.white);
    iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, h, h + 1.5, lighten(ST, 0.06), { ink: false });
    iso.gable(u0, v0, u1, v1, h + 1.5, 7, u1 - u0 > v1 - v0 ? 'v' : 'u', ROOF, ST);
  };
  // three wings around a court that opens toward the viewer (south, v1)
  wing(0.12, 0.16, 0.9, 0.34, 26); // back (north) range
  wing(0.12, 0.34, 0.3, 0.86, 24); // west range
  wing(0.72, 0.34, 0.9, 0.86, 24); // east range
  // corner pavilions (taller, pavilion roofs)
  for (const [pu, pv] of [[0.12, 0.16], [0.9, 0.16], [0.12, 0.86], [0.9, 0.86]] as const) {
    iso.box(pu - 0.07, pv - 0.07, pu + 0.07, pv + 0.07, 0, 32, ST);
    iso.hip(pu - 0.08, pv - 0.08, pu + 0.08, pv + 0.08, 32, 10, ROOF);
  }
  // the glass PYRAMID in the court
  const [px, pyB] = iso.P(0.5, 0.6, 0);
  const apex: Pt = [px, pyB - 26 * S];
  const hw = 13 * S;
  const hd = 6.5 * S;
  const fL: Pt = [px - hw, pyB - hd];
  const fF: Pt = [px, pyB];
  const fR: Pt = [px + hw, pyB - hd];
  const fB: Pt = [px, pyB - 2 * hd];
  iso.r.poly([fL, fF, apex], alpha(COLORS.glassSky, 0.92)); // left face
  iso.r.poly([fF, fR, apex], alpha(COLORS.glassSunset, 0.92)); // right face (sunset)
  iso.r.poly([fR, fB, apex], alpha(COLORS.glassDark, 0.9)); // back-right
  iso.r.polyline([fL, fF, fR, apex, fL], INK_W * 0.6, alpha(INK, 0.7), true);
  iso.r.line(fF, apex, 0.7 * S, alpha(COLORS.white, 0.7)); // the near edge glints
  // pyramid lattice mullions
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    iso.r.line([fL[0] + (apex[0] - fL[0]) * t, fL[1] + (apex[1] - fL[1]) * t], [fF[0] + (apex[0] - fF[0]) * t, fF[1] + (apex[1] - fF[1]) * t], 0.4 * S, alpha(COLORS.white, 0.4));
    iso.r.line([fF[0] + (apex[0] - fF[0]) * t, fF[1] + (apex[1] - fF[1]) * t], [fR[0] + (apex[0] - fR[0]) * t, fR[1] + (apex[1] - fR[1]) * t], 0.4 * S, alpha(COLORS.white, 0.4));
  }
  return iso.build();
}

/**
 * THE EIFFEL TOWER: bespoke Paris icon (owner reference, 2026-06-14). The
 * unmistakable wrought-iron silhouette — four splayed legs and the great base
 * arch, the two observation platforms, the tapering lattice shaft to the point,
 * drawn in Eiffel brown with cross-hatch latticework. A tall 1×1, like the
 * Shard/BT-tower (drawn as a near-symmetric silhouette).
 */
/**
 * THE EIFFEL TOWER: bespoke Paris icon (owner reference, 2026-06-14). The
 * unmistakable wrought-iron silhouette — four splayed legs and the great base
 * arch, the two observation platforms, the tapering lattice shaft to the point,
 * in Eiffel brown with dense cross-hatch latticework. A MASSIVE 3×3 block
 * landmark so it towers over the Haussmann roofscape (owner: "absolutely
 * massive").
 */
export function eiffelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true });
  void seed;
  const IRON = hex('#75614a');
  const IRONL = lighten(IRON, 0.18);
  const IROND = darken(IRON, 0.22);
  const S = RES;
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const [bx, by] = iso.P(1.85, 1.85, 0);
  const yA = 54; // apex, near the top of the tall canvas
  const Htot = by - yA;
  const y0 = by;
  const y1 = by - Htot * 0.3; // first platform
  const y2 = by - Htot * 0.56; // second platform
  const wB = 118; // base half-width (px)
  const w1 = 66;
  const w2 = 24;
  const legW = 21;
  iso.shadow(1.0, 1.45, 2.7, 2.45, 0.34, 0.2);

  // --- the four legs + the great arch (below platform 1) ---
  for (const s of [-1, 1] as const) {
    const ox0 = bx + s * wB;
    const ix0 = bx + s * (wB - legW);
    const ox1 = bx + s * w1;
    const ix1 = bx + s * (w1 - legW * 0.72);
    const midOut = bx + s * lerp(wB, w1, 0.5) * 0.82;
    const midIn = bx + s * lerp(wB - legW, w1 - legW * 0.72, 0.5) * 0.82;
    const ym = (y0 + y1) / 2;
    iso.r.poly([[ox0, y0], [ix0, y0], [midIn, ym], [ix1, y1], [ox1, y1], [midOut, ym]], s < 0 ? IROND : IRONL);
    iso.r.polyline([[ox0, y0], [midOut, ym], [ox1, y1]], INK_W * 0.8, alpha(INK, 0.55));
    // dense lattice cross-hatch on the leg
    for (let t = 0.06; t < 1; t += 0.1) {
      const yy = lerp(y0, y1, t);
      const xa = lerp(ox0, ox1, t);
      const xb = lerp(ix0, ix1, t);
      iso.r.line([xa, yy], [xb, yy - 5 * S], 0.7 * S, alpha(IROND, 0.7));
      iso.r.line([xb, yy], [xa, yy - 5 * S], 0.7 * S, alpha(IROND, 0.5));
    }
  }
  // the iconic base arch (a broad curve spanning under platform 1)
  const arch: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = lerp(bx - (w1 + legW * 0.3), bx + (w1 + legW * 0.3), t);
    const yy = y1 - Math.sin(t * Math.PI) * 30 * S;
    arch.push([x, yy]);
  }
  iso.r.polyline(arch, 2 * S, IRON);
  iso.r.polyline(arch.map(([x, y]): Pt => [x, y + 1.5 * S]), 1 * S, alpha(IRONL, 0.6));

  // --- platform 1 deck ---
  iso.r.rect(bx - w1 - 4 * S, y1 - 4 * S, bx + w1 + 4 * S, y1 + 2 * S, IRON);
  iso.r.line([bx - w1 - 4 * S, y1 - 4 * S], [bx + w1 + 4 * S, y1 - 4 * S], 1 * S, IRONL);

  // --- the shaft from platform 1 → platform 2 (tapering lattice) ---
  const body1: Pt[] = [];
  const body2: Pt[] = [];
  const Nb = 12;
  for (let i = 0; i <= Nb; i++) {
    const t = i / Nb;
    const y = lerp(y1, y2, t);
    const w = lerp(w1, w2, t) * (1 - 0.16 * Math.sin(t * Math.PI));
    body1.push([bx - w, y]);
    body2.push([bx + w, y]);
  }
  iso.r.poly([...body1, ...body2.reverse()], IRON);
  for (let i = 0; i < Nb; i++) {
    const yAa = lerp(y1, y2, i / Nb);
    const yBb = lerp(y1, y2, (i + 1) / Nb);
    const wa = lerp(w1, w2, i / Nb) * 0.92;
    const wb = lerp(w1, w2, (i + 1) / Nb) * 0.92;
    iso.r.line([bx - wa, yAa], [bx + wb, yBb], 0.7 * S, alpha(IROND, 0.6));
    iso.r.line([bx + wa, yAa], [bx - wb, yBb], 0.7 * S, alpha(IROND, 0.6));
  }
  iso.r.polyline(body1, INK_W * 0.5, alpha(INK, 0.4));
  iso.r.polyline(body2, INK_W * 0.5, alpha(INK, 0.4));

  // --- platform 2 deck ---
  iso.r.rect(bx - w2 - 3 * S, y2 - 3 * S, bx + w2 + 3 * S, y2 + 1.5 * S, IRON);

  // --- the upper shaft tapering to the point + the beacon ---
  iso.r.poly([[bx - w2, y2], [bx + w2, y2], [bx + 1 * S, yA], [bx - 1 * S, yA]], IRONL);
  for (let y = y2; y > yA; y -= 6 * S) {
    const t = (y2 - y) / (y2 - yA);
    const w = lerp(w2, 1 * S, t);
    iso.r.line([bx - w, y], [bx + w, y - 4 * S], 0.6 * S, alpha(IROND, 0.55));
    iso.r.line([bx + w, y], [bx - w, y - 4 * S], 0.6 * S, alpha(IROND, 0.4));
  }
  iso.r.polyline([[bx - w2, y2], [bx, yA], [bx + w2, y2]], INK_W * 0.6, alpha(INK, 0.5));
  iso.r.line([bx, yA], [bx, yA - 7 * S], 1.2 * S, COLORS.glassLit); // the tip beacon
  iso.glint([bx, yA - 4 * S], 2.4 * S);
  return iso.build();
}

/** TOWER BRIDGE, whole: one sprite spanning the river's four tiles
 *  (1x4, SW-anchored on the southernmost water tile). Two gothic stone
 *  towers with corner turrets rise from mid-river piers, the twin high
 *  walkways run between them, and the pale blue suspension chains sweep
 *  down to shore turrets on each bank. The deck centre stays open so the
 *  street ribbon and its traffic pass between the balustrades. */
export function towerBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 4, { swAnchor: true });
  void seed;
  const CHAIN = hex('#8fb3d4');
  const deckZ = 8;
  const T1 = 1.3; // north tower (v)
  const T2 = 2.7; // south tower (v)
  const TOP = 60; // tower shaft top

  // mid-river stone piers with pointed cutwaters
  for (const tv of [T1, T2]) {
    iso.box(0.22, tv - 0.34, 0.78, tv + 0.34, -7, 2, COLORS.concrete, { topC: lighten(COLORS.concrete, 0.1) });
    iso.r.poly([iso.P(0.22, tv - 0.34, 2), iso.P(0.78, tv - 0.34, 2), iso.P(0.5, tv - 0.52, 2)], lighten(COLORS.concrete, 0.06));
    iso.r.poly([iso.P(0.22, tv + 0.34, 2), iso.P(0.78, tv + 0.34, 2), iso.P(0.5, tv + 0.52, 2)], shaded(COLORS.concrete, 0.12));
  }
  // shore abutment turrets where the chains land — up on the banks,
  // just past the water tiles the sprite reserves
  for (const av of [-0.12, 4.12]) {
    iso.box(0.34, av - 0.14, 0.66, av + 0.14, 0, 18, PORTLAND);
    iso.hip(0.32, av - 0.16, 0.68, av + 0.16, 18, 6, LEAD);
  }
  // deck balustrades — carriageway ribbon (and its cars) run between them
  for (const du of [0.3, 0.7]) {
    iso.r.poly(
      [iso.P(du, 0.05, deckZ + 2.5), iso.P(du, 3.95, deckZ + 2.5), iso.P(du, 3.95, deckZ - 3), iso.P(du, 0.05, deckZ - 3)],
      alpha(CHAIN, 0.92),
    );
    iso.r.line(iso.P(du, 0.05, deckZ + 2.5), iso.P(du, 3.95, deckZ + 2.5), INK_W * 0.7, INK);
  }
  // suspension chains: shore tie, the mid-river sweep, shore tie — with
  // hangers dropping to the deck. Drawn each side of the carriageway.
  const chainSide = (du: number): void => {
    const seg = (vA: number, zA: number, vB: number, zB: number, sag: number): void => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const z = zA + (zB - zA) * t - sag * 4 * t * (1 - t);
        pts.push(iso.P(du, vA + (vB - vA) * t, z));
      }
      iso.r.polyline(pts, 1.7 * RES, CHAIN);
      for (let i = 2; i <= 12; i += 2) {
        const t = i / 14;
        const z = zA + (zB - zA) * t - sag * 4 * t * (1 - t);
        iso.r.line(iso.P(du, vA + (vB - vA) * t, z), iso.P(du, vA + (vB - vA) * t, deckZ + 2), 0.6 * RES, alpha(CHAIN, 0.8));
      }
    };
    seg(-0.08, 17, T1 - 0.2, 52, 0);
    seg(T1 + 0.2, 52, T2 - 0.2, 52, 13);
    seg(T2 + 0.2, 52, 4.08, 17, 0);
  };
  chainSide(0.3);
  chainSide(0.7);

  // the two gothic towers
  for (const tv of [T1, T2]) {
    iso.box(0.24, tv - 0.26, 0.76, tv + 0.26, 2, 12, PORTLAND);
    iso.box(0.29, tv - 0.21, 0.71, tv + 0.21, 12, TOP, PORTLAND);
    // pointed portal over the roadway + gothic glazing up the shaft
    iso.r.poly(
      [iso.P(0.4, tv + 0.212, 12), iso.P(0.4, tv + 0.212, 28), iso.P(0.5, tv + 0.212, 38), iso.P(0.6, tv + 0.212, 28), iso.P(0.6, tv + 0.212, 12)],
      alpha(hex('#241c38'), 0.92),
    );
    iso.r.poly([iso.P(0.455, tv + 0.212, 55), iso.P(0.545, tv + 0.212, 55), iso.P(0.545, tv + 0.212, 42), iso.P(0.455, tv + 0.212, 42)], COLORS.glassDark);
    iso.r.poly([iso.P(0.712, tv - 0.06, 53), iso.P(0.712, tv + 0.06, 53), iso.P(0.712, tv + 0.06, 40), iso.P(0.712, tv - 0.06, 40)], COLORS.glassDark);
    // corner turrets with lead caps and gilt finials
    for (const [cu, cv] of [
      [0.31, tv - 0.19],
      [0.69, tv - 0.19],
      [0.31, tv + 0.19],
      [0.69, tv + 0.19],
    ] as const) {
      iso.box(cu - 0.048, cv - 0.048, cu + 0.048, cv + 0.048, 12, TOP + 12, PORTLAND);
      iso.hip(cu - 0.058, cv - 0.058, cu + 0.058, cv + 0.058, TOP + 12, 9, LEAD);
      const ft = iso.P(cu, cv, TOP + 21);
      iso.r.line(ft, [ft[0], ft[1] - 3.5 * RES], 0.9 * RES, COLORS.glassLit);
    }
    iso.hip(0.33, tv - 0.17, 0.67, tv + 0.17, TOP, 12, LEAD);
  }

  // the twin high-level walkways, lattice-braced
  for (const du of [0.36, 0.64] as const) {
    iso.r.poly(
      [iso.P(du, T1 + 0.18, 55), iso.P(du, T2 - 0.18, 55), iso.P(du, T2 - 0.18, 47), iso.P(du, T1 + 0.18, 47)],
      alpha(CHAIN, 0.95),
    );
    for (let wv = T1 + 0.22; wv < T2 - 0.26; wv += 0.16) {
      iso.r.line(iso.P(du, wv, 47), iso.P(du, wv + 0.16, 55), 0.7 * RES, shaded(CHAIN, 0.25));
      iso.r.line(iso.P(du, wv, 55), iso.P(du, wv + 0.16, 47), 0.7 * RES, shaded(CHAIN, 0.25));
    }
    iso.r.line(iso.P(du, T1 + 0.18, 55), iso.P(du, T2 - 0.18, 55), INK_W * 0.6, INK);
    iso.r.line(iso.P(du, T1 + 0.18, 47), iso.P(du, T2 - 0.18, 47), INK_W * 0.6, INK);
  }
  iso.quad(0.36, T1 + 0.18, 0.64, T2 - 0.18, 47, alpha(lighten(CHAIN, 0.2), 0.45));
  return iso.build();
}

/** The Olympic Stadium bowl: a HUGE sweeping white ring over an orange seat
 *  line. The real London Stadium seats 60–80k and dominates the park — so it
 *  is a dominant 3×3 footprint (owner playtest, 2026-06-13: "the Olympic
 *  Stadium is enormous"), SW-anchored like the other big precincts. The bowl
 *  fills the whole footprint with a ring of floodlight masts around it. */
export const STADIUM_W = 3;
export const STADIUM_H = 3;
export function stadiumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(STADIUM_W, STADIUM_H, { swAnchor: true });
  void seed;
  const [cx, cyB] = iso.P(STADIUM_W / 2, STADIUM_H / 2, 0);
  const ringPts = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  // radius scales with the multi-tile span (3 tiles wide on each iso axis)
  const RX = 0.46 * STADIUM_W * (CELL_W / 2);
  const RY = RX * 0.5;
  const WALL = 30 * RES;
  iso.shadow(0.2, 0.4, STADIUM_W - 0.2, STADIUM_H - 0.3, 0.2, 0.22);
  // bowl wall
  iso.r.poly([...ringPts(RX, RY, 0), ...ringPts(RX, RY, WALL).reverse()], COLORS.white);
  // seating ring + pitch
  iso.r.poly(ringPts(RX * 0.92, RY * 0.92, WALL), COLORS.orange);
  iso.r.poly(ringPts(RX * 0.62, RY * 0.62, WALL - 2 * RES), darken(COLORS.orange, 0.25));
  iso.r.poly(ringPts(RX * 0.5, RY * 0.5, WALL - 4 * RES), hex('#5f9e4e'));
  iso.r.polyline(ringPts(RX, RY, WALL), INK_W, INK, true);
  iso.r.polyline(ringPts(RX, RY, 0), INK_W * 0.8, alpha(INK, 0.55), true);
  // the white roof-ring cable truss catching the gleam on its sun side
  iso.gleam([cx + RX * 0.2, cyB - RY * 0.78 - WALL], [cx + RX * 0.9, cyB - RY * 0.2 - WALL], 1.4 * RES);
  // floodlight masts around the rim
  for (const a of [0.5, 1.4, 2.3, 3.2, 4.1, 5.0, 5.9]) {
    const sx = cx + Math.cos(a) * RX * 1.03;
    const sy = cyB + Math.sin(a) * RY * 1.03;
    iso.r.line([sx, sy], [sx, sy - 34 * RES], 1.0 * RES, COLORS.steelDark);
    iso.r.rect(sx - 2.4 * RES, sy - 38 * RES, sx + 2.4 * RES, sy - 34 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** A football ground: tighter bowl, navy stands, green pitch. */
export function arenaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const [cx, cyB] = P(0.5, 0.5, 0);
  const RX = 0.36 * (CELL_W / 2);
  const RY = RX * 0.52;
  const ring = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  iso.shadow(0.2, 0.32, 0.82, 0.72, 0.14, 0.18);
  iso.r.poly([...ring(RX, RY, 0), ...ring(RX, RY, 13 * RES).reverse()], hex('#46518f'));
  iso.r.poly(ring(RX * 0.9, RY * 0.9, 13 * RES), COLORS.white);
  iso.r.poly(ring(RX * 0.58, RY * 0.58, 11 * RES), hex('#5f9e4e'));
  // pitch markings
  iso.r.line([cx - RX * 0.45, cyB - 11 * RES], [cx + RX * 0.45, cyB - 11 * RES], 0.7 * RES, alpha(COLORS.white, 0.8));
  iso.r.polyline(ring(RX, RY, 13 * RES), INK_W, INK, true);
  return iso.build();
}

/** The glass-roofed mall, anchor store and car park. */
export function mallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  iso.shadow(0.06, 0.12, 0.8, 0.66, 0.18, 0.22);
  iso.box(0.06, 0.12, 0.8, 0.66, 0, 24, hex('#e0d6c2'));
  // barrel glass roof along the spine
  for (let i = 0; i < 3; i++) {
    const v0 = 0.16 + i * 0.17;
    iso.r.poly(
      [P(0.1, v0, 24), P(0.76, v0, 24), P(0.76, v0 + 0.07, 30), P(0.1, v0 + 0.07, 30)],
      alpha(COLORS.glassSky, 0.92),
    );
    iso.r.poly(
      [P(0.1, v0 + 0.07, 30), P(0.76, v0 + 0.07, 30), P(0.76, v0 + 0.14, 24), P(0.1, v0 + 0.14, 24)],
      alpha(lighten(COLORS.glassSky, 0.15), 0.92),
    );
    iso.r.line(P(0.1, v0 + 0.07, 30), P(0.76, v0 + 0.07, 30), 0.8 * RES, alpha(COLORS.white, 0.9));
  }
  // grand glass entrance + orange sign band
  iso.r.poly([P(0.8 + 0.001, 0.24, 18), P(0.8 + 0.001, 0.54, 18), P(0.8 + 0.001, 0.54, 0), P(0.8 + 0.001, 0.24, 0)], COLORS.glassLit);
  iso.r.poly([P(0.8 + 0.001, 0.18, 23), P(0.8 + 0.001, 0.6, 23), P(0.8 + 0.001, 0.6, 19), P(0.8 + 0.001, 0.18, 19)], COLORS.orange);
  // car park rows
  const carColors: RGBA[] = [COLORS.glassDark, hex('#c9453a'), COLORS.white, COLORS.steel];
  for (const v of [0.76, 0.86]) {
    for (let u = 0.12; u < 0.72; u += 0.11) {
      const [px, py] = P(u, v, 1);
      const c = carColors[Math.floor(u * 10) % carColors.length] ?? COLORS.white;
      iso.r.rect(px - 3.4 * RES, py - 2 * RES, px + 3.4 * RES, py + 2 * RES, c);
    }
  }
  return iso.build();
}

/** The zoo: variant 0 is the paddocks (giraffes!), 1 the great aviary. */
export function zooTile(seed: number, variantIx: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60601 + variantIx * 13 + 7);
  if (variantIx === 0) {
    // perimeter fence
    for (const [a, b, c, d] of [
      [0.06, 0.06, 0.94, 0.09],
      [0.06, 0.91, 0.94, 0.94],
      [0.06, 0.06, 0.09, 0.94],
      [0.91, 0.06, 0.94, 0.94],
    ] as const) {
      iso.box(a, b, c, d, 0, 4, hex('#7a5a3c'), { ink: false });
    }
    // pond + sandy paddock
    iso.quad(0.14, 0.6, 0.4, 0.84, 0, COLORS.water);
    iso.quad(0.5, 0.16, 0.86, 0.5, 0, lighten(COLORS.sand, 0.05), COLORS.sand);
    // giraffes: necks and legs in ink with tan bodies
    for (const [u, v] of [
      [0.6, 0.3],
      [0.74, 0.4],
    ] as const) {
      const [bx, by] = P(u, v, 0);
      iso.r.rect(bx - 3 * RES, by - 8 * RES, bx + 3.4 * RES, by - 4.5 * RES, hex('#e3b863'));
      iso.r.line([bx - 2.2 * RES, by - 4.5 * RES], [bx - 2.2 * RES, by], 0.9 * RES, INK);
      iso.r.line([bx + 2.6 * RES, by - 4.5 * RES], [bx + 2.6 * RES, by], 0.9 * RES, INK);
      iso.r.line([bx + 3 * RES, by - 8 * RES], [bx + 5 * RES, by - 15 * RES], 1.1 * RES, hex('#e3b863'));
      iso.r.rect(bx + 4.2 * RES, by - 17 * RES, bx + 6.4 * RES, by - 15 * RES, hex('#e3b863'));
    }
    // a keeper's hut
    iso.box(0.2, 0.2, 0.34, 0.34, 0, 9, hex('#5d7a45'));
    iso.hip(0.18, 0.18, 0.36, 0.36, 9, 5, hex('#46518f'));
  } else {
    // the great aviary: a netted lattice dome
    const [cx, cyB] = P(0.5, 0.52, 0);
    const R = 0.3 * (CELL_W / 2);
    const H = 36 * RES;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = Math.PI * t;
      // meridians
      iso.r.line([cx - Math.cos(a) * R, cyB - Math.sin(a) * 4 * RES], [cx - Math.cos(a) * R * 0.1, cyB - H], 0.8 * RES, COLORS.steelDark);
    }
    for (let j = 1; j <= 3; j++) {
      const t = j / 4;
      const ring: Pt[] = [];
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ring.push([cx + Math.cos(a) * R * (1 - t * 0.85), cyB - H * t + Math.sin(a) * R * 0.32 * (1 - t * 0.8)]);
      }
      iso.r.polyline(ring, 0.7 * RES, alpha(COLORS.steelDark, 0.8), true);
    }
    // birds
    for (let i = 0; i < 4; i++) {
      const bx = cx + rng.range(-R * 0.5, R * 0.5);
      const by = cyB - rng.range(H * 0.4, H * 0.9);
      iso.r.line([bx - 2 * RES, by], [bx, by - 1.6 * RES], 0.8 * RES, INK);
      iso.r.line([bx, by - 1.6 * RES], [bx + 2 * RES, by], 0.8 * RES, INK);
    }
    // flamingo pool
    iso.quad(0.6, 0.7, 0.84, 0.9, 0, COLORS.water);
    for (const u of [0.66, 0.74]) {
      const [fx, fy] = P(u, 0.79, 0);
      iso.r.line([fx, fy], [fx, fy - 4 * RES], 0.8 * RES, hex('#d6566e'));
      iso.r.rect(fx - 1.6 * RES, fy - 6.4 * RES, fx + 1.6 * RES, fy - 4 * RES, hex('#d6566e'));
    }
  }
  return iso.build();
}

/** The decommissioned river power station on its 2x2 block: the great
 *  brick cathedral, corner pavilions, and the four tall cream chimneys.
 *  SW-anchored multi-tile sprite. */
export function powerstationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true });
  void seed;
  const CHIM = hex('#e8e0cd');
  iso.shadow(0.14, 0.3, 1.86, 1.7, 0.24, 0.24);
  // the great turbine-hall block
  iso.box(0.14, 0.32, 1.86, 1.68, 0, 50, BRICK);
  // the long roof: two parallel halls with a valley between
  iso.gable(0.2, 0.36, 1.8, 0.98, 50, 9, 'u', hex('#6e6884'), BRICK);
  iso.gable(0.2, 1.02, 1.8, 1.64, 50, 9, 'u', hex('#6e6884'), BRICK);
  // long window strips down both visible faces
  iso.windowsLeft(1.68, 0.3, 1.7, 18, 42, 9, alpha(COLORS.glassDark, 0.95), COLORS.white);
  iso.windowsRight(1.86, 0.42, 1.58, 18, 42, 7, alpha(COLORS.glassDark, 0.95), COLORS.white);
  // brick pilaster ribs along the south face
  for (let uu = 0.34; uu < 1.7; uu += 0.19) {
    iso.r.line(iso.P(uu, 1.68, 2), iso.P(uu, 1.68, 48), 1 * RES, darken(BRICK, 0.18));
  }
  // corner pavilions and the four cream chimneys
  for (const [u, v] of [
    [0.32, 0.5],
    [1.68, 0.5],
    [0.32, 1.5],
    [1.68, 1.5],
  ] as const) {
    iso.box(u - 0.14, v - 0.14, u + 0.14, v + 0.14, 50, 64, BRICK);
    iso.box(u - 0.16, v - 0.16, u + 0.16, v + 0.16, 64, 67, lighten(BRICK, 0.1), { ink: false });
    // gently tapered cream column with its dark cap
    iso.box(u - 0.062, v - 0.062, u + 0.062, v + 0.062, 67, 96, CHIM, { ink: false });
    iso.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, 96, 126, CHIM);
    iso.box(u - 0.056, v - 0.056, u + 0.056, v + 0.056, 126, 130, COLORS.steelDark, { ink: false });
  }
  return iso.build();
}

// --- New heroes (map-overhaul §5: "many are missing") -----------------------

/** WEMBLEY: the great white arch springing over the stadium bowl — a hero
 *  silhouette read from far zoom. A compact 1×1: a low white seating bowl
 *  with a green pitch and the parabolic arch leaning over it, its sun-facing
 *  limb catching the gleam. */
export const WEMBLEY_W = 2;
export const WEMBLEY_H = 2;
export function wembleyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(WEMBLEY_W, WEMBLEY_H, { swAnchor: true });
  void seed;
  const [cx, cyB] = iso.P(WEMBLEY_W / 2, WEMBLEY_H / 2, 0);
  const RX = 0.46 * WEMBLEY_W * (CELL_W / 2);
  const RY = RX * 0.5;
  const WALL = 22 * RES;
  const ring = (rx: number, ry: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cyB - lift + Math.sin(a) * ry]);
    }
    return pts;
  };
  iso.shadow(0.18, 0.34, WEMBLEY_W - 0.14, WEMBLEY_H - 0.26, 0.18, 0.2);
  // the white bowl + roof ring, an orange seat band, the green pitch
  iso.r.poly([...ring(RX, RY, 0), ...ring(RX, RY, WALL).reverse()], COLORS.white);
  iso.r.poly(ring(RX * 0.92, RY * 0.92, WALL), lighten(COLORS.steel, 0.2));
  iso.r.poly(ring(RX * 0.78, RY * 0.78, WALL - 2 * RES), COLORS.orange);
  iso.r.poly(ring(RX * 0.6, RY * 0.6, WALL - 4 * RES), darken(COLORS.orange, 0.28));
  iso.r.poly(ring(RX * 0.48, RY * 0.48, WALL - 5 * RES), hex('#5f9e4e'));
  iso.r.polyline(ring(RX, RY, WALL), INK_W, INK, true);
  iso.r.polyline(ring(RX, RY, 0), INK_W * 0.7, alpha(INK, 0.5), true);
  // THE ARCH: a tall white parabola leaning over the bowl, NW→SE
  const aL: Pt = [cx - RX * 1.0, cyB - 8 * RES];
  const aR: Pt = [cx + RX * 0.66, cyB - RY * 0.4 - 6 * RES];
  const apexX = cx - RX * 0.16;
  const apexY = cyB - 108 * RES;
  const archPt = (t: number): Pt => {
    const m = 1 - t;
    return [
      m * m * aL[0] + 2 * m * t * apexX + t * t * aR[0],
      m * m * aL[1] + 2 * m * t * apexY + t * t * aR[1],
    ];
  };
  for (let k = 1; k < 6; k++) {
    const p = archPt(k / 6);
    const rA = (k / 6) * Math.PI * 1.05 + 0.2;
    iso.r.line(p, [cx + Math.cos(rA) * RX * 0.9, cyB - 13 * RES + Math.sin(rA) * RY * 0.9], 0.45 * RES, alpha(COLORS.steel, 0.6));
  }
  const archPoly: Pt[] = [];
  for (let i = 0; i <= 24; i++) archPoly.push(archPt(i / 24));
  iso.r.polyline(archPoly, 5.0 * RES, COLORS.white);
  iso.r.polyline(archPoly, INK_W * 0.6, alpha(INK, 0.55));
  iso.gleam(archPt(0.5), archPt(0.8), 1.8 * RES);
  return iso.build();
}

/** THE O2 / Millennium Dome on Greenwich peninsula: a GREAT white tented
 *  canopy on a ring of tall yellow masts, cables radiating to the dome. The
 *  real thing is one of the largest dome structures on earth (365 m across,
 *  twelve 100 m masts) and dwarfs everything around it — so it is a dominant
 *  3×3 footprint (owner playtest, 2026-06-13: "the O2 is enormous"), SW-
 *  anchored. The masts spike high past the canopy rim. */
export const O2_W = 3;
export const O2_H = 3;
export function o2domeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(O2_W, O2_H, { swAnchor: true });
  void seed;
  const [cx, cyB] = iso.P(O2_W / 2, O2_H / 2, 0);
  const R = 0.5 * O2_W * (CELL_W / 2);
  const ZR = R * 0.46;
  // a tall billowing canopy so the dome READS as a dome, not a flat disc, and
  // stands proud of the surrounding terraces (owner playtest: it must dominate)
  const domeH = 64 * RES;
  iso.shadow(0.18, 0.4, O2_W - 0.14, O2_H - 0.24, 0.2, 0.2);
  // a smooth dome profile point: rim at angle a, lifted onto the canopy by a
  // cosine of its radial fraction (1 at centre → 0 at rim)
  const dome = (s: number, lift: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * R * s, cyB - lift + Math.sin(a) * ZR * s]);
    }
    return pts;
  };
  // build the bulging top surface as concentric rings lifted by a dome curve
  // (so the white canopy is a solid swelling cap, not a flat lid)
  iso.r.poly([...dome(1, 6 * RES), ...dome(1, 0).reverse()], shaded(COLORS.white, 0.12));
  for (let ring = 5; ring >= 0; ring--) {
    const s = ring / 5; // 1 (rim) → 0 (apex)
    const lift = 6 * RES + domeH * Math.sqrt(1 - s * s); // hemispherical rise
    const shade = ring >= 4 ? hex('#e6e3df') : ring >= 2 ? hex('#f0eeea') : COLORS.white;
    iso.r.poly(dome(Math.max(s, 0.02), lift), shade);
  }
  const apex: Pt = [cx + R * 0.04, cyB - 6 * RES - domeH];
  // the radial seam-cables fanning over the canopy
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const e: Pt = [cx + Math.cos(a) * R, cyB - 6 * RES + Math.sin(a) * ZR];
    iso.r.line(apex, e, 0.5 * RES, alpha(hex('#c9c6cf'), 0.6));
  }
  iso.r.polyline(dome(1, 6 * RES), INK_W * 0.8, alpha(INK, 0.6), true);
  // the twelve tall yellow masts spiking high past the rim, cable-stayed
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const bx = cx + Math.cos(a) * R * 1.02;
    const by = cyB - 3 * RES + Math.sin(a) * ZR * 1.02;
    const tx = bx + Math.cos(a) * 8 * RES;
    const ty = by - 78 * RES;
    iso.r.line([bx, by], [tx, ty], 1.6 * RES, COLORS.orange);
    iso.r.line([tx, ty], apex, 0.4 * RES, alpha(COLORS.steel, 0.5));
  }
  return iso.build();
}

/** CRYSTAL PALACE transmitter mast: a slim red-and-white lattice tower on
 *  the south ridge — a thin vertical hero spike. 1×1. */
export function palacemastTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const u = 0.5;
  const v = 0.52;
  const H = 150;
  const w0 = 0.12;
  const w1 = 0.02;
  iso.shadow(u - w0, v - w0 * 0.4, u + w0, v + w0, 0.4, 0.24);
  // tapering lattice: four leg lines + cross bracing, banded red/white
  const legAt = (du: number, dv: number, z: number): Pt => {
    const t = z / H;
    const w = w0 + (w1 - w0) * t;
    return iso.P(u + du * w, v + dv * w, z);
  };
  const legs: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [du, dv] of legs) {
    iso.r.line(legAt(du, dv, 0), legAt(du, dv, H), 1.1 * RES, COLORS.steelDark);
  }
  // banded bracing (alternating warm + white reads as the aviation paint)
  for (let z = 6; z < H - 6; z += 9) {
    const band = (Math.floor(z / 9) % 2 === 0 ? COLORS.orange : COLORS.white);
    iso.r.line(legAt(-1, 1, z), legAt(1, -1, z + 9), 0.7 * RES, alpha(band, 0.9));
    iso.r.line(legAt(1, 1, z), legAt(-1, -1, z + 9), 0.7 * RES, alpha(band, 0.8));
    iso.r.line(legAt(-1, -1, z), legAt(1, -1, z), 0.6 * RES, alpha(band, 0.85));
  }
  // antenna stack + the red aircraft-warning lamp at the very top
  iso.r.line(iso.P(u, v, H), iso.P(u, v, H + 26), 1.2 * RES, COLORS.steel);
  for (const z of [H + 6, H + 13, H + 20]) {
    iso.r.line(iso.P(u - 0.02, v, z), iso.P(u + 0.02, v, z), 1.4 * RES, alpha(COLORS.steel, 0.9));
  }
  const lamp = iso.P(u, v, H + 28);
  iso.r.line([lamp[0] - 1.6 * RES, lamp[1]], [lamp[0] + 1.6 * RES, lamp[1]], 2.2 * RES, hex('#ff5a4a'));
  // a faint gleam catches the upper mast
  iso.gleam(iso.P(u + w1, v, H * 0.7), iso.P(u + w1, v, H), 1 * RES);
  return iso.build();
}

/** ALEXANDRA PALACE on its north hill: a long Victorian palace with the
 *  great central rose-window hall, a hipped roof and the BBC transmitter
 *  mast — a broad horizontal hero on a 2×1 (SW-anchored). */
export function allypallyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 1, { swAnchor: true });
  void seed;
  const PAL = hex('#e0cda6');
  iso.shadow(0.12, 0.2, 1.88, 0.84, 0.2, 0.22);
  // the long palace block, slightly stepped centre hall
  iso.box(0.12, 0.24, 1.88, 0.78, 0, 28, PAL);
  iso.box(0.74, 0.18, 1.26, 0.84, 0, 36, lighten(PAL, 0.05));
  // arched window arcade down the south face
  iso.windowsLeft(0.78, 0.18, 1.82, 8, 22, 12, alpha(COLORS.glassDark, 0.92), COLORS.white);
  // the great rose window in the central hall gable
  const g = iso.P(1.0, 0.84, 24);
  const rose: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rose.push([g[0] + Math.cos(a) * 6 * RES, g[1] + Math.sin(a) * 5.4 * RES]);
  }
  iso.r.poly(rose, alpha(COLORS.glassDark, 0.92));
  iso.r.polyline(rose, INK_W * 0.5, COLORS.white, true);
  iso.r.line([g[0], g[1] - 6 * RES], [g[0], g[1] + 6 * RES], 0.6 * RES, alpha(COLORS.white, 0.8));
  iso.r.line([g[0] - 6 * RES, g[1]], [g[0] + 6 * RES, g[1]], 0.6 * RES, alpha(COLORS.white, 0.8));
  // hipped roofs + a pair of corner pavilion towers with lead caps
  iso.hip(0.74, 0.16, 1.26, 0.86, 36, 12, hex('#5d6b80'));
  for (const cu of [0.2, 1.8] as const) {
    iso.box(cu - 0.08, 0.32, cu + 0.08, 0.5, 28, 48, PAL);
    iso.hip(cu - 0.1, 0.3, cu + 0.1, 0.52, 48, 9, hex('#5d6b80'));
  }
  // the transmitter mast rising behind the east end
  const mb = iso.P(1.74, 0.34, 28);
  iso.r.line(mb, [mb[0], mb[1] - 64 * RES], 1.3 * RES, COLORS.steelDark);
  for (const dz of [18, 34, 50]) {
    iso.r.line([mb[0] - 3 * RES, mb[1] - dz * RES], [mb[0] + 3 * RES, mb[1] - dz * RES], 0.7 * RES, alpha(COLORS.steel, 0.85));
  }
  iso.r.line([mb[0] - 1.4 * RES, mb[1] - 66 * RES], [mb[0] + 1.4 * RES, mb[1] - 66 * RES], 2 * RES, hex('#ff5a4a'));
  // the gleam runs the sun-facing roof ridge
  iso.gleam(iso.P(1.26, 0.18, 36), iso.P(1.82, 0.24, 28), 1.3 * RES);
  return iso.build();
}

/** ExCeL / ROYAL DOCKS: long parallel exhibition halls with their barrel
 *  roofs beside the dock water. The real ExCeL is ~1 km of halls along the
 *  Royal Victoria Dock — so it's a long 3×1 hero (owner playtest, 2026-06-13:
 *  honest relative scale), SW-anchored. */
export const EXCEL_W = 3;
export const EXCEL_H = 1;
export function excelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(EXCEL_W, EXCEL_H, { swAnchor: true });
  void seed;
  const HALL = hex('#d4dae2');
  const X0 = 0.14;
  const X1 = EXCEL_W - 0.14;
  const XW0 = 0.1;
  const XW1 = EXCEL_W - 0.1;
  iso.shadow(XW0, 0.16, XW1 - 0.04, 0.88, 0.2, 0.2);
  // a strip of dock water along the south edge (the Royal Docks)
  iso.quad(XW0, 0.86, XW1, 0.99, 0, COLORS.waterDeep, COLORS.water);
  iso.r.line(iso.P(XW0, 0.86, 0), iso.P(XW1, 0.86, 0), INK_W * 0.6, alpha(COLORS.waterGlint, 0.5));
  // the two long halls, each with a curved barrel roof + clerestory band
  for (const v0 of [0.2, 0.52] as const) {
    const v1 = v0 + 0.26;
    iso.box(X0, v0, X1, v1, 0, 18, HALL);
    const ridge = 24;
    const vm = (v0 + v1) / 2;
    iso.r.poly(
      [iso.P(X0, v0, 18), iso.P(X1, v0, 18), iso.P(X1, vm, ridge), iso.P(X0, vm, ridge)],
      top(HALL, 0.3),
    );
    iso.r.poly(
      [iso.P(X0, vm, ridge), iso.P(X1, vm, ridge), iso.P(X1, v1, 18), iso.P(X0, v1, 18)],
      lit(HALL, 0.04),
    );
    iso.r.line(iso.P(X0, vm, ridge), iso.P(X1, vm, ridge), INK_W * 0.6, alpha(INK, 0.5));
    iso.windowsLeft(v1, X0 + 0.06, X1 - 0.06, 11, 15, 13, alpha(COLORS.glassSky, 0.9), undefined);
    iso.r.poly([iso.P(X0 + 0.06, v1, 7), iso.P(X1 - 0.08, v1, 7), iso.P(X1 - 0.08, v1, 4), iso.P(X0 + 0.06, v1, 4)], COLORS.orange);
    iso.gleam(iso.P(EXCEL_W * 0.5, vm, ridge), iso.P(X1, vm, ridge), 1.0 * RES);
  }
  return iso.build();
}

/** KEW PALM HOUSE: the curved Victorian glasshouse — a pale green-glass
 *  barrel-vaulted nave running along the v-axis, the lower side aisles and
 *  a taller raised central crossing, ribbed glazing bars. 1×1. */
export function kewhouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const GLASS = COLORS.greenhouseGlass;
  iso.shadow(0.16, 0.22, 0.84, 0.74, 0.18, 0.2);
  // white stylobate base the house sits on
  iso.box(0.18, 0.24, 0.82, 0.78, 0, 4, COLORS.white);
  // a rounded glasshouse limb running along v: a half-round vault swept
  // from the v0 end to the v1 show-front, drawn as stacked curved bands
  const limb = (u0: number, u1: number, v0: number, v1: number, h: number): void => {
    const um = (u0 + u1) / 2;
    const hw = (u1 - u0) / 2;
    const ribs = 7;
    for (let s = 0; s < ribs; s++) {
      const t0 = s / ribs;
      const t1 = (s + 1) / ribs;
      const seg = (lift0: number, lift1: number, col: RGBA): void => {
        const a0 = Math.PI * lift0;
        const a1 = Math.PI * lift1;
        iso.r.poly(
          [
            iso.P(um + Math.cos(a0) * hw, v0 + (v1 - v0) * t0, h * Math.sin(a0)),
            iso.P(um + Math.cos(a1) * hw, v0 + (v1 - v0) * t0, h * Math.sin(a1)),
            iso.P(um + Math.cos(a1) * hw, v0 + (v1 - v0) * t1, h * Math.sin(a1)),
            iso.P(um + Math.cos(a0) * hw, v0 + (v1 - v0) * t1, h * Math.sin(a0)),
          ],
          col,
        );
      };
      seg(0.0, 0.34, shaded(GLASS, 0.04));
      seg(0.34, 0.66, lit(GLASS, 0.14));
      seg(0.66, 1.0, lighten(GLASS, 0.2));
    }
    // glazing-bar ribs across the vault
    for (let s = 0; s <= ribs; s++) {
      const t = s / ribs;
      const pts: Pt[] = [];
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI * (k / 8);
        pts.push(iso.P(um + Math.cos(a) * hw, v0 + (v1 - v0) * t, h * Math.sin(a)));
      }
      iso.r.polyline(pts, 0.5 * RES, alpha(COLORS.white, 0.55));
    }
    // the v1 show-front half-round arch, inked
    const endArch: Pt[] = [];
    for (let k = 0; k <= 12; k++) {
      const a = Math.PI * (k / 12);
      endArch.push(iso.P(um + Math.cos(a) * hw, v1, h * Math.sin(a)));
    }
    iso.r.polyline(endArch, INK_W * 0.6, alpha(INK, 0.55));
  };
  // low side aisles then the taller central nave
  limb(0.24, 0.76, 0.3, 0.72, 18);
  limb(0.34, 0.66, 0.26, 0.74, 34);
  // a couple of palm crowns showing through the glass apex
  for (const v of [0.42, 0.58]) {
    const apex = iso.P(0.5, v, 30);
    for (const da of [-0.6, -0.2, 0.2, 0.6]) {
      iso.r.line(apex, [apex[0] + Math.sin(da) * 6 * RES, apex[1] - 6 * RES - Math.cos(da) * 3 * RES], 0.7 * RES, alpha(hex('#3c7a38'), 0.7));
    }
  }
  // gleam catches the lit flank + a glint on the crown
  iso.gleam(iso.P(0.66, 0.3, 30), iso.P(0.66, 0.74, 30), 1 * RES);
  iso.glint(iso.P(0.5, 0.5, 34), 2.2 * RES);
  return iso.build();
}

/** BT TOWER: a slender cylindrical concrete-and-glass hero spike in the
 *  West End — banded glazing up the shaft, the lattice aerial galleries
 *  near the top and a thin antenna mast. 1×1, reads from far zoom. */
export function bttowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const [cx, cyB] = P(0.5, 0.52, 0);
  const H = 168;
  const Rb = 13 * RES;
  iso.shadow(0.4, 0.4, 0.62, 0.62, 0.34, 0.26);
  // cylindrical shaft: a tall lit/dusk-split column
  const col = (s: number): { lx: Pt; rx: Pt } => ({
    lx: [cx - Rb * s, cyB],
    rx: [cx + Rb * s, cyB],
  });
  void col;
  const yAt = (z: number): number => cyB - z * RES;
  // shaft body (two vertical halves: shaded SW + lit NE)
  iso.r.poly(
    [[cx - Rb, cyB], [cx, cyB + Rb * 0.4], [cx, yAt(H) + Rb * 0.4], [cx - Rb, yAt(H)]],
    shaded(COLORS.concrete, 0.12),
  );
  iso.r.poly(
    [[cx, cyB + Rb * 0.4], [cx + Rb, cyB], [cx + Rb, yAt(H)], [cx, yAt(H) + Rb * 0.4]],
    lit(COLORS.concrete, 0.06),
  );
  // banded glazing rings up the shaft
  for (let z = 16; z < H - 28; z += 11) {
    iso.r.poly(
      [[cx - Rb, yAt(z)], [cx, yAt(z) + Rb * 0.4], [cx + Rb, yAt(z)], [cx, yAt(z) - Rb * 0.4]],
      alpha(COLORS.glassSky, 0.85),
    );
    iso.r.poly(
      [[cx - Rb, yAt(z + 4)], [cx, yAt(z + 4) + Rb * 0.4], [cx + Rb, yAt(z + 4)], [cx, yAt(z + 4) - Rb * 0.4]],
      alpha(COLORS.glassDark, 0.7),
    );
  }
  // the aerial galleries: two wider lattice drums near the top
  for (const z of [H - 26, H - 14]) {
    const Rg = Rb * 1.5;
    iso.r.poly(
      [[cx - Rg, yAt(z)], [cx, yAt(z) + Rg * 0.4], [cx + Rg, yAt(z)], [cx, yAt(z) - Rg * 0.4]],
      COLORS.steel,
    );
    iso.r.poly(
      [[cx - Rg, yAt(z)], [cx, yAt(z) + Rg * 0.4], [cx + Rg, yAt(z)], [cx + Rg, yAt(z + 6)], [cx, yAt(z + 6) + Rg * 0.4], [cx - Rg, yAt(z + 6)]],
      alpha(COLORS.steelDark, 0.85),
    );
  }
  // antenna mast + warning lamp
  iso.r.line([cx, yAt(H)], [cx, yAt(H + 36)], 1.3 * RES, COLORS.steel);
  for (const dz of [10, 20]) iso.r.line([cx - 2.4 * RES, yAt(H + dz)], [cx + 2.4 * RES, yAt(H + dz)], 0.7 * RES, alpha(COLORS.steel, 0.8));
  iso.r.line([cx - 1.4 * RES, yAt(H + 38)], [cx + 1.4 * RES, yAt(H + 38)], 2 * RES, hex('#ff5a4a'));
  // silhouette ink + the gleam down the sun-facing (right) edge
  iso.r.line([cx + Rb, cyB], [cx + Rb, yAt(H)], INK_W * 0.7, alpha(INK, 0.6));
  iso.r.line([cx - Rb, cyB], [cx - Rb, yAt(H)], INK_W * 0.7, alpha(INK, 0.6));
  iso.gleam([cx + Rb * 0.9, yAt(H * 0.55)], [cx + Rb * 0.9, yAt(H - 28)], 1.1 * RES);
  return iso.build();
}

// --- Civic fabric: every town seed gets a reason to exist --------------------

/** Railway station: brick station house + glazed canopy over a platform. */
export function stationTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 30011 + 3);
  // brick station house with a slate gable
  iso.shadow(0.1, 0.16, 0.6, 0.58, 0.16, 0.2);
  iso.box(0.1, 0.16, 0.6, 0.58, 0, 24, BRICK);
  iso.gable(0.085, 0.145, 0.615, 0.595, 24, 10, 'u', hex('#575d78'), BRICK);
  // round-headed windows + double door on the street face
  iso.windowsLeft(0.58, 0.14, 0.42, 9, 18, 3, rng.chance(0.7) ? COLORS.glassLit : COLORS.glassHot, COLORS.white);
  iso.r.poly([P(0.46, 0.58, 14), P(0.56, 0.58, 14), P(0.56, 0.58, 0), P(0.46, 0.58, 0)], darken(BRICK, 0.35));
  iso.r.poly([P(0.45, 0.58, 16), P(0.57, 0.58, 16), P(0.57, 0.58, 14), P(0.45, 0.58, 14)], COLORS.white);
  // white station sign on the gable end
  iso.r.poly([P(0.6 + 0.001, 0.26, 20), P(0.6 + 0.001, 0.48, 20), P(0.6 + 0.001, 0.48, 16), P(0.6 + 0.001, 0.26, 16)], COLORS.white);
  // platform strip along the far side (where the rails run)
  iso.box(0.08, 0.66, 0.92, 0.84, 0, 3.5, COLORS.pavement, { ink: false, topC: lighten(COLORS.pavement, 0.06) });
  iso.r.line(P(0.08, 0.82, 3.5), P(0.92, 0.82, 3.5), INK_W * 0.7, alpha(COLORS.marking, 0.9));
  // glazed canopy on slim steel posts over the platform
  for (const u of [0.16, 0.4, 0.64, 0.84]) {
    iso.r.line(P(u, 0.75, 3.5), P(u, 0.75, 17), INK_W * 0.8, COLORS.steelDark);
  }
  iso.r.poly(
    [P(0.08, 0.62, 19), P(0.92, 0.62, 19), P(0.92, 0.88, 15), P(0.08, 0.88, 15)],
    alpha(COLORS.glassSky, 0.8),
  );
  iso.r.line(P(0.08, 0.88, 15), P(0.92, 0.88, 15), INK_W, INK);
  iso.r.line(P(0.08, 0.62, 19), P(0.92, 0.62, 19), INK_W * 0.8, alpha(COLORS.white, 0.9));
  // scalloped valance hint
  for (let u = 0.1; u < 0.9; u += 0.05) {
    iso.r.line(P(u, 0.88, 15), P(u + 0.025, 0.88, 13.4), INK_W * 0.5, alpha(INK, 0.6));
  }
  return iso.build();
}

/** Primary school: long low brick block + white-marked playground. */
export function schoolTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 40013 + 5);
  // long low brick school with big classroom windows
  iso.shadow(0.08, 0.1, 0.92, 0.42, 0.14, 0.2);
  iso.box(0.08, 0.1, 0.92, 0.42, 0, 18, BRICK);
  iso.gable(0.065, 0.085, 0.935, 0.435, 18, 8, 'u', hex('#6e6884'), BRICK);
  iso.windowsLeft(0.42, 0.12, 0.62, 6, 14, 4, rng.chance(0.5) ? COLORS.glassLit : COLORS.glassDark, COLORS.white);
  // entrance porch with a white canopy
  iso.box(0.68, 0.42, 0.84, 0.5, 0, 12, lighten(BRICK, 0.08));
  iso.quad(0.665, 0.41, 0.855, 0.52, 12, COLORS.white);
  iso.r.poly([P(0.71, 0.5, 9), P(0.81, 0.5, 9), P(0.81, 0.5, 0), P(0.71, 0.5, 0)], darken(BRICK, 0.35));
  // small bell cupola on the ridge
  iso.box(0.47, 0.235, 0.53, 0.295, 26, 32, COLORS.white);
  iso.hip(0.465, 0.23, 0.535, 0.3, 32, 4, hex('#46518f'));
  // tarmac playground with white games markings
  iso.quad(0.1, 0.56, 0.9, 0.96, 0, alpha(COLORS.road, 0.9), alpha(COLORS.roadDark, 0.9));
  const mk = alpha(COLORS.marking, 0.85);
  // netball circle
  {
    const [cx, cy] = P(0.36, 0.76, 0);
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * 0.1 * CELL_W * 0.5, cy + Math.sin(a) * 0.1 * CELL_W * 0.25]);
    }
    iso.r.polyline(pts, INK_W * 0.6, mk, true);
  }
  // hopscotch ladder
  for (let t = 0; t < 4; t++) {
    iso.r.line(P(0.62, 0.64 + t * 0.07, 0), P(0.72, 0.64 + t * 0.07, 0), INK_W * 0.55, mk);
  }
  iso.r.line(P(0.62, 0.64, 0), P(0.62, 0.85, 0), INK_W * 0.55, mk);
  iso.r.line(P(0.72, 0.64, 0), P(0.72, 0.85, 0), INK_W * 0.55, mk);
  // playground fence
  for (let t = 0.12; t < 0.92; t += 0.08) {
    iso.r.line(P(t, 0.96, 0), P(t, 0.96, 5), INK_W * 0.5, alpha(COLORS.steelDark, 0.8));
  }
  iso.r.line(P(0.1, 0.96, 5), P(0.9, 0.96, 5), INK_W * 0.5, alpha(COLORS.steelDark, 0.8));
  return iso.build();
}

/** Town hall: stone civic front, pediment over columns, tiny clock. */
export function townhallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const H = 30;
  iso.shadow(0.18, 0.2, 0.82, 0.62, 0.18, 0.22);
  iso.box(0.18, 0.2, 0.82, 0.62, 0, H, STONE);
  // hipped civic roof
  iso.hip(0.165, 0.185, 0.835, 0.635, H, 10, hex('#46518f'));
  // colonnaded front: white columns over wide steps
  iso.box(0.26, 0.62, 0.74, 0.7, 0, 3, STONE_DARK, { ink: false });
  for (let u = 0.3; u <= 0.71; u += 0.082) {
    iso.r.poly([P(u, 0.645, 22), P(u + 0.022, 0.645, 22), P(u + 0.022, 0.645, 3), P(u, 0.645, 3)], COLORS.white);
    iso.r.line(P(u + 0.011, 0.645, 22), P(u + 0.011, 0.645, 3), INK_W * 0.4, alpha(INK, 0.35));
  }
  // entablature + pediment triangle
  iso.r.poly([P(0.27, 0.645, 25), P(0.73, 0.645, 25), P(0.73, 0.645, 22), P(0.27, 0.645, 22)], lighten(STONE, 0.1));
  iso.r.poly([P(0.27, 0.645, 25), P(0.73, 0.645, 25), P(0.5, 0.645, 33)], lighten(STONE, 0.16));
  iso.r.polyline([P(0.27, 0.645, 25), P(0.73, 0.645, 25), P(0.5, 0.645, 33)], INK_W * 0.8, INK, true);
  // tiny clock in the pediment
  {
    const f = P(0.5, 0.645, 27.5);
    const r = 2.6 * RES;
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pts.push([f[0] + Math.cos(a) * r, f[1] + Math.sin(a) * r * 0.92]);
    }
    iso.r.poly(pts, COLORS.white);
    iso.r.polyline(pts, INK_W * 0.6, INK, true);
    iso.r.line(f, [f[0] + r * 0.5, f[1] - r * 0.25], 0.7 * RES, INK);
    iso.r.line(f, [f[0] - r * 0.15, f[1] - r * 0.55], 0.7 * RES, INK);
  }
  // windows on the right wing + flag on the roof
  iso.windowsRight(0.82, 0.26, 0.56, 12, 24, 3, COLORS.glassDark, COLORS.white);
  const fl = P(0.5, 0.41, 40);
  iso.r.line(fl, [fl[0], fl[1] - 8 * RES], 0.9 * RES, INK);
  iso.r.poly([[fl[0], fl[1] - 8 * RES], [fl[0] + 5 * RES, fl[1] - 6.8 * RES], [fl[0], fl[1] - 5.6 * RES]], COLORS.orange);
  return iso.build();
}

/** Victorian water tower: brick shaft with an overhanging tank top. */
export function watertowerTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const u0 = 0.4;
  const v0 = 0.4;
  const u1 = 0.6;
  const v1 = 0.6;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  // brick shaft with pilaster strips
  iso.box(u0, v0, u1, v1, 0, 52, BRICK);
  for (const t of [0.25, 0.75]) {
    const u = u0 + (u1 - u0) * t;
    iso.r.poly([P(u, v1 + 0.004, 50), P(u + 0.018, v1 + 0.004, 50), P(u + 0.018, v1 + 0.004, 2), P(u, v1 + 0.004, 2)], darken(BRICK, 0.12));
  }
  // slit windows up the shaft
  for (const z of [14, 30]) {
    iso.r.poly([P(0.475, v1, z + 7), P(0.505, v1, z + 7), P(0.505, v1, z), P(0.475, v1, z)], COLORS.glassDark);
  }
  // corbelled band + the overhanging tank
  iso.box(u0 - 0.025, v0 - 0.025, u1 + 0.025, v1 + 0.025, 52, 55, darken(BRICK, 0.08), { ink: false });
  iso.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, 55, 72, lighten(BRICK, 0.06));
  // tank rim + shallow cap
  iso.box(u0 - 0.058, v0 - 0.058, u1 + 0.058, v1 + 0.058, 72, 74, STONE_DARK, { ink: false });
  iso.hip(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, 74, 6, hex('#575d78'));
  return iso.build();
}

/** Sewage works: two circular clarifier tanks with radial scraper arms. */
export function sewageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50101 + 9);
  const tank = (u: number, v: number, rad: number, armA: number): void => {
    const [cx, cy] = P(u, v, 0);
    const RX = rad * (CELL_W / 2);
    const RY = RX * 0.5;
    const ring = (s: number, lift: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * RX * s, cy - lift + Math.sin(a) * RY * s]);
      }
      return pts;
    };
    const wallH = 4 * RES;
    // concrete tank wall + rim
    iso.r.poly([...ring(1, 0), ...ring(1, wallH).reverse()], COLORS.concrete);
    iso.r.poly(ring(1, wallH), lighten(COLORS.concrete, 0.12));
    // murky settled water with a faint sheen
    iso.r.poly(ring(0.88, wallH), hex('#4f6a5e'));
    iso.r.poly(ring(0.5, wallH), alpha(hex('#5d7a6a'), 0.7));
    iso.r.polyline(ring(1, wallH), INK_W * 0.8, INK, true);
    iso.r.polyline(ring(1, 0), INK_W * 0.6, alpha(INK, 0.5), true);
    // radial scraper arm + centre pivot
    iso.r.line([cx, cy - wallH], [cx + Math.cos(armA) * RX * 0.92, cy - wallH + Math.sin(armA) * RY * 0.92], 1.1 * RES, COLORS.steel);
    iso.r.poly([[cx - 1.6 * RES, cy - wallH - 3 * RES], [cx + 1.6 * RES, cy - wallH - 3 * RES], [cx + 1.6 * RES, cy - wallH + 1.5 * RES], [cx - 1.6 * RES, cy - wallH + 1.5 * RES]], COLORS.steelDark);
  };
  tank(0.32, 0.36, 0.24, rng.range(0, Math.PI * 2));
  tank(0.66, 0.68, 0.21, rng.range(0, Math.PI * 2));
  // pump house + pipe run between the tanks
  iso.box(0.74, 0.22, 0.9, 0.38, 0, 10, hex('#5d7a45'), { topC: shaded(hex('#46518f'), 0.05) });
  iso.hip(0.725, 0.205, 0.915, 0.395, 10, 5, hex('#46518f'));
  iso.r.line(P(0.45, 0.5, 2), P(0.58, 0.6, 2), 1.2 * RES, COLORS.steelDark);
  return iso.build();
}

/** Surface car park: marked bays, rows of parked cars, ticket kiosk. */
export function carparkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60107 + 11);
  // asphalt apron (the asset's own ground)
  iso.quad(0.04, 0.04, 0.96, 0.96, 0, COLORS.road, COLORS.roadDark);
  iso.r.polyline([P(0.04, 0.04, 0), P(0.96, 0.04, 0), P(0.96, 0.96, 0), P(0.04, 0.96, 0)], INK_W * 0.5, alpha(INK, 0.4), true);
  const mk = alpha(COLORS.marking, 0.8);
  const carColors: RGBA[] = [hex('#c9453a'), COLORS.white, COLORS.glassDark, COLORS.steel, hex('#3f8f8a'), hex('#46518f')];
  // two rows of bays with varied parked cars
  for (const v of [0.22, 0.62]) {
    iso.r.line(P(0.08, v + 0.13, 0), P(0.92, v + 0.13, 0), INK_W * 0.5, mk);
    for (let k = 0; k <= 6; k++) {
      const u = 0.08 + k * 0.14;
      iso.r.line(P(u, v, 0), P(u, v + 0.13, 0), INK_W * 0.5, mk);
      if (k < 6 && rng.chance(0.72)) {
        const c = carColors[rng.int(carColors.length)] ?? COLORS.white;
        const cu = u + 0.025;
        const cv = v + 0.02;
        iso.box(cu, cv, cu + 0.09, cv + 0.09, 0, 4.5, c, { ink: false });
        iso.quad(cu + 0.018, cv + 0.018, cu + 0.072, cv + 0.072, 4.7, alpha(COLORS.glassDark, 0.9));
        iso.r.polyline([P(cu, cv, 4.5), P(cu + 0.09, cv, 4.5), P(cu + 0.09, cv + 0.09, 4.5), P(cu, cv + 0.09, 4.5)], INK_W * 0.45, alpha(INK, 0.6), true);
      }
    }
  }
  // ticket kiosk + barrier at the entrance
  iso.box(0.84, 0.84, 0.94, 0.94, 0, 9, COLORS.white);
  iso.quad(0.832, 0.832, 0.948, 0.948, 9, COLORS.orange);
  iso.r.poly([P(0.84, 0.94, 7), P(0.94, 0.94, 7), P(0.94, 0.94, 4), P(0.84, 0.94, 4)], COLORS.glassDark);
  iso.r.line(P(0.8, 0.9, 4), P(0.62, 0.9, 5.5), INK_W * 0.9, COLORS.orange);
  iso.r.line(P(0.8, 0.9, 0), P(0.8, 0.9, 4), INK_W * 0.8, COLORS.steelDark);
  return iso.build();
}

/** Parish church: stone nave + square west tower with a slim spire. */
export function churchTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 70111 + 13);
  // nave with a steep slate gable
  iso.shadow(0.3, 0.34, 0.8, 0.62, 0.16, 0.2);
  iso.box(0.3, 0.34, 0.8, 0.62, 0, 18, STONE);
  iso.gable(0.285, 0.325, 0.815, 0.635, 18, 13, 'u', hex('#575d78'), STONE);
  // lancet windows along the nave
  for (const u of [0.4, 0.52, 0.64]) {
    iso.r.poly([P(u, 0.62, 14), P(u + 0.025, 0.62, 14), P(u + 0.025, 0.62, 5), P(u, 0.62, 5)], COLORS.glassDark);
    iso.r.line(P(u + 0.0125, 0.62, 14), P(u + 0.0125, 0.62, 5), INK_W * 0.4, alpha(COLORS.white, 0.7));
  }
  // square west tower with battlement band + slim spire
  iso.box(0.14, 0.36, 0.32, 0.6, 0, 38, STONE_DARK);
  iso.box(0.13, 0.35, 0.33, 0.61, 38, 41, STONE, { ink: false });
  // belfry louvres
  iso.r.poly([P(0.2, 0.6, 34), P(0.26, 0.6, 34), P(0.26, 0.6, 27), P(0.2, 0.6, 27)], darken(STONE_DARK, 0.3));
  iso.hip(0.16, 0.38, 0.3, 0.58, 41, 22, hex('#575d78'));
  // gilded cross atop the spire
  {
    const t = P(0.23, 0.48, 63);
    iso.r.line(t, [t[0], t[1] - 4.5 * RES], 0.9 * RES, COLORS.glassLit);
    iso.r.line([t[0] - 1.6 * RES, t[1] - 3.2 * RES], [t[0] + 1.6 * RES, t[1] - 3.2 * RES], 0.9 * RES, COLORS.glassLit);
  }
  // churchyard: path, gravestones, a yew
  iso.quad(0.5, 0.64, 0.58, 0.96, 0, alpha(COLORS.pavement, 0.85));
  for (let i = 0; i < 4; i++) {
    const u = 0.62 + rng.range(0, 0.22);
    const v = 0.7 + rng.range(0, 0.18);
    iso.box(u, v, u + 0.025, v + 0.012, 0, 4, STONE_DARK, { ink: false });
  }
  iso.cone(0.2, 0.76, 0.09, 24, COLORS.treeDeep);
  return iso.build();
}

/** Datacentre: windowless grey hall, roof packed with AC units, mesh
 *  fence, and a glowing status strip — hungry and impatient. */
/** The airport terminal: long glazed hall under a wave roof, control
 *  tower with its glass cab, and a tail fin peeking past the stand. */
export function airportTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  // apron
  iso.quad(0.02, 0.3, 0.98, 0.98, 0, COLORS.steelDark, darken(COLORS.steelDark, 0.12));
  // terminal hall: glass walls, white wave roof
  iso.shadow(0.06, 0.08, 0.8, 0.42, 0.16, 0.2);
  iso.box(0.06, 0.08, 0.8, 0.42, 0, 20, alpha(COLORS.glassSky, 0.95), {
    leftC: alpha(shaded(COLORS.glassSky, 0.15), 0.95),
    rightC: alpha(COLORS.glassSunset, 0.95),
    topC: COLORS.white,
  });
  for (const z of [22, 26] as const) {
    iso.r.poly(
      [iso.P(0.04, 0.06, z), iso.P(0.82, 0.06, z), iso.P(0.82, 0.44, z - 6), iso.P(0.04, 0.44, z - 6)],
      z === 22 ? COLORS.white : alpha(COLORS.white, 0.0),
    );
  }
  iso.r.polyline(
    [iso.P(0.04, 0.44, 16), iso.P(0.82, 0.44, 16)],
    INK_W,
    INK,
  );
  // control tower: shaft + flared glass cab
  iso.box(0.86, 0.18, 0.93, 0.25, 0, 42, COLORS.white);
  iso.box(0.83, 0.15, 0.96, 0.28, 42, 50, COLORS.glassDark, { topC: COLORS.white });
  iso.r.polyline(
    [iso.P(0.83, 0.28, 50), iso.P(0.96, 0.28, 50), iso.P(0.96, 0.15, 50)],
    INK_W,
    INK,
  );
  // a tail fin at the stand
  const [fx, fy] = iso.P(0.3, 0.72, 0);
  iso.r.poly(
    [[fx, fy], [fx + 4 * RES, fy - 14 * RES], [fx + 9 * RES, fy - 14 * RES], [fx + 7 * RES, fy]],
    COLORS.white,
  );
  iso.r.poly(
    [[fx + 4 * RES, fy - 14 * RES], [fx + 9 * RES, fy - 14 * RES], [fx + 8 * RES, fy - 10 * RES], [fx + 5 * RES, fy - 10 * RES]],
    COLORS.orange,
  );
  // stand markings
  iso.r.line(iso.P(0.2, 0.6, 0.5), iso.P(0.7, 0.6, 0.5), 1.6, alpha(COLORS.marking, 0.7));
  return iso.build();
}

export function datacentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 80147 + 15);
  const grey = hex('#8e93a3');
  // windowless hall
  iso.shadow(0.1, 0.14, 0.88, 0.66, 0.2, 0.24);
  iso.box(0.1, 0.14, 0.88, 0.66, 0, 30, grey, { topC: lighten(grey, 0.2) });
  // recessed panel joints on the street face
  for (let u = 0.22; u < 0.85; u += 0.13) {
    iso.r.line(P(u, 0.66, 27), P(u, 0.66, 2), INK_W * 0.5, alpha(INK, 0.25));
  }
  // glowing status strip wrapping the visible walls
  iso.r.poly([P(0.1, 0.66, 23), P(0.88, 0.66, 23), P(0.88, 0.66, 21), P(0.1, 0.66, 21)], alpha(hex('#4fd6b0'), 0.95));
  iso.r.poly([P(0.88, 0.14, 23), P(0.88, 0.66, 23), P(0.88, 0.66, 21), P(0.88, 0.14, 21)], alpha(hex('#4fd6b0'), 0.8));
  // a single security door
  iso.r.poly([P(0.7, 0.66, 12), P(0.78, 0.66, 12), P(0.78, 0.66, 0), P(0.7, 0.66, 0)], COLORS.steelDark);
  // roof packed with AC units
  for (let iu = 0; iu < 4; iu++) {
    for (let iv = 0; iv < 3; iv++) {
      const u = 0.16 + iu * 0.18;
      const v = 0.2 + iv * 0.16;
      iso.box(u, v, u + 0.1, v + 0.09, 30, 36, COLORS.steel, { ink: false });
      iso.quad(u + 0.015, v + 0.015, u + 0.085, v + 0.075, 36.2, rng.chance(0.5) ? COLORS.steelDark : darken(COLORS.steel, 0.3));
    }
  }
  // mesh perimeter fence with slim posts
  const fa = 0.04;
  const fb = 0.96;
  const fh = 7;
  for (let t = 0; t <= 1.001; t += 1 / 6) {
    for (const [u, v] of [
      [fa + (fb - fa) * t, fb],
      [fb, fa + (fb - fa) * t],
    ] as const) {
      iso.r.line(P(u, v, 0), P(u, v, fh), INK_W * 0.6, COLORS.steelDark);
    }
  }
  iso.r.line(P(fa, fb, fh), P(fb, fb, fh), INK_W * 0.5, alpha(COLORS.steel, 0.9));
  iso.r.line(P(fb, fa, fh), P(fb, fb, fh), INK_W * 0.5, alpha(COLORS.steel, 0.9));
  iso.r.line(P(fa, fb, fh * 0.55), P(fb, fb, fh * 0.55), INK_W * 0.4, alpha(COLORS.steel, 0.5));
  iso.r.line(P(fb, fa, fh * 0.55), P(fb, fb, fh * 0.55), INK_W * 0.4, alpha(COLORS.steel, 0.5));
  return iso.build();
}

// --- Bespoke Heathrow (owner: "its all concrete… specially design it") ------

/** HEATHROW, the concrete terminal island that sits BETWEEN the two
 *  parallel E–W runways: a continuous tarmac apron, the perimeter taxiway,
 *  the long glazed terminals with their wave roofs, satellite pier fingers
 *  with parked aircraft nosed onto the stands, the control tower, cargo
 *  sheds and a multi-storey car park. Everything tarmac/concrete, read from
 *  the iso camera as the real airport. A wide HEATHROW_W×HEATHROW_H tile
 *  stamp, SW-anchored so the chooser emits it on the reservation's
 *  (min x, max y) tile and standard placement covers the island. The
 *  runways themselves are `ground_runway` tiles laid to the north and south
 *  of this island (the air layer flies the real thresholds). */
export const HEATHROW_W = 8;
export const HEATHROW_H = 3;

export function heathrowTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(HEATHROW_W, HEATHROW_H, { swAnchor: true });
  const rng = new Rng(seed * 90163 + 17);
  const W = HEATHROW_W;
  const H = HEATHROW_H;
  const APRON = hex('#9b9aa6'); // light concrete apron
  const TAXI = hex('#8a8996'); // taxiway tarmac, a touch darker
  const TERM = hex('#cdd2da'); // pale terminal cladding
  const taxiMark = alpha(hex('#e8c84a'), 0.85); // yellow taxiway centreline
  const apronMark = alpha(COLORS.marking, 0.7);

  // (1) the whole island is concrete: a continuous apron slab edge-to-edge
  iso.shadow(0.08, 0.08, W - 0.08, H - 0.08, 0.16, 0.18);
  iso.quad(0.05, 0.05, W - 0.05, H - 0.05, 0, APRON, shaded(APRON, 0.08));
  iso.r.polyline(
    [iso.P(0.05, 0.05, 0), iso.P(W - 0.05, 0.05, 0), iso.P(W - 0.05, H - 0.05, 0), iso.P(0.05, H - 0.05, 0)],
    INK_W * 0.5,
    alpha(INK, 0.4),
    true,
  );
  // perimeter taxiways north + south (between island and each runway), with
  // dashed yellow centrelines
  for (const v of [0.24, H - 0.24]) {
    iso.quad(0.08, v - 0.11, W - 0.08, v + 0.11, 0, TAXI);
    for (let u = 0.3; u < W - 0.3; u += 0.42) {
      iso.r.line(iso.P(u, v, 0.4), iso.P(u + 0.24, v, 0.4), 1.1 * RES, taxiMark);
    }
  }
  // taxiway links crossing the island onto the runways
  for (const u of [1.0, 2.3, 3.7, 5.1, 6.5]) {
    iso.r.line(iso.P(u, 0.24, 0.4), iso.P(u, H - 0.24, 0.4), 1.1 * RES, taxiMark);
  }

  // (2) the central terminal spine: a glazed hall with a white wave roof
  // running W–E down the middle of the island
  const tV0 = H / 2 - 0.2;
  const tV1 = H / 2 + 0.2;
  const tVm = H / 2;
  const tU0 = 1.0;
  const tU1 = W - 2.4;
  iso.box(tU0, tV0, tU1, tV1, 0, 16, TERM);
  // long clerestory glazing down the south face
  iso.windowsLeft(tV1, tU0 + 0.1, tU1 - 0.1, 6, 13, Math.round((tU1 - tU0) * 1.6), alpha(COLORS.glassSky, 0.92), undefined);
  // white wave roof: shallow alternating barrels
  for (let u = tU0; u < tU1 - 0.01; u += 0.7) {
    const uu = Math.min(u + 0.7, tU1);
    iso.r.poly(
      [iso.P(u, tV0, 16), iso.P(uu, tV0, 16), iso.P(uu, tVm, 22), iso.P(u, tVm, 22)],
      top(COLORS.white, 0.2),
    );
    iso.r.poly(
      [iso.P(u, tVm, 22), iso.P(uu, tVm, 22), iso.P(uu, tV1, 16), iso.P(u, tV1, 16)],
      lit(COLORS.white, 0.0),
    );
    iso.r.line(iso.P(u, tVm, 22), iso.P(uu, tVm, 22), INK_W * 0.5, alpha(INK, 0.4));
    iso.gleam(iso.P(u, tVm, 22), iso.P(uu, tVm, 22), 0.9 * RES); // sun-facing crest
  }

  // (3) satellite PIER fingers reaching N and S off the spine, parked
  // aircraft nosed onto the stands either side
  const drawPlane = (px: number, py: number, dir: number, scl = 1): void => {
    const [bx, by] = iso.P(px, py, 1);
    const L = 12 * RES * scl;
    const wsp = 9 * RES * scl;
    iso.r.line([bx, by - dir * L * 0.5], [bx, by + dir * L * 0.5], 2.4 * RES * scl, COLORS.white);
    iso.r.line([bx, by - dir * L * 0.5], [bx, by + dir * L * 0.5], 0.6 * RES, alpha(INK, 0.5));
    iso.r.line([bx, by], [bx - wsp, by + dir * wsp * 0.5], 1.6 * RES * scl, COLORS.white);
    iso.r.line([bx, by], [bx + wsp, by + dir * wsp * 0.5], 1.6 * RES * scl, COLORS.white);
    iso.r.line([bx, by + dir * L * 0.42], [bx, by + dir * L * 0.5], 3.6 * RES * scl, COLORS.orange);
  };
  for (const fu of [1.6, 3.0, 4.4, 5.8] as const) {
    iso.box(fu - 0.13, 0.46, fu + 0.13, tV0 - 0.04, 0, 8, TERM); // north finger
    iso.hip(fu - 0.15, 0.44, fu + 0.15, tV0 - 0.02, 8, 3.5, lighten(TERM, 0.1));
    iso.box(fu - 0.13, tV1 + 0.04, fu + 0.13, H - 0.46, 0, 8, TERM); // south finger
    iso.hip(fu - 0.15, tV1 + 0.02, fu + 0.15, H - 0.44, 8, 3.5, lighten(TERM, 0.1));
    // painted stand lead-in lines, then the parked aircraft either side
    iso.r.line(iso.P(fu, tV0, 0.4), iso.P(fu, 0.44, 0.4), 0.6 * RES, apronMark);
    iso.r.line(iso.P(fu, tV1, 0.4), iso.P(fu, H - 0.44, 0.4), 0.6 * RES, apronMark);
    drawPlane(fu - 0.28, 0.56, -1, 0.88);
    drawPlane(fu + 0.28, 0.56, -1, 0.88);
    drawPlane(fu - 0.28, H - 0.58, 1, 0.88);
    drawPlane(fu + 0.28, H - 0.58, 1, 0.88);
  }

  // (4) the CONTROL TOWER at the east end: tall shaft, flared glass cab —
  // the hero of the island
  const ctU = W - 1.7;
  iso.box(ctU - 0.09, tVm - 0.09, ctU + 0.09, tVm + 0.09, 0, 44, COLORS.white);
  iso.box(ctU - 0.16, tVm - 0.16, ctU + 0.16, tVm + 0.16, 44, 54, COLORS.glassDark, { topC: COLORS.white });
  iso.r.polyline(
    [iso.P(ctU - 0.16, tVm + 0.16, 54), iso.P(ctU + 0.16, tVm + 0.16, 54), iso.P(ctU + 0.16, tVm - 0.16, 54)],
    INK_W,
    INK,
  );
  iso.r.line(iso.P(ctU, tVm, 54), iso.P(ctU, tVm, 62), 1 * RES, COLORS.steel);
  iso.gleam(iso.P(ctU + 0.16, tVm - 0.16, 54), iso.P(ctU + 0.16, tVm + 0.16, 44), 1.2 * RES);
  iso.glint(iso.P(ctU, tVm, 62), 2 * RES);

  // (5) CARGO shed + a MULTI-STOREY CAR PARK at the west end
  iso.box(W - 1.9, 0.5, W - 0.7, 0.92, 0, 12, hex('#a9adb8')); // cargo shed
  iso.gable(W - 1.92, 0.48, W - 0.68, 0.94, 12, 4, 'u', hex('#7d8390'), hex('#a9adb8'));
  iso.box(0.34, tVm - 0.42, 0.86, tVm + 0.42, 0, 20, COLORS.concrete); // MSCP
  for (const z of [6, 12, 17]) {
    iso.r.line(iso.P(0.34, tVm + 0.42, z), iso.P(0.86, tVm + 0.42, z), 0.8 * RES, alpha(darken(COLORS.concrete, 0.2), 0.8));
    iso.r.line(iso.P(0.86, tVm - 0.42, z), iso.P(0.86, tVm + 0.42, z), 0.8 * RES, alpha(darken(COLORS.concrete, 0.2), 0.7));
  }
  // cargo containers + service vehicles dotted on the apron
  const dots: RGBA[] = [COLORS.orange, hex('#3f8f8a'), hex('#c9453a'), COLORS.steel];
  for (let k = 0; k < 8; k++) {
    const u = rng.range(1.0, W - 1.0);
    const v = rng.chance(0.5) ? rng.range(0.4, 0.62) : rng.range(H - 0.62, H - 0.4);
    const c = dots[rng.int(dots.length)] ?? COLORS.steel;
    iso.box(u, v, u + 0.06, v + 0.045, 0, 2.2, c, { ink: false });
  }
  return iso.build();
}

// --- Queen Elizabeth Olympic Park, Stratford (owner, 2026-06-13) -------------
// Four heroes of the 2012 park, true to their relative placement on the Lea:
// the VeloPark to the north, the Stadium bowl (existing stadiumTile) centre,
// the Orbit tower between it and Westfield, and the Westfield retail mass SE.

/** LEE VALLEY VELOPARK: the cycling track's signature double-curved
 *  hyperbolic-paraboloid "Pringle" roof — pale timber cladding that dips at
 *  the centre and lifts at the two ends, over a low glazed concourse band.
 *  A compact 1×1 read from far zoom by the saddle silhouette. */
export function velodromeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const TIMBER = hex('#caa46e'); // warm western-red-cedar cladding
  const u0 = 0.14;
  const u1 = 0.86;
  const v0 = 0.2;
  const v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.18, 0.2);
  // the low glazed concourse drum the roof floats on
  iso.box(u0, v0, u1, v1, 0, 8, lighten(COLORS.concrete, 0.06), {
    topC: lighten(COLORS.concrete, 0.14),
  });
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 2, 7, 9, alpha(COLORS.glassSky, 0.9), undefined);
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 2, 7, 7, alpha(COLORS.glassSunset, 0.85), undefined);
  // the saddle roof: a grid of timber panels whose height follows a hypar —
  // z lifts toward the u-ends and sags across the middle of the v span.
  const um = (u0 + u1) / 2;
  const baseZ = 12;
  const lift = 22; // end-rise of the saddle
  const sag = 13; // mid-span dip across v
  const roofZ = (u: number, v: number): number => {
    const su = (u - um) / ((u1 - u0) / 2); // -1..1 across u
    const sv = (v - (v0 + v1) / 2) / ((v1 - v0) / 2); // -1..1 across v
    return baseZ + lift * (su * su) - sag * (1 - sv * sv);
  };
  const NU = 7;
  const NV = 6;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const ua = u0 + ((u1 - u0) * i) / NU;
      const ub = u0 + ((u1 - u0) * (i + 1)) / NU;
      const va = v0 + ((v1 - v0) * j) / NV;
      const vb = v0 + ((v1 - v0) * (j + 1)) / NV;
      // shade each panel by its facing: end panels (high) catch the warmth,
      // mid panels sit in soft shade — sells the curved saddle
      const mid = roofZ((ua + ub) / 2, (va + vb) / 2);
      const t = (mid - (baseZ - sag)) / (baseZ + lift);
      const col = mix(shaded(TIMBER, 0.12), lit(TIMBER, 0.16), Math.max(0, Math.min(1, t)));
      iso.r.poly(
        [
          iso.P(ua, va, roofZ(ua, va)),
          iso.P(ub, va, roofZ(ub, va)),
          iso.P(ub, vb, roofZ(ub, vb)),
          iso.P(ua, vb, roofZ(ua, vb)),
        ],
        col,
      );
    }
  }
  // timber seam lines along the u panel joints (reads the cedar boarding)
  for (let i = 0; i <= NU; i++) {
    const u = u0 + ((u1 - u0) * i) / NU;
    const pts: Pt[] = [];
    for (let j = 0; j <= NV; j++) {
      const v = v0 + ((v1 - v0) * j) / NV;
      pts.push(iso.P(u, v, roofZ(u, v)));
    }
    iso.r.polyline(pts, 0.5 * RES, alpha(darken(TIMBER, 0.22), 0.7));
  }
  // ink the two swooping eave edges (the saddle silhouette) + the high rim
  const eave = (v: number): void => {
    const pts: Pt[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = u0 + ((u1 - u0) * i) / NU;
      pts.push(iso.P(u, v, roofZ(u, v)));
    }
    iso.r.polyline(pts, INK_W * 0.8, alpha(INK, 0.7));
  };
  eave(v0);
  eave(v1);
  // a pale glazed clerestory strip the timber sits over at the dipped centre
  iso.r.line(iso.P(u0, (v0 + v1) / 2, roofZ(u0, (v0 + v1) / 2)), iso.P(u1, (v0 + v1) / 2, roofZ(u1, (v0 + v1) / 2)), 0.6 * RES, alpha(COLORS.white, 0.5));
  // the gleam catches the sun-facing risen end of the roof
  iso.gleam(iso.P(u1, v0 + 0.1, roofZ(u1, v0 + 0.1)), iso.P(u1, v1 - 0.1, roofZ(u1, v1 - 0.1)), 1.1 * RES);
  return iso.build();
}

/** THE ARCELORMITTAL ORBIT: Britain's tallest sculpture — a looping tangle of
 *  bright-red tubular steel lattice spiralling up to a twin-deck observation
 *  platform, a single straight spine mast, and the looping slide. A slender
 *  1×1 hero spike; its sun-facing red steel takes the warm specular gleam. */
export function orbitTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  void seed;
  const RED = hex('#d23b34'); // ArcelorMittal red
  const REDLIT = lit(RED, 0.18);
  const REDSH = shaded(RED, 0.2);
  const [cx, cyB] = P(0.52, 0.54, 0);
  const H = 150;
  const Rb = 18 * RES; // base spread of the helix
  const yAt = (z: number): number => cyB - z * RES;
  iso.shadow(0.28, 0.34, 0.78, 0.74, 0.34, 0.24);
  // a small concrete pad + the splayed support legs
  iso.box(0.34, 0.4, 0.7, 0.72, 0, 5, lighten(COLORS.concrete, 0.05), { ink: false });
  for (const a of [0.4, 2.0, 3.7, 5.2]) {
    const lx = cx + Math.cos(a) * Rb;
    const ly = cyB + Math.sin(a) * Rb * 0.5;
    iso.r.line([lx, ly], [cx + Math.cos(a) * Rb * 0.3, yAt(34)], 1.5 * RES, a < 2.5 ? REDLIT : REDSH);
  }
  // the looping helix lattice: a dense tangle of intertwined red tubes
  // corkscrewing up, radius bulging in the lower body and easing in toward the
  // observation deck — the Orbit's signature knot. Cull the deep-back arcs so
  // the loops read as foreground tangle, not a solid mass; wobble the radius so
  // the tubes weave rather than march in a clean spiral.
  const helix = (phase: number, turns: number, col: RGBA, w: number, wob: number): void => {
    const pts: Pt[] = [];
    const STEPS = 110;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const z = 8 + (H - 18) * t;
      // bulge: widest ~40% up, drawing in to the deck — the trumpet body
      const r = Rb * (0.62 + 0.55 * Math.sin(Math.PI * (0.18 + 0.7 * t)) - 0.18 * t)
        + wob * Math.sin(t * 9 + phase);
      const a = phase + t * turns * Math.PI * 2;
      const c = Math.cos(a);
      if (c < -0.32) {
        if (pts.length > 1) iso.r.polyline(pts, w, col);
        pts.length = 0;
        continue;
      }
      pts.push([cx + c * r, yAt(z) + Math.sin(a) * r * 0.32]);
    }
    if (pts.length > 1) iso.r.polyline(pts, w, col);
  };
  helix(0.0, 3.4, REDSH, 1.7 * RES, 1.5 * RES); // deeper shaded tangle behind
  helix(1.1, 3.0, alpha(RED, 0.92), 1.6 * RES, -2.2 * RES); // mid weave
  helix(2.5, 3.6, REDLIT, 2.0 * RES, 1.0 * RES); // bright sun-facing front loops
  helix(3.9, 2.8, alpha(REDLIT, 0.85), 1.5 * RES, 2.6 * RES); // outer flares
  // diagonal lacing struts between the tubes (the trihex lattice feel)
  for (let k = 1; k < 13; k++) {
    const t = k / 13;
    const z = 8 + (H - 18) * t;
    const r = Rb * (0.62 + 0.55 * Math.sin(Math.PI * (0.18 + 0.7 * t)) - 0.18 * t);
    const a1 = 2.5 + t * 3.6 * Math.PI * 2;
    const a2 = a1 + 1.3;
    if (Math.cos(a1) < -0.15 && Math.cos(a2) < -0.15) continue;
    iso.r.line(
      [cx + Math.cos(a1) * r, yAt(z) + Math.sin(a1) * r * 0.32],
      [cx + Math.cos(a2) * r * 0.9, yAt(z + 8) + Math.sin(a2) * r * 0.9 * 0.32],
      0.7 * RES,
      alpha(RED, 0.8),
    );
  }
  // the straight spine mast through the core
  iso.r.line([cx, yAt(6)], [cx, yAt(H + 6)], 1.6 * RES, REDLIT);
  // the twin observation decks near the top: two flat red discs
  for (const z of [H - 26, H - 16]) {
    const rr = 9 * RES;
    const disc: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      disc.push([cx + Math.cos(a) * rr, yAt(z) + Math.sin(a) * rr * 0.36]);
    }
    iso.r.poly(disc, z === H - 16 ? top(RED, 0.2) : REDSH);
    iso.r.polyline(disc, INK_W * 0.5, alpha(INK, 0.6), true);
    // glazed viewing band under the upper deck
    if (z === H - 26) iso.r.poly([...disc.slice(0, 10), ...disc.slice(0, 10).map(([x, y]): Pt => [x, y + 4 * RES]).reverse()], alpha(COLORS.glassDark, 0.85));
  }
  // the looping slide swooping down the sun-facing side (a coiled steel ring)
  const slide: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const z = (H - 30) * (1 - t) + 10;
    const a = 1.2 + t * 2.4 * Math.PI;
    const r = (Rb * 1.18) * (0.5 + 0.5 * t);
    const c = Math.cos(a);
    if (c < -0.2) {
      if (slide.length > 1) iso.r.polyline(slide, 1.0 * RES, alpha(COLORS.steelDark, 0.85));
      slide.length = 0;
      continue;
    }
    slide.push([cx + c * r, yAt(z) + Math.sin(a) * r * 0.3]);
  }
  if (slide.length > 1) iso.r.polyline(slide, 1.0 * RES, alpha(COLORS.steelDark, 0.85));
  // mast finial + warm specular gleam down the sun-facing tubes
  iso.glint([cx, yAt(H + 6)], 2 * RES);
  iso.gleam([cx + Rb * 0.7, yAt(H * 0.5)], [cx + Rb * 0.4, yAt(H - 18)], 1.2 * RES);
  return iso.build();
}

/** WESTFIELD STRATFORD CITY: the big retail mass beside the park — a long
 *  glazed mall hall with a barrel atrium, an orange brand band over the grand
 *  entrance, and a pair of office/residential blocks rising behind it (the
 *  dense Stratford City quarter). A 2×2 SW-anchored precinct: out-scales the
 *  generic mall so the Olympic-quarter retail reads as the big one. */
export function westfieldTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true });
  void seed;
  const CLAD = hex('#dcd2c0'); // pale stone-cream cladding
  iso.shadow(0.12, 0.2, 1.88, 1.86, 0.22, 0.24);
  // the long retail hall block filling most of the precinct
  iso.box(0.16, 0.24, 1.7, 1.66, 0, 26, CLAD);
  // big shopfront glazing along the south + east faces
  iso.windowsLeft(1.66, 0.26, 1.6, 3, 14, 12, alpha(COLORS.glassSky, 0.9), COLORS.white);
  iso.windowsRight(1.7, 0.34, 1.58, 6, 18, 9, alpha(COLORS.glassSunset, 0.85), COLORS.white);
  // the barrel-vaulted glass atrium running down the spine
  for (let s = 0; s < 4; s++) {
    const v0 = 0.42 + s * 0.3;
    const v1 = v0 + 0.18;
    iso.r.poly(
      [iso.P(0.4, v0, 26), iso.P(1.5, v0, 26), iso.P(1.5, (v0 + v1) / 2, 33), iso.P(0.4, (v0 + v1) / 2, 33)],
      alpha(COLORS.glassSky, 0.92),
    );
    iso.r.poly(
      [iso.P(0.4, (v0 + v1) / 2, 33), iso.P(1.5, (v0 + v1) / 2, 33), iso.P(1.5, v1, 26), iso.P(0.4, v1, 26)],
      alpha(lighten(COLORS.glassSky, 0.16), 0.92),
    );
    iso.r.line(iso.P(0.4, (v0 + v1) / 2, 33), iso.P(1.5, (v0 + v1) / 2, 33), 0.7 * RES, alpha(COLORS.white, 0.9));
    iso.gleam(iso.P(0.95, (v0 + v1) / 2, 33), iso.P(1.5, (v0 + v1) / 2, 33), 0.9 * RES);
  }
  // the grand glazed entrance + the orange Westfield brand band on the SE
  iso.r.poly([iso.P(1.7 + 0.002, 0.7, 20), iso.P(1.7 + 0.002, 1.2, 20), iso.P(1.7 + 0.002, 1.2, 0), iso.P(1.7 + 0.002, 0.7, 0)], COLORS.glassLit);
  iso.r.poly([iso.P(1.7 + 0.002, 0.6, 25), iso.P(1.7 + 0.002, 1.3, 25), iso.P(1.7 + 0.002, 1.3, 21), iso.P(1.7 + 0.002, 0.6, 21)], COLORS.orange);
  // two taller mixed-use blocks of the Stratford City quarter rising behind
  // (NE corner) so the mass reads as the dense new town, not a flat shed
  iso.box(0.5, 1.66, 0.94, 1.86, 0, 64, COLORS.glassSky, {
    leftC: shaded(COLORS.glassSky, 0.18),
    rightC: COLORS.glassSunset,
    topC: COLORS.white,
  });
  iso.box(1.06, 1.62, 1.5, 1.86, 0, 52, hex('#cdb79a'));
  for (let z = 12; z < 60; z += 11) {
    iso.r.line(iso.P(0.5, 1.86, z), iso.P(0.94, 1.86, z), 0.5 * RES, alpha(COLORS.white, 0.6));
  }
  iso.windowsLeft(1.86, 1.1, 1.46, 9, 48, 8, alpha(COLORS.glassDark, 0.7), undefined);
  // a lit office band up the taller glass tower
  for (let z = 16; z < 58; z += 12) {
    if ((Math.floor(z) + (z % 24 < 12 ? 0 : 1)) % 2 === 0) {
      iso.r.poly([iso.P(0.56, 1.86, z + 7), iso.P(0.7, 1.86, z + 7), iso.P(0.7, 1.86, z + 1), iso.P(0.56, 1.86, z + 1)], alpha(COLORS.glassLit, 0.8));
    }
  }
  // car-park rows + a few cars on the apron strip at the SW
  const cars: RGBA[] = [COLORS.glassDark, hex('#c9453a'), COLORS.white, COLORS.steel];
  for (const u of [1.78, 1.88]) {
    for (let v = 0.4; v < 1.5; v += 0.16) {
      const [px, py] = iso.P(u, v, 1);
      const c = cars[Math.floor(v * 10) % cars.length] ?? COLORS.white;
      iso.r.rect(px - 2 * RES, py - 3.2 * RES, px + 2 * RES, py + 3.2 * RES, c);
    }
  }
  return iso.build();
}
