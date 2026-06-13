// Generation footprints to scale: the coal campus (4x3, six cooling
// towers) gets the full nuclear-campus treatment, and farm-type plant
// (solar / onshore / offshore wind) claims tiles in proportion to its
// awarded MW — developers bid what the open land around the designated
// tile fits, and the claim is DERIVED from anchor + MW (never stored).

import { describe, expect, it } from 'vitest';
import { applyCommand, assetAtTile, checkBuild, footprintTiles } from '../src/sim/commands';
import { FARM_MW_PER_TILE, GENS } from '../src/sim/catalog';
import { farmClaimTiles, farmFitMW, farmTileOrder, homesPowered } from '../src/sim/farms';
import { reservedTiles, stepTenders } from '../src/sim/events/developers';
import { Rng } from '../src/sim/rng';
import { TERRAIN, ZONE, type CityMap } from '../src/sim/map/types';
import { deserialize, newGame, serialize, type GameState } from '../src/sim/state';
import { directBuildGen, makeTestMap, mustApply, setZone } from './helpers';

const SOLAR_PER = FARM_MW_PER_TILE.solarFarm ?? 0;
const WIND_PER = FARM_MW_PER_TILE.windOnshore ?? 0;

/** A map that's all water except a strip of `n` open land tiles at y=5. */
function crampedMap(n: number): CityMap {
  const map = makeTestMap(30, 30);
  map.terrain.fill(TERRAIN.water);
  for (let x = 5; x < 5 + n; x++) map.terrain[5 * map.width + x] = TERRAIN.land;
  return map;
}

/** Drive the trickle bidder until the tender holds at least one bid. */
function accrueBids(state: GameState, rng: Rng): void {
  for (let k = 0; k < 10 && (state.tenders[0]?.bids.length ?? 0) === 0; k++) {
    state.simTimeMin += 720;
    stepTenders(state, rng, 720);
  }
}

describe('coal campus (4x3, nuclear-campus treatment)', () => {
  it('claims a 4x3 footprint of twelve tiles', () => {
    expect(GENS.coal.footprint).toEqual([4, 3]);
    const map = makeTestMap(40, 40);
    const state = newGame();
    const coal = directBuildGen(state, map, 'coal', 10, 10);
    const tiles = footprintTiles(map, state.assets.get(coal)!);
    expect(tiles).toHaveLength(12);
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        expect(tiles).toContain((10 + dy) * map.width + 10 + dx);
      }
    }
  });

  it('occupies every campus tile and blocks pylons across it', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    directBuildGen(state, map, 'coal', 10, 10);
    // nothing builds on any campus tile, not just the anchor
    const onCampus = checkBuild(map, state.assets.values(), {
      kind: 'sub',
      sub: 'dist',
      x: 13,
      y: 12,
    });
    expect(onCampus.ok).toBe(false);
    expect(onCampus.error).toBe('tile already occupied');
    // an overhead route straight through the campus puts no support on it
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 5, y: 11 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 22, y: 11 } });
    const line = checkBuild(map, state.assets.values(), {
      kind: 'line',
      level: 33,
      build: 'overhead',
      ax: 5,
      ay: 11,
      bx: 22,
      by: 11,
    });
    expect(line.ok).toBe(true);
    const campus = new Set<number>();
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 4; dx++) campus.add((10 + dy) * map.width + 10 + dx);
    }
    expect((line.pylons ?? []).length).toBeGreaterThan(0);
    for (const p of line.pylons ?? []) expect(campus.has(p)).toBe(false);
  });

  it('demolish cascades the connected circuit like the nuclear campus', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const coal = directBuildGen(state, map, 'coal', 10, 10);
    const bulk = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'bulk', x: 25, y: 25 },
    });
    const line = mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 400, build: 'overhead', ax: 10, ay: 10, bx: 25, by: 25 },
    });
    expect(applyCommand(state, map, { type: 'demolish', assetId: coal }).ok).toBe(true);
    expect(state.assets.has(coal)).toBe(false);
    expect(state.assets.has(line)).toBe(false); // cascade took the circuit
    expect(state.assets.has(bulk)).toBe(true);
  });
});

describe('available-land MW cap (developers bid what fits)', () => {
  it('open farmland fits the full catalog ask', () => {
    const map = makeTestMap(40, 40);
    expect(farmFitMW(map, 'solarFarm', 20, 20)).toBe(GENS.solarFarm.capacityMW);
    expect(farmFitMW(map, 'windOnshore', 20, 20)).toBe(GENS.windOnshore.capacityMW);
  });

  it('a cramped site caps the fit to the open tiles around the anchor', () => {
    const map = crampedMap(3); // three land tiles in a sea
    expect(farmFitMW(map, 'solarFarm', 5, 5)).toBe(3 * SOLAR_PER);
    // built-up zones are not claimable either
    const town = makeTestMap(30, 30);
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        if (x !== 15 || y !== 15) setZone(town, x, y, ZONE.suburb);
      }
    }
    expect(farmFitMW(town, 'solarFarm', 15, 15)).toBe(SOLAR_PER); // anchor only
  });

  it('designation stamps the fit on the tender and bids respect it', () => {
    const map = crampedMap(3);
    const state = newGame();
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 5, y: 5 },
    });
    expect(r.ok).toBe(true);
    expect(state.tenders[0]?.fitMW).toBe(3 * SOLAR_PER);
    accrueBids(state, new Rng(7));
    expect(state.tenders[0]!.bids.length).toBeGreaterThan(0);
    for (const b of state.tenders[0]!.bids) expect(b.mw).toBe(3 * SOLAR_PER);
  });

  it('open farmland gets bids for the full ask', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    expect(state.tenders[0]?.fitMW).toBe(GENS.solarFarm.capacityMW);
    accrueBids(state, new Rng(7));
    for (const b of state.tenders[0]!.bids) expect(b.mw).toBe(GENS.solarFarm.capacityMW);
  });
});

describe('award claims the proportional tile set', () => {
  function awardSolar(map: CityMap, state: GameState, mw: number): number {
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    const t = state.tenders[0]!;
    t.bids.push({ developerId: 2, priceMWh: 80, leadDaysDelta: 0, mw });
    const r = applyCommand(state, map, { type: 'acceptBid', tenderId: t.id, developerId: 2 });
    expect(r.ok).toBe(true);
    return r.assetId!;
  }

  it('a 5 MW solar award stays one tile; 100 MW becomes a ten-tile field', () => {
    const map = makeTestMap(40, 40);
    expect(farmClaimTiles(map, 'solarFarm', 20, 20, 5)).toHaveLength(1);
    expect(farmClaimTiles(map, 'solarFarm', 20, 20, 100)).toHaveLength(10);
    // the claim is a contiguous blob containing (and starting at) the anchor
    const tiles = farmClaimTiles(map, 'solarFarm', 20, 20, 100);
    expect(tiles[0]).toBe(20 * map.width + 20);
    const set = new Set(tiles);
    for (const i of tiles.slice(1)) {
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      const touches =
        set.has(y * map.width + x - 1) ||
        set.has(y * map.width + x + 1) ||
        set.has((y - 1) * map.width + x) ||
        set.has((y + 1) * map.width + x);
      expect(touches).toBe(true);
    }
  });

  it('awarding stamps the MW and the asset occupies its whole field', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const id = awardSolar(map, state, 50);
    const a = state.assets.get(id)!;
    expect(a.kind === 'gen' && a.mw).toBe(50);
    const tiles = footprintTiles(map, a);
    expect(tiles).toHaveLength(Math.ceil(50 / SOLAR_PER));
    // a sub can't land on a claimed (non-anchor) field tile
    const tile = tiles[tiles.length - 1]!;
    const blocked = checkBuild(map, state.assets.values(), {
      kind: 'sub',
      sub: 'dist',
      x: tile % map.width,
      y: Math.floor(tile / map.width),
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toBe('tile already occupied');
  });

  it('an award lands on the full reserved plot (the reservation protects it)', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    const t = state.tenders[0]!;
    // the designation reserved the whole 50 MW (5-tile) field
    expect(t.reserved).toHaveLength(5);
    // a build can no longer land on a reserved (non-anchor) plot tile
    const second = t.reserved![1]!;
    const blocked = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: second % map.width, y: Math.floor(second / map.width) },
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toBe('a designated generation site is reserved here');
    // the award lands on exactly the reserved tiles
    t.bids.push({ developerId: 2, priceMWh: 80, leadDaysDelta: 0, mw: 50 });
    const r = applyCommand(state, map, { type: 'acceptBid', tenderId: t.id, developerId: 2 });
    expect(r.ok).toBe(true);
    const a = state.assets.get(r.assetId!)!;
    expect(a.kind === 'gen' && a.mw).toBe(50);
    expect(footprintTiles(map, a)).toEqual(t.reserved);
  });


  it('wind spreads turbine tiles with spacing (anchor-parity checkerboard)', () => {
    const map = makeTestMap(40, 40);
    const tiles = farmClaimTiles(map, 'windOnshore', 20, 20, 100);
    expect(tiles).toHaveLength(Math.ceil(100 / WIND_PER));
    for (const i of tiles) {
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      expect((x + y) & 1).toBe((20 + 20) & 1); // spaced: no two adjacent
      expect(Math.max(Math.abs(x - 20), Math.abs(y - 20))).toBeLessThanOrEqual(9);
    }
  });
});

describe('derivation determinism + save compatibility', () => {
  it('the claim derives identically every time (pure function of map+anchor+MW)', () => {
    const map = makeTestMap(40, 40);
    const a = farmTileOrder(map, 'solarFarm', 20, 20);
    const b = farmTileOrder(map, 'solarFarm', 20, 20);
    expect(a).toEqual(b);
    // smaller MW claims a strict prefix of a bigger claim (prefix-stable)
    const small = farmClaimTiles(map, 'solarFarm', 20, 20, 30);
    const big = farmClaimTiles(map, 'solarFarm', 20, 20, 100);
    expect(big.slice(0, small.length)).toEqual(small);
  });

  it('awarded MW rides the save and the claim re-derives after a round trip', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    state.tenders[0]!.bids.push({ developerId: 2, priceMWh: 80, leadDaysDelta: 0, mw: 50 });
    const r = applyCommand(state, map, {
      type: 'acceptBid',
      tenderId: state.tenders[0]!.id,
      developerId: 2,
    });
    const before = footprintTiles(map, state.assets.get(r.assetId!)!);
    const loaded = deserialize(serialize(state));
    const a = loaded.assets.get(r.assetId!)!;
    expect(a.kind === 'gen' && a.mw).toBe(50);
    expect(footprintTiles(map, a)).toEqual(before);
  });

  it('old saves (no mw, no fitMW) hydrate to single-tile plants unchanged', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    directBuildGen(state, map, 'solarFarm', 20, 20);
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 5, y: 5 },
    });
    const data = serialize(state);
    // a pre-footprints save: assets carry no mw, tenders no fitMW
    for (const a of data.assets) delete (a as { mw?: number }).mw;
    for (const t of data.tenders ?? []) delete (t as { fitMW?: number }).fitMW;
    const loaded = deserialize(data);
    for (const a of loaded.assets.values()) {
      if (a.kind !== 'gen') continue;
      expect(a.mw).toBeUndefined();
      expect(footprintTiles(map, a)).toHaveLength(1); // exactly the old footprint
    }
    // and its tenders keep drawing bids — just uncapped, like before
    accrueBids(loaded, new Rng(7));
    expect(loaded.tenders[0]!.bids.length).toBeGreaterThan(0);
    for (const b of loaded.tenders[0]!.bids) expect(b.mw).toBeUndefined();
  });
});

describe('footprint reservation (designations cannot overlap)', () => {
  it('a designation reserves its whole capacity-scaled plot', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    const t = state.tenders[0]!;
    // 50 MW catalog ask / 10 MW per tile = a 5-tile reserved plot
    expect(t.reserved).toEqual(farmClaimTiles(map, 'solarFarm', 20, 20, GENS.solarFarm.capacityMW));
    expect(reservedTiles(state.tenders).size).toBe(5);
  });

  it('a second designation cannot overlap the first (no explosion on award)', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // first onshore-wind designation: a big plot to maximise overlap risk
    const r1 = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 20, y: 20, mw: 100 },
    });
    expect(r1.ok).toBe(true);
    const first = state.tenders[0]!.reserved!;
    expect(first.length).toBeGreaterThan(1);
    // designate a SECOND wind farm a few tiles away (anchor on free ground)
    // — its plot must wall off the first's reservation and never overlap.
    // Without reservation the two BFS blobs would compete for the same
    // middle tiles and "explode" into each other on award.
    const r2 = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 26, y: 20, mw: 100 },
    });
    expect(r2.ok).toBe(true);
    const second = state.tenders[1]!.reserved!;
    const overlap = new Set(first);
    for (const i of second) expect(overlap.has(i)).toBe(false);
  });

  it('a build cannot land on a reserved generation plot', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
    });
    const reservedTile = state.tenders[0]!.reserved![1]!;
    const check = checkBuild(
      map,
      state.assets.values(),
      { kind: 'sub', sub: 'dist', x: reservedTile % map.width, y: Math.floor(reservedTile / map.width) },
      reservedTiles(state.tenders),
    );
    expect(check.ok).toBe(false);
    expect(check.error).toBe('a designated generation site is reserved here');
  });

  it('the chosen MW (capacity picker) flows to the tender, footprint and award', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // player dials 15 MW of onshore wind (3 turbine tiles at 5 MW/tile)
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 20, y: 20, mw: 15 },
    });
    const t = state.tenders[0]!;
    expect(t.fitMW).toBe(15);
    expect(t.reserved).toHaveLength(3);
    t.bids.push({ developerId: 2, priceMWh: 70, leadDaysDelta: 0, mw: 15 });
    const r = applyCommand(state, map, { type: 'acceptBid', tenderId: t.id, developerId: 2 });
    expect(r.ok).toBe(true);
    const a = state.assets.get(r.assetId!)!;
    expect(a.kind === 'gen' && a.mw).toBe(15);
    expect(footprintTiles(map, a)).toEqual(t.reserved);
  });

  it('the chosen MW is capped to what the land actually fits', () => {
    const map = crampedMap(3); // three open land tiles only
    const state = newGame();
    // ask for far more than the land holds
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 5, y: 5, mw: 500 },
    });
    const t = state.tenders[0]!;
    expect(t.fitMW).toBe(3 * SOLAR_PER); // capped to the 3-tile land fit
    expect(t.reserved).toHaveLength(3);
  });

  it('homesPowered scales with MW and technology load factor', () => {
    expect(homesPowered('windOnshore', 15)).toBeGreaterThan(0);
    expect(homesPowered('windOnshore', 30)).toBe(homesPowered('windOnshore', 15) * 2);
    // offshore (higher load factor) powers more homes per MW than solar
    expect(homesPowered('windOffshore', 10)).toBeGreaterThan(homesPowered('solarFarm', 10));
  });
});

describe('a multi-tile farm is connectable on any tile it occupies', () => {
  function awardWind(map: CityMap, state: GameState, mw: number): number {
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'windOnshore', x: 20, y: 20, mw },
    });
    const t = state.tenders[0]!;
    t.bids.push({ developerId: 2, priceMWh: 70, leadDaysDelta: 0, mw });
    const r = applyCommand(state, map, { type: 'acceptBid', tenderId: t.id, developerId: 2 });
    return r.assetId!;
  }

  it('assetAtTile (map-aware) finds the farm on any of its claimed tiles', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const id = awardWind(map, state, 30); // several turbine tiles
    const a = state.assets.get(id)!;
    const tiles = footprintTiles(map, a);
    expect(tiles.length).toBeGreaterThan(1);
    for (const i of tiles) {
      const found = assetAtTile(state.assets.values(), i % map.width, Math.floor(i / map.width), map);
      expect(found?.id).toBe(id);
    }
  });

  it('a 33 kV line can be drawn to a non-anchor tile of the farm', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const id = awardWind(map, state, 30);
    const a = state.assets.get(id)!;
    if (a.kind !== 'gen') throw new Error('expected a gen asset');
    const farTile = footprintTiles(map, a).at(-1)!;
    const fx = farTile % map.width;
    const fy = Math.floor(farTile / map.width);
    expect(fx !== a.x || fy !== a.y).toBe(true); // genuinely not the anchor
    // a dist sub nearby, then a 33 kV line landing on the far farm tile
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 30, y: 30 } });
    const check = checkBuild(map, state.assets.values(), {
      kind: 'line',
      level: 33,
      build: 'overhead',
      ax: fx,
      ay: fy,
      bx: 30,
      by: 30,
    });
    expect(check.ok).toBe(true);
    expect(check.endA).toBe(id); // resolved to the farm, on its non-anchor tile
  });
});
