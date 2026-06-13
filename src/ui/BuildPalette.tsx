import { useState } from 'react';
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
import type { PlacedAsset } from '../sim/assets';
import {
  buildTemplate,
  deleteTemplate,
  listTemplates,
  saveTemplate,
  type BuildTemplate,
  type CapturedLine,
  type CapturedSub,
} from '../persistence/templateStore';
import { fmtMoneyK, panelStyle, theme } from './theme';
import { useUnlockGate } from './unlocks';
import {
  GEN_ICONS,
  IconCable,
  IconDepot,
  IconDemolish,
  IconInspect,
  IconPylon,
  SUB_ICONS,
  type IconComponent,
} from './icons';

function sameTool(a: Tool, b: Tool): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'gen' && b.t === 'gen') return a.gen === b.gen;
  if (a.t === 'sub' && b.t === 'sub') return a.sub === b.sub;
  if (a.t === 'line' && b.t === 'line') return a.level === b.level;
  return true;
}

function ToolButton({
  tool,
  label,
  cost,
  Icon,
}: {
  tool: Tool;
  label: string;
  cost?: string;
  Icon?: IconComponent | undefined;
}) {
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
        {Icon && (
          <span style={{ flex: 'none', display: 'flex', width: 17, justifyContent: 'center' }}>
            <Icon size={16} />
          </span>
        )}
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

/** Build templates (#37): capture the session's recent substations (and
 *  the lines among them) into a named pattern, and stamp saved patterns
 *  elsewhere. The capture reads the recent-placement buffer the store
 *  fills off the snapshot; lines are recovered from the snapshot. */
function TemplateSection() {
  const recent = useAppStore((s) => s.recentSubPlacements);
  const snapshot = useAppStore((s) => s.snapshot);
  const setPaste = useAppStore((s) => s.setPasteTemplate);
  const setToast = useAppStore((s) => s.setToast);
  // listTemplates reads localStorage; a local version counter re-reads it
  // after save/delete without a store dependency
  const [rev, setRev] = useState(0);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const templates: BuildTemplate[] = listTemplates();
  void rev;

  // the last few operator subs placed this session, in order; cap at 6 so
  // a template stays a small, intentional motif (not the whole network)
  const captureIds = recent.slice(-6);
  const canCapture = captureIds.length > 0 && snapshot !== undefined;

  const doSave = (): void => {
    if (!snapshot) return;
    const idSet = new Set(captureIds);
    const subs: CapturedSub[] = [];
    for (const a of snapshot.assets as PlacedAsset[]) {
      if (a.kind === 'sub' && idSet.has(a.id) && a.sub !== 'tee' && !a.idno) {
        subs.push({ id: a.id, sub: a.sub, x: a.x, y: a.y });
      }
    }
    // lines whose BOTH endpoints are in the captured sub set
    const lines: CapturedLine[] = [];
    for (const a of snapshot.assets as PlacedAsset[]) {
      if (a.kind === 'line' && idSet.has(a.a) && idSet.has(a.b)) {
        lines.push({ level: a.level, build: a.build, a: a.a, b: a.b });
      }
    }
    const tpl = buildTemplate(name, subs, lines);
    if (!tpl) {
      setToast('nothing to save — place a substation or two first');
      return;
    }
    saveTemplate(tpl);
    setName('');
    setNaming(false);
    setRev((n) => n + 1);
    setToast(`saved template "${tpl.name}"`);
  };

  return (
    <Section title="Templates">
      {templates.length === 0 && !naming && (
        <div style={{ margin: '0 9px 4px', fontSize: 10.5, color: theme.slate, lineHeight: 1.5 }}>
          save a motif (e.g. grid sub + 33 kV feeder + dist sub) and stamp it elsewhere
        </div>
      )}
      {templates.map((t) => {
        const subN = t.members.filter((m) => m.kind === 'sub').length;
        const lineN = t.members.filter((m) => m.kind === 'line').length;
        return (
          <div
            key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 9px', margin: '2px 0' }}
          >
            <button
              onClick={() => setPaste(t)}
              title={`Stamp "${t.name}" — ${subN} sub${subN > 1 ? 's' : ''}${lineN ? `, ${lineN} feeder${lineN > 1 ? 's' : ''}` : ''}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 6,
                padding: '4px 7px',
                borderRadius: 5,
                border: `1px solid ${theme.navyLight}`,
                background: 'transparent',
                color: theme.offWhite,
                fontFamily: theme.font,
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ⊞ {t.name}
              </span>
              <span style={{ flex: 'none', color: theme.slate }}>
                {subN}s{lineN ? `·${lineN}f` : ''}
              </span>
            </button>
            <button
              aria-label={`delete template ${t.name}`}
              title="Delete template"
              onClick={() => {
                deleteTemplate(t.id);
                setRev((n) => n + 1);
              }}
              style={{
                flex: 'none',
                width: 22,
                height: 22,
                padding: 0,
                borderRadius: 5,
                border: `1px solid ${theme.navyLight}`,
                background: 'transparent',
                color: theme.slate,
                fontFamily: theme.font,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      {naming ? (
        <div style={{ display: 'flex', gap: 4, padding: '2px 9px' }}>
          <input
            autoFocus
            value={name}
            placeholder={`name (${captureIds.length} sub${captureIds.length > 1 ? 's' : ''})`}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSave();
              if (e.key === 'Escape') {
                setNaming(false);
                setName('');
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '4px 7px',
              borderRadius: 5,
              border: `1px solid ${theme.gold}`,
              background: 'rgba(0,0,0,0.25)',
              color: theme.offWhite,
              fontFamily: theme.font,
              fontSize: 11,
            }}
          />
          <button
            onClick={doSave}
            style={{
              flex: 'none',
              padding: '4px 9px',
              borderRadius: 5,
              border: 'none',
              background: theme.gold,
              color: theme.navy,
              fontFamily: theme.font,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            save
          </button>
        </div>
      ) : (
        <button
          disabled={!canCapture}
          onClick={() => setNaming(true)}
          title={
            canCapture
              ? 'Bundle the substations you just placed (and the lines between them) into a reusable template'
              : 'Place a substation or two first, then save them as a template'
          }
          style={{
            margin: '2px 9px',
            width: 'calc(100% - 18px)',
            padding: '5px 8px',
            borderRadius: 5,
            border: `1px dashed ${canCapture ? theme.gold : theme.navyLight}`,
            background: 'transparent',
            color: canCapture ? theme.gold : theme.slate,
            opacity: canCapture ? 1 : 0.6,
            fontFamily: theme.font,
            fontSize: 11,
            cursor: canCapture ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          + save my last {captureIds.length || ''} build{captureIds.length === 1 ? '' : 's'} as a template
        </button>
      )}
    </Section>
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
  'interconnector',
  'electrolyser',
];
const SUB_ORDER: SubType[] = ['bulk', 'grid', 'dist', 'pole', 'vault', 'capbank'];
const LEVELS: VoltageLevel[] = [400, 132, 33];

export function BuildPalette({ frame }: { frame?: React.CSSProperties } = {}) {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const ghost = useAppStore((s) => s.ghostInfo);
  const build: LineBuild = tool.t === 'line' ? tool.build : 'overhead';
  const gate = useUnlockGate();

  // progressive disclosure: on a mission, show only the tools the steps
  // have unlocked so far (game-design-core — irrelevant until learned)
  const gens = GEN_ORDER.filter((g) => gate.tool({ t: 'gen', gen: g }));
  const subs = SUB_ORDER.filter((s) => gate.tool({ t: 'sub', sub: s }));
  const levels = LEVELS.filter((lv) => gate.tool({ t: 'line', level: lv, build }));
  const showDepot = gate.tool({ t: 'depot' });

  return (
    <div
      data-tour="palette"
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
      {gens.length > 0 && (
        <Section title="Generation">
          {gens.map((g) => (
            <ToolButton
              key={g}
              tool={{ t: 'gen', gen: g }}
              label={GENS[g].name}
              cost={fmtMoneyK(GENS[g].capexK)}
              Icon={GEN_ICONS[g]}
            />
          ))}
        </Section>
      )}
      {subs.length > 0 && (
        <Section title="Substations">
          {subs.map((s) => (
            <ToolButton
              key={s}
              tool={{ t: 'sub', sub: s }}
              label={SUBS[s].name.split(' (')[0] ?? s}
              cost={fmtMoneyK(SUBS[s].capexK)}
              Icon={SUB_ICONS[s]}
            />
          ))}
          <AutoConnectToggle />
        </Section>
      )}
      {levels.length > 0 && (
        <Section title="Lines & cables">
          <div style={{ display: 'flex', gap: 4, margin: '0 9px 6px' }}>
            {(['overhead', 'underground'] as const).map((b) => (
              <button
                key={b}
                onClick={() => {
                  if (tool.t === 'line') setTool({ ...tool, build: b, fromAssetId: undefined });
                  else setTool({ t: 'line', level: levels[0] ?? 132, build: b });
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
          {levels.map((lv) => (
            <ToolButton
              key={lv}
              tool={{ t: 'line', level: lv, build }}
              label={`${lv} kV ${build === 'underground' ? 'cable' : 'line'}`}
              cost={`${fmtMoneyK(LINES[lv].capexKPerTile[build])}/km`}
              Icon={build === 'underground' ? IconCable : IconPylon}
            />
          ))}
        </Section>
      )}
      {showDepot && (
        <Section title="Operations">
          <ToolButton tool={{ t: 'depot' }} label="Field depot" cost={fmtMoneyK(DEPOT.capexK)} Icon={IconDepot} />
        </Section>
      )}
      <Section title="Tools">
        <ToolButton tool={{ t: 'inspect' }} label="Inspect" Icon={IconInspect} />
        <ToolButton tool={{ t: 'demolish' }} label="Demolish" Icon={IconDemolish} />
      </Section>
      <TemplateSection />
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
          <div style={{ marginTop: 2 }}>
            click open ground to drop WAYPOINT towers — the route bends
            through them (Esc removes the last)
          </div>
        </div>
      )}
    </div>
  );
}
