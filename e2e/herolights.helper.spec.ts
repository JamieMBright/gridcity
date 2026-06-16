// DESIGN GATE for the per-hero ELECTRIFICATION light-show (owner, 2026-06-15):
// heroes light up with a bespoke night light-show WHEN ENERGISED. Drives a real
// London game: pins DUSK, shoots the City heroes UNENERGISED (dark), then powers
// them (gen tender → accept bid → instant-online → grid/dist subs + 33 kV lines)
// and shoots them LIT. Saves to preview/herolights-*.png for the design review.
//   npx playwright test e2e/herolights.helper.spec.ts  (with SHOTS=1)

import { test } from '@playwright/test';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'design-gate screenshot helper — run with SHOTS=1');

const DUSK = 22 * 60; // 22:00 — full night, the light-show at its strongest (glow≈1)

test('hero electrification light-show', async ({ page }) => {
  test.setTimeout(420_000);
  await boot(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  // pin dusk for every shot (render-only)
  await page.evaluate((t) => window.__ec?.setAtmosphere(t, { cloud: 0.15, wind: 0.3 }), DUSK);

  // frame the City cluster (Shard 118,89 · Gherkin 118,77 · St Paul's 114,79 ·
  // BT Tower 113,71 · Parliament 109,86 · Eye 108,94 · fortress · tower bridge)
  await page.evaluate(() => {
    window.__ec?.panTo(114, 83);
    window.__ec?.setZoom(0.62);
  });
  await page.waitForTimeout(1000);
  // BEFORE: nothing powered ⇒ no light-show (heroes dark at dusk)
  await page.screenshot({ path: 'preview/herolights-city-OFF.png' });

  // --- power the heroes: designate gas peakers (132 kV), accept the first bids
  // (award is instant-online), then GRID hubs fed at 132 + DIST subs (radius 6)
  // beside each hero fed at 33 kV — the hero tiles fall inside the catchments.
  // Sites verified buildable against the seeded City fabric (a diag probe).
  const designate = async (x: number, y: number): Promise<void> => {
    await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x, y } });
  };
  await designate(106, 70); // City peaker
  await designate(135, 64); // east peaker (Olympic Park + O2)

  await cmd({ type: 'setSpeed', speed: 16 });
  // poll until each open tender has a bid, then accept (instant online)
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
    const live = await store<number>(
      page,
      "(s)=>s.snapshot.assets.filter((a)=>a.kind==='gen').length",
    );
    if (live >= 2 && accepted.size >= 2) break;
  }
  await cmd({ type: 'setSpeed', speed: 1 });

  // GRID hubs (132/33) fed from the peakers
  const grids: Array<[number, number]> = [
    [110, 74], // City core
    [116, 83], // south City (river bank)
    [136, 68], // Olympic Park
    [140, 90], // the O2
  ];
  for (const [x, y] of grids) {
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x, y } });
  }
  // DIST subs beside each hero (radius 6 covers the anchor); paired with the
  // nearest grid hub that feeds them at 33 kV
  const dists: Array<{ x: number; y: number; feed: [number, number] }> = [
    { x: 118, y: 74, feed: [110, 74] }, // Gherkin
    { x: 114, y: 76, feed: [110, 74] }, // St Paul's dome
    { x: 113, y: 68, feed: [110, 74] }, // BT Tower
    { x: 118, y: 92, feed: [116, 83] }, // Shard
    { x: 119, y: 80, feed: [116, 83] }, // fortress + tower bridge (neighbour-fed)
    { x: 107, y: 84, feed: [116, 83] }, // Parliament
    { x: 105, y: 94, feed: [116, 83] }, // the Eye
    { x: 136, y: 68, feed: [136, 68] }, // stadium (grid hub doubles here)
    { x: 137, y: 65, feed: [136, 68] }, // orbit
    { x: 140, y: 92, feed: [140, 90] }, // the O2
  ];
  for (const d of dists) {
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: d.x, y: d.y } });
  }
  await page.waitForTimeout(300);
  // 132 kV feeds peaker → grid hubs, plus a grid↔grid tie so both peakers back
  // the whole City; then 33 kV feeders grid → each dist
  const feeds132: Array<[number, number, number, number]> = [
    [106, 70, 110, 74], // City peaker → City grid
    [110, 74, 116, 83], // City grid → south-City grid
    [135, 64, 136, 68], // east peaker → park grid
    [136, 68, 140, 90], // park grid → O2 grid
  ];
  for (const [ax, ay, bx, by] of feeds132) {
    await cmd({ type: 'build', spec: { kind: 'line', level: 132, build: 'overhead', ax, ay, bx, by } });
  }
  for (const d of dists) {
    if (d.x === d.feed[0] && d.y === d.feed[1]) continue; // grid hub == dist site
    await cmd({
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: d.feed[0], ay: d.feed[1], bx: d.x, by: d.y },
    });
  }

  // let dispatch energise + the coverage propagate
  await cmd({ type: 'setSpeed', speed: 4 });
  await page.waitForTimeout(7000);
  await cmd({ type: 'setSpeed', speed: 0 });
  await page.waitForTimeout(600);
  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  console.log('servedCustomers after powering the heroes:', served);

  // re-pin dusk (a few sim hours passed) and shoot the lit City
  await page.evaluate((t) => window.__ec?.setAtmosphere(t, { cloud: 0.15, wind: 0.3 }), DUSK);
  await page.evaluate(() => {
    window.__ec?.panTo(114, 83);
    window.__ec?.setZoom(0.62);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'preview/herolights-city-ON.png' });

  // close-ups. `up` lifts the clip so a TALL hero's lit crown (which towers far
  // above its ground tile) sits inside the frame, not above it.
  const shot = async (
    name: string,
    x: number,
    y: number,
    zoom: number,
    up = 0,
  ): Promise<void> => {
    await page.evaluate((z) => window.__ec?.setZoom(z), zoom);
    await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), { x, y });
    await page.waitForTimeout(900);
    const p = await page.evaluate(
      (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 640, y: 400 },
      { x, y },
    );
    const H = 540;
    await page.screenshot({
      path: `preview/herolights-${name}.png`,
      clip: {
        x: Math.max(0, p.x - 280),
        y: Math.max(0, p.y - up - H * 0.5),
        width: 560,
        height: H,
      },
    });
  };
  // tall slim spikes: zoom OUT so the whole tower fits, lift the clip to its tip
  await shot('shard', 118, 89, 0.6, 220); // towers to z300
  await shot('bttower', 113, 71, 0.6, 200);
  await shot('gherkin', 118, 77, 0.85, 120);
  await shot('stpauls', 114, 79, 0.95, 80);
  await shot('parliament', 109, 86, 0.85, 120);
  await shot('eye', 108, 94, 0.95, 110);
  await shot('stadium', 133, 68, 0.7, 30);
  await shot('o2', 140, 89, 0.7, 50);

  // a mid-zoom east cluster for the stadium + orbit + O2 together
  await page.evaluate(() => {
    window.__ec?.panTo(137, 78);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/herolights-east.png' });

  // far-overview sanity: the light-shows must NOT clutter the whole-region view
  await page.evaluate(() => {
    window.__ec?.panTo(120, 84);
    window.__ec?.setZoom(0.1);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/herolights-far.png' });
});
