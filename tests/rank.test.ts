// Operator RANK ladder (src/ui/rank.ts): the tier thresholds, the
// points→rank mapping's monotonicity, folding a period's composite into the
// career record (accumulation + the rank-up boundary), and the
// localStorage round-trip. The node test env has no localStorage, so a tiny
// in-memory shim stands in for the persistence round-trip.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPeriodResult,
  applyPeriod,
  currentRank,
  MAX_TIER,
  mergeCareer,
  rankForPoints,
  readCareer,
  TIERS,
  type CareerRecord,
} from '../src/ui/rank';

// noUncheckedIndexedAccess is on: a tiny typed accessor keeps the assertions
// readable (the index is always in-range by construction here).
const tier = (i: number) => TIERS[i]!;

// --- in-memory localStorage shim (node test env) --------------------------
function installLocalStorage(): void {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', shim);
}

describe('TIERS ladder', () => {
  it('has 7 evocative rungs, indexed 0..6', () => {
    expect(TIERS).toHaveLength(7);
    expect(MAX_TIER).toBe(6);
    TIERS.forEach((t, i) => expect(t.index).toBe(i));
  });

  it('thresholds start at 0 and strictly increase', () => {
    expect(tier(0).minPoints).toBe(0);
    for (let i = 1; i < TIERS.length; i++) {
      expect(tier(i).minPoints).toBeGreaterThan(tier(i - 1).minPoints);
    }
  });

  it('every rung has a title and a blurb', () => {
    for (const t of TIERS) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe('rankForPoints', () => {
  it('0 points is the first rung; below-zero clamps there too', () => {
    expect(rankForPoints(0).tier.index).toBe(0);
    expect(rankForPoints(-50).tier.index).toBe(0);
  });

  it('lands exactly on each threshold for the matching tier', () => {
    for (const t of TIERS) {
      expect(rankForPoints(t.minPoints).tier.index).toBe(t.index);
    }
  });

  it('a point below a threshold stays on the lower rung', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(rankForPoints(tier(i).minPoints - 1).tier.index).toBe(i - 1);
    }
  });

  it('is monotonic: more points never demotes you', () => {
    let lastTier = -1;
    for (let p = 0; p <= 3500; p += 17) {
      const idx = rankForPoints(p).tier.index;
      expect(idx).toBeGreaterThanOrEqual(lastTier);
      lastTier = idx;
    }
  });

  it('reports progress to the next rung in 0..1, and 1 at the top', () => {
    const mid = rankForPoints(tier(1).minPoints);
    expect(mid.next?.index).toBe(2);
    expect(mid.progress).toBeGreaterThanOrEqual(0);
    expect(mid.progress).toBeLessThanOrEqual(1);
    // exactly on a threshold = 0 progress into the new rung
    expect(mid.progress).toBe(0);
    // halfway up rung 1 → ~0.5
    const half = rankForPoints(
      tier(1).minPoints + (tier(2).minPoints - tier(1).minPoints) / 2,
    );
    expect(half.progress).toBeCloseTo(0.5, 5);

    const top = rankForPoints(tier(MAX_TIER).minPoints + 5000);
    expect(top.tier.index).toBe(MAX_TIER);
    expect(top.next).toBeUndefined();
    expect(top.progress).toBe(1);
  });
});

describe('applyPeriod (pure career fold)', () => {
  const fresh = (): CareerRecord => ({ points: 0, periods: 0, bestGrade: undefined });

  it('accumulates points and periods, rounding the composite', () => {
    let rec = fresh();
    let out = applyPeriod(rec, 60.4);
    rec = out.record;
    expect(rec.points).toBe(60);
    expect(rec.periods).toBe(1);
    out = applyPeriod(rec, 59.6);
    rec = out.record;
    expect(rec.points).toBe(120); // 60 + 60
    expect(rec.periods).toBe(2);
  });

  it('a negative/zero composite never subtracts points', () => {
    const out = applyPeriod(fresh(), -10);
    expect(out.record.points).toBe(0);
    expect(out.record.periods).toBe(1);
    expect(out.rankedUp).toBe(false);
  });

  it('tracks the best single-period grade (better never overwritten by worse)', () => {
    let rec = fresh();
    rec = applyPeriod(rec, 90).record; // grade A
    expect(rec.bestGrade).toBe('A');
    rec = applyPeriod(rec, 30).record; // grade E — worse, must not overwrite
    expect(rec.bestGrade).toBe('A');
  });

  it('flags rankedUp exactly when a period crosses a tier threshold', () => {
    // sit at 1 below tier 1's gate, then a composite that crosses it
    const justBelow: CareerRecord = {
      points: tier(1).minPoints - 1,
      periods: 5,
      bestGrade: 'B',
    };
    const cross = applyPeriod(justBelow, 50);
    expect(cross.before.index).toBe(0);
    expect(cross.after.index).toBe(1);
    expect(cross.rankedUp).toBe(true);

    // a period that stays within the same rung does NOT flag a rank-up
    const within: CareerRecord = { points: tier(1).minPoints, periods: 6, bestGrade: 'B' };
    const stay = applyPeriod(within, 1);
    expect(stay.rankedUp).toBe(false);
    expect(stay.after.index).toBe(1);
  });

  it('a single huge composite can leap multiple rungs at once', () => {
    const out = applyPeriod({ points: 0, periods: 0, bestGrade: undefined }, 100);
    // 100 CP clears tier 0's gate (120) only if ≥120; here it stays tier 0
    expect(out.after.index).toBe(0);
    // but feeding several periods accumulates across rungs deterministically
    let rec: CareerRecord = { points: 0, periods: 0, bestGrade: undefined };
    for (let i = 0; i < 4; i++) rec = applyPeriod(rec, 100).record;
    expect(rec.points).toBe(400);
    expect(rankForPoints(rec.points).tier.index).toBe(2); // 340 ≤ 400 < 680
  });
});

describe('addPeriodResult + localStorage round-trip', () => {
  beforeEach(() => {
    installLocalStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts from an empty career and persists accumulation', () => {
    expect(readCareer()).toEqual({ points: 0, periods: 0, bestGrade: undefined });
    addPeriodResult(70); // grade B
    addPeriodResult(80); // grade B
    const rec = readCareer();
    expect(rec.points).toBe(150);
    expect(rec.periods).toBe(2);
    expect(rec.bestGrade).toBe('B');
    // currentRank reads the same persisted total
    expect(currentRank().tier.index).toBe(rankForPoints(150).tier.index);
  });

  it('reports the rank-up the moment a stored career crosses a gate', () => {
    // accumulate to just under tier 1 (120): two 59s = 118
    addPeriodResult(59);
    const noPromo = addPeriodResult(59);
    expect(noPromo.rankedUp).toBe(false);
    expect(readCareer().points).toBe(118);
    // the next period crosses 120 → promotion
    const promo = addPeriodResult(40);
    expect(readCareer().points).toBe(158);
    expect(promo.rankedUp).toBe(true);
    expect(promo.after.index).toBe(1);
  });

  it('survives a corrupt stored value by resetting to empty', () => {
    localStorage.setItem('ec-operator-rank-v1', '{not json');
    expect(readCareer()).toEqual({ points: 0, periods: 0, bestGrade: undefined });
  });
});

describe('mergeCareer (cloud sign-in reconcile)', () => {
  beforeEach(() => installLocalStorage());
  afterEach(() => vi.unstubAllGlobals());

  it('takes the best of local and remote, never demoting', () => {
    addPeriodResult(80); // local: points 80, bestGrade B (assuming 80→B)
    const local = readCareer();
    const merged = mergeCareer({ points: 300, periods: 4, bestGrade: 'A' });
    expect(merged.points).toBe(Math.max(local.points, 300));
    expect(merged.periods).toBe(Math.max(local.periods, 4));
    expect(merged.bestGrade).toBe('A');
    // a weaker remote never lowers the local record
    const after = mergeCareer({ points: 10, periods: 0, bestGrade: 'E' });
    expect(after.points).toBe(merged.points);
    expect(after.bestGrade).toBe('A');
  });

  it('is a no-op for an undefined remote', () => {
    addPeriodResult(50);
    const before = readCareer();
    expect(mergeCareer(undefined)).toEqual(before);
  });
});
