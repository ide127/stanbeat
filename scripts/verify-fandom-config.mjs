import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const expectedIds = [
  'bts',
  'blackpink',
  'newjeans',
  'seventeen',
  'stray-kids',
  'ive',
  'twice',
  'enhypen',
  'aespa',
  'le-sserafim',
  'gidle',
  'ateez',
  'k-culture',
];

const expectedWords = {
  bts: ['RM', 'JIN', 'SUGA', 'HOPE', 'JIMIN', 'V', 'JK'],
  blackpink: ['JISOO', 'JENNIE', 'ROSE', 'LISA', 'PINK', 'VENOM', 'BLINK'],
  newjeans: ['MINJI', 'HANNI', 'DANIELLE', 'HAERIN', 'HYEIN', 'BUNNY', 'JEANS'],
  seventeen: ['SCOUPS', 'JEONGHAN', 'HOSHI', 'WOOZI', 'MINGYU', 'DK', 'CARAT'],
  'stray-kids': ['BANGCHAN', 'LEEKNOW', 'CHANGBIN', 'HYUNJIN', 'HAN', 'FELIX', 'STAY'],
  ive: ['YUJIN', 'GAEUL', 'REI', 'WONYOUNG', 'LIZ', 'LEESEO', 'DIVE'],
  twice: ['NAYEON', 'JEONGYEON', 'MOMO', 'SANA', 'JIHYO', 'MINA', 'ONCE'],
  enhypen: ['JUNGWON', 'HEESEUNG', 'JAY', 'JAKE', 'SUNGHOON', 'SUNOO', 'NIKI'],
  aespa: ['KARINA', 'GISELLE', 'WINTER', 'NINGNING', 'AESPA', 'MY', 'SAVAGE'],
  'le-sserafim': ['SAKURA', 'CHAEWON', 'YUNJIN', 'KAZUHA', 'EUNCHAE', 'FEARNOT', 'FEARLESS'],
  gidle: ['MIYEON', 'MINNIE', 'SOYEON', 'YUQI', 'SHUHUA', 'NEVERLAND', 'QUEENCARD'],
  ateez: ['HONGJOONG', 'SEONGHWA', 'YUNHO', 'YEOSANG', 'SAN', 'MINGI', 'ATINY'],
  'k-culture': ['KPOP', 'IDOL', 'DANCE', 'SEOUL', 'DRAMA', 'KIMCHI', 'BEAUTY'],
};

const { fandomPacks, defaultFandomId, getFandomPack, isFandomId } = await import('../features/fandom/index.ts');

const failures = [];
const ids = fandomPacks.map((pack) => pack.id);

if (defaultFandomId !== 'k-culture') {
  failures.push(`defaultFandomId should be k-culture, got ${defaultFandomId}`);
}

if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  failures.push(`fandom ids mismatch:\nexpected ${expectedIds.join(', ')}\nactual   ${ids.join(', ')}`);
}

for (const id of expectedIds) {
  if (!isFandomId(id)) {
    failures.push(`${id} should be recognized by isFandomId`);
  }

  const pack = getFandomPack(id);
  if (!pack) {
    failures.push(`${id} pack is missing`);
    continue;
  }

  for (const key of ['id', 'displayName', 'fandomName', 'targetLabel', 'shareTitle', 'accent', 'heroImage', 'imageCredit']) {
    if (!pack[key]) failures.push(`${id} missing ${key}`);
  }

  if (!Array.isArray(pack.words) || pack.words.length !== 7) {
    failures.push(`${id} should have exactly 7 words`);
  }

  if (JSON.stringify(pack.words) !== JSON.stringify(expectedWords[id])) {
    failures.push(`${id} words mismatch:\nexpected ${expectedWords[id].join(', ')}\nactual   ${(pack.words ?? []).join(', ')}`);
  }

  for (const word of pack.words ?? []) {
    if (!/^[A-Z0-9]{1,10}$/.test(word)) {
      failures.push(`${id} contains invalid 10x10 grid word: ${word}`);
    }
  }

  if (pack.heroImage !== '/images/hero-concert.webp') {
    const absoluteImagePath = path.join(process.cwd(), 'public', pack.heroImage.replace(/^\//, ''));
    if (!existsSync(absoluteImagePath)) {
      failures.push(`${id} hero image does not exist: ${pack.heroImage}`);
    }
  }
}

if (isFandomId('unknown')) {
  failures.push('unknown should not be recognized as a fandom id');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('fandom-config-ok');
