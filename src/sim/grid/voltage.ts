// Voltage magnitude estimate. DC power flow has no voltage magnitudes, so
// we approximate: walk a spanning tree out from each island's slack and
// accumulate |flow|·r drops. Crude but it produces the right gameplay
// physics — long heavily-loaded radial runs sag, meshing or reinforcing
// fixes them, and de-energized islands read 0.

import type { IslandResult, Network } from './types';

export const V_NOMINAL = 1.0;
export const V_BROWNOUT = 0.94;
export const V_COLLAPSE = 0.9;
/** Rooftop-PV backfeed can push local voltage high — alert threshold. */
export const V_HIGH = 1.06;

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

  for (const island of islands) {
    if (!island.energized || island.slack === undefined) continue;
    // BFS from slack accumulating drops
    voltage.set(island.slack, V_NOMINAL);
    const queue = [island.slack];
    const seen = new Set<number>([island.slack]);
    while (queue.length > 0) {
      const bus = queue.shift();
      if (bus === undefined) break;
      const v = voltage.get(bus) ?? V_NOMINAL;
      for (const edge of adj.get(bus) ?? []) {
        if (seen.has(edge.other)) continue;
        seen.add(edge.other);
        const fPu = Math.abs(flowMW.get(edge.id) ?? 0) / 100;
        const drop = fPu * edge.r;
        voltage.set(edge.other, Math.max(0, v - drop));
        queue.push(edge.other);
      }
    }
  }
  return voltage;
}
