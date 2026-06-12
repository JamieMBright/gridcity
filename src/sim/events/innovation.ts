// The innovation pipeline. A slice of every bill feeds the fund; academics,
// startups and consultancies pitch projects against it. Funded projects
// take time, sometimes fail, and pay back as permanent capabilities —
// drone tree surveys, a flexibility market, dynamic line ratings, smart
// EV charging.

import type { Rng } from '../rng';

export type TechId = 'droneVeg' | 'flexMarket' | 'dlr' | 'smartEv' | 'touTariff';

export interface TechState {
  droneVeg: boolean;
  flexMarket: boolean;
  dlr: boolean;
  smartEv: boolean;
  /** Time-of-use tariff pilot (ROADMAP #24). Additive: pre-ToU saves
   *  hydrate without the key (state.ts spreads tech), which reads
   *  falsy everywhere it's consulted — old saves stay on flat tariffs. */
  touTariff: boolean;
}

export function newTech(): TechState {
  return { droneVeg: false, flexMarket: false, dlr: false, smartEv: false, touTariff: false };
}

export interface Pitch {
  id: number;
  tech: TechId;
  title: string;
  blurb: string;
  costK: number;
  durationDays: number;
  successPct: number;
  decideByMin: number;
  completesAtMin?: number | undefined;
  status: 'open' | 'funded' | 'succeeded' | 'failed' | 'expired';
}

export const PITCH_DEFS: Record<
  TechId,
  { title: string; blurb: string; costK: number; durationDays: number; successPct: number }
> = {
  droneVeg: {
    title: 'Drone vegetation surveys',
    blurb: 'A university spin-out flies LiDAR drones along your overhead lines — tree cutting gets targeted and cheap.',
    costK: 800,
    durationDays: 120,
    successPct: 80,
  },
  flexMarket: {
    title: 'Local flexibility market',
    blurb: 'A platform startup pays homes and businesses to turn down at peaks — defer reinforcement instead of digging.',
    costK: 1500,
    durationDays: 180,
    successPct: 75,
  },
  dlr: {
    title: 'Dynamic line ratings',
    blurb: 'Consultants instrument your lines: in cool wind they safely carry ~15% more than the nameplate.',
    costK: 1200,
    durationDays: 150,
    successPct: 70,
  },
  smartEv: {
    title: 'Smart EV charging',
    blurb: 'An aggregator shifts EV charging into the night, flattening the evening peak across every council.',
    costK: 1000,
    durationDays: 150,
    successPct: 75,
  },
  touTariff: {
    title: 'Time-of-use tariff pilot',
    blurb: 'Suppliers trial half-hourly pricing across the licence area — the evening peak shaves ~8% into the midday shoulder, same energy, kinder shape. Expect grumbling at launch.',
    costK: 900,
    durationDays: 160,
    successPct: 75,
  },
};

/** Effects (applied where the systems live):
 *  droneVeg — vegetation programme cost ×0.4, growth ×0.5
 *  flexMarket — unlocks demand-side flexibility dispatch
 *  dlr — branch ratings ×1.15
 *  smartEv — EV charging peak flattened (see evProfile)
 *  touTariff — domestic peak shaved ~8%, energy conserved
 *              (map/demand.ts touDomesticRatio), launch dip below */
export const DRONE_VEG_COST_MUL = 0.4;
export const DRONE_VEG_GROWTH_MUL = 0.5;
export const DLR_RATING_MUL = 1.15;

/** ToU launch grumble (#24): satisfaction target dips this much the day
 *  the pilot lands, fading linearly to nothing over TOU_DIP_DAYS — the
 *  existing stepSatisfaction tracking turns that into the classic
 *  dip-then-recover curve (anger fast, trust slow). Derived purely from
 *  the succeeded pitch's completesAtMin: no new state, saves replay it. */
export const TOU_DIP_SAT = 6;
export const TOU_DIP_DAYS = 90;

export function touSatisfactionOffset(
  simTimeMin: number,
  pitches: ReadonlyArray<Pick<Pitch, 'tech' | 'status' | 'completesAtMin'>>,
): number {
  const p = pitches.find((q) => q.tech === 'touTariff' && q.status === 'succeeded');
  if (!p || p.completesAtMin === undefined) return 0;
  const elapsed = simTimeMin - p.completesAtMin;
  const windowMin = TOU_DIP_DAYS * 1440;
  if (elapsed < 0 || elapsed >= windowMin) return 0;
  return -TOU_DIP_SAT * (1 - elapsed / windowMin);
}

const PITCH_MEAN_DAYS = 60;
const PITCH_DECIDE_DAYS = 45;

export function maybeSpawnPitch(
  rng: Rng,
  dtMin: number,
  simTimeMin: number,
  tech: TechState,
  pitches: Pitch[],
  nextId: number,
): Pitch | undefined {
  if (!rng.chance(dtMin / (PITCH_MEAN_DAYS * 1440))) return undefined;
  const candidates = (Object.keys(PITCH_DEFS) as TechId[]).filter(
    (t) => !tech[t] && !pitches.some((p) => p.tech === t && (p.status === 'open' || p.status === 'funded')),
  );
  if (candidates.length === 0) return undefined;
  const techId = candidates[rng.int(candidates.length)];
  if (!techId) return undefined;
  const def = PITCH_DEFS[techId];
  return {
    id: nextId,
    tech: techId,
    title: def.title,
    blurb: def.blurb,
    costK: def.costK,
    durationDays: def.durationDays,
    successPct: def.successPct,
    decideByMin: simTimeMin + PITCH_DECIDE_DAYS * 1440,
    status: 'open',
  };
}
