// Temporary screenshot helper for the underground/tee/rings work.
// Run: SHOTS=1 npx playwright test e2e/newui.helper.spec.ts
import { test } from '@playwright/test';
import { boot, clickButton, pause, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('new-ui screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page);
  await pause(page);

  const cmd = async (c: unknown): Promise<number | undefined> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
    await page.waitForTimeout(350);
    return store<number>(page, '(s) => s.snapshot.assets[s.snapshot.assets.length-1]?.id');
  };

  // a spread of substations so the voltage rings show on every type
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'bulk', x: 120, y: 44 } });
  const gridId = await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 130, y: 48 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: 138, y: 52 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 120, ay: 44, bx: 130, by: 48 },
  });
  const cableTarget = await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'underground', ax: 130, ay: 48, bx: 138, by: 52 },
  });
  console.log('cable id', cableTarget);

  // tee a third sub into the 132 circuit
  const subC = await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 128, y: 40 } });
  const lineId = await store<number>(
    page,
    `(s) => s.snapshot.assets.find((x) => x.kind === 'line' && x.level === 132).id`,
  );
  await cmd({ type: 'tee', lineId, x: 125, y: 46, fromAssetId: subC, build: 'overhead' });

  // GIS rebuild on the grid sub
  await cmd({ type: 'convertSub', assetId: gridId });

  await page.evaluate(() => {
    window.__ec?.panTo(128, 46);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/newui-network.png' });

  // pinned line card
  await page.evaluate((id) => window.__ec?.getState().setSelected({ lineId: id }), lineId + 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/newui-linecard.png' });

  // pinned sub card with the GIS sub
  await page.evaluate((id) => window.__ec?.getState().setSelected({ assetId: id }), gridId);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/newui-subcard.png' });

  // HUD with undo/redo buttons + palette with the auto-connect toggle
  await clickButton(page, 'Inspect');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/newui-hud.png' });
});
