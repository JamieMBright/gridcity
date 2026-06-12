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
