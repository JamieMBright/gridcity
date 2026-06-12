import { expect, test } from '@playwright/test';
import { boot, openLand, pause, store } from './helpers';

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

  test('designating a generation site opens a tender in the inbox', async ({ page }) => {
    await boot(page);
    await pause(page);
    const [a] = await openLand(page, 1);
    expect(a).toBeTruthy();
    if (!a) return;
    await page.evaluate(
      (t) =>
        window.__ec?.sendCommand({
          type: 'build',
          spec: { kind: 'gen', gen: 'gasCCGT', x: t.x, y: t.y },
        }),
      a,
    );
    await expect(page.getByText('TENDERS')).toBeVisible();
    await expect(page.getByText('Gas CCGT site')).toBeVisible();
    await expect(page.getByText(/awaiting developer bids/)).toBeVisible();
    // withdrawing clears the section
    await page.getByRole('button', { name: 'withdraw' }).dispatchEvent('click');
    await expect(page.getByText('TENDERS')).not.toBeVisible();
    await expect
      .poll(() => store<string>(page, '(s) => s.snapshot.inbox.tenders[0].status'))
      .toBe('lapsed');
  });

  test('satisfaction and curtailment KPIs are on the bill panel', async ({ page }) => {
    await boot(page);
    await expect(page.getByText('satisfaction', { exact: true })).toBeVisible();
    await expect(page.getByText('curtailed firm/flex')).toBeVisible();
  });
});
