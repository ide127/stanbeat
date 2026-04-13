import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { runtimeConfig } from './runtimeConfig';
import type { HistoryEvent } from './types';
import { getStanbeatTestApi } from './devTestApi';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isConfigured = runtimeConfig.mode === 'live' && runtimeConfig.firebase.configured;
const app = isConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const auth = isConfigured && app ? getAuth(app) : null;
const db = isConfigured && app ? getFirestore(app) : null;
const functionsApi = isConfigured && app ? getFunctions(app, 'us-central1') : null;
const googleProvider = isConfigured ? new GoogleAuthProvider() : null;
const MAX_HISTORY_ITEMS = 100;

if (!isConfigured) {
  console.warn('[Firebase] Live Firebase configuration is unavailable. Cloud auth and sync remain disabled.');
}

type LooseRecord = Record<string, unknown>;

export interface ServerUserSnapshot {
  hearts: number;
  bestTime: number | null;
  lastDailyHeart: string | null;
  nextFreeHeartAt: string | null;
  gameHistory: HistoryEvent[];
  rewardedVideoStreak: number;
  referralRewardGranted: boolean;
}

export interface ConsumeHeartForGameResponse {
  status: 'consumed' | 'no_hearts' | 'banned';
  user?: ServerUserSnapshot;
}

export interface ClaimDailyHeartResponse {
  status: 'claimed' | 'already_claimed' | 'max_hearts' | 'banned';
  user?: ServerUserSnapshot;
  nextFreeHeartAt?: string | null;
}

export interface SubmitPlayResultResponse {
  status: 'saved' | 'banned';
  user?: ServerUserSnapshot;
  isNewBest?: boolean;
  firstCompletedPlay?: boolean;
}

export interface ClaimAdRewardResponse {
  status: 'claimed' | 'already_claimed' | 'forbidden' | 'not_found' | 'banned';
  user?: ServerUserSnapshot;
  grantedHearts?: number;
  rewardCapped?: boolean;
}

const sanitizeHistory = (history: unknown): HistoryEvent[] => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry): entry is HistoryEvent => {
      if (!entry || typeof entry !== 'object') return false;
      const record = entry as Partial<HistoryEvent>;
      return typeof record.type === 'string' && typeof record.value === 'number' && typeof record.date === 'string';
    })
    .slice(-MAX_HISTORY_ITEMS);
};

const parseSnapshot = (value: unknown): ServerUserSnapshot => {
  const data = value && typeof value === 'object' ? value as LooseRecord : {};
  const bestTimeRaw = data.bestTime;
  const bestTime = typeof bestTimeRaw === 'number' && Number.isFinite(bestTimeRaw) ? bestTimeRaw : null;

  return {
    hearts: Math.max(0, Number(data.hearts ?? 0)),
    bestTime,
    lastDailyHeart: typeof data.lastDailyHeart === 'string' ? data.lastDailyHeart : null,
    nextFreeHeartAt: typeof data.nextFreeHeartAt === 'string' ? data.nextFreeHeartAt : null,
    gameHistory: sanitizeHistory(data.gameHistory),
    rewardedVideoStreak: Math.max(0, Number(data.rewardedVideoStreak ?? 0)),
    referralRewardGranted: Boolean(data.referralRewardGranted),
  };
};

const callFunction = async <Req, Res>(name: string, payload: Req): Promise<Res> => {
  if (!functionsApi) {
    throw new Error(`[Firebase] Functions not initialized. Cannot call ${name}.`);
  }

  const callable = httpsCallable<Req, Res>(functionsApi, name);
  const result = await callable(payload);
  return result.data;
};

export const isFirebaseEnabled = isConfigured;

export async function firebaseSignInWithGoogle(): Promise<FirebaseUser | null> {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not configured. Google sign-in is unavailable.');
  }

  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function firebaseSignOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
  if (getStanbeatTestApi()?.disableAuthListener) {
    return () => {};
  }
  if (!auth) return () => {};
  return onFirebaseAuthStateChanged(auth, callback);
}

export async function saveUserProfile(userId: string, data: Record<string, unknown>): Promise<void> {
  if (!db) throw new Error('[Firebase] Firestore not initialized. Cannot save user profile.');
  await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
  if (!db) throw new Error('[Firebase] Firestore not initialized. Cannot get user profile.');
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function getLeaderboardEntry(userId: string): Promise<Record<string, unknown> | null> {
  if (!db) throw new Error('[Firebase] Firestore not initialized. Cannot get leaderboard entry.');
  const snap = await getDoc(doc(db, 'leaderboard', userId));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function getTopScores(count: number = 100): Promise<Array<Record<string, unknown>>> {
  if (!db) return [];
  const q = query(collection(db, 'leaderboard'), orderBy('time', 'asc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function deleteAllScores(): Promise<void> {
  if (!db) return;
  const snap = await getDocs(collection(db, 'leaderboard'));
  await Promise.all(snap.docs.map((entry) => deleteDoc(entry.ref)));
}

export async function banUserInFirestore(userId: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', userId), { banned: true, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'leaderboard', userId), { banned: true, updatedAt: serverTimestamp() }, { merge: true });
}

export async function unbanUserInFirestore(userId: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', userId), { banned: false, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'leaderboard', userId), { banned: false, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getGlobalStats(): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'stats', 'global'));
  return snap.exists() ? snap.data() : { totalHeartsUsed: 0, adRevenue: 0 };
}

export function listenGlobalStats(callback: (stats: { totalHeartsUsed: number; adRevenue: number }) => void): () => void {
  if (!db) return () => {};

  return onSnapshot(doc(db, 'stats', 'global'), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    callback({
      totalHeartsUsed: Number(data.totalHeartsUsed || 0),
      adRevenue: Number(data.adRevenue || 0),
    });
  }, (error) => {
    console.error('[Firebase] Failed to listen to global stats:', error);
  });
}

export async function getAdminGlobalUsers(): Promise<Array<Record<string, unknown>>> {
  if (!db) return [];

  const [userSnap, leaderboardSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'leaderboard')),
  ]);

  const merged = new Map<string, Record<string, unknown>>();

  userSnap.docs.forEach((entry) => {
    merged.set(entry.id, { id: entry.id, ...entry.data() });
  });

  leaderboardSnap.docs.forEach((entry) => {
    const existing = merged.get(entry.id) ?? { id: entry.id };
    const data = entry.data();
    merged.set(entry.id, {
      ...existing,
      ...data,
      bestTime: data.time ?? existing.bestTime ?? null,
    });
  });

  return Array.from(merged.values());
}

export async function editUserHeartInFirestore(userId: string, hearts: number): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', userId), { hearts, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'leaderboard', userId), { hearts, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveBotConfig(mean: number, stdDev: number): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'botParams'), { mean, stdDev, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getBotConfig(): Promise<{ mean: number; stdDev: number } | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'settings', 'botParams'));
  return snap.exists() ? (snap.data() as { mean: number; stdDev: number }) : null;
}

export async function saveRandConfig(config: Record<string, number>): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'randomConfig'), { ...config, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getRandConfig(): Promise<Record<string, number> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'settings', 'randomConfig'));
  return snap.exists() ? (snap.data() as Record<string, number>) : null;
}

export async function saveAdConfig(config: Record<string, unknown>): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'adConfig'), { ...config, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAdConfig(): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'settings', 'adConfig'));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function consumeHeartForGameRemote(): Promise<ConsumeHeartForGameResponse> {
  const override = getStanbeatTestApi()?.functions?.consumeHeartForGame;
  if (override) {
    return await override();
  }
  const data = await callFunction<Record<string, never>, LooseRecord>('consumeHeartForGame', {});
  return {
    status: String(data.status ?? 'banned') as ConsumeHeartForGameResponse['status'],
    user: data.user ? parseSnapshot(data.user) : undefined,
  };
}

export async function claimDailyHeartRemote(): Promise<ClaimDailyHeartResponse> {
  const override = getStanbeatTestApi()?.functions?.claimDailyHeartReward;
  if (override) {
    return await override();
  }
  const data = await callFunction<Record<string, never>, LooseRecord>('claimDailyHeartReward', {});
  return {
    status: String(data.status ?? 'banned') as ClaimDailyHeartResponse['status'],
    user: data.user ? parseSnapshot(data.user) : undefined,
    nextFreeHeartAt: typeof data.nextFreeHeartAt === 'string' ? data.nextFreeHeartAt : null,
  };
}

export async function submitPlayResultRemote(timeMs: number): Promise<SubmitPlayResultResponse> {
  const override = getStanbeatTestApi()?.functions?.submitPlayResult;
  if (override) {
    return await override(timeMs);
  }
  const data = await callFunction<{ timeMs: number }, LooseRecord>('submitPlayResult', { timeMs });
  return {
    status: String(data.status ?? 'banned') as SubmitPlayResultResponse['status'],
    user: data.user ? parseSnapshot(data.user) : undefined,
    isNewBest: Boolean(data.isNewBest),
    firstCompletedPlay: Boolean(data.firstCompletedPlay),
  };
}

export async function claimAdRewardRemote(rewardId: string): Promise<ClaimAdRewardResponse> {
  const override = getStanbeatTestApi()?.functions?.claimAdReward;
  if (override) {
    return await override(rewardId);
  }
  const data = await callFunction<{ rewardId: string }, LooseRecord>('claimAdReward', { rewardId });
  return {
    status: String(data.status ?? 'not_found') as ClaimAdRewardResponse['status'],
    user: data.user ? parseSnapshot(data.user) : undefined,
    grantedHearts: Number(data.grantedHearts ?? 0),
    rewardCapped: Boolean(data.rewardCapped),
  };
}

export async function rewardReferrer(
  referralCode: string,
  referredUserId: string,
): Promise<'granted' | 'already_rewarded' | 'missing_referrer' | 'disabled'> {
  if (!functionsApi || !referredUserId) return 'disabled';

  try {
    const data = await callFunction<{ referralCode: string; referredUserId: string }, { status: 'granted' | 'already_rewarded' | 'missing_referrer' }>(
      'rewardReferral',
      { referralCode, referredUserId },
    );
    return data.status;
  } catch (error) {
    console.error('[Firebase] Failed to reward referrer:', error);
    return 'disabled';
  }
}

export { auth, db };
