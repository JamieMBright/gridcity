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
import * as landmarks from './sprites/landmarkSprites';
import * as network from './sprites/networkSprites';
import { buildAtlas, type SpriteAtlas } from './sprites/atlas';
import { HERO_NAMES, heroCanvasDims, heroFingerprint, type HeroRaster } from './heroRasters';

const DB = 'electricity-atlas';
const STORE = 'sheets';

/** Best-effort load of the outsourced hero rasters (public/heroes/<name>.png).
 *  Each is optional — a 404, a decode error or a wrong-sized PNG is skipped and
 *  that landmark keeps its code sprite. The atlas builder takes it from here. */
async function loadHeroRastersBrowser(): Promise<Map<string, HeroRaster>> {
  const out = new Map<string, HeroRaster>();
  if (typeof fetch === 'undefined' || typeof createImageBitmap === 'undefined') return out;
  await Promise.all(
    HERO_NAMES.map(async (name) => {
      const dims = heroCanvasDims(name);
      if (!dims) return;
      try {
        const res = await fetch(`heroes/${name}.png`, { cache: 'force-cache' });
        if (!res.ok) return;
        const bmp = await createImageBitmap(await res.blob());
        if (bmp.width !== dims.w || bmp.height !== dims.h) return;
        const cv = new OffscreenCanvas(dims.w, dims.h);
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(bmp, 0, 0);
        const data = ctx.getImageData(0, 0, dims.w, dims.h).data;
        out.set(name, { pixels: new Uint8ClampedArray(data.buffer.slice(0)), w: dims.w, h: dims.h });
      } catch {
        // optional asset — fall back to the code sprite
      }
    }),
  );
  return out;
}

function fingerprint(heroes?: Map<string, HeroRaster>): string {
  const sources: string[] = [JSON.stringify(COLORS)];
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
  // djb2 over the concatenated sources
  let h = 5381;
  const s = sources.join('\n');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  // fold in the loaded hero rasters so swapping outsourced art rebakes
  return `a${h.toString(36)}:${sources.length}:${heroFingerprint(heroes)}`;
}

interface StoredAtlas {
  key: string;
  width: number;
  height: number;
  frames: Array<[string, { x: number; y: number; w: number; h: number; ox: number; oy: number }]>;
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

async function readCache(db: IDBDatabase, key: string): Promise<SpriteAtlas | undefined> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get('atlas');
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

function writeCache(db: IDBDatabase, key: string, atlas: SpriteAtlas): void {
  try {
    const stored: StoredAtlas = {
      key,
      width: atlas.width,
      height: atlas.height,
      frames: [...atlas.frames.entries()],
      // copy into a tightly-sized buffer for structured clone
      pixels: atlas.pixels.slice().buffer,
    };
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(stored, 'atlas');
  } catch {
    // cache is best-effort
  }
}

/** The sprite atlas, from cache when the art code (and hero art) hasn't
 *  changed. Iconic heroes with a public/heroes/<name>.png override their code
 *  sprite; everything else stays code-drawn. */
export async function getAtlas(): Promise<SpriteAtlas> {
  const heroes = await loadHeroRastersBrowser();
  const db = await openDb();
  if (!db) return buildAtlas(heroes);
  const key = fingerprint(heroes);
  const cached = await readCache(db, key);
  if (cached) {
    db.close();
    return cached;
  }
  const atlas = buildAtlas(heroes);
  writeCache(db, key, atlas);
  db.close();
  return atlas;
}
