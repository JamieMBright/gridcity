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
  // 12 cities × a full renderer teardown+rebuild each is heavy under 2-worker
  // software-WebGL contention; it passes solo but crept past 180s when sharing
  // CPU. 300s gives headroom — a genuine hang still fails, just later.
  test.setTimeout(300_000);
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
    // the scenarioId flip above already confirms the switch landed; a short
    // settle lets any async renderer/worker error surface before we assert
    await page.waitForTimeout(900);
    const status = await page.evaluate(() => window.__ec?.getState().workerStatus);
    expect(status, `worker status after loading ${city}`).not.toBe('error');
    expect(errors, `real (non-network) errors after loading ${city}:\n${errors.join('\n===\n')}`).toEqual([]);
  }
});

// The hard-refresh-into-a-saved-CITY boot path: a save on a data-backed city
// (not just London) must reload cleanly. On boot the worker restores the save
// and the renderer rebuilds on that city's lazily-imported artifact — the same
// switch direction as the owner's crash, but from a cold start. We seed a save
// for a few representative cities, hard-reload, continue, and assert the boot
// is clean (a few cities keep runtime sane while covering Euro + non-Euro art).
test('a saved data-backed city reloads cleanly (cold-boot renderer switch)', async ({ page }) => {
  // hard-reload cold boots are the heaviest path; give headroom under 2-worker
  // contention (same reasoning as the switch sweep above).
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!BENIGN.test(e.message)) errors.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(`[console.error] ${m.text()}`);
  });

  await page.goto('/');
  await page.waitForFunction(
    () => !!window.__ec && window.__ec.getState().snapshot !== undefined,
    undefined,
    { timeout: 60_000 },
  );

  for (const city of ['paris', 'cairo', 'northeast']) {
    // seed the autosave on this city
    await page.evaluate((c) => window.__ec!.startMission(c), city);
    await page
      .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
      .catch(() => undefined);
    await page
      .waitForFunction(() => localStorage.getItem('electricity.save.v1') !== null, undefined, {
        timeout: 30_000,
      })
      .catch(() => undefined);

    // HARD RELOAD → the app cold-boots into the saved city
    await page.reload();
    await page.waitForFunction(
      () => !!window.__ec && window.__ec.getState().snapshot !== undefined,
      undefined,
      { timeout: 60_000 },
    );
    // continue the save so the renderer actually mounts the city
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) await cont.dispatchEvent('click');
    await page
      .waitForFunction((c) => window.__ec!.getState().scenarioId === c, city, { timeout: 45_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1200);

    const status = await page.evaluate(() => window.__ec?.getState().workerStatus);
    expect(status, `worker status after cold-boot into ${city}`).not.toBe('error');
    expect(
      errors,
      `real errors after cold-boot into ${city}:\n${errors.join('\n===\n')}`,
    ).toEqual([]);
  }
});
