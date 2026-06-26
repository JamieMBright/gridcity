// City building VARIETY (owner, 2026-06, screenshots): Berlin "wtf is this" — a
// homogenous mass of identical mid-rise blocks; Pune "just a homogenous layering
// of tower blocks". The bespoke per-city stock must read as a MIX (low + mid +
// tall archetypes, many distinct sprite keys across a district), not the same
// handful of blocks tiled. This locks that in so a future change can't silently
// flatten a generated city back to a monoculture. London is untouched (its
// fabric never hits these branches; guarded by cityDensity.test.ts).
import { describe, expect, it } from 'vitest';
import { makeTestMap } from './helpers';
import { fillDerivedLayers } from '../src/data/cityData';
import { ZONE } from '../src/sim/map/types';
import { structureSpriteFor } from '../src/render/tileChooser';

/** Every non-undefined structure sprite over an urban-zoned block, with the
 *  #114 density-thin reversed for the count (we measure the variety of what
 *  RENDERS, not how many tiles render). */
function spritesFor(fabric: string, zone: number): string[] {
  const map = makeTestMap(48, 48);
  (map as { fabric?: string }).fabric = fabric;
  map.zone.fill(zone);
  fillDerivedLayers(map); // populate the per-tile variant the chooser reads
  const out: string[] = [];
  for (let y = 2; y < 46; y++) {
    for (let x = 2; x < 46; x++) {
      const s = structureSpriteFor(map, x, y);
      if (s) out.push(s);
    }
  }
  return out;
}

/** The archetype family of a sprite key (strip the trailing _<variant>). */
function family(key: string): string {
  return key.replace(/_\d+$/, '');
}

describe('generated-city building variety', () => {
  for (const { fabric, families } of [
    // Berlin: low corner houses + mid Altbau/Plattenbau + a tall point block.
    { fabric: 'berlin', families: ['berlinlow', 'altbau', 'plattenbau', 'berlintower'] },
    // Pune: low pukka houses + mid RCC flats + heritage wadas + a tall highrise.
    { fabric: 'pune', families: ['punelow', 'puneflat', 'wada', 'punetower'] },
  ] as const) {
    describe(fabric, () => {
      for (const zone of [ZONE.urbanCore, ZONE.urban, ZONE.suburb] as const) {
        it(`mixes several archetype families in zone ${zone}`, () => {
          const sprites = spritesFor(fabric, zone);
          expect(sprites.length).toBeGreaterThan(50);
          const fams = new Set(sprites.map(family));
          // a real district reads as a MIX, not one repeated block: at least
          // three distinct archetype families render across the block.
          expect(fams.size).toBeGreaterThanOrEqual(3);
          // and a healthy spread of distinct variant keys (heights/colours),
          // so it isn't 3 families each tiled identically.
          const keys = new Set(sprites);
          expect(keys.size).toBeGreaterThanOrEqual(8);
        });
      }

      it('uses both a LOW and a TALL accent archetype somewhere', () => {
        // across the dense core the fabric must span the height range — a low
        // 2–3 storey house AND a tall point-block/highrise, the owner's ask.
        const core = new Set(spritesFor(fabric, ZONE.urbanCore).map(family));
        expect([...core].some((f) => f === families[0])).toBe(true); // low
        expect([...core].some((f) => f === families[3])).toBe(true); // tall
      });
    });
  }

  it('does not flatten neighbouring tiles to one sprite (Berlin urbanCore)', () => {
    // the old bug: variant keyed on the 8×8 estate hash ⇒ whole blocks identical.
    // Sample a single 8×8 estate block and assert it is NOT one repeated key.
    const map = makeTestMap(16, 16);
    (map as { fabric?: string }).fabric = 'berlin';
    map.zone.fill(ZONE.urbanCore);
    fillDerivedLayers(map);
    const block: string[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const s = structureSpriteFor(map, x, y);
        if (s) block.push(s);
      }
    }
    expect(new Set(block).size).toBeGreaterThanOrEqual(3);
  });
});
