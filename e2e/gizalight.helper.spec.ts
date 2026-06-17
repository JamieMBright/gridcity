// DESIGN GATE for WP3 — the Giza Sound-&-Light show as an ENERGISABLE DEMAND
// POINT (Cairo). Drives a real Cairo game: pins DUSK, frames the Giza plateau,
// shoots it UNPOWERED (the pyramids + Sphinx dark — a real unserved load), then
// builds network out to it (gas peaker → 132 kV → grid hub → 33 kV → dist subs
// on the plateau) and shoots it ENERGISED (the Sound-&-Light floodlights ON).
// Desktop + phone-landscape. Saves to preview/giza-*.png for the design review.
//   SHOTS=1 npx playwright test e2e/gizalight.helper.spec.ts
//
// Giza sits in the far SW desert: monuments span x∈[18,32], y∈[151,158],
// centroid ~(24,155). The dist subs (radius ~8.5 at 40 MVA) cover the plateau;
// their catchments include the monument footprints, so the hero-light gate in
// MapRenderer.recomputeHeroLit fires off the monuments' OWN energisation.

import { test } from '@playwright/test';
import { expect, type Page } from '@playwright/test';
import { store } from './helpers';

test.skip(!process.env.SHOTS, 'design-gate screenshot helper — run with SHOTS=1');

const DUSK = 22 * 60; // 22:00 — full night, the Sound-&-Light at its strongest

/** Boot straight into the Cairo scenario via the city picker. */
async function bootCairo(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  // open the start menu if it isn't already, then New Game → pick Cairo
  if (!(await page.evaluate(() => window.__ec?.getState().menuOpen))) {
    // already in a game (continued a save) — force back to the menu via New Game
    const ng = page.getByRole('button', { name: 'new game' });
    if ((await ng.count()) > 0) await ng.dispatchEvent('click');
  } else {
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) {
      // skip the save and start fresh so we land on the picker
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
    } else {
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
    }
  }
  const cairo = page.getByTitle('power Cairo', { exact: true });
  await expect.poll(async () => cairo.count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await cairo.first().dispatchEvent('click');
  await expect.poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
  // dismiss any opening letterbox / story screen
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
  // confirm we really are on Cairo
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot.scenarioId ?? ""'), { timeout: 10_000 })
    .toBe('cairo');
}

test('Giza Sound-&-Light electrification', async ({ page }) => {
  test.setTimeout(420_000);
  await bootCairo(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };

  // pin dusk for every shot (render-only; the sim never sees it)
  await page.evaluate((t) => window.__ec?.setAtmosphere(t, { cloud: 0.1, wind: 0.25 }), DUSK);

  // frame the Giza plateau, close zoom
  const frameGiza = async (): Promise<void> => {
    await page.evaluate(() => {
      window.__ec?.panTo(24, 154);
      window.__ec?.setZoom(0.95);
    });
    await page.waitForTimeout(1200);
  };
  await frameGiza();

  // BEFORE: no network ⇒ the plateau is an unserved load ⇒ floodlights DARK
  await page.screenshot({ path: 'preview/giza-OFF.png' });

  // --- energise the plateau: a gas peaker (132 kV) → grid hub (132/33) →
  // dist subs (33 kV, radius ~8.5 at 40 MVA) sat around the monuments.
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 11, y: 146 } });
  // accept the first bid on the resulting tender (award is instant-online)
  await cmd({ type: 'setSpeed', speed: 16 });
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(1000);
    const bids = await page.evaluate(() => {
      const s = window.__ec?.getState();
      return (s?.snapshot?.inbox.tenders ?? [])
        .filter((t) => t.status === 'open' && (t.bids?.length ?? 0) > 0)
        .map((t) => ({ id: t.id, dev: t.bids[0]!.developerId }));
    });
    for (const b of bids) await cmd({ type: 'acceptBid', tenderId: b.id, developerId: b.dev });
    const live = await store<number>(
      page,
      "(s)=>s.snapshot.assets.filter((a)=>a.kind==='gen').length",
    );
    if (live >= 1) break;
  }
  await cmd({ type: 'setSpeed', speed: 1 });

  // grid hub fed from the peaker at 132 kV
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 16, y: 148 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 11, ay: 146, bx: 16, by: 148 },
  });
  // dist subs on the plateau (40 MVA each), each fed from the grid hub at 33 kV
  const dists: Array<[number, number]> = [
    [20, 150],
    [28, 151],
    [22, 157],
  ];
  for (const [x, y] of dists) {
    await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x, y, mva: 40 } });
    await cmd({
      type: 'build',
      spec: { kind: 'line', level: 33, build: 'overhead', ax: 16, ay: 148, bx: x, by: y },
    });
  }

  // let the network settle + report how much of the plateau is now served
  await cmd({ type: 'setSpeed', speed: 8 });
  await page.waitForTimeout(6000);
  await cmd({ type: 'setSpeed', speed: 1 });
  await page.waitForTimeout(1500);

  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  const assets = await store<number>(page, '(s) => s.snapshot.assets.length');
  console.log('GIZA design-gate: assets placed =', assets, ' servedCustomers =', served);

  // AFTER (desktop): the Sound-&-Light floodlights ON across the plateau
  await frameGiza();
  await page.screenshot({ path: 'preview/giza-ON-desktop.png' });

  // a tight grab on the Great Pyramid + Sphinx so the floodlight reads clearly
  await page.evaluate(() => {
    window.__ec?.panTo(26, 156);
    window.__ec?.setZoom(1.35);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'preview/giza-ON-closeup.png' });

  // AFTER (phone landscape): re-shoot lit at a phone-landscape viewport
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await frameGiza();
  await page.screenshot({ path: 'preview/giza-ON-phone.png' });

  // and the OFF state at phone-landscape for the side-by-side
  await page.evaluate(() => window.__ec?.setAtmosphere(22 * 60, { cloud: 0.1, wind: 0.25 }));
  await page.waitForTimeout(400);
});
