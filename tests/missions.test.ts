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
import { deserialize, newContext, newGame, seedScenario, serialize, type SaveData } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick, type TickOutputs } from '../src/sim/tick';
import type { GameState, SimContext } from '../src/sim/state';
import { applyCommand } from '../src/sim/commands';
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

  it('registers the campaign missions in order, london first/default', () => {
    expect(missions).toHaveLength(6);
    expect(CITY_SCENARIOS[0]?.id).toBe('london');
    expect(MISSIONS.map((m) => m.id)).toEqual(missions.map((s) => s.id));
    expect(nextMission('m1-first-light')?.id).toBe('m2-step-up');
    expect(nextMission('m5-bill')?.id).toBe('m6-sun-store');
    expect(nextMission('m6-sun-store')).toBeUndefined();
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
    // steps (overhauled): 0 intro · 1 designate wind · 2 watch a bid land ·
    // 3 award a bid · 4 voltage primer · 5 dist sub · 6 33 kV line · 7 light all
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
    // steps 2-3 add the inbox HUD surface (watch then award the bid)
    expect(missionUnlocks(m1, 2).has('hud:inbox')).toBe(true);
    expect(missionUnlocks(m1, 3).has('hud:inbox')).toBe(true);
    // step 4 is the voltage-hierarchy PRIMER — teaches a concept, unlocks
    // nothing new (the dist sub is still one step away)
    const s4 = missionUnlocks(m1, 4);
    expect(s4.has('gen:windOnshore')).toBe(true);
    expect(s4.has('sub:dist')).toBe(false);
    // step 5 adds the distribution substation, cumulatively
    const s5 = missionUnlocks(m1, 5);
    expect(s5.has('sub:dist')).toBe(true);
    expect(s5.has('sub:grid')).toBe(false);
    expect(s5.has('line:33')).toBe(false);
    // step 6 adds the 33 kV line; the full set is now available
    const s6 = missionUnlocks(m1, 6);
    expect(s6.has('line:33')).toBe(true);
    // a finished strip (undefined step) keeps everything unlocked
    const done = missionUnlocks(m1, undefined);
    expect(done.has('line:33')).toBe(true);
    expect(done.has('sub:dist')).toBe(true);
  });

  it('every gated step carries an objective; concept steps do not', () => {
    for (const m of MISSIONS) {
      for (const step of m.steps) {
        if (step.done) {
          // a gated step must tell the player WHAT unlocks "next"
          expect(step.objective, `${m.id}: gated step needs an objective`).toBeTruthy();
        } else {
          // a pure concept step has no goal, so no objective row
          expect(step.objective).toBeUndefined();
        }
      }
    }
  });

  it('mission 6 teaches solar + storage: solar farm, battery, then wires', () => {
    const m6 = missionOf('m6-sun-store');
    expect(m6).toBeDefined();
    if (!m6) return;
    expect(missionUnlocks(m6, 1).has('gen:solarFarm')).toBe(true);
    expect(missionUnlocks(m6, 2).has('gen:battery')).toBe(true);
    const end = missionUnlocks(m6, undefined);
    expect(end.has('sub:dist')).toBe(true);
    expect(end.has('line:33')).toBe(true);
    // it never reaches for fossil generation or transmission voltages
    expect(end.has('gen:gasCCGT')).toBe(false);
    expect(end.has('line:132')).toBe(false);
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

describe('tutorial: only ONE onshore-wind farm in the relevant lessons', () => {
  // two well-separated valid ridge tiles, so the ONLY reason a second
  // designation can fail is the single-farm guard (not a reservation clash)
  const A = { x: 2, y: 8 };
  const B = { x: 11, y: 9 };

  it('m1 refuses a SECOND onshore-wind designation (tender already open)', () => {
    const state = newGame('m1-first-light');
    const ctx = newContext('m1-first-light');
    const first = applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: A.x, y: A.y },
    });
    expect(first.ok).toBe(true);
    expect(state.tenders.filter((t) => t.gen === 'windOnshore')).toHaveLength(1);
    const second = applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: B.x, y: B.y },
    });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/one onshore wind/i);
    // still exactly one tender — the refusal didn't create a second
    expect(state.tenders.filter((t) => t.gen === 'windOnshore')).toHaveLength(1);
  });

  it('a BUILT onshore gen also blocks a fresh onshore designation in m5', () => {
    const state = newGame('m5-bill');
    const ctx = newContext('m5-bill');
    directBuildGen(state, ctx.map, 'windOnshore', M5_WIND.x, M5_WIND.y);
    const r = applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: A.x, y: A.y },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/one onshore wind/i);
  });

  it('the SANDBOX (london) is NOT limited — designate as many as you like', () => {
    const state = newGame('london');
    const ctx = newContext('london');
    // two well-separated valid onshore sites in the london countryside: the
    // guard is mission-only, so BOTH designations must succeed.
    const a = applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 0, y: 0 },
    });
    const b = applyCommand(state, ctx.map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 15, y: 0 },
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(state.tenders.filter((t) => t.gen === 'windOnshore')).toHaveLength(2);
  });
});

describe('tutorials suppress unrelated applications / events', () => {
  /** Run a scenario for `weeks` game-weeks the worker's way and count any
   *  UNSOLICITED spawns (applications, pitches, fault jobs) that appeared
   *  beyond whatever the seed() placed. */
  function runScenario(
    id: string,
    weeks: number,
  ): { newApps: number; newPitches: number; newJobs: number } {
    const state = newGame(id);
    const ctx = newContext(id);
    seedScenario(state, ctx); // no-op off london, but mirror the worker path
    missionOf(id)?.seed?.(state, ctx);
    state.speed = 16;
    let derived = derive(state, ctx);
    const apps0 = state.applications.length;
    const pitches0 = state.pitches.length;
    const jobs0 = state.jobs.size;
    const startMin = state.simTimeMin;
    while (state.simTimeMin - startMin < weeks * 7 * 1440) {
      advanceTime(state);
      if (derived.version !== deriveKey(state)) derived = derive(state, ctx);
      solveTick(state, ctx, derived, true);
    }
    return {
      newApps: state.applications.length - apps0,
      newPitches: state.pitches.length - pitches0,
      newJobs: state.jobs.size - jobs0,
    };
  }

  it('a tutorial mission gets ZERO unsolicited applications, pitches or random faults', () => {
    // m1 has overhead lines + open land, so the live game WOULD roll faults
    // and applications here — the guard must keep the lesson silent.
    for (const id of ['m1-first-light', 'm5-bill', 'm6-sun-store']) {
      const r = runScenario(id, 30);
      expect(r.newApps, `${id} spawned applications`).toBe(0);
      expect(r.newPitches, `${id} spawned innovation pitches`).toBe(0);
      expect(r.newJobs, `${id} rolled a random fault`).toBe(0);
    }
  }, 30_000);

  it("the SANDBOX (london) still spawns applications — the guard is mission-only", () => {
    // contrast: the same machinery, off the guard, must still flow in london
    // (otherwise the guard would have broken normal play).
    const r = runScenario('london', 30);
    expect(r.newApps).toBeGreaterThan(0);
  }, 30_000);

  it("m3's scripted storm fault STILL fires under the random-fault guard", () => {
    // the guard suppresses the RANDOM roll, but m3's storm injects its fault
    // directly via the script — that lesson beat must survive.
    const state = newGame('m3-storm');
    const ctx = newContext('m3-storm');
    missionOf('m3-storm')?.seed?.(state, ctx);
    let v = viewOf(state, ctx);
    state.simTimeMin = 39 * 60; // just past the scripted fault beat
    advanceMission(state, v);
    v = viewOf(state, ctx);
    expect(state.outages.size).toBe(1);
    expect(state.jobs.size).toBe(1);
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

describe('mission 6: sun & store', () => {
  it('needs BOTH a solar farm and a battery to win', () => {
    const state = newGame('m6-sun-store');
    const ctx = newContext('m6-sun-store');
    const m6 = missionOf('m6-sun-store');
    expect(m6).toBeDefined();
    if (!m6) return;
    const village = { x: 9, y: 12 };
    const solar = { x: 26, y: 17 };
    const battery = { x: 22, y: 14 };

    // solar + dist sub + a 33 kV line, but NO battery: the lesson's point is
    // that solar alone isn't enough — the win must require storage too
    directBuildGen(state, ctx.map, 'solarFarm', solar.x, solar.y);
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: village.x, y: village.y },
    });
    mustApply(state, ctx.map, {
      type: 'build',
      spec: {
        kind: 'line',
        level: 33,
        build: 'overhead',
        ax: solar.x,
        ay: solar.y,
        bx: village.x,
        by: village.y,
      },
    });
    commissionAll(state);
    let v = viewOf(state, ctx);
    expect(m6.win(v)).toBe(false); // no battery yet

    // add the battery beside the field: the storage requirement is met
    directBuildGen(state, ctx.map, 'battery', battery.x, battery.y);
    mustApply(state, ctx.map, {
      type: 'build',
      spec: {
        kind: 'line',
        level: 33,
        build: 'overhead',
        ax: battery.x,
        ay: battery.y,
        bx: village.x,
        by: village.y,
      },
    });
    commissionAll(state);
    v = viewOf(state, ctx);
    // both required generators are now present and wired in
    expect(v.assets.some((a) => a.kind === 'gen' && a.gen === 'solarFarm')).toBe(true);
    expect(v.assets.some((a) => a.kind === 'gen' && a.gen === 'battery')).toBe(true);
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
