// Build-template paste mode (ROADMAP #37). When a template is armed for
// pasting, this overlay tracks the hovered tile as the stamp ANCHOR
// (top-left of the pattern), previews the whole set's validity + price
// against the live map, and stamps it with one click — a single
// placeTemplate command, so the whole pattern is one undo step.
//
// Deliberately a CONFIRM-chip flow rather than a click-capturing layer
// over the map: the player pans/hovers freely (the renderer's own hover
// keeps the anchor live), reads the quote, and presses Stamp. This keeps
// the render lane's map-click flow completely untouched, works the same on
// desktop and phone, and never fights the camera for the pointer.

import { useMemo } from 'react';
import { getLondonMap } from '../data/londonMap';
import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { checkBuild } from '../sim/commands';
import { ANNUITY_FACTOR, SUBS } from '../sim/catalog';
import type { PlacedAsset } from '../sim/assets';
import { stampTemplate, templateSpan } from '../persistence/templateStore';
import { fmtMoneyK, panelStyle, theme } from './theme';

/** Dry-run the whole stamp against the live assets so the preview can say
 *  exactly which piece blocks (and sum the price). Pure — mirrors what the
 *  placeTemplate command does, minus mutation. Lines are checked against
 *  the SUBS the stamp will add (so a feeder between two stamped subs reads
 *  as valid even before they exist), by appending phantom endpoints. */
function dryRun(
  assets: PlacedAsset[],
  subs: ReturnType<typeof stampTemplate>['subs'],
  lines: ReturnType<typeof stampTemplate>['lines'],
): { ok: boolean; capexK: number; error?: string } {
  const map = getLondonMap();
  let capexK = 0;
  // phantom subs let line endpoints resolve at their target tiles
  const phantom: PlacedAsset[] = [];
  let nextId = -1;
  for (const s of subs) {
    const check = checkBuild(map, [...assets, ...phantom], { kind: 'sub', sub: s.sub, x: s.x, y: s.y });
    if (!check.ok) return { ok: false, capexK, error: check.error ?? 'a substation is blocked' };
    capexK += check.capexK;
    phantom.push({ id: nextId--, kind: 'sub', sub: s.sub, x: s.x, y: s.y, builtAtMin: 0 });
  }
  for (const l of lines) {
    const check = checkBuild(map, [...assets, ...phantom], {
      kind: 'line',
      level: l.level,
      build: l.build,
      ax: l.ax,
      ay: l.ay,
      bx: l.bx,
      by: l.by,
    });
    if (!check.ok) return { ok: false, capexK, error: check.error ?? 'a feeder is blocked' };
    capexK += check.capexK;
  }
  return { ok: true, capexK };
}

export function TemplatePaste() {
  const tpl = useAppStore((s) => s.pasteTemplate);
  const setPaste = useAppStore((s) => s.setPasteTemplate);
  const hovered = useAppStore((s) => s.hoveredTile);
  const snapshot = useAppStore((s) => s.snapshot);
  const setToast = useAppStore((s) => s.setToast);

  const assets = snapshot?.assets ?? [];
  const span = tpl ? templateSpan(tpl) : { w: 1, h: 1 };

  const quote = useMemo(() => {
    if (!tpl || !hovered) return undefined;
    const { subs, lines } = stampTemplate(tpl, hovered.x, hovered.y);
    return dryRun(assets as PlacedAsset[], subs, lines);
  }, [tpl, hovered, assets]);

  if (!tpl) return null;

  const stamp = (): void => {
    if (!hovered || !quote?.ok) return;
    const { subs, lines } = stampTemplate(tpl, hovered.x, hovered.y);
    sendCommand({ type: 'placeTemplate', subs, lines });
    setToast(`stamped "${tpl.name}"`);
    // one stamp per arming keeps it predictable; re-arm from the palette
    // to drop another. (Cheap to change later if owners want repeat-stamp.)
    setPaste(undefined);
  };

  const subCount = tpl.members.filter((m) => m.kind === 'sub').length;
  const lineCount = tpl.members.filter((m) => m.kind === 'line').length;
  const yearlyK = (quote?.capexK ?? 0) * (ANNUITY_FACTOR + SUBS.grid.opexFrac);
  const served = snapshot?.bill.servedCustomers ?? 0;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 70,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 8,
        padding: '10px 14px',
        width: 'min(340px, calc(100vw - 24px))',
        border: `1px solid ${theme.gold}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ color: theme.gold, fontWeight: 800 }}>⊞ paste “{tpl.name}”</div>
        <button
          aria-label="cancel paste"
          onClick={() => setPaste(undefined)}
          style={{ border: 'none', background: 'transparent', color: theme.slate, fontFamily: theme.font, fontSize: 14, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <div style={{ color: theme.slate, fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>
        {subCount} substation{subCount > 1 ? 's' : ''}
        {lineCount ? ` + ${lineCount} feeder${lineCount > 1 ? 's' : ''}` : ''} · {span.w}×{span.h} tiles
      </div>
      <div style={{ color: theme.offWhite, fontSize: 11, marginTop: 6 }}>
        {hovered
          ? `anchor ${hovered.x},${hovered.y} (top-left)`
          : 'hover the map to position the top-left corner'}
      </div>
      {hovered && quote && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {quote.ok ? (
            <>
              <div style={{ color: theme.gold }}>cost {fmtMoneyK(quote.capexK)}</div>
              <div style={{ color: theme.orangeSoft }}>
                {served > 0
                  ? `+£${((yearlyK * 1000) / served).toFixed(2)}/yr on bills`
                  : 'bill impact once customers are on supply'}
              </div>
            </>
          ) : (
            <div style={{ color: theme.danger }}>{quote.error}</div>
          )}
        </div>
      )}
      <button
        disabled={!hovered || !quote?.ok}
        onClick={stamp}
        style={{
          marginTop: 9,
          width: '100%',
          padding: '8px 8px',
          borderRadius: 7,
          border: 'none',
          background: hovered && quote?.ok ? theme.gold : theme.navyLight,
          color: hovered && quote?.ok ? theme.navy : theme.slate,
          opacity: hovered && quote?.ok ? 1 : 0.6,
          fontFamily: theme.font,
          fontSize: 13,
          fontWeight: 700,
          cursor: hovered && quote?.ok ? 'pointer' : 'default',
        }}
      >
        ⊞ stamp here
      </button>
      <div style={{ color: theme.slate, fontSize: 10, marginTop: 5, textAlign: 'center' }}>
        move the cursor to aim · one undo step
      </div>
    </div>
  );
}
