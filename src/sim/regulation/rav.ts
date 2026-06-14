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
//    iron) is ADDED to it when committed. It then DEPRECIATES straight-
//    line over a regulatory asset life. RIIO-ED2 runs an average ~45-year
//    economic asset life across the DNO RAV pool (transmission is longer,
//    secondary plant/IT shorter; 45y is Ofgem's blended figure), so that
//    is REG_ASSET_LIFE_YEARS here. We carry a gross pool (cumulative
//    additions, the depreciation base) and a net pool (gross less
//    accumulated regulatory depreciation = the RAV) — exactly how a pooled
//    straight-line RAV rolls forward.
//
//  • Allowed revenue — the regulated money the operator is ALLOWED to
//    recover this year. Under a RIIO building-block control it is:
//        return on RAV  (RAV × regulated WACC)
//      + regulatory depreciation  (RAV gross / life — the capital you get
//        back as the asset is used up)
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

/** The RAV stock carried on GameState. Gross = cumulative network capex
 *  committed (the depreciation base). Net = gross less accumulated
 *  regulatory depreciation = the RAV proper. accumDepK is tracked so the
 *  net pool can never depreciate below zero and so a save reconciles. */
export interface RavState {
  /** Cumulative NETWORK capex ever committed, £k (depreciation base). */
  grossK: number;
  /** RAV: gross less accumulated regulatory depreciation, £k. */
  netK: number;
  /** Whether the layer has ever engaged (sticky — once the network is up
   *  and running it stays surfaced even if customers later drop). */
  engaged: boolean;
}

export function newRav(): RavState {
  return { grossK: 0, netK: 0, engaged: false };
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

/** Roll the RAV one tick: absorb any newly-committed network capex into
 *  the gross pool and the RAV, then apply straight-line regulatory
 *  depreciation over REG_ASSET_LIFE_YEARS. Deterministic; mutates `rav`.
 *
 *  `registerCapexK` is the live total network capex on the asset register
 *  (networkCapexOnRegisterK). Additions are the amount by which it exceeds
 *  the gross pool — so building adds to RAV, and a DEMOLITION (the register
 *  total falling) is treated as a disposal at net book value (the RAV and
 *  gross pool both step down to the register, never below it). */
export function rollRav(rav: RavState, registerCapexK: number, dtMin: number): void {
  // additions: new network capex committed since last tick
  const additions = Math.max(0, registerCapexK - rav.grossK);
  if (additions > 0) {
    rav.grossK += additions;
    rav.netK += additions; // a fresh asset enters the RAV at full value
  }
  // disposals: the register total fell below the gross pool (an asset was
  // demolished). Retire it from the pool; the RAV follows pro-rata so it
  // can't carry book value for iron that no longer exists.
  if (registerCapexK < rav.grossK) {
    const disposed = rav.grossK - registerCapexK;
    const netFrac = rav.grossK > 0 ? rav.netK / rav.grossK : 0;
    rav.grossK = registerCapexK;
    rav.netK = Math.max(0, rav.netK - disposed * netFrac);
  }
  // straight-line regulatory depreciation of the gross pool, pro-rated to
  // the tick; the RAV never falls below zero
  if (dtMin > 0 && rav.netK > 0) {
    const depK = (rav.grossK / REG_ASSET_LIFE_YEARS) * (dtMin / MIN_PER_YEAR);
    rav.netK = Math.max(0, rav.netK - depK);
  }
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

/** The straight-line regulatory depreciation the operator recovers this
 *  year, £k/yr (gross pool / life). */
export function regDepreciationYrK(rav: RavState): number {
  return rav.grossK / REG_ASSET_LIFE_YEARS;
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
