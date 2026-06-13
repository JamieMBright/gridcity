// Net-zero dashboard maths (ROADMAP #33). Pure functions so the shares /
// worst-source logic is unit-testable (tests/netZero.test.ts). The panel
// reads the EXISTING snapshot: stats.carbonG (live intensity) + genMW (per
// gen asset MW) + the gen assets (to map id→tech) + GENS[tech].carbonG.

import { GENS, type GenType } from '../sim/catalog';
import type { PlacedAsset } from '../sim/assets';

export interface MixSlice {
  gen: GenType;
  name: string;
  mw: number;
  /** 0..1 fraction of the dispatched (positive) generation. */
  share: number;
  carbonG: number;
  lowCarbon: boolean;
}

export interface NetZeroView {
  /** Total dispatched generation right now, MW (batteries charging and the
   *  electrolyser load are excluded — they're sinks, not sources). */
  totalMW: number;
  slices: MixSlice[];
  /** Share of dispatched MW that is low-carbon (carbonG === 0). 0..1. */
  lowCarbonShare: number;
  /** The single dirtiest running source, or undefined when all-green. */
  worst: MixSlice | undefined;
  /** Live carbon intensity, g/kWh (from the snapshot stats). */
  carbonG: number;
}

/** A tech counts as a carbon source only if it's actually generating
 *  (positive MW) and has a non-zero intensity. Batteries discharge at
 *  ~zero marginal carbon here; the electrolyser is a load. */
export function netZeroView(
  assets: PlacedAsset[],
  genMW: Array<[number, number]>,
  carbonG: number,
): NetZeroView {
  const typeOf = new Map<number, GenType>();
  for (const a of assets) if (a.kind === 'gen') typeOf.set(a.id, a.gen);

  // sum dispatched MW per tech (ignore negatives = battery charging)
  const byTech = new Map<GenType, number>();
  let totalMW = 0;
  for (const [id, mw] of genMW) {
    if (mw <= 0) continue;
    const t = typeOf.get(id);
    if (!t) continue;
    byTech.set(t, (byTech.get(t) ?? 0) + mw);
    totalMW += mw;
  }

  const slices: MixSlice[] = [];
  let lowMW = 0;
  for (const [gen, mw] of byTech) {
    const spec = GENS[gen];
    const lowCarbon = spec.carbonG === 0;
    if (lowCarbon) lowMW += mw;
    slices.push({
      gen,
      name: spec.name,
      mw,
      share: totalMW > 0 ? mw / totalMW : 0,
      carbonG: spec.carbonG,
      lowCarbon,
    });
  }
  // biggest contributor first
  slices.sort((a, b) => b.mw - a.mw);

  // worst = the highest-intensity tech that's actually running
  let worst: MixSlice | undefined;
  for (const s of slices) {
    if (s.carbonG > 0 && (!worst || s.carbonG > worst.carbonG)) worst = s;
  }

  return {
    totalMW,
    slices,
    lowCarbonShare: totalMW > 0 ? lowMW / totalMW : 0,
    worst,
    carbonG,
  };
}

/** A coarse net-zero "grade" off the live intensity, for the headline
 *  ring. GB's 2050 glidepath lands near ~50 g/kWh; we band around it. */
export function carbonGrade(carbonG: number): { label: string; t: number } {
  // t: 0 (filthy ~600) .. 1 (net-zero). Clamp.
  const t = Math.max(0, Math.min(1, 1 - carbonG / 500));
  const label =
    carbonG <= 50 ? 'net zero in sight' : carbonG <= 150 ? 'decarbonising' : carbonG <= 350 ? 'still fossil-heavy' : 'high carbon';
  return { label, t };
}
