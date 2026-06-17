import { describe, expect, it } from 'vitest';
import {
  BASE_WEIGHTS,
  closePeriod,
  gradeOf,
  initialTargets,
  newPeriod,
  nextTargets,
  PERIOD_MIN,
  regulatorFraming,
  resolveWeights,
  type PeriodActuals,
} from '../src/sim/regulation/riio';
import {
  AUSTRALIA_REGULATOR,
  COUNTRY_PROFILES,
  FRANCE_REGULATOR,
  HONGKONG_REGULATOR,
  LONDON_REGULATOR,
} from '../src/sim/powerProfile';
import { derive, solveTick, advanceTime, currentPeriodActuals } from '../src/sim/tick';
import { poweredFixture } from './helpers';

const ON_TARGET: PeriodActuals = {
  bill: 3000,
  ci: 60,
  cml: 90,
  carbon: 250,
  curtailedFirm: 20_000,
  satisfaction: 60,
};

describe('RIIO scoring', () => {
  it('meeting every target lands ~70; beating them scores higher', () => {
    const p = newPeriod(1, 0, initialTargets());
    const onTarget = closePeriod(p, ON_TARGET);
    expect(onTarget.composite).toBeGreaterThanOrEqual(65);
    expect(onTarget.composite).toBeLessThanOrEqual(75);

    const star = closePeriod(p, {
      bill: 2000,
      ci: 30,
      cml: 40,
      carbon: 100,
      curtailedFirm: 5000,
      satisfaction: 80,
    });
    expect(star.composite).toBeGreaterThan(onTarget.composite);
    expect(star.grade < onTarget.grade || star.composite > onTarget.composite).toBe(true);
  });

  it('missing badly grades E, and grades map sanely', () => {
    const p = newPeriod(1, 0, initialTargets());
    const awful = closePeriod(p, {
      bill: 9000,
      ci: 300,
      cml: 600,
      carbon: 600,
      curtailedFirm: 90_000,
      satisfaction: 10,
    });
    expect(awful.grade).toBe('E');
    expect(gradeOf(90)).toBe('A');
    expect(gradeOf(72)).toBe('B');
    expect(gradeOf(20)).toBe('E');
  });

  it('per-country regulator weighting re-prioritises the report card', () => {
    // resolveWeights: no override is the base object itself; an override
    // merges + renormalises to sum 1
    expect(resolveWeights()).toBe(BASE_WEIGHTS);
    const hk = resolveWeights(HONGKONG_REGULATOR.kpiWeights);
    const sum = (Object.values(hk) as number[]).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 9);
    // Hong Kong's SoC leans hard on reliability vs the GB base
    expect(hk.ci + hk.cml).toBeGreaterThan(BASE_WEIGHTS.ci + BASE_WEIGHTS.cml);

    const p = newPeriod(1, 0, initialTargets());
    // an operator that is reliability-STAR but carbon-WEAK
    const reliableDirty: PeriodActuals = {
      bill: 3000,
      ci: 20,
      cml: 25,
      carbon: 520, // well over the 250 target
      curtailedFirm: 20_000,
      satisfaction: 70,
    };
    const underGb = closePeriod(p, reliableDirty, BASE_WEIGHTS);
    const underHk = closePeriod(p, reliableDirty, hk);
    // the same network scores BETTER under Hong Kong (reliability prized,
    // carbon discounted) than under Ofgem
    expect(underHk.composite).toBeGreaterThan(underGb.composite);

    // Australia (affordability + curtailment lean): a cheap, low-curtailment
    // but interruption-prone operator does better under AER than Ofgem
    const cheapPatchy: PeriodActuals = {
      bill: 2200,
      ci: 110,
      cml: 160,
      carbon: 250,
      curtailedFirm: 6000,
      satisfaction: 60,
    };
    const au = resolveWeights(AUSTRALIA_REGULATOR.kpiWeights);
    expect(closePeriod(p, cheapPatchy, au).composite).toBeGreaterThan(
      closePeriod(p, cheapPatchy, BASE_WEIGHTS).composite,
    );
  });

  it('the regulator tightens targets after a good period', () => {
    const prev = initialTargets();
    const next = nextTargets(prev, {
      bill: 700,
      ci: 20,
      cml: 30,
      carbon: 150,
      curtailedFirm: 4000,
      satisfaction: 70,
    });
    expect(next.bill).toBeLessThan(prev.bill);
    expect(next.ci).toBeLessThan(prev.ci);
    expect(next.satisfaction).toBeGreaterThan(prev.satisfaction);
  });

  it('a period closes after 5 game-years and opens the next with a report', () => {
    const { state, ctx } = poweredFixture();
    state.speed = 16;
    // jump near the period boundary, then tick across it
    state.simTimeMin = PERIOD_MIN - 300;
    const d = derive(state, ctx);
    for (let i = 0; i < 10; i++) {
      advanceTime(state);
      solveTick(state, ctx, d, true);
    }
    expect(state.period.index).toBe(2);
    expect(state.lastReport?.index).toBe(1);
    expect(state.lastReport?.composite).toBeGreaterThanOrEqual(0);
    expect(state.lastReport?.composite).toBeLessThanOrEqual(100);
    expect(state.period.targets.bill).toBeGreaterThan(0);
  });

  it('running actuals stay finite from the first tick', () => {
    const { state, ctx } = poweredFixture();
    state.speed = 1;
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);
    const a = currentPeriodActuals(state);
    for (const v of Object.values(a)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

// W8 Part-2b (3): the report-card panel speaks each country's regulatory
// language — the framing TEXT varies by regulator model (presentation only;
// the scoring difference is carried by kpiWeights, tested above).
describe('regulator framing per model (W8-2b item 3)', () => {
  it('GB/RIIO framing names Ofgem-style RIIO', () => {
    const f = regulatorFraming('riio');
    expect(f.scheme).toBe('RIIO');
    expect(f.review).toMatch(/incentive/i);
    expect(f.blurb).toMatch(/RIIO/);
  });

  it('profit-cap framing names a Scheme-of-Control permitted-return review', () => {
    const f = regulatorFraming('profit-cap');
    expect(f.scheme).toBe('Scheme of Control');
    expect(f.review).toMatch(/permitted-return/i);
    expect(f.blurb).toMatch(/reliab/i);
  });

  it('cost-of-service framing names a prudent-cost concession review', () => {
    const f = regulatorFraming('cost-of-service');
    expect(f.scheme).toBe('cost-of-service');
    expect(f.review).toMatch(/prudent-cost/i);
    expect(f.blurb).toMatch(/affordability|service/i);
  });

  it('every shipped country maps to a distinct, non-empty framing', () => {
    // London = Ofgem RIIO; HK = Scheme of Control; France = CRE cost-of-service
    expect(regulatorFraming(LONDON_REGULATOR.model).scheme).toBe('RIIO');
    expect(regulatorFraming(HONGKONG_REGULATOR.model).scheme).toBe('Scheme of Control');
    expect(regulatorFraming(FRANCE_REGULATOR.model).scheme).toBe('cost-of-service');
    // AER is a revenue-cap building-block but framed as riio in the profile
    expect(regulatorFraming(AUSTRALIA_REGULATOR.model).scheme).toBe('RIIO');
    // every country profile yields a usable framing (no missing model)
    for (const id of Object.keys(COUNTRY_PROFILES) as (keyof typeof COUNTRY_PROFILES)[]) {
      const f = regulatorFraming(COUNTRY_PROFILES[id].regulator.model);
      expect(f.scheme.length).toBeGreaterThan(0);
      expect(f.review.length).toBeGreaterThan(0);
      expect(f.blurb.length).toBeGreaterThan(0);
    }
  });
});
