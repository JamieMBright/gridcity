// Design-gate screenshots for the NE map overhaul wave (run on demand):
//   SHOTS=1 npx playwright test e2e/waveNE.helper.spec.ts
// Captures REAL in-game frames (the preview compositor can't draw labels):
//  - NE far: contiguous dominant Tyne/Wear + coast + important-town labels
//  - NE mid + close: varied housing, and NO floating hero/landmark NAME labels
//  - another city (Paris) far + mid: confirms hero labels gone, towns intact
import { test, expect, type Page } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

async function bootCity(page: Page, cityName: string): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 30_000 })
    .toBe(true);
  // open the start menu's New Game → city picker, pick the named city
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const ng = page.getByRole('button', { name: 'new game' });
    if ((await ng.count()) > 0) await ng.dispatchEvent('click');
    const card = page.getByTitle(`power ${cityName}`, { exact: true });
    await expect.poll(async () => card.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await card.first().dispatchEvent('click');
    await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      const rb = page.getByRole('button', { name: 'rebuild it' });
      if ((await rb.count()) > 0) await rb.dispatchEvent('click');
    }
  }
  // pin a clear golden-hour so rivers + labels read consistently
  await page.evaluate(() => window.__ec?.setAtmosphere(17 * 60, { cloud: 0.05, wind: 0.2 }));
}

async function shot(page: Page, x: number, y: number, zoom: number, name: string): Promise<void> {
  await page.evaluate(({ x, y, z }) => {
    window.__ec?.panTo(x, y);
    window.__ec?.setZoom(z);
  }, { x, y, z: zoom });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `preview/${name}.png` });
}

test('NE map overhaul shots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootCity(page, 'North-East England');
  // FAR whole-region: the contiguous dominant Tyne + Wear, the coast, and the
  // important-town labels in the right places (hero NAME labels must be gone)
  await shot(page, 150, 80, 0.16, 'ne-far-ingame');
  await shot(page, 150, 80, 0.2, 'ne-far2-ingame');
  // MID over the Tyne gorge (Newcastle/Gateshead): varied housing, river
  await shot(page, 170, 70, 0.42, 'ne-mid-ingame');
  // CLOSE on the inner terraces: housing variety + NO hero/landmark titles
  await shot(page, 160, 64, 0.95, 'ne-close-ingame');
  await shot(page, 158, 50, 0.95, 'ne-close-gosforth-ingame'); // leafy suburb
  await shot(page, 205, 100, 0.85, 'ne-close-sunderland-ingame'); // Wear mouth
});

test('Paris (other city) shots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await bootCity(page, 'Paris');
  // far + mid: town labels intact, NO floating hero/landmark NAME labels
  await shot(page, 128, 80, 0.16, 'paris-far-ingame');
  await shot(page, 120, 80, 0.5, 'paris-mid-ingame');
});
