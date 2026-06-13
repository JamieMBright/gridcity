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

- [ ] **Map-edge rock walls (owner, 2026-06-13 04:48): "I don't
      understand why the edges of the map are rock walls. Just stick to
      real towns."** The map boundary renders as rock/cliff walls —
      remove; the edge should resolve into real terrain/towns (or a
      soft fade), not an artificial rock rim. Folds into Wave 8 MAP
      OVERHAUL (edge-of-world treatment in londonMap.ts/render).

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
  - [ ] TERRAIN ART/GENERATION (folds into Wave 8 MAP OVERHAUL; use
        environment-art + color-theory skills): the countryside is a
        4×4 patchwork of garish yellow/orange/brown squares — reads as
        American farmland, not English green belt. Wants: ORGANIC,
        natural terrain selection (less obviously random/gridded);
        LESS lurid/yellow ("luteous") colours, held inside the lofi
        sunset palette; LUSH forest where forest exists; LUSHER greens
        for the Surrey Hills / AONB uplands; garden-grass green + more
        CONCRETE around towns; really bring GREEN BELT + BROWNFIELD
        vibes to life. Implies: break the 8×8/field-grid hashing into
        organic enclosure shapes, retune the field/crop tint ramps
        (desaturate the yellows), proper woodland masses, upland-green
        zones, peri-urban concrete/scrub fringe, distinct brownfield
        texture. Diagnose tileChooser.ts field hashing + the seasonal
        field tints (beauty pass) + the density/zone field.
  - [ ] BROWNFIELD-FAVOURED PLANNING + APPEALS (sim mechanic): generation/
        demand applications should FAVOUR arriving on BROWNFIELD tiles
        (needs a brownfield texture/flag in the map model — ties to the
        terrain work). Some applications still target NON-brownfield —
        but those do NOT instantly build: open a ~30-day APPEALS window
        and simulate PLANNING decisions from the relevant COUNCIL
        (approve / reject, weighted by council profile + land type +
        conservation/green-belt status). Rejections + approvals + appeals
        FEATURE ON THE NEWS BANNER feed ("Camford council rejects the
        Estuary Sun array on green-belt grounds", etc.). Sim lane:
        events/applications.ts + councils + the news/event stream —
        coordinate with the running events lanes; lands Wave 8/9.

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
  - [ ] Roads take up too much real estate — NARROW them; buildings must
        sit UP AGAINST the roads ("London is all high street" — frontage
        density, not set-back blocks with road moats).
  - [ ] Roads zig-zag like crazy — re-lay them ALL.
  - [ ] Method (owner-specified pipeline): start with the RIVER (improve
        the Thames shape using the real reference at the same time) →
        then MAJOR ROADS mapped like London actually has them (M25
        orbital + the real radials), overlaid at true positions relative
        to the river → then SMALLER roads → THEN seed towns + buildings
        afterwards (so fabric hangs off the network, not vice-versa).
  - [ ] Buildings too sparse — London is denser than the screenshot;
        raise urban density, terraces/blocks fronting streets.
  - [ ] Landmarks: don't pop hard enough — give them a SPECIAL GLEAM;
        many are still MISSING — add them (audit the real London set).
  - [ ] Town labels at zoomed-out view: font too small, ILLEGIBLE on
        mobile — enlarge / legibility pass (game-ui-design doctrine).
  - [ ] MUST leverage the installed design skills (environment-art for
        density + visual hierarchy + composition, color-theory, game-ui-
        design for labels/readability) — owner: "significant improvements
        since using them."
  - [x] DESIGN PASS launched (read-only doc, runs alongside Wave 7):
        docs/map-overhaul.md — analyse both reference images + the
        current londonMap.ts generation + render pipeline; produce the
        river→roads→minor→density→landmarks→labels build plan with real
        road/landmark inventories and phased, previewable steps.
  - [ ] IMPLEMENTATION = Wave 8 flagship (after Wave 7 frees MapRenderer/
        render; SAVE_VERSION bump expected — map geometry changes).

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

- [ ] **Existing GB generation from real data**: owner can provide the
      Embedded Capacity Register extract (location + capacity of connected
      generation). Integrate when supplied; Open Infrastructure Map judged
      off-piste for now. (Hand-seeded real-ish plants shipped meanwhile.)

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

## Done (chronological, latest first)

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
