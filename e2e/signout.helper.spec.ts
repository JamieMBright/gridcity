// Sign-out design-gate screenshots (feat/fix-signout).
//   PW_PORT=5223 SHOTS=1 npx playwright test e2e/signout.helper.spec.ts
// Seeds a fake local session (same trick as w7a.helper) so the SettingsPanel
// renders its signed-in row with the SIGN OUT button, captures it, clicks
// sign out, and captures the popup flipping to the guest note — proving the
// fix (no longer "kept signed in"). Desktop + phone-landscape.
import { expect, test } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

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
  await page.waitForTimeout(400);
}

// keep the fake session resolving offline + signOut succeeding instantly
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
  await page.route('**/auth/v1/logout**', (r) =>
    r.fulfill({ status: 204, contentType: 'application/json', body: '' }),
  );
}

async function seedSession(page: P): Promise<void> {
  await page.evaluate(
    ([ref, sess]) => window.localStorage.setItem(`sb-${ref}-auth-token`, sess),
    [SUPA_REF, fakeSession()] as const,
  );
}

async function shotFlow(page: P, tag: string): Promise<void> {
  await stubSupabase(page);
  await seedSession(page);
  await page.reload();
  await ready(page);

  // open settings; wait for the signed-in row (the SIGN OUT button)
  await page.getByRole('button', { name: /settings/i }).click();
  const signOut = page.getByRole('button', { name: 'sign out' });
  await expect(signOut).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `preview/signout-signedin-${tag}.png` });

  // click sign out → the popup must flip to the guest note (the fix)
  await signOut.click();
  await expect(page.getByText(/playing as a guest/i)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `preview/signout-signedout-${tag}.png` });

  // the persisted session must be gone (not "kept signed in")
  const token = await page.evaluate(
    (ref) => window.localStorage.getItem(`sb-${ref}-auth-token`),
    SUPA_REF,
  );
  expect(token).toBeNull();

  // close + reopen settings → still guest (the sign-out really stuck)
  await page.getByRole('button', { name: 'done' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByText(/playing as a guest/i)).toBeVisible({ timeout: 10_000 });
}

test('signout — settings sign-out flips to guest, desktop', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await shotFlow(page, 'desktop');
});

test('signout — settings sign-out flips to guest, phone-landscape', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 956, height: 440 });
  await ready(page);
  await shotFlow(page, 'phone');
});
