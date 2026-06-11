import { expect, test } from '@playwright/test';
import { assetCount, boot, clickButton, clickTile, openLand, pause, store } from './helpers';

test.describe('building on the map', () => {
  test('plant → substation → line, with costs landing on the bill', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a, b] = await openLand(page, 2);
    expect(a && b).toBeTruthy();
    if (!a || !b) return;

    await clickButton(page, 'Gas CCGT');
    await clickTile(page, a);
    await expect.poll(() => assetCount(page)).toBe(1);

    await clickButton(page, 'Grid substation');
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(2);

    await clickButton(page, '132 kV line');
    await clickTile(page, a);
    await expect(page.getByText('click the far end · Esc to stop')).toBeVisible();
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(3);

    // capex shows up on the bill panel
    const capexYrK = await store<number>(page, '(s) => s.snapshot.bill.capexYrK');
    expect(capexYrK).toBeGreaterThan(20_000); // a CCGT annuitized is £20m+/yr
    await expect(page.getByText('network capex')).toBeVisible();
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
    const [a] = await openLand(page, 1);
    if (!a) return;
    await clickButton(page, 'Nuclear');
    await clickTile(page, a);
    // the message shows in both the toast and the ghost-info footer
    await expect(page.getByText('nuclear needs the licensed coastal site').first()).toBeVisible();
    await expect.poll(() => assetCount(page)).toBe(0);
  });

  test('demolishing an endpoint cascades to its lines', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a, b] = await openLand(page, 2);
    if (!a || !b) return;
    await clickButton(page, 'Grid substation');
    await clickTile(page, a);
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(2);
    await clickButton(page, '132 kV line');
    await clickTile(page, a);
    await clickTile(page, b);
    await expect.poll(() => assetCount(page)).toBe(3);

    await clickButton(page, 'Demolish');
    await clickTile(page, a);
    await expect.poll(() => assetCount(page)).toBe(1); // sub + its line gone
  });
});
