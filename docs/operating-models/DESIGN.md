# Per-country operating-model PROFILES — codebase design

> **Scope.** A concrete, codebase-grounded design for turning the per-country
> operating-model *research* (the sibling country docs in this folder) into
> *gameplay*. It specifies exactly which profile fields differ per country, how
> the sim/regulator/tender flow branches, how a city maps to a country profile,
> and a phased PR plan. Read the country docs for the *why*; this doc is the
> *how*.
>
> **The good news: most of the seam already exists.** `src/sim/powerProfile.ts`
> already defines `PowerSystemProfile`, `WeatherProfile`, `EconomyProfile`,
> `GenerationModel`, `RegulatorProfile`, `MarketProfile`, and the resolved
> `ResolvedProfile` / `LONDON_PROFILE`. **Four country `MarketProfile`s and four
> `RegulatorProfile`s are already written and tested** (FR/AU/HK/BR) — they are
> simply **not wired to any city scenario yet**. This design is mostly *wiring +
> filling the dormant hooks*, not green-field architecture.

---

## 1. What exists today (the seam audit)

### 1.1 The profile types (`src/sim/powerProfile.ts`)

```
ResolvedProfile = {
  power:      PowerSystemProfile   // nominalHz, freqFloorHz, droopHz, kV tiers
  weather:    WeatherProfile       // peakSeason, peakDoy, sun arc, regimes
  economy:    EconomyProfile       // currency, network/energy shares, retailUplift, standing
  generation: GenerationModel      // ownership 'tender'|'owned', hydroDriven?, baseloadFloor?
  regulator:  RegulatorProfile     // name, model 'riio'|'profit-cap'|'cost-of-service', kpiWeights?
  market:     MarketProfile        // baseMWh, peakMWh, middayDipMWh, seasonalUplift,
                                    //   scarcityRegime, scarcityKickMWh, droughtUplift?, gridCarbonG
}
```

`LONDON_PROFILE` is the default; every consumer falls back to it, so London is
bit-identical and the determinism golden tests hold.

### 1.2 How a scenario resolves to a profile (`src/data/cityRegistry.ts`)

```
CityScenario { id, name, build, power?, weatherProfile?, economy?,
               generation?, regulator?, market?, difficulty?, unlockAtRank? }

resolveProfile(s) → fills each optional block with LONDON_PROFILE.<block>
profileOf(scenarioId) → resolveProfile(getScenario(scenarioId))
```

And `src/sim/state.ts → newContext(scenarioId)` does
`profile: profileOf(scenarioId)`, so **`SimContext.profile` is the single
threaded source of truth**. The sim reads `ctx.profile.*` everywhere (verified:
`tick.ts` passes `ctx.profile.weather/power/market/economy/generation` to the
dispatch + bill + weather + report-card code).

### 1.3 What is WIRED vs DORMANT today

| Field | Consumer | Status |
|---|---|---|
| `power.nominalHz/freqFloorHz/droopHz` | `market/frequency.ts` | ✅ **wired** (defaults to `LONDON_POWER`) |
| `power.transmissionKv/distributionKv` | display only (future voltageChooser) | ⚠ data only |
| `weather.*` (season/sun/regimes) | `events/weather.ts`, dispatch | ✅ **wired** |
| `economy.*` (currency, shares, uplift) | `regulation/bill.ts → computeBill` | ✅ **wired** |
| `market.*` (price shape incl. `droughtUplift`) | `market/dispatch.ts → nationalPriceMWh` | ✅ **wired** |
| `regulator.kpiWeights` | `riio.ts → resolveWeights`, `tick.ts closePeriod` | ✅ **wired** |
| `regulator.model` ('riio'/'profit-cap'/'cost-of-service') | report-card framing | ⚠ **dormant** — selected but no branch yet |
| `regulator.name` | chrome | ⚠ data only (not yet shown) |
| `generation.ownership: 'owned'` | `bill.ts → computeBill` owned branch | ⚠ **wired in bill, never activated** (no city sets it) |
| `generation.baseloadFloor` (FR nuclear) | dispatch | ❌ **dormant hook** (documented, not consumed) |
| `generation.hydroDriven` (BR) | dispatch | ❌ **dormant hook** |
| `market.gridCarbonG` | carbon KPI / import carbon | ❌ **dormant** (data shipped, not consumed) |
| Per-country **tender flow** (FR nuclear / HK no-tender / AU solar-skew) | `events/developers.ts` | ❌ **not branched** |

**The four country profiles (`FRANCE_*`, `AUSTRALIA_*`, `HONGKONG_*`,
`BRAZIL_*`) are not referenced by any `CityScenario`.** That is the headline gap.

So the design splits into: **(A) wire the existing profiles to cities** (trivial,
high payoff), **(B) activate the dormant hooks** (`owned`, `baseloadFloor`,
`hydroDriven`, `gridCarbonG`, `regulator.model` framing), and **(C) the new
mechanics** (per-country tender flow, theft, islands, loadshedding, bandeira).

---

## 2. The city → country mapping

A city scenario doesn't need to "know its country" — it just sets the profile
blocks. But because **many cities share a country**, we factor the country
profiles once and have each city reference them. Two equivalent approaches:

### 2.1 Recommended: a `COUNTRY_PROFILES` table + a `country` tag

Add to `powerProfile.ts` (or a new `countryProfiles.ts`):

```ts
export interface CountryProfile {
  power: PowerSystemProfile;
  weather: WeatherProfile;       // a country *default*; a city may still override
  economy: EconomyProfile;
  generation: GenerationModel;
  regulator: RegulatorProfile;
  market: MarketProfile;
}

export const COUNTRY_PROFILES: Record<CountryId, CountryProfile> = {
  GB:  LONDON_PROFILE,                 // already the default
  FR:  { power: FR_POWER, weather: FR_WEATHER, economy: FR_ECONOMY,
         generation: FR_GENERATION, regulator: FRANCE_REGULATOR, market: FRANCE_MARKET },
  AU:  { ... AUSTRALIA_REGULATOR, AUSTRALIA_MARKET ... },
  HK:  { ... HONGKONG_REGULATOR, HONGKONG_MARKET, generation: { ownership:'owned' } ... },
  BR:  { ... BRAZIL_REGULATOR, BRAZIL_MARKET, generation: { ownership:'tender', hydroDriven:true } ... },
  US, DE, CN, EG, GR, ZA, IN: ...
};
```

Then a scenario maps to a country, and `resolveProfile` prefers the country
profile under a per-city override:

```ts
CityScenario { ..., country?: CountryId }   // additive, optional; absent ⇒ GB

resolveProfile(s) {
  const base = s.country ? COUNTRY_PROFILES[s.country] : LONDON_PROFILE;
  return {
    power:      s.power      ?? base.power,
    weather:    s.weatherProfile ?? base.weather,   // city can still localise season/sun
    economy:    s.economy    ?? base.economy,
    generation: s.generation ?? base.generation,
    regulator:  s.regulator  ?? base.regulator,
    market:     s.market     ?? base.market,
  };
}
```

This keeps the **existing override mechanism intact** (London declares no
`country` → `LONDON_PROFILE`, bit-identical) while letting Sydney just say
`country: 'AU'` and inherit the whole AU profile, with room to localise (e.g.
Sydney's exact `peakDoy`).

### 2.2 City → country roster (the 12 cities in `CITY_SCENARIOS`)

| Scenario id | City | Country tag | Profile source |
|---|---|---|---|
| `london` | London | **GB** | `LONDON_PROFILE` (default — no tag) |
| `paris` | Paris | **FR** | France profile |
| `newyork` | New York | **US** | USA profile (60 Hz, nodal/ISO) |
| `sydney` | Sydney | **AU** | Australia profile (duck curve, summer) |
| `hongkong` | Hong Kong | **HK** | Hong Kong profile (`owned`, SoC) |
| `berlin` | Berlin | **DE** | Germany profile (negative prices, redispatch) |
| `shanghai` | Shanghai | **CN** | China profile (`owned`, state) |
| `capetown` | Cape Town | **ZA** | South Africa profile (loadshedding) |
| `cairo` | Cairo | **EG** | Egypt profile (solar, subsidy, new nuclear) |
| `athens` | Athens | **GR** | Greece profile (islands) |
| `pune` | Pune | **IN** | India profile (DISCOM losses, theft) |
| `northeast` | NE England | **GB** | `LONDON_PROFILE` (same country as London) |

Note **NE England = GB** (same operating model as London — only the *map* and
*weather localisation* differ; it should NOT get a bespoke country profile, just
the GB one). Likewise any future GB city.

### 2.3 Frequency reality check

Only **two near-term countries are 60 Hz: the USA and Brazil.** Everyone else
(GB/FR/AU/HK/DE/CN/EG/GR/ZA/IN) is **50 Hz**. So `nominalHz: 60` is the
exception, set only on US + BR profiles.

---

## 3. How each subsystem branches per country

### 3.1 Market price (`market/dispatch.ts → nationalPriceMWh`) — ✅ already generic

This is the cleanest seam — it already takes a `MarketProfile` and produces the
whole price series from data:

- **France** — low flat (nuclear floor): `baseMWh 38, peakMWh 34`.
- **Australia** — duck curve: `middayDipMWh 115` → noon goes negative; summer.
- **Brazil** — `droughtUplift 0.6` → dry half-year multiplies the price.
- **Hong Kong** — high stable gas: `baseMWh 72`, low volatility.

**No code change needed** beyond wiring the profile to the city. The biggest
single-line *feel* changes (Sydney duck curve, Brazil drought) are already
expressible in data.

### 3.2 Regulator report card (`riio.ts`, `tick.ts closePeriod`)

- **KPI weights** — ✅ already wired via `resolveWeights(ctx.profile.regulator.kpiWeights)`.
  The four country `kpiWeights` (HK reliability-heavy, AU curtailment-heavy, FR
  carbon-light, BR DEC/FEC-heavy) flow straight through. **No code change.**
- **`regulator.model` framing** — ⚠ needs a small branch in the **report-card UI**
  (`src/ui/`) + the period-close event text: choose the framing per model —
  *"Ofgem RIIO incentive review"* (riio) / *"Scheme of Control — permitted-return
  review"* (profit-cap) / *"CRE / ANEEL prudent-cost review"* (cost-of-service).
  Pure presentation; reads `ctx.profile.regulator.{name,model}`.
- **Initial targets** — `initialTargets()` is currently global. HK should open
  with *tighter* reliability targets (world-best CI/CML); make `initialTargets`
  take the profile (or add a per-profile target multiplier) so HK's targets are
  stricter and SA's looser (loadshedding reality). Additive; GB unchanged.

### 3.3 Generation ownership + bill (`regulation/bill.ts → computeBill`)

- **`ownership: 'owned'`** — ✅ **fully wired in the bill engine already** (the
  `owned` branch routes gen capex into the network pot, zeroes the PPA top-up).
  It has just **never been activated** because no city sets it. Activating it for
  **HK + Shanghai (+ Cairo/Egypt single-buyer)** is a *data* change — set
  `generation: { ownership: 'owned' }` on those profiles. The dependent work is
  in the **tender flow** (§3.4), not the bill.
- **`baseloadFloor` (France nuclear)** — ❌ new dispatch code: a must-run fraction
  of demand met by a zero-marginal-cost, near-zero-carbon baseload before the
  merit order stacks. Lowers price + carbon, and *curtails firm renewables in
  surplus* (the French "nuclear crowds out renewables" effect).
- **`hydroDriven` (Brazil)** — ❌ new dispatch code: a reservoir state that swings
  available hydro with the season (drives `droughtUplift` + the bandeira flag).
  Can start simple (reservoir = `1 - dryness` from the season factor).
- **`gridCarbonG`** — ❌ new: feed it into the **carbon KPI** (the import + the
  national-benchmark carbon) so France reads ~20 g and Australia/HK/ZA read
  high. Currently the carbon KPI is computed from the player's own plant only;
  `gridCarbonG` should colour imports + the unmet/benchmark portion.

### 3.4 Tender / developer flow (`events/developers.ts`) — the biggest *new* work

Today the developer market is GB-shaped (8 GB-named developers, GB tech
appetites, quarterly CfD-style allocation rounds). Per country it must branch:

- **`'owned'` countries (HK, Shanghai, Egypt single-buyer)** — **no tender at
  all.** The player builds plant directly (a new "build generation" command path
  that creates an owned `GenAsset` with no `developer`/`ppaMWh`, capex → network
  pot). `stepTenders` / allocation rounds are **skipped** when
  `ctx.profile.generation.ownership === 'owned'`. This is the single biggest
  gameplay fork and needs a UI affordance (build-a-power-station vs designate-a-
  tender).
- **`'tender'` countries** — keep the market but **localise**:
  - **Developer roster per country** — GB has "Voltaic Brothers", "Thames Estuary
    Renewables"; France should have EDF-flavoured + RES developers, Australia the
    "gentailers" (AGL/Origin) + solar/battery funds, Brazil the auction IPPs.
    Factor `DEVELOPERS` into a per-country list (or tag each developer with the
    countries it bids in). Flavour + appetite skew (AU bids skew solar/battery;
    France renewables bid against the nuclear floor).
  - **Procurement cadence** — Brazil/France run *national forward auctions* with
    *very long* PPAs; the game's quarterly allocation round already models this
    well — mostly a naming/lead-time tweak.
  - **France nuclear option** — optionally a *regulated nuclear* offer in the
    tender flow (ARENH-successor): a state baseload the player can elect.

### 3.5 Weather / disasters (`events/weather.ts`, `events/incidents.ts`)

`WeatherProfile` already carries `peakSeason` + regimes. Per country the
*disaster* differs (the incident class):

| Country | Disaster season | New incident class |
|---|---|---|
| GB | winter storms | (baseline) |
| France | winter cold-snap (thermosensitivity) | sharper cold-demand |
| Australia | summer **bushfire** + heatwave | bushfire/heat de-energisation |
| Hong Kong | summer **typhoon** | typhoon (storm regime, summer) |
| Brazil | summer **flood/landslide** (morros) | flood/landslide |
| USA | **hurricane** + **wildfire/PSPS** | hurricane; wildfire de-energisation |
| Egypt | **sandstorm (khamsin)** + heat | dust derate on solar |
| South Africa | **loadshedding** (not weather — capacity) | rolling planned outage stages |

`peakSeason: 'summer'` flips the whole season model for AU/HK/EG/IN (+ BR/ZA
southern-hemisphere nuance). The incident classes are the per-country
*characterful* layer — sequence them after the profile wiring.

---

## 4. Determinism & test guardrails (non-negotiable)

The seam was built to keep **London bit-identical**, and every wave must hold
that line:

1. **London declares no `country`/profile blocks** → `resolveProfile` returns
   `LONDON_PROFILE` → every consumer's default path → byte-identical render +
   identical golden tests. This invariant must survive every PR.
2. **The dispatch golden test** (a year × every hour × dunkelflaute) must stay
   green for GB; each new country gets its *own* golden snapshot so a profile
   tweak can't silently drift.
3. **Per-country unit tests that prove the seam bites** (the pattern already used
   in `tests/powerProfile.test.ts` / `tests/cityScenario.test.ts`): e.g. "the
   same network scores differently under HK vs Ofgem vs AER", "Sydney's noon
   price goes negative", "Brazil's dry-season price exceeds its wet-season
   price", "an `owned` city's gen capex lands in the network pot, not a PPA".
4. **Activating a profile on a city is a save-compat event** only if it changes
   map geometry — it does **not** (profiles are sim config, not map), so
   `SAVE_VERSION` need not bump for §A wiring. Bump only if a new mechanic
   changes serialized state (e.g. reservoir state, theft fraction).
5. No new egress; all figures are baked data from the country docs.

---

## 5. Phased implementation plan (PR-by-PR)

Sequenced highest-payoff / lowest-risk first. Each phase is a self-contained,
green, design-gated PR. **Phases A–B are mostly wiring of already-shipped data.**

### Phase A — Wire the four near-term profiles to their cities *(data-only, ~1 PR)*

- Add the `country` tag + `COUNTRY_PROFILES` table (or directly attach the
  existing `FRANCE_*`/`AUSTRALIA_*`/`HONGKONG_*`/`BRAZIL_*` blocks to the
  `paris`/`sydney`/`hongkong` scenarios, **except** the `owned` fork which waits
  for Phase C).
- Add `power`/`weather`/`economy` blocks for FR/AU/HK/BR (currencies, 60 Hz for
  BR, summer peak for AU/HK, FR thermosensitivity).
- **Wired immediately by existing consumers:** the market price shape, the KPI
  weights, the currency + bill shares, the frequency. So Sydney instantly gets
  the duck curve + summer peak; France the flat nuclear market + carbon-light
  regulator; Brazil the drought uplift + 60 Hz; HK the high-stable market + SoC
  weights.
- **Hold back** for Phase C: the `owned` fork (HK still resolves with
  `ownership:'tender'` in this PR), `baseloadFloor`, `hydroDriven`, the new
  disasters.
- **Tests:** per-city golden market snapshots; "Sydney noon < 0"; "FR carbon
  weight ≈ 0.05 in the card"; London byte-identical.
- **Payoff:** four cities *feel* distinct from London immediately, with near-zero
  risk.

### Phase B — Activate the carbon + regulator-framing hooks *(small, ~1 PR)*

- `market.gridCarbonG` → the carbon KPI / import carbon (France reads ~20 g,
  AU/HK high). Per-country grid-carbon now scores.
- `regulator.model` + `regulator.name` → report-card framing text + chrome label
  (RIIO vs Scheme-of-Control vs prudent-cost). Pure presentation.
- Per-profile `initialTargets` (HK tighter reliability, SA looser).
- **Tests:** "France's carbon KPI beats GB's on the same plant"; framing strings
  per model. London unchanged.

### Phase C — The `owned` vertical-integration fork (HK first) *(medium, ~1-2 PRs)*

- Activate `generation: { ownership: 'owned' }` for **Hong Kong** (then Shanghai,
  then Egypt's single-buyer).
- New **build-generation** command path: an owned `GenAsset` (no developer, no
  `ppaMWh`); capex annuitises into the network pot (the bill engine already does
  this — verify the owned branch end-to-end).
- **Skip `stepTenders` / allocation rounds** when `ownership === 'owned'`; the
  inbox/UI offers "build a power station" instead of "designate a tender".
- `profit-cap` scoring nuance: prudent-RAB build rewarded; returns above the cap
  handled (the SoC tariff-stabilisation idea).
- **Tests:** "an owned city has no tenders"; "owned gen capex is in the network
  pot, not a PPA"; "the bill total for an owned city excludes the PPA line".
- **Payoff:** the structural showcase — Hong Kong plays *fundamentally*
  differently (you build the plant, capex earns the return).

### Phase D — France nuclear baseload + Brazil hydro/drought dispatch *(medium, ~1-2 PRs)*

- `generation.baseloadFloor` → must-run nuclear in dispatch (France): lowers
  price/carbon, curtails firm renewables in surplus.
- `generation.hydroDriven` + a **reservoir state** → Brazil: seasonal hydro
  swing driving `droughtUplift`; surface the **bandeira flag** on the bill HUD.
- **Tests:** "France curtails firm renewables under nuclear surplus"; "Brazil's
  bandeira goes red in the dry season and the bill rises".

### Phase E — Per-country tender rosters + procurement flavour *(medium, ~1 PR)*

- Factor `DEVELOPERS` into per-country rosters (or country-tag each developer);
  France EDF/RES-flavoured, Australia gentailers + solar/battery funds, Brazil
  auction IPPs, etc. Appetite skews per country.
- Procurement-cadence naming (national forward auctions for FR/BR).
- **Tests:** "Sydney's bids skew solar/battery"; "France offers a regulated
  nuclear option".

### Phase F — The characterful new mechanics *(the long tail, several small PRs)*

The novel, high-flavour seams — each its own small PR, sequence by appetite:

- **South Africa loadshedding** — rolling planned-outage *stages* as a
  generation-inadequacy mechanic (reliability KPI craters by stage). The most
  distinctive new mechanic; pairs with Cape Town.
- **Brazil/India non-technical losses (theft / "gatos")** — a fraction of
  delivered energy unbilled, reducible by capex (smart meters). The most *novel*
  mechanic in the roster.
- **Greece non-interconnected islands** — expensive diesel islands you cable in
  (a distinctive *network* puzzle; bill + carbon collapse when the interconnector
  lands).
- **Egypt fuel subsidy** — artificially low bills propped by the Treasury; the
  regulator's test is *weaning off the subsidy*.
- **USA nodal LMP + congestion** — locational price spreads + the
  capacity-market-vs-energy-only toggle (ERCOT scarcity vs PJM capacity).
- **Germany redispatch + north-south bottleneck** — curtail-here / pay-there +
  the HVDC reinforcement; negative prices already in the market shape.
- **Per-country disasters** — bushfire (AU), typhoon (HK), flood/landslide (BR),
  hurricane + wildfire-PSPS (US), sandstorm (EG).

---

## 6. Summary — the one-paragraph plan

The per-country seam is **already architected and half-built**: the profile
types, the resolve/thread machinery, four country market + regulator profiles,
the `owned`-bill branch, and the `droughtUplift`/`baseloadFloor`/`hydroDriven`/
`gridCarbonG` hooks all exist. **Phase A is pure wiring** (attach the existing
FR/AU/HK/BR profiles to their cities via a `country` tag) and delivers four
visibly distinct cities at near-zero risk. **Phases B–E activate the dormant
hooks** (carbon scoring, regulator framing, the `owned` fork, nuclear/hydro
dispatch, per-country tenders). **Phase F** adds the characterful novelties
(loadshedding, theft, islands, subsidy, nodal pricing, redispatch, disasters)
one small PR at a time. London stays byte-identical throughout — that invariant
is the contract every PR must keep.

### Quick-reference: per-country profile knobs

| Country | Hz | peakSeason | ownership | regulator.model | market headline | special hook |
|---|---|---|---|---|---|---|
| **GB** | 50 | winter | tender | riio | evening peak, dunkelflaute | (baseline) |
| **FR** | 50 | winter | tender | cost-of-service | low flat (nuclear) | `baseloadFloor`, carbon ~20g |
| **AU** | 50 | summer | tender | riio | **duck curve (negative noon)** | curtailment KPI, bushfire |
| **HK** | 50 | summer | **owned** | profit-cap | high stable gas | **8% RoR on assets**, typhoon |
| **BR** | **60** | summer | tender | cost-of-service | hydro + **drought uplift** | `hydroDriven`, bandeira, theft |
| **US** | **60** | summer* | tender | riio (PBR) | **nodal LMP** | capacity vs energy-only, hurricane/PSPS |
| **DE** | 50 | winter | tender | riio | **negative prices** | redispatch, north-south HVDC |
| **CN** | 50 | summer* | **owned** | cost-of-service | high coal | state plan, **UHV import** |
| **EG** | 50 | summer | owned/single-buyer | cost-of-service | gas + cheap solar | **subsidy**, new nuclear, sandstorm |
| **GR** | 50 | summer | tender | riio | solar + lignite | **islands**, tourist peak |
| **ZA** | 50 | winter* | owned→unbundling | rate-of-return | high coal | **loadshedding stages**, arrears |
| **IN** | 50 | summer | mixed | cost-of-service | coal + cheap solar | **AT&C losses/theft**, cross-subsidy |

\* peakSeason for US/CN/ZA varies by region/load — see the individual country
doc; pick the dominant city's season (e.g. ZA actually winter-evening-peaking
despite being southern hemisphere — verify per the South Africa doc).
