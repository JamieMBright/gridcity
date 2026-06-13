// Screenshot helper for the Wave-13 UX3 lane (#29/#31/#35/#37). Not a
// regression test — run on demand:
//   SHOTS=1 npx playwright test e2e/ux3.helper.spec.ts
// Saves preview/ux3-*.png at desktop AND phone-landscape for review.

import { test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const DESKTOP = { width: 1280, height: 800 };
// phone held landscape, narrow enough to cross the 760px mobile breakpoint
// (useIsMobile keys on max-width:760 regardless of orientation), so the
// real MobileChrome + bottom-sheet layout mounts — not the desktop rail.
const PHONE = { width: 740, height: 360 };

async function cmd(page: Page, c: unknown): Promise<void> {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
}

/** Arm template-paste by name (read back from localStorage) + hover a tile
 *  so the preview chip renders its price/validity. */
async function armPaste(page: Page, name: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ name, x, y }) => {
      const raw = localStorage.getItem('electricity.templates.v1');
      const list = raw ? (JSON.parse(raw) as Array<{ name: string }>) : [];
      const tpl = list.find((t) => t.name === name) ?? list[0];
      if (tpl) window.__ec!.getState().setPasteTemplate(tpl as never);
      window.__ec!.getState().setHoveredTile({ x, y } as never);
    },
    { name, x, y },
  );
}

/** A small network: two grid subs + a dist sub + feeders, so there are
 *  assets to inspect/compare and a motif to template. Returns the placed
 *  sub asset ids (in placement order). */
async function seedNetwork(page: Page): Promise<number[]> {
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: 120, y: 44 } });
  await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 135, y: 53 } });
  await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: 128, y: 60 } });
  await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 143, y: 57 } });
  await cmd(page, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 135, ay: 53, bx: 143, by: 57 },
  });
  await cmd(page, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 120, ay: 44, bx: 135, by: 53 },
  });
  await page.waitForTimeout(800);
  // the substation ids, in id order (placement order)
  return page.evaluate(() =>
    (window.__ec?.getState().snapshot?.assets ?? [])
      .filter((a) => a.kind === 'sub')
      .map((a) => a.id),
  );
}

test('ux3 screenshots', async ({ page }) => {
  test.setTimeout(300_000);

  // --- DESKTOP ---------------------------------------------------------------
  await page.setViewportSize(DESKTOP);
  await boot(page);
  const subIds = await seedNetwork(page);
  await page.evaluate(() => {
    window.__ec?.panTo(136, 55);
    window.__ec?.setZoom(0.7);
  });
  await page.waitForTimeout(800);

  // #29 hotkey help overlay
  await page.evaluate(() => window.__ec?.getState().setHelpOpen(true));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/ux3-help-desktop.png' });
  await page.evaluate(() => window.__ec?.getState().setHelpOpen(false));

  // #31 compare mode — pin two substations side by side
  await page.evaluate((ids) => {
    const s = window.__ec!.getState();
    s.setTool({ t: 'inspect' });
    s.setSelected({ assetId: ids[0] });
    s.setComparePicking(true);
    s.setSelected({ assetId: ids[1] });
  }, subIds);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux3-compare-desktop.png' });
  await page.evaluate(() => {
    window.__ec?.getState().clearCompare();
    window.__ec?.getState().setSelected({});
  });

  // #37 templates — drive the REAL palette UI: click "save my last builds
  // as a template", name it, save. (The recent-placement buffer was filled
  // off the snapshot as the subs appeared during seedNetwork.)
  {
    const saveBtn = page.getByRole('button', { name: /save my last/ });
    if ((await saveBtn.count()) > 0) {
      await saveBtn.first().dispatchEvent('click');
      const input = page.locator('input[placeholder^="name"]');
      if ((await input.count()) > 0) {
        await input.first().fill('grid + dist motif');
        await page.getByRole('button', { name: 'save', exact: true }).first().dispatchEvent('click');
      }
    }
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/ux3-template-save-desktop.png' });

  // arm paste on the saved template (read it back from localStorage) and
  // hover a tile so the preview chip prices + validates the stamp
  await armPaste(page, 'grid + dist motif', 150, 64);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux3-template-paste-desktop.png' });
  await page.evaluate(() => window.__ec?.getState().setPasteTemplate(undefined));

  // --- PHONE LANDSCAPE -------------------------------------------------------
  await page.setViewportSize(PHONE);
  await page.evaluate(() => {
    window.__ec?.panTo(136, 55);
    window.__ec?.setZoom(0.55);
  });
  await page.waitForTimeout(800);

  // #29 help overlay at phone-landscape
  await page.evaluate(() => window.__ec?.getState().setHelpOpen(true));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/ux3-help-mobile.png' });
  await page.evaluate(() => window.__ec?.getState().setHelpOpen(false));

  // #35 mobile inspector bottom-sheet — pin an asset
  await page.evaluate((ids) => {
    const s = window.__ec!.getState();
    s.setTool({ t: 'inspect' });
    s.setSelected({ assetId: ids[0] });
  }, subIds);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux3-sheet-mobile.png' });

  // #31 compare inside the mobile sheet (two cards stacked)
  await page.evaluate((ids) => {
    const s = window.__ec!.getState();
    s.setComparePicking(true);
    s.setSelected({ assetId: ids[1] });
  }, subIds);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux3-sheet-compare-mobile.png' });
  await page.evaluate(() => {
    window.__ec?.getState().clearCompare();
    window.__ec?.getState().setSelected({});
  });

  // #37 template paste preview at phone-landscape
  await armPaste(page, 'grid + dist motif', 150, 64);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux3-template-paste-mobile.png' });
});
