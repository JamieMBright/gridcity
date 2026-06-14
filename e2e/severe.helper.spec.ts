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
          // a call surge with the centre understaffed → answer time at risk,
          // so the call-response readout shows the >5s / CSAT-risk state
          callHandling: {
            volume: 6000,
            capacity: 1500,
            answerSeconds: 167,
            targetSeconds: 5,
            csatDelta: -22,
            draftedHandlers: 0,
          },
        } as never);
      };
      stamp();
      w.__severeTimer = window.setInterval(stamp, 120);
    },
    { severity, etaDays },
  );
  // wait for the modal to actually mount (the storm name is in the header)
  await page.getByText('Storm Vesper', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
}

test('severe-weather alert — warning levels + km/h, desktop + phone', async ({ page }) => {
  test.setTimeout(150_000);

  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);

  // RED warning (severity 1.0 → ~150 km/h), 5 days out (7-day window)
  await injectStorm(page, 1.0, 5);
  await page.screenshot({ path: 'preview/severe-red.png' });
  await page.evaluate(() => (window as unknown as { __severeTimer?: number }).__severeTimer && window.clearInterval((window as unknown as { __severeTimer?: number }).__severeTimer));
  await page.evaluate(() => window.__ec!.getState().setSnapshot({ ...(window.__ec!.getState().snapshot as object), stormForecast: [] } as never));
  await page.waitForTimeout(300);

  // AMBER warning (severity 0.93 → ~124 km/h)
  await injectStorm(page, 0.93, 2);
  await page.screenshot({ path: 'preview/severe-amber.png' });

  // phone-landscape, RED
  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(300);
  await injectStorm(page, 1.0, 1.4);
  await page.screenshot({ path: 'preview/severe-mobile.png' });
});
