// Build the square app-icon set from the full-bleed source render in
// brand/. The source is already a proper app icon: a transformer + arc +
// skyline emblem on flat navy, edge to edge, no wordmark and no rounded
// corners — the OS/launcher applies its own mask, so we ship FULL-BLEED and
// never bake corners or crop the content. We only downscale to the target
// sizes. Also emits a mask-simulated preview so the corners can be judged
// the way a phone actually renders them.
// Uses the installed Chromium for canvas resampling (no sharp/imagemagick).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'brand/app-icon-source.jpeg';
const srcB64 = readFileSync(SRC).toString('base64');
const mime = SRC.endsWith('.png') ? 'image/png' : 'image/jpeg';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const render = async (size, mask) => {
  return page.evaluate(async ({ b64, mime, size, mask }) => {
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = `data:${mime};base64,` + b64; });
    const c = document.getElementById('c');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);
    if (mask) {
      // simulate the OS superellipse-ish rounded mask for the preview only
      const r = size * 0.22;
      ctx.beginPath();
      ctx.moveTo(r, 0); ctx.arcTo(size, 0, size, size, r); ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r); ctx.arcTo(0, 0, size, 0, r); ctx.closePath();
      ctx.clip();
    }
    // FULL-BLEED: the source square fills the icon square, edge to edge
    ctx.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, { b64: srcB64, mime, size, mask });
};

const save = (dataUrl, out) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(out, buf);
  console.log(out, (buf.length / 1024).toFixed(0) + 'KB');
};

save(await render(512, false), 'public/icon-512.png');
save(await render(192, false), 'public/icon-192.png');
save(await render(180, false), 'public/apple-touch-icon.png');
// previews for the design gate: raw full-bleed + mask-simulated corners
save(await render(512, false), 'preview/icon-fullbleed.png');
save(await render(512, true), 'preview/icon-masked.png');
await browser.close();
