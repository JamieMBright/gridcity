// Phone layout: the desktop's spread-out panels become a narrow build
// rail on the left (tap an icon to arm that tool, » to expand the full
// palette with names and prices) and a chip column on the right that
// opens the bill / fleet / inbox / alerts panels one at a time as
// drawers. The HUD runs compact along the bottom.

import { useEffect, useState } from 'react';
import { hotkeyLabel } from '../app/hotkeys';
import { useAppStore, type Tool } from '../app/store';
import { GENS, GEN_PALETTE_ORDER, LOAD_PALETTE_ORDER } from '../sim/catalog';
import { LEVEL_COLOR } from '../render/MapRenderer';
import { AlertsFeed } from './AlertsFeed';
import { BillPanel } from './BillPanel';
import { BuildPalette } from './BuildPalette';
import { FleetPanel } from './FleetPanel';
import { InboxPanel } from './InboxPanel';
import { InfoPanel } from './InfoPanel';
import { MobileInspector } from './MobileInspector';
import { panelStyle, theme } from './theme';
import { useUnlockGate } from './unlocks';
import {
  GEN_ICONS,
  IconBill,
  IconBuilding,
  IconDemolish,
  IconDepot,
  IconHelp,
  IconInbox,
  IconInspect,
  IconLedger,
  IconReport,
  IconSave,
  IconVan,
  SUB_ICONS,
  type IconComponent,
} from './icons';

interface RailItem {
  /** Bespoke glyph (ink-contour SVG). Voltage levels render as text. */
  Icon?: IconComponent | undefined;
  /** Short text badge for numeric signage (kV levels). */
  text?: string | undefined;
  tool: Tool;
  label: string;
  color?: string | undefined;
}

// generation rail entries, voltage-sorted from the catalog, then the
// demand-side loads (the electrolyser) — same single source of truth as the
// desktop palette + hotkeys so the rail never diverges (owner, 2026-06-26).
const GEN_RAIL: RailItem[] = [...GEN_PALETTE_ORDER, ...LOAD_PALETTE_ORDER].map((gen) => ({
  Icon: GEN_ICONS[gen],
  tool: { t: 'gen', gen } as Tool,
  label: GENS[gen].name,
}));

const RAIL: RailItem[] = [
  { Icon: IconInspect, tool: { t: 'inspect' }, label: 'Inspect' },
  ...GEN_RAIL,
  { Icon: SUB_ICONS.bulk, tool: { t: 'sub', sub: 'bulk' }, label: 'Bulk supply point' },
  { Icon: SUB_ICONS.grid, tool: { t: 'sub', sub: 'grid' }, label: 'Grid substation' },
  { Icon: SUB_ICONS.dist, tool: { t: 'sub', sub: 'dist' }, label: 'Distribution sub' },
  { Icon: SUB_ICONS.pole, tool: { t: 'sub', sub: 'pole' }, label: 'Pole transformer' },
  { Icon: SUB_ICONS.vault, tool: { t: 'sub', sub: 'vault' }, label: 'Underground sub' },
  { Icon: SUB_ICONS.capbank, tool: { t: 'sub', sub: 'capbank' }, label: 'Capacitor bank' },
  { text: '400', tool: { t: 'line', level: 400, build: 'overhead' }, label: '400 kV line', color: hex(LEVEL_COLOR[400]) },
  { text: '132', tool: { t: 'line', level: 132, build: 'overhead' }, label: '132 kV line', color: hex(LEVEL_COLOR[132]) },
  { text: '33', tool: { t: 'line', level: 33, build: 'overhead' }, label: '33 kV line', color: hex(LEVEL_COLOR[33]) },
  { Icon: IconDepot, tool: { t: 'depot' }, label: 'Field depot' },
  { Icon: IconDemolish, tool: { t: 'demolish' }, label: 'Demolish' },
];

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** Deep-link key for the Asset Guide when a build tool is armed (matches the
 *  guide entry keys: gen:… / sub:… / line:… / depot); undefined opens the
 *  guide at the top. */
function guideFocusFor(tool: Tool): string | undefined {
  if (tool.t === 'gen') return `gen:${tool.gen}`;
  if (tool.t === 'sub') return `sub:${tool.sub}`;
  if (tool.t === 'line') return `line:${tool.level}`;
  if (tool.t === 'depot') return 'depot';
  return undefined;
}

function railActive(current: Tool, item: Tool): boolean {
  if (current.t !== item.t) return false;
  if (item.t === 'gen' && current.t === 'gen') return current.gen === item.gen;
  if (item.t === 'sub' && current.t === 'sub') return current.sub === item.sub;
  if (item.t === 'line' && current.t === 'line') return current.level === item.level;
  return true;
}

function BuildRail() {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const ug = tool.t === 'line' && tool.build === 'underground';
  const gate = useUnlockGate();
  // on a mission, only the unlocked tools (inspect always available)
  const items = RAIL.filter((item) => gate.tool(item.tool));

  // two-layer like RailPanelShell (the square-corner Chromium bug): the
  // rounded + blurred OUTER must not also be the scroll container, so the
  // button column scrolls in an INNER and the outer clips it to the radius.
  return (
    <div
      data-tour="palette"
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 'calc(44px + var(--sai-t))',
        bottom: 'calc(44px + var(--sai-b))',
        left: 'calc(4px + var(--sai-l))',
        width: 44,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '4px 0',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          boxSizing: 'border-box',
        }}
      >
      {items.map((item) => {
        const active = railActive(tool, item.tool);
        const key = hotkeyLabel(item.tool);
        const Icon = item.Icon;
        return (
          <button
            key={`${item.tool.t}:${key ?? item.text ?? item.label}`}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...(item.text ? { fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' } : {}),
              ...(item.color && !active ? { color: item.color } : {}),
            }}
          >
            {Icon ? <Icon size={22} /> : item.text}
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
    </div>
  );
}

/** The build-palette EXPAND (») affordance, pinned so it is reachable at
 *  ALL zoom levels and tool/scroll states — it lives OUTSIDE the scrolling
 *  build rail (which could carry it off-screen) and is always rendered
 *  (missions included), so panning, zooming or arming a tool never hides
 *  the way into the fuller detail palette. */
function ExpandToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      data-tour="expand"
      onClick={onToggle}
      aria-label={open ? 'close build menu' : 'open build menu'}
      title={open ? 'Close the full build palette' : 'Open the full build palette'}
      style={{
        position: 'absolute',
        // tucked just outside the 44px rail, fixed to the top of the
        // build column — never scrolls with the rail, never overlaps it
        top: 'calc(44px + var(--sai-t))',
        left: 'calc(50px + var(--sai-l))',
        width: 30,
        height: 40,
        zIndex: 6,
        borderRadius: '0 8px 8px 0',
        border: `1px solid ${theme.navyLight}`,
        borderLeft: 'none',
        background: open ? theme.orange : 'rgba(16, 22, 48, 0.92)',
        color: open ? theme.navy : theme.gold,
        fontFamily: theme.font,
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        boxShadow: '0 2px 10px rgba(6, 8, 20, 0.4)',
      }}
    >
      {open ? '«' : '»'}
    </button>
  );
}

function railBtn(active: boolean): React.CSSProperties {
  return {
    flex: 'none',
    // 40px in a 44px rail: with the rail padding every tap target
    // clears the 44pt touch floor (game-UI doctrine, sweaty thumbs)
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 'none',
    background: active ? theme.orange : 'transparent',
    color: active ? theme.navy : theme.offWhite,
    fontFamily: theme.font,
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: '40px',
    padding: 0,
  };
}

type Sheet = 'build' | 'bill' | 'fleet' | 'inbox' | 'alerts' | undefined;

function Chip({
  Icon,
  active,
  badge,
  onClick,
  label,
  tour,
}: {
  Icon: IconComponent;
  active: boolean;
  badge?: number;
  onClick: () => void;
  label: string;
  tour?: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      data-tour={tour}
      onClick={onClick}
      style={{
        position: 'relative',
        // 42px + the column gap clears the 44pt touch-target floor
        width: 42,
        height: 42,
        borderRadius: 9,
        border: `1px solid ${active ? theme.orange : theme.navyLight}`,
        background: active ? theme.orange : 'rgba(16, 22, 48, 0.88)',
        color: active ? theme.navy : theme.offWhite,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <Icon size={22} />
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
  top: 'calc(44px + var(--sai-t))',
  right: 'calc(4px + var(--sai-r))',
  left: 'auto',
  bottom: 'auto',
  width: 'min(300px, calc(100vw - 60px - var(--sai-l) - var(--sai-r)))',
  maxHeight: 'calc(100dvh - 100px)',
  overflowY: 'auto',
};

export function MobileChrome() {
  const [sheet, setSheet] = useState<Sheet>(undefined);
  const snapshot = useAppStore((s) => s.snapshot);
  const tool = useAppStore((s) => s.tool);
  const kpiOpen = useAppStore((s) => s.kpiOpen);
  const setKpiOpen = useAppStore((s) => s.setKpiOpen);
  const directoratesOpen = useAppStore((s) => s.directoratesOpen);
  const setDirectoratesOpen = useAppStore((s) => s.setDirectoratesOpen);
  const savesOpen = useAppStore((s) => s.savesOpen);
  const setSavesOpen = useAppStore((s) => s.setSavesOpen);
  const guideOpen = useAppStore((s) => s.guideOpen);
  const setGuideOpen = useAppStore((s) => s.setGuideOpen);
  const gate = useUnlockGate();
  const show = (key: string): boolean => !gate.active || gate.has(key);
  const openApps =
    snapshot?.inbox.applications.filter((a) => a.status === 'open').length ?? 0;
  const openPitches = snapshot?.inbox.pitches.filter((p) => p.status === 'open').length ?? 0;
  const toggle = (s: Exclude<Sheet, undefined>): void => setSheet(sheet === s ? undefined : s);

  // picking a tool from the expanded palette collapses it back to the rail
  useEffect(() => {
    setSheet((cur) => (cur === 'build' ? undefined : cur));
  }, [tool]);

  return (
    <div data-chrome-mobile style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* the floating bits manage their own taps; this wrapper is a single
          recolour target for System Prepare's hazard filter (#D). pointer-events
          pass through the gaps to the map, children re-enable via the rule. */}
      <style>{'[data-chrome-mobile]>*{pointer-events:auto}'}</style>
      <BuildRail />
      <ExpandToggle open={sheet === 'build'} onToggle={() => toggle('build')} />
      <div
        style={{
          position: 'absolute',
          top: 'calc(44px + var(--sai-t))',
          right: 'calc(4px + var(--sai-r))',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {show('hud:bill') && (
          <Chip Icon={IconBill} label="bill" tour="bill" active={sheet === 'bill'} onClick={() => toggle('bill')} />
        )}
        {show('hud:fleet') && (
          <Chip Icon={IconVan} label="fleet" active={sheet === 'fleet'} onClick={() => toggle('fleet')} />
        )}
        {show('hud:inbox') && (
          <Chip
            Icon={IconInbox}
            label="inbox"
            tour="inbox"
            active={sheet === 'inbox'}
            badge={openApps + openPitches}
            onClick={() => toggle('inbox')}
          />
        )}
        {show('hud:alerts') && (
          <Chip Icon={IconLedger} label="alerts" active={sheet === 'alerts'} onClick={() => toggle('alerts')} />
        )}
        {show('hud:kpi') && (
          <Chip
            Icon={IconReport}
            // active scheme tag when short (GB "RIIO KPIs"); else neutral "KPIs"
            label={
              snapshot && snapshot.riio.regulator.scheme.length <= 6
                ? `${snapshot.riio.regulator.scheme} KPIs`
                : 'KPIs'
            }
            active={kpiOpen}
            onClick={() => setKpiOpen(!kpiOpen)}
          />
        )}
        {show('hud:kpi') && (
          <Chip
            Icon={IconBuilding}
            label="the network business"
            active={directoratesOpen}
            onClick={() => setDirectoratesOpen(!directoratesOpen)}
          />
        )}
        <Chip
          Icon={IconHelp}
          label="asset guide"
          active={guideOpen}
          onClick={() => setGuideOpen(true, guideFocusFor(tool))}
        />
        <Chip Icon={IconSave} label="save slots" active={savesOpen} onClick={() => setSavesOpen(true)} />
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

      {/* tap-to-inspect: a hovered tile's quick info rides the top-right
          card; a PINNED asset/line opens the thumb-reach bottom-sheet (#35) */}
      {sheet === undefined && tool.t === 'inspect' && (
        <InfoPanel
          hidePinned
          frame={{
            // BELOW the top stat bar (it ends ~90px) with its own z so the card
            // is never hidden behind the bar (owner, 2026-06-18); sit clear of
            // the right chip column and stay narrow so it doesn't eat the middle
            top: 'calc(96px + var(--sai-t))',
            right: 'calc(48px + var(--sai-r))',
            width: 'min(200px, calc(100vw - 150px))',
            fontSize: 12,
            zIndex: 9,
          }}
        />
      )}
      {sheet === undefined && <MobileInspector />}
    </div>
  );
}
