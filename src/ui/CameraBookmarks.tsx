// Camera bookmarks (ROADMAP #38). Sessions orbit a few hotspots — the
// coast wind farms, the City core, a struggling estate — and re-finding
// them by drag is friction. This is a small, self-contained floating
// control: a star button that opens a list of saved camera positions
// (tile centre + zoom). Each row jumps the main camera there; you can
// save the current view into a free slot and delete any slot. Up to six.
//
// It reaches the live MapRenderer through the registry (read getCamera(),
// call jumpToCamera()) exactly like the corner minimap does — no coupling
// to MapView's React tree, so it mounts standalone from App.tsx. Bookmarks
// persist in localStorage via the store.

import { useRef, useState } from 'react';
import { getActiveRenderer } from '../render/rendererRegistry';
import { useAppStore } from '../app/store';
import { headingStyle, panelStyle, theme } from './theme';

/** A simple star glyph — saved-view affordance, no emoji. */
function Star({ size = 13, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 21.5l1.2-6.5L2.5 9.4l6.6-.9z"
        fill={filled ? theme.gold : 'none'}
        stroke={theme.gold}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MAX_SLOTS = 6;

export function CameraBookmarks({ frame }: { frame?: React.CSSProperties } = {}) {
  const [open, setOpen] = useState(false);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const addBookmark = useAppStore((s) => s.addBookmark);
  const removeBookmark = useAppStore((s) => s.removeBookmark);
  const setToast = useAppStore((s) => s.setToast);
  // photo mode hides all chrome — this control included
  const photoMode = useAppStore((s) => s.photoMode);
  const idRef = useRef(Date.now());

  if (photoMode) return null;

  const saveCurrent = (): void => {
    const cam = getActiveRenderer()?.getCamera();
    if (!cam) {
      setToast('camera not ready');
      return;
    }
    if (bookmarks.length >= MAX_SLOTS) {
      setToast(`bookmark slots full (${MAX_SLOTS}) — delete one first`);
      return;
    }
    const id = ++idRef.current;
    addBookmark({
      id,
      name: `View ${bookmarks.length + 1}`,
      x: Math.round(cam.x * 10) / 10,
      y: Math.round(cam.y * 10) / 10,
      zoom: cam.zoom,
    });
  };

  const jump = (b: { x: number; y: number; zoom: number }): void => {
    getActiveRenderer()?.jumpToCamera(b.x, b.y, b.zoom);
  };

  if (!open) {
    return (
      <button
        aria-label="camera bookmarks"
        title="Saved camera views"
        onClick={() => setOpen(true)}
        style={{
          ...panelStyle,
          position: 'absolute',
          top: '50%',
          right: 12,
          transform: 'translateY(-60px)',
          padding: '7px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          cursor: 'pointer',
          ...frame,
        }}
      >
        <Star size={14} />
      </button>
    );
  }

  return (
    <div
      data-tour="bookmarks"
      style={{
        ...panelStyle,
        position: 'absolute',
        top: '50%',
        right: 12,
        transform: 'translateY(-50%)',
        padding: 8,
        width: 168,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...frame,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span style={headingStyle}>camera views</span>
        <button
          aria-label="close bookmarks"
          onClick={() => setOpen(false)}
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

      {bookmarks.length === 0 && (
        <div style={{ color: theme.slate, fontSize: 11, lineHeight: 1.4 }}>
          No saved views yet. Frame a spot, then save the current camera.
        </div>
      )}

      {bookmarks.map((b) => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => jump(b)}
            title={`Jump to ${b.name}`}
            style={{
              flex: 1,
              textAlign: 'left',
              background: theme.navyLight,
              border: `1px solid rgba(245,196,105,0.14)`,
              borderRadius: 6,
              color: theme.offWhite,
              cursor: 'pointer',
              padding: '5px 8px',
              fontSize: 12,
              fontFamily: theme.font,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Star size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.name}
            </span>
          </button>
          <button
            aria-label={`delete ${b.name}`}
            title="Delete"
            onClick={() => removeBookmark(b.id)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.slate,
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={saveCurrent}
        disabled={bookmarks.length >= MAX_SLOTS}
        title="Save the current camera as a new view"
        style={{
          marginTop: 2,
          background: bookmarks.length >= MAX_SLOTS ? 'transparent' : theme.orange,
          border: `1px solid ${theme.orange}`,
          borderRadius: 6,
          color: bookmarks.length >= MAX_SLOTS ? theme.slate : theme.night,
          cursor: bookmarks.length >= MAX_SLOTS ? 'default' : 'pointer',
          padding: '6px 8px',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: theme.font,
        }}
      >
        + save current view
      </button>
    </div>
  );
}
