-- profiles: the public account identity (username) for the leaderboard.
--
-- One row per signed-in user, keyed 1:1 on auth.users.id. The client
-- (src/online/auth.ts) upserts {id, username} on sign-up / username-claim
-- and reads username back; the leaderboard embeds profiles(username) via the
-- foreign key from public.leaderboard.user_id (see 0005_leaderboard.sql).
--
-- username is UNIQUE: ensureUsername() relies on the 23505 unique-violation
-- error code to report "that username is taken".
--
-- SECURITY: RLS on.
--   * A user may insert / update / select / delete ONLY their own row
--     (id = auth.uid()).
--   * Usernames are PUBLICLY readable (anon + authenticated) so the
--     leaderboard can show who set each score — the leaderboard's
--     profiles(username) embed runs under the *reader's* role, so without a
--     public read every joined username collapses to the 'operator'
--     fallback. Only the non-sensitive username column is exposed, so a
--     public read is safe.
--
-- Purely additive + idempotent: safe to (re)apply. DO NOT auto-apply to
-- production; the maintainer applies this via the Supabase MCP after review.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The UNIQUE(username) constraint already indexes username; the primary key
-- indexes the eq('id', ...) lookups the client does. No extra index needed.

alter table public.profiles enable row level security;

-- Public (anon + authenticated) read: usernames are public identities and the
-- leaderboard join must resolve them under whichever role is querying.
drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- A user may create only their OWN profile row.
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- A user may update only their OWN profile row.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A user may delete only their OWN profile row.
drop policy if exists "users delete own profile" on public.profiles;
create policy "users delete own profile"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);
