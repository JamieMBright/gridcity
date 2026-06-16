# Operating Model — South Africa

> Research doc for ElectriCity. How running the grid in a stylised
> **Johannesburg / Gauteng + Cape Town + the coalfields** South Africa should
> *feel* different from GB, and which game levers encode that. Pitched at the
> game's depth: voltages, tenders, regulator KPIs, market shape, special
> mechanics. Figures are 2023–2025 where possible; each is flagged with
> confidence.

---

## One-line identity

The **LOADSHEDDING grid** — a coal-soaked, debt-laden, single vertically-
integrated giant (Eskom) that for years could not generate enough to keep the
lights on, imposing **rolling planned blackouts in stages 1–8**. Here the
defining game mechanic isn't optimisation — it's **surviving generation
inadequacy**: reliability dominates, carbon is filthy, and the monopoly is
*right now* being unbundled.

---

## Transmission vs distribution

South Africa has been a **single vertically-integrated utility** that is only
now splitting apart.

- **Eskom** — the state-owned utility that historically did **everything**:
  generation (the giant coal fleet + Koeberg nuclear + pumped storage),
  **transmission** (the national grid), and a large slice of **distribution**
  (it supplies many areas directly and sells bulk to municipalities). For
  decades this was a textbook vertically-integrated monopoly. (source:
  Wikipedia "Eskom"; "Electricity sector in South Africa")
- **NTCSA — National Transmission Company of South Africa** — the **transmission
  entity carved out of Eskom**. NTCSA **commenced trading on 1 July 2024** as a
  separate, wholly-owned subsidiary of Eskom Holdings, owning/operating the
  national transmission grid, the **System Operator**, grid-strengthening, the
  energy-market services and the international trader. A **further, fully
  independent Transmission System Operator (TSO) outside Eskom** is the next
  step (revised unbundling strategy approved by the Minister in **Dec 2025**,
  per the Electricity Regulation Amendment Act / ERAA). (source: Eskom press
  releases; Wikipedia "National Transmission Company of South Africa"; ESI-Africa)
- **Municipal distributors** — major metros run their own distribution and bill
  customers directly: **City Power** (Johannesburg), **eThekwini** (Durban),
  Cape Town, Tshwane, Ekurhuleni, etc. They buy bulk from Eskom and re-sell.
  Many are **financially distressed and owe Eskom huge arrears**. (source:
  Wikipedia; news coverage)

**Voltage shape for the game.** South Africa runs **50 Hz**. Transmission is
**400 kV** (with 765 kV on the long Cape corridors) and 275/220/132 kV;
distribution is 33/22/11 kV MV and 400/230 V LV. The coalfields (Mpumalanga)
host most generation far from the coastal load — a long-haul grid.

**Direction of travel:** vertically integrated → **unbundling into Generation /
Transmission (NTCSA) / Distribution**, plus a *new private generation market*
opening up. Model SA as **vertically integrated (owned) today, unbundling +
liberalising mid-game**.

---

## Regulator

- **NERSA** — the National Energy Regulator of South Africa. Sets Eskom's
  allowed revenue and **tariff determinations**; licenses generation and the
  REIPPPP off-take; regulates municipal distributor margins. (source: Wikipedia;
  NERSA)
- **Control model: rate-of-return / revenue requirement** — NERSA approves
  Eskom's **Multi-Year Price Determination (MYPD)** allowed revenue, then sets
  tariffs to recover it. Determinations are **highly contentious**: Eskom keeps
  asking for very large hikes to cover its debt and rising coal/diesel costs;
  NERSA grants part; courts and the public push back. Real tariffs have risen
  **far above inflation** for years. (source: NERSA tariff determinations; news)

For the game this is a **profit-cap / rate-of-return** regulator (allowed
return on a regulated asset base) — but a *stressed* one, where every tariff
round is a fight and **tariff shock** flows straight to the customer. KPI lean:
**reliability above everything** (because the country is short of power), then
affordability (tariff shock + non-payment), with carbon a slow secondary
pressure (Just Energy Transition).

---

## How generation is procured

A coal monopoly's own fleet *plus* a bolted-on renewables IPP programme *plus*
a brand-new private-generation free-for-all.

- **Eskom's coal fleet** — ~**15 large coal stations** in Mpumalanga form the
  bulk of capacity, much of it old and unreliable (low Energy Availability
  Factor). Plus the **two new mega-builds, Medupi and Kusile** (~4.8 GW each
  when complete) — massively over-budget, years late, and plagued by defects;
  their poor availability is a *direct cause* of loadshedding. Plus **Koeberg**
  (the only nuclear, ~1.86 GW, near Cape Town) and pumped-storage. (source:
  Wikipedia "Eskom"; "Electricity sector in South Africa")
- **REIPPPP — the Renewable Energy IPP Procurement Programme** — SA's flagship
  **competitive bid-window auction** for utility-scale wind & solar (and some
  CSP/biomass). Bid windows: BW1 (2011) → BW4 (2014/2018), stalled 2018–2020,
  restarted **BW5 (2021)** and **BW6 (2022)**, with further rounds + a
  battery-storage IPP programme since. Winners sign 20-year PPAs with Eskom as
  off-taker. Brought private renewables in at low prices. (source: CMS — South
  Africa; trade.gov)
- **Emergency power** — the controversial **RMIPPPP** "Risk Mitigation"
  emergency procurement (e.g. the Karpowership gas-ship deals) and large
  **diesel OCGT** burn to fight loadshedding at huge cost.
- **Private-PPA / wheeling liberalisation — the big shift.** The licensing
  exemption threshold for self/private generation was lifted from **<1 MW → 100
  MW (2021) → removed entirely (the 100 MW cap scrapped, Schedule 2 amended
  late 2022 / Jan 2023)**. Projects now just register, not license. This
  unleashed a **wave of private solar + wheeling** (companies/mines building
  their own plant and *wheeling* power across Eskom's grid to their sites for a
  wheeling fee), and a developing **open wheeling framework** — a genuine
  liberalisation of generation. (source: Bowmans "100MW threshold"; White &
  Case; African Review "energy wheeling framework")
- **Just Energy Transition (JET)** — an **US$8.5 bn+ international JET-P**
  finance partnership to help SA retire coal and build renewables + grid + a
  just transition for coal communities. (source: widely reported)

For the game: **'owned' (Eskom builds & owns the coal fleet, capex in the
network pot)** as the historical default, *plus* a fast-growing **'tender'
lane** (REIPPPP auctions) *plus* an emerging **private-wheeling** lane. The
ownership model literally **transitions mid-game** from owned → mixed.

---

## Tariff & network charges (DUoS-equivalent)

- **Eskom tariffs** — a structured book (e.g. **Megaflex** time-of-use for
  large customers; Homepower/Homelight for residential; Ruraflex etc.).
  Time-of-use Megaflex has steep **peak / off-peak / standard** and
  **high-/low-demand-season** differentials — a strong, explicit TOU and
  seasonal signal worth mirroring in the market shape.
- **NERSA hikes** — allowed-revenue increases passed through as big annual
  tariff rises (debt + fuel recovery). **Tariff shock** is a real, recurring
  customer-pain event.
- **Municipal surcharges** — metros add their own margin/surcharge on top of
  the Eskom bulk price before billing end users (cross-subsidising municipal
  budgets). So the "network pot" has *two* layers: Eskom transmission/
  distribution + municipal distribution surcharge.

**Game encoding:** **network pot = Eskom T&D allowed revenue + municipal
surcharge**; **energy pot = generation (coal-heavy, rising fuel cost + diesel
peaking)**. Add a recurring **NERSA tariff-hike event** (bill shock) and a
**Megaflex-style TOU/seasonal** shape.

---

## Retail vs network split

- **Mostly regulated / monopoly.** Households buy from Eskom directly or from
  their **municipality** at NERSA-approved tariffs; there is *no* household
  retail competition.
- **Emerging competition via wheeling.** The 100 MW-cap removal lets **large
  customers (mines, factories, malls) contract directly with private generators
  and wheel** power across the grid — a real, growing competitive *generation/
  supply* segment for big users (the SA analogue of open access). Traders and
  aggregators are appearing. (source: African Review; Bowmans)

**Game encoding:** regulated retail monopoly for households; an **unlockable
large-user wheeling lane** (private PPA + wheeling fee) that grows as the market
liberalises — and *erodes Eskom's anchor customers*, worsening its finances (a
"utility death spiral" dynamic worth a nod).

---

## Renewables support

- **REIPPPP** competitive bid windows (the headline mechanism) + a **battery
  storage IPP** programme.
- **Private/wheeling** build-out post-100 MW-cap removal (huge corporate solar).
- **JET-P** international climate finance to fund the coal-to-clean shift.
- Renewables were **~17 %+ of generation in 2024** (solar ~8.5 %, wind ~5 %,
  nuclear ~3 %) — *growing fast* off a coal-dominated base. (source:
  lowcarbonpower.org, South Africa 2024)

---

## Distinctive SEAMS worth modelling (THE key section)

What makes South Africa *feel* unlike GB, each mapped to a concrete game lever.
**This is the country where reliability/adequacy is the whole game.**

### 1. LOADSHEDDING / generation INADEQUACY — the defining mechanic
For years SA simply **could not generate enough**. When supply < demand, Eskom
declares a **loadshedding stage 1–8**, each stage shedding ~1,000 MW more
(stage 1 = ~1,000 MW … stage 8 = ~8,000 MW) by **rolling planned blackouts** on
a published schedule. **2023 had loadshedding on 335 of 365 days** (~16.6 TWh
shed); it eased sharply to **~83 days in 2024**; the worst stage officially
reached was **stage 6** in 2022–23. The cause: low coal-plant availability
(EAF), Medupi/Kusile defects, and a thin reserve margin (~2.2 GW operating
reserve held to avoid total grid collapse). (source: Africa Check / Section27;
Bloomberg; biznews; Eskom)
- **Lever (the signature one):** model a **capacity-adequacy / scarcity
  mechanic** front and centre. Track available generation vs demand; when
  short, the game **sheds load in stages** (rolling, scheduled blackouts that
  hammer the **CI/CML reliability KPI** — the dominant scorecard line). The core
  loop becomes *build/keep enough firm capacity to avoid shedding*, not just
  optimise cost. Plant **availability factor** (random coal-unit trips) should
  be a live variable, not assumed 100 %.

### 2. Coal-heavy → very high carbon
SA's grid is **~82 % coal** (2024), giving one of the world's **dirtiest grids
at ~900–960 gCO₂/kWh**.
- **Lever:** start the **carbon-intensity KPI very high (~900+ g)** with a
  coal-dominated merit order; decarbonisation (REIPPPP + private solar + JET) is
  a long, slow drag down. Big tension: cheap firm coal *prevents loadshedding*
  but *trashes the carbon line* — exactly the SA dilemma.

### 3. Eskom debt + tariff shock
Eskom carries crippling debt (~R400+ bn historically, with state bailouts);
servicing it drives the relentless **above-inflation NERSA tariff hikes**.
- **Lever:** a recurring **tariff-shock event** that lifts the bill KPI sharply
  regardless of your efficiency — a structural cost overhang you manage but can't
  fully escape. Ties affordability and reliability into direct conflict (spend
  to keep lights on → bills rise → public anger).

### 4. Vertical-integration UNBUNDLING (live storyline)
The very structure is changing mid-game: **NTCSA (transmission) split out
1 Jul 2024**; an independent TSO + open market is the destination.
- **Lever:** a scripted **unbundling arc** — start vertically integrated
  ('owned'), then split T from G, then open a market/wheeling lane. Each step
  changes who builds generation (state → private tenders) and how the bill
  splits. A rare "your operating model itself evolves" mechanic.

### 5. NON-PAYMENT / municipal arrears
Many municipalities and customers **don't pay** — municipal arrears to Eskom run
into the tens of billions of rand; illegal connections and non-payment are
chronic. This is a *commercial loss* that starves the utility of revenue.
- **Lever:** a **non-payment / arrears modifier** that reduces revenue actually
  collected vs revenue billed (a collections-efficiency factor < 100 %),
  feeding back into Eskom's finances and the tariff-shock pressure. Cousin of
  India's AT&C commercial losses, but framed as municipal arrears.

### 6. Southern-hemisphere WINTER-EVENING peak (verify — and confirmed)
**Verified:** SA is southern hemisphere (summer = Dec–Feb) **but its demand
peaks in WINTER (Jun–Aug), in the evening** — driven by heating, lighting and
cooking after dark, worst at sunset (July is the coldest month; evening peaks
hit ~27 GW in 2025). Loadshedding risk is therefore **highest on cold winter
evenings**, when solar has just dropped off. (source: Eskom winter-readiness
statements 2025; SAnews; The Citizen)
- **Lever:** `peakSeason = winter` (not summer!); a pronounced **winter
  evening peak** with a sharp **sunset ramp** (solar gone, demand rising) — the
  exact window where adequacy is thinnest. This makes solar *less* of an
  adequacy saviour and **storage / firm capacity / wind** more valuable.

---

## Numbers & sources

| Metric | Value | Confidence | Source |
|---|---|---|---|
| Frequency | **50 Hz** | High | Standard |
| Coal share of generation (2024) | **~82 %** | High | lowcarbonpower.org |
| Renewables + nuclear (2024) | **~17 %+** (solar ~8.5, wind ~5, nuclear ~3) | High | lowcarbonpower.org |
| Carbon intensity | **~900–960 gCO₂/kWh** (grid factor 0.960 tCO₂e/MWh, 2022) | High | Eskom/CDH grid emission factor; Engineering News |
| Loadshedding days 2023 | **335 of 365** (~16.6 TWh shed) | High | Africa Check; Section27 |
| Loadshedding days 2024 | **~83** (sharp improvement) | High | Allan Gray; Section27 |
| Worst stage reached | **Stage 6** (2022–23); scale defined 1–8 (~1 GW/stage) | High | Bloomberg; Africa Check |
| Operating reserve held | **~2.2 GW** (to avoid total collapse) | Medium | Eskom |
| NTCSA trading start | **1 July 2024**; independent TSO next (Dec 2025 plan) | High | Eskom; Wikipedia |
| 100 MW licensing cap | **removed** (Schedule 2 amended, late 2022 / Jan 2023) | High | Bowmans; White & Case |
| Koeberg nuclear | **~1.86 GW** (only nuclear) | High | Wikipedia |
| Medupi / Kusile coal | **~4.8 GW each** (late, defect-plagued) | High | Wikipedia |
| Peak season | **WINTER evening (Jun–Aug)**, sunset ramp | High | Eskom winter statements 2025 |

**Uncertainty flags.** Carbon intensity: the official **2022 grid factor was
0.960 tCO₂e/MWh** and 2024 is ~82 % coal, so **~900–960 g** is solid (it ticked
*up* in 2024 as coal availability improved — IEA noted SA CO₂ intensity +4 % in
2024). Loadshedding day-counts vary slightly by source/definition; 335 (2023)
and ~83 (2024) are the consistent headlines. Eskom's debt figure moves with
bailouts — quote "~R400+ bn historically" rather than a precise live number.

Sources: Eskom (unbundling press releases; winter-readiness statements 2025);
Wikipedia ("Eskom", "National Transmission Company of South Africa",
"Electricity sector in South Africa"); ESI-Africa; Africa Check / Section27
(loadshedding FAQs); Bloomberg (stage-6 / grid emission gauge); biznews;
Allan Gray; lowcarbonpower.org (SA 2024); Cliffe Dekker Hofmeyr + Engineering
News (grid emission factor 0.960 tCO₂e/MWh); Bowmans + White & Case (100 MW
threshold); African Review (wheeling framework); CMS — South Africa; trade.gov.

---

## Suggested profile values

```
country:            South Africa
nominalHz:          50
peakSeason:         winter            # SOUTHERN HEMISPHERE but peaks WINTER eve (Jun–Aug),
                                      #   sunset heating/lighting ramp — verified, NOT summer
generationOwnership: owned            # Eskom builds/owns coal fleet (capex in network pot)…
                                      #   …transitioning to MIXED: REIPPPP tenders + private wheeling
regulatorModel:     profit-cap        # NERSA rate-of-return / MYPD allowed revenue (contentious)
regulatorKpiLean:   reliability >>> affordability > carbon   # adequacy is everything
marketShape:        Megaflex-style TOU; pronounced WINTER-EVENING peak + sunset ramp;
                    high seasonal (winter) uplift; SCARCITY kicker dominant; very high carbon
specialMechanic:    LOADSHEDDING — capacity-adequacy / rolling-blackout STAGES 1–8 (the core
                    mechanic; reliability KPI dominates) + coal carbon ~900g + Eskom debt/
                    TARIFF SHOCK + NON-PAYMENT/municipal arrears + live UNBUNDLING arc
gridCarbon:         ~900–960 gCO₂/kWh (coal-dominated; one of the world's dirtiest grids)
```

**Design note.** South Africa is the "**keep the lights on at all**" case — the
inversion of GB, where the question shifts from *optimise the bill* to *can you
even generate enough tonight?*. The signature feel: a coal fleet that
randomly trips, a winter sunset where demand climbs as solar dies, the dread of
declaring **stage 4** and watching the reliability KPI crater, all while debt
forces tariff hikes, customers don't pay, and the monopoly fractures into pieces
around you. Carbon is brutal and only falls slowly as REIPPPP and private solar
ride in.
