-- leaderboard: the global ranking of closed-period report cards.
--
-- Every closed regulatory period's report card is INSERTed here by the
-- client; the home screen reads the top-N publicly.
--
-- CLIENT CONTRACT (src/online/cloud.ts):
--   * submitScore(card): insert({ user_id, period, composite, grade, kpis })
--       period    = card.index        (regulatory period index)
--       composite = card.composite    (0..100 operator score)
--       grade     = card.grade        ('A'..'E')
--       kpis      = card.scores        (jsonb: Record<KpiKey, {actual,target,score}>)
--       achieved_at is server-defaulted (the client does not send it).
--   * fetchLeaderboard(limit):
--       select('composite, grade, period, achieved_at, profiles(username)')
--       .order('composite', { ascending: false })
--       .order('achieved_at', { ascending: true })
--       .limit(limit)
--
-- The `profiles(username)` embed is a PostgREST resource embedding: it
-- requires a FOREIGN KEY from leaderboard.user_id -> profiles.id so PostgREST
-- can resolve the relationship. (Both profiles.id and leaderboard.user_id
-- ultimately reference auth.users.id, but the embed needs the *direct* FK to
-- profiles to discover the join.)
--
-- SECURITY: RLS on.
--   * PUBLIC read (anon + authenticated): the leaderboard is a global board;
--     fetchLeaderboard runs for guests too, and shows public usernames only.
--   * A user may INSERT only rows for THEMSELVES (user_id = auth.uid()).
--   * No client UPDATE/DELETE policy: scores are immutable once posted
--     (only the service role, which bypasses RLS, can prune).
--
-- NOTE (carried over from the existing pen-test finding): composite/grade are
-- client-submitted and therefore client-trusted — a determined player could
-- POST an inflated score. Server-side validation/recompute is out of scope
-- for this migration (it would need an edge function or a trusted RPC); this
-- migration only creates the schema the wired client already expects.
--
-- Purely additive + idempotent. DO NOT auto-apply to production; the
-- maintainer applies this via the Supabase MCP after review.

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period integer not null,
  composite integer not null,
  grade text not null check (grade in ('A', 'B', 'C', 'D', 'E')),
  kpis jsonb,
  achieved_at timestamptz not null default now()
);

-- The exact ordering fetchLeaderboard uses: best composite first, then the
-- earliest achiever wins ties. A composite index serves the ORDER BY + LIMIT.
create index if not exists leaderboard_ranking_idx
  on public.leaderboard (composite desc, achieved_at asc);

-- Look up / prune a given user's submissions.
create index if not exists leaderboard_user_id_idx
  on public.leaderboard (user_id);

alter table public.leaderboard enable row level security;

-- Public read: the board (and its embedded usernames) is visible to everyone,
-- including signed-out guests.
drop policy if exists "leaderboard is publicly readable" on public.leaderboard;
create policy "leaderboard is publicly readable"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- A user may post only their OWN scores.
drop policy if exists "users insert own leaderboard scores" on public.leaderboard;
create policy "users insert own leaderboard scores"
  on public.leaderboard
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Deliberately NO update/delete policy for clients: posted scores are
-- immutable to players; only the service role (dashboard / MCP) can mutate.
