// Design-gate screenshots for the FIRM vs FLEXIBLE inbox comparison.
// Injects a render-only open application into the snapshot (sim untouched)
// so the inbox renders its comparison card, then shoots desktop + phone-
// landscape, and the load variant (which shows the no-flex note).
//   SHOTS=1 npx playwright test e2e/firmflex.helper.spec.ts
import { test } from '@playwright/test';
import { boot } from './helpers';

test.skip(!process.env.SHOTS, 'screenshot helper — run with SHOTS=1');

type P = import('@playwright/test').Page;

async function inject(page: P, kind: string, name: string, mw: number): Promise<void> {
  // pause the sim so the worker stops streaming snapshots over our injection
  await page.evaluate(() => window.__ec!.sendCommand({ type: 'setSpeed', speed: 0 }));
  await page.waitForTimeout(500);
  await page.evaluate(
    ({ kind, name, mw }) => {
      const s = window.__ec!.getState();
      const snap = s.snapshot as unknown as Record<string, unknown>;
      const inbox = snap.inbox as Record<string, unknown>;
      const app = {
        id: 90001,
        kind,
        name,
        x: 60,
        y: 40,
        mw,
        customers: kind === 'dataCentre' ? 80 : 0,
        decideByMin: (snap.simTimeMin as number) + 60 * 1440,
        status: 'open',
      };
      s.setSnapshot({ ...snap, inbox: { ...inbox, applications: [app] } } as never);
    },
    { kind, name, mw },
  );
  await page.waitForTimeout(350);
}

async function clipInbox(page: P, path: string): Promise<void> {
  // full-page so any overlap with neighbouring panels is visible
  await page.screenshot({ path });
}

test('firm/flex inbox comparison', async ({ page }) => {
  test.setTimeout(120_000);

  // ---- desktop: generation application (two cards) ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await inject(page, 'solarFarm', 'Brightfield Solar', 22);
  await clipInbox(page, 'preview/firmflex-gen-desktop.png');

  // ---- desktop: load application (firm + no-flex note) ----
  await inject(page, 'dataCentre', 'Eastbox Compute', 14);
  await clipInbox(page, 'preview/firmflex-load-desktop.png');

  // ---- phone-landscape: generation application ----
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await inject(page, 'solarFarm', 'Brightfield Solar', 22);
  await page.screenshot({ path: 'preview/firmflex-gen-mobile.png' });
});
