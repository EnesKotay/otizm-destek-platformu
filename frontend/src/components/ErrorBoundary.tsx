import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Rolldown/Vite üretim paketleri, eski (stale) bir build parçası çalışırken
// tarayıcıya göre farklı hata metinleri verebilir ("chunk failed" yerine
// "x is not a function" gibi). Bu yüzden dar bir mesaj listesine güvenmek yerine
// geniş bir örüntü kullanıyoruz.
export const AUTO_RELOAD_FLAG = 'eb-auto-reload-attempted';

function isLikelyStaleBuildError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('MIME type of "text/html"')
    || message.includes('Loading chunk')
    || message.includes('Unable to preload CSS')
    || /is not a function/.test(message)
    || /is not defined/.test(message)
    || /Unexpected token/.test(message)
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);

    // Bu oturumda daha önce denenmediyse ve hata eski build/chunk uyuşmazlığına
    // benziyorsa kullanıcı hiçbir şey yapmadan otomatik olarak bir kez yenile.
    const alreadyAttempted = sessionStorage.getItem(AUTO_RELOAD_FLAG) === 'true';
    if (!alreadyAttempted && isLikelyStaleBuildError(error.message || '')) {
      sessionStorage.setItem(AUTO_RELOAD_FLAG, 'true');
      window.location.reload();
    }
  }

  handleReset = () => {
    const message = this.state.error?.message || '';

    if (isLikelyStaleBuildError(message)) {
      sessionStorage.setItem(AUTO_RELOAD_FLAG, 'true');
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Bir şeyler ters gitti</h1>
          <p className="text-sm text-gray-500 mb-2">
            Bu sayfada beklenmeyen bir hata oluştu.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-6 font-mono text-left break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw size={15} /> Tekrar Dene
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <Home size={15} /> Ana Sayfa
            </a>
          </div>
        </div>
      </div>
    );
  }
}
