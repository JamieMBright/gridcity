import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installErrorHandlers, setCityResolver } from './app/errorLog';
import { installErrorSink } from './online/errorSink';
import { installCleanExitGuard, reportPriorLoadDeath } from './app/bootBreadcrumb';
import { useAppStore } from './app/store';
import { autoUnlockForAutomation } from './ui/tutorialGate';

// The e2e suite drives free play through "new game"; pre-unlock the tutorial
// gate under Playwright (DEV + webdriver) so those flows aren't blocked. No-op
// in production and in a normal `npm run dev` session, so real players are
// still gated. A spec can set sessionStorage 'ec-force-gate-locked' to keep
// the locked view for screenshots.
autoUnlockForAutomation(import.meta.env.DEV);

// Crash capture, installed FIRST so a fault anywhere downstream (even during
// the initial render) is caught with a full traceback. Order: resolve the
// active city for diagnostics, wire the remote self-heal sink (guarded —
// no-ops when Supabase is absent), then arm the global window handlers.
setCityResolver(() => {
  try {
    const s = useAppStore.getState();
    return s.scenarioId;
  } catch {
    return undefined;
  }
});
installErrorSink();
installErrorHandlers();
// Catch the crashes JS can't see: a breadcrumb that survives a hard tab kill
// (OOM/GPU) during a city load and is reported on the NEXT boot. Installed
// after the sink so the report can actually send; the clean-exit guard makes a
// graceful close clear the crumb, so only true crashes survive to be reported.
installCleanExitGuard();
reportPriorLoadDeath();

const root = document.getElementById('root');
if (!root) throw new Error('missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
