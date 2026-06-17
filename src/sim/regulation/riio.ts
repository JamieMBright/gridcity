// RIIO-style price controls: play unfolds in 5-game-year regulatory
// periods. Each opens with targets across the KPI set; at period end a
// report card scores actuals against them into a composite operator
// rating. There is no game over — the rating IS the game, and unlimited
// spending always shows up in the bill column.

export const PERIOD_YEARS = 5;
export const PERIOD_MIN = PERIOD_YEARS * 525_600;

export type KpiKey = 'bill' | 'ci' | 'cml' | 'carbon' | 'curtailedFirm' | 'satisfaction';

export const KPI_LABELS: Record<KpiKey, string> = {
  bill: 'avg bill £/yr',
  ci: 'CI /100 cust/yr',
  cml: 'CML min/cust/yr',
  carbon: 'carbon g/kWh',
  curtailedFirm: 'firm curtailment MWh/yr',
  satisfaction: 'satisfaction /100',
};

/** Lower is better for everything except satisfaction. */
export const HIGHER_BETTER: Record<KpiKey, boolean> = {
  bill: false,
  ci: false,
  cml: false,
  carbon: false,
  curtailedFirm: false,
  satisfaction: true,
};

/** The GB/Ofgem default KPI weighting — what every period scores against
 *  unless the active regulator profile overrides it. A country's regulator
 *  weighs the columns differently (Hong Kong's SoC prizes reliability;
 *  Australia's AER leans affordability + PV-hosting headroom; France's CRE,
 *  with carbon already near zero, weighs bills + service) — see
 *  resolveWeights + the per-country RegulatorProfile.kpiWeights. */
export const BASE_WEIGHTS: Record<KpiKey, number> = {
  bill: 0.25,
  ci: 0.15,
  cml: 0.15,
  carbon: 0.15,
  curtailedFirm: 0.1,
  satisfaction: 0.2,
};

/** Merge a regulator's partial weight overrides onto the GB base and
 *  renormalise to sum 1, so a country can re-prioritise the report card
 *  without the weights drifting off 100%. No overrides ⇒ the base object
 *  itself (London is bit-identical: same object, same key order). */
export function resolveWeights(
  overrides?: Partial<Record<KpiKey, number>>,
): Record<KpiKey, number> {
  if (!overrides) return BASE_WEIGHTS;
  const merged = { ...BASE_WEIGHTS, ...overrides };
  let sum = 0;
  for (const k of Object.keys(merged) as KpiKey[]) sum += merged[k];
  if (sum <= 0) return BASE_WEIGHTS;
  const out = {} as Record<KpiKey, number>;
  for (const k of Object.keys(merged) as KpiKey[]) out[k] = merged[k] / sum;
  return out;
}

export type PeriodTargets = Record<KpiKey, number>;

/** Opening targets for a brand-new operator. */
export function initialTargets(): PeriodTargets {
  // bill target tracks the calibrated household figure (~£3k electrified)
  return { bill: 3000, ci: 60, cml: 90, carbon: 250, curtailedFirm: 20_000, satisfaction: 60 };
}

export interface PeriodState {
  index: number;
  startMin: number;
  targets: PeriodTargets;
  /** time integrals over the period (∫x·dt, game-minutes). */
  billIntegral: number;
  carbonIntegral: number;
  satIntegral: number;
  custIntegral: number;
  weightMin: number;
  /** counters at period start, for deltas. */
  ciStart: number;
  cmlStart: number;
  curtailedFirmStart: number;
  /** Developer complaints lodged with the regulator this period. */
  complaints: number;
}

export function newPeriod(index: number, startMin: number, targets: PeriodTargets): PeriodState {
  return {
    index,
    startMin,
    targets,
    billIntegral: 0,
    carbonIntegral: 0,
    satIntegral: 0,
    custIntegral: 0,
    weightMin: 0,
    ciStart: 0,
    cmlStart: 0,
    curtailedFirmStart: 0,
    complaints: 0,
  };
}

export interface KpiScore {
  actual: number;
  target: number;
  /** 0..100; meeting target ≈ 70, beating by 20% ≈ 100. */
  score: number;
}

export interface ReportCard {
  index: number;
  /** Game-minute the period closed. */
  closedAtMin: number;
  scores: Record<KpiKey, KpiScore>;
  composite: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
}

function scoreOne(key: KpiKey, actual: number, target: number): KpiScore {
  let ratio: number;
  if (HIGHER_BETTER[key]) {
    ratio = actual > 0 ? target / actual : 2;
  } else if (target > 0) {
    ratio = actual / target;
  } else {
    ratio = actual > 0 ? 2 : 1;
  }
  const score = Math.max(0, Math.min(100, Math.round(70 + (1 - ratio) * 150)));
  return { actual, target, score };
}

export function gradeOf(composite: number): ReportCard['grade'] {
  if (composite >= 85) return 'A';
  if (composite >= 70) return 'B';
  if (composite >= 55) return 'C';
  if (composite >= 40) return 'D';
  return 'E';
}

/** The regulatory framing a country runs under (mirrors
 *  powerProfile.RegulatorProfile.model; defined here to avoid an import cycle —
 *  powerProfile imports this module). Selects the report-card framing TEXT. */
export type RegulatorModel = 'riio' | 'profit-cap' | 'cost-of-service';

/** Human framing for a regulator model — surfaced on the RIIO report-card
 *  panel (W8 Part-2b) so a country's report card reads in its own regulatory
 *  language: Ofgem's RIIO incentive review (GB/AU), a Scheme-of-Control
 *  permitted-return review (Hong Kong), or a prudent-cost review (France's CRE,
 *  Brazil's ANEEL). `name` is the regulator's own name (Ofgem / AER / CRE / …).
 *  Pure presentation — no scoring change (the KPI WEIGHTS already vary per
 *  regulator via resolveWeights). */
export function regulatorFraming(model: RegulatorModel): {
  /** Short tag shown beside the period number ("RIIO" / "Scheme of Control"). */
  scheme: string;
  /** The review's full name. */
  review: string;
  /** One-line description of how this regulator judges the operator. */
  blurb: string;
} {
  switch (model) {
    case 'profit-cap':
      return {
        scheme: 'Scheme of Control',
        review: 'permitted-return review',
        blurb:
          'A Scheme-of-Control settlement: a permitted return on net fixed assets, judged above all on world-class reliability.',
      };
    case 'cost-of-service':
      return {
        scheme: 'cost-of-service',
        review: 'prudent-cost review',
        blurb:
          'A cost-of-service concession review: prudently-incurred costs are passed through, with affordability and service at the fore.',
      };
    case 'riio':
    default:
      return {
        scheme: 'RIIO',
        review: 'incentive review',
        blurb:
          'A RIIO-style price control: outputs are incentivised against targets, and every pound of totex lands on the bill.',
      };
  }
}

export interface PeriodActuals {
  bill: number;
  ci: number;
  cml: number;
  carbon: number;
  curtailedFirm: number;
  satisfaction: number;
}

export function closePeriod(
  p: PeriodState,
  actuals: PeriodActuals,
  weights: Record<KpiKey, number> = BASE_WEIGHTS,
): ReportCard {
  const scores = {} as Record<KpiKey, KpiScore>;
  let composite = 0;
  for (const key of Object.keys(weights) as KpiKey[]) {
    scores[key] = scoreOne(key, actuals[key], p.targets[key]);
    composite += scores[key].score * weights[key];
  }
  // every developer complaint to the regulator dents the rating
  composite -= Math.min(12, p.complaints * 3);
  composite = Math.max(0, Math.round(composite));
  return {
    index: p.index,
    closedAtMin: p.startMin + PERIOD_MIN,
    scores,
    composite,
    grade: gradeOf(composite),
  };
}

/** The regulator always asks for a little more than you just delivered. */
export function nextTargets(prev: PeriodTargets, actuals: PeriodActuals): PeriodTargets {
  const tighten = (target: number, actual: number, floor: number): number =>
    Math.max(floor, Math.min(target, actual) * 0.95);
  return {
    bill: tighten(prev.bill, actuals.bill, 1800),
    ci: tighten(prev.ci, actuals.ci, 5),
    cml: tighten(prev.cml, actuals.cml, 10),
    carbon: tighten(prev.carbon, actuals.carbon, 30),
    curtailedFirm: tighten(prev.curtailedFirm, actuals.curtailedFirm, 1000),
    satisfaction: Math.min(90, Math.max(prev.satisfaction, actuals.satisfaction) + 3),
  };
}
