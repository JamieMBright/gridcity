// ROADMAP #54 — Get sued: litigation.
//
// Consequence with a paper trail. Reliability failures, blighted
// residents, missed connection dates and H&S incidents end, in the real
// world, in CLAIMS. Litigation turns those into narrative and a
// second-order cost on the bill.
//
// GB grounding (research-backed):
//  • WAYLEAVE / NUISANCE — a wayleave is a terminable right to run lines
//    over land; residents under a pylon-blighted corridor claim property
//    blight / nuisance. Usually SETTLED to avoid precedent.
//  • PERSONAL INJURY — after an H&S incident (an LTI from safety.ts), the
//    injured worker claims. Often follows an HSE finding; mostly settled.
//  • LIQUIDATED DAMAGES — contractual fixed daily penalties for missed
//    firm-connection dates (developers). An UNRESOLVED overdue connection
//    escalates into a damages SUIT.
//  • GROUP CLAIMS — a Group Litigation Order after a long mass outage
//    (many customers off for many hours). Reputationally toxic; settles
//    once liability looks clear.
//
// Each claim arrives in the inbox with three responses:
//   • SETTLE  — pay now, fast, a small satisfaction/reputation hit.
//   • FIGHT   — spend on legal defence, then a seeded-RNG uncertain
//               outcome (win = costs only; lose = a multiple of settling).
//               Safety & Compliance / Regulation funding shifts the odds
//               (directorates.legalWinBase).
//   • REMEDIATE — fix the underlying cause for a discount (cheaper than
//               settling, and it addresses the grievance).
//
// Determinism: claims are rolled off the seeded sim RNG; a fought claim's
// outcome is decided by ONE rng.chance() at response time against the
// funding-weighted win probability — same seed, same org ⇒ same result.
// Costs ride a "claims & settlements" rolling rate on the bill (the
// stormPrepYrK pattern: rides penaltyYrK, decays over a game-year). All
// state is additive on GameState; old saves hydrate clean.

import { Rng } from '../rng';
import { pushEvent, type GameState } from '../state';
import { legalWinBase } from './directorates';
import type { CommandResult } from '../commands';
import type { LtiCause } from '../reliability/safety';

export type ClaimKind = 'wayleave' | 'injury' | 'damages' | 'group';

export interface Claim {
  id: number;
  kind: ClaimKind;
  /** Game-minute the claim was lodged. */
  openedMin: number;
  /** Headline for the inbox. */
  title: string;
  /** One-line context. */
  blurb: string;
  /** Settlement cost if paid now, £k. */
  settleK: number;
  /** Legal spend to FIGHT, £k (lost regardless of outcome). */
  fightK: number;
  /** Multiplier on settleK if a fought claim is LOST (in addition to
   *  fightK). A lost fight is dearer than settling. */
  loseMul: number;
  /** Win probability adjustment for THIS claim's strength (−ve = weaker
   *  case for the operator, harder to defend). Added to the org's
   *  legalWinBase, clamped. */
  strength: number;
  /** Cost to REMEDIATE the cause, £k (a discount on settling). */
  remediateK: number;
  /** Map coords to jump to (a blighted council / an overdue site). */
  x?: number;
  y?: number;
  /** Satisfaction reputation hit on settle/lose (council-wide composite). */
  reputationHit: number;
  status: 'open' | 'settled' | 'won' | 'lost' | 'remediated';
}

// ----------------------------------------------------------------------
// Spawn parameters (calibrated to land occasionally, never spammy).

/** Mean game-days between blight/nuisance claim rolls when a council is
 *  badly pylon-blighted. */
export const WAYLEAVE_MEAN_DAYS = 220;
/** Blight (tick.derive's per-council weight) above which residents lodge
 *  wayleave/nuisance claims. */
export const WAYLEAVE_BLIGHT_THRESHOLD = 14;
/** A firm connection overdue by this many days escalates to a damages
 *  suit (beyond the running liquidated-damages drip already on the bill).*/
export const DAMAGES_ESCALATE_DAYS = 45;
/** A mass outage this large (customer-minutes lost in one window) seeds a
 *  group claim. */
export const GROUP_OUTAGE_CUSTMIN = 1_500_000;

// ----------------------------------------------------------------------
// Bill integration (the stormPrepYrK pattern).

const CLAIMS_TAU_MIN = 525_600;

function chargeClaims(state: GameState, costK: number): void {
  state.claimsYrK = (state.claimsYrK ?? 0) + costK;
}

/** Rolling annualized claims/settlements spend, £k/yr. Decays by dtMin;
 *  rides computeBill's penaltyYrK via tick.ts beside stormPrepYrK. */
export function claimsYrK(state: GameState, dtMin: number): number {
  const cur = state.claimsYrK ?? 0;
  if (dtMin > 0 && cur > 0) {
    const next = cur * (1 - dtMin / (dtMin + CLAIMS_TAU_MIN));
    state.claimsYrK = next < 0.001 ? undefined : next;
  }
  return state.claimsYrK ?? 0;
}

// ----------------------------------------------------------------------
// Claim creation helpers.

function newClaim(state: GameState, c: Omit<Claim, 'id' | 'status' | 'openedMin'>): Claim {
  const claim: Claim = {
    ...c,
    id: state.nextAppId++,
    openedMin: state.simTimeMin,
    status: 'open',
  };
  (state.claims ??= []).push(claim);
  return claim;
}

/** Seed an INJURY claim from an LTI (called by tick.ts after safety.ts
 *  rolls one). The cause colours the blurb and the case strength. */
export function seedInjuryClaim(state: GameState, cause: LtiCause): void {
  // electrocution / fall cases are the hardest to defend (clear breach);
  // slip/road are more contestable
  const hard = cause === 'electrocution' || cause === 'fall';
  newClaim(state, {
    kind: 'injury',
    title: 'Personal injury claim',
    blurb: `an injured colleague has lodged a claim following the ${cause === 'electrocution' ? 'electric shock' : cause} incident`,
    settleK: hard ? 320 : 180,
    fightK: hard ? 140 : 90,
    loseMul: 2.4,
    strength: hard ? -0.25 : -0.05,
    remediateK: hard ? 260 : 150,
    reputationHit: 2,
  });
  pushEvent(state, 'warn', 'a personal-injury claim has arrived in the inbox');
}

// ----------------------------------------------------------------------
// The tick hook: roll new claims off live grievances.

/** Roll this tick's new claims. Called once per accumulating solveTick
 *  (dtMin > 0), AFTER blight is derived. `blight` is tick.derive's
 *  per-council blight map; `councilCoord` resolves a council to a map
 *  tile for jump-to. RNG draws are deterministic per seed. */
export function stepLitigation(
  state: GameState,
  rng: Rng,
  dtMin: number,
  blight: Map<number, number>,
  councilCoord: (councilId: number) => { x: number; y: number } | undefined,
): void {
  // (1) wayleave / nuisance from sustained pylon blight
  let worstCouncil = -1;
  let worstBlight = 0;
  for (const [cid, b] of blight) {
    if (b > worstBlight) {
      worstBlight = b;
      worstCouncil = cid;
    }
  }
  if (
    worstBlight >= WAYLEAVE_BLIGHT_THRESHOLD &&
    !hasOpenClaim(state, 'wayleave') &&
    rng.chance(dtMin / (WAYLEAVE_MEAN_DAYS * 1440))
  ) {
    const coord = councilCoord(worstCouncil);
    // a blight claim's cost scales with how bad the corridor is
    const sev = Math.min(3, worstBlight / WAYLEAVE_BLIGHT_THRESHOLD);
    newClaim(state, {
      kind: 'wayleave',
      title: 'Wayleave & blight claim',
      blurb: 'residents beneath an overhead corridor claim their homes are blighted',
      settleK: Math.round(120 * sev),
      fightK: Math.round(60 * sev),
      loseMul: 1.8,
      strength: 0.1, // blight/EMF causation is genuinely contestable
      remediateK: Math.round(200 * sev), // amenity undergrounding is dear but cures it
      reputationHit: 3,
      ...(coord ?? {}),
    });
    pushEvent(
      state,
      'warn',
      'wayleave & blight claim lodged — pylon-blighted residents are taking you to court',
      coord?.x,
      coord?.y,
    );
  }

  // (2) liquidated damages — a firm connection overdue beyond the cap
  // escalates into a suit (once per offending application)
  for (const a of state.applications) {
    if ((a.status !== 'firm' && a.status !== 'flex') || a.connectByMin === undefined) continue;
    if (a.claimed) continue; // already escalated
    const overdueDays = (state.simTimeMin - a.connectByMin) / 1440;
    if (overdueDays >= DAMAGES_ESCALATE_DAYS) {
      a.claimed = true;
      const k = Math.round(80 + 6 * (overdueDays - DAMAGES_ESCALATE_DAYS));
      newClaim(state, {
        kind: 'damages',
        title: 'Liquidated damages claim',
        blurb: `${a.name} sues for damages — the firm connection is ${Math.round(overdueDays)} days late`,
        settleK: k,
        fightK: Math.round(k * 0.4),
        loseMul: 1.6,
        strength: -0.3, // a missed contractual date is a weak defence
        remediateK: 0, // remediation = actually connecting them (no extra £)
        reputationHit: 1,
        x: a.x,
        y: a.y,
      });
      pushEvent(state, 'bad', `${a.name} has issued a liquidated-damages claim`, a.x, a.y);
    }
  }
}

/** Seed a GROUP claim after a long mass outage (called by tick.ts when a
 *  big customer-minute loss lands in one window). Deduped: one open group
 *  claim at a time. */
export function maybeSeedGroupClaim(
  state: GameState,
  custMinLost: number,
  x?: number,
  y?: number,
): boolean {
  if (custMinLost < GROUP_OUTAGE_CUSTMIN) return false;
  if (hasOpenClaim(state, 'group')) return false;
  const sev = Math.min(4, custMinLost / GROUP_OUTAGE_CUSTMIN);
  newClaim(state, {
    kind: 'group',
    title: 'Group litigation order',
    blurb: 'a group action forms after the prolonged mass outage — many customers, one claim',
    settleK: Math.round(400 * sev),
    fightK: Math.round(180 * sev),
    loseMul: 2.2,
    strength: -0.2,
    remediateK: Math.round(300 * sev),
    reputationHit: 5,
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
  });
  pushEvent(state, 'bad', 'a group litigation order is filed over the mass outage', x, y);
  return true;
}

function hasOpenClaim(state: GameState, kind: ClaimKind): boolean {
  return (state.claims ?? []).some((c) => c.status === 'open' && c.kind === kind);
}

// ----------------------------------------------------------------------
// Player responses (commands.ts delegates here).

export type ClaimResponse = 'settle' | 'fight' | 'remediate';

/** Apply a player's response to a claim. Deterministic: a fought claim's
 *  outcome is one rng.chance() against the org-weighted, claim-strength-
 *  adjusted win probability, off a private RNG STREAM keyed to the claim
 *  id and the live seed (so it never perturbs the tick's RNG draw count —
 *  inspection/commands stay side-effect-free on the main timeline) yet is
 *  fully reproducible per seed. Costs land on the rolling claims line; the
 *  reputation hit dents every council's satisfaction. */
export function applyClaimResponse(
  state: GameState,
  claimId: number,
  response: ClaimResponse,
): CommandResult {
  const claim = (state.claims ?? []).find((c) => c.id === claimId);
  if (!claim) return { ok: false, error: 'no such claim' };
  if (claim.status !== 'open') return { ok: false, error: 'claim already resolved' };

  if (response === 'settle') {
    chargeClaims(state, claim.settleK);
    claim.status = 'settled';
    dentReputation(state, claim.reputationHit);
    pushEvent(state, 'info', `${claim.title} settled for £${claim.settleK}k`, claim.x, claim.y);
    return { ok: true };
  }

  if (response === 'remediate') {
    chargeClaims(state, claim.remediateK);
    claim.status = 'remediated';
    // remediation addresses the grievance: a smaller reputation hit
    dentReputation(state, Math.round(claim.reputationHit / 2));
    pushEvent(
      state,
      'info',
      claim.remediateK > 0
        ? `${claim.title} remediated at source for £${claim.remediateK}k`
        : `${claim.title} resolved by putting things right`,
      claim.x,
      claim.y,
    );
    return { ok: true };
  }

  // fight: legal spend now, then a seeded coin against the win odds. The
  // draw rides a private stream (seed ⊕ claim id) so the outcome is fixed
  // per seed/claim without consuming the main tick RNG.
  chargeClaims(state, claim.fightK);
  const p = Math.max(0.1, Math.min(0.9, legalWinBase(state.org) + claim.strength));
  const rng = new Rng((state.rngState ^ (claim.id * 0x9e3779b1)) >>> 0);
  const won = rng.chance(p);
  if (won) {
    claim.status = 'won';
    pushEvent(
      state,
      'info',
      `${claim.title} defended successfully — only £${claim.fightK}k in legal costs`,
      claim.x,
      claim.y,
    );
  } else {
    const damagesK = Math.round(claim.settleK * claim.loseMul);
    chargeClaims(state, damagesK);
    claim.status = 'lost';
    dentReputation(state, claim.reputationHit * 2);
    pushEvent(
      state,
      'bad',
      `${claim.title} lost in court — £${damagesK}k in damages plus £${claim.fightK}k costs`,
      claim.x,
      claim.y,
    );
  }
  return { ok: true };
}

/** A resolved claim dents satisfaction across served councils — the
 *  reputational fallout of a court case. Bounded, decays via the normal
 *  satisfaction recovery. */
function dentReputation(state: GameState, hit: number): void {
  if (hit <= 0) return;
  for (const cs of state.councils.values()) {
    if (cs.satisfaction > 0) cs.satisfaction = Math.max(0, cs.satisfaction - hit);
  }
}

// ----------------------------------------------------------------------
// Snapshot view.

/** Open claims for the inbox (settled/won/lost ones drop out). */
export function openClaims(state: GameState): Claim[] {
  return (state.claims ?? []).filter((c) => c.status === 'open');
}
