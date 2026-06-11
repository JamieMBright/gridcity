import { useState } from 'react';
import { useAppStore } from '../app/store';
import { setSimSpeed } from '../app/workerBridge';
import { getAudioSettings, updateAudioSettings } from '../audio/audio';
import { pushSettings } from '../online/cloud';
import type { SimSpeed } from '../sim/protocol';
import { panelStyle, theme } from './theme';

function formatGameClock(simTimeMin: number): string {
  const day = Math.floor(simTimeMin / (24 * 60)) + 1;
  const minOfDay = simTimeMin % (24 * 60);
  const h = String(Math.floor(minOfDay / 60)).padStart(2, '0');
  const m = String(Math.floor(minOfDay % 60)).padStart(2, '0');
  return `day ${day} · ${h}:${m}`;
}

const SPEEDS: Array<{ speed: SimSpeed; label: string }> = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '▶' },
  { speed: 4, label: '▶▶' },
  { speed: 16, label: '▶▶▶' },
];

function weatherIcon(w: { sun: number; wind: number; cloud: number }, simTimeMin: number): string {
  const h = (simTimeMin / 60) % 24;
  const night = h < 5.5 || h > 20.5;
  const sky = night ? '🌙' : w.cloud > 0.65 ? '☁️' : w.cloud > 0.35 ? '⛅' : '☀️';
  return w.wind > 0.7 ? `${sky}💨` : sky;
}

function MarketTicker() {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const st = snapshot.stats;
  const freqOff = Math.abs(st.freqHz - 50) > 0.3;
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 14,
        padding: '6px 14px',
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: freqOff ? theme.danger : theme.ok }}>
        {st.freqHz.toFixed(2)} Hz
      </span>
      <span style={{ color: theme.gold }}>£{st.priceMWh.toFixed(0)}/MWh</span>
      <span style={{ color: st.carbonG > 200 ? theme.sunset : theme.ok }}>
        {st.carbonG.toFixed(0)} g/kWh
      </span>
      <span>{weatherIcon(snapshot.weather, snapshot.simTimeMin)}</span>
    </div>
  );
}

function RiioButton() {
  const kpiOpen = useAppStore((s) => s.kpiOpen);
  const setKpiOpen = useAppStore((s) => s.setKpiOpen);
  return (
    <button
      onClick={() => setKpiOpen(!kpiOpen)}
      title="Regulatory KPIs and report card (K)"
      style={{
        padding: '3px 10px',
        borderRadius: 5,
        border: `1px solid ${kpiOpen ? theme.orange : theme.navyLight}`,
        background: kpiOpen ? theme.orange : 'transparent',
        color: kpiOpen ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      RIIO
    </button>
  );
}

function SoundButton() {
  const [, force] = useState(0);
  const s = getAudioSettings();
  const on = s.musicOn || s.sfxOn;
  return (
    <button
      onClick={() => {
        pushSettings(updateAudioSettings({ musicOn: !on, sfxOn: !on }));
        force((n) => n + 1);
      }}
      title="Music & sound"
      style={{
        padding: '3px 8px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: 'transparent',
        color: on ? theme.gold : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {on ? '♪' : '♪̸'}
    </button>
  );
}

export function Hud() {
  const snapshot = useAppStore((s) => s.snapshot);
  const gridView = useAppStore((s) => s.gridView);
  const setGridView = useAppStore((s) => s.setGridView);

  return (
    <>
    <MarketTicker />
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
      }}
    >
      <span style={{ minWidth: 110, color: theme.gold }}>
        {snapshot ? formatGameClock(snapshot.simTimeMin) : '—'}
      </span>
      <span style={{ display: 'flex', gap: 2 }}>
        {SPEEDS.map(({ speed, label }) => {
          const active = snapshot?.speed === speed;
          return (
            <button
              key={speed}
              onClick={() => setSimSpeed(speed)}
              style={{
                padding: '3px 9px',
                borderRadius: 5,
                border: 'none',
                background: active ? theme.orange : 'transparent',
                color: active ? theme.navy : theme.slate,
                fontFamily: theme.font,
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </span>
      <RiioButton />
      <SoundButton />
      <button
        onClick={() => setGridView(!gridView)}
        title="Grid view: dim the city, highlight the network (G)"
        style={{
          padding: '3px 10px',
          borderRadius: 5,
          border: `1px solid ${gridView ? theme.orange : theme.navyLight}`,
          background: gridView ? theme.orange : 'transparent',
          color: gridView ? theme.navy : theme.slate,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: gridView ? 700 : 400,
          cursor: 'pointer',
        }}
      >
        ⚡ grid view
      </button>
    </div>
    </>
  );
}
