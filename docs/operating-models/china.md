# Operating Model — China

> Research doc for the ElectriCity game profile. The player is the network
> operator. This file describes how China's power system actually works, then
> proposes the game-profile knobs at the bottom. Data targets 2023–2025; any
> figure flagged "(uncertain)" should be treated as approximate.

## One-line identity

**A state-owned, vertically integrated, centrally planned grid at colossal
scale: two giant state utilities run almost the entire country, there is no
developer tender market (the state decides what gets built), demand still grows
breakneck, coal still dominates (~58%), yet China builds more wind+solar than
the rest of the world combined and ships it thousands of kilometres east on
ultra-high-voltage DC lines.** Operating here means *planning*, not *bidding*.

## Transmission vs distribution

China's grid is dominated by **two state-owned vertically integrated giants**
that own transmission *and* distribution across their territories — there is no
GB-style unbundling, and these are among the largest companies on Earth.

- **State Grid Corporation of China (SGCC / 国家电网).** Covers **~26 provinces /
  regions / municipalities — ~88% of China's land area — serving over
  ~1.1 billion people** (source:
  https://baike.baidu.com/en/item/State%20Grid%20Corporation%20of%20China/979849).
  By revenue, routinely a top-3 company in the Fortune Global 500.
- **China Southern Power Grid (CSG / 南方电网).** Covers the **five southern
  provinces — Guangdong, Guangxi, Guizhou, Hainan, Yunnan**, ~1 million km²,
  **~272 million people** (source:
  https://en.wikipedia.org/wiki/China_Southern_Power_Grid).

Between them they own essentially all the transmission and most distribution.
Generation is owned by the **"Big Five" state generators** (Huaneng, Datang,
Huadian, State Power Investment Corp / SPIC, China Energy/Guodian) plus other
state-owned IPPs — but these are also state entities, not a liberalised private
developer market.

**Vertical integration:** Total, and **state-owned**. Generation, transmission,
distribution and (mostly) retail sit inside the state apparatus. This is the
clearest real-world case for the game's **"owned"** model — the operator *is*
the state and *builds* the plant; there is no sealed-bid developer tender.

## Regulator

China does not have an independent economic regulator in the FERC/BNetzA sense —
the sector is **planned and price-set by the central government**:

- **NDRC** (National Development and Reform Commission) — the powerful central
  planner; sets electricity prices (the **catalogue tariffs** and benchmark
  prices), approves major projects, and writes the Five-Year Plans.
- **NEA** (National Energy Administration, under NDRC) — energy-sector
  administration, targets, and planning.
- **SASAC** owns the state utilities/generators on behalf of the state.

**Control model:** **State planning + administered pricing**, evolving toward a
**"dual-track"** system that bolts limited markets onto the plan. It is closest
to **cost-of-service** in spirit (regulated returns on state assets, prices set
to cover cost + policy goals + cross-subsidy), but with **central planning
targets** overriding everything. There is no RIIO-style incentive cap and no
genuine merchant market for most volume.

## How generation is procured

**Not by tender.** The state *plans* the build. Capacity is allocated through
Five-Year-Plan targets, provincial quotas, and state-generator investment —
capex lands on the state's books (the game's "owned" capex into the network
pot), not on a developer PPA strike.

**The "dual-track" pricing reform.** Historically generators ran on a
**"priority generation plan"** with administered prices. Reform is splitting
volume into two tracks:
- a **planned track** at government **benchmark/catalogue prices** (e.g. a coal
  benchmark around **¥0.463/kWh**), and
- a **market track** via **provincial spot-market pilots**. By 2023 ~six
  subnational spot markets had continuous settlement — **Shanxi, Guangdong,
  Shandong, Gansu, western Inner Mongolia, and the State Grid inter-provincial
  spot market** (sources:
  https://www.elibrary.imf.org/view/journals/002/2023/081/article-A004-en.xml,
  https://rmi.org/wp-content/uploads/dlm_uploads/2025/01/final-2024-China-Power-Market-Outlook-10-Key-Trends-for-Market-Players-2501117.pdf).
The direction of travel is *toward* markets, but the baseline is still planning.

**Renewables: feed-in → auctions → grid parity.** China bootstrapped renewables
with generous **feed-in tariffs**, moved to **auctions**, then largely **ended
new-build feed-in subsidies around 2020–2021** as wind/solar hit **grid parity**
(competitive with coal unsubsidised) (source:
https://carboncredits.com/chinas-renewable-energy-boom-a-record-breaking-shift-or-still-chained-to-coal/).
The build since has been driven by cost + state targets, not subsidy.

**Coal still dominant, but plateauing in share.** Coal was ~**58% of generation
in 2024** (still rising in absolute TWh but falling in share as renewables
explode); China is ~55% of *global* coal generation (source:
https://www.carbonbrief.org/analysis-chinas-clean-energy-pushes-coal-to-record-low-53-share-of-power-in-may-2024/).

## Tariff & network charges (DUoS-equivalent)

- **Catalogue tariffs.** Retail prices are largely **administered by NDRC** —
  set tariffs by customer category (residential, agricultural, commercial,
  industrial) rather than market-formed.
- **Cross-subsidy (industrial → residential).** A defining feature: **industrial
  and commercial users pay *higher* tariffs to subsidise *lower* residential
  and agricultural tariffs** — the political opposite of most Western systems
  (source:
  https://chineseclimatepolicy.oxfordenergy.org/book-content/domestic-policies/power-sector-reform/).
  Keeping household power cheap is a social-stability priority.
- **Transmission–distribution (T&D) price reform.** Since ~2015 China has been
  introducing **separately approved T&D charges** (a regulated, cost-plus
  network tariff for the grid companies) — the emerging Netzentgelte/DUoS
  analogue, designed to let competitive generation+retail trade *around* a
  regulated wires charge. Still maturing.

## Retail vs network split

- **State retail is the norm.** Most consumers buy from the state grid company
  at catalogue tariffs.
- **Large-user market access is opening** via the spot-market pilots — big
  industrial users can increasingly contract directly (bilateral/market
  contracts) and pay the regulated T&D charge on top. **Residential remains
  fully regulated** and cross-subsidised. So: a regulated-monopoly retail world
  with a *growing carve-out* for large consumers, not GB-style universal choice.

## Renewables support

- **Feed-in → auctions → grid parity** (above): subsidy largely retired for new
  build ~2020–21.
- **Scale is the story.** China hit its **2030 target of 1,200 GW of wind+solar
  six years early — by the end of 2024** (wind ~520 GW, solar ~890 GW); in 2024
  it added ~277 GW of solar and ~80 GW of wind, and in mid-2024 wind+solar
  *capacity* overtook coal for the first time (sources:
  https://www.renewableinstitute.org/china-surpasses-2030-renewable-energy-goals-years-ahead-of-schedule/,
  https://theprogressplaybook.com/2024/01/18/china-will-hit-1200gw-wind-and-solar-target-this-year-iea-says/).
- Wind+solar reached ~**18% of generation in 2024**, overtaking the US in
  absolute wind+solar output for the first time (source:
  https://ember-energy.org/latest-insights/global-electricity-review-2024/).

## Distinctive seams worth modelling (the key section)

These are what make China *feel* different from GB. Each maps to a game lever.

1. **State ownership, no developer tender → use the "owned" model.** There is no
   sealed-bid developer market: the **state plans and builds** generation, and
   the capex lands on the operator's (state's) books. **Game lever:** set
   **generation ownership = `owned`** — the tender/PPA flow is *disabled* and
   replaced by a **build-it-yourself** path where plant capex rides the
   **network pot** (no PPA strike on the energy line). This is the cleanest
   "owned" scenario in the game and the sharpest contrast to GB/US/Germany.

2. **Central planning targets → a top-down objective overlay.** Instead of a
   market discovering what to build, the operator works to **Five-Year-Plan
   quotas** (X GW of solar, Y GW of UHV, retire Z GW of old coal). **Game
   lever:** issue **periodic state targets** the operator *must* hit (build
   quotas, carbon-intensity ceilings, renewable-capacity minimums) — missing a
   plan target is the failure condition, replacing the RIIO report card with a
   **plan-fulfilment scorecard**. The regulator KPI weights become *mandated
   build* + *carbon trajectory* rather than market-cost efficiency.

3. **UHV long-distance transmission → "import a cheap clean external source".**
   China's resources (hydro/wind/solar in the west/north) are ~2,000+ km from
   demand on the east coast, so it built the world's biggest **ultra-high-voltage
   (UHV) DC** network — up to **±1,100 kV** (the Changji–Guquan line carries
   ~12 GW, ~3,300 km), moving power "west-to-east" and "north-to-south" (source:
   https://spectrum.ieee.org/chinas-state-grid-corp-crushes-power-transmission-records).
   **Game lever:** model a **UHV import link** as a *cheap, clean external power
   source* the operator can build to (huge capex, long lead time) that delivers
   distant hydro/wind into the demand centre — a flagship megaproject that
   *lowers carbon and cost simultaneously*. The signature China mechanic.

4. **Curtailment of stranded NW renewables → firm-curtailment KPI pressure.**
   The flip side of #3: when the UHV wires aren't there, the giant Xinjiang /
   Gansu / Inner Mongolia wind+solar bases get **curtailed** — historically
   ~20–25% of Xinjiang's wind/solar potential was wasted before transmission
   caught up (source:
   https://spectrum.ieee.org/chinas-state-grid-corp-crushes-power-transmission-records).
   **Game lever:** a **remote renewable region** whose output is **curtailed
   until a UHV line connects it** — building the line converts wasted MWh into
   delivered clean energy (drops the firm-curtailment KPI *and* carbon). Pairs
   directly with #3 as the build-or-waste tension.

5. **Coal-heavy carbon → high carbon floor, slow to move.** At ~**560 g/kWh
   (2024)** China's grid is roughly **1.5× the US and Germany** on carbon —
   coal is the firm backbone. **Game lever:** a **high baseline grid carbon**
   (~530–560 g) that the renewables/UHV build can grind down but never quickly;
   the carbon KPI is a long, hard slog, not a quick win. Decarbonisation is a
   *megaproject marathon*, not a market nudge.

6. **Breakneck demand growth → relentless reinforcement pressure.** Unlike the
   flat/declining demand of GB/Germany, Chinese electricity demand still grows
   several percent a year (industry, EVs, electrification, data centres,
   air-con). **Game lever:** a **rising demand baseline** every year — the
   operator must *keep building ahead of load* or reliability collapses; the
   game tempo is expansion, not optimisation of a steady system.

7. **Cross-subsidy (industry funds households) → inverted tariff politics.**
   Residential tariffs are kept artificially low, funded by higher industrial
   tariffs. **Game lever:** a **tariff-class structure** where the operator sets
   industrial rates *above* cost to hold household rates *below* cost —
   over-loading industry risks competitiveness/satisfaction backlash;
   under-funding it spikes household bills (political-stability hit).

8. **50 Hz, 220/380 V.** Same frequency as GB (**50 Hz**), 220 V single /
   380 V three-phase.

## Numbers & sources

- **Grid carbon intensity:** ~**560 gCO₂/kWh in 2024** (down ~4.1% from
  ~582 g in 2023; forecast falling toward ~505 g by 2026) (source:
  https://www.statista.com/statistics/1300419/power-generation-emission-intensity-china/
  and IEA — figures vary by source, treat as approximate).
- **Generation mix (2024):** **coal ~58%**; **wind+solar ~18%**; rest hydro
  (large), nuclear (growing), gas (small) (sources:
  https://www.carbonbrief.org/analysis-chinas-clean-energy-pushes-coal-to-record-low-53-share-of-power-in-may-2024/,
  https://ember-energy.org/latest-insights/global-electricity-review-2024/).
- **Renewables capacity (end-2024):** wind ~**520 GW**, solar ~**890 GW**;
  **1,200 GW wind+solar target hit 6 years early** (source:
  https://www.renewableinstitute.org/china-surpasses-2030-renewable-energy-goals-years-ahead-of-schedule/).
- **UHV:** up to **±1,100 kV DC**; Changji–Guquan ~12 GW over ~3,300 km.
- **Frequency:** **50 Hz**.
- **Typical residential price:** **low and administered** — roughly **~¥0.5/kWh
  (~7–9 ¢ USD)** residential, deliberately kept cheap and cross-subsidised;
  reported as roughly *half* US levels (source:
  https://www.globalelectricity.org/electricity-prices-by-country/ — specific
  figure uncertain, flag).
- **Coverage:** SGCC ~26 regions / ~88% of land / ~1.1bn people; CSG 5 southern
  provinces / ~272m people.

## Suggested profile values

- **nominalHz:** `50`
- **peakSeason:** **summer** (air-conditioning drives the national peak across
  the densely populated east/south; some northern winter heating load too —
  summer is the headline). *Flag as mixed; summer is the safer default.*
- **generation ownership:** **`owned`** — the defining choice. **No developer
  tender / sealed-bid flow.** The operator *builds* plant; capex lands in the
  **network pot**; no PPA strike on the energy line.
- **regulator model:** **`cost-of-service`** with a **central-planning overlay**
  (NDRC administered prices + Five-Year-Plan build targets). Replace the market-
  efficiency KPI weights with **mandated-build quotas** + **carbon trajectory**;
  keep **reliability** high (state-stability priority); **affordability** is
  managed via cross-subsidy, not market price.
- **market shape (qualitative):**
  - a **stable, administered baseline** (coal firm; less spiky than a liberalised
    market — prices are *set*, not discovered),
  - **summer evening peak** (A/C),
  - a **growing midday solar dip** in high-PV provinces,
  - **weak scarcity kicker** (planned reserves + state build absorb shortfalls;
    less price volatility than ERCOT/EPEX),
  - **high grid carbon ~530–560 g/kWh** that declines slowly,
  - **optional drought uplift** (China's large hydro fleet — e.g. the 2022
    Sichuan/Yangtze drought cut hydro hard and forced coal back on; a real
    seasonal risk worth a drought lever).
- **special mechanics:**
  - **UHV import link** as a *cheap clean external source* (flagship megaproject;
    the signature China mechanic) — pairs with…
  - **Stranded NW renewable region curtailed until UHV connects it** (firm-
    curtailment KPI → delivered clean energy on build-out).
  - **Owned-build model** (no tender) with **Five-Year-Plan quotas** as the
    scorecard.
  - **High, slow-moving carbon floor** (coal backbone) — decarbonisation is a
    marathon.
  - **Rising demand baseline** every year (build-ahead pressure).
  - **Inverted cross-subsidy tariff classes** (industry funds households).
  - **Drought-uplift** seasonal risk on the hydro fleet.
