# Operating model — Brazil 🇧🇷  (Rio de Janeiro)

> **Near-term target.** `BRAZIL_MARKET` + `BRAZIL_REGULATOR` exist in code but
> are not yet wired to a Brazil scenario. Brazil is the **hydro + drought + 60 Hz
> + theft** flavour — the only near-term country on a different frequency, and
> the one whose wholesale price is governed by *rainfall*.

---

## One-line identity

A **hydro-dominated** system (the cleanest big grid after the nuclear ones) where
the wholesale price tracks **reservoir levels and rainfall**, the household bill
carries a visible **drought surcharge (the bandeira tarifária flags)**, and the
network operator's defining headache is **non-technical losses — electricity
theft (the "gatos")** in informal settlements. Runs at **60 Hz**.

---

## Transmission vs distribution

A liberalised, concession-based system overseen by a strong central planner:

- **System operator — ONS (Operador Nacional do Sistema Elétrico).** Operates the
  national interconnected system (the **SIN**, Sistema Interligado Nacional) —
  one of the world's largest, stitching the Amazon/north hydro to the
  southeast/south load over thousands of km of EHV lines. ONS optimises the
  **hydro-thermal dispatch** (when to spill water vs burn thermal) centrally —
  a *cost-based*, not bid-based, dispatch (Brazil's signature).
- **Market chamber — CCEE** clears the short-term/spot settlement; **EPE**
  (Empresa de Pesquisa Energética) does long-term planning; **MME** is the
  ministry.
- **Transmission** is a set of **concessions** auctioned by ANEEL (Brazilian +
  international owners: ISA CTEEP, Taesa, Eletrobras/Furnas, State Grid of China
  is a major owner). 500/440/345/230 kV plus the famous **±600/±800 kV HVDC**
  links bringing Amazon/Itaipu hydro south.
- **Distribution** is ~**50+ concession-holding DISCOMs** (Enel, Light, Neoenergia,
  CPFL, Energisa, Equatorial). **Rio de Janeiro = Light S.A.** (the player's
  seat) and Enel Rio. Concessions carry **quality obligations** (DEC/FEC, below).
- **Generation** is competitive/merchant + concessions — Eletrobras (privatised
  2022) the biggest, plus a flood of IPP hydro/wind/solar.

**Mapping to the player:** liberalised, unbundled → keep `ownership: 'tender'`.
The differences are the **hydro-driven price**, the **theft/loss mechanic**, and
**60 Hz**.

---

## Regulator

**ANEEL (Agência Nacional de Energia Elétrica).** A concession + **cost-of-service
/ revenue-requirement** regulator with periodic **tariff reviews (revisão
tarifária periódica)**:

- Sets each DISCOM's allowed revenue (a regulated **WACC × RAB + opex** review),
  with **quality penalties** for breaching the reliability indices **DEC**
  (Duração Equivalente de Interrupção — ≈ CML, outage *duration*) and **FEC**
  (Frequência Equivalente de Interrupção — ≈ CI, outage *frequency*). → game
  `model: 'cost-of-service'`, and DEC/FEC map straight onto the game's CML/CI.
- Runs the **generation + transmission auctions** (see procurement) and sets the
  **bandeira tarifária** flags (the drought surcharge, below).
- Since carbon is already low on the hydro fleet, ANEEL/politics weigh
  **reliability + affordability**. The shipped `BRAZIL_REGULATOR` weights **CI
  0.23, CML 0.23, bill 0.22**, satisfaction 0.16, carbon 0.08, curtailedFirm 0.08.

---

## How generation is procured

A distinctive **regulated-auction** model (one of the world's most developed):

- **Centralised auctions (leilões)** run by ANEEL/EPE/CCEE: **A-3 / A-5 / A-6**
  (new energy, years ahead), reserve-energy, and existing-energy auctions.
  Generators bid a price; the cheapest win **long-term PPAs (15-30 yr)** with the
  pool of DISCOMs (the **ACR / regulated contracting environment**). Large
  consumers can contract bilaterally in the **ACL / free market**. The game's
  sealed-bid PPA tender maps well — Brazil just runs it as a national
  forward-energy auction with very long contracts.
- **Cost-based, not bid-based, dispatch.** ONS dispatches by a cost model of
  water value (the "PLD/PdE" / decision tree), not generator bids — a
  technocratic feature unique among big markets. The **spot price (PLD)** is
  capped + floored by ANEEL.
- **Hydro reservoirs** are the swing: full reservoirs → cheap, clean, abundant;
  drought → thermal (gas/diesel/coal) backs up and price + carbon climb.

**Net:** keep the developer tender for wind/solar/thermal; the bids compete
against a **hydro baseload whose availability swings with rainfall** (the drought
uplift in the market profile).

---

## Tariff & network-charge structure

- **Network pot.** **TUSD** (Tarifa de Uso do Sistema de Distribuição, ≈ DUoS) +
  **TUST** (transmission, ≈ TUoS) — the use-of-system charges ANEEL sets in the
  tariff review.
- **Energy pot.** The **TE** (Tarifa de Energia) + the **bandeira tarifária**
  surcharge (below) + sectoral charges (the **CDE** subsidy fund, R&D, etc.) +
  heavy **taxes (ICMS state VAT, PIS/COFINS)** — Brazilian bills are notoriously
  tax-laden.
- **The bandeira tarifária (tariff flags)** — *the* signature Brazilian bill
  mechanic. ANEEL sets a monthly colour flag reflecting generation cost:
  **green** (cheap, full reservoirs, no surcharge), **yellow** (small surcharge),
  **red level 1**, **red level 2** (big surcharge — thermal running in drought).
  E.g. **red level 2 in Sep 2024** (first since Aug 2021, after rainfall ~50%
  below average); **green again by Jan 2026** as reservoirs recovered. This is a
  *visible drought tax on every bill* the player can't control — a brilliant
  game seam. *(source: ANEEL / Canal Solar / Brazil Energy Insight.)*
- Currency **R$ / BRL** (`toGbp ≈ 0.16`). **60 Hz** (the only near-term 60 Hz
  country, shared with the US).

---

## Retail vs network split

The **ACR (regulated)** environment serves captive small customers via the
DISCOMs; the **ACL (free)** market lets large/medium consumers choose suppliers,
and is **gradually opening to all** (the "abertura do mercado livre"). Player is
the *network/DISCOM*; retail = energy-pot uplift + the bandeira surcharge.

---

## Renewables support schemes

- **Reserve-energy + new-energy auctions** for wind + solar (Brazil's NE is a
  wind/solar superpower — record-cheap bids).
- **Net metering** (the rooftop-PV boom, "geração distribuída", recently reformed
  to phase in network charges).
- No carbon price; the renewables push is economic + the auctions, layered on a
  grid that is *already* ~clean from hydro. Wind + solar passed **one-third of
  generation** in a record month recently. *(source: Ember.)*

---

## Distinctive seams (what makes Brazil feel different from GB)

| Seam | What it is | Game lever |
|---|---|---|
| **Hydro-driven price + drought uplift** | Reservoir levels set the price: cheap+clean when full, dear when dry (thermal backs up). Hydro fell to **27 TWh in Aug 2025**, the lowest since 2021. | `market.droughtUplift` (0.6) → dry half-year multiplies the price; `generation.hydroDriven: true` wired into dispatch |
| **The bandeira tarifária (drought tax on the bill)** | A monthly green→red surcharge flag the player can't control — a visible affordability shock in drought. **Red level 2 Sep 2024.** | a **bandeira flag** on the bill HUD driven by the drought state; lands on the energy/standing line |
| **DEC/FEC reliability = CML/CI** | ANEEL penalises outage duration (DEC) + frequency (FEC) — a direct analogue of the game's CML/CI, with concession penalties. | `regulator.kpiWeights` CI/CML 0.23 each (`BRAZIL_REGULATOR`); DEC/FEC labels in the report card |
| **Non-technical losses — theft ("gatos")** | A huge slice of energy is *stolen* via illegal hookups ("gatos") in informal settlements/favelas — Light/Enel Rio lose **15-40%+ in some areas**. A loss the operator pays for but can't fully bill. | a **non-technical-loss** term: a fraction of delivered energy is unbilled (raises the loss pot, hurts the bill), reducible by capex (smart meters, network hardening) |
| **Cost-based central dispatch** | ONS dispatches by water-value cost model, not bids — a technocratic flavour. | narrative; dispatch already merit-orders by cost |
| **60 Hz** | The only near-term 60 Hz country. | `power.nominalHz: 60`, `freqFloorHz ≈ 57`, droop scaled |
| **Flooding / landslides on the morros** | Rio's disaster is **summer rain → flooding + landslides** on the hillside favelas (the morros), taking out distribution. | a **flood/landslide** incident class (summer wet season) |
| **Low carbon (hydro)** | Clean most of the time; carbon climbs only in drought thermal. | `gridCarbonG: 110` (`BRAZIL_MARKET`) — low, rising in drought |
| **Long-distance HVDC from the Amazon** | ±600/±800 kV DC bringing remote hydro thousands of km to load. | an interconnector-style clean import line from "off-map" hydro |

---

## Numbers & sources (Brazil)

- **Frequency:** **60 Hz**. Transmission 500/440/345/230 kV + ±600/±800 kV HVDC;
  distribution 138/34.5/13.8/0.38 kV.
- **Generation mix (2023-24):** hydro ~**~55-60%**, wind ~13%, solar ~6-10%
  (surging), biomass ~8%, gas/thermal the swing. Wind+solar passed **>1/3 in a
  record month** (2024-25). *(source: ONS / EPE / Ember.)*
- **Drought:** hydro generation fell to **27 TWh in Aug 2025**, lowest since Aug
  2021; **bandeira red level 2 Sep 2024** (rainfall ~50% below average), green by
  Jan 2026. *(source: Ember; Brazil Energy Insight; ANEEL/Canal Solar.)*
- **Non-technical losses:** national NTL is a multi-billion-R$ problem; in some
  Rio/Light concession areas commercial losses reach **20-40%+** — among the
  worst of any large utility. *(source: ANEEL loss reports / Light disclosures;
  verify the exact figure you quote.)*
- **Grid carbon intensity:** ~**100-150 gCO₂/kWh**, low (hydro), rising in
  drought; game uses **110 g**. *(source: ONS / ElectricityMaps.)*

Sources:
[Electricity sector in Brazil (Wikipedia)](https://en.wikipedia.org/wiki/Electricity_sector_in_Brazil) ·
[Ember — Brazil wind+solar 1/3](https://ember-energy.org/latest-insights/wind-and-solar-generate-over-a-third-of-brazils-electricity-for-the-first-month-on-record/) ·
[Brazil Energy Insight — dry-season bills](https://brazilenergyinsight.com/2024/09/02/brazilians-face-higher-power-bills-due-to-septembers-dry-season/) ·
ANEEL bandeira tarifária notices.

---

## Suggested profile values

```ts
// powerProfile.ts — BRAZIL_MARKET / BRAZIL_REGULATOR shipped;
// add power/weather/generation/economy and wire to a brazil scenario.
power:       { nominalHz: 60, freqFloorHz: 57, droopHz: 1.8,
               transmissionKv: [500, 345, 230], distributionKv: [34.5, 13.8, 0.38] }
weather:     peakSeason 'summer' (SH; Rio's wet summer = flood/landslide season),
             a DRY-season (austral winter) that drives the drought uplift
generation:  { ownership: 'tender', hydroDriven: true }   // reservoir swing
regulator:   BRAZIL_REGULATOR  (ANEEL, cost-of-service, CI/CML 0.23 each)
market:      BRAZIL_MARKET  (floor 48, peak 66, middayDip 28, seasonalUplift
             0.12, scarcity heatwave +40, droughtUplift 0.6, carbon 110 g)
economy:     { symbol: 'R$', iso: 'BRL', toGbp: 0.16, networkShare ~0.35,
               energyShare ~0.4, retailUplift ~3.0, supplyFixedYr ~BRL }
             + a NON-TECHNICAL-LOSS fraction (theft) on delivered energy
```

**First seam to wire (highest contrast):** the **drought uplift + bandeira
flag** + **60 Hz**. The market profile already carries `droughtUplift`; surfacing
the **bandeira colour on the bill** ties the abstract drought state to a concrete,
recognisable Brazilian shock. The **non-technical-loss (theft)** term is the
second, higher-effort seam and the most *novel* mechanic in the whole roster.
