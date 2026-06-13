// Rasterize SVG strings to PNG at exact pixel sizes using the sandbox
// Chromium (the same browser e2e uses). This is the art-is-code raster
// path for the brand mark: the SVG is the source of truth, PNGs are
// generated from it so the favicon / app-icon / wordmark stay in sync.
//
//   node tools/rasterize.mjs <spec.json>
//
// spec.json: [{ svg: "<svg…>", out: "path.png", w, h, bg?: "#hex" | null }]
// bg null/omitted = transparent. A solid bg is composited behind the SVG.

import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const specPath = process.argv[2];
if (!specPath) {
  console.error('usage: node tools/rasterize.mjs <spec.json>');
  process.exit(1);
}
const jobs = JSON.parse(readFileSync(specPath, 'utf8'));

const browser = await chromium.launch({
  executablePath: process.env.CI ? undefined : '/tmp/chromium',
  args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
});

for (const job of jobs) {
  const { svg, out, w, h, bg = null } = job;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const html = `<!doctype html><html><head><style>
    *{margin:0;padding:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden;${bg ? `background:${bg}` : 'background:transparent'}}
    svg{display:block;width:${w}px;height:${h}px}
  </style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log('wrote', out, `${w}x${h}`, bg ?? 'transparent');
}

await browser.close();
