# ElectriCity — CLAUDE.md

Read this first, every session. Then read TASKS.md and follow its protocol.
ROADMAP.md holds the ranked improvement backlog in build-ready detail.

## What this game is

A browser strategy game where the player is the **electricity network
operator** (DNO/ESO hybrid) for a recognisable, simplified **London +
home counties out to the Essex coast**. They don't build the city — they
power it: design the network (400/132/33 kV, substations down to pole
cans), sign developer tenders for generation, survive storms/faults/data
centres, and answer to the regulator. **Capital is unlimited; every pound
lands on customer bills** — score = bills, CI/CML reliability, carbon,
satisfaction, graded in 5-year RIIO report cards.

Real-industry fidelity is the soul of the game: DUoS vs energy costs,
planning permission, MVA reinforcement, iDNOs, flex markets, constraint
payments, conglomerate developers complaining to Ofgem. When in doubt,
model it the way GB actually works, then simplify for fun.

## How to work (the owner's standing instructions)

- **OWNER REQUESTS ARE NOT TO BE OVERRULED** (owner, 2026-06-16). When the
  owner asks for something, SCHEDULE it and ACTION it. Never silently drop
  it, defer it indefinitely, water it down, or substitute your own judgement
  for theirs. Every item the owner raises goes into TASKS.md and gets DONE.
  If something genuinely seems infeasible or wrong, SAY SO explicitly and
  ask — do not just quietly not-do it or rescope it.
- **Hero doctrine (owner, 2026-06-16) — this is the STANDARD, not aspirational:
  100 heroes per city, ALL BESPOKE.** Every one of the 100 is a hand-drawn
  bespoke sprite (no shared/reused hero sprites) with its OWN bespoke
  night-time electrification lighting effect, and ALL 100 are placed on the
  playable map. Everything that is NOT one of the 100 heroes is placed via
  archetypes. Drive it from the stored per-building research (docs/heroes/
  <city>/). "Dozens placed, a few bespoke" is NOT acceptable — it is 100,
  bespoke, lit, placed, per city.
- **Schedule everything in WAVES (owner, 2026-06-16).** All TASKS.md feedback
  must ALWAYS be scheduled and actioned — analyse TASKS into WAVES of work
  that each make a sensible PR, and action each wave with subagents (Opus).
  Nothing the owner raised is allowed to sit unscheduled.
- **Keep-alive drumbeat (owner, 2026-06-16): the orchestration (main) session
  must SPEAK at least every 10 minutes** — an idle main session gets reclaimed
  and KILLS the subagents it spawned (a passive Monitor drumbeat alone let
  agents die mid-run). Run an ACTIVE self-heartbeat: the `/loop` skill on a
  ≤9-min interval, or a ≤9-min Monitor you act on every tick — and on each
  beat check subagent/PR status, re-launch anything that died, and re-arm the
  heartbeat whenever it lapses. Verify a spawned subagent is ALIVE (its work
  files' mtimes advancing) a few minutes after launch; its transcript mtime is
  unreliable.
- **Model: use Opus, NEVER Fable** (owner, 2026-06-14). Run the main
  thread and every subagent on Opus (`claude-opus-4-8`). Do NOT select or
  switch to the Fable model — it is unavailable until Anthropic re-enable
  it, and a revoked model silently kills running agents/gates. When
  spawning agents, pass `model: "opus"` explicitly.
- **Go deep.** Take time; deep-research unfamiliar industry topics before
  modelling them; prefer correct-then-simplified over shallow.
- **Integration-test everything.** Unit tests for sim logic, Playwright
  e2e for flows, AND look at the result: render previews / take real
  screenshots and inspect them before claiming art or UI works.
- **Design self-evaluation is a REQUIRED gate when graphics change**
  (owner, 2026-06-13): if a change touches anything visual (sprites,
  render, map, labels, UI chrome, colour), a design-focused screenshot
  pass is a CORE part of testing before shipping — as mandatory as the
  unit/e2e gates, not optional polish. The pass: real in-game
  screenshots at the far/top zoom, mid, and close, PLUS a zoomed-in
  grab of each changed landmark/asset; then critique honestly against
  what the real thing looks like (the O2/stadium are HUGE; labels
  mustn't clutter the far view). A graphics PR is not ready until those
  images are taken AND look genuinely good. Judged on images, harshly,
  by you — both in the agent lane AND again at main-thread integration.
  Work the **checklist in `docs/DESIGN_GATE.md`** every time: the OBJECTIVE
  layout gate `e2e/hudfit.helper.spec.ts` (extracts every HUD box and fails on
  clip / safe-area / overlap at desktop + phone-landscape + narrow-phone), THEN
  the holistic-styling list judged on the grabs. Mobile (landscape) is checked,
  not assumed.
- **Feedback arrives in flurries** mid-task. Convert every prompt into
  TASKS.md checkboxes IMMEDIATELY (before working), then audit edits
  against it. Later prompts supersede earlier ones on conflict.
- Run the full local e2e before pushing; CI only runs unit tests (the
  e2e duplication was deliberately removed — local must stay identical
  to a clean checkout: fresh server, no reuse).
- Use subagents for parallel independent work (art vs sim vs renderer).
- **Never fire-and-forget long background work** (owner, 2026-06-12:
  "check in way more regularly to avoid timeout"). Arm a watchdog/
  heartbeat on every e2e gate and long agent, and check progress every
  few minutes — a silently killed gate looks identical to a slow one
  (one died at a timeout cap and sat unnoticed ~1 h). Stream gate
  output to a pollable file, not just a terminal pipe.
- **Auto-merge is standing policy** (owner-authorized): when a work
  package is complete and the full local suite is green, create the PR,
  wait for CI, and merge it yourself — no need to ask. Never push to
  main directly; never merge with failing checks.

## Architecture in one breath

Vite + React + zustand UI · sim in a Web Worker (authoritative, seeded
RNG, deterministic) · PixiJS isometric renderer · all art is CODE
(vector raster sprites, ink-contour style, 2x RES, IndexedDB-cached
atlas keyed by art-source fingerprint) · transport is a VECTOR layer
(routes: streets→motorway + rail) over the tile grid; tiles carry land
use, demand, coverage · Supabase (project `electricity`) for accounts/
saves/leaderboard · Vercel deploys (project `electricity`).

Key paths: `src/sim/` (tick, dispatch, dcpf, service, commands,
events/developers) · `src/data/londonMap.ts` (the whole map, code-drawn)
· `src/render/` (MapRenderer, tileChooser, sprites/*, atlasCache) ·
`src/ui/` · `tools/preview.ts` (render map crops to PNG:
`npx tsx tools/preview.ts x0 y0 x1 y1 downscale`) · screenshot helpers
`SHOTS=1 npx playwright test e2e/shots.helper.spec.ts`.

Commands: `npx vitest run` · `npx playwright test` (~7 min, 2 workers)
· `npx tsc -b` · `npx eslint src tests e2e tools` · `npm run build`.

## Design principles

- **Beautiful on BOTH mobile and desktop web** (owner, 2026-06-12) —
  every feature/panel/overlay is judged on both. Mobile assumes a
  **landscape hold**: design for it, and show a rotate prompt when
  held portrait. Test/screenshot at a phone-landscape viewport as
  well as desktop before claiming UI works.
- Lofi cosy golden-hour aesthetic (sunset oranges, dusty pinks, muted
  purples, deep navy shadows); powering an area literally makes it
  glow. UI chrome belongs to the same dusk world as the map.

## Map doctrine (current direction)

Recognisable-not-literal London: true Thames shape (Isle of Dogs loop),
organic density field along the real radials (A1/A10/A12/A13/A2/A21/
A23/A3/A4/A40/A41), Circulars + M25, named landmarks in true relative
positions, East-End vs West-End housing character, Heathrow in the
west, satellite towns (Watford…Southend) beyond the green belt,
enclosed-farmland countryside with space for generation everywhere.
Sector character beats per-tile noise; estates cluster (8x8 hash).

## Gotchas that have bitten before

- Context compaction loses requests → that is what TASKS.md is FOR.
- A lingering dev server once masked e2e failures; never reuse servers.
- Saves: map-geometry changes break old saves (bump/justify SAVE_VERSION).
- Atlas >4096px on either axis breaks mobile GPUs (shelf packer guards).
- `seedScenario` runs only on worker newGame — unit fixtures stay clean;
  e2e asset counts must baseline against seeded iDNO subs + existing gens.
