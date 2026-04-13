import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const daemonScript = path.join(cwd, 'node_modules', 'expect-cli', 'dist', 'browser-daemon.js');

if (!existsSync(daemonScript)) {
  throw new Error(`Expect daemon not found at ${daemonScript}. Run npm install first.`);
}

function extractText(payload) {
  return payload?.content?.find((item) => item?.type === 'text')?.text ?? '';
}

function parseSnapshot(payload) {
  return JSON.parse(extractText(payload));
}

async function callTool(port, tool, body = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/${tool}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(async () => {
    const text = await response.text();
    return { error: text };
  });

  if (!response.ok) {
    throw new Error(`Expect tool '${tool}' failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function startDaemon() {
  return await new Promise((resolve, reject) => {
    const daemon = spawn(process.execPath, [daemonScript], {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let settled = false;
    let stderr = '';
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      daemon.kill('SIGTERM');
      reject(new Error(`Expect daemon startup timeout.\n${stderr}`));
    }, 15000);

    daemon.stderr.setEncoding('utf8');
    daemon.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/expect daemon listening on 127\.0\.0\.1:(\d+)/i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ daemon, port: Number(match[1]) });
      }
    });

    daemon.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    daemon.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Expect daemon exited early. code=${code} signal=${signal}\n${stderr}`));
    });
  });
}

function buildInitScript() {
  return `
    localStorage.setItem('stanbeat_lang', JSON.stringify('en'));
    localStorage.setItem('stanbeat_manual_lang', JSON.stringify(true));
    localStorage.setItem('stanbeat_active_fandom', JSON.stringify('blackpink'));
    localStorage.removeItem('stanbeat_user');
    localStorage.removeItem('stanbeat_league');
    localStorage.removeItem('stanbeat_leaderboard');

    const history = [];
    const user = {
      hearts: 2,
      bestTime: null,
      lastDailyHeart: null,
      gameHistory: history,
      rewardedVideoStreak: 0,
      referralRewardGranted: false,
    };
    let rewardClaimed = false;

    window.__STANBEAT_TEST_API__ = {
      disableAuthListener: true,
      getUserSnapshot: () => ({ ...user, gameHistory: [...history] }),
      functions: {
        consumeHeartForGame: async () => {
          if (user.hearts <= 0) {
            return { status: 'no_hearts', user: { ...user, gameHistory: [...history] } };
          }
          user.hearts -= 1;
          return { status: 'consumed', user: { ...user, gameHistory: [...history] } };
        },
        submitPlayResult: async (timeMs) => {
          history.push({ type: 'PLAY', value: timeMs, date: new Date().toISOString() });
          const isNewBest = user.bestTime == null || timeMs < user.bestTime;
          user.bestTime = isNewBest ? timeMs : user.bestTime;
          return {
            status: 'saved',
            user: { ...user, gameHistory: [...history] },
            isNewBest,
            firstCompletedPlay: history.filter((entry) => entry.type === 'PLAY').length === 1,
          };
        },
        claimDailyHeartReward: async () => {
          if (user.lastDailyHeart === '2099-01-01') {
            return { status: 'already_claimed', user: { ...user, gameHistory: [...history] } };
          }
          user.lastDailyHeart = '2099-01-01';
          user.hearts = Math.min(3, user.hearts + 1);
          history.push({ type: 'DAILY', value: 1, date: new Date().toISOString() });
          return { status: 'claimed', user: { ...user, gameHistory: [...history] } };
        },
        claimAdReward: async () => {
          if (rewardClaimed) {
            return { status: 'already_claimed', grantedHearts: 0, user: { ...user, gameHistory: [...history] } };
          }
          rewardClaimed = true;
          user.hearts = Math.min(3, user.hearts + 1);
          history.push({ type: 'AD', value: 1, date: new Date().toISOString() });
          return { status: 'claimed', grantedHearts: 1, user: { ...user, gameHistory: [...history] } };
        },
      },
      rewardedVideo: {
        showRewardedVideo: async () => 'completed',
        waitForReward: async () => ({
          id: 'mock-reward-1',
          userId: 'harness-user',
          type: 'rewarded_video_applixir',
          createdAt: { toMillis: () => Date.now() },
        }),
        listenForRewards: () => () => {},
      },
    };
  `;
}

async function main() {
  const { daemon, port } = await startDaemon();

  try {
    await callTool(port, 'open', { url: 'about:blank', waitUntil: 'load' });

    await callTool(port, 'playwright', {
      description: 'Install gameplay harness and open the app',
      code: `
        await page.addInitScript(() => {
          ${buildInitScript()}
        });
        await page.goto('http://localhost:3000', { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        return await page.evaluate(() => {
          const avatarUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#00FFFF"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-size="28" fill="#000">A</text></svg>');
          const store = window.__STANBEAT_STORE__;
          if (!store) {
            throw new Error('window.__STANBEAT_STORE__ is not available');
          }
          store.setState({
            currentUser: {
              id: 'harness-user',
              nickname: 'HarnessAdmin',
              avatarUrl,
              email: 'harness@example.com',
              hearts: 2,
              bestTime: null,
              country: 'KR',
              role: 'ADMIN',
              lastDailyHeart: null,
              agreedToTerms: true,
              banned: false,
              gameHistory: [],
              referralCode: 'HARNESS1',
              referredBy: null,
              referralRewardGranted: false,
              rewardedVideoStreak: 0,
            },
          termsAccepted: true,
          currentView: 'HOME',
          activeFandomId: 'blackpink',
          loginPromptRequested: false,
            termsPromptRequested: false,
            leaderboard: [],
            league: null,
            videoWatchCount: 0,
          });
          return {
            view: store.getState().currentView,
            hearts: store.getState().currentUser?.hearts ?? null,
          };
        });
      `,
    });

    const homeSnapshot = parseSnapshot(await callTool(port, 'screenshot', { mode: 'snapshot' }));
    const playRef = Object.entries(homeSnapshot.refs).find(([, value]) => value?.name?.includes('PLAY NOW'))?.[0];
    if (!playRef) {
      throw new Error('Could not find the home play button in Expect snapshot.');
    }

    const openGame = await callTool(port, 'playwright', {
      description: 'Start a game from the home screen',
      snapshotAfter: true,
      code: `
        await ref('${playRef}').click();
        await page.waitForTimeout(1200);
        return await page.evaluate(() => {
          const store = window.__STANBEAT_STORE__;
          if (!store) {
            throw new Error('window.__STANBEAT_STORE__ is not available after starting the game');
          }
          return {
            view: store.getState().currentView,
            hearts: store.getState().currentUser?.hearts ?? null,
          };
        });
      `,
    });
    const openGameResult = JSON.parse(extractText(openGame));
    if (openGameResult.result.view !== 'GAME') {
      throw new Error(`Expected GAME view after starting, got ${openGameResult.result.view}`);
    }
    if (openGameResult.result.hearts !== 1) {
      throw new Error(`Expected hearts to drop to 1 after starting, got ${openGameResult.result.hearts}`);
    }

    const gameSnapshot = openGameResult.snapshot;
    for (const expectedWord of ['JISOO', 'JENNIE', 'ROSE', 'LISA', 'PINK', 'VENOM', 'BLINK']) {
      if (!gameSnapshot.tree.includes(expectedWord)) {
        throw new Error(`Expected BLACKPINK word "${expectedWord}" in the game snapshot.`);
      }
    }

    const devRef = Object.entries(gameSnapshot.refs).find(([, value]) => value?.name === 'DEV')?.[0];
    if (!devRef) {
      throw new Error('Could not find the DEV button in the game screen.');
    }

    const devPanel = await callTool(port, 'playwright', {
      description: 'Open the in-game developer panel',
      snapshotAfter: true,
      code: `
        await ref('${devRef}').click();
        await page.waitForTimeout(150);
        return { ok: true };
      `,
    });
    const devPanelSnapshot = JSON.parse(extractText(devPanel)).snapshot;
    const autoSolveRef = Object.entries(devPanelSnapshot.refs).find(([, value]) => value?.name?.includes('Auto-Solve'))?.[0];
    if (!autoSolveRef) {
      throw new Error('Could not find the Auto-Solve button in the developer panel.');
    }

    const resultPayload = await callTool(port, 'playwright', {
      description: 'Solve the board and wait for result sync',
      snapshotAfter: true,
      code: `
        await page.waitForTimeout(1200);
        await ref('${autoSolveRef}').click();
        await page.waitForFunction(() => {
          const refs = Array.from(document.querySelectorAll('button'));
          return refs.some((button) => button.textContent?.includes('Try Again'));
        }, { timeout: 10000 });
        return await page.evaluate(() => {
          const store = window.__STANBEAT_STORE__;
          if (!store) {
            throw new Error('window.__STANBEAT_STORE__ is not available on the result screen');
          }
          const state = store.getState();
          const currentUser = state.currentUser;
          const league = state.league;
          const userEntry = league?.entries?.find((entry) => entry.isCurrentUser);
          return {
            currentView: state.currentView,
            hearts: currentUser?.hearts ?? null,
            bestTime: currentUser?.bestTime ?? null,
            historyTypes: currentUser?.gameHistory?.map((entry) => entry.type) ?? [],
            leagueRank: userEntry?.rank ?? null,
            leaderboardHasUser: state.leaderboard.some((entry) => entry.isCurrentUser),
          };
        });
      `,
    });
    const resultData = JSON.parse(extractText(resultPayload)).result;
    if (resultData.currentView !== 'GAME') {
      throw new Error(`Expected to stay in GAME view for the result screen, got ${resultData.currentView}`);
    }
    if (typeof resultData.bestTime !== 'number' || resultData.bestTime < 1000) {
      throw new Error(`Expected bestTime to be saved after completion, got ${resultData.bestTime}`);
    }
    if (!resultData.historyTypes.includes('PLAY')) {
      throw new Error(`Expected PLAY history to be recorded, got ${JSON.stringify(resultData.historyTypes)}`);
    }
    if (!resultData.leaderboardHasUser || typeof resultData.leagueRank !== 'number') {
      throw new Error(`Expected the current user to appear in the league after completion.`);
    }

    const rewardPayload = await callTool(port, 'playwright', {
      description: 'Run the rewarded-video store flow under the dev harness',
      code: `
        return await page.evaluate(async () => {
          const store = window.__STANBEAT_STORE__;
          if (!store) {
            throw new Error('window.__STANBEAT_STORE__ is not available for the rewarded-video test');
          }
          store.getState().setView('HOME');
          const result = await store.getState().watchRewardedAd();
          const nextState = store.getState();
          return {
            result,
            hearts: nextState.currentUser?.hearts ?? null,
            historyTypes: nextState.currentUser?.gameHistory?.map((entry) => entry.type) ?? [],
          };
        });
      `,
    });
    const rewardData = JSON.parse(extractText(rewardPayload)).result;
    if (rewardData.result !== 'rewarded') {
      throw new Error(`Expected rewarded video flow to resolve as 'rewarded', got ${rewardData.result}`);
    }
    if (rewardData.hearts !== 2) {
      throw new Error(`Expected hearts to increase to 2 after rewarded video, got ${rewardData.hearts}`);
    }
    if (!rewardData.historyTypes.includes('AD')) {
      throw new Error(`Expected AD history to be recorded after rewarded video, got ${JSON.stringify(rewardData.historyTypes)}`);
    }

    const consoleErrors = extractText(await callTool(port, 'console_logs', { type: 'error' }));
    if (consoleErrors && !consoleErrors.includes('No console messages captured')) {
      throw new Error(`Console errors were captured during gameplay verification:\n${consoleErrors}`);
    }

    const finalSummary = {
      gameplay: resultData,
      rewardedVideo: rewardData,
    };

    process.stdout.write(`${JSON.stringify(finalSummary, null, 2)}\n`);
  } finally {
    try {
      await callTool(port, 'close', {});
    } catch {
      // Ignore close failures during teardown.
    }
    daemon.kill('SIGTERM');
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
