// Hybrid landmark art: code-drawn vector sprites stay the default for every
// landmark, but the ICONIC heroes can be overridden by an outsourced raster
// (a generated/painted PNG) when one is supplied. The override rides the
// landmark's EXISTING atlas frame — the PNG is authored at the sprite's exact
// canvas size and simply replaces the frame's pixels, so the renderer's
// anchoring, trim and dusk grade keep working unchanged. With no PNG present a
// hero falls back to its code sprite (and the atlas is byte-identical).
//
// Generation happens OUT of band (an image model, not this code); see
// docs/hero-sprites.md for the per-hero canvas size + the prompt set. Drop a
// file at public/heroes/<spriteName>.png and it slots straight in.

import { isoDims, swAnchorDims } from './sprites/iso';

/** A landmark's tile footprint — MUST mirror its registration in
 *  sprites/atlas.ts so the raster anchors exactly like the code sprite. */
export interface HeroFootprint {
  wTiles: number;
  hTiles: number;
  /** SW-anchored multi-tile block (Iso swAnchor) vs north-corner anchored. */
  sw: boolean;
}

/** The iconic London set worth bespoke/outsourced art, keyed by atlas sprite
 *  name. Footprints kept in sync with atlas.ts (asserted by a unit test). */
export const HERO_FOOTPRINTS: Record<string, HeroFootprint> = {
  lm_parliament: { wTiles: 3, hTiles: 5, sw: true },
  lm_bridge: { wTiles: 1, hTiles: 4, sw: true }, // Tower Bridge
  lm_dome: { wTiles: 2, hTiles: 2, sw: true }, // St Paul's
  lm_o2dome: { wTiles: 3, hTiles: 3, sw: true }, // The O2
  lm_wembley: { wTiles: 2, hTiles: 2, sw: true },
  lm_spire: { wTiles: 1, hTiles: 1, sw: false }, // The Shard
  lm_gherkin: { wTiles: 1, hTiles: 1, sw: false },
  lm_eye: { wTiles: 1, hTiles: 1, sw: false }, // London Eye
  lm_fortress: { wTiles: 1, hTiles: 1, sw: false }, // Tower of London
};

export const HERO_NAMES: readonly string[] = Object.keys(HERO_FOOTPRINTS);

/** The exact device-pixel canvas a hero PNG must be authored at (so it pins
 *  to the same footprint as the code sprite). */
export function heroCanvasDims(name: string): { w: number; h: number } | undefined {
  const f = HERO_FOOTPRINTS[name];
  if (!f) return undefined;
  return f.sw ? swAnchorDims(f.wTiles, f.hTiles) : isoDims(f.wTiles, f.hTiles);
}

/** A decoded raster override: full-canvas RGBA at the hero's canvas dims. */
export interface HeroRaster {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  w: number;
  h: number;
}

/** A cheap content fingerprint of the loaded overrides, folded into the atlas
 *  cache key so swapping hero art rebakes the cached sheet. */
export function heroFingerprint(heroes?: Map<string, HeroRaster>): string {
  if (!heroes || heroes.size === 0) return 'h0';
  let h = 5381;
  for (const name of [...heroes.keys()].sort()) {
    const r = heroes.get(name)!;
    const px = r.pixels;
    // djb2 over name + dims + a sparse pixel sample (full scan is wasteful)
    for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
    h = ((h << 5) + h + r.w * 31 + r.h) >>> 0;
    const step = Math.max(4, (px.length >> 12) & ~3);
    for (let i = 0; i < px.length; i += step) h = ((h << 5) + h + (px[i] ?? 0)) >>> 0;
  }
  return `h${h.toString(36)}`;
}
