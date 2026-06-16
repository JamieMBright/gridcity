// Paris's bespoke-hero registry. For Wave W2 this carries 2 PROOF heroes that
// exercise the whole spine end-to-end (string key → atlas bake → runtime
// resolve+stamp into the heroTable → renderer draw with headroom → bespoke
// electrification light). They REUSE existing landmarkSprites draw fns — the
// point is proving the PIPE, not new art (W4 replaces these with the real 100
// bespoke Paris sprites from docs/heroes/paris/).
//
// Both names are real `landmark:true` places in src/data/cities/paris.ts that
// today resolve to a generic archetype, so the override is visibly exercised:
//   • Tour Saint-Jacques  — the 52 m flamboyant-Gothic tower in the 4th. Drawn
//     with bttowerTile (a tall slim spire, 1×1 + headroom) so it PROVES the
//     headroom lift; aerial-beacon light.
//   • Château de Vincennes — the medieval royal castle east of the city. Drawn
//     with domeTile (a 2×2 SW-anchored multi-tile block) so it PROVES the
//     multi-tile SW-anchored footprint stamp/draw path; facade-flood light.
//
// foot MUST equal each draw fn's own footprint:
//   bttowerTile → new Iso(1,1,{headroom:340})  ⇒ [1,1]
//   domeTile    → new Iso(2,2,{swAnchor:true}) ⇒ [2,2]

import type { BespokeHero } from './registry';
import { bttowerTile, domeTile } from '../landmarkSprites';

export const CITY_HEROES: BespokeHero[] = [
  {
    city: 'paris',
    key: 'tour-saint-jacques',
    match: /Tour Saint-Jacques/i,
    foot: [1, 1],
    seed: 901,
    draw: (seed) => bttowerTile(seed),
    light: { kind: 'aerialBeacon', topZ: 268, halfW: 0.32 },
  },
  {
    city: 'paris',
    key: 'chateau-de-vincennes',
    match: /Ch[âa]teau de Vincennes/i,
    foot: [2, 2],
    seed: 902,
    draw: (seed) => domeTile(seed),
    light: { kind: 'facadeFlood', topZ: 92, halfW: 1.0 },
  },
];
