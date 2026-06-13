// The rebuild grace (owner, 2026-06-13): after "the Night the Grid
// Vanished" the regulator gives ~3 months' breathing room before the
// CI/CML clock starts and before firm-curtailment constraint payments
// bite. updateReliability's `accrue` flag is how the grace suppresses
// scoring while still tracking which tiles are dark (so the "your site
// went dark" events keep firing).

import { describe, expect, it } from 'vitest';
import { updateReliability } from '../src/sim/regulation/kpis';
import { REBUILD_GRACE_MIN } from '../src/sim/tick';
import { COV } from '../src/sim/coverage';
import { makeTestMap } from './helpers';

describe('rebuild grace', () => {
  it('grace window is ~3 months', () => {
    expect(REBUILD_GRACE_MIN).toBe(90 * 1440);
  });

  it('accrue=false suppresses CI/CML but still tracks dark tiles', () => {
    const map = makeTestMap(4, 1);
    map.customers[0] = 100;
    const totals = { ciCustomers: 0, cmlCustomerMin: 0 };
    const off = new Set<number>();
    const dark = new Uint8Array([COV.off, COV.on, COV.empty, COV.empty]);

    // during the grace: the tile is tracked as dark, but nothing scores
    updateReliability(totals, off, dark, map, 30, false);
    expect(off.has(0)).toBe(true); // transition tracking still runs
    expect(totals.ciCustomers).toBe(0); // …but no interruption counted
    expect(totals.cmlCustomerMin).toBe(0); // …and no minutes lost

    // after the grace (accrue defaults true): the same outage scores
    const totals2 = { ciCustomers: 0, cmlCustomerMin: 0 };
    const off2 = new Set<number>();
    updateReliability(totals2, off2, dark, map, 30);
    expect(totals2.ciCustomers).toBe(100);
    expect(totals2.cmlCustomerMin).toBe(100 * 30);
  });
});
