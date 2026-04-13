"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardReferral = exports.claimAdReward = exports.submitPlayResult = exports.claimDailyHeartReward = exports.consumeHeartForGame = exports.applixirCallback = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
const increment = admin.firestore.FieldValue.increment;
const MAX_HEARTS = 3;
const MAX_HISTORY_ITEMS = 100;
const DEFAULT_AD_CONFIG = {
    rewardedVideoRewardHearts: 1,
    videosPerHeart: 1,
};
function firstParam(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value.trim();
        if (Array.isArray(value)) {
            const nested = firstParam(...value);
            if (nested)
                return nested;
        }
    }
    return undefined;
}
function asNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function normalizePayload(value) {
    return value && typeof value === 'object' ? value : {};
}
function isFailureStatus(status) {
    return !!status && /(error|fail|declin|skip|manual|cancel|noads|blocked|timeout)/i.test(status);
}
function sanitizeHistory(history) {
    if (!Array.isArray(history))
        return [];
    return history
        .filter((entry) => {
        if (!entry || typeof entry !== 'object')
            return false;
        const record = entry;
        return typeof record.type === 'string' && typeof record.value === 'number' && typeof record.date === 'string';
    })
        .slice(-MAX_HISTORY_ITEMS);
}
function appendHistory(history, nextEvent) {
    return [...sanitizeHistory(history), nextEvent].slice(-MAX_HISTORY_ITEMS);
}
function clampHearts(value) {
    return Math.max(0, Math.min(MAX_HEARTS, Math.floor(asNumber(value))));
}
function asNullableBestTime(value) {
    const parsed = asNumber(value);
    return parsed > 0 ? parsed : null;
}
function getUtcDay() {
    return new Date().toISOString().slice(0, 10);
}
function buildUserSnapshot(userData) {
    return {
        hearts: clampHearts(userData.hearts),
        bestTime: asNullableBestTime(userData.bestTime),
        lastDailyHeart: typeof userData.lastDailyHeart === 'string' ? userData.lastDailyHeart : null,
        gameHistory: sanitizeHistory(userData.gameHistory),
        rewardedVideoStreak: Math.max(0, Math.floor(asNumber(userData.rewardedVideoStreak))),
        referralRewardGranted: Boolean(userData.referralRewardGranted),
    };
}
async function bumpGlobalRevenue(revenueDelta) {
    if (!revenueDelta)
        return;
    await db.collection('stats').doc('global').set({
        adRevenue: increment(revenueDelta),
        updatedAt: serverTimestamp(),
    }, { merge: true });
}
async function getAdConfig(tx) {
    var _a, _b;
    const settingsRef = db.collection('settings').doc('adConfig');
    const snap = tx ? await tx.get(settingsRef) : await settingsRef.get();
    const data = (snap.exists ? snap.data() : {});
    return {
        rewardedVideoRewardHearts: Math.max(1, Math.min(MAX_HEARTS, Math.floor(asNumber((_a = data.rewardedVideoRewardHearts) !== null && _a !== void 0 ? _a : DEFAULT_AD_CONFIG.rewardedVideoRewardHearts)))),
        videosPerHeart: Math.max(1, Math.floor(asNumber((_b = data.videosPerHeart) !== null && _b !== void 0 ? _b : DEFAULT_AD_CONFIG.videosPerHeart))),
    };
}
async function markReferralGrantedInUser(transaction, referredUserId) {
    const referredUserRef = db.collection('users').doc(referredUserId);
    transaction.set(referredUserRef, {
        referralRewardGranted: true,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}
exports.applixirCallback = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    const query = normalizePayload(req.query);
    const body = normalizePayload(req.body);
    const headers = normalizePayload(req.headers);
    const expectedSecret = (_a = process.env.APPLIXIR_CALLBACK_SECRET) === null || _a === void 0 ? void 0 : _a.trim();
    const providedSecret = firstParam(query.secret, query.secretKey, query.token, body.secret, body.secretKey, body.token, headers['x-applixir-secret'], headers['x-callback-secret']);
    if (expectedSecret && providedSecret !== expectedSecret) {
        console.error('[AppLixir Callback] Secret mismatch');
        res.status(403).send('Forbidden');
        return;
    }
    const userId = firstParam(query.userId, query.user_id, query.subid1, query.subId1, query.uid, body.userId, body.user_id, body.subid1, body.subId1, body.uid);
    if (!userId) {
        console.error('[AppLixir Callback] Missing user identifier');
        res.status(400).send('Missing user identifier');
        return;
    }
    const status = firstParam(query.status, query.event, query.type, body.status, body.event, body.type);
    if (isFailureStatus(status)) {
        console.warn(`[AppLixir Callback] Ignoring failure status "${status}" for user ${userId}`);
        res.status(200).send('IGNORED');
        return;
    }
    const payout = asNumber(firstParam(query.payout, query.amount, body.payout, body.amount));
    const externalId = (_b = firstParam(query.transactionId, query.transaction_id, query.callbackId, query.eventId, query.rewardId, body.transactionId, body.transaction_id, body.callbackId, body.eventId, body.rewardId)) !== null && _b !== void 0 ? _b : `${userId}-${Date.now()}`;
    const rewardDocId = `applixir_${externalId}`;
    try {
        const rewardRef = db.collection('adRewards').doc(rewardDocId);
        await rewardRef.set({
            userId,
            payout,
            provider: 'applixir',
            providerEvent: status !== null && status !== void 0 ? status : 'completed',
            type: 'rewarded_video_applixir',
            createdAt: serverTimestamp(),
            claimedAt: null,
            rawPayload: {
                method: req.method,
                query,
                body,
            },
        }, { merge: true });
        await bumpGlobalRevenue(payout);
        console.log(`[AppLixir Callback] Reward recorded for user ${userId}`);
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('[AppLixir Callback] Firestore Error:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.consumeHeartForGame = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const userRef = db.collection('users').doc(userId);
    const leaderboardRef = db.collection('leaderboard').doc(userId);
    const statsRef = db.collection('stats').doc('global');
    let response = { status: 'banned' };
    await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
        }
        const userData = userSnap.data();
        if (Boolean(userData.banned)) {
            response = { status: 'banned', user: buildUserSnapshot(userData) };
            return;
        }
        const hearts = clampHearts(userData.hearts);
        if (hearts <= 0) {
            response = { status: 'no_hearts', user: buildUserSnapshot(userData) };
            return;
        }
        const nextHearts = hearts - 1;
        const nextUser = Object.assign(Object.assign({}, userData), { hearts: nextHearts });
        transaction.set(userRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(leaderboardRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(statsRef, {
            totalHeartsUsed: increment(1),
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = { status: 'consumed', user: buildUserSnapshot(nextUser) };
    });
    return response;
});
exports.claimDailyHeartReward = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const userRef = db.collection('users').doc(userId);
    const leaderboardRef = db.collection('leaderboard').doc(userId);
    const todayUtc = getUtcDay();
    let response = { status: 'banned' };
    await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
        }
        const userData = userSnap.data();
        if (Boolean(userData.banned)) {
            response = { status: 'banned', user: buildUserSnapshot(userData) };
            return;
        }
        if (userData.lastDailyHeart === todayUtc) {
            response = { status: 'already_claimed', user: buildUserSnapshot(userData) };
            return;
        }
        const nextHearts = Math.min(MAX_HEARTS, clampHearts(userData.hearts) + 1);
        const nextHistory = appendHistory(userData.gameHistory, {
            type: 'DAILY',
            value: 1,
            date: new Date().toISOString(),
        });
        const nextUser = Object.assign(Object.assign({}, userData), { hearts: nextHearts, lastDailyHeart: todayUtc, gameHistory: nextHistory });
        transaction.set(userRef, {
            hearts: nextHearts,
            lastDailyHeart: todayUtc,
            gameHistory: nextHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(leaderboardRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = { status: 'claimed', user: buildUserSnapshot(nextUser) };
    });
    return response;
});
exports.submitPlayResult = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const payload = normalizePayload(request.data);
    const timeMs = Math.floor(asNumber(payload.timeMs));
    if (!Number.isFinite(timeMs) || timeMs < 1000) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid timeMs');
    }
    const userRef = db.collection('users').doc(userId);
    const leaderboardRef = db.collection('leaderboard').doc(userId);
    let response = { status: 'banned' };
    await db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d;
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
        }
        const userData = userSnap.data();
        if (Boolean(userData.banned)) {
            response = { status: 'banned', user: buildUserSnapshot(userData) };
            return;
        }
        const history = sanitizeHistory(userData.gameHistory);
        const firstCompletedPlay = !history.some((entry) => entry.type === 'PLAY');
        const currentBest = asNullableBestTime(userData.bestTime);
        const nextBest = currentBest === null || timeMs < currentBest ? timeMs : currentBest;
        const isNewBest = currentBest === null || timeMs < currentBest;
        const nextHistory = appendHistory(history, {
            type: 'PLAY',
            value: timeMs,
            date: new Date().toISOString(),
        });
        const nextUser = Object.assign(Object.assign({}, userData), { bestTime: nextBest, gameHistory: nextHistory });
        transaction.set(userRef, {
            bestTime: nextBest,
            gameHistory: nextHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(leaderboardRef, {
            nickname: String((_a = userData.nickname) !== null && _a !== void 0 ? _a : ''),
            country: String((_b = userData.country) !== null && _b !== void 0 ? _b : 'KR'),
            avatarUrl: String((_c = userData.avatarUrl) !== null && _c !== void 0 ? _c : ''),
            email: String((_d = userData.email) !== null && _d !== void 0 ? _d : ''),
            hearts: clampHearts(userData.hearts),
            banned: Boolean(userData.banned),
            time: nextBest,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = {
            status: 'saved',
            user: buildUserSnapshot(nextUser),
            isNewBest,
            firstCompletedPlay,
        };
    });
    return response;
});
exports.claimAdReward = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const payload = normalizePayload(request.data);
    const rewardId = firstParam(payload.rewardId);
    if (!rewardId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing rewardId');
    }
    const rewardRef = db.collection('adRewards').doc(rewardId);
    const userRef = db.collection('users').doc(userId);
    const leaderboardRef = db.collection('leaderboard').doc(userId);
    let response = { status: 'not_found', grantedHearts: 0 };
    await db.runTransaction(async (transaction) => {
        var _a, _b;
        const [rewardSnap, userSnap] = await Promise.all([
            transaction.get(rewardRef),
            transaction.get(userRef),
        ]);
        if (!rewardSnap.exists) {
            response = { status: 'not_found', grantedHearts: 0 };
            return;
        }
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
        }
        const rewardData = rewardSnap.data();
        const userData = userSnap.data();
        if (String((_a = rewardData.userId) !== null && _a !== void 0 ? _a : '') !== userId) {
            response = { status: 'forbidden', grantedHearts: 0 };
            return;
        }
        if (rewardData.claimedAt) {
            response = { status: 'already_claimed', grantedHearts: 0, user: buildUserSnapshot(userData) };
            return;
        }
        if (Boolean(userData.banned)) {
            response = { status: 'banned', grantedHearts: 0, user: buildUserSnapshot(userData) };
            return;
        }
        const adConfig = await getAdConfig(transaction);
        const type = String((_b = rewardData.type) !== null && _b !== void 0 ? _b : '');
        let nextStreak = Math.max(0, Math.floor(asNumber(userData.rewardedVideoStreak)));
        let grantedHearts = 0;
        let nextHistory = sanitizeHistory(userData.gameHistory);
        if (type === 'rewarded_video_applixir') {
            nextStreak += 1;
            if (nextStreak >= adConfig.videosPerHeart) {
                nextStreak = 0;
                grantedHearts = adConfig.rewardedVideoRewardHearts;
            }
        }
        const nextHearts = Math.min(MAX_HEARTS, clampHearts(userData.hearts) + grantedHearts);
        if (grantedHearts > 0) {
            nextHistory = appendHistory(nextHistory, {
                type: 'AD',
                value: grantedHearts,
                date: new Date().toISOString(),
            });
        }
        const nextUser = Object.assign(Object.assign({}, userData), { hearts: nextHearts, rewardedVideoStreak: nextStreak, gameHistory: nextHistory });
        transaction.update(rewardRef, {
            claimedAt: serverTimestamp(),
            grantedHearts,
            resolvedVideoStreak: nextStreak,
            resolvedAt: serverTimestamp(),
        });
        transaction.set(userRef, Object.assign(Object.assign({ hearts: nextHearts, rewardedVideoStreak: nextStreak }, (grantedHearts > 0 ? { gameHistory: nextHistory } : {})), { updatedAt: serverTimestamp() }), { merge: true });
        transaction.set(leaderboardRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = {
            status: 'claimed',
            grantedHearts,
            user: buildUserSnapshot(nextUser),
        };
    });
    return response;
});
exports.rewardReferral = functions.https.onCall(async (request) => {
    var _a;
    const payload = normalizePayload(request.data);
    const referralCode = firstParam(payload.referralCode);
    const referredUserId = firstParam(payload.referredUserId);
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || !referredUserId || request.auth.uid !== referredUserId) {
        throw new functions.https.HttpsError('permission-denied', 'Authenticated user mismatch');
    }
    if (!referralCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing referral code');
    }
    const q = db.collection('users').where('referralCode', '==', referralCode).limit(1);
    const snap = await q.get();
    if (snap.empty) {
        return { status: 'missing_referrer' };
    }
    const referrerDoc = snap.docs[0];
    if (referrerDoc.id === referredUserId) {
        return { status: 'missing_referrer' };
    }
    const rewardRef = db.collection('referralRewards').doc(referredUserId);
    const referrerUserRef = db.collection('users').doc(referrerDoc.id);
    const referrerLeaderboardRef = db.collection('leaderboard').doc(referrerDoc.id);
    let status = 'granted';
    await db.runTransaction(async (transaction) => {
        var _a, _b;
        const existingReward = await transaction.get(rewardRef);
        if (existingReward.exists) {
            status = 'already_rewarded';
            return;
        }
        const [referrerUserSnap, referrerLeaderboardSnap] = await Promise.all([
            transaction.get(referrerUserRef),
            transaction.get(referrerLeaderboardRef),
        ]);
        const referrerUserData = (referrerUserSnap.exists ? referrerUserSnap.data() : {});
        const referrerLeaderboardData = (referrerLeaderboardSnap.exists ? referrerLeaderboardSnap.data() : {});
        const rewardEvent = { type: 'INVITE', value: 1, date: new Date().toISOString() };
        const referrerHistory = appendHistory(referrerUserData.gameHistory, rewardEvent);
        const referrerUserHearts = clampHearts((_a = referrerUserData.hearts) !== null && _a !== void 0 ? _a : referrerLeaderboardData.hearts);
        const referrerLeaderboardHearts = clampHearts((_b = referrerLeaderboardData.hearts) !== null && _b !== void 0 ? _b : referrerUserHearts);
        transaction.set(referrerUserRef, {
            hearts: Math.min(MAX_HEARTS, referrerUserHearts + 1),
            gameHistory: referrerHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(referrerLeaderboardRef, {
            hearts: Math.min(MAX_HEARTS, referrerLeaderboardHearts + 1),
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(rewardRef, {
            referralCode,
            referrerId: referrerDoc.id,
            referredUserId,
            grantedHearts: 1,
            rewardedAt: serverTimestamp(),
        }, { merge: true });
        await markReferralGrantedInUser(transaction, referredUserId);
    });
    return { status };
});
//# sourceMappingURL=index.js.map