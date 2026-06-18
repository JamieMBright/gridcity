import { expect, test, type Page } from '@playwright/test';
import {
  assertNoCrash,
  bootWatched,
  pauseSim,
  tap,
  waitMenu,
  waitReady,
  watchForCrashes,
} from './crashnet.helper';

// Exhaustive panel/control crash sweep (owner: "Every panel / button / control
// — open + interact + close each, asserting no crash"). Each test opens a HUD
// surface, pokes its controls, closes it, and asserts the crash invariant
// (no pageerror / console.error / worker fault) throughout. Selectors are the
// literal aria-labels / text VERIFIED against this worktree's src/ui/*.

// ─────────────────────────────────────────────────────────────────────────
// START-MENU SURFACES (the front door — driven WITHOUT dismissing the menu)
// ─────────────────────────────────────────────────────────────────────────
test.describe('start menu surfaces', () => {
  async function bootToMenu(page: Page): Promise<ReturnType<typeof watchForCrashes>> {
    const watch = watchForCrashes(page);
    await page.goto('/');
    await waitReady(page);
    await waitMenu(page);
    return watch;
  }

  test('settings footer: toggle music/sfx + every colour-blind mode', async ({ page }) => {
    const watch = await bootToMenu(page);
    // settings is an inline footer toggle (not a modal): reveals audio +
    // colour-blind controls under the card
    await tap(page, '⚙ settings');
    // audio toggles flip their own label on/off — exercise both handlers
    for (const re of [/music o(n|ff)/i, /sfx o(n|ff)/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if ((await b.count()) > 0) await b.dispatchEvent('click');
    }
    // colour-blind modes — each repaints the renderer palette in place. The
    // aria-label is the FULL mode name (button text is the short form).
    for (const m of ['deuteranopia', 'protanopia', 'tritanopia', 'off']) {
      const b = page.getByRole('button', { name: `colour-blind ${m}` });
      await expect(b).toBeVisible();
      await b.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'settings footer interacted');
    await tap(page, '⚙ settings'); // toggle the footer back closed
    await assertNoCrash(page, watch, 'settings footer closed');
  });

  test('account panel: switch sign-in / create / one-time-code + fill inputs', async ({ page }) => {
    const watch = await bootToMenu(page);
    // create-account tab reveals the username field
    await tap(page, 'create account', true);
    await expect(page.getByRole('textbox', { name: 'username' })).toBeVisible();
    await page.getByRole('textbox', { name: 'email' }).fill('e2e@example.com');
    await page.getByRole('textbox', { name: 'username' }).fill('e2euser');
    await page.getByRole('textbox', { name: 'password' }).fill('secret123');
    // one-time-code fallback reveals the code flow
    await tap(page, 'use a one-time code instead');
    await expect(page.getByText(/one-time code|magic link/i)).toBeVisible();
    // back to password
    await tap(page, 'use email + password instead');
    await tap(page, 'sign in', true);
    await assertNoCrash(page, watch, 'account panel tabs + inputs');
  });

  test('leaderboard + credits footer toggles', async ({ page }) => {
    const watch = await bootToMenu(page);
    await tap(page, '🏆 leaderboard');
    await page.waitForTimeout(300);
    await tap(page, '🏆 leaderboard'); // toggle off
    await tap(page, 'ⓘ credits');
    await expect(page.getByText(/built with care/i)).toBeVisible();
    await tap(page, 'ⓘ credits');
    await assertNoCrash(page, watch, 'leaderboard/credits toggled');
  });

  test('tutorials → lessons page → expand a lesson → back', async ({ page }) => {
    const watch = await bootToMenu(page);
    await tap(page, 'tutorials');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().lessonsOpen)).toBe(true);
    await expect(page.getByText(/Learn the Grid/i)).toBeVisible();
    // expand the first lesson card (reveals its curriculum + start button)
    const first = page.getByRole('button', { name: /First Light/ }).first();
    if ((await first.count()) > 0) await first.dispatchEvent('click');
    await assertNoCrash(page, watch, 'lessons page open');
    await tap(page, /← back/);
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().lessonsOpen)).toBe(false);
    await assertNoCrash(page, watch, 'lessons page closed');
  });

  test('save slots panel from the menu: open + close', async ({ page }) => {
    const watch = await bootToMenu(page);
    await tap(page, '💾 save slots');
    // the heading is exactly "SAVE SLOTS"; exact-match avoids also matching the
    // menu's "💾 save slots" button (substring/case-insensitive otherwise).
    await expect(page.getByText('SAVE SLOTS', { exact: true })).toBeVisible();
    await assertNoCrash(page, watch, 'saves panel open from menu');
    await page.getByRole('button', { name: 'close saves' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().savesOpen)).toBe(false);
    await assertNoCrash(page, watch, 'saves panel closed');
  });

  test('city picker opens from new game and closes via ×', async ({ page }) => {
    const watch = await bootToMenu(page);
    await tap(page, 'new game');
    const picker = page.getByRole('dialog', { name: 'choose a city' });
    await expect(picker).toBeVisible();
    // every playable card carries title="power <City>"
    for (const c of ['London', 'Paris', 'New York', 'North-East England']) {
      await expect(page.getByTitle(`power ${c}`, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'close' }).first().dispatchEvent('click');
    await expect(picker).not.toBeVisible();
    await assertNoCrash(page, watch, 'city picker opened+closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// IN-GAME HUD PANELS (sandbox London; everything unlocked)
// ─────────────────────────────────────────────────────────────────────────
test.describe('in-game HUD panels', () => {
  test('regulator cluster: RIIO/KPI, net-zero, directorates open + close', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);

    // RIIO KPI dashboard (button text "RIIO") + the K key
    await tap(page, 'RIIO');
    await expect(page.getByText(/RIIO-1 · year/)).toBeVisible();
    await assertNoCrash(page, watch, 'KPI dashboard open');
    await page.keyboard.press('k');
    await expect(page.getByText(/RIIO-1 · year/)).not.toBeVisible();

    // net-zero dashboard
    await tap(page, 'net zero dashboard');
    await expect(page.getByText('NET ZERO · the green arc')).toBeVisible();
    await assertNoCrash(page, watch, 'net-zero open');
    await page.getByRole('button', { name: 'close net-zero dashboard' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().netZeroOpen)).toBe(false);

    // directorates / the network business (button title + the C key)
    await page.getByRole('button', { name: /the network business/i }).first().dispatchEvent('click');
    await expect(page.getByText('THE NETWORK BUSINESS')).toBeVisible();
    await assertNoCrash(page, watch, 'directorates open');
    await page.keyboard.press('c');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().directoratesOpen)).toBe(false);
  });

  test('directorates: nudge the directorate + pay + safety dials', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await page.keyboard.press('c');
    await expect(page.getByText('THE NETWORK BUSINESS')).toBeVisible();
    // every dial is a row of segmented level buttons; each segment shows its
    // number as text but carries title="level {i}" (the peak marker has a
    // different title). Target by the title so we click the REAL segments
    // across pay, safety and all six directorates.
    const levelBtns = page.locator('button[title^="level "]');
    const n = Math.min(await levelBtns.count(), 16);
    expect(n).toBeGreaterThan(0); // the dials really rendered
    for (let i = 0; i < n; i++) await levelBtns.nth(i).dispatchEvent('click');
    await assertNoCrash(page, watch, 'directorates dials exercised');
    // close via the ✕
    await page.getByRole('button', { name: '✕', exact: true }).first().dispatchEvent('click');
    await assertNoCrash(page, watch, 'directorates closed');
  });

  test('grid overlays: balance, headroom, N-1, forecast, grid view (button + key)', async ({
    page,
  }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);

    await tap(page, 'grid balance');
    await expect(page.getByText('⚖ GRID BALANCE')).toBeVisible();
    const refresh = page.getByRole('button', { name: 'refresh' }).first();
    if ((await refresh.count()) > 0) await refresh.dispatchEvent('click');
    await assertNoCrash(page, watch, 'balance panel open');
    await page.getByRole('button', { name: 'close balance' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().balanceOpen)).toBe(false);

    for (const [label, flag, key] of [
      ['headroom heatmap', 'headroom', 'h'],
      ['N-1 security', 'n1', 'n'],
      ['demand forecast', 'forecastOn', 'f'],
      ['grid view', 'gridView', 'g'],
    ] as const) {
      await tap(page, label);
      await expect
        .poll(() => page.evaluate((f) => (window.__ec?.getState() as unknown as Record<string, unknown>)[f], flag))
        .toBe(true);
      await page.keyboard.press(key); // toggle back off
      await expect
        .poll(() => page.evaluate((f) => (window.__ec?.getState() as unknown as Record<string, unknown>)[f], flag))
        .toBe(false);
      await assertNoCrash(page, watch, `overlay ${label} toggled`);
    }
  });

  test('hotkey help overlay opens with ? and closes with Escape', async ({ page }) => {
    const watch = await bootWatched(page);
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'keyboard shortcuts' })).toBeVisible();
    await assertNoCrash(page, watch, 'hotkey help open');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'keyboard shortcuts' })).not.toBeVisible();
  });

  test('asset guide opens from the palette and closes', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await tap(page, /Asset guide/);
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().guideOpen)).toBe(true);
    await expect(page.getByText(/Know Your Kit/i)).toBeVisible();
    // expand an entry or two (each toggles aria-expanded)
    const rows = page.getByRole('button', { name: /Gas CCGT|Battery|Grid substation/ });
    const n = Math.min(await rows.count(), 3);
    for (let i = 0; i < n; i++) await rows.nth(i).dispatchEvent('click');
    await assertNoCrash(page, watch, 'asset guide open');
    await tap(page, /← back/);
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().guideOpen)).toBe(false);
  });

  test('game menu (Esc / wordmark): save game, resume', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await page.getByRole('button', { name: 'game menu' }).first().dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'game menu' })).toBeVisible();
    await tap(page, 'save game');
    await expect(page.getByRole('button', { name: 'saved ✓' })).toBeVisible();
    await assertNoCrash(page, watch, 'game menu save');
    await tap(page, 'resume × close');
    await expect(page.getByRole('dialog', { name: 'game menu' })).not.toBeVisible();
  });

  test('saves panel in-game: save a slot, then load it', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await page.getByRole('button', { name: 'save slots' }).first().dispatchEvent('click');
    await expect(page.getByText('SAVE SLOTS')).toBeVisible();
    const nameBox = page.getByRole('textbox').first();
    await nameBox.fill('crash-net slot');
    await page.getByRole('button', { name: 'save to a new slot' }).dispatchEvent('click');
    await expect(page.getByText(/saved/)).toBeVisible();
    await page.getByRole('button', { name: 'load crash-net slot' }).first().dispatchEvent('click');
    await assertNoCrash(page, watch, 'saves panel save+load');
  });

  test('inbox: collapse/expand + levy steppers', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await expect(page.getByText('INBOX')).toBeVisible();
    // the levy steppers live in the bill breakdown (collapsed by default)
    await page.getByRole('button', { name: 'show bill breakdown' }).first().dispatchEvent('click');
    await page.getByRole('button', { name: 'levy up' }).dispatchEvent('click');
    await page.getByRole('button', { name: 'levy down' }).dispatchEvent('click');
    // collapse + re-expand the inbox header
    await page.getByText('INBOX').dispatchEvent('click');
    await page.getByText('INBOX').dispatchEvent('click');
    await assertNoCrash(page, watch, 'inbox collapse + levy');
  });

  test('bill panel: trend toggle + a line-item drill-down', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await expect(page.getByText(/AVG ANNUAL BILL/)).toBeVisible();
    // breakdown is collapsed by default — open it before exercising rows
    await page.getByRole('button', { name: 'show bill breakdown' }).first().dispatchEvent('click');
    const trend = page.getByRole('button', { name: /bill trend/i }).first();
    if ((await trend.count()) > 0) {
      await trend.dispatchEvent('click');
      await page.waitForTimeout(300);
      await trend.dispatchEvent('click');
    }
    // tap an itemisable bill row to drill into its breakdown
    const item = page.getByRole('button', { name: /itemise/i }).first();
    if ((await item.count()) > 0) {
      await item.dispatchEvent('click');
      await page.waitForTimeout(200);
    }
    await assertNoCrash(page, watch, 'bill panel trend + drill-down');
  });

  test('minimap + camera bookmarks open and close', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // minimap toggle (open/collapse)
    const openMap = page.getByRole('button', { name: 'open minimap' }).first();
    if ((await openMap.count()) > 0) {
      await openMap.dispatchEvent('click');
      const closeMap = page.getByRole('button', { name: 'collapse minimap' }).first();
      if ((await closeMap.count()) > 0) await closeMap.dispatchEvent('click');
    } else {
      // already open: collapse then re-open
      const closeMap = page.getByRole('button', { name: 'collapse minimap' }).first();
      if ((await closeMap.count()) > 0) await closeMap.dispatchEvent('click');
    }
    // camera bookmarks
    const bm = page.getByRole('button', { name: 'camera bookmarks' }).first();
    if ((await bm.count()) > 0) {
      await bm.dispatchEvent('click');
      const save = page.getByRole('button', { name: /save current view/i }).first();
      if ((await save.count()) > 0) await save.dispatchEvent('click');
      const closeBm = page.getByRole('button', { name: 'close bookmarks' }).first();
      if ((await closeBm.count()) > 0) await closeBm.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'minimap + bookmarks');
  });

  test('undo / redo controls + the history list', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // place a sub so there's something to undo
    const tiles = await page.evaluate(() => window.__ec!.openLand(1));
    const a = tiles[0];
    if (a) {
      await page.evaluate(
        (t) => window.__ec!.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } }),
        a,
      );
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: 'undo' }).first().dispatchEvent('click');
    await page.getByRole('button', { name: 'redo' }).first().dispatchEvent('click');
    const hist = page.getByRole('button', { name: 'action history' }).first();
    if ((await hist.count()) > 0) await hist.dispatchEvent('click');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    await assertNoCrash(page, watch, 'undo/redo + history');
  });

  test('skip-time buttons (+7d / +30d) fast-forward without crashing', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const t0 = await page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin);
    await page.getByRole('button', { name: 'skip 7 days' }).first().dispatchEvent('click');
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin), {
        timeout: 30_000,
      })
      .toBeGreaterThan(t0 + 6 * 1440 - 60);
    const t1 = await page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin);
    await page.getByRole('button', { name: 'skip 30 days' }).first().dispatchEvent('click');
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin), {
        timeout: 30_000,
      })
      .toBeGreaterThan(t1 + 6 * 1440);
    await assertNoCrash(page, watch, 'skip 7d + 30d');
  });

  test('photo mode hides chrome and restores on Escape', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    const photo = page.getByRole('button', { name: /photo mode|hide hud/i }).first();
    if ((await photo.count()) > 0) {
      await photo.dispatchEvent('click');
      await expect.poll(() => page.evaluate(() => window.__ec?.getState().photoMode)).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => window.__ec?.getState().photoMode)).toBe(false);
    }
    await assertNoCrash(page, watch, 'photo mode toggled');
  });
});
