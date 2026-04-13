import type { HistoryEvent } from './types';

export interface TestServerUserSnapshot {
  hearts: number;
  bestTime: number | null;
  lastDailyHeart: string | null;
  nextFreeHeartAt: string | null;
  gameHistory: HistoryEvent[];
  rewardedVideoStreak: number;
  referralRewardGranted: boolean;
}

export interface TestConsumeHeartForGameResponse {
  status: 'consumed' | 'no_hearts' | 'banned';
  user?: TestServerUserSnapshot;
}

export interface TestClaimDailyHeartResponse {
  status: 'claimed' | 'already_claimed' | 'max_hearts' | 'banned';
  user?: TestServerUserSnapshot;
  nextFreeHeartAt?: string | null;
}

export interface TestSubmitPlayResultResponse {
  status: 'saved' | 'banned';
  user?: TestServerUserSnapshot;
  isNewBest?: boolean;
  firstCompletedPlay?: boolean;
}

export interface TestClaimAdRewardResponse {
  status: 'claimed' | 'already_claimed' | 'forbidden' | 'not_found' | 'banned';
  user?: TestServerUserSnapshot;
  grantedHearts?: number;
  rewardCapped?: boolean;
}

export interface TestRewardRecord {
  id: string;
  userId: string;
  type?: string;
  provider?: string;
  claimedAt?: unknown;
  payout?: number;
  offerName?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

export interface StanbeatTestApi {
  disableAuthListener?: boolean;
  getUserSnapshot?: () => TestServerUserSnapshot;
  functions?: {
    consumeHeartForGame?: () => Promise<TestConsumeHeartForGameResponse> | TestConsumeHeartForGameResponse;
    claimDailyHeartReward?: () => Promise<TestClaimDailyHeartResponse> | TestClaimDailyHeartResponse;
    submitPlayResult?: (timeMs: number) => Promise<TestSubmitPlayResultResponse> | TestSubmitPlayResultResponse;
    claimAdReward?: (rewardId: string) => Promise<TestClaimAdRewardResponse> | TestClaimAdRewardResponse;
  };
  rewardedVideo?: {
    showRewardedVideo?: (
      userId: string,
      callbacks?: { onPlaybackStarted?: () => void },
    ) => Promise<'completed' | 'skipped' | 'error' | 'noAds' | 'configMissing' | 'invalidConfig'> | 'completed' | 'skipped' | 'error' | 'noAds' | 'configMissing' | 'invalidConfig';
    waitForReward?: (
      userId: string,
      type: string,
      notBeforeMs: number,
      timeoutMs?: number,
    ) => Promise<TestRewardRecord | null> | TestRewardRecord | null;
    listenForRewards?: (userId: string, onReward: (reward: TestRewardRecord) => void) => (() => void) | void;
  };
}

declare global {
  interface Window {
    __STANBEAT_TEST_API__?: StanbeatTestApi;
  }
}

export const getStanbeatTestApi = (): StanbeatTestApi | null => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return window.__STANBEAT_TEST_API__ ?? null;
};
