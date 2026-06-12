// Demand-growth forecast: where EV/heat-pump adoption will bite next.
// Projects each council's adoption forward (optimistically assuming the
// player keeps the lights on — full energization and reliability, which
// is exactly the planning-worst-case a DNO designs for), recomputes each
// catchment's planning peak at the horizon, and reports years until the
// fitted transformer (including its remaining auto-reinforcement steps)
// runs out of road.

import { subMva, type PlacedAsset } from './assets';
import { SUBS } from './catalog';
import { newCouncilState, stepAdoption, type CouncilState } from './customers/adoption';
import { assignServiceAreas, computeSubLoads } from './service';
import type { GameState, SimContext } from './state';

export interface CatchmentForecast {
  subId: number;
  /** Planning peak now and at the horizon, MW. */
  peakNowMW: number;
  peakHorizonMW: number;
  /** Largest transformer this sub can auto-step to, MVA. */
  maxMva: number;
  /** Years until the projected peak exceeds maxMva (capped; 99 = never
   *  inside the horizon). */
  yearsToOverload: number;
}

const HORIZON_YEARS = 5;
const STEP_MIN = 30 * 1440; // monthly projection steps

/** Project a council's adoption forward `years` at design conditions. */
export function projectCouncil(
  cs: CouncilState,
  profile: { affluence: number; ambition: number },
  years: number,
): CouncilState {
  const out: CouncilState = { ...cs };
  const steps = Math.round((years * 365 * 1440) / STEP_MIN);
  for (let k = 0; k < steps; k++) {
    stepAdoption(out, profile as never, 1, 1, STEP_MIN);
  }
  return out;
}

export function forecastCatchments(state: GameState, ctx: SimContext): CatchmentForecast[] {
  const { map } = ctx;
  const service = assignServiceAreas(map, state.assets.values(), state.loadSites, state.councils);

  // projected council states at a ladder of horizons (yearly resolution)
  const horizons: Array<Map<number, CouncilState>> = [];
  for (let y = 0; y <= HORIZON_YEARS; y++) {
    const m = new Map<number, CouncilState>();
    for (const profile of map.councils) {
      const cur = state.councils.get(profile.id) ?? newCouncilState();
      m.set(profile.id, y === 0 ? cur : projectCouncil(cur, profile, y));
    }
    horizons.push(m);
  }

  const out: CatchmentForecast[] = [];
  const subs: PlacedAsset[] = [...state.assets.values()].filter(
    (a) => a.kind === 'sub' && SUBS[a.kind === 'sub' ? a.sub : 'dist'].serviceRadius !== undefined,
  );
  // peak per horizon year via the real load model
  const peaksByYear = horizons.map((councils) =>
    computeSubLoads(map, service.tilesOfSub, councils, state.loadSites),
  );
  for (const a of subs) {
    if (a.kind !== 'sub') continue;
    const spec = SUBS[a.sub];
    const steps = spec.mvaSteps ?? [];
    const maxMva = steps.length > 0 ? (steps[steps.length - 1] ?? subMva(a)) : subMva(a);
    const peakAt = (y: number): number => {
      const l = peaksByYear[y]?.get(a.id);
      if (!l) return 0;
      // planning peak: everything that can coincide on a cold evening
      return l.domMW + l.procMW + l.evMW + l.hpMW;
    };
    const now = peakAt(0);
    const horizon = peakAt(HORIZON_YEARS);
    let years = 99;
    for (let y = 0; y <= HORIZON_YEARS; y++) {
      if (peakAt(y) > maxMva) {
        years = y;
        break;
      }
    }
    out.push({
      subId: a.id,
      peakNowMW: Math.round(now * 10) / 10,
      peakHorizonMW: Math.round(horizon * 10) / 10,
      maxMva,
      yearsToOverload: years,
    });
  }
  return out;
}

export { HORIZON_YEARS };
