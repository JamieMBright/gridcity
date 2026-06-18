// Generate src/data/heroFacts.ts — a compact, bundled facts table for the
// bespoke heroes, so inspecting a landmark in-game can surface a line of stats
// and a bit of history (owner, 2026-06-18: "if i inspect The Glasshouse … it
// should show me some stats about it … inspecting the heroes could give a bit
// of a history").
//
// Source of truth: the per-city research already committed under
// docs/heroes/<city>/{index.json, <slug>.md}. We link each research entry to a
// PLACED hero by running its label through resolveBespokeKey (the same matcher
// the renderer uses to place the sprite), so the table is keyed by the exact
// `${city}:${heroKey}` the runtime has on map.heroTable — no fuzzy name match
// at runtime. Entries with no bespoke hero are skipped.
//
//   npx tsx tools/buildHeroFacts.ts          (writes the file)
//   npx tsx tools/buildHeroFacts.ts --dry    (report only)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolveBespokeKey } from '../src/render/sprites/heroes/registry';
import { cityDataFor, loadScenarioData } from '../src/data/scenarioData';
import type { CityFabric } from '../src/sim/map/types';

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Two place names refer to the same building if, normalised, one contains the
 *  other (e.g. placed "BALTIC Centre" ⊂ research "Baltic Centre for Contemporary
 *  Art"). Pure token overlap is NOT enough — "St Nicholas Cathedral" must not
 *  bind to "St Nicholas Hospital" (same loose regex, different building). */
function sameBuilding(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

const DOCS = new URL('../docs/heroes/', import.meta.url).pathname;
const OUT = new URL('../src/data/heroFacts.ts', import.meta.url).pathname;

interface IndexEntry {
  label: string;
  slug: string;
  type?: string;
  style?: string;
  architect?: string;
  year?: number | string;
}
interface HeroFact {
  name: string;
  type?: string;
  style?: string;
  architect?: string;
  year?: number;
  blurb?: string;
}

/** Shorten a comma/semicolon list to its first, tidiest item. */
function firstClause(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const first = s.split(/[,;]/)[0]?.trim();
  return first || undefined;
}

/** Pull a "bit of history" from the .md: the longest paragraph inside the
 *  `## Description` section, trimmed to its first ~2 sentences (≤ 240 chars). */
function blurbFrom(md: string): string | undefined {
  const m = md.match(/##\s*Description\s*\n([\s\S]*?)(?:\n##\s|\n*$)/);
  if (!m) return undefined;
  const paras = m[1]!
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0 && !p.startsWith('Wikidata') && !p.startsWith('Reference'));
  if (paras.length === 0) return undefined;
  const longest = paras.reduce((a, b) => (b.length > a.length ? b : a));
  // first ~2 sentences, capped
  const sentences = longest.match(/[^.!?]+[.!?]+/g) ?? [longest];
  let out = '';
  for (const s of sentences) {
    if (out.length + s.length > 240 && out.length > 0) break;
    out += s;
    if (out.length >= 160) break;
  }
  out = (out || longest).trim();
  if (out.length > 260) out = out.slice(0, 257).trimEnd() + '…';
  return out || undefined;
}

const cities = readdirSync(DOCS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const facts: Record<string, HeroFact> = {};
let linked = 0;
let total = 0;
const perCity: Record<string, number> = {};

for (const city of cities) {
  const dir = `${DOCS}${city}/`;
  const indexPath = `${dir}index.json`;
  if (!existsSync(indexPath)) continue;
  const entries = JSON.parse(readFileSync(indexPath, 'utf8')) as IndexEntry[];

  // The PLACED heroes for this city: registry key → the name ACTUALLY placed on
  // the map (the first map.named that resolves to that key). We only build facts
  // for heroes a player can inspect, and bind research by that placed name.
  let placed: Map<string, string>;
  try {
    await loadScenarioData(city);
    const d = cityDataFor(city);
    const fabric = (d.fabric ?? city) as CityFabric;
    placed = new Map();
    for (const p of d.named ?? []) {
      const k = resolveBespokeKey(fabric, p.name);
      if (k && !placed.has(k)) placed.set(k, p.name);
    }
  } catch {
    continue; // not a real scenario id — skip
  }
  total += placed.size;

  // group research entries by the key their label resolves to (a loose regex
  // can map several labels to one key — we pick the right one per placed name)
  const byKey = new Map<string, IndexEntry[]>();
  for (const e of entries) {
    const k = resolveBespokeKey(city as CityFabric, e.label);
    if (!k) continue;
    const arr = byKey.get(k);
    if (arr) arr.push(e);
    else byKey.set(k, [e]);
  }

  for (const [key, placedName] of placed) {
    const cands = (byKey.get(key) ?? []).filter((e) => sameBuilding(placedName, e.label));
    if (cands.length === 0) continue; // no trustworthy research → name-only card
    // prefer an exact normalised match, else the shortest (most specific) label
    cands.sort((a, b) => {
      const ea = norm(a.label) === norm(placedName) ? 0 : 1;
      const eb = norm(b.label) === norm(placedName) ? 0 : 1;
      return ea - eb || a.label.length - b.label.length;
    });
    const e = cands[0]!;
    const mdPath = `${dir}${e.slug}.md`;
    const blurb = existsSync(mdPath) ? blurbFrom(readFileSync(mdPath, 'utf8')) : undefined;
    const year = typeof e.year === 'string' ? parseInt(e.year, 10) : e.year;
    const fact: HeroFact = { name: e.label };
    const type = firstClause(e.type);
    const style = firstClause(e.style);
    const architect = firstClause(e.architect);
    if (type) fact.type = type;
    if (style) fact.style = style;
    if (architect) fact.architect = architect;
    if (typeof year === 'number' && Number.isFinite(year)) fact.year = year;
    if (blurb) fact.blurb = blurb;
    facts[`${city}:${key}`] = fact;
    linked++;
    perCity[city] = (perCity[city] ?? 0) + 1;
  }
}

console.log(`linked ${linked} bespoke heroes to research (of ${total} researched places)`);
console.log(
  Object.entries(perCity)
    .map(([c, n]) => `  ${c}: ${n}`)
    .join('\n'),
);

const header = `// GENERATED by tools/buildHeroFacts.ts — do not edit by hand.
// Facts + a one-line history for each bespoke hero, keyed by \`\${cityFabric}:\${heroKey}\`
// (the key on map.heroTable). Sourced from docs/heroes/<city>/{index.json,<slug>.md}.
// Re-run: npx tsx tools/buildHeroFacts.ts

export interface HeroFact {
  name: string;
  type?: string;
  style?: string;
  architect?: string;
  year?: number;
  blurb?: string;
}

export const HERO_FACTS: Record<string, HeroFact> = ${JSON.stringify(facts, null, 0)};

/** Facts for a placed hero, by its city fabric + registry key. */
export function heroFact(city: string, key: string): HeroFact | undefined {
  return HERO_FACTS[\`\${city}:\${key}\`];
}
`;

if (process.argv.includes('--dry')) {
  console.log(`(dry run — would write ${OUT}, ${header.length} chars)`);
} else {
  writeFileSync(OUT, header, 'utf8');
  console.log(`wrote ${OUT} (${(header.length / 1024).toFixed(0)} KB)`);
}
