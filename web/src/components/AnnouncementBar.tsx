import { useEffect, useState } from 'react';
import { X, ExternalLink, Info, CalendarDays, Tag, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import type { Announcement } from '../services/api';

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

  return (
    <div className="relative z-30">
      <AnimatePresence>
        {visible.map(announcement => {
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
  );
}
