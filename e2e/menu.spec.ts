import { expect, test } from '@playwright/test';
import { boot, clickButton, store } from './helpers';

// boot() in helpers dismisses nothing — these tests drive the menu itself,
// so they wait for readiness manually.
async function waitReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
}

test.describe('start menu, tutorial, KPI dashboard', () => {
  test('new game enters play; menu closes', async ({ page }) => {
    await waitReady(page);
    await expect(page.getByText('power a stylized London')).toBeVisible();
    await clickButton(page, 'new game');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
    // a fresh game is seeded: the iDNO estate substations are already in
    await expect
      .poll(() =>
        store<number>(
          page,
          "(s) => s.snapshot.assets.filter((a) => a.kind === 'sub' && a.idno).length",
        ),
      )
      .toBe(3);
    await expect
      .poll(() =>
        store<number>(page, "(s) => s.snapshot.assets.filter((a) => !a.idno).length"),
      )
      .toBe(0); // nothing of the player's yet
  });

  test('tutorial walks its first auto step', async ({ page }) => {
    await waitReady(page);
    await clickButton(page, 'tutorial');
    await expect(page.getByText('TUTORIAL 1/7')).toBeVisible();
    await clickButton(page, 'next');
    await expect(page.getByText('TUTORIAL 2/7')).toBeVisible();
    await expect(page.getByText(/First, generation/)).toBeVisible();
    await clickButton(page, 'skip tutorial');
    await expect.poll(() => store<boolean>(page, '(s) => s.tutorialStep === undefined')).toBe(true);
  });

  test('KPI dashboard opens via button and K, shows targets', async ({ page }) => {
    await boot(page);
    await clickButton(page, 'RIIO');
    await expect(page.getByText(/RIIO-1 · year/)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CML min/cust/yr' })).toBeVisible();
    await page.keyboard.press('k');
    await expect(page.getByText(/RIIO-1 · year/)).not.toBeVisible();
  });

  test('continue resumes an autosaved campaign', async ({ page }) => {
    await waitReady(page);
    await clickButton(page, 'new game');
    // run a moment so the autosave lands, then reload
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('electricity.save.v1') !== null))
      .toBe(true);
    await page.reload();
    await waitReady(page);
    await expect(page.getByRole('button', { name: 'continue' })).toBeVisible();
    await clickButton(page, 'continue');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
  });
});
