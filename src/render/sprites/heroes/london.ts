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
  DUSK_COOL,
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
// NEW BESPOKE DRAWS — W3 ROUND 2
// =============================================================================

// ---- shared helpers for round 2 ---------------------------------------------
const STEEL_GLASS = alpha(hex('#9fb6c8'), 0.92); // pale curtain-wall glass
const STEEL_GLASS_LIT = alpha(hex('#bcd2e2'), 0.94);
const GLASS_GREEN = alpha(hex('#8fb0a6'), 0.9); // greenish modern glazing
const STONE_WARM = hex('#d8caa9'); // warm Portland/Bath stone

/** A regular curtain-wall office tower: a tall glazed box with horizontal
 *  floor banding + a slim crown. Shared base for the modern City heroes; each
 *  caller tweaks proportions/colour so silhouettes differ. */
function glassTower(
  iso: Iso,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  H: number,
  glass: RGBA,
  opts: { floors?: number; crownH?: number; mullions?: boolean } = {},
): void {
  const floors = opts.floors ?? 12;
  iso.box(u0, v0, u1, v1, 0, H, mix(glass, COLORS.glassDark, 0.25));
  // glazed floors on both visible walls
  for (let f = 0; f < floors; f++) {
    const zb = 6 + (f * (H - 10)) / floors;
    const zt = 6 + ((f + 0.7) * (H - 10)) / floors;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, zb, zt, Math.max(6, Math.round((u1 - u0) * 7)), glass, alpha(STEEL_GLASS_LIT, 0.5));
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, zb, zt, Math.max(4, Math.round((v1 - v0) * 7)), mix(glass, DUSK_COOL, 0.12), alpha(STEEL_GLASS_LIT, 0.4));
  }
  // vertical mullion hint on the sunny wall
  if (opts.mullions !== false) {
    for (let u = u0 + 0.12; u < u1 - 0.05; u += 0.16) iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, H - 4), 0.6 * RES, alpha(STEEL_GLASS_LIT, 0.35));
  }
  const ch = opts.crownH ?? 4;
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + ch, lighten(glass, 0.12), { ink: false, topC: top(STEEL_GLASS_LIT, 0.2) });
}

/** 100 BISHOPSGATE: a tall, sharp curtain-wall City tower with a faceted
 *  chamfered south-west corner and a crisp flat top — slim and very tall so it
 *  towers over the fabric. Two linked masses (the spec notes "two buildings"):
 *  a dominant tower + a lower companion block. */
function bishopsgate100Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 210 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // the lower companion block at the front
  glassTower(iso, 0.5, 1.9, 1.6, 2.55, 96, STEEL_GLASS, { floors: 14 });
  // the dominant slim tower, set back, very tall with a chamfered SW corner
  const u0 = 1.5;
  const u1 = 2.55;
  const v0 = 0.5;
  const v1 = 1.7;
  const H = 232;
  // chamfer: cut the near (u1,v1) corner by drawing the body then a clipped face
  glassTower(iso, u0, v0, u1, v1, H, STEEL_GLASS_LIT, { floors: 30, crownH: 6 });
  // a recessed double-height entrance notch at the base on the sunny wall
  iso.r.poly([iso.P(u0 + 0.15, v1, 0), iso.P(u1 - 0.15, v1, 0), iso.P(u1 - 0.15, v1, 16), iso.P(u0 + 0.15, v1, 16)], alpha(hex('#1f2740'), 0.85));
  // crisp ink crown rim + a corner gleam
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H));
  return iso.build();
}

/** 200 ALDERSGATE: a chunky 1990s City office block — a broad stepped glass-
 *  and-steel mass with a banded curtain wall and a set-back upper storey, plus
 *  the little glazed pyramid rooflight (it shares the view with the Museum of
 *  London pyramid in the reference). 3×3. */
function aldersgate200Tile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 130 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  glassTower(iso, 0.45, 1.0, 2.55, 2.55, 104, STEEL_GLASS, { floors: 16 });
  // a set-back top storey
  iso.box(0.7, 1.2, 2.3, 2.3, 104, 122, STEEL_GLASS_LIT, { ink: true });
  iso.windowsLeft(2.3, 0.8, 2.2, 108, 118, 14, STEEL_GLASS, alpha(STEEL_GLASS_LIT, 0.5));
  // the small glazed pyramid rooflight on the front plaza corner
  const [px, pyB] = iso.P(1.5, 2.62, 0);
  iso.r.poly([[px - 6 * RES, pyB], [px + 6 * RES, pyB], [px, pyB - 14 * RES]], alpha(hex('#bcd0e0'), 0.85), alpha(hex('#8fa6b4'), 0.7));
  iso.r.polyline([[px - 6 * RES, pyB], [px, pyB - 14 * RES], [px + 6 * RES, pyB]], INK_W * 0.6, INK);
  return iso.build();
}

/** ONE NEW CHANGE: Jean Nouvel's dark-glass "stealth bomber" mall by St Paul's
 *  — a low, broad, faceted mass clad in brown/charcoal patterned glass, cut by
 *  a deep canyon-like slot framing the cathedral, with chamfered sloping
 *  flanks. Low + wide. 3×3. */
function oneNewChangeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const DK = alpha(hex('#5a4f4a'), 0.95); // the brown-bronze patterned glass
  const DK_L = alpha(hex('#7a6b60'), 0.95);
  iso.shadow(0.4, 0.55, 2.6, 2.6, 0.22, 0.22);
  // two faceted wings either side of a central canyon slot
  const H = 58;
  // left wing
  iso.box(0.45, 0.9, 1.32, 2.55, 0, H, DK, { rightC: DK_L });
  // right wing
  iso.box(1.68, 0.9, 2.55, 2.55, 0, H, DK, { rightC: DK_L });
  // the deep slot between them (recessed, dark)
  iso.box(1.32, 1.1, 1.68, 2.55, 0, H - 6, alpha(hex('#20242c'), 0.92), { ink: false });
  // patterned-glass facets: faint diagonal banding on the sunny faces
  for (const [u0, u1] of [[0.45, 1.32], [1.68, 2.55]] as const) {
    for (let z = 8; z < H - 4; z += 7) iso.r.line(iso.P(u0 + 0.05, 2.55, z), iso.P(u1 - 0.05, 2.55, z + 4), 0.5 * RES, alpha(DK_L, 0.5));
  }
  // chamfered sloping top edges (the angular roofline)
  for (const [u0, u1] of [[0.45, 1.32], [1.68, 2.55]] as const) {
    iso.r.poly([iso.P(u0, 0.9, H), iso.P(u1, 0.9, H), iso.P(u1, 1.3, H + 10), iso.P(u0, 1.3, H + 10)], top(DK_L, 0.1));
  }
  return iso.build();
}

/** BANK OF NEW YORK MELLON (former Barclays, 1 Churchill Place style): a clean
 *  modern City office tower — a glazed slab with a strong gridded curtain wall
 *  and a flat capped top, slimmer + tall. 3×3. */
function bnyMellonTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 180 });
  void seed;
  iso.shadow(0.45, 0.6, 2.55, 2.55, 0.22, 0.22);
  glassTower(iso, 0.7, 0.7, 2.35, 2.35, 196, mix(STEEL_GLASS, hex('#2e4a6a'), 0.18), { floors: 26, crownH: 6 });
  // a slim service mast on the roof
  const [mx, my] = iso.P(1.5, 1.5, 202);
  iso.r.line([mx, my], [mx, my - 12 * RES], 1.2 * RES, COLORS.steel);
  iso.gleam(iso.P(2.35, 0.7, 196), iso.P(2.35, 2.35, 196));
  return iso.build();
}

/** LONDON WALL BUILDINGS: an Edwardian-baroque Portland-stone office range at
 *  Finsbury Circus — a long curved stone frontage with rusticated base, regular
 *  windows, paired pilasters and a balustraded cornice with corner cupolas.
 *  3×3, dignified not tall. */
function londonWallBuildingsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.3;
  const v1 = 2.5;
  const H = 50;
  iso.box(u0, v0, u1, v1, 0, H, STONE_WARM);
  for (const [zb, zt] of [[8, 20], [24, 36], [40, 48]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(STONE_WARM, 0.1));
  }
  // rusticated base + paired pilaster strips + balustraded cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(STONE_WARM, 0.12), { ink: false });
  for (let u = u0 + 0.22; u < u1 - 0.1; u += 0.34) iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, H - 2), 1.4 * RES, alpha(STONE_DARK, 0.4));
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(STONE_WARM, 0.08), { topC: top(STONE_WARM, 0.3) });
  // a pair of small lead corner cupolas
  for (const cu of [u0 + 0.3, u1 - 0.3]) {
    iso.box(cu - 0.16, v1 - 0.16, cu + 0.16, v1 + 0.02, H + 4, H + 12, STONE_WARM, { ink: false });
    const [dx, dyB] = iso.P(cu, v1 - 0.06, H + 12);
    const dome: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); dome.push([dx + Math.cos(a) * 4 * RES, dyB - Math.sin(a) * 6 * RES]); }
    iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    iso.r.line([dx, dyB - 6 * RES], [dx, dyB - 11 * RES], 0.9 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** MAUGHAN LIBRARY (former Public Record Office): Pennethorne's neo-Gothic
 *  "strong-box of the Empire" on Chancery Lane — a fortress-like Bath-stone
 *  range with battlemented parapets, tall traceried Gothic windows, octagonal
 *  corner turrets and a central tower with a clock. 3×3. */
function maughanLibraryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const GST = hex('#cabd9c');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, GST);
  // two tiers of tall pointed Gothic windows
  for (const [zb, zt] of [[10, 28], [32, 50]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 12, alpha(hex('#2c3550'), 0.85), lighten(GST, 0.1));
  }
  // battlemented parapet (crenellations)
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(GST, 0.06), { ink: false });
  for (let u = u0 + 0.1; u < u1; u += 0.18) iso.box(u, v1 - 0.03, u + 0.09, v1 + 0.01, H + 4, H + 9, lighten(GST, 0.08), { ink: false });
  // octagonal corner turrets
  for (const cu of [u0 + 0.05, u1 - 0.05]) {
    iso.box(cu - 0.1, v1 - 0.1, cu + 0.1, v1 + 0.04, 0, H + 18, lighten(GST, 0.03));
    const [tx, tyB] = iso.P(cu, v1 - 0.03, H + 18);
    iso.r.poly([[tx - 4 * RES, tyB], [tx + 4 * RES, tyB], [tx, tyB - 12 * RES]], shaded(SLATE, 0.05), lit(SLATE, 0.05));
    iso.r.line([tx, tyB - 12 * RES], [tx, tyB - 16 * RES], 0.9 * RES, COLORS.glassLit);
  }
  // central clock tower
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.26, v1 - 0.26, cu + 0.26, v1 + 0.04, 0, 84, GST);
  const [clx, cly] = iso.P(cu, v1 + 0.04, 66);
  const cr = 4 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, COLORS.white);
  iso.r.polyline(clk, INK_W * 0.6, INK, true);
  iso.hip(cu - 0.28, v1 - 0.28, cu + 0.28, v1 + 0.06, 84, 18, SLATE);
  return iso.build();
}

/** HOLBORN BARS (the Prudential Assurance Building): Waterhouse's vast red
 *  terracotta High-Victorian Gothic pile on Holborn — deep blood-red brick and
 *  terracotta, pointed gables, a great central archway and a tall pinnacled
 *  clock tower. 3×3, richly Gothic. */
function holbornBarsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 140 });
  void seed;
  const RED = hex('#9c3f30'); // Prudential terracotta red
  const RED_L = hex('#b5563f');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 60;
  iso.box(u0, v0, u1, v1, 0, H, RED);
  for (const [zb, zt] of [[10, 24], [30, 44], [48, 56]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 13, alpha(hex('#2c2540'), 0.8), RED_L);
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(RED, 0.06), { ink: false });
  // a row of steep terracotta gables along the parapet
  for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.55) {
    iso.r.poly([iso.P(u - 0.18, v1, H + 3), iso.P(u + 0.18, v1, H + 3), iso.P(u, v1, H + 16)], lit(RED, 0.05));
    iso.r.polyline([iso.P(u - 0.18, v1, H + 3), iso.P(u, v1, H + 16), iso.P(u + 0.18, v1, H + 3)], INK_W * 0.6, INK);
  }
  // the great central archway (the gateway to Waterhouse Square)
  const cu = (u0 + u1) / 2;
  archGableLeft(iso, v1 + 0.001, cu - 0.22, cu + 0.22, 6, 30, alpha(hex('#241c30'), 0.9), RED_L);
  // the tall pinnacled clock tower at one end
  const ctu = u0 + 0.55;
  iso.box(ctu - 0.22, v1 - 0.28, ctu + 0.16, v1 + 0.02, 0, 104, RED);
  const [clx, cly] = iso.P(ctu - 0.03, v1 + 0.02, 80);
  const cr = 3.6 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, COLORS.white);
  iso.r.polyline(clk, INK_W * 0.6, INK, true);
  iso.box(ctu - 0.24, v1 - 0.3, ctu + 0.18, v1 + 0.04, 104, 110, lighten(RED, 0.06), { ink: false });
  iso.hip(ctu - 0.22, v1 - 0.28, ctu + 0.16, v1 + 0.02, 110, 30, SLATE);
  const [tx, ty] = iso.P(ctu - 0.03, v1 - 0.13, 140);
  iso.r.line([tx, ty], [tx, ty - 10 * RES], 1.3 * RES, COLORS.glassLit);
  return iso.build();
}

// ---- West End: hotels, theatres, stores -------------------------------------

/** SAVOY HOTEL: the Strand's grand Edwardian hotel — a tall cream-and-stone
 *  block with deep banded windows, a mansard roof, and the unmistakable
 *  stainless-steel Savoy entrance sign/canopy projecting at the front. (The
 *  first building in Britain lit throughout by electric light.) 3×3. */
function savoyHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 100 });
  void seed;
  const CR = hex('#e3d8bd'); // cream faience
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.3;
  const v1 = 2.5;
  const H = 70;
  iso.box(u0, v0, u1, v1, 0, H, CR);
  for (const [zb, zt] of [[8, 20], [24, 36], [40, 52], [56, 66]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(CR, 0.1));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, lighten(CR, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(CR, 0.08), { ink: false });
  // the mansard roof
  iso.gable(u0, v0, u1, v1, H + 3, 14, 'u', SLATE, CR);
  for (let u = u0 + 0.35; u < u1 - 0.2; u += 0.5) {
    iso.box(u - 0.05, v1 - 0.03, u + 0.05, v1, H + 4, H + 11, CR, { ink: false });
    iso.r.poly([iso.P(u - 0.05, v1, H + 11), iso.P(u + 0.05, v1, H + 11), iso.P(u, v1, H + 15)], SLATE);
  }
  // the projecting stainless-steel Savoy canopy + sign at the entrance
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.32, v1, cu + 0.32, v1 + 0.34, 10, 13, COLORS.steel, { ink: false, topC: lighten(COLORS.steel, 0.2) });
  const [sx, syB] = iso.P(cu, v1 + 0.18, 13);
  iso.box(cu - 0.06, v1 + 0.14, cu + 0.06, v1 + 0.22, 13, 30, COLORS.steelDark, { ink: false });
  iso.r.line([sx, syB - 34 * RES], [sx, syB - 34 * RES], 2 * RES, COLORS.glassHot);
  iso.glint([sx, syB - 24 * RES]);
  return iso.build();
}

/** ROYAL OPERA HOUSE: Covent Garden — E.M. Barry's Victorian-classical opera
 *  house: a Portland-stone front with a giant hexastyle portico under a
 *  sculptured frieze, beside the great barrel-vaulted glass-and-iron Floral
 *  Hall (the Paul Hamlyn Hall) with its arched glazed roof. 4×4. */
function royalOperaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  // the great glazed Floral Hall vault behind, to one side
  const [gx, gyB] = iso.P(2.7, 0.9, 0);
  const GR = 0.92 * (CELL_W / 2);
  const vault: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); vault.push([gx + Math.cos(a) * GR, gyB - 60 * RES - Math.sin(a) * GR * 0.66]); }
  iso.r.poly([...vault, [gx + GR, gyB - 30 * RES], [gx - GR, gyB - 30 * RES]], GLASS_SHED, alpha(hex('#7d92ad'), 0.8));
  iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
  for (let i = 2; i < 20; i += 3) { const a = Math.PI * (i / 20); iso.r.line([gx + Math.cos(a) * GR, gyB - 30 * RES], [gx + Math.cos(a) * GR, gyB - 60 * RES - Math.sin(a) * GR * 0.66], 0.6 * RES, alpha(COLORS.white, 0.45)); }
  // the stone opera-house block
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.8;
  const v1 = 3.45;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 30, 48, 12, GLASS_DK, COLORS.white);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // the grand projecting portico: tall columns + frieze + pediment
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.7, v1, cu + 0.7, v1 + 0.4, 0, H - 2, PORTLAND, { ink: false });
  for (let i = 0; i <= 7; i++) {
    const u = cu - 0.56 + (1.12 * i) / 7;
    iso.r.poly([iso.P(u - 0.024, v1 + 0.4, H - 4), iso.P(u + 0.024, v1 + 0.4, H - 4), iso.P(u + 0.024, v1 + 0.4, 6), iso.P(u - 0.024, v1 + 0.4, 6)], i % 2 ? COLORS.white : lit(PORTLAND, 0.08));
  }
  iso.box(cu - 0.74, v1, cu + 0.74, v1 + 0.42, H - 4, H + 2, lighten(PORTLAND, 0.06), { ink: false });
  iso.r.poly([iso.P(cu - 0.78, v1 + 0.42, H + 2), iso.P(cu + 0.78, v1 + 0.42, H + 2), iso.P(cu, v1 + 0.42, H + 14)], lighten(PORTLAND, 0.1));
  iso.r.polyline([iso.P(cu - 0.78, v1 + 0.42, H + 2), iso.P(cu + 0.78, v1 + 0.42, H + 2), iso.P(cu, v1 + 0.42, H + 14), iso.P(cu - 0.78, v1 + 0.42, H + 2)], INK_W * 0.7, INK, true);
  return iso.build();
}

/** LONDON TROCADERO: the great Beaux-Arts entertainment pile at Piccadilly
 *  Circus — a tall stone-and-glass block bristling with restless detail and,
 *  above all, plastered in giant illuminated advertising hoardings (the
 *  Piccadilly lights). A blocky mass crowned by a glowing screen band. 3×3. */
function trocaderoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 100 });
  void seed;
  const STN = hex('#c9bda4');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 64;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  for (const [zb, zt] of [[8, 20], [24, 36]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(STN, 0.1));
  }
  // the great illuminated advertising band across the upper front (Piccadilly
  // lights): a glowing multi-colour screen
  const adZ0 = 42;
  const adZ1 = H - 2;
  const adColors = [hex('#e0506a'), hex('#4fb0d8'), hex('#f0c04a'), hex('#6fc080')];
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const a = u0 + 0.15 + ((u1 - u0 - 0.3) * i) / segs;
    const b = u0 + 0.15 + ((u1 - u0 - 0.3) * (i + 1)) / segs;
    iso.r.poly([iso.P(a, v1, adZ1), iso.P(b, v1, adZ1), iso.P(b, v1, adZ0), iso.P(a, v1, adZ0)], alpha(adColors[i % adColors.length] ?? hex('#e0506a'), 0.92));
  }
  iso.r.polyline([iso.P(u0 + 0.12, v1, adZ0), iso.P(u1 - 0.12, v1, adZ0), iso.P(u1 - 0.12, v1, adZ1), iso.P(u0 + 0.12, v1, adZ1)], INK_W * 0.5, alpha(INK, 0.6), true);
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  // a small parapet crest
  for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.5) {
    iso.r.poly([iso.P(u - 0.1, v1, H + 4), iso.P(u + 0.1, v1, H + 4), iso.P(u, v1, H + 10)], lit(STN, 0.06));
  }
  return iso.build();
}

/** GROSVENOR HOUSE HOTEL: the big inter-war Park Lane hotel — a long, tall,
 *  symmetrical brick-and-stone slab with regular punched windows, a strong
 *  cornice and twin set-back roof pavilions, facing Hyde Park. 3×3. */
function grosvenorHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const BR = hex('#b98e63'); // pale 1920s brown brick
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 86;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  for (let f = 0; f < 8; f++) {
    const zb = 8 + (f * (H - 14)) / 8;
    const zt = 8 + ((f + 0.6) * (H - 14)) / 8;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zt, 18, GLASS_DK, lighten(BR, 0.12));
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zt, 9, GLASS_DK, lighten(BR, 0.12));
  }
  // stone base + cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, PORTLAND, { ink: false });
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(PORTLAND, 0.06), { topC: top(PORTLAND, 0.3) });
  // twin set-back roof pavilions
  for (const cu of [u0 + 0.5, u1 - 0.5]) {
    iso.box(cu - 0.28, v0 + 0.2, cu + 0.28, v1 - 0.2, H + 4, H + 22, BR);
    iso.windowsLeft(v1 - 0.2, cu - 0.22, cu + 0.22, H + 8, H + 18, 6, GLASS_DK, lighten(BR, 0.12));
    iso.box(cu - 0.3, v0 + 0.18, cu + 0.3, v1 - 0.18, H + 22, H + 25, lighten(BR, 0.1), { ink: false });
  }
  return iso.build();
}

/** ONE HYDE PARK: Rogers' ultra-luxury Knightsbridge towers — four linked
 *  glass-and-steel pavilions stepping in height, with the architect's signature
 *  exposed steel bracing nodes and bright winter-garden glazing. Slim, modern,
 *  pale blue-green glass. 3×3. */
function oneHydeParkTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 160 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // four linked stepping pavilions along the u axis
  const pav = [
    { u0: 0.45, u1: 1.05, H: 120 },
    { u0: 1.05, u1: 1.6, H: 150 },
    { u0: 1.6, u1: 2.15, H: 138 },
    { u0: 2.15, u1: 2.6, H: 108 },
  ];
  for (const p of pav) {
    glassTower(iso, p.u0, 1.2, p.u1, 2.5, p.H, GLASS_GREEN, { floors: Math.round(p.H / 9), mullions: false });
    // exposed steel bracing X on the sunny end wall
    const e = p.u1;
    for (let z = 16; z < p.H - 8; z += 22) {
      iso.r.line(iso.P(e, 1.2, z), iso.P(e, 2.5, z + 12), 0.7 * RES, alpha(COLORS.steel, 0.7));
      iso.r.line(iso.P(e, 1.2, z + 12), iso.P(e, 2.5, z), 0.7 * RES, alpha(COLORS.steel, 0.7));
    }
  }
  return iso.build();
}

/** ST JAMES'S PALACE: Henry VIII's Tudor red-brick palace — a low, sprawling
 *  range of warm diapered brick with crow-stepped/crenellated parapets and,
 *  above all, the famous four-storey octagonal-turreted GATEHOUSE with its
 *  clock and twin polygonal towers. Low + broad. 4×4. */
function stJamesPalaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const TBR = hex('#8e4a3a'); // warm Tudor brick
  const TBR_L = hex('#a55c46');
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.9;
  const v1 = 3.4;
  const H = 40;
  iso.box(u0, v0, u1, v1, 0, H, TBR);
  // diaper-pattern brick hint (faint diagonal lozenges) + mullioned windows
  for (const [zb, zt] of [[8, 20], [24, 34]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 18, alpha(hex('#2c2030'), 0.8), lighten(TBR, 0.12));
  }
  // crenellated parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(TBR, 0.06), { ink: false });
  for (let u = u0 + 0.1; u < u1; u += 0.2) iso.box(u, v1 - 0.03, u + 0.1, v1 + 0.01, H + 3, H + 8, lighten(TBR, 0.08), { ink: false });
  // THE GATEHOUSE: a tall block with twin octagonal turrets + clock
  const gu = u0 + 1.0;
  iso.box(gu - 0.42, v1 - 0.3, gu + 0.42, v1 + 0.04, 0, 78, TBR);
  // the deep arched gateway
  archGableLeft(iso, v1 + 0.04, gu - 0.18, gu + 0.18, 4, 26, alpha(hex('#1f1626'), 0.9), TBR_L);
  // clock face high on the gatehouse
  const [clx, cly] = iso.P(gu, v1 + 0.04, 58);
  const cr = 4 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, hex('#2a2a36'));
  iso.r.polyline(clk, INK_W * 0.6, lighten(TBR_L, 0.2), true);
  // the twin polygonal turrets either side, each with a small lead cupola
  for (const tu of [gu - 0.5, gu + 0.5]) {
    iso.box(tu - 0.13, v1 - 0.28, tu + 0.13, v1 + 0.02, 0, 92, TBR);
    iso.box(tu - 0.15, v1 - 0.3, tu + 0.15, v1 + 0.04, 92, 96, lighten(TBR, 0.06), { ink: false });
    const [tx, tyB] = iso.P(tu, v1 - 0.13, 96);
    const dome: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); dome.push([tx + Math.cos(a) * 5 * RES, tyB - Math.sin(a) * 8 * RES]); }
    iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    iso.r.line([tx, tyB - 8 * RES], [tx, tyB - 13 * RES], 0.9 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** INSTITUTE OF CONTEMPORARY ARTS (Nash House, Carlton House Terrace): a
 *  stuccoed cream Regency terrace front on The Mall — a long, low, elegant
 *  classical facade with a giant order of Corinthian columns, a balustraded
 *  parapet and the regular rhythm of tall windows. Low + wide. 3×3. */
function icaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const CR = hex('#ece2cc'); // Nash cream stucco
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.7;
  const v1 = 2.5;
  const H = 40;
  iso.box(u0, v0, u1, v1, 0, H, CR);
  // tall windows in two storeys
  for (const [zb, zt] of [[8, 22], [26, 36]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(CR, 0.08));
  }
  // the giant order of Corinthian columns across the front
  const colV = v1 + 0.02;
  for (let i = 0; i <= 12; i++) {
    const u = u0 + 0.18 + ((u1 - u0 - 0.36) * i) / 12;
    iso.r.poly([iso.P(u - 0.022, colV, H - 4), iso.P(u + 0.022, colV, H - 4), iso.P(u + 0.022, colV, 4), iso.P(u - 0.022, colV, 4)], i % 2 ? COLORS.white : lit(CR, 0.06));
  }
  // entablature + balustraded parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H - 4, H + 3, lighten(CR, 0.06), { ink: false });
  for (let u = u0 + 0.15; u <= u1 - 0.1; u += 0.22) iso.box(u - 0.03, v1 - 0.03, u + 0.03, v1, H + 3, H + 8, lighten(CR, 0.05), { ink: false });
  return iso.build();
}

/** MINISTRY OF DEFENCE (Main Building, Whitehall): a vast, austere 1950s
 *  neoclassical-stripped Portland-stone government block — a long, monumental,
 *  flat-roofed mass with deeply regular windows, a rusticated base and two
 *  monumental seated stone figures (Earth & Water) flanking the entrance.
 *  Big + blocky. 4×4. */
function modTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.4;
  const v1 = 3.4;
  const H = 64;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  for (let f = 0; f < 7; f++) {
    const zb = 12 + (f * (H - 18)) / 7;
    const zt = 12 + ((f + 0.6) * (H - 18)) / 7;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 26, GLASS_DK, lighten(PORTLAND, 0.08));
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 14, GLASS_DK, lighten(PORTLAND, 0.08));
  }
  // heavy rusticated base
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(PORTLAND, 0.14), { ink: false });
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(PORTLAND, 0.06), { topC: top(PORTLAND, 0.3) });
  // a slightly projecting, taller centre bay
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.6, v1 - 0.02, cu + 0.6, v1 + 0.05, 0, H + 8, lighten(PORTLAND, 0.04));
  // the monumental entrance + the two seated stone figures flanking it
  archGableLeft(iso, v1 + 0.05, cu - 0.18, cu + 0.18, 4, 22, shaded(PORTLAND, 0.5), PORTLAND);
  for (const dx of [-0.36, 0.36]) {
    const [fx, fyB] = iso.P(cu + dx, v1 + 0.06, 0);
    iso.r.poly([[fx - 2.4 * RES, fyB], [fx + 2.4 * RES, fyB], [fx + 1.8 * RES, fyB - 14 * RES], [fx - 1.8 * RES, fyB - 14 * RES]], shaded(PORTLAND, 0.2));
    iso.r.poly([[fx - 1.8 * RES, fyB - 14 * RES], [fx + 1.8 * RES, fyB - 14 * RES], [fx, fyB - 20 * RES]], lit(PORTLAND, 0.05));
  }
  return iso.build();
}

/** MINISTRY OF JUSTICE (102 Petty France): Basil Spence's brutalist Westminster
 *  block — a heavy, dark, deeply-modelled pre-cast concrete tower-on-podium
 *  with strongly projecting vertical fins/bays and recessed bronze glazing. A
 *  blunt, severe modern mass. 3×3. */
function mojTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 120 });
  void seed;
  const CON = hex('#9a958a'); // dark weathered concrete
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // low podium
  iso.box(0.4, 1.5, 2.6, 2.55, 0, 22, CON);
  iso.box(0.38, 1.48, 2.62, 2.57, 22, 25, lighten(CON, 0.06), { ink: false });
  // the slab tower with strong projecting vertical bays
  const u0 = 0.6;
  const u1 = 2.4;
  const v0 = 1.5;
  const v1 = 2.2;
  const H = 104;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  // projecting fins on the sunny wall: alternate raised bays + recessed bronze glazing
  const bays = 6;
  for (let i = 0; i < bays; i++) {
    const a = u0 + 0.05 + ((u1 - u0 - 0.1) * i) / bays;
    const b = u0 + 0.05 + ((u1 - u0 - 0.1) * (i + 0.66)) / bays;
    // recessed glazing column
    iso.r.poly([iso.P(a, v1, 26), iso.P(b, v1, 26), iso.P(b, v1, H - 6), iso.P(a, v1, H - 6)], alpha(hex('#5a4a3a'), 0.85));
    // the projecting concrete fin between
    iso.r.line(iso.P(b + 0.02, v1, 26), iso.P(b + 0.02, v1, H - 4), 1.6 * RES, shaded(CON, 0.16));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 5, lighten(CON, 0.06), { ink: false });
  return iso.build();
}

/** DEPARTMENT FOR TRANSPORT (Great Minster House, Horseferry Road): a clean
 *  modern Pimlico office — a glazed, stone-and-glass block with a curved
 *  glass-fronted entrance bay, horizontal banding and a flat capped roofline.
 *  3×3. */
function dftTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 72;
  iso.box(u0, v0, u1, v1, 0, H, mix(STONE_WARM, hex('#bcd0e0'), 0.3));
  for (let f = 0; f < 8; f++) {
    const zb = 8 + (f * (H - 12)) / 8;
    const zt = 8 + ((f + 0.65) * (H - 12)) / 8;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 18, STEEL_GLASS, alpha(STEEL_GLASS_LIT, 0.45));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STONE_WARM, 0.08), { ink: false });
  // a curved glazed entrance bay bulging at the front centre
  const cu = (u0 + u1) / 2;
  const [bx, byB] = iso.P(cu, v1 + 0.18, 0);
  const BR = 0.5 * (CELL_W / 2);
  const bay: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); bay.push([bx + Math.cos(a) * BR, byB - 40 * RES - Math.sin(a) * 6 * RES]); }
  iso.r.poly([...bay, [bx + BR, byB], [bx - BR, byB]], STEEL_GLASS_LIT, alpha(hex('#8fa6b4'), 0.6));
  iso.r.polyline(bay, INK_W * 0.6, alpha(INK, 0.5));
  for (let z = 8; z < 38; z += 9) iso.r.line([bx - BR, byB - z * RES], [bx + BR, byB - z * RES], 0.5 * RES, alpha(COLORS.white, 0.4));
  return iso.build();
}

// ---- South Kensington colleges + Kensington/Bayswater -----------------------

/** ROYAL SCHOOL OF MINES: Aston Webb's grand Edwardian-baroque college front on
 *  Prince Consort Road — a tall warm-stone facade with a deep arched entrance,
 *  giant engaged columns, sculptural figures over the arch and a bold cornice.
 *  3×3. */
function royalSchoolMinesTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const STN = hex('#d8c49c');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  for (const [zb, zt] of [[10, 24], [30, 46]] as const) {
    iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, zb, zt, 12, GLASS_DK, lighten(STN, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  // the deep arched centre entrance with giant columns either side
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.5, v1 - 0.02, cu + 0.5, v1 + 0.05, 0, H + 6, lighten(STN, 0.04));
  archGableLeft(iso, v1 + 0.05, cu - 0.26, cu + 0.26, 6, 40, alpha(hex('#2c2438'), 0.85), lighten(STN, 0.12));
  for (const dx of [-0.4, 0.4]) {
    iso.r.poly([iso.P(cu + dx - 0.03, v1 + 0.05, H + 2), iso.P(cu + dx + 0.03, v1 + 0.05, H + 2), iso.P(cu + dx + 0.03, v1 + 0.05, 6), iso.P(cu + dx - 0.03, v1 + 0.05, 6)], lit(STN, 0.08));
  }
  // figures over the arch (a small sculptural group)
  const [sx, syB] = iso.P(cu, v1 + 0.05, H + 6);
  iso.r.poly([[sx - 5 * RES, syB], [sx + 5 * RES, syB], [sx + 3 * RES, syB - 8 * RES], [sx - 3 * RES, syB - 8 * RES]], shaded(STN, 0.1));
  return iso.build();
}

/** CITY AND GUILDS BUILDING: a clean later-20th-century Imperial College block
 *  on Exhibition Road — a brick-and-glass mass with strong horizontal window
 *  bands and a flat roofline; modern, regular, plain. 3×3. */
function cityGuildsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const BR = hex('#b07a55');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 60;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // strong horizontal ribbon glazing
  for (let f = 0; f < 6; f++) {
    const zb = 8 + (f * (H - 12)) / 6;
    const zt = 8 + ((f + 0.55) * (H - 12)) / 6;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 1, alpha(hex('#2c3550'), 0.7), lighten(BR, 0.1));
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 1, alpha(hex('#2c3550'), 0.7), lighten(BR, 0.1));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(BR, 0.08), { ink: false });
  return iso.build();
}

/** SHERFIELD BUILDING: Imperial College's 1960s central tower-block — a tall,
 *  slim, pale curtain-wall slab with regular gridded glazing rising over a low
 *  podium; the campus landmark. 3×3, tall. */
function sherfieldTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 150 });
  void seed;
  const CON = hex('#cfc9bb');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // low podium
  iso.box(0.4, 1.7, 2.6, 2.55, 0, 18, CON);
  iso.box(0.38, 1.68, 2.62, 2.57, 18, 21, lighten(CON, 0.06), { ink: false });
  // the slim slab tower
  const u0 = 0.7;
  const u1 = 2.3;
  const v0 = 1.6;
  const v1 = 2.1;
  const H = 156;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  for (let f = 0; f < 18; f++) {
    const zb = 22 + (f * (H - 28)) / 18;
    const zt = 22 + ((f + 0.62) * (H - 28)) / 18;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 12, alpha(hex('#2c3550'), 0.75), alpha(COLORS.white, 0.6));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(CON, 0.08), { ink: false });
  return iso.build();
}

/** KENSINGTON PALACE: Wren's restrained red-brick royal residence in Kensington
 *  Gardens — a calm, symmetrical brick range with stone quoins and dressings, a
 *  hipped roof with dormers, tall sash windows and the prominent stone clock-
 *  tower over the courtyard entrance. Low + broad, garden-set. 3×3. */
function kensingtonPalaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const BR = hex('#9a5240');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // a touch of garden lawn in front
  iso.quad(0.4, 2.4, 2.6, 2.6, 0, hex('#6f7a4a'));
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.4;
  const H = 42;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // tall sash windows with pale stone surrounds
  for (const [zb, zt] of [[8, 20], [24, 36]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 14, GLASS_DK, PORTLAND);
  }
  // stone quoins at the corners
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(BR, 0.06), { ink: false });
  // hipped roof with dormers
  iso.hip(u0, v0, u1, v1, H + 3, 12, SLATE);
  for (let u = u0 + 0.4; u < u1 - 0.2; u += 0.5) {
    iso.box(u - 0.05, v1 - 0.04, u + 0.05, v1, H + 4, H + 9, BR, { ink: false });
    iso.r.poly([iso.P(u - 0.05, v1, H + 9), iso.P(u + 0.05, v1, H + 9), iso.P(u, v1, H + 12)], SLATE);
  }
  // the stone clock tower / cupola over the centre
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.18, v0 + 0.3, cu + 0.18, v0 + 0.66, H + 3, H + 16, PORTLAND);
  const [clx, cly] = iso.P(cu, v0 + 0.48, H + 11);
  const cr = 3.4 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, COLORS.white);
  iso.r.polyline(clk, INK_W * 0.6, INK, true);
  const [dx, dyB] = iso.P(cu, v0 + 0.48, H + 16);
  const dome: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); dome.push([dx + Math.cos(a) * 5 * RES, dyB - Math.sin(a) * 7 * RES]); }
  iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, INK);
  iso.r.line([dx, dyB - 7 * RES], [dx, dyB - 12 * RES], 0.9 * RES, COLORS.glassLit);
  return iso.build();
}

/** DERRY & TOMS: the great Art-Deco Kensington High Street department store —
 *  a long, low, dignified stone-faced facade with vertical Deco pilaster
 *  fluting, bronze shopfronts and, famously, the lush roof gardens (a green
 *  hedge-and-tree band along the parapet). 3×3, low + wide. */
function derryTomsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const STN = hex('#ddd0b6');
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.6;
  const v1 = 2.5;
  const H = 42;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  // bronze shopfront band at the base
  iso.r.poly([iso.P(u0, v1, 2), iso.P(u1, v1, 2), iso.P(u1, v1, 12), iso.P(u0, v1, 12)], alpha(hex('#6b5a3a'), 0.9));
  // Deco vertical fluting + windows above
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 16, 34, 18, GLASS_DK, lighten(STN, 0.08));
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.2) iso.r.line(iso.P(u, v1, 14), iso.P(u, v1, H - 2), 1.2 * RES, alpha(STONE_DARK, 0.4));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(STN, 0.08), { ink: false });
  // the famous ROOF GARDENS: a band of hedges + small trees along the parapet
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.28) {
    const [hx, hyB] = iso.P(u, v1 - 0.06, H + 3);
    iso.r.poly([[hx - 4 * RES, hyB], [hx + 4 * RES, hyB], [hx + 3 * RES, hyB - 5 * RES], [hx - 3 * RES, hyB - 5 * RES]], shaded(hex('#5f7a44'), 0.05));
  }
  iso.ball(u0 + 0.5, v0 + 0.3, 0.16, 24, hex('#5f7a44'), H + 3);
  iso.ball(u1 - 0.6, v0 + 0.4, 0.16, 22, hex('#688046'), H + 3);
  return iso.build();
}

/** WHITELEYS: the grand Edwardian-baroque Bayswater department store — a long
 *  Portland-stone palace front with paired columns, a deep cornice and a great
 *  central copper DOME over the corner entrance (the Queensway landmark). 4×4. */
function whiteleysTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.6;
  const v1 = 3.4;
  const H = 54;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  for (const [zb, zt] of [[8, 22], [28, 42]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, lighten(PORTLAND, 0.1));
  }
  // paired pilasters
  for (let u = u0 + 0.25; u < u1 - 0.1; u += 0.45) {
    iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, H - 2), 1.4 * RES, alpha(STONE_DARK, 0.4));
    iso.r.line(iso.P(u + 0.06, v1, 8), iso.P(u + 0.06, v1, H - 2), 1.4 * RES, alpha(STONE_DARK, 0.4));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // the great central copper dome on a drum
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.4, v0 + 0.5, cu + 0.4, v0 + 1.3, H, H + 16, PORTLAND);
  const [dx, dyB] = iso.P(cu, v0 + 0.9, H + 16);
  const DR = 0.62 * (CELL_W / 2);
  const dome: Pt[] = [];
  for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); dome.push([dx + Math.cos(a) * DR, dyB - Math.sin(a) * DR * 1.1]); }
  iso.r.poly(dome, shaded(hex('#6f9c8a'), 0.05), lit(hex('#7fae98'), 0.06)); // verdigris copper
  iso.r.polyline(dome, INK_W * 0.7, INK);
  for (let i = 3; i < 18; i += 3) { const a = Math.PI * (i / 18); iso.r.line([dx + Math.cos(a) * DR, dyB], [dx + Math.cos(a) * DR, dyB - Math.sin(a) * DR * 1.1], 0.5 * RES, alpha(hex('#bfe0d4'), 0.4)); }
  iso.r.line([dx, dyB - DR * 1.1], [dx, dyB - DR * 1.1 - 8 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** HILTON LONDON METROPOLE: a big 1970s Edgware Road tower hotel — a tall,
 *  slab-like concrete-and-glass block with strongly banded floors stepping up
 *  to a flat top; a blunt modern high-rise. 4×4, tall. */
function hiltonMetropoleTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 170 });
  void seed;
  const CON = hex('#b8b0a2');
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  // lower wing
  iso.box(0.5, 2.2, 3.5, 3.5, 0, 60, CON);
  iso.windowsLeft(3.5, 0.6, 3.4, 8, 54, 28, GLASS_DK, alpha(COLORS.white, 0.6));
  iso.box(0.48, 2.18, 3.52, 3.52, 60, 63, lighten(CON, 0.06), { ink: false });
  // the tall main slab
  const u0 = 0.7;
  const u1 = 3.3;
  const v0 = 0.8;
  const v1 = 2.2;
  const H = 178;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  for (let f = 0; f < 20; f++) {
    const zb = 8 + (f * (H - 14)) / 20;
    const zt = 8 + ((f + 0.62) * (H - 14)) / 20;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, zb, zt, 20, GLASS_DK, alpha(COLORS.white, 0.55));
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, zb, zt, 11, GLASS_DK, alpha(COLORS.white, 0.5));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(CON, 0.08), { ink: false });
  return iso.build();
}

// ---- Marylebone / Regent's Park / Maida Vale --------------------------------

/** MAIDA VALE STUDIOS: the BBC's Edwardian roller-skating-palace-turned-sound-
 *  studios — a long, low, plain brick-and-render block with big arched windows
 *  and a modest parapet; a quiet, horizontal building with rooftop aerials/
 *  vents hinting at the studios within. 3×3, low. */
function maidaValeStudiosTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const REN = hex('#cdbfa6'); // pale render
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.6;
  const v1 = 2.5;
  const H = 36;
  iso.box(u0, v0, u1, v1, 0, H, REN);
  // a row of tall round-arched windows
  for (let u = u0 + 0.18; u < u1 - 0.12; u += 0.3) {
    archGableLeft(iso, v1, u, u + 0.2, 10, 28, alpha(hex('#2c3550'), 0.8), lighten(REN, 0.08));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(REN, 0.08), { topC: top(REN, 0.3) });
  // rooftop aerials / studio vents
  for (const [au, av] of [[u0 + 0.5, v0 + 0.4], [cuOf(u0, u1), v0 + 0.5], [u1 - 0.5, v0 + 0.4]] as const) {
    const [ax, ay] = iso.P(au, av, H + 4);
    iso.r.line([ax, ay], [ax, ay - 12 * RES], 1 * RES, COLORS.steel);
    iso.r.line([ax - 3 * RES, ay - 10 * RES], [ax + 3 * RES, ay - 10 * RES], 0.8 * RES, COLORS.steelDark);
  }
  return iso.build();
}

/** Small helper: centre-u of a span (kept local to round 2). */
function cuOf(u0: number, u1: number): number {
  return (u0 + u1) / 2;
}

/** CORNWALL TERRACE: Decimus Burton's pristine Nash-era Regent's Park terrace —
 *  a long, palatial, brilliant-white stuccoed classical range with a continuous
 *  giant order of Corinthian columns, projecting pedimented pavilions and a
 *  balustraded parapet, fronting park lawn. Low + very wide. 4×4. */
function cornwallTerraceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 60 });
  void seed;
  const CR = hex('#efe7d3'); // brilliant white stucco
  iso.shadow(0.35, 0.7, 3.65, 3.65, 0.2, 0.2);
  // park lawn in front
  iso.quad(0.4, 3.3, 3.6, 3.6, 0, hex('#6f7c48'));
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.9;
  const v1 = 3.3;
  const H = 40;
  iso.box(u0, v0, u1, v1, 0, H, CR);
  for (const [zb, zt] of [[8, 20], [24, 34]] as const) {
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 24, GLASS_DK, lighten(CR, 0.08));
  }
  // the continuous giant order of columns across the front
  const colV = v1 + 0.02;
  for (let i = 0; i <= 22; i++) {
    const u = u0 + 0.15 + ((u1 - u0 - 0.3) * i) / 22;
    iso.r.poly([iso.P(u - 0.018, colV, H - 4), iso.P(u + 0.018, colV, H - 4), iso.P(u + 0.018, colV, 4), iso.P(u - 0.018, colV, 4)], i % 2 ? COLORS.white : lit(CR, 0.06));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H - 4, H + 3, lighten(CR, 0.06), { ink: false });
  // projecting pedimented pavilions at the ends + centre
  for (const cu of [u0 + 0.5, (u0 + u1) / 2, u1 - 0.5]) {
    iso.r.poly([iso.P(cu - 0.4, colV, H + 3), iso.P(cu + 0.4, colV, H + 3), iso.P(cu, colV, H + 11)], lighten(CR, 0.1));
    iso.r.polyline([iso.P(cu - 0.4, colV, H + 3), iso.P(cu + 0.4, colV, H + 3), iso.P(cu, colV, H + 11), iso.P(cu - 0.4, colV, H + 3)], INK_W * 0.6, INK, true);
  }
  return iso.build();
}

/** SUSSEX PLACE: Nash's unusual Regent's Park terrace (now London Business
 *  School) — a curved white-stucco range distinguished by its pair of pointed
 *  polygonal cupolas/turrets and projecting bow-fronted bays. Low + wide, with
 *  the two distinctive pointed domes. 4×4. */
function sussexPlaceTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 80 });
  void seed;
  const CR = hex('#ece4d0');
  iso.shadow(0.35, 0.7, 3.65, 3.65, 0.2, 0.2);
  iso.quad(0.4, 3.3, 3.6, 3.6, 0, hex('#6f7c48'));
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.9;
  const v1 = 3.3;
  const H = 40;
  iso.box(u0, v0, u1, v1, 0, H, CR);
  for (const [zb, zt] of [[8, 20], [24, 34]] as const) {
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 22, GLASS_DK, lighten(CR, 0.08));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(CR, 0.06), { topC: top(CR, 0.3) });
  // bow-fronted projecting bays
  for (const cu of [u0 + 0.7, u1 - 0.7]) {
    iso.box(cu - 0.3, v1 - 0.02, cu + 0.3, v1 + 0.12, 0, H - 2, lighten(CR, 0.03));
  }
  // the two distinctive pointed polygonal cupolas
  for (const cu of [u0 + 0.7, u1 - 0.7]) {
    iso.box(cu - 0.16, v1 - 0.18, cu + 0.16, v1 + 0.06, H, H + 14, CR);
    const [tx, tyB] = iso.P(cu, v1 - 0.06, H + 14);
    // a sharp pointed (ogee-ish) cap
    iso.r.poly([[tx - 6 * RES, tyB], [tx + 6 * RES, tyB], [tx, tyB - 22 * RES]], shaded(LEAD, 0.04), lit(LEAD, 0.06));
    iso.r.polyline([[tx - 6 * RES, tyB], [tx, tyB - 22 * RES], [tx + 6 * RES, tyB]], INK_W * 0.6, INK);
    iso.r.line([tx, tyB - 22 * RES], [tx, tyB - 27 * RES], 1 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** CHILTERN COURT: the monumental Edwardian-baroque mansion block over Baker
 *  Street station — a tall, richly-modelled red-brick-and-stone pile with a
 *  deep mansard roof, corner domes/cupolas and a heavy cornice. 3×3, tall. */
function chilternCourtTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const BR = hex('#a86a4a');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 72;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  for (const [zb, zt] of [[8, 20], [24, 36], [40, 52], [56, 68]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(BR, 0.12));
  }
  // stone base + cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, PORTLAND, { ink: false });
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 4, lighten(PORTLAND, 0.06), { topC: top(PORTLAND, 0.3) });
  // deep mansard roof
  iso.gable(u0, v0, u1, v1, H + 4, 16, 'u', SLATE, BR);
  // corner cupolas
  for (const [cu, cv] of [[u0 + 0.3, v1], [u1 - 0.3, v1]] as const) {
    iso.box(cu - 0.16, cv - 0.18, cu + 0.16, cv, H + 4, H + 16, PORTLAND, { ink: false });
    const [dx, dyB] = iso.P(cu, cv - 0.09, H + 16);
    const dome: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); dome.push([dx + Math.cos(a) * 5 * RES, dyB - Math.sin(a) * 8 * RES]); }
    iso.r.poly(dome, shaded(LEAD, 0.05), lit(LEAD, 0.06));
    iso.r.polyline(dome, INK_W * 0.6, INK);
    iso.r.line([dx, dyB - 8 * RES], [dx, dyB - 13 * RES], 0.9 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** BROADCASTING HOUSE: the BBC's prow-shaped Portland-stone Art-Deco flagship
 *  on Portland Place — a tall stone block with a curved, ship's-bow front, a
 *  central tower with the clock/Ariel sculpture over the entrance, and clean
 *  Deco vertical lines. 3×3. */
function broadcastingHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 70;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  for (let f = 0; f < 7; f++) {
    const zb = 8 + (f * (H - 14)) / 7;
    const zt = 8 + ((f + 0.6) * (H - 14)) / 7;
    iso.windowsLeft(v1, u0 + 0.07, u1 - 0.07, zb, zt, 16, GLASS_DK, lighten(PORTLAND, 0.1));
    iso.windowsRight(u1, v0 + 0.07, v1 - 0.07, zb, zt, 9, GLASS_DK, lighten(PORTLAND, 0.1));
  }
  // Deco vertical pilaster lines
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.3) iso.r.line(iso.P(u, v1, 8), iso.P(u, v1, H - 4), 1.2 * RES, alpha(STONE_DARK, 0.35));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // the central tower carrying the clock (the prow front faces the corner)
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.3, v1 - 0.22, cu + 0.3, v1 + 0.06, 0, H + 14, lighten(PORTLAND, 0.04));
  const [clx, cly] = iso.P(cu, v1 + 0.06, 56);
  const cr = 4 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, COLORS.white);
  iso.r.polyline(clk, INK_W * 0.6, INK, true);
  // a small finial mast (the Ariel statue hint)
  const [fx, fy] = iso.P(cu, v1 - 0.08, H + 14);
  iso.r.line([fx, fy], [fx, fy - 8 * RES], 1 * RES, COLORS.steel);
  iso.glint([fx, fy - 6 * RES]);
  return iso.build();
}

// ---- Bloomsbury / King's Cross / Camden / Islington -------------------------

/** SENATE HOUSE: Charles Holden's monumental Art-Deco University of London
 *  tower — a towering, stark, stepped white Portland-stone ziggurat-like block,
 *  almost windowless and severe, rising in clean setbacks. Tall + austere.
 *  3×3. */
function senateHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const STN = hex('#e0d8c6');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // broad base block
  iso.box(0.4, 1.4, 2.6, 2.55, 0, 50, STN);
  iso.windowsLeft(2.55, 0.5, 2.5, 12, 44, 18, GLASS_DK, lighten(STN, 0.08));
  iso.box(0.38, 1.38, 2.62, 2.57, 50, 54, lighten(STN, 0.06), { ink: false });
  // the stepped tower rising in setbacks
  const steps = [
    { u0: 0.7, u1: 2.3, v0: 1.5, v1: 2.3, z0: 50, H: 110 },
    { u0: 0.85, u1: 2.15, v0: 1.6, v1: 2.2, z0: 110, H: 150 },
    { u0: 1.0, u1: 2.0, v0: 1.7, v1: 2.1, z0: 150, H: 178 },
  ];
  for (const s of steps) {
    iso.box(s.u0, s.v0, s.u1, s.v1, s.z0, s.H, STN);
    // sparse, narrow vertical windows (the austere Holden rhythm)
    iso.windowsLeft(s.v1, s.u0 + 0.08, s.u1 - 0.08, s.z0 + 6, s.H - 6, 8, GLASS_DK, lighten(STN, 0.06));
    iso.box(s.u0 - 0.02, s.v0 - 0.02, s.u1 + 0.02, s.v1 + 0.02, s.H, s.H + 3, lighten(STN, 0.08), { ink: false });
  }
  iso.gleam(iso.P(2.0, 1.7, 178), iso.P(2.0, 2.1, 178));
  return iso.build();
}

/** FRANCIS CRICK INSTITUTE: the vast biomedical lab by St Pancras — a huge,
 *  bulky modern block under a great curved, vaulted glazed roof (its
 *  distinctive double-barrel aluminium-and-glass canopy), with terracotta-and-
 *  glass walls. Big + broad with the swooping roof. 4×4. */
function francisCrickTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 120 });
  void seed;
  const WALL = mix(hex('#b08a6a'), STEEL_GLASS, 0.4);
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.4;
  const v1 = 3.4;
  const H = 70;
  iso.box(u0, v0, u1, v1, 0, H, WALL);
  for (let f = 0; f < 8; f++) {
    const zb = 8 + (f * (H - 14)) / 8;
    const zt = 8 + ((f + 0.6) * (H - 14)) / 8;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 24, STEEL_GLASS, alpha(STEEL_GLASS_LIT, 0.45));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(WALL, 0.06), { ink: false });
  // the great curved double-barrel glazed roof canopy
  for (const cu of [(u0 + u1) / 2 - 0.7, (u0 + u1) / 2 + 0.7]) {
    const [sx, syB] = iso.P(cu, (v0 + v1) / 2, H + 3);
    const R = 0.62 * (CELL_W / 2);
    const vault: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); vault.push([sx + Math.cos(a) * R, syB - Math.sin(a) * R * 0.62]); }
    iso.r.poly(vault, alpha(hex('#cfe0ec'), 0.85), alpha(hex('#9fb3c4'), 0.7));
    iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
    for (let i = 2; i < 16; i += 2) { const a = Math.PI * (i / 16); iso.r.line([sx + Math.cos(a) * R, syB], [sx + Math.cos(a) * R, syB - Math.sin(a) * R * 0.62], 0.5 * RES, alpha(COLORS.white, 0.5)); }
  }
  return iso.build();
}

/** CENTRAL SAINT MARTINS (the Granary Building, King's Cross): the great
 *  Victorian yellow-stock-brick granary warehouse — a long, tall, severe
 *  rectangular brick block with a strict grid of regularly punched windows and
 *  a flat roofline, fronting the fountained Granary Square. 4×4. */
function centralStMartinsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  const YB = hex('#c8ac72'); // King's Cross yellow stock brick
  iso.shadow(0.35, 0.55, 3.65, 3.65, 0.22, 0.22);
  // the fountained square apron
  iso.quad(0.4, 3.3, 3.6, 3.6, 0, hex('#b8a98c'));
  const u0 = 0.4;
  const u1 = 3.6;
  const v0 = 1.5;
  const v1 = 3.3;
  const H = 64;
  iso.box(u0, v0, u1, v1, 0, H, YB);
  // a strict grid of punched windows (6 storeys)
  for (let f = 0; f < 6; f++) {
    const zb = 8 + (f * (H - 12)) / 6;
    const zt = 8 + ((f + 0.55) * (H - 12)) / 6;
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(YB, 0.1));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, lighten(YB, 0.1));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(YB, 0.08), { topC: top(YB, 0.28) });
  // tall round-arched openings at ground (the granary arches)
  for (let u = u0 + 0.3; u < u1 - 0.2; u += 0.55) {
    archGableLeft(iso, v1, u, u + 0.3, 2, 14, alpha(hex('#2c2418'), 0.85), lighten(YB, 0.06));
  }
  return iso.build();
}

/** BUSINESS DESIGN CENTRE (the Royal Agricultural Hall): the great Victorian
 *  Islington exhibition hall — a long brick frontage fronting an enormous
 *  glazed iron train-shed-like barrel roof spanning the hall behind. 3×3. */
function businessDesignCentreTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const BR = hex('#9c5a40');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // the huge glazed iron barrel roof behind
  const [sx, syB] = iso.P(1.5, 1.0, 0);
  const R = 1.25 * (CELL_W / 2);
  const vault: Pt[] = [];
  for (let i = 0; i <= 22; i++) { const a = Math.PI * (i / 22); vault.push([sx + Math.cos(a) * R, syB - 56 * RES - Math.sin(a) * R * 0.6]); }
  iso.r.poly([...vault, [sx + R, syB - 30 * RES], [sx - R, syB - 30 * RES]], GLASS_SHED, alpha(hex('#7d92ad'), 0.8));
  iso.r.polyline(vault, INK_W * 0.6, alpha(INK, 0.5));
  for (let i = 2; i < 22; i += 3) { const a = Math.PI * (i / 22); iso.r.line([sx + Math.cos(a) * R, syB - 30 * RES], [sx + Math.cos(a) * R, syB - 56 * RES - Math.sin(a) * R * 0.6], 0.6 * RES, alpha(COLORS.white, 0.45)); }
  // the brick frontage
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 2.0;
  const v1 = 2.5;
  const H = 44;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  for (const [zb, zt] of [[8, 20], [24, 38]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 14, GLASS_DK, lighten(BR, 0.12));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(BR, 0.06), { topC: top(BR, 0.28) });
  // a central pedimented entrance
  const cu = (u0 + u1) / 2;
  archGableLeft(iso, v1, cu - 0.18, cu + 0.18, 4, 24, alpha(hex('#241c30'), 0.85), lighten(BR, 0.1));
  return iso.build();
}

// ---- South Bank / Bankside / Southwark --------------------------------------

/** BFI SOUTHBANK: the cinema tucked under Waterloo Bridge — a low, modern
 *  glass-and-concrete pavilion with a long glazed frontage glowing with a film
 *  marquee, sheltered beneath the sweeping concrete bridge deck. Low + wide.
 *  3×3. */
function bfiSouthbankTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 60 });
  void seed;
  const CON = hex('#b0a99c');
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.7;
  const v1 = 2.5;
  const H = 30;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  // long glazed frontage, glowing
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 6, 24, 1, alpha(hex('#3a4a66'), 0.85), undefined);
  // a bright marquee band (the cinema sign)
  iso.r.poly([iso.P(u0 + 0.3, v1, 25), iso.P(u1 - 0.3, v1, 25), iso.P(u1 - 0.3, v1, 30), iso.P(u0 + 0.3, v1, 30)], alpha(hex('#e0a040'), 0.9));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(CON, 0.06), { ink: false });
  // the sweeping concrete bridge deck overhead (a thick slab on a pier)
  const [bx0] = iso.P(0.3, 1.2, 0);
  iso.r.poly([iso.P(0.2, 0.9, 52), iso.P(2.7, 0.9, 52), iso.P(2.7, 1.25, 46), iso.P(0.2, 1.25, 46)], shaded(CON, 0.12));
  iso.r.poly([iso.P(0.2, 0.9, 52), iso.P(2.7, 0.9, 52), iso.P(2.7, 0.9, 58), iso.P(0.2, 0.9, 58)], lit(CON, 0.06));
  iso.r.polyline([iso.P(0.2, 0.9, 58), iso.P(2.7, 0.9, 58)], INK_W * 0.6, alpha(INK, 0.5));
  void bx0;
  // a bridge pier
  iso.box(1.4, 1.05, 1.7, 1.35, 0, 46, CON, { ink: false });
  return iso.build();
}

/** IBM BUILDING (South Bank): Denys Lasdun's elegant 1980s offices next to the
 *  National Theatre — horizontal layered concrete terraces and strong banded
 *  glazing, in the same board-marked grey concrete idiom but lower and more
 *  regular. 3×3. */
function ibmBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const CON = hex('#b3aea0');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 50;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  // strong layered horizontal terraces with banded glazing + deep shadow lines
  for (let f = 0; f < 5; f++) {
    const zb = 6 + (f * (H - 10)) / 5;
    const zt = 6 + ((f + 0.55) * (H - 10)) / 5;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 1, alpha(hex('#2c3550'), 0.7), undefined);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 1, alpha(hex('#2c3550'), 0.7), undefined);
    // the projecting terrace lip casting a shadow
    const lz = 6 + ((f + 0.9) * (H - 10)) / 5;
    iso.r.line(iso.P(u0, v1, lz), iso.P(u1, v1, lz), 1.6 * RES, shaded(CON, 0.18));
  }
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 3, lighten(CON, 0.06), { ink: false });
  return iso.build();
}

/** SEA CONTAINERS HOUSE: the big 1970s Bankside riverside block (the gilded
 *  hotel/office) — a long, tall slab with a strongly gridded facade, a
 *  distinctive gold-toned glazed crown band and the giant ship's-prow motif at
 *  the river corner. 3×3. */
function seaContainersTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const STN = hex('#c4b89c');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 78;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  for (let f = 0; f < 9; f++) {
    const zb = 8 + (f * (H - 20)) / 9;
    const zt = 8 + ((f + 0.6) * (H - 20)) / 9;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 18, GLASS_DK, lighten(STN, 0.1));
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 10, GLASS_DK, lighten(STN, 0.1));
  }
  // the gold-toned glazed crown band at the top
  iso.r.poly([iso.P(u0, v1, H - 10), iso.P(u1, v1, H - 10), iso.P(u1, v1, H - 2), iso.P(u0, v1, H - 2)], alpha(hex('#d4a850'), 0.9));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(hex('#d4a850'), 0.1), { ink: false, topC: alpha(hex('#e0c070'), 0.9) });
  iso.gleam(iso.P(u1, v0, H), iso.P(u1, v1, H));
  return iso.build();
}

/** HAY'S GALLERIA: the great Victorian Southwark wharf arcade — a long brick
 *  warehouse frontage on the river roofed by a soaring barrel-vaulted glass-
 *  and-iron arcade (the converted dock), with the riverside facade facing the
 *  Pool of London. 3×3. */
function haysGalleriaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const BR = hex('#a06a4e');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // the soaring glazed arcade vault down the middle (front-to-back)
  const su0 = 0.9;
  const su1 = 2.1;
  const vBack = 0.6;
  const vFront = 2.5;
  const wallZ = 22;
  const Hs = 70;
  const NB = 14;
  const zAt = (t: number) => wallZ + Math.sin(t * Math.PI) * (Hs - wallZ);
  const uAt = (t: number) => su0 + (su1 - su0) * t;
  iso.box(su0, vBack, su0 + 0.06, vFront, 0, wallZ, BR, { ink: false });
  iso.box(su1 - 0.06, vBack, su1, vFront, 0, wallZ, BR, { ink: false });
  for (let i = 0; i < NB; i++) {
    const t0 = i / NB;
    const t1 = (i + 1) / NB;
    const col = t0 > 0.5 ? alpha(hex('#cfe0ec'), 0.9) : GLASS_SHED;
    iso.r.poly([iso.P(uAt(t0), vBack, zAt(t0)), iso.P(uAt(t1), vBack, zAt(t1)), iso.P(uAt(t1), vFront, zAt(t1)), iso.P(uAt(t0), vFront, zAt(t0))], col, alpha(hex('#8fa6b4'), 0.55));
  }
  const gable: Pt[] = [];
  for (let i = 0; i <= NB; i++) gable.push(iso.P(uAt(i / NB), vFront, zAt(i / NB)));
  gable.push(iso.P(su1, vFront, 0), iso.P(su0, vFront, 0));
  iso.r.poly(gable, alpha(hex('#b9cee0'), 0.92), alpha(hex('#7d92ad'), 0.7));
  iso.r.polyline(gable.slice(0, NB + 1), INK_W * 0.6, alpha(INK, 0.6));
  // brick warehouse wings either side
  iso.box(0.4, 1.4, su0, 2.5, 0, 44, BR);
  iso.box(su1, 1.4, 2.6, 2.5, 0, 44, BR);
  for (const [wu0, wu1] of [[0.4, su0], [su1, 2.6]] as const) {
    iso.windowsLeft(2.5, wu0 + 0.06, wu1 - 0.06, 10, 38, 6, GLASS_DK, lighten(BR, 0.12));
  }
  return iso.build();
}

/** HMS BELFAST: the WWII light-cruiser museum ship moored off Tooley Street —
 *  a long grey warship hull low on the water, bristling with gun turrets, the
 *  bridge superstructure, twin funnels, lattice masts and radar. A long 4×1
 *  hugging the south bank. */
function hmsBelfastTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 1, { swAnchor: true, headroom: 90 });
  void seed;
  const HULL = hex('#5d6b78'); // battleship grey
  const HULL_L = hex('#74828f');
  const DECK = hex('#7a6a52');
  iso.shadow(0.2, 0.3, 3.8, 0.8, 0.3, 0.18);
  // the long hull (low box along u)
  const v0 = 0.25;
  const v1 = 0.7;
  iso.box(0.2, v0, 3.8, v1, 0, 16, HULL, { rightC: HULL_L });
  // tapered bow (sharpen the +u end)
  iso.r.poly([iso.P(3.8, v0, 0), iso.P(3.95, (v0 + v1) / 2, 0), iso.P(3.8, v1, 0), iso.P(3.8, v1, 16), iso.P(3.8, v0, 16)], HULL_L);
  // deck top
  iso.quad(0.2, v0, 3.8, v1, 16, DECK);
  iso.r.polyline([iso.P(0.2, v0, 16), iso.P(3.8, v0, 16), iso.P(3.95, (v0 + v1) / 2, 16), iso.P(3.8, v1, 16), iso.P(0.2, v1, 16)], INK_W * 0.7, INK, true);
  // gun turrets fore + aft (low cylinders with barrels)
  for (const tu of [0.9, 3.1]) {
    iso.box(tu - 0.12, (v0 + v1) / 2 - 0.08, tu + 0.12, (v0 + v1) / 2 + 0.08, 16, 24, HULL_L);
    // twin barrels
    const dir = tu < 2 ? 1 : -1;
    const [gx, gy] = iso.P(tu + dir * 0.1, (v0 + v1) / 2, 21);
    iso.r.line([gx, gy], [gx + dir * 14 * RES, gy], 1.2 * RES, HULL);
    iso.r.line([gx, gy + 2 * RES], [gx + dir * 14 * RES, gy + 2 * RES], 1.2 * RES, HULL);
  }
  // the central bridge superstructure (stacked boxes)
  iso.box(1.7, (v0 + v1) / 2 - 0.12, 2.3, (v0 + v1) / 2 + 0.12, 16, 40, HULL_L);
  iso.box(1.85, (v0 + v1) / 2 - 0.09, 2.15, (v0 + v1) / 2 + 0.09, 40, 52, HULL);
  // twin funnels
  for (const fu of [1.6, 2.4]) iso.box(fu - 0.07, (v0 + v1) / 2 - 0.06, fu + 0.07, (v0 + v1) / 2 + 0.06, 16, 34, hex('#4a5560'));
  // two lattice masts with radar
  for (const mu of [1.95, 2.5]) {
    const [mx, my] = iso.P(mu, (v0 + v1) / 2, 52);
    iso.r.line([mx, my], [mx, my - 26 * RES], 1 * RES, COLORS.steel);
    iso.r.line([mx - 5 * RES, my - 18 * RES], [mx + 5 * RES, my - 18 * RES], 0.8 * RES, COLORS.steelDark);
    iso.r.line([mx - 3 * RES, my - 26 * RES], [mx + 3 * RES, my - 26 * RES], 0.8 * RES, COLORS.steelDark);
  }
  return iso.build();
}

// ---- outer: Vauxhall / Wapping / Chelsea ------------------------------------

/** SIS BUILDING (MI6, Vauxhall Cross): Terry Farrell's postmodern ziggurat on
 *  the river — a monumental cream-and-green stepped fortress of stacked
 *  terraces, deep towers either side and bands of bronze/green glazing, the
 *  unmistakable Bond-film silhouette. 3×3. */
function sisBuildingTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const CR = hex('#ddd2b8'); // cream stone
  const GR = alpha(hex('#4a7a6a'), 0.9); // the green glazing
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  // central stepped ziggurat (stacked setback terraces)
  const steps = [
    { u0: 0.5, u1: 2.5, v0: 1.3, v1: 2.55, H: 44 },
    { u0: 0.7, u1: 2.3, v0: 1.5, v1: 2.3, H: 64 },
    { u0: 0.9, u1: 2.1, v0: 1.7, v1: 2.1, H: 80 },
  ];
  for (const s of steps) {
    iso.box(s.u0, s.v0, s.u1, s.v1, 0, s.H, CR);
    // green glazing bands
    iso.windowsLeft(s.v1, s.u0 + 0.08, s.u1 - 0.08, s.H - 14, s.H - 4, 12, GR, lighten(CR, 0.1));
    iso.box(s.u0 - 0.02, s.v0 - 0.02, s.u1 + 0.02, s.v1 + 0.02, s.H, s.H + 3, lighten(CR, 0.08), { ink: false });
  }
  // the two flanking towers
  for (const tu of [0.7, 2.3]) {
    iso.box(tu - 0.22, 1.3, tu + 0.22, 1.8, 0, 92, CR);
    iso.windowsLeft(1.8, tu - 0.16, tu + 0.16, 20, 84, 8, GR, lighten(CR, 0.1));
    iso.box(tu - 0.24, 1.28, tu + 0.24, 1.82, 92, 96, lighten(CR, 0.08), { ink: false });
  }
  return iso.build();
}

/** TOBACCO DOCK: John Rennie's great Georgian Wapping warehouse — a long, low,
 *  brick-arched depot with a forest of regular round-arched openings and a flat
 *  parapet, the cast-iron-and-brick vaulted store. Low + very wide. 3×3. */
function tobaccoDockTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 50 });
  void seed;
  const BR = hex('#9c6448');
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.6;
  const v1 = 2.5;
  const H = 30;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // a forest of round-arched openings
  for (let u = u0 + 0.14; u < u1 - 0.1; u += 0.26) {
    archGableLeft(iso, v1, u, u + 0.18, 4, 22, alpha(hex('#241c18'), 0.85), lighten(BR, 0.08));
  }
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(BR, 0.06), { topC: top(BR, 0.28) });
  // a couple of timber roof lanterns / skylights along the flat roof
  for (const lu of [u0 + 0.6, (u0 + u1) / 2, u1 - 0.6]) {
    iso.box(lu - 0.12, v0 + 0.3, lu + 0.12, v0 + 0.6, H + 4, H + 9, alpha(hex('#bcd0e0'), 0.7), { ink: false });
  }
  return iso.build();
}

/** LOTS ROAD POWER STATION: the great Chelsea riverside power station that
 *  drove the Tube — a vast dark-brick hall with TWO tall square brick chimneys
 *  (originally four), regular tall industrial windows and a massive turbine-hall
 *  silhouette. Industrial, with its twin chimneys. 3×3. */
function lotsRoadTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 160 });
  void seed;
  const BR = hex('#8a6450'); // soot brown brick
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.24, 0.22);
  const u0 = 0.5;
  const u1 = 2.5;
  const v0 = 1.3;
  const v1 = 2.5;
  const H = 64;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // tall industrial slot windows
  for (let u = u0 + 0.18; u < u1 - 0.1; u += 0.26) {
    iso.r.poly([iso.P(u, v1, 12), iso.P(u + 0.14, v1, 12), iso.P(u + 0.14, v1, H - 8), iso.P(u, v1, H - 8)], alpha(hex('#2c3550'), 0.75));
  }
  // brick pilaster ribs
  for (let u = u0 + 0.1; u < u1 - 0.02; u += 0.26) iso.r.line(iso.P(u + 0.16, v1, 4), iso.P(u + 0.16, v1, H - 2), 1.4 * RES, alpha(darken(BR, 0.18), 0.5));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(BR, 0.06), { ink: false });
  // TWO tall square brick chimneys
  for (const [cu, cv] of [[u0 + 0.55, v0 + 0.4], [u1 - 0.55, v0 + 0.6]] as const) {
    iso.box(cu - 0.16, cv - 0.16, cu + 0.16, cv + 0.16, 0, 168, BR);
    for (let z = H; z < 164; z += 14) iso.r.line(iso.P(cu - 0.14, cv + 0.16, z), iso.P(cu + 0.14, cv + 0.16, z), 0.8 * RES, alpha(darken(BR, 0.16), 0.4));
    iso.box(cu - 0.18, cv - 0.18, cu + 0.18, cv + 0.18, 168, 174, lighten(BR, 0.08), { ink: false });
  }
  return iso.build();
}

// =============================================================================
// ROUND 3 — the long tail (the listed City/West-End blocks, the Whitehall
// grandees relocated to free outer fringe, the council estates + stucco
// terraces, the college, the court, the flower-show marquees and the King's
// Cross goods yard). Each a fresh custom draw + bespoke light.
// =============================================================================

/** THE GREAT EASTERN / ANDAZ HOTEL, Liverpool Street: E. M. Barry's grand
 *  Victorian railway hotel — a long red-brick-and-Portland frontage with
 *  banded stone courses, three storeys of tall windows under a steep French
 *  mansard with iron cresting and a corner cupola. 3×3, broad, hotel-tall. */
function andazHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const BR = hex('#9c5944');
  iso.shadow(0.35, 0.55, 2.65, 2.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.2;
  const v1 = 2.55;
  const H = 70;
  iso.box(u0, v0, u1, v1, 0, H, BR);
  // banded Portland string courses + four storeys of windows
  for (const [zb, zt] of [[8, 20], [24, 36], [40, 52], [56, 66]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, PORTLAND);
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, PORTLAND);
  }
  for (const z of [22, 38, 54]) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.3 * RES, alpha(PORTLAND, 0.6));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, shaded(BR, 0.14), { ink: false });
  // the steep French mansard with dormers + iron cresting
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, PORTLAND, { ink: false });
  iso.gable(u0, v0, u1, v1, H + 4, 22, 'u', SLATE, BR);
  for (let u = u0 + 0.35; u < u1 - 0.2; u += 0.5) {
    iso.box(u - 0.05, v1 - 0.03, u + 0.05, v1, H + 5, H + 14, SLATE, { ink: false });
    iso.r.poly([iso.P(u - 0.05, v1, H + 14), iso.P(u + 0.05, v1, H + 14), iso.P(u, v1, H + 19)], lighten(SLATE, 0.12));
  }
  // a corner cupola (the hotel's landmark turret on the Bishopsgate corner)
  const cu = u1 - 0.45;
  iso.box(cu - 0.2, v1 - 0.2, cu + 0.2, v1 + 0.02, H + 4, H + 30, lighten(BR, 0.04));
  const [dcx, dcy] = iso.P(cu, v1 - 0.09, H + 30);
  const dR = 5.6 * RES;
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); dome.push([dcx + Math.cos(a) * dR, dcy - Math.sin(a) * dR * 1.15]); }
  iso.r.poly(dome, shaded(LEAD, 0.04), lit(LEAD, 0.06));
  iso.r.polyline(dome, INK_W * 0.6, alpha(INK, 0.6));
  iso.r.line([dcx, dcy - dR * 1.15], [dcx, dcy - dR * 1.15 - 8 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** OLD WAR OFFICE (now Raffles), Whitehall: William Young's Edwardian-Baroque
 *  trapezoidal pile — a deep rusticated Portland-stone block crowned by FOUR
 *  domed corner cupolas, a heavy balustraded cornice and rows of pedimented
 *  windows. The four little green-copper domes are its signature. 3×3. */
function oldWarOfficeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  iso.shadow(0.35, 0.55, 2.65, 2.65, 0.22, 0.22);
  const u0 = 0.35;
  const u1 = 2.65;
  const v0 = 1.1;
  const v1 = 2.6;
  const H = 66;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  // rusticated base + four storeys of windows with pedimented heads
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 10, shaded(PORTLAND, 0.12), { ink: false });
  for (const [zb, zt] of [[14, 26], [30, 42], [46, 58]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 15, GLASS_DK, lighten(PORTLAND, 0.12));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, lighten(PORTLAND, 0.12));
  }
  // heavy balustraded cornice
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 5, lighten(PORTLAND, 0.1), { topC: top(PORTLAND, 0.3) });
  for (let u = u0 + 0.15; u <= u1 - 0.1; u += 0.32) iso.box(u - 0.03, v1 - 0.04, u + 0.03, v1, H + 5, H + 10, lighten(PORTLAND, 0.06), { ink: false });
  // the FOUR domed corner cupolas (lead-green ogee domes on drums)
  for (const [du, dv] of [[u0 + 0.32, v0 + 0.22], [u1 - 0.32, v0 + 0.22], [u0 + 0.32, v1 - 0.18], [u1 - 0.32, v1 - 0.18]] as const) {
    iso.box(du - 0.16, dv - 0.16, du + 0.16, dv + 0.16, H + 5, H + 22, PORTLAND, { ink: false });
    const [cx, cyB] = iso.P(du, dv, H + 22);
    const r = 4.4 * RES;
    const od: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); const rr = r * (0.6 + 0.4 * Math.sin(a)); od.push([cx + Math.cos(a) * rr, cyB - Math.sin(a) * r * 1.7]); }
    iso.r.poly(od, shaded(hex('#7d9484'), 0.04), lit(hex('#8fa593'), 0.05));
    iso.r.polyline(od, INK_W * 0.55, alpha(INK, 0.6));
    iso.r.line([cx, cyB - r * 1.7], [cx, cyB - r * 1.7 - 5 * RES], 1 * RES, COLORS.glassLit);
  }
  return iso.build();
}

/** BURLINGTON HOUSE (Royal Academy), Piccadilly: a Neo-Palladian palazzo set
 *  behind its forecourt — a rusticated ground floor, a piano-nobile order of
 *  attached columns under a balustrade ringed with statues, a central arched
 *  carriage entrance. Dignified, broad, not very tall. 3×3. */
function burlingtonHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const STN = hex('#ddd0b6');
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  // the forecourt
  iso.quad(0.4, 2.0, 2.6, 2.6, 0, hex('#c9bb9c'));
  const u0 = 0.35;
  const u1 = 2.65;
  const v0 = 0.9;
  const v1 = 2.0;
  const H = 46;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  // rusticated ground + a piano-nobile arcade of attached columns
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 16, shaded(STN, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, 22, 40, 13, GLASS_DK, lighten(STN, 0.12));
  for (let i = 0; i <= 13; i++) { const u = u0 + 0.12 + ((u1 - u0 - 0.24) * i) / 13; iso.r.poly([iso.P(u - 0.02, v1, 40), iso.P(u + 0.02, v1, 40), iso.P(u + 0.02, v1, 18), iso.P(u - 0.02, v1, 18)], i % 2 ? COLORS.white : lit(STN, 0.06)); }
  // balustrade + a row of academy statues on the cornice
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  for (let u = u0 + 0.2; u <= u1 - 0.1; u += 0.36) { const [sx, syB] = iso.P(u, v1, H + 4); iso.r.line([sx, syB], [sx, syB - 7 * RES], 1.5 * RES, lighten(STN, 0.1)); iso.r.poly([[sx - 1.6 * RES, syB - 7 * RES], [sx + 1.6 * RES, syB - 7 * RES], [sx, syB - 11 * RES]], lit(STN, 0.06)); }
  // central arched carriage entrance + a small pediment
  const cu = (u0 + u1) / 2;
  archGableLeft(iso, v1 + 0.001, cu - 0.22, cu + 0.22, 6, 30, alpha(hex('#241c18'), 0.85), lighten(STN, 0.1));
  iso.r.poly([iso.P(cu - 0.4, v1, H), iso.P(cu + 0.4, v1, H), iso.P(cu, v1, H + 10)], lighten(STN, 0.1));
  iso.r.polyline([iso.P(cu - 0.4, v1, H), iso.P(cu + 0.4, v1, H), iso.P(cu, v1, H + 10), iso.P(cu - 0.4, v1, H)], INK_W * 0.7, INK, true);
  return iso.build();
}

/** GOVERNMENT OFFICES GREAT GEORGE STREET (HM Treasury): Henry Tanner's vast
 *  Edwardian-Baroque island block off Parliament Square — a deep rusticated
 *  Portland mass with giant engaged columns, a heavy cornice and a domed
 *  rotunda over the corner entrance. A MONSTER civic block. 4×4. */
function goggsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 90 });
  void seed;
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.35;
  const u1 = 3.65;
  const v0 = 1.0;
  const v1 = 3.5;
  const H = 58;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(PORTLAND, 0.12), { ink: false });
  // four storeys; a giant engaged-column order on the two upper floors
  for (const [zb, zt] of [[16, 26], [30, 42], [46, 56]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, lighten(PORTLAND, 0.1));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 16, GLASS_DK, lighten(PORTLAND, 0.1));
  }
  for (let u = u0 + 0.25; u < u1 - 0.15; u += 0.42) iso.r.poly([iso.P(u - 0.03, v1, 30), iso.P(u + 0.03, v1, 30), iso.P(u + 0.03, v1, 56), iso.P(u - 0.03, v1, 56)], lit(PORTLAND, 0.08));
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 5, lighten(PORTLAND, 0.1), { topC: top(PORTLAND, 0.3) });
  for (let u = u0 + 0.2; u <= u1 - 0.1; u += 0.34) iso.box(u - 0.03, v1 - 0.04, u + 0.03, v1, H + 5, H + 9, lighten(PORTLAND, 0.06), { ink: false });
  // the domed circular court / corner rotunda (its quiet landmark)
  const ru = u1 - 0.7;
  iso.box(ru - 0.28, v1 - 0.28, ru + 0.28, v1 - 0.02, H + 5, H + 18, lighten(PORTLAND, 0.04));
  const [rx, ryB] = iso.P(ru, v1 - 0.15, H + 18);
  const rR = 7 * RES;
  const rd: Pt[] = [];
  for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); rd.push([rx + Math.cos(a) * rR, ryB - Math.sin(a) * rR * 0.9]); }
  iso.r.poly(rd, shaded(LEAD, 0.03), lit(LEAD, 0.06));
  iso.r.polyline(rd, INK_W * 0.6, alpha(INK, 0.6));
  iso.r.line([rx, ryB - rR * 0.9], [rx, ryB - rR * 0.9 - 7 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** FOREIGN, COMMONWEALTH & DEVELOPMENT OFFICE: Gilbert Scott's High-Victorian
 *  Italianate palazzo on King Charles Street — a richly modelled Portland-stone
 *  facade, a tall central tower, paired round-arched windows, columned aedicules
 *  and a deep cornice. The grand old Foreign Office. 4×4, broad + a tower. */
function fcdoTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(4, 4, { swAnchor: true, headroom: 130 });
  void seed;
  const STN = hex('#dccfb3');
  iso.shadow(0.3, 0.5, 3.7, 3.7, 0.22, 0.22);
  const u0 = 0.35;
  const u1 = 3.65;
  const v0 = 1.2;
  const v1 = 3.5;
  const H = 56;
  iso.box(u0, v0, u1, v1, 0, H, STN);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(STN, 0.12), { ink: false });
  // three storeys of paired round-arched windows (Italianate rhythm)
  for (const [zb, zt] of [[10, 22], [26, 38], [42, 52]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 22, GLASS_DK, lighten(STN, 0.12));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 16, GLASS_DK, lighten(STN, 0.12));
  }
  for (const z of [24, 40]) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 1.2 * RES, alpha(STONE_DARK, 0.4));
  iso.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, H + 5, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  // the tall central Italianate tower (the FCO's pavilion tower)
  const cu = (u0 + u1) / 2 - 0.3;
  iso.box(cu - 0.34, v1 - 0.3, cu + 0.34, v1 + 0.02, 0, 104, lighten(STN, 0.03));
  iso.windowsLeft(v1 + 0.02, cu - 0.26, cu + 0.26, 70, 96, 2, alpha(hex('#2c3550'), 0.8), lighten(STN, 0.1));
  iso.box(cu - 0.38, v1 - 0.32, cu + 0.38, v1 + 0.04, 104, 110, lighten(STN, 0.08), { topC: top(STN, 0.3) });
  iso.hip(cu - 0.36, v1 - 0.3, cu + 0.36, v1 + 0.02, 110, 22, LEAD);
  const [tx, ty] = iso.P(cu, v1 - 0.14, 132);
  iso.r.line([tx, ty], [tx, ty - 8 * RES], 1.2 * RES, COLORS.glassLit);
  // a corner pavilion roof so the long block isn't a flat slab
  iso.box(u1 - 0.5, v1 - 0.04, u1 - 0.04, v1 + 0.02, H + 5, H + 20, lighten(STN, 0.04), { ink: false });
  iso.hip(u1 - 0.52, v1 - 0.06, u1 - 0.02, v1 + 0.02, H + 20, 12, SLATE);
  return iso.build();
}

/** WHITEHALL COURT: the unmistakable French-Renaissance riverside skyline by
 *  the Embankment — a tall mansion block whose roofline ERUPTS into a cluster
 *  of pointed turrets, conical-capped towers, spirelets and chimneys (Archer &
 *  Green / Waterhouse). The fairytale silhouette is the whole point. 3×3, TALL. */
function whitehallCourtTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 170 });
  void seed;
  const STN = hex('#d8c7a8');
  iso.shadow(0.35, 0.55, 2.65, 2.65, 0.22, 0.22);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.2;
  const v1 = 2.55;
  const H = 96; // a tall block
  iso.box(u0, v0, u1, v1, 0, H, STN);
  for (const [zb, zt] of [[10, 22], [26, 38], [42, 54], [58, 70], [74, 86]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 16, GLASS_DK, lighten(STN, 0.12));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 9, GLASS_DK, lighten(STN, 0.12));
  }
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, shaded(STN, 0.14), { ink: false });
  // a steep mansard the turrets rise out of (kept lower so the towers dominate)
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 3, lighten(STN, 0.08), { ink: false });
  iso.gable(u0, v0, u1, v1, H + 3, 12, 'u', SLATE, STN);
  // THE TURRET CLUSTER (the whole point of Whitehall Court): tall stone towers
  // with steep CONICAL caps, finials + lit dormers, of varying height across
  // the roof — the unmistakable French-Renaissance pointy skyline. Drawn BIG
  // and bright so it reads as a fairytale silhouette, not roof clutter.
  const SLATE_L = lighten(SLATE, 0.18);
  const turrets: Array<[number, number, number, number]> = [
    [u0 + 0.5, v1 - 0.3, 0.34, 70], // front-left pair
    [u1 - 0.5, v1 - 0.3, 0.34, 78], // front-right (tallest of the pair)
    [(u0 + u1) / 2, v0 + 0.55, 0.4, 96], // the dominant central tower
    [u0 + 0.55, v0 + 0.5, 0.26, 56], // back-left
    [u1 - 0.55, v0 + 0.5, 0.26, 60], // back-right
  ];
  for (const [tu, tv, tw, th] of turrets) {
    const shaftH = H + th * 0.5;
    // the stone tower shaft (lit faces, a couple of windows so it reads stone)
    iso.box(tu - tw / 2, tv - tw / 2, tu + tw / 2, tv + tw / 2, H - 6, shaftH, lighten(STN, 0.04));
    iso.windowsLeft(tv + tw / 2, tu - tw / 2 + 0.04, tu + tw / 2 - 0.04, shaftH - 18, shaftH - 6, 2, alpha(hex('#2c3550'), 0.8), lighten(STN, 0.1));
    // a small banded stone cornice under the cap
    iso.box(tu - tw / 2 - 0.02, tv - tw / 2 - 0.02, tu + tw / 2 + 0.02, tv + tw / 2 + 0.02, shaftH, shaftH + 3, lighten(STN, 0.1), { ink: false });
    // the steep conical cap (lit right face, shaded left, bright apex)
    const [cx, cyB] = iso.P(tu, tv, shaftH + 3);
    const coneR = tw * (CELL_W / 2) * 0.62;
    const coneTip = cyB - th * 0.85 * RES;
    iso.r.poly([[cx - coneR, cyB], [cx, cyB - 3 * RES], [cx, coneTip]], shaded(SLATE, 0.04)); // left face
    iso.r.poly([[cx, cyB - 3 * RES], [cx + coneR, cyB], [cx, coneTip]], lit(SLATE_L, 0.06)); // right (sunny) face
    iso.r.polyline([[cx - coneR, cyB], [cx, coneTip], [cx + coneR, cyB]], INK_W * 0.6, alpha(INK, 0.7));
    // a slim spike finial with a lit pip
    iso.r.line([cx, coneTip], [cx, coneTip - 9 * RES], 1.2 * RES, lighten(LEAD, 0.2));
    iso.glint([cx, coneTip - 9 * RES], 2 * RES);
  }
  // tall brick chimneystacks threaded among the towers
  for (const [cu, cv] of [[u0 + 0.95, v1 - 0.4], [u1 - 0.95, v1 - 0.4], [(u0 + u1) / 2, v1 - 0.45]] as const) {
    iso.box(cu - 0.06, cv - 0.06, cu + 0.06, cv + 0.06, H, H + 26, BRICK_DK);
    iso.box(cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, H + 26, H + 29, lighten(BRICK_DK, 0.1), { ink: false });
  }
  return iso.build();
}

/** TOWER HOTEL, St Katharine Docks: RHWL's 1970s Brutalist hotel by Tower
 *  Bridge — a long, chunky, stepped/zigzag concrete-and-glass mass with deep
 *  cellular balconies giving a strongly textured, terraced facade. Low-rise,
 *  very wide, blocky. 3×3. */
function towerHotelTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const CON = hex('#b8b0a4'); // pale precast concrete
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.2;
  const v1 = 2.5;
  const H = 52;
  iso.box(u0, v0, u1, v1, 0, H, CON);
  // the deeply cellular balcony grid (the zigzag Brutalist texture): rows of
  // recessed dark window/balcony cells with bold concrete mullions
  for (let f = 0; f < 6; f++) {
    const zb = 8 + f * 7;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zb + 4.5, 22, GLASS_DK, lighten(CON, 0.12));
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zb + 4.5, 12, GLASS_DK, lighten(CON, 0.12));
  }
  // strong vertical mullions every few cells → the chunky terraced rhythm
  for (let u = u0 + 0.16; u < u1 - 0.05; u += 0.24) iso.r.line(iso.P(u, v1, 6), iso.P(u, v1, H - 2), 1.6 * RES, alpha(darken(CON, 0.18), 0.5));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(CON, 0.1), { topC: top(CON, 0.28) });
  // a stepped/zigzag parapet (the hotel's serrated top edge)
  for (let u = u0 + 0.1; u < u1 - 0.1; u += 0.4) iso.box(u, v0 + 0.05, u + 0.2, v1, H + 4, H + 9, CON, { ink: false });
  // a low glazed restaurant pavilion at the river end
  iso.box(u0 + 0.1, v1 - 0.02, u0 + 0.7, v1 + 0.06, 0, H - 10, alpha(hex('#9fb6c8'), 0.85), { ink: false, topC: alpha(hex('#bcd0e0'), 0.85) });
  return iso.build();
}

/** ROYAL MEWS, Buckingham Palace: Nash's quadrangle of royal stables — a long
 *  low Doric range round a courtyard, the centrepiece a pedimented archway
 *  carrying a square clock turret with a small lead cupola. Honey Bath stone,
 *  low + broad with the one little tower. 3×3. */
function royalMewsTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  // the cobbled courtyard
  iso.quad(0.5, 1.8, 2.5, 2.5, 0, hex('#bdb091'));
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 0.9;
  const v1 = 1.8;
  const H = 30; // low stable range
  iso.box(u0, v0, u1, v1, 0, H, BATH);
  // a Doric arcade of stable doors + a string course
  for (let u = u0 + 0.16; u < u1 - 0.08; u += 0.26) archGableLeft(iso, v1, u, u + 0.16, 2, 18, alpha(hex('#3a2c20'), 0.8), lighten(BATH, 0.08));
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 4, lighten(BATH, 0.08), { topC: top(BATH, 0.3) });
  iso.gable(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, H + 4, 8, 'u', SLATE, BATH);
  // the central pedimented archway + the clock turret with a lead cupola
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.36, v1 - 0.04, cu + 0.36, v1 + 0.06, 0, H + 8, lighten(BATH, 0.04));
  archGableLeft(iso, v1 + 0.06, cu - 0.18, cu + 0.18, 4, 30, alpha(hex('#2c2418'), 0.85), lighten(BATH, 0.1));
  iso.r.poly([iso.P(cu - 0.38, v1 + 0.06, H + 8), iso.P(cu + 0.38, v1 + 0.06, H + 8), iso.P(cu, v1 + 0.06, H + 16)], lighten(BATH, 0.1));
  // square clock turret
  iso.box(cu - 0.18, v1 - 0.16, cu + 0.18, v1 + 0.02, H + 16, H + 34, BATH);
  const [clx, cly] = iso.P(cu, v1 + 0.02, H + 26);
  const cr = 3.4 * RES;
  const clk: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; clk.push([clx + Math.cos(a) * cr, cly + Math.sin(a) * cr]); }
  iso.r.poly(clk, COLORS.white); iso.r.polyline(clk, INK_W * 0.5, INK, true);
  iso.r.line([clx, cly], [clx, cly - cr * 0.7], 0.8 * RES, INK);
  // lead ogee cupola + finial
  const [cux, cuyB] = iso.P(cu, v1 - 0.07, H + 34);
  const cuR = 3.6 * RES;
  const cup: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); const rr = cuR * (0.6 + 0.4 * Math.sin(a)); cup.push([cux + Math.cos(a) * rr, cuyB - Math.sin(a) * cuR * 1.5]); }
  iso.r.poly(cup, shaded(LEAD, 0.04), lit(LEAD, 0.06));
  iso.r.polyline(cup, INK_W * 0.5, alpha(INK, 0.6));
  iso.r.line([cux, cuyB - cuR * 1.5], [cux, cuyB - cuR * 1.5 - 6 * RES], 1 * RES, COLORS.glassLit);
  return iso.build();
}

/** OSSULSTON ESTATE, Somers Town: the LCC's monumental 1920s "Viennese"
 *  social-housing perimeter blocks — five-/six-storey buff-brick ranges with
 *  long horizontal balcony bands, regular grids of windows, stair towers and
 *  flat roofs round a courtyard. Modernist-monumental, broad. 3×3. */
function ossulstonEstateTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 90 });
  void seed;
  const BK = hex('#c2aa7e'); // buff London stock
  iso.shadow(0.35, 0.55, 2.65, 2.65, 0.22, 0.22);
  // a stepped perimeter-block pair forming a courtyard
  const blocks = [
    { u0: 0.4, u1: 2.6, v0: 1.7, v1: 2.55, H: 64 }, // front range
    { u0: 0.55, u1: 2.45, v0: 0.9, v1: 1.5, H: 70 }, // rear range, a touch taller
  ];
  for (const b of blocks) {
    iso.box(b.u0, b.v0, b.u1, b.v1, 0, b.H, BK);
    // long horizontal balcony bands every storey (the Viennese signature)
    for (let f = 0; f < 6; f++) {
      const zb = 8 + (f * (b.H - 12)) / 6;
      iso.windowsLeft(b.v1, b.u0 + 0.06, b.u1 - 0.06, zb, zb + 5, 18, GLASS_DK, lighten(BK, 0.1));
      iso.r.line(iso.P(b.u0, b.v1, zb + 6.5), iso.P(b.u1, b.v1, zb + 6.5), 1.5 * RES, alpha(lighten(BK, 0.16), 0.7));
    }
    iso.box(b.u0 - 0.02, b.v0 - 0.02, b.u1 + 0.02, b.v1 + 0.02, b.H, b.H + 3, lighten(BK, 0.1), { ink: false });
  }
  // projecting stair towers breaking the front band
  for (const su of [0.85, 1.5, 2.15]) {
    iso.box(su - 0.12, 2.5, su + 0.12, 2.62, 0, 70, lighten(BK, 0.04));
    for (let z = 12; z < 66; z += 9) iso.r.poly([iso.P(su - 0.08, 2.62, z), iso.P(su + 0.08, 2.62, z), iso.P(su + 0.08, 2.62, z + 5), iso.P(su - 0.08, 2.62, z + 5)], alpha(hex('#2c3550'), 0.7));
    iso.box(su - 0.13, 2.49, su + 0.13, 2.63, 70, 73, lighten(BK, 0.1), { ink: false });
  }
  return iso.build();
}

/** CRESCENT HOUSE, Golden Lane Estate: Chamberlin Powell & Bonn's listed City
 *  housing — an eight-storey board-marked concrete slab on a colonnade, with a
 *  deeply MODELLED facade of projecting concrete balcony frames over ground-
 *  floor shops. Crisp post-war Modernism. 3×3, a tall slab. */
function crescentHouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 110 });
  void seed;
  const CON = hex('#b6ada0');
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.45;
  const u1 = 2.55;
  const v0 = 1.4;
  const v1 = 2.5;
  const H = 84;
  // ground-floor colonnade: lift the slab on pilotis with a shop band behind
  iso.box(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1, 0, 12, alpha(hex('#3a4150'), 0.85), { ink: false });
  for (let u = u0 + 0.1; u < u1 - 0.05; u += 0.34) iso.box(u - 0.04, v1 - 0.03, u + 0.04, v1, 0, 12, CON, { ink: false });
  // the slab
  iso.box(u0, v0, u1, v1, 12, H, CON);
  // the projecting balcony-frame grid (deep concrete egg-crate)
  for (let f = 0; f < 8; f++) {
    const zb = 16 + f * 8.4;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zb + 5.5, 14, GLASS_DK, COLORS.white);
    iso.r.line(iso.P(u0, v1, zb + 7), iso.P(u1, v1, zb + 7), 1.6 * RES, alpha(lighten(CON, 0.16), 0.8));
  }
  for (let u = u0 + 0.15; u < u1 - 0.05; u += 0.3) iso.r.line(iso.P(u, v1, 14), iso.P(u, v1, H - 2), 1.5 * RES, alpha(lighten(CON, 0.12), 0.7));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(CON, 0.1), { topC: top(CON, 0.26) });
  // the little roof-top water tank / lift housing
  iso.box(u0 + 0.6, v0 + 0.3, u0 + 1.0, v0 + 0.7, H + 4, H + 14, shaded(CON, 0.08), { ink: false });
  return iso.build();
}

/** 111-176 CAROLINE GARDENS, Peckham: the Asylum / almshouses — long, low,
 *  symmetrical ranges of yellow-stock single-storey cottages with a central
 *  pedimented CHAPEL (a little classical portico + bellcote) round a garden
 *  quad. Quiet, domestic, the chapel the focal point. 3×3, low + broad. */
function carolineGardensTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const BK = hex('#c9b487');
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  // garden quad
  iso.quad(0.5, 1.9, 2.5, 2.5, 0, hex('#7d8a5e'));
  // the two low almshouse wings flanking the chapel
  for (const wing of [{ u0: 0.4, u1: 1.1 }, { u0: 1.9, u1: 2.6 }]) {
    iso.box(wing.u0, 1.0, wing.u1, 1.9, 0, 22, BK);
    iso.windowsLeft(1.9, wing.u0 + 0.06, wing.u1 - 0.06, 6, 16, 4, GLASS_DK, lighten(BK, 0.1));
    iso.box(wing.u0 - 0.02, 0.98, wing.u1 + 0.02, 1.92, 22, 24, lighten(BK, 0.08), { ink: false });
    iso.gable(wing.u0, 1.0, wing.u1, 1.9, 24, 12, 'v', SLATE, BK);
  }
  // the central chapel: a taller pedimented block with a portico + bellcote
  const cu = 1.5;
  iso.box(cu - 0.42, 1.1, cu + 0.42, 1.95, 0, 34, lighten(BK, 0.03));
  iso.windowsLeft(1.95, cu - 0.32, cu + 0.32, 8, 26, 3, alpha(hex('#2c3550'), 0.8), lighten(BK, 0.1));
  // a little classical portico
  for (let i = 0; i <= 4; i++) { const u = cu - 0.3 + (0.6 * i) / 4; iso.r.poly([iso.P(u - 0.02, 1.95, 22), iso.P(u + 0.02, 1.95, 22), iso.P(u + 0.02, 1.95, 4), iso.P(u - 0.02, 1.95, 4)], i % 2 ? COLORS.white : lit(BK, 0.06)); }
  iso.r.poly([iso.P(cu - 0.42, 1.95, 34), iso.P(cu + 0.42, 1.95, 34), iso.P(cu, 1.95, 44)], lighten(BK, 0.1));
  iso.r.polyline([iso.P(cu - 0.42, 1.95, 34), iso.P(cu + 0.42, 1.95, 34), iso.P(cu, 1.95, 44), iso.P(cu - 0.42, 1.95, 34)], INK_W * 0.7, INK, true);
  // the bellcote on the ridge
  const [bx, byB] = iso.P(cu, 1.5, 44);
  iso.r.poly([[bx - 2.4 * RES, byB], [bx + 2.4 * RES, byB], [bx + 1.6 * RES, byB - 8 * RES], [bx - 1.6 * RES, byB - 8 * RES]], lit(BK, 0.05));
  iso.r.line([bx, byB - 8 * RES], [bx, byB - 14 * RES], 1.2 * RES, COLORS.glassLit);
  return iso.build();
}

/** THE LANCASTERS, Bayswater: a long restored white-stucco Victorian terrace
 *  facing Hyde Park — a grand palace-fronted run with a rusticated ground
 *  floor, giant pilasters, ornate window pediments, a balustraded parapet and
 *  a continuous cast-iron balcony. Cream stucco, broad + stately. 3×3. */
function lancastersTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const STU = hex('#ece3d0'); // cream stucco
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.3;
  const v1 = 2.55;
  const H = 58;
  iso.box(u0, v0, u1, v1, 0, H, STU);
  // rusticated ground floor (scored lines)
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 14, shaded(STU, 0.1), { ink: false });
  for (const z of [5, 10]) iso.r.line(iso.P(u0, v1, z), iso.P(u1, v1, z), 0.8 * RES, alpha(STONE_DARK, 0.35));
  // four storeys of pedimented windows
  for (const [zb, zt] of [[18, 30], [34, 44], [48, 56]] as const) {
    iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 14, GLASS_DK, lighten(STU, 0.1));
    iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, zb, zt, 8, GLASS_DK, lighten(STU, 0.1));
  }
  // giant pilaster order
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.4) iso.r.line(iso.P(u, v1, 16), iso.P(u, v1, H - 2), 1.8 * RES, alpha(lighten(STU, 0.14), 0.6));
  // the continuous first-floor cast-iron balcony
  iso.r.line(iso.P(u0, v1, 31), iso.P(u1, v1, 31), 1.4 * RES, alpha(hex('#4a4a52'), 0.7));
  for (let u = u0 + 0.1; u < u1; u += 0.12) iso.r.line(iso.P(u, v1, 27), iso.P(u, v1, 31), 0.6 * RES, alpha(hex('#4a4a52'), 0.6));
  // balustraded parapet
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STU, 0.1), { topC: top(STU, 0.3) });
  for (let u = u0 + 0.12; u <= u1 - 0.08; u += 0.16) iso.r.line(iso.P(u, v1, H + 4), iso.P(u, v1, H + 8), 0.7 * RES, lighten(STU, 0.08));
  return iso.build();
}

/** ALBION RIVERSIDE, Battersea: Foster & Partners' sinuous riverside apartment
 *  building — a great CURVED glass-and-steel block whose facade bows outward,
 *  with strong horizontal balcony decks, a sweeping convex roofline and a
 *  glazed undercroft. Sleek, modern, the bowed silhouette its signature. 3×3. */
function albionRiversideTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 100 });
  void seed;
  const ST = hex('#aebcc7'); // pale steel/glass
  iso.shadow(0.4, 0.55, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.45;
  const u1 = 2.55;
  const vBack = 1.0; // the straight back wall
  const H = 74;
  const NB = 16;
  // the front (river) edge bows OUT toward the viewer at mid-span
  const bow = (t: number): number => 1.55 + Math.sin(t * Math.PI) * 0.7;
  const uAt = (t: number): number => u0 + (u1 - u0) * t;
  // 1) SOLID BODY: fill the footprint from the straight back wall to the bowed
  //    front as opaque top quads, so the mass reads solid (not a thin screen)
  for (let i = 0; i < NB; i++) {
    const t0 = i / NB; const t1 = (i + 1) / NB;
    iso.r.poly([iso.P(uAt(t0), vBack, H), iso.P(uAt(t1), vBack, H), iso.P(uAt(t1), bow(t1), H), iso.P(uAt(t0), bow(t0), H)], top(ST, 0.22));
  }
  // 2) the back + right walls (opaque, shaded) to ground the block
  iso.r.poly([iso.P(u0, vBack, H), iso.P(u1, vBack, H), iso.P(u1, vBack, 0), iso.P(u0, vBack, 0)], shaded(ST, 0.2));
  // 3) the curved FRONT facade as opaque lit/shaded quads down to the ground
  for (let i = 0; i < NB; i++) {
    const t0 = i / NB; const t1 = (i + 1) / NB;
    const flankLit = (t0 + t1) / 2 > 0.5; // east-facing half catches the sun
    iso.r.poly([iso.P(uAt(t0), bow(t0), H), iso.P(uAt(t1), bow(t1), H), iso.P(uAt(t1), bow(t1), 0), iso.P(uAt(t0), bow(t0), 0)], flankLit ? lit(ST, 0.08) : shaded(ST, 0.14));
  }
  // 4) strong horizontal balcony decks + glazing bands following the curve
  for (let f = 1; f <= 8; f++) {
    const z = 4 + f * 8;
    const deck: Pt[] = [];
    const g: Pt[] = [];
    for (let i = 0; i <= NB; i++) { const t = i / NB; deck.push(iso.P(uAt(t), bow(t) + 0.015, z)); g.push(iso.P(uAt(t), bow(t) + 0.01, z - 3.5)); }
    iso.r.polyline(g, 3.6 * RES, alpha(hex('#2c3a4a'), 0.7)); // dark glazing band
    iso.r.polyline(deck, 2.2 * RES, alpha(COLORS.white, 0.92)); // white balcony slab edge
  }
  // 5) the convex roofline ink + a thin lit cap
  const roof: Pt[] = [];
  for (let i = 0; i <= NB; i++) { const t = i / NB; roof.push(iso.P(uAt(t), bow(t), H)); }
  iso.r.polyline(roof, INK_W * 0.85, INK);
  iso.gleam(iso.P(uAt(0.62), bow(0.62), H), iso.P(uAt(0.92), bow(0.92), H));
  // 6) the glazed ground-floor undercroft set back under the bow
  iso.box(u0 + 0.15, 1.55, u1 - 0.15, 1.65, 0, 9, alpha(hex('#9fb6c8'), 0.85), { ink: false });
  return iso.build();
}

/** CITY OF WESTMINSTER COLLEGE, Paddington Green: Schmidt Hammer Lassen's
 *  award-winning 2011 campus — a crisp angular glass-and-white-panel block with
 *  a dramatic faceted/sloping facade, deep coloured window reveals and a tilted
 *  roofline. Bright, contemporary, sculptural. 3×3. */
function westminsterCollegeTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const PAN = hex('#e6e7ea'); // white cladding panel
  iso.shadow(0.4, 0.6, 2.6, 2.6, 0.22, 0.22);
  const u0 = 0.45;
  const u1 = 2.55;
  const v0 = 1.3;
  const v1 = 2.5;
  const H = 58;
  iso.box(u0, v0, u1, v1, 0, H, PAN);
  // a curtain-wall grid with deep COLOURED reveals (the college's bright
  // accent panels — a scatter of warm + cool inset squares among the glazing)
  const accents = [COLORS.glassLit, hex('#e08a3c'), hex('#3a8fb0'), hex('#cf6f5a'), GLASS_DK, GLASS_DK];
  for (let f = 0; f < 6; f++) {
    const zb = 6 + f * 8.4;
    const du = (u1 - u0 - 0.16) / 12;
    for (let i = 0; i < 12; i++) {
      const a = u0 + 0.08 + du * i + du * 0.18;
      const b = u0 + 0.08 + du * (i + 1) - du * 0.18;
      const col = accents[(i + f) % accents.length] ?? GLASS_DK;
      iso.r.poly([iso.P(a, v1, zb + 5.5), iso.P(b, v1, zb + 5.5), iso.P(b, v1, zb), iso.P(a, v1, zb)], alpha(col, 0.9));
    }
  }
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 8, H - 6, 16, GLASS_DK, COLORS.white);
  // a tilted faceted roofline: shave the top with a sloping prism
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 3, lighten(PAN, 0.06), { ink: false });
  iso.r.poly([iso.P(u0, v1, H + 3), iso.P(u1, v1, H + 3), iso.P(u1, v1, H + 16), iso.P(u0, v1, H + 8)], lit(PAN, 0.04));
  iso.r.polyline([iso.P(u0, v1, H + 8), iso.P(u1, v1, H + 16)], INK_W * 0.7, INK);
  // a sharp glazed entrance prism at the corner
  iso.box(u0 + 0.05, v1 - 0.02, u0 + 0.55, v1 + 0.08, 0, 22, alpha(hex('#bcd0e0'), 0.85), { ink: false, topC: alpha(hex('#d6e4ee'), 0.9) });
  return iso.build();
}

/** INNER LONDON CROWN COURT (the Sessions House), Newington: a dignified
 *  Edwardian Portland-stone courthouse — a symmetrical block with a giant
 *  Ionic portico of engaged columns under a pediment carrying the royal arms,
 *  a balustraded parapet and a low central dome/lantern. Civic, broad. 3×3. */
function innerLondonCourtTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.2;
  const v1 = 2.45;
  const H = 44;
  iso.box(u0, v0, u1, v1, 0, H, PORTLAND);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 8, shaded(PORTLAND, 0.12), { ink: false });
  iso.windowsLeft(v1, u0 + 0.1, u1 - 0.1, 14, 36, 11, GLASS_DK, lighten(PORTLAND, 0.12));
  iso.windowsRight(u1, v0 + 0.1, v1 - 0.1, 14, 36, 7, GLASS_DK, lighten(PORTLAND, 0.12));
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(PORTLAND, 0.08), { topC: top(PORTLAND, 0.3) });
  // the giant Ionic portico across the centre
  const cu = (u0 + u1) / 2;
  iso.box(cu - 0.6, v1 - 0.02, cu + 0.6, v1 + 0.04, 0, 4, PORTLAND, { ink: false });
  for (let i = 0; i <= 8; i++) { const u = cu - 0.55 + (1.1 * i) / 8; iso.r.poly([iso.P(u - 0.025, v1 + 0.04, H - 2), iso.P(u + 0.025, v1 + 0.04, H - 2), iso.P(u + 0.025, v1 + 0.04, 4), iso.P(u - 0.025, v1 + 0.04, 4)], i % 2 ? COLORS.white : lit(PORTLAND, 0.07)); }
  iso.box(cu - 0.62, v1, cu + 0.62, v1 + 0.06, H - 2, H + 4, lighten(PORTLAND, 0.06), { ink: false });
  iso.r.poly([iso.P(cu - 0.66, v1 + 0.06, H + 4), iso.P(cu + 0.66, v1 + 0.06, H + 4), iso.P(cu, v1 + 0.06, H + 16)], lighten(PORTLAND, 0.1));
  iso.r.polyline([iso.P(cu - 0.66, v1 + 0.06, H + 4), iso.P(cu + 0.66, v1 + 0.06, H + 4), iso.P(cu, v1 + 0.06, H + 16), iso.P(cu - 0.66, v1 + 0.06, H + 4)], INK_W * 0.7, INK, true);
  // a low central lead dome/lantern behind the pediment
  const [dx, dyB] = iso.P(cu, v0 + 0.5, H + 4);
  const dR = 5 * RES;
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); dome.push([dx + Math.cos(a) * dR, dyB - Math.sin(a) * dR * 0.85]); }
  iso.r.poly(dome, shaded(LEAD, 0.04), lit(LEAD, 0.06));
  iso.r.polyline(dome, INK_W * 0.55, alpha(INK, 0.6));
  iso.r.line([dx, dyB - dR * 0.85], [dx, dyB - dR * 0.85 - 6 * RES], 1 * RES, COLORS.glassLit);
  return iso.build();
}

/** 2-54 CRANLEY GARDENS, South Kensington: a long Italianate stuccoed terrace
 *  of grand five-storey town houses — cream stucco, a rusticated ground floor,
 *  porches on paired columns, bracketed window cornices and a continuous
 *  parapet, the whole run reading as one palace front. Broad, residential. 3×3. */
function cranleyGardensTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 80 });
  void seed;
  const STU = hex('#e4dcc8');
  iso.shadow(0.35, 0.6, 2.65, 2.65, 0.2, 0.2);
  const u0 = 0.4;
  const u1 = 2.6;
  const v0 = 1.3;
  const v1 = 2.55;
  const H = 60;
  iso.box(u0, v0, u1, v1, 0, H, STU);
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 12, shaded(STU, 0.1), { ink: false });
  // the repeating house bays: porch columns at ground, four window storeys
  for (const [zb, zt] of [[16, 28], [32, 42], [46, 54]] as const) iso.windowsLeft(v1, u0 + 0.08, u1 - 0.08, zb, zt, 12, GLASS_DK, lighten(STU, 0.1));
  iso.windowsRight(u1, v0 + 0.08, v1 - 0.08, 16, 52, 7, GLASS_DK, lighten(STU, 0.1));
  // ground-floor porches: little column pairs per house
  for (let u = u0 + 0.18; u < u1 - 0.1; u += 0.36) {
    iso.r.line(iso.P(u, v1, 0), iso.P(u, v1, 12), 1.2 * RES, lighten(STU, 0.1));
    iso.r.line(iso.P(u + 0.1, v1, 0), iso.P(u + 0.1, v1, 12), 1.2 * RES, lighten(STU, 0.1));
    iso.r.line(iso.P(u - 0.02, v1, 12), iso.P(u + 0.12, v1, 12), 1.4 * RES, alpha(STONE_DARK, 0.4));
  }
  // continuous parapet + chimney stacks
  iso.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, H + 4, lighten(STU, 0.1), { topC: top(STU, 0.3) });
  for (const cu of [u0 + 0.5, (u0 + u1) / 2, u1 - 0.5]) iso.box(cu - 0.07, v0 + 0.3, cu + 0.07, v0 + 0.5, H + 4, H + 16, BRICK_DK, { ink: false });
  return iso.build();
}

/** CHELSEA FLOWER SHOW, Royal Hospital grounds: the RHS show in full rig — the
 *  GREAT PAVILION, a huge white marquee with a long ridged canvas roofline and
 *  scalloped eaves, flanked by smaller peaked show tents and banks of greenery,
 *  pennants flying. The white tented silhouette is unmistakable. 3×3, low+wide. */
function chelseaFlowerShowTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const CANVAS = hex('#f0ece1');
  iso.shadow(0.4, 0.7, 2.6, 2.6, 0.2, 0.2);
  // green show-ground
  iso.quad(0.4, 0.7, 2.6, 2.6, 0, hex('#6f8a4e'));
  // THE GREAT PAVILION: a long multi-bay marquee, drawn TALL + bold so the
  // white tented silhouette reads as the hero. Each bay a peaked canvas gable.
  const gu0 = 0.42; const gu1 = 2.58; const gv0 = 1.3; const gv1 = 2.45;
  const wallZ = 34; // taller tent walls
  const peakRise = 30; // bold peaks
  iso.box(gu0, gv0, gu1, gv1, 0, wallZ, CANVAS); // tent walls (inked, reads solid)
  // canvas wall is softly striped (the marquee panels)
  for (let u = gu0 + 0.1; u < gu1; u += 0.16) iso.r.line(iso.P(u, gv1, 2), iso.P(u, gv1, wallZ), 0.7 * RES, alpha(shaded(CANVAS, 0.12), 0.55));
  // a ridge-and-furrow canvas roof: a row of peaked bays running along u
  const bays = 4;
  const vm = (gv0 + gv1) / 2;
  for (let k = 0; k < bays; k++) {
    const bu0 = gu0 + ((gu1 - gu0) * k) / bays;
    const bu1 = gu0 + ((gu1 - gu0) * (k + 1)) / bays;
    const bm = (bu0 + bu1) / 2;
    // two roof slopes meeting at the bay ridge
    iso.r.poly([iso.P(bu0, gv0, wallZ), iso.P(bu1, gv0, wallZ), iso.P(bu1, vm, wallZ + peakRise), iso.P(bu0, vm, wallZ + peakRise)], top(CANVAS, 0.32));
    iso.r.poly([iso.P(bu0, vm, wallZ + peakRise), iso.P(bu1, vm, wallZ + peakRise), iso.P(bu1, gv1, wallZ), iso.P(bu0, gv1, wallZ)], lit(CANVAS, 0.05));
    // scalloped front eave swag
    const [ex, eyB] = iso.P(bm, gv1, wallZ);
    iso.r.poly([[ex - 9 * RES, eyB], [ex + 9 * RES, eyB], [ex + 7 * RES, eyB + 4 * RES], [ex - 7 * RES, eyB + 4 * RES]], shaded(CANVAS, 0.06));
    iso.edge(iso.P(bu0, vm, wallZ + peakRise), iso.P(bu1, vm, wallZ + peakRise));
    iso.r.polyline([iso.P(bu1, gv0, wallZ), iso.P(bu1, vm, wallZ + peakRise), iso.P(bu1, gv1, wallZ)], INK_W * 0.6, alpha(INK, 0.6));
    // a tall pennant flying off each peak
    const [px, pyB] = iso.P(bm, gv0 + 0.08, wallZ + peakRise);
    iso.r.line([px, pyB], [px, pyB - 14 * RES], 1 * RES, COLORS.steel);
    iso.r.poly([[px, pyB - 14 * RES], [px + 7 * RES, pyB - 11.5 * RES], [px, pyB - 9 * RES]], [COLORS.glassHot, hex('#5fae6f'), hex('#3a8fb0'), hex('#e0a23c')][k] ?? COLORS.glassHot);
  }
  // a couple of smaller peaked show tents in front + flower banks
  for (const [tu, tv, tw] of [[gu0 + 0.25, gv1 + 0.4, 0.36], [gu1 - 0.45, gv1 + 0.42, 0.4]] as const) {
    const [tx, tyB] = iso.P(tu, tv, 0);
    const tr = tw * (CELL_W / 2);
    iso.r.poly([[tx - tr, tyB], [tx + tr, tyB], [tx, tyB - 30 * RES]], top(CANVAS, 0.3));
    iso.r.polyline([[tx - tr, tyB], [tx, tyB - 30 * RES], [tx + tr, tyB]], INK_W * 0.55, alpha(INK, 0.55));
    iso.r.line([tx, tyB - 30 * RES], [tx, tyB - 36 * RES], 0.8 * RES, COLORS.glassHot);
  }
  // dots of show-garden colour along the front
  for (let u = gu0; u < gu1; u += 0.16) { const [fx, fyB] = iso.P(u, gv1 + 0.55, 0); iso.r.line([fx, fyB], [fx, fyB - 3 * RES], 2 * RES, [hex('#d4564f'), hex('#e0a23c'), hex('#b06fae'), hex('#5fae6f')][Math.floor(u * 7) % 4] ?? hex('#d4564f')); }
  return iso.build();
}

/** EASTERN COAL DROPS (Coal Drops Yard), King's Cross: Heatherwick's reworking
 *  of the Victorian goods-yard coal sheds — two long, kinked brick viaduct
 *  ranges with cast-iron columns and ridged slate roofs, the two inner eaves
 *  swooping UP and together into the famous "kissing roofs". 3×3, low + long. */
function coalDropsYardTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso(3, 3, { swAnchor: true, headroom: 70 });
  void seed;
  const BK = hex('#9a6a4c'); // yellow-stained London stock / soot brick
  iso.shadow(0.4, 0.65, 2.6, 2.6, 0.2, 0.2);
  // two parallel low brick viaduct ranges along u, with the central yard between
  const u0 = 0.4; const u1 = 2.6; const H = 22;
  const ranges = [
    { v0: 0.85, v1: 1.35 }, // far range
    { v0: 2.05, v1: 2.55 }, // near range
  ];
  for (const r of ranges) {
    iso.box(u0, r.v0, u1, r.v1, 0, H, BK);
    // cast-iron columns + arched openings along the brick range
    for (let u = u0 + 0.12; u < u1 - 0.06; u += 0.24) archGableLeft(iso, r.v1, u, u + 0.14, 2, 14, alpha(hex('#241c18'), 0.85), lighten(BK, 0.08));
    iso.box(u0 - 0.02, r.v0 - 0.02, u1 + 0.02, r.v1 + 0.02, H, H + 2, lighten(BK, 0.08), { ink: false });
  }
  // THE SIGNATURE "KISSING ROOFS": ONE continuous swooping slate vault spanning
  // the whole width — it dips low over each brick range and ARCS UP to a tall
  // shared crest over the central yard, the unmistakable Heatherwick gesture.
  // Drawn as transverse strips (v across the section) extruded along u so the
  // sweep is unambiguous and unoccluded, with a bright glazed crest line.
  const vF = 1.05; // crest of the far slope (over the far range's inner edge)
  const vC = 1.7; // the central crest (the kiss)
  const vN = 2.35; // crest of the near slope
  const zEave = H + 1;
  const zCrest = H + 64; // a tall, dramatic peak that clears low neighbours
  // profile z as a function of v across the section (two concave arcs meeting high)
  const prof = (v: number): number => {
    if (v <= vC) { const t = (v - vF) / (vC - vF); return zEave + (zCrest - zEave) * Math.max(0, t) ** 1.6; }
    const t = (v - vC) / (vN - vC); return zCrest - (zCrest - zEave) * Math.min(1, t) ** 1.6;
  };
  const NS = 18;
  for (let i = 0; i < NS; i++) {
    const a = vF + ((vN - vF) * i) / NS;
    const b = vF + ((vN - vF) * (i + 1)) / NS;
    const za = prof(a); const zb = prof(b);
    // shade by side: far slope (rising) catches top light, near slope (descending) the sun flank
    const col = a < vC ? top(SLATE, 0.24 - (a - vF) * 0.1) : lit(SLATE, 0.06);
    iso.r.poly([iso.P(u0, a, za), iso.P(u1, a, za), iso.P(u1, b, zb), iso.P(u0, b, zb)], col);
  }
  // the bright glazed crest rooflight running the kiss
  iso.r.line(iso.P(u0 + 0.05, vC, zCrest), iso.P(u1 - 0.05, vC, zCrest), 6 * RES, alpha(COLORS.glassLit, 0.3));
  iso.r.line(iso.P(u0 + 0.05, vC, zCrest), iso.P(u1 - 0.05, vC, zCrest), 2.6 * RES, alpha(COLORS.glassLit, 0.9));
  // the swooping curved profile inked on the visible (u1) end gable
  const gable: Pt[] = [];
  for (let i = 0; i <= NS; i++) { const v = vF + ((vN - vF) * i) / NS; gable.push(iso.P(u1, v, prof(v))); }
  gable.push(iso.P(u1, vN, H), iso.P(u1, vF, H));
  iso.r.poly(gable, shaded(BK, 0.06)); // the brick gable end under the swoop
  const rim: Pt[] = [];
  for (let i = 0; i <= NS; i++) { const v = vF + ((vN - vF) * i) / NS; rim.push(iso.P(u1, v, prof(v))); }
  iso.r.polyline(rim, INK_W * 0.7, alpha(INK, 0.8));
  iso.gleam(iso.P(u1, vC, zCrest), iso.P(u1, vC + 0.18, prof(vC + 0.18)));
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

  // ---- W3 ROUND 2: City towers, West-End hotels, colleges, palaces, the
  //      South-Bank/Bankside set, the Regent's-Park terraces + stores --------
  // City of London — the eastern financial cluster
  {
    city: 'london',
    key: '100-bishopsgate',
    match: /100 Bishopsgate/i,
    foot: [3, 3],
    seed: 3201,
    draw: (s) => bishopsgate100Tile(s),
    light: L.towerCrown(232, 0.6),
  },
  {
    city: 'london',
    key: '200-aldersgate',
    match: /200 Aldersgate/i,
    foot: [3, 3],
    seed: 3202,
    draw: (s) => aldersgate200Tile(s),
    light: L.towerCrown(122, 1.2),
  },
  {
    city: 'london',
    key: 'one-new-change',
    match: /One New Change/i,
    foot: [3, 3],
    seed: 3203,
    draw: (s) => oneNewChangeTile(s),
    light: L.facade(58, 1.4),
  },
  {
    city: 'london',
    key: 'the-bank-of-new-york-mellon',
    match: /Bank of New York Mellon|BNY Mellon/i,
    foot: [3, 3],
    seed: 3204,
    draw: (s) => bnyMellonTile(s),
    light: L.towerCrown(196, 0.7),
  },
  {
    city: 'london',
    key: 'london-wall-buildings',
    match: /London Wall Buildings/i,
    foot: [3, 3],
    seed: 3205,
    draw: (s) => londonWallBuildingsTile(s),
    light: L.facade(50, 1.3),
  },
  {
    city: 'london',
    key: 'maughan-library',
    match: /Maughan Library/i,
    foot: [3, 3],
    seed: 3206,
    draw: (s) => maughanLibraryTile(s),
    light: L.facade(84, 1.2),
  },
  {
    city: 'london',
    key: 'holborn-bars',
    match: /Holborn Bars|Prudential/i,
    foot: [3, 3],
    seed: 3207,
    draw: (s) => holbornBarsTile(s),
    light: L.facade(140, 1.2),
  },
  // West End — Strand / Covent Garden / Mayfair / Piccadilly
  {
    city: 'london',
    key: 'savoy-hotel',
    match: /Savoy Hotel|^Savoy$/i,
    foot: [3, 3],
    seed: 3208,
    draw: (s) => savoyHotelTile(s),
    light: L.facade(70, 1.2),
  },
  {
    city: 'london',
    key: 'royal-opera-house',
    match: /Royal Opera House|Covent Garden/i,
    foot: [4, 4],
    seed: 3209,
    draw: (s) => royalOperaTile(s),
    light: L.facade(60, 1.5),
  },
  {
    city: 'london',
    key: 'london-trocadero',
    match: /Trocadero/i,
    foot: [3, 3],
    seed: 3210,
    draw: (s) => trocaderoTile(s),
    light: L.towerCrown(64, 1.3),
  },
  {
    city: 'london',
    key: 'grosvenor-house-hotel',
    match: /Grosvenor House/i,
    foot: [3, 3],
    seed: 3211,
    draw: (s) => grosvenorHouseTile(s),
    light: L.facade(86, 1.2),
  },
  {
    city: 'london',
    key: 'one-hyde-park',
    match: /One Hyde Park/i,
    foot: [3, 3],
    seed: 3212,
    draw: (s) => oneHydeParkTile(s),
    light: L.towerCrown(150, 1.2),
  },
  // St James's / Westminster
  {
    city: 'london',
    key: 'st-james-s-palace',
    match: /St James'?s Palace/i,
    foot: [4, 4],
    seed: 3213,
    draw: (s) => stJamesPalaceTile(s),
    light: L.facade(92, 1.5),
  },
  {
    city: 'london',
    key: 'institute-of-contemporary-arts',
    match: /Institute of Contemporary Arts|\bICA\b/i,
    foot: [3, 3],
    seed: 3214,
    draw: (s) => icaTile(s),
    light: L.facade(40, 1.3),
  },
  {
    city: 'london',
    key: 'ministry-of-defence',
    match: /Ministry of Defence/i,
    foot: [4, 4],
    seed: 3215,
    draw: (s) => modTile(s),
    light: L.facade(64, 1.6),
  },
  {
    city: 'london',
    key: 'ministry-of-justice',
    match: /Ministry of Justice/i,
    foot: [3, 3],
    seed: 3216,
    draw: (s) => mojTile(s),
    light: L.towerCrown(104, 1.1),
  },
  {
    city: 'london',
    key: 'department-for-transport',
    match: /Department for Transport/i,
    foot: [3, 3],
    seed: 3217,
    draw: (s) => dftTile(s),
    light: L.facade(72, 1.2),
  },
  // South Kensington — the Imperial College / museum quarter
  {
    city: 'london',
    key: 'royal-school-of-mines',
    match: /Royal School of Mines/i,
    foot: [3, 3],
    seed: 3218,
    draw: (s) => royalSchoolMinesTile(s),
    light: L.facade(56, 1.2),
  },
  {
    city: 'london',
    key: 'city-and-guilds-building',
    match: /City and Guilds/i,
    foot: [3, 3],
    seed: 3219,
    draw: (s) => cityGuildsTile(s),
    light: L.facade(60, 1.2),
  },
  {
    city: 'london',
    key: 'sherfield-building',
    match: /Sherfield/i,
    foot: [3, 3],
    seed: 3220,
    draw: (s) => sherfieldTile(s),
    light: L.towerCrown(156, 0.7),
  },
  // Kensington / Bayswater
  {
    city: 'london',
    key: 'kensington-palace',
    match: /Kensington Palace/i,
    foot: [3, 3],
    seed: 3221,
    draw: (s) => kensingtonPalaceTile(s),
    light: L.facade(42, 1.3),
  },
  {
    city: 'london',
    key: 'derry-toms',
    match: /Derry (&|and) Toms|Derry ?& ?Toms/i,
    foot: [3, 3],
    seed: 3222,
    draw: (s) => derryTomsTile(s),
    light: L.facade(42, 1.3),
  },
  {
    city: 'london',
    key: 'whiteleys',
    match: /Whiteleys/i,
    foot: [4, 4],
    seed: 3223,
    draw: (s) => whiteleysTile(s),
    light: L.facade(86, 1.5),
  },
  {
    city: 'london',
    key: 'hilton-london-metropole',
    match: /Hilton London Metropole|Metropole/i,
    foot: [4, 4],
    seed: 3224,
    draw: (s) => hiltonMetropoleTile(s),
    light: L.towerCrown(178, 1.0),
  },
  // Marylebone / Regent's Park / Maida Vale
  {
    city: 'london',
    key: 'maida-vale-studios',
    match: /Maida Vale Studios/i,
    foot: [3, 3],
    seed: 3225,
    draw: (s) => maidaValeStudiosTile(s),
    light: L.facade(36, 1.3),
  },
  {
    city: 'london',
    key: 'cornwall-terrace',
    match: /Cornwall Terrace/i,
    foot: [4, 4],
    seed: 3226,
    draw: (s) => cornwallTerraceTile(s),
    light: L.facade(40, 1.6),
  },
  {
    city: 'london',
    key: 'sussex-place',
    match: /Sussex Place/i,
    foot: [4, 4],
    seed: 3227,
    draw: (s) => sussexPlaceTile(s),
    light: L.facade(54, 1.5),
  },
  {
    city: 'london',
    key: 'chiltern-court-baker-street',
    match: /Chiltern Court/i,
    foot: [3, 3],
    seed: 3228,
    draw: (s) => chilternCourtTile(s),
    light: L.facade(72, 1.2),
  },
  {
    city: 'london',
    key: 'broadcasting-house',
    match: /Broadcasting House/i,
    foot: [3, 3],
    seed: 3229,
    draw: (s) => broadcastingHouseTile(s),
    light: L.facade(70, 1.2),
  },
  // Bloomsbury / King's Cross / Camden / Islington
  {
    city: 'london',
    key: 'senate-house',
    match: /Senate House/i,
    foot: [3, 3],
    seed: 3230,
    draw: (s) => senateHouseTile(s),
    light: L.towerCrown(178, 0.8),
  },
  {
    city: 'london',
    key: 'francis-crick-institute',
    match: /Francis Crick/i,
    foot: [4, 4],
    seed: 3231,
    draw: (s) => francisCrickTile(s),
    light: L.facade(70, 1.6),
  },
  {
    city: 'london',
    key: 'central-saint-martins',
    match: /Central Saint Martins|Central St Martins/i,
    foot: [4, 4],
    seed: 3232,
    draw: (s) => centralStMartinsTile(s),
    light: L.facade(64, 1.6),
  },
  {
    city: 'london',
    key: 'business-design-centre',
    match: /Business Design Centre|Agricultural Hall/i,
    foot: [3, 3],
    seed: 3233,
    draw: (s) => businessDesignCentreTile(s),
    light: L.facade(56, 1.3),
  },
  // South Bank / Bankside / Southwark
  {
    city: 'london',
    key: 'bfi-southbank',
    match: /BFI Southbank|National Film Theatre/i,
    foot: [3, 3],
    seed: 3234,
    draw: (s) => bfiSouthbankTile(s),
    light: L.facade(30, 1.3),
  },
  {
    city: 'london',
    key: 'ibm-building',
    match: /IBM Building/i,
    foot: [3, 3],
    seed: 3235,
    draw: (s) => ibmBuildingTile(s),
    light: L.facade(50, 1.3),
  },
  {
    city: 'london',
    key: 'sea-containers-house',
    match: /Sea Containers/i,
    foot: [3, 3],
    seed: 3236,
    draw: (s) => seaContainersTile(s),
    light: L.towerCrown(78, 1.2),
  },
  {
    city: 'london',
    key: 'hay-s-galleria',
    match: /Hay'?s Galleria/i,
    foot: [3, 3],
    seed: 3237,
    draw: (s) => haysGalleriaTile(s),
    light: L.facade(70, 1.2),
  },
  {
    city: 'london',
    key: 'hms-belfast',
    match: /HMS Belfast/i,
    foot: [4, 1],
    seed: 3238,
    draw: (s) => hmsBelfastTile(s),
    light: L.facade(52, 1.5),
  },
  // outer: Vauxhall / Wapping / Chelsea
  {
    city: 'london',
    key: 'sis-building',
    match: /SIS Building|MI6/i,
    foot: [3, 3],
    seed: 3239,
    draw: (s) => sisBuildingTile(s),
    light: L.facade(92, 1.4),
  },
  {
    city: 'london',
    key: 'tobacco-dock',
    match: /Tobacco Dock/i,
    foot: [3, 3],
    seed: 3240,
    draw: (s) => tobaccoDockTile(s),
    light: L.facade(30, 1.4),
  },
  {
    city: 'london',
    key: 'lots-road-power-station',
    match: /Lots Road/i,
    foot: [3, 3],
    seed: 3241,
    draw: (s) => lotsRoadTile(s),
    light: L.facade(168, 1.3),
  },

  // ---- ROUND 3: the long tail (the listed City/West-End blocks, the Whitehall
  //      grandees on the free outer fringe, the council estates + stucco
  //      terraces, the college, the court, the flower-show marquees and the
  //      King's Cross goods yard). 82 → 100. Each a bespoke draw + bespoke light.
  {
    city: 'london',
    key: 'andaz-london-liverpool-street-by-hyatt',
    match: /Andaz|Great Eastern Hotel/i,
    foot: [3, 3],
    seed: 3242,
    draw: (s) => andazHotelTile(s),
    light: L.facade(70, 1.2),
  },
  {
    city: 'london',
    key: 'old-war-office-building',
    match: /Old War Office/i,
    foot: [3, 3],
    seed: 3243,
    draw: (s) => oldWarOfficeTile(s),
    light: L.facade(88, 1.3),
  },
  {
    city: 'london',
    key: 'burlington-house',
    match: /Burlington House|Royal Academy/i,
    foot: [3, 3],
    seed: 3244,
    draw: (s) => burlingtonHouseTile(s),
    light: L.facade(50, 1.3),
  },
  {
    city: 'london',
    key: 'government-offices-great-george-street',
    match: /Government Offices Great George Street|GOGGS|HM Treasury|Treasury/i,
    foot: [4, 4],
    seed: 3245,
    draw: (s) => goggsTile(s),
    light: L.facade(76, 1.6),
  },
  {
    city: 'london',
    key: 'foreign-commonwealth-and-development-office',
    match: /Foreign,? (and )?Commonwealth|Foreign Office|FCDO|FCO/i,
    foot: [4, 4],
    seed: 3246,
    draw: (s) => fcdoTile(s),
    light: L.facade(132, 1.6),
  },
  {
    city: 'london',
    key: 'whitehall-court',
    match: /Whitehall Court/i,
    foot: [3, 3],
    seed: 3247,
    draw: (s) => whitehallCourtTile(s),
    light: { kind: 'facadeFlood', topZ: 170, halfW: 1.0 },
  },
  {
    city: 'london',
    key: 'tower-hotel',
    match: /Tower Hotel/i,
    foot: [3, 3],
    seed: 3248,
    draw: (s) => towerHotelTile(s),
    light: L.towerCrown(56, 1.2),
  },
  {
    city: 'london',
    key: 'royal-mews',
    match: /Royal Mews/i,
    foot: [3, 3],
    seed: 3249,
    draw: (s) => royalMewsTile(s),
    light: L.facade(64, 1.2),
  },
  {
    city: 'london',
    key: 'ossulston-estate',
    match: /Ossulston/i,
    foot: [3, 3],
    seed: 3250,
    draw: (s) => ossulstonEstateTile(s),
    light: L.towerCrown(70, 1.3),
  },
  {
    city: 'london',
    key: 'crescent-house-golden-lane',
    match: /Crescent House|Golden Lane/i,
    foot: [3, 3],
    seed: 3251,
    draw: (s) => crescentHouseTile(s),
    light: L.towerCrown(84, 1.2),
  },
  {
    city: 'london',
    key: 'caroline-gardens',
    match: /Caroline Gardens/i,
    foot: [3, 3],
    seed: 3252,
    draw: (s) => carolineGardensTile(s),
    light: L.facade(44, 1.2),
  },
  {
    city: 'london',
    key: 'the-lancasters',
    match: /\bThe Lancasters\b/i,
    foot: [3, 3],
    seed: 3253,
    draw: (s) => lancastersTile(s),
    light: L.facade(58, 1.2),
  },
  {
    city: 'london',
    key: 'albion-riverside',
    match: /Albion Riverside/i,
    foot: [3, 3],
    seed: 3254,
    draw: (s) => albionRiversideTile(s),
    light: L.towerCrown(66, 1.2),
  },
  {
    city: 'london',
    key: 'city-of-westminster-college',
    match: /City of Westminster College/i,
    foot: [3, 3],
    seed: 3255,
    draw: (s) => westminsterCollegeTile(s),
    light: L.towerCrown(58, 1.2),
  },
  {
    city: 'london',
    key: 'inner-london-crown-court',
    match: /Inner London Crown Court|Sessions House/i,
    foot: [3, 3],
    seed: 3256,
    draw: (s) => innerLondonCourtTile(s),
    light: L.facade(44, 1.2),
  },
  {
    city: 'london',
    key: 'cranley-gardens',
    match: /Cranley Gardens/i,
    foot: [3, 3],
    seed: 3257,
    draw: (s) => cranleyGardensTile(s),
    light: L.facade(60, 1.2),
  },
  {
    city: 'london',
    key: 'chelsea-flower-show',
    match: /Chelsea Flower Show/i,
    foot: [3, 3],
    seed: 3258,
    draw: (s) => chelseaFlowerShowTile(s),
    light: L.facade(38, 1.4),
  },
  {
    city: 'london',
    key: 'eastern-coal-drops-at-kings-cross-goods-yard',
    match: /Coal Drops|Eastern Coal Drops/i,
    foot: [3, 3],
    seed: 3259,
    draw: (s) => coalDropsYardTile(s),
    light: L.facade(56, 1.3),
  },
];
