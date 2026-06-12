// Asset ageing & condition (ROADMAP #15) + planned maintenance windows
// (#16): the derived health curve, the fault-hazard coupling, like-for-
// like replacement, the 01:00–05:00 maintenance lifecycle, and the
// additive save shape.

import { describe, expect, it } from 'vitest';
import { lineBranchId, txBranchId, type PlacedAsset } from '../src/sim/assets';
import { applyCommand } from '../src/sim/commands';
import {
  assetHealth,
  healthHazardMul,
  maintenanceBranchOf,
  maintenanceCutsSupply,
  maintRateYrK,
  MAINT_CAUSE,
  MAINT_COST_FRAC,
  networkHealthPct,
  nextMaintenanceStart,
  REPLACE_COST_FRAC,
  STORM_EXPOSURE_MUL,
} from '../src/sim/reliability/ageing';
import { rollFaults } from '../src/sim/reliability/faults';
import { assetCapexK } from '../src/sim/regulation/bill';
import { Rng } from '../src/sim/rng';
import { deserialize, serialize, type SaveData } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { mustApply, poweredFixture } from './helpers';

const YEAR_MIN = 525_600;

function ugLine(builtAtMin?: number): PlacedAsset {
  return {
    id: 1,
    kind: 'line',
    level: 132,
    build: 'underground',
    a: 100,
    b: 101,
    lengthTiles: 20,
    capexK: 0,
    builtAtMin,
  };
}

function ohLine(builtAtMin?: number): PlacedAsset {
  return { ...ugLine(builtAtMin), build: 'overhead' } as PlacedAsset;
}

describe('derived health curve (#15)', () => {
  it('new kit reads 100; 40 game-years wears to 0; values clamp', () => {
    expect(assetHealth(ugLine(0), 0)).toBe(100);
    expect(assetHealth(ohLine(0), 0)).toBe(100);
    // weatherproof kit hits 0 exactly at the 40-year asset life…
    expect(assetHealth(ugLine(0), 40 * YEAR_MIN)).toBe(0);
    // …overhead kit weathers 1.15× and bottoms out earlier (clamped)
    expect(assetHealth(ohLine(0), 40 * YEAR_MIN)).toBe(0);
    expect(assetHealth(ohLine(0), (40 / STORM_EXPOSURE_MUL) * YEAR_MIN)).toBeCloseTo(0, 6);
    // halfway: 50 for sheltered kit, less for exposed kit
    expect(assetHealth(ugLine(0), 20 * YEAR_MIN)).toBeCloseTo(50, 6);
    expect(assetHealth(ohLine(0), 20 * YEAR_MIN)).toBeCloseTo(100 - 50 * 1.15, 6);
    // builtAtMin in the future / absent both clamp sensibly
    expect(assetHealth(ugLine(99 * YEAR_MIN), 0)).toBe(100);
    expect(assetHealth(ugLine(undefined), 10 * YEAR_MIN)).toBeCloseTo(75, 6); // hydrates to 0
  });

  it('sustained high loading accelerates wear up to 1.6×', () => {
    const t = 20 * YEAR_MIN;
    const idle = assetHealth(ugLine(0), t, 0);
    const half = assetHealth(ugLine(0), t, 0.5);
    const full = assetHealth(ugLine(0), t, 1);
    expect(full).toBeLessThan(half);
    expect(half).toBeLessThan(idle);
    expect(full).toBeCloseTo(100 - 50 * 1.6, 6);
    // hook clamps outside 0..1
    expect(assetHealth(ugLine(0), t, 7)).toBeCloseTo(full, 6);
    expect(assetHealth(ugLine(0), t, -1)).toBeCloseTo(idle, 6);
  });

  it('hazard curve: 1× at health ≥70 rising linearly to 3× at 10', () => {
    expect(healthHazardMul(100)).toBe(1);
    expect(healthHazardMul(70)).toBe(1);
    expect(healthHazardMul(40)).toBeCloseTo(2, 6);
    expect(healthHazardMul(10)).toBeCloseTo(3, 6);
    expect(healthHazardMul(0)).toBe(3); // clamped below 10
  });

  it('an aged line faults more than a new one under the identical seed', () => {
    const endpoints: PlacedAsset[] = [
      { id: 100, kind: 'sub', sub: 'grid', x: 0, y: 0 },
      { id: 101, kind: 'sub', sub: 'grid', x: 20, y: 0 },
    ];
    const count = (simTimeMin: number): number => {
      const line = ohLine(0);
      const byId = new Map<number, PlacedAsset>([
        [1, line],
        [100, endpoints[0] as PlacedAsset],
        [101, endpoints[1] as PlacedAsset],
      ]);
      const rng = new Rng(7);
      let n = 0;
      for (let i = 0; i < 4000; i++) {
        n += rollFaults([line], byId, new Set(), new Map(), 0.95, rng, 120, simTimeMin).length;
      }
      return n;
    };
    const fresh = count(0); // health 100 → hazard ×1
    const aged = count(38 * YEAR_MIN); // health ≈ 0 → hazard ×3
    expect(fresh).toBeGreaterThan(5); // both see real fault counts
    expect(aged).toBeGreaterThan(fresh * 1.5);
  });

  it('networkHealthPct averages player lines + subs and skips iDNO kit', () => {
    const { state } = poweredFixture();
    expect(networkHealthPct(state)).toBeCloseTo(100, 6);
    state.simTimeMin = 20 * YEAR_MIN;
    const aged = networkHealthPct(state);
    expect(aged).toBeLessThan(60);
    expect(aged).toBeGreaterThan(30);
    // the iDNO's substation never moves the average
    state.assets.set(999, { id: 999, kind: 'sub', sub: 'dist', x: 2, y: 25, idno: true });
    expect(networkHealthPct(state)).toBeCloseTo(aged, 9);
  });
});

describe('replace like-for-like (#15)', () => {
  it('resets builtAtMin, charges 70% of current capex, and undoes clean', () => {
    const { state, ctx, ids } = poweredFixture();
    const line = state.assets.get(ids.line33);
    if (!line || line.kind !== 'line') throw new Error('fixture');
    state.simTimeMin = 30 * YEAR_MIN;
    expect(assetHealth(line, state.simTimeMin)).toBeLessThan(20);

    const before = serialize(state); // what the worker's undo stack holds
    const r = applyCommand(state, ctx.map, { type: 'replaceAsset', assetId: ids.line33 });
    expect(r.ok).toBe(true);
    expect(line.builtAtMin).toBe(state.simTimeMin);
    expect(assetHealth(line, state.simTimeMin)).toBe(100);
    expect(state.maintYrK).toBe(Math.round(REPLACE_COST_FRAC * line.capexK));

    // undo = restore the pre-command snapshot: age and charge both revert
    const undone = deserialize(before);
    const old = undone.assets.get(ids.line33);
    if (!old || old.kind !== 'line') throw new Error('restore');
    expect(old.builtAtMin).toBe(0);
    expect(undone.maintYrK).toBeUndefined();
  });

  it('refuses iDNO kit and anything that is not a line/substation', () => {
    const { state, ctx, ids } = poweredFixture();
    state.assets.set(999, { id: 999, kind: 'sub', sub: 'dist', x: 2, y: 25, idno: true });
    expect(applyCommand(state, ctx.map, { type: 'replaceAsset', assetId: 999 }).ok).toBe(false);
    expect(applyCommand(state, ctx.map, { type: 'replaceAsset', assetId: ids.gas }).ok).toBe(
      false,
    );
    // a substation replaces at its CURRENT (fitted) capex
    const sub = state.assets.get(ids.grid);
    if (!sub || sub.kind !== 'sub') throw new Error('fixture');
    const r = applyCommand(state, ctx.map, { type: 'replaceAsset', assetId: ids.grid });
    expect(r.ok).toBe(true);
    expect(state.maintYrK).toBe(Math.round(REPLACE_COST_FRAC * assetCapexK(sub)));
  });
});

describe('planned maintenance windows (#16)', () => {
  it('targets the next 01:00 window', () => {
    expect(nextMaintenanceStart(0)).toBe(60); // 00:00 → 01:00 today
    expect(nextMaintenanceStart(60)).toBe(60); // exactly 01:00 → now
    expect(nextMaintenanceStart(120)).toBe(60 + 1440); // 02:00 → tomorrow
    expect(nextMaintenanceStart(1320)).toBe(1500); // 22:00 → 01:00 tonight
  });

  it('applies at 01:00 as a planned outage (no fleet job), accrues CML on a radial, clears at 05:00 and restores ~+25 health', () => {
    const { state, ctx, ids } = poweredFixture();
    const line = state.assets.get(ids.line33);
    if (!line || line.kind !== 'line') throw new Error('fixture');
    state.simTimeMin = 1320; // 22:00
    line.builtAtMin = state.simTimeMin - 20 * YEAR_MIN; // well-worn feeder
    const branchId = lineBranchId(ids.line33);
    const healthBefore = assetHealth(line, state.simTimeMin);

    const r = applyCommand(state, ctx.map, {
      type: 'scheduleMaintenance',
      assetId: ids.line33,
    });
    expect(r.ok).toBe(true);
    expect(state.maintenance).toEqual([{ branchId, startMin: 1500, durMin: 240 }]);
    expect(state.maintYrK).toBe(Math.round(MAINT_COST_FRAC * line.capexK));
    // one window per branch
    expect(
      applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: ids.line33 }).ok,
    ).toBe(false);

    state.speed = 4; // 30 game-min ticks
    const d = derive(state, ctx);
    let sawOutage = false;
    let cmlInWindow = 0;
    for (let i = 0; i < 24; i++) {
      advanceTime(state);
      const cmlBefore = state.reliability.cmlCustomerMin;
      const out = solveTick(state, ctx, d, true);
      if (state.simTimeMin < 1500) {
        expect(state.outages.has(branchId)).toBe(false);
      } else if (state.simTimeMin < 1740) {
        sawOutage = true;
        expect(state.outages.has(branchId)).toBe(true);
        expect(state.outageCause.get(branchId)).toBe(MAINT_CAUSE);
        expect(state.jobs.size).toBe(0); // planned work books no repair crew
        expect(out.servedCustomers).toBe(0); // the radial feeder is out
        cmlInWindow += state.reliability.cmlCustomerMin - cmlBefore;
      }
    }
    expect(sawOutage).toBe(true);
    expect(cmlInWindow).toBeGreaterThan(0); // customers dark → CML accrues
    // window over: outage + cause cleared, queue empty, condition up ~25
    expect(state.simTimeMin).toBeGreaterThanOrEqual(1740);
    expect(state.outages.has(branchId)).toBe(false);
    expect(state.outageCause.has(branchId)).toBe(false);
    expect(state.maintenance).toBeUndefined();
    expect(assetHealth(line, state.simTimeMin) - healthBefore).toBeCloseTo(25, 1);
    // the one-off charge rides the constraint/damages bill line
    const bill = solveTick(state, ctx, d, false).bill;
    expect(bill.constraintYrK).toBeGreaterThan(0);
    expect(bill.constraintYrK).toBeCloseTo(state.maintYrK ?? 0, 6);
  });

  it('an N-1 secure catchment rides the window through with zero CML', () => {
    const { state, ctx, ids } = poweredFixture();
    // close the radial into a loop: a second 33 kV circuit on the route
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'underground', ax: 15, ay: 15, bx: 18, by: 18 },
    });
    const branchId = lineBranchId(ids.line33);
    // the inspector's warning agrees: duplicated feeder → no supply cut
    expect(maintenanceCutsSupply(state.assets.values(), branchId)).toBe(false);

    state.simTimeMin = 1320;
    expect(
      applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: ids.line33 }).ok,
    ).toBe(true);
    state.speed = 4;
    const d = derive(state, ctx);
    let sawOutage = false;
    for (let i = 0; i < 24; i++) {
      advanceTime(state);
      const out = solveTick(state, ctx, d, true);
      if (state.simTimeMin >= 1500 && state.simTimeMin < 1740) {
        sawOutage = true;
        expect(state.outages.has(branchId)).toBe(true);
        expect(out.servedCustomers).toBe(360); // the loop carries the load
      }
    }
    expect(sawOutage).toBe(true);
    expect(state.reliability.cmlCustomerMin).toBe(0); // nobody lost supply
  });

  it('warns when the outage WOULD cut supply, and refuses kit with nothing to switch', () => {
    const { state, ctx, ids } = poweredFixture();
    // radial: switching the feeder out blacks the catchment out
    expect(maintenanceCutsSupply(state.assets.values(), lineBranchId(ids.line33))).toBe(true);
    // a grid sub's transformer is a real switchable branch…
    const grid = state.assets.get(ids.grid);
    if (!grid || grid.kind !== 'sub') throw new Error('fixture');
    expect(maintenanceBranchOf(grid)).toBe(txBranchId(ids.grid, 0));
    // …a single-winding dist sub has no modelled branch: refused
    const dist = state.assets.get(ids.dist);
    if (!dist || dist.kind !== 'sub') throw new Error('fixture');
    expect(maintenanceBranchOf(dist)).toBeUndefined();
    expect(
      applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: ids.dist }).ok,
    ).toBe(false);
    // iDNO kit is not yours to maintain
    state.assets.set(999, { id: 999, kind: 'sub', sub: 'dist', x: 2, y: 25, idno: true });
    expect(
      applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: 999 }).ok,
    ).toBe(false);
  });

  it('the rolling maintenance rate decays back toward zero', () => {
    const { state, ctx, ids } = poweredFixture();
    state.simTimeMin = 1320;
    applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: ids.line33 });
    const charged = state.maintYrK ?? 0;
    expect(charged).toBeGreaterThan(0);
    expect(maintRateYrK(state, 0)).toBe(charged); // paused re-solves decay nothing
    maintRateYrK(state, YEAR_MIN);
    expect(state.maintYrK ?? 0).toBeLessThan(charged * 0.6);
  });
});

describe('save shape (#15/#16, additive)', () => {
  it('round-trips builtAtMin, maintenance queue and the rolling rate', () => {
    const { state, ctx, ids } = poweredFixture();
    const line = state.assets.get(ids.line33);
    if (!line || line.kind !== 'line') throw new Error('fixture');
    state.simTimeMin = 1320;
    line.builtAtMin = 777;
    applyCommand(state, ctx.map, { type: 'scheduleMaintenance', assetId: ids.line33 });

    const loaded = deserialize(serialize(state));
    const l2 = loaded.assets.get(ids.line33);
    if (!l2 || l2.kind !== 'line') throw new Error('restore');
    expect(l2.builtAtMin).toBe(777);
    expect(loaded.maintenance).toEqual(state.maintenance);
    expect(loaded.maintYrK).toBe(state.maintYrK);
  });

  it('pre-ageing saves hydrate clean: kit ages from game start', () => {
    const { state } = poweredFixture();
    const data = serialize(state) as SaveData & Record<string, unknown>;
    delete data.maintenance;
    delete data.maintYrK;
    for (const a of data.assets) {
      if (a.kind === 'line' || a.kind === 'sub') delete a.builtAtMin;
    }
    const loaded = deserialize(data);
    expect(loaded.maintenance).toBeUndefined();
    expect(loaded.maintYrK).toBeUndefined();
    const line = loaded.assets.get(2);
    expect(networkHealthPct(loaded)).toBeCloseTo(100, 6); // simTimeMin 0
    loaded.simTimeMin = 20 * YEAR_MIN;
    expect(networkHealthPct(loaded)).toBeLessThan(60); // builtAtMin → 0
    expect(line).toBeDefined();
  });
});
