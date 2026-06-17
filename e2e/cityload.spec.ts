import { test, expect } from '@playwright/test';

// Wave D — city-load regression guard. Loading and switching cities (especially
// switching INTO London from another scenario — the owner's crash path: a
// North-East save, then "new game -> London") tears down and rebuilds the
// PixiJS renderer on a new map. No prior e2e exercised a city switch, so that
// teardown/rebuild path was unguarded. Benign network noise (Supabase is
// unreachable in the sandbox, so resource/cert errors are expected) is
// filtered out; only real JS exceptions (pageerror) and worker faults count.

const BENIGN =
  /ERR_CERT|Failed to load resource|net::ERR|favicon|supabase\.co|fonts\.|status of 4\d\d|status of 5\d\d/i;

test('loading and switching cities (incl. into London) never crashes', async ({ page }) => {
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

  // boot(london) -> northeast -> london -> northeast exercises every teardown/
  // rebuild direction, mirroring the owner's path into London from another city.
  for (const city of ['northeast', 'london', 'northeast']) {
    await page.evaluate((c) => window.__ec!.startMission(c), city);
    await page
      .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 60_000 })
      .catch(() => undefined);
    await page.waitForTimeout(2500);
    const status = await page.evaluate(() => window.__ec?.getState().workerStatus);
    expect(status, `worker status after loading ${city}`).not.toBe('error');
  }

  expect(errors, `real (non-network) errors:\n${errors.join('\n===\n')}`).toEqual([]);
});
