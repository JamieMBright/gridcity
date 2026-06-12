// On-demand menu screenshot: SHOTS=1 npx playwright test e2e/menushot.helper.spec.ts
import { test } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper');

test('menu screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ec?.getState().snapshot !== undefined, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'preview/menu-restyle.png' });
});
