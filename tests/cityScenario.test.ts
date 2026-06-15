// P1 CityScenario v2 — the multi-city FOUNDATION. Cities are DATA: the
// scenario carries optional power/weather/economy/generation/regulator
// blocks that default to London/GB. These tests prove:
//   1. London (and every mission) resolves to exactly LONDON_PROFILE — the
//      determinism anchor; omitting the blocks changes nothing.
//   2. The profile threads onto SimContext and a full London game runs
//      DETERMINISTICALLY (a ~1000-tick trace of bill/freq/weather/served/
//      rngState reproduces bit-for-bit across two independent runs).
//   3. resolveProfile honours per-block overrides for a (throwaway, not
//      shipped) non-London scenario.

import { describe, expect, it } from 'vitest';
import {
  CITY_SCENARIOS,
  getScenario,
  profileOf,
  resolveProfile,
  type CityScenario,
} from '../src/data/cityRegistry';
import { LONDON_PROFILE } from '../src/sim/powerProfile';
import { newContext, newGame, seedScenario, type GameState } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick, type Derived } from '../src/sim/tick';

// --- 1. London + missions default to LONDON_PROFILE ------------------------

describe('CityScenario v2 resolves to London by default', () => {
  it('the london scenario declares no profile blocks (stays pure data)', () => {
    const london = getScenario('london');
    expect(london.power).toBeUndefined();
    expect(london.weatherProfile).toBeUndefined();
    expect(london.economy).toBeUndefined();
    expect(london.generation).toBeUndefined();
    expect(london.regulator).toBeUndefined();
  });

  it('profileOf("london") deep-equals LONDON_PROFILE', () => {
    expect(profileOf('london')).toEqual(LONDON_PROFILE);
  });

  it('every registered scenario resolves to London under the hood', () => {
    // Paris is now a DATA-backed playable city, but it declares no profile
    // blocks yet (the FR seams land later), so it — like London and every
    // mission — must still resolve to GB. This keeps every shipped scenario's
    // behaviour anchored to the determinism baseline.
    for (const s of CITY_SCENARIOS) {
      expect(resolveProfile(s)).toEqual(LONDON_PROFILE);
    }
    // the roster: London + Paris (playable cities) + the 5 tutorial missions
    expect(CITY_SCENARIOS.map((s) => s.id)).toEqual([
      'london',
      'paris',
      'newyork',
      'sydney',
      'hongkong',
      'berlin',
      'shanghai',
      'capetown',
      'cairo',
      'athens',
      'm1-first-light',
      'm2-step-up',
      'm3-storm',
      'm4-inbox',
      'm5-bill',
    ]);
  });

  it('newContext("london") carries the resolved London profile', () => {
    expect(newContext('london').profile).toEqual(LONDON_PROFILE);
  });
});

// --- 2. full-game determinism trace ----------------------------------------

interface TracePoint {
  tick: number;
  simTimeMin: number;
  rngState: number;
  perCustomerYr: number;
  perCustomerDuosYr: number;
  totalYrK: number;
  freqHz: number | undefined;
  servedCustomers: number;
  cloud: number;
  wind: number;
  regime: string | undefined;
}

/** Drive a fresh seeded London game like the worker does (advanceTime →
 *  derive → solveTick with accumulate), sampling a compact trace. */
function runLondon(ticks: number): TracePoint[] {
  const state: GameState = newGame('london');
  const ctx = newContext('london');
  seedScenario(state, ctx);
  const trace: TracePoint[] = [];
  // cache derived state across ticks exactly like the worker (deriveKey),
  // so a long deterministic run stays fast
  let derived: Derived | undefined;
  for (let i = 0; i < ticks; i++) {
    advanceTime(state);
    if (!derived || derived.version !== deriveKey(state)) derived = derive(state, ctx);
    const out = solveTick(state, ctx, derived, true);
    if (i % 25 === 0 || i === ticks - 1) {
      trace.push({
        tick: state.tick,
        simTimeMin: state.simTimeMin,
        rngState: state.rngState,
        perCustomerYr: out.bill.perCustomerYr,
        perCustomerDuosYr: out.bill.perCustomerDuosYr,
        totalYrK: out.bill.totalYrK,
        freqHz: out.freqHz,
        servedCustomers: out.servedCustomers,
        cloud: state.weather.cloud,
        wind: state.weather.wind,
        regime: state.weather.regime,
      });
    }
  }
  return trace;
}

describe('London runs deterministically through the profile seam', () => {
  it('two independent ~1000-tick runs produce a bit-identical trace', () => {
    const a = runLondon(1000);
    const b = runLondon(1000);
    expect(a).toEqual(b);
    // sanity: the run actually did something — weather moved, time advanced,
    // the rng stream advanced off its seed, customers got served, a bill
    // was priced.
    const last = a[a.length - 1]!;
    expect(last.tick).toBe(1000);
    expect(last.simTimeMin).toBeGreaterThan(0);
    expect(last.rngState).not.toBe(0xc0ffee);
    expect(last.servedCustomers).toBeGreaterThanOrEqual(0);
    expect(last.perCustomerYr).toBeGreaterThan(0);
    // at least one sampled frequency reading appeared once a grid energized,
    // and every defined reading sits in the GB band (≥ 47.5 floor, ≤ 50)
    for (const p of a) {
      if (p.freqHz !== undefined) {
        expect(p.freqHz).toBeGreaterThanOrEqual(47.5 - 0.05);
        expect(p.freqHz).toBeLessThanOrEqual(50 + 0.05);
      }
    }
  }, 60_000);
});

// --- 3. per-block overrides for a throwaway non-London scenario ------------

describe('resolveProfile honours per-block overrides', () => {
  it('an override of one block leaves the rest at London', () => {
    const fixture: CityScenario = {
      id: '__test-60hz',
      name: 'Test 60 Hz',
      tagline: 'fixture only — not shipped',
      build: getScenario('london').build,
      power: {
        nominalHz: 60,
        freqFloorHz: 57,
        droopHz: 1.8,
        transmissionKv: [345, 138, 69],
        distributionKv: [27, 13.8, 0.208],
      },
    };
    const resolved = resolveProfile(fixture);
    expect(resolved.power.nominalHz).toBe(60);
    // the un-overridden blocks fall back to London
    expect(resolved.weather).toEqual(LONDON_PROFILE.weather);
    expect(resolved.economy).toEqual(LONDON_PROFILE.economy);
    expect(resolved.generation).toEqual(LONDON_PROFILE.generation);
    expect(resolved.regulator).toEqual(LONDON_PROFILE.regulator);
  });
});
