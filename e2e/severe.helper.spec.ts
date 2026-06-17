// Design-gate screenshots for SEVERE-WEATHER v2 (W7d): the mid-screen alert
// (7-day notice, Met-Office yellow/amber/red branding, km/h gusts, the
// system-prepare levers) AND the always-on routine HUD (the StormBanner's
// Met-coloured km/h warning + the live km/h windspeed chip). Injects
// render-only forecasts/weather onto the paused snapshot so each state pops.
//   PW_PORT=5222 SHOTS=1 npx playwright test e2e/severe.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

/** Re-stamp a severe storm (+ a call-handling readout) onto the live snapshot
 *  on an interval so the paused stream doesn't wipe the one-shot injection and
 *  the modal stays mounted for the grab. */
async function injectSevere(
  page: P,
  name: string,
  severity: number,
  etaDays: number,
  confidence: 'imminent' | 'outlook',
  understaffed: boolean,
): Promise<void> {
  await page.evaluate(() => window.__ec!.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(250);
  await page.evaluate(
    ({ name, severity, etaDays, confidence, understaffed }) => {
      const w = window as unknown as { __severeTimer?: number };
      if (w.__severeTimer) window.clearInterval(w.__severeTimer);
      const stamp = (): void => {
        const s = window.__ec!.getState();
        const snap = s.snapshot as unknown as Record<string, unknown> | undefined;
        if (!snap) return;
        const sim = snap.simTimeMin as number;
        const f = snap.stormForecast as Array<{ name: string }> | undefined;
        if (f && f.some((r) => r.name === name)) return; // already stamped
        s.setSnapshot({
          ...snap,
          stormForecast: [{ name, etaMin: sim + etaDays * 1440, severity, confidence }],
          callHandling: understaffed
            ? { volume: 6000, capacity: 1500, answerSeconds: 167, targetSeconds: 5, csatDelta: -22, draftedHandlers: 0 }
            : { volume: 300, capacity: 1500, answerSeconds: 2, targetSeconds: 5, csatDelta: 0, draftedHandlers: 0 },
        } as never);
      };
      stamp();
      w.__severeTimer = window.setInterval(stamp, 120);
    },
    { name, severity, etaDays, confidence, understaffed },
  );
  await page.getByText(name, { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
}

/** Stop the re-stamp timers and clear the injected forecast so the next state
 *  starts clean. */
async function clearInject(page: P): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __severeTimer?: number; __bannerTimer?: number };
    if (w.__severeTimer) window.clearInterval(w.__severeTimer);
    if (w.__bannerTimer) window.clearInterval(w.__bannerTimer);
    const s = window.__ec!.getState();
    const snap = s.snapshot as object;
    s.setSnapshot({ ...snap, stormForecast: [] } as never);
  });
  await page.waitForTimeout(250);
}

/** Re-stamp a NON-severe forecast (below the modal's 0.85 cut) PLUS a strong
 *  live wind, so the always-on StormBanner + the km/h weather chip show
 *  WITHOUT the escalated modal covering them. */
async function injectRoutine(page: P, name: string, severity: number, wind: number): Promise<void> {
  await page.evaluate(() => window.__ec!.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(250);
  await page.evaluate(
    ({ name, severity, wind }) => {
      const w = window as unknown as { __bannerTimer?: number };
      if (w.__bannerTimer) window.clearInterval(w.__bannerTimer);
      const stamp = (): void => {
        const s = window.__ec!.getState();
        const snap = s.snapshot as unknown as Record<string, unknown> | undefined;
        if (!snap) return;
        const sim = snap.simTimeMin as number;
        const weather = { ...(snap.weather as object), wind };
        s.setSnapshot({
          ...snap,
          weather,
          // ~5 days out, sub-severe (yellow) so the banner shows, modal stays shut
          stormForecast: [{ name, etaMin: sim + 5 * 1440, severity, confidence: 'outlook' }],
        } as never);
      };
      stamp();
      w.__bannerTimer = window.setInterval(stamp, 120);
    },
    { name, severity, wind },
  );
  await page.waitForTimeout(500);
}

test('severe-weather v2 — modal warning levels + km/h, desktop + phone', async ({ page }) => {
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);

  // RED warning (severity 1.0 → ~150 km/h gusts), 5 days out, understaffed phones
  await injectSevere(page, 'Storm Vesper', 1.0, 5, 'imminent', true);
  await page.screenshot({ path: 'preview/severe-red.png' });
  await clearInject(page);

  // AMBER warning (severity 0.93 → ~124 km/h), the medium-range outlook ~7d out
  await injectSevere(page, 'Storm Wren', 0.93, 7, 'outlook', true);
  await page.screenshot({ path: 'preview/severe-amber.png' });
  await clearInject(page);

  // YELLOW warning (severity 0.86 → ~98 km/h), call centre staffed (in target)
  await injectSevere(page, 'Storm Yarrow', 0.86, 4, 'imminent', false);
  await page.screenshot({ path: 'preview/severe-yellow.png' });
  await clearInject(page);

  // phone-landscape (Pro-Max-ish), RED — prepare levers must stay reachable
  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(300);
  await injectSevere(page, 'Storm Zephyr', 1.0, 5, 'imminent', true);
  await page.screenshot({ path: 'preview/severe-mobile.png' });
  await clearInject(page);
});

test('severe-weather v2 — routine HUD (banner km/h + warning colour, wind chip)', async ({ page }) => {
  test.setTimeout(120_000);

  // desktop: a sub-severe winter outlook (banner shows, no modal) + a windy
  // live regime so the km/h wind chip reads stormy
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await injectRoutine(page, 'Storm Aster', 0.66, 0.8);
  await page.screenshot({ path: 'preview/severe-banner-desktop.png' });
  // a tight, legible crop of just the top band (ticker + banner) for the
  // design-eval — the full shot reads small at this zoom
  await page.screenshot({
    path: 'preview/severe-banner-crop.png',
    clip: { x: 300, y: 20, width: 680, height: 100 },
  });
  await clearInject(page);

  // phone-landscape: the same routine HUD
  await page.setViewportSize({ width: 956, height: 440 });
  await page.waitForTimeout(300);
  await injectRoutine(page, 'Storm Aster', 0.66, 0.8);
  await page.screenshot({ path: 'preview/severe-banner-mobile.png' });
  await page.screenshot({
    path: 'preview/severe-banner-mobile-crop.png',
    clip: { x: 140, y: 12, width: 680, height: 96 },
  });
  await clearInject(page);
});
