# ElectriCity — Supabase Auth email templates + redirect fix

Branded, email-safe HTML for the passwordless auth flow, in the lofi
golden-hour ElectriCity look (deep-navy dusk, sunset orange, the
ELECTRI/CITY wordmark, a bulletproof CTA). Each file is self-contained
(table layout, inline styles, web-safe fonts) — paste-ready.

| File | Supabase template | Variable |
|---|---|---|
| `confirm-signup.html` | Authentication → Email Templates → **Confirm signup** | `{{ .ConfirmationURL }}` |
| `magic-link.html` | Authentication → Email Templates → **Magic Link** | `{{ .ConfirmationURL }}` |
| `otp.html` | use for **Magic Link** when sending a 6-digit code | `{{ .Token }}` |

## Apply (hosted project — dashboard)
1. Supabase dashboard → your project (`mhgpzhtusrddwtgogjbv`) → **Authentication → Email Templates**.
2. Pick the template, switch the editor to **Source/HTML**, paste the
   matching file's contents, **Save**. Send yourself a test.

## Fix the "confirm → localhost:3000 → 404" bug (REQUIRED)
The confirmation link redirects to `http://localhost:3000/#access_token=…`
because the project's **Site URL** is still the local-dev default. The
app itself is fine — it sets `emailRedirectTo: window.location.origin`
and `detectSessionInUrl: true`, so once the link lands on the DEPLOYED
app it consumes the token and signs you in. It only 404s because nothing
is served at localhost.

Dashboard → **Authentication → URL Configuration**:
- **Site URL** → set to the production app URL (the Vercel production
  domain, e.g. `https://electricity.vercel.app` or your custom domain).
  This is the fallback every auth email redirects to.
- **Redirect URLs** (allow-list) → add the production URL **and** the
  Vercel preview pattern so preview deploys work too, e.g.
  - `https://electricity.vercel.app/**`
  - `https://electricity-*-jamie-brights-projects.vercel.app/**`
  - (keep `http://localhost:5173/**` for local dev — the Vite port)

After this, signing up from the deployed site lands back on the deployed
app, the session is established automatically, and the URL hash is
cleared. (Signing up while running locally still redirects to localhost —
that's expected for dev.)

> Note: these are Supabase Auth config settings (Site URL / templates),
> not something the app repo controls — they live in the project
> dashboard. The app-side polish (a styled "email confirmed — welcome,
> operator" greeting on the auth callback) ships in the app.
