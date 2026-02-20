import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Adscend Media Client Module
 * Handles iframe URL generation and real-time reward listening.
 */

// Configuration from environment variables
const PUB_ID = import.meta.env.VITE_ADSCEND_PUB_ID || 'MOCK_PUB';
const OFFERWALL_ID = import.meta.env.VITE_ADSCEND_OFFERWALL_ID || 'MOCK_WALL';
const VIDEO_ID = import.meta.env.VITE_ADSCEND_VIDEO_ID || 'MOCK_VIDEO';

/**
 * Generate Adscend Media Offerwall URL
 */
export function getOfferwallUrl(userId: string): string {
    // Format: https://adscendmedia.com/adwall/publisher/{pubid}/profile/{adwallid}?subid1={subid1}
    return `https://adscendmedia.com/adwall/publisher/${PUB_ID}/profile/${OFFERWALL_ID}?subid1=${userId}`;
}

/**
 * Generate Adscend Media Rewarded Video URL
 */
export function getRewardedVideoUrl(userId: string): string {
    // Using the same base format but with a video-specific profile
    return `https://adscendmedia.com/adwall/publisher/${PUB_ID}/profile/${VIDEO_ID}?subid1=${userId}`;
}

/**
 * Listen for pending rewards in Firestore
 * This collection is populated by the Firebase Cloud Function postback handler.
 */
export function listenForRewards(userId: string, onReward: (reward: any) => void): () => void {
    if (!db) {
        console.warn('[Adscend] Firestore not available. Rewards won\'t sync.');
        return () => { };
    }

    const q = query(
        collection(db, 'adRewards'),
        where('userId', '==', userId),
        where('claimedAt', '==', null)
    );

    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                onReward({ id: change.doc.id, ...change.doc.data() });
            }
        });
    });
}

/**
 * Mark a reward as claimed in Firestore
 */
export async function claimRewardInFirestore(rewardId: string): Promise<void> {
    if (!db) return;
    const rewardRef = doc(db, 'adRewards', rewardId);
    await updateDoc(rewardRef, {
        claimedAt: serverTimestamp()
    });
}
