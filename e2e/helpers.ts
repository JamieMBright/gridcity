// Shared Playwright utilities: boot waiting, store access through the
// dev-only window.__ec hook, and real canvas clicks at tile positions.

import { expect, type Page } from '@playwright/test';

export interface Tile {
  x: number;
  y: number;
}

/** Wait until the app booted (sim ready, hook installed) and dismiss the
 *  start menu — continue a save when one exists, else start fresh. */
export async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(async () => page.evaluate(() => window.__ec?.getState().snapshot !== undefined), {
      timeout: 30_000,
    })
    .toBe(true);
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) {
      await cont.dispatchEvent('click');
    } else {
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
    }
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen))
      .toBe(false);
    // a fresh campaign opens with the story letterbox, which swallows
    // canvas clicks — skip straight to the Ofgem letter and dismiss it
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      await page.getByRole('button', { name: 'rebuild it' }).dispatchEvent('click');
    }
  }
}

/** Read a slice of the zustand store from inside the page. */
export async function store<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const s = window.__ec.getState(); return (${fn})(s); })()`) as Promise<T>;
}

export async function openLand(page: Page, count: number): Promise<Tile[]> {
  return page.evaluate((n) => window.__ec?.openLand(n) ?? [], count);
}

/** Click the map canvas at a tile's current screen position (pans first). */
export async function clickTile(page: Page, tile: Tile): Promise<void> {
  await page.evaluate((t) => window.__ec?.panTo(t.x, t.y), tile);
  const pos = await page.evaluate(
    (t) => window.__ec?.tileToScreen(t.x, t.y) ?? { x: 0, y: 0 },
    tile,
  );
  await page.mouse.click(pos.x, pos.y);
}

/** Number of placed assets according to the latest snapshot. */
export async function assetCount(page: Page): Promise<number> {
  return store<number>(page, '(s) => s.snapshot.assets.length');
}

/** Click a UI button by dispatching the event straight to the element.
 *  Coordinate-based clicks are unreliable here: Playwright's stability
 *  wait crawls while the Pixi canvas repaints under software WebGL, and
 *  scrolled palettes can leave stale click coordinates. */
export async function clickButton(page: Page, name: string | RegExp, exact = false): Promise<void> {
  await page.getByRole('button', { name, exact }).dispatchEvent('click');
}

export async function pause(page: Page): Promise<void> {
  await clickButton(page, '⏸');
  await expect.poll(() => store<number>(page, '(s) => s.snapshot.speed')).toBe(0);
}
