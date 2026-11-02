import { useState } from 'react';

export const VIDEO_THUMBNAIL_FALLBACK = '/images/action-match-3.webp';

export default function VideoThumbnail({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <img src={!src || failedSrc === src ? VIDEO_THUMBNAIL_FALLBACK : src} alt={alt} className={className}
    onError={() => setFailedSrc(src)} />;
}
