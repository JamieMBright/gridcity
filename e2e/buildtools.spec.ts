import { expect, test } from '@playwright/test';
import { assertNoCrash, bootWatched, pauseSim, tap } from './crashnet.helper';

// Exhaustive build-palette crash sweep (owner: "the build tool palette /
// catalog (every buildable — subs, lines/pylons at each voltage, every
// generator type, battery, etc.)"). Two layers:
//   1. ARM every catalog tool button (every gen, every sub, every line at
//      each voltage in both overhead+underground, depot, inspect, demolish)
//      and move the pointer over the map so the ghost-preview + suitability
//      mask paths run — these are render-heavy and crashed before (the
//      siting overlay walks every tile). Closing each via re-press.
//   2. PLACE a representative of each placeable asset class via the sim
//      command surface and assert the worker never faults.

// Literal palette labels (verified against src/sim/catalog.ts + BuildPalette).
const GEN_LABELS = [
  'Gas CCGT',
  'Gas peaker (OCGT)',
  'Solar farm',
  'Onshore wind',
  'Offshore wind',
  'Tidal stream',
  'Biomass CHP',
  'Nuclear',
  'Battery storage',
  'Coal station',
  'Interconnector (HVDC)',
  'Hydrogen electrolyser',
];
// Sub buttons show name.split(' (')[0]
const SUB_LABELS = [
  'Bulk supply point',
  'Grid substation',
  'Distribution substation',
  'Pole-mounted transformer',
  'Underground substation',
  'Capacitor bank',
];

test.describe('build palette — arm every tool (ghost + suitability render)', () => {
  test('arming every generator runs its ghost + siting overlay', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const [land] = await page.evaluate(() => window.__ec!.openLand(1));
    for (const label of GEN_LABELS) {
      await tap(page, label, true);
      // hover the map so the ghost preview + per-tile suitability mask build
      if (land) {
        await page.evaluate((t) => window.__ec!.panTo(t.x, t.y), land);
        const pos = await page.evaluate(
          (t) => window.__ec!.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
          land,
        );
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(60);
      }
      await assertNoCrash(page, watch, `armed generator: ${label}`);
    }
    // capacity picker appears for farms — nudge it (aria-label smaller/larger)
    await tap(page, 'Onshore wind', true);
    const larger = page.getByRole('button', { name: 'larger' }).first();
    const smaller = page.getByRole('button', { name: 'smaller' }).first();
    if ((await larger.count()) > 0) {
      await larger.dispatchEvent('click');
      await larger.dispatchEvent('click');
      await smaller.dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'capacity picker nudged');
  });

  test('arming every substation runs its ghost + auto-connect + MVA picker', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const [land] = await page.evaluate(() => window.__ec!.openLand(1));
    for (const label of SUB_LABELS) {
      await tap(page, label, true);
      if (land) {
        await page.evaluate((t) => window.__ec!.panTo(t.x, t.y), land);
        const pos = await page.evaluate(
          (t) => window.__ec!.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
          land,
        );
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(60);
      }
      await assertNoCrash(page, watch, `armed substation: ${label}`);
    }
    // auto-connect toggle + the dist MVA picker
    await page.getByRole('button', { name: /auto-connect on placement/i }).first().dispatchEvent('click');
    await page.getByRole('button', { name: /auto-connect on placement/i }).first().dispatchEvent('click');
    await tap(page, 'Distribution substation', true);
    const larger = page.getByRole('button', { name: 'larger' }).first();
    if ((await larger.count()) > 0) {
      await larger.dispatchEvent('click');
      await page.getByRole('button', { name: 'smaller' }).first().dispatchEvent('click');
    }
    await assertNoCrash(page, watch, 'auto-connect + MVA picker');
  });

  test('arming every line voltage in overhead AND underground', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    for (const mode of ['overhead', 'underground'] as const) {
      await page.getByRole('button', { name: mode, exact: true }).first().dispatchEvent('click');
      for (const lv of [400, 132, 33]) {
        const word = mode === 'underground' ? 'cable' : 'line';
        await tap(page, `${lv} kV ${word}`, true);
        await assertNoCrash(page, watch, `armed ${lv} kV ${word}`);
      }
    }
    // the U key flips overhead/underground on the armed line tool
    await page.keyboard.press('u');
    await assertNoCrash(page, watch, 'line tool U-toggle');
  });

  test('depot, inspect, demolish tools arm cleanly', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    for (const label of ['Field depot', 'Inspect', 'Demolish']) {
      await tap(page, label, true);
      await assertNoCrash(page, watch, `armed tool: ${label}`);
    }
  });
});

test.describe('build palette — place a representative of every asset class', () => {
  test('place each substation type (direct build) — no worker fault', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const base = await page.evaluate(() => window.__ec!.getState().snapshot!.assets.length);
    const subs = ['bulk', 'grid', 'dist', 'pole', 'capbank'] as const; // vault needs a big building
    const tiles = await page.evaluate((n) => window.__ec!.openLand(n), subs.length);
    let placed = 0;
    for (let i = 0; i < subs.length; i++) {
      const t = tiles[i];
      const sub = subs[i];
      if (!t || !sub) continue;
      await page.evaluate(
        (arg) =>
          window.__ec!.sendCommand({
            type: 'build',
            spec: { kind: 'sub', sub: arg.sub, x: arg.t.x, y: arg.t.y },
          }),
        { sub, t },
      );
      placed++;
      await page.waitForTimeout(120);
      await assertNoCrash(page, watch, `placed sub ${sub}`);
    }
    // at least the grid/dist/bulk subs land (pole/capbank may reject on terrain)
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.assets.length))
      .toBeGreaterThan(base);
    expect(placed).toBeGreaterThan(0);
  });

  test('place a depot, a battery, and an electrolyser (direct, no tender)', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const tiles = await page.evaluate(() => window.__ec!.openLand(8));
    // depot (direct), then player-owned non-tender gens (battery + electrolyser
    // build directly without a developer bid)
    const builds: Array<{ spec: Record<string, unknown>; note: string }> = [];
    if (tiles[0]) builds.push({ spec: { kind: 'depot', x: tiles[0].x, y: tiles[0].y }, note: 'depot' });
    if (tiles[1]) builds.push({ spec: { kind: 'gen', gen: 'battery', x: tiles[1].x, y: tiles[1].y }, note: 'battery' });
    if (tiles[2]) builds.push({ spec: { kind: 'gen', gen: 'electrolyser', x: tiles[2].x, y: tiles[2].y }, note: 'electrolyser' });
    for (const b of builds) {
      await page.evaluate((spec) => window.__ec!.sendCommand({ type: 'build', spec: spec as never }), b.spec);
      await page.waitForTimeout(150);
      await assertNoCrash(page, watch, `built ${b.note}`);
    }
    await assertNoCrash(page, watch, 'depot/battery/electrolyser placed');
  });

  test('place a line between two substations', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const tiles = await page.evaluate(() => window.__ec!.openLand(3));
    const t0 = tiles[0];
    const t1 = tiles[1];
    if (!t0 || !t1) return;
    // two grid subs (132 kV bays) so a 132 line can join them
    for (const t of [t0, t1]) {
      await page.evaluate(
        (tt) => window.__ec!.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: tt.x, y: tt.y } }),
        t,
      );
      await page.waitForTimeout(120);
    }
    const before = await page.evaluate(() => window.__ec!.getState().snapshot!.assets.length);
    await page.evaluate(
      (t) =>
        window.__ec!.sendCommand({
          type: 'build',
          spec: { kind: 'line', level: 132, build: 'overhead', ax: t.a.x, ay: t.a.y, bx: t.b.x, by: t.b.y },
        }),
      { a: t0, b: t1 },
    );
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.assets.length))
      .toBeGreaterThan(before);
    await assertNoCrash(page, watch, 'line placed between subs');
  });
});
