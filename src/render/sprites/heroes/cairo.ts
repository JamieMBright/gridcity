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
];
