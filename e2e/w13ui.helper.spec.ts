// Design-gate captures for the W13 UI/story lane:
//   1. the trimmed 2-beat opening (both beats, incl. the 3-month freeze line)
//   2. the "Building: …" label chip (armed tool, desktop + phone-landscape)
//   3. the always-reachable build-palette expand affordance (phone-landscape)
// Run on demand:  SHOTS=1 npx playwright test e2e/w13ui.helper.spec.ts
import { test, expect } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

// 1. opening beats — boot a FRESH game so the letterbox shows, capture both
for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 844, height: 390 },
]) {
  test(`opening beats — ${vp.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);
    // force a fresh campaign so the story letterbox opens
    if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
      // New Game opens the city picker now — choose London
      const lon = page.getByTitle('power London', { exact: true });
      await expect.poll(async () => lon.count(), { timeout: 15_000 }).toBeGreaterThan(0);
      await lon.first().dispatchEvent('click');
      await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    }
    // beat 1
    await page.waitForTimeout(600);
    await page.screenshot({ path: `preview/w13ui-opening1-${vp.name}.png` });
    // advance to beat 2 (the mandate + 3-month freeze)
    await page.getByRole('button', { name: 'continue' }).dispatchEvent('click');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `preview/w13ui-opening2-${vp.name}.png` });
  });
}

// 2 + 3. armed build-label chip and the expand affordance
test('build-label chip + expand — desktop', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  // arm a grid substation → the chip should read "Building: Grid substation"
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'sub', sub: 'grid' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/w13ui-chip-desktop.png' });
  // arm a 132 kV line → "Placing: 132 kV line"
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'line', level: 132, build: 'overhead' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/w13ui-chip-line-desktop.png' });
});

test.describe('mobile build chrome', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
  test('build-label chip + expand — mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  // arm a grid substation
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'sub', sub: 'grid' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/w13ui-chip-mobile.png' });
  // closed-state: the pinned » expand tab must be visible beside the rail
  await page.screenshot({
    path: 'preview/w13ui-expand-tab-mobile.png',
    clip: { x: 0, y: 30, width: 160, height: 200 },
  });
  // open the full palette via the pinned » expand toggle
  await page.getByRole('button', { name: 'open build menu' }).dispatchEvent('click');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/w13ui-expand-mobile.png' });
  });
});
