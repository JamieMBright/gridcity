import { describe, expect, it } from 'vitest';
import {
  buildTemplate,
  stampTemplate,
  templateSpan,
  type BuildTemplate,
} from '../src/persistence/templateStore';
import { applyCommand } from '../src/sim/commands';
import { newGame } from '../src/sim/state';
import { makeTestMap } from './helpers';

describe('buildTemplate (capture → relative pattern)', () => {
  it('re-bases subs to a top-left anchor and rewires lines to member indices', () => {
    const t = buildTemplate(
      'grid + dist',
      [
        { id: 10, sub: 'grid', x: 5, y: 7 },
        { id: 11, sub: 'dist', x: 8, y: 9 },
      ],
      [{ level: 33, build: 'overhead', a: 10, b: 11 }],
    );
    expect(t).toBeDefined();
    // anchor is (5,7): offsets become (0,0) and (3,2)
    const subs = t!.members.filter((m) => m.kind === 'sub');
    expect(subs).toEqual([
      { kind: 'sub', sub: 'grid', dx: 0, dy: 0 },
      { kind: 'sub', sub: 'dist', dx: 3, dy: 2 },
    ]);
    const lines = t!.members.filter((m) => m.kind === 'line');
    expect(lines).toEqual([{ kind: 'line', level: 33, build: 'overhead', a: 0, b: 1 }]);
  });

  it('drops dangling lines whose endpoints were not captured', () => {
    const t = buildTemplate(
      'x',
      [{ id: 1, sub: 'grid', x: 0, y: 0 }],
      [{ level: 33, build: 'overhead', a: 1, b: 99 }],
    );
    expect(t!.members.filter((m) => m.kind === 'line')).toHaveLength(0);
  });

  it('returns undefined for an empty capture (no substations)', () => {
    expect(buildTemplate('x', [], [])).toBeUndefined();
  });
});

describe('stampTemplate (relative → absolute at an anchor)', () => {
  const tpl: BuildTemplate = {
    id: 't',
    name: 'grid + dist',
    savedAt: 0,
    members: [
      { kind: 'sub', sub: 'grid', dx: 0, dy: 0 },
      { kind: 'sub', sub: 'dist', dx: 3, dy: 2 },
      { kind: 'line', level: 33, build: 'overhead', a: 0, b: 1 },
    ],
  };

  it('translates every member by the paste anchor', () => {
    const { subs, lines } = stampTemplate(tpl, 20, 30);
    expect(subs).toEqual([
      { sub: 'grid', x: 20, y: 30 },
      { sub: 'dist', x: 23, y: 32 },
    ]);
    expect(lines).toEqual([
      { level: 33, build: 'overhead', ax: 20, ay: 30, bx: 23, by: 32 },
    ]);
  });

  it('span reflects the footprint extent', () => {
    expect(templateSpan(tpl)).toEqual({ w: 4, h: 3 });
  });
});

describe('placeTemplate command (atomic stamp, one undo step)', () => {
  it('builds the whole set and assigns ids', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const { subs, lines } = stampTemplate(
      {
        id: 't',
        name: 'g',
        savedAt: 0,
        members: [
          { kind: 'sub', sub: 'grid', dx: 0, dy: 0 },
          { kind: 'sub', sub: 'dist', dx: 4, dy: 0 },
          { kind: 'line', level: 33, build: 'overhead', a: 0, b: 1 },
        ],
      },
      5,
      5,
    );
    const r = applyCommand(state, map, { type: 'placeTemplate', subs, lines });
    expect(r.ok).toBe(true);
    const placed = [...state.assets.values()];
    expect(placed.filter((a) => a.kind === 'sub')).toHaveLength(2);
    expect(placed.filter((a) => a.kind === 'line')).toHaveLength(1);
  });

  it('rolls the whole set back when any piece is blocked (all-or-nothing)', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // occupy the tile the second sub wants, so its build fails
    applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 9, y: 5 } });
    const before = state.assets.size;
    const { subs, lines } = stampTemplate(
      {
        id: 't',
        name: 'g',
        savedAt: 0,
        members: [
          { kind: 'sub', sub: 'grid', dx: 0, dy: 0 },
          { kind: 'sub', sub: 'grid', dx: 4, dy: 0 }, // lands on 9,5 — taken
          { kind: 'line', level: 33, build: 'overhead', a: 0, b: 1 },
        ],
      },
      5,
      5,
    );
    const r = applyCommand(state, map, { type: 'placeTemplate', subs, lines });
    expect(r.ok).toBe(false);
    // nothing from the stamp survived
    expect(state.assets.size).toBe(before);
  });

  it('rejects an empty template', () => {
    const map = makeTestMap(10, 10);
    const state = newGame();
    const r = applyCommand(state, map, { type: 'placeTemplate', subs: [], lines: [] });
    expect(r.ok).toBe(false);
  });
});
