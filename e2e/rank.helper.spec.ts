// Design-gate screenshots for the operator rank ladder: the start-menu rank
// badge + guest sign-in nudge, the PROMOTED rank-up card (guest variant),
// desktop + phone-landscape.
//   SHOTS=1 npx playwright test e2e/rank.helper.spec.ts
import { expect, test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

const TIER2 = { index: 2, title: 'Network Engineer', blurb: 'A primary substation is yours to run.', minPoints: 340 };

async function ready(page: P): Promise<void> {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 30_000 })
    .toBe(true);
  await page.waitForTimeout(500);
}

test('rank — start-menu badge + nudge, and the rank-up card', async ({ page }) => {
  test.setTimeout(120_000);

  // desktop: start menu (guest) — rank badge + nudge live in NETWORK ACCESS
  await page.setViewportSize({ width: 1280, height: 920 });
  await ready(page);
  await page.screenshot({ path: 'preview/rank-menu.png' });

  // PROMOTED card (guest variant) — dismiss the menu, then trigger a rank-up
  await boot(page);
  await page.evaluate((tier) => {
    const s = window.__ec!.getState();
    s.setLoginNudge(true);
    s.setRankUp(tier as never);
  }, TIER2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/rank-up.png' });

  // phone-landscape: start-menu badge
  await page.setViewportSize({ width: 956, height: 440 });
  await page.reload();
  await ready(page);
  await page.screenshot({ path: 'preview/rank-menu-mobile.png' });
});
