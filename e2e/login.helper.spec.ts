// Design-gate screenshots for the new email+password account card (start
// menu): sign in / create account / one-time-code fallback, desktop + phone.
//   SHOTS=1 npx playwright test e2e/login.helper.spec.ts
import { expect, test } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function ready(page: P): Promise<void> {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 30_000 })
    .toBe(true);
  // the start menu (with the account card) is up at boot — don't dismiss it
  await page.waitForTimeout(500);
}

async function shotMenu(page: P, path: string): Promise<void> {
  await page.screenshot({ path });
}

test('account card — sign in / create / otp, desktop + phone', async ({ page }) => {
  test.setTimeout(120_000);

  // desktop — sign in (default)
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await shotMenu(page, 'preview/login-signin.png');

  // create account
  const create = page.getByRole('button', { name: 'Create account' });
  if (await create.count()) {
    await create.first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await shotMenu(page, 'preview/login-create.png');
  }

  // one-time-code fallback
  const otp = page.getByRole('button', { name: /one-time code/i });
  if (await otp.count()) {
    await otp.first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await shotMenu(page, 'preview/login-otp.png');
  }

  // phone-landscape — sign in
  await page.setViewportSize({ width: 956, height: 440 });
  await page.reload();
  await ready(page);
  await shotMenu(page, 'preview/login-mobile.png');
});
