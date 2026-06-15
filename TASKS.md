# TASKS.md — the prompt ledger

**Protocol (for Claude, every session):**
1. On EVERY owner prompt: append its asks here as checkboxes FIRST, then work.
2. Mark `[x]` only after the change is implemented AND verified (tests/preview).
3. `[~]` = partial / deliberate simplification — say why. `[ ]` = open.
4. Later prompts supersede earlier ones; note supersessions instead of deleting.
5. Before ending any work session: re-read the open items; audit the diff
   against this file; commit the updated ledger with the work.

---

## Open

### 🏙 HERO FLURRY (owner, 2026-06-14 21:10 → 06-15 05:54) — IN PROGRESS
The owner's reaction to the hero work (commits ad08b36 / b550a16 / 8d8a1cc /
7d6c3d6). Later prompts supersede earlier; the through-line is "heroes must
TOWER, proportionally, each one bespoke."
- [x] **UNLOCK THE Z-CAP FOR HEROES — DONE (said 3×, most recent 05:32;
      AskUserQuestion answer: "Definitely lift the ceiling height. I want
      proportional heroes to the surrounds. The Shard towers over London so it
      should in the game. Same for London Eye / BT Tower etc. Just careful not to
      hide buildings 100% by the heroes.").** ROOT CAUSE: the sprite engine
      capped EVERY building's z by its footprint — a 1×1 canvas is CELL_H tall so
      anything above z≈160 clipped at the top (the Shard was authored at H=176,
      already clipped). Bigger footprints (swAnchorDims) bought height → the
      2×2/3×3 coupling the owner rejects. FIX: added `headroom` to Iso (taller
      canvas + all drawing shifted down so the floor stays pinned); the atlas
      AUTO-DETECTS it from the baked buffer height (no constants to thread, no
      `set()` call sites touched) and stores it on the frame; the renderer
      (paintTile + applyTrim) and the preview tool LIFT placement by it. headroom
      defaults to 0 ⇒ every existing sprite byte-identical (PROVEN: atlas + city
      crop md5 unchanged at the no-op stage). Retuned marquee heroes to tower:
      Shard z176→300, BT Tower z168→232, London Eye bigger high-riding wheel,
      the generic skyscraper heroes reworked from squat wedding-cakes into SLIM
      tall prisms (~z258), Notre-Dame flèche/towers raised (~z226). Slim
      footprints keep neighbours visible. Unit test `tests/spriteHeadroom.test.ts`
      (floor-pinning invariant + cap-exceed + atlas auto-detect); atlas stays
      3840×3829 < 4096. Design-gated: far/mid/close London crops + per-hero
      dumps. STILL TBD below: per-hero bespoke sizing, civic "marble squares",
      researched heroes, per-city palettes, the 8 new cities.
- [ ] **Per-hero SIZE is bespoke, not a blanket footprint (21:10 / 21:15):**
      "height AND width WITHIN the square — it towers over neighbours and is tall
      and wide within whatever square it stands in. 3×3 as a blanket rule won't
      always work." Each hero gets its own size considerations: Heathrow is a
      MONSTER; the Eiffel has lots of open space around it; Citibank is a
      skyscraper among skyscrapers (slim+very tall). A bridge / train station /
      airport can each be a hero.
- [ ] **Civic "marble squares" are BAD (21:15):** the grand-civic generator
      reads as flat marble blocks with an unnecessary parvis APRON. Drop the
      apron UNLESS the real hero genuinely has open space around it (Eiffel yes);
      otherwise make the building actually wider + taller WITHIN its footprint.
- [ ] **Every hero RESEARCHED + bespoke, never reused (21:19 / 23:47):** research
      each building (Wikimedia images + accurate descriptions), write a tailored
      recreate-it prompt/spec, and STORE the research (docs/landmarks/*) so future
      re-renders (better drawing skills) can reuse it. Don't share one sprite
      across heroes. London AND Paris each get up to 100 heroes; reduce the count
      for smaller cities if 100 stops making sense.
- [ ] **Per-city PALETTE + STYLE (23:47):** "you said everywhere had the same red
      brick as London — each city should have its own palette and style." (Partly
      started: commit 8d8a1cc per-city fabric — needs to actually bite per city.)
- [ ] **RENDER MAPS for a batch of cities (21:22):** New York, Sydney, Berlin,
      Shanghai, Hong Kong, Cape Town, Cairo, Athens (+ existing London, Paris).
      Geographic accuracy + per-city palette + researched heroes.

### 🛠 OSM PIPELINE BUILD (fresh env w/ egress, 2026-06-14 ~14:50) — IN PROGRESS
The fresh env HAS the OSM/Wikidata egress. Built the pipeline PROPER
(`docs/osm-pipeline.md` stages 1–5): `tools/osm/` (project · geometry ·
net+cache · nominatim · overpass · buildCityFromOsm · emitCityData) +
`tools/buildCity.ts` CLI + `tools/previewCity.ts` + `src/data/cityData.ts`
runtime loader. Validated on **real Paris OSM** → `src/data/cities/paris.ts`
(256×160, water/Seine 7.5%, graded core/urban/suburb, 200 councils, 48 named
places incl. Notre-Dame/Eiffel/Louvre/Vincennes). Unit tests: `tests/osm.test.ts`
+ `tests/cityData.test.ts`. PURELY ADDITIVE — no live London/sim change.
- [x] Density driven by REAL road-network density (urbanity field), not a
      radial guess; land-use → industrial/commercial/park; building footprints
      → CBD/tall.
- [x] **Owner flurry (2026-06-14 14:53–14:56):** "light in buildings / only
      iconic buildings / where's Notre-Dame?" → FIXED: streets stamped
      `streetTouch` (was `street`, which suppressed the building on every tile);
      only DRAWN major roads clear tiles (undrawn arterials kept buildings);
      hero landmarks get a parvis APRON so they're not occluded. Central Paris
      now reads as dense blocks; Notre-Dame visible on its island.
- [x] **PER-CITY ARCHITECTURE (owner, 2026-06-14 15:20–15:31): "Paris is very
      white and grid-like… the template is missing the core research of building
      stock + architectural styles to make the new sprites — you can't reuse from
      other cities."** RIGHT. Split the model: the OSM GEOMETRY pipeline is the
      reusable/universal layer; the ARCHITECTURE is authored per city.
      Implemented `CityMap.fabric`: (a) a per-city palette (Paris → cream
      limestone walls + grey zinc roofs; London byte-identical default); (b) a
      BESPOKE researched `haussmannTile` sprite — uniform ~6-storey pierre-de-
      taille facade, string courses, tall French windows, wrought-iron balcons
      filants, steep grey-zinc MANSARD roof with dormers + chimney stacks —
      placed on Paris's urban/urbanCore tiles via tileChooser. Central Paris now
      reads as the pale, grid-like, grey-roofed city from the references.
- [x] **Bespoke gothic NOTRE-DAME** (owner reference photos): new
      `notredameTile` landmark — twin flat-topped west towers, the great rose
      window, pointed belfry openings, steep lead nave roof, the central flèche
      spire, rounded apse + suggested flying buttresses. `LANDMARK.notredame`
      (append-only); the pipeline maps any `notre-dame` hero to it (other
      cathedrals stay the dome archetype). Placed on its island parvis at the
      centre of Paris.
- [x] **WAY MORE HEROES + DIVERSITY (owner, 2026-06-14 15:48–16:10): "way more
      heroes, almost every building could be custom… you're using the same
      sprites everywhere in London, want rich diversity."** Delivered:
      - **Bespoke Paris heroes:** Eiffel (towering iron lattice + base arch +
        platforms), Arc de Triomphe (triumphal arch), Sacré-Cœur (white domed
        basilica), Louvre (palace wings + glass pyramid) — joining Notre-Dame.
        `LANDMARK.eiffel/arch/basilica/louvre` (append-only); pipeline maps real
        names. Hero cap 48→90 (27 heroes place in Paris).
      - **London skyline diversity:** towerTile/officeTile now take a variant
        driving colour/height/width/crown; 8 tower + 6 office variants, spread
        per-tile so neighbours differ (was 2 each → the pink monotone).
- [ ] **OPEN — even more heroes + fabric variety:** Opéra Garnier, Panthéon,
      Grand Palais, Musée d'Orsay (all in the Paris data, still archetypes);
      richer Haussmann fabric (shopfronts, corner blocks); procedural footprint
      buildings (stage 6) need bulk OSM/PBF at metro scale.
- [ ] **OPEN — live integration:** register the city as a selectable scenario
      (lazy-loaded so the 320 KB artifact doesn't bloat the bundle) + generalise
      the renderer's London couplings (labels from the map, estuary-marsh guard,
      per-scenario airports) + a city-picker UI. Needs the in-game design gate —
      kept OUT of this additive PR.

### ⭐ HANDOVER (owner, 2026-06-14 ~13:45) — read this first, then build in a FRESH env
The landmark-art arc this session, and where it's going next:
- **Tried & reverted:** an AI-raster hero-override pipeline (PR #61, then
  reverted in PR #62). Owner's call: stay **code-art**; no image model.
- **Settled direction — DON'T cap hero count.** "Search for HUNDREDS of hero
  buildings in the target city until it stops making sense" — discover
  notability from data (OSM + Wikidata/Wikipedia), don't curate. Most buildings
  render **procedurally from real OSM footprint + height**; bespoke hand-art is
  reserved for the marquee few. Current hand-coded heroes "look good enough" —
  STOP polishing art quality.
- **Next major build (in the fresh env): the OSM pipeline PROPER.** Full plan in
  **`docs/osm-pipeline.md`**. It needs egress this session doesn't have →
  **`docs/env-allowlist.md`** lists every host to allowlist (OSM Overpass/
  Nominatim/Geofabrik + Wikidata + Wikipedia/Wikimedia). Owner is creating a
  fresh env with those.
- **Method that works (proven on Parliament):** a research-backed **visual spec**
  per landmark (palette + massing/proportions + per-element shape/colour +
  critique checklist) → ultra-specific fixes. Template: `docs/landmarks/
  parliament.md`. Use the **reference-photo loop** (download a Wikimedia photo,
  view it, critique against it) once egress is open.
- **Tools added:** `tools/landmarkSheet.ts` (`→ preview/landmarks.png`, a contact
  sheet of all London heroes for at-a-glance review).
- [x] **Parliament redrawn from a reference photo + spec** (3 critique passes):
      continuous Perpendicular-Gothic river palace, pointed tracery, correct
      tower hierarchy (Victoria tallest/bulkiest, slimmer Big Ben with the clock
      at ~58% height + deep Prussian-blue surround, needle central spire),
      floodlit ground arcade, dark slate roofs, 4-storey façade (~4:1 ratio).
- [ ] **OSM pipeline (fresh env):** build per `docs/osm-pipeline.md` —
      Overpass/Nominatim fetch → project to tile grid → derive water/road/zone
      layers → discover & rank notable buildings (Wikidata/Wikipedia) → procedural
      `footprintTile()` from footprint+height → bespoke sprites for the top tier.
      Validate on London first, then any city. Credit "© OpenStreetMap contributors".

- [x] **AUTH BUG (owner, 2026-06-14 06:37): "created account → check email →
      nothing; should auto sign-in; login didn't work."** Diagnosed against
      the DB: the account already existed (created 2026-06-13, has a
      password, confirmed, signed in once). Today's "create account" was a
      duplicate-email sign-up — Supabase's anti-enumeration returns NO
      session and sends NO email, which our code misreported as "check your
      email". FIXES: (a) code — `signUpWithPassword` now detects the
      empty-`identities` duplicate-email response and returns "that email
      already has an account — sign in instead"; (b) reset the owner's
      password to a temporary value so they can log in now (told to change
      it). Auto-sign-in-on-signup already works for a NEW email once "Confirm
      email" is OFF (owner dashboard action — see security-audit.md).
- [x] **SECURITY CHECK (owner, 2026-06-14 06:31): Supabase + game pen-test.**
      Full audit in `docs/security-audit.md`. RLS sound on all 5 tables; no
      service-role key / secrets committed; no XSS sinks; `window.__ec` debug
      hook stripped from prod. Added missing security response headers
      (`vercel.json`: nosniff, X-Frame-Options DENY, Referrer-Policy,
      Permissions-Policy, HSTS). Findings: leaderboard scores client-trusted
      (MEDIUM, known v1 trade-off → server-side validate later); username
      format CHECK + leaked-password protection + CSP recommended.

- [ ] **REUSABLE CITY TEMPLATE / schema (owner, 2026-06-14 06:28): "make a
      reusable template for cities where you have to find the appropriate
      things."** Turn city authoring from a bespoke ~600-line builder into a
      declarative `CitySpec` + a shared `buildCity(spec)` engine. The spec
      enumerates the feature categories to fill in per city: water (rivers w/
      control-points + half-width + islands, coast/sea edge, beaches, lakes,
      canals), terrain/biome (temperate/desert/tropical → tints + vegetation,
      hills, forests), urban form (density field params, radial corridors,
      CBD/posh/industrial districts, no-green-belt flag), councils, towns/
      banlieue, parks, generation sites (solar/wind/nuclear/hydro), transport
      (road polylines, ring roads, rail, metro), AIRPORTS, train STATIONS,
      DOCKS/ports, significant non-electrical infrastructure, landmarks
      (bespoke architecture + positions), named places, and the country
      operating-model profiles (market/regulator/economy/weather). London
      stays bespoke (the reference, too many special cases); Paris is the
      first CitySpec-driven city; Sydney/HK/Rio become fill-in-the-template.
- [x] **Paris airports (owner, 2026-06-14): Charles de Gaulle (NE/Roissy) +
      Orly (S)** — added as PARIS_AIRPORTS w/ cleared airfields, runways,
      named places.
- [~] **BASELOAD does NOT fit build-from-scratch (owner, 2026-06-14 06:25).**
      Correct — nothing shipped pre-seeds plant; the MarketProfile models the
      surrounding national IMPORT market, not player generation. ACTION: drop
      the inert `baseloadFloor`/`hydroDriven` GenerationModel hooks so the
      model can't drift toward pre-built baseload; country generation
      character comes via imports + the TENDERS offered + the carbon/price
      benchmark only.

- [ ] **COUNTRY-SPECIFIC OPERATING MODELS (owner, 2026-06-14 05:53): "the
      major other element required… learn the differences and have them
      affect the gameplay."** The CityScenario v2 seams already exist
      (power/economy/generation/regulator/weatherProfile blocks, all
      defaulting to GB). Research each country's REAL operating model and
      wire genuine, gameplay-affecting differences through those seams:
      - **France (Paris):** Enedis DSO monopoly + RTE; ~70% NUCLEAR baseload
        (very low carbon floor, inflexible → curtails renewables); CRE /
        TURPE cost-of-service tariff (not RIIO incentives); EUR; 50 Hz.
      - **Australia (Sydney):** NEM + AEMO; AER revenue-cap building-block;
        world-leading ROOFTOP PV (duck curve, midday min-demand / negative
        prices, voltage-rise) + coal→battery transition; SUMMER-peaking
        (aircon, flips the season model); bushfire fault season; AUD; 50 Hz.
      - **Hong Kong:** VERTICALLY INTEGRATED (CLP / HK Electric own gen — no
        tender market); Scheme-of-Control rate-of-return on ASSETS (capex
        earns return → different scoring); near-all-UNDERGROUND, world-best
        reliability target; TYPHOON disasters; HKD; 50 Hz.
      - **Brazil (Rio):** ONS/ANEEL concessions; ~60% HYDRO (drought → price
        spikes + bandeira tariff flags); NON-TECHNICAL LOSSES / theft
        ("gatos") mechanic; DEC/FEC quality penalties; flooding/landslides on
        the morros; BRL; **60 Hz**.
      Sequence: (A) research + implement the operating-model PROFILES + the
      gameplay wiring + unit tests proving each difference bites; (B) pair
      each with its geographic map.
  - [x] **Part 1 — national wholesale MARKET is per-country profile data**
        (`MarketProfile` in powerProfile.ts, threaded through dispatch's
        `nationalPriceMWh`/`K`). GB stays bit-identical (golden test over a
        year × every hour × dunkelflaute). Four researched national shapes
        ship: France low/flat nuclear floor (~20 g); Australia rooftop-PV
        duck curve → NEGATIVE midday + heatwave spikes (~445 g); Hong Kong
        high/stable gas (~590 g); Brazil hydro with dry-season drought
        uplift / bandeira (~110 g, 60 Hz). Affects import bills, battery
        arbitrage, the live price ticker. Sources: HK SoC 8% RoR; AU NEM
        46% SA intervals negative-priced Q4'25; Brazil bandeira flags;
        ElectricityMaps/RTE/Ember carbon intensities.
  - [x] **Part 2a — per-country REGULATOR weighting.** The report card's
        KPI weights are now profile-resolvable (`resolveWeights` merges +
        renormalises a regulator's `kpiWeights` over the GB base;
        `closePeriod` takes them; tick threads `ctx.profile.regulator`).
        London bit-identical (no override → same base object). Four national
        regulators ship: CRE (carbon pared back → bills/service), AER
        (affordability + PV-hosting/curtailment), Scheme of Control
        (reliability dominates), ANEEL (DEC/FEC + affordability). Test: the
        same network scores differently under HK vs Ofgem vs AER.
  - [ ] Part 2b — grid carbon (`gridCarbonG`) into the carbon KPI / import
        carbon; regulator `model` framing text in the report-card UI;
        `baseloadFloor`/`hydroDriven` into dispatch; `ownership: 'owned'`
        (HK, already in bill.ts) end-to-end. Per-country tender flow
        (France nuclear offers, AU solar/battery, HK no-tender).

- [ ] **MULTI-CITY GEOGRAPHIC MAPS (owner, 2026-06-14 05:07): Paris, Sydney,
      Hong Kong, Rio — geographic accuracy first (rivers/coastlines/roads in
      the right places, hero landmarks in true relative positions, correct
      tile scale). "Have a go at all… we can recreate in future if needed —
      apply London's design principles." Paris first (Seine through the
      middle + Île de la Cité, Périphérique ring, Étoile/Arc with radiating
      avenues + Champs-Élysées, 20 arrondissement councils, Bois de
      Boulogne/Vincennes, Montmartre/Sacré-Cœur hill, La Défense CBD).
      Design-gated per CLAUDE.md. Pairs with the operating models above.

- [x] **NAME the storms that come through (owner, 2026-06-14 05:35).** DONE.
      `STORM_NAMES`/`stormName` now live on the regime authority
      (events/weather.ts); a storm regime stamps `weather.activeStormName`
      the moment it opens (keyed off the window start, so it equals the
      forecast name). The arrival banner, the line-down FAULT labels
      (`Storm Bram brings down the 132 kV line`) and a new named clearance
      notice (`Storm Bram clears the region — crews stand down`) all read
      that one stamped name. Additive on saves (self-heals; no version bump).
      Unit test: forecast = arrival = fault label = clearance, all one name.

- [ ] **BIG FLURRY (owner, 2026-06-14 05:07): "have a go at all of them".**
  - [ ] **Place labels too BOLD/LOUD** — make the map town/landmark labels
        FAR more subtle (lighter weight, lower contrast, less shout).
  - [ ] **MULTI-CITY with geographic-representation ACCURACY** (cities ARE
        wanted now; supersedes the earlier "defer cities"). Apply London's
        design principles. Per-city the rivers / coastlines / roads /
        bridges / landmarks must be GEOGRAPHICALLY ACCURATE + correctly
        scaled (tile counts):
        - **Paris**: the Seine through the middle (accurate), accurate
          roads — e.g. the big roundabout (Arc de Triomphe / Étoile with
          radiating avenues), bridges in the correct places.
        - **Sydney**: coastline both sides of the harbour, the Harbour
          Bridge + Opera House, appropriately scaled, correct tile count.
        - **Hong Kong**: the island + harbour/ships captured correctly.
        - **Rio de Janeiro**: ELEVATION (mountains) — represent a mountain
          top with Christ the Redeemer on top.
        - Research the top landmarks/buildings per city so they feel real.
        - (owner: "we can recreate other cities in the future if we need" —
          don't over-perfect; a genuine accurate attempt + framework.)
  - [ ] **Supabase / AUTH email (owner authorizes: "make whatever Supabase
        tables you need, do whatever you need on Supabase").** The thing he
        REALLY wants: BRAND the auth emails + make the reset/confirm link
        land on a STYLED feedback page, NOT a 404. So: configure Supabase
        (Site-URL, the branded email templates already in supabase/templates),
        and add an in-app auth-callback page (password-reset form / "email
        confirmed" / magic-link landing) so clicking the email gives real
        feedback. Also create any tables needed (e.g. cloud rank-sync).
  - [ ] **REGULATORY ASSET VALUE (RAV) + revenue / incentives (price
        controls, reasonably accurate, don't over-confuse).** A RAV that
        starts at ZERO and BUILDS UP as the network grows; it influences the
        totex SHARING factors. Consider a REVENUE line for a proper monetary
        representation, and represent the regulatory INCENTIVES. Phase it in
        ONCE the network is up and running (not day 1) — as load shifts /
        new applications start to stress/break things.

- [ ] **SEVERE-WEATHER REALISM v2 (owner, 2026-06-14 03:40 — network ops
      domain detail; refines the PR #47 alert).**
  - [ ] **7-DAY notice**: severe storms are usually forecast ~7 days out
        (not 3). Extend the warning/ETA window to ~7d and let the player
        prepare over that lead time.
  - [ ] **Met Office hazard BRANDING**: yellow / amber / red warning
        levels (the "hazardous yellow" experience), severity → warning
        colour. Brand the alert + indicators by warning level.
  - [ ] **Gusts in km/h**: severity must read as real windspeeds in km/h
        (research typical GB/named-storm gusts + the Met Office warning
        thresholds, and map severity → km/h). Replace the abstract "%
        gusts".
  - [ ] **"System prepare" REAL levers (sim + economy):** model what a DNO
        actually does on a system-prepare:
        - **Scale up SHIFTS** for coverage in the worst-affected areas.
        - **Storm ROLES / activate SCOUTS** — regular office staff drive
          the lines to check assets (eyes on the network).
        - **WIDER CALL HANDLING** — office staff become call handlers
          during the call surge. Target: **call response < 5 s by a real
          person**. Understaffing the call centre during a surge →
          NEGATIVE CSAT. It's a combination of investment in staff,
          investment in training, and investment in wider call handling
          during surges. Needs a call-response/CSAT model + the levers as
          commands, with cost → bill and a payoff in CSAT/restoration.

- [x] **MOBILE LANDSCAPE LAYOUT OVERHAUL (owner, 2026-06-13 20:42, real
      Pro Max landscape screenshot).** — DONE (PR #42): accurate Pro Max +
      safe-area repro (`e2e/mobileaudit.helper.spec.ts`); de-conflicted the
      top band (BUILDING label → top-left by the rail); fave/photo +
      minimap are desktop-only (were covering the right panel / the date);
      `viewport-fit=cover` + `--sai-*` safe-area vars on every edge element
      (the fat margins were the whole viewport being inset). Verified on the
      repro at desktop + Pro Max landscape.
- [x] **ASSET ENCYCLOPEDIA** — DONE (PR #43): `assetGuide.ts` (every build
      option, GB-accurate what/does/when + live-from-catalog stats) +
      `AssetGuide.tsx` browsable dusk modal with the code-drawn icons; ⓘ
      entry points in the palette + mobile rail, deep-linking the armed
      tool. Design-gated (desktop index + expanded capbank + phone).
- [x] **m5 BILL CLARITY** — DONE (PR #44): the network (DUoS) charge — the
      bit the operator controls + the report cards grade — is now a
      prominent bordered chip distinct from the (mostly-wholesale-energy)
      total headline, so the £-total no longer reads as the score.
      STILL OPEN (owner steer): whether the TOTAL itself is too high for a
      tiny town is a sim-tuning question, not retuned blind.

- [ ] **FAVOUR LOGGING IN (owner, 2026-06-13 14:28): with ranks +
      city unlocks, login matters more.** Direction: GUEST play stays
      fully fine for LONDON sandbox + TUTORIALS (localStorage). But
      PROGRESSION — rank/accolades/unlocked cities/per-city leaderboards
      — needs an account, so favour signing in:
  - [ ] Make login SOLID first (the "login didn't work" bug): the
        Supabase Site-URL fix (already logged) + a styled auth callback
        + verify the OTP/magic-link round-trip end to end.
  - [ ] Gate progression behind (or strongly tied to) an account: rank,
        accolades, city unlocks and cross-device sync require login;
        guest can still play London + tutorials but sees their progress
        is local-only with a clear, friendly "sign in to keep your rank
        & unlock cities across devices" prompt at the right moments
        (first rank-up, first city-unlock offer, period report card).
  - [ ] Surface the BENEFIT prominently (start menu NETWORK ACCESS
        block + an inline prompt), not a hard wall — never block the
        core London/tutorial play. Aligns with docs/multi-city-and-rank.md
        P5 (the `progression` Supabase table + guest→login merge).

- [ ] **TUTORIAL OVERHAUL + PLAYTEST FLURRY 2 (owner, 2026-06-13 ~13:40,
      full 5-tutorial playthrough + screenshot). HUGE — spans several
      waves.**
  - [~] **Tutorials REPLACE campaign**: clicking "tutorials" opens a
        LESSONS PAGE listing every lesson, what it teaches, lock state,
        and a 0/1/2/3-STAR rating. — DONE (Wave 16): LessonsPage.tsx +
        lessonProgress.ts (computeStars: completion + no-overload +
        lean/under-target), StartMenu rewired, stars recorded at win in
        workerBridge. STILL TODO: many MORE lessons beyond the 5.
  - [~] **GUIDED-PLAY SPOTLIGHT (core)**: darken everything except the
        step's target control and ring it. — DONE (Wave 16): Spotlight.tsx
        (data-spot anchors on every palette button + inbox/bill/headroom/
        fleet); MissionStep.spot drives it; pure-visual (clicks pass
        through). STILL TODO: highlight suitable LAND after a click (needs
        renderer tile projection); event bubbles on awards/bids/alerts.
  - [~] **During tutorials**: NO "skip tutorial" option — DONE (Wave 16:
        replaced with ◂back / next▸ step nav + a "finish tutorial ✓" on
        the last tile; notes minimise to a recallable pill). STILL TODO:
        PREVENT unrelated applications spawning; HIDE the templates/extra
        HUD bits the lesson isn't using.
  - [ ] **T1 First Light** (onshore wind): spotlight the Onshore-wind
        button → then suitable land. Allow only ONE wind facility.
        CAPACITY PICKER: scroll / +– to set MW (don't force 100 MW for
        Aldbrook — ask ~15 MW; user adjusts). Explain sizing (bigger
        install = more network; find the sweet spot) + show a rough
        "powers ~N homes" estimate beside the capacity + introduce
        standing-charge aims. Make them actually click ▶▶▶; when a bid
        lands, show it, then tell them to click ▶▶7d to gather all bids.
        TEACH a bid: all offer the same 100 MW unit but differ on £ —
        the energy £/MWh (white) goes on customers' ENERGY bill; the
        curtail £ is compensation you pay if you cut them, landing on
        the STANDING-CHARGE part — lower is better on both. Step 5/6
        wording: replace "arm the 33 kV line" with plain language ("this
        wind farm has a 33 kV connection, so run 33 kV circuits from the
        turbines to the distribution substation so power can flow").
        Teach: after placing a line the 33 kV tool STAYS armed for the
        next click; to end a line, hit Esc / pick another tool / click
        the same connection point twice (VERIFY click-same-point-twice
        works). Then inspect the turbine to see its connection voltage.
        Teach demolish line+dist-sub, turn AUTO-CONNECT on (needs a
        HOTKEY), re-place the dist sub to auto-connect. FOOTPRINT BUG:
        the wind farm sits on its single auctioned tile but turbines
        bleed out of it — the 33 kV circuit must be clickable to ANY
        tile the farm now occupies. Don't end on connect — let them
        watch power flow; a "finish tutorial" button on the 6/6 tile.
        Confusion: dist sub is 33 kV/LV immediately → add a PRIOR lesson
        teaching BSP / grid site / dist site + the voltage levels.
  - [ ] **T2 Step Up**: 2nd-pane wording weird ("Try a 33 kV line…") →
        have them INSPECT the offshore unit to learn its kV instead.
        The "BUILDING Offshore Wind" top label blocks the tutorial
        notes → let the tutorial notes DOMINATE more and hide as steps
        execute (recallable). Teach UNDERGROUND cables (happier locals,
        less coastline interference).
  - [ ] **T3 Storm**: step 1/5 text hard, drop "already wired" — clearer
        for beginners. HIGHLIGHT the incoming alert. PAUSE the clock on
        major alerts until dismissed (player idled through a storm that
        restored unseen — need prep time). Better SEVERE-weather
        indicators: subtle rain/wind/heat-mirage screen effects, clearly
        distinct from regular weather; severe weather = a fun "emergency
        system prepare" phase where the day slows down (a ~2-min
        experience for that day; player can speed up; levers to improve
        outcomes e.g. extra vans on temporary standby). After the depot,
        have the player raise vans 0→1 and SEE the van leave the depot
        and attend the fault. End the lesson at the end of a
        system-prepare stage. Introduce CI & CML here.
  - [ ] **T4 Inbox**: side-by-side VISUAL comparison of firm vs
        flexible; explain what the study message means; don't end until
        the site is BUILT. Introduce CUSTOMER SATISFACTION; an on-time
        new connection = 100% satisfaction.
  - [ ] **T5 Bill**: reword "capital is unlimited" → "The network
        operator can elect any solution they see fit within the
        allowances set by The Regulator — but every pound lands on
        customer bills." Headroom toggle did NOTHING (BUG — diagnosed by
        the UI-FIX lane 2026-06-13: store/bridge/MapView wiring is CORRECT;
        the render-side `setOverlay` redraws catchment circles but NOT the
        line recolour — see the lane entry below for the exact render fix).
        Allow
        skipping a mission step forward/backward. Teach scroll-to-size a
        dist sub to cover the whole town at once; teach REINFORCING an
        existing sub (inspect → increase, cheaper than new build); place
        a new application just outside range and connect it by
        reinforcing the sub's catchment. Opening bill was sky-high —
        rebalance (mission "completed" at £333/yr — sense-check targets).

- [ ] **GAME/UX BUGS from the flurry (owner, 2026-06-13):**
  - [x] FOOTPRINT: tile size must be pre-determined/reserved — could
        place side-by-side bids that EXPLODED OUT on award (overlap).
        Reserve the footprint at designation so awards can't collide.
        — VERIFIED (SIM/RENDER-FIX lane, 2026-06-13)
  - [x] GRAPHICS: wind turbine not centred on the hub mast (screenshot —
        blades offset from the mast); blades don't appear while placing.
        Fix the rotor offset + show blades on the ghost/placement.
        — VERIFIED (SIM/RENDER-FIX lane, 2026-06-13)
  - [x] ESCAPE menu: Esc (when NOT cancelling a line build) opens a menu
        → Save / Quit to main menu; clicking "ELECTRICITY" top-left
        opens the same pane. — VERIFIED (UI-FIX lane, 2026-06-13)
  - [ ] LOGIN didn't really work (investigate auth/sign-in flow end to
        end — ties to the Supabase Site-URL fix already logged).
  - [x] SNOOZE: 1 hour is pointless (a second passes an hour) → snooze
        ~2 days. — VERIFIED (UI-FIX lane, 2026-06-13: SNOOZE_MIN = 2 game-days)
  - [ ] SEVERE-WEATHER ALERT: pop the really damaging ones to the MIDDLE
        of screen to dismiss, with a weather MAP showing the hurricane
        bearing down on London.
  - [ ] VANS ON THE MAP: actually SEE orange/white vans leave the depot
        and attend faults (count = player's van number); vans return to
        a depot between repairs; follow ROADS where possible, else move
        orthogonally through building-free tiles.
  - [ ] CONNECTIONS: an application out of reach of any kit should give
        the network MONEY to build out the cables (per the study) — do
        NOT penalise the operator for new connections.
  - [x] HUD OVERLAP: the map overlay interrupts the finance/bill panel;
        HUD panes overlap so you can't upgrade a substation (messages in
        the way). Fix the layout/z-order so panels never block controls.
        — VERIFIED (UI-FIX lane, 2026-06-13)
  - [~] SUBSTATION SIZING: MVA size scrollable / +– when selected to
        build (and when reinforcing). — REINFORCING done (UI-FIX lane,
        2026-06-13: InfoPanel MvaControls is now a scroll/slider/± picker).
        The BUILD-time ± picker is the concurrent BuildPalette lane's
        subSizeMva work (store flag landed: subSizeMva).

### UI-FIX lane — HUD overlap · escape menu · snooze · headroom · MVA reinforce (owner playtest, 2026-06-13) — [x] VERIFIED
- [x] **HUD OVERLAP / z-order.** Audited the absolute-positioned right-rail
      panes. Two concrete collisions fixed: (1) the pinned InfoPanel
      inspector card now rides at `zIndex: 8` with `maxHeight: calc(100vh -
      52px)` + inner scroll, so a tall substation card's upgrade/reinforce/
      demolish buttons are ALWAYS reachable and never sit behind the alerts
      feed (the owner's "can't upgrade — messages in the way"); the
      AlertsFeed dropped to `zIndex: 4` and the BillPanel to `zIndex: 4`
      (trend-open lifts to 6) so the inspector wins the stack. (2) the
      "map overlay interrupts the finance/bill panel": the **Minimap** sat
      at `bottom:12 right:12` — exactly on the BillPanel — so it was moved
      to the bottom-LEFT (collapsed + open), and the StatusBar hint lifted
      to `bottom:160` to clear it. BillPanel also gained a `maxHeight`+scroll
      so it can't grow up into the alerts feed on a short desktop.
      (src/ui/InfoPanel.tsx, AlertsFeed.tsx, BillPanel.tsx, Minimap.tsx,
      src/app/App.tsx.)
- [x] **ESCAPE → in-game MENU + ELECTRICITY wordmark.** New
      src/ui/GameMenu.tsx (lofi dusk modal): Save game (a manual autosave via
      the new `requestSave()` bridge → worker `requestSave` → localStorage +
      cloud) and Quit to main menu (saves, then `setMenuOpen(true)` back to
      the StartMenu). Store flag `gameMenuOpen` + `setGameMenuOpen` (additive,
      tight-anchored). App.tsx keyboard handler: Esc still cancels a line
      build / clears a selection / disarms a non-inspect tool FIRST (existing
      behaviour preserved); only when there is nothing to cancel and not at
      the start menu does it open the pause menu. The wordmark became a
      button opening the same menu. Esc also closes the menu; build hotkeys +
      Ctrl+Z/Y are swallowed while it's open.
- [x] **SNOOZE → 2 game-days.** AlertsFeed `SNOOZE_MIN` 60 → 2·24·60; both
      feed + event-log snooze buttons relabelled "Snooze 2 days". (eventLog
      test uses explicit minutes, unaffected.)
- [x] **HEADROOM TOGGLE — DIAGNOSED (my side fixed/correct; render fix noted
      for the integrator).** Traced Hud HeadroomButton → `setHeadroom` (store)
      → MapView effect `setOverlay(headroom ? 'headroom' : 'none')` →
      MapRenderer. ALL of that (store flag, MapView wiring, the requestForecast
      path) is CORRECT and is on my side — nothing to fix there. The break is
      purely in the renderer (the other lane's src/render/MapRenderer.ts):
      `setOverlay()` (≈line 626) calls only `this.drawCatchments()`. The
      headroom LINE recolour lives in `drawLines()` (≈line 2449,
      `overlayMode === 'headroom'`), which is NOT re-run on toggle — it only
      refreshes on the next snapshot. So toggling headroom redraws the faint
      catchment circles (alpha 0.16 — barely visible on a sparse early grid)
      but the corridors don't recolour until a tick lands → reads as "nothing
      happened". EXACT RENDER FIX for the integrator: make `setOverlay()` also
      rebuild the network from the cached last frame, exactly as `setCbMode()`
      already does at ≈line 735 —
        ```
        setOverlay(mode): void {
          this.overlayMode = mode;
          this.drawCatchments();
          if (this.lastAssets.length > 0) {
            const byId = new Map<number, PlacedAsset>();
            for (const a of this.lastAssets) byId.set(a.id, a);
            this.drawLines(this.lastAssets, this.lastBranches, byId);
          }
        }
        ```
      (optional polish: lift the catchment fill alpha from 0.16 so the
      heatmap reads on a light grid). I did NOT edit render per lane rules.
- [x] **MVA REINFORCE picker (T5).** InfoPanel `MvaControls` (the pinned-card
      sub control) reworked from a cramped `− N + auto` row into a clear
      REINFORCEMENT sizer: a range SLIDER (drag) + ± buttons + scroll-wheel
      over the control to step the fixed MVA sizes, the live `N MVA` readout,
      an `auto ✓` toggle, and a "min–max MVA · bigger = wider catchment,
      cheaper than a new sub" caption — so the player can size up an existing
      sub to cover a whole town from the top-right pane. Drives the existing
      `setSubMva` command (no sim change). Also surfaced in the mobile
      bottom-sheet (MobileInspector → AssetInfo).
- [x] SHARED store.ts: additive only (`gameMenuOpen`/`setGameMenuOpen`),
      merged cleanly alongside the concurrent lane's `genSizeMw`/`subSizeMva`
      additions — neither lane's edits reverted.
- [x] VERIFIED: `npx tsc -b` clean; `npx eslint src tests e2e tools` clean;
      `npm run build` clean; `npx vitest run` — all UI/store/bridge changes
      green (the only reds are the concurrent SIM lane's in-flight
      footprint-reservation tests in commands.ts/developers.ts/footprints.ts,
      NOT this lane). `npx playwright test e2e/app.spec.ts e2e/controls.spec.ts`
      fresh-server green. DESIGN GATE (preview/w15ui-*.png at desktop 1280×800
      AND phone-landscape 844×390): HUD with inspector+bill+alerts open (no
      overlap, sub upgrade/MVA controls reachable), the game menu, and the MVA
      reinforce picker — all read cleanly on both.

### SIM/RENDER-FIX lane — footprint reservation · capacity picker · wind rotor (owner playtest bugs, 2026-06-13) — [x] VERIFIED
- [x] **FOOTPRINT RESERVATION** — a generation DESIGNATION now RESERVES its
      eventual footprint the moment the tender opens, so side-by-side bids can
      no longer "explode out" on award. `Tender.reserved:number[]` holds the
      plot (the full `fitMW` farm claim, or the fixed catalog rect), surveyed
      WALLING OFF every other open tender's reservation + placed assets/pylons
      (`reservedTiles()` + `reservationFootprint()` in
      developers.ts/commands.ts; `farmTileOrder/farmFitMW/farmClaimTiles` gained
      an optional `taken` set so the BFS never grows through held ground).
      `checkBuild` takes the reserved set and rejects a build on a reserved
      tile ("a designated generation site is reserved here"). The AWARD lands on
      exactly the reserved tiles: it caps MW to the free prefix of the held plot
      and STAMPS the exact tile list on `GenAsset.claim`, which `footprintTiles`
      uses verbatim (no re-derivation drift). Re-validation at award excludes the
      tender's OWN reservation. `growTown` already avoids `footprintTiles`, so a
      stored claim is never re-zoned. Additive — no SAVE_VERSION bump (reserved/
      claim are optional fields; old saves fall back to the pure derivation).
- [x] **ANY-TILE CONNECTION** — `assetAtTile` gained an optional `map`: for a
      capacity-scaled farm it tests the whole DERIVED claim, so a 33 kV line
      endpoint / inspect / tee lands on ANY tile the farm occupies, not just its
      anchor (owner: "I should be able to click the circuit to any tile the farm
      occupies"). `checkBuild`'s line path + MapView's clicks/picks pass the map.
- [x] **CAPACITY PICKER** — BuildPalette shows a ± / scroll MW stepper when an
      onshore-wind (or other farm) tool is armed, default modest (wind 15 MW),
      with a live "powers ~N homes" estimate (`homesPowered` off per-tech load
      factors) + a "reserves ~N tiles · bigger installs need more network — find
      the sweet spot" caption. The chosen MW (`store.genSizeMw`, tight-anchored)
      flows into the designate `BuildSpec.mw` → caps the tender `fitMW` + the
      reserved footprint. Also a ± MVA stepper when BUILDING a substation
      (`store.subSizeMva` → `BuildSpec.mva`, fits the transformer + switches auto
      off); the reinforce-existing case is the UI lane's. Ghost previews the
      reserved farm plot (exact claimed tiles) with blade ghosts.
- [x] **WIND ROTOR centring + ghost blades** — the live rotor sat a hub-height
      too LOW and to the right: `addWindRotors` was adding the sprite TRIM
      (`frameOffset`) on top of the untrimmed hub pixel, double-counting it
      (`drawBloom` never did). Dropped the trim term in `addWindRotors`; rotor
      now sits dead-centre on the mast hub. `windHubOffset` lost its
      `+0.012/-0.012` u/v skew (now on the mast axis) and the turbine sprite's
      nacelle is symmetric about (u,v). The PLACEMENT GHOST now draws faint
      blade ghosts on each turbine tile (`drawGhostBlades`) so blades show while
      placing (owner: they didn't).
- [x] SHARED store.ts: additive only (`genSizeMw`/`subSizeMva` + setters),
      tight-anchored beside `autoConnect`; coexists with the UI lane's
      `gameMenuOpen` — neither lane's edits reverted.
- [x] VERIFIED: `npx vitest run` 568 green (footprints.test.ts extended:
      reservation can't overlap, award lands on reserved, chosen-MW flows to
      tender/footprint/award, MW capped to land, homesPowered, 33 kV line to any
      farm tile; developers.test.ts updated for the reservation guard). `npx
      tsc -b` + `npx eslint src tests e2e tools` + `npm run build` clean. `npx
      playwright test e2e/build.spec.ts` 4/4 fresh-server green (the
      designate→bid→award→plant+wires flow intact; baselines unchanged). DESIGN
      GATE (preview/w15sim-*.png): ghost-wind-crop — blades centred on the mast
      hub on the placement ghost, green reserved plot ✓; solo-wind-crop +
      built-wind-crop — live rotors sit dead-centre on every mast hub ✓;
      reservation — a designation's held plot + the second site's ghost walled
      apart ✓. (Before the fix the rotors floated near the ground, off the
      masts — the crops make the fix unmistakable.)

- [x] **Branded auth emails + redirect 404 (owner, 2026-06-13 13:20/
      13:23).** Created ElectriCity-branded, email-safe HTML for the
      passwordless flow in supabase/templates/ (confirm-signup, magic-
      link, otp) — lofi dusk/orange, ELECTRI/CITY wordmark, bulletproof
      CTA. README has the dashboard apply steps.
  - [ ] OWNER ACTION (config, can't be set from the repo): the confirm
        link 404s on localhost:3000 because the Supabase **Site URL** is
        the dev default. Fix in dashboard → Auth → URL Configuration:
        Site URL → the production Vercel domain; add prod + preview
        patterns to Redirect URLs. (App is already correct:
        emailRedirectTo=origin, detectSessionInUrl=true.) Steps in
        supabase/templates/README.md.
  - [ ] APP POLISH (Wave 14 integration): a styled "email confirmed —
        welcome, operator" greeting + clean the #access_token hash on
        the auth callback (detect type=signup/magiclink at boot, toast
        via the store, strip the hash). App.tsx is a running lane's file
        — do at integration.

- [ ] **PLAYTEST FLURRY (owner, 2026-06-13 12:23, far-zoom screenshot).
      Process habit added to CLAUDE.md: screenshot at multiple zooms +
      per-landmark close-ups, critique honestly, BEFORE shipping.**
  - [x] SIGNAGE: landmark (gold) labels gated to mid/close zoom — gone
        from the far overview, towns stay. VERIFIED (MAP/RENDER lane).
  - [x] GLEAM → colour-pop: electric additive bloom + travelling glint
        replaced by a warm sprite-tint colour-pop + a steady rim-light.
        VERIFIED (MAP/RENDER lane).
  - [x] LANDMARK SCALE: O2 3×3, Olympic Stadium 3×3, Wembley 2×2, ExCeL
        3×1 (+ park aprons). VERIFIED (MAP/RENDER lane).
  - [x] STARTING ZOOM: opens on the whole-region fit (very far out).
        VERIFIED (MAP/RENDER lane).
  - [x] BUILD LABEL: tapping a build tool should show an on-screen
        indicator of what you're about to build (e.g. "Building: Grid
        substation"). — VERIFIED (UI/STORY lane, 2026-06-13)
  - [x] The EXPAND (») option on the build palette should be FROZEN /
        accessible at all zoom levels (it currently isn't reachable from
        some states). — VERIFIED (UI/STORY lane, 2026-06-13)
  - [x] METRICS FROZEN 3 MONTHS: the rebuild grace exists (CI/CML +
        constraints suspended) — make it CLEAR in the OPENING MESSAGE
        that all metrics are frozen for the first 3 months.
        — VERIFIED (UI/STORY lane, 2026-06-13)
  - [x] OPENING SCRIPT: fix the nonsense "the letter ends" phrasing
        (introduced in my mobile hotfix) and TRIM the story to TWO PAGES
        MAX — it's too verbose. — VERIFIED (UI/STORY lane, 2026-06-13)
  - [x] NOTHING PRE-EXISTING ON THE MAP: seedScenario seeds NO generation
        (EXISTING_GENERATION removed from state.ts + londonMap.ts). iDNO
        NEW_ESTATES kept as customer DEMAND (load, not generation). e2e
        baselines fine (relative deltas). VERIFIED (MAP/RENDER lane).

### UI/STORY lane — playtest flurry (2026-06-13) — [x] VERIFIED
- [x] OPENING SCRIPT trimmed to TWO beats (was 3); "the letter ends"
      nonsense removed; closing beat rewritten to read naturally and now
      states plainly that all metrics (CI/CML, constraint costs, the RIIO
      report card) are FROZEN for the first 3 months. StoryIntro adds a
      gold grace-period callout under the year-1 allowance + CML line.
      (src/sim/scenario/story.ts, src/ui/StoryIntro.tsx)
- [x] BUILD LABEL chip: a pinned top-centre "Building: Grid substation" /
      "Placing: 132 kV line" chip shows the armed tool, catalog-named,
      desktop + phone-landscape; hidden on inspect. Pure mapping
      (src/ui/buildLabel.ts) + BuildLabelChip wired in App.tsx.
- [x] FROZEN EXPAND: the mobile build-palette » expand affordance moved
      OUT of the scrolling rail into a pinned tab (always rendered,
      missions included) — reachable at all scroll/zoom/tool states.
      (src/ui/MobileChrome.tsx)
- [x] VERIFIED: vitest 530 green (incl. new story.test.ts, buildLabel.test.ts);
      tsc -b + eslint + build clean; playwright app/build/campaign green
      (2 renderer-init flakes passed on retry; story-dismiss + campaign
      story-absent assertions intact). Shots: preview/w13ui-*.png — opening
      both beats, chip (desktop sub + line, mobile), expand tab + open palette.

### RENDER/POLISH lane — Tier-4 polish (2026-06-13) — [ ] IN PROGRESS
- [ ] #43 CONSTRUCTION SITES: plant/substation under construction draws as
      a building site (foundation/scaffold/crane/hoarding), progressing by
      quartile of remaining lead time, transitioning to finished art on
      commission. Pure render.
- [ ] #38 CAMERA BOOKMARKS: save/jump/delete named camera slots
      (x/y/zoom), persisted client-side; a small self-contained floating
      control. Renderer exposes getCamera()/jumpToCamera().
- [ ] #48 PHOTO MODE: clean screenshot mode — hide chrome, golden-hour
      tint, capture the Pixi canvas to a 2x PNG download.

### MAP/RENDER lane — playtest flurry (2026-06-13) — [x] VERIFIED
- [x] SIGNAGE: MapLabel gained a `landmark` flag; gold NAMED_PLACES labels
      now fade in only from sc≥0.20 (`landmarkAlpha`), a full band inside
      the town band, so the far whole-region overview shows TOWNS ONLY.
      (src/render/MapRenderer.ts buildLabels + the per-frame label loop.)
- [x] GLEAM → COLOUR-POP (the owner: the old additive bloom "looks like
      electricity"). Removed the radial gold bloom, the breathing pulse and
      the travelling glass glint entirely. Replaced with: (1) a warm
      sprite-TINT (HERO_POP_TINT 0xfff4e2) on hero structure sprites so
      their colours stay rich while the dusk grade mutes the fabric — they
      read as the focal 5% by saturation/value CONTRAST, not by glowing;
      (2) a single STEADY warm rim-light arc on each hero's NE edge (no
      pulse/sweep). Also dropped the electric `glint()` catch-lights from
      the O2 masts. (MapRenderer drawGleam + paintTile/applySeason tints.)
- [x] LANDMARK SCALE: the hero venues were 1×1 dots — sized up to dominant
      multi-tile SW-anchored footprints with park aprons so they stand
      proud:  O2/Millennium Dome 3×3 (tall billowing canopy + 12 spiking
      masts), Olympic Stadium 3×3 (big bowl in the Olympic park), Wembley
      2×2 (bowl + the great white arch, now thick + legible), ExCeL 3×1
      (long dock-side halls). Westfield stays 2×2 (honest: smaller than the
      stadium), VeloPark/Orbit stay 1×1. Reservations bumped → SAVE_VERSION
      12→13 (justified in isSaveData). atlas stays <4096px (test green).
      (landmarkSprites.ts, atlas.ts, tileChooser BLOCK_LANDMARKS,
      londonMap.ts placement + park aprons; landmarks.test.ts updated.)
- [x] STARTING ZOOM: sandbox opening now fits the WHOLE map via
      cameraFitFor (was a fixed mid-zoom over the city). Missions still
      override with their own lockToBounds fit an instant later.
      (MapRenderer.init.)
- [x] NOTHING PRE-EXISTING: EXISTING_GENERATION seeding removed from
      seedScenario; the const deleted from londonMap.ts. iDNO NEW_ESTATES
      kept as customer demand (load). e2e baselines use relative deltas so
      they held; build.spec comment clarified. (state.ts, londonMap.ts,
      build.spec.ts.)
- [x] SAVE_VERSION 12→13 (landmark resize moves protected `landmark` tiles;
      v12 saves retired). v:13 literal + guard floor + justification updated.
- [x] VERIFIED: vitest 530 green (landmarks.test.ts updated for the new
      footprints); tsc -b + eslint src/tests/e2e/tools + build clean;
      playwright e2e/build.spec.ts + e2e/app.spec.ts FRESH-server green (7/7,
      blank-grid base). DESIGN GATE (preview/w13-*.png, daytime + dusk):
      • w13-far / w13-far-dusk: opens on the whole region; TOWN labels only,
        zero gold landmark clutter — signage fix confirmed; dusk shows the
        warm grade with NO electric glints. ✓
      • w13-mid: LONDON label + landmark labels just fading in at sc=0.26;
        blank grid (no seeded plants) confirmed. ✓
      • w13-close: central heroes (St Paul's, Shard, Tower Bridge) pop with
        warm richness vs the muted fabric — colour-pop reads, no glow. ✓
      • w13-hero-o2: HUGE white dome + spiking yellow masts in the peninsula
        apron — dominant, recognisably the O2. ✓
      • w13-hero-stadium: big orange/white bowl dominating the Olympic park,
        Orbit + VeloPark beside it. ✓
      • w13-hero-wembley: bowl + the iconic white arch, legible in its green
        apron. ✓
      • w13-hero-excel: long 3×1 dock-side halls — honest relative scale. ✓
      • w13-hero-westfield: 2×2 retail mass, correctly smaller than the
        stadium. ✓
      Honest critique: the O2/Wembley needed park aprons added (the dense
      terraces were occluding them at first crop) — done. The baked-in
      sprite gleam strokes (warm edge lines) were KEPT as rim light; only
      the per-frame additive bloom/glint (the "electricity") was removed.

- [x] **REVERT the new node logo (owner, 2026-06-13 12:06): "I like the
      existing wording on ElectriCity. The new logo is kinda trash.
      Revert those changes."** Restore the OLD ElectriCity branding:
      the ELECTRI(orange)/CITY(slate) wordmark + the old pylon-bolt
      logo.svg/logotype.png. Surgical revert (keep the brownfield work
      and everything since b8d50d1): delete src/ui/Logo.tsx, tools/
      genIcons.mjs, tools/rasterize.mjs, docs/logo-concept.md; App.tsx
      Wordmark back to the old <img logo.svg> + ELECTRI/CITY spans;
      StartMenu hero back to <img logo.svg> + <img logotype.png>;
      checkout the old public/{logo.svg,icon.svg,apple-touch-icon.png,
      icon-512.png,logotype.png} from d061cf8; revert e2e/app.spec.ts
      Electri/City → ELECTRI/CITY. ATOMIC at Wave 12 integration (App.tsx
      currently imports the new LogoMark; the running UX lane is editing
      App.tsx — can't half-revert). Old versions already captured.

### Wave-12 SIM-CORE lane — multi-city FOUNDATION: de-GB seams + CityScenario v2 (docs/multi-city-and-rank.md P0+P1)
- [x] **P0 SEAM 1 — FREQUENCY profile-driven — VERIFIED.** The 50 Hz
      nominal / 47.5 floor / 1.5 droop literals in `src/sim/market/
      frequency.ts` now come from a `PowerSystemProfile` (`src/sim/
      powerProfile.ts` → `LONDON_POWER`). `islandFrequencyHz(deficit,
      profile?)` defaults to GB, so the dispatch caller (and every old
      caller) is bit-identical; NYC/Rio (60 Hz) is just data. `NOMINAL_HZ`/
      `FREQ_FLOOR_HZ` re-export the London constants. dispatch threads
      `ctx.profile.power`.
- [x] **P0 SEAM 2 — WEATHER profile-driven — VERIFIED.** `COLDEST_DOY`,
      the season cosine, the GB sun arc (16.5−8.5·s, amp 1−0.45·s), the
      Atlantic REGIME envelopes, and the winter-peak `hpProfile` in
      `src/sim/events/weather.ts` now read a `WeatherProfile`
      (`LONDON_WEATHER`). `seasonFactor`/`sunFactor`/`domesticProfile`/
      `hpProfile`/`coolingFactor`/`thermalDerate`/`stepWeather` all take an
      OPTIONAL profile defaulting to GB ⇒ bit-identical. Summer-peak cities
      phase-shift the cosine to `peakDoy`; `summerness()`/winterness flip
      cooling-vs-heating to the right half-year. REGIMES + RegimeSpec moved
      onto the profile so the table and the state machine can't drift.
      `render/grade.ts`'s no-arg `seasonFactor` stays London (untouched).
- [x] **P0 SEAM 3 — BILL / generation-ownership profile-driven — VERIFIED.**
      `DOMESTIC_NETWORK_SHARE` 0.32 / `DOMESTIC_ENERGY_SHARE` 0.4 /
      `RETAIL_UPLIFT` 3.0 / `SUPPLY_FIXED_YR` 150 in `src/sim/regulation/
      bill.ts` now live on an `EconomyProfile` (`LONDON_ECONOMY`; named
      exports re-export it). `computeBill` gains OPTIONAL `economy` +
      `generation`, defaulted to GB ⇒ bit-identical. The real fork — the
      gen-recovery branch — is wired: `generation.ownership==='owned'`
      (HK/Shanghai/Cairo/Dubai) annuitizes gen capex into the NETWORK pot
      and zeroes the PPA line; London's liberalised `'tender'` (PPA on the
      energy line, gen excluded from DUoS) stays the default. tick threads
      `ctx.profile.economy/generation`.
- [x] **P1 CITYSCENARIO v2 — VERIFIED.** `src/data/cityRegistry.ts`'s
      `CityScenario` gains optional `power`/`weatherProfile`/`economy`/
      `generation`/`regulator`/`difficulty`/`unlockAtRank` — ALL OPTIONAL,
      defaulting to London via `resolveProfile()`/`profileOf()` →
      `LONDON_PROFILE`. The london scenario (and all 5 missions) declare
      NONE, so they resolve to exactly LONDON_PROFILE. `SimContext` carries
      the resolved `profile` (scenario DATA derived from scenarioId, NEVER
      serialized — `newContext` rebuilds it from the save's scenarioId like
      the map, so **NO SAVE_VERSION bump**, justified). Threaded:
      scenario → newContext → tick/dispatch/frequency/weather/bill/worker.
- [x] **DETERMINISM PROOF — VERIFIED.** All 470 pre-existing tests pass
      UNCHANGED (the seams are pure refactors — that IS the bit-identical
      proof). New `tests/powerProfile.test.ts` (16) asserts London's
      profile reproduces every prior literal and that profile-less ==
      London across a full-year hour-sweep, AND that a throwaway 60 Hz /
      summer-peak profile (NOT shipped) bends frequency/season/heating/
      cooling/bill differently. New `tests/cityScenario.test.ts` (6):
      London + every mission resolve to LONDON_PROFILE, two independent
      1000-tick London runs produce a bit-identical bill/freq/weather/
      served/rngState trace, and per-block overrides fall back cleanly.
      `npx vitest run` green (sim lane: 507 pass; the 2 reds —
      `cbPalette` tritanopia + an `eventLog` parallel flake — are the
      concurrent UX lane's files, not sim-core). `tsc -b` + full `eslint
      src tests e2e tools` + `npm run build` clean; `playwright test
      e2e/build.spec.ts` 4/4 green on a FRESH server.
- [ ] **NEXT WAVE (out of scope here):** the actual cities (Sydney first,
      then Hong Kong's owned-gen fork, then the rest as data + one mechanic
      each — `*Map.ts` + a CityScenario block) and the operator RANK +
      city-UNLOCK-offer + Supabase `progression` meta-layer (docs P2–P5).
      The regulator `'profit-cap'`/`'cost-of-service'` framings + the
      `hydroDriven`/`baseloadFloor` knobs are typed hooks only, dormant.

### Tier-3 UX lane — bill chart · KPI tooltips · undo history · save slots (ROADMAP #28/#36/#27/#34, this prompt)
- [x] **#28 BILL-OVER-TIME CHART — VERIFIED.** A stacked-area chart of the
      £/household/yr bill + four components (network DUoS / wholesale energy
      / generation+ops / constraints+levies) over the sampled game-months,
      expandable under the BillPanel headline ("▸ bill over time"). Worker
      samples once per game-DAY into a bounded ring (src/sim/billHistory.ts:
      `BillHistory`, decimates to ≤120 points by halving resolution when
      full, always tracks the freshest reading at the right edge; worker-
      local chart data, rebuilt on load → NO SAVE_VERSION bump). `bandsOf`
      splits the household total proportionally so the bands always sum to
      the headline. Shipped in the snapshot (`billHistory: BillSample[]`).
      UI: SVG stacked areas + total polyline, tap/move to read a day, legend
      chips ISOLATE a band. zIndex lift when expanded so the chart isn't
      occluded by the inbox on short desktops. Sampled in BOTH the live tick
      and the skip loop (deterministic). Unit: tests/billHistory.test.ts (5)
      — per-day dedupe, bounded decimation keeping the newest, band sum ==
      total.
- [x] **#36 "WHY IS THIS NUMBER RED?" KPI TOOLTIPS — VERIFIED.** Every
      KpiDashboard row gets a colour-coded `?` dot (green/amber/red by
      status) that taps/hovers open a tooltip: what the KPI is, what GOOD
      looks like, and WHY it's that colour right now (the threshold it's
      meeting/missing). Pure copy + threshold reasoning in src/ui/kpiHelp.ts
      (targetHelp for the RIIO set, bandedHelp for health/safety/engagement,
      ltiHelp for the zero-target injury rate); teach copy table in
      KpiDashboard. Rewrote the dashboard onto a shared KpiRow + HelpDot.
      Verified visually (preview/ux-kpitooltip-crop.png reads cleanly: CML's
      tooltip shows the definition, a gold "Good:" line and a green "why").
- [x] **#27 UNDO HISTORY LIST — VERIFIED.** A panel (src/ui/UndoHistory.tsx)
      listing the recent undo-able actions newest-first with one-line labels
      ("built Grid substation", "awarded CCGT bid"…); clicking an entry
      reverts back THROUGH it in one worker message. Opened by right-click
      OR long-press on the undo button, or a dedicated ledger button (HUD).
      Worker keeps `undoLabels`/`redoLabels` parallel to the snapshot stacks
      (label captured at push via src/sim/describeCommand.ts), shipped as
      `undoLabels` in the snapshot; new `undoTo(depth)` protocol message
      steps undo `depth`× exactly like pressing the button (redo still walks
      forward). Ctrl+Z/Ctrl+Y untouched. Unit: tests/describeCommand.test.ts
      (3) — labels match commands, demolish names the pre-command asset,
      never empty. e2e: undo.spec.ts asserts labels populate + undoTo(2)
      reverts 2 builds and redo walks forward.
- [x] **#34 NAMED SAVE SLOTS — VERIFIED.** A SavesPanel (src/ui/SavesPanel.
      tsx) lists up to 5 named manual saves with name · day · bill · "saved
      N ago", with save / overwrite / load / rename / delete; reachable from
      the StartMenu ("save slots") and in-game (HUD save button + mobile
      chip). Additive persistence (src/persistence/slotStore.ts, own
      localStorage key `electricity.slots.v1`) BESIDE the untouched single
      autosave + continue flow. Worker answers a `requestSlotSave` with a
      `forSlot`-tagged saveData the bridge routes to the slot writer (never
      the autosave); loading a slot replays it through `start`. Cloud rides
      the existing best-effort path. Unit: tests/slotStore.test.ts (5) —
      upsert oldest-eviction + overwrite-in-place, default naming,
      localStorage round-trip (save/rename/delete). e2e: menu.spec.ts saves
      a named slot, mutates, loads it back and asserts the restore.
- [x] All ADDITIVE — no SAVE_VERSION bump (stays 11): billHistory + undo
      labels are worker-local chart/UI data; named slots live under their
      own key. Full `npx vitest run` 470 green; `npx tsc -b`, `npx eslint
      src tests e2e tools`, `npm run build` clean; `npx playwright test
      e2e/app.spec.ts e2e/menu.spec.ts e2e/undo.spec.ts` 15/15 on a fresh
      server. IMAGES inspected at desktop (1280×800) AND phone-landscape
      (844×390): preview/ux-{billchart,kpitooltip,undolist,saveslots}-
      {desktop,mobile}.png (+ ux-billchart-crop / ux-kpitooltip-crop) —
      chart readable, tooltips legible, undo list usable, save slots clear.

### Wave 12 UX/polish lane — minimap · event-log filters · colour-blind · net-zero · alert ack/snooze (ROADMAP #26/#30/#32/#33/#39, this prompt) — VERIFIED
- [x] **#32 COLOUR-BLIND MODE — VERIFIED.** Single source of truth in
      src/ui/cbPalette.ts: deuteranopia/protanopia/tritanopia-safe sets for
      the status (ok/warn/danger), the three voltage levels and the loading
      heatmap, each spread across a wide LIGHTNESS range and leaning on the
      blue↔yellow axis so hue-loss never collapses the language. theme.ts
      `statusColors(mode)` swaps the chrome; MapRenderer holds instance
      palette fields (levelColor/overload/heat/ok/warn/danger) that
      `setCbMode(mode)` swaps + redraws lines/rings/catchments/ghosts in
      place (the exported LEVEL_COLOR constant stays the default for static
      legends). Toggle lives in the start-menu settings footer
      (ColourBlindSetting.tsx) with a LIVE LEGEND of the voltage + status
      swatches, each PAIRED with a glyph (═/─/· · ✓/!/✕) so it's never
      hue-alone; persisted to localStorage (ec.cbMode). Distinctness PROVEN
      in tests/cbPalette.test.ts (14): a Brettel-style deficiency projection
      asserts every within-language pair keeps cbDistance > 0.15 AND a real
      luminance gap under each mode. IMAGE: preview/ux2-cblegend-zoom.png —
      the deuteranopia legend reads cleanly, all six swatches distinct.
- [x] **#26 MINIMAP — VERIFIED.** src/ui/Minimap.tsx: a corner collapsible
      DOM <canvas> (NOT a second Pixi app) — terrain wash (water/built-up/
      green-belt) pre-rendered ONCE to an offscreen canvas sized to the real
      256×160 map, network strokes (level-coloured) + gen/sub pips overlaid
      each frame from the snapshot, and the live gold VIEWPORT RECTANGLE.
      Click/drag pans the main camera (requestPan). FLAGGED read-only
      accessor `MapRenderer.getMinimapView()` — the ONLY render addition:
      returns map size + the visible tile rect (inverts the corner screen→
      tile transform); restructures nothing. Reached via a tiny
      render/rendererRegistry.ts (MapView publishes/retracts the live
      renderer). Default open on desktop, closed on a narrow phone.
      IMAGES: preview/ux2-minimap-{crop,desktop,mobile}.png.
- [x] **#33 NET-ZERO DASHBOARD — VERIFIED.** src/ui/NetZeroPanel.tsx (green
      companion to RIIO, HUD wind-icon button): reads the EXISTING snapshot
      (stats.carbonG + genMW + gen assets) — live carbon intensity vs a
      2050-style glidepath bar w/ a now-marker, low-carbon share bar,
      generation-mix stacked bar (low-carbon techs hatched = shape-not-hue),
      and the worst running source callout. Maths in src/ui/netZero.ts,
      unit-tested (tests/netZero.test.ts, 7): mix shares sum to 1, low-carbon
      share counts only zero-carbon, worst = dirtiest running unit,
      battery-charging excluded as a sink, blank-grid handled. IMAGE:
      preview/ux2-netzero-{crop,desktop,mobile}.png.
- [x] **#30 FILTERABLE EVENT LOG — VERIFIED.** AlertsFeed.tsx gains
      `EventLog` (full modal, opened by the feed's "log ▸"): category chips
      (faults/planning/weather/market/finance), a search box, click-to-jump
      rows, sticky timestamps, per-row ack/snooze. Events carry no category
      (sim lane owns GameEvent) so the client classifies from the copy —
      `categorizeEvent` keyword rules (word-boundaried so "ice" doesn't hide
      in "price"), unit-tested in tests/eventLog.test.ts. IMAGE:
      preview/ux2-eventlog-{crop,desktop,filtered,mobile}.png — "planning"
      chip active, "19 events (filtered)", category column, ack/snooze rows.
- [x] **#39 ALERT ACKNOWLEDGE / SNOOZE — VERIFIED.** Store holds
      ackedAlerts:Set + snoozedAlerts:Record (keyed by event seq), persisted
      to localStorage (ec.alertState.v1). The corner feed + the news ticker
      both filter through `alertVisible(e, nowMin, acked, snoozed)`: ack =
      gone for good, snooze = hidden 60 game-min then re-fires. Per-row ✓/zzz
      buttons on the feed and the log. Unit: tests/eventLog.test.ts — snooze
      re-arms exactly on its minute, ack wins over a future snooze.
- [x] All CLIENT-SIDE — no protocol/worker/state/sim/londonMap/cityRegistry
      touched; NO SAVE_VERSION bump (cb mode, minimap flag, alert ack/snooze
      live under their own localStorage keys; net-zero/event-log read the
      existing snapshot). Full `npx vitest run` 521 green (29 new); `npx tsc
      -b`, `npx eslint src tests e2e tools`, `npm run build` clean; `npx
      playwright test e2e/app.spec.ts e2e/controls.spec.ts` 6/6 on a fresh
      server. IMAGES inspected at desktop (1280×800) AND phone-landscape
      (844×390): preview/ux2-*.png — minimap, net-zero, event-log, the
      colour-blind legend all read cleanly on both.

### Logo / brand redesign prompt (owner, 2026-06-13)
- [x] **New brand mark from a blank concept** — VERIFIED. Explored 4
      directions in `docs/logo-concept.md` (A "The Node" ★, B "The
      Window", C "The Spark E", D "The Pylon Node"); chose A — a glowing
      substation NODE where the grid converges, the operator's instrument,
      with the dusk-glow hook baked in and legible at 16px (the old
      bolt+buildings mark was the cliché answer). Implemented code-drawn
      SVG `src/ui/Logo.tsx` (`<LogoMark>` + `<LogoLockup>`; the "i" tittle
      is the warm grid-node, "Electri" off-white → "City" gold). Wired
      into StartMenu hero + App corner wordmark; regenerated
      `public/logo.svg`, `public/icon.svg`, apple-touch-icon.png,
      icon-512.png, logotype.png via `tools/genIcons.mjs` (rasterises the
      SVG sources so they stay in sync). Inspected at 16/32/180/512px,
      inline + hero, on the navy panel — keepers in `preview/logo-*.png`;
      favicon survives 16px. `tsc -b`, eslint, build green; app+menu e2e
      green (boot text assertion updated to "Electri"/"City").

- [ ] **+30d skip vs incidents (noticed at Wave 9 gate):** now that
      weather incidents fire every week or two, a +30d (and often +7d)
      skip halts at the first storm/incident (bad news stops a skip —
      intended safety). So the long jumps rarely complete their full
      span. Decide: keep as-is (halt-on-crisis is good), OR only halt on
      MAJOR incidents, OR report "skipped 8 of 30 days — storm hit". Low
      priority tuning.

- [x] **Wave 9 landmarks + Heathrow (agent lane, integrated by main
      after the lane stalled post-completion).** Missing landmarks added
      (Wembley, O2, Crystal Palace, Alexandra Palace, ExCeL, Kew, BT
      Tower, real Gherkin) with the warm specular GLEAM on heroes;
      bespoke concrete HEATHROW (twin runways + terminal island, planes
      on the real runways); the Heathrow PV+BESS special application.
      SAVE_VERSION 10→11. VERIFIED: 434 lane tests + main's rebuild-grace
      tests = 436 green; tsc/eslint/build clean; Heathrow + heroes +
      sprite previews inspected. (Olympic Park cluster + per-city assets
      remain for a follow-up.)

- [x] **Olympic Park, Stratford (owner, 2026-06-13 09:26): "Id like
      london to have the Olympic park in london with the stadium
      velodrome arcelormittal and westfield."** — VERIFIED. Added the
      Queen Elizabeth Olympic Park as a recognisable four-hero cluster on
      the Lea's east bank (Stratford), in true relative order: **Lee
      Valley VeloPark** (new `velodromeTile` — the saddle/Pringle
      hyperbolic-paraboloid timber roof over a glazed concourse) to the
      north at (133,66); the **Olympic Stadium** bowl + lighting masts
      (the existing `stadiumTile`, relocated from its old Lea tile to
      (134,69) — there is now ONE stadium, in the park); the
      **ArcelorMittal Orbit** (new `orbitTile` — a dense tangle of
      looping ArcelorMittal-red tubular lattice up to twin observation
      decks, the spine mast + slide, the warm specular GLEAM down its
      sun-facing tubes) at (136,68); and **Westfield Stratford City**
      (new `westfieldTile`, a 2×2 SW-anchored precinct — a big glazed
      retail hall with barrel atria, the orange brand band over the
      entrance, and the Stratford-City mixed-use towers behind, clearly
      out-scaling the generic mall) at (136..137,71..72). The precinct is
      re-zoned to Olympic **parkland** so the heroes stand in the park
      rather than being swamped by the surrounding urbanCore towers
      (zoneRect 132,65–139,73 → ZONE.park). New LANDMARK ids 30/31/32
      (append-only); sprites registered in the atlas (lm_velodrome/
      lm_orbit/lm_westfield) — atlas 1470×1432, well under the 4096
      ceiling; gleam-hero registrations added (Orbit glass-glint hero,
      VeloPark + Westfield warm bloom); NAMED_PLACES entries (Olympic
      Park / Lee Valley VeloPark / ArcelorMittal Orbit / Westfield
      Stratford) so search+labels find them; per-landmark customers
      (Westfield 40, VeloPark 10, Orbit 4). **SAVE_VERSION 11→12** and
      v11 saves retired: the new protected landmark tiles + the
      urbanCore→park re-zone move the gameplay tile raster, so a v11
      asset could sit on what is now park/protected Olympic fabric.
      Rendered each sprite + the in-situ Stratford crop at dusk and
      inspected: VeloPark reads by its saddle roof, the Stadium by its
      orange bowl, the Orbit by its red looping tower (gleam visible),
      Westfield by its glazed mass + brand band — keepers in
      preview/olympic-*.png. VERIFIED: full `npx vitest run` green
      (457 tests, incl. new tests/landmarks.test.ts Olympic block +
      save/saveArbitration with the version bump); eslint clean across
      src/tests/e2e/tools; `npm run build` green; e2e build.spec fresh-
      server green (asset/seed counts unchanged — landmarks are render
      decoration, not gen/sub assets). (My tsc note: a parallel UX lane's
      in-flight BillPanel.tsx edits trip `tsc -b` strict-null/unused
      lints — not my files; my changed files compile clean and the vite
      build passes.)

- [x] **Rebuild grace: CI/CML clock + constraint payments (owner,
      2026-06-13 09:15).** Two related asks; implement at Wave 9
      integration (tick.ts is lane-locked right now).
  - [x] CI/CML CLOCK STARTS AFTER 3 MONTHS (owner: "the clock on ci/cml
        should only start after 3 months"): suppress reliability-KPI
        (CI/CML) accrual for the first ~3 game-months (90 days) of a
        london game — you're rebuilding the vanished grid, the regulator
        gives breathing room before reliability scoring bites. Gate
        updateReliability / the CI-CML accumulation (regulation/kpis.ts,
        called from tick.ts) on simTimeMin >= 3 months; RIIO report card
        ignores pre-grace interruptions. Same rebuild-grace philosophy
        as the day-0 group-litigation fix already shipped.
  - [x] CONSTRAINT PAYMENTS feel harsh early (owner: "seems a bit harsh
        to have to pay for turn down when theres no grid to start").
        Model is CORRECT (firm-connection curtailment = a real GB
        constraint payment; distinct from a flexibility service you
        procure, and from flexible-connection curtailment which is
        free). But apply the SAME 3-month rebuild grace: waive/suppress
        firm-curtailment constraint payments during the initial rebuild
        window so the inherited chaos isn't billed; after the grace the
        real mechanic applies (the nudge not to over-procure firm gen
        where the wires/demand can't absorb it). Also: make the FIRM-vs-
        flex choice louder at connection time ("firm + curtailment =
        constraint payments; flexible curtailment is free") — the
        connection study already hints this; surface it on the bid/award.

- [x] **GAME FEELS DEAD: no weather incidents, no new applications, bad
      frequency model (owner, 2026-06-13 05:33). VERIFIED.** Root cause of
      the owner's "dead" repro: rngState was NOT persisted across the
      manual ticks (the real worker persists it every tick), so weather
      never cycled and apps never rolled. But two genuine model bugs lay
      underneath; both fixed.
  - [x] WEATHER INCIDENTS — **VERIFIED.** Regimes DID cycle in the real
        worker, but (a) windy-wet wind capped at ~0.78 so isStorm (0.85)
        NEVER fired, and (b) there were no named incidents at all. Added a
        dedicated `storm` regime (wind 0.92+, 1–2 days, winter-weighted in
        pickRegime), and a new events/incidents.ts that fires named
        Storm/Heatwave/Flood banners (once per regime instance, deduped on
        regimeEndsMin) with real consequences: storms → fault clusters via
        the existing stormFactor; floods → underground cable/substation
        outages routed through the fault job/van system; heatwave → cooling
        demand spike (coolingFactor on domestic load) + transformer thermal
        derate (thermalDerate on the sub rating clamp). forecastStorms now
        leads the named `storm` pre-roll too. Over a seeded london YEAR:
        8 named storms + 12 heatwaves; all five regimes cycle; maxWind
        >0.85. Floods scale with network size (rare on the 3-sub starter,
        a few a winter on a real grid). Deterministic — all off `rng`.
  - [x] APPLICATION CADENCE — **VERIFIED.** Was ONE shared chance() draw
        whose kind-list was 5/6 generation, so demand (data centre/EV hub)
        starved out (0 demand apps in 120 days). Split into TWO independent
        seeded streams (maybeSpawnApplications), each ~1/week mean at the
        neutral baseline (7-day interval), kept the connectionCadenceMul
        scaling. Over 24 weeks neutral london: ~1.27 gen + ~1.08 demand per
        week. Not gated behind a served base.
  - [x] FREQUENCY MODEL — **VERIFIED.** Extracted market/frequency.ts:
        each electrified island floats at its own balance frequency
        (50 − 1.5·deficit, floored 47.5); the HUD shows the LOAD-WEIGHTED
        mean (systemFrequencyHz), and N/A ("— Hz", muted) when no island
        carries load — replacing the old global Math.max(47.5,50−1.5·
        deficit) that invented a deficit on the blank day-0 grid. Dispatch
        emits per-island freqSamples; tick + protocol + Hud carry
        freqHz?:number|undefined (additive, no SAVE_VERSION bump).

- [ ] **Day/night flashing + animation pacing (owner, 2026-06-13
      05:10): "Animations should move as fast as the game clock speed
      allows. Its a bit disturbing the flashing day night cycle. Wonder
      if we can make the change more subtle and its mostly done in the
      lights of the buildings."** Render/beauty tweak: (a) drive sprite
      animation rates off the game-clock SPEED (0/1/4/16x) so motion
      matches time; (b) make the day/night GRADE transition far subtler
      — slower, gentler tint swing — and carry the time-of-day read
      mostly in BUILDING LIGHTS (windows warming at dusk) rather than a
      big global wash that "flashes". Tune the grade.ts ramp + glow
      layer from the beauty pass.

- [ ] **Dead mobile bottom-bar icons (owner, 2026-06-13 05:10): "On
      mobile, theres icons in the bottom bar that dont seem to do
      anything. A plus sign, a square chart and an egg timer."** Audit
      MobileChrome bottom bar — the +, chart and timer (egg-timer =
      likely the event-skip / time control) either do nothing or have
      no affordance feedback. Remove or wire them. Folds into the
      bespoke-icons + collapsible-chrome Wave 8 UI lane.

- [ ] **Replace 06:00/18:00 skips with +7d / +30d (owner, 2026-06-13
      05:10): "We can also remove the 6:00 and 18:00 jumps. Instead
      have +7d +30d."** Replace SkipTarget 'peak'/'morning' buttons with
      fixed-duration jumps (+7 game-days, +30 game-days); keep the
      bad-news-stops-the-skip behaviour (now that day-0 spurious claims
      are fixed). Update skipTargetMin + the SkipButtons + e2e
      goals.spec to the new controls. Wave 8 UI lane.

- [ ] **PER-CITY ASSET PACKS + richer building stock (owner, 2026-06-13
      05:05): "For the new cities, we will need fresh assets for
      landmarks and housing and building stock etc. id love a much
      wealthier selection of offerings for each city. Bigger and smaller
      housing of different eras."** Extends the MULTI-CITY work.
  - [ ] Each new city ships its OWN art pack (art-is-code, lofi style):
        bespoke LANDMARKS (e.g. Sydney Opera House/Harbour Bridge, Paris
        Eiffel/Haussmann, NYC skyscrapers/brownstones, HK towers, Athens
        Acropolis, Shanghai Pudong, Rio Christ/favela morros, Cairo
        pyramids/minarets, Dubai Burj Khalifa/Palm), city-appropriate
        HOUSING + commercial/industrial BUILDING STOCK — not reskinned
        London terraces.
  - [ ] Much WEALTHIER selection generally (applies to London too):
        bigger AND smaller housing across different ERAS (Georgian,
        Victorian, interwar, postwar, modern; per city: brownstone,
        Haussmann, walk-up, high-rise, vernacular) so streets read
        varied, not repetitive. Expand the sprite families + tileChooser
        variety; estate-cluster the eras sensibly.
  - [ ] Tie to CityScenario v2: a city's asset pack is data the renderer
        selects on by scenario; share a common construction kit so packs
        are additive, atlas stays <=4096px (per-city atlas or lazy load).
        Big art effort — sequence across the multi-city implementation
        waves; use environment-art + the sprite doctrine.

- [ ] **BESPOKE ICONS + COLLAPSIBLE CHROME (owner, 2026-06-13 05:03):
      "I don't like how we have used standard emojis for the icons. I
      want more bespoke signage, especially when collapsed on mobile
      mode. We should allow collapses to happen on desktop mode too for
      a cleaner look."** UI/art lane (use the design skills:
      game-ui-design iconography + readable-at-size, frontend-design,
      color-theory for the lofi palette).
  - [ ] Replace standard emoji glyphs with a BESPOKE art-is-code icon
        set in the lofi ink-contour style — across the HUD buttons
        (RIIO, 🏢 company, sound, grid-view, ⚡, ⚖, etc.), the build
        palette tool icons, and ESPECIALLY the COLLAPSED MOBILE RAIL
        signage (MobileChrome). One consistent pictographic language
        (substation, pylon, turbine, bill, balance, inbox, fleet/van,
        directorates, KPIs…), legible at small size on a phone.
        Implement as a shared icon component/sprite set (SVG or the
        vector raster pipeline), not unicode.
  - [ ] DESKTOP COLLAPSE: let the HUD/palette collapse on desktop too
        (not just mobile) for a cleaner look — a toggle to the compact
        icon-rail presentation; remember the choice.
  - [ ] Judge on IMAGES: render the icon set + collapsed/expanded chrome
        at desktop and phone-landscape, LOOK and iterate. Lands as a
        Wave 8 UI lane (after Wave 7 merges — Hud/MobileChrome/Palette
        just changed there).

- [x] **WAVE 8 UI LANE — bespoke icons · desktop collapse · dead mobile
      icons · +7d/+30d skips · subtler day/night (owner, 2026-06-13).
      VERIFIED.** Full `npx vitest run` (417 green incl. new icons +
      rewritten skip tests), `npx tsc -b`/eslint/`npm run build` clean,
      goals/app/controls/palette e2e green on a fresh server, screenshots
      rendered + inspected (preview/w8-*.png).
  - [x] BESPOKE ICONS — new `src/ui/icons.tsx`: one ink-contour SVG
        pictographic language (1.6px round stroke on a 24-grid, currentColor
        so the active-state navy flip carries through, legible to ~16px).
        Substation, pylon, cable, the full generation family (plant/flame/
        solar/onshore+offshore wind/tidal/nuclear/battery/coal/
        interconnector/H₂/capacitor), sub tiers (BSP/grid/dist/pole/vault),
        van/depot/demolish/inspect, balance scales, headroom, N-1 shield,
        forecast hourglass, RIIO clipboard, directorates building, bill £,
        inbox tray, alerts ledger, sound on/off, help, skip/skip-event,
        undo/redo, collapse/expand/menu. Shared GEN_ICONS/SUB_ICONS
        registries (unit-tested: every buildable tool has a glyph). Wired
        across the HUD buttons, the BuildPalette tool rows, the collapsed
        MobileChrome RAIL and the right-hand chip column — every emoji/
        unicode glyph replaced (kV levels stay as coloured numeric badges).
  - [x] DESKTOP COLLAPSE — additive `hudCollapsed` store flag (localStorage,
        key `ec.hudCollapsed`). A collapse/expand chevron lives in the HUD
        bottom bar (desktop-only; phones are always compact). Collapsed
        desktop reuses the proven compact icon-rail + drawers (MobileChrome),
        keeping the wordmark/search for orientation; `compact = isMobile ||
        hudCollapsed` threads through App + Hud. Added a directorates chip
        to MobileChrome so the company panel stays reachable when collapsed.
  - [x] DEAD MOBILE ICONS — the "+ / square chart / egg timer" were the
        three adjacent overlay TOGGLES in the compact bottom bar: N-1
        security (`⛨`, font-rendered as a boxed plus), the headroom heatmap
        (`▦`, the "square chart"), and the 5-year forecast (`⏳`, the
        "egg timer"). They weren't truly dead — each toggles a real map
        overlay — but at phone zoom the overlays are subtle and the glyphs
        were cryptic, so they read as no-ops. FATE: kept + fixed — bespoke
        legible glyphs (IconShield/IconHeadroom/IconHourglass), aria-labels,
        and an explicit confirmation TOAST on every toggle so the feedback
        is unmistakable.
  - [x] +7d / +30d SKIPS — SkipTarget is now `'week'|'month'|'event'`;
        skipTargetMin returns nowMin + 7/30·1440 (MAX_SKIP_TICKS lifted to
        90k for the longer run). HUD/MobileChrome buttons read "⏭ 7d / 30d"
        (bespoke skip glyph), event-skip kept on desktop. skip.test.ts +
        goals.spec.ts rewritten: +7d advances ~a week / +30d ~a month, never
        overshoots the wall, bad news still halts, paused stays paused.
  - [x] DAY/NIGHT SUBTLETY — grade.ts: the global WASH swing is compressed
        (night tint lifted 0x757db4→0xb9b2cc, day pulled back from near-white
        to 0xf6ecdc; the dusk/sunset tints stay a warm neutral) so it no
        longer flashes; the full time-of-day READ now rides the WINDOW GLOW
        (still ramps 0→1, lifted dusk keys). Animation rate now tracks the
        sim clock: MapRenderer gained `setSimSpeed(0/1/4/16)` and the
        living-world steppers (vehicles, rotors, flow dashes, aircraft, wakes)
        run on `dt·simSpeed` — paused freezes, 16x whirs — while the grade
        ease and attention pins stay on real time. NOTE: my MapRenderer edit
        is ONLY the animation-speed field + setter + the `mdt` gating in
        animate(); I did not touch the map/terrain/label regions the MAP lane
        owns (a transient stale-tsbuildinfo error from their concurrent label
        edit cleared on a fresh `tsc -b`).

- [x] **Map-edge rock walls (owner, 2026-06-13 04:48): "I don't
      understand why the edges of the map are rock walls. Just stick to
      real towns."** FIXED (Wave 8 MAP OVERHAUL flagship lane). Root
      cause: the "Hills" block in londonMap.ts blanket-filled the whole
      top/bottom map margin with `TERRAIN.hill` (rendered as the brown
      `ground_moor` plateau — the rock wall). Replaced the blanket rim
      with REAL upland masses only: a soft sine-ridge Chiltern band
      hugging the NW corner and a North-Downs band along the southern
      third, each with a ragged lower edge that dissolves into farmland,
      and the extreme rim rows kept as ordinary countryside so the edge
      resolves into fields/sea/towns (the screen-space dusk vignette
      fades it). Unit-pinned: the outer rows are <20% hill. (EnvArt:
      detail at the transition, calm in the mass.)

- [ ] **MULTI-CITY FUTURE-PROOFING + RANK/PROGRESSION (owner, 2026-06-13
      04:48).** Big strategic feature — DESIGN/RESEARCH pass first.
  - [ ] Future-proof city selection beyond London: Sydney, Paris, New
        York, Hong Kong, Athens, Shanghai, Rio de Janeiro, Cairo, Dubai.
        cityRegistry.ts already defines CityScenario for exactly this —
        extend it with per-city POWER-SYSTEM config. RESEARCH the real
        differences to model per city/country: weather/climate profiles,
        planning-permission regimes, grid-OWNED vs market generation,
        system FREQUENCY (50 vs 60 Hz), the REGULATOR (if any), and
        VOLTAGE levels. Each becomes scenario data + tuning, ideally
        without engine forks.
  - [ ] Cities are UNLOCKED by the player — a benefit to logging in;
        needs ACCOLADE/PROGRESSION persistence (Supabase: a new table /
        profile fields for rank, milestones, unlocked cities).
  - [ ] RANK SYSTEM: power-system-engineering JOB TITLES from junior
        intern upward (have fun with the ladder); the player LEVELS UP
        on milestones + efficiency-against-milestones; faster promotion
        for better performance. At certain ranks the player gets an
        OFFER (any time) to go fix another city's missing grid —
        accepting unlocks that map. Tie progression to the existing
        RIIO report-card / KPI scoring.
  - [ ] DESIGN PASS launched (read-only, deep-research): produces
        docs/multi-city-and-rank.md — researched per-city power-system
        table, the CityScenario config extension, the rank ladder + job
        titles, the milestone/efficiency promotion model, the city-
        unlock offer mechanic, and the Supabase accolade/rank schema.
  - [ ] IMPLEMENTATION = a later dedicated wave (after Wave 7/8); spans
        cityRegistry + sim config + Supabase + UI + progression.

- [ ] **TERRAIN + PLANNING overhaul (owner, 2026-06-13 04:38, image:
      chequerboard farmland).** Two parts.
  - [x] TERRAIN ART/GENERATION (Wave 8 MAP OVERHAUL flagship lane —
        VERIFIED). The 4×4 chequerboard is gone: crop selection now
        follows the map's ORGANIC variable-size enclosures (tileChooser
        keys the crop off the per-field `variant` hash, not a rigid 4×4
        `parcelOf` grid) and the mix is grass-led green-belt (mostly
        pasture/meadow, a minority barley/rape/plough). Palette
        DESATURATED into the English green-belt gamut (color-theory):
        field `#e3b863`→`#c4b378`, rape `#e8d23f`→`#ccc06a` (the luteous
        outliers), grass/grassDark lusher greens, the upland `moor`
        `#a08c62` brown→lush green `#8a9a6a` (Surrey Hills / Chilterns
        read as green hills, not rock); summer season tints pulled off
        the parched American gold to a muted green sward. Forests/woodland
        masses keep the existing blobs. (BROWNFIELD texture/flag for the
        planning mechanic remains for the sim lane — a `brownfield`
        palette token is seeded ready.) Drove by environment-art
        (detail-at-the-transition, calm-in-the-mass) + color-theory
        (desaturation/harmony onto the dusk ramp).
  - [x] BROWNFIELD-FAVOURED PLANNING + APPEALS (sim mechanic) —
        **VERIFIED (Wave 9 SIM lane).** Brownfield = a per-tile flag bit
        (FLAG_BROWNFIELD = bit 2 of the existing `flags` raster in
        src/data/londonMap.ts; sim-side reader TILE_FLAG.brownfield +
        isBrownfield() in src/sim/map/types.ts). Pure scenario data — the
        map is rebuilt from getScenario().build(), never serialized, and
        SaveData carries no terrain/zone/flags — so **NO SAVE_VERSION
        bump** (stays at 11). Stamped onto the east-river industrial /
        dockland belt (Stratford / Dagenham works / Charlton-Woolwich /
        Grays-Tilbury) plus named regeneration sites (Greenwich gasworks,
        Surrey docks, Old Kent Rd depots, Lower Lea yards, Park Royal).
        (Render tint deliberately skipped — kept a pure gameplay flag, no
        touch to the map lane's tileChooser regions.)
    - [x] BROWNFIELD BIAS — findSite() in events/applications.ts makes one
          seeded preference draw (BROWNFIELD_BIAS = 0.72): the steer
          insists on previously-developed land, the rest take any eligible
          site. Battery/data-centre/wind schemes build on cleared
          brownfield even where the zone is industrial. Over 400 seeds
          brownfield takes >60% of new siting; the ~1 gen + ~1 demand/week
          cadence is preserved (same one chance() per stream).
    - [x] APPEALS / DETERMINATION — non-brownfield sites get a landType
          (greenfield / greenbelt / conservation) and open a ~30-day
          council determination window (status 'appeal', APPEAL_DAYS=30).
          Outcome PRE-ROLLED off the seeded rng at open time (save/load
          can't re-roll) and realised when the window closes (stepAppeals
          in tick.ts): approve → 'open' (ready to connect, fresh decide
          window); refuse → 'refused' (lapses). Brownfield + council-less
          coastal sites land 'open' at once.
    - [x] COUNCIL WEIGHTING — planningApproveOdds() in
          customers/adoption.ts: 0.5 + 0.32·ambition − 0.2·affluence,
          minus a satisfaction NIMBY term and a land penalty (conservation
          0.34 > green-belt 0.20 > greenfield 0.04), clamped 0.05–0.9;
          reads live council satisfaction via a satOf() threaded from
          tick.ts.
    - [x] NEWS BANNER — events/news.ts: newsApplicationSubmitted
          (brownfield celebrated; contested ones name council + clock +
          odds) and newsAppealOutcome ("Estuary Point council REFUSES the
          Estuary Sun solar array on green-belt grounds" / "Planning
          granted: Old Docks council approves …"); all coord-tagged
          (click-to-jump).
    - [x] INBOX — InboxPanel.tsx "IN PLANNING" section: "in planning —
          {council} to determine in N days (X% likely)", distinct from a
          ready-to-connect app; appeal sites render their map marker
          (worker.ts buildSites).
    - [x] VERIFIED: tests/planningAppeals.test.ts (15) + applications.test
          extended; full `npx vitest run` 452 green; tsc/eslint/build
          clean; `npx playwright test e2e/build.spec.ts` 4/4 on a fresh
          server (applications flow intact, baselines unchanged).

- [ ] **HEATHROW — bespoke design + PV/BESS opportunity (owner,
      2026-06-13 04:31, two images: in-game vs real top-down).**
  - [ ] In-game Heathrow "looks terrible" — currently two flat grey
        runway strips + one tiny building in open fields. Real Heathrow
        (ref: /root/.claude/uploads/86f13754-c4ec-5876-8bb6-a28892eab497/
        2fbb1823-IMG_2588.png) is a big CONCRETE complex: two parallel
        E–W runways with a dense terminal ISLAND between them — terminals
        (T2/T3/T5/T4), aprons, taxiways, satellite piers, control tower,
        cargo sheds, multi-storey car parks, perimeter road, parked
        aircraft; all tarmac/concrete, not grass. Build a bespoke multi-
        tile Heathrow stamp (londonMap.ts reservation + a dedicated
        concrete-airport sprite/tile family in render/sprites) that reads
        like the real airport from the iso camera. Coordinate with the
        air-layer (P7) so planes use the real runways. Folds into the
        Wave 8 MAP OVERHAUL (Heathrow sits inside that geometry pass).
  - [ ] SPECIAL OPPORTUNITY: at a random point in the game, Heathrow
        raises a BIG combined PV + BESS connection application (airports
        are doing exactly this) — a sizeable solar array + battery on the
        airport estate, sited on/beside the Heathrow reservation. A
        bespoke seeded-RNG event in events/applications.ts (deterministic
        timing window), flagged as the Heathrow scheme, with the usual
        firm/flex + connection-study handling. Coordinate timing with the
        events lane (events/** is mid-edit by the Wave 7 H&S lane).
  - [ ] Leverage the design skills (environment-art: concrete/tarmac
        material read, density, the runway-terminal hierarchy).

- [ ] **MAP / ROAD / DENSITY OVERHAUL (owner, 2026-06-13 04:26, two
      reference images: real top-down London map + a game screenshot of
      "road madness").** Supersedes prior incremental road/map passes.
      The owner's asks, verbatim-sourced:
  - [x] Roads take up too much real estate — NARROWED + FRONTAGE model
        (Wave 8 flagship). routeRibbons ROAD widths cut (street half
        0.05→0.04 + Z3/Z4 fill-floors halved; arterial 0.09→0.075;
        motorway Z3/Z4 floor dropped) AND the road-moat killed at the
        source: local CITY streets now stamp ONLY `streetTouch` (never
        the centre-clearing `RC.street`), so terraces KEEP fronting the
        narrow carriageway and the grey gutters close to a thin seam of
        building wall on both kerbs — the high-street wall (only country
        LANES keep centre-clearing). VERIFIED on the cityloop/highstreet
        crops: wall-to-wall fabric, no moats.
  - [x] Roads zig-zag like crazy — re-laid. Stopped running the major
        roads through `latticeThroughTowns` (the staircase source): the
        M25/radials/Circulars now sweep as smooth real alignments (the
        ribbon renderer rounds their corners) and only LOCAL lanes keep
        the lattice. The radial bundle reads as a converging spider's web
        (unit-pinned: ≥6 radials reach both centre and edge), no
        staircase on the `radials.png` crop.
  - [x] Method (owner pipeline) followed in order: RIVER (Thames re-cut:
        deeper Isle of Dogs loop + peninsula, smoother Woolwich/Gallions
        reach, wider estuary fan `2+14.5t²`→`2+18t²`) → MAJOR ROADS
        (spider web, smooth) → SMALLER roads (narrow + frontage) →
        DENSITY re-seed. SAVE_VERSION 9→10 (justified in isSaveData).
  - [x] Buildings too sparse — DENSER. Density field widened (`RMAX`
        46→60, base 1.09→1.16, thresholds 0.62/0.46/0.30→0.58/0.42/0.26)
        and the hole-punching noise CENTRE-WEIGHTED to near-zero in the
        core (calm mass) and ragged only at the green-belt edge. The
        focal mass now fills the inner third wall-to-wall (customers
        ~527k, unit-pinned dense inner core); terraces/blocks front the
        streets. (EnvArt density + 60-30-10 value hierarchy.)
  - [~] Landmarks GLEAM + missing landmarks — DEFERRED to a later wave
        (explicitly OUT of this lane's scope per the lane brief, with
        Heathrow + per-city assets + multi-city). Geometry/density/
        terrain/labels/edges shipped; landmark hero treatment is the
        next map wave.
  - [x] Town labels ILLEGIBLE on mobile — FIXED (game-ui-design). Killed
        the `*0.25` scale bug (towns rendered at ~3.75 screen px); labels
        now hold a screen-px FLOOR at any zoom (LONDON 30, towns 20,
        villages 14, named 13), a fatter navy halo (stroke 8→11) for
        simultaneous-contrast over pale core vs green fields, priority
        COLLISION declutter, and villages fade one band before towns
        (progressive disclosure). VERIFIED via Playwright shots at
        desktop (1280×800) + phone-landscape (844×390):
        preview/labels-{far,mid}-{desktop,mobile}.png.
  - [x] Leveraged the design skills — environment-art (density,
        visual hierarchy, leading lines, detail-at-transition),
        color-theory (terrain desaturation + dusk harmony), game-ui-design
        (label readable-at-size + declutter). Cited per change in the
        report.
  - [x] DESIGN PASS launched (read-only doc, runs alongside Wave 7):
        docs/map-overhaul.md — analyse both reference images + the
        current londonMap.ts generation + render pipeline; produce the
        river→roads→minor→density→landmarks→labels build plan with real
        road/landmark inventories and phased, previewable steps.
  - [x] IMPLEMENTATION = Wave 8 flagship — DONE for the geometry/density/
        terrain/labels/edges package (river, spider-web roads, narrow +
        frontage streets, denser fabric, organic green-belt terrain,
        no-rock-wall edges, legible labels). SAVE_VERSION 9→10. Full
        vitest green, tsc/eslint/build clean, build/undo/app e2e green on
        a fresh server. Landmarks-gleam + Heathrow + multi-city remain
        for later waves.

- [x] **URGENT mobile blocker — operator popup (owner, 2026-06-13
      04:01/04:04): "cannot play game on mobile … cannot close the
      popup as the accept button is off screen" + "the dear operator
      message is unnecessary and should be woven into the opening
      story."** FIXED (hotfix): StoryIntro overlay is now top-aligned
      + scrollable (padding + overflowY auto) so "rebuild it" is always
      reachable at phone-landscape; the separate cream Ofgem-LETTER
      card is removed — the mandate (year-1 allowance + CML target) is
      woven into the final story BEAT ("Your mandate") as flowing prose
      with a compact allowance/CML strip. story.ts beat 3 rewritten;
      e2e dismiss strings ("skip"/"rebuild it") preserved. Ships as a
      standalone hotfix PR ahead of Wave 7.

- [x] **H&S — full model (owner, 2026-06-13 03:58), expands ROADMAP #55
      / Wave 7 safety lane**: a build-a-safety-culture system. BUILT —
      VERIFIED (see the lane ledger entry below).
  - [x] CULTURE via INVESTMENT: invest in the H&S programme heavily
        (effectively unbounded) or not at all — the dial builds a
        safety culture surfaced as an EMPLOYEE ENGAGEMENT (safety)
        score that flirts ~90% when genuinely good. More invested →
        better culture → fewer incidents (monotone, with the same
        over-spend complacency plateau as pay/benefits below).
        (reliability/safety.ts safetyEngagement inverted-U peaking at
        PAY_PEAK=5/90%; cultureRateMul quarters the incident rate.)
  - [x] TWO METRICS (RIDDOR-grounded): (1) LOST TIME INCIDENTS — target
        0, <5 tolerable but any is awful — an employee injured and off
        the next day; cause mix: ELECTROCUTION (bad risk assessment /
        wrong PPE / wrong tools), FALL FROM HEIGHT (wrong equipment or
        design), ROAD TRAFFIC, EXCAVATION/CONSTRUCTION (machinery,
        falling, trench), SLIP/TRIP/FALL. Underspend in culture raises
        their rate. (2) VERY SERIOUS INCIDENT (potential-to-harm near
        miss, nobody struck): handbrake-off van rolls clear, neutral
        miswired could-have-electrocuted, public-reported OHL sag with
        no contact. NO DEATHS, ever — injuries only. (LTI_CAUSES +
        VSI_FLAVOUR; KpiDashboard LTI/VSI/culture/engagement rows;
        no-death-path unit-proven.)
  - [x] REGULATOR: LTIs draw fines from the workplace H&S regulator
        (research the GB body — HSE) onto the bill; sew the enforcement
        outcome in organically (improvement/prohibition notices,
        investigation, repeat-offence escalation). (HSE improvement
        notice with a 60-day deadline; un-met or repeat LTI → escalating
        fine HSE_FINE_BASE_K × noticeCount, rides the bill's penalty
        line via hseFineYrK.)
  - [x] Determinism: incidence off seeded RNG, rate driven by culture
        score × asset health (ageing.ts) × storm-surge crew-hours ×
        live-work exposure. Unit-prove the gradient (more spend +
        healthier kit → measurably fewer LTI/VSI vs same-seed control).
        (tests/safety.test.ts same-seed Monte Carlo: treated < control
        for both LTI and VSI.)

- [x] **Workplace culture → performance (owner, 2026-06-13 03:58)**: a
      pay-&-benefits / employee-engagement investment (health insurance,
      paid paternity, "you name it") that, more invested, lifts staff
      efficiency: faster fixes/restorations (lower CI/CML), shorter
      application/connection times, bigger innovation benefit + more
      opportunities, earlier overload early-warnings, proactive tree
      maintenance, faster fault response. Costs more for better outcomes
      with a COMPLACENCY PLATEAU — overpaying inverts the benefit. All
      such spend comes off the bill. Sits beside #53 directorates (likely
      the staffing/engagement dials of the directorate model). Folded
      into the running Wave 7 safety/directorates lane. BUILT — the pay
      dial's engagementBuff feeds fleet speed (faster restoration),
      connection cadence (more opportunities), satisfaction recovery,
      innovation odds, vegGrowthMul (proactive tree maintenance) and
      earlyWarnFrac; the inverted-U peaks at PAY_PEAK then inverts.
      VERIFIED in the lane ledger below.

- [x] **Wave 7 directorates / litigation / H&S lane (ROADMAP #53/#54/#55,
      this prompt) — VERIFIED.** The network business, get sued, and the
      full H&S model, built to the expanded owner spec, GB-grounded via
      deep research (HSE + RIDDOR over-7-day LTI / dangerous-occurrence
      VSI/HiPo, improvement notices + escalating fines, Bradley-curve
      decaying safety culture, ~90% engagement ceiling, wayleave/blight/
      GLO/liquidated-damages/PI litigation channels with settle-vs-defend,
      inverted-U pay→performance):
  - [x] **#53 Directorates + workplace culture** (events/directorates.ts):
        six funded directorate staffing dials (0–4, neutral 1 = as today)
        + a PAY & BENEFITS dial + a SAFETY PROGRAMME dial (0–PAY_MAX=10).
        engagementScore is an INVERTED-U peaking at PAY_PEAK=5 (~92%) and
        FALLING past it (complacency). orgYrK (directorate steps × £1.8m,
        pay × £1.4m, safety × £0.9m) rides computeBill's penaltyYrK in
        tick.ts (bill.ts untouched). At least THREE buffs wired to REAL
        mechanics, not parallel systems: fleetSpeedMul scales the
        stepFleet dtMin (faster restoration → lower CML), vegGrowthMul
        scales growVegetation's growthMul (proactive tree maintenance),
        connectionCadenceMul scales the application/tender/pitch spawn
        dtMin (more opportunities), plus satisfactionBonus (recovery),
        innovationSuccessMul (delivery odds) and earlyWarnFrac (earlier
        overload early-warnings) + the RIIO composite nudge. New
        DirectoratesPanel.tsx (segmented dials with the gold plateau
        marker, live £/yr + both engagement scores). Defaults are
        behaviour-neutral (every mul 1.0 at a fresh/undefined org).
  - [x] **#54 Litigation** (events/litigation.ts): claims from wayleave/
        nuisance (sustained pylon blight), injury (← an LTI), liquidated
        damages (a firm connection overdue beyond DAMAGES_ESCALATE_DAYS
        escalates ONCE), and group claims (a long mass outage past
        GROUP_OUTAGE_CUSTMIN). Inbox section with settle / fight /
        remediate — fight is one rng.chance() off a private seed⊕claim
        stream (deterministic per seed, never perturbs the tick RNG)
        against legalWinBase(org) + claim.strength (Safety & Compliance /
        Regulation funding shifts the odds). Costs ride claimsYrK on the
        bill's penalty line; resolution dents council satisfaction.
  - [x] **#55 H&S — full owner model** (reliability/safety.ts): the
        safety dial builds a culture surfaced as safetyEngagement (its
        own inverted-U, ~90% at the sweet spot). LTI + VSI rolled off the
        seeded RNG, rate = cultureRateMul × healthHazardMul(networkHealth)
        × storm/surge × live-work exposure. HSE improvement notice with a
        60-day deadline; un-met or a repeat LTI under an open notice →
        escalating fine. KPI dashboard gains LTI/yr (target 0), VSI/yr,
        safety-culture % and employee-engagement % rows. NO death path
        (unit-proven — text never says died/killed/fatal).
  - [x] All three serialize ADDITIVELY (no SAVE_VERSION bump): state.org/
        safety/claims/claimsYrK/groupOutageCustMin only appear once the
        player engages them; pre-feature saves hydrate to neutral. Event
        streams (incidents/claims) GATED to scenarioId === 'london', so
        tutorial missions stay free of suits and injuries.
  - [x] VERIFIED: tests/directorates.test.ts (14), tests/safety.test.ts
        (14), tests/litigation.test.ts (13) — dial costs ride the bill;
        the pay/safety inverted-U (benefit rises then falls past the
        plateau, ~90% ceiling); proactive veg + faster restoration buffs
        measurably move their real mechanic vs same-seed control; claims
        lifecycle (settle/fight/remediate → bill + satisfaction, fights
        deterministic per seed, lost fight > settlement, better funding
        raises win rate); damages escalation once per overdue connection;
        group-claim dedupe; the safety gradient (more spend + healthier
        kit → fewer LTI/VSI, same seed); HSE notice deadline + repeat
        fine escalation; no-death path; save round-trip + pre-feature
        hydration for all new state. Full `npx vitest run` 396/396 green
        (no regressions alongside the concurrent lane); `npx tsc -b`,
        `npx eslint src tests e2e tools`, `npm run build` clean; e2e
        app+controls green on a fresh server. SCREENSHOTS inspected at
        desktop (1280×800) AND phone-landscape (844×390):
        preview/org-directorates-{desktop,mobile}.png (panel reads, dials
        + gold plateau marker, 90%/92% engagement) and
        preview/org-kpis-{desktop,mobile}.png (LTI/VSI/culture/engagement
        rows render and read) via SHOTS=1 e2e/orgshots.helper.spec.ts.
  - [~] HUD button + App.tsx mount for DirectoratesPanel handed to the
        integrator (Hud.tsx and src/app/** are the concurrent lane's
        files): exact JSX + insertion points in the lane report. The
        component, store flag (directoratesOpen) and commands are all in
        place — only the mount line and a HUD button remain.

- [x] **Campaign IS the tutorial + mission-1 wind step stalled (owner,
      2026-06-13 00:22)**: "The campaign mode should be the tutorial
      really. The instruction was to [designate] onshore wind, but
      nothing happened when i did, and so i just had to skip tutorial."
      BUILT — VERIFIED (Wave 7 flagship tutorial lane; see lane ledger
      entry below).
  - [x] Restructure: the start-menu TUTORIAL entry launches campaign
        mission 1 (First Light) directly (beginMission); the separate
        london tutorial step strip is RETIRED — Tutorial.tsx is
        mission-only, sandbox new game starts clean (story + goal
        ladder, no auto strip). Campaign progress/locks unchanged.
  - [x] BUG repro + fix — ROOT CAUSE (00:25): the CAMERA never fitted
        the tiny mission map. FIX: pure unit-tested fit + pan-clamp
        maths (src/render/cameraFit.ts) + MapRenderer.lockToBounds /
        focusTile / applyLockClamp wired into pan/zoom/pinch/wheel;
        MapView centres + zoom-FITS on the mission map on start and
        CLAMPS to its bounds, with a TOP RESERVE so the map sits below
        the step strip (the strip otherwise covered the ridge); steps
        declare a focus the camera glides to (m1 step 2 → M1_WIND ridge,
        step 4 → the village). Regression e2e drives the wind
        designation through the REAL canvas tap path at 844×390 hasTouch
        (rail tool → pointer tap on the ridge → tender opens) and
        asserts BOTH village + ridge are on-screen AND the tap point is
        the topmost canvas (clear of the strip/rail).
  - [x] Progressive disclosure (00:28): per-step CUMULATIVE unlocks as
        data on MissionStep/Mission (missions.ts; missionUnlocks)
        consumed UI-side (src/ui/unlocks.ts useUnlockGate): BuildPalette
        + MobileChrome rail show ONLY unlocked build tools (m1: onshore
        wind → dist sub → 33 kV line as steps reach them; m2 offshore →
        grid sub → 132 → 33; m3 depot+fleet, no gen tools); HUD buttons
        (balance/headroom/N-1/forecast/KPI/allowance) + desktop panels
        (bill/fleet/inbox/alerts) + mobile chips gated to the surfaces a
        mission teaches; ambient news quieted on missions (one flagged
        single-condition gate in events/news.ts). Sandbox keeps the full
        HUD untouched.
  - [x] HUD TOUR (pulls ROADMAP #40 forward, struck there):
        src/ui/HudTour.tsx — guided spotlight bill → clock/speed/skip →
        palette → inbox → balance → KPIs → map inspector, dim cutout
        highlight per target + callout, next/skip, once-flag
        ('ec-hud-tour-v1'), launchable from the start menu ("tour the
        controls") and a ? affordance in the HUD; works phone-landscape
        + desktop (live element-rect measurement follows the layout).
  - [x] Loud refusals: a refused siting click during a mission shows the
        reason prominently right under the step strip (Tutorial.tsx ⚠
        banner off store.toast), not just the small corner toast.

- [x] **LOFI BEAUTY PASS (owner, 2026-06-12 21:04): "I've empowered you
      with lots of design skills. I want you to use them all to make
      the game more beautiful on that lofi aesthetic."** BUILT (Wave 6
      beauty lane); the vendored skill packs were read first and drove
      the choices (color-theory: one analogous sunset ramp + WCAG
      floors; environment-art: colour scripting + hero-contrast
      hierarchy; game-ui-design: touch targets + readability;
      frontend-design: glass/type rhythm; pixel-art silhouette/ramp
      doctrine for the tint work):
  - [x] #41 day/night grading: new `src/render/grade.ts`, a PURE
        colour script keyed off simTimeMin + live weather — golden
        arc navy night → pink dawn → soft warm day (NEVER noon-white)
        → gold → sunset orange → purple dusk; dawn/dusk hours ride
        seasonFactor (midwinter dusk ~16:30, midsummer ~22:00).
        Applied in MapRenderer as a CONTAINER TINT on the world fabric
        (city/smog/assets/fleet — no extra GPU pass, and reliable
        where Pixi's multiply blend silently no-ops under software
        GL); network lines + alert overlays stay UNTINTED so the grid
        reads as the hero at night. Plus: screen-space sky gradient,
        baked radial vignette, and an ADDITIVE glow layer above the
        tint — an energized-window light field (1 texel per powered
        customer tile, the suitability-matrix trick, melts into soft
        pools under linear filtering) + gentle bloom halos on subs and
        turbine hubs. Powering a district literally makes it glow;
        unpowered streets stay cold and dark. Grade eases (~2.5/s
        exp) so time-skips arrive as fronts; grid view drops the tint
        (true engineering colours). The old static CSS wash + vignette
        divs in App.tsx came out — superseded by the live grade.
  - [x] #42 rain & storms: pooled streak layer (≤~170 wind-slanted
        strokes, screen-space, redrawn only while raining;
        prefers-reduced-motion disables) keyed off the windy-wet
        regime + cloud; storms grade darker/cooler with heavier,
        faster rain and an occasional decaying lightning wash; a wet
        sheen lifts the shadows. Rainy-day-cosy, never horror-dark —
        luminance floors unit-pinned.
  - [x] #44 seasonal fields: `seasonOf` + `seasonTintFor` multiply
        ramps over crop/grass/canopy sprite families (winter
        drab/bare-plough, spring green flush, summer gold = the base
        art, autumn stubble + amber trees; built fabric never tints).
        Renderer re-tints on the quarter flip (one property write per
        sprite); tools/preview.ts gained SEASON=… parity so the
        review loop sees the seasons.
  - [x] World palette harmonised onto the sunset ramp
        (sprites/palette.ts): water dustier (#4878b8/#345492), water
        glints now WARM sunset peach (#f0c391 — was noon-cyan, the
        biggest off-ramp outlier), tower glass reflects the dusk
        (#b4b4d8, was cold sky-blue). Atlas cache self-invalidates
        via the existing code fingerprint.
  - [x] UI polish: theme.ts → dusk-glass panelStyle (navy→purple
        gradient + backdrop blur + warm gold hairline + inset
        highlight + letter-spacing), shared headingStyle small-caps
        rhythm; slate token lifted #6b7591→#8d97b4 (muted text was
        3.9:1 on navy — below AA; now 6.1:1, pinned in tests). Mobile
        chrome touch targets: panel chips 36→42 px, build-rail
        buttons 36→40 px (the 44 pt floor), InfoPanel frame cleared
        of the wider chips. Test hook gained a render-only
        `setAtmosphere` override for screenshot staging (sim
        untouched; determinism unaffected — everything is render-side
        off existing snapshot fields).
  - [x] VERIFIED: tests/grade.test.ts (13) — arc anchors incl.
        never-harsh-noon + cosy-night/storm luminance floors,
        season-shifted dusk, rain/storm/wet mapping, season buckets,
        tint families + built-fabric exclusion, WCAG helpers + theme
        token contrast pins. Full `npx vitest run` 342 green;
        `npx tsc -b`, `npx eslint src tests e2e tools`,
        `npm run build` clean; e2e app.spec + controls.spec green on
        a fresh server. IMAGES INSPECTED — and pixel-averaged to
        confirm the grade objectively (small thumbnails fooled the
        eye once): preview/beauty_{day,golden,sunset,dusk,night,
        rain_day,storm,rain_dusk}.png via the new SHOTS=1
        e2e/beautyshots.helper.spec.ts (night: powered terraces glow
        warm beside a bloomed substation while the forest sits cold;
        storm: slanted streaks with lit windows shining through);
        preview/beauty_fields_{winter,spring,summer,autumn}.png;
        preview/beauty_central_after.png + beauty_thames_close.png;
        preview/beauty_ui_{desktop,mobile}*.png. Perf: tint = zero
        extra passes; new layers total 1 sprite + 1 gradient + 1
        vignette quad + streaks only while raining.

- [ ] **Mobile/desktop design principle (owner, 2026-06-12 21:14)**:
      added to CLAUDE.md design principles — everything must work
      beautifully on BOTH mobile and desktop web; mobile assumes a
      LANDSCAPE hold.
  - [x] Build: portrait-hold detection on touch devices → a styled
        "rotate your phone" prompt overlay (lofi-branded, dismissible
        never — it clears on rotate; menus may remain usable portrait).
        DONE with the tutorial-campaign lane: src/ui/RotatePrompt.tsx
        ((pointer: coarse) + (orientation: portrait), gameplay only —
        menuOpen keeps the menus usable portrait), mounted in App.tsx;
        e2e/campaign.spec.ts flips 844×390 ↔ 390×844 with hasTouch and
        asserts the overlay appears and clears.
  - [x] Audit pass: existing panels (Bill/Balance/Info/Inbox/KPI) at a
        phone-landscape viewport (~844×390) — DONE with the lofi
        beauty pass (Wave 6): screenshots at 844×390 (true coarse-
        pointer emulation) AND 1280×800 via SHOTS=1
        e2e/beautyshots.helper.spec.ts → preview/beauty_ui_*.png, all
        inspected (panels read, nothing clips, glass chrome coherent
        with the dusk world); touch-target fixes shipped (chips 42 px,
        rail 40 px, InfoPanel clears the chip column).

- [x] **TRANSPORT OVERHAUL (owner, 2026-06-12, with screenshot): "The
      roads are still goofy as shit. Real overhaul rethink of how to
      get a really realistic looking road, rail, boat, and air
      network."** — supersedes incremental road tweaks. COMPLETE:
      P0–P4 (Wave 5) + P5–P7 (Wave 6) all shipped; sub-items below. Owner's
      screenshot (zoomed-out city): roads read as thin noisy squiggles,
      no visible hierarchy/junctions, river blobby, rail invisible.
      Plan: deep design pass FIRST (read-only audit of routes→raster→
      tileChooser→sprite pipeline + reference research), then implement
      as the flagship lane of the next wave once render/** frees up
      (currently owned by the voltage/hydrogen lane). Scope: roads
      (hierarchy widths, true junction geometry, motorway dual
      carriageways/roundabouts/bridges), rail (ballast/sleepers,
      stations, trains), boat (river as smooth vector ribbon? piers,
      wakes, routes), air (Heathrow/City flight paths, planes).
      - [x] Design doc produced (docs/transport-overhaul.md) + audit
            crops preview/audit_*.png inspected against the owner's
            screenshot. Verdict: routes are screen-space strokes that
            ignore the iso projection, with no zoom declutter, no
            casing/hierarchy, accidental junctions, Lego shorelines,
            and tools/preview.ts is blind to transport entirely. Plan:
            P0 preview parity (shared routeRibbons.ts) → P1 projected
            ground-plane ribbons + casing + 5 zoom bands (the core
            fix) → P2 junctions/roundabouts → P3 bridges/piers/layer
            split → P4 shoreline smoothing → P5 rail identity → P6
            boat wakes → P7 air layer. Implementation = next wave's
            flagship lane.
      - [x] Implementation P0–P4 (Wave 5 transport lane): P0 preview
            parity (shared src/render/routeRibbons.ts consumed by BOTH
            MapRenderer and tools/preview.ts — preview now composites
            ground → shoreline → ribbons → structures, ending preview
            blindness to transport); P1 projected ground-plane quad-strip
            ribbons w/ mitred joins, cartographic casing→fill passes
            (class ascending; junctions merge for free), width hierarchy
            (motorway 0.30 t … lane 0.07 t), 5 zoom bands + geometric
            sub-buckets w/ ±10 % hysteresis, lazy per-band Graphics (≤2
            cached, LRU destroyed), screen-px width floors (M25 always
            ≥4 px), verge halo killed, edge-line offset bug fixed
            (perpendicular in tile space); P2 derived junction discs
            (165), roundabouts at arterial meets (14, annulus + green
            island), motorway grade separation (47 overpasses: shadow +
            lifted deck + parapets, no at-grade motorway junctions); P3
            bridges as structures (75 derived spans: piers, deck lift,
            water shadow, parapets split boat→routes→vehicles→bridgeTop
            so boats pass under and cars ride behind the near railing;
            Tower Bridge reservation skipped; Southend = wooden pier;
            vehicle lift = class deck height); P4 shoreline smoothing
            (marching squares + 2× Chaikin over the water mask, flat
            water/bank bands + ink waterline + foam, stone embankment
            through town, marsh on the estuary flats — visual only, no
            CityMap change, no SAVE_VERSION bump).
      - [x] VERIFIED (Wave 5 transport lane): tests/routeRibbons.test.ts
            (18 new) — band thresholds + hysteresis, class declutter per
            band, width-floor maths on emitted geometry, mitre bound at
            lattice L-corners, quad winding, junction derivation
            determinism (≥3 meets; motorway crossings excluded), overpass
            + span derivation (bridge/pier/Tower-Bridge-plain), parapet
            layer split, shoreline contour closure/Chaikin counts/band
            emission. Full vitest 311 green; tsc/eslint/build clean;
            e2e undo+build+app+controls+mobile green on fresh servers
            (picking/demolish unaffected — all new layers eventMode
            'none'). IMAGES INSPECTED: all 7 audit crops re-rendered
            (preview/after_*.png) + 1:1 close-ups (zoom_*.png) + 5
            in-game shots (preview/shot-transport-*.png via new
            SHOTS=1 e2e/transportshots.helper.spec.ts). Emission ≤35 ms/
            band, derivation 100 ms once, shoreline 44 ms once.
      - [x] P5–P7 (Wave 6 transport lane): P5 rail identity — far-zoom
            cross-tick symbology (railFar line + cream ticks every
            1.5 t at Z0/Z1; Z2 ticks ride the ballast; Z3+ keeps
            ballast bed + sleeper ticks + twin steel) and DERIVED
            station platform slabs (TransportGeometry.stations: rail
            path within 1.6 t of an lm_station landmark → 1.4 t
            casing+slab on the landmark side, canopy strip at Z3+,
            termini fans deduped — 16 slabs on London, no data
            change); P6 boat wakes — emitBoatWakes in routeRibbons.ts
            (pure world-px V-wakes: two diverging 3-segment foam arms
            per barge fading astern, WAKE_MAX_SEGS=60 cap) drawn into
            wakeG UNDER the hulls in boatLayer, rebuilt per frame only
            while boats are visible at Z2+; P7 air layer — additive
            AIRPORTS export in londonMap.ts (Heathrow only; render-side
            scenery, never serialized, NO SAVE_VERSION bump) +
            src/render/airLayer.ts (pure deterministic quadratic arcs,
            2 westerly departures + 2 easterly arrivals, altitude
            profile + map-edge fade, NO RNG): emitFlightArcs faint
            lifted dashes per band + emitPlanes (altitude-scaled
            ground shadow displaced z·(−0.55,+0.3), cream silhouette +
            orange tailfin, screen-px size floor), mounted above
            structureLayer in city, eventMode 'none', planes declutter
            IN from the mid band outward (bands 0–2), tutorial
            mini-maps get empty skies; preview.ts composites the same
            air emitters (parity doctrine). PLUS the exposed map-data
            debt: the two authored staircase lanes near Dartford
            re-laid in londonMap.ts — "Tilbury → Grays → the A13"
            ([[182,92],[178,90],[177,85]] → axis-aligned lattice runs
            [[182,92],[178,92],[178,90],[178,85],[177,85]]) and
            "Gravesend → Hoo" ([[188,106],[206,110]] → in-town row run
            + open-marsh sweep [[188,106],[198,106],[203,108],
            [206,110]]); endpoints/junctions preserved, road raster
            stays gameplay-valid (map invariant suite green), no
            SAVE_VERSION bump (routes/raster are not serialized; both
            corridors keep their tiles ±1).
      - [x] VERIFIED (Wave 6 transport lane): tests extended —
            routeRibbons.test.ts (rail tick emission per band +
            perpendicular orientation + spacing count, Z3 sleeper
            switchover, station slab derivation determinism/side/
            range/dedupe, wake fade + BEHIND-the-boat + cap +
            determinism) and new tests/airLayer.test.ts (11: AIRPORTS
            shape/bounds, never in a serialized save, 4 deterministic
            arcs flying the westerly operation, altitude endpoints,
            planeAt purity + duration periodicity + unit tangent +
            edge fade, arc/plane emission determinism + bounded counts
            + shadow-before-silhouette + lift above shadow). Full
            `npx vitest run` 342/342; tsc/eslint/build clean;
            e2e undo+build green on a fresh server. IMAGES INSPECTED:
            preview re-renders (after_m25_heathrow — plane + arc over
            the climb-out, after_estuary_dartford/southend_far — rail
            now reads line+ticks, never thin-street; lane_grays_after/
            lane_gravesend_after — staircases gone, clean lattice runs;
            _stations crop — Dartford platform slab beside the line)
            and in-game frames (shot-transport-* incl. barge V-wakes on
            the estuary and the white silhouette + tailfin climbing out
            of Heathrow; transportshots helper now pins a midday grade
            via the beauty lane's setAtmosphere hook so transport is
            judged in daylight). Known residual (out of lane scope —
            arterial, not lane): the A2's in-town lattice jogs through
            Gravesend still read wiggly at Z3; doctrine-compliant but
            worth a future waypoint pass.

- [ ] **"Do all" campaign (owner, 2026-06-12): implement ROADMAP.md in
      full**, tier by tier in gated waves. SHIPPED: Wave 1+1b (#1
      waypoints, #5+#20 seasons/regimes, #6+#7 goals+time-skip, #2
      headroom heatmap, #4 labels+search, #3 planner + #25 ring-main,
      #8 N-1 view, #9 storm prep, #51 story opening); Wave 2 (#10
      forecast overlay, #11 interconnector, #12 battery policy, #13
      losses, #52 bill drill-down); Wave 3 (PR #21: #14 CfD rounds,
      #17 constraint bidding, #15 asset ageing, #16 maintenance
      windows). WAVE 4 complete pending gate (→ PR #22): TUTORIAL
      CAMPAIGN + rotate prompt + stale-save bug fix, #18 smart
      charging, #24 ToU tariffs, #19 capacitor banks, #23 hydrogen;
      transport-overhaul design doc shipped alongside; Wave 5 (PR #23:
      transport P0–P4 + generation footprints). WAVE 6 complete
      pending gate (→ PR #24): LOFI BEAUTY PASS (#41 grading, #42
      rain/storms, #44 seasonal fields, palette harmonisation, UI
      polish + mobile audit, AA contrast fix) + transport P5–P7 (rail
      symbology + stations, boat wakes, Heathrow air layer, Dartford
      lanes re-laid) — TRANSPORT OVERHAUL owner entry complete. Wave 7
      next (flagship): TUTORIAL OVERHAUL — campaign IS the tutorial,
      mission camera lock, progressive disclosure, HUD tour (#40
      pulled forward). Then Tier 2 remainder (#21 heat networks, #22
      scenario seeds, owner items #53–#55) and Tiers 3–4. Items tick
      off in ROADMAP.md with PR links as they land.

- [ ] **Map recognisability pass 2** (owner can't model 1M properties; keep it
      sensible/enjoyable): continue tuning until London "reads" at a glance.

- [x] **Generation footprints to scale (owner, 2026-06-12): "the new
      design for the bulk supply points [is] really good but you
      haven't applied that to like the coal power station — it should
      be massive, have like six cooling towers etc. Scale things like
      the wind farms to be proportionate to the capacity… solar: 5 MW
      might be one tile, 100 MW [many] tiles."** BUILT (Wave 5
      footprints lane — see the lane ledger entry below).
  - [x] Coal station MASSIVE: 4×3 Drax/Ratcliffe-class campus — SIX
        hyperboloid cooling towers in two staggered ranks (steam
        wisps baked, live smog rides output as before), tall boiler
        house + 124-unit chimney, long glazed turbine hall, coal yard
        with twin spoil cones + enclosed conveyor gallery on trestles,
        rail siding with loaded hopper wagons + buffer stop. Full
        nuclear-campus treatment via the existing footprint plumbing
        (per-tile siting, occupancy, pylon blocking, ghost fp, line
        endpoints, demolish cascade) — catalog footprint [3,2]→[4,3]
        is the only siting change; sprite preview inspected; atlas
        4096×3883, under the mobile ceiling.
  - [x] Capacity-proportional footprints for farm-type gen: the
        mechanic is DEVELOPERS BID WHAT FITS. Designation flood-fills
        the contiguous open land around the tile (BFS, Chebyshev
        radius ≤9, static map features only) → Tender.fitMW; every
        bid offers min(catalog ask, fitMW) (Bid.mw, shown on the bid
        card as "N MW — what fits this site" when reduced); the award
        stamps GenAsset.mw and the claimed tile set is DERIVED from
        anchor+MW (farms.ts farmClaimTiles — prefix-stable BFS blob;
        never serialized, no SAVE_VERSION bump; old saves hydrate to
        1-tile plants byte-for-byte). Densities: solar 10 MW/tile
        (5 MW = one tile, 100 MW = ten-tile field), onshore wind
        5 MW/turbine-tile spread on the anchor-parity checkerboard
        (spacing gaps stay open farmland), offshore 20 MW/tile over
        the estuary wind zone. Claims get occupancy + pylon blocking
        + demolish-cascade through footprintTiles; the award caps MW
        to the free claim prefix if the site tightened since bidding;
        dispatch/balance/sparkline/InfoPanel read the awarded MW;
        town infill skips claimed tiles. Renderer draws one sprite
        per claimed tile (solar panel rows tile into field arrays;
        wind gets a turbine pair + live rotors per claimed tile —
        turbine floors made transparent so the machines stand in the
        crops, not on pasted lawns).
  - [~] CCGT/battery kept 1×1 (deliberate): both are seeded on the
        london map at sites validated as single tiles — a footprint
        bump would silently claim un-validated neighbour tiles under
        existing saves and seeded plants. Nuclear (3×2) / coal (4×3)
        keep fixed campuses as designed. Customer-application plant
        (respondApplication) also stays 1-tile/catalog-MW — only the
        tender market scales; revisit if the owner wants apps scaled.
  - [x] VERIFIED (Wave 5 footprints lane): tests/footprints.test.ts
        (14 new) — coal campus 4×3 claims/blocks/cascades exactly like
        nuclear's (12-tile footprint, sub-on-campus refused, overhead
        route across it places no supports on it, demolish takes the
        connected 400 kV circuit), available-land MW cap (3-tile islet
        → 30 MW bids; town-locked anchor → 10 MW; open farmland → the
        full 50 MW ask; designation stamps Tender.fitMW and trickle
        bids carry Bid.mw), award claims the right tile count (5 MW
        solar = 1 tile, 100 MW = 10; awarded asset occupies its whole
        field; award caps to the free prefix when a sub landed on the
        claim mid-tender), wind spacing parity + radius cap, claim
        derivation determinism + prefix stability, awarded MW save
        round-trip re-deriving identical tiles, and old-save (no
        mw/fitMW) hydration to single-tile plants with bids still
        flowing. Full `npx vitest run` 293/293; `npx tsc -b`, `npx
        eslint src tests e2e tools`, `npm run build` all clean (run
        alongside the transport lane's in-tree work). Seeded london
        plants (CCGT/peaker/solar/wind) keep 1×1 footprints — e2e
        baseline asset counts untouched. Sprite previews rendered and
        INSPECTED: preview/sprite_gen_coal.png (six towers, conveyor,
        rail siding all read), preview/footprints_insitu*.png (10-tile
        100 MW solar field + 20-turbine-tile wind farm + coal campus
        composited on the real Essex countryside with the renderer's
        placement math). Atlas 4096×3883 ≤ 4096.

- [ ] Car parks gain EV charging load (flagged "in future" by owner).

- [ ] Town evolution: densification of existing areas (only edge infill today).

### Wave 9 — MISSING LANDMARKS + LANDMARK GLEAM + BESPOKE HEATHROW + Heathrow PV/BESS (owner, 2026-06-13)
- [ ] **Missing landmarks (owner: "I still think many are missing").**
      Add the heroes map-overhaul §5 identified at true relative positions
      as bespoke art-is-code sprites in the ink-contour style with proper
      multi-tile reservations: Wembley arch, the O2/Dome (Greenwich
      peninsula), Crystal Palace mast, Alexandra Palace, ExCeL/Royal Docks,
      Kew Palm House, BT Tower; and give the Gherkin a real LANDMARK id.
      Register in NAMED_PLACES + the landmark sprite/atlas path. ~6-8 heroes.
- [ ] **Landmark gleam (owner: "The landmarks dont pop as hard. Can they
      perhaps have a special gleam").** A warm specular highlight (sunset
      gold ~#ffe6b0) baked on the hero sprites + a soft bloom that pulses
      with the day/night glow on the EXISTING bloom layer (a landmarkGleam
      pass on MapRenderer.bloomG; coordinate with grade.ts), plus a
      travelling glint on glass heroes. Reads desktop + phone-landscape,
      survives the softened day/night grade.
- [ ] **Bespoke Heathrow (owner: "Heathrow looks terrible… its all
      concrete… specially design heathrow").** A bespoke multi-tile
      concrete-airport stamp: terminal island (terminals, aprons, taxiways,
      satellite piers, control tower, cargo sheds, MSCPs, perimeter road,
      parked aircraft) between two parallel E-W runways; londonMap.ts
      reservation extends/replaces the west AIRPORTS area; air layer keeps
      the real runways.
- [ ] **Heathrow PV+BESS opportunity (owner: "make opportunity
      specifically for heathrow to get a big pv and bess installation
      application at random point in the game").** A bespoke seeded-RNG
      special connection: at a deterministic point Heathrow raises a BIG
      combined PV + BESS scheme on/beside the airport estate, flagged as
      the Heathrow scheme, sited at the reservation, handled through the
      normal firm/flex + connection-study flow, surfaced on the news
      banner. Deterministic, once per game.

## Done (chronological, latest first)

### Wave 8 flagship — MAP OVERHAUL (river · spider-web roads · frontage · density · terrain · edges · labels)
- [x] **Map overhaul geometry/density/terrain/labels/edges package
      (Wave 8 flagship lane, owner 2026-06-13). VERIFIED.** Built to
      docs/map-overhaul.md in the owner's pipeline order. (Landmarks-gleam,
      Heathrow, per-city assets, multi-city were OUT of this lane.)
  - [x] PHASE 1 RIVER — Thames re-cut in londonMap.ts `RIVER_PTS`: deeper
        Isle of Dogs loop (bottom to y≈99, peninsula tip back to y=84),
        smoother Woolwich/Gallions S-reach, broader estuary fan
        (`riverHalfWidth` ceiling `2+14.5t²`→`2+18t²`, centreline held
        lower). Riverside landmarks/bridges re-verified on the new spline.
  - [x] PHASE 2 MAJOR ROADS — stopped lattice-snapping the M25/radials/
        Circulars (the staircase source); they now sweep as smooth real
        alignments (the ribbon renderer rounds corners), only local LANES
        keep the lattice. The North/South Circular re-anchored east of the
        deepened loop (x=145 crossing); the south-bank A2 + both embankment
        arterials kept clear of the loop. Reads as a converging spider web.
  - [x] PHASE 3 MINOR ROADS + FRONTAGE — narrowed routeRibbons ROAD widths
        (street 0.05→0.04 + halved Z3/Z4 floors, arterial 0.09→0.075,
        motorway Z3/Z4 floor dropped) AND killed the road-moat: city
        streets stamp only `streetTouch` (never the centre-clearing
        `RC.street`), so terraces front the kerb wall-to-wall (lanes keep
        centre-clearing). High-street wall confirmed on the crops.
  - [x] PHASE 4 DENSITY — `RMAX` 46→60, base 1.09→1.16, thresholds
        0.62/0.46/0.30→0.58/0.42/0.26, hole-punching noise CENTRE-WEIGHTED
        (calm core, ragged green-belt edge). Inner third fills wall-to-wall
        (~527k customers, unit-pinned dense core).
  - [x] PHASE 5 TERRAIN — organic enclosures (crop keyed off the variable
        field-cell variant, not a 4×4 grid; grass-led green-belt mix),
        palette desaturated into the English gamut (field/rape de-luted,
        moor brown→lush green, summer tints off the parched gold).
  - [x] PHASE 7 EDGES — removed the rock-wall rim (the blanket top/bottom
        `TERRAIN.hill` fill); uplands are now narrow real Chiltern/North-
        Downs ridges and the rim resolves into countryside/sea.
  - [x] PHASE 6 LABELS — killed the `*0.25` scale bug; screen-px floors
        (LONDON 30/towns 20/villages 14/named 13), fatter navy halo
        (8→11), priority collision declutter, villages fade a band before
        towns. Legible at phone-landscape.
  - [x] SAVE_VERSION 9→10 (state.ts) + isSaveData justification: map
        geometry (river/roads/density) moves tile land/water/road/zone
        indices, so v9 assets can sit on what is now water/road/protected.
  - [x] VERIFIED: tests/londonMap.test.ts +3 invariants (no rock-wall rim,
        dense inner core, radials converge as a web) + updated Circular
        bridge column; full `npx vitest run` 420/420 (applications cadence
        test given explicit 30s headroom — denser map sim); `npx tsc -b`,
        `npx eslint src tests e2e tools`, `npm run build` clean.
        build/undo/app e2e green on a fresh server (single-worker 11 pass
        + 1 flaky-retry-green; the prior 2-worker timeouts were render
        contention from the denser scene, not logic — sim ticks measured
        fast: 30 game-days in 0.7s, clock advances 3877 sim-min in 8s in an
        isolated browser repro). Upland bands tightened to trim the hill
        sprite budget. IMAGES INSPECTED at the doc's audit coords:
        preview/p4_wholemap, p2_radials, p1_estuary, p3_central,
        p3_highstreet, final_cityloop, p7_wholemap (web reads, dense
        high-street frontage, organic green-belt, no rock rim) + labels via
        Playwright preview/labels-{far,mid}-{desktop,mobile}.png.

### Wave 7 flagship — TUTORIAL OVERHAUL (campaign IS the tutorial)
- [x] **Campaign = tutorial · mission camera lock · progressive
      disclosure · HUD tour (this prompt; Wave 7 flagship tutorial
      lane)** — VERIFIED.
  - [x] Campaign = the tutorial: start-menu "tutorial" → mission 1
        (First Light) directly (StartMenu beginMission); the standalone
        london step strip RETIRED (Tutorial.tsx mission-only; sandbox
        new game opens clean — story + goal ladder, no auto strip).
  - [x] Mission camera lock (THE bug): new src/render/cameraFit.ts —
        pure, unit-tested fit + pan-clamp + top-reserve maths (worldBox
        of the iso projection; centre + zoom-FIT; clamp every pan so the
        tiny map never drifts off-screen; reserve top px for the step
        strip). MapRenderer gained lockToBounds / focusTile /
        applyLockClamp (guarded on app.renderer so a focus glide that
        fires before init resolves or after teardown is a no-op, not a
        crash) wired into drag/pinch/wheel/setZoom. MapView centres +
        FITS on mission start (reserve 104 px) and glides to each step's
        declared focus (m1 step2 → M1_WIND ridge, step4 → village).
  - [x] Progressive disclosure: Unlock data on MissionStep/Mission
        (cumulative per step; missionUnlocks) + src/ui/unlocks.ts
        useUnlockGate; BuildPalette + MobileChrome rail show only
        unlocked build tools; Hud buttons + App desktop panels + mobile
        chips gated to taught surfaces; ambient news quieted on missions
        via ONE flagged single-condition gate in events/news.ts.
        Sandbox keeps the full HUD.
  - [x] HUD tour (ROADMAP #40, struck): src/ui/HudTour.tsx spotlight
        walkthrough (bill → clock/speed/skip → palette → inbox →
        balance → KPIs → inspector), dim cutout + callout, next/skip,
        once-flag, ? affordance + start-menu launch, phone-landscape +
        desktop.
  - [x] Loud mission refusals: ⚠ banner under the step strip
        (Tutorial.tsx off store.toast).
  - [x] FLAGGED shared-file edits for the concurrent safety/events lane
        to integrate: (1) events/news.ts — one early-return
        `if (state.scenarioId !== 'london') return;` at the top of
        maybeAmbientNews (mission news gate); (2) InboxPanel.tsx — one
        additive `data-tour="inbox"` attribute on the panel root (HUD
        tour spotlight target). Both single, tightly-anchored, additive;
        neither touches their logic.
  - [x] VERIFIED: tests/cameraFit.test.ts (8 — worldBox margins, every
        m1 tile + the village in the 844×390 viewport on start, band
        centring, zoom clamp, top-reserve clears the strip, pan-clamp
        re-centres a shoved camera / holds edges when zoomed in) +
        tests/missions.test.ts extended (per-step cumulative unlocks for
        m1/m2/m3, no untaught gen tools ever unlock, mapBounds spans the
        tiny map, village+ridge within bounds). Full `npx vitest run`
        355 green (the concurrent safety lane's files type-error under
        exactOptionalPropertyTypes — theirs, not mine; tests pass).
        tsc/eslint/vite build clean for my files (whole-repo `tsc -b`
        and `npm run build` blocked only by the other lane's in-tree
        type errors in safety.ts/litigation.ts/state.ts/tick.ts). e2e
        campaign.spec rewritten to the REAL UI path at 844×390 hasTouch
        (menu "tutorial" → mission 1; camera-fit asserts village+ridge
        on-screen; progressive palette shows only Onshore wind at the
        wind step; rail tap → ridge tap → tender; award → wires →
        victory + campaign record) + HUD-tour smoke + accordion +
        rotate-prompt; menu.spec updated (tutorial launches m1, sandbox
        clean). Screenshots inspected (mission1 desktop+phone, tour
        overlay).

### Wave 3 + Wave 4 of the roadmap campaign (PR #21 merged; Wave 4 → PR #22)
Wave-lane ledger entries swept from Open on 2026-06-12 22:11:

- [x] **Smart charging + ToU lane (Wave 4): ROADMAP #18 per-council
      smart-charging lever and #24 time-of-use tariffs.** Finished the
      killed predecessor's partial work (its helpers in
      customers/smartCharging.ts, commands.ts union+case, adoption.ts
      optional `smartCharging` flag, innovation.ts `touTariff`
      tech/pitch/dip-offset, demand.ts `touDomesticRatio` were all kept;
      the missing tick.ts wiring, bill ride, satisfaction hooks, UI and
      tests were built fresh). #18: `setSmartCharging` command, majority-
      council-per-catchment v1 EV re-shaping in shapeSubLoads (called
      from tick.runPowerFlow), live £k/yr rate (council EV count ×
      £20/EV/yr from stepCouncils) rides the flexibility bill line the
      way stormPrepYrK rides penaltyYrK, +3 satisfaction target while
      funded, refusal below satisfaction 50. #24: licence-wide pitch →
      tech.touTariff; domestic profile shaves ~8% off the evening peak
      into the midday shoulder with daily energy conserved (±1%, any
      season — ratio cancels the seasonal term); satisfaction dips
      TOU_DIP_SAT at launch fading over 90 days (derived from the
      succeeded pitch, no new state). UI: BalancePanel council scope
      gains "⚡ fund smart charging (£Xk/yr)" / "funded ✓ stop" with the
      refusal reason when disabled (matches plan-works styling); InfoPanel
      council hover card shows a funded badge. Saves: additive optional
      fields only (council flag + tech key); old saves hydrate clean, no
      SAVE_VERSION bump needed.
  - [x] VERIFIED: tests/smartCharging.test.ts (10) — exact smart-profile
        landing via shapeSubLoads, funded catchment evening peak drops /
        overnight rises vs same-seed control (and the delta equals the
        profile gap), no-op once global smartEv ships, refusal <50,
        satisfaction nudge vs control, bill carries the rate and stops
        when unfunded, councilEvCount×price = quote, save round-trip +
        pre-programme hydration; tests/tou.test.ts (6) — peak −8%
        (0.90–0.94×) with energy conserved ±1% midwinter AND midsummer,
        shaping vs same-seed control through dispatch, dip-offset shape,
        council dip-then-recover integration, fundPitch → succeeded →
        tech.touTariff. Full `npx vitest run` 246/246 green; `npx tsc
        -b` and `npx eslint src tests e2e tools` clean; real dev-server
        screenshots of the BalancePanel control inspected at desktop
        (1280×800) AND phone-landscape (844×390) — control and refusal
        reason render and read at both. Dev server killed after.

- [x] **BUG: stale equipment on new game (owner, 2026-06-12 21:48):
      "There seems to be a cache issue where it remembers old
      electricity equipment, even on a new game after hard refresh."**
      ROOT CAUSE FOUND (workerBridge.ts chooseSave + online/cloud.ts):
      boot picks `cloud.tick >= local.tick ? cloud : local` — the save
      with MORE PLAYTIME wins. After "new game", the fresh save (tick
      ~0) loses to the old cloud save (thousands of ticks) on every
      reload until you out-play the old run; worse, pushCloudSave is
      debounced 45 s and the pending timer dies on refresh, so the
      fresh save may never reach the cloud at all. FIX (at Wave 4
      integration — the lane owns workerBridge right now): stamp an
      additive `savedAt` wall-clock on every stored save (bridge-side,
      sim stays pure); chooseSave prefers the most RECENTLY SAVED, tick
      only as tiebreak; newGame pushes the fresh save to the cloud
      immediately (pushCloudSave(data, true) on the first saveData
      after a newGame). Unit-test the chooser (fresh-new-game beats
      old-high-tick cloud; cross-device newer-cloud still wins; legacy
      saves without savedAt fall back to tick).
  - [x] FIXED at Wave 4 integration: additive SaveData.savedAt
        stamped bridge-side (sim stays wall-clock-free); pure
        pickSave in persistence/saveStore.ts — most recently
        SAVED wins, stamped beats unstamped, tick only breaks
        legacy ties, cloud wins exact ties; newGameCommand AND
        startMission push the fresh save to the cloud
        immediately (debounce bypassed). VERIFIED:
        tests/saveArbitration.test.ts (6) green; full suite 279.

- [x] **Tutorial campaign (owner, 2026-06-12): "the game is complicated
      for not knowing all the things"** — a campaign of TINY scenario
      maps that introduce core concepts one at a time. BUILT (this
      prompt; campaign lane): five missions — **First Light** (hamlet +
      wind tender + 33 kV + dist sub → every home lit), **Step Up**
      (offshore wind 40 tiles east; the bays rule: 132 kV + grid sub),
      **Keeping the Lights On** (pre-wired town through woodland; a
      deterministically SCRIPTED Storm Aldgate trips the crossing —
      depot, vans, veg policy; win = storm ridden + all restored),
      **The Inbox** (seeded 12 MW data-centre application; study →
      firm/flex → wires, no overloads), **Every Pound on the Bill**
      (serve all of Pennyford with network £/home ≤ £200). Maps are pure
      data (`src/data/missions.ts`, one named council each, every land
      tile councilled); gameplay in `src/sim/scenario/missions.ts`
      (steps with done(snapshot, ui), win predicates off a worker-built
      MissionView, seeds, beat-bitmask scripts persisted additively as
      `missionBeats`). Plumbing: `newGame(scenarioId?)` end-to-end
      (protocol/state/worker; mission games skip seedScenario + the
      goal ladder; undo stacks clear on newGame), SaveData/Snapshot gain
      additive `scenarioId`/`missionComplete` (london saves hydrate
      unchanged, NO SAVE_VERSION bump), worker latches the win once +
      🏆 event. UI: StartMenu CAMPAIGN accordion (ticks, locks,
      localStorage `ec-campaign-v1`, mission n completes → n+1
      unlocks), Tutorial.tsx generalized (mission steps or the london
      STEPS) + victory card (next mission / back to menu / keep
      playing), StoryIntro hard-gated to london, SearchBox hidden on
      missions. The client map follows the scenario: getLondonMap()
      now serves the active scenario's map (setClientMap redirect —
      historical name kept so InfoPanel/render call sites follow
      without edits), MapView re-inits the renderer on scenario change.
      Mission 1 gets developer bids organically (the roster + tender
      stepping live outside seedScenario — nothing to factor out).
  - [~] Simplifications, noted: tender-awarded renewables on missions
        1/2/5 are stamped FLEXIBLE (a 100 MW firm plant on a hamlet
        would swamp the tutorial bill with constraint payments —
        firm-vs-flex is mission 4's lesson); mission 5's target uses
        the DUoS slice (network £/home) rather than the all-in bill
        (energy EMAs make an all-in threshold flappy); mission 3's
        storm scripts the fault directly (rollFaults' storm odds over a
        2-day window are ~0.15 — too random to teach with); mission
        maps carry no road/rail vector layer (hamlet-on-farmland look).
  - [x] VERIFIED: tests/missions.test.ts (10) — all five maps decode
        (dims/arrays/customers>0/every land tile councilled), mission 1
        win flips on a real powered fixture (and latches exactly once),
        m3 seed + script trips the woodland line on schedule then wins
        after depot+restore, m4 seeds the application into a served
        town, m5 lean build beats the £200 target and a bulk supply
        point blows it, scenarioId round-trips (same map back),
        mission progress fields ride the save, london default + legacy
        saves hydrate to london (and london saves carry no scenario
        tag). Full `npx vitest run` 273/273; `npx tsc -b`, `npx eslint
        src tests e2e tools`, `npm run build` clean. e2e/campaign.spec
        run headless on a fresh server: menu → CAMPAIGN → mission 1
        driven to the win through the real worker (story letterbox
        provably absent, tiny-map asserts, victory card, completion
        recorded, mission 2 unlocked) + phone-landscape (844×390,
        hasTouch) steps render and the rotate prompt appears/clears on
        orientation flips — 2/2 green; menu.spec + build.spec re-run
        green (StartMenu/Tutorial/MapView touched). SHOTS=1 screenshots
        preview/mission1-desktop.png + preview/mission1-mobile.png
        captured mid-play at 1100×700 AND 844×390 and visually
        inspected (step strip readable, village lit, mobile rails
        clear of the strip).

- [x] **ROADMAP #19 Voltage control (capacitor banks) + #23 Hydrogen
      endgame (this prompt; voltage/hydrogen lane)**:
  - [x] #19: SubType `'capbank'` (33 kV single bay, £2m, no transformer/
        catchment); deriveNetwork stamps `Bus.vBoost` (one additive
        optional field in grid/types.ts, flagged) on bank buses;
        grid/voltage.ts spanning-tree walk credits +0.03 pu
        (CAPBANK_BOOST_PU) at the bank's point of connection and every
        bus downstream, bookkept separately from the resistive base so
        it never compounds into drops, stacking clamped at 0.05 pu
        (CAPBANK_BOOST_MAX, under the V_HIGH alert), slack pinned at
        1.00 — ZERO effect on DC power flow (vBoost is never read by
        dcpf). Palette/MobileChrome ('CAP')/hotkey 'V' entries;
        `sub_capbank` sprite (fenced yard, three racks of stacked
        capacitor cans on post insulators, busbars, orange kiosk) +
        atlas/MapRenderer/MapView-ghost registration — preview-inspected.
  - [x] #23: GenType `'electrolyser'` (100 MW soak, 33 kV, £80m
        ungated-but-expensive, 800 MWh tank). Dispatch wires it at the
        curtailment site: a load-side soak that takes only the cheap
        surplus LEFT AFTER batteries (so it absorbs exactly the energy
        the fill loop would curtail or spill) — gated on surplus > 0,
        which provably never consumes ahead of unserved demand. Tank
        levels ride state.soc per electrolyser (battery-style), so the
        H₂ store reaches dispatch, serializes, and hydrates old saves
        to empty tanks with NO state.ts edit at all (the flagged
        "smallest additive block" turned out to be zero lines — soc
        already round-trips; unit-proven). Store denominated in
        re-generatable MWh (net 0.35 power→H₂→power on charge,
        documented). Converted peakers (`convertToH2` command, apply
        logic in new market/hydrogen.ts; commands.ts got exactly one
        union member + one delegating case + its import, flagged) split
        into an H₂ half (carbon 0, fuel £90/MWh H2_FUEL_COST_K, capped
        by the licence-wide pool — hydrogen moves by pipe, not wire)
        and a gas half (gas price + gas carbon) in one dispatch; the
        fill loop drains tanks ascending-id as the H₂ half runs. Builds
        flow through the normal tender market like batteries (flagged:
        three additive electrolyser appetite keys in events/
        developers.ts — Greenfield/Borough/Consolidated); no PPA is
        ever paid (never a stack unit — delivered MWh 0, the battery
        precedent). `gen_electrolyser` sprite (pale process hall +
        domed H₂ tank farm + elevated pipework manifold) + full
        registration, hotkey 'Y' — preview-inspected; atlas 4096x3754,
        under the mobile ceiling.
        [~] innovation gating deferred to the integrator (events/
        innovation.ts is another lane's) — shipped ungated-but-
        expensive per plan. [~] InfoPanel rows (capbank boost, H₂ store
        level, convert button) and balance.ts availAt treatment (an
        electrolyser is demand-side, should not count as firm supply in
        Balance profiles) handed to the integrator as exact JSX/diffs
        in the lane report — InfoPanel/balance are other lanes' files.
  - [x] VERIFIED: tests/voltageControl.test.ts (6) — brownout feeder
        (0.93 pu, COV.brownout tile) recovers to exactly +0.03 pu /
        COV.on with a bank downstream, every branch flow byte-equal
        before/after, no upstream credit, two banks clamp at +0.05,
        £2m capex+opex annuitize onto the bill, single-bay spec.
        tests/hydrogen.test.ts (11) — curtailed MW falls by the soak
        while the store rises and constraint £/h falls, never consumes
        during unserved demand (thin-sun shortfall + dead island),
        converted peaker runs carbon 0 at £90/MWh and drains the tank
        by exactly MWh generated, falls back to gas price/carbon dry,
        split-hour case blends, unconverted peaker untouched, command
        refusals, store+flag save round-trip + pre-hydrogen hydration
        keeps dispatching, designation opens a tender that draws bids.
        Full unit suite 273/273 with concurrent lanes' in-tree work;
        tsc -b, eslint, vite build clean. e2e with the wave gate.

- [x] **ROADMAP #15 Asset ageing + #16 Maintenance windows (this prompt;
      reliability lane)**:
  - [x] #15: `builtAtMin?` on lines/subs (additive; absent hydrates to 0
        — existing campaigns' kit ages from game start, documented in
        assets.ts + ageing.ts; new builds/tees/sealing ends stamp it);
        derived health in new `src/sim/reliability/ageing.ts`:
        `assetHealth(asset, simTimeMin, loadingEmaFrac?)` 100→0 over the
        catalog's 40-year asset life, ≤1.6× load acceleration (coarse
        hook, documented: the per-branch overload-heat accumulator —
        only kit run past its rating ages faster), ×1.15 storm exposure
        for overhead lines/outdoor AIS subs (deterministic constant, not
        an accumulator — health stays a pure function); `rollFaults` ×
        health hazard (1× at ≥70 rising linearly to 3× at 10, clamped;
        RNG draw count unchanged so seeds replay); inspector rows
        `health X% · built year N` on line + sub cards; `replaceAsset`
        command (resets builtAtMin, 70% of CURRENT capex — easements/
        civils/consents reused, documented; undo-safe via the worker
        snapshot, refuses iDNO; button below 50%); snapshot stat
        `networkHealthPct` + KpiDashboard row.
  - [x] #16: `scheduleMaintenance` command (inspector button below
        health 80) → `state.maintenance` (additive) queues the next
        01:00–05:00 window; tick applies a planned outage (cause
        "planned maintenance" via outageCause, timed like a thermal
        trip so it auto-clears at window end, NO fleet job), cost 10%
        of capex one-off into rolling `maintYrK` (stormPrepYrK's exact
        sibling, rides penaltyYrK → the constraint/damages bill line),
        completion bumps builtAtMin forward ≈ +25 health (capped 100);
        inspector warns "customers WILL lose supply during the window"
        + second-click confirm when `maintenanceCutsSupply` (pure
        topological screen mirroring security.ts reachability) says the
        branch is the only path — N-1 secure kit queues silently.
  - [x] VERIFIED: tests/ageing.test.ts (14) — curve endpoints (new=100,
        40y=0, exposure, load-accel ordering + clamps), hazard anchors,
        aged line faults >1.5× a new one under the identical seed,
        replace resets + charges 70% + deserialize-undo reverts both,
        nextMaintenanceStart edges, full radial window lifecycle (queue
        £, dupe refusal, applies at 01:00 with cause + zero jobs, CML
        accrues, clears at 05:00, +25.0 health, charge reconciles on
        bill.constraintYrK), looped fixture rides through with CML=0,
        cuts-supply warning truth table + dist/iDNO refusals, rate
        decay, save round-trip + pre-ageing hydration. Full unit suite
        230/230; tsc, eslint, vite build clean. e2e with the wave gate.

- [x] **ROADMAP #14 CfD allocation rounds + #17 Constraint bidding (this
      prompt; developer-market lane)**:
  - [x] #14: quarterly sealed-bid allocation rounds in events/
        developers.ts (ROUND_INTERVAL_DAYS=90; openAllocationRound
        gathers all open tenders into a round, settleClearedRounds
        clears them together at the deadline); Tender.roundId
        (additive); InboxPanel groups bids under "ALLOCATION ROUND n"
        with a one-click clear of the whole round.
  - [x] #17: per-developer `curtailPriceK` personalities (£30/MWh co-op
        → £120/MWh conglomerate), inherited onto awarded plant as
        `GenAsset.curtailK` (inheritCurtailPrices); dispatch curtails
        the CHEAPEST curtailers first, so a low constraint price is a
        real reason to pick a bid; bid cards read "£92/MWh · curtails
        at £45/MWh".
  - [x] VERIFIED: tests/cfdRound.test.ts (8) + tests/
        constraintBidding.test.ts (6); full unit suite green with the
        concurrent ageing lane; tsc + eslint clean. e2e with the gate.
- [x] **Install design/game-art skills from public repos (this prompt;
      tooling, no app code)**: vendored 8 Apache-2.0 skills into
      `.claude/skills/` for future art/UI/design sessions — from
      anthropics/skills: `frontend-design`, `canvas-design` (bundled
      OFL fonts kept so it works offline), `algorithmic-art`; from
      omer-metin/skills-for-antigravity: `game-design-core`,
      `game-ui-design`, `color-theory`, `environment-art`,
      `pixel-art-sprites` (pixel idioms don't apply to our ink-contour
      vector style, but its silhouette/readability-at-size doctrine
      does). LICENSE.txt included per skill. New skills register with
      the Skill tool from the next session onward.

- [x] **ROADMAP #11 Interconnector + #12 Battery policy (this prompt;
      dispatch/market lane)**:
  - [x] #11: GenType `'interconnector'` in catalog (1000 MW, 400 kV,
        £500m, carbon 150 g/kWh GB-import mix, new `siting: 'edge'`);
        siteErrorAt edge rule (dry land within 2 tiles of the map
        boundary, clear refusal text — suitability overlay shares it);
        `nationalPriceMWh/K` in market/dispatch.ts (pure, no RNG:
        nights ~£45 → evening peaks ~£140, +30% winter via seasonFactor,
        +£60 calm-cold scarcity kicker); dispatch prices the unit off
        the live series, merit-ordered, mustRun false, ppaK forced
        undefined (NO PPA); commands.ts builds it DIRECTLY as a
        player-owned asset (no tender; planning+build lead times);
        bill.ts excepts it from the gen skip → converter hall
        annuitizes into DUoS capex/opex; imports ride energyYrK free.
        Palette/MobileChrome/hotkey ('M') entries; InfoPanel 'import
        price now £X/MWh' off snapshot.simTimeMin+weather (same
        series); `gen_interconnector` sprite (converter hall + DC
        yard) + atlas/MapRenderer/MapView-ghost registration —
        preview-inspected.
        [~] balance.ts availAt untouched per lane constraints: the
        interconnector shows as firm (1.0) in Balance profiles —
        availability nuance is a later pass. Export mode (negative
        demand) deferred per roadmap v1.
  - [x] #12: `GenAsset.policy?: 'shave'|'arbitrage'|'reserve'`
        (additive serialization for free via PlacedAsset; default
        'shave' = exact original behaviour, unit-proven); dispatch
        battery block branches per battery: shave (original gate kept),
        arbitrage (charge natK<£60 off the grid at rate, discharge
        natK>£110 at front-of-stack cost regardless of local peak),
        reserve (hold ≥50% SoC, trickle-refill at 20% rate so standby
        never cooks the local network, full store offered only when the
        island would otherwise be unserved); `setBatteryPolicy` command
        (mutating, undo-safe via worker snapshot, no assetsVersion
        bump); InfoPanel battery card 3-button selector (MvaControls
        pattern, pointerEvents auto).
  - [x] VERIFIED: tests/interconnector.test.ts (10) +
        tests/batteryPolicy.test.ts (7) — edge siting, direct build vs
        tender, price series shape/winter/kicker/purity, dispatch
        follows series (peak > 2x night) with zero PPA top-up, DUoS
        billing exception, arbitrage night-charge/evening-discharge,
        discharge-despite-local-cover, reserve floor hold + island
        rescue, default==shave equivalence, command refusal +
        serialize-clone undo safety. Full unit suite 202/202; tsc +
        eslint clean.

- [x] **ROADMAP #13 Network losses + #52 Bill drill-down (this prompt;
      bill-accrual surface lane)**:
  - [x] #13: per-branch I²R as the textbook pu identity lossMW =
        flowMW²·r / 100 (the catalog's 100 MVA base IS the constant —
        documented at tick.branchLossMW; 240 MW over 30 km of 132 kV
        loses ≈6.9 MW ≈ 2.9%, inside the real 2–4% band). Rolling
        `state.lossYrK` EMA beside energyCostYrK priced at the running
        marginal priceMWh; `BillBreakdown.lossYrK` summed into totalYrK
        AND the network pot (losses are DNO spend → household DUoS
        share); `BranchView.lossMW?` (lines + transformers); InfoPanel
        LINE CARD row 'losses now X MW (£Yk/yr)'; BillPanel 'losses
        (I²R)' row with the only-shorter/lower-r-routes tooltip.
        Checked LINES catalog: cable carries the SAME rPerTile as
        overhead per level, so undergrounding does not cut losses —
        specs left alone per scope, noted in tooltip + unit test.
  - [x] #52: `state.billDetail` Maps (constraints/ppa/losses), EMA'd
        with the SAME tau as their headline lines (that's what makes
        reconciliation exact), pruned at 1e-6 for compactness;
        serialized additively (billConstraints/billPpa/billLosses,
        SAVE_VERSION untouched, old saves hydrate clean — unit-proven).
        dispatch stays pure: returns `constraintDetail`/`ppaDetail`
        [id, mw, £k/h] arrays (recordCurtailed + the ppa accrual site);
        tick folds. capex/opex never stored — billDetailRows lives in
        tick.ts (worker.ts can't be imported by vitest) and derives
        them live via assetCapexK/assetOpexFrac, mirroring computeBill's
        inclusion rule (gen skipped EXCEPT the interconnector lane's
        new unit, iDNO skipped). Protocol billDetail request/response
        (top 12, labels via GENS/SUBS + developer names, coords for
        jump-to); worker case; workerBridge requestBillDetail; store
        billDetail/setter. BillPanel rows tappable (▸/▾, pointer) →
        inline detail card with £k/yr + MWh/yr + '→' jump (requestPan +
        setSelected; line rows pin via lineId at the route midpoint).
  - [x] Tests (15 new across losses.test.ts + billDetail.test.ts; full
        suite 202/202): flow²·r scaling, 2–4% calibration, cable-r ==
        overhead-r and uprating leaves r, BranchView lossMW identity,
        bill sums + DUoS pot include lossYrK, constraint/ppa/losses
        details each reconcile to their line ±2% on a running curtailed
        fixture (firm solar at noon), attribution names the curtailed
        unit, capex top list matches assetCapexK order, opex pricing,
        protocol row shape + coords, determinism, save round-trip +
        pre-losses hydration. tsc + eslint clean (whole repo green,
        incl. the concurrent interconnector/battery lane).
  - [x] File constraints respected: tick/state/bill/dispatch (≈12-line
        diff)/protocol/worker/BillPanel/InfoPanel (LineInfo only)/
        workerBridge/store/tests only; no Hud/scenario/balance/render.

- [x] **ROADMAP #8 N-1 security + #9 storm prep — SIM SIDE (this prompt;
      UI/renderer land separately)**:
  - [x] `src/sim/security.ts` (new): `securityOf(state)` → per service
        sub `{ secure, bindingLabel? }` via graph bridges (Tarjan,
        O(V+E)) + per-bridge gen-reachability; memoized on
        assetsVersion+outages signature; <50ms @ ~300 buses
        (unit-asserted on a 150-sub double-fed ladder, every branch a
        bridge). Topological v1 per the roadmap; under-construction
        plant counts as a source (planning view, keeps the cache
        time-free).
  - [x] `src/sim/reliability/stormprep.ts` (new): `forecastStorms`
        (deterministic named storms off `weather.nextRegime ===
        'windy-wet'` arriving in winter — the regime pre-roll IS the
        2–6-day lead time), `applySurgeCrews` (temporary contractor
        vans, `surgeUntilMin`/`surgeVans` state, 3× van rate pro-rata),
        `emergencyVegCut` (one-off £k, lineVeg ×0.5), rolling
        `stormPrepYrK` bill rate (1-game-year decay so the rate
        integrates back to the £k spent).
  - [x] state.ts: additive optional `surgeUntilMin`/`surgeVans`/
        `stormPrepYrK` (+ SaveData round-trip, no SAVE_VERSION bump —
        old saves hydrate clean, unit-proven).
  - [x] commands.ts: single `stormPrep` command delegating to stormprep
        (7-line diff); tick.ts: the surge-van one-liner on syncVans +
        the bill one-liner (stormPrepYrK rides penaltyYrK → the
        constraint/damages line; bill.ts untouched); protocol/worker:
        `security?` (sent only when changed; tracking key reset on
        restore/newGame) + `stormForecast?` on SimSnapshot.
  - [x] tests (14, all green; full unit suite 168/168 incl. them): radial sub
        insecure with "Grid substation transformer" named, loop flips
        secure, parallel-circuit-but-shared-feeder still insecure,
        N-0-dark sub insecure without a label, memoization;
        deterministic staged-regime forecast (winter yes / summer no /
        calm-cold no, name stable as eta counts down), surge raises the
        van roster then expires, vegCut halves lineVeg, prep cost on
        bill.constraintYrK + decays + frozen on paused re-solves, save
        round-trip. tsc + eslint clean. UI/renderer + e2e land with the
        wave gate.

- [x] **ROADMAP #3 Reinforcement planner + #25 Ring-main assist (this
      prompt)**: `src/sim/planner.ts` — `planReinforcement(state, ctx,
      scopeId)` builds 2–4 costed candidate bundles (bigger TXs / second
      circuit / re-conductor / battery tender) off the balance engine's
      shortfall, each scored on a serialize/deserialize clone (residual
      shortfall + capex + £/home/yr via DOMESTIC_NETWORK_SHARE) with
      ready-to-send commands; `proposeLoop(state, ctx, subId)` finds the
      cheapest radial-closing line topologically (findIslands with each
      supply-path branch removed; gen buses as topological sources;
      priceLine + checkBuild validation). Protocol `plan`/`proposeLoop`
      → `plan` response; worker cases mirror 'study'/'balance';
      BalancePanel "plan works" on shortfall rows → option cards
      (label, capex, £/home/yr, shortfall X→Y MW) → approve
      (multi-command = multiple undo steps, v1, commented); store
      `plan`+`setPlan` (additive); workerBridge requestPlan/proposeLoop.
      VERIFIED: tests/planner.test.ts (5 tests) — 4 options on the
      staged 132-loss shortfall, best residual (battery tender) <
      shortfall, every option's commands apply cleanly, live state
      byte-identical after planning; proposeLoop's ring survives
      original-feeder removal (topological islands check) and an
      already-looped sub gets no proposal. Full unit suite 168/168
      green; tsc + eslint clean for these files.
      [~] ghost previews on option hover deferred (multi-ghost renderer
      API is another lane's file); approve executes directly.

### Roadmap additions prompt (bill drill-down, directorates, story, suits/H&S)
- [x] Added to ROADMAP.md as items 51–55 with full design/build/verify
      detail: bill line drill-down ("why are constraints £50m?"), the
      network business with directorates, the "Night the Grid Vanished"
      story opening (Ofgem year-1 allowance + year-2 CML target),
      litigation, and H&S incidents — queued into the "do all" campaign
      (story + drill-down pulled forward to Tier 1)

### "Suggest 50 improvements ranked by impact" prompt
- [x] Delivered in chat (2026-06-12); owner picks become new entries here
- [x] "Expand on all points in rich detail and add to the plan" →
      ROADMAP.md created: all 50 items with design, build notes and
      verification, ranked in four tiers; items graduate into this
      ledger when the owner schedules them (CLAUDE.md points at it)

### Grid balance / energy accounting prompt
- [x] GRID BALANCE view (⚖ HUD button / B): whole-map gross position —
      "X MW procured but not wired in" called out — demand now vs
      connected supply, and a typical-day 24h PROFILE chart (demand
      line vs connected-supply area, unserved gap shaded red; rooftop
      PV rides the supply curve) — verified on screenshot incl. the
      solar night-hole, which is also unit-tested exactly
- [x] Ring-fenced council breakdown: rows sorted worst-first with
      connected/total customers and "needs +X MW at HH:00" in short
      form; tapping a row highlights the council on the map and pans
      to it (orange ring-fence tint)
- [x] Generation profile inspection: every pinned gen card shows its
      typical-day availability profile chart under the live output
      sparkline

### Connection study prompt (firm vs flexible is a blind choice)
- [x] Every open application gets a one-click ⚖ CONNECTION STUDY in the
      inbox: the worker clones the live state (never touches it —
      unit-proven), wires generation via an appropriate-kV line to the
      nearest bay (named, km, £ quoted) or joins load to its catchment,
      re-runs dispatch + power flow at stress (solar at clear noon, wind
      on a blowy day, load at the calm winter-evening peak), and reports
      every piece of kit ≥90% loaded (before→after %), incl. the
      implicit catchment transformer for big loads — with a verdict:
      clean → "FIRM is safe"; gen overloads → "take FLEXIBLE or
      reinforce first (firm + curtailment = constraint payments)"; load
      overloads → "reinforce before energizing"

### Undo-after-GIS bug prompt
- [x] Undo after "rebuild underground (GIS)" (and any in-place mutation:
      uprate, MVA resize, conversions) did nothing or half-reverted —
      undo snapshots shared object references with live state, so later
      mutations leaked back into the stack. serialize() now deep-clones
      (structuredClone); regression tests prove a pre-command snapshot
      stays pristine and an undone section-undergrounding re-energizes
      the exact original network

### Multi-tile assets prompt (nuclear + GSPs)
- [x] Nuclear eats its campus: 3×2 footprint (reactor hall, turbine
      hall, switchyard), siting enforced per tile with cooling water
      within 3 — only proper shoreline blocks qualify
- [x] Bulk supply points (GSPs) take a 2×2 plot; substation footprints
      plumbed through siting, occupancy, pylon blocking, line endpoints,
      ghost preview, and plot-sized voltage rings
- [x] Sprites to match: nuclear redrawn as a 3×2 Hinkley-class campus
      (pale reactor hall + glazed crown, stepped twin, turbine hall,
      fuel silos, vent stack, containment dome) and the GSP as a 2×2
      gantried switchyard (three portal ranks with insulator drops,
      busbars, transformer banks, control house) — verified on sprite
      renders; multi-tile sub art uses the gen placement path (GIS
      vault override stays centred)

### Blackout explanations prompt (PV at night)
- [x] Every time a site loses power, an explanation event fires: on
      live→dark transitions each service sub diagnoses its island —
      "the sun has set on its only supply — solar makes nothing at
      night; add a battery or firm backup", wind died, kit tripped
      upstream, plant still under construction, supply shortfall
      (unit-tested with a solar-only island at nightfall)

### Landmarks-to-scale + road tessellation prompt
- [x] Landmarks TO SCALE and recognisable (owner supplied reference art):
      Parliament's three gothic ranges stepping along the river with
      Victoria Tower and a clock-faced Big Ben; a great London Eye (24
      capsules, ~3× the terraces); the Shard now the tallest thing on
      the map with the splintered glass crown (CBD trimmed to keep it
      so); Tower Bridge as one 1×4 sprite — twin gothic towers, high
      walkways, pale-blue chains, traffic passing the open deck; St
      Paul's 2×2 with the great dome; the Gherkin anchored in the City.
      swAnchor multi-tile mechanism (no renderer special-casing); atlas
      auto-trim keeps the sheet at 4096×3740 under the mobile ceiling.
      Previews inspected: landmarks_{westminster,city,towerbridge,
      battersea}.png + per-sprite renders
- [x] …their TILE RESERVATIONS are in (map side): Parliament claims a
      3-long × 2-deep river-front precinct stepping along the bank at
      the Westminster bend (embankment + SW rail re-routed behind it),
      St Paul's a 2×2 close, Battersea a 2×2 block — landmark raster +
      building exclusion, unit-tested tile counts; Eye/Shard/Tower
      Bridge/stations stay single-anchor; nothing moved (the sprites
      themselves are the concurrent art package above)
- [x] Roads "waaay worse than before": city streets re-laid on the TILE-
      EDGE lattice so they tessellate — running between blocks, along
      house fronts — instead of free splines wandering through buildings
      and water; motorways/rail keep sweeping curves outside towns.
      Streets are straight integer-lattice runs (rows every 4, columns
      every 5 → 4×3 blocks; wander() deleted); arterials + lanes snap to
      the lattice through any built fabric (axis-aligned runs, ~1-tile
      rounded corners) and sweep only in open country; embankments are
      stepped lattice paths a fixed setback off each bank; the Circular
      re-laid with its two river crossings perpendicular (x=96, x=143);
      Thames discipline unit-tested against the designated bridge set
      (incl. the new square-on Staines town bridge at x=30); the M3 no
      longer starts in the river; bridges/Heathrow spur/pier now stamp
      the gameplay raster too. Verified on previews: preview/roads_
      {westminster,central_tight,croydon,basildon,watford_m25,
      ne_radials,dartford_m25}.png

### UI/UX critique flurry (map realism + inspection + faults)
Map (recognisability pass 2 — owner provided London satellite/maps refs):
- [x] Thames redrawn on the real reaches (45 control points): Staines/
      Walton meanders, Richmond/Kew swing, central bends, deep Isle of
      Dogs U (Canary Wharf CBD moved INTO the loop where it belongs),
      Greenwich peninsula, Erith/Purfleet double bend, Dartford narrows,
      NE-fanning estuary; tributaries as real valleys (Colne/Lea/Wey/
      Mole/Darent/Roding) — previews inspected against the satellite ref
- [x] M25 hand-laid 29-point ring passing WEST of Heathrow (verified: 0
      heavy-road tiles on the airfield); M4/M3 added so the airport sits
      between them; two runways + terminal + A4 spur
- [x] Satellite towns: 18 named towns + 15 villages at true relative
      positions, multi-lobe organic footprints, sized large (Watford,
      Slough, Basildon, shore-strip Southend) down to villages
- [x] Terrain diversity: variable-pitch (3–9 tile) jittered hedgerow
      enclosures with per-field tints, heaths (Epsom Downs, Langdon
      Hills…), varied woodland, 60 farmsteads — checkerboard read gone
- [~] Crop choice within an enclosure still follows the renderer's 8×8
      hash (tileChooser untouched this pass); the lattice + tints break
      the repetition — revisit if the owner still sees grids
- [x] Infrastructure in the empty bits: Staines/Wraysbury + QE2 + Lea
      reservoirs, Colne gravel pits, Grays chalk pits + Tilbury docks,
      8 golf courses, Beckton/Crossness/Mogden sewage works, market
      gardens
- [x] Roads to nowhere fixed (audited programmatically: every radial/
      lane ends at a town, joins a road, or exits the edge)
- [x] Landmarks relocated to the corrected river (Parliament/Eye at the
      Westminster bend, Tower Bridge, Greenwich Park in the loop) and
      NAMED_PLACES updated
- [x] Cars no longer travel at light speed (vehicle speeds ~⅓)
- [x] SAVE_VERSION 7→8: v7 saves' assets would sit on the wrong
      geography (substations in the river)
UX:
- [x] Line interaction works on the WIRE as drawn: picking tests the
      click at several conductor elevations (pylon height + sag shift
      the wire in iso space), verified by clicking the drawn cable
- [x] Demolish tool takes down lines (click near the span)
- [x] Lines upratable: re-conductor +30% thermal rating for 60% of the
      line's capex, from the line card (rating reflected in solver +
      views; one-shot)
- [x] "Why did it fail": outages carry their cause (storm/tree contact/
      overload) into the inspector with tailored fix advice; >90%
      loading shows a headroom warning before it bites
- [x] News banner no longer resets when a new event lands — text swaps
      between marquee passes (onAnimationIteration)
- [x] Click (single or double) pins inspection; pinned card carries the
      reinforcement controls AND a 2-game-day performance sparkline
      (worker samples per-asset MW vs rating on a 30-min grid; watch
      channel answers immediately even when paused)
- [x] Faults get a red spanner pin (bounce + pulsing ring + label +
      crew status); click → pans and pins the broken asset's card with
      cause, repair ETA, crew need, and the one-click fix quotes
      (re-conductor / bigger TX / underground span / GIS)

### Section undergrounding prompt
- [x] Underground a SECTION of an overhead line: click the span in the
      line inspector ("underground this span", priced + sized) and bury
      just that part — the line splits at sealing-end towers, the middle
      leg becomes cable, the ends stay overhead; one undo step (verified
      before/after on screenshots). A span through town with no
      supports = the whole line, which falls back to full conversion
- [x] Pylon blight: overhead route tiles beside homes dent that
      council's satisfaction (weighted 400>132>33, capped −12); burying
      the section clears it and hardens reliability there (cables
      ignore storms/vegetation)

### Nuclear siting prompt
- [x] Nuclear placeable beside any cooling water (sea/river within 2
      tiles), not just the licensed estuary zone — suitability overlay
      paints the coastal/riverside band green (verified on screenshot);
      "needs cooling water" error elsewhere; conservation areas/parks
      still refuse; the licensed estuary site is always allowed

### Bill calibration prompt
- [x] Household bill modelled the GB way: domestic users carry ~32% of
      the network pot (industry/commerce the rest) → a reasonable mature
      network ≈ £100/yr DUoS per home, shown on the bill panel; energy
      at ~40% of volume × ~3x retail uplift + £150 standing charge →
      an electrified (EV+HP) home trends to ≈ £3k/yr total
- [x] Developer plant now bills like a real CfD/PPA: strike top-up above
      wholesale on DELIVERED MWh only (smoothed in dispatch) — idle
      seeded plants stopped inflating bills by £200+/home, a keen bid is
      a real saving, and gen capex never rides DUoS
- [x] RIIO bill targets rescaled to the calibrated figure (open at
      £3000, floor £1800)

### Vanished-substations-on-reload bug prompt
- [x] On reload, substations/plants could vanish while lines + flows kept
      drawing: snapshots arriving before the texture atlas finished
      loading built an empty sprite pass and locked the asset signature.
      Renderer re-runs the sprite pass once textures are ready.

### Contract pins prompt
- [x] New contracts (applications/tenders/overdue) drop a sizeable map
      pin — fat teardrop with glyph + label, bouncing, with a pulsing
      ground ring to draw the eye
- [x] Click the pin → the inbox opens, scrolls to and flashes that
      contract; click the inbox message → camera snaps to the pin
      (two-way; pin taps don't fall through to the tile beneath)

### Logotype like-for-like prompt
- [x] Shipped the owner's reference artwork itself as the menu logotype
      (like-for-like by definition): background unmixed to alpha so the
      glow halos composite onto the glassy panel; raster asset kept by
      owner request — the one deliberate exception to art-is-code

### E2E debt found by the full suite (fixed pre-push)
- [x] palette.spec still expected the pre-rings hint wording (stale
      since the voltage-clarity package) — aligned to the live copy
- [x] Tutorial steps auto-skipped: seeded existing plants satisfied the
      "designate generation" condition instantly — step conditions now
      ignore seeded developer/iDNO kit

### Substation voltage colours prompt
- [x] Substations carry their voltage colours on the map at all times:
      bay-coloured rings under each sub (400 blue / 132 green / 33
      orange, highest voltage outermost on multi-winding BSPs) matching
      the line colours and the armed-tool rings

### Tee'd connections prompt
- [x] Tee into an existing circuit mid-span: with the line tool armed
      from an asset, clicking a same-kV line splits it at a tee junction
      (a real three-ended circuit) so e.g. a solar farm's substation
      under a 132 kV route connects straight into the passing line; the
      junction snaps to the nearest workable tile on the route and draws
      as a tee tower
- [~] Asset-first only (anchor on the asset, then click the span);
      clicking a span with no anchor prompts the order — kept the tool
      state simple rather than tracking half-made tees

### Auto-connect prompt
- [x] Palette toggle "auto-connect on placement": a new substation runs
      a circuit from EACH of its bays to the nearest asset with a
      matching bay (≤40 km), overhead where possible, cable where it
      must (conservation areas) — one undo step with the sub itself

### Blackout diagnosability prompt
- [x] Inspect CLICK pins an info card that stays up (hover-only before, so
      "nothing popped up" and the upgrade controls were unreachable —
      they vanished as the mouse moved toward them); close ×/Esc/click-away
- [x] The pinned card names the problem: TRIPPED + repair countdown on
      lines/transformers, DE-ENERGIZED banner explaining tripped-here vs
      trace-upstream, loading % and headroom
- [x] Selected asset/line is highlighted on the map so you know which
      piece you're looking at

### Underground substations + cable legibility prompt
- [x] Any substation can be rebuilt underground (indoor GIS) from its
      inspector: 3× capex on the bill, storms can't touch it (outdoor
      kit now takes damped storm exposure), drawn as its access vault
- [x] Underground cables are legible: dashed level-coloured trench trace
      on the map; the line inspector gives voltage, build, endpoints
      ("from/to"), so you know what a buried circuit is and where to
      connect to it

### Undo/redo + line inspection prompt
- [x] Undo/redo: Ctrl+Z / Ctrl+Y (Cmd too, Ctrl+Shift+Z = redo) + HUD
      buttons — snapshot stack in the worker, 20 deep, covering every
      build/award/demolish/convert/setting
- [x] Lines are inspectable: click one in inspect mode → loading, headroom,
      peak-seen loading, length, capex, endpoints, outage status
- [x] Underground an existing overhead line from its inspector (priced at
      the full underground build for that route); demolish from there too

### Line-chaining duplicate prompt
- [x] Clicking an asset already connected to the chain anchor re-anchors
      instead of building a duplicate reverse circuit (A,B,A,C,A,D now runs
      a clean star from the BSP)

### £0/MWh bids bug prompt
- [x] Bids quote a real PPA strike (LCOE: annuitized capex+O&M over expected
      output at tech capacity factors, plus fuel) — tidal now bids ~£100/MWh,
      never £0
- [x] The awarded strike matters: developer plant is billed at its strike,
      so taking the cheaper bid genuinely lowers the PPA line

### Style-direction prompt (menu mock + logotype refs)
- [x] Logotype: glowing ELECTRI + bolt + CITY-as-buildings (SVG, in-app)
- [x] Start menu redesigned to the mock: glassy panel, glowing CONTINUE,
      iconed buttons, NETWORK ACCESS sign-in block, footer links
- [~] World grade toward the dusk mock: warmer lighting mix, more lit
      windows, atmospheric vignette — sprite pipeline, not raytraced 3D

### 400 kV confusion prompt
- [x] Wind→supergrid path explained in-game: plants connect at their own kV
      and step up THROUGH substations; BSP's new 33 bay takes wind directly;
      palette legend spells out the step-up rule

### Liveliness prompt
- [x] News ticker banner: scrolling feed of real grid events + amusing
      colour headlines (desktop + mobile)
- [x] Ambient news: flavour events flow steadily even in quiet spells
- [x] Event cadence up: applications/data centres arrive without needing a
      big served base first; pitch flow quicker

### Instant construction + voltage clarity prompt
- [x] Construction lead times removed: awarding a bid creates the plant
      instantly, operational (tender/bid market unchanged)
- [x] Voltage clarity: "bays" row on every asset inspector; armed line tool
      rings every compatible asset in the level colour; palette hint
- [~] Any-step-down: BSP now carries 400/132/33 bays (multi-winding, like a
      real BSP with 132/33 on site) so 33 kV drags BSP→dist directly; chose
      explicit multi-winding subs over implicit auto-created 132/11 subs
      (11 kV is abstracted into the 33 kV level in-game)

### iOS home-screen icon prompt
- [x] Icon-weight logo redraw (chunky pylon + bolt, full-bleed, gradient)
- [x] apple-touch-icon.png 180px (iOS ignores SVG icons) + 512px icon
- [x] Web app manifest + iOS metas (standalone, title, status bar)

### Memory + London recognisability (this prompt)
- [x] CLAUDE.md created (game concept, working doctrine, gotchas)
- [x] TASKS.md created with this protocol
- [x] Mayfair posh quarter beside Hyde Park; Georgian stucco housing family
- [x] East-End vs West-End housing character (sector-biased stock)
- [x] Central Thames bridges (Westminster/Waterloo/Blackfriars/London + Tower)
- [x] Heathrow: runway + terminal landmark in the west
- [x] Named central stations (King's Cross, Liverpool Street, London Bridge)
      shown in the inspector
- [x] Existing generation seeded at game start (estuary CCGTs, Lea-side
      plant, Essex solar) — operational, developer-owned, awaiting your wires

### Logo + audit prompt
- [x] ElectriCity logo (line-art pylon + bolt): favicon, wordmark, start menu
- [x] Full prompt audit delivered

### Countryside prompt
- [x] Crop patchwork (wheat/rape/plough/pasture/meadow), hedgerows + gates,
      orchards, ~90 copses
- [x] Lea (+reservoir chain), Wey/Mole, Colne tributaries; estuary marsh

### Real-London prompt
- [x] True Thames spline (Richmond meanders, Westminster bend, Isle of Dogs)
- [x] Organic density-field city centred on map; countryside on all sides
      (~29k open tiles for generation)
- [x] Real radial skeleton + Circulars + M25; satellite towns beyond belt

### CI prompts
- [x] Local e2e ≡ CI (fresh server always; stale-server masking fixed)
- [x] e2e removed from CI (runs locally pre-push); CI keeps unit job
- [x] Suite 11.7→7.2 min (2 workers); atlas IndexedDB cache (~100 ms boots)

### Developer-market prompt
- [x] Seeded applications at new game
- [x] Gen placement = planning signal → fake businesses bid → award/withdraw
- [x] 8 developers incl. conglomerates; moods; regulator complaints dent RIIO
- [x] Subagents used for parallel work

### Town-seeds / data-centre prompt
- [x] Town seeds: high streets+shops, radial density, per-town industry,
      schools, town halls, stations, car parks, water towers/sewage, churches
- [x] Data centres: urban arrivals, build unenergised + angry bubble icons,
      thermal risk on connection, firm/flex responses
- [x] Monthly town infill growth (mutates map, replayed on load)

### Multi-tile / transport / housing / MVA / finance prompt
- [x] Multi-tile footprints; coal station w/ cooling towers [~ 3×2 not 2×6]
- [x] Trains + rail; river boats
- [x] Victorian terraces, council flats, new-builds; estate-clustered variety
      (roofs/windows/walls/lofts/solar)
- [x] New-build iDNO estates: transformer in, solar/HP/EV waiting to connect
- [x] MVA substations: load-based catchments, auto-reinforce + manual resize
- [x] Generation ≠ DNO spend: DUoS vs energy (PPA) split on the bill
- [x] Cycle lanes, verges, randomized flowers on roads

### Vector-roads prompt
- [x] Roads as vector layers, 20 mph streets → motorways; rail enabled by it

### Mobile prompt
- [x] Icon rail (tap-to-arm) + » expandable detail palette; panel chips;
      compact HUD; pinch zoom; tap-to-inspect

### First gameplay-audit prompt
- [x] Sharp line-art (not pixely); 2x sprites with ink contours
- [x] Turbines spin; cars drive; power-flow chevrons; energisation pulses
- [x] Bigger map; meandering roads [superseded by vector roads]
- [x] London landmarks v1 [superseded by real-geography placement]
- [x] Pylons auto-spaced/snapping; 3-phase poles; pole transformers; vaults
      under big buildings only
- [x] Hotkeys; suitability overlays; planning permission; more gen types
- [x] Bill socialized across all licence-area customers

### Founding prompt
- [x] SimCity-quality polished game; London electricity network operator;
      tutorial; full test suites; Vercel deploy; Supabase accounts/saves/
      leaderboard; CI
