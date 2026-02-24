import { create } from 'zustand';
import { ActivityItem, HistoryEvent, LeaderboardEntry, User, ViewState, BotConfig } from './types';
import { LanguageCode } from './i18n';
import { isFirebaseEnabled, firebaseSignInWithGoogle, firebaseSignOut, saveUserProfile, getUserProfile, saveScore, deleteAllScores, banUserInFirestore as banUserInFs, incrementGlobalStats, getGlobalStats, getAdminGlobalUsers, editUserHeartInFirestore, getBotConfig, saveBotConfig } from './firebase';
import { listenForRewards, claimRewardInFirestore, getOfferwallUrl, getRewardedVideoUrl } from './adscend';
import { type LeagueData, generateLeague, refreshLeagueIfNeeded, getGapToFirst, getRefreshCountdown, generateGuestShowcase, generateViewOnlyLeague, getMsUntilNextUtcMidnight } from './league';

// ─── Ad Config Types ──────────────────────────────────────────────
export interface AdConfig {
  rewardedVideo: boolean;       // 동영상 시청형 광고 (30초 이상 긴 영상)
  offerwall: boolean;           // 참여형 광고 (앱 설치, 설문 등)
  interstitial: boolean;        // 전면 광고 (게임 사이)
  rewardedVideoSeconds: number; // 동영상 길이 (초)
  offerwallRewardHearts: number;// 참여형 광고 보상 하트 수
  rewardedVideoRewardHearts: number; // 동영상 보상 하트 수
  videosPerHeart: number;       // 하트 1개를 얻기 위해 시청해야 할 동영상 수
}

const DEFAULT_AD_CONFIG: AdConfig = {
  rewardedVideo: true,
  offerwall: true,
  interstitial: false,
  rewardedVideoSeconds: 30,
  offerwallRewardHearts: 1,
  rewardedVideoRewardHearts: 1,
  videosPerHeart: 4,
};

interface AppState {
  currentUser: User | null;
  currentView: ViewState;
  isMenuOpen: boolean;
  leaderboard: LeaderboardEntry[];
  language: LanguageCode;
  notice: string;
  showNoticePopup: boolean;
  termsAccepted: boolean;
  seasonEndsAt: number;
  heartsUsedToday: number;
  adRevenue: number;
  activityFeed: ActivityItem[];
  adConfig: AdConfig;
  videoWatchCount: number; // 현재 세션 리워드 비디오 시청 횟수
  rewardListenerUnsubscribe: (() => void) | null;
  league: LeagueData | null;
  adminUsers: Record<string, any>[];
  adminStats: { totalHeartsUsed: number, adRevenue: number };
  botConfig: BotConfig;

  setView: (view: ViewState) => void;
  toggleMenu: () => void;
  setLanguage: (lang: LanguageCode) => void;
  setNotice: (value: string) => void;
  setShowNoticePopup: (value: boolean) => void;
  acceptTerms: () => void;

  setBotConfig: (config: BotConfig) => void;

  login: () => Promise<void>;
  logout: () => void;
  consumeHeart: () => boolean;
  addHeart: (amount: number) => void;
  claimDailyHeart: () => boolean;

  updateBestTime: (time: number) => void;
  addHistoryEvent: (type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY', value: number) => void;
  fetchLeaderboard: () => void;
  initLeague: () => void;
  refreshLeague: () => void;
  getLeagueGap: () => number;
  getLeagueCountdown: () => string;
  resetSeason: () => void;
  generateDummyBots: (count: number) => void;
  banUser: (id: string) => void;
  editUserHeart: (id: string, hearts: number) => void;
  getReferralLink: () => string;

  // Admin
  toggleAdminRole: () => void;
  fetchAdminData: () => Promise<void>;

  // Ad system
  setAdConfig: (config: Partial<AdConfig>) => void;
  watchRewardedAd: () => Promise<boolean>;
  completeOfferwall: () => Promise<boolean>;
  initAdscendListener: () => void;
  getOfferUrls: () => { offerwall: string; video: string };
}

const adjectives = ['Lovely', 'Shiny', 'Happy', 'Bright', 'Neon', 'Cute', 'Royal'];
const favorites = ['Jimin', 'V', 'Tiger', 'Jungkook', 'Hobi', 'ARMY', 'Kookie'];
const countries = ['KR', 'US', 'JP', 'BR', 'TH', 'ID', 'PH', 'FR', 'DE', 'VN'];
const AVATAR_SEED = 'stanbeat-avatar';
const THREE_HOURS = 3 * 60 * 60 * 1000;

const todayUtc = () => new Date().toISOString().slice(0, 10);

// 로컬 스토리지에 데이터를 안전하게 읽고 쓰기 위한 유틸리티 객체
const safeStorage = {
  // 제네릭 타입 T를 사용해 읽어올 데이터타입을 지정하고, 실패 시 반환할 fallback(기본값) 설정
  get: <T>(key: string, fallback: T): T => {
    try {
      // 로컬 스토리지에서 해당 key로 저장된 문자열 값을 가져옴
      const value = localStorage.getItem(key);
      // 값이 존재하면 JSON 파싱 후 T 타입으로 캐스팅해 반환, 없으면 기본값(fallback) 반환
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      // 파싱 에러 등 예외 발생 시 안전하게 기본값 반환 방어 코드
      return fallback;
    }
  },
  // 제네릭 타입 T를 가지는 값을 특정 key로 로컬 스토리지에 저장
  set: <T>(key: string, value: T): void => {
    try {
      // 객체 등의 구조화된 데이터를 JSON 문자열로 직렬화하여 스토리지에 저장
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 브라우저 저장소 용량 초과나 보안 설정 등으로 인한 예외 무시
      // no-op
    }
  },
};

export const detectLanguageFromIP = async (): Promise<LanguageCode | null> => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const countryCode: string = data.country_code;
    const map: Record<string, LanguageCode> = {
      KR: 'ko', JP: 'ja', CN: 'zh-CN', TH: 'th', ID: 'id',
      VN: 'vi', PH: 'en', US: 'en', GB: 'en', AU: 'en',
      FR: 'fr', DE: 'de', ES: 'es', BR: 'pt-BR', IN: 'hi',
      TR: 'tr', AR: 'ar', SA: 'ar',
    };
    return map[countryCode] ?? null;
  } catch {
    return null;
  }
};

const generateNickname = () => {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = favorites[Math.floor(Math.random() * favorites.length)];
  const n = Math.floor(Math.random() * 10000).toString().padStart(2, '0');
  return `${a}${b}_${n}`;
};

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10);
};

// 유저 객체의 하트 만료 시간을 체크하여, 만료되었다면 하트를 0으로 초기화해 반환하는 상태 정규화 함수
const normalizeHearts = (user: User) => {
  // 만약 하트 만료 시간(expiresAt)이 설정되지 않은 유저라면 무한 하트이거나 초기화 상태이므로 그대로 반환
  if (!user.expiresAt) return user;

  // 현재 시간이 유저의 하트 만료 시간을 넘어섰는지 검사
  if (Date.now() > user.expiresAt) {
    // 만료 시간을 넘어섰다면, 보유 하트 수를 0으로 만들고 만료 시간은 null로 리셋한 새 유저 객체 반환
    return { ...user, hearts: 0, expiresAt: null };
  }
  // 만료 기간이 아직 남았다면 상태를 변경하지 않고 기존 유저 객체를 반환
  return user;
};

const mockLeaderboardBase: LeaderboardEntry[] = [
  { id: '1', rank: 1, nickname: 'GoldenMaknae', country: 'KR', avatarUrl: 'https://picsum.photos/seed/1/80/80', time: 24500 },
  { id: '2', rank: 2, nickname: 'BTS_Army_USA', country: 'US', avatarUrl: 'https://picsum.photos/seed/2/80/80', time: 26100 },
  { id: '3', rank: 3, nickname: 'TaeTaeBear', country: 'JP', avatarUrl: 'https://picsum.photos/seed/3/80/80', time: 28300 },
  { id: '4', rank: 4, nickname: 'HobiWorld', country: 'BR', avatarUrl: 'https://picsum.photos/seed/4/80/80', time: 29900 },
  { id: '5', rank: 5, nickname: 'ChimChim', country: 'FR', avatarUrl: 'https://picsum.photos/seed/5/80/80', time: 31200 },
];

// Dynamic ticker generator — random league-winner announcements
const TICKER_NICKNAMES = [
  'ShinyCookie', 'GoldenArmy', 'HobiSunshine', 'TaeBear', 'JiminStar',
  'CosmicJK', 'MoonChild', 'DynamiteQueen', 'ButterArmy', 'PurpleHeart',
  'SeokjinLover', 'YoongiFire', 'NamjoonWise', 'BTSForever', 'ARMYPower',
  'SpringDay', 'MikrokosmosFan', 'BangtanSoul', 'DaydreamArmy', 'EuphoriaGirl',
];
// 동적 알림(Ticker)용 가상의 닉네임 생성기 (BTS 팬덤 감성이 담긴 프리셋 단어 사용)
const generateTickerNickname = () => {
  // 미리 정의된 TICKER_NICKNAMES 배열에서 무작위로 하나의 닉네임을 선택
  const name = TICKER_NICKNAMES[Math.floor(Math.random() * TICKER_NICKNAMES.length)];
  // 실제 유저처럼 보이기 위해 1000에서 9999 사이의 4자리 무작위 숫자를 생성
  const num = Math.floor(Math.random() * 9000) + 1000;
  // 단어와 숫자를 언더바(_)로 연결하여 최종 닉네임 문자열 반환 (예: ShinyCookie_4512)
  return `${name}_${num}`;
};
const generateTickerTime = () => (28 + Math.random() * 14).toFixed(1); // 28.0 ~ 42.0s
const generateTickerLeagueId = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 90) + 10}`;
};

const generateDynamicFeed = (): ActivityItem[] => {
  const items: ActivityItem[] = [];
  for (let i = 0; i < 3; i++) {
    const nick = generateTickerNickname();
    const time = generateTickerTime();
    const league = generateTickerLeagueId();
    items.push({
      id: `dyn-${Date.now()}-${i}`,
      message: `🏆 League #${league}에서 ${nick}님이 ${time}초로 1등을 달성했습니다!`,
      level: 'live',
    });
  }
  items.push({
    id: `evt-${Date.now()}`,
    message: '[EVENT] 친구 초대 시 +1❤️ 즉시 지급!',
    level: 'event',
  });
  return items;
};

const defaultFeed: ActivityItem[] = generateDynamicFeed();

const savedLang = safeStorage.get<LanguageCode>('stanbeat_lang', 'ko');
const savedNotice = safeStorage.get<string>('stanbeat_notice', '');
const savedLeaderboard = safeStorage.get<LeaderboardEntry[]>('stanbeat_leaderboard', mockLeaderboardBase);
const savedUser = safeStorage.get<User | null>('stanbeat_user', null);
const savedShowNotice = safeStorage.get<boolean>('stanbeat_show_notice', false);
const savedAdConfig = safeStorage.get<AdConfig>('stanbeat_ad_config', DEFAULT_AD_CONFIG);
const savedBotConfig = safeStorage.get<BotConfig>('stanbeat_bot_config', { mean: 50000, stdDev: 15000 });

export const useStore = create<AppState>((set, get) => ({
  currentUser: savedUser ? normalizeHearts(savedUser) : null,
  currentView: 'HOME',
  isMenuOpen: false,
  leaderboard: savedLeaderboard,
  language: savedLang,
  notice: savedNotice,
  showNoticePopup: savedShowNotice,
  termsAccepted: savedUser?.agreedToTerms ?? false,
  seasonEndsAt: safeStorage.get<number>('stanbeat_season_ends', Date.now() + getMsUntilNextUtcMidnight()),
  heartsUsedToday: safeStorage.get<number>('stanbeat_hearts_used', 0),
  adRevenue: safeStorage.get<number>('stanbeat_ad_revenue', 4203),
  activityFeed: defaultFeed,
  adConfig: savedAdConfig,
  videoWatchCount: 0,
  rewardListenerUnsubscribe: null,
  league: safeStorage.get<LeagueData | null>('stanbeat_league', null),
  adminUsers: [],
  adminStats: { totalHeartsUsed: 0, adRevenue: 0 },
  botConfig: savedBotConfig,

  setView: (view) => set({ currentView: view }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  setLanguage: (language) => {
    safeStorage.set('stanbeat_lang', language);
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
    set({ language });
  },
  setNotice: (notice) => {
    safeStorage.set('stanbeat_notice', notice);
    set({ notice });
  },
  setShowNoticePopup: (value) => {
    safeStorage.set('stanbeat_show_notice', value);
    set({ showNoticePopup: value });
  },
  acceptTerms: () => {
    const user = get().currentUser;
    if (!user) return;
    const nextUser = { ...user, agreedToTerms: true };
    safeStorage.set('stanbeat_user', nextUser);
    set({ currentUser: nextUser, termsAccepted: true });
  },

  setBotConfig: (config) => {
    safeStorage.set('stanbeat_bot_config', config);
    set({ botConfig: config });
    if (isFirebaseEnabled) {
      saveBotConfig(config.mean, config.stdDev).catch(console.error);
    }
  },

  // ─── 인증 (Auth) 로직 ─────────────────────────────────────────────────────
  // 구글 로그인을 처리하고 유저 데이터를 초기화하거나 기존 데이터를 불러오는 함수
  login: async () => {
    // 현재 접속한 브라우저의 URL에 있는 쿼리(query) 파라미터들을 파싱합니다.
    const urlParams = new URLSearchParams(window.location.search);
    // 쿼리 파라미터 중 추천인 코드('ref')가 있는지 확인하여 가져옵니다.
    const refCode = urlParams.get('ref');

    // 파이어베이스(연동) 기능이 활성화되어 환경변수로 로드된 경우만 로그인 시도
    if (isFirebaseEnabled) {
      try {
        // 인앱 브라우저(인스타그램, 페이스북, 카카오톡 등) 감지 및 경고
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isEmbeddedBrowser = /Instagram|FBAN|FBAV|Snapchat|Line|Kakao|Twitter|Threads/i.test(userAgent);
        if (isEmbeddedBrowser) {
          alert('인앱 브라우저에서는 구글 로그인이 차단될 수 있습니다. 오른쪽 위 메뉴(⋮)를 눌러 기본 브라우저(Chrome/Safari)로 열어주세요.\n\nIn-app browsers may block Google Login. Please open in Chrome/Safari.');
        }

        // 파이어베이스에서 제공하는 구글 팝업 로그인을 실행하여 결과를 받아옵니다.
        const fbUser = await firebaseSignInWithGoogle();
        // 로그인 결과가 없다면(팝업 닫힘 등) 에러를 발생시켜 catch 블록으로 넘깁니다.
        if (!fbUser) throw new Error('Google sign-in returned no user');

        // 새로 로그인한 사용자의 초기 데이터 구조를 생성합니다.
        const user: User = {
          id: fbUser.uid, // 파이어베이스에서 부여한 고유 UID 
          // 구글 프로필 이름 대신 임의의 닉네임을 생성하여 익명성을 보장합니다.
          nickname: generateNickname(),
          // 구글 프로필 사진이 있으면 쓰고, 없으면 시드값을 이용해 랜덤 아바타 이미지를 생성
          avatarUrl: fbUser.photoURL || `https://picsum.photos/seed/${AVATAR_SEED}${Date.now()}/100/100`,
          email: fbUser.email || '', // 구글 이메일 (없을 경우 빈 문자열 부여)
          hearts: 1, // 신규 가입 시 보너스 개념으로 바로 플레이 가능하도록 하트 1개 지급
          bestTime: null, // 초기 최고 기록은 없으므로 null로 설정
          country: 'KR', // 기본 국가 코드는 KR(한국)로 설정 (이후 서비스 로직에 따라 변경 가능)
          role: 'USER', // 기본 권한 레벨을 일반 사용자로 설정
          // 지급한 1개의 하트가 3시간 뒤에 만료되도록 만료 시간 계산하여 설정
          expiresAt: Date.now() + THREE_HOURS,
          lastDailyHeart: null, // 아직 일일 무료 하트를 받은 기록이 없으므로 null
          agreedToTerms: false, // 최초 로그인 시 약관 동의 절차를 거치지 않았으므로 false 설정
          banned: false, // 블랙리스트(차단) 상태를 기본값인 false로 설정
          gameHistory: [], // 모든 플레이 기록을 담을 배열 초기화
          referralCode: generateReferralCode(), // 나만의 8자리 고유 추천인 코드 발급
          referredBy: refCode, // URL에 추천인 코드가 있었다면 내 계정에 추천자(referredBy) 등록
        };

        // 파이어베이스(Firestore)에서 기존 데이터가 있는지 먼저 확인합니다.
        const fbProfile = await getUserProfile(user.id);

        if (fbProfile) {
          user.nickname = (fbProfile.nickname as string) || user.nickname;
          user.avatarUrl = (fbProfile.avatarUrl as string) || user.avatarUrl;
          user.country = (fbProfile.country as string) || user.country;
          if (fbProfile.hearts !== undefined) user.hearts = Number(fbProfile.hearts);
          if (fbProfile.bestTime !== undefined) user.bestTime = Number(fbProfile.bestTime) || null;
          if (fbProfile.gameHistory) user.gameHistory = fbProfile.gameHistory as HistoryEvent[];
          if (fbProfile.agreedToTerms !== undefined) user.agreedToTerms = Boolean(fbProfile.agreedToTerms);
          if (fbProfile.referralCode) user.referralCode = fbProfile.referralCode as string;
          if (fbProfile.referredBy) user.referredBy = fbProfile.referredBy as string;
          if (fbProfile.lastDailyHeart) user.lastDailyHeart = fbProfile.lastDailyHeart as string;
          if (fbProfile.expiresAt) user.expiresAt = Number(fbProfile.expiresAt);
          if (fbProfile.role) user.role = fbProfile.role as 'USER' | 'ADMIN';
          if (fbProfile.banned !== undefined) user.banned = Boolean(fbProfile.banned);
        } else {
          // Firestore 계정이 없지만 로컬 스토리지에 이전에 저장된 기존 유저 데이터가 있는지 확인
          const existingUser = safeStorage.get<User | null>('stanbeat_user', null);
          if (existingUser && existingUser.id === user.id) {
            user.hearts = existingUser.hearts;
            user.bestTime = existingUser.bestTime;
            user.gameHistory = existingUser.gameHistory;
            user.agreedToTerms = existingUser.agreedToTerms;
            user.referralCode = existingUser.referralCode;
            user.referredBy = existingUser.referredBy;
            user.lastDailyHeart = existingUser.lastDailyHeart;
            user.expiresAt = existingUser.expiresAt;
            user.role = existingUser.role;
            user.banned = existingUser.banned;
          }
        }

        // 새롭게 만들어지거나 병합된 유저 데이터를 로컬 스토리지에 저장합니다.
        safeStorage.set('stanbeat_user', user);
        // 하트 상태 검사(normalizeHearts) 후 Zustand 글로벌 저장소(store) 상태 업데이트
        set({ currentUser: normalizeHearts(user), termsAccepted: user.agreedToTerms });

        // 파이어베이스(Firestore)에도 유저 프로필 정보를 비동기로 저장/업데이트 요청
        saveUserProfile(user.id, {
          nickname: user.nickname,
          email: user.email,
          avatarUrl: user.avatarUrl,
          country: user.country,
        }).catch(console.error); // 실패 시 콘솔에 에러만 기록

        if (user.banned) {
          alert('이 계정은 이용이 정지되었습니다.\nThis account has been suspended.');
          return;
        }

      } catch (error: any) {
        // 로그인이 실패하거나 여러 이유로 진행할 수 없었을 때 발생
        console.error('Google login failed:', error);

        // 403 disallowed_useragent 에러 (보통 인앱 브라우저 등에서 구글이 차단할 때 발생)
        if (error?.message?.includes('disallowed_useragent') || error?.code === 'auth/unauthorized-domain' || error?.message?.includes('403')) {
          alert('보안상의 이유로 현재 브라우저에서는 구글 로그인을 진행할 수 없습니다.\n오른쪽 위 메뉴(⋮)를 눌러 기본 브라우저(Chrome/Safari)로 열어 다시 시도해주세요.\n\nGoogle Login is blocked in this browser. Please open in Chrome/Safari.');
        } else {
          alert('구글 로그인에 실패했습니다. 다시 시도해주세요.\nGoogle login failed. Please try again.');
        }
      }
    } else {
      // Mock login (for development without Firebase)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const user: User = {
            id: `user_${Math.floor(Math.random() * 99999)}`,
            // 무조건 랜덤 닉네임 배정
            nickname: generateNickname(),
            avatarUrl: `https://picsum.photos/seed/${AVATAR_SEED}${Math.floor(Math.random() * 9999)}/100/100`,
            email: 'army@example.com',
            hearts: 1, // 신규 가입 시 하트 1개 지급
            bestTime: null,
            country: countries[Math.floor(Math.random() * countries.length)],
            role: 'USER',
            expiresAt: Date.now() + THREE_HOURS,
            lastDailyHeart: null,
            agreedToTerms: false,
            banned: false,
            gameHistory: [],
            referralCode: generateReferralCode(),
            referredBy: refCode,
          };
          safeStorage.set('stanbeat_user', user);
          set({ currentUser: user, termsAccepted: false });
          resolve();
        }, 450);
      });
    }
  },

  logout: () => {
    if (isFirebaseEnabled) {
      firebaseSignOut().catch(console.error);
    }
    safeStorage.set('stanbeat_user', null);
    set({ currentUser: null, currentView: 'HOME', termsAccepted: false });
  },

  consumeHeart: () => {
    const user = get().currentUser;
    if (!user || user.banned) return false;
    // Admin bypass: always allow playing without consuming a heart
    if (user.role === 'ADMIN') return true;

    const normalized = normalizeHearts(user);
    if (normalized.hearts <= 0) {
      set({ currentUser: normalized });
      safeStorage.set('stanbeat_user', normalized);
      return false;
    }

    // Heart consumed (for normal users)
    if (isFirebaseEnabled) {
      incrementGlobalStats(1, 0); // Increment global hearts used by 1
    }

    const updatedUser = { ...normalized, hearts: normalized.hearts - 1 };
    const newHeartsUsed = get().heartsUsedToday + 1;
    safeStorage.set('stanbeat_user', updatedUser);
    safeStorage.set('stanbeat_hearts_used', newHeartsUsed);
    set({ heartsUsedToday: newHeartsUsed, currentUser: updatedUser });
    return true;
  },

  addHeart: (amount) => {
    const user = get().currentUser;
    if (!user || user.banned) return;
    const normalized = normalizeHearts(user);
    const record: HistoryEvent | null = amount > 0 ? { type: 'AD', value: amount, date: new Date().toISOString() } : null;
    const nextHistory = record ? [...normalized.gameHistory, record] : normalized.gameHistory;

    const updatedUser = {
      ...normalized,
      hearts: normalized.hearts + amount,
      expiresAt: Date.now() + THREE_HOURS,
      gameHistory: nextHistory,
    };

    // Track globally (approximation of ad revenue triggered by heart addition logic)
    const revDelta = amount > 0 ? 0.35 : 0;
    if (isFirebaseEnabled && revDelta > 0) {
      incrementGlobalStats(0, revDelta);
    }

    const newRevenue = get().adRevenue + revDelta;
    safeStorage.set('stanbeat_user', updatedUser);
    safeStorage.set('stanbeat_ad_revenue', newRevenue);
    set({ adRevenue: newRevenue, currentUser: updatedUser });
  },

  // ─── 일일 하트 지급 처리 ──────────────────────────────────────────
  claimDailyHeart: () => {
    const user = get().currentUser;
    if (!user || user.banned) return false;
    const normalized = normalizeHearts(user);
    if (normalized.lastDailyHeart === todayUtc()) {
      set({ currentUser: normalized });
      return false;
    }
    const record: HistoryEvent = { type: 'DAILY', value: 1, date: new Date().toISOString() };
    const updatedUser = {
      ...normalized,
      hearts: Math.min(normalized.hearts + 1, 3),
      lastDailyHeart: todayUtc(),
      expiresAt: Date.now() + THREE_HOURS,
      gameHistory: [...normalized.gameHistory, record],
    };
    safeStorage.set('stanbeat_user', updatedUser);
    set({ currentUser: updatedUser });
    return true;
  },

  // ─── 최고 기록 갱신 및 Firestore 저장 ──────────────────────────────
  updateBestTime: (time) => {
    if (time < 5000) {
      console.warn(`[Anti-Cheat] Rejected impossible time: ${time}ms`);
      return;
    }

    const user = get().currentUser;
    if (!user || user.banned) return;

    // 신기록일 경우에만 업데이트 및 리그 재생성 수행
    if (!user.bestTime || time < user.bestTime) {
      const nextUser = { ...user, bestTime: time };
      safeStorage.set('stanbeat_user', nextUser);
      set({ currentUser: nextUser });

      // 유저의 최고 기록이 바뀌었으므로, 이에 맞춰 봇들의 난이도를 
      // 재조정(스케일링)하기 위해 리그를 즉시 갱신합니다.
      get().initLeague();

      // Save to Firestore leaderboard
      if (isFirebaseEnabled && nextUser.bestTime) {
        saveScore(nextUser.id, {
          nickname: nextUser.nickname,
          country: nextUser.country,
          avatarUrl: nextUser.avatarUrl,
          time: nextUser.bestTime,
        }).catch(console.error);
      }
    }
  },

  addHistoryEvent: (type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY', value: number) => {
    const user = get().currentUser;
    if (!user) return;
    const record: HistoryEvent = { type, value, date: new Date().toISOString() };
    const nextUser = { ...user, gameHistory: [...user.gameHistory, record].slice(-100) };
    safeStorage.set('stanbeat_user', nextUser);
    set({ currentUser: nextUser });

    // 비동기 동작, 실패해도 화면엔 영향 없도록 catch
    if (isFirebaseEnabled && nextUser.id && type === 'PLAY') {
      import('./firebase').then(m => m.saveUserProfile(nextUser.id, { gameHistory: nextUser.gameHistory }).catch(console.error));
    }
  },

  // ─── 리더보드 데이터 호출 및 리그 로딩 ─────────────────────────────
  fetchLeaderboard: () => {
    // 유저 기록이 있으면 리그 시스템에 위임
    const current = get().currentUser;
    if (current?.bestTime) {
      get().initLeague();
      const league = get().league;
      if (league) {
        set({ leaderboard: league.entries });
        return;
      }
    }
    // For logged-in users WITHOUT a record: generate view-only league (60-99 synthetic players)
    if (current && !current.bestTime) {
      const existingLeague = get().league;
      if (!existingLeague || existingLeague.userBestAtGeneration !== null) {
        // userBestAtGeneration이 null이 아니면(임시게스트가 아니면) 게스트 전용 뷰 생성
        const viewLeague = generateViewOnlyLeague(current.id, get().botConfig);
        safeStorage.set('stanbeat_league', viewLeague);
        set({ league: viewLeague, leaderboard: viewLeague.entries });
      } else {
        set({ leaderboard: existingLeague.entries });
      }
      return;
    }
    // Not logged in: use stored leaderboard as-is
    set({ leaderboard: get().leaderboard });
  },

  // ─── 리그 알고리즘 초기화 방아쇠 ──────────────────────────────────
  initLeague: () => {
    const user = get().currentUser;
    if (!user?.bestTime) return;
    const currentLeague = get().league;
    const league = refreshLeagueIfNeeded(
      currentLeague,
      user.bestTime,
      user.id,
      user.nickname,
      user.country,
      user.avatarUrl,
      get().botConfig
    );
    if (league && league !== currentLeague) {
      safeStorage.set('stanbeat_league', league);
      set({ league, leaderboard: league.entries });
    }
  },

  refreshLeague: () => {
    const user = get().currentUser;
    if (!user?.bestTime) return;
    const currentLeague = get().league;
    const hasNewBest = currentLeague?.userBestAtGeneration !== null &&
      currentLeague?.userBestAtGeneration !== undefined &&
      user.bestTime < currentLeague.userBestAtGeneration;
    const league = generateLeague(
      user.bestTime,
      user.id,
      user.nickname,
      user.country,
      user.avatarUrl,
      currentLeague?.userRank ?? null,
      hasNewBest,
      currentLeague?.userRank === 1, // overtakeUser
      get().botConfig
    );
    safeStorage.set('stanbeat_league', league);
    set({ league, leaderboard: league.entries });
  },

  getLeagueGap: () => {
    const league = get().league;
    if (!league) return 0;
    return getGapToFirst(league);
  },

  getLeagueCountdown: () => {
    const league = get().league;
    if (!league) return '30:00';
    return getRefreshCountdown(league);
  },

  resetSeason: () => {
    const newEndTime = Date.now() + getMsUntilNextUtcMidnight();
    safeStorage.set('stanbeat_leaderboard', mockLeaderboardBase);

    if (isFirebaseEnabled) {
      deleteAllScores(); // Wipe out Firestore scores collection to implement true reset
    }
    safeStorage.set('stanbeat_season_ends', newEndTime);
    safeStorage.set('stanbeat_hearts_used', 0);
    set({
      seasonEndsAt: newEndTime,
      leaderboard: mockLeaderboardBase,
      heartsUsedToday: 0,
    });
  },

  generateDummyBots: (count) => {
    const bots: LeaderboardEntry[] = Array.from({ length: count }, (_, idx) => {
      const sec = 40000 + Math.floor(Math.random() * 20000);
      return {
        id: `bot_${Date.now()}_${idx}`,
        nickname: `BotARMY_${idx + 1}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        avatarUrl: `https://picsum.photos/seed/bot-${idx}/80/80`,
        rank: 0,
        time: sec,
        isBot: true,
      };
    });

    if (isFirebaseEnabled) {
      // Actually populate the real global leaderboard for load testing / fake activity
      bots.forEach((bot) => {
        saveScore(bot.id, {
          nickname: bot.nickname,
          country: bot.country,
          avatarUrl: bot.avatarUrl,
          time: bot.time,
        }).catch(console.error);
      });
    }

    const combined = [...get().leaderboard, ...bots]
      .sort((a, b) => a.time - b.time)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined });
  },

  banUser: (id) => {
    if (isFirebaseEnabled) {
      banUserInFs(id);
    }
    const combined = get().leaderboard.map((entry) => (entry.id === id ? { ...entry, banned: true } : entry));

    // Update admin users list as well
    const updatedAdminUsers = get().adminUsers.map(user =>
      user.id === id ? { ...user, banned: true } : user
    );

    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined, adminUsers: updatedAdminUsers });
  },

  editUserHeart: (id, hearts) => {
    if (isFirebaseEnabled) {
      editUserHeartInFirestore(id, hearts);
    }

    const user = get().currentUser;
    if (user && user.id === id) {
      const updatedUser = { ...user, hearts: Math.max(0, Math.min(3, hearts)), expiresAt: Date.now() + THREE_HOURS };
      safeStorage.set('stanbeat_user', updatedUser);
      set({ currentUser: updatedUser });
    }

    const combined = get().leaderboard.map((entry) =>
      entry.id === id ? { ...entry, hearts: Math.max(0, Math.min(3, hearts)) } : entry
    );

    const updatedAdminUsers = get().adminUsers.map(user =>
      user.id === id ? { ...user, hearts: Math.max(0, Math.min(3, hearts)) } : user
    );

    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined, adminUsers: updatedAdminUsers });
  },

  getReferralLink: () => {
    const user = get().currentUser;
    if (!user) return window.location.origin;
    return `${window.location.origin}?ref=${user.referralCode}`;
  },

  toggleAdminRole: () => {
    const user = get().currentUser;
    if (!user) return;
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const updatedUser = { ...user, role: nextRole as 'USER' | 'ADMIN' };

    if (isFirebaseEnabled) {
      saveUserProfile(user.id, { role: updatedUser.role }).catch(console.error);
    }

    safeStorage.set('stanbeat_user', updatedUser);
    set({ currentUser: updatedUser });
    console.log(`[Admin] Role toggled to: ${nextRole}`);
  },

  fetchAdminData: async () => {
    if (!isFirebaseEnabled) return;
    try {
      const stats = await getGlobalStats();
      const users = await getAdminGlobalUsers();

      set({
        adminStats: {
          totalHeartsUsed: Number(stats?.totalHeartsUsed || 0),
          adRevenue: Number(stats?.adRevenue || 0),
        },
        adminUsers: users
      });
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    }
  },

  // ─── Ad System ──────────────────────────────────────────────────
  setAdConfig: (partial) => {
    const current = get().adConfig;
    const next = { ...current, ...partial };
    safeStorage.set('stanbeat_ad_config', next);
    set({ adConfig: next });
  },

  getOfferUrls: () => {
    const user = get().currentUser;
    const userId = user?.id || 'guest';
    return {
      offerwall: getOfferwallUrl(userId),
      video: getRewardedVideoUrl(userId),
    };
  },

  initAdscendListener: () => {
    const user = get().currentUser;
    if (!user || get().rewardListenerUnsubscribe) return;

    console.log('[Adscend] Initializing reward listener for', user.id);
    // listenForRewards 콜백: 새로운 광고 보상 수신 시 하트 지급 및 Firestore 청구 처리
    const unsub = listenForRewards(user.id, (reward) => {
      console.log('[Adscend] 새 보상 수신:', reward);
      // 유저에게 하트 1개 지급
      get().addHeart(1);
      // Firestore에 보상 청구 완료 기록 (이중 지급 방지)
      // reward를 명시적으로 타입 캐스팅하여 id 속성에 안전하게 접근
      const { id: rewardId } = reward as { id: string };
      claimRewardInFirestore(rewardId).catch(console.error);
    });
    set({ rewardListenerUnsubscribe: unsub });
  },

  watchRewardedAd: async () => {
    const config = get().adConfig;
    if (!config.rewardedVideo) return false;

    return new Promise<boolean>((resolve) => {
      const user = get().currentUser;
      if (!user || user.banned) { resolve(false); return; }

      const nextCount = get().videoWatchCount + 1;

      if (nextCount >= config.videosPerHeart) {
        // Reset count and grant heart
        const normalized = normalizeHearts(user);
        const record: HistoryEvent = { type: 'AD', value: config.rewardedVideoRewardHearts, date: new Date().toISOString() };
        const updatedUser = {
          ...normalized,
          hearts: Math.min(normalized.hearts + config.rewardedVideoRewardHearts, 3),
          expiresAt: Date.now() + THREE_HOURS,
          gameHistory: [...normalized.gameHistory, record],
        };
        const newRevenue = get().adRevenue + 0.35;
        safeStorage.set('stanbeat_user', updatedUser);
        safeStorage.set('stanbeat_ad_revenue', newRevenue);
        set({ adRevenue: newRevenue, currentUser: updatedUser, videoWatchCount: 0 });
        resolve(true);
      } else {
        // Just increment count
        set({ videoWatchCount: nextCount });
        resolve(false); // Signal that heart wasn't granted yet
      }
    });
  },

  completeOfferwall: async () => {
    const config = get().adConfig;
    if (!config.offerwall) return false;

    // Real offerwall rewards are handled by initAdscendListener + Firestore S2S Postback
    // This function can be used to trigger an immediate check or analytics
    return true;
  },
}));
