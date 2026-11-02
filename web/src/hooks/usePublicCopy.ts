import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TOptions } from 'i18next';
import entries from '../content/publicCopy.json';
import { useSiteContent } from './useSiteContent';

/** Organizer copy uses CMS values; UI labels and missing locale values use i18next. */
export function usePublicCopy() {
  const translation = useTranslation();
  const { t, i18n } = translation;
  const { t: sc } = useSiteContent();
  const translate = useCallback((key: string | string[], options?: TOptions | string) => {
    const opts = typeof options === 'string' ? { defaultValue: options } : options;
    const fallback = t(key, opts);
    const entry = typeof key === 'string' ? entries[key as keyof typeof entries] : undefined;
    if (!entry || typeof fallback !== 'string') return fallback;
    const value = sc(entry.key, fallback);
    return i18n.services.interpolator.interpolate(value, opts || {}, i18n.language, opts?.interpolation || {});
  }, [t, i18n, sc]);
  return { ...translation, t: translate as typeof t };
}
