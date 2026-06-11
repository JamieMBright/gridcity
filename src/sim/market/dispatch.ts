// Automated merit-order dispatch. The player never balances the system by
// hand: per electrical island, generators are stacked cheapest-first until
// connected load is met. The wholesale cost of whatever ran lands on
// customer bills. (Weather-driven availability, batteries and frequency
// response arrive in M4.)

import { GENS, SUBS } from '../catalog';
import { busId, type PlacedAsset } from '../assets';
import { findIslands } from '../grid/topology';
import type { Injection, Network } from '../grid/types';

export interface DispatchResult {
  injections: Injection[];
  /** gen asset id → dispatched MW. */
  genMW: Map<number, number>;
  /** dist-sub asset id → fraction of its demand actually served (0..1). */
  servedFracOfSub: Map<number, number>;
  /** Preferred slack buses, biggest dispatched unit first. */
  slackPreference: number[];
  /** Wholesale cost of this operating point, £k per hour. */
  costKPerHour: number;
  /** Connected demand (subs that reach any island), MW. */
  connectedMW: number;
  /** Demand actually supplied after ratings and generation limits, MW. */
  servedMW: number;
}

export function runDispatch(
  net: Network,
  assets: Iterable<PlacedAsset>,
  loadMWOfSub: Map<number, number>,
): DispatchResult {
  const { islandOf } = findIslands(net);

  interface IslandAgg {
    gens: Array<{ id: number; bus: number; capMW: number; costK: number }>;
    subs: Array<{ id: number; bus: number; loadMW: number; cappedMW: number }>;
  }
  const byIsland = new Map<number, IslandAgg>();
  const agg = (gi: number): IslandAgg => {
    let a = byIsland.get(gi);
    if (!a) {
      a = { gens: [], subs: [] };
      byIsland.set(gi, a);
    }
    return a;
  };

  for (const a of assets) {
    if (a.kind === 'gen') {
      const spec = GENS[a.gen];
      const bus = busId(a.id, spec.level);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      agg(gi).gens.push({ id: a.id, bus, capMW: spec.capacityMW, costK: spec.marginalCostK });
    } else if (a.kind === 'sub' && SUBS[a.sub].serviceRadius !== undefined) {
      const loadMW = loadMWOfSub.get(a.id) ?? 0;
      if (loadMW <= 0) continue;
      const bus = busId(a.id, 33);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      // the substation transformer caps how much its area can draw
      const cappedMW = Math.min(loadMW, SUBS[a.sub].txRatingMW);
      agg(gi).subs.push({ id: a.id, bus, loadMW, cappedMW });
    }
  }

  const injections: Injection[] = [];
  const genMW = new Map<number, number>();
  const servedFracOfSub = new Map<number, number>();
  const slackCandidates: Array<{ bus: number; mw: number }> = [];
  let costKPerHour = 0;
  let connectedMW = 0;
  let servedMW = 0;

  for (const island of byIsland.values()) {
    const demand = island.subs.reduce((s, x) => s + x.cappedMW, 0);
    const capacity = island.gens.reduce((s, g) => s + g.capMW, 0);
    for (const s of island.subs) connectedMW += s.loadMW;
    if (demand <= 0 || capacity <= 0) {
      // nothing to serve, or a dead island: subs here get nothing
      if (capacity <= 0) for (const s of island.subs) servedFracOfSub.set(s.id, 0);
      continue;
    }

    // rationing if the island is generation-short (uniform; UFLS comes later)
    const islandFrac = Math.min(1, capacity / demand);
    const target = demand * islandFrac;

    // merit order: cheapest first
    const order = [...island.gens].sort((a, b) => a.costK - b.costK);
    let remaining = target;
    for (const g of order) {
      const mw = Math.min(g.capMW, remaining);
      remaining -= mw;
      if (mw > 0) {
        genMW.set(g.id, mw);
        injections.push({ bus: g.bus, pMW: mw });
        costKPerHour += mw * g.costK;
        slackCandidates.push({ bus: g.bus, mw });
      } else {
        genMW.set(g.id, 0);
      }
    }

    for (const s of island.subs) {
      const supplied = s.cappedMW * islandFrac;
      injections.push({ bus: s.bus, pMW: -supplied });
      servedFracOfSub.set(s.id, s.loadMW > 0 ? supplied / s.loadMW : 0);
      servedMW += supplied;
    }
  }

  slackCandidates.sort((a, b) => b.mw - a.mw);
  return {
    injections,
    genMW,
    servedFracOfSub,
    slackPreference: slackCandidates.map((c) => c.bus),
    costKPerHour,
    connectedMW,
    servedMW,
  };
}
