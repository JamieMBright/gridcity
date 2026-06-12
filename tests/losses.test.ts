// ROADMAP #13: network losses (I²R) — the second economic leg of routing
// decisions. Losses ≈ flowMW²·r/S_base per branch, EMA'd into lossYrK at
// the running marginal price, recovered through the bill's network pot.

import { describe, expect, it } from 'vitest';
import { deriveNetwork, lineBranchId, type PlacedAsset } from '../src/sim/assets';
import { LINES } from '../src/sim/catalog';
import {
  DOMESTIC_NETWORK_SHARE,
} from '../src/sim/regulation/bill';
import { advanceTime, branchLossMW, derive, LOSS_S_BASE_MVA, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

describe('branch I²R losses', () => {
  it('scale with the square of flow and linearly with r', () => {
    expect(branchLossMW(200, 0.01)).toBeCloseTo(4, 9);
    // 2x flow → 4x loss
    expect(branchLossMW(400, 0.01)).toBeCloseTo(16, 9);
    // 2x r → 2x loss
    expect(branchLossMW(200, 0.02)).toBeCloseTo(8, 9);
    expect(branchLossMW(0, 0.02)).toBe(0);
  });

  it('calibration: a heavily loaded long 132 kV run loses ~2-4% of its flow', () => {
    // 30 km of 132 kV at its 240 MW rating on the 100 MVA pu base
    const flowMW = LINES[132].ratingMW;
    const r = LINES[132].rPerTile * 30;
    const pct = (branchLossMW(flowMW, r) / flowMW) * 100;
    expect(pct).toBeGreaterThan(2);
    expect(pct).toBeLessThan(4);
  });

  it('catalog carries the same r for cable as overhead (uprating never changes r)', () => {
    // documented decision: LINES has one rPerTile per level, so
    // undergrounding does not cut losses in this build — only shorter
    // or lower-r routes do. Specs deliberately left alone (#13 scope).
    const rOf = (build: 'overhead' | 'underground', uprated?: boolean): number => {
      const assets: PlacedAsset[] = [
        { id: 1, kind: 'sub', sub: 'grid', x: 0, y: 0 },
        { id: 2, kind: 'sub', sub: 'grid', x: 10, y: 0 },
        {
          id: 3,
          kind: 'line',
          level: 132,
          build,
          a: 1,
          b: 2,
          lengthTiles: 10,
          capexK: 0,
          uprated,
        },
      ];
      const br = deriveNetwork(assets).branches.find((x) => x.id === lineBranchId(3));
      if (!br) throw new Error('line branch missing');
      return br.r;
    };
    expect(rOf('underground')).toBe(rOf('overhead'));
    expect(rOf('overhead', true)).toBe(rOf('overhead'));
  });
});

describe('losses on the live network and the bill', () => {
  it('exposes per-branch lossMW = flow²·r/S_base on the BranchView', () => {
    const { state, ctx, ids } = poweredFixture();
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const b = out.branches.find((br) => br.assetId === ids.line132 && br.kind === 'line');
    const line = state.assets.get(ids.line132);
    if (!b || !line || line.kind !== 'line') throw new Error('fixture line missing');
    const r = LINES[132].rPerTile * line.lengthTiles;
    expect(b.lossMW).toBeDefined();
    expect(b.lossMW).toBeCloseTo((b.flowMW * b.flowMW * r) / LOSS_S_BASE_MVA, 12);
    expect(b.lossMW ?? 0).toBeGreaterThan(0);
  });

  it('accrues lossYrK and bills it through the total + the DUoS pot', () => {
    const { state, ctx } = poweredFixture();
    let out = solveTick(state, ctx, derive(state, ctx), false);
    expect(state.lossYrK).toBe(0); // paused re-solve accrues nothing
    for (let i = 0; i < 5; i++) {
      advanceTime(state);
      out = solveTick(state, ctx, derive(state, ctx), true);
    }
    expect(state.lossYrK).toBeGreaterThan(0);
    const b = out.bill;
    expect(b.lossYrK).toBeCloseTo(state.lossYrK, 9);
    // the losses line rides the total…
    expect(b.totalYrK).toBeCloseTo(
      b.capexYrK +
        b.opexYrK +
        b.genYrK +
        b.fleetYrK +
        b.vegYrK +
        b.energyYrK +
        b.flexYrK +
        b.constraintYrK +
        b.lossYrK +
        b.innovationYrK,
      9,
    );
    // …and the network pot (losses are a DNO cost → household DUoS share)
    const networkK =
      b.capexYrK +
      b.opexYrK +
      b.fleetYrK +
      b.vegYrK +
      b.flexYrK +
      b.constraintYrK +
      b.lossYrK +
      b.innovationYrK;
    expect(b.perCustomerDuosYr).toBeCloseTo(
      (networkK * DOMESTIC_NETWORK_SHARE * 1000) / b.totalCustomers,
      9,
    );
  });

  it('higher flow on the same circuit costs superlinearly more in losses', () => {
    // pure-function check at the fixture's r: same r, doubled flow → 4x
    const { state, ctx, ids } = poweredFixture();
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const b = out.branches.find((br) => br.assetId === ids.line132 && br.kind === 'line');
    const line = state.assets.get(ids.line132);
    if (!b || !line || line.kind !== 'line') throw new Error('fixture line missing');
    const r = LINES[132].rPerTile * line.lengthTiles;
    expect(branchLossMW(2 * b.flowMW, r)).toBeCloseTo(4 * (b.lossMW ?? 0), 9);
  });
});
