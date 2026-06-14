// Node-side loader for the outsourced hero rasters. Reads any committed
// public/heroes/<name>.png, decodes it and hands the atlas builder an override
// map (same shape the browser loader produces). Missing/oversized/wrong-format
// files are skipped so the build never breaks on bad art — the landmark just
// keeps its code sprite. Used by the preview tool so art review sees real PNGs.

import { readFileSync } from 'node:fs';
import { HERO_NAMES, heroCanvasDims, type HeroRaster } from '../src/render/heroRasters';
import { decodePng } from './png';

export function loadHeroRastersNode(dir = 'public/heroes'): Map<string, HeroRaster> {
  const out = new Map<string, HeroRaster>();
  for (const name of HERO_NAMES) {
    const dims = heroCanvasDims(name);
    if (!dims) continue;
    let buf: Buffer;
    try {
      buf = readFileSync(`${dir}/${name}.png`);
    } catch {
      continue; // no override for this hero — code sprite stands
    }
    try {
      const png = decodePng(buf);
      if (png.width !== dims.w || png.height !== dims.h) {
        console.warn(`hero ${name}: PNG ${png.width}x${png.height} != expected ${dims.w}x${dims.h}, skipping`);
        continue;
      }
      out.set(name, { pixels: png.pixels, w: png.width, h: png.height });
    } catch (e) {
      console.warn(`hero ${name}: ${(e as Error).message}, skipping`);
    }
  }
  return out;
}
