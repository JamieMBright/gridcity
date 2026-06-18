// The tiny always-visible affordance that brings the HUD back after Spacebar
// hid it (owner, 2026-06-18: "Add a tiny always-visible affordance to bring
// it back."). A small dusk pill pinned bottom-centre — clicking it or
// pressing Space again restores the full HUD. Kept deliberately minimal so a
// "clean map" really does read as clean.

import { useAppStore } from '../app/store';
import { theme } from './theme';
import { IconBolt, IconExpand } from './icons';

export function HudRevealTab(): React.ReactElement {
  const setHudHidden = useAppStore((s) => s.setHudHidden);
  return (
    <button
      aria-label="show HUD"
      title="Show the HUD (Space)"
      onClick={() => setHudHidden(false)}
      className="ec-anim"
      style={{
        position: 'absolute',
        bottom: 'calc(10px + var(--sai-b))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 13px',
        borderRadius: 999,
        border: '1px solid rgba(141, 151, 180, 0.22)',
        background: 'rgba(15, 20, 44, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 8px 22px rgba(5, 7, 16, 0.4)',
        color: theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        letterSpacing: '0.03em',
        cursor: 'pointer',
        animation: 'ec-fade-in 0.4s ease both',
      }}
    >
      <IconBolt size={14} color={theme.orange} />
      <span>show HUD</span>
      <IconExpand size={13} />
      <kbd
        style={{
          marginLeft: 2,
          padding: '1px 6px',
          borderRadius: 5,
          border: '1px solid rgba(141, 151, 180, 0.3)',
          background: 'rgba(8, 11, 26, 0.5)',
          color: theme.offWhite,
          fontSize: 10,
          fontFamily: theme.font,
        }}
      >
        Space
      </kbd>
    </button>
  );
}
