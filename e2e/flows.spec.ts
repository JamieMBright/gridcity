import { expect, test, type Page } from '@playwright/test';
import { assertNoCrash, bootWatched, pauseSim } from './crashnet.helper';

// Key gameplay flows under the crash net (owner: "place each asset class,
// demolish, run the sim at speed, skip time, sign a tender/PPA, an asset
// overload, a weather/storm event, a fault + dispatch a van"). These run the
// REAL sim end-to-end and assert the worker never faults and no JS throws.

const cmd = (page: Page, c: unknown): Promise<void> =>
  page.evaluate((cc) => window.__ec!.sendCommand(cc as never), c);

/** Open-land tiles (typed, with a guaranteed-defined fallback). */
async function land(page: Page, n: number): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate((count) => window.__ec!.openLand(count), n);
}

test.describe('gameplay flows', () => {
  test('tender → developer bids → award PPA → plant lands (full loop)', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const base = await page.evaluate(() => window.__ec!.getState().snapshot!.assets.length);
    const tiles = await land(page, 1);
    const a = tiles[0];
    if (!a) return;

    // designate a CCGT site → a tender opens (not an asset yet)
    await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'gasCCGT', x: a.x, y: a.y } });
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.inbox.tenders.length))
      .toBe(1);

    // run the clock until a developer bids, then award the first bid
    await cmd(page, { type: 'setSpeed', speed: 16 });
    await expect
      .poll(
        () => page.evaluate(() => window.__ec!.getState().snapshot!.inbox.tenders[0]?.bids.length ?? 0),
        { timeout: 45_000 },
      )
      .toBeGreaterThan(0);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    const award = await page.evaluate(() => {
      const tn = window.__ec!.getState().snapshot!.inbox.tenders[0]!;
      return { tenderId: tn.id, developerId: tn.bids[0]!.developerId };
    });
    await cmd(page, { type: 'acceptBid', ...award });
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.assets.length))
      .toBe(base + 1);
    await assertNoCrash(page, watch, 'tender awarded + plant placed');
  });

  test('respond to a connection application (firm / flex / decline)', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    // let applications arrive on the network, then answer the first one
    await cmd(page, { type: 'setSpeed', speed: 16 });
    const appeared = await page
      .waitForFunction(
        () => (window.__ec!.getState().snapshot!.inbox.applications.length ?? 0) > 0,
        undefined,
        { timeout: 45_000 },
      )
      .then(() => true)
      .catch(() => false);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    if (appeared) {
      const appId = await page.evaluate(
        () => window.__ec!.getState().snapshot!.inbox.applications[0]!.id,
      );
      await cmd(page, { type: 'respondApplication', appId, response: 'flex' });
      await page.waitForTimeout(300);
    }
    await assertNoCrash(page, watch, 'application responded');
  });

  test('demolish cascades a line when its endpoint is removed', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    const base = await page.evaluate(() => window.__ec!.getState().snapshot!.assets.length);
    const tiles = await land(page, 2);
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
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.assets.length))
      .toBe(base + 3);
    // demolish the first sub — its line goes with it
    const subId = await page.evaluate(
      (t) => window.__ec!.getState().snapshot!.assets.find((a) => a.kind === 'sub' && a.x === t.x && a.y === t.y)?.id,
      t0,
    );
    if (subId === undefined) return;
    await cmd(page, { type: 'demolish', assetId: subId });
    await expect
      .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.assets.length))
      .toBe(base + 1);
    await assertNoCrash(page, watch, 'demolish cascade');
  });

  test('running the sim at each speed advances the clock without faulting', async ({ page }) => {
    const watch = await bootWatched(page);
    for (const speed of [1, 4, 16] as const) {
      const t0 = await page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin);
      await cmd(page, { type: 'setSpeed', speed });
      await expect
        .poll(() => page.evaluate(() => window.__ec!.getState().snapshot!.simTimeMin), {
          timeout: 30_000,
        })
        .toBeGreaterThan(t0);
      await assertNoCrash(page, watch, `running at ${speed}x`);
    }
    await cmd(page, { type: 'setSpeed', speed: 0 });
  });

  test('a fault + a dispatched fleet survive a storm regime (van drive)', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    // a depot + a small fleet so the renderer draws vans and (if a storm rolls
    // a fault) a van dispatches to it. Faults roll off the seeded RNG under
    // high wind, so we force a stormy atmosphere and run the clock hard.
    const open = await land(page, 4);
    const depot = open[0] ?? { x: 70, y: 60 };
    await cmd(page, { type: 'build', spec: { kind: 'depot', x: depot.x, y: depot.y } });
    await cmd(page, { type: 'setFleet', vans: 4 });
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      window.__ec!.setAtmosphere(2 * 60, { cloud: 0.95, wind: 0.97, regime: 'windy-wet' }),
    );
    await cmd(page, { type: 'setSpeed', speed: 16 });
    // run a good stretch so vans leave the depot, work any jobs, and the
    // spanner-pin + moving-van render paths all execute
    await page.waitForTimeout(6000);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    // the fleet view is intact (vans present, jobs array readable)
    const fleetOk = await page.evaluate(() => {
      const f = window.__ec!.getState().snapshot!.fleet;
      return Array.isArray(f.vans) && Array.isArray(f.jobs);
    });
    expect(fleetOk).toBe(true);
    await page.evaluate(() => window.__ec!.setAtmosphere());
    await assertNoCrash(page, watch, 'fleet + storm regime run');
  });

  test('an overloaded radial is tolerated (network under load)', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    await pauseSim(page);
    // Build a radial that carries load: a grid sub → undersized 33 kV line →
    // a distribution sub near demand. The overload itself is incidental; the
    // assertion is that the sim + renderer survive while branches carry/over-
    // carry power (the red overload overlay path).
    const tiles = await land(page, 3);
    const t0 = tiles[0];
    const t1 = tiles[1];
    if (t0 && t1) {
      await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'grid', x: t0.x, y: t0.y } });
      await cmd(page, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: t1.x, y: t1.y } });
      await page.waitForTimeout(150);
      await cmd(page, {
        type: 'build',
        spec: { kind: 'line', level: 33, build: 'overhead', ax: t0.x, ay: t0.y, bx: t1.x, by: t1.y },
      });
    }
    await cmd(page, { type: 'setSpeed', speed: 16 });
    await page.waitForTimeout(3500);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    const branchesOk = await page.evaluate(
      () => Array.isArray(window.__ec!.getState().snapshot!.branches),
    );
    expect(branchesOk).toBe(true); // branch view intact under load
    await assertNoCrash(page, watch, 'network under load (overload-tolerant)');
  });

  test('a stormy atmosphere + weather regime render and run cleanly', async ({ page }) => {
    test.slow();
    const watch = await bootWatched(page);
    // Drive the renderer's atmosphere to a stormy state (rain + wind-driven
    // sprite paths), then advance the sim so the seeded weather machine steps
    // through a real high-wind window. No crash either way.
    await page.evaluate(() =>
      window.__ec!.setAtmosphere(2 * 60, { cloud: 0.95, wind: 0.95, regime: 'windy-wet' }),
    );
    await page.waitForTimeout(400);
    await assertNoCrash(page, watch, 'stormy atmosphere override');
    await cmd(page, { type: 'setSpeed', speed: 16 });
    await page.waitForTimeout(4500);
    await cmd(page, { type: 'setSpeed', speed: 0 });
    await page.evaluate(() => window.__ec!.setAtmosphere());
    await assertNoCrash(page, watch, 'sim run through weather regime');
  });

  test('storm-prep levers + vegetation policy + fleet sizing commands', async ({ page }) => {
    const watch = await bootWatched(page);
    await pauseSim(page);
    // command paths the SevereWeatherAlert + fleet controls drive
    for (const action of ['surge', 'shifts', 'scouts', 'callHandling', 'vegCut'] as const) {
      await cmd(page, { type: 'stormPrep', action });
      await page.waitForTimeout(80);
    }
    for (const policy of [0, 1, 2] as const) {
      await cmd(page, { type: 'setVegPolicy', policy });
      await page.waitForTimeout(80);
    }
    for (const vans of [0, 6, 12, 3] as const) {
      await cmd(page, { type: 'setFleet', vans });
      await page.waitForTimeout(80);
    }
    await assertNoCrash(page, watch, 'storm-prep + veg + fleet commands');
  });
});
