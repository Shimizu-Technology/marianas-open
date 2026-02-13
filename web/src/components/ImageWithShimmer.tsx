import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ImageWithShimmer({ src, alt, className = '' }: ImageWithShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-navy-800 shimmer-loading" />
      )}

      <motion.img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}
