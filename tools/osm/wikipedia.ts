// Wikipedia prose extract for hero-building research — the plain-language
// description we mine for the recreation spec (massing, materials, features).
// Cached to disk. Text: Wikipedia (CC BY-SA) — credit in-app.

import { cachedFetch } from './net';

export async function fetchWikipediaSummary(title: string): Promise<string> {
  if (!title) return '';
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const text = await cachedFetch(url, { label: `wiki ${title}` });
    const j = JSON.parse(text) as { extract?: string };
    return j.extract ?? '';
  } catch {
    return '';
  }
}
