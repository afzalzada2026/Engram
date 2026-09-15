import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * A crash must never become a blank screen — that is how you earn a 1-star
 * review from a player who was otherwise having a good time.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry service (privacy-first), so keep a local breadcrumb the
    // player can read or copy if they ever report an issue.
    try {
      const log = JSON.parse(localStorage.getItem('engram-errors') || '[]') as unknown[];
      log.push({ at: Date.now(), msg: String(error?.message ?? error), stack: info.componentStack?.slice(0, 600) });
      localStorage.setItem('engram-errors', JSON.stringify(log.slice(-10)));
    } catch {
      /* ignore */
    }
  }

  private reload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="grid min-h-[100svh] place-items-center bg-abyss px-5 font-body text-ink">
        <div className="glass w-[min(92vw,420px)] rounded-3xl p-6 text-center">
          <div className="text-[10px] font-bold tracking-[0.3em] text-rose">SIGNAL INTERRUPTED</div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-wide">Something slipped</h1>
          <p className="mt-2 text-xs leading-relaxed text-dim">
            The game hit an unexpected state. Your progress and scores are saved locally and are safe — nothing was lost.
          </p>
          {error?.message && (
            <code className="scroller mt-3 block max-h-24 overflow-auto break-all rounded-xl border border-white/10 bg-abyss/70 p-2.5 text-left text-[10px] text-dim">
              {error.message}
            </code>
          )}
          <button
            onClick={this.reload}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyanx to-vio px-4 py-3.5 font-display text-sm font-bold tracking-widest text-abyss transition-transform hover:scale-[1.02] active:scale-95"
          >
            RESUME
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
