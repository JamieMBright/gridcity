// Design-gate screenshots for the new app icon wired into the start-menu
// hero and the HUD corner wordmark. Run on demand:
//   SHOTS=1 npx playwright test e2e/icon.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('app icon — start menu hero + HUD corner', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  // the start menu is up at boot — capture the hero (new emblem + wordmark)
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'preview/icon-startmenu.png' });
  await page.screenshot({
    path: 'preview/icon-startmenu-crop.png',
    clip: { x: 420, y: 120, width: 440, height: 260 },
  });
  // into the game — capture the HUD corner wordmark (top-left)
  await boot(page);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: 'preview/icon-hud-corner.png',
    clip: { x: 0, y: 18, width: 320, height: 80 },
  });
});
