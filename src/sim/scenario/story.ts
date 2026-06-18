// The Night the Grid Vanished — the campaign's framing fiction.
// Why is the map dark? Because every tower, transformer and cable in
// the licence area disappeared overnight. No fault recorded, no debris,
// no explanation. You are the operator Ofgem dragged out of bed.

/** Ofgem's year-1 allowed revenue for the rebuild, £k (network capex). */
export const ALLOWANCE_Y1_K = 250_000;

/** The opening beats, shown letterboxed and skippable on a new game.
 *  Kept to TWO beats — the cold open, then the Ofgem mandate. */
export const STORY_BEATS: Array<{ title: string; body: string }> = [
  {
    title: '03:47, last night',
    body:
      'At 03:47 every substation alarm in the licence area fired at once — ' +
      'and then went silent. Not tripped. Gone. Dawn found empty fields ' +
      'where four hundred kilovolts used to hum: no towers, no cables, no ' +
      'transformers, not a single bolt left behind. Nine million people ' +
      'have one word for it: dark.',
  },
  {
    title: 'Your mandate',
    body:
      'By dawn Ofgem had licensed you to rebuild and operate the whole ' +
      'London network, effective immediately. The lights are your problem ' +
      'now. You have an allowance for year one and a reliability target to ' +
      'hit before year two — but for the first three months the regulator ' +
      'freezes every metric while you rebuild: reliability, constraint ' +
      'costs and the report card are all paused. Start switching it on.',
  },
];

export interface StoryBeat {
  title: string;
  body: string;
}

/** The bespoke nature of running EACH city's distribution network — the real
 *  operator + regulator + what makes that patch distinctive (owner, 2026-06-18:
 *  "the message should appear in each of the cities with the bespoke nature of
 *  DNO operations captured"). London keeps its richer two-beat fiction above;
 *  every other city is framed from these. */
interface CityIntro {
  place: string;
  operator: string;
  regulator: string;
  bespoke: string;
}

const CITY_INTRO: Record<string, CityIntro> = {
  northeast: {
    place: 'the North-East',
    operator: 'Northern Powergrid',
    regulator: 'Ofgem',
    bespoke:
      'The old Durham and Northumberland coalfield turned offshore-wind frontier — the Tyne and Wear threading Newcastle, Gateshead and Sunderland, ex-pit villages strung across the moor.',
  },
  paris: {
    place: 'Paris',
    operator: 'Enedis',
    regulator: 'the CRE',
    bespoke:
      'Fed from RTE’s nuclear-heavy transmission ring: dense Haussmann boulevards over a warren of underground cable, with La Défense towering at the western edge.',
  },
  newyork: {
    place: 'New York',
    operator: 'Con Edison',
    regulator: 'the New York Public Service Commission',
    bespoke:
      'A secondary-network grid beneath the boroughs — interlocking spot networks under Manhattan, steam still piped downtown, service vaults under every sidewalk.',
  },
  sydney: {
    place: 'Sydney',
    operator: 'Ausgrid',
    regulator: 'the AER',
    bespoke:
      'Feeders strung from the harbour out to the bush — coastal salt, blistering summer peaks and bushfire-exposed lines beyond the suburbs.',
  },
  hongkong: {
    place: 'Hong Kong',
    operator: 'CLP Power and HK Electric',
    regulator: 'the EMSD',
    bespoke:
      'Two operators split across the water — CLP wiring Kowloon and the New Territories, HK Electric the Island — feeding one of the most vertical, dense load centres on Earth.',
  },
  berlin: {
    place: 'Berlin',
    operator: 'Stromnetz Berlin',
    regulator: 'the Bundesnetzagentur',
    bespoke:
      'A reunified grid still bearing its East–West seam — a ring main around the Mitte core, with ever more rooftop solar and heat pumps to carry.',
  },
  shanghai: {
    place: 'Shanghai',
    operator: 'State Grid Shanghai',
    regulator: 'the National Energy Administration',
    bespoke:
      'Ultra-high-voltage lines hauling power across China into the delta — the Bund’s old core and Pudong’s forest of towers drawing relentlessly more.',
  },
  cairo: {
    place: 'Cairo',
    operator: 'the South Cairo Electricity Distribution Company',
    regulator: 'EgyptERA',
    bespoke:
      'A network racing rampant load growth along the Nile — subsidised tariffs, brutal summer peaks, and informal connections to bring into the fold.',
  },
  athens: {
    place: 'Athens',
    operator: 'HEDNO',
    regulator: 'the RAE',
    bespoke:
      'A mainland grid tied to the islands by subsea links — fierce summer air-conditioning peaks under the Attic sun, and solar climbing fast.',
  },
  capetown: {
    place: 'Cape Town',
    operator: 'the City of Cape Town and Eskom',
    regulator: 'NERSA',
    bespoke:
      'A municipal grid wedged against Eskom’s national constraints — load-shedding to plan around, Cape wind and sun to harness, the mountain hemming the cables in.',
  },
  pune: {
    place: 'Pune',
    operator: 'MSEDCL (Mahavitaran)',
    regulator: 'the MERC',
    bespoke:
      'A grid sprinting after one of India’s fastest-growing cities — monsoon storms, mixed urban and agricultural feeders, and IT parks demanding firm power.',
  },
};

const DEFAULT_INTRO: CityIntro = {
  place: 'the licence area',
  operator: 'the incumbent network operator',
  regulator: 'the regulator',
  bespoke: 'a whole distribution network to rebuild from the substations up.',
};

/** The opening beats for a given scenario. London keeps its bespoke fiction;
 *  every other city gets the same cold-open + a mandate beat that names its
 *  REAL operator/regulator and the bespoke nature of its network. */
export function storyBeatsFor(cityId: string): StoryBeat[] {
  if (cityId === 'london') return STORY_BEATS;
  const c = CITY_INTRO[cityId] ?? DEFAULT_INTRO;
  return [
    {
      title: '03:47, last night',
      body:
        `Across ${c.place}, every substation alarm fired at 03:47 — then fell silent. ` +
        'Not tripped: gone. Dawn found bare ground where the network used to hum, not a ' +
        'bolt left behind. The people have one word for it: dark.',
    },
    {
      title: 'Your mandate',
      body:
        `${c.regulator} has licensed you to rebuild and operate ${c.place}’s distribution ` +
        `network — ${c.operator}’s patch. ${c.bespoke} The lights are your problem now.`,
    },
  ];
}

/** Year-1 mystery fragments for the GRID WIRE ticker (woven among the
 *  ambient headlines while the rebuild is young). */
export const STORY_FRAGMENTS: string[] = [
  'inquiry update: no fault recorded at any site on the night — "the kit simply isn\'t there"',
  'satellite firm claims pre-dawn imagery shows towers present at 03:46 and absent at 03:48',
  'select committee summons the former operator; former operator cannot be located either',
  'scrap-metal market unmoved: "nobody has tried to sell us a grid," traders confirm',
  'conspiracy forums divided between magnets, auroras and "a very organised crane company"',
  'insurance underwriters invent new category: "inexplicable total infrastructure loss"',
  'walkers report a single insulator disc found in a hedge near Ongar; police tape deployed',
  'astronomers note nothing unusual that night, "apart, obviously, from the grid"',
];

/** True while the rebuild-directive framing applies (year 1). */
export function inRebuildYear(simTimeMin: number): boolean {
  return simTimeMin < 365 * 1440;
}
