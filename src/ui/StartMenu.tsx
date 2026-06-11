// The front door: continue a saved campaign, start fresh, or take the
// tutorial. First click is also our user gesture for starting the audio.

import { useAppStore } from '../app/store';
import { newGameCommand } from '../app/workerBridge';
import { startMusic } from '../audio/audio';
import { localStorageStore } from '../persistence/localStorageStore';
import { panelStyle, theme } from './theme';

const bigBtn = (primary: boolean): React.CSSProperties => ({
  display: 'block',
  width: 260,
  margin: '10px auto 0',
  padding: '10px 0',
  borderRadius: 8,
  border: `1px solid ${primary ? theme.orange : theme.navyLight}`,
  background: primary ? theme.orange : 'transparent',
  color: primary ? theme.navy : theme.offWhite,
  fontFamily: theme.font,
  fontSize: 15,
  fontWeight: primary ? 800 : 400,
  cursor: 'pointer',
});

export function StartMenu() {
  const menuOpen = useAppStore((s) => s.menuOpen);
  const ready = useAppStore((s) => s.workerStatus === 'ready' && s.snapshot !== undefined);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const setTutorialStep = useAppStore((s) => s.setTutorialStep);
  if (!menuOpen) return null;
  const hasSave = localStorageStore.load() !== undefined;

  const begin = (tutorial: boolean, fresh: boolean): void => {
    startMusic();
    if (fresh) newGameCommand();
    setTutorialStep(tutorial ? 0 : undefined);
    setMenuOpen(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}cc`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <div style={{ ...panelStyle, padding: '36px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.04em' }}>
          <span style={{ color: theme.orange }}>ELECTRI</span>
          <span style={{ color: theme.gold }}>⚡</span>
          <span style={{ color: theme.slate }}>CITY</span>
        </div>
        <div style={{ color: theme.slate, marginTop: 6, fontSize: 13 }}>
          power a stylized London — keep the lights on, the bills down, the carbon low
        </div>
        {!ready && <div style={{ color: theme.gold, marginTop: 18 }}>starting the grid…</div>}
        {ready && (
          <>
            {hasSave && (
              <button style={bigBtn(true)} onClick={() => begin(false, false)}>
                continue
              </button>
            )}
            <button style={bigBtn(!hasSave)} onClick={() => begin(false, true)}>
              new game
            </button>
            <button style={bigBtn(false)} onClick={() => begin(true, true)}>
              tutorial
            </button>
          </>
        )}
        <div style={{ color: theme.slate, marginTop: 18, fontSize: 11 }}>
          you are the network operator — generation, wires, vans and all
        </div>
      </div>
    </div>
  );
}
