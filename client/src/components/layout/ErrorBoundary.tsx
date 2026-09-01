import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled SyncWatch UI error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-950/80 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold mb-2 tracking-tight">Something went wrong</h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              SyncWatch encountered an unexpected error. You can try refreshing the page or returning to the home page.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-black/50 border border-zinc-800 rounded-xl text-left overflow-x-auto max-h-32 text-xs font-mono text-zinc-400">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-full bg-[#22d3a5] hover:bg-[#1fb890] text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,165,0.3)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all flex items-center gap-2 border border-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
