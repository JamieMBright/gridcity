// The Asset Guide: a browsable encyclopedia of every build option (owner,
// 2026-06-13 — "the player needs to know what each build option IS"). A
// full-screen glassy dusk modal in the LessonsPage visual language: each
// row carries the asset's CODE-DRAWN icon (large) + title + a short lede,
// and expands (accordion) to its what / does / when plus the live catalog
// stats. Deep-linkable via store.guideFocus so the build palette / mobile
// rail can jump straight to one entry.
//
// Layout reflow: the entry rows are a single column that fills the panel
// width, so it reads identically on desktop and phone-landscape — the panel
// itself is width: min(680px, 94vw) and maxHeight 88vh with its own scroll,
// exactly like LessonsPage. The expanded stat chips wrap (flex-wrap) so a
// narrow landscape phone never overflows horizontally.

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import {
  ASSET_GUIDE,
  GUIDE_CATEGORIES,
  entriesFor,
  type GuideEntry,
} from './assetGuide';
import { theme } from './theme';

function StatChips({ entry }: { entry: GuideEntry }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {entry.stats.map((st) => (
        <span
          key={st.label}
          style={{
            display: 'inline-flex',
            gap: 5,
            alignItems: 'baseline',
            padding: '3px 8px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(125,135,180,0.22)',
            fontSize: 11,
          }}
        >
          <span style={{ color: theme.slate, letterSpacing: '0.02em' }}>{st.label}</span>
          <b style={{ color: theme.offWhite }}>{st.value}</b>
        </span>
      ))}
    </div>
  );
}

function Para({ tag, color, children }: { tag: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
      <span
        style={{
          color,
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginRight: 7,
        }}
      >
        {tag}
      </span>
      <span style={{ color: theme.offWhite }}>{children}</span>
    </div>
  );
}

function GuideRow({
  entry,
  open,
  onToggle,
}: {
  entry: GuideEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = entry.Icon;
  return (
    <div
      data-guide-key={entry.key}
      style={{
        margin: '8px 0 0',
        borderRadius: 12,
        border: `1px solid ${open ? 'rgba(245,196,105,0.4)' : 'rgba(125,135,180,0.3)'}`,
        background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.035)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          width: '100%',
          padding: '11px 13px',
          background: 'transparent',
          border: 'none',
          color: theme.offWhite,
          fontFamily: theme.font,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            flex: 'none',
            width: 52,
            height: 52,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,14,34,0.5)',
            border: '1px solid rgba(125,135,180,0.25)',
            color: open ? theme.gold : theme.orangeSoft,
          }}
        >
          <Icon size={32} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 13.5 }}>{entry.title}</b>
          <div
            style={{
              color: theme.slate,
              fontSize: 11.5,
              marginTop: 3,
              lineHeight: 1.45,
              ...(open
                ? {}
                : {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }),
            }}
          >
            {entry.what}
          </div>
        </span>
        <span style={{ flex: 'none', color: theme.slate, fontSize: 13 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 13px 13px', borderTop: '1px solid rgba(125,135,180,0.18)' }}>
          <Para tag="does" color={theme.orange}>
            {entry.does}
          </Para>
          <Para tag="when" color={theme.gold}>
            {entry.when}
          </Para>
          <StatChips entry={entry} />
        </div>
      )}
    </div>
  );
}

export function AssetGuide(): React.JSX.Element | null {
  const guideOpen = useAppStore((s) => s.guideOpen);
  const guideFocus = useAppStore((s) => s.guideFocus);
  const setGuideOpen = useAppStore((s) => s.setGuideOpen);
  const [openKey, setOpenKey] = useState<string | undefined>(undefined);

  // open expanded on the deep-link target, and scroll it into view
  useEffect(() => {
    if (!guideOpen) return;
    setOpenKey(guideFocus);
    if (guideFocus) {
      // let the row render before scrolling to it
      const id = requestAnimationFrame(() => {
        document
          .querySelector(`[data-guide-key="${CSS.escape(guideFocus)}"]`)
          ?.scrollIntoView({ block: 'center' });
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [guideOpen, guideFocus]);

  if (!guideOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}d0`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(680px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 22,
          padding: '22px 22px 16px',
          background: 'rgba(13, 17, 36, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(125, 135, 180, 0.28)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
          fontFamily: theme.font,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div
            style={{
              color: theme.orange,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Asset Guide — Know Your Kit
          </div>
          <button
            onClick={() => setGuideOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.slate,
              fontFamily: theme.font,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ← back
          </button>
        </div>
        <div style={{ color: theme.slate, fontSize: 11.5, margin: '6px 0 4px', lineHeight: 1.5 }}>
          every build option, in plain English · what it is in the real world, what it does in the
          game, and when to reach for it · tap a row to open it
        </div>

        {GUIDE_CATEGORIES.map((cat) => {
          const rows = entriesFor(cat);
          if (rows.length === 0) return null;
          return (
            <div key={cat} style={{ marginTop: 14 }}>
              <div
                style={{
                  color: theme.gold,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {cat}
              </div>
              {rows.map((entry) => (
                <GuideRow
                  key={entry.key}
                  entry={entry}
                  open={openKey === entry.key}
                  onToggle={() => setOpenKey((k) => (k === entry.key ? undefined : entry.key))}
                />
              ))}
            </div>
          );
        })}

        <div style={{ color: theme.slate, fontSize: 10, marginTop: 14, textAlign: 'center' }}>
          {ASSET_GUIDE.length} build options · stats are live from the game catalog
        </div>
      </div>
    </div>
  );
}
