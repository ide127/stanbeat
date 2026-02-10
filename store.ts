import { create } from 'zustand';
import { ActivityItem, LeaderboardEntry, User, ViewState } from './types';
import { LanguageCode } from './i18n';

interface AppState {
  currentUser: User | null;
  currentView: ViewState;
  isMenuOpen: boolean;
  leaderboard: LeaderboardEntry[];
  language: LanguageCode;
  notice: string;
  termsAccepted: boolean;
  seasonEndsAt: number;
  heartsUsedToday: number;
  adRevenue: number;
  activityFeed: ActivityItem[];

  setView: (view: ViewState) => void;
  toggleMenu: () => void;
  setLanguage: (lang: LanguageCode) => void;
  setNotice: (value: string) => void;
  acceptTerms: () => void;

  login: () => Promise<void>;
  logout: () => void;
  consumeHeart: () => boolean;
  addHeart: (amount: number) => void;
  claimDailyHeart: () => boolean;

  updateBestTime: (time: number) => void;
  fetchLeaderboard: () => void;
  resetSeason: () => void;
  generateDummyBots: (count: number) => void;
  banUser: (id: string) => void;
  editUserHeart: (id: string, hearts: number) => void;
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

const defaultFeed: ActivityItem[] = [
  { id: 'a1', message: '[LIVE] cuteTiger_4819님이 방금 상위 1%를 달성했습니다! 🔥', level: 'live' },
  { id: 'a2', message: '[LIVE] user_9921님이 하트를 충전했습니다.', level: 'live' },
  { id: 'a3', message: '[EVENT] 친구 초대 시 +1❤️ 즉시 지급!', level: 'event' },
];

const savedLang = safeStorage.get<LanguageCode>('stanbeat_lang', 'ko');
const savedNotice = safeStorage.get<string>('stanbeat_notice', '당첨자 발표 지연 시 앱 공지로 안내됩니다.');
const savedLeaderboard = safeStorage.get<LeaderboardEntry[]>('stanbeat_leaderboard', mockLeaderboardBase);

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  currentView: 'HOME',
  isMenuOpen: false,
  leaderboard: savedLeaderboard,
  language: savedLang,
  notice: savedNotice,
  termsAccepted: false,
  seasonEndsAt: Date.now() + 4 * 60 * 60 * 1000,
  heartsUsedToday: 0,
  adRevenue: 4203,
  activityFeed: defaultFeed,

  setView: (view) => set({ currentView: view }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  setLanguage: (language) => {
    safeStorage.set('stanbeat_lang', language);
    set({ language });
  },
  setNotice: (notice) => {
    safeStorage.set('stanbeat_notice', notice);
    set({ notice });
  },
  acceptTerms: () => {
    const user = get().currentUser;
    if (!user) return;
    const nextUser = { ...user, agreedToTerms: true };
    set({ currentUser: nextUser, termsAccepted: true });
  },

  login: async () => {
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
          role: 'ADMIN',
          expiresAt: Date.now() + THREE_HOURS,
          lastDailyHeart: null,
          agreedToTerms: false,
          banned: false,
        };
        set({ currentUser: user, termsAccepted: false });
        resolve();
      }, 450);
    });
  },

  logout: () => set({ currentUser: null, currentView: 'HOME', termsAccepted: false }),

  consumeHeart: () => {
    const user = get().currentUser;
    if (!user || user.banned) return false;
    const normalized = normalizeHearts(user);
    if (normalized.hearts <= 0) {
      set({ currentUser: normalized });
      return false;
    }
    set((state) => ({
      heartsUsedToday: state.heartsUsedToday + 1,
      currentUser: {
        ...normalized,
        hearts: normalized.hearts - 1,
      },
    }));
    return true;
  },

  addHeart: (amount) => {
    const user = get().currentUser;
    if (!user || user.banned) return;
    const normalized = normalizeHearts(user);
    set((state) => ({
      adRevenue: state.adRevenue + 0.15,
      currentUser: {
        ...normalized,
        hearts: Math.min(normalized.hearts + amount, 3),
        expiresAt: Date.now() + THREE_HOURS,
      },
    }));
  },

  claimDailyHeart: () => {
    const user = get().currentUser;
    if (!user || user.banned) return false;
    const normalized = normalizeHearts(user);
    if (normalized.lastDailyHeart === todayUtc()) {
      set({ currentUser: normalized });
      return false;
    }
    set({
      currentUser: {
        ...normalized,
        hearts: Math.min(normalized.hearts + 1, 3),
        lastDailyHeart: todayUtc(),
        expiresAt: Date.now() + THREE_HOURS,
      },
    });
    return true;
  },

  updateBestTime: (time) => {
    const user = get().currentUser;
    if (!user || user.banned) return;

    const nextUser = !user.bestTime || time < user.bestTime ? { ...user, bestTime: time } : user;
    set({ currentUser: nextUser });
  },

  fetchLeaderboard: () => {
    const current = get().currentUser;
    const entries = [...get().leaderboard].filter((entry) => !entry.banned);

    if (current?.bestTime) {
      const existing = entries.find((entry) => entry.id === current.id);
      if (existing) {
        existing.time = Math.min(existing.time, current.bestTime);
      } else {
        entries.push({
          id: current.id,
          nickname: current.nickname,
          country: current.country,
          avatarUrl: current.avatarUrl,
          time: current.bestTime,
          rank: 0,
          isCurrentUser: true,
        });
      }
    }

    const ranked = entries
      .sort((a, b) => a.time - b.time)
      .map((entry, idx) => ({ ...entry, rank: idx + 1, isCurrentUser: current?.id === entry.id }));

    safeStorage.set('stanbeat_leaderboard', ranked);
    set({ leaderboard: ranked });
  },

  resetSeason: () => {
    set({
      seasonEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      leaderboard: mockLeaderboardBase,
      heartsUsedToday: 0,
    });
    safeStorage.set('stanbeat_leaderboard', mockLeaderboardBase);
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
    if (!user || user.id !== id) return;
    set({ currentUser: { ...user, hearts: Math.max(0, Math.min(3, hearts)), expiresAt: Date.now() + THREE_HOURS } });
  },
}));
