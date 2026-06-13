// The opening script: the campaign letterbox must stay short (two beats
// max, owner playtest feedback) and the closing beat must communicate the
// 3-month metrics freeze plainly — no broken "the letter ends" phrasing.

import { describe, expect, it } from 'vitest';
import { STORY_BEATS } from '../src/sim/scenario/story';

describe('opening story beats', () => {
  it('is trimmed to two beats max', () => {
    expect(STORY_BEATS.length).toBeLessThanOrEqual(2);
    expect(STORY_BEATS.length).toBeGreaterThan(0);
  });

  it('has a title and body for every beat', () => {
    for (const beat of STORY_BEATS) {
      expect(beat.title.trim().length).toBeGreaterThan(0);
      expect(beat.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('drops the broken "the letter ends" phrasing', () => {
    const all = STORY_BEATS.map((b) => b.body).join(' ');
    expect(all).not.toContain('the letter ends');
  });

  it('communicates the three-month metrics freeze in the closing beat', () => {
    const last = STORY_BEATS[STORY_BEATS.length - 1];
    expect(last).toBeDefined();
    const body = last?.body ?? '';
    expect(body.toLowerCase()).toContain('three months');
    expect(body.toLowerCase()).toMatch(/freez|paus/);
  });
});
