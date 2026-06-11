// PixiJS isometric map renderer. The static city is drawn once in painter
// order; dynamic layers stack above it: coverage shading (who has power),
// network lines, the player's assets, and build ghosts. Grid view applies
// a desaturating filter to the city so the electrical network — kept
// unfiltered — pops in full colour.
//
// World space: tile (x, y) has its floor-diamond centre at
// ((x − y) · CELL_W/2, (x + y) · FLOOR_H/2).

import {
  Application,
  ColorMatrixFilter,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';
import type { PlacedAsset } from '../sim/assets';
import type { VoltageLevel } from '../sim/grid/types';
import type { CityMap } from '../sim/map/types';
import { COV, type BranchView } from '../sim/tick';
import { buildAtlas } from './sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H } from './sprites/iso';
import { spriteNameFor } from './tileChooser';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3;
const CLICK_SLOP_PX = 6;

export const LEVEL_COLOR: Record<VoltageLevel, number> = {
  400: 0x5ea3ff,
  132: 0x7bc47f,
  33: 0xffb066,
};
const OVERLOAD_COLOR = 0xe0697a;
const LEVEL_WIDTH: Record<VoltageLevel, number> = { 400: 7, 132: 5, 33: 3.5 };

const GEN_SPRITE: Record<string, string> = {
  gasCCGT: 'gen_gas',
  nuclear: 'gen_nuclear',
  solarFarm: 'gen_solar',
  windOnshore: 'gen_windon',
  windOffshore: 'gen_windoff',
  battery: 'gen_battery',
};
const SUB_SPRITE: Record<string, string> = {
  bulk: 'sub_bulk',
  grid: 'sub_grid',
  dist: 'sub_dist',
};

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
  | { kind: 'line'; ax: number; ay: number; bx: number; by: number; ok: boolean; level: VoltageLevel }
  | { kind: 'endpoint'; x: number; y: number; level: VoltageLevel };

export class MapRenderer {
  private app = new Application();
  private world = new Container();
  private city = new Container();
  private coverageG = new Graphics();
  private linesG = new Graphics();
  private assetLayer = new Container();
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
  private map: CityMap | undefined;

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

    this.cityFilter.desaturate();
    this.cityFilter.brightness(0.62, true);

    this.assetLayer.sortableChildren = true;
    this.world.addChild(this.city);
    this.world.addChild(this.coverageG);
    this.world.addChild(this.linesG);
    this.world.addChild(this.assetLayer);
    this.world.addChild(this.ghostG);
    this.app.stage.addChild(this.world);

    // frame the city core on boot
    const scale = 0.5;
    const focus = this.tileCentre(50, 62);
    this.world.scale.set(scale);
    this.world.position.set(
      this.app.screen.width / 2 - focus.x * scale,
      this.app.screen.height / 2 - focus.y * scale,
    );

    this.attachInput(map);
  }

  /** Grid view: monochrome city, full-colour electrical network. */
  setGridView(on: boolean): void {
    this.city.filters = on ? [this.cityFilter] : [];
  }

  /** Refresh all dynamic layers from the latest sim snapshot. */
  updateDynamic(assets: PlacedAsset[], branches: BranchView[], coverage: Uint8Array): void {
    if (!this.map) return;
    const byId = new Map<number, PlacedAsset>();
    for (const a of assets) byId.set(a.id, a);

    const sig = assets.map((a) => `${a.id}:${a.kind}`).join(',');
    if (sig !== this.assetSignature) {
      this.assetSignature = sig;
      this.rebuildAssetSprites(assets);
    }

    this.drawLines(assets, branches, byId);

    let hash = coverage.length;
    for (let i = 0; i < coverage.length; i++) hash = (hash * 31 + (coverage[i] ?? 0)) >>> 0;
    if (hash !== this.coverageHash) {
      this.coverageHash = hash;
      this.drawCoverage(coverage);
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
      this.ghostG.stroke({ color: ok ? 0x7bc47f : 0xe0697a, width: 2, alpha: 0.9 });
      if (ghost.radius !== undefined && ok) {
        this.tileCircle(this.ghostG, ghost.x, ghost.y, ghost.radius);
        this.ghostG.stroke({ color: 0xffb066, width: 2, alpha: 0.55 });
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
      this.ghostG.moveTo(a.x, a.y - 8).lineTo(b.x, b.y - 8);
      this.ghostG.stroke({ color, width: LEVEL_WIDTH[ghost.level], alpha: 0.55 });
      this.diamond(this.ghostG, ghost.bx, ghost.by, 0.7);
      this.ghostG.stroke({ color, width: 2, alpha: 0.8 });
    } else {
      this.diamond(this.ghostG, ghost.x, ghost.y, 0.8);
      this.ghostG.stroke({ color: LEVEL_COLOR[ghost.level], width: 3, alpha: 1 });
    }
  }

  private rebuildAssetSprites(assets: PlacedAsset[]): void {
    this.assetLayer.removeChildren().forEach((c) => c.destroy());
    for (const a of assets) {
      if (a.kind === 'line') continue;
      const name = a.kind === 'gen' ? GEN_SPRITE[a.gen] : SUB_SPRITE[a.sub];
      const tex = name ? this.textures.get(name) : undefined;
      if (!tex) continue;
      const s = new Sprite(tex);
      const c = this.tileCentre(a.x, a.y);
      s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
      s.zIndex = a.x + a.y;
      this.assetLayer.addChild(s);
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
    for (const a of assets) {
      if (a.kind !== 'line') continue;
      const endA = byId.get(a.a);
      const endB = byId.get(a.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') continue;
      const pa = this.tileCentre(endA.x, endA.y);
      const pb = this.tileCentre(endB.x, endB.y);
      const view = flowOf.get(a.id);
      const tripped = view?.outMin !== undefined;
      const loading = view ? Math.abs(view.flowMW) / Math.max(1e-6, view.ratingMW) : 0;
      const color = tripped ? 0x4c4a5c : loading > 0.9 ? OVERLOAD_COLOR : LEVEL_COLOR[a.level];
      const lift = a.build === 'underground' ? 0 : 8;
      // dark casing first for contrast against the city
      this.linesG.moveTo(pa.x, pa.y - lift).lineTo(pb.x, pb.y - lift);
      this.linesG.stroke({ color: 0x0a0e22, width: LEVEL_WIDTH[a.level] + 2.5, alpha: 0.55, cap: 'round' });
      if (tripped) {
        // dashed: out of service
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const len = Math.hypot(dx, dy);
        const n = Math.max(1, Math.floor(len / 18));
        for (let i = 0; i < n; i++) {
          const t0 = i / n;
          const t1 = t0 + 0.55 / n;
          this.linesG
            .moveTo(pa.x + dx * t0, pa.y + dy * t0 - lift)
            .lineTo(pa.x + dx * t1, pa.y + dy * t1 - lift);
        }
        this.linesG.stroke({ color, width: LEVEL_WIDTH[a.level], alpha: 0.8, cap: 'round' });
      } else {
        this.linesG.moveTo(pa.x, pa.y - lift).lineTo(pb.x, pb.y - lift);
        this.linesG.stroke({
          color,
          width: LEVEL_WIDTH[a.level],
          alpha: a.build === 'underground' ? 0.55 : 0.95,
          cap: 'round',
        });
      }
    }
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

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dragTravel = 0;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => {
      this.dragging = false;
      canvas.releasePointerCapture(e.pointerId);
      if (this.dragTravel <= CLICK_SLOP_PX) {
        const tile = this.tileFromClient(map, e.clientX, e.clientY);
        if (tile) this.onTileClick?.(tile);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
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
