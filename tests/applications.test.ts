// Connection-application cadence (gameplay bug fix): the inbox must not go
// quiet. A neutral london game should field roughly one new GENERATION and
// one new DEMAND application per game-week — two independent seeded streams,
// not a single gen-heavy stream that starved demand out. Driven through the
// SAME tick path the worker uses (advanceTime + accumulating solveTick with
// rngState persisted), so the cadence asserted here is the cadence played.

import { describe, expect, it } from 'vitest';
import { newGame, newContext, seedScenario } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick } from '../src/sim/tick';
import { maybeSpawnApplications } from '../src/sim/events/applications';
import { Rng } from '../src/sim/rng';
import { makeTestMap, setZone } from './helpers';
import { ZONE } from '../src/sim/map/types';

/** Run a neutral london game for `weeks` game-weeks the worker's way, and
 *  count the NEW generation vs demand applications that spawned. */
function runWeeks(weeks: number): { gen: number; demand: number } {
  const state = newGame('london');
  const ctx = newContext('london');
  seedScenario(state, ctx);
  state.speed = 16;
  let derived = derive(state, ctx);
  const before = state.applications.length;
  const startMin = state.simTimeMin;
  while (state.simTimeMin - startMin < weeks * 7 * 1440) {
    advanceTime(state);
    if (derived.version !== deriveKey(state)) derived = derive(state, ctx);
    solveTick(state, ctx, derived, true);
  }
  let gen = 0;
  let demand = 0;
  for (const a of state.applications.slice(before)) {
    if (a.kind === 'solarFarm' || a.kind === 'windOnshore' || a.kind === 'battery') gen++;
    else demand++;
  }
  return { gen, demand };
}

describe('connection application cadence', () => {
  // 24 weeks of full london ticks over the denser Wave-8 map is ~4s of
  // sim, which can brush past the 5s default under parallel test load — give
  // it explicit headroom so it never flakes on timing.
  it('a neutral london game gets ~1 gen + ~1 demand application per game-week', () => {
    const weeks = 24;
    const { gen, demand } = runWeeks(weeks);
    // ~1/week each: generous bands (Poisson over 24 weeks) but BOTH streams
    // must clearly flow — the bug was demand stuck at zero for the whole run.
    expect(gen).toBeGreaterThanOrEqual(weeks * 0.5);
    expect(gen).toBeLessThanOrEqual(weeks * 2);
    expect(demand).toBeGreaterThanOrEqual(weeks * 0.5);
    expect(demand).toBeLessThanOrEqual(weeks * 2);
  }, 30_000);

  it('is deterministic for a fixed seed', () => {
    expect(runWeeks(8)).toEqual(runWeeks(8));
  }, 30_000);

  it('rolls an independent gen and demand stream off the seeded rng', () => {
    // a dense map so both gen sites (solar/battery on land) and demand
    // sites (data centre on urban core) can always be placed
    const map = makeTestMap(40, 40);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) setZone(map, x, y, ZONE.urbanCore);
    }
    // a few solar sites so generation has somewhere to go
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) map.zone[y * 40 + x] = ZONE.solarSite;
    const rng = new Rng(42);
    let gen = 0;
    let demand = 0;
    // 200 game-days; one chance() per stream per call
    for (let d = 0; d < 200; d++) {
      const apps = maybeSpawnApplications(map, rng, 1440, d * 1440, 50_000, 1, () => false);
      for (const a of apps) {
        if (a.kind === 'solarFarm' || a.kind === 'windOnshore' || a.kind === 'battery') gen++;
        else demand++;
      }
    }
    expect(gen).toBeGreaterThan(0);
    expect(demand).toBeGreaterThan(0);
  });
});
