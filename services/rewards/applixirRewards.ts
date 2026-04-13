import { db } from '../../firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getStanbeatTestApi } from '../../devTestApi';

const localApplixirRewards = new Map<string, RewardRecord[]>();
const localApplixirListeners = new Map<string, Set<(reward: RewardRecord) => void>>();

export interface RewardRecord {
  id: string;
  userId: string;
  type?: string;
  provider?: string;
  attemptId?: string | null;
  claimedAt?: unknown;
  payout?: number;
  offerName?: string;
  [key: string]: unknown;
}

const getCreatedAtMs = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null;
  if ('toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return Number((value as { toMillis: () => number }).toMillis());
  }
  if ('seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  return null;
};

export function listenForApplixirRewards(userId: string, onReward: (reward: RewardRecord) => void): () => void {
  const override = getStanbeatTestApi()?.rewardedVideo?.listenForRewards;
  if (override) {
    const unsubscribe = override(userId, onReward);
    return typeof unsubscribe === 'function' ? unsubscribe : (() => { });
  }

  if (!db) {
    console.warn('[ApplixirRewards] Firestore is not initialized.');
    return () => { };
  }

  const localListeners = localApplixirListeners.get(userId) ?? new Set<(reward: RewardRecord) => void>();
  localListeners.add(onReward);
  localApplixirListeners.set(userId, localListeners);

  const rewardsQuery = query(
    collection(db, 'adRewards'),
    where('userId', '==', userId),
    where('claimedAt', '==', null),
    where('type', '==', 'rewarded_video_applixir'),
  );

  const unsubscribeRemote = onSnapshot(rewardsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      onReward({ id: change.doc.id, ...(change.doc.data() as Record<string, unknown>) } as RewardRecord);
    });
  });

  return () => {
    unsubscribeRemote();
    localListeners.delete(onReward);
  };
}

export function waitForApplixirReward(userId: string, notBeforeMs: number, timeoutMs: number = 12000): Promise<RewardRecord | null> {
  const override = getStanbeatTestApi()?.rewardedVideo?.waitForReward;
  if (override) {
    return Promise.resolve(override(userId, 'rewarded_video_applixir', notBeforeMs, timeoutMs) as Promise<RewardRecord | null> | RewardRecord | null);
  }

  if (!db) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    let localInterval: ReturnType<typeof setInterval> | null = null;
    const cleanup = (result: RewardRecord | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (localInterval) clearInterval(localInterval);
      unsubscribe();
      resolve(result);
    };

    const findLocalReward = () => {
      const rewardDoc = (localApplixirRewards.get(userId) ?? [])
        .filter((reward) => reward.type === 'rewarded_video_applixir' && !reward.claimedAt)
        .filter((reward) => {
          const createdAtMs = getCreatedAtMs(reward.createdAt);
          return createdAtMs !== null && createdAtMs >= notBeforeMs - 1000;
        })
        .sort((a, b) => (getCreatedAtMs(b.createdAt) ?? 0) - (getCreatedAtMs(a.createdAt) ?? 0))[0];
      if (rewardDoc) cleanup(rewardDoc);
    };

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'adRewards'),
        where('userId', '==', userId),
        where('claimedAt', '==', null),
        where('type', '==', 'rewarded_video_applixir'),
      ),
      (snapshot) => {
        const rewardDoc = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) } as RewardRecord))
          .filter((reward) => {
            const createdAtMs = getCreatedAtMs(reward.createdAt);
            return createdAtMs !== null && createdAtMs >= notBeforeMs - 1000;
          })
          .sort((a, b) => (getCreatedAtMs(b.createdAt) ?? 0) - (getCreatedAtMs(a.createdAt) ?? 0))[0];
        if (!rewardDoc) return;
        cleanup(rewardDoc);
      },
      () => cleanup(null),
    );

    findLocalReward();
    localInterval = setInterval(findLocalReward, 250);

    const timeout = setTimeout(() => cleanup(null), timeoutMs);
  });
}

export function recordLocalApplixirReward(userId: string): RewardRecord {
  const reward: RewardRecord = {
    id: `local_applixir_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    userId,
    type: 'rewarded_video_applixir',
    provider: 'applixir',
    createdAt: Timestamp.now(),
    claimedAt: null,
  };
  const rewards = localApplixirRewards.get(userId) ?? [];
  rewards.push(reward);
  localApplixirRewards.set(userId, rewards.slice(-5));
  localApplixirListeners.get(userId)?.forEach((listener) => listener(reward));
  return reward;
}

export function markLocalApplixirRewardClaimed(userId: string, rewardId: string): boolean {
  const rewards = localApplixirRewards.get(userId) ?? [];
  const reward = rewards.find((entry) => entry.id === rewardId);
  if (!reward || reward.claimedAt) return false;
  reward.claimedAt = Timestamp.now();
  return true;
}

export async function claimRewardInFirestore(rewardId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const rewardRef = doc(db, 'adRewards', rewardId);
    return await runTransaction(db, async (transaction) => {
      const rewardSnap = await transaction.get(rewardRef);
      if (!rewardSnap.exists()) {
        return false;
      }
      if (rewardSnap.data()?.claimedAt) {
        return false;
      }
      transaction.update(rewardRef, {
        claimedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    console.error('[ApplixirRewards] Failed to claim reward:', error);
    return false;
  }
}
