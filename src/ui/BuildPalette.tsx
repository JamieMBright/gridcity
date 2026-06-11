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
  return (
    <button
      onClick={() => setTool(active ? { t: 'inspect' } : tool)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
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
      <span>{label}</span>
      {cost && <span style={{ color: active ? theme.navy : theme.slate }}>{cost}</span>}
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

const GEN_ORDER: GenType[] = [
  'gasCCGT',
  'solarFarm',
  'windOnshore',
  'windOffshore',
  'nuclear',
  'battery',
];
const SUB_ORDER: SubType[] = ['bulk', 'grid', 'dist'];
const LEVELS: VoltageLevel[] = [400, 132, 33];

export function BuildPalette() {
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
        <div style={{ margin: '6px 9px 0', fontSize: 10, color: theme.slate }}>
          {tool.fromAssetId === undefined
            ? 'click a plant/substation to start the route'
            : 'click the far end · Esc to stop'}
        </div>
      )}
    </div>
  );
}
