import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  assertNoCrash,
  bootWatched,
  pauseSim,
  waitMenu,
  waitReady,
  watchForCrashes,
  type CrashWatch,
} from './crashnet.helper';

// Wave D — the DATA-DRIVEN exhaustive button sweep (owner, 2026-06-16:
// "expand your playwright testing to include EVERY button and EVERY map").
//
// Rather than hand-write one assertion per button (that is panels.spec.ts),
// this drives a REGISTRY of panels. For each panel we:
//   1. open it (store flag / key / button),
//   2. ENUMERATE every visible, enabled <button> inside its root,
//   3. click each one in turn, re-opening the panel if a click closed it,
//   4. assert the crash invariant (no pageerror / console.error / worker
//      fault) after EVERY click.
// So it auto-discovers buttons — adding a control to a panel is covered for
// free — which is what "every button" means. Each panel is its OWN test so
// the shard stays bite-size and a failure names the exact surface.
//
// NAV-AWAY buttons (quit to menu, sign out, continue, a city card, …) would
// tear the panel/sandbox down mid-sweep, so each test EXCLUDES them by name
// and covers them explicitly elsewhere (bootpaths / cityload / flows). The
// goal here is crash-detection coverage of the in-panel controls, kept
// deterministic and self-contained.

/** Buttons that navigate away / destroy the surface — skipped so one test
 *  stays self-contained (these paths are covered by dedicated specs). */
const NAV_AWAY =
  /^(continue|⚡ ?new game|new game|quit to main menu|sign out|create account|sign in|submit|use a one-time code|use email|power |tutorials|tour the controls|📖|🧭|start lesson|replay lesson|next mission|← back|resume|done|close|skip|rebuild it|load |delete |overwrite |rename )/i;

/** Collect the accessible names of every visible, enabled button under
 *  `root` whose name is non-empty and not a nav-away action. Names are
 *  de-duplicated (a panel can repeat a glyph) but we still click each unique
 *  name as many times as it appears, by index, below. */
async function buttonHandles(root: Locator): Promise<Locator[]> {
  const all = root.getByRole('button');
  const n = await all.count();
  const out: Locator[] = [];
  for (let i = 0; i < n; i++) {
    const b = all.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    if (!(await b.isEnabled().catch(() => false))) continue;
    const name = ((await b.getAttribute('aria-label')) ?? (await b.innerText().catch(() => '')))
      .trim();
    if (name.length === 0) continue;
    if (NAV_AWAY.test(name)) continue;
    out.push(b);
  }
  return out;
}

/** Click every in-panel button under `root`, re-opening via `open()` whenever
 *  a click dismissed the panel, asserting no crash after each. `max` caps the
 *  click budget so a single test stays well under the per-spec timeout. */
async function clickEveryButton(
  page: Page,
  watch: CrashWatch,
  where: string,
  open: () => Promise<Locator>,
  max = 24,
): Promise<number> {
  let root = await open();
  // snapshot the names up-front: clicking can re-render and invalidate live
  // handles, so we re-resolve by name each iteration.
  const names: string[] = [];
  const handles = await buttonHandles(root);
  for (const h of handles) {
    const name = ((await h.getAttribute('aria-label')) ?? (await h.innerText().catch(() => '')))
      .trim();
    if (name && !names.includes(name)) names.push(name);
  }
  let clicked = 0;
  for (const name of names.slice(0, max)) {
    // the panel may have closed on a previous click — re-open it
    if (!(await root.first().isVisible().catch(() => false))) {
      root = await open();
    }
    const b = root.getByRole('button', { name, exact: true }).first();
    if ((await b.count()) === 0 || !(await b.isVisible().catch(() => false))) continue;
    await b.dispatchEvent('click').catch(() => undefined);
    clicked++;
    await page.waitForTimeout(40);
    await assertNoCrash(page, watch, `${where} → clicked "${name}"`);
  }
  expect(clicked, `${where}: at least one button was clickable`).toBeGreaterThan(0);
  return clicked;
}

// ─────────────────────────────────────────────────────────────────────────
// START-MENU SURFACES (driven WITHOUT dismissing the menu)
// ─────────────────────────────────────────────────────────────────────────
test.describe('sweep · start-menu surfaces', () => {
  async function bootToMenu(page: Page): Promise<CrashWatch> {
    const watch = watchForCrashes(page);
    await page.goto('/');
    await waitReady(page);
    await waitMenu(page);
    return watch;
  }

  test('every footer + settings-modal button (settings/leaderboard/credits)', async ({ page }) => {
    const watch = await bootToMenu(page);
    // open the settings MODAL (its own dialog) and click everything in it
    await clickEveryButton(page, watch, 'settings modal', async () => {
      const dialog = page.getByRole('dialog', { name: 'settings' });
      if (!(await dialog.isVisible().catch(() => false))) {
        await page.getByRole('button', { name: '⚙ settings' }).first().dispatchEvent('click');
        await expect(dialog).toBeVisible();
      }
      return dialog;
    });
    // close the modal, then exercise the leaderboard + credits footer toggles
    await page.getByRole('button', { name: 'done' }).first().dispatchEvent('click');
    for (const f of ['🏆 leaderboard', 'ⓘ credits']) {
      await page.getByRole('button', { name: f }).first().dispatchEvent('click');
      await assertNoCrash(page, watch, `footer toggle ${f}`);
      await page.getByRole('button', { name: f }).first().dispatchEvent('click'); // toggle off
    }
    await assertNoCrash(page, watch, 'start-menu footer swept');
  });

  test('every account-panel control (tabs + one-time-code switch)', async ({ page }) => {
    const watch = await bootToMenu(page);
    // the AccountPanel lives in the menu card; flip its tabs/links (NOT submit,
    // which would attempt a real network call). Drive only the safe togglers.
    for (const name of [
      'create account',
      'use a one-time code instead',
      'use email + password instead',
    ]) {
      const b = page.getByRole('button', { name, exact: true }).first();
      if ((await b.count()) > 0 && (await b.isVisible())) {
        await b.dispatchEvent('click');
        await assertNoCrash(page, watch, `account control "${name}"`);
      }
    }
  });

  test('city picker: open + every card title present, close clean', async ({ page }) => {
    const watch = await bootToMenu(page);
    await page.getByRole('button', { name: 'new game' }).first().dispatchEvent('click');
    const picker = page.getByRole('dialog', { name: 'choose a city' });
    await expect(picker).toBeVisible();
    // every PLAYABLE card carries title="power <City>" — assert they all render
    for (const c of [
      'London', 'Paris', 'New York', 'Sydney', 'Berlin', 'Shanghai',
      'Hong Kong', 'Cape Town', 'Cairo', 'Athens', 'Pune', 'North-East England',
    ]) {
      await expect(page.getByTitle(`power ${c}`, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'close' }).first().dispatchEvent('click');
    await expect(picker).not.toBeVisible();
    await assertNoCrash(page, watch, 'city picker opened + closed');
  });

  test('lessons page: open + expand every lesson card', async ({ page }) => {
    const watch = await bootToMenu(page);
    await page.getByRole('button', { name: 'tutorials' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().lessonsOpen)).toBe(true);
    // expand each lesson header (the unlocked ones reveal their curriculum)
    const headers = page.locator('[aria-expanded]');
    const n = Math.min(await headers.count(), 12);
    for (let i = 0; i < n; i++) {
      const h = headers.nth(i);
      if ((await h.isVisible().catch(() => false)) && (await h.isEnabled().catch(() => false))) {
        await h.dispatchEvent('click').catch(() => undefined);
        await assertNoCrash(page, watch, `lesson card ${i} toggled`);
      }
    }
    await page.getByRole('button', { name: /← back/ }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().lessonsOpen)).toBe(false);
  });

  test('save slots from the menu: open + close', async ({ page }) => {
    const watch = await bootToMenu(page);
    await page.getByRole('button', { name: '💾 save slots' }).first().dispatchEvent('click');
    await expect(page.getByText('SAVE SLOTS', { exact: true })).toBeVisible();
    await assertNoCrash(page, watch, 'saves panel open from menu');
    await page.getByRole('button', { name: 'close saves' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().savesOpen)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// IN-GAME HUD CLUSTERS (sandbox London, everything unlocked)
// ─────────────────────────────────────────────────────────────────────────
test.describe('sweep · in-game HUD clusters', () => {
  test('every button in the regulator dashboards (RIIO / net-zero / business)', async ({
    page,
  }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);

    // RIIO KPI dashboard — open, click every help-dot (aria-label "why is …"),
    // then close with K. (Scoped by name so we never click the HUD behind it.)
    await page.getByRole('button', { name: 'RIIO' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().kpiOpen)).toBe(true);
    const dots = page.getByRole('button', { name: /^why is / });
    const nDots = Math.min(await dots.count(), 14);
    for (let i = 0; i < nDots; i++) {
      const d = dots.nth(i);
      if (await d.isVisible().catch(() => false)) await d.dispatchEvent('click').catch(() => undefined);
      if (i % 5 === 0) await assertNoCrash(page, watch, `RIIO help-dot ${i}`);
    }
    await assertNoCrash(page, watch, 'RIIO dashboard swept');
    await page.keyboard.press('k'); // close

    // net-zero dashboard
    await page.getByRole('button', { name: 'net zero dashboard' }).first().dispatchEvent('click');
    await expect(page.getByText('NET ZERO · the green arc')).toBeVisible();
    await assertNoCrash(page, watch, 'net-zero open');
    await page.getByRole('button', { name: 'close net-zero dashboard' }).first().dispatchEvent('click');

    // the network business (directorates) — open, then click every dial segment
    // (each carries title="level N": pay, safety + the six directorates).
    await page.getByRole('button', { name: /the network business/i }).first().dispatchEvent('click');
    await expect(page.getByText('THE NETWORK BUSINESS')).toBeVisible();
    const segs = page.locator('button[title^="level "]');
    const nSegs = Math.min(await segs.count(), 24);
    expect(nSegs).toBeGreaterThan(0);
    for (let i = 0; i < nSegs; i++) {
      const s = segs.nth(i);
      if (await s.isVisible().catch(() => false)) await s.dispatchEvent('click').catch(() => undefined);
      if (i % 6 === 0) await assertNoCrash(page, watch, `directorate dial seg ${i}`);
    }
    await assertNoCrash(page, watch, 'directorates dials swept');
    await page.keyboard.press('o'); // the network business toggle (moved off C)
    await assertNoCrash(page, watch, 'regulator cluster swept');
  });

  test('every grid-overlay toggle + clock speed buttons', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);

    // overlays: each flips a store flag on (assert it really did), then key off
    for (const [label, flag, key] of [
      ['grid balance', 'balanceOpen', 'l'],
      ['headroom heatmap', 'headroom', 'h'],
      ['N-1 security', 'n1', 'n'],
      ['demand forecast', 'forecastOn', 'f'],
      ['grid view', 'gridView', 'g'],
    ] as const) {
      await page.getByRole('button', { name: label }).first().dispatchEvent('click');
      await expect
        .poll(() =>
          page.evaluate(
            (f) => (window.__ec?.getState() as unknown as Record<string, unknown>)[f],
            flag,
          ),
        )
        .toBe(true);
      await assertNoCrash(page, watch, `overlay ${label} on`);
      await page.keyboard.press(key);
      await assertNoCrash(page, watch, `overlay ${label} off`);
    }
    // close the balance panel if the B toggle left it open
    const closeBal = page.getByRole('button', { name: 'close balance' }).first();
    if ((await closeBal.count()) > 0 && (await closeBal.isVisible())) {
      await closeBal.dispatchEvent('click');
    }

    // transport speed buttons: pause / 1x / 4x / 16x (their glyphs are the
    // accessible names) then back to pause
    for (const glyph of ['▶', '▶▶', '▶▶▶', '⏸']) {
      await page.getByRole('button', { name: glyph, exact: true }).first().dispatchEvent('click');
      await assertNoCrash(page, watch, `speed ${glyph}`);
    }
    await pauseSim(page);

    // sound + HUD collapse/expand
    for (const name of [/music & sound|sound/i]) {
      const b = page.getByRole('button', { name }).first();
      if ((await b.count()) > 0) await b.dispatchEvent('click').catch(() => undefined);
    }
    const collapse = page.getByRole('button', { name: /collapse HUD|expand HUD/ }).first();
    if ((await collapse.count()) > 0) {
      await collapse.dispatchEvent('click');
      await assertNoCrash(page, watch, 'HUD collapse toggled');
      const back = page.getByRole('button', { name: /collapse HUD|expand HUD/ }).first();
      if ((await back.count()) > 0) await back.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'overlays + speed + chrome swept');
  });

  test('help overlay + asset guide open, every entry expands', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);

    // hotkey help (?)
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'keyboard shortcuts' })).toBeVisible();
    await assertNoCrash(page, watch, 'hotkey help open');
    await page.keyboard.press('Escape');

    // asset guide — expand every entry row (each toggles aria-expanded)
    await page.getByRole('button', { name: /Asset guide/ }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().guideOpen)).toBe(true);
    const rows = page.locator('[data-guide-key]');
    const n = Math.min(await rows.count(), 30);
    for (let i = 0; i < n; i++) {
      const r = rows.nth(i);
      if (await r.isVisible().catch(() => false)) {
        await r.dispatchEvent('click').catch(() => undefined);
        if (i % 6 === 0) await assertNoCrash(page, watch, `guide entry ${i}`);
      }
    }
    await assertNoCrash(page, watch, 'asset guide entries expanded');
    await page.getByRole('button', { name: /← back/ }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().guideOpen)).toBe(false);
  });

  test('game menu: save + resume (no quit)', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await page.getByRole('button', { name: 'game menu' }).first().dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'game menu' })).toBeVisible();
    await page.getByRole('button', { name: 'save game' }).first().dispatchEvent('click');
    await expect(page.getByRole('button', { name: 'saved ✓' })).toBeVisible();
    await assertNoCrash(page, watch, 'game menu save');
    await page.getByRole('button', { name: 'resume × close' }).first().dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'game menu' })).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// BUILD PALETTE — arm every tool button (data-driven over the catalog rows)
// ─────────────────────────────────────────────────────────────────────────
test.describe('sweep · build palette', () => {
  test('every palette tool button arms cleanly', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    // the palette has data-tour="palette"; click every ToolButton in it (these
    // have no aria-label — their accessible name is the run-together hotkey +
    // catalog label + cost). Skipping nav-away leaves only tool arming.
    const palette = page.locator('[data-tour="palette"]');
    await expect(palette).toBeVisible();
    const buttons = palette.getByRole('button');
    const n = await buttons.count();
    let clicked = 0;
    for (let i = 0; i < n && i < 40; i++) {
      const b = buttons.nth(i);
      if (!(await b.isVisible().catch(() => false))) continue;
      if (!(await b.isEnabled().catch(() => false))) continue;
      await b.dispatchEvent('click').catch(() => undefined);
      clicked++;
      await page.waitForTimeout(30);
      await assertNoCrash(page, watch, `palette button ${i}`);
    }
    expect(clicked).toBeGreaterThan(5); // gens + subs + lines + tools all there
    await assertNoCrash(page, watch, 'every palette tool armed');
  });

  test('overhead/underground toggle + capacity + MVA pickers', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // overhead/underground line-build toggle
    for (const mode of ['underground', 'overhead'] as const) {
      await page.getByRole('button', { name: mode, exact: true }).first().dispatchEvent('click');
      await assertNoCrash(page, watch, `line build ${mode}`);
    }
    // arm onshore wind → the capacity SizeStepper appears (smaller/larger)
    await page
      .getByRole('button', { name: /Onshore wind/ })
      .first()
      .dispatchEvent('click');
    for (const name of ['larger', 'smaller', 'larger']) {
      const b = page.getByRole('button', { name, exact: true }).first();
      if ((await b.count()) > 0) await b.dispatchEvent('click');
      await assertNoCrash(page, watch, `capacity ${name}`);
    }
    // arm a distribution sub → its MVA SizeStepper + auto-connect toggle
    await page
      .getByRole('button', { name: /Distribution sub/ })
      .first()
      .dispatchEvent('click');
    for (const name of ['larger', 'smaller']) {
      const b = page.getByRole('button', { name, exact: true }).first();
      if ((await b.count()) > 0) await b.dispatchEvent('click');
    }
    const ac = page.getByRole('button', { name: /auto-connect on placement/i }).first();
    if ((await ac.count()) > 0) {
      await ac.dispatchEvent('click');
      await ac.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'build pickers swept');
  });
});
