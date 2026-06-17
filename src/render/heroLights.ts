// Per-hero ELECTRIFICATION light-show (owner mandate, 2026-06-15: "all heroes
// should have a bespoke, hero-relevant electrification effect — like a night-
// time light show on the Eiffel Tower"). Powering a landmark literally lights
// it up: when the player's network ENERGISES a hero's tile, a bespoke animated
// night light-show keyed to that landmark fades in, strongest at dusk/night and
// gone by day. A fresh blank game (nothing powered) shows NOTHING — so London
// stays byte-identical at the start.
//
// FAIRY-LIGHTS DIRECTION (owner, 2026-06-16: "the night lights don't look great
// … just looks like a red light. Think more fairy lights. The London Eye was a
// good example."). The whole show is now spoken in ONE language — draped
// FESTOON STRINGS and FIELDS of small TWINKLING BULBS, warm-dominant with
// sparing soft multicolour accents, every bulb a hot-white core inside a tight
// warm bloom. The dark GAPS between bulbs are what read as fairy lights, not a
// glow blob; the old soft-halo washes (which read as one coloured smear) and
// the harsh red aircraft beacon are gone — the beacon is now a small warm ember.
// Each hero keeps its bespoke character through the SHAPE its lights pick out
// (the Eye's rim, the Shard's spire, a dome's crown, an arch's sweep).
//
// Cheap + lazy: the MapRenderer calls drawHeroLights only for ON-SCREEN
// energised heroes at mid/close zoom, into one additive Graphics that rides the
// glow layer (so it inherits the day-arc glow ramp). A single shared clock
// (the renderer's animation time) drives every twinkle/cycle — no RNG at
// runtime; per-hero phases are derived deterministically from the tile anchor.

import { LANDMARK, type Landmark } from '../sim/map/types';
import { Graphics } from 'pixi.js';
import { RES } from './sprites/iso';

/** The distinct bespoke light-show kinds. A pure landmark→kind mapping
 *  (heroLightKind) selects one; the generic fallback guarantees EVERY hero
 *  lights up when energised. */
export type HeroLightKind =
  | 'eiffelSparkle' // golden twinkle scattered up the lattice (the 20:00 shimmer)
  | 'spireBeacon' // spire-tip beacon + cool-lit glass facets (the Shard)
  | 'towerCrown' // lit crown + scattered warm windows (skyscraper / grand towers)
  | 'pyramidFlood' // base floodlights ON + warm wash up the faces (Sound-&-Light)
  | 'sphinxFlood' // floodlit from the front
  | 'facadeFlood' // floodlit facade + glowing rose / lit dome lantern (cathedrals)
  | 'aerialBeacon' // aerial-gallery beacon + lit bands (BT Tower / masts)
  | 'rimCycle' // colour-cycling rim (the London Eye)
  | 'archGlow' // lit sweeping arch (Wembley / Arc / Orbit)
  | 'stadiumFlood' // floodlit bowl rim (stadiums / arenas / the O2)
  | 'genericGlow'; // warm festoon + window glow — the fallback so all heroes light

/** A per-city BESPOKE hero's electrification light SPEC (registry-supplied,
 *  parallel to the enum heroes' heroLightKind + HERO_GEOM). `kind` picks the
 *  signature effect; `topZ`/`halfW` (sprite-px crown height + tile-diamond
 *  half-width, same units as HERO_GEOM) place the lit mass ON the silhouette.
 *  Both geometry fields optional — omitted ⇒ the renderer's footprint estimate.
 *  A hero with no spec at all falls back to the generic warm hero glow. */
export interface HeroLightSpec {
  kind: HeroLightKind;
  topZ?: number | undefined;
  halfW?: number | undefined;
}

/** PURE mapping: landmark id → bespoke effect kind. Factored out so it can be
 *  unit-tested in isolation (no Pixi, no renderer). Anything not listed falls
 *  through to the generic warm glow — every hero still lights up. */
export function heroLightKind(lm: Landmark): HeroLightKind {
  switch (lm) {
    case LANDMARK.eiffel:
      return 'eiffelSparkle';
    case LANDMARK.spire:
      return 'spireBeacon';
    case LANDMARK.skyscraper:
    case LANDMARK.grand:
    case LANDMARK.gherkin:
      return 'towerCrown';
    case LANDMARK.pyramid:
    case LANDMARK.pyramidGreat:
    case LANDMARK.pyramidKhafre:
    case LANDMARK.pyramidMenkaure:
      return 'pyramidFlood';
    case LANDMARK.sphinx:
      return 'sphinxFlood';
    case LANDMARK.notredame:
    case LANDMARK.dome:
    case LANDMARK.basilica:
    case LANDMARK.parliament:
    case LANDMARK.louvre:
    case LANDMARK.fortress:
      return 'facadeFlood';
    case LANDMARK.bttower:
    case LANDMARK.palacemast:
    case LANDMARK.allypally:
      return 'aerialBeacon';
    case LANDMARK.eye:
      return 'rimCycle';
    case LANDMARK.wembley:
    case LANDMARK.arch:
    case LANDMARK.orbit:
      return 'archGlow';
    case LANDMARK.stadium:
    case LANDMARK.arena:
    case LANDMARK.o2dome:
    case LANDMARK.velodrome:
      return 'stadiumFlood';
    default:
      return 'genericGlow';
  }
}

/** Which landmarks earn a hero light-show at all. The civic FABRIC (station,
 *  school, townhall, church, watertower, sewage, carpark, datacentre, mall,
 *  westfield, excel, kewhouse, airport, heathrow, zoo) is deliberately
 *  EXCLUDED so the night reads with the heroes lit, not the whole city —
 *  mirroring the env-art 5%-hero rule and the existing HERO_SPRITES set.
 *  (Westfield/ExCeL/Kew are big but read as fabric crowds, not focal heroes.) */
export const HERO_LIGHT_LANDMARKS: ReadonlySet<Landmark> = new Set<Landmark>([
  LANDMARK.eiffel,
  LANDMARK.spire,
  LANDMARK.skyscraper,
  LANDMARK.grand,
  LANDMARK.gherkin,
  LANDMARK.pyramid,
  LANDMARK.pyramidGreat,
  LANDMARK.pyramidKhafre,
  LANDMARK.pyramidMenkaure,
  LANDMARK.sphinx,
  LANDMARK.notredame,
  LANDMARK.dome,
  LANDMARK.basilica,
  LANDMARK.parliament,
  LANDMARK.louvre,
  LANDMARK.fortress,
  LANDMARK.bttower,
  LANDMARK.palacemast,
  LANDMARK.allypally,
  LANDMARK.eye,
  LANDMARK.wembley,
  LANDMARK.arch,
  LANDMARK.orbit,
  LANDMARK.stadium,
  LANDMARK.arena,
  LANDMARK.o2dome,
  LANDMARK.velodrome,
  LANDMARK.powerstation,
  LANDMARK.towerBridge,
]);

/** Per-landmark sprite GEOMETRY for the light-show, in the sprite's own units:
 *  `topZ` is the height (z, original px) of the lit crown/tip/dome above the
 *  footprint floor — read off each sprite's definition so the beacon lands ON
 *  the silhouette, not in the sky (the London Eye proved that matching the art
 *  geometry is what makes an effect read as the landmark and not a searchlight);
 *  `halfW` is the lit mass's half-width as a fraction of a tile diamond's
 *  half-width. Anything unlisted falls back to a footprint-derived estimate. */
export const HERO_GEOM: Partial<Record<Landmark, { topZ: number; halfW: number }>> = {
  // tall slim towers — narrow + very tall
  [LANDMARK.spire]: { topZ: 300, halfW: 0.34 }, // the Shard
  [LANDMARK.bttower]: { topZ: 268, halfW: 0.32 }, // BT Tower (shaft + antenna)
  [LANDMARK.eiffel]: { topZ: 252, halfW: 1.5 }, // the Eiffel — broad 3×3 base
  [LANDMARK.skyscraper]: { topZ: 258, halfW: 0.9 }, // generic tall hero tower
  [LANDMARK.gherkin]: { topZ: 126, halfW: 0.42 }, // the City bullet
  [LANDMARK.grand]: { topZ: 130, halfW: 1.2 }, // grand civic block
  [LANDMARK.palacemast]: { topZ: 176, halfW: 0.18 }, // Crystal Palace mast
  [LANDMARK.allypally]: { topZ: 80, halfW: 1.3 }, // Ally Pally + mast
  // domes / cathedrals / civic crowns — crown height + broad facade
  [LANDMARK.dome]: { topZ: 92, halfW: 1.0 }, // St Paul's lantern
  [LANDMARK.parliament]: { topZ: 132, halfW: 1.4 }, // Big Ben / Victoria Tower
  [LANDMARK.notredame]: { topZ: 152, halfW: 1.3 }, // the flèche
  [LANDMARK.basilica]: { topZ: 72, halfW: 0.9 }, // Sacré-Cœur dome
  [LANDMARK.louvre]: { topZ: 50, halfW: 1.0 }, // the glass pyramid court
  [LANDMARK.fortress]: { topZ: 52, halfW: 0.7 }, // the keep
  // the London Eye — the wheel rim (its own reconstruction in rimCycle)
  [LANDMARK.eye]: { topZ: 154, halfW: 0.9 }, // hub ~88px + R 66px ≈ z154
  // sweeping arches
  [LANDMARK.wembley]: { topZ: 108, halfW: 1.3 }, // the white arch
  [LANDMARK.arch]: { topZ: 40, halfW: 0.7 }, // Arc de Triomphe
  [LANDMARK.orbit]: { topZ: 110, halfW: 0.8 }, // the Orbit tower
  // big low bowls / domes
  [LANDMARK.stadium]: { topZ: 34, halfW: 1.6 }, // Olympic bowl 3×3
  [LANDMARK.arena]: { topZ: 16, halfW: 0.9 }, // football ground
  [LANDMARK.o2dome]: { topZ: 70, halfW: 1.7 }, // the O2 tented dome 3×3
  [LANDMARK.velodrome]: { topZ: 36, halfW: 0.9 }, // the VeloPark
  // pyramids — broad + low (their own floodlight fans in pyramidFlood)
  [LANDMARK.pyramidGreat]: { topZ: 178, halfW: 2.0 },
  [LANDMARK.pyramidKhafre]: { topZ: 138, halfW: 1.7 },
  [LANDMARK.pyramidMenkaure]: { topZ: 96, halfW: 1.3 },
  [LANDMARK.pyramid]: { topZ: 178, halfW: 2.0 },
  [LANDMARK.sphinx]: { topZ: 22, halfW: 1.4 }, // low couchant
  // the decommissioned river power station (chimneys)
  [LANDMARK.powerstation]: { topZ: 130, halfW: 1.3 },
  [LANDMARK.towerBridge]: { topZ: 60, halfW: 0.8 }, // the bascule towers
};

/** A placed hero ready for the per-frame light pass. `cx/cy` is the world-pixel
 *  anchor (the footprint centre, on the ground); `topY` is the world-pixel Y of
 *  the building's lit crown (above cy by its silhouette height); `w` is the
 *  lit mass's world half-width. `phase` is a deterministic per-hero offset so
 *  neighbouring heroes don't twinkle in lockstep. */
export interface HeroLight {
  kind: HeroLightKind;
  cx: number;
  cy: number;
  topY: number;
  /** world-px half-width of the lit mass */
  w: number;
  phase: number;
}

// --- FAIRY-LIGHT PALETTE (owner, 2026-06-16: "think more fairy lights; the
// London Eye was a good example"). Warm-dominant (≈60% warm-white, 30% gold/
// amber) with sparing soft multicolour accents (≤10%, the festoon strand);
// every bulb sparks from a hot WHITE core so even the coloured ones twinkle
// rather than smear. The old harsh red aircraft beacon → a small warm EMBER. ---
const FWHITE = 0xfff3d6; // warm white ~3000K — the dominant festoon bulb
const FGOLD = 0xffce82; // gold — secondary warm
const FAMBER = 0xffb45e; // deep amber — warm fill / low uplight
const COOL = 0xcfe6ff; // cool glass glint (the Shard's facets)
const EMBER = 0xff8a52; // a SOFT warm ember (replaces the harsh red beacon)
// soft festoon multicolour — used SPARINGLY, like a strand of party lights:
// saturated enough to read against navy, soft enough to stay magical not garish.
const FESTOON: readonly number[] = [0xff9a86, 0xffd27a, 0x9fe6a8, 0x8fc8ff, 0xc7a3ff];
// the dominant warm strand most heroes wear (warm-white biased, a little gold).
const WARMSTRAND: readonly number[] = [FWHITE, FGOLD, FWHITE, FAMBER, FWHITE, FGOLD];
// a cheerful strand for ordinary powered buildings: warm-dominant with a SPARING
// sprinkle of the soft festoon party colours threaded through the middle.
const PARTYSTRAND: readonly number[] = [FWHITE, FGOLD, ...FESTOON, FWHITE, FAMBER, FGOLD];

/** Deterministic hash → [0,1) (no runtime RNG; phases must be stable). */
function frac(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** A single fairy-light BULB: a tight warm bloom around a hot white core, so it
 *  reads as a crisp point of light, never a soft wash. The atom of the whole
 *  fairy-light language — every string and field is made of these. */
function bulb(g: Graphics, x: number, y: number, r: number, color: number, a: number): void {
  g.circle(x, y, r * 2.3).fill({ color, alpha: a * 0.22 }); // soft outer bloom
  g.circle(x, y, r * 1.15).fill({ color, alpha: a * 0.72 }); // the coloured bulb
  g.circle(x, y, Math.max(0.7, r * 0.52)).fill({ color: 0xffffff, alpha: Math.min(1, a * 1.05) }); // hot core
}

/** A draped FESTOON of twinkling bulbs from (x0,y0)→(x1,y1), sagging by `sag`
 *  world-px at the middle (a catenary swag). Each bulb twinkles on its own
 *  phase; `pal` picks the strand (WARMSTRAND by default, FESTOON for accents). */
function festoon(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n: number,
  t: number,
  k: number,
  phase: number,
  sag: number,
  pal: readonly number[],
): void {
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = x0 + (x1 - x0) * f;
    const y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag;
    const ph = phase + i * 1.73;
    const tw = 0.5 + 0.5 * Math.sin(t * 3.1 + ph);
    const col = pal[i % pal.length] ?? FWHITE;
    bulb(g, x, y, (1.0 + 0.7 * tw) * RES, col, (0.55 + 0.5 * tw) * k);
  }
}

/** A soft additive glow pool — kept ONLY for genuine soft light (a lantern, a
 *  pitch's spilled floodlight), never as the main event. Concentric rings so
 *  the falloff reads as a glow, not a hard dot. */
function halo(g: Graphics, x: number, y: number, r: number, color: number, a: number): void {
  for (const [mul, am] of [
    [1.0, 0.5],
    [0.55, 0.85],
    [0.28, 1],
  ] as const) {
    g.circle(x, y, r * mul).fill({ color, alpha: a * am });
  }
}

/** Draw every energised hero's bespoke light-show into one additive Graphics.
 *  `t` is the shared animation clock (seconds); `glow` is the day-arc glow
 *  (0 by day → ~1 at night) so the whole show fades with the dusk — by day it
 *  ties off to nothing. The caller guarantees `heroes` are on-screen, energised
 *  and at a zoom band that shows them, so this stays cheap. */
export function drawHeroLights(
  g: Graphics,
  heroes: readonly HeroLight[],
  t: number,
  glow: number,
): void {
  g.clear();
  // the show only blooms toward dusk/night; capped so it never neon-spams by
  // day. A tiny floor keeps a lit landmark faintly twinkling even mid-afternoon.
  const lvl = Math.max(0, Math.min(1, glow));
  const intensity = 0.22 + 0.95 * lvl;
  if (intensity <= 0.02 || heroes.length === 0) return;
  for (const h of heroes) {
    switch (h.kind) {
      case 'eiffelSparkle':
        eiffelSparkle(g, h, t, intensity);
        break;
      case 'spireBeacon':
        spireBeacon(g, h, t, intensity);
        break;
      case 'towerCrown':
        towerCrown(g, h, t, intensity);
        break;
      case 'pyramidFlood':
        pyramidFlood(g, h, t, intensity);
        break;
      case 'sphinxFlood':
        sphinxFlood(g, h, intensity);
        break;
      case 'facadeFlood':
        facadeFlood(g, h, t, intensity);
        break;
      case 'aerialBeacon':
        aerialBeacon(g, h, t, intensity);
        break;
      case 'rimCycle':
        rimCycle(g, h, t, intensity);
        break;
      case 'archGlow':
        archGlow(g, h, t, intensity);
        break;
      case 'stadiumFlood':
        stadiumFlood(g, h, t, intensity);
        break;
      default:
        genericGlow(g, h, t, intensity);
    }
  }
}

// --- THE EIFFEL TOWER: golden SPARKLE up the lattice (the 20:00 shimmer) -----
// A twinkling field of warm-gold pinprick BULBS scattered over the silhouette,
// each cycling out of phase, biased toward the wide base — exactly the real
// hourly sparkle. Capped by a small warm ember at the tip.
function eiffelSparkle(g: Graphics, h: HeroLight, t: number, k: number): void {
  const N = 30;
  const baseHalf = h.w * 0.7;
  const span = h.cy - h.topY; // ground → tip in world px
  for (let i = 0; i < N; i++) {
    const f = frac(i * 2.7 + h.phase);
    const up = f * f; // bias toward the base
    const y = h.cy - 8 * RES - up * span;
    const half = baseHalf * (1 - up * 0.92) + 1.5 * RES;
    const x = h.cx + (frac(i * 5.13 + h.phase) - 0.5) * 2 * half;
    const tw = 0.5 + 0.5 * Math.sin(t * 4.1 + i * 1.7 + h.phase * 6.28);
    // mostly warm-gold, an occasional white sparkle
    const col = frac(i * 8.1 + h.phase) > 0.82 ? FWHITE : FGOLD;
    bulb(g, x, y, (0.95 + 0.8 * tw) * RES, col, (0.4 + 0.6 * tw * tw) * k);
  }
  ember(g, h.cx, h.topY, t, k);
}

// --- THE SHARD: spire-tip beacon + cool-lit glass facets ----------------------
// Discrete cool facet-glints twinkling up the tapering shaft (points read as LIT
// GLASS, never a searchlight beam — the Eye proved discrete points beat washes),
// capped by a slow-breathing white beacon at the splintered tip.
function spireBeacon(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const N = 24;
  for (let i = 0; i < N; i++) {
    const f = frac(i * 2.13 + h.phase); // 0..1 up the shaft
    const y = h.cy - 6 * RES - f * span * 0.95;
    const half = h.w * (0.92 - f * 0.85) + 0.5 * RES; // taper to the point
    const x = h.cx + (frac(i * 6.7 + h.phase) - 0.5) * 1.9 * half;
    const sh = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3 + h.phase * 6.28);
    bulb(g, x, y, (0.85 + 0.6 * sh) * RES, COOL, (0.42 + 0.5 * sh) * k);
  }
  // the tip beacon (a steady, slow-breathing white-blue point)
  const br = 0.6 + 0.4 * Math.sin(t * 1.6 + h.phase);
  bulb(g, h.cx, h.topY + 2 * RES, (1.6 + 0.7 * br) * RES, 0xeaf4ff, 0.85 * k);
}

// --- Skyscraper heroes / grand towers: festoon crown + lit-window strings -----
// A festoon swag draped across the crown + vertical strings of warm window-bulbs
// up the shaft (some flicking slowly on/off). Reads as a powered tower dressed
// in lights, not a glowing cap.
function towerCrown(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const crownY = h.topY + span * 0.04;
  // the crown festoon — a gentle swag of warm bulbs across the top
  festoon(g, h.cx - h.w * 0.85, crownY, h.cx + h.w * 0.85, crownY, 7, t, k, h.phase * 6.28, span * 0.03, WARMSTRAND);
  // vertical strings of lit windows down two faces of the shaft
  const cols = 2;
  const rows = 7;
  for (let c = 0; c < cols; c++) {
    const sx = c === 0 ? -0.62 : 0.62;
    for (let r = 0; r < rows; r++) {
      const f = (r + 0.5) / rows;
      const y = h.topY + span * (0.12 + f * 0.82);
      const halfHere = h.w * (1.0 - f * 0.18);
      const x = h.cx + sx * halfHere;
      // slow occupancy flicker (windows switch over tens of seconds)
      const on = Math.sin(t * 0.5 + (c * rows + r) * 2.1 + h.phase * 6.28) > -0.35 ? 1 : 0.18;
      bulb(g, x, y, 1.15 * RES, FGOLD, 0.72 * on * k);
    }
  }
}

// --- Giza pyramids: base floodlight fixtures ON + warm wash up the faces ------
// The Sound-&-Light: honey floodlight fans rising from the base corners + crisp
// lamp bulbs at each fixture. Biased warm honey (a faint rose breath only),
// so it reads as a warm-lit monument, never a red blob.
function pyramidFlood(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const apexY = h.topY;
  // THE GIZA SOUND-&-LIGHT SHOW — the headline night event, so it must READ:
  // saturated coloured floodlight beams fanning up the faces, the colour
  // sweeping warm→rose→teal→gold on a slow cycle, bright ground pools at the
  // base, crisp lamp heads, and a glow crowning the apex. Kept inside the
  // dusk palette (warm-dominant) but emphatic — this is the flagship.
  const cyc = t * 0.5 + h.phase; // slow colour sweep
  // sweep across four show colours (warm-biased, one cool accent)
  const PAL = [0xffd9a0, 0xff9d6a, 0xff7fae, 0x7fd8ff] as const;
  const seg = (Math.sin(cyc) * 0.5 + 0.5) * (PAL.length - 1);
  const i0 = Math.floor(seg);
  const col = mixHex(PAL[i0] ?? PAL[0], PAL[(i0 + 1) % PAL.length] ?? PAL[0], seg - i0);
  // gentle overall breath so the whole show pulses a touch
  const breath = 0.85 + 0.15 * Math.sin(t * 1.3 + h.phase);

  // two broad coloured beams fanning from the base corners up across the faces
  for (const sx of [-1, 1] as const) {
    const fx = h.cx + sx * h.w * 1.05;
    const fy = h.cy - 1 * RES;
    // wide soft beam (the light in the air)
    g.poly([
      fx,
      fy,
      h.cx - h.w * 0.34,
      apexY + span * 0.06,
      h.cx + h.w * 0.34,
      apexY + span * 0.06,
    ]).fill({ color: col, alpha: 0.22 * breath * k });
    // a brighter inner core of the beam
    g.poly([
      fx,
      fy,
      h.cx - h.w * 0.12,
      apexY + span * 0.18,
      h.cx + h.w * 0.12,
      apexY + span * 0.18,
    ]).fill({ color: mixHex(col, 0xffffff, 0.35), alpha: 0.16 * breath * k });
    // a bright ground pool where the lamp sits + the crisp lamp head
    g.ellipse(fx, fy, 5 * RES, 2.2 * RES).fill({ color: col, alpha: 0.4 * breath * k });
    bulb(g, fx, fy - 6 * RES, 2.4 * RES, 0xfff2d6, Math.min(1, 1.05 * k));
  }

  // a strong warm wash climbing the lower courses (brightest at the base),
  // tinted by the live show colour so the whole face glows
  for (let i = 0; i < 6; i++) {
    const f = i / 6;
    const y = h.cy - 3 * RES - f * span * 0.82;
    const half = h.w * (1 - f * 0.55);
    g.ellipse(h.cx, y, half, span * 0.075).fill({
      color: mixHex(0xffe2b4, col, 0.55),
      alpha: 0.2 * (1 - f * 0.8) * breath * k,
    });
  }
  // a crown of light at the apex — the beams converge and bloom
  halo(g, h.cx, apexY + span * 0.04, h.w * 0.5, mixHex(col, 0xfff2d6, 0.4), 0.32 * breath * k);
}

// --- The Sphinx: dramatically floodlit from the front -------------------------
function sphinxFlood(g: Graphics, h: HeroLight, k: number): void {
  const span = h.cy - h.topY;
  const fx = h.cx + h.w * 0.85;
  const fy = h.cy - 1 * RES;
  // a bright warm floodlight raking across the face + headdress
  g.poly([
    fx,
    fy,
    h.cx - h.w * 0.8,
    h.cy - span * 0.95,
    h.cx - h.w * 0.1,
    h.cy - span * 0.35,
  ]).fill({ color: 0xffcf96, alpha: 0.26 * k });
  // a brighter inner cone
  g.poly([
    fx,
    fy,
    h.cx - h.w * 0.45,
    h.cy - span * 0.8,
    h.cx - h.w * 0.05,
    h.cy - span * 0.45,
  ]).fill({ color: 0xfff0d0, alpha: 0.18 * k });
  // ground pool + crisp lamp head at the floodlight, glow on the lit face
  g.ellipse(fx, fy, 4 * RES, 1.8 * RES).fill({ color: 0xffcf96, alpha: 0.4 * k });
  bulb(g, fx, fy - 4 * RES, 2.2 * RES, 0xfff2d6, Math.min(1, 1.0 * k));
  halo(g, h.cx - h.w * 0.1, h.cy - span * 0.55, h.w * 0.6, FAMBER, 0.28 * k);
}

// --- Cathedrals / domes / parliament: outlined crown + lit lantern ------------
// The defining edge picked out in warm bulbs — a festoon along the eaves/roofline
// and a warm lantern bulb at the dome/spire crown, with a gentle low uplight at
// the base corners. Outlines the silhouette in light instead of washing it.
function facadeFlood(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // a festoon along the roofline (eaves), sagging gently
  const eaveY = h.cy - span * 0.5;
  festoon(g, h.cx - h.w * 0.92, eaveY, h.cx + h.w * 0.92, eaveY, 9, t, k, h.phase * 6.28, span * 0.05, WARMSTRAND);
  // two small warm floodlight bulbs grazing up from the base corners
  for (const sx of [-1, 1] as const) {
    bulb(g, h.cx + sx * h.w * 0.8, h.cy - 2 * RES, 1.5 * RES, 0xfff0d0, 0.5 * k);
  }
  // a faint warm graze up the lower facade (small, base-only — not a column)
  g.ellipse(h.cx, h.cy - span * 0.18, h.w * 0.9, span * 0.07).fill({ color: FAMBER, alpha: 0.08 * k });
  // the glowing rose window / lit dome lantern near the crown — a warm bulb that
  // breathes very gently (the brightest single point, the building's "eye")
  const br = 0.75 + 0.25 * Math.sin(t * 1.1 + h.phase);
  bulb(g, h.cx, h.topY + span * 0.1, (2.0 + 0.8 * br) * RES, 0xffe6b0, 0.85 * k);
}

// --- BT Tower / masts: aerial-gallery ring + lit bands + warm ember tip --------
function aerialBeacon(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // discrete lit glazing rings up the slim shaft (a string of cool bulbs either
  // side of the column — reads as the banded glazing, not a beam)
  const N = 9;
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N;
    const y = h.cy - 8 * RES - f * span * 0.8;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.5 + h.phase * 6.28);
    for (const sx of [-1, 1] as const) {
      bulb(g, h.cx + sx * h.w * 0.6, y, (0.85 + 0.5 * tw) * RES, COOL, (0.45 + 0.3 * tw) * k);
    }
  }
  // the aerial-gallery ring just below the top (a festoon hoop of warm bulbs)
  const galleryY = h.topY + span * 0.14;
  festoon(g, h.cx - h.w * 0.75, galleryY, h.cx + h.w * 0.75, galleryY, 6, t, k, h.phase * 6.28, span * 0.02, WARMSTRAND);
  // a small warm ember at the very top (the aircraft marker — NOT a harsh red)
  ember(g, h.cx, h.topY, t, k);
}

// --- The London Eye: a colour-cycling rim of bulbs (the reference) ------------
function rimCycle(g: Graphics, h: HeroLight, t: number, k: number): void {
  // the wheel hub sits high above the ground anchor; reconstruct its centre.
  // eyeTile draws the hub at z88 of the topZ154 silhouette ⇒ 88/154 ≈ 0.571 up.
  const R = h.w * 1.15;
  const cy = h.cy - (h.cy - h.topY) * 0.571;
  const cx = h.cx;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // hue cycles around the rim AND drifts over time (the real LED rim show)
    const phase = i / N + t * 0.12 + h.phase;
    const col = cycleColor(phase);
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R * 0.97;
    const tw = 0.7 + 0.3 * Math.sin(t * 3.0 + i * 0.9 + h.phase * 6.28);
    bulb(g, x, y, (1.4 + 0.5 * tw) * RES, col, 0.95 * k);
  }
}

// --- Wembley arch / Arc / Orbit: a lit sweeping arch of bulbs ------------------
function archGlow(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const N = 16;
  const aL = { x: h.cx - h.w * 0.95, y: h.cy - span * 0.08 };
  const aR = { x: h.cx + h.w * 0.7, y: h.cy - span * 0.22 };
  const apex = { x: h.cx - h.w * 0.16, y: h.topY };
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const m = 1 - f;
    const x = m * m * aL.x + 2 * m * f * apex.x + f * f * aR.x;
    const y = m * m * aL.y + 2 * m * f * apex.y + f * f * aR.y;
    // a bright wave travels along the arch
    const wave = 0.5 + 0.5 * Math.sin(t * 2.2 - f * 6.0 + h.phase);
    bulb(g, x, y, (1.05 + 0.8 * wave) * RES, FWHITE, (0.45 + 0.5 * wave) * k);
  }
}

// --- Stadiums / arenas / the O2: a festoon ring + spilled pitch glow ----------
function stadiumFlood(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const rimY = h.cy - span * 0.5;
  // a ring of warm-white floodlight bulbs around the rim (the masts)
  const N = 10;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = h.cx + Math.cos(a) * h.w * 1.0;
    const y = rimY + Math.sin(a) * h.w * 0.5;
    const tw = 0.6 + 0.4 * Math.sin(t * 2.4 + i * 1.3 + h.phase * 6.28);
    bulb(g, x, y, (1.25 + 0.5 * tw) * RES, 0xf3f0e0, (0.6 + 0.35 * tw) * k);
  }
  // the pitch glows faintly from the spilled floodlight (one soft pool)
  halo(g, h.cx, rimY, h.w * 0.55, 0xeae6d2, 0.07 * k);
}

// --- Generic fallback: a warm festoon + lit windows (EVERY hero lights up) -----
function genericGlow(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = Math.max(h.cy - h.topY, h.w);
  // a festoon swag draped across the roofline (a sprinkle of party colour)
  const roofY = h.cy - span * 0.55;
  festoon(g, h.cx - h.w * 0.85, roofY, h.cx + h.w * 0.85, roofY, 7, t, k, h.phase * 6.28, span * 0.08, PARTYSTRAND);
  // a few lit windows below so it reads as an occupied, powered building
  for (let i = 0; i < 6; i++) {
    const f = frac(i * 4.1 + h.phase);
    const y = h.cy - span * (0.16 + f * 0.34);
    const x = h.cx + (frac(i * 9.3 + h.phase) - 0.5) * 1.4 * h.w;
    const on = Math.sin(t * 0.6 + i * 2.3 + h.phase * 6.28) > -0.4 ? 1 : 0.22;
    bulb(g, x, y, 1.0 * RES, FGOLD, 0.62 * on * k);
  }
}

/** A small, slow-breathing warm EMBER at a tower's tip — the aircraft marker,
 *  reimagined as a gentle warm point (NOT the old harsh red beacon that read as
 *  "just a red light"). */
function ember(g: Graphics, x: number, y: number, t: number, k: number): void {
  const br = 0.55 + 0.45 * (Math.sin(t * 1.8) * 0.5 + 0.5);
  bulb(g, x, y, (1.2 + 0.5 * br) * RES, EMBER, 0.7 * br * k);
}

/** Lerp between two 0xRRGGBB colours. */
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

/** A smooth rainbow cycle (the LED rim): phase in turns → a saturated hue. */
function cycleColor(phase: number): number {
  const a = phase * Math.PI * 2;
  const r = Math.round(128 + 127 * Math.sin(a));
  const g = Math.round(128 + 127 * Math.sin(a + 2.094));
  const b = Math.round(128 + 127 * Math.sin(a + 4.188));
  return (r << 16) | (g << 8) | b;
}
