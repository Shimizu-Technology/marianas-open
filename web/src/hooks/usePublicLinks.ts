import { useSiteContent } from './useSiteContent';
import { normalizeExternalUrl } from '../utils/images';

/** Link destinations are shared across languages and must remain HTTP(S). */
export function usePublicLinks() {
  const { content } = useSiteContent();
  return (key: string, fallback: string) => normalizeExternalUrl(content?.[key]?.en) || fallback;
}
