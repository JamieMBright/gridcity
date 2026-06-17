// Medium-range storm OUTLOOK projection (W7d severe-weather v2): the
// deterministic ~7-day forward projection of the regime chain that gives a
// GB operator a Met-Office-style heads-up the live one-regime pre-roll
// (2–6 days) cannot. Asserts determinism, horizon/skip bounding, the
// winter-cut on windy-wet fronts, and that it NEVER touches the live RNG
// stream (covered indirectly here; weather.test.ts proves the live sequence
// is unchanged).

import { describe, expect, it } from 'vitest';
import {
  MIDSUMMER_MIN,
  MIDWINTER_MIN,
  projectStormWindow,
  REGIME_MIN_DAYS,
} from '../src/sim/events/weather';
import { OUTLOOK_HORIZON_MIN, STORM_WINTERNESS } from '../src/sim/reliability/stormprep';

const HORIZON = OUTLOOK_HORIZON_MIN;

/** First winter boundary (scanning forward from a base) for which the
 *  projection actually finds a storm — most do, but storms aren't on every
 *  boundary, so tests that need a hit pick a populated one deterministically. */
function winterBoundaryWithStorm(skip = 0): number {
  for (let d = 0; d < 90; d++) {
    const from = MIDWINTER_MIN + d * 1440;
    if (projectStormWindow(from, HORIZON, STORM_WINTERNESS, skip)) return from;
  }
  throw new Error('no winter boundary projected a storm — model regression');
}

describe('projectStormWindow', () => {
  it('finds a deterministic storm within the horizon in deep winter', () => {
    const from = winterBoundaryWithStorm();
    const a = projectStormWindow(from, HORIZON, STORM_WINTERNESS);
    const b = projectStormWindow(from, HORIZON, STORM_WINTERNESS);
    expect(a).toBeDefined();
    // pure + deterministic for a given boundary
    expect(a).toEqual(b);
    // a storm or a (winter) windy-wet front
    expect(['storm', 'windy-wet']).toContain(a!.regime);
    // inside the projected horizon
    expect(a!.startMin - from).toBeGreaterThanOrEqual(0);
    expect(a!.startMin - from).toBeLessThanOrEqual(HORIZON);
  });

  it('most deep-winter boundaries project a storm inside the horizon', () => {
    let hits = 0;
    const N = 60;
    for (let d = 0; d < N; d++) {
      if (projectStormWindow(MIDWINTER_MIN + d * 1440, HORIZON, STORM_WINTERNESS)) hits++;
    }
    // deep winter is stormy — the heads-up should be populated the large
    // majority of the time (realistic: an Atlantic low every week or two)
    expect(hits).toBeGreaterThan(N * 0.6);
  });

  it('respects the skip window (never reports inside the imminent slot)', () => {
    const skip = REGIME_MIN_DAYS * 1440;
    const from = winterBoundaryWithStorm(skip);
    const p = projectStormWindow(from, HORIZON, STORM_WINTERNESS, skip);
    expect(p).toBeDefined();
    expect(p!.startMin - from).toBeGreaterThanOrEqual(skip);
  });

  it('bounds the search to the horizon (no report past it)', () => {
    // a tiny horizon: most boundaries will be calm within it → undefined,
    // and any hit must still sit inside the horizon
    const tiny = 1440; // 1 day
    for (let d = 0; d < 30; d++) {
      const from = MIDWINTER_MIN + d * 1440;
      const p = projectStormWindow(from, tiny, STORM_WINTERNESS);
      if (p) expect(p.startMin - from).toBeLessThanOrEqual(tiny);
    }
  });

  it('never returns a summer windy-wet front (winter-cut), only storms', () => {
    // scan a band of mid-summer boundaries; any hit must be a real storm
    // (windy-wet is below the winterness cut in summer)
    let hits = 0;
    for (let d = 0; d < 40; d++) {
      const from = MIDSUMMER_MIN + d * 1440;
      const p = projectStormWindow(from, HORIZON, STORM_WINTERNESS);
      if (!p) continue;
      hits++;
      expect(p.regime).toBe('storm'); // never a summer windy-wet
    }
    // summer is calm — far fewer hits than winter (sanity, not exact)
    expect(hits).toBeLessThan(40);
  });

  it('each boundary reproduces its OWN projection (seeded off the boundary)', () => {
    const from = winterBoundaryWithStorm();
    const p1 = projectStormWindow(from, HORIZON, STORM_WINTERNESS);
    // re-running the same boundary is identical; a different boundary is its
    // own independent draw (seeded off that boundary, not a global stream)
    expect(projectStormWindow(from, HORIZON, STORM_WINTERNESS)).toEqual(p1);
    const other = projectStormWindow(from + 7 * 1440, HORIZON, STORM_WINTERNESS);
    expect(projectStormWindow(from + 7 * 1440, HORIZON, STORM_WINTERNESS)).toEqual(other);
  });

  it('projects a horizon of at least 7 days (the owner ask)', () => {
    expect(OUTLOOK_HORIZON_MIN).toBeGreaterThanOrEqual(7 * 1440);
  });
});
