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

/** Get hero image for an event — uses API URL if available, falls back to local */
export function getEventHeroImage(slug: string, apiUrl: string | null): string {
  return apiUrl || eventHeroImages[slug] || '/images/venue-crowd.webp';
}

/** Organization logo fallback */
export function getOrgLogo(apiUrl: string | null): string {
  return apiUrl || '/images/logo.png';
}

/** Organization banner fallback */
export function getOrgBanner(apiUrl: string | null): string {
  return apiUrl || '/images/venue-crowd.webp';
}
