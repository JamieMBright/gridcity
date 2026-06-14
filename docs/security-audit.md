# ElectriCity — Security Audit (2026-06-14)

Scope: the Supabase backend (project `mhgpzhtusrddwtgogjbv`) and the
client game (auth, online sync, leaderboard, the worker/sim). This is a
defensive review of the owner's own infrastructure.

## Summary

The posture is **good**. Row-Level Security is enabled with sound,
least-privilege policies on every table; no service-role key or secret is
committed; there are no XSS sinks; the debug/cheat hook is stripped from
production builds. The findings below are hardening items, not active
breaches, with one **medium** (client-trusted leaderboard scores) and a
few low/info recommendations.

## What was checked & passed ✅

- **RLS on all 5 public tables** (`profiles`, `saves`, `settings`,
  `leaderboard`, `progression`), with correct policies:
  - `saves` / `settings` / `progression` — every command gated to
    `auth.uid() = user_id` (fully private to the owner).
  - `profiles` — public `SELECT` (usernames, for the leaderboard),
    self-only `INSERT`/`UPDATE`.
  - `leaderboard` — public `SELECT`, `INSERT` gated to
    `auth.uid() = user_id`; **no** `UPDATE`/`DELETE` policy, so a user
    cannot alter or delete anyone's rows (including their own).
- **No `SECURITY DEFINER` functions** in `public`/`auth` — nothing
  bypasses RLS.
- **Secrets**: only the **publishable (anon)** key is in the client
  (`src/online/supabase.ts`) — that is designed to ship in the bundle and
  is safe *because* RLS is enforced. No `service_role` key anywhere in the
  repo; `.env*` is git-ignored.
- **XSS**: no `dangerouslySetInnerHTML` / `innerHTML` / `eval`; all user
  strings (usernames, save names) render as escaped React text.
- **Debug hook**: `window.__ec` (drive-the-sim test API) is gated behind
  `if (!import.meta.env.DEV) return` — **not present in production**.
- **Input constraints**: `username` length 3–20; leaderboard `composite`
  0–100; `grade` ∈ {A..E} — all enforced by DB `CHECK`s.

## Findings & recommendations

### MEDIUM — Leaderboard scores are client-trusted
The composite score is computed in the client and inserted directly
(`src/online/cloud.ts`). RLS guarantees a user can only insert rows *for
their own `user_id`*, and the value is capped 0–100 by a `CHECK`, but a
signed-in user could still submit a **fabricated** score. This is a known
v1 trade-off for a single-player game.
*Fix when integrity matters:* move the insert behind a Postgres
`SECURITY DEFINER` function or an Edge Function that recomputes/validates
the score server-side, and `REVOKE` direct client `INSERT` on
`leaderboard`.

### LOW — Leaderboard is append-only with no rate limit
No `UNIQUE(user_id, period)` and no rate limiting, so a user can insert
many rows. *Fix:* add `UNIQUE(user_id, period)` (keep best) or a periodic
top-N retention job; consider per-IP/user rate limiting.

### LOW — Username has no character allowlist
Only a length `CHECK`. Rendering is React-escaped (so no stored XSS
today), but adding a format `CHECK` blocks HTML/confusable characters as
defense-in-depth while still allowing accented international names:
```sql
alter table public.profiles add constraint profiles_username_safe
  check (username !~ '[<>&"''/\\]' and username !~ '[[:cntrl:]]');
```

### LOW — Leaked-password protection disabled (Supabase advisor)
Enable the HaveIBeenPwned check (Auth → Policies) and consider raising the
minimum password length from 6 to 8+.
<https://supabase.com/docs/guides/auth/password-security>

### Done in this change — Security response headers
There was **no** `vercel.json`, so the app shipped without security
headers. Added: `X-Content-Type-Options: nosniff`, `X-Frame-Options:
DENY` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security` (HSTS).

A **Content-Security-Policy** is *recommended* but intentionally **not**
shipped enforcing yet — it must be tested against the production build
(Pixi inline styles, the Vite worker as `blob:`, Supabase realtime over
`wss:`) to avoid breaking the live game. Suggested policy to test, then
enable:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self';
form-action 'self'; object-src 'none'
```

## Owner dashboard actions (cannot be done via API/MCP)

- **Auth → Email**: decide on email confirmation. To get the desired
  *auto sign-in on account creation*, **disable "Confirm email"** (sign-up
  then returns a session immediately). If you keep it on, configure custom
  **SMTP** — the default Supabase mailer is heavily rate-limited and
  unreliable (the cause of "I never received the email").
- **Auth → URL Configuration**: ensure Site URL + redirect allowlist
  contain only your real origins (the magic-link/reset redirect targets).
- Enable leaked-password protection; consider raising min password length.
