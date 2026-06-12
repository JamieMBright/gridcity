// Search-to-fly: `/` focuses it; type a town, landmark or council and
// Enter flies the camera there. The map stops being a place you hunt
// through by dragging.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { getLondonMap, NAMED_PLACES, TOWNS } from '../data/londonMap';
import { panelStyle, theme } from './theme';

interface Hit {
  name: string;
  kind: string;
  x: number;
  y: number;
}

export function SearchBox() {
  const requestPan = useAppStore((s) => s.requestPan);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const places = useMemo<Hit[]>(() => {
    const map = getLondonMap();
    const out: Hit[] = [
      { name: 'London', kind: 'city', x: 128, y: 78 },
      ...TOWNS.map((t) => ({ name: t.name, kind: t.kind, x: t.x, y: t.y })),
      ...NAMED_PLACES.map((p) => ({ name: p.name, kind: 'landmark', x: p.x, y: p.y })),
    ];
    for (const c of map.councils) {
      // council centroid: cheap scan once
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let i = 0; i < map.width * map.height; i++) {
        if (map.council[i] !== c.id) continue;
        sx += i % map.width;
        sy += Math.floor(i / map.width);
        n++;
      }
      if (n > 0) out.push({ name: c.name, kind: 'council', x: Math.round(sx / n), y: Math.round(sy / n) });
    }
    return out;
  }, []);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return places.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [q, places]);

  // `/` summons the box from anywhere (except while typing elsewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (e.key === '/' && !useAppStore.getState().menuOpen) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fly = (h: Hit): void => {
    requestPan(h.x, h.y);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div style={{ position: 'absolute', top: 28, left: 196, zIndex: 5 }}>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          title="Search the map ( / )"
          style={{
            ...panelStyle,
            padding: '8px 12px',
            border: 'none',
            color: theme.slate,
            fontFamily: theme.font,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          🔍
        </button>
      )}
      {open && (
        <div style={{ ...panelStyle, padding: 6, width: 220 }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) fly(hits[0]);
              if (e.key === 'Escape') {
                setQ('');
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="fly to… (town, landmark, council)"
            aria-label="search the map"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${theme.navyLight}`,
              borderRadius: 5,
              color: theme.offWhite,
              fontFamily: theme.font,
              fontSize: 12,
              padding: '5px 8px',
              outline: 'none',
            }}
          />
          {hits.map((h) => (
            <div
              key={`${h.name}${h.x}`}
              onClick={() => fly(h)}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
                color: theme.offWhite,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>{h.name}</span>
              <span style={{ color: theme.slate, fontSize: 10 }}>{h.kind}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
