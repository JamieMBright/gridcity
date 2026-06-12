// The tutorial campaign: start menu → CAMPAIGN → mission 1 → drive the
// whole lesson to its win through the real worker (tender → developer
// bid → award → 33 kV → distribution sub → every home lit), with the
// London story letterbox provably suppressed. A second suite checks the
// phone-landscape layout and the rotate prompt; a SHOTS-gated test saves
// mid-play screenshots at desktop and phone-landscape viewports.

import { expect, test, type Page } from '@playwright/test';
import { clickButton, pause, store } from './helpers';

const M1 = 'm1-first-light';
const WIND = { x: 5, y: 12 };
const VILLAGE = { x: 24, y: 12 };

// boot() in helpers dismisses the menu — the campaign tests drive the
// menu themselves, so they wait for readiness manually (menu.spec style)
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

/** Menu → CAMPAIGN → First Light, and wait for the mission snapshot. */
async function startMission1(page: Page): Promise<void> {
  await waitReady(page);
  await clickButton(page, /campaign/);
  // "1." prefixed: the locked mission 2 button also mentions First Light
  await clickButton(page, /1\. First Light/);
  await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(false);
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId'), { timeout: 20_000 })
    .toBe(M1);
}

/** Tender → bid → award → substation → 33 kV line → fully served. */
async function driveMission1ToWin(page: Page): Promise<void> {
  await pause(page);
  // designating wind opens a tender (no asset yet — mission maps seed none)
  expect(await store<number>(page, '(s) => s.snapshot.assets.length')).toBe(0);
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', ...WIND } });
  await expect
    .poll(() => store<number>(page, '(s) => s.snapshot.inbox.tenders.length'))
    .toBe(1);

  // run the clock until a developer bids, then award it
  await cmd(page, { type: 'setSpeed', speed: 16 });
  await expect
    .poll(
      () => store<number>(page, '(s) => s.snapshot.inbox.tenders[0]?.bids.length ?? 0'),
      { timeout: 60_000 },
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

  // distribution substation among the homes + the 33 kV line
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
}

test.describe('tutorial campaign', () => {
  test('mission 1: campaign menu → tender → award → wires → win card', async ({ page }) => {
    test.slow(); // waits real seconds for developer bids at 16x
    await startMission1(page);

    // the London story letterbox must never appear on a mission
    await expect(page.getByRole('button', { name: 'rebuild it' })).toHaveCount(0);
    await expect(page.getByText(/03:47, LAST NIGHT/)).toHaveCount(0);
    // the mission's guided steps replace the London tutorial strip
    await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();
    // tiny map: a few hundred customers, not nine million
    const total = await store<number>(page, '(s) => s.snapshot.stats.totalCustomers');
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(1_000);
    // London-only seeding stayed home: no iDNO estates, no existing gens
    expect(await store<number>(page, '(s) => s.snapshot.assets.length')).toBe(0);

    await driveMission1ToWin(page);

    // the victory card, and the campaign record that unlocks mission 2
    // (exact: the news ticker also celebrates, in lowercase)
    await expect(page.getByText('MISSION COMPLETE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Every home in Alderbrook is on supply/)).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => (localStorage.getItem('ec-campaign-v1') ?? '').includes('m1-first-light')),
      )
      .toBe(true);

    // back to the menu: mission 1 ticked, mission 2 unlocked
    await clickButton(page, 'back to menu');
    await expect.poll(() => store<boolean>(page, '(s) => s.menuOpen')).toBe(true);
    // the campaign list may still be expanded from earlier — only toggle
    // it open if it's closed
    const stepUp = page.getByRole('button', { name: /2\. Step Up/ });
    if ((await stepUp.count()) === 0) await clickButton(page, /campaign/);
    await expect(stepUp).toBeEnabled();
  });
});

test.describe('campaign on a phone held landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('mission steps render landscape; portrait raises the rotate prompt', async ({ page }) => {
    await startMission1(page);
    // landscape: mission strip on, rotate prompt off
    await expect(page.getByText(/FIRST LIGHT/)).toBeVisible();
    await expect(page.getByText('ROTATE YOUR PHONE')).toHaveCount(0);
    // turn the phone upright: the lofi rotate overlay takes the screen
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('ROTATE YOUR PHONE')).toBeVisible();
    // and clears the moment it rotates back
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByText('ROTATE YOUR PHONE')).toHaveCount(0);
  });
});

test.describe('mission screenshots (SHOTS=1)', () => {
  test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

  test('mission 1 mid-play, desktop viewport', async ({ page }) => {
    test.setTimeout(240_000);
    await startMission1(page);
    await driveMission1ToWin(page);
    await clickButton(page, 'keep playing'); // mid-play view, lights on
    await cmd(page, { type: 'setSpeed', speed: 1 });
    await page.evaluate(() => {
      window.__ec?.panTo(15, 12);
      window.__ec?.setZoom(0.6);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'preview/mission1-desktop.png' });
  });
});

test.describe('mission screenshots, phone landscape (SHOTS=1)', () => {
  test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('mission 1 mid-play at 844x390', async ({ page }) => {
    test.setTimeout(240_000);
    await startMission1(page);
    await driveMission1ToWin(page);
    await clickButton(page, 'keep playing'); // mid-play view, lights on
    await cmd(page, { type: 'setSpeed', speed: 1 });
    await page.evaluate(() => {
      window.__ec?.panTo(15, 12);
      window.__ec?.setZoom(0.5);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'preview/mission1-mobile.png' });
  });
});
