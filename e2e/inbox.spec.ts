import { expect, test } from '@playwright/test';
import { boot, store } from './helpers';

test.describe('inbox & innovation levy', () => {
  test('levy steppers adjust the innovation levy on the bill', async ({ page }) => {
    await boot(page);
    const start = await store<number>(page, '(s) => s.snapshot.inbox.levyPct');
    await page.getByRole('button', { name: 'levy up' }).dispatchEvent('click');
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.inbox.levyPct'))
      .toBe(Math.min(3, start + 0.5));
    await page.getByRole('button', { name: 'levy down' }).dispatchEvent('click');
    await expect
      .poll(() => store<number>(page, '(s) => s.snapshot.inbox.levyPct'))
      .toBe(start);
  });

  test('the inbox panel renders and collapses', async ({ page }) => {
    await boot(page);
    await expect(page.getByText('INBOX')).toBeVisible();
    await expect(page.getByText(/innovation fund/)).toBeVisible();
    await page.getByText('INBOX').dispatchEvent('click');
    await expect(page.getByText(/innovation fund/)).not.toBeVisible();
  });

  test('satisfaction and curtailment KPIs are on the bill panel', async ({ page }) => {
    await boot(page);
    await expect(page.getByText('satisfaction', { exact: true })).toBeVisible();
    await expect(page.getByText('curtailed firm/flex')).toBeVisible();
  });
});
