import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureError,
  clearErrors,
  getDiagnosticsText,
  recentErrors,
  setCityResolver,
  setRemoteSink,
  type ErrorEntry,
} from '../src/app/errorLog';

// errorLog must work with NO localStorage (vitest node env) — it falls back
// to an in-memory ring. These tests pin the ring cap, dedupe/rate-limit,
// per-source capture, diagnostics text, the remote-sink contract, and the
// never-throws guarantee.

describe('errorLog', () => {
  beforeEach(() => {
    clearErrors();
    setRemoteSink(() => {}); // default no-op sink unless a test overrides
    setCityResolver(() => 'london');
    // silence the dev console.error the logger emits (import.meta.env.DEV is
    // true under vitest); we assert on the ring, not on console noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    clearErrors();
    vi.restoreAllMocks();
  });

  it('captures a structured entry with environment fields', () => {
    captureError({ message: 'boom', stack: 'Error: boom\n  at foo (a.ts:1:1)', source: 'manual' });
    const [e] = recentErrors();
    expect(e).toBeDefined();
    expect(e?.message).toBe('boom');
    expect(e?.stack).toContain('at foo');
    expect(e?.source).toBe('manual');
    expect(e?.city).toBe('london');
    expect(e?.saveVersion).toMatch(/^\d+$/); // numeric SAVE_VERSION string
    expect(typeof e?.build).toBe('string');
    expect(typeof e?.ts).toBe('number');
    expect(e?.isoTs).toContain('T'); // ISO timestamp
    expect(e?.count).toBe(1);
  });

  it('captures each source kind', () => {
    const sources = ['react', 'window', 'unhandledrejection', 'worker', 'manual'] as const;
    sources.forEach((source, i) =>
      captureError({ message: `m-${source}-${i}`, source, stack: `s-${i}` }),
    );
    const got = recentErrors().map((e) => e.source);
    sources.forEach((s) => expect(got).toContain(s));
  });

  it('caps the ring at 50 (newest-first)', () => {
    for (let i = 0; i < 70; i++) {
      // distinct message AND stack frame so dedupe never collapses them
      captureError({ message: `err-${i}`, stack: `at site-${i} (f.ts:${i}:1)`, source: 'manual' });
    }
    const all = recentErrors();
    expect(all.length).toBe(50);
    // newest first: err-69 at the front, err-20 the oldest kept
    expect(all[0]?.message).toBe('err-69');
    expect(all[all.length - 1]?.message).toBe('err-20');
  });

  it('dedupes identical errors within the window (bumps count, no new entry)', () => {
    for (let i = 0; i < 5; i++) {
      captureError({ message: 'same', stack: 'Error: same\n  at x (a.ts:9:9)', source: 'react' });
    }
    const all = recentErrors();
    expect(all.length).toBe(1);
    expect(all[0]?.count).toBe(5);
  });

  it('treats same message from a different source / throw site as distinct', () => {
    captureError({ message: 'same', stack: 'at A (a.ts:1:1)', source: 'react' });
    captureError({ message: 'same', stack: 'at A (a.ts:1:1)', source: 'window' });
    captureError({ message: 'same', stack: 'at B (b.ts:2:2)', source: 'react' });
    expect(recentErrors().length).toBe(3);
  });

  it('getDiagnosticsText is a copyable blob with env header + errors', () => {
    captureError({ message: 'render fell over', stack: 'at R (r.tsx:3:3)', source: 'react' });
    const text = getDiagnosticsText();
    expect(text).toContain('ElectriCity diagnostics');
    expect(text).toContain('build:');
    expect(text).toContain('save:');
    expect(text).toContain('city:');
    expect(text).toContain('render fell over');
    expect(text).toContain('react');
    expect(text).toContain('at R (r.tsx:3:3)');
  });

  it('getDiagnosticsText handles an empty log', () => {
    expect(getDiagnosticsText()).toContain('(no errors captured)');
  });

  it('includes componentStack and extra in diagnostics', () => {
    captureError({
      message: 'tree broke',
      source: 'react',
      componentStack: '\n    in App\n    in ErrorBoundary',
      extra: { route: 'hud' },
    });
    const text = getDiagnosticsText();
    expect(text).toContain('component stack:');
    expect(text).toContain('in ErrorBoundary');
    expect(text).toContain('"route":"hud"');
  });

  it('forwards a fresh capture to the remote sink exactly once', () => {
    const sink = vi.fn<(e: ErrorEntry) => void>();
    setRemoteSink(sink);
    captureError({ message: 'net me', stack: 'at N (n.ts:1:1)', source: 'window' });
    // a dedupe repeat must NOT re-send
    captureError({ message: 'net me', stack: 'at N (n.ts:1:1)', source: 'window' });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0]?.[0]?.message).toBe('net me');
  });

  it('never throws even when the city resolver and sink throw', () => {
    setCityResolver(() => {
      throw new Error('resolver boom');
    });
    setRemoteSink(() => {
      throw new Error('sink boom');
    });
    expect(() =>
      captureError({ message: 'still fine', stack: 'at S (s.ts:1:1)', source: 'manual' }),
    ).not.toThrow();
    // the entry is still recorded despite both helpers throwing
    expect(recentErrors().some((e) => e.message === 'still fine')).toBe(true);
  });

  it('truncates absurdly long messages and stacks', () => {
    captureError({
      message: 'x'.repeat(10_000),
      stack: 'y'.repeat(20_000),
      source: 'manual',
    });
    const [e] = recentErrors();
    expect((e?.message.length ?? 0)).toBeLessThanOrEqual(4000);
    expect((e?.stack?.length ?? 0)).toBeLessThanOrEqual(8000);
  });
});
