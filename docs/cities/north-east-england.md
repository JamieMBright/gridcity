# North East England — Code-Art Region Reference

Visual reference for rendering North East England (Newcastle upon Tyne,
Gateshead, Sunderland, Durham, the North Sea coast, north to Alnwick) as
code-drawn isometric sprites. This is a coastal REGION, not one city.
Heights verified against Wikidata (P2048) / Wikipedia; see Sources. Where a
height could not be verified it is marked *(unverified)*.

## Palette

| token | hex | justification |
|---|---|---|
| wallMain | `#D9C39A` | Honey/buff sandstone of Grainger Town and Grey Street — Newcastle's classical Georgian-Victorian default facade, warmed by soot patina |
| wallAlt | `#C2A877` | Deeper weathered buff sandstone (Durham, Theatre Royal, Central Station portico); the city stone gone amber-brown with age |
| wallAccent | `#A8492E` | Warm red brick of Tyneside terraces and flats, and BALTIC's red-and-yellow flour-mill brick |
| roof | `#4A4E55` | Welsh slate — the dark blue-grey pitched roof that crowns nearly every terrace and stone block in the region |
| roofAlt | `#7A4632` | Muted red-brown clay pantile of older and humbler roofs, Northumbrian villages and coastal cottages |
| glass | `#9FB6BE` | Cool blue-grey curtain glass of the regenerated Quayside (Sage/Glasshouse, law courts) under northern overcast |
| glassWarm | `#E7BE74` | Warm lit windows / sodium glow at dusk — the colour an area takes when it is powered |
| metalSteel | `#9AA4A8` | Brushed steel and the painted Tyne Bridge / Millennium Bridge steel arches (matte grey-green-blue) |
| rustSteel | `#9C6A4A` | COR-TEN weathering steel of the Angel of the North — orange-brown oxidised rust crust |
| stoneMedieval | `#B9AE96` | Pale grey-buff dressed magnesian limestone / sandstone of Durham Cathedral, the Castle Keep, Alnwick, Tynemouth Priory |
| sootBrick | `#5A4B43` | Industrial / coal-era soot-blackened brick and masonry — staiths, bridge piers, old riverside works |
| pavement | `#9B948B` | Grey granite-sett and Yorkstone paving of Grainger Town and the quaysides |
| ground | `#7C7A5E` | Coalfield and lowland soil-and-grass, slightly cool and desaturated |
| vegetation | `#5E7048` | Northumberland moorland and pasture green — heather-dulled, never tropical |
| water | `#566E70` | The grey-green cold North Sea and the Tyne/Wear — flat, low-reflectance, slate-teal under low sun |
| shadowNavy | `#2C313D` | Deep cool navy for cast shadows in the dusk world |

Colour character: the North East reads as warm honey sandstone and red
brick set against dark Welsh-slate roofs, the whole damped by a cold
grey-green sea and moorland green, with two unmistakable man-made notes —
the rust-orange Angel and the silver-grey painted bridges. The golden hour
is low and northern: the sun sits shallow over the sea, raking the
sandstone amber-pink and turning slate roofs almost violet while the
quaysides and pit-heaps fall into navy shadow.

## Architectural character

The everyday fabric is Tyneside terraced housing — long rows of two-storey
red-brick and buff-stone homes under dark Welsh-slate pitched roofs, most
distinctively the "Tyneside flat" where each terraced house is split into
two self-contained flats with paired front doors. The civic heart is
Grainger Town: a remarkably complete sweep of honey-coloured classical
sandstone — colonnades, pediments, curving Grey Street, the fluted Grey's
Monument column — Georgian and early-Victorian and grand. Against this sits
the post-industrial Quayside regeneration, all cool steel-and-glass
curves and converted brick mills strung along the Tyne gorge between high
bridges, the legacy of a shipbuilding and coal-staith waterfront. Inland
and up the coast the register turns medieval and martial: pale grey-buff
limestone-and-sandstone of Durham's Norman cathedral and castle on their
wooded river peninsula, the great walls of Alnwick and Bamburgh, the
cliff-edge ruin of Tynemouth Priory. The region is recognisable by that
collision — soot-warmed honey terraces and classical stone under slate,
laced by dramatic steel bridges over a deep river, all under a cold North
Sea light.

## Heroes (ranked)

1. **Tyne Bridge**
   - Type: bridge (steel through-arch)
   - Height: 59 m; span 162 m, total length 389 m (steel; granite-faced towers)
   - Recreate-it spec: A single bold steel through-arch leaping the Tyne gorge — the arch rises high above the deck at mid-span and the deck hangs from it on vertical hangers. The two ends land on tall, square Cornish-granite-faced towers (pale grey ashlar) that read almost like gatehouses, far higher than the road. Paint the steelwork a matte grey (historically a dull green-grey). The arch is deep and lattice-trussed, not a thin ribbon. The defining silhouette of Tyneside; clearly the parent of Sydney Harbour Bridge but darker and squatter.

2. **Gateshead Millennium Bridge**
   - Type: bridge (tilting pedestrian, "Blinking Eye")
   - Height: lower than the Tyne Bridge; deck arc length ~126 m
   - Recreate-it spec: Two thin steel arcs that share pivots on each bank — one curved arch leaning back overhead, the other a gently bowed walkway deck below, joined by fan-spread suspension cables so the pair reads as a slender eye or a closing eyelid. Painted pale silver-grey. Much finer and more delicate than the Tyne Bridge beside it; when it tilts the whole "eye" blinks. Render it low, graceful and reflective against the water.

3. **Angel of the North**
   - Type: monument / sculpture (rust-steel)
   - Height: 20 m tall; wingspan 54 m (COR-TEN weathering steel)
   - Recreate-it spec: A vast standing human figure with arms outstretched as flat aeroplane-like wings, the wingspan nearly three times its height and angled very slightly forward. The whole surface is orange-brown oxidised rust (COR-TEN) with prominent vertical ribs running down body and wings like an external skeleton. Massive, planted on a low mound so it dominates the skyline beside the A1. No face detail; pure dark rust silhouette against the sky.

4. **Durham Cathedral**
   - Type: cathedral (Norman / Romanesque)
   - Height: central tower 66 m; western towers ~44 m; length 143 m (pale magnesian limestone / sandstone)
   - Recreate-it spec: A massive, heavy Norman cathedral on a wooded bluff above the Wear. Three towers: two square western towers at the front and one taller, slightly later square central (crossing) tower, all crenellated and pinnacled but blocky and solid rather than spiky. Pale grey-buff dressed stone, very long nave, round-arched Romanesque windows, immense walls. Reads as fortress-like and ancient — squat power, not Gothic lace. Pair it on the peninsula with the Castle.

5. **Alnwick Castle**
   - Type: castle (medieval, inhabited)
   - Height: footprint — large concentric castle; shell keep of ten clustered towers
   - Recreate-it spec: A great grey-buff stone medieval castle, complete and inhabited (not ruined). A ring of curtain walls studded with many round and semi-octagonal towers, an elaborate twin-towered gatehouse, and a central shell keep formed of ten tightly-packed round towers rather than one square block. Crenellated throughout, with carved stone figures standing on the battlements. Render it sprawling and intact — the "Hogwarts" castle — in warm weathered grey sandstone.

6. **Durham Castle**
   - Type: castle (Norman, on river peninsula)
   - Height: footprint — motte-and-bailey on the Durham peninsula bluff
   - Recreate-it spec: A Norman castle sharing Durham's high wooded peninsula with the cathedral, just to its north across Palace Green. A blocky rectangular keep on a raised motte, ranges of buildings around a courtyard, battlemented in the same pale grey-buff stone as the cathedral. Read it as the cathedral's stout secular twin, the two together crowning the bend of the Wear.

7. **St James' Park**
   - Type: stadium (football, Newcastle United)
   - Height: 64.5 m cantilever roof (the Milburn/Leazes stand; largest cantilever in Europe when built)
   - Recreate-it spec: A large asymmetric all-seater bowl wedged tight into the city centre, dominating Newcastle's skyline on a rise. Two sides (the Milburn and Leazes stands) are enormously tall double-decker tiers with a sweeping white steel cantilever roof curving up; the opposite sides are lower. The asymmetry is the signature — a giant white-and-steel grandstand looming over surrounding rooftops. Black-and-white club colours read in the seats.

8. **Stadium of Light**
   - Type: stadium (football, Sunderland)
   - Height: footprint — symmetrical 49,000-seat bowl
   - Recreate-it spec: A clean, symmetrical four-stand bowl on the north bank of the Wear at Monkwearmouth, with curved cantilever roofs and white roof trusses. Lower and more even than St James' Park. At the entrance stands a Davy miner's-lamp monument marking the colliery heritage. Render it modern, red-and-white, sitting in a more open riverside setting.

9. **Penshaw Monument**
   - Type: monument (Greek Doric temple on a hill)
   - Height: 21 m; ~30 m long (gritstone)
   - Recreate-it spec: A half-size replica of the Temple of Hephaestus — an open, roofless Doric temple of dark gritstone standing alone on top of bare Penshaw Hill, visible for miles. Eighteen fat fluted columns (a 2×7 peristyle) carry a plain entablature; no walls, no cella roof, you see sky through it. Soot-darkened grey-brown stone. Render it stark and silhouetted on a green hilltop, a black classical crown on the Wearside skyline.

10. **The Glasshouse (Sage Gateshead)**
    - Type: arts / concert hall
    - Height: footprint — large curved riverside hall *(roof height unverified)*
    - Recreate-it spec: A huge, smooth, bulging shell of curved stainless steel and glass on the Gateshead Quayside — a single shining blob roof, like a sliced silver pebble or a soap bubble, swelling up over three glazed concert halls within. The roof catches and reflects sky and water. No straight lines; pure organic curve. Set it on the south bank just upstream of the Millennium Bridge — the silver counterpoint to BALTIC's brick.

11. **BALTIC Centre for Contemporary Art**
    - Type: arts gallery (converted flour mill)
    - Height: footprint — tall rectangular former grain silo / mill *(height unverified)*
    - Recreate-it spec: A big, plain, tall rectangular brick box — the old Baltic Flour Mills — on the Gateshead bank. Two parallel brick façades (north and south) in red and yellow brick, with the bold white "BALTIC FLOUR MILLS" lettering retained high on the wall. Flat-topped, monolithic, industrial; modern glass insertions and a rooftop viewing box added. Render it as a stout warehouse landmark beside the sleek Glasshouse and bridges.

12. **Newcastle Castle (Castle Keep)**
    - Type: castle / keep (Norman, the city's namesake)
    - Height: footprint — square Norman stone keep *(height unverified)*
    - Recreate-it spec: A compact, square, very solid Norman stone keep — tall for its footprint, with thick walls, small openings, corner turrets and crenellations — squeezed among the railway viaducts near Newcastle Central. Pale-to-soot grey stone. Nearby stands its separate fortified gatehouse, the Black Gate. This is the "New Castle" the city is named for; render it small, blocky and ancient amid Victorian arches.

13. **Grey's Monument**
    - Type: monument (column + statue)
    - Height: 41 m (133 ft) total (sandstone)
    - Recreate-it spec: A tall, slender Roman Doric column of buff sandstone rising from the junction of Grey, Grainger and Blackett Streets, crowned by a standing statue of Earl Grey. A plain unfluted shaft on a square pedestal, a simple capital, then the figure on top facing down Grey Street. The vertical pivot of Grainger Town — render it as a single honey-stone needle among classical façades.

14. **Theatre Royal, Newcastle**
    - Type: civic / theatre (classical)
    - Height: footprint — grand classical frontage on Grey Street *(height unverified)*
    - Recreate-it spec: A stately Georgian theatre front on curving Grey Street, fronted by a tall portico of six giant fluted Corinthian columns carrying a triangular pediment — all in honey-buff sandstone. The set-piece of Grainger Town's classical sweep. Render it as a columned stone temple-front embedded in a continuous curving terrace.

15. **Tynemouth Priory and Castle**
    - Type: priory / castle ruin (coastal)
    - Height: footprint — cliff-top ruin on a sea promontory
    - Recreate-it spec: Roofless ruins of a Benedictine priory on a high rocky headland jutting into the North Sea at the Tyne mouth. A tall surviving east-end wall with pointed early-Gothic lancet windows stands open to the sky, ringed by the remains of a curtain wall and a gatehouse across the neck of the promontory. Pale weathered grey stone, sea on three sides. Render it as a dramatic broken silhouette on a cliff with waves below.

16. **Tyneside Quaysides**
    - Type: townscape (riverside)
    - Height: footprint — terraced riverside frontages under the bridges
    - Recreate-it spec: The deep Tyne gorge lined on both banks with tiered frontages — historic merchant houses and warehouses on the Newcastle side stepping up the steep bank, regenerated brick and glass on the Gateshead side — all stitched together by a stack of bridges (Tyne, Swing, High Level, Millennium) at different heights. Warm brick and buff stone, dark slate roofs, soot-stained quay walls meeting grey-green water. Render the steepness and the layered bridges as the signature.

17. **Newcastle Central Station / High Level Bridge**
    - Type: station / bridge (Victorian)
    - Height: footprint — long curved train-shed + portico *(height unverified)*
    - Recreate-it spec: A grand Victorian station with a long classical stone portico (a porte-cochère) in buff sandstone and a sweeping curved iron-and-glass train shed behind. Just south, the High Level Bridge — Robert Stephenson's two-deck iron bridge (rail above, road below) on tall stone piers crossing to Gateshead. Render the curved glazed shed and the layered iron bridge as a Victorian-engineering set piece.

18. **Bamburgh Castle**
    - Type: castle (coastal, Northumberland)
    - Height: footprint — long castle on a basalt crag above the sea
    - Recreate-it spec: A long, dramatic castle stretched along the top of a high black basalt crag (the Whin Sill) directly above a vast North Sea beach. A great square keep at the centre, curtain walls and towers running the length of the rock, all in warm pinkish-buff sandstone glowing against dark rock and pale dunes. Render it as a low, long, commanding silhouette on a sea-cliff — the quintessential Northumbrian coast castle.

19. **Souter Lighthouse**
    - Type: lighthouse (coastal)
    - Height: footprint — banded tower on the cliffs at Marsden *(height unverified)*
    - Recreate-it spec: A bold lighthouse on the cliffs between South Shields and Sunderland, its round tower painted in broad red-and-white horizontal bands with a white lantern gallery on top, flanked by white-walled, red-roofed keepers' cottages. Render it as a bright striped marker on a grassy clifftop above the grey sea.

20. **Spanish City, Whitley Bay**
    - Type: civic / leisure (Edwardian seaside dome)
    - Height: footprint — white domed pleasure pavilion *(dome height unverified)*
    - Recreate-it spec: A white Edwardian seaside pleasure palace on the Whitley Bay front, dominated by a large pale-cream rendered dome flanked by two smaller cupolas and corner towers — a miniature Blackpool-style fantasy. Render it as a bright white domed pavilion facing the North Sea promenade, a cheerful coastal counterpoint to the dark stone inland.

## Sources

Wikipedia REST summaries and full-text extracts, and Wikidata entities
(P2048 height, P2043 length, P186 material) for:

- Tyne Bridge — Wikidata Q2465864 (height 59 m, length 389 m, steel + granite)
- Gateshead Millennium Bridge — Wikidata Q1930127 (length 126 m)
- Angel of the North — Wikidata Q1325290 (height 20 m, wingspan 54 m, COR-TEN steel)
- Durham Cathedral — Wikidata Q746207 (central tower 66 m, towers ~44 m, length 143 m)
- Durham Castle — Wikipedia
- Alnwick Castle — Wikipedia (shell keep of ten towers)
- St James' Park — Wikipedia (64.5 m cantilever roof)
- Stadium of Light — Wikipedia (49,000 seats, Davy-lamp monument)
- Penshaw Monument — Wikidata Q7164734 (height 21 m, length 30 m, gritstone)
- Sage Gateshead / The Glasshouse — Wikidata Q2414046, Wikipedia
- Baltic Centre for Contemporary Art / Baltic Flour Mills — Wikipedia
- Newcastle Castle (The Castle, Newcastle) — Wikipedia
- Grey's Monument — Wikidata Q5608058, Wikipedia (height 41 m / 133 ft, Doric column)
- Theatre Royal, Newcastle — Wikipedia
- Tynemouth Priory and Castle — Wikipedia
- Grainger Town — Wikipedia
- Tyneside flat — Wikipedia
- Newcastle upon Tyne; Sunderland; Gateshead — Wikipedia
- Bamburgh Castle — Wikipedia
- Souter Lighthouse; Spanish City — Wikipedia
