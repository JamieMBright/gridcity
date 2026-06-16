// End-to-end proof of the multi-city entry flow + save state (owner, 2026-06-15:
// "When you press New Game, offer the cities to play … Consider how saved game
// state will handle it"). Drives the REAL UI: New Game → city picker → pick
// Paris → it loads/renders/ticks → save+reload restores Paris → pick London →
// London plays. Screenshots the picker + Paris far/mid/close for the design
// gate. Run with SHOTS=1 (it's a helper, not a CI regression).

import { expect, test } from '@playwright/test';
import { store } from './helpers';

test.skip(!process.env.SHOTS, 'city-picker helper — run with SHOTS=1');

async function bootToMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  // make sure we're at the start menu (a stale save would auto-show it anyway)
  await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(true);
}

async function dismissStory(page: import('@playwright/test').Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'skip', exact: true });
  if ((await skip.count()) > 0) {
    await skip.dispatchEvent('click');
    const rebuild = page.getByRole('button', { name: 'rebuild it' });
    if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
  }
}

test('city picker → Paris plays, saves, reloads; London still plays', async ({ page }) => {
  test.setTimeout(180_000);

  // 1) New Game opens the picker
  await bootToMenu(page);
  await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
  const dialog = page.getByRole('dialog', { name: 'choose a city' });
  await expect(dialog).toBeVisible();
  // a button's accessible name is its TEXT (card name + PLAY/SOON + blurb), so
  // match by the card's heading text. Paris is enabled (PLAY); Shanghai is not.
  const parisCard = dialog.getByRole('button').filter({ hasText: 'Paris' });
  const shanghaiCard = dialog.getByRole('button').filter({ hasText: 'Shanghai' });
  await expect(parisCard).toBeEnabled();
  await expect(shanghaiCard).toBeDisabled();
  await page.screenshot({ path: 'preview/citypicker.png' });

  // 2) pick Paris → it loads on the Paris scenario, renders, and ticks
  await parisCard.dispatchEvent('click');
  await dismissStory(page);
  await expect.poll(() => page.evaluate(() => window.__ec?.getState().menuOpen)).toBe(false);
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId ?? "?"'), { timeout: 30_000 })
    .toBe('paris');
  // the Paris map is up: a recognisable Seine city has lots of customers
  const total = await store<number>(page, '(s) => s.snapshot?.stats.totalCustomers ?? 0');
  expect(total).toBeGreaterThan(1000);

  // it advances: run at 16x and watch the clock move
  const t0 = await store<number>(page, '(s) => s.snapshot.simTimeMin');
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 16 }));
  await expect
    .poll(() => store<number>(page, '(s) => s.snapshot.simTimeMin'), { timeout: 20_000 })
    .toBeGreaterThan(t0 + 60);
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 1 }));

  // build something on Paris so the save has player state to restore
  await page.evaluate(() =>
    window.__ec?.sendCommand({ type: 'build', spec: { kind: 'sub', sub: 'grid', x: 128, y: 70 } }),
  );
  await expect.poll(() => store<number>(page, '(s) => s.snapshot.assets.length')).toBeGreaterThan(0);

  // far / mid / close screenshots of Paris in-game for the design gate
  await page.evaluate(() => window.__ec?.setZoom(0.06));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/paris-ingame-far.png' });
  await page.evaluate(() => {
    window.__ec?.panTo(128, 80);
    window.__ec?.setZoom(0.4);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/paris-ingame-mid.png' });
  await page.evaluate(() => {
    window.__ec?.panTo(82, 74); // the Eiffel quarter
    window.__ec?.setZoom(1.0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/paris-ingame-close.png' });

  // 3) the autosave/manual save records Paris; reload restores Paris (not London)
  await page.evaluate(() => window.__ec?.getState());
  await page.evaluate(() => window.__ec?.sendCommand({ type: 'setSpeed', speed: 1 }));
  // force a save then reload the page; boot arbitration should pick the Paris save
  await page.waitForTimeout(1500); // let the autosave land
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  // continue the restored game
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    await page.getByRole('button', { name: 'continue' }).dispatchEvent('click');
  }
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId ?? "?"'), { timeout: 30_000 })
    .toBe('paris');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview/paris-reloaded.png' });

  // 4) pick London again → London plays as before
  await page.evaluate(() => window.__ec?.getState().setMenuOpen(true));
  await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
  const dialog2 = page.getByRole('dialog', { name: 'choose a city' });
  await expect(dialog2).toBeVisible();
  await dialog2.getByRole('button').filter({ hasText: 'London' }).dispatchEvent('click');
  await dismissStory(page);
  await expect
    .poll(() => store<string>(page, '(s) => s.snapshot?.scenarioId ?? "?"'), { timeout: 30_000 })
    .toBe('london');
  await page.evaluate(() => window.__ec?.setZoom(0.06));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'preview/london-after-paris.png' });
});
