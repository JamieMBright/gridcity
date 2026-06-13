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
import {
  LONDON_ECONOMY,
  LONDON_GENERATION,
  type EconomyProfile,
  type GenerationModel,
} from '../powerProfile';

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
//
// These GB defaults now live on the per-scenario EconomyProfile
// (powerProfile.ts → LONDON_ECONOMY); the named exports below are kept
// (re-exported from the London profile) so existing importers and tests
// are unchanged. computeBill reads the active profile, defaulting to
// London, so omitting it is bit-identical.
export const DOMESTIC_NETWORK_SHARE = LONDON_ECONOMY.domesticNetworkShare;
export const DOMESTIC_ENERGY_SHARE = LONDON_ECONOMY.domesticEnergyShare;
export const RETAIL_UPLIFT = LONDON_ECONOMY.retailUplift;
/** Supplier standing charge, £/household/yr. */
export const SUPPLY_FIXED_YR = LONDON_ECONOMY.supplyFixedYr;

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
  /** Rolling network I²R losses priced at the running marginal price,
   *  £k/yr — DNO spend (a real DNO buys its losses), so it lands in the
   *  network pot the household DUoS share is cut from. */
  lossYrK: number;
  /** Liquidated damages run-rate for overdue connections, £k/yr. */
  penaltyYrK: number;
  /** Innovation levy, % of the subtotal. */
  levyPct: number;
  /** Active economy profile (currency + bill shares). Optional; defaults
   *  to GB's LONDON_ECONOMY so omitting it is bit-identical. */
  economy?: EconomyProfile;
  /** Generation-ownership model. Optional; defaults to GB's liberalised
   *  'tender' market (gen recovers via PPA on the energy line). The
   *  'owned' branch (vertically-integrated cities) puts gen capex in the
   *  NETWORK pot directly — wired but dormant for London. */
  generation?: GenerationModel;
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
  /** Network I²R losses bought at the running marginal price, £k/yr.
   *  Resistance never changes after build — re-conductoring raises
   *  ratings, not r — so only shorter or lower-r routes cut this line. */
  lossYrK: number;
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
  const economy = inp.economy ?? LONDON_ECONOMY;
  const generation = inp.generation ?? LONDON_GENERATION;
  // The generation-ownership fork. In a LIBERALISED market ('tender',
  // London's default) generation is private spend: developers recover it
  // through their PPA strike on delivered energy (inp.ppaYrK), never
  // through DUoS. In a VERTICALLY INTEGRATED city ('owned': HK, Shanghai,
  // Cairo, Dubai) there is no developer and no PPA — the operator built
  // the plant, so its annuitized capex/opex lands in the NETWORK pot with
  // the wires, and there is no energy-line top-up. The interconnector is
  // ALWAYS the player's own asset (no developer, no PPA): its converter
  // hall annuitizes onto the network pot whichever model is active.
  const owned = generation.ownership === 'owned';
  let capexYrK = 0;
  let opexYrK = 0;
  let genYrK = 0;
  let overheadKm = 0;
  for (const a of inp.assets) {
    if (a.kind === 'gen' && a.gen !== 'interconnector' && !owned) continue;
    if (a.kind === 'sub' && a.idno) continue; // the iDNO's iron, not yours
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
    if (a.kind === 'line' && a.build === 'overhead') overheadKm += a.lengthTiles;
  }
  // owned-generation cities have no PPA top-up (gen capex is already in
  // the network pot above); liberalised markets carry the PPA strike here
  genYrK = owned ? 0 : inp.ppaYrK;
  const fleetYrK = inp.fleetSize * VAN_OPEX_K_YR;
  const vegYrK = (VEG_POLICY[inp.vegPolicy]?.costPerKmYrK ?? 0) * overheadKm * inp.vegCostMul;
  const constraintYrK = inp.constraintYrK + inp.penaltyYrK;
  const subtotal =
    capexYrK +
    opexYrK +
    fleetYrK +
    vegYrK +
    genYrK +
    inp.energyYrK +
    inp.flexYrK +
    constraintYrK +
    inp.lossYrK;
  const innovationYrK = subtotal * (inp.levyPct / 100);
  const totalYrK = subtotal + innovationYrK;
  const networkPotK =
    capexYrK + opexYrK + fleetYrK + vegYrK + inp.flexYrK + constraintYrK + inp.lossYrK + innovationYrK;
  const energyPotK = inp.energyYrK + genYrK;
  const perCustomerDuosYr =
    inp.totalCustomers > 0
      ? (networkPotK * economy.domesticNetworkShare * 1000) / inp.totalCustomers
      : 0;
  const perCustomerYr =
    inp.totalCustomers > 0
      ? perCustomerDuosYr +
        (energyPotK * economy.domesticEnergyShare * economy.retailUplift * 1000) /
          inp.totalCustomers +
        economy.supplyFixedYr
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
    lossYrK: inp.lossYrK,
    innovationYrK,
    totalYrK,
    servedCustomers: inp.servedCustomers,
    totalCustomers: inp.totalCustomers,
    perCustomerYr,
    perCustomerDuosYr,
  };
}
