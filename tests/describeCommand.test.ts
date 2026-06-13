// ROADMAP #27: undo history labels — describeCommand turns each player
// command into a one-line past-tense summary for the undo list.

import { describe, expect, it } from 'vitest';
import { describeCommand } from '../src/sim/describeCommand';
import { newGame } from '../src/sim/state';
import { makeTestMap, mustApply } from './helpers';

describe('describeCommand', () => {
  it('labels builds by kind', () => {
    const s = newGame();
    expect(describeCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 1, y: 1 } }, s)).toMatch(
      /built .*substation/i,
    );
    expect(
      describeCommand({ type: 'build', spec: { kind: 'gen', gen: 'gasCCGT', x: 1, y: 1 } }, s),
    ).toMatch(/Gas CCGT/);
    expect(
      describeCommand(
        { type: 'build', spec: { kind: 'line', level: 132, build: 'overhead', ax: 0, ay: 0, bx: 1, by: 1 } },
        s,
      ),
    ).toMatch(/132 kV line/);
    expect(
      describeCommand(
        { type: 'build', spec: { kind: 'line', level: 33, build: 'underground', ax: 0, ay: 0, bx: 1, by: 1 } },
        s,
      ),
    ).toMatch(/33 kV cable/);
  });

  it('names the demolished asset using the pre-command state', () => {
    const map = makeTestMap(10, 10);
    const s = newGame();
    const id = mustApply(s, map, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 4, y: 4 } });
    const label = describeCommand({ type: 'demolish', assetId: id }, s);
    expect(label).toMatch(/demolished .*substation/i);
  });

  it('never returns an empty string for any command type', () => {
    const s = newGame();
    const cmds = [
      { type: 'convertLine', assetId: 1 },
      { type: 'uprateLine', assetId: 1 },
      { type: 'setLevy', pct: 1 },
      { type: 'setFleet', vans: 3 },
      { type: 'stormPrep', action: 'surge' },
      { type: 'setSmartCharging', councilId: 1, on: true },
      { type: 'setDirectorate', directorate: 'operations', level: 2 },
      { type: 'undo' },
      { type: 'redo' },
    ] as const;
    for (const c of cmds) {
      expect(describeCommand(c as never, s).length).toBeGreaterThan(0);
    }
  });
});
