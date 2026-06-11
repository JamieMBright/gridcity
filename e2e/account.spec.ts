import { expect, test } from '@playwright/test';

test.describe('account panel (start menu)', () => {
  test('renders the passwordless sign-in form; button gates on email', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);

    await expect(page.getByText(/sign in to sync saves/)).toBeVisible();
    const send = page.getByRole('button', { name: /email me a code/ });
    await expect(send).toBeDisabled();
    await page.getByLabel('email').fill('player@example.com');
    await page.getByLabel('username').fill('gridhero');
    await expect(send).toBeEnabled();
    // guest play stays one click away regardless of sign-in state
    await expect(page.getByRole('button', { name: 'new game' })).toBeVisible();
  });
});
