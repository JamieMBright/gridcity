// Design-gate: place-label subtlety at the opening overview.
//   SHOTS=1 npx playwright test e2e/labels.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('place labels — opening overview', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/labels-open.png' });
  // a touch more zoomed out to be sure LONDON + towns sit at full label band
  await page.evaluate(() => { window.__ec!.panTo(128, 78); window.__ec!.setZoom(0.13); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'preview/labels-wide.png' });
});
