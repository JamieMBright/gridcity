// PixiJS map renderer: draws the city from the sprite atlas in 16x16-tile
// chunks (each cached to a texture), with drag-pan and wheel-zoom in crisp
// nearest-neighbour pixels. Dynamic layers (network, vans, overlays) will
// stack above the static world container in later milestones.

import { Application, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { CityMap } from '../sim/map/types';
import { buildAtlas } from './sprites/atlas';
import { TILE } from './sprites/spriteBuilder';
import { spriteNameFor } from './tileChooser';

const CHUNK = 16; // tiles per chunk side
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 4;

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
  private moved = 0;

  onHover: ((tile: TileHover | undefined) => void) | undefined;

  async init(host: HTMLElement, map: CityMap): Promise<void> {
    await this.app.init({
      background: '#0a0e22',
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

    // start framed on the city core
    const scale = 0.9;
    this.world.scale.set(scale);
    this.world.position.set(
      this.app.screen.width / 2 - 50 * TILE * scale,
      this.app.screen.height / 2 - 62 * TILE * scale,
    );

    this.attachInput(map);
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
    base.source.scaleMode = 'nearest';
    for (const [name, { x, y }] of atlas.frames) {
      this.textures.set(
        name,
        new Texture({ source: base.source, frame: new Rectangle(x, y, TILE, TILE) }),
      );
    }
  }

  private buildWorld(map: CityMap): void {
    for (let cy = 0; cy < map.height; cy += CHUNK) {
      for (let cx = 0; cx < map.width; cx += CHUNK) {
        const chunk = new Container();
        chunk.position.set(cx * TILE, cy * TILE);
        for (let y = cy; y < Math.min(cy + CHUNK, map.height); y++) {
          for (let x = cx; x < Math.min(cx + CHUNK, map.width); x++) {
            const tex = this.textures.get(spriteNameFor(map, x, y));
            if (!tex) continue;
            const s = new Sprite(tex);
            s.position.set((x - cx) * TILE, (y - cy) * TILE);
            chunk.addChild(s);
          }
        }
        chunk.cacheAsTexture(true);
        this.world.addChild(chunk);
      }
    }
  }

  private attachInput(map: CityMap): void {
    const canvas = this.app.canvas;

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.moved = 0;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => {
      this.dragging = false;
      canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.dragging) {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        this.moved += Math.abs(dx) + Math.abs(dy);
        this.world.x += dx;
        this.world.y += dy;
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
      const rect = canvas.getBoundingClientRect();
      const wx = (e.clientX - rect.left - this.world.x) / this.world.scale.x;
      const wy = (e.clientY - rect.top - this.world.y) / this.world.scale.y;
      const tx = Math.floor(wx / TILE);
      const ty = Math.floor(wy / TILE);
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
        // zoom about the cursor
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
