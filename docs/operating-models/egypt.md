# Operating Model — Egypt

> Research doc for ElectriCity. How running the grid in a stylised **Cairo /
> Nile-Delta** Egypt should *feel* different from GB, and which game levers
> encode that. Pitched at the game's depth: voltages, tenders, regulator KPIs,
> market shape, special mechanics. Figures are 2023–2025 where possible; each
> is flagged with confidence.

---

## One-line identity

A **state-run, single-buyer grid floating on cheap subsidised gas and
boundless desert sun** — bills are politically held *below cost*, a giant
solar park (Benban) and a brand-new Russian-built nuclear station (El Dabaa)
are bolted on by the state, and the whole sector is *mid-reform* from monopoly
toward a competitive market. You don't bid into a market; you *are* the market.

---

## Transmission vs distribution

The Egyptian power sector is dominated by one state holding company and is
only just beginning to unbundle.

- **Egyptian Electricity Holding Company (EEHC)** — the state holding parent.
  Owns the generation companies, the transmission company, and the regional
  distribution companies as subsidiaries. This is the vertically-integrated
  spine of the sector.
- **Egyptian Electricity Transmission Company (EETC)** — the **TSO** *and*
  historically the **single buyer / single seller** of bulk electricity. EETC
  owns and operates the 500 kV / 220 kV / 132–66 kV transmission backbone,
  runs the National Energy Control Centre, and signs the Power Purchase
  Agreements (PPAs) with every generator, then on-sells to the distribution
  companies. EETC was **legally separated out as an independent transmission
  operator in 2025** as part of the market-reform path (Electricity Law 87/2015
  mandates an Independent System & Market Operator and third-party network
  access). (source: Wikipedia "Electricity sector in Egypt"; RES4Africa
  "Regulatory Review of the Electricity Market in Egypt")
- **Regional distribution companies** — a set of state-owned regional DisCos
  (e.g. Cairo, Alexandria, Canal, Delta, North/South Delta) sitting under
  EEHC. They run the MV/LV networks and bill end customers. They are the DSO
  layer, but they are *not* commercially independent the way a GB DNO is.

**Voltage shape for the game.** Egypt runs **50 Hz**. Transmission tiers are
500 kV (the long desert spine carrying Aswan hydro + Benban solar + Gulf-gas
plants toward the Delta load), 220 kV, then 132/66 kV sub-transmission, then
22/11 kV and 380/220 V LV. Map this to the EHV→HV→LV ladder, but the player's
*design freedom* is constrained: the state largely decides where the big plant
goes.

**Direction of travel:** state-dominated and unbundling slowly toward a
"competitive market" — EETC-as-single-buyer is the *current* reality; the
reform target is wholesale competition + third-party access + a market
operator. Model Egypt as **single-buyer today, liberalising later**.

---

## Regulator

- **EgyptERA** — the Egyptian Electric Utility and Consumer Protection
  Regulatory Agency, established 2000. Independent licensing body for
  generation, transmission and distribution; sets tariffs; runs the FiT /
  auction frameworks. (source: EgyptERA via Devex; CMS Expert Guide — Egypt)
- **Control model: cost-plus with heavy political subsidy.** Tariffs are set
  administratively and have historically been held *far below* the cost of
  supply, with the gap covered by state subsidy. Egypt has been on a
  multi-year **subsidy-reform** path (IMF-linked) to phase tariffs up toward
  cost-reflectivity — but reform keeps being slowed by cost-of-living politics.
  As recently as Oct 2025 the government **froze household electricity prices
  until 2026** despite the subsidy bill; a **15–25 % tariff hike** is planned
  for early 2026. Electricity subsidies were ~EGP 170 bn (~US$3.6 bn). (source:
  Ecofin Agency 2025-10-07; Africa Oil & Gas Report 2025-12)

For the game this is a **cost-of-service / subsidy** regulator: the regulator
doesn't reward you for beating an incentive — it *holds the bill down by fiat*
and the Treasury eats the difference. KPI lean: **affordability above all**,
with reliability and a growing decarbonisation push secondary.

---

## How generation is procured

A hybrid of *state builds the megaprojects* and *IPP tenders for the rest*,
all anchored by EETC as the off-taker.

- **IPP tenders / PPAs.** Independent Power Producers sign long-term PPAs with
  EETC (single buyer). Big Gulf- and Chinese-financed **combined-cycle gas**
  plants dominate — e.g. the three giant Siemens CCGT megaplants (Beni Suef,
  Burullus, New Administrative Capital, ~14.4 GW combined, completed 2018) gave
  Egypt a large gas surplus.
- **Benban Solar Park** — near Aswan in the Western Desert, **~1,465 MWac
  (often quoted up to ~1.65–1.8 GW)** across 32 separate PV projects; the
  largest solar park in Africa and one of the largest worldwide. Built under a
  **feed-in-tariff (FiT) programme** with World Bank / IFC / EBRD finance.
  Cuts ~1.9 Mt CO₂/yr. (source: Wikipedia "Benban Solar Park"; NS Energy)
- **Feed-in-tariff → auctions.** Egypt's first renewables push used **FiTs**
  (the Benban round). It has since shifted to **competitive auctions / tenders**
  and large bilateral renewables deals (e.g. AMEA, ACWA Power, Scatec wind +
  solar at the Gulf of Suez / Zafarana / Gabal el-Zeit), driving prices down.
- **El Dabaa Nuclear Power Plant** — Egypt's first nuclear station, on the
  Mediterranean coast west of Alexandria. **Four Russian VVER-1200 reactors,
  ~1,200 MW each = ~4,800 MW**, built by **Rosatom** (owner: Egypt's Nuclear
  Power Plants Authority) under a ~US$30 bn deal largely financed by a Russian
  state loan. First concrete poured 2022; reactor pressure vessel installed at
  Unit 1 in 2025; Unit 1 targeted ~2028, all four units by ~2030. This is
  *baseload the state procures directly*, not a market outcome. (source: World
  Nuclear Association "Nuclear Power in Egypt"; World Nuclear News 2025; Rosatom)
- **Gas remains the backbone.** Natural gas supplied **~81 %** of Egypt's
  generation in 2024 (plus ~7 % other fossil). (source: lowcarbonpower.org /
  Ember-derived, Egypt 2024)

So: **state-led baseload (gas + new nuclear + Aswan hydro) + IPP/auction
renewables, all off-taken by a single buyer.** For the game this is mostly the
**'owned'** ownership flavour with a *secondary tender lane* for renewables.

---

## Tariff & network charges (DUoS-equivalent)

- There is no liberalised DUoS/TUoS market. End-user tariffs are **block
  tariffs set by EgyptERA**, heavily cross-subsidised and held below cost.
  Residential consumers on low consumption bands get the most subsidised rates;
  industry pays more (a 2020 industrial discount was ended 1 July 2025).
- The "network pot" vs "energy pot" distinction barely exists for the customer
  — it's a single regulated retail tariff, with the *state* absorbing the
  shortfall rather than recovering full wires + generation cost on the bill.
- **Reform path:** tariffs ratcheting up annually toward cost-reflectivity;
  subsidy shrinking but politically sticky.

**Game encoding:** start the bill *artificially low* (a "subsidy" modifier that
suppresses the displayed bill below true cost), with a slow regulator-driven
*reform ramp* that lifts it over time. The decarbonisation/affordability
tension is "do I keep bills fake-cheap on subsidised gas, or invest in solar +
nuclear and let the bill creep toward truth?".

---

## Retail vs network split

- **Almost entirely state / regulated.** Distribution companies bill customers
  at the regulated tariff; there is no retail competition for households.
- Emerging liberalisation: Electricity Law 87/2015 opens **third-party network
  access** so large/eligible consumers can eventually contract directly with
  generators (and the **EBRD backed Egypt's first private-to-private
  electricity contracts in 2025**). This is the seed of a competitive retail /
  wheeling segment, but it's nascent. (source: EBRD 2025; CMS — Egypt)

**Game encoding:** retail = regulated state monopoly; flag a *future* large-user
open-access lane as an unlockable, not a starting condition.

---

## Renewables support

- **FiT first (Benban), then auctions / tenders + big bilateral PPAs.**
- Strong policy tailwind: national target to lift renewables to ~42 % of
  generation by 2030 (later pushed toward 2035), plus an ambition to become a
  **regional energy / green-hydrogen export hub** (Suez Canal Economic Zone
  green-H₂ MoUs). (source: REGlobal "Egypt's RE Transition"; CMS — Egypt)
- Renewables were **~11 % of generation in 2024** (hydro ~6 %, wind ~4 %,
  solar ~3 %) — small share *today* but a very large pipeline. (source:
  lowcarbonpower.org, Egypt 2024)

---

## Distinctive SEAMS worth modelling (THE key section)

What makes Egypt *feel* unlike GB, each mapped to a concrete game lever.

### 1. Desert solar abundance → exceptional midday solar resource
The Western Desert (Benban / Aswan) has world-class irradiance. Solar tenders
clear cheaply and there's space for *enormous* PV.
- **Lever:** market shape gets a deep **midday solar "duck-curve" dip** that's
  easy to over-fill; the map offers huge cheap desert solar tender plots. Solar
  capex / PPA strikes should be set low to reflect record-cheap MENA solar.

### 2. Heat-driven SUMMER air-conditioning peak
Egypt's demand peak is the **hot summer (roughly June–September)**, driven by
air-conditioning — a *daytime-into-evening* peak, very temperature-sensitive.
- **Lever:** `peakSeason = summer`; a strong **summer seasonal uplift** on the
  market shape and a heat-correlated demand spike. Aircon peak partly overlaps
  solar (good) but tails into a hot evening after sunset (the squeeze).

### 3. Sandstorms (khamsin)
The *khamsin* hot dusty winds (spring, roughly March–May) and general desert
dust **soil PV panels and cut solar output**, and dust storms can stress lines.
- **Lever:** a recurring **weather event** that temporarily derates the solar
  fleet (dust soiling) and can trip lines — the desert-specific analogue of
  GB's storms. Rewards a non-solar-only mix and panel-cleaning / O&M spend.

### 4. Heavy state subsidy → artificially low bills
Bills are politically suppressed below cost; the Treasury, not the customer,
pays the gap.
- **Lever:** a **subsidy modifier** that holds the displayed avg-bill KPI down
  regardless of true cost, plus a regulator-driven **reform ramp** that slowly
  removes it. Creates a unique tension: your "good bill score" is partly fake,
  and you're scored on *also* shrinking the subsidy / moving toward
  cost-reflectivity over the RIIO-style report cards.

### 5. New nuclear baseload (El Dabaa)
A single, lumpy, state-procured 4×1,200 MW nuclear block lands late-game and
reshapes the merit order — huge zero-carbon baseload, but inflexible and
politically / financially massive.
- **Lever:** a scripted **state-built baseload tender** (owned, not market) that
  appears mid/late game: big carbon-intensity win, low marginal cost, but
  inflexible (can't follow the duck curve) and a large capex lump on the bill.

### 6. Gas-floored, cheap-night market
Cheap domestic / subsidised gas sets a low overall price floor; carbon
intensity is *moderate* (gas, not coal).
- **Lever:** market shape with a **low cheap-night floor**, modest evening
  peak, summer uplift, and a **mid carbon intensity (~gas-dominated)** — Egypt
  is the "cheap fossil but not filthy" case, unlike coal-heavy SA / India.

---

## Numbers & sources

| Metric | Value | Confidence | Source |
|---|---|---|---|
| Frequency | **50 Hz** | High | Standard MENA |
| Gas share of generation (2024) | **~81 %** | High | lowcarbonpower.org (Ember-derived) |
| Renewables share (2024) | **~11 %** (hydro ~6, wind ~4, solar ~3) | High | lowcarbonpower.org |
| Carbon intensity | **~450–500 gCO₂/kWh** (gas-dominated, *est.*) | Medium — *flag* | Inferred from ~81 % gas mix; no clean single 2024 figure found |
| Benban solar | **~1,465 MWac** (quoted up to ~1.65–1.8 GW), 32 projects | High | Wikipedia; NS Energy |
| El Dabaa nuclear | **4 × VVER-1200 ≈ 4,800 MW**, Rosatom, ~US$30 bn; Unit 1 ~2028, all 4 by ~2030 | High | World Nuclear Assoc.; World Nuclear News 2025 |
| Electricity subsidy | **~EGP 170 bn (~US$3.6 bn)** | Medium | Ecofin Agency 2025-10 |
| Planned tariff hike | **+15–25 %** early 2026 (after 2026 freeze) | Medium | Africa Oil & Gas Report 2025-12 |
| Renewables target | **~42 % by 2030/2035** | Medium | REGlobal; CMS |

**Uncertainty flags.** I did not find a single authoritative 2024 gCO₂/kWh
figure for Egypt; the ~450–500 g estimate is *inferred* from the ~81 % gas /
~11 % renewable / ~7 % other-fossil mix (gas ≈ 400–490 g, hydro/wind/solar ≈ 0).
Benban's headline capacity is quoted inconsistently (1.465 GWac vs ~1.65–1.8 GW
DC / nameplate) — both circulate; treat ~1.5 GW as the safe figure. El Dabaa
dates are official targets and have slipped before — flag as planned, not firm.

Sources: Wikipedia ("Electricity sector in Egypt", "Benban Solar Park",
"El Dabaa Nuclear Power Plant"); World Nuclear Association country profile;
World Nuclear News (2025); EgyptERA (via Devex); CMS Expert Guide — Egypt;
RES4Africa regulatory review; lowcarbonpower.org (Egypt 2024); Ecofin Agency
(2025-10-07); Africa Oil & Gas Report (2025-12); EBRD (2025); REGlobal.

---

## Suggested profile values

```
country:            Egypt
nominalHz:          50
peakSeason:         summer            # hot-season air-conditioning peak (Jun–Sep)
generationOwnership: owned            # EETC single-buyer; state builds gas+nuclear.
                                      #   secondary 'tender' lane for desert renewables
regulatorModel:     cost-of-service  # EgyptERA cost-plus + heavy subsidy
regulatorKpiLean:   affordability >> carbon > reliability   # bills held low; decarb rising
marketShape:        low cheap-night floor; modest evening peak; strong SUMMER uplift;
                    deep MIDDAY solar dip (huge cheap desert PV); mid carbon ~gas
specialMechanic:    SUBSIDY (artificially low bills + reform ramp) + DESERT SOLAR glut
                    + KHAMSIN sandstorm solar-derate + lumpy EL DABAA nuclear baseload
gridCarbon:         ~450–500 gCO₂/kWh (gas-dominated; falls as renewables+nuclear grow)
```

**Design note.** Egypt is the "**cheap, subsidised, sun-soaked, state-planned**"
counterpoint to GB's liberalised market. The signature feel: bills look great
because they're propped up by the Treasury, you're swimming in cheap solar but
fighting a hot-evening aircon peak and dust storms, and the regulator's real
test is *weaning the country off the subsidy* while a giant nuclear block
arrives to clean up the carbon line.
