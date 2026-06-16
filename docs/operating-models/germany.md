# Operating Model — Germany

> Research doc for the ElectriCity game profile. The player is the network
> operator. This file describes how the German power system actually works, then
> proposes the game-profile knobs at the bottom. Data targets 2023–2025; any
> figure flagged "(uncertain)" should be treated as approximate.

## One-line identity

**The Energiewende grid: >60% renewable, frequently *negative* wholesale prices
when the wind blows, no nuclear since April 2023, and a crippling north–south
geographic split where cheap wind power in the north can't physically reach
demand in the south — so Germany spends billions every year on redispatch to
paper over the missing wires.** Operating here is a constant fight against your
own grid topology.

## Transmission vs distribution

Germany's grid is unbundled (EU "ownership unbundling" rules) and split into a
small, concentrated transmission tier over a *very* fragmented distribution tier.

**Transmission — the 4 TSOs** (each runs a geographic control zone and is
jointly responsible for the 50 Hz frequency and the EEG renewables accounting):
- **50Hertz** — the northeast and east (the old East Germany + Hamburg/Berlin);
  the windy north — owned by Belgium's Elia + KfW.
- **Amprion** — the west (North Rhine-Westphalia down the Rhine).
- **TenneT (DE)** — a north–south corridor through the middle/west; Dutch
  state-owned (TenneT also runs the Dutch grid).
- **TransnetBW** — the southwest (Baden-Württemberg), the demand-heavy south.

**Distribution — ~880 DSOs.** This is the defining structural fact: Germany has
roughly **880 distribution network operators**, ranging from the four TSOs'
large regional DSOs (e.g. Westnetz, Bayernwerk, Avacon) down to hundreds of
tiny municipal networks. (Source for the ~880 figure: Bundesnetzagentur / EU
reporting — widely cited; flag exact count as approximate.)

**The Stadtwerke model.** A huge share of distribution + local retail is run by
**Stadtwerke** — municipally owned city utilities (think "city works"). They
own the local wires, often a CHP/district-heat plant, and sell electricity, gas,
heat and water as a bundle to townsfolk. They are the cultural heart of German
distribution: local, public, multi-utility.

**Vertical integration:** Legally *unbundled* at transmission (the TSOs cannot
own generation), but the big generators (RWE, EnBW, LEAG, Uniper) and the
retail/DSO businesses (E.ON, EnBW, Stadtwerke) remain large incumbents. So:
liberalised and unbundled in law, but oligopolistic in practice.

## Regulator

- **Bundesnetzagentur (BNetzA)** — the Federal Network Agency; the national
  regulator for electricity, gas, telecoms, rail and post. Sets network charges,
  runs the renewables auctions, and manages grid planning.
- **EU / ACER context.** Germany sits inside the EU internal energy market:
  **ACER** (the EU Agency for the Cooperation of Energy Regulators) and the
  **ENTSO-E** TSO body coordinate cross-border flows, market coupling, and
  network codes. German wholesale prices are set in a coupled European market
  (EPEX SPOT / EUPHEMIA), not in isolation.

**Control model: incentive regulation (Anreizregulierung).** BNetzA regulates
the TSOs and DSOs under a **revenue-cap incentive regime** (the
*Anreizregulierungsverordnung*, ARegV) — multi-year regulatory periods with an
efficiency-factor (X-factor) benchmark that ratchets allowed revenue down toward
an efficient frontier. This is conceptually the **closest peer to GB's RIIO** of
the three countries here: a totex-style revenue cap with efficiency incentives.

## How generation is procured

**Wholesale: merit-order spot market (EPEX SPOT).** Generation is dispatched by
marginal cost in a coupled day-ahead/intraday market. Renewables (near-zero
marginal cost) sit at the bottom of the merit order, so heavy wind/solar pushes
the clearing price *down* — and frequently **negative** (see seams).

**Renewables: EEG auctions (the Energiewende engine).** The
**Erneuerbare-Energien-Gesetz (EEG)** historically paid renewables a guaranteed
**feed-in tariff**; since ~2017 new large projects win support via
**competitive auctions** run by BNetzA (a contract-for-difference-like
market premium on top of the spot price). EEG 2023 set aggressive volumes:
onshore wind auctions ~**12.84 GW for 2023**, then **10 GW/yr 2024–2028**; solar
auctions ramping to ~1.1 GW/yr; offshore targeted to **≥30 GW by 2030** (sources:
https://www.cleanenergywire.org/factsheets/germanys-2022-renewables-and-energy-reforms,
https://www.gleisslutz.com/en/Germanys_Easter_Package.html).

**The phase-outs:**
- **Nuclear: complete.** The last three reactors — **Isar 2, Emsland,
  Neckarwestheim 2 — shut down on 15 April 2023** (the *Atomausstieg*, decided
  in 2000/2011, delayed ~3.5 months by the 2022 gas crisis) (source:
  https://www.base.bund.de/en/nuclear-safety/nuclear-phase-out/nuclear-phase-out_content.html).
- **Coal:** legislated phase-out by **2038** (parts of the country aiming 2030);
  lignite still runs but is falling fast (lignite −8.4%, hard coal −27.6% in
  2024).

**Redispatch 2.0 (cost-based dispatch correction).** Because the *commercial*
merit order ignores grid limits, the TSOs constantly **redispatch** — paying
some plants to ramp down behind a constraint and others to ramp up ahead of it,
and curtailing wind. Since 2021 this is **Redispatch 2.0**, which pulls
renewables and smaller units into the cost-based redispatch regime. This is the
single biggest operational cost driver (see seams).

## Tariff & network charges (DUoS-equivalent)

- **Netzentgelte (network charges).** German network costs are recovered as
  **Netzentgelte** — regulated transmission + distribution use-of-system charges
  approved by BNetzA. This is the direct DUoS/TUoS analogue.
- **§19 StromNEV special-customer discounts.** Very large, flat-profile
  industrial consumers can get heavily **reduced or near-zero network charges**
  under §19 of the network-charges ordinance — a long-running source of
  cross-subsidy controversy.
- **The EEG-Umlage (now abolished).** For ~20 years renewables support was paid
  via a per-kWh surcharge on bills, the **EEG-Umlage** (peaked at **6.5 ¢/kWh in
  2021**). It was cut to zero on **1 July 2022** and legally abolished, now
  funded from the **federal budget** (the Climate & Transformation Fund / ETS
  revenue) instead of the bill (source:
  https://www.cleanenergywire.org/news/germany-stops-landmark-mechanism-funded-renewables-expansion-power-bills).
  A clean example of a levy moving *off* the bill onto general taxation.
- **Regional grid-fee disparity.** Network charges vary sharply by region — the
  windy north (50Hertz/TenneT zones) historically paid *higher* grid fees
  because that's where the costly renewables/grid build sits, an inequity reform
  is now trying to smooth.

## Retail vs network split

**Full retail competition.** Since 1998 liberalisation, every German consumer
can choose their electricity supplier freely; there are hundreds of suppliers
(Stadtwerke, the big four, and discounters). The **wires (DSO) are a regulated
monopoly** (Netzentgelte); the **commodity is competitive**. The bill is
explicitly unbundled into supply + network + taxes/levies.

## Renewables support

- **EEG auctions + market premium** (above) — the core mechanism.
- **Target: ≥80% renewables in gross electricity consumption by 2030** (EEG
  2023), with PV to 215 GW and offshore wind ≥30 GW by 2030 (source:
  https://www.cleanenergywire.org/news/germanys-aim-80-percent-renewables-electricity-2030-well-within-reach-minister).
- Already at **~62.7% of net public generation / ~56% of load in 2024** (source:
  https://www.ise.fraunhofer.de/en/press-media/press-releases/2025/public-electricity-generation-2024-renewable-energies-cover-more-than-60-percent-of-german-electricity-consumption-for-the-first-time.html).

## Distinctive seams worth modelling (the key section)

These are what make Germany *feel* different from GB. Each maps to a game lever.

1. **Negative wholesale prices → invert the market-shape floor.** When wind +
   solar flood a low-demand period, the merit-order clearing price goes
   **negative** — generators *pay* to keep producing (must-run plants, EEG
   subsidy structures, ramp costs). Germany sees hundreds of negative-price
   hours a year and the count is rising. **Game lever:** the market shape needs
   a **floor that can dip below zero** on high-renewable / low-demand ticks —
   so the operator can be *paid to consume* (charge storage, attract flexible
   load) and curtailed generators face negative revenue. This is the signature
   Energiewende mechanic and the opposite of a scarcity kicker.

2. **North–south bottleneck + redispatch → the core operational cost sink.**
   Wind is generated in the north; heavy industry + demand sit in the south; the
   wires between them are inadequate. Germany spent **~€3.1bn on redispatch in
   2023** (down from €4.2bn in 2022), and **~19 TWh (~4% of generation) of wind
   was curtailed** because the grid couldn't move it south (source:
   https://www.cleanenergywire.org/news/curtailing-renewable-power-increases-germany-2023-re-dispatch-costs-recede).
   The fix is the **SuedLink HVDC "superhighway"** — a ~700 km, 525 kV,
   **~€10bn** underground DC line from Schleswig-Holstein to Baden-Württemberg,
   due ~2028 (source:
   https://www.cleanenergywire.org/news/germany-starts-construction-north-south-power-line-pivotal-energy-transition).
   **Game lever:** model a **north (cheap, windy, surplus) vs south (expensive,
   demand, deficit) split** with a constrained interconnector; every tick the
   constraint binds, the operator pays **redispatch/curtailment compensation**
   into the network pot and bleeds **firm-curtailment MWh** (a regulator KPI).
   Building the HVDC line is a huge multi-year capex that *collapses* the cost —
   a flagship reinforcement project. This is arguably the most ElectriCity-
   native real mechanic of any country here.

3. **Nuclear phase-out → carbon up-then-down dynamic.** Closing the last
   reactors (Apr 2023) removed ~30 TWh/yr of zero-carbon baseload, *raising*
   carbon intensity in the short run (more coal/gas to fill the gap) before the
   renewables build pulls it back down (363 g in 2024 vs 433 g in 2022). **Game
   lever:** a scripted "nuclear exit" event that deletes clean baseload — carbon
   KPI spikes, then the player must out-build it with renewables + flex. A
   genuine strategic dilemma (clean-but-closing vs dirty-but-firm).

4. **Very high household taxes/levies on the bill → bill-composition flavour.**
   German households pay among the **highest retail prices in Europe (~39 ¢/kWh,
   2024–25)** — but a large slice is **tax, VAT, and levies**, not wires or
   commodity (source:
   https://www.cleanenergywire.org/factsheets/what-german-households-pay-electricity).
   **Game lever:** make the **bill breakdown** show a big **tax/levy wedge** the
   operator *can't control* — so satisfaction/affordability KPIs are dragged by
   a fixed government cost, and "your bill is high but most of it isn't us" becomes a
   real narrative tension. (Contrast with GB where network + policy costs are a
   bigger operator-attributable share.)

5. **Regional grid-fee disparity → locational network charge.** Unlike GB's
   relatively smoothed charges, German Netzentgelte vary a lot by DSO/region —
   the renewable-rich north paid more. **Game lever:** allow **per-zone network
   charges** that reflect local reinforcement cost, with a politically-charged
   "equalisation" reform the operator/regulator can toggle.

6. **50 Hz, 230/400 V.** Same frequency as GB (**50 Hz**), 230 V single /
   400 V three-phase — cosmetically European.

## Numbers & sources

- **Grid carbon intensity:** ~**363 gCO₂/kWh in 2024** (down from 433 in 2022;
  the lowest ever, as coal fell) (source:
  https://www.ise.fraunhofer.de/en/press-media/press-releases/2025/public-electricity-generation-2024-renewable-energies-cover-more-than-60-percent-of-german-electricity-consumption-for-the-first-time.html).
- **Renewables share (2024):** **62.7%** of net public generation / **~56%** of
  load (target ≥80% by 2030). Wind ~33% of net public generation (~136 TWh),
  solar a record ~72 TWh (same source).
- **Nuclear:** **0% since 15 April 2023.**
- **Redispatch cost:** **~€3.1bn (2023)**; wind curtailment **~19 TWh (~4%)**.
- **SuedLink:** ~700 km, 525 kV HVDC, **~€10bn**, ~2028.
- **Frequency:** **50 Hz**.
- **Typical residential price:** **~39 ¢/kWh (2024 H2 / 2025)** — among the
  highest in Europe; large tax/levy component (sources:
  https://www.cleanenergywire.org/factsheets/what-german-households-pay-electricity,
  https://www.globalpetrolprices.com/electricity_prices/).
- **DSO count:** **~880** (approximate — flag).

## Suggested profile values

- **nominalHz:** `50`
- **peakSeason:** **winter** (heating + low solar; German demand peaks in the
  dark cold months, and the supply *crunch* is the winter "Dunkelflaute" — a
  windless, sunless cold spell).
- **generation ownership:** **`tender`** (EEG auctions + merchant merit-order;
  legally unbundled — TSOs cannot own generation). Capex rides the EEG
  auction premium / PPA on the energy line, exactly the game's tender model.
- **regulator model:** **`riio`-like incentive** (Anreizregulierung — revenue
  cap + efficiency X-factor; the closest peer to GB here). Lean KPI weights hard
  toward **carbon g/kWh** (Energiewende is the explicit national goal) and
  **firm-curtailment MWh** (the redispatch problem); keep **avg bill** prominent
  (high household prices are politically hot).
- **market shape (qualitative):**
  - a **floor that can go negative** on high-wind/solar low-demand ticks (the
    signature mechanic),
  - **evening peak** (heating/lighting in winter),
  - **midday solar duck-curve dip** (large PV fleet),
  - **seasonal uplift in winter** (Dunkelflaute scarcity),
  - **modest scarcity kicker** (interconnected to Europe, so less extreme than
    ERCOT — imports cushion shortfalls),
  - grid carbon ~**363 g/kWh** and *falling*.
- **special mechanics:**
  - **North–south constraint + redispatch/curtailment compensation**, with the
    **SuedLink HVDC** as a flagship reinforcement that collapses the cost (the
    headline Germany mechanic).
  - **Nuclear-exit event** removing clean baseload (carbon spike → rebuild).
  - **Negative-price / paid-to-consume** flexibility play.
  - **Big tax/levy wedge** in the bill breakdown the operator can't control.
  - **Per-zone network charges** (regional Netzentgelte disparity) + an
    equalisation toggle.
