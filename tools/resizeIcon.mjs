// Build the square app-icon set from the source in brand/. The source is the
// grid-node GLOBE emblem (glowing orange power-network over a deep-navy world
// globe). The owner asked to "pad it a bit so it sits more centrally in the
// square", so we draw it PADDED-CENTRAL on the globe's deep-navy backdrop
// (PAD below) — which also seats the globe inside the maskable safe-zone, so
// one render serves purpose "any" AND "maskable". Emits a mask-simulated
// preview so the corners can be judged the way a phone actually renders them.
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
    // PADDED-CENTRAL (owner: "pad it a bit so it sits more centrally in the
    // square"): fill the icon with the globe's deep-navy backdrop, then draw
    // the globe centred at PAD scale so it breathes off the edges. The globe
    // then lands inside the maskable safe-zone (inner ~80%), so the same
    // render serves purpose "any" AND "maskable".
    ctx.fillStyle = '#0a0e22';
    ctx.fillRect(0, 0, size, size);
    const PAD = 0.86;
    const d = size * PAD;
    const off = (size - d) / 2;
    ctx.drawImage(img, off, off, d, d);
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
