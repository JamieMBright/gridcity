// Voltage magnitude estimate. DC power flow has no voltage magnitudes, so
// we approximate: walk a spanning tree out from each island's slack and
// accumulate |flow|·r drops. Crude but it produces the right gameplay
// physics — long heavily-loaded radial runs sag, meshing or reinforcing
// fixes them, and de-energized islands read 0.
//
// Shunt compensation (ROADMAP #19) rides the same walk: a capacitor bank
// (Bus.vBoost, stamped by deriveNetwork) credits a bounded boost at its
// point of connection, and the tree walk carries that credit to every bus
// downstream — exactly the gameplay shape of switching in a 33 kV bank
// partway down a sagging feeder. The boost is bookkept SEPARATELY from
// the resistive base so it never compounds into the drop arithmetic, and
// stacked banks clamp at CAPBANK_BOOST_MAX (more cans ≠ unbounded volts).
// The slack bus stays pinned at exactly V_NOMINAL: it is the regulated
// reference. None of this touches the DC power flow — banks move volts,
// not megawatts.

import type { IslandResult, Network } from './types';

export const V_NOMINAL = 1.0;
export const V_BROWNOUT = 0.94;
export const V_COLLAPSE = 0.9;
/** Rooftop-PV backfeed can push local voltage high — alert threshold. */
export const V_HIGH = 1.06;

/** Voltage credit of one capacitor bank, pu (#19). */
export const CAPBANK_BOOST_PU = 0.03;
/** Cumulative boost clamp where banks stack on one path, pu — kept under
 *  V_HIGH − V_NOMINAL so a healthy boosted feeder never trips the
 *  overvoltage alert on its own. */
export const CAPBANK_BOOST_MAX = 0.05;

export function estimateVoltages(
  net: Network,
  islands: IslandResult[],
  flowMW: Map<number, number>,
): Map<number, number> {
  const voltage = new Map<number, number>();
  for (const bus of net.buses) voltage.set(bus.id, 0);

  // adjacency over in-service branches
  const adj = new Map<number, Array<{ other: number; id: number; r: number }>>();
  for (const br of net.branches) {
    if (!br.inService) continue;
    if (!adj.has(br.from)) adj.set(br.from, []);
    if (!adj.has(br.to)) adj.set(br.to, []);
    adj.get(br.from)?.push({ other: br.to, id: br.id, r: br.r });
    adj.get(br.to)?.push({ other: br.from, id: br.id, r: br.r });
  }

  // #19: each bank bus credits its boost at its point(s) of connection;
  // the bank's own leaf bus then inherits the credit downstream of its
  // parent like any other bus (an out-of-service stub credits nothing).
  const creditAt = new Map<number, number>();
  for (const bus of net.buses) {
    const b = bus.vBoost ?? 0;
    if (b <= 0) continue;
    for (const e of adj.get(bus.id) ?? []) {
      creditAt.set(e.other, (creditAt.get(e.other) ?? 0) + b);
    }
  }

  for (const island of islands) {
    if (!island.energized || island.slack === undefined) continue;
    // BFS from slack accumulating drops; the boost rides alongside the
    // resistive base and is clamped where banks stack
    const base = new Map<number, number>([[island.slack, V_NOMINAL]]);
    const boost = new Map<number, number>([[island.slack, 0]]);
    voltage.set(island.slack, V_NOMINAL);
    const queue = [island.slack];
    const seen = new Set<number>([island.slack]);
    while (queue.length > 0) {
      const bus = queue.shift();
      if (bus === undefined) break;
      const v = base.get(bus) ?? V_NOMINAL;
      const b = boost.get(bus) ?? 0;
      for (const edge of adj.get(bus) ?? []) {
        if (seen.has(edge.other)) continue;
        seen.add(edge.other);
        const fPu = Math.abs(flowMW.get(edge.id) ?? 0) / 100;
        const drop = fPu * edge.r;
        const baseChild = Math.max(0, v - drop);
        const boostChild = Math.min(CAPBANK_BOOST_MAX, b + (creditAt.get(edge.other) ?? 0));
        base.set(edge.other, baseChild);
        boost.set(edge.other, boostChild);
        voltage.set(edge.other, baseChild <= 0 ? 0 : baseChild + boostChild);
        queue.push(edge.other);
      }
    }
  }
  return voltage;
}
