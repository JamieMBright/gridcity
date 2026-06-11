// PixiJS isometric map renderer. Tiles are drawn back-to-front (painter
// order along x+y diagonals) so buildings overlap correctly; drag-pan and
// cursor-anchored wheel zoom. Dynamic layers (network, vans, overlays)
// will stack above the static world container in later milestones.
//
// World space: tile (x, y) has its floor-diamond centre at
// ((x − y) · CELL_W/2, (x + y) · FLOOR_H/2).

import { Application, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { CityMap } from '../sim/map/types';
import { buildAtlas } from './sprites/atlas';
import { CELL_H, CELL_W, FLOOR_H } from './sprites/iso';
import { spriteNameFor } from './tileChooser';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3;

export interface TileHover {
  x: number;
  y: number;
}

export class MapRenderer {
  private app = new Application();
  private world = new Container();
  private textures = new Map<string, Texture>();
  private destroyed = false;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  onHover: ((tile: TileHover | undefined) => void) | undefined;

  async init(host: HTMLElement, map: CityMap): Promise<void> {
    await this.app.init({
      background: '#1b1430',
      resizeTo: host,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    host.appendChild(this.app.canvas);

    this.buildTextures();
    this.buildWorld(map);
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

  private buildWorld(map: CityMap): void {
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
        this.world.addChild(s);
      }
    }
  }

  private attachInput(map: CityMap): void {
    const canvas = this.app.canvas;

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => {
      this.dragging = false;
      canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.dragging) {
        this.world.x += e.clientX - this.lastPointer.x;
        this.world.y += e.clientY - this.lastPointer.y;
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
      const rect = canvas.getBoundingClientRect();
      const wx = (e.clientX - rect.left - this.world.x) / this.world.scale.x;
      const wy = (e.clientY - rect.top - this.world.y) / this.world.scale.y;
      // invert the iso projection (diamond centres tile the (u,t) lattice)
      const u = wx / HALF_W;
      const t = wy / HALF_H;
      const tx = Math.round((u + t) / 2);
      const ty = Math.round((t - u) / 2);
      if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
        this.onHover?.({ x: tx, y: ty });
      } else {
        this.onHover?.(undefined);
      }
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
