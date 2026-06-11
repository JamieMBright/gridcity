import { expect, test } from '@playwright/test';
import { boot, clickButton, openLand, store } from './helpers';

test.describe('app boot & chrome', () => {
  test('boots with wordmark, ticker, bill panel, fleet panel and status bar', async ({ page }) => {
    await boot(page);
    await expect(page.getByText('ELECTRI')).toBeVisible();
    await expect(page.getByText('CITY', { exact: true })).toBeVisible();
    await expect(page.getByText('AVG ANNUAL BILL')).toBeVisible();
    await expect(page.getByText('FIELD FLEET', { exact: true })).toBeVisible();
    await expect(page.getByText('TREE CUTTING', { exact: true })).toBeVisible();
    await expect(page.getByText(/Hz/)).toBeVisible();
    await expect(page.getByText(/\/MWh/)).toBeVisible();
    await expect(page.getByText(/g\/kWh/)).toBeVisible();
    await expect(page.getByText('drag to pan · scroll to zoom · G for grid view')).toBeVisible();
  });

  test('game clock advances while running', async ({ page }) => {
    await boot(page);
    await clickButton(page, '▶▶▶');
    const t0 = await store<number>(page, '(s) => s.snapshot.simTimeMin');
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.simTimeMin'))
      .toBeGreaterThan(t0 + 60);
  });

  test('hovering the map shows tile info', async ({ page }) => {
    await boot(page);
    const [land] = await openLand(page, 1);
    expect(land).toBeDefined();
    if (!land) return;
    await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), land);
    const pos = await page.evaluate(
      (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
      land,
    );
    await page.mouse.move(pos.x, pos.y);
    await expect(page.getByText(`tile ${land.x},${land.y}`)).toBeVisible();
  });
});
