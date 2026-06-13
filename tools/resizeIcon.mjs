// Build the square app-icon set from public/app-icon.png. The source render
// includes an "ELECTRI CITY" wordmark band at the bottom; a launcher prints
// the app name under the icon anyway, so we drop it: scale the whole source
// up and shift it inside a rounded-square clip so the emblem (transformer +
// arc + skyline) centres while the source's white margins AND the wordmark
// fall outside the clip. The source's own navy fills the frame — no flat
// fill, no rectangular crop catching the rounded corners.
// Uses the installed Chromium for canvas resampling (no sharp/imagemagick).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const srcB64 = readFileSync('brand/app-icon-source.png').toString('base64');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

// emblem centre on the 1254² source, and the per-512px zoom (k scales with
// output size). k=0.70 at 512 makes the source's dark square overfill the
// frame so its white page-margin and the wordmark band clip away.
const EMBLEM = { cx: 620, cy: 470, kPer512: 0.7 };

const make = async (size, out) => {
  const dataUrl = await page.evaluate(async ({ b64, size, EMBLEM }) => {
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = 'data:image/png;base64,' + b64; });
    const c = document.getElementById('c');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // navy safety fill (in case any edge peeks through)
    ctx.fillStyle = '#0f1426';
    // rounded-square clip
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(size, 0, size, size, r); ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r); ctx.arcTo(0, 0, size, 0, r); ctx.closePath();
    ctx.clip();
    ctx.fillRect(0, 0, size, size);
    // scale the whole source and shift so the emblem centres a touch low
    const k = EMBLEM.kPer512 * (size / 512);
    const ox = size * 0.5 - EMBLEM.cx * k;
    const oy = size * 0.55 - EMBLEM.cy * k;
    ctx.drawImage(img, ox, oy, img.width * k, img.height * k);
    return c.toDataURL('image/png');
  }, { b64: srcB64, size, EMBLEM });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(out, buf);
  console.log(out, (buf.length / 1024).toFixed(0) + 'KB');
};

await make(512, 'public/icon-512.png');
await make(192, 'public/icon-192.png');
await make(180, 'public/apple-touch-icon.png');
await browser.close();
