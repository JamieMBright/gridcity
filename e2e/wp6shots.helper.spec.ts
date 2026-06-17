// WP6 design-gate screenshot helper — NOT a regression test. Loads each city
// with bespoke building character (New York / Hong Kong / Cairo), pans to its
// dense urban core, and saves REAL in-game screenshots at desktop AND
// phone-landscape viewports, at mid + close zoom, under the live dusk grade.
// Run on demand:  SHOTS=1 npx playwright test e2e/wp6shots.helper.spec.ts
import { test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'WP6 screenshot helper — run with SHOTS=1');

// dense core coords found by scanning each city's zone map (urbanCore/cbd).
const SHOTS: Array<{ city: string; x: number; y: number; mid: number; close: number }> = [
  { city: 'newyork', x: 112, y: 80, mid: 0.5, close: 1.0 },
  { city: 'hongkong', x: 150, y: 84, mid: 0.5, close: 1.0 },
  { city: 'cairo', x: 92, y: 14, mid: 0.5, close: 1.0 },
];

async function loadCity(page: Page, city: string): Promise<void> {
  await page.evaluate((c) => window.__ec!.startMission(c), city);
  await page
    .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 60_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500); // let the atlas re-bake + first paint settle
}

test('WP6 per-city building character screenshots', async ({ page }) => {
  test.setTimeout(300_000);
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
      await page.screenshot({ path: `preview/wp6/ingame-${city}-${tag}-mid.png` });

      await page.evaluate((z) => window.__ec?.setZoom(z), close);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `preview/wp6/ingame-${city}-${tag}-close.png` });
    }
  }
});
