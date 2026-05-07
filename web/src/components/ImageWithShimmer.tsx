import { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
  sizes?: string;
}

export default function ImageWithShimmer({
  src,
  alt,
  className = '',
  fallbackSrc,
  loading,
  decoding,
  sizes,
}: ImageWithShimmerProps) {
  return (
    <ImageWithShimmerInner
      key={`${src}|${fallbackSrc || ''}`}
      src={src}
      alt={alt}
      className={className}
      fallbackSrc={fallbackSrc}
      loading={loading}
      decoding={decoding}
      sizes={sizes}
    />
  );
}

function ImageWithShimmerInner({
  src,
  alt,
  className = '',
  fallbackSrc,
  loading,
  decoding,
  sizes,
}: ImageWithShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [didFallback, setDidFallback] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const setImageRef = useCallback((image: HTMLImageElement | null) => {
    imageRef.current = image;
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-navy-800 shimmer-loading" />
      )}

      <motion.img
        ref={setImageRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
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
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}
