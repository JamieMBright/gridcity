// The tutorial campaign: mission maps decode, mission 1's win predicate
// flips on a real powered fixture, scenario ids round-trip through
// save/load, the london default is untouched, the mission-3 storm
// script fires deterministically, and mission 5's bill target is
// achievable with a sensible build (and the target actually binds).

import { describe, expect, it } from 'vitest';
import { CITY_SCENARIOS, getScenario } from '../src/data/cityRegistry';
import { M1_VILLAGE, M1_WIND, M5_TOWN, M5_WIND } from '../src/data/missions';
import { LONDON_H, LONDON_W } from '../src/data/londonMap';
import { NO_COUNCIL, TERRAIN } from '../src/sim/map/types';
import {
  advanceMission,
  M5_DUOS_TARGET,
  mapBounds,
  missionOf,
  missionUnlocks,
  MISSIONS,
  missionView,
  nextMission,
  type MissionView,
} from '../src/sim/scenario/missions';
import { deserialize, newContext, newGame, serialize, type SaveData } from '../src/sim/state';
import { derive, solveTick, type TickOutputs } from '../src/sim/tick';
import type { GameState, SimContext } from '../src/sim/state';
import { commissionAll, directBuildGen, mustApply } from './helpers';

function solve(state: GameState, ctx: SimContext): { out: TickOutputs; total: number } {
  const d = derive(state, ctx);
  return { out: solveTick(state, ctx, d, false), total: d.service.totalCustomers };
}

function viewOf(state: GameState, ctx: SimContext): MissionView {
  const { out, total } = solve(state, ctx);
  return missionView(state, out, total);
}

describe('mission maps', () => {
  const missions = CITY_SCENARIOS.filter((s) => s.mission);

  it('registers five missions in campaign order, london first/default', () => {
    expect(missions).toHaveLength(5);
    expect(CITY_SCENARIOS[0]?.id).toBe('london');
    expect(MISSIONS.map((m) => m.id)).toEqual(missions.map((s) => s.id));
    expect(nextMission('m1-first-light')?.id).toBe('m2-step-up');
    expect(nextMission('m5-bill')).toBeUndefined();
  });

  it('every mission map decodes: dims, arrays, customers, councils', () => {
    for (const sc of missions) {
      const map = sc.build();
      const n = map.width * map.height;
      expect(map.width).toBeGreaterThan(0);
      expect(map.height).toBeGreaterThan(0);
      expect(map.terrain.length).toBe(n);
      expect(map.zone.length).toBe(n);
      expect(map.council.length).toBe(n);
      expect(map.customers.length).toBe(n);
      expect(map.vegetation.length).toBe(n);
      expect(map.variant.length).toBe(n);
      expect(map.councils.length).toBeGreaterThan(0);
      let customers = 0;
      const councilIds = new Set(map.councils.map((c) => c.id));
      for (let i = 0; i < n; i++) {
        customers += map.customers[i] ?? 0;
        if (map.terrain[i] !== TERRAIN.water) {
          // every land tile carries a real council id
          expect(map.council[i]).not.toBe(NO_COUNCIL);
          expect(councilIds.has(map.council[i] ?? -1)).toBe(true);
        }
      }
      expect(customers).toBeGreaterThan(0);
      // tiny-map doctrine: a mission fits on a screen
      expect(map.width * map.height).toBeLessThanOrEqual(56 * 28);
    }
  });

  it('every mission has steps, a win predicate and win text', () => {
    for (const m of MISSIONS) {
      expect(m.steps.length).toBeGreaterThanOrEqual(4);
      expect(m.winText.length).toBeGreaterThan(20);
      expect(typeof m.win).toBe('function');
    }
  });
});

describe('progressive disclosure: per-step cumulative unlocks', () => {
  it('mission 1 reveals exactly the tools the steps reach, in order', () => {
    const m1 = missionOf('m1-first-light');
    expect(m1).toBeDefined();
    if (!m1) return;
    // step 0 (intro): only the always-on tools, no build kit yet
    const s0 = missionUnlocks(m1, 0);
    expect(s0.has('inspect')).toBe(true);
    expect(s0.has('gen:windOnshore')).toBe(false);
    // step 1 unlocks onshore wind — and ONLY onshore wind among gens
    const s1 = missionUnlocks(m1, 1);
    expect(s1.has('gen:windOnshore')).toBe(true);
    expect(s1.has('gen:gasCCGT')).toBe(false);
    expect(s1.has('gen:nuclear')).toBe(false);
    expect(s1.has('sub:dist')).toBe(false);
    expect(s1.has('line:33')).toBe(false);
    // step 2 adds the inbox HUD surface (award the bid)
    expect(missionUnlocks(m1, 2).has('hud:inbox')).toBe(true);
    // step 3 adds the distribution substation, cumulatively
    const s3 = missionUnlocks(m1, 3);
    expect(s3.has('gen:windOnshore')).toBe(true);
    expect(s3.has('sub:dist')).toBe(true);
    expect(s3.has('sub:grid')).toBe(false);
    expect(s3.has('line:33')).toBe(false);
    // step 4 adds the 33 kV line; the full set is now available
    const s4 = missionUnlocks(m1, 4);
    expect(s4.has('line:33')).toBe(true);
    // a finished strip (undefined step) keeps everything unlocked
    const done = missionUnlocks(m1, undefined);
    expect(done.has('line:33')).toBe(true);
    expect(done.has('sub:dist')).toBe(true);
  });

  it('every mission only ever unlocks tools it actually teaches in its steps', () => {
    for (const m of MISSIONS) {
      const all = missionUnlocks(m, undefined);
      // demolish + inspect are always-on; never gas/coal/nuclear in a
      // tutorial that doesn't mention them
      expect(all.has('inspect')).toBe(true);
      expect(all.has('demolish')).toBe(true);
      expect(all.has('gen:coal')).toBe(false);
      expect(all.has('gen:nuclear')).toBe(false);
      expect(all.has('gen:interconnector')).toBe(false);
    }
  });

  it('mission 2 teaches the step-up chain: offshore wind, grid sub, 132 then 33', () => {
    const m2 = missionOf('m2-step-up');
    if (!m2) return;
    expect(missionUnlocks(m2, 1).has('gen:windOffshore')).toBe(true);
    expect(missionUnlocks(m2, 2).has('sub:grid')).toBe(true);
    expect(missionUnlocks(m2, 3).has('line:132')).toBe(true);
    const end = missionUnlocks(m2, undefined);
    expect(end.has('line:33')).toBe(true);
    expect(end.has('sub:dist')).toBe(true);
  });

  it('mission 3 teaches the depot + fleet without any generation tools', () => {
    const m3 = missionOf('m3-storm');
    if (!m3) return;
    const end = missionUnlocks(m3, undefined);
    expect(end.has('depot')).toBe(true);
    expect(end.has('hud:fleet')).toBe(true);
    expect(end.has('gen:windOnshore')).toBe(false);
  });
});

describe('mission camera bounds', () => {
  it('mapBounds spans the whole (tiny) mission map', () => {
    for (const sc of CITY_SCENARIOS.filter((s) => s.mission)) {
      const map = sc.build();
      const b = mapBounds(map);
      expect(b).toEqual({ x0: 0, y0: 0, x1: map.width - 1, y1: map.height - 1 });
    }
  });

  it('the m1 village + ridge sit within the mission bounds', () => {
    const map = getScenario('m1-first-light').build();
    const b = mapBounds(map);
    for (const p of [M1_VILLAGE, M1_WIND]) {
      expect(p.x).toBeGreaterThanOrEqual(b.x0);
      expect(p.x).toBeLessThanOrEqual(b.x1);
      expect(p.y).toBeGreaterThanOrEqual(b.y0);
      expect(p.y).toBeLessThanOrEqual(b.y1);
    }
  });
});

describe('mission 1: First Light', () => {
  it('win flips once the village is fully on supply', () => {
    const state = newGame('m1-first-light');
    const ctx = newContext('m1-first-light');
    const m1 = missionOf('m1-first-light');
    expect(m1).toBeDefined();
    if (!m1) return;

    // nothing built: customers exist, nobody served, no win
    let v = viewOf(state, ctx);
    expect(v.stats.totalCustomers).toBeGreaterThan(300);
    expect(v.stats.servedCustomers).toBe(0);
    expect(m1.win(v)).toBe(false);

    // wind + dist sub but no wire yet: still dark
    directBuildGen(state, ctx.map, 'windOnshore', M1_WIND.x, M1_WIND.y);
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: M1_VILLAGE.x, y: M1_VILLAGE.y },
    });
    commissionAll(state);
    v = viewOf(state, ctx);
    expect(m1.win(v)).toBe(false);

    // the 33 kV line lands: every home lights, the win flips
    mustApply(state, ctx.map, {
      type: 'build',
      spec: {
        kind: 'line',
        level: 33,
        build: 'overhead',
        ax: M1_WIND.x,
        ay: M1_WIND.y,
        bx: M1_VILLAGE.x,
        by: M1_VILLAGE.y,
      },
    });
    v = viewOf(state, ctx);
    expect(v.stats.servedCustomers).toBe(v.stats.totalCustomers);
    expect(m1.win(v)).toBe(true);

    // advanceMission latches the flag and celebrates exactly once
    advanceMission(state, v);
    expect(state.missionComplete).toBe(true);
    const wins = state.events.filter((e) => e.msg.includes('mission complete'));
    expect(wins).toHaveLength(1);
    advanceMission(state, v);
    expect(state.events.filter((e) => e.msg.includes('mission complete'))).toHaveLength(1);
  });
});

describe('mission 3: the scripted storm', () => {
  it('seeds a powered town and trips the woodland line on schedule', () => {
    const state = newGame('m3-storm');
    const ctx = newContext('m3-storm');
    const m3 = missionOf('m3-storm');
    expect(m3).toBeDefined();
    if (!m3) return;
    m3.seed?.(state, ctx);
    // plant + dist sub + line, already serving the town
    expect(state.assets.size).toBe(3);
    let v = viewOf(state, ctx);
    expect(v.stats.servedCustomers).toBe(v.stats.totalCustomers);
    expect(m3.win(v)).toBe(false); // no depot, no storm yet

    // ride to just past the fault beat: outage + repair job + storm wind
    state.simTimeMin = 39 * 60;
    advanceMission(state, v);
    expect(state.outages.size).toBe(1);
    expect(state.jobs.size).toBe(1);
    expect(state.weather.wind).toBeGreaterThanOrEqual(0.9);
    expect(state.missionComplete).toBeUndefined();

    // depot built + line restored + town back on supply → win
    const depotId = state.nextAssetId++;
    state.assets.set(depotId, { id: depotId, kind: 'depot', x: 12, y: 9 });
    state.assetsVersion++;
    state.outages.clear();
    state.jobs.clear();
    v = viewOf(state, ctx);
    advanceMission(state, v);
    expect(state.missionComplete).toBe(true);
  });
});

describe('mission 4: the seeded application', () => {
  it('opens with Eastbox Compute waiting in the inbox', () => {
    const state = newGame('m4-inbox');
    const ctx = newContext('m4-inbox');
    missionOf('m4-inbox')?.seed?.(state, ctx);
    expect(state.applications).toHaveLength(1);
    expect(state.applications[0]?.kind).toBe('dataCentre');
    expect(state.applications[0]?.status).toBe('open');
    // and the town is already served, so the lesson is the connection
    const v = viewOf(state, ctx);
    expect(v.stats.servedCustomers).toBe(v.stats.totalCustomers);
  });
});

describe('mission 5: the bill target', () => {
  it('a sensible lean build wins; a gold-plated one fails the target', () => {
    const state = newGame('m5-bill');
    const ctx = newContext('m5-bill');
    const m5 = missionOf('m5-bill');
    expect(m5).toBeDefined();
    if (!m5) return;

    directBuildGen(state, ctx.map, 'windOnshore', M5_WIND.x, M5_WIND.y);
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: M5_TOWN.x, y: M5_TOWN.y },
    });
    mustApply(state, ctx.map, {
      type: 'build',
      spec: {
        kind: 'line',
        level: 33,
        build: 'overhead',
        ax: M5_WIND.x,
        ay: M5_WIND.y,
        bx: M5_TOWN.x,
        by: M5_TOWN.y,
      },
    });
    commissionAll(state);
    let v = viewOf(state, ctx);
    expect(v.stats.servedCustomers).toBe(v.stats.totalCustomers);
    expect(v.bill.perCustomerDuosYr).toBeGreaterThan(0);
    expect(v.bill.perCustomerDuosYr).toBeLessThanOrEqual(M5_DUOS_TARGET);
    expect(m5.win(v)).toBe(true);

    // gold-plate the parish: a bulk supply point's annuity alone blows
    // the household target — every pound lands on the bill
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'bulk', x: 30, y: 4 },
    });
    v = viewOf(state, ctx);
    expect(v.bill.perCustomerDuosYr).toBeGreaterThan(M5_DUOS_TARGET);
    expect(m5.win(v)).toBe(false);
  });
});

describe('scenario id through save/load', () => {
  it("newGame('missionId') round-trips and rebuilds the same map", () => {
    const state = newGame('m1-first-light');
    const data = serialize(state);
    expect(data.scenarioId).toBe('m1-first-light');
    const loaded = deserialize(data);
    expect(loaded.scenarioId).toBe('m1-first-light');
    const a = newContext(loaded.scenarioId).map;
    const b = getScenario('m1-first-light').build();
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect([...a.zone]).toEqual([...b.zone]);
  });

  it('mission progress fields ride the save additively', () => {
    const state = newGame('m3-storm');
    state.missionBeats = 7;
    state.missionComplete = true;
    const loaded = deserialize(serialize(state));
    expect(loaded.missionBeats).toBe(7);
    expect(loaded.missionComplete).toBe(true);
  });

  it('london stays the default and old saves hydrate to london', () => {
    expect(newGame().scenarioId).toBe('london');
    const map = newContext().map;
    expect(map.width).toBe(LONDON_W);
    expect(map.height).toBe(LONDON_H);
    // london saves carry no scenario tag (byte-identical to pre-campaign)
    const data = serialize(newGame());
    expect('scenarioId' in data).toBe(false);
    // a pre-campaign save (no scenarioId at all) hydrates to london
    const legacy = JSON.parse(JSON.stringify(data)) as SaveData;
    delete legacy.scenarioId;
    expect(deserialize(legacy).scenarioId).toBe('london');
  });
});
