import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
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

function resolveSiteUrl() {
  const fromFiles = ENV_FILES.reduce((acc, envFile) => {
    const envPath = path.join(rootDir, envFile);
    return { ...acc, ...loadEnvFile(envPath) };
  }, {});

  const siteUrl = (process.env.VITE_SITE_URL ?? fromFiles.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (siteUrl) return siteUrl;
  return 'http://localhost:3000';
}

function writeFile(relativePath, contents) {
  const filePath = path.join(publicDir, relativePath);
  fs.writeFileSync(filePath, contents, 'utf8');
}

const siteUrl = resolveSiteUrl();
const timestamp = new Date().toISOString().slice(0, 10);

const robots = [
  'User-agent: *',
  'Allow: /',
  siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '',
].filter(Boolean).join('\n') + '\n';

const sitemap = siteUrl
  ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n    <lastmod>${timestamp}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`
  : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;

writeFile('robots.txt', robots);
writeFile('sitemap.xml', sitemap);

console.log(`[generate-public-seo] siteUrl=${siteUrl}`);
