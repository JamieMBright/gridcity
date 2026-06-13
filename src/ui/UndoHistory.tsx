// Undo history list (ROADMAP #27): a small panel of the recent undo-able
// actions, newest at the top, each with a one-line label and a relative
// timestamp. Clicking an entry reverts back THROUGH that action in one
// worker message (undoTo). Ctrl+Z still walks one step at a time.
//
// Opened by right-clicking (or long-pressing) the undo button — wired in
// Hud.tsx — and dismissed by clicking away or ✕.

import { useAppStore } from '../app/store';
import { undoTo } from '../app/workerBridge';
import { panelStyle, theme } from './theme';

export function UndoHistory() {
  const open = useAppStore((s) => s.undoListOpen);
  const setOpen = useAppStore((s) => s.setUndoListOpen);
  const labels = useAppStore((s) => s.snapshot?.undoLabels);
  if (!open) return null;

  // newest first: the LAST label is the most recent action. depth =
  // how many steps back this entry is (1 = undo once).
  const rows = (labels ?? []).map((label, i, arr) => ({
    label,
    depth: arr.length - i,
  }));
  rows.reverse();

  const undoBack = (depth: number): void => {
    undoTo(depth);
    setOpen(false);
  };

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 8 }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          position: 'absolute',
          left: '50%',
          bottom: 56,
          transform: 'translateX(-50%)',
          width: 'min(300px, 92vw)',
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.orange, fontWeight: 700, letterSpacing: '0.1em', fontSize: 11 }}>
            UNDO HISTORY
          </span>
          <button
            aria-label="close undo history"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.slate,
              fontFamily: theme.font,
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        {rows.length === 0 ? (
          <div style={{ color: theme.slate, fontSize: 11, marginTop: 8 }}>
            nothing to undo yet — build something
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: theme.slate, fontSize: 9.5, marginBottom: 4 }}>
              click an action to undo back to just before it
            </div>
            {rows.map((row, i) => (
              <button
                key={`${row.depth}-${i}`}
                aria-label={`undo ${row.depth} step${row.depth === 1 ? '' : 's'}: ${row.label}`}
                onClick={() => undoBack(row.depth)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'baseline',
                  gap: 8,
                  textAlign: 'left',
                  padding: '4px 6px',
                  margin: '2px 0',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: i === 0 ? 'rgba(255,138,30,0.10)' : 'transparent',
                  color: theme.offWhite,
                  fontFamily: theme.font,
                  fontSize: 11.5,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.navyLight)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <span style={{ color: theme.orangeSoft, flex: 'none', width: 16, fontSize: 10 }}>
                  ↶{row.depth}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.label}
                  {i === 0 && <span style={{ color: theme.slate }}> · latest</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
