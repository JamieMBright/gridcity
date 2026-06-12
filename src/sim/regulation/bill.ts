// The bill is the budget. Capital is unlimited, but every pound is
// recovered from customers — through two distinct doors, the way the
// real industry works: network assets (wires, substations, depots,
// fleet, trees) are DNO spend recovered as DUoS/TUoS charges, while
// generation is private expenditure recovered through the energy line
// (its annuitized capex rides on the £/MWh like a PPA strike). The
// total is the always-visible number the player is minimizing against
// reliability.

import {
  ANNUITY_FACTOR,
  DEPOT,
  GENS,
  LINES,
  strikeMWh,
  SUB_UG_MUL,
  subCapexK,
  SUBS,
  VAN_OPEX_K_YR,
  VEG_POLICY,
  type VegPolicy,
} from '../catalog';
import { subMva, type PlacedAsset } from '../assets';

export function assetCapexK(a: PlacedAsset): number {
  if (a.kind === 'line') return a.capexK;
  if (a.kind === 'gen') return GENS[a.gen].capexK;
  if (a.kind === 'depot') return DEPOT.capexK;
  return subCapexK(a.sub, subMva(a)) * (a.underground ? SUB_UG_MUL : 1);
}

export function assetOpexFrac(a: PlacedAsset): number {
  if (a.kind === 'line') return LINES[a.level].opexFrac;
  if (a.kind === 'gen') return GENS[a.gen].opexFrac;
  if (a.kind === 'depot') return DEPOT.opexFrac;
  return SUBS[a.sub].opexFrac;
}

export interface BillInputs {
  assets: Iterable<PlacedAsset>;
  energyYrK: number;
  servedCustomers: number;
  totalCustomers: number;
  fleetSize: number;
  vegPolicy: VegPolicy;
  /** ×0.4 once drone surveys land. */
  vegCostMul: number;
  /** Rolling flexibility-market spend, £k/yr. */
  flexYrK: number;
  /** Rolling constraint compensation to firm connections, £k/yr. */
  constraintYrK: number;
  /** Liquidated damages run-rate for overdue connections, £k/yr. */
  penaltyYrK: number;
  /** Innovation levy, % of the subtotal. */
  levyPct: number;
}

export interface BillBreakdown {
  /** Annuitized NETWORK capex (DUoS/TUoS), £k/yr — wires, substations,
   *  depots. Generation is not DNO spend and never appears here. */
  capexYrK: number;
  /** Fixed network O&M, £k/yr. */
  opexYrK: number;
  /** Generation capex+O&M recovered through the energy line (PPA-style),
   *  £k/yr. Customer-owned and iDNO plant excluded. */
  genYrK: number;
  /** Field fleet (crewed vans), £k/yr. */
  fleetYrK: number;
  /** Vegetation management programme, £k/yr. */
  vegYrK: number;
  /** Smoothed wholesale energy cost, £k/yr. */
  energyYrK: number;
  /** Flexibility-market payments, £k/yr. */
  flexYrK: number;
  /** Constraint compensation + late-connection damages, £k/yr. */
  constraintYrK: number;
  /** Innovation levy, £k/yr. */
  innovationYrK: number;
  totalYrK: number;
  servedCustomers: number;
  totalCustomers: number;
  /** Average annual household bill, £/yr. Network costs are socialized
   *  across every customer in the licence area (connected or not), the
   *  way a real DUoS charge spreads — so early building doesn't produce
   *  absurd four-figure bills for the first street on supply. */
  perCustomerYr: number;
}

export function computeBill(inp: BillInputs): BillBreakdown {
  let capexYrK = 0;
  let opexYrK = 0;
  let genYrK = 0;
  let overheadKm = 0;
  for (const a of inp.assets) {
    if (a.kind === 'gen') {
      if (a.customer) continue; // they pay for their own kit
      const capex = assetCapexK(a);
      let yrK = capex * (ANNUITY_FACTOR + assetOpexFrac(a));
      // an awarded PPA bills at its strike: a keen bid is a real saving
      if (a.ppaMWh !== undefined) {
        const base = strikeMWh(a.gen);
        if (base > 0) yrK *= a.ppaMWh / base;
      }
      genYrK += yrK;
      continue;
    }
    if (a.kind === 'sub' && a.idno) continue; // the iDNO's iron, not yours
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
    if (a.kind === 'line' && a.build === 'overhead') overheadKm += a.lengthTiles;
  }
  const fleetYrK = inp.fleetSize * VAN_OPEX_K_YR;
  const vegYrK = (VEG_POLICY[inp.vegPolicy]?.costPerKmYrK ?? 0) * overheadKm * inp.vegCostMul;
  const constraintYrK = inp.constraintYrK + inp.penaltyYrK;
  const subtotal =
    capexYrK + opexYrK + fleetYrK + vegYrK + genYrK + inp.energyYrK + inp.flexYrK + constraintYrK;
  const innovationYrK = subtotal * (inp.levyPct / 100);
  const totalYrK = subtotal + innovationYrK;
  const perCustomerYr = inp.totalCustomers > 0 ? (totalYrK * 1000) / inp.totalCustomers : 0;
  return {
    capexYrK,
    opexYrK,
    genYrK,
    fleetYrK,
    vegYrK,
    energyYrK: inp.energyYrK,
    flexYrK: inp.flexYrK,
    constraintYrK,
    innovationYrK,
    totalYrK,
    servedCustomers: inp.servedCustomers,
    totalCustomers: inp.totalCustomers,
    perCustomerYr,
  };
}
