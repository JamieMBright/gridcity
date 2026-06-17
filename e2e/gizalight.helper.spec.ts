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
//
// NOTE on the grid hub: it sits at (18,148), a CLEAR desert tile. An earlier
// revision put it at (16,148) — which is a desert CARRIAGEWAY, so the hub (and
// with it every 132/33 kV line) silently failed to build, islanding the dist
// subs from the peaker and leaving servedCustomers=0. Each build below is now
// asserted, and the ON run hard-asserts servedCustomers>0, so that regression
// (a dark plateau that looks "ON") can never slip through again.

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
  // count placed assets of a kind/sub so each build can be VERIFIED (the worker
  // swallows a failed build, so an un-asserted build looks identical to a
  // succeeded one — exactly what hid the dead grid hub before).
  const countAssets = async (pred: string): Promise<number> =>
    store<number>(page, `(s)=>s.snapshot.assets.filter(${pred}).length`);
  const buildVerified = async (c: Record<string, unknown>, pred: string): Promise<void> => {
    const before = await countAssets(pred);
    await cmd(c);
    await page.waitForTimeout(300);
    await expect
      .poll(async () => countAssets(pred), {
        timeout: 20_000,
        message: `build did not place: ${JSON.stringify(c)}`,
      })
      .toBeGreaterThan(before);
  };

  // pin dusk for every shot (render-only; the sim never sees it)
  await page.evaluate((t) => window.__ec?.setAtmosphere(t, { cloud: 0.1, wind: 0.25 }), DUSK);

  // Frame the Giza plateau. The monuments span x∈[18,32], so a wide-ish zoom
  // captures the ENSEMBLE (Great Pyramid + Khafre + Sphinx) rather than a
  // single face. setZoom BEFORE panTo (panTo centres at the live zoom). The
  // plateau is in the far SW corner, so the camera clamp may nudge the centre
  // — getCamera() is logged so the framing is auditable.
  // The build phase fast-forwards game time (for the gas-peaker bid), which can
  // roll a severe-weather event whose centre modal would occlude the plateau in
  // a screenshot. Dismiss any such blocking modal before each framed shot so the
  // design-gate images are never at the mercy of a weather roll. (The lit-hero
  // assertion reads renderer state, so it is unaffected either way — this only
  // keeps the PNGs clean.)
  const dismissModals = async (): Promise<void> => {
    for (const name of ['ride it out', 'skip', 'rebuild it', 'got it', 'continue']) {
      const b = page.getByRole('button', { name, exact: false });
      if ((await b.count()) > 0 && (await b.first().isVisible().catch(() => false))) {
        await b.first().dispatchEvent('click').catch(() => undefined);
        await page.waitForTimeout(150);
      }
    }
  };

  const frameGiza = async (zoom = 0.62, cx = 25, cy = 154): Promise<void> => {
    // setZoom BEFORE panTo (panTo centres at the live zoom). Apply twice with a
    // beat between — the very first call can race the renderer init and clamp
    // the zoom to MIN, so a second application after a settle lands the frame.
    const apply = async (): Promise<void> => {
      await page.evaluate(
        ({ zoom, cx, cy }) => {
          window.__ec?.setZoom(zoom);
          window.__ec?.panTo(cx, cy);
        },
        { zoom, cx, cy },
      );
    };
    await apply();
    await page.waitForTimeout(500);
    await apply();
    await page.waitForTimeout(900);
    await dismissModals(); // clear any storm/event modal so the shot is clean
    const cam = await page.evaluate(() => window.__ec?.getCamera());
    console.log('GIZA frame -> camera', JSON.stringify(cam));
  };
  await frameGiza();

  // the Giza Sound-&-Light KINDS currently energised (one entry per lit hero).
  // `pyramidFlood`/`sphinxFlood` are Cairo-exclusive to the four Giza monuments,
  // so their presence is an honest "the floodlights are FIRING" signal — far
  // truer than servedCustomers, since the monuments carry heritage load but no
  // domestic customers of their own.
  const gizaLit = async (): Promise<number> =>
    page.evaluate(
      () =>
        (window.__ec?.getLitHeroKinds() ?? []).filter(
          (k) => k === 'pyramidFlood' || k === 'sphinxFlood',
        ).length,
    );

  // BEFORE: no network ⇒ the plateau is an unserved load ⇒ floodlights DARK.
  // Shoot BOTH the wide plateau and the close framing so each ON shot has an
  // exactly-matched OFF counterpart for the side-by-side. Assert the Giza
  // floodlights are genuinely OFF here (the OFF shot must be honestly dark).
  const litOff = await gizaLit();
  console.log('GIZA design-gate: Giza floodlights lit BEFORE network =', litOff);
  expect(litOff, 'Giza floodlights must be DARK with no network (the OFF shot)').toBe(0);
  await page.screenshot({ path: 'preview/giza-OFF.png' });
  // a close framing that still holds the ENSEMBLE — the Great Pyramid + Khafre +
  // the Sphinx — so the Sound-&-Light beams fanning above the monuments read in
  // the ON shot (0.95 was so tight the Great Pyramid filled the frame and hid
  // the beams + the rest of the necropolis).
  await frameGiza(0.82, 24, 155);
  await page.screenshot({ path: 'preview/giza-OFF-closeup.png' });
  await frameGiza(); // back to the wide frame for the build phase

  // --- energise the plateau: a gas peaker (132 kV) → grid hub (132/33) →
  // dist subs (33 kV, radius ~8.5 at 40 MVA) sat around the monuments.
  //
  // ORDER MATTERS: build all the FIXED network (hub + plateau dist subs + their
  // 33 kV radials) FIRST, at speed 1 — so no time passes and town growth can
  // never infill a plateau tile out from under a planned sub (a slow tender
  // award once fast-forwarded enough game-time to do exactly that). Only THEN
  // designate the gas peaker and fast-forward for its bid; the award is
  // instant-online, and the 132 kV line that ties it to the hub goes in last.
  const HUB: [number, number] = [18, 148]; // a CLEAR desert tile (NOT the (16,148) carriageway)
  await buildVerified(
    { type: 'build', spec: { kind: 'sub', sub: 'grid', x: HUB[0], y: HUB[1] } },
    "(a)=>a.kind==='sub'&&a.sub==='grid'",
  );
  // dist subs on the plateau (40 MVA each), each fed from the grid hub at 33 kV
  const dists: Array<[number, number]> = [
    [20, 150],
    [28, 151],
    [22, 157],
  ];
  for (const [x, y] of dists) {
    await buildVerified(
      { type: 'build', spec: { kind: 'sub', sub: 'dist', x, y, mva: 40 } },
      `(a)=>a.kind==='sub'&&a.sub==='dist'&&a.x===${x}&&a.y===${y}`,
    );
    // each radial bumps the 33 kV line count (buildVerified asserts > before)
    await buildVerified(
      {
        type: 'build',
        spec: { kind: 'line', level: 33, build: 'overhead', ax: HUB[0], ay: HUB[1], bx: x, by: y },
      },
      "(a)=>a.kind==='line'&&a.level===33",
    );
  }

  // NOW the gas peaker: designate the site, fast-forward for the developer bid,
  // accept it (award is instant-online), then tie it to the hub at 132 kV.
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 11, y: 146 } });
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
  await buildVerified(
    {
      type: 'build',
      spec: { kind: 'line', level: 132, build: 'overhead', ax: 11, ay: 146, bx: HUB[0], by: HUB[1] },
    },
    "(a)=>a.kind==='line'&&a.level===132",
  );

  // let the network settle + report how much of the plateau is now served
  await cmd({ type: 'setSpeed', speed: 8 });
  await page.waitForTimeout(6000);
  await cmd({ type: 'setSpeed', speed: 1 });
  await page.waitForTimeout(1500);

  // wait for the plateau to actually energise. The AUTHORITATIVE proof is the
  // Sound-&-Light floodlights themselves coming ON — the recomputeHeroLit gate
  // keys off the monuments' OWN footprint coverage, so a lit Giza == a powered
  // Giza. (servedCustomers also climbs, because the dist-sub catchments pick up
  // the desert-edge settlement around the plateau, but the monuments' heritage
  // load carries no domestic customers, so the lit-hero set is the honest gate.)
  await expect
    .poll(() => gizaLit(), {
      timeout: 25_000,
      message:
        'Giza Sound-&-Light never fired (no pyramidFlood/sphinxFlood lit) — the plateau is islanded/unserved',
    })
    .toBeGreaterThan(0);
  const served = await store<number>(page, '(s) => s.snapshot.bill.servedCustomers');
  const assets = await store<number>(page, '(s) => s.snapshot.assets.length');
  const litOn = await gizaLit();
  console.log(
    'GIZA design-gate: assets placed =',
    assets,
    ' servedCustomers =',
    served,
    ' Giza floodlights lit =',
    litOn,
  );
  // the plateau must be genuinely energised AND the Sound-&-Light show running
  expect(litOn, 'the Giza Sound-&-Light floodlights must be ON for the ON shot').toBeGreaterThan(0);
  expect(served, 'the plateau catchment must be genuinely energised for the ON shot').toBeGreaterThan(
    0,
  );

  // AFTER (desktop): the Sound-&-Light floodlights ON across the plateau
  await frameGiza();
  await page.screenshot({ path: 'preview/giza-ON-desktop.png' });

  // a close grab that holds the whole necropolis (Great Pyramid + Khafre +
  // Sphinx) so the Sound-&-Light beams fanning UP the faces + the warm wash
  // both read — matched to the OFF-closeup framing for the side-by-side.
  await frameGiza(0.82, 24, 155);
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
