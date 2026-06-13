// Design-gate screenshots for the W15 SIM/RENDER lane (owner playtest bugs):
// the wind-turbine PLACEMENT GHOST (blades visible, rotor centred on the
// mast hub), a BUILT wind farm (live rotors centred), and two adjacent
// designations that CANNOT overlap (footprint reservation). Run on demand:
//   SHOTS=1 npx playwright test e2e/w15sim.helper.spec.ts
import { test } from '@playwright/test';
import { boot, openLand } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const cmd = async (page: import('@playwright/test').Page, c: unknown): Promise<void> => {
  await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
};

/** Arm a build tool + dial a farm size, then hover a tile so the ghost draws. */
async function armGhost(
  page: import('@playwright/test').Page,
  gen: string,
  mw: number,
  tile: { x: number; y: number },
): Promise<void> {
  await page.evaluate(
    ({ gen: g, mw: m, tile: t }) => {
      const s = window.__ec?.getState();
      s?.setGenSizeMw(m);
      s?.setTool({ t: 'gen', gen: g as never });
      s?.setHoveredTile(t);
    },
    { gen, mw, tile },
  );
  await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), tile);
}

test('w15 wind ghost + built farm + reservation', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  // pin a clear golden-hour dusk so the white blades read against the grade
  await page.evaluate(() => window.__ec?.setAtmosphere(18 * 60, { cloud: 0.2, wind: 0.7 }));

  const land = await openLand(page, 12);
  const wind = land[3] ?? { x: 90, y: 30 };

  // ---- 1) PLACEMENT GHOST: onshore wind, 15 MW (blades on the ghost) ----
  await armGhost(page, 'windOnshore', 15, wind);
  await page.evaluate(() => window.__ec?.setZoom(1.1));
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'preview/w15sim-ghost-wind.png' });
  // a tight crop on the hovered tile to inspect the rotor centring
  const gpos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 640, y: 400 },
    wind,
  );
  await page.screenshot({
    path: 'preview/w15sim-ghost-wind-crop.png',
    clip: {
      x: Math.max(0, gpos.x - 170),
      y: Math.max(0, gpos.y - 230),
      width: 340,
      height: 300,
    },
  });

  // ---- 2) BUILT wind farm: designate, wait for a bid, award, watch rotors ----
  await page.evaluate(() => window.__ec?.getState().setTool({ t: 'inspect' }));
  await page.evaluate(() => window.__ec?.getState().setHoveredTile(undefined));
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: wind.x, y: wind.y, mw: 30 } });
  // run the clock fast and POLL until the trickle bidder lands a bid
  await cmd(page, { type: 'setSpeed', speed: 16 });
  let tenderId: { id: number; dev: number } | undefined;
  for (let k = 0; k < 30 && !tenderId; k++) {
    await page.waitForTimeout(1000);
    tenderId = await page.evaluate(() => {
      const s = window.__ec?.getState();
      const t = s?.snapshot?.inbox.tenders.find(
        (x) => x.status === 'open' && (x.bids?.length ?? 0) > 0,
      );
      return t && t.bids[0] ? { id: t.id, dev: t.bids[0].developerId } : undefined;
    });
  }
  if (tenderId) {
    await cmd(page, { type: 'acceptBid', tenderId: tenderId.id, developerId: tenderId.dev });
  }
  await cmd(page, { type: 'setSpeed', speed: 1 });
  await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), wind);
  await page.evaluate(() => window.__ec?.setZoom(1.1));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/w15sim-built-wind.png' });
  const bpos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 640, y: 400 },
    wind,
  );
  await page.screenshot({
    path: 'preview/w15sim-built-wind-crop.png',
    clip: {
      x: Math.max(0, bpos.x - 200),
      y: Math.max(0, bpos.y - 240),
      width: 400,
      height: 320,
    },
  });

  // ---- 2b) a SINGLE-tile turbine pair, isolated, to judge rotor centring ----
  const solo = land[9] ?? { x: 110, y: 50 };
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: solo.x, y: solo.y, mw: 5 } });
  await cmd(page, { type: 'setSpeed', speed: 16 });
  let soloT: { id: number; dev: number } | undefined;
  for (let k = 0; k < 30 && !soloT; k++) {
    await page.waitForTimeout(1000);
    soloT = await page.evaluate(
      (t) => {
        const s = window.__ec?.getState();
        const tn = s?.snapshot?.inbox.tenders.find(
          (x) => x.status === 'open' && x.x === t.x && x.y === t.y && (x.bids?.length ?? 0) > 0,
        );
        return tn && tn.bids[0] ? { id: tn.id, dev: tn.bids[0].developerId } : undefined;
      },
      solo,
    );
  }
  if (soloT) await cmd(page, { type: 'acceptBid', tenderId: soloT.id, developerId: soloT.dev });
  await cmd(page, { type: 'setSpeed', speed: 1 });
  await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), solo);
  await page.evaluate(() => window.__ec?.setZoom(1.6));
  await page.waitForTimeout(900);
  const spos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 640, y: 400 },
    solo,
  );
  await page.screenshot({
    path: 'preview/w15sim-solo-wind-crop.png',
    clip: {
      x: Math.max(0, spos.x - 180),
      y: Math.max(0, spos.y - 280),
      width: 360,
      height: 360,
    },
  });

  // ---- 3) RESERVATION: two designations that cannot overlap ----
  // first farm already designated above (awarded). Designate two NEW wind
  // sites a few tiles apart and screenshot both ghosts' reserved plots by
  // hovering each in turn (the reservation walls them apart).
  const a = land[6] ?? { x: 100, y: 40 };
  const b = { x: a.x + 5, y: a.y + 1 };
  await cmd(page, { type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: a.x, y: a.y, mw: 100 } });
  // now hover the SECOND site with the wind tool armed: its ghost plot must
  // wall off the first reservation (no overlap)
  await armGhost(page, 'windOnshore', 100, b);
  await page.evaluate((t) => window.__ec?.panTo(t.x + 2, t.y), a);
  await page.evaluate(() => window.__ec?.setZoom(1.15));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'preview/w15sim-reservation.png' });
  // also dump the two reserved sets so the non-overlap is machine-checkable
  const reservedProof = await page.evaluate(() => {
    const s = window.__ec?.getState();
    const open = (s?.snapshot?.inbox.tenders ?? []).filter((t) => t.status === 'open');
    return open.map((t) => ({ x: t.x, y: t.y, n: (t.reserved ?? []).length }));
  });
  console.log('reserved plots (open tenders):', JSON.stringify(reservedProof));
});
