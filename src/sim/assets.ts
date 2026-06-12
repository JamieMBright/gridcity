// Player-placed assets and their derivation into a solvable Network.
// Bus/branch ids are deterministic functions of asset ids so the solver's
// results can always be mapped back to assets.

import { GENS, LINES, SUBS, TX_PAIR, type GenType, type LineBuild, type SubType } from './catalog';
import type { Branch, Bus, Network, VoltageLevel } from './grid/types';

export type PlacedAsset = GenAsset | SubAsset | LineAsset | DepotAsset;

/** Field-operations depot: not electrical, stations repair vans. */
export interface DepotAsset {
  id: number;
  kind: 'depot';
  x: number;
  y: number;
}

export interface GenAsset {
  id: number;
  kind: 'gen';
  gen: GenType;
  x: number;
  y: number;
  /** Flexible (curtailable) connection — cheaper, no constraint comp. */
  flex?: boolean | undefined;
  /** Customer-owned (arrived via a connection application). */
  customer?: boolean | undefined;
  /** Built and owned by a market developer (awarded tender bid). */
  developer?: number | undefined;
  /** Game-minute the plant is commissioned (planning + construction).
   *  Until then it exists on the network but generates nothing. */
  liveAtMin?: number | undefined;
}

export interface SubAsset {
  id: number;
  kind: 'sub';
  sub: SubType;
  x: number;
  y: number;
  /** Fitted transformer size, MVA (radius subs only; defaults to the
   *  spec's txRatingMW). Catchment reach and capacity scale with it. */
  mva?: number | undefined;
  /** Auto-reinforce through the MVA steps as demand grows (default on;
   *  manual resizing switches it off). */
  mvaAuto?: boolean | undefined;
  /** Owned by an independent DNO (new-build estates): can't be
   *  demolished or resized, and its capex never lands on your bill. */
  idno?: boolean | undefined;
}

/** Effective fitted MVA of a substation. */
export function subMva(a: SubAsset): number {
  return a.mva ?? SUBS[a.sub].txRatingMW;
}

export interface LineAsset {
  id: number;
  kind: 'line';
  level: VoltageLevel;
  build: LineBuild;
  /** Endpoint asset ids. */
  a: number;
  b: number;
  lengthTiles: number;
  capexK: number;
  /** Support tile indices along the route (pylons at 400/132 kV, wooden
   *  poles at 33 kV). Empty for underground cables. */
  pylons?: number[] | undefined;
}

const LEVEL_SLOT: Record<VoltageLevel, number> = { 400: 0, 132: 1, 33: 2 };
/** Id stride per asset: 3 bus slots + line slot + up to 2 tx pairs. */
const STRIDE = 8;

/** Stable bus id for an asset's bus at a voltage level. */
export function busId(assetId: number, level: VoltageLevel): number {
  return assetId * STRIDE + (LEVEL_SLOT[level] ?? 0);
}

/** Stable branch id for a line asset / a substation's transformer pair
 *  (multi-winding subs chain one pair per voltage step). */
export function lineBranchId(assetId: number): number {
  return assetId * STRIDE + 3;
}
export function txBranchId(assetId: number, pairIx = 0): number {
  return assetId * STRIDE + 4 + pairIx;
}

/** Owning asset id of any bus or branch id. */
export function assetOfId(id: number): number {
  return Math.floor(id / STRIDE);
}

/** Voltage levels present on an asset (gen terminal / sub buses). */
export function assetLevels(asset: PlacedAsset): VoltageLevel[] {
  if (asset.kind === 'gen') return [GENS[asset.gen].level];
  if (asset.kind === 'sub') return SUBS[asset.sub].levels;
  return [];
}

/** Derive the solvable network from the placed assets. `lineRatingMul`
 *  scales line thermal ratings (dynamic line ratings innovation). */
export function deriveNetwork(assets: Iterable<PlacedAsset>, lineRatingMul = 1): Network {
  const buses: Bus[] = [];
  const branches: Branch[] = [];
  const byId = new Map<number, PlacedAsset>();
  for (const a of assets) byId.set(a.id, a);

  for (const a of byId.values()) {
    if (a.kind === 'gen') {
      buses.push({ id: busId(a.id, GENS[a.gen].level), x: a.x, y: a.y, level: GENS[a.gen].level });
    } else if (a.kind === 'sub') {
      const spec = SUBS[a.sub];
      for (const level of spec.levels) {
        buses.push({ id: busId(a.id, level), x: a.x, y: a.y, level });
      }
      // chain a transformer per voltage step (BSPs carry 400/132 + 132/33)
      for (let k = 0; k + 1 < spec.levels.length; k++) {
        const hi = spec.levels[k];
        const lo = spec.levels[k + 1];
        if (hi === undefined || lo === undefined) continue;
        const pair = TX_PAIR[`${hi}/${lo}`] ?? { ratingMW: spec.txRatingMW, x: spec.txX };
        branches.push({
          id: txBranchId(a.id, k),
          from: busId(a.id, hi),
          to: busId(a.id, lo),
          kind: 'transformer',
          x: pair.x,
          r: pair.x / 20,
          ratingMW: pair.ratingMW,
          inService: true,
        });
      }
    }
  }

  for (const a of byId.values()) {
    if (a.kind !== 'line') continue;
    const endA = byId.get(a.a);
    const endB = byId.get(a.b);
    if (!endA || !endB) continue; // dangling line (endpoint demolished)
    const spec = LINES[a.level];
    branches.push({
      id: lineBranchId(a.id),
      from: busId(a.a, a.level),
      to: busId(a.b, a.level),
      kind: a.build === 'underground' ? 'underground' : 'overhead',
      x: spec.xPerTile * Math.max(1, a.lengthTiles),
      r: spec.rPerTile * Math.max(1, a.lengthTiles),
      ratingMW: spec.ratingMW * lineRatingMul,
      inService: true,
    });
  }

  return { buses, branches };
}
