import { hotkeyLabel } from '../app/hotkeys';
import { useAppStore, type Tool } from '../app/store';
import {
  DEPOT,
  GENS,
  LINES,
  SUBS,
  type GenType,
  type LineBuild,
  type SubType,
} from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import { fmtMoneyK, panelStyle, theme } from './theme';

function sameTool(a: Tool, b: Tool): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'gen' && b.t === 'gen') return a.gen === b.gen;
  if (a.t === 'sub' && b.t === 'sub') return a.sub === b.sub;
  if (a.t === 'line' && b.t === 'line') return a.level === b.level;
  return true;
}

function ToolButton({ tool, label, cost }: { tool: Tool; label: string; cost?: string }) {
  const current = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const active = sameTool(current, tool);
  const key = hotkeyLabel(tool);
  return (
    <button
      onClick={() => setTool(active ? { t: 'inspect' } : tool)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '5px 9px',
        background: active ? theme.orange : 'transparent',
        color: active ? theme.navy : theme.offWhite,
        border: 'none',
        borderRadius: 5,
        fontFamily: theme.font,
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {key && (
          <span
            style={{
              flex: 'none',
              width: 14,
              textAlign: 'center',
              fontSize: 9,
              lineHeight: '13px',
              borderRadius: 3,
              border: `1px solid ${active ? theme.navy : theme.navyLight}`,
              color: active ? theme.navy : theme.slate,
            }}
          >
            {key}
          </span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </span>
      {cost && <span style={{ flex: 'none', color: active ? theme.navy : theme.slate }}>{cost}</span>}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          color: theme.slate,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin: '4px 9px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/** Setting: a freshly placed substation runs its own circuits to the
 *  nearest compatible bays (overhead where possible, cable where not). */
function AutoConnectToggle() {
  const on = useAppStore((s) => s.autoConnect);
  const setAutoConnect = useAppStore((s) => s.setAutoConnect);
  return (
    <button
      onClick={() => setAutoConnect(!on)}
      title="Placing a substation automatically connects it to the nearest compatible bays"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '4px 9px',
        background: 'transparent',
        color: on ? theme.gold : theme.slate,
        border: 'none',
        borderRadius: 5,
        fontFamily: theme.font,
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span>auto-connect on placement</span>
      <span
        style={{
          flex: 'none',
          width: 26,
          textAlign: 'center',
          fontSize: 9,
          lineHeight: '14px',
          borderRadius: 7,
          border: `1px solid ${on ? theme.gold : theme.navyLight}`,
        }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

const GEN_ORDER: GenType[] = [
  'gasCCGT',
  'gasPeaker',
  'solarFarm',
  'windOnshore',
  'windOffshore',
  'tidal',
  'biomass',
  'nuclear',
  'battery',
  'coal',
];
const SUB_ORDER: SubType[] = ['bulk', 'grid', 'dist', 'pole', 'vault'];
const LEVELS: VoltageLevel[] = [400, 132, 33];

export function BuildPalette({ frame }: { frame?: React.CSSProperties } = {}) {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const ghost = useAppStore((s) => s.ghostInfo);
  const build: LineBuild = tool.t === 'line' ? tool.build : 'overhead';

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 70,
        left: 12,
        width: 230,
        padding: '8px 4px',
        // stay clear of the fleet panel + status bar below
        maxHeight: 'calc(100vh - 330px)',
        overflowY: 'auto',
        ...frame,
      }}
    >
      <Section title="Generation">
        {GEN_ORDER.map((g) => (
          <ToolButton
            key={g}
            tool={{ t: 'gen', gen: g }}
            label={GENS[g].name}
            cost={fmtMoneyK(GENS[g].capexK)}
          />
        ))}
      </Section>
      <Section title="Substations">
        {SUB_ORDER.map((s) => (
          <ToolButton
            key={s}
            tool={{ t: 'sub', sub: s }}
            label={SUBS[s].name.split(' (')[0] ?? s}
            cost={fmtMoneyK(SUBS[s].capexK)}
          />
        ))}
        <AutoConnectToggle />
      </Section>
      <Section title="Lines & cables">
        <div style={{ display: 'flex', gap: 4, margin: '0 9px 6px' }}>
          {(['overhead', 'underground'] as const).map((b) => (
            <button
              key={b}
              onClick={() => {
                if (tool.t === 'line') setTool({ ...tool, build: b, fromAssetId: undefined });
                else setTool({ t: 'line', level: 132, build: b });
              }}
              style={{
                flex: 1,
                padding: '3px 0',
                borderRadius: 5,
                border: `1px solid ${theme.navyLight}`,
                background: build === b ? theme.navyLight : 'transparent',
                color: build === b ? theme.gold : theme.slate,
                fontFamily: theme.font,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {b === 'overhead' ? 'overhead' : 'underground'}
            </button>
          ))}
        </div>
        {LEVELS.map((lv) => (
          <ToolButton
            key={lv}
            tool={{ t: 'line', level: lv, build }}
            label={`${lv} kV ${build === 'underground' ? 'cable' : 'line'}`}
            cost={`${fmtMoneyK(LINES[lv].capexKPerTile[build])}/km`}
          />
        ))}
      </Section>
      <Section title="Operations">
        <ToolButton tool={{ t: 'depot' }} label="Field depot" cost={fmtMoneyK(DEPOT.capexK)} />
      </Section>
      <Section title="Tools">
        <ToolButton tool={{ t: 'inspect' }} label="Inspect" />
        <ToolButton tool={{ t: 'demolish' }} label="Demolish" />
      </Section>
      {ghost && (
        <div
          style={{
            margin: '0 9px',
            paddingTop: 6,
            borderTop: `1px solid ${theme.navyLight}`,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: theme.gold }}>{ghost.label}</div>
          {ghost.ok ? (
            <>
              <div>cost {fmtMoneyK(ghost.capexK)}</div>
              <div style={{ color: theme.orangeSoft }}>
                {ghost.billImpactYr !== undefined
                  ? `+£${ghost.billImpactYr.toFixed(2)}/yr on bills`
                  : 'bill impact once customers are on supply'}
              </div>
            </>
          ) : (
            <div style={{ color: theme.danger }}>{ghost.error}</div>
          )}
        </div>
      )}
      {tool.t === 'line' && (
        <div style={{ margin: '6px 9px 0', fontSize: 10, color: theme.slate, lineHeight: 1.5 }}>
          {tool.fromAssetId === undefined
            ? 'click a ringed asset to start the route'
            : 'click the far end · Esc to stop'}
          <div style={{ marginTop: 2 }}>
            bays — BSP: 400/132/33 · grid: 132/33 · dist/pole/vault: 33 · plants: their own kV
          </div>
          <div style={{ marginTop: 2 }}>
            voltage steps up/down INSIDE substations — land a 33 kV line on a BSP and the
            transformers carry it to the supergrid
          </div>
          <div style={{ marginTop: 2 }}>
            mid-route, click an existing same-kV circuit to TEE into it
          </div>
        </div>
      )}
    </div>
  );
}
