import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowRight, ExternalLink, Trophy, Clock } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import QRShare from '../components/QRShare';
import LoadingSpinner from '../components/LoadingSpinner';
import { useEvents } from '../hooks/useApi';
import type { Event } from '../services/api';

function getDateLocale(lang: string) {
  const map: Record<string, string> = { ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', tl: 'fil-PH' };
  return map[lang] || 'en-US';
}

function EventMapDot({ event, index }: { event: Event; index: number }) {
  const { i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [showTooltip, setShowTooltip] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  const positions: Record<string, { x: number; y: number }> = {
    GU: { x: 82, y: 62 },
    JP: { x: 68, y: 22 },
    PH: { x: 55, y: 58 },
    TW: { x: 60, y: 38 },
    KR: { x: 62, y: 20 },
    HK: { x: 52, y: 44 },
  };

  const pos = positions[event.country_code] || { x: 50, y: 50 };

  const formattedDate = new Date(event.date).toLocaleDateString(
    getDateLocale(i18n.language),
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (dotRef.current && !dotRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('touchstart', handler);
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [showTooltip]);

  return (
    <motion.div
      ref={dotRef}
      className="absolute"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5, type: 'spring' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={(e) => {
        e.stopPropagation();
        setShowTooltip((prev) => !prev);
      }}
    >
      {event.is_main_event && (
        <div className="absolute -inset-3 bg-gold-500/20 rounded-full animate-ping" />
      )}

      <div
        className={`relative w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-150 ${
          event.is_main_event ? 'bg-gold-500' : 'bg-navy-700'
        }`}
      />

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none z-20"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-surface border border-gold-500/30 p-3 whitespace-nowrap shadow-xl relative">
              <div className="font-heading font-bold text-sm text-text-primary">{event.name}</div>
              <div className="text-xs text-gold-400 mt-1">{formattedDate}</div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gold-500/30" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const { events, loading } = useEvents();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingEvents = useMemo(() => events.filter(e => e.status !== 'completed'), [events]);
  const pastEvents = useMemo(() => events.filter(e => e.status === 'completed'), [events]);
  const pastEventsByYear = useMemo(() => {
    const grouped: Record<number, typeof pastEvents> = {};
    pastEvents.forEach(e => {
      const year = new Date(e.date).getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(e);
    });
    return Object.entries(grouped)
      .map(([year, evts]) => ({ year: Number(year), events: evts }))
      .sort((a, b) => b.year - a.year);
  }, [pastEvents]);

  const formatEventDate = useCallback((dateStr: string, dateEndStr?: string | null) => {
    const locale = getDateLocale(i18n.language);
    const main = new Date(dateStr).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    if (dateEndStr) {
      const end = new Date(dateEndStr).toLocaleDateString(locale, { day: 'numeric' });
      return `${main} – ${end}`;
    }
    return main;
  }, [i18n.language]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-800 to-navy-900" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              {t('calendar.title')}
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-6">
              {t('calendar.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <SocialShare shareText={t('share.defaultText')} />
              <QRShare />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Map */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase mb-3">
                {t('calendar.mapTitle')}
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                {t('calendar.mapSubtitle')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="relative bg-surface border border-white/5 overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-navy-800)_0%,_var(--color-surface)_70%)]" />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-gold-500)" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="var(--color-gold-500)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-gold-500)" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <polyline
                  points="82,62 68,22 55,58 60,38 62,20 52,44 82,62"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              </svg>

              {events.map((event, i) => (
                <EventMapDot key={event.id} event={event} index={i} />
              ))}

              <div className="absolute bottom-4 left-4 flex items-center gap-6 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-navy-700" />
                  <span>{t('calendar.legendProSeries')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gold-500" />
                  <span>{t('calendar.legendGrandChampionship')}</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Event Cards */}
      <section className="py-16 sm:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-8 border-b border-white/5">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-heading font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'upcoming'
                  ? 'border-gold-500 text-gold-500'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Clock size={14} />
              {t('calendar.upcoming', 'Upcoming')}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-heading font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'past'
                  ? 'border-gold-500 text-gold-500'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Trophy size={14} />
              {t('calendar.pastResults', 'Past Results')}
            </button>
          </div>

          {activeTab === 'past' ? (
            /* Past events grouped by year */
            <div className="space-y-10">
              {pastEventsByYear.length === 0 ? (
                <div className="text-center py-16 text-text-muted text-sm">
                  {t('calendar.noPastEvents', 'No past events yet.')}
                </div>
              ) : pastEventsByYear.map(({ year, events: yearEvents }) => (
                <div key={year}>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-4 border-b border-white/5 pb-2">{year}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {yearEvents.map((event, i) => (
                      <ScrollReveal key={event.id} delay={i * 0.08}>
                        <EventCard event={event} formatDate={formatEventDate} t={t} isPast />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 0.08}>
                <div
                  className={`group p-6 border transition-all duration-300 hover:border-gold-500/30 h-full flex flex-col ${
                    event.is_main_event
                      ? 'bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 lg:col-span-1'
                      : 'bg-navy-900 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-heading font-bold uppercase tracking-widest text-text-muted bg-navy-800 px-2 py-1 border border-white/5">
                      {event.country_code}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: event.asjjf_stars }).map((_, j) => (
                        <Star key={j} size={12} className="fill-gold-500 text-gold-500" />
                      ))}
                    </div>
                  </div>

                  <h3 className={`font-heading font-bold text-lg mb-2 ${
                    event.is_main_event ? 'text-gold-500' : 'text-text-primary'
                  }`}>
                    {event.name}
                  </h3>

                  <div className="space-y-2 text-sm text-text-secondary mb-6 flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-text-muted shrink-0" />
                      {formatEventDate(event.date, event.end_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-text-muted shrink-0" />
                      {event.venue_name}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={event.registration_url || 'https://asjjf.org'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-heading font-bold uppercase tracking-wider transition-colors ${
                        event.is_main_event
                          ? 'bg-gold-500 text-navy-900 hover:bg-gold-400'
                          : 'bg-navy-700 text-text-primary hover:bg-navy-600'
                      }`}
                    >
                      {t('calendar.register')}
                      <ExternalLink size={12} />
                    </a>
                    {event.is_main_event && (
                      <Link
                        to="/event"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gold-500/30 text-gold-500 text-sm font-heading font-bold uppercase tracking-wider hover:bg-gold-500/10 transition-colors"
                      >
                        {t('calendar.details')}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EventCard({ event, formatDate, t, isPast }: {
  event: Event;
  formatDate: (d: string, e?: string | null) => string;
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
  isPast?: boolean;
}) {
  return (
    <div
      className={`group p-6 border transition-all duration-300 hover:border-gold-500/30 h-full flex flex-col ${
        event.is_main_event && !isPast
          ? 'bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20'
          : 'bg-navy-900 border-white/5'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-heading font-bold uppercase tracking-widest text-text-muted bg-navy-800 px-2 py-1 border border-white/5">
          {event.country_code}
        </span>
        <div className="flex items-center gap-2">
          {isPast && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-white/5 text-text-muted border border-white/10">
              {t('calendar.completed', 'Completed')}
            </span>
          )}
          <div className="flex gap-0.5">
            {Array.from({ length: event.asjjf_stars }).map((_, j) => (
              <Star key={j} size={12} className="fill-gold-500 text-gold-500" />
            ))}
          </div>
        </div>
      </div>

      <h3 className={`font-heading font-bold text-lg mb-2 ${
        event.is_main_event && !isPast ? 'text-gold-500' : 'text-text-primary'
      }`}>
        {event.name}
      </h3>

      <div className="space-y-2 text-sm text-text-secondary mb-6 flex-1">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-text-muted shrink-0" />
          {formatDate(event.date, event.end_date)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-text-muted shrink-0" />
          {event.venue_name}
        </div>
      </div>

      {!isPast && (
        <div className="flex gap-2">
          <a
            href={event.registration_url || 'https://asjjf.org'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-heading font-bold uppercase tracking-wider transition-colors ${
              event.is_main_event
                ? 'bg-gold-500 text-navy-900 hover:bg-gold-400'
                : 'bg-navy-700 text-text-primary hover:bg-navy-600'
            }`}
          >
            {t('calendar.register')}
            <ExternalLink size={12} />
          </a>
          {event.is_main_event && (
            <Link
              to="/event"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gold-500/30 text-gold-500 text-sm font-heading font-bold uppercase tracking-wider hover:bg-gold-500/10 transition-colors"
            >
              {t('calendar.details')}
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
