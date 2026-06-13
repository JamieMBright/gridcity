// Per-lesson star ratings (0–3) for the tutorial curriculum. The campaign
// IS the tutorial, and each completed lesson earns a star rating reflecting
// how TIDILY it was finished — a clean, lean network earns 3; a sloppy,
// overloaded, gold-plated one earns 1. Persisted in localStorage so a best
// score is never downgraded by a scrappier replay.
//
// Mirrors the completedMissions/recordMissionComplete patterns in
// workerBridge.ts: a single JSON record under one key, every access wrapped
// in try/catch so private-mode browsers play on without persistence.

const LESSON_STARS_KEY = 'ec-lesson-stars-v1';

/** Read the whole { [missionId]: stars } record (empty on any failure). */
export function allLessonStars(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LESSON_STARS_KEY);
    const obj: unknown = raw ? JSON.parse(raw) : {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === 'number' && v >= 0 && v <= 3) out[k] = Math.round(v);
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

/** Stars earned for a lesson, 0 if never completed. */
export function lessonStars(id: string): 0 | 1 | 2 | 3 {
  const v = allLessonStars()[id] ?? 0;
  return (v < 0 ? 0 : v > 3 ? 3 : v) as 0 | 1 | 2 | 3;
}

/** Persist a lesson result, keeping the MAX of the past best and this run —
 *  a replay can raise your rating but never lowers a hard-won three-star. */
export function recordLessonResult(id: string, stars: 0 | 1 | 2 | 3): void {
  try {
    const rec = allLessonStars();
    const best = rec[id] ?? 0;
    if (stars <= best) return;
    rec[id] = stars;
    localStorage.setItem(LESSON_STARS_KEY, JSON.stringify(rec));
  } catch {
    // private mode: play on without star persistence
  }
}

/** Signals read off the SimSnapshot at the moment a lesson is completed.
 *  Kept tiny + deterministic so the grade is pure and unit-testable. */
export interface LessonMetrics {
  /** bill.perCustomerDuosYr — annual network charge per household, £/yr. */
  perCustomerDuosYr: number;
  /** Count of player-placed assets at completion (lean network = few). */
  assetCount: number;
  /** True if any branch was running over its rating at completion. */
  hadOverload: boolean;
}

// Grading thresholds (reasonable, tunable guesses). A "comfortable" network
// charge is at or under £250/home/yr (mission 5 explicitly targets £200, so
// a tidy completion clears this easily); a "lean" network is a dozen assets
// or fewer for these one-village lessons.
const TIDY_DUOS_YR = 250;
const LEAN_ASSET_COUNT = 12;

/** Grade a COMPLETED lesson, deterministically, into 0–3 stars.
 *
 *  - Completing it at all is worth a base 1 star.
 *  - +1 for a clean network: nothing was overloaded at the finish.
 *  - +1 for efficiency: either the network charge per home is comfortable
 *    (≤ £250/yr) OR the network is lean (≤ 12 assets) — a tidy build that
 *    keeps costs honest is rewarded even on lessons without a bill scoreboard.
 *
 *  So a clean, lean completion → 3; an overloaded but cheap one → 2; a
 *  sloppy, overloaded, gold-plated one → 1. */
export function computeStars(m: LessonMetrics): 0 | 1 | 2 | 3 {
  let stars = 1; // reached here ⇒ the lesson was completed
  if (!m.hadOverload) stars += 1;
  if (m.perCustomerDuosYr <= TIDY_DUOS_YR || m.assetCount <= LEAN_ASSET_COUNT) stars += 1;
  return Math.min(3, stars) as 0 | 1 | 2 | 3;
}
