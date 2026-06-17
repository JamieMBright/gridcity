// Dev-only hook that exposes just enough surface for Playwright to drive
// the real canvas: tile→screen projection, camera jumps, store access and
// land-finding. Never installed in production builds.

import { getLondonMap } from '../data/londonMap';
import type { MapRenderer } from '../render/MapRenderer';
import type { Command } from '../sim/commands';
import { TERRAIN, ZONE } from '../sim/map/types';
import { armRenderCrash } from '../ui/CrashCanary';
import { useAppStore } from './store';
import { crashWorker, sendCommand, startMission } from './workerBridge';

export interface EcTestApi {
  tileToScreen(x: number, y: number): { x: number; y: number };
  panTo(x: number, y: number): void;
  setZoom(scale: number): void;
  getState(): ReturnType<typeof useAppStore.getState>;
  /** First `count` open land tiles (spread out), for siting test builds. */
  openLand(count: number): Array<{ x: number; y: number }>;
  /** Road-class raster code at a tile (RC: 0 none … 4 motorway). Lets the
   *  van design-gate find drivable road tiles to drop test faults on. */
  getRoad(x: number, y: number): number;
  /** Drive the sim directly (build/demolish/speed …). */
  sendCommand(cmd: Command): void;
  /** Launch a tutorial mission (swaps the map + rebuilds on its scenario). */
  startMission(scenarioId: string): void;
  /** TEST ONLY: force a React render crash (arms the CrashCanary) to verify
   *  the ErrorBoundary fallback. Dev-build-only, like the whole hook. */
  crashRender(): void;
  /** TEST ONLY: force a sim Web Worker crash to verify worker capture. */
  crashWorker(): void;
  /** Pin the renderer's atmosphere (time-of-day grade / weather) for
   *  screenshots — render-only, the sim never sees it. No args clears. */
  setAtmosphere(
    simTimeMin?: number,
    weather?: { cloud: number; wind: number; regime?: string },
  ): void;
}

declare global {
  interface Window {
    __ec?: EcTestApi;
  }
}

export function installTestHook(renderer: MapRenderer): void {
  if (!import.meta.env.DEV) return;
  const map = getLondonMap();
  window.__ec = {
    tileToScreen: (x, y) => renderer.tileToScreen(x, y),
    panTo: (x, y) => renderer.panTo(x, y),
    setZoom: (scale) => renderer.setZoom(scale),
    getState: () => useAppStore.getState(),
    sendCommand: (cmd) => sendCommand(cmd),
    getRoad: (x, y) =>
      x >= 0 && x < map.width && y >= 0 && y < map.height ? (map.road[y * map.width + x] ?? 0) : 0,
    startMission: (scenarioId) => startMission(scenarioId),
    crashRender: () => armRenderCrash(),
    crashWorker: () => crashWorker(),
    setAtmosphere: (simTimeMin, weather) => renderer.overrideAtmosphere(simTimeMin, weather),
    openLand: (count) => {
      const out: Array<{ x: number; y: number }> = [];
      for (let y = 4; y < map.height - 4 && out.length < count; y += 2) {
        for (let x = 4; x < map.width - 4 && out.length < count; x += 2) {
          const i = y * map.width + x;
          if (
            map.terrain[i] === TERRAIN.land &&
            map.zone[i] === ZONE.none &&
            map.road[i] !== 1 &&
            out.every((p) => Math.hypot(p.x - x, p.y - y) > 10)
          ) {
            out.push({ x, y });
          }
        }
      }
      return out;
    },
  };
}
