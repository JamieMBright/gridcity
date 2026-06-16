// The per-city BESPOKE-HERO registry — the spine that breaks the old
// 255-value landmark-raster ceiling (LANDMARK enum, max 45). Heroes here are
// keyed by STRING and carried per CITY (one module file per city ⇒ collision-
// free parallel authoring), so 100 bespoke heroes × 12 cities is possible:
// the global LANDMARK enum stays for the shared archetype fabric (values
// < HERO_BASE), while each city's registered heroes bake into that fabric's
// atlas as `hero_<city>_<key>` frames and place via the map's runtime
// heroTable (landmark-raster value HERO_BASE + index).
//
// PURELY ADDITIVE: London's registry is EMPTY (W3 populates it deliberately
// with a save-version bump), so London produces no `>= HERO_BASE` raster
// value, bakes no extra frame, and renders byte-identically. Paris carries 2
// PROOF heroes that exercise the whole path end-to-end (string key → atlas
// bake → runtime resolve+stamp → renderer draw with headroom → bespoke light).
//
// HOW TO ADD A CITY'S BESPOKE HEROES (the shape W3+ sprite subagents fill in):
//   1. In src/render/sprites/heroes/<city>.ts export
//        export const CITY_HEROES: BespokeHero[] = [ … ];
//      one entry per hero. `key` is kebab-case + UNIQUE within the city
//      (the test enforces uniqueness); `match` is a RegExp tested against the
//      placed hero NAME from the city's `named` list (include native script
//      where the data carries it); `foot` MUST equal the footprint the `draw`
//      fn actually builds (its `new Iso(w,h,…)`) — a mismatch mis-slices the
//      atlas buffer; `seed` is any stable int; `draw(seed)` returns the raw
//      pixel buffer exactly like the landmark tile fns (e.g. eiffelTile(seed));
//      `light` (optional) is the bespoke electrification effect — omit to fall
//      back to the generic hero glow.
//   2. Register the module's array in CITY_HERO_MODULES below.
//   3. That's it — the atlas, fingerprint, placement and renderer all read the
//      registry; no enum edit, no artifact regen.

import type { CityFabric } from '../buildingSprites';
import type { HeroLightSpec } from '../../heroLights';
import { CITY_HEROES as LONDON_HEROES } from './london';
import { CITY_HEROES as PARIS_HEROES } from './paris';
import { CITY_HEROES as NEWYORK_HEROES } from './newyork';
import { CITY_HEROES as SYDNEY_HEROES } from './sydney';
import { CITY_HEROES as HONGKONG_HEROES } from './hongkong';
import { CITY_HEROES as BERLIN_HEROES } from './berlin';
import { CITY_HEROES as SHANGHAI_HEROES } from './shanghai';
import { CITY_HEROES as CAPETOWN_HEROES } from './capetown';
import { CITY_HEROES as CAIRO_HEROES } from './cairo';
import { CITY_HEROES as ATHENS_HEROES } from './athens';
import { CITY_HEROES as PUNE_HEROES } from './pune';
import { CITY_HEROES as NORTHEAST_HEROES } from './northeast';

/** One hand-authored bespoke hero for a specific city. */
export interface BespokeHero {
  /** the city whose fabric/atlas this hero bakes into */
  city: CityFabric;
  /** unique within the city, kebab-case (typically the doc filename stem),
   *  e.g. 'the-shard' — forms the atlas frame `hero_<city>_<key>`. */
  key: string;
  /** matches the PLACED hero NAME (from the city's `named` list); the first
   *  hero whose `match` tests a name wins. Include native script where the
   *  source data carries it. */
  match: RegExp;
  /** footprint in tiles (w, h) — MUST equal what `draw` actually builds. */
  foot: readonly [number, number];
  /** stable seed passed to `draw`. */
  seed: number;
  /** returns the raw RGBA pixel buffer, exactly like the landmark tile fns. */
  draw: (seed: number) => Uint8ClampedArray<ArrayBuffer>;
  /** bespoke night electrification light-show; omit ⇒ generic hero glow. */
  light?: HeroLightSpec | undefined;
}

/** Every city's hero module, imported EAGERLY (the arrays are tiny). London is
 *  deliberately empty for now (byte-identity invariant); other cities land in
 *  later waves. Keyed by fabric so a switch never serves another city's set. */
const CITY_HERO_MODULES: Partial<Record<CityFabric, BespokeHero[]>> = {
  london: LONDON_HEROES,
  paris: PARIS_HEROES,
  newyork: NEWYORK_HEROES,
  sydney: SYDNEY_HEROES,
  hongkong: HONGKONG_HEROES,
  berlin: BERLIN_HEROES,
  shanghai: SHANGHAI_HEROES,
  capetown: CAPETOWN_HEROES,
  cairo: CAIRO_HEROES,
  athens: ATHENS_HEROES,
  pune: PUNE_HEROES,
  northeast: NORTHEAST_HEROES,
};

const EMPTY: readonly BespokeHero[] = Object.freeze([]);

/** The bespoke heroes registered for a city (empty array when none). */
export function bespokeHeroesFor(city: CityFabric): BespokeHero[] {
  return CITY_HERO_MODULES[city] ?? (EMPTY as BespokeHero[]);
}

/** The registry key for a placed hero NAME in a city, or undefined if no
 *  bespoke hero matches (so the place keeps its archetype landmark). First
 *  match wins (registration order). */
export function resolveBespokeKey(city: CityFabric, name: string): string | undefined {
  for (const h of bespokeHeroesFor(city)) {
    if (h.match.test(name)) return h.key;
  }
  return undefined;
}

/** The atlas frame name for a city's hero key: `hero_<city>_<key>`. */
export function frameIdFor(city: CityFabric, key: string): string {
  return `hero_${city}_${key}`;
}

/** The bespoke light spec for a city's hero key, or undefined (⇒ generic
 *  hero glow at render time). */
export function lightSpecFor(city: CityFabric, key: string): HeroLightSpec | undefined {
  return bespokeHeroesFor(city).find((h) => h.key === key)?.light;
}

/** The footprint (w, h) in tiles for a city's hero key. Defaults to [1, 1]
 *  for an unknown key (defensive — placement always passes a real key). */
export function footFor(city: CityFabric, key: string): readonly [number, number] {
  return bespokeHeroesFor(city).find((h) => h.key === key)?.foot ?? [1, 1];
}
