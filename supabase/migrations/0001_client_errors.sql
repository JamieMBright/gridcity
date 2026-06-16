-- client_errors: remote self-heal crash sink for ElectriCity.
--
-- Every captured client crash (React render error, window error, unhandled
-- rejection, sim Web Worker fault) is fire-and-forget INSERTed here by the
-- browser via the anon (publishable) key. The maintainer reads tracebacks
-- from this table to fix bugs.
--
-- SECURITY: RLS on. Anon may INSERT only — NO select/update/delete for anon
-- (a player can report a crash but can never read other players' reports).
-- Reads happen through the service role (dashboard / MCP), which bypasses RLS.
--
-- DO NOT auto-apply blindly to production — the maintainer applies this via
-- the Supabase MCP after review.

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

-- newest-first reads are the common query (recent crashes).
create index if not exists client_errors_created_at_idx
  on public.client_errors (created_at desc);

-- triage by build / source.
create index if not exists client_errors_build_idx on public.client_errors (build);
create index if not exists client_errors_source_idx on public.client_errors (source);

alter table public.client_errors enable row level security;

-- Anon (the browser publishable key) may INSERT crash reports — nothing else.
-- `with check (true)` accepts any insert payload; there is deliberately NO
-- select/update/delete policy for anon, so the table is write-only to clients.
drop policy if exists "anon can insert client errors" on public.client_errors;
create policy "anon can insert client errors"
  on public.client_errors
  for insert
  to anon
  with check (true);

-- (Optional) also let signed-in users insert, so a logged-in player's crash
-- still lands. Same write-only contract.
drop policy if exists "authenticated can insert client errors" on public.client_errors;
create policy "authenticated can insert client errors"
  on public.client_errors
  for insert
  to authenticated
  with check (true);
