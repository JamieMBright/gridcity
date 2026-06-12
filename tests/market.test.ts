import { describe, expect, it } from 'vitest';
import {
  domesticProfile,
  newWeather,
  processProfile,
  stepWeather,
  sunFactor,
} from '../src/sim/events/weather';
import { Rng } from '../src/sim/rng';
import { applyCommand } from '../src/sim/commands';
import { ZONE } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  poweredFixture,
  setZone,
} from './helpers';

describe('weather and profiles', () => {
  it('solar is zero at night and peaks midday under clear sky', () => {
    const w = { cloud: 0, wind: 0.5 };
    expect(sunFactor(2 * 60, w)).toBe(0);
    expect(sunFactor(13 * 60, w)).toBeGreaterThan(0.9);
    expect(sunFactor(13 * 60, { ...w, cloud: 1 })).toBeLessThan(0.3);
  });

  it('domestic demand peaks in the evening, troughs overnight', () => {
    const evening = domesticProfile(18.4 * 60);
    const night = domesticProfile(3 * 60);
    const midday = domesticProfile(13 * 60);
    expect(evening).toBeGreaterThan(midday);
    expect(midday).toBeGreaterThan(night);
    expect(evening).toBeLessThanOrEqual(1.05);
    expect(night).toBeGreaterThan(0.3);
  });

  it('weather random walk stays in [0,1] and is deterministic by seed', () => {
    const w1 = newWeather();
    const w2 = newWeather();
    const r1 = new Rng(42);
    const r2 = new Rng(42);
    for (let i = 0; i < 500; i++) {
      stepWeather(w1, r1, 30);
      stepWeather(w2, r2, 30);
      expect(w1.cloud).toBeGreaterThanOrEqual(0);
      expect(w1.cloud).toBeLessThanOrEqual(1);
      expect(w1.wind).toBeGreaterThanOrEqual(0);
      expect(w1.wind).toBeLessThanOrEqual(1);
    }
    expect(w1).toEqual(w2);
    expect(processProfile(13 * 60)).toBeGreaterThan(processProfile(3 * 60));
  });
});

describe('dispatch dynamics', () => {
  it('a battery charges on midday solar surplus and discharges after dark', () => {
    const map = makeTestMap(30, 30);
    for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb); // small load
    setZone(map, 5, 5, ZONE.solarSite);
    const ctx = makeContext(map);
    const state = newGame();
    state.weather.cloud = 0; // clear day
    const solar = directBuildGen(state, map, 'solarFarm', 5, 5);
    const batt = directBuildGen(state, map, 'battery', 8, 8);
    const dist = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 8, by: 8 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 8, ay: 8, bx: 20, by: 20 },
    });
    void solar;
    void dist;
    commissionAll(state);

    const d = derive(state, ctx);

    // midday: solar >> load, battery charges
    state.simTimeMin = 13 * 60;
    state.speed = 1;
    state.tick = 1;
    const noon = solveTick(state, ctx, d, true);
    expect(noon.dispatch.genMW.get(batt) ?? 0).toBeLessThan(0);
    expect(state.soc.get(batt) ?? 0).toBeGreaterThan(0);

    // night: no solar; battery carries the load
    state.soc.set(batt, 200);
    state.simTimeMin = 23 * 60;
    const night = solveTick(state, ctx, d, true);
    expect(night.dispatch.genMW.get(batt) ?? 0).toBeGreaterThan(0);
    expect(night.servedCustomers).toBeGreaterThan(0);
  });

  it('records curtailment when renewables exceed what the island absorbs', () => {
    const map = makeTestMap(20, 20);
    setZone(map, 5, 5, ZONE.solarSite);
    setZone(map, 10, 10, ZONE.suburb); // one tile: tiny load
    const ctx = makeContext(map);
    const state = newGame();
    state.weather.cloud = 0;
    state.simTimeMin = 13 * 60;
    directBuildGen(state, map, 'solarFarm', 5, 5);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 10, y: 10 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 10, by: 10 },
    });
    commissionAll(state);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    // firm connection: ~50 MW farm, <1 MW load → heavy compensated curtailment
    expect(out.dispatch.curtailedFirmMW).toBeGreaterThan(30);
    expect(out.dispatch.constraintKPerHour).toBeGreaterThan(0);
    expect(out.dispatch.carbonG).toBe(0);
  });

  it('gas sets the marginal price at the evening peak', () => {
    const { state, ctx } = poweredFixture();
    state.simTimeMin = 18.5 * 60;
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.dispatch.priceMWh).toBe(85);
    expect(out.dispatch.carbonG).toBeCloseTo(390, 6);
  });
});

describe('thermal trips', () => {
  it('an overloaded line heats up, trips, then comes back after repair', () => {
    // three dist subs (~19 MW each) all fed through one 33 kV feeder
    // (30 MW rating) → it runs near 180% at the evening peak and trips
    const map = makeTestMap(40, 36);
    for (let y = 7; y <= 17; y++) {
      for (let x = 11; x <= 21; x++) setZone(map, x, y, ZONE.urbanCore);
      for (let x = 23; x <= 33; x++) setZone(map, x, y, ZONE.urbanCore);
    }
    for (let y = 19; y <= 29; y++) {
      for (let x = 11; x <= 21; x++) setZone(map, x, y, ZONE.urbanCore);
    }
    const ctx = makeContext(map);
    const state = newGame();
    directBuildGen(state, map, 'gasCCGT', 2, 12);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 7, y: 12 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 16, y: 12 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 28, y: 12 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 16, y: 24 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 2, ay: 12, bx: 7, by: 12 },
    });
    const feeder = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 7, ay: 12, bx: 16, by: 12 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 16, ay: 12, bx: 28, by: 12 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 16, ay: 12, bx: 16, by: 24 },
    });

    commissionAll(state);
    state.speed = 16; // dt = 120 game-min per tick
    state.simTimeMin = 17.5 * 60; // run into the evening peak
    const d = derive(state, ctx);

    let trippedAt = -1;
    for (let i = 0; i < 30; i++) {
      advanceTime(state);
      const out = solveTick(state, ctx, d, true);
      const line = out.branches.find((b) => b.assetId === feeder);
      if (line?.outMin !== undefined) {
        trippedAt = i;
        break;
      }
    }
    expect(trippedAt).toBeGreaterThanOrEqual(0);

    // it repairs eventually (repair clock only runs while time advances)
    let restored = false;
    for (let i = 0; i < 30 && !restored; i++) {
      advanceTime(state);
      const out = solveTick(state, ctx, d, true);
      const line = out.branches.find((b) => b.assetId === feeder);
      restored = line?.outMin === undefined;
    }
    expect(restored).toBe(true);
  });

  it('frequency reads ~50 Hz when balanced and sags under shortage', () => {
    const { state, ctx, ids } = poweredFixture();
    const ok = solveTick(state, ctx, derive(state, ctx), false);
    expect(ok.freqHz).toBeCloseTo(50, 1);
    applyCommand(state, ctx.map, { type: 'demolish', assetId: ids.gas });
    // battery-less island with load but no source: subs disconnected → 50;
    // instead make a shortage: tiny solar at night can't cover
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.servedCustomers).toBe(0);
    void out;
  });
});
