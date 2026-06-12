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

// Household calibration: the licence area's ~240k domestic customers
// are NOT the whole revenue base, the way the raw pots would imply.
// Modelled the GB way: domestic users carry about a third of network
// revenues (industry and commerce pay the rest), roughly 40% of the
// energy volume — and retail energy lands at ~3x wholesale once policy
// costs, balancing, metering and the supplier's slice pile on. A
// reasonable mature network prices out near £100/yr of DUoS and around
// £3k/yr all-in for an electrified (EV + heat pump) home.
export const DOMESTIC_NETWORK_SHARE = 0.32;
export const DOMESTIC_ENERGY_SHARE = 0.4;
export const RETAIL_UPLIFT = 3.0;
/** Supplier standing charge, £/household/yr. */
export const SUPPLY_FIXED_YR = 150;

export interface BillInputs {
  assets: Iterable<PlacedAsset>;
  energyYrK: number;
  /** Rolling PPA top-ups above wholesale on delivered energy, £k/yr. */
  ppaYrK: number;
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
  /** PPA/CfD top-ups above wholesale on DELIVERED energy, £k/yr — a keen
   *  strike is a real saving, and idle plant bills nothing. */
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
  /** Average annual household bill, £/yr: the domestic share of each pot
   *  (network at DOMESTIC_NETWORK_SHARE, energy at DOMESTIC_ENERGY_SHARE
   *  × RETAIL_UPLIFT) spread across every customer in the licence area,
   *  plus the supplier standing charge. */
  perCustomerYr: number;
  /** The DUoS slice of the household bill, £/yr — the number the owner
   *  tunes the network against (~£100 for a reasonable service). */
  perCustomerDuosYr: number;
}

export function computeBill(inp: BillInputs): BillBreakdown {
  let capexYrK = 0;
  let opexYrK = 0;
  let genYrK = 0;
  let overheadKm = 0;
  for (const a of inp.assets) {
    // generation is private spend: developers recover it through their
    // PPA strike on delivered energy (inp.ppaYrK), never through DUoS
    if (a.kind === 'gen') continue;
    if (a.kind === 'sub' && a.idno) continue; // the iDNO's iron, not yours
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
    if (a.kind === 'line' && a.build === 'overhead') overheadKm += a.lengthTiles;
  }
  genYrK = inp.ppaYrK;
  const fleetYrK = inp.fleetSize * VAN_OPEX_K_YR;
  const vegYrK = (VEG_POLICY[inp.vegPolicy]?.costPerKmYrK ?? 0) * overheadKm * inp.vegCostMul;
  const constraintYrK = inp.constraintYrK + inp.penaltyYrK;
  const subtotal =
    capexYrK + opexYrK + fleetYrK + vegYrK + genYrK + inp.energyYrK + inp.flexYrK + constraintYrK;
  const innovationYrK = subtotal * (inp.levyPct / 100);
  const totalYrK = subtotal + innovationYrK;
  const networkPotK =
    capexYrK + opexYrK + fleetYrK + vegYrK + inp.flexYrK + constraintYrK + innovationYrK;
  const energyPotK = inp.energyYrK + genYrK;
  const perCustomerDuosYr =
    inp.totalCustomers > 0
      ? (networkPotK * DOMESTIC_NETWORK_SHARE * 1000) / inp.totalCustomers
      : 0;
  const perCustomerYr =
    inp.totalCustomers > 0
      ? perCustomerDuosYr +
        (energyPotK * DOMESTIC_ENERGY_SHARE * RETAIL_UPLIFT * 1000) / inp.totalCustomers +
        SUPPLY_FIXED_YR
      : 0;
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
    perCustomerDuosYr,
  };
}
