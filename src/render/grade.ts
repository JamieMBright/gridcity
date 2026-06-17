// The lofi golden-hour colour script (ROADMAP #41/#42/#44). Pure functions
// only — the renderer asks "what does this sim-minute look like?" and gets
// back one SceneGrade. Doctrine (environment-art colour scripting + colour
// theory): 3–4 dominant hues per phase on ONE analogous sunset ramp
// (gold → dusty pink → muted purple → deep navy), warm advances / cool
// recedes, and never a harsh noon white — midday is soft warm gold.
// Powered districts literally glow: `glow` scales the energized-window
// light layer, 0 by day and 1 in deep night.

import { GAME_START_DOY, seasonFactor } from '../sim/events/weather';

const MIN_PER_DAY = 1440;

export interface WeatherLike {
  /** 0..1 cloud cover. */
  cloud: number;
  /** 0..1 wind strength (storms live above ~0.7). */
  wind: number;
  /** Multi-day regime id ('windy-wet' brings the cosy drizzle). */
  regime?: string | undefined;
}

export interface SceneGrade {
  /** Sky gradient behind the world, top → horizon. */
  skyTop: number;
  skyBottom: number;
  /** Multiply wash over the whole world (never darker than ~0.45 lum —
   *  cosy night, not horror night). */
  tint: number;
  /** 0..1 strength of the energized-window glow + kit bloom. */
  glow: number;
  /** Frame vignette alpha. */
  vignette: number;
  /** 0..1 rain streak density (drizzle → downpour). */
  rain: number;
  /** 0..1 storm grading (darker wash, lightning lives above ~0.5). */
  storm: number;
  /** 0..1 wet sheen — streets/roofs catch the sky when it rains. */
  wet: number;
}

// --- small colour helpers ----------------------------------------------------

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function smooth(a: number, b: number, t: number): number {
  const k = clamp01((t - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** Lerp two 0xRRGGBB colours. */
export function mixRgb(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const r = Math.round(((a >> 16) & 0xff) + (((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * k);
  const g = Math.round(((a >> 8) & 0xff) + (((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * k);
  const bl = Math.round((a & 0xff) + ((b & 0xff) - (a & 0xff)) * k);
  return (r << 16) | (g << 8) | bl;
}

/** Relative luminance of 0xRRGGBB (sRGB, WCAG). */
export function luminance(c: number): number {
  const ch = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((c >> 16) & 0xff) + 0.7152 * ch((c >> 8) & 0xff) + 0.0722 * ch(c & 0xff);
}

/** WCAG contrast ratio between two 0xRRGGBB colours. */
export function contrastRatio(a: number, b: number): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- the day arc ---------------------------------------------------------------

/** GB-ish dawn/dusk hours off the season cycle: midsummer ~05:00–22:00,
 *  midwinter ~08:30–16:30. Same seasonFactor the sim's sun uses. */
export function dawnDuskHours(simTimeMin: number): { dawn: number; dusk: number } {
  const s = seasonFactor(simTimeMin); // 1 = deep winter, 0 = high summer
  return { dawn: 6.75 + 1.75 * (2 * s - 1), dusk: 19.25 - 2.75 * (2 * s - 1) };
}

interface Key {
  h: number;
  skyTop: number;
  skyBottom: number;
  tint: number;
  glow: number;
}

/** The colour script. Hours are anchored to dawn/dusk so the golden arc
 *  follows the seasons. One analogous ramp throughout: gold → dusty pink
 *  → muted purple → navy. */
function keysFor(dawn: number, dusk: number): Key[] {
  // Owner (2026-06-13): "Its a bit disturbing the flashing day night cycle…
  // make the change more subtle and its mostly done in the lights of the
  // buildings." So we DELIBERATELY compress the global WASH: the world-fabric
  // tint now swings only gently (night lifted from a dim 0x757db4 toward a
  // soft dusk-lilac, day pulled back from near-white) — the eye reads
  // time-of-day off the WINDOW GLOW, which still ramps the full 0→1. A
  // bright-noon-to-dark-night tint swing is what flashes; warm windows
  // coming on at dusk is what reads as cosy.
  const NIGHT: Omit<Key, 'h'> = {
    skyTop: 0x0a0e22,
    skyBottom: 0x221a38,
    // a soft dusk-lilac wash — deliberately NOT a dark navy (the owner asked
    // the 2026-06-13 "flashing" cycle be calmed; the time-of-day READ lives
    // in the WINDOW GLOW, glow:1). Night-deepening pass (owner-contested):
    // nudged one gentle step deeper (0xb9b2cc→0xada5c6, lum 0.465→0.399) so
    // powered windows POP harder by contrast, while staying well above the
    // cosy floor (grade.test pins lum>0.2) — a softer lilac, never horror-dark.
    tint: 0xada5c6,
    glow: 1,
  };
  const DAY: Omit<Key, 'h'> = {
    skyTop: 0x5e6fa3, // soft lavender-blue, not noon white
    skyBottom: 0xf2c891, // warm haze at the horizon all day
    tint: 0xf6ecdc, // gentle warm gold cast (pulled back from near-white)
    glow: 0,
  };
  return [
    { h: 0, ...NIGHT },
    { h: dawn - 1.2, ...NIGHT },
    // dawn: the lilac warms through a soft pink — only a small tint move
    { h: dawn, skyTop: 0x2a2350, skyBottom: 0xe0697a, tint: 0xd6c6d0, glow: 0.62 },
    { h: dawn + 1.4, ...DAY },
    { h: dusk - 2.4, ...DAY },
    // golden hour: the SKY warms and the first windows come on; the world
    // tint barely moves
    { h: dusk - 1.0, skyTop: 0x565f96, skyBottom: 0xf5b36e, tint: 0xf3e2cc, glow: 0.3 },
    // sunset: orange horizon under a plum sky — carried by the SKY, the
    // world tint stays a warm neutral
    { h: dusk - 0.2, skyTop: 0x4a3567, skyBottom: 0xff8a5e, tint: 0xe9d6cc, glow: 0.62 },
    // dusk: pink dies to muted purple; the city carries the light (glow high)
    { h: dusk + 0.6, skyTop: 0x251d44, skyBottom: 0x8a4a78, tint: 0xc7bcd2, glow: 0.9 },
    { h: dusk + 1.5, ...NIGHT },
    { h: 24, ...NIGHT },
  ];
}

/** The full scene grade for a sim-minute + live weather. */
export function sceneGrade(simTimeMin: number, weather: WeatherLike): SceneGrade {
  const h = (simTimeMin / 60) % 24;
  const { dawn, dusk } = dawnDuskHours(simTimeMin);
  const keys = keysFor(dawn, dusk);
  let a = keys[0] as Key;
  let b = keys[keys.length - 1] as Key;
  for (let i = 0; i + 1 < keys.length; i++) {
    const k0 = keys[i];
    const k1 = keys[i + 1];
    if (k0 && k1 && h >= k0.h && h <= k1.h) {
      a = k0;
      b = k1;
      break;
    }
  }
  const t = b.h > a.h ? clamp01((h - a.h) / (b.h - a.h)) : 0;
  let skyTop = mixRgb(a.skyTop, b.skyTop, t);
  let skyBottom = mixRgb(a.skyBottom, b.skyBottom, t);
  let tint = mixRgb(a.tint, b.tint, t);
  const glowBase = a.glow + (b.glow - a.glow) * t;

  // weather sits on top of the time-of-day arc. Cloud greys the day out
  // (rainy-day-cosy: dusty lavender, never black); storms grade darker
  // and cooler still.
  const daylight = 1 - glowBase; // 1 at noon, 0 at night
  const cloudK = smooth(0.35, 0.85, weather.cloud) * (0.25 + 0.45 * daylight);
  skyTop = mixRgb(skyTop, 0x575a78, cloudK);
  skyBottom = mixRgb(skyBottom, 0x8a8499, cloudK);
  tint = mixRgb(tint, 0xb2aec2, cloudK * 0.8);

  const storm = smooth(0.68, 0.85, weather.wind);
  const drizzle =
    weather.regime === 'windy-wet' || weather.regime === 'storm'
      ? smooth(0.5, 0.78, weather.cloud)
      : smooth(0.82, 0.95, weather.cloud) * 0.5;
  const rain = clamp01(Math.max(drizzle * 0.7, storm));
  if (storm > 0) {
    skyTop = mixRgb(skyTop, 0x2e2a44, storm * 0.6);
    skyBottom = mixRgb(skyBottom, 0x4e4663, storm * 0.6);
    tint = mixRgb(tint, 0x8d8aa8, storm * 0.5);
  }
  const wet = clamp01(rain * 0.85 + storm * 0.15);
  // rain at night still wants the windows on
  const glow = clamp01(glowBase + cloudK * 0.25 * daylight);

  return {
    skyTop,
    skyBottom,
    tint,
    glow,
    vignette: 0.1 + 0.08 * glow + 0.1 * storm,
    rain,
    storm,
    wet,
  };
}

// --- seasons (#44) -------------------------------------------------------------

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** Calendar season of a sim-minute (game starts 1 May). */
export function seasonOf(simTimeMin: number): Season {
  const doy = (GAME_START_DOY + simTimeMin / MIN_PER_DAY) % 365;
  if (doy < 59 || doy >= 335) return 'winter'; // Dec–Feb
  if (doy < 151) return 'spring'; // Mar–May
  if (doy < 243) return 'summer'; // Jun–Aug
  return 'autumn'; // Sep–Nov
}

/** Multiply tints that make the countryside breathe with the calendar:
 *  winter frost/bare-plough, spring green flush, summer gold (the base
 *  art), autumn stubble + amber trees. Keyed by sprite-name prefix so the
 *  renderer and the preview tool agree; undefined = leave the sprite as
 *  baked. Multiply-only keeps it one property write per sprite. */
const SEASON_TINTS: Array<[prefix: string, tints: Partial<Record<Season, number>>]> = [
  // crops: spring flush of green, autumn cut to pale stubble, winter bare.
  // Multiply can only pull channels DOWN, so winter is drabbed (green
  // suppressed hard) rather than frosted lighter — bare-earth midwinter.
  ['ground_field', { winter: 0x9c9aa8, spring: 0xbcd6a0, autumn: 0xdccaa4 }],
  ['ground_rape', { winter: 0x8e8a98, summer: 0xbccb96, autumn: 0xcdc098 }],
  ['ground_plough', { winter: 0xb8c0d6 }],
  // grass: drab dormant in winter, vivid in spring; summer holds a muted
  // green-belt sward (NOT a parched American gold — owner: lusher greens)
  ['ground_grass', { winter: 0xb2a298, spring: 0xccf0b6, summer: 0xdde8b0, autumn: 0xdcccaa }],
  ['ground_park', { winter: 0xbaaaa0, spring: 0xceeeba, summer: 0xdeebb4, autumn: 0xdccfac }],
  ['ground_moor', { winter: 0xaab2a4, spring: 0xcceeb4, autumn: 0xd2d2a8 }],
  ['ground_marsh', { winter: 0xa39c9e, autumn: 0xe6d6ae }],
  // canopy: bare-branch brown-grey in winter, amber blaze in autumn
  ['trees_', { winter: 0xa68e80, spring: 0xddffc8, autumn: 0xffc488 }],
  ['hedgerow_', { winter: 0xa28c7e, spring: 0xddffc8, autumn: 0xf5c490 }],
  ['orchard_', { winter: 0xa69282, spring: 0xe8ffd0, autumn: 0xffcf96 }],
  ['hill_', { winter: 0xaca8bc, autumn: 0xe8d4b8 }],
  ['park_', { winter: 0xb8aaa2, spring: 0xdcf7ca, autumn: 0xecdcb8 }],
];

export function seasonTintFor(sprite: string, season: Season): number | undefined {
  for (const [prefix, tints] of SEASON_TINTS) {
    if (sprite.startsWith(prefix)) return tints[season];
  }
  return undefined;
}
