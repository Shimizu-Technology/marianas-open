/**
 * Fallback image mappings for when Active Storage URLs are unavailable.
 * Maps event slugs to local WebP images bundled in public/images/.
 */

const eventHeroImages: Record<string, string> = {
  'copa-de-marianas-2026': '/images/action-match-1.webp',
  'marianas-pro-nagoya-2026': '/images/action-match-2.webp',
  'marianas-pro-manila-2026': '/images/action-match-3.webp',
  'marianas-pro-taiwan-2026': '/images/action-match-4.webp',
  'marianas-pro-korea-2026': '/images/podium-1.webp',
  'marianas-pro-hong-kong-2026': '/images/podium-2.webp',
  'marianas-open-2026': '/images/venue-mats.webp',
};

function getApiOrigin(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return configured;
    }
  }
  return 'http://localhost:3000';
}

/** Normalize backend/media URLs for production safety. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const apiOrigin = getApiOrigin();

  // Relative ActiveStorage paths from API
  if (url.startsWith('/')) return `${apiOrigin}${url}`;

  // Localhost URLs from dev uploads should use configured API origin in deployed UI
  if (/^https?:\/\/(localhost|127\.0\.0\.1):3000/.test(url)) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/, apiOrigin);
  }

  return url;
}

/** Get hero image for an event — uses API URL if available, falls back to local */
export function getEventHeroImage(slug: string, apiUrl: string | null): string {
  return resolveMediaUrl(apiUrl) || eventHeroImages[slug] || '/images/venue-crowd.webp';
}

/** Organization logo fallback */
export function getOrgLogo(apiUrl: string | null): string {
  return apiUrl || '/images/logo.png';
}

/** Organization banner fallback */
export function getOrgBanner(apiUrl: string | null): string {
  return apiUrl || '/images/venue-crowd.webp';
}
