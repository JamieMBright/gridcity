// Design-gate screenshots for Wave 16 (tutorial overhaul): the lessons
// page (curriculum + star ratings) and the guided-play spotlight ringing a
// build-palette button mid-lesson, on desktop + phone-landscape. Run on
// demand:
//   SHOTS=1 npx playwright test e2e/w16.helper.spec.ts
import { test, expect } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function openLessons(page: P): Promise<void> {
  await page.evaluate(() => {
    const s = window.__ec?.getState();
    s?.setMenuOpen(true);
    s?.setLessonsOpen(true);
  });
  await page.waitForTimeout(400);
}

async function spotlightStep(page: P): Promise<void> {
  // launch mission 1, then park on the step that highlights the onshore
  // wind button so the spotlight rings it
  await page.evaluate(() => window.__ec?.startMission('m1-first-light'));
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().scenarioId), { timeout: 15_000 })
    .toBe('m1-first-light');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.__ec?.getState();
    s?.setMenuOpen(false);
    s?.setLessonsOpen(false);
    s?.setTutorialStep(1); // "pick ONSHORE WIND" — spot: gen:windOnshore
  });
  await page.waitForTimeout(700);
}

test('w16 lessons page + tutorial spotlight', async ({ page }) => {
  test.setTimeout(180_000);

  // ---- desktop ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await openLessons(page);
  await page.screenshot({ path: 'preview/w16-lessons-desktop.png' });

  await spotlightStep(page);
  await page.screenshot({ path: 'preview/w16-spotlight-desktop.png' });
  // crop the left palette so we can read the ring around the wind button
  await page.screenshot({
    path: 'preview/w16-spotlight-crop.png',
    clip: { x: 0, y: 50, width: 360, height: 420 },
  });

  // ---- phone-landscape ----
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await openLessons(page);
  await page.screenshot({ path: 'preview/w16-lessons-mobile.png' });
});
