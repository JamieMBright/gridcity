# Crash capture + self-heal error logging

Captures **every** client crash with a full traceback, surfaces it to the
player gracefully, persists it locally, and (optionally) ships it to a remote
Supabase sink so the maintainer can read tracebacks and fix bugs.

Built for the urgent owner request (2026-06-16): "Need to capture all crashes
and get the tracebacks so you can self-heal."

## What gets captured

| Route | Where it's wired | `source` |
| --- | --- | --- |
| React render error | `src/ui/ErrorBoundary.tsx` (`componentDidCatch`, with component stack) | `react` |
| Uncaught runtime error | `window.addEventListener('error')` in `errorLog.installErrorHandlers()` | `window` |
| Unhandled promise rejection | `window.addEventListener('unhandledrejection')` | `unhandledrejection` |
| Sim Web Worker fault | `worker.ts` posts `fatal`/`error` (+ `self.onerror`/`unhandledrejection`); `worker.onerror`/`onmessageerror` in `workerBridge.ts` | `worker` |
| Hand-rolled `captureError(...)` | anywhere | `manual` |

All routes funnel through **`captureError()`** in `src/app/errorLog.ts`.

## The local logger (`src/app/errorLog.ts`)

- **In-memory ring buffer** of the last 50 errors, **persisted to
  `localStorage` key `ec-error-log-v1`** so a reload preserves them.
- **Dedupe / rate-limit**: an identical error (same `source` + message + first
  stack frame) within 10 s bumps a `count` instead of adding a row; the remote
  sink is also capped at 40 inserts/session — a render loop can't spam.
- **`getDiagnosticsText()`** → a copyable plaintext blob: environment header
  (build, save version, city, url, user-agent) + recent errors with stacks.
  This is what the fallback screen's **Copy diagnostics** button copies.
- **Never throws.** Every external touch (localStorage, JSON, Supabase, DOM)
  is guarded. It is also import-safe inside the Web Worker (no `window`
  assumptions).
- Structured fields per entry: `message, stack, componentStack?, source,
  build, saveVersion, city, url, userAgent, ts, isoTs, extra, count`.
  - `build` = `__BUILD_ID__`, injected by Vite (`vite.config.ts`): git
    short-sha + ISO date, or `dev` for an un-stamped local build. Override with
    `VITE_BUILD_ID`.
  - `saveVersion` = the `SAVE_VERSION` constant (`src/sim/state.ts`).
  - `city` = the active scenario id (`store.scenarioId`), via an injected
    resolver so `errorLog` stays worker-safe.

## The fallback screen (`src/ui/ErrorBoundary.tsx`)

Wraps `<App/>` in `src/main.tsx`. On a render error it shows an on-brand dusk
"Something tripped a fuse" screen (golden-hour palette from `theme.ts`):
friendly recoverable message, a collapsible stack ("Show details"), **Copy
diagnostics**, and **Reload**. Legible at desktop and phone-landscape (shots in
`preview/crash-*.png`). It does **not** swallow errors in dev — the capture
still `console.error`s and React's own overlay still appears.

## The remote sink (`src/online/errorSink.ts`)

Fire-and-forget INSERT into the `client_errors` table via the existing Supabase
client (`src/online/supabase.ts`), guarded **exactly** like `cloud.ts`:

- If Supabase is unconfigured/offline/RLS-rejects → silent no-op. Never throws,
  never blocks the UI.
- **Privacy-safe**: no save-game contents are ever sent. `user_email` is
  attached **only** if the player is already signed in (we read the existing
  session; we never prompt).
- Injected into `errorLog` via `setRemoteSink()` at boot (`main.tsx` →
  `installErrorSink()`), keeping the Supabase import out of the worker-safe
  logger.

## The `client_errors` table (project `electricity`)

Migration: `supabase/migrations/0001_client_errors.sql`.

> **Apply via the Supabase MCP after review — do NOT auto-apply.** Reads use the
> service role (dashboard/MCP), which bypasses RLS.

```sql
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text,
  stack text,
  component_stack text,
  source text,
  build text,
  save_version text,
  city text,
  url text,
  user_agent text,
  user_email text,
  extra jsonb
);
create index if not exists client_errors_created_at_idx on public.client_errors (created_at desc);
create index if not exists client_errors_build_idx on public.client_errors (build);
create index if not exists client_errors_source_idx on public.client_errors (source);

alter table public.client_errors enable row level security;

create policy "anon can insert client errors"
  on public.client_errors for insert to anon with check (true);
create policy "authenticated can insert client errors"
  on public.client_errors for insert to authenticated with check (true);
```

RLS contract: **anon may INSERT only** — no select/update/delete for anon, so a
player can report a crash but can never read other players' reports.

## Reading crashes (self-heal)

Most-recent crashes:

```sql
select created_at, source, build, save_version, city, message, url, user_email
from client_errors
order by created_at desc
limit 50;
```

Full traceback for one crash:

```sql
select created_at, source, message, stack, component_stack, extra, user_agent
from client_errors
order by created_at desc
limit 5;
```

Group recurring crashes (what's hurting most):

```sql
select message, source, build, count(*) as hits, max(created_at) as last_seen
from client_errors
group by message, source, build
order by hits desc
limit 30;
```

## Testing

- **Unit** — `tests/errorLog.test.ts`: ring cap (50, newest-first), dedupe +
  rate-limit, per-source capture, `getDiagnosticsText`, remote-sink contract,
  never-throws, truncation.
- **E2E** — `e2e/errorcapture.spec.ts`: forces a render crash via the dev-only
  `window.__ec.crashRender()` hook → asserts the ErrorBoundary fallback + Copy
  diagnostics + persisted `react` capture; asserts a thrown `window` error, an
  `unhandledrejection`, and a sim `worker` crash are all captured. The triggers
  are dev-build-only (the test hook never ships to production).
- **Design shots** — `e2e/crashshots.helper.spec.ts` (run with `SHOTS=1`):
  `preview/crash-{desktop,phone-landscape}{,-details}.png`.
