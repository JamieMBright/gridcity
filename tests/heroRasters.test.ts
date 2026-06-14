import { beforeAll, describe, expect, it } from 'vitest';
import { buildAtlas, type SpriteAtlas } from '../src/render/sprites/atlas';
import { HERO_FOOTPRINTS, HERO_NAMES, heroCanvasDims, heroFingerprint, type HeroRaster } from '../src/render/heroRasters';

/** A solid-colour raster at the given canvas dims. */
function solid(w: number, h: number, r: number, g: number, b: number): HeroRaster {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = 255;
  }
  return { pixels, w, h };
}

function read(atlas: SpriteAtlas, name: string): [number, number, number, number] {
  const f = atlas.frames.get(name)!;
  const x = f.x + (f.w >> 1);
  const y = f.y + (f.h >> 1);
  const o = (y * atlas.width + x) * 4;
  return [atlas.pixels[o]!, atlas.pixels[o + 1]!, atlas.pixels[o + 2]!, atlas.pixels[o + 3]!];
}

/** Fast checksum (length + sparse sample sum) — enough to assert sheet identity. */
function checksum(atlas: SpriteAtlas): string {
  const px = atlas.pixels;
  let sum = 0;
  for (let i = 0; i < px.length; i += 997) sum = (sum + (px[i] ?? 0) * 31) >>> 0;
  return `${atlas.width}x${atlas.height}:${px.length}:${sum}`;
}

// buildAtlas bakes ~150 sprites + packs (seconds each), so build the shared
// sheets ONCE and reuse them across the assertions.
let plain: SpriteAtlas;
let redParliament: SpriteAtlas;
beforeAll(() => {
  plain = buildAtlas();
  const dims = heroCanvasDims('lm_parliament')!;
  redParliament = buildAtlas(new Map([['lm_parliament', solid(dims.w, dims.h, 255, 0, 0)]]));
}, 60_000);

describe('hero raster overrides', () => {
  it('every registered hero exists as an atlas frame', () => {
    for (const name of HERO_NAMES) expect(plain.frames.has(name)).toBe(true);
  });

  it('a correctly-sized override replaces the landmark pixels', () => {
    expect(read(redParliament, 'lm_parliament')).toEqual([255, 0, 0, 255]);
  });

  it('falls back to code art when no override is supplied', () => {
    expect(read(plain, 'lm_parliament')).not.toEqual([255, 0, 0, 255]);
  });

  it('ignores a wrong-sized override (never corrupts the sheet)', () => {
    const bad = buildAtlas(new Map([['lm_parliament', solid(40, 40, 255, 0, 0)]]));
    expect(read(bad, 'lm_parliament')).toEqual(read(plain, 'lm_parliament'));
  }, 60_000);

  it('an empty override map builds the identical atlas', () => {
    expect(checksum(buildAtlas(new Map()))).toBe(checksum(plain));
  }, 60_000);

  it('heroCanvasDims resolves for every hero and the fingerprint reacts to art', () => {
    for (const name of HERO_NAMES) expect(heroCanvasDims(name)).toBeDefined();
    expect(Object.keys(HERO_FOOTPRINTS).length).toBe(HERO_NAMES.length);
    expect(heroFingerprint()).toBe('h0');
    const dims = heroCanvasDims('lm_eye')!;
    expect(heroFingerprint(new Map([['lm_eye', solid(dims.w, dims.h, 1, 2, 3)]]))).not.toBe('h0');
  });
});
