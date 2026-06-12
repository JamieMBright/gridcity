// Councils electrify at their own pace. Affluence sets what residents can
// afford, ambition sets how hard the council pushes — and none of it
// happens until an area actually has reliable power. A "finished"
// suburb that quietly fills up with EVs and heat pumps is the core
// late-game reinforcement pressure.

import type { CouncilProfile } from '../map/types';

export interface CouncilAdoption {
  /** Fraction of households with an EV, 0..1. */
  ev: number;
  /** Fraction with a heat pump, 0..1. */
  hp: number;
  /** Fraction with rooftop PV, 0..1. */
  pv: number;
}

export interface CouncilState extends CouncilAdoption {
  /** Customer satisfaction 0..100 (0 until energized). */
  satisfaction: number;
  /** Funded smart-charging programme (ROADMAP #18): the council's EV
   *  evening profile runs the smart (flattened) shape and the programme
   *  cost rides the bill. Additive + optional: old saves hydrate clean
   *  (councils serialize by object spread). customers/smartCharging.ts. */
  smartCharging?: boolean;
}

export function newCouncilState(): CouncilState {
  return { ev: 0, hp: 0, pv: 0, satisfaction: 0 };
}

const MIN_PER_YEAR = 525_600;

/** Diversified per-household additions at full adoption, kW. */
export const EV_KW = 1.1;
export const HP_KW = 1.4;
export const PV_EXPORT_KW = 1.6;

/** Adoption caps — not everyone ever switches. */
const CAPS = { ev: 0.85, hp: 0.7, pv: 0.5 } as const;

/** Advance one council's adoption. `energizedFrac` is how much of the
 *  council's demand is actually on supply right now (gates everything),
 *  `reliability` 0..1 dampens uptake where the lights keep going out. */
export function stepAdoption(
  s: CouncilState,
  profile: CouncilProfile,
  energizedFrac: number,
  reliability: number,
  dtMin: number,
): void {
  // an ambitious, affluent council fully electrifies in ~6 game-years;
  // a poor, indifferent one takes ~40
  const pace =
    (0.25 + 0.75 * profile.affluence) * (0.2 + 0.8 * profile.ambition) * energizedFrac * reliability;
  const dt = dtMin / MIN_PER_YEAR;
  const grow = (cur: number, cap: number, mul: number): number =>
    Math.min(cap, cur + cap * pace * mul * dt * (1.1 - cur / cap));
  s.ev = grow(s.ev, CAPS.ev, 1 / 6);
  s.hp = grow(s.hp, CAPS.hp, 1 / 8);
  s.pv = grow(s.pv, CAPS.pv * (0.4 + 0.6 * profile.affluence), 1 / 7);
}

/** Adoption milestones for the news feed: returns crossed thresholds. */
export function adoptionMilestones(
  before: CouncilAdoption,
  after: CouncilAdoption,
): Array<{ tech: 'ev' | 'hp' | 'pv'; pct: number }> {
  const out: Array<{ tech: 'ev' | 'hp' | 'pv'; pct: number }> = [];
  for (const tech of ['ev', 'hp', 'pv'] as const) {
    for (const threshold of [0.1, 0.25, 0.5]) {
      if (before[tech] < threshold && after[tech] >= threshold) {
        out.push({ tech, pct: threshold * 100 });
      }
    }
  }
  return out;
}

/** Satisfaction drifts toward a target set by supply quality; outages
 *  leave a mark that takes game-weeks to forgive. */
export function stepSatisfaction(
  s: CouncilState,
  target: number,
  dtMin: number,
): void {
  const tau = target < s.satisfaction ? 1440 : 14_400; // anger fast, trust slow
  const alpha = dtMin / (dtMin + tau);
  s.satisfaction += (target - s.satisfaction) * alpha;
}
