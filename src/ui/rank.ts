// Operator RANK ladder — a deterministic, local-first career progression
// keyed off RIIO report-card outcomes. Each closed regulatory period adds
// its composite (0–100) to a running career-points total; crossing a tier
// threshold is a promotion. This is the meta-layer the multi-city design
// (docs/multi-city-and-rank.md §4) calls for, landed LOCAL-ONLY for now —
// cloud sync of the career record is a deliberate follow-up.
//
// Mirrors the lessonProgress.ts / completedMissions patterns: one JSON
// record under one localStorage key, every access wrapped in try/catch so
// private-mode browsers play (and progress in-memory) without persistence.
//
// The ladder titles are real GB / industry power-system job roles, drawn
// from the design doc's 15-tier list, condensed to 7 evocative rungs so a
// promotion feels earned but is reachable in a session or two of strong play.

import { gradeOf } from '../sim/regulation/riio';

/** One rung of the career ladder. `minPoints` is the cumulative career-points
 *  (CP) gate; the player holds the highest tier whose gate they have cleared. */
export interface RankTier {
  /** 0-based index into TIERS. */
  index: number;
  title: string;
  /** One-line flavour — who you are at this rung. */
  blurb: string;
  /** Cumulative CP needed to reach this tier (tier 0 is always 0). */
  minPoints: number;
}

// CP per period = its report-card composite (0..100), so ~7–8 strong (B+)
// periods clear a mid-ladder rung. Thresholds rise super-linearly so the
// top rungs are a genuine long-haul career, not a couple of good reports.
export const TIERS: readonly RankTier[] = [
  { index: 0, title: 'Graduate Intern', blurb: 'Day one. Read the SLD, make the tea.', minPoints: 0 },
  { index: 1, title: 'Assistant Engineer', blurb: 'First real connections on the 11 kV.', minPoints: 120 },
  { index: 2, title: 'Network Engineer', blurb: 'A primary substation is yours to run.', minPoints: 340 },
  { index: 3, title: 'Senior Network Engineer', blurb: 'Whole feeders of iron under your name.', minPoints: 680 },
  { index: 4, title: 'Principal Engineer', blurb: 'You own the engineering standard.', minPoints: 1180 },
  { index: 5, title: 'Head of Network Operations', blurb: 'The lights across the licence area are yours.', minPoints: 1880 },
  { index: 6, title: 'Chief Network Officer', blurb: 'Board table. The grid strategy is yours.', minPoints: 2900 },
] as const;

/** The top rung's index — promotion stops here. */
export const MAX_TIER = TIERS.length - 1;

const RANK_KEY = 'ec-operator-rank-v1';

/** The persisted career record. Append-only in spirit: points only rise,
 *  bestGrade only improves, periods only accumulate. */
export interface CareerRecord {
  /** Cumulative career points (Σ period composites). */
  points: number;
  /** How many regulatory periods have been graded into this record. */
  periods: number;
  /** Best single-period grade ever earned (A best … E worst). */
  bestGrade: 'A' | 'B' | 'C' | 'D' | 'E' | undefined;
}

function emptyRecord(): CareerRecord {
  return { points: 0, periods: 0, bestGrade: undefined };
}

/** Lower string = better grade, for the best-grade max. */
const GRADE_ORDER: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

/** The tier a given cumulative-CP total maps to, plus where the NEXT rung
 *  sits and how far along this rung the player is (0..1). Pure + total. */
export interface RankProgress {
  tier: RankTier;
  /** The next rung, or undefined at the top of the ladder. */
  next: RankTier | undefined;
  /** CP into the current rung (points − tier.minPoints). */
  pointsIntoTier: number;
  /** CP the current rung spans (next.minPoints − tier.minPoints), or 0 at top. */
  tierSpan: number;
  /** Progress to the next rung, 0..1 (1 at the top of the ladder). */
  progress: number;
}

/** Map a cumulative-CP total to its rank + progress to the next rung.
 *  Monotonic: more points never demotes you. */
export function rankForPoints(points: number): RankProgress {
  const p = Math.max(0, points);
  let tier: RankTier = TIERS[0]!;
  for (const t of TIERS) {
    if (p >= t.minPoints) tier = t;
    else break;
  }
  const next: RankTier | undefined = tier.index < MAX_TIER ? TIERS[tier.index + 1] : undefined;
  const pointsIntoTier = p - tier.minPoints;
  const tierSpan = next ? next.minPoints - tier.minPoints : 0;
  const progress = next ? Math.max(0, Math.min(1, pointsIntoTier / tierSpan)) : 1;
  return { tier, next, pointsIntoTier, tierSpan, progress };
}

/** Read the whole career record (empty on any failure / private mode). */
export function readCareer(): CareerRecord {
  try {
    const raw = localStorage.getItem(RANK_KEY);
    const obj: unknown = raw ? JSON.parse(raw) : undefined;
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const o = obj as Record<string, unknown>;
      const points = typeof o.points === 'number' && o.points >= 0 ? o.points : 0;
      const periods = typeof o.periods === 'number' && o.periods >= 0 ? Math.floor(o.periods) : 0;
      const bg = o.bestGrade;
      const bestGrade =
        bg === 'A' || bg === 'B' || bg === 'C' || bg === 'D' || bg === 'E' ? bg : undefined;
      return { points, periods, bestGrade };
    }
  } catch {
    // private mode / SSR — start from a clean slate, in-memory only
  }
  return emptyRecord();
}

function writeCareer(rec: CareerRecord): void {
  try {
    localStorage.setItem(RANK_KEY, JSON.stringify(rec));
  } catch {
    // private mode: play on without rank persistence
  }
}

/** Best-of merge a (cloud) record into local — points/periods take the MAX,
 *  bestGrade the better letter. Append-only spirit: a merge never demotes.
 *  Returns the merged record (also persisted). Used on sign-in to reconcile
 *  a device's local career with the cloud copy. */
const GRADE_RANK: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
export function mergeCareer(remote: Partial<CareerRecord> | undefined): CareerRecord {
  const local = readCareer();
  if (!remote) return local;
  const rPoints = typeof remote.points === 'number' && remote.points >= 0 ? remote.points : 0;
  const rPeriods = typeof remote.periods === 'number' && remote.periods >= 0 ? Math.floor(remote.periods) : 0;
  const rg = remote.bestGrade;
  const bestOf = (a: CareerRecord['bestGrade'], b: CareerRecord['bestGrade']): CareerRecord['bestGrade'] => {
    if (!a) return b;
    if (!b) return a;
    return (GRADE_RANK[a] ?? 0) >= (GRADE_RANK[b] ?? 0) ? a : b;
  };
  const merged: CareerRecord = {
    points: Math.max(local.points, rPoints),
    periods: Math.max(local.periods, rPeriods),
    bestGrade: bestOf(local.bestGrade, rg === 'A' || rg === 'B' || rg === 'C' || rg === 'D' || rg === 'E' ? rg : undefined),
  };
  writeCareer(merged);
  return merged;
}

/** The current rank + progress, derived from the persisted career. */
export function currentRank(): RankProgress {
  return rankForPoints(readCareer().points);
}

/** Outcome of folding a freshly-closed report card into the career. */
export interface PeriodOutcome {
  /** The career record AFTER this period. */
  record: CareerRecord;
  /** Rank before / after — `rankedUp` is the headline the UI celebrates. */
  before: RankTier;
  after: RankTier;
  rankedUp: boolean;
}

/** Pure core (no storage): fold one period composite into a record.
 *  Exposed for unit tests; addPeriodResult wraps it with persistence. */
export function applyPeriod(prev: CareerRecord, composite: number): PeriodOutcome {
  const before = rankForPoints(prev.points).tier;
  const gained = Math.max(0, Math.round(composite));
  const grade = gradeOf(gained);
  const bestGrade =
    prev.bestGrade === undefined || GRADE_ORDER[grade] < GRADE_ORDER[prev.bestGrade]
      ? grade
      : prev.bestGrade;
  const record: CareerRecord = {
    points: prev.points + gained,
    periods: prev.periods + 1,
    bestGrade,
  };
  const after = rankForPoints(record.points).tier;
  return { before, after, record, rankedUp: after.index > before.index };
}

/** Fold a freshly-closed period's composite into the persisted career and
 *  return the outcome. If the tier increased, `rankedUp` is true — the UI
 *  celebrates and (for guests) nudges sign-in. Safe to call once per period
 *  close; the caller de-dupes on the report index (see workerBridge). */
export function addPeriodResult(composite: number): PeriodOutcome {
  const outcome = applyPeriod(readCareer(), composite);
  writeCareer(outcome.record);
  return outcome;
}
