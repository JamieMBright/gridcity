import { expect, test } from '@playwright/test';
import { assetCount, boot, clickButton, clickTile, openLand, pause } from './helpers';

test.describe('save & restore', () => {
  test('builds survive a reload via the autosave', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a] = await openLand(page, 1);
    if (!a) return;
    await clickButton(page, 'Gas CCGT');
    await clickTile(page, a);
    await expect.poll(() => assetCount(page)).toBe(1);

    // the worker posts a save after every successful build
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('electricity.save.v1') !== null))
      .toBe(true);

    await page.reload();
    await boot(page);
    await expect.poll(() => assetCount(page)).toBe(1);
  });
});
