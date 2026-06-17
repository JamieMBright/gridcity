import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installErrorHandlers, setCityResolver } from './app/errorLog';
import { installErrorSink } from './online/errorSink';
import { useAppStore } from './app/store';

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

const root = document.getElementById('root');
if (!root) throw new Error('missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
