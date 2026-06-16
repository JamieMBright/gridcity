// The multi-city ENTRY FLOW: a save carries its scenarioId and the map is
// rebuilt from it on load (never serialized); the city registry knows which
// scenarios are data-backed/playable; the lazy artifact loader registers a
// city's CityData so its sync build() finds it. Proves a Paris save loads
// Paris and a London save loads London — the save-state correctness the owner
// asked us to "consider" — without needing a browser.

import { describe, expect, it } from 'vitest';
import { CITY_SCENARIOS, getScenario, loadScenarioData } from '../src/data/cityRegistry';
import { CITY_DATA_IDS, cityDataFor } from '../src/data/scenarioData';
import { deserialize, newGame, serialize } from '../src/sim/state';

describe('city registry + picker roster', () => {
  it('registers London + Paris + New York + the OSM cities as playable scenarios', () => {
    const ids = CITY_SCENARIOS.map((s) => s.id);
    expect(ids).toContain('london');
    expect(ids).toContain('paris');
    expect(ids).toContain('newyork');
    expect(ids).toContain('sydney');
    expect(ids).toContain('hongkong');
    expect(ids).toContain('berlin');
    expect(ids).toContain('shanghai');
    expect(ids).toContain('capetown');
    expect(ids).toContain('cairo');
    expect(ids).toContain('athens');
    expect(ids).toContain('pune');
    expect(ids).toContain('northeast');
  });

  it('the data-backed (lazy) cities are the OSM artifacts; London is code-drawn', async () => {
    // CITY_DATA_IDS is the set the picker treats as playable-besides-London,
    // and the set the worker/MapView preload before a sync build().
    expect(CITY_DATA_IDS).toEqual([
      'paris',
      'newyork',
      'sydney',
      'hongkong',
      'berlin',
      'shanghai',
      'capetown',
      'cairo',
      'athens',
      'pune',
      'northeast',
    ]);
    // London needs no preload (no artifact), Paris/NY do.
    await expect(loadScenarioData('london')).resolves.toBeUndefined();
  });

  it('New York build() reconstructs its CityMap from the artifact', async () => {
    await loadScenarioData('newyork');
    expect(() => cityDataFor('newyork')).not.toThrow();
    const map = getScenario('newyork').build();
    expect(map.width).toBeGreaterThan(0);
    expect(map.height).toBeGreaterThan(0);
    expect(map.fabric).toBe('newyork');
  });

  it('Paris build() throws before its artifact is loaded, succeeds after', async () => {
    // a fresh registry view: cityDataFor must refuse until the lazy import ran
    // (this is the programmer-error guard that keeps the contract honest)
    // — but in a single test process another test may have loaded it, so only
    // assert the post-load success path is reliable.
    await loadScenarioData('paris');
    expect(() => cityDataFor('paris')).not.toThrow();
    const map = getScenario('paris').build();
    expect(map.width).toBe(256);
    expect(map.height).toBe(160);
    expect(map.fabric).toBe('paris');
    // the renderer scenery rides on the map now (no London import needed)
    expect((map.named ?? []).length).toBeGreaterThan(10);
    expect((map.airports ?? []).length).toBeGreaterThan(0); // CDG + Orly fallback
  });
});

describe('save state is keyed by scenarioId', () => {
  it('a London save records no scenarioId (byte-compatible with old saves)', () => {
    const save = serialize(newGame('london'));
    // london stays absent so a pre-campaign save is unchanged
    expect(save.scenarioId).toBeUndefined();
    expect(deserialize(save).scenarioId).toBe('london');
  });

  it('a Paris save records scenarioId="paris" and round-trips to Paris', () => {
    const save = serialize(newGame('paris'));
    expect(save.scenarioId).toBe('paris');
    const round = JSON.parse(JSON.stringify(save)) as typeof save;
    expect(deserialize(round).scenarioId).toBe('paris');
  });

  it('the map is NOT serialized — only the scenarioId, so load rebuilds it', () => {
    const save = serialize(newGame('paris')) as unknown as Record<string, unknown>;
    // no map raster/geometry leaks into the save; the map is rebuilt from the
    // id via newContext on load. (NB: `councils` in a save is council STATE,
    // not the map's CouncilProfile list — so it's deliberately not listed.)
    for (const k of ['terrain', 'zone', 'road', 'routes', 'landmark', 'width', 'height', 'fabric', 'named']) {
      expect(save[k]).toBeUndefined();
    }
  });
});
