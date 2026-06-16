// Cairo's bespoke-hero registry (Wave W5, round 1). Hand-drawn iso sprites in
// the ink-contour dusk idiom, in Cairo's dusty desert/sand gamut, each matched
// to a PLACED landmark name from src/data/cities/cairo.ts's `named` list (the
// data is almost entirely Arabic, so the `match` regexes hit the Arabic strings
// — the English label / NAME_ICONS patterns are kept alongside as fallbacks for
// robustness). Every hero carries a bespoke night-electrification light.
//
// Giza is the owner priority: the Pyramids + the Great Sphinx reuse the existing
// bespoke draw fns in ../landmarkSprites (pyramidTile / sphinxTile) and each gets
// its own warm Sound-&-Light FLOODLIGHT (`pyramidFlood` / `sphinxFlood`). The
// rest — the Citadel + Muhammad Ali Mosque, Cairo Tower, the great Fatimid/Mamluk/
// Ottoman mosques (bespoke domes + minarets, not the generic dome), the Egyptian
// Museum, palaces, Coptic churches and modern towers — are NEW draw fns below.
//
// SCOPE: only landmark:true placed names become heroes (buildHeroTable skips the
// rest), so a `match` only fires for a name that is both placed AND flagged.
// `foot` MUST equal each draw fn's own `new Iso(w,h,…)` footprint.

import type { BespokeHero } from './registry';
import type { HeroLightSpec } from '../../heroLights';
import { CELL_W, INK, INK_W, Iso, lit, RES, shaded, top } from '../iso';
import { COLORS } from '../palette';
import { alpha, darken, hex, lighten, type Pt, type RGBA } from '../raster';
import { pyramidTile, sphinxTile } from '../landmarkSprites';

// --- Cairo stone gamut (warm honey limestone, sandy render, dusty domes) -----
const LIME = hex('#d8c39a'); // honey limestone (the medieval stone of old Cairo)
const SANDST = hex('#cdb079'); // sandstone / ablaq buff course
const ABLAQ = hex('#a8754c'); // the red ablaq band (muted warm brown, not London-red)
const PALE = hex('#e7dcc2'); // pale dressed stone / marble dressing
const DOMEC = hex('#cdb78c'); // the carved-stone Mamluk dome (sandy, not lead)
const DOMEC_D = hex('#b09a6e');
const LEADGREY = hex('#8d8068'); // weathered grey-tan caps
const COPTIC = hex('#c8b9a0'); // pale Coptic plaster
const SAND = COLORS.aridSand; // tawny ground apron (Cairo env #d8b777)
const SAND_D = darken(SAND, 0.1);

/** Scatter a tawny sand apron with faint drift patches over the footprint, so a
 *  hero reads as standing on cleared desert ground (mirrors pyramidTile). */
function sandApron(iso: Iso, w: number, h: number, n: number, seed: number): void {
  iso.floor(lighten(SAND, 0.03), SAND_D);
  let s = seed | 0;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let k = 0; k < n; k++) {
    const [px, py] = iso.P(0.15 + rnd() * (w - 0.3), 0.15 + rnd() * (h - 0.3), 0);
    const r = (2 + rnd() * 3) * RES;
    iso.r.poly(
      [[px - r, py], [px, py - r * 0.5], [px + r, py], [px, py + r * 0.5]],
      alpha(rnd() < 0.5 ? lighten(SAND, 0.07) : SAND_D, 0.5),
    );
  }
}

/** A slim Cairene MINARET: a tapering shaft (square → octagonal) with one or two
 *  balconied galleries and a bulbous (Mamluk) or pencil (Ottoman) finial — the
 *  signature vertical of an Egyptian mosque. Built at tile (u,v), z0..top px. */
function minaret(
  iso: Iso,
  u: number,
  v: number,
  z0: number,
  top0: number,
  rad: number,
  style: 'mamluk' | 'ottoman' | 'fatimid',
  stone: RGBA,
): void {
  const S = RES;
  // shaft: a tall slim square box, gently tapering by drawing two stacked tiers
  const tiers = style === 'ottoman' ? 2 : 3;
  let z = z0;
  let r = rad;
  for (let i = 0; i < tiers; i++) {
    const zt = z0 + ((top0 - z0) * (i + 1)) / (tiers + 0.4);
    iso.box(u - r, v - r, u + r, v + r, z, zt, stone, {
      leftC: shaded(stone, 0.16),
      rightC: lit(stone, 0.05),
    });
    // a ringed balcony gallery between tiers (the muezzin's walkway)
    const [bx, byB] = iso.P(u, v, zt);
    iso.r.poly(
      [[bx - (r + 0.05) * CELL_W * 0.5, byB], [bx, byB - (r + 0.05) * CELL_W * 0.28], [bx + (r + 0.05) * CELL_W * 0.5, byB], [bx, byB + (r + 0.05) * CELL_W * 0.28]],
      lighten(stone, 0.1),
    );
    iso.r.line([bx - (r + 0.04) * CELL_W * 0.5, byB], [bx + (r + 0.04) * CELL_W * 0.5, byB], 1.1 * S, alpha(INK, 0.5));
    z = zt;
    r *= 0.72;
  }
  // the finial cap
  const capZ = top0;
  const [fx, fyB] = iso.P(u, v, z);
  const FR = r * CELL_W * 0.6;
  if (style === 'ottoman') {
    // a tall sharp pencil cone (lead-grey)
    const tip = iso.P(u, v, capZ + 26);
    iso.r.poly([[fx - FR, fyB], tip, [fx + FR, fyB]], shaded(LEADGREY, 0.06), lit(LEADGREY, 0.05));
    iso.r.polyline([[fx - FR, fyB], tip, [fx + FR, fyB]], INK_W * 0.7, INK);
  } else {
    // a bulbous Mamluk/Fatimid onion finial (carved stone)
    const onH = 18;
    const pts: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      const bulge = Math.sin(a) * (1 + 0.35 * Math.sin(a * 2));
      pts.push([fx + Math.cos(a) * FR * bulge, fyB - Math.sin(a) * onH * S]);
    }
    iso.r.poly(pts, shaded(DOMEC, 0.06), lit(DOMEC, 0.05));
    iso.r.polyline(pts, INK_W * 0.6, INK);
    const tip = iso.P(u, v, capZ + onH + 8);
    iso.r.line([fx, fyB - onH * S], tip, 1.1 * S, COLORS.glassLit); // the brass finial spike
  }
}

/** A ribbed/chevroned carved-STONE Mamluk dome on a tall drum (the great
 *  funerary domes of old Cairo — sandy carved stone, NOT a lead cathedral
 *  dome). Anchored at tile (cu,cv), springing from drum-top zBase, radius `r`
 *  tiles, ovoid rise `rise` px. `chevron` adds the zig-zag relief. */
function mamlukDome(
  iso: Iso,
  cu: number,
  cv: number,
  zBase: number,
  r: number,
  rise: number,
  chevron: boolean,
): void {
  const S = RES;
  const [dx, dyB] = iso.P(cu, cv, zBase);
  const R = r * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      // a pointed Mamluk profile: pull the apex up (power 0.82) so it isn't a hemisphere
      pts.push([dx + Math.cos(a) * R * s, dyB - Math.pow(Math.sin(a), 0.82) * rise * S * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(DOMEC, 0.08), lit(DOMEC, 0.05));
  // the sunlit cheek
  iso.r.poly(dome(0.6).map(([x, y]): Pt => [x + R * 0.16, y - rise * 0.1 * S]), lit(DOMEC, 0.14));
  if (chevron) {
    // carved chevron/zig-zag ribs climbing the dome (the Qaytbay signature)
    for (let k = -3; k <= 3; k++) {
      const baseX = dx + (k / 3.4) * R;
      const topX = dx + (k / 3.4) * R * 0.1;
      const topY = dyB - rise * S * 1.0;
      // a faint zig-zag along the rib
      const seg = 5;
      const pts: Pt[] = [];
      for (let j = 0; j <= seg; j++) {
        const t = j / seg;
        const zig = (j % 2 ? 1 : -1) * R * 0.03;
        pts.push([baseX + (topX - baseX) * t + zig, dyB - (dyB - topY) * t]);
      }
      iso.r.polyline(pts, 0.7 * S, alpha(DOMEC_D, 0.7));
    }
  } else {
    // plain meridian ribs
    for (const k of [-0.6, -0.2, 0.24, 0.62]) {
      iso.r.line([dx + k * R, dyB], [dx + k * R * 0.12, dyB - rise * S * 1.0], 0.7 * S, alpha(DOMEC_D, 0.7));
    }
  }
  iso.r.polyline(dome(1), INK_W * 0.85, INK);
  // a small finial knot at the apex
  const topY = dyB - rise * S;
  iso.r.line([dx, topY], [dx, topY - 7 * S], 1 * S, alpha(DOMEC_D, 0.9));
  iso.r.line([dx, topY - 7 * S], [dx, topY - 11 * S], 1.4 * S, COLORS.glassLit);
}

// =====================  GIZA  (owner priority)  =============================
// The Pyramids + the Great Sphinx reuse the existing bespoke fns; each gets its
// own warm night Sound-&-Light floodlight. Footprints mirror PYRAMID_FOOT/SPHINX.

// =====================  THE CITADEL & MUHAMMAD ALI MOSQUE  ===================

/** THE MUHAMMAD ALI (Alabaster) MOSQUE — the Ottoman-baroque silhouette that
 *  crowns the Citadel: one great central dome ringed by a cascade of half-domes,
 *  flanked by TWO needle-thin pencil minarets (the tallest in Cairo). Pale
 *  alabaster stone. 3×3 SW-anchored, towering on headroom. */
function muhammadAliMosque(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 240 });
  void seed;
  const STONE = PALE; // alabaster
  const u0 = 0.5;
  const u1 = 2.5;
  const v0 = 0.55;
  const v1 = 2.45;
  sandApron(iso, 3, 3, 16, seed * 13 + 1);
  iso.shadow(u0, v0, u1, v1, 0.26, 0.22);
  // the cubic prayer-hall block
  iso.box(u0, v0, u1, v1, 0, 64, STONE);
  // arched arcade windows down both visible faces (two storeys)
  for (const [zb, zt] of [[10, 26], [32, 52]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 8, alpha(COLORS.glassDark, 0.85), STONE);
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, 8, alpha(COLORS.glassDark, 0.85), STONE);
  }
  // a ring of small corner half-domes (the cascading Ottoman massing)
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  for (const [hu, hv, hr] of [[u0 + 0.45, cv, 0.34], [cu, v1 - 0.45, 0.34], [cu, v0 + 0.45, 0.3], [u1 - 0.45, cv, 0.3]] as const) {
    const [hx, hyB] = iso.P(hu, hv, 64);
    const HR = hr * (CELL_W / 2);
    const pts: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      pts.push([hx + Math.cos(a) * HR, hyB - Math.sin(a) * HR * 0.95]);
    }
    iso.r.poly(pts, shaded(LEADGREY, 0.04), lit(LEADGREY, 0.05));
    iso.r.polyline(pts, INK_W * 0.6, alpha(INK, 0.8));
  }
  // the square drum + the great central dome (grey-tan lead-look)
  iso.box(cu - 0.62, cv - 0.62, cu + 0.62, cv + 0.62, 64, 86, STONE);
  const [dx, dyB] = iso.P(cu, cv, 86);
  const DR = 0.7 * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.pow(Math.sin(a), 0.85) * DR * 1.18 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(LEADGREY, 0.05), lit(LEADGREY, 0.06));
  iso.r.poly(dome(0.6).map(([x, y]): Pt => [x + DR * 0.16, y - DR * 0.12]), lit(LEADGREY, 0.16));
  for (const k of [-0.66, -0.24, 0.2, 0.62]) {
    iso.r.line([dx + k * DR, dyB], [dx + k * DR * 0.12, dyB - DR * 1.16], 0.7 * RES, alpha(darken(LEADGREY, 0.2), 0.75));
  }
  iso.r.polyline(dome(1), INK_W * 0.9, INK);
  // golden crescent finial
  const topY = dyB - DR * 1.18;
  iso.r.line([dx, topY], [dx, topY - 13 * RES], 1.4 * RES, COLORS.glassLit);
  iso.r.line([dx - 2.4 * RES, topY - 13 * RES], [dx + 2.4 * RES, topY - 13 * RES], 1.2 * RES, COLORS.glassHot);
  // the two needle minarets at the front corners — the unmistakable cue
  minaret(iso, u0 + 0.18, v1 - 0.12, 0, 150, 0.07, 'ottoman', STONE);
  minaret(iso, u1 - 0.12, v1 - 0.32, 0, 158, 0.07, 'ottoman', STONE);
  // a warm gleam on the sunlit dome cheek so it pops against the dusk
  iso.glint([dx + DR * 0.3, dyB - DR * 0.7], 3 * RES);
  return iso.build();
}

/** THE CITADEL OF SALADIN — the great medieval hilltop fortress: massive
 *  battered curtain walls in honey stone with round drum towers and crenellated
 *  parapets, enclosing a raised court. Reads as a FORT, broad + solid. 3×3. */
function citadel(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const STONE = LIME;
  const u0 = 0.32;
  const u1 = 2.68;
  const v0 = 0.4;
  const v1 = 2.6;
  sandApron(iso, 3, 3, 14, seed * 17 + 5);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  const wallH = 40;
  // raised rocky plinth (the Mokattam spur the Citadel sits on)
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, shaded(COLORS.rock, 0.06), { ink: false });
  // the curtain wall as a thick ring of boxes (battered: wider at the base)
  iso.box(u0, v0, u1, v1, 8, wallH, STONE);
  // inner courtyard sunk a touch (darker stone floor)
  iso.quad(u0 + 0.32, v0 + 0.32, u1 - 0.32, v1 - 0.32, wallH - 6, shaded(STONE, 0.2));
  // crenellations along the two visible parapets (merlons)
  const merlonZ = wallH;
  for (let u = u0 + 0.14; u < u1; u += 0.3) {
    iso.box(u, v1 - 0.04, u + 0.16, v1, merlonZ, merlonZ + 7, lighten(STONE, 0.06), { ink: false });
  }
  for (let v = v0 + 0.14; v < v1; v += 0.3) {
    iso.box(u1 - 0.04, v, u1, v + 0.16, merlonZ, merlonZ + 7, lit(STONE, 0.04), { ink: false });
  }
  // round drum towers at the corners + a gate tower, taller than the wall
  for (const [tu, tv, th] of [[u0, v1, 58], [u1, v1, 58], [u1, v0, 52], [u0, v0, 52]] as const) {
    iso.box(tu - 0.2, tv - 0.2, tu + 0.2, tv + 0.2, 8, th, STONE, { leftC: shaded(STONE, 0.18) });
    // conical/crenellated cap
    for (let a = 0; a < 6; a++) {
      const au = tu - 0.16 + (a % 3) * 0.16;
      const av = tv - 0.16 + (a < 3 ? 0 : 0.32);
      iso.box(au, av, au + 0.1, av + 0.1, th, th + 5, lighten(STONE, 0.08), { ink: false });
    }
  }
  // arrow-slit windows on the front wall
  for (let u = u0 + 0.3; u < u1 - 0.2; u += 0.4) {
    const [sx, syB] = iso.P(u, v1, 22);
    iso.r.rect(sx - 0.7 * RES, syB - 8 * RES, sx + 0.7 * RES, syB, alpha(INK, 0.5));
  }
  iso.gleam(iso.P(u1, v0, wallH), iso.P(u1, v1, wallH));
  return iso.build();
}

/** AL-GAWHARA PALACE — the early-19thC Ottoman palace beside the mosque in the
 *  Citadel: a long low ochre block with a deep shaded loggia and a shallow
 *  hipped tiled roof. 2×2. */
function gawharaPalace(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 50 });
  void seed;
  const STONE = SANDST;
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.4;
  const v1 = 1.6;
  sandApron(iso, 2, 2, 10, seed * 19 + 3);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, 34, STONE);
  // a deep shaded ground-floor loggia (arched arcade) on the front face
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 4, 16, 6, shaded(STONE, 0.5), lighten(STONE, 0.08));
  // upper mashrabiya windows (warm-lit lattice)
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, 20, 30, 6, alpha(COLORS.glassLit, 0.6), darken(STONE, 0.15));
  iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, 20, 30, 5, alpha(COLORS.glassLit, 0.55), darken(STONE, 0.15));
  // shallow hipped tiled roof
  iso.hip(u0, v0, u1, v1, 34, 14, hex('#9c7a4e'));
  return iso.build();
}

// =====================  CAIRO TOWER  ========================================

/** CAIRO TOWER — the 187 m lotus-latticework tower on Gezira: a slim tapering
 *  shaft clad in a diagonal concrete lattice, flaring to a lotus-blossom crown
 *  with an observation drum. TOWERS on a 1×1 footprint + big headroom. */
function cairoTower(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 360 });
  void seed;
  const P = iso.P.bind(iso);
  const S = RES;
  const CONC = hex('#cdbf9c'); // pale sandy concrete
  const u = 0.5;
  const v = 0.5;
  const H = 300;
  const rB = 0.2; // base radius (tiles)
  const rT = 0.1; // shaft-top radius
  iso.shadow(u - rB, v - rB * 0.4, u + rB, v + rB, 0.4, 0.28);
  // a round tapering shaft built as a stack of thin rings (lit/shaded cheeks)
  const ring = (z: number, r: number): { x: number; yB: number; R: number } => {
    const [x, yB] = P(u, v, z);
    return { x, yB, R: r * (CELL_W / 2) };
  };
  const segs = 22;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const z0 = t0 * H;
    const z1 = t1 * H;
    const r0 = rB + (rT - rB) * t0;
    const r1 = rB + (rT - rB) * t1;
    const a = ring(z0, r0);
    const b = ring(z1, r1);
    // left (shaded) + right (lit) halves of the cylinder wall slice
    iso.r.poly([[a.x - a.R, a.yB], [b.x - b.R, b.yB], [b.x, b.yB - b.R * 0.5], [a.x, a.yB - a.R * 0.5]], shaded(CONC, 0.12));
    iso.r.poly([[a.x, a.yB - a.R * 0.5], [b.x, b.yB - b.R * 0.5], [b.x + b.R, b.yB], [a.x + a.R, a.yB]], lit(CONC, 0.05));
  }
  // the diagonal lotus lattice — a crosshatch confined to the front cheek of
  // the shaft. Each strand runs up a few segments, its screen-x staying inside
  // the (tapering) cylinder envelope (the front centre-line ± a fraction of the
  // local radius), so nothing splays into the sky.
  const front = (z: number, fx: number): Pt => {
    const t = z / H;
    const r = rB + (rT - rB) * t;
    const rr = ring(z, r);
    return [rr.x + fx * rr.R, rr.yB - rr.R * 0.5 * (1 - Math.abs(fx))];
  };
  for (let k = 0; k <= 8; k++) {
    const z0 = 6 + (k / 9) * (H - 28);
    const z1 = 6 + ((k + 1.3) / 9) * (H - 28);
    for (const fx of [-0.55, -0.18, 0.18, 0.55] as const) {
      iso.r.line(front(z0, fx), front(z1, fx + 0.34), 0.6 * S, alpha(darken(CONC, 0.22), 0.5));
      iso.r.line(front(z0, fx), front(z1, fx - 0.34), 0.6 * S, alpha(darken(CONC, 0.12), 0.45));
    }
  }
  // ink the two outer silhouette edges of the shaft
  iso.r.line(P(u - rB, v + rB * 0.6, 0), P(u - rT, v + rT * 0.6, H), INK_W * 0.7, INK);
  iso.r.line(P(u + rB, v - rB * 0.6, 0), P(u + rT, v - rT * 0.6, H), INK_W * 0.7, INK);
  // the lotus crown sits at the shaft top
  const c = ring(H, 0.22);
  // round observation drum (a short cylinder) just below the crown, lit windows
  const drumA = ring(H - 26, 0.16);
  const drumB = ring(H - 6, 0.16);
  iso.r.poly([[drumA.x - drumA.R, drumA.yB], [drumB.x - drumB.R, drumB.yB], [drumB.x, drumB.yB - drumB.R * 0.5], [drumA.x, drumA.yB - drumA.R * 0.5]], shaded(lighten(CONC, 0.06), 0.1));
  iso.r.poly([[drumA.x, drumA.yB - drumA.R * 0.5], [drumB.x, drumB.yB - drumB.R * 0.5], [drumB.x + drumB.R, drumB.yB], [drumA.x + drumA.R, drumA.yB]], lit(lighten(CONC, 0.06), 0.05));
  // lit observation windows ringing the drum
  for (let i = -2; i <= 2; i++) {
    const wx = ring((H - 26 + H - 6) / 2, 0.13);
    const x = wx.x + (i / 2.4) * wx.R;
    iso.r.rect(x - 1.1 * S, wx.yB - wx.R * 0.5 * (1 - Math.abs(i / 2.4)) - 6 * S, x + 1.1 * S, wx.yB - wx.R * 0.5 * (1 - Math.abs(i / 2.4)), alpha(COLORS.glassLit, 0.75));
  }
  // the flared lotus cap drawn cleanly as a fan
  const fan: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    const flare = 1 + 0.45 * Math.abs(Math.sin(a * 3.5));
    fan.push([c.x + Math.cos(a) * c.R * 1.5 * flare, c.yB - 4 * S - Math.sin(a) * c.R * 0.7 * flare]);
  }
  iso.r.poly(fan, shaded(CONC, 0.05), lit(CONC, 0.08));
  iso.r.polyline(fan, INK_W * 0.7, INK);
  // the antenna mast + beacon
  const tip = P(u, v, H + 40);
  iso.r.line(P(u, v, H), tip, 1.4 * S, COLORS.steelDark);
  iso.glint(P(u, v, H + 40), 2.4 * S);
  return iso.build();
}

// =====================  GREAT MOSQUES (Fatimid / Mamluk / Ottoman)  =========

/** A big congregational Cairene mosque: a broad walled prayer-hall court with a
 *  carved-stone dome at the qibla and minaret(s) — parameterised by style so
 *  Al-Hakim (Fatimid, twin bastion-minarets), Sultan Hassan (towering Mamluk),
 *  Al-Nasir Muhammad, etc. each read distinct. SW-anchored. */
function mosque(
  seed: number,
  opts: {
    foot: number; // square footprint (tiles)
    head: number;
    bodyH: number;
    domeR: number;
    domeRise: number;
    chevron?: boolean;
    style: 'mamluk' | 'ottoman' | 'fatimid';
    minarets: Array<{ u: number; v: number; h: number; r?: number }>;
    ablaqBands?: boolean;
    stone?: RGBA;
  },
): Uint8ClampedArray<ArrayBuffer> {
  const f = opts.foot;
  const iso = new Iso(f, f, { swAnchor: true, headroom: opts.head });
  void seed;
  const STONE = opts.stone ?? LIME;
  const u0 = 0.36;
  const u1 = f - 0.36;
  const v0 = 0.42;
  const v1 = f - 0.42;
  sandApron(iso, f, f, Math.round(6 * f), seed * 23 + 7);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the prayer-hall block (tall blank ablaq walls — the fortress-like Mamluk read)
  iso.box(u0, v0, u1, v1, 0, opts.bodyH, STONE);
  // ablaq (striped) courses on the visible walls
  if (opts.ablaqBands) {
    for (let z = 6; z < opts.bodyH - 4; z += 12) {
      iso.r.poly([iso.P(u0, v1, z + 4), iso.P(u1, v1, z + 4), iso.P(u1, v1, z), iso.P(u0, v1, z)], alpha(ABLAQ, 0.5));
      iso.r.poly([iso.P(u1, v0, z + 4), iso.P(u1, v1, z + 4), iso.P(u1, v1, z), iso.P(u1, v0, z)], alpha(ABLAQ, 0.42));
    }
  }
  // a deep recessed pointed-arch portal on the front face (the iwan/entrance)
  const pu = (u0 + u1) / 2;
  const [px, pyB] = iso.P(pu, v1, 0);
  const pw = (u1 - u0) * 0.16 * (CELL_W / 2);
  const ph = opts.bodyH * 0.62 * RES;
  const portal: Pt[] = [[px - pw, pyB], [px - pw, pyB - ph * 0.6]];
  for (let i = 0; i <= 8; i++) {
    const a = i / 8;
    portal.push([px - pw + a * 2 * pw, pyB - ph * 0.6 - Math.sin(a * Math.PI) * ph * 0.4]);
  }
  portal.push([px + pw, pyB - ph * 0.6], [px + pw, pyB]);
  iso.r.poly(portal, shaded(STONE, 0.5));
  iso.r.polyline(portal, INK_W * 0.5, alpha(INK, 0.6));
  // upper windows
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, opts.bodyH * 0.72, opts.bodyH - 4, 6, alpha(COLORS.glassDark, 0.85), STONE);
  // crenellated parapet
  for (let u = u0 + 0.1; u < u1; u += 0.26) {
    iso.box(u, v1 - 0.03, u + 0.13, v1, opts.bodyH, opts.bodyH + 5, lighten(STONE, 0.06), { ink: false });
  }
  // the carved-stone dome at the qibla corner (rear), on a windowed drum
  const du = u0 + (u1 - u0) * 0.34;
  const dv = v0 + (v1 - v0) * 0.34;
  iso.box(du - opts.domeR * 0.8, dv - opts.domeR * 0.8, du + opts.domeR * 0.8, dv + opts.domeR * 0.8, opts.bodyH, opts.bodyH + 14, STONE);
  mamlukDome(iso, du, dv, opts.bodyH + 14, opts.domeR, opts.domeRise, opts.chevron ?? false);
  // the minaret(s)
  for (const m of opts.minarets) {
    minaret(iso, m.u, m.v, 0, m.h, m.r ?? 0.075, opts.style, STONE);
  }
  return iso.build();
}

// =====================  EGYPTIAN MUSEUM  ====================================

/** THE EGYPTIAN MUSEUM (Tahrir) — the 1902 neoclassical museum: a long pink-
 *  sandstone palazzo with a domed central entrance bay, a balustraded parapet
 *  and a colonnaded front. 3×3 broad civic mass. */
function egyptianMuseum(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const STONE = hex('#cfa882'); // the museum's famous pinkish sandstone
  const u0 = 0.34;
  const u1 = 2.66;
  const v0 = 0.46;
  const v1 = 2.54;
  sandApron(iso, 3, 3, 14, seed * 29 + 9);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, 56, STONE);
  // two storeys of tall round-arched windows
  for (const [zb, zt] of [[8, 24], [30, 48]] as const) {
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, zb, zt, 11, alpha(COLORS.glassDark, 0.85), PALE);
    iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, zb, zt, 11, alpha(COLORS.glassDark, 0.85), PALE);
  }
  // rusticated base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 7, shaded(STONE, 0.12), { ink: false });
  // balustraded cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 56, 60, lighten(STONE, 0.08), { topC: top(STONE, 0.3) });
  // the central domed entrance bay projecting from the front
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.5, v1 - 0.02, cu + 0.5, v1 + 0.16, 0, 52, lighten(STONE, 0.04));
  // colonnade across the porch
  for (let c = 0; c <= 8; c++) {
    const ccu = cu - 0.42 + (0.84 * c) / 8;
    iso.r.poly([iso.P(ccu - 0.018, v1 + 0.16, 48), iso.P(ccu + 0.018, v1 + 0.16, 48), iso.P(ccu + 0.018, v1 + 0.16, 4), iso.P(ccu - 0.018, v1 + 0.16, 4)], c % 2 ? lit(PALE, 0.08) : PALE);
  }
  // arched pediment over the porch
  const [ax, ayB] = iso.P(cu, v1 + 0.16, 52);
  const AR = 11 * RES;
  const arch: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    arch.push([ax + Math.cos(a) * AR, ayB - 4 * RES - Math.sin(a) * AR]);
  }
  iso.r.poly([[ax - AR, ayB], ...arch, [ax + AR, ayB]], lighten(STONE, 0.1));
  iso.r.polyline(arch, INK_W * 0.7, INK);
  // the shallow central dome behind the bay
  const [dx, dyB] = iso.P(cu, (v0 + v1) / 2, 60);
  const DR = 0.4 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (i / 18);
    dome.push([dx + Math.cos(a) * DR, dyB - Math.sin(a) * DR * 0.7]);
  }
  iso.r.poly(dome, shaded(LEADGREY, 0.04), lit(LEADGREY, 0.06));
  iso.r.polyline(dome, INK_W * 0.8, INK);
  iso.gleam(iso.P(u1, v0, 56), iso.P(u1, v1, 56));
  return iso.build();
}

/** A grand MUSEUM / cultural block, smaller than the Egyptian Museum: a 2×2
 *  Neo-Mamluk stone palazzo with a crenellated parapet and a corner cupola
 *  (Museum of Islamic Art, NMEC, etc.). variant tweaks crown + height. */
function museumBlock(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const STONE = variant === 1 ? hex('#cdb89a') : SANDST;
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.42;
  const v1 = 1.58;
  const H = 42 + variant * 4;
  sandApron(iso, 2, 2, 10, seed * 31 + variant * 7 + 2);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, STONE);
  for (const [zb, zt] of [[8, 20], [24, 36]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 7, alpha(COLORS.glassDark, 0.85), PALE);
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, 6, alpha(COLORS.glassDark, 0.85), PALE);
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(STONE, 0.08), { topC: top(STONE, 0.3) });
  if (variant === 0) {
    // Neo-Mamluk crenellated parapet + a small carved corner dome
    for (let u = u0 + 0.1; u < u1; u += 0.22) {
      iso.box(u, v1 - 0.03, u + 0.11, v1, H + 3, H + 8, lighten(STONE, 0.06), { ink: false });
    }
    mamlukDome(iso, u0 + 0.5, v0 + 0.5, H + 3, 0.3, 22, false);
  } else {
    // a flat modern parapet + a clean stone lantern (NMEC-ish)
    iso.box((u0 + u1) / 2 - 0.3, (v0 + v1) / 2 - 0.3, (u0 + u1) / 2 + 0.3, (v0 + v1) / 2 + 0.3, H + 3, H + 18, lighten(STONE, 0.05));
  }
  return iso.build();
}

// =====================  PALACES  ============================================

/** A grand CAIRENE PALACE — Khedival baroque/rococo (Abdeen, Qubba, Sakakini,
 *  Baron Empain): a long ochre wing with a deep mansard-ish roof, a projecting
 *  central pavilion under a high pavilion-roof or cupola, tall French windows.
 *  variant: 0 baroque palace · 1 fantastical (Baron Empain, Hindu-style tower). */
function palace(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: variant === 1 ? 110 : 64 });
  void seed;
  const STONE = variant === 1 ? hex('#bfa074') : hex('#d8c49a');
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.42;
  const v1 = 1.58;
  const H = variant === 1 ? 38 : 44;
  sandApron(iso, 2, 2, 10, seed * 37 + variant * 11 + 4);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, STONE);
  // tall arched French windows
  for (const [zb, zt] of [[8, 22], [26, 38]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 8, alpha(COLORS.glassLit, 0.5), PALE);
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, 7, alpha(COLORS.glassLit, 0.45), PALE);
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(STONE, 0.08), { topC: top(STONE, 0.3) });
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  if (variant === 1) {
    // Baron Empain: a tiered Hindu-temple tower (the Palais Hindou) at the centre
    let z = H + 3;
    let r = 0.42;
    for (let i = 0; i < 4; i++) {
      iso.box(cu - r, cv - r, cu + r, cv + r, z, z + 16, lit(STONE, 0.02), { topC: top(STONE, 0.26) });
      z += 16;
      r *= 0.74;
    }
    // a small shikhara cap
    const [tx, tyB] = iso.P(cu, cv, z);
    iso.r.poly([[tx - r * CELL_W * 0.6, tyB], iso.P(cu, cv, z + 18), [tx + r * CELL_W * 0.6, tyB]], shaded(STONE, 0.06), lit(STONE, 0.06));
  } else {
    // a projecting central pavilion under a tall pavilion (mansard) roof
    iso.box(cu - 0.42, v1 - 0.3, cu + 0.42, v1 + 0.12, 0, H + 10, lighten(STONE, 0.04));
    // a high concave pavilion roof
    const [rx, ryB] = iso.P(cu, v1 - 0.09, H + 10);
    const apex = iso.P(cu, v1 - 0.09, H + 38);
    iso.r.poly([[rx - 0.46 * CELL_W * 0.5, ryB], apex, [rx, ryB - 6 * RES]], shaded(LEADGREY, 0.04));
    iso.r.poly([[rx, ryB - 6 * RES], apex, [rx + 0.46 * CELL_W * 0.5, ryB]], lit(LEADGREY, 0.05));
    iso.r.polyline([[rx - 0.46 * CELL_W * 0.5, ryB], apex, [rx + 0.46 * CELL_W * 0.5, ryB]], INK_W * 0.7, INK);
    iso.r.line(apex, [apex[0], apex[1] - 8 * RES], 1.2 * RES, COLORS.glassLit);
    // corner pavilions with little cupolas
    for (const [ku, kv] of [[u0 + 0.1, v1 - 0.1], [u1 - 0.1, v1 - 0.1]] as const) {
      mamlukDome(iso, ku, kv, H + 3, 0.18, 14, false);
    }
  }
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H));
  return iso.build();
}

// =====================  COPTIC CHURCH / CATHEDRAL  ==========================

/** A COPTIC church / museum (Coptic Cairo): a pale-plaster basilica with a row
 *  of small ribbed Coptic domes along the nave and a slim bell-tower topped by
 *  a cross. 2×2. */
function copticChurch(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const STONE = COPTIC;
  const u0 = 0.34;
  const u1 = 1.66;
  const v0 = 0.44;
  const v1 = 1.56;
  sandApron(iso, 2, 2, 9, seed * 41 + 6);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // the basilica body
  iso.box(u0, v0, u1, v1, 0, 30, STONE);
  // round-arched windows
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 22, 6, alpha(hex('#3a4a6a'), 0.8), PALE);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 30, 33, lighten(STONE, 0.06), { ink: false });
  // a row of three small ribbed Coptic domes along the nave ridge
  for (const [du, dv] of [[u0 + 0.45, (v0 + v1) / 2], [(u0 + u1) / 2, (v0 + v1) / 2], [u1 - 0.45, (v0 + v1) / 2]] as const) {
    const [dx, dyB] = iso.P(du, dv, 33);
    const DR = 0.2 * (CELL_W / 2);
    const dome: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      dome.push([dx + Math.cos(a) * DR, dyB - Math.pow(Math.sin(a), 0.8) * DR * 1.15]);
    }
    iso.r.poly(dome, shaded(STONE, 0.06), lit(STONE, 0.05));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    // cross finial
    const ty = dyB - DR * 1.15;
    iso.r.line([dx, ty], [dx, ty - 8 * RES], 1 * RES, alpha(INK, 0.8));
    iso.r.line([dx - 2 * RES, ty - 5 * RES], [dx + 2 * RES, ty - 5 * RES], 1 * RES, alpha(INK, 0.8));
  }
  // a slim bell-tower at the front-left corner with a cross
  iso.box(u0 + 0.04, v1 - 0.28, u0 + 0.26, v1 - 0.06, 0, 52, lighten(STONE, 0.03));
  iso.r.poly([iso.P(u0 + 0.04, v1 - 0.17, 52), iso.P(u0 + 0.26, v1 - 0.17, 52), iso.P(u0 + 0.15, v1 - 0.17, 62)], shaded(LEADGREY, 0.04), lit(LEADGREY, 0.05));
  const [bx, byB] = iso.P(u0 + 0.15, v1 - 0.17, 62);
  iso.r.line([bx, byB], [bx, byB - 9 * RES], 1.2 * RES, PALE);
  iso.r.line([bx - 2.5 * RES, byB - 6 * RES], [bx + 2.5 * RES, byB - 6 * RES], 1.2 * RES, PALE);
  return iso.build();
}

// =====================  CIVIC / MINISTRY block  =============================

/** A modernist CIVIC / MINISTRY block (the Mogamma-era state architecture, the
 *  ministries, the Drug Authority): a broad sandy concrete slab with a regular
 *  window grid and a flat parapet — bigger than ordinary fabric so it reads as a
 *  hero, but deliberately plain. 2×2. */
function civicSlab(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 60 });
  void seed;
  const STONE = variant === 1 ? hex('#c2b292') : hex('#cdbf9c');
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.42;
  const v1 = 1.58;
  const H = 56 + variant * 8;
  sandApron(iso, 2, 2, 9, seed * 43 + variant * 5 + 1);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, STONE);
  // a regular curtain of windows up both faces
  for (let z = 8; z < H - 6; z += 9) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, z, z + 5, 9, alpha(COLORS.glassDark, 0.82), alpha(PALE, 0.5));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, z, z + 5, 8, alpha(COLORS.glassDark, 0.8), alpha(PALE, 0.5));
  }
  // a curved (Mogamma) frontage hint: a shaded recessed central bay
  if (variant === 0) {
    iso.box((u0 + u1) / 2 - 0.4, v1 - 0.04, (u0 + u1) / 2 + 0.4, v1, 0, H, shaded(STONE, 0.14), { ink: false });
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 4, lighten(STONE, 0.06), { topC: top(STONE, 0.28) });
  return iso.build();
}

// ============================================================================
//  ROUND 2 — bespoke draw fns for the long-tail PLACED Cairo landmarks
// ============================================================================
// Fatimid gateways, the great Azhar/Hussein/Baybars/al-Muayyad mosques, the
// Mamluk funerary domes (Qaytbay chevron, Imam al-Shafi'i boat-finial, Shajarat
// al-Durr), the Ottoman sabil-kuttab, the wikala caravanserais, the Downtown
// Belle-Époque/Art-Deco blocks (Yacoubian/Banque Misr/Sednawy/Groppi), the Nile
// high-rise hotels (Ramses Hilton/Semiramis/Grand Nile), the Cairo Opera, the
// synagogue, the round Coptic church, the aqueduct intake tower. Each is its own
// silhouette (no reuse of a round-1 fn) in the same dusty-stone dusk gamut.

const BLUE = hex('#7d96b6'); // Iznik-blue tilework (the Aqsunqur "Blue Mosque")
const GLASSWARM = COLORS.glassLit;

/** A small bulbous carved-stone FINIAL onion + brass spike at (x,yB) — shared
 *  apex for domes/mausolea/sabils so they all wear the same Cairene crown. */
function onionFinial(iso: Iso, x: number, yB: number, fr: number, onH: number, stone: RGBA): void {
  const S = RES;
  const pts: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    const bulge = Math.sin(a) * (1 + 0.32 * Math.sin(a * 2));
    pts.push([x + Math.cos(a) * fr * bulge, yB - Math.sin(a) * onH * S]);
  }
  iso.r.poly(pts, shaded(stone, 0.06), lit(stone, 0.06));
  iso.r.polyline(pts, INK_W * 0.6, INK);
  iso.r.line([x, yB - onH * S], [x, yB - (onH + 7) * S], 1.1 * S, GLASSWARM);
}

/** A great pointed FATIMID/MAMLUK GATEWAY: a tall stone block pierced by a deep
 *  recessed pointed-arch portal, flanked by TWO massive round/semicircular drum
 *  bastions, with a crenellated parapet. `minaretsOnTop` adds the two slim
 *  minarets that crown Bab Zuwayla (the al-Muayyad pair) — the unmistakable
 *  Cairo gate silhouette. 1×1 but drawn WIDE + very tall on headroom. */
function fatimidGate(
  seed: number,
  opts: { head: number; bodyH: number; round: boolean; minaretsOnTop: boolean; stone?: RGBA },
): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: opts.head });
  void seed;
  const S = RES;
  const STONE = opts.stone ?? LIME;
  const u0 = 0.16;
  const u1 = 0.84;
  const v0 = 0.2;
  const v1 = 0.8;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // the central curtain block with the gate passage
  iso.box(u0 + 0.16, v0, u1 - 0.16, v1, 0, opts.bodyH, STONE);
  // the two flanking bastions (round drums or square towers), taller than the curtain
  const towerH = opts.bodyH + 16;
  for (const cu of [u0 + 0.04, u1 - 0.04] as const) {
    if (opts.round) {
      // a round drum tower drawn as a tapering stack of slim rings
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const z0 = (towerH * i) / segs;
        const z1 = (towerH * (i + 1)) / segs;
        const [ax, ayB] = iso.P(cu, (v0 + v1) / 2, z0);
        const [bx, byB] = iso.P(cu, (v0 + v1) / 2, z1);
        const R = 0.17 * (CELL_W / 2);
        iso.r.poly([[ax - R, ayB], [bx - R, byB], [bx, byB - R * 0.5], [ax, ayB - R * 0.5]], shaded(STONE, 0.14));
        iso.r.poly([[ax, ayB - R * 0.5], [bx, byB - R * 0.5], [bx + R, byB], [ax + R, ayB]], lit(STONE, 0.05));
      }
      iso.r.line(iso.P(cu - 0.17, (v0 + v1) / 2 + 0.1, 0), iso.P(cu - 0.17, (v0 + v1) / 2 + 0.1, towerH), INK_W * 0.65, INK);
    } else {
      iso.box(cu - 0.14, (v0 + v1) / 2 - 0.14, cu + 0.14, (v0 + v1) / 2 + 0.14, 0, towerH, STONE, { leftC: shaded(STONE, 0.18) });
    }
    // a half-dome / flat cap on each bastion
    const [tx, tyB] = iso.P(cu, (v0 + v1) / 2, towerH);
    const TR = 0.18 * (CELL_W / 2);
    const cap: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      cap.push([tx + Math.cos(a) * TR, tyB - Math.sin(a) * TR * 0.85]);
    }
    iso.r.poly(cap, shaded(DOMEC, 0.05), lit(DOMEC, 0.05));
    iso.r.polyline(cap, INK_W * 0.55, alpha(INK, 0.8));
  }
  // the deep recessed pointed-arch gate passage on the front face
  const [px, pyB] = iso.P((u0 + u1) / 2, v1, 0);
  const pw = 0.13 * (CELL_W / 2);
  const ph = opts.bodyH * 0.66 * S;
  const portal: Pt[] = [[px - pw, pyB], [px - pw, pyB - ph * 0.55]];
  for (let i = 0; i <= 8; i++) {
    const a = i / 8;
    portal.push([px - pw + a * 2 * pw, pyB - ph * 0.55 - Math.sin(a * Math.PI) * ph * 0.45]);
  }
  portal.push([px + pw, pyB - ph * 0.55], [px + pw, pyB]);
  iso.r.poly(portal, shaded(STONE, 0.55));
  iso.r.polyline(portal, INK_W * 0.6, alpha(INK, 0.7));
  // crenellated parapet across the curtain
  for (let u = u0 + 0.2; u < u1 - 0.16; u += 0.12) {
    iso.box(u, v1 - 0.03, u + 0.06, v1, opts.bodyH, opts.bodyH + 5, lighten(STONE, 0.06), { ink: false });
  }
  // the two crowning minarets (Bab Zuwayla's al-Muayyad pair rise FROM the bastions)
  if (opts.minaretsOnTop) {
    minaret(iso, u0 + 0.04, (v0 + v1) / 2, towerH, towerH + 96, 0.06, 'mamluk', STONE);
    minaret(iso, u1 - 0.04, (v0 + v1) / 2, towerH, towerH + 102, 0.06, 'mamluk', STONE);
  }
  iso.gleam(iso.P(u1 - 0.16, v0, opts.bodyH), iso.P(u1 - 0.16, v1, opts.bodyH));
  return iso.build();
}

/** AL-AZHAR — the great Fatimid congregational mosque + university, "mother of
 *  the City of a Thousand Minarets": a broad arcaded courtyard block bristling
 *  with SEVERAL minarets of differing Mamluk/Ottoman date (its signature is the
 *  cluster of finialed minarets, the twin-headed al-Ghuri one among them). 4×4. */
function azharMosque(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 230 });
  void seed;
  const STONE = LIME;
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 0.46;
  const v1 = 3.54;
  const bodyH = 46;
  sandApron(iso, 4, 4, 22, seed * 23 + 11);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the riwaq (arcaded) ranges around a sunken court
  iso.box(u0, v0, u1, v1, 0, bodyH, STONE);
  iso.quad(u0 + 0.5, v0 + 0.5, u1 - 0.5, v1 - 0.5, bodyH - 6, shaded(STONE, 0.22)); // court floor
  // keel-arched arcade openings on both visible faces (the Fatimid riwaq)
  for (let u = u0 + 0.2; u < u1 - 0.2; u += 0.34) {
    const [ax, ayB] = iso.P(u, v1, 8);
    const aw = 5 * RES;
    const ah = 20 * RES;
    const arc: Pt[] = [[ax - aw, ayB], [ax - aw, ayB - ah * 0.5]];
    for (let i = 0; i <= 6; i++) {
      const a = i / 6;
      arc.push([ax - aw + a * 2 * aw, ayB - ah * 0.5 - Math.sin(a * Math.PI) * ah * 0.5]);
    }
    arc.push([ax + aw, ayB - ah * 0.5], [ax + aw, ayB]);
    iso.r.poly(arc, alpha(shaded(STONE, 0.45), 0.9));
  }
  // crenellated parapet
  for (let u = u0 + 0.1; u < u1; u += 0.22) {
    iso.box(u, v1 - 0.03, u + 0.11, v1, bodyH, bodyH + 5, lighten(STONE, 0.06), { ink: false });
  }
  // a low qibla dome at the rear
  iso.box(u0 + 1.1, v0 + 0.6, u0 + 1.8, v0 + 1.3, bodyH, bodyH + 10, STONE);
  mamlukDome(iso, u0 + 1.45, v0 + 0.95, bodyH + 10, 0.34, 22, false);
  // THE MINARET CLUSTER — several finialed shafts of differing height (the icon)
  minaret(iso, u1 - 0.18, v1 - 0.16, 0, 168, 0.06, 'mamluk', STONE);
  minaret(iso, u0 + 0.2, v1 - 0.5, 0, 196, 0.058, 'mamluk', STONE); // the tall al-Ghuri double-head approximated
  // a second small head beside the tall one (al-Ghuri's twin finial)
  minaret(iso, u0 + 0.36, v1 - 0.62, 150, 196, 0.05, 'mamluk', STONE);
  minaret(iso, u1 - 0.5, v0 + 0.3, 0, 150, 0.06, 'ottoman', STONE);
  iso.glint(iso.P(u1 - 0.18, v1 - 0.16, 168), 2.6 * RES);
  return iso.build();
}

/** AL-HUSSEIN — the holiest mosque by Khan el-Khalili: a broad 19thC stone
 *  prayer-hall with a green-tinted dome and a single SLENDER pencil minaret of
 *  Ottoman-revival profile (white, very tall). 3×3. */
function husseinMosque(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 200 });
  void seed;
  const STONE = PALE;
  const u0 = 0.36;
  const u1 = 2.64;
  const v0 = 0.46;
  const v1 = 2.54;
  const bodyH = 50;
  sandApron(iso, 3, 3, 16, seed * 29 + 13);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, STONE);
  // two storeys of pointed-arch windows
  for (const [zb, zt] of [[10, 26], [32, 46]] as const) {
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, zb, zt, 9, alpha(COLORS.glassDark, 0.85), STONE);
    iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, zb, zt, 8, alpha(COLORS.glassDark, 0.85), STONE);
  }
  for (let u = u0 + 0.1; u < u1; u += 0.24) {
    iso.box(u, v1 - 0.03, u + 0.12, v1, bodyH, bodyH + 5, lighten(STONE, 0.06), { ink: false });
  }
  // a softly green-grey dome at the rear-centre on a windowed drum
  const du = (u0 + u1) / 2 - 0.2;
  const dv = (v0 + v1) / 2 - 0.2;
  iso.box(du - 0.5, dv - 0.5, du + 0.5, dv + 0.5, bodyH, bodyH + 14, STONE);
  const GREENDOME = hex('#9bb539');
  const [dx, dyB] = iso.P(du, dv, bodyH + 14);
  const DR = 0.5 * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.pow(Math.sin(a), 0.82) * DR * 1.2 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(GREENDOME, 0.18), lit(GREENDOME, 0.06));
  iso.r.poly(dome(0.6).map(([x, y]): Pt => [x + DR * 0.16, y - DR * 0.1]), lit(GREENDOME, 0.14));
  iso.r.polyline(dome(1), INK_W * 0.85, INK);
  onionFinial(iso, dx, dyB - DR * 1.2, DR * 0.28, 11, GREENDOME);
  // the single tall slender Ottoman-revival pencil minaret at a front corner
  minaret(iso, u1 - 0.16, v1 - 0.18, 0, 178, 0.058, 'ottoman', STONE);
  iso.glint([dx + DR * 0.3, dyB - DR * 0.7], 3 * RES);
  return iso.build();
}

/** THE MOSQUE OF AL-ZAHIR BAYBARS — a HUGE early-Mamluk hypostyle enclosure: a
 *  vast battered crenellated stone curtain wrapping an open court, with a
 *  monumental projecting portal and corner-buttress stubs (it reads as a walled
 *  compound, not a domed mosque). Broad 4×4. */
function baybarsEnclosure(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 120 });
  void seed;
  const STONE = SANDST;
  const u0 = 0.3;
  const u1 = 3.7;
  const v0 = 0.4;
  const v1 = 3.6;
  const wallH = 42;
  sandApron(iso, 4, 4, 20, seed * 31 + 17);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the thick curtain wall (drawn as a ring: solid box, then a sunk court)
  iso.box(u0, v0, u1, v1, 0, wallH, STONE);
  iso.quad(u0 + 0.4, v0 + 0.4, u1 - 0.4, v1 - 0.4, wallH - 5, shaded(STONE, 0.24));
  // arcade shadow line just inside the court rim (the hypostyle riwaq)
  iso.quad(u0 + 0.4, v0 + 0.4, u1 - 0.4, v0 + 0.7, wallH - 5, shaded(STONE, 0.4));
  // a monumental projecting portal block on the front
  const pu = (u0 + u1) / 2;
  iso.box(pu - 0.5, v1 - 0.06, pu + 0.5, v1 + 0.18, 0, wallH + 18, lighten(STONE, 0.03));
  const [px, pyB] = iso.P(pu, v1 + 0.18, 0);
  const pw = 9 * RES;
  const ph = (wallH + 8) * RES;
  const portal: Pt[] = [[px - pw, pyB], [px - pw, pyB - ph * 0.55]];
  for (let i = 0; i <= 8; i++) {
    const a = i / 8;
    portal.push([px - pw + a * 2 * pw, pyB - ph * 0.55 - Math.sin(a * Math.PI) * ph * 0.42]);
  }
  portal.push([px + pw, pyB - ph * 0.55], [px + pw, pyB]);
  iso.r.poly(portal, shaded(STONE, 0.5));
  iso.r.polyline(portal, INK_W * 0.6, alpha(INK, 0.7));
  // crenellations all along the two visible parapets
  for (let u = u0 + 0.12; u < u1; u += 0.2) {
    iso.box(u, v1 - 0.03, u + 0.1, v1, wallH, wallH + 6, lighten(STONE, 0.06), { ink: false });
  }
  for (let v = v0 + 0.12; v < v1; v += 0.2) {
    iso.box(u1 - 0.03, v, u1, v + 0.1, wallH, wallH + 6, lit(STONE, 0.04), { ink: false });
  }
  // squat corner buttress + a single stubby minaret at the portal corner
  minaret(iso, pu + 0.55, v1 - 0.05, 0, 104, 0.07, 'mamluk', STONE);
  iso.gleam(iso.P(u1, v0, wallH), iso.P(u1, v1, wallH));
  return iso.build();
}

/** A great DOMED MAUSOLEUM — a tall cubic stone tomb-chamber under one large
 *  carved/ribbed dome. variant 0: Imam al-Shafi'i (huge, the lead boat-and-crescent
 *  finial); variant 1: Shajarat al-Durr (small, ribbed). SW-anchored. */
function domedMausoleum(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const big = variant === 0;
  const f = big ? 2 : 1;
  const iso = new Iso(f, f, { swAnchor: true, headroom: big ? 150 : 96 });
  void seed;
  const STONE = big ? LIME : DOMEC;
  const u0 = big ? 0.3 : 0.2;
  const u1 = f - (big ? 0.3 : 0.2);
  const v0 = big ? 0.42 : 0.26;
  const v1 = f - (big ? 0.42 : 0.26);
  const bodyH = big ? 50 : 30;
  sandApron(iso, f, f, big ? 10 : 6, seed * 37 + variant * 9 + 4);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, STONE);
  // a band of pointed-arch windows + a transition zone of corner squinches
  iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, bodyH * 0.4, bodyH * 0.8, big ? 5 : 3, alpha(COLORS.glassDark, 0.8), STONE);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, bodyH, bodyH + (big ? 8 : 5), lighten(STONE, 0.06), { topC: top(STONE, 0.3) });
  // the great dome
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  const dr = big ? 0.62 : 0.42;
  mamlukDome(iso, cu, cv, bodyH + (big ? 8 : 5), dr, big ? 46 : 26, !big);
  if (big) {
    // the famous lead boat (markab) + finial atop al-Shafi'i's dome
    const [dx, dyB] = iso.P(cu, cv, bodyH + 8);
    const apexY = dyB - 46 * RES * 1.0 - 11 * RES;
    iso.r.poly(
      [[dx - 7 * RES, apexY], [dx + 7 * RES, apexY], [dx + 4 * RES, apexY - 4 * RES], [dx - 4 * RES, apexY - 4 * RES]],
      shaded(LEADGREY, 0.05),
    );
    iso.r.line([dx, apexY - 4 * RES], [dx, apexY - 13 * RES], 1.3 * RES, GLASSWARM);
    iso.r.line([dx - 2.6 * RES, apexY - 13 * RES], [dx + 2.6 * RES, apexY - 13 * RES], 1.2 * RES, COLORS.glassHot);
  }
  return iso.build();
}

/** A WIKALA (caravanserai / rab) — a tall fortress-like commercial block: a
 *  blank lower storey of pointed-arch shop bays around a deep central courtyard
 *  arch, with upper storeys of mashrabiya-screened rab apartments and a flat
 *  crenellated roof. variant tweaks height. 2×2. */
function wikala(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 70 });
  void seed;
  const STONE = variant === 1 ? hex('#cbb482') : SANDST;
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.42;
  const v1 = 1.58;
  const H = 48 + variant * 4;
  sandApron(iso, 2, 2, 10, seed * 41 + variant * 7 + 3);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, STONE);
  // tall central courtyard portal (pointed arch) on the front
  const pu = (u0 + u1) / 2;
  const [px, pyB] = iso.P(pu, v1, 0);
  const pw = 6 * RES;
  const ph = H * 0.5 * RES;
  const portal: Pt[] = [[px - pw, pyB], [px - pw, pyB - ph * 0.5]];
  for (let i = 0; i <= 6; i++) {
    const a = i / 6;
    portal.push([px - pw + a * 2 * pw, pyB - ph * 0.5 - Math.sin(a * Math.PI) * ph * 0.5]);
  }
  portal.push([px + pw, pyB - ph * 0.5], [px + pw, pyB]);
  iso.r.poly(portal, shaded(STONE, 0.55));
  iso.r.polyline(portal, INK_W * 0.5, alpha(INK, 0.6));
  // ground-floor arched shop bays either side of the portal
  for (const [a, b] of [[u0 + 0.12, pu - 0.22], [pu + 0.22, u1 - 0.12]] as const) {
    iso.windowsLeft(v1, a, b, 6, 20, 3, alpha(shaded(STONE, 0.45), 0.9), STONE);
  }
  // upper storeys: mashrabiya lattice (warm timber screens, faint lit glow)
  const MASH = hex('#7a5a36');
  for (const [zb, zt] of [[24, 34], [38, H - 4]] as const) {
    iso.windowsLeft(v1, u0 + 0.12, u1 - 0.12, zb, zt, 6, alpha(GLASSWARM, 0.4), MASH);
    iso.windowsRight(u1, v0 + 0.12, v1 - 0.12, zb, zt, 5, alpha(GLASSWARM, 0.36), MASH);
  }
  // flat crenellated roof
  for (let u = u0 + 0.1; u < u1; u += 0.2) {
    iso.box(u, v1 - 0.03, u + 0.1, v1, H, H + 5, lighten(STONE, 0.06), { ink: false });
  }
  return iso.build();
}

/** An OTTOMAN SABIL-KUTTAB — the little rounded fountain-house with a curved
 *  grilled facade below and an open Qur'an-school (kuttab) loggia under a wide
 *  overhanging tiled eave above: a small but unmistakable Cairene street-corner
 *  jewel. 1×1, drawn rounded. */
function sabilKuttab(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 80 });
  void seed;
  const S = RES;
  const STONE = PALE;
  const u0 = 0.18;
  const u1 = 0.82;
  const v0 = 0.22;
  const v1 = 0.78;
  iso.shadow(u0, v0, u1, v1, 0.2, 0.24);
  // the curved (bowed) sabil body — approximate the round front by a chamfered box
  iso.box(u0, v0, u1, v1, 0, 30, STONE);
  // the grilled (bronze-grille) fountain windows — tall round-headed, warm-lit
  const [fx, fyB] = iso.P((u0 + u1) / 2, v1, 6);
  for (const dx of [-7, 0, 7] as const) {
    iso.r.poly(
      [[fx + dx * S - 2 * S, fyB], [fx + dx * S - 2 * S, fyB - 12 * S], [fx + dx * S, fyB - 16 * S], [fx + dx * S + 2 * S, fyB - 12 * S], [fx + dx * S + 2 * S, fyB]],
      alpha(hex('#b8862e'), 0.7),
    );
  }
  // a thin cornice, then the open kuttab loggia (slender colonnettes) above
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 30, 33, lighten(STONE, 0.06), { ink: false });
  const loggiaTop = 50;
  for (let c = 0; c <= 5; c++) {
    const cu = u0 + 0.06 + ((u1 - u0 - 0.12) * c) / 5;
    iso.r.poly([iso.P(cu - 0.012, v1, loggiaTop), iso.P(cu + 0.012, v1, loggiaTop), iso.P(cu + 0.012, v1, 34), iso.P(cu - 0.012, v1, 34)], c % 2 ? lit(STONE, 0.06) : STONE);
  }
  // the wide overhanging tiled eave (the kuttab's deep timber roof)
  const [ex, eyB] = iso.P((u0 + u1) / 2, v1, loggiaTop);
  const EW = 13 * S;
  iso.r.poly([[ex - EW, eyB], [ex - EW * 0.7, eyB - 9 * S], [ex + EW * 0.7, eyB - 9 * S], [ex + EW, eyB]], shaded(hex('#9c6b3a'), 0.04), lit(hex('#9c6b3a'), 0.06));
  iso.r.polyline([[ex - EW, eyB], [ex - EW * 0.7, eyB - 9 * S], [ex + EW * 0.7, eyB - 9 * S], [ex + EW, eyB]], INK_W * 0.6, INK);
  iso.gleam(iso.P(u1, v0, 30), iso.P(u1, v1, 30));
  return iso.build();
}

/** A DOWNTOWN BELLE-ÉPOQUE / ART-DECO block (Wust al-Balad): a Khedival corner
 *  edifice — rusticated base, French-windowed piano-nobile storeys, a strong
 *  cornice, and a CORNER turret crowned by a dome (Yacoubian/Banque Misr) or a
 *  stepped Art-Deco parapet (Sednawy/Groppi). variant: 0 domed corner ·
 *  1 Art-Deco stepped · 2 tall bank with attic colonnade. 2×2 (1 set narrower). */
function belleEpoque(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const small = variant === 3;
  const f = small ? 1 : 2;
  const iso = new Iso(f, f, { swAnchor: true, headroom: 80 });
  void seed;
  const STONE = variant === 1 ? hex('#d8cdb2') : variant === 2 ? hex('#cdbd9a') : hex('#d2c19a');
  const u0 = small ? 0.16 : 0.3;
  const u1 = f - (small ? 0.16 : 0.3);
  const v0 = small ? 0.2 : 0.42;
  const v1 = f - (small ? 0.2 : 0.42);
  const H = (small ? 42 : 50) + (variant === 2 ? 10 : 0);
  sandApron(iso, f, f, small ? 6 : 10, seed * 43 + variant * 11 + 5);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  // rusticated base
  iso.box(u0, v0, u1, v1, 0, 9, shaded(STONE, 0.12));
  iso.box(u0, v0, u1, v1, 9, H, STONE);
  // rows of tall French windows with frames (the regular Belle-Époque grid)
  const rows = small ? 3 : 4;
  for (let rI = 0; rI < rows; rI++) {
    const zb = 13 + rI * ((H - 18) / rows);
    const zt = zb + ((H - 18) / rows) * 0.62;
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, small ? 4 : 6, alpha(COLORS.glassDark, 0.82), lighten(STONE, 0.05));
    iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, zb, zt, small ? 4 : 6, alpha(COLORS.glassDark, 0.8), lighten(STONE, 0.05));
  }
  // strong projecting cornice
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(STONE, 0.08), { topC: top(STONE, 0.3) });
  // the crown depends on variant
  const cu = u1 - (small ? 0.16 : 0.22);
  const cv = v1 - (small ? 0.16 : 0.22);
  if (variant === 0 || small) {
    // a corner turret with a small ribbed dome (the Yacoubian/Talaat Harb cue)
    iso.box(cu - 0.14, cv - 0.14, cu + 0.14, cv + 0.14, H + 4, H + 16, lit(STONE, 0.03));
    mamlukDome(iso, cu, cv, H + 16, 0.18, 16, false);
  } else if (variant === 1) {
    // stepped Art-Deco parapet ziggurat at the corner
    let z = H + 4;
    let r = 0.34;
    for (let i = 0; i < 3; i++) {
      iso.box(cu - r, cv - r, cu + r, cv + r, z, z + 7, lit(STONE, 0.02), { topC: top(STONE, 0.26) });
      z += 7;
      r *= 0.66;
    }
  } else {
    // a bank attic: a recessed colonnade + flat roof
    for (let c = 0; c <= 6; c++) {
      const ccu = u0 + 0.2 + ((u1 - u0 - 0.4) * c) / 6;
      iso.r.poly([iso.P(ccu - 0.02, v1 - 0.06, H + 16), iso.P(ccu + 0.02, v1 - 0.06, H + 16), iso.P(ccu + 0.02, v1 - 0.06, H + 4), iso.P(ccu - 0.02, v1 - 0.06, H + 4)], c % 2 ? lit(STONE, 0.06) : STONE);
    }
    iso.box(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.06, H + 16, H + 19, lighten(STONE, 0.05), { ink: false });
  }
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H));
  return iso.build();
}

/** A NILE-CORNICHE HIGH-RISE HOTEL — a slim modernist slab/tower on the river:
 *  a tall curtain-walled mass with a banded window grid and a flat or twin crown.
 *  variant 0: a broad slab (Ramses Hilton); 1: a slimmer rounded tower
 *  (Semiramis); 2: a tall twin-tower (Grand Nile). TOWERS on headroom. */
function nileHighRise(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: variant === 2 ? 360 : 300 });
  void seed;
  const CONC = hex('#cdbf9c');
  const GLASS = alpha(hex('#5a7088'), 0.85);
  const u0 = 0.5;
  const u1 = 2.5;
  const v0 = 0.55;
  const v1 = 2.45;
  const H = variant === 2 ? 300 : variant === 1 ? 264 : 230;
  sandApron(iso, 3, 3, 14, seed * 47 + variant * 9 + 6);
  iso.shadow(u0, v0, u1, v1, 0.32, 0.26);
  const stripeWalls = (a0: number, b0: number, a1: number, b1: number, h: number): void => {
    iso.box(a0, b0, a1, b1, 0, h, CONC);
    // horizontal banded curtain wall (alternating glass bands + spandrels)
    for (let z = 10; z < h - 6; z += 11) {
      iso.windowsLeft(b1, a0 + 0.08, a1 - 0.08, z, z + 6, variant === 2 ? 5 : 9, GLASS, alpha(CONC, 0.4));
      iso.windowsRight(a1, b0 + 0.08, b1 - 0.08, z, z + 6, variant === 2 ? 5 : 9, alpha(hex('#506680'), 0.82), alpha(CONC, 0.4));
    }
    iso.box(a0 - 0.02, b0 - 0.02, a1 + 0.02, b1 + 0.02, h, h + 5, lighten(CONC, 0.05), { topC: top(CONC, 0.28) });
  };
  if (variant === 2) {
    // twin slim towers on a shared podium
    iso.box(u0, v0, u1, v1, 0, 40, CONC);
    stripeWalls(u0 + 0.12, v0 + 0.3, u0 + 0.92, v1 - 0.3, H);
    stripeWalls(u1 - 0.92, v0 + 0.3, u1 - 0.12, v1 - 0.3, H - 24);
    iso.glint(iso.P(u0 + 0.52, v0 + 0.9, H + 6), 2.4 * RES);
  } else if (variant === 1) {
    // a slimmer rounded slab (Semiramis) — narrower in v
    stripeWalls(u0 + 0.2, v0 + 0.55, u1 - 0.2, v1 - 0.55, H);
    // a rooftop plant box crown
    iso.box(u0 + 0.4, v0 + 0.7, u1 - 0.4, v1 - 0.7, H, H + 14, shaded(CONC, 0.08));
  } else {
    // a broad slab (Ramses Hilton)
    stripeWalls(u0 + 0.1, v0 + 0.45, u1 - 0.1, v1 - 0.45, H);
    iso.box(u0 + 0.3, v0 + 0.6, u1 - 0.3, v1 - 0.6, H, H + 12, shaded(CONC, 0.06));
  }
  return iso.build();
}

/** THE CAIRO OPERA HOUSE — the 1988 Japanese-Islamic National Cultural Centre
 *  on Gezira: a low, broad, pale composition of cubic pavilions with shallow
 *  pyramidal/octagonal roofs and arcaded loggias, set in open ground. 4×4. */
function operaHouse(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  const STONE = hex('#ddd2bb');
  const u0 = 0.36;
  const u1 = 3.64;
  const v0 = 0.46;
  const v1 = 3.54;
  sandApron(iso, 4, 4, 18, seed * 53 + 7);
  iso.shadow(u0, v0, u1, v1, 0.22, 0.2);
  // a broad low base platform
  iso.box(u0, v0, u1, v1, 0, 14, shaded(STONE, 0.08));
  // the central main hall — a taller cubic block with an arcaded loggia front
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  iso.box(cu - 0.9, cv - 0.9, cu + 0.9, cv + 0.9, 14, 44, STONE);
  // arcaded loggia (pointed arches) on the central front
  for (let u = cu - 0.78; u < cu + 0.78; u += 0.26) {
    const [ax, ayB] = iso.P(u, cv + 0.9, 16);
    const aw = 4 * RES;
    const ah = 16 * RES;
    const arc: Pt[] = [[ax - aw, ayB], [ax - aw, ayB - ah * 0.5]];
    for (let i = 0; i <= 5; i++) {
      const a = i / 5;
      arc.push([ax - aw + a * 2 * aw, ayB - ah * 0.5 - Math.sin(a * Math.PI) * ah * 0.5]);
    }
    arc.push([ax + aw, ayB - ah * 0.5], [ax + aw, ayB]);
    iso.r.poly(arc, alpha(shaded(STONE, 0.4), 0.9));
  }
  // a shallow octagonal pyramidal roof + lantern over the main hall
  const [hx, hyB] = iso.P(cu, cv, 44);
  const HR = 0.95 * (CELL_W / 2);
  iso.r.poly([[hx - HR, hyB], [hx, hyB - 16 * RES], [hx + HR, hyB], [hx, hyB + 8 * RES]], shaded(LEADGREY, 0.05), lit(LEADGREY, 0.06));
  iso.r.polyline([[hx - HR, hyB], [hx, hyB - 16 * RES], [hx + HR, hyB]], INK_W * 0.7, INK);
  iso.r.line([hx, hyB - 16 * RES], [hx, hyB - 24 * RES], 1.3 * RES, GLASSWARM);
  // four lower flanking pavilions with their own little hipped roofs
  for (const [pu, pv] of [[u0 + 0.55, v0 + 0.55], [u1 - 0.55, v0 + 0.55], [u0 + 0.55, v1 - 0.55], [u1 - 0.55, v1 - 0.55]] as const) {
    iso.box(pu - 0.34, pv - 0.34, pu + 0.34, pv + 0.34, 14, 30, lit(STONE, 0.02));
    iso.hip(pu - 0.34, pv - 0.34, pu + 0.34, pv + 0.34, 30, 9, hex('#9c7a4e'));
  }
  iso.gleam(iso.P(u1, v0, 14), iso.P(u1, v1, 14));
  return iso.build();
}

/** SHA'AR HASHAMAYIM SYNAGOGUE — the 1905 Adly Street temple: a monumental
 *  pale-stone facade of two heavy pylon-towers framing a tall central bay, all
 *  crowned with stylised PALM-frond Egyptian-revival capitals and a deep
 *  cavetto cornice; a Star of David over the entrance. 1×1, drawn tall + wide. */
function synagogue(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 96 });
  void seed;
  const S = RES;
  const STONE = hex('#dccdb0');
  const u0 = 0.16;
  const u1 = 0.84;
  const v0 = 0.22;
  const v1 = 0.78;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  iso.box(u0, v0, u1, v1, 0, 52, STONE);
  // two heavy framing pylon towers, slightly proud and taller
  for (const cu of [u0 + 0.02, u1 - 0.02] as const) {
    iso.box(cu - 0.07, v0, cu + 0.07, v1, 0, 60, lit(STONE, 0.02), { leftC: shaded(STONE, 0.16) });
    // a stylised palm-capital flare at the top (Egyptian-revival)
    const [tx, tyB] = iso.P(cu, v1, 60);
    iso.r.poly([[tx - 6 * S, tyB], [tx - 9 * S, tyB - 8 * S], [tx, tyB - 5 * S], [tx + 9 * S, tyB - 8 * S], [tx + 6 * S, tyB]], lit(STONE, 0.08));
    iso.r.polyline([[tx - 9 * S, tyB - 8 * S], [tx, tyB - 5 * S], [tx + 9 * S, tyB - 8 * S]], INK_W * 0.55, alpha(INK, 0.8));
  }
  // the tall central bay: a great round-headed window, warm-lit
  const [wx, wyB] = iso.P((u0 + u1) / 2, v1, 12);
  const ww = 7 * S;
  const wh = 30 * S;
  const win: Pt[] = [[wx - ww, wyB], [wx - ww, wyB - wh * 0.6]];
  for (let i = 0; i <= 8; i++) {
    const a = i / 8;
    win.push([wx - ww + a * 2 * ww, wyB - wh * 0.6 - Math.sin(a * Math.PI) * wh * 0.4]);
  }
  win.push([wx + ww, wyB - wh * 0.6], [wx + ww, wyB]);
  iso.r.poly(win, alpha(GLASSWARM, 0.55));
  iso.r.polyline(win, INK_W * 0.5, alpha(INK, 0.6));
  // a Star of David roundel over the central bay (two overlaid triangles)
  const [sx, syB] = iso.P((u0 + u1) / 2, v1, 46);
  const sy = syB - 4 * S;
  const sr = 4 * S;
  const tri = (rot: number): void => {
    const p = (k: number): Pt => {
      const a = rot + (k * 2 * Math.PI) / 3;
      return [sx + Math.cos(a) * sr, sy + Math.sin(a) * sr];
    };
    iso.r.polyline([p(0), p(1), p(2), p(0)], 1 * S, COLORS.glassHot);
  };
  tri(-Math.PI / 2);
  tri(Math.PI / 2);
  // a deep cavetto cornice across the top
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 52, 56, lighten(STONE, 0.08), { topC: top(STONE, 0.3) });
  iso.gleam(iso.P(u1, v0, 52), iso.P(u1, v1, 52));
  return iso.build();
}

/** A ROUND ORTHODOX/COPTIC CHURCH — Mar Girgis (St George): a tall cylindrical
 *  drum body under a low conical/ribbed dome, with a row of round-headed windows
 *  and a cross finial — the distinctive round church of Coptic Cairo. 1×1. */
function roundChurch(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 90 });
  void seed;
  const S = RES;
  const STONE = COPTIC;
  const u = 0.5;
  const v = 0.5;
  const H = 46;
  const rB = 0.32;
  iso.shadow(u - rB, v - rB * 0.5, u + rB, v + rB, 0.26, 0.24);
  // the cylindrical drum, drawn as lit/shaded cheeks
  const [bx, byB] = iso.P(u, v, 0);
  const [tx, tyB] = iso.P(u, v, H);
  const R = rB * (CELL_W / 2);
  iso.r.poly([[bx - R, byB], [tx - R, tyB], [tx, tyB - R * 0.5], [bx, byB - R * 0.5]], shaded(STONE, 0.12));
  iso.r.poly([[bx, byB - R * 0.5], [tx, tyB - R * 0.5], [tx + R, tyB], [bx + R, byB]], lit(STONE, 0.05));
  iso.r.line([bx - R, byB], [tx - R, tyB], INK_W * 0.7, INK);
  iso.r.line([bx + R, byB], [tx + R, tyB], INK_W * 0.7, INK);
  // a ring of round-headed windows around the drum
  for (let i = -2; i <= 2; i++) {
    const wx = tx + (i / 2.6) * R;
    const wy = tyB - R * 0.5 * (1 - Math.abs(i / 2.6)) - 8 * S;
    iso.r.poly([[wx - 1.4 * S, wy + 10 * S], [wx - 1.4 * S, wy + 2 * S], [wx, wy], [wx + 1.4 * S, wy + 2 * S], [wx + 1.4 * S, wy + 10 * S]], alpha(hex('#3a4a6a'), 0.8));
  }
  // a low conical ribbed dome
  const cone: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    cone.push([tx + Math.cos(a) * R * 1.05, tyB - Math.pow(Math.sin(a), 0.7) * 22 * S]);
  }
  iso.r.poly(cone, shaded(DOMEC, 0.05), lit(DOMEC, 0.06));
  for (const k of [-0.6, -0.2, 0.24, 0.62]) {
    iso.r.line([tx + k * R, tyB], [tx + k * R * 0.1, tyB - 21 * S], 0.7 * S, alpha(DOMEC_D, 0.7));
  }
  iso.r.polyline(cone, INK_W * 0.8, INK);
  // the cross finial
  const ty = tyB - 22 * S;
  iso.r.line([tx, ty], [tx, ty - 11 * S], 1.2 * S, PALE);
  iso.r.line([tx - 3 * S, ty - 7 * S], [tx + 3 * S, ty - 7 * S], 1.2 * S, PALE);
  return iso.build();
}

/** THE AQUEDUCT INTAKE TOWER (Fum al-Khalig) — the hexagonal Mamluk water-intake
 *  tower (Sour Magra al-Oyoun) where Nile water was raised into the great
 *  aqueduct: a tall battered hexagonal stone shaft with a couple of pointed
 *  arches springing off toward the (off-tile) aqueduct. 1×1, tall. */
function aqueductTower(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(1, 1, { headroom: 110 });
  void seed;
  const S = RES;
  const STONE = SANDST;
  const u0 = 0.22;
  const u1 = 0.78;
  const v0 = 0.24;
  const v1 = 0.76;
  const H = 64;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.24);
  // battered hexagonal shaft (approximate by a slightly tapering box)
  iso.box(u0 + 0.02, v0 + 0.02, u1 - 0.02, v1 - 0.02, 0, H * 0.5, STONE, { leftC: shaded(STONE, 0.16) });
  iso.box(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, H * 0.5, H, STONE, { leftC: shaded(STONE, 0.14) });
  // a couple of pointed relieving arches on the front face (the aqueduct springs)
  for (const z of [H * 0.62, H * 0.82] as const) {
    const [ax, ayB] = iso.P((u0 + u1) / 2, v1 - 0.05, z);
    const aw = 5 * S;
    const arc: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = i / 8;
      arc.push([ax - aw + a * 2 * aw, ayB - Math.sin(a * Math.PI) * 6 * S]);
    }
    iso.r.polyline(arc, 1 * S, alpha(shaded(STONE, 0.4), 0.85));
  }
  // a crenellated cap
  for (let u = u0 + 0.1; u < u1 - 0.05; u += 0.14) {
    iso.box(u, v1 - 0.08, u + 0.07, v1 - 0.05, H, H + 6, lighten(STONE, 0.06), { ink: false });
  }
  iso.gleam(iso.P(u1 - 0.05, v0 + 0.05, H), iso.P(u1 - 0.05, v1 - 0.05, H));
  return iso.build();
}

/** A modern CULTURAL/CIVIC TOWER block — for the Ministry of Foreign Affairs and
 *  similar later-20thC slab-towers: a clean sandy-concrete tower with a banded
 *  window grid and a flat parapet, taller + slimmer than the round-1 civic slab.
 *  variant tweaks height/crown. 2×2. */
function civicTower(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 130 });
  void seed;
  const CONC = variant === 1 ? hex('#c6b794') : hex('#cdbf9c');
  const u0 = 0.36;
  const u1 = 1.64;
  const v0 = 0.46;
  const v1 = 1.54;
  const H = 96 + variant * 16;
  sandApron(iso, 2, 2, 9, seed * 59 + variant * 5 + 2);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, CONC);
  for (let z = 8; z < H - 6; z += 9) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, z, z + 5, 7, alpha(COLORS.glassDark, 0.82), alpha(CONC, 0.45));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, z, z + 5, 6, alpha(COLORS.glassDark, 0.8), alpha(CONC, 0.45));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 5, lighten(CONC, 0.06), { topC: top(CONC, 0.28) });
  // a rooftop plant/lantern box
  iso.box((u0 + u1) / 2 - 0.3, (v0 + v1) / 2 - 0.3, (u0 + u1) / 2 + 0.3, (v0 + v1) / 2 + 0.3, H + 5, H + 18, shaded(CONC, 0.06));
  return iso.build();
}

/** A MODERN MOSQUE (Gamal Abdel Nasser-era): a clean pale prayer-hall cube under
 *  one big smooth dome with a single tall plain pencil minaret — the 20thC
 *  state-mosque idiom, distinct from the carved Mamluk domes. 2×2. */
function modernMosque(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 150 });
  void seed;
  const STONE = hex('#ddd3bd');
  const u0 = 0.34;
  const u1 = 1.66;
  const v0 = 0.44;
  const v1 = 1.56;
  const bodyH = 36;
  sandApron(iso, 2, 2, 10, seed * 61 + 8);
  iso.shadow(u0, v0, u1, v1, 0.2, 0.22);
  iso.box(u0, v0, u1, v1, 0, bodyH, STONE);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 8, 24, 6, alpha(COLORS.glassDark, 0.82), STONE);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, bodyH, bodyH + 4, lighten(STONE, 0.06), { topC: top(STONE, 0.3) });
  // one big smooth (hemispherical) dome on a low drum
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  iso.box(cu - 0.5, cv - 0.5, cu + 0.5, cv + 0.5, bodyH + 4, bodyH + 12, STONE);
  const [dx, dyB] = iso.P(cu, cv, bodyH + 12);
  const DR = 0.5 * (CELL_W / 2);
  const dome = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      pts.push([dx + Math.cos(a) * DR * s, dyB - Math.sin(a) * DR * 0.95 * s]);
    }
    return pts;
  };
  iso.r.poly(dome(1), shaded(DOMEC, 0.06), lit(DOMEC, 0.06));
  iso.r.poly(dome(0.6).map(([x, y]): Pt => [x + DR * 0.16, y - DR * 0.1]), lit(DOMEC, 0.12));
  iso.r.polyline(dome(1), INK_W * 0.85, INK);
  onionFinial(iso, dx, dyB - DR * 0.95, DR * 0.22, 9, DOMEC);
  // one tall plain pencil minaret
  minaret(iso, u1 - 0.16, v1 - 0.18, 0, 134, 0.055, 'ottoman', STONE);
  return iso.build();
}

// =====================  ROUND 3 — THE OLD-CAIRO LONG TAIL  ==================
// The final batch to round Cairo to 100: the great Abbasid Mosque of Ibn Tulun
// (its unique helicoidal minaret), the Bayn-al-Qasrayn Mamluk complexes (Qalawun
// + Barquq), the Fatimid al-Salih Tala'i, the Ayyubid Salihiyya, and the Citadel-
// square / al-Muizz mosques — most via the flexible mosque() with bespoke params,
// two with their own hand-built silhouettes (Ibn Tulun + Qalawun).

/** MOSQUE OF IBN TULUN (876–879) — the oldest, largest mosque in Cairo and one
 *  of the great monuments of Islamic architecture: a VAST square Abbasid
 *  enclosure of honey-sandstone walls topped by the famous pierced crenellations
 *  ("paper-doll" merlons), wrapped by an outer ziyada wall, around an open
 *  courtyard with a domed central ablution pavilion — and its UNIQUE helicoidal
 *  MINARET with an external spiral staircase ramp (modelled on Samarra). The
 *  spiral minaret is the unmistakable read. Broad 5×5 SW, on headroom. */
function ibnTulunMosque(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(5, 5, { swAnchor: true, headroom: 150 });
  void seed;
  const STONE = LIME; // honey sandstone
  const u0 = 0.3, u1 = 4.7, v0 = 0.4, v1 = 4.6;
  sandApron(iso, 5, 5, 30, seed * 17 + 5);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the outer ZIYADA wall (a low precinct wall ringing the mosque)
  iso.box(u0, v0, u1, v1, 0, 14, shaded(STONE, 0.06), { ink: true });
  // the great prayer-hall enclosure (tall blank Abbasid walls) set inside it
  const a0 = u0 + 0.5, a1 = u1 - 0.5, b0 = v0 + 0.5, b1 = v1 - 0.5;
  iso.box(a0, b0, a1, b1, 0, 62, STONE);
  // the open central courtyard (sahn) sunk in the middle — a darker floor inset
  const cu = (a0 + a1) / 2, cv = (b0 + b1) / 2;
  iso.quad(cu - 1.25, cv - 1.25, cu + 1.25, cv + 1.25, 62, shaded(STONE, 0.16));
  // ranks of pointed-arch arcade openings around the courtyard (the riwaqs) seen
  // over the near walls — drawn as a band of arches on the two visible inner faces
  for (const face of ['l', 'r'] as const) {
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      if (face === 'l') {
        const u = (a0 + 0.3) + (a1 - a0 - 0.6) * t;
        iso.r.poly([iso.P(u - 0.12, b1, 30), iso.P(u + 0.12, b1, 30), iso.P(u + 0.12, b1, 46), iso.P(u, b1, 54), iso.P(u - 0.12, b1, 46)], alpha(COLORS.glassDark, 0.7));
      } else {
        const v = (b0 + 0.3) + (b1 - b0 - 0.6) * t;
        iso.r.poly([iso.P(a1, v - 0.12, 30), iso.P(a1, v + 0.12, 30), iso.P(a1, v + 0.12, 46), iso.P(a1, v, 54), iso.P(a1, v - 0.12, 46)], alpha(COLORS.glassDark, 0.6));
      }
    }
  }
  // the famous PIERCED CRENELLATIONS ("paper-doll" merlons) along the wall tops —
  // a continuous fretted parapet on the two near faces
  for (let u = a0 + 0.12; u < a1; u += 0.2) {
    iso.box(u, b1 - 0.03, u + 0.1, b1, 62, 70, lighten(STONE, 0.08), { ink: false });
    const [mx, my] = iso.P(u + 0.05, b1, 70);
    iso.r.poly([[mx - 1.4 * RES, my], [mx + 1.4 * RES, my], [mx, my - 3 * RES]], lighten(STONE, 0.06)); // the pointed merlon cap
  }
  for (let v = b0 + 0.12; v < b1; v += 0.2) {
    iso.box(a1 - 0.03, v, a1, v + 0.1, 62, 70, lighten(STONE, 0.06), { ink: false });
  }
  // the small domed ABLUTION PAVILION in the centre of the courtyard
  iso.box(cu - 0.28, cv - 0.28, cu + 0.28, cv + 0.28, 62, 80, lighten(STONE, 0.03));
  const [px, pyT] = iso.P(cu, cv, 80);
  const PDR = 0.3 * (CELL_W / 2);
  const pdome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    pdome.push([px + Math.cos(a) * PDR, pyT - Math.sin(a) * PDR * 0.8]);
  }
  iso.r.poly(pdome, shaded(DOMEC, 0.06), lit(DOMEC, 0.06));
  iso.r.polyline(pdome, INK_W * 0.7, INK);

  // ---- THE HELICOIDAL MINARET (the signature) — a thick round stone tower with
  //      an EXTERNAL spiral staircase ramp winding up the outside, capped by an
  //      open domed kiosk (mabkhara). Stands at the NW corner, outside the hall.
  const mu = a0 - 0.12, mv = (b0 + b1) / 2 - 0.6;
  const [bx, byB] = iso.P(mu, mv, 14);
  const MR = 0.2 * (CELL_W / 2); // the cylinder radius (screen px)
  const Z0 = 14, ZTOP = 132;
  // the cylindrical shaft (two stacked drums, the lower square-ish, upper round)
  // draw as a tapering stack of short cylinders so the spiral can wrap it
  const drumCol = (zPx: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18) - Math.PI / 2; pts.push([bx + Math.cos(a) * MR, byB - zPx + Math.sin(a) * MR * 0.5]); }
    return pts;
  };
  // front half of the shaft wall
  const zb0 = (Z0) * RES, zt0 = (ZTOP) * RES;
  iso.r.poly([...drumCol(zb0).slice(0, 10), ...drumCol(zt0).slice(0, 10).reverse()], shaded(STONE, 0.05), lit(STONE, 0.05));
  iso.edge([bx - MR, byB - zb0], [bx - MR, byB - zt0]);
  iso.edge([bx + MR, byB - zb0], [bx + MR, byB - zt0]);
  // the EXTERNAL SPIRAL RAMP — a helix winding up the front of the shaft. Drawn
  // as a polyline whose x oscillates across the cylinder while z climbs, with a
  // shadow under each coil so it reads as a projecting stone ramp.
  const turns = 4.2;
  const helix: Pt[] = [];
  const steps = 90;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const ang = t * turns * Math.PI * 2;
    const x = bx + Math.cos(ang) * (MR + 1.4 * RES);
    const z = Z0 + (ZTOP - Z0 - 18) * t;
    const y = byB - z * RES + Math.sin(ang) * MR * 0.5;
    helix.push([x, y]);
  }
  // only the front-facing arcs read; draw the whole helix thin, then re-stroke
  // the front coils thicker (where sin(ang) < 0 → nearer the viewer)
  iso.r.polyline(helix, 1.0 * RES, alpha(DOMEC_D, 0.55));
  for (let s = 0; s < steps; s++) {
    const ang = (s / steps) * turns * Math.PI * 2;
    if (Math.cos(ang) < 0) continue; // front face only
    iso.r.line(helix[s]!, helix[s + 1]!, 2.0 * RES, lit(STONE, 0.06));
    iso.r.line([helix[s]![0], helix[s]![1] + 1.6 * RES], [helix[s + 1]![0], helix[s + 1]![1] + 1.6 * RES], 0.8 * RES, alpha(INK, 0.4));
  }
  // the open domed kiosk (mabkhara) crowning the minaret — a little columned
  // pavilion with a ribbed cap
  const [kx, kyB] = iso.P(mu, mv, ZTOP);
  for (const dx of [-MR * 0.7, 0, MR * 0.7]) iso.r.line([kx + dx, kyB], [kx + dx, kyB - 9 * RES], 1.0 * RES, lighten(STONE, 0.08));
  const kib: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); kib.push([kx + Math.cos(a) * MR * 0.9, kyB - 9 * RES - Math.sin(a) * 11 * RES]); }
  iso.r.poly(kib, shaded(DOMEC, 0.05), lit(DOMEC, 0.06));
  iso.r.polyline(kib, INK_W * 0.7, INK);
  iso.r.line([kx, kyB - 20 * RES], [kx, kyB - 27 * RES], 1.1 * RES, COLORS.glassLit); // brass finial
  return iso.build();
}

/** AL-MANSUR QALAWUN COMPLEX (Bayn al-Qasrayn, al-Muizz St, 1285) — the great
 *  Mamluk madrasa-mausoleum-hospital: a tall narrow honey-stone street façade of
 *  stacked recessed pointed-arch panels with paired windows, a soaring square
 *  fluted-top MINARET (one of Cairo's finest), and behind it the large ribbed
 *  carved-stone MAUSOLEUM DOME on its windowed drum. 2×2 SW, on headroom. */
function qalawunComplex(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(2, 2, { swAnchor: true, headroom: 200 });
  void seed;
  const STONE = LIME;
  const u0 = 0.34, u1 = 1.66, v0 = 0.44, v1 = 1.56;
  sandApron(iso, 2, 2, 10, seed * 19 + 3);
  iso.shadow(u0, v0, u1, v1, 0.24, 0.22);
  // the tall street-front block (a deep narrow Mamluk façade)
  iso.box(u0, v0, u1, v1, 0, 130, STONE);
  // the signature stacked tall recessed pointed-arch panels down the show (v1)
  // face — paired lancet windows within each recessed bay
  for (let i = 0; i < 4; i++) {
    const u = u0 + 0.2 + i * 0.32;
    // the recessed panel
    iso.r.poly([iso.P(u, v1, 16), iso.P(u + 0.24, v1, 16), iso.P(u + 0.24, v1, 96), iso.P(u + 0.12, v1, 112), iso.P(u, v1, 96)], shaded(STONE, 0.16));
    // the paired windows inside
    for (const du of [0.05, 0.15]) {
      iso.r.poly([iso.P(u + du, v1, 30), iso.P(u + du + 0.06, v1, 30), iso.P(u + du + 0.06, v1, 60), iso.P(u + du + 0.03, v1, 68), iso.P(u + du, v1, 60)], alpha(COLORS.glassDark, 0.8));
    }
    iso.r.polyline([iso.P(u, v1, 96), iso.P(u + 0.12, v1, 112), iso.P(u + 0.24, v1, 96)], INK_W * 0.45, alpha(INK, 0.6));
  }
  // ablaq banding + crenellated parapet
  for (let z = 8; z < 124; z += 14) iso.r.poly([iso.P(u0, v1, z + 4), iso.P(u1, v1, z + 4), iso.P(u1, v1, z), iso.P(u0, v1, z)], alpha(ABLAQ, 0.42));
  for (let u = u0 + 0.1; u < u1; u += 0.22) iso.box(u, v1 - 0.03, u + 0.11, v1, 130, 136, lighten(STONE, 0.07), { ink: false });
  // the large ribbed MAMLUK DOME on its windowed drum (the mausoleum, rear corner)
  const du = u0 + (u1 - u0) * 0.32, dv = v0 + (v1 - v0) * 0.34;
  iso.box(du - 0.36, dv - 0.36, du + 0.36, dv + 0.36, 130, 150, STONE);
  // small drum windows
  for (let k = 0; k < 4; k++) iso.r.poly([iso.P(du - 0.28 + k * 0.18, dv + 0.36, 134), iso.P(du - 0.22 + k * 0.18, dv + 0.36, 134), iso.P(du - 0.22 + k * 0.18, dv + 0.36, 146), iso.P(du - 0.28 + k * 0.18, dv + 0.36, 146)], alpha(COLORS.glassDark, 0.7));
  mamlukDome(iso, du, dv, 150, 0.46, 34, false);
  // the soaring square fluted-topped MINARET at the street corner
  minaret(iso, u1 - 0.14, v1 - 0.16, 0, 184, 0.07, 'mamluk', STONE);
  return iso.build();
}

// ============================================================================
//  THE REGISTRY
// ============================================================================
// `match` is tested against the placed NAME (Arabic in the data). ORDER matters
// — the first hero whose `match` hits a name wins, so the most-specific patterns
// (the named pyramids, the specific palaces) precede the broad family patterns
// (generic "مسجد" mosque, "متحف" museum, "سفارة" embassy → handled by archetypes,
// not here). A hero only renders if its name is ALSO landmark:true in the data.

const floodLight = (topZ: number, halfW: number): HeroLightSpec => ({ kind: 'facadeFlood', topZ, halfW });

export const CITY_HEROES: BespokeHero[] = [
  // ---- GIZA (owner priority): reuse the existing fns + Sound-&-Light flood ----
  // The Sphinx FIRST so it never gets eaten by a pyramid/giza rule (mirrors
  // NAME_ICONS order). Native: أبو الهول.
  {
    city: 'cairo',
    key: 'great-sphinx',
    match: /sphinx|أبو ?الهول|تمثال أبو/iu,
    foot: [3, 2],
    seed: 5001,
    draw: (seed) => sphinxTile(seed),
    light: { kind: 'sphinxFlood', topZ: 22, halfW: 1.4 },
  },
  {
    city: 'cairo',
    key: 'pyramid-khafre',
    match: /khafre|khafra|chephren|الهرم الأوسط|هرم خفرع/iu,
    foot: [3, 3],
    seed: 5002,
    draw: (seed) => pyramidTile(seed, 'khafre'),
    light: { kind: 'pyramidFlood', topZ: 138, halfW: 1.7 },
  },
  {
    city: 'cairo',
    key: 'pyramid-menkaure',
    match: /menkaure|mykerinos|menkaura|الهرم الأصغر|هرم منقرع|meritites|hemiunu|tomb of/iu,
    foot: [2, 2],
    seed: 5003,
    draw: (seed) => pyramidTile(seed, 'menkaure'),
    light: { kind: 'pyramidFlood', topZ: 96, halfW: 1.3 },
  },
  {
    city: 'cairo',
    key: 'great-pyramid',
    match: /khufu|cheops|great pyramid|الهرم الأكبر|هرم خوفو|\bpyramid|\bgiza\b|gizeh|أهرام|هرم|الجيزة/iu,
    foot: [4, 4],
    seed: 5004,
    draw: (seed) => pyramidTile(seed, 'great'),
    light: { kind: 'pyramidFlood', topZ: 178, halfW: 2.0 },
  },

  // ---- The Citadel & Muhammad Ali Mosque ----
  {
    city: 'cairo',
    key: 'muhammad-ali-mosque',
    match: /muhammad ali|mohamed ali|alabaster mosque|مسجد محمد علي|محمد علي/iu,
    foot: [3, 3],
    seed: 5101,
    draw: muhammadAliMosque,
    light: { kind: 'facadeFlood', topZ: 200, halfW: 1.5 },
  },
  {
    city: 'cairo',
    key: 'citadel-saladin',
    match: /citadel|saladin|قلعة صلاح الدين|القلعة/iu,
    foot: [3, 3],
    seed: 5102,
    draw: citadel,
    light: { kind: 'facadeFlood', topZ: 64, halfW: 1.6 },
  },
  {
    city: 'cairo',
    key: 'al-gawhara-palace',
    match: /gawhara|gawhara|جوهرة|الجوهرة/iu,
    foot: [2, 2],
    seed: 5103,
    draw: gawharaPalace,
    light: floodLight(40, 1.0),
  },

  // ---- Cairo Tower ----
  {
    city: 'cairo',
    key: 'cairo-tower',
    match: /cairo tower|برج القاهرة/iu,
    foot: [1, 1],
    seed: 5201,
    draw: cairoTower,
    light: { kind: 'aerialBeacon', topZ: 300, halfW: 0.28 },
  },

  // ---- Great mosques (bespoke domes + minarets) ----
  {
    city: 'cairo',
    key: 'al-hakim-mosque',
    match: /al[- ]?hakim|الحاكم|جامع الحاكم/iu,
    foot: [3, 3],
    seed: 5301,
    draw: (seed) =>
      mosque(seed, {
        foot: 3, head: 170, bodyH: 50, domeR: 0.5, domeRise: 30, style: 'fatimid',
        ablaqBands: false,
        minarets: [{ u: 0.4, v: 2.6, h: 132, r: 0.1 }, { u: 2.6, v: 2.6, h: 138, r: 0.1 }],
      }),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.5 },
  },
  {
    city: 'cairo',
    key: 'sultan-hassan-mosque',
    match: /sultan hassan|السلطان حسن|مسجد السلطان حسن/iu,
    foot: [3, 3],
    seed: 5302,
    draw: (seed) =>
      mosque(seed, {
        foot: 3, head: 220, bodyH: 78, domeR: 0.62, domeRise: 44, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 2.62, v: 2.62, h: 196, r: 0.085 }],
      }),
    light: { kind: 'facadeFlood', topZ: 200, halfW: 1.6 },
  },
  {
    city: 'cairo',
    key: 'al-rifai-mosque',
    match: /al[- ]?rifa|الرفاعي|مسجد الرفاعي/iu,
    foot: [3, 3],
    seed: 5303,
    draw: (seed) =>
      mosque(seed, {
        foot: 3, head: 200, bodyH: 64, domeR: 0.56, domeRise: 38, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 2.6, h: 168 }, { u: 2.6, v: 0.4, h: 168 }],
      }),
    light: { kind: 'facadeFlood', topZ: 180, halfW: 1.6 },
  },
  {
    city: 'cairo',
    key: 'al-nasir-muhammad-mosque',
    match: /al[- ]?nasir|الناصر محمد|جامع الناصر/iu,
    foot: [2, 2],
    seed: 5304,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 150, bodyH: 40, domeR: 0.36, domeRise: 24, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 1.62, v: 1.62, h: 120 }],
      }),
    light: floodLight(120, 1.1),
  },
  {
    city: 'cairo',
    key: 'al-aqmar-mosque',
    match: /al[- ]?aqmar|الأقمر|جامع الأقمر/iu,
    foot: [1, 1],
    seed: 5305,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 120, bodyH: 28, domeR: 0.18, domeRise: 14, style: 'fatimid',
        minarets: [{ u: 0.78, v: 0.78, h: 96, r: 0.08 }],
      }),
    light: floodLight(96, 0.7),
  },
  {
    city: 'cairo',
    key: 'juyushi-mosque',
    match: /juyushi|الجيوشى|الجيوشي|مسجد الجيوشى/iu,
    foot: [1, 1],
    seed: 5306,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 130, bodyH: 26, domeR: 0.16, domeRise: 13, style: 'fatimid',
        minarets: [{ u: 0.5, v: 0.78, h: 104, r: 0.085 }],
      }),
    light: floodLight(104, 0.6),
  },
  {
    city: 'cairo',
    key: 'sinan-pasha-mosque',
    match: /sinan pasha|سنان باشا|مسجد سنان/iu,
    foot: [1, 1],
    seed: 5307,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 120, bodyH: 24, domeR: 0.22, domeRise: 16, style: 'ottoman',
        minarets: [{ u: 0.78, v: 0.5, h: 100, r: 0.07 }],
      }),
    light: floodLight(100, 0.7),
  },
  {
    city: 'cairo',
    key: 'sulayman-pasha-mosque',
    match: /sulayman pasha|سليمان باشا|مسجد سليمان باشا/iu,
    foot: [1, 1],
    seed: 5308,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 115, bodyH: 22, domeR: 0.2, domeRise: 15, style: 'ottoman',
        minarets: [{ u: 0.5, v: 0.78, h: 96, r: 0.07 }],
      }),
    light: floodLight(96, 0.6),
  },
  {
    city: 'cairo',
    key: 'sulayman-agha-mosque',
    match: /sulayman agha|silahdar|سليمان أغا|سليمان اغا|السلحدار/iu,
    foot: [1, 1],
    seed: 5309,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 125, bodyH: 22, domeR: 0.18, domeRise: 14, style: 'ottoman',
        minarets: [{ u: 0.78, v: 0.78, h: 108, r: 0.065 }],
      }),
    light: floodLight(108, 0.6),
  },
  {
    city: 'cairo',
    key: 'omar-makram-mosque',
    match: /omar makram|عمر مكرم|مسجد عمر مكرم/iu,
    foot: [2, 2],
    seed: 5310,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 140, bodyH: 38, domeR: 0.4, domeRise: 26, style: 'mamluk',
        minarets: [{ u: 0.4, v: 1.6, h: 116 }, { u: 1.6, v: 0.4, h: 116 }],
      }),
    light: floodLight(116, 1.1),
  },
  {
    city: 'cairo',
    key: 'al-kikhya-mosque',
    match: /kikhya|kakhya|الكخيا|مسجد الكخيا/iu,
    foot: [1, 1],
    seed: 5311,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 118, bodyH: 24, domeR: 0.2, domeRise: 15, style: 'ottoman',
        minarets: [{ u: 0.78, v: 0.5, h: 98, r: 0.07 }],
      }),
    light: floodLight(98, 0.7),
  },
  {
    city: 'cairo',
    key: 'al-nour-mosque',
    match: /al[- ]?nour|al[- ]?noor|النور|مسجد النور/iu,
    foot: [2, 2],
    seed: 5312,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 150, bodyH: 40, domeR: 0.4, domeRise: 26, style: 'mamluk',
        minarets: [{ u: 0.4, v: 1.6, h: 128 }, { u: 1.6, v: 1.6, h: 128 }],
      }),
    light: floodLight(128, 1.1),
  },

  // ---- The Egyptian Museum + other museums ----
  {
    city: 'cairo',
    key: 'egyptian-museum',
    // the Tahrir museum — but NOT the Grand Egyptian Museum (الكبير) nor the
    // national-civilisation museum, which get their own entries below/before.
    match: /egyptian museum|المتحف المصري(?!.*الكبير)/iu,
    foot: [3, 3],
    seed: 5401,
    draw: egyptianMuseum,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.5 },
  },
  {
    city: 'cairo',
    key: 'grand-egyptian-museum',
    match: /grand egyptian|المتحف المصري الكبير/iu,
    foot: [3, 3],
    seed: 5402,
    draw: (seed) => museumBlock(seed, 1),
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.4 },
  },
  {
    city: 'cairo',
    key: 'museum-islamic-art',
    match: /islamic art|الفنون الأسلامية|الفنون الإسلامية|متحف الفنون/iu,
    foot: [2, 2],
    seed: 5403,
    draw: (seed) => museumBlock(seed, 0),
    light: floodLight(46, 1.0),
  },
  {
    city: 'cairo',
    key: 'coptic-museum',
    match: /coptic museum|المتحف القبطى|المتحف القبطي/iu,
    foot: [2, 2],
    seed: 5404,
    draw: copticChurch,
    light: floodLight(52, 1.0),
  },
  {
    city: 'cairo',
    key: 'nmec-museum',
    match: /national museum of egyptian|civilization|civilisation|الحضارة المصرية|القومي للحضارة|القومى للحضارة/iu,
    foot: [2, 2],
    seed: 5405,
    draw: (seed) => museumBlock(seed, 1),
    light: floodLight(60, 1.1),
  },

  // ---- Palaces ----
  {
    city: 'cairo',
    key: 'baron-empain-palace',
    match: /baron|empain|بارون|أمبان|إمبان/iu,
    foot: [2, 2],
    seed: 5501,
    draw: (seed) => palace(seed, 1),
    light: floodLight(90, 1.0),
  },
  {
    city: 'cairo',
    key: 'abdeen-palace',
    match: /abdeen|abdin|عابدين|قصر عابدين/iu,
    foot: [2, 2],
    seed: 5502,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'qubba-palace',
    match: /qubba|kubba|القبة|قصر القبة/iu,
    foot: [2, 2],
    seed: 5503,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'sakakini-palace',
    match: /sakakini|السكاكيني|قصر السكاكيني/iu,
    foot: [2, 2],
    seed: 5504,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'presidential-palace',
    match: /presidential|رئاسة|قصر رئاسة|قصر الرئاسة/iu,
    foot: [2, 2],
    seed: 5505,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },

  // ---- Coptic / Christian ----
  {
    city: 'cairo',
    key: 'all-saints-cathedral',
    match: /all saints|annunciation|cathedral|كاتدرائية|البشارة/iu,
    foot: [2, 2],
    seed: 5601,
    draw: copticChurch,
    light: floodLight(52, 1.0),
  },

  // ---- Civic / ministries / museums-civic ----
  {
    city: 'cairo',
    key: 'mogamma',
    match: /mogamma|mugamma|مجمع التحرير|المجمع/iu,
    foot: [2, 2],
    seed: 5701,
    draw: (seed) => civicSlab(seed, 0),
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'ministry-finance',
    match: /ministry of finance|finance|المالية|وزارة المالية/iu,
    foot: [2, 2],
    seed: 5702,
    draw: (seed) => civicSlab(seed, 1),
    light: { kind: 'towerCrown', topZ: 72, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'ministry-culture',
    match: /ministry of culture|الثقافة|وزارة الثقافة/iu,
    foot: [2, 2],
    seed: 5703,
    draw: (seed) => civicSlab(seed, 0),
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'drug-authority',
    match: /drug authority|الدواء|هيئة الدواء/iu,
    foot: [2, 2],
    seed: 5704,
    draw: (seed) => civicSlab(seed, 1),
    light: { kind: 'towerCrown', topZ: 72, halfW: 1.0 },
  },

  // ---- Carriage Museum (Citadel) ----
  {
    city: 'cairo',
    key: 'carriage-museum',
    match: /carriage|المركبات|متحف المركبات/iu,
    foot: [2, 2],
    seed: 5801,
    draw: (seed) => museumBlock(seed, 0),
    light: floodLight(46, 1.0),
  },
  // ---- The other Citadel museums (Gayer-Anderson, Geological, Umm Kulthum,
  //      Mokhtar, Ahmed Shawqi, Islamic Ceramics, Khalil) → small stone museum.
  {
    city: 'cairo',
    key: 'khalil-museum',
    match: /khalil|محمود خليل|متحف محمود خليل/iu,
    foot: [2, 2],
    seed: 5802,
    draw: (seed) => palace(seed, 0), // the Khalil museum is a Garden-City villa
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'islamic-ceramics-museum',
    match: /islamic ceramics|الخزف الإسلامي|متحف الخزف/iu,
    foot: [2, 2],
    seed: 5803,
    draw: (seed) => museumBlock(seed, 0),
    light: floodLight(46, 1.0),
  },

  // ==========================================================================
  //  ROUND 2 — the long-tail PLACED Cairo landmarks (51 names were unmatched;
  //  these cover the bespoke-worthy ones). Specific patterns FIRST.
  // ==========================================================================

  // ---- Fatimid / Citadel gateways ----
  {
    city: 'cairo',
    key: 'bab-zuwayla',
    // Bab Zuwayla — the twin-minareted Fatimid south gate (al-Muayyad's pair).
    match: /bab zuwayla|bab zuweila|باب زويلة|باب زويله|بوابة المتولي/iu,
    foot: [1, 1],
    seed: 5901,
    draw: (seed) => fatimidGate(seed, { head: 240, bodyH: 56, round: true, minaretsOnTop: true }),
    light: { kind: 'facadeFlood', topZ: 170, halfW: 0.9 },
  },
  {
    city: 'cairo',
    key: 'bab-al-nasr',
    // Bab al-Nasr — the SQUARE-towered northern Fatimid gate (no crown minarets).
    match: /bab al[- ]?nasr|bab el[- ]?nasr|باب النصر/iu,
    foot: [1, 1],
    seed: 5902,
    draw: (seed) => fatimidGate(seed, { head: 110, bodyH: 50, round: false, minaretsOnTop: false }),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 0.9 },
  },
  {
    city: 'cairo',
    key: 'bab-al-azab',
    // Bab al-Azab — the Citadel gate: twin round bastions, a tall pointed arch.
    match: /bab al[- ]?azab|باب العزب/iu,
    foot: [1, 1],
    seed: 5903,
    draw: (seed) => fatimidGate(seed, { head: 110, bodyH: 52, round: true, minaretsOnTop: false }),
    light: { kind: 'facadeFlood', topZ: 70, halfW: 0.9 },
  },

  // ---- The great mosques (bespoke domes / minaret clusters) ----
  {
    city: 'cairo',
    key: 'al-azhar-mosque',
    // Al-Azhar — note: NOT the Azhar Administration building (handled elsewhere).
    match: /al[- ]?azhar mosque|الجامع الأزهر|جامع الأزهر|مسجد الأزهر/iu,
    foot: [4, 4],
    seed: 5910,
    draw: azharMosque,
    light: { kind: 'facadeFlood', topZ: 196, halfW: 2.0 },
  },
  {
    city: 'cairo',
    key: 'al-hussein-mosque',
    match: /al[- ]?hussein|al[- ]?husayn|مسجد الحسين|الحسين/iu,
    foot: [3, 3],
    seed: 5911,
    draw: husseinMosque,
    light: { kind: 'facadeFlood', topZ: 178, halfW: 1.6 },
  },
  {
    city: 'cairo',
    key: 'aqsunqur-blue-mosque',
    // The "Blue Mosque" = Aqsunqur (the data labels it المسجد الأزرق).
    match: /aqsunqur|blue mosque|المسجد الأزرق|الأزرق|مسجد آق سنقر/iu,
    foot: [2, 2],
    seed: 5912,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 150, bodyH: 42, domeR: 0.42, domeRise: 28, style: 'mamluk', ablaqBands: true,
        stone: lighten(BLUE, 0.18),
        minarets: [{ u: 1.62, v: 1.62, h: 132, r: 0.07 }],
      }),
    light: { kind: 'facadeFlood', topZ: 130, halfW: 1.1 },
  },
  {
    city: 'cairo',
    key: 'baybars-mosque',
    match: /baybars|al[- ]?zahir baybars|الظاهر بيبرس|بيبرس/iu,
    foot: [4, 4],
    seed: 5913,
    draw: baybarsEnclosure,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 2.0 },
  },
  {
    city: 'cairo',
    key: 'al-muayyad-mosque',
    match: /al[- ]?mu'?ayyad|muayyad|المؤيَّد|المؤيد|السلطان المؤيد/iu,
    foot: [3, 3],
    seed: 5914,
    draw: (seed) =>
      mosque(seed, {
        foot: 3, head: 200, bodyH: 58, domeR: 0.56, domeRise: 38, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 2.6, h: 176, r: 0.062 }, { u: 2.6, v: 2.6, h: 182, r: 0.062 }],
      }),
    light: { kind: 'facadeFlood', topZ: 182, halfW: 1.6 },
  },
  // The two WIKALAS must precede the bare-qaytbay complex match below, since
  // "وكالة قايتباي" also contains قايتباي (first-match-wins).
  {
    city: 'cairo',
    key: 'wikala-al-ghuri',
    match: /wikala.*ghuri|wikalet.*ghuri|wakala.*ghuri|وكالة السلطان الغور|وكالة الغور|وكالة الغوري|وكالة السلطان الغورى/iu,
    foot: [2, 2],
    seed: 5930,
    draw: (seed) => wikala(seed, 0),
    light: floodLight(50, 1.0),
  },
  {
    city: 'cairo',
    key: 'wikala-qaytbay',
    match: /wikala.*qaytbay|wakala.*qaytbay|وكالة قايتباي|وكالة قايتباى/iu,
    foot: [2, 2],
    seed: 5931,
    draw: (seed) => wikala(seed, 1),
    light: floodLight(52, 1.0),
  },
  {
    city: 'cairo',
    key: 'sultan-qaytbay-complex',
    // Qaytbay's funerary complex — THE chevron-ribbed dome + ornate carved minaret.
    // (Wikalas above already claimed "وكالة قايتباي".)
    match: /qaytbay|qaitbay|qa'itbay|قايتباي|قايتباى|قايت باي|قايتبای/iu,
    foot: [2, 2],
    seed: 5915,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 180, bodyH: 40, domeR: 0.42, domeRise: 30, chevron: true, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 1.62, v: 0.4, h: 150, r: 0.06 }],
      }),
    light: { kind: 'facadeFlood', topZ: 150, halfW: 1.1 },
  },
  {
    city: 'cairo',
    key: 'shaykhu-khanqah',
    // Khanqah of Amir Shaykhu (Sufi lodge) — a Mamluk twin-establishment.
    match: /shaykhu|shaikhu|shaykhun|خانقاه|شيخون|شيخو/iu,
    foot: [2, 2],
    seed: 5916,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 150, bodyH: 42, domeR: 0.36, domeRise: 24, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 1.6, h: 140, r: 0.06 }],
      }),
    light: floodLight(140, 1.1),
  },
  {
    city: 'cairo',
    key: 'gamal-abdel-nasser-mosque',
    match: /gamal abdel nasser|abdel nasser|جمال عبد الناصر|عبد الناصر/iu,
    foot: [2, 2],
    seed: 5917,
    draw: modernMosque,
    light: { kind: 'facadeFlood', topZ: 134, halfW: 1.1 },
  },

  // ---- Mamluk funerary domes ----
  {
    city: 'cairo',
    key: 'imam-shafii-dome',
    // The great Ayyubid dome of Imam al-Shafi'i (the lead boat-and-crescent).
    match: /imam al[- ]?shafi|al[- ]?shafi'?i|الشافعي|الإمام الشافعي|قبة الإمام الشافعي/iu,
    foot: [2, 2],
    seed: 5920,
    draw: (seed) => domedMausoleum(seed, 0),
    light: { kind: 'facadeFlood', topZ: 110, halfW: 1.2 },
  },
  {
    city: 'cairo',
    key: 'shajarat-al-durr-dome',
    match: /shajarat al[- ]?durr|shajar al[- ]?durr|شجر الدر|شجرة الدر|قبة شجر الدر/iu,
    foot: [1, 1],
    seed: 5921,
    draw: (seed) => domedMausoleum(seed, 1),
    light: floodLight(70, 0.7),
  },

  // ---- Sabil-kuttab + the tentmakers' qasaba (caravanserai-row) ----
  {
    city: 'cairo',
    key: 'khusraw-sabil-kuttab',
    // Sabil-Kuttab of Khusraw Pasha (and any sabil-kuttab on al-Muizz Street).
    match: /sabil.*kuttab|khusraw|khusrew|سبيل وكتاب|سبيل كتاب|سبيل وكتاب خسرو|خسرو باشا/iu,
    foot: [1, 1],
    seed: 5932,
    draw: sabilKuttab,
    light: floodLight(50, 0.6),
  },
  {
    city: 'cairo',
    key: 'qasaba-radwan-bey',
    // The Qasaba of Radwan Bey (Tentmakers' market / Khayamiya) — a long wikala-row.
    match: /qasaba|radwan bey|tentmakers|khayamiya|قصبة رضوان|سوق الخيامية|الخيامية/iu,
    foot: [2, 2],
    seed: 5933,
    draw: (seed) => wikala(seed, 0),
    light: floodLight(50, 1.0),
  },

  // ---- Downtown Belle-Époque / Art-Deco blocks (Wust al-Balad) ----
  {
    city: 'cairo',
    key: 'yacoubian-building',
    match: /yacoubian|yaqoubian|عمارة يعقوبيان|يعقوبيان/iu,
    foot: [2, 2],
    seed: 5940,
    draw: (seed) => belleEpoque(seed, 0),
    light: { kind: 'towerCrown', topZ: 66, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'banque-misr-building',
    match: /banque misr|bank misr|بنك مصر|بانك مصر/iu,
    foot: [2, 2],
    seed: 5941,
    draw: (seed) => belleEpoque(seed, 2),
    light: { kind: 'towerCrown', topZ: 78, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'sednawy-building',
    match: /sednawy|sednaoui|صيدناوي|سيدناوي/iu,
    foot: [2, 2],
    seed: 5942,
    draw: (seed) => belleEpoque(seed, 1),
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'groppi-building',
    match: /groppi|جروبي|جروبى|غروبي/iu,
    foot: [1, 1],
    seed: 5943,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },
  {
    city: 'cairo',
    key: 'matossian-building',
    match: /matossian|ماتوسيان|متوسيان/iu,
    foot: [2, 2],
    seed: 5944,
    draw: (seed) => belleEpoque(seed, 1),
    light: { kind: 'towerCrown', topZ: 64, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'shawarbi-building',
    match: /shawarbi|el[- ]?shawarbi|الشواربي|الشواربى/iu,
    foot: [1, 1],
    seed: 5945,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },
  {
    city: 'cairo',
    key: 'shourbagy-building',
    match: /shourbagy|shorbagy|الشوربجي|الشوربجى/iu,
    foot: [1, 1],
    seed: 5946,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },
  {
    city: 'cairo',
    key: 'attaba-central',
    match: /attaba|ataba|العتبة|عتبة/iu,
    foot: [2, 2],
    seed: 5947,
    draw: (seed) => belleEpoque(seed, 2),
    light: { kind: 'towerCrown', topZ: 66, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'miami-cinema',
    match: /miami cinema|سينما ميامي|سينما ميامى/iu,
    foot: [2, 2],
    seed: 5948,
    draw: (seed) => belleEpoque(seed, 1),
    light: { kind: 'towerCrown', topZ: 56, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'bassiouny-building',
    match: /bassiouny|بسيوني|بسيونى|محمود بسيوني/iu,
    foot: [1, 1],
    seed: 5949,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },

  // ---- The Nile-corniche high-rise hotels ----
  {
    city: 'cairo',
    key: 'ramses-hilton',
    match: /ramses hilton|رمسيس هيلتون|رمسيس هلتون/iu,
    foot: [3, 3],
    seed: 5950,
    draw: (seed) => nileHighRise(seed, 0),
    light: { kind: 'towerCrown', topZ: 232, halfW: 1.2 },
  },
  {
    city: 'cairo',
    key: 'semiramis-hotel',
    match: /semiramis|سميراميس|إنتركونتيننتال سميراميس|انتركونتيننتال/iu,
    foot: [3, 3],
    seed: 5951,
    draw: (seed) => nileHighRise(seed, 1),
    light: { kind: 'towerCrown', topZ: 266, halfW: 1.2 },
  },
  {
    city: 'cairo',
    key: 'grand-nile-tower',
    // Hilton Cairo Grand Nile (the former Grand Hyatt twin tower on Roda).
    match: /grand nile|grand hyatt|hilton cairo grand|جراند نيل|جراند هيات|النيل الكبير/iu,
    foot: [3, 3],
    seed: 5952,
    draw: (seed) => nileHighRise(seed, 2),
    light: { kind: 'towerCrown', topZ: 302, halfW: 1.2 },
  },
  {
    city: 'cairo',
    key: 'nile-tower',
    // A Nile-side tower placed simply as النيل (anchored so it does NOT eat the
    // Qasr al-Nil BRIDGE كوبري قصر النيل, which the bridge archetype handles).
    match: /^النيل$|nile tower|nile city/iu,
    foot: [3, 3],
    seed: 5953,
    draw: (seed) => nileHighRise(seed, 1),
    light: { kind: 'towerCrown', topZ: 266, halfW: 1.2 },
  },

  // ---- Hotels (Belle-Époque low-rise) ----
  {
    city: 'cairo',
    key: 'windsor-hotel',
    match: /windsor|وندسور|ويندسور/iu,
    foot: [1, 1],
    seed: 5960,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },
  {
    city: 'cairo',
    key: 'victoria-hotel',
    match: /victoria|فيكتوريا|فكتوريا/iu,
    foot: [1, 1],
    seed: 5961,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },
  {
    city: 'cairo',
    key: 'steigenberger-hotel',
    match: /steigenberger|شتيجنبرجر|ستيجنبرجر|el tahrir cairo/iu,
    foot: [3, 3],
    seed: 5962,
    draw: (seed) => nileHighRise(seed, 0),
    light: { kind: 'towerCrown', topZ: 232, halfW: 1.2 },
  },

  // ---- Cairo Opera House (National Cultural Centre, Gezira) ----
  {
    city: 'cairo',
    key: 'cairo-opera-house',
    match: /opera house|cairo opera|دار الأوبرا|الأوبرا المصرية|الاوبرا/iu,
    foot: [4, 4],
    seed: 5970,
    draw: operaHouse,
    light: { kind: 'facadeFlood', topZ: 56, halfW: 2.0 },
  },

  // ---- Religious (synagogue + the round Coptic/Orthodox church) ----
  {
    city: 'cairo',
    key: 'shaar-hashamayim-synagogue',
    match: /hashamayim|sha'?ar hashamayim|synagogue|شعار هشامايم|معبد|الكنيس/iu,
    foot: [1, 1],
    seed: 5980,
    draw: synagogue,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 0.9 },
  },
  {
    city: 'cairo',
    key: 'mar-girgis-church',
    // Mar Girgis (St George) — the round Greek-Orthodox church of Coptic Cairo.
    match: /mar girgis|st\.? george|saint george|مار جرجس|الجرجس/iu,
    foot: [1, 1],
    seed: 5981,
    draw: roundChurch,
    light: { kind: 'facadeFlood', topZ: 50, halfW: 0.8 },
  },
  {
    city: 'cairo',
    key: 'saint-fatima-basilica',
    // Saint Fatima Basilica (Heliopolis) — a tall pale modern basilica.
    match: /saint fatima|st fatima|basilique|سانت فاتيما|البازيليك/iu,
    foot: [2, 2],
    seed: 5982,
    draw: copticChurch,
    light: { kind: 'facadeFlood', topZ: 60, halfW: 1.0 },
  },

  // ---- The aqueduct intake tower ----
  {
    city: 'cairo',
    key: 'fum-al-khalig-tower',
    match: /fum al[- ]?khalig|fumm al[- ]?khalig|aqueduct|فم الخليج|مجرى العيون|سور مجرى/iu,
    foot: [1, 1],
    seed: 5990,
    draw: aqueductTower,
    light: { kind: 'aerialBeacon', topZ: 64, halfW: 0.5 },
  },

  // ---- Civic / cultural / faculty / club ----
  {
    city: 'cairo',
    key: 'foreign-ministry',
    match: /foreign affairs|ministry of foreign|الخارجية|وزارة الخارجية/iu,
    foot: [2, 2],
    seed: 5991,
    draw: (seed) => civicTower(seed, 1),
    light: { kind: 'towerCrown', topZ: 112, halfW: 1.0 },
  },
  {
    city: 'cairo',
    key: 'dar-al-uloom-faculty',
    match: /dar al[- ]?uloom|dar al[- ]?olum|دار العلوم|كلية دار العلوم/iu,
    foot: [3, 3],
    seed: 5992,
    draw: egyptianMuseum,
    light: floodLight(56, 1.5),
  },
  {
    city: 'cairo',
    key: 'arab-music-institute',
    match: /arab music|arabic music|institute for arabic|معهد الموسيقى|الموسيقى العربية/iu,
    foot: [1, 1],
    seed: 5993,
    draw: (seed) => mosque(seed, {
      foot: 1, head: 110, bodyH: 26, domeR: 0.18, domeRise: 13, style: 'mamluk',
      minarets: [{ u: 0.78, v: 0.78, h: 92, r: 0.07 }],
    }),
    light: floodLight(50, 0.7),
  },
  {
    city: 'cairo',
    key: 'diplomatic-club',
    match: /diplomatic club|النادي الدبلوماسي|النادى الدبلوماسي|الدبلوماسي/iu,
    foot: [2, 2],
    seed: 5994,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'townhouse-gallery',
    match: /townhouse|تاون هاوس|تاونهاوس/iu,
    foot: [1, 1],
    seed: 5995,
    draw: (seed) => belleEpoque(seed, 3),
    light: { kind: 'towerCrown', topZ: 56, halfW: 0.7 },
  },

  // ---- More palaces (Zaafaran / Kasr Kamal al-Din / Beshtak) ----
  {
    city: 'cairo',
    key: 'zaafaran-palace',
    match: /zaafaran|za'faran|الزعفران|قصر الزعفران/iu,
    foot: [2, 2],
    seed: 5996,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'kasr-kamal-al-din',
    match: /kamal al[- ]?din|kamal el[- ]?din|كمال الدين|قصر كمال الدين/iu,
    foot: [2, 2],
    seed: 5997,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'beshtak-palace',
    match: /beshtak|bashtak|بشتاك|قصر بشتاك/iu,
    foot: [1, 1],
    seed: 5998,
    draw: (seed) => belleEpoque(seed, 3),
    light: floodLight(50, 0.7),
  },

  // ---- The remaining Citadel / Roda museums (Gayer-Anderson, Geological, Umm
  //      Kulthum, Mahmoud Mukhtar, Ahmed Shawqi) → bespoke museum/villa massing ----
  {
    city: 'cairo',
    key: 'gayer-anderson-museum',
    // Two joined Ottoman merchant houses (Bayt al-Kritliyya) — mashrabiya villa.
    match: /gayer[- ]?anderson|kritliyya|جاير أندرسون|جاير اندرسون|بيت الكريتلية/iu,
    foot: [2, 2],
    seed: 5810,
    draw: gawharaPalace,
    light: floodLight(40, 1.0),
  },
  {
    city: 'cairo',
    key: 'geological-museum',
    match: /geological|الجيولوجي|الجيولوجى|المتحف الجيولوجي/iu,
    foot: [2, 2],
    seed: 5811,
    draw: (seed) => museumBlock(seed, 1),
    light: floodLight(46, 1.0),
  },
  {
    city: 'cairo',
    key: 'umm-kulthum-museum',
    // The Umm Kulthum Museum at the Manesterly Palace, Roda (a riverside pavilion).
    match: /umm kulthum|oum kalthoum|أم كلثوم|ام كلثوم|المانسترلي|قصر المانسترلي/iu,
    foot: [2, 2],
    seed: 5812,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },
  {
    city: 'cairo',
    key: 'mahmoud-mukhtar-museum',
    match: /mukhtar|mokhtar|مختار|محمود مختار|متحف مختار/iu,
    foot: [2, 2],
    seed: 5813,
    draw: (seed) => museumBlock(seed, 1),
    light: floodLight(46, 1.0),
  },
  {
    city: 'cairo',
    key: 'ahmed-shawqi-museum',
    // Karmet Ibn Hani — Ahmed Shawqi's Nile villa (Giza).
    match: /shawqi|shawky|shauqi|شوقي|شوقى|أحمد شوقي|كرمة ابن هانئ/iu,
    foot: [2, 2],
    seed: 5814,
    draw: (seed) => palace(seed, 0),
    light: floodLight(80, 1.0),
  },

  // ==========================================================================
  //  ROUND 3 — the old-Cairo long tail to round the city to 100 bespoke heroes.
  //  (al-Nasir-Muhammad above already claims "قلاوون" in جامع الناصر محمد بن
  //  قلاوون, so the Qalawun COMPLEX below places under its own distinct name.)
  // ==========================================================================
  {
    city: 'cairo',
    key: 'ibn-tulun-mosque',
    // The great Abbasid mosque with the spiral minaret. Native: مسجد ابن طولون.
    match: /ibn tulun|ibn tulon|ابن طولون|أحمد ابن طولون|جامع ابن طولون/iu,
    foot: [5, 5],
    seed: 5970,
    draw: ibnTulunMosque,
    light: { kind: 'facadeFlood', topZ: 132, halfW: 2.4 },
  },
  {
    city: 'cairo',
    key: 'qalawun-complex',
    match: /qalawun|qalaun|qala'un|مجمع قلاوون|قبة قلاوون|مدرسة قلاوون|بيمارستان قلاوون/iu,
    foot: [2, 2],
    seed: 5971,
    draw: qalawunComplex,
    light: { kind: 'facadeFlood', topZ: 188, halfW: 1.1 },
  },
  {
    city: 'cairo',
    key: 'sultan-barquq-complex',
    // Funerary complex of Sultan Barquq, al-Muizz St (twin domes + twin minarets).
    match: /barquq|barqouq|barqūq|برقوق|السلطان برقوق|مجمع برقوق/iu,
    foot: [3, 3],
    seed: 5972,
    draw: (seed) =>
      mosque(seed, {
        foot: 3, head: 200, bodyH: 60, domeR: 0.5, domeRise: 36, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 2.6, h: 176, r: 0.062 }, { u: 2.6, v: 2.6, h: 170, r: 0.062 }],
      }),
    light: { kind: 'facadeFlood', topZ: 182, halfW: 1.6 },
  },
  {
    city: 'cairo',
    key: 'salih-talai-mosque',
    // Al-Salih Tala'i — the last Fatimid mosque, on a raised arcaded porch, by
    // Bab Zuwayla. (Anchored so it doesn't grab Sultan al-Salih / Salihiyya.)
    match: /tala'?i|talai|طلائع|الصالح طلائع|مسجد الصالح طلائع/iu,
    foot: [2, 2],
    seed: 5973,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 140, bodyH: 36, domeR: 0.3, domeRise: 20, style: 'fatimid',
        minarets: [{ u: 1.6, v: 0.4, h: 124, r: 0.08 }],
      }),
    light: floodLight(124, 1.1),
  },
  {
    city: 'cairo',
    key: 'salihiyya-madrasa',
    // Ayyubid madrasa-mausoleum of as-Salih Najm ad-Din Ayyub, al-Muizz St —
    // its tall square brick minaret + ribbed mausoleum dome.
    match: /salihiyya|salihiya|al[- ]?salih najm|المدرسة الصالحية|الصالحية النجمية|مدرسة الصالح نجم/iu,
    foot: [2, 2],
    seed: 5974,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 170, bodyH: 44, domeR: 0.34, domeRise: 24, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 1.6, h: 150, r: 0.072 }],
      }),
    light: floodLight(150, 1.1),
  },
  {
    city: 'cairo',
    key: 'sultan-ghuri-mosque',
    // Mosque-Madrasa of Sultan al-Ghuri — the red-and-white chequered square
    // minaret with a multi-headed top. (The wikala/qasaba al-Ghuri are separate.)
    match: /al[- ]?ghuri mosque|ghuri madrasa|madrasa.*ghuri|جامع.*الغوري|مدرسة.*الغوري|مسجد.*الغوري/iu,
    foot: [2, 2],
    seed: 5975,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 180, bodyH: 50, domeR: 0.3, domeRise: 22, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 1.62, v: 0.4, h: 158, r: 0.085 }],
      }),
    light: { kind: 'facadeFlood', topZ: 160, halfW: 1.1 },
  },
  {
    city: 'cairo',
    key: 'qanibay-al-ramah-mosque',
    // Mosque of Qani-Bay al-Rammah, on the slope below the Citadel (Salah al-Din
    // Square): a slim Mamluk mosque with a tall carved minaret + carved dome.
    match: /qanibay|qani[- ]?bay|qani bay|al[- ]?ramah|al[- ]?rammah|قانيباي|قاني باي|الرماح/iu,
    foot: [2, 2],
    seed: 5976,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 180, bodyH: 46, domeR: 0.34, domeRise: 26, chevron: true, style: 'mamluk', ablaqBands: true,
        minarets: [{ u: 0.4, v: 1.6, h: 156, r: 0.065 }],
      }),
    light: { kind: 'facadeFlood', topZ: 158, halfW: 1.1 },
  },
  {
    city: 'cairo',
    key: 'mahmudiya-mosque',
    // Mosque of Mahmud Pasha (al-Mahmudiya), facing Bab al-Azab at the Citadel —
    // an Ottoman mosque with a pencil minaret + a single lead-grey dome.
    match: /mahmudiya|mahmoudia|mahmud pasha|محمودية|المحمودية|مسجد محمود باشا/iu,
    foot: [2, 2],
    seed: 5977,
    draw: (seed) =>
      mosque(seed, {
        foot: 2, head: 150, bodyH: 40, domeR: 0.4, domeRise: 28, style: 'ottoman',
        minarets: [{ u: 1.62, v: 1.62, h: 128, r: 0.06 }],
      }),
    light: floodLight(128, 1.1),
  },
  {
    city: 'cairo',
    key: 'rahma-mosque',
    // El-Rahma Mosque (1926) — a Neo-Mamluk neighbourhood mosque: dome + a single
    // carved minaret. (Anchored so it doesn't grab الرحمن / other names.)
    match: /el[- ]?rahma|al[- ]?rahma mosque|مسجد الرحمة|الرحمة/iu,
    foot: [1, 1],
    seed: 5978,
    draw: (seed) =>
      mosque(seed, {
        foot: 1, head: 130, bodyH: 28, domeR: 0.2, domeRise: 15, style: 'mamluk',
        minarets: [{ u: 0.78, v: 0.78, h: 108, r: 0.07 }],
      }),
    light: floodLight(108, 0.7),
  },
  {
    city: 'cairo',
    key: 'azhar-admin-building',
    // The Al-Azhar Administration Building (Mashyakhat al-Azhar) — a modern
    // Neo-Mamluk civic block beside the mosque (NOT the mosque, claimed above).
    match: /azhar administration|mashyakha|مشيخة الأزهر|إدارة الأزهر|مبنى الأزهر|الإدارة الأزهرية/iu,
    foot: [2, 2],
    seed: 5979,
    draw: (seed) => civicTower(seed, 1),
    light: { kind: 'towerCrown', topZ: 112, halfW: 1.0 },
  },
];
