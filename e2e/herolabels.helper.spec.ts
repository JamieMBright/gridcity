// Review helper (run on demand, like e2e/shots.helper.spec.ts — NOT a
// regression gate). Captures the SUBTLE close-zoom hero-building labels at
// far / mid / close so the LOD can be reviewed: the gold hero titles must be
// ABSENT on the far whole-region overview and the quiet mid band, and fade in
// only once you've zoomed right in toward the building (owner, 2026-06-26:
// "subtle labelling on hero buildings — nice and small and only on close
// zoom"). Run with a dedicated port so it doesn't collide with other runs:
//   SHOTS=1 PW_PORT=5204 npx playwright test e2e/herolabels.helper.spec.ts --workers=1
import { test, expect, type Page } from '@playwright/test';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const OUT = '/tmp/review-herolabels';

async function ready(page: Page): Promise<void> {
  // generous poll: under software WebGL on a loaded box the first render can
  // take well over the default 30s (Vite cold-start + atlas build).
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 120_000,
    })
    .toBe(true);
}

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) {
      await cont.dispatchEvent('click');
    } else {
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
      const london = page.getByTitle('power London', { exact: true });
      await expect.poll(async () => london.count(), { timeout: 15_000 }).toBeGreaterThan(0);
      await london.first().dispatchEvent('click');
    }
    await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      const rb = page.getByRole('button', { name: 'rebuild it' });
      if ((await rb.count()) > 0) await rb.dispatchEvent('click');
    }
  }
  await page.waitForTimeout(900);
}

const focus = async (page: Page, x: number, y: number, z: number): Promise<void> => {
  await page.evaluate(
    ([fx, fy, fz]) => {
      window.__ec?.panTo(fx as number, fy as number);
      window.__ec?.setZoom(fz as number);
    },
    [x, y, z],
  );
  await page.waitForTimeout(900);
};

test('hero labels far/mid/close', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);

  // The City / South Bank hero cluster (St Paul's, the Gherkin, the Shard,
  // Tower Bridge, the London Eye, Battersea) sits around x≈100-125, y≈70-99.

  // FAR — whole-region overview. Hero titles MUST be absent here.
  await focus(page, 115, 85, 0.12);
  await page.screenshot({ path: `${OUT}/herolabels-far-1280.png` });

  // MID — place names have faded, heroes not yet shown (the quiet band).
  await focus(page, 114, 82, 0.42);
  await page.screenshot({ path: `${OUT}/herolabels-mid-1280.png` });

  // CLOSE — subtle gold hero titles fade in and read tasteful.
  await focus(page, 114, 82, 0.8);
  await page.screenshot({ path: `${OUT}/herolabels-close-0p8-1280.png` });

  await focus(page, 114, 82, 1.1);
  await page.screenshot({ path: `${OUT}/herolabels-close-1p1-1280.png` });

  // tighter grab on the City dome cluster at close zoom for the landmark critique
  await focus(page, 115, 80, 1.2);
  await page.screenshot({
    path: `${OUT}/herolabels-city-close.png`,
    clip: { x: 300, y: 120, width: 720, height: 520 },
  });

  // the O2 / Greenwich peninsula at close zoom (a marquee hero)
  await focus(page, 139, 91, 1.1);
  await page.screenshot({
    path: `${OUT}/herolabels-o2-close.png`,
    clip: { x: 300, y: 120, width: 720, height: 520 },
  });

  // phone-landscape — close (titles legible + subtle on mobile) and far (clean)
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await focus(page, 114, 82, 0.85);
  await page.screenshot({ path: `${OUT}/herolabels-close-phone.png` });
  await focus(page, 115, 85, 0.12);
  await page.screenshot({ path: `${OUT}/herolabels-far-phone.png` });
});
