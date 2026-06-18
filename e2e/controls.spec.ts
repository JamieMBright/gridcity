import { expect, test } from '@playwright/test';
import { boot, clickButton, store } from './helpers';

test.describe('time & view controls', () => {
  test('speed buttons set the sim speed', async ({ page }) => {
    await boot(page);
    const speeds: Array<[string, number]> = [
      ['⏸', 0],
      ['▶▶▶', 16],
      ['▶▶', 4],
      ['▶', 1],
    ];
    for (const [label, speed] of speeds) {
      await clickButton(page, label, true);
      await expect.poll(() => store<number>(page, '(s) => s.snapshot.speed')).toBe(speed);
    }
  });

  test('P toggles pause (was Space; Space now hides the HUD)', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('p');
    await expect.poll(() => store<number>(page, '(s) => s.snapshot.speed')).toBe(0);
    await page.keyboard.press('p');
    await expect.poll(() => store<number>(page, '(s) => s.snapshot.speed')).toBe(1);
  });

  test('Space toggles the whole HUD hidden/shown', async ({ page }) => {
    await boot(page);
    await expect.poll(() => store<boolean>(page, '(s) => s.hudHidden')).toBe(false);
    await page.keyboard.press(' ');
    await expect.poll(() => store<boolean>(page, '(s) => s.hudHidden')).toBe(true);
    // the reveal affordance is present while hidden, and brings the HUD back
    await expect(page.getByRole('button', { name: 'show HUD' })).toBeVisible();
    await page.keyboard.press(' ');
    await expect.poll(() => store<boolean>(page, '(s) => s.hudHidden')).toBe(false);
  });

  test('grid view toggles by button and by key', async ({ page }) => {
    await boot(page);
    await clickButton(page, /grid view/);
    await expect.poll(() => store<boolean>(page, '(s) => s.gridView')).toBe(true);
    await page.keyboard.press('g');
    await expect.poll(() => store<boolean>(page, '(s) => s.gridView')).toBe(false);
  });
});
