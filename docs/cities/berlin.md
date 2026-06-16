# Berlin — Code-Art City Reference

Visual reference for rendering Berlin as code-drawn isometric sprites. All
heights verified against Wikidata (P2048) / Wikipedia; see Sources.

## Palette

| token | hex | justification |
|---|---|---|
| wallMain | `#D8CDB8` | Warm grey-cream stucco of 5–6 storey Altbau perimeter blocks; the city's default facade |
| wallAlt | `#C9A24B` | Ochre / mustard stucco — the common second tone of Gründerzeit tenements |
| wallAccent | `#B0492E` | Red Backstein brick (Rotes Rathaus, Oberbaumbrücke, industrial halls) |
| wallBrickYellow | `#D6B36A` | Yellow/buff North-German brick (Hansa-style and gabled warehouses) |
| wallStone | `#E4DAC4` | Pale Prussian sandstone of Mitte's neoclassical monuments (Brandenburg Gate, museums) |
| wallConcrete | `#9FA0A0` | Plattenbau pre-cast concrete slab grey — flat, cool, repetitive panels of the East |
| roof | `#566B5E` | Oxidised verdigris copper — the signature green of Berlin domes and turret roofs |
| roofAlt | `#52555C` | Dark blue-grey slate of steep Altbau mansard roofs |
| roofTile | `#8C5038` | Muted red-brown clay pantile, lower/older pitched roofs |
| glass | `#9FB8C4` | Cool blue-grey curtain glass of Potsdamer Platz / Hauptbahnhof under overcast sky |
| glassWarm | `#E9C079` | Warm lit windows at dusk; the glow when a block is powered |
| metalSteel | `#B9C0C4` | Brushed stainless steel / steel lattice (Fernsehturm sphere, Funkturm, station roofs) |
| pavement | `#A8A29A` | Grey granite-sett and concrete-slab Gehweg; cobbles in older quarters |
| ground | `#7E8466` | Tiergarten / park and green-belt soil-and-grass, slightly desaturated |
| vegetation | `#6E7E54` | Dusty linden and plane-tree green, muted by northern light |
| water | `#5E7480` | The Spree and canals — flat slate-blue-green, low-reflectance under grey sky |
| shadowNavy | `#2E3340` | Deep cool navy for cast shadows in the dusk world |

Berlin's overall character is cool and muted — grey-cream and ochre stucco against verdigris-green copper and slate, more horizontal and low-rise than vertical. Its golden hour is low, soft and northern: often filtered through overcast haze, so even sunset light lands pale and diffuse rather than fierce, lighting the sandstone monuments amber while courtyards fall into navy shadow.

## Architectural character

The dominant fabric is the 5–6 storey stucco Altbau perimeter block: ochre, grey or cream rendered facades with ornate stringcourses, cornices and window surrounds, wrapped around enclosed courtyards (Hinterhöfe) and crowned with steep blue-grey slate mansard roofs — interrupted across the former East by long, flat-roofed Plattenbau concrete slabs in uniform pre-cast panel grey, and by red and yellow Backstein brick. The centre (Mitte) reads as Prussian sandstone neoclassicism — colonnaded museums and gates in pale stone — punctuated by big oxidised-copper domes gone soft green, then crashed against the cool steel-and-glass towers of Potsdamer Platz and Hauptbahnhof. Roof forms split three ways: steep slate mansards on the tenements, ribbed green-copper domes and turret caps on the monuments, and dead-flat roofs on Plattenbau and modernist boxes. What makes Berlin instantly recognisable is the contrast of horizontality and a few sharp icons: the colonnaded Brandenburg Gate with its bronze Quadriga, the dull-green copper domes of Museum Island and Gendarmenmarkt, and above it all the impossibly slender Fernsehturm with its faceted steel sphere.

## Heroes (ranked)

1. **Brandenburg Gate (Brandenburger Tor)**
   - Type: gate / monument
   - Height: 26 m (to top of the Quadriga); structure ~20.3 m, width ~62.5 m
   - Recreate-it spec: A wide, low pale-sandstone screen far broader than tall (~3:1 width:height), five passage openings framed by twelve fat fluted Doric columns (~13.5 m) in two rows, capped by a plain horizontal entablature. Dead-centre on top, a dark weathered bronze chariot pulled by four horses abreast (the Quadriga) facing forward. Colour: warm cream-to-grey sandstone, smoke-darkened in the recesses; the statue near-black green-bronze. No dome, no spire — squat, symmetrical, ceremonial.

2. **Fernsehturm (Berlin TV Tower)**
   - Type: tower
   - Height: 368 m (with antenna)
   - Recreate-it spec: A single extremely slender tapering pale-concrete shaft (~15:1 height:width) rising from a small splayed foot, topped near the summit by a faceted brushed-stainless-steel sphere about twice the shaft's width that catches a cross-shaped sunlight glint. Above the sphere a stepped pink-banded section narrows into a long red-and-white candy-striped antenna spike. Read it as: pencil shaft, silver bauble, needle. The single tallest, most unmistakable thing on the skyline.

3. **Reichstag building**
   - Type: civic
   - Height: 47 m
   - Recreate-it spec: A broad, heavy rectangular grey-sandstone palace, roughly square in plan, with a projecting central portico of six columns under a triangular pediment and a square corner tower at each of the four corners. Crowning the centre, the Foster addition: a transparent glass-and-steel dome (cupola) like a faceted glass beehive with a spiralling internal ramp, catching cool blue-grey light. Massive, grounded, horizontal — pale stone body, sparkling glass crown.

4. **Berlin Cathedral (Berliner Dom)**
   - Type: religious / dome
   - Height: 98 m (current; 90 m long, 33 m dome diameter)
   - Recreate-it spec: A bulky Baroque-Revival church in pale sandstone with a single huge central drum-and-dome of oxidised verdigris green, ribbed and topped by a green lantern and gilt cross, flanked by four smaller green-copper corner cupolas. The dome is the hero — wide, bulbous, deep green over warm stone, sitting low and monumental on the Spree by Museum Island. Heavier and greener than any other roof in the city.

5. **Berlin Victory Column (Siegessäule)**
   - Type: monument / column
   - Height: 67 m
   - Recreate-it spec: A tall, slim sandstone column on a square polished dark-red granite base (~18.8 m square), the shaft banded with three drum-like tiers studded with gilded captured cannon barrels, ringed near the top by a circular colonnaded gallery of 16 columns. At the very top, a gilded bronze winged Victory figure (8.3 m, "Goldelse") that flashes gold. Slender, golden-crowned, isolated in a round green roundabout in the Tiergarten.

6. **Berlin Wall / East Side Gallery**
   - Type: monument / memorial
   - Height: ~3.6 m tall, 1,316 m long surviving section
   - Recreate-it spec: A long, low, continuous run of pre-cast concrete wall panels, each a flat vertical slab capped by a rounded sewer-pipe top rail, the river side densely covered in bright multicoloured murals against pale concrete. Not a building — a ribbon. Render as a thin grey-concrete line snaking along the Spree, splashed with saturated colour blocks (reds, blues, yellows) on its face.

7. **Memorial to the Murdered Jews of Europe (Holocaust Memorial)**
   - Type: memorial
   - Height: stelae vary 0.2–4.7 m; 2,711 slabs over 1.9 ha
   - Recreate-it spec: A large flat city block filled with a tight rectilinear grid of 2,711 plain dark-grey concrete rectangular blocks (stelae), all the same footprint (~2.4 × 0.95 m) but rising to wildly different heights so the field undulates from ankle-low at the edges to over-head in the centre, set on a gently rolling floor. No colour, no ornament — a sea of grey monoliths in straight aisles. Read it as a wavy grey pin-grid.

8. **Berlin Hauptbahnhof**
   - Type: station
   - Height: ~430 m long; arched glass roof hall 321 m, two crossing levels
   - Recreate-it spec: A vast modern steel-and-glass station: a long, low, curved barrel-vaulted glass train shed (the E–W upper level) crossed at right angles by a wider glass hall, with two parallel glass office slabs straddling the tracks like a bridge. All light grey-blue glass and exposed white-steel trusses, transparent and gridded. The signature is the crossing of two glazed volumes — luminous, lattice-ribbed, no masonry.

9. **Oberbaumbrücke (Oberbaum Bridge)**
   - Type: bridge
   - Height: ~4.5 m clearance; ~154 m long, double-deck
   - Recreate-it spec: A red-brick double-decker bridge over the Spree: a lower road deck on arched piers, an upper viaduct carrying the U-Bahn, and at the centre two tall slim pointed brick towers (mock-Gothic, like a miniature castle gate) joined by a covered arcade. Colour: warm red Backstein brick with pale stone trim, green-tinged copper turret caps. Reads as a fortified twin-towered brick gateway spanning water.

10. **Kaiser Wilhelm Memorial Church (Gedächtniskirche)**
    - Type: religious
    - Height: 71 m (broken spire; originally 113 m)
    - Recreate-it spec: A stout, dark, war-damaged neo-Romanesque church tower of grey-brown stone, deliberately left as a jagged hollow ruin — its top broken off flat and ragged (the "hollow tooth"). Beside it sit a low modern octagonal chapel and a slim hexagonal bell tower clad in a honeycomb of small deep-blue glass blocks that glow blue when lit. The hero contrast: a broken stone stump next to glowing blue glass.

11. **Konzerthaus & Gendarmenmarkt twin domed churches (French & German Cathedral)**
    - Type: religious / dome (ensemble)
    - Height: domed towers ~ matched pair flanking the hall; domes ~13–23 m diameter
    - Recreate-it spec: A symmetrical square (Gendarmenmarkt) with a neoclassical concert hall in the middle (a temple-fronted block with a low triangular-pediment portico and central attic) flanked by two near-identical free-standing domed towers — each a circular drum colonnade topped by a green-copper ribbed cupola and gilt finial, in pale sandstone. The signature is the mirror-image pairing: two matching green domes bracketing a columned hall.

12. **Sony Center (Potsdamer Platz)**
    - Type: skyscraper / civic
    - Height: tent roof up to 67 m; adjacent Bahn Tower 103 m
    - Recreate-it spec: A ring of cool steel-and-glass buildings around a circular plaza, roofed by a dramatic open tent-like canopy — a shallow cone of radiating steel cables and translucent fabric/glass sails (like a glowing umbrella or volcano), peaked off-centre and lit blue/magenta at night. Beside it, a slim curved blue-glass tower (Bahn Tower) with a sloped top. All glass, cables and curves — futuristic, reflective, no masonry.

13. **Rotes Rathaus (Red Town Hall)**
    - Type: civic
    - Height: 74 m (tower); body 27 m, square 99 × 99 m
    - Recreate-it spec: A large square-plan civic block of bright red brick with round-arched windows and pale terracotta detail, four wings around a courtyard, fronted by an arcaded ground floor. From the centre rises one tall square red-brick clock-and-bell tower, slightly stepped, with a low pyramidal cap. Solidly rectilinear and emphatically red — the warmest large mass in Mitte.

14. **Funkturm (Radio Tower)**
    - Type: tower
    - Height: 146.78 m
    - Recreate-it spec: A slender open steel-lattice tower like a small grey Eiffel Tower — four splayed legs tapering to a narrow trussed shaft, a single boxy enclosed observation/restaurant pod partway up, and a thin mast on top. Painted grey-silver steel girders, see-through against the sky. Older, lighter and lacier than the Fernsehturm; "der lange Lulatsch" (the lanky lad).

15. **Olympiastadion**
    - Type: stadium
    - Height: ~21 m rim; bowl 303 × 228 m, gate towers 35 m
    - Recreate-it spec: A huge oval stone-clad stadium bowl, low and heavy, ringed by a colonnade of square pale-limestone piers; the seating dips below grade so it reads as a broad shallow ellipse. A modern pale-grey translucent ring-roof floats over the stands on slim columns, open at the centre. On the east a monumental gateway of two square stone towers (Marathon Gate). Austere, monumental, horizontal pale stone with a soft white roof halo.

16. **Charlottenburg Palace (Schloss Charlottenburg)**
    - Type: palace
    - Height: central domed tower; very long Baroque frontage
    - Recreate-it spec: A long, low yellow-ochre Baroque palace wing (many bays, white pilasters and window trim, grey slate roof) with a central projecting block crowned by a tall green-copper domed cupola-tower; atop the dome a gilded weather-vane figure of Fortuna (4.5 m) that glints gold. Symmetrical, horizontal, golden-walled with a single green-and-gold dome marking the centre.

17. **Humboldt Forum / Berlin Palace (Berliner Schloss)**
    - Type: palace / civic
    - Height: dome ~ on a 4-storey block; very large square footprint
    - Recreate-it spec: A massive reconstructed Baroque palace block, square around courtyards, with warm sandstone-coloured facades of heavy rusticated stonework, regular pilasters and a balustraded roofline studded with statues. Over the western portal sits a green-copper drum dome with a gold lantern and cross. One facade is plain modern render (the rebuilt east side) — so half historic ornament, half blank. Bulky, ornate, palace-yellow with a green dome.

18. **Bode Museum (Museum Island)**
    - Type: civic / dome
    - Height: rounded dome over the prow
    - Recreate-it spec: A pale-sandstone Baroque-Revival museum sitting on the sharp northern prow of Museum Island like a ship's bow, its rounded end crowned by a large green-copper drum dome with a smaller domed entrance below. Curved, elegant, pale stone meeting the water on two sides, one big green dome at the point. Reflects in the Spree.

19. **Tempelhof Airport**
    - Type: airport
    - Height: low (6–8 m hangar halls); among the world's largest buildings by footprint
    - Recreate-it spec: An immense, low, sweeping crescent-shaped terminal in grey stone — a gently curved (quadrant) frontage over a kilometre long, monumentally austere 1930s stripped-classical stonework, fronting a vast cantilevered canopy roof that sweeps out over the apron with no visible columns. Read it as a giant grey stone arc hugging an open field, capped by a long curving overhang. Horizontal to the extreme; almost no height.

20. **Molecule Man**
    - Type: monument / sculpture
    - Height: 30 m
    - Recreate-it spec: Three giant flat human figures (~30 m) of perforated silver-grey aluminium, standing in the river Spree, leaning in to meet at the centre as if merging, their whole bodies punched full of round holes so light and sky show through. Tall, thin, semi-transparent metal silhouettes rising straight out of the water — brushed aluminium, no colour, a riddled grey cut-out trio.

## Sources

- https://en.wikipedia.org/api/rest_v1/page/summary/Brandenburg_Gate · https://de.wikipedia.org/wiki/Brandenburger_Tor · Wikidata Q82425
- https://en.wikipedia.org/api/rest_v1/page/summary/Fernsehturm_Berlin · Wikidata Q151356
- https://en.wikipedia.org/api/rest_v1/page/summary/Reichstag_building · Wikidata Q151897
- https://en.wikipedia.org/api/rest_v1/page/summary/Berlin_Cathedral · https://de.wikipedia.org/wiki/Berliner_Dom · Wikidata Q154563
- https://en.wikipedia.org/api/rest_v1/page/summary/Berlin_Victory_Column · Wikidata Q154987
- https://en.wikipedia.org/api/rest_v1/page/summary/East_Side_Gallery · Wikidata Q313746
- https://en.wikipedia.org/api/rest_v1/page/summary/Checkpoint_Charlie · Wikidata Q68689
- https://en.wikipedia.org/api/rest_v1/page/summary/Memorial_to_the_Murdered_Jews_of_Europe · Wikidata Q160700
- https://en.wikipedia.org/api/rest_v1/page/summary/Berlin_Hauptbahnhof · Wikidata Q1097
- https://en.wikipedia.org/api/rest_v1/page/summary/Oberbaum_Bridge · Wikidata Q695082
- https://en.wikipedia.org/api/rest_v1/page/summary/Kaiser_Wilhelm_Memorial_Church · Wikidata Q153951
- https://en.wikipedia.org/api/rest_v1/page/summary/Gendarmenmarkt · Wikidata Q170103 · French Cathedral Q315694 · German Cathedral Q315644 · Konzerthaus Q702548 · Deutscher Dom (de.wikipedia.org)
- https://en.wikipedia.org/api/rest_v1/page/summary/Sony_Center · https://de.wikipedia.org/wiki/Sony_Center · Wikidata Q641108
- https://de.wikipedia.org/wiki/Rotes_Rathaus · Wikidata Q155210
- Funkturm: Wikidata Q699724 (height 146.78 m, steel)
- https://en.wikipedia.org/api/rest_v1/page/summary/Olympiastadion_(Berlin) · https://de.wikipedia.org/wiki/Olympiastadion_Berlin · Wikidata Q151374
- https://en.wikipedia.org/api/rest_v1/page/summary/Charlottenburg_Palace · https://de.wikipedia.org/wiki/Schloss_Charlottenburg · Wikidata Q154996
- https://en.wikipedia.org/api/rest_v1/page/summary/Humboldt_Forum · Wikidata Q20196262
- https://en.wikipedia.org/api/rest_v1/page/summary/Bode_Museum · Wikidata Q157825
- https://en.wikipedia.org/api/rest_v1/page/summary/Pergamon_Museum (Q157298) · Altes Museum (Q156722) — Museum Island context
- https://en.wikipedia.org/api/rest_v1/page/summary/Berlin_Tempelhof_Airport · https://de.wikipedia.org/wiki/Flughafen_Berlin-Tempelhof · Wikidata Q9686
- Molecule Man (Berlin sculpture): Wikidata Q125620994 · https://de.wikipedia.org/wiki/Molecule_Man (30 m, perforated aluminium)
- https://en.wikipedia.org/api/rest_v1/page/summary/Bellevue_Palace,_Germany · Wikidata Q317091 (considered, not in top 20)
