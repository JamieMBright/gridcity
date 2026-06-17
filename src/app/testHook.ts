// Dev-only hook that exposes just enough surface for Playwright to drive
// the real canvas: tile→screen projection, camera jumps, store access and
// land-finding. Never installed in production builds.

import { getLondonMap } from '../data/londonMap';
import type { MapRenderer } from '../render/MapRenderer';
import type { Command } from '../sim/commands';
import { TERRAIN, ZONE } from '../sim/map/types';
import { armRenderCrash } from '../ui/CrashCanary';
import type { SkipTarget } from '../sim/protocol';
import { useAppStore } from './store';
import { crashWorker, requestSkip, sendCommand, startMission } from './workerBridge';

export interface EcTestApi {
  tileToScreen(x: number, y: number): { x: number; y: number };
  panTo(x: number, y: number): void;
  setZoom(scale: number): void;
  /** The tile under the screen centre + the live zoom (inverse of panTo/
   *  setZoom). Lets a screenshot helper audit where the camera actually
   *  landed after the far-corner clamp. Undefined before init / after teardown. */
  getCamera(): { x: number; y: number; zoom: number } | undefined;
  /** TEST ONLY: the hero light-show KINDS currently energised (one entry per
   *  lit hero). Lets the Giza design-gate assert the Sound-&-Light floodlights
   *  (`pyramidFlood`/`sphinxFlood`) genuinely fire once the plateau is powered —
   *  the monuments carry heritage load but no domestic customers, so this is a
   *  truer energisation signal than servedCustomers. */
  getLitHeroKinds(): string[];
  /** TEST ONLY: every hero-light anchor as a tile coord + effect kind, so the
   *  night design-gate can frame a city's hero district and verify placement. */
  getHeroAnchors(): Array<{ x: number; y: number; kind: string }>;
  /** TEST ONLY: the live eased grade glow (0 day → ~1 night), so a night
   *  screenshot helper can wait until the night grade has actually arrived. */
  getGradeGlow(): number;
  /** TEST ONLY: the live eased grade as numbers (glow + tint + skyTop +
   *  override flag) for diagnosing a night shot that renders wrong. */
  getGradeDebug(): { glow: number; tint: number; skyTop: number; override: boolean };
  getState(): ReturnType<typeof useAppStore.getState>;
  /** First `count` open land tiles (spread out), for siting test builds. */
  openLand(count: number): Array<{ x: number; y: number }>;
  /** Road-class raster code at a tile (RC: 0 none … 4 motorway). Lets the
   *  van design-gate find drivable road tiles to drop test faults on. */
  getRoad(x: number, y: number): number;
  /** Drive the sim directly (build/demolish/speed …). */
  sendCommand(cmd: Command): void;
  /** TEST ONLY: force tiles to read as POWERED so a night-electrification
   *  screenshot can show an energised city without hand-wiring its grid.
   *  'all' = whole city; a number = only powered hero districts within that
   *  radius; false = off. Defaults to 'all'. */
  serveAll(mode?: 'all' | number | false): void;
  /** Fast-forward the sim a week/month/to-next-event (the HUD skip), so a
   *  screenshot helper can commission generation without minutes of 16× wait. */
  skip(to: SkipTarget): void;
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
    getCamera: () => renderer.getCamera(),
    getLitHeroKinds: () => renderer.getLitHeroKinds(),
    getHeroAnchors: () => renderer.getHeroAnchors(),
    getGradeGlow: () => renderer.getGradeGlow(),
    getGradeDebug: () => renderer.getGradeDebug(),
    getState: () => useAppStore.getState(),
    sendCommand: (cmd) => sendCommand(cmd),
    serveAll: (mode) => sendCommand({ type: '__testServeAll', mode: mode ?? 'all' }),
    skip: (to) => requestSkip(to),
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
