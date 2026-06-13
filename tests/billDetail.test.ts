// ROADMAP #52: bill drill-down — every itemised list must reconcile to
// its bill line (the law: ±2% from EMA timing), attribution must match
// the dispatch's curtailment order, and capex/opex detail is derived
// live from the asset register exactly the way computeBill prices it.

import { describe, expect, it } from 'vitest';
import { ANNUITY_FACTOR } from '../src/sim/catalog';
import { assetCapexK, assetOpexFrac } from '../src/sim/regulation/bill';
import { deserialize, serialize, type GameState, type SimContext } from '../src/sim/state';
import { advanceTime, billDetailRows, derive, REBUILD_GRACE_MIN, solveTick } from '../src/sim/tick';
import { commissionAll, directBuildGen, mustApply, poweredFixture } from './helpers';

/** poweredFixture + a firm must-run solar farm at noon: its 50 MW dwarf
 *  the suburb's load, so most of it is constrained off every tick —
 *  constraint payments, PPA top-ups and losses all flow at once. */
function runningFixture(ticks = 8): {
  state: GameState;
  ctx: SimContext;
  solar: number;
  gas: number;
} {
  const f = poweredFixture();
  const solar = directBuildGen(f.state, f.ctx.map, 'solarFarm', 10, 25);
  mustApply(f.state, f.ctx.map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 10, ay: 25, bx: 15, by: 15 },
  });
  commissionAll(f.state);
  f.state.simTimeMin = REBUILD_GRACE_MIN + 12 * 60; // noon, past the rebuild grace (constraint bills)
  for (let i = 0; i < ticks; i++) {
    advanceTime(f.state);
    solveTick(f.state, f.ctx, derive(f.state, f.ctx), true);
  }
  return { state: f.state, ctx: f.ctx, solar, gas: f.ids.gas };
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('bill drill-down reconciliation (the law: detail sums to its line ±2%)', () => {
  it('constraint detail sums to the constraint line and names the curtailed unit', () => {
    const { state, solar } = runningFixture();
    expect(state.constraintYrK).toBeGreaterThan(0);
    const detailSum = sum([...state.billDetail.constraints.values()].map((v) => v.kYr));
    expect(Math.abs(detailSum - state.constraintYrK)).toBeLessThanOrEqual(
      0.02 * state.constraintYrK,
    );
    // attribution: the firm solar farm is the constrained unit
    const entry = state.billDetail.constraints.get(solar);
    expect(entry).toBeDefined();
    expect(entry?.kYr ?? 0).toBeGreaterThan(0);
    expect(entry?.mwhYr ?? 0).toBeGreaterThan(0);
  });

  it('PPA detail sums to the generation (PPA) line', () => {
    const { state } = runningFixture();
    expect(state.genCostYrK).toBeGreaterThan(0);
    const detailSum = sum([...state.billDetail.ppa.values()].map((v) => v.topupKYr));
    expect(Math.abs(detailSum - state.genCostYrK)).toBeLessThanOrEqual(0.02 * state.genCostYrK);
  });

  it('losses detail sums to lossYrK and keys onto real owning assets', () => {
    const { state } = runningFixture();
    expect(state.lossYrK).toBeGreaterThan(0);
    const detailSum = sum([...state.billDetail.losses.values()]);
    expect(Math.abs(detailSum - state.lossYrK)).toBeLessThanOrEqual(0.02 * state.lossYrK);
    for (const id of state.billDetail.losses.keys()) {
      expect(state.assets.has(id)).toBe(true);
    }
  });

  it('is deterministic: the same ticks build the same detail maps', () => {
    const a = runningFixture();
    const b = runningFixture();
    expect([...a.state.billDetail.constraints.entries()]).toEqual([
      ...b.state.billDetail.constraints.entries(),
    ]);
    expect([...a.state.billDetail.ppa.entries()]).toEqual([...b.state.billDetail.ppa.entries()]);
    expect([...a.state.billDetail.losses.entries()]).toEqual([
      ...b.state.billDetail.losses.entries(),
    ]);
  });
});

describe('billDetailRows (the worker answer)', () => {
  it('capex top list matches assetCapexK order and excludes gen + iDNO iron', () => {
    const { state } = runningFixture(1);
    const rows = billDetailRows(state, 'capex');
    // expected: every non-gen, non-iDNO asset annuitized, sorted by £
    const expected = [...state.assets.values()]
      .filter((a) => a.kind !== 'gen' && !(a.kind === 'sub' && a.idno))
      .map((a) => ({ assetId: a.id, kYr: assetCapexK(a) * ANNUITY_FACTOR }))
      .sort((a, b) => b.kYr - a.kYr)
      .slice(0, 12);
    expect(rows.map((r) => r.assetId)).toEqual(expected.map((e) => e.assetId));
    rows.forEach((r, i) => expect(r.kYr).toBeCloseTo(expected[i]?.kYr ?? -1, 9));
    // sorted, capped at 12
    expect(rows.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]?.kYr ?? 0).toBeGreaterThanOrEqual(rows[i]?.kYr ?? 0);
    }
  });

  it('opex rows price at capex × assetOpexFrac', () => {
    const { state } = runningFixture(1);
    for (const r of billDetailRows(state, 'opex')) {
      const a = r.assetId !== undefined ? state.assets.get(r.assetId) : undefined;
      if (!a) throw new Error('opex row without an asset');
      expect(r.kYr).toBeCloseTo(assetCapexK(a) * assetOpexFrac(a), 9);
    }
  });

  it('answers every line in protocol shape: labels, £, coords for jump-to', () => {
    const { state, solar } = runningFixture();
    for (const line of ['constraints', 'ppa', 'losses', 'capex', 'opex'] as const) {
      const rows = billDetailRows(state, line);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(12);
      for (const r of rows) {
        expect(typeof r.label).toBe('string');
        expect(r.label.length).toBeGreaterThan(0);
        expect(Number.isFinite(r.kYr)).toBe(true);
        expect(r.kYr).toBeGreaterThanOrEqual(0);
      }
    }
    // gen rows carry energy + map coords (the '→' jump button's fuel)
    const cRow = billDetailRows(state, 'constraints').find((r) => r.assetId === solar);
    expect(cRow).toBeDefined();
    expect(cRow?.mwhYr ?? 0).toBeGreaterThan(0);
    expect(cRow?.x).toBe(10);
    expect(cRow?.y).toBe(25);
    expect(cRow?.label).toContain('Solar farm');
    // line rows jump to the route midpoint
    const lossLineRow = billDetailRows(state, 'losses').find((r) => {
      const a = r.assetId !== undefined ? state.assets.get(r.assetId) : undefined;
      return a?.kind === 'line';
    });
    expect(lossLineRow?.x).toBeDefined();
    expect(lossLineRow?.y).toBeDefined();
  });
});

describe('saves stay additive', () => {
  it('round-trips lossYrK and the billDetail maps', () => {
    const { state } = runningFixture();
    const back = deserialize(serialize(state));
    expect(back.lossYrK).toBeCloseTo(state.lossYrK, 12);
    expect([...back.billDetail.constraints.entries()]).toEqual([
      ...state.billDetail.constraints.entries(),
    ]);
    expect([...back.billDetail.ppa.entries()]).toEqual([...state.billDetail.ppa.entries()]);
    expect([...back.billDetail.losses.entries()]).toEqual([
      ...state.billDetail.losses.entries(),
    ]);
  });

  it('hydrates pre-losses saves to clean defaults (no SAVE_VERSION bump)', () => {
    const { state } = runningFixture();
    const data = serialize(state);
    delete data.lossYrK;
    delete data.billConstraints;
    delete data.billPpa;
    delete data.billLosses;
    const back = deserialize(data);
    expect(back.lossYrK).toBe(0);
    expect(back.billDetail.constraints.size).toBe(0);
    expect(back.billDetail.ppa.size).toBe(0);
    expect(back.billDetail.losses.size).toBe(0);
  });
});
