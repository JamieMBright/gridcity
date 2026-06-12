import { describe, expect, it } from 'vitest';
import {
  adoptionMilestones,
  newCouncilState,
  stepAdoption,
  stepSatisfaction,
} from '../src/sim/customers/adoption';
import { applyCommand } from '../src/sim/commands';
import { tileDemand } from '../src/sim/map/demand';
import { ZONE, type CouncilProfile } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import { makeContext, makeTestMap, poweredFixture, setZone, commissionAll } from './helpers';

const YEAR = 525_600;

function profile(affluence: number, ambition: number): CouncilProfile {
  return { id: 0, name: 'Test', affluence, ambition, blurb: '' };
}

describe('council adoption', () => {
  it('an affluent ambitious council electrifies far faster than a laggard', () => {
    const keen = newCouncilState();
    const laggard = newCouncilState();
    for (let i = 0; i < 100; i++) {
      stepAdoption(keen, profile(0.9, 0.9), 1, 1, YEAR / 20);
      stepAdoption(laggard, profile(0.2, 0.1), 1, 1, YEAR / 20);
    }
    expect(keen.ev).toBeGreaterThan(laggard.ev * 2.5);
    expect(keen.hp).toBeGreaterThan(laggard.hp * 2.5);
    expect(keen.ev).toBeLessThanOrEqual(0.85); // capped
  });

  it('nothing electrifies without power', () => {
    const s = newCouncilState();
    stepAdoption(s, profile(1, 1), 0, 1, YEAR * 10);
    expect(s.ev).toBe(0);
    expect(s.pv).toBe(0);
  });

  it('milestones fire once per threshold', () => {
    const before = { ev: 0.09, hp: 0.3, pv: 0.5 };
    const after = { ev: 0.12, hp: 0.3, pv: 0.5 };
    const ms = adoptionMilestones(before, after);
    expect(ms).toEqual([{ tech: 'ev', pct: 10 }]);
  });

  it('satisfaction drops fast on outages and recovers slowly', () => {
    const s = newCouncilState();
    s.satisfaction = 80;
    stepSatisfaction(s, 5, 720);
    const afterOutage = s.satisfaction;
    expect(afterOutage).toBeLessThan(60);
    stepSatisfaction(s, 85, 720);
    expect(s.satisfaction - afterOutage).toBeLessThan(80 - afterOutage); // slow forgiveness
  });

  it('adoption adds EV/HP load and PV export to tile demand', () => {
    const map = makeTestMap(4, 4);
    setZone(map, 1, 1, ZONE.suburb);
    map.council[1 * 4 + 1] = 0;
    const none = tileDemand(map, 5, new Map([[0, { ev: 0, hp: 0, pv: 0 }]]));
    const full = tileDemand(map, 5, new Map([[0, { ev: 0.5, hp: 0.5, pv: 0.5 }]]));
    expect(none.evMW).toBe(0);
    expect(full.evMW).toBeGreaterThan(0);
    expect(full.hpMW).toBeGreaterThan(0);
    expect(full.pvMW).toBeGreaterThan(0);
  });
});

describe('applications & flexibility', () => {
  it('flexible connections are curtailed before firm ones on surplus', () => {
    const map = makeTestMap(30, 30);
    setZone(map, 5, 5, ZONE.solarSite);
    setZone(map, 7, 7, ZONE.solarSite);
    setZone(map, 20, 20, ZONE.suburb);
    const ctx = makeContext(map);
    const state = newGame();
    state.weather.cloud = 0;
    state.simTimeMin = 13 * 60;
    // firm farm (player-built) + flexible farm (customer)
    applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'solarFarm', x: 5, y: 5 } });
    state.applications.push({
      id: 99,
      kind: 'solarFarm',
      name: 'Flex Co-op',
      x: 7,
      y: 7,
      mw: 50,
      customers: 0,
      decideByMin: state.simTimeMin + 99999,
      status: 'open',
    });
    const r = applyCommand(state, map, { type: 'respondApplication', appId: 99, response: 'flex' });
    expect(r.ok).toBe(true);
    applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    const flexAsset = state.applications[0]?.assetId ?? -1;
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 7, by: 7 },
    });
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 7, ay: 7, bx: 20, by: 20 },
    });

    commissionAll(state);
    const out = solveTick(state, ctx, derive(state, ctx), false);
    // tiny load, ~100 MW available: flex farm should be fully curtailed,
    // firm farm carries the load and only its leftover is compensated
    expect(out.dispatch.genMW.get(flexAsset) ?? -1).toBe(0);
    expect(out.dispatch.curtailedFlexMW).toBeGreaterThan(20);
    expect(out.dispatch.curtailedFirmMW).toBeGreaterThan(0);
  });

  it('demolishing customer-owned plant is refused', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    setZone(map, 5, 5, ZONE.solarSite);
    state.applications.push({
      id: 1,
      kind: 'solarFarm',
      name: 'X',
      x: 5,
      y: 5,
      mw: 50,
      customers: 0,
      decideByMin: 99999,
      status: 'open',
    });
    applyCommand(state, map, { type: 'respondApplication', appId: 1, response: 'firm' });
    const assetId = state.applications[0]?.assetId ?? -1;
    const r = applyCommand(state, map, { type: 'demolish', assetId });
    expect(r.ok).toBe(false);
  });
});

describe('innovation', () => {
  it('funding needs the fund; success unlocks the tech', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    state.pitches.push({
      id: 5,
      tech: 'smartEv',
      title: 'Smart EV charging',
      blurb: '',
      costK: 1000,
      durationDays: 1,
      successPct: 100,
      decideByMin: 1e9,
      status: 'open',
    });
    const broke = applyCommand(state, map, { type: 'fundPitch', pitchId: 5 });
    expect(broke.ok).toBe(false);
    state.innovationFundK = 1500;
    const ok = applyCommand(state, map, { type: 'fundPitch', pitchId: 5 });
    expect(ok.ok).toBe(true);
    expect(state.innovationFundK).toBe(500);

    const ctx = makeContext(map);
    state.speed = 16;
    state.simTimeMin = (state.pitches[0]?.completesAtMin ?? 0) + 1;
    solveTick(state, ctx, derive(state, ctx), true);
    expect(state.tech.smartEv).toBe(true);
  });

  it('the levy fills the fund while time runs', () => {
    const { state, ctx } = poweredFixture();
    state.levyPct = 2;
    state.speed = 16;
    const before = state.innovationFundK;
    for (let i = 0; i < 20; i++) solveTick(state, ctx, derive(state, ctx), true);
    expect(state.innovationFundK).toBeGreaterThan(before);
  });
});
