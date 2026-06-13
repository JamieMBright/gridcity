import { describe, expect, it } from 'vitest';
import { computeStars, type LessonMetrics } from '../src/ui/lessonProgress';

const metrics = (over: Partial<LessonMetrics> = {}): LessonMetrics => ({
  perCustomerDuosYr: 150,
  assetCount: 4,
  hadOverload: false,
  ...over,
});

describe('computeStars', () => {
  it('a clean, lean completion earns three stars', () => {
    expect(computeStars(metrics())).toBe(3);
  });

  it('completing at all is worth at least one star', () => {
    // every quality signal bad: ran hot AND gold-plated AND pricey
    expect(
      computeStars({ perCustomerDuosYr: 999, assetCount: 99, hadOverload: true }),
    ).toBe(1);
  });

  it('an overload costs the clean-network star', () => {
    // still lean/cheap, so keeps the efficiency star → 2
    expect(computeStars(metrics({ hadOverload: true }))).toBe(2);
  });

  it('a pricey, over-built (but unbroken) network loses the efficiency star', () => {
    expect(
      computeStars({ perCustomerDuosYr: 999, assetCount: 99, hadOverload: false }),
    ).toBe(2);
  });

  it('a lean asset count alone earns the efficiency star even when the bill is high', () => {
    expect(computeStars(metrics({ perCustomerDuosYr: 999, assetCount: 5 }))).toBe(3);
  });

  it('a comfortable bill alone earns the efficiency star even when over-built', () => {
    expect(computeStars(metrics({ perCustomerDuosYr: 100, assetCount: 99 }))).toBe(3);
  });

  it('never exceeds three stars', () => {
    expect(computeStars(metrics({ perCustomerDuosYr: 1, assetCount: 1 }))).toBeLessThanOrEqual(3);
  });
});
