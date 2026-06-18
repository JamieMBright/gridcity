// Curate the NORTH-EAST town labels BY IMPORTANCE (owner, 2026-06-18): "it has
// names of really small areas but skips bigger ones — no North/South Shields
// but has Cramlington. Is there a way to get towns by most important?"
//
// PRINCIPLED, not ad-hoc: every place carries an `importance` = approximate
// real settlement population (the natural "most important" metric for a town
// label). The list below is the ranked master table; the emitter sorts by
// importance, derives the label `r` (radius — which drives the renderer's label
// SIZE and the overlap-declutter PRIORITY) and the `kind` (town vs village)
// from that population in a single monotonic mapping, and selects the TOP-N so
// the important places always win the far-zoom declutter and the tiny obscure
// ones (parish-sized council areas like "Seaton with Slingley") never appear.
//
// Positions are tile coordinates on the 256×160 NE grid, anchored on the
// committed landmark/bridge places so each town lands in its true relative
// position (Tyne W→E spine; Newcastle N bank, Gateshead immediately S; the Tyne
// mouth at Tynemouth(N)/South Shields(S); the coast down the EAST — Whitley Bay,
// Tynemouth, South Shields, Marsden N→S; the Wear → Sunderland SE;
// Ponteland/Airport NW; Washington/Houghton S; Consett/Durham SW/S).
// Recognisable-not-literal.
//
//   npx tsx tools/northeastTowns.ts          (writes the towns: field)
//   npx tsx tools/northeastTowns.ts --dry     (print the emitted array only)

import { readFileSync, writeFileSync } from 'node:fs';
import type { MapTown } from '../src/sim/map/types';

const FILE = new URL('../src/data/cities/northeast.ts', import.meta.url).pathname;

/** A ranked NE settlement. `pop` is approximate real locality population — the
 *  single importance signal that drives ordering, label size and town/village. */
interface RankedTown {
  name: string;
  x: number;
  y: number;
  pop: number;
}

// The master table, North-East England's principal settlements. Populations are
// rounded real locality/urban-sub-division figures (ONS-order of magnitude);
// they exist only to RANK + size the labels, so approximate is fine.
const TOWNS: RankedTown[] = [
  // — the conurbation core —
  { name: 'Newcastle upon Tyne', x: 159, y: 62, pop: 300000 }, // regional capital, N bank
  { name: 'Sunderland', x: 228, y: 103, pop: 170000 }, // the Wear, SE coast
  { name: 'Gateshead', x: 167, y: 80, pop: 120000 }, // immediately S of the Tyne
  { name: 'South Shields', x: 218, y: 54, pop: 75000 }, // S of the Tyne mouth
  { name: 'Washington', x: 192, y: 107, pop: 67000 }, // new town, S, on the Wear
  { name: 'Durham', x: 167, y: 151, pop: 48000 }, // cathedral city, S
  { name: 'Wallsend', x: 186, y: 60, pop: 43000 }, // Tyne N bank (Segedunum)
  { name: 'Jarrow', x: 202, y: 58, pop: 43000 }, // Tyne S bank
  { name: 'North Shields', x: 214, y: 49, pop: 40000 }, // N of the Tyne mouth
  { name: 'Cramlington', x: 165, y: 36, pop: 39000 }, // new town, N
  { name: 'Whitley Bay', x: 211, y: 26, pop: 37000 }, // NE coast
  { name: 'Houghton-le-Spring', x: 205, y: 117, pop: 36000 }, // S
  { name: 'Consett', x: 104, y: 109, pop: 27000 }, // SW (Derwent valley)
  { name: 'Chester-le-Street', x: 178, y: 124, pop: 24000 }, // S, on the Wear
  { name: 'Gosforth', x: 158, y: 50, pop: 24000 }, // N suburb of Newcastle
  { name: 'Seaham', x: 243, y: 134, pop: 22000 }, // SE coast (Durham coast)
  { name: 'Hebburn', x: 193, y: 64, pop: 19000 }, // Tyne S bank
  { name: 'Whickham', x: 152, y: 81, pop: 17000 }, // SW of Gateshead
  { name: 'Tynemouth', x: 221, y: 45, pop: 17000 }, // iconic priory at the mouth
  { name: 'Blaydon', x: 142, y: 76, pop: 14000 }, // Tyne, W (Derwent confluence)
  { name: 'Prudhoe', x: 86, y: 73, pop: 12000 }, // Tyne, further W
  { name: 'Hexham', x: 12, y: 67, pop: 12000 }, // market town, far W (Tyne valley)
  { name: 'Ponteland', x: 132, y: 41, pop: 11000 }, // NW (by the airport)
  // — smaller places that still anchor the geography (villages) —
  { name: 'Corbridge', x: 32, y: 65, pop: 3000 }, // Tyne-valley village, W
  { name: 'Marsden', x: 232, y: 60, pop: 2000 }, // the SE coast (Marsden Rock), N→S coast
];

// keep the most important; this many is plenty to label the region without
// clutter (the renderer's declutter hides any that still overlap at far zoom).
const TOP_N = 25;

/** Population → label radius `r`. Monotonic + smooth: a regional capital reads
 *  biggest, a village smallest. (≈ a log-ish ramp, hand-tuned to the prior map's
 *  Newcastle=5 / Sunderland=4.5 / Gateshead=4 anchors.) */
function radiusFor(pop: number): number {
  if (pop >= 250000) return 5;
  if (pop >= 150000) return 4.5;
  if (pop >= 100000) return 4;
  if (pop >= 60000) return 3.5;
  if (pop >= 40000) return 3.2;
  if (pop >= 30000) return 3;
  if (pop >= 20000) return 2.7;
  if (pop >= 13000) return 2.5;
  if (pop >= 8000) return 2.3;
  return 2; // villages
}
/** A place under ~8k reads as a village (fades one zoom band before towns). */
const kindFor = (pop: number): MapTown['kind'] => (pop >= 8000 ? 'town' : 'village');

const emitted: MapTown[] = TOWNS.slice()
  .sort((a, b) => b.pop - a.pop)
  .slice(0, TOP_N)
  .map((t) => ({ x: t.x, y: t.y, r: radiusFor(t.pop), kind: kindFor(t.pop), name: t.name }));

const json = `[${emitted.map((t) => JSON.stringify(t)).join(',')}]`;

console.log(`NE towns (ranked by importance, top ${TOP_N} of ${TOWNS.length}):`);
for (const t of emitted) console.log(`  r${t.r} ${t.kind.padEnd(7)} (${t.x},${t.y}) ${t.name}`);

if (process.argv.includes('--dry')) {
  console.log('\n(dry run — no file written)');
} else {
  const text = readFileSync(FILE, 'utf8');
  const re = /(\n {2}towns:\s*)\[[\s\S]*?\](,\n)/;
  if (!re.test(text)) throw new Error('could not find the towns: [...] field in northeast.ts');
  writeFileSync(FILE, text.replace(re, `$1${json}$2`), 'utf8');
  console.log(`\nwrote ${FILE} — ${emitted.length} towns`);
}
