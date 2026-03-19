import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_NAME,
  THEME_COLOR,
  buildCanonicalUrl,
  buildTitle,
  toAbsoluteUrl,
} from '../lib/seo';

type StructuredData = Record<string, unknown> | Record<string, unknown>[];

type SEOProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: string;
  keywords?: string;
  noindex?: boolean;
  structuredData?: StructuredData[];
};

function getHtmlLang(language: string) {
  switch (language) {
    case 'ja':
      return 'ja';
    case 'ko':
      return 'ko';
    case 'tl':
      return 'tl';
    case 'zh':
      return 'zh-CN';
    case 'pt':
      return 'pt-BR';
    default:
      return 'en';
  }
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  noindex = false,
  structuredData = [],
}: SEOProps) {
  const location = useLocation();
  const { i18n } = useTranslation();

  const pageTitle = buildTitle(title);
  const canonicalUrl = buildCanonicalUrl(path || `${location.pathname}${location.search}`);
  const imageUrl = toAbsoluteUrl(image);
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet htmlAttributes={{ lang: getHtmlLang(i18n.language) }}>
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content={robotsContent} />
      <meta name="theme-color" content={THEME_COLOR} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {structuredData.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
