// Boot breadcrumb: catch the crashes our JS error capture can NEVER see.
//
// captureError() (errorLog.ts) only fires when JavaScript is still running —
// a thrown error, a rejected promise, a React render fault. But a hard browser
// crash (an out-of-memory / GPU kill, the iOS Safari "this page used too much
// memory" reload) destroys the tab BEFORE any handler runs, so it reaches
// neither the local ring nor the remote sink. That is exactly the signature of
// a crash "while loading a city": the heavy atlas + per-hero texture build is
// the memory peak, and if the OS kills the tab there, we get NOTHING.
//
// So we leave a breadcrumb. beginCityLoad() writes "loading <city>" to
// localStorage right before the heavy load; endCityLoad() clears it once the
// renderer has survived the build. A CLEAN exit (close / reload / navigation)
// fires `pagehide`, which also clears it — but a hard kill fires nothing, so
// the breadcrumb SURVIVES to the next boot. reportPriorLoadDeath() runs at
// boot: if a breadcrumb is still there, the previous session died mid-load, and
// we synthesise a diagnostic so the maintainer finally sees it.
//
// HARD RULE (same as errorLog): nothing here may throw — it runs on the boot
// and unhappy paths. Every localStorage / JSON touch is guarded.

import { captureError } from './errorLog';

const KEY = 'ec-loading-v1';

interface Crumb {
  city: string;
  ts: number;
}

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Record that a (memory-heavy) city load has STARTED. */
export function beginCityLoad(city: string): void {
  try {
    store()?.setItem(KEY, JSON.stringify({ city, ts: Date.now() } satisfies Crumb));
  } catch {
    // private mode / quota: we simply lose the breadcrumb for this load.
  }
}

/** The load survived the build — clear the breadcrumb. */
export function endCityLoad(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * On boot: if a load breadcrumb survived from a previous session, that session
 * was killed mid-load with no JS error captured (a hard browser / GPU / OOM
 * crash). Turn it into a diagnostic so it reaches the remote sink, then clear
 * it. Call AFTER the remote sink is installed so the report can actually send.
 */
export function reportPriorLoadDeath(): void {
  try {
    const s = store();
    if (!s) return;
    const raw = s.getItem(KEY);
    if (!raw) return;
    s.removeItem(KEY);
    let crumb: Crumb | undefined;
    try {
      crumb = JSON.parse(raw) as Crumb;
    } catch {
      crumb = undefined;
    }
    const city = crumb?.city ?? '(unknown)';
    const ageMs = typeof crumb?.ts === 'number' ? Date.now() - crumb.ts : undefined;
    captureError({
      source: 'manual',
      message:
        `previous session died while loading "${city}" — no JS error was captured, ` +
        `which points to a hard browser/GPU/out-of-memory crash that killed the tab ` +
        `before it could report.`,
      extra: { deadCity: city, crumbAgeMs: ageMs },
    });
  } catch {
    // never break the boot path over a diagnostic.
  }
}

/**
 * Clear the breadcrumb on a CLEAN unload so it only ever survives a true crash.
 * `pagehide` fires on a graceful close / reload / navigation; a hard kill fires
 * nothing — which is precisely the signal reportPriorLoadDeath() keys on.
 */
export function installCleanExitGuard(): void {
  try {
    if (typeof window === 'undefined') return;
    window.addEventListener('pagehide', () => endCityLoad());
  } catch {
    // ignore — at worst we over-report a crash that was actually a clean exit.
  }
}
