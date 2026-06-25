// Design-gate screenshot helper for the new HYDRO DAM (owner, 2026-06-23).
// Not a regression test: designates a dam site on a real Thames bank in
// London, lets a developer bid, awards it, runs the sim until it commissions,
// and saves close/mid screenshots to preview/ so the dam sprite can be judged
// in-game on the river. Also copies the finals to /tmp/hydro-review/ for the
// main thread.
//   SHOTS=1 npx playwright test e2e/hydroshot.helper.spec.ts --workers=1

import { mkdirSync, copyFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('hydro dam on the Thames', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);

  // valid riverside 2x2 sites found by scanning the London map with the real
  // checkBuild (the Thames bank near the Isle of Dogs), with fallbacks.
  const candidates = [
    { x: 154, y: 79 },
    { x: 159, y: 79 },
    { x: 146, y: 82 },
    { x: 140, y: 81 },
  ];

  // clear noon light so the concrete + water read true
  await page.evaluate(() => window.__ec?.setAtmosphere(12 * 60, { cloud: 0.15, wind: 0.4 }));

  // designate a hydro tender (a gen build opens a tender, not an asset)
  let site = candidates[0]!;
  for (const c of candidates) {
    const before = await store<number>(page, '(s) => s.snapshot.inbox.tenders.length');
    await page.evaluate(
      (cc) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'gen', gen: 'hydro', x: cc.x, y: cc.y } }),
      c,
    );
    const after = await store<number>(page, '(s) => s.snapshot.inbox.tenders.length');
    if (after > before) {
      site = c;
      break;
    }
  }
  const tenderId = await store<number>(
    page,
    `(s) => s.snapshot.inbox.tenders.find((t) => t.gen === 'hydro')?.id ?? -1`,
  );
  expect(tenderId).toBeGreaterThanOrEqual(0);

  // run the clock until a developer bids on the dam
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 16 }));
  await expect
    .poll(
      () =>
        store<number>(
          page,
          `(s) => (s.snapshot.inbox.tenders.find((t) => t.gen === 'hydro')?.bids.length ?? 0)`,
        ),
      { timeout: 120_000 },
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));

  // award the first bid → the dam lands on the map under construction
  const award = await store<{ tenderId: number; developerId: number }>(
    page,
    `(s) => { const t = s.snapshot.inbox.tenders.find((x) => x.gen === 'hydro'); return { tenderId: t.id, developerId: t.bids[0].developerId }; }`,
  );
  await page.evaluate((a) => window.__ec?.sendCommand({ type: 'acceptBid', ...a }), award);
  await expect
    .poll(() =>
      store<boolean>(
        page,
        (`(s) => s.snapshot.assets.some((a) => a.kind === 'gen' && a.gen === 'hydro')`) as string,
      ),
    )
    .toBe(true);

  // shoot the construction site first (close)
  await page.evaluate((s) => {
    window.__ec?.panTo(s.x, s.y);
    window.__ec?.setZoom(1.0);
  }, site);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/hydro-construction.png' });

  // fast-forward (month skips) until the dam commissions — read its liveAtMin
  // vs the sim clock. A dam has a long lead time, so loop with a cap; a
  // month-skip halts only on a MAJOR incident, so just re-issue it.
  const liveInfo = async () =>
    store<{ live: number; now: number }>(
      page,
      `(s) => { const a = s.snapshot.assets.find((g) => g.kind === 'gen' && g.gen === 'hydro'); return { live: a?.liveAtMin ?? 0, now: s.snapshot.simTimeMin ?? 0 }; }`,
    );
  for (let i = 0; i < 80; i++) {
    const { live, now } = await liveInfo();
    if (now >= live) break;
    await page.evaluate(() => window.__ec?.skip('month'));
    await page.waitForTimeout(1200);
  }
  const fin = await liveInfo();
  expect(fin.now).toBeGreaterThanOrEqual(fin.live); // commissioned

  // re-pin clear light after the time-skips, then the hero close-up
  await page.evaluate(() => window.__ec?.setAtmosphere(12 * 60, { cloud: 0.15, wind: 0.4 }));
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(800);
  await page.evaluate((s) => {
    window.__ec?.panTo(s.x, s.y);
    window.__ec?.setZoom(1.15);
  }, site);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/hydro-close.png' });
  // a tight hero crop around screen-centre (the dam is panned to centre): a
  // clean look at the sprite for the design-gate judgement, HUD edges out.
  await page.screenshot({
    path: 'preview/hydro-hero.png',
    clip: { x: 290, y: 150, width: 560, height: 420 },
  });

  // MID: dam in its river context
  await page.evaluate((s) => {
    window.__ec?.panTo(s.x, s.y);
    window.__ec?.setZoom(0.6);
  }, site);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/hydro-mid.png' });

  mkdirSync('/tmp/hydro-review', { recursive: true });
  for (const f of ['hydro-construction', 'hydro-close', 'hydro-hero', 'hydro-mid']) {
    copyFileSync(`preview/${f}.png`, `/tmp/hydro-review/${f}.png`);
  }
});
