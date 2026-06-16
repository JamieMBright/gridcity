// THE HERO TYPE → SPRITE RESOLVER (owner, 2026-06-15: "I shouldn't have to ask
// for specific hero buildings — you're supposed to AUTOMATE that process").
//
// Hero DISCOVERY is already automated (the OSM/Wikidata research in
// docs/heroes/<city>/ + the ranked docs/cities/<city>.md). This closes the
// loop: ONE function that maps a discovered hero's TYPE / Wikidata-style / name
// / OSM tags → the best sprite landmark id, with NO per-building hand-curation.
// Both seeding pipelines (tools/seededCity.ts and tools/osm/buildCityFromOsm.ts)
// route their heroes through here, so adding a new bespoke sprite (e.g. each of
// the Pyramids of Giza → lm_pyramid_great/khafre/menkaure, the Sphinx →
// lm_sphinx) makes EVERY matching discovered hero, in any city, auto-render it.
//
// The decision is a cascade, most-specific first:
//   1) BESPOKE icons — a hand-drawn one-of-a-kind sprite exists (pyramid,
//      Eiffel, Notre-Dame, the Louvre, Sacré-Cœur / a domed basilica, a
//      triumphal arch, the Gherkin, Tower Bridge, a stadium, an airport…).
//      Matched on name (the famous proper noun), Wikidata type, or OSM tag.
//   2) PARAMETERISED archetypes — the long tail with no bespoke art: a tall
//      TOWER → the skyscraper hero; a worship dome (cathedral/mosque/temple)
//      → the domed hero; a grand civic block (town hall / government / opera /
//      major museum / palace) → the grand generator; the small tile-civic
//      specials (parish church, school, rail station) keep their tile sprite;
//      ordinary civic → the 1×1 civic building.
//   3) none — not a hero (the caller decides the size fallback by footprint).
//
// Keeping the rules here (not duplicated in each pipeline) is the whole point:
// the discovered hero list grows from research; the sprite mapping is decided
// in exactly one place.

import { LANDMARK, type Landmark } from '../../src/sim/map/types';

/** Everything the resolver can look at about a discovered hero. All optional
 *  but `name`: a pipeline passes whatever it has (the OSM pipeline has rich
 *  tags; the seeded pipeline has the building kind + amenity/office/tourism).
 *  `type` / `style` are the Wikidata typeQids / styleQids LABELS surfaced by
 *  tools/researchHeroes.ts (e.g. type "pyramid", "monument", "skyscraper"). */
export interface HeroInput {
  /** The proper name (most diagnostic for the famous one-of-a-kind icons). */
  name?: string | undefined;
  /** Wikidata instance-of label(s), comma-joined (researchHeroes `type`). */
  type?: string | undefined;
  /** Wikidata architectural-style label(s) (researchHeroes `style`). */
  style?: string | undefined;
  /** OSM tags (building, amenity, office, tourism, historic, aeroway, man_made…). */
  tags?: Record<string, string> | undefined;
  /** Real height in metres, if known (a tall building → a skyscraper hero). */
  heightM?: number | undefined;
  /** Real number of storeys, if known. */
  levels?: number | undefined;
  /** Real footprint extent in tiles (max of width/height), if measured. */
  extentTiles?: number | undefined;
}

/** The resolver verdict: the landmark id + how to treat it. `kind` lets the
 *  caller size/clear correctly without re-deriving it:
 *   - 'bespoke'    one-of-a-kind sprite; size from its FOOT table or real extent
 *   - 'archetype'  a parameterised hero family (grand / skyscraper / dome)
 *   - 'tileCivic'  a 1×1 tile-sized building on normal fabric (no apron)
 *   - 'none'       not a hero. */
export interface HeroVerdict {
  landmark: Landmark;
  kind: 'bespoke' | 'archetype' | 'tileCivic' | 'none';
}

/** Bespoke icons with a FIXED multi-tile footprint baked into their sprite
 *  (everything else bespoke is sized from its real OSM extent). Mirrors the
 *  Iso(w,h) the sprite is registered with in atlas.ts. */
export const BESPOKE_FOOT: Partial<Record<Landmark, { w: number; h: number }>> = {
  // the Pyramids of Giza, SPLIT into free-standing heroes (owner, 2026-06-15) —
  // each broad + LOW, in its own size (mirrors PYRAMID_FOOT in landmarkSprites).
  [LANDMARK.pyramidGreat]: { w: 4, h: 4 }, // Khufu — the broadest, tallest mass
  [LANDMARK.pyramidKhafre]: { w: 3, h: 3 }, // Khafre — slightly smaller (casing cap)
  [LANDMARK.pyramidMenkaure]: { w: 2, h: 2 }, // Menkaure — clearly the smallest
  [LANDMARK.sphinx]: { w: 3, h: 2 }, // the Great Sphinx — low + long, couchant lion
  [LANDMARK.eiffel]: { w: 3, h: 3 },
  [LANDMARK.notredame]: { w: 2, h: 2 },
  [LANDMARK.louvre]: { w: 1, h: 1 },
  [LANDMARK.arch]: { w: 1, h: 1 },
  [LANDMARK.basilica]: { w: 1, h: 1 },
};

/** The famous proper-noun icons, matched on NAME (incl. native-script names so
 *  a non-English OSM name still resolves). Most specific → first. Each maps a
 *  recognisable monument to its bespoke sprite, in any city it's discovered. */
const NAME_ICONS: Array<[RegExp, Landmark]> = [
  // The Pyramids of Giza + the Great Sphinx — SPLIT into free-standing heroes
  // (owner, 2026-06-15), each mapped to its own bespoke sprite. ORDER MATTERS:
  // the Sphinx first (so it never gets eaten by a "pyramid"/"giza" rule), then
  // each named pyramid → its size, then bare "pyramid"/"giza" → the Great as the
  // default. Native script: Arabic for "Sphinx" (أبو الهول) / "pyramid(s)".
  [/sphinx|أبو ?الهول|تمثال أبو/iu, LANDMARK.sphinx],
  [/khafre|khafra|chephren|الهرم الأوسط/iu, LANDMARK.pyramidKhafre], // keeps the casing cap
  [/menkaure|mykerinos|menkaura|الهرم الأصغر/iu, LANDMARK.pyramidMenkaure],
  [/khufu|cheops|great pyramid|الهرم الأكبر/iu, LANDMARK.pyramidGreat],
  // bare "pyramid"/"giza" (no pharaoh named) → the Great Pyramid as the default
  [/\bpyramid|\bgiza\b|gizeh|gîza|أهرام|هرم|الجيزة/iu, LANDMARK.pyramidGreat],
  [/eiffel|tour eiffel/iu, LANDMARK.eiffel],
  [/notre[- ]?dame/iu, LANDMARK.notredame],
  [/louvre/iu, LANDMARK.louvre],
  [/arc de triomphe|porte saint[- ]?(denis|martin)|triumphal arch|brandenburg/iu, LANDMARK.arch],
  [/sacr[ée][- ]?c[œoe]ur|basilique|basilica/iu, LANDMARK.basilica],
  [/gherkin|30 st mary axe|swiss re/iu, LANDMARK.gherkin],
  [/tower bridge/iu, LANDMARK.towerBridge],
];

/** Wikidata TYPE labels (researchHeroes `type`) that pin a bespoke sprite —
 *  the resolver's "discovered heroes auto-resolve with no hand-curation" core:
 *  a thing typed "pyramid" gets the pyramid sprite even when its name didn't
 *  match the proper-noun list above. */
const TYPE_ICONS: Array<[RegExp, Landmark]> = [
  // a thing TYPED a pyramid (name didn't name a pharaoh) → the Great as default
  [/pyramid|mastaba/i, LANDMARK.pyramidGreat],
  [/triumphal arch|city gate/i, LANDMARK.arch],
];

/** Tall-building / skyscraper TYPE labels → the generic tall-tower hero. */
const SKYSCRAPER_TYPE = /skyscraper|high[- ]?rise|tower block|office tower|residential tower/i;

/** Worship that reads as a great DOME (cathedral/basilica/minster/mosque/
 *  temple) → the domed hero; an ordinary church/chapel stays a tile sprite. */
const GRAND_WORSHIP = /cathedral|basilica|minster|duomo|mosque|masjid|temple|synagogue|great church/i;
const TILE_WORSHIP = /church|chapel|abbey|priory|kirk/i;

/** Grand civic TYPES forced to hero treatment (owner, 2026-06-15) regardless
 *  of notability: town hall / seat of government / opera / major museum /
 *  palace / grand rail terminus. */
const GRAND_CIVIC = /city hall|town hall|guildhall|h[oô]tel de ville|rathaus|parliament|capitol|congress|ministry|government|palace|ch[âa]teau|opera|concert hall|philharmoni|symphony|conservatoire|museum|gallery|galerie|grand theatre/i;

/** Stadium / arena / sports-ground types → the stadium bowl. */
const STADIUM_TYPE = /stadium|stade|arena|estadio|ballpark|sports ground|football ground|cricket ground/i;

/** A castle/fort/citadel silhouette → the fortress sprite. */
const FORTRESS_TYPE = /castle|fort\b|fortress|citadel|ch[âa]teau fort|kremlin|kasbah/i;

const has = (re: RegExp, ...s: Array<string | undefined>): boolean =>
  s.some((x) => x != null && x.length > 0 && re.test(x));

/**
 * THE resolver. Decide the best sprite landmark for a discovered hero from its
 * type / style / name / OSM tags, with no per-building hand-curation. Both
 * pipelines call this; new bespoke sprites added to the cascade above light up
 * for every matching discovered hero automatically.
 */
export function resolveHeroSprite(h: HeroInput): HeroVerdict {
  const name = h.name ?? '';
  const type = h.type ?? '';
  const tags = h.tags ?? {};
  const building = tags.building ?? '';
  const amenity = tags.amenity ?? '';
  const tourism = tags.tourism ?? '';
  const historic = tags.historic ?? '';
  const manMade = tags.man_made ?? '';
  const office = tags.office ?? '';
  const blob = `${type} ${h.style ?? ''} ${building} ${historic} ${manMade}`;
  const bespoke = (lm: Landmark): HeroVerdict => ({ landmark: lm, kind: 'bespoke' });
  const archetype = (lm: Landmark): HeroVerdict => ({ landmark: lm, kind: 'archetype' });
  const tileCivic = (lm: Landmark): HeroVerdict => ({ landmark: lm, kind: 'tileCivic' });

  // 1) BESPOKE — proper-noun famous icons first (the most specific signal)…
  for (const [re, lm] of NAME_ICONS) if (re.test(name)) return bespoke(lm);
  // …then by Wikidata/OSM TYPE (a "pyramid"/"mastaba" with a non-matching name)
  for (const [re, lm] of TYPE_ICONS) if (has(re, type, building, historic, name)) return bespoke(lm);
  // airports are bespoke (the concrete terminal island)
  if (tags.aeroway === 'aerodrome' || has(/airport|a[ée]roport|aerodrome/i, type, name)) {
    return bespoke(LANDMARK.airport);
  }
  // a stadium bowl (bespoke sprite, sized to its real extent)
  if (has(STADIUM_TYPE, type, building, name) || tags.leisure === 'stadium') return bespoke(LANDMARK.stadium);
  // a castle / fort → the fortress
  if (has(FORTRESS_TYPE, type, building, historic, name)) return bespoke(LANDMARK.fortress);

  // 2) ARCHETYPES — the long tail with no one-of-a-kind art.
  // worship: a great dome vs an ordinary parish church
  if (amenity === 'place_of_worship' || has(/place of worship/i, type) || has(GRAND_WORSHIP, blob, name) || has(TILE_WORSHIP, blob, name)) {
    if (has(GRAND_WORSHIP, blob, name)) return archetype(LANDMARK.dome);
    return tileCivic(LANDMARK.church);
  }
  // grand civic block — town hall/government/opera/major museum/palace, ALWAYS
  // a hero (owner, 2026-06-15)
  if (office === 'government' || amenity === 'townhall' || has(GRAND_CIVIC, blob, name)) {
    // a MAJOR museum/gallery (named + tourism-tagged) is a hero; a small local
    // gallery stays ordinary civic
    if ((tourism === 'museum' || tourism === 'gallery') && !has(/museum|gallery/i, name) && name.length === 0) {
      return tileCivic(LANDMARK.civic);
    }
    return archetype(LANDMARK.grand);
  }
  if (tourism === 'museum' || tourism === 'gallery') {
    return name.length > 0 ? archetype(LANDMARK.grand) : tileCivic(LANDMARK.civic);
  }
  // a TALL tower → the slim skyscraper hero (type, or a measured tall building)
  if (has(SKYSCRAPER_TYPE, type, building, name) || (h.heightM ?? 0) >= 90 || (h.levels ?? 0) >= 25) {
    return archetype(LANDMARK.skyscraper);
  }
  // schools/colleges/universities → tile-sized civic special
  if (amenity === 'school' || amenity === 'college' || amenity === 'university' || has(/school|university|college/i, type, building)) {
    return tileCivic(LANDMARK.school);
  }
  // rail terminus → tile-sized station special
  if (building === 'train_station' || tags.railway === 'station' || has(/railway station|train station|gare/i, type, name)) {
    return tileCivic(LANDMARK.station);
  }
  // ordinary civic (library / clinic / public office / depot) → the 1×1 civic
  if (amenity === 'library' || amenity === 'clinic' || amenity === 'hospital' || amenity === 'public_building' || office === 'public' || has(/library|hospital|public building|civic/i, type, building)) {
    return tileCivic(LANDMARK.civic);
  }

  return { landmark: LANDMARK.none, kind: 'none' };
}
