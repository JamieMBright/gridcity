import { expect, test } from '@playwright/test';

test.describe('account panel (start menu)', () => {
  test('renders the email+password sign-in form; button gates on email + password', async ({
    page,
  }) => {
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);

    // Primary flow: email + password sign in.
    await expect(page.getByText(/sign in to sync saves/)).toBeVisible();
    const signIn = page.getByRole('button', { name: 'submit sign in' });
    await expect(signIn).toBeDisabled();
    await page.getByLabel('email').fill('player@example.com');
    await expect(signIn).toBeDisabled(); // still needs a password
    await page.getByLabel('password').fill('hunter2!');
    await expect(signIn).toBeEnabled();

    // Forgot-password link is offered.
    await expect(page.getByRole('button', { name: /forgot password/ })).toBeVisible();

    // The one-time-code / magic-link fallback is still reachable.
    await page.getByRole('button', { name: /use a one-time code instead/ }).click();
    const send = page.getByRole('button', { name: /email me a code/ });
    await expect(send).toBeEnabled(); // email persists across the switch

    // guest play stays one click away regardless of sign-in state
    await expect(page.getByRole('button', { name: 'new game' })).toBeVisible();
  });
});
