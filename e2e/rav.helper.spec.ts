// Design-gate for the RAV / regulatory-finance block on the report card.
// Injects a render-only regulatory view (the sim only engages it deep into a
// game) and opens the KPI dashboard.
//   SHOTS=1 npx playwright test e2e/rav.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

const REG = {
  ravK: 177800,
  ravGrossK: 200000,
  revenue: {
    returnYrK: 5940,
    depreciationYrK: 4440,
    opexAllowanceYrK: 2000,
    sharingYrK: 300,
    incentiveYrK: 50,
    totalYrK: 12730,
    actualTotexYrK: 6300,
    totexAllowanceYrK: 6900,
  },
};

async function inject(page: P): Promise<void> {
  await page.evaluate(() => window.__ec!.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(300);
  await page.evaluate((reg) => {
    const w = window as unknown as { __ravTimer?: number };
    if (w.__ravTimer) window.clearInterval(w.__ravTimer);
    const stamp = (): void => {
      const s = window.__ec!.getState();
      const snap = s.snapshot as unknown as Record<string, unknown> | undefined;
      if (!snap) return;
      const riio = snap.riio as Record<string, unknown>;
      if ((riio.regulatory as unknown) !== undefined) return;
      s.setSnapshot({ ...snap, riio: { ...riio, regulatory: reg } } as never);
      s.setKpiOpen(true);
    };
    stamp();
    w.__ravTimer = window.setInterval(stamp, 150);
  }, REG);
  await page.waitForTimeout(500);
}

test('RAV regulatory block — desktop + phone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await boot(page);
  await inject(page);
  await page.screenshot({ path: 'preview/rav-desktop.png' });

  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(400);
  await inject(page);
  await page.screenshot({ path: 'preview/rav-mobile.png' });
});
