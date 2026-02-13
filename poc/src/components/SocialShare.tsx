import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Share2 } from 'lucide-react';

const platforms = [
  {
    name: 'Twitter',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'LINE',
    getUrl: (url: string) =>
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.365 9.864c.058 0 .104.048.104.104v.847c0 .058-.046.104-.104.104h-1.666v.553h1.666c.058 0 .104.046.104.104v.847c0 .058-.046.104-.104.104h-2.618a.104.104 0 01-.104-.104V9.068c0-.058.046-.104.104-.104h2.618c.058 0 .104.046.104.104v.847c0 .058-.046.104-.104.104h-1.666v.553h1.666zm-3.63 2.559a.104.104 0 01-.104.104h-.847a.104.104 0 01-.104-.104V9.068c0-.058.046-.104.104-.104h.847c.058 0 .104.046.104.104v3.355zm-1.803 0a.104.104 0 01-.09.052h-.847a.104.104 0 01-.088-.049l-1.326-1.792v1.737c0 .058-.046.104-.104.104h-.847a.104.104 0 01-.104-.104V9.068c0-.058.046-.104.104-.104h.847c.032 0 .062.015.082.04l1.332 1.8V9.068c0-.058.046-.104.104-.104h.847c.058 0 .104.046.104.104v3.355a.104.104 0 01-.014.052zm-4.345-2.559c.058 0 .104.048.104.104v.847c0 .058-.046.104-.104.104H7.921v.553h1.666c.058 0 .104.046.104.104v.847c0 .058-.046.104-.104.104H7.817a.104.104 0 01-.104-.104V9.068c0-.058.046-.104.104-.104h2.618c.058 0 .104.046.104.104v.847c0 .058-.046.104-.104.104H7.921v.553h1.666zM24 10.5C24 4.701 18.627 0 12 0S0 4.701 0 10.5c0 5.19 4.604 9.537 10.824 10.36.421.091.996.28 1.141.641.13.327.085.84.042 1.17l-.184 1.107c-.056.327-.263 1.28 1.12.698 1.385-.582 7.473-4.402 10.196-7.534C25.18 14.702 24 12.726 24 10.5z" />
      </svg>
    ),
  },
  {
    name: 'KakaoTalk',
    getUrl: (url: string) =>
      `https://story.kakao.com/share?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.664 6.201 3 12 3z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

interface SocialShareProps {
  shareText?: string;
  className?: string;
}

export default function SocialShare({ shareText, className = '' }: SocialShareProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = shareText || t('share.defaultText');

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Share2 size={14} className="text-text-muted" />
      <div className="flex items-center gap-2">
        {platforms.map((platform, i) => (
          <motion.a
            key={platform.name}
            href={platform.getUrl(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            title={platform.name}
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="w-9 h-9 rounded-full bg-navy-800 border border-white/10 flex items-center justify-center text-text-secondary hover:text-gold-500 hover:border-gold-500/50 transition-all duration-200"
          >
            {platform.icon}
          </motion.a>
        ))}
      </div>
    </div>
  );
}
