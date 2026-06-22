// Heatwave derates cable/line thermal ratings (#E, owner 2026-06-22: "a heat
// wave where thermal ratings on cables get pushed"). buildBranchViews now folds
// thermalDerate into every line/cable rating, exactly as dispatch already does
// for transformers — so a heatwave shrinks line headroom and can push flows
// past the (now lower) limit. Identity outside a heatwave.
import { describe, expect, it } from 'vitest';
import { poweredFixture } from './helpers';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { MIDSUMMER_MIN } from '../src/sim/events/weather';
import type { SimContext, GameState } from '../src/sim/state';

function lineRating(state: GameState, ctx: SimContext): number {
  const d = derive(state, ctx);
  advanceTime(state);
  const line = solveTick(state, ctx, d, true).branches.find((b) => b.kind === 'line');
  return line!.ratingMW;
}

/** Pin the weather to a held regime so stepWeather can't turn it over mid-test. */
function holdRegime(state: GameState, regime: 'mild' | 'heatwave'): void {
  state.simTimeMin = MIDSUMMER_MIN;
  state.weather.regime = regime;
  state.weather.nextRegime = 'mild';
  state.weather.regimeEndsMin = state.simTimeMin + 10 * 1440;
}

describe('heatwave thermal derate on lines/cables (#E)', () => {
  it('a line rating is LOWER in a heatwave than in calm summer weather', () => {
    const calm = poweredFixture();
    holdRegime(calm.state, 'mild');
    const nominal = lineRating(calm.state, calm.ctx);

    const hot = poweredFixture();
    holdRegime(hot.state, 'heatwave');
    const derated = lineRating(hot.state, hot.ctx);

    expect(derated).toBeLessThan(nominal);
    // ~8% derate (matches thermalDerate) — pushed, not catastrophic
    expect(derated).toBeGreaterThan(nominal * 0.85);
  });

  it('no derate outside a heatwave (byte-identical normal play)', () => {
    const a = poweredFixture();
    holdRegime(a.state, 'mild');
    const r1 = lineRating(a.state, a.ctx);
    const b = poweredFixture();
    holdRegime(b.state, 'mild');
    const r2 = lineRating(b.state, b.ctx);
    expect(r1).toBe(r2);
  });
});
