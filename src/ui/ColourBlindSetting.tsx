// Colour-blind mode selector (#32) — lives in the settings footer (start
// menu) AND can be dropped anywhere. Picking a mode swaps the network,
// status and heatmap palettes everywhere (theme tokens + render palette)
// and persists in localStorage via the store. A live LEGEND under the
// picker shows the network voltage swatches + the ok/warn/danger status
// swatches in the chosen palette, each PAIRED with a shape/label, so the
// player can confirm at a glance that the three languages stay distinct.

import { useAppStore } from '../app/store';
import {
  CB_MODE_LABEL,
  CB_MODES,
  levelPalette,
  numHex,
  statusPalette,
  type CbMode,
} from './cbPalette';
import { theme } from './theme';

function Legend({ mode }: { mode: CbMode }) {
  const lv = levelPalette(mode);
  const st = statusPalette(mode);
  const sw = (bg: string, glyph: string, label: string): React.JSX.Element => (
    <span
      key={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: bg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0a0e22',
          fontSize: 9,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {glyph}
      </span>
      <span style={{ color: theme.slate }}>{label}</span>
    </span>
  );
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {sw(numHex(lv[400]), '═', '400 kV')}
        {sw(numHex(lv[132]), '─', '132 kV')}
        {sw(numHex(lv[33]), '·', '33 kV')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {sw(st.ok, '✓', 'ok')}
        {sw(st.warn, '!', 'warn')}
        {sw(st.danger, '✕', 'danger')}
      </div>
    </div>
  );
}

export function ColourBlindSetting() {
  const cbMode = useAppStore((s) => s.cbMode);
  const setCbMode = useAppStore((s) => s.setCbMode);
  return (
    <div style={{ marginTop: 12, textAlign: 'left' }}>
      <div
        style={{
          color: theme.gold,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        colour-blind mode
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
        {CB_MODES.map((m) => (
          <button
            key={m}
            aria-label={`colour-blind ${m}`}
            onClick={() => setCbMode(m)}
            title={CB_MODE_LABEL[m]}
            style={{
              padding: '4px 9px',
              borderRadius: 6,
              border: `1px solid ${cbMode === m ? theme.orange : theme.navyLight}`,
              background: cbMode === m ? theme.orange : 'transparent',
              color: cbMode === m ? theme.navy : theme.slate,
              fontFamily: theme.font,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {m === 'off' ? 'off' : m === 'deuteranopia' ? 'deuter.' : m === 'protanopia' ? 'protan.' : 'tritan.'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Legend mode={cbMode} />
      </div>
    </div>
  );
}
