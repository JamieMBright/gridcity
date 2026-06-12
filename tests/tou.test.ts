// Time-of-use tariff pilot (ROADMAP #24): once the innovation delivers,
// the licence-wide domestic profile shaves ~8% off the evening peak and
// fills the midday shoulder so the day's energy is conserved (±1%, in
// any season); satisfaction dips at launch and recovers as the grumble
// fades; the pilot arrives through the standard pitch → fund → deliver
// path.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { newCouncilState } from '../src/sim/customers/adoption';
import {
  PITCH_DEFS,
  TOU_DIP_DAYS,
  TOU_DIP_SAT,
  touSatisfactionOffset,
  type Pitch,
} from '../src/sim/events/innovation';
import { domesticProfile, MIDSUMMER_MIN, MIDWINTER_MIN } from '../src/sim/events/weather';
import { touDomesticRatio } from '../src/sim/map/demand';
import { type GameState, type SimContext } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

/** Domestic evening peak (18:24) and the midday shoulder (13:00). */
const EVENING_MIN = Math.round(18.4 * 60);
const MIDDAY_MIN = 13 * 60;

function connectedAt(state: GameState, ctx: SimContext, simTimeMin: number): number {
  state.simTimeMin = simTimeMin;
  return solveTick(state, ctx, derive(state, ctx), false).dispatch.connectedMW;
}

function succeededPitch(completesAtMin: number): Pitch {
  return {
    id: 9001,
    tech: 'touTariff',
    ...PITCH_DEFS.touTariff,
    decideByMin: 0,
    completesAtMin,
    status: 'succeeded',
  };
}

describe('touDomesticRatio profile', () => {
  for (const [season, dayStart] of [
    ['midwinter', MIDWINTER_MIN],
    ['midsummer', MIDSUMMER_MIN],
  ] as const) {
    it(`shaves ~8% off the evening peak with daily energy conserved (${season})`, () => {
      let baseSum = 0;
      let touSum = 0;
      let basePeak = 0;
      let touPeak = 0;
      for (let m = 0; m < 1440; m += 5) {
        const t = dayStart + m;
        const base = domesticProfile(t);
        const tou = base * touDomesticRatio(t);
        baseSum += base;
        touSum += tou;
        basePeak = Math.max(basePeak, base);
        touPeak = Math.max(touPeak, tou);
      }
      // energy conserved across the day, ±1% — the tariff moves WHEN, not how much
      expect(touSum / baseSum).toBeGreaterThan(0.99);
      expect(touSum / baseSum).toBeLessThan(1.01);
      // the peak comes down ~8%
      expect(touPeak / basePeak).toBeGreaterThan(0.9);
      expect(touPeak / basePeak).toBeLessThan(0.94);
      // shoulder fills (>1 midday), peak shaves (<1 evening)
      expect(touDomesticRatio(dayStart + MIDDAY_MIN)).toBeGreaterThan(1);
      expect(touDomesticRatio(dayStart + EVENING_MIN)).toBeLessThan(1);
    });
  }
});

describe('licence-wide demand shaping', () => {
  it('adopted ToU lowers the evening peak and raises midday vs a same-seed control', () => {
    const control = poweredFixture();
    const tou = poweredFixture();
    tou.state.tech.touTariff = true;

    expect(connectedAt(tou.state, tou.ctx, EVENING_MIN)).toBeLessThan(
      connectedAt(control.state, control.ctx, EVENING_MIN) - 0.01,
    );
    expect(connectedAt(tou.state, tou.ctx, MIDDAY_MIN)).toBeGreaterThan(
      connectedAt(control.state, control.ctx, MIDDAY_MIN) + 0.01,
    );
  });
});

describe('launch satisfaction dip', () => {
  it('offsets the target by the full dip at launch, fading to nothing', () => {
    const launch = 100_000;
    const pitches = [succeededPitch(launch)];
    expect(touSatisfactionOffset(launch - 1, pitches)).toBe(0);
    expect(touSatisfactionOffset(launch, pitches)).toBeCloseTo(-TOU_DIP_SAT, 10);
    expect(touSatisfactionOffset(launch + (TOU_DIP_DAYS / 2) * 1440, pitches)).toBeCloseTo(
      -TOU_DIP_SAT / 2,
      10,
    );
    expect(touSatisfactionOffset(launch + TOU_DIP_DAYS * 1440, pitches)).toBe(0);
    expect(touSatisfactionOffset(launch, [])).toBe(0);
    expect(
      touSatisfactionOffset(launch, [{ ...succeededPitch(launch), status: 'funded' }]),
    ).toBe(0);
  });

  it('dips council satisfaction at launch, then recovers once the grumble fades', () => {
    const fixture = (): ReturnType<typeof poweredFixture> => {
      const f = poweredFixture();
      f.ctx.map.councils.push({ id: 0, name: 'Testford', affluence: 0.5, ambition: 0.5, blurb: '' });
      for (let y = 19; y <= 21; y++) {
        for (let x = 19; x <= 21; x++) f.ctx.map.council[y * f.ctx.map.width + x] = 0;
      }
      f.state.councils.set(0, { ...newCouncilState(), satisfaction: 70 });
      return f;
    };
    const control = fixture();
    const tou = fixture();
    tou.state.pitches.push(succeededPitch(tou.state.simTimeMin));

    const run = (s: GameState, ctx: SimContext, ticks: number): void => {
      s.speed = 16;
      for (let i = 0; i < ticks; i++) {
        advanceTime(s);
        solveTick(s, ctx, derive(s, ctx), true);
      }
    };
    const sat = (s: GameState): number => s.councils.get(0)?.satisfaction ?? 0;

    run(control.state, control.ctx, 50);
    run(tou.state, tou.ctx, 50);
    const dipGap = sat(control.state) - sat(tou.state);
    expect(dipGap).toBeGreaterThan(0.3); // launch grumble visible

    // fast-forward both past the dip window; the gap closes
    control.state.simTimeMin += TOU_DIP_DAYS * 1440;
    tou.state.simTimeMin += TOU_DIP_DAYS * 1440;
    const dipped = sat(tou.state);
    run(control.state, control.ctx, 100);
    run(tou.state, tou.ctx, 100);
    expect(sat(tou.state)).toBeGreaterThan(dipped); // recovering
    expect(sat(control.state) - sat(tou.state)).toBeLessThan(dipGap * 0.6); // converging
  });
});

describe('pitch adoption path', () => {
  it('arrives as a fundable pitch and delivers tech.touTariff', () => {
    expect(PITCH_DEFS.touTariff.costK).toBeGreaterThan(0);
    const { state, ctx } = poweredFixture();
    state.pitches.push({
      id: 1,
      tech: 'touTariff',
      ...PITCH_DEFS.touTariff,
      successPct: 100, // deterministic delivery for the fixture
      decideByMin: state.simTimeMin + 45 * 1440,
      status: 'open',
    });
    state.innovationFundK = PITCH_DEFS.touTariff.costK;
    const r = applyCommand(state, ctx.map, { type: 'fundPitch', pitchId: 1 });
    expect(r.ok).toBe(true);
    const pitch = state.pitches.find((p) => p.id === 1);
    expect(pitch?.status).toBe('funded');

    // skip to completion; the next tick delivers the capability
    state.simTimeMin = (pitch?.completesAtMin ?? 0) - 1;
    state.speed = 1;
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);
    expect(pitch?.status).toBe('succeeded');
    expect(state.tech.touTariff).toBe(true);
  });
});
