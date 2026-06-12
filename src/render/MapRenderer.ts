// PixiJS isometric map renderer. The static city is drawn once in painter
// order; dynamic layers stack above it: live traffic, coverage shading
// (who has power), the suitability overlay, network lines sagging from
// pylon to pylon, the player's assets, and build ghosts. A ticker drives
// the living world: cars wander the roads, turbine rotors spin with the
// wind, chevrons ride the lines in the direction of power flow, and
// freshly energised streets flash awake. Grid view applies a desaturating
// filter to the city so the electrical network — kept unfiltered — pops
// in full colour.
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
  Texture,
} from 'pixi.js';
import type { PlacedAsset } from '../sim/assets';
import { GENS } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import { TERRAIN, type CityMap } from '../sim/map/types';
import { COV, type BranchView } from '../sim/tick';
import { buildAtlas } from './sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H, RES } from './sprites/iso';
import { WIND_HUBS, windHubOffset } from './sprites/networkSprites';
import { spriteNameFor } from './tileChooser';

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
/** Conductor attachment height above the support tile, world px. */
const ATTACH_Z: Record<VoltageLevel, number> = { 400: 80 * RES, 132: 54 * RES, 33: 30 * RES };
const END_Z = 18 * RES; // landing height on substations/plants
const PYLON_SPRITE: Record<VoltageLevel, string> = {
  400: 'pylon_400',
  132: 'pylon_132',
  33: 'pole_33',
};

const GEN_SPRITE: Record<string, string> = {
  gasCCGT: 'gen_gas',
  gasPeaker: 'gen_peaker',
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

const CAR_COLORS = [0xf4f1ea, 0x27324d, 0xc9453a, 0x5e8fc2, 0xe8a23f, 0x9aa4b5, 0x3f8f8a];
const TAXI = 0x27324d;

export interface VanView {
  id: number;
  x: number;
  y: number;
  busy: boolean;
}

export interface JobView {
  x: number;
  y: number;
  staffed: boolean;
}

export interface TileHover {
  x: number;
  y: number;
}

export type Ghost =
  | {
      kind: 'tile';
      x: number;
      y: number;
      ok: boolean;
      sprite?: string | undefined;
      radius?: number | undefined;
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
    }
  | { kind: 'endpoint'; x: number; y: number; level: VoltageLevel };

interface LineAnim {
  /** Polyline in world px, ordered endA → endB. */
  pts: Array<{ x: number; y: number }>;
  /** Cumulative length per point, px. */
  cum: number[];
  /** Chevron speed, px/s (signed: negative runs b → a). */
  speed: number;
  color: number;
}

interface Car {
  /** Current and next road tile indices. */
  cur: number;
  next: number;
  prev: number;
  /** Progress 0..1 along cur → next. */
  t: number;
  /** Tiles per second. */
  speed: number;
  g: Graphics;
}

interface Pulse {
  x: number;
  y: number;
  age: number;
}

interface Rotor {
  assetId: number;
  g: Graphics;
}

export class MapRenderer {
  private app = new Application();
  private world = new Container();
  private city = new Container();
  private carLayer = new Container();
  private coverageG = new Graphics();
  private suitability: Sprite | undefined;
  private smogG = new Graphics();
  private assetLayer = new Container();
  private linesG = new Graphics();
  private flowG = new Graphics();
  private pulseG = new Graphics();
  private fleetLayer = new Container();
  private jobsG = new Graphics();
  private vanSprites = new Map<number, Sprite>();
  private ghostG = new Graphics();
  private ghostSprite: Sprite | undefined;
  private textures = new Map<string, Texture>();
  private destroyed = false;
  private dragging = false;
  private dragTravel = 0;
  private lastPointer = { x: 0, y: 0 };
  private cityFilter = new ColorMatrixFilter();
  private assetSignature = '';
  private coverageHash = 0;
  private prevCoverage: Uint8Array | undefined;
  private map: CityMap | undefined;

  // living-world state
  private cars: Car[] = [];
  private roadNeighbors = new Map<number, number[]>();
  private lineAnims: LineAnim[] = [];
  private pulses: Pulse[] = [];
  private rotors: Rotor[] = [];
  private windNow = 0.5;
  private flowPhase = 0;

  onHover: ((tile: TileHover | undefined) => void) | undefined;
  onTileClick: ((tile: TileHover) => void) | undefined;

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

    this.buildTextures();
    this.buildCity(map);
    this.buildRoadGraph(map);
    this.spawnCars(map);

    this.cityFilter.desaturate();
    this.cityFilter.brightness(0.62, true);

    this.assetLayer.sortableChildren = true;
    this.world.addChild(this.city);
    this.world.addChild(this.carLayer);
    this.world.addChild(this.coverageG);
    this.world.addChild(this.smogG);
    this.world.addChild(this.assetLayer);
    this.world.addChild(this.linesG);
    this.world.addChild(this.flowG);
    this.world.addChild(this.pulseG);
    this.world.addChild(this.jobsG);
    this.world.addChild(this.fleetLayer);
    this.world.addChild(this.ghostG);
    this.app.stage.addChild(this.world);

    // frame the city core on boot
    const scale = 0.5 / RES;
    const focus = this.tileCentre(66, 80);
    this.world.scale.set(scale);
    this.world.position.set(
      this.app.screen.width / 2 - focus.x * scale,
      this.app.screen.height / 2 - focus.y * scale,
    );

    this.attachInput(map);
    this.app.ticker.add(() => this.animate(this.app.ticker.deltaMS / 1000));
  }

  /** Grid view: monochrome city, full-colour electrical network. */
  setGridView(on: boolean): void {
    this.city.filters = on ? [this.cityFilter] : [];
    this.carLayer.visible = !on;
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
    // the iso ground plane is a linear image of the tile grid: one sprite
    // under a shear matrix paints all 40k diamonds at once
    sprite.setFromMatrix(new Matrix(HALF_W, HALF_H, -HALF_W, HALF_H, 0, -HALF_H));
    this.world.addChildAt(sprite, this.world.getChildIndex(this.smogG));
    this.suitability = sprite;
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
  ): void {
    if (!this.map) return;
    this.windNow = wind;
    const byId = new Map<number, PlacedAsset>();
    for (const a of assets) byId.set(a.id, a);
    const mwOf = new Map(genMW);

    const sig = assets
      .map((a) => `${a.id}:${a.kind}:${a.kind === 'gen' && (a.liveAtMin ?? 0) > simTimeMin ? 'c' : ''}`)
      .join(',');
    if (sig !== this.assetSignature) {
      this.assetSignature = sig;
      this.rebuildAssetSprites(assets, simTimeMin);
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

  /** Zoom about the screen centre (dev hook / tests). */
  setZoom(scale: number): void {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    const old = this.world.scale.x;
    this.world.x = cx - ((cx - this.world.x) / old) * next;
    this.world.y = cy - ((cy - this.world.y) / old) * next;
    this.world.scale.set(next);
  }

  /** Centre the camera on a tile (alert click-to-jump). */
  panTo(x: number, y: number): void {
    const c = this.tileCentre(x, y);
    const s = this.world.scale.x;
    this.world.position.set(
      this.app.screen.width / 2 - c.x * s,
      this.app.screen.height / 2 - c.y * s,
    );
  }

  /** Client (screen) coordinates of a tile centre — used by e2e tests to
   *  drive real canvas clicks. */
  tileToScreen(x: number, y: number): { x: number; y: number } {
    const c = this.tileCentre(x, y);
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: rect.left + c.x * this.world.scale.x + this.world.x,
      y: rect.top + c.y * this.world.scale.y + this.world.y,
    };
  }

  // --- the living world -----------------------------------------------------

  private animate(dt: number): void {
    if (this.destroyed || !this.map) return;
    this.stepCars(dt);
    this.stepRotors(dt);
    this.stepFlow(dt);
    this.stepPulses(dt);
  }

  private buildRoadGraph(map: CityMap): void {
    const { width, height, road } = map;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (road[i] !== 1) continue;
        const nbs: number[] = [];
        if (y > 0 && road[i - width] === 1) nbs.push(i - width);
        if (x < width - 1 && road[i + 1] === 1) nbs.push(i + 1);
        if (y < height - 1 && road[i + width] === 1) nbs.push(i + width);
        if (x > 0 && road[i - 1] === 1) nbs.push(i - 1);
        if (nbs.length > 0) this.roadNeighbors.set(i, nbs);
      }
    }
  }

  private spawnCars(map: CityMap): void {
    const tiles = [...this.roadNeighbors.keys()];
    if (tiles.length === 0) return;
    const count = Math.min(280, Math.floor(tiles.length / 15));
    let seed = 0x5eed;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let k = 0; k < count; k++) {
      const cur = tiles[Math.floor(rnd() * tiles.length)] ?? tiles[0] ?? 0;
      const nbs = this.roadNeighbors.get(cur) ?? [];
      const next = nbs[Math.floor(rnd() * nbs.length)] ?? cur;
      const g = new Graphics();
      const isTaxi = rnd() < 0.12;
      const body = isTaxi ? 0xffd277 : CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)] ?? 0xf4f1ea;
      const L = 7 * RES;
      const W2 = 4 * RES;
      g.roundRect(-L / 2, -W2 / 2, L, W2, 1.5 * RES).fill(body);
      g.roundRect(-L * 0.18, -W2 * 0.34, L * 0.42, W2 * 0.68, RES).fill(
        isTaxi ? TAXI : 0x27324d,
      );
      this.carLayer.addChild(g);
      this.cars.push({ cur, next, prev: cur, t: rnd(), speed: 0.55 + rnd() * 0.5, g });
      void map;
    }
  }

  private stepCars(dt: number): void {
    const map = this.map;
    if (!map || this.cars.length === 0 || !this.carLayer.visible) return;
    const w = map.width;
    for (const car of this.cars) {
      car.t += dt * car.speed;
      while (car.t >= 1) {
        car.t -= 1;
        const arrived = car.next;
        const nbs = this.roadNeighbors.get(arrived) ?? [];
        let pick = arrived;
        if (nbs.length === 1) {
          pick = nbs[0] ?? arrived;
        } else if (nbs.length > 1) {
          // avoid U-turns at junctions
          const options = nbs.filter((n) => n !== car.cur);
          pick = options[Math.floor(Math.random() * options.length)] ?? nbs[0] ?? arrived;
        }
        car.prev = car.cur;
        car.cur = arrived;
        car.next = pick;
      }
      const ax = car.cur % w;
      const ay = Math.floor(car.cur / w);
      const bx = car.next % w;
      const by = Math.floor(car.next / w);
      const a = this.tileCentre(ax, ay);
      const b = this.tileCentre(bx, by);
      const dirX = b.x - a.x;
      const dirY = b.y - a.y;
      const len = Math.hypot(dirX, dirY) || 1;
      // keep left: offset to the left of travel, like home
      const lane = 6 * RES;
      const ox = (dirY / len) * lane * -1;
      const oy = (dirX / len) * lane;
      const lift = map.terrain[car.cur] === TERRAIN.water ? 10 * RES : 0; // bridges
      car.g.position.set(a.x + dirX * car.t + ox, a.y + dirY * car.t + oy - lift);
      if (dirX !== 0 || dirY !== 0) car.g.rotation = Math.atan2(dirY, dirX);
    }
  }

  private stepRotors(dt: number): void {
    if (this.rotors.length === 0) return;
    for (const r of this.rotors) {
      r.g.rotation += dt * (r.g.visible ? (0.6 + 2.6 * this.windNow) * ((r.g as RotorG).spin ?? 1) : 0);
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
        // locate segment
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
        // chevron pointing along flow
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
      if (now === COV.on && (was === COV.unserved || was === COV.off) ) {
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
      // turning speed follows actual dispatch; idles slowly when parked
      (r.g as RotorG).spin = out > 0 ? 0.5 + (out / cap) * 1.2 : 0.12;
    }
  }

  // --- dynamic layers ---------------------------------------------------------

  private drawFleet(vans: VanView[], jobs: JobView[]): void {
    this.jobsG.clear();
    for (const j of jobs) {
      this.diamond(this.jobsG, j.x, j.y, 0.9);
      this.jobsG.stroke({ color: j.staffed ? 0xffb066 : 0xe0697a, width: 3 * RES, alpha: 0.9 });
      const c = this.tileCentre(j.x, j.y);
      this.jobsG.moveTo(c.x, c.y - 26 * RES).lineTo(c.x, c.y - 8 * RES);
      this.jobsG.stroke({ color: 0xe0697a, width: 4 * RES, alpha: 0.9 });
      this.jobsG.circle(c.x, c.y - 32 * RES, 4 * RES).fill({ color: 0xe0697a, alpha: 0.95 });
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

  /** Soft smog blobs around running thermal plant. */
  private drawSmog(assets: PlacedAsset[], mwOf: Map<number, number>): void {
    this.smogG.clear();
    for (const a of assets) {
      if (a.kind !== 'gen' || (a.gen !== 'gasCCGT' && a.gen !== 'gasPeaker' && a.gen !== 'biomass'))
        continue;
      const out = mwOf.get(a.id) ?? 0;
      if (out <= 0) continue;
      const c = this.tileCentre(a.x, a.y);
      const cap = GENS[a.gen].capacityMW;
      const r = (5 + 6 * Math.min(1, out / cap)) * (a.gen === 'gasCCGT' ? 1 : 0.55);
      for (const [mul, alpha] of [
        [1.6, 0.05],
        [1.0, 0.08],
        [0.55, 0.1],
      ] as const) {
        this.smogG
          .ellipse(c.x + 14 * RES, c.y - 10 * RES, r * mul * HALF_W * 0.5, r * mul * HALF_H * 0.5)
          .fill({ color: 0x6a6276, alpha });
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
      this.diamond(this.ghostG, ghost.x, ghost.y, 1.0);
      this.ghostG.fill({ color: ok ? 0x7bc47f : 0xe0697a, alpha: 0.3 });
      this.diamond(this.ghostG, ghost.x, ghost.y, 1.0);
      this.ghostG.stroke({ color: ok ? 0x7bc47f : 0xe0697a, width: 2 * RES, alpha: 0.9 });
      if (ghost.radius !== undefined && ok) {
        this.tileCircle(this.ghostG, ghost.x, ghost.y, ghost.radius);
        this.ghostG.stroke({ color: 0xffb066, width: 2 * RES, alpha: 0.55 });
      }
      if (ghost.sprite && ok) {
        const tex = this.textures.get(ghost.sprite);
        if (tex) {
          const s = new Sprite(tex);
          const c = this.tileCentre(ghost.x, ghost.y);
          s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
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
      // preview where the supports will stand
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
    for (const a of assets) {
      if (a.kind === 'line') {
        // the line's supports: pylons or poles standing along the route
        const map = this.map;
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
            ? SUB_SPRITE[a.sub]
            : 'depot';
      const tex = name ? this.textures.get(name) : undefined;
      if (!tex) continue;
      const s = new Sprite(tex);
      const c = this.tileCentre(a.x, a.y);
      s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
      s.zIndex = a.x + a.y;
      this.assetLayer.addChild(s);

      // live rotors on commissioned turbines
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
          rotor.scale.y = 0.92; // squash into the iso plane
          rotor.zIndex = a.x + a.y + 0.1;
          rotor.spin = 1;
          this.assetLayer.addChild(rotor);
          this.rotors.push({ assetId: a.id, g: rotor });
        }
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
      const color = tripped ? 0x4c4a5c : loading > 0.9 ? OVERLOAD_COLOR : LEVEL_COLOR[a.level];
      const width = LEVEL_WIDTH[a.level];

      if (a.build === 'underground') {
        const pa = this.tileCentre(endA.x, endA.y);
        const pb = this.tileCentre(endB.x, endB.y);
        this.strokeSpan([pa, pb], width, color, 0.5, tripped);
        this.pushAnim([pa, pb], view, color, tripped);
        continue;
      }

      // overhead: hop support to support with catenary sag
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

      // 33 kV runs three-phase: a visible triple conductor on the crossarm
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

  /** Stroke a polyline with the dark casing underneath for contrast. */
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
      // dashed: out of service
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
          this.coverageG.fill({ color: 0x0a0e22, alpha: 0.5 }); // dark, cold, waiting
        } else if (cov === COV.off) {
          this.coverageG.fill({ color: 0xe0697a, alpha: 0.4 }); // blacked out
        } else {
          this.coverageG.fill({ color: 0xf5c469, alpha: 0.28 }); // brownout
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

  /** Tile-space circle (e.g. service radius) projected to the iso plane. */
  private tileCircle(g: Graphics, x: number, y: number, r: number): void {
    const pts: number[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const tx = x + Math.cos(a) * r;
      const ty = y + Math.sin(a) * r;
      const c = this.tileCentre(tx, ty);
      pts.push(c.x, c.y);
    }
    g.poly(pts);
  }

  private tileCentre(x: number, y: number): { x: number; y: number } {
    return { x: (x - y) * HALF_W, y: (x + y) * HALF_H };
  }

  private buildTextures(): void {
    const atlas = buildAtlas();
    const canvas = document.createElement('canvas');
    canvas.width = atlas.width;
    canvas.height = atlas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.putImageData(new ImageData(atlas.pixels, atlas.width, atlas.height), 0, 0);
    const base = Texture.from(canvas);
    base.source.scaleMode = 'linear';
    for (const [name, { x, y }] of atlas.frames) {
      this.textures.set(
        name,
        new Texture({ source: base.source, frame: new Rectangle(x, y, CELL_W, CELL_H) }),
      );
    }
  }

  private buildCity(map: CityMap): void {
    // painter order: back-to-front along x+y diagonals
    for (let k = 0; k <= map.width + map.height - 2; k++) {
      const xStart = Math.max(0, k - map.height + 1);
      const xEnd = Math.min(map.width - 1, k);
      for (let x = xStart; x <= xEnd; x++) {
        const y = k - x;
        const tex = this.textures.get(spriteNameFor(map, x, y));
        if (!tex) continue;
        const s = new Sprite(tex);
        const c = this.tileCentre(x, y);
        s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
        this.city.addChild(s);
      }
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
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) return { x: tx, y: ty };
    return undefined;
  }

  private attachInput(map: CityMap): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none'; // we own pan + pinch
    const touches = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;

    canvas.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinchDist = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
        this.dragging = false;
        this.dragTravel = Number.POSITIVE_INFINITY; // a pinch is never a click
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
        // pinch: zoom about the midpoint, panning with it
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

interface RotorG extends Graphics {
  spin?: number;
}

/** Chevrons ride brighter than the line they sit on. */
function tinge(color: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 70);
  const g = Math.min(255, ((color >> 8) & 0xff) + 70);
  const b = Math.min(255, (color & 0xff) + 70);
  return (r << 16) | (g << 8) | b;
}
