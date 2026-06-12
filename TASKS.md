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

- [ ] **Map recognisability pass 2** (owner can't model 1M properties; keep it
      sensible/enjoyable): continue tuning until London "reads" at a glance.
- [ ] **Existing GB generation from real data**: owner can provide the
      Embedded Capacity Register extract (location + capacity of connected
      generation). Integrate when supplied; Open Infrastructure Map judged
      off-piste for now. (Hand-seeded real-ish plants shipped meanwhile.)
- [ ] Car parks gain EV charging load (flagged "in future" by owner).
- [ ] Coal station footprint 3×2 — owner originally said "2×6 and all sorts";
      enlarge if asked again.
- [ ] Town evolution: densification of existing areas (only edge infill today).

## Done (chronological, latest first)

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
- [ ] Sprites to match (Hinkley-style reactor hall, gantried switchyard
      per ref image) — queued behind the in-flight landmark-art agent
      to avoid atlas clashes; interim art centres on the plot

### Blackout explanations prompt (PV at night)
- [x] Every time a site loses power, an explanation event fires: on
      live→dark transitions each service sub diagnoses its island —
      "the sun has set on its only supply — solar makes nothing at
      night; add a battery or firm backup", wind died, kit tripped
      upstream, plant still under construction, supply shortfall
      (unit-tested with a solar-only island at nightfall)

### Landmarks-to-scale + road tessellation prompt
- [ ] Landmarks TO SCALE and recognisable (owner supplied reference art):
      Parliament + Big Ben across multiple tiles, a great London Eye
      wheel, a taller glassy Shard, Tower Bridge that LOOKS like Tower
      Bridge (twin gothic towers + bascule spans over the river); St
      Paul's dome + Gherkin where feasible — bespoke multi-tile sprites,
      verified on render previews
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
