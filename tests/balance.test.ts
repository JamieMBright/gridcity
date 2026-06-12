// Grid balance: gross vs connected procurement, demand vs supply, and
// the 24h profile — including the owner's exact case: residential solar
// leaves a night-time hole.

import { describe, expect, it } from 'vitest';
import { computeBalance } from '../src/sim/balance';
import { ZONE } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  poweredFixture,
  setZone,
} from './helpers';

describe('grid balance', () => {
  it('whole-area scope: connected gas covers the suburb around the clock', () => {
    const { state, ctx } = poweredFixture();
    const report = computeBalance(state, ctx);
    const whole = report.scopes[0];
    expect(whole?.id).toBe(-1);
    expect(whole?.customers).toBe(360);
    expect(whole?.connectedCustomers).toBe(360);
    expect(whole?.grossCapMW).toBe(600); // the CCGT
    expect(whole?.connectedCapMW).toBe(600);
    expect(whole?.profile.length).toBe(24);
    expect(whole?.shortfallMW).toBe(0);
  });

  it('disconnected procurement shows as gross > connected', () => {
    const { state, ctx, ids } = poweredFixture();
    state.assets.delete(ids.line132); // cut the plant off
    state.assetsVersion++;
    const whole = computeBalance(state, ctx).scopes[0];
    expect(whole?.grossCapMW).toBe(600);
    expect(whole?.connectedCapMW).toBe(0);
    expect(whole?.shortfallMW).toBeGreaterThan(0);
  });

  it("solar-only supply shows the owner's night-time hole", () => {
    const map = makeTestMap(30, 30);
    for (let y = 19; y <= 21; y++) {
      for (let x = 19; x <= 21; x++) setZone(map, x, y, ZONE.suburb);
    }
    setZone(map, 5, 5, ZONE.solarSite);
    const ctx = makeContext(map);
    const state = newGame();
    directBuildGen(state, map, 'solarFarm', 5, 5);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 18, y: 18 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 18, by: 18 },
    });
    commissionAll(state);
    const whole = computeBalance(state, ctx).scopes[0];
    if (!whole) throw new Error('no scope');
    const noon = whole.profile[12];
    const night = whole.profile[23];
    expect(noon && noon.supplyMW > 0).toBe(true); // the sun works the day shift
    expect(night?.supplyMW).toBe(0); // and clocks off at night
    expect(night && night.demandMW > 0).toBe(true);
    expect(whole.shortfallMW).toBeGreaterThan(0);
    // the gap bites after dark or before dawn
    expect(whole.shortfallHour < 6 || whole.shortfallHour > 20).toBe(true);
  });
});
