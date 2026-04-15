"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardReferral = exports.claimAdReward = exports.submitPlayResult = exports.claimDailyHeartReward = exports.syncUserProfile = exports.consumeHeartForGame = exports.applixirCallback = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const node_crypto_1 = require("node:crypto");
admin.initializeApp();
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
const increment = admin.firestore.FieldValue.increment;
const MAX_HEARTS = 3;
const MAX_HISTORY_ITEMS = 100;
const FREE_HEART_INTERVAL_MS = 6 * 60 * 60 * 1000;
const APPLIXIR_REWARD_FALLBACK_BUCKET_MS = 10 * 60 * 1000;
const applixirCallbackSecret = (0, params_1.defineSecret)('APPLIXIR_CALLBACK_SECRET');
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
function isFinalRewardStatus(status) {
    if (!status)
        return false;
    return /^(complete|completed|reward|rewarded|success|adcomplete|adcompleted|adwatched|alladscompleted|thankyoumodalclosed)$/i.test(status.replace(/[^a-z]/gi, ''));
}
function isValidApplixirUserId(value) {
    return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function secretsMatch(expected, provided) {
    if (!provided)
        return false;
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    return expectedBuffer.length === providedBuffer.length && (0, node_crypto_1.timingSafeEqual)(expectedBuffer, providedBuffer);
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
function parseRewardTimestamp(value) {
    if (typeof value !== 'string')
        return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function getNextFreeHeartAt(lastFreeHeart) {
    const lastMs = parseRewardTimestamp(lastFreeHeart);
    if (lastMs === null)
        return null;
    return new Date(lastMs + FREE_HEART_INTERVAL_MS).toISOString();
}
function sanitizeCallbackPayload(payload) {
    const redactedKeys = new Set(['secret', 'secretkey', 'secretKey', 'token', 'callbackSecret', 'callback_secret']);
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        sanitized[key] = redactedKeys.has(key) ? '[redacted]' : value;
    }
    return sanitized;
}
function buildUserSnapshot(userData) {
    return {
        hearts: clampHearts(userData.hearts),
        bestTime: asNullableBestTime(userData.bestTime),
        lastDailyHeart: typeof userData.lastDailyHeart === 'string' ? userData.lastDailyHeart : null,
        nextFreeHeartAt: getNextFreeHeartAt(userData.lastDailyHeart),
        gameHistory: sanitizeHistory(userData.gameHistory),
        rewardedVideoStreak: Math.max(0, Math.floor(asNumber(userData.rewardedVideoStreak))),
        referralRewardGranted: Boolean(userData.referralRewardGranted),
    };
}
function sanitizeUserProfilePayload(payload) {
    var _a, _b, _c, _d, _e;
    const applixirUserId = firstParam(payload.applixirUserId);
    if (!isValidApplixirUserId(applixirUserId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid applixirUserId');
    }
    return {
        nickname: (_a = firstParam(payload.nickname)) !== null && _a !== void 0 ? _a : '',
        email: (_b = firstParam(payload.email)) !== null && _b !== void 0 ? _b : '',
        avatarUrl: (_c = firstParam(payload.avatarUrl)) !== null && _c !== void 0 ? _c : '',
        country: (_d = firstParam(payload.country)) !== null && _d !== void 0 ? _d : 'KR',
        agreedToTerms: Boolean(payload.agreedToTerms),
        applixirUserId,
        gameHistory: sanitizeHistory(payload.gameHistory),
        referralCode: firstParam(payload.referralCode),
        referredBy: (_e = firstParam(payload.referredBy)) !== null && _e !== void 0 ? _e : null,
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
async function resolveApplixirRewardUser(callbackUserId) {
    const directUserSnap = await db.collection('users').doc(callbackUserId).get();
    if (directUserSnap.exists) {
        const directUserData = directUserSnap.data();
        const directApplixirUserId = firstParam(directUserData.applixirUserId);
        return {
            userId: directUserSnap.id,
            applixirUserId: isValidApplixirUserId(directApplixirUserId) ? directApplixirUserId : null,
        };
    }
    if (!isValidApplixirUserId(callbackUserId))
        return null;
    const usersSnap = await db.collection('users')
        .where('applixirUserId', '==', callbackUserId)
        .limit(1)
        .get();
    const userDoc = usersSnap.docs[0];
    return userDoc ? { userId: userDoc.id, applixirUserId: callbackUserId } : null;
}
exports.applixirCallback = (0, https_1.onRequest)({ secrets: [applixirCallbackSecret] }, async (req, res) => {
    var _a;
    const query = normalizePayload(req.query);
    const body = normalizePayload(req.body);
    const headers = normalizePayload(req.headers);
    const expectedSecret = applixirCallbackSecret.value().trim();
    const providedSecret = firstParam(query.secret, query.secretkey, query.secretKey, query.token, query.callbackSecret, query.callback_secret, body.secret, body.secretkey, body.secretKey, body.token, body.callbackSecret, body.callback_secret, headers['x-applixir-secret'], headers['x-callback-secret']);
    if (!expectedSecret) {
        console.error('[AppLixir Callback] Secret is not configured');
        res.status(500).send('Callback secret not configured');
        return;
    }
    if (!secretsMatch(expectedSecret, providedSecret)) {
        console.error('[AppLixir Callback] Secret mismatch');
        res.status(403).send('Forbidden');
        return;
    }
    const callbackUserId = firstParam(query.userId, query.userid, query.user_id, query.user, query.applixirUserId, query.applixir_user_id, query.ppid, query.subid1, query.subId1, query.subid, query.sub_id, query.playerId, query.player_id, query.uid, body.userId, body.userid, body.user_id, body.user, body.applixirUserId, body.applixir_user_id, body.ppid, body.subid1, body.subId1, body.subid, body.sub_id, body.playerId, body.player_id, body.uid);
    if (!callbackUserId) {
        console.error('[AppLixir Callback] Missing user identifier');
        res.status(400).send('Missing user identifier');
        return;
    }
    const resolvedUser = await resolveApplixirRewardUser(callbackUserId);
    if (!resolvedUser) {
        console.error(`[AppLixir Callback] Unknown AppLixir user identifier: ${callbackUserId}`);
        res.status(400).send('Unknown user identifier');
        return;
    }
    const { userId, applixirUserId } = resolvedUser;
    const status = firstParam(query.status, query.event, query.type, body.status, body.event, body.type);
    if (!status) {
        console.warn(`[AppLixir Callback] Missing callback status for user ${userId}`);
        res.status(400).send('Missing callback status');
        return;
    }
    if (isFailureStatus(status)) {
        console.warn(`[AppLixir Callback] Ignoring failure status "${status}" for user ${userId}`);
        res.status(200).send('IGNORED');
        return;
    }
    if (!isFinalRewardStatus(status)) {
        console.warn(`[AppLixir Callback] Ignoring non-final status "${status}" for user ${userId}`);
        res.status(200).send('IGNORED');
        return;
    }
    const payout = asNumber(firstParam(query.payout, query.amount, body.payout, body.amount));
    const gameId = firstParam(query.gameId, query.game_id, query.game, body.gameId, body.game_id, body.game);
    const externalId = (_a = firstParam(query.transactionId, query.transaction_id, query.callbackId, query.eventId, query.rewardId, query.id, query.requestId, query.request_id, query.impressionId, query.impression_id, body.transactionId, body.transaction_id, body.callbackId, body.eventId, body.rewardId, body.id, body.requestId, body.request_id, body.impressionId, body.impression_id)) !== null && _a !== void 0 ? _a : `${callbackUserId}-${gameId !== null && gameId !== void 0 ? gameId : 'game'}-${Math.floor(Date.now() / APPLIXIR_REWARD_FALLBACK_BUCKET_MS)}`;
    const rewardDocId = `applixir_${externalId}`;
    try {
        const rewardRef = db.collection('adRewards').doc(rewardDocId);
        let createdReward = false;
        await db.runTransaction(async (transaction) => {
            const existingReward = await transaction.get(rewardRef);
            if (existingReward.exists) {
                transaction.set(rewardRef, {
                    callbackSeenAt: serverTimestamp(),
                    callbackReplayCount: increment(1),
                    lastProviderEvent: status,
                    lastRawPayload: {
                        method: req.method,
                        query: sanitizeCallbackPayload(query),
                        body: sanitizeCallbackPayload(body),
                    },
                }, { merge: true });
                return;
            }
            transaction.set(rewardRef, {
                userId,
                payout,
                provider: 'applixir',
                applixirUserId,
                callbackUserId,
                gameId: gameId !== null && gameId !== void 0 ? gameId : null,
                providerEvent: status,
                type: 'rewarded_video_applixir',
                createdAt: serverTimestamp(),
                claimedAt: null,
                rawPayload: {
                    method: req.method,
                    query: sanitizeCallbackPayload(query),
                    body: sanitizeCallbackPayload(body),
                },
            });
            createdReward = true;
        });
        if (createdReward) {
            await bumpGlobalRevenue(payout);
        }
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
exports.syncUserProfile = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const payload = normalizePayload(request.data);
    const profile = sanitizeUserProfilePayload(normalizePayload(payload.profile));
    const bootstrap = Boolean(payload.bootstrap);
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
        var _a, _b, _c;
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            transaction.set(userRef, {
                nickname: profile.nickname,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                hearts: 1,
                bestTime: null,
                role: 'USER',
                lastDailyHeart: null,
                agreedToTerms: profile.agreedToTerms,
                banned: false,
                gameHistory: [],
                referralCode: (_a = profile.referralCode) !== null && _a !== void 0 ? _a : userId.slice(0, 8),
                referredBy: profile.referredBy,
                referralRewardGranted: false,
                rewardedVideoStreak: 0,
                applixirUserId: profile.applixirUserId,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            return;
        }
        const existingUser = userSnap.data();
        transaction.set(userRef, {
            nickname: profile.nickname || String((_b = existingUser.nickname) !== null && _b !== void 0 ? _b : ''),
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            country: profile.country || String((_c = existingUser.country) !== null && _c !== void 0 ? _c : 'KR'),
            agreedToTerms: profile.agreedToTerms,
            applixirUserId: isValidApplixirUserId(firstParam(existingUser.applixirUserId))
                ? firstParam(existingUser.applixirUserId)
                : profile.applixirUserId,
            gameHistory: bootstrap ? sanitizeHistory(existingUser.gameHistory) : profile.gameHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    });
    return {};
});
exports.claimDailyHeartReward = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const userRef = db.collection('users').doc(userId);
    const leaderboardRef = db.collection('leaderboard').doc(userId);
    const nowIso = new Date().toISOString();
    const nowMs = Date.parse(nowIso);
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
        const lastFreeHeartMs = parseRewardTimestamp(userData.lastDailyHeart);
        const nextFreeHeartMs = lastFreeHeartMs === null ? 0 : lastFreeHeartMs + FREE_HEART_INTERVAL_MS;
        if (lastFreeHeartMs !== null && nowMs < nextFreeHeartMs) {
            response = { status: 'already_claimed', user: buildUserSnapshot(userData), nextFreeHeartAt: new Date(nextFreeHeartMs).toISOString() };
            return;
        }
        const currentHearts = clampHearts(userData.hearts);
        if (currentHearts >= MAX_HEARTS) {
            response = { status: 'max_hearts', user: buildUserSnapshot(userData), nextFreeHeartAt: null };
            return;
        }
        const nextHearts = Math.min(MAX_HEARTS, currentHearts + 1);
        const nextHistory = appendHistory(userData.gameHistory, {
            type: 'DAILY',
            value: 1,
            date: nowIso,
        });
        const nextUser = Object.assign(Object.assign({}, userData), { hearts: nextHearts, lastDailyHeart: nowIso, gameHistory: nextHistory });
        transaction.set(userRef, {
            hearts: nextHearts,
            lastDailyHeart: nowIso,
            gameHistory: nextHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(leaderboardRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = { status: 'claimed', user: buildUserSnapshot(nextUser), nextFreeHeartAt: getNextFreeHeartAt(nowIso) };
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
        const currentHearts = clampHearts(userData.hearts);
        const nextHearts = Math.min(MAX_HEARTS, currentHearts + grantedHearts);
        const actualGrantedHearts = Math.max(0, nextHearts - currentHearts);
        if (actualGrantedHearts > 0) {
            nextHistory = appendHistory(nextHistory, {
                type: 'AD',
                value: actualGrantedHearts,
                date: new Date().toISOString(),
            });
        }
        const nextUser = Object.assign(Object.assign({}, userData), { hearts: nextHearts, rewardedVideoStreak: nextStreak, gameHistory: nextHistory });
        transaction.update(rewardRef, {
            claimedAt: serverTimestamp(),
            grantedHearts: actualGrantedHearts,
            attemptedGrantedHearts: grantedHearts,
            resolvedVideoStreak: nextStreak,
            resolvedAt: serverTimestamp(),
        });
        transaction.set(userRef, Object.assign(Object.assign({ hearts: nextHearts, rewardedVideoStreak: nextStreak }, (actualGrantedHearts > 0 ? { gameHistory: nextHistory } : {})), { updatedAt: serverTimestamp() }), { merge: true });
        transaction.set(leaderboardRef, {
            hearts: nextHearts,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        response = {
            status: 'claimed',
            grantedHearts: actualGrantedHearts,
            rewardCapped: grantedHearts > 0 && actualGrantedHearts === 0,
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