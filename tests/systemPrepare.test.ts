// System Prepare (#D, owner 2026-06-22): one click enacts the whole storm plan
// (extra shifts + scouts + wider call handling); stand-down releases the windows.
import { describe, expect, it } from 'vitest';
import { newGame, newContext } from '../src/sim/state';
import { applyCommand } from '../src/sim/commands';
import { isSystemPreparing } from '../src/sim/reliability/stormprep';

describe('system prepare (#D)', () => {
  it('one click opens all three storm-prep lever windows + flips systemPreparing', () => {
    const state = newGame();
    const ctx = newContext();
    expect(isSystemPreparing(state)).toBe(false);

    const r = applyCommand(state, ctx.map, { type: 'systemPrepare', on: true });
    expect(r.ok).toBe(true);
    const t = state.simTimeMin;
    expect((state.surgeUntilMin ?? 0) > t).toBe(true);
    expect((state.scoutsUntilMin ?? 0) > t).toBe(true);
    expect((state.callHandlersUntilMin ?? 0) > t).toBe(true);
    expect(isSystemPreparing(state)).toBe(true);
  });

  it('stand down releases the active windows', () => {
    const state = newGame();
    const ctx = newContext();
    applyCommand(state, ctx.map, { type: 'systemPrepare', on: true });
    expect(isSystemPreparing(state)).toBe(true);

    const r = applyCommand(state, ctx.map, { type: 'systemPrepare', on: false });
    expect(r.ok).toBe(true);
    expect(isSystemPreparing(state)).toBe(false);
  });
});
