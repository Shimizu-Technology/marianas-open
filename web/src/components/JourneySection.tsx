import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, MotionConfig } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Calendar,
  Trophy,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Circle,
} from 'lucide-react';
import type { Event } from '../services/api';
import ScrollReveal from './ScrollReveal';

function getDateLocale(lang: string) {
  const map: Record<string, string> = {
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    tl: 'fil-PH',
  };
  return map[lang] || 'en-US';
}

type StopStatus = 'completed' | 'next' | 'upcoming';

interface JourneyStop {
  event: Event;
  status: StopStatus;
}

function getStopStatus(event: Event): StopStatus {
  const now = new Date();
  const eventDate = new Date(event.date);
  const endDate = event.end_date ? new Date(event.end_date) : eventDate;

  if (endDate < now) return 'completed';
  if (eventDate <= now && endDate >= now) return 'next';
  return 'upcoming';
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={10} className="fill-gold-500 text-gold-500" />
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: StopStatus }) {
  switch (status) {
    case 'completed':
      return <CircleCheck size={16} className="text-green-400" />;
    case 'next':
      return <CircleDot size={16} className="text-gold-500" />;
    case 'upcoming':
      return <Circle size={16} className="text-text-muted" />;
  }
}

function StatusBadge({
  status,
  isMainEvent,
  t,
}: {
  status: StopStatus;
  isMainEvent: boolean;
  t: (key: string) => string;
}) {
  if (isMainEvent) {
    return (
      <span className="text-[10px] px-2 py-0.5 bg-gold-500 text-navy-900 font-bold uppercase tracking-wider rounded-sm">
        {t('journey.grandChampionship')}
      </span>
    );
  }

  const styles: Record<StopStatus, string> = {
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    next: 'bg-gold-500/10 text-gold-400 border-gold-500/20',
    upcoming: 'bg-white/5 text-text-muted border-white/10',
  };

  const labels: Record<StopStatus, string> = {
    completed: t('journey.completed'),
    next: t('journey.next'),
    upcoming: t('journey.upcoming'),
  };

  return (
    <span
      className={`text-[10px] px-2 py-0.5 border font-bold uppercase tracking-wider rounded-sm ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/* ─── Mobile: vertical timeline card ─── */
function MobileStop({
  stop,
  index,
  total,
  t,
  lang,
}: {
  stop: JourneyStop;
  index: number;
  total: number;
  t: (key: string) => string;
  lang: string;
}) {
  const { event, status } = stop;
  const isMain = event.is_main_event;
  const isLast = index === total - 1;

  return (
    <motion.div
      className="relative flex gap-4"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div
          className={`w-4 h-4 rounded-full border-2 z-10 ${
            isMain
              ? 'bg-gold-500 border-gold-500 shadow-[0_0_12px_rgba(212,168,67,0.5)]'
              : status === 'completed'
                ? 'bg-green-400 border-green-400'
                : status === 'next'
                  ? 'bg-gold-500 border-gold-500'
                  : 'bg-navy-800 border-white/20'
          }`}
        >
          {status === 'next' && !isMain && (
            <motion.div
              className="absolute inset-0 w-4 h-4 rounded-full bg-gold-500/30"
              animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </div>
        {!isLast && (
          <motion.div
            className={`w-px flex-1 ${
              status === 'completed' ? 'bg-green-400/30' : 'bg-white/10'
            }`}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
            style={{ transformOrigin: 'top' }}
          />
        )}
      </div>

      {/* Card */}
      <Link
        to={isMain ? '/event' : `/events/${event.slug}`}
        className={`group flex-1 mb-4 p-4 border transition-all duration-300 hover:border-gold-500/30 ${
          isMain
            ? 'bg-gradient-to-r from-gold-500/10 to-transparent border-gold-500/20'
            : 'bg-navy-900/50 border-white/5 hover:bg-navy-900'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <StatusBadge status={status} isMainEvent={isMain} t={t} />
          <StarRating count={event.asjjf_stars} />
        </div>

        <h3
          className={`font-heading font-bold text-base mb-1 ${
            isMain ? 'text-gold-500' : 'text-text-primary'
          }`}
        >
          {isMain && <Trophy size={14} className="inline mr-1.5 -mt-0.5" />}
          {event.name}
        </h3>

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {event.city}, {event.country}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(event.date).toLocaleDateString(getDateLocale(lang), {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-2 text-xs text-text-muted group-hover:text-gold-500 transition-colors">
          {t('journey.viewEvent')}
          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Desktop: horizontal journey card ─── */
function DesktopStop({
  stop,
  index,
  t,
  lang,
}: {
  stop: JourneyStop;
  index: number;
  t: (key: string) => string;
  lang: string;
}) {
  const { event, status } = stop;
  const isMain = event.is_main_event;

  return (
    <motion.div
      className={`relative flex flex-col items-center shrink-0 ${isMain ? 'w-52' : 'w-44'}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.12 }}
    >
      {/* Node on the line */}
      <div className="relative mb-4">
        <div
          className={`rounded-full border-2 z-10 relative ${
            isMain
              ? 'w-8 h-8 bg-gold-500 border-gold-500 shadow-[0_0_16px_rgba(212,168,67,0.5)]'
              : status === 'completed'
                ? 'w-5 h-5 bg-green-400 border-green-400'
                : status === 'next'
                  ? 'w-5 h-5 bg-gold-500 border-gold-500'
                  : 'w-5 h-5 bg-navy-800 border-white/20'
          }`}
        >
          {isMain && (
            <Trophy size={14} className="absolute inset-0 m-auto text-navy-900" />
          )}
        </div>
        {status === 'next' && (
          <motion.div
            className={`absolute rounded-full bg-gold-500/30 ${isMain ? 'inset-0' : '-inset-1'}`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </div>

      {/* Card */}
      <Link
        to={isMain ? '/event' : `/events/${event.slug}`}
        className={`group w-full p-4 border text-center transition-all duration-300 hover:border-gold-500/30 ${
          isMain
            ? 'bg-gradient-to-b from-gold-500/10 to-transparent border-gold-500/20'
            : 'bg-navy-900/50 border-white/5 hover:bg-navy-900'
        }`}
      >
        <div className="flex justify-center mb-2">
          <StatusBadge status={status} isMainEvent={isMain} t={t} />
        </div>

        <h3
          className={`font-heading font-bold text-sm mb-1 leading-tight ${
            isMain ? 'text-gold-500 text-base' : 'text-text-primary'
          }`}
        >
          {event.name}
        </h3>

        <div className="flex items-center justify-center gap-1 text-[11px] text-text-secondary mb-1">
          <MapPin size={10} />
          {event.city}, {event.country}
        </div>

        <div className="text-[11px] text-text-muted mb-2">
          {new Date(event.date).toLocaleDateString(getDateLocale(lang), {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>

        <div className="flex justify-center mb-2">
          <StarRating count={event.asjjf_stars} />
        </div>

        <div className="flex items-center justify-center gap-1 text-[11px] text-text-muted group-hover:text-gold-500 transition-colors">
          <StatusIcon status={status} />
          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Main Section ─── */
export default function JourneySection({ events }: { events: Event[] }) {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const journeyStops = useMemo<JourneyStop[]>(() => {
    const cutoffStart = new Date('2025-01-01');
    const cutoffEnd = new Date('2027-01-01');

    // Find the next upcoming event to mark as "next"
    let foundNext = false;

    return events
      .filter((e) => {
        const d = new Date(e.date);
        return d >= cutoffStart && d < cutoffEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((event) => {
        let status = getStopStatus(event);
        // Override: only the first non-completed event gets "next"
        if (status === 'next' || (status === 'upcoming' && !foundNext)) {
          if (!foundNext) {
            foundNext = true;
            status = 'next';
          } else {
            status = 'upcoming';
          }
        }
        return { event, status };
      });
  }, [events]);

  if (journeyStops.length === 0) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-gold-500/30 rounded-full bg-gold-500/5">
                <MapPin size={12} className="text-gold-500" />
                <span className="text-xs text-gold-400 font-heading uppercase tracking-widest font-medium">
                  {t('journey.badge')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                {t('journey.title')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('journey.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden">
            {journeyStops.map((stop, i) => (
              <MobileStop
                key={stop.event.id}
                stop={stop}
                index={i}
                total={journeyStops.length}
                t={t}
                lang={i18n.language}
              />
            ))}
          </div>

          {/* Desktop: horizontal journey */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Connection line */}
              <motion.div
                className="absolute top-[9px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={shouldReduceMotion ? {} : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              />
              {/* Completed progress overlay */}
              {(() => {
                const completedCount = journeyStops.filter(
                  (s) => s.status === 'completed'
                ).length;
                const pct =
                  journeyStops.length > 1
                    ? ((completedCount + 0.5) / journeyStops.length) * 100
                    : 0;
                return completedCount > 0 ? (
                  <motion.div
                    className="absolute top-[9px] left-0 h-px bg-gradient-to-r from-green-400/50 to-gold-500/50"
                    initial={shouldReduceMotion ? {} : { width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  />
                ) : null;
              })()}

              <div className="flex justify-between gap-3">
                {journeyStops.map((stop, i) => (
                  <DesktopStop
                    key={stop.event.id}
                    stop={stop}
                    index={i}
                    t={t}
                    lang={i18n.language}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
