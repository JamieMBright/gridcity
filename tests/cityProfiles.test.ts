// WP2 — per-country operating models WIRED to their cities. The four country
// MarketProfiles + RegulatorProfiles shipped a wave earlier but were attached
// to NO scenario, so Paris/Sydney/Hong Kong played identically to London. This
// suite proves the WIRING: that profileOf(<city>) now resolves the city's OWN
// operating model, AND that the resolved profile changes a CONCRETE sim output
// through the same code path the live sim uses (dispatch's national price, the
// RIIO report-card weights, the bill engine) — while London stays byte-identical.
//
// tests/market.test.ts already proves the bare CONSTANTS carry country
// character; this file proves the city → profile → sim-output WIRING.

import { describe, expect, it } from 'vitest';
import { profileOf } from '../src/data/cityRegistry';
import {
  AUSTRALIA_MARKET,
  AUSTRALIA_REGULATOR,
  FRANCE_MARKET,
  FRANCE_REGULATOR,
  HONGKONG_MARKET,
  HONGKONG_REGULATOR,
  LONDON_PROFILE,
} from '../src/sim/powerProfile';
import { nationalPriceMWh } from '../src/sim/market/dispatch';
import { seasonFactor } from '../src/sim/events/weather';
import {
  BASE_WEIGHTS,
  closePeriod,
  newPeriod,
  resolveWeights,
  type KpiKey,
  type PeriodActuals,
  type PeriodTargets,
} from '../src/sim/regulation/riio';
import { computeBill, type BillInputs } from '../src/sim/regulation/bill';

const MIN_PER_DAY = 1440;

/** Min/max wholesale price across a full day, using a city's RESOLVED market +
 *  weather profile (the exact pair runDispatch threads through). */
function dayRangeFor(cityId: string, dayDoy: number) {
  const p = profileOf(cityId);
  let min = Infinity;
  let max = -Infinity;
  for (let h = 0; h < 24; h++) {
    const price = nationalPriceMWh(dayDoy * MIN_PER_DAY + h * 60, {}, p.market, p.weather);
    min = Math.min(min, price);
    max = Math.max(max, price);
  }
  return { min, max };
}

/** The day-of-year (≈noon sample) where a city's own weather profile peaks /
 *  troughs its season factor — i.e. its summer / winter. */
function peakDoyFor(cityId: string): number {
  const wp = profileOf(cityId).weather;
  let bestT = 0;
  let best = -1;
  for (let d = 0; d < 365; d++) {
    const t = d * MIN_PER_DAY + 12 * 60;
    const sf = seasonFactor(t, wp);
    if (sf > best) {
      best = sf;
      bestT = t;
    }
  }
  return bestT;
}

// --- 1. the WIRING: each city resolves its OWN country operating model ------

describe('WP2 wiring — cities resolve their own operating model', () => {
  it('Paris resolves the France profile (market + CRE regulator + €), not London', () => {
    const p = profileOf('paris');
    expect(p.market).toBe(FRANCE_MARKET);
    expect(p.regulator).toBe(FRANCE_REGULATOR);
    expect(p.economy.iso).toBe('EUR');
    expect(p.economy.symbol).toBe('€');
    expect(p).not.toEqual(LONDON_PROFILE);
  });

  it('Sydney resolves the Australia profile (duck-curve market + AER + A$, summer)', () => {
    const p = profileOf('sydney');
    expect(p.market).toBe(AUSTRALIA_MARKET);
    expect(p.regulator).toBe(AUSTRALIA_REGULATOR);
    expect(p.economy.iso).toBe('AUD');
    expect(p.weather.peakSeason).toBe('summer');
    expect(p).not.toEqual(LONDON_PROFILE);
  });

  it('Hong Kong resolves the HK profile (high-stable market + SoC + HK$, summer)', () => {
    const p = profileOf('hongkong');
    expect(p.market).toBe(HONGKONG_MARKET);
    expect(p.regulator).toBe(HONGKONG_REGULATOR);
    expect(p.economy.iso).toBe('HKD');
    expect(p.weather.peakSeason).toBe('summer');
    expect(p).not.toEqual(LONDON_PROFILE);
  });

  it('Hong Kong stays on the tender ownership model (the owned fork is Phase-C)', () => {
    // DESIGN.md Phase-A explicitly ships HK on 'tender'; flipping to 'owned'
    // before the build-generation path exists would strand the player.
    expect(profileOf('hongkong').generation.ownership).toBe('tender');
  });

  it('France ships the baseloadFloor data hook (dormant until dispatch Phase-D)', () => {
    expect(profileOf('paris').generation.baseloadFloor).toBeGreaterThan(0);
  });
});

// --- 2. each wired profile changes a CONCRETE sim output (the price series) -

describe('WP2 — the wholesale price series differs per city through the wiring', () => {
  it("Sydney's midday price goes NEGATIVE (the rooftop-PV duck curve)", () => {
    // sample noon on Sydney's own summer peak day, via its resolved profile
    const summerNoonT = peakDoyFor('sydney') + 30; // ~12:30
    const p = profileOf('sydney');
    const noon = nationalPriceMWh(summerNoonT, {}, p.market, p.weather);
    expect(noon).toBeLessThan(0);
    // London never goes negative (no PV flood in its market shape)
    const lon = profileOf('london');
    const lonNoon = nationalPriceMWh(summerNoonT, {}, lon.market, lon.weather);
    expect(lonNoon).toBeGreaterThan(0);
  });

  it('Paris is a low, flat market vs London (the nuclear floor)', () => {
    // compare on London's winter (when GB dears most) — France stays flat/low
    const winterDoy = 15;
    const fr = dayRangeFor('paris', winterDoy);
    const gb = dayRangeFor('london', winterDoy);
    expect(fr.max).toBeLessThan(gb.max);
    expect(fr.max - fr.min).toBeLessThan(gb.max - gb.min);
  });

  it('Hong Kong is a high, never-negative market (regulated gas)', () => {
    const summerDoy = 200;
    const hk = dayRangeFor('hongkong', summerDoy);
    const gb = dayRangeFor('london', summerDoy);
    expect(hk.min).toBeGreaterThan(0); // no PV flood
    expect(hk.min).toBeGreaterThan(gb.min); // higher floor than GB
  });
});

// --- 3. the regulator report card scores differently per city --------------

const TARGETS: PeriodTargets = {
  bill: 3000,
  ci: 60,
  cml: 90,
  carbon: 250,
  curtailedFirm: 20_000,
  satisfaction: 60,
};

/** Score one fixed set of actuals under a city's resolved KPI weights. */
function scoreUnder(cityId: string, actuals: PeriodActuals): number {
  const p = newPeriod(1, 0, TARGETS);
  const card = closePeriod(p, actuals, resolveWeights(profileOf(cityId).regulator.kpiWeights));
  return card.composite;
}

describe('WP2 — the same network scores differently under each regulator', () => {
  it('London uses the Ofgem BASE_WEIGHTS unchanged (the determinism anchor)', () => {
    expect(resolveWeights(profileOf('london').regulator.kpiWeights)).toBe(BASE_WEIGHTS);
  });

  it("Hong Kong's SoC rewards world-best reliability far more than Ofgem", () => {
    // a network that is BRILLIANT on reliability but mediocre elsewhere
    const reliable: PeriodActuals = {
      bill: 3200,
      ci: 20, // well under the 60 target → great
      cml: 25, // well under 90 → great
      carbon: 300, // a bit over
      curtailedFirm: 25_000, // a bit over
      satisfaction: 62,
    };
    // HK weights CI+CML 0.26 each; Ofgem only 0.15 each → HK rewards this net more
    expect(scoreUnder('hongkong', reliable)).toBeGreaterThan(scoreUnder('london', reliable));
  });

  it("France's CRE barely scores carbon (the nuclear grid is already clean)", () => {
    const frWeights = resolveWeights(profileOf('paris').regulator.kpiWeights);
    const gbWeights = resolveWeights(profileOf('london').regulator.kpiWeights);
    // carbon weight is pared right back vs Ofgem…
    expect(frWeights.carbon).toBeLessThan(gbWeights.carbon);
    expect(frWeights.carbon).toBeLessThan(0.1);
    // …so a CARBON-DIRTY but otherwise-fine network is punished less in France.
    const dirty: PeriodActuals = {
      bill: 3000,
      ci: 60,
      cml: 90,
      carbon: 600, // way over the 250 target
      curtailedFirm: 20_000,
      satisfaction: 60,
    };
    expect(scoreUnder('paris', dirty)).toBeGreaterThan(scoreUnder('london', dirty));
  });

  it("Australia's AER leans on firm-curtailment headroom more than Ofgem", () => {
    const auWeights = resolveWeights(profileOf('sydney').regulator.kpiWeights);
    const gbWeights = resolveWeights(profileOf('london').regulator.kpiWeights);
    expect(auWeights.curtailedFirm).toBeGreaterThan(gbWeights.curtailedFirm);
  });

  it('every resolved weight set still sums to 1 (renormalised)', () => {
    for (const id of ['london', 'paris', 'sydney', 'hongkong']) {
      const w = resolveWeights(profileOf(id).regulator.kpiWeights);
      const sum = (Object.keys(w) as KpiKey[]).reduce((s, k) => s + w[k], 0);
      expect(sum).toBeCloseTo(1, 9);
    }
  });
});

// --- 4. the bill re-prices through each city's economy profile --------------

function billInputs(over: Partial<BillInputs> = {}): BillInputs {
  return {
    assets: [],
    energyYrK: 4000,
    ppaYrK: 1200,
    servedCustomers: 200_000,
    totalCustomers: 240_000,
    fleetSize: 4,
    vegPolicy: 0,
    vegCostMul: 1,
    flexYrK: 100,
    constraintYrK: 50,
    lossYrK: 300,
    penaltyYrK: 0,
    levyPct: 0.5,
    ...over,
  };
}

describe('WP2 — the bill re-prices through each city economy', () => {
  it('Paris/Sydney/Hong Kong all bill a different per-customer figure than London', () => {
    const lon = computeBill(billInputs({ economy: profileOf('london').economy }));
    for (const id of ['paris', 'sydney', 'hongkong']) {
      const city = computeBill(billInputs({ economy: profileOf(id).economy }));
      expect(city.perCustomerYr).not.toBeCloseTo(lon.perCustomerYr, 2);
    }
  });
});

// --- 5. London is byte-identical through the new resolveProfile path --------

describe('WP2 — London stays byte-identical (determinism contract)', () => {
  it('profileOf("london") deep-equals LONDON_PROFILE', () => {
    expect(profileOf('london')).toEqual(LONDON_PROFILE);
  });

  it('the London price series equals the bare-default series (no profile drift)', () => {
    const p = profileOf('london');
    for (let d = 0; d < 365; d += 13) {
      for (let h = 0; h < 24; h += 2) {
        const t = d * MIN_PER_DAY + h * 60;
        // resolved-London market+weather === the function's GB defaults
        expect(nationalPriceMWh(t, {}, p.market, p.weather)).toBe(nationalPriceMWh(t, {}));
      }
    }
  });

  it('the London bill equals the bare-default bill', () => {
    const p = profileOf('london');
    const resolved = computeBill(billInputs({ economy: p.economy, generation: p.generation }));
    const bare = computeBill(billInputs());
    expect(resolved).toEqual(bare);
  });
});
