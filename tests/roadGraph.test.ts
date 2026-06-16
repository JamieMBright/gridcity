// W7b — vans drive on the road network. The road graph is built from the
// map's vector routes; planRoute returns a polyline that follows roads where
// they exist (and degrades to a straight hop when they don't), and stepFleet
// drives a van along that polyline so it visibly travels the streets.

import { describe, expect, it } from 'vitest';
import { planRoute, roadGraph } from '../src/sim/fleet/roadGraph';
import { stepFleet, syncVans, type RepairJob, type Van } from '../src/sim/fleet/fleet';
import type { PlacedAsset } from '../src/sim/assets';
import type { CityMap, TransportRoute } from '../src/sim/map/types';
import { makeTestMap } from './helpers';

/** A test map with a single L-shaped street: along the top edge to the
 *  right, then straight down the right side — so the road route between two
 *  corners is much LONGER than the straight diagonal between them. */
function mapWithLStreet(): CityMap {
  const map = makeTestMap(40, 40);
  const street: TransportRoute = {
    kind: 'street',
    pts: [
      [2, 2],
      [36, 2], // east along the top
      [36, 36], // south down the right
    ],
  };
  map.routes = [street];
  return map;
}

describe('road graph', () => {
  it('builds a connected graph from drivable routes; null when none', () => {
    const map = mapWithLStreet();
    const g = roadGraph(map);
    expect(g).not.toBeNull();
    expect(g!.xs.length).toBeGreaterThan(10); // sampled along the L
    // a route with no drivable class yields no graph
    const railOnly = makeTestMap(20, 20);
    railOnly.routes = [{ kind: 'rail', pts: [[0, 0], [10, 10]] }];
    expect(roadGraph(railOnly)).toBeNull();
    // no routes at all → null (campaign mini-maps)
    expect(roadGraph(makeTestMap(10, 10))).toBeNull();
  });

  it('plans a route that FOLLOWS the road, not the diagonal', () => {
    const map = mapWithLStreet();
    // from near the top-left corner to near the bottom-right corner: the
    // straight diagonal is ~48 tiles, but the only road is the L (~68 tiles).
    const path = planRoute(map, 2, 3, 35, 36);
    expect(path.length).toBeGreaterThan(2); // multiple waypoints, not one hop
    // total path length tracks the L, well over the straight diagonal
    let len = 0;
    let px = 2;
    let py = 3;
    for (const [x, y] of path) {
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
    const diagonal = Math.hypot(35 - 2, 36 - 3);
    expect(len).toBeGreaterThan(diagonal * 1.3); // genuinely routed around the L
    // the path passes near the NE corner where the road turns
    const nearCorner = path.some(([x, y]) => Math.hypot(x - 36, y - 2) < 3);
    expect(nearCorner).toBe(true);
  });

  it('degrades to a straight hop when no road is near either end', () => {
    const map = makeTestMap(40, 40); // no routes
    expect(planRoute(map, 2, 2, 30, 30)).toEqual([[30, 30]]);
  });

  it('is deterministic — same plan every call (sim reproducibility)', () => {
    const map = mapWithLStreet();
    const a = planRoute(map, 2, 3, 35, 36);
    const b = planRoute(map, 2, 3, 35, 36);
    expect(a).toEqual(b);
  });
});

describe('vans follow the road', () => {
  const depot: PlacedAsset = { id: 50, kind: 'depot', x: 2, y: 2 };

  it('a van assigned a job drives ALONG the street toward it', () => {
    const map = mapWithLStreet();
    const vans: Van[] = syncVans([], 1, [depot]); // spawns at the depot (2,2)
    const jobs = new Map<number, RepairJob>([
      [8, { branchId: 8, assetId: 2, x: 35, y: 35, repairMin: 240, waitedMin: 0, label: 'fault' }],
    ]);
    // one short tick: the van should head EAST along the top road first (the
    // road goes right before it can go down), i.e. x climbs while y stays low —
    // a straight-line van would instead move diagonally (x AND y rising).
    stepFleet(vans, jobs, [depot], 6, map);
    const v = vans[0]!;
    expect(v.x).toBeGreaterThan(depot.x + 1); // moved east along the road
    expect(v.y).toBeLessThan(8); // still up on the top road, not cutting the diagonal
    expect(v.path && v.path.length).toBeGreaterThan(0); // carrying a road plan
  });

  it('still reaches the site and closes the job (road travel + repair)', () => {
    const map = mapWithLStreet();
    const vans: Van[] = syncVans([], 1, [depot]);
    const jobs = new Map<number, RepairJob>([
      [8, { branchId: 8, assetId: 2, x: 35, y: 35, repairMin: 120, waitedMin: 0, label: 'fault' }],
    ]);
    let restored = false;
    for (let i = 0; i < 400 && !restored; i++) {
      const out = stepFleet(vans, jobs, [depot], 30, map);
      restored = out.restored.some((r) => r.branchId === 8 && r.by === 'crew');
    }
    expect(restored).toBe(true);
    expect(jobs.size).toBe(0);
  });

  it('an idle van drives home along the road and clears its plan on arrival', () => {
    const map = mapWithLStreet();
    const vans: Van[] = [{ id: 1, x: 35, y: 35 }]; // stranded bottom-right
    const jobs = new Map<number, RepairJob>();
    for (let i = 0; i < 400; i++) stepFleet(vans, jobs, [depot], 30, map);
    const v = vans[0]!;
    expect(Math.hypot(v.x - depot.x, v.y - depot.y)).toBeLessThan(1); // home
    expect(v.path).toBeUndefined(); // plan cleared on arrival
  });
});
