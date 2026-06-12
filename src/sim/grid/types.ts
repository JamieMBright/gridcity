// Electrical network model. The solved grid covers 400/132/33 kV;
// distribution below 33 kV is handled radially elsewhere. All power in MW
// on a 100 MVA system base; reactance/resistance in per-unit on that base.

export type VoltageLevel = 400 | 132 | 33;

export type BranchKind = 'overhead' | 'underground' | 'transformer';

export interface Bus {
  id: number;
  /** Tile coordinates (for geometry, length pricing, rendering). */
  x: number;
  y: number;
  level: VoltageLevel;
  /** Shunt-compensation voltage credit, pu (#19): stamped by
   *  deriveNetwork on capacitor-bank buses, consumed ONLY by the
   *  voltage-magnitude estimate (grid/voltage.ts). The DC power flow
   *  never reads it — banks move volts, not megawatts. */
  vBoost?: number | undefined;
}

export interface Branch {
  id: number;
  from: number;
  to: number;
  kind: BranchKind;
  /** Series reactance, pu (clamped >= X_MIN before solving). */
  x: number;
  /** Series resistance, pu — used by the voltage-drop estimate. */
  r: number;
  ratingMW: number;
  inService: boolean;
}

export interface Injection {
  bus: number;
  /** Net injection, MW: generation positive, load negative. */
  pMW: number;
}

export interface Network {
  buses: Bus[];
  branches: Branch[];
}

/** Reactance floor — keeps B' well-conditioned. */
export const X_MIN = 1e-4;

export interface IslandResult {
  /** Bus ids in this island. */
  buses: number[];
  /** Slack bus id, or undefined if the island never solved. */
  slack: number | undefined;
  /** True if the island solved (has a slack and a non-singular B'). */
  energized: boolean;
  /** MW absorbed (negative) or supplied (positive) by the slack. */
  slackMW: number;
}

export interface PowerFlowResult {
  /** Branch id → MW flow (from→to positive). 0 for out-of-service. */
  flowMW: Map<number, number>;
  /** Bus id → voltage angle, radians (0 if unsolved). */
  angle: Map<number, number>;
  /** Bus id → estimated voltage magnitude, pu (0 if de-energized). */
  voltage: Map<number, number>;
  islands: IslandResult[];
}
