import { describe, expect, it } from 'vitest';
import {
  REG_ASSET_LIFE_YEARS,
  REG_WACC,
  TOTEX_SHARING,
  RAV_ENGAGE_GROSS_K,
  RAV_ENGAGE_CUSTOMERS,
  allowedRevenue,
  newRav,
  networkCapexOnRegisterK,
  ravCapexK,
  ravEngaged,
  reliabilityIncentiveYrK,
  regDepreciationYrK,
  returnOnRavYrK,
  rollRav,
} from '../src/sim/regulation/rav';
import {
  deserialize,
  newGame,
  serialize,
  SAVE_VERSION,
  type GameState,
} from '../src/sim/state';
import type { PlacedAsset } from '../src/sim/assets';
import { derive, solveTick, advanceTime } from '../src/sim/tick';
import { poweredFixture } from './helpers';

const MIN_PER_YEAR = 525_600;

describe('RAV accumulation + straight-line depreciation', () => {
  it('starts at zero and absorbs committed network capex', () => {
    const rav = newRav();
    expect(rav.grossK).toBe(0);
    expect(rav.netK).toBe(0);
    // commit £100m of network capex (no time elapsed: no depreciation yet)
    rollRav(rav, 100_000, 0);
    expect(rav.grossK).toBe(100_000);
    expect(rav.netK).toBe(100_000);
  });

  it('depreciates straight-line over the regulatory asset life', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0); // £100m gross
    // run one full year of depreciation in one step
    rollRav(rav, 100_000, MIN_PER_YEAR);
    const expectedDep = 100_000 / REG_ASSET_LIFE_YEARS;
    expect(rav.grossK).toBe(100_000); // gross pool unchanged by depreciation
    expect(rav.netK).toBeCloseTo(100_000 - expectedDep, 3);
    // and many small steps sum to the same depreciation (determinism)
    const rav2 = newRav();
    rollRav(rav2, 100_000, 0);
    for (let i = 0; i < 1000; i++) rollRav(rav2, 100_000, MIN_PER_YEAR / 1000);
    expect(rav2.netK).toBeCloseTo(rav.netK, 2);
  });

  it('never depreciates the RAV below zero', () => {
    const rav = newRav();
    rollRav(rav, 1_000, 0);
    for (let i = 0; i < REG_ASSET_LIFE_YEARS * 2; i++) rollRav(rav, 1_000, MIN_PER_YEAR);
    expect(rav.netK).toBe(0);
    expect(rav.grossK).toBe(1_000);
  });

  it('a demolition (register total falling) retires iron from the pool', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0);
    rollRav(rav, 100_000, MIN_PER_YEAR); // depreciate a year
    const netBefore = rav.netK;
    // half the network is demolished: register total halves
    rollRav(rav, 50_000, 0);
    expect(rav.grossK).toBe(50_000);
    // net followed pro-rata (half of the depreciated book value)
    expect(rav.netK).toBeCloseTo(netBefore / 2, 3);
  });

  it('regDepreciation and returnOnRav use the documented constants', () => {
    const rav = newRav();
    rollRav(rav, 200_000, 0);
    expect(regDepreciationYrK(rav)).toBeCloseTo(200_000 / REG_ASSET_LIFE_YEARS, 6);
    expect(returnOnRavYrK(rav)).toBeCloseTo(200_000 * REG_WACC, 6);
  });
});

describe('ravCapexK inclusion rule (mirrors the bill network pot)', () => {
  it('excludes private generation and iDNO iron; includes the interconnector', () => {
    const idnoSub: PlacedAsset = {
      id: 1,
      kind: 'sub',
      sub: 'dist',
      x: 0,
      y: 0,
      mva: 10,
      mvaAuto: false,
      idno: true,
    };
    expect(ravCapexK(idnoSub)).toBe(0);
    const solar: PlacedAsset = { id: 2, kind: 'gen', gen: 'solarFarm', x: 0, y: 0 };
    expect(ravCapexK(solar)).toBe(0);
    const inter: PlacedAsset = { id: 3, kind: 'gen', gen: 'interconnector', x: 0, y: 0 };
    expect(ravCapexK(inter)).toBeGreaterThan(0);
  });
});

describe('allowed revenue components + totex sharing', () => {
  const rav = (() => {
    const r = newRav();
    rollRav(r, 300_000, 0); // £300m RAV
    return r;
  })();

  it('sums return + depreciation + opex + sharing + incentive', () => {
    const rev = allowedRevenue({
      rav,
      actualTotexYrK: 5_000,
      opexAllowanceYrK: 2_000,
      incentiveYrK: 50,
      totexAllowanceYrK: 5_000, // on allowance → zero sharing
    });
    expect(rev.returnYrK).toBeCloseTo(300_000 * REG_WACC, 3);
    expect(rev.depreciationYrK).toBeCloseTo(300_000 / REG_ASSET_LIFE_YEARS, 3);
    expect(rev.opexAllowanceYrK).toBe(2_000);
    expect(rev.sharingYrK).toBeCloseTo(0, 6);
    expect(rev.incentiveYrK).toBe(50);
    expect(rev.totalYrK).toBeCloseTo(
      rev.returnYrK + rev.depreciationYrK + 2_000 + 0 + 50,
      3,
    );
  });

  it('rewards underspend and penalises overspend at the sharing factor', () => {
    const under = allowedRevenue({
      rav,
      actualTotexYrK: 4_000,
      opexAllowanceYrK: 0,
      incentiveYrK: 0,
      totexAllowanceYrK: 5_000, // beat allowance by £1m
    });
    expect(under.sharingYrK).toBeCloseTo(1_000 * TOTEX_SHARING, 6);
    expect(under.sharingYrK).toBeGreaterThan(0); // reward

    const over = allowedRevenue({
      rav,
      actualTotexYrK: 6_000,
      opexAllowanceYrK: 0,
      incentiveYrK: 0,
      totexAllowanceYrK: 5_000, // overspend by £1m
    });
    expect(over.sharingYrK).toBeCloseTo(-1_000 * TOTEX_SHARING, 6);
    expect(over.sharingYrK).toBeLessThan(0); // penalty
  });
});

describe('reliability incentive sign', () => {
  it('beating CI/CML targets rewards; missing them penalises', () => {
    // both actuals well BELOW target (lower is better) → reward
    const reward = reliabilityIncentiveYrK(40, 60, 60, 90, 100_000);
    expect(reward).toBeGreaterThan(0);
    // both actuals well ABOVE target → penalty
    const penalty = reliabilityIncentiveYrK(90, 60, 140, 90, 100_000);
    expect(penalty).toBeLessThan(0);
    // on target → roughly neutral
    const neutral = reliabilityIncentiveYrK(60, 60, 90, 90, 100_000);
    expect(Math.abs(neutral)).toBeLessThan(1);
    // scales with the served base
    const big = reliabilityIncentiveYrK(40, 60, 60, 90, 200_000);
    expect(big).toBeCloseTo(reward * 2, 6);
  });
});

describe('the phase-in gate', () => {
  it('is dormant before, engaged after the network is up and running', () => {
    const small = newRav();
    rollRav(small, RAV_ENGAGE_GROSS_K - 1, 0);
    // below the RAV threshold → dormant whatever the served base
    expect(ravEngaged(small, RAV_ENGAGE_CUSTOMERS, false)).toBe(false);

    const big = newRav();
    rollRav(big, RAV_ENGAGE_GROSS_K, 0);
    // RAV crossed but too few customers → dormant
    expect(ravEngaged(big, RAV_ENGAGE_CUSTOMERS - 1, false)).toBe(false);
    // both thresholds met but still in the rebuild grace → dormant
    expect(ravEngaged(big, RAV_ENGAGE_CUSTOMERS, true)).toBe(false);
    // both met, grace over → ENGAGED
    expect(ravEngaged(big, RAV_ENGAGE_CUSTOMERS, false)).toBe(true);
  });

  it('engagement is sticky once true', () => {
    const rav = newRav();
    rav.engaged = true;
    // even with no RAV and no customers, once engaged it stays engaged
    expect(ravEngaged(rav, 0, true)).toBe(true);
  });
});

describe('RAV save round-trip', () => {
  it('serializes and restores the RAV stock exactly', () => {
    const s: GameState = newGame();
    rollRav(s.rav, 123_456, 0);
    rollRav(s.rav, 123_456, MIN_PER_YEAR); // depreciate a year
    s.rav.engaged = true;
    const data = serialize(s);
    expect(data.v).toBe(SAVE_VERSION);
    const back = deserialize(data);
    expect(back.rav.grossK).toBeCloseTo(s.rav.grossK, 6);
    expect(back.rav.netK).toBeCloseTo(s.rav.netK, 6);
    expect(back.rav.engaged).toBe(true);
  });

  it('self-heals a pre-feature save (no rav field) from the register', () => {
    const s: GameState = newGame();
    const data = serialize(s);
    // simulate a pre-feature save: drop the rav field
    const legacy = { ...data };
    delete (legacy as { rav?: unknown }).rav;
    const back = deserialize(legacy);
    // rebuilt from the register's committed network capex (gross === net)
    const expected = networkCapexOnRegisterK(back.assets.values());
    expect(back.rav.grossK).toBeCloseTo(expected, 6);
    expect(back.rav.netK).toBeCloseTo(expected, 6);
    expect(back.rav.engaged).toBe(false);
  });
});

describe('the tick wires RAV in (dormant before, engaged after)', () => {
  it('builds RAV from zero and only surfaces revenue once phased in', () => {
    const { state, ctx } = poweredFixture();
    state.speed = 16;
    const d = derive(state, ctx);

    // day 0: RAV starts at zero
    expect(state.rav.grossK).toBe(0);

    // a few live ticks: the RAV grows to the register's network capex, but
    // the layer is still dormant (small grid, in rebuild grace) → no
    // regulatory view on the snapshot
    let out = solveTick(state, ctx, d, true);
    expect(state.rav.grossK).toBeGreaterThan(0);
    expect(out.regulatory).toBeUndefined();

    // force the phase-in: a real RAV and the engagement flag already set
    // (the sticky gate — the fixture's tiny served base won't cross the
    // customer threshold on its own, but engagement persists once true).
    // Jump past the rebuild grace too. The revenue building blocks must now
    // surface on the snapshot, computed off the live RAV.
    state.rav.grossK = RAV_ENGAGE_GROSS_K * 4;
    state.rav.netK = RAV_ENGAGE_GROSS_K * 4;
    state.rav.engaged = true;
    state.simTimeMin = 365 * 1440; // a year in — rebuild grace is long over
    advanceTime(state);
    out = solveTick(state, ctx, derive(state, ctx), true);

    expect(out.regulatory).toBeDefined();
    expect(out.regulatory?.ravK).toBeGreaterThan(0);
    expect(out.regulatory?.revenue.returnYrK).toBeGreaterThan(0);
    expect(out.regulatory?.revenue.depreciationYrK).toBeGreaterThan(0);
    // allowed revenue = return + depreciation + opex + sharing + incentive
    const rev = out.regulatory!.revenue;
    expect(rev.totalYrK).toBeCloseTo(
      rev.returnYrK + rev.depreciationYrK + rev.opexAllowanceYrK + rev.sharingYrK + rev.incentiveYrK,
      3,
    );
  });
});
