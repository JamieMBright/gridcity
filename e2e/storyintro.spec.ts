// Per-city start-of-game message (owner, 2026-06-18): it must appear for EVERY
// city (not just London), capture that city's real DNO/operator, and FIT a
// phone-landscape viewport with no scroll.
import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 40_000 })
    .toBe(true);
}

test.describe('per-city start-of-game letter', () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
  test('Paris letterboxes with its operator, fits no-scroll', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await ready(page);
    await page.evaluate(() => {
      const r = document.documentElement.style;
      r.setProperty('--sai-l', '44px'); r.setProperty('--sai-r', '44px');
      r.setProperty('--sai-b', '20px'); r.setProperty('--sai-t', '0px');
    });
    await page.getByRole('button', { name: /new game/i }).first().dispatchEvent('click');
    const card = page.getByTitle('power Paris', { exact: true });
    await expect.poll(async () => card.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await card.first().dispatchEvent('click');
    await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    // the letter appears (non-London city now letterboxes)
    const letter = page.locator('[data-story-intro]');
    await expect(letter).toBeVisible();
    // beat 1 fits
    const ov1 = await letter.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(ov1, 'opening beat fits phone-landscape').toBeLessThanOrEqual(1);
    // advance to the mandate beat → it names the real operator
    await page.getByRole('button', { name: 'continue' }).first().dispatchEvent('click');
    await page.waitForTimeout(400);
    await expect(letter.getByText(/Enedis/)).toBeVisible();
    const ov2 = await letter.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(ov2, 'mandate beat fits phone-landscape').toBeLessThanOrEqual(1);
  });
});
