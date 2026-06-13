// Not a regression test: drives the directorates panel + KPI safety rows
// and saves screenshots to preview/ for review. Run on demand:
//   SHOTS=1 npx playwright test e2e/orgshots.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

async function fundOrg(page: import('@playwright/test').Page): Promise<void> {
  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  // a thoughtfully-funded org so the engagement scores read well
  await cmd({ type: 'setPay', level: 5 });
  await cmd({ type: 'setSafetyProgramme', level: 5 });
  await cmd({ type: 'setDirectorate', directorate: 'operations', level: 3 });
  await cmd({ type: 'setDirectorate', directorate: 'asset', level: 3 });
  await cmd({ type: 'setDirectorate', directorate: 'connections', level: 2 });
}

test('directorates panel + KPI safety rows', async ({ page }) => {
  test.setTimeout(120_000);

  for (const vp of [
    { w: 1280, h: 800, tag: 'desktop' },
    { w: 844, h: 390, tag: 'mobile' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await boot(page);
    await fundOrg(page);
    await page.waitForTimeout(400);

    // the network-business panel
    await page.evaluate(() => window.__ec?.getState().setDirectoratesOpen(true));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `preview/org-directorates-${vp.tag}.png` });
    await page.evaluate(() => window.__ec?.getState().setDirectoratesOpen(false));

    // the KPI dashboard with the LTI/VSI + engagement rows
    await page.evaluate(() => window.__ec?.getState().setKpiOpen(true));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `preview/org-kpis-${vp.tag}.png` });
    await page.evaluate(() => window.__ec?.getState().setKpiOpen(false));
  }
});
