import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { SiteContentMap } from '../services/api';

// Module-level cache so content persists across mounts/navigations
let cachedContent: SiteContentMap | null = null;
let fetchPromise: Promise<SiteContentMap> | null = null;

export function useSiteContent() {
  const [content, setContent] = useState<SiteContentMap | null>(cachedContent);
  const [loading, setLoading] = useState(!cachedContent);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    if (cachedContent) {
      setContent(cachedContent);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api.getSiteContents();
    }

    fetchPromise
      .then((data) => {
        cachedContent = data;
        setContent(data);
      })
      .catch(() => {
        // Silently fail — fallbacks will be used
      })
      .finally(() => {
        setLoading(false);
        fetchPromise = null;
      });
  }, []);

  const t = useCallback(
    (key: string, fallback = ''): string => {
      if (!content || !content[key]) return fallback;
      const localized = content[key][lang as keyof typeof content[typeof key]] as string | undefined;
      // Treat null, undefined, and empty string as "not set" — all fall through
      // to the static i18next fallback. An admin clearing a CMS field to blank
      // should see the default translation, not an empty gap in the UI.
      if (localized != null && localized !== '') return localized;
      // If the CMS lacks a value for this language, prefer the static i18next
      // fallback (which has proper translations) over the CMS English value.
      if (fallback) return fallback;
      return (content[key].en || '') as string;
    },
    [content, lang]
  );

  return { content, loading, t };
}

/** Invalidate cache (call after admin edits) */
export function invalidateSiteContentCache() {
  cachedContent = null;
  fetchPromise = null;
}
