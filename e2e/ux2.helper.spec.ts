// Screenshot helper for the Wave 12 UX/polish lane (#26/#30/#32/#33/#39).
// Not a regression test — run on demand:
//   SHOTS=1 npx playwright test e2e/ux2.helper.spec.ts
// Saves preview/ux2-*.png at desktop AND phone-landscape for review.

import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 844, height: 390 }; // phone held landscape

async function seedNetwork(page: import('@playwright/test').Page): Promise<void> {
  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  // a little network so the minimap + net-zero panel have content
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: 132, y: 50 } });
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'gasPeaker', x: 120, y: 44 } });
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'solarFarm', x: 150, y: 70 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 135, y: 53 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: 143, y: 57 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 132, build: 'overhead', ax: 120, ay: 44, bx: 135, by: 53 },
  });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 132, ay: 50, bx: 143, by: 57 },
  });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 143, ay: 57, bx: 135, by: 53 },
  });
}

test('ux2 screenshots', async ({ page }) => {
  test.setTimeout(300_000);

  // --- DESKTOP ---------------------------------------------------------------
  await page.setViewportSize(DESKTOP);
  await boot(page);
  await seedNetwork(page);
  // commission the plants so the net-zero mix + heatmap have live data
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 16 } as never));
  await page.waitForTimeout(60_000);
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 1 } as never));
  await page.evaluate(() => {
    window.__ec?.getState().setMinimapOpen(true);
    window.__ec?.panTo(135, 55);
    window.__ec?.setZoom(0.5);
  });
  await page.waitForTimeout(1500);
  // full HUD with the minimap open (desktop)
  await page.screenshot({ path: 'preview/ux2-minimap-desktop.png' });
  await page.screenshot({
    path: 'preview/ux2-minimap-crop.png',
    clip: { x: DESKTOP.width - 230, y: DESKTOP.height - 200, width: 220, height: 190 },
  });

  // net-zero dashboard (desktop)
  await page.evaluate(() => window.__ec?.getState().setNetZeroOpen(true));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/ux2-netzero-desktop.png' });
  await page.evaluate(() => window.__ec?.getState().setNetZeroOpen(false));

  // event log + filters (desktop): open, type a search
  await page.evaluate(() => window.__ec?.getState().setEventLogOpen(true));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux2-eventlog-desktop.png' });
  // click a filter chip (planning — early game is full of consents/tenders)
  const chip = page.getByRole('button', { name: 'planning', exact: true });
  if ((await chip.count()) > 0) await chip.first().dispatchEvent('click');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/ux2-eventlog-filtered.png' });
  await page.evaluate(() => window.__ec?.getState().setEventLogOpen(false));

  // colour-blind legend: open the start menu → settings, cycle modes, and
  // also recolour the live map under each mode
  // frame the seeded network and turn on grid view + headroom so the
  // voltage colours + loading heatmap are both on screen
  // the minimap reliably frames the WHOLE network and draws it in the
  // level palette — capture it under each mode so the voltage-colour swap
  // is visible alongside the legend's status-colour swap
  await page.evaluate(() => {
    window.__ec?.getState().setMinimapOpen(true);
  });
  for (const mode of ['off', 'deuteranopia', 'protanopia', 'tritanopia'] as const) {
    await page.evaluate((m) => window.__ec?.getState().setCbMode(m), mode);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `preview/ux2-cbminimap-${mode}.png`,
      clip: { x: DESKTOP.width - 230, y: DESKTOP.height - 200, width: 220, height: 190 },
    });
  }
  // the settings legend (start menu → settings)
  await page.evaluate(() => {
    window.__ec?.getState().setCbMode('deuteranopia');
    window.__ec?.getState().setMenuOpen(true);
  });
  await page.waitForTimeout(400);
  const settings = page.getByRole('button', { name: /settings/ });
  if ((await settings.count()) > 0) await settings.first().dispatchEvent('click');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'preview/ux2-cblegend-desktop.png' });
  await page.evaluate(() => window.__ec?.getState().setMenuOpen(false));

  // --- PHONE LANDSCAPE -------------------------------------------------------
  await page.setViewportSize(PHONE);
  await page.evaluate(() => {
    window.__ec?.getState().setMinimapOpen(true);
    window.__ec?.panTo(135, 55);
    window.__ec?.setZoom(0.4);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'preview/ux2-minimap-mobile.png' });

  await page.evaluate(() => window.__ec?.getState().setNetZeroOpen(true));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/ux2-netzero-mobile.png' });
  await page.evaluate(() => window.__ec?.getState().setNetZeroOpen(false));

  await page.evaluate(() => window.__ec?.getState().setEventLogOpen(true));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview/ux2-eventlog-mobile.png' });
  await page.evaluate(() => window.__ec?.getState().setEventLogOpen(false));
});
