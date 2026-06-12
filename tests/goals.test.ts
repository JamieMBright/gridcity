// The early-game goal ladder: predicates fire on staged snapshot views,
// completion pushes celebratory events, and the index survives a save
// round-trip (optional field — no SAVE_VERSION bump).

import { describe, expect, it } from 'vitest';
import type { LineAsset } from '../src/sim/assets';
import { advanceGoals, GOALS, goalStatus, type GoalView } from '../src/sim/scenario/goals';
import { deserialize, newGame, serialize, type GameEvent } from '../src/sim/state';

function view(over: Partial<GoalView> = {}): GoalView {
  return {
    assets: [],
    events: [],
    councils: [],
    stats: { servedCustomers: 0, connectedMW: 0 },
    inbox: { tenders: [] },
    studyRan: false,
    ...over,
  };
}

function line(over: Partial<LineAsset> = {}): LineAsset {
  return {
    id: 1,
    kind: 'line',
    level: 33,
    build: 'overhead',
    a: 2,
    b: 3,
    lengthTiles: 5,
    capexK: 100,
    ...over,
  };
}

const ix = (label: RegExp): number => GOALS.findIndex((g) => label.test(g.label));
const ev = (msg: string, sev: GameEvent['sev'] = 'info'): GameEvent => ({
  seq: 1,
  tMin: 0,
  sev,
  msg,
});

describe('goal predicates', () => {
  it('is a 12-rung ladder and nothing fires on an empty new game', () => {
    expect(GOALS.length).toBe(12);
    const empty = view();
    for (const g of GOALS) expect(g.done(empty)).toBe(false);
  });

  it('supply goals fire at their thresholds with a progress readout', () => {
    const first = GOALS[0];
    const k1 = GOALS[ix(/1,000 customers/)];
    expect(first?.done(view({ stats: { servedCustomers: 1, connectedMW: 0 } }))).toBe(true);
    expect(k1?.done(view({ stats: { servedCustomers: 999, connectedMW: 0 } }))).toBe(false);
    expect(k1?.done(view({ stats: { servedCustomers: 1000, connectedMW: 0 } }))).toBe(true);
    expect(k1?.progress?.(view({ stats: { servedCustomers: 400, connectedMW: 0 } }))).toBe(
      '400/1,000',
    );
  });

  it('tender, 132 kV, study, depot and underground goals watch their objects', () => {
    expect(
      GOALS[ix(/tender/)]?.done(view({ inbox: { tenders: [{ status: 'awarded' }] } })),
    ).toBe(true);
    expect(
      GOALS[ix(/tender/)]?.done(view({ inbox: { tenders: [{ status: 'open' }] } })),
    ).toBe(false);
    expect(GOALS[ix(/132 kV/)]?.done(view({ assets: [line({ level: 132 })] }))).toBe(true);
    expect(GOALS[ix(/132 kV/)]?.done(view({ assets: [line({ level: 33 })] }))).toBe(false);
    expect(GOALS[ix(/study/)]?.done(view({ studyRan: true }))).toBe(true);
    expect(
      GOALS[ix(/depot/)]?.done(view({ assets: [{ id: 9, kind: 'depot', x: 1, y: 1 }] })),
    ).toBe(true);
    expect(
      GOALS[ix(/underground/)]?.done(view({ assets: [line({ build: 'underground' })] })),
    ).toBe(true);
  });

  it('the repair, satisfaction and 500 MW goals read events/councils/stats', () => {
    expect(
      GOALS[ix(/repair restored/)]?.done(view({ events: [ev('crew restored the 33 kV line')] })),
    ).toBe(true);
    expect(
      GOALS[ix(/repair restored/)]?.done(view({ events: [ev('storm over the region', 'warn')] })),
    ).toBe(false);
    expect(
      GOALS[ix(/satisfaction/)]?.done(
        view({ councils: [[3, { ev: 0, hp: 0, pv: 0, satisfaction: 61 }]] }),
      ),
    ).toBe(true);
    expect(
      GOALS[ix(/satisfaction/)]?.done(
        view({ councils: [[3, { ev: 0, hp: 0, pv: 0, satisfaction: 60 }]] }),
      ),
    ).toBe(false);
    expect(
      GOALS[ix(/500 MW/)]?.done(view({ stats: { servedCustomers: 0, connectedMW: 501 } })),
    ).toBe(true);
  });
});

describe('advanceGoals', () => {
  it('walks past every satisfied goal in order, one event each', () => {
    const state = newGame();
    advanceGoals(state, view({ stats: { servedCustomers: 1500, connectedMW: 0 } }));
    // goals 0 and 1 complete; goal 2 (tender) blocks the ladder
    expect(state.goalIndex).toBe(2);
    const msgs = state.events.map((e) => e.msg);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain('goal complete: energize your first customers');
    expect(state.events.every((e) => e.sev === 'info')).toBe(true);
    // idempotent: nothing new on the next identical check
    advanceGoals(state, view({ stats: { servedCustomers: 1500, connectedMW: 0 } }));
    expect(state.goalIndex).toBe(2);
    expect(state.events).toHaveLength(2);
  });

  it('goalStatus exposes the current rung and goes quiet past the end', () => {
    const v = view({ stats: { servedCustomers: 400, connectedMW: 0 } });
    const status = goalStatus(1, v);
    expect(status).toMatchObject({ index: 1, total: GOALS.length });
    expect(status?.progress).toBe('400/1,000');
    expect(goalStatus(GOALS.length, v)).toBeUndefined();
  });
});

describe('goalIndex save round-trip', () => {
  it('persists through serialize → JSON → deserialize', () => {
    const state = newGame();
    state.goalIndex = 5;
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    expect(restored.goalIndex).toBe(5);
  });

  it('stays absent for a fresh game and for old saves without the field', () => {
    const fresh = deserialize(JSON.parse(JSON.stringify(serialize(newGame()))));
    expect(fresh.goalIndex).toBeUndefined();
  });
});
