// Static world map model. The map is immutable scenario data; dynamic state
// (network assets, vegetation growth, DER adoption) lives elsewhere and
// references tiles by index.

export const TERRAIN = {
  water: 0,
  land: 1,
  hill: 2,
  trees: 3,
} as const;
export type Terrain = (typeof TERRAIN)[keyof typeof TERRAIN];

export const ZONE = {
  none: 0, // open land, no customers
  urbanCore: 1, // tower blocks, offices, terraces
  urban: 2, // terraces, shops
  suburb: 3, // semis with gardens
  posh: 4, // villas; underground cables required
  rural: 5, // cottages, farms
  industrial: 6, // warehouses, factories
  greenhouse: 7, // glasshouse agriculture
  park: 8,
  solarSite: 9, // pre-sited solar farm field (generation opportunity)
  windSite: 10, // estuary-mouth wind opportunity
  nuclearSite: 11, // the only nuclear-capable coastal site
  cbd: 12, // skyscraper districts (the City / Canary analogs)
  newEstate: 13, // new-build estate: iDNO substation, every home electrified
} as const;
export type Zone = (typeof ZONE)[keyof typeof ZONE];

/** Transport is a VECTOR layer over the tile world: smooth polylines from
 *  20 mph streets up to motorways, plus railways. Tiles stay the unit for
 *  land use and the electrical sim; the `road` raster below is just the
 *  routes stamped onto tiles for gameplay rules. */
export type RouteClass = 'motorway' | 'arterial' | 'street' | 'lane' | 'rail';

export interface TransportRoute {
  kind: RouteClass;
  /** Tile-space waypoints (fractional coords); rendered as a smooth curve. */
  pts: Array<[number, number]>;
}

/** Road-class raster codes (per tile, max of everything crossing it). */
export const RC = {
  none: 0,
  /** A street/lane clips the tile: houses keep fronting it. */
  streetTouch: 1,
  /** A street/lane runs through the tile centre: no structure, but the
   *  homes (customers) stay — front gardens face the carriageway. */
  street: 2,
  /** Heavy infrastructure: nothing lives or builds under these. */
  arterial: 3,
  motorway: 4,
  rail: 5,
} as const;

/** Named landmark per tile (0 = none). Landmarks are protected fabric:
 *  nothing can be built over them and pylons route around them. */
export const LANDMARK = {
  none: 0,
  parliament: 1, // clock tower + debating chamber on the river
  eye: 2, // the big wheel opposite
  dome: 3, // the cathedral dome in the City
  spire: 4, // the glass shard south of the river
  fortress: 5, // the old castle by the bridge
  towerBridge: 6, // twin-tower bascule bridge
  stadium: 7, // the Olympic bowl in the north-east
  arena: 8, // football grounds
  mall: 9, // glass-roofed shopping centres
  zoo: 10, // paddocks and the aviary in the big park
  powerstation: 11, // the decommissioned four-chimney icon
  // civic fabric: every town seed gets a reason to exist
  station: 12, // railway station on the line
  school: 13,
  townhall: 14,
  watertower: 15, // the Victorian landmark on the edge of town
  sewage: 16, // circular clarifiers, quietly essential
  carpark: 17, // surface car park (EV charging, one day)
  church: 18, // village centrepiece
  datacentre: 19, // arrives uninvited, hungry and impatient
  airport: 20, // the terminal in the west; planes, one day
  // Wave 9 heroes (map-overhaul §5: "many are missing"). Append-only so
  // existing landmark-raster values never shift under old saves.
  wembley: 21, // the great white arch over the bowl, NW
  o2dome: 22, // the tented dome on the Greenwich peninsula
  palacemast: 23, // Crystal Palace transmitter mast, S ridge
  allypally: 24, // Alexandra Palace + its mast, N hill
  excel: 25, // ExCeL / Royal Docks exhibition halls, E
  kewhouse: 26, // Kew Palm House glasshouse, by the river bend
  bttower: 27, // BT Tower, the thin West-End spike
  gherkin: 28, // the City's glass bullet (was tile-anchored only)
  heathrow: 29, // the bespoke concrete terminal island in the west
  // Queen Elizabeth Olympic Park, Stratford (owner, 2026-06-13). Append-only
  // so existing landmark-raster values never shift under old saves.
  velodrome: 30, // Lee Valley VeloPark — the curved timber pringle roof
  orbit: 31, // the ArcelorMittal Orbit — red twisting helter-skelter tower
  westfield: 32, // Westfield Stratford City — the big retail mass beside it
  // Bespoke per-city heroes (OSM pipeline). Append-only so existing
  // landmark-raster values never shift under old saves.
  notredame: 33, // gothic cathedral — twin towers, rose window, flèche (Paris)
  eiffel: 34, // the wrought-iron lattice tower with the great base arch (Paris)
  arch: 35, // a great triumphal arch — Arc de Triomphe / city gates
  basilica: 36, // white Romano-Byzantine domed basilica — Sacré-Cœur
  louvre: 37, // classical palace wings around the glass pyramid (Paris)
  grand: 38, // parameterized grand civic building (the ~100 notable-building heroes)
} as const;
export type Landmark = (typeof LANDMARK)[keyof typeof LANDMARK];

/** Customer cluster size per inhabited tile, by zone. */
export const CUSTOMERS_PER_TILE: Record<Zone, number> = {
  [ZONE.none]: 0,
  [ZONE.urbanCore]: 120,
  [ZONE.urban]: 60,
  [ZONE.suburb]: 40,
  [ZONE.posh]: 25,
  [ZONE.rural]: 5,
  [ZONE.industrial]: 8,
  [ZONE.greenhouse]: 4,
  [ZONE.park]: 0,
  [ZONE.solarSite]: 0,
  [ZONE.windSite]: 0,
  [ZONE.nuclearSite]: 0,
  [ZONE.cbd]: 160,
  [ZONE.newEstate]: 45,
};

/** Zones whose building stock is big enough to hide an underground
 *  substation beneath (vault siting rule: large buildings, not houses). */
export const BIG_BUILDING_ZONES: ReadonlySet<number> = new Set([
  ZONE.urbanCore,
  ZONE.cbd,
  ZONE.industrial,
]);

export interface CouncilProfile {
  id: number;
  name: string;
  /** 0..1 — wealth; drives EV/PV/heat-pump affordability. */
  affluence: number;
  /** 0..1 — net-zero ambition; advanced plans accelerate electrification. */
  ambition: number;
  /** Flavour line shown in the council info panel. */
  blurb: string;
}

/** Per-tile flag bits (CityMap.flags). Re-exported here from the map data
 *  so the sim can read planning-relevant land designations without importing
 *  the London-specific scenario module. Kept in sync with src/data/londonMap
 *  (which owns the authoritative FLAG_* literals it stamps at build time). */
export const TILE_FLAG = {
  /** bit 0: a high-street shop frontage. */
  shops: 1,
  /** bit 1: airport runway tarmac. */
  runway: 2,
  /** bit 2: BROWNFIELD — previously-developed land (disused works, gasworks,
   *  depots, docklands, ex-industrial sites). Planning-friendly: the GB
   *  "brownfield first" steer means generation/demand applications favour
   *  these and are waved through without an appeal, where greenfield /
   *  green-belt / conservation land opens a council determination window. */
  brownfield: 4,
} as const;

/** True if tile (x,y) is designated BROWNFIELD (previously-developed land).
 *  Reads the `flags` raster; false off-map or where flags are absent. */
export function isBrownfield(map: CityMap, x: number, y: number): boolean {
  if (!inBounds(map, x, y)) return false;
  const f = map.flags?.[y * map.width + x] ?? 0;
  return (f & TILE_FLAG.brownfield) !== 0;
}

export interface CityMap {
  width: number;
  height: number;
  /** Terrain enum per tile, row-major. */
  terrain: Uint8Array;
  /** Zone enum per tile. */
  zone: Uint8Array;
  /** Council id per land tile (255 = none/water). */
  council: Uint8Array;
  /** Road-class raster (see RC): the vector routes stamped onto tiles. */
  road: Uint8Array;
  /** The vector transport network (motorways → streets, plus rail). */
  routes?: TransportRoute[] | undefined;
  /** Customer cluster size on this tile. */
  customers: Uint16Array;
  /** 0..255 vegetation density (fault exposure for overhead lines). */
  vegetation: Uint8Array;
  /** Sprite variant seed per tile so streets don't repeat. */
  variant: Uint8Array;
  /** Landmark id per tile (see LANDMARK; 0 = none). */
  landmark?: Uint8Array | undefined;
  /** Per-tile flag bits (bit 0: high-street shops; bit 1: runway tarmac;
   *  bit 2: brownfield / previously-developed land — see TILE_FLAG). */
  flags?: Uint8Array | undefined;
  councils: CouncilProfile[];
  /** Per-city architectural style (render hint; default London brick). A
   *  generated city wears its own building stock — e.g. 'paris' renders
   *  Haussmann blocks for the urban fabric. */
  fabric?: 'london' | 'paris' | undefined;
}

export const NO_COUNCIL = 255;

export function tileIndex(map: CityMap, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: CityMap, x: number, y: number): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height;
}
