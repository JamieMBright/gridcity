// Throwaway diagnostic: where do the Giza monuments land on screen, and does
// the plateau actually energise? Prints tileToScreen for the monument anchors
// and the served-customer count, and grabs frames at a few zooms so the WP3
// design-gate spec can be framed correctly.  SHOTS=1 npx playwright test e2e/gizadiag.helper.spec.ts

import { test } from '@playwright/test';
import { expect, type Page } from '@playwright/test';
import { store } from './helpers';

test.skip(!process.env.SHOTS, 'diagnostic — run with SHOTS=1');

async function bootCairo(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  if (!(await page.evaluate(() => window.__ec?.getState().menuOpen))) {
    const ng = page.getByRole('button', { name: 'new game' });
    if ((await ng.count()) > 0) await ng.dispatchEvent('click');
  } else {
    await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
  }
  const cairo = page.getByTitle('power Cairo', { exact: true });
  await expect.poll(async () => cairo.count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await cairo.first().dispatchEvent('click');
  await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot.scenarioId ?? ""'), { timeout: 10_000 })
    .toBe('cairo');
}

test('giza diag', async ({ page }) => {
  test.setTimeout(420_000);
  await bootCairo(page);
  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  await page.evaluate((t) => window.__ec?.setAtmosphere(t, { cloud: 0.1, wind: 0.25 }), 22 * 60);

  // monument anchors (named-place SW corners): Khufu (24,157), Khafre (18,153),
  // Sphinx (30,157). Probe where they land at a few zooms.
  for (const z of [0.6, 0.95, 1.35, 1.8]) {
    await page.evaluate(
      (zz) => {
        window.__ec?.panTo(24, 154);
        window.__ec?.setZoom(zz);
      },
      z,
    );
    await page.waitForTimeout(600);
    const probe = await page.evaluate(() => {
      const pts: Record<string, { x: number; y: number }> = {};
      for (const [n, x, y] of [
        ['khufu', 24, 157],
        ['khafre', 18, 153],
        ['sphinx', 30, 157],
        ['centroid', 24, 154],
      ] as Array<[string, number, number]>) {
        pts[n] = window.__ec?.tileToScreen(x, y) ?? { x: -1, y: -1 };
      }
      return pts;
    });
    console.log(`ZOOM ${z}:`, JSON.stringify(probe));
  }

  // counts so each build can be checked for a SILENT failure (the worker
  // swallows a rejected build, so an un-checked build looks like a success).
  const countAssets = async (pred: string): Promise<number> =>
    store<number>(page, `(s)=>s.snapshot.assets.filter(${pred}).length`);
  const litKinds = async (): Promise<string[]> =>
    page.evaluate(() => window.__ec?.getLitHeroKinds() ?? []);

  // BEFORE any network: the plateau is unserved → no Giza floodlight.
  console.log('BEFORE build: litKinds =', JSON.stringify(await litKinds()));

  // energise the plateau (same network as the gate spec)
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 11, y: 146 } });
  await cmd({ type: 'setSpeed', speed: 16 });
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(1000);
    const bids = await page.evaluate(() => {
      const s = window.__ec?.getState();
      return (s?.snapshot?.inbox.tenders ?? [])
        .filter((t) => t.status === 'open' && (t.bids?.length ?? 0) > 0)
        .map((t) => ({ id: t.id, dev: t.bids[0]!.developerId }));
    });
    for (const b of bids) await cmd({ type: 'acceptBid', tenderId: b.id, developerId: b.dev });
    const live = await store<number>(
      page,
      "(s)=>s.snapshot.assets.filter((a)=>a.kind==='gen').length",
    );
    if (live >= 1) break;
  }
  await cmd({ type: 'setSpeed', speed: 1 });
  console.log('gen online count =', await countAssets("(a)=>a.kind==='gen'"));
  // grid hub on a CLEAR desert tile (18,148) — (16,148) was a carriageway
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 18, y: 148 } });
  console.log('grid subs =', await countAssets("(a)=>a.kind==='sub'&&a.sub==='grid'"));
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 11, ay: 146, bx: 18, by: 148 },
  });
  console.log('132kV lines =', await countAssets("(a)=>a.kind==='line'&&a.level===132"));
  for (const [x, y] of [
    [20, 150],
    [28, 151],
    [22, 157],
  ] as Array<[number, number]>) {
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x, y, mva: 40 } });
    await cmd({
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 18, ay: 148, bx: x, by: y },
    });
  }
  console.log('dist subs =', await countAssets("(a)=>a.kind==='sub'&&a.sub==='dist'"));
  console.log('33kV lines =', await countAssets("(a)=>a.kind==='line'&&a.level===33"));
  await cmd({ type: 'setSpeed', speed: 8 });
  await page.waitForTimeout(6000);
  await cmd({ type: 'setSpeed', speed: 1 });
  await page.waitForTimeout(1500);

  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  const totalMW = await store<number>(page, '(s) => s.snapshot.bill?.peakMW ?? -1');
  const assets = await store<number>(page, '(s) => s.snapshot.assets.length');
  console.log('AFTER ENERGISE: assets =', assets, ' served =', served, ' peakMW =', totalMW);
  console.log('AFTER build: litKinds =', JSON.stringify(await litKinds()));

  // a wide-ish frame so I can SEE whether the floodlights are on
  await page.evaluate(() => {
    window.__ec?.panTo(24, 153);
    window.__ec?.setZoom(0.7);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/gizadiag-wide.png' });
});
