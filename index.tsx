import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeAnalytics } from './services/analytics';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('id="root" 요소를 찾을 수 없습니다. index.html을 확인해 주세요.');
}

const root = ReactDOM.createRoot(rootElement);
initializeAnalytics();

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
