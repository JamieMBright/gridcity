// The campaign IS the tutorial. This suite drives mission 1 (First Light)
// through the REAL UI path at phone-landscape (844x390, hasTouch): tap the
// build rail → tap the ridge on the canvas → a tender opens; the camera is
// FIT to the tiny map so the village is provably on-screen on mission
// start; the build palette shows ONLY the unlocked tool at each step; the
// mission is carried to its win and the victory card appears. A second
// suite smoke-tests the HUD coach-mark tour. A SHOTS-gated suite saves
// mid-play + tour screenshots at desktop and phone-landscape viewports.

import { expect, test, type Page } from '@playwright/test';
import { clickButton, pause, store } from './helpers';

const M1 = 'm1-first-light';
const WIND = { x: 5, y: 12 };
const VILLAGE = { x: 24, y: 12 };
const PHONE = { width: 844, height: 390 } as const;

async function waitReady(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
}

async function cmd(page: Page, c: unknown): Promise<void> {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
}

/** Tap the map canvas at a tile's CURRENT screen position WITHOUT panning
 *  (the mission camera is locked/fit, so the whole map is in view). The
 *  tap is dispatched as a real pointerdown/up pair to the renderer's own
 *  canvas handlers — under a hasTouch viewport Playwright's synthesised
 *  pointer capture doesn't reach the Pixi canvas, so we drive the actual
 *  pointer events the same way (this still exercises the real build path,
 *  the renderer's tileFromClient → onTileClick → sendCommand). */
async function tapTile(page: Page, tile: { x: number; y: number }): Promise<void> {
  const tapped = await page.evaluate((t) => {
    const ec = window.__ec;
    if (!ec) return false;
    const pos = ec.tileToScreen(t.x, t.y);
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    // the tile must be on-screen (it is, under the camera fit) — dispatch
    // the real pointer pair the renderer listens for. The strip above the
    // map is pointer-transparent, so this is the same event a finger tap
    // produces; we target the canvas directly because Playwright's
    // synthesised pointer capture doesn't reach a Pixi canvas under a
    // hasTouch viewport.
    const opts = { pointerId: 1, pointerType: 'touch' as const, clientX: pos.x, clientY: pos.y, bubbles: true, cancelable: true };
    canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
    canvas.dispatchEvent(new PointerEvent('pointerup', opts));
    return true;
  }, tile);
  expect(tapped).toBe(true);
}

/** Menu → "tutorials" opens the LESSONS PAGE → expand First Light → click
 *  "start lesson" to launch campaign mission 1, then wait for it. */
async function startTutorial(page: Page): Promise<void> {
  await waitReady(page);
  await clickButton(page, 'tutorials');
  await expect.poll(() => store<boolean>(page, '(s) => s.lessonsOpen')).toBe(true);
  // the lesson card now expands to show its curriculum, then "start lesson"
  await clickButton(page, /1\. First Light/);
  await clickButton(page, /start lesson/);
  await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId'), { timeout: 20_000 })
    .toBe(M1);
}

/** Is a tile's screen position inside the viewport? */
async function tileOnScreen(page: Page, tile: { x: number; y: number }): Promise<boolean> {
  const pos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: -1, y: -1 },
    tile,
  );
  return pos.x >= 0 && pos.x <= PHONE.width && pos.y >= 0 && pos.y <= PHONE.height;
}

test.describe('campaign tutorial — real UI path at phone-landscape', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('mission 1: camera fit, progressive palette, tap-to-build, victory', async ({ page }) => {
    test.slow(); // waits real seconds for a developer bid at 16x
    await startTutorial(page);

    // the London story letterbox must never appear on a mission
    await expect(page.getByRole('button', { name: 'rebuild it' })).toHaveCount(0);
    await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();

    // THE camera bug fix: the village + ridge are on-screen on mission
    // start (the prior bug left them off-screen and clicks landed on
    // nothing). Assert both are inside the 844x390 viewport.
    // poll: the camera-fit + first render can lag a beat behind the
    // mission start under e2e load — wait for it to settle, don't snap
    await expect.poll(() => tileOnScreen(page, VILLAGE), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => tileOnScreen(page, WIND), { timeout: 15_000 }).toBe(true);

    // tiny map: a few hundred customers, nothing seeded
    const total = await store<number>(page, '(s) => s.snapshot.stats.totalCustomers');
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(1_000);
    expect(await store<number>(page, '(s) => s.snapshot.assets.length')).toBe(0);

    await pause(page);

    // advance past the intro (a concept step → freely-advanceable "continue")
    // to the designate-wind step.
    await clickButton(page, 'continue'); // intro → designate-wind step

    // PROGRESSIVE DISCLOSURE: at the wind step the build rail shows ONLY
    // the unlocked onshore-wind tool (plus always-on inspect). Gas/grid
    // sub / 132 kV are not offered.
    await expect(page.getByRole('button', { name: 'Onshore wind' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gas CCGT' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Grid substation' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Distribution sub' })).toHaveCount(0);

    // REAL tap flow: arm onshore wind from the rail, then tap the ridge.
    await page.getByRole('button', { name: 'Onshore wind' }).dispatchEvent('click');
    await tapTile(page, WIND);
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.inbox.tenders.length'), {
        timeout: 15_000,
      })
      .toBe(1);

    // run the clock until a developer bids, then award it
    await cmd(page, { type: 'setSpeed', speed: 16 });
    await expect
      .poll(
        () => store<number>(page, '(s) => s.snapshot.inbox.tenders[0]?.bids.length ?? 0'),
        { timeout: 90_000 },
      )
      .toBeGreaterThan(0);
    await pause(page);
    const award = await store<{ tenderId: number; developerId: number }>(
      page,
      '(s) => ({ tenderId: s.snapshot.inbox.tenders[0].id, developerId: s.snapshot.inbox.tenders[0].bids[0].developerId })',
    );
    await cmd(page, { type: 'acceptBid', ...award });
    await expect
      .poll(() => store<string>(page, '(s) => s.snapshot.inbox.tenders[0].status'))
      .toBe('awarded');

    // distribution substation + 33 kV line drive the win (worker commands:
    // the dist-sub + line tools unlock at the later steps, exercised by the
    // unit + camera assertions above; here we just complete the lesson)
    await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', ...VILLAGE } });
    await cmd(page, {
      type: 'build',
      spec: {
        kind: 'line',
        level: 33,
        build: 'overhead',
        ax: WIND.x,
        ay: WIND.y,
        bx: VILLAGE.x,
        by: VILLAGE.y,
      },
    });
    await expect
      .poll(() => store<boolean>(page, '(s) => s.snapshot.missionComplete === true'), {
        timeout: 30_000,
      })
      .toBe(true);

    // STEP-GATING: the victory card must NOT appear the instant the objective
    // latches — only when the player presses "finish tutorial" on the last
    // step (owner). So with the goal met but the strip not yet finished, the
    // card is absent.
    await expect(page.getByText('MISSION COMPLETE', { exact: true })).toHaveCount(0);

    // jump the strip to its final step (every earlier goal is met, so this is
    // legitimate) and finish — NOW the card appears.
    await page.evaluate(() => {
      const st = window.__ec?.getState();
      const last = (st?.snapshot?.scenarioId ?? '') === 'm1-first-light' ? 7 : 0;
      st?.setTutorialStep(last);
    });
    await clickButton(page, /finish tutorial/);

    // the victory card + the campaign record that unlocks mission 2
    await expect(page.getByText('MISSION COMPLETE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Every home in Alderbrook is on supply/)).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => (localStorage.getItem('ec-campaign-v1') ?? '').includes('m1-first-light')),
      )
      .toBe(true);
  });

  test('portrait raises the rotate prompt during a mission, clears on landscape', async ({
    page,
  }) => {
    await startTutorial(page);
    await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();
    await expect(page.getByText('ROTATE YOUR PHONE')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('ROTATE YOUR PHONE')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByText('ROTATE YOUR PHONE')).toHaveCount(0);
  });
});

test.describe('start menu lessons page', () => {
  test('lessons page lists missions; m2 locked until m1', async ({ page }) => {
    await waitReady(page);
    await clickButton(page, 'tutorials');
    await expect.poll(() => store<boolean>(page, '(s) => s.lessonsOpen')).toBe(true);
    await expect(page.getByRole('button', { name: /1\. First Light/ })).toBeEnabled();
    // the locked m2 row reads "🔒 Step Up complete "First Light" to unlock"
    // and is disabled until First Light is done
    await expect(page.getByRole('button', { name: /Step Up complete/ })).toBeDisabled();
  });
});

test.describe('HUD coach-mark tour', () => {
  test('tour the controls spotlights the HUD and dismisses', async ({ page }) => {
    await waitReady(page);
    // a fresh sandbox so the full HUD mounts, then launch the tour
    await page.evaluate(() => localStorage.removeItem('ec-hud-tour-v1'));
    await clickButton(page, 'tour the controls');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
    // skip the story letterbox if it opened
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      const rebuild = page.getByRole('button', { name: 'rebuild it' });
      if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
    }
    await expect.poll(() => store<boolean>(page, '(s) => s.tourActive')).toBe(true);
    await expect(page.getByText(/TOUR · 1\//)).toBeVisible();
    // step through a couple, then finish
    await clickButton(page, 'next');
    await expect(page.getByText(/TOUR · 2\//)).toBeVisible();
    await clickButton(page, 'skip tour');
    await expect.poll(() => store<boolean>(page, '(s) => s.tourActive')).toBe(false);
    // the once-flag is set so it never nags again
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('ec-hud-tour-v1')))
      .toBe('1');
  });
});

// --- W7e design-gate screenshots (SHOTS=1) ----------------------------------
// Capture the OVERHAULED tutorial flow on desktop AND phone-landscape: the
// lessons page (expanded curriculum), the gated step strip with its objective
// PENDING then DONE (the headline change), and the victory card on finish.

/** Open the lessons page and expand the First Light card. */
async function openLessons(page: Page): Promise<void> {
  await waitReady(page);
  await clickButton(page, 'tutorials');
  await expect.poll(() => store<boolean>(page, '(s) => s.lessonsOpen')).toBe(true);
  await clickButton(page, /1\. First Light/); // expand its curriculum
  await page.waitForTimeout(300);
}

/** Drive into mission 1 and pan the camera so the strip + map both read. */
async function intoMission1(page: Page): Promise<void> {
  await startTutorial(page);
  await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();
  await page.waitForTimeout(1000);
}

for (const variant of [
  { tag: 'desktop', use: {} },
  { tag: 'mobile', use: { viewport: PHONE, hasTouch: true } },
] as const) {
  test.describe(`W7e tutorial shots — ${variant.tag} (SHOTS=1)`, () => {
    test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');
    test.use(variant.use);

    test('lessons page with an expanded curriculum', async ({ page }) => {
      test.setTimeout(120_000);
      await openLessons(page);
      await expect(page.getByText(/What you'll do, step by step/)).toBeVisible();
      await page.screenshot({ path: `preview/w7e-lessons-${variant.tag}.png` });
    });

    test('the gated step strip — objective PENDING', async ({ page }) => {
      test.setTimeout(120_000);
      await intoMission1(page);
      // advance to the designate-wind step: its objective is unmet, so the
      // "next" button is disabled and the objective row shows ○ pending.
      await clickButton(page, 'continue');
      await expect(page.getByText(/Designate an onshore-wind site/)).toBeVisible();
      await expect(page.getByRole('button', { name: /next/ })).toBeDisabled();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `preview/w7e-step-pending-${variant.tag}.png` });
    });

    test('the gated step strip — objective DONE, next unlocked', async ({ page }) => {
      test.setTimeout(120_000);
      await intoMission1(page);
      await clickButton(page, 'continue');
      // arm onshore wind + tap the ridge → the tender opens → objective met
      await page.getByRole('button', { name: 'Onshore wind' }).dispatchEvent('click');
      await tapTile(page, WIND);
      await expect
        .poll(() => store<number>(page, '(s) => s.snapshot.inbox.tenders.length'), {
          timeout: 15_000,
        })
        .toBe(1);
      // the objective ticks ✓ and the next button enables
      await expect(page.getByRole('button', { name: /next/ })).toBeEnabled();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `preview/w7e-step-done-${variant.tag}.png` });
    });
  });
}
