import type { LeaderboardEntry } from './types';
import { generateAvatarUrl } from './utils';

export const LEAGUE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const DEFAULT_RUNTIME_CONFIG = {
  botTimeMean: 50000,
  botTimeStdDev: 15000,
  leagueSizeMin: 60,
  leagueSizeMax: 99,
  totalLeaguesMean: 3624,
  totalLeaguesStdDev: 15,
  overtakeGapMin: 100,
  overtakeGapMax: 500,
  showcaseTimeMean: 8000,
  showcaseTimeStdDev: 2000,
  totalLeaguesFloor: 3500,
};

const MIN_USER_RANK = 2;
const MAX_USER_RANK = 30;
const MIN_OVERTAKE_TIME_MS = 1000;
const adjectives = ['Lovely', 'Shiny', 'Happy', 'Bright', 'Neon', 'Cute', 'Royal', 'Lucky', 'Star', 'Dream', 'Sparkle', 'Moon', 'Sweet', 'Mystic', 'Crystal'];
const members = ['Jimin', 'V', 'JK', 'Hobi', 'SUGA', 'RM', 'Jin', 'ARMY', 'Kookie', 'TaeTae', 'Mochi', 'Tiger', 'Yoongi', 'Namjoon'];
const countries = ['KR', 'US', 'JP', 'BR', 'TH', 'ID', 'PH', 'FR', 'DE', 'VN', 'MX', 'AR', 'TR', 'IN', 'GB', 'ES', 'IT', 'PL', 'RU', 'MY'];
const leagueDescriptors = ['Purple', 'Neon', 'Stadium', 'Cosmic', 'Golden', 'Velvet', 'Satellite', 'Midnight', 'Echo', 'Silver', 'Firefly', 'Crystal'];
const leagueNouns = ['Wave', 'Pulse', 'Stage', 'Orbit', 'Signal', 'Rush', 'Crown', 'Arena', 'Spark', 'Drift', 'Flight', 'Rhythm'];

export interface LeagueRuntimeConfig {
  botTimeMean: number;
  botTimeStdDev: number;
  leagueSizeMin: number;
  leagueSizeMax: number;
  totalLeaguesMean: number;
  totalLeaguesStdDev: number;
  overtakeGapMin: number;
  overtakeGapMax: number;
  showcaseTimeMean: number;
  showcaseTimeStdDev: number;
  totalLeaguesFloor: number;
}

export interface LeagueData {
  leagueId: string;
  displayName: string;
  leagueSize: number;
  totalLeagues: number;
  lastRefresh: number;
  entries: LeaderboardEntry[];
  userRank: number;
  userBestAtGeneration: number | null;
}

export interface LeagueFocus {
  mode: 'rival' | 'summit' | 'defend';
  gapMs: number;
  targetRank: number;
  rivalName?: string;
  milestoneGapMs?: number;
  milestoneRank?: number;
}

function getRefreshBucket(at: number = Date.now()): number {
  return Math.floor(at / LEAGUE_REFRESH_INTERVAL_MS);
}

function resolveRuntimeConfig(config: Partial<LeagueRuntimeConfig> = {}): LeagueRuntimeConfig {
  const merged = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  const leagueSizeMin = Math.max(1, Math.round(merged.leagueSizeMin));
  const leagueSizeMax = Math.max(leagueSizeMin, Math.round(merged.leagueSizeMax));
  const overtakeGapMin = Math.max(1, Math.round(merged.overtakeGapMin));
  const overtakeGapMax = Math.max(overtakeGapMin, Math.round(merged.overtakeGapMax));

  return {
    ...merged,
    botTimeMean: Math.max(5000, Math.round(merged.botTimeMean)),
    botTimeStdDev: Math.max(100, Math.round(merged.botTimeStdDev)),
    leagueSizeMin,
    leagueSizeMax,
    totalLeaguesMean: Math.max(1, Math.round(merged.totalLeaguesMean)),
    totalLeaguesStdDev: Math.max(0, Math.round(merged.totalLeaguesStdDev)),
    overtakeGapMin,
    overtakeGapMax,
    showcaseTimeMean: Math.max(1000, Math.round(merged.showcaseTimeMean)),
    showcaseTimeStdDev: Math.max(100, Math.round(merged.showcaseTimeStdDev)),
    totalLeaguesFloor: Math.max(1, Math.round(merged.totalLeaguesFloor)),
  };
}

export function gaussianRandom(mean: number, stdDev: number): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stdDev;
}

function seededUnit(seed: number, salt: number): number {
  const raw = Math.sin((seed + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
  const fractional = raw - Math.floor(raw);
  return fractional <= 0 ? 0.000001 : fractional;
}

function seededGaussian(seed: number, mean: number, stdDev: number): number {
  const u1 = seededUnit(seed, 17);
  const u2 = seededUnit(seed, 53);
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stdDev;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function generateLeagueId(userId: string): string {
  const dayOfYear = getCurrentSeasonNumber();
  const hash = hashCode(userId + 'league_v3_day' + dayOfYear);
  const part1 = ((Math.abs(hash) * 2654435761) >>> 0).toString(16).padStart(8, '0');
  const part2 = ((Math.abs(hash * 7 + 13) * 2246822519) >>> 0).toString(16).padStart(8, '0');
  return `${part1}-${part2}`.toUpperCase();
}

export function generateDisplayLeagueName(seedSource: string | number): string {
  const seed = Math.abs(hashCode(String(seedSource)));
  const descriptor = leagueDescriptors[seed % leagueDescriptors.length];
  const noun = leagueNouns[(seed * 7 + 11) % leagueNouns.length];
  const bracket = (seed % 87) + 13;
  return `${descriptor} ${noun} ${bracket}`;
}

function getTotalLeaguesForBucket(refreshBucket: number, runtimeConfig: Partial<LeagueRuntimeConfig> = {}): number {
  const config = resolveRuntimeConfig(runtimeConfig);
  const seed = Math.abs(hashCode(`total-leagues:${refreshBucket}`));
  const totalLeagues = Math.round(seededGaussian(seed, config.totalLeaguesMean, config.totalLeaguesStdDev));
  return Math.max(config.totalLeaguesFloor, totalLeagues);
}

function getLeagueSize(userId: string, runtimeConfig: Partial<LeagueRuntimeConfig> = {}): number {
  const config = resolveRuntimeConfig(runtimeConfig);
  const dayOfYear = getCurrentSeasonNumber();
  const hash = Math.abs(hashCode(userId + 'size_v1_day' + dayOfYear));
  return config.leagueSizeMin + (hash % (config.leagueSizeMax - config.leagueSizeMin + 1));
}

function generateSyntheticNickname(seed: number): string {
  const adj = adjectives[seed % adjectives.length];
  const member = members[(seed * 7 + 3) % members.length];
  const num = ((seed * 13 + 7) % 9000 + 1000).toString();
  return `${adj}${member}_${num}`;
}

function syntheticAvatar(seed: number): string {
  const name = generateSyntheticNickname(seed);
  return generateAvatarUrl(`synthetic:${seed}`, name);
}

function createSyntheticEntry(rank: number, time: number, seed: number): LeaderboardEntry {
  return {
    id: `syn_${seed}`,
    nickname: generateSyntheticNickname(seed),
    country: countries[seed % countries.length],
    avatarUrl: syntheticAvatar(seed),
    time,
    rank,
    isCurrentUser: false,
    isBot: true,
  };
}

function buildUserEntry(
  userId: string,
  userNickname: string,
  userCountry: string,
  userAvatarUrl: string,
  userTime: number,
): LeaderboardEntry {
  return {
    id: userId,
    nickname: userNickname,
    country: userCountry,
    avatarUrl: userAvatarUrl,
    time: userTime,
    rank: 0,
    isCurrentUser: true,
    isBot: false,
  };
}

function sortAndRankEntries(entries: LeaderboardEntry[]): { entries: LeaderboardEntry[]; userRank: number } {
  const sorted = [...entries].sort((a, b) => a.time - b.time);
  sorted.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });
  return {
    entries: sorted,
    userRank: sorted.findIndex((entry) => entry.isCurrentUser) + 1,
  };
}

function isCurrentUserLeading(league: LeagueData): boolean {
  const userEntry = league.entries.find((entry) => entry.isCurrentUser);
  if (!userEntry) return false;
  return userEntry.rank === 1 || !league.entries.some((entry) => !entry.isCurrentUser && entry.time < userEntry.time);
}

function getBotTimeForRefresh(
  entryId: string,
  refreshBucket: number,
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
): number {
  const config = resolveRuntimeConfig(runtimeConfig);
  const seed = Math.abs(hashCode(`${entryId}:${refreshBucket}`));
  return Math.max(5000, Math.round(seededGaussian(seed, config.botTimeMean, config.botTimeStdDev)));
}

function rebuildLeagueWithCurrentMembers(
  current: LeagueData,
  userTime: number,
  userId: string,
  userNickname: string,
  userCountry: string,
  userAvatarUrl: string,
  refreshBucket: number | null,
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
  overtakeUser: boolean = false,
): LeagueData {
  const config = resolveRuntimeConfig(runtimeConfig);
  const nextEntries = current.entries
    .filter((entry) => !entry.isCurrentUser)
    .map((entry) => ({
      ...entry,
      time: refreshBucket === null ? entry.time : getBotTimeForRefresh(entry.id, refreshBucket, config),
      isCurrentUser: false,
      isBot: true,
    }));

  if (overtakeUser && nextEntries.length > 0 && !nextEntries.some((entry) => entry.time < userTime)) {
    const fastestEntry = nextEntries.reduce((best, entry) => entry.time < best.time ? entry : best, nextEntries[0]);
    const gapRange = config.overtakeGapMax - config.overtakeGapMin + 1;
    const gapSeed = Math.abs(hashCode(`${fastestEntry.id}:overtake:${refreshBucket ?? current.lastRefresh}`));
    const overtakeGap = config.overtakeGapMin + (gapSeed % gapRange);
    fastestEntry.time = Math.max(MIN_OVERTAKE_TIME_MS, userTime - overtakeGap);
  }

  const userEntry = buildUserEntry(userId, userNickname, userCountry, userAvatarUrl, userTime);
  const { entries, userRank } = sortAndRankEntries([...nextEntries, userEntry]);
  const nextLastRefresh = refreshBucket === null ? current.lastRefresh : Date.now();

  return {
    ...current,
    entries,
    userRank,
    totalLeagues: refreshBucket === null ? current.totalLeagues : getTotalLeaguesForBucket(refreshBucket, config),
    lastRefresh: nextLastRefresh,
    userBestAtGeneration: userTime,
  };
}

export function generateLeague(
  userTime: number,
  userId: string,
  userNickname: string,
  userCountry: string,
  userAvatarUrl: string,
  previousRank: number | null,
  hasNewBest: boolean,
  overtakeUser: boolean = false,
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
): LeagueData {
  const config = resolveRuntimeConfig(runtimeConfig);
  const leagueSize = getLeagueSize(userId, config);
  const baseSeed = Math.abs(hashCode(userId + 'league_v4'));
  const entries: LeaderboardEntry[] = [];

  const skillDelta = (config.botTimeMean - userTime) / Math.max(config.botTimeStdDev, 1);
  const baselineRank = clamp(
    Math.round(leagueSize * (0.46 - skillDelta * 0.18)),
    MIN_USER_RANK,
    Math.min(MAX_USER_RANK, leagueSize - 1),
  );

  let targetRank = baselineRank;
  if (previousRank !== null && !hasNewBest) {
    targetRank = clamp(
      Math.round(gaussianRandom(previousRank, 1.4)),
      MIN_USER_RANK,
      Math.min(MAX_USER_RANK, leagueSize - 1),
    );
  } else if (previousRank !== null && hasNewBest) {
    const improvementJump = Math.max(1, Math.round(Math.max(1, previousRank - baselineRank) * 0.72));
    targetRank = clamp(previousRank - improvementJump, MIN_USER_RANK, previousRank);
  }

  for (let i = 0; i < leagueSize - 1; i++) {
    const seed = baseSeed + i * 13;
    let rawTime = Math.round(gaussianRandom(config.botTimeMean, config.botTimeStdDev));
    rawTime = Math.max(5000, rawTime);
    entries.push(createSyntheticEntry(0, rawTime, seed));
  }

  entries.sort((a, b) => a.time - b.time);

  if (targetRank > 1 && entries[targetRank - 2]) {
    const aheadTime = entries[targetRank - 2].time;
    const behindTime = entries[targetRank - 1]?.time ?? aheadTime + 5000;
    userTime = clamp(userTime, aheadTime + 1, Math.max(aheadTime + 1, behindTime - 1));
  }

  if (overtakeUser) {
    let hasFasterBot = false;
    for (const entry of entries) {
      if (entry.time < userTime) {
        hasFasterBot = true;
        break;
      }
    }

    if (!hasFasterBot && entries.length > 0) {
      const fastestBot = entries[0];
      const gapRange = config.overtakeGapMax - config.overtakeGapMin + 1;
      const randomOvertakeGap = config.overtakeGapMin + Math.floor(Math.random() * gapRange);
      fastestBot.time = Math.max(MIN_OVERTAKE_TIME_MS, userTime - randomOvertakeGap);
    }
  }

  const userEntry = buildUserEntry(userId, userNickname, userCountry, userAvatarUrl, userTime);
  const ranked = sortAndRankEntries([...entries, userEntry]);
  const refreshBucket = getRefreshBucket();

  return {
    leagueId: generateLeagueId(userId),
    displayName: generateDisplayLeagueName(`${userId}:${getCurrentSeasonNumber()}`),
    leagueSize,
    totalLeagues: getTotalLeaguesForBucket(refreshBucket, config),
    lastRefresh: Date.now(),
    entries: ranked.entries,
    userRank: ranked.userRank,
    userBestAtGeneration: userTime,
  };
}

export function generateGuestShowcase(
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
): { winners: LeaderboardEntry[]; totalLeagues: number } {
  const config = resolveRuntimeConfig(runtimeConfig);
  const totalLeagues = getTotalLeaguesForBucket(getRefreshBucket(), config);
  const winners: LeaderboardEntry[] = [];

  for (let i = 0; i < 10; i++) {
    const seed = Math.floor(Math.random() * 100000) + i * 7919;
    const time = Math.max(3000, Math.round(config.showcaseTimeMean + Math.abs(gaussianRandom(4000, config.showcaseTimeStdDev))));
    winners.push({
      id: `guest_showcase_${i}`,
      nickname: generateSyntheticNickname(seed),
      country: countries[seed % countries.length],
      avatarUrl: syntheticAvatar(seed),
      time,
      rank: 1,
      isCurrentUser: false,
      isBot: true,
      leagueLabel: generateDisplayLeagueName(seed),
    });
  }

  return { winners, totalLeagues: Math.max(config.totalLeaguesFloor, totalLeagues) };
}

export function generateViewOnlyLeague(
  userId: string,
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
): LeagueData {
  const config = resolveRuntimeConfig(runtimeConfig);
  const leagueSize = getLeagueSize(userId, config);
  const baseSeed = Math.abs(hashCode(userId + 'view_league_v4'));
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < leagueSize; i++) {
    const seed = baseSeed + i * 13;
    let rawTime = Math.round(gaussianRandom(config.botTimeMean, config.botTimeStdDev));
    rawTime = Math.max(5000, rawTime);
    entries.push(createSyntheticEntry(0, rawTime, seed));
  }

  entries.sort((a, b) => a.time - b.time);
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return {
    leagueId: generateLeagueId(userId),
    displayName: generateDisplayLeagueName(`${userId}:preview:${getCurrentSeasonNumber()}`),
    leagueSize,
    totalLeagues: getTotalLeaguesForBucket(getRefreshBucket(), config),
    lastRefresh: Date.now(),
    entries,
    userRank: 0,
    userBestAtGeneration: null,
  };
}

export function refreshLeagueIfNeeded(
  current: LeagueData | null,
  userTime: number | null,
  userId: string,
  userNickname: string,
  userCountry: string,
  userAvatarUrl: string,
  runtimeConfig: Partial<LeagueRuntimeConfig> = {},
): LeagueData | null {
  if (!userTime) return current;

  const now = Date.now();
  if (!current || !current.displayName) {
    return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, null, false, false, runtimeConfig);
  }

  const hasNewBest = current.userBestAtGeneration === null || userTime < current.userBestAtGeneration;
  const timeSinceRefresh = now - current.lastRefresh;
  if (timeSinceRefresh < LEAGUE_REFRESH_INTERVAL_MS) {
    if (hasNewBest) {
      return rebuildLeagueWithCurrentMembers(
        current,
        userTime,
        userId,
        userNickname,
        userCountry,
        userAvatarUrl,
        null,
        runtimeConfig,
        false,
      );
    }
    return current;
  }

  return rebuildLeagueWithCurrentMembers(
    current,
    userTime,
    userId,
    userNickname,
    userCountry,
    userAvatarUrl,
    getRefreshBucket(now),
    runtimeConfig,
    isCurrentUserLeading(current),
  );
}

export function getGapToFirst(league: LeagueData): number {
  const firstEntry = league.entries[0];
  const userEntry = league.entries.find((entry) => entry.isCurrentUser);
  if (!firstEntry || !userEntry) return 0;
  return userEntry.time - firstEntry.time;
}

export function getProjectedRankForTime(league: LeagueData, time: number): number {
  const activeEntries = league.entries.filter((entry) => !entry.isCurrentUser);
  const fasterCount = activeEntries.filter((entry) => entry.time < time).length;
  return fasterCount + 1;
}

export function getLeagueFocus(league: LeagueData): LeagueFocus | null {
  const userEntry = league.entries.find((entry) => entry.isCurrentUser);
  if (!userEntry) return null;

  if (userEntry.rank === 1) {
    const secondEntry = league.entries[1];
    return {
      mode: 'defend',
      gapMs: secondEntry ? Math.max(0, secondEntry.time - userEntry.time) : 0,
      targetRank: 1,
    };
  }

  if (userEntry.rank <= 3) {
    const firstEntry = league.entries[0];
    return {
      mode: 'summit',
      gapMs: Math.max(0, userEntry.time - firstEntry.time),
      targetRank: 1,
      rivalName: firstEntry.nickname,
    };
  }

  const rivalEntry = league.entries[userEntry.rank - 2];
  const milestoneRank = userEntry.rank > 10 ? 10 : 3;
  const milestoneEntry = league.entries[milestoneRank - 1];
  return {
    mode: 'rival',
    gapMs: rivalEntry ? Math.max(0, userEntry.time - rivalEntry.time) : 0,
    targetRank: rivalEntry?.rank ?? Math.max(1, userEntry.rank - 1),
    rivalName: rivalEntry?.nickname,
    milestoneRank,
    milestoneGapMs: milestoneEntry ? Math.max(0, userEntry.time - milestoneEntry.time) : undefined,
  };
}

export function getRefreshCountdown(league: LeagueData): string {
  const elapsed = Date.now() - league.lastRefresh;
  const remaining = Math.max(0, LEAGUE_REFRESH_INTERVAL_MS - elapsed);
  const totalSec = Math.floor(remaining / 1000);
  const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function getCurrentSeasonNumber(): number {
  const now = new Date();
  const startOfYearUtcMs = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  const diffMs = now.getTime() - startOfYearUtcMs;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function getMsUntilNextUtcMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return nextMidnight.getTime() - now.getTime();
}
