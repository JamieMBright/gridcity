import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { domesticProfile } from '../src/sim/events/weather';
import { COV, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

describe('end-to-end tick: power flows from plant to homes', () => {
  it('serves the suburb through gas → grid sub → dist sub', () => {
    const { state, ctx } = poweredFixture();
    const d = derive(state, ctx);
    const out = solveTick(state, ctx, d, false);

    // all 9 suburb tiles powered
    let on = 0;
    for (let y = 19; y <= 21; y++) {
      for (let x = 19; x <= 21; x++) {
        if (out.coverage[y * 30 + x] === COV.on) on++;
      }
    }
    expect(on).toBe(9);
    expect(out.servedCustomers).toBe(9 * 40);

    // gas serves exactly the moment's connected load (diurnal profile
    // applies to domestic demand); every series element carries it
    const loadMW = 9 * 40 * 0.0014 * domesticProfile(state.simTimeMin);
    expect(out.dispatch.servedMW).toBeCloseTo(loadMW, 6);
    for (const b of out.branches) {
      expect(Math.abs(b.flowMW)).toBeCloseTo(loadMW, 4);
    }
  });

  it('cutting the 132 kV line blacks out the suburb', () => {
    const { state, ctx, ids } = poweredFixture();
    applyCommand(state, ctx.map, { type: 'demolish', assetId: ids.line132 });
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.servedCustomers).toBe(0);
    expect(out.coverage[20 * 30 + 20]).toBe(COV.off);
  });

  it('tiles beyond every service radius read unserved', () => {
    const { state, ctx, ids } = poweredFixture();
    applyCommand(state, ctx.map, { type: 'demolish', assetId: ids.dist });
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.coverage[20 * 30 + 20]).toBe(COV.unserved);
    expect(out.servedCustomers).toBe(0);
  });

  it('parallel 132 kV circuits split the flow evenly', () => {
    const { state, ctx, ids } = poweredFixture();
    applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 15, by: 15 },
    });
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const loadMW = 9 * 40 * 0.0014 * domesticProfile(state.simTimeMin);
    const circuits = out.branches.filter(
      (b) => b.kind === 'line' && Math.abs(Math.abs(b.flowMW) - loadMW / 2) < 1e-6,
    );
    expect(circuits.length).toBe(2);
    void ids;
  });

  it('bill decomposition sums and prices the served customers', () => {
    const { state, ctx } = poweredFixture();
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const b = out.bill;
    expect(b.totalYrK).toBeCloseTo(b.capexYrK + b.opexYrK + b.energyYrK, 9);
    expect(b.servedCustomers).toBe(360);
    expect(b.perCustomerYr).toBeCloseTo((b.totalYrK * 1000) / 360, 9);
    expect(b.capexYrK).toBeGreaterThan(0);
    expect(b.opexYrK).toBeGreaterThan(0);
  });
});
