// Corner minimap (ROADMAP #26). A 256×160-tile licence area is too big to
// navigate by drag alone; this is the at-a-glance locator: a terrain wash
// (water / green-belt / built-up) pre-rendered ONCE to an offscreen
// canvas, the player's network strokes overlaid each second from the
// snapshot, and the live viewport rectangle read off the renderer. Click
// or drag anywhere on it to fly the main camera there.
//
// It is a plain DOM <canvas>, NOT a second PixiJS app (doctrine: keep it
// cheap). It reads the renderer through the registry for the viewport box
// + panTo; everything else comes from the snapshot + the shared map.

import { useEffect, useRef } from 'react';
import { getLondonMap } from '../data/londonMap';
import { getActiveRenderer } from '../render/rendererRegistry';
import { useAppStore } from '../app/store';
import { TERRAIN, ZONE } from '../sim/map/types';
import { levelPalette } from './cbPalette';
import { headingStyle, panelStyle, theme } from './theme';
import { IconBolt } from './icons';

const MAP_W = 256;
const MAP_H = 160;
// minimap pixel size — a top-down (non-iso) wash; the licence area is wide
// so we keep the same 256:160 aspect.
const VIEW_W = 168;
const VIEW_H = Math.round((VIEW_W * MAP_H) / MAP_W);

/** Pre-render the static terrain wash to a small offscreen canvas, sized
 *  to the real map. Cached across mounts (the map is immutable). */
let terrainCanvas: HTMLCanvasElement | undefined;
function terrainWash(): HTMLCanvasElement | undefined {
  if (terrainCanvas) return terrainCanvas;
  const map = getLondonMap();
  const c = document.createElement('canvas');
  c.width = map.width;
  c.height = map.height;
  const ctx = c.getContext('2d');
  if (!ctx) return undefined;
  const img = ctx.createImageData(map.width, map.height);
  for (let i = 0; i < map.width * map.height; i++) {
    const ter = map.terrain[i] ?? TERRAIN.land;
    const zone = map.zone[i] ?? ZONE.none;
    let r: number, g: number, b: number;
    if (ter === TERRAIN.water) {
      [r, g, b] = [0x2c, 0x40, 0x6e]; // dusk water navy
    } else if (
      zone === ZONE.urbanCore ||
      zone === ZONE.urban ||
      zone === ZONE.cbd ||
      zone === ZONE.industrial ||
      zone === ZONE.newEstate
    ) {
      [r, g, b] = [0x6b, 0x5f, 0x7a]; // built-up dusty mauve
    } else if (zone === ZONE.suburb || zone === ZONE.posh) {
      [r, g, b] = [0x5c, 0x66, 0x6a]; // leafy suburb
    } else {
      [r, g, b] = [0x3c, 0x4a, 0x3a]; // green-belt / open land
    }
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  terrainCanvas = c;
  return c;
}

export function Minimap({ frame }: { frame?: React.CSSProperties } = {}) {
  const open = useAppStore((s) => s.minimapOpen);
  const setOpen = useAppStore((s) => s.setMinimapOpen);
  const requestPan = useAppStore((s) => s.requestPan);
  const cbMode = useAppStore((s) => s.cbMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // animation loop: redraw the wash + network + viewport box each frame.
  // Cheap — a few hundred line segments at 168px. Reads the live snapshot
  // and renderer directly (no React churn).
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const wash = terrainWash();
    let raf = 0;
    const sx = VIEW_W / MAP_W;
    const sy = VIEW_H / MAP_H;
    const draw = (): void => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      if (wash) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(wash, 0, 0, VIEW_W, VIEW_H);
      } else {
        ctx.fillStyle = '#1a2238';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      const snap = useAppStore.getState().snapshot;
      const lv = levelPalette(cbMode);
      const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
      if (snap) {
        const byId = new Map(snap.assets.map((a) => [a.id, a]));
        // network lines, thickest for 400 kV
        for (const a of snap.assets) {
          if (a.kind !== 'line') continue;
          const ea = byId.get(a.a);
          const eb = byId.get(a.b);
          if (!ea || ea.kind === 'line' || !eb || eb.kind === 'line') continue;
          ctx.strokeStyle = hex(lv[a.level as 400 | 132 | 33] ?? lv[33]);
          ctx.lineWidth = a.level === 400 ? 1.6 : a.level === 132 ? 1.1 : 0.7;
          ctx.beginPath();
          ctx.moveTo(ea.x * sx, ea.y * sy);
          ctx.lineTo(eb.x * sx, eb.y * sy);
          ctx.stroke();
        }
        // substations + generators as pips (gen = orange, sub = cream)
        for (const a of snap.assets) {
          if (a.kind === 'line') continue;
          ctx.fillStyle = a.kind === 'gen' ? theme.orange : theme.offWhite;
          const r = a.kind === 'gen' ? 1.7 : 1.2;
          ctx.beginPath();
          ctx.arc(a.x * sx, a.y * sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // the live viewport rectangle
      const r = getActiveRenderer()?.getMinimapView();
      if (r && r.width === MAP_W) {
        ctx.strokeStyle = theme.gold;
        ctx.lineWidth = 1.4;
        const x0 = r.view.x0 * sx;
        const y0 = r.view.y0 * sy;
        const w = (r.view.x1 - r.view.x0) * sx;
        const h = (r.view.y1 - r.view.y0) * sy;
        ctx.strokeRect(x0, y0, Math.max(2, w), Math.max(2, h));
        ctx.fillStyle = 'rgba(245, 196, 105, 0.10)';
        ctx.fillRect(x0, y0, Math.max(2, w), Math.max(2, h));
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open, cbMode]);

  // click / drag to pan: convert the minimap pixel back to a tile target
  const panFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const py = ((e.clientY - rect.top) / rect.height) * MAP_H;
    requestPan(
      Math.max(0, Math.min(MAP_W - 1, px)),
      Math.max(0, Math.min(MAP_H - 1, py)),
    );
  };
  const draggingRef = useRef(false);

  if (!open) {
    return (
      <button
        aria-label="open minimap"
        onClick={() => setOpen(true)}
        title="Open the minimap"
        style={{
          ...panelStyle,
          position: 'absolute',
          // bottom-LEFT so the map overlay never sits on the bill/finance
          // stack on the right rail (owner playtest: "map overlay interrupts
          // the finance/cost bill panel")
          bottom: 12,
          left: 12,
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          cursor: 'pointer',
          ...frame,
        }}
      >
        <IconBolt size={13} />
        map
      </button>
    );
  }

  return (
    <div
      data-tour="minimap"
      style={{
        ...panelStyle,
        position: 'absolute',
        // bottom-LEFT, clear of the right-rail finance stack (see above)
        bottom: 12,
        left: 12,
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        ...frame,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={headingStyle}>licence area</span>
        <button
          aria-label="collapse minimap"
          onClick={() => setOpen(false)}
          title="Collapse the minimap"
          style={{
            border: 'none',
            background: 'transparent',
            color: theme.slate,
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          panFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) panFromEvent(e);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        style={{
          width: VIEW_W,
          height: VIEW_H,
          borderRadius: 5,
          cursor: 'crosshair',
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
