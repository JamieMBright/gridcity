// The bill is the budget. Capital is unlimited, but every pound of capex
// (annuitized over asset life), opex and wholesale energy cost is recovered
// from connected customers — the always-visible number the player is
// implicitly minimizing against reliability.

import { ANNUITY_FACTOR, GENS, LINES, SUBS } from '../catalog';
import type { PlacedAsset } from '../assets';

export function assetCapexK(a: PlacedAsset): number {
  if (a.kind === 'line') return a.capexK;
  if (a.kind === 'gen') return GENS[a.gen].capexK;
  return SUBS[a.sub].capexK;
}

export function assetOpexFrac(a: PlacedAsset): number {
  if (a.kind === 'line') return LINES[a.level].opexFrac;
  if (a.kind === 'gen') return GENS[a.gen].opexFrac;
  return SUBS[a.sub].opexFrac;
}

export interface BillBreakdown {
  /** Annuitized network+generation capex, £k/yr. */
  capexYrK: number;
  /** Fixed O&M, £k/yr. */
  opexYrK: number;
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
): BillBreakdown {
  let capexYrK = 0;
  let opexYrK = 0;
  for (const a of assets) {
    const capex = assetCapexK(a);
    capexYrK += capex * ANNUITY_FACTOR;
    opexYrK += capex * assetOpexFrac(a);
  }
  const totalYrK = capexYrK + opexYrK + energyYrK;
  const perCustomerYr = servedCustomers > 0 ? (totalYrK * 1000) / servedCustomers : 0;
  return { capexYrK, opexYrK, energyYrK, totalYrK, servedCustomers, totalCustomers, perCustomerYr };
}
