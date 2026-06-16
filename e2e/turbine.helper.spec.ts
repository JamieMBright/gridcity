// Design-gate screenshots for W7c — wind turbine footprint, wind-farm icon,
// capacity picker. Run with:  SHOTS=1 npx playwright test e2e/turbine.helper.spec.ts
// Each gen build with `mw` set exercises the capacity-scaled footprint so we
// can SEE whether the placed spread matches the advertised tile count.
import { test } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const cmd = (page: import('@playwright/test').Page, c: unknown): Promise<void> =>
  page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);

test('wind farm footprint at several capacities', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  // open countryside tiles, well spread, so each farm gets its own ground
  const tiles = await openLand(page, 9);
  // place onshore-wind farms of increasing MW: 5 / 15 / 50 / 100
  const caps = [5, 15, 50, 100];
  for (let k = 0; k < caps.length; k++) {
    const t = tiles[k];
    if (!t) continue;
    await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: t.x, y: t.y, mw: caps[k] } });
  }
  await page.waitForTimeout(900);
  // FAR view — whole spread
  await page.evaluate(() => window.__ec!.setZoom(0.4));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/turbine-far.png' });

  // MID + CLOSE on the 15 MW farm (the tutorial's Aldbrook ask, "3 tiles")
  const mid = tiles[1] ?? { x: 60, y: 40 };
  await page.evaluate((d) => {
    window.__ec!.panTo(d.x, d.y);
    window.__ec!.setZoom(1.1);
  }, mid);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/turbine-mid-15mw.png', clip: { x: 340, y: 160, width: 600, height: 520 } });

  await page.evaluate((d) => {
    window.__ec!.panTo(d.x, d.y);
    window.__ec!.setZoom(2.0);
  }, mid);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/turbine-close-15mw.png', clip: { x: 340, y: 140, width: 600, height: 540 } });

  // CLOSE on the 100 MW farm — the worst-case sprawl
  const big = tiles[3] ?? { x: 80, y: 40 };
  await page.evaluate((d) => {
    window.__ec!.panTo(d.x, d.y);
    window.__ec!.setZoom(1.4);
  }, big);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/turbine-close-100mw.png', clip: { x: 300, y: 120, width: 680, height: 580 } });
});

test('wind-farm icon + capacity picker UI', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  // arm the onshore-wind tool so the capacity picker shows
  await page.evaluate(() => window.__ec!.getState().setTool({ t: 'gen', gen: 'windOnshore' }));
  await page.waitForTimeout(500);
  // scroll the picker ("SIZE THIS WIND FARM") into view inside the palette
  const picker = page.getByText('SIZE THIS WIND FARM', { exact: false });
  if ((await picker.count()) > 0) await picker.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // screenshot the left build rail (palette) where the icons + picker live
  await page.screenshot({ path: 'preview/wind-picker.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
  // step the size up a couple of times so the "reserves ~N tiles" caption moves
  await page.getByLabel('larger').first().dispatchEvent('click');
  await page.getByLabel('larger').first().dispatchEvent('click');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/wind-picker-stepped.png', clip: { x: 0, y: 0, width: 360, height: 800 } });

  // BLOW UP the live palette wind icon to judge the glyph: find the onshore-wind
  // button's <svg>, clone it at 128px on a dusk card, screenshot it.
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const wind = btns.find((b) => /onshore wind/i.test(b.textContent ?? ''));
    const sea = btns.find((b) => /offshore wind/i.test(b.textContent ?? ''));
    const card = document.createElement('div');
    card.id = '__iconcard';
    card.style.cssText =
      'position:fixed;top:40px;left:40px;z-index:99999;display:flex;gap:24px;padding:28px;background:#1b1f3a;border-radius:12px;color:#f0b86a';
    for (const b of [wind, sea]) {
      const svg = b?.querySelector('svg');
      if (!svg) continue;
      const c = svg.cloneNode(true) as SVGElement;
      c.setAttribute('width', '128');
      c.setAttribute('height', '128');
      card.appendChild(c);
    }
    document.body.appendChild(card);
  });
  await page.waitForTimeout(200);
  const card = page.locator('#__iconcard');
  if ((await card.count()) > 0) {
    await card.screenshot({ path: 'preview/wind-icon-crop.png' });
  }
});
