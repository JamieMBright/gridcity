import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const [,, src, outp, sx, sy, sw, sh] = process.argv;
const b64 = readFileSync(src).toString('base64');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
const d = await page.evaluate(async ({ b64, sx, sy, sw, sh }) => {
  const img = new Image(); await new Promise(r => { img.onload = r; img.src='data:image/png;base64,'+b64; });
  const c = document.getElementById('c'); c.width = sw*2.2; c.height = sh*2.2;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw*2.2, sh*2.2);
  return c.toDataURL('image/png');
}, { b64, sx:+sx, sy:+sy, sw:+sw, sh:+sh });
writeFileSync(outp, Buffer.from(d.split(',')[1],'base64'));
await browser.close();
