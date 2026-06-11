import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { poweredFixture } from './helpers';

describe('save round-trip', () => {
  it('restored state produces an identical next tick', () => {
    const { state, ctx } = poweredFixture();
    state.speed = 4;
    for (let i = 0; i < 10; i++) {
      advanceTime(state);
      solveTick(state, ctx, derive(state, ctx), true);
    }

    const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    expect(restored.tick).toBe(state.tick);
    expect(restored.energyCostYrK).toBe(state.energyCostYrK);

    advanceTime(state);
    advanceTime(restored);
    const a = solveTick(state, ctx, derive(state, ctx), true);
    const b = solveTick(restored, ctx, derive(restored, ctx), true);

    expect([...b.coverage]).toEqual([...a.coverage]);
    expect(b.bill).toEqual(a.bill);
    expect(b.servedCustomers).toBe(a.servedCustomers);
    expect(b.branches).toEqual(a.branches);
  });
});
