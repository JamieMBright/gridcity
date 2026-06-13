// ROADMAP #28: bill-over-time history ring — samples accumulate once per
// game-day, decimate to a bounded length, and the component bands always
// sum to the total.

import { describe, expect, it } from 'vitest';
import { bandsOf, BillHistory, BILL_HIST_MAX } from '../src/sim/billHistory';

const sample = { total: 3000, network: 100, energy: 1500, operations: 900, other: 500 };

describe('BillHistory ring', () => {
  it('samples at most once per game-day', () => {
    const h = new BillHistory();
    expect(h.sample(0, sample)).toBe(true); // day 0
    expect(h.sample(60, sample)).toBe(false); // same day
    expect(h.sample(1439, sample)).toBe(false); // still day 0
    expect(h.sample(1440, sample)).toBe(true); // day 1
    expect(h.view()).toHaveLength(2);
  });

  it('decimates to stay under the cap while keeping the newest', () => {
    const h = new BillHistory();
    // feed many game-days; the ring must never exceed the cap
    for (let day = 0; day < BILL_HIST_MAX * 6; day++) {
      h.sample(day * 1440, { ...sample, total: 3000 + day });
    }
    const view = h.view();
    expect(view.length).toBeLessThanOrEqual(BILL_HIST_MAX);
    expect(view.length).toBeGreaterThan(BILL_HIST_MAX / 2); // not over-decimated
    // time-ordered and the right edge always tracks the latest reading
    for (let i = 1; i < view.length; i++) {
      expect(view[i]!.tMin).toBeGreaterThan(view[i - 1]!.tMin);
    }
    expect(view[view.length - 1]!.total).toBe(3000 + (BILL_HIST_MAX * 6 - 1));
  });

  it('clear empties the ring and resets cadence', () => {
    const h = new BillHistory();
    for (let day = 0; day < 300; day++) h.sample(day * 1440, sample);
    h.clear();
    expect(h.view()).toHaveLength(0);
    expect(h.sample(0, sample)).toBe(true);
    expect(h.sample(1440, sample)).toBe(true); // cadence back to 1 day
  });
});

describe('bandsOf', () => {
  it('splits the household total so the bands sum to it exactly', () => {
    const b = bandsOf({
      perCustomerYr: 3200,
      capexYrK: 200,
      opexYrK: 50,
      genYrK: 80,
      fleetYrK: 30,
      vegYrK: 10,
      energyYrK: 600,
      flexYrK: 5,
      constraintYrK: 15,
      lossYrK: 8,
      innovationYrK: 12,
    });
    const sum = b.network + b.energy + b.operations + b.other;
    expect(sum).toBeCloseTo(3200, 4);
    expect(b.total).toBe(3200);
    // proportional: network is its £k share of the total
    expect(b.network).toBeGreaterThan(0);
    expect(b.energy).toBeGreaterThan(b.network); // energy pot is far bigger
  });

  it('degrades gracefully when no costs exist yet', () => {
    const b = bandsOf({
      perCustomerYr: 1000,
      capexYrK: 0,
      opexYrK: 0,
      genYrK: 0,
      fleetYrK: 0,
      vegYrK: 0,
      energyYrK: 0,
      flexYrK: 0,
      constraintYrK: 0,
      lossYrK: 0,
      innovationYrK: 0,
    });
    expect(b.network + b.energy + b.operations + b.other).toBeCloseTo(1000, 4);
  });
});
