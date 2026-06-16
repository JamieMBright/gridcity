// Browser-side atlas cache: baking 150+ vector sprites at 2x costs ~2.5s
// of boot, every load. The pixels are a pure function of the sprite CODE,
// so we fingerprint that code (function sources + palette) and keep the
// baked sheet in IndexedDB — any art edit changes the fingerprint and
// rebakes. Falls back to a straight build wherever IndexedDB is missing.

import { COLORS } from './sprites/palette';
import { Iso } from './sprites/iso';
import { Raster } from './sprites/raster';
import * as world from './sprites/worldSprites';
import * as buildings from './sprites/buildingSprites';
import { activeFabric } from './sprites/buildingSprites';
import { bespokeHeroesFor } from './sprites/heroes/registry';
import * as landmarks from './sprites/landmarkSprites';
import * as network from './sprites/networkSprites';
import { buildAtlas, type AtlasFrame, type SpriteAtlas } from './sprites/atlas';

const DB = 'electricity-atlas';
const STORE = 'sheets';

function fingerprint(): string {
  // the active fabric joins the key: a city's brick/roof tokens (and FLAT_ROOF)
  // live in module `let`s, not COLORS, so two fabrics could otherwise share a
  // fingerprint and serve each other's sheet. London ('london') keeps its
  // historical key so its cached atlas is reused, not rebaked.
  const sources: string[] = [`fabric:${activeFabric()}`, JSON.stringify(COLORS)];
  for (const mod of [world, buildings, landmarks, network]) {
    for (const v of Object.values(mod)) {
      if (typeof v === 'function') sources.push(String(v));
    }
  }
  for (const proto of [Iso.prototype, Raster.prototype]) {
    for (const k of Object.getOwnPropertyNames(proto)) {
      const fn = (proto as unknown as Record<string, unknown>)[k];
      if (typeof fn === 'function') sources.push(String(fn));
    }
  }
  // the ACTIVE fabric's registered bespoke-hero keys (sorted, stable) bust the
  // cache when a city's hero set changes. GUARD: an EMPTY registry (London for
  // now) appends NOTHING, so London keeps its EXACT historical fingerprint and
  // its cached sheet is reused, not rebaked. (The heroes' draw fns live in
  // landmarkSprites, already hashed above, so the key list is enough.)
  const heroKeys = bespokeHeroesFor(activeFabric()).map((h) => h.key).sort();
  if (heroKeys.length > 0) sources.push(`heroes:${heroKeys.join(',')}`);
  // djb2 over the concatenated sources
  let h = 5381;
  const s = sources.join('\n');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `a${h.toString(36)}:${sources.length}`;
}

interface StoredAtlas {
  key: string;
  width: number;
  height: number;
  frames: Array<[string, AtlasFrame]>;
  pixels: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(undefined);
      return;
    }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function readCache(db: IDBDatabase, key: string, slot: string): Promise<SpriteAtlas | undefined> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(slot);
      req.onsuccess = () => {
        const v = req.result as StoredAtlas | undefined;
        if (!v || v.key !== key) {
          resolve(undefined);
          return;
        }
        resolve({
          width: v.width,
          height: v.height,
          pixels: new Uint8ClampedArray(v.pixels),
          frames: new Map(v.frames),
        });
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function writeCache(db: IDBDatabase, key: string, slot: string, atlas: SpriteAtlas): void {
  try {
    const stored: StoredAtlas = {
      key,
      width: atlas.width,
      height: atlas.height,
      frames: [...atlas.frames.entries()],
      // copy into a tightly-sized buffer for structured clone
      pixels: atlas.pixels.slice().buffer,
    };
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(stored, slot);
  } catch {
    // cache is best-effort
  }
}

/** Per-fabric IndexedDB slot so London and another city can BOTH stay cached
 *  (the old single 'atlas' slot thrashed on every city switch). London keeps
 *  the historical 'atlas' slot so its already-cached sheet is reused. */
function slotFor(): string {
  const f = activeFabric();
  return f === 'london' ? 'atlas' : `atlas:${f}`;
}

/** The sprite atlas, from cache when the art code hasn't changed. Baked in the
 *  CURRENTLY-APPLIED fabric (the caller runs applyCityFabric first). */
export async function getAtlas(): Promise<SpriteAtlas> {
  const db = await openDb();
  if (!db) return buildAtlas();
  const key = fingerprint();
  const slot = slotFor();
  const cached = await readCache(db, key, slot);
  if (cached) {
    db.close();
    return cached;
  }
  const atlas = buildAtlas();
  writeCache(db, key, slot, atlas);
  db.close();
  return atlas;
}
