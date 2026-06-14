// Storm call-handling + scouts model (owner domain spec): during a storm
// the interrupted customers all phone in; understaff the call centre and
// the answer time blows past the < 5 s target and CSAT goes negative.
// Scouts (office staff driving the lines) speed fault location → quicker
// restoration. These are pure, monotonic, deterministic — the tests pin
// the maths, the new stormPrep command actions, and the save round-trip.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import {
  BASE_CALL_CAPACITY,
  CALL_HANDLER_CAPACITY,
  CALL_HANDLERS_PER_ACTIVATION,
  CALL_TARGET_SECONDS,
  CALL_CSAT_FLOOR,
  SCOUTS_SPEED_MUL,
  applyScouts,
  applyWiderCallHandling,
  callAnswerSeconds,
  callCsatDelta,
  callHandlingCapacity,
  callHandlingView,
  callVolume,
  scoutSpeedMul,
} from '../src/sim/reliability/stormprep';
import { deserialize, newGame, serialize } from '../src/sim/state';
import { poweredFixture } from './helpers';

describe('call answer time model', () => {
  it('sits at the floor (< target) while volume is within capacity', () => {
    expect(callAnswerSeconds(0, BASE_CALL_CAPACITY)).toBeLessThan(CALL_TARGET_SECONDS);
    expect(callAnswerSeconds(BASE_CALL_CAPACITY, BASE_CALL_CAPACITY)).toBeLessThan(
      CALL_TARGET_SECONDS,
    );
  });

  it('climbs past the < 5 s target once volume overwhelms capacity', () => {
    // a big surge on the baseline-only centre blows the target
    const understaffed = callAnswerSeconds(BASE_CALL_CAPACITY * 3, BASE_CALL_CAPACITY);
    expect(understaffed).toBeGreaterThan(CALL_TARGET_SECONDS);
  });

  it('is monotonic: ↑ with volume, ↓ with capacity', () => {
    const cap = BASE_CALL_CAPACITY;
    expect(callAnswerSeconds(cap * 4, cap)).toBeGreaterThan(callAnswerSeconds(cap * 2, cap));
    // more capacity for the same volume answers faster
    expect(callAnswerSeconds(cap * 4, cap * 2)).toBeLessThan(callAnswerSeconds(cap * 4, cap));
  });

  it('wider call handling lifts capacity enough to pull a surge back into target', () => {
    const surge = BASE_CALL_CAPACITY * 4;
    const baseAns = callAnswerSeconds(surge, BASE_CALL_CAPACITY);
    expect(baseAns).toBeGreaterThan(CALL_TARGET_SECONDS); // understaffed: bad
    const drafted = BASE_CALL_CAPACITY + CALL_HANDLERS_PER_ACTIVATION * CALL_HANDLER_CAPACITY;
    const staffedAns = callAnswerSeconds(surge, drafted);
    expect(staffedAns).toBeLessThan(baseAns);
    expect(staffedAns).toBeLessThanOrEqual(CALL_TARGET_SECONDS); // back in target
  });

  it('callVolume is the interrupted-customer count, floored at 0', () => {
    expect(callVolume(1234)).toBe(1234);
    expect(callVolume(-5)).toBe(0);
  });
});

describe('call CSAT penalty', () => {
  it('is zero inside the < 5 s target (well-handled calls do not move the mood)', () => {
    expect(callCsatDelta(2)).toBe(0);
    expect(callCsatDelta(CALL_TARGET_SECONDS)).toBe(0);
  });

  it('goes negative past target and deepens with the hold, to a floor', () => {
    expect(callCsatDelta(CALL_TARGET_SECONDS + 3)).toBeLessThan(0);
    expect(callCsatDelta(CALL_TARGET_SECONDS + 10)).toBeLessThan(
      callCsatDelta(CALL_TARGET_SECONDS + 3),
    );
    expect(callCsatDelta(CALL_TARGET_SECONDS + 1000)).toBe(CALL_CSAT_FLOOR);
  });
});

describe('wider call handling lever', () => {
  it('drafts office handlers for the window, lifting capacity, then expiring', () => {
    const state = newGame();
    expect(callHandlingCapacity(state)).toBe(BASE_CALL_CAPACITY);
    const r = applyWiderCallHandling(state, 4);
    expect(r.ok).toBe(true);
    expect(state.callHandlersExtra).toBe(CALL_HANDLERS_PER_ACTIVATION);
    expect(callHandlingCapacity(state)).toBe(
      BASE_CALL_CAPACITY + CALL_HANDLERS_PER_ACTIVATION * CALL_HANDLER_CAPACITY,
    );
    expect(state.stormPrepYrK ?? 0).toBeGreaterThan(0); // cost rode the bill

    // the handlers go back to their day jobs when the window closes
    state.simTimeMin = (state.callHandlersUntilMin ?? 0) + 60;
    expect(callHandlingCapacity(state)).toBe(BASE_CALL_CAPACITY);
  });

  it('validates the window and extends an active draft from its end', () => {
    const state = newGame();
    expect(applyWiderCallHandling(state, 0).ok).toBe(false);
    expect(applyWiderCallHandling(state, 99).ok).toBe(false);
    expect(applyWiderCallHandling(state, 3).ok).toBe(true);
    const firstEnd = state.callHandlersUntilMin ?? 0;
    expect(applyWiderCallHandling(state, 3).ok).toBe(true);
    expect(state.callHandlersUntilMin).toBe(firstEnd + 3 * 1440);
  });

  it('the view reports a protected vs at-risk answer time around target', () => {
    const state = newGame();
    // baseline centre, big surge → understaffed, CSAT at risk
    const bad = callHandlingView(state, BASE_CALL_CAPACITY * 4);
    expect(bad.answerSeconds).toBeGreaterThan(CALL_TARGET_SECONDS);
    expect(bad.csatDelta).toBeLessThan(0);
    expect(bad.draftedHandlers).toBe(0);
    // draft wider call handling → same surge now in target, CSAT safe
    applyWiderCallHandling(state, 4);
    const good = callHandlingView(state, BASE_CALL_CAPACITY * 4);
    expect(good.answerSeconds).toBeLessThanOrEqual(CALL_TARGET_SECONDS);
    expect(good.csatDelta).toBe(0);
    expect(good.draftedHandlers).toBe(CALL_HANDLERS_PER_ACTIVATION);
  });
});

describe('scouts lever (eyes on the network)', () => {
  it('speeds restoration over the window, then reverts to 1x', () => {
    const state = newGame();
    expect(scoutSpeedMul(state)).toBe(1);
    const r = applyScouts(state, 4);
    expect(r.ok).toBe(true);
    expect(scoutSpeedMul(state)).toBe(SCOUTS_SPEED_MUL);
    expect(SCOUTS_SPEED_MUL).toBeGreaterThan(1); // faster fault location
    expect(state.stormPrepYrK ?? 0).toBeGreaterThan(0);
    state.simTimeMin = (state.scoutsUntilMin ?? 0) + 60;
    expect(scoutSpeedMul(state)).toBe(1);
  });

  it('validates the window', () => {
    const state = newGame();
    expect(applyScouts(state, 0).ok).toBe(false);
    expect(applyScouts(state, 99).ok).toBe(false);
    expect(applyScouts(state, 2).ok).toBe(true);
  });
});

describe('stormPrep command actions', () => {
  it("'shifts' is an alias for the crew surge engine", () => {
    const { state, ctx } = poweredFixture();
    const r = applyCommand(state, ctx.map, { type: 'stormPrep', action: 'shifts', days: 3 });
    expect(r.ok).toBe(true);
    expect((state.surgeVans ?? 0)).toBeGreaterThan(0);
  });

  it("'scouts' and 'callHandling' route to their levers", () => {
    const { state, ctx } = poweredFixture();
    expect(applyCommand(state, ctx.map, { type: 'stormPrep', action: 'scouts' }).ok).toBe(true);
    expect(state.scoutsUntilMin).toBeGreaterThan(state.simTimeMin);
    expect(applyCommand(state, ctx.map, { type: 'stormPrep', action: 'callHandling' }).ok).toBe(
      true,
    );
    expect(state.callHandlersExtra).toBe(CALL_HANDLERS_PER_ACTIVATION);
  });
});

describe('save round-trip', () => {
  it('round-trips scouts + call-handling windows; pre-feature saves hydrate clean', () => {
    const state = newGame();
    applyScouts(state, 5);
    applyWiderCallHandling(state, 5);
    const back = deserialize(serialize(state));
    expect(back.scoutsUntilMin).toBe(state.scoutsUntilMin);
    expect(back.callHandlersUntilMin).toBe(state.callHandlersUntilMin);
    expect(back.callHandlersExtra).toBe(state.callHandlersExtra);

    const data = serialize(newGame());
    delete data.scoutsUntilMin;
    delete data.callHandlersUntilMin;
    delete data.callHandlersExtra;
    const old = deserialize(data);
    expect(old.scoutsUntilMin).toBeUndefined();
    expect(old.callHandlersUntilMin).toBeUndefined();
    expect(old.callHandlersExtra).toBeUndefined();
  });
});
