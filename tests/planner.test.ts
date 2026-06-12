// The reinforcement planner: costed work bundles off a balance
// shortfall, scored on clones — and the ring-main assist that closes a
// radial service sub into a loop.

import { describe, expect, it } from 'vitest';
import { busId, deriveNetwork } from '../src/sim/assets';
import { computeBalance } from '../src/sim/balance';
import { applyCommand } from '../src/sim/commands';
import { findIslands } from '../src/sim/grid/topology';
import { planReinforcement, proposeLoop } from '../src/sim/planner';
import { deserialize, serialize } from '../src/sim/state';
import { mustApply, poweredFixture } from './helpers';

describe('reinforcement planner', () => {
  it('proposes 2+ costed options, the best beating the shortfall, without touching live state', () => {
    const { state, ctx, ids } = poweredFixture();
    // stage a shortfall: lose the 132 kV feeder, stranding the suburb's
    // island without generation
    mustApply(state, ctx.map, { type: 'demolish', assetId: ids.line132 });
    const before = computeBalance(state, ctx);
    const shortfall = before.scopes[0]?.shortfallMW ?? 0; // whole licence area
    expect(shortfall).toBeGreaterThan(0);

    const pristine = JSON.stringify(serialize(state));
    const plan = planReinforcement(state, ctx, -1);

    expect(plan.scopeId).toBe(-1);
    expect(plan.shortfallMW).toBe(shortfall);
    expect(plan.options.length).toBeGreaterThanOrEqual(2);
    for (const opt of plan.options) {
      expect(opt.label.length).toBeGreaterThan(0);
      expect(opt.capexK).toBeGreaterThan(0);
      expect(opt.billImpactYr).toBeGreaterThan(0);
      expect(opt.commands.length).toBeGreaterThan(0);
    }
    // the best bundle genuinely reduces the worst-hour gap
    const best = Math.min(...plan.options.map((o) => o.residualShortfallMW));
    expect(best).toBeLessThan(shortfall);
    // candidate generation + clone scoring never mutated the live state
    expect(JSON.stringify(serialize(state))).toBe(pristine);
  });

  it('every option ships ready-to-send commands that apply cleanly', () => {
    const { state, ctx, ids } = poweredFixture();
    mustApply(state, ctx.map, { type: 'demolish', assetId: ids.line132 });
    const plan = planReinforcement(state, ctx, -1);
    expect(plan.options.length).toBeGreaterThan(0);
    for (const opt of plan.options) {
      const clone = deserialize(serialize(state));
      for (const cmd of opt.commands) {
        const r = applyCommand(clone, ctx.map, cmd);
        expect(r.ok, `command ${cmd.type} failed: ${r.error ?? ''}`).toBe(true);
      }
    }
  });

  it('an unknown scope returns an empty plan, not a crash', () => {
    const { state, ctx } = poweredFixture();
    const plan = planReinforcement(state, ctx, 999);
    expect(plan.options).toEqual([]);
  });
});

describe('ring-main assist (proposeLoop)', () => {
  it('closes a radial sub into a loop that survives losing the original feeder', () => {
    const { state, ctx, ids } = poweredFixture();
    // a second supply path target outside the radial subtree: another
    // grid sub fed straight from the plant
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'grid', x: 25, y: 8 },
    });
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 25, by: 8 },
    });

    const pristine = JSON.stringify(serialize(state));
    const plan = proposeLoop(state, ctx, ids.dist);
    expect(plan.options.length).toBe(1);
    const opt = plan.options[0];
    expect(opt).toBeDefined();
    if (!opt) return;
    expect(opt.label).toMatch(/close the ring/);
    expect(opt.capexK).toBeGreaterThan(0);

    // apply the loop on a clone, then lose the original 33 kV feeder:
    // the dist sub must still reach generation (topological check)
    const clone = deserialize(serialize(state));
    for (const cmd of opt.commands) {
      expect(applyCommand(clone, ctx.map, cmd).ok).toBe(true);
    }
    expect(applyCommand(clone, ctx.map, { type: 'demolish', assetId: ids.line33 }).ok).toBe(true);
    const islands = findIslands(deriveNetwork(clone.assets.values()));
    expect(islands.islandOf.get(busId(ids.dist, 33))).toBe(
      islands.islandOf.get(busId(ids.gas, 132)),
    );
    // the proposal itself left the live state alone
    expect(JSON.stringify(serialize(state))).toBe(pristine);
  });

  it('an already-looped sub gets no proposal', () => {
    const { state, ctx, ids } = poweredFixture();
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'grid', x: 25, y: 8 },
    });
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 5, ay: 5, bx: 25, by: 8 },
    });
    // close the ring by hand: dist now has two independent supply paths
    mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 18, ay: 18, bx: 25, by: 8 },
    });
    const plan = proposeLoop(state, ctx, ids.dist);
    expect(plan.options.length).toBe(0);
  });
});
