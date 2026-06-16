// The orange vans. Faults raise repair jobs; free vans race to site
// (travel time is real — depot placement matters), fix, and head home.
// Too few vans in a storm and the job queue — and the CML clock — runs
// away. With no fleet at all, contractors eventually turn up.
//
// Vans DRIVE ON THE ROADS (owner playtest W7b): instead of flying straight
// across fields, each van plans a route over the street network (fleet/
// roadGraph.planRoute) to its job/depot and follows that polyline tile by
// tile, so it visibly travels the streets. When no road connects the two
// ends the plan degrades to a straight hop, so a van always still arrives.

import type { PlacedAsset } from '../assets';
import type { CityMap } from '../map/types';
import { planRoute } from './roadGraph';

export const VAN_SPEED_TILES_PER_MIN = 1.0;
/** Unstaffed jobs get fixed by contractors after this long. */
export const CONTRACTOR_MIN = 2880;
export const MAX_VANS = 12;
/** Replan when the van's goal moves more than this many tiles from the goal
 *  its current path was planned for (a new job, or it switched to a depot). */
const REPLAN_DIST = 1.5;

export interface Van {
  id: number;
  x: number;
  y: number;
  /** Branch id of the assigned job, if any. */
  jobBranch?: number | undefined;
  /** Road-following plan: tile waypoints to the current goal (consumed as the
   *  van advances). NOT serialized — replanned on demand from (x,y)→goal. */
  path?: Array<[number, number]> | undefined;
  /** The goal the current `path` leads to, so we know when to replan. */
  goalX?: number | undefined;
  goalY?: number | undefined;
}

export interface RepairJob {
  branchId: number;
  assetId: number;
  x: number;
  y: number;
  /** Repair work remaining once a crew is on site, game-minutes. */
  repairMin: number;
  /** Game-minutes this job has waited unstaffed (contractor clock). */
  waitedMin: number;
  label: string;
}

export interface FleetOutcome {
  /** Branch ids restored this tick, with how. */
  restored: Array<{ branchId: number; assetId: number; by: 'crew' | 'contractor' }>;
}

function depots(assets: Iterable<PlacedAsset>): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const a of assets) if (a.kind === 'depot') out.push({ x: a.x, y: a.y });
  return out;
}

/** Keep the van roster in sync with the paid-for fleet size; vans appear
 *  at (and idle back to) depots. No depot, no vans on the road. */
export function syncVans(vans: Van[], fleetSize: number, assets: Iterable<PlacedAsset>): Van[] {
  const homes = depots(assets);
  if (homes.length === 0) return [];
  const next = vans.filter(() => true);
  while (next.length > fleetSize) {
    // retire an idle van first, else the newest
    const idleIdx = next.findIndex((v) => v.jobBranch === undefined);
    next.splice(idleIdx >= 0 ? idleIdx : next.length - 1, 1);
  }
  let id = next.reduce((m, v) => Math.max(m, v.id), 0) + 1;
  while (next.length < fleetSize) {
    const home = homes[next.length % homes.length] ?? homes[0];
    if (!home) break;
    next.push({ id: id++, x: home.x, y: home.y });
  }
  return next;
}

/** Clear a van's road plan (forces a fresh route next time it moves). */
function clearPath(v: Van): void {
  v.path = undefined;
  v.goalX = undefined;
  v.goalY = undefined;
}

/** Advance a van toward (gx,gy) along the ROAD network, consuming `budget`
 *  tiles of travel. Replans when the goal moved or the plan ran out. Returns
 *  the travel budget left over once the van is within `arrive` of the goal
 *  (so a tick that finishes the drive can spend the remainder on repair).
 *  `map` undefined ⇒ straight-line fallback (unit fixtures with no routes). */
function driveToward(
  v: Van,
  gx: number,
  gy: number,
  budget: number,
  map: CityMap | undefined,
  arrive: number,
): number {
  if (Math.hypot(v.x - gx, v.y - gy) <= arrive) {
    clearPath(v);
    return budget;
  }
  // (re)plan if the goal changed or we have no usable path
  const stale =
    !v.path ||
    v.path.length === 0 ||
    v.goalX === undefined ||
    Math.hypot(v.goalX - gx, (v.goalY ?? gy) - gy) > REPLAN_DIST;
  if (stale) {
    v.path = map ? planRoute(map, v.x, v.y, gx, gy) : [[gx, gy]];
    v.goalX = gx;
    v.goalY = gy;
  }
  const path = v.path!;
  // walk the waypoint list, skipping any we're already on top of
  while (budget > 1e-4 && path.length > 0) {
    const wp = path[0]!;
    const dx = wp[0] - v.x;
    const dy = wp[1] - v.y;
    const d = Math.hypot(dx, dy);
    if (d <= 0.05) {
      path.shift();
      continue;
    }
    const step = Math.min(d, budget);
    v.x += (dx / d) * step;
    v.y += (dy / d) * step;
    budget -= step;
    if (step >= d - 1e-6) path.shift();
    if (Math.hypot(v.x - gx, v.y - gy) <= arrive) {
      clearPath(v);
      break;
    }
  }
  return budget;
}

export function stepFleet(
  vans: Van[],
  jobs: Map<number, RepairJob>,
  assets: Iterable<PlacedAsset>,
  dtMin: number,
  map?: CityMap,
): FleetOutcome {
  const outcome: FleetOutcome = { restored: [] };
  const homes = depots(assets);

  // assign waiting jobs to nearest free vans
  for (const job of jobs.values()) {
    const assigned = vans.some((v) => v.jobBranch === job.branchId);
    if (assigned) continue;
    let best: Van | undefined;
    let bestD = Infinity;
    for (const v of vans) {
      if (v.jobBranch !== undefined) continue;
      const d = Math.hypot(v.x - job.x, v.y - job.y);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    if (best) {
      best.jobBranch = job.branchId;
      clearPath(best); // re-route from here to the new job
    }
  }

  // move and work
  for (const v of vans) {
    let budget = VAN_SPEED_TILES_PER_MIN * dtMin;
    if (v.jobBranch !== undefined) {
      const job = jobs.get(v.jobBranch);
      if (!job) {
        v.jobBranch = undefined;
        clearPath(v);
      } else {
        budget = driveToward(v, job.x, job.y, budget, map, 0.5);
        if (Math.hypot(v.x - job.x, v.y - job.y) <= 0.5) {
          // on site: whatever of the tick wasn't spent driving goes into work
          job.repairMin -= budget / VAN_SPEED_TILES_PER_MIN;
          if (job.repairMin <= 0) {
            jobs.delete(job.branchId);
            outcome.restored.push({ branchId: job.branchId, assetId: job.assetId, by: 'crew' });
            v.jobBranch = undefined;
            clearPath(v);
          }
        }
        continue;
      }
    }
    // idle: drive home to the nearest depot (on the roads)
    if (homes.length > 0) {
      let home = homes[0];
      let hd = Infinity;
      for (const h of homes) {
        const d = Math.hypot(v.x - h.x, v.y - h.y);
        if (d < hd) {
          hd = d;
          home = h;
        }
      }
      if (home && hd > 0.5) {
        driveToward(v, home.x, home.y, budget, map, 0.5);
      } else {
        clearPath(v);
      }
    }
  }

  // contractor fallback for jobs nobody is coming to
  for (const job of [...jobs.values()]) {
    const assigned = vans.some((v) => v.jobBranch === job.branchId);
    if (assigned) continue;
    job.waitedMin += dtMin;
    if (job.waitedMin >= CONTRACTOR_MIN) {
      jobs.delete(job.branchId);
      outcome.restored.push({ branchId: job.branchId, assetId: job.assetId, by: 'contractor' });
    }
  }

  return outcome;
}
