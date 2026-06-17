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

  test('create-account tab filter reveals the username field', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);

    // sign-in is the default tab → no username field yet
    await expect(page.getByLabel('username')).toHaveCount(0);
    // switch to the create-account TAB filter
    await page.getByRole('button', { name: 'create account' }).first().click();
    await expect(page.getByLabel('username')).toBeVisible();
    // the create-account ACTION button (distinct from the tab) is present
    await expect(page.getByRole('button', { name: 'submit create account' })).toBeVisible();
  });

  test('pressing Enter in the password field submits sign-in', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);

    await page.getByLabel('email').fill('nobody-w7a@example.com');
    await page.getByLabel('password').fill('definitely-wrong-pw');
    // Enter in the password field triggers the same handler as the button. With
    // no matching account (or no backend reachable in CI/sandbox) the auth call
    // returns an error string, which proves the submission FIRED — not just that
    // the field swallowed a keystroke. Match the specific auth errors only (not
    // the page's "NETWORK ACCESS" chrome).
    await page.getByLabel('password').press('Enter');
    await expect(
      page.getByText(/Failed to fetch|password is incorrect|please confirm|not configured/i),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('settings opens as its own popup with a guest sign-out / change-password note', async ({
    page,
  }) => {
    await page.goto('/');
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
        timeout: 30_000,
      })
      .toBe(true);

    await page.getByRole('button', { name: /settings/i }).click();
    // its own centred popup (role=dialog, aria-label "settings")
    const dialog = page.getByRole('dialog', { name: 'settings' });
    await expect(dialog).toBeVisible();
    // guests are told where to sign in / change password
    await expect(page.getByText(/change your password here/i)).toBeVisible();
    // closes cleanly
    await page.getByRole('button', { name: 'done' }).click();
    await expect(dialog).toHaveCount(0);
  });
});
