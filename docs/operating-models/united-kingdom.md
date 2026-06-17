# Operating model — United Kingdom (Great Britain)

> **This is the BASELINE.** Everything the game already does — the RIIO report
> card, the DUoS/energy bill split, the developer tender market, the
> evening-peak Atlantic wholesale shape, 50 Hz, winter-peaking weather — is
> the GB model. Every other country doc describes *deltas from this*. In the
> code this is `LONDON_PROFILE` in `src/sim/powerProfile.ts`, and every other
> profile is a partial override of it.

---

## One-line identity

A fully **unbundled, liberalised** electricity industry where the network is a
**regulated monopoly on incentive (RIIO) price controls** and generation is a
**competitive merchant + auction market** — the operator never owns a power
station, it *signals* where one should go and a developer builds it.

---

## Transmission vs distribution

GB deliberately separates every layer of the industry (the 1990 privatisation /
unbundling), which is exactly why the game's "you are the wires, not the power"
framing works.

- **Transmission (the ESO / TSO layer).** The **National Energy System Operator
  (NESO)** — publicly owned since October 2024, formerly National Grid ESO —
  runs whole-system balancing, the Balancing Mechanism and network planning. The
  **transmission asset owners (TOs)** own the 400 kV / 275 kV wires (and 132 kV
  in Scotland): **National Grid Electricity Transmission** in England & Wales,
  **SP Transmission** and **SSEN Transmission** in Scotland.
- **Distribution (the DNO layer).** Fourteen licensed **Distribution Network
  Operators**, run by six groups (UK Power Networks, National Grid Electricity
  Distribution, SSEN Distribution, Northern Powergrid, Electricity North West,
  SP Energy Networks). London + the home counties = **UK Power Networks** (the
  game's home turf). DNOs are transitioning to **DSOs** (active network
  management, flexibility procurement). Below them sit **iDNOs** (independent
  DNOs adopting new-development networks — already modelled in-game as "the
  iDNO's iron, not yours").
- **Generation** is owned by nobody in the network family — it is the merchant
  market (see procurement).

The player in GB is a **DNO/DSO with ESO reach** — a deliberate hybrid so one
seat touches 400 kV down to the LV pole-can.

---

## Regulator

**Ofgem**, on the **RIIO** framework (*Revenue = Incentives + Innovation +
Outputs*). This is the single most important thing the game models:

- Revenue is set for a **price-control period** (RIIO-ED2 for distribution runs
  2023–2028; the game uses a **5-year period**). The operator can spend what it
  likes on the right outputs — *capital is unlimited* — but every pound is
  recovered from customers and the regulator grades performance at period end.
- It is **incentive** regulation, not pure cost-of-service: beat your targets on
  reliability, connections, environment and you keep a share; miss them and you
  are penalised. This is the `model: 'riio'` branch and the **report card** with
  composite grade A–E.
- KPI weighting in-game (`BASE_WEIGHTS`): bill 0.25, satisfaction 0.20, CI 0.15,
  CML 0.15, carbon 0.15, firm curtailment 0.10. Reliability is measured the GB
  way as **CI** (Customer Interruptions /100 customers/yr) and **CML**
  (Customer Minutes Lost /customer/yr) — the IIS interruptions incentive.
- Developer complaints to the regulator dent the rating (modelled: a
  conglomerate whose mood breaks "lodges a complaint with Ofgem").

---

## How generation is procured

GB is the cleanest example of the **`ownership: 'tender'`** model in the game.
The network operator does **not** build plant:

- **Wholesale market.** A self-dispatch energy-only market — bilateral trading +
  the day-ahead/intraday exchanges (EPEX/Nord Pool) settling toward a single GB
  price, then **NESO's Balancing Mechanism** trues it up in real time. Marginal
  plant (historically CCGT gas) usually sets the price → the evening-peak shape.
- **Contracts for Difference (CfD).** The main low-carbon support: sealed-bid
  **allocation rounds** where developers bid a **strike price (£/MWh)**; the
  government tops up (or claws back) the difference vs the market reference. The
  game's **quarterly allocation rounds** and **sealed bids with a PPA strike**
  are modelled directly on CfD allocation rounds.
- **Capacity Market.** Annual T-4 / T-1 auctions pay £/kW/yr for firm capacity
  to be available — security-of-supply insurance on top of the energy market.
- **Connections.** A developer wanting to connect applies to the DNO/ESO, which
  does a **connection study** and **offer** (the game's "study first, promise
  second" inbox). The infamous **connections queue** / TMO4+ reform is the live
  GB pain point.

Generation capex is **private money** → in the bill it rides the **PPA strike on
the energy line**, never DUoS (`computeBill`'s `'tender'` branch).

---

## Tariff & network-charge structure (the DUoS model)

The bill is the game's budget, split exactly as GB splits it:

- **Network pot (DUoS + TUoS).** Use-of-System charges recover the regulated
  network's allowed revenue: **DUoS** (distribution) + **TUoS** (transmission) +
  BSUoS (balancing). Wires, substations, depots, vans, vegetation, network
  losses → all network spend. Domestic users carry ~**one third** of network
  revenue (industry/commerce pay the rest): `domesticNetworkShare: 0.32`.
- **Energy pot.** Wholesale energy + policy costs + supplier margin. Retail lands
  at ~**3×** wholesale once policy/balancing/metering/supplier slice pile on:
  `retailUplift: 3.0`; domestic share of volume `domesticEnergyShare: 0.4`.
- **Standing charge.** A fixed supplier charge per household: `supplyFixedYr: 150`.
- Currency **£ / GBP**, `toGbp: 1` (the leaderboard normalises everyone to GBP).

A mature GB network prices out near **~£100/yr of DUoS** and ~£3k/yr all-in for a
fully electrified (EV + heat-pump) home — the calibration the bill targets.

---

## Retail vs network split

Fully unbundled: **competitive retail** (dozens of suppliers, switching, a price
cap on default tariffs) sits in front of the **regulated monopoly network**. The
player is the *network*; the supplier/retail layer is abstracted into the energy
pot's retail uplift. The game does not let the player run a retailer — correct
for GB, where that is a separate licensed business.

---

## Renewables support schemes

- **CfD** (the workhorse, see procurement) — 15-year strike contracts via
  allocation rounds.
- **Capacity Market** for firm capacity.
- Legacy **Renewables Obligation** (ROCs) and **Feed-in Tariffs** (closed to new
  entry) still on older plant.
- **REGO** certificates for green-tariff backing.
- Net Zero by **2050**; a target of a **clean-power grid by 2030** drives the
  connection-queue and reinforcement pressure.

---

## Distinctive seams (the GB *feel*)

Because GB is the baseline, these are the levers every other country is measured
against — they are all **on** in `LONDON_PROFILE`:

| Seam | Game lever | GB value |
|---|---|---|
| Incentive price control with a graded report card | `regulator.model = 'riio'`, `BASE_WEIGHTS` | the default |
| Competitive developer tender market (no owned plant) | `generation.ownership = 'tender'` | the default |
| Sealed-bid quarterly allocation rounds (CfD) | `stepTenders` + allocation rounds | the default |
| Evening-peak Atlantic wholesale, winter-dear | `market` 45 + 95·peak, seasonalUplift 0.3 | `LONDON_MARKET` |
| Dunkelflaute scarcity (calm + cold = low wind, high demand) | `scarcityRegime: 'calm-cold'`, +60/MWh | `LONDON_MARKET` |
| Winter-peaking temperate weather, weak winter sun | `weather.peakSeason: 'winter'`, peakDoy 15 | `LONDON_WEATHER` |
| 50 Hz, 400/275/132 → 33/11/0.4 kV | `power` | `LONDON_POWER` |
| Constraint payments for curtailing firm renewables | `CONSTRAINT_COMP_K` + developer curtail prices | the default |
| Flexibility markets (DSO procures demand turn-down) | `FLEX_PRICE_K`, flex shave | the default |
| Conglomerate developers complain to the regulator | `bumpMood` → `period.complaints` | the default |
| Grid carbon falling (wind + interconnectors) | `market.gridCarbonG: 230` | `LONDON_MARKET` |

---

## Numbers & sources (GB)

- **Frequency:** 50 Hz; statutory ±1%, operational target ±0.2 Hz; LFDD last
  stage ~47.0 Hz (game floors at 47.5).
- **Grid carbon intensity:** ~**130–230 gCO₂/kWh** annual average and falling
  (2023 ≈ 162 g; very low on windy days, higher in dunkelflaute). Game uses 230
  as the conservative import/benchmark figure. *(source: National Grid ESO /
  Ember; verify the exact year you quote.)*
- **Generation mix (2023):** gas ~32%, wind ~29%, nuclear ~13%, solar ~5%,
  biomass ~5%, imports ~11%. *(source: DESNZ DUKES / Ember.)*
- **Typical bill:** the game calibrates to ~£3k/yr for a fully electrified home;
  real GB average domestic electricity bill ~£900/yr (non-electrified) under the
  price cap — the game's figure assumes heat-pump + EV electrification.

Sources: [Ofgem RIIO-ED2](https://www.ofgem.gov.uk/), [NESO](https://www.neso.energy/),
[Ember Climate](https://ember-energy.org/), DESNZ DUKES.

---

## Suggested profile values (already shipped — this IS the default)

- `power.nominalHz`: **50**; tiers 400/275/132 → 33/11/0.4 kV.
- `weather.peakSeason`: **winter** (peakDoy 15).
- `generation.ownership`: **tender** (liberalised — no owned plant).
- `regulator`: **Ofgem**, model **riio**, `BASE_WEIGHTS`.
- `market`: floor 45, peak 95, no midday dip, seasonalUplift 0.3, scarcity
  `calm-cold` +60, carbon 230 g.
- `economy`: £/GBP, networkShare 0.32, energyShare 0.4, retailUplift 3.0,
  standing 150.

This is the reference; do not change it (changing it breaks London byte-stability
and every golden test).
