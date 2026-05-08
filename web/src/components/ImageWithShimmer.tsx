import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  placeholderContent?: ReactNode;
  fallbackSrc?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  lazyRootMargin?: string;
}

export default function ImageWithShimmer({
  src,
  alt,
  className = '',
  placeholderClassName,
  placeholderContent,
  fallbackSrc,
  loading,
  decoding,
  fetchPriority,
  sizes,
  lazyRootMargin,
}: ImageWithShimmerProps) {
  return (
    <ImageWithShimmerInner
      key={`${src}|${fallbackSrc || ''}`}
      src={src}
      alt={alt}
      className={className}
      placeholderClassName={placeholderClassName}
      placeholderContent={placeholderContent}
      fallbackSrc={fallbackSrc}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      lazyRootMargin={lazyRootMargin}
    />
  );
}

function ImageWithShimmerInner({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  placeholderContent,
  fallbackSrc,
  loading,
  decoding,
  fetchPriority,
  sizes,
  lazyRootMargin = '900px 0px',
}: ImageWithShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(loading !== 'lazy');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [didFallback, setDidFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldLoad || loading !== 'lazy') return undefined;
    const target = containerRef.current;
    if (!target) return undefined;

    if (!('IntersectionObserver' in window)) {
      const fallbackTimer = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: lazyRootMargin });

    observer.observe(target);
    return () => observer.disconnect();
  }, [lazyRootMargin, loading, shouldLoad]);

  const setImageRef = useCallback((image: HTMLImageElement | null) => {
    imageRef.current = image;
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {!loaded && (
        <div className={`absolute inset-0 bg-navy-800 shimmer-loading ${placeholderClassName}`}>
          {placeholderContent}
        </div>
      )}

      {shouldLoad && (
        <motion.img
          ref={setImageRef}
          src={currentSrc}
          alt={alt}
          loading={loading === 'lazy' ? 'eager' : loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          sizes={sizes}
          className={className}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (fallbackSrc && !didFallback && fallbackSrc !== currentSrc) {
              setDidFallback(true);
              setCurrentSrc(fallbackSrc);
              setLoaded(false);
            } else {
              setLoaded(true);
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
