import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { VAN_OPEX_K_YR, VEG_POLICY, type VegPolicy } from '../sim/catalog';
import { MAX_VANS } from '../sim/fleet/fleet';
import { panelStyle, theme } from './theme';

export function FleetPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const fleet = snapshot.fleet;
  const busy = fleet.vans.filter((v) => v.busy).length;
  const waiting = fleet.jobs.filter((j) => !j.staffed).length;
  const noDepot = fleet.fleetSize > 0 && fleet.vans.length === 0;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 56,
        left: 12,
        width: 220,
        padding: '8px 12px',
        fontSize: 12,
        lineHeight: 1.6,
        ...frame,
      }}
    >
      <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em' }}>FIELD FLEET</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => sendCommand({ type: 'setFleet', vans: Math.max(0, fleet.fleetSize - 1) })}
          style={stepBtn}
        >
          −
        </button>
        <span style={{ color: theme.orange, fontWeight: 700 }}>
          {fleet.fleetSize} van{fleet.fleetSize === 1 ? '' : 's'}
        </span>
        <button
          onClick={() =>
            sendCommand({ type: 'setFleet', vans: Math.min(MAX_VANS, fleet.fleetSize + 1) })
          }
          style={stepBtn}
        >
          +
        </button>
        <span style={{ color: theme.slate, fontSize: 11 }}>
          £{((fleet.fleetSize * VAN_OPEX_K_YR) / 1000).toFixed(1)}m/yr
        </span>
      </div>
      {noDepot ? (
        <div style={{ color: theme.warn, fontSize: 11 }}>build a depot to put crews on the road</div>
      ) : (
        <div style={{ color: theme.slate, fontSize: 11 }}>
          {busy} on jobs · {fleet.vans.length - busy} free
          {waiting > 0 && <span style={{ color: theme.danger }}> · {waiting} waiting</span>}
        </div>
      )}
      <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em', marginTop: 6 }}>
        TREE CUTTING
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {VEG_POLICY.map((p, i) => (
          <button
            key={p.name}
            onClick={() => sendCommand({ type: 'setVegPolicy', policy: i as VegPolicy })}
            style={{
              flex: 1,
              padding: '3px 0',
              borderRadius: 5,
              border: `1px solid ${theme.navyLight}`,
              background: fleet.vegPolicy === i ? theme.navyLight : 'transparent',
              color: fleet.vegPolicy === i ? theme.gold : theme.slate,
              fontFamily: theme.font,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      {snapshot.kpis.worstVegPct > 50 && (
        <div style={{ color: theme.warn, fontSize: 11, marginTop: 2 }}>
          worst overgrowth {snapshot.kpis.worstVegPct.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 24,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${theme.navyLight}`,
  background: 'transparent',
  color: theme.offWhite,
  fontFamily: theme.font,
  cursor: 'pointer',
};
