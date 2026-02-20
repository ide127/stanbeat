import React from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Global React Error Boundary.
 * Catches unhandled rendering errors and displays a recovery UI
 * instead of a blank white screen.
 */
class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
        console.error('[ErrorBoundary] Uncaught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.setState({ errorInfo });
    }

    handleReload(): void {
        window.location.reload();
    }

    handleReset(): void {
        try {
            localStorage.clear();
        } catch {
            // localStorage may be unavailable
        }
        window.location.reload();
    }

    render(): ReactNode {
        if (this.state.hasError) {
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
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💔</div>
                    <h1
                        style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '28px',
                            color: '#FF0080',
                            textShadow: '0 0 10px #FF0080',
                            marginBottom: '8px',
                        }}
                    >
                        StanBeat Error
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', maxWidth: '400px', marginBottom: '24px' }}>
                        앱에서 예상치 못한 오류가 발생했습니다.
                        <br />
                        An unexpected error occurred in the app.
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
                            {this.state.errorInfo?.componentStack}
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
                            🔄 새로고침 / Reload
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
                            🗑️ 초기화 / Reset
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export { ErrorBoundaryClass as ErrorBoundary };
