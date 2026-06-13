// "Why is this number red?" KPI explanations (ROADMAP #36).
//
// Each KPI gets a plain-language teach: what it measures, what good looks
// like, and — given the live value, target and direction — WHY it is the
// colour it is right now (the threshold it is meeting or missing). Pure
// functions so the wording is unit-testable and the dashboard stays dumb.

export type KpiStatus = 'good' | 'warn' | 'bad';

export interface KpiHelp {
  /** One-line definition: what the number is. */
  what: string;
  /** What a good value looks like (the goal, in words). */
  goal: string;
  /** Why it is this colour now (threshold reasoning). */
  why: string;
  status: KpiStatus;
}

/** Round-trip a number for prose without trailing noise. */
function n(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
}

/** Build the help for a target-driven KPI (the RIIO set). `higherBetter`
 *  flips the comparison; `warnFrac` is how close to target counts as amber
 *  (e.g. 0.9 → within 10% of a lower-is-better target is amber). */
export function targetHelp(
  what: string,
  goal: string,
  value: number,
  target: number,
  higherBetter: boolean,
  warnFrac = 0.9,
): KpiHelp {
  const meets = higherBetter ? value >= target : value <= target;
  // "amber" band: meeting-ish but within warnFrac of the line on the wrong
  // side of comfortable
  const ratio = target > 0 ? value / target : value > 0 ? 2 : 1;
  let status: KpiStatus;
  if (meets) {
    status = higherBetter ? (ratio < 1 / warnFrac ? 'warn' : 'good') : ratio > warnFrac ? 'warn' : 'good';
  } else {
    status = 'bad';
  }
  const cmp = higherBetter ? 'at least' : 'no more than';
  let why: string;
  if (status === 'good') {
    why = `Green: ${n(value)} comfortably beats the ${cmp} ${n(target)} the regulator set.`;
  } else if (status === 'warn') {
    why = `Amber: ${n(value)} is meeting the ${cmp} ${n(target)} target, but only just — a small slip turns this red.`;
  } else {
    why = higherBetter
      ? `Red: ${n(value)} is below the target of at least ${n(target)}. Close the gap to recover the score.`
      : `Red: ${n(value)} is over the target of ${n(target)} or less. Bring it down to clear the threshold.`;
  }
  return { what, goal, why, status };
}

/** Help for a banded KPI with explicit good/amber thresholds (network
 *  health, safety culture). `band` returns the status for a value. */
export function bandedHelp(
  what: string,
  goal: string,
  value: number,
  goodAt: number,
  warnAt: number,
  unit = '%',
): KpiHelp {
  const status: KpiStatus = value >= goodAt ? 'good' : value >= warnAt ? 'warn' : 'bad';
  const why =
    status === 'good'
      ? `Green: ${n(value)}${unit} is at or above the ${n(goodAt)}${unit} mark.`
      : status === 'warn'
        ? `Amber: ${n(value)}${unit} sits between ${n(warnAt)} and ${n(goodAt)}${unit} — watch it.`
        : `Red: ${n(value)}${unit} is below ${n(warnAt)}${unit}. Invest to lift it.`;
  return { what, goal, why, status };
}

/** Help for a "lower is better, target is a hard small number" KPI
 *  (lost-time injuries: target 0, under 5 tolerable, any is bad). */
export function ltiHelp(value: number): KpiHelp {
  const status: KpiStatus = value < 0.5 ? 'good' : value < 5 ? 'warn' : 'bad';
  const why =
    status === 'good'
      ? `Green: effectively zero injuries — exactly where it must be.`
      : status === 'warn'
        ? `Amber: ${n(value)}/yr. Under 5 is tolerable but the target is zero — any injury is one too many.`
        : `Red: ${n(value)}/yr. Well over the line. Lift the safety programme and replace aged kit.`;
  return {
    what: 'Lost-time injuries per game-year — a worker hurt and off the next day (RIDDOR over-7-day).',
    goal: 'Zero. Under 5 is tolerable; any is awful.',
    why,
    status,
  };
}

export const STATUS_LABEL: Record<KpiStatus, string> = {
  good: 'on target',
  warn: 'near the line',
  bad: 'missing target',
};
