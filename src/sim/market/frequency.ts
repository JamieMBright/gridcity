// System frequency. In a real interconnected grid frequency is a single
// shared quantity, but ElectriCity can run as several ELECTRICALLY
// SEPARATE islands at once (before the player has stitched the network
// together, or after a fault splits it). Each energized island floats at
// its OWN frequency, set by the moment-to-moment balance of supply and
// demand on that island: a deficit (load it cannot meet) drags the island
// down toward the load-shedding floor; a healthy balance sits at nominal
// 50 Hz. The number on the HUD is the LOAD-WEIGHTED MEAN of the islands
// that are actually carrying customers — a big city island in trouble
// moves the dial more than a balanced hamlet.
//
// When NOTHING is electrified (the day-0 blank grid) there is no rotating
// machine spinning anywhere, so there is no frequency to report: the dial
// reads N/A rather than a misleading "50 minus a deficit it invented".

/** GB statutory frequency band centre. */
export const NOMINAL_HZ = 50;
/** Largest excursion we model before total collapse — load-shedding
 *  protection (LFDD) bottoms out around here in GB (47.0 Hz trips the
 *  last stage); we floor a fraction above it for headroom. */
export const FREQ_FLOOR_HZ = 47.5;
/** One island's local frequency from its supply/demand balance.
 *  `deficitFrac` is the share of demand it CANNOT meet (0 = fully served
 *  ⇒ nominal 50 Hz, 1 = totally dark ⇒ the floor). The slope mirrors the
 *  legacy dial (≈1.5 Hz of sag at a 100% deficit) so the reliability feel
 *  of an under-supplied grid is unchanged. Spare reserve capacity is
 *  normal operation, not over-frequency — a balanced island reads 50.00
 *  no matter how much headroom it carries. */
export function islandFrequencyHz(deficitFrac: number): number {
  const d = Math.max(0, Math.min(1, deficitFrac));
  return Math.max(FREQ_FLOOR_HZ, NOMINAL_HZ - 1.5 * d);
}

/** One electrified island's contribution to the system readout: the load
 *  it carries (the weight) and its local frequency. */
export interface IslandFreqSample {
  /** Demand the island is carrying, MW (the weighting). */
  loadMW: number;
  /** The island's local frequency, Hz. */
  hz: number;
}

/** Load-weighted mean frequency across the electrified islands, or
 *  `undefined` when no island is carrying load (nothing electrified →
 *  N/A on the dial). Islands with zero load (pure export spurs, or dark)
 *  do not vote. */
export function systemFrequencyHz(samples: Iterable<IslandFreqSample>): number | undefined {
  let num = 0;
  let den = 0;
  for (const s of samples) {
    if (s.loadMW <= 0) continue;
    num += s.hz * s.loadMW;
    den += s.loadMW;
  }
  return den > 0 ? num / den : undefined;
}
