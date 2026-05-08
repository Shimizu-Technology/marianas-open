/**
 * Image utilities for resolving media URLs from the API.
 */

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
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url)) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, apiOrigin);
  }

  return url;
}

export function isBrowserPreviewableImage(contentType: string | null | undefined): boolean {
  if (!contentType) return true;

  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(contentType.toLowerCase());
}

const GENERIC_HERO = '/images/venue-crowd.webp';

/** Get hero image for an event — uses API URL if available, falls back to optional default, then generic */
export function getEventHeroImage(_slug: string, apiUrl: string | null, adminDefault?: string | null): string {
  return resolveMediaUrl(apiUrl) || adminDefault || GENERIC_HERO;
}

/** Organization logo fallback */
export function getOrgLogo(apiUrl: string | null): string {
  return apiUrl || '/images/logo.png';
}

/** Organization banner fallback */
export function getOrgBanner(apiUrl: string | null): string {
  return apiUrl || '/images/venue-crowd.webp';
}

const SPONSOR_LOGO_MAP: Record<string, string> = {
  'triple j': '/images/logos/sponsors/triple-j-logo.png',
  'pacific points': '/images/logos/sponsors/pacific-points-logo.png',
  "foody's": '/images/logos/sponsors/foodys-logo.png',
  'deal depot': '/images/logos/sponsors/deal-depot-logo.png',
  'cfpt': '/images/logos/sponsors/cfpt-logo.png',
  'fokai': '/images/logos/sponsors/fokai-logo.png',
  'jamz media': '/images/logos/sponsors/jamz-media-logo.jpeg',
  'cherry media': '/images/logos/sponsors/cherry-media-logo.png',
  'mannge pops': '/images/logos/sponsors/mannge-pops-logo.png',
  'aloha maid': '/images/logos/sponsors/aloha-maid-logo.png',
  'fence masters': '/images/logos/sponsors/fence-masters-logo.png',
  'ite': '/images/logos/sponsors/ite-logo.png',
  'hertz & dollar': '/images/logos/sponsors/hertz-dollar-logo.jpg',
  'stroll guam': '/images/logos/sponsors/stroll-guam-logo.png',
};

/** Resolve sponsor logo: prefer Active Storage URL, fall back to local image map. */
export function getSponsorLogo(name: string, apiLogoUrl?: string | null): string | null {
  const resolved = apiLogoUrl ? resolveMediaUrl(apiLogoUrl) : null;
  if (resolved) return resolved;
  return SPONSOR_LOGO_MAP[name.toLowerCase()] ?? null;
}

/** Ensure a URL has a protocol prefix so it doesn't become a relative link. */
export function normalizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
