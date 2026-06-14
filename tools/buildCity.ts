// CLI: turn any real city into a playable ElectriCity map, from OpenStreetMap.
//
//   npx tsx tools/buildCity.ts "<query>" <id> [name] [--span=24] [--write] [--lon=.. --lat=..]
//
// Examples:
//   npx tsx tools/buildCity.ts "Paris, France" paris "Paris & the Seine" --write
//   npx tsx tools/buildCity.ts "London, UK" london-osm --span=34   (validation only)
//
// Without --write it just fetches, builds and prints a stats report (and the
// raw OSM is cached to tools/osm/.cache, so re-runs are offline). With --write
// it emits src/data/cities/<id>.ts for the scenario registry to import.
//
// Map data © OpenStreetMap contributors (ODbL).

import { buildCityFromOsm } from './osm/buildCityFromOsm';
import { toCityData, writeCityModule } from './osm/emitCityData';
import { geocode } from './osm/nominatim';
import { fetchOsmFeatures } from './osm/overpass';
import { projectorFromCentre } from './osm/project';
import { TERRAIN, ZONE } from '../src/sim/map/types';

function arg(flag: string): string | undefined {
  const a = process.argv.find((s) => s.startsWith(`--${flag}=`));
  return a ? a.slice(flag.length + 3) : undefined;
}
function has(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const id = process.argv[3];
  if (!query || !id || id.startsWith('--')) {
    console.error('usage: npx tsx tools/buildCity.ts "<query>" <id> [name] [--span=24] [--write]');
    process.exit(1);
    return;
  }
  const nameArg = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : undefined;
  const span = Number(arg('span') ?? 24);
  const lon = arg('lon');
  const lat = arg('lat');

  let centre: { lon: number; lat: number };
  let displayName = query;
  if (lon !== undefined && lat !== undefined) {
    centre = { lon: Number(lon), lat: Number(lat) };
  } else {
    console.log(`Geocoding "${query}"…`);
    const g = await geocode(query);
    centre = g.centre;
    displayName = g.displayName;
    console.log(`  → ${displayName}  (${centre.lon.toFixed(4)}, ${centre.lat.toFixed(4)})`);
  }

  const proj = projectorFromCentre(centre, span, 256, 160);
  const bbox = proj.bbox();
  console.log(
    `Window: ${span} km EW · ${(proj.metresPerTile()).toFixed(0)} m/tile · ` +
      `bbox [${bbox.minLon.toFixed(3)}, ${bbox.minLat.toFixed(3)}] – [${bbox.maxLon.toFixed(3)}, ${bbox.maxLat.toFixed(3)}]`,
  );
  console.log('Fetching OSM (Overpass)… (cached after first run)');
  const features = await fetchOsmFeatures(bbox);
  console.log(
    `  water=${features.water.length} rivers=${features.rivers.length} roads=${features.roads.length} ` +
      `rail=${features.rail.length} landuse=${features.landuse.length} green=${features.green.length} ` +
      `buildings=${features.buildings.length} councils=${features.councils.length} pois=${features.pois.length}`,
  );

  const seed = hashSeed(id);
  const built = buildCityFromOsm(features, proj, seed, {
    visibleStreets: has('streets'),
    roadsOnly: has('roads-only'),
  });
  report(built);

  if (has('write')) {
    const fabricArg = arg('fabric') === 'paris' ? 'paris' : 'london';
    const data = toCityData(built, {
      id,
      name: nameArg ?? displayName.split(',')[0] ?? id,
      tagline: `${(nameArg ?? displayName.split(',')[0] ?? id).trim()} — drawn from its real geography.`,
      fabric: fabricArg,
    });
    const file = writeCityModule(data);
    const kb = Math.round((data.terrain.length + data.zone.length + data.council.length + data.road.length + data.landmark.length + data.flags.length) / 1024);
    console.log(`\nWrote ${file}  (~${kb} KB rasters, ${data.routes.length} routes, ${data.councils.length} councils, ${data.named.length} places)`);
  } else {
    console.log('\n(dry run — pass --write to emit src/data/cities/' + id + '.ts)');
  }
}

function report(built: ReturnType<typeof buildCityFromOsm>): void {
  const m = built.map;
  const n = m.width * m.height;
  let water = 0;
  let trees = 0;
  const zh: Record<number, number> = {};
  for (let i = 0; i < n; i++) {
    if (m.terrain[i] === TERRAIN.water) water++;
    else if (m.terrain[i] === TERRAIN.trees) trees++;
    const z = m.zone[i] ?? 0;
    zh[z] = (zh[z] ?? 0) + 1;
  }
  const pct = (v: number): string => `${((100 * v) / n).toFixed(1)}%`;
  const zname = (z: number): string =>
    Object.entries(ZONE).find(([, v]) => v === z)?.[0] ?? String(z);
  console.log(`\nMap ${m.width}×${m.height}:`);
  console.log(`  water ${pct(water)}  trees ${pct(trees)}  routes ${m.routes?.length ?? 0}`);
  const top = Object.entries(zh)
    .filter(([z]) => Number(z) !== ZONE.none)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([z, c]) => `${zname(Number(z))} ${pct(c)}`)
    .join('  ');
  console.log(`  zones: ${top}`);
  console.log(`  councils ${m.councils.length}  named places ${built.named.length}  ` +
    `heroes ${built.named.filter((p) => p.landmark).length}`);
  const heroes = built.named.filter((p) => p.landmark).slice(0, 12).map((p) => p.name);
  if (heroes.length) console.log(`  e.g. ${heroes.join(', ')}`);
}

function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
