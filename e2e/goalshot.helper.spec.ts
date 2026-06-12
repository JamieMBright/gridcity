// Not a regression test: screenshots the HUD bottom bar with the goal
// chip + skip buttons for visual review. Run: SHOTS=1 npx playwright
// test e2e/goalshot.helper.spec.ts
import { test } from '@playwright/test';
import { boot, clickButton } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('goal chip + skip buttons', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'preview/shot-goalchip.png',
    clip: { x: 0, y: 560, width: 1100, height: 140 },
  });
  // after a skip: clock at 18:00, chip unchanged
  await clickButton(page, '⏸');
  await clickButton(page, 'skip to 18:00');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'preview/shot-goalchip-after-skip.png',
    clip: { x: 0, y: 560, width: 1100, height: 140 },
  });
});
