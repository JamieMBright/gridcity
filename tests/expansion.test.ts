// New-mechanics coverage: pylon placement along overhead routes, the
// pole/vault substation siting rules, water-sited tidal, planning +
// construction lead times, and the socialized bill denominator.

import { describe, expect, it } from 'vitest';
import { GENS, PYLON_SPACING, SUBS } from '../src/sim/catalog';
import { DOMESTIC_NETWORK_SHARE } from '../src/sim/regulation/bill';
import { applyCommand, checkBuild } from '../src/sim/commands';
import { placePylons, pylonSiteOk, routeTiles } from '../src/sim/cost';
import { underConstruction } from '../src/sim/market/dispatch';
import { assignServiceAreas } from '../src/sim/service';
import { RC, TERRAIN, ZONE } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  setZone,
} from './helpers';

describe('overhead-line supports', () => {
  it('spaces pylons along the route, excluding the endpoints', () => {
    const map = makeTestMap(30, 30);
    const route = routeTiles(2, 10, 26, 10);
    const pylons = placePylons(map, 132, route, new Set());
    expect(pylons.length).toBeGreaterThan(5);
    const spacing = PYLON_SPACING[132];
    expect(pylons[0]).toBe(10 * 30 + (2 + spacing));
    expect(pylons).not.toContain(10 * 30 + 2);
    expect(pylons).not.toContain(10 * 30 + 26);
  });

  it('poles at 33 kV stand closer together than pylons at 132 kV', () => {
    const map = makeTestMap(30, 30);
    const route = routeTiles(2, 10, 26, 10);
    const poles = placePylons(map, 33, route, new Set());
    const pylons = placePylons(map, 132, route, new Set());
    expect(poles.length).toBeGreaterThan(pylons.length);
  });

  it('snaps a support to the next free square when the slot is blocked', () => {
    const map = makeTestMap(30, 30);
    const spacing = PYLON_SPACING[132];
    const blockedX = 2 + spacing;
    map.terrain[10 * 30 + blockedX] = TERRAIN.water; // first slot in the river
    const route = routeTiles(2, 10, 26, 10);
    const pylons = placePylons(map, 132, route, new Set());
    expect(pylons).not.toContain(10 * 30 + blockedX);
    expect(pylons).toContain(10 * 30 + blockedX + 1); // slid one tile onward
  });

  it('supports avoid heavy transport, water and building plots — quiet streets are fine', () => {
    const map = makeTestMap(10, 10);
    map.road[5 * 10 + 5] = RC.arterial;
    map.road[5 * 10 + 3] = RC.rail;
    map.road[5 * 10 + 2] = RC.streetTouch; // a lane clips the tile: poles allowed
    map.terrain[5 * 10 + 6] = TERRAIN.water;
    setZone(map, 7, 5, ZONE.suburb); // customer plot
    expect(pylonSiteOk(map, 5, 5, new Set())).toBe(false);
    expect(pylonSiteOk(map, 3, 5, new Set())).toBe(false);
    expect(pylonSiteOk(map, 6, 5, new Set())).toBe(false);
    expect(pylonSiteOk(map, 7, 5, new Set())).toBe(false);
    expect(pylonSiteOk(map, 2, 5, new Set())).toBe(true);
    expect(pylonSiteOk(map, 4, 5, new Set())).toBe(true);
  });

  it('a built overhead line stores its pylons; underground stores none', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 2, y: 10 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 26, y: 10 } });
    const oh = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 2, ay: 10, bx: 26, by: 10 },
    });
    const ug = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'underground', ax: 2, ay: 10, bx: 26, by: 10 },
    });
    const ohAsset = state.assets.get(oh);
    const ugAsset = state.assets.get(ug);
    expect(ohAsset?.kind === 'line' && (ohAsset.pylons?.length ?? 0) > 0).toBe(true);
    expect(ugAsset?.kind === 'line' ? (ugAsset.pylons ?? []).length : -1).toBe(0);
  });

  it('pylon tiles block new tile builds', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 2, y: 10 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 26, y: 10 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 2, ay: 10, bx: 26, by: 10 },
    });
    const spacing = PYLON_SPACING[132];
    const check = checkBuild(map, state.assets.values(), {
      kind: 'sub',
      sub: 'dist',
      x: 2 + spacing,
      y: 10,
    });
    expect(check.ok).toBe(false);
    expect(check.error).toMatch(/support/);
  });
});

describe('new substation kinds', () => {
  it('vaults go beneath large buildings only', () => {
    const map = makeTestMap(20, 20);
    setZone(map, 5, 5, ZONE.urbanCore);
    setZone(map, 6, 5, ZONE.cbd);
    setZone(map, 7, 5, ZONE.industrial);
    setZone(map, 8, 5, ZONE.suburb); // houses: refused
    const state = newGame();
    for (const x of [5, 6, 7]) {
      const r = applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'vault', x, y: 5 } });
      expect(r.ok).toBe(true);
    }
    const r = applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'vault', x: 8, y: 5 } });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/houses/);
  });

  it('a bulk supply point eats its 2x2 plot', () => {
    const map = makeTestMap(20, 20);
    const state = newGame();
    const id = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'bulk', x: 5, y: 5 } });
    const sub = state.assets.get(id);
    // the far corner of the plot is this asset, and nothing builds on it
    expect(sub && checkBuild(map, state.assets.values(), { kind: 'sub', sub: 'dist', x: 6, y: 6 }).ok).toBe(false);
    const again = applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 8, y: 5 } });
    expect(again.ok).toBe(true);
  });

  it('a pole transformer serves a tight radius', () => {
    expect(SUBS.pole.serviceRadius).toBeLessThan(SUBS.dist.serviceRadius ?? 99);
    expect(SUBS.pole.txRatingMW).toBeLessThan(SUBS.dist.txRatingMW);
  });
});

describe('new generation', () => {
  it('tidal sits in water, biomass and peakers on land', () => {
    const map = makeTestMap(20, 20);
    map.terrain[5 * 20 + 5] = TERRAIN.water;
    const state = newGame();
    const wet = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'tidal', x: 5, y: 5 } });
    expect(wet.ok).toBe(true);
    const dry = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'tidal', x: 10, y: 10 } });
    expect(dry.ok).toBe(false);
    const bio = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'biomass', x: 11, y: 10 } });
    expect(bio.ok).toBe(true);
    const ocgt = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 12, y: 10 } });
    expect(ocgt.ok).toBe(true);
  });

  it('nuclear wants cooling water: shoreline yes, inland no, licensed site always', () => {
    const map = makeTestMap(30, 30);
    for (let y = 0; y < 30; y++) map.terrain[y * 30] = TERRAIN.water; // west coast
    const state = newGame();
    // 2x2 footprint anchored a tile off the shore: every tile within reach
    const shore = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'nuclear', x: 1, y: 5 } });
    expect(shore.ok).toBe(true);
    const inland = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'nuclear', x: 15, y: 15 } });
    expect(inland.ok).toBe(false);
    expect(inland.error).toMatch(/cooling water/);
    for (let y = 20; y <= 21; y++) {
      for (let x = 20; x <= 22; x++) setZone(map, x, y, ZONE.nuclearSite); // 3x2 campus
    }
    const licensed = applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'nuclear', x: 20, y: 20 } });
    expect(licensed.ok).toBe(true);
  });
});

describe('planning + construction', () => {
  it('a freshly built plant is under construction and generates nothing', () => {
    const map = makeTestMap(30, 30);
    for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
    const ctx = makeContext(map);
    const state = newGame();
    const gas = directBuildGen(state, map, 'gasCCGT', 5, 5);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 12, y: 12 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 12, by: 12 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 12, ay: 12, bx: 20, by: 20 },
    });

    const asset = state.assets.get(gas);
    expect(asset?.kind === 'gen' && underConstruction(asset, state.simTimeMin)).toBe(true);
    const dark = solveTick(state, ctx, derive(state, ctx), false);
    expect(dark.dispatch.genMW.get(gas) ?? 0).toBe(0);
    expect(dark.servedCustomers).toBe(0);

    // fast-forward past planning + construction: the plant carries the load
    const spec = GENS.gasCCGT;
    state.simTimeMin += (spec.planningDays + spec.buildDays) * 1440 + 1;
    const lit = solveTick(state, ctx, derive(state, ctx), false);
    expect(lit.dispatch.genMW.get(gas) ?? 0).toBeGreaterThan(0);
    expect(lit.servedCustomers).toBeGreaterThan(0);
  });
});

describe('substation MVA + load-based catchments', () => {
  it('a small transformer only signs up the load it can carry', () => {
    const map = makeTestMap(30, 30);
    // a big block of suburb: ~25 tiles × 40 customers × 1.4 kW = 1.4 MW
    for (let y = 13; y <= 17; y++) {
      for (let x = 13; x <= 17; x++) setZone(map, x, y, ZONE.suburb);
    }
    const state = newGame();
    const id = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'pole', x: 15, y: 15 } });
    const a = state.assets.get(id);
    if (a?.kind === 'sub') a.mva = 1; // 1 MVA pole can
    const svc = assignServiceAreas(map, state.assets.values(), []);
    const assigned = svc.tilesOfSub.get(id)?.length ?? 0;
    expect(assigned).toBeGreaterThan(0);
    expect(assigned).toBeLessThan(25); // capacity, not geography, decides
    expect(svc.peakOfSub.get(id) ?? 0).toBeLessThanOrEqual(1 + 0.06); // one tile may overshoot
  });

  it('a bigger transformer reaches further and serves more', () => {
    const map = makeTestMap(40, 40);
    for (let y = 12; y <= 28; y++) {
      for (let x = 12; x <= 28; x++) setZone(map, x, y, ZONE.suburb);
    }
    const state = newGame();
    const id = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    const a = state.assets.get(id);
    if (a?.kind !== 'sub') throw new Error('not a sub');
    a.mva = 5;
    const small = assignServiceAreas(map, state.assets.values(), []).customersOfSub.get(id) ?? 0;
    a.mva = 40;
    const big = assignServiceAreas(map, state.assets.values(), []).customersOfSub.get(id) ?? 0;
    expect(big).toBeGreaterThan(small);
  });

  it('manual resize steps through fixed sizes and disables auto', () => {
    const map = makeTestMap(20, 20);
    const state = newGame();
    const id = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 5, y: 5 } });
    const bad = applyCommand(state, map, { type: 'setSubMva', assetId: id, mva: 7 });
    expect(bad.ok).toBe(false);
    const ok = applyCommand(state, map, { type: 'setSubMva', assetId: id, mva: 40 });
    expect(ok.ok).toBe(true);
    const a = state.assets.get(id);
    expect(a?.kind === 'sub' && a.mva === 40 && a.mvaAuto === false).toBe(true);
  });

  it('auto-reinforcement uprates a hot transformer and reports it', () => {
    const map = makeTestMap(30, 30);
    // dense urban core: 120 customers/tile → a 5 MVA can runs hot fast
    for (let y = 12; y <= 20; y++) {
      for (let x = 12; x <= 20; x++) setZone(map, x, y, ZONE.urbanCore);
    }
    const ctx = makeContext(map);
    const state = newGame();
    directBuildGen(state, map, 'gasCCGT', 3, 3);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 8, y: 8 } });
    const dist = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 16, y: 16 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 3, ay: 3, bx: 8, by: 8 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 8, ay: 8, bx: 16, by: 16 },
    });
    commissionAll(state);
    const a = state.assets.get(dist);
    if (a?.kind !== 'sub') throw new Error('not a sub');
    a.mva = 5; // undersized for the block: it signs up ~5 MW and runs hot
    state.speed = 1;
    state.tick = 1;
    solveTick(state, ctx, derive(state, ctx), true);
    expect(a.mva).toBe(10); // stepped up one size
    expect(state.events.some((e) => e.msg.includes('reinforcement'))).toBe(true);
  });

  it("iDNO substations can't be demolished or resized", () => {
    const map = makeTestMap(20, 20);
    const state = newGame();
    const id = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 5, y: 5 } });
    const a = state.assets.get(id);
    if (a?.kind === 'sub') a.idno = true;
    expect(applyCommand(state, map, { type: 'demolish', assetId: id }).ok).toBe(false);
    expect(applyCommand(state, map, { type: 'setSubMva', assetId: id, mva: 40 }).ok).toBe(false);
  });
});

describe('the bill', () => {
  it('socializes network costs across every customer in the area', () => {
    const map = makeTestMap(30, 30);
    for (let y = 19; y <= 21; y++) {
      for (let x = 19; x <= 21; x++) setZone(map, x, y, ZONE.suburb);
    }
    // a second, unserved town: doubles the licence-area customer base
    for (let y = 4; y <= 6; y++) {
      for (let x = 4; x <= 6; x++) setZone(map, x, y, ZONE.suburb);
    }
    const ctx = makeContext(map);
    const state = newGame();
    directBuildGen(state, map, 'gasCCGT', 10, 25);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 15, y: 22 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 10, ay: 25, bx: 15, by: 22 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 15, ay: 22, bx: 20, by: 20 },
    });
    commissionAll(state);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    expect(out.servedCustomers).toBe(360);
    expect(out.bill.totalCustomers).toBe(720);
    // denominator is everyone in the area, not just the town on supply:
    // serving half the customers must not double the per-home DUoS
    const b = out.bill;
    const networkK =
      b.capexYrK + b.opexYrK + b.fleetYrK + b.vegYrK + b.flexYrK + b.constraintYrK + b.innovationYrK;
    expect(b.perCustomerDuosYr).toBeCloseTo((networkK * DOMESTIC_NETWORK_SHARE * 1000) / 720, 9);
  });
});
