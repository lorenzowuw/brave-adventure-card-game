import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let lang: 'zh' | 'en' = 'zh';
      try {
        const stored = window.localStorage.getItem('card-quest-lang');
        if (stored === 'en' || stored === 'zh') lang = stored;
      } catch { /* ignore */ }
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1a1a2e',
          color: '#fff',
          padding: 20,
          fontFamily: 'monospace',
        }}>
          <h1 style={{ color: '#e74c3c', marginBottom: 12 }}>⚠️ {lang === 'en' ? 'Application Error' : '应用出错'}</h1>
          <pre style={{
            background: 'rgba(255,255,255,0.05)',
            padding: 16,
            borderRadius: 8,
            maxWidth: 600,
            overflow: 'auto',
            fontSize: 12,
            color: '#e8a0a0',
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack?.split('\n').slice(0, 8).join('\n')}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid #e74c3c',
              background: 'rgba(231,76,60,0.2)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {lang === 'en' ? 'Clear Data & Reload' : '清除数据并重新加载'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
