// WAVE ζ design-gate screenshot helper — NOT a regression test. Loads each of
// the 7 cities that gained bespoke DOMESTIC stock in WAVE ζ (Sydney / Berlin /
// Shanghai / Cape Town / Athens / Pune / North-East England), pans to its dense
// urban core, and saves REAL in-game screenshots at desktop AND phone-landscape
// viewports, at mid + close zoom, under the live dusk grade — so the new stock
// can be judged reading as that place (not London terraces).
// Run on demand:  SHOTS=1 npx playwright test e2e/wavezshots.helper.spec.ts
import { test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'WAVE ζ screenshot helper — run with SHOTS=1');

// dense urbanCore centroids found by scanning each city's zone map.
const SHOTS: Array<{ city: string; x: number; y: number; mid: number; close: number }> = [
  { city: 'sydney', x: 125, y: 85, mid: 0.5, close: 1.0 },
  { city: 'berlin', x: 130, y: 80, mid: 0.5, close: 1.0 },
  { city: 'shanghai', x: 127, y: 80, mid: 0.5, close: 1.0 },
  { city: 'capetown', x: 130, y: 80, mid: 0.5, close: 1.0 },
  { city: 'athens', x: 127, y: 79, mid: 0.5, close: 1.0 },
  { city: 'pune', x: 130, y: 84, mid: 0.5, close: 1.0 },
  { city: 'northeast', x: 137, y: 77, mid: 0.5, close: 1.0 },
];

async function loadCity(page: Page, city: string): Promise<void> {
  await page.evaluate((c) => window.__ec!.startMission(c), city);
  await page
    .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 60_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500); // let the atlas re-bake + first paint settle
}

test('WAVE ζ per-city domestic stock screenshots', async ({ page }) => {
  test.setTimeout(420_000);
  await boot(page);

  for (const { city, x, y, mid, close } of SHOTS) {
    await loadCity(page, city);
    for (const [vp, tag] of [
      [{ width: 1100, height: 700 }, 'desktop'],
      [{ width: 844, height: 390 }, 'phone'], // iPhone 12/13 landscape-ish
    ] as const) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);
      await page.evaluate(
        ({ xx, yy, z }) => {
          window.__ec?.panTo(xx, yy);
          window.__ec?.setZoom(z);
        },
        { xx: x, yy: y, z: mid },
      );
      await page.waitForTimeout(900);
      await page.screenshot({ path: `preview/wavez/ingame-${city}-${tag}-mid.png` });

      await page.evaluate((z) => window.__ec?.setZoom(z), close);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `preview/wavez/ingame-${city}-${tag}-close.png` });
    }
  }
});
