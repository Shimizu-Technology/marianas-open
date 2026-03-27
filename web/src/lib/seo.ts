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
    inLanguage: ['en', 'ja', 'ko', 'tl', 'zh', 'pt'],
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

type BreadcrumbItem = {
  name: string;
  url?: string;
};

/**
 * Generate a BreadcrumbList schema for rich Google search results.
 * Pass items from root → current page. Home is always prepended automatically.
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  const allItems = [{ name: 'Home', url: SITE_URL }, ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ?? undefined,
    })),
  };
}

/**
 * FAQ schema for pages with Q&A sections — helps Google show FAQ rich results.
 */
export function getFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * SportsEvent schema for individual BJJ tournament events.
 * Use on EventDetailPage in addition to the existing event schema.
 */
export function getSportsEventSchema(params: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  url?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: params.name,
    description: params.description,
    startDate: params.startDate,
    endDate: params.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Brazilian Jiu-Jitsu',
    location: {
      '@type': 'Place',
      name: params.location ?? 'Guam',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Guam',
        addressCountry: 'GU',
      },
    },
    organizer: {
      '@type': 'SportsOrganization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    url: params.url ?? SITE_URL,
    image: params.image ? toAbsoluteUrl(params.image) : DEFAULT_OG_IMAGE,
  };
}
