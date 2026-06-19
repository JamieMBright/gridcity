// Atlas budget guard (owner: "catch crashes BEFORE players do"). A sprite atlas
// texture wider/taller than 4096px fails to upload on mobile GPUs (notably iOS
// Safari) and loses the WebGL context — a hard crash that never reaches our JS
// error capture. atlas.ts already THROWS if the shared packed sheet overflows,
// but the BESPOKE per-hero textures ride their OWN off-atlas buffers with no
// such guard, so this locks in that they stay under the ceiling too.
//
// Building an atlas imports + transforms a city's (large) hero module and
// allocates ~120MB of pixel buffers, so a full 12-city sweep is too heavy for
// the shared unit-test worker (it trips vitest's inter-test RPC timeout). We
// therefore smoke-test a representative pair — London (the shared-sheet
// baseline, heroless fabric) and New York (the owner-reported crash city) —
// here, and rely on the cityload e2e (which loads EVERY city) + atlas.ts's
// runtime overflow throw to cover the rest. Build is headless (no DOM), exactly
// like tools/preview.ts builds it in Node.

import { describe, expect, it } from 'vitest';
import { applyCityFabric, type CityFabric } from '../src/render/sprites/buildingSprites';
import { buildAtlas } from '../src/render/sprites/atlas';

const CEIL = 4096; // the mobile-GPU per-texture ceiling the pipeline is built around

function checkCity(city: CityFabric): void {
  applyCityFabric(city);
  const atlas = buildAtlas();
  // shared packed sheet
  expect(atlas.width, `${city} sheet width`).toBeLessThanOrEqual(CEIL);
  expect(atlas.height, `${city} sheet height`).toBeLessThanOrEqual(CEIL);
  // every off-atlas bespoke hero rides its OWN texture — each must fit too
  for (const [name, hb] of atlas.heroes) {
    expect(hb.w, `${city} hero "${name}" width`).toBeLessThanOrEqual(CEIL);
    expect(hb.h, `${city} hero "${name}" height`).toBeLessThanOrEqual(CEIL);
  }
}

describe('sprite atlas budget — no texture breaches the 4096px mobile-GPU ceiling', () => {
  it('London (shared-sheet baseline) stays ≤ 4096px', { timeout: 30_000 }, () => {
    checkCity('london');
  });

  it('New York (reported crash city) stays ≤ 4096px', { timeout: 30_000 }, () => {
    checkCity('newyork');
  });
});
