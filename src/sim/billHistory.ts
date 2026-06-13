// Bill-over-time history (ROADMAP #28): a cheap, deterministic ring of
// daily bill samples so the BillPanel can chart the £/household/year trend
// and its components across the period.
//
// The worker samples once per game-DAY into this ring (like the inspector
// sparkline samples per 30 game-min). It is worker-local chart data, not
// game state — rebuilt after a load, so it never bumps SAVE_VERSION. The
// ring decimates to a bounded length: when full it drops every other older
// sample and halves the sampling cadence, so a whole 5-year period fits in
// ~120 points at constant memory while staying time-ordered.

/** One sampled point on the bill trend. tMin is the game-minute it was
 *  taken; the component fields are £/household/year shares so a stacked
 *  area sums to `total`. */
export interface BillSample {
  tMin: number;
  /** Total average household bill, £/yr (== the BillPanel headline). */
  total: number;
  /** Network (DUoS) share of the household bill, £/yr. */
  network: number;
  /** Wholesale-energy share, £/yr. */
  energy: number;
  /** Generation PPA + operations + fleet/veg share, £/yr. */
  operations: number;
  /** Constraints + flexibility + losses + innovation, £/yr. */
  other: number;
}

/** The four stacked components (in stack order, bottom → top) plus the
 *  total line — for the chart legend and band isolation. */
export const BILL_BANDS = ['network', 'energy', 'operations', 'other'] as const;
export type BillBand = (typeof BILL_BANDS)[number];

export const BILL_BAND_LABELS: Record<BillBand, string> = {
  network: 'network (DUoS)',
  energy: 'wholesale energy',
  operations: 'generation + ops',
  other: 'constraints + levies',
};

/** Target ring length: a full 5-year period decimates down to ~this many
 *  points. Kept small so the snapshot stays cheap to post every tick. */
export const BILL_HIST_MAX = 120;

export class BillHistory {
  private samples: BillSample[] = [];
  /** Game-day slot of the last sample taken (dedupe within a day). */
  private lastSlot = -1;
  /** Current sampling cadence in days: doubles each time the ring fills,
   *  so the kept window grows without unbounded memory. */
  private cadenceDays = 1;

  clear(): void {
    this.samples = [];
    this.lastSlot = -1;
    this.cadenceDays = 1;
  }

  /** Sample at most once per `cadenceDays`-aligned game-day. Returns true
   *  if a new point was appended (the snapshot only needs rebuilding then,
   *  though the worker reads `view()` every tick anyway — cheap). */
  sample(simTimeMin: number, s: Omit<BillSample, 'tMin'>): boolean {
    const slot = Math.floor(simTimeMin / 1440 / this.cadenceDays);
    if (slot === this.lastSlot) {
      // same coarse slot: keep the right edge fresh by replacing the last
      // point with the newer reading (cheap, keeps the ring bounded)
      const last = this.samples[this.samples.length - 1];
      if (last) Object.assign(last, { tMin: simTimeMin, ...s });
      return false;
    }
    this.lastSlot = slot;
    this.samples.push({ tMin: simTimeMin, ...s });
    if (this.samples.length > BILL_HIST_MAX) this.decimate();
    return true;
  }

  /** Halve the resolution: keep every other sample, double the cadence so
   *  future samples arrive at the new (coarser) spacing. Always keeps the
   *  most recent sample (decimate counting back from the tail). */
  private decimate(): void {
    const n = this.samples.length;
    this.samples = this.samples.filter((_, i) => (n - 1 - i) % 2 === 0);
    this.cadenceDays *= 2;
    // realign lastSlot to the coarser cadence so the next sample isn't
    // immediately deduped or doubled-up
    this.lastSlot = Math.floor((this.samples[this.samples.length - 1]?.tMin ?? 0) / 1440 / this.cadenceDays);
  }

  /** A defensive copy for the snapshot. */
  view(): BillSample[] {
    return this.samples.map((p) => ({ ...p }));
  }
}

/** Split a BillBreakdown's headline household figure into the four stacked
 *  bands, in the SAME proportion as the underlying £k/yr pots, so the bands
 *  sum to the household `perCustomerYr` total exactly. Keeping it
 *  proportional (rather than re-deriving domestic shares per pot) means the
 *  chart and the BillPanel headline never disagree. */
export function bandsOf(b: {
  perCustomerYr: number;
  capexYrK: number;
  opexYrK: number;
  genYrK: number;
  fleetYrK: number;
  vegYrK: number;
  energyYrK: number;
  flexYrK: number;
  constraintYrK: number;
  lossYrK: number;
  innovationYrK: number;
}): Omit<BillSample, 'tMin'> {
  const network = b.capexYrK;
  const energy = b.energyYrK;
  const operations = b.opexYrK + b.genYrK + b.fleetYrK + b.vegYrK;
  const other = b.flexYrK + b.constraintYrK + b.lossYrK + b.innovationYrK;
  const sum = network + energy + operations + other;
  const total = b.perCustomerYr;
  if (sum <= 0) {
    return { total, network: 0, energy: 0, operations: 0, other: total };
  }
  const k = total / sum;
  return {
    total,
    network: network * k,
    energy: energy * k,
    operations: operations * k,
    other: other * k,
  };
}
