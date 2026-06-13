# RIIO-ED3 coverage map — how far ElectriCity teaches the SSMD

**Question (owner, 2026-06-13):** "How much would we need to adapt the game to
really teach the ins and outs of RIIO-ED3?" — anchored on Ofgem's **RIIO-ED3
Sector Specific Methodology Decision (SSMD)**.

This doc: (1) extracts the SSMD's core building blocks from the actual Ofgem /
analyst documents, (2) maps each to what ElectriCity models today
(YES / PARTIAL / NO with a one-line basis), and (3) groups the gaps into sized
work packages, with an overall coverage estimate and a phased plan.

> Honesty note up front. ElectriCity today is a **physical-network + outcomes**
> simulator with a *RIIO-flavoured wrapper* (5-year report cards on six KPIs).
> It teaches what a network is and why reliability/carbon/curtailment trade off
> against the bill extremely well. It teaches the **regulatory-finance machine**
> of RIIO — the totex/RAV/return/sharing engine that ED3 is *actually about* —
> barely at all. So coverage is high on "what a DNO does" and low on "how the
> price control pays for it", which is the inverse of what the SSMD is.

---

## Provenance & dates (so this doesn't rot)

- **ED3 Framework Decision** — Ofgem, 30 April 2025 (`OFG1164`). Confirmed the
  output framework (LOs / ODIs / PCDs), 5-year control, NESO Regional Energy
  Strategic Plans (RESPs) feeding investment.
- **ED3 SSMC** (consultation) — Ofgem, 8 October 2025; responses to 3 Dec 2025.
- **ED3 SSMD** (decision) — Ofgem, **21 May 2026** (core document + Cost
  Assessment Annex + Climate Resilience Metrics & Indicators Annex). This is the
  anchor document.
- Cross-read against the **RIIO-3 (GD&T) Final Determinations**, 4 Dec 2025,
  whose finance methodology ED3 largely inherits — that's where the hard
  numbers (cost of equity, debt, asset life) come from.

Sources are listed at the bottom. (Ofgem and most analyst PDFs 403'd direct
fetch from this environment; figures below are taken from indexed snippets of
the Ofgem documents and Oxera/Ashurst/Energy-UK analysis, cross-checked across
multiple sources. Where a number is "indicative for business planning" the SSMD
says so explicitly — the binding figure lands at ED3 Draft/Final Determinations
in 2027.)

---

## STEP 1 — The SSMD's core building blocks

### A. The RIIO revenue model (the finance machine)

| Building block | What the SSMD sets out |
|---|---|
| **Totex** | Single pot of total expenditure (capex + opex); no opex/capex bias. Retained. |
| **Totex Incentive Mechanism (TIM) / sharing factor** | Retained, applied to the **totality** of totex. SSMD: a sharing factor **in the 20–50% range is "plausible" for business-planning/financeability** (binding value set at DDs). **ED3 change:** TIM is now **conditional on delivery** — more PCDs, and non-delivery lets Ofgem claw back totex so a company can't keep underspend it didn't earn. |
| **RAV / RAB** | Regulatory Asset Value still the capital base earning a return; indexed to CPIH. |
| **Allowed return / WACC / CAPM** | **Indicative CPIH-real allowed return on capital ≈ 4.35%** (cut-off 31 Mar 2026, for ED3 business planning). Cost of equity via CAPM, in the **~6% CPIH-real** region (RIIO-3 FD landed GD&T cost of equity ≈ 6.12%, ET ≈ 5.70%). **Semi-nominal cost of debt allowance ≈ 5.42%**, set by an indexed trailing-average debt benchmark. |
| **Capitalisation rate** | Share of totex added to RAV (vs expensed/fast-money) — a notional rate per sector; the rest is "fast money" recovered in-period. |
| **Depreciation / asset lives** | **Move from 20-year to 45-year asset life**, **sum-of-digits** profile, transitioning for new additions — creating a **"depreciation holiday"** (lower near-term depreciation revenue) the SSMD explicitly flags. Slows bill impact of a big capex wave. |
| **Indexation** | **CPIH** real framework; RAV and returns indexed; debt indexed. |
| **Business Plan Incentive (BPI)** | Reward/penalty for plan quality — **now calculated against the equity portion of the RAV** (as in GD&T3), **unlike ED2 where it was vs allowed totex**. |
| **Financeability / notional gearing** | Tested at a notional gearing; credit-rating metrics; equity issuance assumptions. |

### B. Outputs & incentives

- **Three-tier output framework retained:** Licence Obligations (LOs),
  **Output Delivery Incentives (ODIs — financial ODI-F and reputational ODI-R)**,
  and **Price Control Deliverables (PCDs)**.
- **PCDs expanded** and given a **£15m materiality threshold**; efficient
  overspend from beneficial scope change can adjust allowance **up**, and
  non-delivery can adjust totex **down** (the TIM-conditionality lever above).
- ED2 had IIS as the single biggest ODI-F plus ~six common ODI-Fs (customer
  satisfaction, complaints, connections, DSO). ED3 reviews/streamlines these.

### C. Reliability (IIS / quality of supply)

- **Interruption Incentive Scheme (IIS)** on **CI** (customer interruptions per
  100) and **CML** (customer minutes lost) retained as the headline reliability
  ODI-F. **ED3 candidate change:** start **incentivising short interruptions**
  (<3 min, currently exempt) where repeated, as they're a real nuisance.
- **Guaranteed Standards of Performance (GSOP)** — per-customer payments when
  the DNO misses individual standards (restoration time, appointments, etc.).

### D. Cost assessment & benchmarking

- **Totex econometric benchmarking** + disaggregated/technical assessment;
  **ongoing efficiency** challenge (RIIO-3 applied a **~1%/yr** baseline totex
  reduction). Regional/company comparison.
- **RESP-led comparability:** NESO's Regional Energy Strategic Plans are meant
  to make load-investment needs more uniform across DNOs and thus more
  benchmarkable.

### E. Net zero & electrification

- **Anticipatory / strategic investment:** build ahead of need (esp. higher
  voltages) because under-capacity in a critical decarbonisation window can cost
  more than early, briefly-underused assets. Funded via centrally-identified
  needs where possible.
- **Load-related expenditure under EV/heat-pump uncertainty:** robust ongoing
  incentives + uncertainty mechanisms so DNOs invest on best data without
  backlog.
- **Flexibility-first:** flexibility valued **consistently against
  reinforcement** in the Connections & Engineering methodology; used to let
  customers connect sooner while reinforcement is built.

### F. The DSO role & connections reform

- **Flexibility procurement** (tendered demand/generation turn-down to defer
  reinforcement); **curtailable / non-firm (flexible) connections**; **queue
  management** and connections-process reform.
- **SSMD connections split:** **"larger" connections** (housing developments,
  **data centres**) vs **"smaller" connections** (new homes, EV chargepoints,
  heat pumps), each with a **tailored incentive package** and timeliness
  standards. (The wider GB reform's "first ready, first connected" queue
  principle is the policy backdrop.)

### G. Consumer vulnerability & service

- **Consumer Vulnerability Incentive (CVI)** (from ED2): rewards/penalties on
  **PSR Reach** and **Social Value** (fuel poverty, low-carbon transition
  support) — carried into ED3, under review.
- **Broad Measure of Customer Service / Satisfaction**, **complaints metric**.

### H. Resilience & climate adaptation

- Post-**Storm Arwen** reforms: stronger **physical resilience**, faster
  restoration, **climate adaptation**. SSMD ships a dedicated **Climate
  Resilience Metrics & Indicators (CRMI) Annex**.
- **Cyber resilience** (NIS / OT security) as a funded, monitored output.

### I. Environment

- **Losses** (~95% of a DNO's business carbon footprint today) — measurement +
  incentive (the ED1 Losses Discretionary Reward is the lineage).
- **SF₆** leakage reduction; **Business Carbon Footprint (BCF)**; biodiversity;
  **Environmental Action Plan** as a reported output.

### J. Uncertainty mechanisms

- **Re-openers**, **volume drivers** (e.g. £/connection or £/MVA load),
  **use-it-or-lose-it (UIOLI)** allowances, **pass-through** costs, and
  **Price Control Deliverables** as the delivery lock. ED3 leans harder on these
  to handle EV/HP volume risk without over-fixing allowances ex ante.

### K. Innovation & digitalisation

- **Network Innovation Allowance (NIA)** (formulaic per-licensee pot) +
  **Strategic Innovation Fund (SIF)** (competitive).
- **Digitalisation & data:** Digitalisation Strategy & Action Plans, open data,
  common data standards — a growing ED3 expectation.

---

## STEP 2 — Does ElectriCity model it?

Legend: **YES** = a real mechanic the player optimises against ·
**PARTIAL** = present but as flavour or a thin proxy · **NO** = absent.

### A. Revenue model / finance machine

| Concept | Verdict | Basis (code) |
|---|---|---|
| Totex (single pot) | **PARTIAL** | `bill.ts` sums capex+opex+flex+constraints+losses into one bill, but it's a **cash bill**, not a regulated totex allowance with an *over/under-spend vs allowance* delta. |
| TIM / sharing factor | **NO** | No allowance, so no over/underspend, so no sharing. The player just pays cash; there is no "you keep X% of savings" lever. |
| RAV / RAB | **NO** | Capex is **annuitised** (`ANNUITY_FACTOR`) straight onto the bill. No asset base that earns a return, indexes, or depreciates. |
| Allowed return / WACC / CAPM | **NO** | No cost of capital; capital is explicitly "unlimited & free" and just hits the bill. |
| Capitalisation rate | **NO** | Annuitisation ≠ capitalisation; no fast-money/slow-money split. |
| Depreciation / asset lives | **NO** | Annuity factor is a fixed flat spread, not sum-of-digits over a 20/45-yr life; ageing exists physically (`reliability/ageing.ts`) but not financially. |
| Indexation (CPIH) | **NO** | Nominal £; no inflation indexation of base or returns. |
| Business Plan Incentive | **NO** | Targets are handed down (`nextTargets`), the player doesn't *submit a plan* to be rated. |

### B. Outputs & incentives

| Concept | Verdict | Basis |
|---|---|---|
| Report-card / composite rating | **YES (flavour-accurate)** | `riio.ts` closes a 5-year period into a weighted composite + A–E grade — the RIIO *shape*, captured well. |
| ODI-F (financial incentives) | **PARTIAL** | KPIs feed a **score**, not a **£ reward/penalty on the bill**. Developer complaints dock the composite (`complaints*3`), which is reputational-ish. No revenue swing. |
| ODI-R (reputational) | **PARTIAL** | The grade *is* reputational, but undifferentiated from financial. |
| PCDs / licence obligations | **NO** | No named deliverables with a £ allowance attached to delivery; no clawback-on-non-delivery. |

### C. Reliability (IIS / GSOP)

| Concept | Verdict | Basis |
|---|---|---|
| CI / CML | **YES** | `kpis.ts` computes CI per 100 and CML per customer exactly the GB way (only previously-served customers count; rebuild grace via `accrue`). Strong. |
| IIS as a £ incentive | **PARTIAL** | CI/CML score into the composite but don't convert to an IIS reward/penalty £ on the bill. |
| Short interruptions (<3 min) | **NO** | Not separately modelled. |
| GSOP per-customer payments | **NO** | No individual guaranteed-standard breach payments. |

### D. Cost assessment & benchmarking

| Concept | Verdict | Basis |
|---|---|---|
| Totex benchmarking vs peers | **NO** | Single-operator game; no comparator DNOs, no efficiency frontier. |
| Ongoing efficiency challenge | **PARTIAL** | `nextTargets` ratchets KPI targets 5% tighter — a *flavour* of the efficiency squeeze, but on outcomes not totex. |
| RESP-led planning | **NO** | No central strategic plan handed to the player. (Internal `forecast.ts`/`planner.ts` exist but aren't a regulator-set RESP.) |

### E. Net zero & electrification

| Concept | Verdict | Basis |
|---|---|---|
| EV/HP demand growth | **YES** | `customers/adoption.ts`, `hpProfile`/`evProfile` in weather/demand drive real load growth the player must reinforce for. |
| Carbon / net-zero dashboard | **YES (as KPI)** | `carbon` g/kWh is a scored KPI; PPA/CfD merit order makes clean dispatch matter. |
| Anticipatory / strategic investment | **PARTIAL** | The player *can* build ahead, and oversizing helps — but there's no *funded* anticipatory allowance or reward for it; it's just spending early. |
| Flexibility-first vs reinforce | **PARTIAL** | Flex market (`flexMarket` tech, dispatch DSR) defers reinforcement physically, but there's no formal flex-vs-reinforce CBA the regulator scores. |

### F. DSO & connections

| Concept | Verdict | Basis |
|---|---|---|
| Flexibility procurement / spend | **YES** | `flexYrK` flexibility-market payments are a real bill line; DSR dispatched in `market/dispatch.ts`. |
| Firm vs flexible (non-firm) connections | **YES** | Connection offers carry firm/flex choice; flex connections curtailed first; constraint payments only to firm (`constraintYrK`, `devCurtailK`). Genuinely good. |
| Connection studies | **YES** | `study.ts` clones state, wires the applicant, re-runs power flow under stress, reports overloaded kit — a real DNO connection assessment. |
| Larger vs smaller connection incentive split | **NO** | Applications exist (`events/applications.ts`, data centres in lore) but no two-track timeliness incentive package. |
| Queue management / "first ready first connected" | **NO** | No connection queue with position/readiness milestones. |
| Late-connection liquidated damages | **PARTIAL** | `penaltyYrK` runs LDs for overdue connections — a sliver of the connections-incentive idea. |

### G. Vulnerability & customer service

| Concept | Verdict | Basis |
|---|---|---|
| Satisfaction (broad measure) | **YES (as KPI)** | `satisfaction` /100 scored; ToU launch dip, etc. model the curve. |
| Complaints | **PARTIAL** | Developer complaints to Ofgem dock the rating — but it's *developer* complaints, not a consumer complaints metric. |
| PSR / CVI / Social Value / fuel poverty | **NO** | No Priority Services Register, no vulnerability reach, no fuel-poverty/social-value output. |

### H. Resilience & climate adaptation

| Concept | Verdict | Basis |
|---|---|---|
| Storms & restoration | **YES** | `weather.ts` regimes + `reliability/faults.ts` storm band + `stormprep.ts` named-storm forecast, surge crews, emergency cuts. Post-Arwen flavour is strong. |
| 3-month rebuild grace | **YES** | `kpis.ts accrue` gate — the regulator's breathing room. |
| Climate adaptation metrics (CRMI) | **NO** | No forward climate-risk metrics/output; resilience is reactive, not a planned/scored adaptation programme. |
| Cyber / OT resilience | **NO** | Not modelled. |

### I. Environment

| Concept | Verdict | Basis |
|---|---|---|
| Losses | **YES** | `lossYrK` — I²R losses bought at marginal price, a DNO bill line; re-conductoring/short routes cut it. Excellent fidelity. |
| Losses as carbon (BCF) | **PARTIAL** | Losses cost money and feed carbon dispatch, but aren't tallied as the BCF the way Ofgem frames them. |
| SF₆ | **NO** | Switchgear gas leakage not modelled. |
| Biodiversity / Env. Action Plan | **NO** | Vegetation is a cost/reliability lever, not a biodiversity output. |

### J. Uncertainty mechanisms

| Concept | Verdict | Basis |
|---|---|---|
| Re-openers / volume drivers / UIOLI / pass-through | **NO** | None of the ex-post allowance-adjustment toolkit exists; the bill is pure cash, so there's nothing to re-open. |

### K. Innovation & digitalisation

| Concept | Verdict | Basis |
|---|---|---|
| Innovation funding | **YES (mechanic)** | `events/innovation.ts` — a levy (`levyPct`) funds pitches that take time, can fail, and unlock permanent capabilities (drones, flex, DLR, smart EV, ToU). Captures NIA spirit well. |
| NIA vs SIF distinction | **PARTIAL** | One undifferentiated levy pot; no formulaic-vs-competitive split, no SIF challenge/showcase. |
| Digitalisation & data | **NO** | No data/digitalisation output. |

### Org layer (not an SSMD block, but adjacent)

`events/directorates.ts` (Asset/Operations/Connections/Customer/Safety/
Regulation-Finance dials, pay & safety inverted-U), `reliability/safety.ts`,
`events/litigation.ts` — a genuinely nice **company-operations** layer that has
no direct SSMD analogue but is exactly the surface where a Regulation/Finance
directorate could *expose* the missing finance machine to the player.

---

## STEP 3 — Adaptation estimate: work packages

Sizing: **S** ≈ a few days; **M** ≈ 1–2 weeks; **L** ≈ 3+ weeks. Each package
notes a **"teaches the concept" minimum** vs a **"full fidelity"** version.

### WP1 — Regulatory-finance engine (the big one) · **L**
*Build the totex→allowance→RAV→return→revenue spine the SSMD is actually about.*
Tie into `src/sim/regulation/`: split the current cash bill into **(a) a
regulated network-revenue track** and (b) the existing energy track.
- Add an **allowance** set at period start (from a benchmark of the player's own
  forecast/asset base), a **capitalisation rate** splitting each year's network
  totex into **fast money** (in-period) and **slow money** (added to a new
  **RAV**), a **RAV** that **indexes (CPIH)**, **depreciates on a 45-yr
  sum-of-digits** profile, and **earns the allowed return (~4.35% CPIH-real)**.
  Allowed revenue = return on RAV + depreciation + fast money + opex.
- Add the **TIM**: bill the player **cash** as today, but the *number that hits
  customers* is the **allowance**, and **(allowance − actual) × sharing factor**
  flows to/from the operator's notional return — so underspending is rewarded,
  overspending shared. This single change makes "capital is unlimited but every
  pound lands on bills" *regulatorily true* rather than literally true.
- **Min version:** one RAV, flat sharing factor (e.g. 25%), CPIH on, 45-yr
  straight-ish depreciation, allowed return on RAV — enough to *feel* totex
  incentive + the depreciation-holiday smoothing. **Full:** sum-of-digits,
  capitalisation per cost category, cost-of-debt indexation, financeability
  (gearing/credit metrics), fast/slow money UI.
- **Teaching payoff: highest.** This is the ED3 SSMD.

### WP2 — Explicit ODIs, PCDs & GSOP (make incentives pay £) · **M**
*Convert scored KPIs into revenue swings, the way ODI-Fs actually work.*
In `riio.ts`, give the headline KPIs a **£/unit incentive rate** with caps/
collars: CI/CML → an **IIS reward/penalty** that adjusts allowed revenue;
satisfaction/complaints → ODI-F; carbon/losses → environmental ODI. Add a
handful of **PCDs**: named deliverables (e.g. "reinforce X to N MVA by period
end", "connect the data-centre cluster") with a **£ allowance** that **claws
back if undelivered** (the ED3 TIM-conditionality). Add **GSOP** per-customer
breach payments on slow restorations (you already track outage duration).
- **Min:** 3–4 ODI-Fs as ±£ on the bill + 2 PCDs + IIS curve.
- **Full:** ODI-R vs ODI-F separation, materiality threshold (£15m-scaled),
  reputational-only metrics, the short-interruption candidate.

### WP3 — Uncertainty mechanisms & business-plan loop · **M**
*Teach the ex-ante/ex-post allowance toolkit.*
At period start the player **submits a plan** (forecasts EV/HP load, picks
flex-vs-reinforce) → **BPI** rates it (now vs **equity RAV** per ED3). During the
period, **volume drivers** (£/connection, £/MVA) auto-adjust allowance as actual
EV/HP volumes diverge from forecast; **re-openers** trigger on big load surprises
or a new data-centre; **UIOLI** allowances expire if unspent. This is the natural
home for the **anticipatory/strategic investment** concept too: a funded
"build-ahead" allowance the player can draw with a CBA.
- **Min:** one volume driver (load) + one re-opener event + BPI score.
- **Full:** the whole kit + RESP hand-down (a regulator-set strategic plan the
  player executes against, enabling benchmarking flavour).

### WP4 — DSO flexibility & connections-reform depth · **M**
*Deepen the already-good flex/connections layer to the SSMD's two-track shape.*
Split applications into **larger** (developments, data centres) vs **smaller**
(homes, EV, HP) with **separate timeliness incentives**; add a **connection
queue** with readiness milestones and **"first ready, first connected"** reordering;
score a **flex-vs-reinforce CBA** the regulator credits. Most plumbing
(`applications.ts`, `study.ts`, `flexYrK`, `penaltyYrK`) already exists.
- **Min:** two-track timeliness incentive on the existing applications.
- **Full:** queue + milestones + scored CBA + curtailable-connection register.

### WP5 — Vulnerability & customer service (CVI/PSR) · **S–M**
*Add the consumer-protection arm the game entirely lacks.*
Introduce a **Priority Services Register** population on the map, a **CVI**
(reward/penalty on PSR reach + social-value/fuel-poverty actions), and a real
**consumer complaints** metric distinct from developer complaints. Hooks into
the existing `customer` directorate and satisfaction KPI.
- **Min:** PSR reach % as a new scored output + CVI £. **Full:** social-value
  programmes, fuel-poverty map layer, vulnerability-aware restoration priority.

### WP6 — Resilience standards & environment outputs · **S–M**
*Forward-looking resilience + the environment block.*
Add a **Climate Resilience** output (a CRMI-style scored adaptation programme —
flood defences, undergrounding, sectionalising — credited as resilience, not just
reactive storm prep), a **cyber/OT resilience** funded output, **SF₆** leakage on
switchgear (small per-asset emission + reduction programme), and frame losses as
**BCF**. Most ties into `stormprep.ts`, `assets.ts`, `lossYrK`.
- **Min:** one resilience-adaptation output + SF₆ line. **Full:** full CRMI
  metric set + Environmental Action Plan output + biodiversity.

### WP7 — Innovation NIA/SIF split & digitalisation · **S**
Split the single levy into **NIA** (formulaic pot) vs **SIF** (competitive
challenge with a showcase/clawback), and add a light **digitalisation/data**
output. Small lift on the existing `innovation.ts`.

---

## Overall coverage & verdict

**Estimated coverage of the RIIO-ED3 SSMD today: ~30–35%.**

Weighted by what the SSMD *is about*:
- **What a DNO physically does & its outcomes** (reliability, losses, flex, firm/
  flex connections, EV/HP load, storms, innovation pipeline, the report-card
  shape): **~70–80% covered — and genuinely good.**
- **The regulatory-finance machine** (totex/TIM/RAV/return/capitalisation/
  depreciation/indexation/BPI), **explicit ODIs/PCDs/GSOP as £**, **uncertainty
  mechanisms**, **vulnerability/PSR**, **forward resilience/environment outputs**:
  **~10–15% covered.** This is the larger half of the SSMD by page count and the
  part network finance/regulation grads must learn — and it's where the game is
  thinnest. Right now the *numbers move the score, not the revenue*; in real ED3
  the whole point is that they move the **revenue**.

### The 3–4 highest-leverage additions (to be a credible teaching tool)

1. **WP1 — the regulatory-finance engine (totex → allowance → RAV → return →
   TIM/sharing, CPIH, 45-yr depreciation).** Nothing else teaches "RIIO" without
   this; it converts the game's existing, excellent bill into a *price control*.
   Single biggest jump in coverage.
2. **WP2 — ODIs/PCDs/IIS/GSOP as real £.** Makes the player's KPIs pay or cost
   revenue, which is how a DNO is actually steered. Pairs naturally with WP1
   (both adjust allowed revenue).
3. **WP3 — uncertainty mechanisms + the business-plan/BPI loop.** Teaches the
   ED3-defining tension: investing under EV/HP uncertainty with re-openers and
   volume drivers instead of a fixed allowance. Also the home for anticipatory
   investment.
4. **WP5 — vulnerability/PSR/CVI.** The cheapest way to close a *whole missing
   limb* of the price control; high pedagogical value per unit effort.

### Phased plan

- **Phase 0 (S, no code risk):** ship an in-game **glossary/"how RIIO pays for
  this"** panel mapping each existing bill line to its real SSMD building block —
  turns the current game into a teaching aid *immediately* while WP1 is built.
- **Phase 1 — "It's a price control" (WP1 + WP2 min):** RAV + allowed return +
  TIM sharing + 45-yr depreciation + IIS/ODI-F £ + 2 PCDs. Coverage ~30% → ~55%.
  This is the must-do core; everything downstream hangs off the allowance.
- **Phase 2 — "Investing under uncertainty" (WP3 + WP4):** business-plan/BPI
  loop, volume drivers, re-openers, anticipatory allowance, two-track connections
  + queue. Coverage ~55% → ~75%.
- **Phase 3 — "The whole consumer/resilience remit" (WP5 + WP6 + WP7):** PSR/CVI,
  CRMI resilience + cyber + SF₆/BCF, NIA/SIF split + digitalisation. Coverage
  ~75% → ~90%+. At this point a network grad could learn the SSMD's shape by
  playing.

**Bottom line for the owner:** the game already nails the *engineering and
outcomes* a network person lives. To "really teach the ins and outs of ED3" the
decisive move is **WP1 — bolt a real totex/RAV/return/sharing engine onto the
existing bill in `src/sim/regulation/`** so that spend becomes *allowance vs
actual* and KPIs become *revenue*, then layer ODIs/PCDs and uncertainty
mechanisms on top. That single architectural change flips the game from
"RIIO-flavoured" to "RIIO".

---

## Sources

- Ofgem — ED3 Framework Decision (OFG1164, 30 Apr 2025): https://www.ofgem.gov.uk/sites/default/files/2025-04/ED3-Framework-Decision.pdf
- Ofgem — ED3 SSMC core document (8 Oct 2025): https://www.ofgem.gov.uk/sites/default/files/2025-10/ED3-sector-specific-methodology-consultation-core-document_clean.pdf
- Ofgem — ED3 SSMC Climate Resilience Metrics & Indicators Annex (Oct 2025): https://www.ofgem.gov.uk/sites/default/files/2025-10/ED3%20SSMC%20Climate%20Resilience%20Metrics%20and%20Indicators%20Annex%20FINAL2_clean.pdf
- Ofgem — ED3 SSMC consultation landing page: https://www.ofgem.gov.uk/consultation/sector-specific-methodology-consultation-electricity-distribution-price-control-ed3
- Ofgem — RIIO-3 SSMD Overview (OFG1163): https://ofgem.gov.uk/sites/default/files/2024-07/RIIO_3_SSMD_Overview.pdf
- Ofgem — RIIO-3 Final Determinations Overview (4 Dec 2025): https://www.ofgem.gov.uk/sites/default/files/2025-12/RIIO-3-Final-Determinations-overview.pdf
- Ofgem — RIIO-3 Draft Determinations Finance Annex (Jun 2025): https://www.ofgem.gov.uk/sites/default/files/2025-06/Draft-Determinations-Finance-Annex.pdf
- Oxera — "Ofgem's RIIO-ED3 SSMD: what next for GB electricity distribution networks": https://www.oxera.com/insights/agenda/articles/ofgems-riio-ed3-ssmd-what-next-for-gb-electricity-distribution-networks/
- Oxera — "Ofgem's RIIO-ED3 SSMC": https://www.oxera.com/insights/agenda/articles/ofgems-riio-ed3-ssmc/
- Oxera — "Ofgem's RIIO-3 Sector Specific Methodology Decision": https://www.oxera.com/insights/agenda/articles/ofgems-riio-3-sector-specific-methodology-decision/
- Oxera — "RIIO-3 Final Determinations": https://www.oxera.com/insights/agenda/articles/riio-3-final-determinations/
- Ashurst — "RIIO-3: Ofgem's Final Determinations at a glance": https://www.ashurst.com/en/insights/riio-3-ofgems-final-determinations-at-a-glance/
- Energy UK — response to RIIO-ED3 SSMC (10 Dec 2025): https://www.energy-uk.org.uk/wp-content/uploads/2025/12/Energy-UK-response-to-RIIO-ED3-Sector-Specific-Methodology-10-December-2025.pdf
- Sustainability First — "Behind the wires: shaping the future of energy distribution with RIIO-ED3": https://sustainabilityfirst.org.uk/blog/behind-the-wires-shaping-the-future-of-energy-distribution-with-riio-ed3/
- BFY Group — "RIIO-ED3: Gearing up for the next electricity distribution price control period": https://www.bfygroup.co.uk/blog/riio-ed3-gearing-up-for-the-next-electricity-distribution-price-control-period

> Research-environment caveat: direct PDF/article fetches returned HTTP 403 from
> this sandbox, so figures were extracted from search-index snippets of the above
> Ofgem and analyst documents and cross-checked across multiple sources. Treat
> the specific finance numbers (4.35% allowed return, 5.42% cost of debt, 20–50%
> sharing factor, 45-yr asset life) as **SSMD-indicative for business planning** —
> binding values land at ED3 Draft/Final Determinations in 2027. Verify against
> the primary Ofgem SSMD PDF before quoting in anything customer-facing.
