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
 * Global React Error Boundary. (글로벌 리액트 에러 경계 컴포넌트)
 * 앱 전체에서 발생하는 렌더링 에러를 포착하여 빈 화면 대신 복구 UI를 표시합니다.
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

    // 에러 발생 시 fallback UI 표시를 위한 상태 업데이트 함수
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    // 에러 발생 시 호출되는 생명주기 메서드 (에러 로깅용)
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] 처리되지 않은 에러 발생:', error);
        console.error('[ErrorBoundary] 컴포넌트 스택:', errorInfo.componentStack);
        this.setState({ errorInfo });
    }

    // 페이지 새로고침 핸들러
    handleReload(): void {
        window.location.reload();
    }

    // 로컬스토리지 전체 초기화 후 새로고침 (치명적 에러 해결용)
    handleReset(): void {
        try {
            localStorage.clear();
        } catch {
            // localStorage 접근 불가 시 무시
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
