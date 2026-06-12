// ROADMAP #12 — battery dispatch policy: peak shave (the original
// behaviour, default), national-price arbitrage, and emergency reserve.

import { describe, expect, it } from 'vitest';
import { GENS } from '../src/sim/catalog';
import { applyCommand } from '../src/sim/commands';
import { MIDSUMMER_MIN } from '../src/sim/events/weather';
import {
  ARBITRAGE_CHARGE_BELOW_K,
  ARBITRAGE_DISCHARGE_ABOVE_K,
  nationalPriceK,
} from '../src/sim/market/dispatch';
import { ZONE } from '../src/sim/map/types';
import { deserialize, newGame, serialize, type GameState } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  setZone,
} from './helpers';

const CAP_MWH = GENS.battery.energyMWh ?? 0;

/** Suburb load fed by firm biomass (not "cheap": shave never charges off
 *  it), with a battery alongside — policies are the only variable. */
function fixture(withGen = true) {
  const map = makeTestMap(30, 30);
  for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
  const ctx = makeContext(map);
  const state = newGame();
  const batt = directBuildGen(state, map, 'battery', 8, 8);
  if (withGen) {
    directBuildGen(state, map, 'biomass', 5, 5);
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 8, by: 8 },
    });
  }
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 8, ay: 8, bx: 20, by: 20 },
  });
  commissionAll(state);
  state.speed = 1;
  state.tick = 1;
  return { map, ctx, state, batt };
}

function setPolicy(state: GameState, map: ReturnType<typeof makeTestMap>, id: number, policy: 'shave' | 'arbitrage' | 'reserve') {
  const r = applyCommand(state, map, { type: 'setBatteryPolicy', assetId: id, policy });
  expect(r.ok).toBe(true);
}

describe('arbitrage policy', () => {
  it('charges at the cheap night price and discharges at the dear evening price', () => {
    const { map, ctx, state, batt } = fixture();
    setPolicy(state, map, batt, 'arbitrage');
    const d = derive(state, ctx);

    // night: national price under the £60 floor → charge off the grid
    // (a shave battery would never charge here: biomass is not "cheap")
    state.simTimeMin = MIDSUMMER_MIN + 3 * 60;
    expect(nationalPriceK(state.simTimeMin, state.weather)).toBeLessThan(
      ARBITRAGE_CHARGE_BELOW_K,
    );
    const night = solveTick(state, ctx, d, true);
    expect(night.dispatch.genMW.get(batt) ?? 0).toBeLessThan(0);
    expect(state.soc.get(batt) ?? 0).toBeGreaterThan(0);

    // evening: price over the £110 ceiling → discharge, local peak or not
    state.soc.set(batt, CAP_MWH / 2);
    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60;
    expect(nationalPriceK(state.simTimeMin, state.weather)).toBeGreaterThan(
      ARBITRAGE_DISCHARGE_ABOVE_K,
    );
    const before = state.soc.get(batt) ?? 0;
    const evening = solveTick(state, ctx, d, true);
    expect(evening.dispatch.genMW.get(batt) ?? 0).toBeGreaterThan(0);
    expect(state.soc.get(batt) ?? 0).toBeLessThan(before);
  });

  it('discharges even when local generation already covers the load', () => {
    const { map, ctx, state, batt } = fixture();
    setPolicy(state, map, batt, 'arbitrage');
    state.soc.set(batt, CAP_MWH / 2);
    const d = derive(state, ctx);
    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60;
    const out = solveTick(state, ctx, d, true);
    // biomass (40 MW) alone covers the tiny suburb load — arbitrage
    // discharges anyway, displacing it on price
    expect(out.dispatch.genMW.get(batt) ?? 0).toBeGreaterThan(0);
  });
});

describe('reserve policy', () => {
  it('holds the 50% floor: refills toward it, and stays idle at it', () => {
    const { map, ctx, state, batt } = fixture();
    setPolicy(state, map, batt, 'reserve');
    const d = derive(state, ctx);
    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60; // healthy island, peak hour

    // below the floor: charge off the grid to restore the reserve
    state.soc.set(batt, 0);
    const refilling = solveTick(state, ctx, d, true);
    expect(refilling.dispatch.genMW.get(batt) ?? 0).toBeLessThan(0);
    expect(state.soc.get(batt) ?? 0).toBeGreaterThan(0);

    // at the floor with no surplus: neither charges nor discharges
    state.soc.set(batt, CAP_MWH / 2);
    const holding = solveTick(state, ctx, d, true);
    expect(holding.dispatch.genMW.get(batt) ?? 0).toBe(0);
    expect(state.soc.get(batt) ?? 0).toBeCloseTo(CAP_MWH / 2, 6);
  });

  it('rescues an island that would otherwise have unserved demand', () => {
    // no other generation at all: without the battery the island is dark
    const { map, ctx, state, batt } = fixture(false);
    setPolicy(state, map, batt, 'reserve');
    state.soc.set(batt, CAP_MWH * 0.75);
    const d = derive(state, ctx);
    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60;
    const before = state.soc.get(batt) ?? 0;
    const out = solveTick(state, ctx, d, true);
    expect(out.dispatch.genMW.get(batt) ?? 0).toBeGreaterThan(0);
    expect(out.servedCustomers).toBeGreaterThan(0);
    expect(state.soc.get(batt) ?? 0).toBeLessThan(before);
  });
});

describe('shave policy (the default)', () => {
  it('an unset battery behaves exactly like one explicitly set to shave', () => {
    const run = (explicit: boolean) => {
      const { map, ctx, state, batt } = fixture();
      if (explicit) setPolicy(state, map, batt, 'shave');
      state.soc.set(batt, CAP_MWH / 2);
      const d = derive(state, ctx);
      state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60;
      const out = solveTick(state, ctx, d, true);
      return out.dispatch.genMW.get(batt) ?? 0;
    };
    expect(run(false)).toBe(run(true));
  });
});

describe('setBatteryPolicy command', () => {
  it('refuses assets that are not batteries', () => {
    const { map, state } = fixture();
    const dist = [...state.assets.values()].find((a) => a.kind === 'sub');
    expect(dist).toBeDefined();
    const r = applyCommand(state, map, {
      type: 'setBatteryPolicy',
      assetId: dist?.id ?? -1,
      policy: 'reserve',
    });
    expect(r.ok).toBe(false);
  });

  it('is undo-safe: a pre-command serialize is a true snapshot', () => {
    const { map, state, batt } = fixture();
    // the worker's undo stack holds exactly this clone
    const undoSnapshot = serialize(state);
    setPolicy(state, map, batt, 'reserve');

    // the clone must NOT see the in-place mutation…
    const cloned = undoSnapshot.assets.find((a) => a.id === batt);
    expect(cloned?.kind).toBe('gen');
    if (cloned?.kind !== 'gen') throw new Error('expected a gen asset');
    expect(cloned.policy).toBeUndefined();

    // …the live state round-trips the policy (additive save field)…
    const restored = deserialize(serialize(state));
    const a = restored.assets.get(batt);
    if (a?.kind !== 'gen') throw new Error('expected a gen asset');
    expect(a.policy).toBe('reserve');

    // …and restoring the undo snapshot lands back on the default
    const undone = deserialize(undoSnapshot);
    const b = undone.assets.get(batt);
    if (b?.kind !== 'gen') throw new Error('expected a gen asset');
    expect(b.policy).toBeUndefined();
  });
});
