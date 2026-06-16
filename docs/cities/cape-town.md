# Cape Town

Reference for rendering Cape Town as code-drawn isometric vector sprites. Heights and materials verified against Wikipedia REST summaries and Wikidata (see Sources). Lofi golden-hour sensibility, but the hexes below are realistic to actual Cape stone, paint, and Atlantic light.

## Palette

| Token | Hex | Note |
| --- | --- | --- |
| wallMain | `#F2E9DC` | Whitewashed/limewashed Cape-Dutch render, warm off-white; the default cottage wall |
| wallAlt | `#E8D2B0` | Honey-cream oolitic limestone (City Hall, Bath stone) and aged plaster |
| wallAccent | `#D98A4E` | Ochre/terracotta lime render — Castle of Good Hope walls, warm trim |
| boKaapPink | `#F25C8A` | Bo-Kaap candy pink — vivid flat-fronted Malay-quarter facade |
| boKaapBlue | `#2FA8D6` | Bo-Kaap turquoise/cobalt facade |
| boKaapGreen | `#3FB36B` | Bo-Kaap lime/emerald facade |
| boKaapYellow | `#F2C14E` | Bo-Kaap egg-yellow / saffron facade |
| roof | `#A8362B` | Red oxide corrugated-iron and terracotta tile (dominant Cape roof) |
| roofAlt | `#3E6B4F` | Bottle-green painted corrugated iron (the other classic Cape roof) |
| roofThatch | `#9C7B4D` | Cape-Dutch reed/grass thatch, weathered straw-brown |
| glass | `#5E7E92` | Cool steel-blue curtain glass (Foreshore/CBD towers) |
| glassWarm | `#E6A765` | Golden-hour reflection in glass; west-facing sunset bounce |
| pavement | `#BDB4A6` | Pale grey paving and concrete promenade |
| ground | `#C9A878` | Dry tawny earth, Cape sand, decomposed-granite paths |
| vegetation | `#6E8B3D` | Olive-green fynbos and scrub on the slopes |
| vegDark | `#3C5A2E` | Pine/oak shade, deep Constantia greenery |
| water | `#1F5C8C` | Deep cold Atlantic / Table Bay blue |
| waterShallow | `#3E8CA8` | Turquoise shallows over white sand at Camps Bay/Clifton |
| sandstone | `#9A8F82` | Grey Table Mountain Group sandstone — the cliffs and the massif itself |
| stoneShadow | `#5C5A57` | Cliff shadow and rock cleft |

Overall colour character: a bright, high-key coastal palette — bleached whites, honeyed stone and the riotous candy hues of Bo-Kaap set against grey rock, olive fynbos and an intense deep-blue sea. Golden-hour cast: the low Atlantic sun rakes in from the west, so west faces and the sandstone cliffs flare warm apricot/rose while east-facing slopes and Table Mountain's shaded flanks fall to cool mauve-grey; whitewash glows peach and the sea turns navy-purple in shadow.

## Architectural character

Cape Town's historic residential fabric is dominated by single-storey whitewashed Cape-Dutch cottages with steeply pitched thatch roofs and ornate curvilinear Baroque (often "holbol") gables rising above the front door, and by the famous Bo-Kaap Malay quarter — tightly packed flat-fronted terraced houses, each painted a different vivid candy colour (pink, turquoise, lime, saffron, cobalt) with a small stoep and shuttered sash windows climbing the cobbled slopes of Signal Hill. Layered over these are Victorian and Edwardian terraces, especially along Long Street, with delicate cast-iron lacework verandas (broekie-lace), two storeys, and bullnose corrugated-iron canopies. The CBD and reclaimed Foreshore are modest mid-rise (10-25 storeys) of glass and concrete punctuated by only a handful of true towers, while the V&A Waterfront mixes restored red-brick Victorian harbour buildings, a red clock tower and modern apartments. Roof forms are emphatically threefold: thatch on the old homesteads, painted corrugated iron (red-oxide or bottle-green) on the bulk of older houses, and flat slabs on modern blocks. What makes the city instantly recognisable is its setting, not its buildings: the long flat-topped grey wall of Table Mountain (often draped in its white "tablecloth" cloud) flanked by the conical Lion's Head and the ridge of Signal Hill and the peak of Devil's Peak, the cobalt Atlantic below, green fynbos slopes between, and the jewel-box colours of Bo-Kaap in the foreground.

## Heroes (ranked)

1. **Table Mountain**
   - Type: mountain
   - Height: 1085 m (summit elevation)
   - Recreate-it spec: A long, near-perfectly flat-topped massif forming a horizontal grey wall behind the city, roughly 3 km wide across the visible plateau. Sheer vertical cliff faces in stacked horizontal strata of grey Table Mountain sandstone (`sandstone`/`stoneShadow`), with deep vertical clefts and buttresses; the summit line is dead level. Lower slopes soften into olive-green fynbos and scree (`vegetation`). Signature touch: a thin sheet of brilliant white cloud — the "tablecloth" — pouring slowly over the front lip and dissolving partway down the cliff.

2. **Bo-Kaap**
   - Type: district
   - Scale: a hillside grid of ~10-15 short cobbled blocks on the lower slopes of Signal Hill
   - Recreate-it spec: A tight stepped grid of single- and double-storey flat-fronted terraced houses marching uphill, every single one a different saturated colour — pink, turquoise, lime, cobalt, saffron, lilac (`boKaapPink`/`boKaapBlue`/`boKaapGreen`/`boKaapYellow`). Flat or shallow parapeted fronts with simple cornice mouldings, small raised stoeps with steps, multi-pane sash windows and panelled doors picked out in white. Cobbled streets climbing between them; Table Mountain looming grey behind. The colour riot is the whole point — never repeat adjacent hues.

3. **Lion's Head**
   - Type: mountain
   - Height: 669 m (summit elevation)
   - Recreate-it spec: A distinct, near-symmetrical conical/horn-shaped peak rising sharply to a rounded rocky point, sitting between Table Mountain and Signal Hill. Grey sandstone crags near the top (`sandstone`), wrapped lower down by a skirt of green fynbos and a spiralling path. Much smaller and pointier than Table Mountain — reads as a single shapely cone against the sky.

4. **Cape Town Stadium**
   - Type: stadium
   - Height: ~50 m roof rim
   - Recreate-it spec: A smooth, round-to-elliptical bowl at Green Point near the sea, wrapped in a continuous skin of translucent woven-glass-fibre louvred panels that glow milky pearl-white to faint gold and shift with the light. The roof is a shallow gleaming saucer ring around an open centre; no exposed structure, no harsh edges — a soft luminous drum. Set on flat green parkland with the Atlantic on one side and Signal Hill behind.

5. **V&A Waterfront & Clock Tower**
   - Type: civic / tower
   - Height: clock tower ~18 m
   - Recreate-it spec: A working harbour basin ringed by restored Victorian brick warehouses with green corrugated roofs, plus modern apartment blocks and a shopping arcade. The icon is the Clock Tower: a slender octagonal Victorian-Gothic tower painted bright pillar-box red with white trim, a clock face on each upper face and a small pointed roof, standing at the water's edge with boats and a swing bridge around it.

6. **Robben Island**
   - Type: lighthouse / island
   - Height: low island, max ~17 m; lighthouse tower ~18 m
   - Recreate-it spec: A flat, low-lying island sitting alone out in Table Bay, scrubby and pale. Render as a long thin land sliver with a cluster of low white-and-grey prison/quarry buildings and a stocky round masonry lighthouse painted white with a single broad red band and a black lantern cap. Bleak, horizontal, isolated.

7. **Castle of Good Hope**
   - Type: fort
   - Height: low ramparts (1-2 storeys), star-fort
   - Recreate-it spec: A squat pentagonal star fort — five sharp arrow-head corner bastions joined by straight ochre-rendered curtain walls (`wallAccent`), low and massive. Sloped earth-backed ramparts, a single ceremonial bell tower/gateway block (the Kat balcony) with a small whitewashed belfry over the main gate. Warm ochre-and-white walls, low pitched roofs inside, a moat trace; reads as a flat five-pointed masonry crown from above.

8. **Cape Town City Hall**
   - Type: civic
   - Height: clock tower ~60 m
   - Recreate-it spec: A grand Edwardian Italian-Renaissance block built of honey-coloured oolitic limestone (`wallAlt`), symmetrical, with a heavily arcaded and columned facade, balustraded parapet and arched windows. Crowned by a tall ornate clock tower on one side — a smaller copy of Big Ben's massing — with a clock face, columned belfry stage and a small domed/pyramidal cap. Warm golden stone throughout.

9. **Devil's Peak**
   - Type: mountain
   - Height: 1002 m (summit elevation)
   - Recreate-it spec: A bold pointed peak forming the left-hand end of the Table Mountain range (when viewed from the city). Sharp triangular sandstone summit (`sandstone`) dropping into long green-brown fynbos and pine slopes. Sits noticeably lower and pointier than the flat table to its right, framing that end of the skyline.

10. **Signal Hill**
    - Type: mountain
    - Height: 350 m (summit elevation)
    - Recreate-it spec: A long, low, gently rounded flat-topped ridge (the "Lion's Rump") running down from Lion's Head toward the sea. Smooth grassy-green and tawny slopes (`vegetation`/`ground`) with little exposed rock; a road snaking along its spine. Low and soft compared with its neighbours — a grassy hump.

11. **Chapman's Peak Drive**
    - Type: bridge / road
    - Height: cliff face falls hundreds of metres; peak 592 m
    - Recreate-it spec: A narrow tarmac road carved as a ledge into a near-vertical cliff face that plunges straight into the deep-blue Atlantic. Show stacked rusty-orange and grey rock strata above and below a thin grey roadway with a low stone parapet, the sea crashing far beneath, and occasional rock overhangs/tunnels. Dramatic, vertiginous, hugging the rock.

12. **Rhodes Memorial**
    - Type: monument
    - Height: temple structure ~2 storeys on a wide stair
    - Recreate-it spec: A grey granite Greek-Doric temple set on the lower slope of Devil's Peak, built as a broad, low colonnade at the top of a long, wide ceremonial granite staircase. Flanking the stairs are pairs of cast bronze lions; a bronze equestrian statue ("Physical Energy") stands before it. All pale grey granite (`sandstone`-grey), austere and symmetrical, with fynbos and pines around and the city spread below.

13. **Zeitz MOCAA (Grain Silo)**
    - Type: civic / tower
    - Height: ~57 m (former grain silo)
    - Recreate-it spec: A cluster of tall cylindrical concrete grain-silo tubes converted into a museum — forty-two packed vertical tubes carved through their centres to make a honeycombed atrium. Crown the top with bulging, pillowed faceted glass panels (like inflated bubble-windows) set into the old concrete, glowing warm at dusk (`glassWarm`). Raw weathered grey concrete body, jewelled glass top; stands tall over the Waterfront.

14. **Two Oceans Aquarium**
    - Type: civic
    - Height: low, 2-3 storeys
    - Recreate-it spec: A modern low waterfront building at the V&A with broad flat roofs and large blue-tinted glazed windows. Render as a clean horizontal block in pale render and steel-blue glass (`glass`), with a slightly nautical/industrial feel and signage; set among the harbour basins. Understated — its fame is inside.

15. **St George's Cathedral**
    - Type: religious
    - Height: tower/spire ~ mid-rise
    - Recreate-it spec: A Gothic Revival Anglican cathedral in warm sandstone, cruciform plan with a steep slate roof, pointed-arch stained-glass windows and a stocky square crenellated bell tower at the front (the design never got its full spire). Honey-to-grey stone (`wallAlt`/`sandstone`), buttressed flanks; dignified and churchy, mid-city.

16. **Groote Kerk**
    - Type: religious
    - Height: tower ~ moderate steeple
    - Recreate-it spec: South Africa's oldest church: a whitewashed neo-Gothic Dutch Reformed church with a tall square baroque clock tower retained from the original, topped by an ornate convex (onion-ish) Cape baroque cupola and weathervane. Bright whitewashed walls (`wallMain`), arched windows, a steep roof; the distinctive curvy tower cap is the signature.

17. **Auwal Mosque**
    - Type: religious
    - Height: low, with a slender minaret
    - Recreate-it spec: A modest flat-fronted mosque on a Bo-Kaap street, two storeys, walls washed pale green/white, with a single slim cylindrical white minaret topped by a small green onion dome and crescent. Simple arched windows and a small parapet; tucked between the coloured terraces rather than dominating them — South Africa's first mosque.

18. **Groot Constantia**
    - Type: civic (homestead)
    - Height: single storey
    - Recreate-it spec: The archetypal Cape-Dutch wine-estate manor: a long, low, brilliant-white limewashed homestead with green shutters, set among vineyards and oak avenues. The centrepiece is the ornate curvilinear baroque gable over the front door (scrolled "holbol" S-curves with a small relief and date), echoed by gables on the wings; thatched roof (`roofThatch`), small-paned sash windows. Pristine white against green vines.

19. **Camps Bay**
    - Type: district
    - Scale: a beachfront strip below the Twelve Apostles ridge
    - Recreate-it spec: A glamorous Atlantic-seaboard beach: a curve of bright white sand and turquoise shallows (`waterShallow`) backed by a palm-lined promenade strip of low white modernist villas and apartment blocks. Behind them the grey-green serrated wall of the Twelve Apostles (Table Mountain's back range) rises steeply. White cubes, palms, blue water, mountain backdrop.

20. **Portside Tower**
    - Type: skyscraper
    - Height: 136-139 m (Cape Town's tallest building)
    - Recreate-it spec: A sleek, slender contemporary office tower in the CBD, the city's tallest. A tapering rectangular glass shaft with a faceted, angled crown that steps and slants at the top; curtain-wall glazing in cool blue-grey (`glass`) catching golden west light on its flat faces (`glassWarm`). Clean, sharp, corporate — stands a clear head above the surrounding mid-rise Foreshore blocks.

## Sources

- Wikipedia (REST summary) & Wikidata — Table Mountain (Q213360): elevation 1085 m, material sandstone (Q13085)
- Lion's Head, Cape Town (Q1718867): elevation 669 m
- Signal Hill, Cape Town (Q2094786): elevation 350 m
- Devil's Peak, Cape Town (Q917040): elevation 1002 m, material sandstone
- Chapman's Peak (Q501723): elevation 592 m
- Cape Point (Q378109); Cape of Good Hope (Q4092)
- Bo-Kaap (Q2418250)
- Cape Town Stadium (Q173559): opened 2009 (inception 2007)
- V&A Waterfront (Q2166975)
- Robben Island (Q192493): elevation ~17 m
- Castle of Good Hope (Q1049562): inception 1666
- Cape Town City Hall (Q4817466): built 1905, Bath oolitic limestone
- Groote Kerk, Cape Town (Q13035555)
- St George's Cathedral, Cape Town (Q2499579): inception 1901
- Groot Constantia (Q2487774)
- Two Oceans Aquarium (Q1783786)
- Rhodes Memorial (Q3429602): inception 1912
- Auwal Mosque (Q4026797): completed 1794
- Greenmarket Square (Q5604316)
- Zeitz Museum of Contemporary Art Africa (Q28003638): opened 2017
- Portside Tower (Q7232412): height 136 m (Wikidata) / 139 m (Wikipedia), completed 2014
- Table Mountain Aerial Cableway (Q7673149)
- Camps Bay (Q2935571); Sea Point (Q2383557); material lookup sandstone (Q13085)
