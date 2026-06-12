// ROADMAP #11 — the interconnector: a player-owned, import-only HVDC
// terminal at the map edge that buys at the deterministic national price
// and bills its converter hall through DUoS like network kit (not PPA).

import { describe, expect, it } from 'vitest';
import { ANNUITY_FACTOR, GENS } from '../src/sim/catalog';
import type { PlacedAsset } from '../src/sim/assets';
import { applyCommand, checkBuild, siteErrorAt } from '../src/sim/commands';
import { MIDSUMMER_MIN, MIDWINTER_MIN } from '../src/sim/events/weather';
import { nationalPriceMWh } from '../src/sim/market/dispatch';
import { TERRAIN, ZONE } from '../src/sim/map/types';
import { computeBill } from '../src/sim/regulation/bill';
import { newGame } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import { commissionAll, makeContext, makeTestMap, mustApply, setZone } from './helpers';

describe('interconnector siting (edge rule)', () => {
  it('refuses inland tiles and accepts land within 2 tiles of the map edge', () => {
    const map = makeTestMap(30, 30);
    const inland = checkBuild(map, [], { kind: 'gen', gen: 'interconnector', x: 15, y: 15 });
    expect(inland.ok).toBe(false);
    expect(inland.error).toMatch(/map edge/);
    // 2 tiles in from the western boundary: allowed
    expect(checkBuild(map, [], { kind: 'gen', gen: 'interconnector', x: 2, y: 15 }).ok).toBe(true);
    expect(checkBuild(map, [], { kind: 'gen', gen: 'interconnector', x: 1, y: 15 }).ok).toBe(true);
    // 3 tiles in: refused — the rule is within 2 of the boundary
    expect(checkBuild(map, [], { kind: 'gen', gen: 'interconnector', x: 3, y: 15 }).ok).toBe(false);
  });

  it('needs dry land at the landfall (no water, even at the edge)', () => {
    const map = makeTestMap(30, 30);
    map.terrain[15 * 30 + 0] = TERRAIN.water;
    expect(
      siteErrorAt(map, { kind: 'gen', gen: 'interconnector' }, 0, 15),
    ).toMatch(/dry land/);
  });
});

describe('interconnector build (no tender — player-owned network asset)', () => {
  it('builds directly as an asset instead of opening a developer tender', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'interconnector', x: 1, y: 15 },
    });
    expect(r.ok).toBe(true);
    expect(r.assetId).toBeDefined();
    expect(state.tenders).toHaveLength(0);
    const a = state.assets.get(r.assetId ?? -1);
    expect(a?.kind).toBe('gen');
    if (a?.kind !== 'gen') throw new Error('expected a gen asset');
    expect(a.gen).toBe('interconnector');
    expect(a.developer).toBeUndefined(); // the player's, not a developer's
    expect(a.ppaMWh).toBeUndefined(); // no PPA — imports settle at national price
    expect(a.liveAtMin).toBeGreaterThan(0); // planning + construction apply

    // contrast: an ordinary plant designation opens a tender, no asset
    setZone(map, 10, 1, ZONE.none);
    const gas = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 10, y: 1 },
    });
    expect(gas.ok).toBe(true);
    expect(gas.assetId).toBeUndefined();
    expect(state.tenders).toHaveLength(1);
  });
});

describe('national price series (deterministic, no RNG)', () => {
  const mild = { regime: 'mild' };

  it('is cheap at night and dear at the evening peak', () => {
    const night = nationalPriceMWh(MIDSUMMER_MIN + 3 * 60, mild);
    const peak = nationalPriceMWh(MIDSUMMER_MIN + 18.5 * 60, mild);
    expect(night).toBeLessThan(60);
    expect(night).toBeGreaterThan(35);
    expect(peak).toBeGreaterThan(120);
    expect(peak).toBeGreaterThan(2 * night);
  });

  it('runs ~30% higher in deep winter than midsummer', () => {
    const summer = nationalPriceMWh(MIDSUMMER_MIN + 18.5 * 60, mild);
    const winter = nationalPriceMWh(MIDWINTER_MIN + 18.5 * 60, mild);
    expect(winter).toBeCloseTo(summer * 1.3, 0);
  });

  it('adds the £60 scarcity kicker under a calm-cold regime', () => {
    const t = MIDWINTER_MIN + 18.5 * 60;
    expect(nationalPriceMWh(t, { regime: 'calm-cold' })).toBeCloseTo(
      nationalPriceMWh(t, mild) + 60,
      6,
    );
  });

  it('is a pure function of its inputs', () => {
    const t = MIDWINTER_MIN + 7 * 60;
    expect(nationalPriceMWh(t, mild)).toBe(nationalPriceMWh(t, mild));
  });
});

describe('interconnector dispatch', () => {
  function fixture() {
    const map = makeTestMap(40, 40);
    for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
    const ctx = makeContext(map);
    const state = newGame();
    const ic = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'interconnector', x: 1, y: 1 },
    });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'bulk', x: 10, y: 10 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 400, build: 'overhead', ax: 1, ay: 1, bx: 10, by: 10 },
    });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 10, ay: 10, bx: 20, by: 20 },
    });
    commissionAll(state);
    state.speed = 1;
    state.tick = 1;
    return { map, ctx, state, ic };
  }

  it('imports when local generation is short, at the national price', () => {
    const { ctx, state, ic } = fixture();
    const d = derive(state, ctx);

    state.simTimeMin = MIDSUMMER_MIN + 3 * 60; // night
    const night = solveTick(state, ctx, d, true);
    expect(night.dispatch.genMW.get(ic) ?? 0).toBeGreaterThan(0);
    expect(night.servedCustomers).toBeGreaterThan(0);
    expect(night.dispatch.priceMWh).toBeCloseTo(
      nationalPriceMWh(state.simTimeMin, state.weather),
      6,
    );

    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60; // evening peak
    const evening = solveTick(state, ctx, d, true);
    expect(evening.dispatch.genMW.get(ic) ?? 0).toBeGreaterThan(0);
    expect(evening.dispatch.priceMWh).toBeCloseTo(
      nationalPriceMWh(state.simTimeMin, state.weather),
      6,
    );
    // the cost of keeping the lights on follows the series: peak > night
    expect(evening.dispatch.priceMWh).toBeGreaterThan(2 * night.dispatch.priceMWh);
  });

  it('never carries a PPA top-up on imported energy', () => {
    const { ctx, state, ic } = fixture();
    const d = derive(state, ctx);
    state.simTimeMin = MIDSUMMER_MIN + 18.5 * 60;
    const out = solveTick(state, ctx, d, true);
    expect(out.dispatch.genMW.get(ic) ?? 0).toBeGreaterThan(0);
    expect(out.dispatch.ppaTopupKPerHour).toBe(0);
  });
});

describe('interconnector billing (DUoS, not PPA)', () => {
  it('annuitizes the converter hall into network capex while other gens stay out', () => {
    const assets: PlacedAsset[] = [
      { id: 1, kind: 'gen', gen: 'interconnector', x: 0, y: 0 },
      { id: 2, kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    ];
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
    const ic = GENS.interconnector;
    // exactly the interconnector's annuity — the gas plant bills nothing
    expect(bill.capexYrK).toBeCloseTo(ic.capexK * ANNUITY_FACTOR, 6);
    expect(bill.opexYrK).toBeCloseTo(ic.capexK * ic.opexFrac, 6);
    expect(bill.genYrK).toBe(0);
  });
});
