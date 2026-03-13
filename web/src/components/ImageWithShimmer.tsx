import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function ImageWithShimmer({ src, alt, className = '', fallbackSrc }: ImageWithShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [didFallback, setDidFallback] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(false);
    setDidFallback(false);
  }, [src, fallbackSrc]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-navy-800 shimmer-loading" />
      )}

      <motion.img
        src={currentSrc}
        alt={alt}
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
