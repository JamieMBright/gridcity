// City-variety design-gate screenshot helper — NOT a regression test. Loads
// Berlin, Pune and London (the unchanged control), pans to each city's dense
// urban core, and saves REAL in-game screenshots at mid + close zoom under the
// live dusk grade so the building-variety work can be judged on the image.
// Run on demand:  SHOTS=1 npx playwright test e2e/variety-shots.helper.spec.ts
import { test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'variety screenshot helper — run with SHOTS=1');

// Dense cores found by scanning each city's zone map for the densest
// urbanCore/urban/cbd window; London uses the City/South-Bank core.
const SHOTS: Array<{ city: string; x: number; y: number; mid: number; close: number }> = [
  { city: 'berlin', x: 96, y: 108, mid: 0.42, close: 0.85 },
  { city: 'pune', x: 116, y: 64, mid: 0.42, close: 0.85 },
  { city: 'london', x: 120, y: 78, mid: 0.42, close: 0.85 },
];

const TAG = process.env.VARIETY_TAG ?? 'after';

async function loadCity(page: Page, city: string): Promise<void> {
  await page.evaluate((c) => window.__ec!.startMission(c), city);
  await page
    .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 60_000 })
    .catch(() => undefined);
  // keep the start menu shut so the canvas is clear
  await page.evaluate(() => window.__ec!.getState().setMenuOpen(false));
  await page.waitForTimeout(1800); // let the atlas re-bake + first paint settle
}

test('city-variety building screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  await page.setViewportSize({ width: 1200, height: 760 });

  for (const { city, x, y, mid, close } of SHOTS) {
    await loadCity(page, city);
    await page.evaluate(() => window.__ec!.getState().setMenuOpen(false));
    await page.evaluate(
      ({ xx, yy, z }) => {
        window.__ec?.panTo(xx, yy);
        window.__ec?.setZoom(z);
      },
      { xx: x, yy: y, z: mid },
    );
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `preview/variety/${TAG}-${city}-mid.png` });

    await page.evaluate((z) => window.__ec?.setZoom(z), close);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `preview/variety/${TAG}-${city}-close.png` });
  }
});
