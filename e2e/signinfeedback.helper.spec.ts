// Sign-in feedback gate (owner, 2026-06-18: "there's no negative feedback if
// an unrecognised sign-in attempt"). We route-mock the Supabase gotrue token
// endpoint so the test is deterministic and never depends on the network —
// then drive the REAL "unrecognised credentials" path and assert the friendly
// error is not just present but VISIBLE and WITHIN THE VIEWPORT (the start menu
// is scaled-to-fit with no scroll on phone-landscape, so an error that renders
// below the fold reads to the player as "nothing happened").
//
//   npx playwright test e2e/signinfeedback.helper.spec.ts
//   SHOTS=1 npx playwright test e2e/signinfeedback.helper.spec.ts   (+ grabs)
import { test, expect, type Page, type Route } from '@playwright/test';

async function ready(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 40_000,
    })
    .toBe(true);
}

// Pretend the gotrue token endpoint rejects with "invalid credentials" — the
// real shape Supabase returns for an email/password that doesn't match.
async function mockBadCredentials(page: Page): Promise<void> {
  await page.route('**/auth/v1/token**', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    });
  });
}

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

async function attemptSignIn(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.getByLabel('email').fill('nobody-xyz@example.com');
  await page.getByLabel('password').fill('wrongpassword123');
  await page.getByRole('button', { name: 'submit sign in' }).click();
}

const VIEWS = [
  { name: 'desktop', w: 1100, h: 700, mobile: false },
  { name: 'phone-844', w: 844, h: 390, mobile: true },
  { name: 'phone-narrow-667', w: 667, h: 375, mobile: true },
];

for (const v of VIEWS) {
  test.describe(`sign-in feedback — ${v.name}`, () => {
    test.use({ viewport: { width: v.w, height: v.h }, hasTouch: v.mobile, isMobile: v.mobile });
    test(`unrecognised sign-in shows a visible error @ ${v.w}x${v.h}`, async ({ page }) => {
      test.setTimeout(90_000);
      await mockBadCredentials(page);
      await attemptSignIn(page);

      const err = page.getByText('email or password is incorrect');
      await expect(err).toBeVisible({ timeout: 20_000 });

      // Objective: the error must sit INSIDE the viewport (not below the fold of
      // a no-scroll, scaled-to-fit start menu).
      const box = await err.boundingBox();
      console.log(`${v.name} error box:`, JSON.stringify(box), 'VH:', v.h);
      if (process.env.SHOTS) await page.screenshot({ path: `preview/signin-${v.name}.png` });
      expect(box, 'error has a layout box').not.toBeNull();
      expect(box!.y, 'error top is on-screen').toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, 'error bottom is within the viewport').toBeLessThanOrEqual(v.h + 1);
    });
  });
}
