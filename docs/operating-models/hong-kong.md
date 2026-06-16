# Operating model — Hong Kong 🇭🇰  (Victoria Harbour)

> **Near-term target, and the single biggest STRUCTURAL fork in the game.**
> `HONGKONG_MARKET` + `HONGKONG_REGULATOR` exist in code; the bill engine
> already has the dormant **`ownership: 'owned'`** branch documented for HK.
> Hong Kong is where the player stops being a pure wires-only DNO and becomes a
> **vertically integrated utility that builds its own plant** — there is no
> developer tender at all.

---

## One-line identity

A **vertically integrated regulated duopoly** with **no wholesale market and no
generation tender** — each utility owns generation + transmission + distribution
+ retail in its own franchise area and earns a **guaranteed 8% rate-of-return on
its assets** under the **Scheme of Control**, so *capex literally earns profit*
and the player optimises asset-build, not merit-order auctions.

---

## Transmission vs distribution

There is no separation — that is the whole point:

- **Two vertically integrated utilities, geographically split:**
  - **CLP Power Hong Kong** — supplies **Kowloon, the New Territories, and most
    outlying islands** (~80% of customers). Part of CLP Holdings.
  - **The Hongkong Electric Company (HK Electric / HKE)** — supplies **Hong Kong
    Island and Lamma Island**. Generation at Lamma Power Station.
- Each owns **its own generation, transmission, distribution and customer
  supply** within its area. They are interconnected (a CLP–HKE tie line) but do
  **not** compete — it is a **regulated duopoly**, not a market.
- There is **no independent system operator, no wholesale spot market, no
  unbundling.** The utility dispatches its own plant to meet its own load.

**Mapping to the player:** Hong Kong = **`ownership: 'owned'`**. The player *is*
the integrated utility. They build power stations directly; there are **no
developers, no bids, no PPA strike**. Generation capex annuitises into the
**network pot** with the wires (exactly the dormant branch in `computeBill`).

---

## Regulator

The **Scheme of Control Agreements (SCAs)** between the HKSAR Government and each
utility — administered by the **Environment and Ecology Bureau** with an
**Environment Bureau / advisory Energy Advisory Committee** reviewing. This is
classic **rate-of-return (profit-cap) regulation**:

- Each utility earns a **Permitted Return of 8% of its Average Net Fixed Assets**
  (the regulated asset base). The current SCAs run **October 2018 → March 2033**;
  the previous scheme allowed 9.99%, so the 2018 SCA *cut* the return to 8% to
  ease tariffs. *(source: HK Electric Corporate Information 2023/24, 2024/25.)*
- **The defining incentive:** because return is a % of **assets**, the utility is
  rewarded for **building more capital** (the classic Averch-Johnson "gold
  plating" incentive). Returns **above** the permitted level must be returned to
  customers / offset in future tariffs (the Tariff Stabilisation Fund). → game
  `model: 'profit-cap'`.
- Bolted-on **performance-based incentives/penalties** for operational
  performance, **supply reliability, renewable-energy development and customer
  service** adjust the permitted return up/down. Reliability is the headline the
  SoC is judged on (see seams).
- HK regulation cares about **reliability above all** (world-best, see numbers),
  then service + tariffs; carbon and curtailment matter least. The shipped
  `HONGKONG_REGULATOR` weights **CI 0.26, CML 0.26**, satisfaction 0.20, bill
  0.14, carbon 0.09, curtailedFirm 0.05.

---

## How generation is procured

It **isn't** — there is no tender:

- The utility **builds and owns** its generation (CLP's Black Point + Castle
  Peak; HKE's Lamma). New plant (the gas units replacing coal, the offshore-LNG
  terminal, a little local solar/RE) is **utility capex**, approved through the
  SCA development plan, not auctioned to developers.
- **Fuel** is overwhelmingly imported — **gas (now majority), coal (declining),
  and nuclear imported from Daya Bay** in mainland China (CLP buys ~70% of the
  Guangdong Daya Bay nuclear station's output under long contract — a big clean
  baseload import).
- So the in-game "market price" is really the utility's **regulated fuel +
  generation cost pass-through**, not a competitive wholesale price: **stable,
  high, gas-indexed**, with a modest summer-aircon swing. `HONGKONG_MARKET`:
  floor 72 (high), peak +42, low volatility.

**Net:** disable the developer/tender/allocation-round machinery for HK; the
player builds plant directly and its capex earns the 8% return + lands on the
network pot.

---

## Tariff & network-charge structure

- **No DUoS/energy split** in the GB sense — it is a **bundled tariff**. The
  household pays a single utility tariff covering generation + network + retail,
  set through the SCA: a **Basic Tariff** + a **Fuel Cost Adjustment (Fuel Clause
  Recovery Account)** that passes fuel-price swings through + the **Tariff
  Stabilisation Fund** smoothing.
- In game terms: the whole bill is effectively one pot (the "network pot" with
  owned generation folded in). The **energy pot's PPA top-up is zero** (no PPA);
  fuel cost is a pass-through line.
- Currency **HK$ / HKD** (`toGbp ≈ 0.10`). 50 Hz.

---

## Retail vs network split

**None** — each utility is the monopoly retailer in its area. There is **no
retail competition** (a long-running policy debate, but the franchises persist).
The player owns the customer relationship end-to-end → satisfaction is directly
the utility's, not a separate supplier's.

---

## Renewables support schemes

- A **Feed-in Tariff (FiT)** for distributed rooftop solar/wind (introduced under
  the 2018 SCA) — the utility pays households a premium and recovers it; plus
  **Renewable Energy Certificates**.
- Utility-scale RE is tiny (Hong Kong is dense + land-scarce); the
  decarbonisation lever is **fuel-switching coal→gas + the Daya Bay nuclear
  import + a planned offshore wind farm**. Carbon-neutrality target ~2050.
- The SCA gives the utilities **incentives to develop RE** (a bump to permitted
  return), which is why RE shows up as utility capex, not a developer market.

---

## Distinctive seams (what makes Hong Kong feel different from GB)

| Seam | What it is | Game lever |
|---|---|---|
| **Vertical integration — you build the plant** | No developers, no tender, no PPA. The player owns generation; capex lands in the network pot. **The single biggest fork.** | `generation.ownership = 'owned'` → `computeBill` owned branch; disable `stepTenders`/allocation rounds for the scenario |
| **Capex EARNS profit (rate-of-return)** | 8% permitted return on **net fixed assets** → building more iron is *rewarded*, the opposite of GB's "every pound is a cost on the bill". Scoring/incentives invert. | `regulator.model = 'profit-cap'`; report-card framing rewards prudent RAB build, penalises returns above cap |
| **Reliability is everything** | HK targets/achieves **>99.999% supply reliability** — among the best on Earth (≈ a couple of minutes lost/customer/yr, vs GB's tens). The SoC headline. | `regulator.kpiWeights` CI 0.26 / CML 0.26 (`HONGKONG_REGULATOR`); tighter reliability *targets* in `initialTargets` for HK |
| **Near-all-underground network** | Dense vertical city → cables underground, transformer rooms in tower podiums; very few overhead faults, but expensive to build/repair. | bias the map/build toward underground; fewer weather faults, higher capex |
| **Typhoon season** | The disaster is the **summer typhoon** (storm surge, wind, flooding) — distinct from GB winter storms. | a **typhoon** incident class in the weather profile (storm regime, summer) |
| **Summer-peaking (air-con)** | Hot humid subtropical summer; peak is the summer aircon afternoon. | `weather.peakSeason: 'summer'`, `scarcityRegime: 'heatwave'` |
| **Stable high gas-indexed cost** | Regulated fuel pass-through, not a competitive spot; high + flat with a small summer swing. | `HONGKONG_MARKET` floor 72, peak 42, low volatility |
| **Clean nuclear import (Daya Bay)** | ~A quarter of CLP's energy is imported Guangdong nuclear — a big clean baseload from "off-map". | an interconnector-style clean import line; lowers effective carbon vs the gas figure |
| **High gas carbon** | Local generation is ~69% gas → high grid carbon for the *local* fleet. | `gridCarbonG: 590` (`HONGKONG_MARKET`) |

---

## Numbers & sources (Hong Kong)

- **Frequency:** 50 Hz. Transmission 400/132 kV; distribution 33/11/0.38 kV.
- **Permitted return:** **8% of Average Net Fixed Assets**; SCA term **Oct 2018 →
  Mar 2033** (was 9.99% before 2018). HKE regulated asset base ~**HK$39.2 bn**
  (2024). *(source: HK Electric Corporate Information / SoC statements 2024/25.)*
- **Reliability:** both utilities target/achieve **>99.99%–99.999%** supply
  reliability — world-leading; customer-minutes-lost is a *handful* per year.
  *(source: CLP/HKE; verify the exact figure you quote.)*
- **Generation mix (HK, ~2023):** gas ~**~50-70%** and rising, coal declining,
  plus the **Daya Bay nuclear import (~a quarter of CLP's supply)**, tiny local
  RE. *(source: EMSD HK energy statistics; CLP.)*
- **Grid carbon intensity (local fleet):** high — gas+coal; game uses **590 g**.
  The imported nuclear pulls the *consumption* figure down. *(source:
  ElectricityMaps / EMSD; verify.)*

Sources:
[HK Electric Corporate Information 2024/25](https://www.hkelectric.com/documents/en/CorporateInformation/Documents/24_25_CIB_E_Full.pdf) ·
[Scheme of Control Agreement explainer](https://www.hkelectric.com/documents/en/CorporateInformation/Documents/21_22_CIB_E_2_Scheme%20of%20Control%20Agreement.pdf) ·
[CLP Power](https://www.clp.com.hk/) ·
[EMSD Hong Kong Energy End-use Data].

---

## Suggested profile values

```ts
// powerProfile.ts — HONGKONG_MARKET / HONGKONG_REGULATOR shipped;
// add power/weather/generation/economy and wire to the hongkong scenario.
power:       { nominalHz: 50, freqFloorHz: 47.5, droopHz: 1.5,
               transmissionKv: [400, 132], distributionKv: [33, 11, 0.38] }
weather:     peakSeason 'summer', subtropical, TYPHOON storm season; humid heat
generation:  { ownership: 'owned' }   // ⚠ the big fork — no tender, no PPA
regulator:   HONGKONG_REGULATOR  (Scheme of Control, profit-cap, CI/CML 0.26 each)
market:      HONGKONG_MARKET  (floor 72, peak 42, seasonalUplift 0.2,
             scarcity heatwave +45, carbon 590 g)  // regulated fuel pass-through
economy:     { symbol: 'HK$', iso: 'HKD', toGbp: 0.10, single bundled tariff
               (energyShare/networkShare collapse — gen is in the network pot) }
```

**First seam to wire (the headline):** turn on **`ownership: 'owned'`** for
Hong Kong and make the tender machinery dormant. This is the structural
showcase — the player builds plant, the bill engine already routes owned capex
correctly, and the `profit-cap` framing flips the scoring philosophy. This is
also the proving ground for Shanghai / Cairo / other vertically-integrated
cities that share the `'owned'` model.
