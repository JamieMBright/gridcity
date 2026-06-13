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
import { farmClaimTiles, isFarmGen } from '../sim/farms';
import { GENS, SUBS } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import { sampleRoute } from '../sim/map/routes';
import { CUSTOMERS_PER_TILE, LANDMARK, type CityMap, type Landmark, type RouteClass, type Zone } from '../sim/map/types';
import { COV, type BranchView } from '../sim/tick';
import { getAtlas } from './atlasCache';
import { AIRPORTS, NAMED_PLACES, TOWNS } from '../data/londonMap';
import { AIR_MAX_BAND, emitFlightArcs, emitPlanes } from './airLayer';
import {
  deckLiftWorldPx,
  emitBoatWakes,
  emitRouteRibbons,
  zoomKeyFor,
  WAKE_COLOR,
  type RibbonLayer,
  type WakeBoat,
  type ZoomKey,
} from './routeRibbons';
import {
  cameraFitFor,
  clampCameraToBounds,
  type CameraState,
  type TileBounds,
} from './cameraFit';
import { emitShoreline } from './shoreline';
import {
  mixRgb,
  sceneGrade,
  seasonOf,
  seasonTintFor,
  type SceneGrade,
  type Season,
  type WeatherLike,
} from './grade';
import { CELL_H, CELL_W, FLOOR_H, RES } from './sprites/iso';
import { levelPalette, type CbMode } from '../ui/cbPalette';
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
  interconnector: 'gen_interconnector',
  electrolyser: 'gen_electrolyser',
};
const SUB_SPRITE: Record<string, string> = {
  bulk: 'sub_bulk',
  grid: 'sub_grid',
  dist: 'sub_dist',
  pole: 'sub_pole',
  vault: 'sub_vault',
  capbank: 'sub_capbank',
};

// traffic tuning per route class — the ribbons themselves are tessellated
// by routeRibbons.ts (shared with the preview tool). Speeds are
// deliberately well below "light speed": a tile is ~a km, so even these
// cheat fast, but they READ as traffic rather than tracer rounds.
const ROUTE_STYLE: Record<RouteClass, { speed: number; perTile: number }> = {
  motorway: { speed: 1.7, perTile: 7 },
  arterial: { speed: 0.9, perTile: 12 },
  street: { speed: 0.4, perTile: 45 },
  lane: { speed: 0.5, perTile: 30 },
  rail: { speed: 1.6, perTile: 0 },
};
const CAR_COLORS = [0xf4f1ea, 0x27324d, 0xc9453a, 0x5e8fc2, 0xe8a23f, 0x9aa4b5, 0x3f8f8a];

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

/** A fade-in place name. `targetPx` is the on-screen px floor it holds at
 *  any zoom; `priority` drives the overlap declutter; `village` labels fade
 *  one band before towns; `cx/cy` is the world-pixel anchor for collisions. */
interface MapLabel {
  t: Text;
  targetPx: number;
  priority: number;
  village: boolean;
  /** Landmark-class label (Heathrow/Wembley/the O2…): gated to mid/close
   *  zoom only so it never clutters the far whole-region overview, where
   *  only TOWN names belong (owner playtest, 2026-06-13). */
  landmark: boolean;
  cx: number;
  cy: number;
}

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
  /** Hull length in world px (boats — scales the wake). */
  len?: number;
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
  /** Smoothed vector shoreline, built once at init (visual only). */
  private shoreG = new Graphics();
  /** Boats sail UNDER bridge decks: their layer sits below the routes. */
  private boatLayer = new Container();
  /** Per-frame V-wakes trailing the barges; sits just under the hulls. */
  private wakeG = new Graphics();
  /** Holds the active zoom band's ribbon Graphics (swapped, never restyled). */
  private routesLayer = new Container();
  /** Cars + trains: over the carriageways and bridge decks... */
  private roadVehicleLayer = new Container();
  /** ...but behind the near-side bridge parapets. */
  private bridgeTopLayer = new Container();
  /** P7 air layer: flight arcs + planes + altitude shadows, above the
   *  structures (a plane's shadow sweeping the rooftops is the point). */
  private airLayer = new Container();
  private airArcsG = new Graphics();
  private airPlanesG = new Graphics();
  /** Deterministic animation clock for the air fleet (no RNG anywhere). */
  private airTime = 0;
  private zoomKey: ZoomKey | undefined;
  private bandCache = new Map<string, { routes: Graphics; bridgeTop: Graphics; stamp: number }>();
  private bandStamp = 0;
  private gridViewOn = false;
  private structureLayer = new Container();
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
  // Each label carries its target ON-SCREEN px (UI: resolution-dependent
  // sizing — the rendered height equals targetPx regardless of zoom), a
  // declutter `priority` (LONDON > big towns > villages > named places),
  // its world half-extent for collision boxes, and `villageBand` so the
  // far view drops villages a zoom band before towns (progressive
  // disclosure). `cx/cy` are the world-pixel anchor for overlap tests.
  private labels: MapLabel[] = [];
  private levelG = new Graphics();
  private levelHighlight: VoltageLevel | undefined;
  /** 'headroom' re-colours every corridor by spare capacity. */
  private overlayMode: 'none' | 'headroom' | 'forecast' = 'none';
  private forecastRows: Array<{ subId: number; yearsToOverload: number }> = [];
  private n1Mode = false;
  private catchmentG = new Graphics();
  private catchments: Array<[number, number, number]> = [];
  private security = new Map<number, boolean>();
  private selG = new Graphics();
  private councilG = new Graphics();
  private lastAssets: PlacedAsset[] = [];
  /** Last frame's branch views — cached so a cbMode swap can redraw lines
   *  without waiting for the next snapshot. */
  private lastBranches: BranchView[] = [];
  private vanSprites = new Map<number, Sprite>();
  private ghostG = new Graphics();
  private ghostSprite: Sprite | undefined;
  private textures = new Map<string, Texture>();
  private frameSize = new Map<string, { w: number; h: number }>();
  /** Per-sprite trim offset (transparent left/top margin dropped from the
   *  atlas): added to every placement so the trim never shifts a pixel. */
  private frameOffset = new Map<string, { ox: number; oy: number }>();
  private structureSprites = new Map<number, Sprite>();
  private groundSprites = new Map<number, Sprite>();
  private destroyed = false;
  private dragging = false;
  private dragTravel = 0;
  /** When set (campaign missions), pan + zoom are clamped to these tile
   *  bounds so the tiny mission map can never drift off-screen. */
  private lockBounds: TileBounds | undefined;
  /** Screen-px reserved at the top for the mission step strip: the fit
   *  centres the map BELOW it so focus tiles never hide under the strip. */
  private lockTopReservePx = 0;
  private lastPointer = { x: 0, y: 0 };
  private cityFilter = new ColorMatrixFilter();
  private assetSignature = '';
  private sitesSignature = '';
  private coverageHash = 0;
  private prevCoverage: Uint8Array | undefined;
  private map: CityMap | undefined;
  private growthApplied = 0;

  // --- colour-blind palette (#32) --------------------------------------------
  // The voltage-level + overload + heatmap colours used by the DYNAMIC
  // drawing passes (lines, catchments, rings, ghosts) read these instance
  // fields, so flipping cbMode re-themes the network in place. The exported
  // LEVEL_COLOR constant stays the default (legends / static contexts).
  private levelColor: Record<VoltageLevel, number> = { ...LEVEL_COLOR };
  private overloadColor = OVERLOAD_COLOR;
  /** Loading heatmap endpoints (lo=spare/green, hi=full/red). */
  private heatLo = { r: 0x7b, g: 0xc4, b: 0x7f };
  private heatHi = { r: 0xe0, g: 0x69, b: 0x7a };
  private okColor = 0x7bc47f;
  private dangerColor = 0xe0697a;
  private warnColor = 0xf5c469;

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

  // --- lofi atmosphere (#41/#42/#44): sky, grade, glow, rain, vignette ---
  /** Screen-space sky gradient behind the world. */
  private skyG = new Graphics();
  /** The grade lands as a container TINT on the world-fabric layers
   *  (free on the GPU — no blend pass, reliable under software GL where
   *  Pixi's multiply silently no-ops). Diagnostic layers — coverage
   *  warnings, pins, selection, labels — stay untinted so alerts keep
   *  their colour language at night (readability doctrine). */
  private gradeTinted = false;
  /** Additive light layer ABOVE the tinted world — mirrors the camera
   *  transform so energized windows + kit bloom shine through the night. */
  private glowWorld = new Container();
  private lightsSprite: Sprite | undefined;
  private bloomG = new Graphics();
  /** Hero-landmark COLOUR-POP (owner playtest, 2026-06-13: the old additive
   *  "gleam" read as ELECTRICITY — a lightning glint. The fix is a tasteful
   *  colour treatment, not a glowing effect: the heroes pop as the focal 5%
   *  by CONTRAST. Two parts: (1) the hero structure sprites carry a warmer,
   *  more saturated tint than the uniformly dusk-muted fabric around them, so
   *  their own colours stay rich while the city greys into the golden-hour
   *  wash (color-theory: saturation + value contrast = focal); (2) a single,
   *  STEADY, very low warm rim arc catches each hero's sun-facing edge — a
   *  rim-LIGHT, not a radial bloom or a travelling glint. No breathing pulse,
   *  no sweep — nothing that reads as an energized object. */
  private gleamG = new Graphics();
  /** Hero landmark anchors (tile centres + radius) for the rim treatment. */
  private gleamHeroes: Array<{ x: number; y: number; r: number; glass: boolean }> = [];
  /** Wet sheen + rain streaks + lightning, screen-space. */
  private sheenG = new Graphics();
  private rainG = new Graphics();
  private flashG = new Graphics();
  private vignette: Sprite | undefined;
  private atmoTime = 12 * 60;
  private atmoWeather: WeatherLike = { cloud: 0.35, wind: 0.4 };
  private atmoOverride = false;
  /** Sim-clock speed (0/1/4/16x). The living world (traffic, turbines,
   *  power-flow dashes, aircraft) moves at this multiple of real time so
   *  motion matches the clock — paused freezes it, 16x whirs (owner,
   *  2026-06-13: "Animations should move as fast as the game clock speed
   *  allows"). UI affordances (attention pins, label fades) and the grade
   *  ease on real time regardless. */
  private simSpeed = 1;
  private grade: SceneGrade | undefined;
  private gradeKey = '';
  private seasonNow: Season | undefined;
  private rainDrops: Array<{ x: number; y: number; s: number; l: number }> = [];
  private flashTimer = 8;
  private flashAlpha = 0;
  private reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    this.drawShore(map);
    // wakes paint beneath every hull spawned after this line
    this.boatLayer.addChild(this.wakeG);
    this.spawnVehicles();
    this.airLayer.addChild(this.airArcsG);
    this.airLayer.addChild(this.airPlanesG);

    this.cityFilter.desaturate();
    this.cityFilter.brightness(0.62, true);

    this.structureLayer.sortableChildren = true;
    this.assetLayer.sortableChildren = true;
    // painter order: ground → smooth shoreline → boats → road/rail ribbons
    // (incl. bridge decks) → road vehicles → near parapets → buildings.
    // None of the transport layers are interactive — picking/demolish all
    // happens on DOM events + the asset layers above.
    for (const layer of [
      this.shoreG,
      this.boatLayer,
      this.routesLayer,
      this.roadVehicleLayer,
      this.bridgeTopLayer,
      this.airLayer,
    ]) {
      layer.eventMode = 'none';
    }
    this.city.addChild(this.terrainLayer);
    this.city.addChild(this.shoreG);
    this.city.addChild(this.boatLayer);
    this.city.addChild(this.routesLayer);
    this.city.addChild(this.roadVehicleLayer);
    this.city.addChild(this.bridgeTopLayer);
    this.city.addChild(this.structureLayer);
    // the air fleet flies over the buildings, under the pins/labels
    this.city.addChild(this.airLayer);
    this.world.addChild(this.city);
    this.world.addChild(this.coverageG);
    this.world.addChild(this.smogG);
    this.world.addChild(this.catchmentG);
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

    // atmosphere stack: sky behind the world; the grade itself tints the
    // world-fabric layers in place (see gradeTinted); above the world the
    // additive glow (energized windows + kit bloom ride OVER the night
    // tint — powering an area literally makes it glow), then weather
    // (sheen/rain/lightning) and the frame vignette. All screen-space,
    // all non-interactive, each a single quad or a small streak batch —
    // mobile-GPU cheap.
    this.bloomG.blendMode = 'add';
    this.gleamG.blendMode = 'add';
    this.gleamG.eventMode = 'none';
    this.glowWorld.addChild(this.bloomG);
    this.glowWorld.addChild(this.gleamG);
    this.buildGleamHeroes();
    this.vignette = new Sprite(makeVignetteTexture());
    for (const layer of [
      this.skyG,
      this.glowWorld,
      this.sheenG,
      this.rainG,
      this.flashG,
      this.vignette,
    ]) {
      layer.eventMode = 'none';
    }
    this.app.stage.addChildAt(this.skyG, 0);
    this.app.stage.addChild(this.glowWorld, this.sheenG, this.rainG, this.flashG, this.vignette);
    this.applySeason(seasonOf(this.atmoTime));

    // OPEN ON THE WHOLE-REGION OVERVIEW (owner playtest, 2026-06-13: "starting
    // zoom should be very far out"). Fit the entire map on screen rather than
    // dropping the camera mid-zoom over the city. Missions override this an
    // instant later via lockToBounds (their tiny map gets its own fit), so
    // only the sandbox opening is affected.
    const cam = cameraFitFor(
      { x0: 0, y0: 0, x1: map.width - 1, y1: map.height - 1 },
      {
        screenW: this.app.screen.width,
        screenH: this.app.screen.height,
        halfW: HALF_W,
        halfH: HALF_H,
        paddingPx: 12 * RES,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      },
    );
    this.world.scale.set(cam.scale);
    this.world.position.set(cam.x, cam.y);

    this.applyZoomBand();
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
    const add = (
      x: number,
      y: number,
      text: string,
      targetPx: number,
      color: number,
      priority: number,
      village: boolean,
      landmark = false,
    ): void => {
      const t = new Text({
        text,
        style: {
          fontFamily: 'monospace',
          fontSize: 64,
          fontWeight: '700',
          fill: color,
          // a fatter navy halo (width 8 → 11 baked at 64 px) so the cream
          // text survives simultaneous-contrast over both the pale core and
          // the green fields (Color: the halo neutralises the ground).
          stroke: { color: 0x10162f, width: 11 },
          letterSpacing: 4,
        },
      });
      t.anchor.set(0.5);
      const c = this.tileCentre(x, y);
      t.position.set(c.x, c.y - 20 * RES);
      this.labelLayer.addChild(t);
      this.labels.push({ t, targetPx, priority, village, landmark, cx: c.x, cy: c.y });
    };
    // UI screen-px floors (legible on a phone held landscape): LONDON 30,
    // towns 20, villages 14, named places 13. Priority drives the collision
    // declutter (LONDON highest, then towns by size, villages, named).
    add(128, 78, 'LONDON', 30, 0xf4f1ea, 100, false);
    for (const town of TOWNS) {
      const isTown = town.kind === 'town';
      add(
        town.x,
        town.y,
        town.name.toUpperCase(),
        isTown ? 20 : 14,
        0xf4f1ea,
        isTown ? 50 + town.r : 20,
        !isTown,
      );
    }
    for (const pl of NAMED_PLACES) {
      // gold codes "transport/place" distinct from town names (also smaller,
      // so it's not colour-alone). Landmark-class: gated to mid/close zoom so
      // it stays OFF the far overview (only towns label there).
      add(pl.x, pl.y, pl.name, 13, 0xffd277, 10, false, true);
    }
  }

  /** Headroom heatmap: corridors gradient green→amber→red by loading.
   *  Forecast mode tints catchments by years-until-overload instead. */
  setOverlay(mode: 'none' | 'headroom' | 'forecast'): void {
    this.overlayMode = mode;
    this.drawCatchments();
  }

  setForecastRows(rows: Array<{ subId: number; yearsToOverload: number }>): void {
    this.forecastRows = rows;
    if (this.overlayMode === 'forecast') this.drawCatchments();
  }

  /** N-1 security rings: green = survives any single failure. */
  setN1(on: boolean): void {
    this.n1Mode = on;
    this.drawCatchments();
  }

  /** Latest catchment loadings + security verdicts from the snapshot. */
  setCatchmentData(
    catchments: Array<[number, number, number]> | undefined,
    security: Array<[number, boolean]> | undefined,
  ): void {
    if (catchments) this.catchments = catchments;
    if (security) this.security = new Map(security);
    if (this.overlayMode !== 'none' || this.n1Mode) this.drawCatchments();
  }

  private drawCatchments(): void {
    this.catchmentG.clear();
    if (this.overlayMode === 'none' && !this.n1Mode) return;
    const byId = new Map(this.lastAssets.map((a) => [a.id, a]));
    for (const [id, peak, mva] of this.catchments) {
      const a = byId.get(id);
      if (!a || a.kind !== 'sub') continue;
      const spec = SUBS[a.sub];
      if (spec.serviceRadius === undefined) continue;
      const r = spec.serviceRadius * Math.sqrt(Math.max(mva, 1) / spec.txRatingMW);
      if (this.overlayMode === 'forecast') {
        const row = this.forecastRows.find((f) => f.subId === id);
        if (row) {
          const y = row.yearsToOverload;
          const color = y <= 1 ? this.dangerColor : y <= 3 ? this.warnColor : y >= 99 ? 0x5b6378 : this.okColor;
          this.tileCircle(this.catchmentG, a.x, a.y, r);
          this.catchmentG.fill({ color, alpha: 0.16 });
          this.tileCircle(this.catchmentG, a.x, a.y, r);
          this.catchmentG.stroke({ color, width: 2.4 * RES, alpha: 0.85 });
        }
      }
      if (this.overlayMode === 'headroom' && mva > 0) {
        const t = Math.max(0, Math.min(1, peak / mva));
        const lerp = (a0: number, b0: number): number => Math.round(a0 + (b0 - a0) * t);
        const lo = this.heatLo;
        const hi = this.heatHi;
        const color =
          (lerp(lo.r, hi.r) << 16) | (lerp(lo.g, hi.g) << 8) | lerp(lo.b, hi.b);
        this.tileCircle(this.catchmentG, a.x, a.y, r);
        this.catchmentG.fill({ color, alpha: 0.16 });
        this.tileCircle(this.catchmentG, a.x, a.y, r);
        this.catchmentG.stroke({ color, width: 2 * RES, alpha: 0.8 });
      }
      if (this.n1Mode) {
        const secure = this.security.get(id);
        if (secure === undefined) continue;
        const color = secure ? this.okColor : this.dangerColor;
        this.tileCircle(this.catchmentG, a.x, a.y, r * 0.92);
        this.catchmentG.stroke({ color, width: 3 * RES, alpha: 0.9 });
      }
    }
  }

  setGridView(on: boolean): void {
    this.city.filters = on ? [this.cityFilter] : [];
    this.gridViewOn = on;
    // grid view is an engineering drawing: drop the cinematic tint so
    // the network colours stay true
    if (on && this.gradeTinted) {
      for (const layer of this.gradeTargets()) layer.tint = 0xffffff;
      this.gradeTinted = false;
    }
    if (!on) this.gradeKey = ''; // re-apply the grade next frame
    this.applyVehicleVisibility();
  }

  /** Colour-blind mode (#32): swap the network/heatmap palette and redraw
   *  the dynamic passes in place. Idempotent; cheap (a few Graphics
   *  rebuilds, no atlas churn). Status colours pair with shape/value too
   *  (the UI legend draws the same swatches), so this is hue-as-bonus. */
  private cbMode: CbMode = 'off';
  setCbMode(mode: CbMode): void {
    if (mode === this.cbMode) return;
    this.cbMode = mode;
    const lv = levelPalette(mode);
    this.levelColor = { 400: lv[400], 132: lv[132], 33: lv[33] };
    this.overloadColor = lv.overload;
    if (mode === 'off') {
      this.heatLo = { r: 0x7b, g: 0xc4, b: 0x7f };
      this.heatHi = { r: 0xe0, g: 0x69, b: 0x7a };
      this.okColor = 0x7bc47f;
      this.warnColor = 0xf5c469;
      this.dangerColor = 0xe0697a;
    } else {
      this.heatLo = rgbOf(lv[132]); // teal/green = spare
      this.heatHi = rgbOf(lv.overload); // magenta/black = full
      this.okColor = lv[132];
      this.warnColor = lv[33];
      this.dangerColor = lv.overload;
    }
    // redraw everything that bakes a palette colour
    this.drawLevelHighlight();
    this.drawCatchments();
    if (this.lastAssets.length > 0) {
      // rebuild lines/rings against the cached last frame
      const byId = new Map<number, PlacedAsset>();
      for (const a of this.lastAssets) byId.set(a.id, a);
      this.drawLines(this.lastAssets, this.lastBranches, byId);
      this.drawSubRings(this.lastAssets);
    }
  }

  // --- minimap accessor (#26, FLAGGED read-only) -----------------------------
  // The corner minimap (src/ui/Minimap.tsx) is a lightweight DOM canvas, NOT
  // a second Pixi app. It needs three read-only facts the renderer already
  // owns: the map size, the world-space tile→pixel transform, and the
  // current visible tile rectangle (so it can draw the viewport box and
  // convert a minimap click back to a pan target). This is the ONLY public
  // read accessor the minimap added; it restructures nothing.
  getMinimapView(): {
    width: number;
    height: number;
    /** Visible tile-space rectangle (clamped to the map), for the box. */
    view: { x0: number; y0: number; x1: number; y1: number };
  } | undefined {
    const map = this.map;
    if (!map || this.destroyed || !this.app.renderer) return undefined;
    // invert tileFromClient at the four screen corners to get the tile
    // bounds currently on screen
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const corners = [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [sx, sy] of corners) {
      const wx = ((sx ?? 0) - this.world.x) / this.world.scale.x;
      const wy = ((sy ?? 0) - this.world.y) / this.world.scale.y;
      const u = wx / HALF_W;
      const t = wy / HALF_H;
      const tx = (u + t) / 2;
      const ty = (t - u) / 2;
      minX = Math.min(minX, tx);
      minY = Math.min(minY, ty);
      maxX = Math.max(maxX, tx);
      maxY = Math.max(maxY, ty);
    }
    const clamp = (v: number, hi: number): number => Math.max(0, Math.min(hi, v));
    return {
      width: map.width,
      height: map.height,
      view: {
        x0: clamp(minX, map.width),
        y0: clamp(minY, map.height),
        x1: clamp(maxX, map.width),
        y1: clamp(maxY, map.height),
      },
    };
  }

  /** World-fabric layers that take the time-of-day tint. The network
   *  (lines/flow/rings) and every diagnostic overlay stay untinted: the
   *  grid is the hero and alerts keep their colour language at night. */
  private gradeTargets(): Array<Container | Graphics> {
    return [this.city, this.smogG, this.assetLayer, this.fleetLayer];
  }

  // --- atmosphere (#41 day/night grade · #42 rain & storms · #44 seasons) ----

  /** Gate the living-world animation rate on the sim clock speed (0/1/4/
   *  16x). Called from the snapshot effect alongside setAtmosphere. */
  setSimSpeed(speed: number): void {
    this.simSpeed = speed;
  }

  /** Follow the sim clock + live weather (called per snapshot). */
  setAtmosphere(simTimeMin: number, weather: WeatherLike): void {
    if (this.atmoOverride) return;
    this.atmoTime = simTimeMin;
    this.atmoWeather = weather;
    const season = seasonOf(simTimeMin);
    if (season !== this.seasonNow) this.applySeason(season);
  }

  /** Pin the grade for screenshots/dev (test hook); undefined args clear. */
  overrideAtmosphere(simTimeMin?: number, weather?: WeatherLike): void {
    this.atmoOverride = simTimeMin !== undefined || weather !== undefined;
    if (simTimeMin !== undefined) {
      this.atmoTime = simTimeMin;
      const season = seasonOf(simTimeMin);
      if (season !== this.seasonNow) this.applySeason(season);
    }
    if (weather !== undefined) this.atmoWeather = weather;
  }

  /** Re-tint the countryside for the calendar quarter (one property write
   *  per sprite; runs only when the season bucket flips). */
  private applySeason(season: Season): void {
    this.seasonNow = season;
    const map = this.map;
    if (!map) return;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x;
        const ground = this.groundSprites.get(i);
        if (ground) {
          ground.tint = seasonTintFor(groundSpriteFor(map, x, y), season) ?? 0xffffff;
        }
        const struct = this.structureSprites.get(i);
        if (struct) {
          const name = structureSpriteFor(map, x, y);
          struct.tint = name && MapRenderer.HERO_SPRITES.has(name)
            ? MapRenderer.HERO_POP_TINT
            : (name ? seasonTintFor(name, season) : undefined) ?? 0xffffff;
        }
      }
    }
  }

  /** Per-frame grade: eased toward the sim's time/weather so day, dusk,
   *  drizzle and storm arrive as fronts, not steps. Redraws the sky/wash
   *  quads only when the eased colours actually move. */
  private stepAtmosphere(dt: number): void {
    const target = sceneGrade(this.atmoTime, this.atmoWeather);
    const k = Math.min(1, 1 - Math.exp(-dt * 2.5));
    const cur = this.grade ?? target;
    const g: SceneGrade = {
      skyTop: mixRgb(cur.skyTop, target.skyTop, k),
      skyBottom: mixRgb(cur.skyBottom, target.skyBottom, k),
      tint: mixRgb(cur.tint, target.tint, k),
      glow: cur.glow + (target.glow - cur.glow) * k,
      vignette: cur.vignette + (target.vignette - cur.vignette) * k,
      rain: cur.rain + (target.rain - cur.rain) * k,
      storm: cur.storm + (target.storm - cur.storm) * k,
      wet: cur.wet + (target.wet - cur.wet) * k,
    };
    this.grade = g;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const key = `${g.skyTop},${g.skyBottom},${g.tint},${Math.round(g.wet * 40)},${w},${h}`;
    if (key !== this.gradeKey) {
      this.gradeKey = key;
      this.skyG.clear();
      const BANDS = 12;
      for (let i = 0; i < BANDS; i++) {
        this.skyG
          .rect(0, (h * i) / BANDS - 1, w, h / BANDS + 2)
          .fill(mixRgb(g.skyTop, g.skyBottom, i / (BANDS - 1)));
      }
      // the grade itself: tint the world fabric (no-op while grid view
      // holds the engineering palette)
      if (!this.gridViewOn) {
        for (const layer of this.gradeTargets()) layer.tint = g.tint;
        this.gradeTinted = true;
      }
      // wet sheen: rain-damp air catches the sky and lifts the shadows
      this.sheenG.clear();
      if (g.wet > 0.03) {
        this.sheenG.rect(0, 0, w, h).fill({ color: 0xaab8d8, alpha: 0.07 * g.wet });
      }
    }
    if (this.vignette) {
      this.vignette.width = w;
      this.vignette.height = h;
      this.vignette.alpha = g.vignette;
    }
    // the glow layer rides the camera
    this.glowWorld.position.copyFrom(this.world.position);
    this.glowWorld.scale.copyFrom(this.world.scale);
    const glowOn = !this.gridViewOn;
    if (this.lightsSprite) this.lightsSprite.alpha = glowOn ? g.glow * 0.85 : 0;
    this.bloomG.alpha = glowOn ? g.glow * 0.9 : 0;
    this.stepRain(dt, g, w, h);
  }

  /** Cosy streaked drizzle → storm downpour, plus the occasional distant
   *  lightning wash. Capped streak count; respects reduced-motion. */
  private stepRain(dt: number, g: SceneGrade, w: number, h: number): void {
    const want = this.reducedMotion || g.rain < 0.05 ? 0 : Math.round(36 + 130 * g.rain);
    while (this.rainDrops.length < want) {
      this.rainDrops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        s: 0.7 + Math.random() * 0.6,
        l: 9 + Math.random() * 13,
      });
    }
    if (this.rainDrops.length > want) this.rainDrops.length = want;
    this.rainG.clear();
    if (want > 0) {
      const slant = 0.18 + 0.45 * g.storm;
      const speed = (520 + 560 * g.storm) * dt;
      for (const d of this.rainDrops) {
        d.y += speed * d.s;
        d.x -= speed * d.s * slant;
        if (d.y > h + 20) {
          d.y = -20 - Math.random() * 30;
          d.x = Math.random() * (w * (1 + slant));
        }
        if (d.x < -30) d.x += w + 60;
        this.rainG.moveTo(d.x, d.y).lineTo(d.x + d.l * slant, d.y + d.l);
      }
      this.rainG.stroke({
        color: 0xbfc8e8,
        width: 1.1,
        alpha: 0.2 + 0.16 * g.storm,
        cap: 'round',
      });
    }
    if (g.storm > 0.5 && !this.reducedMotion) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashAlpha = 0.5 + Math.random() * 0.3;
        this.flashTimer = 7 + Math.random() * 16;
      }
    }
    if (this.flashAlpha > 0.005) {
      this.flashAlpha *= Math.exp(-dt * 7);
      this.flashG.clear();
      this.flashG.rect(0, 0, w, h).fill({ color: 0xf4ecff, alpha: this.flashAlpha * 0.3 });
    } else if (this.flashAlpha !== 0) {
      this.flashAlpha = 0;
      this.flashG.clear();
    }
  }

  /** Warm-window light field: one texel per energized customer tile,
   *  stretched onto the iso plane (the suitability-overlay trick). The
   *  linear filter melts it into soft pools of dusk light over powered
   *  districts; unpowered streets stay cold and dark. */
  private rebuildLights(coverage: Uint8Array): void {
    const map = this.map;
    if (this.lightsSprite) {
      this.lightsSprite.destroy({ texture: true });
      this.lightsSprite = undefined;
    }
    if (!map) return;
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(map.width, map.height);
    let any = false;
    for (let i = 0; i < coverage.length; i++) {
      if (coverage[i] !== COV.on) continue;
      const cust = map.customers[i] ?? 0;
      if (cust <= 0) continue;
      any = true;
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 193;
      img.data[i * 4 + 2] = 110;
      img.data[i * 4 + 3] = Math.min(220, 88 + cust);
    }
    if (!any) return;
    ctx.putImageData(img, 0, 0);
    const sprite = new Sprite(Texture.from(canvas));
    sprite.setFromMatrix(new Matrix(HALF_W, HALF_H, -HALF_W, HALF_H, 0, -HALF_H));
    sprite.blendMode = 'add';
    sprite.alpha = this.grade ? this.grade.glow * 0.85 : 0;
    this.glowWorld.addChildAt(sprite, 0);
    this.lightsSprite = sprite;
  }

  /** Gentle bloom halos on substations + turbine hubs (additive, scaled
   *  by the dusk glow — by day they vanish). */
  private drawBloom(assets: PlacedAsset[]): void {
    this.bloomG.clear();
    const halo = (x: number, y: number, r: number): void => {
      for (const [mul, a] of [
        [1.8, 0.045],
        [1.1, 0.08],
        [0.55, 0.13],
      ] as const) {
        this.bloomG.ellipse(x, y, r * mul, r * mul * 0.55).fill({ color: 0xffc878, alpha: a });
      }
    };
    for (const a of assets) {
      if (a.kind === 'sub') {
        if (a.sub === 'tee') continue;
        const [fw, fh] = SUBS[a.sub].footprint ?? [1, 1];
        const c = this.tileCentre(a.x + (fw - 1) / 2, a.y + (fh - 1) / 2);
        halo(c.x, c.y - 12 * RES, (13 + 6 * Math.max(fw, fh)) * RES);
      } else if (
        a.kind === 'gen' &&
        (a.gen === 'windOnshore' || a.gen === 'windOffshore')
      ) {
        const c = this.tileCentre(a.x, a.y);
        for (const spec of WIND_HUBS[a.gen === 'windOffshore' ? 'offshore' : 'onshore']) {
          const [hx, hy] = windHubOffset(spec);
          halo(c.x - HALF_W + hx, c.y + HALF_H - CELL_H + hy, 8 * RES);
        }
      }
    }
  }

  /** Colour-pop tint for hero-landmark structure sprites (owner playtest,
   *  2026-06-13): a warm, near-white tint that, multiplied against the
   *  uniformly dusk-muted `city` container, leaves the heroes RICHER and a
   *  touch WARMER than the greyed fabric around them — so they read as the
   *  focal 5% by saturation/value contrast, with no glowing effect. Kept
   *  gentle (a small warm lift), not a spotlight. */
  private static readonly HERO_POP_TINT = 0xfff4e2;

  /** Is this structure-sprite name a hero landmark (gets the colour pop +
   *  the rim-light)? Mirrors GLEAM_HEROES, by sprite name. */
  private static readonly HERO_SPRITES: ReadonlySet<string> = new Set([
    'lm_spire', 'lm_gherkin', 'lm_dome', 'lm_parliament', 'lm_eye', 'lm_fortress',
    'lm_bridge', 'lm_power', 'lm_stadium', 'lm_wembley', 'lm_o2dome', 'lm_bttower',
    'lm_allypally', 'lm_excel', 'lm_palacemast', 'lm_kewhouse', 'lm_orbit',
    'lm_velodrome', 'lm_westfield',
  ]);

  /** The hero landmarks that earn the special rim-light + colour pop
   *  (env-art 5% hero rule): the silhouette icons + glass towers, with a
   *  per-id rim radius. The civic kit (station/school/townhall…) is
   *  deliberately excluded so the squint test lands on the heroes, not the
   *  fabric. (`glass` is retained as data but no longer drives a glint.) */
  private static readonly GLEAM_HEROES: Partial<Record<Landmark, { r: number; glass: boolean }>> = {
    [LANDMARK.spire]: { r: 30, glass: true }, // the Shard
    [LANDMARK.gherkin]: { r: 24, glass: true },
    [LANDMARK.dome]: { r: 30, glass: false }, // St Paul's
    [LANDMARK.parliament]: { r: 34, glass: false },
    [LANDMARK.eye]: { r: 28, glass: true },
    [LANDMARK.fortress]: { r: 22, glass: false },
    [LANDMARK.towerBridge]: { r: 30, glass: false },
    [LANDMARK.powerstation]: { r: 30, glass: false },
    [LANDMARK.stadium]: { r: 26, glass: false },
    [LANDMARK.wembley]: { r: 26, glass: false },
    [LANDMARK.o2dome]: { r: 28, glass: true },
    [LANDMARK.bttower]: { r: 24, glass: true },
    [LANDMARK.allypally]: { r: 26, glass: false },
    [LANDMARK.excel]: { r: 24, glass: true },
    [LANDMARK.palacemast]: { r: 18, glass: false },
    [LANDMARK.kewhouse]: { r: 20, glass: true },
    // Queen Elizabeth Olympic Park, Stratford: the Orbit is the glass/steel
    // hero (travelling glint), the VeloPark + Westfield catch the warm bloom
    [LANDMARK.orbit]: { r: 26, glass: true },
    [LANDMARK.velodrome]: { r: 22, glass: false },
    [LANDMARK.westfield]: { r: 26, glass: true },
  };

  /** Scan the map once for hero-landmark anchors and cache their tile
   *  centres for the per-frame gleam. One entry per landmark reservation
   *  (the min-x/min-y tile), so big precincts don't double-bloom. */
  private buildGleamHeroes(): void {
    this.gleamHeroes = [];
    const map = this.map;
    if (!map || !map.landmark) return;
    const seenAnchor = new Set<number>();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const lm = (map.landmark[y * map.width + x] ?? 0) as Landmark;
        const spec = MapRenderer.GLEAM_HEROES[lm];
        if (!spec) continue;
        // anchor = the reservation's top-left tile (no same-id tile N or W)
        const same = (xx: number, yy: number): boolean =>
          xx >= 0 && yy >= 0 && xx < map.width && yy < map.height &&
          (map.landmark?.[yy * map.width + xx] ?? 0) === lm;
        if (same(x - 1, y) || same(x, y - 1)) continue;
        const key = lm * 100003 + y * map.width + x;
        if (seenAnchor.has(key)) continue;
        seenAnchor.add(key);
        const c = this.tileCentre(x, y);
        this.gleamHeroes.push({ x: c.x, y: c.y - 16 * RES, r: spec.r * RES, glass: spec.glass });
      }
    }
  }

  /** The per-frame hero RIM-LIGHT (NOT the old electric gleam). A single,
   *  steady, very low warm arc catching each hero's sun-facing (NE) edge —
   *  golden-hour light grazing a landmark, not a glowing/electrified object.
   *  No breathing pulse, no radial bloom, no travelling glint: those read as
   *  electricity (owner playtest). It still rides the additive glowWorld so
   *  it ties off by day and warms a touch at dusk, but capped so low it never
   *  blooms — the heroes pop by sprite-colour CONTRAST (lifted tints), this
   *  is only the finishing edge-light. `phase` is unused now (kept steady).*/
  private drawGleam(glow: number): void {
    this.gleamG.clear();
    if (this.gridViewOn || this.gleamHeroes.length === 0) return;
    // a steady amount, gently warmer toward dusk — capped low so it's a rim,
    // never a halo (floor keeps a faint catch-light even by day)
    const base = 0.34 + 0.32 * glow;
    if (base <= 0.01) return;
    const GOLD = 0xffe7b6;
    for (const h of this.gleamHeroes) {
      // a thin sun-facing rim arc across the top-right of the hero's cap:
      // an open stroke following the NE quarter of its silhouette ellipse
      const ry = h.r * 0.6;
      const arc = (width: number, alpha: number): void => {
        for (let k = 0; k <= 7; k++) {
          const a = -Math.PI * 0.5 + (k / 7) * (Math.PI * 0.55); // top → NE
          const px = h.x + Math.cos(a) * h.r * 0.94;
          const py = h.y + Math.sin(a) * ry;
          if (k === 0) this.gleamG.moveTo(px, py);
          else this.gleamG.lineTo(px, py);
        }
        this.gleamG.stroke({ color: width > 1.5 * RES ? GOLD : 0xfff1d4, width, alpha, cap: 'round' });
      };
      arc(2.4 * RES, 0.12 * base);
      arc(1.0 * RES, 0.4 * base);
    }
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
      this.levelG.stroke({ color: this.levelColor[level], width: 2.6 * RES, alpha: 0.95 });
      this.diamond(this.levelG, a.x, a.y, 1.45);
      this.levelG.stroke({ color: this.levelColor[level], width: 1.2 * RES, alpha: 0.4 });
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
    this.lastBranches = branches;
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
      this.rebuildLights(coverage);
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
    this.applyLockClamp();
  }

  panTo(x: number, y: number): void {
    // app.screen throws once the renderer is gone / not yet inited; guard
    // on the (safe) renderer field so a mission focus glide that fires
    // before init resolves or after teardown is a no-op, not a crash.
    if (this.destroyed || !this.app.renderer) return;
    const c = this.tileCentre(x, y);
    const s = this.world.scale.x;
    this.world.position.set(
      this.app.screen.width / 2 - c.x * s,
      this.app.screen.height / 2 - c.y * s,
    );
    this.applyLockClamp();
  }

  private fitOpts(paddingPx: number): {
    screenW: number;
    screenH: number;
    halfW: number;
    halfH: number;
    paddingPx: number;
    topReservePx: number;
    minZoom: number;
    maxZoom: number;
  } {
    return {
      screenW: this.app.screen.width,
      screenH: this.app.screen.height,
      halfW: HALF_W,
      halfH: HALF_H,
      paddingPx,
      topReservePx: this.lockTopReservePx,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    };
  }

  /** Centre + zoom-FIT the camera on these tile bounds (THE mission-camera
   *  fix), and clamp every subsequent pan/zoom to them. `topReservePx`
   *  keeps the map clear of the top mission step strip. Pass undefined to
   *  release the lock (sandbox). */
  lockToBounds(bounds: TileBounds | undefined, paddingPx = 36, topReservePx = 0): void {
    this.lockBounds = bounds;
    this.lockTopReservePx = bounds ? topReservePx : 0;
    if (!bounds || this.destroyed || !this.app.renderer) return;
    const cam = cameraFitFor(bounds, this.fitOpts(paddingPx));
    this.applyCamera(cam);
  }

  /** Glide the camera so a focus tile is framed, but never past the
   *  locked bounds (mission steps pan to their teaching point). The tile
   *  is centred within the usable band BELOW the reserved top strip, so
   *  it never hides under it — for the player and the regression e2e. */
  focusTile(x: number, y: number): void {
    if (this.destroyed || !this.app.renderer) return;
    const c = this.tileCentre(x, y);
    const s = this.world.scale.x;
    const bandMid = (this.lockTopReservePx + this.app.screen.height) / 2;
    this.world.position.set(this.app.screen.width / 2 - c.x * s, bandMid - c.y * s);
    this.applyLockClamp();
  }

  private applyCamera(cam: CameraState): void {
    this.world.scale.set(cam.scale);
    this.world.position.set(cam.x, cam.y);
  }

  /** Re-clamp the live camera to the active lock bounds, if any. */
  private applyLockClamp(): void {
    if (!this.lockBounds || this.destroyed || !this.app.renderer) return;
    const clamped = clampCameraToBounds(
      { scale: this.world.scale.x, x: this.world.x, y: this.world.y },
      this.lockBounds,
      {
        screenW: this.app.screen.width,
        screenH: this.app.screen.height,
        halfW: HALF_W,
        halfH: HALF_H,
        paddingPx: 8,
        topReservePx: this.lockTopReservePx,
      },
    );
    this.applyCamera(clamped);
  }

  tileToScreen(x: number, y: number): { x: number; y: number } {
    // a tile query can race a renderer (re)build (e.g. on a mission map
    // swap): if the Pixi app isn't up yet, report off-screen rather than
    // throw inside the caller's page.evaluate
    if (!this.app?.canvas) return { x: -1, y: -1 };
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
    const baseX = c.x - HALF_W;
    const baseY = c.y + HALF_H - CELL_H;
    const groundName = groundSpriteFor(map, x, y);
    const ground = this.textures.get(groundName);
    if (ground) {
      const s = new Sprite(ground);
      const o = this.frameOffset.get(groundName);
      s.position.set(baseX + (o?.ox ?? 0), baseY + (o?.oy ?? 0));
      if (this.seasonNow) s.tint = seasonTintFor(groundName, this.seasonNow) ?? 0xffffff;
      this.terrainLayer.addChild(s);
      this.groundSprites.set(i, s);
    }
    const structName = structureSpriteFor(map, x, y);
    const struct = structName ? this.textures.get(structName) : undefined;
    if (struct && structName) {
      const s = new Sprite(struct);
      const o = this.frameOffset.get(structName);
      s.position.set(baseX + (o?.ox ?? 0), baseY + (o?.oy ?? 0));
      // hero landmarks take the warm colour-pop tint (focal-5% contrast);
      // everything else takes its seasonal tint (or none)
      s.tint = MapRenderer.HERO_SPRITES.has(structName)
        ? MapRenderer.HERO_POP_TINT
        : (this.seasonNow ? seasonTintFor(structName, this.seasonNow) ?? 0xffffff : 0xffffff);
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

  /** Smoothed shoreline bands — built once; the estuary stops being Lego. */
  private drawShore(map: CityMap): void {
    const batch = batchedFill(() => this.shoreG);
    emitShoreline(map, (pts, color, alpha) => batch.poly(pts, color, alpha, 'routes'));
    batch.flush();
  }

  /** Swap in the ribbon Graphics for the current zoom band, rebuilding
   *  lazily (≤ 2 cached bands; LRU destroyed). Called every frame — a
   *  no-op unless the camera crossed a band boundary (with hysteresis). */
  private applyZoomBand(): void {
    const map = this.map;
    if (!map) return;
    const key = zoomKeyFor(this.world.scale.x, this.zoomKey);
    if (key === this.zoomKey) return;
    this.zoomKey = key;
    let entry = this.bandCache.get(key.id);
    if (!entry) {
      const routes = new Graphics();
      const bridgeTop = new Graphics();
      routes.eventMode = 'none';
      bridgeTop.eventMode = 'none';
      const batch = batchedFill((layer: RibbonLayer) =>
        layer === 'bridgeTop' ? bridgeTop : routes,
      );
      emitRouteRibbons(map, { band: key.band, scale: key.scale }, batch.poly);
      batch.flush();
      entry = { routes, bridgeTop, stamp: 0 };
      this.bandCache.set(key.id, entry);
      // keep at most 2 band builds alive — destroy the least recent other
      while (this.bandCache.size > 2) {
        let lruId: string | undefined;
        let lruStamp = Number.POSITIVE_INFINITY;
        for (const [id, e] of this.bandCache) {
          if (id !== key.id && e.stamp < lruStamp) {
            lruId = id;
            lruStamp = e.stamp;
          }
        }
        if (lruId === undefined) break;
        const lru = this.bandCache.get(lruId);
        this.bandCache.delete(lruId);
        lru?.routes.destroy();
        lru?.bridgeTop.destroy();
      }
    }
    entry.stamp = ++this.bandStamp;
    this.routesLayer.removeChildren();
    this.routesLayer.addChild(entry.routes);
    this.bridgeTopLayer.removeChildren();
    this.bridgeTopLayer.addChild(entry.bridgeTop);
    this.applyVehicleVisibility();
    this.applyAirBand();
  }

  /** Vehicles declutter with the ribbons: sub-pixel traffic at the far
   *  band is pure noise (and wasted frame time), so it hides. */
  private applyVehicleVisibility(): void {
    const show = !this.gridViewOn && (this.zoomKey?.band ?? 2) >= 1;
    this.roadVehicleLayer.visible = show;
    this.boatLayer.visible = show;
  }

  /** Airports that exist on the active map (tutorial mini-maps have none,
   *  so their skies stay empty). */
  private airports(): typeof AIRPORTS {
    const map = this.map;
    if (!map) return [];
    return AIRPORTS.filter((a) => a.x < map.width && a.y < map.height);
  }

  /** Planes declutter IN from the mid band outward; the static flight-arc
   *  dashes rebuild per band so their screen-px floors stay honest. */
  private applyAirBand(): void {
    const airports = this.airports();
    const show = airports.length > 0 && (this.zoomKey?.band ?? 2) <= AIR_MAX_BAND;
    this.airLayer.visible = show;
    if (!show) return;
    const scale = this.zoomKey?.scale ?? this.world.scale.x;
    this.airArcsG.clear();
    emitFlightArcs(airports, scale, (pts, color, alpha) => {
      this.airArcsG.poly(pts).fill({ color, alpha });
    });
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
          this.boatLayer.addChild(hull);
          this.vehicles.push({
            path,
            s: rnd() * path.total,
            dir: rnd() < 0.5 ? 1 : -1,
            speed: 0.5 + rnd() * 0.4,
            g: hull,
            cars: [],
            kind: 'boat',
            len: L,
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
          this.roadVehicleLayer.addChild(loco);
          for (let k = 0; k < 3; k++) {
            const c = mk(false);
            this.roadVehicleLayer.addChild(c);
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
        this.roadVehicleLayer.addChild(gg);
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
    if (!this.roadVehicleLayer.visible && !this.boatLayer.visible) return;
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
        // over water, road vehicles ride at the bridge deck's height
        const lift = p.water && v.kind !== 'boat' ? deckLiftWorldPx(v.path.kind) : 0;
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
    this.applyZoomBand();
    // the living world (traffic, turbines, flow dashes, aircraft) runs at
    // the sim-clock speed so motion matches time: 0 freezes, 16x whirs.
    const mdt = dt * this.simSpeed;
    this.stepVehicles(mdt);
    this.stepWakes();
    this.stepAir(mdt);
    this.stepRotors(mdt);
    this.stepFlow(mdt);
    this.stepPulses(dt);
    // atmosphere/grade easing + attention pins stay on real time (a paused
    // game still settles the dusk wash and pulses its "look here" rings)
    this.stepAtmosphere(dt);
    this.bobPhase += dt;
    // the hero-landmark rim-light rides the glow layer (built once when the
    // map loaded); steady warm edge keyed only to the eased grade glow — no
    // pulse/sweep (those read as electricity, owner playtest 2026-06-13)
    this.drawGleam(this.grade?.glow ?? 0);
    {
      // labels: visible zoomed out, gone close in, each held at a CONSTANT
      // on-screen px floor. The layer rides the world scale `sc`, so a
      // child scaled to k renders at 64·k·sc px on screen; solving for the
      // target gives k = (targetPx/64)/sc — the old `*0.25` collapsed every
      // label to a quarter of its asked size (towns ~3.75 px, illegible).
      const sc = this.world.scale.x;
      const alpha = Math.max(0, Math.min(1, (0.3 - sc) / 0.08));
      this.labelLayer.visible = alpha > 0.02;
      if (this.labelLayer.visible) {
        this.labelLayer.alpha = alpha;
        const inv = 1 / Math.max(sc, 1e-6);
        // villages fade out one band before towns (progressive disclosure):
        // at far zoom the country-scale view shows only LONDON + big towns,
        // like the reference map. 0 at sc≤0.12, full by sc≥0.2.
        const villageAlpha = Math.max(0, Math.min(1, (sc - 0.12) / 0.08));
        // landmark-class names (Heathrow/Wembley/the O2…) are gated even
        // tighter — they stay OFF the far whole-region overview entirely and
        // only fade in at mid/close zoom, so the opening overview shows just
        // town names (owner playtest, 2026-06-13). 0 at sc≤0.20, full by
        // sc≥0.28 — a full band inside the town band.
        const landmarkAlpha = Math.max(0, Math.min(1, (sc - 0.2) / 0.08));
        // measured on-screen half-extents, for the overlap declutter
        const boxes: Array<{ l: MapLabel; hw: number; hh: number; show: boolean }> = [];
        for (const l of this.labels) {
          const k = (l.targetPx / 64) * inv;
          l.t.scale.set(k);
          const base = l.landmark ? landmarkAlpha : l.village ? villageAlpha : 1;
          l.t.alpha = base;
          if (base <= 0.02) {
            l.t.visible = false;
            continue;
          }
          l.t.visible = true;
          // world-px half-extents of the text box at this scale (t.width
          // already includes the child scale and lives in world px)
          boxes.push({ l, hw: l.t.width / 2, hh: l.t.height / 2, show: true });
        }
        // priority declutter: sort important-first, hide any lower box whose
        // screen rect overlaps an already-shown higher one.
        boxes.sort((a, b) => b.l.priority - a.l.priority);
        for (let i = 0; i < boxes.length; i++) {
          const bi = boxes[i]!;
          for (let j = 0; j < i; j++) {
            const bj = boxes[j]!;
            if (!bj.show) continue;
            if (
              Math.abs(bi.l.cx - bj.l.cx) < bi.hw + bj.hw &&
              Math.abs(bi.l.cy - bj.l.cy) < bi.hh + bj.hh
            ) {
              bi.show = false;
              break;
            }
          }
          if (!bi.show) bi.l.t.visible = false;
        }
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

  /** P6: foam V-wakes trailing the barges — one Graphics rebuilt per
   *  frame, ONLY while boats are visible at a band that shows wakes
   *  (Z2+); the emitter caps the quad count. */
  private stepWakes(): void {
    if (!this.boatLayer.visible || (this.zoomKey?.band ?? 2) < 2) {
      this.wakeG.clear();
      return;
    }
    this.wakeG.clear();
    const boats: WakeBoat[] = [];
    for (const v of this.vehicles) {
      if (v.kind !== 'boat') continue;
      const p = this.pointAt(v.path, v.s);
      if (!p) continue;
      const lane = 4 * RES * v.dir;
      boats.push({
        x: p.x - p.ny * lane,
        y: p.y + p.nx * lane,
        nx: p.nx * v.dir,
        ny: p.ny * v.dir,
        size: v.len ?? 10 * RES,
      });
    }
    emitBoatWakes(boats, (pts, alpha) => {
      this.wakeG.poly(pts).fill({ color: WAKE_COLOR, alpha });
    });
  }

  /** P7: the air fleet — deterministic positions off the animation clock
   *  (pure functions, no RNG), redrawn per frame only while the layer is
   *  visible at the band. A handful of polys. */
  private stepAir(dt: number): void {
    this.airTime += dt;
    if (!this.airLayer.visible) return;
    this.airPlanesG.clear();
    emitPlanes(this.airports(), this.airTime, this.world.scale.x, (pts, color, alpha) => {
      this.airPlanesG.poly(pts).fill({ color, alpha });
    });
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
      this.applyTrim(s, 'van');
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
          this.ghostG.fill({ color: ok ? this.okColor : this.dangerColor, alpha: 0.3 });
          this.diamond(this.ghostG, ghost.x + dx, ghost.y + dy, 1.0);
          this.ghostG.stroke({ color: ok ? this.okColor : this.dangerColor, width: 2 * RES, alpha: 0.9 });
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
          this.applyTrim(s, ghost.sprite);
          s.alpha = 0.65;
          this.world.addChild(s);
          this.ghostSprite = s;
        }
      }
    } else if (ghost.kind === 'line') {
      const a = this.tileCentre(ghost.ax, ghost.ay);
      const b = this.tileCentre(ghost.bx, ghost.by);
      const color = ghost.ok ? this.levelColor[ghost.level] : this.dangerColor;
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
      this.ghostG.stroke({ color: this.levelColor[ghost.level], width: 3 * RES, alpha: 1 });
    }
  }

  private rebuildAssetSprites(assets: PlacedAsset[], simTimeMin: number): void {
    this.assetLayer.removeChildren().forEach((c) => c.destroy());
    this.rotors = [];
    this.drawSubRings(assets);
    this.drawBloom(assets);
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
          this.applyTrim(s, PYLON_SPRITE[a.level]);
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
      // capacity-scaled farms (GenAsset.mw stamped at award): one sprite
      // per derived claimed tile — solar tiles into a field array, wind
      // spreads a turbine pair per claimed tile, rotors spun live
      if (!building && a.kind === 'gen' && a.mw !== undefined && isFarmGen(a.gen) && map) {
        for (const i of farmClaimTiles(map, a.gen, a.x, a.y, a.mw)) {
          const tx = i % map.width;
          const ty = Math.floor(i / map.width);
          const s = new Sprite(tex);
          const c = this.tileCentre(tx, ty);
          s.position.set(c.x - HALF_W, c.y + HALF_H - CELL_H);
          if (name) this.applyTrim(s, name);
          s.zIndex = tx + ty;
          this.assetLayer.addChild(s);
          if (a.gen === 'windOnshore' || a.gen === 'windOffshore') {
            this.addWindRotors(a.id, a.gen, c, tx + ty);
          }
        }
        continue;
      }
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
      if (name) this.applyTrim(s, name);
      s.zIndex = a.x + fw - 1 + a.y + fh - 1;
      this.assetLayer.addChild(s);

      if (!building && a.kind === 'gen' && (a.gen === 'windOnshore' || a.gen === 'windOffshore')) {
        this.addWindRotors(a.id, a.gen, c, a.x + a.y);
      }
    }
  }

  /** Live-spinning rotors over a baked turbine tile centred at `c`. */
  private addWindRotors(
    assetId: number,
    gen: 'windOnshore' | 'windOffshore',
    c: { x: number; y: number },
    z: number,
  ): void {
    // the rotor hub offsets are measured against the turbine sprite's
    // UNtrimmed canvas origin, so add that sprite's trim back in
    const wo = this.frameOffset.get(gen === 'windOffshore' ? 'gen_windoff' : 'gen_windon');
    for (const spec of WIND_HUBS[gen === 'windOffshore' ? 'offshore' : 'onshore']) {
      const [hx, hy] = windHubOffset(spec);
      const rotor = new Graphics() as RotorG;
      const len = spec.bladePx * RES;
      for (let b = 0; b < 3; b++) {
        const ang = (b * 2 * Math.PI) / 3;
        rotor.moveTo(0, 0).lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      }
      rotor.stroke({ color: 0xf4f1ea, width: 2.2 * RES, cap: 'round' });
      rotor.circle(0, 0, 2.6 * RES).fill(0xff8a1e);
      rotor.position.set(c.x - HALF_W + hx + (wo?.ox ?? 0), c.y + HALF_H - CELL_H + hy + (wo?.oy ?? 0));
      rotor.scale.y = 0.92;
      rotor.zIndex = z + 0.1;
      rotor.spin = 1;
      this.assetLayer.addChild(rotor);
      this.rotors.push({ assetId, g: rotor });
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
        this.subRingsG.stroke({ color: this.levelColor[level], width: 1.8 * RES, alpha: 0.75 });
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
      let color = tripped ? 0x4c4a5c : loading > 0.9 ? this.overloadColor : this.levelColor[a.level];
      let width = LEVEL_WIDTH[a.level];
      if (this.overlayMode === 'headroom' && !tripped) {
        // spare capacity reads as colour: green = lots, red = none
        const t = Math.max(0, Math.min(1, loading));
        const lerp = (a0: number, b0: number): number => Math.round(a0 + (b0 - a0) * t);
        const g = this.heatLo;
        const r = this.heatHi;
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

  /** Nudge a just-positioned sprite by its atlas trim offset, so the
   *  4-side-trimmed frame lands exactly where the untrimmed canvas would. */
  private applyTrim(s: Sprite, name: string): void {
    const o = this.frameOffset.get(name);
    if (o) s.position.set(s.position.x + o.ox, s.position.y + o.oy);
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
      this.frameOffset.set(name, { ox: f.ox, oy: f.oy });
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
          this.applyLockClamp();
        }
        pinchDist = dist;
        return;
      }
      if (this.dragging) {
        this.world.x += e.clientX - this.lastPointer.x;
        this.world.y += e.clientY - this.lastPointer.y;
        this.dragTravel += Math.abs(e.clientX - this.lastPointer.x) + Math.abs(e.clientY - this.lastPointer.y);
        this.lastPointer = { x: e.clientX, y: e.clientY };
        this.applyLockClamp();
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
        this.applyLockClamp();
      },
      { passive: false },
    );
  }

  destroy(): void {
    this.destroyed = true;
    // cached band Graphics may not be attached to the stage — free them
    for (const e of this.bandCache.values()) {
      if (!e.routes.destroyed) e.routes.destroy();
      if (!e.bridgeTop.destroyed) e.bridgeTop.destroy();
    }
    this.bandCache.clear();
    if (this.app.renderer) this.app.destroy(true);
  }
}

/** 0xRRGGBB → component object (for the heatmap lerp). */
function rgbOf(n: number): { r: number; g: number; b: number } {
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Accumulate consecutive same-style ribbon polys into one Graphics fill
 *  call — the emitter streams thousands of small quads; batching keeps the
 *  Graphics command list (and rebuild time) sane. */
function batchedFill(pick: (layer: RibbonLayer) => Graphics): {
  poly: (pts: number[], color: number, alpha: number, layer: RibbonLayer) => void;
  flush: () => void;
} {
  let g: Graphics | undefined;
  let color = -1;
  let alpha = -1;
  const flush = (): void => {
    if (g && color >= 0) g.fill({ color, alpha });
    g = undefined;
    color = -1;
    alpha = -1;
  };
  return {
    poly: (pts, c, a, layer) => {
      const target = pick(layer);
      if (target !== g || c !== color || a !== alpha) {
        flush();
        g = target;
        color = c;
        alpha = a;
      }
      target.poly(pts);
    },
    flush,
  };
}

/** Soft radial frame vignette baked once to a small canvas; the sprite is
 *  stretched to the screen and its alpha graded per frame. */
function makeVignetteTexture(): Texture {
  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.EMPTY;
  const grad = ctx.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.32,
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.72,
  );
  grad.addColorStop(0, 'rgba(10, 8, 28, 0)');
  grad.addColorStop(0.7, 'rgba(10, 8, 28, 0.45)');
  grad.addColorStop(1, 'rgba(10, 8, 28, 1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return Texture.from(canvas);
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
