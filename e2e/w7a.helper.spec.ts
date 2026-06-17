// W7a design-gate screenshots — auth / settings / menu polish.
//   PW_PORT=5221 SHOTS=1 npx playwright test e2e/w7a.helper.spec.ts
// Captures, at desktop AND phone-landscape:
//  - the start menu (bolt mark replacing the old square icon)
//  - the auth card: SIGN IN tab + CREATE ACCOUNT tab (distinct pale tab
//    filters vs the orange action button)
//  - the settings popup (guest)
//  - the settings popup CHANGE-PASSWORD form (a fake local session reveals it)
//  - the in-HUD wordmark bolt
import { expect, test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

// supabase-js stores the session under sb-<ref>-auth-token; seeding a far-future
// fake session makes getSession() resolve a "signed-in" user offline so the
// change-password form (signed-in only) renders for the design gate. The
// profile fetch fails gracefully (network), so username falls back to email.
const SUPA_REF = 'mhgpzhtusrddwtgogjbv';
function fakeSession(): string {
  const future = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  return JSON.stringify({
    access_token: 'fake-access',
    refresh_token: 'fake-refresh',
    token_type: 'bearer',
    expires_in: 31536000,
    expires_at: future,
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'operator@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  });
}

async function ready(page: P): Promise<void> {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  await page.waitForTimeout(500); // start menu (with the account card) is up at boot
}

// Make the fake-session path deterministic + instant: the profile fetch in
// currentUser() and any token validation/refresh otherwise hit the real
// Supabase endpoint (slow/uncertain in the sandbox), which left the
// signed-in branch un-rendered. Stub them so getSession() keeps the seeded
// user and the username falls back to the email.
async function stubSupabase(page: P): Promise<void> {
  await page.route('**/rest/v1/profiles**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/auth/v1/user**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000001', email: 'operator@example.com' }),
    }),
  );
}

test('W7a — auth / settings / menu, desktop + phone', async ({ page }) => {
  test.setTimeout(150_000);

  // ----- DESKTOP -----------------------------------------------------------
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  // whole menu — bolt mark at top, sign-in tab active
  await page.screenshot({ path: 'preview/w7a-menu-signin-desktop.png' });

  // create-account tab — the active tab filter should read PALE, distinct from
  // the orange create-account ACTION button below it
  const create = page.getByRole('button', { name: 'create account' });
  await create.first().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'preview/w7a-menu-create-desktop.png' });

  // settings popup (guest)
  await page.getByRole('button', { name: /settings/i }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/w7a-settings-guest-desktop.png' });
  // close it
  await page.getByRole('button', { name: 'done' }).click();
  await page.waitForTimeout(150);

  // ----- DESKTOP, SIGNED-IN (fake session) → change-password form ----------
  await stubSupabase(page);
  await page.evaluate(
    ([ref, sess]) => {
      window.localStorage.setItem(`sb-${ref}-auth-token`, sess);
    },
    [SUPA_REF, fakeSession()] as const,
  );
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: /settings/i }).click();
  // the popup re-checks the session on mount; wait for the signed-in row
  const changePw = page.getByRole('button', { name: 'change password' });
  await expect(changePw).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: 'preview/w7a-settings-signedin-desktop.png' });
  // open the change-password sub-form
  await changePw.first().click();
  await expect(page.getByLabel('current password')).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'preview/w7a-changepw-desktop.png' });

  // ----- PHONE-LANDSCAPE ---------------------------------------------------
  await page.evaluate((ref) => window.localStorage.removeItem(`sb-${ref}-auth-token`), SUPA_REF);
  await page.setViewportSize({ width: 956, height: 440 });
  await page.reload();
  await ready(page);
  await page.screenshot({ path: 'preview/w7a-menu-signin-phone.png' });

  await page.getByRole('button', { name: 'create account' }).first().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'preview/w7a-menu-create-phone.png' });

  await page.getByRole('button', { name: /settings/i }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'preview/w7a-settings-guest-phone.png' });
  await page.getByRole('button', { name: 'done' }).click();
  await page.waitForTimeout(150);

  // phone signed-in change-password
  await page.evaluate(
    ([ref, sess]) => {
      window.localStorage.setItem(`sb-${ref}-auth-token`, sess);
    },
    [SUPA_REF, fakeSession()] as const,
  );
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: /settings/i }).click();
  const changePwM = page.getByRole('button', { name: 'change password' });
  await expect(changePwM).toBeVisible({ timeout: 10_000 });
  await changePwM.first().click();
  await expect(page.getByLabel('current password')).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'preview/w7a-changepw-phone.png' });
});

// The in-HUD wordmark bolt (top-left of the perimeter HUD) — confirms the bolt
// mark replaced the old square icon in-game, desktop + phone.
test('W7a — in-HUD wordmark bolt, desktop + phone', async ({ page }) => {
  test.setTimeout(120_000);
  // clear any seeded session from the other test's storage state isolation
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await page.waitForTimeout(600);
  // crop the top-left corner where the wordmark button sits
  await page.screenshot({ path: 'preview/w7a-hud-wordmark-desktop.png', clip: { x: 0, y: 0, width: 360, height: 110 } });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await boot(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/w7a-hud-wordmark-phone.png', clip: { x: 0, y: 0, width: 320, height: 90 } });
});
