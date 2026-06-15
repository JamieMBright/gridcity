// The hero TYPE → SPRITE RESOLVER (owner, 2026-06-15: hero discovery is
// automated; this closes the loop so every discovered hero auto-renders with
// NO per-building hand-curation). One resolver function maps a discovered
// hero's type / Wikidata-style / name / OSM tags → the best sprite landmark;
// both seeding pipelines route through it. These tests pin the mapping —
// crucially, that a discovered PYRAMID (any city, by name OR by type) resolves
// to the right bespoke split hero (Khufu/Khafre/Menkaure/Sphinx), plus a few
// representative others.

import { describe, expect, it } from 'vitest';
import { BESPOKE_FOOT, resolveHeroSprite } from '../tools/osm/heroSprite';
import { LANDMARK } from '../src/sim/map/types';
// the resolver's landmark must have a real sprite — pull the same map the
// renderer uses so the test fails if a verdict points at an unregistered id.
import { LANDMARK_SPRITE as SPRITE } from '../src/render/tileChooser';

describe('hero type → sprite resolver', () => {
  it('resolves the Pyramids of Giza to the SPLIT free-standing heroes — by name, type, AND native script', () => {
    // each named pyramid → its OWN bespoke sprite (the owner's 2026-06-15 split:
    // the real plateau spreads them out, so they're no longer one monolith).
    const byName: Array<[string, (typeof LANDMARK)[keyof typeof LANDMARK], string]> = [
      ['Great Pyramid of Giza', LANDMARK.pyramidGreat, 'lm_pyramid_great'],
      ['Pyramid of Khufu', LANDMARK.pyramidGreat, 'lm_pyramid_great'],
      ['Cheops', LANDMARK.pyramidGreat, 'lm_pyramid_great'],
      ['Pyramid of Khafre', LANDMARK.pyramidKhafre, 'lm_pyramid_khafre'],
      ['Chephren', LANDMARK.pyramidKhafre, 'lm_pyramid_khafre'],
      ['Pyramid of Menkaure', LANDMARK.pyramidMenkaure, 'lm_pyramid_menkaure'],
      ['Mykerinos', LANDMARK.pyramidMenkaure, 'lm_pyramid_menkaure'],
      // bare "pyramid"/"giza" with no pharaoh named → the Great Pyramid default
      ['Pyramides de Gizeh', LANDMARK.pyramidGreat, 'lm_pyramid_great'],
      ['الجيزة', LANDMARK.pyramidGreat, 'lm_pyramid_great'],
    ];
    for (const [name, lm, sprite] of byName) {
      const v = resolveHeroSprite({ name });
      expect(v.landmark, `"${name}" → ${sprite}`).toBe(lm);
      expect(v.kind).toBe('bespoke');
      expect(SPRITE[v.landmark]).toBe(sprite);
    }
    // the Sphinx is its OWN free-standing hero (incl. its Arabic name)
    expect(resolveHeroSprite({ name: 'Great Sphinx of Giza' }).landmark).toBe(LANDMARK.sphinx);
    expect(resolveHeroSprite({ name: 'تمثال أبو الهول' }).landmark).toBe(LANDMARK.sphinx);
    expect(SPRITE[LANDMARK.sphinx]).toBe('lm_sphinx');
    // by Wikidata TYPE when the name doesn't name a pharaoh → the Great default
    const byType = resolveHeroSprite({ name: 'Red Pyramid', type: 'pyramid' });
    expect(byType.landmark).toBe(LANDMARK.pyramidGreat);
    expect(byType.kind).toBe('bespoke');
    // each split hero carries its own broad+low bespoke footprint
    expect(BESPOKE_FOOT[LANDMARK.pyramidGreat]).toEqual({ w: 4, h: 4 });
    expect(BESPOKE_FOOT[LANDMARK.pyramidKhafre]).toEqual({ w: 3, h: 3 });
    expect(BESPOKE_FOOT[LANDMARK.pyramidMenkaure]).toEqual({ w: 2, h: 2 });
    expect(BESPOKE_FOOT[LANDMARK.sphinx]).toEqual({ w: 3, h: 2 });
  });

  it('routes other bespoke icons to their own sprites', () => {
    expect(resolveHeroSprite({ name: 'Eiffel Tower' }).landmark).toBe(LANDMARK.eiffel);
    expect(resolveHeroSprite({ name: 'Cathédrale Notre-Dame de Paris' }).landmark).toBe(LANDMARK.notredame);
    expect(resolveHeroSprite({ name: 'Arc de Triomphe' }).landmark).toBe(LANDMARK.arch);
    expect(resolveHeroSprite({ name: '30 St Mary Axe (The Gherkin)' }).landmark).toBe(LANDMARK.gherkin);
    // an airport (by OSM tag) and a stadium (by type) are bespoke too
    expect(resolveHeroSprite({ name: 'Cairo Intl', tags: { aeroway: 'aerodrome' } }).landmark).toBe(LANDMARK.airport);
    expect(resolveHeroSprite({ name: 'Cairo Stadium', type: 'stadium' }).landmark).toBe(LANDMARK.stadium);
    for (const lm of [LANDMARK.eiffel, LANDMARK.notredame, LANDMARK.arch, LANDMARK.gherkin, LANDMARK.airport, LANDMARK.stadium]) {
      expect(SPRITE[lm], `landmark ${lm} has a sprite`).toBeTruthy();
    }
  });

  it('maps the parameterised archetype long tail (no bespoke art)', () => {
    // a great worship dome (cathedral/mosque) → the domed hero
    expect(resolveHeroSprite({ name: 'Mosque of Muhammad Ali', tags: { amenity: 'place_of_worship' }, type: 'mosque' }).landmark).toBe(LANDMARK.dome);
    expect(resolveHeroSprite({ name: 'St Paul’s Cathedral', type: 'cathedral' }).landmark).toBe(LANDMARK.dome);
    // a town hall / seat of government → the grand civic block (ALWAYS a hero)
    const townhall = resolveHeroSprite({ name: 'Manchester Town Hall', tags: { amenity: 'townhall' } });
    expect(townhall.landmark).toBe(LANDMARK.grand);
    expect(townhall.kind).toBe('archetype');
    expect(resolveHeroSprite({ name: 'Grand Egyptian Museum', tags: { tourism: 'museum' } }).landmark).toBe(LANDMARK.grand);
    // a TALL tower → the slim skyscraper hero (by type, or measured height)
    expect(resolveHeroSprite({ name: 'Iconic Tower', type: 'skyscraper' }).landmark).toBe(LANDMARK.skyscraper);
    expect(resolveHeroSprite({ name: 'Some Tower', heightM: 180 }).landmark).toBe(LANDMARK.skyscraper);
  });

  it('keeps the small civic specials tile-sized (no apron) and rejects non-heroes', () => {
    expect(resolveHeroSprite({ name: 'St Mary’s Church', type: 'church' }).kind).toBe('tileCivic');
    expect(resolveHeroSprite({ name: 'St Mary’s Church', type: 'church' }).landmark).toBe(LANDMARK.church);
    expect(resolveHeroSprite({ name: 'Local Primary School', tags: { amenity: 'school' } }).landmark).toBe(LANDMARK.school);
    expect(resolveHeroSprite({ name: 'Public Library', tags: { amenity: 'library' } }).landmark).toBe(LANDMARK.civic);
    // a plain apartment block / unnamed shed is NOT a hero
    expect(resolveHeroSprite({ name: 'Flat 3', type: 'apartments' }).kind).toBe('none');
    expect(resolveHeroSprite({ type: 'yes' }).landmark).toBe(LANDMARK.none);
  });
});
