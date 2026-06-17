// Build the square app-icon set from the brand source in brand/. The new
// source (a glowing grid-node globe on deep navy) wants a little BREATHING
// ROOM so it sits centrally inside the OS squircle instead of edge-to-edge —
// so unlike the old full-bleed emblem we PAD it: fill the icon with the brand
// navy, then draw the source centred at ICON_SCALE. The navy fill matches the
// source background, so the pad is invisible — it just recentres the globe.
// Uses the installed Chromium for canvas resampling (no sharp/imagemagick).
import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// prefer the new PNG; fall back to the historical jpeg
const SRC = existsSync('brand/app-icon-source.png')
  ? 'brand/app-icon-source.png'
  : 'brand/app-icon-source.jpeg';
const NAVY = '#0a0e22'; // theme.night — matches the source backdrop
const SCALE = Number(process.env.ICON_SCALE ?? '0.84'); // standard icons
const MASK_SCALE = Number(process.env.MASK_SCALE ?? '0.66'); // Android safe-zone

const srcB64 = readFileSync(SRC).toString('base64');
const mime = SRC.endsWith('.png') ? 'image/png' : 'image/jpeg';
const exe = existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  : '/tmp/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
mkdirSync('preview', { recursive: true });

// scale = fraction of the icon the source fills (centred); mask = draw the
// OS superellipse clip for the design-gate preview only.
const render = async (size, scale, mask) =>
  page.evaluate(
    async ({ b64, mime, size, scale, mask, navy }) => {
      const img = new Image();
      await new Promise((r, j) => {
        img.onload = r;
        img.onerror = j;
        img.src = `data:${mime};base64,` + b64;
      });
      const c = document.getElementById('c');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = navy;
      ctx.fillRect(0, 0, size, size);
      if (mask) {
        const r = size * 0.22;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(size, 0, size, size, r);
        ctx.arcTo(size, size, 0, size, r);
        ctx.arcTo(0, size, 0, 0, r);
        ctx.arcTo(0, 0, size, 0, r);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = navy;
        ctx.fillRect(0, 0, size, size);
      }
      const d = Math.round(size * scale);
      const off = Math.round((size - d) / 2);
      ctx.drawImage(img, off, off, d, d); // centred, padded
      return c.toDataURL('image/png');
    },
    { b64: srcB64, mime, size, scale, mask, navy: NAVY },
  );

const save = (dataUrl, out) => {
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(out);
};

save(await render(512, SCALE, false), 'public/icon-512.png');
save(await render(192, SCALE, false), 'public/icon-192.png');
save(await render(180, SCALE, false), 'public/apple-touch-icon.png');
save(await render(512, MASK_SCALE, false), 'public/icon-512-maskable.png');
// design-gate previews: padded + OS-mask-simulated corners
save(await render(512, SCALE, true), 'preview/icon-masked.png');
save(await render(180, SCALE, true), 'preview/icon-masked-180.png');
await browser.close();
console.log(`done — source=${SRC} scale=${SCALE} mask_scale=${MASK_SCALE}`);
