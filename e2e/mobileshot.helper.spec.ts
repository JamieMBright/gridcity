// Saves phone-layout screenshots to preview/. Run on demand:
//   SHOTS=1 npx playwright test e2e/mobileshot.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');
test.use({ viewport: { width: 390, height: 844 } });

test('mobile screenshots', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.__ec?.panTo(66, 80);
    window.__ec?.setZoom(0.28);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'preview/mobile-rail.png' });

  await page.getByRole('button', { name: 'open build menu' }).dispatchEvent('click');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/mobile-expanded.png' });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'bill', exact: true }).dispatchEvent('click');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/mobile-bill.png' });
});
