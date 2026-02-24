// ─── Firebase 초기화 및 유틸리티 함수 모음 ──────────────────────────────────
// Firebase SDK의 Auth, Firestore 기능을 초기화하고 외부에서 사용할 수 있도록 내보냄
// 환경변수(VITE_FIREBASE_*)가 없는 경우 mock 모드로 동작하여 오류 없이 실행됨

// Firebase App 초기화에 필요한 함수 임포트
import { initializeApp } from 'firebase/app';

// Firebase Auth 관련 기능 임포트
// - getAuth: Auth 인스턴스 가져오기
// - GoogleAuthProvider: 구글 OAuth 제공자
// - signInWithPopup: 팝업창으로 구글 로그인
// - signOut: 로그아웃
// - onAuthStateChanged: 로그인 상태 변화 감지 리스너
// - type User as FirebaseUser: Firebase User 타입 (타입스크립트용)
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged as onFirebaseAuthStateChanged,
    type User as FirebaseUser,
} from 'firebase/auth';

// Firebase Firestore 관련 기능 임포트
// - getFirestore: Firestore 인스턴스 가져오기
// - doc: 특정 문서(Document) 참조 생성
// - setDoc: 문서에 데이터 저장 (덮어쓰기 또는 병합)
// - getDoc: 단일 문서 조회
// - collection: 컬렉션 참조 생성
// - query: 쿼리 빌더
// - orderBy: 정렬 조건
// - limit: 결과 개수 제한
// - getDocs: 여러 문서 한번에 조회
// - serverTimestamp: 서버 기준 타임스탬프 (클라이언트 시간 조작 방지)
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    increment,
    onSnapshot,
} from 'firebase/firestore';

// ─── Firebase 설정 객체 ──────────────────────────────────────────────────────
// Vite의 import.meta.env를 통해 .env 파일의 VITE_ 접두사 환경변수를 읽어옴
// Cloudflare Pages에는 대시보드 > Settings > Environment Variables에서 설정 필요
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,              // Firebase API 키 (공개 OK, 보안규칙으로 보호)
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,      // 구글 로그인 도메인 (예: stanbeat-78d0b.firebaseapp.com)
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,        // Firebase 프로젝트 ID
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,// Cloud Storage 버킷 주소
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // FCM 푸시 알림용 발신자 ID
    appId: import.meta.env.VITE_FIREBASE_APP_ID,                // Firebase 웹 앱 고유 ID
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,// Google Analytics 측정 ID (선택사항)
};

// ─── 환경변수 유효성 검사 ──────────────────────────────────────────────────
// apiKey, projectId, appId 세 가지가 최소한 있어야 Firebase를 초기화할 수 있음
// 환경변수가 없으면 isConfigured = false → mock 모드로 동작
const isConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

// ─── Firebase 인스턴스 초기화 ─────────────────────────────────────────────
// 환경변수가 있을 때만 실제 Firebase 앱 초기화 (없으면 null)
const app = isConfigured ? initializeApp(firebaseConfig) : null;

// Firebase Auth 인스턴스 (로그인/로그아웃에 사용)
const auth = isConfigured && app ? getAuth(app) : null;

// Firestore 데이터베이스 인스턴스 (점수 저장, 사용자 프로필 등에 사용)
const db = isConfigured && app ? getFirestore(app) : null;

// 구글 OAuth 제공자 인스턴스 (구글 로그인 팝업에 사용)
const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

// ─── 외부에 Firebase 활성화 여부 노출 ────────────────────────────────────
// store.ts 등에서 Firebase가 사용 가능한지 확인할 때 사용
export const isFirebaseEnabled = isConfigured;

// 환경변수 미설정 시 개발자 콘솔에 경고 출력
if (!isFirebaseEnabled) {
    console.warn('[Firebase] 환경변수 미설정. mock 모드로 실행 중. VITE_FIREBASE_* 변수를 .env에 설정하세요.');
}

// ─── Auth: 구글 로그인 ────────────────────────────────────────────────────
// 팝업창을 열어 구글 계정으로 로그인 처리
// Firebase가 설정되지 않은 경우 에러를 던져 호출 측에서 처리하도록 함
export async function firebaseSignInWithGoogle(): Promise<FirebaseUser | null> {
    // auth 또는 googleProvider가 null이면 Firebase가 초기화되지 않은 것
    if (!auth || !googleProvider) {
        throw new Error('Firebase가 설정되지 않았습니다. 구글 로그인 불가.');
    }
    // 팝업으로 구글 로그인 실행 후 로그인된 사용자 정보 반환
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

// ─── Auth: 로그아웃 ──────────────────────────────────────────────────────
// Firebase Auth에서 현재 로그인된 사용자를 로그아웃 처리
// Firebase 미설정 시 아무것도 하지 않고 반환
export async function firebaseSignOut(): Promise<void> {
    if (!auth) return; // Firebase 미설정이면 무시
    await signOut(auth); // Firebase Auth 로그아웃 실행
}

// ─── Auth: 로그인 상태 변화 감지 ────────────────────────────────────────
// 컴포넌트 마운트 시 등록하여 로그인/로그아웃 상태 변화를 실시간으로 감지
// 반환값은 리스너를 해제하는 unsubscribe 함수
// 주의: require()는 CommonJS 문법이므로 ESM 환경에서 사용 불가 → import로 변경됨
export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    // Firebase 미설정이면 리스너 등록 없이 빈 해제 함수만 반환
    if (!auth) return () => { };
    // onFirebaseAuthStateChanged: firebase/auth에서 직접 import한 함수 사용
    return onFirebaseAuthStateChanged(auth, callback);
}

// ─── Firestore: 사용자 프로필 저장 ───────────────────────────────────────
// 로그인/정보 업데이트 시 users 컬렉션에 사용자 데이터를 저장
// merge: true → 기존 데이터를 보존하며 변경된 필드만 업데이트
export async function saveUserProfile(
    userId: string,                      // 사용자 고유 ID (Firebase Auth UID)
    data: Record<string, unknown>,       // 저장할 데이터 객체 (닉네임, 국가, 아바타 등)
): Promise<void> {
    if (!db) return; // Firestore 미설정이면 무시 (로컬 저장만 사용)
    // users/{userId} 문서에 데이터 저장, updatedAt은 서버 타임스탬프로 기록
    await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Firestore: 사용자 프로필 조회 ───────────────────────────────────────
// 특정 사용자의 Firestore 프로필 데이터를 가져옴
// 문서가 없으면 null 반환
export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    if (!db) return null; // Firestore 미설정이면 null 반환
    const snap = await getDoc(doc(db, 'users', userId)); // 문서 조회
    // 문서가 존재하면 데이터 반환, 없으면 null 반환
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

// ─── Firestore: 점수 저장 ───────────────────────────────────────────────
// 게임 완료 후 leaderboard 컬렉션에 사용자 최고 점수를 저장
// userId를 문서 ID로 사용하여 사용자당 하나의 점수 문서만 유지
export async function saveScore(
    userId: string,   // 점수를 저장할 사용자 ID
    data: {
        nickname: string;  // 리더보드에 표시될 닉네임
        country: string;   // 사용자 국가 코드 (국기 표시에 사용)
        avatarUrl: string; // 아바타 이미지 URL
        time: number;      // 완료 시간 (밀리초 단위, 낮을수록 우수)
    },
): Promise<void> {
    if (!db) return; // Firestore 미설정이면 로컬에만 저장
    // leaderboard/{userId} 문서에 점수 저장 (기존 데이터와 병합)
    await setDoc(doc(db, 'leaderboard', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Firestore: 상위 점수 조회 ─────────────────────────────────────────
// 리더보드 화면에서 상위 N명의 점수를 조회
// time 오름차순(빠른 시간순)으로 정렬하여 반환
export async function getTopScores(count: number = 100): Promise<Array<Record<string, unknown>>> {
    if (!db) return []; // Firestore 미설정이면 빈 배열 반환
    // leaderboard 컬렉션에서 time 기준 오름차순, count개 제한으로 조회
    const q = query(collection(db, 'leaderboard'), orderBy('time', 'asc'), limit(count));
    const snap = await getDocs(q); // 쿼리 실행
    // 각 문서의 id와 데이터를 합쳐서 배열로 반환
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Firestore: 모든 점수 초기화 (Admin) ──────────────────────────────
// 관리자가 시즌 리셋 시 전체 리더보드 데이터를 삭제하기 위해 사용
export async function deleteAllScores(): Promise<void> {
    if (!db) return;
    return import('firebase/firestore').then(async ({ deleteDoc }) => {
        // leaderboard 컬렉션의 모든 문서 조회
        const snap = await getDocs(collection(db!, 'leaderboard'));
        // 모든 문서 삭제 실행
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    }).catch(console.error);
}

// ─── Firestore: 사용자 밴 처리 (Admin) ────────────────────────────────
// 관리자가 불량 유저 등을 밴 처리할 때 사용. users 컬렉션 및 leaderboard 컬렉션에 밴 속성 추가
export async function banUserInFirestore(userId: string): Promise<void> {
    if (!db) return;
    try {
        await setDoc(doc(db, 'users', userId), { banned: true, updatedAt: serverTimestamp() }, { merge: true });
        await setDoc(doc(db, 'leaderboard', userId), { banned: true, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
        console.error('[Firebase] Failed to ban user:', err);
    }
}

// ─── Firestore: 글로벌 통계(DAU, Revenue 등) 증가 ─────────────────────
// 전역적으로 관리되는 통계(stats/global) 문서를 업데이트.
export async function incrementGlobalStats(heartsDelta: number, revenueDelta: number): Promise<void> {
    if (!db) return;
    try {
        await setDoc(doc(db, 'stats', 'global'), {
            totalHeartsUsed: increment(heartsDelta),
            adRevenue: increment(revenueDelta),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error('[Firebase] Failed to increment global stats:', err);
    }
}

// ─── Firestore: 글로벌 통계 조회 (Admin) ──────────────────────────────
export async function getGlobalStats(): Promise<Record<string, unknown> | null> {
    if (!db) return null;
    try {
        const snap = await getDoc(doc(db, 'stats', 'global'));
        return snap.exists() ? snap.data() : { totalHeartsUsed: 0, adRevenue: 0 };
    } catch (err) {
        console.error('[Firebase] Failed to fetch global stats:', err);
        return null;
    }
}

// ─── Firestore: 글로벌 통계 실시간 조회 (Admin) ──────────────────────
export function listenGlobalStats(callback: (stats: { totalHeartsUsed: number, adRevenue: number }) => void): () => void {
    if (!db) return () => { };
    const unsub = onSnapshot(doc(db, 'stats', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback({ totalHeartsUsed: Number(data.totalHeartsUsed || 0), adRevenue: Number(data.adRevenue || 0) });
        }
    }, (err) => {
        console.error('[Firebase] Failed to listen to global stats:', err);
    });
    return unsub;
}

// ─── Firestore: 전체 사용자 목록 반환 (Admin) ─────────────────────────
// 관리자 대시보드용, 모든 users 컬렉션 문서를 반환 (페이지네이션 없이 전부 반환 - DAU 산정용)
export async function getAdminGlobalUsers(): Promise<Array<Record<string, unknown>>> {
    if (!db) return [];
    try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('[Firebase] Failed to fetch all users:', err);
        return [];
    }
}

// ─── Firestore: 사용자 하트 수정 저장 (Admin) ─────────────────────────
export async function editUserHeartInFirestore(userId: string, hearts: number): Promise<void> {
    if (!db) return;
    try {
        await setDoc(doc(db, 'users', userId), { hearts, updatedAt: serverTimestamp() }, { merge: true });
        await setDoc(doc(db, 'leaderboard', userId), { hearts, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
        console.error('[Firebase] Failed to update user hearts:', err);
    }
}

// ─── Firestore: 봇 설정 저장 및 불러오기 (Admin) ─────────────────────────
export async function saveBotConfig(mean: number, stdDev: number): Promise<void> {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'botParams'), { mean, stdDev, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
        console.error('[Firebase] Failed to save bot config:', err);
    }
}

export async function getBotConfig(): Promise<{ mean: number, stdDev: number } | null> {
    if (!db) return null;
    try {
        const snap = await getDoc(doc(db, 'settings', 'botParams'));
        return snap.exists() ? (snap.data() as { mean: number, stdDev: number }) : null;
    } catch (err) {
        console.error('[Firebase] Failed to fetch bot config:', err);
        return null;
    }
}

// ─── 내부 인스턴스 재내보내기 ───────────────────────────────────────────
// store.ts 등 다른 파일에서 auth, db 인스턴스에 직접 접근이 필요한 경우를 위해 노출
export { auth, db };
