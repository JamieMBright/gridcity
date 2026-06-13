// ROADMAP #53 — the network business: directorates + workplace culture.
// Proves: the dials cost the right £/yr and ride the bill (decay-free —
// it's a standing cost); the engagement inverted-U (benefit rises then
// FALLS past the plateau); each wired buff measurably moves its real
// mechanic vs a same-seed control; and the additive save round-trips +
// hydrates pre-feature saves clean.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import {
  connectionCadenceMul,
  DIR_MAX,
  DIR_STEP_K,
  PAY_PEAK,
  PAY_STEP_K,
  SAFETY_STEP_K,
  earlyWarnFrac,
  engagementScore,
  fleetSpeedMul,
  innovationSuccessMul,
  newOrg,
  orgYrK,
  satisfactionBonus,
  vegGrowthMul,
} from '../src/sim/events/directorates';
import { deserialize, newGame, serialize, type SaveData } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';
import { routeTiles } from '../src/sim/cost';
import { computeBill } from '../src/sim/regulation/bill';
import { lineBranchId } from '../src/sim/assets';

describe('directorate / pay / safety costs ride the bill', () => {
  it('orgYrK sums the dials with level-1 directorates free', () => {
    expect(orgYrK(undefined)).toBe(0);
    expect(orgYrK(newOrg())).toBe(0); // all neutral / zero

    const org = newOrg();
    org.dirs.operations = 3; // +2 steps over neutral
    org.pay = 4;
    org.safety = 2;
    expect(orgYrK(org)).toBe(2 * DIR_STEP_K + 4 * PAY_STEP_K + 2 * SAFETY_STEP_K);
  });

  it('running a directorate lean BELOW neutral is a saving', () => {
    const org = newOrg();
    org.dirs.asset = 0; // one step below neutral
    expect(orgYrK(org)).toBe(-DIR_STEP_K);
  });

  it('the cost lands on the household bill (penalty/constraint line)', () => {
    // a non-zero org cost lifts the bill's constraint line vs a control
    const make = (paid: boolean): number => {
      const org = newOrg();
      if (paid) org.pay = 5;
      // emulate tick's penaltyYrK fold
      const penaltyYrK = orgYrK(org);
      const bill = computeBill({
        assets: [],
        energyYrK: 0,
        ppaYrK: 0,
        lossYrK: 0,
        servedCustomers: 1000,
        totalCustomers: 1000,
        fleetSize: 0,
        vegPolicy: 0,
        vegCostMul: 1,
        flexYrK: 0,
        constraintYrK: 0,
        penaltyYrK,
        levyPct: 0,
      });
      return bill.constraintYrK;
    };
    expect(make(true)).toBeGreaterThan(make(false));
    expect(make(true)).toBeCloseTo(5 * PAY_STEP_K, 5);
  });
});

describe('the engagement inverted-U (complacency plateau)', () => {
  it('rises to the peak then FALLS past it', () => {
    const atZero = engagementScore(0);
    const atPeak = engagementScore(PAY_PEAK);
    const atMax = engagementScore(10);
    // monotone rise up to the peak
    expect(engagementScore(1)).toBeGreaterThan(atZero);
    expect(engagementScore(3)).toBeGreaterThan(engagementScore(1));
    expect(atPeak).toBeGreaterThan(engagementScore(PAY_PEAK - 1));
    // the peak is the maximum — overspending inverts the benefit
    expect(atPeak).toBeGreaterThan(atMax);
    expect(engagementScore(PAY_PEAK + 1)).toBeLessThan(atPeak);
    expect(engagementScore(PAY_PEAK + 1)).toBeGreaterThan(atMax); // still gently sloping down
  });

  it('a well-funded org flirts ~90% engagement', () => {
    expect(engagementScore(PAY_PEAK)).toBeGreaterThan(88);
    expect(engagementScore(PAY_PEAK)).toBeLessThanOrEqual(95);
  });

  it('the wired multipliers track the inverted-U: peak beats overspend', () => {
    const peak = newOrg();
    peak.pay = PAY_PEAK;
    const over = newOrg();
    over.pay = 10;
    // fleet speed, cadence, innovation all peak at the sweet spot
    expect(fleetSpeedMul(peak)).toBeGreaterThan(fleetSpeedMul(over));
    expect(connectionCadenceMul(peak)).toBeGreaterThan(connectionCadenceMul(over));
    expect(innovationSuccessMul(peak)).toBeGreaterThan(innovationSuccessMul(over));
  });
});

describe('wired multipliers are neutral at the default org', () => {
  it('every multiplier is 1.0 / 0 at a fresh org', () => {
    const o = newOrg();
    expect(fleetSpeedMul(o)).toBeCloseTo(1, 6);
    expect(vegGrowthMul(o)).toBeCloseTo(1, 6);
    expect(connectionCadenceMul(o)).toBeCloseTo(1, 6);
    expect(innovationSuccessMul(o)).toBeCloseTo(1, 6);
    expect(satisfactionBonus(o)).toBe(0);
    // and undefined org (untouched save) is identical
    expect(fleetSpeedMul(undefined)).toBeCloseTo(1, 6);
    expect(satisfactionBonus(undefined)).toBe(0);
  });

  it('staffing a directorate up improves its buff; lean degrades it', () => {
    const rich = newOrg();
    rich.dirs.operations = DIR_MAX;
    const lean = newOrg();
    lean.dirs.operations = 0;
    expect(fleetSpeedMul(rich)).toBeGreaterThan(1);
    expect(fleetSpeedMul(lean)).toBeLessThan(1);

    const proactive = newOrg();
    proactive.dirs.asset = DIR_MAX;
    expect(vegGrowthMul(proactive)).toBeLessThan(1); // slower overgrowth = better
    expect(earlyWarnFrac(proactive)).toBeLessThan(earlyWarnFrac(newOrg())); // earlier warning
  });
});

describe('wired buffs measurably move their real mechanic (same-seed control)', () => {
  /** Run N accumulating ticks on a fixture whose 132 kV route runs
   *  through woodland; return the final overgrowth on that line. */
  function vegAfter(ticks: number, paid: boolean): number {
    const { state, ctx, ids } = poweredFixture();
    // lay woodland along the line132 route so vegetation can creep
    // (poweredFixture's gas plant sits at 5,5 and the grid sub at 15,15)
    for (const [x, y] of routeTiles(5, 5, 15, 15)) {
      ctx.map.vegetation[y * ctx.map.width + x] = 255;
    }
    if (paid) {
      // proactive, engaged asset team trims ahead of the season
      state.org = newOrg();
      state.org.dirs.asset = DIR_MAX;
      state.org.pay = PAY_PEAK;
    }
    let derived = derive(state, ctx);
    for (let i = 0; i < ticks; i++) {
      advanceTime(state);
      solveTick(state, ctx, derived, true);
      derived = derive(state, ctx);
    }
    return state.lineVeg.get(ids.line132) ?? 0;
  }

  it('proactive vegetation management slows overgrowth vs control', () => {
    const control = vegAfter(400, false);
    const funded = vegAfter(400, true);
    expect(control).toBeGreaterThan(0); // the route DID overgrow without the buff
    expect(funded).toBeLessThan(control); // the engaged asset team kept it down
  });

  it('a faulted line restores faster with a staffed control room', () => {
    // measure repair progress over a fixed window with a depot+van, ops
    // staffed vs neutral — faster fleet step clears the job sooner
    function progressLeft(paid: boolean): number {
      const { state, ctx, ids } = poweredFixture();
      // a depot + a van so the fleet actually rolls
      const depot = state.nextAssetId++;
      state.assets.set(depot, { id: depot, kind: 'depot', x: 14, y: 14 });
      state.fleetSize = 1;
      state.assetsVersion++;
      // open a repair job on the 33 kV line by hand (deterministic, no RNG)
      const bId = lineBranchId(ids.line33);
      state.outages.set(bId, -1);
      state.outageCause.set(bId, 'test fault');
      state.jobs.set(bId, {
        branchId: bId,
        assetId: ids.line33,
        x: 15, // the grid sub end of the 33 kV line
        y: 15,
        repairMin: 240,
        waitedMin: 0,
        label: 'test fault',
      });
      if (paid) {
        state.org = newOrg();
        state.org.dirs.operations = DIR_MAX;
        state.org.pay = PAY_PEAK;
      }
      let derived = derive(state, ctx);
      for (let i = 0; i < 30; i++) {
        advanceTime(state);
        solveTick(state, ctx, derived, true);
        derived = derive(state, ctx);
        if (!state.jobs.has(bId)) break;
      }
      return state.jobs.get(bId)?.repairMin ?? 0; // 0 = fully restored
    }
    const control = progressLeft(false);
    const funded = progressLeft(true);
    expect(funded).toBeLessThan(control); // a staffed crew got further / finished
  });
});

describe('command validation + save round-trip', () => {
  it('rejects out-of-range dials, accepts valid ones', () => {
    const s = newGame();
    expect(applyCommand(s, {} as never, { type: 'setPay', level: 99 }).ok).toBe(false);
    expect(applyCommand(s, {} as never, { type: 'setPay', level: 4 }).ok).toBe(true);
    expect(s.org?.pay).toBe(4);
    expect(
      applyCommand(s, {} as never, { type: 'setDirectorate', directorate: 'asset', level: 3 }).ok,
    ).toBe(true);
    expect(s.org?.dirs.asset).toBe(3);
    expect(
      applyCommand(s, {} as never, { type: 'setSafetyProgramme', level: 6 }).ok,
    ).toBe(true);
    expect(s.org?.safety).toBe(6);
  });

  it('serialize → deserialize preserves the org', () => {
    const s = newGame();
    applyCommand(s, {} as never, { type: 'setPay', level: 5 });
    applyCommand(s, {} as never, { type: 'setSafetyProgramme', level: 4 });
    applyCommand(s, {} as never, { type: 'setDirectorate', directorate: 'operations', level: 4 });
    const back = deserialize(serialize(s));
    expect(back.org?.pay).toBe(5);
    expect(back.org?.safety).toBe(4);
    expect(back.org?.dirs.operations).toBe(4);
  });

  it('a pre-feature save (no org) hydrates to a neutral org', () => {
    const legacy = { ...serialize(newGame()) } as SaveData;
    delete legacy.org;
    const back = deserialize(legacy);
    expect(back.org).toBeUndefined();
    expect(orgYrK(back.org)).toBe(0);
    expect(fleetSpeedMul(back.org)).toBeCloseTo(1, 6);
  });

  it('an untouched org leaves the save byte-identical to pre-feature', () => {
    const data = serialize(newGame());
    expect('org' in data).toBe(false);
  });
});
