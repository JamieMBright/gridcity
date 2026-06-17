import { expect, test, type Page } from '@playwright/test';
import { assertNoCrash, bootWatched, pauseSim, type CrashWatch } from './crashnet.helper';

// Wave D — DEEP in-game panel sweep. The button registry in
// sweep-buttons.spec.ts covers panels that open from a clean sandbox; THIS
// spec covers the surfaces that need state to exist first:
//   • the tile INSPECTOR (InfoPanel) action buttons — only render once an
//     asset / line is SELECTED (re-conductor, underground, veg-cut, demolish,
//     replace, maintenance, battery policy, GIS rebuild, the MVA sizer). None
//     of these were driven by the pre-existing net — the biggest gap.
//   • the FleetPanel ± steppers + tree-cutting policy buttons.
//   • the filterable EVENT LOG (needs events to accrue): category chips,
//     search box, snooze / acknowledge.
//   • BalancePanel plan-works / smart-charging, BillPanel trend + itemise
//     drill-down + levy, TemplatePaste save/stamp, and search-to-fly.
//     (RIIO help-dots + directorate dials live in sweep-buttons.)
// After every interaction we assert the crash invariant. Each test is its own
// bite-size case so the shard runner stays snappy and a failure is pinpointed.

const cmd = (page: Page, c: unknown): Promise<void> =>
  page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);

/** Select an asset / line for the InfoPanel via the store (the same call the
 *  inspect click makes). The InfoPanel renders off selectedAsset/selectedLine. */
async function select(
  page: Page,
  sel: {
    assetId?: number | undefined;
    lineId?: number | undefined;
    at?: { x: number; y: number } | undefined;
  },
): Promise<void> {
  await page.evaluate((s) => window.__ec!.getState().setSelected(s as never), sel);
  await page.waitForTimeout(80);
}

/** Click a button whose accessible name CONTAINS `re` (the inspector actions
 *  carry live cost suffixes, so an exact match never hits). No-op if absent
 *  (an action only shows under the right condition). Returns whether clicked. */
async function clickIfPresent(
  page: Page,
  watch: CrashWatch,
  re: RegExp,
  where: string,
): Promise<boolean> {
  const b = page.getByRole('button', { name: re }).first();
  if ((await b.count()) === 0 || !(await b.isVisible().catch(() => false))) return false;
  await b.dispatchEvent('click').catch(() => undefined);
  await page.waitForTimeout(60);
  await assertNoCrash(page, watch, where);
  return true;
}

test.describe('sweep · tile inspector action buttons', () => {
  test('inspect a substation: MVA sizer + GIS rebuild (non-destructive first)', async ({
    page,
  }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const [t] = await page.evaluate(() => window.__ec!.openLand(1));
    if (!t) return;
    await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } });
    await page.waitForTimeout(150);
    const subId = await page.evaluate(
      (tt) =>
        window.__ec!.getState().snapshot!.assets.find(
          (a) => a.kind === 'sub' && a.x === tt.x && a.y === tt.y,
        )?.id,
      t,
    );
    expect(subId).toBeDefined();
    await select(page, { assetId: subId });

    // the MVA reinforcement sizer: auto-toggle, then bigger / smaller
    await clickIfPresent(page, watch, /auto reinforcement/i, 'sub: auto reinforcement');
    await clickIfPresent(page, watch, /bigger transformer/i, 'sub: bigger transformer');
    await clickIfPresent(page, watch, /smaller transformer/i, 'sub: smaller transformer');
    // the range slider
    const slider = page.getByRole('slider', { name: /transformer MVA/i }).first();
    if ((await slider.count()) > 0 && (await slider.isVisible())) {
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await assertNoCrash(page, watch, 'sub: MVA slider nudged');
    }
    // compare toggle (arms compare-pick) + close it
    await clickIfPresent(page, watch, /compare with another/i, 'sub: compare-pick armed');
    // GIS underground rebuild (a real sendCommand; mutates but no crash)
    await clickIfPresent(page, watch, /rebuild underground \(GIS\)/i, 'sub: GIS rebuild');
    await assertNoCrash(page, watch, 'substation inspector swept');
  });

  test('inspect a line: re-conductor / underground / veg-cut / demolish', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const tiles = await page.evaluate(() => window.__ec!.openLand(2));
    const t0 = tiles[0];
    const t1 = tiles[1];
    if (!t0 || !t1) return;
    for (const t of [t0, t1]) {
      await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: t.x, y: t.y } });
      await page.waitForTimeout(100);
    }
    await cmd(page, {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: t0.x, ay: t0.y, bx: t1.x, by: t1.y },
    });
    await page.waitForTimeout(150);
    const lineId = await page.evaluate(
      () => window.__ec!.getState().snapshot!.assets.find((a) => a.kind === 'line')?.id,
    );
    expect(lineId).toBeDefined();
    // select the line (mid-span point helps the span-underground quote)
    const mid = { x: Math.round((t0.x + t1.x) / 2), y: Math.round((t0.y + t1.y) / 2) };
    await select(page, { lineId, at: mid });

    // upgrades (overhead line) — each is a real command; assert no crash
    await clickIfPresent(page, watch, /re-conductor \(\+30% rating\)/i, 'line: re-conductor');
    await clickIfPresent(page, watch, /underground this span/i, 'line: underground span');
    await clickIfPresent(page, watch, /underground the whole line/i, 'line: underground whole');
    await clickIfPresent(page, watch, /emergency veg cut/i, 'line: veg cut');
    // demolish LAST (removes the line + may cascade)
    await clickIfPresent(page, watch, /demolish line/i, 'line: demolish');
    await assertNoCrash(page, watch, 'line inspector swept');
  });

  test('inspect a battery: cycle every battery policy', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const [t] = await page.evaluate(() => window.__ec!.openLand(1));
    if (!t) return;
    // a battery builds directly (no tender) — player-owned
    await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'battery', x: t.x, y: t.y } });
    await page.waitForTimeout(150);
    const battId = await page.evaluate(
      (tt) =>
        window.__ec!.getState().snapshot!.assets.find(
          (a) => a.kind === 'gen' && a.x === tt.x && a.y === tt.y,
        )?.id,
      t,
    );
    if (battId === undefined) return; // siting may reject — tolerated
    await select(page, { assetId: battId });
    for (const policy of ['shave', 'arbitrage', 'reserve']) {
      const b = page.getByRole('button', { name: `battery policy ${policy}` }).first();
      if ((await b.count()) > 0 && (await b.isVisible())) {
        await b.dispatchEvent('click');
        await assertNoCrash(page, watch, `battery policy ${policy}`);
      }
    }
  });
});

test.describe('sweep · operational panels', () => {
  test('fleet panel: ± steppers + every tree-cutting policy', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // the FleetPanel renders in the desktop left rail (data-spot="hud:fleet")
    const fleet = page.locator('[data-spot="hud:fleet"]');
    await expect(fleet).toBeVisible();
    // ± steppers
    for (const name of ['+', '+', '−', '+']) {
      await fleet.getByRole('button', { name, exact: true }).first().dispatchEvent('click');
      await assertNoCrash(page, watch, `fleet stepper ${name}`);
    }
    // every tree-cutting policy button (VEG_POLICY names) — click each by index
    const policies = fleet.getByRole('button');
    const n = await policies.count();
    for (let i = 0; i < n; i++) {
      const b = policies.nth(i);
      const name = (await b.innerText().catch(() => '')).trim();
      if (name === '+' || name === '−' || name === '') continue;
      await b.dispatchEvent('click').catch(() => undefined);
      await assertNoCrash(page, watch, `veg policy "${name}"`);
    }
  });

  test('event log: open, every category filter, clear, search, snooze/ack', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    // accrue some events: run the clock under a stormy regime so faults/weather
    // headlines land (the AlertsFeed only mounts when events exist).
    await page.evaluate(() =>
      window.__ec!.setAtmosphere(2 * 60, { cloud: 0.9, wind: 0.92, regime: 'windy-wet' }),
    );
    await cmd(page, { type: 'setSpeed', speed: 16 });
    await page
      .waitForFunction(() => (window.__ec!.getState().snapshot!.events.length ?? 0) > 0, undefined, {
        timeout: 45_000,
      })
      .catch(() => undefined);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    await page.evaluate(() => window.__ec!.setAtmosphere());

    // open the full filterable log via the store
    await page.evaluate(() => window.__ec!.getState().setEventLogOpen(true));
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().eventLogOpen)).toBe(true);
    await assertNoCrash(page, watch, 'event log open');

    // every category chip (faults/planning/weather/market/finance) toggles a filter
    for (const c of ['faults', 'planning', 'weather', 'market', 'finance']) {
      const chip = page.getByRole('button', { name: c, exact: true }).first();
      if ((await chip.count()) > 0 && (await chip.isVisible())) {
        await chip.dispatchEvent('click');
        await assertNoCrash(page, watch, `event filter ${c}`);
      }
    }
    // clear filters
    const clear = page.getByRole('button', { name: 'clear', exact: true }).first();
    if ((await clear.count()) > 0 && (await clear.isVisible())) {
      await clear.dispatchEvent('click');
      await assertNoCrash(page, watch, 'event filters cleared');
    }
    // search box
    const search = page.getByRole('textbox', { name: 'search events' }).first();
    if ((await search.count()) > 0) {
      await search.fill('storm');
      await page.waitForTimeout(120);
      await search.fill('');
      await assertNoCrash(page, watch, 'event search typed');
    }
    // snooze + acknowledge the first row, if any
    for (const name of ['snooze', 'acknowledge']) {
      const b = page.getByRole('button', { name, exact: true }).first();
      if ((await b.count()) > 0 && (await b.isVisible())) {
        await b.dispatchEvent('click');
        await assertNoCrash(page, watch, `event ${name}`);
      }
    }
    // close
    await page.getByRole('button', { name: 'close event log' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().eventLogOpen)).toBe(false);
    await assertNoCrash(page, watch, 'event log swept + closed');
  });

  test('balance panel: refresh + plan-works / smart-charging buttons + close', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await page.getByRole('button', { name: 'grid balance' }).first().dispatchEvent('click');
    await expect(page.getByText('⚖ GRID BALANCE')).toBeVisible();
    // refresh
    const refresh = page.getByRole('button', { name: 'refresh' }).first();
    if ((await refresh.count()) > 0) await refresh.dispatchEvent('click');
    await assertNoCrash(page, watch, 'balance refresh');
    // "plan works for …" + "fund smart charging …" buttons (each opens a costed
    // plan / toggles a council programme — a real command path). Click any that
    // render (a day-0 grid may have no shortfalls, which is fine).
    for (const re of [/^plan works for /, /smart charging/i]) {
      const btns = page.getByRole('button', { name: re });
      const n = Math.min(await btns.count(), 3);
      for (let i = 0; i < n; i++) {
        const b = btns.nth(i);
        if (await b.isVisible().catch(() => false)) {
          await b.dispatchEvent('click').catch(() => undefined);
          await assertNoCrash(page, watch, `balance "${re}" ${i}`);
        }
      }
    }
    // approve the first reinforcement option if a plan opened
    const approve = page.getByRole('button', { name: 'approve' }).first();
    if ((await approve.count()) > 0 && (await approve.isVisible().catch(() => false))) {
      await approve.dispatchEvent('click').catch(() => undefined);
      await assertNoCrash(page, watch, 'balance plan approved');
    }
    await page.getByRole('button', { name: 'close balance' }).first().dispatchEvent('click');
    await expect.poll(() => page.evaluate(() => window.__ec?.getState().balanceOpen)).toBe(false);
  });

  test('bill panel: trend + band isolate + itemise drill-down', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    await expect(page.getByText(/AVG ANNUAL BILL/)).toBeVisible();
    // trend toggle
    const trend = page.getByRole('button', { name: /bill trend/i }).first();
    if ((await trend.count()) > 0) {
      await trend.dispatchEvent('click');
      await page.waitForTimeout(150);
      await assertNoCrash(page, watch, 'bill trend open');
    }
    // itemise rows (aria-label "itemise <label>") — expand each, then any jump
    const rows = page.getByRole('button', { name: /^itemise / });
    const n = Math.min(await rows.count(), 6);
    for (let i = 0; i < n; i++) {
      const r = rows.nth(i);
      if (await r.isVisible().catch(() => false)) {
        await r.dispatchEvent('click').catch(() => undefined);
        await assertNoCrash(page, watch, `bill itemise row ${i}`);
      }
    }
    // levy steppers
    for (const name of ['levy up', 'levy down']) {
      const b = page.getByRole('button', { name, exact: true }).first();
      if ((await b.count()) > 0) await b.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'bill panel swept');
  });

});

test.describe('sweep · misc surfaces', () => {
  test('template paste: save a template then stamp + cancel', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    // place a couple of subs so a template can be captured
    const tiles = await page.evaluate(() => window.__ec!.openLand(2));
    for (const t of tiles.slice(0, 2)) {
      await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: t.x, y: t.y } });
      await page.waitForTimeout(120);
    }
    // the "+ save my last N builds as a template" button (text varies with count)
    const save = page.getByRole('button', { name: /save my last .*as a template/i }).first();
    if ((await save.count()) > 0 && (await save.isEnabled())) {
      await save.dispatchEvent('click');
      // the inline name field appears (the only text input in the palette);
      // type + confirm via its "save" button
      const name = page.getByRole('textbox').last();
      if ((await name.count()) > 0) {
        await name.fill('sweep-tpl');
        await page.getByRole('button', { name: 'save', exact: true }).first().dispatchEvent('click');
        await assertNoCrash(page, watch, 'template saved');
      }
      // stamp it: the template button is "⊞ sweep-tpl"
      const stamp = page.getByRole('button', { name: /sweep-tpl/ }).first();
      if ((await stamp.count()) > 0) {
        await stamp.dispatchEvent('click');
        await assertNoCrash(page, watch, 'template paste armed');
        // cancel the paste
        const cancel = page.getByRole('button', { name: 'cancel paste' }).first();
        if ((await cancel.count()) > 0) await cancel.dispatchEvent('click');
      }
      // clean up: delete the template
      const del = page.getByRole('button', { name: /delete template sweep-tpl/ }).first();
      if ((await del.count()) > 0) await del.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'template section swept');
  });

  test('search-to-fly: type a place and fly the camera there', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // `/` summons the search box (desktop top bar also has the 🔍 button)
    await page.keyboard.press('/');
    const box = page.getByRole('textbox', { name: 'search the map' }).first();
    if ((await box.count()) === 0) {
      // fall back to the 🔍 button
      const btn = page.getByRole('button', { name: /Search the map/i }).first();
      if ((await btn.count()) > 0) await btn.dispatchEvent('click');
    }
    const box2 = page.getByRole('textbox', { name: 'search the map' }).first();
    if ((await box2.count()) > 0) {
      await box2.fill('Watford');
      await page.waitForTimeout(150);
      await box2.press('Enter');
      await assertNoCrash(page, watch, 'search-to-fly flew');
    }
    await assertNoCrash(page, watch, 'search box swept');
  });
});
