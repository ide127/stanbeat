// ─── 타입 정의 모음 ──────────────────────────────────────────────────────────
// 앱 전체에서 사용하는 TypeScript 인터페이스와 타입을 한 곳에서 관리
// 변경 시 이 파일만 수정하면 앱 전체에 반영됨

// i18n 모듈에서 지원 언어 코드 타입 임포트 (예: 'ko' | 'en' | 'ja' | ...)
import { LanguageCode } from './i18n';

// ─── 게임 기록 (단건) ────────────────────────────────────────────────────────
// 사용자가 게임 한 판을 완료할 때마다 생성되는 기록 객체
export interface HistoryEvent {
  type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY';
  value: number;  // PLAY일 경우 시간(밀리초), 그 외는 획득/소모 하트 개수
  date: string;   // 완료 날짜 (ISO 8601 형식)
}

// ─── 봇 대역 설정 (Admin) ────────────────────────────────────────────────────────
export interface BotConfig {
  mean: number;     // 봇 기록의 정규분포 평균 (밀리초)
  stdDev: number;   // 봇 기록의 정규분포 표준편차 (밀리초)
}

// ─── 사용자 ─────────────────────────────────────────────────────────────────
// 로컬스토리지 및 Firestore에 저장되는 사용자 정보 전체 구조
export interface User {
  id: string;                   // 고유 사용자 ID (Firebase Auth UID 또는 로컬 UUID)
  nickname: string;             // 리더보드/프로필에 표시되는 닉네임
  avatarUrl: string;            // DiceBear API로 생성된 프로필 이미지 URL
  email: string;                // 구글 로그인 이메일 (게스트는 빈 문자열)
  hearts: number;               // 현재 남은 하트 수 (0~3, 게임 시작 시 1 차감)
  bestTime: number | null;      // 최고 기록 밀리초 (아직 플레이 안 했으면 null)
  country: string;              // ISO 3166-1 알파-2 국가 코드 (예: 'KR', 'US')
  role: 'USER' | 'ADMIN';       // 권한 레벨: 'ADMIN'이면 관리자 패널 접근 가능
  expiresAt: number | null;     // 하트 만료 타임스탬프 (밀리초, 만료 후 자동 보충)
  lastDailyHeart: string | null;// 마지막으로 일일 무료 하트를 받은 날짜 (YYYY-MM-DD)
  agreedToTerms: boolean;       // 이용약관 동의 여부 (false면 약관 모달 표시)
  banned: boolean;              // 관리자에 의해 차단된 사용자 여부
  gameHistory: HistoryEvent[];    // 모든 활동 기록 배열 (히스토리 화면에서 표시)
  referralCode: string;         // 추천인 코드 (URL 공유 시 사용)
  referredBy: string | null;    // 이 사용자를 추천한 사람의 추천인 코드
}

// ─── 게임 그리드 셀 ──────────────────────────────────────────────────────────
// 단어 찾기 게임의 격자판 각 셀(칸)을 표현
export interface GridCell {
  id: string;       // 셀 고유 ID (예: "3-5" = 3행 5열)
  letter: string;   // 셀에 표시되는 알파벳 문자 (A-Z)
  row: number;      // 행 인덱스 (0부터 시작)
  col: number;      // 열 인덱스 (0부터 시작)
  selected: boolean;// 현재 드래그 중 선택된 상태인지 여부
  found: boolean;   // 정답 단어의 일부로 찾아진 상태인지 여부
}

// ─── 단어 설정 ─────────────────────────────────────────────────────────────
// 찾아야 할 단어와 이미 찾았는지 여부를 추적하는 구조
export interface WordConfig {
  word: string;   // 찾아야 할 단어 (예: 'JIMIN', 'SUGA', 'RM')
  found: boolean; // 플레이어가 이미 이 단어를 찾았는지 여부
}

// ─── 화면(뷰) 상태 ─────────────────────────────────────────────────────────
// App.tsx에서 어떤 화면을 렌더링할지 결정하는 유니온 타입
// 'HOME': 홈화면, 'GAME': 게임화면, 'LEADERBOARD': 리더보드, 'ADMIN': 관리, 'HISTORY': 기록
export type ViewState = 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN' | 'HISTORY';

// ─── 리더보드 항목 ──────────────────────────────────────────────────────────
// 리더보드 화면에 표시되는 각 플레이어 행 데이터 구조
export interface LeaderboardEntry {
  id: string;            // 사용자/봇 고유 ID
  nickname: string;      // 표시 닉네임
  country: string;       // 국가 코드 (국기 이모지 변환에 사용)
  avatarUrl: string;     // 아바타 이미지 URL
  time: number;          // 이 플레이어의 최고 시간 (밀리초)
  rank: number;          // 현재 리그 내 순위 (1위부터 시작)
  email?: string;        // 선택적: 관리자 패널에서 사용자 식별용
  hearts?: number;       // 선택적: 관리자 패널에서 하트 조정용
  isCurrentUser?: boolean; // true이면 분홍색 하이라이트로 표시
  isBot?: boolean;       // true이면 AI 생성 더미 플레이어
  banned?: boolean;      // true이면 리더보드에서 숨김 처리
  leagueLabel?: string;  // 게스트 쇼케이스용 랜덤 헥스 리그 라벨
}

// ─── 언어 선택 항목 ─────────────────────────────────────────────────────────
// 언어 선택 드롭다운에서 각 언어를 표현하는 구조
export interface Language {
  code: LanguageCode; // i18n 언어 코드 (예: 'ko', 'en', 'ja')
  name: string;       // 해당 언어로 표기된 이름 (예: '한국어', 'English', '日本語')
  flag: string;       // 국기 이모지 (예: '🇰🇷', '🇺🇸', '🇯🇵')
}

// ─── 활동 알림 항목 ────────────────────────────────────────────────────────
// 실시간 티커 / 알림 피드에 표시되는 메시지 구조
export interface ActivityItem {
  id: string;                              // 고유 항목 ID (리액트 key로 사용)
  message: string;                         // 표시할 알림 메시지 텍스트
  level?: 'live' | 'alert' | 'event';      // 메시지 시각적 레벨 (live: 초록, alert: 빨강, event: 파랑)
}

// ─── league.ts에서 LeagueData 타입 재내보내기 ──────────────────────────────
// league.ts에서 정의된 LeagueData를 types.ts를 통해서도 import할 수 있도록 재내보냄
// 사용례: import { LeagueData } from './types'
export type { LeagueData } from './league';
