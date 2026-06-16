// Van design-gate (W7b): the orange vans DRIVE on the street network — not
// just parked at the depot. We seed repair jobs (dev-only __testFault) so the
// fleet dispatches, run the clock, and screenshot the vans mid-route on the
// roads at mid + close zoom. The original depot sanity still renders.
//   SHOTS=1 npx playwright test e2e/van.helper.spec.ts
import { test, type Page } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const cmd = (page: Page, c: unknown): Promise<void> =>
  page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);

test('vans render at the depot', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  const tiles = await openLand(page, 4);
  const depot = tiles[0] ?? { x: 70, y: 6 };
  await cmd(page, { type: 'build', spec: { kind: 'depot', x: depot.x, y: depot.y } });
  await cmd(page, { type: 'setFleet', vans: 3 });
  await page.waitForTimeout(700);
  await page.evaluate((d) => {
    window.__ec!.panTo(d.x, d.y);
    window.__ec!.setZoom(1.6);
  }, depot);
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'preview/van-depot.png',
    clip: { x: 440, y: 220, width: 400, height: 360 },
  });
});

/** Drivable road tiles (RC street=2 / arterial=3 / motorway=4), spread out. */
async function roadTiles(page: Page, n: number): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate((count) => {
    const s = window.__ec!;
    const out: Array<{ x: number; y: number }> = [];
    for (let y = 24; y < 138 && out.length < count; y += 2) {
      for (let x = 36; x < 210 && out.length < count; x += 2) {
        const rc = s.getRoad(x, y);
        if (rc >= 2 && rc <= 4 && out.every((p) => Math.hypot(p.x - x, p.y - y) > 20)) {
          out.push({ x, y });
        }
      }
    }
    return out;
  }, n);
}

test('vans drive on the road network to faults', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await page.evaluate(() => window.__ec!.setAtmosphere(18 * 60, { cloud: 0.25, wind: 0.5 }));

  // a depot near the action, then a generous fleet
  const road = await roadTiles(page, 6);
  const open = await openLand(page, 6);
  const depot = road[0] ?? open[0] ?? { x: 70, y: 60 };
  await cmd(page, { type: 'build', spec: { kind: 'depot', x: depot.x, y: depot.y } });
  await cmd(page, { type: 'setFleet', vans: 6 });
  await page.waitForTimeout(400);

  // seed faults out along the network so vans must drive the streets to reach
  // them (long repairs → they don't all arrive at once and get caught en route)
  const targets = (road.length > 1 ? road.slice(1) : open.slice(1, 6)).slice(0, 5);
  for (const t of targets) {
    await cmd(page, { type: '__testFault', x: t.x, y: t.y, label: 'storm damage' });
  }

  const sampleVans = async (): Promise<Array<{ x: number; y: number; busy: boolean }>> =>
    page.evaluate(() => {
      const s = window.__ec!.getState();
      return (s.snapshot?.fleet.vans ?? []).map((v) => ({
        x: Math.round(v.x * 10) / 10,
        y: Math.round(v.y * 10) / 10,
        busy: v.busy,
      }));
    });
  const jobSites = async (): Promise<Array<{ x: number; y: number }>> =>
    page.evaluate(() =>
      (window.__ec!.getState().snapshot?.fleet.jobs ?? []).map((j) => ({ x: j.x, y: j.y })),
    );

  // run the clock briefly so the vans are CAUGHT mid-route on the streets
  // (not yet arrived) — short hop, then freeze for the shot
  await cmd(page, { type: 'setSpeed', speed: 6 });
  await page.waitForTimeout(2600);
  await cmd(page, { type: 'setSpeed', speed: 0 });

  const vans = await sampleVans();
  const sites = await jobSites();
  console.log('VANS:', JSON.stringify(vans), 'JOBS:', JSON.stringify(sites));

  // centre between the depot and the spread of faults
  const cx = Math.round(
    (depot.x + targets.reduce((a, t) => a + t.x, 0) / Math.max(1, targets.length)) / 2,
  );
  const cy = Math.round(
    (depot.y + targets.reduce((a, t) => a + t.y, 0) / Math.max(1, targets.length)) / 2,
  );

  // MID zoom — vans as little trucks moving along streets
  await page.evaluate(
    ({ x, y }) => {
      window.__ec!.panTo(x, y);
      window.__ec!.setZoom(1.25);
    },
    { x: cx, y: cy },
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/van-drive-mid.png' });

  // CLOSE zoom on a van that's en route (busy AND still > 4 tiles from any job
  // site, so it's mid-street, not parked at the fault)
  const enRoute =
    vans.find((v) => v.busy && sites.every((s) => Math.hypot(s.x - v.x, s.y - v.y) > 4)) ??
    vans.find((v) => v.busy);
  const focus = enRoute ?? vans[0] ?? { x: cx, y: cy };
  await page.evaluate(
    ({ x, y }) => {
      window.__ec!.panTo(x, y);
      window.__ec!.setZoom(2.0);
    },
    focus,
  );
  await page.waitForTimeout(500);
  const fpos = await page.evaluate(({ x, y }) => window.__ec!.tileToScreen(x, y), focus);
  await page.screenshot({
    path: 'preview/van-drive-close.png',
    clip: {
      x: Math.max(0, fpos.x - 230),
      y: Math.max(0, fpos.y - 240),
      width: 460,
      height: 430,
    },
  });
});
