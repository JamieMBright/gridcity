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
} as const;
export type Zone = (typeof ZONE)[keyof typeof ZONE];

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

export interface CityMap {
  width: number;
  height: number;
  /** Terrain enum per tile, row-major. */
  terrain: Uint8Array;
  /** Zone enum per tile. */
  zone: Uint8Array;
  /** Council id per land tile (255 = none/water). */
  council: Uint8Array;
  /** 1 if a road runs through this tile (static city fabric). */
  road: Uint8Array;
  /** Customer cluster size on this tile. */
  customers: Uint16Array;
  /** 0..255 vegetation density (fault exposure for overhead lines). */
  vegetation: Uint8Array;
  /** Sprite variant seed per tile so streets don't repeat. */
  variant: Uint8Array;
  /** Landmark id per tile (see LANDMARK; 0 = none). */
  landmark?: Uint8Array | undefined;
  councils: CouncilProfile[];
}

export const NO_COUNCIL = 255;

export function tileIndex(map: CityMap, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: CityMap, x: number, y: number): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height;
}
