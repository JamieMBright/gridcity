// Connectivity analysis: split the network into electrical islands over
// in-service branches (BFS), so each island can be solved independently.

import type { Network } from './types';

export interface Islands {
  /** island index per bus id (-1 for unknown buses). */
  islandOf: Map<number, number>;
  /** bus ids per island. */
  groups: number[][];
}

export function findIslands(net: Network): Islands {
  const adj = new Map<number, number[]>();
  for (const bus of net.buses) adj.set(bus.id, []);
  for (const br of net.branches) {
    if (!br.inService) continue;
    adj.get(br.from)?.push(br.to);
    adj.get(br.to)?.push(br.from);
  }

  const islandOf = new Map<number, number>();
  const groups: number[][] = [];
  for (const bus of net.buses) {
    if (islandOf.has(bus.id)) continue;
    const group: number[] = [];
    const queue = [bus.id];
    islandOf.set(bus.id, groups.length);
    while (queue.length > 0) {
      const b = queue.pop();
      if (b === undefined) break;
      group.push(b);
      for (const next of adj.get(b) ?? []) {
        if (!islandOf.has(next)) {
          islandOf.set(next, groups.length);
          queue.push(next);
        }
      }
    }
    groups.push(group);
  }
  return { islandOf, groups };
}
