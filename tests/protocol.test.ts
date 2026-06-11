import { describe, expect, it } from 'vitest';
import { MINUTES_PER_TICK, TICKS_PER_SECOND } from '../src/sim/protocol';

describe('sim timing constants', () => {
  it('advances 30 game-minutes per real second at 1x', () => {
    expect(MINUTES_PER_TICK * TICKS_PER_SECOND).toBe(30);
  });

  it('a full game-day passes in 48 real seconds at 1x', () => {
    const realSecondsPerDay = (24 * 60) / (MINUTES_PER_TICK * TICKS_PER_SECOND);
    expect(realSecondsPerDay).toBe(48);
  });
});
