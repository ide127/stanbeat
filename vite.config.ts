// ─── Vite 빌드 설정 파일 ─────────────────────────────────────────────────────
// Vite는 React 앱의 개발 서버와 프로덕션 번들러를 담당
// 이 파일에서 포트, 플러그인, 환경변수 주입, 경로 별칭 등을 설정

// Node.js path 모듈: 운영체제에 독립적인 파일 경로 처리
import path from 'path';

// Vite의 설정 정의 함수와 환경변수 로더 임포트
import { defineConfig, loadEnv } from 'vite';

// @vitejs/plugin-react: JSX 변환, Fast Refresh(HMR), React DevTools 연동 등을 처리
import react from '@vitejs/plugin-react';

// defineConfig: 타입 힌트와 자동완성을 위한 래퍼 함수
// ({ mode }) → Vite가 실행 모드('development' | 'production')를 인자로 전달
export default defineConfig(({ mode }) => {
  // loadEnv: 현재 디렉토리('.')의 .env 파일을 모드에 맞게 로드
  // 세 번째 인자 ''는 접두사 필터 없음 (VITE_ 뿐만 아니라 모든 변수 로드)
  const env = loadEnv(mode, '.', '');

  return {
    // ─── 개발 서버 설정 ──────────────────────────────────────────────
    server: {
      port: 3000,        // 개발 서버 포트 (http://localhost:3000)
      host: '0.0.0.0',   // 모든 네트워크 인터페이스에서 접근 허용 (LAN 접속, Docker 컨테이너 등)
    },

    // ─── Vite 플러그인 ───────────────────────────────────────────────
    plugins: [
      react(), // React JSX 변환 + Fast Refresh(저장 시 상태 유지하며 즉시 반영)
    ],

    // ─── 전역 상수 주입 ──────────────────────────────────────────────
    // process.env.XXX 형태로 코드에서 접근할 수 있도록 빌드 타임에 값을 치환
    // (Vite 환경에서는 기본적으로 import.meta.env.VITE_XXX를 사용하지만
    //  일부 라이브러리가 process.env를 직접 참조하는 경우를 위해 설정)
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),        // GEMINI API 키
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY), // 동일 키 (이중 바인딩)
    },

    // ─── 경로 별칭 (Alias) ───────────────────────────────────────────
    resolve: {
      alias: {
        // '@'를 프로젝트 루트 디렉토리로 치환
        // 예: import Foo from '@/components/Foo' → import Foo from '/절대경로/components/Foo'
        // 깊게 중첩된 폴더에서도 ../../../ 없이 깔끔하게 임포트 가능
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
