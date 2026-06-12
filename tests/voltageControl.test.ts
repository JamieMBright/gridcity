// ROADMAP #19 — capacitor banks: a cheap 33 kV shunt-compensation build
// that lifts the voltage estimate at and downstream of its point of
// connection by a bounded, stack-clamped credit — with ZERO effect on the
// DC power flow (banks move volts, not megawatts) — and whose capex rides
// the DUoS pot like any other substation.

import { describe, expect, it } from 'vitest';
import { ANNUITY_FACTOR, SUBS, subCapexK } from '../src/sim/catalog';
import { busId, type PlacedAsset } from '../src/sim/assets';
import { COV } from '../src/sim/coverage';
import { processProfile } from '../src/sim/events/weather';
import {
  CAPBANK_BOOST_MAX,
  CAPBANK_BOOST_PU,
  V_BROWNOUT,
  V_COLLAPSE,
} from '../src/sim/grid/voltage';
import { computeBill } from '../src/sim/regulation/bill';
import { newGame, type GameState } from '../src/sim/state';
import { derive, solveTick, type TickOutputs } from '../src/sim/tick';
import { commissionAll, directBuildGen, makeContext, makeTestMap, mustApply } from './helpers';

const MAP_W = 60;

/** A deliberately sagging radial: gas plant → grid sub → a 42 km 33 kV
 *  feeder → dist sub carrying a process site tuned to land the far bus in
 *  the brownout band (0.90–0.94 pu) — the classic case more copper used
 *  to be the only answer to. */
function fixture() {
  const map = makeTestMap(MAP_W, 30);
  const ctx = makeContext(map);
  const state = newGame();
  directBuildGen(state, map, 'gasCCGT', 5, 5);
  const grid = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 10, y: 5 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 10, by: 5 },
  });
  const dist = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 52, y: 5 } });
  mustApply(state, map, { type: 'setSubMva', assetId: dist, mva: 40 });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 10, ay: 5, bx: 52, by: 5 },
  });
  commissionAll(state);
  state.speed = 1;
  state.tick = 1;
  state.simTimeMin = 13 * 60; // process load at its daytime plateau
  // 21 MW over 42 km of 33 kV (r 0.008 pu/km): drop ≈ 0.21·0.336 ≈ 0.071
  const mw = 21 / processProfile(state.simTimeMin);
  state.loadSites.push({ id: 1, x: 53, y: 5, mw, customers: 120, name: 'Rolling Mill' });
  state.sitesVersion++;
  return { map, ctx, state, grid, dist };
}

/** Place a bank and a short 33 kV leg tying it to the dist sub's bus. */
function addBank(state: GameState, map: ReturnType<typeof makeTestMap>, x: number, y: number): number {
  const bank = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'capbank', x, y } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 52, ay: 5, bx: x, by: y },
  });
  return bank;
}

function solve(state: GameState, ctx: ReturnType<typeof makeContext>): TickOutputs {
  // accumulate=false: a pure re-solve — no weather, no faults, no drift
  return solveTick(state, ctx, derive(state, ctx), false);
}

describe('capacitor bank voltage support (#19)', () => {
  it('a brownout feeder recovers with a bank downstream (+0.03 pu at the POC)', () => {
    const { map, ctx, state, dist } = fixture();
    const before = solve(state, ctx);
    const v0 = before.pf.voltage.get(busId(dist, 33)) ?? 0;
    expect(v0).toBeGreaterThan(V_COLLAPSE);
    expect(v0).toBeLessThan(V_BROWNOUT);
    const tile = 5 * MAP_W + 53; // the mill's tile reads brownout
    expect(before.coverage[tile]).toBe(COV.brownout);

    const bank = addBank(state, map, 54, 5);
    const after = solve(state, ctx);
    const v1 = after.pf.voltage.get(busId(dist, 33)) ?? 0;
    expect(v1).toBeCloseTo(v0 + CAPBANK_BOOST_PU, 9);
    expect(v1).toBeGreaterThanOrEqual(V_BROWNOUT);
    expect(after.coverage[tile]).toBe(COV.on);
    // the bank's own leaf bus rides the same boosted level (downstream)
    expect(after.pf.voltage.get(busId(bank, 33)) ?? 0).toBeCloseTo(v1, 6);
  });

  it('leaves every branch flow untouched — volts move, megawatts do not', () => {
    const { map, ctx, state } = fixture();
    const before = solve(state, ctx);
    addBank(state, map, 54, 5);
    const after = solve(state, ctx);
    for (const [id, mw] of before.pf.flowMW) {
      expect(after.pf.flowMW.get(id) ?? Number.NaN).toBeCloseTo(mw, 6);
    }
  });

  it('credits nothing upstream of the point of connection', () => {
    const { map, ctx, state, grid } = fixture();
    const before = solve(state, ctx);
    addBank(state, map, 54, 5);
    const after = solve(state, ctx);
    for (const level of [132, 33] as const) {
      expect(after.pf.voltage.get(busId(grid, level)) ?? 0).toBeCloseTo(
        before.pf.voltage.get(busId(grid, level)) ?? -1,
        9,
      );
    }
  });

  it('clamps stacked banks at CAPBANK_BOOST_MAX', () => {
    const { map, ctx, state, dist } = fixture();
    const v0 = solve(state, ctx).pf.voltage.get(busId(dist, 33)) ?? 0;
    addBank(state, map, 54, 5);
    addBank(state, map, 52, 7); // second bank on the same bus: 0.06 → 0.05
    const v2 = solve(state, ctx).pf.voltage.get(busId(dist, 33)) ?? 0;
    expect(v2).toBeCloseTo(v0 + CAPBANK_BOOST_MAX, 9);
    expect(v2 - v0).toBeLessThan(2 * CAPBANK_BOOST_PU);
  });

  it('annuitizes its £2m capex onto the bill like any substation', () => {
    const assets: PlacedAsset[] = [{ id: 1, kind: 'sub', sub: 'capbank', x: 0, y: 0 }];
    const bill = computeBill({
      assets,
      energyYrK: 0,
      ppaYrK: 0,
      servedCustomers: 0,
      totalCustomers: 0,
      fleetSize: 0,
      vegPolicy: 0,
      vegCostMul: 1,
      flexYrK: 0,
      constraintYrK: 0,
      lossYrK: 0,
      penaltyYrK: 0,
      levyPct: 0,
    });
    const capex = subCapexK('capbank', SUBS.capbank.txRatingMW);
    expect(capex).toBe(SUBS.capbank.capexK);
    expect(bill.capexYrK).toBeCloseTo(capex * ANNUITY_FACTOR, 6);
    expect(bill.opexYrK).toBeCloseTo(capex * SUBS.capbank.opexFrac, 6);
  });

  it('is a 33 kV single bay: no transformer, no service catchment', () => {
    expect(SUBS.capbank.levels).toEqual([33]);
    expect(SUBS.capbank.serviceRadius).toBeUndefined();
    expect(SUBS.capbank.mvaSteps).toBeUndefined();
  });
});
