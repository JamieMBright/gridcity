// ROADMAP #17: the constraint bidding market — firm curtailment pays
// each unit's own curtailment price (developer personality inherited
// onto the asset), and the dispatcher constrains the CHEAPEST curtailers
// off first. The drill-down law still holds: constraint detail rows sum
// to the constraint line.

import { describe, expect, it } from 'vitest';
import type { GenAsset } from '../src/sim/assets';
import { CONSTRAINT_COMP_K } from '../src/sim/market/dispatch';
import { devCurtailK, DEVELOPERS } from '../src/sim/events/developers';
import { ZONE } from '../src/sim/map/types';
import { newGame, type GameState, type SimContext } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  setZone,
} from './helpers';

/** Two firm 50 MW solar farms feeding one tiny suburb at noon: the island
 *  can only absorb a sliver, so most of both farms is curtailed every
 *  solve — the fixture the curtailment ORDER and PRICING are read off. */
function twoSolarFixture(cheapK?: number, dearK?: number) {
  const map = makeTestMap(20, 20);
  setZone(map, 10, 10, ZONE.suburb); // one tile: tiny load
  const ctx = makeContext(map);
  const state = newGame();
  state.weather.cloud = 0;
  state.simTimeMin = 13 * 60; // noon
  const cheap = directBuildGen(state, map, 'solarFarm', 5, 5);
  const dear = directBuildGen(state, map, 'solarFarm', 15, 5);
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 10, y: 10 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 10, by: 10 },
  });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 15, ay: 5, bx: 10, by: 10 },
  });
  commissionAll(state);
  const genOf = (id: number): GenAsset => {
    const a = state.assets.get(id);
    if (a?.kind !== 'gen') throw new Error('no gen');
    return a;
  };
  if (cheapK !== undefined) genOf(cheap).curtailK = cheapK;
  if (dearK !== undefined) genOf(dear).curtailK = dearK;
  return { state, ctx, map, cheap, dear, genOf };
}

describe('curtailment order (#17): cheapest curtailers cut first', () => {
  it('the dear curtailer runs, the cheap one is constrained off', () => {
    const { state, ctx, cheap, dear } = twoSolarFixture(0.03, 0.12);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const cheapMW = out.dispatch.genMW.get(cheap) ?? -1;
    const dearMW = out.dispatch.genMW.get(dear) ?? -1;
    expect(dearMW).toBeGreaterThan(0); // dispatched: serves the sliver of load
    expect(cheapMW).toBe(0); // fully curtailed first
    expect(out.dispatch.curtailedFirmMW).toBeGreaterThan(30);
  });

  it('swapping the offers flips the order (price, not identity, decides)', () => {
    const { state, ctx, cheap, dear } = twoSolarFixture(0.12, 0.03);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.dispatch.genMW.get(cheap) ?? -1).toBeGreaterThan(0);
    expect(out.dispatch.genMW.get(dear) ?? -1).toBe(0);
  });
});

describe('curtailment pricing (#17): each unit is paid its own offer', () => {
  it('constraint detail prices at per-asset curtailK and sums to the line', () => {
    const { state, ctx, cheap, dear } = twoSolarFixture(0.03, 0.12);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const rows = out.dispatch.constraintDetail;
    const rowOf = (id: number) => rows.find(([rid]) => rid === id);
    const cheapRow = rowOf(cheap);
    const dearRow = rowOf(dear);
    if (!cheapRow || !dearRow) throw new Error('missing constraint rows');
    expect(cheapRow[2]).toBeCloseTo(cheapRow[1] * 0.03, 9);
    expect(dearRow[2]).toBeCloseTo(dearRow[1] * 0.12, 9);
    // reconciliation law: rows sum to the constraint figure exactly
    const sum = rows.reduce((s, [, , k]) => s + k, 0);
    expect(sum).toBeCloseTo(out.dispatch.constraintKPerHour, 9);
  });

  it('falls back to the developer personality, then the flat rate', () => {
    // no stamped curtailK: developer 7 (Consolidated, £120/MWh) on one
    // farm, nothing on the other → personality price vs CONSTRAINT_COMP_K
    const { state, ctx, cheap, dear, genOf } = twoSolarFixture();
    genOf(dear).developer = 7;
    expect(devCurtailK(7)).toBe(0.12);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    const rows = out.dispatch.constraintDetail;
    const cheapRow = rows.find(([rid]) => rid === cheap);
    if (!cheapRow) throw new Error('flat-rate unit not curtailed');
    expect(cheapRow[2]).toBeCloseTo(cheapRow[1] * CONSTRAINT_COMP_K, 9);
    // the flat-rate unit (0.06) is the cheaper curtailer: it is cut
    // fully while the £120/MWh personality keeps running
    expect(out.dispatch.genMW.get(dear) ?? -1).toBeGreaterThan(0);
    expect(out.dispatch.genMW.get(cheap) ?? -1).toBe(0);
  });

  it('developer curtail prices spread 0.03–0.12 around the flat rate', () => {
    for (const d of DEVELOPERS) {
      expect(d.curtailPriceK).toBeGreaterThanOrEqual(0.03);
      expect(d.curtailPriceK).toBeLessThanOrEqual(0.12);
    }
    const ks = DEVELOPERS.map((d) => d.curtailPriceK);
    expect(Math.min(...ks)).toBeLessThan(CONSTRAINT_COMP_K);
    expect(Math.max(...ks)).toBeGreaterThan(CONSTRAINT_COMP_K);
  });
});

describe('the bill drill-down keeps reconciling (#17 × #52)', () => {
  function run(state: GameState, ctx: SimContext, ticks: number): void {
    for (let i = 0; i < ticks; i++) {
      advanceTime(state);
      solveTick(state, ctx, derive(state, ctx), true);
    }
  }

  it('per-asset-priced constraint rows still sum to constraintYrK ±2%', () => {
    const { state, ctx, cheap, dear } = twoSolarFixture(0.03, 0.12);
    run(state, ctx, 8);
    expect(state.constraintYrK).toBeGreaterThan(0);
    const detailSum = [...state.billDetail.constraints.values()].reduce((s, v) => s + v.kYr, 0);
    expect(Math.abs(detailSum - state.constraintYrK)).toBeLessThanOrEqual(
      0.02 * state.constraintYrK,
    );
    // each row's £/MWh IS its unit's curtail offer (same alpha each tick
    // keeps the ratio exact through the EMA)
    const cheapEntry = state.billDetail.constraints.get(cheap);
    if (!cheapEntry) throw new Error('no cheap row');
    expect(cheapEntry.kYr / cheapEntry.mwhYr).toBeCloseTo(0.03, 9);
    const dearEntry = state.billDetail.constraints.get(dear);
    if (dearEntry && dearEntry.mwhYr > 0) {
      expect(dearEntry.kYr / dearEntry.mwhYr).toBeCloseTo(0.12, 9);
    }
  });
});
