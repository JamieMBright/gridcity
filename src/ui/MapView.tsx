import { useEffect, useRef } from 'react';
import { getLondonMap } from '../data/londonMap';
import { MapRenderer, type Ghost, type TileHover } from '../render/MapRenderer';
import { installTestHook } from '../app/testHook';
import { useAppStore, type Tool } from '../app/store';
import { sendCommand, setWatch } from '../app/workerBridge';
import { assetAtTile, checkBuild, siteErrorAt, type BuildSpec } from '../sim/commands';
import { ANNUITY_FACTOR, DEPOT, GENS, LINES, SUBS } from '../sim/catalog';
import type { LineAsset, PlacedAsset } from '../sim/assets';
import { assetLevels } from '../sim/assets';

function specFor(tool: Tool, x: number, y: number, assets: PlacedAsset[]): BuildSpec | undefined {
  if (tool.t === 'gen') return { kind: 'gen', gen: tool.gen, x, y };
  if (tool.t === 'sub') return { kind: 'sub', sub: tool.sub, x, y };
  if (tool.t === 'depot') return { kind: 'depot', x, y };
  if (tool.t === 'line' && tool.fromAssetId !== undefined) {
    const from = assets.find((a) => a.id === tool.fromAssetId);
    if (!from || from.kind === 'line') return undefined;
    return {
      kind: 'line',
      level: tool.level,
      build: tool.build,
      ax: from.x,
      ay: from.y,
      bx: x,
      by: y,
    };
  }
  return undefined;
}

function specOpexFrac(spec: BuildSpec): number {
  if (spec.kind === 'gen') return GENS[spec.gen].opexFrac;
  if (spec.kind === 'sub') return SUBS[spec.sub].opexFrac;
  if (spec.kind === 'depot') return DEPOT.opexFrac;
  return LINES[spec.level].opexFrac;
}

function specLabel(spec: BuildSpec): string {
  if (spec.kind === 'gen') return GENS[spec.gen].name;
  if (spec.kind === 'sub') return SUBS[spec.sub].name;
  if (spec.kind === 'depot') return DEPOT.name;
  return `${spec.level} kV ${spec.build === 'underground' ? 'cable' : 'line'}`;
}

/** Distance from a point to the A→B segment, in tile units. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** The line span nearest the pointer, if it's close enough to mean it.
 *  The DRAWN conductor rides above its ground segment (pylon height +
 *  sag), which in iso screen space shifts the click by equal amounts in
 *  -x/-y tile space — so test the click at several elevations and take
 *  the best, letting the player click the wire itself, not its shadow. */
const ELEVATION_OFFSETS = [0, 0.35, 0.7, 1.05, 1.35];
function pickLine(assets: PlacedAsset[], fx: number, fy: number): LineAsset | undefined {
  const byId = new Map(assets.map((a) => [a.id, a]));
  let best: LineAsset | undefined;
  let bestD = 0.8;
  for (const l of assets) {
    if (l.kind !== 'line') continue;
    const a = byId.get(l.a);
    const b = byId.get(l.b);
    if (!a || a.kind === 'line' || !b || b.kind === 'line') continue;
    for (const e of ELEVATION_OFFSETS) {
      const d = segDist(fx + e, fy + e, a.x, a.y, b.x, b.y);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
  }
  return best;
}

function handleTileClick(tile: TileHover): void {
  const { x, y } = tile;
  const { tool, snapshot, setTool, setToast } = useAppStore.getState();
  const assets = snapshot?.assets ?? [];

  switch (tool.t) {
    case 'inspect': {
      // touch devices don't hover: a tap inspects the tile. A click on
      // an asset (or near a line span) PINS its card so its controls
      // are actually reachable; empty ground clears the pin.
      const st = useAppStore.getState();
      st.setHoveredTile({ x, y });
      const a = assetAtTile(assets, x, y);
      if (a) {
        st.setSelected({ assetId: a.id });
        return;
      }
      const line =
        tile.fx !== undefined && tile.fy !== undefined
          ? pickLine(assets, tile.fx, tile.fy)
          : undefined;
      st.setSelected(
        line ? { lineId: line.id, at: { x: tile.fx ?? x, y: tile.fy ?? y } } : {},
      );
      return;
    }
    case 'gen':
    case 'sub':
    case 'depot': {
      const spec = specFor(tool, x, y, assets);
      if (spec) {
        if (spec.kind === 'sub') spec.autoConnect = useAppStore.getState().autoConnect;
        sendCommand({ type: 'build', spec });
      }
      return;
    }
    case 'demolish': {
      const a = assetAtTile(assets, x, y);
      if (a) {
        sendCommand({ type: 'demolish', assetId: a.id });
        return;
      }
      // no structure here: a click near a span takes the line down
      const line =
        tile.fx !== undefined && tile.fy !== undefined
          ? pickLine(assets, tile.fx, tile.fy)
          : undefined;
      if (line) sendCommand({ type: 'demolish', assetId: line.id });
      else setToast('nothing to demolish here');
      return;
    }
    case 'line': {
      const a = assetAtTile(assets, x, y);
      if (!a) {
        // clicking a same-kV span tees the armed route into the circuit
        const span =
          tile.fx !== undefined && tile.fy !== undefined
            ? pickLine(assets, tile.fx, tile.fy)
            : undefined;
        if (span && span.level === tool.level && tool.fromAssetId !== undefined) {
          sendCommand({
            type: 'tee',
            lineId: span.id,
            x,
            y,
            fromAssetId: tool.fromAssetId,
            build: tool.build,
          });
          setTool({ ...tool, fromAssetId: undefined });
          return;
        }
        if (span && span.level === tool.level) {
          setToast('start from an asset, then click the circuit to tee into it');
          return;
        }
        if (span) {
          setToast(`that's a ${span.level} kV circuit — switch the line tool to match`);
          return;
        }
        setToast('lines run between substations and plants — click one');
        return;
      }
      if (!assetLevels(a).includes(tool.level)) {
        setToast(`no ${tool.level} kV bay there`);
        return;
      }
      if (tool.fromAssetId === undefined) {
        setTool({ ...tool, fromAssetId: a.id });
      } else if (tool.fromAssetId === a.id) {
        setTool({ ...tool, fromAssetId: undefined });
      } else {
        // already wired to the anchor at this level? re-anchor, don't
        // duplicate — A,B,A,C,A,D builds a clean star from the hub
        const dup = assets.some(
          (l) =>
            l.kind === 'line' &&
            l.level === tool.level &&
            ((l.a === tool.fromAssetId && l.b === a.id) ||
              (l.b === tool.fromAssetId && l.a === a.id)),
        );
        if (dup) {
          setTool({ ...tool, fromAssetId: a.id });
          setToast('already connected — starting from here');
          return;
        }
        const spec = specFor(tool, x, y, assets);
        if (spec) sendCommand({ type: 'build', spec });
        setTool({ ...tool, fromAssetId: a.id }); // chain onward from here
      }
      return;
    }
  }
}

export function MapView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | undefined>(undefined);
  const snapshot = useAppStore((s) => s.snapshot);
  const gridView = useAppStore((s) => s.gridView);
  const hovered = useAppStore((s) => s.hoveredTile);
  const tool = useAppStore((s) => s.tool);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new MapRenderer();
    rendererRef.current = renderer;
    renderer.onHover = (tile) => useAppStore.getState().setHoveredTile(tile);
    renderer.onTileClick = (tile) => handleTileClick(tile);
    renderer.onSiteClick = (site) => useAppStore.getState().requestInboxFocus(site.x, site.y);
    renderer.onJobClick = (job) => {
      // spanner pin → pin the broken asset's card: cause, ETA, fixes
      const st = useAppStore.getState();
      const asset = st.snapshot?.assets.find((a) => a.id === job.assetId);
      if (!asset) return;
      st.setTool({ t: 'inspect' });
      st.setSelected(
        asset.kind === 'line'
          ? { lineId: asset.id, at: { x: job.x, y: job.y } }
          : { assetId: asset.id },
      );
      st.requestPan(job.x, job.y);
    };
    void renderer.init(host, getLondonMap()).then(() => {
      // StrictMode double-mounts: only the surviving renderer gets the hook
      if (rendererRef.current === renderer) installTestHook(renderer);
    });
    return () => {
      rendererRef.current = undefined;
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (snapshot) {
      const r = rendererRef.current;
      // mirror sim-side town growth onto this client's map before drawing
      // (the renderer shares the map object with checkBuild/ghosts)
      r?.applyGrowth(snapshot.growth ?? []);
      r?.updateDynamic(
        snapshot.assets,
        snapshot.branches,
        snapshot.coverage,
        snapshot.fleet.vans,
        snapshot.fleet.jobs,
        snapshot.genMW,
        snapshot.simTimeMin,
        snapshot.weather.wind,
        snapshot.sites ?? [],
      );
    }
  }, [snapshot]);

  // green/red siting overlay while a build tool is armed; eligible-asset
  // rings while the line tool is armed
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.setLevelHighlight(tool.t === 'line' ? tool.level : undefined);
    if (tool.t !== 'gen' && tool.t !== 'sub' && tool.t !== 'depot') {
      r.setSuitability(undefined);
      return;
    }
    const map = getLondonMap();
    const spec =
      tool.t === 'gen'
        ? ({ kind: 'gen', gen: tool.gen } as const)
        : tool.t === 'sub'
          ? ({ kind: 'sub', sub: tool.sub } as const)
          : ({ kind: 'depot' } as const);
    const mask = new Uint8Array(map.width * map.height);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (siteErrorAt(map, spec, x, y) === undefined) mask[y * map.width + x] = 1;
      }
    }
    r.setSuitability(mask);
    return () => r.setSuitability(undefined);
  }, [tool]);

  useEffect(() => {
    rendererRef.current?.setGridView(gridView);
  }, [gridView]);

  const panTarget = useAppStore((s) => s.panTarget);
  useEffect(() => {
    if (panTarget) rendererRef.current?.panTo(panTarget.x, panTarget.y);
  }, [panTarget]);

  // grid-balance ring fence
  const highlightCouncil = useAppStore((s) => s.highlightCouncil);
  useEffect(() => {
    rendererRef.current?.setCouncilHighlight(highlightCouncil);
  }, [highlightCouncil]);

  // highlight whatever the pinned inspector card is talking about, and
  // have the worker record its performance history for the sparkline
  const selectedAsset = useAppStore((s) => s.selectedAsset);
  const selectedLine = useAppStore((s) => s.selectedLine);
  useEffect(() => {
    setWatch(selectedAsset ?? selectedLine);
  }, [selectedAsset, selectedLine]);
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const assets = snapshot?.assets ?? [];
    if (selectedAsset !== undefined) {
      const a = assets.find((x) => x.id === selectedAsset);
      r.setSelection(a && a.kind !== 'line' ? { kind: 'tile', x: a.x, y: a.y } : undefined);
      return;
    }
    if (selectedLine !== undefined) {
      const l = assets.find((x) => x.id === selectedLine);
      if (l && l.kind === 'line') {
        const a = assets.find((x) => x.id === l.a);
        const b = assets.find((x) => x.id === l.b);
        if (a && a.kind !== 'line' && b && b.kind !== 'line') {
          r.setSelection({ kind: 'line', ax: a.x, ay: a.y, bx: b.x, by: b.y });
          return;
        }
      }
    }
    r.setSelection(undefined);
  }, [selectedAsset, selectedLine, snapshot]);

  // ghost preview + quoted cost
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const setGhostInfo = useAppStore.getState().setGhostInfo;
    const map = getLondonMap();
    const assets = snapshot?.assets ?? [];

    if (!hovered || tool.t === 'inspect') {
      r.setGhost(undefined);
      setGhostInfo(undefined);
      return;
    }

    if (tool.t === 'demolish') {
      const a = assetAtTile(assets, hovered.x, hovered.y);
      r.setGhost(
        a && a.kind !== 'line' ? { kind: 'tile', x: a.x, y: a.y, ok: false } : undefined,
      );
      setGhostInfo(undefined);
      return;
    }

    if (tool.t === 'line' && tool.fromAssetId === undefined) {
      const a = assetAtTile(assets, hovered.x, hovered.y);
      const ok = a !== undefined && assetLevels(a).includes(tool.level);
      r.setGhost(ok ? { kind: 'endpoint', x: hovered.x, y: hovered.y, level: tool.level } : undefined);
      setGhostInfo(undefined);
      return;
    }

    const spec = specFor(tool, hovered.x, hovered.y, assets);
    if (!spec) {
      r.setGhost(undefined);
      setGhostInfo(undefined);
      return;
    }
    const check = checkBuild(map, assets, spec);
    let ghost: Ghost;
    if (spec.kind === 'line') {
      ghost = {
        kind: 'line',
        ax: spec.ax,
        ay: spec.ay,
        bx: spec.bx,
        by: spec.by,
        ok: check.ok,
        level: spec.level,
        pylons: check.pylons,
      };
    } else {
      const sprite =
        spec.kind === 'gen'
          ? { gasCCGT: 'gen_gas', gasPeaker: 'gen_peaker', coal: 'gen_coal', nuclear: 'gen_nuclear', solarFarm: 'gen_solar', windOnshore: 'gen_windon', windOffshore: 'gen_windoff', tidal: 'gen_tidal', biomass: 'gen_biomass', battery: 'gen_battery' }[spec.gen]
          : spec.kind === 'sub'
            ? { bulk: 'sub_bulk', grid: 'sub_grid', dist: 'sub_dist', pole: 'sub_pole', vault: 'sub_vault', tee: 'sub_dist' }[spec.sub]
            : 'depot';
      ghost = {
        kind: 'tile',
        x: hovered.x,
        y: hovered.y,
        ok: check.ok,
        sprite,
        radius: spec.kind === 'sub' ? SUBS[spec.sub].serviceRadius : undefined,
        fp:
          spec.kind === 'gen'
            ? GENS[spec.gen].footprint
            : spec.kind === 'sub'
              ? SUBS[spec.sub].footprint
              : undefined,
      };
    }
    r.setGhost(ghost);

    const served = snapshot?.bill.servedCustomers ?? 0;
    const yearlyK = check.capexK * (ANNUITY_FACTOR + specOpexFrac(spec));
    useAppStore.getState().setGhostInfo({
      label: specLabel(spec),
      capexK: check.capexK,
      billImpactYr: served > 0 && check.ok ? (yearlyK * 1000) / served : undefined,
      ok: check.ok,
      error: check.error,
    });
  }, [hovered, tool, snapshot]);

  return (
    <div
      ref={hostRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'grab' }}
    />
  );
}
