// Accurate iPhone Pro Max LANDSCAPE repro for the mobile-layout audit.
// Uses the 16 Pro Max landscape CSS size and SIMULATES the iOS safe-area
// insets (Chromium reports 0 for env(safe-area-inset-*), so we override the
// --sai-* vars the chrome reads). Captures the idle HUD and a build-armed
// state (BUILDING label + rail) so the overlaps can be judged for real.
//   SHOTS=1 npx playwright test e2e/mobileaudit.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

// 16 Pro Max landscape ≈ 956 x 440 CSS px; landscape safe areas: a notch
// side (~59px) on each end the way Safari reserves them, ~21px home bar.
const VP = { width: 956, height: 440 };

// hasTouch ⇒ pointer:coarse ⇒ the app's mobile chrome (matching the phone)
test.use({ viewport: VP, hasTouch: true });

async function simulateSafeArea(page: P): Promise<void> {
  await page.evaluate(() => {
    const r = document.documentElement.style;
    r.setProperty('--sai-l', '59px');
    r.setProperty('--sai-r', '59px');
    r.setProperty('--sai-b', '21px');
    r.setProperty('--sai-t', '0px');
  });
}

test('mobile landscape audit — Pro Max + safe area', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(VP);
  await boot(page);
  await simulateSafeArea(page);
  await page.waitForTimeout(500);
  // idle HUD
  await page.screenshot({ path: 'preview/mobaudit-idle.png' });

  // arm a build tool (capacitor bank) to surface the BUILDING label + rail
  await page.evaluate(() => window.__ec!.getState().setTool({ t: 'sub', sub: 'capbank' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/mobaudit-building.png' });

  // open the inbox sheet (right side) to check the chip column + sheet
  await page.evaluate(() => window.__ec!.getState().setTool({ t: 'inspect' }));
  await page.waitForTimeout(200);
});
