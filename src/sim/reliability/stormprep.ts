// Storm preparation (ROADMAP #9, sim side): a deterministic named-storm
// forecast read off the weather regime pre-roll, plus the SYSTEM-PREPARE
// levers a GB DNO actually pulls — extra crew SHIFTS, line-driving SCOUTS,
// and WIDER CALL HANDLING (office staff drafted to the phones) — and their
// bill integration. UI lands separately; the single player entry point is
// the 'stormPrep' command in commands.ts, which delegates to applyStormPrep
// here (commands.ts stays thin by design — another engineer owns it).
//
// The call-handling model (owner domain spec, a real GB DNO): in a storm
// the interrupted customers all phone in at once. The call centre answers
// at a baseline throughput; understaff it during the surge and answer
// times blow out and CSAT goes NEGATIVE. The wider-call-handling lever
// drafts regular office staff onto the phones so a real person answers
// inside the GSOP-style < 5 s target. All maths is pure, monotonic and
// deterministic (no wall clock / Math.random) — see callAnswerSeconds /
// callCsatDelta below, unit-tested in tests/callHandling.test.ts.
//
// Bill integration (the documented choice): prep actions are one-off
// spends, charged into a rolling state.stormPrepYrK rate (£k/yr) that
// decays with a one-game-year tau, so the decaying rate integrates back
// to ≈ the £k actually spent. The rate rides computeBill's penaltyYrK
// input — the constraint-compensation/damages bill line — via the single
// permitted call-site change in tick.ts; bill.ts itself is untouched.

import { VAN_OPEX_K_YR } from '../catalog';
import { seasonFactor } from '../events/weather';
import { pushEvent, type GameState } from '../state';
import type { CommandResult } from '../commands';

// ----------------------------------------------------------------------
// Named-storm forecast.

export interface StormForecast {
  /** "Storm Aoife" — deterministic for a given window. */
  name: string;
  /** Game-minutes until the storm window opens. */
  etaMin: number;
  /** Forecast wind intensity 0..1: the windy-wet regime's envelope mean
   *  at arrival (the fault engine's storm band starts at ~0.7, severe
   *  above 0.85 — see reliability/faults.ts stormFactor). */
  severity: number;
}

/** A windy-wet front only rates a NAME when it lands in the cold half of
 *  the year (seasonFactor at arrival ≥ this) — summer blows are just
 *  weather; Oct–Mar Atlantic lows are the set-piece. */
export const STORM_WINTERNESS = 0.5;

/** Met Office style season list (alphabetical, no Q/U/X/Y/Z). */
const STORM_NAMES = [
  'Aoife', 'Bram', 'Cara', 'Dafydd', 'Elin', 'Floris', 'Gerben', 'Hannah',
  'Idris', 'Janet', 'Kayleigh', 'Lewis', 'Mavis', 'Nico', 'Orla', 'Pieter',
  'Rhian', 'Stuart', 'Tilly', 'Violet', 'Wren',
];

/** Deterministic name for a storm window opening at this sim minute —
 *  keyed off the window's calendar day, so the banner shows the same
 *  name every tick the forecast stands. */
export function stormName(startMin: number): string {
  return STORM_NAMES[Math.floor(startMin / 1440) % STORM_NAMES.length] ?? 'Aoife';
}

/** Pure, deterministic storm forecast off the regime pre-roll: the
 *  weather machine pre-rolls nextRegime 2–6 game-days ahead (the lead
 *  time), so a windy-wet front queued for winter IS the storm warning.
 *  The in-progress storm is not re-forecast here — the live storm
 *  banner already rides isStorm/stormAnnounced events. */
export function forecastStorms(state: GameState): StormForecast[] {
  const w = state.weather;
  // a queued named STORM is always a warning; a windy-wet front only
  // rates a forecast banner in the cold half of the year.
  const next = w.nextRegime;
  if ((next !== 'storm' && next !== 'windy-wet') || w.regimeEndsMin === undefined) return [];
  const winterness = seasonFactor(w.regimeEndsMin);
  if (next === 'windy-wet' && winterness < STORM_WINTERNESS) return [];
  // mirrors events/weather.ts REGIMES wind envelopes (that file is
  // read-only here): the named storm gusts to ~0.92+, windy-wet to ~0.66.
  const severity =
    next === 'storm'
      ? Math.min(1, 0.92 + 0.06 * winterness)
      : Math.min(1, 0.66 + 0.12 * winterness);
  return [
    {
      name: `Storm ${stormName(w.regimeEndsMin)}`,
      etaMin: Math.max(0, w.regimeEndsMin - state.simTimeMin),
      severity,
    },
  ];
}

// ----------------------------------------------------------------------
// Prep actions (invoked via the 'stormPrep' command).

/** Contractor surge package: extra crewed vans per hire. */
export const SURGE_VANS = 4;
/** Surge contractors price at this multiple of the regular van rate. */
export const SURGE_COST_MUL = 3;
/** Surge window bounds, game-days. */
export const SURGE_MAX_DAYS = 14;
export const SURGE_DEFAULT_DAYS = 3;
/** Emergency vegetation cut, £k per km (tile) of overhead route —
 *  call-out crews at short notice, far dearer than the programme rate. */
export const VEG_CUT_K_PER_KM = 4;

/** One-off £k prep spend → the rolling annualized rate (see header). */
function chargeStormPrep(state: GameState, costK: number): void {
  state.stormPrepYrK = (state.stormPrepYrK ?? 0) + costK;
}

/** Hire surge contractor crews: SURGE_VANS temporary vans until
 *  surgeUntilMin (an active window extends from its current end). The
 *  van roster picks them up via tick.ts's syncVans call site. */
export function applySurgeCrews(state: GameState, days: number): CommandResult {
  if (!Number.isFinite(days) || days < 1 || days > SURGE_MAX_DAYS) {
    return { ok: false, error: `surge crews hire for 1–${SURGE_MAX_DAYS} days` };
  }
  const d = Math.round(days);
  const costK = Math.round(SURGE_COST_MUL * VAN_OPEX_K_YR * SURGE_VANS * (d / 365));
  const from = Math.max(state.surgeUntilMin ?? 0, state.simTimeMin);
  state.surgeUntilMin = from + d * 1440;
  state.surgeVans = SURGE_VANS;
  chargeStormPrep(state, costK);
  pushEvent(
    state,
    'info',
    `surge crews hired: ${SURGE_VANS} contractor vans for ${d} day${d > 1 ? 's' : ''} (£${costK}k)`,
  );
  return { ok: true };
}

/** Emergency vegetation cut on one overhead corridor: one-off cost,
 *  overgrowth halved — the storm fault rate scales with lineVeg, so this
 *  directly de-risks the chosen circuit before the front arrives. */
export function emergencyVegCut(state: GameState, lineId: number): CommandResult {
  const line = state.assets.get(lineId);
  if (!line || line.kind !== 'line') return { ok: false, error: 'no such line' };
  if (line.build !== 'overhead') return { ok: false, error: 'cables have no vegetation to cut' };
  const veg = state.lineVeg.get(lineId) ?? 0;
  if (veg <= 0.01) return { ok: false, error: 'that corridor is already clear' };
  const costK = Math.round(VEG_CUT_K_PER_KM * Math.max(1, line.lengthTiles));
  state.lineVeg.set(lineId, veg * 0.5);
  chargeStormPrep(state, costK);
  pushEvent(state, 'info', `emergency vegetation cut on the ${line.level} kV line (£${costK}k)`);
  return { ok: true };
}

// ----------------------------------------------------------------------
// SCOUTS: regular office staff drive the lines to put eyes on the network.
//
// In a real storm-prep the biggest delay is rarely the repair itself — it
// is FINDING the fault. A radial feeder trips, hundreds go dark, and a
// crew can't fix what nobody has located yet. Sending office staff out to
// patrol the overhead routes ("eyes on the network") shortens fault
// DETECTION/location, so a job is handed to a crew (or the contractor
// fallback fires) sooner. We model that as a restoration speedup over the
// scout window: tick.ts scales the fleet step's dtMin by scoutSpeedMul, so
// travel + repair + the contractor clock all run faster while scouts are
// out — fewer customer-minutes lost (lower CML) for the storm.

/** Scouts deploy for this many game-days per activation (a storm shift). */
export const SCOUTS_MAX_DAYS = 14;
export const SCOUTS_DEFAULT_DAYS = 3;
/** Eyes-on-the-network restoration speedup while scouts patrol: faults are
 *  found and handed off ~35% faster, so CML clears quicker. */
export const SCOUTS_SPEED_MUL = 1.35;
/** Office staff on patrol cars cost this £k per scout-day (cars, fuel,
 *  overtime — cheaper than crews, but not free). */
export const SCOUTS_K_PER_DAY = 6;

/** Restoration speed multiplier from active scouts (1 when none out). */
export function scoutSpeedMul(state: GameState): number {
  return state.simTimeMin < (state.scoutsUntilMin ?? 0) ? SCOUTS_SPEED_MUL : 1;
}

/** Activate scouts: office staff patrol the overhead network for `days`,
 *  speeding fault location (and thus restoration) over the window. An
 *  active window extends from its current end, like surge crews. */
export function applyScouts(state: GameState, days: number): CommandResult {
  if (!Number.isFinite(days) || days < 1 || days > SCOUTS_MAX_DAYS) {
    return { ok: false, error: `scouts deploy for 1–${SCOUTS_MAX_DAYS} days` };
  }
  const d = Math.round(days);
  const costK = Math.round(SCOUTS_K_PER_DAY * d);
  const from = Math.max(state.scoutsUntilMin ?? 0, state.simTimeMin);
  state.scoutsUntilMin = from + d * 1440;
  chargeStormPrep(state, costK);
  pushEvent(
    state,
    'info',
    `scouts activated: office staff driving the lines for ${d} day${d > 1 ? 's' : ''} (£${costK}k)`,
  );
  return { ok: true };
}

// ----------------------------------------------------------------------
// WIDER CALL HANDLING + the call-response model (owner domain spec).
//
// Real ops: every interrupted customer phones in. The call centre answers
// at a baseline rate; understaff it during the surge and a real person
// can't get to the phone — answer time climbs past the < 5 s target and
// CSAT goes negative. The wider-call-handling lever drafts regular office
// staff onto the phones for a window, lifting capacity so the answer time
// stays inside target and CSAT is protected. It's a combination of
// investment in staff (the standing fleet/org), training, and this surge
// drafting — exactly the owner's three legs.

/** Baseline call-centre capacity: the steady-state number of concurrently
 *  interrupted customers the standing call centre can keep answered inside
 *  target. Below this, answer time sits at the floor. */
export const BASE_CALL_CAPACITY = 1500;
/** Each drafted office call handler adds this much capacity (one trained
 *  body fields a slice of the storm's calls). */
export const CALL_HANDLER_CAPACITY = 1200;
/** Office staff drafted per wider-call-handling activation. */
export const CALL_HANDLERS_PER_ACTIVATION = 6;
/** Wider call handling runs for this many game-days per activation. */
export const CALL_HANDLING_MAX_DAYS = 14;
export const CALL_HANDLING_DEFAULT_DAYS = 3;
/** Drafted handlers cost this £k per handler-day (overtime + training
 *  draw-down — they're doing their day job otherwise). */
export const CALL_HANDLER_K_PER_DAY = 3;

/** GSOP-style target: a real person answers within this many seconds. */
export const CALL_TARGET_SECONDS = 5;
/** Answer time at/below capacity (a real person picks up fast). */
const CALL_FLOOR_SECONDS = 2;
/** How hard answer time climbs once demand passes capacity. With this
 *  slope the target (5 s) is crossed at ~1.07× capacity, and a 2×-capacity
 *  surge sits around a minute on hold — punishing but not infinite. */
const CALL_OVERLOAD_SLOPE = 55;

/** Effective live call-handling capacity right now: the standing centre
 *  plus any drafted office handlers still on the phones for the window. */
export function callHandlingCapacity(state: GameState): number {
  const drafted =
    state.simTimeMin < (state.callHandlersUntilMin ?? 0) ? (state.callHandlersExtra ?? 0) : 0;
  return BASE_CALL_CAPACITY + drafted * CALL_HANDLER_CAPACITY;
}

/** Call VOLUME proxy: the number of customers currently off supply. Every
 *  interrupted customer is a potential caller, so volume tracks the live
 *  interrupted count one-for-one (a simple, monotonic, deterministic
 *  proxy — no per-call RNG). */
export function callVolume(interruptedCustomers: number): number {
  return Math.max(0, interruptedCustomers);
}

/** Effective answer time for a real person, SECONDS, from live call volume
 *  vs handling capacity. At/below capacity it sits at the floor (~2 s);
 *  above capacity it climbs with the overload ratio. Pure + monotonic in
 *  volume (↑) and capacity (↓) — the heart of the model, unit-tested. */
export function callAnswerSeconds(volume: number, capacity: number): number {
  const cap = Math.max(1, capacity);
  const overload = Math.max(0, volume / cap - 1);
  return CALL_FLOOR_SECONDS + CALL_OVERLOAD_SLOPE * overload;
}

/** Transient CSAT (satisfaction-target) delta from the current answer time.
 *  Inside the < 5 s target it is 0 (well-handled calls don't move the
 *  mood). Past target it goes NEGATIVE, deepening the longer the hold, to
 *  a floor — a sustained "can't get through in a storm" hit, exactly the
 *  owner's "understaffing → negative CSAT". Pure + monotonic. */
export const CALL_CSAT_FLOOR = -22;
export function callCsatDelta(answerSeconds: number): number {
  const over = answerSeconds - CALL_TARGET_SECONDS;
  if (over <= 0) return 0;
  // −1.0 CSAT per second over target, floored: 5 s over = −5, ~27 s = floor
  return Math.max(CALL_CSAT_FLOOR, -over);
}

/** The live storm-prep call-handling readout for the snapshot/UI: the
 *  current answer time, the target, the capacity, the volume, and the CSAT
 *  delta in force. Pure read off state + the live interrupted count. */
export interface CallHandlingView {
  volume: number;
  capacity: number;
  answerSeconds: number;
  targetSeconds: number;
  csatDelta: number;
  /** Office handlers drafted onto the phones right now. */
  draftedHandlers: number;
}
export function callHandlingView(state: GameState, interruptedCustomers: number): CallHandlingView {
  const volume = callVolume(interruptedCustomers);
  const capacity = callHandlingCapacity(state);
  const answerSeconds = callAnswerSeconds(volume, capacity);
  const drafted =
    state.simTimeMin < (state.callHandlersUntilMin ?? 0) ? (state.callHandlersExtra ?? 0) : 0;
  return {
    volume,
    capacity,
    answerSeconds,
    targetSeconds: CALL_TARGET_SECONDS,
    csatDelta: callCsatDelta(answerSeconds),
    draftedHandlers: drafted,
  };
}

/** Draft office staff onto the phones (wider call handling) for `days`: the
 *  call-handling capacity lifts for the window so answer time stays inside
 *  target through the surge, protecting CSAT. Extends an active window from
 *  its current end. */
export function applyWiderCallHandling(state: GameState, days: number): CommandResult {
  if (!Number.isFinite(days) || days < 1 || days > CALL_HANDLING_MAX_DAYS) {
    return { ok: false, error: `wider call handling runs for 1–${CALL_HANDLING_MAX_DAYS} days` };
  }
  const d = Math.round(days);
  const costK = Math.round(CALL_HANDLER_K_PER_DAY * CALL_HANDLERS_PER_ACTIVATION * d);
  const from = Math.max(state.callHandlersUntilMin ?? 0, state.simTimeMin);
  state.callHandlersUntilMin = from + d * 1440;
  state.callHandlersExtra = CALL_HANDLERS_PER_ACTIVATION;
  chargeStormPrep(state, costK);
  pushEvent(
    state,
    'info',
    `wider call handling: ${CALL_HANDLERS_PER_ACTIVATION} office staff on the phones for ${d} day${d > 1 ? 's' : ''} (£${costK}k)`,
  );
  return { ok: true };
}

/** The 'stormPrep' command body (commands.ts delegates here whole). The
 *  owner's system-prepare levers: scale up SHIFTS (extra crewed vans, the
 *  surge engine), activate SCOUTS (eyes on the network), draft WIDER CALL
 *  HANDLING (office staff onto the phones), and the emergency veg cut. */
export function applyStormPrep(
  state: GameState,
  cmd: {
    action: 'surge' | 'shifts' | 'scouts' | 'callHandling' | 'vegCut';
    lineId?: number | undefined;
    days?: number | undefined;
  },
): CommandResult {
  // 'shifts' is the player-facing name for the crew-surge engine; 'surge'
  // is kept as an alias so existing saves/tests/commands still resolve.
  if (cmd.action === 'surge' || cmd.action === 'shifts') {
    return applySurgeCrews(state, cmd.days ?? SURGE_DEFAULT_DAYS);
  }
  if (cmd.action === 'scouts') return applyScouts(state, cmd.days ?? SCOUTS_DEFAULT_DAYS);
  if (cmd.action === 'callHandling') {
    return applyWiderCallHandling(state, cmd.days ?? CALL_HANDLING_DEFAULT_DAYS);
  }
  if (cmd.lineId === undefined) return { ok: false, error: 'vegetation cut needs a line' };
  return emergencyVegCut(state, cmd.lineId);
}

// ----------------------------------------------------------------------
// Bill integration.

/** Decay tau: one game-year, so ∫rate·dt ≈ the £k charged. */
const STORM_PREP_TAU_MIN = 525_600;

/** Rolling annualized storm-prep spend, £k/yr. Called once per solveTick
 *  from the computeBill call site (the single permitted tick.ts bill
 *  change): decays the rate by dtMin like the other rolling cost lines,
 *  then returns it. dtMin = 0 (paused/command re-solves) decays nothing,
 *  keeping inspection side-effect free and ticks deterministic. */
export function stormPrepYrK(state: GameState, dtMin: number): number {
  const cur = state.stormPrepYrK ?? 0;
  if (dtMin > 0 && cur > 0) {
    const next = cur * (1 - dtMin / (dtMin + STORM_PREP_TAU_MIN));
    state.stormPrepYrK = next < 0.001 ? undefined : next;
  }
  return state.stormPrepYrK ?? 0;
}
