import { useEffect, useState } from 'react';
import { alertVisible, useAppStore } from '../app/store';
import { useIsMobile } from '../app/useIsMobile';
import { requestSkip, sendCommand, setSimSpeed, skipGoalLadder } from '../app/workerBridge';
import { getAudioSettings, updateAudioSettings } from '../audio/audio';
import { pushSettings } from '../online/cloud';
import type { SimSpeed } from '../sim/protocol';
import { ALLOWANCE_Y1_K, inRebuildYear } from '../sim/scenario/story';
import { assetCapexK } from '../sim/regulation/bill';
import { fmtMoneyK, panelStyle, theme } from './theme';
import { useUnlockGate } from './unlocks';
import {
  IconBolt,
  IconBuilding,
  IconCollapse,
  IconExpand,
  IconHeadroom,
  IconHelp,
  IconHourglass,
  IconLedger,
  IconRedo,
  IconReport,
  IconSave,
  IconScales,
  IconShield,
  IconSkip,
  IconSkipEvent,
  IconSoundOff,
  IconSoundOn,
  IconUndo,
  IconWind,
} from './icons';

function formatGameClock(simTimeMin: number): string {
  const day = Math.floor(simTimeMin / (24 * 60)) + 1;
  const minOfDay = simTimeMin % (24 * 60);
  const h = String(Math.floor(minOfDay / 60)).padStart(2, '0');
  const m = String(Math.floor(minOfDay % 60)).padStart(2, '0');
  return `day ${day} · ${h}:${m}`;
}

// Transport-control glyphs: conventional pause/play triangles (not emoji),
// and the e2e controls gate clicks them by their exact glyph text — so the
// glyph stays the accessible name (no aria-label override here).
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

/** The rolling news banner: real grid events + the region's mutterings,
 *  sliding across the very top of the screen. New headlines do NOT
 *  restart the marquee — the text refreshes when a pass completes. */
function NewsTicker() {
  const snapshot = useAppStore((s) => s.snapshot);
  const requestPan = useAppStore((s) => s.requestPan);
  const [shown, setShown] = useState<{
    text: string;
    target?: { x: number; y: number } | undefined;
  }>({ text: '' });

  const refresh = (): void => {
    const st = useAppStore.getState();
    const snap = st.snapshot;
    if (!snap || snap.events.length === 0) return;
    // #39: the ticker skips acknowledged/snoozed alerts too
    const items = snap.events
      .filter((e) => alertVisible(e, snap.simTimeMin, st.ackedAlerts, st.snoozedAlerts))
      .slice(-8)
      .reverse();
    if (items.length === 0) return;
    const latest = items[0];
    setShown({
      text: items.map((e) => e.msg).join('   •••   '),
      target:
        latest?.x !== undefined && latest.y !== undefined
          ? { x: latest.x, y: latest.y }
          : undefined,
    });
  };
  // first headlines start the marquee; after that it only swaps text
  // between passes (onAnimationIteration)
  const hasEvents = (snapshot?.events.length ?? 0) > 0;
  const empty = shown.text === '';
  useEffect(() => {
    if (empty && hasEvents) refresh();
  }, [empty, hasEvents]);
  if (!shown.text) return null;
  const duration = Math.max(18, shown.text.length * 0.28);
  return (
    <div
      onClick={() => shown.target && requestPan(shown.target.x, shown.target.y)}
      style={{
        position: 'absolute',
        top: 'var(--sai-t)',
        left: 'var(--sai-l)',
        right: 'var(--sai-r)',
        height: 22,
        overflow: 'hidden',
        background: 'rgba(10, 14, 34, 0.92)',
        borderBottom: '1px solid rgba(255, 138, 30, 0.25)',
        fontFamily: theme.font,
        fontSize: 11,
        lineHeight: '22px',
        color: theme.offWhite,
        whiteSpace: 'nowrap',
        cursor: shown.target ? 'pointer' : 'default',
        zIndex: 5,
      }}
    >
      <style>{`@keyframes ec-ticker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
      <span
        onAnimationIteration={refresh}
        style={{ display: 'inline-block', animation: `ec-ticker ${duration}s linear infinite` }}
      >
        <span style={{ color: theme.orange, fontWeight: 700 }}>⚡ GRID WIRE: </span>
        {shown.text}
      </span>
    </div>
  );
}

/** Storm warning strip: the regime forecast gives days of notice — scale
 *  up storm shifts while there's still time (the full system-prepare —
 *  scouts + wider call handling — lives in the escalated SevereWeatherAlert). */
function StormBanner() {
  const snapshot = useAppStore((s) => s.snapshot);
  const storm = snapshot?.stormForecast?.[0];
  if (!snapshot || !storm) return null;
  const days = Math.max(0, (storm.etaMin - snapshot.simTimeMin) / 1440);
  const surging = (snapshot.fleet.vans.length ?? 0) > snapshot.fleet.fleetSize;
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 'calc(64px + var(--sai-t))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '5px 12px',
        border: '1px solid rgba(224,105,122,0.6)',
        fontSize: 12,
      }}
    >
      <span style={{ color: theme.danger }}>
        ⛈ Storm {storm.name} in {days.toFixed(1)}d · severity {(storm.severity * 100).toFixed(0)}%
      </span>
      {!surging && (
        <button
          onClick={() => sendCommand({ type: 'stormPrep', action: 'shifts', days: 4 })}
          style={{
            padding: '2px 8px',
            borderRadius: 5,
            border: `1px solid ${theme.orange}`,
            background: 'transparent',
            color: theme.orange,
            fontFamily: theme.font,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          scale up shifts (4d)
        </button>
      )}
      {surging && <span style={{ color: theme.ok, fontSize: 11 }}>extra shifts rostered ✓</span>}
    </div>
  );
}

/** Year-1 rebuild allowance: network capex committed vs Ofgem's letter. */
function AllowanceChip() {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot || !inRebuildYear(snapshot.simTimeMin)) return null;
  let spentK = 0;
  for (const a of snapshot.assets) {
    if (a.kind === 'gen' || (a.kind === 'sub' && a.idno)) continue;
    spentK += assetCapexK(a);
  }
  const frac = spentK / ALLOWANCE_Y1_K;
  const color = frac > 1 ? theme.danger : frac > 0.8 ? theme.warn : theme.slate;
  return (
    <span
      title="Ofgem's year-1 allowance for the rebuild (network capex committed)"
      style={{ color, fontSize: 11, whiteSpace: 'nowrap' }}
    >
      rebuild {fmtMoneyK(spentK)} / {fmtMoneyK(ALLOWANCE_Y1_K)}
    </span>
  );
}

function MarketTicker() {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const st = snapshot.stats;
  // no electrified island ⇒ no frequency to report (day-0 blank grid)
  const freqNA = st.freqHz === undefined;
  const freqOff = st.freqHz !== undefined && Math.abs(st.freqHz - 50) > 0.3;
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 'calc(28px + var(--sai-t))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 14,
        padding: '6px 14px',
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      <span
        title={freqNA ? 'no electrified island — nothing on the bars to set a frequency' : 'system frequency (load-weighted over electrified islands)'}
        style={{ color: freqNA ? theme.slate : freqOff ? theme.danger : theme.ok }}
      >
        {freqNA ? '— Hz' : `${st.freqHz?.toFixed(2)} Hz`}
      </span>
      <span style={{ color: theme.gold }}>£{st.priceMWh.toFixed(0)}/MWh</span>
      <span style={{ color: st.carbonG > 200 ? theme.sunset : theme.ok }}>
        {st.carbonG.toFixed(0)} g/kWh
      </span>
      <span>{weatherIcon(snapshot.weather, snapshot.simTimeMin)}</span>
    </div>
  );
}

/** Time-skip buttons beside the speed controls: fast-forward a fixed
 *  +7 / +30 game-days, or (desktop) to the next notable event. Bad news
 *  always halts the skip. */
function SkipButtons({ compact }: { compact: boolean }) {
  const skipping = useAppStore((s) => s.skipping);
  const btn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 7px',
    borderRadius: 5,
    border: `1px solid ${theme.navyLight}`,
    background: 'transparent',
    color: skipping ? theme.slate : theme.offWhite,
    opacity: skipping ? 0.45 : 1,
    fontFamily: theme.font,
    fontSize: 11,
    cursor: skipping ? 'default' : 'pointer',
  };
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      <button
        aria-label="skip 7 days"
        title="Fast-forward 7 game-days. Bad news stops the skip."
        style={btn}
        disabled={skipping}
        onClick={() => requestSkip('week')}
      >
        <IconSkip size={12} />
        7d
      </button>
      <button
        aria-label="skip 30 days"
        title="Fast-forward 30 game-days. Bad news stops the skip."
        style={btn}
        disabled={skipping}
        onClick={() => requestSkip('month')}
      >
        <IconSkip size={12} />
        30d
      </button>
      {!compact && (
        <button
          aria-label="fast-forward to the coming event"
          title="Fast-forward until something happens (max 7 game-days)."
          style={{ ...btn, padding: '3px 6px' }}
          disabled={skipping}
          onClick={() => requestSkip('event')}
        >
          <IconSkipEvent size={13} />
        </button>
      )}
    </span>
  );
}

/** The early-game goal ladder, as one unobtrusive chip in the bottom
 *  bar; the tint fills with ladder progress. Click dismisses it. */
function GoalChip() {
  const goal = useAppStore((s) => s.snapshot?.goal);
  if (!goal) return null;
  const pct = Math.round((100 * goal.index) / goal.total);
  return (
    <button
      onClick={() => skipGoalLadder()}
      title={`Goal ${goal.index + 1} of ${goal.total} — click to dismiss the goal ladder`}
      style={{
        padding: '3px 10px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: `linear-gradient(90deg, rgba(255, 138, 30, 0.22) ${pct}%, transparent ${pct}%)`,
        color: theme.offWhite,
        fontFamily: theme.font,
        fontSize: 10,
        cursor: 'pointer',
        maxWidth: 280,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      goal {goal.index + 1}/{goal.total} · {goal.label}
      {goal.progress ? ` · ${goal.progress}` : ''}
    </button>
  );
}

function UndoRedo() {
  const snapshot = useAppStore((s) => s.snapshot);
  const setUndoListOpen = useAppStore((s) => s.setUndoListOpen);
  const btn = (enabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 8px',
    borderRadius: 5,
    border: `1px solid ${theme.navyLight}`,
    background: 'transparent',
    color: enabled ? theme.offWhite : theme.slate,
    opacity: enabled ? 1 : 0.45,
    fontFamily: theme.font,
    fontSize: 12,
    cursor: enabled ? 'pointer' : 'default',
  });
  const undoOk = (snapshot?.undoDepth ?? 0) > 0;
  const redoOk = (snapshot?.redoDepth ?? 0) > 0;
  // long-press opens the undo history list (the same as right-click) —
  // mobile has no context menu
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  const openList = (): void => {
    if (undoOk) setUndoListOpen(true);
  };
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      <button
        aria-label="undo"
        title="Undo (Ctrl+Z) · right-click or hold for history"
        style={btn(undoOk)}
        disabled={!undoOk}
        onClick={() => sendCommand({ type: 'undo' })}
        onContextMenu={(e) => {
          e.preventDefault();
          openList();
        }}
        onPointerDown={() => {
          pressTimer = setTimeout(openList, 450);
        }}
        onPointerUp={() => clearTimeout(pressTimer)}
        onPointerLeave={() => clearTimeout(pressTimer)}
      >
        <IconUndo size={14} />
      </button>
      <button
        aria-label="action history"
        title="Undo history — pick how far back to revert"
        style={btn(undoOk)}
        disabled={!undoOk}
        onClick={openList}
      >
        <IconLedger size={13} />
      </button>
      <button
        aria-label="redo"
        title="Redo (Ctrl+Y)"
        style={btn(redoOk)}
        disabled={!redoOk}
        onClick={() => sendCommand({ type: 'redo' })}
      >
        <IconRedo size={14} />
      </button>
    </span>
  );
}

function BalanceButton() {
  const open = useAppStore((s) => s.balanceOpen);
  const setOpen = useAppStore((s) => s.setBalanceOpen);
  return (
    <button
      data-tour="balance"
      aria-label="grid balance"
      onClick={() => setOpen(!open)}
      title="Grid balance: demand vs supply, whole map + per council (B)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 9px',
        borderRadius: 5,
        border: `1px solid ${open ? theme.orange : theme.navyLight}`,
        background: open ? theme.orange : 'transparent',
        color: open ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconScales size={15} />
    </button>
  );
}

function HeadroomButton() {
  const on = useAppStore((s) => s.headroom);
  const setHeadroom = useAppStore((s) => s.setHeadroom);
  const setToast = useAppStore((s) => s.setToast);
  return (
    <button
      aria-label="headroom heatmap"
      data-spot="hud:headroom"
      onClick={() => {
        setHeadroom(!on);
        setToast(on ? 'Headroom heatmap off' : 'Headroom heatmap on — corridors by spare capacity');
      }}
      title="Headroom heatmap: corridors coloured by spare capacity (H)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${on ? theme.orange : theme.navyLight}`,
        background: on ? theme.orange : 'transparent',
        color: on ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconHeadroom size={15} />
    </button>
  );
}

function N1Button() {
  const on = useAppStore((s) => s.n1);
  const setN1 = useAppStore((s) => s.setN1);
  const setToast = useAppStore((s) => s.setToast);
  return (
    <button
      aria-label="N-1 security"
      onClick={() => {
        setN1(!on);
        setToast(on ? 'N-1 security rings off' : 'N-1 security on — green survives any single failure');
      }}
      title="N-1 security: green catchments survive any single failure (N)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${on ? theme.orange : theme.navyLight}`,
        background: on ? theme.orange : 'transparent',
        color: on ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconShield size={15} />
    </button>
  );
}

function ForecastButton() {
  const on = useAppStore((s) => s.forecastOn);
  const setOn = useAppStore((s) => s.setForecastOn);
  const setToast = useAppStore((s) => s.setToast);
  return (
    <button
      aria-label="demand forecast"
      onClick={() => {
        setOn(!on);
        setToast(on ? '5-year forecast off' : '5-year forecast on — years until each transformer overloads');
      }}
      title="5-year demand forecast: catchments tinted by years until their transformer runs out of road (F)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${on ? theme.orange : theme.navyLight}`,
        background: on ? theme.orange : 'transparent',
        color: on ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconHourglass size={15} />
    </button>
  );
}

function RiioButton() {
  const kpiOpen = useAppStore((s) => s.kpiOpen);
  const setKpiOpen = useAppStore((s) => s.setKpiOpen);
  return (
    <button
      data-tour="kpi"
      onClick={() => setKpiOpen(!kpiOpen)}
      title="Regulatory KPIs and report card (K)"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 9px',
        borderRadius: 5,
        border: `1px solid ${kpiOpen ? theme.orange : theme.navyLight}`,
        background: kpiOpen ? theme.orange : 'transparent',
        color: kpiOpen ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      <IconReport size={14} />
      RIIO
    </button>
  );
}

/** Net-zero dashboard (#33): the green companion to RIIO. */
function NetZeroButton() {
  const open = useAppStore((s) => s.netZeroOpen);
  const setOpen = useAppStore((s) => s.setNetZeroOpen);
  return (
    <button
      data-tour="netzero"
      aria-label="net zero dashboard"
      onClick={() => setOpen(!open)}
      title="Net-zero dashboard: carbon trend, generation mix, low-carbon share"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${open ? theme.orange : theme.navyLight}`,
        background: open ? theme.orange : 'transparent',
        color: open ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconWind size={15} />
    </button>
  );
}

/** The network business: directorates, pay & benefits, H&S (#53/#55). */
function CompanyButton() {
  const open = useAppStore((s) => s.directoratesOpen);
  const setOpen = useAppStore((s) => s.setDirectoratesOpen);
  return (
    <button
      onClick={() => setOpen(!open)}
      title="The network business: directorates, pay & H&S (C)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${open ? theme.orange : theme.navyLight}`,
        background: open ? theme.orange : 'transparent',
        color: open ? theme.navy : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconBuilding size={15} />
    </button>
  );
}

/** Named save slots (#34): branch your campaign into a named slot. */
function SavesButton() {
  const setOpen = useAppStore((s) => s.setSavesOpen);
  return (
    <button
      aria-label="save slots"
      onClick={() => setOpen(true)}
      title="Named save slots — branch your campaign"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: 'transparent',
        color: theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconSave size={15} />
    </button>
  );
}

/** The ? affordance: open the keyboard cheat-sheet (#29). A long-press /
 *  right-click instead launches the guided HUD tour (#40) — both ways in
 *  live behind the same glyph. */
function HelpButton() {
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const setTourActive = useAppStore((s) => s.setTourActive);
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  return (
    <button
      data-tour="help"
      aria-label="keyboard shortcuts"
      onClick={() => setHelpOpen(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        setTourActive(true);
      }}
      onPointerDown={() => {
        pressTimer = setTimeout(() => setTourActive(true), 500);
      }}
      onPointerUp={() => clearTimeout(pressTimer)}
      onPointerLeave={() => clearTimeout(pressTimer)}
      title="Keyboard shortcuts (?) · hold for a guided tour"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: 'transparent',
        color: theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <IconHelp size={15} />
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: 'transparent',
        color: on ? theme.gold : theme.slate,
        fontFamily: theme.font,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {on ? <IconSoundOn size={15} /> : <IconSoundOff size={15} />}
    </button>
  );
}

export function Hud({ compact = false }: { compact?: boolean } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const gridView = useAppStore((s) => s.gridView);
  const setGridView = useAppStore((s) => s.setGridView);
  const gate = useUnlockGate();
  // progressive disclosure: on a mission, surface only the HUD buttons a
  // mission teaches; the sandbox keeps the whole bar.
  const show = (key: string): boolean => !gate.active || gate.has(key);

  return (
    <>
    <NewsTicker />
    <MarketTicker />
    <StormBanner />
    <div
      data-tour="clock"
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: compact ? 'calc(6px + var(--sai-b))' : 'calc(12px + var(--sai-b))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 10,
        padding: compact ? '4px 8px' : '6px 12px',
        // keep clear of the safe-area AND the bottom-left minimap pill (it
        // sits at left:12 + inset, ~88px wide) so the date never hides
        maxWidth: 'calc(100vw - 8px - var(--sai-l) - var(--sai-r))',
        whiteSpace: 'nowrap',
        fontSize: compact ? 11 : undefined,
      }}
    >
      <span style={{ minWidth: compact ? 0 : 110, color: theme.gold }}>
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
      <SkipButtons compact={compact} />
      <UndoRedo />
      {show('hud:allowance') && <AllowanceChip />}
      {show('hud:balance') && <BalanceButton />}
      {show('hud:headroom') && <HeadroomButton />}
      {show('hud:n1') && <N1Button />}
      {show('hud:forecast') && <ForecastButton />}
      {!compact && show('hud:kpi') && <RiioButton />}
      {!compact && show('hud:kpi') && <NetZeroButton />}
      {!compact && show('hud:kpi') && <CompanyButton />}
      {!compact && <SavesButton />}
      <SoundButton />
      <HelpButton />
      <button
        aria-label="grid view"
        onClick={() => setGridView(!gridView)}
        title="Grid view: dim the city, highlight the network (G)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: compact ? '4px 8px' : '4px 10px',
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
        <IconBolt size={15} />
        {!compact && 'grid view'}
      </button>
      <CollapseToggle compact={compact} />
      {!compact && <GoalChip />}
    </div>
    </>
  );
}

/** Toggle the whole HUD/palette between the full spread and the compact
 *  icon rail (owner: cleaner look, on desktop too). On a phone the layout
 *  is always compact, so the toggle is desktop-only. Persisted in the
 *  store (localStorage). */
function CollapseToggle({ compact }: { compact: boolean }) {
  const collapsed = useAppStore((s) => s.hudCollapsed);
  const setCollapsed = useAppStore((s) => s.setHudCollapsed);
  const isMobile = useIsMobile();
  if (isMobile) return null; // phones can't un-compact
  return (
    <button
      aria-label={collapsed ? 'expand HUD' : 'collapse HUD'}
      onClick={() => setCollapsed(!collapsed)}
      title={
        collapsed
          ? 'Expand the HUD to the full desktop layout'
          : 'Collapse the HUD to the compact icon rail'
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '4px 6px' : '4px 8px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        background: 'transparent',
        color: theme.slate,
        fontFamily: theme.font,
        cursor: 'pointer',
      }}
    >
      {collapsed ? <IconExpand size={15} /> : <IconCollapse size={15} />}
    </button>
  );
}
