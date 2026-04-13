import type { LanguageCode } from './i18n';

export interface HistoryEvent {
  type: 'PLAY' | 'AD' | 'INVITE' | 'DAILY' | 'CANCELLED';
  value: number;
  date: string;
}

export interface BotConfig {
  mean: number;
  stdDev: number;
}

export interface User {
  id: string;
  nickname: string;
  avatarUrl: string;
  email: string;
  hearts: number;
  bestTime: number | null;
  country: string;
  role: 'USER' | 'ADMIN';
  lastDailyHeart: string | null;
  nextFreeHeartAt: string | null;
  agreedToTerms: boolean;
  banned: boolean;
  gameHistory: HistoryEvent[];
  referralCode: string;
  referredBy: string | null;
  referralRewardGranted: boolean;
  rewardedVideoStreak: number;
  applixirUserId: string;
}

export interface GridCell {
  id: string;
  letter: string;
  row: number;
  col: number;
  selected: boolean;
  found: boolean;
}

export interface WordConfig {
  word: string;
  found: boolean;
}

export type ViewState = 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN' | 'HISTORY' | 'SUPPORT';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  country: string;
  avatarUrl: string;
  time: number;
  rank: number;
  email?: string;
  hearts?: number;
  isCurrentUser?: boolean;
  isBot?: boolean;
  banned?: boolean;
  leagueLabel?: string;
}

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  level?: 'live' | 'alert' | 'event';
}

export type { LeagueData } from './league';

export interface RandConfig {
  botTimeMean: number;
  botTimeStdDev: number;
  leagueSizeMin: number;
  leagueSizeMax: number;
  totalLeaguesMean: number;
  totalLeaguesStdDev: number;
  overtakeGapMin: number;
  overtakeGapMax: number;
  showcaseTimeMean: number;
  showcaseTimeStdDev: number;
  tickerTimeMin: number;
  tickerTimeMax: number;
  feedBatchSize: number;
  totalLeaguesFloor: number;
}

export interface AlertDialogState {
  title: string;
  message: string;
  tone?: 'default' | 'error' | 'warning';
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
}

export interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type AdminTimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
};

export interface AdminUserRow {
  id: string;
  nickname: string;
  avatarUrl: string;
  email?: string;
  country?: string;
  hearts?: number;
  time?: number;
  role?: 'USER' | 'ADMIN';
  banned?: boolean;
  referralCode?: string;
  referredBy?: string | null;
  applixirUserId?: string;
  updatedAt?: AdminTimestampLike | string | number | Date;
  gameHistory?: HistoryEvent[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  createdAt?: AdminTimestampLike | string | number | Date;
}
