/** Tile power status codes, used in the snapshot coverage array. */
export const COV = {
  /** No demand on this tile. */
  empty: 0,
  /** Demand but no serving substation. */
  unserved: 1,
  /** Powered normally. */
  on: 2,
  /** Powered but degraded: low voltage, overloaded substation, or rationing. */
  brownout: 3,
  /** Serving substation exists but is de-energized. */
  off: 4,
} as const;
