// Time-skip semantics: target-minute computation, the downshifting speed
// schedule landing exactly on target, abort rules, and determinism — a
// skip is the very same ticks the player could have played live.

import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_TICK,
  SKIP_EVENT_MAX_MIN,
  skipAborts,
  skipHaltEvent,
  skipTargetMin,
  skipTickSpeed,
  type SkipTarget,
} from '../src/sim/protocol';
import { pushEvent, serialize, type GameEvent } from '../src/sim/state';
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
  const ev = (seq: number, sev: GameEvent['sev'], major = false): GameEvent => ({
    seq,
    tMin: 0,
    sev,
    major,
    msg: sev === 'bad' ? (major ? 'Storm Aldgate hits the region' : '33 kV line fault') : 'something stirred',
  });

  it("a fresh ROUTINE 'bad' event (a single fault) aborts +7d and event, NOT +30d", () => {
    // +30d deliberately skips routine bad noise — it only stops for a MAJOR
    // incident (see the major test below), so the player still skips a quiet
    // month past a self-healing tree-contact fault.
    const events = [ev(1, 'info'), ev(2, 'bad')];
    expect(skipAborts(events, 1, 'week')).toBe(true);
    expect(skipAborts(events, 1, 'event')).toBe(true);
    expect(skipAborts(events, 1, 'month')).toBe(false);
  });

  it('a fresh MAJOR bad event (a severe storm / grid-tx failure) aborts EVERY skip kind', () => {
    const events = [ev(1, 'info'), ev(2, 'bad', true)];
    for (const to of ['week', 'month', 'event'] as const) {
      expect(skipAborts(events, 1, to)).toBe(true);
    }
  });

  it('a MAJOR flag on a non-bad event does NOT trip +30d (only major BAD news halts it)', () => {
    // major is only meaningful on bad events; a warn/info that somehow carries
    // it must not halt a +30d skip
    expect(skipAborts([ev(2, 'warn', true)], 1, 'month')).toBe(false);
    expect(skipAborts([ev(2, 'info', true)], 1, 'month')).toBe(false);
  });

  it("'warn' only stops an event-skip (that arrival IS the destination)", () => {
    const events = [ev(2, 'warn')];
    expect(skipAborts(events, 1, 'week')).toBe(false);
    expect(skipAborts(events, 1, 'month')).toBe(false);
    expect(skipAborts(events, 1, 'event')).toBe(true);
  });

  it('stale events (seq ≤ baseline) and info never abort', () => {
    expect(skipAborts([ev(5, 'bad', true)], 5, 'month')).toBe(false);
    expect(skipAborts([ev(6, 'info')], 5, 'event')).toBe(false);
  });
});

describe('skipHaltEvent (the why-it-stopped event)', () => {
  const ev = (seq: number, sev: GameEvent['sev'], major: boolean, msg: string): GameEvent => ({
    seq,
    tMin: 0,
    sev,
    major,
    msg,
  });

  it('returns the EARLIEST (lowest-seq) halting event so the player sees the cause', () => {
    const events = [
      ev(3, 'bad', true, 'Storm Becton hits the region'),
      ev(2, 'bad', true, 'transformer failure at the grid sub'),
      ev(4, 'bad', false, '33 kV line fault'),
    ];
    expect(skipHaltEvent(events, 1, 'month')?.msg).toBe('transformer failure at the grid sub');
  });

  it('for +30d, skips routine bad events and lands on the first MAJOR one', () => {
    const events = [
      ev(2, 'bad', false, 'tree contact on the 11 kV line'),
      ev(3, 'bad', false, '33 kV line fault'),
      ev(4, 'bad', true, 'Storm Catford hits the region'),
    ];
    expect(skipHaltEvent(events, 1, 'month')?.msg).toBe('Storm Catford hits the region');
    // …whereas a +7d would have stopped at the very first bad event
    expect(skipHaltEvent(events, 1, 'week')?.msg).toBe('tree contact on the 11 kV line');
  });

  it('returns undefined when nothing crosses the target threshold', () => {
    expect(skipHaltEvent([ev(2, 'bad', false, 'fault')], 1, 'month')).toBeUndefined();
    expect(skipHaltEvent([ev(2, 'info', false, 'milestone')], 1, 'week')).toBeUndefined();
  });
});

// The worker's runSkip halts when skipHaltEvent fires; mirror that loop here
// (it isn't exported) over a seeded fixture so the integration path is covered.
function runSkipHalts(
  to: SkipTarget,
  inject: (state: ReturnType<typeof poweredFixture>['state'], simMin: number) => void,
): { stoppedEarly: boolean; reason?: string | undefined; atMin: number } {
  const { state, ctx } = poweredFixture();
  const target = skipTargetMin(state.simTimeMin, to);
  let reason: string | undefined;
  let stoppedEarly = false;
  let guard = 0;
  while (state.simTimeMin < target && guard++ < 90_000) {
    state.speed = skipTickSpeed(state.simTimeMin, target);
    const seqBefore = state.eventSeq;
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);
    inject(state, state.simTimeMin); // a scripted incident at a known minute
    const halt = skipHaltEvent(state.events, seqBefore, to);
    if (halt) {
      stoppedEarly = true;
      reason = halt.msg;
      break;
    }
  }
  return { stoppedEarly, reason, atMin: state.simTimeMin };
}

describe('a +30d skip halts on a MAJOR incident but not on routine noise', () => {
  const A_DAY = 1440;

  it('a seeded MAJOR incident (a storm landfall) stops the +30d skip early, with a reason', () => {
    let fired = false;
    const res = runSkipHalts('month', (state, simMin) => {
      // fire one major incident ~3 days in (deterministic minute, once)
      if (!fired && simMin >= 3 * A_DAY) {
        fired = true;
        pushEvent(state, 'bad', 'Storm Wapping hits the region', undefined, undefined, true);
      }
    });
    expect(res.stoppedEarly).toBe(true);
    expect(res.reason).toBe('Storm Wapping hits the region');
    // it stopped WELL before the +30d target (so the player can't sail past it)
    expect(res.atMin).toBeLessThan(skipTargetMin(0, 'month'));
    expect(res.atMin).toBeGreaterThanOrEqual(3 * A_DAY);
  });

  it('a ROUTINE bad event (a single fault) does NOT stop the +30d skip', () => {
    let fired = false;
    const res = runSkipHalts('month', (state, simMin) => {
      if (!fired && simMin >= 3 * A_DAY) {
        fired = true;
        pushEvent(state, 'bad', '33 kV line fault', 10, 10); // major defaults false
      }
    });
    expect(res.stoppedEarly).toBe(false);
    expect(res.atMin).toBe(skipTargetMin(0, 'month')); // ran the full month
  });

  it('that SAME routine fault DOES stop a +7d skip (the shorter jump is more cautious)', () => {
    let fired = false;
    const res = runSkipHalts('week', (state, simMin) => {
      if (!fired && simMin >= 2 * A_DAY) {
        fired = true;
        pushEvent(state, 'bad', '33 kV line fault', 10, 10);
      }
    });
    expect(res.stoppedEarly).toBe(true);
    expect(res.reason).toBe('33 kV line fault');
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
