// London's bespoke-hero registry (Wave W3 — round 1). The owner doctrine is
// 100 bespoke heroes per city, every one a hand-drawn iso sprite with its own
// night-electrification light. This file carries London's set, drawn in the
// same ink-contour dusk idiom as src/render/sprites/landmarkSprites.ts (sun
// low in the south-east: warm right faces, cool-navy left shade, ink contours).
//
// TWO sources of art:
//   1. MARQUEE reuses — London already has hand-drawn bespoke draw fns for its
//      most famous icons (the Shard, BT Tower, the Gherkin, Tower Bridge, St
//      Paul's dome, Parliament, the Eye, the O2, Wembley, ExCeL, Kew, Ally
//      Pally, Battersea, the Olympic stadium/orbit/velodrome). Each is wired as
//      a BespokeHero that REUSES the existing landmarkSprites fn as its `draw`,
//      so we don't redraw what already reads well — we just bring it into the
//      string-keyed hero system with its own bespoke light.
//   2. NEW bespoke draws — everything else (the rail termini, the great
//      museums, the palaces, the South-Bank set, the City civics) gets a fresh
//      custom `draw(seed)` built from boxes/prisms/roofs so its SILHOUETTE
//      reads as the real building, sized per-hero (a cathedral broad, a station
//      long, a skyscraper slim+tall, an airport a monster).
//
// Each `match` hits the PLACED name (London's NAMED_PLACES today, plus the
// research-doc labels the placement pass adds); first match wins. `foot` MUST
// equal the footprint the draw fn builds (its `new Iso(w,h,…)`). `light` is the
// per-hero electrification show.
//
// NOTE for integration (parent owns): populating this array makes London render
// its heroes via buildHeroTable, so hero footprints now stamp London tiles —
// London is NO LONGER byte-identical (intended; SAVE_VERSION bumps at
// integration). The heroRegistry.test "London has ZERO heroes" / byCity.london
// === 0 assertions become stale by design and need updating by the parent.

import type { BespokeHero } from './registry';
import type { HeroLightSpec } from '../../heroLights';
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
import {
  allypallyTile,
  bttowerTile,
  domeTile,
  EXCEL_H,
  EXCEL_W,
  excelTile,
  eyeTile,
  gherkinTile,
  kewhouseTile,
  O2_H,
  O2_W,
  o2domeTile,
  orbitTile,
  parliamentTile,
  powerstationTile,
  spireTile,
  STADIUM_H,
  STADIUM_W,
  stadiumTile,
  towerBridgeTile,
  velodromeTile,
  wembleyTile,
  WEMBLEY_H,
  WEMBLEY_W,
} from '../landmarkSprites';

// --- shared London palette (matches landmarkSprites' literals) ---------------
const STONE_DARK = hex('#b3a78e');
const BRICK = hex('#a8543c'); // London stock / Midland red
const BRICK_DK = hex('#7e3e2c');
const YELLOW_BRICK = hex('#cdb178'); // King's Cross / Bloomsbury stock
const BATH = hex('#e3cf9d'); // warm Bath stone
const PORTLAND = hex('#e0d9c6'); // pale Portland stone
const TERRACOTTA = hex('#b7705a'); // Natural History Museum
const TERRACOTTA_L = hex('#cf9173');
const LEAD = hex('#5d6b80'); // lead roofs / cupolas
const SLATE = hex('#4f5a6b'); // dark slate roofs
const GLASS_SHED = alpha(hex('#bcd0e0'), 0.85); // train-shed glazing
const GLASS_DK = alpha(COLORS.glassDark, 0.9);

/** Small helper: a half-round arched glazed gable face on the v1 (left) wall —
 *  the recurring train-shed / portal end. Returns nothing (paints in place). */
function archGableLeft(
  iso: Iso,
  v: number,
  uA: number,
  uB: number,
  zSpring: number,
  zApex: number,
  glass: RGBA,
  frame: RGBA,
): void {
  const um = (uA + uB) / 2;
  const pts: Pt[] = [iso.P(uA, v, 0), iso.P(uA, v, zSpring)];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = uA + (uB - uA) * t;
    const z = zSpring + Math.sin(t * Math.PI) * (zApex - zSpring);
    pts.push(iso.P(u, v, z));
  }
  pts.push(iso.P(uB, v, zSpring), iso.P(uB, v, 0));
  iso.r.poly(pts, glass);
  // arch ring ink + a couple of radial glazing bars
  iso.r.polyline(pts.slice(2, pts.length - 2), INK_W * 0.6, alpha(INK, 0.7));
  for (const t of [0.28, 0.5, 0.72]) {
    const u = uA + (uB - uA) * t;
    const z = zSpring + Math.sin(t * Math.PI) * (zApex - zSpring);
    iso.r.line(iso.P(u, v, 0), iso.P(u, v, z), 0.6 * RES, alpha(frame, 0.6));
  }
  iso.r.line(iso.P(um, v, 0), iso.P(um, v, zApex), 0.7 * RES, alpha(frame, 0.7));
}

// =============================================================================
// NEW BESPOKE DRAWS
// =============================================================================

/** ST PANCRAS: the great red-brick High-Victorian Gothic terminus — the
 *  Midland Grand Hotel frontage (steep slated roof, a forest of pinnacles, the
 *  tall clock tower at one end and a slimmer spire at the other) in front of
 *  W.H. Barlow's vast single-span glazed train shed behind. The most romantic
 *  roofline in London — drawn TALL so the clock tower towers over Euston Road. */
function stPancrasTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 200 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.24, 0.22);

  // the Barlow train shed behind (a tall glazed half-cylinder over the platforms)
  const shedU0 = 0.4;
  const shedU1 = 3.6;
  const [sx, syB] = iso.P((shedU0 + shedU1) / 2, 0.7, 0);
  const shedR = 1.42 * (CELL_W / 2);
  const vault: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * (i / 24);
    vault.push([sx + Math.cos(a) * shedR, syB - 96 * RES - Math.sin(a) * shedR * 0.78]);
  }
  iso.r.poly([...vault, [sx + shedR, syB - 60 * RES], [sx - shedR, syB - 60 * RES]], GLASS_SHED, alpha(hex('#7d92ad'), 0.85));
  iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
  // ribs across the glazed vault
  for (let i = 2; i < 24; i += 3) {
    const a = Math.PI * (i / 24);
    iso.r.line([sx + Math.cos(a) * shedR, syB - 60 * RES], [sx + Math.cos(a) * shedR, syB - 96 * RES - Math.sin(a) * shedR * 0.78], 0.7 * RES, alpha(COLORS.white, 0.5));
  }

  // the long red-brick hotel range across the FRONT (high v), steep slate roof
  const fu0 = 0.5;
  const fu1 = 3.5;
  const fv0 = 2.7;
  const fv1 = 3.55;
  const Hbody = 70;
  iso.box(fu0, fv0, fu1, fv1, 0, Hbody, BRICK);
  // three storeys of pointed Gothic windows + a stone string course
  for (const [zb, zt] of [[12, 26], [30, 44], [48, 62]] as const) {
    iso.windowsLeft(fv1, fu0 + 0.1, fu1 - 0.1, zb, zt, 14, GLASS_DK, BATH);
  }
  iso.box(fu0 - 0.02, fv0 - 0.02, fu1 + 0.02, fv1 + 0.02, Hbody, Hbody + 3, lighten(BRICK, 0.05), { ink: false });
  // the steep, characterful slate roof with dormers
  iso.gable(fu0, fv0, fu1, fv1, Hbody + 3, 22, 'u', SLATE, BRICK);
  for (let u = fu0 + 0.35; u < fu1 - 0.2; u += 0.55) {
    iso.box(u - 0.06, fv1 - 0.04, u + 0.06, fv1, Hbody + 4, Hbody + 14, BRICK_DK, { ink: false });
    iso.r.poly([iso.P(u - 0.06, fv1, Hbody + 14), iso.P(u + 0.06, fv1, Hbody + 14), iso.P(u, fv1, Hbody + 20)], SLATE);
  }
  // a ridge line of little pinnacles (the unmistakable spiky St Pancras roofline)
  for (let u = fu0 + 0.2; u <= fu1 - 0.1; u += 0.4) {
    const [pxk, pyk] = iso.P(u, (fv0 + fv1) / 2, Hbody + 25);
    iso.r.poly([[pxk - 1.4 * RES, pyk], [pxk + 1.4 * RES, pyk], [pxk, pyk - 8 * RES]], lighten(SLATE, 0.1));
    iso.r.line([pxk, pyk], [pxk, pyk - 9 * RES], 0.7 * RES, alpha(INK, 0.6));
  }

  // THE CLOCK TOWER at the east (right) end — the dominant vertical
  const ctu = fu1 - 0.4;
  iso.box(ctu - 0.34, fv0 + 0.05, ctu + 0.18, fv1, 0, 150, BRICK);
  iso.windowsLeft(fv1, ctu - 0.28, ctu + 0.12, 60, 96, 2, GLASS_DK, BATH);
  // the clock face high on the front
  const [clx, cly] = iso.P(ctu - 0.08, fv1, 120);
  const clockR = 5 * RES;
  const clock: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    clock.push([clx + Math.cos(a) * clockR, cly + Math.sin(a) * clockR]);
  }
  iso.r.poly(clock, COLORS.white);
  iso.r.polyline(clock, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - clockR * 0.7], 1 * RES, INK);
  iso.r.line([clx, cly], [clx + clockR * 0.5, cly], 1 * RES, INK);
  // the tall pinnacled cap + spirelet
  iso.box(ctu - 0.38, fv0, ctu + 0.22, fv1 + 0.03, 150, 158, lighten(BRICK, 0.06), { ink: false });
  iso.hip(ctu - 0.36, fv0 + 0.02, ctu + 0.2, fv1 + 0.02, 158, 30, SLATE);
  const [tipx, tipy] = iso.P(ctu - 0.08, (fv0 + fv1) / 2, 188);
  iso.r.line([tipx, tipy], [tipx, tipy - 10 * RES], 1.4 * RES, COLORS.glassLit);
  for (const [pu, pv] of [[ctu - 0.36, fv0 + 0.02], [ctu + 0.2, fv0 + 0.02], [ctu - 0.36, fv1 + 0.02], [ctu + 0.2, fv1 + 0.02]] as const) {
    iso.box(pu - 0.03, pv - 0.03, pu + 0.03, pv + 0.03, 158, 178, BRICK_DK, { ink: false });
  }

  // a slimmer western spire tower (the Midland Grand's NW turret)
  const wtu = fu0 + 0.45;
  iso.box(wtu - 0.16, fv0 + 0.1, wtu + 0.16, fv0 + 0.42, 0, 116, BRICK);
  iso.hip(wtu - 0.18, fv0 + 0.08, wtu + 0.18, fv0 + 0.44, 116, 40, SLATE);
  const [wsx, wsy] = iso.P(wtu, fv0 + 0.26, 156);
  iso.r.line([wsx, wsy], [wsx, wsy - 8 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** KING'S CROSS: Lewis Cubitt's austere yellow-brick terminus — TWO great
 *  round-arched train-shed gables side by side on a plain stock-brick front,
 *  with the squat Italianate clock turret rising between them. The modern
 *  white lattice western concourse is suggested as a low glazed sweep. */
function kingsCrossTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 150 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.24, 0.22);

  // the long yellow-brick front block
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 2.6;
  const v1 = 3.5;
  iso.box(u0, v0, u1, v1, 0, 40, YELLOW_BRICK);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 5, shaded(YELLOW_BRICK, 0.12), { ink: false });

  // the two great brick arched gables on the front (the signature face)
  const archW = (u1 - u0) / 2;
  for (let k = 0; k < 2; k++) {
    const aL = u0 + archW * k + 0.12;
    const aR = u0 + archW * (k + 1) - 0.12;
    // brick gable wall behind the lunette, rising to a rounded head
    const gable: Pt[] = [iso.P(aL, v1, 0), iso.P(aL, v1, 70)];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const u = aL + (aR - aL) * t;
      const z = 70 + Math.sin(t * Math.PI) * 30;
      gable.push(iso.P(u, v1, z));
    }
    gable.push(iso.P(aR, v1, 70), iso.P(aR, v1, 0));
    iso.r.poly(gable, lit(YELLOW_BRICK, 0.04));
    // the recessed glazed lunette (the famous semicircular window)
    archGableLeft(iso, v1 - 0.001, aL + 0.06, aR - 0.06, 40, 92, GLASS_SHED, COLORS.white);
  }
  // ridge + the half-cylinder sheds visible behind the gables
  for (let k = 0; k < 2; k++) {
    const am = u0 + archW * (k + 0.5);
    const [hx, hyB] = iso.P(am, v0 + 0.2, 0);
    const R = archW * 0.46 * (CELL_W / 2);
    const sh: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      sh.push([hx + Math.cos(a) * R, hyB - 70 * RES - Math.sin(a) * R * 0.7]);
    }
    iso.r.poly([...sh], alpha(hex('#9aaec2'), 0.7));
  }

  // the central Italianate clock turret between the two gables
  const ct = (u0 + u1) / 2;
  iso.box(ct - 0.22, v1 - 0.18, ct + 0.22, v1 + 0.02, 0, 104, YELLOW_BRICK);
  const [clx, cly] = iso.P(ct, v1 + 0.02, 86);
  const cr = 4.6 * RES;
  const clock: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    clock.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]);
  }
  iso.r.poly(clock, COLORS.white);
  iso.r.polyline(clock, INK_W * 0.6, INK, true);
  iso.r.line([clx, cly], [clx, cly - cr * 0.7], 0.9 * RES, INK);
  // shallow pyramid cap + finial
  iso.hip(ct - 0.24, v1 - 0.2, ct + 0.24, v1 + 0.04, 104, 14, LEAD);
  const [ktx, kty] = iso.P(ct, v1 - 0.08, 118);
  iso.r.line([ktx, kty], [ktx, kty - 7 * RES], 1.1 * RES, COLORS.glassLit);
  return iso.build();
}

/** PADDINGTON: Brunel's Great Western terminus — three parallel wrought-iron
 *  and glass train-shed barrel vaults running front-to-back (the great triple
 *  arched roof), in oxidised iron-green and pale glass on low brick walls. Each
 *  vault is a properly extruded barrel: the curved roof surface recedes from
 *  the front arched gable to the back, GROUNDED on its side walls (not a
 *  floating disc). */
function paddingtonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 130 });
  void seed;
  const IRON = hex('#6f8a82'); // oxidised GWR iron-green
  const GST = hex('#c4bcab'); // soot-grey station stone
  iso.shadow(0.35, 0.5, 3.65, 3.65, 0.22, 0.22);
  // the three vaults span across u; each runs the full depth in v (back→front)
  const vBack = 0.55;
  const vFront = 3.5;
  const wallZ = 26; // springing height (low brick walls the glazing sits on)
  const spans = [
    { u0: 0.5, u1: 1.5, H: 96 },
    { u0: 1.5, u1: 2.5, H: 116 },
    { u0: 2.5, u1: 3.5, H: 96 },
  ];
  const NB = 14;
  for (const { u0, u1, H } of spans) {
    const um = (u0 + u1) / 2;
    const rise = (H - wallZ);
    // side walls grounding the vault (brick piers down both long sides)
    iso.box(u0, vBack, u0 + 0.06, vFront, 0, wallZ, GST, { ink: false });
    iso.box(u1 - 0.06, vBack, u1, vFront, 0, wallZ, GST, { ink: false });
    // the curved glazed roof surface, as quads receding back→front (so it is a
    // solid barrel, lit on the sunny right flank, shaded on the left)
    const zAt = (t: number): number => wallZ + Math.sin(t * Math.PI) * rise;
    const uAt = (t: number): number => u0 + (u1 - u0) * t;
    for (let i = 0; i < NB; i++) {
      const t0 = i / NB;
      const t1 = (i + 1) / NB;
      const flankLit = t0 > 0.5; // east-facing half catches the sun
      const col = flankLit ? alpha(hex('#cfe0ec'), 0.9) : GLASS_SHED;
      iso.r.poly([iso.P(uAt(t0), vBack, zAt(t0)), iso.P(uAt(t1), vBack, zAt(t1)), iso.P(uAt(t1), vFront, zAt(t1)), iso.P(uAt(t0), vFront, zAt(t0))], col, alpha(hex('#8fa6b4'), 0.6));
    }
    // transverse ribs across the barrel at intervals down its length
    for (const v of [vBack + 0.1, (vBack + vFront) / 2, vFront - 0.05]) {
      const rib: Pt[] = [];
      for (let i = 0; i <= NB; i++) rib.push(iso.P(uAt(i / NB), v, zAt(i / NB)));
      iso.r.polyline(rib, 0.8 * RES, alpha(IRON, 0.85));
    }
    // longitudinal glazing bars
    for (const t of [0.25, 0.5, 0.75]) {
      iso.r.line(iso.P(uAt(t), vBack, zAt(t)), iso.P(uAt(t), vFront, zAt(t)), 0.5 * RES, alpha(COLORS.white, 0.45));
    }
    // the front arched gable mouth (filled, the recognisable end)
    const gable: Pt[] = [];
    for (let i = 0; i <= NB; i++) gable.push(iso.P(uAt(i / NB), vFront, zAt(i / NB)));
    gable.push(iso.P(u1, vFront, 0), iso.P(u0, vFront, 0));
    iso.r.poly(gable, alpha(hex('#b9cee0'), 0.92), alpha(hex('#7d92ad'), 0.7));
    const rim: Pt[] = [];
    for (let i = 0; i <= NB; i++) rim.push(iso.P(uAt(i / NB), vFront, zAt(i / NB)));
    iso.r.polyline(rim, INK_W * 0.6, alpha(INK, 0.6));
    // radial glazing bars in the gable lunette
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      iso.r.line(iso.P(uAt(t), vFront, 2), iso.P(uAt(t), vFront, zAt(t)), 0.5 * RES, alpha(COLORS.white, 0.5));
    }
    // apex ridge ink
    iso.r.line(iso.P(um, vBack, H), iso.P(um, vFront, H), 0.7 * RES, alpha(IRON, 0.7));
  }
  return iso.build();
}

/** EUSTON: the 1960s Seifert rebuild — a long, low, horizontal curtain-wall
 *  slab of dark glass and pale spandrels behind a wide open forecourt, utterly
 *  unlike its Gothic neighbours. Deliberately blunt and modern. */
function eustonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  iso.shadow(0.4, 1.4, 3.6, 3.6, 0.2, 0.2);
  // the open paved forecourt (front third stays low)
  iso.quad(0.4, 2.6, 3.6, 3.6, 0, lighten(COLORS.pavement, 0.04));
  // the long horizontal slab set back
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 1.2;
  const v1 = 2.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, COLORS.concrete);
  // strong horizontal floor bands (pale spandrel + dark ribbon glazing)
  const floors = 7;
  for (let f = 0; f < floors; f++) {
    const zb = 4 + (f * (H - 6)) / floors;
    const zt = 4 + ((f + 0.62) * (H - 6)) / floors;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 20, GLASS_DK, alpha(COLORS.white, 0.85));
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 10, GLASS_DK, alpha(COLORS.white, 0.85));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 2, lighten(COLORS.concrete, 0.1), { ink: false });
  // a low entrance canopy on stilts at the forecourt edge
  iso.box(u0 + 0.3, v1, u1 - 0.3, v1 + 0.5, 9, 11, COLORS.white, { ink: false });
  for (let u = u0 + 0.4; u < u1 - 0.3; u += 0.5) iso.r.line(iso.P(u, v1 + 0.45, 0), iso.P(u, v1 + 0.45, 9), 1 * RES, COLORS.steelDark);
  return iso.build();
}

/** A generic VICTORIAN TERMINUS body — brick frontage hotel block with a stone
 *  cornice, fronting a glazed shed. Shared by Victoria & London Bridge with
 *  per-call colour + a shed flavour, so each reads as a station without being
 *  a clone of St Pancras/King's Cross. */
function terminusBody(
  iso: Iso,
  brick: RGBA,
  shedTint: RGBA,
  opts: { wavy?: boolean } = {},
): void {
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  // glazed shed behind
  const [sx, syB] = iso.P(2.0, 0.7, 0);
  const R = 1.3 * (CELL_W / 2);
  if (opts.wavy) {
    // London Bridge: a modern undulating white concourse canopy
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const x = sx - R + 2 * R * t;
      const y = syB - 54 * RES - Math.sin(t * Math.PI * 3) * 9 * RES;
      pts.push([x, y]);
    }
    iso.r.polyline(pts, 3 * RES, COLORS.white);
    iso.r.poly([...pts, [sx + R, syB - 30 * RES], [sx - R, syB - 30 * RES]], alpha(hex('#dfe7ef'), 0.6));
  } else {
    const vault: Pt[] = [];
    for (let i = 0; i <= 22; i++) {
      const a = Math.PI * (i / 22);
      vault.push([sx + Math.cos(a) * R, syB - 78 * RES - Math.sin(a) * R * 0.74]);
    }
    iso.r.poly([...vault, [sx + R, syB - 46 * RES], [sx - R, syB - 46 * RES]], shedTint, alpha(hex('#7d92ad'), 0.8));
    iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
    for (let i = 2; i < 22; i += 3) {
      const a = Math.PI * (i / 22);
      iso.r.line([sx + Math.cos(a) * R, syB - 46 * RES], [sx + Math.cos(a) * R, syB - 78 * RES - Math.sin(a) * R * 0.74], 0.6 * RES, alpha(COLORS.white, 0.45));
    }
  }
  // the brick frontage hotel/office block
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 2.7;
  const v1 = 3.55;
  const H = 66;
  iso.box(u0, v0, u1, v1, 0, H, brick);
  for (const [zb, zt] of [[10, 22], [26, 38], [42, 54]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 16, GLASS_DK, PORTLAND);
  }
  // stone quoins + a balustraded cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, PORTLAND, { topC: top(PORTLAND, 0.3) });
  // a pair of low corner pavilion roofs so the frontage isn't a flat slab
  for (const cu of [u0 + 0.3, u1 - 0.3]) {
    iso.box(cu - 0.22, v0 + 0.05, cu + 0.22, v1, H + 4, H + 18, brick, { ink: false });
    iso.hip(cu - 0.24, v0 + 0.03, cu + 0.24, v1 + 0.02, H + 18, 12, SLATE);
  }
}

function victoriaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 130 });
  void seed;
  terminusBody(iso, hex('#9c5340'), GLASS_SHED);
  return iso.build();
}

function londonBridgeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 110 });
  void seed;
  terminusBody(iso, hex('#8f8f97'), GLASS_SHED, { wavy: true });
  return iso.build();
}

/** WATERLOO: the great Edwardian terminus crowned by the Victory Arch, fronting
 *  the long curved glazed sheds (the old Eurostar International curve in deep
 *  GWR-blue glass). A broad stone front with the triumphal arched entrance. */
function waterlooTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 130 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  // the long curved blue-glass shed behind (the International curve) — a real
  // extruded barrel grounded on a low back wall, running across u, receding
  // back→front so it sits ON the ground behind the frontage (not floating)
  const su0 = 0.5;
  const su1 = 3.5;
  const svBack = 0.5;
  const svFront = 2.6;
  const wallZ = 28;
  const Hs = 92;
  const NB = 16;
  const zAtS = (t: number): number => wallZ + Math.sin(t * Math.PI) * (Hs - wallZ);
  const uAtS = (t: number): number => su0 + (su1 - su0) * t;
  // brick side walls
  iso.box(su0, svBack, su0 + 0.06, svFront, 0, wallZ, hex('#b8b0a0'), { ink: false });
  iso.box(su1 - 0.06, svBack, su1, svFront, 0, wallZ, hex('#b8b0a0'), { ink: false });
  for (let i = 0; i < NB; i++) {
    const t0 = i / NB;
    const t1 = (i + 1) / NB;
    const col = t0 > 0.5 ? alpha(hex('#a8c6e6'), 0.92) : alpha(hex('#7f9fcc'), 0.9);
    iso.r.poly([iso.P(uAtS(t0), svBack, zAtS(t0)), iso.P(uAtS(t1), svBack, zAtS(t1)), iso.P(uAtS(t1), svFront, zAtS(t1)), iso.P(uAtS(t0), svFront, zAtS(t0))], col, alpha(hex('#5f7fae'), 0.8));
  }
  // the front glazed gable + ribs
  const sgable: Pt[] = [];
  for (let i = 0; i <= NB; i++) sgable.push(iso.P(uAtS(i / NB), svFront, zAtS(i / NB)));
  sgable.push(iso.P(su1, svFront, 0), iso.P(su0, svFront, 0));
  iso.r.poly(sgable, alpha(hex('#9fc0e0'), 0.92), alpha(hex('#5f7fae'), 0.85));
  const srim: Pt[] = [];
  for (let i = 0; i <= NB; i++) srim.push(iso.P(uAtS(i / NB), svFront, zAtS(i / NB)));
  iso.r.polyline(srim, INK_W * 0.6, alpha(INK, 0.5));
  for (const t of [0.2, 0.4, 0.6, 0.8]) iso.r.line(iso.P(uAtS(t), svFront, 2), iso.P(uAtS(t), svFront, zAtS(t)), 0.5 * RES, alpha(COLORS.white, 0.5));
  for (const v of [svBack + 0.1, (svBack + svFront) / 2]) {
    const rib: Pt[] = [];
    for (let i = 0; i <= NB; i++) rib.push(iso.P(uAtS(i / NB), v, zAtS(i / NB)));
    iso.r.polyline(rib, 0.7 * RES, alpha(hex('#5f7fae'), 0.8));
  }
  // the broad Portland-stone frontage
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 2.7;
  const v1 = 3.55;
  const H = 58;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 30, 50, 16, GLASS_DK, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // THE VICTORY ARCH — a tall stone triumphal portal at the centre with a
  // sculptural attic
  const ac = (u0 + u1) / 2;
  iso.box(ac - 0.55, v1 - 0.02, ac + 0.55, v1 + 0.04, 0, H + 24, PORTLAND);
  // deep arched opening
  const arch: Pt[] = [iso.P(ac - 0.3, v1 + 0.04, 4), iso.P(ac - 0.3, v1 + 0.04, 34)];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    arch.push(iso.P(ac - 0.3 + 0.6 * t, v1 + 0.04, 34 + Math.sin(t * Math.PI) * 22));
  }
  arch.push(iso.P(ac + 0.3, v1 + 0.04, 34), iso.P(ac + 0.3, v1 + 0.04, 4));
  iso.r.poly(arch, shaded(PORTLAND, 0.5));
  iso.r.polyline(arch.slice(1, arch.length - 1), INK_W * 0.5, alpha(INK, 0.6));
  // attic + a small dome/figure group on top
  iso.box(ac - 0.6, v1 - 0.04, ac + 0.6, v1 + 0.06, H + 24, H + 32, lighten(PORTLAND, 0.1), { topC: top(PORTLAND, 0.3) });
  const [dx, dyB] = iso.P(ac, v1, H + 32);
  iso.r.poly([[dx - 5 * RES, dyB], [dx + 5 * RES, dyB], [dx, dyB - 12 * RES]], LEAD);
  iso.r.line([dx, dyB - 12 * RES], [dx, dyB - 18 * RES], 1.1 * RES, COLORS.glassLit);
  return iso.build();
}

/** CHARING CROSS: the Strand terminus — a brick-and-stone frontage with a low
 *  arched shed, set hard against the Embankment. Compact 3×3. (The Eleanor
 *  cross spire stands in the forecourt.) */
function charingCrossTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.22);
  // arched shed behind
  const [sx, syB] = iso.P(1.5, 0.7, 0);
  const R = 1.05 * (CELL_W / 2);
  const vault: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (i / 20);
    vault.push([sx + Math.cos(a) * R, syB - 70 * RES - Math.sin(a) * R * 0.76]);
  }
  iso.r.poly([...vault, [sx + R, syB - 40 * RES], [sx - R, syB - 40 * RES]], GLASS_SHED, alpha(hex('#7d92ad'), 0.8));
  iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
  // the brick-stone hotel frontage
  const u0 = 0.45;
  const u1 = 2.55;
  const v0 = 1.8;
  const v1 = 2.55;
  iso.box(u0, v0, u1, v1, 0, 62, hex('#a55c44'));
  for (const [zb, zt] of [[10, 22], [26, 38], [42, 54]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 11, GLASS_DK, PORTLAND);
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 62, 66, PORTLAND, { topC: top(PORTLAND, 0.3) });
  iso.gable(u0, v0, u1, v1, 66, 12, 'u', SLATE, hex('#a55c44'));
  // the Eleanor-cross spire in the forecourt (a slim Gothic pinnacle)
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.05, v1 + 0.18, cu + 0.05, v1 + 0.28, 0, 30, PORTLAND, { ink: false });
  const [ecx, ecy] = iso.P(cu, v1 + 0.23, 30);
  for (const [zb, w] of [[0, 4.4], [10, 3.2], [20, 2.0]] as const) {
    iso.r.poly([[ecx - w * RES, ecy - zb * RES], [ecx + w * RES, ecy - zb * RES], [ecx + (w - 1.2) * RES, ecy - (zb + 10) * RES], [ecx - (w - 1.2) * RES, ecy - (zb + 10) * RES]], lit(PORTLAND, 0.05));
  }
  iso.r.line([ecx, ecy - 30 * RES], [ecx, ecy - 40 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** NATURAL HISTORY MUSEUM: Waterhouse's Romanesque "cathedral of nature" — a
 *  long symmetrical front in buff-and-blue terracotta, a great round-arched
 *  central portal between two slim towers with conical caps, an arcaded facade.
 *  Broad 4×4. */
function naturalHistoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.4;
  const v1 = 3.4;
  const H = 52;
  // the long arcaded body
  iso.box(u0, v0, u1, v1, 0, H, TERRACOTTA);
  // two storeys of round-arched windows (Romanesque arcade) on the long front
  for (const [zb, zt] of [[8, 22], [28, 42]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, TERRACOTTA_L);
  }
  // banded terracotta string courses (the NHM's blue-buff horizontal banding)
  for (const z of [16, 26, 36]) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.2 * RES, alpha(hex('#8694a0'), 0.5));
  // a low parapet + shallow roof (kept flat so it doesn't read as a big dead
  // triangle — the real NHM roofline is broad and horizontal)
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(TERRACOTTA, 0.06), { topC: top(TERRACOTTA, 0.28) });
  iso.gable(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1, H + 4, 6, 'u', hex('#6f7a6a'), TERRACOTTA);
  // the monumental central entrance bay — a tall round-arched portal
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.5, v1 - 0.04, cu + 0.5, v1 + 0.06, 0, H + 16, lighten(TERRACOTTA, 0.05));
  archGableLeft(iso, v1 + 0.06, cu - 0.34, cu + 0.34, 26, 58, alpha(hex('#2c3550'), 0.85), TERRACOTTA_L);
  // gable over the portal
  iso.r.poly([iso.P(cu - 0.5, v1 + 0.06, H + 16), iso.P(cu + 0.5, v1 + 0.06, H + 16), iso.P(cu, v1 + 0.06, H + 30)], lit(TERRACOTTA, 0.06));
  iso.r.polyline([iso.P(cu - 0.5, v1 + 0.06, H + 16), iso.P(cu + 0.5, v1 + 0.06, H + 16), iso.P(cu, v1 + 0.06, H + 30)], INK_W * 0.7, INK, true);
  // the twin towers flanking the portal, with conical caps (the signature pair)
  for (const tu of [cu - 0.78, cu + 0.78]) {
    iso.box(tu - 0.14, v1 - 0.42, tu + 0.14, v1 + 0.02, 0, 78, lighten(TERRACOTTA, 0.04));
    iso.windowsLeft(v1 + 0.02, tu - 0.1, tu + 0.1, 56, 72, 1, alpha(hex('#2c3550'), 0.8), TERRACOTTA_L);
    // a banded conical cap
    const [cx2, cyB2] = iso.P(tu, v1 - 0.2, 78);
    iso.r.poly([[cx2 - 8 * RES, cyB2], [cx2 + 8 * RES, cyB2], [cx2, cyB2 - 26 * RES]], shaded(hex('#6f7a6a'), 0.05), lit(hex('#7d8876'), 0.05));
    iso.r.polyline([[cx2 - 8 * RES, cyB2], [cx2, cyB2 - 26 * RES], [cx2 + 8 * RES, cyB2]], INK_W * 0.6, INK);
    iso.r.line([cx2, cyB2 - 26 * RES], [cx2, cyB2 - 32 * RES], 1 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** BRITISH MUSEUM: Smirke's Greek Revival quadrangle — the great south front
 *  is a giant Ionic colonnade under a sculptured pediment, behind which rises
 *  the glazed lattice dome of the Great Court (Foster). Broad 4×4 in cool
 *  Portland stone. */
function britishMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 100 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.5;
  const v1 = 3.45;
  const H = 42;
  // the stone wings
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });

  // the Great Court glazed dome rising behind the front range
  const [dx, dyB] = iso.P((u0 + u1) / 2, v0 + 0.55, 0);
  const DR = 0.78 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (i / 18);
    dome.push([dx + Math.cos(a) * DR, dyB - H * RES - 4 * RES - Math.sin(a) * DR * 0.62]);
  }
  iso.r.poly(dome, alpha(hex('#cfe0ec'), 0.92), alpha(hex('#9fb3c4'), 0.8));
  // the lattice grid (the famous tessellated roof)
  for (let i = 2; i < 18; i += 2) {
    const a = Math.PI * (i / 18);
    iso.r.line([dx + Math.cos(a) * DR, dyB - H * RES - 4 * RES], [dx + Math.cos(a) * DR, dyB - H * RES - 4 * RES - Math.sin(a) * DR * 0.62], 0.5 * RES, alpha(COLORS.white, 0.6));
  }
  for (const zz of [0.3, 0.6]) iso.r.polyline(dome.map(([x, y]): Pt => [dx + (x - dx) * zz, dyB - H * RES - 4 * RES - (dyB - H * RES - 4 * RES - y) * (0.4 + 0.5 * zz)]), 0.5 * RES, alpha(COLORS.white, 0.4));
  iso.r.polyline(dome, INK_W * 0.6, alpha(INK, 0.55));

  // the giant Ionic COLONNADE across the front (the unmistakable face)
  const colV = v1 + 0.04;
  iso.box(u0 + 0.15, v1, u1 - 0.15, v1 + 0.08, 0, 4, PORTLAND, { ink: false });
  const cols = 16;
  for (let i = 0; i <= cols; i++) {
    const u = u0 + 0.2 + ((u1 - u0 - 0.4) * i) / cols;
    iso.r.poly([iso.P(u - 0.022, colV, H - 2), iso.P(u + 0.022, colV, H - 2), iso.P(u + 0.022, colV, 4), iso.P(u - 0.022, colV, 4)], i % 2 ? COLORS.white : lit(PORTLAND, 0.08));
  }
  // entablature + the great pediment over the central columns
  iso.box(u0 + 0.1, v1, u1 - 0.1, v1 + 0.1, H - 2, H + 4, lighten(PORTLAND, 0.06), { ink: false });
  const pc = (u0 + u1) / 2;
  iso.r.poly([iso.P(pc - 1.0, colV, H + 4), iso.P(pc + 1.0, colV, H + 4), iso.P(pc, colV, H + 18)], lighten(PORTLAND, 0.1));
  iso.r.polyline([iso.P(pc - 1.0, colV, H + 4), iso.P(pc + 1.0, colV, H + 4), iso.P(pc, colV, H + 18), iso.P(pc - 1.0, colV, H + 4)], INK_W * 0.7, INK, true);
  return iso.build();
}

/** SCIENCE MUSEUM: a long, plain, dignified Edwardian Portland-stone block on
 *  Exhibition Road — a strong horizontal mass with regular tall windows and a
 *  flat parapet; modern glazed wing at one end. 3×3. */
function scienceMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.2, 0.2);
  const u0 = 0.35;
  const u1 = 2.65;
  const v0 = 1.2;
  const v1 = 2.55;
  const H = 50;
  iso.box(u0, v0, u1, v1, 0, H, hex('#dcd3bf'));
  for (const [zb, zt] of [[8, 24], [28, 44]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, COLORS.white);
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, COLORS.white);
  }
  // rusticated base + pilaster strips + a deep parapet cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, shaded(hex('#dcd3bf'), 0.12), { ink: false });
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.4) iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, H - 2), 1.4 * RES, alpha(STONE_DARK, 0.45));
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(hex('#dcd3bf'), 0.08), { topC: top(hex('#dcd3bf'), 0.3) });
  // a modern glazed wing at the right end (the Wellcome Wing's blue glow)
  iso.box(u1 - 0.5, v1 - 0.02, u1 + 0.02, v1 + 0.04, 0, H - 6, alpha(hex('#3a6ea5'), 0.9), { ink: false, topC: alpha(hex('#5f8fc2'), 0.9) });
  return iso.build();
}

/** VICTORIA & ALBERT MUSEUM: the Aston Webb front — a long terracotta-and-
 *  stone facade crowned by the great central tower carrying an open lantern
 *  shaped like an imperial crown, over the arched main entrance. 4×4. */
function vaMuseumTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 140 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.7;
  const v1 = 3.4;
  const H = 50;
  const STN = hex('#d7c8ad');
  iso.box(u0, v0, u1, v1, 0, H, STN);
  for (const [zb, zt] of [[8, 22], [28, 42]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, lighten(STN, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  // the central entrance tower
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.46, v1 - 0.04, cu + 0.46, v1 + 0.06, 0, 96, lighten(STN, 0.03));
  // the great arched entrance (recessed, with the screen of columns)
  archGableLeft(iso, v1 + 0.06, cu - 0.32, cu + 0.32, 30, 64, alpha(hex('#2c3550'), 0.85), COLORS.white);
  // a square belfry stage then the open OPENWORK CROWN lantern (the V&A's
  // distinctive imperial-crown finial)
  iso.box(cu - 0.3, v1 - 0.2, cu + 0.3, v1 + 0.02, 96, 116, STN);
  const [crx, cryB] = iso.P(cu, v1 - 0.09, 116);
  const CR = 0.32 * (CELL_W / 2);
  // four ogee ribs meeting at a finial (drawn as a thin openwork dome)
  const crown: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    // ogee profile: pinch in then bulge out
    const rr = CR * (0.55 + 0.45 * Math.sin(a));
    crown.push([crx + Math.cos(a) * rr, cryB - Math.sin(a) * CR * 1.5]);
  }
  iso.r.polyline(crown, 1 * RES, lighten(LEAD, 0.1));
  for (let i = 0; i <= 16; i += 4) {
    const a = Math.PI * (i / 16);
    const rr = CR * (0.55 + 0.45 * Math.sin(a));
    iso.r.line([crx + Math.cos(a) * rr, cryB - Math.sin(a) * CR * 1.5], [crx, cryB - CR * 1.6], 1 * RES, LEAD);
  }
  iso.r.line([crx, cryB - CR * 1.6], [crx, cryB - CR * 1.6 - 8 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** BRITISH LIBRARY: Colin St John Wilson's red-brick modernist mass next to St
 *  Pancras — long low-stepped brick terraces, a big entrance void with the
 *  clock, and the tall slim "book stack" reading-room tower behind. Brick to
 *  echo its Gothic neighbour but resolutely modern. 4×4. */
function britishLibraryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.3, 0.6, 3.7, 3.7, 0.22, 0.22);
  const BR = hex('#b06a4a'); // the library's distinctive orange-red brick
  // the entrance piazza (front strip kept open)
  iso.quad(0.5, 2.9, 3.5, 3.6, 0, lighten(COLORS.pavement, 0.05));
  // stepped low terraces, rising toward the back
  const steps = [
    { u0: 0.5, u1: 3.5, v0: 2.3, v1: 2.9, H: 30 },
    { u0: 0.6, u1: 3.4, v0: 1.7, v1: 2.3, H: 48 },
    { u0: 0.8, u1: 3.2, v0: 1.2, v1: 1.7, H: 64 },
  ];
  for (const s of steps) {
    iso.box(s.u0, s.v0, s.u1, s.v1, 0, s.H, BR);
    iso.windowsLeft(s.v1, s.u0 + 0.08, s.u1 - 0.08, s.H - 16, s.H - 4, 16, GLASS_DK, lighten(BR, 0.12));
    iso.box(s.u0 - 0.02, s.v0 - 0.02, s.u1 + 0.02, s.v1 + 0.02, s.H, s.H + 2, lighten(BR, 0.1), { ink: false });
  }
  // the tall slim reading-room/book-stack block rising behind
  iso.box(1.3, 1.0, 2.4, 1.5, 0, 92, lighten(BR, 0.03));
  iso.windowsLeft(1.5, 1.4, 2.3, 30, 84, 8, GLASS_DK, lighten(BR, 0.12));
  iso.box(1.28, 0.98, 2.42, 1.52, 92, 96, lighten(BR, 0.1), { ink: false });
  // the entrance gatehouse + the clock/sculpture pylon on the piazza
  iso.box(1.7, 2.88, 2.3, 2.95, 0, 40, lighten(BR, 0.04));
  const [px2, py2] = iso.P(2.0, 2.95, 40);
  iso.r.line([px2, py2], [px2, py2 - 16 * RES], 1.4 * RES, COLORS.steel);
  iso.r.line([px2 - 4 * RES, py2 - 14 * RES], [px2 + 4 * RES, py2 - 14 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** BUCKINGHAM PALACE: the East Front — a long, symmetrical Portland-stone
 *  facade with the central pedimented bay (the balcony), regular pilasters and
 *  a flat balustraded roofline, set behind the railed forecourt with the
 *  Victoria Memorial in front. Broad, palatial, not very tall. 4×4. */
function buckinghamTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 60 });
  void seed;
  iso.shadow(0.3, 0.6, 3.7, 3.7, 0.2, 0.2);
  // the railed gravel forecourt
  iso.quad(0.5, 2.95, 3.5, 3.6, 0, hex('#cdbfa0'));
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.6;
  const v1 = 2.9;
  const H = 54; // taller — a palace, not a slab
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  // three storeys of windows in clear stone frames (the dignified rhythm),
  // full width + brighter frames + a lit top floor so the front reads
  const winF = lighten(PORTLAND, 0.16);
  for (const [zb, zt, gl] of [[8, 20, GLASS_DK], [24, 36, GLASS_DK], [40, 49, alpha(COLORS.glassLit, 0.7)]] as const) {
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 24, gl, winF);
    // also glaze the visible right return so the palace reads windowed
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 10, gl, winF);
  }
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.27) iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, H - 2), 1.6 * RES, alpha(STONE_DARK, 0.55));
  // rusticated ground floor + a balustraded cornice with a row of urns/statues
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 7, shaded(PORTLAND, 0.12), { ink: false });
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 5, lighten(PORTLAND, 0.1), { topC: top(PORTLAND, 0.3) });
  for (let u = u0 + 0.15; u <= u1 - 0.1; u += 0.3) {
    iso.box(u - 0.03, v1 - 0.04, u + 0.03, v1, H + 5, H + 12, lighten(PORTLAND, 0.06), { ink: false });
  }
  // the central pedimented bay (the balcony) — slightly projecting + taller
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.55, v1 - 0.02, cu + 0.55, v1 + 0.06, 0, H + 6, lighten(PORTLAND, 0.05));
  // the famous central balcony band + the Royal Standard flagpole above
  iso.box(cu - 0.34, v1 + 0.04, cu + 0.34, v1 + 0.07, 28, 30, lighten(PORTLAND, 0.14), { ink: false });
  const [fpx, fpy] = iso.P(cu, v1 + 0.03, H + 18);
  iso.r.line([fpx, fpy], [fpx, fpy - 14 * RES], 1 * RES, COLORS.steel);
  iso.r.poly([[fpx, fpy - 14 * RES], [fpx + 8 * RES, fpy - 12 * RES], [fpx, fpy - 9 * RES]], COLORS.glassHot);
  // attached columns + a pediment
  for (let i = 0; i <= 6; i++) {
    const u = cu - 0.4 + (0.8 * i) / 6;
    iso.r.poly([iso.P(u - 0.02, v1 + 0.06, H + 2), iso.P(u + 0.02, v1 + 0.06, H + 2), iso.P(u + 0.02, v1 + 0.06, 8), iso.P(u - 0.02, v1 + 0.06, 8)], i % 2 ? COLORS.white : lit(PORTLAND, 0.06));
  }
  iso.r.poly([iso.P(cu - 0.58, v1 + 0.06, H + 6), iso.P(cu + 0.58, v1 + 0.06, H + 6), iso.P(cu, v1 + 0.06, H + 16)], lighten(PORTLAND, 0.1));
  iso.r.polyline([iso.P(cu - 0.58, v1 + 0.06, H + 6), iso.P(cu + 0.58, v1 + 0.06, H + 6), iso.P(cu, v1 + 0.06, H + 16), iso.P(cu - 0.58, v1 + 0.06, H + 6)], INK_W * 0.7, INK, true);
  // the Victoria Memorial in the forecourt — a white plinth + gilded figure
  const [mx, myB] = iso.P(cu, 3.25, 0);
  iso.r.poly([[mx - 6 * RES, myB], [mx + 6 * RES, myB], [mx + 4 * RES, myB - 10 * RES], [mx - 4 * RES, myB - 10 * RES]], COLORS.white);
  iso.r.line([mx, myB - 10 * RES], [mx, myB - 18 * RES], 1.4 * RES, COLORS.white);
  iso.r.poly([[mx - 2.4 * RES, myB - 18 * RES], [mx + 2.4 * RES, myB - 18 * RES], [mx, myB - 23 * RES]], COLORS.glassLit);
  return iso.build();
}

/** WESTMINSTER ABBEY: the great Gothic abbey — the twin western towers (Hawks-
 *  moor) with their pinnacled crowns over the deep arched west door and rose,
 *  a long high nave with flying buttresses behind. Cool Reigate/Portland grey.
 *  3×3 but TALL. */
function westminsterAbbeyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const GST = hex('#cfc8ba');
  const GST_D = hex('#ada695');
  const ROOF = SLATE;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.22);
  // the long high nave (ridge front-to-back)
  const nu0 = 0.9;
  const nu1 = 2.1;
  const nv0 = 0.6;
  const nv1 = 2.2;
  iso.box(nu0, nv0, nu1, nv1, 0, 74, GST);
  iso.gable(nu0, nv0, nu1, nv1, 74, 26, 'v', ROOF, GST);
  // tall lancet windows down the visible aisle wall + flying buttresses
  iso.box(0.4, nv0 + 0.1, nu0, nv1, 0, 40, GST);
  iso.quad(0.4, nv0 + 0.1, nu0, nv1, 40, shaded(ROOF, 0.04));
  for (let i = 0; i < 6; i++) {
    const u = 0.5 + i * 0.14;
    iso.r.poly([iso.P(u, nv1, 10), iso.P(u + 0.06, nv1, 10), iso.P(u + 0.06, nv1, 30), iso.P(u + 0.03, nv1, 36), iso.P(u, nv1, 30)], alpha(hex('#2c3550'), 0.85));
    iso.r.line(iso.P(0.42, nv0 + 0.2 + i * 0.3, 34), iso.P(nu0, nv0 + 0.2 + i * 0.3, 66), 1.4 * RES, GST_D);
  }
  // the TWIN WEST TOWERS at the front (high v) — pinnacled crowns
  for (const tu of [1.05, 1.95] as const) {
    iso.box(tu - 0.22, 2.18, tu + 0.22, 2.5, 0, 128, GST);
    // two stacked pointed belfry openings
    for (const [zb, zt, zp] of [[64, 92, 100], [104, 124, 132]] as const) {
      iso.r.poly([iso.P(tu - 0.12, 2.5, zb), iso.P(tu + 0.12, 2.5, zb), iso.P(tu + 0.12, 2.5, zt), iso.P(tu, 2.5, zp), iso.P(tu - 0.12, 2.5, zt)], alpha(hex('#2c3550'), 0.85));
    }
    // the gallery parapet + four corner pinnacles
    iso.box(tu - 0.24, 2.16, tu + 0.24, 2.52, 128, 134, lighten(GST, 0.08), { ink: false });
    for (const [pu, pv] of [[tu - 0.22, 2.18], [tu + 0.22, 2.18], [tu - 0.22, 2.5], [tu + 0.22, 2.5]] as const) {
      iso.box(pu - 0.03, pv - 0.03, pu + 0.03, pv + 0.03, 134, 156, GST_D, { ink: false });
      const [fx, fy] = iso.P(pu, pv, 156);
      iso.r.poly([[fx - 1.6 * RES, fy], [fx + 1.6 * RES, fy], [fx, fy - 6 * RES]], lighten(GST, 0.1));
    }
  }
  // the west front between the towers: door + rose
  iso.box(1.18, 2.42, 1.82, 2.52, 0, 92, GST);
  const [rx, ry] = iso.P(1.5, 2.52, 64);
  const RR = 9 * RES;
  const rose: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rose.push([rx + Math.cos(a) * RR, ry - Math.sin(a) * RR * 0.92]);
  }
  iso.r.poly(rose, alpha(hex('#2c3550'), 0.85));
  iso.r.polyline(rose, INK_W * 0.6, INK, true);
  return iso.build();
}

/** SOMERSET HOUSE: Chambers' great Georgian neoclassical quadrangle — a long
 *  rusticated stone river/Strand front with regular bays, arched ground-floor
 *  openings, a central pedimented entrance and a low balustraded roofline. The
 *  vast cobbled courtyard reads as the cleared apron in front. 3×3. */
function somersetHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.2, 0.2);
  // the courtyard (front)
  iso.quad(0.5, 2.4, 2.5, 2.55, 0, hex('#c7bca6'));
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.2;
  const v1 = 2.4;
  const H = 44;
  const STN = hex('#ddd2bb');
  iso.box(u0, v0, u1, v1, 0, H, STN);
  // arched rusticated ground floor
  for (let u = u0 + 0.16; u < u1 - 0.1; u += 0.28) {
    archGableLeft(iso, v1, u, u + 0.2, 8, 18, shaded(STN, 0.4), STN);
  }
  // two upper storeys of windows + a pilastered piano nobile
  for (const [zb, zt] of [[22, 34], [36, 42]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 14, GLASS_DK, lighten(STN, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  // central pedimented frontispiece + a small lead dome/cupola over the centre
  const cu = (u0 + u1) / 2;
  iso.r.poly([iso.P(cu - 0.4, v1, H + 3), iso.P(cu + 0.4, v1, H + 3), iso.P(cu, v1, H + 12)], lighten(STN, 0.1));
  iso.r.polyline([iso.P(cu - 0.4, v1, H + 3), iso.P(cu + 0.4, v1, H + 3), iso.P(cu, v1, H + 12), iso.P(cu - 0.4, v1, H + 3)], INK_W * 0.6, INK, true);
  iso.box(cu - 0.2, v0 + 0.4, cu + 0.2, v0 + 0.8, H, H + 8, STN, { ink: false });
  const [dx, dyB] = iso.P(cu, v0 + 0.6, H + 8);
  const dome: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    dome.push([dx + Math.cos(a) * 7 * RES, dyB - Math.sin(a) * 9 * RES]);
  }
  iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - 9 * RES], [dx, dyB - 15 * RES], 1 * RES, COLORS.glassLit);
  return iso.build();
}

/** ROYAL COURTS OF JUSTICE: Street's huge Victorian-Gothic "cathedral of the
 *  law" — a grey Portland-stone front bristling with pointed gables, slender
 *  spiky turrets and a great pinnacled clock/bell tower, a tall arched portal.
 *  3×3, busy and vertical. */
function royalCourtsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const GST = hex('#cdc6b6');
  const GST_D = hex('#aaa48f');
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, GST);
  // two storeys of pointed lancet windows
  for (const [zb, zt] of [[10, 28], [32, 50]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, alpha(hex('#2c3550'), 0.85), COLORS.white);
  }
  // a row of steep gables along the parapet (the restless Gothic skyline)
  for (let u = u0 + 0.25; u < u1 - 0.1; u += 0.5) {
    iso.r.poly([iso.P(u - 0.18, v1, H), iso.P(u + 0.18, v1, H), iso.P(u, v1, H + 16)], lit(GST, 0.05));
    iso.r.polyline([iso.P(u - 0.18, v1, H), iso.P(u, v1, H + 16), iso.P(u + 0.18, v1, H)], INK_W * 0.6, INK);
    // a slim turret between the gables
    iso.box(u + 0.2, v1 - 0.06, u + 0.26, v1, H, H + 26, GST_D, { ink: false });
    const [fx, fy] = iso.P(u + 0.23, v1 - 0.03, H + 26);
    iso.r.poly([[fx - 2 * RES, fy], [fx + 2 * RES, fy], [fx, fy - 9 * RES]], shaded(SLATE, 0.05));
  }
  // the great clock/bell tower at one end (off-centre, the dominant vertical)
  const ctu = u0 + 0.5;
  iso.box(ctu - 0.24, v1 - 0.3, ctu + 0.18, v1 + 0.02, 0, 108, GST);
  // tall pointed windows + a clock
  iso.windowsLeft(v1 + 0.02, ctu - 0.18, ctu + 0.12, 60, 92, 1, alpha(hex('#2c3550'), 0.8), COLORS.white);
  iso.box(ctu - 0.27, v1 - 0.33, ctu + 0.21, v1 + 0.04, 108, 114, lighten(GST, 0.06), { ink: false });
  iso.hip(ctu - 0.25, v1 - 0.31, ctu + 0.19, v1 + 0.03, 114, 28, SLATE);
  const [tipx, tipy] = iso.P(ctu - 0.03, v1 - 0.14, 142);
  iso.r.line([tipx, tipy], [tipx, tipy - 9 * RES], 1.3 * RES, COLORS.glassLit);
  for (const [pu, pv] of [[ctu - 0.25, v1 - 0.31], [ctu + 0.19, v1 - 0.31], [ctu - 0.25, v1 + 0.03], [ctu + 0.19, v1 + 0.03]] as const) {
    iso.box(pu - 0.025, pv - 0.025, pu + 0.025, pv + 0.025, 114, 132, GST_D, { ink: false });
  }
  return iso.build();
}

/** COUNTY HALL: Ralph Knott's Edwardian-baroque seat of London government on
 *  the South Bank — the grand sweeping crescent colonnade facing the river,
 *  a deep mansard roof and a long Portland-stone mass. Broad 4×4. */
function countyHallTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 70 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.4;
  const v1 = 3.3;
  const H = 52;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  for (const [zb, zt] of [[8, 22], [26, 40]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, lighten(PORTLAND, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(PORTLAND, 0.06), { ink: false });
  // the curved colonnaded crescent across the front (the signature feature) —
  // a giant order of columns following a shallow bow
  const colsN = 22;
  for (let i = 0; i <= colsN; i++) {
    const t = i / colsN;
    const u = u0 + 0.3 + (u1 - u0 - 0.6) * t;
    // bow the colonnade forward at the centre
    const dv = 0.18 * Math.sin(t * Math.PI);
    iso.r.poly([iso.P(u - 0.018, v1 + dv, H - 4), iso.P(u + 0.018, v1 + dv, H - 4), iso.P(u + 0.018, v1 + dv, 10), iso.P(u - 0.018, v1 + dv, 10)], i % 2 ? COLORS.white : lit(PORTLAND, 0.08));
  }
  // the deep grey mansard roof
  iso.gable(u0, v0, u1, v1, H + 3, 18, 'u', SLATE, PORTLAND);
  for (let u = u0 + 0.4; u < u1 - 0.2; u += 0.55) {
    iso.box(u - 0.05, v1 - 0.03, u + 0.05, v1, H + 4, H + 12, PORTLAND, { ink: false });
    iso.r.poly([iso.P(u - 0.05, v1, H + 12), iso.P(u + 0.05, v1, H + 12), iso.P(u, v1, H + 17)], LEAD);
  }
  return iso.build();
}

/** TATE MODERN: the converted Bankside Power Station — a vast, austere brick
 *  monolith with a single enormous square central chimney, the long banded
 *  brick flanks, and the glazed light-beam box added on the roof. Industrial,
 *  monumental. 4×4. */
function tateModernTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 160 });
  void seed;
  const BR = hex('#9a6b52'); // Bankside brown brick
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.24, 0.22);
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 1.2;
  const v1 = 3.4;
  const H = 70;
  // the long brick mass (two lower wings + taller boiler-house centre)
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // strong vertical brick pilaster ribs (the Giles Gilbert Scott articulation)
  for (let u = u0 + 0.15; u < u1 - 0.05; u += 0.2) {
    iso.r.line(iso.P(u, v1, 4), iso.P(u, v1, H - 2), 1.6 * RES, alpha(darken(BR, 0.18), 0.6));
  }
  // tall slot windows between the ribs
  for (let u = u0 + 0.25; u < u1 - 0.1; u += 0.4) {
    iso.r.poly([iso.P(u, v1, 14), iso.P(u + 0.12, v1, 14), iso.P(u + 0.12, v1, H - 8), iso.P(u, v1, H - 8)], alpha(hex('#2c3550'), 0.7));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(BR, 0.06), { ink: false });
  // the single ENORMOUS square central chimney (the unmistakable feature)
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.26, v0 + 0.5, cu + 0.26, v0 + 1.02, 0, 168, BR);
  for (let u = cu - 0.22; u <= cu + 0.22; u += 0.11) iso.r.line(iso.P(u, v0 + 1.02, H), iso.P(u, v0 + 1.02, 164), 1.2 * RES, alpha(darken(BR, 0.16), 0.5));
  iso.box(cu - 0.28, v0 + 0.48, cu + 0.28, v0 + 1.04, 168, 174, lighten(BR, 0.08), { ink: false });
  // the glazed "light beam" added along the roof
  iso.box(u0 + 0.2, v0 + 0.1, u1 - 0.2, v0 + 0.45, H + 3, H + 16, alpha(hex('#bcd0e0'), 0.55), { ink: false, topC: alpha(COLORS.white, 0.6) });
  return iso.build();
}

/** TATE BRITAIN: Sidney Smith's classical gallery on Millbank — a stately
 *  Portland-stone front with a deep hexastyle portico under a triangular
 *  pediment, a low central dome behind, broad steps. 4×4 but low. */
function tateBritainTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 70 });
  void seed;
  iso.shadow(0.4, 0.6, 3.6, 3.6, 0.2, 0.2);
  const u0 = 0.5;
  const u1 = 3.5;
  const v0 = 1.6;
  const v1 = 3.2;
  const H = 40;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 12, 30, 18, GLASS_DK, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // a low saucer dome behind the centre
  const cu = (u0 + u1) / 2;
  const [dx, dyB] = iso.P(cu, v0 + 0.7, 0);
  const DR = 0.5 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    dome.push([dx + Math.cos(a) * DR, dyB - (H + 4) * RES - Math.sin(a) * DR * 0.5]);
  }
  iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // the grand projecting portico — columns + pediment + steps
  iso.box(cu - 0.7, v1, cu + 0.7, v1 + 0.45, 0, H - 4, PORTLAND, { ink: false });
  for (let i = 0; i <= 7; i++) {
    const u = cu - 0.55 + (1.1 * i) / 7;
    iso.r.poly([iso.P(u - 0.022, v1 + 0.45, H - 6), iso.P(u + 0.022, v1 + 0.45, H - 6), iso.P(u + 0.022, v1 + 0.45, 6), iso.P(u - 0.022, v1 + 0.45, 6)], i % 2 ? COLORS.white : lit(PORTLAND, 0.08));
  }
  iso.r.poly([iso.P(cu - 0.78, v1 + 0.45, H - 4), iso.P(cu + 0.78, v1 + 0.45, H - 4), iso.P(cu, v1 + 0.45, H + 10)], lighten(PORTLAND, 0.1));
  iso.r.polyline([iso.P(cu - 0.78, v1 + 0.45, H - 4), iso.P(cu + 0.78, v1 + 0.45, H - 4), iso.P(cu, v1 + 0.45, H + 10), iso.P(cu - 0.78, v1 + 0.45, H - 4)], INK_W * 0.7, INK, true);
  // broad entrance steps
  for (let s = 0; s < 3; s++) iso.box(cu - 0.7 + s * 0.04, v1 + 0.45 + s * 0.06, cu + 0.7 - s * 0.04, v1 + 0.62, 0, (3 - s) * 1.5, lighten(PORTLAND, 0.04), { ink: false });
  return iso.build();
}

/** ROYAL NATIONAL THEATRE: Lasdun's Brutalist masterpiece on the South Bank —
 *  bold stacked horizontal concrete terraces and strata, with the two square
 *  fly-towers rising blunt above. Board-marked grey concrete. 3×3. */
function nationalTheatreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const CON = hex('#b3aea0'); // weathered board-marked concrete
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.2);
  // stacked, offset horizontal terraces (the strata)
  const terr = [
    { u0: 0.4, u1: 2.6, v0: 1.7, v1: 2.55, H: 20 },
    { u0: 0.55, u1: 2.45, v0: 1.3, v1: 2.15, H: 34 },
    { u0: 0.7, u1: 2.3, v0: 1.0, v1: 1.8, H: 48 },
  ];
  for (const t of terr) {
    iso.box(t.u0, t.v0, t.u1, t.v1, 0, t.H, CON);
    // the deep horizontal shadow line under each projecting slab
    iso.box(t.u0 - 0.04, t.v0, t.u1 + 0.04, t.v1, t.H - 4, t.H, shaded(CON, 0.18), { ink: false });
    iso.box(t.u0 - 0.04, t.v0, t.u1 + 0.04, t.v1, t.H, t.H + 2, lighten(CON, 0.06), { ink: false });
    // a ribbon of glazing tucked under the terrace
    iso.windowsLeft(t.v1, t.u0 + 0.1, t.u1 - 0.1, t.H - 12, t.H - 5, 14, alpha(hex('#2c3550'), 0.7), undefined);
  }
  // the two blunt square fly-towers
  for (const [fu, fv] of [[1.1, 1.2], [1.9, 1.5]] as const) {
    iso.box(fu - 0.26, fv - 0.26, fu + 0.26, fv + 0.26, 0, 78, lighten(CON, 0.03));
    iso.box(fu - 0.28, fv - 0.28, fu + 0.28, fv + 0.28, 78, 82, lighten(CON, 0.08), { ink: false });
  }
  return iso.build();
}

/** HARRODS: the great Knightsbridge department store — a long terracotta
 *  (Doulton buff faience) palace front, a heavy cornice and a string of small
 *  baroque domes and cupolas along the roofline, the famous corner dome. The
 *  building that is lit by thousands of bulbs at night. 3×3. */
function harrodsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const FAI = hex('#d9b87e'); // Doulton terracotta/faience
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, FAI);
  for (const [zb, zt] of [[8, 22], [26, 38], [42, 52]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(FAI, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(FAI, 0.08), { topC: top(FAI, 0.3) });
  // a string of small baroque cupola domes along the cornice
  const domeAt = (cx2: number, cyB2: number, r: number): void => {
    const dome: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      dome.push([cx2 + Math.cos(a) * r, cyB2 - Math.sin(a) * r * 1.15]);
    }
    iso.r.poly(dome, shaded(hex('#9c8a5e'), 0.05), lit(hex('#b89e6a'), 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    iso.r.line([cx2, cyB2 - r * 1.15], [cx2, cyB2 - r * 1.15 - 5 * RES], 0.9 * RES, COLORS.glassLit);
  };
  for (let u = u0 + 0.3; u <= u1 - 0.2; u += 0.5) {
    const [cx2, cyB2] = iso.P(u, v1 - 0.1, H + 4);
    domeAt(cx2, cyB2, 4 * RES);
  }
  // the larger corner dome
  const [bx, byB] = iso.P(u1 - 0.25, v1 - 0.1, H + 4);
  iso.box(u1 - 0.45, v1 - 0.3, u1 - 0.05, v1 + 0.02, H, H + 8, FAI, { ink: false });
  domeAt(bx, byB - 8 * RES, 7 * RES);
  return iso.build();
}

/** CARRERAS CIGARETTE FACTORY: the great white Egyptian-Revival block in
 *  Camden — a long, low, brilliantly white facade with a colonnade of papyrus-
 *  capital columns in jewel colours, a deep cavetto cornice, and the pair of
 *  monumental black cats flanking the entrance. 3×3, low and very wide. */
function carrerasTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 50 });
  void seed;
  const WHT = hex('#ece6da');
  iso.shadow(0.3, 0.7, 2.7, 2.7, 0.2, 0.2);
  const u0 = 0.35;
  const u1 = 2.65;
  const v0 = 1.7;
  const v1 = 2.5;
  const H = 30;
  iso.box(u0, v0, u1, v1, 0, H, WHT);
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 8, 22, 22, alpha(hex('#2c3550'), 0.7), lighten(WHT, 0.05));
  // the deep flared (cavetto) cornice
  iso.r.poly([iso.P(u0 - 0.05, v1, H), iso.P(u1 + 0.05, v1, H), iso.P(u1 + 0.12, v1 + 0.05, H + 8), iso.P(u0 - 0.12, v1 + 0.05, H + 8)], lighten(WHT, 0.06));
  iso.r.line(iso.P(u0 - 0.12, v1 + 0.05, H + 8), iso.P(u1 + 0.12, v1 + 0.05, H + 8), INK_W * 0.6, alpha(INK, 0.6));
  // the colourful papyrus columns across the front (jewel reds/greens)
  const cols = 12;
  for (let i = 0; i <= cols; i++) {
    const u = u0 + 0.16 + ((u1 - u0 - 0.32) * i) / cols;
    const col = i % 2 ? hex('#9c3b34') : hex('#2e6f5e');
    iso.r.poly([iso.P(u - 0.02, v1 + 0.02, H), iso.P(u + 0.02, v1 + 0.02, H), iso.P(u + 0.02, v1 + 0.02, 2), iso.P(u - 0.02, v1 + 0.02, 2)], col);
    // a flared papyrus capital glint
    const [hx, hy] = iso.P(u, v1 + 0.02, H);
    iso.r.line([hx - 1.6 * RES, hy], [hx + 1.6 * RES, hy], 1.2 * RES, lighten(col, 0.2));
  }
  // the pair of monumental black cats flanking the centre door
  const cu = (u0 + u1) / 2;
  for (const dx of [-0.5, 0.5]) {
    const [kx, kyB] = iso.P(cu + dx, v1 + 0.06, 0);
    iso.r.poly([[kx - 2.6 * RES, kyB], [kx + 2.6 * RES, kyB], [kx + 2 * RES, kyB - 12 * RES], [kx - 2 * RES, kyB - 12 * RES]], hex('#23202a'));
    // head + ears
    iso.r.poly([[kx - 2 * RES, kyB - 12 * RES], [kx + 2 * RES, kyB - 12 * RES], [kx + 1.4 * RES, kyB - 18 * RES], [kx - 1.4 * RES, kyB - 18 * RES]], hex('#2c2833'));
    iso.r.poly([[kx - 1.4 * RES, kyB - 18 * RES], [kx - 0.4 * RES, kyB - 18 * RES], [kx - 0.9 * RES, kyB - 22 * RES]], hex('#23202a'));
    iso.r.poly([[kx + 1.4 * RES, kyB - 18 * RES], [kx + 0.4 * RES, kyB - 18 * RES], [kx + 0.9 * RES, kyB - 22 * RES]], hex('#23202a'));
  }
  return iso.build();
}

/** BANK OF ENGLAND: Soane's windowless curtain-wall fortress in the City — a
 *  low, blank screen wall of Portland stone running round the block, blind
 *  arcading and a corner of giant Corinthian columns (the Tivoli corner), with
 *  the upper storeys set well back. Squat, secretive. 3×3. */
function bankOfEnglandTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.2, 0.2);
  const u0 = 0.35;
  const u1 = 2.65;
  const v0 = 1.3;
  const v1 = 2.55;
  // the blank curtain screen wall (no windows — the signature)
  const HW = 26;
  iso.box(u0, v0, u1, v1, 0, HW, PORTLAND);
  // blind arcading along the screen wall
  for (let u = u0 + 0.18; u < u1 - 0.1; u += 0.3) {
    archGableLeft(iso, v1, u, u + 0.22, 8, 18, shaded(PORTLAND, 0.28), PORTLAND);
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, HW, HW + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // the set-back upper storeys (the later Baker rebuild) rising behind
  iso.box(u0 + 0.4, v0 + 0.3, u1 - 0.4, v1 - 0.5, 0, 50, lighten(PORTLAND, 0.03));
  iso.windowsLeft(v1 - 0.5, u0 + 0.5, u1 - 0.5, 30, 46, 12, GLASS_DK, COLORS.white);
  iso.box(u0 + 0.38, v0 + 0.28, u1 - 0.38, v1 - 0.48, 50, 54, lighten(PORTLAND, 0.08), { ink: false });
  // the Tivoli corner: a cluster of giant Corinthian columns at the near corner
  for (let i = 0; i < 4; i++) {
    const u = u1 - 0.1 - i * 0.07;
    iso.r.poly([iso.P(u, v1 + 0.02, HW + 2), iso.P(u + 0.03, v1 + 0.02, HW + 2), iso.P(u + 0.03, v1 + 0.02, 2), iso.P(u, v1 + 0.02, 2)], COLORS.white);
  }
  return iso.build();
}

/** OLD BAILEY: Mountford's baroque criminal court — a stone block crowned by a
 *  green copper dome carrying the gilded figure of Lady Justice with her sword
 *  and scales. A grand domed civic mass. 3×3. */
function oldBaileyTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 130 });
  void seed;
  iso.shadow(0.3, 0.5, 2.7, 2.7, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.5;
  const v1 = 2.5;
  const H = 54;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  for (const [zb, zt] of [[10, 24], [30, 46]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 12, GLASS_DK, COLORS.white);
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // a giant columned centre + small pediment
  const cu = (u0 + u1) / 2;
  for (let i = 0; i <= 5; i++) {
    const u = cu - 0.35 + (0.7 * i) / 5;
    iso.r.poly([iso.P(u - 0.02, v1 + 0.02, H - 2), iso.P(u + 0.02, v1 + 0.02, H - 2), iso.P(u + 0.02, v1 + 0.02, 6), iso.P(u - 0.02, v1 + 0.02, 6)], i % 2 ? COLORS.white : lit(PORTLAND, 0.06));
  }
  // the green copper dome on a drum
  iso.box(cu - 0.32, v0 + 0.4, cu + 0.32, v0 + 0.9, H, H + 14, PORTLAND);
  const [dx, dyB] = iso.P(cu, v0 + 0.65, H + 14);
  const DR = 0.4 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    dome.push([dx + Math.cos(a) * DR, dyB - Math.sin(a) * DR * 1.05]);
  }
  iso.r.poly(dome, shaded(hex('#6f9c8a'), 0.05), lit(hex('#7fae98'), 0.06)); // verdigris copper
  iso.r.polyline(dome, INK_W * 0.7, INK);
  // Lady Justice — a gilded figure with outstretched arms (sword + scales)
  const topY = dyB - DR * 1.05;
  iso.r.line([dx, topY], [dx, topY - 14 * RES], 1.8 * RES, COLORS.glassHot);
  iso.r.line([dx - 7 * RES, topY - 9 * RES], [dx + 7 * RES, topY - 9 * RES], 1.4 * RES, COLORS.glassHot); // outstretched arms
  iso.r.line([dx + 7 * RES, topY - 9 * RES], [dx + 7 * RES, topY - 4 * RES], 1 * RES, COLORS.glassLit); // scales
  iso.r.line([dx - 7 * RES, topY - 9 * RES], [dx - 7 * RES, topY - 15 * RES], 1 * RES, COLORS.glassLit); // sword
  return iso.build();
}

// =============================================================================
// THE REGISTRY
// =============================================================================

// light specs reused across heroes
const L = {
  spire: { kind: 'spireBeacon', topZ: 300, halfW: 0.34 } as HeroLightSpec,
  aerial: { kind: 'aerialBeacon', topZ: 268, halfW: 0.32 } as HeroLightSpec,
  towerCrown: (topZ: number, halfW: number): HeroLightSpec => ({ kind: 'towerCrown', topZ, halfW }),
  facade: (topZ: number, halfW: number): HeroLightSpec => ({ kind: 'facadeFlood', topZ, halfW }),
  stadium: (topZ: number, halfW: number): HeroLightSpec => ({ kind: 'stadiumFlood', topZ, halfW }),
  arch: (topZ: number, halfW: number): HeroLightSpec => ({ kind: 'archGlow', topZ, halfW }),
};

export const CITY_HEROES: BespokeHero[] = [
  // ---- MARQUEE reuses (existing hand-drawn fns, brought into the hero system)
  {
    city: 'london',
    key: 'the-shard',
    match: /\bshard\b/i,
    foot: [1, 1],
    seed: 3001,
    draw: (s) => spireTile(s),
    light: L.spire,
  },
  {
    city: 'london',
    key: 'bt-tower',
    match: /\bBT Tower\b/i,
    foot: [1, 1],
    seed: 3002,
    draw: (s) => bttowerTile(s),
    light: L.aerial,
  },
  {
    city: 'london',
    key: 'the-gherkin',
    match: /\bgherkin\b|30 St Mary Axe/i,
    foot: [1, 1],
    seed: 3003,
    draw: (s) => gherkinTile(s),
    light: L.towerCrown(126, 0.42),
  },
  {
    city: 'london',
    key: 'tower-bridge',
    match: /Tower Bridge/i,
    foot: [1, 4],
    seed: 3004,
    draw: (s) => towerBridgeTile(s),
    light: L.facade(60, 0.8),
  },
  {
    city: 'london',
    key: 'st-pauls',
    match: /St\.? Paul'?s/i,
    foot: [2, 2],
    seed: 3005,
    draw: (s) => domeTile(s),
    light: L.facade(92, 1.0),
  },
  {
    city: 'london',
    key: 'palace-of-westminster',
    match: /Palace of Westminster|Houses of Parliament|^Parliament$/i,
    foot: [3, 5],
    seed: 3006,
    draw: (s) => parliamentTile(s),
    light: L.facade(132, 1.4),
  },
  {
    city: 'london',
    key: 'london-eye',
    match: /London Eye/i,
    foot: [1, 1],
    seed: 3007,
    draw: (s) => eyeTile(s),
    light: { kind: 'rimCycle', topZ: 154, halfW: 0.9 },
  },
  {
    city: 'london',
    key: 'the-o2',
    match: /\bO2\b|Millennium Dome|North Greenwich Arena/i,
    foot: [O2_W, O2_H],
    seed: 3008,
    draw: (s) => o2domeTile(s),
    light: L.stadium(70, 1.7),
  },
  {
    city: 'london',
    key: 'wembley-stadium',
    match: /Wembley/i,
    foot: [WEMBLEY_W, WEMBLEY_H],
    seed: 3009,
    draw: (s) => wembleyTile(s),
    light: L.arch(108, 1.3),
  },
  {
    city: 'london',
    key: 'excel-london',
    match: /ExCeL/i,
    foot: [EXCEL_W, EXCEL_H],
    seed: 3010,
    draw: (s) => excelTile(s),
    light: L.facade(40, 1.4),
  },
  {
    city: 'london',
    key: 'kew-palm-house',
    match: /Kew/i,
    foot: [1, 1],
    seed: 3011,
    draw: (s) => kewhouseTile(s),
    light: L.facade(40, 0.9),
  },
  {
    city: 'london',
    key: 'alexandra-palace',
    match: /Alexandra Palace|Ally Pally/i,
    foot: [2, 1],
    seed: 3012,
    draw: (s) => allypallyTile(s),
    light: L.aerial,
  },
  {
    city: 'london',
    key: 'battersea-power-station',
    match: /Battersea Power Station|^Battersea$/i,
    foot: [2, 2],
    seed: 3013,
    draw: (s) => powerstationTile(s),
    light: L.facade(130, 1.3),
  },
  {
    city: 'london',
    key: 'olympic-stadium',
    match: /Olympic (Park|Stadium)|London Stadium/i,
    foot: [STADIUM_W, STADIUM_H],
    seed: 3014,
    draw: (s) => stadiumTile(s),
    light: L.stadium(34, 1.6),
  },
  {
    city: 'london',
    key: 'arcelormittal-orbit',
    match: /Orbit/i,
    foot: [1, 1],
    seed: 3015,
    draw: (s) => orbitTile(s),
    light: L.arch(110, 0.8),
  },
  {
    city: 'london',
    key: 'lee-valley-velodrome',
    match: /VeloPark|Velodrome/i,
    foot: [1, 1],
    seed: 3016,
    draw: (s) => velodromeTile(s),
    light: L.stadium(36, 0.9),
  },

  // ---- NEW bespoke draws ----------------------------------------------------
  {
    city: 'london',
    key: 'st-pancras-railway-station',
    match: /St\.? Pancras(?!.*Renaissance)/i,
    foot: [4, 4],
    seed: 3101,
    draw: (s) => stPancrasTile(s),
    light: L.facade(188, 1.5),
  },
  {
    city: 'london',
    key: 'london-king-s-cross-railway-station',
    match: /King'?s Cross/i,
    foot: [4, 4],
    seed: 3102,
    draw: (s) => kingsCrossTile(s),
    light: L.facade(118, 1.4),
  },
  {
    city: 'london',
    key: 'london-paddington-station',
    match: /Paddington/i,
    foot: [4, 4],
    seed: 3103,
    draw: (s) => paddingtonTile(s),
    light: L.facade(104, 1.6),
  },
  {
    city: 'london',
    key: 'euston-station',
    match: /Euston Station|^Euston$/i,
    foot: [4, 4],
    seed: 3104,
    draw: (s) => eustonTile(s),
    light: L.towerCrown(56, 1.5),
  },
  {
    city: 'london',
    key: 'london-victoria-station',
    match: /Victoria (Station|station)|London Victoria/i,
    foot: [4, 4],
    seed: 3105,
    draw: (s) => victoriaTile(s),
    light: L.facade(66, 1.5),
  },
  {
    city: 'london',
    key: 'waterloo-international-railway-station',
    match: /Waterloo/i,
    foot: [4, 4],
    seed: 3106,
    draw: (s) => waterlooTile(s),
    light: L.facade(86, 1.6),
  },
  {
    city: 'london',
    key: 'london-bridge-station',
    match: /London Bridge/i,
    foot: [4, 4],
    seed: 3107,
    draw: (s) => londonBridgeTile(s),
    light: L.facade(60, 1.5),
  },
  {
    city: 'london',
    key: 'charing-cross-railway-station',
    match: /Charing Cross/i,
    foot: [3, 3],
    seed: 3108,
    draw: (s) => charingCrossTile(s),
    light: L.facade(66, 1.2),
  },
  {
    city: 'london',
    key: 'natural-history-museum',
    match: /Natural History/i,
    foot: [4, 4],
    seed: 3109,
    draw: (s) => naturalHistoryTile(s),
    light: L.facade(78, 1.6),
  },
  {
    city: 'london',
    key: 'british-museum',
    match: /British Museum/i,
    foot: [4, 4],
    seed: 3110,
    draw: (s) => britishMuseumTile(s),
    light: L.facade(60, 1.6),
  },
  {
    city: 'london',
    key: 'science-museum',
    match: /Science Museum/i,
    foot: [3, 3],
    seed: 3111,
    draw: (s) => scienceMuseumTile(s),
    light: L.facade(54, 1.4),
  },
  {
    city: 'london',
    key: 'victoria-and-albert-museum',
    match: /Victoria and Albert|V&A/i,
    foot: [4, 4],
    seed: 3112,
    draw: (s) => vaMuseumTile(s),
    light: L.facade(116, 1.4),
  },
  {
    city: 'london',
    key: 'british-library',
    match: /British Library/i,
    foot: [4, 4],
    seed: 3113,
    draw: (s) => britishLibraryTile(s),
    light: L.towerCrown(92, 1.4),
  },
  {
    city: 'london',
    key: 'buckingham-palace',
    match: /Buckingham/i,
    foot: [4, 4],
    seed: 3114,
    draw: (s) => buckinghamTile(s),
    light: L.facade(58, 1.6),
  },
  {
    city: 'london',
    key: 'westminster-abbey',
    match: /Westminster Abbey/i,
    foot: [3, 3],
    seed: 3115,
    draw: (s) => westminsterAbbeyTile(s),
    light: L.facade(156, 1.3),
  },
  {
    city: 'london',
    key: 'somerset-house',
    match: /Somerset House/i,
    foot: [3, 3],
    seed: 3116,
    draw: (s) => somersetHouseTile(s),
    light: L.facade(52, 1.4),
  },
  {
    city: 'london',
    key: 'royal-courts-of-justice',
    match: /Royal Courts of Justice|Law Courts/i,
    foot: [3, 3],
    seed: 3117,
    draw: (s) => royalCourtsTile(s),
    light: L.facade(142, 1.3),
  },
  {
    city: 'london',
    key: 'county-hall',
    match: /County Hall/i,
    foot: [4, 4],
    seed: 3118,
    draw: (s) => countyHallTile(s),
    light: L.facade(52, 1.6),
  },
  {
    city: 'london',
    key: 'tate-modern',
    match: /Tate Modern|Bankside Power/i,
    foot: [4, 4],
    seed: 3119,
    draw: (s) => tateModernTile(s),
    light: L.towerCrown(168, 1.5),
  },
  {
    city: 'london',
    key: 'tate-britain',
    match: /Tate Britain/i,
    foot: [4, 4],
    seed: 3120,
    draw: (s) => tateBritainTile(s),
    light: L.facade(50, 1.6),
  },
  {
    city: 'london',
    key: 'royal-national-theatre',
    match: /National Theatre/i,
    foot: [3, 3],
    seed: 3121,
    draw: (s) => nationalTheatreTile(s),
    light: L.towerCrown(78, 1.2),
  },
  {
    city: 'london',
    key: 'harrods',
    match: /Harrods/i,
    foot: [3, 3],
    seed: 3122,
    draw: (s) => harrodsTile(s),
    light: L.facade(60, 1.3),
  },
  {
    city: 'london',
    key: 'carreras-cigarette-factory',
    match: /Carreras/i,
    foot: [3, 3],
    seed: 3123,
    draw: (s) => carrerasTile(s),
    light: L.facade(34, 1.4),
  },
  {
    city: 'london',
    key: 'bank-of-england',
    match: /Bank of England/i,
    foot: [3, 3],
    seed: 3124,
    draw: (s) => bankOfEnglandTile(s),
    light: L.facade(50, 1.4),
  },
  {
    city: 'london',
    key: 'old-bailey',
    match: /Old Bailey|Central Criminal Court/i,
    foot: [3, 3],
    seed: 3125,
    draw: (s) => oldBaileyTile(s),
    light: L.facade(82, 1.3),
  },
];
