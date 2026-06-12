// ROADMAP #23 — the hydrogen endgame: electrolysers soak energy that
// would otherwise be CURTAILED into the H₂ store (and never consume ahead
// of unserved demand); converted peakers burn the store first (carbon 0,
// fuel at the H₂ offtake price) and fall back to gas price + gas carbon
// the moment the tanks run dry. The store rides state.soc per electrolyser
// — battery-style — so it serializes and hydrates with zero new plumbing.

import { describe, expect, it } from 'vitest';
import { GENS } from '../src/sim/catalog';
import { applyCommand } from '../src/sim/commands';
import { MIDSUMMER_MIN, processProfile } from '../src/sim/events/weather';
import { H2_FUEL_COST_K } from '../src/sim/market/hydrogen';
import { stepTenders } from '../src/sim/events/developers';
import { Rng } from '../src/sim/rng';
import { deserialize, newGame, serialize, type SaveData } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import { ZONE } from '../src/sim/map/types';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  setZone,
} from './helpers';

const ELZ_CAP_MWH = GENS.electrolyser.energyMWh ?? 0;

/** Firm 50 MW solar over a tiny suburb: a guaranteed midday curtailment
 *  case. With `withElz`, an electrolyser hangs off the same 33 kV bus. */
function solarFixture(withElz: boolean) {
  const map = makeTestMap(30, 30);
  for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
  const ctx = makeContext(map);
  const state = newGame();
  directBuildGen(state, map, 'solarFarm', 5, 5); // firm: must-run
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 20, by: 20 },
  });
  let elz = -1;
  if (withElz) {
    elz = directBuildGen(state, map, 'electrolyser', 8, 8);
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 5, bx: 8, by: 8 },
    });
  }
  commissionAll(state);
  state.speed = 1;
  state.tick = 1;
  state.weather.cloud = 0;
  state.simTimeMin = MIDSUMMER_MIN + 13 * 60; // clear midsummer midday
  return { map, ctx, state, elz };
}

/** A converted-fleet island: 120 MW peaker through a grid sub onto a
 *  suburb, with an electrolyser (the tank owner) on the 33 kV side. */
function peakerFixture() {
  const map = makeTestMap(30, 30);
  for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
  const ctx = makeContext(map);
  const state = newGame();
  const peaker = directBuildGen(state, map, 'gasPeaker', 5, 5);
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 12, y: 12 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 12, by: 12 },
  });
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 12, ay: 12, bx: 20, by: 20 },
  });
  const elz = directBuildGen(state, map, 'electrolyser', 18, 8);
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 12, ay: 12, bx: 18, by: 8 },
  });
  commissionAll(state);
  state.speed = 1;
  state.tick = 1;
  state.simTimeMin = MIDSUMMER_MIN + 18 * 60; // evening: no sun in play
  return { map, ctx, state, peaker, elz };
}

describe('electrolyser soaks would-be curtailment (#23)', () => {
  it('charges the store instead of curtailing: curtailed MW falls, store rises', () => {
    const bare = solarFixture(false);
    const out0 = solveTick(bare.state, bare.ctx, derive(bare.state, bare.ctx), true);
    expect(out0.dispatch.curtailedFirmMW).toBeGreaterThan(10);

    const { ctx, state, elz } = solarFixture(true);
    const out1 = solveTick(state, ctx, derive(state, ctx), true);
    // the soak absorbs (almost) the whole spill…
    expect(out1.dispatch.curtailedFirmMW).toBeLessThan(out0.dispatch.curtailedFirmMW - 10);
    // …as negative dispatch at the electrolyser…
    expect(out1.dispatch.genMW.get(elz) ?? 0).toBeLessThan(0);
    // …and the tank fills (net round-trip applied on the way in)
    const stored = state.soc.get(elz) ?? 0;
    expect(stored).toBeGreaterThan(0);
    expect(stored).toBeLessThanOrEqual(ELZ_CAP_MWH);
    // fewer curtailed MWh = smaller constraint payments on the bill
    expect(out1.dispatch.constraintKPerHour).toBeLessThan(out0.dispatch.constraintKPerHour);
  });

  it('never consumes while the island has unserved demand', () => {
    // 50 MW of firm solar in thin early light against a 38 MW mill:
    // cheap supply < demand → zero surplus → the electrolyser stands off
    const { map, ctx, state, elz } = solarFixture(true);
    state.simTimeMin = MIDSUMMER_MIN + 6 * 60;
    const dist = [...state.assets.values()].find((a) => a.kind === 'sub' && a.sub === 'dist');
    if (!dist) throw new Error('expected the dist sub');
    mustApply(state, map, { type: 'setSubMva', assetId: dist.id, mva: 40 });
    state.loadSites.push({
      id: 1,
      x: 21,
      y: 21,
      mw: 38 / processProfile(state.simTimeMin),
      customers: 50,
      name: 'Mill',
    });
    state.sitesVersion++;
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.servedMW).toBeLessThan(out.dispatch.connectedMW - 1); // genuinely short
    expect(out.dispatch.genMW.get(elz) ?? 0).toBe(0);
    expect(state.soc.get(elz) ?? 0).toBe(0);
  });

  it('takes nothing from a dead island (no generation at all)', () => {
    const map = makeTestMap(30, 30);
    for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
    const ctx = makeContext(map);
    const state = newGame();
    const elz = directBuildGen(state, map, 'electrolyser', 8, 8);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 8, ay: 8, bx: 20, by: 20 },
    });
    commissionAll(state);
    state.speed = 1;
    state.tick = 1;
    state.simTimeMin = MIDSUMMER_MIN + 13 * 60;
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.genMW.get(elz) ?? 0).toBe(0);
    expect(state.soc.get(elz) ?? 0).toBe(0);
  });
});

describe('converted peaker burns H₂ first (#23)', () => {
  it('runs carbon-free at the H₂ offtake price while the store holds', () => {
    const { map, ctx, state, peaker, elz } = peakerFixture();
    const r = applyCommand(state, map, { type: 'convertToH2', assetId: peaker });
    expect(r.ok).toBe(true);
    state.soc.set(elz, 400);
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.genMW.get(peaker) ?? 0).toBeGreaterThan(0);
    expect(out.dispatch.carbonG).toBe(0);
    expect(out.dispatch.priceMWh).toBeCloseTo(H2_FUEL_COST_K * 1000, 6);
    // the tanks drain by exactly the energy generated
    const burned = ((out.dispatch.genMW.get(peaker) ?? 0) * 7.5) / 60;
    expect(state.soc.get(elz) ?? 0).toBeCloseTo(400 - burned, 6);
  });

  it('falls back to gas price + gas carbon when the tanks run dry', () => {
    const { map, ctx, state, peaker, elz } = peakerFixture();
    applyCommand(state, map, { type: 'convertToH2', assetId: peaker });
    state.soc.set(elz, 0);
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.genMW.get(peaker) ?? 0).toBeGreaterThan(0);
    expect(out.dispatch.carbonG).toBe(GENS.gasPeaker.carbonG);
    expect(out.dispatch.priceMWh).toBeCloseTo(GENS.gasPeaker.marginalCostK * 1000, 6);
  });

  it('splits the hour when the store covers only part of the output', () => {
    // measure the island's call on the peaker, then leave only half that
    // much hydrogen in the tank: both halves of the unit must run
    const probe = peakerFixture();
    const probeOut = solveTick(probe.state, probe.ctx, derive(probe.state, probe.ctx), true);
    const mw = probeOut.dispatch.genMW.get(probe.peaker) ?? 0;
    expect(mw).toBeGreaterThan(0);

    const { map, ctx, state, peaker, elz } = peakerFixture();
    applyCommand(state, map, { type: 'convertToH2', assetId: peaker });
    state.soc.set(elz, ((mw / 2) * 7.5) / 60); // half a tick's worth of H₂
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.genMW.get(peaker) ?? 0).toBeGreaterThan(0);
    expect(out.dispatch.carbonG).toBeGreaterThan(0);
    expect(out.dispatch.carbonG).toBeLessThan(GENS.gasPeaker.carbonG);
    expect(state.soc.get(elz) ?? 0).toBeCloseTo(0, 6); // drained dry
  });

  it('an unconverted peaker is untouched by the store', () => {
    const { ctx, state, elz } = peakerFixture();
    state.soc.set(elz, 400);
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.carbonG).toBe(GENS.gasPeaker.carbonG);
    expect(state.soc.get(elz) ?? 0).toBe(400); // nothing drawn
  });
});

describe('convertToH2 command', () => {
  it('refuses non-peakers and double conversion', () => {
    const { map, state, peaker, elz } = peakerFixture();
    expect(applyCommand(state, map, { type: 'convertToH2', assetId: elz }).ok).toBe(false);
    expect(applyCommand(state, map, { type: 'convertToH2', assetId: 99_999 }).ok).toBe(false);
    expect(applyCommand(state, map, { type: 'convertToH2', assetId: peaker }).ok).toBe(true);
    expect(applyCommand(state, map, { type: 'convertToH2', assetId: peaker }).ok).toBe(false);
  });
});

describe('store persistence', () => {
  it('round-trips the tank level and the conversion flag', () => {
    const { map, state, peaker, elz } = peakerFixture();
    applyCommand(state, map, { type: 'convertToH2', assetId: peaker });
    state.soc.set(elz, 123.45);
    const restored = deserialize(serialize(state));
    expect(restored.soc.get(elz)).toBeCloseTo(123.45, 9);
    const a = restored.assets.get(peaker);
    if (a?.kind !== 'gen') throw new Error('expected a gen asset');
    expect(a.h2).toBe(true);
  });

  it('hydrates pre-hydrogen saves to empty tanks and keeps dispatching', () => {
    const { ctx, state, peaker, elz } = peakerFixture();
    state.soc.set(elz, 400);
    const legacy = serialize(state) as SaveData & { soc?: unknown };
    delete legacy.soc; // a save from before any storage existed
    const restored = deserialize(legacy);
    expect(restored.soc.size).toBe(0);
    restored.assets.forEach((a) => {
      if (a.kind === 'gen' && a.id === peaker) expect(a.h2).toBeUndefined();
    });
    // empty tanks: a converted peaker would burn gas — the island still serves
    restored.speed = 1;
    restored.tick = 1;
    const out = solveTick(restored, ctx, derive(restored, ctx), true);
    expect(out.dispatch.genMW.get(peaker) ?? 0).toBeGreaterThan(0);
  });
});

describe('electrolyser build path (developer tender, like a battery)', () => {
  it('designating a site opens a tender that draws developer bids', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'electrolyser', x: 10, y: 10 },
    });
    expect(r.ok).toBe(true);
    expect(r.assetId).toBeUndefined(); // a planning signal, not an asset
    expect(state.tenders).toHaveLength(1);
    state.simTimeMin = 1440;
    stepTenders(state, new Rng(7), 3 * 1440);
    const tender = state.tenders[0];
    expect(tender?.bids.length ?? 0).toBeGreaterThan(0);
  });
});
