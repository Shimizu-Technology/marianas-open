import { useState, useEffect, useCallback, useRef } from 'react';
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
  const langRef = useRef(i18n.language);
  langRef.current = i18n.language;

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
      const lang = langRef.current as keyof typeof content[typeof key];
      return (content[key][lang] || content[key].en || fallback) as string;
    },
    [content]
  );

  return { content, loading, t };
}

/** Invalidate cache (call after admin edits) */
export function invalidateSiteContentCache() {
  cachedContent = null;
  fetchPromise = null;
}
