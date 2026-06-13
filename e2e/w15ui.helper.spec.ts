// Design-gate screenshots for the W15 UI-fix lane (owner playtest bugs):
// HUD overlap / z-order, the in-game GAME MENU (Esc + ELECTRICITY click),
// and the scrollable MVA reinforcement picker. Run on demand:
//   SHOTS=1 npx playwright test e2e/w15ui.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const cmd = async (page: import('@playwright/test').Page, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

async function pinGrid(page: import('@playwright/test').Page): Promise<void> {
  // pin the operator DIST sub — it's the one with the MVA reinforce picker
  // (mvaSteps); grid/bulk subs carry a fixed transformer
  await page.evaluate(() => {
    const s = window.__ec?.getState();
    if (!s?.snapshot) return;
    const assets = s.snapshot.assets as unknown as Array<Record<string, unknown>>;
    const dist = assets.find((a) => a.kind === 'sub' && a.sub === 'dist' && !a.idno);
    if (dist) s.setSelected({ assetId: dist.id as number });
  });
}

async function buildNetwork(page: import('@playwright/test').Page): Promise<void> {
  // build a grid sub on a guaranteed-open tile so there's an operator
  // substation to inspect (the MVA reinforce picker only shows for
  // non-iDNO subs); a gen + 132 kV line gives the bill something to show
  const tiles = await openLand(page, 6);
  const sub = tiles[0] ?? { x: 70, y: 4 };
  const dist = tiles[1] ?? { x: 82, y: 4 };
  const gen = tiles[3] ?? { x: 106, y: 4 };
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: gen.x, y: gen.y } });
  await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: sub.x, y: sub.y } });
  await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: dist.x, y: dist.y } });
  await cmd(page, {
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: gen.x, ay: gen.y, bx: sub.x, by: sub.y },
  });
  await cmd(page, {
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: sub.x, ay: sub.y, bx: dist.x, by: dist.y },
  });
  await page.waitForTimeout(400);
  // pin the GRID substation in the inspector (so the MVA reinforce picker
  // + upgrade buttons show)
  await pinGrid(page);
  await page.waitForTimeout(400);
}

test('w15 HUD + game menu + MVA picker', async ({ page }) => {
  test.setTimeout(180_000);

  // ---- desktop ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await buildNetwork(page);
  await page.evaluate(() => {
    const s = window.__ec?.getState();
    const assets = (s?.snapshot?.assets ?? []) as unknown as Array<Record<string, unknown>>;
    const dist = assets.find((a) => a.kind === 'sub' && a.sub === 'dist' && !a.idno);
    if (dist) window.__ec?.panTo(dist.x as number, dist.y as number);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(600);
  // full HUD: pinned inspector (with MVA reinforce picker) + bill + alerts
  await page.screenshot({ path: 'preview/w15ui-hud-desktop.png' });
  // crop on the right-rail inspector to read the MVA picker + buttons
  await page.screenshot({
    path: 'preview/w15ui-mva-desktop.png',
    clip: { x: 980, y: 20, width: 300, height: 540 },
  });

  // the in-game menu (open it like the wordmark click does)
  await page.evaluate(() => window.__ec?.getState().setGameMenuOpen(true));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/w15ui-menu-desktop.png' });
  await page.evaluate(() => window.__ec?.getState().setGameMenuOpen(false));

  // ---- phone-landscape ----
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  // re-pin on mobile (mobile routes pins through the bottom sheet)
  await pinGrid(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/w15ui-hud-mobile.png' });
  await page.screenshot({
    path: 'preview/w15ui-mva-mobile.png',
    clip: { x: 0, y: 90, width: 420, height: 300 },
  });

  await page.evaluate(() => window.__ec?.getState().setGameMenuOpen(true));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/w15ui-menu-mobile.png' });
});
