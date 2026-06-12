// Asset ageing & condition (ROADMAP #15) and planned maintenance windows
// (ROADMAP #16). Health is DERIVED, never stored: every line/substation
// carries an optional `builtAtMin` (absent = built at campaign start —
// old saves hydrate to 0, so existing campaigns' kit starts ageing from
// game start; an accepted, documented migration), and condition is a
// pure function of age, sustained loading and weather exposure. That
// keeps saves additive and the sim deterministic — no per-tick decay
// state to drift.
//
// The model:
//   health = 100 − age · baseRate · loadAccel · exposure   (clamped 0..100)
// - baseRate wears kit from 100 to 0 over ASSET_LIFE_YEARS (40 game-
//   years — the same life the annuity already assumes, catalog.ts).
// - loadAccel: sustained high loading accelerates ageing linearly up to
//   LOAD_ACCEL_MAX (1.6×) at loadingEmaFrac = 1. The COARSE HOOK: the
//   sim passes min(1, heat/OVERLOAD_HEAT_REF) off the existing per-
//   branch overload-heat accumulator (state.heat), so only kit that has
//   recently run past its rating ages faster — nominal loading below
//   rating contributes nothing. A deliberate simplification: cheap (the
//   accumulator already exists), deterministic, and it punishes exactly
//   the sweating the player can see. Callers without heat data (the UI
//   card) omit the argument and read the unaccelerated curve.
// - exposure: overhead lines and outdoor (AIS) substations weather every
//   storm that crosses the licence area, so they carry a constant
//   STORM_EXPOSURE_MUL (1.15×) — a deterministic average-climate factor,
//   NOT a stochastic accumulator (health must stay a pure function).
//   Underground cables and GIS rebuilds are weatherproof: 1.0×.
//
// Fault coupling: rollFaults multiplies each line/transformer hazard by
// healthHazardMul — 1× while health ≥ HAZARD_HEALTHY (70), rising
// LINEARLY to HAZARD_MAX (3×) at health = HAZARD_FLOOR_HEALTH (10) and
// clamped there below: mul = min(3, 1 + 2·(70 − h)/60). New kit faults
// at today's calibrated rates; end-of-life kit faults three times as
// often. The RNG draw count per asset is unchanged, so seeds replay.
//
// Money: replacement (70% of current capex — like-for-like reuses the
// easements, civils, foundations and consents of the standing asset,
// which is why it's cheaper than a greenfield build) and maintenance
// (10% of capex) are one-off spends charged into a rolling annualized
// `state.maintYrK` rate with a one-game-year tau, the exact sibling of
// stormprep.ts's stormPrepYrK: the decaying rate integrates back to the
// £k spent and rides computeBill's penaltyYrK input (the constraint/
// damages line) via the single tick.ts call site.

import {
  assetOfId,
  busId,
  deriveNetwork,
  lineBranchId,
  txBranchId,
  type PlacedAsset,
} from '../assets';
import { ASSET_LIFE_YEARS, GENS, SUBS } from '../catalog';
import { assetCapexK } from '../regulation/bill';
import { pushEvent, type GameState, type MaintenanceWindow } from '../state';
import type { CommandResult } from '../commands';

const MIN_PER_YEAR = 525_600;

// ----------------------------------------------------------------------
// Derived health.

/** Sustained loading accelerates ageing up to this multiple. */
export const LOAD_ACCEL_MAX = 1.6;
/** Constant weathering factor for overhead lines / outdoor substations. */
export const STORM_EXPOSURE_MUL = 1.15;
/** Hazard curve anchors: 1× at and above 70, HAZARD_MAX at and below 10. */
export const HAZARD_HEALTHY = 70;
export const HAZARD_FLOOR_HEALTH = 10;
export const HAZARD_MAX = 3;
/** Overload heat that reads as "fully loaded" for the ageing hook —
 *  mirrors tick.ts's TRIP_HEAT (kept local to avoid an import cycle:
 *  tick → faults → ageing). */
export const OVERLOAD_HEAT_REF = 60;

/** UI thresholds: the inspector offers replacement below 50% health and
 *  a maintenance window below 80%. */
export const REPLACE_HEALTH_BELOW = 50;
export const MAINT_HEALTH_BELOW = 80;

/** Like-for-like replacement price, as a fraction of current capex —
 *  cheaper than new build because the route's easements, civils and
 *  consents are already paid for. */
export const REPLACE_COST_FRAC = 0.7;
/** A maintenance night prices at this fraction of the asset's capex. */
export const MAINT_COST_FRAC = 0.1;
/** Completed maintenance restores roughly this many health points. */
export const MAINT_RESTORE_POINTS = 25;
/** Maintenance windows run 01:00–05:00 (off-peak, 4 game-hours). */
export const MAINT_WINDOW_START_MIN = 60;
export const MAINT_WINDOW_DUR_MIN = 240;

/** Weathering multiplier of one asset (see header). */
function exposureOf(a: PlacedAsset): number {
  if (a.kind === 'line') return a.build === 'overhead' ? STORM_EXPOSURE_MUL : 1;
  if (a.kind === 'sub') return a.underground ? 1 : STORM_EXPOSURE_MUL;
  return 1;
}

/** Base + exposure wear rate, health points per game-minute (the load
 *  hook multiplies on top per call — it varies, the rest doesn't). */
function wearPerMin(a: PlacedAsset): number {
  return (100 / (ASSET_LIFE_YEARS * MIN_PER_YEAR)) * exposureOf(a);
}

/** Condition of an asset, 0..100, derived (never stored). See header
 *  for the model; `loadingEmaFrac` is the optional coarse loading hook
 *  (the sim passes the overload-heat fraction; omit for the base curve). */
export function assetHealth(
  asset: PlacedAsset,
  simTimeMin: number,
  loadingEmaFrac?: number,
): number {
  // only lines/subs carry builtAtMin; other kinds read as new (100)
  if (asset.kind !== 'line' && asset.kind !== 'sub') return 100;
  const ageMin = Math.max(0, simTimeMin - (asset.builtAtMin ?? 0));
  const accel = 1 + (LOAD_ACCEL_MAX - 1) * Math.min(1, Math.max(0, loadingEmaFrac ?? 0));
  return Math.min(100, Math.max(0, 100 - ageMin * wearPerMin(asset) * accel));
}

/** Fault-hazard multiplier for a health value (see header for the curve). */
export function healthHazardMul(health: number): number {
  if (health >= HAZARD_HEALTHY) return 1;
  return Math.min(
    HAZARD_MAX,
    1 + (HAZARD_MAX - 1) * ((HAZARD_HEALTHY - health) / (HAZARD_HEALTHY - HAZARD_FLOOR_HEALTH)),
  );
}

/** The coarse loading hook off the overload-heat accumulator. */
export function loadingFracFromHeat(
  heat: ReadonlyMap<number, number> | undefined,
  branchId: number,
): number {
  return Math.min(1, (heat?.get(branchId) ?? 0) / OVERLOAD_HEAT_REF);
}

/** Restore `points` of health by moving builtAtMin forward at the
 *  asset's base+exposure wear rate (the load hook is left out — coarse,
 *  so "+25 points" is exact for kit running inside its rating). Capped
 *  so health never derives above 100. */
export function restoreHealth(asset: PlacedAsset, simTimeMin: number, points: number): void {
  if (asset.kind !== 'line' && asset.kind !== 'sub') return;
  const deltaMin = points / wearPerMin(asset);
  asset.builtAtMin = Math.min(simTimeMin, (asset.builtAtMin ?? 0) + deltaMin);
}

/** Average network health, % — the KPI dashboard's headline condition
 *  stat. Player-owned lines and substations only (the iDNO sweats its
 *  own kit); 100 on an empty board. Uses the heat hook per branch. */
export function networkHealthPct(state: GameState): number {
  let sum = 0;
  let n = 0;
  for (const a of state.assets.values()) {
    if (a.kind === 'line') {
      sum += assetHealth(a, state.simTimeMin, loadingFracFromHeat(state.heat, lineBranchId(a.id)));
      n++;
    } else if (a.kind === 'sub' && !a.idno) {
      sum += assetHealth(a, state.simTimeMin, loadingFracFromHeat(state.heat, txBranchId(a.id, 0)));
      n++;
    }
  }
  return n > 0 ? sum / n : 100;
}

// ----------------------------------------------------------------------
// Money: the rolling maintenance & replacement rate (stormPrepYrK's
// sibling — see that file for the integral-equals-spend argument).

const MAINT_TAU_MIN = 525_600;

function chargeMaint(state: GameState, costK: number): void {
  state.maintYrK = (state.maintYrK ?? 0) + costK;
}

/** Rolling annualized maintenance/replacement spend, £k/yr. Decays by
 *  dtMin (0 = paused/command re-solves decay nothing) and returns the
 *  rate; called once per solveTick at the computeBill site, where it
 *  rides penaltyYrK beside stormPrepYrK. */
export function maintRateYrK(state: GameState, dtMin: number): number {
  const cur = state.maintYrK ?? 0;
  if (dtMin > 0 && cur > 0) {
    const next = cur * (1 - dtMin / (dtMin + MAINT_TAU_MIN));
    state.maintYrK = next < 0.001 ? undefined : next;
  }
  return state.maintYrK ?? 0;
}

// ----------------------------------------------------------------------
// Commands (commands.ts delegates here whole, the stormprep pattern).

function assetLabel(a: PlacedAsset): string {
  if (a.kind === 'line') return `${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'}`;
  if (a.kind === 'sub') return SUBS[a.sub].name.split(' (')[0] ?? 'substation';
  return 'asset';
}

/** Like-for-like replacement: new kit on the old easements. Resets
 *  builtAtMin to now (health → 100) and charges REPLACE_COST_FRAC of
 *  the asset's CURRENT capex (a bigger fitted transformer or an uprated
 *  conductor replaces at its upgraded price). Undo-safety is free: the
 *  worker snapshots state before every mutating command and builtAtMin
 *  rides PlacedAsset serialization. No assetsVersion bump — topology
 *  and ratings are unchanged. */
export function applyReplaceAsset(state: GameState, assetId: number): CommandResult {
  const asset = state.assets.get(assetId);
  if (!asset || (asset.kind !== 'line' && asset.kind !== 'sub')) {
    return { ok: false, error: 'only lines and substations replace like-for-like' };
  }
  if (asset.kind === 'sub' && asset.idno) {
    return { ok: false, error: "that's the iDNO's kit to sweat, not yours" };
  }
  const costK = Math.round(REPLACE_COST_FRAC * assetCapexK(asset));
  asset.builtAtMin = state.simTimeMin;
  // new iron starts cold: clear any overload history on its branches
  if (asset.kind === 'line') {
    state.heat.delete(lineBranchId(asset.id));
  } else {
    state.heat.delete(txBranchId(asset.id, 0));
    state.heat.delete(txBranchId(asset.id, 1));
  }
  chargeMaint(state, costK);
  pushEvent(
    state,
    'info',
    `${assetLabel(asset)} replaced like-for-like (£${costK}k) — good as new on the old easements`,
    asset.kind === 'sub' ? asset.x : undefined,
    asset.kind === 'sub' ? asset.y : undefined,
  );
  return { ok: true };
}

/** The game-minute the next 01:00 maintenance window opens. */
export function nextMaintenanceStart(nowMin: number): number {
  const ahead = (MAINT_WINDOW_START_MIN - (nowMin % 1440) + 1440) % 1440;
  return nowMin + ahead;
}

/** The branch a maintenance night switches out: a line's own branch, or
 *  a substation's top transformer pair (the unit faults.ts faults).
 *  Single-level subs (dist/pole/vault/tee) have no modelled branch. */
export function maintenanceBranchOf(asset: PlacedAsset): number | undefined {
  if (asset.kind === 'line') return lineBranchId(asset.id);
  if (asset.kind === 'sub' && SUBS[asset.sub].levels.length >= 2) return txBranchId(asset.id, 0);
  return undefined;
}

/** Queue a planned-maintenance outage for the next 01:00–05:00 window.
 *  The crew is booked (and the 10%-of-capex cost charged) at scheduling
 *  time; tick.ts opens and closes the window. */
export function applyScheduleMaintenance(state: GameState, assetId: number): CommandResult {
  const asset = state.assets.get(assetId);
  if (!asset || (asset.kind !== 'line' && asset.kind !== 'sub')) {
    return { ok: false, error: 'only lines and substations take maintenance windows' };
  }
  if (asset.kind === 'sub' && asset.idno) {
    return { ok: false, error: "that's the iDNO's kit to maintain, not yours" };
  }
  const branchId = maintenanceBranchOf(asset);
  if (branchId === undefined) {
    return { ok: false, error: 'nothing to switch out at that substation' };
  }
  if ((state.maintenance ?? []).some((m) => m.branchId === branchId)) {
    return { ok: false, error: 'maintenance already scheduled there' };
  }
  if (state.outages.has(branchId)) {
    return { ok: false, error: 'that kit is already out of service' };
  }
  const costK = Math.round(MAINT_COST_FRAC * assetCapexK(asset));
  state.maintenance = [
    ...(state.maintenance ?? []),
    {
      branchId,
      startMin: nextMaintenanceStart(state.simTimeMin),
      durMin: MAINT_WINDOW_DUR_MIN,
    },
  ];
  chargeMaint(state, costK);
  pushEvent(
    state,
    'info',
    `maintenance scheduled on the ${assetLabel(asset)} — tonight 01:00–05:00 (£${costK}k)`,
  );
  return { ok: true };
}

// ----------------------------------------------------------------------
// The tick hook: open windows as planned outages, close them on time.

/** Why a branch is out during its window (flows to the inspector). */
export const MAINT_CAUSE = 'planned maintenance';

/** Open due maintenance windows as planned outages and complete expired
 *  ones (restore health, clear the outage). Called once per accumulating
 *  tick, after the outage auto-reclose loop and before the fleet step —
 *  a planned outage carries a timer like a thermal trip and NEVER opens
 *  a repair job, so no van rolls. A branch already out at window start
 *  (a fault beat us to it) is left to its repair; the night still
 *  completes — the crew is on site either way — but only a planned
 *  outage is cleared here. */
export function applyMaintenanceWindows(state: GameState): void {
  if (!state.maintenance || state.maintenance.length === 0) return;
  const now = state.simTimeMin;
  const keep: MaintenanceWindow[] = [];
  for (const m of state.maintenance) {
    const endMin = m.startMin + m.durMin;
    if (now >= endMin) {
      // window over: planned outage off, condition restored
      if (state.outageCause.get(m.branchId) === MAINT_CAUSE) {
        state.outages.delete(m.branchId);
        state.outageCause.delete(m.branchId);
        state.heat.delete(m.branchId);
      }
      const asset = state.assets.get(assetOfId(m.branchId));
      if (asset && (asset.kind === 'line' || asset.kind === 'sub')) {
        restoreHealth(asset, now, MAINT_RESTORE_POINTS);
        pushEvent(
          state,
          'info',
          `maintenance complete: ${assetLabel(asset)} back in service, condition restored`,
        );
      }
      continue;
    }
    if (now >= m.startMin && !state.outages.has(m.branchId)) {
      state.outages.set(m.branchId, endMin - now);
      state.outageCause.set(m.branchId, MAINT_CAUSE);
      const asset = state.assets.get(assetOfId(m.branchId));
      pushEvent(
        state,
        'info',
        `planned maintenance: ${asset ? assetLabel(asset) : 'kit'} switched out until 05:00`,
      );
    }
    keep.push(m);
  }
  state.maintenance = keep.length > 0 ? keep : undefined;
}

// ----------------------------------------------------------------------
// The inspector's outage-impact warning.

/** Would switching `branchId` out cut any service substation off from
 *  all generation? A pure topological screen over the INTACT network
 *  (mirrors security.ts's reachability; concurrent faults only make
 *  things worse — this is a warning before queuing, not a gate). The
 *  UI runs it off snapshot assets; under-construction plant counts as
 *  a source, exactly like securityOf. */
export function maintenanceCutsSupply(
  assets: Iterable<PlacedAsset>,
  branchId: number,
): boolean {
  const list = [...assets];
  const net = deriveNetwork(list);
  const adj = new Map<number, Array<{ to: number; br: number }>>();
  for (const bus of net.buses) adj.set(bus.id, []);
  for (const br of net.branches) {
    adj.get(br.from)?.push({ to: br.to, br: br.id });
    adj.get(br.to)?.push({ to: br.from, br: br.id });
  }
  const reach = (skipBr: number): Set<number> => {
    const seen = new Set<number>();
    const queue: number[] = [];
    for (const a of list) {
      if (a.kind !== 'gen') continue;
      const b = busId(a.id, GENS[a.gen].level);
      if (!seen.has(b)) {
        seen.add(b);
        queue.push(b);
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
  };
  const before = reach(-1);
  const after = reach(branchId);
  for (const a of list) {
    if (a.kind !== 'sub' || SUBS[a.sub].serviceRadius === undefined) continue;
    const bus = busId(a.id, 33);
    if (before.has(bus) && !after.has(bus)) return true;
  }
  return false;
}
