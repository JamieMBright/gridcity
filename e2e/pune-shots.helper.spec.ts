// Pune design-gate screenshots (run with SHOTS=1). Boots Pune, powers the
// dense old-city + a few districts so the bespoke heroes light up, pins night,
// and saves far/mid/close + landmark close-ups to preview/. Not a regression.
import { test } from '@playwright/test';
import { expect, type Page } from '@playwright/test';

test.skip(!process.env.SHOTS, 'Pune screenshot helper — run with SHOTS=1');

async function bootPune(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 30_000 })
    .toBe(true);
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) await cont.dispatchEvent('click');
    await page.getByRole('button', { name: 'new game' }).dispatchEvent('click').catch(() => {});
    const pune = page.getByTitle(/power Pune/i);
    await expect.poll(() => pune.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await pune.first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      await page.getByRole('button', { name: 'rebuild it' }).dispatchEvent('click').catch(() => {});
    }
  }
}

test('pune night design-gate', async ({ page }) => {
  test.setTimeout(600_000);
  await bootPune(page);
  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };

  // ENERGISE the dense districts so the bespoke heroes light up. Full chain:
  // a generator → a grid sub (autoConnect runs the circuit) → distribution
  // subs (autoConnect) spreading coverage over the peths. Generators on each
  // hub so commissioning + adoption reach the clusters where heroes sit:
  // old city (~126,85), Shivajinagar/Deccan (~110,68), Camp (~156,80),
  // Hadapsar/Magarpatta (~192,104), Aundh/University (~96,52), Parvati (~120,104).
  const hubs: Array<[number, number]> = [
    [126, 85], [110, 68], [156, 80], [192, 104], [96, 52], [120, 104],
  ];
  for (const [x, y] of hubs) {
    // a gas peaker commissions fast; auto-connected grid sub beside it
    await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: x - 3, y: y - 3, mw: 200 } });
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x, y, autoConnect: true } });
  }
  // distribution subs (autoConnect) fanned across the hero clusters
  const dist: Array<[number, number]> = [
    [124, 82], [128, 84], [130, 90], [122, 88], [120, 84], [126, 90], [132, 88], [118, 78],
    [116, 74], [112, 70], [108, 66], [104, 62], [100, 60],
    [152, 78], [158, 82], [162, 78], [150, 70],
    [188, 102], [196, 100], [198, 104],
    [98, 54], [94, 50], [122, 100], [118, 106],
  ];
  for (const [x, y] of dist) {
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x, y, autoConnect: true } });
  }
  // run the sim until generation commissions + coverage energises + customers
  // adopt. Poll getLitHeroKinds so we stop as soon as the show is lit.
  await cmd({ type: 'setSpeed', speed: 16 });
  let lit: string[] = [];
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(10_000);
    lit = await page.evaluate(() => window.__ec?.getLitHeroKinds() ?? []);
    if (lit.length >= 12) break;
  }
  await cmd({ type: 'setSpeed', speed: 0 });

  // pin deep night so the electrification light-show blooms (min ~ 03:00)
  await page.evaluate(() => window.__ec?.setAtmosphere(3 * 60));
  await page.waitForTimeout(1500);

  lit = await page.evaluate(() => window.__ec?.getLitHeroKinds() ?? []);
  console.log('PUNE lit hero kinds (' + lit.length + '):', JSON.stringify(lit));
  const served = await page.evaluate(() => window.__ec?.getState().snapshot?.bill?.servedCustomers ?? 0);
  console.log('PUNE servedCustomers:', served);

  // FAR (top) — whole-city silhouette, label clutter check
  await page.evaluate(() => { window.__ec?.panTo(130, 88); window.__ec?.setZoom(0.12); });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/pune-night-far.png' });

  // MID — the old city + Shivajinagar
  await page.evaluate(() => { window.__ec?.panTo(124, 82); window.__ec?.setZoom(0.42); });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/pune-night-mid.png' });

  // CLOSE — the dense old-city heroes
  await page.evaluate(() => { window.__ec?.panTo(127, 85); window.__ec?.setZoom(0.95); });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/pune-night-close.png' });

  // landmark close-ups
  await page.evaluate(() => { window.__ec?.panTo(119, 108); window.__ec?.setZoom(0.9); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/pune-night-parvati.png', clip: { x: 360, y: 120, width: 560, height: 480 } });

  await page.evaluate(() => { window.__ec?.panTo(110, 68); window.__ec?.setZoom(0.9); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/pune-night-deccan.png', clip: { x: 360, y: 120, width: 560, height: 480 } });

  await page.evaluate(() => { window.__ec?.panTo(190, 105); window.__ec?.setZoom(0.9); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/pune-night-hadapsar.png', clip: { x: 360, y: 120, width: 560, height: 480 } });

  // a DAY far shot too (placement/scale without the glow)
  await page.evaluate(() => { window.__ec?.setAtmosphere(12 * 60); window.__ec?.panTo(130, 88); window.__ec?.setZoom(0.12); });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/pune-day-far.png' });
});
