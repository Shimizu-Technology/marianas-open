/**
 * Minimal SVG flag icons for language switcher.
 * Simplified designs that render consistently across all platforms.
 * Each flag is a 4:3 aspect ratio inline SVG.
 */

interface FlagProps {
  className?: string;
}

export function FlagUS({ className = 'w-6 h-[18px]' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <rect width="24" height="18" fill="#B22234" rx="2" />
      <rect y="1.38" width="24" height="1.38" fill="#fff" />
      <rect y="4.15" width="24" height="1.38" fill="#fff" />
      <rect y="6.92" width="24" height="1.38" fill="#fff" />
      <rect y="9.69" width="24" height="1.38" fill="#fff" />
      <rect y="12.46" width="24" height="1.38" fill="#fff" />
      <rect y="15.23" width="24" height="1.38" fill="#fff" />
      <rect width="10" height="9.69" fill="#3C3B6E" rx="1" />
      <g fill="#fff">
        {/* Simplified star pattern */}
        <circle cx="1.5" cy="1.2" r="0.5" />
        <circle cx="3.5" cy="1.2" r="0.5" />
        <circle cx="5.5" cy="1.2" r="0.5" />
        <circle cx="7.5" cy="1.2" r="0.5" />
        <circle cx="2.5" cy="2.6" r="0.5" />
        <circle cx="4.5" cy="2.6" r="0.5" />
        <circle cx="6.5" cy="2.6" r="0.5" />
        <circle cx="1.5" cy="4.0" r="0.5" />
        <circle cx="3.5" cy="4.0" r="0.5" />
        <circle cx="5.5" cy="4.0" r="0.5" />
        <circle cx="7.5" cy="4.0" r="0.5" />
        <circle cx="2.5" cy="5.4" r="0.5" />
        <circle cx="4.5" cy="5.4" r="0.5" />
        <circle cx="6.5" cy="5.4" r="0.5" />
        <circle cx="1.5" cy="6.8" r="0.5" />
        <circle cx="3.5" cy="6.8" r="0.5" />
        <circle cx="5.5" cy="6.8" r="0.5" />
        <circle cx="7.5" cy="6.8" r="0.5" />
        <circle cx="2.5" cy="8.2" r="0.5" />
        <circle cx="4.5" cy="8.2" r="0.5" />
        <circle cx="6.5" cy="8.2" r="0.5" />
      </g>
    </svg>
  );
}

export function FlagJP({ className = 'w-6 h-[18px]' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <rect width="24" height="18" fill="#fff" rx="2" />
      <rect x="0.5" y="0.5" width="23" height="17" rx="1.5" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
      <circle cx="12" cy="9" r="5.4" fill="#BC002D" />
    </svg>
  );
}

export function FlagKR({ className = 'w-6 h-[18px]' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <rect width="24" height="18" fill="#fff" rx="2" />
      <rect x="0.5" y="0.5" width="23" height="17" rx="1.5" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
      <circle cx="12" cy="9" r="4.5" fill="#C60C30" />
      <path d="M12 4.5 A4.5 4.5 0 0 1 12 9 A2.25 2.25 0 0 1 12 4.5" fill="#003478" />
      <path d="M12 9 A2.25 2.25 0 0 1 12 13.5 A4.5 4.5 0 0 1 12 9" fill="#003478" />
      {/* Trigrams simplified as bars */}
      <g stroke="#000" strokeWidth="0.7" strokeLinecap="round">
        <line x1="4" y1="3.5" x2="7" y2="5.5" />
        <line x1="4.4" y1="4.5" x2="7.4" y2="6.5" />
        <line x1="4.8" y1="5.5" x2="7.8" y2="7.5" />
        <line x1="17" y1="10.5" x2="20" y2="12.5" />
        <line x1="16.6" y1="11.5" x2="19.6" y2="13.5" />
        <line x1="16.2" y1="12.5" x2="19.2" y2="14.5" />
        <line x1="17" y1="5.5" x2="20" y2="3.5" />
        <line x1="17.4" y1="6.5" x2="20.4" y2="4.5" />
        <line x1="4" y1="12.5" x2="7" y2="14.5" />
        <line x1="3.6" y1="11.5" x2="6.6" y2="13.5" />
      </g>
    </svg>
  );
}

export function FlagPH({ className = 'w-6 h-[18px]' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <rect width="24" height="18" rx="2" fill="#0038A8" />
      <rect y="9" width="24" height="9" fill="#CE1126" />
      <path d="M0 0 L10 9 L0 18 Z" fill="#FCD116" />
      {/* Sun */}
      <circle cx="4" cy="9" r="1.5" fill="#FCD116" stroke="#CE1126" strokeWidth="0.2" />
      {/* Stars */}
      <circle cx="1.5" cy="3" r="0.6" fill="#FCD116" />
      <circle cx="1.5" cy="15" r="0.6" fill="#FCD116" />
      <circle cx="8" cy="9" r="0.6" fill="#FCD116" />
    </svg>
  );
}

export function FlagCN({ className = 'w-6 h-[18px]' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <rect width="24" height="18" fill="#DE2910" rx="2" />
      {/* Large star */}
      <polygon points="4,2 4.7,4.2 7,4.2 5.2,5.6 5.8,7.8 4,6.4 2.2,7.8 2.8,5.6 1,4.2 3.3,4.2" fill="#FFDE00" />
      {/* Small stars */}
      <circle cx="8.5" cy="2" r="0.6" fill="#FFDE00" />
      <circle cx="10" cy="3.5" r="0.6" fill="#FFDE00" />
      <circle cx="10" cy="5.5" r="0.6" fill="#FFDE00" />
      <circle cx="8.5" cy="7" r="0.6" fill="#FFDE00" />
    </svg>
  );
}

/** Map language code to flag component */
export const flagComponents: Record<string, React.ComponentType<FlagProps>> = {
  en: FlagUS,
  ja: FlagJP,
  ko: FlagKR,
  tl: FlagPH,
  zh: FlagCN,
};
