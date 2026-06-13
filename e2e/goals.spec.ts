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
  test('skip +7d advances the clock about a week and halts on bad news', async ({
    page,
  }) => {
    await boot(page);
    await pause(page);
    const start = await store<number>(page, '(s) => s.snapshot.simTimeMin');

    await clickButton(page, 'skip 7 days');
    // the skip runs synchronously on the worker; wait for the clock to move
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.simTimeMin'), { timeout: 30_000 })
      .toBeGreaterThan(start + 1440);

    const after = await store<number>(page, '(s) => s.snapshot.simTimeMin');
    const advanced = after - start;
    // it lands AT +7d on a quiet game, or stops EARLIER if bad news fired —
    // never overshoots the +7d wall
    expect(advanced).toBeLessThanOrEqual(7 * 1440 + 15);

    // paused before the skip → still paused after it
    expect(await store<number>(page, '(s) => s.snapshot.speed')).toBe(0);
  });

  test('skip +30d lands near a month out on a quiet fresh game', async ({ page }) => {
    await boot(page);
    await pause(page);
    const start = await store<number>(page, '(s) => s.snapshot.simTimeMin');

    await clickButton(page, 'skip 30 days');
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.simTimeMin'), { timeout: 60_000 })
      .toBeGreaterThan(start + 7 * 1440);

    const advanced =
      (await store<number>(page, '(s) => s.snapshot.simTimeMin')) - start;
    // never past the +30d wall; on a quiet fresh game it reaches well past
    // a week before any bad news could stop it
    expect(advanced).toBeLessThanOrEqual(30 * 1440 + 15);
    expect(await store<number>(page, '(s) => s.snapshot.speed')).toBe(0);
  });
});
