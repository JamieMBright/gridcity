// Touch devices held portrait get a lofi-branded "rotate your phone"
// overlay during gameplay — ElectriCity plays widescreen. It clears the
// moment the device rotates to landscape; the start menu stays usable
// portrait (the overlay only covers play).

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { theme } from './theme';

const PORTRAIT = '(orientation: portrait)';
const TOUCH = '(pointer: coarse)';

function usePortraitTouch(): boolean {
  const [on, setOn] = useState(
    () => window.matchMedia(PORTRAIT).matches && window.matchMedia(TOUCH).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT);
    const update = (): void => setOn(mq.matches && window.matchMedia(TOUCH).matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return on;
}

export function RotatePrompt() {
  const portrait = usePortraitTouch();
  const menuOpen = useAppStore((s) => s.menuOpen);
  if (!portrait || menuOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background:
          'linear-gradient(160deg, rgba(58,43,80,0.97) 0%, rgba(16,22,48,0.98) 55%, rgba(10,14,34,0.99) 100%)',
        color: theme.offWhite,
        fontFamily: theme.font,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <style>{`@keyframes ec-rotate-hint {
        0%, 20% { transform: rotate(0deg); }
        55%, 80% { transform: rotate(90deg); }
        100% { transform: rotate(90deg); }
      }`}</style>
      <div
        aria-hidden
        style={{
          width: 46,
          height: 78,
          borderRadius: 10,
          border: `2px solid ${theme.gold}`,
          boxShadow: '0 0 26px rgba(245, 196, 105, 0.35)',
          animation: 'ec-rotate-hint 2.4s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        ⚡
      </div>
      <div>
        <div style={{ color: theme.gold, fontSize: 12, letterSpacing: '0.22em' }}>
          ROTATE YOUR PHONE
        </div>
        <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>
          the grid runs widescreen —<br />
          turn to landscape to operate it
        </div>
      </div>
    </div>
  );
}
