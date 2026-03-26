import { useEffect, useState } from 'react';
import { X, ExternalLink, Info, CalendarDays, Tag, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import type { Announcement } from '../services/api';
import { resolveMediaUrl } from '../utils/images';

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof Info }> = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Info },
  event: { bg: 'bg-gold/10', border: 'border-gold/20', text: 'text-gold', icon: CalendarDays },
  promo: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: Tag },
  urgent: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
};

const DISMISSED_KEY = 'dismissed_announcements';

function getDismissedIds(): number[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function dismissId(id: number) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids, id]));
  }
}

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>(getDismissedIds);

  useEffect(() => {
    api.getAnnouncements()
      .then(res => setAnnouncements(res.announcements))
      .catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissedIds.includes(a.id));

  if (visible.length === 0) return null;

  const handleDismiss = (id: number) => {
    dismissId(id);
    setDismissedIds(prev => [...prev, id]);
  };

  const textOnly = visible.filter(a => !a.image_url);
  const withImage = visible.filter(a => a.image_url);

  return (
    <>
      {/* Text-only announcements as thin banners */}
      {textOnly.length > 0 && (
        <div>
          <AnimatePresence>
            {textOnly.map(announcement => {
              const style = TYPE_STYLES[announcement.announcement_type] || TYPE_STYLES.info;
              const Icon = style.icon;

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${style.bg} border-b ${style.border}`}
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon size={16} className={`shrink-0 ${style.text}`} />
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium ${style.text}`}>
                          {announcement.title}
                        </span>
                        {announcement.body && (
                          <span className="text-sm text-text-secondary ml-2 hidden sm:inline">
                            {announcement.body}
                          </span>
                        )}
                      </div>
                      {announcement.link_url && (
                        <a
                          href={announcement.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`shrink-0 flex items-center gap-1.5 text-xs font-medium ${style.text} hover:underline`}
                        >
                          {announcement.link_text || 'Learn more'}
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismiss(announcement.id)}
                      className="shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Dismiss announcement"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Image announcements as richer cards */}
      {withImage.length > 0 && (
        <div>
          <AnimatePresence>
            {withImage.map(announcement => {
              const style = TYPE_STYLES[announcement.announcement_type] || TYPE_STYLES.info;
              const imageUrl = resolveMediaUrl(announcement.image_url);

              const content = (
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={announcement.title}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-heading font-bold uppercase ${style.text}`}>
                      {announcement.title}
                    </div>
                    {announcement.body && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {announcement.body}
                      </p>
                    )}
                    {announcement.link_url && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gold-400 mt-1">
                        {announcement.link_text || 'Learn more'} <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );

              const Wrapper = announcement.link_url ? 'a' : 'div';
              const wrapperProps = announcement.link_url
                ? { href: announcement.link_url, target: '_blank' as const, rel: 'noopener noreferrer' }
                : {};

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-surface/80 backdrop-blur-sm border-b border-white/5"
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <Wrapper {...wrapperProps} className="flex items-center gap-4 min-w-0 flex-1 group">
                      {content}
                    </Wrapper>
                    <button
                      onClick={() => handleDismiss(announcement.id)}
                      className="shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Dismiss announcement"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
