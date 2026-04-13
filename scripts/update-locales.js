import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, '../i18n/locales');
const canonicalLocale = 'ko';
const fallbackLocale = 'en';
const translationBatchSize = 20;

const deprecatedKeys = new Set([
  'resultCtaUrl',
  'offerwallButton',
  'offerwallUnavailable',
  'offerwallToggle',
  'participationReward',
  'adSdkSimulation',
  'highCpmTip',
]);

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

const forceRefreshKeys = new Set([
  'leagueSyncNotice',
  'leaveGameTitle',
  'leaveGameMessage',
  'cancelAction',
  'leaveAction',
  'stdDevGaussian',
  'homeTarget',
  'dailyHeart',
  'dailyHeartCountdown',
  'dailyHeartReady',
  'dailyHeartClaimed',
  'dailyHeartAlreadyClaimed',
  'loginHeartCountdown',
  'loginHeartClaimed',
  'maxHeartsReached',
  'termsFullText',
  'emailLabel',
  'referralCodeLabel',
  'shareChallengeTitle',
]);
const forceRetranslateAll = process.env.STANBEAT_FORCE_RETRANSLATE === 'true';

const languageCodeMap = {
  ar: 'ar',
  de: 'de',
  en: 'en',
  es: 'es',
  fil: 'tl',
  fr: 'fr',
  hi: 'hi',
  id: 'id',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  ms: 'ms',
  pl: 'pl',
  'pt-BR': 'pt',
  ru: 'ru',
  th: 'th',
  tr: 'tr',
  vi: 'vi',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
};

const placeholderPattern = /\{[a-zA-Z0-9_]+\}/g;
const mojibakePatterns = [
  /[\u00c2\u00c3][\u0080-\u00bf]/u,
  /\u00e2[\u0080-\u00bf]{1,2}/u,
  /\u00f0[\u009f-\u00bf]{1,2}/u,
  /\u00ef\u00b8/u,
  /[\u00eb\u00ec\u00ed\u00ea][\u0080-\u00bf]{1,2}/u,
];
const cp1252Map = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
  [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function decodeCp1252Utf8Mojibake(value) {
  const bytes = [];
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = cp1252Map.get(code);
    if (mapped === undefined) {
      return value;
    }
    bytes.push(mapped);
  }
  return Buffer.from(bytes).toString('utf8');
}

function readabilityScore(value) {
  let score = 0;
  for (const ch of value) {
    if (/[가-힣]/u.test(ch)) score += 4;
    else if (/[\u3040-\u30ff]/u.test(ch)) score += 4;
    else if (/[\u4e00-\u9fff]/u.test(ch)) score += 4;
    else if (/[\u0400-\u04ff]/u.test(ch)) score += 4;
    else if (/[\u0600-\u06ff]/u.test(ch)) score += 4;
    else if (/[\u0900-\u097f]/u.test(ch)) score += 4;
    else if (/[\u0e00-\u0e7f]/u.test(ch)) score += 4;
    else if (/[\u00c0-\u024f]/u.test(ch)) score += 2;
    else if (/[A-Za-z0-9]/.test(ch)) score += 1;
    else if (/\s/.test(ch)) score += 0;
    else if (/[{}()[\].,!?;:\/'"#%&+\-_=<>@*~|]/.test(ch)) score += 0;
    else score -= 1;
  }

  score -= mojibakePatterns.reduce((sum, pattern) => {
    const matches = value.match(new RegExp(pattern.source, 'gu'));
    return sum + ((matches?.length ?? 0) * 4);
  }, 0);
  return score;
}

function repairBrokenUtf8(value) {
  if (!value) return value;
  const repaired = decodeCp1252Utf8Mojibake(value);
  if (repaired === value || repaired.includes('ï¿½')) {
    return value;
  }
  return readabilityScore(repaired) > readabilityScore(value) ? repaired : value;
}

function normalizeLocaleValue(value) {
  return typeof value === 'string' ? repairBrokenUtf8(value.replace(/\r\n/g, '\n').trim()) : value;
}

function isProbablyMojibake(value) {
  if (!value) return false;
  return mojibakePatterns.some((pattern) => pattern.test(value))
    || /(Ã.|Â.|Ø.|Ù.|Ð.|Ñ.|×.|à¸.|â[€™"œ”–—]|ï¸)/u.test(String(value));
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(placeholderPattern, (match) => {
    const token = `__PH_${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let restored = text;
  for (const { token, value } of placeholders) {
    restored = restored.replaceAll(token, value);
  }
  return restored;
}

function extractPlaceholderSet(text) {
  return new Set((String(text ?? '').match(placeholderPattern) ?? []));
}

const translationCache = new Map();

async function translateText(text, locale, sourceLang = 'ko') {
  const normalizedText = normalizeLocaleValue(text);
  if (!normalizedText || locale === sourceLang) {
    return normalizedText;
  }

  const target = languageCodeMap[locale] ?? locale;
  const cacheKey = `${sourceLang}->${target}::${normalizedText}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const { protectedText, placeholders } = protectPlaceholders(normalizedText);
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sourceLang);
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', protectedText);

  let payload;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url);
    lastStatus = response.status;
    if (response.ok) {
      payload = await response.json();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }

  if (!payload) {
    throw new Error(`Translation request failed for ${locale}: ${lastStatus}`);
  }

  const translated = payload?.[0]?.map((entry) => entry?.[0] ?? '').join('') ?? normalizedText;
  const restored = restorePlaceholders(translated, placeholders).replace(/\s+([!?.:,;])/g, '$1');
  translationCache.set(cacheKey, restored);
  return restored;
}

async function translateBatch(texts, locale, sourceLang = 'ko') {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await translateText(texts[0], locale, sourceLang)];

  const markers = texts.slice(0, -1).map((_, index) => `[[[SBSEG_${index}]]]`);
  const composite = texts.map((text, index) => index === 0 ? text : `${markers[index - 1]}\n${text}`).join('\n');
  const translatedComposite = await translateText(composite, locale, sourceLang);

  const parts = [];
  let cursor = translatedComposite;
  for (const marker of markers) {
    const markerIndex = cursor.indexOf(marker);
    if (markerIndex === -1) {
      return Promise.all(texts.map((text) => translateText(text, locale, sourceLang)));
    }
    parts.push(cursor.slice(0, markerIndex).trim());
    cursor = cursor.slice(markerIndex + marker.length).trimStart();
  }
  parts.push(cursor.trim());
  return parts;
}

async function buildLocale(locale, existing, englishSource, canonicalSource, canonicalKeys) {
  const output = {};

  if (locale === canonicalLocale) {
    for (const key of canonicalKeys) {
      output[key] = normalizeLocaleValue(existing[key] ?? canonicalSource[key]);
    }
    return { output, translatedCount: 0 };
  }

  const pending = [];
  for (const key of canonicalKeys) {
    const currentValue = normalizeLocaleValue(existing[key]);
    const fallbackValue = normalizeLocaleValue(englishSource[key] ?? canonicalSource[key]);
    const canonicalValue = normalizeLocaleValue(canonicalSource[key]);
    const shouldForceRefresh = (forceRetranslateAll || forceRefreshKeys.has(key)) && locale !== canonicalLocale && locale !== fallbackLocale;
    const currentPlaceholders = extractPlaceholderSet(currentValue);
    const canonicalPlaceholders = extractPlaceholderSet(canonicalValue);
    const hasPlaceholderMismatch =
      currentPlaceholders.size !== canonicalPlaceholders.size ||
      [...canonicalPlaceholders].some((token) => !currentPlaceholders.has(token));

    if (!shouldForceRefresh && !hasPlaceholderMismatch && currentValue && !isProbablyMojibake(currentValue)) {
      output[key] = currentValue;
      continue;
    }

    if (locale === fallbackLocale && fallbackValue && !isProbablyMojibake(fallbackValue)) {
      output[key] = fallbackValue;
      continue;
    }

    if (!canonicalValue) {
      output[key] = fallbackValue ?? currentValue ?? '';
      continue;
    }

    if (noTranslateKeys.has(key)) {
      output[key] = fallbackValue ?? canonicalValue;
      continue;
    }

    pending.push({ key, text: canonicalValue });
  }

  for (let index = 0; index < pending.length; index += translationBatchSize) {
    const batch = pending.slice(index, index + translationBatchSize);
    const translatedValues = await translateBatch(batch.map(({ text }) => text), locale, canonicalLocale);
    for (let itemIndex = 0; itemIndex < batch.length; itemIndex += 1) {
      output[batch[itemIndex].key] = translatedValues[itemIndex];
    }
  }

  return { output, translatedCount: pending.length };
}

async function main() {
  const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json')).sort();
  const canonicalPath = path.join(localesDir, `${canonicalLocale}.json`);
  const englishPath = path.join(localesDir, `${fallbackLocale}.json`);
  const canonicalSource = readJson(canonicalPath);
  const englishSource = readJson(englishPath);
  const canonicalKeys = Object.keys(canonicalSource).filter((key) => !deprecatedKeys.has(key));

  for (const file of localeFiles) {
    const locale = file.replace('.json', '');
    const filePath = path.join(localesDir, file);
    const existing = readJson(filePath);
    const { output, translatedCount } = await buildLocale(locale, existing, englishSource, canonicalSource, canonicalKeys);
    writeJson(filePath, output);
    console.log(`Updated ${file} (${Object.keys(output).length} keys, translated ${translatedCount})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
