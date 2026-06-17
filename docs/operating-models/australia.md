# Operating model — Australia 🇦🇺  (Sydney)

> **Near-term target.** `AUSTRALIA_MARKET` + `AUSTRALIA_REGULATOR` already exist
> in code but are **not wired to the `sydney` scenario** (Sydney resolves to
> `LONDON_PROFILE` today). This is the most *visually/mechanically* distinctive
> near-term country: the **rooftop-solar duck curve** flips the whole daily
> price shape and the season.

---

## One-line identity

The world's **rooftop-solar laboratory**: so much distributed PV that the
**midday wholesale price routinely goes negative**, minimum demand is the new
operating problem (not peak), and the system is **summer-peaking** (air-con +
bushfire season) — the inverse of GB.

---

## Transmission vs distribution

Australia's east-coast grid is the **National Electricity Market (NEM)** — one
of the longest interconnected AC systems on Earth (Queensland → South Australia
→ Tasmania), plus the separate **WEM** in Western Australia and the NT.

- **Market + system operator — AEMO (Australian Energy Market Operator).** Runs
  the NEM (and WEM): the energy market, dispatch (5-minute settlement since
  2021), and system planning (the **Integrated System Plan**, the ISP). AEMO is
  the closest thing to an ISO/ESO.
- **Transmission.** State-based **TNSPs** (Transmission Network Service
  Providers): TransGrid (NSW), AusNet (Vic), Powerlink (Qld), ElectraNet (SA),
  TasNetworks. They own the high-voltage backbone; new interconnectors
  (EnergyConnect NSW–SA, Marinus Link to Tasmania) are major ISP projects.
- **Distribution.** State-based **DNSPs** (Distribution Network Service
  Providers): in NSW (Sydney) **Ausgrid**, Endeavour Energy, Essential Energy;
  in Victoria five private DNSPs; etc. Mostly privatised in NSW/Vic,
  government-owned in Qld/Tas. **This is the player's seat in Sydney = Ausgrid.**
- **Generation** is competitive merchant — the "gentailers" (AGL, Origin,
  EnergyAustralia) + a flood of independent solar/wind/battery developers + the
  4M+ rooftop-PV households.

**Mapping to the player:** liberalised, unbundled — like GB, keep
`ownership: 'tender'`. The difference is the *shape* of what flows, not the
ownership.

---

## Regulator

**AER (Australian Energy Regulator)** sets network revenue under the **National
Electricity Rules** using a **building-block / revenue-cap (or revenue
determination)** model — closer to RIIO than to pure cost-of-service:

- 5-year **regulatory determinations** per network, building up allowed revenue
  from a regulated **RAB return + opex + depreciation**, with **incentive
  schemes** bolted on (STPIS for reliability, EBSS for opex efficiency, the
  Capital Expenditure Sharing Scheme, a Demand Management Incentive Scheme). →
  game `model: 'riio'` is a fair fit.
- **Affordability is the live political wire** (the "cost-of-living crisis" and
  the **Default Market Offer / DMO** retail price benchmark that AER sets each
  year). And because of the rooftop-PV flood, **hosting capacity / minimum-demand
  management / firm-renewable curtailment** matter far more than raw interruption
  counts. The shipped `AUSTRALIA_REGULATOR` weights bill 0.28, carbon 0.18,
  **curtailedFirm 0.16**, satisfaction 0.18, CI 0.10, CML 0.10.
- The **AEMC** writes the rules; the **ESB** did the post-2025 market design.
  (Detail; the game only needs the AER determination layer.)

---

## How generation is procured

A merchant energy-only market under transition, with heavy government
underwriting:

- **Wholesale — NEM spot.** 5-minute dispatch, a **market price cap (~A$16,600/MWh
  in 2024-25)** and a **floor of −A$1,000/MWh** (yes, negative). Prices swing
  violently: deep negative at midday (PV flood), violent spikes on a hot
  windless evening when thermal must run.
- **No central capacity market** historically (energy-only, like ERCOT), but the
  **Capacity Investment Scheme (CIS)** now runs national **reverse auctions**
  underwriting new renewables + storage with a "cap-and-floor" revenue contract —
  a tender mechanism the game can model directly.
- **PPAs** — corporate + state-government PPAs underpin most large solar/wind.
- **Coal retirement** is the defining transition: ageing coal stations
  (Liddell closed 2023, Eraring slated then extended) leaving as storage +
  renewables enter → reliability-gap anxiety.

**Net:** keep the developer tender, but the *bids* skew solar + battery, the
market they bid into has a **deep midday trough**, and the stress is the hot
evening, not the cold morning.

---

## Tariff & network-charge structure

- **Network pot.** DNSP/TNSP **network charges** (use-of-system), set by the AER
  determination. Australia is moving to **two-way tariffs** including the
  controversial **"sun tax" / export charges** (charging rooftop PV to export at
  congested midday) and cost-reflective **time-of-use + demand tariffs** — a
  uniquely live network-charge reform driven by the PV flood.
- **Energy pot.** Wholesale + environmental scheme costs + retail margin; the
  **DMO/VDO** caps the standing-offer retail price.
- Currency **A$ / AUD** (`toGbp ≈ 0.52`). 50 Hz.

---

## Retail vs network split

Fully contestable retail in the eastern states (AGL, Origin, EnergyAustralia +
many small retailers), the **DMO** as a price-cap backstop. Player is the
*network*; retail = energy-pot uplift.

---

## Renewables support schemes

- **Large-scale Renewable Energy Target (LRET)** — LGCs (winding down to 2030).
- **Small-scale Renewable Energy Scheme (SRES)** — STCs subsidising the *rooftop
  PV* that creates the duck curve.
- **Capacity Investment Scheme** reverse auctions (the new national workhorse).
- **State schemes** — NSW Renewable Energy Zones (REZs), Victorian/Queensland
  targets, battery rebates.
- The PV uptake is **policy + cheap panels + high retail prices + lots of sun +
  detached roofs** — a perfect storm that GB does not have.

---

## Distinctive seams (what makes Australia feel different from GB)

| Seam | What it is | Game lever |
|---|---|---|
| **The duck curve / negative midday prices** | 22 GW+ rooftop PV (25% of capacity) floods the grid at noon; **23.1% of Q4-2024 intervals were negative-priced** (SA hit **38%**). Midday is cheap-to-negative, evening is dear. | `market.middayDipMWh` LARGE (115) → noon price goes negative — `AUSTRALIA_MARKET` already does this |
| **Summer-peaking — season flips** | Peak is the hot **summer** afternoon/evening (air-con), not GB winter. Minimum demand is a *winter/spring midday* problem. | `weather.peakSeason: 'summer'` (peakDoy ~ Jan, ~15 in SH summer or ~227-equivalent — Sydney summer is Dec-Feb) |
| **Minimum demand is the new operating limit** | Operational demand hit **−209 MW in SA (Oct 2024)** — system security at *low* load (too little synchronous generation, voltage rise, PV trip risk). | a **min-demand / over-voltage** event class; reward firm-renewable curtailment headroom |
| **Firm-renewable curtailment matters most** | With PV flooding the grid, hosting capacity + curtailing firm solar is the live cost, weighed heavily by the AER. | `regulator.kpiWeights.curtailedFirm: 0.16` (`AUSTRALIA_REGULATOR`) |
| **Violent heatwave price spikes** | A hot, windless, high-air-con evening with thermal scarcity → price toward the A$16.6k cap. | `scarcityRegime: 'heatwave'`, `scarcityKickMWh: 160` (`AUSTRALIA_MARKET`) |
| **Bushfire fault season** | Summer bushfires + extreme heat are the reliability disaster (vs GB winter storms). Network de-energisation, conductor clashing, transformer derate. | a **bushfire/heat** incident season in the weather profile (heatwave regime) |
| **Coal→battery transition / reliability gap** | Ageing coal exiting faster than firm replacement; the ISP's REZs + storage build. | tender bids skew solar/battery; coal plant retiring as an event |
| **Two-way "sun tax" network charges** | Export tariffs / cost-reflective tariffs to manage the PV flood — a real DUoS-side reform. | optional network-charge flavour on the bill |
| **Coal-heavy carbon (still, today)** | Despite the PV, the marginal/firm plant is brown+black coal → high grid carbon. | `gridCarbonG: 445` (`AUSTRALIA_MARKET`) |

---

## Numbers & sources (Australia)

- **Frequency:** 50 Hz. The NEM is a single long AC system (Qld–SA) + HVDC to
  Tasmania (Basslink) and SA (Murraylink/Heywood).
- **Rooftop PV:** **>4 million households, >22 GW, ~25% of all NEM generation
  capacity** (Dec 2024). *(source: AEMO Q4-2024.)*
- **Negative prices:** **23.1% of intervals in Q4-2024** (up from 19.9%);
  **South Australia 38%** — a regional record. *(source: AEMO Q4-2024.)*
- **Minimum demand:** SA operational demand **−209 MW (19 Oct 2024)**; NSW min
  3,265 MW, Qld 2,790 MW Q3 records. SA projected ~39% PV-to-consumption by 2034.
  *(source: AEMO; SA Electricity Report 2024.)*
- **Price bounds:** market price cap ~**A$16,600/MWh**, floor **−A$1,000/MWh**
  (2024-25). *(source: AER State of the Energy Market 2025.)*
- **Grid carbon intensity:** ~**~500-600 gCO₂/kWh** NEM average and falling
  (coal-heavy); game uses **445 g** as a forward-looking figure. *(source: AEMO
  / Ember; verify the year — historically higher.)*

Sources:
[AEMO Q4-2024 media release](https://www.aemo.com.au/newsroom/media-release/national-electricity-market-hits-new-demand-and-renewable-energy-records-in-december-quarter) ·
[AER State of the Energy Market 2025](https://www.aer.gov.au/system/files/2025-08/State%20of%20the%20energy%20market%202025%20-%20Full%20report_0.pdf) ·
[AEMO SA Electricity Report 2024](https://www.aemo.com.au/-/media/files/electricity/nem/planning_and_forecasting/sa_advisory/2024/2024-south-australian-electricity-report---combined.pdf) ·
[Ember](https://ember-energy.org/).

---

## Suggested profile values

```ts
// powerProfile.ts — AUSTRALIA_MARKET / AUSTRALIA_REGULATOR shipped;
// add power/weather/generation/economy and wire to the sydney scenario.
power:       { nominalHz: 50, freqFloorHz: 47.5, droopHz: 1.5,
               transmissionKv: [500, 330, 132], distributionKv: [66, 11, 0.4] }
weather:     peakSeason 'summer' (Sydney summer Dec-Feb), hot-dry heatwave
             regime prominent, bushfire/heat as the disaster season
generation:  { ownership: 'tender' }   // merchant; bids skew solar/battery
regulator:   AUSTRALIA_REGULATOR  (AER, riio, bill 0.28 / curtailedFirm 0.16)
market:      AUSTRALIA_MARKET  (floor 42, peak 120, MIDDAY DIP 115 → negative,
             seasonalUplift 0.35, scarcity heatwave +160, carbon 445 g)
economy:     { symbol: 'A$', iso: 'AUD', toGbp: 0.52, networkShare ~0.4,
               energyShare ~0.4, retailUplift ~2.8, supplyFixedYr ~AUD }
```

**First seam to wire (highest contrast):** the **summer peak + midday duck
curve** — flip `peakSeason` to summer and turn on the deep `middayDipMWh`. That
single change makes Sydney *feel* unmistakably Australian (cheap sunny middays,
dear hot evenings, the battery-arbitrage logic inverts).
