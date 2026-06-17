// Central crash capture + self-heal error logging.
//
// EVERY crash route (React render, window.onerror, unhandled promise
// rejection, sim Web Worker) funnels through captureError() here. Captures
// keep a structured, copyable record (so the player can hand us a
// traceback), persist across reloads (localStorage ring), de-duplicate
// identical spam, and fire-and-forget to a remote Supabase sink so the
// maintainer can read tracebacks and fix bugs.
//
// HARD RULE: nothing in this module may throw. It runs on the unhappy path
// (the app is already broken); a logger that crashes while logging is
// useless. Every external touch (localStorage, Supabase, JSON, the DOM) is
// wrapped. It is also import-safe inside the sim Web Worker (no `window` /
// `document` assumptions) so a future in-worker capture can reuse it.

import { BUILD_ID, SAVE_VERSION_STR } from './buildInfo';

export type ErrorSource = 'react' | 'window' | 'unhandledrejection' | 'worker' | 'manual';

/** Caller-supplied fields. Everything is optional except a message — the
 *  environment (build, url, ua, ts…) is filled in by captureError. */
export interface ErrorInput {
  message: string;
  stack?: string | undefined;
  componentStack?: string | undefined;
  source: ErrorSource;
  /** Free-form structured context (never save-game contents). */
  extra?: Record<string, unknown> | undefined;
}

/** A captured, environment-stamped error record (what we store + send). */
export interface ErrorEntry {
  message: string;
  stack: string | undefined;
  componentStack: string | undefined;
  source: ErrorSource;
  build: string;
  saveVersion: string;
  /** Active city / scenario id, if resolvable at capture time. */
  city: string | undefined;
  url: string;
  userAgent: string;
  ts: number;
  /** ISO timestamp, for human-readable diagnostics + the remote row. */
  isoTs: string;
  extra: Record<string, unknown> | undefined;
  /** How many identical errors collapsed into this one (dedupe count). */
  count: number;
}

const RING_CAP = 50;
const STORAGE_KEY = 'ec-error-log-v1';
/** Drop a repeat of the SAME error (message+source+first stack frame) if it
 *  reoccurs within this window — a render loop can fire hundreds/second. */
const DEDUPE_WINDOW_MS = 10_000;
/** Hard ceiling on remote inserts per session so a hot loop can't hammer
 *  the sink even across distinct messages. */
const REMOTE_MAX_PER_SESSION = 40;

let ring: ErrorEntry[] = [];
let loaded = false;
let remoteSent = 0;

/** A pluggable resolver for the current city/scenario, injected by the app
 *  (avoids errorLog importing the zustand store → keeps it worker-safe and
 *  free of import cycles). */
let cityResolver: (() => string | undefined) | undefined;
export function setCityResolver(fn: () => string | undefined): void {
  cityResolver = fn;
}

/** A pluggable remote sink, injected by the app at boot (keeps the Supabase
 *  client out of this module's import graph so it stays worker-safe and the
 *  unit tests need no network). Returns nothing; must never throw. */
let remoteSink: ((entry: ErrorEntry) => void) | undefined;
export function setRemoteSink(fn: (entry: ErrorEntry) => void): void {
  remoteSink = fn;
}

function now(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    // `localStorage` access throws in some privacy modes / inside a worker.
    if (typeof localStorage === 'undefined') return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
}

function loadRing(): void {
  if (loaded) return;
  loaded = true;
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr: unknown = JSON.parse(raw);
    if (Array.isArray(arr)) {
      ring = arr.filter((e): e is ErrorEntry => !!e && typeof e === 'object').slice(-RING_CAP);
    }
  } catch {
    // corrupt / unreadable persisted log: start clean rather than die.
    ring = [];
  }
}

function persist(): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(ring));
  } catch {
    // quota / private mode: the in-memory ring still works this session.
  }
}

/** First non-empty stack frame, used as part of the dedupe key so two
 *  different throw sites with the same message stay distinct. */
function firstFrame(stack: string | undefined): string {
  if (!stack) return '';
  const lines = stack.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith(ERROR_PREFIX_MARKER)) return t;
  }
  return lines[0]?.trim() ?? '';
}
// most engines prefix the stack with the message line ("Error: x") — skip it
const ERROR_PREFIX_MARKER = 'Error:';

function dedupeKey(e: { message: string; source: ErrorSource; stack: string | undefined }): string {
  return `${e.source}::${e.message}::${firstFrame(e.stack)}`;
}

function resolveCity(): string | undefined {
  if (!cityResolver) return undefined;
  try {
    return cityResolver();
  } catch {
    return undefined;
  }
}

function readUrl(): string {
  try {
    // `location` exists on both window and worker (WorkerGlobalScope) scopes.
    return typeof location !== 'undefined' ? location.href : '';
  } catch {
    return '';
  }
}

function readUserAgent(): string {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  } catch {
    return '';
  }
}

function isoOf(ts: number): string {
  try {
    return new Date(ts).toISOString();
  } catch {
    return '';
  }
}

function isDev(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Capture one error. Safe to call from anywhere, including the unhappy path
 * — it never throws. Identical errors within a short window are collapsed
 * (the existing entry's `count` is bumped and it floats to the front)
 * instead of spamming the ring or the remote sink.
 */
export function captureError(input: ErrorInput): void {
  try {
    loadRing();
    const ts = now();
    const stack = input.stack ?? undefined;
    const key = dedupeKey({ message: input.message, source: input.source, stack });

    // dedupe: a recent identical error just bumps the count + refreshes ts.
    const existingIdx = ring.findIndex(
      (e) => dedupeKey(e) === key && ts - e.ts < DEDUPE_WINDOW_MS,
    );
    if (existingIdx >= 0) {
      const existing = ring[existingIdx];
      if (existing) {
        existing.count += 1;
        existing.ts = ts;
        existing.isoTs = isoOf(ts);
        // float the freshly-repeated error to the front (most-recent-first)
        ring.splice(existingIdx, 1);
        ring.unshift(existing);
        persist();
      }
      // dev console: still note repeats so a render loop is visible, but
      // don't re-send to the remote sink (rate-limit).
      if (isDev()) consoleError(input, existing?.count ?? 1);
      return;
    }

    const entry: ErrorEntry = {
      message: String(input.message).slice(0, 4000),
      stack: stack ? String(stack).slice(0, 8000) : undefined,
      componentStack: input.componentStack ? String(input.componentStack).slice(0, 8000) : undefined,
      source: input.source,
      build: BUILD_ID,
      saveVersion: SAVE_VERSION_STR,
      city: resolveCity(),
      url: readUrl(),
      userAgent: readUserAgent(),
      ts,
      isoTs: isoOf(ts),
      extra: input.extra,
      count: 1,
    };

    ring.unshift(entry);
    if (ring.length > RING_CAP) ring.length = RING_CAP;
    persist();

    if (isDev()) consoleError(input, 1);

    // fire-and-forget to the remote sink (guarded + rate-limited).
    if (remoteSink && remoteSent < REMOTE_MAX_PER_SESSION) {
      remoteSent += 1;
      try {
        remoteSink(entry);
      } catch {
        // a sink that throws must never break capture.
      }
    }
  } catch {
    // absolute last resort: swallow. A logger that throws is worse than one
    // that silently misses a single capture.
  }
}

function consoleError(input: ErrorInput, count: number): void {
  try {
    const tag = `[errorLog:${input.source}]${count > 1 ? ` x${count}` : ''}`;
    // keep the dev signal loud — this does NOT swallow the original error,
    // it adds the structured capture beside React/runtime's own logging.
    console.error(tag, input.message, input.stack ?? '', input.componentStack ?? '');
  } catch {
    // ignore
  }
}

/** Most-recent-first snapshot of the captured errors (copy, not the live
 *  ring) — for the diagnostics screen / tests. */
export function recentErrors(): ErrorEntry[] {
  loadRing();
  return ring.map((e) => ({ ...e }));
}

/** Clear the log (in-memory + persisted). Used by tests and a future
 *  "clear" affordance. */
export function clearErrors(): void {
  ring = [];
  remoteSent = 0;
  const ls = safeLocalStorage();
  try {
    ls?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function envHeader(): string {
  const lines = [
    'ElectriCity diagnostics',
    `when:    ${isoOf(now())}`,
    `build:   ${BUILD_ID}`,
    `save:    v${SAVE_VERSION_STR}`,
    `city:    ${resolveCity() ?? '(unknown)'}`,
    `url:     ${readUrl()}`,
    `ua:      ${readUserAgent()}`,
    `errors:  ${ring.length}`,
  ];
  return lines.join('\n');
}

/**
 * A single copyable plaintext blob: environment header + the recent errors
 * (newest first) with stacks. This is what the "Copy diagnostics" button
 * puts on the clipboard so a player can paste it to the maintainer.
 */
export function getDiagnosticsText(): string {
  try {
    loadRing();
    const parts = [envHeader(), ''];
    if (ring.length === 0) {
      parts.push('(no errors captured)');
    } else {
      ring.forEach((e, i) => {
        parts.push(`── #${i + 1} ─ ${e.source}${e.count > 1 ? ` (x${e.count})` : ''} ─ ${e.isoTs}`);
        parts.push(e.message);
        if (e.componentStack) parts.push('component stack:' + '\n' + e.componentStack.trim());
        if (e.stack) parts.push(e.stack.trim());
        if (e.extra) {
          try {
            parts.push('extra: ' + JSON.stringify(e.extra));
          } catch {
            // unserialisable extra: skip rather than fail the whole blob
          }
        }
        parts.push('');
      });
    }
    return parts.join('\n');
  } catch {
    return 'diagnostics unavailable';
  }
}

// --- global handler installation --------------------------------------------

let handlersInstalled = false;

/**
 * Install the window-level crash handlers ONCE, at boot. Routes uncaught
 * runtime errors and unhandled promise rejections into captureError. The
 * React ErrorBoundary covers render errors; the worker bridge covers sim
 * errors; this covers everything async / global. Idempotent + never throws.
 */
export function installErrorHandlers(): void {
  try {
    if (handlersInstalled) return;
    if (typeof window === 'undefined') return;
    handlersInstalled = true;

    window.addEventListener('error', (ev: ErrorEvent) => {
      // ErrorEvent fires for both script errors and (rarely) resource load
      // failures; only the former carry a usable message/error.
      const err = ev.error as unknown;
      const message =
        (err instanceof Error && err.message) ||
        ev.message ||
        'unknown window error';
      const stack =
        err instanceof Error
          ? err.stack
          : ev.filename
            ? `at ${ev.filename}:${ev.lineno ?? 0}:${ev.colno ?? 0}`
            : undefined;
      captureError({ message: String(message), stack, source: 'window' });
    });

    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      const reason = ev.reason as unknown;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : safeStringify(reason) ?? 'unhandled promise rejection';
      const stack = reason instanceof Error ? reason.stack : undefined;
      captureError({ message: String(message), stack, source: 'unhandledrejection' });
    });
  } catch {
    // if we can't install handlers, the app still runs — just less observable.
  }
}

function safeStringify(v: unknown): string | undefined {
  try {
    return JSON.stringify(v);
  } catch {
    return undefined;
  }
}
