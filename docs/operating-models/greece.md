# Operating Model — Greece

> Research doc for ElectriCity. How running the grid in a stylised **Athens +
> the Aegean / Ionian islands** Greece should *feel* different from GB, and
> which game levers encode that. Pitched at the game's depth: voltages,
> tenders, regulator KPIs, market shape, special mechanics. Figures are
> 2023–2025 where possible; each is flagged with confidence.

---

## One-line identity

A **fully EU-target-model market with a uniquely physical twist: dozens of
diesel-burning ISLANDS that aren't on the grid**. You play a mature European
liberalised system (day-ahead / intraday coupled to Europe, RES auctions,
lignite all but dead) — *except* your map is a sea full of expensive
non-interconnected island systems you must physically cable into the mainland.

---

## Transmission vs distribution

Greece followed the EU unbundling template: legally separate TSO and DSO, both
carved out of the dominant former monopoly.

- **IPTO / ADMIE** (Independent Power Transmission Operator) — the **TSO**.
  Owns and operates the Hellenic Electricity Transmission System (400 kV /
  150 kV, plus the 66 kV islands), runs the system, and is delivering the
  island **interconnection** programme. Historically a PPC subsidiary, now
  ownership-unbundled (a strategic stake sits with China's State Grid; the
  Greek state retains control). (source: Global Legal Insights — Greece 2026;
  IPTO/ADMIE)
- **HEDNO / DEDDIE** (Hellenic Electricity Distribution Network Operator) — the
  **DSO**. Runs the MV/LV distribution networks *and* operates the
  **non-interconnected island** (NII) systems' distribution. A PPC subsidiary
  (PPC has been selling down a 49 % stake to investors). (source: GLI — Greece)
- **PPC / DEI** (Public Power Corporation / Δημόσια Επιχείρηση Ηλεκτρισμού) —
  the **dominant former-monopoly utility**. Still the largest generator (hydro,
  gas, the last lignite) and the largest retailer (~**51–52 % of the retail
  market** in 2023–2025 despite full liberalisation). PPC is the historical
  parent of both IPTO and HEDNO. (source: Statista "Greece electricity retail
  market shares 2023"; PPC/DEI investor info)

**Voltage shape for the game.** Greece runs **50 Hz**. Transmission is 400 kV
(the mainland backbone + the high-voltage links out to interconnected islands)
and 150 kV; distribution is 20 kV MV and 400/230 V LV. The islands run their
own 66 kV / 20 kV autonomous grids until cabled in.

---

## Regulator

- **RAAEY** (Regulatory Authority for Waste, Energy & Water — formerly **RAE**,
  the Regulatory Authority for Energy). The energy regulator; sets network
  tariffs, licenses, market rules, and designates the **NEMO** (Nominated
  Electricity Market Operator). (source: GLI — Greece; HEnEx)
- **Control model: EU incentive regulation.** Network charges (transmission &
  distribution) are set on a regulated-asset-base / allowed-revenue basis under
  EU rules — i.e. a RIIO-family incentive price control, harmonised with the
  EU Clean Energy Package. Energy itself is *market-priced* (the spot market),
  not regulated.

For the game this is **RIIO-style incentive regulation** for the wires, sitting
on top of a genuine EU wholesale market for energy. KPI lean: balanced —
reliability, cost-efficiency, *and* a strong EU-driven decarbonisation /
RES-integration pull.

---

## How generation is procured

Greece is a **real liberalised market** — the GB-like end of this set — plus
state-supported RES auctions.

- **The Target Model spot market.** Since **1 Nov 2020** Greece runs the EU
  "Target Model": a **Day-Ahead Market (DAM)** and **Intraday Market (IDM)**,
  plus a Balancing Market and Forward Market, operated by the **Hellenic Energy
  Exchange (HEnEx / EnExGroup)** as NEMO. The DAM joined the EU **Single
  Day-Ahead Coupling (SDAC)** on 15 Dec 2020 and the IDM joined **Single
  Intraday Coupling (SIDC / XBID)** on 29 Nov 2022 — so Greek prices are
  *coupled to the rest of Europe* across the interconnectors. (source: EnExGroup;
  EPEX SPOT; IPTO market description)
- **RES auctions (CfD-style).** Renewables are procured via **competitive
  auctions** run under RAAEY, awarding **two-sided Contracts-for-Difference**
  (sliding feed-in premium) — Greece's equivalent of GB CfD. **Law 5106/2024**
  (from 1 May 2024) added auctions for projects that **accept higher curtailment
  rates** and that **bundle storage** (solar + battery hybrids), to manage a
  growing curtailment problem. (source: pv-magazine 2024-05-27; Norton Rose
  Fulbright; balkangreenenergynews)
- **Lignite phase-out.** Greece is **retiring its lignite** (the dirty domestic
  brown coal that once dominated). Lignite fell to **~4–5 % of demand in
  2024–25** — the lowest in a decade — with a full exit targeted late this
  decade. (source: The Green Tank "Trends in electricity production"; Wikipedia)
- **Gas + hydro fill the firm gap**, with a fast-growing solar + wind fleet.
- **PPAs** (corporate bilateral PPAs) are a growing route alongside auctions.

For the game: **'tender' / market ownership** — sealed-bid RES auctions
(CfD strike £/MWh + curtailment terms) feeding a real coupled spot market.
This is the country whose *procurement* is most GB-like in the set.

---

## Tariff & network charges (DUoS-equivalent)

- **EU-style network charges.** Transmission (ΧΣ / ΕΤΜΕΑΡ-era) and distribution
  use-of-system charges are regulated by RAAEY on an allowed-revenue basis and
  appear as distinct lines on the bill — a genuine DUoS/TUoS analogue.
- **Energy** is the market (spot-linked retail offers).
- A long-standing **RES levy (ΕΤΜΕΑΡ)** historically recovered renewables
  support on the bill (now reformed / largely funded otherwise).
- Greek retail prices spiked hard in the 2022 EU energy crisis (gas-set
  marginal prices); the state ran large **bill subsidies** during the crunch —
  worth modelling as a *crisis-era scarcity kicker + temporary support*.

**Game encoding:** clean **network pot (regulated DUoS/TUoS)** + **energy pot
(spot-linked)** split — the closest to the GB model — with an EU-coupled
wholesale shape and an optional crisis subsidy event.

---

## Retail vs network split

- **Liberalised retail.** Households can switch supplier; many independent
  suppliers compete. But the incumbent **PPC still holds ~51 %** of retail —
  liberalised on paper, incumbent-dominated in practice. (source: Statista 2023;
  PPC H1-2025)
- **Network is regulated monopoly** (IPTO transmission, HEDNO distribution).

**Game encoding:** competitive retail layer (with a dominant incumbent share)
over a regulated network — i.e. closer to GB than the other three countries.

---

## Renewables support

- **RES auctions awarding CfDs** (RAAEY), increasingly **bundled with storage**
  and **higher-curtailment** tranches (Law 5106/2024).
- **EU funds** (Recovery & Resilience Facility / cohesion money) co-finance the
  build-out, especially **storage and island interconnections**.
- Result: **RES reached ~48 % of generation in 2024** (wind + solar + biomass),
  vs gas ~41 %, hydro ~5 %, lignite ~4 %, net imports ~5 %. Greece now regularly
  hits **100 %-renewable instantaneous** periods — and is starting to
  **curtail** (~4 % of green output curtailed in Q1 2024). (source: The Green
  Tank 2024; pv-magazine 2024)

---

## Distinctive SEAMS worth modelling (THE key section)

What makes Greece *feel* unlike GB, each mapped to a concrete game lever.

### 1. Non-interconnected ISLANDS — the signature network seam
Dozens of Aegean/Ionian islands historically run as **autonomous systems** on
**expensive, dirty diesel/HFO** generators (the NII systems run by HEDNO).
Connecting an island to the mainland with a **submarine HV cable** is a
specific, costly, high-payoff network project — it slashes that island's cost
and carbon and unlocks its wind/solar. The flagship: **Crete**, interconnected
to the mainland (HV ownership transferred PPC→IPTO in 2021; a major HVDC link to
Attica). A broader interconnection map runs out to 2030 (Cyclades, Dodecanese,
North Aegean). (source: IPTO "Map of interconnections to 2030"; energypress)
- **Lever (the distinctive one):** model a set of **island sub-grids** on the
  map, each starting on **expensive diesel** (high £/MWh, high carbon, poor
  reliability). The player invests in **submarine interconnector cables**
  (lumpy, slow, big capex) to fold each island into the main network — a unique
  *network-design* objective absent from a single-landmass GB map. Each
  interconnection is a mini-tender / project with a clear before/after on the
  island's bill, carbon, and CI/CML.

### 2. High solar + emerging curtailment
Abundant Mediterranean sun + a fast solar build means deep midday troughs and
**curtailment** when generation exceeds local capacity / interconnector limits.
- **Lever:** market shape with a strong **midday solar duck-curve dip**; a
  **firm-curtailment KPI** that bites if you over-build solar without storage or
  interconnection. Storage and island links become the curtailment fix.

### 3. Lignite legacy → fast decarbonisation
Greece went from lignite-dominated to lignite-nearly-dead in ~15 years. The
*transition itself* is a playable arc: retiring brown-coal plants, replacing
firm capacity, managing the carbon line down.
- **Lever:** start with some **legacy lignite** (high carbon, firm, cheap-ish);
  a regulator + EU **decarbonisation push** rewards retiring it for RES + gas +
  storage. Carbon intensity falls sharply as you do.

### 4. Summer tourist / air-conditioning peak
Demand peaks in the **hot summer** — Mediterranean heat plus a tourist-season
population surge on the islands (the islands' peak demand can multiply in
August).
- **Lever:** `peakSeason = summer`; a **summer seasonal uplift**, and on island
  sub-grids a *seasonal demand multiplier* (tourist surge) that makes the
  diesel/interconnection economics swing seasonally.

### 5. EU-coupled wholesale market
Prices are set by the **Target Model** and **coupled to Europe** via
interconnectors — imports/exports flex the price, and the marginal unit is often
gas (so prices track EU gas).
- **Lever:** market shape that's **EU-coupled** (a softer, gas-linked price with
  cross-border import/export relief), an **evening peak**, summer uplift, and a
  **scarcity kicker** for the 2022-style gas crisis. Lower carbon than SA/India,
  higher than nuclear-heavy France.

---

## Numbers & sources

| Metric | Value | Confidence | Source |
|---|---|---|---|
| Frequency | **50 Hz** | High | EU standard |
| RES share of generation (2024) | **~48 %** | High | The Green Tank (ADMIE data) |
| Gas share (2024) | **~41 %** | High | The Green Tank |
| Lignite share (2024–25) | **~4–5 %** (lowest in a decade) | High | The Green Tank; Wikipedia |
| Hydro / net imports (2024) | **~5 % each** | Medium | The Green Tank |
| Carbon intensity | **~250–350 gCO₂/kWh** (falling; gas-set, *est.*) | Medium — *flag* | Inferred from ~48 % RES / ~41 % gas mix |
| Curtailment | **~4 % of green output** (Q1 2024) | Medium | pv-magazine 2024 |
| PPC retail share | **~51–52 %** (2023–2025) | High | Statista 2023; PPC H1-2025 |
| Target Model launch | **DAM/IDM since 1 Nov 2020**; SDAC 2020, SIDC 2022 | High | EnExGroup; EPEX SPOT |
| Crete interconnection | HV PPC→IPTO 2021; HVDC to Attica | High | IPTO; GLI |

**Uncertainty flags.** No single clean 2024 gCO₂/kWh figure for Greece surfaced;
the ~250–350 g range is *inferred* from the published mix (~48 % RES ≈ 0 g,
~41 % gas ≈ 400–490 g, ~4 % lignite ≈ 1,000+ g) and Greece's known rapid
decline — treat as indicative, falling year-on-year. Generation-mix shares vary
month to month (RES is seasonal); the 2024 annual figures above are the safe
headline.

Sources: Global Legal Insights "Energy Laws and Regulations 2026 — Greece";
IPTO/ADMIE (market description; interconnections map to 2030); EnExGroup /
HEnEx; EPEX SPOT (HEnEx SDAC/SIDC); The Green Tank "Trends in electricity
production" (2024–2025); pv-magazine (2024-05-27); Norton Rose Fulbright
(Greek RES auctions); balkangreenenergynews; Statista (retail shares 2023);
Wikipedia ("Greece Energy Situation").

---

## Suggested profile values

```
country:            Greece
nominalHz:          50
peakSeason:         summer            # Mediterranean heat + August tourist surge
generationOwnership: tender           # RES auctions → two-sided CfDs into a coupled spot market
regulatorModel:     riio             # EU incentive regulation (RAAEY) for the wires
regulatorKpiLean:   balanced; strong RES-integration / curtailment + decarbonisation pull
marketShape:        EU-COUPLED gas-set price; evening peak; SUMMER uplift; deep MIDDAY
                    solar dip; scarcity kicker (2022 gas crisis); falling carbon
specialMechanic:    NON-INTERCONNECTED ISLANDS — diesel island sub-grids you cable into
                    the mainland via submarine interconnectors (the headline network seam);
                    + lignite phase-out arc + solar curtailment
gridCarbon:         ~250–350 gCO₂/kWh and falling (gas-set; RES-heavy)
```

**Design note.** Greece is the "**mature EU market with a sea problem**" case.
Procurement and the bill split feel the most GB-like of the four — *but* the map
is the differentiator: a scatter of expensive diesel islands turns network
design into the central puzzle. The signature feel is choosing which island to
cable next, watching its bill and carbon collapse when the interconnector lands,
while juggling summer tourist peaks, a midday solar glut you must store or
curtail, and the last lignite plants bleeding off the carbon line.
