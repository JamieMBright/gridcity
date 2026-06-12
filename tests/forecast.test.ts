// Demand-growth forecast: where adoption will cook a transformer.

import { describe, expect, it } from 'vitest';
import { forecastCatchments, projectCouncil } from '../src/sim/forecast';
import { newCouncilState } from '../src/sim/customers/adoption';
import { poweredFixture } from './helpers';

describe('demand-growth forecast', () => {
  it('an ambitious affluent council electrifies faster than a laggard', () => {
    const keen = projectCouncil(newCouncilState(), { affluence: 0.9, ambition: 0.9 }, 5);
    const slow = projectCouncil(newCouncilState(), { affluence: 0.2, ambition: 0.2 }, 5);
    expect(keen.ev).toBeGreaterThan(slow.ev);
    expect(keen.hp).toBeGreaterThan(slow.hp);
  });

  it('reports per-catchment horizon peaks and overload years', () => {
    const { state, ctx } = poweredFixture();
    // give the fixture a council so adoption has a profile to grow on
    for (const i of ctx.map.council.keys()) ctx.map.council[i] = 0;
    ctx.map.councils.push({ id: 0, name: 'Test', blurb: '', affluence: 0.9, ambition: 0.9 });
    const rows = forecastCatchments(state, ctx);
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    expect(r && r.peakHorizonMW >= r.peakNowMW).toBe(true);
    expect(r && r.yearsToOverload >= 0).toBe(true);
  });
});
