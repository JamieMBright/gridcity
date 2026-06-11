// Stochastic faults. Overhead lines fail with weather and vegetation;
// underground cables shrug off storms but take far longer to dig up and
// repair. Transformers fail rarely. All rolls come off the seeded RNG so
// saves replay identically.

import { lineBranchId, txBranchId, type PlacedAsset } from '../assets';
import { SUBS } from '../catalog';
import type { Rng } from '../rng';

const MIN_PER_YEAR = 525_600;

/** Base fault rates, events per km-year (lines) / per unit-year (tx). */
const OH_BASE = 0.1;
const UG_BASE = 0.012;
const TX_BASE = 0.03;

/** Repair time once a crew is on site, game-minutes. */
export const REPAIR_TIME: Record<string, number> = {
  overheadLine: 240,
  undergroundLine: 960,
  transformer: 480,
};

export function stormFactor(wind: number): number {
  if (wind > 0.85) return 18;
  if (wind > 0.7) return 4;
  return 1;
}

export function isStorm(wind: number): boolean {
  return wind > 0.85;
}

export interface FaultEvent {
  branchId: number;
  assetId: number;
  /** Repair-job site (tile coords). */
  x: number;
  y: number;
  repairMin: number;
  label: string;
}

/** Roll for new faults this tick. `lineVeg` is per-line overgrowth 0..1. */
export function rollFaults(
  assets: Iterable<PlacedAsset>,
  byId: Map<number, PlacedAsset>,
  outBranches: ReadonlySet<number>,
  lineVeg: Map<number, number>,
  wind: number,
  rng: Rng,
  dtMin: number,
): FaultEvent[] {
  const faults: FaultEvent[] = [];
  const storm = stormFactor(wind);

  for (const a of assets) {
    if (a.kind === 'line') {
      const branchId = lineBranchId(a.id);
      if (outBranches.has(branchId)) continue;
      const lenKm = Math.max(1, a.lengthTiles);
      const overhead = a.build === 'overhead';
      const veg = lineVeg.get(a.id) ?? 0;
      const ratePerYr = overhead
        ? OH_BASE * lenKm * storm * (1 + 5 * veg)
        : UG_BASE * lenKm;
      if (!rng.chance((ratePerYr * dtMin) / MIN_PER_YEAR)) continue;
      const endA = byId.get(a.a);
      const endB = byId.get(a.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
      const t = 0.25 + rng.next() * 0.5; // somewhere along the route
      faults.push({
        branchId,
        assetId: a.id,
        x: Math.round(endA.x + (endB.x - endA.x) * t),
        y: Math.round(endA.y + (endB.y - endA.y) * t),
        repairMin: overhead ? (REPAIR_TIME.overheadLine ?? 240) : (REPAIR_TIME.undergroundLine ?? 960),
        label: overhead
          ? veg > 0.5 && storm === 1
            ? `tree contact on the ${a.level} kV line`
            : `${a.level} kV line fault${storm > 1 ? ' (storm)' : ''}`
          : `${a.level} kV cable fault`,
      });
    } else if (a.kind === 'sub' && SUBS[a.sub].levels.length === 2) {
      const branchId = txBranchId(a.id);
      if (outBranches.has(branchId)) continue;
      if (!rng.chance((TX_BASE * dtMin) / MIN_PER_YEAR)) continue;
      faults.push({
        branchId,
        assetId: a.id,
        x: a.x,
        y: a.y,
        repairMin: REPAIR_TIME.transformer ?? 480,
        label: `transformer failure at the ${SUBS[a.sub].name.split(' (')[0]?.toLowerCase()}`,
      });
    }
  }
  return faults;
}

/** Vegetation creeps along overhead routes; the chosen management policy
 *  scales the growth. `routeVeg` is the route's woodland density 0..1. */
export function growVegetation(
  lineVeg: Map<number, number>,
  assets: Iterable<PlacedAsset>,
  routeVeg: Map<number, number>,
  growthMul: number,
  dtMin: number,
): void {
  // dense woodland fully overgrows an untrimmed line in ~1.5 game-years
  const ratePerMin = 1 / (1.5 * MIN_PER_YEAR);
  for (const a of assets) {
    if (a.kind !== 'line' || a.build !== 'overhead') continue;
    const density = routeVeg.get(a.id) ?? 0;
    const cur = lineVeg.get(a.id) ?? 0;
    const next = Math.min(1, cur + density * growthMul * ratePerMin * dtMin);
    if (next > 0) lineVeg.set(a.id, next);
  }
}
