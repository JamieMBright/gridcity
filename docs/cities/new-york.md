# New York City — code-art reference

Research for rendering NYC as code-drawn vector sprites in an isometric
city-builder. Heights/materials verified against Wikipedia + Wikidata
(see Sources). Unit note: Wikidata `P2048` heights came back in metres
(`Q11573`); a few non-tall figures were read from article prose where
`P2048` was empty (flagged in the hero rows).

## Palette

| token | hex | justification |
|---|---|---|
| wallMain | `#9B5B43` | Classic brownstone — the warm chocolate-russet sandstone facing of Brooklyn/Harlem rowhouses, the dominant residential wall. |
| wallAlt | `#C8A878` | Buff/tan limestone and cast-stone of Beaux-Arts and pre-war apartment blocks (Grand Central, Met Museum). |
| wallAccent | `#D8C9B0` | Pale grey-white glazed brick of Art-Deco shafts (Chrysler, Empire State) and terracotta-trimmed towers. |
| brickRed | `#8A4A3A` | Sooty common-brick of walk-up tenements and warehouse lofts — dusty oxblood, weathered darker at parapets. |
| terracotta | `#B5623F` | Orange-red terracotta cladding and cornice ornament of early-1900s commercial blocks (Woolworth ribs). |
| roof | `#3B3A40` | Flat tar-and-gravel roofs and dark bituminous parapets seen from above — near-charcoal with a violet cast. |
| roofAlt | `#5E4B3C` | Weathered wood + rusty steel of rooftop water towers (the ubiquitous NYC skyline barrel-on-stilts). |
| blackSteel | `#2A2D33` | Blackened steel of the Seagram-school International curtain walls and bridge ironwork. |
| glass | `#7FA3B0` | Cool blue-green vision glass of modern slabs and condo towers, muted and slightly grey. |
| glassWarm | `#E8B66A` | Golden-hour reflection / lit-window glow — windows catching low amber sun against navy shadow. |
| pavement | `#9A938C` | Grey concrete sidewalk + bluestone flag, dusty and warm-grey. |
| asphalt | `#46434A` | Dark grey-violet street asphalt with worn lane paint. |
| ground | `#7C6B57` | Bare earth / construction lots — muted ochre-brown. |
| vegetation | `#5E7A4E` | Central Park / street-tree green, slightly dusty and muted (not saturated). |
| water | `#41697A` | East River / Hudson / Harbor — steel blue-grey, cooler and choppier than a calm lake. |
| copperPatina | `#5FA88C` | Verdigris patina of the Statue of Liberty and old copper roofs/finials. |

Overall colour character: NYC reads as **warm masonry against cool glass** — a low-saturation field of brownstone russet, buff limestone and sooty brick, punctuated by charcoal flat roofs, blue-green curtain walls and the green of Central Park. At golden hour the west-facing limestone and Deco brick flare to peach and honey while the dense canyon walls fall into deep blue-violet shadow, water towers throw long silhouettes, and lit windows glow amber against a dusk-navy sky.

## Architectural character

The residential fabric is layered by era: low **brownstone rowhouses** (3-5 storeys, stone stoops, bracketed cornices, bay fronts) across Brooklyn and uptown; denser **walk-up brick tenements** (5-6 storeys, fire escapes zig-zagging the facade, flat parapets) on the Lower East Side and outer boroughs; and slabby **glass condo towers** along the rivers and in Hudson Yards. The Midtown and Downtown CBDs are a contrast of two skyscraper grammars — **setback Art-Deco towers** in pale brick that step inward as they rise toward ornamented metal crowns (driven by the 1916 zoning "wedding-cake" setback law), and post-war **International-style glass-and-steel slabs** with flat tops and sheer curtain walls. Roofs are overwhelmingly **flat**, crowded with **wooden water towers on steel legs**, parapets, bulkheads and rooftop tanks — the single most NYC rooftop signature when seen from above. What makes the city instantly recognisable is the **uniform tight street grid of tall flat-topped blocks forming continuous canyon walls**, the dense forest of setback masonry shafts and water towers, the Thames-less but river-bounded island silhouette of Manhattan, and a handful of unmistakable crowns (Empire State's tiered Deco mast, Chrysler's steel sunburst) rising above an otherwise even cornice line.

## Heroes (ranked)

1. **Empire State Building**
   - Type: skyscraper
   - Height: 380 m roof / 443 m incl. antenna (Wikidata `P2048` 453 m structural; 1931)
   - Recreate-it spec: A massive symmetrical Art-Deco shaft in pale grey-white limestone-and-brick with vertical piers of darker window bands and stainless-steel mullions, rising in broad stepped setbacks to a slimmer central tower. Cap it with a tiered cylindrical Deco "wedding-cake" crown and a slender antenna mast on top; proportion roughly 4:1 height:width, bulky and tapering, not needle-thin. Crown lights glow against the sky at dusk.

2. **Statue of Liberty**
   - Type: monument
   - Height: 46 m statue (to torch); 93 m incl. pedestal (1886)
   - Recreate-it spec: A standing robed female figure in oxidised **copper verdigris** (`copperPatina`), right arm raised holding a golden flame torch, left arm cradling a tablet, head wearing a seven-spiked radiating crown. She stands on a tall tan-stone pedestal atop an eleven-point star fort base. Slender, vertical, draped folds; the green statue should read at ~2:1 above its blocky pale pedestal.

3. **Chrysler Building**
   - Type: skyscraper
   - Height: 318.9 m (Wikidata `P2048`; 1930)
   - Recreate-it spec: A slender setback Art-Deco shaft in pale grey-white brick, crowned by seven radiating **stainless-steel sunburst arches** with triangular dormer windows, tapering to a sharp needle spire. ~6:1 height:width — markedly slimmer than the Empire State. The chevron steel crown glints; corners carry eagle gargoyles at a setback.

4. **One World Trade Center**
   - Type: skyscraper
   - Height: 541.3 m incl. spire / 417 m roof (Wikidata `P2048`; 2014)
   - Recreate-it spec: A single tapering glass obelisk on a square base that twists into eight tall isosceles triangles, so the silhouette reads square at the bottom and rotated-square (chamfered) at the top. All cool reflective blue-grey glass (`glass`) with a tall thin antenna spire dead-centre. Very tall, ~7-8:1, mirror-clean and crystalline.

5. **Brooklyn Bridge**
   - Type: bridge
   - Height: 84 m towers (Wikidata `P2048`); main span 486 m (1883)
   - Recreate-it spec: Two massive tan **limestone-granite towers**, each pierced by twin tall **pointed Gothic arches**, anchoring a suspension deck. From each tower fan a web of steel cables in the signature crisscross/diagonal stay pattern. Warm stone towers (`wallAlt`) against thin grey cable webs; squat, heavy, monumental — towers wider than they are slender.

6. **Times Square**
   - Type: civic (district)
   - Height: low-rise canyon, ~5-block bowtie plaza (n/a — district)
   - Recreate-it spec: A wedge/bowtie junction of mid-rise blocks whose entire lower facades are sheathed in glowing **animated billboards and LED screens** — saturated reds, electric blues, white spotlights — stacked from street to ~10 storeys. The buildings barely read as masonry; render as dark blocks plastered with luminous coloured panels, brightest element on the whole map at night.

7. **Flatiron Building**
   - Type: skyscraper
   - Height: 94 m (Wikidata `P2048`; 1902)
   - Recreate-it spec: A 22-storey **triangular wedge** like a flat iron, with a sharp rounded prow at the narrow end. Buff **limestone and glazed terracotta** facing (`wallAlt`), heavily ornamented Beaux-Arts cornice and bracketed top, gridded windows. Knife-thin from the prow, fattening to a normal block at the back; the defining feature is the acute triangular footprint.

8. **Rockefeller Center (30 Rock)**
   - Type: skyscraper
   - Height: 259 m / 850 ft, 66 floors (Wikidata `P2048`; 1933)
   - Recreate-it spec: A broad, thin **limestone Art-Deco slab** — wide on its main face, shallow in depth — rising in subtle vertical limestone piers with recessed window bands to a perfectly flat top. Pale buff stone (`wallAlt`), restrained ornament. Reads as a tall flat blade, ~5:1 on the wide face but slab-thin in profile; sunken plaza/flags at its foot.

9. **Grand Central Terminal**
   - Type: station
   - Height: low civic block; main facade ~32 m (1913)
   - Recreate-it spec: A wide Beaux-Arts **tan-limestone** station with three giant arched windows on the main facade, framed by paired columns, and a crowning **sculptural group with a clock** (Mercury figures) over the centre arch. Horizontal and palatial, copper-green roof accents; broad, symmetrical, ~3:1 wide, ground-hugging civic mass.

10. **One Vanderbilt**
    - Type: skyscraper
    - Height: 427 m spire / 397 m roof (Wikidata `P2048`; 2020)
    - Recreate-it spec: A tapering modern tower of pale glass and terracotta-toned spandrels that steps back in angled facets near the top, narrowing to a slim chiselled crown. Cool glass with warm-grey ribs; very tall and faceted, ~8:1, the chamfered set-back summit distinguishing it from a plain box.

11. **St. Patrick's Cathedral**
    - Type: religious
    - Height: ~100 m spires; 101 m long nave (article prose — `P2048` empty)
    - Recreate-it spec: A white **Gothic Revival** cathedral in pale marble with two tall symmetrical **openwork spires** flanking a gabled west front with a rose window, plus flying buttresses and pointed lancet windows down the long nave. Bright off-white stone (`wallAccent`), lacy pinnacles; vertical twin towers, ~3:1, dwarfed by neighbours yet unmistakably ecclesiastical.

12. **Guggenheim Museum**
    - Type: museum
    - Height: low; ~4 storeys (1959)
    - Recreate-it spec: A windowless white **spiralling cylinder** that widens as it rises — an inverted ribbon ziggurat of smooth off-white concrete bands, set beside a smaller flat rotunda block. Creamy white (`wallAccent`), sculptural and curved; squat (~1:1.5), the coiled tapering drum is the entire identity.

13. **Yankee Stadium**
    - Type: stadium
    - Height: low bowl; ~3-tier (2009)
    - Recreate-it spec: A large oval stadium bowl with a tall limestone-clad outer facade and, ringing the top rim, the signature white steel **filigree frieze** (a scalloped/lattice crown). Buff stone exterior (`wallAlt`), green field inside, white decorative frieze along the upper edge; broad elliptical footprint, low height.

14. **Madison Square Garden**
    - Type: stadium
    - Height: low; cylindrical drum (1968)
    - Recreate-it spec: A squat **circular drum** arena — a smooth concrete cylinder with a flat round roof, ringed by vertical ribbing, sitting on a low rectangular base (over Penn Station). Pale grey concrete (`pavement`/`wallAccent`), no spectacle outside; the plain round can is the read, ~1:2 height:diameter.

15. **Woolworth Building**
    - Type: skyscraper
    - Height: 241 m, 58 floors (Wikidata `P2048`; 1912)
    - Recreate-it spec: A "Cathedral of Commerce" — a tall **neo-Gothic** tower in cream and **terracotta** with vertical ribs, pointed arches, gargoyles and a green-copper pyramidal/spired crown with flying buttress pinnacles. Pale ribbed shaft (`wallAccent` + `terracotta` ornament), ~6:1, topped by a steep ornate Gothic cap rather than a flat roof.

16. **432 Park Avenue**
    - Type: skyscraper
    - Height: 425.5 m, 85 floors (Wikidata `P2048`; 2015)
    - Recreate-it spec: An extremely thin **white square pencil** tower — a featureless concrete grid of identical large square windows, perfectly straight from base to flat open top, no setbacks. Off-white concrete frame (`wallAccent`) with dark square voids; razor-slim matchstick proportion ~15:1, the most slender silhouette on the skyline.

17. **56 Leonard ("Jenga")**
    - Type: skyscraper
    - Height: 250.2 m, 57 floors (Wikidata `P2048`; 2016)
    - Recreate-it spec: A glass tower of **cantilevered offset slabs** — floor plates that jut and recede irregularly like stacked, nudged blocks, especially toward the top, so edges and balconies stagger out. Cool glass (`glass`) with shadowed soffits under each overhang; ~7:1, the irregular jutting "Jenga" stack is the identity.

18. **MetLife Building**
    - Type: skyscraper
    - Height: 246 m (Wikidata `P2048`; 1963)
    - Recreate-it spec: A broad **International-style slab** with chamfered/tapered side edges (a flattened hexagonal plan), pre-cast concrete grid facade in pale grey, flat top, big rooftop lettering. Bulky and wide (`wallAccent`/`pavement`), looming over Grand Central; ~3:1 on the wide face, monolithic and faceless.

19. **Citigroup Center**
    - Type: skyscraper
    - Height: 279 m, 59 floors (Wikidata `P2048`; 1977)
    - Recreate-it spec: A silver aluminium-and-glass tower whose flat top is sliced off at a steep **45° diagonal slant**, and which rests on four giant columns set at the *midpoints* of its sides (so corners float). Bright silver-grey metal stripes (`blackSteel` lightened), cool glass; ~6:1, the angled wedge roof is the single signature.

20. **The Vessel (Hudson Yards)**
    - Type: tower (structure)
    - Height: 45.7 m (Wikidata `P2048`; 2019)
    - Recreate-it spec: A honeycomb of interlocking **copper-bronze staircases** forming a hollow, vase/bowl shape that flares outward as it rises. Warm coppery-bronze metal (between `terracotta` and `copperPatina`), all triangular landings and steps, hollow centre; small and wide (~1:1.5), like a giant woven basket of stairs.

21. **Wonder Wheel (Coney Island)**
    - Type: wheel
    - Height: 45.7 m / 150 ft (Wikidata `P2048`; 1920)
    - Recreate-it spec: A tall steel **Ferris wheel** with a lattice rim and spoke web, brightly painted, studded with coloured passenger cabins, on a small braced base by the boardwalk. Red/blue/yellow accents on white steel; a flat circular ring, ~1:1, classic fairground silhouette.

22. **Washington Square Arch**
    - Type: arch
    - Height: 23 m / 77 ft (article prose — `P2048` empty)
    - Recreate-it spec: A white **marble triumphal arch** — a single tall round-arched opening flanked by two square piers, with a flat entablature and sculpted figures, terminating Fifth Avenue. Bright off-white marble (`wallAccent`), ~1:1 squat-monumental, the lone arch standing free in a green park square.

## Sources

- https://en.wikipedia.org/wiki/Empire_State_Building · https://www.wikidata.org/wiki/Q9188
- https://en.wikipedia.org/wiki/Statue_of_Liberty · https://www.wikidata.org/wiki/Q9202
- https://en.wikipedia.org/wiki/Chrysler_Building · https://www.wikidata.org/wiki/Q11274
- https://en.wikipedia.org/wiki/One_World_Trade_Center · https://www.wikidata.org/wiki/Q11245
- https://en.wikipedia.org/wiki/Brooklyn_Bridge · https://www.wikidata.org/wiki/Q125006
- https://en.wikipedia.org/wiki/Flatiron_Building · https://www.wikidata.org/wiki/Q220728
- https://en.wikipedia.org/wiki/30_Rockefeller_Plaza · https://www.wikidata.org/wiki/Q680614
- https://en.wikipedia.org/wiki/Grand_Central_Terminal · https://www.wikidata.org/wiki/Q11290
- https://en.wikipedia.org/wiki/Times_Square
- https://en.wikipedia.org/wiki/One_Vanderbilt · https://www.wikidata.org/wiki/Q18398409
- https://en.wikipedia.org/wiki/St._Patrick%27s_Cathedral_(New_York_City)
- https://en.wikipedia.org/wiki/Solomon_R._Guggenheim_Museum · https://www.wikidata.org/wiki/Q201469
- https://en.wikipedia.org/wiki/Yankee_Stadium · https://www.wikidata.org/wiki/Q753529
- https://en.wikipedia.org/wiki/Madison_Square_Garden · https://www.wikidata.org/wiki/Q186125
- https://en.wikipedia.org/wiki/Woolworth_Building · https://www.wikidata.org/wiki/Q217652
- https://en.wikipedia.org/wiki/432_Park_Avenue · https://www.wikidata.org/wiki/Q233940
- https://en.wikipedia.org/wiki/56_Leonard_Street · https://www.wikidata.org/wiki/Q244358
- https://en.wikipedia.org/wiki/MetLife_Building · https://www.wikidata.org/wiki/Q464482
- https://en.wikipedia.org/wiki/Citigroup_Center · https://www.wikidata.org/wiki/Q391243
- https://en.wikipedia.org/wiki/Vessel_(structure) · https://www.wikidata.org/wiki/Q27988215
- https://en.wikipedia.org/wiki/Wonder_Wheel · https://www.wikidata.org/wiki/Q1465377
- https://en.wikipedia.org/wiki/Washington_Square_Arch · https://www.wikidata.org/wiki/Q2550491
- https://en.wikipedia.org/wiki/Hearst_Tower_(Manhattan) · https://www.wikidata.org/wiki/Q859452 (considered, not in top 22)
- https://en.wikipedia.org/wiki/Barclays_Center · https://www.wikidata.org/wiki/Q807966 (considered)
- https://en.wikipedia.org/wiki/Manhattan_Bridge · https://www.wikidata.org/wiki/Q125050 (considered)
- https://en.wikipedia.org/wiki/Williamsburg_Bridge · https://www.wikidata.org/wiki/Q125068 (considered)
- https://en.wikipedia.org/wiki/Parachute_Jump · https://www.wikidata.org/wiki/Q3651640 (considered)
- https://en.wikipedia.org/wiki/Metropolitan_Museum_of_Art · https://www.wikidata.org/wiki/Q160236 (considered)
- https://en.wikipedia.org/wiki/World_Trade_Center_station_(PATH) (Oculus — considered)
