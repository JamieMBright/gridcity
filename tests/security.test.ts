// N-1 security screening (ROADMAP #8): radial catchments flag insecure
// with the binding kit named; closing the loop flips them secure.

import { describe, expect, it } from 'vitest';
import { lineBranchId } from '../src/sim/assets';
import { securityKey, securityOf } from '../src/sim/security';
import { newGame, type GameState } from '../src/sim/state';
import type { CityMap } from '../src/sim/map/types';
import { directBuildGen, makeTestMap, mustApply } from './helpers';

/** gas(5,5) —132kV— gridA(12,5) —33kV— dist(12,12): purely radial. */
function radialFixture(): {
  map: CityMap;
  state: GameState;
  ids: { gas: number; gridA: number; dist: number; line132: number; line33: number };
} {
  const map = makeTestMap(30, 30);
  const state = newGame();
  const gas = directBuildGen(state, map, 'gasCCGT', 5, 5);
  const gridA = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'sub', sub: 'grid', x: 12, y: 5 },
  });
  const dist = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'sub', sub: 'dist', x: 12, y: 12 },
  });
  const line132 = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 12, by: 5 },
  });
  const line33 = mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 12, ay: 5, bx: 12, by: 12 },
  });
  return { map, state, ids: { gas, gridA, dist, line132, line33 } };
}

/** Adds the redundant second path: gas —132— gridB(5,12) —33— dist. */
function closeTheLoop(state: GameState, map: CityMap): void {
  mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 5, y: 12 } });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 5, by: 12 },
  });
  mustApply(state, map, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 5, ay: 12, bx: 12, by: 12 },
  });
}

describe('securityOf', () => {
  it('flags a radial catchment insecure and names the binding kit', () => {
    const { state, ids } = radialFixture();
    const sec = securityOf(state);
    const entry = sec.get(ids.dist);
    expect(entry?.secure).toBe(false);
    // bridges are tested in ascending branch id: the grid transformer
    // (lowest id on the supply path) is the reported binding failure
    expect(entry?.bindingLabel).toBe('Grid substation transformer');
    // only service subs are screened: the grid sub itself has no entry
    expect(sec.has(ids.gridA)).toBe(false);
    expect(sec.size).toBe(1);
  });

  it('closing the loop flips the catchment secure', () => {
    const { map, state, ids } = radialFixture();
    closeTheLoop(state, map);
    const entry = securityOf(state).get(ids.dist);
    expect(entry?.secure).toBe(true);
    expect(entry?.bindingLabel).toBeUndefined();
  });

  it('a looped catchment still fails on a single shared feeder', () => {
    // two 33 kV circuits (no single line binds) but one grid sub: its
    // transformer remains the single point of failure
    const { map, state, ids } = radialFixture();
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'underground', ax: 12, ay: 5, bx: 12, by: 12 },
    });
    const entry = securityOf(state).get(ids.dist);
    expect(entry?.secure).toBe(false);
    expect(entry?.bindingLabel).toBe('Grid substation transformer');
  });

  it('a sub with no supply at all is insecure without a binding label', () => {
    const { state, ids } = radialFixture();
    // take the 33 kV feeder out of service: the dist island has no gen
    state.outages.set(lineBranchId(ids.line33), -1);
    const entry = securityOf(state).get(ids.dist);
    expect(entry?.secure).toBe(false);
    expect(entry?.bindingLabel).toBeUndefined();
  });

  it('memoizes per assets+outages signature and recomputes on change', () => {
    const { state, ids } = radialFixture();
    const a = securityOf(state);
    expect(securityOf(state)).toBe(a); // cache hit: same object back
    const keyBefore = securityKey(state);
    state.outages.set(lineBranchId(ids.line132), -1);
    expect(securityKey(state)).not.toBe(keyBefore);
    const b = securityOf(state);
    expect(b).not.toBe(a);
    expect(b.get(ids.dist)?.secure).toBe(false);
  });

  it('screens a few hundred buses inside the 50ms budget', () => {
    // the worst case for per-bridge testing: a long chain fed from BOTH
    // ends, so every sub is secure, every branch is a bridge, and every
    // bridge needs its own reachability sweep (no early pruning)
    const map = makeTestMap(200, 10);
    const state = newGame();
    directBuildGen(state, map, 'gasCCGT', 0, 5);
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 1, y: 5 } });
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 0, ay: 5, bx: 1, by: 5 },
    });
    mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 149, y: 5 } });
    directBuildGen(state, map, 'gasCCGT', 150, 5);
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 150, ay: 5, bx: 149, by: 5 },
    });
    for (let k = 2; k < 149; k++) {
      mustApply(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: k, y: 5 } });
    }
    for (let k = 2; k <= 149; k++) {
      mustApply(state, map, {
        type: 'build',
        spec: { kind: 'line', level: 33, build: 'overhead', ax: k - 1, ay: 5, bx: k, by: 5 },
      });
    }
    const t0 = performance.now();
    const sec = securityOf(state);
    const elapsed = performance.now() - t0;
    expect(sec.size).toBe(147);
    expect([...sec.values()].every((e) => e.secure)).toBe(true);
    expect(elapsed).toBeLessThan(50);
  });
});
