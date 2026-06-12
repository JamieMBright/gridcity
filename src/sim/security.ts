// N-1 security screening (ROADMAP #8, sim side). For every service
// substation (the catchment-serving kinds: dist/pole/vault), determine
// whether the loss of any SINGLE in-service branch (line or transformer)
// would disconnect its 33 kV bus from all generation — the topological
// P2/6 question a real DNO plans to. Thermal adequacy under contingency
// (full DCPF per outage) is a deliberate v2; this starts topological,
// exactly as the roadmap prescribes.
//
// Method: derive the network once (current outages applied), find graph
// bridges via iterative Tarjan (O(V+E)) — only a bridge's loss can split
// an island — then for each bridge run one multi-source BFS from its
// island's generator buses with that bridge removed. Any service sub
// that had supply before but is unreachable now is insecure, and the
// bridge's owning asset names the binding failure (label mirrors
// study.ts's branchLabel). Bridges are tested in ascending branch id so
// the reported binding branch is deterministic.
//
// Purity/caching: the answer depends only on the asset graph and the
// outage set, never on game time (plants under construction count as
// sources — security is a planning view, and keying off liveAtMin would
// break the cache signature). Results are memoized on an
// assetsVersion+outages signature, WeakMap'd on the assets Map identity
// so undo/load (which reset assetsVersion) can never serve a stale
// answer. ~300 buses screens in well under the 50 ms budget.

import { assetOfId, busId, deriveNetwork } from './assets';
import { GENS, SUBS } from './catalog';
import { findIslands } from './grid/topology';
import type { GameState } from './state';

export interface SecurityEntry {
  /** True if no single in-service branch loss cuts this sub off from
   *  all generation. False also covers "already unsupplied at N-0". */
  secure: boolean;
  /** Names the single failure that would black the sub out (insecure
   *  only; omitted when the sub is already unsupplied at N-0). */
  bindingLabel?: string | undefined;
}

/** Cache signature: security depends only on the asset graph + outages. */
export function securityKey(state: GameState): string {
  return `${state.assetsVersion}:${[...state.outages.keys()].sort((a, b) => a - b).join(',')}`;
}

const cache = new WeakMap<object, { key: string; result: Map<number, SecurityEntry> }>();

/** Human label for a branch's owning asset (mirrors study.ts). */
function branchLabel(state: GameState, branchId: number): string {
  const a = state.assets.get(assetOfId(branchId));
  if (!a) return 'network kit';
  if (a.kind === 'line') return `${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'}`;
  if (a.kind === 'sub') return `${SUBS[a.sub].name.split(' (')[0]} transformer`;
  return 'network kit';
}

interface Edge {
  to: number;
  br: number;
}

/** Graph bridges over the in-service adjacency, iterative Tarjan
 *  (explicit stack — island chains can outgrow the call stack).
 *  Parallel branches between the same pair of buses are recognised by
 *  branch id, so a duplicated circuit correctly stops being a bridge. */
function findBridges(busIds: Iterable<number>, adj: Map<number, Edge[]>): number[] {
  const disc = new Map<number, number>();
  const low = new Map<number, number>();
  const bridges: number[] = [];
  let time = 0;
  for (const root of busIds) {
    if (disc.has(root)) continue;
    disc.set(root, time);
    low.set(root, time);
    time++;
    const stack: Array<{ bus: number; parentBr: number; ix: number }> = [
      { bus: root, parentBr: -1, ix: 0 },
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) break;
      const edges = adj.get(frame.bus) ?? [];
      const edge = edges[frame.ix];
      if (edge !== undefined) {
        frame.ix++;
        if (edge.br === frame.parentBr) continue; // the tree edge we came down
        const seenAt = disc.get(edge.to);
        if (seenAt === undefined) {
          disc.set(edge.to, time);
          low.set(edge.to, time);
          time++;
          stack.push({ bus: edge.to, parentBr: edge.br, ix: 0 });
        } else {
          low.set(frame.bus, Math.min(low.get(frame.bus) ?? 0, seenAt));
        }
      } else {
        stack.pop();
        const parent = stack[stack.length - 1];
        if (parent) {
          const childLow = low.get(frame.bus) ?? 0;
          low.set(parent.bus, Math.min(low.get(parent.bus) ?? 0, childLow));
          if (childLow > (disc.get(parent.bus) ?? 0)) bridges.push(frame.parentBr);
        }
      }
    }
  }
  bridges.sort((a, b) => a - b);
  return bridges;
}

/** Multi-source BFS over the in-service adjacency, skipping one branch. */
function reachFrom(sources: Iterable<number>, adj: Map<number, Edge[]>, skipBr: number): Set<number> {
  const seen = new Set<number>();
  const queue: number[] = [];
  for (const s of sources) {
    if (!seen.has(s)) {
      seen.add(s);
      queue.push(s);
    }
  }
  while (queue.length > 0) {
    const b = queue.pop();
    if (b === undefined) break;
    for (const e of adj.get(b) ?? []) {
      if (e.br === skipBr || seen.has(e.to)) continue;
      seen.add(e.to);
      queue.push(e.to);
    }
  }
  return seen;
}

/** N-1 security of every service substation. Memoized; see header. */
export function securityOf(state: GameState): Map<number, SecurityEntry> {
  const key = securityKey(state);
  const hit = cache.get(state.assets);
  if (hit && hit.key === key) return hit.result;

  const net = deriveNetwork(state.assets.values());
  for (const br of net.branches) br.inService = !state.outages.has(br.id);

  const adj = new Map<number, Edge[]>();
  for (const bus of net.buses) adj.set(bus.id, []);
  for (const br of net.branches) {
    if (!br.inService) continue;
    adj.get(br.from)?.push({ to: br.to, br: br.id });
    adj.get(br.to)?.push({ to: br.from, br: br.id });
  }

  const genBuses: number[] = [];
  const serviceSubs: Array<{ id: number; bus: number }> = [];
  for (const a of state.assets.values()) {
    if (a.kind === 'gen') {
      genBuses.push(busId(a.id, GENS[a.gen].level));
    } else if (a.kind === 'sub' && SUBS[a.sub].serviceRadius !== undefined) {
      serviceSubs.push({ id: a.id, bus: busId(a.id, 33) });
    }
  }

  // N-0 baseline: a sub with no path to any generation is already dark
  // territory — insecure, but no single branch is to blame
  const base = reachFrom(genBuses, adj, -1);
  const result = new Map<number, SecurityEntry>();
  for (const s of serviceSubs) result.set(s.id, { secure: base.has(s.bus) });

  // group gens and still-secure subs by island so each bridge test only
  // walks the island it can actually split
  const islands = findIslands(net);
  const gensByIsland = new Map<number, number[]>();
  for (const g of genBuses) {
    const gi = islands.islandOf.get(g) ?? -1;
    const arr = gensByIsland.get(gi) ?? [];
    arr.push(g);
    gensByIsland.set(gi, arr);
  }
  const subsByIsland = new Map<number, Array<{ id: number; bus: number }>>();
  for (const s of serviceSubs) {
    const gi = islands.islandOf.get(s.bus) ?? -1;
    const arr = subsByIsland.get(gi) ?? [];
    arr.push(s);
    subsByIsland.set(gi, arr);
  }

  const branchById = new Map(net.branches.map((b) => [b.id, b]));
  for (const brId of findBridges(adj.keys(), adj)) {
    const br = branchById.get(brId);
    if (!br) continue;
    const gi = islands.islandOf.get(br.from) ?? -1;
    const subsHere = subsByIsland.get(gi) ?? [];
    if (!subsHere.some((s) => result.get(s.id)?.secure)) continue; // nothing left to demote
    const reach = reachFrom(gensByIsland.get(gi) ?? [], adj, brId);
    for (const s of subsHere) {
      if (!result.get(s.id)?.secure) continue; // already insecure / unsupplied
      if (!reach.has(s.bus)) {
        result.set(s.id, { secure: false, bindingLabel: branchLabel(state, brId) });
      }
    }
  }

  cache.set(state.assets, { key, result });
  return result;
}
