// DESIGN GATE for W8 Part-2b item 3 — the per-country REGULATOR FRAMING on the
// RIIO report-card panel (KpiDashboard). Each city's report card must speak its
// own regulatory language: London under Ofgem's RIIO incentive review, Hong
// Kong under a Scheme-of-Control permitted-return review, Paris under the CRE's
// prudent-cost concession review. Shoots the open dashboard for each, desktop +
// phone-landscape, to preview/regframe-*.png for the design review.
//   SHOTS=1 npx playwright test e2e/regulatorframing.helper.spec.ts

import { test, expect, type Page } from '@playwright/test';
import { store } from './helpers';

test.skip(!process.env.SHOTS, 'design-gate screenshot helper — run with SHOTS=1');

/** Boot straight into a scenario via the city picker (title="power <City>"). */
async function bootCity(page: Page, cityTitle: string, scenarioId: string): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  if (!(await page.evaluate(() => window.__ec?.getState().menuOpen))) {
    const ng = page.getByRole('button', { name: 'new game' });
    if ((await ng.count()) > 0) await ng.dispatchEvent('click');
  } else {
    await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
  }
  const card = page.getByTitle(cityTitle, { exact: true });
  await expect.poll(async () => card.count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await card.first().dispatchEvent('click');
  await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot.scenarioId ?? ""'), { timeout: 10_000 })
    .toBe(scenarioId);
}

/** Open the RIIO/report-card dashboard and shoot it desktop + phone-landscape,
 *  asserting the expected regulator scheme text is visible. */
async function shootDashboard(
  page: Page,
  slug: string,
  expectScheme: RegExp,
  expectReview: RegExp,
): Promise<void> {
  // desktop
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.evaluate(() => window.__ec?.getState().setKpiOpen(true));
  await expect(page.getByText(expectScheme).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(expectReview).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `preview/regframe-${slug}-desktop.png` });

  // phone-landscape (the owner's required hold)
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `preview/regframe-${slug}-phone.png` });

  await page.evaluate(() => window.__ec?.getState().setKpiOpen(false));
  await page.setViewportSize({ width: 1100, height: 700 });
}

test('regulator framing — London (Ofgem RIIO)', async ({ page }) => {
  test.setTimeout(120_000);
  await bootCity(page, 'power London', 'london');
  await shootDashboard(page, 'london', /RIIO-\d/, /Ofgem · incentive review/);
});

test('regulator framing — Hong Kong (Scheme of Control)', async ({ page }) => {
  test.setTimeout(120_000);
  await bootCity(page, 'power Hong Kong', 'hongkong');
  await shootDashboard(
    page,
    'hongkong',
    /Scheme of Control-\d/,
    /Scheme of Control · permitted-return review/,
  );
});

test('regulator framing — Paris (CRE cost-of-service)', async ({ page }) => {
  test.setTimeout(120_000);
  await bootCity(page, 'power Paris', 'paris');
  await shootDashboard(page, 'paris', /cost-of-service-\d/, /CRE · prudent-cost review/);
});
