// Design-gate screenshots for the 2026-06-17 playtest fixes. Not a regression
// test: drives real cities in the browser and saves PNGs to preview/ so the
// four fixes can be eyeballed. Each city is its OWN test so a slow sandbox boot
// can't time the whole suite out. Run on demand:
//   PLAYSHOTS=1 npx playwright test e2e/playtest-shots.helper.spec.ts --workers=1
//
//  (1) region/town labels render for non-London cities (North-East: Newcastle…)
//  (2) hero/landmark NAME labels appear zoomed IN, hidden zoomed OUT
//  (3) transport (rail/road) no longer draws off the map edge (Pune + Cairo)
//  (4) North-East minor water dialled back (far view water:land balance)

import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.PLAYSHOTS, 'playtest screenshot helper — run with PLAYSHOTS=1');

const DESKTOP = { width: 1440, height: 900 };
const PHONE_LS = { width: 844, height: 390 };

async function bootCity(page: Page, cityName: string): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
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
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
  await page.waitForTimeout(2500);
}

async function view(page: Page, x: number, y: number, zoom: number, name: string): Promise<void> {
  await page.evaluate(
    ([xx, yy, zz]) => {
      window.__ec?.panTo(xx as number, yy as number);
      window.__ec?.setZoom(zz as number);
    },
    [x, y, zoom],
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `preview/${name}.png` });
}

// (1) town labels + (4) water + (2) hero-name zoom inversion — all on the NE map
test('north-east: town labels, water balance, hero-name zoom', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'North-East England');
  // far whole-region overview: town/region names (Newcastle, Gateshead…) show;
  // hero names hidden; water:land reads balanced.
  await view(page, 160, 70, 0.1, 'ne-far-desktop');
  // mid: town names fading, hero names rising
  await view(page, 160, 70, 0.24, 'ne-mid');
  // close: hero NAMES visible, town/region names gone (the inversion)
  await view(page, 160, 64, 0.45, 'ne-close-heronames');
  // phone-landscape far view (labels legible on a phone)
  await page.setViewportSize(PHONE_LS);
  await view(page, 160, 70, 0.12, 'ne-far-phone');
});

// (3) transport clip — Pune (the reported case) + Cairo (worst off-edge offender)
test('pune + cairo: transport clipped to map edge', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'Pune');
  await view(page, 128, 80, 0.1, 'pune-far-transport');
  await view(page, 238, 78, 0.3, 'pune-edge-right'); // where a lane shot to x~392
});

test('cairo: transport clipped to map edge', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'Cairo');
  await view(page, 128, 80, 0.1, 'cairo-far-transport');
  await view(page, 130, 8, 0.3, 'cairo-edge-top'); // where a lane shot to y~-191
});

// London regression: bugs 2 & 3 touch its render path — towns still show far,
// hero names show close, no off-edge transport.
test('london regression: labels + transport unchanged', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'London');
  await view(page, 128, 80, 0.12, 'london-far-regression');
  await view(page, 128, 78, 0.45, 'london-close-heronames');
});
