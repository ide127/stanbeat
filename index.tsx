// ─── 앱 진입점 (Entry Point) ─────────────────────────────────────────────────
// 이 파일은 React 앱을 HTML의 #root div에 마운트하는 최초 실행 파일
// Vite가 index.html의 <script type="module" src="/index.tsx">를 통해 이 파일을 실행

// React 핵심 라이브러리 임포트 (JSX 변환에 필요)
import React from 'react';

// ReactDOM: 브라우저 환경에서 React 컴포넌트를 실제 DOM에 렌더링하는 라이브러리
import ReactDOM from 'react-dom/client';

// 앱 최상위 컴포넌트 (모든 화면과 로직을 포함)
import App from './App';

// 에러 바운더리: 자식 컴포넌트에서 JS 오류 발생 시 앱 전체 크래시 방지
import { ErrorBoundary } from './components/ErrorBoundary';

// HTML에서 id="root"인 div 요소를 찾아 React 앱의 마운트 포인트로 사용
const rootElement = document.getElementById('root');

// root 요소가 없으면 명확한 에러를 던져 문제 원인을 즉시 파악할 수 있도록 함
if (!rootElement) {
  throw new Error('id="root"인 요소를 찾을 수 없습니다. index.html을 확인해주세요.');
}

// React 18의 createRoot API로 비동기 렌더링(Concurrent Mode) 활성화
const root = ReactDOM.createRoot(rootElement);

// 앱을 #root에 렌더링
root.render(
  // StrictMode: 개발 환경에서 잠재적 문제를 감지하고 경고 (프로덕션에는 영향 없음)
  <React.StrictMode>
    {/* ErrorBoundary: 렌더링/생명주기 오류를 잡아 화이트스크린 방지 */}
    <ErrorBoundary>
      {/* App: 실제 앱의 모든 화면, 상태, 라우팅을 담당하는 루트 컴포넌트 */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);