// The early-game goal ladder chip and the HUD time-skip controls.

import { expect, test } from '@playwright/test';
import { boot, clickButton, pause, store } from './helpers';

test.describe('goal ladder', () => {
  test('the chip shows the first goal on a new game; clicking dismisses it', async ({
    page,
  }) => {
    await boot(page);
    // a fresh game serves nobody yet: the ladder sits on rung 1
    const chip = page.getByRole('button', { name: /goal 1\/12/ });
    await expect(chip).toBeVisible();

    await chip.dispatchEvent('click');
    await expect
      .poll(() => store<boolean>(page, '(s) => s.snapshot.goal === undefined'))
      .toBe(true);
    await expect(page.getByRole('button', { name: /goal 1\/12/ })).toHaveCount(0);
  });
});

test.describe('time skip', () => {
  test('skip-to-18:00 lands the clock on the evening peak', async ({ page }) => {
    await boot(page);
    await pause(page);

    await clickButton(page, 'skip to 18:00');
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.simTimeMin % 1440'), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(1080 - 15);
    const minOfDay = await store<number>(page, '(s) => s.snapshot.simTimeMin % 1440');
    expect(minOfDay).toBeLessThanOrEqual(1080 + 15);

    // paused before the skip → still paused after it
    expect(await store<number>(page, '(s) => s.snapshot.speed')).toBe(0);
  });
});
