import { expect, test } from '@playwright/test';
import { boot, clickButton, openLand, pause, store } from './helpers';

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
    // New Game now opens the city picker — choose London (the default sandbox)
    const london = page.getByTitle('power London', { exact: true });
    await expect.poll(async () => london.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await london.first().dispatchEvent('click');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
    // a fresh game keeps the iDNO estate substations (customer demand
    // awaiting connection) but NO generation — the grid vanished, so the
    // map starts blank of any pre-existing plant
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
        store<number>(
          page,
          "(s) => s.snapshot.assets.filter((a) => a.kind === 'gen').length",
        ),
      )
      .toBe(0); // nothing pre-existing — the blank grid (the Vanishing)
    await expect
      .poll(() =>
        store<number>(
          page,
          "(s) => s.snapshot.assets.filter((a) => !a.idno && !a.developer).length",
        ),
      )
      .toBe(0); // nothing of the player's yet
  });

  test('tutorials → lessons page → First Light launches mission 1', async ({ page }) => {
    await waitReady(page);
    // "tutorials" opens the LESSONS PAGE (the campaign IS the tutorial)
    await clickButton(page, 'tutorials');
    await expect.poll(() => store<boolean>(page, '(s) => s.lessonsOpen')).toBe(true);
    // launch the first lesson — the menu closes straight into First Light
    await clickButton(page, /1\. First Light/);
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
    await expect
      .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId'), { timeout: 20_000 })
      .toBe('m1-first-light');
    await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();
    // the mission's step strip drives the lesson — step 0 is up, and there
    // is NO "skip tutorial" escape (back/next nav only)
    await expect.poll(() => store<number | undefined>(page, '(s) => s.tutorialStep')).toBe(0);
    await expect(page.getByRole('button', { name: 'skip tutorial' })).toHaveCount(0);
  });

  test('sandbox new game starts clean — no auto tutorial strip', async ({ page }) => {
    await waitReady(page);
    await clickButton(page, 'new game');
    // New Game now opens the city picker — choose London (the default sandbox)
    const london = page.getByTitle('power London', { exact: true });
    await expect.poll(async () => london.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await london.first().dispatchEvent('click');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
    // dismiss the story letterbox if present
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      const rebuild = page.getByRole('button', { name: 'rebuild it' });
      if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
    }
    // no step strip, no mission
    expect(await store<string>(page, '(s) => s.scenarioId')).toBe('london');
    await expect(page.getByText(/MISSION ·/)).toHaveCount(0);
  });

  test('KPI dashboard opens via button and K, shows targets', async ({ page }) => {
    await boot(page);
    await clickButton(page, 'RIIO');
    await expect(page.getByText(/RIIO-1 · year/)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CML min/cust/yr' })).toBeVisible();
    await page.keyboard.press('k');
    await expect(page.getByText(/RIIO-1 · year/)).not.toBeVisible();
  });

  test('named save slot: save, mutate, load restores (#34)', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await store<number>(page, '(s) => s.snapshot.assets.length');

    // open the saves panel and save the current game into a named slot
    await page.getByRole('button', { name: 'save slots' }).first().dispatchEvent('click');
    await expect(page.getByText('SAVE SLOTS')).toBeVisible();
    await page.getByPlaceholder(/day/).fill('e2e branch');
    await page.getByRole('button', { name: 'save to a new slot' }).dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('electricity.slots.v1') !== null)).toBe(true);
    await expect(page.getByText(/saved/)).toBeVisible();

    // close the panel, mutate the game (build a sub)
    await page.keyboard.press('Escape');
    const [a] = await openLand(page, 1);
    if (!a) return;
    await page.evaluate(
      (t) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
      a,
    );
    await expect.poll(() => store<number>(page, '(s) => s.snapshot.assets.length')).toBe(base + 1);

    // re-open saves and load the slot — the build is gone (restored to base)
    await page.getByRole('button', { name: 'save slots' }).first().dispatchEvent('click');
    await page.getByRole('button', { name: /load e2e branch/ }).dispatchEvent('click');
    await expect.poll(() => store<number>(page, '(s) => s.snapshot.assets.length'), { timeout: 20_000 }).toBe(base);
  });

  test('continue resumes an autosaved campaign', async ({ page }) => {
    await waitReady(page);
    await clickButton(page, 'new game');
    // New Game now opens the city picker — choose London to start the sandbox
    const londonCard = page.getByTitle('power London', { exact: true });
    await expect.poll(async () => londonCard.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await londonCard.first().dispatchEvent('click');
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
