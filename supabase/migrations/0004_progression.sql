-- progression: the per-user operator-career record (cross-device rank sync).
--
-- One row per user. The client (src/online/cloud.ts) best-of-merges the
-- cloud record into local on sign-in, then pushes the merge back, so the
-- record is append-only in spirit (points/periods only rise, best_grade only
-- improves). Maps 1:1 to CareerRecord (src/ui/rank.ts) plus a denormalised
-- tier index for convenience.
--
-- CLIENT CONTRACT (src/online/cloud.ts):
--   * syncRank():  select('points, periods, best_grade').eq('user_id', id)
--   * pushRank():  upsert(
--                    { user_id, points, periods, best_grade, tier, updated_at },
--                    { onConflict: 'user_id' })
--   best_grade is one of 'A'..'E' or NULL. tier is the RankTier.index
--   (0-based ladder rung). points = Σ period composites; periods = count.
--
-- SECURITY: RLS on. A user may read/write ONLY their own row
-- (user_id = auth.uid()). Career records are private (the public ranking
-- lives in the leaderboard table, not here).
--
-- Purely additive + idempotent. DO NOT auto-apply to production; the
-- maintainer applies this via the Supabase MCP after review.

create table if not exists public.progression (
  user_id uuid primary key references auth.users (id) on delete cascade,
  points integer not null default 0,
  periods integer not null default 0,
  -- 'A'..'E' or NULL (no graded period yet).
  best_grade text check (best_grade is null or best_grade in ('A', 'B', 'C', 'D', 'E')),
  tier integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.progression enable row level security;

drop policy if exists "users select own progression" on public.progression;
create policy "users select own progression"
  on public.progression
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own progression" on public.progression;
create policy "users insert own progression"
  on public.progression
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own progression" on public.progression;
create policy "users update own progression"
  on public.progression
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own progression" on public.progression;
create policy "users delete own progression"
  on public.progression
  for delete
  to authenticated
  using (auth.uid() = user_id);
