import { describe, expect, it } from 'vitest';
import { lineBranchId } from '../src/sim/assets';
import { growVegetation, rollFaults } from '../src/sim/reliability/faults';
import { stepFleet, syncVans, type RepairJob, type Van } from '../src/sim/fleet/fleet';
import { kpiRates, updateReliability } from '../src/sim/regulation/kpis';
import { COV } from '../src/sim/coverage';
import { Rng } from '../src/sim/rng';
import { advanceTime, AWAITING_CREW, derive, solveTick } from '../src/sim/tick';
import { makeTestMap, mustApply, poweredFixture } from './helpers';
import type { PlacedAsset } from '../src/sim/assets';

function lineAsset(id: number, build: 'overhead' | 'underground', len = 20): PlacedAsset {
  return { id, kind: 'line', level: 132, build, a: 100, b: 101, lengthTiles: len, capexK: 0 };
}

const endpoints: PlacedAsset[] = [
  { id: 100, kind: 'sub', sub: 'grid', x: 0, y: 0 },
  { id: 101, kind: 'sub', sub: 'grid', x: 20, y: 0 },
];

describe('fault engine', () => {
  it('storms batter overhead lines while underground shrugs', () => {
    const oh = lineAsset(1, 'overhead');
    const ug = lineAsset(2, 'underground');
    const byId = new Map<number, PlacedAsset>([
      [1, oh],
      [2, ug],
      [100, endpoints[0] as PlacedAsset],
      [101, endpoints[1] as PlacedAsset],
    ]);
    const rng = new Rng(7);
    const veg = new Map<number, number>([[1, 0.8]]);
    let ohFaults = 0;
    let ugFaults = 0;
    for (let i = 0; i < 4000; i++) {
      const faults = rollFaults([oh, ug], byId, new Set(), veg, 0.95, rng, 120);
      for (const f of faults) {
        if (f.assetId === 1) ohFaults++;
        else ugFaults++;
      }
    }
    expect(ohFaults).toBeGreaterThan(20);
    expect(ohFaults).toBeGreaterThan(ugFaults * 10);
  });

  it('vegetation grows with woodland density and is tamed by the programme', () => {
    const line = lineAsset(1, 'overhead');
    const routeVeg = new Map([[1, 0.9]]);
    const wild = new Map<number, number>();
    const managed = new Map<number, number>();
    const yearMin = 525_600;
    growVegetation(wild, [line], routeVeg, 1, yearMin);
    growVegetation(managed, [line], routeVeg, 0.12, yearMin);
    expect(wild.get(1) ?? 0).toBeGreaterThan(0.5);
    expect(managed.get(1) ?? 0).toBeLessThan(0.15);
    growVegetation(wild, [line], routeVeg, 1, yearMin * 10);
    expect(wild.get(1)).toBe(1); // capped
  });
});

describe('field fleet', () => {
  const depot: PlacedAsset = { id: 50, kind: 'depot', x: 0, y: 0 };

  it('a van drives to site, repairs, and the job closes', () => {
    const vans: Van[] = syncVans([], 1, [depot]);
    expect(vans).toHaveLength(1);
    const jobs = new Map<number, RepairJob>([
      [
        8,
        { branchId: 8, assetId: 2, x: 30, y: 0, repairMin: 240, waitedMin: 0, label: 'line fault' },
      ],
    ]);
    let restored = false;
    let minutes = 0;
    for (let i = 0; i < 60 && !restored; i++) {
      const out = stepFleet(vans, jobs, [depot], 30);
      minutes += 30;
      restored = out.restored.some((r) => r.branchId === 8 && r.by === 'crew');
    }
    // ~30 min driving + 240 min repair
    expect(restored).toBe(true);
    expect(minutes).toBeGreaterThanOrEqual(270);
    expect(minutes).toBeLessThan(420);
    expect(jobs.size).toBe(0);
  });

  it('with no vans, contractors restore after the long wait', () => {
    const jobs = new Map<number, RepairJob>([
      [8, { branchId: 8, assetId: 2, x: 5, y: 5, repairMin: 240, waitedMin: 0, label: 'fault' }],
    ]);
    let by: string | undefined;
    let minutes = 0;
    for (let i = 0; i < 200 && !by; i++) {
      const out = stepFleet([], jobs, [depot], 60);
      minutes += 60;
      by = out.restored[0]?.by;
    }
    expect(by).toBe('contractor');
    expect(minutes).toBeGreaterThanOrEqual(2880);
  });

  it('no depot means no vans on the road', () => {
    expect(syncVans([], 4, [])).toHaveLength(0);
  });
});

describe('CI / CML', () => {
  it('counts interruptions once and minutes continuously', () => {
    const map = makeTestMap(4, 1);
    map.customers[0] = 100;
    map.customers[1] = 50;
    const totals = { ciCustomers: 0, cmlCustomerMin: 0 };
    const off = new Set<number>();

    const dark = new Uint8Array([COV.off, COV.on, COV.empty, COV.empty]);
    updateReliability(totals, off, dark, map, 30);
    updateReliability(totals, off, dark, map, 30);
    expect(totals.ciCustomers).toBe(100); // one interruption, not two
    expect(totals.cmlCustomerMin).toBe(100 * 60);

    const back = new Uint8Array([COV.on, COV.on, COV.empty, COV.empty]);
    updateReliability(totals, off, back, map, 30);
    updateReliability(totals, off, dark, map, 30); // second interruption
    expect(totals.ciCustomers).toBe(200);

    const rates = kpiRates(totals, 1000, 525_600); // one game-year elapsed
    expect(rates.ciPer100PerYr).toBeCloseTo(20, 6);
    expect(rates.cmlMinPerYr).toBeCloseTo((100 * 90) / 1000, 6);
  });

  it('end-to-end: a faulted feeder racks up CML until the crew restores it', () => {
    const { state, ctx, ids } = poweredFixture();
    mustApply(state, ctx.map, { type: 'build', spec: { kind: 'depot', x: 16, y: 16 } });
    state.fleetSize = 1;
    const branchId = lineBranchId(ids.line33);
    state.outages.set(branchId, AWAITING_CREW);
    state.jobs.set(branchId, {
      branchId,
      assetId: ids.line33,
      x: 17,
      y: 17,
      repairMin: 240,
      waitedMin: 0,
      label: '33 kV line fault',
    });

    state.speed = 4; // 30 game-min per tick
    const d = derive(state, ctx);
    let restoredTick = -1;
    for (let i = 0; i < 40; i++) {
      advanceTime(state);
      const out = solveTick(state, ctx, d, true);
      if (restoredTick < 0 && !state.outages.has(branchId)) {
        restoredTick = i;
        expect(out.servedCustomers).toBe(360);
      }
    }
    expect(restoredTick).toBeGreaterThan(0);
    expect(state.reliability.ciCustomers).toBeGreaterThanOrEqual(360);
    expect(state.reliability.cmlCustomerMin).toBeGreaterThan(360 * 100);
  });
});
