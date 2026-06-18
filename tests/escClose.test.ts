// closeTopmost() — the universal ESC (owner, 2026-06-18: "escape hotkey
// should close anything down"). One ESC press closes exactly the single
// highest-priority open thing and returns true; with nothing open it returns
// false (so a bare ESC does nothing — it no longer pops the pause menu). The
// priority order asserted here mirrors the App.tsx keyboard hook + the
// HotkeyHelp cheat-sheet copy.

import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/app/store';

function reset(): void {
  useAppStore.setState({
    gameMenuOpen: false,
    helpOpen: false,
    guideOpen: false,
    lessonsOpen: false,
    kpiOpen: false,
    netZeroOpen: false,
    directoratesOpen: false,
    eventLogOpen: false,
    savesOpen: false,
    balanceOpen: false,
    undoListOpen: false,
    tourActive: false,
    pasteTemplate: undefined,
    comparePicking: false,
    compareAsset: undefined,
    compareLine: undefined,
    selectedAsset: undefined,
    selectedLine: undefined,
    tool: { t: 'inspect' },
    headroom: false,
    n1: false,
    forecastOn: false,
    gridView: false,
  });
}

describe('closeTopmost — universal ESC', () => {
  beforeEach(reset);

  it('returns false when nothing is open', () => {
    expect(useAppStore.getState().closeTopmost()).toBe(false);
  });

  it('closes a modal FIRST, leaving a pin and an armed tool untouched', () => {
    useAppStore.setState({
      helpOpen: true,
      selectedAsset: 5,
      tool: { t: 'sub', sub: 'grid' },
    });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const s = useAppStore.getState();
    expect(s.helpOpen).toBe(false);
    // one ESC closes ONE thing — the pin and the armed tool survive
    expect(s.selectedAsset).toBe(5);
    expect(s.tool.t).toBe('sub');
  });

  it('clears a pinned selection when no modal is open (before disarming a tool)', () => {
    useAppStore.setState({ selectedAsset: 9, tool: { t: 'sub', sub: 'grid' } });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    expect(useAppStore.getState().selectedAsset).toBeUndefined();
    // the tool is still armed — it takes a second ESC
    expect(useAppStore.getState().tool.t).toBe('sub');
  });

  it('unwinds a line route one waypoint at a time, then the anchor', () => {
    useAppStore.setState({
      tool: {
        t: 'line',
        level: 33,
        build: 'overhead',
        fromAssetId: 2,
        waypoints: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      },
    });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const t1 = useAppStore.getState().tool;
    expect(t1.t === 'line' && t1.waypoints?.length).toBe(1);
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const t2 = useAppStore.getState().tool;
    expect(t2.t === 'line' && (t2.waypoints?.length ?? 0)).toBe(0);
    // anchor next
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const t3 = useAppStore.getState().tool;
    expect(t3.t === 'line' && t3.fromAssetId).toBeUndefined();
  });

  it('disarms a build tool back to inspect when nothing higher is open', () => {
    useAppStore.setState({ tool: { t: 'line', level: 33, build: 'overhead' } });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    expect(useAppStore.getState().tool).toEqual({ t: 'inspect' });
  });

  it('clears map overlays LAST (after panels, pins, tools)', () => {
    useAppStore.setState({ tool: { t: 'inspect' }, gridView: true, headroom: true });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const s = useAppStore.getState();
    expect(s.gridView).toBe(false);
    expect(s.headroom).toBe(false);
    // and now nothing is left
    expect(useAppStore.getState().closeTopmost()).toBe(false);
  });

  it('a modal still beats overlays + a pin (priority is stable)', () => {
    useAppStore.setState({ kpiOpen: true, gridView: true, selectedAsset: 1 });
    expect(useAppStore.getState().closeTopmost()).toBe(true);
    const s = useAppStore.getState();
    expect(s.kpiOpen).toBe(false);
    expect(s.gridView).toBe(true);
    expect(s.selectedAsset).toBe(1);
  });
});
