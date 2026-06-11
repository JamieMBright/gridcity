// DC power flow. Per island: build the reduced susceptance matrix B'
// (slack row/column removed), solve B' θ = P, then branch flows
// F = (θ_from − θ_to) / x. This gives honest loop-flow physics: parallel
// paths split by inverse reactance, and any reinforcement re-routes
// power across the whole mesh.

import { luFactor, luSolve } from './lu';
import { findIslands } from './topology';
import {
  X_MIN,
  type Injection,
  type IslandResult,
  type Network,
  type PowerFlowResult,
} from './types';
import { estimateVoltages } from './voltage';

export interface DcPfOptions {
  /** Preferred slack bus ids (e.g. biggest generator bus), in order. */
  slackPreference?: number[];
}

export function solveDcPowerFlow(
  net: Network,
  injections: Injection[],
  opts: DcPfOptions = {},
): PowerFlowResult {
  const flowMW = new Map<number, number>();
  const angle = new Map<number, number>();
  for (const br of net.branches) flowMW.set(br.id, 0);
  for (const bus of net.buses) angle.set(bus.id, 0);

  const pByBus = new Map<number, number>();
  for (const inj of injections) {
    pByBus.set(inj.bus, (pByBus.get(inj.bus) ?? 0) + inj.pMW);
  }

  const { islandOf, groups } = findIslands(net);
  const islands: IslandResult[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const buses = groups[gi] ?? [];
    const result = solveIsland(net, buses, gi, islandOf, pByBus, opts, flowMW, angle);
    islands.push(result);
  }

  const voltage = estimateVoltages(net, islands, flowMW);
  return { flowMW, angle, voltage, islands };
}

function solveIsland(
  net: Network,
  buses: number[],
  islandIndex: number,
  islandOf: Map<number, number>,
  pByBus: Map<number, number>,
  opts: DcPfOptions,
  flowMW: Map<number, number>,
  angle: Map<number, number>,
): IslandResult {
  const base: IslandResult = { buses, slack: undefined, energized: false, slackMW: 0 };
  if (buses.length === 0) return base;

  // An island with no source is black: a source is either a designated
  // slack-preference bus (generator / grid supply point) in the island,
  // or any bus with positive net injection.
  let slack: number | undefined;
  for (const pref of opts.slackPreference ?? []) {
    if (islandOf.get(pref) === islandIndex) {
      slack = pref;
      break;
    }
  }
  const hasSource = slack !== undefined || buses.some((b) => (pByBus.get(b) ?? 0) > 0);
  if (!hasSource) return base;
  slack ??= buses.reduce((a, b) => Math.min(a, b));

  if (buses.length === 1) {
    const p = pByBus.get(slack) ?? 0;
    return { buses, slack, energized: true, slackMW: -p };
  }

  // index non-slack buses
  const index = new Map<number, number>();
  let k = 0;
  for (const b of buses) {
    if (b !== slack) index.set(b, k++);
  }
  const n = k;

  // build B' and P
  const a = new Float64Array(n * n);
  const p = new Float64Array(n);
  for (const br of net.branches) {
    if (!br.inService) continue;
    if (islandOf.get(br.from) !== islandIndex) continue;
    const x = Math.max(br.x, X_MIN);
    const bSus = 1 / x;
    const fi = index.get(br.from);
    const ti = index.get(br.to);
    if (fi !== undefined) a[fi * n + fi] = (a[fi * n + fi] ?? 0) + bSus;
    if (ti !== undefined) a[ti * n + ti] = (a[ti * n + ti] ?? 0) + bSus;
    if (fi !== undefined && ti !== undefined) {
      a[fi * n + ti] = (a[fi * n + ti] ?? 0) - bSus;
      a[ti * n + fi] = (a[ti * n + fi] ?? 0) - bSus;
    }
  }
  for (const [bus, idx] of index) {
    p[idx] = (pByBus.get(bus) ?? 0) / 100; // MW → pu on 100 MVA
  }

  const factors = luFactor(a, n);
  if (!factors) return { ...base, slack }; // singular: island stays black this tick

  const theta = luSolve(factors, p);

  // NaN sweep — if anything went numerically wrong, black the island
  for (const t of theta) {
    if (!Number.isFinite(t)) return { ...base, slack };
  }

  for (const [bus, idx] of index) angle.set(bus, theta[idx] ?? 0);
  angle.set(slack, 0);

  // branch flows + slack balance: slackMW is the extra MW the slack must
  // supply beyond its specified injection (its flows out minus injection)
  let slackMW = -(pByBus.get(slack) ?? 0);
  for (const br of net.branches) {
    if (!br.inService || islandOf.get(br.from) !== islandIndex) continue;
    const x = Math.max(br.x, X_MIN);
    const thF = angle.get(br.from) ?? 0;
    const thT = angle.get(br.to) ?? 0;
    const f = ((thF - thT) / x) * 100; // pu → MW
    flowMW.set(br.id, f);
    if (br.from === slack) slackMW += f;
    if (br.to === slack) slackMW -= f;
  }

  return { buses, slack, energized: true, slackMW };
}
