import { LanguageCode } from './i18n';

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

export type ViewState = 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  country: string;
  avatarUrl: string;
  time: number;
  rank: number;
  isCurrentUser?: boolean;
  isBot?: boolean;
  banned?: boolean;
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
