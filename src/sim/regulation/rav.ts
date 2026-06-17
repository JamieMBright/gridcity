// The price-control money, modelled the GB RIIO-ED way (then simplified
// for legibility). A DNO does not just spend money — it runs a Regulated
// Asset Value (RAV) and earns an ALLOWED REVENUE the regulator lets it
// recover. This file is the pure-helper layer for that; the tick wires it.
//
// The pieces, and the real-RIIO reasoning behind each number:
//
//  • RAV — the depreciated book value of the network the operator has
//    built. It starts at ZERO (the owner's spec: "starts at zero and you
//    build it up as the network grows") and every pound of NETWORK capex
//    (wires, substations, depots — NOT private generation, NOT the iDNO's
//    iron) is ADDED to it when committed. RIIO-ED2 ran a ~45-year economic
//    asset life across the DNO RAV pool; RIIO-3/ED3 confirms the 45-year
//    life and, crucially, a SUM-OF-DIGITS depreciation profile for new
//    additions instead of a flat straight line (docs/riio-ed3-coverage.md
//    §A). That profile is deliberately BACK-LOADED — low depreciation in an
//    asset's early years, rising as it ages — which the SSMD calls a
//    "depreciation holiday": it slows the bill impact of a big capex wave
//    (the recovered-capital revenue PHASES IN rather than jumping to a
//    cliff the moment the iron is committed). So REG_ASSET_LIFE_YEARS = 45
//    and depreciation follows the sum-of-digits curve (ravDepFns below).
//    We track the pool as a set of VINTAGES (each addition keeps its own
//    age + remaining book) so every vintage runs its own holiday-then-ramp,
//    and carry pool totals (gross = depreciation base, net = the RAV) as
//    cheap caches the tick reads.
//
//  • Allowed revenue — the regulated money the operator is ALLOWED to
//    recover this year. Under a RIIO building-block control it is:
//        return on RAV  (RAV × regulated WACC)
//      + regulatory depreciation  (the sum-of-digits capital recovery this
//        year — low for young iron, rising with age; the depreciation
//        holiday lives here)
//      + a fast-money opex allowance  (the efficient cost of running it)
//      + incentive adjustments  (reward/penalty for outputs, below).
//    REG_WACC = 0.0334 (3.34% real, CPIH-real) is the RIIO-ED2 baseline
//    allowed return on a 60:40 notional-gearing CAPM blend (cost of
//    equity ~5.2% real, cost of debt ~2% real). A real (not nominal) WACC
//    is right because the game's £ are constant-price.
//
//  • Totex sharing — the operator's ACTUAL totex (the network capex it
//    annuitises + its network opex) is measured against an ALLOWANCE. The
//    Totex Incentive Mechanism (TIM) SHARES the difference: beat the
//    allowance and you keep a share (a reward into allowed revenue);
//    overspend and you bear a share (a penalty). RIIO-ED2 sharing factors
//    cluster around 50% (DNO-specific, 40–60%), so TOTEX_SHARING = 0.5.
//    This is the lever the owner called out ("influence the sharing
//    factors").
//
//  • Reliability incentive — one legible output incentive (the IIS, the
//    Interruptions Incentive Scheme, simplified): beat the CI/CML targets
//    and earn a reward; miss them and pay a penalty, capped. We keep it to
//    this single reliability lever rather than the full RIIO zoo.
//
// Everything here is PURE and DETERMINISTIC: no wall-clock, no Math.random.
// The tick owns the RAV stock on GameState and calls rollRav each step.

import { ANNUITY_FACTOR } from '../catalog';
import { assetCapexK, assetOpexFrac } from './bill';
import type { PlacedAsset } from '../assets';

/** Regulatory asset life for the RAV pool, years (RIIO-ED2 blended
 *  average across the DNO asset base). */
export const REG_ASSET_LIFE_YEARS = 45;

/** Regulated real WACC on RAV (RIIO-ED2 baseline allowed return, CPIH-
 *  real, 60:40 notional gearing CAPM blend). */
export const REG_WACC = 0.0334;

/** Totex Incentive Mechanism sharing factor — the operator's share of any
 *  under/overspend against allowance (RIIO-ED2 ~50%). The lever. */
export const TOTEX_SHARING = 0.5;

/** Game-minutes per year. */
const MIN_PER_YEAR = 525_600;

/** The RAV/revenue layer only ENGAGES once the network is up and running
 *  (the owner's spec: "maybe it should start once the network is up and
 *  running, and we start influencing"). Until then RAV builds quietly in
 *  the background and no revenue/incentive is surfaced. The gate: past the
 *  rebuild grace, AND a real RAV committed, AND a real served base. */
export const RAV_ENGAGE_GROSS_K = 50_000; // ~£50m of network built
export const RAV_ENGAGE_CUSTOMERS = 5_000; // a town actually powered

/** One RAV VINTAGE — a single tranche of network capex committed at one
 *  moment, carrying its own age so it runs its own sum-of-digits
 *  depreciation holiday-then-ramp. */
export interface RavVintage {
  /** Original capex of this tranche, £k (its depreciation base). */
  grossK: number;
  /** Remaining (undepreciated) book value of this tranche, £k. */
  netK: number;
  /** Age of this tranche, game-minutes since commitment. */
  ageMin: number;
}

/** The RAV stock carried on GameState. The pool is a set of VINTAGES (each
 *  addition keeps its own age + book so it depreciates on the sum-of-digits
 *  curve from its OWN commitment date — that is what phases the recovered-
 *  capital revenue in instead of a cliff). `grossK`/`netK` are pool-total
 *  caches (Σ over vintages) the tick + revenue helpers read cheaply; they
 *  are kept exactly in step by rollRav. */
export interface RavState {
  /** Cumulative NETWORK capex ever committed, £k (depreciation base). */
  grossK: number;
  /** RAV: gross less accumulated regulatory depreciation, £k. */
  netK: number;
  /** Whether the layer has ever engaged (sticky — once the network is up
   *  and running it stays surfaced even if customers later drop). */
  engaged: boolean;
  /** The per-vintage pool (additive; a pre-vintage save self-heals into a
   *  single synthetic vintage — see reconcileVintages). */
  vintages: RavVintage[];
}

export function newRav(): RavState {
  return { grossK: 0, netK: 0, engaged: false, vintages: [] };
}

// --- sum-of-digits depreciation curve ----------------------------------------
//
// A vintage of original value G and regulatory life L (years) depreciates on
// a BACK-LOADED sum-of-digits profile: little early (the "depreciation
// holiday"), more as it ages. In continuous time the canonical sum-of-digits
// (digits 1,2,…,L, cumulative ∝ t²) gives a remaining-book fraction
//
//     f(t) = 1 − (t/L)²           for 0 ≤ t ≤ L,   0 thereafter
//
// so the instantaneous depreciation RATE is G·2t/L² per year — zero at
// commitment, rising to 2G/L (double the straight-line rate) at end of life,
// and integrating to exactly G over the life (full capital recovery). This is
// the documented ED3 profile (docs/riio-ed3-coverage.md §A).

/** Regulatory asset life in game-minutes (REG_ASSET_LIFE_YEARS). */
const LIFE_MIN = REG_ASSET_LIFE_YEARS * MIN_PER_YEAR;

/** Remaining-book fraction of a vintage's ORIGINAL gross at age `ageMin`,
 *  on the sum-of-digits curve: 1−(t/L)², clamped to [0,1]. */
export function ravNetFracAtAge(ageMin: number): number {
  if (ageMin <= 0) return 1;
  if (ageMin >= LIFE_MIN) return 0;
  const x = ageMin / LIFE_MIN;
  return 1 - x * x;
}

/** Instantaneous sum-of-digits depreciation RATE of a vintage, £k/yr, at age
 *  `ageMin`: derivative of G·(1−(t/L)²) ⇒ G·2t/L² per year (zero while young,
 *  rising with age; zero once fully depreciated). */
export function ravDepRateYrK(grossK: number, ageMin: number): number {
  if (grossK <= 0 || ageMin <= 0 || ageMin >= LIFE_MIN) return 0;
  return (grossK * 2 * ageMin) / (LIFE_MIN * MIN_PER_YEAR);
}

/** The £k of capex an asset adds to the RAV when committed. Mirrors the
 *  network-pot inclusion rule in computeBill EXACTLY: private generation
 *  never enters the RAV (the interconnector is the player's own asset, so
 *  it does), and the iDNO's substations are not the operator's iron. */
export function ravCapexK(a: PlacedAsset): number {
  if (a.kind === 'gen') return a.gen === 'interconnector' ? assetCapexK(a) : 0;
  if (a.kind === 'sub' && a.idno) return 0;
  return assetCapexK(a);
}

/** The total NETWORK capex currently on the register, £k — the value the
 *  RAV gross pool should reflect once every committed asset is counted.
 *  (Used to detect newly-committed capex each tick: additions = this minus
 *  what the gross pool has already absorbed.) */
export function networkCapexOnRegisterK(assets: Iterable<PlacedAsset>): number {
  let k = 0;
  for (const a of assets) k += ravCapexK(a);
  return k;
}

/** Recompute the pool-total caches (grossK/netK) from the live vintages. */
function syncPoolTotals(rav: RavState): void {
  let g = 0;
  let n = 0;
  for (const v of rav.vintages) {
    g += v.grossK;
    n += v.netK;
  }
  rav.grossK = g;
  rav.netK = n;
}

/** Bring a save's vintages into existence if it predates them: a pre-vintage
 *  save carries only grossK/netK, so synthesize ONE vintage holding that
 *  book at an age implied by how far it has already depreciated on the
 *  sum-of-digits curve (so it carries on depreciating sensibly rather than
 *  restarting its holiday). Idempotent; a save WITH vintages is left alone. */
export function reconcileVintages(rav: RavState): void {
  if (rav.vintages && rav.vintages.length > 0) {
    syncPoolTotals(rav);
    return;
  }
  rav.vintages = [];
  if (rav.grossK > 0) {
    // infer age from the remaining fraction: f = 1−(t/L)² ⇒ t = L·√(1−f)
    const frac = Math.max(0, Math.min(1, rav.netK / rav.grossK));
    const ageMin = LIFE_MIN * Math.sqrt(1 - frac);
    rav.vintages.push({ grossK: rav.grossK, netK: rav.netK, ageMin });
  }
  syncPoolTotals(rav);
}

/** Roll the RAV one tick: absorb any newly-committed network capex as a fresh
 *  VINTAGE, retire iron pro-rata on a demolition, then age + depreciate every
 *  vintage on its own sum-of-digits curve. Deterministic; mutates `rav`.
 *
 *  `registerCapexK` is the live total network capex on the asset register
 *  (networkCapexOnRegisterK). Additions are the amount by which it exceeds
 *  the gross pool — a new vintage at age 0 (so it begins its depreciation
 *  holiday). A DEMOLITION (the register total falling) is a disposal at net
 *  book value: every vintage's gross + net step down pro-rata, never below
 *  the register total. */
export function rollRav(rav: RavState, registerCapexK: number, dtMin: number): void {
  reconcileVintages(rav); // tolerate a freshly-loaded (pre-vintage) save
  // additions: new network capex committed since last tick → a fresh vintage
  const additions = Math.max(0, registerCapexK - rav.grossK);
  if (additions > 0) {
    rav.vintages.push({ grossK: additions, netK: additions, ageMin: 0 });
  }
  // disposals: the register total fell below the gross pool (an asset was
  // demolished). Retire iron pro-rata across vintages so the RAV can't carry
  // book value — or a depreciation base — for iron that no longer exists.
  if (registerCapexK < rav.grossK && rav.grossK > 0) {
    const keep = registerCapexK / rav.grossK; // fraction of the pool retained
    for (const v of rav.vintages) {
      v.grossK *= keep;
      v.netK *= keep;
    }
  }
  // age + sum-of-digits depreciation: each vintage's remaining book falls
  // from G·f(age) to G·f(age+dt) (back-loaded — slow while young), never
  // below zero. Closed-form on the curve, so many small steps == one big one.
  if (dtMin > 0) {
    for (const v of rav.vintages) {
      const before = v.ageMin;
      v.ageMin = before + dtMin;
      if (v.grossK <= 0) continue;
      const target = v.grossK * ravNetFracAtAge(v.ageMin);
      if (target < v.netK) v.netK = Math.max(0, target);
    }
  }
  // drop fully-spent / retired vintages so the pool can't grow without bound
  if (rav.vintages.length > 0) {
    rav.vintages = rav.vintages.filter((v) => v.grossK > 1e-9 && v.netK > 1e-9);
  }
  syncPoolTotals(rav);
}

/** Is the RAV/revenue layer engaged? Sticky once true. The gate is the
 *  owner's "once the network is up and running" rule. `graceActive`
 *  suppresses engagement during the post-vanishing rebuild grace. */
export function ravEngaged(
  rav: RavState,
  servedCustomers: number,
  graceActive: boolean,
): boolean {
  if (rav.engaged) return true;
  return (
    !graceActive &&
    rav.grossK >= RAV_ENGAGE_GROSS_K &&
    servedCustomers >= RAV_ENGAGE_CUSTOMERS
  );
}

/** The regulatory depreciation the operator recovers this year, £k/yr — the
 *  sum-of-digits run-rate summed over every vintage at its current age (low
 *  while the pool is young — the depreciation holiday — rising as it ages).
 *  A pre-vintage save reconciles to a single synthetic vintage first. */
export function regDepreciationYrK(rav: RavState): number {
  if (!rav.vintages || rav.vintages.length === 0) {
    // pre-vintage / never-rolled: fall back to the curve at the inferred age
    if (rav.grossK <= 0) return 0;
    const frac = Math.max(0, Math.min(1, rav.netK / rav.grossK));
    const ageMin = LIFE_MIN * Math.sqrt(1 - frac);
    return ravDepRateYrK(rav.grossK, ageMin);
  }
  let yrK = 0;
  for (const v of rav.vintages) yrK += ravDepRateYrK(v.grossK, v.ageMin);
  return yrK;
}

/** Return on RAV, £k/yr (RAV × regulated WACC). */
export function returnOnRavYrK(rav: RavState): number {
  return rav.netK * REG_WACC;
}

export interface RevenueInputs {
  rav: RavState;
  /** The operator's ACTUAL network totex run-rate, £k/yr: annuitised
   *  network capex + network opex (the wires/subs/depot lines of the
   *  bill). Measured against the allowance for sharing. */
  actualTotexYrK: number;
  /** Fast-money opex allowance, £k/yr — the efficient cost of running the
   *  network the regulator funds. Modelled as the operator's own network
   *  opex (a benchmark efficient operator spends what this one does on
   *  O&M), so the opex allowance is neutral by construction and the
   *  sharing lever bites on the CAPEX efficiency the player controls. */
  opexAllowanceYrK: number;
  /** Reliability incentive this year, £k/yr (signed: + reward, − penalty);
   *  computed by reliabilityIncentiveYrK. */
  incentiveYrK: number;
  /** Totex allowance, £k/yr — what an efficient operator would spend to
   *  build+run this network. The TIM shares actual vs this. */
  totexAllowanceYrK: number;
}

export interface AllowedRevenue {
  /** Return on RAV, £k/yr. */
  returnYrK: number;
  /** Regulatory depreciation recovered, £k/yr. */
  depreciationYrK: number;
  /** Fast-money opex allowance, £k/yr. */
  opexAllowanceYrK: number;
  /** Totex over/under-spend SHARED to the operator, £k/yr (signed:
   *  + reward for beating allowance, − penalty for overspend). */
  sharingYrK: number;
  /** Output (reliability) incentive, £k/yr (signed). */
  incentiveYrK: number;
  /** Total allowed revenue, £k/yr. */
  totalYrK: number;
  /** The operator's actual network totex run-rate, £k/yr (for the UI). */
  actualTotexYrK: number;
  /** The totex allowance the sharing is measured against, £k/yr. */
  totexAllowanceYrK: number;
}

/** Build the allowed-revenue building blocks. Pure. */
export function allowedRevenue(inp: RevenueInputs): AllowedRevenue {
  const returnYrK = returnOnRavYrK(inp.rav);
  const depreciationYrK = regDepreciationYrK(inp.rav);
  // TIM: the operator keeps/bears its share of the gap to allowance. Under
  // is a reward (+), over is a penalty (−).
  const sharingYrK = (inp.totexAllowanceYrK - inp.actualTotexYrK) * TOTEX_SHARING;
  const totalYrK =
    returnYrK +
    depreciationYrK +
    inp.opexAllowanceYrK +
    sharingYrK +
    inp.incentiveYrK;
  return {
    returnYrK,
    depreciationYrK,
    opexAllowanceYrK: inp.opexAllowanceYrK,
    sharingYrK,
    incentiveYrK: inp.incentiveYrK,
    totalYrK,
    actualTotexYrK: inp.actualTotexYrK,
    totexAllowanceYrK: inp.totexAllowanceYrK,
  };
}

/** The reliability (IIS) incentive, £k/yr, signed: beating the CI AND CML
 *  targets earns a reward; missing them pays a penalty. Simplified to a
 *  £-per-unit-of-deviation, weighted by the served base, and capped so it
 *  stays legible (it is one lever, not a fortune).
 *
 *  ciActual/cmlActual are the running RIIO actuals (per-100/yr, min/yr);
 *  ciTarget/cmlTarget the period targets. servedCustomers scales the prize
 *  to the size of the network being run. */
export function reliabilityIncentiveYrK(
  ciActual: number,
  ciTarget: number,
  cmlActual: number,
  cmlTarget: number,
  servedCustomers: number,
): number {
  // fraction better-than-target for each (lower is better), clamped so one
  // wild actual can't dominate
  const ciFrac = ciTarget > 0 ? (ciTarget - ciActual) / ciTarget : 0;
  const cmlFrac = cmlTarget > 0 ? (cmlTarget - cmlActual) / cmlTarget : 0;
  const perf = Math.max(-1, Math.min(1, (ciFrac + cmlFrac) / 2));
  // £ per customer per year at full (±100%) performance — a few £ on the
  // bill, the legible scale of the real IIS
  const PER_CUSTOMER_FULL_K = 0.006; // £6/customer/yr at the rails, in £k
  return perf * PER_CUSTOMER_FULL_K * servedCustomers;
}

/** The operator's actual NETWORK totex run-rate, £k/yr: annuitised network
 *  capex + network opex — the same inclusion rule as the bill's network
 *  pot (private generation excluded, iDNO iron excluded). This is what the
 *  TIM measures against allowance. Pure; reads the live register. */
export function actualNetworkTotexYrK(assets: Iterable<PlacedAsset>): {
  capexYrK: number;
  opexYrK: number;
} {
  let capexYrK = 0;
  let opexYrK = 0;
  for (const a of assets) {
    if (a.kind === 'gen' && a.gen !== 'interconnector') continue;
    if (a.kind === 'sub' && a.idno) continue;
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
  }
  return { capexYrK, opexYrK };
}
