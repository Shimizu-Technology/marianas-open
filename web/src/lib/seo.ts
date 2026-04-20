export const SITE_URL = 'https://marianasopen.com';
export const SITE_NAME = 'Marianas Open';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-podium.jpg`;
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@TheMarianasOpen';
export const DEFAULT_DESCRIPTION =
  "Guam's premier international Brazilian Jiu-Jitsu championship featuring qualifier events across Asia-Pacific and the Marianas Open grand championship.";
export const DEFAULT_KEYWORDS =
  'Marianas Open, BJJ Guam, Brazilian Jiu-Jitsu tournament, Guam BJJ, ASJJF, jiu-jitsu competition, grappling event, Guam sports';
export const THEME_COLOR = '#07111f';

export const SOCIAL_LINKS = [
  'https://instagram.com/themarianasopen',
  'https://facebook.com/marianasopen',
  YOUTUBE_CHANNEL_URL,
];

export function toAbsoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function buildTitle(title?: string) {
  if (!title) return `${SITE_NAME} | International Brazilian Jiu-Jitsu Championship`;
  if (title.includes(SITE_NAME)) return title;
  return `${title} | ${SITE_NAME}`;
}

export function buildCanonicalUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['en', 'ja', 'ko', 'tl', 'zh', 'zh-Hant', 'pt'],
  };
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logos/mo-logo-white.png`,
    image: DEFAULT_OG_IMAGE,
    email: 'moguam@marianasopen.com',
    telephone: '+1-671-777-9044',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Guam',
      addressCountry: 'GU',
    },
    sameAs: SOCIAL_LINKS,
  };
}
