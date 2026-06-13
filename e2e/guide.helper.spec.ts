// Design-gate screenshots for the Asset Guide encyclopedia.
//   SHOTS=1 npx playwright test e2e/guide.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function openGuide(page: P, focus?: string): Promise<void> {
  await page.evaluate((f) => window.__ec!.getState().setGuideOpen(true, f), focus);
  await page.waitForTimeout(450);
}

test('asset guide — index + expanded entry, desktop + phone', async ({ page }) => {
  test.setTimeout(120_000);

  // desktop: index (collapsed list)
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await openGuide(page);
  await page.screenshot({ path: 'preview/guide-index-desktop.png' });

  // desktop: expanded on the capacitor bank (the asset the owner cited)
  await page.evaluate(() => window.__ec!.getState().setGuideOpen(false));
  await page.waitForTimeout(150);
  await openGuide(page, 'sub:capbank');
  await page.screenshot({ path: 'preview/guide-capbank-desktop.png' });

  // phone-landscape: index
  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(300);
  await openGuide(page);
  await page.screenshot({ path: 'preview/guide-index-mobile.png' });
});
