import { describe, expect, it } from 'vitest';
import {
  closePeriod,
  gradeOf,
  initialTargets,
  newPeriod,
  nextTargets,
  PERIOD_MIN,
  type PeriodActuals,
} from '../src/sim/regulation/riio';
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
