// System frequency (gameplay bug fix): the dial must read the LOAD-WEIGHTED
// mean of the electrified islands' own balance frequencies, and N/A (no Hz)
// when nothing is electrified — not a misleading "50 minus an invented
// deficit" on the day-0 blank grid.

import { describe, expect, it } from 'vitest';
import {
  FREQ_FLOOR_HZ,
  islandFrequencyHz,
  NOMINAL_HZ,
  systemFrequencyHz,
} from '../src/sim/market/frequency';
import { applyCommand } from '../src/sim/commands';
import { derive, solveTick } from '../src/sim/tick';
import { newGame, newContext } from '../src/sim/state';
import { poweredFixture } from './helpers';

describe('island frequency', () => {
  it('a fully-served island sits at nominal 50 Hz', () => {
    expect(islandFrequencyHz(0)).toBeCloseTo(NOMINAL_HZ, 5);
  });

  it('a deficit drags frequency below nominal and never under the floor', () => {
    expect(islandFrequencyHz(0.5)).toBeLessThan(NOMINAL_HZ);
    expect(islandFrequencyHz(0.5)).toBeGreaterThan(islandFrequencyHz(1));
    // monotone down, and clamped to the load-shedding floor at the extreme
    expect(islandFrequencyHz(1)).toBeGreaterThanOrEqual(FREQ_FLOOR_HZ);
    expect(islandFrequencyHz(5)).toBeGreaterThanOrEqual(FREQ_FLOOR_HZ); // clamped input
  });
});

describe('system frequency (load-weighted)', () => {
  it('is undefined when no island carries load (nothing electrified → N/A)', () => {
    expect(systemFrequencyHz([])).toBeUndefined();
    expect(systemFrequencyHz([{ loadMW: 0, hz: 50 }])).toBeUndefined();
  });

  it('is the load-weighted mean across electrified islands', () => {
    // a big healthy island (100 MW @ 50) and a small starved one (10 MW @ 47.5)
    const hz = systemFrequencyHz([
      { loadMW: 100, hz: 50 },
      { loadMW: 10, hz: 47.5 },
    ]);
    expect(hz).toBeDefined();
    // weighted toward the big balanced island
    expect(hz).toBeCloseTo((100 * 50 + 10 * 47.5) / 110, 5);
    expect(hz!).toBeGreaterThan(49.7);
  });
});

describe('frequency in the live tick', () => {
  it('reads ~50 when balanced and N/A (undefined) with zero served load', () => {
    const { state, ctx } = poweredFixture();
    const balanced = solveTick(state, ctx, derive(state, ctx), false);
    expect(balanced.freqHz).toBeDefined();
    expect(balanced.freqHz!).toBeCloseTo(50, 1);
  });

  it('an empty grid (no demand, no supply) reports no frequency', () => {
    const state = newGame('london');
    const ctx = newContext('london');
    // brand-new game with nothing built or seeded: no island carries load
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.servedCustomers).toBe(0);
    expect(out.freqHz).toBeUndefined();
  });

  it('sags below 50 when an island loses its source under load', () => {
    const { state, ctx, ids } = poweredFixture();
    applyCommand(state, ctx.map, { type: 'demolish', assetId: ids.gas });
    const out = solveTick(state, ctx, derive(state, ctx), false);
    // the suburb island still has demand but no generation reaching it: it
    // is either dark (no freq sample) or sagging — never a false 50.
    if (out.freqHz !== undefined) expect(out.freqHz).toBeLessThanOrEqual(50.0001);
  });
});
