import { expect, test } from '@playwright/test';
import { boot, clickButton, clickTile, openLand, pause, store } from './helpers';

test.describe('field fleet panel', () => {
  test('van count steppers pay for more or fewer crews', async ({ page }) => {
    await boot(page);
    const start = await store<number>(page, '(s) => s.snapshot.fleet.fleetSize');
    await clickButton(page, '+', true);
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.fleet.fleetSize'))
      .toBe(start + 1);
    await clickButton(page, '−', true);
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.fleet.fleetSize'))
      .toBe(start);
    // the 'field fleet' bill row lives in the collapsible breakdown (collapsed
    // by default since the #92 HUD redesign) — open it before asserting the row
    await page.getByRole('button', { name: 'show bill breakdown' }).first().dispatchEvent('click');
    await expect(page.getByText('field fleet', { exact: true })).toBeVisible(); // bill row
  });

  test('vegetation policy buttons switch the programme', async ({ page }) => {
    await boot(page);
    for (const [name, idx] of [
      ['proactive', 2],
      ['reactive', 1],
      ['none', 0],
    ] as const) {
      await clickButton(page, name, true);
      await expect
        .poll(() => store<number>(page, '(s) => s.snapshot.fleet.vegPolicy'))
        .toBe(idx);
    }
  });

  test('building a depot puts the vans on the road', async ({ page }) => {
    await boot(page);
    await pause(page);
    await expect(page.getByText('build a depot to put crews on the road')).toBeVisible();
    const [a] = await openLand(page, 1);
    if (!a) return;
    await clickButton(page, 'Field depot');
    await clickTile(page, a);
    // vans muster on the next running tick
    await clickButton(page, '▶', true);
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.fleet.vans.length'))
      .toBeGreaterThan(0);
    await expect(page.getByText(/free$/)).toBeVisible();
  });
});
