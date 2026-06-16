import { describe, it, expect } from 'vitest';
import { Iso } from '../src/render/sprites/iso';
import { buildAtlas } from '../src/render/sprites/atlas';

// The hero z-cap unlock: a sprite's Iso can reserve HEADROOM (extra sky rows
// above the footprint) so a tall hero — the Shard, BT Tower, a Canary-Wharf
// skyscraper — can rise past the footprint-derived canvas cap (a 1×1 canvas
// only fits z≈160) while its floor stays pinned exactly where it was. The
// atlas auto-detects the headroom from the baked buffer height and the
// renderers lift the placement by it.
describe('sprite headroom (hero z-cap unlock)', () => {
  it('shifts every projected point DOWN by exactly headroom (x unchanged)', () => {
    const plain = new Iso(1, 1);
    const lifted = new Iso(1, 1, { headroom: 300 });
    expect(lifted.headroom).toBe(300);
    expect(plain.headroom).toBe(0);
    for (const [u, v, z] of [
      [0, 0, 0],
      [1, 1, 0],
      [0.5, 0.5, 120],
      [0.3, 0.7, 250],
    ] as const) {
      const a = plain.P(u, v, z);
      const b = lifted.P(u, v, z);
      expect(b[0]).toBeCloseTo(a[0], 6); // horizontal position invariant
      expect(b[1]).toBeCloseTo(a[1] + 300, 6); // shifted down by headroom only
    }
  });

  it('keeps the floor a constant distance from the canvas bottom', () => {
    // The whole point: the floor (z=0) must not move relative to the bottom of
    // the (now taller) canvas — the renderer pins there. Distance from bottom =
    // canvasHeight - P.y; with the canvas grown by headroom AND P.y grown by
    // headroom, that distance is identical.
    const baseH = 448; // CELL_H for a 1×1 footprint
    const plain = new Iso(1, 1);
    const lifted = new Iso(1, 1, { headroom: 256 });
    const plainBottomGap = baseH - plain.P(1, 1, 0)[1];
    const liftedBottomGap = baseH + 256 - lifted.P(1, 1, 0)[1];
    expect(liftedBottomGap).toBeCloseTo(plainBottomGap, 6);
  });

  it('lets a 1×1 sprite exceed the old z≈160 footprint cap without clipping', () => {
    const plain = new Iso(1, 1);
    expect(plain.P(0, 0, 220)[1]).toBeLessThan(0); // tall tip clips off the top
    const lifted = new Iso(1, 1, { headroom: 360 });
    expect(lifted.P(0, 0, 220)[1]).toBeGreaterThanOrEqual(0); // now it fits
  });

  it('auto-detects headroom on the marquee heroes; ordinary fabric stays 0', () => {
    const atlas = buildAtlas();
    expect(atlas.width).toBeLessThanOrEqual(4096);
    expect(atlas.height).toBeLessThanOrEqual(4096);
    for (const hero of ['lm_spire', 'lm_bttower', 'lm_eye', 'lm_sky0', 'lm_notredame']) {
      expect(
        atlas.frames.get(hero)?.headroom ?? 0,
        `${hero} should reserve headroom`,
      ).toBeGreaterThan(0);
    }
    for (const fabric of ['terrace_0', 'tower_0', 'ground_grass_0', 'sub_dist']) {
      expect(atlas.frames.get(fabric)?.headroom, `${fabric} must not`).toBe(0);
    }
  }, 30000);
});
