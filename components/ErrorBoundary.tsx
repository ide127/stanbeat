import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useStore } from '../store';
import { t } from '../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleReload = this.handleReload.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled render error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleReload(): void {
    window.location.reload();
  }

  handleReset(): void {
    try {
      const stanbeatKeys = Object.keys(localStorage).filter((key) => key.startsWith('stanbeat_'));
      stanbeatKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore localStorage failures during recovery.
    }
    window.location.reload();
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const language = useStore.getState().language;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0015 0%, #1A0B2E 50%, #0A0015 100%)',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '28px',
            color: '#FF0080',
            textShadow: '0 0 10px #FF0080',
            marginBottom: '8px',
          }}
        >
          {t(language, 'errorBoundaryTitle')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', maxWidth: '400px', marginBottom: '24px' }}>
          {t(language, 'errorBoundaryDesc')}
        </p>

        {this.state.error && (
          <pre
            style={{
              background: 'rgba(255,0,0,0.1)',
              border: '1px solid rgba(255,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              color: '#ff6b6b',
              maxWidth: '90vw',
              maxHeight: '200px',
              overflow: 'auto',
              marginBottom: '24px',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.toString()}
            {import.meta.env.DEV ? this.state.errorInfo?.componentStack : null}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#FF0080',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t(language, 'reloadBtn')}
          </button>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t(language, 'resetLocalDataBtn')}
          </button>
        </div>
      </div>
    );
  }
}

export { ErrorBoundaryClass as ErrorBoundary };
