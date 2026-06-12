// Connection studies: the firm/flexible decision stops being blind.

import { describe, expect, it } from 'vitest';
import type { Application } from '../src/sim/events/applications';
import { newGame } from '../src/sim/state';
import { connectionStudy } from '../src/sim/study';
import { makeContext, makeTestMap, poweredFixture } from './helpers';

function app(partial: Partial<Application> & Pick<Application, 'kind' | 'x' | 'y' | 'mw'>): Application {
  return {
    id: 1,
    name: 'Test Applicant',
    customers: partial.kind === 'dataCentre' ? 50 : 0,
    decideByMin: 99_999_999,
    status: 'open',
    ...partial,
  };
}

describe('connection study', () => {
  it('a big data centre on a small catchment reports the transformer impact', () => {
    const { state, ctx } = poweredFixture();
    const study = connectionStudy(
      state,
      ctx,
      app({ kind: 'dataCentre', x: 20, y: 20, mw: 120 }),
    );
    expect(study.ok).toBe(true);
    // 120 MW into a 20 MVA dist catchment pins kit at its rating
    expect(study.impacts.length).toBeGreaterThan(0);
    expect(study.impacts[0]?.afterPct).toBeGreaterThanOrEqual(90);
    expect(study.recommendation).toMatch(/reinforce/i);
    // and the study never touched the live state
    expect([...state.assets.values()].some((a) => a.kind === 'gen' && a.customer)).toBe(false);
    expect(state.loadSites.length).toBe(0);
  });

  it('generation quotes the line to the nearest bay', () => {
    const { state, ctx } = poweredFixture();
    const study = connectionStudy(state, ctx, app({ kind: 'windOnshore', x: 25, y: 5, mw: 100 }));
    expect(study.ok).toBe(true);
    expect(study.level).toBe(33);
    expect(study.bayName).toBeDefined();
    expect(study.distKm).toBeGreaterThan(0);
    expect(study.lineCapexK ?? 0).toBeGreaterThan(0);
    expect(study.recommendation.length).toBeGreaterThan(0);
  });

  it('an empty network fails the study with advice, not a crash', () => {
    const map = makeTestMap(20, 20);
    const ctx = makeContext(map);
    const state = newGame();
    const study = connectionStudy(state, ctx, app({ kind: 'windOnshore', x: 5, y: 5, mw: 100 }));
    expect(study.ok).toBe(false);
    expect(study.error).toMatch(/no 33 kV bay/);
    const load = connectionStudy(state, ctx, app({ kind: 'dataCentre', x: 5, y: 5, mw: 60 }));
    expect(load.ok).toBe(false);
    expect(load.error).toMatch(/service catchment/);
  });
});
