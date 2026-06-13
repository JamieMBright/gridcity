// Photo mode (ROADMAP #48). The art deserves clean captures — landmarks
// at golden hour, the coast turbines turning, a district glowing as it
// powers up. This is a self-contained control: a camera button arms photo
// mode, which sets store.photoMode so every HUD/chrome component hides
// itself (App.tsx + each panel honour the flag), pins a warm golden-hour
// grade on the renderer for the shot, and shows only a slim capture bar.
// Capture pulls the live Pixi canvas to a PNG and downloads it; exit
// restores the live atmosphere and the chrome.
//
// Reaches the MapRenderer through the registry like the minimap/bookmarks
// — no coupling to MapView's React tree, so it mounts standalone.

import { useEffect } from 'react';
import { getActiveRenderer } from '../render/rendererRegistry';
import { useAppStore } from '../app/store';
import { panelStyle, theme } from './theme';

/** A minimal camera/aperture glyph. */
function CameraIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect
        x={2.5}
        y={6}
        width={19}
        height={13}
        rx={2.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path d="M8 6l1.6-2.4h4.8L16 6" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx={12} cy={12.5} r={3.4} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

/** A warm late-golden-hour minute for the photo grade (≈18:40). */
const GOLDEN_HOUR_MIN = 18 * 60 + 40;

export function PhotoMode() {
  const photoMode = useAppStore((s) => s.photoMode);
  const setPhotoMode = useAppStore((s) => s.setPhotoMode);
  const setToast = useAppStore((s) => s.setToast);

  // entering photo mode pins the golden-hour grade; leaving restores the
  // live sim atmosphere (overrideAtmosphere with no args clears the pin).
  useEffect(() => {
    const r = getActiveRenderer();
    if (!r) return;
    if (photoMode) {
      r.overrideAtmosphere(GOLDEN_HOUR_MIN, { cloud: 0.18, wind: 0.35 });
    } else {
      r.overrideAtmosphere();
    }
    return () => {
      // safety: if this unmounts while pinned, drop the override
      getActiveRenderer()?.overrideAtmosphere();
    };
  }, [photoMode]);

  // Esc exits photo mode (the global handler ignores it once we own it)
  useEffect(() => {
    if (!photoMode) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPhotoMode(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [photoMode, setPhotoMode]);

  const capture = async (): Promise<void> => {
    const r = getActiveRenderer();
    if (!r) return;
    const blob = await r.capturePhoto();
    if (!blob) {
      setToast('capture failed');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `electricity-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setToast('photo saved');
  };

  if (!photoMode) {
    return (
      <button
        aria-label="photo mode"
        title="Photo mode — clean screenshot"
        onClick={() => setPhotoMode(true)}
        style={{
          ...panelStyle,
          position: 'absolute',
          top: '50%',
          right: 12,
          transform: 'translateY(-12px)',
          padding: '7px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: theme.gold,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        <CameraIcon size={15} />
      </button>
    );
  }

  // In photo mode: only this slim bar shows; all other chrome is hidden by
  // honouring store.photoMode. A faint corner framing crop sells the mode.
  return (
    <div
      data-photo-bar
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* gentle tilt-shift-ish frame: soft inner vignette + thin gold inset */}
      <div
        style={{
          position: 'absolute',
          inset: 10,
          border: '1px solid rgba(245,196,105,0.22)',
          borderRadius: 8,
          boxShadow: 'inset 0 0 120px rgba(8,10,24,0.45)',
        }}
      />
      <div
        style={{
          ...panelStyle,
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: theme.gold, fontSize: 11, letterSpacing: 1.2 }}>PHOTO MODE</span>
        <button
          onClick={() => void capture()}
          title="Capture PNG"
          style={{
            background: theme.orange,
            border: `1px solid ${theme.orange}`,
            borderRadius: 6,
            color: theme.night,
            cursor: 'pointer',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: theme.font,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CameraIcon size={13} />
          capture
        </button>
        <button
          onClick={() => setPhotoMode(false)}
          title="Exit photo mode (Esc)"
          style={{
            background: 'transparent',
            border: `1px solid rgba(245,196,105,0.2)`,
            borderRadius: 6,
            color: theme.offWhite,
            cursor: 'pointer',
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: theme.font,
          }}
        >
          exit
        </button>
      </div>
    </div>
  );
}
