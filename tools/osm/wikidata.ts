// Wikidata fetch for hero-building research. Given a Q-id (from an OSM
// `wikidata=` tag), pull the facts we use to write a recreation spec:
// label, description, the Commons reference image, architectural style,
// architect, height, inception, type. Cached to disk like all OSM/Wiki calls.
//
// Data: Wikidata (CC0) + Wikimedia Commons (per-file licences) — credit in-app.

import { cachedFetchJson } from './net';

interface WdSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface WdEntity {
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, WdSnak[]>;
  sitelinks?: Record<string, { title: string }>;
}

export interface HeroFacts {
  qid: string;
  label: string;
  description: string;
  /** Commons image filename (P18), if any. */
  imageFile?: string;
  /** Q-ids for architectural style (P149) + architect (P84) — labels resolved separately. */
  styleQids: string[];
  architectQids: string[];
  /** Height in metres (P2048), if stated. */
  heightM?: number;
  /** Inception year (P571), if stated. */
  year?: number;
  /** instance-of Q-ids (P31) — church, bridge, station, museum… */
  typeQids: string[];
  /** enwiki article title (for the prose extract). */
  enTitle?: string;
}

function firstStr(snaks: WdSnak[] | undefined): string | undefined {
  const v = snaks?.[0]?.mainsnak?.datavalue?.value;
  return typeof v === 'string' ? v : undefined;
}
function ids(snaks: WdSnak[] | undefined): string[] {
  if (!snaks) return [];
  const out: string[] = [];
  for (const s of snaks) {
    const v = s.mainsnak?.datavalue?.value;
    if (v && typeof v === 'object' && 'id' in v) out.push(String((v as { id: string }).id));
  }
  return out;
}
function quantity(snaks: WdSnak[] | undefined): number | undefined {
  const v = snaks?.[0]?.mainsnak?.datavalue?.value;
  if (v && typeof v === 'object' && 'amount' in v) return Math.abs(Number((v as { amount: string }).amount));
  return undefined;
}
function year(snaks: WdSnak[] | undefined): number | undefined {
  const v = snaks?.[0]?.mainsnak?.datavalue?.value;
  if (v && typeof v === 'object' && 'time' in v) {
    const m = /([+-]\d+)-/.exec(String((v as { time: string }).time));
    if (m && m[1]) return Number(m[1]);
  }
  return undefined;
}

export async function fetchWikidata(qid: string): Promise<HeroFacts | undefined> {
  if (!/^Q\d+$/.test(qid)) return undefined;
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  let json: { entities?: Record<string, WdEntity> };
  try {
    json = await cachedFetchJson(url, { label: `wikidata ${qid}` });
  } catch {
    return undefined;
  }
  const e = json.entities?.[qid];
  if (!e) return undefined;
  const c = e.claims ?? {};
  return {
    qid,
    label: e.labels?.en?.value ?? e.labels?.fr?.value ?? qid,
    description: e.descriptions?.en?.value ?? e.descriptions?.fr?.value ?? '',
    ...(firstStr(c.P18) ? { imageFile: firstStr(c.P18) } : {}),
    styleQids: ids(c.P149),
    architectQids: ids(c.P84),
    ...(quantity(c.P2048) ? { heightM: quantity(c.P2048) } : {}),
    ...(year(c.P571) ? { year: year(c.P571) } : {}),
    typeQids: ids(c.P31),
    ...(e.sitelinks?.enwiki?.title ? { enTitle: e.sitelinks.enwiki.title } : {}),
  };
}

/** Resolve a batch of Q-ids to English labels (for style/architect/type). */
export async function resolveLabels(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Set(qids.filter((q) => /^Q\d+$/.test(q)))];
  for (let i = 0; i < uniq.length; i += 45) {
    const batch = uniq.slice(i, i + 45);
    const url =
      'https://www.wikidata.org/w/api.php?' +
      new URLSearchParams({ action: 'wbgetentities', ids: batch.join('|'), props: 'labels', languages: 'en', format: 'json' }).toString();
    try {
      const j = await cachedFetchJson<{ entities?: Record<string, WdEntity> }>(url, { label: `wd labels ${i}` });
      for (const [q, ent] of Object.entries(j.entities ?? {})) {
        const lbl = ent.labels?.en?.value;
        if (lbl) out.set(q, lbl);
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Commons image URL at a sensible width (the reference photo to learn from). */
export function commonsImageUrl(file: string, width = 800): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}
