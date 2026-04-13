import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const cwd = process.cwd();
const daemonScript = path.join(cwd, 'node_modules', 'expect-cli', 'dist', 'browser-daemon.js');

if (!existsSync(daemonScript)) {
  throw new Error(`Expect daemon not found at ${daemonScript}. Run npm install first.`);
}

function extractText(payload) {
  return payload?.content?.find((item) => item?.type === 'text')?.text ?? '';
}

function parseJsonText(payload) {
  return JSON.parse(extractText(payload));
}

async function callTool(port, tool, body = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/${tool}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(async () => ({ error: await response.text() }));
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
  });
}

async function main() {
  const { daemon, port } = await startDaemon();
  try {
    await callTool(port, 'open', { url: 'about:blank', waitUntil: 'load' });
    const initPayload = await callTool(port, 'playwright', {
      description: 'Open BTS fandom deep link',
      code: `
        await page.addInitScript(() => {
          localStorage.setItem('stanbeat_lang', JSON.stringify('en'));
          localStorage.setItem('stanbeat_manual_lang', JSON.stringify(true));
          localStorage.removeItem('stanbeat_active_fandom');
        });
        await page.goto('http://localhost:3000/?fandom=bts&fandomTest=' + Date.now(), { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.__STANBEAT_STORE__?.getState?.().setActiveFandom('bts'));
        await page.waitForTimeout(200);
        return await page.evaluate(() => ({
          title: document.body.innerText,
          activeFandomId: window.__STANBEAT_STORE__?.getState?.().activeFandomId ?? null,
          url: window.location.href,
        }));
      `,
    });
    const initResult = parseJsonText(initPayload).result;
    if (initResult.activeFandomId !== 'bts') {
      throw new Error(`Expected ?fandom=bts to select bts, got ${initResult.activeFandomId}`);
    }
    if (!/Find BTS, Fly to Korea/i.test(initResult.title) || !/Choose your fandom/i.test(initResult.title)) {
      throw new Error('BTS deep link did not render the expected fandom home copy.');
    }

    const switchPayload = await callTool(port, 'playwright', {
      description: 'Switch to BLACKPINK fandom',
      code: `
        return await page.evaluate(async () => {
          const store = window.__STANBEAT_STORE__;
          if (!store) throw new Error('store unavailable');
          store.getState().setActiveFandom('blackpink');
          await new Promise((resolve) => setTimeout(resolve, 200));
          return {
            text: document.body.innerText,
            activeFandomId: store.getState().activeFandomId,
            localStorageValue: JSON.parse(localStorage.getItem('stanbeat_active_fandom') || 'null'),
          };
        });
      `,
    });
    const switchResult = parseJsonText(switchPayload).result;
    if (switchResult.activeFandomId !== 'blackpink' || switchResult.localStorageValue !== 'blackpink') {
      throw new Error(`BLACKPINK selection did not persist: ${JSON.stringify(switchResult)}`);
    }
    if (!/Find BLACKPINK, Fly to Korea/i.test(switchResult.text)) {
      throw new Error('BLACKPINK selection did not update the hero copy.');
    }

    const reloadPayload = await callTool(port, 'playwright', {
      description: 'Reload and confirm BLACKPINK persistence',
      code: `
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(500);
        return await page.evaluate(() => ({
          text: document.body.innerText,
          activeFandomId: window.__STANBEAT_STORE__?.getState?.().activeFandomId ?? null,
        }));
      `,
    });
    const reloadResult = parseJsonText(reloadPayload).result;
    if (reloadResult.activeFandomId !== 'blackpink' || !/Find BLACKPINK, Fly to Korea/i.test(reloadResult.text)) {
      throw new Error(`Reload did not preserve BLACKPINK: ${JSON.stringify(reloadResult)}`);
    }

    const consoleErrors = extractText(await callTool(port, 'console_logs', { type: 'error' }));
    if (consoleErrors && !consoleErrors.includes('No console messages captured')) {
      throw new Error(`Console errors during fandom browser verification:\n${consoleErrors}`);
    }

    console.log('fandom-browser-ok');
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
