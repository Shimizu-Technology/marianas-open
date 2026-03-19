import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const publicDir = path.join(webRoot, 'public');
const seedFile = path.resolve(webRoot, '../api/db/seeds.rb');

const SITE_URL = 'https://marianasopen.com';
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/calendar', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/watch', changefreq: 'daily', priority: '0.8' },
  { path: '/rankings', changefreq: 'weekly', priority: '0.8' },
  { path: '/competitors', changefreq: 'weekly', priority: '0.8' },
  { path: '/rules', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/events/past', changefreq: 'weekly', priority: '0.7' },
];

function extractEventSlugs() {
  if (!fs.existsSync(seedFile)) return [];

  const content = fs.readFileSync(seedFile, 'utf8');
  const matches = [...content.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
  return [...new Set(matches)].sort();
}

function buildSitemapXml() {
  const eventRoutes = extractEventSlugs().map((slug) => ({
    path: `/events/${slug}`,
    changefreq: 'weekly',
    priority: '0.8',
  }));

  const urls = [...staticRoutes, ...eventRoutes];
  const body = urls
    .map(
      ({ path: routePath, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${routePath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildRobotsTxt() {
  return `# Marianas Open
# ${SITE_URL}

User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

Disallow: /admin
Disallow: /admin/*
Disallow: /api/
`;
}

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(), 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), buildRobotsTxt(), 'utf8');
