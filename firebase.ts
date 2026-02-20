import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if config is present
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

const app = isConfigured ? initializeApp(firebaseConfig) : null;
const auth = isConfigured && app ? getAuth(app) : null;
const db = isConfigured && app ? getFirestore(app) : null;
const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

export const isFirebaseEnabled = isConfigured;

if (!isFirebaseEnabled) {
    console.warn('[Firebase] Config missing. Running in mock mode.');
}

// ─── Auth ─────────────────────────────────────────────────────────
export async function firebaseSignInWithGoogle(): Promise<FirebaseUser | null> {
    if (!auth || !googleProvider) {
        throw new Error('Firebase not configured. Cannot sign in.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function firebaseSignOut(): Promise<void> {
    if (!auth) return;
    await signOut(auth);
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!auth) return () => { };
    const { onAuthStateChanged: onAuth } = require('firebase/auth');
    return onAuth(auth, callback);
}

// ─── Firestore: User Profile ────────────────────────────────────
export async function saveUserProfile(userId: string, data: Record<string, unknown>): Promise<void> {
    if (!db) return;
    await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    if (!db) return null;
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

// ─── Firestore: Leaderboard ─────────────────────────────────────
export async function saveScore(userId: string, data: { nickname: string; country: string; avatarUrl: string; time: number }): Promise<void> {
    if (!db) return;
    await setDoc(doc(db, 'leaderboard', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getTopScores(count: number = 100): Promise<Array<Record<string, unknown>>> {
    if (!db) return [];
    const q = query(collection(db, 'leaderboard'), orderBy('time', 'asc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Re-export for convenience
export { auth, db };
