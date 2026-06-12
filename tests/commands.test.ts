import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { TERRAIN, ZONE } from '../src/sim/map/types';
import { newGame } from '../src/sim/state';
import { makeTestMap, mustApply, setZone } from './helpers';

describe('build validation', () => {
  it('rejects generators on water', () => {
    const map = makeTestMap(10, 10);
    map.terrain[5 * 10 + 5] = TERRAIN.water;
    const state = newGame();
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    });
    expect(r.ok).toBe(false);
  });

  it('accepts solar farms on open land but never on water or in parks', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    const open = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 2, y: 2 },
    });
    expect(open.ok).toBe(true);
    map.terrain[5 * 10 + 5] = TERRAIN.water;
    const wet = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 5, y: 5 },
    });
    expect(wet.ok).toBe(false);
    setZone(map, 7, 7, ZONE.park);
    const park = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 7, y: 7 },
    });
    expect(park.ok).toBe(false);
  });

  it('rejects overhead lines through conservation areas but allows underground', () => {
    const map = makeTestMap(10, 10);
    for (let x = 0; x < 10; x++) setZone(map, x, 5, ZONE.posh);
    const state = newGame();
    const a = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 1, y: 1 } });
    const b = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 8, y: 8 } });
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    const oh = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 1, ay: 1, bx: 8, by: 8 },
    });
    expect(oh.ok).toBe(false);
    const ug = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'underground', ax: 1, ay: 1, bx: 8, by: 8 },
    });
    expect(ug.ok).toBe(true);
  });

  it('requires matching voltage bays at both line endpoints', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 1, y: 1 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 8, y: 8 } });
    const r400 = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 400, build: 'overhead', ax: 1, ay: 1, bx: 8, by: 8 },
    });
    expect(r400.ok).toBe(false); // neither end has a 400 kV bay
    const r33 = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 1, ay: 1, bx: 8, by: 8 },
    });
    expect(r33.ok).toBe(true); // dist has 33, grid has 33
  });

  it('demolishing a substation cascades to its lines', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    const a = mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 1, y: 1 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 8, y: 8 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 1, ay: 1, bx: 8, by: 8 },
    });
    expect(state.assets.size).toBe(3);
    const r = applyCommand(state, map, { type: 'demolish', assetId: a });
    expect(r.ok).toBe(true);
    expect(state.assets.size).toBe(1); // line went with it
  });

  it('underground costs more than overhead on the same route', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 1, y: 1 } });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 8, y: 1 } });
    const oh = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 1, ay: 1, bx: 8, by: 1 },
    });
    const ug = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'underground', ax: 1, ay: 1, bx: 8, by: 1 },
    });
    expect(oh.ok && ug.ok).toBe(true);
    const lines = [...state.assets.values()].filter((a) => a.kind === 'line');
    expect(lines).toHaveLength(2);
    const ohLine = lines[0];
    const ugLine = lines[1];
    if (ohLine?.kind !== 'line' || ugLine?.kind !== 'line') throw new Error('expected lines');
    expect(ugLine.capexK).toBeGreaterThan(ohLine.capexK * 3);
  });
});
