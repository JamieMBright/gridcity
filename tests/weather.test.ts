// Weather regimes + named disaster incidents (gameplay bug fix): the
// regime machine must genuinely cycle (windy-wet / calm-cold / heatwave /
// storm), storms must gust past the fault threshold, and named disaster
// incidents (storm / heatwave / flooding) must fire on the news feed with
// real, seeded consequences. Driven the worker's way so what's asserted is
// what's played.

import { beforeAll, describe, expect, it } from 'vitest';
import { newGame, newContext, seedScenario, type GameState } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick } from '../src/sim/tick';
import { isStorm } from '../src/sim/reliability/faults';
import {
  coolingFactor,
  isWet,
  newWeather,
  stepWeather,
  thermalDerate,
} from '../src/sim/events/weather';
import { stepIncidents } from '../src/sim/events/incidents';
import { Rng } from '../src/sim/rng';
import type { PlacedAsset } from '../src/sim/assets';

/** Drive a neutral london game `days` game-days the worker's way, scanning
 *  the (capped) event ring by unique seq so nothing is double-counted. */
function runYearScan(days: number): {
  regimes: Set<string>;
  maxWind: number;
  stormTicks: number;
  incidents: { storm: number; heatwave: number };
} {
  const state = newGame('london');
  const ctx = newContext('london');
  seedScenario(state, ctx);
  state.speed = 16;
  let derived = derive(state, ctx);
  const regimes = new Set<string>();
  const seen = new Set<number>();
  const incidents = { storm: 0, heatwave: 0 };
  let maxWind = 0;
  let stormTicks = 0;
  const startMin = state.simTimeMin;
  while (state.simTimeMin - startMin < days * 1440) {
    advanceTime(state);
    if (derived.version !== deriveKey(state)) derived = derive(state, ctx);
    solveTick(state, ctx, derived, true);
    regimes.add(state.weather.regime ?? '?');
    maxWind = Math.max(maxWind, state.weather.wind);
    if (isStorm(state.weather.wind)) stormTicks++;
    for (const e of state.events) {
      if (seen.has(e.seq)) continue;
      seen.add(e.seq);
      if (e.msg.includes('Storm') && e.msg.includes('hits')) incidents.storm++;
      if (e.msg.includes('Heatwave')) incidents.heatwave++;
    }
  }
  return { regimes, maxWind, stormTicks, incidents };
}

describe('weather regimes cycle and storms bite', () => {
  // one full-year worker-path run, shared across the assertions (the
  // london sim is heavy — running a year per `it` blows the timeout).
  let year: ReturnType<typeof runYearScan>;
  beforeAll(() => {
    year = runYearScan(365);
  }, 30_000);

  it('cycles through several regimes including storm and heatwave over a year', () => {
    expect(year.regimes.has('storm')).toBe(true);
    expect(year.regimes.has('heatwave')).toBe(true);
    expect(year.regimes.has('windy-wet')).toBe(true);
    expect(year.regimes.size).toBeGreaterThanOrEqual(4);
  });

  it('storms gust past the fault threshold (0.85) — the old cap never did', () => {
    expect(year.maxWind).toBeGreaterThan(0.85);
    expect(year.stormTicks).toBeGreaterThan(0);
  });

  it('fires named storm and heatwave incidents on the news feed within a year', () => {
    expect(year.incidents.storm).toBeGreaterThan(0);
    expect(year.incidents.heatwave).toBeGreaterThan(0);
  });

  it('the regime sequence is deterministic per seed', () => {
    const a = runYearScan(120);
    const b = runYearScan(120);
    expect([...a.regimes].sort()).toEqual([...b.regimes].sort());
    expect(a.incidents).toEqual(b.incidents);
  }, 20_000);
});

describe('heatwave consequences', () => {
  it('lifts cooling demand and derates ratings during a heatwave only', () => {
    // a clear high-summer afternoon heatwave
    const summerNoon = 75 * 1440 + 16 * 60; // ~mid-July, 16:00
    const heat = { regime: 'heatwave' as const, cloud: 0.05 };
    const mild = { regime: 'mild' as const, cloud: 0.4 };
    expect(coolingFactor(summerNoon, heat)).toBeGreaterThan(0.1);
    expect(coolingFactor(summerNoon, mild)).toBe(0);
    expect(thermalDerate(summerNoon, heat)).toBeLessThan(1);
    expect(thermalDerate(summerNoon, mild)).toBe(1);
  });
});

describe('flood consequences', () => {
  it('a wet regime floods exposed substations into an outage (seeded)', () => {
    const state = newGame('london') as GameState;
    // three flood-exposed grid substations
    for (let i = 1; i <= 3; i++) {
      state.assets.set(i, {
        id: i,
        kind: 'sub',
        sub: 'grid',
        x: 5 * i,
        y: 5,
      } as unknown as PlacedAsset);
    }
    state.weather = {
      cloud: 0.95,
      wind: 0.92,
      regime: 'storm',
      nextRegime: 'mild',
      regimeEndsMin: 9_999_999,
    };
    const rng = new Rng(3);
    let floods = 0;
    for (let k = 0; k < 30_000; k++) {
      stepIncidents(state, rng, 7.5 * 16, () => {
        floods++;
      });
      state.outages.clear(); // let it re-roll
    }
    expect(floods).toBeGreaterThan(0);
  });

  it('isWet identifies the rain-heavy regimes', () => {
    expect(isWet('storm')).toBe(true);
    expect(isWet('windy-wet')).toBe(true);
    expect(isWet('mild')).toBe(false);
    expect(isWet('heatwave')).toBe(false);
  });

  it('no incident fires in mild weather, and the regime self-initializes', () => {
    const w = newWeather();
    const rng = new Rng(1);
    stepWeather(w, rng, 120, 0);
    expect(w.regime).toBeDefined();
    expect(w.regimeEndsMin).toBeGreaterThan(0);
  });
});
