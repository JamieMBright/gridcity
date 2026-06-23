// Hydro dam (#owner 2026-06-23): a buildable, dispatchable baseload that
// must sit beside a river of at least MIN_HYDRO_RIVER_WIDTH tiles. These
// cover the catalog shape (clean baseload, sited on a river) and the
// min-river-width placement rule on both axes — including the trap where a
// long thin stream is LONG but not WIDE and must be rejected.

import { describe, expect, it } from 'vitest';
import { applyCommand, MIN_HYDRO_RIVER_WIDTH } from '../src/sim/commands';
import { GENS, strikeMWh } from '../src/sim/catalog';
import { TERRAIN, ZONE } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import { makeTestMap, setZone } from './helpers';

/** Carve a horizontal river band `rows` tiles tall across the whole map at
 *  y ∈ [y0, y0+rows). */
function horizRiver(map: ReturnType<typeof makeTestMap>, y0: number, rows: number): void {
  for (let y = y0; y < y0 + rows; y++) {
    for (let x = 0; x < map.width; x++) map.terrain[y * map.width + x] = TERRAIN.water;
  }
}

/** Carve a vertical river band `cols` tiles wide down the whole map at
 *  x ∈ [x0, x0+cols). */
function vertRiver(map: ReturnType<typeof makeTestMap>, x0: number, cols: number): void {
  for (let x = x0; x < x0 + cols; x++) {
    for (let y = 0; y < map.height; y++) map.terrain[y * map.width + x] = TERRAIN.water;
  }
}

function buildHydro(state: ReturnType<typeof newGame>, map: ReturnType<typeof makeTestMap>, x: number, y: number) {
  return applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'hydro', x, y } });
}

describe('hydro catalog entry', () => {
  it('is a clean, dispatchable baseload sited on a river', () => {
    const h = GENS.hydro;
    expect(h).toBeDefined();
    expect(h.siting).toBe('river');
    expect(h.carbonG).toBe(0); // zero-carbon
    expect(h.marginalCostK).toBe(0); // water is free → first in the merit order
    expect(h.capacityMW).toBeGreaterThan(0);
    // a dam is a major civil project: expensive and slow, like the big
    // firm plant (nuclear / offshore), not a quick farm
    expect(h.capexK).toBeGreaterThan(GENS.gasCCGT.capexK);
    expect(h.planningDays + h.buildDays).toBeGreaterThan(
      GENS.solarFarm.planningDays + GENS.solarFarm.buildDays,
    );
    // a developer still needs a real strike to fund the dam (free fuel ≠
    // free electricity) — the strike helper must price it finite & positive
    expect(strikeMWh('hydro')).toBeGreaterThan(0);
    expect(Number.isFinite(strikeMWh('hydro'))).toBe(true);
  });

  it('the minimum river width is a sensible small number', () => {
    expect(MIN_HYDRO_RIVER_WIDTH).toBeGreaterThanOrEqual(2);
    expect(Number.isInteger(MIN_HYDRO_RIVER_WIDTH)).toBe(true);
  });
});

// The hydro dam is a 2x2 campus: every footprint tile must be DRY LAND and
// within campus reach of a wide-enough river. So the river sits clear of the
// footprint (rows 10..) and the dam stands on the bank just above it (row 8).
describe('hydro placement: minimum river width', () => {
  it('allows a dam on the bank of a wide (>= MIN) horizontal river', () => {
    const map = makeTestMap(20, 20);
    horizRiver(map, 10, MIN_HYDRO_RIVER_WIDTH); // band exactly MIN tiles tall
    const state = newGame();
    // 2x2 dam on the dry bank at rows 8-9; its south row reaches the river
    const r = buildHydro(state, map, 4, 8);
    expect(r.ok).toBe(true);
  });

  it('allows a dam on the bank of a wide (>= MIN) vertical river', () => {
    const map = makeTestMap(20, 20);
    vertRiver(map, 10, MIN_HYDRO_RIVER_WIDTH);
    const state = newGame();
    // 2x2 dam on the dry bank at cols 8-9; its east column reaches the river
    const r = buildHydro(state, map, 8, 4);
    expect(r.ok).toBe(true);
  });

  it('rejects a dam beside a stream narrower than MIN', () => {
    const map = makeTestMap(20, 20);
    horizRiver(map, 10, MIN_HYDRO_RIVER_WIDTH - 1); // one tile too narrow
    const state = newGame();
    const r = buildHydro(state, map, 4, 8);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/river/i);
  });

  it('rejects a dam beside a LONG but THIN stream (length is not width)', () => {
    // the trap: a 1-tile-tall stream runs the whole map width — it is long
    // but only one tile wide, so it must be rejected.
    const map = makeTestMap(20, 20);
    horizRiver(map, 10, 1);
    const state = newGame();
    const r = buildHydro(state, map, 4, 8);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/river/i);
  });

  it('rejects a dam on dry land nowhere near a river', () => {
    const map = makeTestMap(20, 20);
    const state = newGame();
    const r = buildHydro(state, map, 4, 4);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/river/i);
  });

  it('rejects a dam whose footprint sits IN the river (it stands on the bank)', () => {
    const map = makeTestMap(20, 20);
    horizRiver(map, 8, 4); // wide river over rows 8-11
    const state = newGame();
    const r = buildHydro(state, map, 4, 8); // footprint lands on water tiles
    expect(r.ok).toBe(false);
  });

  it('rejects a dam in a royal park even beside a wide river', () => {
    const map = makeTestMap(20, 20);
    horizRiver(map, 10, MIN_HYDRO_RIVER_WIDTH);
    setZone(map, 4, 8, ZONE.park);
    const state = newGame();
    const r = buildHydro(state, map, 4, 8);
    expect(r.ok).toBe(false);
  });
});
