import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { SiteImage } from '../services/api';

export function useSiteImages(placement?: string) {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getSiteImages(placement)
      .then((res) => {
        if (!cancelled) setImages(res.site_images || []);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [placement]);

  const getByPlacement = useCallback(
    (p: string) => images.filter((img) => img.placement === p && img.image_url),
    [images]
  );

  return { images, loading, getByPlacement };
}

/**
 * Get the best image URL for a placement, falling back to a static path.
 */
export function getImageUrl(
  images: SiteImage[],
  placement: string,
  fallbackPath: string,
  index = 0
): string {
  const matches = images.filter((i) => i.placement === placement && i.image_url);
  return matches[index]?.image_url || fallbackPath;
}

/**
 * Get all image URLs for a placement, falling back to static paths.
 */
export function getImageUrls(
  images: SiteImage[],
  placement: string,
  fallbackPaths: string[]
): string[] {
  const matches = images.filter((i) => i.placement === placement && i.image_url);
  if (matches.length > 0) {
    return matches.map((m) => m.image_url!);
  }
  return fallbackPaths;
}
