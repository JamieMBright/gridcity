// Not a regression test: drives the four Tier-3 UX features (#27/#28/#34/
// #36) and saves screenshots to preview/ux-*.png for review. Run on demand:
//   SHOTS=1 npx playwright test e2e/uxshots.helper.spec.ts
import { expect, test } from '@playwright/test';
import { boot, openLand, pause } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('bill chart, KPI tooltips, undo history, save slots', async ({ page }) => {
  test.setTimeout(180_000);

  for (const vp of [
    { w: 1280, h: 800, tag: 'desktop' },
    { w: 844, h: 390, tag: 'mobile' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await boot(page);

    // seed a little bill history + a few undo-able actions, then pause
    const tiles = await openLand(page, 4);
    for (const t of tiles) {
      await page.evaluate(
        (p) => window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: p.x, y: p.y } }),
        t,
      );
      await page.waitForTimeout(120);
    }
    // build up several game-days of bill history so the chart is populated
    // (the ring samples once a day) — two +7-day skips
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'skip 7 days' }).first().dispatchEvent('click');
      await expect(page).toHaveTitle(/.*/); // settle
      await page.waitForTimeout(1500);
    }
    await pause(page);

    // #28 bill chart — open the panel's trend (mobile: open the bill sheet)
    if (vp.tag === 'mobile') {
      await page.getByRole('button', { name: 'bill' }).first().dispatchEvent('click');
      await page.waitForTimeout(300);
    }
    const billOpen = page.getByRole('button', { name: 'show bill breakdown' });
    if ((await billOpen.count()) > 0) await billOpen.first().dispatchEvent('click');
    const trend = page.getByRole('button', { name: 'show bill trend' });
    if ((await trend.count()) > 0) await trend.first().dispatchEvent('click');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `preview/ux-billchart-${vp.tag}.png` });
    if (vp.tag === 'mobile') await page.keyboard.press('Escape');

    // #36 KPI tooltips — open the dashboard and pop one tooltip
    await page.evaluate(() => window.__ec?.getState().setKpiOpen(true));
    await page.waitForTimeout(300);
    const dot = page.getByRole('button', { name: /why is/ });
    if ((await dot.count()) > 0) {
      await dot.nth(1).dispatchEvent('mouseenter');
      await dot.nth(1).dispatchEvent('click');
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `preview/ux-kpitooltip-${vp.tag}.png` });
    await page.evaluate(() => window.__ec?.getState().setKpiOpen(false));

    // #27 undo history list
    await page.evaluate(() => window.__ec?.getState().setUndoListOpen(true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `preview/ux-undolist-${vp.tag}.png` });
    await page.evaluate(() => window.__ec?.getState().setUndoListOpen(false));

    // #34 save slots — save one so the list is populated
    await page.evaluate(() => window.__ec?.getState().setSavesOpen(true));
    await page.waitForTimeout(300);
    const nameField = page.getByPlaceholder(/day/);
    if ((await nameField.count()) > 0) {
      await nameField.fill(`${vp.tag} experiment`);
      await page.getByRole('button', { name: 'save to a new slot' }).dispatchEvent('click');
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `preview/ux-saveslots-${vp.tag}.png` });
    await page.evaluate(() => window.__ec?.getState().setSavesOpen(false));
  }
});
