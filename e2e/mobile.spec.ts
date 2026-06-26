// Phone layout: the build rail, the expandable palette, and the panel
// chips — run at iPhone-ish viewport.

import { expect, test } from '@playwright/test';
import { boot, store } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('mobile chrome', () => {
  test('build rail arms tools and the desktop panels stay away', async ({ page }) => {
    await boot(page);
    await expect(page.getByRole('button', { name: 'open build menu' })).toBeVisible();
    // desktop spread is replaced — the always-open palette text isn't there
    await expect(page.getByText('Lines & cables')).toBeHidden();

    await page.getByRole('button', { name: 'Solar farm' }).dispatchEvent('click');
    await expect
      .poll(() => store<string>(page, "(s) => s.tool.t === 'gen' ? s.tool.gen : ''"))
      .toBe('solarFarm');

    // tapping again disarms back to inspect
    await page.getByRole('button', { name: 'Solar farm' }).dispatchEvent('click');
    await expect.poll(() => store<string>(page, '(s) => s.tool.t')).toBe('inspect');
  });

  test('expand arrow opens the detailed palette; picking a tool closes it', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: 'open build menu' }).dispatchEvent('click');
    await expect(page.getByText('Lines & cables')).toBeVisible();
    await expect(page.getByText('Gas CCGT')).toBeVisible(); // names + prices
    await page.getByRole('button', { name: /Tidal stream.*£/ }).dispatchEvent('click');
    await expect
      .poll(() => store<string>(page, "(s) => s.tool.t === 'gen' ? s.tool.gen : ''"))
      .toBe('tidal');
    await expect(page.getByText('Lines & cables')).toBeHidden();
  });

  test('chips open the bill, fleet and inbox sheets one at a time', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: 'bill', exact: true }).dispatchEvent('click');
    await expect(page.getByText(/AVG ANNUAL BILL/)).toBeVisible();
    await page.getByRole('button', { name: 'fleet', exact: true }).dispatchEvent('click');
    await expect(page.getByText(/AVG ANNUAL BILL/)).toBeHidden();
    await expect(page.getByText('FIELD FLEET')).toBeVisible();
    await page.getByRole('button', { name: 'fleet', exact: true }).dispatchEvent('click');
    await expect(page.getByText('FIELD FLEET')).toBeHidden();
  });

  test('line voltage icons keep the underground choice and OH/UG toggles', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: '132 kV line' }).dispatchEvent('click');
    await expect.poll(() => store<string>(page, '(s) => s.tool.build ?? ""')).toBe('overhead');
    await page.getByRole('button', { name: 'toggle underground' }).dispatchEvent('click');
    await expect.poll(() => store<string>(page, '(s) => s.tool.build ?? ""')).toBe('underground');
    await page.getByRole('button', { name: '33 kV line' }).dispatchEvent('click');
    await expect.poll(() => store<string>(page, '(s) => s.tool.build ?? ""')).toBe('underground');
    await expect.poll(() => store<number>(page, '(s) => s.tool.level ?? 0')).toBe(33);
  });
});
