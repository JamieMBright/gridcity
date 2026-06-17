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
const ALL_CITIES = [
  'london', 'paris', 'newyork', 'sydney', 'hongkong', 'berlin',
  'shanghai', 'capetown', 'cairo', 'athens', 'pune', 'northeast',
];
// NIGHTCITIES=london,paris narrows the run (fast iteration); default = all 12.
const CITIES = (process.env.NIGHTCITIES?.split(',').map((s) => s.trim()).filter(Boolean) ??
  ALL_CITIES) as readonly string[];
// the two we also grab on a phone held landscape (Euro + non-Euro fabric)
const PHONE_CITIES = new Set(['london', 'hongkong']);

interface Anchor {
  x: number;
  y: number;
  kind: string;
}

/** Hide chrome ONCE for the whole run (photo mode), and let its one-shot
 *  golden-hour grade pin land + settle. We deliberately do NOT toggle photo
 *  mode again after this — its grade-pin effect only fires on the photoMode
 *  flag change, so leaving it on means it never re-pins golden and our per-shot
 *  night override (cleanNight) always wins. */
async function enterPhotoMode(page: Page): Promise<void> {
  await page.evaluate(() => window.__ec?.getState().setPhotoMode(true));
  await page.waitForTimeout(500); // let the golden-hour effect run + settle
}

/** Pin deep night for the shot and WAIT until the eased grade has genuinely
 *  arrived at night (the tint/sky/glow ease over frames). Photo mode is already
 *  on and never re-pins, so this override holds. Polls the live grade glow so we
 *  don't guess a fixed settle time. */
async function cleanNight(page: Page): Promise<void> {
  // RE-ASSERT the night override on every poll tick: a fresh city switch rebuilds
  // the renderer (clearing its atmosphere override), and the eased grade glow
  // ramps 0→1 over frames — re-pinning each tick is robust to both. Don't hard-
  // fail the whole 12-city run if one city's ease is slow; proceed after the wait.
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
  await page.waitForTimeout(450); // let the eased tint/sky fully land
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
  await enterPhotoMode(page); // hide chrome once; its golden pin is then inert

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

    // --- ENERGISE the powered HERO DISTRICTS (render-only cheat): heroes +
    // demand within a small radius glow in lit pockets against a cosy DARK
    // countryside (a fully-lit 100% city blows out to a flat bright wash — the
    // cosy night needs lit-vs-unlit contrast). ---
    const MODE: 'all' | number =
      process.env.NIGHTMODE === 'all' ? 'all' : Number(process.env.NIGHTMODE ?? 5);
    await page.evaluate((m) => window.__ec?.serveAll(m), MODE);
    // tick a couple of times so the service derives + the renderer ingests the
    // powered coverage (a fresh city switch hasn't derived demand tiles yet).
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 4 }));
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 }));
    await page.waitForTimeout(300);

    const anchors = (await page.evaluate(() => window.__ec?.getHeroAnchors() ?? [])) as Anchor[];
    const district = heroDistrict(anchors);
    const centre = cityCentre(anchors);
    const litKinds = (await page.evaluate(() => window.__ec?.getLitHeroKinds() ?? [])) as string[];
    const served = await store<number>(page, '(s) => s.snapshot.stats.servedCustomers');
    const onTiles = await store<number>(
      page,
      '(s) => { let n=0; const c=s.snapshot.coverage; for(let i=0;i<c.length;i++) if(c[i]===2) n++; return n; }',
    );
    const hist: Record<string, number> = {};
    for (const k of litKinds) hist[k] = (hist[k] ?? 0) + 1;
    console.log(
      `[night ${city}] heroes=${anchors.length} lit=${litKinds.length} served=${served} ` +
        `onTiles=${onTiles} district=${district.x},${district.y} kinds=${JSON.stringify(hist)}`,
    );

    // --- desktop shots: HERO close, MID, FAR ---
    await cleanNight(page);
    await page.evaluate((d) => {
      window.__ec?.setZoom(0.95);
      window.__ec?.panTo(d.x, d.y);
    }, district);
    await page.waitForTimeout(900);
    const dbg = await page.evaluate(() => ({
      grade: window.__ec?.getGradeDebug(),
      photo: window.__ec?.getState().photoMode,
    }));
    console.log(
      `[night ${city}] grade glow=${dbg.grade?.glow.toFixed(2)} ` +
        `tint=0x${(dbg.grade?.tint ?? 0).toString(16)} sky=0x${(dbg.grade?.skyTop ?? 0).toString(16)} ` +
        `override=${dbg.grade?.override} photoMode=${dbg.photo}`,
    );
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
