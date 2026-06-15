// Hero design-gate harness: drop one hero landmark into a field of ordinary
// city fabric and render a close crop, so we can judge HONESTLY whether the
// hero TOWERS over and stands WIDE among its neighbours (owner, 2026-06-14).
// preview only — not committed art.
//
//   npx tsx tools/heroScene.ts notredame paris 2 [--cbd]
//   → preview/hero-<name>.png
//
// fabric: london|paris · N: footprint tiles (the hero's square) · --cbd puts
// it among towers instead of low fabric.

import { mkdirSync } from 'node:fs';
import { applyCityFabric, type CityFabric } from '../src/render/sprites/buildingSprites';
import { buildAtlas } from '../src/render/sprites/atlas';
import { fillDerivedLayers } from '../src/data/cityData';
import { LANDMARK, NO_COUNCIL, TERRAIN, ZONE, type CityMap, type Landmark } from '../src/sim/map/types';
import { renderCityCrop } from './preview';

const NAMES: Record<string, Landmark> = {
  notredame: LANDMARK.notredame,
  grand: LANDMARK.grand,
  skyscraper: LANDMARK.skyscraper,
  eiffel: LANDMARK.eiffel,
  louvre: LANDMARK.louvre,
  arch: LANDMARK.arch,
  basilica: LANDMARK.basilica,
  dome: LANDMARK.dome,
  church: LANDMARK.church,
  townhall: LANDMARK.townhall,
  civic: LANDMARK.civic,
  // the Pyramids of Giza, split into free-standing heroes (owner, 2026-06-15)
  pyramid: LANDMARK.pyramidGreat, // bare "pyramid" → the Great Pyramid
  pyramidgreat: LANDMARK.pyramidGreat,
  pyramidkhafre: LANDMARK.pyramidKhafre,
  pyramidmenkaure: LANDMARK.pyramidMenkaure,
  sphinx: LANDMARK.sphinx,
};

function main(): void {
  const key = process.argv[2] ?? 'notredame';
  const fabric = (process.argv[3] ?? 'paris') as CityFabric;
  const N = Number(process.argv[4] ?? 2);
  const cbd = process.argv.includes('--cbd');
  const lm = NAMES[key];
  if (lm === undefined) {
    console.error(`unknown hero "${key}". known: ${Object.keys(NAMES).join(', ')}`);
    process.exit(1);
    return;
  }
  mkdirSync('preview', { recursive: true });

  const W = 26;
  const H = 26;
  const n = W * H;
  const idx = (x: number, y: number): number => y * W + x;
  const terrain = new Uint8Array(n).fill(TERRAIN.land);
  const zone = new Uint8Array(n).fill(cbd ? ZONE.cbd : fabric === 'paris' ? ZONE.urban : ZONE.urbanCore);
  const landmark = new Uint8Array(n);
  const flags = new Uint8Array(n);
  const variant = new Uint8Array(n);
  for (let i = 0; i < n; i++) variant[i] = i % 251;

  // a couple of streets so the fabric reads as blocks, not a solid mass
  const road = new Uint8Array(n);

  // place the hero as an N×N block in the centre, cleared to park under it
  const ax = Math.floor((W - N) / 2);
  const ay = Math.floor((H - N) / 2);
  for (let dx = 0; dx < N; dx++)
    for (let dy = 0; dy < N; dy++) {
      const j = idx(ax + dx, ay + dy);
      landmark[j] = lm;
      zone[j] = ZONE.park;
    }

  const map: CityMap = {
    width: W, height: H, terrain, zone,
    council: new Uint8Array(n).fill(NO_COUNCIL), road, routes: [],
    customers: new Uint16Array(n), vegetation: new Uint8Array(n), variant,
    landmark, flags, councils: [], fabric,
  };
  fillDerivedLayers(map);
  applyCityFabric(fabric);
  const atlas = buildAtlas();
  // a tight crop centred on the hero, at close zoom (smaller scale = bigger)
  const pad = Number((process.argv.find((s) => s.startsWith('--pad=')) ?? '--pad=5').slice(6));
  const sc = Number((process.argv.find((s) => s.startsWith('--sc=')) ?? '--sc=2').slice(5));
  renderCityCrop(atlas, map, ax - pad, ay - pad, ax + N + pad - 1, ay + N + pad - 1, sc, `hero-${key}`);
}

main();
