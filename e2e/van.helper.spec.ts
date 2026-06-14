// Sanity screenshot after the van-glide change: vans still render at the
// depot. (Glide smoothness is motion — a still can't capture it — but this
// confirms the sprite placement didn't regress.)
//   SHOTS=1 npx playwright test e2e/van.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('vans render at the depot', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  const tiles = await openLand(page, 4);
  const depot = tiles[0] ?? { x: 70, y: 6 };
  const cmd = (c: unknown): Promise<void> =>
    page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);
  await cmd({ type: 'build', spec: { kind: 'depot', x: depot.x, y: depot.y } });
  await cmd({ type: 'setFleet', vans: 3 });
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
