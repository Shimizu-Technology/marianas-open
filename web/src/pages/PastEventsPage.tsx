import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, MapPin, Star, Trophy, ArrowRight, Medal } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Event } from '../services/api';

function CountryFlag({ code, className = 'w-5 h-4' }: { code: string; className?: string }) {
  switch (code?.toUpperCase()) {
    case 'GU':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#003DA5" rx="2" />
          <rect x="1" y="1" width="22" height="16" fill="none" stroke="#BF0D3E" strokeWidth="2" rx="1" />
          <ellipse cx="12" cy="9" rx="5" ry="6" fill="#003DA5" stroke="#BF0D3E" strokeWidth="0.5" />
          <path d="M9 13 L12 5 L15 13 Z" fill="#009543" opacity="0.7" />
          <rect x="11.5" y="6" width="1" height="5" fill="#8B4513" />
          <path d="M8 14 C10 12 14 12 16 14" fill="#FFD100" opacity="0.6" />
        </svg>
      );
    case 'JP':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#fff" rx="2" />
          <rect x="0.5" y="0.5" width="23" height="17" rx="1.5" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
          <circle cx="12" cy="9" r="5.4" fill="#BC002D" />
        </svg>
      );
    case 'PH':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" rx="2" fill="#0038A8" />
          <rect y="9" width="24" height="9" fill="#CE1126" />
          <path d="M0 0 L10 9 L0 18 Z" fill="#FCD116" />
          <circle cx="4" cy="9" r="1.5" fill="#FCD116" />
        </svg>
      );
    case 'KR':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#fff" rx="2" />
          <circle cx="12" cy="9" r="4.5" fill="#C60C30" />
          <path d="M12 4.5 A4.5 4.5 0 0 1 12 9 A2.25 2.25 0 0 1 12 4.5" fill="#003478" />
          <path d="M12 9 A2.25 2.25 0 0 1 12 13.5 A4.5 4.5 0 0 1 12 9" fill="#003478" />
        </svg>
      );
    case 'TW':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#FE0000" rx="2" />
          <rect width="12" height="9" fill="#000095" />
          <circle cx="6" cy="4.5" r="2.5" fill="#fff" />
          <circle cx="6" cy="4.5" r="2" fill="#000095" />
          <circle cx="6" cy="4.5" r="1.2" fill="#fff" />
        </svg>
      );
    case 'HK':
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#DE2110" rx="2" />
          <g transform="translate(12,9)">
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse key={angle} cx="0" cy="-3" rx="1.2" ry="3" fill="#fff" transform={`rotate(${angle})`} />
            ))}
          </g>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
          <rect width="24" height="18" fill="#334155" rx="2" />
          <text x="12" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">
            {code?.slice(0, 2)}
          </text>
        </svg>
      );
  }
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < stars ? 'text-gold-500 fill-gold-500' : 'text-white/10'} />
      ))}
    </div>
  );
}

function formatEventDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export default function PastEventsPage() {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        const completed = data.filter((e: Event) => e.status === 'completed');
        completed.sort((a: Event, b: Event) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const eventsByYear = useMemo(() => {
    const grouped: Record<number, Event[]> = {};
    for (const event of events) {
      const year = new Date(event.date + 'T00:00:00').getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(event);
    }
    return Object.entries(grouped)
      .map(([year, evts]) => ({ year: Number(year), events: evts }))
      .sort((a, b) => b.year - a.year);
  }, [events]);

  if (loading) {
    return <div className="min-h-screen pt-20"><LoadingSpinner /></div>;
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-800 to-navy-900" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-gold-500/30 rounded-full bg-gold-500/5 mb-6">
              <Trophy size={14} className="text-gold-500" />
              <span className="text-sm text-gold-400 font-heading uppercase tracking-wider">
                {t('pastEvents.badge')}
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              {t('pastEvents.title')}
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              {t('pastEvents.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Events by Year */}
      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {eventsByYear.length === 0 ? (
            <div className="text-center py-16 text-text-muted">{t('pastEvents.noEvents')}</div>
          ) : (
            <div className="space-y-16">
              {eventsByYear.map(({ year, events: yearEvents }) => (
                <div key={year}>
                  <ScrollReveal>
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-3xl sm:text-5xl font-heading font-black text-text-primary tabular-nums">
                        {year}
                      </h2>
                      <div className="flex-1 h-px bg-gradient-to-r from-gold-500/30 to-transparent" />
                      <span className="text-sm text-text-muted font-heading uppercase tracking-wider">
                        {yearEvents.length} {yearEvents.length === 1 ? t('pastEvents.event') : t('pastEvents.events')}
                      </span>
                    </div>
                  </ScrollReveal>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {yearEvents.map((event, i) => (
                      <motion.div
                        key={event.id}
                        custom={i}
                        variants={shouldReduceMotion ? undefined : cardVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-30px' }}
                      >
                        <Link
                          to={`/events/${event.slug}`}
                          className="group block bg-navy-900/50 border border-white/5 hover:border-gold-500/20 transition-all duration-300 overflow-hidden h-full"
                        >
                          {event.hero_image_url ? (
                            <div className="relative aspect-[16/9] overflow-hidden">
                              <img
                                src={event.hero_image_url}
                                alt={event.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
                              <div className="absolute top-3 left-3">
                                <StarRating stars={event.asjjf_stars} />
                              </div>
                            </div>
                          ) : (
                            <div className="relative aspect-[16/9] bg-gradient-to-br from-navy-800/80 to-navy-900 flex items-center justify-center overflow-hidden">
                              <div className="absolute inset-0 opacity-[0.04]" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)',
                              }} />
                              <span className="text-5xl font-heading font-black text-white/[0.04] uppercase select-none">
                                {event.name.split(' ').pop()}
                              </span>
                              <div className="absolute top-3 left-3">
                                <StarRating stars={event.asjjf_stars} />
                              </div>
                            </div>
                          )}

                          <div className="p-5 space-y-3">
                            <h3 className="font-heading font-bold text-lg text-text-primary group-hover:text-gold-500 transition-colors leading-tight">
                              {event.name}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Calendar size={14} className="text-text-muted shrink-0" />
                                <span>{formatEventDate(event.date, i18n.language)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <MapPin size={14} className="text-text-muted shrink-0" />
                                <span className="truncate">{event.venue_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <CountryFlag code={event.country_code} className="w-5 h-4 shrink-0" />
                                <span>{event.city}, {event.country}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              <div className="flex items-center gap-1 text-xs text-gold-500/70 group-hover:text-gold-400 transition-colors">
                                <span className="font-heading uppercase tracking-wider">{t('pastEvents.viewDetails')}</span>
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                              {event.status === 'completed' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-heading uppercase tracking-wider">
                                  <Medal size={10} />
                                  <span>{t('results.viewResults')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
