import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { ActivityItem, AdminUserRow, AlertDialogState, ConfirmDialogState, DeferredInstallPrompt, HistoryEvent, LeaderboardEntry, User, ViewState, BotConfig, RandConfig } from './types';
import { t, type LanguageCode } from './i18n';
import {
  banUserInFirestore as banUserInFs,
  claimAdRewardRemote,
  claimDailyHeartRemote,
  consumeHeartForGameRemote,
  deleteAllScores,
  editUserHeartInFirestore,
  firebaseSignInWithGoogle,
  firebaseSignOut,
  getAdConfig as getRemoteAdConfig,
  getAdminGlobalUsers,
  getBotConfig,
  getGlobalStats,
  getLeaderboardEntry,
  getRandConfig,
  getUserProfile,
  isFirebaseEnabled,
  listenGlobalStats,
  rewardReferrer,
  saveAdConfig as saveRemoteAdConfig,
  saveBotConfig,
  saveRandConfig,
  saveUserProfile,
  submitPlayResultRemote,
  unbanUserInFirestore as unbanUserInFs,
  type ServerUserSnapshot,
} from './firebase';
import { applixirProvider } from './services/providers/ApplixirProvider';
import { generateAvatarUrl } from './utils';
import { type LeagueData, generateDisplayLeagueName, refreshLeagueIfNeeded, getGapToFirst, getRefreshCountdown, generateViewOnlyLeague, getMsUntilNextUtcMidnight } from './league';
import { markLocalApplixirRewardClaimed, recordLocalApplixirReward, waitForApplixirReward } from './services/rewards/applixirRewards';
import { resolveApplixirUserId } from './services/rewards/applixirIdentity';
import { getRuntimeSiteUrl, runtimeConfig } from './runtimeConfig';
import { getStanbeatTestApi } from './devTestApi';
import { buildFandomUrl, persistFandomId, readStoredFandomId, resolveFandomId, type FandomId } from './features/fandom';
// Ad config types
export interface AdConfig {
  rewardedVideo: boolean;       // 동영상 시청형 광고 (30초 이상 긴 영상)
  interstitial: boolean;        // 전면 광고 (게임 사이)
  rewardedVideoSeconds: number; // 동영상 길이 (초)
  rewardedVideoRewardHearts: number; // 동영상 보상 하트 수
  videosPerHeart: number;       // 하트 1개를 얻기 위해 시청해야 할 동영상 수
}
export type RewardedAdFlowPhase = 'loading' | 'watching' | 'validating';

export interface RewardedAdFlowCallbacks {
  onPhase?: (phase: RewardedAdFlowPhase) => void;
}

const DEFAULT_AD_CONFIG: AdConfig = {
  rewardedVideo: true,
  interstitial: false,
  rewardedVideoSeconds: 30,
  rewardedVideoRewardHearts: 1,
  videosPerHeart: 1,
};

// ─── 랜덤 알고리즘 기본값 ────────────────────────────────────────────
const DEFAULT_RAND_CONFIG: RandConfig = {
  // 봇 기록 정규분포 (50초 평균, 15초 표준편차)
  botTimeMean: 50000,
  botTimeStdDev: 15000,
  // 리그 크기 범위
  leagueSizeMin: 60,
  leagueSizeMax: 99,
  // 전체 리그 수 표시
  totalLeaguesMean: 3624,
  totalLeaguesStdDev: 15,
  // 1위 추월 간격 (ms)
  overtakeGapMin: 100,
  overtakeGapMax: 500,
  // 게스트 쇼케이스 기록 분포
  showcaseTimeMean: 8000,
  showcaseTimeStdDev: 2000,
  // 티커 기록 범위 (초)
  tickerTimeMin: 24.0,
  tickerTimeMax: 42.0,
  // 피드 한 번 갱신 시 생성 항목 수
  feedBatchSize: 3,
  // 총 리그 수 최솟값 하드캡
  totalLeaguesFloor: 3500,
};

const BOT_CONFIG_STORAGE_KEY = 'stanbeat_bot_config';
const RAND_CONFIG_STORAGE_KEY = 'stanbeat_rand_config';
const UTC_DAY_STORAGE_KEY = 'stanbeat_utc_day';

const normalizeRandConfig = (config: Partial<RandConfig>): RandConfig => {
  const merged = { ...DEFAULT_RAND_CONFIG, ...config };
  const leagueSizeMin = Math.max(1, Math.round(merged.leagueSizeMin));
  const leagueSizeMax = Math.max(leagueSizeMin, Math.round(merged.leagueSizeMax));
  const overtakeGapMin = Math.max(1, Math.round(merged.overtakeGapMin));
  const overtakeGapMax = Math.max(overtakeGapMin, Math.round(merged.overtakeGapMax));
  return {
    ...merged,
    botTimeMean: Math.max(5000, Math.round(merged.botTimeMean)),
    botTimeStdDev: Math.max(100, Math.round(merged.botTimeStdDev)),
    leagueSizeMin,
    leagueSizeMax,
    totalLeaguesMean: Math.max(1, Math.round(merged.totalLeaguesMean)),
    totalLeaguesStdDev: Math.max(0, Math.round(merged.totalLeaguesStdDev)),
    overtakeGapMin,
    overtakeGapMax,
    showcaseTimeMean: Math.max(1000, Math.round(merged.showcaseTimeMean)),
    showcaseTimeStdDev: Math.max(100, Math.round(merged.showcaseTimeStdDev)),
    tickerTimeMin: Math.max(1, Number(merged.tickerTimeMin)),
    tickerTimeMax: Math.max(Math.max(1, Number(merged.tickerTimeMin)), Number(merged.tickerTimeMax)),
    feedBatchSize: Math.max(1, Math.round(merged.feedBatchSize)),
    totalLeaguesFloor: Math.max(1, Math.round(merged.totalLeaguesFloor)),
  };
};

const deriveBotConfigFromRand = (config: RandConfig): BotConfig => ({
  mean: config.botTimeMean,
  stdDev: config.botTimeStdDev,
});

interface AppState {
  currentUser: User | null;
  currentView: ViewState;
  activeFandomId: FandomId;
  isGameFinished: boolean;
  gameSessionActive: boolean;
  gameRunStartedAt: number | null;
  gameExitRequested: boolean;
  isMenuOpen: boolean;
  loginPromptRequested: boolean;
  termsPromptRequested: boolean;
  leaderboard: LeaderboardEntry[];
  language: LanguageCode;
  notice: string;
  showNoticePopup: boolean;
  rewardMessage: string | null;
  alertDialog: AlertDialogState | null;
  confirmDialog: ConfirmDialogState | null;
  showBrowserBlocker: boolean;
  deferredPrompt: DeferredInstallPrompt | null;
  termsAccepted: boolean;
  seasonEndsAt: number;
  heartsUsedToday: number;
  adRevenue: number;
  activityFeed: ActivityItem[];
  adConfig: AdConfig;
  videoWatchCount: number;
  league: LeagueData | null;
  randConfig: RandConfig;
  adminUsers: AdminUserRow[];
  adminStats: { totalHeartsUsed: number, adRevenue: number };
  botConfig: BotConfig;
  adminLoading: boolean;
  adminShowAll: boolean;
  adminLog: Array<{ action: string; target: string; time: string }>;
  adminStatsUnsubscribe: (() => void) | null;

  setView: (view: ViewState) => void;
  setActiveFandom: (id: string) => void;
  setGameFinished: (value: boolean) => void;
  markGameSessionCancelled: (elapsedMs?: number) => void;
  requestGameExit: () => void;
  clearGameExitRequest: () => void;
  toggleMenu: () => void;
  setLanguage: (lang: LanguageCode) => void;
  setNotice: (value: string) => void;
  setShowNoticePopup: (value: boolean) => void;
  showRewardToast: (msg: string | null) => void;
  showAlertDialog: (dialog: AlertDialogState | null) => void;
  showConfirmDialog: (dialog: ConfirmDialogState | null) => void;
  setShowBrowserBlocker: (value: boolean) => void;
  setDeferredPrompt: (value: DeferredInstallPrompt | null) => void;
  acceptTerms: () => void;
  requestLoginPrompt: () => void;
  requestTermsPrompt: () => void;
  clearActionPrompts: () => void;

  setBotConfig: (config: BotConfig) => void;

  login: () => Promise<boolean>;
  restoreSessionFromAuth: (authUser: FirebaseUser) => Promise<void>;
  logout: () => void;
  startGame: () => Promise<'started' | 'needs_login' | 'needs_terms' | 'needs_hearts' | 'blocked'>;
  claimDailyHeart: () => Promise<'claimed' | 'already_claimed' | 'max_hearts'>;

  recordCompletedPlay: (time: number) => Promise<boolean>;
  addHistoryEvent: (type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY' | 'CANCELLED', value: number) => void;
  fetchLeaderboard: () => Promise<void>;
  initLeague: () => void;
  refreshLeague: () => void;
  getLeagueGap: () => number;
  getLeagueCountdown: () => string;
  resetSeason: () => Promise<void>;
  banUser: (id: string) => void;
  unbanUser: (id: string) => void;
  editUserHeart: (id: string, hearts: number, mode?: 'SET' | 'DELTA') => void;
  getReferralLink: () => string;

  // Admin
  fetchAdminData: () => Promise<void>;
  startAdminLiveStats: () => void;
  stopAdminLiveStats: () => void;
  setAdminShowAll: (value: boolean) => void;
  addAdminLog: (action: string, target: string) => void;

  // Ad system
  setAdConfig: (config: Partial<AdConfig>) => void;
  setRandConfig: (config: Partial<RandConfig>) => void;
  refreshActivityFeed: () => void;
  hydrateOperationalState: () => Promise<void>;
  syncSeasonClock: () => void;
  claimPendingAdReward: (rewardId: string) => Promise<{ claimed: boolean; grantedHearts: number }>;
  watchRewardedAd: (callbacks?: RewardedAdFlowCallbacks) => Promise<'rewarded' | 'progressed' | 'capped' | 'failed'>;
}

const adjectives = ['Lovely', 'Shiny', 'Happy', 'Bright', 'Neon', 'Cute', 'Royal'];
const favorites = ['Idol', 'Stage', 'Seoul', 'Hallyu', 'Dance', 'Drama', 'KPop'];
const MAX_HEARTS = 3;
const MAX_HISTORY_ITEMS = 100;
const FREE_HEART_INTERVAL_MS = 6 * 60 * 60 * 1000;

let rewardToastTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRewardedVideoWaitUserId: string | null = null;

export const isRewardedVideoWaitActive = (userId?: string | null): boolean => {
  return Boolean(userId && pendingRewardedVideoWaitUserId === userId);
};

const sanitizeHistory = (history: unknown): HistoryEvent[] => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((record): record is HistoryEvent => {
      if (!record || typeof record !== 'object') return false;
      const typedRecord = record as Partial<HistoryEvent>;
      return typeof typedRecord.type === 'string' && typeof typedRecord.value === 'number' && typeof typedRecord.date === 'string';
    })
    .slice(-MAX_HISTORY_ITEMS);
};

const buildUserProfilePayload = (user: User): Record<string, unknown> => ({
  nickname: user.nickname,
  email: user.email,
  avatarUrl: user.avatarUrl,
  country: user.country,
  agreedToTerms: user.agreedToTerms,
  applixirUserId: user.applixirUserId,
  gameHistory: sanitizeHistory(user.gameHistory),
});

const buildInitialUserPayload = (user: User): Record<string, unknown> => ({
  ...buildUserProfilePayload(user),
  hearts: user.hearts,
  bestTime: user.bestTime,
  role: user.role,
  lastDailyHeart: user.lastDailyHeart,
  banned: user.banned,
  referralCode: user.referralCode,
  referredBy: user.referredBy,
  referralRewardGranted: user.referralRewardGranted,
  rewardedVideoStreak: user.rewardedVideoStreak,
});

const syncUserIntoEntry = (entry: LeaderboardEntry, user: User): LeaderboardEntry => {
  if (entry.id !== user.id) return entry;
  return {
    ...entry,
    nickname: user.nickname,
    country: user.country,
    avatarUrl: user.avatarUrl,
    hearts: user.hearts,
    banned: user.banned,
    ...(typeof user.bestTime === 'number' ? { time: user.bestTime } : {}),
  };
};

const syncUserCollections = (state: Pick<AppState, 'leaderboard' | 'league'>, user: User) => {
  const leaderboard = state.leaderboard.map((entry) => syncUserIntoEntry(entry, user));
  const league = state.league
    ? {
      ...state.league,
      entries: state.league.entries.map((entry) => syncUserIntoEntry(entry, user)),
    }
    : null;

  return { leaderboard, league };
};

const commitUserState = (
  state: Pick<AppState, 'leaderboard' | 'league' | 'videoWatchCount'>,
  user: User,
) => {
  const syncedCollections = syncUserCollections(state, user);
  safeStorage.set('stanbeat_user', user);
  safeStorage.set('stanbeat_leaderboard', syncedCollections.leaderboard);
  safeStorage.set('stanbeat_user_streak', user.rewardedVideoStreak);
  if (syncedCollections.league) {
    safeStorage.set('stanbeat_league', syncedCollections.league);
  }

  return {
    currentUser: user,
    leaderboard: syncedCollections.leaderboard,
    league: syncedCollections.league,
    videoWatchCount: user.rewardedVideoStreak,
  } as const;
};

const persistUserProfileRemote = async (user: User, useBootstrapPayload: boolean = false): Promise<void> => {
  if (!isFirebaseEnabled || !user.id) return;
  await saveUserProfile(user.id, useBootstrapPayload ? buildInitialUserPayload(user) : buildUserProfilePayload(user));
};

const applyServerSnapshotToUser = (user: User, snapshot: ServerUserSnapshot): User => ({
  ...user,
  hearts: snapshot.hearts,
  bestTime: snapshot.bestTime,
  lastDailyHeart: snapshot.lastDailyHeart,
  nextFreeHeartAt: snapshot.nextFreeHeartAt,
  gameHistory: sanitizeHistory(snapshot.gameHistory),
  rewardedVideoStreak: snapshot.rewardedVideoStreak,
  referralRewardGranted: snapshot.referralRewardGranted,
});

const getNextFreeHeartAt = (lastFreeHeart: string | null): string | null => {
  if (!lastFreeHeart) return null;
  const lastMs = Date.parse(lastFreeHeart);
  if (!Number.isFinite(lastMs)) return null;
  return new Date(lastMs + FREE_HEART_INTERVAL_MS).toISOString();
};

const getRewardedAdFailureMessage = (lang: LanguageCode, result: 'skipped' | 'error' | 'noAds' | 'configMissing' | 'invalidConfig') => {
  if (lang === 'ko') {
    if (result === 'noAds') return '지금은 표시할 광고가 없습니다. 잠시 후 다시 시도해 주세요.';
    if (result === 'skipped') return '광고가 끝나기 전에 닫혔습니다.';
    if (result === 'configMissing') return 'AppLixir API 키가 설정되지 않았습니다. .env에 VITE_APPLIXIR_API_KEY를 추가해 주세요.';
    if (result === 'invalidConfig') return '설정된 AppLixir API 키로 광고를 불러오지 못했습니다. AppLixir 대시보드의 실제 Game API Key인지 확인해 주세요.';
    return '광고를 불러오지 못했습니다. 광고 차단, 쿠키 차단, 팝업 차단 설정을 확인해 주세요.';
  }

  if (result === 'noAds') return 'No ads are available right now. Please try again later.';
  if (result === 'skipped') return 'The ad was closed before completion.';
  if (result === 'configMissing') return 'AppLixir is not configured. Add VITE_APPLIXIR_API_KEY to your .env file.';
  if (result === 'invalidConfig') return 'The configured AppLixir API key could not load VAST data. Verify that it is your real Game API key from the AppLixir dashboard.';
  return 'Failed to load the ad. Check ad blocker, cookie, and popup settings.';
};

const getRewardValidationMessage = (lang: LanguageCode, reason: 'prepareFailed' | 'timeout') => {
  if (lang === 'ko') {
    if (reason === 'prepareFailed') {
      return '광고 보상 검증 세션을 만들지 못했습니다. Firebase Functions와 AppLixir 콜백 설정을 확인해 주세요.';
    }
    return '광고는 완료되었지만 AppLixir 서버 콜백 보상이 아직 도착하지 않았습니다. AppLixir 대시보드 Callback URL이 Firebase applixirCallback 함수로 설정되어 있는지 확인해 주세요.';
  }

  if (reason === 'prepareFailed') {
    return 'Failed to create the AppLixir reward validation session. Check Firebase Functions and your AppLixir callback configuration.';
  }
  return 'The ad completed, but the AppLixir server callback reward has not arrived yet. Verify that your AppLixir dashboard callback URL points to the Firebase applixirCallback function.';
};

const getResultSyncFailureMessage = (lang: LanguageCode) => {
  if (lang === 'ko') {
    return '기록을 서버에 저장하지 못했습니다. 다시 시도해 주세요.';
  }
  return 'We could not save your result to the server. Please try again.';
};

const getGameStartFailureMessage = (lang: LanguageCode) => {
  if (lang === 'ko') {
    return '게임을 시작하지 못했습니다. 이미 로그인되어 있다면 페이지를 새로고침한 뒤 다시 시도해 주세요. 계속 실패하면 Firebase Functions 배포와 CORS 설정을 확인해야 합니다.';
  }
  return 'Could not start the game. If you are already signed in, refresh the page and try again. If it keeps failing, check Firebase Functions deployment and CORS settings.';
};

const todayUtc = () => new Date().toISOString().slice(0, 10);
const getCanonicalDevAuthUrl = (): string | null => {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;

  const { protocol, hostname, port, pathname, search, hash } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isLoopbackAlias = hostname === '0.0.0.0';
  const isPrivateIpv4 =
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);

  if (isLocalhost || (!isLoopbackAlias && !isPrivateIpv4)) {
    return null;
  }

  return `${protocol}//localhost${port ? `:${port}` : ''}${pathname}${search}${hash}`;
};

// 로컬 스토리지에 데이터를 안전하게 읽고 쓰기 위한 유틸리티 객체
const safeStorage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch (e) {
      // 파싱 에러는 반드시 로깅하여 손상된 데이터를 추적 가능하도록 함
      console.error(`[safeStorage] Failed to parse key "${key}":`, e);
      return fallback;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[safeStorage] Failed to set key "${key}":`, e);
    }
  },
};

const detectLocaleHints = (): { countryCode: string | null; language: LanguageCode | null } => {
  if (typeof navigator === 'undefined') {
    return { countryCode: null, language: null };
  }

  const localeCandidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const locale of localeCandidates) {
    const [languagePartRaw, regionPartRaw] = locale.split('-');
    const languagePart = languagePartRaw?.toLowerCase() ?? '';
    const regionPart = regionPartRaw?.toUpperCase() ?? null;

    const languageMap: Record<string, LanguageCode> = {
      ko: 'ko',
      en: 'en',
      ja: 'ja',
      zh: regionPart === 'TW' || regionPart === 'HK' ? 'zh-TW' : 'zh-CN',
      id: 'id',
      th: 'th',
      vi: 'vi',
      es: 'es',
      pt: 'pt-BR',
      tl: 'fil',
      fil: 'fil',
      ru: 'ru',
      fr: 'fr',
      de: 'de',
      tr: 'tr',
      ar: 'ar',
      ms: 'ms',
      hi: 'hi',
      it: 'it',
      pl: 'pl',
    };

    const language = languageMap[languagePart] ?? null;
    if (language || regionPart) {
      return { countryCode: regionPart, language };
    }
  }

  return { countryCode: null, language: null };
};

const shouldAttemptIpLookup = (): boolean => {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  return protocol === 'https:' && !isLocalhost;
};

const fetchIpGeoInfo = async (): Promise<{ countryCode: string | null; language: LanguageCode | null }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return { countryCode: null, language: null };
    const data = await res.json();
    const countryCode = String(data.country_code ?? '').trim().toUpperCase();
    const map: Record<string, LanguageCode> = {
      KR: 'ko', JP: 'ja', CN: 'zh-CN', TH: 'th', ID: 'id',
      VN: 'vi', PH: 'en', US: 'en', GB: 'en', AU: 'en',
      FR: 'fr', DE: 'de', ES: 'es', BR: 'pt-BR', IN: 'hi',
      TR: 'tr', AR: 'ar', SA: 'ar',
    };
    return { countryCode: countryCode || null, language: map[countryCode] ?? null };
  } catch (error) {
    console.warn('[LanguageDetector] IP lookup failed, falling back to browser locale:', error);
    return { countryCode: null, language: null };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const detectLanguageFromIP = async (): Promise<LanguageCode | null> => {
  if (safeStorage.get<boolean>('stanbeat_manual_lang', false)) {
    return null;
  }
  const localeHints = detectLocaleHints();
  if (localeHints.language) {
    return localeHints.language;
  }
  if (!shouldAttemptIpLookup()) {
    return null;
  }
  const { language } = await fetchIpGeoInfo();
  return language;
};

const detectCountryFromIP = async (): Promise<string | null> => {
  const localeHints = detectLocaleHints();
  if (localeHints.countryCode) {
    return localeHints.countryCode;
  }
  if (!shouldAttemptIpLookup()) {
    return null;
  }
  const { countryCode } = await fetchIpGeoInfo();
  return countryCode;
};

const generateNickname = () => {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = favorites[Math.floor(Math.random() * favorites.length)];
  const n = Math.floor(Math.random() * 10000).toString().padStart(2, '0');
  return `${a}${b}_${n}`;
};

const generateReferralCode = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => (b % 36).toString(36)).join('').slice(0, 8);
  }
  const randomPart = Math.random().toString(36).slice(2);
  return randomPart.padEnd(8, 'x').slice(0, 8);
};

const buildUserFromAuth = async (
  fbUser: FirebaseUser,
  referralCode: string | null,
): Promise<{ user: User; useBootstrapPayload: boolean }> => {
  const newNickname = generateNickname();
  const initialCountry = (await detectCountryFromIP()) || 'KR';
  const existingUser = safeStorage.get<User | null>('stanbeat_user', null);
  const [fbProfile, leaderboardEntry] = await Promise.all([
    getUserProfile(fbUser.uid),
    getLeaderboardEntry(fbUser.uid).catch(() => null),
  ]);

  const user: User = {
    id: fbUser.uid,
    nickname: newNickname,
    avatarUrl: generateAvatarUrl(fbUser.uid, newNickname),
    email: fbUser.email || '',
    hearts: 1,
    bestTime: null,
    country: initialCountry,
    role: 'USER',
    lastDailyHeart: null,
    agreedToTerms: false,
    banned: false,
    gameHistory: [],
    referralCode: generateReferralCode(),
    referredBy: referralCode,
    referralRewardGranted: false,
    rewardedVideoStreak: 0,
    applixirUserId: resolveApplixirUserId(),
    nextFreeHeartAt: null,
  };

  const mergedProfile = fbProfile ?? {};
  user.applixirUserId = resolveApplixirUserId(mergedProfile.applixirUserId, existingUser?.applixirUserId, user.applixirUserId);
  user.nickname = String(mergedProfile.nickname ?? user.nickname);
  user.avatarUrl = String(mergedProfile.avatarUrl ?? user.avatarUrl);
  user.country = String(mergedProfile.country ?? user.country);
  if (mergedProfile.hearts !== undefined) user.hearts = Math.max(0, Number(mergedProfile.hearts));
  if (mergedProfile.bestTime !== undefined) user.bestTime = Number(mergedProfile.bestTime) || null;
  if (leaderboardEntry?.time !== undefined) user.bestTime = Number(leaderboardEntry.time) || user.bestTime;
  user.gameHistory = sanitizeHistory(mergedProfile.gameHistory ?? existingUser?.gameHistory ?? []);
  if (mergedProfile.agreedToTerms !== undefined) user.agreedToTerms = Boolean(mergedProfile.agreedToTerms);
  if (mergedProfile.referralCode) user.referralCode = String(mergedProfile.referralCode);
  if (mergedProfile.referredBy) user.referredBy = String(mergedProfile.referredBy);
  user.referralRewardGranted = Boolean(mergedProfile.referralRewardGranted ?? existingUser?.referralRewardGranted ?? user.referralRewardGranted);
  user.rewardedVideoStreak = Math.max(0, Number(mergedProfile.rewardedVideoStreak ?? existingUser?.rewardedVideoStreak ?? user.rewardedVideoStreak));
  if (mergedProfile.lastDailyHeart) user.lastDailyHeart = String(mergedProfile.lastDailyHeart);
  user.nextFreeHeartAt = getNextFreeHeartAt(user.lastDailyHeart);
  if (mergedProfile.role) user.role = mergedProfile.role as 'USER' | 'ADMIN';
  if (mergedProfile.banned !== undefined) user.banned = Boolean(mergedProfile.banned);

  if (!fbProfile && existingUser && existingUser.id === user.id) {
    user.hearts = existingUser.hearts;
    user.bestTime = existingUser.bestTime;
    user.gameHistory = sanitizeHistory(existingUser.gameHistory);
    user.agreedToTerms = existingUser.agreedToTerms;
    user.referralCode = existingUser.referralCode;
    user.referredBy = existingUser.referredBy;
    user.referralRewardGranted = Boolean(existingUser.referralRewardGranted);
    user.rewardedVideoStreak = Math.max(0, Number(existingUser.rewardedVideoStreak ?? 0));
    user.applixirUserId = resolveApplixirUserId(existingUser.applixirUserId, user.applixirUserId);
    user.lastDailyHeart = existingUser.lastDailyHeart;
    user.nextFreeHeartAt = existingUser.nextFreeHeartAt ?? getNextFreeHeartAt(user.lastDailyHeart);
    user.banned = existingUser.banned;
  }

  return {
    user,
    useBootstrapPayload: !fbProfile,
  };
};

// NOTE: normalizeHearts(expiresAt - 3hr timer) has been REMOVED.
// Hearts are no longer time-based. They regenerate only on 24h site visits via claimDailyHeart.
// The mockLeaderboardBase has also been REMOVED. The leaderboard always starts empty and
// is filled dynamically via the league system (60-99 synthetic bots per league).

// Dynamic ticker generator - random league-winner announcements
const TICKER_NICKNAMES = [
  'ShinyCookie', 'GoldenWave', 'HallyuSunrise', 'TaeBeat', 'IdolStar',
  'CosmicStage', 'MoonChild', 'DynamiteQueen', 'ButterGroove', 'PurpleHeart',
  'SeoulLover', 'KPopFire', 'RhythmWise', 'FandomForever', 'FanPower',
  'SpringDay', 'MikrokosmosFan', 'KCultureSoul', 'DaydreamFan', 'EuphoriaGirl',
];
// Dynamic ticker nickname generator for broad K-pop/K-culture fandom flavor.
const generateTickerNickname = () => {
  const name = TICKER_NICKNAMES[Math.floor(Math.random() * TICKER_NICKNAMES.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${name}_${num}`;
};
const generateTickerTime = (config: RandConfig) => (
  config.tickerTimeMin + Math.random() * (config.tickerTimeMax - config.tickerTimeMin)
).toFixed(1);
const generateTickerLeagueName = () => generateDisplayLeagueName(`${Date.now()}-${Math.random()}`);

const generateDynamicFeed = (config: RandConfig, language: LanguageCode, notice: string): ActivityItem[] => {
  const items: ActivityItem[] = [];
  for (let i = 0; i < config.feedBatchSize; i++) {
    const nick = generateTickerNickname();
    const time = generateTickerTime(config);
    const league = generateTickerLeagueName();
    items.push({
      id: `dyn-${Date.now()}-${i}`,
      message: t(language, 'tickerLeague', { league, name: nick, time }),
      level: 'live',
    });
  }
  items.push({
    id: `evt-${Date.now()}`,
    message: t(language, 'tickerEvent'),
    level: 'event',
  });
  if (notice.trim()) {
    items.push({
      id: `notice-${Date.now()}`,
      message: `${t(language, 'tickerNoticePrefix')} ${notice.trim()}`,
      level: 'alert',
    });
  }
  return items;
};

const savedLang = safeStorage.get<LanguageCode>('stanbeat_lang', 'en');
const savedNotice = safeStorage.get<string>('stanbeat_notice', '');
const savedUser = safeStorage.get<User | null>('stanbeat_user', null);
const savedLeague = savedUser ? safeStorage.get<LeagueData | null>('stanbeat_league', null) : null;
const savedShowNotice = safeStorage.get<boolean>('stanbeat_show_notice', false);
const savedAdConfig = safeStorage.get<AdConfig>('stanbeat_ad_config', DEFAULT_AD_CONFIG);
const rawSavedBotConfig = safeStorage.get<BotConfig>(BOT_CONFIG_STORAGE_KEY, { mean: 50000, stdDev: 15000 });
const savedRandConfig = normalizeRandConfig({
  ...safeStorage.get<RandConfig>(RAND_CONFIG_STORAGE_KEY, DEFAULT_RAND_CONFIG),
  botTimeMean: rawSavedBotConfig.mean,
  botTimeStdDev: rawSavedBotConfig.stdDev,
});
const savedBotConfig = deriveBotConfigFromRand(savedRandConfig);
const defaultFeed: ActivityItem[] = generateDynamicFeed(savedRandConfig, savedLang, savedNotice);

export const useStore = create<AppState>((set, get) => ({
  currentUser: savedUser ? {
    ...savedUser,
    gameHistory: Array.isArray(savedUser.gameHistory) ? savedUser.gameHistory.slice(-100) : [],
    referralRewardGranted: Boolean(savedUser.referralRewardGranted),
    rewardedVideoStreak: Math.max(0, Number(savedUser.rewardedVideoStreak ?? 0)),
    applixirUserId: resolveApplixirUserId(savedUser.applixirUserId),
    nextFreeHeartAt: savedUser.nextFreeHeartAt ?? getNextFreeHeartAt(savedUser.lastDailyHeart),
  } : null,
  currentView: 'HOME',
  activeFandomId: readStoredFandomId(),
  isGameFinished: false,
  gameSessionActive: false,
  gameRunStartedAt: null,
  gameExitRequested: false,
  isMenuOpen: false,
  loginPromptRequested: false,
  termsPromptRequested: false,
  leaderboard: savedLeague?.entries ?? [],
  language: savedLang,
  notice: savedNotice,
  showNoticePopup: savedShowNotice,
  rewardMessage: null,
  alertDialog: null,
  confirmDialog: null,
  showBrowserBlocker: false,
  deferredPrompt: null,
  termsAccepted: savedUser?.agreedToTerms ?? false,
  seasonEndsAt: safeStorage.get<number>('stanbeat_season_ends', Date.now() + getMsUntilNextUtcMidnight()),
  heartsUsedToday: safeStorage.get<number>('stanbeat_hearts_used', 0),
  adRevenue: safeStorage.get<number>('stanbeat_ad_revenue', 0),
  activityFeed: defaultFeed,
  adConfig: savedAdConfig,
  videoWatchCount: savedUser ? Math.max(0, Number(savedUser.rewardedVideoStreak ?? 0)) : safeStorage.get<number>('stanbeat_user_streak', 0),
  league: savedLeague,
  adminUsers: [],
  adminStats: { totalHeartsUsed: 0, adRevenue: 0 },
  adminLoading: false,
  adminShowAll: false,
  adminLog: [],
  adminStatsUnsubscribe: null,
  botConfig: savedBotConfig,
  randConfig: savedRandConfig,

  setView: (view) => {
    if (view !== get().currentView) {
      window.history.pushState({ view }, '', `${window.location.pathname}${window.location.search}${window.location.hash}`);
      set({
        currentView: view,
        ...(view !== 'GAME' ? { gameSessionActive: false, gameRunStartedAt: null } : {}),
      });
    }
  },
  setActiveFandom: (id) => {
    const activeFandomId = resolveFandomId(id);
    persistFandomId(activeFandomId);
    set({ activeFandomId });
  },
  setGameFinished: (value) => set({
    isGameFinished: value,
    ...(value ? { gameSessionActive: false, gameRunStartedAt: null } : {}),
  }),
  markGameSessionCancelled: (elapsedMs) => {
    const state = get();
    if (!state.gameSessionActive || state.isGameFinished) return;
    state.addHistoryEvent('CANCELLED', Math.max(0, Math.round(elapsedMs ?? (Date.now() - (state.gameRunStartedAt ?? Date.now())))));
    set({ gameSessionActive: false, gameRunStartedAt: null, isGameFinished: false });
  },
  requestGameExit: () => set({ gameExitRequested: true }),
  clearGameExitRequest: () => set({ gameExitRequested: false }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  setLanguage: (language) => {
    safeStorage.set('stanbeat_lang', language);
    safeStorage.set('stanbeat_manual_lang', true);
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
    set({
      language,
      activityFeed: generateDynamicFeed(get().randConfig, language, get().notice),
    });
  },
  setNotice: (notice) => {
    safeStorage.set('stanbeat_notice', notice);
    set({
      notice,
      activityFeed: generateDynamicFeed(get().randConfig, get().language, notice),
    });
  },
  setShowNoticePopup: (value) => {
    safeStorage.set('stanbeat_show_notice', value);
    set({ showNoticePopup: value });
  },
  showRewardToast: (msg: string | null) => {
    if (rewardToastTimeout) {
      clearTimeout(rewardToastTimeout);
      rewardToastTimeout = null;
    }
    set({ rewardMessage: msg });
    if (msg) {
      rewardToastTimeout = setTimeout(() => {
        set({ rewardMessage: null });
        rewardToastTimeout = null;
      }, 3000);
    }
  },
  showAlertDialog: (dialog) => set({ alertDialog: dialog }),
  showConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  setShowBrowserBlocker: (value) => set({ showBrowserBlocker: value }),
  setDeferredPrompt: (value) => set({ deferredPrompt: value }),
  requestLoginPrompt: () => set({ loginPromptRequested: true, currentView: 'HOME' }),
  requestTermsPrompt: () => set({ termsPromptRequested: true, currentView: 'HOME' }),
  clearActionPrompts: () => set({ loginPromptRequested: false, termsPromptRequested: false }),
  acceptTerms: () => {
    const user = get().currentUser;
    if (!user) return;
    const nextUser = { ...user, agreedToTerms: true };
    safeStorage.set('stanbeat_user', nextUser);
    set({ currentUser: nextUser, termsAccepted: true, termsPromptRequested: false });
    if (isFirebaseEnabled) {
      saveUserProfile(nextUser.id, { agreedToTerms: true }).catch((error) => {
        console.error('[acceptTerms] Failed to persist terms acceptance:', error);
      });
    }
  },

  setBotConfig: (config) => {
    const nextRandConfig = normalizeRandConfig({
      ...get().randConfig,
      botTimeMean: config.mean,
      botTimeStdDev: config.stdDev,
    });
    const nextBotConfig = deriveBotConfigFromRand(nextRandConfig);
    safeStorage.set(BOT_CONFIG_STORAGE_KEY, nextBotConfig);
    safeStorage.set(RAND_CONFIG_STORAGE_KEY, nextRandConfig);
    set({
      botConfig: nextBotConfig,
      randConfig: nextRandConfig,
      activityFeed: generateDynamicFeed(nextRandConfig, get().language, get().notice),
    });
    if (isFirebaseEnabled) {
      saveBotConfig(nextBotConfig.mean, nextBotConfig.stdDev).catch(console.error);
      saveRandConfig({ ...nextRandConfig }).catch(console.error);
    }
    const user = get().currentUser;
    if (user?.bestTime) {
      get().refreshLeague();
    } else {
      if (user) {
        safeStorage.set('stanbeat_league', null);
        set({ league: null });
      }
      void get().fetchLeaderboard();
    }
  },

  setRandConfig: (partial) => {
    const nextRandConfig = normalizeRandConfig({ ...get().randConfig, ...partial });
    const nextBotConfig = deriveBotConfigFromRand(nextRandConfig);
    safeStorage.set(RAND_CONFIG_STORAGE_KEY, nextRandConfig);
    safeStorage.set(BOT_CONFIG_STORAGE_KEY, nextBotConfig);
    set({
      randConfig: nextRandConfig,
      botConfig: nextBotConfig,
      activityFeed: generateDynamicFeed(nextRandConfig, get().language, get().notice),
    });
    if (isFirebaseEnabled) {
      saveBotConfig(nextBotConfig.mean, nextBotConfig.stdDev).catch(console.error);
      saveRandConfig({ ...nextRandConfig }).catch(console.error);
    }
    const user = get().currentUser;
    if (user?.bestTime) {
      get().refreshLeague();
    } else {
      if (user) {
        safeStorage.set('stanbeat_league', null);
        set({ league: null });
      }
      void get().fetchLeaderboard();
    }
  },

  hydrateOperationalState: async () => {
    get().syncSeasonClock();
    const currentRandConfig = normalizeRandConfig(get().randConfig);
    let nextRandConfig = currentRandConfig;
    let nextAdConfig = get().adConfig;

    if (isFirebaseEnabled) {
      try {
        const [remoteRandConfig, remoteBotConfig, remoteAdConfig] = await Promise.all([
          getRandConfig(),
          getBotConfig(),
          getRemoteAdConfig(),
        ]);

        if (remoteRandConfig) {
          nextRandConfig = normalizeRandConfig({ ...nextRandConfig, ...remoteRandConfig });
        }
        if (remoteBotConfig) {
          nextRandConfig = normalizeRandConfig({
            ...nextRandConfig,
            botTimeMean: remoteBotConfig.mean,
            botTimeStdDev: remoteBotConfig.stdDev,
          });
        }
        if (remoteAdConfig) {
          nextAdConfig = { ...nextAdConfig, ...remoteAdConfig } as AdConfig;
        }
      } catch (error) {
        console.warn('[hydrateOperationalState] Falling back to local operational config:', error);
      }
    }

    const nextBotConfig = deriveBotConfigFromRand(nextRandConfig);
    safeStorage.set(RAND_CONFIG_STORAGE_KEY, nextRandConfig);
    safeStorage.set(BOT_CONFIG_STORAGE_KEY, nextBotConfig);
    safeStorage.set('stanbeat_ad_config', nextAdConfig);
    set({
      randConfig: nextRandConfig,
      botConfig: nextBotConfig,
      adConfig: nextAdConfig,
      activityFeed: generateDynamicFeed(nextRandConfig, get().language, get().notice),
    });

    const user = get().currentUser;
    if (user?.bestTime) {
      const configChanged = JSON.stringify(currentRandConfig) !== JSON.stringify(nextRandConfig);
      if (configChanged) {
        get().refreshLeague();
      } else {
        get().initLeague();
      }
    } else {
      if (user) {
        safeStorage.set('stanbeat_league', null);
        set({ league: null });
      }
      void get().fetchLeaderboard();
    }
  },

  refreshActivityFeed: () => {
    const { randConfig, language, notice } = get();
    set({ activityFeed: generateDynamicFeed(randConfig, language, notice) });
  },

  syncSeasonClock: () => {
    const now = Date.now();
    const currentUtcDay = todayUtc();
    const storedUtcDay = safeStorage.get<string>(UTC_DAY_STORAGE_KEY, currentUtcDay);
    const currentSeasonEndsAt = get().seasonEndsAt;
    const needsReset = storedUtcDay !== currentUtcDay || currentSeasonEndsAt <= now;
    const nextSeasonEndsAt = now + getMsUntilNextUtcMidnight();

    if (!needsReset) {
      if (Math.abs(currentSeasonEndsAt - nextSeasonEndsAt) > 1000) {
        safeStorage.set('stanbeat_season_ends', nextSeasonEndsAt);
        set({ seasonEndsAt: nextSeasonEndsAt });
      }
      return;
    }

    safeStorage.set(UTC_DAY_STORAGE_KEY, currentUtcDay);
    safeStorage.set('stanbeat_season_ends', nextSeasonEndsAt);
    safeStorage.set('stanbeat_hearts_used', 0);
    safeStorage.set('stanbeat_league', null);
    set({
      seasonEndsAt: nextSeasonEndsAt,
      heartsUsedToday: 0,
      league: null,
    });

    const user = get().currentUser;
    if (user?.bestTime) {
      get().refreshLeague();
    } else {
      void get().fetchLeaderboard();
    }
  },

  // ─── 인증 (Auth) 로직 ─────────────────────────────────────────────────────
  // 구글 로그인을 처리하고 유저 데이터를 초기화하거나 기존 데이터를 불러오는 함수
  login: async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const canonicalDevAuthUrl = getCanonicalDevAuthUrl();

    if (canonicalDevAuthUrl) {
      console.warn(`[Auth] Redirecting dev login flow to canonical localhost origin: ${canonicalDevAuthUrl}`);
      window.location.replace(canonicalDevAuthUrl);
      return false;
    }

    if (!isFirebaseEnabled) {
      get().showAlertDialog({
        title: t(get().language, 'loginRequired'),
        message: t(get().language, 'loginFailed'),
        tone: 'error',
      });
      return false;
    }

    try {
      const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
      const isEmbeddedBrowser = /Instagram|FBAN|FBAV|Snapchat|Line|Kakao|Twitter|Threads|TikTok|Daum/i.test(userAgent);
      if (isEmbeddedBrowser) {
        set({ showBrowserBlocker: true });
        return false;
      }

      const fbUser = await firebaseSignInWithGoogle();
      if (!fbUser) throw new Error('Google sign-in returned no user');
      const { user, useBootstrapPayload } = await buildUserFromAuth(fbUser, refCode);

      safeStorage.set('stanbeat_user', user);
      safeStorage.set('stanbeat_user_streak', user.rewardedVideoStreak);
      set({ currentUser: user, termsAccepted: user.agreedToTerms, loginPromptRequested: false, termsPromptRequested: false, videoWatchCount: user.rewardedVideoStreak });

      await persistUserProfileRemote(user, useBootstrapPayload);

      if (user.hearts < MAX_HEARTS) {
        get().claimDailyHeart()
          .then((status) => {
            if (status === 'claimed') {
              get().showRewardToast(t(get().language, 'loginHeartClaimed'));
            }
          })
          .catch((error) => console.error('[login] Failed to claim login heart:', error));
      }

      if (user.banned) {
        get().showAlertDialog({
          title: t(get().language, 'adminTitle'),
          message: t(get().language, 'accountSuspended'),
          tone: 'warning',
        });
        return false;
      }

      return true;
    } catch (error: unknown) {
      console.error('Google login failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
      const ua = navigator.userAgent || '';
      const isInAppBrowser = /FBAN|FBAV|Instagram|KAKAOTALK|NAVER|Line\/|Twitter|Snapchat|TikTok|Daum|SamsungBrowser\/.*CrossApp/i.test(ua);

      if (message.includes('disallowed_useragent') || isInAppBrowser) {
        set({ showBrowserBlocker: true });
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.log('[Auth] Login cancelled by user.');
      } else if (code === 'auth/unauthorized-domain') {
        console.error(`[Auth] Unauthorized domain for Google login: ${window.location.origin}`);
        console.error('[Auth] This domain is not authorized in Firebase. Add it at: Firebase Console > Authentication > Settings > Authorized domains');
        get().showAlertDialog({
          title: t(get().language, 'loginRequired'),
          message: t(get().language, 'unauthorizedDomain'),
          tone: 'error',
        });
      } else {
        get().showAlertDialog({
          title: t(get().language, 'loginRequired'),
          message: t(get().language, 'loginFailed'),
          tone: 'error',
        });
      }
      return false;
    }
  },

  restoreSessionFromAuth: async (authUser) => {
    if (!isFirebaseEnabled) return;

    try {
      const { user, useBootstrapPayload } = await buildUserFromAuth(authUser, null);
      const committed = commitUserState(get(), user);
      set({
        ...committed,
        termsAccepted: user.agreedToTerms,
        loginPromptRequested: false,
        termsPromptRequested: false,
      });
      await persistUserProfileRemote(user, useBootstrapPayload);
      if (user.hearts < MAX_HEARTS) {
        get().claimDailyHeart()
          .then((status) => {
            if (status === 'claimed') {
              get().showRewardToast(t(get().language, 'loginHeartClaimed'));
            }
          })
          .catch((error) => console.error('[restoreSessionFromAuth] Failed to claim login heart:', error));
      }
      get().initLeague();
    } catch (error) {
      console.error('[restoreSessionFromAuth] Failed to restore authenticated session:', error);
    }
  },

  logout: () => {
    if (isFirebaseEnabled) {
      firebaseSignOut().catch(console.error);
    }
    const unsub = get().adminStatsUnsubscribe;
    if (unsub) { unsub(); }
    if (rewardToastTimeout) {
      clearTimeout(rewardToastTimeout);
      rewardToastTimeout = null;
    }
    safeStorage.set('stanbeat_user', null);
    safeStorage.set('stanbeat_league', null);
    safeStorage.set('stanbeat_leaderboard', []);
    safeStorage.set('stanbeat_user_streak', 0);
    set({
      currentUser: null,
      currentView: 'HOME',
      gameSessionActive: false,
      gameRunStartedAt: null,
      isGameFinished: false,
      termsAccepted: false,
      videoWatchCount: 0,
      adminStatsUnsubscribe: null,
      rewardMessage: null,
      alertDialog: null,
      confirmDialog: null,
      league: null,
      leaderboard: [],
      adminUsers: [],
      loginPromptRequested: false,
      termsPromptRequested: false,
    });
  },

  startGame: async () => {
    const user = get().currentUser;
    const testApi = getStanbeatTestApi();
    if (!user) {
      set({ currentView: 'HOME', loginPromptRequested: true, termsPromptRequested: false });
      return 'needs_login';
    }
    if (user.banned) {
      get().showAlertDialog({
        title: t(get().language, 'adminTitle'),
        message: t(get().language, 'accountSuspended'),
        tone: 'warning',
      });
      return 'blocked';
    }
    if (!user.agreedToTerms || !get().termsAccepted) {
      set({ currentView: 'HOME', loginPromptRequested: false, termsPromptRequested: true });
      return 'needs_terms';
    }
    if (!isFirebaseEnabled && !testApi?.functions?.consumeHeartForGame) {
      get().showAlertDialog({
        title: t(get().language, 'playNow'),
        message: getGameStartFailureMessage(get().language),
        tone: 'error',
      });
      return 'blocked';
    }

    try {
      const response = await consumeHeartForGameRemote();
      if (response.user) {
        const nextUser = applyServerSnapshotToUser(user, response.user);
        const committed = commitUserState(get(), nextUser);
        const nextHeartsUsed = response.status === 'consumed' ? get().heartsUsedToday + 1 : get().heartsUsedToday;
        if (response.status === 'consumed') {
          safeStorage.set('stanbeat_hearts_used', nextHeartsUsed);
        }
        set({
          ...committed,
          heartsUsedToday: nextHeartsUsed,
          loginPromptRequested: false,
          termsPromptRequested: false,
        });
      }

      if (response.status === 'consumed') {
        set({ gameSessionActive: true, gameRunStartedAt: Date.now(), isGameFinished: false });
        return 'started';
      }
      if (response.status === 'no_hearts') return 'needs_hearts';

      get().showAlertDialog({
        title: t(get().language, 'adminTitle'),
        message: t(get().language, 'accountSuspended'),
        tone: 'warning',
      });
      return 'blocked';
    } catch (error) {
      console.error('[startGame] Failed to consume heart:', error);
      get().showAlertDialog({
        title: t(get().language, 'playNow'),
        message: getGameStartFailureMessage(get().language),
        tone: 'error',
      });
      return 'blocked';
    }
  },

  claimDailyHeart: async () => {
    const user = get().currentUser;
    if (!user || user.banned) return 'already_claimed';
    try {
      const response = await claimDailyHeartRemote();
      if (response.user) {
        const nextUser = applyServerSnapshotToUser(user, response.user);
        const committed = commitUserState(get(), nextUser);
        set(committed);
      }
      if (response.status === 'claimed') return 'claimed';
      if (response.status === 'max_hearts') return 'max_hearts';
      return 'already_claimed';
    } catch (error) {
      console.error('[claimDailyHeart] Failed to claim daily reward:', error);
      throw new Error(t(get().language, 'serverTimeError'));
    }
  },

  recordCompletedPlay: async (time) => {
    if (time < 1000) {
      console.warn(`[Anti-Cheat] Rejected impossible time: ${time}ms`);
      return false;
    }

    const user = get().currentUser;
    if (!user || user.banned) return false;

    const maxAttempts = getStanbeatTestApi() ? 1 : 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await submitPlayResultRemote(time);
        if (response.status !== 'saved' || !response.user) {
          if (response.status === 'banned') {
            get().showAlertDialog({
              title: t(get().language, 'adminTitle'),
              message: t(get().language, 'accountSuspended'),
              tone: 'warning',
            });
          }
          return false;
        }

        const nextUser = applyServerSnapshotToUser(user, response.user);
        const committed = commitUserState(get(), nextUser);
        set(committed);

        if (response.isNewBest) {
          get().refreshLeague();
        } else {
          get().initLeague();
        }

        if (response.firstCompletedPlay && nextUser.referredBy && !nextUser.referralRewardGranted) {
          rewardReferrer(nextUser.referredBy, nextUser.id)
            .then((result) => {
              if (result !== 'granted' && result !== 'already_rewarded') return;
              const latestUser = get().currentUser;
              if (!latestUser || latestUser.id !== nextUser.id || latestUser.referralRewardGranted) return;
              const rewardedUser = { ...latestUser, referralRewardGranted: true };
              const rewardCommitted = commitUserState(get(), rewardedUser);
              set(rewardCommitted);
            })
            .catch((error) => {
              console.error('[recordCompletedPlay] Failed to reward referrer:', error);
            });
        }

        return true;
      } catch (error) {
        console.error(`[recordCompletedPlay] Failed to submit play result (attempt ${attempt + 1}/${maxAttempts}):`, error);
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
      }
    }

    get().showAlertDialog({
      title: t(get().language, 'save'),
      message: getResultSyncFailureMessage(get().language),
      tone: 'error',
    });
    return false;
  },

  addHistoryEvent: (type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY' | 'CANCELLED', value: number) => {
    const user = get().currentUser;
    if (!user) return;

    if (type === 'PLAY' || type === 'AD' || type === 'DAILY') {
      return;
    }

    const record: HistoryEvent = { type, value, date: new Date().toISOString() };
    const nextUser = { ...user, gameHistory: [...sanitizeHistory(user.gameHistory), record].slice(-MAX_HISTORY_ITEMS) };
    const committed = commitUserState(get(), nextUser);
    set(committed);
    persistUserProfileRemote(nextUser).catch((error) => {
      console.error('[addHistoryEvent] Firestore sync failed:', error);
    });
  },

  // ─── 리더보드 데이터 호출 및 리그 로딩 ─────────────────────────────
  fetchLeaderboard: async () => {
    const current = get().currentUser;
    if (current?.bestTime) {
      get().initLeague();
      const league = get().league;
      if (league) {
        set({ leaderboard: league.entries });
        return;
      }
    }

    if (current && !current.bestTime) {
      const existingLeague = get().league;
      if (!existingLeague || existingLeague.userBestAtGeneration !== null || !existingLeague.displayName) {
        const viewLeague = generateViewOnlyLeague(current.id, get().randConfig);
        safeStorage.set('stanbeat_league', viewLeague);
        set({ league: viewLeague, leaderboard: viewLeague.entries });
      } else {
        set({ leaderboard: existingLeague.entries });
      }
      return;
    }

    set({ leaderboard: [] });
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
      get().randConfig
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
    const league = refreshLeagueIfNeeded(
      currentLeague,
      user.bestTime,
      user.id,
      user.nickname,
      user.country,
      user.avatarUrl,
      get().randConfig
    );
    if (!league) return;
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
    if (!league) return '10:00';
    return getRefreshCountdown(league);
  },

  resetSeason: async () => {
    // Season reset: wipe all scores. Leaderboard starts empty and is filled
    // dynamically by the League system (60-99 synthetic bots per league).
    const newEndTime = Date.now() + getMsUntilNextUtcMidnight();
    safeStorage.set('stanbeat_leaderboard', []);
    safeStorage.set('stanbeat_league', null);

    if (isFirebaseEnabled) {
      await deleteAllScores();
    }
    safeStorage.set(UTC_DAY_STORAGE_KEY, todayUtc());
    safeStorage.set('stanbeat_season_ends', newEndTime);
    safeStorage.set('stanbeat_hearts_used', 0);
    set({
      seasonEndsAt: newEndTime,
      leaderboard: [],
      league: null,
      heartsUsedToday: 0,
    });
    // After reset, trigger a fresh league generation if user has a best time
    await get().fetchLeaderboard();
  },

  banUser: (id) => {
    if (isFirebaseEnabled) {
      banUserInFs(id);
    }
    const combined = get().leaderboard.map((entry) => (entry.id === id ? { ...entry, banned: true } : entry));
    const updatedAdminUsers = get().adminUsers.map(user =>
      user.id === id ? { ...user, banned: true } : user
    );
    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined, adminUsers: updatedAdminUsers });
    get().addAdminLog('BAN', id);
  },

  unbanUser: (id) => {
    if (isFirebaseEnabled) {
      unbanUserInFs(id);
    }
    const combined = get().leaderboard.map((entry) => (entry.id === id ? { ...entry, banned: false } : entry));
    const updatedAdminUsers = get().adminUsers.map(user =>
      user.id === id ? { ...user, banned: false } : user
    );
    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined, adminUsers: updatedAdminUsers });
    get().addAdminLog('UNBAN', id);
  },

  editUserHeart: (id, hearts, mode = 'SET') => {
    const currentAdminUser = get().adminUsers.find((entry) => entry.id === id);
    const currentLeaderboardUser = get().leaderboard.find((entry) => entry.id === id);
    const currentHearts = Number(currentAdminUser?.hearts ?? currentLeaderboardUser?.hearts ?? (get().currentUser?.id === id ? get().currentUser?.hearts : 0) ?? 0);
    const clampedHearts = Math.max(0, mode === 'DELTA' ? currentHearts + hearts : hearts);
    if (isFirebaseEnabled) {
      editUserHeartInFirestore(id, clampedHearts);
    }

    const user = get().currentUser;
    if (user && user.id === id) {
      const updatedUser = { ...user, hearts: clampedHearts };
      safeStorage.set('stanbeat_user', updatedUser);
      set({ currentUser: updatedUser });
    }

    const combined = get().leaderboard.map((entry) =>
      entry.id === id ? { ...entry, hearts: clampedHearts } : entry
    );

    const updatedAdminUsers = get().adminUsers.map(user =>
      user.id === id ? { ...user, hearts: clampedHearts } : user
    );

    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined, adminUsers: updatedAdminUsers });
    get().addAdminLog('HEART_EDIT', `${id} -> ${clampedHearts}`);
  },

  getReferralLink: () => {
    const user = get().currentUser;
    const baseUrl = getRuntimeSiteUrl();
    const fandomId = get().activeFandomId;
    if (!user) return buildFandomUrl(baseUrl, fandomId);
    return buildFandomUrl(baseUrl, fandomId, { ref: user.referralCode });
  },

  fetchAdminData: async () => {
    if (!isFirebaseEnabled) {
      set({ adminUsers: [], adminLoading: false });
      return;
    }
    set({ adminLoading: true });
    try {
      const stats = await getGlobalStats();
      const users = await getAdminGlobalUsers();

      set({
        adminStats: {
          totalHeartsUsed: Number(stats?.totalHeartsUsed || 0),
          adRevenue: Number(stats?.adRevenue || 0),
        },
        adminUsers: users as unknown as AdminUserRow[],
        adminLoading: false,
      });
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
      set({ adminLoading: false });
    }
  },

  startAdminLiveStats: () => {
    const existing = get().adminStatsUnsubscribe;
    if (existing) existing();
    const unsub = listenGlobalStats((stats) => {
      set({ adminStats: stats });
    });
    set({ adminStatsUnsubscribe: unsub });
  },

  stopAdminLiveStats: () => {
    const unsub = get().adminStatsUnsubscribe;
    if (unsub) { unsub(); set({ adminStatsUnsubscribe: null }); }
  },

  setAdminShowAll: (value) => set({ adminShowAll: value }),

  addAdminLog: (action, target) => {
    const entry = { action, target, time: new Date().toISOString() };
    set({ adminLog: [...get().adminLog, entry].slice(-50) });
  },

  // Ad system
  setAdConfig: (partial) => {
    const current = get().adConfig;
    const next = { ...current, ...partial };
    safeStorage.set('stanbeat_ad_config', next);
    set({ adConfig: next });
    if (isFirebaseEnabled && get().currentUser?.role === 'ADMIN') {
      saveRemoteAdConfig(next).catch((error) => {
        console.error('[setAdConfig] Failed to persist remote ad config:', error);
      });
    }
  },

  claimPendingAdReward: async (rewardId) => {
    const user = get().currentUser;
    if (!user || user.banned || !rewardId) {
      return { claimed: false, grantedHearts: 0 };
    }

    if (rewardId.startsWith('local_applixir_')) {
      const claimed = markLocalApplixirRewardClaimed(user.id, rewardId);
      if (!claimed) return { claimed: false, grantedHearts: 0 };

      const adConfig = get().adConfig;
      const nextStreakRaw = Math.max(0, Math.floor(Number(user.rewardedVideoStreak ?? 0))) + 1;
      const videosPerHeart = Math.max(1, Math.floor(Number(adConfig.videosPerHeart ?? 1)));
      const grantsReward = nextStreakRaw >= videosPerHeart;
      const nextStreak = grantsReward ? 0 : nextStreakRaw;
      const grantedHearts = grantsReward ? Math.max(1, Math.floor(Number(adConfig.rewardedVideoRewardHearts ?? 1))) : 0;
      const nextHearts = Math.min(MAX_HEARTS, user.hearts + grantedHearts);
      const actualGrantedHearts = Math.max(0, nextHearts - user.hearts);
      const nextUser = {
        ...user,
        hearts: nextHearts,
        rewardedVideoStreak: nextStreak,
        gameHistory: actualGrantedHearts > 0
          ? [...sanitizeHistory(user.gameHistory), { type: 'AD' as const, value: actualGrantedHearts, date: new Date().toISOString() }].slice(-MAX_HISTORY_ITEMS)
          : sanitizeHistory(user.gameHistory),
      };
      const committed = commitUserState(get(), nextUser);
      set(committed);
      return { claimed: true, grantedHearts: actualGrantedHearts };
    }

    try {
      const response = await claimAdRewardRemote(rewardId);
      if (response.user) {
        const nextUser = applyServerSnapshotToUser(user, response.user);
        const committed = commitUserState(get(), nextUser);
        set(committed);
      }
      return {
        claimed: response.status === 'claimed',
        grantedHearts: Math.max(0, Number(response.grantedHearts ?? 0)),
      };
    } catch (error) {
      console.error('[claimPendingAdReward] Failed to claim ad reward:', error);
      return { claimed: false, grantedHearts: 0 };
    }
  },

  watchRewardedAd: async (callbacks = {}) => {
    const config = get().adConfig;
    const testApi = getStanbeatTestApi();
    if (!config.rewardedVideo) return 'failed';
    if (!runtimeConfig.capabilities.rewardedVideo && !testApi?.rewardedVideo?.showRewardedVideo) {
      get().showRewardToast(getRewardedAdFailureMessage(get().language, 'configMissing'));
      return 'failed';
    }

    const user = get().currentUser;
    if (!user || user.banned) return 'failed';
    if (user.hearts >= MAX_HEARTS) {
      get().showRewardToast(t(get().language, 'maxHeartsReached'));
      return 'capped';
    }
    const userId = user.id;
    const rewardWindowStartedAt = Date.now();
    callbacks.onPhase?.('loading');

    // Actually show the AppLixir rewarded video
    // This opens the ad player in a popup. Must be called from a user gesture.
    let adResult: 'completed' | 'skipped' | 'error' | 'noAds' | 'configMissing' | 'invalidConfig';
    try {
      adResult = await applixirProvider.showRewardedVideo(user.applixirUserId, {
        onPlaybackStarted: () => callbacks.onPhase?.('watching'),
      });
    } catch (err) {
      console.error('[store] Applixir showRewardedVideo error:', err);
      return 'failed';
    }

    if (adResult !== 'completed') {
      console.warn(`[store] Rewarded video not completed: ${adResult}`);
      get().showRewardToast(getRewardedAdFailureMessage(get().language, adResult));
      return 'failed';
    }

    if (import.meta.env.DEV && !getStanbeatTestApi()) {
      recordLocalApplixirReward(user.id);
    }

    callbacks.onPhase?.('validating');
    pendingRewardedVideoWaitUserId = user.id;
    try {
      const rewardDoc = await waitForApplixirReward(user.id, rewardWindowStartedAt, 90000);
      if (!rewardDoc) {
        get().showRewardToast(getRewardValidationMessage(get().language, 'timeout'));
        return 'failed';
      }

      const rewardResult = await get().claimPendingAdReward(rewardDoc.id);
      if (rewardResult.claimed && rewardResult.grantedHearts === 0 && (get().currentUser?.hearts ?? 0) >= MAX_HEARTS) {
        return 'capped';
      }
      return rewardResult.grantedHearts > 0 ? 'rewarded' : 'progressed';
    } finally {
      if (pendingRewardedVideoWaitUserId === user.id) {
        pendingRewardedVideoWaitUserId = null;
      }
    }
  },
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { __STANBEAT_STORE__?: typeof useStore }).__STANBEAT_STORE__ = useStore;
}

if (typeof window !== 'undefined') {
  const urlFandomId = new URLSearchParams(window.location.search).get('fandom');
  const resolvedUrlFandomId = resolveFandomId(urlFandomId);
  if (urlFandomId && useStore.getState().activeFandomId !== resolvedUrlFandomId) {
    useStore.setState({ activeFandomId: resolvedUrlFandomId });
  }
}
