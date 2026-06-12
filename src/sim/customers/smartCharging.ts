// Per-council smart charging (ROADMAP #18): the EV evening spike is the
// canonical DSO problem and smart charging the canonical fix. The player
// funds a programme council by council — an aggregator shifts that
// council's EV charging into the night (the existing evProfile(smart)
// shape), the £/yr cost (scaled by the council's EV count) rides the
// bill, and residents like being paid to plug in. Councils that don't
// trust you (satisfaction < 50) refuse the programme outright.
//
// v1 catchment approximation (documented per the roadmap): dispatch
// applies ONE EV profile factor per substation, so each catchment takes
// the shape of its MAJORITY council (by customers). The plumbing stays
// inside the files this lane owns: computeSubLoads' output is re-shaped
// here (shapeSubLoads, called from tick.runPowerFlow) by the ratio
// smart/dumb of evProfile, so dispatch — which multiplies by the global
// (dumb unless tech.smartEv) factor — lands on exactly the smart shape
// for funded catchments. Once the smartEv innovation delivers, every
// council is smart and the per-council programme has nothing to add.
//
// The same shaping pass applies the licence-wide time-of-use tariff
// (ROADMAP #24, see map/demand.ts touDomesticRatio) to domestic load.

import { evProfile } from '../events/weather';
import { NO_COUNCIL, type CityMap } from '../map/types';
import { touDomesticRatio } from '../map/demand';
import { pushEvent, type GameState } from '../state';
import type { CommandResult } from '../commands';
import type { CouncilState } from './adoption';
import type { SubLoad } from '../service';
import type { TechState } from '../events/innovation';

/** Programme price, £k/yr per participating EV (≈£20/EV/yr: the
 *  aggregator platform, half-hourly metering and the plug-in rewards). */
export const SMART_CHARGE_K_YR_PER_EV = 0.02;
/** Councils below this satisfaction refuse the programme. */
export const SMART_CHARGE_MIN_SAT = 50;
/** Satisfaction target bonus while the programme runs (cheaper night
 *  charging is popular) — applied in tick.stepCouncils. */
export const SMART_CHARGE_SAT_BONUS = 3;

/** EVs a council has right now: its customers × EV adoption fraction. */
export function councilEvCount(map: CityMap, councilId: number, evFrac: number): number {
  let customers = 0;
  const n = map.width * map.height;
  for (let i = 0; i < n; i++) {
    if ((map.council[i] ?? NO_COUNCIL) === councilId) customers += map.customers[i] ?? 0;
  }
  return customers * evFrac;
}

/** Programme cost, £k/yr, for a council with this many EVs. Shared by
 *  the command (the charge) and the UI (the quote on the button). */
export function smartChargingCostK(evCount: number): number {
  return evCount * SMART_CHARGE_K_YR_PER_EV;
}

/** The 'setSmartCharging' command body (commands.ts delegates here). */
export function applySetSmartCharging(
  state: GameState,
  map: CityMap,
  cmd: { councilId: number; on: boolean },
): CommandResult {
  const profile = map.councils.find((c) => c.id === cmd.councilId);
  if (!profile) return { ok: false, error: 'no such council' };
  const cs: CouncilState | undefined = state.councils.get(cmd.councilId);
  if (cmd.on) {
    // trust gate: a council that keeps sitting in the dark won't hand
    // its residents' car chargers to the operator who darkened them
    if (!cs || cs.satisfaction < SMART_CHARGE_MIN_SAT) {
      return {
        ok: false,
        error: `${profile.name} refuses — satisfaction below ${SMART_CHARGE_MIN_SAT}, win their trust first`,
      };
    }
    if (cs.smartCharging === true) return { ok: true };
    cs.smartCharging = true;
    const costK = Math.round(smartChargingCostK(councilEvCount(map, cmd.councilId, cs.ev)));
    pushEvent(
      state,
      'info',
      `${profile.name} signs up for smart charging — EVs shift into the night (£${costK}k/yr)`,
    );
    return { ok: true };
  }
  if (!cs || cs.smartCharging !== true) return { ok: true };
  cs.smartCharging = false;
  pushEvent(state, 'info', `${profile.name} smart-charging programme wound down`);
  return { ok: true };
}

/** smart/dumb EV profile ratio at this moment: multiplying a catchment's
 *  evMW by it makes dispatch's global (dumb) factor land on the smart
 *  shape — flatter at the evening peak, fuller overnight. */
export function smartEvRatio(simTimeMin: number): number {
  return evProfile(simTimeMin, true) / evProfile(simTimeMin, false);
}

/** Re-shape computeSubLoads' output for the demand-side programmes:
 *  smart charging per funded majority council (#18) and the licence-wide
 *  ToU tariff (#24). Mutates `loads` in place; called from
 *  tick.runPowerFlow between computeSubLoads and runDispatch. No-op (and
 *  near-free) while nothing is funded/unlocked. */
export function shapeSubLoads(
  loads: Map<number, SubLoad>,
  tilesOfSub: Map<number, number[]>,
  map: CityMap,
  councils: Map<number, CouncilState>,
  tech: TechState,
  simTimeMin: number,
): void {
  let anyFunded = false;
  for (const cs of councils.values()) {
    if (cs.smartCharging === true) {
      anyFunded = true;
      break;
    }
  }
  const tou = tech.touTariff === true;
  if (!anyFunded && !tou) return;

  const evRatio = anyFunded && !tech.smartEv ? smartEvRatio(simTimeMin) : 1;
  const domRatio = tou ? touDomesticRatio(simTimeMin) : 1;
  for (const [subId, load] of loads) {
    if (domRatio !== 1) load.domMW *= domRatio;
    if (evRatio === 1 || load.evMW <= 0) continue;
    // majority council of the catchment, by customers (v1 approximation)
    const byCouncil = new Map<number, number>();
    for (const i of tilesOfSub.get(subId) ?? []) {
      const cid = map.council[i] ?? NO_COUNCIL;
      if (cid === NO_COUNCIL) continue;
      byCouncil.set(cid, (byCouncil.get(cid) ?? 0) + (map.customers[i] ?? 0));
    }
    let majority = NO_COUNCIL;
    let best = 0;
    for (const [cid, cust] of byCouncil) {
      if (cust > best) {
        best = cust;
        majority = cid;
      }
    }
    if (majority === NO_COUNCIL) continue;
    if (councils.get(majority)?.smartCharging === true) load.evMW *= evRatio;
  }
}
