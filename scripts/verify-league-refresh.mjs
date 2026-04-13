import assert from 'node:assert/strict';

import { LEAGUE_REFRESH_INTERVAL_MS, refreshLeagueIfNeeded } from '../league.ts';

const now = Date.now();
const current = {
  leagueId: 'league-test',
  displayName: 'Test League',
  leagueSize: 4,
  totalLeagues: 3500,
  lastRefresh: now - LEAGUE_REFRESH_INTERVAL_MS - 1000,
  userRank: 1,
  userBestAtGeneration: 1800,
  entries: [
    {
      id: 'real-user',
      nickname: 'RealUser',
      country: 'KR',
      avatarUrl: '',
      time: 1800,
      rank: 1,
      isCurrentUser: true,
      isBot: false,
    },
    {
      id: 'bot-a',
      nickname: 'BotA',
      country: 'US',
      avatarUrl: '',
      time: 5000,
      rank: 2,
      isCurrentUser: false,
      isBot: true,
    },
    {
      id: 'bot-b',
      nickname: 'BotB',
      country: 'JP',
      avatarUrl: '',
      time: 6200,
      rank: 3,
      isCurrentUser: false,
      isBot: true,
    },
    {
      id: 'bot-c',
      nickname: 'BotC',
      country: 'BR',
      avatarUrl: '',
      time: 7400,
      rank: 4,
      isCurrentUser: false,
      isBot: true,
    },
  ],
};

const refreshed = refreshLeagueIfNeeded(
  current,
  1800,
  'real-user',
  'RealUser',
  'KR',
  '',
  {
    botTimeMean: 50000,
    botTimeStdDev: 1,
    overtakeGapMin: 100,
    overtakeGapMax: 500,
  },
);

assert.ok(refreshed, 'league refresh should return a league');

const userEntry = refreshed.entries.find((entry) => entry.isCurrentUser);
assert.ok(userEntry, 'refreshed league should keep the current user');
assert.equal(userEntry.time, 1800, 'refresh should preserve the user record');
assert.ok(userEntry.rank > 1, `current user should be overtaken after refresh, got rank ${userEntry.rank}`);
assert.ok(
  refreshed.entries.some((entry) => !entry.isCurrentUser && entry.time < userEntry.time),
  'at least one league member should overtake the user',
);
assert.deepEqual(
  new Set(refreshed.entries.filter((entry) => !entry.isCurrentUser).map((entry) => entry.id)),
  new Set(['bot-a', 'bot-b', 'bot-c']),
  'refresh should keep the same league members',
);

console.log('verify-league-refresh: passed');
