// Dev-only hook that exposes just enough surface for Playwright to drive
// the real canvas: tile→screen projection, camera jumps, store access and
// land-finding. Never installed in production builds.

import { getLondonMap } from '../data/londonMap';
import type { MapRenderer } from '../render/MapRenderer';
import type { Command } from '../sim/commands';
import { TERRAIN, ZONE } from '../sim/map/types';
import { useAppStore } from './store';
import { sendCommand, startMission } from './workerBridge';

export interface EcTestApi {
  tileToScreen(x: number, y: number): { x: number; y: number };
  panTo(x: number, y: number): void;
  setZoom(scale: number): void;
  getState(): ReturnType<typeof useAppStore.getState>;
  /** First `count` open land tiles (spread out), for siting test builds. */
  openLand(count: number): Array<{ x: number; y: number }>;
  /** Drive the sim directly (build/demolish/speed …). */
  sendCommand(cmd: Command): void;
  /** Launch a tutorial mission (swaps the map + rebuilds on its scenario). */
  startMission(scenarioId: string): void;
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
    startMission: (scenarioId) => startMission(scenarioId),
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
