// Net-zero dashboard (ROADMAP #33). The green companion to the RIIO
// report card: where carbon stands now (live g/kWh vs a 2050-style
// glidepath), how much of the running fleet is low-carbon, the generation
// mix as a stacked bar, and the single dirtiest source still on the bars.
// Reads the EXISTING snapshot only (stats.carbonG, genMW, assets); maths
// in netZero.ts is unit-tested.

import { useAppStore } from '../app/store';
import { carbonGrade, netZeroView, type MixSlice } from './netZero';
import { statusColors, headingStyle, panelStyle, theme } from './theme';

// stable, value-distinct colours per tech (paired with the labels, so the
// bar never relies on hue alone) — low-carbon techs in cool blues/teals,
// fossils in warm ambers/reds.
const TECH_COLOR: Record<string, string> = {
  nuclear: '#6f7bd6',
  windOffshore: '#3f8fd0',
  windOnshore: '#5ea3ff',
  solarFarm: '#f5c469',
  tidal: '#3f8f8a',
  biomass: '#9aa86a',
  interconnector: '#7a6fae',
  battery: '#86c2a8',
  gasCCGT: '#e0884a',
  gasPeaker: '#e0697a',
  coal: '#8a3a2c',
  electrolyser: '#5e8fc2',
};

export function NetZeroPanel() {
  const snapshot = useAppStore((s) => s.snapshot);
  const open = useAppStore((s) => s.netZeroOpen);
  const setOpen = useAppStore((s) => s.setNetZeroOpen);
  const cbMode = useAppStore((s) => s.cbMode);
  if (!open || !snapshot) return null;
  const status = statusColors(cbMode);

  const view = netZeroView(snapshot.assets, snapshot.genMW, snapshot.stats.carbonG);
  const grade = carbonGrade(view.carbonG);
  const lowPct = Math.round(view.lowCarbonShare * 100);
  // colour the headline by intensity (value-paired: a band label too)
  const carbonColor =
    view.carbonG <= 50 ? status.ok : view.carbonG <= 150 ? status.ok : view.carbonG <= 350 ? status.warn : status.danger;

  const techColor = (s: MixSlice): string => TECH_COLOR[s.gen] ?? theme.slate;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}99`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 6,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        data-tour="netzero"
        style={{ ...panelStyle, width: 'min(440px, 94vw)', padding: '16px 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ color: theme.orange, fontWeight: 800, letterSpacing: '0.04em' }}>
            NET ZERO · the green arc
          </div>
          <button
            aria-label="close net-zero dashboard"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.slate,
              fontFamily: theme.font,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* headline: live carbon intensity + grade glidepath bar */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: carbonColor }}>
            {view.carbonG.toFixed(0)}
          </span>
          <span style={{ color: theme.slate, fontSize: 12 }}>g CO₂ / kWh</span>
          <span style={{ marginLeft: 'auto', color: carbonColor, fontSize: 12, fontWeight: 700 }}>
            {grade.label}
          </span>
        </div>
        {/* glidepath bar: filthy (left) → net zero (right); marker = now */}
        <div
          title="0 = net zero (right), ~500 g/kWh = high carbon (left)"
          style={{
            position: 'relative',
            height: 8,
            marginTop: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${status.danger} 0%, ${status.warn} 45%, ${status.ok} 100%)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -3,
              left: `calc(${(grade.t * 100).toFixed(1)}% - 1px)`,
              width: 3,
              height: 14,
              borderRadius: 2,
              background: theme.offWhite,
              boxShadow: '0 0 0 1px rgba(10,14,34,0.6)',
            }}
          />
        </div>

        {/* low-carbon share */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={headingStyle}>low-carbon share</span>
          <span style={{ marginLeft: 'auto', color: theme.gold, fontWeight: 700, fontSize: 14 }}>
            {lowPct}%
          </span>
        </div>
        <div
          style={{
            height: 7,
            marginTop: 6,
            borderRadius: 4,
            background: 'rgba(141,151,180,0.18)',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${lowPct}%`, height: '100%', background: status.ok }} />
        </div>

        {/* generation mix stacked bar */}
        <div style={{ marginTop: 16 }}>
          <span style={headingStyle}>generation mix · {view.totalMW.toFixed(0)} MW now</span>
          {view.totalMW <= 0 ? (
            <div style={{ color: theme.slate, fontSize: 12, marginTop: 8 }}>
              nothing dispatching — no carbon to report
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  height: 16,
                  marginTop: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid rgba(245,196,105,0.18)',
                }}
              >
                {view.slices.map((s) => (
                  <div
                    key={s.gen}
                    title={`${s.name} · ${(s.share * 100).toFixed(0)}% · ${s.carbonG} g/kWh`}
                    style={{
                      width: `${s.share * 100}%`,
                      background: techColor(s),
                      // a low-carbon stripe overlay (shape, not hue alone)
                      backgroundImage: s.lowCarbon
                        ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0 2px, transparent 2px 5px)'
                        : undefined,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px 12px',
                  fontSize: 11,
                }}
              >
                {view.slices.map((s) => (
                  <span key={s.gen} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 2,
                        background: techColor(s),
                        backgroundImage: s.lowCarbon
                          ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 3px)'
                          : undefined,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: theme.offWhite }}>{s.name}</span>
                    <span style={{ color: theme.slate }}>{(s.share * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* worst source callout */}
        <div
          style={{
            marginTop: 16,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'rgba(10,14,34,0.4)',
            border: `1px solid ${view.worst ? status.danger : status.ok}`,
            fontSize: 12,
          }}
        >
          {view.worst ? (
            <>
              <span style={{ color: status.danger, fontWeight: 700 }}>worst source: </span>
              <span style={{ color: theme.offWhite }}>
                {view.worst.name} — {view.worst.carbonG} g/kWh, {(view.worst.share * 100).toFixed(0)}% of the mix.
              </span>
              <span style={{ color: theme.slate }}> Award cleaner tenders to push it off the bars.</span>
            </>
          ) : (
            <span style={{ color: status.ok, fontWeight: 700 }}>
              all-green — every running unit is low-carbon. ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
