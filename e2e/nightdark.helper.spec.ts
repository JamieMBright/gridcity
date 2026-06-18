// NIGHT-DARK BODY GATE (owner, 2026-06-18: "Are all those white rectangles hero
// buildings?"). PR #87 killed the solar glare (good) but zeroed the night
// fabric-darkening, so unlit building BODIES now render as pale daytime boxes —
// "white rectangles" — instead of dark masses studded with warm windows. This
// helper shoots the powered-at-night scene for london + a dense city (hongkong)
// + berlin at FAR + MID + HERO-close, so the body-darkening fix can be judged
// against the white-rectangle before. Lands under preview/nightdark/.
//
//   BEFORE (current #87 head):  NIGHTDARK_TAG=before SHOTS=1 npx playwright test e2e/nightdark.helper.spec.ts
//   AFTER  (with the fix):      NIGHTDARK_TAG=after  SHOTS=1 npx playwright test e2e/nightdark.helper.spec.ts
//
// Render-only: the atmosphere override + serveAll are dev test hooks; the sim
// is never touched. Same scene recipe as nightcities.helper so the two gates
// agree, narrowed to the three review cities.

import { type Page, expect, test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'night-dark gate helper — run with SHOTS=1');

const TAG = process.env.NIGHTDARK_TAG ?? 'after';
const NIGHT = 22 * 60; // 22:00 — deep night, window glow + hero lights strongest
const CLEAR = { cloud: 0.12, wind: 0.22, regime: 'mild' };
const CITIES = (process.env.NIGHTDARK_CITIES?.split(',').map((s) => s.trim()).filter(Boolean) ??
  ['london', 'hongkong', 'berlin']) as readonly string[];

interface Anchor {
  x: number;
  y: number;
  kind: string;
}

async function enterPhotoMode(page: Page): Promise<void> {
  await page.evaluate(() => window.__ec?.getState().setPhotoMode(true));
  await page.waitForTimeout(500);
}

/** Pin deep night and wait until the eased grade has genuinely arrived (re-
 *  asserting each poll tick is robust to a fresh city switch rebuilding the
 *  renderer + the eased glow ramping 0→1 over frames). */
async function cleanNight(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          ([min, w]) => {
            window.__ec?.setAtmosphere(
              min as number,
              w as { cloud: number; wind: number; regime?: string },
            );
            return window.__ec?.getGradeGlow() ?? 0;
          },
          [NIGHT, CLEAR],
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0.9)
    .catch(() => undefined);
  await page.waitForTimeout(450);
}

function heroDistrict(anchors: Anchor[]): { x: number; y: number } {
  if (anchors.length === 0) return { x: 64, y: 64 };
  const CELL = 14;
  const buckets = new Map<string, Anchor[]>();
  const count = new Map<string, number>();
  for (const a of anchors) {
    const bx = Math.floor(a.x / CELL);
    const by = Math.floor(a.y / CELL);
    const key = `${bx},${by}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(a);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  // Score each bucket by its 3x3 neighbourhood sum, so a broad central mass
  // beats a lone dense bucket at the map edge (a peripheral cluster framed at
  // mid zoom can put the built area off-screen — bit Berlin). Then take the
  // members of the WINNING bucket as the focal district.
  let bestKey = '';
  let bestScore = -1;
  for (const [key] of buckets) {
    const [bx, by] = key.split(',').map(Number) as [number, number];
    let score = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) score += count.get(`${bx + dx},${by + dy}`) ?? 0;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  const best = buckets.get(bestKey) ?? [];
  const cx = best.reduce((s, a) => s + a.x, 0) / best.length;
  const cy = best.reduce((s, a) => s + a.y, 0) / best.length;
  return { x: Math.round(cx), y: Math.round(cy) };
}

function cityCentre(anchors: Anchor[]): { x: number; y: number } {
  if (anchors.length === 0) return { x: 64, y: 64 };
  const cx = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
  const cy = anchors.reduce((s, a) => s + a.y, 0) / anchors.length;
  return { x: Math.round(cx), y: Math.round(cy) };
}

test('night-dark body gate: london + hongkong + berlin', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);
  await page.setViewportSize({ width: 1100, height: 700 });
  await enterPhotoMode(page);

  for (const city of CITIES) {
    await page.evaluate((c) => window.__ec?.startMission(c), city);
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().scenarioId), {
        timeout: 60_000,
      })
      .toBe(city);
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getHeroAnchors().length ?? 0), {
        timeout: 60_000,
      })
      .toBeGreaterThan(0);
    await page.evaluate(() => window.__ec?.getState().setMenuOpen(false));
    await page.waitForTimeout(400);

    // energise the powered hero districts (lit pockets against a cosy dark fabric)
    const MODE: 'all' | number =
      process.env.NIGHTMODE === 'all' ? 'all' : Number(process.env.NIGHTMODE ?? 5);
    await page.evaluate((m) => window.__ec?.serveAll(m), MODE);
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 4 }));
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));
    await page.waitForTimeout(300);

    const anchors = (await page.evaluate(() => window.__ec?.getHeroAnchors() ?? [])) as Anchor[];
    const district = heroDistrict(anchors);
    const centre = cityCentre(anchors);
    const litKinds = (await page.evaluate(() => window.__ec?.getLitHeroKinds() ?? [])) as string[];
    const served = await store<number>(page, '(s) => s.snapshot.stats.servedCustomers');
    console.log(`[nightdark ${TAG} ${city}] heroes=${anchors.length} lit=${litKinds.length} served=${served}`);

    await cleanNight(page);
    await page.evaluate((d) => {
      window.__ec?.setZoom(0.95);
      window.__ec?.panTo(d.x, d.y);
    }, district);
    await page.waitForTimeout(900);
    const dbg = await page.evaluate(() => window.__ec?.getGradeDebug());
    console.log(
      `[nightdark ${TAG} ${city}] glow=${dbg?.glow.toFixed(2)} tint=0x${(dbg?.tint ?? 0).toString(16)}`,
    );
    await page.screenshot({ path: `preview/nightdark/${city}-hero-close-${TAG}.png` });

    await cleanNight(page);
    await page.evaluate((d) => {
      window.__ec?.setZoom(0.42);
      window.__ec?.panTo(d.x, d.y);
    }, district);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `preview/nightdark/${city}-mid-${TAG}.png` });

    await cleanNight(page);
    await page.evaluate((c) => {
      window.__ec?.setZoom(0.12);
      window.__ec?.panTo(c.x, c.y);
    }, centre);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `preview/nightdark/${city}-far-${TAG}.png` });
  }
});
