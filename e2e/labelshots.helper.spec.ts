// Not a regression test: captures the zoomed-out town-label layer at both
// desktop and phone-landscape so the Wave-8 label legibility pass can be
// reviewed (preview.ts doesn't draw the label layer). Run on demand:
//   SHOTS=1 npx playwright test e2e/labelshots.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 844, height: 390 },
]) {
  test(`town labels — ${vp.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await boot(page);
    // far country-scale zoom: only LONDON + big towns should read, villages
    // declutter, named places gone — and every shown label must be legible.
    await page.evaluate(() => {
      window.__ec?.panTo(128, 80);
      window.__ec?.setZoom(0.16);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `preview/labels-far-${vp.name}.png` });
    // mid zoom: towns + villages both read.
    await page.evaluate(() => {
      window.__ec?.panTo(120, 80);
      window.__ec?.setZoom(0.22);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `preview/labels-mid-${vp.name}.png` });
  });
}
