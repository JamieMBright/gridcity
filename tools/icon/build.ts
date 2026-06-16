// Build harness for the ElectriCity app-icon CONCEPTS v2.
// Renders, for every registered concept:
//   <name>-hero-512.png            512 full-bleed (un-masked, shows the art)
//   <name>-hero-512-ios.png        512 iOS squircle-masked
//   <name>-180.png / -120 / -60    iOS-masked, the home-screen sizes
//   <name>-60-gray.png             grayscale 60px silhouette test
//   <name>-on-dark.png             512 masked on a dark wallpaper w/ shadow
//   <name>-on-light.png            512 masked on a light wallpaper w/ shadow
// Plus two comparison sheets (dark + light backdrops) laying every concept at
// 180/120/60 -- same format as the previous pass so the owner can compare.
//
// Concepts are registered as (name, label, render(size)->full-bleed Img).
// Direction 1 (energy-flow grab) is composed in flow.ts from a captured frame;
// Direction 2 (stylised cable) is fully code-drawn in cable.ts.

import { mkdirSync, existsSync } from 'node:fs';
import {
  blit,
  blitWithShadow,
  downscale,
  fillVGrad,
  type Img,
  grayscale,
  newImg,
  PAL,
  radialGlow,
  resize,
  save,
  squircleMask,
} from './canvas';
import { cableIcon } from './cable';
import { flowIcon, flowVariants } from './flow';

const OUT = 'preview/icon-concepts-v2';

interface Concept {
  name: string;
  label: string;
  render(size: number): Img; // full-bleed, un-masked
}

/** A masked copy at an exact px size (render big, mask, downscale for AA). */
function masked(c: Concept, size: number): Img {
  const big = c.render(size); // already supersampled+downscaled to `size` internally
  // re-supersample the mask: mask at 2x then downscale for a clean squircle edge
  const up = resize(big, size * 2, size * 2);
  squircleMask(up, 5);
  return downscale(up, 2);
}

/** A home-screen backdrop: a tasteful gradient wallpaper, dark or light. */
function wallpaper(w: number, h: number, dark: boolean): Img {
  const img = newImg(w, h);
  if (dark) {
    // a deep night-blue wallpaper with a soft warm glow lower-third (the kind
    // of dusk wallpaper this icon is designed to live on -- truest iPhone test)
    fillVGrad(img, 0x0b0f1d, 0x05060c);
    radialGlow(img, w * 0.5, h * 0.78, w * 0.7, 0x241a33, 0.7, 'over', 2.2);
    radialGlow(img, w * 0.7, h * 0.2, w * 0.5, 0x14223f, 0.5, 'add', 2.4);
  } else {
    // a bright warm-grey wallpaper (a light home screen / App Store sheet)
    fillVGrad(img, 0xf0eee9, 0xd9dde6);
    radialGlow(img, w * 0.3, h * 0.25, w * 0.6, 0xffffff, 0.6, 'over', 2.2);
  }
  return img;
}

/** Composite one masked icon centred on a wallpaper, with a contact shadow. */
function onBackdrop(c: Concept, dark: boolean): Img {
  const pad = 110;
  const icon = masked(c, 512);
  const W = 512 + pad * 2;
  const H = 512 + pad * 2;
  const bg = wallpaper(W, H, dark);
  blitWithShadow(bg, icon, pad, pad, dark ? 0.55 : 0.32);
  return bg;
}

function buildConcept(c: Concept): void {
  // hero: full-bleed (shows the corners) + iOS-masked hero
  const hero = c.render(512);
  save(hero, `${OUT}/${c.name}-hero-512.png`);
  save(masked(c, 512), `${OUT}/${c.name}-hero-512-ios.png`);
  // the home-screen sizes, iOS-masked
  for (const s of [180, 120, 60]) save(masked(c, s), `${OUT}/${c.name}-${s}.png`);
  // grayscale 60 silhouette test
  save(grayscale(masked(c, 60)), `${OUT}/${c.name}-60-gray.png`);
  // on dark + light home screens
  save(onBackdrop(c, true), `${OUT}/${c.name}-on-dark.png`);
  save(onBackdrop(c, false), `${OUT}/${c.name}-on-light.png`);
  console.log(`  built ${c.name}`);
}

/** A comparison sheet: every concept as a column, rows = 180/120/60 (+gray60),
 *  on the chosen backdrop, with labels. Same shape as the v1 sheets. */
function buildSheet(concepts: Concept[], dark: boolean): void {
  const sizes = [180, 120, 60];
  const colW = 230;
  const padX = 40;
  const padTop = 96;
  const rowGap = 36;
  const grayRowH = 60 + 40;
  const W = padX * 2 + colW * concepts.length;
  const rowsH = sizes.reduce((a, s) => a + s + rowGap, 0);
  const H = padTop + rowsH + grayRowH + 60;
  const sheet = newImg(W, H);
  if (dark) {
    fillVGrad(sheet, 0x0c1120, 0x070a14);
    radialGlow(sheet, W * 0.5, H * 0.5, W * 0.7, 0x1a1430, 0.5, 'add', 2.2);
  } else {
    fillVGrad(sheet, 0xf2f0ec, 0xdadee6);
  }
  const ink = dark ? PAL.offWhite : 0x2a2f3e;
  const sub = dark ? PAL.slate : 0x6a7184;
  // title
  text(sheet, 'ELECTRICITY — ICON CONCEPTS v2', padX, 34, 3.0, dark ? PAL.gold : 0x9a6a12);
  text(sheet, dark ? 'dark home-screen backdrop' : 'light home-screen backdrop', padX, 62, 1.8, sub);

  concepts.forEach((c, ci) => {
    const cx = padX + ci * colW + colW / 2;
    // column label
    text(sheet, c.label.toUpperCase(), padX + ci * colW + 14, padTop - 22, 1.8, ink);
    let y = padTop;
    for (const s of sizes) {
      const icon = masked(c, s);
      blitWithShadow(sheet, icon, Math.round(cx - s / 2), y, dark ? 0.5 : 0.3);
      text(sheet, `${s}px`, Math.round(cx - s / 2), y + s + 6, 1.3, sub);
      y += s + rowGap;
    }
    // grayscale 60 silhouette
    const g = grayscale(masked(c, 60));
    blit(sheet, g, Math.round(cx - 30), y + 6);
    text(sheet, 'gray 60', Math.round(cx - 30), y + 6 + 60 + 6, 1.3, sub);
  });

  save(sheet, `${OUT}/_sheet-${dark ? 'dark' : 'light'}.png`);
  console.log(`  built sheet (${dark ? 'dark' : 'light'})`);
}

// ----------------------------------------------------- tiny pixel text -------
// A minimal 5x7 vector-ish font so the sheets carry labels without any font
// dependency. Only the glyphs we use are defined.
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10100', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '10000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
};

function text(img: Img, str: string, x: number, y: number, scale: number, color: number): void {
  let cx = x;
  const px = Math.max(1, Math.round(scale));
  for (const ch of str.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    if (!g) continue;
    for (let ry = 0; ry < 7; ry++) {
      const row = g[ry] ?? '';
      for (let rx = 0; rx < 5; rx++) {
        if (row[rx] === '1') {
          for (let dy = 0; dy < px; dy++) {
            for (let dx = 0; dx < px; dx++) {
              const xx = (cx + rx * px + dx) | 0;
              const yy = (y + ry * px + dy) | 0;
              if (xx >= 0 && yy >= 0 && xx < img.w && yy < img.h) {
                const o = (yy * img.w + xx) * 4;
                const [r, gg, b] = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
                img.px[o] = r;
                img.px[o + 1] = gg;
                img.px[o + 2] = b;
                img.px[o + 3] = 255;
              }
            }
          }
        }
      }
    }
    cx += 6 * px;
  }
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const concepts: Concept[] = [
    { name: 'cable', label: 'Stylised Cable', render: cableIcon },
  ];
  // Direction 1 concepts only exist once a captured frame is present.
  if (existsSync('preview/icon-concepts-v2/_frames')) {
    for (const v of flowVariants()) {
      concepts.push({ name: v.name, label: v.label, render: (s) => flowIcon(s, v.id) });
    }
  } else {
    console.log('  (no captured frames yet -> Direction-1 flow concepts skipped)');
  }

  console.log('Building concepts:');
  for (const c of concepts) buildConcept(c);
  buildSheet(concepts, true);
  buildSheet(concepts, false);
  console.log(`\nDone -> ${OUT}/`);
}

main();
