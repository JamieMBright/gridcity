// Phone layout: the desktop's spread-out panels become a narrow build
// rail on the left (tap an icon to arm that tool, » to expand the full
// palette with names and prices) and a chip column on the right that
// opens the bill / fleet / inbox / alerts panels one at a time as
// drawers. The HUD runs compact along the bottom.

import { useEffect, useState } from 'react';
import { hotkeyLabel } from '../app/hotkeys';
import { useAppStore, type Tool } from '../app/store';
import { LEVEL_COLOR } from '../render/MapRenderer';
import { AlertsFeed } from './AlertsFeed';
import { BillPanel } from './BillPanel';
import { BuildPalette } from './BuildPalette';
import { FleetPanel } from './FleetPanel';
import { InboxPanel } from './InboxPanel';
import { InfoPanel } from './InfoPanel';
import { panelStyle, theme } from './theme';

interface RailItem {
  icon: string;
  tool: Tool;
  label: string;
  color?: string;
}

const RAIL: RailItem[] = [
  { icon: '🔍', tool: { t: 'inspect' }, label: 'Inspect' },
  { icon: '🏭', tool: { t: 'gen', gen: 'gasCCGT' }, label: 'Gas CCGT' },
  { icon: '🔥', tool: { t: 'gen', gen: 'gasPeaker' }, label: 'Gas peaker' },
  { icon: '☀️', tool: { t: 'gen', gen: 'solarFarm' }, label: 'Solar farm' },
  { icon: '🍃', tool: { t: 'gen', gen: 'windOnshore' }, label: 'Onshore wind' },
  { icon: '💨', tool: { t: 'gen', gen: 'windOffshore' }, label: 'Offshore wind' },
  { icon: '🌊', tool: { t: 'gen', gen: 'tidal' }, label: 'Tidal stream' },
  { icon: '🌿', tool: { t: 'gen', gen: 'biomass' }, label: 'Biomass CHP' },
  { icon: '☢️', tool: { t: 'gen', gen: 'nuclear' }, label: 'Nuclear' },
  { icon: '🔋', tool: { t: 'gen', gen: 'battery' }, label: 'Battery' },
  { icon: '⬛', tool: { t: 'gen', gen: 'coal' }, label: 'Coal station' },
  { icon: '🔌', tool: { t: 'gen', gen: 'interconnector' }, label: 'Interconnector' },
  { icon: 'H₂', tool: { t: 'gen', gen: 'electrolyser' }, label: 'Hydrogen electrolyser' },
  { icon: 'BSP', tool: { t: 'sub', sub: 'bulk' }, label: 'Bulk supply point' },
  { icon: 'GRD', tool: { t: 'sub', sub: 'grid' }, label: 'Grid substation' },
  { icon: 'DST', tool: { t: 'sub', sub: 'dist' }, label: 'Distribution sub' },
  { icon: 'POL', tool: { t: 'sub', sub: 'pole' }, label: 'Pole transformer' },
  { icon: 'VLT', tool: { t: 'sub', sub: 'vault' }, label: 'Underground sub' },
  { icon: 'CAP', tool: { t: 'sub', sub: 'capbank' }, label: 'Capacitor bank' },
  { icon: '400', tool: { t: 'line', level: 400, build: 'overhead' }, label: '400 kV line', color: hex(LEVEL_COLOR[400]) },
  { icon: '132', tool: { t: 'line', level: 132, build: 'overhead' }, label: '132 kV line', color: hex(LEVEL_COLOR[132]) },
  { icon: '33', tool: { t: 'line', level: 33, build: 'overhead' }, label: '33 kV line', color: hex(LEVEL_COLOR[33]) },
  { icon: '🚐', tool: { t: 'depot' }, label: 'Field depot' },
  { icon: '⛏', tool: { t: 'demolish' }, label: 'Demolish' },
];

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

function railActive(current: Tool, item: Tool): boolean {
  if (current.t !== item.t) return false;
  if (item.t === 'gen' && current.t === 'gen') return current.gen === item.gen;
  if (item.t === 'sub' && current.t === 'sub') return current.sub === item.sub;
  if (item.t === 'line' && current.t === 'line') return current.level === item.level;
  return true;
}

function BuildRail({ onExpand }: { onExpand: () => void }) {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const ug = tool.t === 'line' && tool.build === 'underground';

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 44,
        bottom: 44,
        left: 4,
        width: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '4px 0',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      <button onClick={onExpand} style={railBtn(false)} aria-label="open build menu">
        »
      </button>
      {RAIL.map((item) => {
        const active = railActive(tool, item.tool);
        const key = hotkeyLabel(item.tool);
        return (
          <button
            key={`${item.tool.t}:${key ?? item.icon}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => {
              if (active) {
                setTool({ t: 'inspect' });
              } else if (item.tool.t === 'line') {
                const build = tool.t === 'line' ? tool.build : 'overhead';
                setTool({ t: 'line', level: item.tool.level, build });
              } else {
                setTool(item.tool);
              }
            }}
            style={{
              ...railBtn(active),
              ...(item.icon.length > 2
                ? { fontSize: 9, fontWeight: 700, letterSpacing: '0.02em' }
                : { fontSize: 16 }),
              ...(item.color && !active ? { color: item.color } : {}),
            }}
          >
            {item.icon}
          </button>
        );
      })}
      {tool.t === 'line' && (
        <button
          aria-label="toggle underground"
          onClick={() => setTool({ ...tool, build: ug ? 'overhead' : 'underground', fromAssetId: undefined })}
          style={{ ...railBtn(ug), fontSize: 9, fontWeight: 700 }}
        >
          {ug ? 'UG' : 'OH'}
        </button>
      )}
    </div>
  );
}

function railBtn(active: boolean): React.CSSProperties {
  return {
    flex: 'none',
    width: 36,
    height: 36,
    borderRadius: 7,
    border: 'none',
    background: active ? theme.orange : 'transparent',
    color: active ? theme.navy : theme.offWhite,
    fontFamily: theme.font,
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: '36px',
    padding: 0,
  };
}

type Sheet = 'build' | 'bill' | 'fleet' | 'inbox' | 'alerts' | undefined;

function Chip({
  icon,
  active,
  badge,
  onClick,
  label,
}: {
  icon: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        borderRadius: 7,
        border: `1px solid ${active ? theme.orange : theme.navyLight}`,
        background: active ? theme.orange : 'rgba(16, 22, 48, 0.88)',
        color: active ? theme.navy : theme.offWhite,
        fontSize: 15,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            background: theme.danger,
            color: theme.offWhite,
            fontSize: 9,
            lineHeight: '14px',
            fontFamily: theme.font,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

const sheetFrame: React.CSSProperties = {
  position: 'absolute',
  top: 44,
  right: 4,
  left: 'auto',
  bottom: 'auto',
  width: 'min(300px, calc(100vw - 60px))',
  maxHeight: 'calc(100dvh - 100px)',
  overflowY: 'auto',
};

export function MobileChrome() {
  const [sheet, setSheet] = useState<Sheet>(undefined);
  const snapshot = useAppStore((s) => s.snapshot);
  const tool = useAppStore((s) => s.tool);
  const kpiOpen = useAppStore((s) => s.kpiOpen);
  const setKpiOpen = useAppStore((s) => s.setKpiOpen);
  const openApps =
    snapshot?.inbox.applications.filter((a) => a.status === 'open').length ?? 0;
  const openPitches = snapshot?.inbox.pitches.filter((p) => p.status === 'open').length ?? 0;
  const toggle = (s: Exclude<Sheet, undefined>): void => setSheet(sheet === s ? undefined : s);

  // picking a tool from the expanded palette collapses it back to the rail
  useEffect(() => {
    setSheet((cur) => (cur === 'build' ? undefined : cur));
  }, [tool]);

  return (
    <>
      <BuildRail onExpand={() => setSheet('build')} />
      <div
        style={{
          position: 'absolute',
          top: 44,
          right: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Chip icon="💷" label="bill" active={sheet === 'bill'} onClick={() => toggle('bill')} />
        <Chip icon="🚐" label="fleet" active={sheet === 'fleet'} onClick={() => toggle('fleet')} />
        <Chip
          icon="📨"
          label="inbox"
          active={sheet === 'inbox'}
          badge={openApps + openPitches}
          onClick={() => toggle('inbox')}
        />
        <Chip icon="📜" label="alerts" active={sheet === 'alerts'} onClick={() => toggle('alerts')} />
        <Chip icon="📊" label="RIIO KPIs" active={kpiOpen} onClick={() => setKpiOpen(!kpiOpen)} />
      </div>

      {sheet !== undefined && (
        <div
          onClick={() => setSheet(undefined)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 34, 0.35)' }}
        />
      )}
      {sheet === 'build' && (
        <BuildPalette
          frame={{
            top: 44,
            left: 52,
            bottom: 44,
            width: 'min(250px, calc(100vw - 110px))',
            maxHeight: 'none',
          }}
        />
      )}
      {sheet === 'bill' && <BillPanel frame={sheetFrame} />}
      {sheet === 'fleet' && <FleetPanel frame={sheetFrame} />}
      {sheet === 'inbox' && <InboxPanel frame={{ ...sheetFrame, maxHeight: 'calc(100dvh - 100px)' }} />}
      {sheet === 'alerts' && (
        <AlertsFeed frame={{ ...sheetFrame, maxHeight: 'calc(100dvh - 100px)', width: 'min(320px, calc(100vw - 60px))' }} />
      )}

      {/* tap-to-inspect details, tucked under the chip column */}
      {sheet === undefined && tool.t === 'inspect' && (
        <InfoPanel
          frame={{ top: 44, right: 44, width: 'min(230px, calc(100vw - 104px))', fontSize: 12 }}
        />
      )}
    </>
  );
}
