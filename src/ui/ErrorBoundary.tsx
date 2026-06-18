// React error boundary wrapping <App/>. A render-time exception anywhere in
// the tree is caught here, captured (with the React component stack) into the
// central error log, and replaced with an on-brand dusk "tripped a fuse"
// fallback — so a single bad render shows the player a friendly recoverable
// screen instead of a white void, and hands us a copyable traceback.
//
// It does NOT swallow errors in dev: componentDidCatch still routes to
// captureError, which console.errors in dev, and React's own overlay still
// shows. In production this fallback is the graceful surface.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError, getDiagnosticsText } from '../app/errorLog';
import { theme } from './theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | undefined;
  componentStack: string | undefined;
  showStack: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    error: undefined,
    componentStack: undefined,
    showStack: false,
    copied: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? undefined });
    captureError({
      message: error.message || 'render error',
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      source: 'react',
    });
  }

  private handleReload = (): void => {
    try {
      location.reload();
    } catch {
      // ignore — button is best-effort
    }
  };

  private handleCopy = (): void => {
    const text = getDiagnosticsText();
    const done = (): void => {
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2200);
    };
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    } catch {
      fallbackCopy(text, done);
    }
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stack = (this.state.componentStack
      ? `${error.stack ?? error.message}\n\ncomponent stack:${this.state.componentStack}`
      : (error.stack ?? error.message)
    ).trim();

    return (
      <div role="alert" style={overlayStyle} data-testid="error-boundary">
        <div style={cardStyle}>
          <div style={fuseRow}>
            <FuseGlyph />
            <div>
              <div style={titleStyle}>Something tripped a fuse</div>
              <div style={subtitleStyle}>
                The grid hit an unexpected fault and this screen flipped the breaker to keep your
                game safe. Your last autosave is intact — a reload should bring you straight back.
              </div>
            </div>
          </div>

          <div style={messageBox}>{error.message || 'Unknown render error'}</div>

          <div style={buttonRow}>
            <button type="button" onClick={this.handleReload} style={primaryBtn}>
              Reload
            </button>
            <button type="button" onClick={this.handleCopy} style={secondaryBtn}>
              {this.state.copied ? 'Copied ✓' : 'Copy diagnostics'}
            </button>
            <button
              type="button"
              onClick={() => this.setState((s) => ({ showStack: !s.showStack }))}
              style={ghostBtn}
              aria-expanded={this.state.showStack}
            >
              {this.state.showStack ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {this.state.showStack && (
            <pre style={stackBox} data-testid="error-stack">
              {stack}
            </pre>
          )}

          <div style={footnote}>
            If this keeps happening, paste the diagnostics to the team — it carries the traceback so
            we can fix it fast.
          </div>
        </div>
      </div>
    );
  }
}

/** Clipboard fallback for browsers / contexts without the async clipboard
 *  API (older Safari, insecure origins). Uses a hidden textarea + execCommand. */
function fallbackCopy(text: string, done: () => void): void {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch {
    // give up silently — the details panel still lets the user copy by hand
  }
}

/** A small bolt-in-a-broken-ring mark, drawn in code to match the dusk palette. */
function FuseGlyph(): ReactNode {
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={22} cy={22} r={19} fill="none" stroke={theme.dusk} strokeWidth={3} />
      <path d="M22 4 a18 18 0 0 1 15 9" fill="none" stroke={theme.sunset} strokeWidth={3} strokeLinecap="round" />
      <path
        d="M24 11 L15 24 H21 L19 33 L29 19 H22 Z"
        fill={theme.gold}
        stroke={theme.orange}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- styles (dusk world: deep navy → purple glass, warm gold + dusty pink) ---

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  // the same golden-hour dusk wash the map sits in, so the fault screen
  // reads as part of the world rather than a stark browser error.
  background:
    'radial-gradient(120% 120% at 50% 0%, #241a48 0%, #121536 45%, #04091e 100%)',
  fontFamily: theme.font,
  color: theme.offWhite,
  overflow: 'auto',
};

const cardStyle: React.CSSProperties = {
  width: 'min(560px, 100%)',
  maxHeight: '94vh',
  overflow: 'auto',
  boxSizing: 'border-box',
  background:
    'linear-gradient(168deg, rgba(18, 24, 52, 0.92) 0%, rgba(16, 22, 48, 0.95) 55%, rgba(34, 25, 58, 0.93) 100%)',
  border: `1px solid rgba(245, 196, 105, 0.18)`,
  borderRadius: 14,
  boxShadow: '0 18px 54px rgba(6, 8, 18, 0.6), inset 0 1px 0 rgba(242, 239, 232, 0.06)',
  padding: 22,
};

const fuseRow: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'flex-start',
};

const titleStyle: React.CSSProperties = {
  color: theme.gold,
  fontSize: 19,
  fontWeight: 800,
  letterSpacing: 0.3,
  marginBottom: 6,
};

const subtitleStyle: React.CSSProperties = {
  color: theme.offWhite,
  fontSize: 13.5,
  lineHeight: 1.5,
  opacity: 0.92,
};

const messageBox: React.CSSProperties = {
  marginTop: 16,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${theme.sunset}`,
  background: 'rgba(224, 105, 122, 0.10)',
  color: theme.sunset,
  fontSize: 13,
  wordBreak: 'break-word',
};

const buttonRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 18,
};

const btnBase: React.CSSProperties = {
  fontFamily: theme.font,
  fontSize: 13.5,
  fontWeight: 700,
  letterSpacing: 0.3,
  padding: '10px 16px',
  borderRadius: 9,
  cursor: 'pointer',
  border: '1px solid transparent',
};

const primaryBtn: React.CSSProperties = {
  ...btnBase,
  background: theme.orange,
  color: theme.night,
  borderColor: theme.orange,
};

const secondaryBtn: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(245, 196, 105, 0.12)',
  color: theme.gold,
  borderColor: 'rgba(245, 196, 105, 0.4)',
};

const ghostBtn: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: theme.slate,
  borderColor: 'rgba(141, 151, 180, 0.4)',
};

const stackBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  maxHeight: '34vh',
  overflow: 'auto',
  borderRadius: 8,
  background: theme.night,
  border: '1px solid rgba(141, 151, 180, 0.22)',
  color: theme.slate,
  fontSize: 11.5,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const footnote: React.CSSProperties = {
  marginTop: 16,
  fontSize: 11.5,
  color: theme.slate,
  lineHeight: 1.5,
};
