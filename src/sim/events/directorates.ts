// ROADMAP #53 — the network business: directorates + workplace culture.
//
// A real DNO/ESO is an organisation, not a cursor. We model it as a small
// set of funded DIRECTORATES — Asset Management, Network Operations,
// Connections, Customer Service, Safety & Compliance, Regulation/Finance —
// each a staffing/funding dial that costs £/yr on the bill and buffs the
// mechanics it owns. Beside them sit two unbounded INVESTMENT dials:
//
//  • PAY & BENEFITS / EMPLOYEE ENGAGEMENT (health insurance, paid
//    paternity, real pensions — "you name it"). The more invested, the
//    higher staff ENGAGEMENT, which lifts efficiency across the board:
//    faster fixes/restorations (lower CI/CML), shorter application/
//    connection cadence, a bigger innovation benefit and more pitches,
//    earlier overload early-warnings, proactive tree maintenance, faster
//    fault response.
//  • SAFETY PROGRAMME (the H&S culture dial — see reliability/safety.ts).
//
// CRUCIAL — the COMPLACENCY PLATEAU. Real engagement does NOT scale
// forever: past a healthy plateau, pouring money in inverts the benefit
// (entitlement, bloat, risk-blindness, the "rest-and-vest" effect). Both
// the pay and safety dials run through an inverted-U so the SMART play is
// to fund GENEROUSLY but not absurdly — overpaying is a real mistake that
// shows up in the bill AND the outcomes.
//
// Determinism: this is all pure functions of integer dial levels held in
// additive optional GameState.org. UI reads the snapshot; the sim reads
// state.org. Defaults (undefined / a fresh DEFAULT_ORG) leave every
// multiplier at exactly 1.0 and every cost at 0, so existing saves are
// untouched until the player turns a dial.

import { VAN_OPEX_K_YR } from '../catalog';
import type { GameState } from '../state';

// ----------------------------------------------------------------------
// State.

/** The six funded directorates. Each is a 0–4 staffing dial (lean →
 *  generously resourced); 1 is the neutral "as today" default so a fresh
 *  org is behaviour-neutral. */
export type Directorate =
  | 'asset'      // Asset Management — ageing/maintenance, proactive veg
  | 'operations' // Network Operations / Control Room — fault & fleet response
  | 'connections'// Connections — application & tender cadence (offers out faster)
  | 'customer'   // Customer Service — satisfaction recovery
  | 'safety'     // Safety & Compliance — H&S culture + litigation defence
  | 'regulation';// Regulation / Finance — RIIO composite + claims defence

export const DIRECTORATES: Directorate[] = [
  'asset', 'operations', 'connections', 'customer', 'safety', 'regulation',
];

export interface DirectorateMeta {
  key: Directorate;
  name: string;
  blurb: string;
}

export const DIRECTORATE_META: Record<Directorate, DirectorateMeta> = {
  asset: {
    key: 'asset',
    name: 'Asset Management',
    blurb: 'Condition, maintenance and proactive tree cutting.',
  },
  operations: {
    key: 'operations',
    name: 'Network Operations',
    blurb: 'The control room and the orange vans — fault response.',
  },
  connections: {
    key: 'connections',
    name: 'Connections',
    blurb: 'Studies, offers and tenders — getting developers connected.',
  },
  customer: {
    key: 'customer',
    name: 'Customer Service',
    blurb: 'Winning back trust after the lights go out.',
  },
  safety: {
    key: 'safety',
    name: 'Safety & Compliance',
    blurb: 'The H&S programme and the legal defence team.',
  },
  regulation: {
    key: 'regulation',
    name: 'Regulation & Finance',
    blurb: 'RIIO submissions and keeping the regulator onside.',
  },
};

/** Staffing dial range: 0 (skeleton) … 4 (richly resourced); 1 = neutral. */
export const DIR_MIN = 0;
export const DIR_MAX = 4;
export const DIR_NEUTRAL = 1;

/** Pay/benefits & safety-programme dials: 0 (statutory minimum) …
 *  PAY_MAX. 0 is the neutral default (no extra spend, no buff) so a fresh
 *  org changes nothing. The dials are "effectively unbounded" per the
 *  owner — PAY_MAX is generous headroom well past the plateau, so the
 *  player can visibly overspend into the inverted-U. */
export const PAY_MIN = 0;
export const PAY_MAX = 10;

export interface OrgState {
  /** directorate → 0–4 staffing level (default DIR_NEUTRAL). */
  dirs: Partial<Record<Directorate, number>>;
  /** Pay & benefits / employee-engagement investment, 0–PAY_MAX. */
  pay: number;
  /** H&S programme investment, 0–PAY_MAX (the safety culture dial). */
  safety: number;
}

export function newOrg(): OrgState {
  return { dirs: {}, pay: PAY_MIN, safety: PAY_MIN };
}

/** Read a directorate's level, defaulting to neutral. */
export function dirLevel(org: OrgState | undefined, d: Directorate): number {
  return org?.dirs[d] ?? DIR_NEUTRAL;
}

// ----------------------------------------------------------------------
// Cost (rides the bill). All spend comes off the bill — every dial is
// recovered through the network pot via tick.ts (it rides penaltyYrK
// beside stormPrepYrK, so bill.ts is untouched).

/** A full directorate step (level 1→2) costs this £k/yr — a chunky team
 *  budget. Level 1 is free (it is the baseline already priced into the
 *  game's calibration); each level ABOVE 1 adds DIR_STEP_K, each level
 *  BELOW 1 saves it (running lean is a real, if risky, saving). */
export const DIR_STEP_K = 1800;
/** Pay/benefits per level, £k/yr — a licence-wide package is dear. */
export const PAY_STEP_K = 1400;
/** Safety programme per level, £k/yr. */
export const SAFETY_STEP_K = 900;

/** Total annual organisation cost, £k/yr (0 for a fresh/undefined org). */
export function orgYrK(org: OrgState | undefined): number {
  if (!org) return 0;
  let k = 0;
  for (const d of DIRECTORATES) k += (dirLevel(org, d) - DIR_NEUTRAL) * DIR_STEP_K;
  k += org.pay * PAY_STEP_K;
  k += org.safety * SAFETY_STEP_K;
  return k;
}

// ----------------------------------------------------------------------
// The engagement model — the inverted-U.
//
// engagementScore(pay) rises with investment toward a healthy plateau,
// then DECLINES as overspend breeds complacency. We surface it as a 0–100
// EMPLOYEE ENGAGEMENT score that flirts ~90% when genuinely well-funded
// (the real-world "great place to work" survey ceiling) and sags both for
// underspend AND for absurd overspend.
//
// Shape: a baseline at pay 0 (a glum but functional workforce), climbing
// to the peak at PAY_PEAK, then easing back down. We use a smooth
// quadratic-in-distance penalty either side of the peak.

/** Engagement at zero extra investment (statutory minimum), %. */
export const ENGAGE_BASE = 45;
/** Peak engagement at the sweet spot, %. */
export const ENGAGE_PEAK = 92;
/** The pay level that maximises engagement (the plateau centre). Beyond
 *  it, complacency sets in. Chosen so a thoughtful player aims here, not
 *  at PAY_MAX. */
export const PAY_PEAK = 5;
/** How far engagement falls by PAY_MAX of OVERspend (entitlement /
 *  rest-and-vest) — the inverted-U's downslope, gentler than the climb. */
export const ENGAGE_OVER_DROP = 18;

/** Employee engagement, 0..100, as an inverted-U in the pay dial. */
export function engagementScore(pay: number): number {
  const p = Math.max(PAY_MIN, Math.min(PAY_MAX, pay));
  if (p <= PAY_PEAK) {
    // rising arm: base → peak, ease-out so early pounds buy the most
    const t = PAY_PEAK > 0 ? p / PAY_PEAK : 1;
    return ENGAGE_BASE + (ENGAGE_PEAK - ENGAGE_BASE) * (1 - (1 - t) * (1 - t));
  }
  // falling arm: peak → peak − drop, quadratic in the overspend distance
  const over = (p - PAY_PEAK) / (PAY_MAX - PAY_PEAK); // 0..1
  return ENGAGE_PEAK - ENGAGE_OVER_DROP * over * over;
}

/** A 0..1 "engagement buff" centred on the neutral org: 0 at the glum
 *  baseline, ~1 at the peak, easing back past it. Multipliers below scale
 *  off THIS so an untouched org (pay 0) gives a small-but-real penalty-free
 *  baseline buff of 0 — i.e. neutral mechanics. */
export function engagementBuff(pay: number): number {
  // map engagement [BASE..PEAK] onto [0..1], so pay 0 → 0 (neutral) and
  // the peak → 1 (full buff); overspend brings it back DOWN below 1.
  return (engagementScore(pay) - ENGAGE_BASE) / (ENGAGE_PEAK - ENGAGE_BASE);
}

// ----------------------------------------------------------------------
// Wired multipliers. Each combines the relevant directorate's staffing
// with the licence-wide engagement buff. A directorate at neutral (1) and
// pay at 0 yields a multiplier of exactly 1.0 — behaviour-neutral.

/** Directorate staffing as a signed buff around neutral: level 1 → 0,
 *  level 4 → +1 (max), level 0 → −1 (lean penalty). */
function dirBuff(org: OrgState | undefined, d: Directorate): number {
  const lvl = dirLevel(org, d);
  return lvl >= DIR_NEUTRAL
    ? (lvl - DIR_NEUTRAL) / (DIR_MAX - DIR_NEUTRAL)
    : (lvl - DIR_NEUTRAL) / (DIR_NEUTRAL - DIR_MIN);
}

/** Combined 0-centred buff for a domain: its directorate's staffing plus
 *  the engagement buff, each contributing. Range roughly [−1, +2]. */
function domainBuff(org: OrgState | undefined, d: Directorate): number {
  return dirBuff(org, d) + engagementBuff(org?.pay ?? 0);
}

// --- fleet / restoration speed (Network Operations) -------------------
// Wired into fleet.ts via tick.ts: a well-run, engaged control room and
// crews drive and repair faster, so faults clear sooner — lower CML.

/** Van travel+repair speed multiplier. Neutral 1.0; up to ~1.8× at full
 *  ops staffing + peak engagement; down to ~0.7× when run into the ground. */
export function fleetSpeedMul(org: OrgState | undefined): number {
  return clampMul(1 + 0.4 * domainBuff(org, 'operations'), 0.7, 1.9);
}

// --- proactive vegetation management (Asset Management) ---------------
// Wired into faults.growVegetation via tick.ts: an engaged asset team
// trims ahead of the season, so overgrowth creeps slower (fewer tree
// faults). A LOWER growth multiplier is BETTER.

/** Vegetation-growth multiplier. Neutral 1.0; ~0.6× proactive, ~1.3× lean. */
export function vegGrowthMul(org: OrgState | undefined): number {
  return clampMul(1 - 0.3 * domainBuff(org, 'asset'), 0.55, 1.4);
}

// --- application / tender cadence (Connections) -----------------------
// Wired into applications/developers/innovation spawn via tick.ts: a
// staffed, engaged Connections team turns offers around faster, so the
// pipeline of opportunities flows quicker (more arrivals per game-day). A
// HIGHER cadence multiplier means MORE opportunities sooner.

/** Arrival-rate multiplier for applications, tenders and pitches.
 *  Neutral 1.0; up to ~1.6× busy, down to ~0.7× starved. */
export function connectionCadenceMul(org: OrgState | undefined): number {
  return clampMul(1 + 0.4 * domainBuff(org, 'connections'), 0.7, 1.7);
}

// --- satisfaction recovery (Customer Service) -------------------------
// Wired into tick.stepCouncils: a resourced, engaged customer team wins
// trust back faster after an outage and lifts the steady-state mood a
// touch. Returned as a small additive satisfaction-target bonus.

/** Satisfaction target bonus, points. Neutral 0; up to ~+6 well-resourced,
 *  down to ~−4 neglected. */
export function satisfactionBonus(org: OrgState | undefined): number {
  return Math.round(6 * domainBuff(org, 'customer'));
}

// --- innovation benefit (Connections × engagement, via pay) -----------
// Wired into innovation pitch success odds via tick.ts: engaged staff
// deliver innovation projects more reliably (a bigger benefit per pitch).

/** Innovation success-odds multiplier. Neutral 1.0; up to ~1.3×. */
export function innovationSuccessMul(org: OrgState | undefined): number {
  return clampMul(1 + 0.25 * engagementBuff(org?.pay ?? 0), 0.85, 1.35);
}

// --- overload early-warning (Asset Management × engagement) -----------
// A more engaged, better-staffed asset team spots a transformer creeping
// toward its rating earlier. Surfaced as a loading fraction at which an
// early-warning fires (lower = earlier). Read by tick.ts.

/** Loading fraction that triggers an overload early-warning. Neutral
 *  0.92; as low as ~0.80 well-resourced (earlier), ~0.97 neglected. */
export function earlyWarnFrac(org: OrgState | undefined): number {
  return clampMul(0.92 - 0.12 * domainBuff(org, 'asset'), 0.78, 0.98);
}

// --- RIIO composite nudge (Regulation & Finance) ----------------------
// A well-run regulation team writes better submissions: a small composite
// bonus (and the converse for neglect). Read by tick.ts at period close.

/** RIIO composite delta, points. Neutral 0; up to ~+4, down to ~−3. */
export function riioCompositeDelta(org: OrgState | undefined): number {
  return Math.round(4 * (dirBuff(org, 'regulation') + 0.5 * engagementBuff(org?.pay ?? 0)));
}

// --- claims defence odds (Safety & Compliance + Regulation) -----------
// Litigation (litigation.ts) consults this: a funded legal/compliance
// function wins more defended claims. 0.5 neutral; up to ~0.78.

/** Probability of winning a DEFENDED claim, before the claim's own
 *  difficulty. Read by litigation.ts. */
export function legalWinBase(org: OrgState | undefined): number {
  const buff = 0.5 * dirBuff(org, 'safety') + 0.5 * dirBuff(org, 'regulation')
    + 0.3 * engagementBuff(org?.pay ?? 0);
  return clampMul(0.5 + 0.28 * buff, 0.3, 0.8);
}

function clampMul(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ----------------------------------------------------------------------
// Commands (commands.ts delegates here; the stormprep pattern).

import type { CommandResult } from '../commands';

/** Ensure state.org exists (lazily, on first dial touch — keeps fresh
 *  saves byte-identical until the player engages the org). */
function ensureOrg(state: GameState): OrgState {
  if (!state.org) state.org = newOrg();
  return state.org;
}

export function applySetDirectorate(
  state: GameState,
  d: Directorate,
  level: number,
): CommandResult {
  if (!DIRECTORATES.includes(d)) return { ok: false, error: 'no such directorate' };
  if (!Number.isInteger(level) || level < DIR_MIN || level > DIR_MAX) {
    return { ok: false, error: `staffing is ${DIR_MIN}–${DIR_MAX}` };
  }
  ensureOrg(state).dirs[d] = level;
  return { ok: true };
}

export function applySetPay(state: GameState, level: number): CommandResult {
  if (!Number.isInteger(level) || level < PAY_MIN || level > PAY_MAX) {
    return { ok: false, error: `pay & benefits is ${PAY_MIN}–${PAY_MAX}` };
  }
  ensureOrg(state).pay = level;
  return { ok: true };
}

export function applySetSafetyProgramme(state: GameState, level: number): CommandResult {
  if (!Number.isInteger(level) || level < PAY_MIN || level > PAY_MAX) {
    return { ok: false, error: `the safety programme is ${PAY_MIN}–${PAY_MAX}` };
  }
  ensureOrg(state).safety = level;
  return { ok: true };
}

// ----------------------------------------------------------------------
// Snapshot view for the Directorates panel + KPI rows.

export interface OrgView {
  dirs: Record<Directorate, number>;
  pay: number;
  safety: number;
  costYrK: number;
  /** Employee engagement (pay), 0..100. */
  engagement: number;
  /** Safety culture / engagement (safety dial), 0..100 — see safety.ts. */
  safetyEngagement: number;
}

/** Build the snapshot OrgView (the Directorates panel reads this). The
 *  safety-engagement value comes from reliability/safety.ts (imported
 *  lazily by the worker to avoid a sim cycle); pass it in. */
export function orgView(org: OrgState | undefined, safetyEngagement: number): OrgView {
  const dirs = {} as Record<Directorate, number>;
  for (const d of DIRECTORATES) dirs[d] = dirLevel(org, d);
  return {
    dirs,
    pay: org?.pay ?? PAY_MIN,
    safety: org?.safety ?? PAY_MIN,
    costYrK: orgYrK(org),
    engagement: engagementScore(org?.pay ?? 0),
    safetyEngagement,
  };
}

// VAN_OPEX_K_YR is imported to keep the cost calibration legible alongside
// the fleet rate it sits beside in the bill; referenced in tests.
export const _PAY_VS_VAN = PAY_STEP_K / VAN_OPEX_K_YR;
