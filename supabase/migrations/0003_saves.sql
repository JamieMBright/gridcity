-- saves + settings: per-user cloud sync for the autosave slot and the
-- audio preferences. Both are private to their owner.
--
-- CLIENT CONTRACT (src/online/cloud.ts):
--   saves
--     * pushCloudSave():  upsert({ user_id, slot: 0, data, updated_at })
--                         -> conflict target is (user_id, slot)
--     * pullCloudSave():  select('data').eq('user_id', id).eq('slot', 0)
--     `data` is the whole SaveData JSON blob (src/sim/state.ts). slot is an
--     int reserved for future multi-slot saves; today it is always 0.
--   settings
--     * pushSettings():   upsert({ user_id, music_on, sfx_on, volume, updated_at })
--                         -> conflict target is (user_id)
--     * pullSettings():   select('music_on, sfx_on, volume').eq('user_id', id)
--
-- The .upsert() calls send no explicit onConflict for these, so PostgREST
-- infers it from the table's PRIMARY KEY / UNIQUE constraint — hence the
-- composite PK (user_id, slot) on saves and the PK (user_id) on settings.
--
-- SECURITY: RLS on. A user may read/write ONLY their own rows
-- (user_id = auth.uid()). No public read of save contents or settings.
--
-- Purely additive + idempotent. DO NOT auto-apply to production; the
-- maintainer applies this via the Supabase MCP after review.

-- ---------------------------------------------------------------------------
-- saves
-- ---------------------------------------------------------------------------
create table if not exists public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.saves enable row level security;

-- Owner-only full access. Separate per-command policies so the contract is
-- explicit (select for pull; insert + update for the upsert).
drop policy if exists "users select own saves" on public.saves;
create policy "users select own saves"
  on public.saves
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own saves" on public.saves;
create policy "users insert own saves"
  on public.saves
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own saves" on public.saves;
create policy "users update own saves"
  on public.saves
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own saves" on public.saves;
create policy "users delete own saves"
  on public.saves
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  music_on boolean not null default true,
  sfx_on boolean not null default true,
  volume real not null default 0.6,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "users select own settings" on public.settings;
create policy "users select own settings"
  on public.settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own settings" on public.settings;
create policy "users insert own settings"
  on public.settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own settings" on public.settings;
create policy "users update own settings"
  on public.settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own settings" on public.settings;
create policy "users delete own settings"
  on public.settings
  for delete
  to authenticated
  using (auth.uid() = user_id);
