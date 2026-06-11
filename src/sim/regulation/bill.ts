// The bill is the budget. Capital is unlimited, but every pound of capex
// (annuitized over asset life), opex, fleet, vegetation management and
// wholesale energy cost is recovered from connected customers — the
// always-visible number the player is implicitly minimizing against
// reliability.

import {
  ANNUITY_FACTOR,
  DEPOT,
  GENS,
  LINES,
  SUBS,
  VAN_OPEX_K_YR,
  VEG_POLICY,
  type VegPolicy,
} from '../catalog';
import type { PlacedAsset } from '../assets';

export function assetCapexK(a: PlacedAsset): number {
  if (a.kind === 'line') return a.capexK;
  if (a.kind === 'gen') return GENS[a.gen].capexK;
  if (a.kind === 'depot') return DEPOT.capexK;
  return SUBS[a.sub].capexK;
}

export function assetOpexFrac(a: PlacedAsset): number {
  if (a.kind === 'line') return LINES[a.level].opexFrac;
  if (a.kind === 'gen') return GENS[a.gen].opexFrac;
  if (a.kind === 'depot') return DEPOT.opexFrac;
  return SUBS[a.sub].opexFrac;
}

export interface BillBreakdown {
  /** Annuitized network+generation capex, £k/yr. */
  capexYrK: number;
  /** Fixed O&M, £k/yr. */
  opexYrK: number;
  /** Field fleet (crewed vans), £k/yr. */
  fleetYrK: number;
  /** Vegetation management programme, £k/yr. */
  vegYrK: number;
  /** Smoothed wholesale energy cost, £k/yr. */
  energyYrK: number;
  totalYrK: number;
  servedCustomers: number;
  totalCustomers: number;
  /** Average annual household bill, £/yr (0 when nobody is served yet). */
  perCustomerYr: number;
}

export function computeBill(
  assets: Iterable<PlacedAsset>,
  energyYrK: number,
  servedCustomers: number,
  totalCustomers: number,
  fleetSize: number,
  vegPolicy: VegPolicy,
): BillBreakdown {
  let capexYrK = 0;
  let opexYrK = 0;
  let overheadKm = 0;
  for (const a of assets) {
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
    if (a.kind === 'line' && a.build === 'overhead') overheadKm += a.lengthTiles;
  }
  const fleetYrK = fleetSize * VAN_OPEX_K_YR;
  const vegYrK = (VEG_POLICY[vegPolicy]?.costPerKmYrK ?? 0) * overheadKm;
  const totalYrK = capexYrK + opexYrK + fleetYrK + vegYrK + energyYrK;
  const perCustomerYr = servedCustomers > 0 ? (totalYrK * 1000) / servedCustomers : 0;
  return {
    capexYrK,
    opexYrK,
    fleetYrK,
    vegYrK,
    energyYrK,
    totalYrK,
    servedCustomers,
    totalCustomers,
    perCustomerYr,
  };
}
