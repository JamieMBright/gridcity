# ROADMAP.md — the improvement backlog, ranked by impact

How this document works: it is the long-range plan, sibling to TASKS.md
(the prompt ledger). Items live here in priority order with enough design
and build detail that any session can pick one up cold. When the owner
schedules an item, it graduates into TASKS.md as checkboxes and gets
built under the usual doctrine (unit + e2e + preview verification, full
local suite before push, auto-merge on green). Ranking is by expected
impact on a play session, not by effort.

Conventions used below — **What/Why**: the case for the item. **Design**:
player-facing behaviour. **Build**: systems and files it touches (real
names from the codebase). **Verify**: how we'll know it works.

---

## Tier 1 — transformative (changes how the game plays)

### 1. Line waypoints (bendable circuits)
**What/Why.** Circuits are dead-straight between endpoints, so routing
around a town, a reservoir, or a conservation area is impossible without
abusing tee junctions. This is the single biggest builder pain: real
routes follow corridors. Every other build feature compounds with it.
**Design.** While the line tool is armed and anchored, each click on
open ground drops a waypoint pylon (rendered like a normal support, but
a route vertex); clicking a destination asset completes the circuit.
Esc removes the last waypoint. The ghost previews the full polyline with
per-leg pricing summed live. Inspecting any leg shows the whole circuit;
demolishing any leg or vertex takes the circuit down (or, later, heals
it). Waypoints obey pylon siting rules (no water/heavy roads/plots).
**Build.** Two options; prefer (a): (a) model each leg as today's
LineAsset chained through small junction nodes reusing `sub:'tee'`
(teeLevel = line level) — zero solver changes, undo/cost/veg per leg all
free; the UI composes one multi-leg build command (one undo step) like
`undergroundSection` does. (b) true polyline LineAsset (`pts: number[]`)
— bigger change: `routeTiles`, `placePylons`, `priceLine`, renderer
`drawLines`, veg/blight per segment. Tool state: `Tool.line` gains
`waypoints: Array<{x,y}>`. MapView click flow + BuildPalette hint text.
**Verify.** Unit: multi-leg build = one undo step; pricing equals sum of
legs; waypoint on water refused. e2e: draw a 3-leg dogleg around a town
via canvas clicks. Preview: screenshot a circuit hugging a river bend.

### 2. Headroom heatmap overlay
**What/Why.** "Where can I connect the next thing?" currently means
clicking assets one at a time. A single map layer answering it makes
every connection decision faster and makes congestion legible at a
glance.
**Design.** A toggle beside grid view (`H`): catchment areas tint by
spare MVA (green >40% spare → amber → red ≤10%), line corridors tint by
thermal headroom at the current moment, with an option to show the
typical-day PEAK headroom instead (worst hour from the balance engine).
Hover reads out exact numbers. Armed build tools auto-enable it.
**Build.** Data exists: `service.peakOfSub` vs `subMva` for catchments;
`BranchView.flowMW/ratingMW` for corridors; the peak variant reuses
`computeBalance`'s hourly loop per sub/branch (extend `balance.ts` to
emit per-asset peak loadings). Renderer: one Graphics layer like
`coverageG`, rebuilt on snapshot when toggled; HUD button + hotkey;
store flag.
**Verify.** Unit: peak-headroom math for a known fixture. e2e: toggle
shows layer, store flag flips. Preview: screenshot with one red, one
green catchment staged.

### 3. Reinforcement planner (diagnose → act)
**What/Why.** Grid Balance now says "Watfordshire needs +64 MW at
18:00"; the player still has to translate that into works by hand. A
planner that proposes costed options closes the loop and teaches the
game's own playbook.
**Design.** Each shortfall row gains a "plan works" button → the worker
returns 2–4 options, each a bundle with capex, bill impact (£/home/yr)
and what it fixes: e.g. (a) second 132 kV circuit into the area's BSP,
(b) +20 MVA across two dist subs, (c) a 100 MW battery tendered beside
the grid sub, (d) re-conductor the loaded corridor. Clicking an option
stages ghost previews on the map; "approve" executes as one undo step.
**Build.** New `src/sim/planner.ts`: candidate generation (enumerate
serving subs/corridors of the scope; reuse `connectionStudy`'s clone +
stress machinery to score each candidate's residual shortfall), priced
via `checkBuild`/`subCapexK`/uprate fractions. Protocol: `plan` request
/ response like `study`. UI in BalancePanel; staged-ghost rendering via
existing ghost APIs (extend to multiple ghosts).
**Verify.** Unit: planner clears a staged shortfall in the fixture and
never mutates live state. e2e: plan→approve builds the bundle. Owner
playtest for option quality.

### 4. Town labels at zoom-out + search-to-fly
**What/Why.** The map is recognisable but anonymous: nothing names
Basildon until you hover a tile. Labels plus a search box turn the map
into a navigable place and make every "go fix X" task faster.
**Design.** Below a zoom threshold, town/landmark names fade in as
small-caps labels (towns by size, landmarks italic); above it they fade
out. `/` or a search field in the HUD: type-ahead over towns, landmarks,
councils, named customers; Enter flies the camera (existing `panTo`)
and pulses a ring.
**Build.** Town centroids + names already exist in `londonMap.ts`
(councils, NAMED_PLACES, town seeds — export a `TOWN_LABELS` list).
Renderer: a `labelLayer` of Pixi `Text` objects with alpha tied to
`world.scale` in `animate()`; cheap (≤60 labels). Search: small React
component, fuzzy startsWith, store-driven panTarget.
**Verify.** e2e: search "Watford" → camera centres it (store panTarget);
labels visible at far zoom in a screenshot preview.

### 5. Seasons (winter peaks, summer sun)
**What/Why.** Every day is the same typical day, so profiles tell one
story (the solar night-hole). A seasonal cycle makes the Balance view,
storage, and RIIO periods genuinely dynamic: winter evening peaks that
bite, summer solar gluts that curtail.
**Design.** The game calendar maps to a season curve: domestic + HP
demand scale up in winter (HP strongly), sun arc shortens/weakens in
winter and stretches in summer; storms cluster Oct–Mar, heatwaves add
summer cooling load late-game. Balance profiles get a season selector
(typical winter day / summer day / today). News ticker marks solstices,
cold snaps, "beast from the east" events.
**Build.** `events/weather.ts`: `seasonFactor(simTimeMin)` feeding
`sunFactor` (day length + amplitude), `hpProfile` (cold scaling), storm
probability in `stepWeather`. `balance.ts` takes a season parameter.
KPI/bill effects flow automatically through dispatch. Save-compatible
(pure functions of time).
**Verify.** Unit: winter peak > summer peak for a fixture; sun hours
shorter in December. Balance chart preview for both seasons. Determinism
preserved (seeded RNG untouched).

### 6. Early-game goal ladder
**What/Why.** RIIO judges you at year 5; new players need 15-minute
goals. A visible ladder ("first 1,000 customers on supply" → "survive a
storm" → "first £100m network") converts the sandbox into a game for the
first hour, where most players are lost or won.
**Design.** A compact goals chip under the clock showing the current
goal + progress bar; completing one fires a celebratory event + the next
goal. ~12 goals ending where RIIO takes over. Skippable for veterans.
Examples: energize the tutorial town; award your first tender; run a
connection study; underground a town section; get satisfaction >60 in
any council.
**Build.** `src/sim/scenario/goals.ts` exists as a stub path in the
original plan — implement: declarative goal list with `done(snapshot)`
predicates (mirrors Tutorial's pattern), persisted index in GameState
(serialize optional field). UI chip component; events on completion.
**Verify.** Unit: predicates fire on staged states; save round-trip
keeps the index. e2e: first two goals complete in a scripted run.

### 7. Time-skip controls
**What/Why.** Even at 16×, waiting for the evening peak or for morning
is dead time. Skipping to the moments that matter respects the player's
attention and makes profile-driven play (Balance, studies) practical.
**Design.** Next to speed controls: "skip → 18:00", "skip → 06:00", and
"skip → next event" (next inbox arrival/fault/period end, capped at 7
game-days). During a skip the sim fast-forwards on the worker at max
tick batching with a progress shimmer; any 'bad' event aborts the skip
so disasters aren't slept through.
**Build.** Worker: a `skipTo(minute)` loop calling `advanceTime` +
`solveTick(accumulate)` without posting per-tick snapshots (post every
~2 game-hours + final); abort on event severity ≥ warn. Guard: autosave
after skip. HUD buttons; protocol message `skip`.
**Verify.** Unit: skip advances exactly to target; aborts on injected
fault. e2e: clock jumps to 18:00; KPIs accrue (CML unchanged when no
faults).

### 8. N-1 security view
**What/Why.** Reliability play is reactive today: things trip, you see
the spanner. Real DNOs plan to P2/6: no single failure should black out
a town. Showing single points of failure makes redundancy a proactive,
visible goal — the heart of network craft.
**Design.** A toggle in grid view: every catchment is shaded by
security — green if it survives any single line/TX outage (an alternate
path exists with sufficient rating), red if radial. Clicking a red area
explains the binding failure ("everything here hangs off the Marsh Lane
132 kV circuit") and suggests the loop that fixes it (pairs with the
ring-main assist, item 25).
**Build.** `src/sim/security.ts`: for each serving sub, run contingency
screening — for each branch on its supply path (or all branches in its
island, pruned), test connectivity + simple capacity with that branch
out (reuse `findIslands` on a copy with `inService=false`; full DCPF per
contingency is optional v2 — start topological). Cache per
assetsVersion. Snapshot or on-demand message; renderer overlay like
coverage.
**Verify.** Unit: radial fixture flags red; adding the loop turns it
green. Preview screenshot of mixed map.

### 9. Storm preparation loop
**What/Why.** Storms are currently a dice roll you experience. A
forecast with prep actions turns them into the game's set-piece: brace,
ride it out, count the cost.
**Design.** 2–3 game-days ahead, the ticker + a banner warn: "Storm
Aoife, Friday night, gusts 85mph, SW first". Prep actions while the
clock runs: hire surge contractor crews (expensive, temporary fleet),
pre-position vans to a region (depot bias), emergency vegetation cut on
chosen corridors (one-off cost, veg −50% there), pre-charge batteries.
During the storm a compact "storm console" tracks faults/CML live;
afterwards a debrief card (faults, CML, cost, what prep saved).
**Build.** `stepWeather` gains named storm events with lead time
(seeded); state for surge crews + prepositioning in fleet (`fleet.ts`
van count override, travel bias); veg cut = command writing `lineVeg`;
debrief = event aggregation over the storm window. UI banner + console
panel.
**Verify.** Unit: forecast precedes storm deterministically; surge crews
expire; veg cut halves that line's storm fault rate (seeded comparison).
e2e: banner appears, prep button works.

### 10. Demand-growth forecast overlay
**What/Why.** EV/HP adoption quietly cooks transformers that were fine
at energization ("you finished the area, then they changed the plans").
Showing where growth will bite lets the player reinforce ahead — the
defining DSO skill.
**Design.** Map overlay: each catchment tinted by years-until-overload
at current adoption trajectory (red <2y, amber <5y, green otherwise),
with the council panel showing its uptake curve. Balance rows gain a
"in 5y" demand column.
**Build.** Adoption model is deterministic (`stepAdoption` with council
profile rates): extrapolate per council to t+N, recompute per-sub peak
via `computeSubLoads` with projected councils, compare to `subMva`
including remaining auto-steps. Implement in `balance.ts` or a sibling
`forecast.ts`; overlay rendering like headroom (item 2 shares plumbing).
**Verify.** Unit: ambitious affluent council crosses threshold sooner
than laggard; auto-step headroom respected. Preview screenshot.

---

## Tier 2 — major depth

### 11. Interconnector at the map edge
**What/Why.** When local generation falls short there is no recourse but
blackouts; real GB imports. An interconnector adds a price-driven
safety valve and an export market for surplus wind — and rescues new
players.
**Design.** A buildable 400 kV interconnector terminal on designated
edge tiles (cost ~£500m). Imports arrive at a volatile "national" price
(profile + noise, expensive at peaks); exports earn when local marginal
cost beats it. Capacity 1 GW, upgradeable. The Balance supply curve
shows the import band distinctly.
**Build.** Catalog entry (gen-like asset with `marginalCostK` driven by
a national price series in `dispatch.ts`); dispatch treats it as a unit
whose cost is the national price (import) and as negative demand when
exporting (v1: import only — simpler and covers the safety-valve need).
National price series: deterministic daily shape + seeded noise in
weather/market step. Bill: import energy flows through `energyYrK`.
**Verify.** Unit: islanded town with interconnector stays lit, bill
rises at peak price; merit order places imports after cheap local gen.

### 12. Battery dispatch policy
**What/Why.** Batteries currently follow one automatic heuristic.
Letting the player set intent (peak-shave / arbitrage / reserve) makes
storage a strategy, not furniture — and it's the natural answer the
game should reward after item 5's seasons and item 10's peaks.
**Design.** Battery card gains a policy selector: **Peak shave** (hold
for the local evening peak), **Arbitrage** (charge cheap, discharge
dear), **Reserve** (hold ≥50% for faults; auto-discharge into islands
that lose supply — pairs beautifully with the blackout explanations).
**Build.** `BatteryAsset` policy field (`GenAsset.policy?:`), dispatch
branches on it in the battery block of `runDispatch` (charge/discharge
windows by policy; reserve hooks the island-without-supply path).
Serialize optional field. Card UI buttons like MvaControls.
**Verify.** Unit per policy: shave reduces sub peak; arbitrage tracks
price spread; reserve rides through a staged fault (island stays lit
until SoC floor).

### 13. Network losses (I²R) on the bill
**What/Why.** Losses are the second economic leg of uprating and
undergrounding decisions; without them, oversizing has no reward and
long skinny circuits are free. Real DNOs are incentivised on losses.
**Design.** A "losses" line on the bill (£k/yr, smoothed) computed from
branch flows; the line inspector shows each circuit's loss at current
flow; the KPI dashboard tracks losses % of energy delivered. Uprated
conductors and shorter routes visibly pay back.
**Build.** DCPF gives flows; losses ≈ Σ I²R ≈ Σ (flowMW² · r) with the
existing per-branch `r` (already in `deriveNetwork`). Accumulate EMA in
tick like `energyCostYrK`; bill line + panel row; per-branch value into
`BranchView`.
**Verify.** Unit: doubling r doubles loss; uprating (same r) unchanged
but undergrounding (lower r per the cable spec) reduces it; bill sums.

### 14. CfD auction rounds
**What/Why.** Tenders are per-site and instant; an auction season makes
procurement strategic (how much, which tech, when) and produces real
price tension between developers.
**Design.** Quarterly "allocation round": the player publishes a need
(MW by tech class), developers submit sealed strikes against ALL open
designated sites, the player clears the round picking any subset; losers
sour slightly. Keeps per-site tenders for one-offs.
**Build.** Extends `events/developers.ts`: round timer in state, bid
generation reuses `strikeMWh` ± developer mood/eagerness; a round panel
in the inbox UI; acceptance reuses `acceptBid` flow per cleared bid in
one command (one undo step).
**Verify.** Unit: round clears cheapest-first; moods move; undo restores
pre-round state.

### 15. Asset ageing & condition
**What/Why.** Once built, kit is immortal; late-game has no renewal
pressure. Condition decay creates the replace-vs-sweat decision that
defines real asset management (and RIIO's asset-health outputs).
**Design.** Every line/TX has health 100→0 over ~40y, decaying faster
under high loading and storms; fault rates scale with poor health; the
inspector shows health + "replace like-for-like £X" (resets age,
cheaper than new build). KPI: average network health; events when kit
enters poor condition.
**Build.** Asset `builtAtMin` (+ implicit health function — no stored
decay, derive from age/loading EMA per asset stored compactly);
`faults.ts` multiplies hazard by health curve; replace = command
adjusting builtAtMin + capex. Save: optional fields.
**Verify.** Unit: aged line faults more (seeded); replacement resets;
bills carry replacement capex.

### 16. Planned maintenance windows
**What/Why.** Outages only ever happen TO the player. Letting them
schedule a maintenance window (de-energize a circuit deliberately,
cheaper than failure) rewards redundancy (N-1, item 8) and planning.
**Design.** Inspector action on aged/hot kit: "schedule maintenance"
(pick tonight/weekend) — the branch goes out for 4–8h at the chosen
time, health restored partially, much cheaper than a fault repair. If
the network can't supply around it, the planner warns (reuses N-1
machinery).
**Build.** State: scheduled outages list applied in tick at their
window (sets `outages` with a 'planned' cause); cost via fleet job
without the fault path; cause string "planned maintenance" flows to the
existing diagnosis UI.
**Verify.** Unit: window applies/repairs on time; CML accrues only if
customers actually lost supply; N-1-safe areas ride through.

### 17. Constraint bidding market
**What/Why.** Flat constraint compensation undersells a real mechanism:
curtailment is a market. Generators offering their curtailment price
creates portfolio choice in WHO you turn down.
**Design.** Firm generators each carry a curtailment price (developer
personality × tech); when the dispatcher must curtail, it stacks the
cheapest offers first and the constraint line shows who got paid what.
The player sees per-generator curtailment prices in the card and can
factor them at award time (bids quote both strike AND curtailment
price).
**Build.** Bid/asset field `curtailK`; `recordCurtailed` in dispatch
orders candidates by it and prices `constraintKPerHour` accordingly;
tender UI shows both numbers.
**Verify.** Unit: cheaper curtailer is cut first; constraint cost equals
offers paid.

### 18. ~~Per-council smart-charging lever~~ (shipped — smart-charging/ToU lane, this branch; summary in TASKS.md Done)
**What/Why.** The EV evening spike is the canonical DSO problem; smart
charging is the canonical fix. Making it a per-council programme ties
the satisfaction system to load-shape engineering.
**Design.** Council panel action: "fund smart charging programme"
(£/yr scaled by EV count) → that council's EV profile flattens (the
existing `evProfile(smart)` shape), satisfaction nudges up, bill carries
the programme. Councils with low trust refuse until satisfaction >50.
**Build.** Tech is global today (`tech.smartEv`); move to per-council
flag set via command; `computeSubLoads`/dispatch consult the council of
each tile (plumbing exists — profiles applied per sub-load with council
mix; approximate by majority council per catchment v1).
**Verify.** Unit: funded council's sub peak drops; refusal below trust
threshold; bill line appears.

### ~~19. Voltage control builds (capacitor banks / SVCs)~~ — SHIPPED (Wave 4)
**What/Why.** Voltage sag currently has one answer: more copper. A
cheap shunt-compensation build differentiates the voltage problem from
the thermal one and uses the voltage model that already exists.
**Design.** A small "capacitor bank" build (33 kV bay, ~£2m) that
raises the voltage estimate downstream of its bus by a bounded amount;
the inspector shows pu improvement; overlays show sag areas (ties into
item 2's heatmap as a voltage mode).
**Build.** Asset type (sub-like, single bay); `grid/voltage.ts` spanning
tree credits a boost at buses below the bank; catalog + palette + card.
**Verify.** Unit: brownout tile recovers with a bank placed; no effect
on thermal flows.

### 20. Multi-day weather systems
**What/Why.** Weather is per-tick noise; storage strategy needs
multi-day structure (wind droughts, anticyclonic gloom) to matter.
**Design.** Weather becomes fronts: 2–6 day regimes (windy wet / calm
cold / heatwave) with smooth transitions, surfaced in the forecast strip
(pairs with item 9). A January "dunkelflaute" becomes the storage
set-piece.
**Build.** `stepWeather` driven by a regime state machine (seeded), with
the current per-tick jitter retained inside a regime envelope; forecast
exposes the next regimes.
**Verify.** Unit: regime lengths/distribution deterministic per seed;
balance winter profile under "calm cold" shows the storage gap.

### 21. Heat networks
**What/Why.** Heat pumps are the only decarbonised-heat path, loading
LV. District heat gives dense areas an alternative that trades network
load for a build cost — a genuine strategic fork.
**Design.** In urbanCore/CBD councils: fund a heat network (£big), which
caps that council's HP electrical uptake (heat demand goes to the
network), visible in the growth forecast overlay (item 10).
**Build.** Council flag via command; `stepAdoption` caps hp for flagged
councils; bill carries the cost; events celebrate.
**Verify.** Unit: flagged council's hp plateaus; forecast overlay
responds.

### 22. Scenario seeds & shareable states
**What/Why.** "Same world, compare answers" is the cheapest multiplayer:
one seed, two operators, two bills.
**Design.** New game accepts a seed string (menu field); a "share"
button copies a link encoding seed + day; leaderboard (item 45/46)
keys daily challenges off it.
**Build.** `newGame(seed)` already seeds RNG — expose through menu +
URL param; growth/events are deterministic already (doctrine). Share
link = location hash.
**Verify.** Unit: two newGame(seed) runs tick-identical for 1k ticks.
e2e: URL seed produces named expectation.

### ~~23. Hydrogen / electrolyser endgame~~ — SHIPPED (Wave 4; innovation gating deferred to integration)
**What/Why.** Late-game surplus wind needs somewhere to go; hydrogen is
the era-appropriate sink and a second life for the gas fleet.
**Design.** Innovation-gated: electrolyser builds soak curtailed energy
into an H₂ store; peakers can convert to H₂ (carbon → 0, fuel from the
store, fall back to gas price when empty). Curtailment KPI falls;
carbon KPI completes its arc.
**Build.** Asset (load-side unit that bids negative price for surplus in
dispatch) + store level in state + peaker fuel switch; innovation pitch
gating; balance supply notes H₂ backing.
**Verify.** Unit: surplus charges store instead of curtailing; peaker
burns H₂ first; carbon drops.

### 24. ~~Demand response / time-of-use tariffs~~ (shipped — smart-charging/ToU lane, this branch; summary in TASKS.md Done)
**What/Why.** The demand SHAPE is fixed; ToU tariffs are the
behavioural lever every real supplier pulls. It complements smart
charging with a whole-home effect.
**Design.** Innovation unlock: regional ToU pilot — peak demand shaves
~8%, shoulder fills, satisfaction dips slightly at launch then recovers.
A second-order lever after wires and flex.
**Build.** `domesticProfile` modulation flag per council or licence-wide
(v1 licence-wide via tech), satisfaction nudge via existing target math.
**Verify.** Unit: peak factor falls, energy conserved across the day
(±1%).

### 25. Ring-main assist
**What/Why.** Closing radials into rings is the classic reliability
move, but finding the right closure is fiddly. An assist that proposes
the loop turns N-1 red into one click.
**Design.** From an N-1 red area (item 8): "propose loop" draws the
cheapest closure (existing bays, priced route, often via a waypointed
path once item 1 lands) as a staged ghost; approve to build.
**Build.** Candidate pairs = bays inside the radial subtree × nearby
bays outside it; price via `priceLine`; score by capex per customer
secured; reuses planner plumbing (item 3).
**Verify.** Unit: proposed loop flips the fixture to N-1 green; cheapest
candidate chosen.

---

## Tier 3 — strong UX

### 26. Minimap
**What/Why.** A 256×160 world deserves an at-a-glance locator;
navigating by drag alone hides half the game.
**Design.** Corner minimap (toggleable): terrain wash, network strokes,
viewport rectangle, alert pings; click to jump. Mobile: collapsed by
default.
**Build.** Pre-render terrain once to a small canvas (downscale of the
ground pass — `tools/preview.ts` already proves the compositor); overlay
dynamic strokes from asset list each second; DOM canvas, not Pixi, to
keep it cheap.
**Verify.** e2e: click minimap → camera moves; screenshot.

### 27. Undo history list
**What/Why.** Twenty deep undo exists, but only blind stepping; seeing
"3. built 132 kV line, 4. GIS rebuild…" makes recovery deliberate.
**Design.** Long-press/right-click the undo button → a list of the
stack with one-line labels and timestamps; click N reverts N steps (one
worker message, N pops, single snapshot post).
**Build.** Worker stacks store SaveData; add a parallel label ring
(command summaries captured at push time, e.g. from a
`describeCommand(cmd)` helper); protocol `undoTo(depth)`.
**Verify.** Unit: labels match commands; undoTo(3) ≡ 3× undo. e2e list
renders.

### 28. Bill-over-time chart
**What/Why.** The bill is the score, but only its current value shows;
trends are the actual feedback loop ("my last reinforcement push cost
£40/home").
**Design.** BillPanel expands to a stacked-area chart of the components
across the current RIIO period (sampled daily), with period targets as
a line. Click a band to isolate it.
**Build.** Worker samples `BillBreakdown` daily into a ring (period
length ≈ 1825 points max — store decimated to ~120); ship in snapshot on
demand (like watch); SVG stacked areas (Balance chart sibling).
**Verify.** Unit: samples accumulate/decimate; sum of bands = total.

### 29. Hotkey help overlay
**What/Why.** The hotkey set outgrew the status-bar one-liner; nothing
teaches `B`, `K`, `U`, Ctrl+Z….
**Design.** `?` opens a styled cheat-sheet overlay grouped by build /
inspect / camera / panels; printable.
**Build.** Static component fed from `hotkeys.ts` + a manual extras
list; App keyboard hook.
**Verify.** e2e: `?` toggles; all HOTKEYS entries present.

### 30. Filterable event log panel
**What/Why.** The ticker is ephemeral and the alerts feed short; "what
happened while I was zoomed in" needs a real log.
**Design.** A log panel (from the ticker's "…" button): filter chips
(faults / market / regulatory / construction), click-to-jump rows,
sticky timestamps; keeps ~500 events.
**Build.** Worker event ring already exists (`state.events`) — lengthen
with a cap + category tag at `pushEvent` call sites (mechanical sweep);
panel UI.
**Verify.** Unit: categories assigned; cap holds. e2e: filter narrows
rows.

### 31. Compare mode (pin two cards)
**What/Why.** Sizing decisions are comparative ("is the north BSP or the
south one closer to its limit?"); one pinned card forces memory.
**Design.** Shift-click pins a second card beside the first; both live.
**Build.** store selection becomes a small array (cap 2); InfoPanel maps
over it with offset frames; selection rings tinted per slot.
**Verify.** e2e: two cards visible, independent close buttons.

### 32. Colour-blind mode
**What/Why.** The whole network language is three colours; deuteranopia
players lose the game's grammar.
**Design.** Settings toggle: alternative LEVEL_COLOR set (blue/teal/
yellow with distinct lightness) + patterned line dashes per level
(shape, not just hue); persists with audio settings.
**Build.** Theme-level palette switch consumed by renderer constants
(make LEVEL_COLOR a function of settings; renderer rebuild on change),
dash pattern per level in `strokeSpan`; settings plumbing exists
(audio settings + cloud push).
**Verify.** Preview screenshots both palettes; settings round-trip.

### 33. Net-zero dashboard
**What/Why.** Carbon is a KPI number; a trajectory view (rolling carbon
vs a 2050-style glidepath, generation mix donut, curtailment trend)
gives the green arc a home.
**Design.** A tab inside the RIIO dashboard: carbon line vs target
glidepath, mix-by-tech stacked bar (MWh shares), curtailed renewables
trend, "all-green hours" counter.
**Build.** Worker samples mix daily (per-tech MWh from dispatch);
decimated ring like item 28; UI in KpiDashboard.
**Verify.** Unit: mix shares sum to 1; counter increments on staged
green hour.

### 34. Named save slots
**What/Why.** One autosave means experiments risk the campaign; slots
invite "what if" play (and pair with undo for coarse-grained branches).
**Design.** Menu "saves" screen: 5 slots with name, day, bill, map
thumbnail; save/load/duplicate/delete; cloud-synced when signed in.
**Build.** `SaveStore` interface already abstracts storage — extend
localStorage + Supabase `saves(slot)` (schema has slot column per the
original plan); thumbnail = decimated coverage/terrain canvas.
**Verify.** e2e: save to slot 2, mutate, load slot 2 restores; cloud
mocked in unit.

### 35. Mobile inspector bottom-sheet
**What/Why.** Pinned cards crowd small screens and pins are small touch
targets; mobile deserves first-class inspection.
**Design.** On mobile, pinned cards open as a bottom sheet (drag to
expand/dismiss); map pins get a +40% hit area; the balance panel
becomes full-screen with the chart on top.
**Build.** MobileChrome sheet pattern exists — route InfoPanel/Balance
through it; pin `hitArea` rectangles in renderer.
**Verify.** Mobile e2e (existing mobile.spec patterns): tap pin → sheet;
drag dismiss.

### 36. "Why is this number red?" KPI tooltips
**What/Why.** KPIs go red without teaching; every number should link to
its cause and its view.
**Design.** Hover/tap any KPI → tooltip with the formula in words, the
worst contributor ("CML driven by Friday's storm: 64% from the Harlow
radial"), and a jump-to button (balance / log / map).
**Build.** Worker tracks top contributors where cheap (CML by sub
already derivable from reliability tracking; bill by component exists);
tooltip component + per-KPI metadata table.
**Verify.** Unit: contributor attribution sums; e2e tooltip renders.

### 37. Build templates (copy/paste patterns)
**What/Why.** Veteran play repeats motifs (BSP + 2 grid subs + ring);
templates reward mastery and speed.
**Design.** Select an area (drag in inspect) → "save as template";
placing a template shows a composite ghost, prices the lot, builds as
one undo step; templates stored locally with names.
**Build.** Template = relative asset list (subs/lines with offsets);
placement validates per-asset via `checkBuild` and executes as a
compound command (reuse the one-command bundling pattern from tee/
section). localStorage persistence.
**Verify.** Unit: compound build all-or-nothing rollback; e2e place a
2-sub template.

### 38. Camera bookmarks
**What/Why.** Sessions orbit 3–4 hotspots; re-finding them by drag is
friction.
**Design.** Ctrl+1..4 saves the current view; 1..4 (with no tool
conflict — use Shift+1..4) flies to it; tiny dots in the minimap.
**Build.** store array of {x,y,zoom}; renderer exposes current centre
(inverse of panTo math); keyboard hook.
**Verify.** e2e: save + recall round-trips position.

### 39. Alert acknowledge / snooze
**What/Why.** Known issues (a flagged overdue connection you're working
on) shout forever, training players to ignore alerts.
**Design.** Each alert row: tick (acknowledge — greys it) or snooze 1
day (re-fires after); ticker skips acknowledged.
**Build.** Client-side ack set keyed by event seq/site (persist in
localStorage); AlertsFeed + ticker filter.
**Verify.** Unit: snooze re-arms after a day; e2e ack hides row.

### ~~40. First-use panel coach marks~~ — SHIPPED (Wave 7 tutorial lane, pulled forward as the HUD tour)
**What/Why.** Balance, studies, RIIO arrive unexplained; one-time
30-word coach marks raise feature discovery massively.
**Design.** First open of each panel shows a dismissable callout ("This
is your demand vs supply. Red = unserved. Tap a council to ring-fence
it."); never again after dismiss.
**Build.** localStorage seen-set; small Coach component wrapped around
panels.
**Verify.** e2e: shows once, not twice.
**SHIPPED as** a guided HUD coach-mark TOUR (src/ui/HudTour.tsx): a
spotlight stepping bill → clock/speed/skip → palette → inbox → balance
→ KPIs → map inspector, with a dim cutout highlight per target + a
callout, next/skip, once-flagged in localStorage ('ec-hud-tour-v1'),
launchable from the start menu ("tour the controls") and the HUD ?
affordance, working at phone-landscape + desktop (it measures live
element rects, so it follows whichever layout is mounted).

---

## Tier 4 — polish & meta

### ~~41. Day/night sky grading~~ — SHIPPED (Wave 6 beauty lane; summary in TASKS.md)
**What/Why.** Windows already light at dusk; grading the ambient scene
with the clock completes the lofi promise ("powering an area literally
makes it glow").
**Design.** The golden-hour gradient overlay keys off game time: dawn
blue-pink → day soft gold → dusk orange-purple → night deep navy with
stronger window/streetlight bloom; transitions over ~30 game-min.
**Build.** App overlay colours become functions of
`snapshot.simTimeMin` (CSS variables, cheap); optional Pixi ambient tint
for the city container.
**Verify.** Screenshot strip at 06/12/18/23h.

### ~~42. Rain & storm visuals~~ — SHIPPED (Wave 6 beauty lane; summary in TASKS.md)
**What/Why.** Storms are mechanically loud but visually silent; cosy
rain is in the art brief.
**Design.** Rain streak particle pass + darker grade when wind>0.7;
distant lightning flicker during named storms; puddle shimmer on roads
(subtle).
**Build.** Pixi particle container driven by `weather` in `animate()`;
capped particle count for mobile; respects reduced-motion.
**Verify.** Screenshot under staged storm weather; FPS budget check.

### 43. Construction sites on building plants
**What/Why.** "Under construction" is one static sprite; visible cranes
and progress sell the instant-award → construction arc.
**Design.** Construction sprite gains a crane that slews slowly, fencing
that shrinks as `liveAtMin` approaches, dust puffs on completion + the
existing pulse.
**Build.** `constructionTile` variants by progress quartile (chooser by
remaining time); crane slew = small rotor-style animation hook.
**Verify.** Preview at three progress stages.

### ~~44. Seasonal field art~~ — SHIPPED (Wave 6 beauty lane; summary in TASKS.md)
**What/Why.** With item 5's seasons, the countryside should agree:
harvest golds in autumn, bare ploughs and frost in winter.
**Design.** Crop tints shift by calendar quarter; snow dusting on a
cold-snap event; trees bare in winter (tint, not new sprites, v1).
**Build.** `tileChooser` ground tint modulated by season (the repaint
path exists via `applyGrowth`'s repaintTile — add a season repaint at
quarter boundaries; cost is one repaint per quarter).
**Verify.** Previews per quarter; performance check on repaint.

### 45. Daily challenge
**What/Why.** A shared seed + fixed duration creates the social loop
("lowest bill at 100% supply") with zero netcode.
**Design.** Menu tile: today's seed, 5 game-years cap, submit at end;
board shows today's top 50 (existing leaderboard infra).
**Build.** Seed from date (UTC); a challenge flag locks the seed +
period; leaderboard table gains challenge key (Supabase migration).
**Verify.** Unit determinism (item 22); e2e submit path mocked.

### 46. Achievements
**What/Why.** Badges mark the arcs the sim already produces (first GW,
all-green hour, storm with zero CML, £100/home DUoS) — cheap delight +
goals beyond RIIO.
**Design.** ~20 achievements with toasts + a trophy page; synced to
profile when signed in.
**Build.** Predicate list over snapshots in the client (like goals,
item 6 shares the engine); Supabase table optional v2.
**Verify.** Unit predicates; e2e one staged unlock toast.

### 47. Timelapse export
**What/Why.** Players sharing their network's growth is free marketing
and a lovely payoff for long campaigns.
**Design.** "Timelapse" in settings: renders N keyframes from the
autosave history (or growth records + asset history) into an animated
GIF/WebM of the map filling with light.
**Build.** Needs periodic state thumbnails: piggyback item 34's
thumbnail generator, store ring of 60; encode client-side
(gif.js-style or WebCodecs); heavy → run in a worker.
**Verify.** Manual artifact inspection; size cap.

### 48. Photo mode
**What/Why.** The art deserves clean captures; players ask for it the
moment landmarks look good.
**Design.** `P`: hides chrome, optional higher zoom cap + tilt-shift
vignette, watermark toggle, PNG download at 2× resolution.
**Build.** UI visibility flag; renderer `app.renderer.extract` to
canvas → blob download; temporary resolution bump.
**Verify.** e2e: file downloads with expected dimensions.

### 49. Bundle slimming & boot perf
**What/Why.** The single chunk tops 500 kB and mobile first-boot pays
it; the atlas cache made boots fast — JS should follow.
**Design/Build.** Code-split menu vs game (dynamic import of
PixiJS-heavy renderer after menu), defer Supabase client, audio module
lazy-init on first interaction; build.rollupOptions manualChunks for
pixi. Measure with the existing build output + a boot-time mark logged
in dev.
**Verify.** Build chunk report < 300 kB initial; boot mark improves;
full e2e green (no behaviour change).

### 50. Leaderboard integrity (deterministic replay)
**What/Why.** Scores are client-trusted; one curious dev tool user ends
the leaderboard. Determinism (already doctrine) makes validation
possible: submit seed + command log, replay server-side or spot-check.
**Design.** Submissions carry seed + compressed command log; a Supabase
edge function replays headless sim (the pure TS sim runs in Deno) and
verifies the claimed KPIs within tolerance before accepting.
**Build.** Worker already journals commands implicitly (undo labels,
item 27 formalises); add a session command log ring + export; edge
function bundles `src/sim` (it is dependency-free by doctrine);
tolerance handling for float drift (deterministic, so exact match
expected).
**Verify.** Unit: replay of a logged session reproduces KPIs exactly;
tampered log rejected.

---

*Maintenance note: when an item ships, move its summary into TASKS.md's
Done section and strike it here with a link to the PR.*

---

## Owner additions (2026-06-12 evening) — items 51–55

### 51. The Night the Grid Vanished (story opening) — Tier 1
**What/Why.** "It's unusual to start a grid from scratch" — the owner is
right that the premise needs fiction. A framed opening converts the
blank map from an oddity into a mystery and gives year one a mandate:
*All grid infrastructure was wiped out overnight. A mighty strange
occurrence. Rebuild it as fast as you can.* It also creates the perfect
home for the goal ladder and the first RIIO targets.
**Design.** New game opens with a short letterboxed sequence (3–4 beats,
skippable): the dark map at night → news ticker fragments ("…no fault
recorded… every tower simply gone…") → an Ofgem letter on screen: "We
have approved £X of allowed revenue for your first year. We expect CML
below Y by the time year 2 begins. The lights are your problem now."
X and Y become VISIBLE commitments: a year-1 allowance tracker on the
bill panel (spend over it and the regulator grumbles + composite dings)
and the CML target wired as the first period's headline KPI. Mystery
beats drip through the ambient news across the campaign (sightings,
inquiries, a select committee) — flavour now, sequel hook later.
**Build.** `scenario/story.ts`: beat list + a letter component (reuses
the report-card panel styling); seeded into newGame; allowance =
soft-budget state (capexYrK YTD vs allowance, event + RIIO composite
nudge on breach — no hard fail, per the no-bankruptcy doctrine);
`initialTargets()` already exists — the letter just NAMES the numbers.
Ticker fragments ride `maybeAmbientNews` with a story flag. Goal ladder
(item 6) gets re-skinned as the "Rebuild Directive" checklist.
**Verify.** e2e: opening shows once, skip works, allowance tracker
renders; unit: breach event fires when YTD capex exceeds allowance;
ledger of story beats deterministic.

### 52. Bill drill-down (tap a layer deeper) — Tier 1
**What/Why.** "Why are constraints costing £50m a year?" The bill is
the score, but every line is a black box. One more layer — which
assets, which counterparties, which hours — turns each cost into a
lead the player can act on.
**Design.** Every line on the bill panel becomes tappable, opening a
breakdown card: **constraints** → per-generator constraint payments
(name, MWh curtailed, £, why: which corridor bound), sorted by £;
**network (DUoS)** → top assets by annuitized capex + the build that
added them; **operations** → per-asset-class O&M; **fleet/tree
cutting** → vans, policies, storm surges; **generation (PPA)** → per
plant: strike, delivered MWh, top-up £; **wholesale energy** → price
duration strip (avg/peak price, costliest hour); **innovation/
penalties** → itemised. Each row has a jump-to (pan/pin the asset, or
open Balance for the scope). Time window: this year, rolling.
**Build.** The sim mostly knows these already at the point of accrual
(dispatch knows which unit was curtailed and paid; bill.ts sums per
asset before discarding detail). Add per-category itemised
accumulators with EMA/yearly windows in state (compact: top-N rings,
not full ledgers): `state.billDetail: { constraints: Map<assetId,
{mwh, k}>, ppa: Map<assetId, {mwh, topupK}>, … }` updated where
`constraintKPerHour`/`ppaTopupKPerHour`/capex sums are produced.
Snapshot on demand (`billDetail` request like balance). UI: BillPanel
rows become buttons; detail card lists + jump-to via requestPan/
setSelected.
**Verify.** Unit: itemised sums reconcile with the line totals (±ε);
curtailment attribution matches recordCurtailed order. e2e: tap
constraints → rows render, jump-to pans.

### ~~53. The network business: directorates — Tier 2~~ — SHIPPED (Wave 7 directorates/litigation/H&S lane; summary in TASKS.md)
**What/Why.** A real DNO is an organisation, not a cursor: Connections,
Asset Management, Field Operations, Control Room, Regulation, Safety,
Finance. Representing the business gives every existing system a face,
a budget and a lever — and sets up items 54/55.
**Design.** A "Company" panel: each directorate is a card with a head
(generated name/portrait flavour), a staffing slider (FTEs → bill via
an opex line), a competence stat that grows with use, and the systems
it owns: **Connections** (study speed/quality, application SLAs — more
staff = faster offers, happier developers), **Asset Management**
(planner quality, maintenance windows, asset-health decay rate),
**Field Ops** (van efficiency, storm response multipliers), **Control
Room** (auto-reclose speed, curtailment finesse → fewer constraint £),
**Regulation** (RIIO submissions: small composite bonus, penalty
softening), **Safety** (item 55's incident rates). Understaffing
degrades the relevant mechanics gently; overstaffing wastes bill.
Directors occasionally surface choices ("Connections wants a portal:
£2m, +20% study speed").
**Build.** `src/sim/company.ts`: directorate state {ftes, competence},
serialize additive; cost into the bill's opex line; effect hooks =
multipliers consumed where each mechanic lives (study delay, planner
option count, van speed, reclose time, constraint price, composite).
Start neutral (multiplier 1.0 at default staffing) so saves and
balance hold. UI panel like Balance; events for director pitches reuse
the innovation-pitch machinery.
**Verify.** Unit: each multiplier path (e.g. Field Ops staffing halves
travel time at max, never below floor); bill line reconciles; defaults
are behaviour-neutral vs today.

### ~~54. Get sued: litigation — Tier 2~~ — SHIPPED (Wave 7 directorates/litigation/H&S lane; summary in TASKS.md)
**What/Why.** "Let's get sued." Consequence with a paper trail:
prolonged outages, breached connection offers, blighted property, a
storm mishandled — in the real world these end in claims. Litigation
turns reliability failures into narrative and a second-order cost.
**Design.** Claims spawn from causes with evidence the player
recognises: >24h CML event in a council (group action), overdue firm
connection beyond damages cap (developer suit), pylon blight beside
conservation areas (judicial review delaying a corridor: that line
can't be built/uprated for N days), an H&S incident (item 55 —
HSE/criminal flavour, biggest). Each claim arrives as an inbox item
with options: settle (£, fast, small satisfaction hit), defend (legal
directorate roll — competence-weighted; win = costs only, lose =
multiple of settling), remediate (fix the cause for a discount).
Outcomes feed the news ticker and the RIIO composite.
**Build.** `src/sim/events/litigation.ts`: claim generator keyed off
existing trackers (reliability per council, overdue applications,
blight map, incident log), seeded rolls; inbox section + commands
(settle/defend/remediate); costs to a new bill line ("claims &
settlements"); Regulation/Legal competence from item 53 as the defence
modifier (works standalone with a constant before 53 lands).
**Verify.** Unit: a staged 24h blackout produces a claim; settle/
defend/lose paths price correctly and are undo-safe; no claims under
clean operation (seeded).

### ~~55. H&S incidents — Tier 2~~ — SHIPPED (Wave 7 directorates/litigation/H&S lane; full owner model — see TASKS.md)
**What/Why.** "H&S incidents to minimise" — the most serious metric a
real utility runs on. Live wires, storm work at height, the public near
damaged kit: safety performance belongs next to CML, and it gives storm
haste a cost.
**Design.** Incident hazard accrues from exposure: crew jobs (more
during storms, more when surge contractors are in — unfamiliar crews),
live overhead faults waiting near homes (public risk while a span is
down in a populated tile), aged kit (item 15 synergy). Incidents range
near-miss → lost-time injury → serious (HSE investigation: a multi-day
work-rate penalty + likely litigation via item 54). A Safety KPI
(incidents per 100k field-hours) joins the dashboard with a RIIO-style
target; levers: a Safety directorate stand-down action after a near
miss (pause field work 12h, resets a hidden fatigue meter), slower
"safe working" storm mode (longer repairs, fewer incidents), training
spend. Tone: serious but abstract — counters and consequences, never
gore (consistent with the no-death doctrine).
**Build.** `src/sim/reliability/safety.ts`: exposure-hours accumulator
from fleet jobs (stepFleet already walks jobs), public-risk term from
outage tiles × customers, seeded incident rolls scaled by safety
competence (item 53) and the chosen work mode; state additive; events
+ inbox follow-ups for serious ones; KPI plumbing beside CI/CML;
litigation hook. Bill: training/stand-down costs to opex.
**Verify.** Unit: storm + surge crews raise incident probability
(seeded statistical), stand-down resets fatigue, safe-mode lengthens
repairs but cuts incidents; KPI math; serious incident emits a claim
when 54 is present.
