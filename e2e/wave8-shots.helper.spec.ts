// Wave 8 UI lane screenshots: bespoke icons, collapse states, and the
// softened day/night arc. Not a regression test — run on demand:
//   SHOTS=1 npx playwright test e2e/wave8-shots.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const DESKTOP = { width: 1366, height: 768 };
// the useIsMobile query trips on max-width:760 (no coarse pointer under
// headless chromium), so a true phone-landscape shot must sit ≤760 wide
const PHONE_LS = { width: 740, height: 360 };

async function pinTime(page: import('@playwright/test').Page, hour: number) {
  await page.evaluate((h) => {
    window.__ec?.setAtmosphere(h * 60, { cloud: 0.25, wind: 0.35, regime: 'mild' });
  }, hour);
  await page.waitForTimeout(1400); // let the grade ease in
}

test('desktop — expanded vs collapsed + day arc', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(DESKTOP);
  await boot(page);
  await page.evaluate(() => window.__ec?.getState().setHudCollapsed(false));
  await page.waitForTimeout(600);

  // full desktop spread, midday
  await pinTime(page, 13);
  await page.screenshot({ path: 'preview/w8-desktop-expanded-day.png' });

  // dusk: the read should be in the windows, not a flashing wash
  await pinTime(page, 19.2);
  await page.screenshot({ path: 'preview/w8-desktop-expanded-dusk.png' });

  // deep night
  await pinTime(page, 1);
  await page.screenshot({ path: 'preview/w8-desktop-expanded-night.png' });

  // collapse the HUD on desktop → compact icon rail + chips
  await page.evaluate(() => window.__ec?.getState().setHudCollapsed(true));
  await page.waitForTimeout(800);
  await pinTime(page, 13);
  await page.screenshot({ path: 'preview/w8-desktop-collapsed-day.png' });

  // a tight crop of the collapsed bottom HUD bar for the bespoke glyphs
  await page.screenshot({
    path: 'preview/w8-desktop-hudbar.png',
    clip: { x: DESKTOP.width / 2 - 360, y: DESKTOP.height - 60, width: 720, height: 52 },
  });
  // the build rail (left) close up
  await page.screenshot({
    path: 'preview/w8-rail.png',
    clip: { x: 0, y: 36, width: 56, height: DESKTOP.height - 88 },
  });
});

test('phone-landscape — mobile chrome + dusk', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(PHONE_LS);
  await boot(page);
  await pinTime(page, 13);
  await page.screenshot({ path: 'preview/w8-phone-day.png' });
  await pinTime(page, 19.2);
  await page.screenshot({ path: 'preview/w8-phone-dusk.png' });

  // open the full build palette drawer to show the bespoke tool icons
  await page.getByRole('button', { name: 'open build menu' }).dispatchEvent('click');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/w8-phone-palette.png' });
});
