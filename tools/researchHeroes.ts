// RESEARCH the hero buildings of a city and STORE a per-building recreation
// spec (owner, 2026-06-14: "research each building, learn from Wikimedia images,
// get accurate descriptions as a prompt to recreate it, store the research for
// future renderings"). Heroes are CUSTOM per building — never reused.
//
//   npx tsx tools/researchHeroes.ts "Paris, France" paris [--span=6] [--max=100]
//   → docs/heroes/<id>/<slug>.md  (one spec per hero) + index.json
//
// Each spec gathers: Wikidata facts (type/style/architect/height/year), the
// Wikipedia prose description, the Commons reference photo URL, the real OSM
// footprint size, and a tailored INSTRUCTION block to recreate the building as
// a bespoke iso sprite. A later (or better) drawing pass reads these specs.
//
// Data © OpenStreetMap contributors (ODbL) · Wikidata (CC0) · Wikipedia
// (CC BY-SA) · Commons images (per-file licences).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geocode } from './osm/nominatim';
import { fetchAllBuildings, type BuildingFootprint } from './osm/overpass';
import { projectorFromCentre, type TileProjector } from './osm/project';
import { commonsImageUrl, fetchWikidata, resolveLabels, type HeroFacts } from './osm/wikidata';
import { fetchWikipediaSummary } from './osm/wikipedia';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag: string, d: number): number {
  const a = process.argv.find((s) => s.startsWith(`--${flag}=`));
  return a ? Number(a.slice(flag.length + 3)) : d;
}
function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function footExtentTiles(ring: [number, number][], proj: TileProjector): number {
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const [lo, la] of ring) {
    const [tx, ty] = proj.toTile(lo, la);
    if (tx < mnx) mnx = tx; if (tx > mxx) mxx = tx; if (ty < mny) mny = ty; if (ty > mxy) mxy = ty;
  }
  return Math.max(mxx - mnx, mxy - mny);
}

interface Hero {
  facts: HeroFacts;
  extentTiles: number;
  footTilesGuess: number;
  extract: string;
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const id = process.argv[3] ?? 'city';
  if (!query) {
    console.error('usage: npx tsx tools/researchHeroes.ts "<query>" <id> [--span=6] [--max=100]');
    process.exit(1);
    return;
  }
  const span = arg('span', 6);
  const max = arg('max', 100);
  const g = await geocode(query);
  const proj = projectorFromCentre(g.centre, span, 256, 160);
  console.log(`Researching heroes of ${g.displayName}…`);
  const buildings = await fetchAllBuildings(proj.bbox());

  // candidate heroes: wikidata-tagged buildings, biggest (most prominent) first
  const cands = buildings
    .filter((b): b is BuildingFootprint & { wikidata: string } => Boolean(b.wikidata && b.poly[0]))
    .map((b) => ({ b, ext: footExtentTiles(b.poly[0]!, proj) }))
    .sort((a, b) => b.ext - a.ext);
  // dedupe by wikidata id (a building can be several OSM parts)
  const seen = new Set<string>();
  const picked: typeof cands = [];
  for (const c of cands) {
    if (seen.has(c.b.wikidata)) continue;
    seen.add(c.b.wikidata);
    picked.push(c);
    if (picked.length >= max) break;
  }
  console.log(`  ${picked.length} wikidata-tagged hero candidates (of ${cands.length})`);

  const heroes: Hero[] = [];
  const allQids: string[] = [];
  for (const { b, ext } of picked) {
    const facts = await fetchWikidata(b.wikidata);
    if (!facts) continue;
    const extract = facts.enTitle ? await fetchWikipediaSummary(facts.enTitle) : '';
    allQids.push(...facts.styleQids, ...facts.architectQids, ...facts.typeQids);
    heroes.push({ facts, extentTiles: ext, footTilesGuess: Math.max(1, Math.min(5, Math.round(ext))), extract });
    process.stdout.write(`\r  fetched ${heroes.length}/${picked.length}…   `);
  }
  console.log();
  const labels = await resolveLabels(allQids);
  const lbl = (qids: string[]): string => qids.map((q) => labels.get(q) ?? q).filter(Boolean).join(', ');

  const outDir = join(HERE, '../docs/heroes', id);
  mkdirSync(outDir, { recursive: true });
  const index: Array<Record<string, unknown>> = [];
  for (const h of heroes) {
    const f = h.facts;
    const type = lbl(f.typeQids) || 'building';
    const style = lbl(f.styleQids);
    const architect = lbl(f.architectQids);
    const img = f.imageFile ? commonsImageUrl(f.imageFile, 1000) : '';
    const md = `# ${f.label}
*${type}${style ? ` · ${style}` : ''}${architect ? ` · ${architect}` : ''}${f.year ? ` · ${f.year}` : ''}${f.heightM ? ` · ${f.heightM} m` : ''}*

Wikidata: [${f.qid}](https://www.wikidata.org/wiki/${f.qid})${f.enTitle ? ` · Wikipedia: ${f.enTitle}` : ''}
${img ? `Reference photo: ${img}` : 'Reference photo: (none on Wikidata)'}

## Description
${f.description}${h.extract ? `\n\n${h.extract}` : ''}

## Recreation spec (instruction for the bespoke sprite)
Recreate **${f.label}** as a CUSTOM iso sprite in the game's ink-contour dusk
style — do not reuse another hero. Work from the reference photo above.
- **Type / style:** ${type}${style ? `, ${style}` : ''}.
- **Footprint:** ~${h.footTilesGuess}×${h.footTilesGuess} tiles (from its real OSM
  extent of ${h.extentTiles.toFixed(1)} tiles). Draw it WIDE within that square.
- **Height:** ${f.heightM ? `${f.heightM} m real` : 'see description'} — it must
  TOWER over the ordinary fabric; exaggerate vertically so it reads as a hero.
- **Massing & features:** derive from the description above (towers, domes,
  spires, arches, wings, roofline, materials, colour). Capture the silhouette
  that makes it recognisable.
- **Clearance:** only if the real building has open ground (plaza/park) — most
  abut their neighbours.

Critique the sprite against the reference photo; iterate until the silhouette
and palette read as the real building.
`;
    writeFileSync(join(outDir, `${slug(f.label)}.md`), md);
    index.push({
      qid: f.qid, label: f.label, slug: slug(f.label), type, style, architect,
      year: f.year, heightM: f.heightM, image: img, footTiles: h.footTilesGuess,
      extentTiles: Number(h.extentTiles.toFixed(2)),
    });
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`Stored ${index.length} hero specs in docs/heroes/${id}/`);
  console.log('Examples:', index.slice(0, 12).map((h) => h.label).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
