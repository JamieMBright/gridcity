// Paris is a full playable scenario (not a tutorial mission): it builds, it
// resolves France's operating-model profiles, and the worker's opening seed
// lands the iDNO estates on the Paris map — not London's coordinates.

import { describe, expect, it } from 'vitest';
import { newGame, newContext, seedScenario } from '../src/sim/state';
import { getScenario, profileOf } from '../src/data/cityRegistry';
import { FRANCE_ECONOMY, FRANCE_MARKET, FRANCE_REGULATOR } from '../src/sim/powerProfile';

describe('Paris scenario', () => {
  it('is registered as a full (non-mission) city', () => {
    const s = getScenario('paris');
    expect(s.name).toContain('Paris');
    expect(s.mission ?? false).toBe(false);
  });

  it('resolves the France operating-model profiles', () => {
    const p = profileOf('paris');
    expect(p.market).toBe(FRANCE_MARKET);
    expect(p.regulator).toBe(FRANCE_REGULATOR);
    expect(p.economy).toBe(FRANCE_ECONOMY);
    expect(p.economy.symbol).toBe('€');
    // GB-defaulted blocks stay London's (50 Hz, winter-peak)
    expect(p.power.nominalHz).toBe(50);
  });

  it('builds a valid map with the arrondissement councils', () => {
    const ctx = newContext('paris');
    expect(ctx.map.width).toBeGreaterThan(100);
    expect(ctx.map.councils.length).toBeGreaterThanOrEqual(20);
    expect(ctx.map.style).toBe('paris');
    expect(ctx.map.estates && ctx.map.estates.length).toBeGreaterThan(0);
  });

  it("seeds the iDNO estates onto Paris's own map", () => {
    const state = newGame('paris');
    const ctx = newContext('paris');
    seedScenario(state, ctx);
    const idnoSubs = [...state.assets.values()].filter(
      (a) => a.kind === 'sub' && a.idno === true,
    );
    expect(idnoSubs.length).toBeGreaterThan(0);
    // every seeded estate sub sits on a real Paris tile (in bounds)
    for (const a of idnoSubs) {
      if (a.kind !== 'sub') continue;
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThan(ctx.map.width);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThan(ctx.map.height);
    }
  });
});
