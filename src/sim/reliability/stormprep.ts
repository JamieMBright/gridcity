// Storm preparation (ROADMAP #9, sim side): a deterministic named-storm
// forecast read off the weather regime pre-roll, plus the prep actions —
// surge contractor crews and emergency vegetation cuts — and their bill
// integration. UI lands separately; the single player entry point is the
// 'stormPrep' command in commands.ts, which delegates to applyStormPrep
// here (commands.ts stays thin by design — another engineer owns it).
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
  if (w.nextRegime !== 'windy-wet' || w.regimeEndsMin === undefined) return [];
  const winterness = seasonFactor(w.regimeEndsMin);
  if (winterness < STORM_WINTERNESS) return [];
  // mirrors events/weather.ts REGIMES['windy-wet'] wind envelope
  // (wind 0.66 + winter boost 0.12 — that file is read-only here)
  const severity = Math.min(1, 0.66 + 0.12 * winterness);
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

/** The 'stormPrep' command body (commands.ts delegates here whole). */
export function applyStormPrep(
  state: GameState,
  cmd: { action: 'surge' | 'vegCut'; lineId?: number | undefined; days?: number | undefined },
): CommandResult {
  if (cmd.action === 'surge') return applySurgeCrews(state, cmd.days ?? SURGE_DEFAULT_DAYS);
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
