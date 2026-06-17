// Build identity for crash diagnostics. `__BUILD_ID__` is injected at build
// time by Vite (see vite.config.ts: git short-sha + ISO timestamp, or 'dev'
// for an un-stamped local run). Kept tiny and dependency-free so the error
// logger — which must never itself throw — can import it from anywhere,
// including inside the sim Web Worker.

import { SAVE_VERSION } from '../sim/state';

/** Compile-time build stamp. Falls back gracefully if the define is missing
 *  (e.g. a test runner that doesn't wire Vite's `define`). */
export const BUILD_ID: string =
  typeof __BUILD_ID__ === 'string' && __BUILD_ID__.length > 0 ? __BUILD_ID__ : 'dev';

/** The save schema version, surfaced in diagnostics so a crash on an old
 *  save is obvious. Re-exported here so the worker + UI share one import. */
export const SAVE_VERSION_STR: string = String(SAVE_VERSION);
