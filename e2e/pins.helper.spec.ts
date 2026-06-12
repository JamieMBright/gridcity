// Temporary screenshot helper: new logotype + contract pins.
// Run: SHOTS=1 npx playwright test e2e/pins.helper.spec.ts
import { expect, test } from '@playwright/test';
import { boot, pause, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('logo + pin shots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/pins-menu.png' });

  await boot(page);
  await pause(page);
  const site = await store<{ x: number; y: number } | undefined>(
    page,
    '(s) => s.snapshot.sites[0]',
  );
  console.log('site', site);
  if (!site) return;
  await page.evaluate((t) => {
    window.__ec?.panTo(t.x, t.y);
    window.__ec?.setZoom(0.6);
  }, site);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'preview/pins-map.png' });

  // click the pin body (it floats above the site tile)
  const pos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
    site,
  );
  await page.mouse.click(pos.x, pos.y - 40);
  await page.waitForTimeout(600);
  const focus = await store<unknown>(page, '(s) => s.inboxFocus');
  console.log('inboxFocus after pin click:', JSON.stringify(focus));
  await page.screenshot({ path: 'preview/pins-focus.png' });
});
