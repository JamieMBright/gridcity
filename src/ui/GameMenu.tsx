// The in-game pause MENU (owner playtest, 2026-06-13): Escape — when it is
// NOT cancelling an active line build or clearing a selection — opens this
// small lofi modal, as does clicking the ELECTRICITY wordmark. It offers
// Save (a manual autosave) and Quit to the main menu.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { requestSave } from '../app/workerBridge';
import { panelStyle, theme } from './theme';

const menuBtn = (primary: boolean): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  marginTop: 10,
  padding: '11px 16px',
  borderRadius: 10,
  border: `1px solid ${primary ? theme.orange : 'rgba(125, 135, 180, 0.28)'}`,
  background: primary ? theme.orange : 'transparent',
  color: primary ? theme.navy : theme.offWhite,
  fontFamily: theme.font,
  fontSize: 14,
  fontWeight: primary ? 700 : 500,
  letterSpacing: '0.02em',
  cursor: 'pointer',
});

export function GameMenu() {
  const open = useAppStore((s) => s.gameMenuOpen);
  const setOpen = useAppStore((s) => s.setGameMenuOpen);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const [saved, setSaved] = useState(false);
  if (!open) return null;

  const close = (): void => {
    setSaved(false);
    setOpen(false);
  };
  const save = (): void => {
    requestSave();
    setSaved(true);
  };
  const quit = (): void => {
    // a manual save before leaving so nothing is lost, then back to the
    // start menu (which the StartMenu component renders when menuOpen)
    requestSave();
    setOpen(false);
    setMenuOpen(true);
  };

  return (
    <div
      role="dialog"
      aria-label="game menu"
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}b8`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          width: 'min(320px, 92vw)',
          padding: '22px 22px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 4, fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>
          <span style={{ color: theme.orange }}>ELECTRI</span>
          <span style={{ color: theme.slate }}>CITY</span>
        </div>
        <div style={{ color: theme.slate, fontSize: 12, marginBottom: 12 }}>game paused</div>

        <button style={menuBtn(true)} onClick={() => save()}>
          {saved ? 'saved ✓' : 'save game'}
        </button>
        <button style={menuBtn(false)} onClick={quit}>
          quit to main menu
        </button>
        <button
          style={{ ...menuBtn(false), marginTop: 14, border: 'none', color: theme.slate, fontSize: 12 }}
          onClick={close}
        >
          resume × close
        </button>
      </div>
    </div>
  );
}
