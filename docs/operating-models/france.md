# Operating model — France 🇫🇷  (Paris)

> **Near-term target.** The market + regulator profiles already exist in code
> (`FRANCE_MARKET`, `FRANCE_REGULATOR`) but are **not yet wired to the `paris`
> scenario** (Paris resolves to `LONDON_PROFILE` today). This doc specifies the
> full France profile and the seams worth turning on.

---

## One-line identity

A **state-dominated, monopoly-network, ~70% nuclear** system where the regulator
runs a **cost-of-service tariff (TURPE)** rather than GB-style incentives — the
grid is famously clean and cheap-ish but **brutally weather-sensitive** because
the country heats with electric resistive heating, so winter cold snaps, not
calm-cold dunkelflaute, are the stress event.

---

## Transmission vs distribution

France is liberalised on paper (EU rules) but in practice the wires are two
near-total monopolies, both descended from state utility EDF:

- **Transmission — RTE (Réseau de Transport d'Électricité).** The single TSO,
  owns and operates the 400 kV / 225 kV / 90 kV / 63 kV grid. Legally unbundled
  EDF subsidiary; majority state-influenced (EDF + Caisse des Dépôts). RTE also
  runs the huge cross-border interconnector fleet (France is Europe's biggest
  power *exporter* in a normal nuclear year).
- **Distribution — Enedis (ex-ERDF).** Operates ~**95%** of the French
  distribution network (HTA 20 kV → BT 400/230 V) under concession contracts
  with the *communes* (the local authorities legally own the distribution
  assets and grant Enedis a long concession). The remaining ~5% is ~**150 local
  distribution companies (ELD / entreprises locales de distribution)**, e.g.
  Électricité de Strasbourg, GEG in Grenoble, SRD in Vienne.
- **Generation — EDF.** Still overwhelmingly owned by EDF (the ~56-reactor
  nuclear fleet + most hydro), **fully renationalised in 2023** (the French
  state bought out minority shareholders). So although there *is* a wholesale
  market, the generation behind it is a single state actor.

**Mapping to the player:** France is closer to GB's structure than the
vertically-integrated cities (HK/Shanghai) — the player is still the wires.
Keep `ownership: 'tender'` but with a **deep nuclear baseload floor** under the
merit order (see Distinctive Seams).

---

## Regulator

**CRE (Commission de régulation de l'énergie).** Crucially, France runs
**cost-of-service / cost-plus** regulation, **not** RIIO incentives:

- The network tariff **TURPE** (Tarif d'Utilisation des Réseaux Publics
  d'Électricité) is set by CRE to cover the *efficient* costs of RTE and Enedis
  plus a regulated **return on the regulated asset base (RAB)** — a classic
  cost-of-service revenue requirement. The current edition **TURPE 7** runs
  **2025–2028** (TURPE 7 HTB from August 2025); HTB high-voltage tariffs rose
  ~5% on 1 Nov 2024 under the TURPE 6 revision. *(source: CRE, RTE services
  portal.)*
- By 2028 the operators' planned annual investment is **~€6.2 bn (RTE) + ~€7 bn
  (Enedis)** — TURPE recovers that. *(source: CRE.)*
- There are **light incentive bolt-ons** (quality-of-service bonus/malus, R&D)
  but the philosophy is "recover prudent cost", not "share the upside of
  out-performance". → game `model: 'cost-of-service'`.
- Because the nuclear fleet already makes the grid ~near-zero-carbon, **carbon is
  not the political wire** — affordability and reliability are. The shipped
  `FRANCE_REGULATOR` pares carbon weight right back (0.05) and redistributes to
  **bill (0.30)**, satisfaction (0.22), CI (0.16), CML (0.15).

---

## How generation is procured

A mixed picture — there *is* a market, but the dominant plant is state-built:

- **Wholesale market.** EPEX SPOT day-ahead/intraday, coupled to the EU single
  market; the merit order is set by the cheap, must-run **nuclear + hydro**
  baseload, so the price is **low and flat** most of the time, spiking only when
  cold demand exceeds the fleet (then France *imports* and the price flies).
- **Nuclear** is state strategy, not a tender: EDF builds reactors (the
  Flamanville EPR finally connected late 2024; a programme of **6 new EPR2**
  reactors is committed). In game terms this is the **baseload floor**, not a
  developer auction.
- **The ARENH legacy** (Accès Régulé à l'Électricité Nucléaire Historique) let
  competitors buy EDF nuclear output at a regulated price (€42/MWh); it **expired
  end-2025** and is being replaced by a new long-term nuclear pricing scheme
  (CfD-like clawback above a reference price). This is a uniquely French market
  mechanism — *regulated access to incumbent nuclear*.
- **Renewables** are procured via **CRE tenders / appels d'offres** (solar PV,
  onshore + offshore wind) with a **complément de rémunération** (a feed-in
  premium / CfD-style top-up). So new renewables *do* look like the game's
  tender market — but they bid into a system already floored by nuclear.

**Net:** keep the developer tender for renewables/gas/battery, but model the
**must-run nuclear baseload** that makes those tenders compete against a
near-zero-marginal-cost floor (renewables get curtailed in nuclear surplus).

---

## Tariff & network-charge structure (TURPE)

- **Network pot = TURPE.** Recovers RTE + Enedis costs (cost-of-service). Like
  GB's DUoS/TUoS, it is a use-of-system charge, but set on prudent-cost + RAB
  return rather than an incentive allowance.
- **Energy pot.** Wholesale (nuclear-floored) + the **CSPE / accise sur
  l'électricité** (the electricity excise, France's main energy tax — slashed
  during the 2022-24 crisis "bouclier tarifaire" price shield, then partly
  restored) + supplier margin. The state-set **tarifs réglementés de vente
  (TRV / "Tarif Bleu")** by EDF still anchor most households, with CRE setting
  the level.
- Currency **€ / EUR** (`toGbp ≈ 0.85`). 50 Hz.
- French electricity is comparatively **cheap and very low-carbon** by EU
  standards (the nuclear dividend), though the 2022-25 crisis + EDF's debt + new
  build are pushing TURPE and the excise up.

---

## Retail vs network split

Liberalised retail since 2007 (TotalEnergies, Engie, Octopus, etc. compete) but
the **EDF regulated tariff (Tarif Bleu)** still serves a large majority of
households — retail competition is real but the incumbent dominates. As in GB
the player is the *network*; the retail layer is the energy pot's uplift.

---

## Renewables support schemes

- **CRE tenders (appels d'offres)** for utility solar + wind, awarding a
  **complément de rémunération** (feed-in premium on top of the market).
- **Obligation d'achat** (legacy feed-in tariff) for small/rooftop.
- Offshore wind ramping (Saint-Nazaire online, more in build).
- France's headline is decarbonisation-by-nuclear, so the renewables target is
  more modest than Germany's — solar + offshore wind to *complement* the fleet.

---

## Distinctive seams (what makes France feel different from GB)

| Seam | What it is | Game lever |
|---|---|---|
| **Cost-of-service, not incentives** | TURPE recovers prudent cost + RAB return; no RIIO upside-sharing, lighter penalties. Report-card framing changes ("CRE prudent-cost review", not "Ofgem incentive"). | `regulator.model = 'cost-of-service'` + report-card framing text |
| **Deep nuclear baseload floor** | ~65-70% nuclear must-run → wholesale low + flat; renewables curtailed in nuclear surplus; near-zero carbon. | `market` low flat (floor 38, peak 34), `generation.baseloadFloor` (~0.6) wired into dispatch + a near-zero `gridCarbonG` (20 g) |
| **Carbon is a non-issue; affordability + service are the wire** | Grid already clean, so CRE/politics weigh bills + reliability, not carbon. | `regulator.kpiWeights` carbon 0.05, bill 0.30 (`FRANCE_REGULATOR`) |
| **Thermosensitivity — electric heating** | France heats with resistive electric heating; a cold snap can add **~2.4 GW per °C** of demand. The stress event is *cold*, not GB's calm-cold *wind drought*. Winter peak is sharper than GB's. | `weather.peakSeason: 'winter'` (keep) but a **stronger cold-demand coefficient**; `scarcityRegime: 'calm-cold'` retained (cold = scarcity) |
| **Export-normally, import-in-crisis** | France usually exports via interconnectors; in a cold/low-availability winter it flips to a price-taking importer. | market `scarcityKickMWh` 55 on cold; interconnector flips sign |
| **Regulated nuclear access (ARENH → new scheme)** | A uniquely French *regulated price for incumbent nuclear* — a flavour mechanic for the tender/energy line. | optional: a regulated nuclear strike option in the tender flow |
| **Communes own the distribution assets** | Enedis operates under concession; the *local authority* owns the wires. A flavour/lore seam for the connection narrative. | narrative only (no mechanic needed v1) |

---

## Numbers & sources (France)

- **Frequency:** 50 Hz. Voltages: 400/225/90/63 kV transmission; 20 kV HTA / 400-230 V BT distribution.
- **Generation mix (2023-24):** nuclear ~**65-70%**, hydro ~11%, wind ~8%, solar
  ~4%, gas ~5%, the rest. France is the world's most nuclear-heavy major grid.
  *(source: RTE bilan électrique; Ember.)*
- **Grid carbon intensity:** ~**20-60 gCO₂/kWh** annual — among the lowest of any
  large economy. Game uses **20 g** (`FRANCE_MARKET.gridCarbonG`). *(source:
  RTE / ElectricityMaps.)*
- **Thermosensitivity:** ~**+2.4 GW/°C** in winter cold (RTE figure) — the
  defining demand feature. *(source: RTE.)*
- **TURPE 7:** 2025-2028; investment ~€6.2 bn RTE + ~€7 bn Enedis/yr by 2028;
  HTB +~5% Nov 2024. *(source: CRE, RTE.)*
- **EDF:** fully renationalised 2023; Flamanville EPR connected Dec 2024; 6×EPR2
  committed. *(source: EDF / French govt.)*

Sources:
[CRE 2024 Activity Report](https://www.cre.fr/fileadmin/Documents/Rapports_et_etudes/2025/CRE_RA2024-en.pdf) ·
[RTE TURPE explainer](https://www.services-rte.com/en/learn-more-about-our-services/understanding-the-public-transmission-system-access-tariff-turpe.html) ·
[RTE bilan électrique](https://www.rte-france.com/) ·
[Ember](https://ember-energy.org/).

---

## Suggested profile values

```ts
// powerProfile.ts — already shipped as FRANCE_MARKET / FRANCE_REGULATOR;
// add power/weather/generation/economy and wire to the paris scenario.
power:       { nominalHz: 50, freqFloorHz: 47.5, droopHz: 1.5,
               transmissionKv: [400, 225, 90], distributionKv: [20, 0.4] }
weather:     peakSeason 'winter', peakDoy 15, like LONDON_WEATHER but a
             STRONGER cold-demand coefficient (thermosensitivity)
generation:  { ownership: 'tender', baseloadFloor: 0.6 }   // must-run nuclear
regulator:   FRANCE_REGULATOR  (CRE, cost-of-service, carbon 0.05/bill 0.30)
market:      FRANCE_MARKET  (floor 38, peak 34, middayDip 6, seasonalUplift
             0.22, scarcity calm-cold +55, carbon 20 g)
economy:     { symbol: '€', iso: 'EUR', toGbp: 0.85, domesticNetworkShare 0.30,
               domesticEnergyShare 0.42, retailUplift ~2.6, supplyFixedYr ~140 }
```

**First seam to wire (highest contrast, lowest risk):** the
`cost-of-service` regulator framing + the carbon-light KPI weights + the flat
nuclear market — these already exist as data; the only new code is
`baseloadFloor` into dispatch and the report-card framing text.
