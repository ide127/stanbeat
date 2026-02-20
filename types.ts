import { LanguageCode } from './i18n';

export interface GameRecord {
  time: number;
  date: string;
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
  expiresAt: number | null;
  lastDailyHeart: string | null;
  agreedToTerms: boolean;
  banned: boolean;
  gameHistory: GameRecord[];
  referralCode: string;
  referredBy: string | null;
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

export type ViewState = 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN' | 'HISTORY';

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
  leagueLabel?: string; // Random hex label for guest showcase
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

// Re-export LeagueData so it can be imported from either file
export type { LeagueData } from './league';
