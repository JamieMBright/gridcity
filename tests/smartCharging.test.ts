// Per-council smart charging (ROADMAP #18): a funded council's EV
// charging runs the smart (night-shifted) profile — its catchment's
// evening peak drops against a same-seed control and its overnight load
// rises; councils below the trust threshold refuse; the programme's
// £k/yr rides the flexibility bill line while funded and stops dead when
// wound down; the council flag survives a save round-trip and old saves
// hydrate clean without it.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { newCouncilState } from '../src/sim/customers/adoption';
import {
  applySetSmartCharging,
  councilEvCount,
  shapeSubLoads,
  SMART_CHARGE_MIN_SAT,
  smartChargingCostK,
  smartEvRatio,
} from '../src/sim/customers/smartCharging';
import { evProfile } from '../src/sim/events/weather';
import { computeSubLoads } from '../src/sim/service';
import { deserialize, newGame, serialize, type GameState, type SimContext } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

/** Dumb-profile EV evening peak (19:24) and an overnight moment (03:00). */
const EVENING_MIN = Math.round(19.4 * 60);
const NIGHT_MIN = 3 * 60;
/** poweredFixture's 3x3 suburb at 40 customers/tile. */
const COUNCIL_CUSTOMERS = 360;

/** poweredFixture with its suburb assigned to council 0 (satisfied, half
 *  the homes on EVs — enough signal for the profile maths). */
function councilFixture(satisfaction = 80): ReturnType<typeof poweredFixture> {
  const f = poweredFixture();
  f.ctx.map.councils.push({ id: 0, name: 'Testford', affluence: 0.5, ambition: 0.5, blurb: '' });
  for (let y = 19; y <= 21; y++) {
    for (let x = 19; x <= 21; x++) f.ctx.map.council[y * f.ctx.map.width + x] = 0;
  }
  f.state.councils.set(0, { ...newCouncilState(), satisfaction, ev: 0.5 });
  return f;
}

function connectedAt(state: GameState, ctx: SimContext, simTimeMin: number): number {
  state.simTimeMin = simTimeMin;
  return solveTick(state, ctx, derive(state, ctx), false).dispatch.connectedMW;
}

describe('shapeSubLoads', () => {
  it('re-shapes a funded majority-council catchment onto the smart EV profile', () => {
    const { state, ctx, ids } = councilFixture();
    state.simTimeMin = EVENING_MIN;
    const cs = state.councils.get(0);
    if (cs) cs.smartCharging = true;
    const d = derive(state, ctx);
    const loads = computeSubLoads(ctx.map, d.service.tilesOfSub, state.councils, state.loadSites);
    const before = loads.get(ids.dist)?.evMW ?? 0;
    expect(before).toBeGreaterThan(0);
    shapeSubLoads(loads, d.service.tilesOfSub, ctx.map, state.councils, state.tech, EVENING_MIN);
    const after = loads.get(ids.dist)?.evMW ?? 0;
    // dispatch multiplies by the global (dumb) factor — the pre-shaped MW
    // must land exactly on the smart profile's value
    expect(after * evProfile(EVENING_MIN, false)).toBeCloseTo(
      before * evProfile(EVENING_MIN, true),
      10,
    );
    // and the ratio itself is the smart/dumb profile quotient
    expect(smartEvRatio(EVENING_MIN) * evProfile(EVENING_MIN, false)).toBeCloseTo(
      evProfile(EVENING_MIN, true),
      10,
    );
  });

  it('leaves unfunded councils and ToU-less domestic load untouched', () => {
    const { state, ctx, ids } = councilFixture();
    const d = derive(state, ctx);
    const loads = computeSubLoads(ctx.map, d.service.tilesOfSub, state.councils, state.loadSites);
    const before = { ...(loads.get(ids.dist) ?? { domMW: 0, evMW: 0 }) };
    shapeSubLoads(loads, d.service.tilesOfSub, ctx.map, state.councils, state.tech, EVENING_MIN);
    expect(loads.get(ids.dist)?.evMW).toBe(before.evMW);
    expect(loads.get(ids.dist)?.domMW).toBe(before.domMW);
  });
});

describe('smart charging command', () => {
  it('funds and winds down via the command; unknown councils are rejected', () => {
    const { state, ctx } = councilFixture(80);
    const r = applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    expect(r.ok).toBe(true);
    expect(state.councils.get(0)?.smartCharging).toBe(true);
    // idempotent re-fund, then stop
    expect(applySetSmartCharging(state, ctx.map, { councilId: 0, on: true }).ok).toBe(true);
    const off = applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: false });
    expect(off.ok).toBe(true);
    expect(state.councils.get(0)?.smartCharging).toBe(false);
    expect(applySetSmartCharging(state, ctx.map, { councilId: 99, on: true }).ok).toBe(false);
  });

  it('a council below satisfaction 50 refuses until trust is rebuilt', () => {
    const { state, ctx } = councilFixture(SMART_CHARGE_MIN_SAT - 10);
    const r = applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/refuses/);
    expect(state.councils.get(0)?.smartCharging).toBeUndefined();
    // trust restored → the programme signs
    const cs = state.councils.get(0);
    if (cs) cs.satisfaction = SMART_CHARGE_MIN_SAT + 5;
    expect(applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: true }).ok).toBe(true);
  });
});

describe('catchment shaping vs same-seed control', () => {
  it("drops the funded council's evening peak and raises its overnight load", () => {
    const control = councilFixture();
    const funded = councilFixture();
    expect(
      applyCommand(funded.state, funded.ctx.map, {
        type: 'setSmartCharging',
        councilId: 0,
        on: true,
      }).ok,
    ).toBe(true);

    const evCtrl = connectedAt(control.state, control.ctx, EVENING_MIN);
    const evFund = connectedAt(funded.state, funded.ctx, EVENING_MIN);
    expect(evFund).toBeLessThan(evCtrl - 0.01);

    const nightCtrl = connectedAt(control.state, control.ctx, NIGHT_MIN);
    const nightFund = connectedAt(funded.state, funded.ctx, NIGHT_MIN);
    expect(nightFund).toBeGreaterThan(nightCtrl + 0.01);

    // the shift is exactly the smart/dumb profile gap on the council's EVs
    const evMW = (COUNCIL_CUSTOMERS * 0.5 * 1.1) / 1000;
    expect(evCtrl - evFund).toBeCloseTo(
      evMW * (evProfile(EVENING_MIN, false) - evProfile(EVENING_MIN, true)),
      6,
    );
  });

  it('adds nothing once the global smart-EV innovation has delivered', () => {
    const a = councilFixture();
    const b = councilFixture();
    a.state.tech.smartEv = true;
    b.state.tech.smartEv = true;
    applyCommand(b.state, b.ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    expect(connectedAt(a.state, a.ctx, EVENING_MIN)).toBeCloseTo(
      connectedAt(b.state, b.ctx, EVENING_MIN),
      9,
    );
  });

  it('nudges the funded council’s satisfaction above a same-seed control', () => {
    const control = councilFixture(70);
    const funded = councilFixture(70);
    applyCommand(funded.state, funded.ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    control.state.speed = 16;
    funded.state.speed = 16;
    for (let i = 0; i < 60; i++) {
      advanceTime(control.state);
      solveTick(control.state, control.ctx, derive(control.state, control.ctx), true);
      advanceTime(funded.state);
      solveTick(funded.state, funded.ctx, derive(funded.state, funded.ctx), true);
    }
    const satCtrl = control.state.councils.get(0)?.satisfaction ?? 0;
    const satFund = funded.state.councils.get(0)?.satisfaction ?? 0;
    expect(satFund).toBeGreaterThan(satCtrl);
  });
});

describe('bill integration', () => {
  it('the programme rate rides the flexibility line while funded and stops when wound down', () => {
    const { state, ctx } = councilFixture();
    applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    state.speed = 1;
    advanceTime(state);
    const out = solveTick(state, ctx, derive(state, ctx), true);
    const ev = state.councils.get(0)?.ev ?? 0;
    const expectedK = smartChargingCostK(COUNCIL_CUSTOMERS * ev);
    expect(expectedK).toBeGreaterThan(1); // £k/yr, not noise
    // (the rate is computed from the EV count at the top of the tick,
    // the assertion reads adoption after it — hence the loose precision)
    expect(out.bill.flexYrK).toBeCloseTo(state.flexYrK + expectedK, 3);

    // wound down → the line stops carrying it immediately
    applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: false });
    advanceTime(state);
    const after = solveTick(state, ctx, derive(state, ctx), true);
    expect(after.bill.flexYrK).toBeCloseTo(state.flexYrK, 6);
  });

  it('councilEvCount × programme price agrees with the quoted cost helper', () => {
    const { ctx } = councilFixture();
    const evs = councilEvCount(ctx.map, 0, 0.5);
    expect(evs).toBeCloseTo(COUNCIL_CUSTOMERS * 0.5, 6);
    expect(smartChargingCostK(evs)).toBeCloseTo(3.6, 6);
  });
});

describe('save round-trip', () => {
  it('round-trips the council flag and hydrates pre-programme saves clean', () => {
    const { state, ctx } = councilFixture();
    applyCommand(state, ctx.map, { type: 'setSmartCharging', councilId: 0, on: true });
    const back = deserialize(serialize(state));
    expect(back.councils.get(0)?.smartCharging).toBe(true);

    // an old save knows nothing of smartCharging or touTariff
    const data = serialize(newGame());
    data.councils = [[0, { ev: 0.1, hp: 0, pv: 0, satisfaction: 60 }]];
    delete (data.tech as Record<string, unknown> | undefined)?.['touTariff'];
    const old = deserialize(data);
    expect(old.councils.get(0)?.smartCharging).toBeUndefined();
    expect(old.tech.touTariff).toBeFalsy();
    // and it ticks clean
    old.speed = 1;
    advanceTime(old);
    expect(() => solveTick(old, ctx, derive(old, ctx), true)).not.toThrow();
  });
});
