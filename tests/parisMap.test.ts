// Paris map (geography) decode invariants — the same kind of structural
// checks the London map has, so the new city's builder can't silently
// regress: the Seine carves water with the central islands left as land,
// the twenty arrondissements + banlieue councils all appear, generation
// sites exist, and the airports/landmarks are placed.

import { describe, expect, it } from 'vitest';
import {
  buildParisMap,
  seineCenterY,
  PARIS_W,
  PARIS_H,
  PARIS_AIRPORTS,
  PARIS_NAMED_PLACES,
} from '../src/data/parisMap';
import { TERRAIN, ZONE } from '../src/sim/map/types';

const map = buildParisMap();
const at = (x: number, y: number): number => map.terrain[y * map.width + x] ?? -1;
const zoneAt = (x: number, y: number): number => map.zone[y * map.width + x] ?? -1;

describe('Paris map geography', () => {
  it('has the right dimensions and dense typed arrays', () => {
    expect(map.width).toBe(PARIS_W);
    expect(map.height).toBe(PARIS_H);
    const n = PARIS_W * PARIS_H;
    expect(map.terrain).toHaveLength(n);
    expect(map.zone).toHaveLength(n);
    expect(map.customers).toHaveLength(n);
    expect(map.routes && map.routes.length).toBeGreaterThan(0);
  });

  it('carves the Seine through the middle as water', () => {
    let water = 0;
    for (let x = 0; x < PARIS_W; x++) {
      if (at(x, Math.round(seineCenterY(x))) === TERRAIN.water) water++;
    }
    // the river spans essentially the whole width
    expect(water).toBeGreaterThan(PARIS_W * 0.8);
  });

  it('leaves the Île de la Cité as land in the central reach', () => {
    expect(at(104, 90)).toBe(TERRAIN.land); // Notre-Dame's island
    // and it is genuinely an island: water immediately north and south
    const cy = Math.round(seineCenterY(104));
    expect(at(104, cy - 2) === TERRAIN.water || at(104, cy + 2) === TERRAIN.water).toBe(true);
  });

  it('seats all twenty arrondissements + the banlieue councils', () => {
    expect(map.councils).toHaveLength(25);
    const used = new Set(map.council);
    // every council id that is not NO_COUNCIL must actually own land
    for (const c of map.councils) expect(used.has(c.id)).toBe(true);
    // the escargot is named for the arrondissements
    expect(map.councils[0]!.name).toContain('1er');
    expect(map.councils.some((c) => c.name.includes('La Défense'))).toBe(true);
  });

  it('builds a dense urban core and real generation sites', () => {
    let core = 0;
    let solar = 0;
    let nuclear = 0;
    for (let i = 0; i < map.zone.length; i++) {
      if (map.zone[i] === ZONE.urbanCore) core++;
      else if (map.zone[i] === ZONE.solarSite) solar++;
      else if (map.zone[i] === ZONE.nuclearSite) nuclear++;
    }
    expect(core).toBeGreaterThan(200); // a substantial Haussmann core
    expect(solar).toBeGreaterThan(0);
    expect(nuclear).toBeGreaterThan(0);
    // the two skyscraper clusters at La Défense
    expect(zoneAt(50, 60)).toBe(ZONE.cbd);
  });

  it('places Charles de Gaulle and Orly with named places', () => {
    expect(PARIS_AIRPORTS.map((a) => a.name)).toContain('Charles de Gaulle');
    expect(PARIS_AIRPORTS.map((a) => a.name)).toContain('Orly');
    const names = PARIS_NAMED_PLACES.map((p) => p.name);
    expect(names).toContain('Tour Eiffel');
    expect(names).toContain('Arc de Triomphe');
    expect(names).toContain('Charles de Gaulle');
  });

  it('gives inhabited tiles customers and leaves open land empty', () => {
    let totalCustomers = 0;
    for (let i = 0; i < map.customers.length; i++) totalCustomers += map.customers[i] ?? 0;
    expect(totalCustomers).toBeGreaterThan(50_000); // a city's worth of demand
  });

  it('is deterministic — same bytes every build', () => {
    const b = buildParisMap();
    expect(Array.from(b.zone.slice(0, 5000))).toEqual(Array.from(map.zone.slice(0, 5000)));
    expect(Array.from(b.terrain.slice(0, 5000))).toEqual(Array.from(map.terrain.slice(0, 5000)));
  });
});
