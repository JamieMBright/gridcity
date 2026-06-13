import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/app/store';

// The compare slot (#31) and template capture buffer (#37) are pure store
// reducers — exercise them directly (no DOM needed; the store guards its
// localStorage reads).

function reset(): void {
  useAppStore.setState({
    tool: { t: 'inspect' },
    selectedAsset: undefined,
    selectedLine: undefined,
    selectedLineAt: undefined,
    compareAsset: undefined,
    compareLine: undefined,
    compareLineAt: undefined,
    comparePicking: false,
  });
}

describe('compare slot (#31)', () => {
  beforeEach(reset);

  it('a normal inspect click fills the PRIMARY slot, never the compare slot', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 42 });
    const st = useAppStore.getState();
    expect(st.selectedAsset).toBe(42);
    expect(st.compareAsset).toBeUndefined();
  });

  it('with compare-pick armed, the next asset click fills the SECOND slot and disarms', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 1 }); // primary
    s.setComparePicking(true);
    s.setSelected({ assetId: 2 }); // compare
    const st = useAppStore.getState();
    expect(st.selectedAsset).toBe(1); // primary untouched
    expect(st.compareAsset).toBe(2);
    expect(st.comparePicking).toBe(false);
  });

  it('compare-pick also captures a LINE selection (with its click point)', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 1 });
    s.setComparePicking(true);
    s.setSelected({ lineId: 9, at: { x: 3, y: 4 } });
    const st = useAppStore.getState();
    expect(st.compareLine).toBe(9);
    expect(st.compareLineAt).toEqual({ x: 3, y: 4 });
  });

  it('clicking empty ground while picking cancels the pick but keeps the primary pin', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 1 });
    s.setComparePicking(true);
    s.setSelected({}); // empty ground: no asset, no line
    const st = useAppStore.getState();
    expect(st.selectedAsset).toBe(1); // primary pin survives
    expect(st.comparePicking).toBe(false); // pick disarmed
    expect(st.compareAsset).toBeUndefined();
  });

  it('clearCompare drops the slot and disarms', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 1 });
    s.setComparePicking(true);
    s.setSelected({ assetId: 2 });
    useAppStore.getState().clearCompare();
    const st = useAppStore.getState();
    expect(st.compareAsset).toBeUndefined();
    expect(st.comparePicking).toBe(false);
  });

  it('arming a build tool clears both pins and the compare arming', () => {
    const s = useAppStore.getState();
    s.setSelected({ assetId: 1 });
    s.setComparePicking(true);
    useAppStore.getState().setTool({ t: 'sub', sub: 'grid' });
    const st = useAppStore.getState();
    expect(st.selectedAsset).toBeUndefined();
    expect(st.compareAsset).toBeUndefined();
    expect(st.comparePicking).toBe(false);
  });
});

describe('template capture buffer (#37)', () => {
  it('records operator substations appearing in successive snapshots, skipping iDNO/tee', () => {
    useAppStore.setState({ recentSubPlacements: [] });
    const base = {
      branches: [],
      assets: [
        { id: 1, kind: 'sub', sub: 'grid', x: 0, y: 0 },
        { id: 2, kind: 'sub', sub: 'dist', x: 1, y: 0, idno: true },
        { id: 3, kind: 'sub', sub: 'tee', x: 2, y: 0, teeLevel: 33 },
        { id: 4, kind: 'gen', gen: 'solarFarm', x: 3, y: 0 },
      ],
    } as never;
    useAppStore.getState().setSnapshot(base);
    expect(useAppStore.getState().recentSubPlacements).toEqual([1]);

    // a new operator sub appears next tick
    const next = {
      branches: [],
      assets: [
        { id: 1, kind: 'sub', sub: 'grid', x: 0, y: 0 },
        { id: 5, kind: 'sub', sub: 'dist', x: 4, y: 0 },
      ],
    } as never;
    useAppStore.getState().setSnapshot(next);
    expect(useAppStore.getState().recentSubPlacements).toEqual([1, 5]);

    useAppStore.getState().clearRecentPlacements();
    expect(useAppStore.getState().recentSubPlacements).toEqual([]);
  });
});
