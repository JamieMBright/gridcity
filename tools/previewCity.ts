// Preview a generated OSM city (validates the serialize → buildCityFromData →
// render round-trip the game itself uses).
//
//   npx tsx tools/previewCity.ts <id> [x0 y0 x1 y1 scale name]
//   npx tsx tools/previewCity.ts paris                 → preview/paris-far.png (whole map)
//   npx tsx tools/previewCity.ts paris 96 56 160 104 4 paris-mid

import { mkdirSync } from 'node:fs';
import { buildAtlas } from '../src/render/sprites/atlas';
import { applyCityFabric } from '../src/render/sprites/buildingSprites';
import { buildCityFromData, type CityData } from '../src/data/cityData';
import type { CityMap } from '../src/sim/map/types';
import { renderCityCrop } from './preview';

async function loadCity(id: string): Promise<CityData> {
  const mod = (await import(`../src/data/cities/${id}.ts`)) as Record<string, unknown>;
  for (const v of Object.values(mod)) {
    if (v && typeof v === 'object' && 'terrain' in v && 'width' in v) return v as CityData;
  }
  throw new Error(`no CityData export found in src/data/cities/${id}.ts`);
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: npx tsx tools/previewCity.ts <id> [x0 y0 x1 y1 scale name]');
    process.exit(1);
    return;
  }
  mkdirSync('preview', { recursive: true });
  const data = await loadCity(id);
  const map: CityMap = buildCityFromData(data);
  console.log(`${data.name}: ${map.width}×${map.height}, ${map.councils.length} councils, fabric=${data.fabric ?? 'london'}`);

  applyCityFabric(data.fabric === 'paris' ? 'paris' : 'london');
  const atlas = buildAtlas();
  const rest = process.argv.slice(3).map(Number);
  if (rest.length >= 5) {
    const [x0, y0, x1, y1, scale] = rest as [number, number, number, number, number];
    const name = process.argv[8] ?? `${id}-crop`;
    renderCityCrop(atlas, map, x0, y0, x1, y1, scale, name);
  } else {
    // default: the whole map, far out
    renderCityCrop(atlas, map, 0, 0, map.width - 1, map.height - 1, 6, `${id}-far`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
