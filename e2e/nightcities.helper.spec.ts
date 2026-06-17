// NIGHT ELECTRIFICATION 12-CITY SHOWCASE + DESIGN GATE (owner, 2026-06-17:
// "every city glows beautifully when powered"). The game's soul is "powering an
// area makes it GLOW" + the hero doctrine's bespoke per-hero night light. This
// helper boots once, then for EACH of the 12 cities switches to it, ENERGISES
// the whole map (the dev __testServeAll cheat → every demand tile + hero
// footprint reads powered, no hand-wiring a grid per city), pins deep night
// (~22:00) and shoots FAR + MID + a HERO-DISTRICT close. Desktop for all 12;
// a phone-landscape sample for london + one non-Euro city. Output lands under
// preview/night/ for the harsh design review.
//
//   SHOTS=1 npx playwright test e2e/nightcities.helper.spec.ts
//
// It also logs, per city, how many heroes lit (getLitHeroKinds) and the kind
// histogram — a dead/garish city shows up in the numbers as well as the image.

import { type Page, expect, test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'night-showcase helper — run with SHOTS=1');

const NIGHT = 22 * 60; // 22:00 — deep night, window glow + hero lights strongest
const CLEAR = { cloud: 0.12, wind: 0.22, regime: 'mild' };
const CITIES = [
  'london', 'paris', 'newyork', 'sydney', 'hongkong', 'berlin',
  'shanghai', 'capetown', 'cairo', 'athens', 'pune', 'northeast',
] as const;
// the two we also grab on a phone held landscape (Euro + non-Euro fabric)
const PHONE_CITIES = new Set(['london', 'hongkong']);

interface Anchor {
  x: number;
  y: number;
  kind: string;
}

/** Hide chrome (photo mode) then RE-PIN deep night — photo mode pins its own
 *  golden-hour grade, so night must win after it. */
async function cleanNight(page: Page): Promise<void> {
  await page.evaluate(() => window.__ec?.getState().setPhotoMode(true));
  await page.waitForTimeout(60);
  await page.evaluate(
    ([min, w]) => window.__ec?.setAtmosphere(min as number, w as object),
    [NIGHT, CLEAR],
  );
}

/** The densest hero cluster's centroid (a simple grid-bucket vote), so we frame
 *  the part of the map where the heroes actually crowd — the "hero district". */
function heroDistrict(anchors: Anchor[]): { x: number; y: number } {
  if (anchors.length === 0) return { x: 64, y: 64 };
  const CELL = 14;
  const buckets = new Map<string, Anchor[]>();
  for (const a of anchors) {
    const key = `${Math.floor(a.x / CELL)},${Math.floor(a.y / CELL)}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(a);
  }
  let best: Anchor[] = [];
  for (const v of buckets.values()) if (v.length > best.length) best = v;
  const cx = best.reduce((s, a) => s + a.x, 0) / best.length;
  const cy = best.reduce((s, a) => s + a.y, 0) / best.length;
  return { x: Math.round(cx), y: Math.round(cy) };
}

/** Map centroid of ALL hero anchors (a decent "frame the city" target for the
 *  far shot, robust across maps of different sizes/placements). */
function cityCentre(anchors: Anchor[]): { x: number; y: number } {
  if (anchors.length === 0) return { x: 64, y: 64 };
  const cx = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
  const cy = anchors.reduce((s, a) => s + a.y, 0) / anchors.length;
  return { x: Math.round(cx), y: Math.round(cy) };
}

test('12-city powered-at-night showcase', async ({ page }) => {
  test.setTimeout(900_000);
  await boot(page);
  await page.setViewportSize({ width: 1100, height: 700 });

  for (const city of CITIES) {
    // --- switch to the city (renderer rebuilds; the test hook re-binds) ---
    await page.evaluate((c) => window.__ec?.startMission(c), city);
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().scenarioId), {
        timeout: 60_000,
      })
      .toBe(city);
    // wait for the rebuilt renderer to publish this city's hero anchors
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getHeroAnchors().length ?? 0), {
        timeout: 60_000,
      })
      .toBeGreaterThan(0);
    await page.evaluate(() => window.__ec?.getState().setMenuOpen(false));
    await page.waitForTimeout(400);

    // --- ENERGISE the whole map (render-only cheat) + let coverage settle ---
    await page.evaluate(() => window.__ec?.serveAll(true));
    // nudge a tick or two so the renderer ingests the powered coverage
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 1 }));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));
    await page.waitForTimeout(300);

    const anchors = (await page.evaluate(() => window.__ec?.getHeroAnchors() ?? [])) as Anchor[];
    const district = heroDistrict(anchors);
    const centre = cityCentre(anchors);
    const litKinds = (await page.evaluate(() => window.__ec?.getLitHeroKinds() ?? [])) as string[];
    const served = await store<number>(page, '(s) => s.snapshot.stats.servedCustomers');
    const hist: Record<string, number> = {};
    for (const k of litKinds) hist[k] = (hist[k] ?? 0) + 1;
    console.log(
      `[night ${city}] heroes=${anchors.length} lit=${litKinds.length} served=${served} ` +
        `district=${district.x},${district.y} kinds=${JSON.stringify(hist)}`,
    );

    // --- desktop shots: HERO close, MID, FAR ---
    await cleanNight(page);
    await page.evaluate((d) => {
      window.__ec?.setZoom(0.95);
      window.__ec?.panTo(d.x, d.y);
    }, district);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `preview/night/${city}-hero-close.png` });

    await cleanNight(page);
    await page.evaluate((d) => {
      window.__ec?.setZoom(0.42);
      window.__ec?.panTo(d.x, d.y);
    }, district);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `preview/night/${city}-mid.png` });

    await cleanNight(page);
    await page.evaluate((c) => {
      window.__ec?.setZoom(0.12);
      window.__ec?.panTo(c.x, c.y);
    }, centre);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `preview/night/${city}-far.png` });

    // --- phone-landscape sample for a couple of cities ---
    if (PHONE_CITIES.has(city)) {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(300);
      await cleanNight(page);
      await page.evaluate((d) => {
        window.__ec?.setZoom(0.55);
        window.__ec?.panTo(d.x, d.y);
      }, district);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `preview/night/${city}-phone-mid.png` });

      await cleanNight(page);
      await page.evaluate((c) => {
        window.__ec?.setZoom(0.12);
        window.__ec?.panTo(c.x, c.y);
      }, centre);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `preview/night/${city}-phone-far.png` });
      await page.setViewportSize({ width: 1100, height: 700 });
      await page.waitForTimeout(200);
    }
  }
});
