import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

const PLACEHOLDER_ENV_VALUES = new Set([
  'your_real_applixir_game_api_key',
  'your_applixir_game_api_key',
  'your_api_key',
  'changeme',
  'change_me',
  'replace_me',
  'replace-with-your-value',
  'your_project_id',
  'your_project_id.firebaseapp.com',
  'your_project_id.appspot.com',
  'your_messaging_sender_id',
  'your_app_id',
  'your_api_key_here',
]);

const REQUIRED_PRODUCTION_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_APPLIXIR_API_KEY',
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

const runningOnCloudflarePages =
  String(process.env.CF_PAGES ?? '').toLowerCase() === '1' ||
  String(process.env.CF_PAGES ?? '').toLowerCase() === 'true';
const envFromFiles = runningOnCloudflarePages
  ? {}
  : ENV_FILES.reduce((acc, envFile) => ({
    ...acc,
    ...loadEnvFile(path.join(rootDir, envFile)),
  }), {});
const env = { ...envFromFiles, ...process.env };

function hasConfiguredValue(key) {
  const value = String(env[key] ?? '').trim();
  if (!value) return false;
  return !PLACEHOLDER_ENV_VALUES.has(value.toLowerCase());
}

const isProductionBuild = runningOnCloudflarePages || String(env.NODE_ENV ?? '').toLowerCase() === 'production';
const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !hasConfiguredValue(key));

if (isProductionBuild && missing.length > 0) {
  console.error('[check-build-env] Missing required production build environment variables:');
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error('');
  console.error('Cloudflare Pages: add these in Project > Settings > Environment variables for Production, then redeploy.');
  process.exit(1);
}

if (!hasConfiguredValue('VITE_SITE_URL')) {
  console.warn('[check-build-env] VITE_SITE_URL is not set. SEO files will fall back to http://localhost:3000.');
}

console.log(`[check-build-env] ${isProductionBuild ? 'production' : 'local'} build env OK`);
