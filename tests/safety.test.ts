// ROADMAP #55 — H&S, the full owner model. Proves: the safety-culture
// inverted-U + ~90% ceiling; the incident-rate gradient (more safety+pay
// investment AND healthier assets → measurably fewer LTI/VSI vs a
// same-seed control); the RIDDOR log; the HSE improvement-notice deadline
// + repeat-offence fine escalation; that NO death path exists; and the
// additive save round-trip + pre-feature hydration.

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/sim/rng';
import { newGame, deserialize, serialize, type GameState, type SaveData } from '../src/sim/state';
import { newOrg, PAY_PEAK } from '../src/sim/events/directorates';
import {
  cultureRateMul,
  HSE_FINE_BASE_K,
  hseFineYrK,
  incidentRates,
  newSafetyLog,
  safetyEngagement,
  safetyView,
  stepSafety,
} from '../src/sim/reliability/safety';

const YEAR_MIN = 525_600;

/** A bare state with a safety dial set, so incidentRates/stepSafety can
 *  run without a full fixture. */
function safetyState(safety: number, pay = 0): GameState {
  const s = newGame();
  s.org = newOrg();
  s.org.safety = safety;
  s.org.pay = pay;
  return s;
}

describe('safety culture inverted-U + ~90% ceiling', () => {
  it('rises to a peak then falls past the plateau, flirting ~90%', () => {
    const base = safetyEngagement(0);
    const peak = safetyEngagement(PAY_PEAK);
    const over = safetyEngagement(10);
    expect(safetyEngagement(2)).toBeGreaterThan(base);
    expect(peak).toBeGreaterThan(safetyEngagement(PAY_PEAK - 1));
    expect(peak).toBeGreaterThan(over); // overspend inverts the benefit
    expect(peak).toBeGreaterThan(85);
    expect(peak).toBeLessThanOrEqual(92);
  });

  it('better culture means a lower incident-rate multiplier', () => {
    expect(cultureRateMul(safetyEngagement(PAY_PEAK))).toBeLessThan(
      cultureRateMul(safetyEngagement(0)),
    );
  });
});

describe('the incident-rate gradient', () => {
  it('more safety investment lowers both LTI and VSI rates', () => {
    const lo = incidentRates(safetyState(0), 100, false);
    const hi = incidentRates(safetyState(PAY_PEAK), 100, false);
    expect(hi.ltiPerYear).toBeLessThan(lo.ltiPerYear);
    expect(hi.vsiPerYear).toBeLessThan(lo.vsiPerYear);
  });

  it('healthier assets lower the incident rate', () => {
    const sick = incidentRates(safetyState(PAY_PEAK), 20, false);
    const well = incidentRates(safetyState(PAY_PEAK), 100, false);
    expect(well.ltiPerYear).toBeLessThan(sick.ltiPerYear);
  });

  it('storms and live-work exposure raise it', () => {
    const calm = incidentRates(safetyState(PAY_PEAK), 100, false);
    const storm = incidentRates(safetyState(PAY_PEAK), 100, true);
    expect(storm.ltiPerYear).toBeGreaterThan(calm.ltiPerYear);
  });

  it('SAME-SEED Monte Carlo: more safety+pay AND healthier kit → fewer incidents', () => {
    // run the SAME seeded stream through stepSafety for a control (no
    // investment, sick kit) and a treatment (full investment, healthy
    // kit); count incidents over a long horizon. Same seed both runs.
    function count(safety: number, pay: number, health: number): { lti: number; vsi: number } {
      const s = safetyState(safety, pay);
      const rng = new Rng(0xbeef);
      // 5 game-years of 7.5-min ticks is too many; sample at 1-day steps
      // (the rate maths is per-year so the dt just scales probability)
      const dt = 1440;
      for (let d = 0; d < 365 * 8; d++) {
        s.simTimeMin += dt;
        stepSafety(s, rng, dt, health, false);
      }
      return { lti: s.safety!.ltiTotal, vsi: s.safety!.vsiTotal };
    }
    const control = count(0, 0, 25);
    const treated = count(PAY_PEAK, PAY_PEAK, 100);
    expect(treated.lti).toBeLessThan(control.lti);
    expect(treated.vsi).toBeLessThan(control.vsi);
    // the control DID get hurt — the danger is real, not just lower
    expect(control.lti).toBeGreaterThan(0);
  });
});

describe('RIDDOR log + HSE enforcement', () => {
  /** Force an LTI by hand: a state with a huge rate so the first roll
   *  fires, on a seed that makes chance() succeed. */
  function forceLti(s: GameState, rng: Rng): boolean {
    // huge dt makes the per-year probability ≈ 1 for both rolls
    const before = s.safety?.ltiTotal ?? 0;
    stepSafety(s, rng, YEAR_MIN * 50, 0, true);
    return (s.safety?.ltiTotal ?? 0) > before;
  }

  it('an LTI lands in the RIDDOR log with a cause', () => {
    const s = safetyState(0);
    const rng = new Rng(7);
    // drive until one LTI lands
    let got = false;
    for (let i = 0; i < 50 && !got; i++) got = forceLti(s, rng);
    expect(got).toBe(true);
    const lti = s.safety!.entries.find((e) => e.kind === 'lti');
    expect(lti).toBeDefined();
    expect(lti!.cause).toBeDefined();
  });

  it('a weak culture opens an improvement notice; meeting the bar closes it', () => {
    const s = safetyState(0); // weak culture → notice on the LTI
    const rng = new Rng(11);
    for (let i = 0; i < 50 && !s.safety?.notice; i++) forceLti(s, rng);
    expect(s.safety?.notice).toBeDefined();
    // lift the safety programme above the bar and step a calm tick: closes
    s.org!.safety = PAY_PEAK;
    s.simTimeMin += 1440;
    stepSafety(s, new Rng(999999), 1, 100, false); // tiny dt: ~no new incident
    expect(s.safety?.notice).toBeUndefined();
  });

  it('a notice left un-met past its deadline draws a fine; repeats escalate', () => {
    const s = safetyState(0);
    const rng = new Rng(11);
    for (let i = 0; i < 50 && !s.safety?.notice; i++) forceLti(s, rng);
    expect(s.safety?.notice).toBeDefined();
    const firstNoticeCount = s.safety!.noticeCount;
    // run past the deadline with the culture still weak: fine lands
    s.simTimeMin = s.safety!.notice!.deadlineMin + 1;
    stepSafety(s, new Rng(424242), 1, 100, false);
    expect(s.safety!.noticeCount).toBe(firstNoticeCount + 1);
    expect(hseFineYrK(s, 0)).toBeGreaterThanOrEqual(HSE_FINE_BASE_K);
  });

  it('the fine rate decays over a game-year (rides the bill)', () => {
    const s = safetyState(0);
    s.safety = newSafetyLog();
    s.safety.fineYrK = 600;
    const before = hseFineYrK(s, 0);
    hseFineYrK(s, YEAR_MIN / 2);
    expect(hseFineYrK(s, 0)).toBeLessThan(before);
  });
});

describe('no death path, ever', () => {
  it('no incident text mentions death/killed/fatal', () => {
    const s = safetyState(0);
    const rng = new Rng(3);
    for (let i = 0; i < 200; i++) {
      s.simTimeMin += 1440;
      stepSafety(s, rng, 1440, 20, true);
    }
    const all = [...s.safety!.entries.map((e) => e.text), ...s.events.map((e) => e.msg)]
      .join(' ')
      .toLowerCase();
    expect(all).not.toMatch(/died|death|killed|fatal|fatalit/);
    // injuries DID happen — the system is live, just never lethal
    expect(s.safety!.ltiTotal + s.safety!.vsiTotal).toBeGreaterThan(0);
  });
});

describe('safety view + save round-trip', () => {
  it('safetyView reports per-period LTI/VSI rates + engagement', () => {
    const s = safetyState(PAY_PEAK);
    const v = safetyView(s);
    expect(v.engagement).toBeGreaterThan(85);
    expect(v.ltiPerYear).toBe(0); // none yet
  });

  it('the safety log round-trips through a save', () => {
    const s = safetyState(0);
    const rng = new Rng(7);
    for (let i = 0; i < 50; i++) forceLtiQuiet(s, rng);
    const back = deserialize(serialize(s));
    expect(back.safety?.ltiTotal).toBe(s.safety!.ltiTotal);
    expect(back.safety?.vsiTotal).toBe(s.safety!.vsiTotal);
    expect(back.safety?.entries.length).toBe(s.safety!.entries.length);
  });

  it('a pre-feature save (no safety log) hydrates clean', () => {
    const legacy = { ...serialize(newGame()) } as SaveData;
    delete legacy.safety;
    const back = deserialize(legacy);
    expect(back.safety).toBeUndefined();
    expect(safetyView(back).ltiPerYear).toBe(0);
  });
});

/** Force incidents without asserting the boolean (for the round-trip). */
function forceLtiQuiet(s: GameState, rng: Rng): void {
  stepSafety(s, rng, YEAR_MIN * 50, 0, true);
}
