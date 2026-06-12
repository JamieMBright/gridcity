// PixiJS isometric map renderer. The world draws in three passes — flat
// ground tiles, then the vector transport ribbons (20 mph streets up to
// the orbital motorway, plus rail), then the standing structures — so
// curved roads flow beneath the buildings exactly like the city grew
// around them. Dynamic layers stack above: live traffic (cars, trains,
// river barges), coverage shading, the suitability overlay, network
// lines sagging from pylon to pylon, the player's assets, site bubbles
// (applications, tenders, angry unconnected customers) and build ghosts.
// A ticker animates the living world; grid view desaturates the city so
// the electrical network pops in full colour.
//
// World space: tile (x, y) has its floor-diamond centre at
// ((x − y) · CELL_W/2, (x + y) · FLOOR_H/2).

import {
  Application,
  ColorMatrixFilter,
  Container,
  Graphics,
  Matrix,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import { riverCenterY, riverHalfWidth } from '../data/londonMap';
import { assetLevels, type PlacedAsset } from '../sim/assets';
import { GENS, SUBS } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import { sampleRoute } from '../sim/map/routes';
import { CUSTOMERS_PER_TILE, type CityMap, type RouteClass, type Zone } from '../sim/map/types';
import { COV, type BranchView } from '../sim/tick';
import { getAtlas } from './atlasCache';
import { NAMED_PLACES, TOWNS } from '../data/londonMap';
import { CELL_H, CELL_W, FLOOR_H, RES } from './sprites/iso';
import { WIND_HUBS, windHubOffset } from './sprites/networkSprites';
import { groundSpriteFor, structureSpriteFor } from './tileChooser';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;
const MIN_ZOOM = 0.05 / RES;
const MAX_ZOOM = 3.2 / RES;
const CLICK_SLOP_PX = 6;

export const LEVEL_COLOR: Record<VoltageLevel, number> = {
  400: 0x5ea3ff,
  132: 0x7bc47f,
  33: 0xffb066,
};
const OVERLOAD_COLOR = 0xe0697a;
const LEVEL_WIDTH: Record<VoltageLevel, number> = {
  400: 7 * RES,
  132: 5 * RES,
  33: 2.6 * RES,
};
const ATTACH_Z: Record<VoltageLevel, number> = { 400: 80 * RES, 132: 54 * RES, 33: 30 * RES };
const END_Z = 18 * RES;
const PYLON_SPRITE: Record<VoltageLevel, string> = {
  400: 'pylon_400',
  132: 'pylon_132',
  33: 'pole_33',
};

const GEN_SPRITE: Record<string, string> = {
  gasCCGT: 'gen_gas',
  gasPeaker: 'gen_peaker',
  coal: 'gen_coal',
  nuclear: 'gen_nuclear',
  solarFarm: 'gen_solar',
  windOnshore: 'gen_windon',
  windOffshore: 'gen_windoff',
  tidal: 'gen_tidal',
  biomass: 'gen_biomass',
  battery: 'gen_battery',
};
const SUB_SPRITE: Record<string, string> = {
  bulk: 'sub_bulk',
  grid: 'sub_grid',
  dist: 'sub_dist',
  pole: 'sub_pole',
  vault: 'sub_vault',
};

// ribbon styling per route class, in world px. Speeds are deliberately
// well below "light speed": a tile is ~a km, so even these cheat fast,
// but they READ as traffic rather than tracer rounds.
const ROUTE_STYLE: Record<
  RouteClass,
  { width: number; color: number; speed: number; perTile: number }
> = {
  motorway: { width: 13 * RES, color: 0x474556, speed: 1.7, perTile: 7 },
  arterial: { width: 8.5 * RES, color: 0x55525f, speed: 0.9, perTile: 12 },
  street: { width: 5 * RES, color: 0x5f5c66, speed: 0.4, perTile: 45 },
  lane: { width: 4 * RES, color: 0x6e6757, speed: 0.5, perTile: 30 },
  rail: { width: 6.5 * RES, color: 0x3f3c49, speed: 1.6, perTile: 0 },
};
const CAR_COLORS = [0xf4f1ea, 0x27324d, 0xc9453a, 0x5e8fc2, 0xe8a23f, 0x9aa4b5, 0x3f8f8a];
const FLOWERS = [0xd6566e, 0xf4f1ea, 0xffd277, 0x7a6fae];

export interface VanView {
  id: number;
  x: number;
  y: number;
  busy: boolean;
}

export interface JobView {
  x: number;
  y: number;
  /** What broke (fault label) — shown on the spanner pin. */
  label: string;
  /** The asset that owns the failed branch — click-through target. */
  assetId: number;
  staffed: boolean;
}

export interface SiteView {
  x: number;
  y: number;
  icon: 'application' | 'tender' | 'overdue' | 'building';
  label: string;
}

export interface GrowthPatch {
  i: number;
  zone: number;
  customers: number;
}

export interface TileHover {
  x: number;
  y: number;
  /** Unrounded tile coords of the pointer — for picking things that run
   *  BETWEEN tiles, like line spans. */
  fx?: number | undefined;
  fy?: number | undefined;
}

/** Map highlight for the pinned inspector card. */
export type Selection =
  | { kind: 'tile'; x: number; y: number }
  | { kind: 'line'; ax: number; ay: number; bx: number; by: number };

export type Ghost =
  | {
      kind: 'tile';
      x: number;
      y: number;
      ok: boolean;
      sprite?: string | undefined;
      radius?: number | undefined;
      fp?: [number, number] | undefined;
    }
  | {
      kind: 'line';
      ax: number;
      ay: number;
      bx: number;
      by: number;
      ok: boolean;
      level: VoltageLevel;
      pylons?: number[] | undefined;
      /** Waypoint towers the route bends through. */
      via?: Array<{ x: number; y: number }> | undefined;
    }
  | { kind: 'endpoint'; x: number; y: number; level: VoltageLevel };

interface RoutePath {
  kind: RouteClass;
  /** World-space samples. */
  pts: Array<{ x: number; y: number; water: boolean }>;
  cum: number[];
  total: number;
  /** World px per tile of route length (for speeds in tiles/s). */
  pxPerTile: number;
}

interface Vehicle {
  path: RoutePath;
  s: number;
  dir: 1 | -1;
  speed: number; // tiles/s
  g: Graphics;
  /** Trailing carriages (trains). */
  cars: Graphics[];
  kind: 'car' | 'train' | 'boat';
}

interface LineAnim {
  pts: Array<{ x: number; y: number }>;
  cum: number[];
  speed: number;
  color: number;
}

interface Pulse {
  x: number;
  y: number;
  age: number;
}

interface RotorG extends Graphics {
  spin?: number;
}

export class MapRenderer {
  private app = new Application();
  private world = new Container();
  private city = new Container();
  private terrainLayer = new Container();
  private routesG = new Graphics();
  private structureLayer = new Container();
  private vehicleLayer = new Container();
  private coverageG = new Graphics();
  private suitability: Sprite | undefined;
  private smogG = new Graphics();
  private subRingsG = new Graphics();
  private assetLayer = new Container();
  private linesG = new Graphics();
  private flowG = new Graphics();
  private pulseG = new Graphics();
  private fleetLayer = new Container();
  private jobsG = new Graphics();
  private siteLayer = new Container();
  private labelLayer = new Container();
  private labels: Array<{ t: Text; base: number }> = [];
  private levelG = new Graphics();
  private levelHighlight: VoltageLevel | undefined;
  /** 'headroom' re-colours every corridor by spare capacity. */
  private overlayMode: 'none' | 'headroom' = 'none';
  private selG = new Graphics();
  private councilG = new Graphics();
  private lastAssets: PlacedAsset[] = [];
  private vanSprites = new Map<number, Sprite>();
  private ghostG = new Graphics();
  private ghostSprite: Sprite | undefined;
  private textures = new Map<string, Texture>();
  private frameSize = new Map<string, { w: number; h: number }>();
  private structureSprites = new Map<number, Sprite>();
  private groundSprites = new Map<number, Sprite>();
  private destroyed = false;
  private dragging = false;
  private dragTravel = 0;
  private lastPointer = { x: 0, y: 0 };
  private cityFilter = new ColorMatrixFilter();
  private assetSignature = '';
  private sitesSignature = '';
  private coverageHash = 0;
  private prevCoverage: Uint8Array | undefined;
  private map: CityMap | undefined;
  private growthApplied = 0;

  private sitePins: Array<{ ring: Graphics; body: Container; phase: number }> = [];
  private jobLayer = new Container();
  private jobPins: Array<{ ring: Graphics; body: Container; phase: number }> = [];
  private jobsSignature = '';
  private siteTapped = false;
  private lastSimTimeMin = Number.POSITIVE_INFINITY;
  private routePaths: RoutePath[] = [];
  private vehicles: Vehicle[] = [];
  private lineAnims: LineAnim[] = [];
  private pulses: Pulse[] = [];
  private rotors: Array<{ assetId: number; g: Graphics }> = [];
  private windNow = 0.5;
  private flowPhase = 0;
  private bobPhase = 0;

  onHover: ((tile: TileHover | undefined) => void) | undefined;
  onTileClick: ((tile: TileHover) => void) | undefined;
  /** A contract pin was tapped (applications/tenders/overdue sites). */
  onSiteClick: ((site: SiteView) => void) | undefined;
  /** A fault spanner pin was tapped — open the diagnosis. */
  onJobClick: ((job: JobView) => void) | undefined;

  async init(host: HTMLElement, map: CityMap): Promise<void> {
    this.map = map;
    await this.app.init({
      background: '#1b1430',
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    host.appendChild(this.app.canvas);

    await this.buildTextures();
    this.buildRoutePaths(map);
    this.buildWorld(map);
    this.drawRoutes();
    this.spawnVehicles();

    this.cityFilter.desaturate();
    this.cityFilter.brightness(0.62, true);

    this.structureLayer.sortableChildren = true;
    this.assetLayer.sortableChildren = true;
    this.city.addChild(this.terrainLayer);
    this.city.addChild(this.routesG);
    this.city.addChild(this.vehicleLayer);
    this.city.addChild(this.structureLayer);
    this.world.addChild(this.city);
    this.world.addChild(this.coverageG);
    this.world.addChild(this.smogG);
    this.world.addChild(this.subRingsG);
    this.world.addChild(this.assetLayer);
    this.world.addChild(this.linesG);
    this.world.addChild(this.flowG);
    this.world.addChild(this.pulseG);
    this.world.addChild(this.levelG);
    this.world.addChild(this.selG);
    this.world.addChild(this.councilG);
    this.world.addChild(this.jobsG);
    this.world.addChild(this.jobLayer);
    this.world.addChild(this.fleetLayer);
    this.world.addChild(this.siteLayer);
    this.world.addChild(this.labelLayer);
    this.world.addChild(this.ghostG);
    this.app.stage.addChild(this.world);

    const scale = 0.5 / RES;
    const focus = this.tileCentre(66, 80);
    this.world.scale.set(scale);
    this.world.position.set(
      this.app.screen.width / 2 - focus.x * scale,
      this.app.screen.height / 2 - focus.y * scale,
    );

    this.buildLabels();
    this.attachInput(map);
    this.app.ticker.add(() => this.animate(this.app.ticker.deltaMS / 1000));

    // snapshots can land BEFORE this point (loading a save races the
    // atlas): that early sprite pass had no textures, so substations
    // and plants silently vanished while the Graphics-drawn lines kept
    // flowing. Re-run the pass now that the textures exist.
    if (this.lastAssets.length > 0) {
      this.rebuildAssetSprites(this.lastAssets, this.lastSimTimeMin);
    }
  }

  /** Town / landmark names that fade in as the camera pulls out and hold
   *  a constant on-screen size — the map stops being anonymous. */
  private buildLabels(): void {
    const add = (x: number, y: number, text: string, px: number, color: number): void => {
      const t = new Text({
        text,
        style: {
          fontFamily: 'monospace',
          fontSize: 64,
          fontWeight: '700',
          fill: color,
          stroke: { color: 0x10162f, width: 8 },
          letterSpacing: 4,
        },
      });
      t.anchor.set(0.5);
      const c = this.tileCentre(x, y);
      t.position.set(c.x, c.y - 20 * RES);
      this.labelLayer.addChild(t);
      this.labels.push({ t, base: px / 64 });
    };
    for (const town of TOWNS) {
      add(town.x, town.y, town.name.toUpperCase(), town.kind === 'town' ? 15 : 10.5, 0xf4f1ea);
    }
    add(128, 78, 'LONDON', 22, 0xf4f1ea);
    for (const pl of NAMED_PLACES) {
      add(pl.x, pl.y, pl.name, 9, 0xffd277);
    }
  }

  /** Headroom heatmap: corridors gradient green→amber→red by loading. */
  setOverlay(mode: 'none' | 'headroom'): void {
    this.overlayMode = mode;
  }

  setGridView(on: boolean): void {
    this.city.filters = on ? [this.cityFilter] : [];
    this.vehicleLayer.visible = !on;
  }

  /** While the line tool is armed: ring every asset with a bay at that
   *  voltage so it's obvious what can connect to what. */
  setLevelHighlight(level: VoltageLevel | undefined): void {
    this.levelHighlight = level;
    this.drawLevelHighlight();
  }

  private drawLevelHighlight(): void {
    this.levelG.clear();
    const level = this.levelHighlight;
    if (level === undefined) return;
    for (const a of this.lastAssets) {
      if (a.kind === 'line') continue;
      if (!assetLevels(a).includes(level)) continue;
      this.diamond(this.levelG, a.x, a.y, 1.15);
      this.levelG.stroke({ color: LEVEL_COLOR[level], width: 2.6 * RES, alpha: 0.95 });
      this.diamond(this.levelG, a.x, a.y, 1.45);
      this.levelG.stroke({ color: LEVEL_COLOR[level], width: 1.2 * RES, alpha: 0.4 });
    }
  }

  /** Ring-fence a council on the map (grid-balance row click), or clear. */
  setCouncilHighlight(councilId: number | undefined): void {
    this.councilG.clear();
    const map = this.map;
    if (councilId === undefined || !map) return;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.council[y * map.width + x] !== councilId) continue;
        this.diamond(this.councilG, x, y, 1.0);
      }
    }
    this.councilG.fill({ color: 0xff8a1e, alpha: 0.14 });
  }

  /** Highlight the inspected asset or line span on the map, or clear. */
  setSelection(sel: Selection | undefined): void {
    this.selG.clear();
    if (!sel) return;
    if (sel.kind === 'tile') {
      this.diamond(this.selG, sel.x, sel.y, 1.25);
      this.selG.stroke({ color: 0xf4f1ea, width: 3 * RES, alpha: 0.95 });
      this.diamond(this.selG, sel.x, sel.y, 1.55);
      this.selG.stroke({ color: 0xffb066, width: 1.4 * RES, alpha: 0.6 });
    } else {
      const a = this.tileCentre(sel.ax, sel.ay);
      const b = this.tileCentre(sel.bx, sel.by);
      this.selG.moveTo(a.x, a.y - 8 * RES).lineTo(b.x, b.y - 8 * RES);
      this.selG.stroke({ color: 0xf4f1ea, width: 2.2 * RES, alpha: 0.75 });
      this.diamond(this.selG, sel.ax, sel.ay, 0.8);
      this.diamond(this.selG, sel.bx, sel.by, 0.8);
      this.selG.stroke({ color: 0xffb066, width: 2.2 * RES, alpha: 0.9 });
    }
  }

  /** Green/red build-suitability overlay (1 = suitable per tile), or off. */
  setSuitability(mask: Uint8Array | undefined): void {
    if (this.suitability) {
      this.suitability.destroy({ texture: true });
      this.suitability = undefined;
    }
    const map = this.map;
    if (!mask || !map) return;
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(map.width, map.height);
    for (let i = 0; i < mask.length; i++) {
      const ok = mask[i] === 1;
      img.data[i * 4] = ok ? 0x4c : 0xd6;
      img.data[i * 4 + 1] = ok ? 0xc4 : 0x4a;
      img.data[i * 4 + 2] = ok ? 0x6a : 0x52;
      img.data[i * 4 + 3] = ok ? 70 : 88;
    }
    ctx.putImageData(img, 0, 0);
    const sprite = new Sprite(Texture.from(canvas));
    sprite.setFromMatrix(new Matrix(HALF_W, HALF_H, -HALF_W, HALF_H, 0, -HALF_H));
    this.world.addChildAt(sprite, this.world.getChildIndex(this.smogG));
    this.suitability = sprite;
  }

  /** Mirror sim-side town growth onto this client's map + repaint tiles. */
  applyGrowth(growth: GrowthPatch[]): void {
    const map = this.map;
    if (!map || growth.length <= this.growthApplied) return;
    for (let k = this.growthApplied; k < growth.length; k++) {
      const g = growth[k];
      if (!g) continue;
      map.zone[g.i] = g.zone;
      map.customers[g.i] = g.customers;
      this.repaintTile(g.i % map.width, Math.floor(g.i / map.width));
    }
    this.growthApplied = growth.length;
  }

  /** Refresh all dynamic layers from the latest sim snapshot. */
  updateDynamic(
    assets: PlacedAsset[],
    branches: BranchView[],
    coverage: Uint8Array,
    vans: VanView[] = [],
    jobs: JobView[] = [],
    genMW: Array<[number, number]> = [],
    simTimeMin = Number.POSITIVE_INFINITY,
    wind = 0.5,
    sites: SiteView[] = [],
  ): void {
    if (!this.map) return;
    this.windNow = wind;
    const byId = new Map<number, PlacedAsset>();
    for (const a of assets) byId.set(a.id, a);
    const mwOf = new Map(genMW);

    this.lastAssets = assets;
    this.lastSimTimeMin = simTimeMin;
    if (this.levelHighlight !== undefined) this.drawLevelHighlight();
    // conversions keep the asset id but change its look: bake the bits
    // that pick a sprite (construction, line build, GIS) into the signature
    const sig = assets
      .map(
        (a) =>
          `${a.id}:${a.kind}:${
            a.kind === 'gen' && (a.liveAtMin ?? 0) > simTimeMin
              ? 'c'
              : a.kind === 'line'
                ? a.build
                : a.kind === 'sub' && a.underground
                  ? 'u'
                  : ''
          }`,
      )
      .join(',');
    if (sig !== this.assetSignature) {
      this.assetSignature = sig;
      this.rebuildAssetSprites(assets, simTimeMin);
    }

    const siteSig = sites.map((s) => `${s.x},${s.y},${s.icon}`).join(';');
    if (siteSig !== this.sitesSignature) {
      this.sitesSignature = siteSig;
      this.rebuildSites(sites);
    }

    this.drawSmog(assets, mwOf);
    this.drawLines(assets, branches, byId);
    this.drawFleet(vans, jobs);
    this.updateRotorSpeeds(byId, mwOf);

    let hash = coverage.length;
    for (let i = 0; i < coverage.length; i++) hash = (hash * 31 + (coverage[i] ?? 0)) >>> 0;
    if (hash !== this.coverageHash) {
      this.coverageHash = hash;
      this.spawnPulses(coverage);
      this.drawCoverage(coverage);
      this.prevCoverage = coverage.slice();
    }
  }

  setZoom(scale: number): void {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    const old = this.world.scale.x;
    this.world.x = cx - ((cx - this.world.x) / old) * next;
    this.world.y = cy - ((cy - this.world.y) / old) * next;
    this.world.scale.set(next);
  }

  panTo(x: number, y: number): void {
    const c = this.tileCentre(x, y);
    const s = this.world.scale.x;
    this.world.position.set(
      this.app.screen.width / 2 - c.x * s,
      this.app.screen.height / 2 - c.y * s,
    );
  }

  tileToScreen(x: number, y: number): { x: number; y: number } {
    const c = this.tileCentre(x, y);
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: rect.left + c.x * this.world.scale.x + this.world.x,
      y: rect.top + c.y * this.world.scale.y + this.world.y,
    };
  }

  // --- the static world -------------------------------------------------------

  private buildWorld(map: CityMap): void {
    for (let k = 0; k <= map.width + map.height - 2; k++) {
      const xStart = Math.max(0, k - map.height + 1);
      const xEnd = Math.min(map.width - 1, k);
      for (let x = xStart; x <= xEnd; x++) {
        this.paintTile(map, x, k - x);
      }
    }
  }

  private paintTile(map: CityMap, x: number, y: number): void {
    const i = y * map.width + x;
    const c = this.tileCentre(x, y);
    const ground = this.textures.get(groundSpriteFor(map, x, y));
    if (ground) {
      const s = new Sprite(ground);
      s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
      this.terrainLayer.addChild(s);
      this.groundSprites.set(i, s);
    }
    const structName = structureSpriteFor(map, x, y);
    const struct = structName ? this.textures.get(structName) : undefined;
    if (struct) {
      const s = new Sprite(struct);
      s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
      s.zIndex = x + y;
      this.structureLayer.addChild(s);
      this.structureSprites.set(i, s);
    }
  }

  private repaintTile(x: number, y: number): void {
    const map = this.map;
    if (!map) return;
    const i = y * map.width + x;
    this.groundSprites.get(i)?.destroy();
    this.groundSprites.delete(i);
    const old = this.structureSprites.get(i);
    if (old) {
      old.destroy();
      this.structureSprites.delete(i);
    }
    this.paintTile(map, x, y);
  }

  private buildRoutePaths(map: CityMap): void {
    const make = (kind: RouteClass, samples: Array<[number, number]>): RoutePath | undefined => {
      if (samples.length < 2) return undefined;
      const pts: RoutePath['pts'] = [];
      let tileLen = 0;
      for (let k = 0; k < samples.length; k++) {
        const s = samples[k];
        const prev = samples[k - 1];
        if (!s) continue;
        if (prev) tileLen += Math.hypot(s[0] - prev[0], s[1] - prev[1]);
        const c = this.tileCentre(s[0], s[1]);
        const tx = Math.round(s[0]);
        const ty = Math.round(s[1]);
        const water =
          tx >= 0 && tx < map.width && ty >= 0 && ty < map.height
            ? map.terrain[ty * map.width + tx] === 0
            : false;
        pts.push({ x: c.x, y: c.y, water });
      }
      const cum = [0];
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        cum.push((cum[k - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
      }
      const total = cum[cum.length - 1] ?? 0;
      return { kind, pts, cum, total, pxPerTile: tileLen > 0 ? total / tileLen : HALF_W };
    };

    for (const route of map.routes ?? []) {
      const p = make(route.kind, sampleRoute(route, 0.35));
      if (p) this.routePaths.push(p);
    }
    // the river itself is a route for the barges
    {
      const samples: Array<[number, number]> = [];
      for (let x = 6; x < map.width - 4; x += 3) {
        samples.push([x, riverCenterY(x) + (riverHalfWidth(x) > 4 ? 2 : 0)]);
      }
      const p = make('lane', samples);
      if (p) {
        p.kind = 'lane';
        (p as RoutePath & { isRiver?: boolean }).isRiver = true;
        this.routePaths.push(p);
      }
    }
  }

  /** All the tarmac, verges, flowers, sleepers and rails — drawn once. */
  private drawRoutes(): void {
    const g = this.routesG;
    let flowerSeed = 0x5eed1;
    const rnd = (): number => {
      flowerSeed = (flowerSeed * 1664525 + 1013904223) >>> 0;
      return flowerSeed / 0xffffffff;
    };

    const stroke = (
      path: RoutePath,
      width: number,
      color: number,
      alpha = 1,
      offset = 0,
    ): void => {
      const first = path.pts[0];
      if (!first) return;
      g.moveTo(first.x, first.y + offset);
      for (let k = 1; k < path.pts.length; k++) {
        const p = path.pts[k];
        if (p) g.lineTo(p.x, p.y + offset);
      }
      g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };

    // under-layers first: verges, casings
    for (const path of this.routePaths) {
      if ((path as RoutePath & { isRiver?: boolean }).isRiver) continue;
      const st = ROUTE_STYLE[path.kind];
      if (path.kind === 'lane' || path.kind === 'street') {
        stroke(path, st.width + 4.5 * RES, 0x79a04e, 0.55); // grass verge
      }
      if (path.kind === 'arterial') {
        stroke(path, st.width + 6 * RES, 0x79a04e, 0.4); // wide verge
        stroke(path, st.width + 3 * RES, 0x3f8f4e, 0.85); // cycle lanes
      }
      stroke(path, st.width + 2 * RES, 0x241c38, 0.6); // ink casing
    }
    // carriageways
    for (const path of this.routePaths) {
      if ((path as RoutePath & { isRiver?: boolean }).isRiver) continue;
      const st = ROUTE_STYLE[path.kind];
      if (path.kind === 'rail') {
        stroke(path, st.width, 0x4a4555, 0.95); // ballast
        continue;
      }
      stroke(path, st.width, st.color, 1);
      if (path.kind === 'motorway') {
        stroke(path, 1.4 * RES, 0x8fb35c, 1); // grassed median
        stroke(path, 0.9 * RES, 0xe8e2d2, 0.9, -st.width / 2 + 1.2 * RES);
        stroke(path, 0.9 * RES, 0xe8e2d2, 0.9, st.width / 2 - 1.2 * RES);
      }
    }
    // details: dashes, rails+sleepers, bridge piers, flowers
    for (const path of this.routePaths) {
      if ((path as RoutePath & { isRiver?: boolean }).isRiver) continue;
      const st = ROUTE_STYLE[path.kind];
      if (path.kind === 'rail') {
        // sleepers then twin rails
        for (let d = 0; d < path.total; d += 5.5 * RES) {
          const p = this.pointAt(path, d);
          if (!p) continue;
          const px = -p.ny * 2.6 * RES;
          const py = p.nx * 2.6 * RES;
          g.moveTo(p.x - px, p.y - py).lineTo(p.x + px, p.y + py);
        }
        g.stroke({ color: 0x6e5a43, width: 1.1 * RES, alpha: 0.9 });
        for (const side of [-1.6 * RES, 1.6 * RES]) {
          let started = false;
          for (let k = 0; k < path.pts.length; k++) {
            const p = this.pointAt(path, path.cum[k] ?? 0);
            if (!p) continue;
            const x = p.x - p.ny * side;
            const y = p.y + p.nx * side;
            if (!started) {
              g.moveTo(x, y);
              started = true;
            } else {
              g.lineTo(x, y);
            }
          }
          g.stroke({ color: 0x9aa4b5, width: 0.9 * RES, alpha: 1 });
        }
      } else if (path.kind === 'arterial' || path.kind === 'motorway') {
        for (let d = 6 * RES; d < path.total; d += 26 * RES) {
          const p0 = this.pointAt(path, d);
          const p1 = this.pointAt(path, d + 9 * RES);
          if (!p0 || !p1) continue;
          const off = path.kind === 'motorway' ? st.width / 4 : 0;
          g.moveTo(p0.x - p0.ny * off, p0.y + p0.nx * off).lineTo(p1.x - p1.ny * off, p1.y + p1.nx * off);
          if (path.kind === 'motorway') {
            g.moveTo(p0.x + p0.ny * off, p0.y - p0.nx * off).lineTo(p1.x + p1.ny * off, p1.y - p1.nx * off);
          }
        }
        g.stroke({ color: 0xe8e2d2, width: 1 * RES, alpha: 0.75 });
      }
      // piers where the route crosses water
      for (let k = 1; k < path.pts.length - 1; k += 3) {
        const p = path.pts[k];
        if (p?.water) {
          g.rect(p.x - 2.2 * RES, p.y + 2 * RES, 4.4 * RES, 5 * RES);
          g.fill({ color: 0xb8b2c4, alpha: 0.95 });
        }
      }
      // randomized flowers along the quiet verges — never homogeneous
      if (path.kind === 'street' || path.kind === 'lane' || path.kind === 'arterial') {
        for (let d = rnd() * 30 * RES; d < path.total; d += (22 + rnd() * 46) * RES) {
          const p = this.pointAt(path, d);
          if (!p || p.water) continue;
          const side = rnd() < 0.5 ? -1 : 1;
          const off = (st.width / 2 + (2.2 + rnd() * 2.4) * RES) * side;
          const fx = p.x - p.ny * off;
          const fy = p.y + p.nx * off;
          const color = FLOWERS[Math.floor(rnd() * FLOWERS.length)] ?? 0xf4f1ea;
          for (let f = 0; f < 2 + Math.floor(rnd() * 3); f++) {
            g.circle(fx + (rnd() - 0.5) * 5 * RES, fy + (rnd() - 0.5) * 3 * RES, 0.9 * RES);
            g.fill({ color, alpha: 0.95 });
          }
        }
      }
    }
  }

  /** Point + unit tangent at distance d along a path. */
  private pointAt(
    path: RoutePath,
    d: number,
  ): { x: number; y: number; nx: number; ny: number; water: boolean } | undefined {
    if (path.pts.length < 2) return undefined;
    const dd = Math.min(Math.max(d, 0), path.total - 1e-3);
    let lo = 0;
    let hi = path.cum.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if ((path.cum[mid] ?? 0) <= dd) lo = mid;
      else hi = mid;
    }
    const c0 = path.cum[lo] ?? 0;
    const c1 = path.cum[lo + 1] ?? c0 + 1;
    const p0 = path.pts[lo];
    const p1 = path.pts[lo + 1];
    if (!p0 || !p1) return undefined;
    const t = Math.min(1, Math.max(0, (dd - c0) / Math.max(1e-6, c1 - c0)));
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: p0.x + dx * t,
      y: p0.y + dy * t,
      nx: dx / len,
      ny: dy / len,
      water: t < 0.5 ? p0.water : p1.water,
    };
  }

  // --- the living world -------------------------------------------------------

  private spawnVehicles(): void {
    let seed = 0xcab5;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    let cars = 0;
    for (const path of this.routePaths) {
      const river = (path as RoutePath & { isRiver?: boolean }).isRiver === true;
      const st = ROUTE_STYLE[path.kind];
      if (river) {
        for (let b = 0; b < 9; b++) {
          const hull = new Graphics();
          const big = rnd() < 0.3;
          const L = (big ? 13 : 9) * RES;
          const W2 = (big ? 5 : 3.6) * RES;
          hull.roundRect(-L / 2, -W2 / 2, L, W2, W2 / 2).fill(big ? 0x39426e : 0x6e5a43);
          hull.rect(-L * 0.1, -W2 * 0.3, L * 0.3, W2 * 0.6).fill(0xf4f1ea);
          this.vehicleLayer.addChild(hull);
          this.vehicles.push({
            path,
            s: rnd() * path.total,
            dir: rnd() < 0.5 ? 1 : -1,
            speed: 0.5 + rnd() * 0.4,
            g: hull,
            cars: [],
            kind: 'boat',
          });
        }
        continue;
      }
      if (path.kind === 'rail') {
        for (let t = 0; t < 2; t++) {
          const loco = new Graphics();
          const carsG: Graphics[] = [];
          const mk = (lead: boolean): Graphics => {
            const c = new Graphics();
            c.roundRect(-5.5 * RES, -2.6 * RES, 11 * RES, 5.2 * RES, 1.4 * RES).fill(0x39426e);
            c.rect(-4.5 * RES, -1.4 * RES, 9 * RES, 1 * RES).fill(0xffd277);
            if (lead) c.rect(3.6 * RES, -2 * RES, 1.6 * RES, 4 * RES).fill(0xff8a1e);
            return c;
          };
          loco.addChild(mk(true));
          this.vehicleLayer.addChild(loco);
          for (let k = 0; k < 3; k++) {
            const c = mk(false);
            this.vehicleLayer.addChild(c);
            carsG.push(c);
          }
          this.vehicles.push({
            path,
            s: rnd() * path.total,
            dir: rnd() < 0.5 ? 1 : -1,
            speed: ROUTE_STYLE.rail.speed * (0.85 + rnd() * 0.3),
            g: loco,
            cars: carsG,
            kind: 'train',
          });
        }
        continue;
      }
      // cars by route length
      const want = Math.min(40, Math.floor(path.total / (st.perTile * path.pxPerTile)));
      for (let k = 0; k < want && cars < 320; k++) {
        cars++;
        const isTaxi = rnd() < 0.1;
        const body = isTaxi ? 0xffd277 : CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)] ?? 0xf4f1ea;
        const gg = new Graphics();
        const L = 7 * RES;
        const W2 = 4 * RES;
        gg.roundRect(-L / 2, -W2 / 2, L, W2, 1.5 * RES).fill(body);
        gg.roundRect(-L * 0.18, -W2 * 0.34, L * 0.42, W2 * 0.68, RES).fill(0x27324d);
        this.vehicleLayer.addChild(gg);
        this.vehicles.push({
          path,
          s: rnd() * path.total,
          dir: rnd() < 0.5 ? 1 : -1,
          speed: st.speed * (0.8 + rnd() * 0.45),
          g: gg,
          cars: [],
          kind: 'car',
        });
      }
    }
  }

  private stepVehicles(dt: number): void {
    if (!this.vehicleLayer.visible) return;
    for (const v of this.vehicles) {
      v.s += dt * v.speed * v.path.pxPerTile * v.dir;
      if (v.s < 0 || v.s > v.path.total) {
        v.dir = -v.dir as 1 | -1;
        v.s = Math.min(Math.max(v.s, 0), v.path.total);
      }
      const lane =
        v.kind === 'car'
          ? (v.path.kind === 'motorway' ? 4 * RES : v.path.kind === 'arterial' ? 2.6 * RES : 1.6 * RES) * v.dir
          : v.kind === 'boat'
            ? 4 * RES * v.dir
            : 0;
      const place = (g: Graphics, dist: number): void => {
        const p = this.pointAt(v.path, dist);
        if (!p) return;
        const lift = p.water && v.kind !== 'boat' ? 8 * RES : 0;
        g.position.set(p.x - p.ny * lane, p.y + p.nx * lane - lift);
        g.rotation = Math.atan2(p.ny * v.dir, p.nx * v.dir);
      };
      place(v.g, v.s);
      for (let k = 0; k < v.cars.length; k++) {
        const c = v.cars[k];
        if (c) place(c, v.s - v.dir * (k + 1) * 12 * RES);
      }
    }
  }

  private animate(dt: number): void {
    if (this.destroyed || !this.map) return;
    this.stepVehicles(dt);
    this.stepRotors(dt);
    this.stepFlow(dt);
    this.stepPulses(dt);
    this.bobPhase += dt;
    {
      // labels: visible zoomed out, gone close in; constant screen size
      const sc = this.world.scale.x;
      const alpha = Math.max(0, Math.min(1, (0.3 - sc) / 0.08));
      this.labelLayer.visible = alpha > 0.02;
      if (this.labelLayer.visible) {
        this.labelLayer.alpha = alpha;
        const inv = 1 / Math.max(sc, 1e-6);
        for (const l of this.labels) l.t.scale.set(l.base * inv * 0.25);
      }
    }
    for (const pin of this.jobPins) {
      const t = (this.bobPhase * 1.1 + pin.phase) % 1.3;
      const bounce = Math.abs(Math.sin((this.bobPhase * 3 + pin.phase) * Math.PI * 0.5));
      pin.body.y = -bounce * 7 * RES;
      const k = t / 1.3;
      pin.ring.scale.set(0.35 + k * 1.5);
      pin.ring.alpha = Math.max(0, 0.9 * (1 - k));
    }
    for (const pin of this.sitePins) {
      // bouncing pin + an expanding ring pulse rolling off the ground
      const t = (this.bobPhase * 0.9 + pin.phase) % 1.6;
      const bounce = Math.abs(Math.sin((this.bobPhase * 2.4 + pin.phase) * Math.PI * 0.5));
      pin.body.y = -bounce * 9 * RES;
      const k = t / 1.6;
      pin.ring.scale.set(0.35 + k * 1.5);
      pin.ring.alpha = Math.max(0, 0.9 * (1 - k));
    }
  }

  private stepRotors(dt: number): void {
    for (const r of this.rotors) {
      r.g.rotation += dt * (0.6 + 2.6 * this.windNow) * ((r.g as RotorG).spin ?? 1);
    }
  }

  private stepFlow(dt: number): void {
    this.flowPhase += dt;
    this.flowG.clear();
    if (this.lineAnims.length === 0) return;
    const gap = 46 * RES;
    const size = 4.6 * RES;
    for (const anim of this.lineAnims) {
      const total = anim.cum[anim.cum.length - 1] ?? 0;
      if (total < gap * 0.7 || anim.speed === 0) continue;
      const distBase = (this.flowPhase * Math.abs(anim.speed)) % gap;
      for (let d = distBase; d < total; d += gap) {
        const s = anim.speed > 0 ? d : total - d;
        let seg = 0;
        while (seg + 1 < anim.cum.length && (anim.cum[seg + 1] ?? 0) < s) seg++;
        const c0 = anim.cum[seg] ?? 0;
        const c1 = anim.cum[seg + 1] ?? c0 + 1;
        const p0 = anim.pts[seg];
        const p1 = anim.pts[seg + 1];
        if (!p0 || !p1) continue;
        const t = Math.min(1, Math.max(0, (s - c0) / Math.max(1e-6, c1 - c0)));
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        let ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        if (anim.speed < 0) ang += Math.PI;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        this.flowG.poly([
          x + ca * size, y + sa * size,
          x - ca * size * 0.6 - sa * size * 0.7, y - sa * size * 0.6 + ca * size * 0.7,
          x - ca * size * 0.2, y - sa * size * 0.2,
          x - ca * size * 0.6 + sa * size * 0.7, y - sa * size * 0.6 - ca * size * 0.7,
        ]);
        this.flowG.fill({ color: anim.color, alpha: 0.95 });
      }
    }
  }

  private spawnPulses(coverage: Uint8Array): void {
    const map = this.map;
    const prev = this.prevCoverage;
    if (!map || !prev || prev.length !== coverage.length) return;
    let budget = 50;
    for (let i = 0; i < coverage.length && budget > 0; i++) {
      const was = prev[i];
      const now = coverage[i];
      if (now === COV.on && (was === COV.unserved || was === COV.off)) {
        this.pulses.push({ x: i % map.width, y: Math.floor(i / map.width), age: 0 });
        budget--;
      }
    }
    if (this.pulses.length > 90) this.pulses.splice(0, this.pulses.length - 90);
  }

  private stepPulses(dt: number): void {
    if (this.pulses.length === 0) {
      this.pulseG.clear();
      return;
    }
    this.pulseG.clear();
    const DUR = 1.1;
    for (const p of this.pulses) {
      p.age += dt;
      if (p.age >= DUR) continue;
      const t = p.age / DUR;
      const s = 0.3 + 1.3 * t;
      const alpha = (1 - t) * 0.9;
      this.diamond(this.pulseG, p.x, p.y, s);
      this.pulseG.stroke({ color: 0xffd277, width: 2.5 * RES * (1 - t * 0.6), alpha });
      if (t < 0.45) {
        this.diamond(this.pulseG, p.x, p.y, 0.9);
        this.pulseG.fill({ color: 0xffd277, alpha: 0.4 * (1 - t / 0.45) });
      }
    }
    this.pulses = this.pulses.filter((p) => p.age < DUR);
  }

  private updateRotorSpeeds(byId: Map<number, PlacedAsset>, mwOf: Map<number, number>): void {
    for (const r of this.rotors) {
      const a = byId.get(r.assetId);
      if (!a || a.kind !== 'gen') continue;
      const cap = GENS[a.gen].capacityMW;
      const out = mwOf.get(r.assetId) ?? 0;
      (r.g as RotorG).spin = out > 0 ? 0.5 + (out / cap) * 1.2 : 0.12;
    }
  }

  /** Red spanner pins over live faults: what broke, click → diagnosis.
   *  Same attention language as the contract pins (bounce + pulse). */
  private rebuildJobPins(jobs: JobView[]): void {
    this.jobLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.jobPins = [];
    for (const j of jobs) {
      const c = this.tileCentre(j.x, j.y);
      const pin = new Container();
      pin.position.set(c.x, c.y);

      const ring = new Graphics();
      ring.ellipse(0, 0, 16 * RES, 8 * RES).stroke({ color: 0xe0697a, width: 2.4 * RES });
      pin.addChild(ring);

      const body = new Container();
      const g = new Graphics();
      const r = 12 * RES;
      const head = -r * 3;
      g.moveTo(0, 0)
        .quadraticCurveTo(-r * 1.05, head + r * 1.7, -r, head)
        .arc(0, head, r, Math.PI, 0)
        .quadraticCurveTo(r * 1.05, head + r * 1.7, 0, 0)
        .fill({ color: 0xe0697a, alpha: 0.97 })
        .stroke({ color: 0x241c38, width: 2 * RES, alpha: 0.95 });
      body.addChild(g);
      const glyph = new Text({
        text: '🔧',
        style: { fontFamily: 'monospace', fontSize: 13 * RES, fontWeight: '800', fill: 0xfff6e8 },
      });
      glyph.anchor.set(0.5);
      glyph.position.set(0, head);
      body.addChild(glyph);
      const label = new Text({
        text: j.staffed ? `${j.label} · crew on it` : `${j.label} · awaiting crew`,
        style: { fontFamily: 'monospace', fontSize: 8 * RES, fontWeight: '700', fill: 0xffd6d6 },
      });
      label.anchor.set(0.5, 1);
      label.position.set(0, head - r * 1.3);
      body.addChild(label);
      pin.addChild(body);

      pin.eventMode = 'static';
      pin.cursor = 'pointer';
      pin.on('pointerdown', () => {
        this.siteTapped = true;
      });
      pin.on('pointertap', () => this.onJobClick?.(j));

      this.jobLayer.addChild(pin);
      this.jobPins.push({ ring, body, phase: Math.random() * Math.PI * 2 });
    }
  }

  // --- pins: applications, tenders and angry customers -------------------------

  private rebuildSites(sites: SiteView[]): void {
    this.siteLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.sitePins = [];
    const STYLE: Record<SiteView['icon'], { bg: number; glyph: string; fg: number }> = {
      application: { bg: 0xffd277, glyph: '!', fg: 0x10162f },
      tender: { bg: 0x5ea3ff, glyph: '£', fg: 0x10162f },
      overdue: { bg: 0xe0697a, glyph: '⚡', fg: 0xfff6e8 },
      building: { bg: 0x9aa4b5, glyph: '⛏', fg: 0x10162f },
    };
    for (const site of sites) {
      const st = STYLE[site.icon];
      const c = this.tileCentre(site.x, site.y);
      const pin = new Container();
      pin.position.set(c.x, c.y);

      // pulsing ground ring — the attention-grabber
      const ring = new Graphics();
      ring.ellipse(0, 0, 18 * RES, 9 * RES).stroke({ color: st.bg, width: 2.4 * RES });
      pin.addChild(ring);

      const shadow = new Graphics();
      shadow.ellipse(0, 0, 9 * RES, 4.5 * RES).fill({ color: 0x06080f, alpha: 0.4 });
      pin.addChild(shadow);

      // a proper map pin: fat teardrop, big glyph, dark rim
      const body = new Container();
      const r = 15 * RES;
      const head = -r * 3.1;
      const g = new Graphics();
      g.moveTo(0, 0)
        .quadraticCurveTo(-r * 1.05, head + r * 1.7, -r, head)
        .arc(0, head, r, Math.PI, 0)
        .quadraticCurveTo(r * 1.05, head + r * 1.7, 0, 0)
        .fill({ color: st.bg, alpha: 0.97 })
        .stroke({ color: 0x241c38, width: 2 * RES, alpha: 0.95 });
      g.circle(0, head, r * 0.62).fill({ color: 0x10162f, alpha: 0.25 });
      body.addChild(g);
      const glyph = new Text({
        text: st.glyph,
        style: { fontFamily: 'monospace', fontSize: 17 * RES, fontWeight: '800', fill: st.fg },
      });
      glyph.anchor.set(0.5);
      glyph.position.set(0, head);
      body.addChild(glyph);
      const label = new Text({
        text: site.label,
        style: { fontFamily: 'monospace', fontSize: 8.5 * RES, fontWeight: '700', fill: 0xf4f1ea },
      });
      label.anchor.set(0.5, 1);
      label.position.set(0, head - r * 1.35);
      body.addChild(label);
      pin.addChild(body);

      // tap → snap the inbox to this contract (and don't fall through
      // to the tile underneath)
      pin.eventMode = 'static';
      pin.cursor = 'pointer';
      pin.on('pointerdown', () => {
        this.siteTapped = true;
      });
      pin.on('pointertap', () => this.onSiteClick?.(site));

      this.siteLayer.addChild(pin);
      this.sitePins.push({ ring, body, phase: Math.random() * Math.PI * 2 });
    }
  }

  // --- dynamic layers ----------------------------------------------------------

  private drawFleet(vans: VanView[], jobs: JobView[]): void {
    this.jobsG.clear();
    const jobSig = jobs.map((j) => `${j.x},${j.y},${j.staffed ? 1 : 0}`).join(';');
    if (jobSig !== this.jobsSignature) {
      this.jobsSignature = jobSig;
      this.rebuildJobPins(jobs);
    }
    for (const j of jobs) {
      this.diamond(this.jobsG, j.x, j.y, 0.9);
      this.jobsG.stroke({ color: j.staffed ? 0xffb066 : 0xe0697a, width: 3 * RES, alpha: 0.9 });
    }
    const tex = this.textures.get('van');
    const seen = new Set<number>();
    for (const v of vans) {
      seen.add(v.id);
      let s = this.vanSprites.get(v.id);
      if (!s && tex) {
        s = new Sprite(tex);
        this.vanSprites.set(v.id, s);
        this.fleetLayer.addChild(s);
      }
      if (!s) continue;
      const c = this.tileCentre(v.x, v.y);
      s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
    }
    for (const [id, s] of [...this.vanSprites]) {
      if (!seen.has(id)) {
        s.destroy();
        this.vanSprites.delete(id);
      }
    }
  }

  private drawSmog(assets: PlacedAsset[], mwOf: Map<number, number>): void {
    this.smogG.clear();
    for (const a of assets) {
      if (
        a.kind !== 'gen' ||
        (a.gen !== 'gasCCGT' && a.gen !== 'gasPeaker' && a.gen !== 'biomass' && a.gen !== 'coal')
      )
        continue;
      const out = mwOf.get(a.id) ?? 0;
      if (out <= 0) continue;
      const c = this.tileCentre(a.x, a.y);
      const cap = GENS[a.gen].capacityMW;
      const big = a.gen === 'gasCCGT' || a.gen === 'coal';
      const r = (5 + 6 * Math.min(1, out / cap)) * (big ? 1 : 0.55);
      for (const [mul, alpha] of [
        [1.6, 0.05],
        [1.0, 0.08],
        [0.55, 0.1],
      ] as const) {
        this.smogG
          .ellipse(c.x + 14 * RES, c.y - 10 * RES, r * mul * HALF_W * 0.5, r * mul * HALF_H * 0.5)
          .fill({ color: a.gen === 'coal' ? 0x57505e : 0x6a6276, alpha });
      }
    }
  }

  setGhost(ghost: Ghost | undefined): void {
    this.ghostG.clear();
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = undefined;
    }
    if (!ghost) return;

    if (ghost.kind === 'tile') {
      const ok = ghost.ok;
      const [fw, fh] = ghost.fp ?? [1, 1];
      for (let dy = 0; dy < fh; dy++) {
        for (let dx = 0; dx < fw; dx++) {
          this.diamond(this.ghostG, ghost.x + dx, ghost.y + dy, 1.0);
          this.ghostG.fill({ color: ok ? 0x7bc47f : 0xe0697a, alpha: 0.3 });
          this.diamond(this.ghostG, ghost.x + dx, ghost.y + dy, 1.0);
          this.ghostG.stroke({ color: ok ? 0x7bc47f : 0xe0697a, width: 2 * RES, alpha: 0.9 });
        }
      }
      if (ghost.radius !== undefined && ok) {
        this.tileCircle(this.ghostG, ghost.x, ghost.y, ghost.radius);
        this.ghostG.stroke({ color: 0xffb066, width: 2 * RES, alpha: 0.55 });
      }
      if (ghost.sprite && ok) {
        const tex = this.textures.get(ghost.sprite);
        if (tex) {
          const s = new Sprite(tex);
          const c = this.tileCentre(ghost.x, ghost.y);
          s.position.set(c.x - fh * HALF_W, c.y - HALF_H - (CELL_H - FLOOR_H));
          s.alpha = 0.65;
          this.world.addChild(s);
          this.ghostSprite = s;
        }
      }
    } else if (ghost.kind === 'line') {
      const a = this.tileCentre(ghost.ax, ghost.ay);
      const b = this.tileCentre(ghost.bx, ghost.by);
      const color = ghost.ok ? LEVEL_COLOR[ghost.level] : 0xe0697a;
      this.ghostG.moveTo(a.x, a.y - 8 * RES).lineTo(b.x, b.y - 8 * RES);
      this.ghostG.stroke({ color, width: LEVEL_WIDTH[ghost.level], alpha: 0.55 });
      const map = this.map;
      if (map && ghost.ok) {
        for (const i of ghost.pylons ?? []) {
          const px = i % map.width;
          const py = Math.floor(i / map.width);
          this.diamond(this.ghostG, px, py, 0.45);
          this.ghostG.stroke({ color, width: 1.6 * RES, alpha: 0.85 });
        }
      }
      this.diamond(this.ghostG, ghost.bx, ghost.by, 0.7);
      this.ghostG.stroke({ color, width: 2 * RES, alpha: 0.8 });
    } else {
      this.diamond(this.ghostG, ghost.x, ghost.y, 0.8);
      this.ghostG.stroke({ color: LEVEL_COLOR[ghost.level], width: 3 * RES, alpha: 1 });
    }
  }

  private rebuildAssetSprites(assets: PlacedAsset[], simTimeMin: number): void {
    this.assetLayer.removeChildren().forEach((c) => c.destroy());
    this.rotors = [];
    this.drawSubRings(assets);
    const map = this.map;
    for (const a of assets) {
      if (a.kind === 'line') {
        const tex = this.textures.get(PYLON_SPRITE[a.level]);
        if (!map || !tex || a.build === 'underground') continue;
        for (const i of a.pylons ?? []) {
          const px = i % map.width;
          const py = Math.floor(i / map.width);
          const s = new Sprite(tex);
          const c = this.tileCentre(px, py);
          s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
          s.zIndex = px + py;
          this.assetLayer.addChild(s);
        }
        continue;
      }
      const building = a.kind === 'gen' && (a.liveAtMin ?? 0) > simTimeMin;
      const name = building
        ? 'construction'
        : a.kind === 'gen'
          ? GEN_SPRITE[a.gen]
          : a.kind === 'sub'
            ? a.sub === 'tee'
              ? PYLON_SPRITE[a.teeLevel ?? 132] // a tee tower on the route
              : a.underground
                ? 'sub_vault' // a GIS rebuild shows only its access vault
                : SUB_SPRITE[a.sub]
            : 'depot';
      const tex = name ? this.textures.get(name) : undefined;
      if (!tex) continue;
      const [fw, fh] =
        a.kind === 'gen'
          ? (GENS[a.gen].footprint ?? [1, 1])
          : a.kind === 'sub'
            ? (SUBS[a.sub].footprint ?? [1, 1])
            : [1, 1];
      const s = new Sprite(tex);
      const c = this.tileCentre(a.x, a.y);
      // GIS rebuilds swap to single-tile vault art: centre that on the plot
      const tinyArtOnPlot = a.kind === 'sub' && a.underground === true && (fw > 1 || fh > 1);
      if (!building && !tinyArtOnPlot && (fw > 1 || fh > 1)) {
        s.position.set(c.x - fh * HALF_W, c.y - HALF_H - (CELL_H - FLOOR_H));
      } else if (tinyArtOnPlot) {
        const cc = this.tileCentre(a.x + (fw - 1) / 2, a.y + (fh - 1) / 2);
        s.position.set(cc.x - HALF_W, cc.y + HALF_H - CELL_H);
      } else {
        s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
      }
      s.zIndex = a.x + fw - 1 + a.y + fh - 1;
      this.assetLayer.addChild(s);

      if (!building && a.kind === 'gen' && (a.gen === 'windOnshore' || a.gen === 'windOffshore')) {
        for (const spec of WIND_HUBS[a.gen === 'windOffshore' ? 'offshore' : 'onshore']) {
          const [hx, hy] = windHubOffset(spec);
          const rotor = new Graphics() as RotorG;
          const len = spec.bladePx * RES;
          for (let b = 0; b < 3; b++) {
            const ang = (b * 2 * Math.PI) / 3;
            rotor.moveTo(0, 0).lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
          }
          rotor.stroke({ color: 0xf4f1ea, width: 2.2 * RES, cap: 'round' });
          rotor.circle(0, 0, 2.6 * RES).fill(0xff8a1e);
          rotor.position.set(c.x - HALF_W + hx, c.y + HALF_H - CELL_H + hy);
          rotor.scale.y = 0.92;
          rotor.zIndex = a.x + a.y + 0.1;
          rotor.spin = 1;
          this.assetLayer.addChild(rotor);
          this.rotors.push({ assetId: a.id, g: rotor });
        }
      }
    }
  }

  /** Every substation wears its bay colours at all times — nested rings
   *  (400 blue outside, 33 orange inside) matching the line colours, so
   *  what-connects-where reads at a glance. */
  private drawSubRings(assets: PlacedAsset[]): void {
    this.subRingsG.clear();
    for (const a of assets) {
      if (a.kind !== 'sub') continue;
      const levels = assetLevels(a);
      const [fw, fh] = SUBS[a.sub].footprint ?? [1, 1];
      const cx = a.x + (fw - 1) / 2;
      const cy = a.y + (fh - 1) / 2;
      const base = 1.12 + (Math.max(fw, fh) - 1);
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        if (level === undefined) continue;
        // highest voltage outermost; every ring clears the whole plot
        this.diamond(this.subRingsG, cx, cy, base + (levels.length - 1 - i) * 0.22);
        this.subRingsG.stroke({ color: LEVEL_COLOR[level], width: 1.8 * RES, alpha: 0.75 });
      }
    }
  }

  private drawLines(
    assets: PlacedAsset[],
    branches: BranchView[],
    byId: Map<number, PlacedAsset>,
  ): void {
    const flowOf = new Map<number, BranchView>();
    for (const b of branches) flowOf.set(b.assetId, b);

    this.linesG.clear();
    this.lineAnims = [];
    const map = this.map;
    for (const a of assets) {
      if (a.kind !== 'line') continue;
      const endA = byId.get(a.a);
      const endB = byId.get(a.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
      const view = flowOf.get(a.id);
      const tripped = view?.outMin !== undefined;
      const loading = view ? Math.abs(view.flowMW) / Math.max(1e-6, view.ratingMW) : 0;
      let color = tripped ? 0x4c4a5c : loading > 0.9 ? OVERLOAD_COLOR : LEVEL_COLOR[a.level];
      let width = LEVEL_WIDTH[a.level];
      if (this.overlayMode === 'headroom' && !tripped) {
        // spare capacity reads as colour: green = lots, red = none
        const t = Math.max(0, Math.min(1, loading));
        const lerp = (a0: number, b0: number): number => Math.round(a0 + (b0 - a0) * t);
        const g = { r: 0x7b, g: 0xc4, b: 0x7f };
        const r = { r: 0xe0, g: 0x69, b: 0x7a };
        color = (lerp(g.r, r.r) << 16) | (lerp(g.g, r.g) << 8) | lerp(g.b, r.b);
        width = width * 1.5;
      }

      if (a.build === 'underground') {
        // buried cables read as a dashed trench trace in the level colour
        const pa = this.tileCentre(endA.x, endA.y);
        const pb = this.tileCentre(endB.x, endB.y);
        const span = Math.hypot(pb.x - pa.x, pb.y - pa.y);
        const n = Math.max(2, Math.round(span / (10 * RES)) * 2);
        const pts: Array<{ x: number; y: number }> = [];
        for (let k = 0; k <= n; k++) {
          pts.push({ x: pa.x + ((pb.x - pa.x) * k) / n, y: pa.y + ((pb.y - pa.y) * k) / n });
        }
        this.strokeSpan(pts, width, color, 0.85, true);
        this.pushAnim([pa, pb], view, color, tripped);
        continue;
      }

      const attach = ATTACH_Z[a.level];
      const supports: Array<{ x: number; y: number }> = [];
      {
        const c = this.tileCentre(endA.x, endA.y);
        supports.push({ x: c.x, y: c.y - END_Z });
      }
      if (map) {
        for (const i of a.pylons ?? []) {
          const c = this.tileCentre(i % map.width, Math.floor(i / map.width));
          supports.push({ x: c.x, y: c.y - attach });
        }
      }
      {
        const c = this.tileCentre(endB.x, endB.y);
        supports.push({ x: c.x, y: c.y - END_Z });
      }

      const strands = a.level === 33 ? [-3 * RES, 0, 3 * RES] : [0];
      const animPts: Array<{ x: number; y: number }> = [];
      for (const offset of strands) {
        const path: Array<{ x: number; y: number }> = [];
        for (let s = 0; s + 1 < supports.length; s++) {
          const p0 = supports[s];
          const p1 = supports[s + 1];
          if (!p0 || !p1) continue;
          const span = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const sag = Math.min(16 * RES, span * 0.07);
          const segs = Math.max(4, Math.min(12, Math.round(span / (28 * RES))));
          for (let k = s === 0 ? 0 : 1; k <= segs; k++) {
            const t = k / segs;
            path.push({
              x: p0.x + (p1.x - p0.x) * t + offset,
              y: p0.y + (p1.y - p0.y) * t + sag * 4 * t * (1 - t),
            });
          }
        }
        const w = a.level === 33 ? width * 0.7 : width;
        this.strokeSpan(path, w, color, tripped ? 0.8 : 0.95, tripped);
        if (offset === 0) animPts.push(...path);
      }
      this.pushAnim(animPts, view, color, tripped);
    }
  }

  private strokeSpan(
    pts: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
    dashed: boolean,
  ): void {
    if (pts.length < 2) return;
    const first = pts[0];
    if (!first) return;
    if (!dashed) {
      this.linesG.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p) this.linesG.lineTo(p.x, p.y);
      }
      this.linesG.stroke({ color: 0x0a0e22, width: width + 2.5 * RES, alpha: 0.45, cap: 'round', join: 'round' });
      this.linesG.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p) this.linesG.lineTo(p.x, p.y);
      }
      this.linesG.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    } else {
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        if (!p0 || !p1) continue;
        this.linesG.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y);
      }
      this.linesG.stroke({ color, width, alpha: 0.8, cap: 'round' });
    }
  }

  private pushAnim(
    pts: Array<{ x: number; y: number }>,
    view: BranchView | undefined,
    color: number,
    tripped: boolean,
  ): void {
    if (tripped || !view || pts.length < 2) return;
    const loading = Math.abs(view.flowMW) / Math.max(1e-6, view.ratingMW);
    if (Math.abs(view.flowMW) < 0.4) return;
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      cum.push((cum[i - 1] ?? 0) + (p0 && p1 ? Math.hypot(p1.x - p0.x, p1.y - p0.y) : 0));
    }
    const speed = (26 + 130 * Math.min(1, loading)) * RES * Math.sign(view.flowMW);
    this.lineAnims.push({ pts, cum, speed, color: tinge(color) });
  }

  private drawCoverage(coverage: Uint8Array): void {
    const map = this.map;
    if (!map) return;
    this.coverageG.clear();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cov = coverage[y * map.width + x] ?? COV.empty;
        if (cov === COV.empty || cov === COV.on) continue;
        this.diamond(this.coverageG, x, y, 1.0);
        if (cov === COV.unserved) {
          this.coverageG.fill({ color: 0x0a0e22, alpha: 0.5 });
        } else if (cov === COV.off) {
          this.coverageG.fill({ color: 0xe0697a, alpha: 0.4 });
        } else {
          this.coverageG.fill({ color: 0xf5c469, alpha: 0.28 });
        }
      }
    }
  }

  private diamond(g: Graphics, x: number, y: number, s: number): void {
    const c = this.tileCentre(x, y);
    g.poly([
      c.x, c.y - HALF_H * s,
      c.x + HALF_W * s, c.y,
      c.x, c.y + HALF_H * s,
      c.x - HALF_W * s, c.y,
    ]);
  }

  private tileCircle(g: Graphics, x: number, y: number, r: number): void {
    const pts: number[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const c = this.tileCentre(x + Math.cos(a) * r, y + Math.sin(a) * r);
      pts.push(c.x, c.y);
    }
    g.poly(pts);
  }

  private tileCentre(x: number, y: number): { x: number; y: number } {
    return { x: (x - y) * HALF_W, y: (x + y) * HALF_H };
  }

  private async buildTextures(): Promise<void> {
    const atlas = await getAtlas();
    const canvas = document.createElement('canvas');
    canvas.width = atlas.width;
    canvas.height = atlas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.putImageData(new ImageData(atlas.pixels, atlas.width, atlas.height), 0, 0);
    const base = Texture.from(canvas);
    base.source.scaleMode = 'linear';
    for (const [name, f] of atlas.frames) {
      this.textures.set(
        name,
        new Texture({ source: base.source, frame: new Rectangle(f.x, f.y, f.w, f.h) }),
      );
      this.frameSize.set(name, { w: f.w, h: f.h });
    }
  }

  private tileFromClient(map: CityMap, clientX: number, clientY: number): TileHover | undefined {
    const rect = this.app.canvas.getBoundingClientRect();
    const wx = (clientX - rect.left - this.world.x) / this.world.scale.x;
    const wy = (clientY - rect.top - this.world.y) / this.world.scale.y;
    const u = wx / HALF_W;
    const t = wy / HALF_H;
    const tx = Math.round((u + t) / 2);
    const ty = Math.round((t - u) / 2);
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      return { x: tx, y: ty, fx: (u + t) / 2, fy: (t - u) / 2 };
    }
    return undefined;
  }

  private attachInput(map: CityMap): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    const touches = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;

    canvas.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinchDist = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
        this.dragging = false;
        this.dragTravel = Number.POSITIVE_INFINITY;
      } else {
        this.dragging = true;
        this.dragTravel = 0;
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
      canvas.setPointerCapture(e.pointerId);
    });
    const release = (e: PointerEvent): void => {
      touches.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerup', (e) => {
      const wasPinching = touches.size >= 2;
      release(e);
      this.dragging = false;
      if (this.siteTapped) {
        // the tap landed on a contract pin — don't also click the tile
        this.siteTapped = false;
        return;
      }
      if (!wasPinching && this.dragTravel <= CLICK_SLOP_PX) {
        const tile = this.tileFromClient(map, e.clientX, e.clientY);
        if (tile) this.onTileClick?.(tile);
      }
    });
    canvas.addEventListener('pointercancel', (e) => {
      release(e);
      this.dragging = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        if (!a || !b) return;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (pinchDist > 0 && dist > 0) {
          const rect = canvas.getBoundingClientRect();
          const mx = (a.x + b.x) / 2 - rect.left;
          const my = (a.y + b.y) / 2 - rect.top;
          const old = this.world.scale.x;
          const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * (dist / pinchDist)));
          this.world.x = mx - ((mx - this.world.x) / old) * next;
          this.world.y = my - ((my - this.world.y) / old) * next;
          this.world.scale.set(next);
        }
        pinchDist = dist;
        return;
      }
      if (this.dragging) {
        this.world.x += e.clientX - this.lastPointer.x;
        this.world.y += e.clientY - this.lastPointer.y;
        this.dragTravel += Math.abs(e.clientX - this.lastPointer.x) + Math.abs(e.clientY - this.lastPointer.y);
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
      this.onHover?.(this.tileFromClient(map, e.clientX, e.clientY));
    });
    canvas.addEventListener('pointerleave', () => this.onHover?.(undefined));

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const old = this.world.scale.x;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        this.world.x = px - ((px - this.world.x) / old) * next;
        this.world.y = py - ((py - this.world.y) / old) * next;
        this.world.scale.set(next);
      },
      { passive: false },
    );
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) this.app.destroy(true);
  }
}

/** Chevrons ride brighter than the line they sit on. */
function tinge(color: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 70);
  const g = Math.min(255, ((color >> 8) & 0xff) + 70);
  const b = Math.min(255, (color & 0xff) + 70);
  return (r << 16) | (g << 8) | b;
}

// keep the suitability overlay honest about who lives where after growth
export { CUSTOMERS_PER_TILE };
export type { Zone };
