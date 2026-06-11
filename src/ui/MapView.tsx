import { useEffect, useRef } from 'react';
import { getLondonMap } from '../data/londonMap';
import { MapRenderer, type Ghost } from '../render/MapRenderer';
import { useAppStore, type Tool } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { assetAtTile, checkBuild, type BuildSpec } from '../sim/commands';
import { ANNUITY_FACTOR, GENS, LINES, SUBS } from '../sim/catalog';
import type { PlacedAsset } from '../sim/assets';
import { assetLevels } from '../sim/assets';

function specFor(tool: Tool, x: number, y: number, assets: PlacedAsset[]): BuildSpec | undefined {
  if (tool.t === 'gen') return { kind: 'gen', gen: tool.gen, x, y };
  if (tool.t === 'sub') return { kind: 'sub', sub: tool.sub, x, y };
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
  return LINES[spec.level].opexFrac;
}

function specLabel(spec: BuildSpec): string {
  if (spec.kind === 'gen') return GENS[spec.gen].name;
  if (spec.kind === 'sub') return SUBS[spec.sub].name;
  return `${spec.level} kV ${spec.build === 'underground' ? 'cable' : 'line'}`;
}

function handleTileClick(x: number, y: number): void {
  const { tool, snapshot, setTool, setToast } = useAppStore.getState();
  const assets = snapshot?.assets ?? [];

  switch (tool.t) {
    case 'inspect':
      return;
    case 'gen':
    case 'sub': {
      const spec = specFor(tool, x, y, assets);
      if (spec) sendCommand({ type: 'build', spec });
      return;
    }
    case 'demolish': {
      const a = assetAtTile(assets, x, y);
      if (a) sendCommand({ type: 'demolish', assetId: a.id });
      else setToast('nothing to demolish here');
      return;
    }
    case 'line': {
      const a = assetAtTile(assets, x, y);
      if (!a) {
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
    renderer.onTileClick = (tile) => handleTileClick(tile.x, tile.y);
    void renderer.init(host, getLondonMap());
    return () => {
      rendererRef.current = undefined;
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (snapshot) {
      rendererRef.current?.updateDynamic(snapshot.assets, snapshot.branches, snapshot.coverage);
    }
  }, [snapshot]);

  useEffect(() => {
    rendererRef.current?.setGridView(gridView);
  }, [gridView]);

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
      };
    } else {
      const sprite =
        spec.kind === 'gen'
          ? { gasCCGT: 'gen_gas', nuclear: 'gen_nuclear', solarFarm: 'gen_solar', windOnshore: 'gen_windon', windOffshore: 'gen_windoff' }[spec.gen]
          : { bulk: 'sub_bulk', grid: 'sub_grid', dist: 'sub_dist' }[spec.sub];
      ghost = {
        kind: 'tile',
        x: hovered.x,
        y: hovered.y,
        ok: check.ok,
        sprite,
        radius: spec.kind === 'sub' ? SUBS[spec.sub].serviceRadius : undefined,
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
