// Regenerate the brand PNGs from the code SVG sources (art-is-code):
//   node tools/genIcons.mjs
// - apple-touch-icon.png / icon-512.png  <- public/icon.svg  (opaque navy)
// - logotype.png                          <- the code-drawn wordmark lockup
// Keeps the raster icons (iOS ignores SVG) in sync with the SVG mark.
// Uses the sandbox Chromium (the same browser e2e uses) as the rasteriser.

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const iconSvg = readFileSync('public/icon.svg', 'utf8');

// The wordmark lockup, code-drawn. Mirrors public/logo.svg's mark with the
// "i" tittle replaced by the warm grid-node, and the energized→operator
// colour split (off-white "Electri" → gold "City").
const NODE = (sfx, cx, cy, scale) => `
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(-32 -32)">
    <circle cx="32" cy="32" r="26" fill="url(#gl${sfx})"/>
    <g fill="none" stroke="#6f7ba6" stroke-width="3.4" stroke-linecap="round">
      <path d="M32 32 L11 11"/><path d="M32 32 L53 11"/>
      <path d="M32 32 L11 53"/><path d="M32 32 L53 53"/>
    </g>
    <g fill="#39446e">
      <circle cx="11" cy="11" r="4.4"/><circle cx="53" cy="11" r="4.4"/>
      <circle cx="11" cy="53" r="4.4"/><circle cx="53" cy="53" r="4.4"/>
    </g>
    <circle cx="32" cy="32" r="12.5" fill="url(#core${sfx})"/>
    <circle cx="32" cy="32" r="12.5" fill="none" stroke="#ffe6bc" stroke-width="1.6"/>
    <circle cx="28.5" cy="28.5" r="3" fill="#fff7ec" opacity="0.9"/>
  </g>`;

const GRADS = (sfx) => `
  <radialGradient id="gl${sfx}" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff8a1e" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#ff8a1e" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="core${sfx}" cx="42%" cy="38%" r="68%">
    <stop offset="0" stop-color="#ffd27a"/>
    <stop offset="0.5" stop-color="#ff9a2e"/>
    <stop offset="1" stop-color="#f47714"/>
  </radialGradient>`;

const lockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 200">
  <defs>${GRADS('L')}</defs>
  ${NODE('L', 100, 100, 1.45)}
  <text x="196" y="116" font-size="90" font-weight="800" letter-spacing="-2"
        font-family="'Inter','Helvetica Neue',Arial,sans-serif">
    <tspan fill="#f2efe8">Electri</tspan><tspan fill="#ff9a2e">City</tspan>
  </text>
  <circle cx="445" cy="44" r="9" fill="url(#coreL)"/>
  <circle cx="445" cy="44" r="9" fill="none" stroke="#ffe6bc" stroke-width="1"/>
  <text x="198" y="158" font-family="'Inter',Arial,sans-serif" font-size="21" letter-spacing="6.5"
        fill="#8d97b4" font-weight="600">LONDON GRID OPERATOR</text>
</svg>`;

const jobs = [
  { svg: iconSvg, out: 'public/apple-touch-icon.png', w: 180, h: 180, bg: '#0a0e22' },
  { svg: iconSvg, out: 'public/icon-512.png', w: 512, h: 512, bg: '#0a0e22' },
  // transparent wordmark so it sits on any panel; 2x for crispness (759x210
  // historically — keep the same footprint).
  { svg: lockupSvg, out: 'public/logotype.png', w: 760, h: 200, bg: null },
];

const browser = await chromium.launch({
  executablePath: process.env.CI ? undefined : '/tmp/chromium',
  args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
});
for (const { svg, out, w, h, bg } of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const html = `<!doctype html><html><head><style>
    *{margin:0;padding:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden;${bg ? `background:${bg}` : 'background:transparent'}}
    svg{display:block;width:${w}px;height:${h}px}
  </style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log('wrote', out, `${w}x${h}`);
}
await browser.close();
