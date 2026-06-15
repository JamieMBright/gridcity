// Per-hero ELECTRIFICATION light-show (owner mandate, 2026-06-15: "all heroes
// should have a bespoke, hero-relevant electrification effect — like a night-
// time light show on the Eiffel Tower"). Powering a landmark literally lights
// it up: when the player's network ENERGISES a hero's tile, a bespoke animated
// night light-show keyed to that landmark fades in, strongest at dusk/night and
// gone by day. A fresh blank game (nothing powered) shows NOTHING — so London
// stays byte-identical at the start.
//
// This is the CHARACTERFUL per-hero version, NOT a generic additive bloom (the
// old "gleam" read as electricity and was removed). Each kind is a small,
// tasteful, distinct treatment — the Eiffel's 20:00 sparkle, the Shard's
// spire beacon, the Giza Sound-&-Light floodlights, the Eye's colour rim — so
// every hero is recognisable in the dark by HOW it lights.
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
  | 'genericGlow'; // warm uplight + window glow — the fallback so all heroes light

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

const GOLD = 0xffd27a;
const WARM = 0xffc070;
const COOL = 0xbfe0ff;
const BEACON = 0xff5a4a;

/** Deterministic hash → [0,1) (no runtime RNG; phases must be stable). */
function frac(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
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
  // day. A small floor keeps a lit landmark faintly lit even mid-afternoon.
  const lvl = Math.max(0, Math.min(1, glow));
  const intensity = 0.18 + 0.82 * lvl;
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
        stadiumFlood(g, h, intensity);
        break;
      default:
        genericGlow(g, h, intensity);
    }
  }
}

/** A soft additive disc (the building blocks of every effect): concentric
 *  rings so the falloff reads as a glow pool, not a hard dot. */
function halo(g: Graphics, x: number, y: number, r: number, color: number, a: number): void {
  for (const [mul, am] of [
    [1.0, 0.55],
    [0.55, 0.9],
    [0.28, 1],
  ] as const) {
    g.circle(x, y, r * mul).fill({ color, alpha: a * am });
  }
}

// --- THE EIFFEL TOWER: golden SPARKLE up the lattice (the 20:00 shimmer) -----
// Random twinkling points scattered over the silhouette: a thinkling field of
// warm-gold pinpricks whose individual brightness cycles out of phase, exactly
// like the real hourly sparkle. The points sit in a tapering triangle from the
// broad base to the point.
function eiffelSparkle(g: Graphics, h: HeroLight, t: number, k: number): void {
  const N = 26;
  const baseHalf = h.w * 0.7;
  const span = h.cy - h.topY; // ground → tip in world px
  // a warm wash glow over the whole silhouette so the iron reads lit, not dark
  halo(g, h.cx, h.cy - span * 0.42, baseHalf * 1.05, WARM, 0.1 * k);
  for (let i = 0; i < N; i++) {
    // vertical fraction up the tower (more sparkle low where the lattice is wide)
    const f = frac(i * 2.7 + h.phase);
    const up = f * f; // bias toward the base
    const y = h.cy - 8 * RES - up * span;
    const half = baseHalf * (1 - up * 0.92) + 1.5 * RES;
    const x = h.cx + (frac(i * 5.13 + h.phase) - 0.5) * 2 * half;
    // each point twinkles on its own ~1.6 s cycle, out of phase
    const tw = 0.5 + 0.5 * Math.sin(t * 4.1 + i * 1.7 + h.phase * 6.28);
    const a = (0.25 + 0.75 * tw * tw) * k;
    const r = (0.9 + 0.7 * tw) * RES;
    g.circle(x, y, r).fill({ color: GOLD, alpha: a });
  }
  // the tip beacon
  beacon(g, h.cx, h.topY, t, k);
}

// --- THE SHARD: spire-tip beacon + cool-lit glass facets ----------------------
// The glass spike glows ice-blue: a scatter of cool facet-glints twinkling up
// the tapering shaft (discrete points read as LIT GLASS, never a searchlight
// beam — the London Eye proved discrete points beat stacked washes), capped by
// a slow-breathing white beacon at the splintered tip.
function spireBeacon(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const N = 22;
  for (let i = 0; i < N; i++) {
    const f = frac(i * 2.13 + h.phase); // 0..1 up the shaft
    const y = h.cy - 6 * RES - f * span * 0.95;
    const half = h.w * (0.92 - f * 0.85) + 0.5 * RES; // taper to the point
    const x = h.cx + (frac(i * 6.7 + h.phase) - 0.5) * 1.9 * half;
    // each facet shimmers on its own cycle
    const sh = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3 + h.phase * 6.28);
    g.circle(x, y, (0.7 + 0.6 * sh) * RES).fill({ color: COOL, alpha: (0.3 + 0.5 * sh) * k });
  }
  // the tip beacon (a steady, slow-breathing white-blue point)
  const br = 0.6 + 0.4 * Math.sin(t * 1.6 + h.phase);
  halo(g, h.cx, h.topY + 2 * RES, (2.4 + br) * RES, 0xeaf4ff, 0.6 * k);
}

// --- Skyscraper heroes / grand towers: lit crown + scattered warm windows -----
function towerCrown(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // the crown glows (a warm cap of light on the top of the tower)
  halo(g, h.cx, h.topY + span * 0.05, h.w * 0.8, WARM, 0.26 * k);
  // a scatter of lit windows up the shaft, a few flicking on/off slowly. Bias
  // them onto the shaft width (slightly inset) so they read AS the building.
  const N = 20;
  for (let i = 0; i < N; i++) {
    const f = frac(i * 3.3 + h.phase);
    const y = h.topY + span * (0.1 + f * 0.86);
    // shaft narrows a touch toward the crown
    const halfHere = h.w * (1.05 - f * 0.2);
    const x = h.cx + (frac(i * 7.7 + h.phase) - 0.5) * 1.7 * halfHere;
    // slow occupancy flicker (windows switch over tens of seconds)
    const on = Math.sin(t * 0.5 + i * 2.1 + h.phase * 6.28) > -0.3 ? 1 : 0.16;
    g.rect(x - 0.9 * RES, y - 1.2 * RES, 1.8 * RES, 2.4 * RES).fill({
      color: GOLD,
      alpha: 0.6 * on * k,
    });
  }
}

// --- Giza pyramids: base floodlight fixtures ON + warm wash up the faces ------
// The Sound-&-Light. The sprite already bakes faint floodlight MASTS at the
// base; energising switches the LAMPS on — fans of warm light up the two
// visible faces, plus a colour that breathes slowly between honey and rose.
function pyramidFlood(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  const apexY = h.topY;
  // colour drifts honey ↔ rose over the show (the Sound-&-Light palette)
  const cyc = 0.5 + 0.5 * Math.sin(t * 0.35 + h.phase);
  const col = mixHex(0xffcaa0, 0xff9bbf, cyc);
  // two floodlight fans rising from the base corners toward the apex
  for (const sx of [-1, 1] as const) {
    const fx = h.cx + sx * h.w * 0.92;
    const fy = h.cy - 2 * RES;
    g.poly([
      fx,
      fy,
      h.cx - h.w * 0.18,
      apexY + span * 0.12,
      h.cx + h.w * 0.18,
      apexY + span * 0.12,
    ]).fill({ color: col, alpha: 0.07 * k });
    // the lamp head itself glows
    halo(g, fx, fy - 6 * RES, 2.6 * RES, 0xfff0d0, 0.6 * k);
  }
  // a brighter warm wash banding up the lower courses (brightest at the base)
  for (let i = 0; i < 4; i++) {
    const f = i / 4;
    const y = h.cy - 4 * RES - f * span * 0.7;
    const half = h.w * (1 - f * 0.6);
    g.ellipse(h.cx, y, half, span * 0.07).fill({ color: col, alpha: 0.1 * (1 - f) * k });
  }
}

// --- The Sphinx: floodlit from the front --------------------------------------
function sphinxFlood(g: Graphics, h: HeroLight, k: number): void {
  // a single warm flood raking the couchant body + face from the front
  const fx = h.cx + h.w * 0.7;
  const fy = h.cy - 1 * RES;
  halo(g, fx, fy - 4 * RES, 2.2 * RES, 0xfff0d0, 0.6 * k);
  g.poly([
    fx,
    fy,
    h.cx - h.w * 0.7,
    h.cy - (h.cy - h.topY) * 0.9,
    h.cx - h.w * 0.2,
    h.cy - (h.cy - h.topY) * 0.4,
  ]).fill({ color: WARM, alpha: 0.1 * k });
  halo(g, h.cx, h.cy - (h.cy - h.topY) * 0.5, h.w * 0.5, WARM, 0.12 * k);
}

// --- Cathedrals / domes / parliament: floodlit facade + glowing rose/lantern --
function facadeFlood(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // a broad warm uplight washing the stone facade from below — bottom-heavy
  // (real floodlights graze UP the lower facade and fade out), so it never
  // reads as a column of light: brightest at the base, gone by mid-height
  for (let i = 0; i < 4; i++) {
    const f = i / 4;
    const y = h.cy - 4 * RES - f * span * 0.45;
    g.ellipse(h.cx, y, h.w * (1.0 - f * 0.35), span * 0.05 + 2 * RES).fill({
      color: WARM,
      alpha: 0.12 * (1 - f) * k,
    });
  }
  // a couple of warm floodlight lamp-pools at the base corners
  for (const sx of [-1, 1] as const) {
    halo(g, h.cx + sx * h.w * 0.8, h.cy - 2 * RES, 2.4 * RES, 0xfff0d0, 0.4 * k);
  }
  // the glowing rose window / lit dome lantern near the crown — a steady warm-
  // gold disc that breathes very gently
  const br = 0.7 + 0.3 * Math.sin(t * 1.1 + h.phase);
  halo(g, h.cx, h.topY + span * 0.12, (3.4 + br) * RES, 0xffe0a0, 0.55 * k);
}

// --- BT Tower / masts: aerial-gallery beacon + lit bands -----------------------
function aerialBeacon(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // discrete lit glazing rings up the slim shaft (a string of cool dots either
  // side of the column, reads as the banded glazing — not a beam)
  const N = 9;
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N;
    const y = h.cy - 8 * RES - f * span * 0.8;
    for (const sx of [-1, 1] as const) {
      g.circle(h.cx + sx * h.w * 0.6, y, 0.9 * RES).fill({ color: COOL, alpha: 0.4 * k });
    }
  }
  // the aerial-gallery glow just below the top (the lit lattice drums)
  halo(g, h.cx, h.topY + span * 0.12, h.w * 0.8, WARM, 0.32 * k);
  // the red aircraft-warning beacon at the very top (a slow blink)
  beacon(g, h.cx, h.topY, t, k);
}

// --- The London Eye: a colour-cycling rim -------------------------------------
function rimCycle(g: Graphics, h: HeroLight, t: number, k: number): void {
  // the wheel hub sits high above the ground anchor; reconstruct its centre.
  // eyeTile draws the hub at z88 of the topZ154 silhouette ⇒ 88/154 ≈ 0.571 up
  // from the ground anchor (was 0.62 — the rim read slightly too high).
  const R = h.w * 1.15;
  const cy = h.cy - (h.cy - h.topY) * 0.571;
  const cx = h.cx;
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // hue cycles around the rim AND drifts over time (the real LED rim show)
    const phase = (i / N) + t * 0.12 + h.phase;
    const col = cycleColor(phase);
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R * 0.97;
    g.circle(x, y, 1.7 * RES).fill({ color: col, alpha: 0.85 * k });
  }
  // a faint coloured wash filling the wheel
  halo(g, cx, cy, R * 0.5, cycleColor(t * 0.12 + h.phase), 0.06 * k);
}

// --- Wembley arch / Arc / Orbit: a lit sweeping arch ---------------------------
function archGlow(g: Graphics, h: HeroLight, t: number, k: number): void {
  const span = h.cy - h.topY;
  // a luminous parabola sweeping over the bowl, a soft pulse running its length
  const N = 14;
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
    g.circle(x, y, (1.3 + 1.1 * wave) * RES).fill({ color: 0xeaf2ff, alpha: (0.3 + 0.5 * wave) * k });
  }
}

// --- Stadiums / arenas / the O2: floodlit bowl rim -----------------------------
function stadiumFlood(g: Graphics, h: HeroLight, k: number): void {
  const span = h.cy - h.topY;
  const rimY = h.cy - span * 0.5;
  // a ring of cold-white floodlight pools around the rim
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = h.cx + Math.cos(a) * h.w * 1.0;
    const y = rimY + Math.sin(a) * h.w * 0.5;
    halo(g, x, y, 3.2 * RES, 0xf2f6ff, 0.4 * k);
  }
  // the pitch glows from the spilled floodlight
  g.ellipse(h.cx, rimY, h.w * 0.78, h.w * 0.4).fill({ color: 0xdfeaff, alpha: 0.08 * k });
}

// --- Generic fallback: warm uplight + window glow (EVERY hero lights up) ------
function genericGlow(g: Graphics, h: HeroLight, k: number): void {
  const span = Math.max(h.cy - h.topY, h.w);
  halo(g, h.cx, h.cy - span * 0.4, h.w * 0.85, WARM, 0.16 * k);
  // a couple of lit windows so it reads as an occupied, powered building
  for (let i = 0; i < 6; i++) {
    const f = frac(i * 4.1 + h.phase);
    const y = h.cy - span * (0.2 + f * 0.6);
    const x = h.cx + (frac(i * 9.3 + h.phase) - 0.5) * 1.4 * h.w;
    g.rect(x - 0.8 * RES, y - 1 * RES, 1.6 * RES, 2 * RES).fill({ color: GOLD, alpha: 0.4 * k });
  }
}

/** A slow-blinking red aircraft-warning beacon at a tower's tip. */
function beacon(g: Graphics, x: number, y: number, t: number, k: number): void {
  const blink = Math.sin(t * 2.0) > 0.4 ? 1 : 0.22;
  halo(g, x, y, 2.6 * RES, BEACON, 0.7 * blink * k);
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
