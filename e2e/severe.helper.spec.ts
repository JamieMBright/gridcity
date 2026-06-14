// Design-gate screenshots for the severe-weather mid-screen alert + weather
// map. Injects a render-only severe storm into the snapshot (sim untouched,
// paused so the stream doesn't overwrite it) so the modal pops.
//   SHOTS=1 npx playwright test e2e/severe.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function injectStorm(page: P, severity: number, etaDays: number): Promise<void> {
  await page.evaluate(() => window.__ec!.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(300);
  // the worker keeps streaming snapshots even when paused, which would wipe a
  // one-shot injection — so RE-stamp the storm onto the latest snapshot on an
  // interval, so the modal's condition stays satisfied for the screenshot.
  await page.evaluate(
    ({ severity, etaDays }) => {
      const w = window as unknown as { __severeTimer?: number };
      if (w.__severeTimer) window.clearInterval(w.__severeTimer);
      const stamp = (): void => {
        const s = window.__ec!.getState();
        const snap = s.snapshot as unknown as Record<string, unknown> | undefined;
        if (!snap) return;
        const sim = snap.simTimeMin as number;
        const f = snap.stormForecast as Array<{ name: string }> | undefined;
        if (f && f.some((r) => r.name === 'Storm Vesper')) return; // already stamped
        s.setSnapshot({
          ...snap,
          stormForecast: [{ name: 'Storm Vesper', etaMin: sim + etaDays * 1440, severity }],
        } as never);
      };
      stamp();
      w.__severeTimer = window.setInterval(stamp, 120);
    },
    { severity, etaDays },
  );
  // wait for the modal to actually mount
  await page.getByText('SEVERE WEATHER WARNING').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
}

test('severe-weather alert — desktop + phone', async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await injectStorm(page, 0.93, 1.2);
  await page.screenshot({ path: 'preview/severe-desktop.png' });

  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(300);
  await injectStorm(page, 0.97, 0.4);
  await page.screenshot({ path: 'preview/severe-mobile.png' });
});
