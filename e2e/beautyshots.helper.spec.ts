// Not a regression test: captures the lofi golden-hour grade (#41), rain
// & storm visuals (#42) and the energized-window glow on real in-game
// frames so the art pass can be reviewed. The atmosphere override is a
// render-only test-hook pin — the sim itself is never touched.
// Run on demand: SHOTS=1 npx playwright test e2e/beautyshots.helper.spec.ts
import { devices, test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

const CALM = { cloud: 0.15, wind: 0.3, regime: 'mild' };

test('golden-hour arc + weather frames', async ({ page }) => {
  test.setTimeout(420_000);
  await boot(page);

  const cmd = async (c: unknown): Promise<void> => {
    await page.evaluate((cc) => window.__ec?.sendCommand(cc as never), c);
  };
  // light up a suburb so the dusk glow has something to show: wind farm
  // → dist sub → pole can near Eppingdale (same scene as shots.helper)
  await cmd({ type: 'build', spec: { kind: 'gen', gen: 'windOnshore', x: 132, y: 50 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'dist', x: 143, y: 57 } });
  await cmd({ type: 'build', spec: { kind: 'sub', sub: 'pole', x: 150, y: 62 } });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 132, ay: 50, bx: 143, by: 57 },
  });
  await cmd({
    type: 'build',
    spec: { kind: 'line', level: 33, build: 'overhead', ax: 143, ay: 57, bx: 150, by: 62 },
  });
  // run until the farm commissions and homes energize
  await cmd({ type: 'setSpeed', speed: 16 });
  await page.waitForTimeout(245_000);
  await cmd({ type: 'setSpeed', speed: 0 });

  await page.evaluate(() => {
    window.__ec?.panTo(143, 57);
    window.__ec?.setZoom(0.4);
  });

  const at = async (label: string, min: number, weather: object): Promise<void> => {
    await page.evaluate(
      ({ m, w }) => window.__ec?.setAtmosphere(m, w as never),
      { m: min, w: weather },
    );
    await page.waitForTimeout(2600); // let the eased grade settle
    await page.screenshot({ path: `preview/beauty_${label}.png` });
  };

  // 1 May calendar: dawn ~05:6, dusk ~20:0
  await at('day', 13 * 60, CALM);
  await at('golden', 18.6 * 60, CALM);
  await at('sunset', 19.8 * 60, CALM);
  await at('dusk', 20.6 * 60, CALM);
  await at('night', 23.5 * 60, CALM);
  await at('rain_day', 14 * 60, { cloud: 0.82, wind: 0.5, regime: 'windy-wet' });
  await at('storm', 15 * 60, { cloud: 0.9, wind: 0.92, regime: 'windy-wet' });
  await at('rain_dusk', 20.4 * 60, { cloud: 0.78, wind: 0.55, regime: 'windy-wet' });
});

test.describe('panel audit — desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('desktop panels', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'preview/beauty_ui_desktop.png' });

    await page.evaluate(() => window.__ec?.getState().setBalanceOpen(true));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'preview/beauty_ui_desktop_balance.png' });
    await page.evaluate(() => window.__ec?.getState().setBalanceOpen(false));

    await page.evaluate(() => window.__ec?.getState().setKpiOpen(true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'preview/beauty_ui_desktop_kpi.png' });
    await page.evaluate(() => window.__ec?.getState().setKpiOpen(false));

    await page.evaluate(() => {
      const s = window.__ec?.getState();
      const a = s?.snapshot?.assets.find((x) => x.kind !== 'line');
      if (s && a) {
        s.setTool({ t: 'inspect' });
        s.setSelected({ assetId: a.id });
        s.requestPan(a.x, a.y);
      }
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'preview/beauty_ui_desktop_info.png' });
  });
});

test.describe('panel audit — phone landscape', () => {
  // devices[] carries defaultBrowserType, which a describe-level use()
  // rejects — take just the emulation fields
  const phone = devices['iPhone 13 landscape'];
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: phone?.hasTouch ?? true,
    isMobile: phone?.isMobile ?? true,
    userAgent: phone?.userAgent,
  });

  test('phone-landscape panels', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'preview/beauty_ui_mobile.png' });

    await page.getByRole('button', { name: 'bill', exact: true }).dispatchEvent('click');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'preview/beauty_ui_mobile_bill.png' });
    await page.getByRole('button', { name: 'bill', exact: true }).dispatchEvent('click');

    await page.getByRole('button', { name: 'inbox', exact: true }).dispatchEvent('click');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'preview/beauty_ui_mobile_inbox.png' });
    await page.getByRole('button', { name: 'inbox', exact: true }).dispatchEvent('click');

    await page.getByRole('button', { name: 'RIIO KPIs' }).dispatchEvent('click');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'preview/beauty_ui_mobile_kpi.png' });
    await page.getByRole('button', { name: 'RIIO KPIs' }).dispatchEvent('click');

    await page.evaluate(() => window.__ec?.getState().setBalanceOpen(true));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'preview/beauty_ui_mobile_balance.png' });
    await page.evaluate(() => window.__ec?.getState().setBalanceOpen(false));

    await page.evaluate(() => {
      const s = window.__ec?.getState();
      const a = s?.snapshot?.assets.find((x) => x.kind !== 'line');
      if (s && a) {
        s.setTool({ t: 'inspect' });
        s.setSelected({ assetId: a.id });
        s.requestPan(a.x, a.y);
      }
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'preview/beauty_ui_mobile_info.png' });
  });
});
