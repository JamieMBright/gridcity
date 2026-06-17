// Design-gate screenshots for the 2026-06-17 playtest fixes. Not a regression
// test: drives real cities in the browser and saves PNGs to preview/ so the
// four fixes can be eyeballed. Run on demand:
//   PLAYSHOTS=1 npx playwright test e2e/playtest-shots.helper.spec.ts
//
//  (1) region/town labels render for non-London cities (North-East: Newcastle…)
//  (2) hero/landmark NAME labels appear zoomed IN, hidden zoomed OUT
//  (3) transport (rail/road) no longer draws off the map edge (Pune + Cairo)
//  (4) North-East minor water dialled back (far view water:land balance)

import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.PLAYSHOTS, 'playtest screenshot helper — run with PLAYSHOTS=1');

/** Boot the app and start a fresh game on a specific city via the picker. */
async function bootCity(page: Page, cityName: string): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  // ensure the menu is open (fresh boot opens it; a continue-save may not)
  if (!(await page.evaluate(() => window.__ec?.getState().menuOpen))) {
    await page.reload();
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);
  }
  await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
  const card = page.getByTitle(`power ${cityName}`, { exact: true });
  await expect.poll(async () => card.count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await card.first().dispatchEvent('click');
  await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
  // dismiss the opening story letterbox if present (it swallows the canvas)
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
  // let the atlas + map settle
  await page.waitForTimeout(2500);
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `preview/${name}.png` });
}

const DESKTOP = { width: 1440, height: 900 };
const PHONE_LS = { width: 844, height: 390 }; // iPhone-ish, landscape

test('playtest fix screenshots', async ({ page }) => {
  test.setTimeout(420_000);

  // ============ NORTH-EAST (bugs 1 + 4, + 2) — DESKTOP ============
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'North-East England');

  // far whole-region overview: town labels (Newcastle/Gateshead/Sunderland…)
  // visible, hero names HIDDEN, water:land balanced.
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.12);
  });
  await shoot(page, 'ne-far-desktop'); // (1) towns + (4) water + (2) no hero names far

  // mid zoom over Newcastle/Gateshead
  await page.evaluate(() => {
    window.__ec?.panTo(165, 70);
    window.__ec?.setZoom(0.26);
  });
  await shoot(page, 'ne-mid-newcastle');

  // close zoom into Newcastle centre: hero NAMES should now be visible
  await page.evaluate(() => {
    window.__ec?.panTo(160, 64);
    window.__ec?.setZoom(0.5);
  });
  await shoot(page, 'ne-close-heronames'); // (2) hero names visible zoomed IN

  // far view again on phone-landscape (labels legible on a phone)
  await page.setViewportSize(PHONE_LS);
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.13);
  });
  await shoot(page, 'ne-far-phone');

  // ============ PUNE (bug 3 transport off-edge) ============
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'Pune');
  // far view: whole map, look for ribbons spilling past the diamond
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.1);
  });
  await shoot(page, 'pune-far-transport'); // (3)
  // a corner where Pune previously shot a lane far off the right edge (x~255)
  await page.evaluate(() => {
    window.__ec?.panTo(238, 78);
    window.__ec?.setZoom(0.3);
  });
  await shoot(page, 'pune-edge-right');

  // ============ CAIRO (bug 3 — worst off-edge offender, top edge) ============
  await bootCity(page, 'Cairo');
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.1);
  });
  await shoot(page, 'cairo-far-transport'); // (3)
  await page.evaluate(() => {
    window.__ec?.panTo(130, 8);
    window.__ec?.setZoom(0.3);
  });
  await shoot(page, 'cairo-edge-top');

  // ============ LONDON (regression: bugs 2 & 3 touch its render path) ======
  await bootCity(page, 'London');
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.12);
  });
  await shoot(page, 'london-far-regression'); // towns still show, no off-edge
  await page.evaluate(() => {
    window.__ec?.panTo(128, 78);
    window.__ec?.setZoom(0.5);
  });
  await shoot(page, 'london-close-heronames'); // hero names visible zoomed in
});
