// DIRECTION 1 -- "ENERGY-FLOW SCREEN GRAB" app-icon concept.
// Composes a real captured in-game dusk/night frame (glowing network + lit
// landmarks against the navy Thames) into an icon: pick a square crop with a
// strong focal point, push the dusk grade a touch, add a gentle inner vignette
// + a hot warm core so it reads as an ICON (focal point) not a busy thumbnail.
//
// The captured frames live in preview/icon-concepts-v2/_frames/<id>.png (clean,
// HUD-free, written by e2e/iconframes.helper.spec.ts). Each variant names a
// frame + a crop rect + a focal point. Until frames exist the build harness
// skips these (see build.ts).

import { readFileSync, existsSync } from 'node:fs';
import { boxBlur, decodePng, downscale, type Img, mix, newImg, PAL, radialGlow, resize } from './canvas';

const SS = 2; // mild supersample for the crop compositing

export interface FlowVariant {
  id: string;
  name: string;
  label: string;
  frame: string; // file under _frames/
  // normalized crop rect within the source frame (0..1)
  cx: number;
  cy: number;
  cw: number; // crop is square: cw used for both dims (in source-width units)
  // normalized focal point WITHIN the crop (0..1) for the vignette/warm core
  fx: number;
  fy: number;
  warm: number; // 0..1 strength of the warm focal core
}

/** The registered Direction-1 crops. The `hl-*` frames are genuine committed
 *  in-game ELECTRIFICATION captures (the hero-lights design gate) — they have a
 *  thin HUD ticker only in the top ~32 of 540px, so every crop here keeps cy
 *  high enough to exclude it. The Eye's colour-cycling rim is the hero: a
 *  naturally circular focal point glowing against the navy Thames. */
export function flowVariants(): FlowVariant[] {
  return [
    {
      // THE EYE — glowing rim against the navy river. The strongest icon read:
      // a bright ring focal point, dark surround, unmistakable at 60px.
      id: 'eye',
      name: 'flow-eye',
      label: 'Eye Rim',
      frame: 'hl-eye.png',
      cx: 0.5,
      cy: 0.44,
      cw: 0.58,
      fx: 0.5,
      fy: 0.44,
      warm: 0.2,
    },
    {
      // THE GHERKIN cluster at dusk — lit windows + warm streets, dusty-pink sky.
      id: 'gherkin',
      name: 'flow-gherkin',
      label: 'Lit City',
      frame: 'hl-gherkin.png',
      cx: 0.5,
      cy: 0.52,
      cw: 0.62,
      fx: 0.5,
      fy: 0.5,
      warm: 0.16,
    },
    {
      // THE STADIUM — a floodlit ring of light, a strong glowing focal shape.
      id: 'stadium',
      name: 'flow-stadium',
      label: 'Floodlit Bowl',
      frame: 'hl-stadium.png',
      cx: 0.46,
      cy: 0.62,
      cw: 0.6,
      fx: 0.46,
      fy: 0.56,
      warm: 0.14,
    },
  ];
}

const cache: Record<string, Img> = {};
function loadFrame(file: string): Img | undefined {
  const path = `preview/icon-concepts-v2/_frames/${file}`;
  if (cache[file]) return cache[file];
  if (!existsSync(path)) return undefined;
  const img = decodePng(readFileSync(path));
  cache[file] = img;
  return img;
}

/** Crop a square region (normalized, source-width units) from a frame. */
function cropSquare(src: Img, cxN: number, cyN: number, cwN: number): Img {
  const side = Math.round(cwN * src.w);
  const x0 = Math.round(cxN * src.w - side / 2);
  const y0 = Math.round(cyN * src.h - side / 2);
  const out = newImg(side, side);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const sx = Math.min(src.w - 1, Math.max(0, x0 + x));
      const sy = Math.min(src.h - 1, Math.max(0, y0 + y));
      const so = (sy * src.w + sx) * 4;
      const o = (y * side + x) * 4;
      out.px[o] = src.px[so] ?? 0;
      out.px[o + 1] = src.px[so + 1] ?? 0;
      out.px[o + 2] = src.px[so + 2] ?? 0;
      out.px[o + 3] = 255;
    }
  }
  return out;
}

/** Build a Direction-1 icon at `size` from variant `id`. Falls back to a
 *  graceful "missing frame" navy tile so the harness never crashes. */
export function flowIcon(size: number, id: string): Img {
  const v = flowVariants().find((x) => x.id === id);
  const S = size * SS;
  if (!v) return newImg(S, S, (PAL.navy << 8) | 0xff);
  const src = loadFrame(v.frame);
  if (!src) {
    // placeholder so the pipeline runs before frames are captured
    const img = newImg(S, S, (PAL.navy << 8) | 0xff);
    return img;
  }
  const crop = cropSquare(src, v.cx, v.cy, v.cw);
  const img = resize(crop, S, S);

  // --- (1) ICON TONE-CURVE: crush the shadows toward deep navy and let only
  // the genuinely-lit pixels survive bright. This is the figure-ground move
  // (color-theory): the dark city sinks into the navy field so the LIGHT is the
  // subject. Stronger than a screenshot grade — it has to read at 60px.
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    const r = img.px[o] ?? 0;
    const g = img.px[o + 1] ?? 0;
    const b = img.px[o + 2] ?? 0;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const shadowPull = Math.max(0, 0.5 - lum) * 0.72; // crush, but keep structure
    const c0 = mix((r << 16) | (g << 8) | b, PAL.night, shadowPull);
    const hiPull = Math.max(0, lum - 0.6) * 0.6;
    const c1 = mix(c0, PAL.gold, hiPull * 0.45);
    img.px[o] = (c1 >> 16) & 0xff;
    img.px[o + 1] = (c1 >> 8) & 0xff;
    img.px[o + 2] = c1 & 0xff;
  }

  // --- (2) BLOOM RELIGHT: extract the bright pixels (the lit windows, the
  // glowing rim / floodlit ring), blur them, and add them back additively — so
  // the energy actually RADIATES in the icon the way it does in motion in the
  // game. Two bloom scales (tight + wide) for a believable falloff.
  const hi = newImg(S, S);
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    const r = img.px[o] ?? 0;
    const g = img.px[o + 1] ?? 0;
    const b = img.px[o + 2] ?? 0;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const t = Math.max(0, lum - 0.5) / 0.5; // only the brightest carry bloom
    hi.px[o] = r * t;
    hi.px[o + 1] = g * t;
    hi.px[o + 2] = b * t;
    hi.px[o + 3] = 255;
  }
  const bloomTight = boxBlur(hi, Math.round(S * 0.012), 2);
  const bloomWide = boxBlur(hi, Math.round(S * 0.045), 2);
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    img.px[o] = Math.min(255, (img.px[o] ?? 0) + (bloomTight.px[o] ?? 0) * 0.7 + (bloomWide.px[o] ?? 0) * 0.5);
    img.px[o + 1] = Math.min(255, (img.px[o + 1] ?? 0) + (bloomTight.px[o + 1] ?? 0) * 0.7 + (bloomWide.px[o + 1] ?? 0) * 0.5);
    img.px[o + 2] = Math.min(255, (img.px[o + 2] ?? 0) + (bloomTight.px[o + 2] ?? 0) * 0.7 + (bloomWide.px[o + 2] ?? 0) * 0.5);
  }

  // --- (3) FOCAL SPOTLIGHT: a warm core at the focal point so the eye lands
  // there at a glance, and a darkening of everything far from it (a soft
  // radial falloff) so the icon has ONE subject, not a busy thumbnail.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - v.fx * S, y - v.fy * S) / S;
      const fall = Math.min(1, Math.max(0, (d - 0.28) / 0.5)) * 0.55; // 0 near focal
      if (fall > 0) {
        const o = (y * S + x) * 4;
        img.px[o] = (img.px[o] ?? 0) * (1 - fall) + ((PAL.night >> 16) & 0xff) * fall;
        img.px[o + 1] = (img.px[o + 1] ?? 0) * (1 - fall) + ((PAL.night >> 8) & 0xff) * fall;
        img.px[o + 2] = (img.px[o + 2] ?? 0) * (1 - fall) + (PAL.night & 0xff) * fall;
      }
    }
  }
  if (v.warm > 0) {
    radialGlow(img, v.fx * S, v.fy * S, S * 0.34, PAL.gold, v.warm * 0.5, 'add', 2.4);
    radialGlow(img, v.fx * S, v.fy * S, S * 0.16, PAL.fwhite, v.warm * 0.35, 'add', 2.0);
  }

  // --- (4) inner vignette: darken the corners so they read as icon chrome.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2);
      const dy = (y - S / 2) / (S / 2);
      const d = Math.hypot(dx, dy);
      if (d <= 0.74) continue;
      const k = Math.min(1, (d - 0.74) / 0.45) * 0.7;
      const o = (y * S + x) * 4;
      img.px[o] = (img.px[o] ?? 0) * (1 - k) + ((PAL.night >> 16) & 0xff) * k;
      img.px[o + 1] = (img.px[o + 1] ?? 0) * (1 - k) + ((PAL.night >> 8) & 0xff) * k;
      img.px[o + 2] = (img.px[o + 2] ?? 0) * (1 - k) + (PAL.night & 0xff) * k;
    }
  }

  return downscale(img, SS);
}
