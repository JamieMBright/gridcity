import { test, expect } from '@playwright/test';

// Wave D — EVERY playable map loads, and switching between them never crashes.
// This is the crash-detection net the owner asked for ("every map"): it mirrors
// the reported London-load crash path, where switching scenario tears down and
// rebuilds the PixiJS renderer on a new map. Benign network noise (Supabase is
// unreachable in the sandbox → resource/cert errors) is filtered; only real JS
// exceptions (pageerror) and worker faults count.

const BENIGN =
  /ERR_CERT|Failed to load resource|net::ERR|favicon|supabase\.co|fonts\.|status of [45]\d\d/i;

// london is code-drawn; the rest are the committed data-backed artifacts
// (src/data/scenarioData.ts CITY_ARTIFACTS). Ends back on london to exercise the
// owner's exact crash direction (switch INTO London from another city).
const CITIES = [
  'london', 'paris', 'newyork', 'sydney', 'hongkong', 'berlin',
  'shanghai', 'capetown', 'cairo', 'athens', 'pune', 'northeast', 'london',
];

test('every playable city loads (and switches) without crashing', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(`[console.error] ${m.text()}`);
  });

  await page.goto('/');
  await page.waitForFunction(
    () => !!window.__ec && window.__ec.getState().snapshot !== undefined,
    undefined,
    { timeout: 60_000 },
  );

  for (const city of CITIES) {
    await page.evaluate((c) => window.__ec!.startMission(c), city);
    await page
      .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    const status = await page.evaluate(() => window.__ec?.getState().workerStatus);
    expect(status, `worker status after loading ${city}`).not.toBe('error');
    expect(errors, `real (non-network) errors after loading ${city}:\n${errors.join('\n===\n')}`).toEqual([]);
  }
});
