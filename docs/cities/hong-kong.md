# Hong Kong

Code-art reference for an isometric, vector-sprite renderer. All heights/materials
verified against Wikipedia REST summaries and Wikidata (see Sources). Hexes are
tuned to the real city but pushed gently toward a lofi golden-hour palette.

Dense pastel/grey high-rise stacked up steep green slopes, mirror-glass finance
towers on the harbour, neon at street level, and the dark-green Peak behind.
Subtropical haze; golden hour throws warm amber on the west faces of the towers
and turns Victoria Harbour molten orange.

## Palette

| Token | Hex | Note |
|-------|------|------|
| wallMain | `#C9CCD2` | Weathered pale concrete/grey of the mass residential towers; warm-cool neutral |
| wallAlt | `#A7B0B4` | Cooler bluish concrete render on public-housing estate slabs and older blocks |
| wallAccent | `#D8B79A` | Pastel tower skin — the salmon/peach and buff repaints common on Kowloon & estates |
| roof | `#5B6068` | Flat rooftop deck: dark grey concrete crammed with water tanks, AC plant, vents, ducting |
| roofAlt | `#C9A23A` | Golden glazed ceramic tile of temple/monastery roofs (Wong Tai Sin, Po Lin) |
| glass | `#7FA9B8` | Cool teal-grey curtain wall — IFC/ICC/BoC bluish reflective glazing |
| glassWarm | `#F2C879` | Lit windows and sunset-warm office glow at dusk; the city's signature amber sparkle |
| pavement | `#B7B2AB` | Grey concrete podium decks, elevated walkways and harbourfront paving |
| ground | `#9C9690` | Reclaimed-land ground plane, bare concrete platforms, retaining walls, road grey-brown |
| vegetation | `#4E7141` | Deep subtropical green of Victoria Peak and the steep hillsides behind the towers |
| water | `#3E6B72` | Victoria Harbour: dark teal-brown, busier and browner than open sea, churned by ferries |

Overall colour character: a dense field of warm-grey and pastel concrete towers and
teal mirror-glass rising straight from dark teal-brown harbour water, backed by lush
saturated green hills, with hot neon glints below. At golden hour the west-facing
curtain walls flare amber-pink, shadowed faces drop to dusty navy-purple, and the
first lit windows speckle the slabs with `glassWarm`, turning the wall-of-towers into
a glittering ridge against the Peak.

## Architectural character

Hong Kong's dominant fabric is the slender, extremely tall **concrete residential
tower in dense clusters** — 30 to 50+ storeys, flat-roofed, repeated in cruciform or
"pencil" plans and packed shoulder-to-shoulder on podiums so the city reads as a
continuous ridge of pale grey-and-pastel slabs rather than individual buildings; every
facade is textured by tiny gridded windows, protruding bay-window "wings," hanging
window-unit air conditioners, drying poles, and the unmistakable lattice of **bamboo
scaffolding** wrapping towers under repair, with public-housing estates stacking
near-identical blocks. The CBD spine (Central, Admiralty, Wan Chai on the island; West
Kowloon across the water) is a tight stand of **glass supertalls rising straight from
reclaimed harbour land**, each with a distinct sculpted crown — bluish-teal and silver
giants like ICC, the IFC towers, Central Plaza and the triangulated Bank of China
Tower. Roofs are almost universally **flat and cluttered** (water tanks, lift overruns,
cooling plant, signage frames, antennae) — there is no pitched-roof vernacular except
temples and monasteries, which flip to sweeping **golden or grey-brown glazed-tile hip
roofs**. What makes Hong Kong instantly itself is the collision of scale: a solid wall
of impossibly dense towers crammed against the **steep green wedge of Victoria Peak**
and meeting the working harbour, with the green-and-white **Star Ferry** crossing the
foreground water and the skyline lighting up window-by-window at dusk.

## Heroes (ranked)

1. **International Commerce Centre (ICC)**
   - **Type**: skyscraper
   - **Height**: 484 m (108 storeys; tallest in HK)
   - **Recreate-it spec**: A colossal tapering square-plan glass shaft on the West Kowloon
     harbourfront, ~1:9 footprint:height, the tallest thing in the scene by a clear margin.
     Faces are gently concave and slope inward with subtly flared, scalloped corners; clad
     in cool silver-blue reflective glass (`glass`) with fine vertical fluting that catches
     sky. The top flares into a multi-tiered stepped crown (flat parapet, slightly concave
     top edge) rather than a point, sitting on a broad podium (the Elements mall). At dusk
     the upper floors carry running coloured LED light shows.

2. **Two International Finance Centre (2 IFC)**
   - **Type**: skyscraper
   - **Height**: 412 m (88 storeys; 2nd-tallest in HK)
   - **Recreate-it spec**: The dominant tower on the Central waterfront — a pale,
     curved-corner shaft, ~1:8, that tapers and steps inward in subtle setbacks and ends
     not flat but in a **crown of upward-reaching curved fins/notches** around an open
     obelisk top, like an open hand or an upturned syringe tip. Light grey-silver `glass`
     with strong vertical mullion lines; reads cleaner and lighter than ICC. Stands beside
     its shorter twin (1 IFC, ~210 m) over the IFC Mall podium.

3. **Bank of China Tower**
   - **Type**: skyscraper
   - **Height**: 367 m (to roof; antennae above)
   - **Recreate-it spec**: I.M. Pei's icon — a square-based prism diagonally sliced into
     **asymmetric triangular shafts that step back in stages**, so each quadrant rises to a
     different height and the whole twists upward like growing bamboo, ~1:8. Surfaces are
     blue-tinted reflective glass over a bold exposed silver/white **diagonal X cross-bracing
     lattice** (the visible X's are essential). Apex is a single pointed triangular shaft
     topped by **two thin antenna masts**. Razor-sharp, crystalline, knife-like.

4. **Central Plaza**
   - **Type**: skyscraper
   - **Height**: 374 m (78 storeys)
   - **Recreate-it spec**: A slender **triangular (chamfered) plan** tower in Wan Chai,
     ~1:8, its three faces clad in warm **gold-bronze reflective glass** (lean `glassWarm`
     over `glass`) that distinguishes it from its cool-blue neighbours. Chamfered vertical
     corners give a near-hexagonal silhouette. Topped by a tapering glass pyramid and a tall
     mast carrying a four-quadrant colour-changing **neon "clock" light bar** at night.

5. **The Center**
   - **Type**: skyscraper
   - **Height**: 346 m (73 storeys)
   - **Recreate-it spec**: A taut, all-glass, steel-framed tower (no concrete core) with a
     stepped, chamfered-corner silhouette — the square plan notches back in stages toward a
     thin spire/mast, ~1:9. Cool silver-blue glazing by day; its signature is **continuous
     neon light-tube strips up its corners** that slowly cycle through rainbow colours at
     dusk, making it a glowing colour beacon among the Central towers.

6. **HSBC Main Building**
   - **Type**: skyscraper
   - **Height**: 179 m (47 floors)
   - **Recreate-it spec**: Norman Foster's high-tech landmark — a wide blocky tower that
     **wears its structure on the outside**: hung from five pairs of steel masts with bold
     horizontal **suspension trusses** (chevron coat-hanger bracing) visible across the
     grey-silver facade, stepping back in three tiers. Underside is open (the public plaza
     passes beneath it); the belly is a glazed atrium. Aluminium-clad, mechanical,
     scaffold-like, with external ladder-frame structure. Two bronze lions flank the base.

7. **Tsing Ma Bridge**
   - **Type**: bridge
   - **Height**: 206 m (towers); 1,377 m main span
   - **Recreate-it spec**: A long **double-deck suspension bridge** with two tall
     portal-frame towers (twin legs joined by cross-beams), painted pale grey, carrying a
     single great sweeping main cable that dips low mid-span and rises to each tower top,
     with fine vertical hanger ropes dropping to a deep **box-girder deck** (road over
     rail). Slung between green island hills over a blue channel — render the catenary
     curve and tower portals clearly.

8. **Hong Kong International Airport (Chek Lap Kok)**
   - **Type**: airport
   - **Height**: low-rise terminal; on its own flat reclaimed island
   - **Recreate-it spec**: Foster's vast terminal — an immensely long, low Y-shaped
     concourse under a **continuous wave of barrel-vaulted silver-grey roofs** that ripple
     in repeated arches to the horizon; glass curtain-wall sides below. Set on flat reclaimed
     land with long parallel runways and parked aircraft. A huge shimmering corrugated
     roof-field — read it as horizontal sweep, not height.

9. **Tian Tan Buddha (Big Buddha)**
   - **Type**: monument
   - **Height**: 34 m (incl. base; statue 26.4 m), on a hilltop
   - **Recreate-it spec**: A colossal seated **bronze Buddha** on a tall three-tier white
     stone lotus-and-altar podium atop a hill, reached by a long flight of ~268 steps.
     Right hand raised palm-out (fear-not gesture), left resting on the knee; serene
     downward gaze, robed shoulders. Weathered dark bronze-green (`#5E6B4E`-ish over base
     bronze), facing north, catching warm light on its front; monumental, calm, frontal,
     crowning the Ngong Ping plateau.

10. **Hong Kong Convention and Exhibition Centre (HKCEC)**
    - **Type**: civic
    - **Height**: low-rise; large harbourfront footprint
    - **Recreate-it spec**: SOM's harbour-edge hall whose roof sweeps up into great curved
      aluminium **wing / bird-in-flight forms** — overlapping convex shells tilting up at the
      seaward edge over glass walls, like an unfolding seabird, sail, or manta ray. Pale
      silver-white metal roof, projecting on reclaimed land into Victoria Harbour. Low, wide,
      sculptural; the curved roof is the whole identity.

11. **Hong Kong–Zhuhai–Macau Bridge**
    - **Type**: bridge
    - **Height**: ~42 m (towers); 55 km total sea crossing
    - **Recreate-it spec**: An immensely long, low **cable-stayed sea bridge** snaking across
      open water, with periodic slender single-mast pylons from which fans of cables splay
      down to a thin flat deck just above the sea. Pale concrete-grey. Render as a thin ribbon
      dwindling to the horizon with a few elegant cable fans and artificial-island tunnel
      portals — scale by length, not height.

12. **Stonecutters Bridge**
    - **Type**: bridge
    - **Height**: 298 m (towers); 1,596 m total
    - **Recreate-it spec**: A modern **cable-stayed bridge** with two very tall, slender
      tapering single pylons (lower concrete shaft, upper stainless-steel-clad section that
      glints), each fanning two planes of cables in a harp pattern down to a sleek twin-deck
      roadway over a shipping channel. The pylons are the most needle-like bridge towers in
      the scene; emphasise their height and the harp of cables.

13. **Tsim Sha Tsui Clock Tower**
    - **Type**: tower (heritage)
    - **Height**: 44 m + 7 m lightning rod (51 m total)
    - **Recreate-it spec**: A lone square Edwardian **red-brick and granite campanile** on
      the Kowloon waterfront, ~1:3.5, with pale granite quoins and banding against warm red
      brick, arched openings, a clock face near the top on each side, a small domed copper
      cupola on a columned lantern, and a thin lightning-rod spike on top. The isolated last
      remnant of the old railway terminus, standing against the modern skyline at the Star
      Ferry pier.

14. **Star Ferry**
    - **Type**: station (ferry / pier)
    - **Height**: low; double-decked vessels + a pier
    - **Recreate-it spec**: Stout double-deck, double-ended harbour ferries in a
      **green-and-white** livery — dark forest-green hull and lower deck, white upper deck,
      a single tall central funnel and curved canopy ends. Pair with a modest covered
      timber-and-steel jetty. Show one mid-harbour leaving a wake on the `water`; an instantly
      readable HK motif in the foreground.

15. **Victoria Peak & Peak Tram**
    - **Type**: tower (lookout) / hilltop + funicular
    - **Height**: Peak ~552 m hill; Peak Tower 8 floors
    - **Recreate-it spec**: The dark-green forested massif rising directly behind the CBD,
      with towers climbing its lower slopes — the essential backdrop. At the summit, a low
      building roofed in a distinctive upturned **wok / anvil shape** (a curved bowl-like
      deck flaring out and up at the rim on a tapered grey podium), steel-and-glass with a
      warm-lit crown. Add the steep single-track **Peak Tram**: bright green funicular cars
      climbing the wooded slope at a dramatic angle.

16. **Wong Tai Sin Temple (Sik Sik Yuen)**
    - **Type**: temple (Taoist)
    - **Height**: low-rise complex
    - **Recreate-it spec**: A bright Taoist compound — the main hall has **vermilion-red
      columns** and walls under a sweeping **golden glazed-tile roof** (`roofAlt`) with
      upturned eaves and ornate ridge figures, and multi-coloured carved brackets in red,
      gold and green. Surround with smaller pavilions, ceremonial archways (pailou) and
      incense urns. Read it as red-and-gold, low and busy, glowing warm.

17. **Lippo Centre**
    - **Type**: skyscraper (twin)
    - **Height**: 186 m & 172 m (twin towers)
    - **Recreate-it spec**: Twin dark hexagonal-plan glass towers in Admiralty whose faceted
      facades bulge outward in stacked, rounded **knuckled blocks** that cling to the shaft
      like **koalas hugging a tree** — irregular protruding bays stepping up the faces. Dark
      blue-grey reflective glass; the lumpy, segmented silhouette is the whole point. Two
      towers of slightly different height side by side.

18. **Jardine House**
    - **Type**: skyscraper (heritage)
    - **Height**: ~179 m (52 floors; 1973)
    - **Recreate-it spec**: A clean rectangular slab on the Central waterfront whose smooth
      silver-white aluminium facade is punched with rows of **large circular porthole
      windows** — hundreds of identical round openings (nicknamed "the house of a thousand
      orifices"). Flat top, simple box massing; the circular-window grid is the unmistakable
      signature. Pale silver-grey, slightly reflective.

19. **Chi Lin Nunnery**
    - **Type**: temple (Buddhist)
    - **Height**: low-rise timber halls
    - **Recreate-it spec**: A serene **Tang-dynasty-style** Buddhist complex of interlocking
      timber (built without nails) — low wooden halls with broad, gently sweeping hip roofs
      of dark grey-brown ceramic tile, deep overhanging eaves on visible bracket sets, and
      natural dark-stained wood columns. Arrange around formal lotus ponds and bonsai
      courtyards. Muted, elegant, horizontal — grey-brown timber, not gilded.

20. **Hong Kong Observation Wheel**
    - **Type**: wheel
    - **Height**: 60 m
    - **Recreate-it spec**: A mid-size **Ferris wheel** on the Central harbourfront — a white
      steel spoked rim carrying ~42 enclosed glass gondolas, mounted on an A-frame support
      base over the waterfront promenade. White by day; at night the rim and spokes run with
      programmable coloured LEDs. Sits low and round against the tower backdrop and harbour
      water.

## Sources

- Wikipedia/Wikidata: International Commerce Centre (Q317034) — 484 m, glass, 2010
- Wikipedia/Wikidata: International Finance Centre (Hong Kong) / Two International Finance Centre (Q15246) — 2 IFC 412 m, 88 floors, 2003
- Wikipedia/Wikidata: Bank of China Tower (Hong Kong) (Q214855) — 367.4 m, glass + aluminium, 1990
- Wikipedia/Wikidata: Central Plaza (Hong Kong) (Q112640) — 374 m, 1992
- Wikipedia/Wikidata: The Center (Q130478) — 346 m, steel, 73 floors, 1998
- Wikipedia/Wikidata: HSBC Main Building / HSBC Building (Hong Kong) (Q1372014) — 178.7 m, 1985
- Wikipedia/Wikidata: Tsing Ma Bridge (Q16396) — 206 m towers, 1,377 m span, steel, suspension
- Wikipedia: Hong Kong International Airport (Q17704) — 1998, Foster terminal
- Wikipedia/Wikidata: Tian Tan Buddha / The Big Buddha (Hong Kong) (Q528079) — 34 m (statue 26.4 m), bronze, 1993
- Wikipedia/Wikidata: Hong Kong Convention and Exhibition Centre (Q597725) — SOM
- Wikipedia/Wikidata: Hong Kong–Zhuhai–Macau Bridge (Q1191515) — 55 km, cable-stayed + tunnel
- Wikipedia/Wikidata: Stonecutters Bridge (Q1587288) — 298 m towers, 1,596 m total, steel, cable-stayed, 2009
- Wikipedia/Wikidata: Clock Tower, Hong Kong / Tsim Sha Tsui Clock Tower (Q692288) — 44 m + 7 m rod, red brick & granite, 1915
- Wikipedia: Star Ferry (Q1859131) — operating since 1898
- Wikipedia: Sik Sik Yuen Wong Tai Sin Temple
- Wikipedia/Wikidata: Lippo Centre (Hong Kong) (Q2618145) — 186 m & 172 m, 1988
- Wikipedia/Wikidata: Jardine House (Q6130456) — 1973, round windows
- Wikipedia/Wikidata: Chi Lin Nunnery (Q2180716) — Tang-dynasty timber, rebuilt 1998
- Wikipedia/Wikidata: Hong Kong Observation Wheel (Q18119458) — 60 m, 42 gondolas
- Wikipedia/Wikidata: Peak Tower (Q842535) — 8 floors, 1997; Po Lin Monastery (Q1041436); Ngong Ping 360 (Q1984341); Man Mo temples in Hong Kong (Q30963154)
- Wikidata material/unit Qids resolved: Q11469 (glass), Q663 (aluminium), Q11427 (steel), Q34095 (bronze), Q11573 (metre)
