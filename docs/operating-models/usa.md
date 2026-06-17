# Operating Model — United States of America

> Research doc for the ElectriCity game profile. The player is the network
> operator. This file describes how the US power system actually works, then
> proposes the game-profile knobs at the bottom. Data targets 2023–2025; any
> figure flagged "(uncertain)" should be treated as approximate.

## One-line identity

**There is no single "US grid" — there are ~7 organized wholesale markets plus
a sea of vertically integrated regulated utilities, all priced by *location*
(nodal LMP), and one famous island (ERCOT/Texas) that runs energy-only with no
capacity payment and lets prices spike to $5,000/MWh to keep the lights on.**
Operating in the US means picking *which America* you're in: a liberalised
nodal market or a cost-of-service monopoly.

## Transmission vs distribution

The US is a federation, and so is its grid. The defining feature is **deep
fragmentation** layered on three asynchronous AC interconnections (Eastern,
Western, and the Texas/ERCOT island).

**Transmission / bulk system operators (the RTO/ISO layer):**
- **PJM Interconnection** — the largest RTO; the mid-Atlantic + Ohio Valley
  (~65 million people across 13 states + DC). Runs a forward capacity market.
- **MISO** (Midcontinent ISO) — the Midwest down to Louisiana.
- **SPP** (Southwest Power Pool) — the central plains.
- **ERCOT** (Electric Reliability Council of Texas) — the Texas island;
  energy-only, no capacity market, intra-state (so it dodges most FERC
  jurisdiction — this is the whole point of ERCOT's existence).
- **CAISO** (California ISO) — California + a growing Western "EIM/EDAM" footprint.
- **ISO-NE** (ISO New England) — the six New England states.
- **NYISO** (New York ISO) — New York State.
- **The non-RTO regions** — most of the **Southeast** (e.g. the Southern
  Company / TVA footprint) and much of the **West** outside California run
  *no organized market*: utilities self-dispatch and trade bilaterally.

**Distribution / retail-serving utilities (three ownership types):**
- **IOUs** (investor-owned utilities) — ~70% of customers. Examples: PG&E,
  Southern California Edison, Duke, Dominion, ConEd, Florida Power & Light.
  Shareholder-owned, regulated by state PUCs.
- **Municipal utilities ("munis" / public power)** — city-owned, not-for-profit
  (e.g. LADWP, SMUD, Seattle City Light). ~2,000 of them.
- **Rural electric cooperatives ("co-ops")** — member-owned, serve ~13% of
  customers over ~56% of US land area, born from 1930s rural electrification.

**Vertical integration:** Pervasive in the **South and West**. A vertically
integrated utility owns generation + transmission + distribution and recovers
the lot in a single bundled, cost-of-service retail rate (it builds plant via an
**Integrated Resource Plan, IRP**, approved by the PUC). In **restructured
states** (Texas, much of the Northeast/mid-Atlantic), generation was legally
divested and is merchant; the wires company is a regulated "wires-only" utility.

## Regulator

Two-level, and the split matters:

- **FERC** (Federal Energy Regulatory Commission) regulates **interstate
  transmission, wholesale markets, and the RTOs/ISOs**. It approves
  transmission tariffs and formula rates and oversees market rules. It does
  *not* regulate ERCOT energy sales (intra-state) — ERCOT's deliberate
  jurisdictional gap.
- **NERC** (North American Electric Reliability Corporation) — the
  FERC-certified reliability authority; sets and enforces mandatory reliability
  standards (the post-2003-blackout regime).
- **State PUCs / PSCs** (Public Utility Commissions) regulate **retail rates and
  distribution** for IOUs in their state. This is where the actual customer bill
  is decided, via **rate cases**.

**Control model:** Predominantly **cost-of-service / rate-of-return** ("the
utility earns an allowed Return on Equity, ~9–10%, on its rate base of prudent
capital"). **Performance-Based Ratemaking (PBR)** — revenue caps, multi-year
plans, performance incentive mechanisms — is *creeping in* (Hawaii's PBR,
parts of New York's REV, Illinois) but the US is nowhere near GB's full RIIO
incentive regime. The structural quirk: rate-of-return rewards *building more
rate base* (the "Averch–Johnson effect"), the opposite of RIIO's totex-
efficiency incentive.

## How generation is procured

It depends entirely on whether you're in an organized market or a vertically
integrated region.

**In RTO/ISO markets (PJM, MISO, SPP, CAISO, ISO-NE, NYISO, ERCOT):**
- **Energy** clears in **day-ahead and real-time markets** at **nodal Locational
  Marginal Prices (LMP)** — a separate price at every node, equal to marginal
  energy + congestion + losses. Congestion is the headline feature: when a line
  is constrained, prices diverge sharply across the map.
- **Capacity** — most eastern RTOs run a **capacity market** to pay for firm
  MW years ahead:
  - **PJM RPM** (Reliability Pricing Model) — Base Residual Auction, 3 years
    forward. The July 2024 BRA cleared at **$269.92/MW-day**, a ~10× jump on
    the prior auction (source:
    https://www.congress.gov/crs-product/R48553), driven by retirements,
    rising data-centre demand, and post-Winter-Storm-Elliott rule changes.
  - **ISO-NE FCM** (Forward Capacity Market), **NYISO ICAP**.
  - **ERCOT** — **no capacity market at all**. It is **energy-only**: scarcity
    is priced through the **Operating Reserve Demand Curve (ORDC)** adder, with
    a system-wide offer cap historically **$9,000/MWh** (lowered to **$5,000/MWh**
    from 2024 under post-Uri reforms). The theory: high scarcity prices alone
    must signal new build and demand response.
- **Bilateral PPAs** layer on top everywhere — corporates (data centres,
  Amazon/Google/Meta) sign long-term PPAs directly with developers; this is the
  dominant route to market for new renewables in the IRA era.

**In vertically integrated regions (Southeast, much of the West):**
- No spot market. The utility runs an **IRP**, the PUC approves a build/buy
  plan, and the utility either self-builds (capex into rate base) or signs PPAs.
  This is the closest US analogue to the game's "owned" model.

**The IRA tax-credit era:** The **Inflation Reduction Act (2022)** turned the
federal **Production Tax Credit (PTC)** and **Investment Tax Credit (ITC)** into
long-dated, transferable, tech-neutral credits — the single biggest driver of
the current solar/storage/wind boom. (Note: politically contested and subject to
change; flag as evolving policy.)

## Tariff & network charges (DUoS-equivalent)

- **Bundled vs unbundled.** In regulated states the customer pays one
  **bundled retail rate** (generation + transmission + distribution + riders).
  In **restructured states** the bill is **unbundled**: a competitive
  *generation/supply* charge from the chosen retailer, plus a regulated
  *delivery* charge from the wires utility.
- **Demand charges.** A distinctly US feature — commercial/industrial customers
  pay a **$/kW charge on their peak demand** (often their single largest 15-min
  interval in the month), separate from the **$/kWh energy charge**. This is the
  closest US analogue to a capacity-based DUoS signal.
- **Transmission cost recovery.** FERC-approved **transmission tariffs and
  formula rates** recover bulk-grid costs; large transmission build (and its
  cost allocation across states) is a chronic fight.
- **Net metering** for rooftop solar is set state-by-state and is contentious
  (e.g. California's **NEM 3.0** cut export credits sharply in 2023).

## Retail vs network split

- **~13–14 states + DC** plus **Texas** offer **residential retail choice**;
  Texas is the deepest — in ERCOT territory there is **no default utility
  supply**, every household must pick a **Retail Electricity Provider (REP)**
  from 100+ competitors (source:
  https://www.resausa.org/energy-by-state/). Pennsylvania (restructured 1997)
  and the rest of the PJM/Northeast corridor also have choice.
- **~32 states + DC** have *some* form of deregulation, but the comprehensive
  *residential* choice list is much shorter (~13–14 + TX); several states
  (Michigan, Nevada, Oregon, Virginia) only open choice to large
  non-residential customers (source:
  https://mostpolicyinitiative.org/science-note/electricity-retail/).
- **Most states remain bundled** — the regulated IOU is the only supplier.

## Renewables support

- **Federal:** the **IRA's ITC/PTC** (above) — the dominant national lever.
- **State RPS / RECs:** ~30 states have a **Renewable Portfolio Standard**
  obliging retailers to source a rising % of renewables, tracked via tradable
  **Renewable Energy Certificates (RECs)**. Targets vary wildly — California and
  New York target 100% clean by 2045/2040; some states have none.
- **No single national renewables target** — the US is a patchwork by design.

## Distinctive seams worth modelling (the key section)

These are what make the US *feel* different from GB at the controls. Each maps
to a game lever.

1. **Nodal LMP & congestion → market shape + "constraint payments" tender flow.**
   Unlike GB's single national wholesale price, the US prices energy at every
   node. When transmission is constrained, generators behind the constraint get
   paid *less* (or curtailed) while load ahead of it pays *more*. **Game lever:**
   layer a *locational* multiplier on the market-shape price by region/zone, and
   route **congestion/constraint payments** into the tender-curtailment-comp
   flow. Reinforcing a line should *visibly collapse* a local price spread.

2. **Capacity market vs energy-only → blackout risk dial (the ERCOT seam).**
   PJM/ISO-NE pay for firm capacity years ahead (smoother, costlier). **ERCOT
   pays nothing for capacity** and relies on **scarcity price spikes** to
   $5,000/MWh. The catastrophic failure mode is real: **Winter Storm Uri,
   Feb 2021** froze gas wells and wind, ~4.5 million Texas homes lost power,
   200+ died, and prices sat pinned at the $9,000/MWh cap for days, bankrupting
   retailers (sources:
   https://www.spglobal.com/market-intelligence/en/news-insights/research/taming-the-wild-west-ercot-market-changes-improve-reliability,
   https://energy.utexas.edu/research/ercot-blackout-2021). **Game lever:** a
   per-country toggle between a **capacity-market** mode (pay a standing
   capacity premium into the network pot, low blackout risk) and an
   **energy-only** mode (no premium, but a fat **scarcity kicker** on the market
   shape and a real loss-of-load / CI-CML event risk in extreme weather).
   ERCOT is the headline "energy-only island" scenario.

3. **Interconnection-queue backlog → tender lead-time friction.** Connecting new
   generation in the US is famously slow — multi-year queues clogged with
   speculative projects and huge "network upgrade" cost assignments. **Game
   lever:** add a **queue delay + upgrade-cost** to awarded tenders, so signing
   a developer doesn't deliver MW instantly; the operator can pay to fast-track.

4. **Wildfires & PSPS → planned de-energisation as a reliability/liability
   mechanic.** California courts apply *inverse condemnation*: a utility is
   liable for fire damage from its equipment even without negligence. **PG&E's
   ~$30bn liability** from the 2017–2018 fires drove it into bankruptcy
   (source:
   https://www.clearygottlieb.com/news-and-insights/publication-listing/utility-companies-with-wildfire-liability-exposure-pose-unique-considerations-for-investors).
   The response is **Public Safety Power Shutoffs (PSPS)** — utilities
   *deliberately cut power* to high-wind, high-fire-risk lines (the 2019 PG&E
   PSPS hit ~30 counties; source:
   https://en.wikipedia.org/wiki/2019_California_power_shutoffs). **Game lever:**
   a weather event (hot, dry, high wind) forces a choice: **de-energise** lines
   (take a CI/CML + satisfaction hit now) or **risk an ignition** (catastrophic
   liability + carbon + reputation hit). A uniquely-US dilemma.

5. **Hurricanes (Gulf/East coast) → restoration & resilience.** Distinct from
   GB's wind storms: Gulf-coast utilities face hurricane-season outages and
   long restoration. **Game lever:** seasonal hurricane risk on coastal zones,
   with undergrounding/hardening capex reducing it.

6. **Demand charges → a different bill structure.** US C&I bills are
   peak-kW-driven, not just kWh. **Game lever:** expose a **demand-charge**
   component so the operator can value peak-shaving / batteries differently
   from GB.

7. **60 Hz, 120/240 V split-phase.** Cosmetic but flavourful — US runs **60 Hz**
   (vs GB's 50 Hz) and a 120/240 V residential service.

## Numbers & sources

- **Grid carbon intensity:** ~**384 gCO₂/kWh in 2024** (down from ~393 in 2023;
  598 at the 2007 coal peak) (source:
  https://ember-energy.org/latest-insights/us-electricity-2025-special-report/).
- **Generation mix (2024):** gas the largest share; **coal down to a record-low
  ~15%** (from 49% in 2007); wind+solar growing fast; nuclear ~18–19% steady
  (source: Ember, as above). (Exact 2024 shares vary by source — treat as
  approximate.)
- **Frequency:** **60 Hz**. Three asynchronous interconnections (East, West,
  ERCOT).
- **Typical residential rate:** ~**16–17 ¢/kWh** national average (2024),
  but enormous spread — ~12 ¢ in low-cost states to ~30+ ¢ in CA/New England,
  ~45 ¢ in Hawaii. North America residential ~**14.8 ¢/kWh (USD)** per a global
  comparison (source: https://www.globalpetrolprices.com/electricity_prices/).
  (Specific US figure uncertain — flag.)
- **PJM 2024 capacity clear:** **$269.92/MW-day** (source: CRS R48553, above).
- **ERCOT offer cap:** **$9,000/MWh** during Uri; **$5,000/MWh** post-2024.

## Suggested profile values

- **nominalHz:** `60`
- **peakSeason:** **summer** (national default — air-conditioning drives the
  ISO peaks in PJM/CAISO/ERCOT/SPP). *Caveat:* a winter-peaking variant fits a
  Texas/ERCOT-Uri or New England scenario.
- **generation ownership:** **`tender`** for the organized-market default
  (liberalised merchant generation + PPAs). Offer an **`owned`** variant for a
  *vertically integrated Southeast/West* scenario (utility builds via IRP, capex
  into the network pot).
- **regulator model:** **`cost-of-service`** / rate-of-return as the base (PUC
  rate cases, ROE on rate base); flag **PBR** as the modern overlay. Lean KPI
  weights toward **reliability (CI/CML)** and **avg bill**; carbon weight
  *low/optional* (no strong federal carbon mandate).
- **market shape (qualitative):**
  - cheap-night **floor** (gas + nuclear baseload),
  - strong **evening/late-afternoon peak** (summer A/C),
  - a real **midday solar duck-curve dip** in CAISO/high-solar zones,
  - **seasonal uplift** in summer,
  - a **big scarcity kicker** — *especially* in the ERCOT energy-only mode,
  - grid carbon ~**384 g/kWh** (tunable per region — Southeast/Midwest dirtier,
    CA/Northeast cleaner).
- **special mechanics:**
  - **Nodal/locational price multiplier + congestion constraint payments** (the
    signature US mechanic).
  - **Capacity-market vs energy-only toggle** (ERCOT scarcity + blackout risk).
  - **PSPS / wildfire de-energisation dilemma** for a California scenario.
  - **Interconnection-queue lead-time** on awarded tenders.
  - **Demand-charge** component in the bill.
  - **Retail choice** on/off per scenario (Texas = full choice; Southeast =
    bundled monopoly).
