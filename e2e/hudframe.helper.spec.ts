// Unified perimeter-HUD design gate (owner mandate: ONE wraparound chrome
// with dedicated, non-overlapping zones). Drives the OVERLAP STRESS CASE —
// inbox + bill + a pinned inspector card ALL open at once — at desktop and
// phone-landscape, and saves preview/hud-*.png for a design pass.
//   SHOTS=1 npx playwright test e2e/hudframe.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

const cmd = async (page: P, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

/** Build a small network, designate several tenders (so the inbox has tall
 *  content), and pin a substation's inspector card. The clock stays PAUSED
 *  throughout so no severe-weather modal (a separate interrupt overlay)
 *  fires over the HUD we're judging. Leaves the game in the full-overlap
 *  state for a screenshot. */
async function stressState(page: P): Promise<void> {
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));
  // guaranteed-buildable open-land tiles (avoids water/occupied coords)
  const land = await openLand(page, 6);
  const [s0, s1, g0, g1, g2, g3] = land;
  // a grid sub + a dist sub + a 132 kV line between them
  if (s0) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: s0.x, y: s0.y } });
  if (s1) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: s1.x, y: s1.y } });
  if (s0 && s1)
    await cmd(page, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: s0.x, ay: s0.y, bx: s1.x, by: s1.y },
    });
  // designate several generation sites → open tenders stack in the inbox
  // (each shows "awaiting developer bids" immediately — no clock needed)
  if (g0) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'gasCCGT', x: g0.x, y: g0.y } });
  if (g1) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'solarFarm', x: g1.x, y: g1.y } });
  if (g2) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: g2.x, y: g2.y } });
  if (g3) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: g3.x, y: g3.y } });
  await page.waitForTimeout(300);

  // pin a placed substation's inspector card (its controls must stay
  // reachable). Pick whatever non-iDNO sub actually landed.
  await page.evaluate(() => {
    const s = window.__ec?.getState();
    const sub = (s?.snapshot?.assets ?? []).find(
      (a) => a.kind === 'sub' && a.sub !== 'tee' && !a.idno,
    );
    if (sub) {
      s?.setTool({ t: 'inspect' });
      s?.setSelected({ assetId: sub.id });
    }
  });
  await page.waitForTimeout(300);
  // defensively clear any severe-weather modal that may have queued (only
  // if present — never block waiting for an element that isn't there)
  const ride = page.getByRole('button', { name: 'ride it out ▸' });
  if ((await ride.count()) > 0) await ride.dispatchEvent('click');
  await page.waitForTimeout(150);
}

test('desktop 1280x800 — full overlap stress case', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await stressState(page);
  // frame the city core so the map clearly shows through the centre
  await page.evaluate(() => {
    window.__ec?.panTo(124, 62);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(400);
  const tenders = await store<number>(page, '(s) => s.snapshot.inbox.tenders.length');
  console.log('desktop tenders open:', tenders);
  await page.screenshot({ path: 'preview/hud-desktop.png' });
  // full-res crops of each rail so overlap can be judged up close
  await page.screenshot({
    path: 'preview/hud-desktop-right.png',
    clip: { x: 968, y: 0, width: 312, height: 800 },
  });
  await page.screenshot({
    path: 'preview/hud-desktop-left.png',
    clip: { x: 0, y: 0, width: 320, height: 800 },
  });

  // also a tall-content variant: open the bill trend chart too
  const trend = page.getByRole('button', { name: 'show bill trend' });
  if ((await trend.count()) > 0) await trend.dispatchEvent('click');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/hud-desktop-trend.png' });
});

// phone-landscape needs hasTouch ⇒ pointer:coarse ⇒ the real MobileChrome
// (icon rails + drawers), not the desktop perimeter frame. 844×390 ≈ a
// modern phone held landscape; simulate the notch/home-bar safe areas.
test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('844x390 MobileChrome — drawers stress case', async ({ page }) => {
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
    await stressState(page);
    await page.evaluate(() => {
      window.__ec?.panTo(124, 62);
      window.__ec?.setZoom(0.5);
    });
    await page.waitForTimeout(400);
    // idle phone HUD (rails + chips, nothing open)
    await page.screenshot({ path: 'preview/hud-phone-idle.png' });

    // open the inbox drawer (right chip column) for the stress case
    const inboxChip = page.getByRole('button', { name: 'inbox' }).first();
    if ((await inboxChip.count()) > 0) await inboxChip.dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/hud-phone-inbox.png' });

    // and the bill drawer (toggle inbox shut first, then open bill)
    if ((await inboxChip.count()) > 0) await inboxChip.dispatchEvent('click');
    const billChip = page.getByRole('button', { name: 'bill' }).first();
    if ((await billChip.count()) > 0) await billChip.dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'preview/hud-phone-bill.png' });
  });
});
