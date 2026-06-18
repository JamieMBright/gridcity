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

  test('C arms the 33 kV cable tool (not directorates); O = company, L = balance', async ({
    page,
  }) => {
    await boot(page);
    // owner bug: C used to open the directorates staff panel — it must arm the
    // 33 kV line/cable build tool now.
    await page.keyboard.press('c');
    await expect.poll(() => store<string>(page, '(s) => s.tool.t')).toBe('line');
    await expect.poll(() => store<number>(page, '(s) => s.tool.level')).toBe(33);
    await expect.poll(() => store<boolean>(page, '(s) => s.directoratesOpen')).toBe(false);
    // back to inspect so the next presses aren't swallowed by a pinned tool
    await page.keyboard.press('Escape');
    // the network business moved to O
    await page.keyboard.press('o');
    await expect.poll(() => store<boolean>(page, '(s) => s.directoratesOpen')).toBe(true);
    await page.keyboard.press('Escape'); // universal close shuts the panel
    await expect.poll(() => store<boolean>(page, '(s) => s.directoratesOpen')).toBe(false);
    // grid balance moved off B (now demolish) to L
    await page.keyboard.press('l');
    await expect.poll(() => store<boolean>(page, '(s) => s.balanceOpen')).toBe(true);
  });
});
