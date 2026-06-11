// The orange vans. Faults raise repair jobs; free vans race to site
// (travel time is real — depot placement matters), fix, and head home.
// Too few vans in a storm and the job queue — and the CML clock — runs
// away. With no fleet at all, contractors eventually turn up.

import type { PlacedAsset } from '../assets';

export const VAN_SPEED_TILES_PER_MIN = 1.0;
/** Unstaffed jobs get fixed by contractors after this long. */
export const CONTRACTOR_MIN = 2880;
export const MAX_VANS = 12;

export interface Van {
  id: number;
  x: number;
  y: number;
  /** Branch id of the assigned job, if any. */
  jobBranch?: number | undefined;
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

export function stepFleet(
  vans: Van[],
  jobs: Map<number, RepairJob>,
  assets: Iterable<PlacedAsset>,
  dtMin: number,
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
    if (best) best.jobBranch = job.branchId;
  }

  // move and work
  for (const v of vans) {
    let budget = VAN_SPEED_TILES_PER_MIN * dtMin;
    if (v.jobBranch !== undefined) {
      const job = jobs.get(v.jobBranch);
      if (!job) {
        v.jobBranch = undefined;
      } else {
        const dist = Math.hypot(v.x - job.x, v.y - job.y);
        if (dist > 0.5) {
          const step = Math.min(dist, budget);
          v.x += ((job.x - v.x) / dist) * step;
          v.y += ((job.y - v.y) / dist) * step;
          budget -= step;
        }
        if (Math.hypot(v.x - job.x, v.y - job.y) <= 0.5) {
          // on site: whatever of the tick wasn't spent driving goes into work
          job.repairMin -= budget / VAN_SPEED_TILES_PER_MIN;
          if (job.repairMin <= 0) {
            jobs.delete(job.branchId);
            outcome.restored.push({ branchId: job.branchId, assetId: job.assetId, by: 'crew' });
            v.jobBranch = undefined;
          }
        }
        continue;
      }
    }
    // idle: drift home to the nearest depot
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
        const step = Math.min(hd, budget);
        v.x += ((home.x - v.x) / hd) * step;
        v.y += ((home.y - v.y) / hd) * step;
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
