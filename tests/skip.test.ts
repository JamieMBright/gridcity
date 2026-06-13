// Time-skip semantics: target-minute computation, the downshifting speed
// schedule landing exactly on target, abort rules, and determinism — a
// skip is the very same ticks the player could have played live.

import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_TICK,
  SKIP_EVENT_MAX_MIN,
  skipAborts,
  skipTargetMin,
  skipTickSpeed,
} from '../src/sim/protocol';
import { serialize, type GameEvent } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

describe('skipTargetMin', () => {
  it('jumps a fixed +7 / +30 game-days from now', () => {
    expect(skipTargetMin(0, 'week')).toBe(7 * 1440);
    expect(skipTargetMin(0, 'month')).toBe(30 * 1440);
    // anchored to NOW, not to a clock-of-day boundary
    expect(skipTargetMin(3 * 1440 + 210, 'week')).toBe(3 * 1440 + 210 + 7 * 1440);
    expect(skipTargetMin(3 * 1440 + 210, 'month')).toBe(3 * 1440 + 210 + 30 * 1440);
    expect(skipTargetMin(637.5, 'week')).toBe(637.5 + 7 * 1440);
  });

  it('an event-skip aims 7 game-days out (expects to stop early)', () => {
    expect(skipTargetMin(1234.5, 'event')).toBe(1234.5 + SKIP_EVENT_MAX_MIN);
  });
});

describe('skipTickSpeed schedule', () => {
  it('downshifts 16→4→1 and lands exactly on any 7.5-aligned target', () => {
    for (const start of [0, 7.5, 322.5, 1072.5, 1080, 5 * 1440 + 637.5]) {
      for (const to of ['week', 'month'] as const) {
        const target = skipTargetMin(start, to);
        let t = start;
        let guard = 0;
        while (t < target && guard++ < 20_000) {
          const speed = skipTickSpeed(t, target);
          expect([16, 4, 1]).toContain(speed);
          t += MINUTES_PER_TICK * speed;
        }
        expect(t).toBe(target);
      }
    }
  });

  it('runs flat out when far away', () => {
    expect(skipTickSpeed(0, 1080)).toBe(16);
    expect(skipTickSpeed(1080 - 120, 1080)).toBe(16);
    expect(skipTickSpeed(1080 - 119, 1080)).toBe(4);
    expect(skipTickSpeed(1080 - 30, 1080)).toBe(4);
    expect(skipTickSpeed(1080 - 22.5, 1080)).toBe(1);
    expect(skipTickSpeed(1080 - 7.5, 1080)).toBe(1);
  });
});

describe('skipAborts', () => {
  const ev = (seq: number, sev: GameEvent['sev']): GameEvent => ({
    seq,
    tMin: 0,
    sev,
    msg: sev === 'bad' ? '33 kV line fault' : 'something stirred',
  });

  it("a fresh 'bad' event (an injected fault) aborts every skip kind", () => {
    const events = [ev(1, 'info'), ev(2, 'bad')];
    for (const to of ['week', 'month', 'event'] as const) {
      expect(skipAborts(events, 1, to)).toBe(true);
    }
  });

  it("'warn' only stops an event-skip (that arrival IS the destination)", () => {
    const events = [ev(2, 'warn')];
    expect(skipAborts(events, 1, 'week')).toBe(false);
    expect(skipAborts(events, 1, 'month')).toBe(false);
    expect(skipAborts(events, 1, 'event')).toBe(true);
  });

  it('stale events (seq ≤ baseline) and info never abort', () => {
    expect(skipAborts([ev(5, 'bad')], 5, 'week')).toBe(false);
    expect(skipAborts([ev(6, 'info')], 5, 'event')).toBe(false);
  });
});

describe('skip determinism', () => {
  it('the skip schedule produces the identical state to playing at 16x', () => {
    // 0 → +7d is 10080 min = exactly eighty-four 16x ticks (120 min each),
    // so the downshifting schedule and a manual 16x session run the very
    // same ticks
    const run = (mode: 'skip' | 'manual') => {
      const { state, ctx } = poweredFixture();
      const target = skipTargetMin(state.simTimeMin, 'week');
      if (mode === 'skip') {
        let guard = 0;
        while (state.simTimeMin < target && guard++ < 90_000) {
          state.speed = skipTickSpeed(state.simTimeMin, target);
          advanceTime(state);
          solveTick(state, ctx, derive(state, ctx), true);
        }
      } else {
        state.speed = 16;
        for (let i = 0; i < 84; i++) {
          advanceTime(state);
          solveTick(state, ctx, derive(state, ctx), true);
        }
      }
      state.speed = 1; // the worker restores the pre-skip speed
      return serialize(state);
    };
    const a = run('skip');
    const b = run('manual');
    expect(a.simTimeMin).toBe(7 * 1440);
    expect(a).toEqual(b);
  });
});
