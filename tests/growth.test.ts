// Town growth & densification: satellite towns build OUT (greenfield infill)
// and UP (the densification ladder) as the network serves more demand over a
// playthrough. The rate is tied to served demand (everServed) so early play
// sees gentle infill and a mature, demand-heavy grid sees real intensification
// — deterministic on the seeded RNG, and replayed from a save's growth records
// (append-only GrowthRecords, no SAVE_VERSION bump).

import { describe, expect, it } from 'vitest';
import { CUSTOMERS_PER_TILE, ZONE, type Zone } from '../src/sim/map/types';
import {
  applyGrowth,
  deserialize,
  serialize,
  type GameState,
  type SimContext,
  type SaveData,
} from '../src/sim/state';
import { advanceTime, derive, growthPressure, solveTick } from '../src/sim/tick';
import { makeTestMap, poweredFixture, setZone } from './helpers';

/** Advance the fixture across exactly one month boundary (when town growth
 *  runs), with the given high-water served base in place so the demand
 *  pressure is whatever everServed implies. Returns the state/ctx mutated. */
function tickAcrossMonthBoundary(
  state: GameState,
  ctx: SimContext,
  everServed: number,
): void {
  state.speed = 16;
  state.everServedCustomers = everServed;
  state.simTimeMin = 43_200 - 60; // a tick short of the first month boundary
  advanceTime(state);
  solveTick(state, ctx, derive(state, ctx), true);
}

describe('growthPressure', () => {
  it('is a bounded, monotonic, saturating function of served demand', () => {
    expect(growthPressure(0)).toBe(0);
    expect(growthPressure(-100)).toBe(0); // clamps negative
    // strictly increasing
    expect(growthPressure(10_000)).toBeGreaterThan(growthPressure(0));
    expect(growthPressure(100_000)).toBeGreaterThan(growthPressure(10_000));
    expect(growthPressure(1_000_000)).toBeGreaterThan(growthPressure(100_000));
    // bounded below 1, ~0.5 at the half-saturation point
    expect(growthPressure(1_000_000)).toBeLessThan(1);
    expect(growthPressure(60_000)).toBeCloseTo(0.5, 2);
  });
});

describe('town densification', () => {
  it('intensifies served, built-up tiles up the ladder under demand pressure', () => {
    const { state, ctx } = poweredFixture(); // 3x3 served suburb block at (19..21)
    // a big served base → high pressure → real vertical growth this month
    tickAcrossMonthBoundary(state, ctx, 500_000);

    // at least one suburb tile climbed the ladder (suburb -> urban -> core)
    const climbed = state.growth.filter(
      (g) => g.zone === ZONE.urban || g.zone === ZONE.urbanCore,
    );
    expect(climbed.length).toBeGreaterThan(0);

    // every densification record sits inside the served block and carries the
    // right customer count for its new zone; the live map agrees
    for (const g of climbed) {
      const x = g.i % ctx.map.width;
      const y = Math.floor(g.i / ctx.map.width);
      expect(x).toBeGreaterThanOrEqual(19);
      expect(x).toBeLessThanOrEqual(21);
      expect(y).toBeGreaterThanOrEqual(19);
      expect(y).toBeLessThanOrEqual(21);
      expect(g.customers).toBe(CUSTOMERS_PER_TILE[g.zone as Zone]);
      expect(ctx.map.zone[g.i]).toBe(g.zone);
      expect(ctx.map.customers[g.i]).toBe(g.customers);
    }

    // a densified tile carries MORE demand than the suburb it replaced
    expect(CUSTOMERS_PER_TILE[ZONE.urban]).toBeGreaterThan(CUSTOMERS_PER_TILE[ZONE.suburb]);
    expect(CUSTOMERS_PER_TILE[ZONE.urbanCore]).toBeGreaterThan(CUSTOMERS_PER_TILE[ZONE.urban]);
    // densification re-derives the demand field
    const first = climbed[0];
    if (!first) throw new Error('no densification');
    expect(ctx.demand.byTile.get(first.i) ?? 0).toBeGreaterThan(0);
    expect(state.events.some((e) => e.msg.includes('densif'))).toBe(true);
  });

  it('barely densifies an immature (low served-demand) network', () => {
    const { state, ctx } = poweredFixture();
    // a tiny served base → pressure ≈ 0 → little/no vertical growth
    tickAcrossMonthBoundary(state, ctx, 200);

    const climbed = state.growth.filter(
      (g) => g.zone === ZONE.urban || g.zone === ZONE.urbanCore,
    );
    expect(climbed.length).toBe(0);
  });

  it('leaves posh villas and unserved fabric off the ladder', () => {
    const { state, ctx } = poweredFixture();
    // turn the served block POSH (villas keep their character, off-ladder)…
    for (let y = 19; y <= 21; y++) {
      for (let x = 19; x <= 21; x++) setZone(ctx.map, x, y, ZONE.posh);
    }
    // …and plant an UNSERVED suburb block far from any wires
    for (let y = 2; y <= 3; y++) {
      for (let x = 2; x <= 3; x++) setZone(ctx.map, x, y, ZONE.suburb);
    }
    state.sitesVersion++; // re-derive service over the rezoned fabric
    tickAcrossMonthBoundary(state, ctx, 500_000);

    // no growth record landed on the posh block (villas are off the ladder)
    for (const g of state.growth) {
      const x = g.i % ctx.map.width;
      const y = Math.floor(g.i / ctx.map.width);
      const onPoshBlock = x >= 19 && x <= 21 && y >= 19 && y <= 21;
      expect(onPoshBlock).toBe(false);
    }
    for (let y = 2; y <= 3; y++) {
      for (let x = 2; x <= 3; x++) {
        expect(ctx.map.zone[y * ctx.map.width + x]).toBe(ZONE.suburb); // unserved, untouched
      }
    }
  });

  it('replays densification (incl. multi-rung climbs) deterministically from a save', () => {
    const { state, ctx } = poweredFixture();
    // run several months so some tiles climb more than one rung
    state.speed = 16;
    state.everServedCustomers = 500_000;
    for (let m = 1; m <= 6; m++) {
      state.simTimeMin = m * 43_200 - 60;
      advanceTime(state);
      solveTick(state, ctx, derive(state, ctx), true);
    }
    expect(state.growth.length).toBeGreaterThan(0);

    // round-trip the save and replay the append-only records onto a fresh map
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))) as SaveData);
    expect(restored.growth).toEqual(state.growth);
    const fresh = makeTestMap(30, 30);
    applyGrowth(fresh, restored.growth);

    // the replayed map matches the live map on every grown tile — last record
    // per tile wins, so a tile that climbed suburb->urban->core lands on core
    const grownTiles = new Set(state.growth.map((g) => g.i));
    for (const i of grownTiles) {
      expect(fresh.zone[i]).toBe(ctx.map.zone[i]);
      expect(fresh.customers[i]).toBe(ctx.map.customers[i]);
    }

    // and at least one tile genuinely climbed two rungs over the run
    const recordsPerTile = new Map<number, number[]>();
    for (const g of state.growth) {
      const arr = recordsPerTile.get(g.i) ?? [];
      arr.push(g.zone);
      recordsPerTile.set(g.i, arr);
    }
    const multiClimb = [...recordsPerTile.values()].some((zones) => zones.length >= 2);
    expect(multiClimb).toBe(true);
  });
});
