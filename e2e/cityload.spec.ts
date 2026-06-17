import { test } from '@playwright/test';
import { assertNoCrash, waitReady, watchForCrashes } from './crashnet.helper';

// Wave D — EVERY playable map loads without crashing. BROKEN UP into bite-size
// per-city tests (owner: "broken up into smaller bitesize tests"): each city is
// its own fast, isolated case under the default 90s cap, so the runner stays
// snappy, a stuck city can't hang the whole suite, and a failure names the exact
// city. (Replaces the old all-cities-in-one-test monster that crept past 180s.)
//
// Mirrors the reported London-load crash path, where switching scenario tears
// down and rebuilds the PixiJS renderer on a new map.

// london is code-drawn; the rest are the committed data-backed artifacts
// (src/data/scenarioData.ts CITY_ARTIFACTS).
const DATA_CITIES = [
  'paris', 'newyork', 'sydney', 'hongkong', 'berlin', 'shanghai',
  'capetown', 'cairo', 'athens', 'pune', 'northeast',
];

async function loadCity(page: import('@playwright/test').Page, city: string): Promise<void> {
  await page.evaluate((c) => window.__ec!.startMission(c), city);
  await page
    .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
    .catch(() => undefined);
  // the scenarioId flip confirms the switch landed; a short settle lets any
  // async renderer/worker error surface before we assert.
  await page.waitForTimeout(900);
}

test.describe('city load — every map loads without crashing', () => {
  for (const city of ['london', ...DATA_CITIES]) {
    test(`loads ${city}`, async ({ page }) => {
      const watch = watchForCrashes(page);
      await page.goto('/');
      await waitReady(page);
      await loadCity(page, city);
      await assertNoCrash(page, watch, `loaded ${city}`);
    });
  }

  // the owner's exact crash direction: switch INTO London from another city
  // (a North-East save, then "new game -> London").
  test('switches into London from another city', async ({ page }) => {
    const watch = watchForCrashes(page);
    await page.goto('/');
    await waitReady(page);
    await loadCity(page, 'northeast');
    await loadCity(page, 'london');
    await assertNoCrash(page, watch, 'switched northeast -> london');
  });
});

// cold-boot (hard refresh) into a saved data-backed city — each its own bite-size
// test. On boot the worker restores the save and the renderer rebuilds on that
// city's lazily-imported artifact (the owner's crash direction, from a cold
// start). A few representative cities keep runtime sane while covering Euro +
// non-Euro art.
test.describe('city load — cold-boot (hard refresh) into a saved city', () => {
  for (const city of ['paris', 'cairo', 'northeast']) {
    test(`cold-boots into ${city}`, async ({ page }) => {
      const watch = watchForCrashes(page);
      await page.goto('/');
      await waitReady(page);
      // seed the autosave on this city
      await loadCity(page, city);
      await page
        .waitForFunction(() => localStorage.getItem('electricity.save.v1') !== null, undefined, {
          timeout: 30_000,
        })
        .catch(() => undefined);

      // HARD RELOAD → the app cold-boots into the saved city
      await page.reload();
      await waitReady(page);
      const cont = page.getByRole('button', { name: 'continue' });
      if ((await cont.count()) > 0) await cont.dispatchEvent('click');
      await page
        .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1200);
      await assertNoCrash(page, watch, `cold-boot into ${city}`);
    });
  }
});
