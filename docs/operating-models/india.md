# Operating Model — India

> Research doc for ElectriCity. How running the grid in a stylised
> **Delhi-NCR / Mumbai + a vast hinterland** India should *feel* different from
> GB, and which game levers encode that. Pitched at the game's depth: voltages,
> tenders, regulator KPIs, market shape, special mechanics. Figures are
> 2023–2025 where possible; each is flagged with confidence.

---

## One-line identity

A **giant federal grid run on the back of chronically broke distribution
companies** — the wires reach a billion-plus people, the world's cheapest solar
auctions clear at ₹2/kWh, but the **DISCOMs hemorrhage money to theft,
unmetered free farm power and cross-subsidy**, and ~70 % of the electrons are
still **coal**. The signature stress isn't a market or a blackout — it's the
**AT&C loss + ACS-ARR financial-distress** machine at the distribution edge.

---

## Transmission vs distribution

India is a **federal**, multi-tier system: a national operator, central +
state transmission utilities, and a thicket of state distribution companies.

- **Grid-India (formerly POSOCO)** — Grid Controller of India Ltd, the
  **national load-dispatch** body. Runs the National Load Despatch Centre
  (NLDC), Regional LDCs and coordinates the synchronous "One Nation, One Grid".
  (source: Wikipedia; Grid-India)
- **Central Transmission Utility — PGCIL / CTU.** **Power Grid Corporation of
  India Ltd (PGCIL)** owns/operates the **inter-state transmission system**
  (765 kV / 400 kV / HVDC backbone), with **CTU of India Ltd** as the central
  transmission planner/coordinator. (source: Wikipedia; PGCIL)
- **State Transmission Utilities (STUs)** — each state has its own STU /
  transco for **intra-state transmission**.
- **State DISCOMs** — distribution is **state-level**: dozens of **DISCOMs**
  (often the descendants of the old State Electricity Boards), mostly
  state-government-owned, plus a few **private DISCOMs** (Tata Power-DDL, BSES /
  Adani in Delhi; Adani Electricity Mumbai; CESC Kolkata). They run MV/LV and
  bill end customers — and are **chronically loss-making**. (source: Wikipedia;
  Business Standard 2025)

**Voltage shape for the game.** India runs **50 Hz**. Transmission: **765 kV**
+ 400 kV + 220 kV (plus long **HVDC** links moving power across a continental
grid — e.g. coal/renewables from the interior to coastal/northern load);
distribution: 33/11 kV MV and 415/240 V LV. The grid spans huge distances and
hugely varied load (mega-metros to electrified villages).

**History → now:** classic **single-buyer State Electricity Board** monopolies
→ unbundled (post Electricity Act 2003) into separate gen/transco/DISCOMs →
plus a **liberalised wholesale market** (the power exchanges). Model India as
**mixed ownership + a real wholesale market, with weak distribution finances**.

---

## Regulator

- **CERC** — Central Electricity Regulatory Commission: regulates **inter-state**
  transmission tariffs, the power exchanges, and central generators. (source:
  CERC; Wikipedia)
- **SERCs** — a **State Electricity Regulatory Commission** in every state sets
  **retail tariffs**, intra-state transmission/wheeling charges and DISCOM
  performance norms. The action is mostly at the *state* level. (source: SERCs)
- **Control model: multi-year tariff (MYT) / cost-of-service.** SERCs set DISCOM
  **Aggregate Revenue Requirement (ARR)** and approve tariffs to recover it —
  cost-of-service with multi-year efficiency targets. The chronic problem is the
  **ACS–ARR gap**: **A**verage **C**ost of **S**upply exceeds **A**verage
  **R**evenue **R**ealised, so DISCOMs lose money on every unit. The gap fell
  from ~₹0.84/kWh (FY13) to **~₹0.39/kWh (FY24)** under reform, but persists.
  (source: PIB; Mercom; powermin.gov.in)

For the game this is a **cost-of-service** regulator (state-level ARR/tariff)
with a defining feature: **the regulator approves a tariff, but the DISCOM can't
actually collect it** (losses + non-payment), so the *gap* is the real story.
KPI lean: **affordability + loss-reduction / financial-viability** front and
centre, with reliability (weak-grid) and carbon both major secondary pressures.

---

## How generation is procured

A genuine, *cheap* competitive auction market for renewables, layered on a
coal-heavy fleet and DISCOM PPAs, with a working power exchange.

- **Reverse-auction solar & wind.** India procures utility-scale RES via
  **reverse auctions** run by central agencies (SECI — Solar Energy Corp of
  India), NTPC, state agencies and solar-park SPVs. Competition drove the
  **world's cheapest solar tariffs**: a record **₹1.99/kWh (Gujarat, 2020)** /
  **₹2.00/kWh (SECI, 2020)**, with 2024's lowest at **~₹2.15/kWh** — historically
  cheap power. Winners sign 25-year PPAs (often with SECI/NTPC as intermediary
  off-taker, who back-to-back to DISCOMs). (source: Mercom; JMK Research;
  pv-magazine; Business Standard)
- **DISCOM PPAs.** DISCOMs hold large long-term **PPAs** (coal IPPs + central
  NTPC stations + RES) — the bulk of their power. Surplus/shortfall is balanced
  on the exchange.
- **The power exchange (IEX).** The **Indian Energy Exchange (IEX)** dominates a
  real **day-ahead / real-time / term + green** spot market (plus PXIL, HPX).
  IEX volumes are large and growing (e.g. tens of BU/quarter; a fast-growing
  **Green Market** + REC trading). This is India's liberalised wholesale layer.
  (source: IEX; Business Standard)
- **Coal still dominates.** Coal/lignite is **~75–77 % of generation** (despite
  being ~54 % of installed capacity) — the firm backbone. (source: Down To
  Earth; Ember-derived)
- **World-leading solar targets.** **500 GW non-fossil capacity by 2030**;
  ~258 GW renewables installed by end-2025 and climbing fast (huge **solar
  parks** like Bhadla, Pavagada). (source: Down To Earth; PIB; Global Energy
  Monitor)

For the game: **mixed ownership** — a real **'tender'/auction** lane for RES
(record-cheap sealed bids → 25-yr PPAs) feeding a **wholesale exchange**, on top
of **coal PPAs** and central generators. Closest to GB on *procurement
mechanics*, but with much cheaper solar and a coal floor.

---

## Tariff & network charges (DUoS-equivalent)

- **Cross-subsidy is the defining tariff feature.** **Industrial & commercial
  users are charged ABOVE cost to subsidise agricultural & residential users
  charged BELOW cost.** Many states give **free or near-free farm power**
  (unmetered agricultural supply) — a political third rail — funded by C&I
  tariffs and state subsidy. (source: SERC tariff orders; widely documented)
- **Cross-subsidy surcharge + open access.** Large consumers can buy power
  directly (open access), but pay a **Cross-Subsidy Surcharge (CSS)** + wheeling
  + additional surcharge to compensate the DISCOM for the subsidy it loses —
  a deliberate brake on C&I customers fleeing the DISCOM. (source: Electricity
  Act 2003; SERC orders)
- **Wheeling charges** (intra-state) are the DUoS analogue; **CTU/ISTS charges**
  the TUoS analogue (with ISTS-waiver incentives for RES historically).
- **AT&C losses** — **A**ggregate **T**echnical **&** **C**ommercial losses bundle
  technical line losses **+ commercial losses (theft, under-billing,
  non-collection)**. National AT&C was **~15.4 % (FY23)**, down from ~25 %+ a
  decade earlier — but still huge (every ~15th unit isn't paid for). (source:
  Mercom; PIB; powermin.gov.in)

**Game encoding:** **network pot = wheeling (intra-state) + ISTS (inter-state)
charges**; **energy pot = PPAs + exchange (coal-floored, cheap-solar)**. Add the
two signature distortions: a **cross-subsidy transfer** (C&I → ag/residential)
and an **AT&C-loss leak** (a chunk of energy delivered is never paid for).

---

## Retail vs network split

- **Mostly state/regulated**: households buy from their state DISCOM at
  SERC-set tariffs. No widespread household retail competition (yet — "retail
  competition / carriage-content separation" is much-discussed, little
  implemented).
- **Open access for large users** *is* real competition: industrial/commercial
  consumers above a threshold can contract directly with generators or buy on
  IEX and **wheel** power, paying CSS + wheeling. This is India's live
  liberalisation seam (cousin of SA wheeling / GB I&C supply). (source:
  Electricity Act 2003; IEX)

**Game encoding:** regulated household retail (state DISCOM) + an **open-access
large-user lane** (CSS-taxed). C&I customers leaving for open access *worsens*
the DISCOM's cross-subsidy maths — a death-spiral nudge, like SA wheeling.

---

## Renewables support

- **Reverse auctions** (SECI/NTPC/state) — the primary, ultra-competitive
  mechanism (record-low tariffs).
- **Solar parks** — plug-and-play mega-sites (Bhadla ~2.2 GW, Pavagada ~2 GW)
  that de-risk land/transmission for developers.
- **Rooftop schemes** — e.g. **PM Surya Ghar: Muft Bijli Yojana** (residential
  rooftop subsidy, target ~10 m homes).
- **RPO — Renewable Purchase Obligations** — DISCOMs/large consumers **must** buy
  a rising % of renewables (enforced via **RECs** traded on the exchange).
- **ISTS charge waivers** historically sweetened inter-state RES.
- Result: renewables surging (~258 GW by end-2025) toward the **500 GW-by-2030**
  non-fossil target — but coal still grew in absolute terms to meet demand.

---

## Distinctive SEAMS worth modelling (THE key section)

What makes India *feel* unlike GB, each mapped to a concrete game lever.
**The defining stress is the distribution-finance / loss machine, not the market.**

### 1. DISCOM financial distress (ACS–ARR gap) — the central mechanic
DISCOMs lose money on nearly every unit: their **cost of supply exceeds the
revenue they realise** (ACS–ARR gap ~₹0.39/kWh FY24), kept afloat by state
subsidies, periodic central bailouts (UDAY, then **RDSS** — a ₹3.04 lakh-crore
reform scheme to cut losses + the gap to zero) and accumulating debt to gencos.
(source: PIB; ForumIAS; Mercom)
- **Lever (the signature one):** model the DISCOM's **revenue gap** explicitly —
  a structural shortfall (cost > collected revenue) the player must *close* via
  loss-reduction, metering, tariff rationalisation and subsidy, scored as a
  **financial-viability KPI**. The core loop is "stop the distribution business
  bleeding money", not "optimise a clean market". Reform schemes (RDSS) are
  unlockable interventions that fund loss-reduction capex.

### 2. AT&C / commercial losses + THEFT (non-technical losses)
A large slice of delivered energy is **never paid for** — theft (hooking onto
LV lines), meter tampering, under-billing and non-collection. AT&C ~**15.4 %**
nationally, far higher in some states. This is *commercial* leakage on top of
technical line losses.
- **Lever:** an **AT&C-loss factor** — a % of energy delivered that yields **no
  revenue** (theft/non-collection), distinct from physical line losses. The
  player invests in **smart metering / feeder separation / enforcement** to drag
  it down — a uniquely Indian (and SA-adjacent) revenue mechanic absent from GB.
  Higher theft in poorer/rural feeders → spatial variation on the map.

### 3. Cross-subsidy + FREE FARM POWER
C&I tariffs prop up below-cost ag/residential supply; **free, often unmetered
agricultural pumping** is politically untouchable and a major loss/subsidy
source (and drives groundwater over-pumping).
- **Lever:** a **cross-subsidy transfer** (industrial tariff surcharge funds
  ag/residential discount) + an **unmetered free-farm-power** demand block that
  generates load but **little/no revenue** and resists metering. Touching farm
  tariffs carries a **political-backlash / satisfaction** penalty — a distinctive
  "you can't just price it correctly" constraint.

### 4. Monsoon + extreme-summer heat peak
Demand peaks in the **hot pre-monsoon / summer (Apr–Jun)** — brutal heatwaves
drive record air-conditioning/irrigation load; then the **monsoon (Jun–Sep)**
shifts the shape (hydro up, solar dimmed by cloud, humidity-driven cooling).
- **Lever:** `peakSeason = summer` (pre-monsoon heat); a strong **summer
  seasonal uplift** + heat-driven demand spike, and a **monsoon modifier**
  (boosts hydro, derates solar, shifts load) — a two-phase Indian climate year
  unlike GB's winter peak.

### 5. Coal-heavy carbon + huge RES push + curtailment
~75 % coal → **~700–716 gCO₂/kWh** (well above the ~480 g world average), yet
the **fastest RES build** anywhere — so you decarbonise hard *while* coal grows
to meet demand, and **curtailment** appears where RES outruns weak intra-state
grids/transmission. (source: lowcarbonpower.org; CEA grid factor 0.716 t/MWh)
- **Lever:** start **carbon high (~700 g)** with a coal floor; a strong
  decarbonisation pull (RPO + cheap auctions) drags it down, but **firm-
  curtailment** bites where you over-build RES without storage/grid. Tension:
  cheap solar by day vs coal-firmed evenings.

### 6. Weak-grid reliability
Beyond loadshedding-style shortfalls, much of India has **unreliable
distribution** — frequent local outages, voltage problems, and supply that
historically wasn't 24×7 (rural areas especially). Reliability is a
*distribution-quality* problem more than a national-adequacy one.
- **Lever:** reliability KPI (CI/CML) driven by **feeder-level** quality —
  worse on overloaded/high-loss rural feeders; improves with the same metering/
  reinforcement spend that cuts AT&C. Ties reliability to the loss mechanic.

---

## Numbers & sources

| Metric | Value | Confidence | Source |
|---|---|---|---|
| Frequency | **50 Hz** | High | Standard |
| Coal share of generation | **~75–77 %** (FY23/24); ~54 % of *capacity* | High | Down To Earth; Ember |
| Renewables installed (end-2025) | **~258 GW**, target **500 GW non-fossil by 2030** | High | Global Energy Monitor; PIB |
| Carbon intensity | **~700–716 gCO₂/kWh** (CEA grid factor 0.716 tCO₂/MWh FY23) | High | CEA CO₂ Baseline DB; lowcarbonpower.org |
| AT&C losses | **~15.4 % (FY23)** (down from ~25 % FY13); ~15.0 % FY25 | High | Mercom; PIB; powermin.gov.in |
| ACS–ARR gap | **~₹0.39/kWh (FY24)** (from ~₹0.84 FY13) | High | PIB; powermin.gov.in |
| Record solar tariff | **₹1.99/kWh (Gujarat 2020)** / ₹2.00 (SECI 2020); ~₹2.15 low in 2024 | High | Mercom; JMK; pv-magazine |
| RDSS scheme | **₹3.04 lakh-crore** (FY22–26), target AT&C 12–15 % & gap→0 | High | PIB; RDSS |
| IEX | dominant power exchange (DAM/RTM/term/green); tens of BU/qtr | Medium | IEX; Business Standard |
| Peak season | **Summer / pre-monsoon (Apr–Jun)** heat peak | High | Demand-pattern reporting |

**Uncertainty flags.** Carbon: the **CEA grid emission factor was 0.716
tCO₂/MWh for FY23 (~716 g)**; some trackers show ~700 g (2024) and a faster
*per-unit* decline as RES grows — quote **~700–716 g** and falling. AT&C and
ACS–ARR figures are **national averages**; individual states range from
single-digit to 30 %+ losses — the *spread* is the interesting bit for a map.
DISCOM finances improved sharply by FY25 (first sector-wide profit in a decade),
so frame the distress as **structural-but-improving**, not collapsing.

Sources: Wikipedia (POSOCO/Grid-India, PGCIL, "Energy policy of India"); CERC;
SERC tariff orders; PIB (RDSS; 500 GW; DISCOM metrics); Mercom (AT&C FY23;
solar tariffs); JMK Research; pv-magazine; Down To Earth ("500 GW switch");
Global Energy Monitor; CEA "CO₂ Baseline Database v19"; lowcarbonpower.org
(India); IEX; Business Standard (DISCOM ratings; IEX volumes); ForumIAS
(ACS–ARR turnaround); powermin.gov.in (Rajya Sabha Q FY24).

---

## Suggested profile values

```
country:            India
nominalHz:          50
peakSeason:         summer            # pre-monsoon HEAT peak (Apr–Jun); + monsoon modifier
generationOwnership: tender (mixed)   # real reverse-auction RES → 25-yr PPAs + IEX exchange,
                                      #   on a coal-PPA/central-genco base. Not state-only.
regulatorModel:     cost-of-service  # SERC multi-year ARR/tariff; defining ACS–ARR gap
regulatorKpiLean:   affordability + LOSS-REDUCTION/financial-viability >> carbon ~ reliability
marketShape:        cheap-night floor; evening peak; deep MIDDAY solar dip (record-cheap PV);
                    strong SUMMER uplift; MONSOON modifier (hydro up, solar dim); high carbon
specialMechanic:    DISCOM DISTRESS — explicit ACS–ARR revenue gap + AT&C/THEFT loss leak
                    (energy delivered but unpaid) + CROSS-SUBSIDY (C&I→ag/residential) +
                    FREE FARM POWER (unmetered, untouchable) + open-access CSS + weak-grid
                    feeder reliability + coal carbon vs huge RES push/curtailment
gridCarbon:         ~700–716 gCO₂/kWh (coal ~75%; falling per-unit as RES surges)
```

**Design note.** India is the "**the wires reach everyone but the distribution
business is broke**" case. Unlike SA (can't generate enough) or Egypt
(subsidised gas), India's stress lives at the **distribution edge**: theft,
unmetered free farm power, cross-subsidy and the relentless ACS–ARR gap mean you
can buy the world's cheapest solar yet still lose money on every unit you
deliver. The signature feel: dragging AT&C losses and the revenue gap down with
smart meters and feeder reform, fighting the political impossibility of pricing
farm power, riding a brutal summer heat peak into the monsoon, and decarbonising
a coal-floored grid at record speed while curtailment nibbles at a weak grid.
