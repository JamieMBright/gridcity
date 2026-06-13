// The ambient newsroom: between real grid events, the region keeps
// muttering — regulator musings, council gossip, market colour and the
// gentle absurdities of running London's wires. Deterministic via the
// sim RNG; one item every couple of game-days keeps the feed alive.

import type { Rng } from '../rng';
import { DEVELOPERS } from './developers';
import type { GameState } from '../state';
import { pushEvent } from '../state';
import { inRebuildYear, STORY_FRAGMENTS } from '../scenario/story';
import type { Application } from './applications';

/** Mean game-days between ambient headlines. */
const NEWS_MEAN_DAYS = 1.6;

const HEADLINES: string[] = [
  'Ofgem reminds operators that "the lights staying on" remains the KPI',
  'heat pump installers report record waiting lists across the suburbs',
  'local paper asks: is YOUR substation humming more than usual?',
  'EV owners petition for kerbside chargers on every Victorian terrace',
  'National Grid forecasts a "tight but manageable" evening peak',
  'allotment society objects to underground cable near the marrows',
  'think tank proposes painting pylons sage green; pylons unavailable for comment',
  'wholesale desk reports a quiet morning; traders blame the weather',
  'school visit to the grid substation declared "surprisingly exciting"',
  'pigeon outage at a 33 kV pole resolved; pigeon unharmed, embarrassed',
  'parish council demands undergrounding, declines to discuss the bill',
  'commuters report the new trains are "fine, actually"',
  'rooftop solar installs up again — the suburbs glitter at midday',
  'energy minister photographed pointing at a transformer',
  'consumer group warns standing charges are "neither standing nor charging"',
  'estuary birdwatchers log record waders beside the wind zone',
  'data centre lobby insists demand growth is "modest"; grid engineers laugh',
  'regional bake-off winner credits a reliable oven supply',
  'insulation drive cuts evening peak in pilot postcode',
  'storm chasers disappointed by mild week; DNO crews delighted',
  'university study finds people quite like looking at the river',
  'flexibility market trial pays households to delay the kettle',
  'vintage tram society requests a feeder; told to join the queue',
  'fish and chip shops report demand utterly inelastic',
];

/** Templated colour drawn from live state. */
function liveColour(state: GameState, rng: Rng): string | undefined {
  const councils = ['Westhaven', 'Northheath', 'Riverdene', 'Camford', 'Penge Hollow', 'Witherly'];
  const dev = DEVELOPERS[rng.int(DEVELOPERS.length)];
  const c = councils[rng.int(councils.length)];
  const pick = rng.int(5);
  if (pick === 0 && dev) {
    const mood = state.devMood.get(dev.id) ?? 70;
    return mood < 45
      ? `${dev.name} briefs journalists about "an operator asleep at the wheel"`
      : `${dev.name} tells investors the region is "open for megawatts"`;
  }
  if (pick === 1) return `${c} council debates net-zero motion; meeting overruns on biscuits`;
  if (pick === 2 && state.weather.wind > 0.65)
    return 'kite surfers thrilled, overhead line engineers less so';
  if (pick === 3 && state.weather.cloud < 0.25)
    return 'glorious sunshine — rooftop PV pours into the afternoon grid';
  return undefined;
}

/** Maybe push one ambient headline this tick. */
export function maybeAmbientNews(state: GameState, rng: Rng, dtMin: number): void {
  // tutorial missions stay quiet: ambient colour/news would drown a
  // beginner's lesson (progressive-disclosure doctrine). Sandbox only.
  if (state.scenarioId !== 'london') return;
  if (!rng.chance(dtMin / (NEWS_MEAN_DAYS * 1440))) return;
  // year one carries the mystery: every few headlines, the inquiry mutters
  const storyTurn = inRebuildYear(state.simTimeMin) && rng.chance(0.25);
  const msg = storyTurn
    ? (STORY_FRAGMENTS[rng.int(STORY_FRAGMENTS.length)] ?? '')
    : (liveColour(state, rng) ?? HEADLINES[rng.int(HEADLINES.length)] ?? '');
  if (msg) pushEvent(state, 'info', `📰 ${msg}`);
}

// --- planning newsroom (brownfield-favoured applications + appeals) ---------
//
// Submissions, council determinations and brownfield grants feature on the
// banner with flavourful, council-named headlines, tagged with the site
// coords so they're click-to-jump like every other event.

/** A short land-class phrase for a headline. */
function landPhrase(landType: Application['landType']): string {
  switch (landType) {
    case 'conservation':
      return 'conservation-area';
    case 'greenbelt':
      return 'green-belt';
    case 'greenfield':
      return 'greenfield';
    default:
      return 'brownfield';
  }
}

/** A friendly scheme descriptor ("solar array", "battery scheme", …). */
function schemeNoun(app: Application): string {
  switch (app.kind) {
    case 'solarFarm':
      return 'solar array';
    case 'windOnshore':
      return 'wind scheme';
    case 'battery':
      return 'battery scheme';
    case 'dataCentre':
      return 'data-centre campus';
    case 'evHub':
      return 'EV charging hub';
  }
}

/** News when a new application arrives. Brownfield schemes are celebrated as
 *  the planning-friendly "brownfield first" win; contested ones announce the
 *  council and the determination clock. */
export function newsApplicationSubmitted(state: GameState, app: Application): void {
  if (app.status === 'appeal' && app.appeal) {
    const odds = Math.round(app.appeal.approveOdds * 100);
    pushEvent(
      state,
      'warn',
      `🏛 ${app.name} lodges a ${schemeNoun(app)} on ${landPhrase(app.landType)} land — ${app.appeal.council} council to determine (${odds}% likely)`,
      app.x,
      app.y,
    );
  } else if (app.landType === 'brownfield') {
    pushEvent(
      state,
      'warn',
      `🏗 brownfield scheme: ${app.name} applies to connect a ${app.mw} MW ${schemeNoun(app)} on a cleared site`,
      app.x,
      app.y,
    );
  } else {
    pushEvent(
      state,
      'warn',
      `connection application: ${app.name} (${app.mw} MW ${schemeNoun(app)})`,
      app.x,
      app.y,
    );
  }
}

/** News when a council hands down its planning determination. */
export function newsAppealOutcome(state: GameState, app: Application, approved: boolean): void {
  const council = app.appeal?.council ?? 'the council';
  const land = landPhrase(app.landType);
  if (approved) {
    pushEvent(
      state,
      'info',
      `🏛 Planning granted: ${council} council approves the ${app.name} ${schemeNoun(app)} — ready to connect`,
      app.x,
      app.y,
    );
  } else {
    pushEvent(
      state,
      'bad',
      `🏛 ${council} council REFUSES the ${app.name} ${schemeNoun(app)} on ${land} grounds`,
      app.x,
      app.y,
    );
  }
}
