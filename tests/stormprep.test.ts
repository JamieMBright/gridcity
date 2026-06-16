// Storm preparation loop (ROADMAP #9): deterministic named-storm
// forecast off the regime pre-roll; surge crews swell the van roster for
// their window and expire; emergency veg cuts halve a corridor's
// overgrowth; every prep £k lands on the bill and decays away.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { MIDSUMMER_MIN, MIDWINTER_MIN } from '../src/sim/events/weather';
import {
  applySurgeCrews,
  emergencyVegCut,
  forecastStorms,
  SURGE_VANS,
} from '../src/sim/reliability/stormprep';
import { deserialize, newGame, serialize } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { mustApply, poweredFixture } from './helpers';

describe('forecastStorms — imminent (the pre-rolled next front)', () => {
  it('names a winter windy-wet front deterministically, with lead time', () => {
    const state = newGame();
    state.simTimeMin = MIDWINTER_MIN;
    state.weather = {
      cloud: 0.4,
      wind: 0.4,
      regime: 'mild',
      nextRegime: 'windy-wet',
      regimeEndsMin: MIDWINTER_MIN + 2 * 1440,
    };
    const f = forecastStorms(state);
    expect(f).toHaveLength(1);
    expect(f[0]?.name).toMatch(/^Storm [A-Z]/);
    expect(f[0]?.etaMin).toBe(2 * 1440);
    expect(f[0]?.severity).toBeGreaterThan(0.7); // storm band of the fault engine
    expect(f[0]?.confidence).toBe('imminent'); // it's the pre-rolled next front
    // pure + deterministic: same state, same forecast, name stable
    expect(forecastStorms(state)).toEqual(f);
    // the countdown runs as the clock does, the name holding
    state.simTimeMin += 1440;
    const later = forecastStorms(state);
    expect(later[0]?.etaMin).toBe(1440);
    expect(later[0]?.name).toBe(f[0]?.name);
    expect(later[0]?.confidence).toBe('imminent');
  });

  it('a pre-rolled named STORM is always imminent, summer or winter', () => {
    const state = newGame();
    state.simTimeMin = MIDSUMMER_MIN;
    state.weather = {
      cloud: 0.9,
      wind: 0.6,
      regime: 'mild',
      nextRegime: 'storm',
      regimeEndsMin: MIDSUMMER_MIN + 3 * 1440,
    };
    const f = forecastStorms(state);
    expect(f).toHaveLength(1);
    expect(f[0]?.confidence).toBe('imminent');
    expect(f[0]?.severity).toBeGreaterThan(0.85); // named-storm band
  });

  it('a SUMMER windy-wet front is not an imminent warning', () => {
    const state = newGame();
    state.simTimeMin = MIDSUMMER_MIN;
    state.weather = {
      cloud: 0.4,
      wind: 0.4,
      regime: 'mild',
      nextRegime: 'windy-wet',
      regimeEndsMin: MIDSUMMER_MIN + 2 * 1440,
    };
    // summer blows are just weather — no imminent warning (and high summer is
    // calm enough that the medium-range outlook is usually empty too)
    const f = forecastStorms(state);
    expect(f.every((r) => r.confidence !== 'imminent')).toBe(true);
  });
});

describe('forecastStorms — medium-range outlook (the ~7-day heads-up)', () => {
  it('surfaces a deterministic storm up to ~7 days out when none is imminent', () => {
    // deep winter, the next front is benign (calm-cold), so there is no
    // imminent warning — but a GB operator still gets a Met-Office heads-up of
    // the storm queuing behind it. The outlook must find one within the window.
    const state = newGame();
    state.simTimeMin = MIDWINTER_MIN;
    state.weather = {
      cloud: 0.4,
      wind: 0.4,
      regime: 'mild',
      nextRegime: 'calm-cold',
      regimeEndsMin: MIDWINTER_MIN + 2 * 1440,
    };
    const f = forecastStorms(state);
    expect(f).toHaveLength(1);
    expect(f[0]?.confidence).toBe('outlook');
    expect(f[0]?.name).toMatch(/^Storm [A-Z]/);
    expect(f[0]?.severity).toBeGreaterThan(0.7);
    // a genuine multi-day lead, inside the ~7-day window
    expect(f[0]?.etaMin).toBeGreaterThan(2 * 1440); // past the imminent slot
    expect(f[0]?.etaMin).toBeLessThanOrEqual(10 * 1440); // within the horizon
  });

  it('the outlook is stable within a regime and counts down smoothly', () => {
    const state = newGame();
    state.weather = {
      cloud: 0.4,
      wind: 0.4,
      regime: 'mild',
      nextRegime: 'calm-cold',
      regimeEndsMin: MIDWINTER_MIN + 2 * 1440,
    };
    state.simTimeMin = MIDWINTER_MIN;
    const first = forecastStorms(state)[0];
    expect(first?.confidence).toBe('outlook');
    // advance half a game-day without crossing the regime boundary: same storm,
    // eta down by exactly the elapsed time (no flicker, no re-seed)
    state.simTimeMin = MIDWINTER_MIN + 720;
    const later = forecastStorms(state)[0];
    expect(later?.name).toBe(first?.name);
    expect((first?.etaMin ?? 0) - (later?.etaMin ?? 0)).toBeCloseTo(720, 6);
  });

  it('deep summer is calm — no imminent and no outlook storm', () => {
    const state = newGame();
    state.simTimeMin = MIDSUMMER_MIN;
    state.weather = {
      cloud: 0.4,
      wind: 0.4,
      regime: 'mild',
      nextRegime: 'mild',
      regimeEndsMin: MIDSUMMER_MIN + 2 * 1440,
    };
    expect(forecastStorms(state)).toHaveLength(0);
  });
});

describe('surge crews', () => {
  it('raise the van roster for the window, then expire', () => {
    const { state, ctx } = poweredFixture();
    mustApply(state, ctx.map, { type: 'build', spec: { kind: 'depot', x: 2, y: 2 } });
    const r = applyCommand(state, ctx.map, { type: 'stormPrep', action: 'surge', days: 3 });
    expect(r.ok).toBe(true);
    expect(state.surgeVans).toBe(SURGE_VANS);
    expect(state.surgeUntilMin).toBe(state.simTimeMin + 3 * 1440);
    expect(state.stormPrepYrK ?? 0).toBeGreaterThan(0);

    state.speed = 1;
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);
    expect(state.vans.length).toBe(state.fleetSize + SURGE_VANS);

    // the contractors go home when the window closes
    state.simTimeMin = (state.surgeUntilMin ?? 0) + 60;
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);
    expect(state.vans.length).toBe(state.fleetSize);
  });

  it('validates the window and extends an active hire from its end', () => {
    const state = newGame();
    expect(applySurgeCrews(state, 0).ok).toBe(false);
    expect(applySurgeCrews(state, 99).ok).toBe(false);
    expect(applySurgeCrews(state, 2).ok).toBe(true);
    const firstEnd = state.surgeUntilMin ?? 0;
    expect(applySurgeCrews(state, 2).ok).toBe(true);
    expect(state.surgeUntilMin).toBe(firstEnd + 2 * 1440);
  });
});

describe('emergency vegetation cut', () => {
  it('halves the corridor overgrowth at a one-off cost', () => {
    const { state, ctx, ids } = poweredFixture();
    state.lineVeg.set(ids.line33, 0.8);
    const r = applyCommand(state, ctx.map, {
      type: 'stormPrep',
      action: 'vegCut',
      lineId: ids.line33,
    });
    expect(r.ok).toBe(true);
    expect(state.lineVeg.get(ids.line33)).toBeCloseTo(0.4);
    expect(state.stormPrepYrK ?? 0).toBeGreaterThan(0);
  });

  it('refuses cables, clear corridors and unknown lines', () => {
    const { state, ids } = poweredFixture();
    expect(emergencyVegCut(state, 999_999).ok).toBe(false);
    expect(emergencyVegCut(state, ids.line132).ok).toBe(false); // veg 0: nothing to cut
    expect(emergencyVegCut(state, ids.grid).ok).toBe(false); // not a line
  });
});

describe('bill integration + save round-trip', () => {
  it('storm-prep spend rides the constraint/damages line and decays', () => {
    const { state, ctx } = poweredFixture();
    applySurgeCrews(state, 7);
    const charged = state.stormPrepYrK ?? 0;
    expect(charged).toBeGreaterThan(5);

    state.speed = 1;
    advanceTime(state);
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.bill.constraintYrK).toBeCloseTo(state.stormPrepYrK ?? 0, 3);
    expect(state.stormPrepYrK ?? 0).toBeLessThan(charged); // EMA-style decay

    // paused re-solves neither decay nor charge anything
    const frozen = state.stormPrepYrK ?? 0;
    solveTick(state, ctx, derive(state, ctx), false);
    expect(state.stormPrepYrK ?? 0).toBe(frozen);
  });

  it('round-trips the new optional fields through save data', () => {
    const { state } = poweredFixture();
    applySurgeCrews(state, 5);
    const back = deserialize(serialize(state));
    expect(back.surgeUntilMin).toBe(state.surgeUntilMin);
    expect(back.surgeVans).toBe(state.surgeVans);
    expect(back.stormPrepYrK).toBeCloseTo(state.stormPrepYrK ?? 0);
    // pre-storm-prep saves hydrate clean
    const data = serialize(newGame());
    delete data.surgeUntilMin;
    delete data.surgeVans;
    delete data.stormPrepYrK;
    const old = deserialize(data);
    expect(old.surgeUntilMin).toBeUndefined();
    expect(old.stormPrepYrK).toBeUndefined();
  });
});
