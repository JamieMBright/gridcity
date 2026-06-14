// ElectriCity — PARIS, drawn from its real geography. The Seine runs
// through the middle as a narrow, intimate river (not the Thames estuary):
// a shallow arc with the Île de la Cité + Île Saint-Louis at the very
// centre. The Périphérique rings the twenty arrondissements, which spiral
// out from the Louvre in the real escargot. Twelve avenues radiate from
// the Étoile (Arc de Triomphe), the Champs-Élysées running down to the
// Tuileries and the Louvre on the river. Montmartre rises in the north
// (Sacré-Cœur on its butte); La Défense's towers stand just beyond the
// ring to the north-west; the Bois de Boulogne and the Bois de Vincennes
// bracket the city east and west. Beyond the Périphérique the dense
// banlieue continues — Paris has no green belt — thinning into the
// Île-de-France plain with its solar fields. All shapes are deterministic;
// a seeded RNG adds organic jitter, identically every run.
//
// This module ships the MAP (geography) only. Registering Paris as a
// playable France scenario — generalising the worker's estate seeding off
// London's coordinates, the France market/CRE profiles, and the bespoke
// hero sprites (Eiffel/Arc/Sacré-Cœur) — is the following wave.

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

export const PARIS_W = 208;
export const PARIS_H = 176;

/** Île de la Cité — Notre-Dame, the kilometre-zero centre of Paris and the
 *  point everything falls away from. */
const CENTRE = { x: 104, y: 90 };

// --- The Seine: the great arc that opens south, islands dead centre --------
// Control points west→east. The Seine enters from the SOUTH-EAST
// (Charenton/Bercy), climbs north-west past the Gare de Lyon, reaches its
// northern apex by the Louvre/Concorde with the Île de la Cité +
// Île Saint-Louis at the very centre, then bends back DOWN to the
// south-west and out past Boulogne/Issy (the head of the great boucle).
// A narrow, even, intensely-bridged river — nothing like the Thames estuary.

const SEINE_PTS: Array<[number, number]> = [
  [4, 152], // out to the south-west (Issy, the boucle toward Boulogne)
  [14, 142],
  [24, 132],
  [34, 122],
  [44, 113],
  [54, 105],
  [64, 98], // the 15th / Pont de Grenelle
  [74, 92], // the Eiffel reach (Champ-de-Mars · Trocadéro)
  [82, 89],
  [90, 88], // the northern apex — Concorde / the Louvre
  [97, 88],
  [104, 90], // Île de la Cité — Notre-Dame
  [110, 91], // Île Saint-Louis
  [118, 95],
  [127, 101], // the Gare de Lyon reach
  [137, 109], // Bercy
  [147, 118],
  [158, 127],
  [170, 137],
  [183, 146],
  [196, 154],
  [207, 160], // in from the south-east (Charenton, the Marne mouth)
];

/** Seine centreline, sampled once from the control spline. */
const SEINE_Y: number[] = (() => {
  const ys = new Array<number>(PARIS_W).fill(90);
  for (const [sx, sy] of sampleRoute({ kind: 'lane', pts: SEINE_PTS }, 0.25)) {
    const x = Math.round(sx);
    if (x >= 0 && x < PARIS_W) ys[x] = sy;
  }
  for (let x = 1; x < PARIS_W; x++) {
    if (ys[x] === 90 && Math.abs((ys[x - 1] ?? 90) - 90) > 0.01) ys[x] = ys[x - 1] ?? 90;
  }
  return ys;
})();

export function seineCenterY(x: number): number {
  const xi = Math.min(PARIS_W - 1, Math.max(0, Math.round(x)));
  return SEINE_Y[xi] ?? 90;
}

/** The Seine is narrow and even — widest through the central island reach,
 *  pinching back up- and down-stream. The islands split it into two arms
 *  (the carve below leaves their tiles as land). */
export function seineHalfWidth(x: number): number {
  const d = Math.abs(x - 100);
  return 2.0 - 0.7 * Math.min(1, d / 95);
}

// --- The twenty arrondissements (the escargot) + key banlieue councils -----

interface CouncilSeed extends CouncilProfile {
  x: number;
  y: number;
}

// The arrondissements spiral clockwise from the 1st (Louvre) outward to the
// 20th (Ménilmontant) — placed at their true relative positions. Affluence
// runs high in the west (7th/8th/16th) and lower in the north-east
// (18th/19th/20th); ambition tracks the city's aggressive climate plan.
const COUNCIL_SEEDS: CouncilSeed[] = [
  { id: 0, x: 102, y: 86, name: '1er — Louvre', affluence: 0.9, ambition: 0.8, blurb: 'Palace, arcades and the river. Heritage rules everything.' },
  { id: 1, x: 108, y: 84, name: '2e — Bourse', affluence: 0.8, ambition: 0.75, blurb: 'The old exchange and the covered passages.' },
  { id: 2, x: 113, y: 87, name: '3e — Marais Haut', affluence: 0.8, ambition: 0.8, blurb: 'Mansions turned galleries. Cabling under cobbles.' },
  { id: 3, x: 110, y: 92, name: '4e — Hôtel de Ville', affluence: 0.82, ambition: 0.85, blurb: 'The city hall, the islands, the oldest streets.' },
  { id: 4, x: 105, y: 97, name: '5e — Quartier Latin', affluence: 0.78, ambition: 0.82, blurb: 'The Panthéon and the universities. Loud about net zero.' },
  { id: 5, x: 97, y: 95, name: '6e — Saint-Germain', affluence: 0.92, ambition: 0.7, blurb: 'Cafés and editors. Will not abide an overhead line.' },
  { id: 6, x: 90, y: 90, name: '7e — Tour Eiffel', affluence: 0.95, ambition: 0.65, blurb: 'Ministries, embassies and the tower. Immovable.' },
  { id: 7, x: 93, y: 82, name: '8e — Champs-Élysées', affluence: 0.93, ambition: 0.7, blurb: 'The avenue, the Élysée, the grands magasins.' },
  { id: 8, x: 104, y: 78, name: '9e — Opéra', affluence: 0.78, ambition: 0.78, blurb: 'Garnier and the department stores.' },
  { id: 9, x: 114, y: 80, name: '10e — Gare du Nord', affluence: 0.55, ambition: 0.8, blurb: 'Two great termini and the canal. Always rebuilding.' },
  { id: 10, x: 121, y: 89, name: '11e — Bastille', affluence: 0.6, ambition: 0.85, blurb: 'Dense, young, impatient for EV kerbside charging.' },
  { id: 11, x: 126, y: 99, name: '12e — Bercy', affluence: 0.58, ambition: 0.8, blurb: 'Wine warehouses reborn; the Bois de Vincennes beyond.' },
  { id: 12, x: 113, y: 104, name: '13e — Italie', affluence: 0.55, ambition: 0.82, blurb: 'Towers and the new university quarter.' },
  { id: 13, x: 101, y: 107, name: '14e — Montparnasse', affluence: 0.62, ambition: 0.78, blurb: 'The lone tower, the catacombs, the observatory.' },
  { id: 14, x: 88, y: 103, name: '15e — Vaugirard', affluence: 0.68, ambition: 0.72, blurb: 'The biggest arrondissement; quietly residential.' },
  { id: 15, x: 76, y: 88, name: '16e — Passy', affluence: 0.95, ambition: 0.6, blurb: 'The grandest addresses, backing onto the Bois.' },
  { id: 16, x: 82, y: 74, name: '17e — Batignolles', affluence: 0.7, ambition: 0.85, blurb: 'The eco-quarter showpiece around the new park.' },
  { id: 17, x: 98, y: 68, name: '18e — Montmartre', affluence: 0.5, ambition: 0.8, blurb: 'The butte, the basilica, the steepest cabling in Paris.' },
  { id: 18, x: 118, y: 70, name: '19e — La Villette', affluence: 0.42, ambition: 0.85, blurb: 'Canals, the science city, the most ambitious plans.' },
  { id: 19, x: 123, y: 80, name: '20e — Ménilmontant', affluence: 0.45, ambition: 0.82, blurb: 'Hilltop cemeteries and a fierce community spirit.' },
  // banlieue — the dense ring beyond the Périphérique
  { id: 20, x: 50, y: 60, name: 'La Défense', affluence: 0.75, ambition: 0.9, blurb: 'The towers. Half the offices, twice the load.' },
  { id: 21, x: 96, y: 40, name: 'Saint-Denis', affluence: 0.3, ambition: 0.8, blurb: 'The basilica of kings and the new stadium quarter.' },
  { id: 22, x: 60, y: 112, name: 'Boulogne-Billancourt', affluence: 0.72, ambition: 0.75, blurb: 'Riverside studios and the old car works, reborn.' },
  { id: 23, x: 150, y: 86, name: 'Montreuil', affluence: 0.5, ambition: 0.8, blurb: 'Artisans and orchards turned creative quarter.' },
  { id: 24, x: 28, y: 138, name: 'Versailles', affluence: 0.85, ambition: 0.55, blurb: 'The château, its park, and very firm opinions.' },
];

// --- Banlieue towns beyond the Périphérique --------------------------------

interface TownSeed {
  x: number;
  y: number;
  r: number;
  name: string;
  dir?: [number, number];
}

const TOWNS: TownSeed[] = [
  { x: 96, y: 40, r: 4, name: 'Saint-Denis', dir: [1, 0.2] },
  { x: 60, y: 112, r: 3.5, name: 'Boulogne-Billancourt', dir: [0, 1] },
  { x: 150, y: 86, r: 3.5, name: 'Montreuil', dir: [1, 0] },
  { x: 40, y: 70, r: 3, name: 'Nanterre', dir: [0, 1] },
  { x: 150, y: 60, r: 3, name: 'Bobigny', dir: [1, 0] },
  { x: 132, y: 120, r: 3, name: 'Créteil', dir: [0.3, 1] },
  { x: 70, y: 140, r: 2.5, name: 'Issy-Meudon', dir: [1, 0] },
  { x: 28, y: 138, r: 3, name: 'Versailles' },
  { x: 170, y: 110, r: 2.5, name: 'Vincennes-Est' },
  { x: 116, y: 36, r: 2.5, name: 'Aubervilliers' },
  { x: 178, y: 64, r: 2, name: 'Noisy' },
  { x: 44, y: 108, r: 2, name: 'Sèvres' },
  { x: 20, y: 96, r: 2, name: 'Rueil' },
  { x: 96, y: 150, r: 2.5, name: 'Antony', dir: [1, 0] },
];

/** Airports for the render-side air layer (flight arcs, planes, shadows):
 *  Charles de Gaulle out on the north-east plain (Roissy), Orly to the
 *  south. Purely additive scenery data, never serialized into saves. */
export interface ParisAirportSpec {
  name: string;
  x: number;
  y: number;
  hdg: 'EW';
}
export const PARIS_AIRPORTS: ParisAirportSpec[] = [
  { name: 'Charles de Gaulle', x: 152, y: 30, hdg: 'EW' },
  { name: 'Orly', x: 96, y: 158, hdg: 'EW' },
];

/** New-build eco-quarters: iDNO transformer in, every roof solar'd. */
export const PARIS_NEW_ESTATES: Array<{ x: number; y: number; r: number }> = [
  { x: 82, y: 72, r: 3 }, // Clichy-Batignolles eco-quartier
  { x: 96, y: 44, r: 3 }, // the stadium quarter, Saint-Denis
  { x: 130, y: 118, r: 3 }, // Créteil
];

const FLAG_BROWNFIELD = 4;

/** Named places the inspector labels at their true relative positions —
 *  the heroes get their bespoke sprites in the next wave, but they are
 *  named now. */
export const PARIS_NAMED_PLACES: Array<{ x: number; y: number; name: string }> = [
  { x: 88, y: 93, name: 'Tour Eiffel' },
  { x: 76, y: 70, name: 'Arc de Triomphe' },
  { x: 100, y: 86, name: 'Louvre' },
  { x: 104, y: 90, name: 'Notre-Dame' },
  { x: 98, y: 65, name: 'Sacré-Cœur' },
  { x: 105, y: 97, name: 'Panthéon' },
  { x: 104, y: 80, name: 'Opéra Garnier' },
  { x: 100, y: 103, name: 'Montparnasse' },
  { x: 50, y: 60, name: 'La Défense' },
  { x: 92, y: 86, name: 'Les Invalides' },
  { x: 114, y: 79, name: 'Gare du Nord' },
  { x: 118, y: 96, name: 'Gare de Lyon' },
  { x: 28, y: 138, name: 'Versailles' },
  { x: 152, y: 30, name: 'Charles de Gaulle' },
  { x: 96, y: 158, name: 'Orly' },
];

const FLAG_RUNWAY = 2;

// --- Builder ---------------------------------------------------------------

export function buildParisMap(): CityMap {
  const w = PARIS_W;
  const h = PARIS_H;
  const n = w * h;
  const rng = new Rng(0x0fa12517);

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
  const isLand = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.land;

  const zoneRect = (x0: number, y0: number, x1: number, y1: number, z: Zone, jitter = 0): void => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!isLand(x, y)) continue;
        if (jitter > 0 && Math.min(x - x0, x1 - x, y - y0, y1 - y) < jitter && rng.chance(0.45))
          continue;
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

  // 1) The Seine + the islands ----------------------------------------------
  for (let x = 0; x < w; x++) {
    const cy = seineCenterY(x);
    const hw = seineHalfWidth(x);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      const d = Math.abs(y - cy);
      if (d <= hw || (d <= hw + 0.8 && rng.chance(0.35))) setTerrain(x, y, TERRAIN.water);
    }
  }
  // the Canal Saint-Martin / de l'Ourcq up to La Villette (NE)
  for (const [sx, sy] of sampleRoute(
    { kind: 'lane', pts: [[116, 92], [117, 84], [118, 76], [120, 68], [124, 58], [128, 48]] },
    0.4,
  )) {
    setTerrain(Math.round(sx), Math.round(sy), TERRAIN.water);
  }
  // the Marne joining from the south-east
  for (const [sx, sy] of sampleRoute(
    { kind: 'lane', pts: [[176, 130], [172, 122], [170, 118], [178, 113]] },
    0.4,
  )) {
    setTerrain(Math.round(sx), Math.round(sy), TERRAIN.water);
  }
  // Île de la Cité + Île Saint-Louis: two boat-shaped islands that split
  // the Seine into two arms through the very centre (Notre-Dame sits on the
  // Cité). Tiles are carved back to LAND inside the already-watered river.
  const island = (ix: number, iy: number): void => {
    if (inb(ix, iy)) terrain[idx(ix, iy)] = TERRAIN.land;
  };
  // Île de la Cité — a long lens, pointed at both tips (the Vert-Galant west,
  // the chevet east), widest amidships
  for (const [x0, x1, yy] of [
    [99, 107, 89],
    [98, 109, 90], // the broad waterline
    [100, 106, 91],
  ] as const) {
    for (let x = x0; x <= x1; x++) island(x, yy);
  }
  island(97, 90); // the western point (Square du Vert-Galant)
  // Île Saint-Louis — a smaller rectangle just upstream to the east
  for (const [x0, x1, yy] of [
    [111, 115, 90],
    [111, 114, 91],
  ] as const) {
    for (let x = x0; x <= x1; x++) island(x, yy);
  }

  // 2) Relief: the buttes — Montmartre (the high point), Belleville, the
  // Buttes-Chaumont in the north-east; Mont Valérien out west; the wooded
  // heights of Meudon to the south-west. Paris is otherwise flat.
  for (const [cx, cy, r] of [
    [98, 65, 3], // Montmartre — Sacré-Cœur on the summit
    [120, 71, 2.4], // Belleville
    [116, 67, 1.8], // Buttes-Chaumont
    [40, 60, 2.4], // Mont Valérien (Suresnes)
    [60, 150, 3], // the Meudon woods ridge
    [24, 132, 2.4], // the Versailles heights
  ] as const) {
    terrainBlob(cx, cy, r, TERRAIN.hill);
  }

  // 3) Woods: the two Bois bracket the city; scattered parks of the plain.
  forestBlob(54, 92, 10); // Bois de Boulogne (west)
  forestBlob(154, 104, 11); // Bois de Vincennes (east)
  forestBlob(22, 140, 7); // the Parc de Versailles woods (south-west)
  forestBlob(62, 152, 5); // Forêt de Meudon
  forestBlob(176, 150, 5); // Bois de Notre-Dame (south-east)
  forestBlob(150, 44, 4); // Parc de la Courneuve (north)
  forestBlob(30, 50, 4); // the Mont-Valérien woods

  // 4) The radial avenues from the Étoile, defined BEFORE the density field
  // so the Haussmann fabric ribbons along them. The Étoile (Arc de
  // Triomphe) throws twelve avenues; the Champs-Élysées runs down to the
  // Concorde, the Tuileries and the Louvre on the river.
  const ETOILE = { x: 76, y: 70 };
  const AVENUES: Array<Array<[number, number]>> = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.26;
    const len = 30;
    AVENUES.push([
      [ETOILE.x, ETOILE.y],
      [ETOILE.x + Math.cos(a) * len, ETOILE.y + Math.sin(a) * len],
    ]);
  }
  // the named set-pieces: the Champs-Élysées → Concorde → Louvre, and the
  // grands boulevards arcing across the right bank
  const BOULEVARDS: Array<Array<[number, number]>> = [
    [[76, 70], [86, 78], [93, 82], [100, 86]], // Champs-Élysées → Tuileries → Louvre
    [[93, 82], [98, 76], [104, 74], [112, 76], [118, 82]], // the grands boulevards (right bank)
    [[100, 86], [108, 88], [116, 92], [122, 98]], // rue de Rivoli → Bastille → Lyon
    [[90, 90], [97, 96], [104, 100], [112, 104]], // the left-bank boulevard (Saint-Germain → Italie)
    [[76, 70], [70, 62], [62, 56], [52, 52]], // avenue de la Grande-Armée → La Défense
  ];

  // 5) The dense Haussmann field — high in the core, falling toward the
  // Périphérique, then the dense banlieue continues (no green belt) and
  // only thins on the Île-de-France plain at the map edge.
  {
    const boost = new Float32Array(n);
    for (const r of [...AVENUES, ...BOULEVARDS]) {
      for (const [sx, sy] of sampleRoute({ kind: 'arterial', pts: r }, 0.5)) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = Math.round(sx + dx);
            const ty = Math.round(sy + dy);
            if (!inb(tx, ty)) continue;
            const d = Math.hypot(sx - tx, sy - ty);
            boost[idx(tx, ty)] = Math.max(boost[idx(tx, ty)] ?? 0, 0.14 * Math.max(0, 1 - d / 2.6));
          }
        }
      }
    }
    const noiseAt = (x: number, y: number): number => {
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
      return (v - 0.5) * 0.24;
    };
    const RMAX = 92; // shallow falloff: the banlieue stays built-up
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isLand(x, y)) continue;
        const i = idx(x, y);
        const d = Math.hypot(x - CENTRE.x, y - CENTRE.y);
        const noiseWeight = Math.max(0.25, Math.min(1, d / 50));
        const v = 1.2 - d / RMAX + (boost[i] ?? 0) + noiseAt(x, y) * noiseWeight;
        if (v >= 0.66) zone[i] = ZONE.urbanCore;
        else if (v >= 0.46) zone[i] = ZONE.urban;
        else if (v >= 0.28) zone[i] = ZONE.suburb;
      }
    }
  }

  // La Défense — the only skyscraper cluster, beyond the ring to the NW
  zoneBlob(50, 60, 3.4, ZONE.cbd);
  zoneBlob(54, 62, 1.8, ZONE.cbd);
  // the grand conservation quarters: the 7th/16th by the river and the Bois
  zoneBlob(90, 88, 2.6, ZONE.posh); // the 7th, around the Invalides/Eiffel
  zoneBlob(78, 88, 3.2, ZONE.posh); // Passy / the 16th
  zoneBlob(94, 82, 2.2, ZONE.posh); // the 8th, off the Champs-Élysées
  // industry / ex-works along the river's edges and the northern banlieue
  zoneRect(36, 108, 48, 114, ZONE.industrial, 1); // the Renault/Billancourt works
  zoneRect(96, 36, 112, 42, ZONE.industrial, 1); // the Plaine Saint-Denis belt
  zoneRect(122, 60, 132, 66, ZONE.industrial, 1); // La Villette / Pantin
  zoneRect(160, 96, 170, 102, ZONE.industrial, 1); // the eastern logistics fringe

  // brownfield: the regenerating ex-industrial belts (Saint-Denis plain,
  // Billancourt works, the eastern rail-lands) — planning-friendly land
  const brownfieldRect = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (isLand(x, y)) flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_BROWNFIELD;
  };
  brownfieldRect(96, 36, 112, 42);
  brownfieldRect(36, 108, 48, 114);
  brownfieldRect(122, 60, 132, 66);
  brownfieldRect(160, 96, 170, 102);

  // 6) The banlieue towns beyond the ring + their industry
  const townBlob = (t: TownSeed): void => {
    const [dx, dy] = t.dir ?? [0, 0];
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    zoneBlob(t.x, t.y, t.r * 1.7, ZONE.suburb);
    zoneBlob(t.x, t.y, t.r, ZONE.urban);
    const lobes = t.r >= 3.5 ? 3 : 2;
    for (let k = 0; k < lobes; k++) {
      const s = (k % 2 === 0 ? 1 : -1) * rng.range(0.8, 2) * t.r;
      zoneBlob(t.x + ux * s + rng.range(-1.5, 1.5), t.y + uy * s + rng.range(-1.5, 1.5), t.r * 0.7, ZONE.suburb);
    }
    if (t.r >= 3) {
      const a = rng.range(0, Math.PI * 2);
      zoneBlob(t.x + Math.cos(a) * t.r * 2.2, t.y + Math.sin(a) * t.r * 2.2, 1.6, ZONE.industrial);
    }
  };
  for (const t of TOWNS) townBlob(t);
  for (const e of PARIS_NEW_ESTATES) zoneBlob(e.x, e.y, e.r, ZONE.newEstate);

  // the airfields: cleared ground out on the plain, two parallel runways
  // each (CDG to the NE, Orly to the south)
  for (const ap of PARIS_AIRPORTS) {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -10; dx <= 10; dx++) {
        const tx = ap.x + dx;
        const ty = ap.y + dy;
        if (!isLand(tx, ty)) continue;
        zone[idx(tx, ty)] = ZONE.none;
      }
    for (const ry of [ap.y - 2, ap.y + 2]) {
      for (let dx = -8; dx <= 8; dx++) {
        const tx = ap.x + dx;
        if (!inb(tx, ry) || terrain[idx(tx, ry)] !== TERRAIN.land) continue;
        flags[idx(tx, ry)] = (flags[idx(tx, ry)] ?? 0) | FLAG_RUNWAY;
      }
    }
  }

  // 7) The iconic OPEN spaces — these are kept clear of building fabric so
  // the avenue-star, the river and the heroes actually read (and they are
  // mostly genuinely open ground in real Paris). The Place de l'Étoile is a
  // round plaza with the twelve avenues fanning out; the Champ-de-Mars is
  // the long green the Eiffel stands on; the Tuileries/Concorde axis runs to
  // the Louvre; the Esplanade des Invalides opens to the river.
  const plaza = (cx: number, cy: number, r: number): void => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (!inb(x, y) || terrain[idx(x, y)] !== TERRAIN.land) continue;
        if (Math.hypot(x - cx, y - cy) <= r) zone[idx(x, y)] = ZONE.park;
      }
  };
  plaza(76, 70, 3.5); // Place de l'Étoile — the Arc and its twelve avenues
  // the grand avenues are WIDE and tree-lined — carve a strip along each so
  // the Étoile's twelve-avenue star and the Champs-Élysées axis read from
  // above instead of vanishing under the Haussmann blocks
  const avenueStrip = (pts: Array<[number, number]>, width: number): void => {
    for (const [sx, sy] of sampleRoute({ kind: 'arterial', pts }, 0.5)) {
      for (let dy = -width - 1; dy <= width + 1; dy++)
        for (let dx = -width - 1; dx <= width + 1; dx++) {
          const tx = Math.round(sx + dx);
          const ty = Math.round(sy + dy);
          if (!inb(tx, ty) || terrain[idx(tx, ty)] !== TERRAIN.land) continue;
          if (Math.hypot(sx - tx, sy - ty) <= width) zone[idx(tx, ty)] = ZONE.park;
        }
    }
  };
  for (const a of AVENUES) avenueStrip(a, 1);
  for (const b of BOULEVARDS) avenueStrip(b, 1.2);
  zoneRect(80, 92, 92, 98, ZONE.park); // the Champ-de-Mars (the Eiffel's lawn)
  zoneRect(70, 88, 78, 94, ZONE.park); // the Trocadéro gardens (right bank)
  zoneRect(92, 84, 100, 89, ZONE.park); // the Tuileries → Concorde
  zoneRect(86, 90, 92, 95, ZONE.park); // the Esplanade des Invalides
  zoneRect(60, 78, 66, 84, ZONE.park); // Parc Monceau / the 17th green
  zoneRect(110, 64, 118, 70, ZONE.park); // Buttes-Chaumont
  zoneRect(100, 104, 106, 109, ZONE.park); // Montsouris
  zoneRect(94, 60, 103, 67, ZONE.park); // the open Montmartre butte around Sacré-Cœur
  // the islands carry only the cathedral + the Conciergerie — keep them low
  // (gardens + quais) so Notre-Dame stands clear of the tower blocks
  for (let yy = 89; yy <= 91; yy++)
    for (let xx = 96; xx <= 116; xx++)
      if (terrain[idx(xx, yy)] === TERRAIN.land) zone[idx(xx, yy)] = ZONE.park;
  // the Île-de-France plain carries the region's solar; wind on the open
  // northern plateau; a nuclear-capable site on the Seine downstream (as
  // France sites its fleet on the great rivers)
  zoneRect(160, 30, 172, 38, ZONE.solarSite);
  zoneRect(40, 28, 52, 35, ZONE.solarSite);
  zoneRect(176, 70, 188, 78, ZONE.solarSite);
  zoneRect(24, 156, 36, 163, ZONE.solarSite);
  zoneRect(150, 150, 162, 158, ZONE.solarSite);
  zoneRect(120, 22, 132, 28, ZONE.greenhouse, 1); // the market gardens of the plain
  zoneRect(180, 40, 192, 47, ZONE.greenhouse, 1);
  zoneRect(2, 18, 14, 26, ZONE.nuclearSite); // a Seine-side site at the western edge

  // 8) Copses + farmsteads on the plain beyond the banlieue
  for (let attempt = 0; attempt < 90; attempt++) {
    const cx = 4 + rng.int(w - 8);
    const cy = 6 + rng.int(h - 12);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy)) continue;
    forestBlob(cx, cy, 1 + rng.int(2));
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const cx = 6 + rng.int(w - 12);
    const cy = 8 + rng.int(h - 16);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy)) continue;
    zoneBlob(cx, cy, 0.9, ZONE.rural);
  }

  // 9) Councils: nearest-seed Voronoi over the land
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (terrain[idx(x, y)] === TERRAIN.water) continue;
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

  // 10) The vector transport network -----------------------------------------
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
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) if (inhabited(xi + dx, yi + dy)) return true;
    return false;
  };
  const latticeThroughTowns = (pts: Array<[number, number]>): Array<[number, number]> => {
    const chords: Array<[number, number]> = [];
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s] ?? [0, 0];
      const [bx, by] = pts[s + 1] ?? [0, 0];
      const pieces = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let k = 0; k < pieces; k++)
        chords.push([ax + ((bx - ax) * k) / pieces, ay + ((by - ay) * k) / pieces]);
    }
    const last = pts[pts.length - 1];
    if (last) chords.push([last[0], last[1]]);
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
  const addRoad = (kind: 'arterial' | 'lane', pts: Array<[number, number]>): void => {
    if (kind === 'arterial') addRoute('arterial', pts);
    else addRoute('lane', latticeThroughTowns(pts));
  };

  // the Périphérique: the ring around the twenty arrondissements
  {
    const rx = 50;
    const ry = 44;
    const ring: Array<[number, number]> = [];
    const steps = 48;
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      ring.push([CENTRE.x + Math.cos(a) * rx, CENTRE.y - 4 + Math.sin(a) * ry]);
    }
    addRoute('motorway', ring);
  }
  // the A86 super-périphérique further out (the second ring)
  {
    const ring: Array<[number, number]> = [];
    const steps = 56;
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      ring.push([CENTRE.x + Math.cos(a) * 80, CENTRE.y - 4 + Math.sin(a) * 70]);
    }
    addRoute('motorway', ring);
  }
  // the autoroutes spearing out: A1 north, A4 east, A6 south, A13 west
  addRoute('motorway', [[100, 46], [98, 30], [96, 14], [96, 0]]); // A1 → Lille
  addRoute('motorway', [[126, 100], [148, 108], [170, 116], [196, 122], [207, 126]]); // A4 → Marne
  addRoute('motorway', [[104, 134], [102, 150], [100, 164], [100, 175]]); // A6 → south
  addRoute('motorway', [[80, 100], [60, 116], [42, 128], [24, 138]]); // A13 → Versailles/Normandy
  addRoute('motorway', [[58, 56], [44, 48], [28, 40], [10, 34]]); // A14 → west

  // the avenues + boulevards as arterials
  for (const a of AVENUES) addRoad('arterial', a);
  for (const b of BOULEVARDS) addRoad('arterial', b);

  // the BRIDGES — Paris is stitched across the Seine by dozens of them,
  // crowding together through the central island reach (the Pont Neuf
  // straddles the tip of the Île de la Cité). Each is a short carriageway
  // from one bank, over the river (and any island), to the other bank.
  const bridge = (bx: number, kind: 'street' | 'arterial' = 'street'): void => {
    const cy = seineCenterY(bx);
    const hw = seineHalfWidth(bx);
    addRoute(kind, [
      [bx, Math.round(cy - hw - 2)],
      [bx, Math.round(cy + hw + 2)],
    ]);
  };
  for (const bx of [
    28, 40, 50, 60, 68, 76, 82, 86, 90, 94, 98, 103, 107, 111, 115, 120, 126, 134, 144, 156, 170, 186,
  ]) {
    bridge(bx, bx === 90 || bx === 103 ? 'arterial' : 'street');
  }
  // a handful of local lanes threading the banlieue to the ring
  addRoad('lane', [[96, 44], [98, 52], [100, 60]]); // Saint-Denis in
  addRoad('lane', [[60, 108], [66, 100], [72, 94]]); // Boulogne in
  addRoad('lane', [[150, 90], [142, 92], [134, 94]]); // Montreuil in

  // the railways: the great termini fan out
  addRoute('rail', [[114, 80], [112, 60], [110, 40], [108, 20], [108, 0]]); // Gare du Nord → north
  addRoute('rail', [[118, 96], [134, 104], [152, 112], [172, 120], [196, 126]]); // Gare de Lyon → SE
  addRoute('rail', [[100, 104], [96, 120], [92, 138], [88, 156]]); // Montparnasse → SW
  addRoute('rail', [[92, 82], [78, 74], [62, 66], [44, 60]]); // Saint-Lazare → La Défense

  // 11) Landmarks. The geometry wave places NEUTRAL civic fabric (churches,
  // the city hall, the great termini) at their true positions; the bespoke
  // heroes (Eiffel, the Arc, Sacré-Cœur as their own sprites) arrive in the
  // following wave. The places are already NAMED via PARIS_NAMED_PLACES.
  const placeLandmark = (x: number, y: number, id: Landmark): void => {
    const xi = Math.round(x);
    const yi = Math.round(y);
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
          for (let ny = -1; ny <= 1; ny++)
            for (let nx = -1; nx <= 1; nx++) {
              if (!inb(tx + nx, ty + ny)) continue;
              const j = idx(tx + nx, ty + ny);
              if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
            }
          return;
        }
      }
    }
  };
  placeLandmark(85, 93, LANDMARK.eiffel); // the Eiffel Tower, on the Champ-de-Mars
  placeLandmark(76, 70, LANDMARK.arc); // the Arc de Triomphe at the Étoile
  placeLandmark(104, 90, LANDMARK.notreDame); // Notre-Dame, on the Île de la Cité
  placeLandmark(98, 64, LANDMARK.sacreCoeur); // Sacré-Cœur, on the Montmartre butte
  placeLandmark(108, 89, LANDMARK.townhall); // Hôtel de Ville
  placeLandmark(114, 79, LANDMARK.station); // Gare du Nord
  placeLandmark(118, 96, LANDMARK.station); // Gare de Lyon
  placeLandmark(100, 103, LANDMARK.station); // Montparnasse
  placeLandmark(92, 82, LANDMARK.station); // Saint-Lazare

  // 12) Customers, vegetation, sprite variants
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const z = zone[i] as Zone;
      const lm = landmark[i] as Landmark;
      if (lm !== LANDMARK.none) customers[i] = lm === LANDMARK.station ? 8 : 0;
      else if ((road[i] ?? 0) >= RC.arterial) customers[i] = 0;
      else customers[i] = CUSTOMERS_PER_TILE[z];
      const t = terrain[i];
      if (t === TERRAIN.trees) vegetation[i] = 200 + rng.int(56);
      else if (z === ZONE.rural || z === ZONE.none)
        vegetation[i] = t === TERRAIN.land ? 90 + rng.int(70) : 30;
      else if (z === ZONE.suburb || z === ZONE.posh || z === ZONE.park) vegetation[i] = 60 + rng.int(60);
      else vegetation[i] = 10 + rng.int(30);
      variant[i] = rng.int(256);
    }
  }

  return {
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
  };
}
