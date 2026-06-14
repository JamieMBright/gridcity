// Cached HTTP for the OSM pipeline. Every response is written to a disk
// cache keyed by a hash of the request, so re-runs are offline and we stay
// polite to the public OSM/Wikidata endpoints (which require a descriptive
// User-Agent and rate-limit aggressively). Network is only touched on a
// cache miss.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, '.cache');

/** Identifies this project to the OSM/Wikidata operators (required etiquette). */
export const USER_AGENT =
  'ElectriCity-game/1.0 (map authoring tool; https://github.com/JamieMBright/gridcity)';

function cachePath(key: string, ext: string): string {
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 16);
  return join(CACHE_DIR, `${hash}.${ext}`);
}

export interface FetchOpts {
  /** POST body (Overpass uses form-encoded `data=`); GET when omitted. */
  body?: string;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Cache file extension (json|xml|txt). Default json. */
  ext?: string;
  /** Distinguishes the cache entry when the same URL takes different bodies. */
  cacheKey?: string;
  /** Skip the disk cache (force a network round-trip). */
  noCache?: boolean;
  label?: string;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch text with disk caching and retry/backoff. Returns the response body.
 */
export async function cachedFetch(url: string, opts: FetchOpts = {}): Promise<string> {
  const ext = opts.ext ?? 'json';
  const key = `${url}\n${opts.cacheKey ?? opts.body ?? ''}`;
  const file = cachePath(key, ext);
  if (!opts.noCache && existsSync(file)) {
    return readFileSync(file, 'utf8');
  }
  mkdirSync(CACHE_DIR, { recursive: true });

  const label = opts.label ?? url.slice(0, 80);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const wait = 2000 * 2 ** (attempt - 1);
      console.log(`  retry ${attempt} for ${label} in ${wait}ms…`);
      await sleep(wait);
    }
    try {
      const res = await fetch(url, {
        method: opts.body === undefined ? 'GET' : 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en',
          ...(opts.body === undefined
            ? {}
            : { 'Content-Type': 'application/x-www-form-urlencoded' }),
          ...opts.headers,
        },
        ...(opts.body === undefined ? {} : { body: opts.body }),
      });
      if (res.status === 429 || res.status === 504 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${label}`);
        continue; // transient → back off and retry
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from ${label}`);
      const text = await res.text();
      writeFileSync(file, text);
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`fetch failed after retries: ${label}: ${String(lastErr)}`);
}

export async function cachedFetchJson<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  return JSON.parse(await cachedFetch(url, opts)) as T;
}
