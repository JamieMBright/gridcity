// Touch tap-to-inspect (owner, 2026-06-18: "inspect doesn't work on tap on
// phone, only on tap+slide"). A clean tap must surface the tile/hero info card
// AND keep it (a touch lift fires pointerleave, which must not wipe it).
import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 40_000 })
    .toBe(true);
}

test.describe('mobile tap-to-inspect', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('a tap sets + persists the hovered tile', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await ready(page);
    if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
      const ng = page.getByRole('button', { name: /new game/i });
      if (await ng.count()) {
        await ng.first().dispatchEvent('click');
        const lon = page.getByTitle('power London', { exact: true });
        if (await lon.count()) await lon.first().dispatchEvent('click');
      }
      await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
      const skip = page.getByRole('button', { name: 'skip', exact: true });
      if (await skip.count()) {
        await skip.dispatchEvent('click');
        const rb = page.getByRole('button', { name: 'rebuild it' });
        if (await rb.count()) await rb.dispatchEvent('click');
      }
    }
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__ec?.getState().setHoveredTile(undefined as never));
    await page.touchscreen.tap(422, 165); // map area (below the stat bar, above the bottom bar)
    await page.waitForTimeout(250);
    const afterTap = await page.evaluate(() => window.__ec?.getState().hoveredTile);
    await page.waitForTimeout(700);
    const persists = await page.evaluate(() => window.__ec?.getState().hoveredTile);
    expect(afterTap, 'a tap must set the hovered tile (touch has no hover)').toBeTruthy();
    expect(persists, 'the tile/hero card must persist after the touch lift').toBeTruthy();
  });
});
