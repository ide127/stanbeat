/**
 * League Ranking System
 * 
 * Generates a fully synthetic league of 100 players (99 synthetic + 1 real user).
 * Uses Gaussian (normal) distribution for all random values to ensure realism.
 * 
 * ALGORITHM ORDER (critical for consistency):
 * 1. Determine user's target rank based on previous rank using normal distribution
 * 2. Generate synthetic entries AROUND the user's position
 * 
 * This prevents the "got a personal best but dropped to 10th" problem.
 */

import { LeaderboardEntry } from './types';

// ─── Constants ────────────────────────────────────────────────────
const LEAGUE_SIZE_MIN = 60;
const LEAGUE_SIZE_MAX = 99;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_USER_RANK = 2;
const MAX_USER_RANK = 30;
const TOTAL_LEAGUES_MEAN = 3624;
const TOTAL_LEAGUES_STD = 15;

const adjectives = ['Lovely', 'Shiny', 'Happy', 'Bright', 'Neon', 'Cute', 'Royal', 'Lucky', 'Star', 'Dream', 'Sparkle', 'Moon', 'Sweet', 'Mystic', 'Crystal'];
const members = ['Jimin', 'V', 'JK', 'Hobi', 'SUGA', 'RM', 'Jin', 'ARMY', 'Kookie', 'TaeTae', 'Mochi', 'Tiger', 'Yoongi', 'Namjoon'];
const countries = ['KR', 'US', 'JP', 'BR', 'TH', 'ID', 'PH', 'FR', 'DE', 'VN', 'MX', 'AR', 'TR', 'IN', 'GB', 'ES', 'IT', 'PL', 'RU', 'MY'];

// ─── Types ────────────────────────────────────────────────────────
export interface LeagueData {
    leagueId: string;
    leagueSize: number;
    totalLeagues: number;
    lastRefresh: number;
    entries: LeaderboardEntry[];
    userRank: number;
    userBestAtGeneration: number | null;
}

// ─── Gaussian Random (Box-Muller Transform) ──────────────────────
/**
 * Generates a normally-distributed random number.
 * Uses the Box-Muller transform for true Gaussian distribution.
 */
export function gaussianRandom(mean: number, stdDev: number): number {
    let u1 = 0;
    let u2 = 0;
    // Avoid log(0)
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * stdDev;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Generate a hard-to-compare, random-looking league ID.
 * Uses a combination of hash + random components to create a hex-like string
 * that is virtually impossible to compare between users.
 */
function generateLeagueId(userId: string): string {
    // Mix day-of-year into league ID so it changes daily
    const dayOfYear = getCurrentSeasonNumber();
    const hash = hashCode(userId + 'league_v3_day' + dayOfYear);
    const part1 = ((Math.abs(hash) * 2654435761) >>> 0).toString(16).padStart(8, '0');
    const part2 = ((Math.abs(hash * 7 + 13) * 2246822519) >>> 0).toString(16).padStart(8, '0');
    return `${part1}-${part2}`.toUpperCase();
}

/** Generate a random league size between 60-99, seeded by userId + day */
function getLeagueSize(userId: string): number {
    const dayOfYear = getCurrentSeasonNumber();
    const hash = Math.abs(hashCode(userId + 'size_v1_day' + dayOfYear));
    return LEAGUE_SIZE_MIN + (hash % (LEAGUE_SIZE_MAX - LEAGUE_SIZE_MIN + 1));
}

/** Generate a synthetic nickname */
function generateSyntheticNickname(seed: number): string {
    const adj = adjectives[seed % adjectives.length];
    const member = members[(seed * 7 + 3) % members.length];
    const num = ((seed * 13 + 7) % 9000 + 1000).toString();
    return `${adj}${member}_${num}`;
}

/** Generate a synthetic avatar URL (deterministic per seed) */
function syntheticAvatar(seed: number): string {
    return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=stanbeat${seed}`;
}

// ─── Core League Generation ──────────────────────────────────────
/**
 * Generate a complete league with 100 players.
 * 
 * @param userTime - User's best time in milliseconds
 * @param userId - User's unique ID
 * @param userNickname - User's display name
 * @param userCountry - User's country code
 * @param userAvatarUrl - User's avatar URL
 * @param previousRank - User's rank from last generation (null if first time)
 * @param hasNewBest - Whether user has achieved a new personal best since last generation
 */
export function generateLeague(
    userTime: number,
    userId: string,
    userNickname: string,
    userCountry: string,
    userAvatarUrl: string,
    previousRank: number | null,
    hasNewBest: boolean,
): LeagueData {
    const leagueSize = getLeagueSize(userId);
    // 1. DETERMINE USER'S TARGET RANK
    let targetRank: number;
    if (previousRank === null) {
        // First time: sample from N(15, 5) for wider 2-30 range
        targetRank = Math.round(gaussianRandom(15, 5));
    } else if (hasNewBest) {
        // User improved: trend rank upward (closer to 2)
        targetRank = Math.round(gaussianRandom(previousRank - 2, 2));
    } else {
        // Regular refresh: slight drift around current rank
        targetRank = Math.round(gaussianRandom(previousRank, 2.5));
    }
    targetRank = clamp(targetRank, MIN_USER_RANK, Math.min(MAX_USER_RANK, leagueSize - 5));

    // 2. GENERATE RANK 1 ENTRY (always slightly faster than user)
    const gapToFirst = Math.abs(gaussianRandom(1500, 500)); // ~1.5s faster on average
    const rank1Time = Math.max(5000, userTime - gapToFirst); // Minimum 5 seconds

    // 3. BUILD ENTRIES ARRAY
    const entries: LeaderboardEntry[] = [];
    const baseSeed = Math.abs(hashCode(userId + 'league'));

    // Rank 1 entry
    entries.push(createSyntheticEntry(1, rank1Time, baseSeed + 1));

    // Entries between rank 1 and user (ranks 2 to targetRank-1)
    for (let rank = 2; rank < targetRank; rank++) {
        const fraction = (rank - 1) / (targetRank - 1);
        const interpolatedTime = rank1Time + (userTime - rank1Time) * fraction;
        const noise = gaussianRandom(0, 300); // ±300ms noise
        const time = Math.max(rank1Time, Math.round(interpolatedTime + noise));
        entries.push(createSyntheticEntry(rank, time, baseSeed + rank));
    }

    // User entry at targetRank
    entries.push({
        id: userId,
        nickname: userNickname,
        country: userCountry,
        avatarUrl: userAvatarUrl,
        time: userTime,
        rank: targetRank,
        isCurrentUser: true,
        isBot: false,
    });

    // Entries below user (ranks targetRank+1 to leagueSize)
    let prevTime = userTime;
    for (let rank = targetRank + 1; rank <= leagueSize; rank++) {
        const increment = Math.abs(gaussianRandom(500, 200)); // ~500ms slower per rank
        prevTime = prevTime + increment;
        entries.push(createSyntheticEntry(rank, Math.round(prevTime), baseSeed + rank));
    }

    // 4. SORT & RE-ASSIGN RANKS (ensure consistency after noise)
    entries.sort((a, b) => a.time - b.time);
    entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
    });

    // Find user's actual rank after sorting
    const actualUserRank = entries.findIndex((e) => e.isCurrentUser) + 1;

    // 5. GENERATE LEAGUE METADATA
    const totalLeagues = Math.round(gaussianRandom(TOTAL_LEAGUES_MEAN, TOTAL_LEAGUES_STD));

    return {
        leagueId: generateLeagueId(userId),
        leagueSize,
        totalLeagues: Math.max(3500, totalLeagues),
        lastRefresh: Date.now(),
        entries,
        userRank: actualUserRank,
        userBestAtGeneration: userTime,
    };
}

/**
 * Generate showcase data for guest/non-logged-in users.
 * Returns 10 random league winners to display as motivation.
 */
export function generateGuestShowcase(): { winners: LeaderboardEntry[]; totalLeagues: number } {
    const totalLeagues = Math.round(gaussianRandom(TOTAL_LEAGUES_MEAN, TOTAL_LEAGUES_STD));
    const winners: LeaderboardEntry[] = [];

    for (let i = 0; i < 10; i++) {
        const seed = Math.floor(Math.random() * 100000) + i * 7919; // prime-spaced seeds
        const time = Math.round(8000 + Math.abs(gaussianRandom(4000, 2000))); // 8s ~ 14s
        const leagueHash = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0').toUpperCase();
        winners.push({
            id: `guest_showcase_${i}`,
            nickname: generateSyntheticNickname(seed),
            country: countries[seed % countries.length],
            avatarUrl: syntheticAvatar(seed),
            time,
            rank: 1,
            isCurrentUser: false,
            isBot: true,
            leagueLabel: leagueHash.slice(0, 8), // Show league hash for display
        });
    }

    return { winners, totalLeagues: Math.max(3500, totalLeagues) };
}

/**
 * Generate a view-only league for logged-in users with no game record.
 * Shows a full league (60-99 players) without placing the user in it.
 * Used for the leaderboard screen when user hasn't played yet.
 */
export function generateViewOnlyLeague(userId: string): LeagueData {
    const leagueSize = getLeagueSize(userId);
    const totalLeagues = Math.round(gaussianRandom(TOTAL_LEAGUES_MEAN, TOTAL_LEAGUES_STD));
    const baseSeed = Math.abs(hashCode(userId + 'view_league'));

    // Generate rank 1 time: realistic top time
    const rank1Time = Math.round(8000 + Math.abs(gaussianRandom(3000, 1500))); // 8s ~ 14s

    const entries: LeaderboardEntry[] = [];
    let prevTime = rank1Time;

    for (let rank = 1; rank <= leagueSize; rank++) {
        entries.push(createSyntheticEntry(rank, prevTime, baseSeed + rank));
        const increment = Math.abs(gaussianRandom(500, 200));
        prevTime = prevTime + increment;
    }

    // Sort & re-assign ranks
    entries.sort((a, b) => a.time - b.time);
    entries.forEach((entry, idx) => { entry.rank = idx + 1; });

    return {
        leagueId: generateLeagueId(userId),
        leagueSize,
        totalLeagues: Math.max(3500, totalLeagues),
        lastRefresh: Date.now(),
        entries,
        userRank: 0,
        userBestAtGeneration: null,
    };
}

/**
 * Refresh the league if 30 minutes have passed.
 * Returns the same league data if not enough time has passed.
 */
export function refreshLeagueIfNeeded(
    current: LeagueData | null,
    userTime: number | null,
    userId: string,
    userNickname: string,
    userCountry: string,
    userAvatarUrl: string,
): LeagueData | null {
    if (!userTime) return current;

    const now = Date.now();

    if (!current) {
        // First time: generate fresh league
        return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, null, false);
    }

    const timeSinceRefresh = now - current.lastRefresh;
    if (timeSinceRefresh < REFRESH_INTERVAL_MS) {
        // Not enough time passed, but if user got a new best, regenerate immediately
        const hasNewBest = current.userBestAtGeneration !== null && userTime < current.userBestAtGeneration;
        if (hasNewBest) {
            return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, current.userRank, true);
        }
        return current;
    }

    // 30 minutes passed: refresh with rank continuity
    const hasNewBest = current.userBestAtGeneration !== null && userTime < current.userBestAtGeneration;
    return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, current.userRank, hasNewBest);
}

/**
 * Get the time gap between user and rank 1 in milliseconds.
 */
export function getGapToFirst(league: LeagueData): number {
    const firstEntry = league.entries[0];
    const userEntry = league.entries.find((e) => e.isCurrentUser);
    if (!firstEntry || !userEntry) return 0;
    return userEntry.time - firstEntry.time;
}

/**
 * Format the remaining time until next refresh as mm:ss.
 */
export function getRefreshCountdown(league: LeagueData): string {
    const elapsed = Date.now() - league.lastRefresh;
    const remaining = Math.max(0, REFRESH_INTERVAL_MS - elapsed);
    const totalSec = Math.floor(remaining / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/**
 * Calculate the current season number for 2026.
 * Season = day of the year (1-based).
 * Returns the season number.
 */
export function getCurrentSeasonNumber(): number {
    const now = new Date();
    const startOfYear = new Date(now.getUTCFullYear(), 0, 1);
    const diffMs = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    return dayOfYear;
}

/**
 * Get milliseconds until next UTC midnight (daily season end).
 */
export function getMsUntilNextUtcMidnight(): number {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    return nextMidnight.getTime() - now.getTime();
}

// ─── Helper Functions ────────────────────────────────────────────
function createSyntheticEntry(rank: number, time: number, seed: number): LeaderboardEntry {
    return {
        id: `syn_${seed}`,
        nickname: generateSyntheticNickname(seed),
        country: countries[seed % countries.length],
        avatarUrl: syntheticAvatar(seed),
        time,
        rank,
        isCurrentUser: false,
        isBot: true, // Hidden from UI, used internally
    };
}

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
