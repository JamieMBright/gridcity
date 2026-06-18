// Design gate for the COLLAPSED HUD icon-rails (owner, 2026-06-18, with concept
// art): when the desktop HUD is collapsed, the wide labelled palette + overlay
// buttons give way to two slim vertical rounded pills — a LEFT build-tool rail
// and a RIGHT overlay rail — each icon showing its HOTKEY beside it in a small
// off-white font (the owner's core ask). Desktop-only (mobile is always the
// MobileChrome path). 2x DSF so the tiny hotkey labels read in the grabs.
//   SHOTS=1 npx playwright test e2e/collapsedrail.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand, store } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

const cmd = async (page: P, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

/** A small network so the map reads as a real city behind the rails. */
async function scene(page: P): Promise<void> {
  await cmd(page, { type: 'setSpeed', speed: 0 });
  const land = await openLand(page, 4);
  const [s0, s1, g0] = land;
  if (s0) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: s0.x, y: s0.y } });
  if (s1) await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: s1.x, y: s1.y } });
  if (s0 && s1)
    await cmd(page, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: s0.x, ay: s0.y, bx: s1.x, by: s1.y },
    });
  if (g0) await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: g0.x, y: g0.y } });
  const ride = page.getByRole('button', { name: 'ride it out ▸' });
  if ((await ride.count()) > 0) await ride.dispatchEvent('click');
  await page.evaluate(() => {
    window.__ec?.panTo(124, 62);
    window.__ec?.setZoom(0.55);
  });
  await page.waitForTimeout(400);
}

test.describe('collapsed rail design gate', () => {
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

  test('desktop collapsed HUD — slim icon rails with hotkey labels', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page);
    await scene(page);

    // expanded (before) for the before/after read
    await page.screenshot({ path: 'preview/collapsed-before-expanded.png' });

    // collapse the HUD (the desktop-only toggle; store-driven for reliability)
    await page.evaluate(() => window.__ec?.getState().setHudCollapsed(true));
    await page.waitForTimeout(500);
    console.log('hudCollapsed:', await store<boolean>(page, '(s) => s.hudCollapsed'));

    // full collapsed HUD — slim rails both edges, map gets the centre
    await page.screenshot({ path: 'preview/collapsed-desktop.png' });

    // tight grabs of each rail so the hotkey-next-to-icon labels read clearly
    await page.screenshot({
      path: 'preview/collapsed-leftrail.png',
      clip: { x: 0, y: 70, width: 120, height: 680 },
    });
    await page.screenshot({
      path: 'preview/collapsed-rightrail.png',
      clip: { x: 1160, y: 70, width: 120, height: 680 },
    });

    // arm a build tool from the rail → its row goes orange (active) with the
    // hotkey flipped to navy; confirms the active-state contrast
    await page.keyboard.press('w'); // grid substation
    await page.waitForTimeout(250);
    await page.screenshot({
      path: 'preview/collapsed-leftrail-armed.png',
      clip: { x: 0, y: 70, width: 120, height: 680 },
    });

    // expand back — the full labelled HUD returns
    await page.evaluate(() => window.__ec?.getState().setHudCollapsed(false));
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'preview/collapsed-after-expanded.png' });
  });
});
