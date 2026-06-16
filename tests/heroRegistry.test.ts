// The per-city BESPOKE-HERO registry — the W2 spine that breaks the old
// 255-value landmark-raster ceiling. These tests pin the invariants the rest
// of the hero work (W3+ adds sprites city by city) relies on, and make the
// hero doctrine MEASURABLE: the count-per-city test prints how many bespoke
// heroes each city carries (the metric later waves grow toward 100).

import { describe, expect, it } from 'vitest';
import {
  bespokeHeroesFor,
  footFor,
  frameIdFor,
  lightSpecFor,
  resolveBespokeKey,
} from '../src/render/sprites/heroes/registry';
import { buildAtlas } from '../src/render/sprites/atlas';
import { applyCityFabric, activeFabric, type CityFabric } from '../src/render/sprites/buildingSprites';
import { buildCityFromData, buildHeroTable } from '../src/data/cityData';
import { HERO_BASE, type CityMap } from '../src/sim/map/types';
import { PARIS_CITY } from '../src/data/cities/paris';

const ALL_FABRICS: CityFabric[] = [
  'london', 'paris', 'newyork', 'sydney', 'berlin', 'shanghai',
  'hongkong', 'capetown', 'cairo', 'athens', 'pune', 'northeast',
];

describe('hero registry — structural invariants', () => {
  it('every city file declares keys that are UNIQUE within the city', () => {
    for (const fabric of ALL_FABRICS) {
      const keys = bespokeHeroesFor(fabric).map((h) => h.key);
      expect(new Set(keys).size, `${fabric} has duplicate hero keys`).toBe(keys.length);
    }
  });

  it("every hero's declared city matches the module it lives in", () => {
    for (const fabric of ALL_FABRICS) {
      for (const h of bespokeHeroesFor(fabric)) {
        expect(h.city, `${fabric} module hero ${h.key} declares wrong city`).toBe(fabric);
      }
    }
  });

  it("every hero's foot is a positive integer tile size", () => {
    for (const fabric of ALL_FABRICS) {
      for (const h of bespokeHeroesFor(fabric)) {
        const [w, hh] = h.foot;
        expect(Number.isInteger(w) && w >= 1, `${h.key} foot.w`).toBe(true);
        expect(Number.isInteger(hh) && hh >= 1, `${h.key} foot.h`).toBe(true);
      }
    }
  });

  it('frameIdFor uses the hero_<city>_<key> format', () => {
    expect(frameIdFor('paris', 'tour-saint-jacques')).toBe('hero_paris_tour-saint-jacques');
    expect(frameIdFor('london', 'the-shard')).toBe('hero_london_the-shard');
  });

  it('footFor / lightSpecFor read back the registered values', () => {
    // read back dynamically (robust as each city's hero set grows toward 100):
    // footFor returns exactly the hero's registered foot; unknown key → [1,1].
    for (const h of bespokeHeroesFor('paris')) {
      expect(footFor('paris', h.key), `footFor ${h.key}`).toEqual([h.foot[0], h.foot[1]]);
    }
    expect(footFor('paris', 'does-not-exist')).toEqual([1, 1]);
    // at least one Paris hero carries a bespoke light; an unknown key → undefined.
    expect(bespokeHeroesFor('paris').some((h) => lightSpecFor('paris', h.key) !== undefined)).toBe(true);
    expect(lightSpecFor('paris', 'does-not-exist')).toBeUndefined();
  });
});

describe('hero registry — name resolution', () => {
  it("resolveBespokeKey matches Paris's proof heroes by their real placed names", () => {
    // both are real landmark:true places in the committed Paris artifact
    expect(resolveBespokeKey('paris', 'Tour Saint-Jacques')).toBe('tour-saint-jacques');
    expect(resolveBespokeKey('paris', 'Château de Vincennes')).toBe('chateau-de-vincennes');
  });

  it('a non-hero name resolves to nothing (keeps its archetype landmark)', () => {
    expect(resolveBespokeKey('paris', 'Hôtel Lebrun')).toBeUndefined();
    expect(resolveBespokeKey('paris', 'Quartier de Belleville')).toBeUndefined();
  });

  it('the proof-hero names actually exist as landmark:true places in the artifact', () => {
    const landmarkNames = PARIS_CITY.named.filter((p) => p.landmark).map((p) => p.name);
    expect(landmarkNames).toContain('Tour Saint-Jacques');
    expect(landmarkNames).toContain('Château de Vincennes');
  });
});

describe('hero registry — London bespoke heroes (W3)', () => {
  it('London now carries bespoke heroes with unique keys; marquee names resolve', () => {
    // W3 populated london.ts (was deliberately empty in W2). London render now
    // changes by design (its placement wiring + SAVE_VERSION bump land with it).
    const heroes = bespokeHeroesFor('london');
    expect(heroes.length, 'London should carry bespoke heroes (W3)').toBeGreaterThan(0);
    const keys = heroes.map((h) => h.key);
    expect(new Set(keys).size, 'London hero keys unique').toBe(keys.length);
    expect(resolveBespokeKey('london', 'The Shard')).toBe('the-shard');
  });
});

describe('hero registry — placement via buildCityFromData', () => {
  it('building Paris yields a non-empty heroTable and stamps >= HERO_BASE on the proof tiles', () => {
    const map: CityMap = buildCityFromData(PARIS_CITY);
    expect(map.heroTable, 'Paris should have a heroTable').toBeDefined();
    expect(map.heroTable!.length).toBeGreaterThan(0);
    // every slot key is a real registered Paris hero
    const parisKeys = new Set(bespokeHeroesFor('paris').map((h) => h.key));
    for (const slot of map.heroTable!) expect(parisKeys.has(slot.key)).toBe(true);

    // the raster carries >= HERO_BASE values, and each maps back to a slot
    const landmark = map.landmark!;
    let heroTiles = 0;
    const seenIdx = new Set<number>();
    for (let i = 0; i < landmark.length; i++) {
      const v = landmark[i]!;
      if (v >= HERO_BASE) {
        heroTiles++;
        const idx = v - HERO_BASE;
        seenIdx.add(idx);
        expect(map.heroTable![idx], `raster value ${v} has no slot`).toBeDefined();
      }
    }
    expect(heroTiles, 'expected hero footprint tiles in the raster').toBeGreaterThan(0);
    // many heroes now place (W4 round 1 ≈26; was 2 proof in W2). Robust to growth.
    expect(seenIdx.size, 'distinct heroes placed').toBeGreaterThan(5);
    expect(heroTiles, 'hero footprint tiles').toBeGreaterThanOrEqual(seenIdx.size);

    // the named places carry the resolved heroKey for UI/search; the marquee
    // proof heroes remain among them.
    const withKey = map.named!.filter((p) => p.heroKey).map((p) => p.heroKey);
    expect(withKey.length).toBeGreaterThan(5);
    expect(withKey).toContain('tour-saint-jacques');
    expect(withKey).toContain('chateau-de-vincennes');
  });

  it('buildHeroTable no-ops for a named place with NO bespoke match (additivity)', () => {
    // a place whose name matches no hero in the registry must never stamp a
    // >= HERO_BASE value — buildHeroTable leaves the raster + heroTable untouched
    // (this is what keeps non-hero labels / un-drawn cities byte-identical).
    const w = 4;
    const h = 4;
    const map: CityMap = {
      width: w,
      height: h,
      terrain: new Uint8Array(w * h),
      zone: new Uint8Array(w * h),
      council: new Uint8Array(w * h),
      road: new Uint8Array(w * h),
      customers: new Uint16Array(w * h),
      vegetation: new Uint8Array(w * h),
      variant: new Uint8Array(w * h),
      landmark: new Uint8Array(w * h),
      councils: [],
      fabric: 'london',
      named: [{ x: 1, y: 1, name: 'No Such Place ZZZ', landmark: true }],
    };
    expect(resolveBespokeKey('london', 'No Such Place ZZZ')).toBeUndefined();
    buildHeroTable(map);
    expect(map.landmark!.every((v) => v < HERO_BASE)).toBe(true);
    expect(map.heroTable).toBeUndefined();
  });
});

// Scoped to the fabrics THIS change touches: Paris (the only one with bespoke
// heroes ⇒ the only one whose sheet this PR can grow) and London (the
// byte-identity / empty-registry invariant). The all-12-fabric ≤4096 sweep is
// a pre-existing property covered by tests/landmarks.test.ts + the build-time
// guard in atlas.ts (and was verified across all 12 fabrics in review). One
// buildAtlas per fabric keeps each test short so the worker reporter never
// times out on a single long-running build.
describe('hero registry — atlas stays under the mobile-GPU ceiling', () => {
  it('Paris heroes ride their OWN buffers OFF the <= 4096 sheet (W2b overflow-proof)', () => {
    const prev = activeFabric();
    try {
      applyCityFabric('paris');
      const atlas = buildAtlas();
      expect(atlas.width, 'paris atlas width').toBeLessThanOrEqual(4096);
      expect(atlas.height, 'paris atlas height').toBeLessThanOrEqual(4096);
      // every Paris hero IS baked — but as its OWN off-sheet buffer, not a sheet frame
      for (const hero of bespokeHeroesFor('paris')) {
        const id = frameIdFor(hero.city, hero.key);
        expect(atlas.heroes.has(id), `paris missing hero buffer ${hero.key}`).toBe(true);
        const hb = atlas.heroes.get(id)!;
        expect(hb.w, `paris hero ${hero.key} buffer w`).toBeGreaterThan(0);
        expect(hb.pixels.length, `paris hero ${hero.key} buffer size`).toBe(hb.w * hb.h * 4);
        expect(atlas.frames.has(id), `paris hero ${hero.key} must NOT be in the packed sheet`).toBe(false);
      }
      // the packed sheet carries ZERO hero frames — THIS is what makes the
      // sheet immune to overflow no matter how many heroes W3/W4 add (100/city
      // would have overflowed a single 4096 sheet; 2 already hit Paris 4014).
      expect([...atlas.frames.keys()].filter((k) => k.startsWith('hero_'))).toHaveLength(0);
    } finally {
      applyCityFabric(prev);
    }
  }, 30000);

  it('London heroes ride OFF the <= 4096 sheet too (W3 — packed sheet stays hero-free)', () => {
    const prev = activeFabric();
    try {
      applyCityFabric('london');
      const atlas = buildAtlas();
      expect(atlas.width, 'london atlas width').toBeLessThanOrEqual(4096);
      expect(atlas.height, 'london atlas height').toBeLessThanOrEqual(4096);
      // London now carries bespoke heroes (W3) — but, like every city, they ride
      // their OWN off-sheet buffers, so the packed sheet stays hero-frame-free and
      // cannot overflow however many heroes London adds.
      expect([...atlas.frames.keys()].filter((k) => k.startsWith('hero_'))).toHaveLength(0);
      expect(atlas.heroes.size, 'london off-sheet heroes').toBeGreaterThan(0);
    } finally {
      applyCityFabric(prev);
    }
  }, 30000);
});

// The DOCTRINE METRIC: bespoke heroes placed per city. Printed so the owner /
// orchestrator can watch it climb toward the 100-per-city standard as the
// sprite-drawing waves (W3 London, W4 Paris, W5 the rest) land. W2 is the
// spine only: London 0 (byte-identity), Paris 2 (proof), the rest 0 for now.
describe('hero registry — DOCTRINE METRIC (bespoke heroes per city)', () => {
  it('counts and reports bespoke heroes per city', () => {
    const counts: Array<[CityFabric, number]> = ALL_FABRICS.map(
      (f) => [f, bespokeHeroesFor(f).length] as [CityFabric, number],
    );
    const lines = counts.map(([f, n]) => `  ${f.padEnd(10)} ${String(n).padStart(3)} / 100`);
    console.log('\nBESPOKE HERO COUNT PER CITY (doctrine: 100/city):\n' + lines.join('\n'));
    const total = counts.reduce((s, [, n]) => s + n, 0);
    console.log(`  ${'TOTAL'.padEnd(10)} ${String(total).padStart(3)} / 1200\n`);
    // Round 1 landed: London/Paris/Cairo/New York each carry a bespoke batch
    // (the other 8 cities fill in later batches). Lower bounds only — the waves
    // grow these toward the 100/city standard; this test measures + reports.
    const byCity = Object.fromEntries(counts) as Record<CityFabric, number>;
    expect(byCity.london, 'London bespoke heroes (W3 r1)').toBeGreaterThan(0);
    expect(byCity.paris, 'Paris bespoke heroes (W4 r1)').toBeGreaterThan(0);
    expect(byCity.cairo, 'Cairo bespoke heroes (W5 r1)').toBeGreaterThan(0);
    expect(byCity.newyork, 'New York bespoke heroes (W5 r1)').toBeGreaterThan(0);
  });
});
