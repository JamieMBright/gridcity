// Design-gate screenshots for the river-glint generalisation (Nile / Mula-Mutha
// / Tyne) + the NE primary-label framing tweak. Not a regression test: drives
// the real cities in the browser and saves PNGs to preview/ so the warm glint
// (and that it follows each river's true course, subtle not garish) can be
// eyeballed at the far + mid zoom, with a London regression shot. Each city is
// its OWN test so a slow boot can't time the whole suite out. Run on demand:
//   GLINTSHOTS=1 npx playwright test e2e/riverglint-shots.helper.spec.ts --workers=1

import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.GLINTSHOTS, 'river-glint screenshot helper — run with GLINTSHOTS=1');

const DESKTOP = { width: 1440, height: 900 };

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

// Cairo — the Nile threads vertically through the dense city. Far view: the
// river reads its course as a warm-lit ribbon; mid: the glint is clearly a
// thin warm sheen down the channel centre, never a bright stripe.
test('cairo: nile glint (far + mid)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'Cairo');
  await view(page, 128, 80, 0.1, 'glint-cairo-far');
  await view(page, 128, 80, 0.28, 'glint-cairo-mid');
});

// Pune — the dendritic Mula-Mutha loops through the plateau city.
test('pune: mula-mutha glint (far + mid)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'Pune');
  await view(page, 128, 85, 0.1, 'glint-pune-far');
  await view(page, 120, 90, 0.28, 'glint-pune-mid');
});

// North-East — the Tyne/Wear cut to the coast; the open North Sea must stay
// flat (no sea glint). Far view also shows the primary 'NORTHEAST' label now
// anchored on Newcastle (the framing tweak), not floating in the countryside.
test('north-east: tyne glint + sea stays flat + label framing (far + mid)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'North-East England');
  await view(page, 160, 70, 0.1, 'glint-ne-far');
  await view(page, 170, 70, 0.28, 'glint-ne-mid');
});

// London regression — its glint traces the RIVER_PTS spline and must be
// unchanged. Far view down the estuary + a mid view through town.
test('london: glint regression (far + mid)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await bootCity(page, 'London');
  await view(page, 128, 88, 0.1, 'glint-london-far');
  await view(page, 120, 88, 0.28, 'glint-london-mid');
});
