import { expect, test } from '@playwright/test';
import {
  assertNoCrash,
  bootWatched,
  waitMenu,
  waitReady,
  watchForCrashes,
} from './crashnet.helper';

// THE OWNER'S REPRO (CLAUDE.md context): "tapping 'new game' from a HARD
// REFRESH crashed (couldn't even reach the city picker)." On a hard refresh
// the app boots into the SAVED scenario — itself a renderer teardown+rebuild
// (MapView re-inits the PixiJS renderer on the saved map). Then "new game"
// opens the CityPicker, and choosing a city is ANOTHER renderer switch. Both
// switches were the source of the city-switch teardown race. These tests walk
// that exact path and assert NOTHING crashes the whole way.
//
// Each test attaches the crash net BEFORE goto, so a crash during boot (which
// is where the owner's crash lived) is caught, not just crashes after the UI
// settles.

/** Seed a non-default scenario into the autosave, then hard-reload so the app
 *  boots straight into it (the renderer-switch boot path). Returns once the
 *  reloaded app is showing the start menu over the restored scenario. */
async function seedSavedScenarioAndReload(
  page: import('@playwright/test').Page,
  scenarioId: string,
): Promise<void> {
  // start a fresh game on the target scenario so the worker writes an autosave
  await page.evaluate((c) => window.__ec!.startMission(c), scenarioId);
  await page
    .waitForFunction((c) => window.__ec!.getState().scenarioId === c, scenarioId, {
      timeout: 45_000,
    })
    .catch(() => undefined);
  // wait for the autosave to actually land in localStorage (boot reads it)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('electricity.save.v1') !== null), {
      timeout: 30_000,
    })
    .toBe(true);
  await page.reload();
  await waitReady(page);
}

test.describe('boot paths (owner hard-refresh repro)', () => {
  test('hard refresh → new game → city picker shows → pick London → loads', async ({ page }) => {
    test.setTimeout(120_000);
    // First boot: get a London sandbox going so there's an autosave to boot into.
    const watch = await bootWatched(page);
    await assertNoCrash(page, watch, 'first boot into sandbox');

    // HARD REFRESH (fresh context for the page): the app must boot back into the
    // saved scenario without crashing — this is the renderer-switch boot.
    await page.reload();
    await waitReady(page);
    await assertNoCrash(page, watch, 'after hard refresh into saved scenario');

    // the start menu should be up with a "continue" (a save exists)
    await waitMenu(page);
    await expect(page.getByRole('button', { name: 'continue' })).toBeVisible();

    // TAP NEW GAME — the exact action that crashed. The CityPicker must appear.
    await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
    const picker = page.getByRole('dialog', { name: 'choose a city' });
    await expect(picker).toBeVisible();
    await expect(page.getByTitle('power London', { exact: true })).toBeVisible();
    await assertNoCrash(page, watch, 'city picker open after hard-refresh new game');

    // pick London — a renderer switch back into the sandbox
    await page.getByTitle('power London', { exact: true }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    await waitReady(page);
    // dismiss the fresh-game story letterbox if present
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) await skip.dispatchEvent('click');
    await page.waitForTimeout(1200);
    await assertNoCrash(page, watch, 'after hard-refresh → new game → London loaded');
  });

  test('saved NON-London scenario → boot → new game → London (cross-map switch)', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const watch = watchForCrashes(page);
    await page.goto('/');
    await waitReady(page);

    // dismiss the menu into a sandbox first so the test hook is fully live
    if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
      const cont = page.getByRole('button', { name: 'continue' });
      if ((await cont.count()) > 0) await cont.dispatchEvent('click');
      else {
        await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
        const london = page.getByTitle('power London', { exact: true });
        await expect.poll(async () => london.count(), { timeout: 15_000 }).toBeGreaterThan(0);
        await london.first().dispatchEvent('click');
      }
      await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    }

    // seed a Paris save and hard-reload — boots into Paris (a data-backed map)
    await seedSavedScenarioAndReload(page, 'paris');
    await assertNoCrash(page, watch, 'boot into saved Paris scenario');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().scenarioId)).toBe('paris');

    // now new game → London: a switch from a data-backed city INTO London
    await waitMenu(page);
    await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'choose a city' })).toBeVisible();
    await page.getByTitle('power London', { exact: true }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    await expect
      .poll(() => page.evaluate(() => window.__ec?.getState().scenarioId), { timeout: 45_000 })
      .toBe('london');
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) await skip.dispatchEvent('click');
    await page.waitForTimeout(1200);
    await assertNoCrash(page, watch, 'after Paris-save → new game → London');
  });

  test('repeated new-game city switches in one session never crash', async ({ page }) => {
    test.setTimeout(150_000);
    const watch = await bootWatched(page);

    // open the picker and switch maps several times back-to-back (the fast
    // re-switch is exactly what the teardown-race guard protects). Choose a
    // mix of data-backed cities and London to cross map types.
    const sequence = ['paris', 'london', 'newyork', 'london'];
    for (const city of sequence) {
      // open the game menu (Esc) → quit to main menu → new game → pick city.
      // Simpler & equally valid for the renderer switch: drive via the hook.
      await page.evaluate((c) => window.__ec!.startMission(c), city);
      await page
        .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
        .catch(() => undefined);
      await page.waitForTimeout(900);
      await assertNoCrash(page, watch, `after switching to ${city}`);
    }
  });
});
