// Design gate for the HUD redesign (owner, 2026-06-18): the cohesive
// rounded-card panels, the top 6-stat bar, the screen-centred bottom bar,
// the collapsible bill (collapsed vs expanded), the inbox, the whole-HUD
// Spacebar toggle (hidden vs shown), and the cosy loading screen. Saves
// real in-game grabs under preview/hud/ for a harsh look against the concept.
//   SHOTS=1 npx playwright test e2e/hudredesign.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

const cmd = async (page: P, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

/** A small, real network so the stat bar reads live numbers, the bill has a
 *  DUoS figure, and the inbox has a couple of open tenders. Clock paused so
 *  no weather modal fires over the HUD we're judging. */
async function scene(page: P): Promise<void> {
  await cmd(page, { type: 'setSpeed', speed: 0 });
  const land = await openLand(page, 6);
  const [s0, s1, g0, g1, g2] = land;
  if (s0) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: s0.x, y: s0.y } });
  if (s1) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: s1.x, y: s1.y } });
  if (s0 && s1)
    await cmd(page, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: s0.x, ay: s0.y, bx: s1.x, by: s1.y },
    });
  if (g0) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: g0.x, y: g0.y } });
  if (g1) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'solarFarm', x: g1.x, y: g1.y } });
  if (g2) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'gasCCGT', x: g2.x, y: g2.y } });
  await page.waitForTimeout(300);
  // dismiss a queued weather modal if any
  const ride = page.getByRole('button', { name: 'ride it out ▸' });
  if ((await ride.count()) > 0) await ride.dispatchEvent('click');
  await page.evaluate(() => {
    window.__ec?.panTo(124, 62);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(400);
}

test('desktop 1280x800 — cohesive HUD, bill, toggle', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await scene(page);

  // 1. full HUD, bill collapsed (default) — the cohesive resting state
  await page.screenshot({ path: 'preview/hud/desktop-resting.png' });

  // 2. bill expanded — the breakdown drawer slid open
  const billOpen = page.getByRole('button', { name: 'show bill breakdown' }).first();
  if ((await billOpen.count()) > 0) await billOpen.dispatchEvent('click');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'preview/hud/desktop-bill-expanded.png' });
  // a tight grab of the bill card for a close read
  const box = await page.evaluate(() => {
    const el = document.querySelector('[data-tour="bill"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  if (box) {
    await page.screenshot({
      path: 'preview/hud/desktop-bill-card.png',
      clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: box.w + 20, height: Math.min(560, box.h + 20) },
    });
  }

  // a tight grab of the top stat bar
  await page.screenshot({ path: 'preview/hud/desktop-statbar.png', clip: { x: 300, y: 0, width: 680, height: 70 } });
  // a tight grab of the centred bottom bar
  await page.screenshot({ path: 'preview/hud/desktop-bottombar.png', clip: { x: 0, y: 740, width: 1280, height: 60 } });

  // 3. HUD hidden via Spacebar — a clean map + the reveal tab
  await page.keyboard.press(' ');
  await page.waitForTimeout(450);
  const hidden = await store<boolean>(page, '(s) => s.hudHidden');
  console.log('hudHidden after Space:', hidden);
  await page.screenshot({ path: 'preview/hud/desktop-hidden.png' });

  // 4. HUD shown again
  await page.keyboard.press(' ');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'preview/hud/desktop-shown-again.png' });
});

test('loading screen', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  // grab the loading screen the instant the app paints, before the sim is
  // ready — poll for the marker, then shoot.
  await page.goto('/');
  await page
    .waitForSelector('[data-loading-screen]', { timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'preview/hud/loading.png' });
  // a second frame a beat later (different rotating status line + more bar)
  await page.waitForTimeout(900);
  if (await page.locator('[data-loading-screen]').count()) {
    await page.screenshot({ path: 'preview/hud/loading-2.png' });
  }
});

// phone-landscape — the real MobileChrome path (rails + chips + drawers).
test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('844x390 — cohesive mobile HUD + toggle', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await boot(page);
    await page.evaluate(() => {
      const r = document.documentElement.style;
      r.setProperty('--sai-l', '47px');
      r.setProperty('--sai-r', '47px');
      r.setProperty('--sai-b', '21px');
      r.setProperty('--sai-t', '0px');
    });
    await scene(page);

    // resting mobile HUD (stat bar + rails + chips + centred clock)
    await page.screenshot({ path: 'preview/hud/phone-resting.png' });

    // open the bill sheet (chip) — header + (default-collapsed) breakdown
    const billChip = page.getByRole('button', { name: 'bill', exact: true }).first();
    if ((await billChip.count()) > 0) await billChip.dispatchEvent('click');
    await page.waitForTimeout(300);
    const billOpen = page.getByRole('button', { name: 'show bill breakdown' }).first();
    if ((await billOpen.count()) > 0) await billOpen.dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/hud/phone-bill.png' });
    // close the sheet by tapping its scrim (NOT Escape — that would open the
    // pause menu over the clean-map grab we want next)
    if ((await billChip.count()) > 0) await billChip.dispatchEvent('click');
    await page.waitForTimeout(250);

    // HUD hidden via Spacebar (works on mobile chrome too)
    await page.keyboard.press(' ');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'preview/hud/phone-hidden.png' });
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/hud/phone-shown-again.png' });
  });
});
