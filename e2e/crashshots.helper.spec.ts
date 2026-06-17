import { test } from '@playwright/test';
import { boot } from './helpers';

// Design-gate screenshots of the crash/fallback screen at desktop AND
// phone-landscape, default + details-expanded. Run on demand:
//   SHOTS=1 playwright test e2e/crashshots.helper.spec.ts --config=pw.tmp.config.ts
// (skipped otherwise so it never slows the normal gate).

const ON = process.env.SHOTS === '1';

test.describe('crash screen design shots', () => {
  test.skip(!ON, 'set SHOTS=1 to capture');

  test('desktop fallback', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await boot(page);
    await page.evaluate(() => window.__ec?.crashRender());
    await page.getByTestId('error-boundary').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/crash-desktop.png' });
    await page.getByRole('button', { name: 'Show details' }).click();
    await page.getByTestId('error-stack').waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'preview/crash-desktop-details.png' });
  });

  test('phone-landscape fallback', async ({ page }) => {
    // iPhone-ish landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await boot(page);
    await page.evaluate(() => window.__ec?.crashRender());
    await page.getByTestId('error-boundary').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/crash-phone-landscape.png' });
    await page.getByRole('button', { name: 'Show details' }).click();
    await page.getByTestId('error-stack').waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'preview/crash-phone-landscape-details.png' });
  });
});
