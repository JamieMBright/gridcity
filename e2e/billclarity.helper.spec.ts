// Design-gate screenshot for the bill-panel clarity fix: the network (DUoS)
// charge — the bit the operator controls and the report cards grade — now
// gets real visual weight under the (mostly-wholesale-energy) total.
//   SHOTS=1 npx playwright test e2e/billclarity.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('bill panel — DUoS prominence', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  // build a small network so the bill has a DUoS figure to show
  const tiles = await openLand(page, 6);
  const gen = tiles[3] ?? { x: 106, y: 4 };
  const sub = tiles[0] ?? { x: 70, y: 4 };
  const cmd = (c: unknown): Promise<void> =>
    page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: gen.x, y: gen.y } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: sub.x, y: sub.y } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: gen.x, ay: gen.y, bx: sub.x, by: sub.y },
  });
  await page.waitForTimeout(800);
  // expand the breakdown so the DUoS line + itemisation show in the grab
  const billOpen = page.getByRole('button', { name: 'show bill breakdown' });
  if ((await billOpen.count()) > 0) await billOpen.first().dispatchEvent('click');
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const el = document.querySelector('[data-tour="bill"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  if (box) {
    await page.screenshot({
      path: 'preview/bill-clarity.png',
      clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.w + 16, height: Math.min(360, box.h + 16) },
    });
  } else {
    await page.screenshot({ path: 'preview/bill-clarity.png' });
  }
});
