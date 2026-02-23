/**
 * 리그 랭킹 시스템 (League Ranking System)
 *
 * 60~99명의 완전한 합성(synthetic) 리그를 생성합니다.
 * 모든 난수는 가우시안(정규) 분포를 사용하여 현실적인 데이터를 생성합니다.
 *
 * 알고리즘 순서 (순서 중요 — 일관성을 위해 변경 금지):
 * 1. 이전 순위를 기반으로 사용자의 목표 순위를 정규 분포로 결정
 * 2. 목표 순위 위아래로 합성 플레이어 데이터 생성
 *
 * 이 방식으로 "개인 최고 기록을 갱신했는데 오히려 순위가 내려가는" 문제를 방지합니다.
 */

import { LeaderboardEntry } from './types';

// ─── 상수 정의 ─────────────────────────────────────────────────────
const LEAGUE_SIZE_MIN = 60;                          // 리그 최소 인원 수
const LEAGUE_SIZE_MAX = 99;                          // 리그 최대 인원 수
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;          // 리그 자동 갱신 주기 (10분 = 600,000ms)
const MIN_USER_RANK = 2;                             // 사용자 최고 순위 제한 (1위는 항상 AI)
const MAX_USER_RANK = 30;                            // 사용자 최저 순위 제한 (너무 뒤로는 안 감)
const TOTAL_LEAGUES_MEAN = 3624;                     // 전체 리그 수 정규분포 평균
const TOTAL_LEAGUES_STD = 15;                        // 전체 리그 수 정규분포 표준편차

// 합성 닉네임 생성용 형용사 목록 (BTS 팬덤 감성)
const adjectives = ['Lovely', 'Shiny', 'Happy', 'Bright', 'Neon', 'Cute', 'Royal', 'Lucky', 'Star', 'Dream', 'Sparkle', 'Moon', 'Sweet', 'Mystic', 'Crystal'];
// 합성 닉네임 생성용 BTS 멤버/팬덤 관련 단어
const members = ['Jimin', 'V', 'JK', 'Hobi', 'SUGA', 'RM', 'Jin', 'ARMY', 'Kookie', 'TaeTae', 'Mochi', 'Tiger', 'Yoongi', 'Namjoon'];
// 합성 플레이어에게 랜덤으로 할당할 국가 코드 목록
const countries = ['KR', 'US', 'JP', 'BR', 'TH', 'ID', 'PH', 'FR', 'DE', 'VN', 'MX', 'AR', 'TR', 'IN', 'GB', 'ES', 'IT', 'PL', 'RU', 'MY'];

// ─── 타입 정의 ─────────────────────────────────────────────────────
// 리그 데이터 전체 구조 (로컬스토리지에 저장하고 store.ts에서 읽음)
export interface LeagueData {
    leagueId: string;                      // 리그 고유 식별자 (유저ID + 날짜로 생성된 해시값)
    leagueSize: number;                    // 이 리그의 총 플레이어 수 (60~99)
    totalLeagues: number;                  // 현재 전 세계에서 진행 중인 리그 수 (UI 표시용)
    lastRefresh: number;                   // 마지막으로 리그를 갱신한 타임스탬프 (밀리초)
    entries: LeaderboardEntry[];           // 정렬된 리더보드 항목 배열 (rank 오름차순)
    userRank: number;                      // 현재 유저의 리그 내 순위 (0이면 기록 없음)
    userBestAtGeneration: number | null;   // 리그 생성 시점의 유저 최고 기록 (신기록 감지에 사용)
}

// ─── 가우시안 난수 생성기 (Box-Muller 변환) ────────────────────────
/**
 * 정규 분포(가우시안)를 따르는 난수를 생성합니다.
 * Box-Muller 변환을 사용하여 균일 분포(Math.random)를 정규 분포로 변환.
 * 실제 경쟁 게임의 점수 분포와 유사한 데이터를 만들기 위해 사용.
 *
 * @param mean   - 분포의 평균값 (대부분의 값이 이 근처에 몰림)
 * @param stdDev - 표준편차 (값이 평균에서 얼마나 퍼지는지)
 */
export function gaussianRandom(mean: number, stdDev: number): number {
    // Box-Muller 변환에 사용할 0~1 사이의 균일 분포 난수 두 개를 담을 변수 선언
    let u1 = 0;
    let u2 = 0;
    // Math.random()이 정확히 0이 나오면 log() 계산 시 -Infinity가 되므로 0이 아닐 때까지 반복
    while (u1 === 0) u1 = Math.random(); // 첫 번째 균일 난수 생성
    while (u2 === 0) u2 = Math.random(); // 두 번째 균일 난수 생성
    // Box-Muller 공식을 이용해 두 균일 분포 난수를 표준 정규 분포(N(0, 1))를 따르는 난수 z로 변환
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    // 표준 정규 분포 난수 z에 표준편차(stdDev)를 곱해 퍼짐 정도를 맞추고, 평균(mean)을 더해 분포의 중심을 이동하여 반환
    return mean + z * stdDev;
}

/** 값을 min~max 범위로 클램핑 (범위를 벗어나지 않도록 강제) */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value)); // min보다 작으면 min, max보다 크면 max 반환
}

/**
 * 비교하기 어려운 리그 고유 ID 생성 (16자리 16진수 해시)
 * 유저 ID + 현재 날짜(시즌 번호)를 섞어 해시를 만들기 때문에:
 * - 같은 유저라도 날짜가 바뀌면 다른 리그 ID를 가짐 (일일 리그 로테이션)
 * - 다른 유저는 항상 다른 리그 ID를 가짐 (리그 비교 불가)
 */
function generateLeagueId(userId: string): string {
    // 오늘의 날짜를 기준으로 해당 시즌(하루)의 고유 번호를 가져옵니다.
    const dayOfYear = getCurrentSeasonNumber();
    // 유저의 고유 ID와 시즌 번호를 결합한 문자열을 이용해 해시값을 생성합니다. (매일 달라짐)
    const hash = hashCode(userId + 'league_v3_day' + dayOfYear);   // 유저ID + 날짜로 해시 생성
    // 생성된 해시값을 기반으로 첫 번째 8자리 16진수 파트를 생성 (양수로 변환 후 큰 소수를 곱하여 난수화)
    const part1 = ((Math.abs(hash) * 2654435761) >>> 0).toString(16).padStart(8, '0'); // 앞 8자리
    // 동일한 해시를 기반으로 변형을 주어 두 번째 8자리 16진수 파트를 생성
    const part2 = ((Math.abs(hash * 7 + 13) * 2246822519) >>> 0).toString(16).padStart(8, '0'); // 뒤 8자리
    // 두 해시 문자열을 하이픈으로 연결하고 대문자로 변환하여 고유하고 추측 어려운 ID 문자열 반환
    return `${part1}-${part2}`.toUpperCase(); // 대문자 16진수 형식으로 반환 (예: A1B2C3D4-E5F60708)
}

/** 유저ID + 날짜 기반으로 60~99 사이의 리그 크기를 결정적(deterministic)으로 생성
 *  같은 유저, 같은 날은 항상 동일한 리그 크기 → 새로고침마다 인원 수가 바뀌지 않음 */
function getLeagueSize(userId: string): number {
    // 올해의 며칠째인지 나타내는 시즌 번호를 가져와 날짜별 고유성을 확보
    const dayOfYear = getCurrentSeasonNumber();
    // 유저 ID와 날짜 정보를 조합한 문자열에 대해 해시 함수를 돌려 양수 값을 추출
    const hash = Math.abs(hashCode(userId + 'size_v1_day' + dayOfYear));
    // 최대 인원과 최소 인원의 차이(+1)로 나눈 나머지 연산에 최소 인원을 더해 60~99 분포 반환
    return LEAGUE_SIZE_MIN + (hash % (LEAGUE_SIZE_MAX - LEAGUE_SIZE_MIN + 1));
}

/** seed 값으로부터 결정적으로 BTS 팬덤 스타일 닉네임 생성
 *  예: seed=42 → 'ShinyJimin_6553' 형태의 닉네임 */
function generateSyntheticNickname(seed: number): string {
    const adj = adjectives[seed % adjectives.length];            // seed로 형용사 선택
    const member = members[(seed * 7 + 3) % members.length];     // 소수 곱으로 다양한 멤버 선택
    const num = ((seed * 13 + 7) % 9000 + 1000).toString();      // 1000~9999 사이의 4자리 숫자
    return `${adj}${member}_${num}`;
}

/** DiceBear API를 이용하여 seed 기반 아바타 URL 생성 (동일 seed → 항상 동일 이미지) */
function syntheticAvatar(seed: number): string {
    return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=stanbeat${seed}`;
}

// ─── 핵심 리그 생성 함수 ──────────────────────────────────────────
/**
 * 실제 유저를 포함한 완전한 리그를 생성합니다.
 *
 * @param userTime      - 유저의 최고 기록 (밀리초)
 * @param userId        - 유저 고유 ID
 * @param userNickname  - 리더보드에 표시할 닉네임
 * @param userCountry   - 유저 국가 코드 (국기 표시)
 * @param userAvatarUrl - 유저 아바타 이미지 URL
 * @param previousRank  - 이전 리그에서의 순위 (처음이면 null)
 * @param hasNewBest    - 이번에 신기록을 달성했는지 여부
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
    // 유저의 ID를 기반으로 이 리그방의 총 인원수(60~99명)를 계산해옵니다.
    const leagueSize = getLeagueSize(userId);

    // ─── 1단계: 유저의 목표 순위 결정 ──────────────────────────────
    // 정규 분포를 이용해 순위를 랜덤하게 결정하되, 이전 순위를 기반으로 연속성 유지
    let targetRank: number;
    if (previousRank === null) {
        // 처음 플레이: 평균 15위, 표준편차 5위의 정규분포로 2~30위 사이에서 무작위 결정
        targetRank = Math.round(gaussianRandom(15, 5));
    } else if (hasNewBest) {
        // 신기록 달성: 이전 순위보다 평균 2계단 상승하는 정규분포를 적용해 동기부여 제공
        targetRank = Math.round(gaussianRandom(previousRank - 2, 2));
    } else {
        // 일반 갱신: 이전 순위 근처에서 약간 오르내리도록(표준편차 2.5) 설정하여 자연스러운 변동 구현
        targetRank = Math.round(gaussianRandom(previousRank, 2.5));
    }
    // 최종 산출된 목표 순위가 허용 가능한 범위(최소 2위 ~ 최대 제한)를 넘지 않도록 클램핑
    targetRank = clamp(targetRank, MIN_USER_RANK, Math.min(MAX_USER_RANK, leagueSize - 5));

    // ─── 2단계: 1위 합성 항목 생성 ─────────────────────────────────────
    // 1위 플레이어의 기록은 유저의 최고 기록보다 평균 1.5초 더 빠르게 생성하여 경쟁심 자극
    const gapToFirst = Math.abs(gaussianRandom(1500, 500));
    // 생성된 1위 기록이 너무 비현실적이지 않도록 최소 한계치(5초)를 보장
    const rank1Time = Math.max(5000, userTime - gapToFirst);


    // ─── 3단계: 모든 항목 배열 구성 ───────────────────────────────────
    const entries: LeaderboardEntry[] = [];
    const baseSeed = Math.abs(hashCode(userId + 'league')); // 리그 내 일관된 닉네임/아바타를 위한 시드

    // 1위 합성 항목 추가 (항상 가장 빠른 기록)
    entries.push(createSyntheticEntry(1, rank1Time, baseSeed + 1));

    // 2위부터 (목표순위-1)까지: 유저 위에 있는 플레이어들 (선형 보간으로 자연스러운 분포)
    for (let rank = 2; rank < targetRank; rank++) {
        const fraction = (rank - 1) / (targetRank - 1); // 1위~유저 사이를 균등하게 나누는 비율
        const interpolatedTime = rank1Time + (userTime - rank1Time) * fraction; // 선형 보간
        const noise = gaussianRandom(0, 300); // ±300ms의 자연스러운 노이즈 추가
        const time = Math.max(rank1Time, Math.round(interpolatedTime + noise)); // 1위보다 빠를 수 없음
        entries.push(createSyntheticEntry(rank, time, baseSeed + rank));
    }

    // 목표 순위에 실제 유저 항목 삽입
    entries.push({
        id: userId,
        nickname: userNickname,
        country: userCountry,
        avatarUrl: userAvatarUrl,
        time: userTime,
        rank: targetRank,
        isCurrentUser: true,  // 리더보드에서 분홍 하이라이트 표시
        isBot: false,         // 실제 유저임을 표시
    });

    // 유저 아래 순위들: 유저보다 평균 500ms씩 느린 합성 플레이어 생성
    let prevTime = userTime;
    for (let rank = targetRank + 1; rank <= leagueSize; rank++) {
        const increment = Math.abs(gaussianRandom(500, 200)); // 평균 500ms 증가, ±200ms 노이즈
        prevTime = prevTime + increment; // 이전 플레이어보다 조금씩 느려짐
        entries.push(createSyntheticEntry(rank, Math.round(prevTime), baseSeed + rank));
    }

    // ─── 4단계: 시간순 정렬 및 순위 재할당 ────────────────────────────
    // 노이즈 추가로 인해 순서가 흐트러질 수 있으므로 실제 시간 기준으로 재정렬
    entries.sort((a, b) => a.time - b.time); // 빠른 시간순(오름차순) 정렬
    entries.forEach((entry, idx) => {
        entry.rank = idx + 1; // 정렬 후 실제 순위 재할당 (1부터 시작)
    });

    // 정렬 후 실제 유저의 최종 순위 확인
    const actualUserRank = entries.findIndex((e) => e.isCurrentUser) + 1; // 0-indexed → 1-indexed

    // ─── 5단계: 리그 메타데이터 생성 ──────────────────────────────────
    const totalLeagues = Math.round(gaussianRandom(TOTAL_LEAGUES_MEAN, TOTAL_LEAGUES_STD));

    return {
        leagueId: generateLeagueId(userId),          // 이 유저만의 고유 리그 ID
        leagueSize,                                   // 이 리그의 총 인원
        totalLeagues: Math.max(3500, totalLeagues),   // UI에 표시할 전체 리그 수 (최소 3500)
        lastRefresh: Date.now(),                      // 생성 시각 기록 (30분 후 갱신 판단에 사용)
        entries,                                      // 정렬된 리더보드 항목 배열
        userRank: actualUserRank,                     // 유저의 최종 순위
        userBestAtGeneration: userTime,               // 생성 시점의 유저 최고 기록 (신기록 감지용)
    };
}

/**
 * 게스트(비로그인) 유저를 위한 쇼케이스 데이터 생성
 * 홈 화면에서 다른 리그들의 승자 10명을 보여줘 경쟁 분위기를 조성하는 데 사용
 * 반환: 10명의 합성 리그 우승자 목록과 전체 리그 수
 */
export function generateGuestShowcase(): { winners: LeaderboardEntry[]; totalLeagues: number } {
    const totalLeagues = Math.round(gaussianRandom(TOTAL_LEAGUES_MEAN, TOTAL_LEAGUES_STD));
    const winners: LeaderboardEntry[] = [];

    for (let i = 0; i < 10; i++) {
        const seed = Math.floor(Math.random() * 100000) + i * 7919; // 소수 간격 시드 (패턴 방지)
        const time = Math.round(8000 + Math.abs(gaussianRandom(4000, 2000))); // 8~14초 사이 현실적인 기록
        const leagueHash = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0').toUpperCase();
        winners.push({
            id: `guest_showcase_${i}`,
            nickname: generateSyntheticNickname(seed),         // 랜덤 BTS 팬덤 닉네임
            country: countries[seed % countries.length],       // 랜덤 국가
            avatarUrl: syntheticAvatar(seed),                  // seed 기반 아바타
            time,                                              // 합성 완료 기록
            rank: 1,                                           // 우승자이므로 항상 1위
            isCurrentUser: false,
            isBot: true,
            leagueLabel: leagueHash.slice(0, 8),              // 리그 ID 앞 8자리 표시
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
 * 30분이 지났으면 리그를 갱신하고, 아직이면 기존 리그를 반환합니다.
 * 단, 신기록 달성 시에는 30분이 안 지나도 즉시 리그를 재생성합니다.
 */
export function refreshLeagueIfNeeded(
    current: LeagueData | null,  // 현재 저장된 리그 데이터 (최초 생성 전이면 null)
    userTime: number | null,     // 유저의 현재 최고 기록 (없으면 null)
    userId: string,
    userNickname: string,
    userCountry: string,
    userAvatarUrl: string,
): LeagueData | null {
    if (!userTime) return current; // 최고 기록이 없으면 리그 생성 불가

    const now = Date.now();

    if (!current) {
        // 처음 플레이 완료: 새로운 리그 생성 (이전 순위 없음, 신기록 아님)
        return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, null, false);
    }

    const timeSinceRefresh = now - current.lastRefresh; // 마지막 갱신 후 경과 시간
    if (timeSinceRefresh < REFRESH_INTERVAL_MS) {
        // 30분이 아직 안 지났지만, 신기록을 세웠다면 즉시 재생성 (보상감 극대화)
        const hasNewBest = current.userBestAtGeneration !== null && userTime < current.userBestAtGeneration;
        if (hasNewBest) {
            return generateLeague(userTime, userId, userNickname, userCountry, userAvatarUrl, current.userRank, true);
        }
        return current; // 30분 안 지났고 신기록도 아니면 기존 리그 유지
    }

    // 30분 경과: 순위 연속성을 고려하여 리그 갱신
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

// ─── 내부 헬퍼 함수 ───────────────────────────────────────────────

/** 주어진 순위, 시간, seed로 합성 리더보드 항목 하나를 생성 */
function createSyntheticEntry(rank: number, time: number, seed: number): LeaderboardEntry {
    return {
        id: `syn_${seed}`,                                 // 합성 유저 고유 ID
        nickname: generateSyntheticNickname(seed),        // seed 기반 BTS 팬덤 닉네임
        country: countries[seed % countries.length],      // seed 기반 국가 코드
        avatarUrl: syntheticAvatar(seed),                 // seed 기반 아바타 URL
        time,                                             // 배정된 완료 시간 (밀리초)
        rank,                                             // 리그 내 순위
        isCurrentUser: false,                             // 합성 플레이어이므로 항상 false
        isBot: true,                                      // 합성 플레이어 표시 (내부 용도)
    };
}

/**
 * 문자열을 32비트 정수 해시로 변환 (djb2 변형 알고리즘)
 * 동일 입력 → 항상 동일 출력 (deterministic)으로 시드 기반 데이터 생성에 사용
 */
function hashCode(str: string): number {
    let hash = 0; // 해시 초기값
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);       // 각 문자의 UTF-16 코드 포인트
        hash = ((hash << 5) - hash) + char;   // hash * 31 + char (비트 시프트 최적화)
        hash = hash & hash;                   // 32비트 정수로 강제 변환 (오버플로우 방지)
    }
    return hash; // 음수일 수 있음 → 사용 시 Math.abs() 필요
}
