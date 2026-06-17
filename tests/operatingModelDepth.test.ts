// W8 Part-2b — per-country operating-model DEPTH: the dormant profile fields
// (gridCarbonG, baseloadFloor, hydroDriven) now bend the live sim, and the
// regulator framing text surfaces. These tests prove the WIRING through the
// same code path the live sim uses (runDispatch / solveTick), and that London
// (no flags) stays byte-identical — the determinism anchor.

import { describe, expect, it } from 'vitest';
import {
  AUSTRALIA_MARKET,
  FRANCE_GENERATION,
  FRANCE_MARKET,
  HONGKONG_MARKET,
  LONDON_GENERATION,
  LONDON_MARKET,
  LONDON_PROFILE,
  type GenerationModel,
  type ResolvedProfile,
} from '../src/sim/powerProfile';
import {
  BASELOAD_UNIT_ID,
  reservoirFactor,
  runDispatch,
} from '../src/sim/market/dispatch';
import { MIDSUMMER_MIN, MIDWINTER_MIN, type WeatherState } from '../src/sim/events/weather';
import { ZONE } from '../src/sim/map/types';
import { deriveNetwork } from '../src/sim/assets';
import { assignServiceAreas, computeSubLoads } from '../src/sim/service';
import { newGame, type SimContext } from '../src/sim/state';
import { derive, solveTick } from '../src/sim/tick';
import {
  commissionAll,
  directBuildGen,
  makeContext,
  makeTestMap,
  mustApply,
  setZone,
} from './helpers';

// ---------------------------------------------------------------------------
// A direct runDispatch harness: a single dist sub on its own island, fed by
// whatever generation the test wires. Lets us read dispatch.carbonG /
// priceMWh / curtailment under an exact profile, no RNG, no UI.

function island(opts: {
  /** demand-bearing suburb tiles around (20,20). */
  load?: boolean;
  /** add an import-only interconnector at the west edge. */
  interconnector?: boolean;
  /** add a firm solar farm (renewable must-run). */
  solar?: boolean;
  /** add a gas plant (dispatchable thermal). */
  gas?: boolean;
}) {
  const map = makeTestMap(40, 40);
  if (opts.load !== false) {
    for (let x = 19; x <= 21; x++) setZone(map, x, 20, ZONE.suburb);
  }
  const state = newGame();
  // the dist sub is the island's load bus — build it FIRST so every feeder
  // can run between two existing assets.
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
  if (opts.interconnector) {
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'interconnector', x: 1, y: 1 },
    });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'bulk', x: 10, y: 10 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 400, build: 'overhead', ax: 1, ay: 1, bx: 10, by: 10 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 10, ay: 10, bx: 20, by: 20 },
    });
  }
  if (opts.gas) {
    directBuildGen(state, map, 'gasCCGT', 5, 30);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 12, y: 28 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 30, bx: 12, by: 28 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 12, ay: 28, bx: 20, by: 20 },
    });
  }
  if (opts.solar) {
    setZone(map, 30, 30, ZONE.solarSite);
    directBuildGen(state, map, 'solarFarm', 30, 30);
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 30, ay: 30, bx: 20, by: 20 },
    });
  }
  commissionAll(state);
  return { map, state };
}

/** Run runDispatch once at simTimeMin under a profile (defaults to London). */
function dispatchAt(
  map: ReturnType<typeof makeTestMap>,
  state: ReturnType<typeof newGame>,
  simTimeMin: number,
  profile: ResolvedProfile = LONDON_PROFILE,
  weather: WeatherState = { cloud: 0.3, wind: 0.5 },
) {
  state.simTimeMin = simTimeMin;
  state.weather = weather;
  const net = deriveNetwork(state.assets.values(), 1);
  for (const br of net.branches) br.inService = !state.outages.has(br.id);
  const service = assignServiceAreas(map, state.assets.values(), state.loadSites, state.councils);
  const loads = computeSubLoads(map, service.tilesOfSub, state.councils, state.loadSites);
  return runDispatch(net, state.assets.values(), loads, {
    simTimeMin,
    weather: state.weather,
    soc: state.soc,
    dtMin: 0,
    tech: { smartEv: state.tech.smartEv, flexMarket: state.tech.flexMarket },
    weatherProfile: profile.weather,
    power: profile.power,
    market: profile.market,
    generation: profile.generation,
  });
}

// ===========================================================================
// (1) grid-carbon → the carbon KPI
// ===========================================================================

describe('W8-2b (1): interconnector imports carry the country grid carbon', () => {
  it('zero player generation ⇒ ALL demand imported, at the country gridCarbonG', () => {
    const { map, state } = island({ interconnector: true });
    const t = MIDSUMMER_MIN + 3 * 60; // night: no solar even if present

    // London: import carbon == LONDON_MARKET.gridCarbonG (150)
    const lon = dispatchAt(map, state, t, LONDON_PROFILE);
    expect(lon.servedMW).toBeGreaterThan(0);
    expect(lon.carbonG).toBeCloseTo(LONDON_MARKET.gridCarbonG, 6);

    // France: the SAME network imports at France's near-zero nuclear grid (20)
    const fr = dispatchAt(map, state, t, profileWithMarket(FRANCE_MARKET));
    expect(fr.carbonG).toBeCloseTo(FRANCE_MARKET.gridCarbonG, 6);

    // Australia (coal) and Hong Kong (gas) import far dirtier
    const au = dispatchAt(map, state, t, profileWithMarket(AUSTRALIA_MARKET));
    expect(au.carbonG).toBeCloseTo(AUSTRALIA_MARKET.gridCarbonG, 6);
    const hk = dispatchAt(map, state, t, profileWithMarket(HONGKONG_MARKET));
    expect(hk.carbonG).toBeCloseTo(HONGKONG_MARKET.gridCarbonG, 6);

    // the ordering is the real-world ordering: FR << GB < AU < HK
    expect(fr.carbonG).toBeLessThan(lon.carbonG);
    expect(lon.carbonG).toBeLessThan(au.carbonG);
    expect(au.carbonG).toBeLessThan(hk.carbonG);
  });

  it('full self-supply ⇒ ~zero import carbon (a clean island imports nothing)', () => {
    // a solar farm carrying a midday island: renewables meet the load, the
    // interconnector idles, so the import grid-carbon never enters the average.
    const { map, state } = island({ interconnector: true, solar: true });
    const noon = dispatchAt(map, state, MIDSUMMER_MIN + 12.5 * 60, profileWithMarket(HONGKONG_MARKET), {
      cloud: 0,
      wind: 0.4,
    });
    // even under HK's filthy 590 g grid, a self-supplied island is ~0 g:
    // solar (carbon 0) serves the load, the import doesn't run
    expect(noon.servedMW).toBeGreaterThan(0);
    expect(noon.carbonG).toBeLessThan(HONGKONG_MARKET.gridCarbonG * 0.1);
  });

  it('London import carbon is byte-identical to the prior flat catalog figure (150)', () => {
    // the catalog interconnector carbonG was 150; LONDON_MARKET.gridCarbonG is
    // 150, so wiring the profile leaves GB unchanged.
    expect(LONDON_MARKET.gridCarbonG).toBe(150);
    const { map, state } = island({ interconnector: true });
    const out = dispatchAt(map, state, MIDWINTER_MIN + 18.5 * 60, LONDON_PROFILE);
    expect(out.carbonG).toBeCloseTo(150, 6);
  });
});

/** A London profile with one market swapped in (isolates the gridCarbonG
 *  effect from any other country block). */
function profileWithMarket(market: ResolvedProfile['market']): ResolvedProfile {
  return { ...LONDON_PROFILE, market };
}

/** A London profile with one generation model swapped in. */
function profileWithGeneration(generation: GenerationModel): ResolvedProfile {
  return { ...LONDON_PROFILE, generation };
}

// ===========================================================================
// (2) baseloadFloor / hydroDriven → dispatch
// ===========================================================================

describe('W8-2b (2): baseloadFloor shapes the merit order', () => {
  it('a must-run baseload lowers the marginal price AND the carbon vs no floor', () => {
    // gas-only island at the evening peak: with no floor gas sets the price +
    // carbon; with a 60% nuclear floor most demand is met by the cheap, clean
    // baseload, so both fall.
    const { map, state } = island({ gas: true });
    const t = MIDWINTER_MIN + 18.5 * 60;
    const noFloor = dispatchAt(map, state, t, LONDON_PROFILE);
    const withFloor = dispatchAt(map, state, t, profileWithGeneration(FRANCE_GENERATION));

    expect(noFloor.priceMWh).toBeGreaterThan(0);
    // the floor pulls carbon down hard (gas ~390 → mostly clean baseload)
    expect(withFloor.carbonG).toBeLessThan(noFloor.carbonG);
    expect(withFloor.carbonG).toBeLessThan(noFloor.carbonG * 0.6);
    // it still serves the island fully
    expect(withFloor.servedMW).toBeCloseTo(noFloor.servedMW, 3);
    // and the synthetic baseload never appears as a real generator
    expect(withFloor.genMW.has(BASELOAD_UNIT_ID)).toBe(false);
  });

  it('curtails firm renewables in surplus (the nuclear-crowds-out-RE effect)', () => {
    // a big firm solar farm on a tiny load at noon: with no floor the island
    // already curtails some; the nuclear floor eats the cheap base so MORE
    // firm renewable is constrained off.
    const map = makeTestMap(40, 40);
    setZone(map, 30, 30, ZONE.solarSite);
    setZone(map, 20, 20, ZONE.suburb); // one tile: tiny load
    const state = newGame();
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 20, y: 20 } });
    directBuildGen(state, map, 'solarFarm', 30, 30);
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 30, ay: 30, bx: 20, by: 20 },
    });
    commissionAll(state);
    const t = MIDSUMMER_MIN + 12.5 * 60;
    const clear = { cloud: 0, wind: 0.3 };

    const noFloor = dispatchAt(map, state, t, LONDON_PROFILE, clear);
    const withFloor = dispatchAt(map, state, t, profileWithGeneration(FRANCE_GENERATION), clear);
    expect(noFloor.curtailedFirmMW).toBeGreaterThan(0);
    expect(withFloor.curtailedFirmMW).toBeGreaterThan(noFloor.curtailedFirmMW);
  });

  it('the baseload never bills constraint comp (it is not a player asset)', () => {
    // a baseload-floored island with NO firm renewables: the baseload absorbs
    // the base but is never itself curtailed, so no constraint payment arises
    // from it.
    const { map, state } = island({ gas: true });
    const out = dispatchAt(
      map,
      state,
      MIDWINTER_MIN + 18.5 * 60,
      profileWithGeneration(FRANCE_GENERATION),
    );
    expect(out.constraintKPerHour).toBe(0);
    expect(out.curtailedFirmMW).toBe(0);
  });
});

describe('W8-2b (2): hydroDriven swings the reservoir with the season', () => {
  it('reservoirFactor is full for a thermal/nuclear floor (no hydro) ⇒ no-op', () => {
    for (const t of [MIDSUMMER_MIN, MIDWINTER_MIN, 0, 5 * 60]) {
      expect(reservoirFactor(t, LONDON_GENERATION, LONDON_PROFILE.weather)).toBe(1);
      expect(reservoirFactor(t, FRANCE_GENERATION, LONDON_PROFILE.weather)).toBe(1);
    }
  });

  it('a hydro-driven fleet floats LESS baseload in the dry season than the wet', () => {
    const hydro: GenerationModel = { ownership: 'tender', hydroDriven: true, baseloadFloor: 0.6 };
    // London weather: winter = high season factor (wet), summer = low (dry).
    const wet = reservoirFactor(MIDWINTER_MIN, hydro, LONDON_PROFILE.weather);
    const dry = reservoirFactor(MIDSUMMER_MIN, hydro, LONDON_PROFILE.weather);
    expect(wet).toBeGreaterThan(dry);
    // bounded in [0.4, 1] (run-of-river always floats something)
    expect(dry).toBeGreaterThanOrEqual(0.4);
    expect(wet).toBeLessThanOrEqual(1);

    // and it shows up in dispatch: the gas-island carbon is lower when the
    // reservoir is full (more clean baseload) than when it is drawn down.
    const { map, state } = island({ gas: true });
    const wetOut = dispatchAt(map, state, MIDWINTER_MIN + 12 * 60, profileWithGeneration(hydro));
    const dryOut = dispatchAt(map, state, MIDSUMMER_MIN + 12 * 60, profileWithGeneration(hydro));
    // same hour-of-day picked so the only mover is the reservoir + season
    expect(wetOut.carbonG).toBeLessThan(dryOut.carbonG);
  });
});

// ===========================================================================
// London determinism anchor: no generation flags ⇒ byte-identical dispatch
// ===========================================================================

describe('W8-2b: London stays byte-identical (no baseload, GB grid carbon)', () => {
  it('omitting the generation model == passing London == no baseload at all', () => {
    const { map, state } = island({ gas: true, solar: true });
    const t = MIDWINTER_MIN + 18.5 * 60;
    const clear = { cloud: 0.2, wind: 0.6 };

    const net = deriveNetwork(state.assets.values(), 1);
    for (const br of net.branches) br.inService = !state.outages.has(br.id);
    const service = assignServiceAreas(map, state.assets.values(), state.loadSites, state.councils);
    const loads = computeSubLoads(map, service.tilesOfSub, state.councils, state.loadSites);
    const base = {
      simTimeMin: t,
      weather: clear,
      soc: new Map<number, number>(),
      dtMin: 0,
      tech: { smartEv: false, flexMarket: false },
    };
    const omitted = runDispatch(net, state.assets.values(), loads, { ...base });
    const explicit = runDispatch(net, state.assets.values(), loads, {
      ...base,
      generation: LONDON_GENERATION,
      market: LONDON_MARKET,
    });
    expect(explicit.carbonG).toBe(omitted.carbonG);
    expect(explicit.priceMWh).toBe(omitted.priceMWh);
    expect(explicit.servedMW).toBe(omitted.servedMW);
    expect(explicit.curtailedFirmMW).toBe(omitted.curtailedFirmMW);
    // no phantom baseload generator on London's path
    expect(omitted.genMW.has(BASELOAD_UNIT_ID)).toBe(false);
  });

  it('a full solveTick on the London scenario produces no -1 baseload key', () => {
    const map = makeTestMap(30, 30);
    for (let y = 19; y <= 21; y++) for (let x = 19; x <= 21; x++) setZone(map, x, y, ZONE.suburb);
    const ctx: SimContext = makeContext(map);
    const state = newGame();
    directBuildGen(state, map, 'gasCCGT', 5, 5);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 15, y: 15 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 18, y: 18 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 15, by: 15 },
    });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 15, ay: 15, bx: 18, by: 18 },
    });
    commissionAll(state);
    state.simTimeMin = MIDWINTER_MIN + 18 * 60;
    state.speed = 1;
    state.tick = 1;
    const out = solveTick(state, ctx, derive(state, ctx), true);
    expect(out.dispatch.genMW.has(BASELOAD_UNIT_ID)).toBe(false);
    expect(out.servedCustomers).toBeGreaterThan(0);
  });
});
