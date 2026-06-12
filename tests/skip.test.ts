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
  it('finds the NEXT 18:00 / 06:00, never today-or-earlier', () => {
    expect(skipTargetMin(0, 'peak')).toBe(18 * 60);
    expect(skipTargetMin(17 * 60, 'peak')).toBe(18 * 60);
    expect(skipTargetMin(18 * 60, 'peak')).toBe(18 * 60 + 1440); // exactly on it → tomorrow
    expect(skipTargetMin(19 * 60, 'peak')).toBe(18 * 60 + 1440);
    expect(skipTargetMin(0, 'morning')).toBe(6 * 60);
    expect(skipTargetMin(6 * 60 + 7.5, 'morning')).toBe(6 * 60 + 1440);
    // day 4, 03:30 → day 4, 18:00
    expect(skipTargetMin(3 * 1440 + 210, 'peak')).toBe(3 * 1440 + 18 * 60);
  });

  it('an event-skip aims 7 game-days out (expects to stop early)', () => {
    expect(skipTargetMin(1234.5, 'event')).toBe(1234.5 + SKIP_EVENT_MAX_MIN);
  });
});

describe('skipTickSpeed schedule', () => {
  it('downshifts 16→4→1 and lands exactly on any 7.5-aligned target', () => {
    for (const start of [0, 7.5, 322.5, 1072.5, 1080, 5 * 1440 + 637.5]) {
      for (const to of ['peak', 'morning'] as const) {
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
    for (const to of ['peak', 'morning', 'event'] as const) {
      expect(skipAborts(events, 1, to)).toBe(true);
    }
  });

  it("'warn' only stops an event-skip (that arrival IS the destination)", () => {
    const events = [ev(2, 'warn')];
    expect(skipAborts(events, 1, 'peak')).toBe(false);
    expect(skipAborts(events, 1, 'morning')).toBe(false);
    expect(skipAborts(events, 1, 'event')).toBe(true);
  });

  it('stale events (seq ≤ baseline) and info never abort', () => {
    expect(skipAborts([ev(5, 'bad')], 5, 'peak')).toBe(false);
    expect(skipAborts([ev(6, 'info')], 5, 'event')).toBe(false);
  });
});

describe('skip determinism', () => {
  it('the skip schedule produces the identical state to playing at 16x', () => {
    // 0 → 18:00 is 1080 min = exactly nine 16x ticks, so the schedule
    // and a manual 16x session run the very same ticks
    const run = (mode: 'skip' | 'manual') => {
      const { state, ctx } = poweredFixture();
      const target = skipTargetMin(state.simTimeMin, 'peak');
      if (mode === 'skip') {
        let guard = 0;
        while (state.simTimeMin < target && guard++ < 20_000) {
          state.speed = skipTickSpeed(state.simTimeMin, target);
          advanceTime(state);
          solveTick(state, ctx, derive(state, ctx), true);
        }
      } else {
        state.speed = 16;
        for (let i = 0; i < 9; i++) {
          advanceTime(state);
          solveTick(state, ctx, derive(state, ctx), true);
        }
      }
      state.speed = 1; // the worker restores the pre-skip speed
      return serialize(state);
    };
    const a = run('skip');
    const b = run('manual');
    expect(a.simTimeMin).toBe(1080);
    expect(a).toEqual(b);
  });
});
