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
