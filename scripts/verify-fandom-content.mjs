import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const filesToInspect = [
  'App.tsx',
  'store.ts',
  'index.html',
  'metadata.json',
  'public/manifest.json',
  'i18n/locales/ko.json',
  'i18n/locales/en.json',
].map((file) => path.join(root, file));

const forbiddenPatterns = [
  /BTS official merch/i,
  /official BTS merch/i,
  /official BTS goods/i,
  /BTS merch/i,
  /BTS goods/i,
  /ARMY worldwide/i,
  /BTS Word Search Game/i,
  /BTS game/i,
  /Bangtan/i,
];

const requiredContentPatterns = [
  /K-pop/i,
  /K-culture/i,
  /K-culture box/i,
  /Unofficial fan challenge/i,
  /not affiliated with or endorsed/i,
  /Korea trip|Seoul trip/i,
];

const failures = [];

for (const filePath of filesToInspect) {
  const relative = path.relative(root, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      failures.push(`${relative} still contains forbidden BTS-only copy matching ${pattern}`);
    }
  }
}

const combinedText = filesToInspect.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
for (const pattern of requiredContentPatterns) {
  if (!pattern.test(combinedText)) {
    failures.push(`Missing required K-pop/K-culture positioning content matching ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('fandom-content-ok');
