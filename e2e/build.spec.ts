import { expect, test } from '@playwright/test';
import { assetCount, boot, clickButton, clickTile, openLand, pause, store } from './helpers';

test.describe('building on the map', () => {
  test('designate a site → developer bids → award → plant + wires on the bill', async ({
    page,
  }) => {
    test.slow(); // waits real seconds for developer bids at 16x
    await boot(page);
    await pause(page);
    // a fresh game is seeded with the iDNO estate substations
    const base = await assetCount(page);
    const [a, b] = await openLand(page, 2);
    expect(a && b).toBeTruthy();
    if (!a || !b) return;

    // designating a CCGT site opens a tender, not an asset
    await clickButton(page, 'Gas CCGT');
    await clickTile(page, a);
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.inbox.tenders.length'))
      .toBe(1);
    expect(await assetCount(page)).toBe(base);

    // run the clock until a developer bids
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 16 }));
    await expect
      .poll(
        () => store<number>(page, '(s) => s.snapshot.inbox.tenders[0]?.bids.length ?? 0'),
        { timeout: 45_000 },
      )
      .toBeGreaterThan(0);
    await pause(page);

    // award the first bid: the developer's plant lands on the map
    const award = await store<{ tenderId: number; developerId: number }>(
      page,
      '(s) => ({ tenderId: s.snapshot.inbox.tenders[0].id, developerId: s.snapshot.inbox.tenders[0].bids[0].developerId })',
    );
    await page.evaluate(
      (arg) => window.__ec?.sendCommand({ type: 'acceptBid', ...arg }),
      award,
    );
    await expect.poll(() => assetCount(page)).toBe(base + 1);
    await expect
      .poll(() => store<string>(page, '(s) => s.snapshot.inbox.tenders[0].status'))
      .toBe('awarded');

    await clickButton(page, 'Grid substation');
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(base + 2);

    await clickButton(page, '132 kV line');
    await clickTile(page, a);
    await expect(page.getByText('click the far end · Esc to stop')).toBeVisible();
    // canvas clicks can land a tile off while the camera settles; re-anchor
    // and retry until the line lands
    await expect
      .poll(
        async () => {
          if ((await page.getByText('click the far end · Esc to stop').count()) === 0) {
            await clickTile(page, a);
          }
          await clickTile(page, b);
          return assetCount(page);
        },
        { timeout: 30_000 },
      )
      .toBe(base + 3);

    // the awarded plant carries its PPA strike — it bills as a top-up on
    // DELIVERED energy (nothing yet: no customers hang off these wires),
    // never as DUoS capex; the wires themselves are network capex
    const strike = await store<number>(
      page,
      '(s) => s.snapshot.assets.find((a) => a.kind === "gen" && a.ppaMWh !== undefined)?.ppaMWh ?? 0',
    );
    expect(strike).toBeGreaterThan(0);
    const genYrK = await store<number>(page, '(s) => s.snapshot.bill.genYrK');
    expect(genYrK).toBeLessThan(1000); // idle plant is the developer's problem
    const capexYrK = await store<number>(page, '(s) => s.snapshot.bill.capexYrK');
    expect(capexYrK).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'itemise network (DUoS)' })).toBeVisible();
  });

  test('ghost preview quotes a cost before building', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a] = await openLand(page, 1);
    if (!a) return;
    await clickButton(page, 'Distribution substation');
    await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), a);
    const pos = await page.evaluate(
      (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
      a,
    );
    await page.mouse.move(pos.x, pos.y);
    await expect.poll(() => store<boolean>(page, '(s) => s.ghostInfo?.ok ?? false')).toBe(true);
    await expect(page.getByText(/^cost £/)).toBeVisible();
  });

  test('illegal siting is rejected with a toast', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await assetCount(page);
    const [a] = await openLand(page, 1);
    if (!a) return;
    // tidal on dry land is illegal anywhere (open-land tiles are land by
    // construction — nuclear is no longer a fit here, since any shoreline
    // with cooling water now accepts it)
    await clickButton(page, 'Tidal stream');
    await clickTile(page, a);
    // the message shows in both the toast and the ghost-info footer
    await expect(page.getByText('tidal turbines sit in the water').first()).toBeVisible();
    expect(await assetCount(page)).toBe(base);
    expect(await store<number>(page, '(s) => s.snapshot.inbox.tenders.length')).toBe(0);
  });

  test('demolishing an endpoint cascades to its lines', async ({ page }) => {
    await boot(page);
    await pause(page);
    const base = await assetCount(page);
    const [a, b] = await openLand(page, 2);
    if (!a || !b) return;
    await clickButton(page, 'Grid substation');
    await clickTile(page, a);
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(base + 2);
    await clickButton(page, '132 kV line');
    await clickTile(page, a);
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(base + 3);

    await clickButton(page, 'Demolish');
    await clickTile(page, a);
    await expect.poll(() => assetCount(page)).toBe(base + 1); // sub + its line gone
  });
});
