import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, '../i18n/locales');
const canonicalPath = path.join(localesDir, 'ko.json');
const englishPath = path.join(localesDir, 'en.json');

const noTranslateKeys = new Set([
  'appName',
  'dau',
  'shareInviteTitle',
  'shareInviteTitleFandom',
  'shareChallengeTitle',
  'shareChallengeTitleFandom',
  'emailLabel',
  'referralCodeLabel',
  'rankingBoardTitle',
  'homeTargetFandom',
  'fandomScrollHint',
  'applixirRewardFlowTip',
  'hoursUnit',
  'minutesUnit',
  'secondsUnit',
]);

const deprecatedKeys = new Set([
  'resultCtaUrl',
  'offerwallButton',
  'offerwallUnavailable',
  'offerwallToggle',
  'participationReward',
  'adSdkSimulation',
  'highCpmTip',
]);

const mojibakePatterns = [
  /[\u00c2\u00c3][\u0080-\u00bf]/u,
  /\u00e2[\u0080-\u00bf]{1,2}/u,
  /\u00f0[\u009f-\u00bf]{1,2}/u,
  /\u00ef\u00b8/u,
  /[\u00eb\u00ec\u00ed\u00ea][\u0080-\u00bf]{1,2}/u,
];

const suspiciousPatterns = [
  /\?\?(?=\s|$)/u,
  /\uFFFD/u,
  /Ïƒ/u,
  /Î¼/u,
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function hasMojibake(value) {
  return typeof value === 'string' && (
    mojibakePatterns.some((pattern) => pattern.test(value))
    || suspiciousPatterns.some((pattern) => pattern.test(value))
  );
}

function extractPlaceholders(value) {
  if (typeof value !== 'string') return [];
  return Array.from(value.matchAll(/\{[a-zA-Z0-9_]+\}/g), (match) => match[0]).sort();
}

function main() {
  const canonical = readJson(canonicalPath);
  const english = readJson(englishPath);
  const canonicalKeys = Object.keys(canonical).filter((key) => !deprecatedKeys.has(key));
  const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json')).sort();

  console.log(`\nStarting localization audit (${localeFiles.length} languages, ${canonicalKeys.length} required keys)\n`);

  let totalMissing = 0;
  let totalExtra = 0;
  let totalEnglishFallbacks = 0;
  let totalMojibake = 0;
  let totalPlaceholderMismatches = 0;

  for (const file of localeFiles) {
    const lang = file.replace('.json', '');
    const content = readJson(path.join(localesDir, file));
    const missing = canonicalKeys.filter((key) => !(key in content));
    const extra = Object.keys(content).filter((key) => !canonicalKeys.includes(key));
    const englishFallbacks = canonicalKeys.filter((key) => lang !== 'en' && content[key] === english[key] && !noTranslateKeys.has(key));
    const mojibakeKeys = canonicalKeys.filter((key) => hasMojibake(content[key]));
    const placeholderMismatches = canonicalKeys.filter((key) => {
      const expected = extractPlaceholders(canonical[key]);
      const actual = extractPlaceholders(content[key]);
      return JSON.stringify(expected) !== JSON.stringify(actual);
    });

    totalMissing += missing.length;
    totalExtra += extra.length;
    totalEnglishFallbacks += englishFallbacks.length;
    totalMojibake += mojibakeKeys.length;
    totalPlaceholderMismatches += placeholderMismatches.length;

    if (missing.length === 0 && extra.length === 0 && englishFallbacks.length === 0 && mojibakeKeys.length === 0 && placeholderMismatches.length === 0) {
      console.log(`[${lang}] OK`);
      continue;
    }

    console.log(`[${lang}]`);
    if (missing.length > 0) {
      console.log(`  Missing (${missing.length}): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    }
    if (extra.length > 0) {
      console.log(`  Extra (${extra.length}): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    }
    if (englishFallbacks.length > 0) {
      console.log(`  English fallbacks (${englishFallbacks.length}): ${englishFallbacks.slice(0, 8).join(', ')}${englishFallbacks.length > 8 ? ' ...' : ''}`);
    }
    if (mojibakeKeys.length > 0) {
      console.log(`  Mojibake (${mojibakeKeys.length}): ${mojibakeKeys.slice(0, 8).join(', ')}${mojibakeKeys.length > 8 ? ' ...' : ''}`);
    }
    if (placeholderMismatches.length > 0) {
      console.log(`  Placeholder mismatches (${placeholderMismatches.length}): ${placeholderMismatches.slice(0, 8).join(', ')}${placeholderMismatches.length > 8 ? ' ...' : ''}`);
    }
  }

  console.log('\nSummary');
  console.log(`  Required keys: ${canonicalKeys.length}`);
  console.log(`  Missing entries: ${totalMissing}`);
  console.log(`  Extra entries: ${totalExtra}`);
  console.log(`  English fallbacks: ${totalEnglishFallbacks}`);
  console.log(`  Mojibake entries: ${totalMojibake}`);
  console.log(`  Placeholder mismatches: ${totalPlaceholderMismatches}`);

  if (totalMissing || totalExtra || totalEnglishFallbacks || totalMojibake || totalPlaceholderMismatches) {
    process.exit(1);
  }
}

main();
