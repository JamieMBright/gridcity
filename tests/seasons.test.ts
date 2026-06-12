// Seasons (ROADMAP item 5) and multi-day weather regimes (item 20):
// the winter↔summer cycle in demand and sun, the seeded regime state
// machine behind cloud/wind, winter-clustered storms, and the season
// selector on the grid-balance report.

import { describe, expect, it } from 'vitest';
import {
  domesticProfile,
  hpProfile,
  MIDSUMMER_MIN,
  MIDWINTER_MIN,
  newWeather,
  REGIME_MAX_DAYS,
  REGIME_MIN_DAYS,
  seasonFactor,
  simMinOfDoy,
  stepWeather,
  sunFactor,
  type WeatherState,
} from '../src/sim/events/weather';
import { isStorm } from '../src/sim/reliability/faults';
import { Rng } from '../src/sim/rng';
import { availAt, computeBalance } from '../src/sim/balance';
import { poweredFixture } from './helpers';

const DAY = 1440;

describe('season cycle', () => {
  it('peaks in midwinter, bottoms out in midsummer, and repeats yearly', () => {
    expect(seasonFactor(MIDWINTER_MIN)).toBeGreaterThan(0.99);
    expect(seasonFactor(MIDSUMMER_MIN)).toBeLessThan(0.01);
    expect(seasonFactor(MIDWINTER_MIN + 365 * DAY)).toBeCloseTo(
      seasonFactor(MIDWINTER_MIN),
      9,
    );
  });

  it('December sun-hours are far shorter (and weaker) than June', () => {
    const sunHours = (dayMin: number): number => {
      let hrs = 0;
      for (let m = 0; m < DAY; m += 10) {
        if (sunFactor(dayMin + m, { cloud: 0 }) > 0) hrs += 10 / 60;
      }
      return hrs;
    };
    const december = sunHours(simMinOfDoy(349)); // 15 Dec
    const june = sunHours(simMinOfDoy(172)); // 21 Jun
    expect(december).toBeLessThan(june);
    expect(december).toBeLessThan(10);
    expect(june).toBeGreaterThan(14);
    // the winter noon sun is also weaker, not just shorter
    const noonW = sunFactor(simMinOfDoy(349) + 13 * 60, { cloud: 0 });
    const noonS = sunFactor(simMinOfDoy(172) + 13 * 60, { cloud: 0 });
    expect(noonW).toBeLessThan(0.7 * noonS);
  });

  it('heat pumps run hard in winter and idle in summer; domestic gets a modest uplift', () => {
    const evening = 18 * 60;
    const hpW = hpProfile(MIDWINTER_MIN + evening, 0.35);
    const hpS = hpProfile(MIDSUMMER_MIN + evening, 0.35);
    expect(hpW).toBeGreaterThan(4 * hpS); // ×1.8 vs ×0.3 season scaling
    const domW = domesticProfile(MIDWINTER_MIN + evening);
    const domS = domesticProfile(MIDSUMMER_MIN + evening);
    expect(domW).toBeGreaterThan(1.1 * domS); // ~+15% vs ~−5%
    expect(domW).toBeLessThan(1.35 * domS); // …but only modest
  });
});

describe('grid balance season selector', () => {
  it('winter peak demand beats summer for the same network', () => {
    const { state, ctx } = poweredFixture();
    const peakOf = (season: 'winter' | 'summer'): number => {
      const report = computeBalance(state, ctx, season);
      expect(report.season).toBe(season);
      const whole = report.scopes[0];
      if (!whole) throw new Error('no scope');
      return Math.max(...whole.profile.map((p) => p.demandMW));
    };
    expect(peakOf('winter')).toBeGreaterThan(peakOf('summer'));
    // default stays the current date
    expect(computeBalance(state, ctx).season).toBe('today');
  });

  it('connected solar contributes less on the winter typical day', () => {
    expect(availAt('solarFarm', 12, MIDWINTER_MIN)).toBeLessThan(
      availAt('solarFarm', 12, MIDSUMMER_MIN),
    );
    // firm plant is season-blind
    expect(availAt('gasCCGT', 12, MIDWINTER_MIN)).toBe(1);
  });
});

describe('multi-day weather regimes', () => {
  /** Run a year of weather; return the regime boundary minutes and the
   *  regime sequence (exact — read off regimeEndsMin, not sampling). */
  const runYear = (seed: number): { bounds: number[]; regimes: string[] } => {
    const w = newWeather();
    const rng = new Rng(seed);
    const bounds: number[] = [];
    const regimes: string[] = [];
    let lastEnd = -1;
    for (let t = 0; t < 365 * DAY; t += 30) {
      stepWeather(w, rng, 30, t);
      if (w.regimeEndsMin !== lastEnd) {
        lastEnd = w.regimeEndsMin ?? -1;
        bounds.push(lastEnd);
        regimes.push(w.regime ?? '?');
      }
    }
    return { bounds, regimes };
  };

  it('regime lengths sit within 2–6 game-days and the year cycles through several', () => {
    const { bounds, regimes } = runYear(123);
    expect(bounds.length).toBeGreaterThan(Math.floor(365 / REGIME_MAX_DAYS) - 1);
    for (let i = 1; i < bounds.length; i++) {
      const durMin = (bounds[i] ?? 0) - (bounds[i - 1] ?? 0);
      expect(durMin).toBeGreaterThanOrEqual(REGIME_MIN_DAYS * DAY);
      expect(durMin).toBeLessThanOrEqual(REGIME_MAX_DAYS * DAY);
    }
    expect(new Set(regimes).size).toBeGreaterThan(1); // not stuck in one
  });

  it('the regime sequence is deterministic per seed', () => {
    const a = runYear(123);
    const b = runYear(123);
    expect(a.regimes).toEqual(b.regimes);
    expect(a.bounds).toEqual(b.bounds);
  });

  it('wind tracks its regime envelope: windy-wet runs high, calm-cold low', () => {
    const w = newWeather();
    const rng = new Rng(9);
    const byRegime = new Map<string, { sum: number; n: number }>();
    for (let t = 0; t < 3 * 365 * DAY; t += 30) {
      stepWeather(w, rng, 30, t);
      const agg = byRegime.get(w.regime ?? '?') ?? { sum: 0, n: 0 };
      agg.sum += w.wind;
      agg.n++;
      byRegime.set(w.regime ?? '?', agg);
    }
    const mean = (r: string): number => {
      const agg = byRegime.get(r);
      return agg && agg.n > 0 ? agg.sum / agg.n : NaN;
    };
    expect(mean('windy-wet')).toBeGreaterThan(0.55);
    expect(mean('calm-cold')).toBeLessThan(0.3);
  });

  it('storms cluster in winter (seeded statistical check)', () => {
    const stormMin = (startMin: number, seed: number): number => {
      const w = newWeather();
      const rng = new Rng(seed);
      let mins = 0;
      for (let t = startMin; t < startMin + 90 * DAY; t += 30) {
        stepWeather(w, rng, 30, t);
        if (isStorm(w.wind)) mins += 30;
      }
      return mins;
    };
    // 90-day windows centred on midwinter / midsummer
    const winter = stormMin(MIDWINTER_MIN - 45 * DAY, 7);
    const summer = stormMin(MIDSUMMER_MIN - 45 * DAY, 7);
    expect(winter).toBeGreaterThan(0);
    expect(winter).toBeGreaterThan(2 * summer);
  });

  it('hydrates a pre-season save: bare cloud/wind state grows regime fields', () => {
    const w: WeatherState = { cloud: 0.4, wind: 0.5 };
    stepWeather(w, new Rng(1), 30, 5000);
    expect(w.regime).toBeDefined();
    expect(w.nextRegime).toBeDefined();
    expect(w.regimeEndsMin ?? 0).toBeGreaterThan(5000);
  });
});
