export interface User {
  id: string;
  nickname: string;
  avatarUrl: string;
  hearts: number;
  bestTime: number | null; // in milliseconds
  country: string;
  role: 'USER' | 'ADMIN';
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

export type ViewState = 'HOME' | 'GAME' | 'LEADERBOARD' | 'ADMIN' | 'AUTH_REQUIRED';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  country: string; // ISO code 'KR', 'US', etc.
  time: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}
