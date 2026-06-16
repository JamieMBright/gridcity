// London's bespoke-hero registry. DELIBERATELY EMPTY for now: London must
// render BYTE-IDENTICALLY while the spine lands (the live game's atlas +
// every preview crop are pinned by md5). Wave W3 populates this from
// docs/heroes/london/ — 100 bespoke heroes, each a hand-drawn iso sprite with
// its own night electrification light — alongside a deliberate SAVE_VERSION
// bump (the new hero footprints move map geometry).
//
// While this array is empty, resolveBespokeKey('london', …) returns nothing,
// no `hero_london_*` frame bakes, and no `>= HERO_BASE` value is ever stamped
// — so the London path is completely unchanged.

import type { BespokeHero } from './registry';

export const CITY_HEROES: BespokeHero[] = [];
