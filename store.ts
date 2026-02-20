import { create } from 'zustand';
import { ActivityItem, GameRecord, LeaderboardEntry, User, ViewState } from './types';
import { LanguageCode } from './i18n';
import { isFirebaseEnabled, firebaseSignInWithGoogle, firebaseSignOut, saveUserProfile, saveScore } from './firebase';
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

  setView: (view: ViewState) => void;
  toggleMenu: () => void;
  setLanguage: (lang: LanguageCode) => void;
  setNotice: (value: string) => void;
  setShowNoticePopup: (value: boolean) => void;
  acceptTerms: () => void;

  login: () => Promise<void>;
  logout: () => void;
  consumeHeart: () => boolean;
  addHeart: (amount: number) => void;
  claimDailyHeart: () => boolean;

  updateBestTime: (time: number) => void;
  addGameRecord: (time: number) => void;
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

const safeStorage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // no-op
    }
  },
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

const normalizeHearts = (user: User) => {
  if (!user.expiresAt) return user;
  if (Date.now() > user.expiresAt) {
    return { ...user, hearts: 0, expiresAt: null };
  }
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
const generateTickerNickname = () => {
  const name = TICKER_NICKNAMES[Math.floor(Math.random() * TICKER_NICKNAMES.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
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
const savedNotice = safeStorage.get<string>('stanbeat_notice', '당첨자 발표 지연 시 앱 공지로 안내됩니다.');
const savedLeaderboard = safeStorage.get<LeaderboardEntry[]>('stanbeat_leaderboard', mockLeaderboardBase);
const savedUser = safeStorage.get<User | null>('stanbeat_user', null);
const savedShowNotice = safeStorage.get<boolean>('stanbeat_show_notice', false);
const savedAdConfig = safeStorage.get<AdConfig>('stanbeat_ad_config', DEFAULT_AD_CONFIG);

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

  // ─── Auth ─────────────────────────────────────────────────────
  login: async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (isFirebaseEnabled) {
      // Real Firebase Google Login
      try {
        const fbUser = await firebaseSignInWithGoogle();
        if (!fbUser) throw new Error('Google sign-in returned no user');

        const user: User = {
          id: fbUser.uid,
          nickname: fbUser.displayName || generateNickname(),
          avatarUrl: fbUser.photoURL || `https://picsum.photos/seed/${AVATAR_SEED}${Date.now()}/100/100`,
          email: fbUser.email || '',
          hearts: 3,
          bestTime: null,
          country: 'KR',
          role: 'USER',
          expiresAt: Date.now() + THREE_HOURS,
          lastDailyHeart: null,
          agreedToTerms: false,
          banned: false,
          gameHistory: [],
          referralCode: generateReferralCode(),
          referredBy: refCode,
        };

        // Merge with existing saved user data (hearts, history, etc.)
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

        safeStorage.set('stanbeat_user', user);
        set({ currentUser: normalizeHearts(user), termsAccepted: user.agreedToTerms });

        // Save to Firestore asynchronously
        saveUserProfile(user.id, {
          nickname: user.nickname,
          email: user.email,
          avatarUrl: user.avatarUrl,
          country: user.country,
        }).catch(console.error);
      } catch (err) {
        console.error('[Firebase Auth Error]', err);
        throw err;
      }
    } else {
      // Mock login (for development without Firebase)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const user: User = {
            id: `user_${Math.floor(Math.random() * 99999)}`,
            nickname: generateNickname(),
            avatarUrl: `https://picsum.photos/seed/${AVATAR_SEED}${Math.floor(Math.random() * 9999)}/100/100`,
            email: 'army@example.com',
            hearts: 3,
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
    const normalized = normalizeHearts(user);
    if (normalized.hearts <= 0) {
      set({ currentUser: normalized });
      safeStorage.set('stanbeat_user', normalized);
      return false;
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
    const updatedUser = {
      ...normalized,
      hearts: Math.min(normalized.hearts + amount, 3),
      expiresAt: Date.now() + THREE_HOURS,
    };
    const newRevenue = get().adRevenue + 0.15;
    safeStorage.set('stanbeat_user', updatedUser);
    safeStorage.set('stanbeat_ad_revenue', newRevenue);
    set({ adRevenue: newRevenue, currentUser: updatedUser });
  },

  claimDailyHeart: () => {
    const user = get().currentUser;
    if (!user || user.banned) return false;
    const normalized = normalizeHearts(user);
    if (normalized.lastDailyHeart === todayUtc()) {
      set({ currentUser: normalized });
      return false;
    }
    const updatedUser = {
      ...normalized,
      hearts: Math.min(normalized.hearts + 1, 3),
      lastDailyHeart: todayUtc(),
      expiresAt: Date.now() + THREE_HOURS,
    };
    safeStorage.set('stanbeat_user', updatedUser);
    set({ currentUser: updatedUser });
    return true;
  },

  updateBestTime: (time) => {
    const user = get().currentUser;
    if (!user || user.banned) return;
    const nextUser = !user.bestTime || time < user.bestTime ? { ...user, bestTime: time } : user;
    safeStorage.set('stanbeat_user', nextUser);
    set({ currentUser: nextUser });

    // Save to Firestore leaderboard
    if (isFirebaseEnabled && nextUser.bestTime) {
      saveScore(nextUser.id, {
        nickname: nextUser.nickname,
        country: nextUser.country,
        avatarUrl: nextUser.avatarUrl,
        time: nextUser.bestTime,
      }).catch(console.error);
    }
  },

  addGameRecord: (time) => {
    const user = get().currentUser;
    if (!user) return;
    const record: GameRecord = { time, date: new Date().toISOString() };
    const nextUser = { ...user, gameHistory: [...user.gameHistory, record] };
    safeStorage.set('stanbeat_user', nextUser);
    set({ currentUser: nextUser });
  },

  fetchLeaderboard: () => {
    // Delegate to league system if user has a best time
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
        // Generate fresh view-only league
        const viewLeague = generateViewOnlyLeague(current.id);
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

    const combined = [...get().leaderboard, ...bots]
      .sort((a, b) => a.time - b.time)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined });
  },

  banUser: (id) => {
    const combined = get().leaderboard.map((entry) => (entry.id === id ? { ...entry, banned: true } : entry));
    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined });
  },

  editUserHeart: (id, hearts) => {
    const user = get().currentUser;
    if (user && user.id === id) {
      const updatedUser = { ...user, hearts: Math.max(0, Math.min(3, hearts)), expiresAt: Date.now() + THREE_HOURS };
      safeStorage.set('stanbeat_user', updatedUser);
      set({ currentUser: updatedUser });
    }
    const combined = get().leaderboard.map((entry) =>
      entry.id === id ? { ...entry, hearts: Math.max(0, Math.min(3, hearts)) } : entry
    );
    safeStorage.set('stanbeat_leaderboard', combined);
    set({ leaderboard: combined });
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
    safeStorage.set('stanbeat_user', updatedUser);
    set({ currentUser: updatedUser });
    console.log(`[Admin] Role toggled to: ${nextRole}`);
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
    const unsub = listenForRewards(user.id, (reward) => {
      console.log('[Adscend] New reward received:', reward);
      // Grant heart
      get().addHeart(1);
      // Mark as claimed in Firestore
      claimRewardInFirestore(reward.id).catch(console.error);
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
        const updatedUser = {
          ...normalized,
          hearts: Math.min(normalized.hearts + config.rewardedVideoRewardHearts, 3),
          expiresAt: Date.now() + THREE_HOURS,
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
