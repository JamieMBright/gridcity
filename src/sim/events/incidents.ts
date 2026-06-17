// Named weather DISASTERS as game events. The multi-day regime machine
// (events/weather.ts) already cycles windy-wet / storm / calm-cold /
// heatwave fronts off the seeded RNG; this module turns the dramatic ones
// into headline incidents on the news feed AND wires their consequences to
// the systems that already exist:
//
//   • STORM (severe windstorm) — a named storm banner; the high wind of
//     the 'storm' regime already drives the fault engine's storm factor
//     (reliability/faults.ts), so lines fault in clusters. We just name it.
//   • FLOODING — heavy, sustained rain (wet regimes) swamps low-lying
//     substations and floods cable joint bays: a seeded chance of an
//     underground asset going out (a long dig-out repair, like a cable
//     fault) plus the flood banner.
//   • HEATWAVE — the demand spike (AC/cooling) and thermal derate are
//     wired in dispatch (events/weather.ts coolingFactor / thermalDerate);
//     here we announce the heatwave and the network-strain warning.
//
// Everything is deterministic: every roll comes off the seeded `rng`, and
// the once-per-regime announcement dedupes on the regime instance's
// regimeEndsMin (weather.incidentKeyMin), so saves and skips replay
// identically. Sober and tuned not to be punishing — a notable weather
// event every week or two, a real disaster occasionally.

import { lineBranchId, txBranchId, type PlacedAsset } from '../assets';
import { SUBS } from '../catalog';
import type { Rng } from '../rng';
import { isWet } from './weather';
import { pushEvent, type GameState } from '../state';
import { stormName } from '../reliability/stormprep';

/** Flood repair (dig out a swamped joint bay / pump a substation), game-
 *  minutes — on the order of an underground cable fault. */
const FLOOD_REPAIR_MIN = 900;

/** Per-asset flood hazard while a wet regime runs, events/asset-year,
 *  scaled by the rain proxy (cloud) below. Substations (basement
 *  switchrooms, low-lying compounds) flood far more readily than a buried
 *  cable joint bay. Tuned so a flood is an occasional set-piece — a real
 *  network of dozens of substations sees a few a winter, not a drowning. */
const FLOOD_BASE_PER_YR_SUB = 3.0;
const FLOOD_BASE_PER_YR_CABLE = 1.2;
const MIN_PER_YEAR = 525_600;

/** An underground cable / substation is the flood-exposed kit: cable joint
 *  bays and basement switchrooms swamp; overhead lines shrug rain off. */
function floodExposed(a: PlacedAsset): boolean {
  if (a.kind === 'line') return a.build === 'underground';
  if (a.kind === 'sub') return SUBS[a.sub].levels.length >= 2; // has a transformer to swamp
  return false;
}

/** The branch a flooded asset takes out (its cable, or its top tx pair). */
function floodBranch(a: PlacedAsset): number | undefined {
  if (a.kind === 'line') return lineBranchId(a.id);
  if (a.kind === 'sub') return txBranchId(a.id, 0);
  return undefined;
}

/** Fire the named disaster incidents and roll flood damage this tick.
 *  Called from solveTick inside the live (dtMin > 0) London branch, after
 *  stepWeather has moved the regime — `rng` is the same seeded stream as
 *  the rest of the tick. Returns nothing; mutates outages/jobs/events.
 *  `onFaultBranch` lets tick.ts register the flood outage through its own
 *  job bookkeeping (so the orange vans turn out exactly as for any fault). */
export function stepIncidents(
  state: GameState,
  rng: Rng,
  dtMin: number,
  onFaultBranch: (
    branchId: number,
    assetId: number,
    x: number,
    y: number,
    repairMin: number,
    label: string,
    /** Whether this is a MAJOR incident (flooded SUBSTATION) vs a routine one
     *  (a single swamped cable bay) — halts a +30d skip; see
     *  protocol.skipHaltEvent. */
    major: boolean,
  ) => void,
): void {
  const w = state.weather;
  const regime = w.regime ?? 'mild';
  const key = w.regimeEndsMin ?? state.simTimeMin;

  // ---- named storm clearance -------------------------------------------
  // The storm regime stamps w.activeStormName on arrival (events/weather.ts);
  // once the front moves on, sign that same storm off by name and stand the
  // marker down so the next storm starts clean.
  if (regime !== 'storm' && w.activeStormName !== undefined) {
    pushEvent(
      state,
      'info',
      `Storm ${w.activeStormName} clears the region — crews stand down, count the damage`,
    );
    delete w.activeStormName;
    delete w.activeStormStartMin;
  }

  // ---- once-per-regime named announcement -------------------------------
  if (w.incidentKeyMin !== key) {
    if (regime === 'storm') {
      // read the name stamped on arrival, not a fresh recompute, so the
      // banner matches the forecast and the fault-event labels exactly
      const name = w.activeStormName ?? stormName(state.simTimeMin);
      pushEvent(
        state,
        'bad',
        `Storm ${name} hits the region — severe gales, overhead lines at high risk`,
        undefined,
        undefined,
        true, // a named storm landfall is THE major incident a +30d skip stops for
      );
      w.incidentKeyMin = key;
    } else if (regime === 'heatwave') {
      pushEvent(
        state,
        'warn',
        'Heatwave warning — cooling demand surges and transformers derate in the heat',
      );
      w.incidentKeyMin = key;
    } else if (regime === 'windy-wet') {
      pushEvent(
        state,
        'warn',
        'Heavy rain sets in across the region — flood risk to cable bays and substations',
      );
      w.incidentKeyMin = key;
    }
  }

  // ---- flooding: swamp underground kit during wet regimes ---------------
  if (!isWet(regime)) return;
  // rain intensity proxy: the regime's cloud field (storm 0.95, wet 0.85)
  const rain = Math.max(0, (w.cloud - 0.6) / 0.4); // 0 below 0.6 cloud, 1 at full
  if (rain <= 0) return;
  for (const a of state.assets.values()) {
    if (!floodExposed(a)) continue;
    const branchId = floodBranch(a);
    if (branchId === undefined) continue;
    if (state.outages.has(branchId)) continue; // already out
    const base = a.kind === 'sub' ? FLOOD_BASE_PER_YR_SUB : FLOOD_BASE_PER_YR_CABLE;
    if (!rng.chance((base * rain * dtMin) / MIN_PER_YEAR)) continue;
    let label: string;
    let x: number;
    let y: number;
    if (a.kind === 'line') {
      const endA = state.assets.get(a.a);
      const endB = state.assets.get(a.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
      x = Math.round((endA.x + endB.x) / 2);
      y = Math.round((endA.y + endB.y) / 2);
      label = `flooding — ${a.level} kV cable bay swamped`;
    } else if (a.kind === 'sub') {
      x = a.x;
      y = a.y;
      label = `flooding — ${SUBS[a.sub].name.split(' (')[0]?.toLowerCase()} substation under water`;
    } else {
      continue;
    }
    // a flooded SUBSTATION is a major incident (lost a site); a single
    // swamped cable joint bay is routine — only the former halts a +30d skip
    onFaultBranch(branchId, a.id, x, y, FLOOD_REPAIR_MIN, label, a.kind === 'sub');
  }
}
