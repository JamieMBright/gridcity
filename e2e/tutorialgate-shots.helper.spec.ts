// Design-gate screenshot helper for the tutorial gate (owner, 2026-06-26).
// Captures the START MENU in BOTH states — free play LOCKED (tutorial offered)
// and UNLOCKED (free play available) — at desktop AND phone-landscape, so the
// lock state + gate message can be reviewed for clarity and fit (no clip).
//
// Run on demand:
//   PW_PORT=5205 SHOTS=1 npx playwright test e2e/tutorialgate-shots.helper.spec.ts
//
// Output: /tmp/review-tutorialgate/*.png

import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const OUT = '/tmp/review-tutorialgate';
const DESKTOP = { width: 1280, height: 800 };
const PHONE_LANDSCAPE = { width: 844, height: 390 }; // iPhone 12/13 held landscape

/** Boot to the start menu with the gate in a chosen state.
 *  locked=true  → fresh player, no save, no progress (force the locked view).
 *  locked=false → grandfathered (sticky flag set), so free play is unlocked. */
async function bootMenu(page: Page, locked: boolean): Promise<void> {
  await page.addInitScript(
    ([lock]) => {
      try {
        localStorage.clear();
        if (lock) {
          // make sure the automation auto-unlock does NOT fire for this shot
          sessionStorage.setItem('ec-force-gate-locked', '1');
        } else {
          // a returning player who already finished the curriculum
          localStorage.setItem('ec-tutorial-complete-v1', '1');
        }
      } catch {
        /* ignore */
      }
    },
    [locked],
  );
  await page.goto('/');
  // wait for the menu to be present (workerStatus ready + first snapshot, which
  // is what gates the action buttons rendering)
  await page.waitForFunction(
    () => {
      const s = window.__ec?.getState();
      return !!s && s.menuOpen === true && s.snapshot !== undefined;
    },
    undefined,
    { timeout: 45_000 },
  );
  // let the card settle (logo, scale-to-fit measurement on short landscape)
  await page.waitForTimeout(900);
}

test('tutorial gate — start menu, locked vs unlocked, desktop + phone', async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(OUT, { recursive: true });

  // DESKTOP — locked (free play gated, tutorial offered)
  await page.setViewportSize(DESKTOP);
  await bootMenu(page, true);
  await page.screenshot({ path: `${OUT}/desktop-locked.png` });

  // DESKTOP — unlocked (free play available)
  await bootMenu(page, false);
  await page.screenshot({ path: `${OUT}/desktop-unlocked.png` });

  // PHONE LANDSCAPE — locked
  await page.setViewportSize(PHONE_LANDSCAPE);
  await bootMenu(page, true);
  await page.screenshot({ path: `${OUT}/phone-locked.png` });

  // PHONE LANDSCAPE — unlocked
  await bootMenu(page, false);
  await page.screenshot({ path: `${OUT}/phone-unlocked.png` });

  // PHONE LANDSCAPE — locked, then tap into the tutorial to confirm the
  // lessons curriculum opens (the obvious way forward works)
  await bootMenu(page, true);
  await page.getByTestId('start-tutorial').dispatchEvent('click');
  await page.waitForFunction(() => window.__ec?.getState().lessonsOpen === true, undefined, {
    timeout: 15_000,
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/phone-locked-into-tutorial.png` });
});
