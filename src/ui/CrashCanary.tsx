// A test-only render-crash trigger, used to verify the ErrorBoundary end to
// end. It throws DURING render (the only kind of error a React error boundary
// catches) when armed — but it can ONLY be armed in a dev build via the
// window.__ec.crashRender() test hook, so it can never fire in normal play or
// in a production bundle.
//
// Mechanism: an in-render throw, gated by a module-level flag flipped through
// a tiny event-subscription so a re-render actually picks it up. Rendered once
// inside <App/>; renders nothing until armed.

import { useSyncExternalStore } from 'react';

let armed = false;
const listeners = new Set<() => void>();

/** Arm the canary so the NEXT render throws. DEV-guarded by the test hook
 *  that calls it; harmless to call but exported only for that hook. */
export function armRenderCrash(): void {
  armed = true;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function CrashCanary(): null {
  // subscribe so arming triggers a re-render; the snapshot is the flag itself.
  const isArmed = useSyncExternalStore(
    subscribe,
    () => armed,
    () => false,
  );
  if (isArmed) {
    throw new Error('__crashRender: deliberate render crash (test hook)');
  }
  return null;
}
