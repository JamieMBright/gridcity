// Wave 9 — the bespoke Heathrow PV+BESS opportunity (owner: "make
// opportunity specifically for heathrow to get a big pv and bess
// installation application at random point in the game"). It must fire ONCE,
// deterministically, sited on the airport estate, and route through the
// normal connection-study + firm/flex acceptance flow — accepting it must
// build BOTH the solar PV and the paired battery.

import { describe, expect, it } from 'vitest';
import { newGame, newContext, seedScenario } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick } from '../src/sim/tick';
import { applyCommand } from '../src/sim/commands';
import {
  buildHeathrowScheme,
  HEATHROW_BESS_MW,
  HEATHROW_PV_MW,
} from '../src/sim/events/applications';
import { connectionStudy } from '../src/sim/study';

/** Run a seeded london game the worker's way for `days` game-days, counting
 *  the Heathrow apps that ever appeared. The scheme's fire-time is pulled
 *  forward so the run stays short while still exercising the real tick path
 *  (the schedule itself is asserted deterministic separately). */
function runHeathrow(days: number, fireOnDay: number): {
  state: ReturnType<typeof newGame>;
  heathrowApps: number;
} {
  const state = newGame('london');
  const ctx = newContext('london');
  seedScenario(state, ctx);
  state.heathrowSchemeMin = state.simTimeMin + fireOnDay * 1440;
  state.speed = 16;
  let derived = derive(state, ctx);
  const start = state.simTimeMin;
  let heathrowApps = 0;
  const seen = new Set<number>();
  while (state.simTimeMin - start < days * 1440) {
    advanceTime(state);
    if (derived.version !== deriveKey(state)) derived = derive(state, ctx);
    solveTick(state, ctx, derived, true);
    for (const a of state.applications) {
      if (a.heathrow && !seen.has(a.id)) {
        seen.add(a.id);
        heathrowApps++;
      }
    }
  }
  return { state, heathrowApps };
}

describe('Heathrow PV+BESS scheme', () => {
  it('schedules a deterministic fire-time once per game', () => {
    const a = newGame('london');
    const b = newGame('london');
    const ca = newContext('london');
    const cb = newContext('london');
    seedScenario(a, ca);
    seedScenario(b, cb);
    expect(a.heathrowSchemeMin).toBeDefined();
    expect(a.heathrowSchemeMin).toBe(b.heathrowSchemeMin); // deterministic
    expect(a.heathrowSchemeFired).toBe(false);
    // a few months to ~2 years in
    expect((a.heathrowSchemeMin ?? 0) / 1440).toBeGreaterThanOrEqual(120);
    expect((a.heathrowSchemeMin ?? 0) / 1440).toBeLessThanOrEqual(740);
  });

  it('fires exactly once over a seeded run, sited at the airport, with a banner', () => {
    // fire on day 3, run 12 days: the scheme appears once and never again,
    // and its banner is still in the (capped) event ring right after
    const { state, heathrowApps } = runHeathrow(12, 3);
    expect(heathrowApps).toBe(1);
    expect(state.heathrowSchemeFired).toBe(true);
    const app = state.applications.find((a) => a.heathrow);
    expect(app).toBeDefined();
    expect(app?.mw).toBe(HEATHROW_PV_MW);
    expect(app?.bessMw).toBe(HEATHROW_BESS_MW);
    // sited within the airport estate (terminal ~65,87)
    expect(Math.hypot((app?.x ?? 0) - 65, (app?.y ?? 0) - 87)).toBeLessThanOrEqual(9);
    // surfaced on the news banner
    expect(state.events.some((e) => /Heathrow/i.test(e.msg))).toBe(true);
  }, 20_000);

  it('never fires twice across a long run (once per game)', () => {
    // fire on day 5, then keep running well past it
    const { heathrowApps } = runHeathrow(90, 5);
    expect(heathrowApps).toBe(1);
  }, 30_000);

  it('the builder sites the scheme as flagged solar with a paired battery', () => {
    const ctx = newContext('london');
    const app = buildHeathrowScheme(ctx.map, 0, 99, () => false);
    expect(app).toBeDefined();
    expect(app?.kind).toBe('solarFarm'); // studies/connects as generation
    expect(app?.heathrow).toBe(true);
    expect(app?.bessMw).toBe(HEATHROW_BESS_MW);
  });

  it('runs through the connection study like any generation application', () => {
    const state = newGame('london');
    const ctx = newContext('london');
    seedScenario(state, ctx);
    const app = buildHeathrowScheme(ctx.map, state.simTimeMin, state.nextAppId, () => false);
    expect(app).toBeDefined();
    const study = connectionStudy(state, ctx, app!);
    // a clean study object comes back (ok true with a bay, or a clear error
    // if no compatible bay exists yet) — the point is it routes through
    expect(study.appId).toBe(app!.id);
    expect(typeof study.recommendation).toBe('string');
  });

  it('accepting the scheme builds BOTH the PV and the battery', () => {
    const state = newGame('london');
    const ctx = newContext('london');
    seedScenario(state, ctx);
    const app = buildHeathrowScheme(ctx.map, state.simTimeMin, state.nextAppId, () => false)!;
    state.nextAppId++;
    state.applications.push(app);
    const before = state.assets.size;
    const res = applyCommand(state, ctx.map, {
      type: 'respondApplication',
      appId: app.id,
      response: 'firm',
    });
    expect(res.ok).toBe(true);
    // a solar gen + a battery gen joined the network
    expect(state.assets.size).toBe(before + 2);
    const gens = [...state.assets.values()].filter((a) => a.kind === 'gen');
    expect(gens.some((g) => g.kind === 'gen' && g.gen === 'solarFarm')).toBe(true);
    expect(gens.some((g) => g.kind === 'gen' && g.gen === 'battery')).toBe(true);
    expect(app.status).toBe('firm');
    expect(app.connectByMin).toBeDefined();
  });
});
