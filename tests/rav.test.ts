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
  ravDepRateYrK,
  ravEngaged,
  ravNetFracAtAge,
  reconcileVintages,
  reliabilityIncentiveYrK,
  regDepreciationYrK,
  returnOnRavYrK,
  rollRav,
  type RavState,
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

describe('RAV accumulation + sum-of-digits depreciation', () => {
  it('starts at zero and absorbs committed network capex', () => {
    const rav = newRav();
    expect(rav.grossK).toBe(0);
    expect(rav.netK).toBe(0);
    expect(rav.vintages).toEqual([]);
    // commit £100m of network capex (no time elapsed: no depreciation yet)
    rollRav(rav, 100_000, 0);
    expect(rav.grossK).toBe(100_000);
    expect(rav.netK).toBe(100_000);
    expect(rav.vintages).toHaveLength(1); // one fresh vintage at age 0
    expect(rav.vintages[0]?.ageMin).toBe(0);
  });

  it('depreciates on the sum-of-digits curve: f(t)=1−(t/L)² of original gross', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0); // £100m gross, age 0
    // run one full year of depreciation in one step
    rollRav(rav, 100_000, MIN_PER_YEAR);
    expect(rav.grossK).toBe(100_000); // gross pool unchanged by depreciation
    expect(rav.netK).toBeCloseTo(100_000 * ravNetFracAtAge(MIN_PER_YEAR), 3);
    // and many small steps land on the same closed-form book (determinism)
    const rav2 = newRav();
    rollRav(rav2, 100_000, 0);
    for (let i = 0; i < 1000; i++) rollRav(rav2, 100_000, MIN_PER_YEAR / 1000);
    expect(rav2.netK).toBeCloseTo(rav.netK, 2);
  });

  it('back-loads depreciation — a near-zero holiday early, accelerating with age', () => {
    // year-1 depreciation is a TINY fraction of the straight-line figure (the
    // documented "depreciation holiday"), and the pool is well under half
    // depreciated at the half-life mark (vs exactly half under straight line).
    const rav = newRav();
    rollRav(rav, 100_000, 0);
    rollRav(rav, 100_000, MIN_PER_YEAR); // one year
    const depYr1 = 100_000 - rav.netK;
    const straightLineYr = 100_000 / REG_ASSET_LIFE_YEARS;
    expect(depYr1).toBeLessThan(straightLineYr * 0.1); // holiday: <10% of flat
    expect(depYr1).toBeGreaterThan(0); // but not zero

    // at the half-life: only 25% gone (1−(0.5)² = 0.75 remaining)
    const half = newRav();
    rollRav(half, 100_000, 0);
    rollRav(half, 100_000, (REG_ASSET_LIFE_YEARS / 2) * MIN_PER_YEAR);
    expect(half.netK).toBeCloseTo(75_000, 0);

    // the annual depreciation RUN-RATE rises monotonically with age
    const rateYoung = ravDepRateYrK(100_000, 2 * MIN_PER_YEAR);
    const rateMid = ravDepRateYrK(100_000, 20 * MIN_PER_YEAR);
    const rateOld = ravDepRateYrK(100_000, 40 * MIN_PER_YEAR);
    expect(rateYoung).toBeLessThan(rateMid);
    expect(rateMid).toBeLessThan(rateOld);
  });

  it('recovers the FULL capital by end of life (no over/under recovery)', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0);
    rollRav(rav, 100_000, REG_ASSET_LIFE_YEARS * MIN_PER_YEAR); // a whole life
    expect(rav.netK).toBeCloseTo(0, 6); // fully depreciated, exactly
  });

  it('never depreciates the RAV below zero', () => {
    const rav = newRav();
    rollRav(rav, 1_000, 0);
    for (let i = 0; i < REG_ASSET_LIFE_YEARS * 2; i++) rollRav(rav, 1_000, MIN_PER_YEAR);
    expect(rav.netK).toBe(0);
    // the spent vintage is dropped, but the register total still reads £1m
    rollRav(rav, 1_000, 0);
    expect(rav.grossK).toBe(1_000); // a re-added vintage keeps the base
  });

  it('a demolition (register total falling) retires iron from the pool pro-rata', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0);
    rollRav(rav, 100_000, MIN_PER_YEAR); // depreciate a year
    const netBefore = rav.netK;
    // half the network is demolished: register total halves
    rollRav(rav, 50_000, 0);
    expect(rav.grossK).toBeCloseTo(50_000, 6);
    // net followed pro-rata (half of the depreciated book value)
    expect(rav.netK).toBeCloseTo(netBefore / 2, 3);
  });

  it('regDepreciation tracks the sum-of-digits run-rate; returnOnRav uses the WACC', () => {
    const rav = newRav();
    rollRav(rav, 200_000, 0); // age 0
    // at age 0 the depreciation run-rate is ZERO (the holiday); a young pool
    // recovers far less capital than the flat gross/life figure
    expect(regDepreciationYrK(rav)).toBeCloseTo(0, 6);
    rollRav(rav, 200_000, 10 * MIN_PER_YEAR); // age 10 years
    expect(regDepreciationYrK(rav)).toBeCloseTo(ravDepRateYrK(200_000, 10 * MIN_PER_YEAR), 6);
    expect(regDepreciationYrK(rav)).toBeLessThan(200_000 / REG_ASSET_LIFE_YEARS);
    // return on RAV is unchanged: net RAV × WACC
    expect(returnOnRavYrK(rav)).toBeCloseTo(rav.netK * REG_WACC, 6);
  });
});

describe('the sum-of-digits curve (ravNetFracAtAge)', () => {
  const L = REG_ASSET_LIFE_YEARS * MIN_PER_YEAR;
  it('is 1 at commitment, 0 at/after end of life, quadratic between', () => {
    expect(ravNetFracAtAge(0)).toBe(1);
    expect(ravNetFracAtAge(-10)).toBe(1); // guards a negative age
    expect(ravNetFracAtAge(L)).toBe(0);
    expect(ravNetFracAtAge(L * 1.5)).toBe(0);
    expect(ravNetFracAtAge(L / 2)).toBeCloseTo(0.75, 6); // 1−0.25
    expect(ravNetFracAtAge(L / 4)).toBeCloseTo(0.9375, 6); // 1−1/16
  });
  it('is monotonically decreasing (book never rises)', () => {
    let prev = 1;
    for (let yr = 0; yr <= REG_ASSET_LIFE_YEARS; yr++) {
      const f = ravNetFracAtAge(yr * MIN_PER_YEAR);
      expect(f).toBeLessThanOrEqual(prev + 1e-12);
      prev = f;
    }
  });
});

describe('RAV phase-in: a big capex wave ramps revenue, it is not a cliff', () => {
  it('the first year after a wave recovers far less capital than flat depreciation', () => {
    // a £500m reinforcement wave commits in one go
    const rav = newRav();
    rollRav(rav, 500_000, 0);
    rollRav(rav, 500_000, MIN_PER_YEAR);
    const depYr1 = regDepreciationYrK(rav); // run-rate one year in
    const flat = 500_000 / REG_ASSET_LIFE_YEARS; // what straight-line would bill
    // the holiday: barely a fraction of the flat figure hits the bill at first
    expect(depYr1).toBeLessThan(flat * 0.1);
  });

  it('a steady build programme grows the depreciation run-rate year on year', () => {
    // build £20m of network every year for 15 years; the recovered-capital
    // run-rate should climb each year (ageing vintages + fresh ones), never
    // jumping to a cliff
    const rav = newRav();
    let committed = 0;
    const rates: number[] = [];
    for (let yr = 1; yr <= 15; yr++) {
      committed += 20_000;
      rollRav(rav, committed, MIN_PER_YEAR);
      rates.push(regDepreciationYrK(rav));
    }
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]!).toBeGreaterThan(rates[i - 1]!); // monotonic ramp
    }
    // and the ramp stays gentle: even after 15 years of building it is still
    // well under the flat gross/life figure for the committed base
    expect(rates[rates.length - 1]!).toBeLessThan(committed / REG_ASSET_LIFE_YEARS);
  });

  it('each vintage runs its OWN holiday — a late wave does not inherit an old age', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 0);
    rollRav(rav, 100_000, 30 * MIN_PER_YEAR); // age the first vintage 30y
    const before = regDepreciationYrK(rav);
    rollRav(rav, 200_000, 0); // a fresh £100m vintage at age 0
    // the new vintage adds ZERO depreciation immediately (its own holiday),
    // so the run-rate is unchanged the instant it commits
    expect(regDepreciationYrK(rav)).toBeCloseTo(before, 6);
    expect(rav.vintages).toHaveLength(2);
  });
});

describe('reconcileVintages (pre-sum-of-digits save self-heal)', () => {
  it('synthesizes one vintage at the age its remaining fraction implies', () => {
    // a legacy save: only grossK/netK, no vintages (75% remaining → ~half-life)
    const legacy: RavState = { grossK: 100_000, netK: 75_000, engaged: true, vintages: [] };
    reconcileVintages(legacy);
    expect(legacy.vintages).toHaveLength(1);
    expect(legacy.vintages[0]!.grossK).toBe(100_000);
    expect(legacy.vintages[0]!.netK).toBe(75_000);
    // f=0.75 ⇒ age = L·√(1−0.75) = L/2
    expect(legacy.vintages[0]!.ageMin).toBeCloseTo((REG_ASSET_LIFE_YEARS / 2) * MIN_PER_YEAR, 0);
  });

  it('leaves an already-vintaged pool untouched (idempotent) + re-syncs totals', () => {
    const rav = newRav();
    rollRav(rav, 100_000, 5 * MIN_PER_YEAR);
    const v = rav.vintages.map((x) => ({ ...x }));
    reconcileVintages(rav);
    expect(rav.vintages).toEqual(v);
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
  // £300m of network, aged 15 years so it is off its depreciation holiday and
  // recovering capital (a brand-new pool returns zero depreciation revenue).
  const rav = (() => {
    const r = newRav();
    rollRav(r, 300_000, 0);
    rollRav(r, 300_000, 15 * MIN_PER_YEAR);
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
    // return is on the DEPRECIATED RAV (net), not the gross base
    expect(rev.returnYrK).toBeCloseTo(rav.netK * REG_WACC, 3);
    expect(rev.returnYrK).toBeGreaterThan(0);
    // depreciation is the sum-of-digits run-rate at this age — positive, and
    // (the pool being young-ish) below the flat gross/life figure
    expect(rev.depreciationYrK).toBeCloseTo(ravDepRateYrK(300_000, 15 * MIN_PER_YEAR), 3);
    expect(rev.depreciationYrK).toBeGreaterThan(0);
    expect(rev.depreciationYrK).toBeLessThan(300_000 / REG_ASSET_LIFE_YEARS);
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
    // the per-vintage pool round-trips (deep-copied, so no aliasing)
    expect(back.rav.vintages).toEqual(s.rav.vintages);
    expect(back.rav.vintages).not.toBe(s.rav.vintages);
    back.rav.vintages[0]!.netK = -999; // mutating the restore can't touch s
    expect(s.rav.vintages[0]!.netK).not.toBe(-999);
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

    // force the phase-in: flip the sticky engagement flag (the fixture's tiny
    // served base won't cross the customer threshold on its own, but
    // engagement persists once true), and age the network a decade so the
    // real RAV vintage is off its sum-of-digits holiday and recovering
    // capital. Jump past the rebuild grace too. The RAV stays backed by the
    // register's real iron (no artificial over-statement), and the revenue
    // building blocks must now surface on the snapshot.
    state.rav.engaged = true;
    // walk the RAV forward ten game-years so its vintage ages on the curve
    for (let yr = 0; yr < 10; yr++) {
      rollRav(state.rav, networkCapexOnRegisterK(state.assets.values()), MIN_PER_YEAR);
    }
    expect(state.rav.netK).toBeGreaterThan(0);
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
