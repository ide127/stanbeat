// ─── Adscend Media 광고 연동 클라이언트 모듈 ────────────────────────────────
// Adscend Media의 오퍼월/리워드 비디오 광고 시스템과의 연동을 담당
// 광고 시청 완료 시 S2S(서버-투-서버) 포스트백을 Firebase Cloud Function이 수신하고
// Firestore adRewards 컬렉션에 기록 → 여기서 실시간으로 감지하여 유저에게 보상 제공

// Firebase Firestore 인스턴스 임포트 (광고 보상 실시간 감지에 사용)
import { db } from './firebase';

// Firestore 쿼리/실시간 리스닝 관련 함수 임포트
import {
    collection,      // 컬렉션 참조 생성
    query,           // 쿼리 조건 조합
    where,           // 필터 조건 (WHERE 절과 동일)
    onSnapshot,      // 실시간 데이터 변경 감지 리스너
    doc,             // 단일 문서 참조 생성
    updateDoc,       // 기존 문서 일부 필드 업데이트
    serverTimestamp, // 서버 기준 타임스탬프 (클라이언트 시간 조작 방지)
} from 'firebase/firestore';

// ─── Adscend 환경변수 로드 ───────────────────────────────────────────────────
// Cloudflare Pages 대시보드 또는 .env 파일에서 값을 가져옴
// 없을 경우 'MOCK_XXX' 폴백으로 설정하여 개발 환경에서도 URL 구조 확인 가능
const PUB_ID = import.meta.env.VITE_ADSCEND_PUB_ID || 'MOCK_PUB';           // 퍼블리셔 ID (Adscend 계정 고유 번호)
const OFFERWALL_ID = import.meta.env.VITE_ADSCEND_OFFERWALL_ID || 'MOCK_WALL'; // 오퍼월 프로파일 ID
const VIDEO_ID = import.meta.env.VITE_ADSCEND_VIDEO_ID || 'MOCK_VIDEO';      // 리워드 비디오 프로파일 ID

// ─── 오퍼월 URL 생성 ──────────────────────────────────────────────────────
// 사용자가 오퍼월(설문/앱 설치 등 미션 완료 광고)을 열 때 사용하는 iframe URL
// subid1에 userId를 포함시켜 Adscend가 보상을 올바른 유저에게 전달하도록 함
export function getOfferwallUrl(userId: string): string {
    // Adscend 표준 URL 형식: publisher/{퍼블리셔ID}/profile/{오퍼월ID}?subid1={유저ID}
    return `https://adscendmedia.com/adwall/publisher/${PUB_ID}/profile/${OFFERWALL_ID}?subid1=${userId}`;
}

// ─── 리워드 비디오 URL 생성 ───────────────────────────────────────────────
// 리워드 비디오 광고를 시청하는 iframe URL 생성
// 오퍼월과 동일한 형식이지만 VIDEO_ID를 사용하여 다른 광고 유형 구분
export function getRewardedVideoUrl(userId: string): string {
    return `https://adscendmedia.com/adwall/publisher/${PUB_ID}/profile/${VIDEO_ID}?subid1=${userId}`;
}

// ─── 실시간 보상 리스너 ──────────────────────────────────────────────────
// Firebase Cloud Function이 Adscend 포스트백을 수신하면 adRewards 컬렉션에 문서 생성
// 이 함수는 해당 컬렉션을 실시간으로 감시하다가 새 보상이 생기면 콜백을 호출
// 반환값: 리스너를 해제하는 unsubscribe 함수 (컴포넌트 unmount 시 호출 필요)
export function listenForRewards(userId: string, onReward: (reward: unknown) => void): () => void {
    // Firestore가 초기화되지 않은 경우(환경변수 없음) 경고 후 빈 해제 함수 반환
    if (!db) {
        console.warn('[Adscend] Firestore 미설정. 광고 보상 실시간 동기화 비활성화.');
        return () => { };
    }

    // adRewards 컬렉션에서 이 유저의 미청구(claimedAt == null) 보상만 조회
    const q = query(
        collection(db, 'adRewards'),      // 광고 보상 기록 컬렉션
        where('userId', '==', userId),     // 현재 유저의 보상만 필터링
        where('claimedAt', '==', null),    // 아직 청구하지 않은 보상만 (이중 지급 방지)
    );

    // 실시간 리스너 등록: 컬렉션 변경 시마다 호출됨
    return onSnapshot(q, (snapshot) => {
        // changed 된 각 문서에 대해 처리
        snapshot.docChanges().forEach((change) => {
            // 'added': 새로운 보상 문서가 생성된 경우에만 처리
            // 'modified', 'removed'는 무시 (이미 처리된 보상의 변경)
            if (change.type === 'added') {
                // 보상 정보를 콜백으로 전달 (id 포함)
                onReward({ id: change.doc.id, ...change.doc.data() });
            }
        });
    });
}

// ─── 보상 청구 완료 처리 ─────────────────────────────────────────────────
// 보상을 유저에게 지급한 후 Firestore에 청구 완료 시간을 기록하여 이중 지급 방지
// claimedAt = 서버 타임스탬프 → 이 값이 있으면 listenForRewards 쿼리에 걸리지 않음
export async function claimRewardInFirestore(rewardId: string): Promise<void> {
    if (!db) return; // Firestore 미설정이면 무시
    try {
        const rewardRef = doc(db, 'adRewards', rewardId); // 보상 문서 참조

        // claimedAt 필드를 서버 타임스탬프로 업데이트 (청구 완료 기록)
        await updateDoc(rewardRef, {
            claimedAt: serverTimestamp(), // 클라이언트 시간 대신 서버 시간 사용 (조작 방지)
        });
    } catch (error) {
        console.error('[Adscend] Failed to claim reward:', error);
    }
}
