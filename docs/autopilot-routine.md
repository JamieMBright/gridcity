# Autopilot — run the ElectriCity build unattended (Routines)

**Why this exists.** An in-session loop (`/loop`, a heartbeat `Monitor`) lives
inside the cloud container, so when the container is reclaimed for inactivity
the loop dies and nothing wakes it. To keep the build moving overnight /
unattended, use a **Routine** instead: it runs on Anthropic-managed infra and
**each run is a fresh cloud session** that clones the repo, so it survives
container reclamation entirely. Docs: https://code.claude.com/docs/en/routines

The build is designed to be routine-drivable: all state worth keeping is in
**git** + **TASKS.md** (the ledger) + **ROADMAP.md** (the ranked backlog), so a
fresh session can always pick up where the last one left off.

## One-time setup (~2 minutes, must be done from the web/Desktop UI)

`/schedule` is hidden inside a Claude Code **web** session, so create the
routine from the UI:

1. Go to **https://claude.ai/code/routines** → **New routine**.
2. **Name**: `ElectriCity autopilot`.
3. **Prompt**: paste the block under "Routine prompt" below.
4. **Model**: select **Opus** (never Fable — it's unavailable; see CLAUDE.md).
5. **Repository**: `JamieMBright/gridcity`. Under **Permissions**, the default
   (push only to `claude/`-prefixed branches) is fine — the build branch is
   `claude/simcity-power-grid-game-v3qclq` and PRs merge into `main`.
6. **Environment**: pick the same environment this session uses (so the network
   policy + any env vars match). **Trusted** network access is enough for
   `npm ci` + Playwright browser install.
7. **Triggers** (combine both):
   - **Schedule → hourly** (or nightly if you prefer fewer, larger runs). This
     is the safety net that keeps things moving even with nothing in flight.
   - **GitHub event → Pull request → `closed`**, filter **Is merged = true**,
     base `main`. This *chains* the waves: when one PR merges, the next run
     starts immediately, so it doesn't sit idle waiting for the schedule.
8. **Create**, then **Run now** to kick the first one.

A daily run cap applies (research preview) — hourly is usually within it; drop
to nightly if you hit the cap.

## Routine prompt (paste verbatim)

```
You are continuing the autonomous build of ElectriCity (this repo). Work fully
autonomously — no questions; the owner is asleep.

1. Read CLAUDE.md (follow it exactly — note: use Opus, never Fable), then
   TASKS.md (the ledger) and ROADMAP.md (the ranked backlog).
2. Pick the next ONE unblocked, highest-value item. SKIP anything that needs
   an owner action (e.g. the Supabase Site-URL / login verification) or an
   owner judgement call (e.g. the m5 TOTAL-bill economy retune) — leave those
   for the owner and note them.
3. Develop on branch `claude/simcity-power-grid-game-v3qclq` (create from main
   if missing). Implement the item end to end.
4. Gate it properly before pushing:
   - `npx tsc -b`, `npx eslint src tests e2e tools`, the FULL `npx vitest run`,
     and `npm run build` — all clean.
   - Full local Playwright e2e in a clean worktree (npm ci, install chromium).
   - If anything VISUAL changed, the design self-eval gate is MANDATORY: take
     real screenshots (incl. an accurate phone-landscape repro with simulated
     safe-area) and critique them honestly before claiming it works.
5. Commit with a clear message ending in the session URL. Open a PR into main.
   Wait for the `test` CI check to go green, then squash-merge it yourself
   (auto-merge is standing policy). After merge, re-sync the branch to main
   (the squash-merge diverges history: `git merge -s ours origin/main`), and
   update TASKS.md to mark the item done.
6. Keep going to the next item until you run low on context or the backlog of
   unblocked items is exhausted; then stop with a short status of what shipped
   and what remains (especially owner-blocked items).

Keep each PR focused. Use subagents (on Opus) for self-contained parallel work.
Never push to main directly; never merge with failing checks.
```

## Notes

- Each routine run carries the owner's GitHub identity (commits/PRs appear as
  the owner) — same as this session.
- A green run status only means the session started/exited cleanly, not that
  the task succeeded — open the run to confirm, same as any session.
- To pause: toggle **Repeats** off on the routine, or delete it. Past run
  sessions stay in the session list.
