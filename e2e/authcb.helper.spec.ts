// Design-gate for the auth-callback landing page (the 404 fix): the
// recovery (set-new-password) form, the confirmed/welcome state, and the
// expired-link state — by faking the redirect URL Supabase would send.
//   SHOTS=1 npx playwright test e2e/authcb.helper.spec.ts
import { expect, test } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function shoot(page: P, url: string, path: string): Promise<void> {
  await page.goto(url);
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), { timeout: 30_000 })
    .toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path });
}

test('auth callback — recovery / confirmed / expired', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await shoot(page, '/#type=recovery', 'preview/authcb-recovery.png');
  await shoot(page, '/#type=signup&access_token=demo', 'preview/authcb-confirmed.png');
  await shoot(
    page,
    '/?error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    'preview/authcb-expired.png',
  );
});
