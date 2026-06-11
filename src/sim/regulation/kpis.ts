// Reliability KPIs, computed the way GB DNOs report them:
//   CI  — customer interruptions per 100 connected customers per year
//   CML — customer minutes lost per connected customer per year
// Unenergized areas the player hasn't reached yet don't count against
// either; only customers who HAD supply and lost it do.

import type { CityMap } from '../map/types';
import { COV } from '../coverage';

export interface ReliabilityTotals {
  /** Total customer interruptions (customer-events). */
  ciCustomers: number;
  /** Total customer-minutes lost. */
  cmlCustomerMin: number;
}

/** Update totals from this tick's coverage. `offTiles` is the persistent
 *  set of tiles currently dark; transitions into it count as
 *  interruptions, time spent in it accrues CML. */
export function updateReliability(
  totals: ReliabilityTotals,
  offTiles: Set<number>,
  coverage: Uint8Array,
  map: CityMap,
  dtMin: number,
): void {
  for (let i = 0; i < coverage.length; i++) {
    const dark = coverage[i] === COV.off;
    if (dark) {
      const customers = map.customers[i] ?? 0;
      if (!offTiles.has(i)) {
        offTiles.add(i);
        totals.ciCustomers += customers;
      }
      totals.cmlCustomerMin += customers * dtMin;
    } else if (offTiles.has(i)) {
      offTiles.delete(i);
    }
  }
}

export interface KpiRates {
  /** Interruptions per 100 connected customers per year. */
  ciPer100PerYr: number;
  /** Minutes lost per connected customer per year. */
  cmlMinPerYr: number;
}

const MIN_PER_YEAR = 525_600;

export function kpiRates(
  totals: ReliabilityTotals,
  connectedCustomers: number,
  simTimeMin: number,
): KpiRates {
  const years = Math.max(simTimeMin / MIN_PER_YEAR, 1 / 365); // floor: one game-day
  const denom = Math.max(connectedCustomers, 1) * years;
  return {
    ciPer100PerYr: (totals.ciCustomers / denom) * 100,
    cmlMinPerYr: totals.cmlCustomerMin / denom,
  };
}
