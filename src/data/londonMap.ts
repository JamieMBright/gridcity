// The ElectriCity main map: LONDON, drawn from its real geography. The
// Thames follows its true shape — the Staines/Walton meanders, the big
// Richmond/Kingston S-bends, Hammersmith and Battersea, the Westminster
// bend, the deep Isle of Dogs loop and the Greenwich peninsula, the
// Erith–Purfleet double bend, the Dartford narrows, then the widening
// estuary past Tilbury to the sea. The city itself is no painted
// rectangle: an organic density field falls away from the centre,
// ribboning outward along the real radial roads (A1, A10, A12, A13, A2,
// A23, A3, A4, A40, the A41) inside the North/South Circular ring and
// the M25 — which swings WEST of Heathrow, as it really does. Beyond the
// green belt, real satellite towns at their true relative positions in
// honestly varied sizes: big Watford, Slough, Basildon and shore-hugging
// Southend down to villages like Cobham, Chigwell and Ongar. The
// countryside is enclosed farmland: variable-size hedged fields (3–9
// tiles a side), heaths, woods, reservoir chains, gravel pits, golf
// courses and scattered farmsteads. All shapes are deterministic; a
// seeded RNG adds organic jitter, identically every run.

import {
  CUSTOMERS_PER_TILE,
  LANDMARK,
  NO_COUNCIL,
  RC,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Landmark,
  type Terrain,
  type TransportRoute,
  type Zone,
} from '../sim/map/types';
import { sampleRoute } from '../sim/map/routes';
import { Rng } from '../sim/rng';
import { buildHeroTable } from './cityData';

export const LONDON_W = 256;
export const LONDON_H = 160;

/** Charing Cross, more or less: the centre everything falls away from. */
const CENTRE = { x: 118, y: 80 };

// --- The Thames: its actual shape -------------------------------------------
// Control points west→east, each one a real reach: in from the Windsor
// meadows, the Staines and Walton meanders, the Kingston dip and the hard
// swing north through Richmond and Kew, the Hammersmith/Putney wiggles,
// Battersea reach, the Westminster bend turning north-east, the City
// reach, then the deep southward loop around the Isle of Dogs, the
// Greenwich peninsula poking back north, Woolwich and Barking reaches,
// the Erith–Purfleet double bend, the narrows under the Dartford
// crossing, and the long widening estuary past Tilbury and Canvey.

export const RIVER_PTS: Array<[number, number]> = [
  [0, 92], // Windsor reach in
  [8, 96], // Datchet
  [14, 92], // Horton
  [22, 98], // Wraysbury
  [30, 103], // Staines
  [38, 100], // Laleham
  [44, 106], // Chertsey
  [52, 110], // Walton
  [60, 106], // Sunbury
  [66, 111], // Hampton
  [72, 113], // Kingston, the southmost dip
  [77, 104], // Teddington, swinging hard north
  [80, 97], // Richmond
  [84, 94], // Kew
  [88, 98], // the Chiswick/Barnes loop
  [92, 94], // Hammersmith bend
  [96, 99], // Putney/Fulham
  [100, 95], // Battersea reach
  [104, 97], // Chelsea/Vauxhall
  [108, 92], // Westminster bend, turning north
  [112, 87], // Waterloo
  [116, 86], // the City reach
  [120, 86], // Tower Bridge
  [124, 89], // Wapping
  [127, 87], // Limehouse
  [130, 93], // down the west side of the Isle of Dogs
  [133, 98], // the loop bottom plunges deep — Greenwich on the south bank
  [136, 99],
  [139, 90], // up the east side, the peninsula poking back north
  [142, 84], // the Greenwich peninsula tip (the dome's tent)
  [148, 87], // Blackwall, the gentle S through the reaches
  [154, 90], // Woolwich reach
  [160, 94], // Gallions reach
  [166, 98], // Barking / Halfway reach
  [170, 96], // Erith rands
  [173, 94], // Purfleet — the double bend
  [176, 97], // Greenhithe
  [180, 96], // the Dartford narrows (the crossing)
  [186, 98], // Gravesend reach
  [194, 98], // Tilbury — the estuary holds broad and low
  [206, 96],
  [220, 92], // Lower Hope, easing north-east
  [236, 88], // Canvey / Southend shore
  [255, 86], // the open sea, the mouth wide
];

/** River centreline lookup, sampled once from the control spline. */
const RIVER_Y: number[] = (() => {
  const ys = new Array<number>(LONDON_W).fill(80);
  const samples = sampleRoute({ kind: 'lane', pts: RIVER_PTS }, 0.25);
  for (const [sx, sy] of samples) {
    const x = Math.round(sx);
    if (x >= 0 && x < LONDON_W) ys[x] = sy;
  }
  // fill any gaps from neighbours
  for (let x = 1; x < LONDON_W; x++) {
    if (ys[x] === 80 && Math.abs((ys[x - 1] ?? 80) - 80) > 0.01) ys[x] = ys[x - 1] ?? 80;
  }
  return ys;
})();

export function riverCenterY(x: number): number {
  const xi = Math.min(LONDON_W - 1, Math.max(0, Math.round(x)));
  return RIVER_Y[xi] ?? 80;
}

/** River half-width: a narrow upper river, broadening through town and the
 *  Barking reach, pinching back at the Dartford narrows, then fanning out
 *  into the estuary past Tilbury. */
export function riverHalfWidth(x: number): number {
  if (x < 76) return 1.0;
  if (x < 150) return 1.1 + 1.1 * ((x - 76) / 74); // through town
  if (x < 166) return 2.2 + 0.6 * ((x - 150) / 16); // Barking reach
  if (x < 180) return 2.8 - 0.8 * ((x - 166) / 14); // narrowing to Dartford
  const t = (x - 180) / (LONDON_W - 180);
  return 2 + 18 * t * t; // the estuary fans open wide past Tilbury to the sea
}

// --- Councils --------------------------------------------------------------

interface CouncilSeed extends CouncilProfile {
  x: number;
  y: number;
}

const COUNCIL_SEEDS: CouncilSeed[] = [
  { id: 0, x: 116, y: 79, name: 'City of Westhaven', affluence: 0.95, ambition: 0.85, blurb: 'Financial heart. Net-zero pledge with a budget to match.' },
  { id: 1, x: 104, y: 62, name: 'Northheath', affluence: 0.9, ambition: 0.45, blurb: 'Leafy and lovely. Resists pylons with great vigour.' },
  { id: 2, x: 82, y: 104, name: 'Riverdene', affluence: 0.85, ambition: 0.7, blurb: 'Riverside villas. Early adopters of anything shiny.' },
  { id: 3, x: 124, y: 64, name: 'Camford', affluence: 0.6, ambition: 0.8, blurb: 'Young, dense, impatient for EV charging on every street.' },
  { id: 4, x: 112, y: 96, name: 'Southwark Vale', affluence: 0.5, ambition: 0.6, blurb: 'Markets and terraces south of the river.' },
  { id: 5, x: 136, y: 88, name: 'Old Docks', affluence: 0.4, ambition: 0.7, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 134, y: 70, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 116, y: 116, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  { id: 8, x: 94, y: 74, name: 'Westgate', affluence: 0.7, ambition: 0.6, blurb: 'Stucco terraces and embassy lawns.' },
  { id: 9, x: 72, y: 50, name: 'Watfordshire', affluence: 0.6, ambition: 0.5, blurb: 'Commuter belt with opinions about train times.' },
  { id: 10, x: 160, y: 40, name: 'Harlow Reach', affluence: 0.5, ambition: 0.65, blurb: 'New town, newer ambitions.' },
  { id: 11, x: 196, y: 48, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 12, x: 190, y: 116, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep countryside. Electrification can wait for the cricket.' },
  { id: 13, x: 212, y: 60, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
  { id: 14, x: 238, y: 64, name: 'Southend Ness', affluence: 0.4, ambition: 0.45, blurb: 'End of the line. Cockles, caravans and a long pier.' },
];

// --- Town seeds --------------------------------------------------------------
// Real satellite towns at their true relative positions, in honestly
// varied sizes — big commuter towns, market towns, and villages scattered
// between. Estuary towns hug the shore; valley towns string along their
// rivers (`dir` is the growth axis).

export interface TownSeed {
  x: number;
  y: number;
  /** Urban-core radius; suburbs reach ~2x this, lobes further. */
  r: number;
  kind: 'town' | 'village';
  name: string;
  /** Preferred growth axis (valley/shore towns); omit for roundish towns. */
  dir?: [number, number];
}

export const TOWNS: TownSeed[] = [
  // the big ones
  { x: 64, y: 42, r: 4, kind: 'town', name: 'Watford', dir: [0.3, 1] }, // strung down the Colne valley
  { x: 34, y: 70, r: 3.5, kind: 'town', name: 'Slough', dir: [1, 0] }, // ribboned along the A4
  { x: 40, y: 122, r: 3, kind: 'town', name: 'Woking', dir: [1, 0.2] },
  { x: 120, y: 114, r: 4, kind: 'town', name: 'Croydon' }, // the conurbation's southern edge
  { x: 158, y: 64, r: 3.5, kind: 'town', name: 'Romford' }, // its eastern edge
  { x: 198, y: 58, r: 3.5, kind: 'town', name: 'Basildon', dir: [1, 0] },
  { x: 236, y: 64, r: 4, kind: 'town', name: 'Southend', dir: [1, -0.25] }, // hugs the estuary shore
  // market towns
  { x: 98, y: 22, r: 3, kind: 'town', name: 'St Albans' },
  { x: 162, y: 24, r: 3, kind: 'town', name: 'Harlow' },
  { x: 208, y: 32, r: 3, kind: 'town', name: 'Chelmsford' },
  { x: 182, y: 50, r: 2.5, kind: 'town', name: 'Brentwood' },
  { x: 174, y: 102, r: 2.5, kind: 'town', name: 'Dartford', dir: [0.3, 1] }, // up the Darent valley
  { x: 188, y: 104, r: 2.5, kind: 'town', name: 'Gravesend', dir: [1, 0] }, // along the south shore
  { x: 90, y: 128, r: 2.5, kind: 'town', name: 'Epsom' },
  { x: 36, y: 108, r: 2.5, kind: 'town', name: 'Staines', dir: [1, 0.3] }, // on the river
  { x: 162, y: 138, r: 2.5, kind: 'town', name: 'Sevenoaks' },
  { x: 48, y: 142, r: 2.5, kind: 'town', name: 'Guildford', dir: [1, 0] }, // under the Hog's Back
  { x: 178, y: 90, r: 2, kind: 'town', name: 'Grays', dir: [1, 0] }, // among the chalk pits
  // villages scattered between
  { x: 22, y: 36, r: 2, kind: 'village', name: 'Amersham' },
  { x: 18, y: 86, r: 2, kind: 'village', name: 'Windsor' },
  { x: 48, y: 114, r: 1.5, kind: 'village', name: 'Chertsey' },
  { x: 60, y: 128, r: 1.5, kind: 'village', name: 'Cobham' },
  { x: 88, y: 144, r: 2, kind: 'village', name: 'Dorking' },
  { x: 132, y: 146, r: 1.5, kind: 'village', name: 'Oxted' },
  { x: 142, y: 62, r: 1.5, kind: 'village', name: 'Chigwell' },
  { x: 174, y: 36, r: 1.5, kind: 'village', name: 'Ongar' },
  { x: 194, y: 44, r: 2, kind: 'village', name: 'Billericay' },
  { x: 222, y: 50, r: 2, kind: 'village', name: 'Rayleigh' },
  { x: 234, y: 22, r: 2, kind: 'village', name: 'Maldon' },
  { x: 136, y: 12, r: 2, kind: 'village', name: 'Ware' },
  { x: 112, y: 14, r: 1.5, kind: 'village', name: 'Hatfield' },
  { x: 182, y: 92, r: 1.5, kind: 'village', name: 'Tilbury' }, // docks on the marsh
  { x: 206, y: 110, r: 1.5, kind: 'village', name: 'Hoo' },
];

/** New-build estates: iDNO transformer in, every roof solar'd, waiting. */
export const NEW_ESTATES: Array<{ x: number; y: number; r: number }> = [
  { x: 70, y: 48, r: 3 },
  { x: 188, y: 58, r: 3 },
  { x: 156, y: 130, r: 3 },
];

/** Map flags bitmask (CityMap.flags). Kept in lock-step with TILE_FLAG in
 *  src/sim/map/types.ts (the sim-side reader). */
export const FLAG_SHOPS = 1;
export const FLAG_RUNWAY = 2;
/** Brownfield: previously-developed land (disused works, gasworks, depots,
 *  docklands, ex-industrial sites). Planning-friendly land for the
 *  connection-application + appeals mechanic — generation/demand schemes
 *  favour brownfield and skip the council determination window. */
export const FLAG_BROWNFIELD = 4;

/** Airports for the render-side air layer (flight arcs, planes, shadows).
 *  Purely additive scenery data: NOT part of CityMap, never serialized
 *  into saves — no SAVE_VERSION implications. Heathrow's runway tiles
 *  (FLAG_RUNWAY) already exist; a City-airport entry would need runway
 *  tiles in the Royal Docks first (map-geometry change, own PR). */
export interface AirportSpec {
  name: string;
  /** Terminal tile (the landmark anchor). */
  x: number;
  y: number;
  /** Runway heading: 'EW' = westerly operation (take off/land to the west). */
  hdg: 'EW';
}

export const AIRPORTS: AirportSpec[] = [{ name: 'Heathrow', x: 65, y: 87, hdg: 'EW' }];

/** Named places shown by the inspector AND the source of London's bespoke-hero
 *  placement: buildLondonMap calls buildHeroTable(map) (see the end of the
 *  builder), which scans this list and, for any name matching a hero in the
 *  london.ts registry (src/render/sprites/heroes/london.ts), stamps the hero's
 *  footprint into the landmark raster so the bespoke sprite renders + lights.
 *
 *  COORDINATE CONVENTION (must match buildHeroTable / tileChooser): each (x, y)
 *  is the hero's SOUTH-WEST corner; the footprint extends EAST (+x) and NORTH
 *  (−y) over the hero's `foot` [w, h]. The NEW heroes' positions are chosen so
 *  every footprint sits on open LAND and no two overlap — see the placement
 *  validator that vetted this list.
 *
 *  MARQUEE heroes (Shard, St Paul's, the Eye, Tower Bridge, the Gherkin,
 *  Battersea, Wembley, the O2, ExCeL, Ally Pally, Kew, BT Tower and the four
 *  Olympic-park venues) are ALREADY hand-placed by the enum landmark pass (§9)
 *  in the identical bespoke art. They are labelled here on the SW corner of
 *  that enum precinct; buildHeroTable's London additivity rule (it never
 *  overwrites an existing London icon, nor stamps a river tile a precinct
 *  spans) means their footprints stamp NOTHING, so they keep rendering +
 *  lighting via the enum placement with no double-placement, and the map's
 *  enum-landmark precinct tests stay green. Parliament keeps its hand-tuned
 *  riverfront L-precinct (enum only — no label here, as before). */
export const NAMED_PLACES: Array<{ x: number; y: number; name: string }> = [
  // --- label-only places (no bespoke hero matches these names) ---------------
  { x: 122, y: 76, name: 'Liverpool Street' },
  { x: 65, y: 87, name: 'Heathrow' },
  { x: 118, y: 118, name: 'Crystal Palace' }, // palacemast enum sprite (label only)
  { x: 137, y: 72, name: 'Westfield Stratford' }, // westfield enum sprite (label only)

  // --- MARQUEE heroes (already hand-placed by the enum landmark pass §9 below).
  //     Labelled here on the enum precinct's SW corner; buildHeroTable's London
  //     additivity rule leaves their enum tiles intact (it never clobbers an
  //     existing London icon nor stamps the river a precinct spans), so each
  //     keeps rendering + lighting via its enum placement — the very same
  //     bespoke landmarkSprites art — with no double-placement. -----------------
  { x: 113, y: 71, name: 'BT Tower' },
  { x: 118, y: 77, name: 'The Gherkin' }, // 30 St Mary Axe, the City
  { x: 118, y: 89, name: 'The Shard' }, // London Bridge quarter, south bank
  { x: 114, y: 80, name: "St Paul's Cathedral" }, // the City dome (2×2 close)
  { x: 108, y: 94, name: 'London Eye' }, // across the water from Parliament
  { x: 120, y: 87, name: 'Tower Bridge' }, // spans the Pool of London
  { x: 100, y: 99, name: 'Battersea Power Station' }, // south bank, four chimneys
  { x: 87, y: 60, name: 'Wembley' }, // the arch + bowl, NW
  { x: 139, y: 91, name: 'The O2' }, // the Greenwich peninsula dome
  { x: 112, y: 52, name: 'Alexandra Palace' }, // the N hill (2×1)
  { x: 149, y: 85, name: 'ExCeL' }, // the Royal Docks (long 3×1)
  { x: 87, y: 95, name: 'Kew Gardens' }, // the Palm House by the river bend
  // Queen Elizabeth Olympic Park, Stratford (owner, 2026-06-13)
  { x: 133, y: 70, name: 'Olympic Park' }, // the Stadium bowl (3×3)
  { x: 133, y: 66, name: 'Lee Valley VeloPark' },
  { x: 137, y: 68, name: 'ArcelorMittal Orbit' },

  // --- NEW bespoke heroes (W3 round 1): the rail termini, the great museums,
  //     the palaces, the South-Bank set and the City civics, each at its true
  //     relative position. SW corner; footprint extends E (+x) and N (−y) ------
  // Euston Road termini, west → east along the Marylebone/Euston Road
  { x: 102, y: 69, name: 'Paddington' }, // GWR terminus, NW by Hyde Park
  { x: 107, y: 69, name: 'Euston' }, // the 1960s slab
  { x: 112, y: 69, name: 'St Pancras' }, // the Midland Grand Gothic terminus
  { x: 117, y: 69, name: "King's Cross" }, // the twin-gabled stock-brick front
  // the central / river termini
  { x: 109, y: 96, name: 'Waterloo' }, // South Bank, the Victory Arch
  { x: 124, y: 95, name: 'London Bridge' }, // south bank, the wavy concourse
  { x: 109, y: 77, name: 'Charing Cross' }, // West End, off the Strand
  { x: 98, y: 90, name: 'Victoria Station' }, // Belgravia / Pimlico
  // Bloomsbury / Camden civics + libraries
  { x: 102, y: 65, name: 'Carreras' }, // the Egyptian-Revival factory, Camden
  { x: 107, y: 64, name: 'British Museum' }, // Bloomsbury, the Great Court dome
  { x: 113, y: 64, name: 'British Library' }, // beside St Pancras
  // South Kensington — the museum quarter, south of Hyde Park
  { x: 98, y: 82, name: 'Natural History Museum' },
  { x: 98, y: 77, name: 'Science Museum' }, // Exhibition Road
  { x: 103, y: 82, name: 'Victoria and Albert Museum' },
  { x: 103, y: 77, name: 'Harrods' }, // Knightsbridge
  // the West End / Westminster
  { x: 108, y: 82, name: 'Buckingham Palace' }, // by the park, the East Front
  { x: 105, y: 85, name: 'Westminster Abbey' },
  { x: 100, y: 86, name: 'Tate Britain' }, // Millbank, north bank
  // the Strand / Holborn / City of London civics
  { x: 112, y: 78, name: 'Royal Courts of Justice' }, // Fleet Street, the Law Courts
  { x: 115, y: 76, name: 'Old Bailey' }, // the Central Criminal Court, by Newgate
  { x: 116, y: 83, name: 'Somerset House' }, // the Strand, by the river
  { x: 120, y: 79, name: 'Bank of England' }, // the City, the Tivoli corner
  // the South Bank cultural mile (south of the river)
  { x: 105, y: 101, name: 'County Hall' }, // opposite Westminster
  { x: 114, y: 96, name: 'National Theatre' }, // the Brutalist terraces
  { x: 119, y: 96, name: 'Tate Modern' }, // Bankside, the great chimney

  // --- NEW bespoke heroes (W3 round 2): the City office towers, the West-End
  //     hotels, the colleges + libraries, the South-Bank/Bankside set, the
  //     Marylebone/Regent's-Park terraces, the palaces and the department
  //     stores — each at its true relative London position, on land, no
  //     footprint overlap (anchors verified by tools/place solver). The dense
  //     Whitehall government quarter is already saturated by Buckingham/Abbey/
  //     Parliament + the Thames, so a few Whitehall blocks (FCDO, GOGGS,
  //     Whitehall Court, Old War Office, Burlington House) have NO sensible
  //     footprint and are intentionally NOT placed this round. ----------------
  // City of London — the eastern financial cluster
  { x: 123, y: 79, name: '100 Bishopsgate' }, // the City's eastern edge
  { x: 119, y: 82, name: '200 Aldersgate' }, // by the Museum of London / London Wall
  { x: 113, y: 83, name: 'One New Change' }, // the glass mall hard by St Paul's
  { x: 122, y: 82, name: 'Bank of New York Mellon' }, // the City
  { x: 119, y: 74, name: 'London Wall Buildings' }, // Finsbury Circus
  { x: 116, y: 73, name: 'Maughan Library' }, // Chancery Lane, the neo-Gothic strong-box
  { x: 120, y: 71, name: 'Holborn Bars' }, // the red-terracotta Prudential, Holborn
  // the West End — Strand / Covent Garden / Mayfair / Piccadilly
  { x: 109, y: 85, name: 'Savoy Hotel' }, // the Strand, above the river
  { x: 109, y: 74, name: 'Royal Opera House' }, // Covent Garden
  { x: 106, y: 79, name: 'London Trocadero' }, // Piccadilly Circus
  { x: 106, y: 76, name: 'Grosvenor House Hotel' }, // Park Lane, Mayfair
  { x: 96, y: 74, name: 'One Hyde Park' }, // Knightsbridge, the glass apartments
  // St James's / Westminster
  { x: 105, y: 89, name: "St James's Palace" }, // the Tudor brick gatehouse
  { x: 102, y: 89, name: 'Institute of Contemporary Arts' }, // The Mall, Nash terrace
  { x: 114, y: 92, name: 'Ministry of Defence' }, // Whitehall, the big riverside block
  { x: 97, y: 85, name: 'Ministry of Justice' }, // Petty France, Westminster
  { x: 96, y: 93, name: 'Department for Transport' }, // Pimlico, by the river
  // South Kensington — the Imperial College / museum quarter
  { x: 95, y: 77, name: 'Royal School of Mines' }, // Prince Consort Road
  { x: 94, y: 80, name: 'City and Guilds Building' }, // Exhibition Road
  { x: 94, y: 83, name: 'Sherfield Building' }, // the Imperial College tower block
  // Kensington / Bayswater (the west)
  { x: 91, y: 80, name: 'Kensington Palace' }, // in Kensington Gardens
  { x: 91, y: 84, name: 'Derry & Toms' }, // Kensington High Street, the roof gardens
  { x: 94, y: 71, name: 'Whiteleys' }, // Bayswater / Queensway
  { x: 98, y: 70, name: 'Hilton London Metropole' }, // Edgware Road
  // Marylebone / Regent's Park / Maida Vale (the NW)
  { x: 96, y: 66, name: 'Maida Vale Studios' }, // the BBC sound studios
  { x: 103, y: 61, name: 'Cornwall Terrace' }, // Regent's Park, Nash terrace
  { x: 99, y: 59, name: 'Sussex Place' }, // Regent's Park, the domed terrace (LBS)
  { x: 99, y: 63, name: 'Chiltern Court' }, // above Baker Street station
  { x: 103, y: 72, name: 'Broadcasting House' }, // Portland Place, the BBC
  // Bloomsbury / King's Cross / Camden / Islington (the north)
  { x: 110, y: 65, name: 'Senate House' }, // the University of London tower
  { x: 110, y: 61, name: 'Francis Crick Institute' }, // by St Pancras / the Crick
  { x: 118, y: 62, name: 'Central Saint Martins' }, // King's Cross, the Granary
  { x: 116, y: 58, name: 'Business Design Centre' }, // Islington, the iron hall
  // the South Bank / Bankside cultural mile (south of the river)
  { x: 111, y: 93, name: 'BFI Southbank' }, // under Waterloo Bridge
  { x: 112, y: 99, name: 'IBM Building' }, // the South Bank, Lasdun
  { x: 116, y: 99, name: 'Sea Containers House' }, // Bankside, west of Blackfriars
  // Southwark / the Pool of London
  { x: 121, y: 93, name: "Hay's Galleria" }, // the arcaded wharf, Southwark
  { x: 119, y: 90, name: 'HMS Belfast' }, // the museum cruiser, moored off Tooley St
  // the outer set — Vauxhall / Wapping / Chelsea
  { x: 95, y: 89, name: 'SIS Building' }, // Vauxhall Cross, the MI6 ziggurat
  { x: 129, y: 86, name: 'Tobacco Dock' }, // Wapping, the great brick warehouse
  { x: 91, y: 100, name: 'Lots Road Power Station' }, // Chelsea, the twin chimneys

  // --- NEW bespoke heroes (W3 round 3): the long tail toward the 100/city
  //     standard — the listed City/West-End blocks, the council estates and
  //     grand stucco terraces, a college, a Crown Court, the Chelsea Flower
  //     Show marquees and the King's Cross Coal Drops. The central Whitehall/
  //     Piccadilly/Buckingham quarter is SATURATED (Buckingham/Abbey/Parliament
  //     + Westminster civics + the Thames leave no free footprint there — R2
  //     flagged 5 infeasible), so the Whitehall grandees (Old War Office, GOGGS,
  //     FCDO, Whitehall Court, Burlington, Royal Mews) are placed on the nearest
  //     free OUTER fringe of their true positions and the set spreads to the
  //     wider map. Every footprint vetted on open LAND, no overlap. ------------
  // City of London — Liverpool Street / the Barbican fringe
  { x: 122, y: 74, name: 'Andaz Liverpool Street' }, // the Great Eastern Hotel, Bishopsgate
  { x: 124, y: 70, name: 'Crescent House' }, // Golden Lane Estate, by the Barbican
  // Whitehall / Westminster grandees — on the free fringe of their true seats
  { x: 106, y: 73, name: 'Old War Office' }, // Whitehall (now Raffles), four corner domes
  { x: 102, y: 93, name: 'Government Offices Great George Street' }, // HM Treasury, off Parliament Sq
  { x: 114, y: 103, name: 'Foreign and Commonwealth Office' }, // the grand Italianate FO
  { x: 109, y: 99, name: 'Whitehall Court' }, // the turreted Embankment skyline
  { x: 94, y: 86, name: 'Royal Mews' }, // the royal stables by Buckingham Palace
  // Mayfair / Piccadilly (west of the saturated core)
  { x: 90, y: 75, name: 'Burlington House' }, // the Royal Academy, Piccadilly
  // Somers Town / King's Cross (the north)
  { x: 119, y: 65, name: 'Ossulston Estate' }, // the LCC's monumental social housing
  { x: 119, y: 57, name: 'Coal Drops Yard' }, // the King's Cross goods-yard sheds
  // Paddington Green (the west) — the college
  { x: 99, y: 66, name: 'City of Westminster College' }, // the angular glass campus
  // Bayswater / South Kensington — the grand stucco terraces
  { x: 90, y: 72, name: 'The Lancasters' }, // the Hyde Park stucco palace front
  { x: 88, y: 84, name: 'Cranley Gardens' }, // the South Ken Italianate terrace
  // the south bank — Battersea / Chelsea / Southwark / Newington
  { x: 97, y: 103, name: 'Albion Riverside' }, // Foster's bowed riverside block, Battersea
  { x: 102, y: 104, name: 'Chelsea Flower Show' }, // the RHS Great Pavilion marquees
  { x: 108, y: 107, name: 'Inner London Crown Court' }, // the Sessions House, Newington
  { x: 124, y: 108, name: 'Caroline Gardens' }, // the Peckham almshouses + chapel
  // Wapping / St Katharine Docks — by Tower Bridge
  { x: 129, y: 89, name: 'Tower Hotel' }, // the Brutalist hotel east of Tower Bridge
];

// NOTE: EXISTING_GENERATION (the seeded estuary CCGTs / Lea peaker / Essex
// solar+wind that used to come pre-built on the system) was REMOVED on the
// 2026-06-13 playtest pass — the owner asked for a truly blank starting grid
// ("forget all about actual generation and the ECR. All of it vanished in the
// vanishing."). The player now builds everything from scratch; the iDNO
// new-build ESTATES (NEW_ESTATES) remain as customer DEMAND awaiting a wire.

// --- Builder ---------------------------------------------------------------

export function buildLondonMap(): CityMap {
  const w = LONDON_W;
  const h = LONDON_H;
  const n = w * h;
  const rng = new Rng(0x10ec1717);

  const terrain = new Uint8Array(n).fill(TERRAIN.land);
  const zone = new Uint8Array(n).fill(ZONE.none);
  const council = new Uint8Array(n).fill(NO_COUNCIL);
  const road = new Uint8Array(n);
  const customers = new Uint16Array(n);
  const vegetation = new Uint8Array(n);
  const variant = new Uint8Array(n);
  const landmark = new Uint8Array(n);
  const flags = new Uint8Array(n);
  const routes: TransportRoute[] = [];

  const idx = (x: number, y: number): number => y * w + x;
  const inb = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < h;

  const setTerrain = (x: number, y: number, t: Terrain): void => {
    if (inb(x, y)) terrain[idx(x, y)] = t;
  };
  const isWater = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.water;
  const isLand = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.land;

  const zoneRect = (x0: number, y0: number, x1: number, y1: number, z: Zone, jitter = 0): void => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!isLand(x, y)) continue;
        if (jitter > 0) {
          const edge =
            Math.min(x - x0, x1 - x, y - y0, y1 - y) < jitter ? rng.chance(0.45) : false;
          if (edge) continue;
        }
        zone[idx(x, y)] = z;
      }
    }
  };

  const zoneBlob = (cx: number, cy: number, r: number, z: Zone): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!isLand(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r - 1 || (d <= r + 1 && rng.chance(0.5))) zone[idx(x, y)] = z;
      }
    }
  };

  const terrainBlob = (cx: number, cy: number, r: number, t: Terrain): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!isLand(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r - 1 || (d <= r + 1 && rng.chance(0.5))) terrain[idx(x, y)] = t;
      }
    }
  };
  const forestBlob = (cx: number, cy: number, r: number): void => terrainBlob(cx, cy, r, TERRAIN.trees);
  const lakeBlob = (cx: number, cy: number, r: number): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r || (d <= r + 0.8 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
      }
    }
  };

  // 1) The Thames + the Essex creek (the Crouch)
  for (let x = 0; x < w; x++) {
    const cy = riverCenterY(x);
    const hw = riverHalfWidth(x);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      const d = Math.abs(y - cy);
      if (d <= hw || (d <= hw + 0.9 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
    }
  }
  for (let x = 210; x < w; x++) {
    const cy = Math.round(30 + 4 * Math.sin(x / 8));
    setTerrain(x, cy, TERRAIN.water);
    setTerrain(x, cy + 1, TERRAIN.water);
    if (rng.chance(0.3)) setTerrain(x, cy + 2, TERRAIN.water);
  }

  // 1b) Tributaries, each a real valley: the Colne past Watford to Staines,
  // the Lea down the reservoir chain, the Wey through Woking, the Mole
  // under the Downs, the Darent through Dartford, the Roding past Romford.
  const TRIBUTARIES: Array<Array<[number, number]>> = [
    [[56, 10], [58, 24], [56, 38], [52, 52], [48, 66], [46, 80], [44, 92], [42, 103]], // Colne
    [[136, 10], [134, 24], [136, 38], [133, 50], [130, 62], [128, 74], [126, 86]], // Lea
    [[46, 156], [44, 144], [42, 132], [40, 122], [44, 114], [48, 109]], // Wey
    [[98, 156], [94, 144], [90, 132], [82, 124], [72, 118], [68, 112]], // Mole
    [[166, 142], [168, 128], [170, 114], [172, 104], [173, 97]], // Darent
    [[172, 28], [168, 42], [163, 56], [159, 70], [156, 82], [155, 88]], // Roding
  ];
  for (const trib of TRIBUTARIES) {
    for (const [sx, sy] of sampleRoute({ kind: 'lane', pts: trib }, 0.4)) {
      const tx = Math.round(sx + rng.range(-0.3, 0.3));
      const ty = Math.round(sy);
      setTerrain(tx, ty, TERRAIN.water);
      if (rng.chance(0.35)) setTerrain(tx + 1, ty, TERRAIN.water);
    }
  }
  // 1c) Standing water: the Staines/Wraysbury reservoir group right beside
  // Heathrow, the Lea Valley chain, gravel pits down the Colne, the
  // flooded chalk pits behind Grays, and the Kent and Essex reservoirs.
  for (const [cx, cy, r] of [
    [46, 92, 3], [52, 96, 2.6], [44, 98, 2.2], [60, 118, 2.4], // Staines group + the QE2
    [44, 76, 1.2], [42, 82, 1.4], [46, 86, 1], // Colne gravel pits
    [136, 34, 1.8], [137, 42, 2.2], [134, 52, 2.4], [131, 62, 2], [129, 70, 1.8], // the Lea chain
    [174, 86, 1.4], [171, 90, 1.1], // Grays chalk pits
    [206, 116, 2.2], // the Kent reservoir
    [200, 44, 1.8], // Hanningfield, Essex
  ] as const) {
    lakeBlob(cx, cy, r);
  }

  // 2) Uplands: the Chiltern edge to the NW and the North Downs / Surrey
  // Hills along the south are REAL geographic masses — lush green ridges,
  // NOT a rock-wall rim around the map (owner, 2026-06-13: "the edges of
  // the map are rock walls. Just stick to real towns"). The map margin no
  // longer gets a blanket hill fill; instead an organic upland BAND hugs
  // the true high ground (a soft sine ridge, ragged at its lower edge),
  // and the rim resolves into ordinary countryside / sea / towns that the
  // renderer fades at the edge. (EnvArt: detail at the transition, calm in
  // the mass — the uplands read as country, not a wall.)
  for (let x = 0; x < w; x++) {
    // the Chilterns are a NARROW ridge hugging the NW corner (only the
    // genuinely high NW ground), the band thinning fast to the east; the
    // North Downs are a narrow southern ridge, deepest in the SW. Kept
    // tight so the uplands read as real ridges, not a broad swath, and the
    // countryside between breathes (also keeps the sprite budget lean).
    const chiltern = 5 + 3 * Math.sin(x / 18) + Math.max(0, (58 - x) / 11);
    const downs = h - 7 - 3 * Math.sin(x / 22) - Math.max(0, (96 - x) / 18);
    for (let y = 0; y < h; y++) {
      if (!isLand(x, y)) continue;
      // ragged lower edge so the upland dissolves into farmland, not a line
      const jN = chiltern + rng.range(-1.5, 1.5);
      const jS = downs - rng.range(-1.5, 1.5);
      if (y < jN || y > jS) {
        // a thin top/bottom rim stays land so the map edge is countryside,
        // not a cliff (owner: "edges… are rock walls. Just stick to towns")
        if (y >= 2 && y <= h - 3) terrain[idx(x, y)] = TERRAIN.hill;
      }
    }
  }
  // named heights: the Downs spurs, the Chiltern knolls, Langdon Hills
  for (const [cx, cy, r] of [
    [96, 138, 3.5], // Epsom Downs
    [60, 136, 3], // the Hog's Back
    [118, 140, 3], [146, 134, 2.5], // the Downs above Oxted
    [24, 26, 4], [12, 48, 3], [38, 14, 3], // Chiltern fringe
    [192, 68, 2], // Langdon Hills above Basildon
    [218, 40, 2], // Danbury ridge
  ] as const) {
    terrainBlob(cx, cy, r, TERRAIN.hill);
  }

  // 3) Forests: Epping NE of the city, real woods through the belt in
  // honestly varied sizes
  forestBlob(148, 50, 8); // Epping
  forestBlob(156, 38, 6);
  forestBlob(40, 32, 6); // Chiltern beechwoods
  forestBlob(46, 126, 4); // Chobham heathwoods
  forestBlob(182, 128, 7); // the Kent Weald edge
  forestBlob(216, 122, 5);
  forestBlob(76, 132, 5); // Ranmore
  forestBlob(24, 84, 5); // Windsor Great Park
  forestBlob(108, 28, 3);
  forestBlob(228, 116, 4);
  forestBlob(12, 112, 4);
  forestBlob(166, 116, 3);
  forestBlob(86, 30, 2);

  // 4) The radial skeleton (real bearings) — defined BEFORE the density
  // field so housing can ribbon along it the way real London does.
  // The south-bank radials anchor on the embankment carriageway row (a
  // fixed quantized setback off the water) so none of them starts in, or
  // clips, the river.

  /** Quantized carriageway row a fixed setback off the river bank. */
  const bank = (x: number, side: -1 | 1): number =>
    side < 0
      ? Math.floor(riverCenterY(x) - riverHalfWidth(x)) - 3
      : Math.ceil(riverCenterY(x) + riverHalfWidth(x)) + 3;

  const RADIALS: Array<Array<[number, number]>> = [
    [[118, 70], [112, 46], [104, 32], [98, 22], [92, 0]], // A1 north
    [[121, 70], [130, 44], [134, 28], [136, 12], [136, 0]], // A10 past Ware
    [[124, 73], [142, 56], [154, 40], [162, 24]], // A12/M11 → Harlow
    [[128, 76], [152, 60], [182, 50], [208, 34], [240, 24], [255, 20]], // A12 → Brentwood, Chelmsford, out east
    [[130, 78], [158, 64], [178, 60], [198, 58], [222, 56], [236, 62]], // A127 → Romford, Basildon, Southend
    [[128, 82], [148, 80], [166, 84], [182, 86], [196, 82], [212, 74], [228, 68], [238, 64]], // A13 along the estuary
    [[122, bank(122, 1)], [128, 102], [142, 103], [158, 104], [174, 105], [188, 107], [206, 112], [226, 124], [240, 130], [255, 136]], // A2 → Dartford, Gravesend, Kent (kept clear south of the deepened Isle of Dogs loop)
    [[116, bank(116, 1)], [114, 112], [110, 130], [106, 146], [104, 159]], // A23 south
    [[112, bank(112, 1)], [104, 102], [94, 106], [74, 120], [60, 128], [50, 140], [44, 152], [42, 159]], // A3 → Cobham, Guildford (south of the Battersea bend)
    [[108, 82], [88, 82], [70, 78], [52, 74], [34, 70], [16, 66], [0, 64]], // A4 → Slough, out west
    [[110, 76], [88, 64], [62, 52], [40, 42], [22, 36], [8, 28], [0, 26]], // A40 west-northwest
    [[112, 72], [98, 56], [78, 46], [64, 42], [50, 30], [40, 16], [36, 0]], // A41 → Watford, out north-west
    [[120, bank(120, 1)], [128, 101], [148, 112], [156, 124], [162, 138], [166, 150], [168, 159]], // A21 → Sevenoaks, out south
  ];

  // 5) The city: an organic density field around the centre, boosted
  // along the radials, eaten by noise at the edges — no straight lines.
  {
    // corridor boost raster from radial samples
    const boost = new Float32Array(n);
    for (const r of RADIALS) {
      for (const [sx, sy] of sampleRoute({ kind: 'arterial', pts: r }, 0.5)) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = Math.round(sx + dx);
            const ty = Math.round(sy + dy);
            if (!inb(tx, ty)) continue;
            const d = Math.hypot(sx - tx, sy - ty);
            const i = idx(tx, ty);
            boost[i] = Math.max(boost[i] ?? 0, 0.16 * Math.max(0, 1 - d / 2.6));
          }
        }
      }
    }
    const noiseAt = (x: number, y: number): number => {
      // smooth-ish value noise from coarse lattice hashes
      const hash = (gx: number, gy: number): number =>
        ((((gx * 73856093) ^ (gy * 19349663)) >>> 0) % 1000) / 1000;
      const gx = x / 5;
      const gy = y / 5;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
      const v = lerp(
        lerp(hash(x0, y0), hash(x0 + 1, y0), fx),
        lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), fx),
        fy,
      );
      return (v - 0.5) * 0.26;
    };
    // EnvArt density + 60-30-10 value hierarchy: the focal mass must
    // dominate the inner map. RMAX widens so the gradient reaches the green
    // belt before dying; the base lifts and the thresholds drop so the
    // inner ~30 tiles are solid urbanCore; the hole-punching noise is
    // CENTRE-WEIGHTED to near-zero in the core (calm in the mass) and only
    // ragged at the green-belt transition (detail at the edge).
    const RMAX = 60;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isLand(x, y)) continue;
        const i = idx(x, y);
        const d = Math.hypot(x - CENTRE.x, y - CENTRE.y);
        const noiseWeight = Math.max(0.22, Math.min(1, d / 40));
        let v = 1.16 - d / RMAX + (boost[i] ?? 0) + noiseAt(x, y) * noiseWeight;
        // south of the river thins a touch sooner, like home
        if (y > riverCenterY(x)) v -= 0.04;
        if (v >= 0.58) zone[i] = ZONE.urbanCore;
        else if (v >= 0.42) zone[i] = ZONE.urban;
        else if (v >= 0.26) zone[i] = ZONE.suburb;
      }
    }
  }

  // the two skyscraper districts: the Square Mile, and the wharf towers
  // on the Isle of Dogs inside the river's deep loop
  zoneBlob(116, 77, 3.4, ZONE.cbd);
  zoneBlob(134, 89, 2.2, ZONE.cbd); // Canary, on the tongue inside the loop
  // conservation quarters: Mayfair beside the park, the heath NW, the
  // river bend at Richmond/Kew
  zoneBlob(107, 77, 2.6, ZONE.posh);
  zoneBlob(103, 63, 4.5, ZONE.posh);
  zoneBlob(84, 102, 4.5, ZONE.posh);
  // industry: the east-river corridors + the western works
  zoneRect(134, 74, 152, 80, ZONE.industrial, 2); // Lea mouth / Stratford
  zoneRect(158, 84, 170, 88, ZONE.industrial, 2); // Dagenham, north bank
  zoneRect(146, 94, 158, 98, ZONE.industrial, 2); // Charlton/Woolwich, south bank
  zoneBlob(94, 70, 3, ZONE.industrial); // Park Royal
  zoneRect(176, 86, 182, 90, ZONE.industrial, 1); // Grays riverside works
  zoneRect(180, 90, 186, 93, ZONE.industrial, 1); // Tilbury docks

  // BROWNFIELD designation (planning mechanic): previously-developed land —
  // disused gasworks, depots, ex-works and docklands. Generation/demand
  // connection applications FAVOUR these (the GB "brownfield first" steer)
  // and skip the council determination window; everything else (greenfield /
  // green-belt / conservation) opens a ~30-day planning appeal. A flag bit
  // (FLAG_BROWNFIELD) — pure scenario data, never serialized, so no
  // SAVE_VERSION implication. Stamped onto existing industrial/dockland
  // fabric plus a handful of named regeneration sites near the towns.
  const markBrownfield = (x: number, y: number): void => {
    if (!isLand(x, y)) return;
    flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_BROWNFIELD;
  };
  const brownfieldRect = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) markBrownfield(x, y);
  };
  // the east-river industrial corridors carry the brownfield grain (the
  // real Thames Gateway regeneration belt: gasworks, wharves, depots)
  brownfieldRect(134, 74, 152, 80); // Lea mouth / Stratford ex-works
  brownfieldRect(158, 84, 170, 88); // Dagenham (the old motor-works belt)
  brownfieldRect(146, 94, 158, 98); // Charlton / Woolwich south-bank works
  brownfieldRect(176, 86, 186, 93); // Grays pits + Tilbury docklands
  // named regeneration / disused sites near the towns + inner east end
  brownfieldRect(126, 86, 132, 90); // Greenwich peninsula (the old gasworks)
  brownfieldRect(120, 82, 126, 86); // Surrey docks / Rotherhithe wharves
  brownfieldRect(110, 96, 116, 100); // Old Kent Road depots
  brownfieldRect(132, 70, 138, 74); // Lower Lea / Hackney Wick yards
  brownfieldRect(90, 68, 98, 72); // Park Royal industrial estate (west)

  // 6) Satellite towns and villages beyond the belt: organic footprints —
  // a core, suburb lobes strung along the town's growth axis, industry on
  // the edge. Estuary towns hug the shore; valley towns follow rivers.
  const townBlob = (t: TownSeed): void => {
    const [dx, dy] = t.dir ?? [0, 0];
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    zoneBlob(t.x, t.y, t.r * 1.9, ZONE.suburb);
    const lobes = t.r >= 3.5 ? 4 : t.r >= 2.5 ? 3 : 2;
    for (let k = 0; k < lobes; k++) {
      let ox: number;
      let oy: number;
      if (len > 0) {
        const s = (k % 2 === 0 ? 1 : -1) * rng.range(0.8, 2) * t.r;
        ox = ux * s + rng.range(-1.5, 1.5);
        oy = uy * s + rng.range(-1.5, 1.5);
      } else {
        const a = rng.range(0, Math.PI * 2);
        const d = t.r * rng.range(1, 2);
        ox = Math.cos(a) * d;
        oy = Math.sin(a) * d;
      }
      zoneBlob(t.x + ox, t.y + oy, t.r * rng.range(0.7, 1.3), ZONE.suburb);
    }
    zoneBlob(t.x, t.y, t.r, ZONE.urban);
    if (t.r >= 3.5) {
      zoneBlob(t.x + ux * t.r + rng.range(-2, 2), t.y + uy * t.r + rng.range(-2, 2), t.r * 0.55, ZONE.urban);
    }
    const ind = t.r >= 3.5 ? 2 : 1;
    for (let k = 0; k < ind; k++) {
      const a = rng.range(0, Math.PI * 2);
      zoneBlob(t.x + Math.cos(a) * t.r * 2.3, t.y + Math.sin(a) * t.r * 2.3, 1.6 + t.r * 0.2, ZONE.industrial);
    }
  };
  for (const t of TOWNS) {
    if (t.kind === 'town') townBlob(t);
    else zoneBlob(t.x, t.y, t.r, ZONE.rural);
  }
  // Southend spreads in a strip along its shore (and gets the long pier)
  for (let x = 222; x <= 248; x++) {
    const shore = Math.floor(riverCenterY(x) - riverHalfWidth(x));
    for (let y = shore - 4; y <= shore - 1; y++) {
      if (!isLand(x, y)) continue;
      if (y === shore - 4 && rng.chance(0.5)) continue;
      zone[idx(x, y)] = zone[idx(x, y)] === ZONE.urban ? ZONE.urban : ZONE.suburb;
    }
  }
  for (const e of NEW_ESTATES) zoneBlob(e.x, e.y, e.r, ZONE.newEstate);

  // Heathrow's airfield in the west: two parallel runways cut into the
  // fields, the ground cleared before the streets are laid — inside the
  // M25 (which passes to its west), south of the M4, north of the M3
  const inAirfield = (x: number, y: number): boolean => x >= 54 && x <= 76 && y >= 83 && y <= 91;
  {
    for (let x = 54; x <= 76; x++) {
      for (let y = 83; y <= 91; y++) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        zone[idx(x, y)] = ZONE.none;
      }
    }
    for (let x = 56; x <= 72; x++) {
      for (const y of [84, 85]) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_RUNWAY;
      }
    }
    for (let x = 58; x <= 74; x++) {
      for (const y of [89, 90]) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_RUNWAY;
      }
    }
  }

  // glasshouses (the Lea Valley NNE, Essex, and the Kent fringe market
  // gardens), pre-sited generation
  zoneRect(132, 30, 142, 40, ZONE.greenhouse, 1);
  zoneRect(204, 46, 216, 54, ZONE.greenhouse, 1);
  zoneRect(146, 118, 154, 124, ZONE.greenhouse, 1); // Kent fringe
  zoneRect(22, 52, 32, 58, ZONE.solarSite);
  zoneRect(72, 26, 82, 31, ZONE.solarSite);
  zoneRect(190, 86, 200, 92, ZONE.solarSite);
  zoneRect(214, 104, 224, 110, ZONE.solarSite);
  zoneRect(58, 142, 68, 148, ZONE.solarSite);
  zoneRect(172, 116, 180, 121, ZONE.solarSite);
  zoneRect(208, 64, 220, 71, ZONE.nuclearSite); // the marshy north shore
  for (let y = 56; y <= 110; y++) {
    for (let x = 244; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  // royal parks + the great commons, and Greenwich park on its hill
  // inside the loop's south bank
  zoneRect(108, 73, 115, 78, ZONE.park); // Hyde
  zoneRect(112, 64, 118, 69, ZONE.park); // Regent's
  zoneRect(99, 56, 107, 61, ZONE.park); // the heath
  zoneRect(78, 108, 88, 116, ZONE.park); // Richmond park
  zoneRect(124, 71, 130, 75, ZONE.park); // Victoria park
  // Queen Elizabeth Olympic Park: green parkland on the east Lea bank so the
  // four 2012 heroes (VeloPark, Stadium, Orbit, Westfield) stand in the park
  // rather than being swamped by dense towers (owner, 2026-06-13).
  zoneRect(132, 65, 139, 73, ZONE.park);
  zoneRect(130, 100, 137, 104, ZONE.park); // Greenwich park
  zoneRect(126, 108, 132, 113, ZONE.park); // Dulwich
  // Wembley: a green apron around the (now 2×2) stadium + arch so the hero
  // stands proud of the surrounding terraces/council blocks (owner playtest,
  // 2026-06-13: the venues must read as dominant landmarks).
  zoneRect(85, 57, 91, 63, ZONE.park);
  // The O2 / Millennium Dome: the Greenwich peninsula tip is open ground
  // (car parks + plaza) around the dome — clear an apron so the enormous 3×3
  // canopy isn't swamped by the terraces to its south/west.
  zoneRect(137, 88, 143, 93, ZONE.park);
  // golf courses fringing the suburbs and towns
  for (const [cx, cy, r] of [
    [70, 58, 2], [44, 64, 1.8], [100, 34, 1.8], [148, 70, 2],
    [126, 126, 2], [170, 110, 1.8], [52, 118, 1.8], [228, 56, 1.8],
  ] as const) {
    zoneBlob(cx, cy, r, ZONE.park);
  }

  // 6b) Copses + scattered farmsteads: the belt reads as worked, enclosed
  // English farmland, not a snooker table
  for (let attempt = 0; attempt < 110; attempt++) {
    const cx = 4 + rng.int(w - 8);
    const cy = 6 + rng.int(h - 12);
    if (zone[idx(cx, cy)] !== ZONE.none) continue;
    if (!isLand(cx, cy) || inAirfield(cx, cy)) continue;
    forestBlob(cx, cy, 1 + rng.int(3));
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const cx = 6 + rng.int(w - 12);
    const cy = 8 + rng.int(h - 16);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy) || inAirfield(cx, cy)) continue;
    if (cx > 180 && Math.abs(cy - riverCenterY(cx)) < 10) continue; // not on the marsh
    zoneBlob(cx, cy, 0.9, ZONE.rural); // a farmstead and its yard
  }
  // heather and rough grazing in patches through the belt
  for (let attempt = 0; attempt < 14; attempt++) {
    const cx = 8 + rng.int(w - 16);
    const cy = 10 + rng.int(h - 20);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy) || inAirfield(cx, cy)) continue;
    if (cx > 180 && Math.abs(cy - riverCenterY(cx)) < 10) continue;
    terrainBlob(cx, cy, 1.5 + rng.range(0, 1.5), TERRAIN.hill);
  }

  // 7) Councils: nearest-seed Voronoi over land
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isLand(x, y) && terrain[idx(x, y)] !== TERRAIN.trees && terrain[idx(x, y)] !== TERRAIN.hill)
        continue;
      let best = NO_COUNCIL;
      let bestD = Infinity;
      for (const s of COUNCIL_SEEDS) {
        const d = (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y);
        if (d < bestD) {
          bestD = d;
          best = s.id;
        }
      }
      council[idx(x, y)] = best;
    }
  }

  // 8) The vector transport network ------------------------------------------
  // Doctrine: through built fabric every carriageway follows the TILE
  // LATTICE — integer corner points and axis-aligned runs (the render
  // spline rounds each corner by well under a tile, a neat chamfer), so
  // streets run BETWEEN the building blocks and houses front straight onto
  // them. Out in the open country, motorways, railways and lanes keep
  // their sweep. No street or arterial crosses the Thames except at the
  // designated bridges, always perpendicular to the water.

  /** Tiles that count as built fabric for the road lattice. */
  const inhabited = (x: number, y: number): boolean => {
    if (!inb(x, y) || !isLand(x, y)) return false;
    const z = zone[idx(x, y)] as Zone;
    return (
      z === ZONE.urbanCore ||
      z === ZONE.cbd ||
      z === ZONE.urban ||
      z === ZONE.suburb ||
      z === ZONE.posh ||
      z === ZONE.industrial ||
      z === ZONE.newEstate
    );
  };
  const nearTown = (x: number, y: number): boolean => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (inhabited(xi + dx, yi + dy)) return true;
      }
    }
    return false;
  };

  /** Re-lay a sweeping polyline so that wherever it passes through town it
   *  follows the lattice: waypoints snap to tile corners and every leg
   *  becomes axis-aligned runs with an L-corner every few tiles. Open-
   *  country stretches keep their original sweep. Original waypoints are
   *  preserved, so junctions between routes survive. */
  const latticeThroughTowns = (pts: Array<[number, number]>): Array<[number, number]> => {
    // chop every leg into ~4-tile chords so the town test is local
    const chords: Array<[number, number]> = [];
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s] ?? [0, 0];
      const [bx, by] = pts[s + 1] ?? [0, 0];
      const pieces = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let k = 0; k < pieces; k++) {
        chords.push([ax + ((bx - ax) * k) / pieces, ay + ((by - ay) * k) / pieces]);
      }
    }
    const lastPt = pts[pts.length - 1];
    if (lastPt) chords.push([lastPt[0], lastPt[1]]);
    const town = chords.map(([x, y]) => nearTown(x, y));
    const out: Array<[number, number]> = [];
    const push = (x: number, y: number): void => {
      const tail = out[out.length - 1];
      if (!tail || tail[0] !== x || tail[1] !== y) out.push([x, y]);
    };
    for (let k = 0; k < chords.length; k++) {
      const [cx, cy] = chords[k] ?? [0, 0];
      const snap = town[k] === true;
      const px = snap ? Math.round(cx) : cx;
      const py = snap ? Math.round(cy) : cy;
      const tail = out[out.length - 1];
      if (tail && snap && town[k - 1] === true && px !== tail[0] && py !== tail[1]) {
        // L-corner between lattice points: longest leg first
        if (Math.abs(px - tail[0]) >= Math.abs(py - tail[1])) push(px, tail[1]);
        else push(tail[0], py);
      }
      push(px, py);
    }
    return out;
  };

  const addRoute = (kind: TransportRoute['kind'], pts: Array<[number, number]>): void => {
    routes.push({ kind, pts });
  };
  /** Major roads (the spider's web) sweep as smooth real alignments — the
   *  ribbon renderer rounds their corners, so the old lattice snap is
   *  redundant AND it is exactly what staircased the arterials into a
   *  zig-zag (docs/map-overhaul.md Phase 2). Reserve lattice-snapping for
   *  LOCAL lanes only, where axis-aligned village runs still read right. */
  const addArterial = (pts: Array<[number, number]>): void => {
    addRoute('arterial', pts);
  };
  const addRoad = (kind: 'arterial' | 'lane', pts: Array<[number, number]>): void => {
    if (kind === 'arterial') addArterial(pts);
    else addRoute(kind, latticeThroughTowns(pts));
  };

  // the M25, ringing the whole city — hand-laid on its real line: it
  // passes WEST of Heathrow (the airport sits inside the ring between the
  // M4 and the M3) and crosses the river at the Dartford narrows
  addRoute('motorway', [
    [118, 28], // South Mimms
    [100, 30],
    [84, 32], // Kings Langley
    [68, 34], // skirting north-west of Watford
    [58, 40], // Chorleywood
    [52, 50],
    [48, 62], // the M40 junction
    [48, 76], // the M4 junction — west of Heathrow
    [50, 90], // still west of the airport
    [52, 102], // Staines, crossing the river
    [56, 112], // the M3 junction
    [62, 122], // Chertsey
    [70, 130], // Wisley (the A3)
    [84, 136], // Leatherhead
    [100, 140], // Reigate
    [118, 142], // Godstone
    [134, 140],
    [146, 132], // the Kent corner, north of Sevenoaks
    [154, 120],
    [160, 110], // Swanley
    [166, 102],
    [170, 96], // the Dartford crossing, over the narrows
    [172, 86], // Thurrock
    [172, 74],
    [170, 62],
    [166, 50], // the Brentwood corner
    [158, 42], // the M11 junction
    [146, 36], // skirting Epping forest
    [134, 32], // Enfield
    [118, 28],
  ]);
  // the M4 west past Slough and the M3 south-west — Heathrow sits between
  // (the M3 starts on the south bank: it never enters the river)
  addRoute('motorway', [[100, 78], [80, 76], [60, 72], [40, 68], [20, 64], [0, 62]]);
  addRoute('motorway', [[100, 101], [82, 105], [62, 112], [44, 116], [24, 122], [0, 126]]);
  // the North + South Circulars: the inner ring road. Now a smooth arc
  // (no lattice staircase), it crosses the river square-on at two
  // perpendicular bridges — the Blackwall side EAST of the deepened Isle
  // of Dogs loop (x=145, clear of the Greenwich peninsula tip at x=142)
  // and the Kew side at x=96. The south-bank approach holds x≈145 before
  // turning west so the arc never bows back across the loop's east arm.
  addRoad('arterial', [
    [104, 62], [112, 60], [124, 60], [132, 63], [140, 70], [145, 78],
    [145, bank(145, -1)], [145, bank(145, 1)], // the east crossing, clear of the loop
    [145, 99], [138, 103], [130, 104], [122, 104], [114, 103], [106, 103], [100, 103],
    [96, bank(96, 1)], [96, bank(96, -1)], // the west crossing
    [94, 87], [93, 80], [94, 72], [98, 66], [104, 62],
  ]);
  // embankment arterials hugging each bank through town: stepped along the
  // lattice at a fixed quantized setback off the water
  {
    // the north embankment steps one column early behind Westminster so
    // the Parliament precinct keeps its river frontage to itself
    const rowAt = (x: number, side: -1 | 1): number =>
      side < 0 && x >= 106 && x <= 110 ? bank(x + 1, -1) : bank(x, side);
    const bankPath = (x0: number, x1: number, side: -1 | 1): void => {
      let y = rowAt(x0, side);
      const pts: Array<[number, number]> = [[x0, y]];
      for (let x = x0 + 1; x <= x1; x++) {
        const ny = rowAt(x, side);
        if (ny !== y) {
          pts.push([x, y]);
          pts.push([x, ny]);
          y = ny;
        }
      }
      const tail = pts[pts.length - 1];
      if (!tail || tail[0] !== x1 || tail[1] !== y) pts.push([x1, y]);
      addRoute('arterial', pts); // lattice by construction
    };
    // both embankments stop short of the Isle of Dogs loop (x≈127): past
    // it the river weaves deep through the Greenwich loop and the Woolwich
    // reaches, so a bank-hugging arterial would graze the water. The loop
    // and the eastern reaches are served by the South Circular and the A2
    // / A13 radials instead.
    bankPath(86, 126, -1);
    bankPath(86, 126, 1);
  }
  // the radials themselves
  for (const r of RADIALS) addRoad('arterial', r);
  // country lanes chaining the villages — every lane ends at a town, a
  // village, another road or the map edge; none dies in a field. They
  // sweep through open country and snap to the lattice through towns.
  addRoad('lane', [[22, 36], [18, 60], [18, 86]]); // Amersham → Windsor
  addRoad('lane', [[18, 86], [26, 78], [34, 70]]); // Windsor → Slough
  addRoad('lane', [[18, 86], [26, 92], [30, 96], [30, 107], [36, 108]]); // Windsor → Staines, crossing the river square-on at the town bridge
  addRoad('lane', [[36, 108], [48, 114], [60, 128], [76, 128], [90, 128]]); // Staines → Chertsey → Cobham → Epsom
  addRoad('lane', [[48, 114], [40, 122]]); // Chertsey → Woking
  addRoad('lane', [[60, 128], [48, 142]]); // Cobham → Guildford
  addRoad('lane', [[48, 142], [68, 146], [88, 144]]); // Guildford → Dorking, under the Downs
  addRoad('lane', [[88, 144], [90, 128]]); // Dorking → Epsom
  addRoad('lane', [[90, 128], [106, 122], [120, 114]]); // Epsom → Croydon
  addRoad('lane', [[120, 114], [126, 130], [132, 146]]); // Croydon → Oxted
  addRoad('lane', [[132, 146], [148, 144], [162, 138]]); // Oxted → Sevenoaks
  // Gravesend → Hoo: an axis-aligned run along the lattice through
  // Gravesend's fabric, then a clean sweep across the open marsh edge —
  // the old single shallow diagonal staircased through town
  addRoad('lane', [[188, 106], [198, 106], [203, 108], [206, 110]]);
  addRoad('lane', [[206, 110], [216, 118], [225, 124]]); // Hoo → the A2
  addRoad('lane', [[22, 36], [40, 40], [64, 42]]); // Amersham → Watford
  addRoad('lane', [[64, 42], [80, 34], [98, 22]]); // Watford → St Albans
  addRoad('lane', [[98, 22], [112, 14], [136, 12]]); // St Albans → Hatfield → Ware
  addRoad('lane', [[136, 12], [148, 16], [162, 24]]); // Ware → Harlow
  addRoad('lane', [[162, 24], [174, 36], [182, 50]]); // Harlow → Ongar → Brentwood
  addRoad('lane', [[182, 50], [194, 44], [208, 32]]); // Brentwood → Billericay → Chelmsford
  addRoad('lane', [[208, 32], [222, 26], [234, 22]]); // Chelmsford → Maldon
  addRoad('lane', [[234, 22], [228, 38], [222, 50]]); // Maldon → Rayleigh
  addRoad('lane', [[198, 58], [210, 54], [222, 50]]); // Basildon → Rayleigh
  addRoad('lane', [[222, 50], [230, 56], [236, 62]]); // Rayleigh → Southend
  // Tilbury → Grays → the A13: proper lattice runs (west along the dock
  // row, then straight up Grays' high street to the A13) — the old
  // diagonal pair staircased through the chalk-pit terraces
  addRoad('lane', [[182, 92], [178, 92], [178, 90], [178, 85], [177, 85]]);
  addRoad('lane', [[142, 62], [150, 64], [158, 64]]); // Chigwell → Romford

  // railways out of the central termini, every line ending at a town or
  // the map edge
  const RAILS: Array<Array<[number, number]>> = [
    [[114, 78], [98, 58], [78, 46], [64, 42], [48, 28], [40, 14], [38, 0]], // NW main line through Watford
    [[122, 76], [134, 54], [148, 38], [162, 24]], // Lea valley → Harlow
    [[124, 80], [146, 70], [158, 64], [182, 52], [208, 32], [228, 20], [248, 10], [255, 7]], // Great Eastern → Romford, Chelmsford, out NE
    [[124, 82], [148, 80], [166, 84], [178, 88], [192, 86], [210, 76], [224, 68], [236, 64]], // LTS along the estuary → Southend
    [[122, 86], [142, 96], [160, 100], [174, 103], [188, 105], [206, 112], [222, 124], [236, 138], [246, 152], [250, 159]], // North Kent → Dartford, Gravesend, out SE
    [[114, 86], [118, 102], [120, 116], [114, 132], [108, 148], [106, 159]], // Brighton line through Croydon
    [[122, 88], [136, 102], [150, 118], [162, 138]], // SE → Sevenoaks
    [[110, 83], [88, 98], [66, 108], [48, 114], [40, 122]], // SW → Staines side, Woking (lifted off the bank behind Parliament)
    [[112, 78], [88, 80], [62, 76], [34, 70], [14, 68], [0, 67]], // Great Western → Slough
  ];
  for (const line of RAILS) addRoute('rail', line);

  // local streets: the CITY-BLOCK LATTICE. Straight runs along the tile
  // grid — rows every 4th tile, columns every 5th — clipped to inhabited
  // land, never crossing water. The carriageway corridor clears its own
  // row of structures and the houses either side front straight onto it;
  // blocks come out 4 wide by 3 deep. No jitter: tessellation is the point.
  {
    for (let y = 4; y < h - 2; y += 4) {
      let runStart = -1;
      for (let x = 0; x <= w; x++) {
        const on = x < w && inhabited(x, y);
        if (on && runStart < 0) runStart = x;
        if (!on && runStart >= 0) {
          if (x - runStart >= 3) addRoute('street', [[runStart, y], [x - 1, y]]);
          runStart = -1;
        }
      }
    }
    for (let x = 2; x < w - 2; x += 5) {
      let runStart = -1;
      for (let y = 0; y <= h; y++) {
        const on = y < h && inhabited(x, y);
        if (on && runStart < 0) runStart = y;
        if (!on && runStart >= 0) {
          if (y - runStart >= 3) addRoute('street', [[x, runStart], [x, y - 1]]);
          runStart = -1;
        }
      }
    }
  }

  // the Thames bridges: Kingston, Richmond, Hammersmith upstream, then
  // Westminster, Waterloo, Blackfriars, London Bridge and Tower Bridge
  // through town — each crossing square-on to the water, its approach
  // road running on to meet the nearest street-lattice row. (The
  // Circular's own crossings at x=96 and x=143 are arterial bridges.)
  for (const bx of [74, 80, 88, 102, 106, 110, 114, 117, 120]) {
    let yN = bank(bx, -1);
    while (yN % 4 !== 0) yN--;
    let yS = bank(bx, 1);
    while (yS % 4 !== 0) yS++;
    addRoute('street', [[bx, yN], [bx, yS]]);
  }
  // Heathrow's spur road: in from the A4 along the lattice, crossing the
  // north runway square-on to reach the terminal between the runways
  addRoute('street', [[70, 78], [70, 83], [66, 83], [66, 86]]);
  // Southend's pier: the longest in the world, a street into the sea
  {
    const px = 238;
    const shore = Math.ceil(riverCenterY(px) - riverHalfWidth(px));
    addRoute('street', [[px, shore - 1], [px, shore + 5]]);
  }

  // 8b) Stamp routes onto the gameplay raster
  const CLASS_CODE: Record<TransportRoute['kind'], number> = {
    street: RC.street,
    lane: RC.street,
    arterial: RC.arterial,
    motorway: RC.motorway,
    rail: RC.rail,
  };
  for (const route of routes) {
    const code = CLASS_CODE[route.kind];
    for (const [sx, sy] of sampleRoute(route, 0.3)) {
      const tx = Math.round(sx);
      const ty = Math.round(sy);
      if (!inb(tx, ty)) continue;
      const i = idx(tx, ty);
      if (code === RC.street) {
        // FRONTAGE (docs/map-overhaul.md Phase 3): the high-street fix.
        // LOCAL STREETS through the city never clear their centre tile —
        // they stamp only `streetTouch`, so the terrace KEEPS fronting the
        // narrow carriageway and the grey road-moat closes to a thin seam
        // of building wall on both kerbs. Only country LANES keep the
        // centre-clearing (their cottages front a verge, not a wall).
        const near = Math.abs(sx - tx) < 0.33 && Math.abs(sy - ty) < 0.33;
        const val = route.kind === 'lane' && near ? RC.street : RC.streetTouch;
        if ((road[i] ?? 0) < val) road[i] = val;
      } else if ((road[i] ?? 0) < code) {
        road[i] = code;
      }
    }
  }

  // 8c) Enclosure: hedgerow lines divide the open countryside into fields
  // of honestly varied size — 3..9 tiles a pitch, lines that wander a
  // tile either way, whole stretches missing where fields were merged.
  // (Laid after the roads so no hedge grows through a carriageway.)
  const fieldCols: number[] = [];
  const fieldRows: number[] = [];
  {
    for (let x = 2 + rng.int(5); x < w; x += 3 + rng.int(7)) fieldCols.push(x);
    for (let y = 2 + rng.int(5); y < h; y += 3 + rng.int(7)) fieldRows.push(y);
    const hash2 = (a: number, b: number): number =>
      (Math.imul(a + 0x9e37, 2654435761) ^ Math.imul(b + 0x79b9, 97002721)) >>> 0;
    const open = (x: number, y: number): boolean =>
      inb(x, y) &&
      terrain[idx(x, y)] === TERRAIN.land &&
      zone[idx(x, y)] === ZONE.none &&
      (road[idx(x, y)] ?? 0) === 0 &&
      !inAirfield(x, y) &&
      !(x > 180 && Math.abs(y - riverCenterY(x)) < 9); // the marsh stays open
    fieldCols.forEach((bx, k) => {
      for (let y = 0; y < h; y++) {
        if (hash2(k, y >> 3) % 10 < 3) continue; // merged fields leave gaps
        const off = (hash2(k * 7 + 1, y >> 2) % 3) - 1; // the line wanders
        const x = bx + off;
        if (open(x, y) && rng.chance(0.62)) terrain[idx(x, y)] = TERRAIN.trees;
      }
    });
    fieldRows.forEach((by, k) => {
      for (let x = 0; x < w; x++) {
        if (hash2(k + 101, x >> 3) % 10 < 3) continue;
        const off = (hash2(k * 13 + 5, x >> 2) % 3) - 1;
        const y = by + off;
        if (open(x, y) && rng.chance(0.62)) terrain[idx(x, y)] = TERRAIN.trees;
      }
    });
  }
  /** Index of the enclosure a tile sits in (for coherent per-field tint). */
  const fieldCellOf = (x: number, y: number): number => {
    let cx = 0;
    while (cx < fieldCols.length && (fieldCols[cx] ?? w) <= x) cx++;
    let cy = 0;
    while (cy < fieldRows.length && (fieldRows[cy] ?? h) <= y) cy++;
    return (Math.imul(cx * 31 + 7, 2654435761) ^ Math.imul(cy * 17 + 3, 97002721)) >>> 0;
  };

  // 8d) High streets: shops flank the arterials through inhabited fabric
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      const z = zone[i] as Zone;
      if (z !== ZONE.urban && z !== ZONE.suburb) continue;
      if ((road[i] ?? 0) >= RC.arterial) continue;
      const nearArterial =
        road[idx(x, y - 1)] === RC.arterial ||
        road[idx(x + 1, y)] === RC.arterial ||
        road[idx(x, y + 1)] === RC.arterial ||
        road[idx(x - 1, y)] === RC.arterial;
      if (nearArterial) flags[i] = (flags[i] ?? 0) | FLAG_SHOPS;
    }
  }

  // 9) Landmarks: the icons in their real places + civic kit per town
  const placeLandmark = (x: number, y: number, id: Landmark): void => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (!inb(xi, yi)) return;
    for (let r = 0; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = xi + dx;
          const ty = yi + dy;
          if (!inb(tx, ty)) continue;
          const i = idx(tx, ty);
          if (terrain[i] !== TERRAIN.land) continue;
          if ((landmark[i] ?? 0) !== 0) continue;
          if ((road[i] ?? 0) >= RC.arterial) continue;
          landmark[i] = id;
          if (road[i] === RC.street) road[i] = RC.streetTouch;
          for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              if (!inb(tx + nx, ty + ny)) continue;
              const j = idx(tx + nx, ty + ny);
              if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
            }
          }
          return;
        }
      }
    }
  };

  /** Claim an exact w×h tile rectangle for a to-scale landmark: every
   *  tile is protected fabric + building exclusion. Land only; arterials
   *  refuse; streets beneath demote to a frontage touch. */
  const placeLandmarkRect = (x0: number, y0: number, rw: number, rh: number, id: Landmark): void => {
    for (let ty = y0; ty < y0 + rh; ty++) {
      for (let tx = x0; tx < x0 + rw; tx++) {
        if (!inb(tx, ty)) continue;
        const i = idx(tx, ty);
        if (terrain[i] !== TERRAIN.land) continue;
        if ((road[i] ?? 0) >= RC.arterial) continue;
        landmark[i] = id;
        if (road[i] === RC.street) road[i] = RC.streetTouch;
        for (let ny = -1; ny <= 1; ny++) {
          for (let nx = -1; nx <= 1; nx++) {
            if (!inb(tx + nx, ty + ny)) continue;
            const j = idx(tx + nx, ty + ny);
            if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
          }
        }
      }
    }
  };

  const riverY = (x: number): number => Math.round(riverCenterY(x));
  const hwAt = (x: number): number => riverHalfWidth(x);
  // Westminster: the Houses of Parliament take a full 3-long × 2-deep
  // river-front precinct on the north bank at the bend (each column
  // follows the bank, so the long face fronts the water beside the
  // Westminster bridge); the wheel watches from across the water
  for (let px = 107; px <= 109; px++) {
    const py = riverY(px) - Math.ceil(hwAt(px)) - 1;
    placeLandmarkRect(px, py - 1, 1, 2, LANDMARK.parliament);
  }
  placeLandmark(108, riverY(108) + Math.ceil(hwAt(108)) + 1, LANDMARK.eye);
  // the City: St Paul's takes a 2×2 close (a step back from the
  // embankment carriageway); the shard on the south bank; the fortress
  // + bridge
  placeLandmarkRect(114, 79, 2, 2, LANDMARK.dome);
  placeLandmark(118, riverY(118) + Math.ceil(hwAt(118)) + 1, LANDMARK.spire);
  {
    const bx = 120;
    placeLandmark(bx - 1, riverY(bx - 1) - Math.ceil(hwAt(bx - 1)) - 1, LANDMARK.fortress);
    const cy = riverCenterY(bx);
    const hw = riverHalfWidth(bx);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      if (!inb(bx, y)) continue;
      const i = idx(bx, y);
      if (terrain[i] === TERRAIN.water) landmark[i] = LANDMARK.towerBridge;
    }
  }
  // HEATHROW: the bespoke concrete terminal island reserved between its
  // two parallel runways (the runway tiles are FLAG_RUNWAY at y84-85 and
  // y89-90 above). An 8×3 stamp on x61..68, y86..88 — the air layer flies
  // the real thresholds at (ap.x+9, ap.y±2.5). The whole island is tarmac:
  // force its tiles to open zone and clear any street/arterial so nothing
  // builds on the apron and the single stamp covers a clean rectangle.
  for (let ty = 86; ty <= 88; ty++) {
    for (let tx = 61; tx <= 68; tx++) {
      if (!inb(tx, ty)) continue;
      const i = idx(tx, ty);
      if (terrain[i] !== TERRAIN.land) continue;
      zone[i] = ZONE.none;
      road[i] = RC.none;
    }
  }
  placeLandmarkRect(61, 86, 8, 3, LANDMARK.heathrow);
  // Battersea's four chimneys claim a 2×2 block on the south bank
  placeLandmarkRect(100, riverY(100) + Math.ceil(hwAt(100)) + 1, 2, 2, LANDMARK.powerstation);
  // QUEEN ELIZABETH OLYMPIC PARK, Stratford (owner, 2026-06-13): the four
  // heroes of the 2012 park on the Lea's east bank, in true relative order —
  // the VeloPark to the north, the Stadium bowl central, the ArcelorMittal
  // Orbit between it and Westfield, the Westfield Stratford City retail mass
  // to the south-east beside the park.
  placeLandmark(133, 66, LANDMARK.velodrome); // Lee Valley VeloPark, N
  // the Olympic Stadium bowl, centre — a dominant 3×3 (owner playtest): the
  // real London Stadium is enormous. Reserve its precinct (anchor 133,68).
  placeLandmarkRect(133, 68, 3, 3, LANDMARK.stadium);
  placeLandmark(137, 68, LANDMARK.orbit); // the ArcelorMittal Orbit, the tower (E of the bowl)
  placeLandmarkRect(137, 72, 2, 2, LANDMARK.westfield); // Westfield Stratford City, SE
  placeLandmark(118, 58, LANDMARK.arena); // north London ground
  placeLandmark(106, 110, LANDMARK.arena); // south London ground
  placeLandmark(98, 74, LANDMARK.mall); // the western Westfield (Shepherd's Bush)
  placeLandmark(114, 65, LANDMARK.zoo); // in Regent's park
  placeLandmark(115, 65, LANDMARK.zoo);
  // Wave 9 heroes (map-overhaul §5: "many are missing") at true positions.
  // Multi-tile ones reserve their precinct; the rest take a single anchor.
  // Wembley: the great arch + bowl, a dominant 2×2 (owner playtest), NW
  placeLandmarkRect(87, 59, 2, 2, LANDMARK.wembley);
  // The O2 / Millennium Dome: ENORMOUS — a dominant 3×3 on the Greenwich
  // peninsula (owner playtest, 2026-06-13). Anchor at 139,89 keeps it centred
  // near its true spot, clear of the Thames just to its north.
  placeLandmarkRect(139, 89, 3, 3, LANDMARK.o2dome);
  placeLandmark(118, 118, LANDMARK.palacemast); // Crystal Palace, S ridge
  placeLandmarkRect(112, 52, 2, 1, LANDMARK.allypally); // Alexandra Palace, N hill
  placeLandmarkRect(149, 85, 3, 1, LANDMARK.excel); // ExCeL / Royal Docks, E (long 3×1)
  placeLandmark(86, 96, LANDMARK.kewhouse); // Kew Palm House by the bend
  placeLandmark(112, 72, LANDMARK.bttower); // BT Tower, West End spike
  // the Gherkin: a single CBD tile gets its own id (no neighbour demotion —
  // it IS a City tower), so the icon survives map shifts that used to lose it
  {
    const gi = idx(118, 77);
    if (terrain[gi] === TERRAIN.land && (landmark[gi] ?? 0) === 0 && (road[gi] ?? 0) < RC.arterial) {
      landmark[gi] = LANDMARK.gherkin;
      if (road[gi] === RC.street) road[gi] = RC.streetTouch;
    }
  }
  // central termini
  placeLandmark(114, 78, LANDMARK.station);
  placeLandmark(122, 76, LANDMARK.station);
  placeLandmark(122, 90, LANDMARK.station); // London Bridge, south bank
  // schools + the city hall through the boroughs
  for (const [sx, sy] of [[102, 70], [128, 64], [106, 102], [126, 94], [138, 78], [96, 88], [116, 108]] as const) {
    placeLandmark(sx, sy, LANDMARK.school);
  }
  placeLandmark(121, 92, LANDMARK.townhall);
  // the sewage works that serve the city, on the riverbanks east and west
  placeLandmark(152, 82, LANDMARK.sewage); // Beckton analog
  placeLandmark(162, 100, LANDMARK.sewage); // Crossness analog
  placeLandmark(78, 95, LANDMARK.sewage); // Mogden analog

  // every town seed gets its civic kit
  const railSamples: Array<[number, number]> = [];
  for (const route of routes) {
    if (route.kind === 'rail') railSamples.push(...sampleRoute(route, 0.5));
  }
  for (const t of TOWNS) {
    if (t.kind === 'town') {
      placeLandmark(t.x + rng.int(3) - 1, t.y + rng.int(3) - 1, LANDMARK.townhall);
      placeLandmark(t.x + rng.range(-t.r, t.r), t.y - t.r - rng.int(2), LANDMARK.school);
      placeLandmark(t.x - t.r, t.y + t.r, LANDMARK.carpark);
      placeLandmark(
        t.x + (rng.chance(0.5) ? 1 : -1) * (t.r * 2 + 1),
        t.y + rng.int(3) - 1,
        rng.chance(0.5) ? LANDMARK.watertower : LANDMARK.sewage,
      );
      let best: [number, number] | undefined;
      let bestD = 9;
      for (const [rx, ry] of railSamples) {
        const d = Math.hypot(rx - t.x, ry - t.y);
        if (d < bestD) {
          bestD = d;
          best = [rx, ry];
        }
      }
      if (best) placeLandmark((best[0] ?? t.x) + 1, best[1] ?? t.y, LANDMARK.station);
    } else {
      placeLandmark(t.x, t.y - 1, LANDMARK.church);
      if (rng.chance(0.3)) placeLandmark(t.x + 2, t.y + 2, LANDMARK.watertower);
    }
  }
  // 10) Customers, vegetation, sprite variants. Open countryside takes a
  // coherent per-field tint (one enclosure, one sward) so the patchwork
  // reads as real fields of varied size rather than per-tile noise.
  const LANDMARK_CUSTOMERS: Partial<Record<Landmark, number>> = {
    [LANDMARK.mall]: 40,
    [LANDMARK.stadium]: 12,
    [LANDMARK.arena]: 10,
    [LANDMARK.parliament]: 8,
    [LANDMARK.zoo]: 4,
    [LANDMARK.dome]: 4,
    [LANDMARK.spire]: 30,
    [LANDMARK.eye]: 4,
    [LANDMARK.fortress]: 4,
    [LANDMARK.station]: 8,
    [LANDMARK.school]: 6,
    [LANDMARK.townhall]: 6,
    [LANDMARK.church]: 2,
    [LANDMARK.datacentre]: 2,
    // Wave 9 heroes: venues draw a crowd, masts/glasshouses barely any
    [LANDMARK.wembley]: 14,
    [LANDMARK.o2dome]: 16,
    [LANDMARK.excel]: 12,
    [LANDMARK.allypally]: 6,
    [LANDMARK.kewhouse]: 3,
    [LANDMARK.palacemast]: 1,
    [LANDMARK.bttower]: 6,
    [LANDMARK.gherkin]: 40, // a full City office tower
    // Queen Elizabeth Olympic Park: the big Westfield draws a mall's crowd,
    // the venues a stadium's, the Orbit a handful of visitors
    [LANDMARK.velodrome]: 10,
    [LANDMARK.orbit]: 4,
    [LANDMARK.westfield]: 40,
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const z = zone[i] as Zone;
      const lm = landmark[i] as Landmark;
      if (lm !== LANDMARK.none) customers[i] = LANDMARK_CUSTOMERS[lm] ?? 0;
      else if ((road[i] ?? 0) >= RC.arterial) customers[i] = 0;
      else customers[i] = CUSTOMERS_PER_TILE[z];
      const t = terrain[i];
      if (t === TERRAIN.trees) vegetation[i] = 200 + rng.int(56);
      else if (z === ZONE.rural || z === ZONE.none)
        vegetation[i] = t === TERRAIN.land ? 90 + rng.int(70) : 30;
      else if (z === ZONE.suburb || z === ZONE.posh || z === ZONE.park) vegetation[i] = 60 + rng.int(60);
      else vegetation[i] = 10 + rng.int(30);
      if (z === ZONE.none && t === TERRAIN.land && !(x > 180 && Math.abs(y - riverCenterY(x)) < 9)) {
        const cell = fieldCellOf(x, y);
        variant[i] = rng.chance(0.15) ? rng.int(256) : cell % 256;
      } else {
        variant[i] = rng.int(256);
      }
    }
  }

  const map: CityMap = {
    width: w,
    height: h,
    terrain,
    zone,
    council,
    road,
    routes,
    customers,
    vegetation,
    variant,
    landmark,
    flags,
    councils: COUNCIL_SEEDS.map(({ x: _x, y: _y, ...profile }) => profile),
    // scenery the renderer/UI read off the map (so they need no London import).
    // London's NAMED_PLACES are all landmark-class (gated to mid/close zoom);
    // TOWNS + AIRPORTS already match the MapTown/MapAirport shapes.
    fabric: 'london',
    named: NAMED_PLACES.map((p) => ({ ...p, landmark: true })),
    towns: TOWNS.map((t) => ({ x: t.x, y: t.y, r: t.r, kind: t.kind, name: t.name })),
    airports: AIRPORTS.map((a) => ({ name: a.name, x: a.x, y: a.y, hdg: a.hdg })),
  };
  // London's bespoke heroes (src/render/sprites/heroes/london.ts) place exactly
  // like every OSM city: scan `named`, and for any name a registry hero matches,
  // stamp HERO_BASE+idx across its footprint and add a heroTable slot — so the
  // 41 hand-drawn London heroes render + light. Run AFTER the enum landmark
  // pass so the marquee heroes (anchored on the enum precinct's SW corner)
  // fully overwrite their reservation: same art, bespoke light, no double-draw.
  buildHeroTable(map);
  return map;
}

let cached: CityMap | undefined;

/** The map the CLIENT is currently playing. Historically always London;
 *  tutorial missions swap in their tiny maps via
 *  data/cityRegistry.setActiveScenario (which calls setClientMap). The
 *  function keeps its name so the renderer/ghost/hover call sites — and
 *  other lanes' code — follow the active scenario without edits. */
let clientMap: CityMap | undefined;

export function setClientMap(map: CityMap | undefined): void {
  clientMap = map;
}

export function getLondonMap(): CityMap {
  if (clientMap) return clientMap;
  cached ??= buildLondonMap();
  return cached;
}
