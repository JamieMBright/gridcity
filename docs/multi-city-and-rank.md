# Multi-City Operation & Operator Rank — Design (future wave)

> Status: **design only, nothing ships now.** This is the build-ready
> blueprint for taking ElectriCity beyond London — to a roster of real
> world cities, unlocked by progression — and for the operator-rank ladder
> that drives that progression. It is grounded in the code as it stands on
> 2026-06-13 (`src/data/cityRegistry.ts` already models cities as
> `CityScenario` data + a `build()` map builder; `newGame(scenarioId)` and
> `newContext(scenarioId)` already thread a scenario id through the sim).
>
> The thesis: **cities should be DATA, not engine forks.** The London
> build hard-codes Great Britain in three deep seams (50 Hz, DUoS/£ bills,
> GB weather regimes). De-GB-ify those three first; everything else is a
> config object hung off `CityScenario`.

---

## 0. What the owner asked for (kept verbatim for traceability)

> "Note that this is the London map. Let us future proof how the map is
> selected to operating in different major cities (sydney, paris, new york,
> hong kong, athens, shanghai, rio de janiro, cairo, dubai). Youll have to
> research the differences required to modify the game accordingly to each
> country: weather, planning permissions, grid owned generation, frequency,
> regulator (if applicable), voltages. These should be unlocked by the user
> and a benefit to logging in. We might need to store accolade progression.
> Perhaps invent a rank system for a user where they level up based on
> milestones and efficiency against the milestones, have a wide range of
> power system engineering job titles, from junior intern etc. and have fun
> with it. Promote the player as they progress through the game based on
> their performance, faster progression for better progress, certain ranks
> they get an offer at any time to come fix another city's missing grid,
> unlocking the map."

---

## 1. Per-city power-system comparison (researched, cited)

The roster spans both frequencies, the full ownership spectrum (liberalised
market → state vertically-integrated monopoly), heating-peak and
cooling-peak climates, and the four "mechanically interesting" hazards
(sandstorm PV soiling, typhoon/cyclone, monsoon, summer-peak inversion).

| City (country) | Freq | Transmission kV | Distribution kV | System operator / regulator | Generation ownership | Planning regime | Climate / peak | Signature hazard |
|---|---|---|---|---|---|---|---|---|
| **London** (GB) | 50 Hz | 400 / 275 / 132 | 33 / 11 / 0.4 | NESO (ESO) + DNOs; **Ofgem** (RIIO) | Liberalised market; private developers, CfD/PPA | DNO consents + local planning; green-belt | Winter-peak (heating, dark evenings) | Atlantic windstorms; dunkelflaute |
| **Sydney** (AU) | 50 Hz | 500 / 330 / 132 (Transgrid) | 132 / 66 / 33 / 11 / 0.415 (Ausgrid) | **AEMO** (NEM pool, 5-min) + **AER** economic reg | Liberalised NEM; competitive gentailers | NSW planning + REZ access; bushfire overlays | **Summer-peak** (A/C); mild winter | Bushfire (vegetation/line de-rate); heatwave |
| **Paris** (FR) | 50 Hz | 400 / 225 / 150 / 90 / 63 (RTE) | 20 / 0.4 (Enedis) | **RTE** TSO; **Enedis** DSO; **CRE** regulator (TURPE) | EDF-dominated; **~70% nuclear baseload**, state-majority | Centralised; strong state planning | Winter-peak but **flatter** (electric heating heavy, nuclear-fed) | Nuclear must-run inflexibility; river-cooling derates in heatwave |
| **New York** (US) | **60 Hz** | 345 / 138 / 69 (Con Ed) | 33 / 27 / 13.8 / 0.12-0.208 | **NYISO** (ISO) + **NY-PSC**; utility = **Con Edison** | Liberalised wholesale; Con Ed wires-only, merchant gens | NY Article VII / city planning; dense urban | **Summer-peak** (A/C) + cold winters | Heat-driven network-cable failures; nor'easters; 277/480 secondary-network faults |
| **Hong Kong** (HK) | 50 Hz | **400 / 132** (CLP) | 33 / 11 / 0.38 | **Scheme of Control** (gov't profit-cap, no ISO market) | **Vertically integrated** — CLP owns gen+wires; no tenders | Gov't lands/SoC; extreme density | Sub-tropical, **summer A/C peak**, humid | **Typhoons** (still >99.999% — resilience as a flex) |
| **Athens** (GR) | 50 Hz | 400 / 150 (IPTO/ADMIE) | 20 / 0.4 (HEDNO) | **IPTO** TSO + **HEDNO** DSO; **RAAEY** (ex-RAE) regulator | Liberalised but PPC-heavy; islands need links | EU + Greek planning; islanded Aegean | **Summer-peak** (A/C, tourism), hot dry | **Meltemi** north wind (Jul-Aug); island interconnection |
| **Shanghai** (CN) | 50 Hz | 1000 / 500 / 220 (SGCC) | 110 / 35 / 10 / 0.4 | **State Grid (SGCC)** state monopoly; NEA + SASAC oversight | **State-owned, vertically integrated**; no developer market | State planning, top-down, fast | Humid subtropical, **summer A/C peak** + winter | UHV/HVDC bulk import dependence; typhoon fringe |
| **Rio de Janeiro** (BR) | **60 Hz** | 500 / 345 / 138 (SIN) | 138 / 25 / 13.8 / 0.127-0.22 | **ONS** operator + **ANEEL** regulator; utility = **Light S.A.** | **Hydro-dominated** national pool; ONS dispatches by basin | ANEEL concessions; favela/informal connections | Tropical, **summer-peak**, wet/dry seasons | **Hydro drought** (reservoir-driven dispatch); flash floods; non-technical losses (theft) |
| **Cairo** (EG) | 50 Hz | 500 / 220 / 132 (EETC) | 66 / 22 / 11 / 0.4 | **EgyptERA** regulator; **EEHC/EETC** state holding | **State-owned, integrated** (EEHC); IPP renewables emerging | State-led mega-projects, fast | Desert, **strong summer A/C peak** (~50% of peak is A/C) | **Sandstorm PV soiling** (dust losses 20-40%); extreme heat de-rating |
| **Dubai** (AE) | 50 Hz | 400 / 132 (DEWA) | 11 / 0.4 | **DEWA** vertically integrated; **RSB** (Regulatory & Supervisory Bureau) | **State utility owns gen+wires**; IPP solar (Shams Dubai) | DEWA-led, very fast, capital-rich | Hot desert, **extreme summer A/C peak**; mild winter | Sandstorm soiling; >50°C heat; near-zero rain (no self-cleaning of PV) |

### Sources

- **GB**: existing model (Ofgem RIIO, 400/132/33 kV) — `src/sim/catalog.ts`, `src/sim/regulation/riio.ts`.
- **Sydney**: [AEMO — About the NEM](https://www.aemo.com.au/energy-systems/electricity/national-electricity-market-nem/about-the-national-electricity-market-nem), [Transgrid (Wikipedia)](https://en.wikipedia.org/wiki/Transgrid), [Ausgrid network voltages (DTAPR)](https://dtapr.ausgrid.com.au/), [Ausgrid covered-conductor / bushfire trial](https://esdnews.com.au/ausgrid-covered-conductor-trial-begins-in-new-south-wales/).
- **Paris**: [CRE — Electricity networks](https://www.cre.fr/en/electricity/electricity-networks/electricity-networks.html), [RTE (Wikipedia) — 63/90/150/225/400 kV](https://en.wikipedia.org/wiki/R%C3%A9seau_de_Transport_d%27%C3%89lectricit%C3%A9), [Enedis 20 kV distribution (Selectra)](https://en.selectra.info/energy-france/guides/electricity/enedis-erdf), [TURPE 7 tariff (Modo Energy)](https://modoenergy.com/research/en/france-grid-tariff-fee-battery-turpe).
- **New York**: [Con Edison system overview (NY DPS)](https://documents.dps.ny.gov/public/Common/ViewDoc.aspx?DocRefId=%7B30F9C052-25D8-4271-B096-DF90C69A55EB%7D) (345/138/69 kV; 33/27/13.8 kV), [NYISO — what we do](https://www.nyiso.com/what-we-do), [NYISO ancillary / 60 Hz regulation](https://www.nyiso.com/ancillary-services).
- **Hong Kong**: [CLP Scheme of Control Agreement](https://www.clp.com.hk/en/about-clp/scheme-of-control/agreement), [HK Gov — Power & Gas Supplies (50 Hz, 400/132 kV)](https://www.gov.hk/en/about/abouthk/factsheets/docs/power_gas_supplies.pdf), [Reliability under Typhoon Mangkhut (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0957178720301284), [CLP supply reliability >99.999%](https://www.clp.com.hk/en/about-clp/power-transmission-distribution/supply-reliability-power-quality).
- **Athens**: [IPTO/ADMIE — HV consumers](https://www.admie.gr/en/grid/user-connection/hv-consumers), [HEDNO — Wikipedia](https://en.wikipedia.org/wiki/Hellenic_Electricity_Distribution_Network_Operator) (0.4-20 kV), [RAAEY regulatory framework](https://www.raaey.gr/energeia/en/electricity/infrastructure/distribution-network/framework/), [Meltemi wind](https://www.greecetravelsecrets.com/meltemi-wind/), [Athens heat case (World Bank)](https://thedocs.worldbank.org/en/doc/9e5105a293323cddf54df62da2e9e862-0070012022/original/D-Athens-Heat-Case.pdf).
- **Shanghai**: [State Grid Corporation of China (Wikipedia)](https://en.wikipedia.org/wiki/State_Grid_Corporation_of_China), [Demystifying China's Power Grid (PTR)](https://ptr.inc/demystifying-chinas-power-grid/) (110-1000 kV typical designs), SASAC oversight.
- **Rio de Janeiro**: [Light S.A. (Wikipedia)](https://en.wikipedia.org/wiki/Light_S.A.), [ONS / ANEEL roles (BrazilStockGuide)](https://brazilstockguide.com/insights/brazil-ons-aneel-distributed-generation-risk/) (ONS dispatches large hydro/thermal/wind), [Rio electricity 60 Hz / 127 V (Rio by Cariocas)](https://riodejaneirobycariocas.com/electricity-sockets-and-plugins-in-rio/).
- **Cairo**: [EEHC](https://www.eehc.gov.eg/CMSEehc/en), [EgyptERA (Wikipedia)](https://en.wikipedia.org/wiki/Egyptian_Electric_Utility_and_Consumer_Protection_Regulatory_Agency), [EETC sole transmission owner 132-500 kV (EIB)](https://www.eib.org/en/projects/all/20080687), [Egypt cooling ~50% of peak (UNEP)](https://www.unep.org/news-and-stories/story/it-bakes-egypt-looks-cooling-power-sea-help).
- **Dubai**: [DEWA 400/132 + 132/11 kV substations (Zawya)](https://www.zawya.com/en/press-release/government-news/dewa-commissions-one-400-132-kv-and-ten-132-11-kv-substations-in-h1-of-2022-at-a-total-cost-of-aed-1715bln-q5061i1g), [DEWA grid growth 2025 (Gulf Business)](https://gulfbusiness.com/en/2026/energy/dubai-powers-ahead-dewa-expands-grid-with-10-new-high-voltage-substations/).
- **Desert PV soiling / cooling peak**: [Dust impact on PV — critical review (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2352484724003792) (28% loss over 60 days, up to 39% annual in coastal desert), [IEA — keeping cool](https://www.iea.org/commentaries/keeping-cool-in-a-hotter-world-is-using-more-energy-making-efficiency-more-important-than-ever) (cooling >70% of peak in hottest regions).

### Mechanically interesting differences (the design payload)

1. **State-owned / vertically integrated grids** (Hong Kong, Shanghai, Cairo, Dubai) — the operator **owns the generation**. There is *no developer tender loop*. Instead the player **commissions plant directly** (capex on the bill, no PPA strike middleman) and **answers to a profit-cap / cost-of-service regulator** (SoC, SASAC, EgyptERA, RSB) rather than a liberalised-market regulator. This flips the whole `events/developers.ts` loop off and replaces it with a build-it-yourself generation panel. **This is the single biggest mechanical fork** and the most fun differentiator.
2. **60 Hz** (New York, Rio) — frequency dial, droop floors, RoCoF and the tick's `freqHz` math must read a nominal from config, not the literal `50`.
3. **Summer cooling peak** (Sydney, NYC, Hong Kong, Athens, Shanghai, Rio, Cairo, Dubai — i.e. *most of the roster*) — the demand curve **inverts**: peak is a hot August afternoon driven by air-conditioning, not a dark January evening driven by heat pumps. Reinforcement pressure, the season cosine, and `hpProfile`→`acProfile` all flip.
4. **Sandstorm PV soiling** (Cairo, Dubai) — a slow accumulating derate on solar capacity factor that only a rain event or a (paid) panel-cleaning programme clears. New cost line; ties soiling into the bill and into a cleaning-cadence decision.
5. **Typhoon / cyclone / bushfire** (Hong Kong, Sydney) — concentrated, seasonal extreme-weather reliability set-pieces (the GB "named storm" mechanic, retuned: typhoon signal classes; bushfire vegetation de-rating and line trips).
6. **Hydro-drought dispatch** (Rio) — generation availability is reservoir-driven: a dry season throttles cheap hydro and forces expensive thermal, a carbon + bill spike the player must hedge.

---

## 2. `CityScenario` v2 — additive config so cities are DATA

Today's interface (`src/data/cityRegistry.ts`):

```ts
export interface CityScenario {
  id: string;
  name: string;
  tagline: string;
  build: () => CityMap;
  mission?: boolean;
}
```

v2 adds **optional** sub-configs; every field defaults to today's GB
behaviour so London and the missions keep working unchanged and old saves
hydrate. Cities become declarative:

```ts
export interface CityScenario {
  id: string;
  name: string;
  tagline: string;
  build: () => CityMap;
  mission?: boolean;

  /** All GB-specific behaviour, defaulted so omitting the block = London. */
  power?: PowerSystemProfile;
  regulator?: RegulatorProfile;
  generation?: GenerationModel;
  weatherProfile?: WeatherProfile;
  planning?: PlanningRegime;
  economy?: EconomyProfile;

  /** Difficulty 1-10 and the rank a city's offer arrives at (see §5). */
  difficulty?: number;
  unlockAtRank?: number;
}

export interface PowerSystemProfile {
  nominalHz: 50 | 60;
  /** Underfrequency floor before load-shed cascades (≈ 47.5 GB / 57 US). */
  freqFloorHz: number;
  /** kV tiers, EHV→LV, that drive catalog tiers + voltageChooser. */
  transmissionKv: number[];   // e.g. [400,275,132] | [345,138,69] | [500,330,132]
  distributionKv: number[];   // e.g. [33,11,0.4]  | [20,0.4]      | [110,10,0.4]
}

export interface RegulatorProfile {
  /** Display name + acronym for chrome ("Ofgem", "CRE", "NY-PSC", "SoC"). */
  name: string;
  /** 'riio' liberalised price-control | 'profit-cap' SoC/DEWA | 'cost-of-service'
   *  state (SGCC/EEHC). Selects the report-card framing + KPI weights. */
  model: 'riio' | 'profit-cap' | 'cost-of-service';
  /** Per-KPI weight overrides; defaults to riio.ts WEIGHTS. */
  kpiWeights?: Partial<Record<KpiKey, number>>;
}

export interface GenerationModel {
  /** 'tender' = liberalised developer market (London/Sydney/Paris/NY/Athens/Rio);
   *  'owned'  = vertically integrated, player builds gen directly, no PPA
   *  (Hong Kong/Shanghai/Cairo/Dubai). */
  ownership: 'tender' | 'owned';
  /** Hydro-reservoir dispatch (Rio): availability follows a wet/dry season. */
  hydroDriven?: boolean;
  /** Must-run baseload fraction the player cannot dispatch off (Paris nuclear). */
  baseloadFloor?: number;
}

export interface WeatherProfile {
  /** Which half-year peaks. 'winter' = London/Paris; 'summer' = the rest. */
  peakSeason: 'winter' | 'summer';
  /** Day-of-year of the demand peak (mid-Jan GB; mid-Aug for summer cities). */
  peakDoy: number;
  /** Latitude band → sun-arc day length swing + solar amplitude. */
  latitudeBand: 'temperate' | 'subtropical' | 'desert' | 'tropical';
  /** Active regimes, replacing the hard GB set. Each has a season-weighted
   *  draw, like REGIMES in weather.ts. */
  regimes: WeatherRegimeSpec[];
  /** Slow PV soiling rate /day under dust + the rain threshold that clears
   *  it (desert cities only; 0 = self-cleaning temperate). */
  pvSoilingPerDay?: number;
  /** Extreme-event kind for the seasonal set-piece. */
  extreme?: 'windstorm' | 'typhoon' | 'cyclone' | 'bushfire' | 'flood' | 'sandstorm';
}

export interface PlanningRegime {
  /** Months a consent takes + refusal odds — fast state cities approve
   *  quickly; green-belt/dense-urban drag. */
  consentMonths: number;
  refusalChance: number;     // 0..1
  /** Protected overlays that block/raise cost (green-belt, heritage, favela). */
  overlays?: string[];
}

export interface EconomyProfile {
  /** Currency symbol + ISO for the bill HUD ("£"/GBP, "$"/USD, "€"/EUR,
   *  "HK$", "¥"/CNY, "R$"/BRL, "E£"/EGP, "AED", "A$"/AUD). */
  symbol: string;
  iso: string;
  /** FX to normalise leaderboard composite across currencies. */
  toGbp: number;
  /** Network-vs-energy bill split + retail uplift (GB defaults in bill.ts). */
  domesticNetworkShare?: number;
  domesticEnergyShare?: number;
  retailUplift?: number;
}
```

### The 3 most engine-invasive GB hard-codings to abstract FIRST

Verified against the code on disk:

1. **System frequency = 50 Hz, hard-coded in `src/sim/tick.ts`** (≈ lines
   822-835): `const freqHz = Math.max(47.5, 50 - 1.5 * deficit) + jitter`.
   The nominal `50`, the `47.5` floor and the droop slope are literals.
   There is **no** `frequency.ts` (the task brief guessed one) — the seam
   is the tick. **Fix:** introduce `src/sim/market/frequency.ts` exporting
   `computeFreqHz(deficit, profile, rng)` taking `{ nominalHz, freqFloorHz,
   droop }` from the active `PowerSystemProfile`; have the tick call it.
   Smallest, highest-leverage refactor — unblocks NYC and Rio.

2. **DUoS / £ bill model, hard-coded in `src/sim/regulation/bill.ts`.**
   `DOMESTIC_NETWORK_SHARE = 0.32`, `DOMESTIC_ENERGY_SHARE = 0.4`,
   `RETAIL_UPLIFT = 3.0`, `SUPPLY_FIXED_YR = 150`, and the whole "network
   pot vs energy pot, generation rides a PPA" structure is GB-liberalised.
   For **owned-generation** cities there is *no PPA* — gen capex lands in
   the network pot directly. **Fix:** make `computeBill` take an
   `EconomyProfile` + `GenerationModel`; branch the gen-recovery path on
   `ownership`; thread `symbol`/`iso` to the HUD. Currency display is
   cosmetic; the gen-recovery branch is the real fork.

3. **GB weather regimes, hard-coded in `src/sim/events/weather.ts`.**
   `COLDEST_DOY = 15` (mid-Jan), the Atlantic `windy-wet` / dunkelflaute
   `calm-cold` regime set, `seasonFactor`'s winter-peak cosine, the GB sun
   arc (`16.5 - 8.5*s` h), and `hpProfile`'s **winter** heating peak all
   bake in a temperate winter-peaking island. Summer-peak cities need the
   cosine phase-shifted to `peakDoy`, an `acProfile` cooling peak, a
   latitude-appropriate sun arc, and city-specific regimes (meltemi,
   monsoon, sandstorm, typhoon). **Fix:** parameterise `seasonFactor`,
   `sunFactor` and the `REGIMES` table off `WeatherProfile`; add
   `acProfile` alongside `hpProfile`; add a soiling integrator.

> Order of attack: **frequency (cheap, isolated) → weather (medium, additive
> regimes) → bill/generation-ownership (deepest, touches developers loop).**
> Everything else (voltages, planning, regulator chrome, currency) is
> shallow config wiring once these three seams take a profile argument.

---

## 3. Per-city briefs (the 10)

Each: map character · 2-3 distinct mechanics · regulator/ownership ·
weather · difficulty (1 easiest … 10 hardest).

1. **London & the Essex Marches (GB) — difficulty 3 (the tutorial home).**
   The shipped map: true Thames, radial A-roads, green belt, offshore wind
   off the Essex coast. Mechanics: DUoS bill minimisation, developer
   tenders, named-storm reliability. Ofgem RIIO, liberalised. Winter-peak.
   *Always unlocked.*

2. **Sydney (AU) — difficulty 4.** Harbour + Blue Mountains fringe;
   suburban sprawl, rooftop-PV saturation (the world's highest). Mechanics:
   **rooftop-solar reverse-flow / voltage-rise management**; **bushfire
   vegetation de-rating** (the GB veg policy, made existential); NEM 5-min
   pool. AEMO operator + AER price control. **Summer-peak** (A/C),
   bushfire season. *Early second city — closest cousin to London.*

3. **Paris (FR) — difficulty 4.** Radial RER geometry, dense Haussmann
   core, nuclear plants on the Loire/Seine upstream. Mechanics: **nuclear
   must-run baseload floor** (you can't dispatch it off — flex is about the
   margin, not the base); **river-cooling heatwave derates** (reactors throttle
   when rivers run hot); 225 kV sub-transmission tier. RTE/Enedis, CRE
   (TURPE tariff), EDF state-majority. Winter-peak but flat. *Teaches
   inflexible baseload.*

4. **New York (US) — difficulty 6.** Manhattan grid + five boroughs, dense
   **underground secondary network** (the famous 13.8 kV spot-network).
   Mechanics: **60 Hz** (first frequency flip); **summer heat-driven
   feeder/cable failures** (load + heat → fault rate); **network vault**
   topology where one transformer trip doesn't drop load (N-2 secondary).
   NYISO + NY-PSC, Con Ed wires-only. Summer-peak + cold winters. *First
   60 Hz city; punishes thin reinforcement in a heatwave.*

5. **Hong Kong (HK) — difficulty 6.** Victoria Harbour, vertical density,
   reclamation. Mechanics: **vertically integrated — you OWN the
   generation** (no tenders; build plant directly, capex straight on the
   bill); **typhoon signal-class reliability** (T8/T10 set-pieces, but the
   bar is >99.999%, so resilience spend is the lever); extreme load density
   per km². **Scheme of Control profit-cap** regulator. Summer-peak, humid.
   *First owned-generation city — the big mechanical pivot.*

6. **Athens (GR) — difficulty 5.** Attica basin + Aegean islands needing
   submarine interconnectors. Mechanics: **island interconnection vs local
   diesel** (cheap link or dirty island gen?); **meltemi summer wind**
   (a reliable Jul-Aug north wind — wind CF spikes exactly at the A/C
   peak); tourism-driven summer demand. IPTO/HEDNO, RAAEY regulator,
   PPC-heavy. Summer-peak, hot-dry. *Introduces interconnector economics.*

7. **Shanghai (CN) — difficulty 7.** The Bund, Pudong towers, Yangtze
   delta sprawl, vast. Mechanics: **UHV/HVDC bulk import** (1000 kV / HVDC
   feeders bring distant hydro/coal — a long-distance import lever);
   **state cost-of-service** (SGCC owns everything; SASAC sets returns —
   no market, just build-and-justify); enormous scale + fast top-down
   planning (cheap, fast consents). State monopoly, NEA/SASAC. Summer-peak.
   *Scale + owned-gen + UHV import.*

8. **Rio de Janeiro (BR) — difficulty 8.** Mountains, favelas, Guanabara
   Bay, Sugarloaf. Mechanics: **hydro-drought dispatch** (reservoir level
   drives whether cheap hydro or expensive thermal runs — a wet/dry season
   gamble that swings carbon + bill); **non-technical losses / informal
   connections** (favela theft as a CML/loss drag you invest to reduce);
   **flash-flood reliability**. ONS operator + ANEEL; Light S.A. concession.
   **60 Hz**, tropical summer-peak. *Hardest dispatch puzzle.*

9. **Cairo (EG) — difficulty 7.** Nile ribbon, desert sprawl, mega-grid.
   Mechanics: **sandstorm PV soiling** (solar CF decays ~0.5%/day under
   dust, no rain to clear it — buy a cleaning programme or eat the loss);
   **state EEHC owned generation** + emerging IPP solar; extreme summer
   heat de-rating. EgyptERA regulator, EEHC/EETC state holding. Summer-peak
   desert. *First soiling mechanic.*

10. **Dubai (AE) — difficulty 6.** Coast + desert, Palm, skyline, vast
    solar park. Mechanics: **sandstorm soiling at scale** (huge PV park,
    zero rain — cleaning cadence is a core cost); **DEWA capital-rich fast
    build** (consents trivial, money is no object — pure optimisation
    against extreme A/C peak); >50°C de-rating. **DEWA vertically
    integrated**, RSB regulator. Extreme summer-peak desert. *A "sandbox"
    flex city: easy planning, hard climate.*

---

## 4. Operator RANK ladder

A career ladder of real power-system-engineering job titles, junior intern
→ executive. The player **levels up on milestones AND efficiency against
those milestones** — better performance promotes you faster.

### The 15 ranks

| # | Rank title | Vibe | Gate (cumulative career points, "CP") |
|---|---|---|---|
| 1 | **Graduate Intern** | Day one. Make the tea, read the SLD. | 0 |
| 2 | **Assistant Engineer** | First real connections. | 120 |
| 3 | **Distribution Engineer** | Owns an 11 kV feeder or two. | 320 |
| 4 | **Network Planner** | Reads the load forecast; sizes reinforcement. | 600 |
| 5 | **Protection & Control Engineer** | Trips and grading; keeps faults small. | 1 000 |
| 6 | **Senior Network Engineer** | A whole primary's worth of iron. | 1 550 |
| 7 | **Connections Manager** | Runs the tender / build queue. | 2 250 |
| 8 | **Control Room Lead (Dispatcher)** | Real-time balancing, frequency. | 3 150 |
| 9 | **Asset Strategy Manager** | Whole-life cost, ageing, RIIO submissions. | 4 300 |
| 10 | **Head of Network Operations** | The lights are your name. | 5 800 |
| 11 | **Regional Grid Director** | A licence area end-to-end. | 7 700 |
| 12 | **Chief Engineer** | Owns the engineering standard. | 10 100 |
| 13 | **System Operator (ESO/ISO Director)** | National balancing. | 13 200 |
| 14 | **Chief Network Officer** | Board table; capital strategy. | 17 200 |
| 15 | **Distinguished Grid Fellow** | They name a busbar after you. | 22 500 |

(15 sits in the requested 12-16 band; titles are deliberately playful but
all real GB/industry roles.)

### How career points are earned (milestones × efficiency)

CP from a closed RIIO/regulatory period:

```
periodCP = compositeScore                         // 0..100 baseline (the report card)
         × difficultyMul(city.difficulty)         // 1.0 (London) … 2.2 (Rio)
         × gradeBonus(grade)                       // A 1.5, B 1.2, C 1.0, D 0.7, E 0.4
         + milestoneCP                             // one-off accolades hit this period
```

- **`compositeScore`** is the existing `ReportCard.composite` from
  `closePeriod` (`src/sim/regulation/riio.ts`) — already a 0..100 weighted
  blend of bill/CI/CML/carbon/curtailment/satisfaction. This is the
  "efficiency against milestones" the owner asked for: beating targets by
  20% scores ~100, just meeting them ~70 (per `scoreOne`).
- **`gradeBonus`** makes an **A grade promote dramatically faster than an
  E** — "faster progression for better progress," directly.
- **`difficultyMul`** means clearing Rio is worth far more CP than clearing
  London — harder cities accelerate the ladder.
- **`milestoneCP`** = discrete accolades (see §6): "First Gigawatt
  connected," "Storm Hero (zero CML breach through a named storm),"
  "Net-Zero Network (carbon < 50 g/kWh for a full period)," "Soiling
  Slayer (Cairo PV park kept > 90% clean)," "Typhoon Unbroken (HK T10 with
  > 99.999%)." Each fires once, banks a fixed CP, and is stored.

### Score → rank mapping

`rank = highest tier whose CP gate ≤ careerCP`. Career CP is the running
sum of `periodCP` over **all** cities (cross-city career), so a strong run
in a hard city can leap you several ranks at once. Promotions surface as a
"PROMOTED" card at period close, in the dusk aesthetic, with the new title
and the next gate.

---

## 5. City UNLOCK via in-game OFFERS

Cities are **earned**, presented as **job offers** — the owner's "certain
ranks they get an offer at any time to come fix another city's missing
grid, unlocking the map."

### Difficulty-ordered gating

Each non-London city has an `unlockAtRank`. Offers arrive **only once the
player reaches that rank**, in difficulty order so the curve climbs:

| Offer arrives at rank ≥ | City | Why here |
|---|---|---|
| 3 (Distribution Engineer) | **Sydney** | Closest to London; eases in summer-peak + bushfire. |
| 4 (Network Planner) | **Paris** | Adds nuclear must-run baseload. |
| 6 (Senior Network Engineer) | **Athens** | Interconnectors + meltemi. |
| 7 (Connections Manager) | **New York** | First 60 Hz + dense secondary network. |
| 8 (Control Room Lead) | **Hong Kong** | First owned-generation pivot. |
| 9 (Asset Strategy Manager) | **Dubai** | Sandstorm soiling, capital-rich sandbox. |
| 10 (Head of Network Ops) | **Cairo** | Soiling at mega-grid scale + state ownership. |
| 11 (Regional Grid Director) | **Shanghai** | UHV import + vast state grid. |
| 12 (Chief Engineer) | **Rio de Janeiro** | Hardest: hydro-drought + non-technical losses. |

### Cadence & presentation

- At each period close, after the report card, **if** the player has just
  crossed a city's `unlockAtRank` and that city is still locked, a single
  **"Offer"** envelope slides in: a letterhead from the city's
  operator/regulator ("CLP Power invites you to lead Hong Kong's
  network…"), the city's signature challenge in one line, and its
  difficulty stars. Accept → unlocks it in the Start menu; Decline → it
  stays offered (re-presentable from a "Career Offers" tray, never lost).
- **One offer per period** max, so unlocks feel like milestones, not a
  dump. A strong player who skipped several gates gets the **lowest-rank
  still-locked** city first, then the next at the following close.
- Presentation lives in the same golden-hour chrome; the envelope and the
  Start-menu city card glow when newly unlocked.

---

## 6. Persistence — Supabase progression

Today there are `profiles`, `saves`, `settings`, `leaderboard` tables
(see `src/online/cloud.ts`, `src/online/auth.ts`). Add **one** table for
the career, plus a thin local fallback so guests still progress.

### New `progression` table (1 row per user)

```sql
create table public.progression (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  career_cp      integer      not null default 0,
  rank_tier      smallint     not null default 1,
  -- which cities the player has unlocked (london always implied)
  unlocked_cities text[]      not null default '{}',
  -- accolade id -> earned-at ISO, append-only
  accolades      jsonb        not null default '{}'::jsonb,
  -- best composite per city, for the cross-city wall
  city_best      jsonb        not null default '{}'::jsonb,
  updated_at     timestamptz  not null default now()
);

alter table public.progression enable row level security;

create policy "own row read"   on public.progression
  for select using (auth.uid() = user_id);
create policy "own row upsert" on public.progression
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.progression
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

(Alternative: widen `profiles` with these columns. A separate
`progression` table is cleaner — `profiles` stays the public leaderboard
identity, `progression` is private career state with its own RLS. Prefer
the new table.)

### Client wiring (new `src/online/progression.ts`, sibling of `cloud.ts`)

- `pullProgression(): Promise<Progression | undefined>` — best-effort, like
  `pullCloudSave`; returns `undefined` offline/guest.
- `pushProgression(p, immediate?)` — debounced upsert, mirroring
  `pushCloudSave`'s pattern.
- On each period close: compute `periodCP`, add to `career_cp`, recompute
  `rank_tier`, merge new `accolades`, update `city_best`, push.

### Guest / local fallback & the login benefit

- **Guests** (no Supabase session — `userId()` returns `undefined`, the
  existing pattern) keep progression in `localStorage` via the existing
  `localStorageStore.ts` pattern, under a `progression` key.
- **On sign-in**, merge: take the **max** `career_cp`, the **union** of
  `unlocked_cities`, the **union** of `accolades` (earliest earned-at
  wins), so a guest who later logs in keeps everything.
- **The login benefit** is now concrete and matches the owner's ask:
  cross-device career, cloud-safe unlocked cities and accolades, and
  leaderboard identity. Logged-out play still progresses locally but is
  device-bound and loseable — the gentle nudge to sign in.

### Migration sketch

1. `apply_migration('add_progression')` — the SQL above (Supabase project
   `electricity`).
2. Backfill: none needed; absent row ⇒ defaults (tier 1, London only).
3. Generate types (`generate_typescript_types`) and add a `Progression`
   interface in `src/online/progression.ts`.
4. No `SAVE_VERSION` bump required — progression is **separate** from the
   in-game `SaveData`; map-geometry changes don't touch it. (Per-city saves
   still bump `SAVE_VERSION` when that city's geometry changes, as today.)

---

## 7. Phased build plan (real files; de-GB-ification first)

**Phase 0 — seams (no new city yet; London behaviour identical).**
- `src/sim/market/frequency.ts` (NEW): `computeFreqHz(deficit, profile,
  rng)`; tick.ts calls it. Default profile = `{50, 47.5, droop:1.5}` so
  output is bit-identical → unit test asserts unchanged London freq trace.
- `src/sim/events/weather.ts`: parameterise `seasonFactor`/`sunFactor`/
  `REGIMES` off a `WeatherProfile`; add `acProfile`; add a soiling
  integrator field on `WeatherState` (default 0). London profile reproduces
  today's numbers exactly (regression test on `domesticProfile`/`sunFactor`).
- `src/sim/regulation/bill.ts`: `computeBill` gains `economy` +
  `generation` args, defaulted to GB constants; add the `ownership:'owned'`
  gen-recovery branch (dormant for London). HUD reads `economy.symbol`.
- **Verify:** full `npx vitest run` green with zero behavioural change;
  Playwright London e2e unchanged; `tools/preview.ts` crops identical.

**Phase 1 — `CityScenario` v2 plumbing.**
- Extend the interface in `src/data/cityRegistry.ts` (all optional);
  `getScenario` resolves defaults to a `LONDON_DEFAULTS` profile object.
- Thread `profile` from `newContext(scenarioId)` (`state.ts`) into tick,
  weather, bill, dispatch, frequency, developers.
- **Verify:** London still default everywhere; unit fixtures stay clean
  (the `seedScenario` note in CLAUDE.md still holds).

**Phase 2 — first new city: Sydney (closest cousin, lowest risk).**
- `src/data/sydneyMap.ts` (NEW, code-drawn like `londonMap.ts`): harbour,
  sprawl, bushfire fringe. `power` 50 Hz 330/132/33/11; `weatherProfile`
  summer-peak + bushfire extreme; `economy` A$.
- Reuse the tender generation loop (Sydney is liberalised) — proves the
  weather/peak-inversion + frequency-config path without touching the
  developers fork yet.
- **Verify:** render previews + phone-landscape + desktop screenshots;
  e2e a Sydney newGame; assert summer demand peak in a profile test.

**Phase 3 — the owned-generation fork: Hong Kong.**
- `GenerationModel.ownership='owned'` path: replace `events/developers.ts`
  tenders with a direct **build-generation** command + the `'profit-cap'`
  regulator framing in `riio.ts`. `hongKongMap.ts`. Typhoon extreme.
- **Verify:** unit-test that no developer applications fire under `owned`;
  bill puts gen capex in the network pot; report card uses profit-cap KPIs.

**Phase 4 — remaining cities as data + their one mechanic each.**
Paris (baseload floor) · NYC (60 Hz + secondary network) · Athens
(interconnectors + meltemi) · Dubai & Cairo (sandstorm soiling) · Shanghai
(UHV import + state cost-of-service) · Rio (hydro-drought + non-technical
losses). Each = a `*Map.ts` + a `CityScenario` block + (where flagged) one
new sim mechanic behind its config flag.

**Phase 5 — rank, offers, persistence.**
- `src/sim/regulation/rank.ts` (NEW): CP formula, the 15-tier ladder,
  accolade definitions, `tierForCp`.
- Period-close hook (worker → main) emits promotions + accolades + offers.
- `progression` table migration (§6) + `src/online/progression.ts` +
  local fallback + sign-in merge.
- UI: PROMOTED card, Offer envelope, Career Offers tray, Start-menu city
  cards with locked/unlocked glow; tested on **mobile-landscape and
  desktop** per the design principle.
- **Verify:** full local e2e (fresh server, no reuse), unlock-flow e2e,
  guest→login merge unit test, RLS check.

---

## Appendix A — comparison table (highlights)

- **Frequency:** 8 of 10 are 50 Hz; **New York and Rio are 60 Hz** — the
  one binary the tick must stop hard-coding.
- **Ownership:** **Hong Kong, Shanghai, Cairo, Dubai are vertically
  integrated** (player owns generation, no tenders) — the single biggest
  mechanical fork. London/Sydney/Paris/NYC/Athens/Rio are tender markets.
- **Peak season:** only **London and Paris are winter-peaking**; the other
  eight invert to a **summer A/C peak** — the demand curve and reinforcement
  pressure flip for most of the roster.
- **Signature hazards:** Atlantic windstorm (London), bushfire (Sydney),
  river-cooling derate (Paris), heat-cable failure (NYC), typhoon (HK),
  meltemi (Athens), UHV-import dependence (Shanghai), hydro-drought (Rio),
  **sandstorm PV soiling** (Cairo, Dubai).

## Appendix B — rank ladder (condensed)

Graduate Intern → Assistant Engineer → Distribution Engineer → Network
Planner → Protection & Control Engineer → Senior Network Engineer →
Connections Manager → Control Room Lead → Asset Strategy Manager → Head of
Network Operations → Regional Grid Director → Chief Engineer → System
Operator → Chief Network Officer → **Distinguished Grid Fellow**.
Promotion = Σ(`composite × difficultyMul × gradeBonus + milestoneCP`);
A-grades promote you fastest; harder cities are worth more.

## Appendix C — recommended build order

1. **Phase 0 seams** — `frequency.ts`, parameterised `weather.ts`,
   profile-aware `bill.ts` (London output unchanged).
2. **Phase 1** — `CityScenario` v2 config + default plumbing.
3. **Phase 2** — Sydney (tender + summer-peak + 50 Hz, lowest risk).
4. **Phase 3** — Hong Kong (the owned-generation fork).
5. **Phase 4** — the remaining seven cities as data + one mechanic each.
6. **Phase 5** — rank ladder, city-unlock offers, `progression` persistence
   with guest→login merge.

De-GB-ify the three seams **before** the first new city ships; build the
two archetype cities (one tender, one owned) before fanning out; land rank
+ unlock + persistence last as the meta-layer that ties the roster together.
