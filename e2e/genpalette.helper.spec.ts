// Design-gate screenshots for the generation-palette overhaul (owner,
// 2026-06-26). Not a regression test — run on demand:
//   GENPAL=1 npx playwright test e2e/genpalette.helper.spec.ts --workers=1
// Saves to /tmp/review-generation/:
//   · the build palette (voltage markers + voltage sort + hydro numbered +
//     electrolyser under Demand-side, not Generation), desktop + phone;
//   · a hydro dam placed STRADDLING a real river, zoomed in, desktop + phone.

import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.GENPAL, 'generation-palette screenshot helper — run with GENPAL=1');

const DIR = '/tmp/review-generation';

test('generation palette + hydro straddle', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };

  // ── 1. the build palette, desktop. Arm the solar tool so the voltage-tier
  //      picker is on screen too. (Desktop shows the full BuildPalette.)
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'gen', gen: 'solarFarm' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/palette-desktop.png` });
  // a tight element grab of just the palette so the voltage markers + sort
  // order + hydro number + the Demand-side section are legible
  const paletteEl = page.locator('[data-tour="palette"]').first();
  if ((await paletteEl.count()) > 0) {
    await paletteEl.screenshot({ path: `${DIR}/palette-desktop-tight.png` });
  }

  // ── 2. find a real river and drop a hydro dam straddling it
  const site = await page.evaluate(() => window.__ec?.findDamSite());
  if (site) {
    await cmd({ type: 'build', spec: { kind: 'gen', gen: 'hydro', x: site.x, y: site.y } });
    // the dam is awarded through a tender in-game; for the shot, accept the
    // first bid if one materialises, else just show the designation site.
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const s = window.__ec?.getState();
      const t = s?.snapshot?.inbox.tenders.find((tn) => tn.status === 'open' && tn.gen === 'hydro');
      // drive a bid by skipping time, then accept — handled below via skip
      void t;
    });
    // skip a little so the tender accrues a bid, then accept it
    await cmd({ type: 'setSpeed', speed: 16 });
    await page.waitForTimeout(6000);
    await page.evaluate(() => {
      const s = window.__ec?.getState();
      const t = s?.snapshot?.inbox.tenders.find((tn) => tn.status === 'open' && tn.gen === 'hydro');
      const bid = t?.bids[0];
      if (t && bid) window.__ec?.sendCommand({ type: 'acceptBid', tenderId: t.id, developerId: bid.developerId } as never);
    });
    await cmd({ type: 'setSpeed', speed: 0 });
    await page.waitForTimeout(400);

    // frame the dam close-up
    await page.evaluate((sx) => {
      window.__ec?.panTo(sx.x, sx.y);
      window.__ec?.setZoom(1.0);
    }, site);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${DIR}/hydro-straddle-desktop.png` });
  }

  // ── 3. phone-landscape: palette (expanded sheet) + dam
  await page.setViewportSize({ width: 740, height: 360 });
  await page.waitForTimeout(500);
  // open the expanded build palette sheet on mobile chrome
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'gen', gen: 'solarFarm' }));
  // tap the » expand toggle if present
  const expand = page.getByRole('button', { name: /open build menu/i });
  if ((await expand.count()) > 0) await expand.first().dispatchEvent('click');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/palette-phone.png` });
  const phonePalette = page.locator('[data-tour="palette"]').last();
  if ((await phonePalette.count()) > 0) {
    await phonePalette.screenshot({ path: `${DIR}/palette-phone-tight.png` });
  }

  if (site) {
    await page.evaluate((sx) => {
      window.__ec?.panTo(sx.x, sx.y);
      window.__ec?.setZoom(1.0);
    }, site);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/hydro-straddle-phone.png` });
  }
});
