// Design-gate screenshots for the per-country regulator localization (owner,
// 2026-06-26). Captures the KPI dashboard / report card + the bill panel for
// London (GB/Ofgem/RIIO), Berlin (DE/BNetzA/Anreizregulierung) and Pune
// (IN/MERC/Multi-Year Tariff), at desktop AND phone-landscape, into
// /tmp/review-regulator/. Run on demand:
//   PW_PORT=5202 SHOTS=1 npx playwright test e2e/regulatorshots.helper.spec.ts --workers=1
import { test, expect } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const OUT = '/tmp/review-regulator';
const CITIES = ['london', 'berlin', 'pune'] as const;

async function switchCity(page: import('@playwright/test').Page, city: string): Promise<void> {
  if (city !== 'london') {
    await page.evaluate((c) => window.__ec!.startMission(c), city);
    await page.waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, {
      timeout: 60_000,
    });
  }
  // close the front-door menu so the in-game HUD renders
  await page.evaluate(() => window.__ec!.getState().setMenuOpen(false));
  await page.waitForTimeout(800);
}

async function shotKpi(page: import('@playwright/test').Page, city: string, vp: string): Promise<void> {
  await page.evaluate(() => window.__ec!.getState().setKpiOpen(true));
  await page.waitForTimeout(500);
  // sanity: log the regulator the snapshot is actually carrying for this city
  const reg = await store<{ name: string; scheme: string }>(
    page,
    '(s) => ({ name: s.snapshot.riio.regulator.name, scheme: s.snapshot.riio.regulator.scheme })',
  );
  console.log(`[${vp}] ${city}: regulator=${reg.name} scheme=${reg.scheme}`);
  await page.screenshot({ path: `${OUT}/${city}-kpi-${vp}.png` });
  await page.evaluate(() => window.__ec!.getState().setKpiOpen(false));
  await page.waitForTimeout(300);
}

test('regulator localization screenshots — desktop', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page);
  for (const city of CITIES) {
    await switchCity(page, city);
    await shotKpi(page, city, 'desktop');
    // the bill panel (DUoS / network-charge localisation) is always docked
    await page.screenshot({ path: `${OUT}/${city}-hud-desktop.png` });
  }
  expect(true).toBe(true);
});

test('regulator localization screenshots — phone-landscape', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
  await boot(page);
  for (const city of CITIES) {
    await switchCity(page, city);
    await shotKpi(page, city, 'phone');
    await page.screenshot({ path: `${OUT}/${city}-hud-phone.png` });
  }
  expect(true).toBe(true);
});
