import { useEffect, useRef } from 'react';
import { getLondonMap } from '../data/londonMap';
import { MapRenderer } from '../render/MapRenderer';
import { useAppStore } from '../app/store';

export function MapView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const setHoveredTile = useAppStore((s) => s.setHoveredTile);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new MapRenderer();
    renderer.onHover = (tile) => setHoveredTile(tile);
    void renderer.init(host, getLondonMap());
    return () => renderer.destroy();
  }, [setHoveredTile]);

  return (
    <div
      ref={hostRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'grab' }}
    />
  );
}
