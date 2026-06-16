// Capture clean, HUD-free DUSK/GOLDEN energy-flow frames for the app-icon
// concepts (Direction 1 -- "energy-flow screen grab"). A fresh London newGame
// ships a TRULY BLANK grid (only iDNO demand subs), so to get the
// electrification light-show we BUILD dispatchable generation wired into the
// dense centre and run the sim until customers are served -- then pin the dusk
// grade, hide all chrome (photo mode), and grab tight square captures around
// glowing focal points. Render-only beyond the build. Run on demand:
//   SHOTS=1 npx playwright test e2e/iconframes.helper.spec.ts --config=playwright.icon.config.ts
import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { boot, store } from './helpers';

test.skip(!process.env.SHOTS, 'icon-frame helper — run with SHOTS=1');

const OUT = 'preview/icon-concepts-v2/_frames';

test('energy-flow icon frames', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(OUT, { recursive: true });
  await boot(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };

  // Build dispatchable gas peakers (runs day or night) ringing the dense centre
  // + grid subs, wired in, so the core energises. Several gens => more served
  // coverage sooner across the middle, lighting more heroes.
  const gens: Array<[number, number]> = [
    [90, 84],
    [112, 84],
    [90, 98],
    [112, 98],
  ];
  const subs: Array<[number, number]> = [
    [98, 88],
    [106, 88],
    [98, 94],
    [106, 94],
  ];
  for (const [x, y] of gens) await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x, y } });
  for (const [x, y] of subs) await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x, y } });
  // wire each gen to its nearest sub, and stitch the subs together
  const lines: Array<[number, number, number, number, 132 | 33]> = [
    [90, 84, 98, 88, 132],
    [112, 84, 106, 88, 132],
    [90, 98, 98, 94, 132],
    [112, 98, 106, 94, 132],
    [98, 88, 106, 88, 132],
    [98, 94, 106, 94, 132],
    [98, 88, 98, 94, 132],
    [106, 88, 106, 94, 132],
  ];
  for (const [ax, ay, bx, by, level] of lines) {
    await cmd({ type: 'build', spec: { kind: 'line', level, build: 'overhead', ax, ay, bx, by } });
  }

  // run at 16x and POLL until the centre energises (bounded — never the old
  // fixed 210s blind wait that timed out). Cap ~210s of polling.
  await cmd({ type: 'setSpeed', speed: 16 });
  let served = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 210_000) {
    await page.waitForTimeout(5000);
    served = await store<number>(page, '(s) => s.snapshot?.bill?.servedCustomers ?? 0');
    if (served > 0) break;
  }
  await cmd({ type: 'setSpeed', speed: 0 });
  console.log('servedCustomers after commissioning poll:', served, 'in', ((Date.now() - t0) / 1000) | 0, 's');

  // enter photo mode -> hides all HUD/chrome (a slim bottom bar remains, so we
  // crop the UPPER square of the canvas, well clear of it)
  await page.evaluate(() => window.__ec?.getState().setPhotoMode(true));
  await page.waitForTimeout(400);

  const vp = page.viewportSize() ?? { width: 1280, height: 900 };
  const sq = Math.min(vp.width, vp.height) - 60;
  // crop the upper-centre square (clear of the photo bar at the bottom)
  const cx = vp.width / 2 - sq / 2;
  const cy = 20;

  const grab = async (name: string, tx: number, ty: number, zoom: number, min: number): Promise<void> => {
    await page.evaluate((m) => window.__ec?.setAtmosphere(m, { cloud: 0.12, wind: 0.3 }), min);
    await page.evaluate(
      ({ x, y, z }) => {
        window.__ec?.panTo(x, y);
        window.__ec?.setZoom(z);
      },
      { x: tx, y: ty, z: zoom },
    );
    await page.waitForTimeout(2800); // camera + eased grade settle
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: cx, y: cy, width: sq, height: sq } });
    console.log(`frame ${name} @ (${tx},${ty}) z${zoom} min${min}`);
  };

  const DUSK = 21 * 60; // deep dusk -> windows lit, navy sky
  const GOLDEN = 18 * 60 + 40; // golden hour -> warm, brand sweet spot
  // candidate focal points around the glowing centre
  await grab('eye', 99, 92, 1.15, DUSK);
  await grab('eye2', 99, 92, 1.5, DUSK);
  await grab('shard', 104, 92, 1.1, DUSK);
  await grab('cluster', 103, 88, 0.7, DUSK);
  await grab('central', 101, 90, 0.5, DUSK);
  await grab('central-gold', 101, 90, 0.5, GOLDEN);
  await grab('cluster-gold', 103, 88, 0.7, GOLDEN);
  await grab('thames', 101, 94, 0.85, DUSK);

  await page.evaluate(() => window.__ec?.getState().setPhotoMode(false));
});
