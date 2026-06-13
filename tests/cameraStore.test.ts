// Camera bookmarks (#38) + photo-mode flag (#48) store reducers. Pure
// store logic — the localStorage persistence is guarded, so these run
// under the node test env without a DOM.

import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore, type CameraBookmark } from '../src/app/store';

function reset(): void {
  useAppStore.setState({ bookmarks: [], photoMode: false });
}

const mk = (id: number, over: Partial<CameraBookmark> = {}): CameraBookmark => ({
  id,
  name: `View ${id}`,
  x: 100 + id,
  y: 80 + id,
  zoom: 0.5,
  ...over,
});

describe('camera bookmarks (#38)', () => {
  beforeEach(reset);

  it('adds a bookmark', () => {
    useAppStore.getState().addBookmark(mk(1));
    const b = useAppStore.getState().bookmarks;
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ id: 1, x: 101, y: 81, zoom: 0.5 });
  });

  it('removes a bookmark by id, leaving the others', () => {
    const s = useAppStore.getState();
    s.addBookmark(mk(1));
    s.addBookmark(mk(2));
    s.addBookmark(mk(3));
    useAppStore.getState().removeBookmark(2);
    const ids = useAppStore.getState().bookmarks.map((b) => b.id);
    expect(ids).toEqual([1, 3]);
  });

  it('caps the slots at six (oldest drop off)', () => {
    const s = useAppStore.getState();
    for (let i = 1; i <= 8; i++) s.addBookmark(mk(i));
    const ids = useAppStore.getState().bookmarks.map((b) => b.id);
    expect(ids).toHaveLength(6);
    // the two earliest were trimmed; the latest six remain
    expect(ids).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('round-trips the saved camera position so a jump restores it', () => {
    const cam = { x: 132.5, y: 78.2, zoom: 0.31 };
    useAppStore.getState().addBookmark(mk(9, cam));
    const saved = useAppStore.getState().bookmarks.find((b) => b.id === 9);
    expect(saved).toMatchObject(cam);
  });
});

describe('photo mode flag (#48)', () => {
  beforeEach(reset);

  it('toggles the chrome-hidden flag', () => {
    expect(useAppStore.getState().photoMode).toBe(false);
    useAppStore.getState().setPhotoMode(true);
    expect(useAppStore.getState().photoMode).toBe(true);
    useAppStore.getState().setPhotoMode(false);
    expect(useAppStore.getState().photoMode).toBe(false);
  });
});
