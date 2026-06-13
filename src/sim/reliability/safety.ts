// ROADMAP #55 — Health & Safety, the full owner model.
//
// The most serious metric a real utility runs on. We build a SAFETY
// CULTURE through an investment dial (events/directorates.ts: state.org
// .safety), surface it as an EMPLOYEE ENGAGEMENT (safety) score that
// flirts ~90% when genuinely good, and roll RIDDOR-grounded incidents off
// the seeded sim RNG. NO DEATHS, ever — people are "injured", never
// killed. The tone stays sober: counters, notices and consequences.
//
// GB grounding:
//  • Regulator: the HSE (Health and Safety Executive), enforcing the
//    Health and Safety at Work etc. Act 1974. Its toolkit: investigations,
//    IMPROVEMENT NOTICES (fix within a deadline), PROHIBITION NOTICES
//    (stop the dangerous activity now) and prosecutions with escalating
//    FINES on repeat offence. Modelled here as notice events with
//    deadlines and a fine that rides the bill.
//  • RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences
//    Regulations 2013). Two reportable metrics drive the dashboard:
//      LTI  — LOST TIME INCIDENT: an employee injured and unable to work
//             their next shift (the RIDDOR "over-7-day" / lost-time idea).
//             Target 0; <5/yr tolerable but ANY is awful. Cause mix:
//             ELECTROCUTION, FALL FROM HEIGHT, ROAD TRAFFIC,
//             EXCAVATION/CONSTRUCTION, SLIP/TRIP/FALL.
//      VSI  — VERY SERIOUS INCIDENT: a high-potential near-miss with the
//             POTENTIAL to harm but nobody struck (RIDDOR "dangerous
//             occurrence" / HiPo): a handbrake left off and the van rolls
//             clear, a neutral miswired that could have electrocuted, a
//             public-reported OHL sag with no contact.
//  • The Bradley-curve idea: investment in safety CULTURE drives incident
//    rates down with the SAME complacency plateau as pay — past the sweet
//    spot, extra spend buys little and can breed risk-blindness.
//
// Determinism: incidence is rolled off the seeded sim RNG (state.rngState
// via the tick's Rng). The hazard rate is driven by:
//      safety-culture/engagement score  ×  asset health (ageing.ts)
//    × storm-surge crew-hours (unfamiliar contractors, fatigue)
//    × live-work exposure (open faults near homes — public + live wires).
// More safety + pay investment AND healthier assets ⇒ measurably fewer
// LTI/VSI vs a same-seed control (unit-proven in tests/safety.test.ts).

import type { Rng } from '../rng';
import { pushEvent, type GameState } from '../state';
import {
  PAY_MAX,
  PAY_MIN,
  PAY_PEAK,
  type OrgState,
} from '../events/directorates';

const MIN_PER_YEAR = 525_600;

// ----------------------------------------------------------------------
// Safety culture / engagement (the inverted-U, sibling of pay engagement).

/** Safety engagement at zero programme spend (a compliance-only floor). */
export const SAFETY_BASE = 40;
/** Peak safety engagement at the sweet spot — the ~90% a genuinely good
 *  safety culture surveys at. */
export const SAFETY_PEAK = 90;
/** How far it falls by PAY_MAX of OVERspend (box-ticking complacency,
 *  "we've spent the money so we must be safe"). */
export const SAFETY_OVER_DROP = 14;

/** Safety culture / engagement score, 0..100 — surfaced on the KPI
 *  dashboard. Inverted-U in the safety dial, peaking at PAY_PEAK. */
export function safetyEngagement(safety: number): number {
  const s = Math.max(PAY_MIN, Math.min(PAY_MAX, safety));
  if (s <= PAY_PEAK) {
    const t = PAY_PEAK > 0 ? s / PAY_PEAK : 1;
    return SAFETY_BASE + (SAFETY_PEAK - SAFETY_BASE) * (1 - (1 - t) * (1 - t));
  }
  const over = (s - PAY_PEAK) / (PAY_MAX - PAY_PEAK);
  return SAFETY_PEAK - SAFETY_OVER_DROP * over * over;
}

/** Read state.org.safety safely (0 when no org yet). */
function safetyLevelOf(org: OrgState | undefined): number {
  return org?.safety ?? 0;
}

// ----------------------------------------------------------------------
// Incident state (additive on GameState).

/** RIDDOR-grounded LTI cause categories. */
export type LtiCause =
  | 'electrocution'        // bad risk assessment / wrong PPE / wrong tool
  | 'fall'                 // fall from height — wrong equipment or design
  | 'road'                 // road traffic — driving to site
  | 'excavation'           // excavation/construction — machinery, trench, fall
  | 'sliptrip';            // slip / trip / fall on the level

export const LTI_CAUSES: LtiCause[] = [
  'electrocution', 'fall', 'road', 'excavation', 'sliptrip',
];

export const LTI_CAUSE_LABEL: Record<LtiCause, string> = {
  electrocution: 'electric shock',
  fall: 'fall from height',
  road: 'road traffic',
  excavation: 'excavation / construction',
  sliptrip: 'slip, trip or fall',
};

/** VSI (high-potential near-miss) flavour — nobody struck. */
const VSI_FLAVOUR: string[] = [
  'a handbrake left off — the van rolled clear of the crew',
  'a miswired neutral found on test that could have electrocuted',
  'a member of the public reported a sagging overhead line; no contact',
  'an unguarded trench spotted and barriered before anyone fell',
  'a dropped tool from a pole missed the ganger below',
];

export interface SafetyLog {
  /** RIDDOR log of incidents this period (newest last; capped). */
  entries: SafetyEntry[];
  /** Lifetime LTI count (for the running rate). */
  ltiTotal: number;
  /** Lifetime VSI count. */
  vsiTotal: number;
  /** LTI count at the current RIIO period's start (for per-period rate). */
  ltiPeriodStart: number;
  vsiPeriodStart: number;
  /** Open HSE improvement notice, if any: fix the culture (raise the
   *  safety dial above breach) before its deadline or a fine follows. */
  notice?: HseNotice | undefined;
  /** How many enforcement notices have been served (escalates fines). */
  noticeCount: number;
  /** Rolling annualized HSE fine spend, £k/yr (stormPrepYrK's sibling —
   *  rides the bill's penalty line, decays over a game-year). */
  fineYrK?: number | undefined;
}

export interface SafetyEntry {
  tMin: number;
  kind: 'lti' | 'vsi';
  cause?: LtiCause | undefined;
  text: string;
}

export interface HseNotice {
  /** Improvement-notice deadline, game-minute: meet the safety bar by
   *  then or the fine lands. */
  deadlineMin: number;
  /** The safety-engagement floor the HSE expects met by the deadline. */
  requireEngagement: number;
  served: boolean;
}

export function newSafetyLog(): SafetyLog {
  return {
    entries: [],
    ltiTotal: 0,
    vsiTotal: 0,
    ltiPeriodStart: 0,
    vsiPeriodStart: 0,
    noticeCount: 0,
  };
}

const LOG_CAP = 40;

// ----------------------------------------------------------------------
// The hazard model.

/** Baseline LTI rate at the compliance floor (safety engagement = BASE),
 *  healthy kit, calm weather, no live exposure: events per game-year. A
 *  small number — but never zero, the point of "any is awful". */
export const LTI_BASE_PER_YEAR = 2.2;
/** VSI near-misses run several times more frequent than LTIs (the safety
 *  pyramid: many near-misses per injury). */
export const VSI_BASE_PER_YEAR = 9;

/** Culture multiplier on the incident rate from the safety-engagement
 *  score: 1.0 at the BASE floor, falling toward this FLOOR at the peak —
 *  a great safety culture roughly quarters the rate. Past the plateau the
 *  engagement score itself dips, so the rate creeps back up (complacency).*/
export const CULTURE_RATE_FLOOR = 0.25;

/** Culture multiplier from a safety-engagement score (0..100). */
export function cultureRateMul(safetyEng: number): number {
  // map engagement BASE..PEAK onto 1.0..FLOOR; clamp for off-range values
  const t = (safetyEng - SAFETY_BASE) / (SAFETY_PEAK - SAFETY_BASE);
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - CULTURE_RATE_FLOOR) * clamped;
}

/** Asset-health multiplier on the incident rate: poor, decrepit kit is
 *  more dangerous to work on (flashovers, collapses). 1.0 at full health,
 *  up to this at zero health. */
export const HEALTH_HAZARD_AT_ZERO = 2.0;

/** Asset-health multiplier from a network-health percentage (0..100). */
export function healthHazardMul(healthPct: number): number {
  const frac = Math.max(0, Math.min(100, healthPct)) / 100;
  return 1 + (HEALTH_HAZARD_AT_ZERO - 1) * (1 - frac);
}

/** Storm/surge crew-hour exposure: contractors hired in for a storm are
 *  unfamiliar with the patch and tired — this lifts the rate while a
 *  surge window is live. */
export const SURGE_HAZARD_MUL = 1.8;
/** A bad blow (storm) raises field risk even without surge crews. */
export const STORM_HAZARD_MUL = 1.5;

/** Live-work exposure: each open fault near homes (a live span down in a
 *  populated area) adds public + live-wire risk. Scaled per open job. */
export const LIVE_WORK_PER_JOB = 0.18;

/** The combined live LTI/VSI hazard rates (events/year) right now. Pure;
 *  reads state + the precomputed network health so the tick doesn't pay
 *  for it twice. */
export function incidentRates(
  state: GameState,
  healthPct: number,
  storm: boolean,
): { ltiPerYear: number; vsiPerYear: number; culture: number } {
  const eng = safetyEngagement(safetyLevelOf(state.org));
  const culture = cultureRateMul(eng);
  const health = healthHazardMul(healthPct);
  let exposure = culture * health;
  const surgeLive = state.simTimeMin < (state.surgeUntilMin ?? 0) && (state.surgeVans ?? 0) > 0;
  if (surgeLive) exposure *= SURGE_HAZARD_MUL;
  if (storm) exposure *= STORM_HAZARD_MUL;
  // live-work: open repair jobs are crews on live or storm-damaged kit
  exposure *= 1 + LIVE_WORK_PER_JOB * state.jobs.size;
  return {
    ltiPerYear: LTI_BASE_PER_YEAR * exposure,
    vsiPerYear: VSI_BASE_PER_YEAR * exposure,
    culture,
  };
}

// ----------------------------------------------------------------------
// The tick hook: roll incidents, run HSE enforcement.

/** A rolled LTI, surfaced to the tick so it can seed a litigation claim
 *  (an injury claim) — litigation.ts consumes it. */
export interface IncidentResult {
  lti?: { cause: LtiCause; text: string };
}

const FINE_TAU_MIN = 525_600;
/** Base HSE fine for an LTI that breaches an open improvement notice, £k.
 *  Escalates with repeat offences (noticeCount). */
export const HSE_FINE_BASE_K = 600;
/** Improvement-notice deadline, game-days. */
export const NOTICE_DEADLINE_DAYS = 60;
/** An LTI opens an HSE investigation → improvement notice when the safety
 *  culture is below this engagement bar (i.e. the player was underspending).*/
export const NOTICE_TRIGGER_ENGAGEMENT = 70;

function chargeFine(log: SafetyLog, costK: number): void {
  log.fineYrK = (log.fineYrK ?? 0) + costK;
}

/** Decay the rolling HSE-fine rate and return it (rides the bill via
 *  tick.ts, beside stormPrepYrK). dtMin = 0 decays nothing. */
export function hseFineYrK(state: GameState, dtMin: number): number {
  const log = state.safety;
  if (!log) return 0;
  const cur = log.fineYrK ?? 0;
  if (dtMin > 0 && cur > 0) {
    const next = cur * (1 - dtMin / (dtMin + FINE_TAU_MIN));
    log.fineYrK = next < 0.001 ? undefined : next;
  }
  return log.fineYrK ?? 0;
}

function pushLog(log: SafetyLog, e: SafetyEntry): void {
  log.entries.push(e);
  if (log.entries.length > LOG_CAP) log.entries.splice(0, log.entries.length - LOG_CAP);
}

/** Roll this tick's safety incidents off the seeded RNG and run HSE
 *  enforcement. Called once per accumulating solveTick (dtMin > 0).
 *  Returns any LTI so the tick can seed an injury claim. The RNG draws
 *  (two chance() calls, plus cause/flavour picks only when one fires) are
 *  deterministic per seed. */
export function stepSafety(
  state: GameState,
  rng: Rng,
  dtMin: number,
  healthPct: number,
  storm: boolean,
): IncidentResult {
  const out: IncidentResult = {};
  if (dtMin <= 0) return out;
  const log = (state.safety ??= newSafetyLog());
  const { ltiPerYear, vsiPerYear } = incidentRates(state, healthPct, storm);

  // VSI near-miss (high-potential, nobody struck)
  if (rng.chance((vsiPerYear * dtMin) / MIN_PER_YEAR)) {
    const text = VSI_FLAVOUR[rng.int(VSI_FLAVOUR.length)] ?? VSI_FLAVOUR[0]!;
    log.vsiTotal++;
    pushLog(log, { tMin: state.simTimeMin, kind: 'vsi', text });
    pushEvent(state, 'warn', `near miss reported: ${text}`);
  }

  // LTI (an employee injured, off their next shift)
  if (rng.chance((ltiPerYear * dtMin) / MIN_PER_YEAR)) {
    const cause = LTI_CAUSES[rng.int(LTI_CAUSES.length)] ?? 'sliptrip';
    const text = `lost-time injury — ${LTI_CAUSE_LABEL[cause]}`;
    log.ltiTotal++;
    pushLog(log, { tMin: state.simTimeMin, kind: 'lti', cause, text });
    pushEvent(state, 'bad', `${text}; a colleague is recovering and off work`);
    out.lti = { cause, text };

    // HSE enforcement: an LTI on a weak safety culture opens an
    // investigation → improvement notice with a deadline. If a notice is
    // ALREADY open (repeat offence) the fine lands now and escalates.
    const eng = safetyEngagement(safetyLevelOf(state.org));
    if (log.notice && !log.notice.served) {
      // repeat offence while a notice stands: fine now, escalating
      log.notice.served = true;
      log.noticeCount++;
      const fineK = HSE_FINE_BASE_K * log.noticeCount;
      chargeFine(log, fineK);
      pushEvent(
        state,
        'bad',
        `HSE prosecution: a second lost-time injury under an open notice — £${fineK}k fine`,
      );
      log.notice = undefined;
    } else if (eng < NOTICE_TRIGGER_ENGAGEMENT && !log.notice) {
      log.notice = {
        deadlineMin: state.simTimeMin + NOTICE_DEADLINE_DAYS * 1440,
        requireEngagement: NOTICE_TRIGGER_ENGAGEMENT,
        served: false,
      };
      pushEvent(
        state,
        'bad',
        `HSE investigation: an improvement notice is served — lift the safety programme within ${NOTICE_DEADLINE_DAYS} days`,
      );
    }
  }

  // notice lifecycle: meet the bar by the deadline (close it) or be fined
  if (log.notice && !log.notice.served) {
    const eng = safetyEngagement(safetyLevelOf(state.org));
    if (eng >= log.notice.requireEngagement) {
      log.notice = undefined;
      pushEvent(state, 'info', 'HSE improvement notice closed — the safety programme passed inspection');
    } else if (state.simTimeMin >= log.notice.deadlineMin) {
      log.notice.served = true;
      log.noticeCount++;
      const fineK = HSE_FINE_BASE_K * log.noticeCount;
      chargeFine(log, fineK);
      pushEvent(
        state,
        'bad',
        `HSE improvement notice expired un-met — £${fineK}k fine on the bill`,
      );
      log.notice = undefined;
    }
  }

  return out;
}

// ----------------------------------------------------------------------
// KPI view: LTI/VSI per game-year over the current RIIO period.

export interface SafetyView {
  ltiPerYear: number;
  vsiPerYear: number;
  /** Safety culture / engagement, 0..100. */
  engagement: number;
  /** Open HSE improvement notice (days left), if any. */
  noticeDaysLeft?: number;
}

/** Per-period LTI/VSI annualized rates + the safety-engagement score, for
 *  the KPI dashboard. Pure read of state. */
export function safetyView(state: GameState): SafetyView {
  const log = state.safety;
  const eng = safetyEngagement(safetyLevelOf(state.org));
  if (!log) return { ltiPerYear: 0, vsiPerYear: 0, engagement: eng };
  const periodMin = Math.max(1, state.simTimeMin - state.period.startMin);
  const years = periodMin / MIN_PER_YEAR;
  const view: SafetyView = {
    ltiPerYear: years > 0 ? (log.ltiTotal - log.ltiPeriodStart) / years : 0,
    vsiPerYear: years > 0 ? (log.vsiTotal - log.vsiPeriodStart) / years : 0,
    engagement: eng,
  };
  if (log.notice && !log.notice.served) {
    view.noticeDaysLeft = Math.max(0, (log.notice.deadlineMin - state.simTimeMin) / 1440);
  }
  return view;
}

/** Roll the per-period LTI/VSI baselines forward at a RIIO period close
 *  (called from tick.ts beside the other period bookkeeping). */
export function rolloverSafetyPeriod(state: GameState): void {
  const log = state.safety;
  if (!log) return;
  log.ltiPeriodStart = log.ltiTotal;
  log.vsiPeriodStart = log.vsiTotal;
}
