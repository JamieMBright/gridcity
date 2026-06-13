// The Asset Guide content (owner request, 2026-06-13): "the player needs to
// know what each build option IS." A plain-English, GB-industry-correct
// breakdown of every build option — what it is in the real world, what it
// does in THIS game, and a one-line "when to use it" hint.
//
// Doctrine (CLAUDE.md): correct-then-simplified. The copy is written to be
// genuinely educational about how GB's electricity network actually works
// (DUoS vs energy, voltage levels, reactive power, planning, flex), then
// simplified for fun. STATS ARE DERIVED LIVE FROM THE CATALOG so the guide
// can never drift from the sim — never hardcode a number the catalog owns.

import {
  CAPACITY_FACTOR,
  DEPOT,
  GENS,
  LINES,
  SUBS,
  VAN_OPEX_K_YR,
  strikeMWh,
  subCapexK,
  type GenType,
  type SubType,
} from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import { fmtMoneyK } from './theme';
import {
  IconCable,
  IconDepot,
  IconPylon,
  GEN_ICONS,
  SUB_ICONS,
  type IconComponent,
} from './icons';

export type GuideCategory = 'Generation' | 'Substations' | 'Lines & cables' | 'Operations';

export interface GuideEntry {
  /** Stable id keyed to a catalog build option: `gen:<GenType>`,
   *  `sub:<SubType>`, `line:<level>`, or `depot`. Doubles as the deep-link
   *  target (store.guideFocus) and matches the BuildPalette spot-key style. */
  key: string;
  category: GuideCategory;
  title: string;
  /** The code-drawn glyph — rendered large as the entry's imagery. */
  Icon: IconComponent;
  /** What it IS, in the real world (plain English, GB-accurate). */
  what: string;
  /** What it DOES in this game (the mechanic + the live stats). */
  does: string;
  /** A one-line strategy hint: when to reach for it. */
  when: string;
  /** Derived stat chips (label + value), pulled live from the catalog. */
  stats: Array<{ label: string; value: string }>;
}

/** £/MWh, formatted. */
function poundsMWh(marginalCostK: number): string {
  return `£${Math.round(marginalCostK * 1000)}/MWh`;
}

/** Capacity-factor as a tidy percentage. */
function cfPct(gen: GenType): string {
  return `${Math.round((CAPACITY_FACTOR[gen] ?? 0) * 100)}%`;
}

// --- Generation copy ---------------------------------------------------------
// Per-type real-world "what" + in-game "does" + "when". Numbers come from the
// catalog at build time so this stays a single source of truth.

const GEN_COPY: Record<GenType, { what: string; does: string; when: string }> = {
  gasCCGT: {
    what: 'A combined-cycle gas turbine: a jet-style turbine whose exhaust heat raises steam for a second turbine, so it wrings ~55% efficiency out of the gas. The reliable workhorse of the GB fleet — dispatchable, fast enough to follow demand.',
    does: 'A big firm-power block that connects at 132 kV. It runs whenever the market price clears above its fuel cost, sitting mid-merit-order. Carbon and fuel both land on the bill, so leaning on it hurts your carbon score.',
    when: 'Your dependable baseload-to-mid filler when the wind drops and you need megawatts you can count on — but watch the carbon report card.',
  },
  gasPeaker: {
    what: 'An open-cycle gas turbine (OCGT) — a single turbine, no steam recovery. Cheap to build, thirsty on fuel, but it can start in minutes. Real GB peakers earn their keep in the few hundred hours a year demand spikes.',
    does: 'A small, fast-starting unit on 132 kV with a high marginal cost, so dispatch only calls it at the peaks. Low capex, expensive energy — exactly the trade a peaker makes.',
    when: 'Plug a short, sharp capacity gap at peak without committing to a whole CCGT — keep it for the spikes, not the baseload.',
  },
  coal: {
    what: 'A Drax/Ratcliffe-class coal station: a giant boiler-house, chimney, turbine hall and cooling towers burning pulverised coal. The dirtiest thermal plant on the system; GB has all but retired it for carbon reasons.',
    does: 'A 400 kV landmark campus with huge firm capacity and cheap fuel, but the worst carbon of anything you can build. Cheap energy, brutal carbon — the report card will punish it.',
    when: 'Almost never on a modern grid — only if you are desperate for cheap firm megawatts and willing to wear the carbon penalty. A relic.',
  },
  nuclear: {
    what: 'A gigawatt-scale nuclear station (think Hinkley/Sizewell): a reactor hall, turbine hall and switchyard delivering steady, zero-carbon baseload. Enormous capex and a decade-long build, but it runs flat-out for 60 years.',
    does: 'The largest firm, zero-carbon block in the game on a 400 kV campus. Near-zero marginal cost so it runs baseload almost always; the eye-watering capex annuitises onto every bill.',
    when: 'Anchor a decarbonised system with rock-solid baseload — commit early, because the planning + build clock is the longest of anything you can place.',
  },
  solarFarm: {
    what: 'A field of photovoltaic panels — silent, no moving parts, generates only in daylight and peaks at midday. Cheap and quick to deploy; GB ground-mount sites sit at the distribution level.',
    does: 'A small zero-carbon farm connecting at 33 kV. It is intermittent (only generates with sun), so its capacity factor is low and it needs firming. Awards claim open land in proportion to the MW you tender.',
    when: 'Cheap, fast, clean megawatt-hours to push your carbon down — pair with storage or firm plant to cover the nights.',
  },
  windOnshore: {
    what: 'Onshore wind turbines spread across open farmland. The cheapest new generation in GB by levelised cost, but intermittent and planning-sensitive (people object to turbines on the skyline).',
    does: 'A zero-carbon farm on 33 kV whose turbines claim alternating tiles to keep their spacing. Intermittent output, low marginal cost. You dial the MW in the palette; bigger farms need more network to evacuate the power.',
    when: 'Your bread-and-butter cheap clean energy — site it where the land is open and the feeders can carry it away.',
  },
  windOffshore: {
    what: 'Offshore wind in the estuary/North Sea: bigger machines, stronger steadier winds, far higher capacity factor than onshore. GB’s flagship decarbonisation technology, but capital-heavy and slow to build.',
    does: 'A large zero-carbon block connecting at 132 kV out in the designated wind zone. High capacity factor (it blows harder at sea) but big capex and a long build. Awards spread turbines densely across the estuary.',
    when: 'Bulk clean megawatts when you have the estuary zone and the transmission to land it — the backbone of a net-zero plan.',
  },
  tidal: {
    what: 'A tidal-stream array: submerged rotors driven by tidal currents. Predictable to the minute (tides are clockwork) but expensive and niche; GB has only pilot-scale deployments.',
    does: 'A small zero-carbon, zero-fuel unit sited in water. Free "fuel", but the capex means a developer still needs a healthy strike price to build it — clean energy is never truly free.',
    when: 'A clean, predictable top-up where you have suitable water — a premium niche, not a workhorse.',
  },
  biomass: {
    what: 'A biomass CHP plant burning wood pellets / organic matter, often capturing the waste heat. Counted as low-carbon (the carbon was recently in the air), but it still has real emissions and fuel cost.',
    does: 'A small dispatchable unit on 33 kV with modest carbon and a mid marginal cost. Firmer than wind or solar, dirtier than nuclear — a flexible middle option.',
    when: 'A dispatchable low-carbon filler when you want firmness without a full gas station — handy to smooth a renewable-heavy patch.',
  },
  interconnector: {
    what: 'An HVDC subsea cable to another country (France, Netherlands, Belgium…). It imports or exports power depending on which side is cheaper, landing at a coastal converter station. GB leans on them heavily.',
    does: 'A 400 kV edge-of-map landfall that imports firm power priced off the live national series (not its catalog figure). It carries the carbon of the foreign mix. Always available; never tendered to developers.',
    when: 'Buy in firm capacity from abroad to cover a shortfall or arbitrage cheap imports — a fast hedge against a thin home fleet.',
  },
  electrolyser: {
    what: 'A hydrogen electrolyser: it splits water into hydrogen using electricity, storing energy as H₂ in tanks. A LOAD, not a generator — a way to soak up surplus renewable power that would otherwise be curtailed.',
    does: 'A load-side unit on 33 kV. It never enters the merit order; instead it absorbs energy that would be CURTAILED into an H₂ tank farm, riding a state-of-charge like a battery. Converted peakers can later burn the stored hydrogen.',
    when: 'Mop up curtailed renewables on a wind-rich system and bank the energy as hydrogen — a green sink for surplus you’d otherwise throw away.',
  },
  battery: {
    what: 'A grid-scale battery (lithium-ion BESS): banks of cells that charge when power is cheap/surplus and discharge at the peak. Fast, flexible, zero-emission at the point of use; GB has GWs of it for balancing.',
    does: 'A 33 kV store that charges off cheap surplus and discharges at the peak, with a round-trip efficiency loss. Short build, modest capex; it shifts energy in time rather than making new energy.',
    when: 'Firm up intermittent renewables and shave the peak — the flexible glue that lets a wind/solar-heavy grid stand up.',
  },
};

/** The display order in the guide — mirrors the build palette’s GEN_ORDER. */
const GEN_ORDER: GenType[] = [
  'gasCCGT',
  'gasPeaker',
  'solarFarm',
  'windOnshore',
  'windOffshore',
  'tidal',
  'biomass',
  'nuclear',
  'battery',
  'coal',
  'interconnector',
  'electrolyser',
];

function genEntry(g: GenType): GuideEntry {
  const spec = GENS[g];
  const copy = GEN_COPY[g];
  const stats: Array<{ label: string; value: string }> = [
    { label: 'capex', value: fmtMoneyK(spec.capexK) },
    {
      label: g === 'battery' || g === 'electrolyser' ? 'power' : 'capacity',
      value: `${spec.capacityMW.toLocaleString()} MW`,
    },
    { label: 'connects at', value: `${spec.level} kV` },
    { label: 'carbon', value: `${spec.carbonG} gCO₂/kWh` },
  ];
  if (spec.energyMWh !== undefined) {
    stats.push({ label: 'store', value: `${spec.energyMWh.toLocaleString()} MWh` });
  }
  // marginal cost only reads as meaningful for fuelled / merit-order units
  if (g !== 'electrolyser' && g !== 'interconnector') {
    stats.push({ label: 'fuel/energy', value: poundsMWh(spec.marginalCostK) });
    stats.push({ label: 'capacity factor', value: cfPct(g) });
    stats.push({ label: 'developer strike', value: `~£${strikeMWh(g)}/MWh` });
  }
  stats.push({
    label: 'lead time',
    value: `${spec.planningDays}d planning + ${spec.buildDays}d build`,
  });
  return {
    key: `gen:${g}`,
    category: 'Generation',
    title: spec.name,
    Icon: GEN_ICONS[g] as IconComponent,
    what: copy.what,
    does: copy.does,
    when: copy.when,
    stats,
  };
}

// --- Substation copy ---------------------------------------------------------

const SUB_COPY: Record<Exclude<SubType, 'tee'>, { what: string; does: string; when: string }> = {
  bulk: {
    what: 'A bulk supply point (BSP) / grid supply point: the top of the distribution network, where the transmission supergrid (400 kV) steps down through 132 kV to 33 kV. A sprawling switchyard of gantries, busbars and transformer banks.',
    does: 'The only substation carrying all three voltages, so it bridges the supergrid to your distribution feeders. Big transformer rating and very low reactance — the gateway that lets transmission power reach the city.',
    when: 'Plant one where transmission meets your region — every megawatt from a 400 kV plant or interconnector has to pass through a BSP to get down to customers.',
  },
  grid: {
    what: 'A primary / grid substation stepping 132 kV down to 33 kV. The middle tier of the distribution network — the point where regional 132 kV circuits feed the local 33 kV network.',
    does: 'A two-level (132/33 kV) substation with a moderate transformer rating. It is the workhorse junction between transmission-level feeders and the distribution kit below.',
    when: 'Use it to bring 132 kV transmission down to 33 kV near a growing demand cluster, so distribution subs downstream have a strong source to feed off.',
  },
  dist: {
    what: 'A distribution (secondary) substation stepping 33 kV down to the low-voltage mains that actually reach homes and businesses. The neighbourhood kiosk box you see on the pavement.',
    does: 'Serves customer tiles within a service radius that scales with its fitted transformer (MVA). It auto-upgrades through its MVA steps as the catchment grows, or you can fix a size in the palette.',
    when: 'Your day-to-day tool for connecting demand — drop them across built-up areas so every customer tile sits inside a service radius.',
  },
  pole: {
    what: 'A pole-mounted transformer: a single can hung on a wood pole, stepping 33 kV down to LV for a handful of rural premises. The cheapest, smallest connection in the kit — ubiquitous in the countryside.',
    does: 'A tiny distribution sub with a small rating and a short service radius. Cheap to place, quick to upgrade through its modest MVA steps. Vulnerable to storms (it is out in the open).',
    when: 'Connect sparse rural or edge-of-network demand cheaply — overkill-free coverage where a full kiosk substation would be wasted.',
  },
  vault: {
    what: 'An underground / indoor (GIS) substation built into a chamber below the kerb. Costs far more than an outdoor build (civils, gas-insulated switchgear, ventilation) but is hidden and weatherproof.',
    does: 'A distribution sub like the kiosk, but sealed underground — storms can’t touch it. Higher capex per the underground multiplier, with a decent rating and service radius.',
    when: 'Use in dense urban cores where there’s no room for an outdoor compound, or anywhere you want a storm-proof connection and will pay for it.',
  },
  capbank: {
    what: 'A capacitor bank: racks of capacitor "cans" on a single bay that inject reactive power (VARs) to prop voltage back up on a long, heavily-loaded feeder. Shunt compensation — it pushes volts, not megawatts.',
    does: 'A 33 kV shunt device with NO transformer and NO customer catchment. Its whole job is a bounded voltage boost at and downstream of its connection point. It has zero effect on real power flow — it fixes voltage, full stop.',
    when: 'Bolt one onto a long or heavily-loaded 33 kV feeder whose far end is sagging below voltage limits — the cheap fix before you spend on reconductoring or a new grid sub.',
  },
};

const SUB_ORDER: Array<Exclude<SubType, 'tee'>> = ['bulk', 'grid', 'dist', 'pole', 'vault', 'capbank'];

function subEntry(s: Exclude<SubType, 'tee'>): GuideEntry {
  const spec = SUBS[s];
  const copy = SUB_COPY[s];
  const stats: Array<{ label: string; value: string }> = [
    { label: 'capex', value: fmtMoneyK(spec.capexK) },
    { label: 'voltages', value: spec.levels.map((l) => `${l} kV`).join(' / ') || '—' },
  ];
  if (s === 'capbank') {
    stats.push({ label: 'reactive (nominal)', value: `${spec.txRatingMW} MVAr` });
  } else {
    stats.push({ label: 'transformer', value: `${spec.txRatingMW} MVA` });
  }
  if (spec.serviceRadius !== undefined) {
    stats.push({ label: 'service radius', value: `${spec.serviceRadius} tiles` });
  }
  if (spec.mvaSteps && spec.mvaSteps.length > 0) {
    stats.push({ label: 'MVA steps', value: spec.mvaSteps.join(' → ') });
    // a worked example: the cost of the largest fitting, derived live
    const big = spec.mvaSteps[spec.mvaSteps.length - 1] ?? spec.txRatingMW;
    stats.push({ label: `at ${big} MVA`, value: fmtMoneyK(subCapexK(s, big)) });
  }
  return {
    key: `sub:${s}`,
    category: 'Substations',
    title: spec.name,
    Icon: SUB_ICONS[s] as IconComponent,
    what: copy.what,
    does: copy.does,
    when: copy.when,
    stats,
  };
}

// --- Lines & cables ----------------------------------------------------------

const LINE_COPY: Record<VoltageLevel, { what: string; does: string; when: string }> = {
  400: {
    what: 'The 400 kV supergrid: the highest-voltage transmission in GB, carried on the tallest lattice pylons (or very expensive cable). High voltage means low current and low losses, so it shifts gigawatts across the country.',
    does: 'The highest-capacity circuit in the game, with the lowest losses per tile but the highest cost per km. It only connects 400 kV bays (BSPs, big thermal plant, interconnectors).',
    when: 'The motorway of the grid — use it to haul bulk power from distant nuclear/coal/interconnector landfalls to a BSP. Expensive, so route it sparingly.',
  },
  132: {
    what: 'The 132 kV sub-transmission level: the regional backbone linking grid supply points to primary substations. Standard lattice pylons; the tier most reinforcement happens at as demand grows.',
    does: 'A high-capacity circuit connecting 132 kV bays. Mid cost per km, mid losses. The default level for moving real power across a region without the 400 kV price tag.',
    when: 'Your regional trunk — string it between BSPs and grid subs to carry demand-cluster loads, and reinforce it first when corridors run hot.',
  },
  33: {
    what: 'The 33 kV distribution level: the local feeders that fan out from grid substations to the kiosk/pole substations near customers. The lowest solved voltage in the game; everything below it is radial LV.',
    does: 'The cheapest circuit per km but the lowest rating and highest losses — at 33 kV the current (and so the I²R loss and voltage drop) is highest. Connects 33 kV bays and most generation/storage.',
    when: 'The neighbourhood wiring — run it from grid subs to distribution subs and small generators. Keep runs short; long 33 kV feeders sag in voltage (that’s when a capacitor bank earns its place).',
  },
};

const LINE_ORDER: VoltageLevel[] = [400, 132, 33];

function lineEntry(lv: VoltageLevel): GuideEntry {
  const spec = LINES[lv];
  const copy = LINE_COPY[lv];
  return {
    key: `line:${lv}`,
    category: 'Lines & cables',
    title: `${lv} kV line / cable`,
    Icon: lv === 33 ? IconCable : IconPylon,
    what: copy.what,
    does: copy.does,
    when: copy.when,
    stats: [
      { label: 'rating', value: `${spec.ratingMW.toLocaleString()} MW` },
      { label: 'overhead', value: `${fmtMoneyK(spec.capexKPerTile.overhead)}/km` },
      { label: 'underground', value: `${fmtMoneyK(spec.capexKPerTile.underground)}/km` },
      // resistance per tile drives the loss/voltage-drop estimate — a real
      // electrical fact worth surfacing (lower kV = more loss per MW carried)
      { label: 'losses (r pu/km)', value: spec.rPerTile.toString() },
    ],
  };
}

// --- Operations --------------------------------------------------------------

function depotEntry(): GuideEntry {
  return {
    key: 'depot',
    category: 'Operations',
    title: DEPOT.name,
    Icon: IconDepot,
    what: 'A field operations depot: the garage that stations the orange repair vans and the crews who drive them. When a fault, storm or dig-in damages the network, vans are dispatched from the nearest depot to fix it.',
    does: 'Stationing point for crewed vans. The closer a depot is to a fault, the faster crews reach it and restore supply, which directly cuts your CI (customers interrupted) and CML (minutes lost) reliability scores.',
    when: 'Spread depots so every part of your network has a van within quick reach before the storms come — reliability is graded on how fast you restore, and that starts with where the vans live.',
    stats: [
      { label: 'capex', value: fmtMoneyK(DEPOT.capexK) },
      { label: 'van running cost', value: `${fmtMoneyK(VAN_OPEX_K_YR)}/yr each` },
      { label: 'role', value: 'fault response (CI / CML)' },
    ],
  };
}

/** The full, ordered guide. Built from the catalog at module load so every
 *  stat is live and every build option is represented. */
export const ASSET_GUIDE: GuideEntry[] = [
  ...GEN_ORDER.map(genEntry),
  ...SUB_ORDER.map(subEntry),
  ...LINE_ORDER.map(lineEntry),
  depotEntry(),
];

/** The category order for grouped rendering. */
export const GUIDE_CATEGORIES: GuideCategory[] = [
  'Generation',
  'Substations',
  'Lines & cables',
  'Operations',
];

/** Entries for one category, in order. */
export function entriesFor(cat: GuideCategory): GuideEntry[] {
  return ASSET_GUIDE.filter((e) => e.category === cat);
}

/** Look an entry up by its deep-link key (store.guideFocus / palette spot key). */
export function guideEntry(key: string): GuideEntry | undefined {
  return ASSET_GUIDE.find((e) => e.key === key);
}
