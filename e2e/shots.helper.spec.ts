// Not a regression test: drives a real scenario and saves screenshots to
// preview/ so renderer work (pylons, rotors, chevrons, overlays) can be
// reviewed. Run on demand: npx playwright test e2e/shots.helper.spec.ts
import { test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('scenario screenshots', async ({ page }) => {
  test.setTimeout(420_000);
  await boot(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  // a 33 kV wind → poles → pole transformer + dist sub run near the
  // Eppingdale suburb town (customers around 144,58)
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: 132, y: 50 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: 143, y: 57 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'pole', x: 150, y: 62 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 132, ay: 50, bx: 143, by: 57 },
  });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 143, ay: 57, bx: 150, by: 62 },
  });
  // a 132 kV overhead run with proper pylons for scale
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 120, y: 44 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 135, y: 53 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 120, ay: 44, bx: 135, by: 53 },
  });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 135, ay: 53, bx: 143, by: 57 },
  });

  await page.evaluate(() => {
    window.__ec?.panTo(140, 55);
    window.__ec?.setZoom(0.42);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'preview/shot-construction.png' });

  // run at 16x until the wind farm commissions (~51 game-days)
  await cmd({ type: 'setSpeed', speed: 16 });
  await page.waitForTimeout(245_000);
  await cmd({ type: 'setSpeed', speed: 1 });
  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  console.log('servedCustomers after commissioning:', served);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/shot-live.png', clip: { x: 240, y: 60, width: 800, height: 560 } });

  // close-up on the turbines
  await page.evaluate(() => {
    window.__ec?.panTo(132, 50);
    window.__ec?.setZoom(1.1);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/shot-turbine.png', clip: { x: 460, y: 200, width: 380, height: 300 } });
  // mid-span: poles, sag, three-phase, chevrons
  await page.evaluate(() => {
    window.__ec?.panTo(138, 54);
    window.__ec?.setZoom(0.8);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/shot-span.png', clip: { x: 420, y: 180, width: 460, height: 340 } });

  // suitability overlay: nuclear shows green only at the coastal site
  await page.evaluate(() => {
    window.__ec?.getState().setTool({ t: 'gen', gen: 'nuclear' });
    window.__ec?.panTo(200, 70);
    window.__ec?.setZoom(0.12);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/shot-suitability.png' });
});
