// Mobile inspector bottom-sheet (ROADMAP #35). On phone-landscape the
// desktop right-rail card is a poor touch target tucked under the chip
// column; a slide-up sheet anchored to the bottom edge brings inspection
// into thumb reach. Mobile-only — App renders the desktop InfoPanel
// untouched on wider viewports.
//
// The sheet appears whenever a tap has PINNED an asset/line (the same
// selection the desktop card reads). A drag-handle lets the player flick
// it away; tapping the handle/✕ or the backdrop also dismisses. When a
// compare slot is filled, both cards stack inside the sheet so the
// side-by-side comparison still works on a narrow screen.

import { useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { AssetInfo, LineInfo } from './InfoPanel';
import { panelStyle, theme } from './theme';

export function MobileInspector() {
  const snapshot = useAppStore((s) => s.snapshot);
  const tool = useAppStore((s) => s.tool);
  const selectedAsset = useAppStore((s) => s.selectedAsset);
  const selectedLine = useAppStore((s) => s.selectedLine);
  const selectedLineAt = useAppStore((s) => s.selectedLineAt);
  const compareAsset = useAppStore((s) => s.compareAsset);
  const compareLine = useAppStore((s) => s.compareLine);
  const compareLineAt = useAppStore((s) => s.compareLineAt);
  const comparePicking = useAppStore((s) => s.comparePicking);
  const setComparePicking = useAppStore((s) => s.setComparePicking);
  const setSelected = useAppStore((s) => s.setSelected);
  const clearCompare = useAppStore((s) => s.clearCompare);

  // drag-to-dismiss: track the pointer offset and slide the sheet down
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | undefined>(undefined);

  const hasPrimary = selectedAsset !== undefined || selectedLine !== undefined;
  // only while inspecting (a build tool drops the pin anyway)
  if (!snapshot || tool.t !== 'inspect' || !hasPrimary) return null;

  const dismiss = (): void => {
    setSelected({});
    clearCompare();
    setDragY(0);
  };

  const hasCompare = compareAsset !== undefined || compareLine !== undefined;

  const onPointerDown = (e: React.PointerEvent): void => {
    startY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    if (startY.current === undefined) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };
  const onPointerUp = (): void => {
    if (dragY > 70) dismiss();
    else setDragY(0);
    startY.current = undefined;
  };

  return (
    <>
      {/* a light scrim so taps outside the sheet dismiss it */}
      <div
        onClick={dismiss}
        style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 34, 0.28)', zIndex: 7 }}
      />
      <div
        role="dialog"
        aria-label="inspector"
        style={{
          ...panelStyle,
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: 6,
          maxHeight: 'calc(100dvh - 70px)',
          overflowY: 'auto',
          padding: '4px 14px 12px',
          zIndex: 8,
          transform: `translateY(${dragY}px)`,
          transition: startY.current === undefined ? 'transform 0.18s ease' : 'none',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        {/* grab handle — drag it (or tap) to dismiss */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={dismiss}
          aria-label="dismiss inspector"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '6px 0 8px',
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <span style={{ width: 38, height: 4, borderRadius: 2, background: theme.slate, opacity: 0.6 }} />
        </div>

        {hasCompare && (
          <div
            style={{
              borderLeft: `3px solid ${theme.gold}`,
              paddingLeft: 8,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: `1px solid ${theme.navyLight}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: theme.gold, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                compare
              </div>
              <button
                aria-label="close compare"
                onClick={clearCompare}
                style={{ border: 'none', background: 'transparent', color: theme.slate, fontFamily: theme.font, fontSize: 14, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            {compareLine !== undefined ? (
              <LineInfo assetId={compareLine} atOverride={compareLineAt} />
            ) : compareAsset !== undefined ? (
              <AssetInfo assetId={compareAsset} />
            ) : null}
          </div>
        )}

        <div style={{ borderLeft: `3px solid ${theme.orange}`, paddingLeft: 8 }}>
          {selectedLine !== undefined ? (
            <LineInfo assetId={selectedLine} atOverride={selectedLineAt} />
          ) : selectedAsset !== undefined ? (
            <AssetInfo assetId={selectedAsset} />
          ) : null}
          <button
            onClick={() => setComparePicking(!comparePicking)}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '7px 8px',
              borderRadius: 7,
              border: `1px solid ${comparePicking ? theme.gold : theme.navyLight}`,
              background: comparePicking ? 'rgba(245, 196, 105, 0.14)' : 'transparent',
              color: comparePicking ? theme.gold : theme.slate,
              fontFamily: theme.font,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {comparePicking ? '⊟ tap another asset to compare…' : '⊞ compare with another'}
          </button>
        </div>
      </div>
    </>
  );
}
