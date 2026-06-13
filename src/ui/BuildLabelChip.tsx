// A small "Building: Grid substation" chip pinned near the top of the
// screen whenever a build tool is armed — so the player always knows what
// their next click will place. Reads the armed tool from the store and
// labels it via the catalog (buildLabel). Hidden for the neutral inspect
// tool. Top-centre anchor keeps it clear of the left build rail/palette
// and the right chip column on both desktop and phone-landscape.

import { useAppStore } from '../app/store';
import { buildLabel } from './buildLabel';
import { theme } from './theme';

export function BuildLabelChip() {
  const tool = useAppStore((s) => s.tool);
  const label = buildLabel(tool);
  if (!label) return null;
  const demolish = tool.t === 'demolish';
  return (
    <div
      data-tour="build-label"
      style={{
        position: 'absolute',
        top: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        maxWidth: 'calc(100vw - 120px)',
        padding: '5px 12px',
        borderRadius: 999,
        border: `1px solid ${demolish ? theme.danger : theme.orange}`,
        background: 'rgba(16, 22, 48, 0.92)',
        color: theme.offWhite,
        fontFamily: theme.font,
        fontSize: 12,
        lineHeight: 1.2,
        boxShadow: '0 4px 16px rgba(6, 8, 20, 0.45)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span
        style={{
          flex: 'none',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: demolish ? theme.danger : theme.orange,
        }}
      />
      <span style={{ color: theme.slate, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>
        {label.verb}
      </span>
      <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label.name}</span>
    </div>
  );
}
