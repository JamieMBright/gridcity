// Not a regression test: in-game screenshots of the transport overhaul at
// each zoom band (phone-wide Z0 through close Z3) so the road/rail/bridge
// rendering can be judged on real frames, not previews. Run on demand:
//   SHOTS=1 npx playwright test e2e/transportshots.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

test('transport zoom-band screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  // pin a clear midday grade so the transport layers are judged in
  // daylight, not whatever time the sim booted into (render-only hook)
  await page.evaluate(() => window.__ec?.setAtmosphere(12 * 60, { cloud: 0.15, wind: 0.4 }));

  const shot = async (x: number, y: number, zoom: number, name: string): Promise<void> => {
    await page.evaluate(
      (a) => {
        window.__ec?.panTo(a.x, a.y);
        window.__ec?.setZoom(a.zoom);
      },
      { x, y, zoom },
    );
    await page.waitForTimeout(900);
    await page.screenshot({ path: `preview/${name}.png` });
  };

  // the owner's complaint frame: whole city at phone zoom (Z0)
  await shot(128, 85, 0.055, 'shot-transport-phone-far');
  // Z1: central London pulls in, streets fade up
  await shot(120, 80, 0.12, 'shot-transport-z1-central');
  // Z2: the default build zoom — junctions, casing, roundabouts
  await shot(112, 78, 0.3, 'shot-transport-z2-junctions');
  // Z3: dual carriageway + Thames bridges close up
  await shot(118, 82, 0.6, 'shot-transport-z3-bridges');
  // the QEII crossing at the estuary
  await shot(168, 98, 0.35, 'shot-transport-dartford');
  // P6: barge wakes mid-estuary (boats + wakes live at Z2+)
  await shot(150, 92, 0.4, 'shot-transport-wakes');
  // P7: Heathrow's air picture — arcs, planes, altitude shadows
  await shot(60, 80, 0.16, 'shot-transport-heathrow-air');
});
