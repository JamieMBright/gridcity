// Shared crash-detection harness for the rigorous Playwright net (owner:
// "Massively expand play testing … catch crashes BEFORE players do").
//
// Every spec that uses this asserts the SAME invariant: while the player
// pokes at the game, NOTHING crashes —
//   • no uncaught `pageerror` (a thrown JS exception),
//   • no `console.error` except benign sandbox network noise (Supabase is
//     unreachable here → cert/resource errors that real players never see),
//   • the sim Web Worker never flips to `workerStatus === 'error'`.
//
// The capture is attached BEFORE navigation so a crash during boot (the
// owner's exact hard-refresh repro) is caught too.

import { expect, type Page } from '@playwright/test';

/** Network/sandbox noise that is EXPECTED here and must never fail a test.
 *  Mirrors the filter the owner specified verbatim, plus the Vite client
 *  websocket which can rattle when the dev server restarts between specs. */
export const BENIGN =
  /ERR_CERT|Failed to load resource|net::ERR|favicon|supabase\.co|fonts\.|status of [45]\d\d|\[vite\]|WebSocket|net::|ResizeObserver loop/i;

export interface CrashWatch {
  /** All real (non-benign) errors seen so far. */
  readonly errors: string[];
  /** Throwaway snapshot of the list joined for an assertion message. */
  dump(): string;
}

/** Attach pageerror + console.error capture to a page. Call this FIRST,
 *  before page.goto, so boot-time crashes are caught. */
export function watchForCrashes(page: Page): CrashWatch {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (BENIGN.test(e.message)) return;
    errors.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (BENIGN.test(text)) return;
    errors.push(`[console.error] ${text}`);
  });
  return {
    errors,
    dump: () => errors.join('\n===\n'),
  };
}

/** Wait until the sim is ready and the first snapshot has landed. */
export async function waitReady(page: Page, timeout = 45_000): Promise<void> {
  await page.waitForFunction(
    () => !!window.__ec && window.__ec.getState().snapshot !== undefined,
    undefined,
    { timeout },
  );
}

/** Wait for the start menu to be present (the front door). */
export async function waitMenu(page: Page, timeout = 45_000): Promise<void> {
  await page.waitForFunction(
    () => !!window.__ec && window.__ec.getState().menuOpen === true,
    undefined,
    { timeout },
  );
}

/** The full crash assertion: no real errors AND the worker is healthy.
 *  `where` labels the failure so an exhaustive sweep pinpoints the offender. */
export async function assertNoCrash(
  page: Page,
  watch: CrashWatch,
  where: string,
): Promise<void> {
  const status = await page.evaluate(() => window.__ec?.getState().workerStatus);
  expect(status, `worker status at: ${where}`).not.toBe('error');
  expect(watch.errors, `real (non-network) errors at: ${where}\n${watch.dump()}`).toEqual([]);
}

/** Boot the app and dismiss the start menu into a fresh sandbox London game,
 *  capturing crashes the whole way. Returns the crash watch so the caller can
 *  keep asserting as it drives the HUD. Mirrors helpers.boot() but with the
 *  crash net wired up from before navigation. */
export async function bootWatched(page: Page): Promise<CrashWatch> {
  const watch = watchForCrashes(page);
  await page.goto('/');
  await waitReady(page);
  if (await page.evaluate(() => window.__ec?.getState().menuOpen)) {
    const cont = page.getByRole('button', { name: 'continue' });
    if ((await cont.count()) > 0) {
      await cont.dispatchEvent('click');
    } else {
      await page.getByRole('button', { name: 'new game' }).dispatchEvent('click');
      const london = page.getByTitle('power London', { exact: true });
      await expect.poll(async () => london.count(), { timeout: 15_000 }).toBeGreaterThan(0);
      await london.first().dispatchEvent('click');
    }
    await expect
      .poll(async () => page.evaluate(() => window.__ec?.getState().menuOpen))
      .toBe(false);
    // dismiss the fresh-campaign story letterbox if it appears
    const skip = page.getByRole('button', { name: 'skip', exact: true });
    if ((await skip.count()) > 0) {
      await skip.dispatchEvent('click');
      const rebuild = page.getByRole('button', { name: 'rebuild it' });
      if ((await rebuild.count()) > 0) await rebuild.dispatchEvent('click');
    }
  }
  return watch;
}

/** Pause the clock so deterministic UI sweeps don't race the sim. The pause
 *  command is RE-ISSUED on every poll tick: right after a fresh-game boot the
 *  worker can still be baking / initialising and drop the very first setSpeed,
 *  leaving the clock running (a boot-race flake that surfaced in the Wave-D
 *  sweep). Re-sending until the snapshot actually reports speed 0 self-heals
 *  that without masking a genuine stall (it still fails after 20s). */
export async function pauseSim(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          window.__ec?.sendCommand({ type: 'setSpeed', speed: 0 });
          return window.__ec?.getState().snapshot?.speed;
        }),
      { timeout: 20_000 },
    )
    .toBe(0);
}

/** Dispatch a click straight to a button element by accessible name.
 *  Coordinate clicks are unreliable while the Pixi canvas repaints under
 *  software WebGL (Playwright's actionability wait crawls). */
export async function tap(page: Page, name: string | RegExp, exact = false): Promise<void> {
  await page.getByRole('button', { name, exact }).first().dispatchEvent('click');
}

/** Escape a literal string for use inside a RegExp (the catalog labels carry
 *  parens, e.g. "Gas peaker (OCGT)" / "Interconnector (HVDC)"). */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Arm a build-palette tool by its catalog LABEL. The desktop BuildPalette
 *  tool buttons have NO aria-label — their accessible name is the run-together
 *  hotkey + label + cost (e.g. "1Gas CCGT£450.0m", "QBulk supply point£40.0m",
 *  "IInspect"). So an exact-name match never hits; we match the label as a
 *  substring of the accessible name instead. */
export async function armTool(page: Page, label: string): Promise<void> {
  await page
    .getByRole('button', { name: new RegExp(escapeRe(label)) })
    .first()
    .dispatchEvent('click');
}
