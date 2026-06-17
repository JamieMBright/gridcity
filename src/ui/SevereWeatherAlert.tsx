// Severe-weather mid-screen alert (owner Wave 18). Routine blows ride the
// little top-centre StormBanner; a genuinely DAMAGING storm escalates to a
// full centre-screen warning that PAUSES the clock and makes the player
// engage — a schematic weather map of the system sweeping in from the
// Atlantic toward London, a countdown to landfall, and the PREPARE levers
// (surge crews / emergency tree-cutting) wired to the real stormPrep
// commands. The escalated layer only; the small banner stays for all storms.

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { sendCommand, setSimSpeed } from '../app/workerBridge';
import type { PlacedAsset } from '../sim/assets';
import { theme } from './theme';
import { formatEta, gustKmh, WARN_STYLE, warningLevel, type WarnLevel } from './weatherFormat';

// The km/h + Met-warning helpers now live in weatherFormat.ts so the
// always-on HUD chips and this modal share one source of truth; re-exported
// here for the existing call sites / tests.
export { formatEta, gustKmh, WARN_STYLE, warningLevel, type WarnLevel };

/** Forecast row shape (mirrors snapshot.stormForecast[i]). */
export interface StormForecastRow {
  name: string;
  /** Game-minute the storm window opens (NOTE: this is an absolute sim
   *  minute on the snapshot, not a remaining delta — see comment below). */
  etaMin: number;
  severity: number;
  /** Imminent pre-rolled front vs the medium-range outlook (optional so the
   *  pure helpers stay testable with bare rows). */
  confidence?: 'imminent' | 'outlook';
}

// --- severity / selection helpers (pure, unit-tested) ------------------------

/** "Severe/damaging" band. `severity` is forecast wind intensity 0..1
 *  (reliability/stormprep.ts): a named STORM regime forecasts ~0.92+, a
 *  routine windy-wet front ~0.66–0.78. The fault engine's storm band opens
 *  at ~0.7 and turns SEVERE above ~0.85 (faults.ts stormFactor, cited in
 *  stormprep.ts). So 0.85 is the natural cut: every named storm clears it,
 *  every routine front sits below — the alert escalates exactly the blows
 *  the sim itself treats as severe. */
export const SEVERE_SEVERITY = 0.85;

/** Only pop the alert while landfall is within this lead window
 *  (game-minutes). In reality a network operator usually gets ~7 days'
 *  notice of a severe storm and runs the system-prepare over that lead time
 *  (owner, 2026-06-14), so we warn a full 7 game-days out. */
export const SEVERE_ETA_WINDOW_MIN = 7 * 1440;

/** Is this forecast row a severe storm bearing down within the window?
 *  `nowMin` = snapshot.simTimeMin; etaMin is the absolute window-open
 *  minute, so remaining = etaMin − nowMin. */
export function isSevereStorm(row: StormForecastRow | undefined, nowMin: number): boolean {
  if (!row) return false;
  const remaining = row.etaMin - nowMin;
  return row.severity >= SEVERE_SEVERITY && remaining >= 0 && remaining <= SEVERE_ETA_WINDOW_MIN;
}

/** Pick the storm to warn about: the first severe-and-approaching row that
 *  the player hasn't already acknowledged by name. Returns undefined when
 *  there's nothing to escalate (so the modal stays closed). */
export function pickSevereStorm(
  forecast: ReadonlyArray<StormForecastRow> | undefined,
  nowMin: number,
  acked: ReadonlySet<string>,
): StormForecastRow | undefined {
  if (!forecast) return undefined;
  return forecast.find((row) => isSevereStorm(row, nowMin) && !acked.has(row.name));
}

/** Pick a line for the emergency veg-cut. The sim's vegCut command needs a
 *  specific overhead corridor (cables have nothing to cut); the snapshot
 *  doesn't expose per-line veg, so we target the LONGEST player-owned
 *  overhead line — the biggest storm-fault exposure proxy. Returns its id,
 *  or undefined when the player owns no overhead line (button disabled). */
export function pickVegLine(assets: ReadonlyArray<PlacedAsset> | undefined): number | undefined {
  if (!assets) return undefined;
  let best: { id: number; len: number } | undefined;
  for (const a of assets) {
    if (a.kind !== 'line' || a.build !== 'overhead') continue;
    if (!best || a.lengthTiles > best.len) best = { id: a.id, len: a.lengthTiles };
  }
  return best?.id;
}

// --- the schematic weather map -----------------------------------------------

/** Code-drawn (all art is code) weather map: a stylised licence-area /
 *  coastline silhouette with a spiral storm system sweeping in from the
 *  Atlantic/north-west toward a marked LONDON, with the track arrow and a
 *  severity-tinted swirl. Pure SVG, scales to its box. The viewBox is the
 *  schematic plan — there's no storm x/y in the data, so the geometry is
 *  fixed and reads clearly rather than literal. */
function WeatherMap({ swirl, etaLabel }: { swirl: string; etaLabel: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label="Weather map: storm system approaching London from the north-west"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
    >
      <defs>
        <radialGradient id="sw-sea" cx="35%" cy="35%" r="90%">
          <stop offset="0%" stopColor="#16204a" />
          <stop offset="100%" stopColor="#0a0e22" />
        </radialGradient>
        <radialGradient id="sw-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={swirl} stopOpacity="0.95" />
          <stop offset="55%" stopColor={swirl} stopOpacity="0.35" />
          <stop offset="100%" stopColor={swirl} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sea backdrop */}
      <rect x="0" y="0" width="320" height="180" fill="url(#sw-sea)" />

      {/* stylised GB south-east landmass: a soft blob with the Thames
          estuary notch on the east coast — recognisable-not-literal */}
      <path
        d="M150 14
           C 120 18, 96 34, 92 60
           C 88 84, 100 104, 118 118
           C 132 128, 150 130, 168 132
           C 196 135, 214 128, 226 116
           L 250 120 L 236 104 L 256 96
           C 250 78, 238 62, 220 50
           C 200 36, 178 22, 150 14 Z"
        fill="#1d2547"
        stroke="rgba(245,196,105,0.28)"
        strokeWidth="1.2"
      />

      {/* the Thames, sketched in from the estuary toward London */}
      <path
        d="M250 118 C 224 116, 206 112, 190 106 C 178 101, 172 100, 164 100"
        fill="none"
        stroke="rgba(125,160,210,0.55)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* LONDON marker */}
      <circle cx="164" cy="100" r="4.5" fill={theme.gold} />
      <text x="172" y="103.5" fill={theme.offWhite} fontSize="11" fontFamily={theme.font}>
        LONDON
      </text>

      {/* storm track: a dashed arrow sweeping from the NW Atlantic into
          London, animated so it reads as "incoming" */}
      <path
        id="sw-track"
        d="M28 36 C 70 52, 110 70, 150 92"
        fill="none"
        stroke={swirl}
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
        opacity="0.85"
      >
        <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.1s" repeatCount="indefinite" />
      </path>
      {/* arrowhead near London */}
      <path d="M150 92 l -11 -1 l 6 -8 Z" fill={swirl} transform="rotate(28 150 92)" />

      {/* the spiral storm system, parked out over the Atlantic NW */}
      <g transform="translate(50 48)">
        <circle cx="0" cy="0" r="34" fill="url(#sw-eye)" />
        {[0, 120, 240].map((rot) => (
          <path
            key={rot}
            d="M0 0 C 14 -4, 24 4, 22 18 C 21 27, 13 31, 7 29"
            fill="none"
            stroke={swirl}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.9"
            transform={`rotate(${rot})`}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${rot} 0 0`}
              to={`${rot + 360} 0 0`}
              dur="6s"
              repeatCount="indefinite"
            />
          </path>
        ))}
        <circle cx="0" cy="0" r="3" fill={theme.offWhite} />
      </g>

      {/* "ATLANTIC" / direction hint + the ETA on the track */}
      <text x="14" y="96" fill={theme.slate} fontSize="9" fontFamily={theme.font}>
        ↘ Atlantic front
      </text>
      <text x="92" y="78" fill={swirl} fontSize="10" fontFamily={theme.font} fontWeight="700">
        landfall {etaLabel}
      </text>
    </svg>
  );
}

// --- the modal ---------------------------------------------------------------

export function SevereWeatherAlert() {
  const snapshot = useAppStore((s) => s.snapshot);
  // acknowledged storm NAMES, kept in component state — once-per-storm, and
  // deliberately not persisted (a fresh boot mid-storm re-warns, which is
  // the right call for a damaging event). Minimal store footprint by design.
  const [acked, setAcked] = useState<ReadonlySet<string>>(() => new Set());
  // whether each prepare lever has been fired for the open storm
  const [didSurge, setDidSurge] = useState(false);
  const [didScouts, setDidScouts] = useState(false);
  const [didCalls, setDidCalls] = useState(false);
  const [didVeg, setDidVeg] = useState(false);
  // the storm we paused FOR, so we pause the clock exactly once on appear
  const pausedForRef = useRef<string | undefined>(undefined);

  const nowMin = snapshot?.simTimeMin ?? 0;
  const storm = pickSevereStorm(snapshot?.stormForecast, nowMin, acked);
  const stormName = storm?.name;

  // On appear: pause the clock ONCE (so the player isn't idling through the
  // warning). Guarded by the storm name so re-renders don't re-pause, and a
  // NEW storm pauses afresh.
  useEffect(() => {
    if (stormName !== undefined && pausedForRef.current !== stormName) {
      pausedForRef.current = stormName;
      setDidSurge(false);
      setDidScouts(false);
      setDidCalls(false);
      setDidVeg(false);
      setSimSpeed(0);
    }
  }, [stormName]);

  if (!snapshot || !storm) return null;

  const remaining = storm.etaMin - nowMin;
  const etaLabel = formatEta(remaining);
  const gust = gustKmh(storm.severity);
  const warn = warningLevel(gust);
  const warnColor = WARN_STYLE[warn].color;
  // fraction of the bar = gust mapped over a 50–165 km/h scale
  const gustPct = Math.round(((gust - 50) / (165 - 50)) * 100);

  // already running extra shifts from an earlier hire? show as confirmed.
  const surging = snapshot.fleet.vans.length > snapshot.fleet.fleetSize;
  const surgeDone = didSurge || surging;
  // wider call handling already drafted (office staff on the phones)?
  const callsDone = didCalls || (snapshot.callHandling?.draftedHandlers ?? 0) > 0;
  const scoutsDone = didScouts;
  // the corridor the emergency cut will target (longest overhead line); the
  // button is disabled when the player has no overhead line to clear.
  const vegLineId = pickVegLine(snapshot.assets);

  // live call-handling readout: the answer time vs the < 5 s target. During
  // the pre-landfall prepare the network is usually still all-on, so this
  // reads the calm baseline (well inside target) and the warning text below
  // explains what happens if the call centre is understaffed in the surge.
  const call = snapshot.callHandling;
  const answerS = call?.answerSeconds ?? 2;
  const inTarget = answerS <= (call?.targetSeconds ?? 5);

  const dismiss = (): void => {
    // acknowledge THIS storm so it won't re-pop, and close. We do NOT
    // auto-resume the clock — the player chooses their speed from the HUD
    // when they're ready (pausing dropped them here on purpose).
    setAcked((prev) => new Set(prev).add(storm.name));
    pausedForRef.current = undefined;
  };

  const leverBtn = (done: boolean): React.CSSProperties => ({
    flex: '1 1 0',
    minWidth: 0,
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${done ? theme.ok : theme.orange}`,
    background: done ? 'rgba(123,196,127,0.12)' : 'transparent',
    color: done ? theme.ok : theme.orange,
    fontFamily: theme.font,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: done ? 'default' : 'pointer',
    textAlign: 'left',
    lineHeight: 1.35,
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 24,
        background: 'rgba(6, 8, 20, 0.84)',
        display: 'flex',
        // top-aligned + scrollable so the prepare buttons stay reachable on
        // a short phone-landscape viewport (956×440)
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '16px',
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          width: 'min(640px, 96vw)',
          margin: 'auto',
          background:
            'linear-gradient(168deg, rgba(18,24,52,0.96) 0%, rgba(34,25,58,0.96) 100%)',
          border: `1px solid ${warnColor}`,
          borderRadius: 14,
          boxShadow: '0 18px 48px rgba(6,8,18,0.7), inset 0 1px 0 rgba(242,239,232,0.06)',
          color: theme.offWhite,
          // a pulsing danger ring to make it feel urgent
          animation: 'ec-severe-pulse 2.4s ease-in-out infinite',
        }}
      >
        <style>{`@keyframes ec-severe-pulse {
          0%,100% { box-shadow: 0 18px 48px rgba(6,8,18,0.7), 0 0 0 0 rgba(224,105,122,0.0); }
          50% { box-shadow: 0 18px 48px rgba(6,8,18,0.7), 0 0 0 4px rgba(224,105,122,0.22); }
        }`}</style>

        {/* header */}
        <div style={{ padding: '16px 20px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* the hazardous Met-Office warning badge: yellow → amber → red */}
            <span
              style={{
                background: warnColor,
                color: '#10162e',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.14em',
                padding: '2px 8px',
                borderRadius: 5,
              }}
            >
              ⚠ {WARN_STYLE[warn].label}
            </span>
            <span style={{ color: warnColor, fontSize: 12, letterSpacing: '0.18em', fontWeight: 700 }}>
              WIND
            </span>
            {/* confidence tag: the high-confidence imminent front vs the
                deterministic medium-range projection */}
            <span
              style={{
                marginLeft: 'auto',
                color: theme.slate,
                fontSize: 9.5,
                letterSpacing: '0.14em',
                fontWeight: 700,
                border: `1px solid ${theme.navyLight}`,
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              {storm.confidence === 'outlook' ? 'MEDIUM-RANGE OUTLOOK' : 'IMMINENT'}
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{storm.name}</div>
          <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 4 }}>
            {storm.confidence === 'outlook'
              ? "Met Office medium-range outlook — about a week out. The clock is "
              : 'Confirmed front bearing down — the clock is '}
            <span style={{ color: theme.gold }}>paused</span> so you can run the system-prepare
            before landfall.
          </div>
        </div>

        {/* body: weather map + readouts, side-by-side on desktop, stacked
            on a narrow phone (the column wraps) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            padding: '0 20px',
            alignItems: 'stretch',
          }}
        >
          <div style={{ flex: '1 1 280px', minWidth: 240 }}>
            <WeatherMap swirl={warnColor} etaLabel={etaLabel} />
          </div>
          <div
            style={{
              flex: '1 1 180px',
              minWidth: 180,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <div>
              <div style={{ color: theme.slate, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Landfall in
              </div>
              <div style={{ color: warnColor, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                {etaLabel}
              </div>
            </div>
            <div>
              <div style={{ color: theme.slate, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Forecast peak gusts
              </div>
              <div style={{ color: warnColor, fontSize: 22, fontWeight: 800 }}>
                {gust} <span style={{ fontSize: 13, fontWeight: 600 }}>km/h</span>
              </div>
              {/* gust bar over a 50–165 km/h scale, tinted to the warning level */}
              <div
                style={{
                  marginTop: 4,
                  height: 7,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${gustPct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.gold}, ${warnColor})`,
                  }}
                />
              </div>
              <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 3 }}>
                expect faults & vegetation strikes on overhead lines
              </div>
            </div>
          </div>
        </div>

        {/* prepare levers — the owner's real system-prepare: scale up
            shifts, activate scouts, wider call handling, emergency cut */}
        <div style={{ padding: '14px 20px 6px' }}>
          <div
            style={{
              color: theme.gold,
              fontSize: 10.5,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            System prepare
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              style={leverBtn(surgeDone)}
              disabled={surgeDone}
              onClick={() => {
                sendCommand({ type: 'stormPrep', action: 'shifts', days: 4 });
                setDidSurge(true);
              }}
            >
              {surgeDone ? '✓ extra shifts rostered' : 'Scale up shifts'}
              <div style={{ color: theme.slate, fontSize: 10.5, fontWeight: 400 }}>
                {surgeDone
                  ? 'extra crews on for the worst-hit areas — faster repair'
                  : 'extra crews · 4 days — faster repair, lower CML'}
              </div>
            </button>
            <button
              style={leverBtn(scoutsDone)}
              disabled={scoutsDone}
              onClick={() => {
                sendCommand({ type: 'stormPrep', action: 'scouts', days: 4 });
                setDidScouts(true);
              }}
            >
              {scoutsDone ? '✓ scouts on patrol' : 'Activate scouts'}
              <div style={{ color: theme.slate, fontSize: 10.5, fontWeight: 400 }}>
                {scoutsDone
                  ? 'office staff driving the lines — faults found sooner'
                  : 'office staff drive the lines · eyes on the network'}
              </div>
            </button>
            <button
              style={leverBtn(callsDone)}
              disabled={callsDone}
              onClick={() => {
                sendCommand({ type: 'stormPrep', action: 'callHandling', days: 4 });
                setDidCalls(true);
              }}
            >
              {callsDone ? '✓ wider call handling on' : 'Wider call handling'}
              <div style={{ color: theme.slate, fontSize: 10.5, fontWeight: 400 }}>
                {callsDone
                  ? 'office staff on the phones — answer time held in target'
                  : 'draft office staff onto the phones · protect CSAT'}
              </div>
            </button>
            <button
              style={{
                ...leverBtn(didVeg),
                ...(vegLineId === undefined && !didVeg
                  ? { opacity: 0.45, cursor: 'default', borderColor: theme.navyLight, color: theme.slate }
                  : {}),
              }}
              disabled={didVeg || vegLineId === undefined}
              title={vegLineId === undefined ? 'no overhead line to clear' : undefined}
              onClick={() => {
                if (vegLineId === undefined) return;
                sendCommand({ type: 'stormPrep', action: 'vegCut', lineId: vegLineId });
                setDidVeg(true);
              }}
            >
              {didVeg ? '✓ tree-cutting dispatched' : 'Emergency tree-cutting'}
              <div style={{ color: theme.slate, fontSize: 10.5, fontWeight: 400 }}>
                {didVeg
                  ? 'worst overhead corridor trimmed back'
                  : vegLineId === undefined
                    ? 'no overhead corridor to clear'
                    : 'clear the most exposed corridor at short notice'}
              </div>
            </button>
          </div>

          {/* call-handling readout: the < 5 s answer target and the CSAT
              risk if the call centre is understaffed through the surge */}
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${callsDone ? 'rgba(123,196,127,0.4)' : 'rgba(141,151,180,0.32)'}`,
              background: callsDone ? 'rgba(123,196,127,0.08)' : 'rgba(141,151,180,0.06)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ minWidth: 150 }}>
              <div
                style={{
                  color: theme.slate,
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Call response
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  color: inTarget ? theme.ok : theme.sunset,
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {answerS < 10 ? answerS.toFixed(1) : Math.round(answerS)}s
                <span style={{ color: theme.slate, fontSize: 11, fontWeight: 600 }}>
                  target &lt; {call?.targetSeconds ?? 5}s
                </span>
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 200, color: theme.slate, fontSize: 11, lineHeight: 1.4 }}>
              {callsDone
                ? 'office staff are on the phones — a real person answers inside target through the surge, so CSAT holds.'
                : 'in the surge every interrupted customer calls at once. Understaff the phones and answer time blows past 5 s — CSAT goes negative. Draft wider call handling to hold the line.'}
            </div>
          </div>
        </div>

        {/* dismiss */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 20px 18px' }}>
          <button
            onClick={dismiss}
            style={{
              padding: '8px 22px',
              borderRadius: 7,
              border: `1px solid ${theme.navyLight}`,
              background: 'transparent',
              color: theme.offWhite,
              fontFamily: theme.font,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ride it out ▸
          </button>
        </div>
      </div>
    </div>
  );
}
