// Not a regression test: NIGHT before/after for the night-deepening pass
// (item 3, OWNER-CONTESTED). Powers the dense City cluster on a real London
// game (designate gas peakers → accept the first bids, which are instant-
// online → grid/dist subs + 33 kV feeders), hides all chrome (photo mode),
// pins the renderer atmosphere to deep night (render-only — the sim never
// sees it), and shoots FAR + MID at desktop AND phone-landscape so the
// deepened night grade + boosted window-glow can be judged against baseline.
// The City is the right canvas: dense buildings = many lit windows against
// the (slightly deeper) cosy dusk fabric. Run on demand:
//   NIGHTTAG=before npx playwright test e2e/nightshots.helper.spec.ts
//   NIGHTTAG=after  npx playwright test e2e/nightshots.helper.spec.ts
import { type Page, expect, test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.NIGHTTAG, 'night-shot helper — run with NIGHTTAG=before|after');

const TAG = process.env.NIGHTTAG ?? 'x';
const NIGHT = 22 * 60; // 22:00 — deep night, window glow at its strongest
const CLEAR = { cloud: 0.12, wind: 0.25 };

/** Hide chrome (photo mode) AND pin deep night — photo mode pins its own
 *  golden-hour grade, so we re-pin night right after so night always wins. */
async function cleanNight(page: Page): Promise<void> {
  await page.evaluate(() => window.__ec?.getState().setPhotoMode(true));
  await page.waitForTimeout(60); // let photo mode's grade effect run first
  await page.evaluate(
    ([min, w]) => window.__ec?.setAtmosphere(min as number, w as { cloud: number; wind: number }),
    [NIGHT, CLEAR],
  );
}

test('night before/after — powered City', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };

  // --- power the City: designate two gas peakers, accept first bids (instant
  // online), then grid hubs (132/33) + dist subs (radius 6) + feeders. Sites
  // verified buildable in e2e/herolights.helper.spec.ts.
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 106, y: 70 } });
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 135, y: 64 } });
  await cmd({ type: 'setSpeed', speed: 16 });
  const accepted = new Set<number>();
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(1000);
    const bids = await page.evaluate(() => {
      const s = window.__ec?.getState();
      return (s?.snapshot?.inbox.tenders ?? [])
        .filter((t) => t.status === 'open' && (t.bids?.length ?? 0) > 0)
        .map((t) => ({ id: t.id, dev: t.bids[0]!.developerId }));
    });
    for (const b of bids) {
      if (accepted.has(b.id)) continue;
      await cmd({ type: 'acceptBid', tenderId: b.id, developerId: b.dev });
      accepted.add(b.id);
    }
    const live = await store<number>(page, "(s)=>s.snapshot.assets.filter((a)=>a.kind==='gen').length");
    if (live >= 2 && accepted.size >= 2) break;
  }
  await cmd({ type: 'setSpeed', speed: 1 });

  const grids: Array<[number, number]> = [
    [110, 74], [116, 83], [136, 68], [140, 90],
  ];
  for (const [x, y] of grids) await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x, y } });
  const dists: Array<{ x: number; y: number; feed: [number, number] }> = [
    { x: 118, y: 74, feed: [110, 74] },
    { x: 114, y: 76, feed: [110, 74] },
    { x: 113, y: 68, feed: [110, 74] },
    { x: 118, y: 92, feed: [116, 83] },
    { x: 119, y: 80, feed: [116, 83] },
    { x: 107, y: 84, feed: [116, 83] },
    { x: 105, y: 94, feed: [116, 83] },
    { x: 137, y: 65, feed: [136, 68] },
    { x: 140, y: 92, feed: [140, 90] },
  ];
  for (const d of dists) await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: d.x, y: d.y } });
  await page.waitForTimeout(300);
  const feeds132: Array<[number, number, number, number]> = [
    [106, 70, 110, 74], [110, 74, 116, 83], [135, 64, 136, 68], [136, 68, 140, 90],
  ];
  for (const [ax, ay, bx, by] of feeds132) {
    await cmd({ type: 'build', spec: { kind: 'line', level: 132, build: 'overhead', ax, ay, bx, by } });
  }
  for (const d of dists) {
    await cmd({
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: d.feed[0], ay: d.feed[1], bx: d.x, by: d.y },
    });
  }
  await cmd({ type: 'setSpeed', speed: 4 });
  await page.waitForTimeout(7000);
  await cmd({ type: 'setSpeed', speed: 0 });
  await page.waitForTimeout(500);
  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  console.log(`[nightshots ${TAG}] servedCustomers:`, served);
  expect(served).toBeGreaterThan(0);

  // --- desktop (1100x700) ---
  // MID zoom on the lit City cluster
  await cleanNight(page);
  await page.evaluate(() => {
    window.__ec?.panTo(114, 82);
    window.__ec?.setZoom(0.6);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `preview/night-${TAG}-desktop-mid.png` });

  // FAR / top zoom over the whole region (the global tint, lights sparse)
  await cleanNight(page);
  await page.evaluate(() => {
    window.__ec?.panTo(120, 84);
    window.__ec?.setZoom(0.1);
  });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `preview/night-${TAG}-desktop-far.png` });

  // --- phone landscape ---
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await cleanNight(page);
  await page.evaluate(() => {
    window.__ec?.panTo(114, 82);
    window.__ec?.setZoom(0.55);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `preview/night-${TAG}-phone-mid.png` });

  await cleanNight(page);
  await page.evaluate(() => {
    window.__ec?.panTo(120, 84);
    window.__ec?.setZoom(0.1);
  });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `preview/night-${TAG}-phone-far.png` });
});
