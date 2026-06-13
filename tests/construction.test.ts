// Construction-site stage selection (#43): an underConstruction plant's
// art advances through four progress stages keyed off how much of its
// lead time is left. Pure mapping — unit-tested here without the renderer.

import { describe, expect, it } from 'vitest';
import { constructionSpriteFor, constructionStage } from '../src/render/construction';

describe('constructionStage', () => {
  const total = 100; // 100 game-minutes of lead time for the maths

  it('just started → stage 0 (groundworks)', () => {
    // ~all the lead time still remaining
    expect(constructionStage(100, total)).toBe(0);
    expect(constructionStage(80, total)).toBe(0); // 20% done
  });

  it('first quarter done → stage 1 (frame rising)', () => {
    expect(constructionStage(70, total)).toBe(1); // 30% done
    expect(constructionStage(55, total)).toBe(1); // 45% done
  });

  it('half done → stage 2 (scaffolded shell)', () => {
    expect(constructionStage(45, total)).toBe(2); // 55% done
    expect(constructionStage(30, total)).toBe(2); // 70% done
  });

  it('nearly there → stage 3 (topping out)', () => {
    expect(constructionStage(20, total)).toBe(3); // 80% done
    expect(constructionStage(1, total)).toBe(3); // 99% done
  });

  it('commissioned / past due → final stage 3', () => {
    expect(constructionStage(0, total)).toBe(3);
    expect(constructionStage(-50, total)).toBe(3);
  });

  it('falls back to the finishing stage when the lead time is unknown', () => {
    expect(constructionStage(50, undefined)).toBe(3);
    expect(constructionStage(50, 0)).toBe(3);
    expect(constructionStage(50, -10)).toBe(3);
  });

  it('progresses monotonically as time runs down', () => {
    const stages = [100, 80, 60, 40, 20, 0].map((rem) => constructionStage(rem, total));
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1] ?? 0);
    }
    expect(stages[0]).toBe(0);
    expect(stages[stages.length - 1]).toBe(3);
  });

  it('maps each stage to its atlas sprite name', () => {
    expect(constructionSpriteFor(0)).toBe('construction_0');
    expect(constructionSpriteFor(1)).toBe('construction_1');
    expect(constructionSpriteFor(2)).toBe('construction_2');
    expect(constructionSpriteFor(3)).toBe('construction_3');
  });
});
