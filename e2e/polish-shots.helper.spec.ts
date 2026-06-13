// RENDER/POLISH lane design gate (#43/#38/#48): screenshots of a plant
// under construction, a camera-bookmark jump, and photo mode, at desktop
// AND phone-landscape. Not a regression test — run on demand:
//   SHOTS=1 npx playwright test e2e/polish-shots.helper.spec.ts
import { test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'polish screenshot helper — run with SHOTS=1');

const cmd = async (page: import('@playwright/test').Page, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

/** Force a freshly-built gen into an underConstruction state by pinning its
 *  liveAtMin far in the future on the live snapshot and re-pushing it. The
 *  renderer's snapshot effect re-runs updateDynamic and draws the staged
 *  construction site. We pause first so the worker doesn't immediately
 *  overwrite the snapshot. `frac` = fraction of lead time remaining → stage. */
async function forceConstruction(
  page: import('@playwright/test').Page,
  frac: number,
): Promise<void> {
  await page.evaluate((f) => {
    const st = window.__ec!.getState();
    const snap = st.snapshot;
    if (!snap) return;
    const now = snap.simTimeMin;
    // total lead 51 days (windOnshore planning+build) in game-minutes
    const lead = 51 * 1440;
    const assets = snap.assets.map((a) =>
      a.kind === 'gen' ? { ...a, liveAtMin: now + lead * f } : a,
    );
    st.setSnapshot({ ...snap, assets });
  }, frac);
  await page.waitForTimeout(400);
}

test('polish: construction / bookmarks / photo mode', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page);

  // pause so our forced snapshot survives, then build a few plants on
  // clearly-visible open land (so the construction sites read at close zoom)
  await cmd(page, { type: 'setSpeed', speed: 0 });
  const land = await page.evaluate(() => window.__ec?.openLand(6) ?? []);
  const sites = (land as Array<{ x: number; y: number }>).slice(0, 3);
  const gens = ['gasPeaker', 'gasCCGT', 'gasPeaker'] as const;
  for (let i = 0; i < sites.length; i++) {
    const t = sites[i]!;
    await cmd(page, { type: 'build', spec: { kind: 'gen', gen: gens[i], x: t.x, y: t.y } });
  }
  await page.waitForTimeout(400);

  const focus = sites[0] ?? { x: 132, y: 52 };
  await page.evaluate((f) => {
    window.__ec?.panTo(f.x, f.y);
    window.__ec?.setZoom(1.3);
  }, focus);

  // --- #43 construction site, four stages (desktop) ---
  for (const [tag, frac] of [
    ['early', 0.95],
    ['mid', 0.45],
    ['late', 0.1],
  ] as const) {
    await forceConstruction(page, frac);
    await page.screenshot({ path: `preview/polish-construction-${tag}.png` });
  }
  // commissioned: clears construction → finished plant art
  await page.evaluate(() => {
    const st = window.__ec!.getState();
    const snap = st.snapshot!;
    st.setSnapshot({ ...snap }); // re-push; assets already have liveAtMin past
  });
  await cmd(page, { type: 'setSpeed', speed: 1 });
  await page.waitForTimeout(1500);
  await cmd(page, { type: 'setSpeed', speed: 0 });
  await page.screenshot({ path: 'preview/polish-construction-done.png' });

  // --- #38 camera bookmarks: save a view, move, jump back ---
  await page.evaluate(() => {
    window.__ec?.panTo(132, 52);
    window.__ec?.setZoom(0.7);
  });
  await page.waitForTimeout(300);
  // open the bookmarks control + save current
  await page.getByRole('button', { name: 'camera bookmarks' }).dispatchEvent('click');
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /save current view/ }).dispatchEvent('click');
  await page.waitForTimeout(200);
  const saved = await store<unknown>(page, '(s) => s.bookmarks');
  console.log('bookmarks after save:', JSON.stringify(saved));
  await page.screenshot({ path: 'preview/polish-bookmarks-panel.png' });
  // drift the camera away
  await page.evaluate(() => {
    window.__ec?.panTo(60, 100);
    window.__ec?.setZoom(0.18);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/polish-bookmarks-away.png' });
  // jump back via the saved view (accessible name = the visible "View 1")
  await page.getByRole('button', { name: /^View 1/ }).dispatchEvent('click');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/polish-bookmarks-jumped.png' });

  // --- #48 photo mode (desktop): chrome hidden, clean frame ---
  await page.getByRole('button', { name: 'photo mode' }).dispatchEvent('click');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/polish-photo-desktop.png' });
  // exit
  await page.getByRole('button', { name: 'Exit photo mode (Esc)' }).dispatchEvent('click');
  await page.waitForTimeout(300);

  // --- phone-landscape pass ---
  await page.setViewportSize({ width: 740, height: 360 });
  await page.waitForTimeout(400);
  await page.evaluate((f) => {
    window.__ec?.panTo(f.x, f.y);
    window.__ec?.setZoom(1.0);
  }, focus);
  await forceConstruction(page, 0.3);
  await page.screenshot({ path: 'preview/polish-construction-mobile.png' });
  // photo mode on mobile
  await page.getByRole('button', { name: 'photo mode' }).dispatchEvent('click');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/polish-photo-mobile.png' });
});
