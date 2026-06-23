// Non-London building-density thin (#1, owner 2026-06-22: "too many buildings on
// the maps other than London ... fewer is better"). structureSpriteFor drops a
// deterministic ~35% of ordinary building tiles on GENERATED fabrics, leaving
// London byte-identical. Render-only — the sim's zones/customers are untouched.
import { describe, expect, it } from 'vitest';
import { makeTestMap } from './helpers';
import { ZONE } from '../src/sim/map/types';
import { structureSpriteFor } from '../src/render/tileChooser';

function thinnedRatio(fabric: string | undefined): number {
  const map = makeTestMap(40, 40);
  // structureSpriteFor reads map.fabric (a CityFabric union); the test passes a
  // plain string, so set it through a widened view (valid at runtime).
  if (fabric) (map as { fabric?: string }).fabric = fabric;
  map.zone.fill(ZONE.urban);
  let undef = 0;
  let total = 0;
  for (let y = 2; y < 38; y++) {
    for (let x = 2; x < 38; x++) {
      total += 1;
      if (structureSpriteFor(map, x, y) === undefined) undef += 1;
    }
  }
  return undef / total;
}

describe('non-London building density thin (#1)', () => {
  it('drops ~35% of ordinary building tiles on a generated fabric', () => {
    const r = thinnedRatio('newyork');
    expect(r).toBeGreaterThan(0.25);
    expect(r).toBeLessThan(0.45);
  });

  it('leaves London completely untouched', () => {
    expect(thinnedRatio(undefined)).toBe(0);
    expect(thinnedRatio('london')).toBe(0);
  });
});
