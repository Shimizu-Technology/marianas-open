import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { events } from '../data/events';

function EventMapDot({ event, index }: { event: typeof events[0]; index: number }) {
  const shouldReduceMotion = useReducedMotion();

  // Simple projection for the interactive map visual
  // Normalized positions for the map area (percentage-based)
  const positions: Record<string, { x: number; y: number }> = {
    GU: { x: 82, y: 62 },
    JP: { x: 68, y: 22 },
    PH: { x: 55, y: 58 },
    TW: { x: 60, y: 38 },
    KR: { x: 62, y: 20 },
    HK: { x: 52, y: 44 },
  };

  const pos = positions[event.countryCode] || { x: 50, y: 50 };

  return (
    <motion.div
      className="absolute group"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5, type: 'spring' }}
    >
      {/* Ping animation for main event */}
      {event.isMainEvent && (
        <div className="absolute -inset-3 bg-gold-500/20 rounded-full animate-ping" />
      )}

      {/* Dot */}
      <div
        className={`relative w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-150 ${
          event.isMainEvent ? 'bg-gold-500' : 'bg-navy-700'
        }`}
      />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-navy-900 border border-white/10 p-3 whitespace-nowrap shadow-xl">
          <div className="font-heading font-bold text-sm text-text-primary">{event.name}</div>
          <div className="text-xs text-text-muted mt-1">{event.venue}</div>
          <div className="text-xs text-gold-400 mt-1">
            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen pt-16">
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
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              {t('calendar.subtitle')}
            </p>
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

          {/* Map visualization */}
          <ScrollReveal>
            <div className="relative bg-surface border border-white/5 overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {/* Stylized map background — grid + gradient */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-navy-800)_0%,_var(--color-surface)_70%)]" />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Connection lines between events */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-gold-500)" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="var(--color-gold-500)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-gold-500)" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                {/* GU -> JP -> PH -> TW -> KR -> HK -> GU */}
                <polyline
                  points="82,62 68,22 55,58 60,38 62,20 52,44 82,62"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              </svg>

              {/* Event dots */}
              {events.map((event, i) => (
                <EventMapDot key={event.id} event={event} index={i} />
              ))}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex items-center gap-6 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-navy-700" />
                  <span>Pro Series</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gold-500" />
                  <span>Grand Championship</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Event Cards */}
      <section className="py-16 sm:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 0.08}>
                <div
                  className={`group p-6 border transition-all duration-300 hover:border-gold-500/30 h-full flex flex-col ${
                    event.isMainEvent
                      ? 'bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 lg:col-span-1'
                      : 'bg-navy-900 border-white/5'
                  }`}
                >
                  {/* Country flag + Stars */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">
                      {event.countryCode === 'GU' && '🇬🇺'}
                      {event.countryCode === 'JP' && '🇯🇵'}
                      {event.countryCode === 'PH' && '🇵🇭'}
                      {event.countryCode === 'TW' && '🇹🇼'}
                      {event.countryCode === 'KR' && '🇰🇷'}
                      {event.countryCode === 'HK' && '🇭🇰'}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: event.asjjfStars }).map((_, j) => (
                        <Star key={j} size={12} className="fill-gold-500 text-gold-500" />
                      ))}
                    </div>
                  </div>

                  <h3 className={`font-heading font-bold text-lg mb-2 ${
                    event.isMainEvent ? 'text-gold-500' : 'text-text-primary'
                  }`}>
                    {event.name}
                  </h3>

                  <div className="space-y-2 text-sm text-text-secondary mb-6 flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-text-muted shrink-0" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {event.dateEnd && ` – ${new Date(event.dateEnd).toLocaleDateString('en-US', { day: 'numeric' })}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-text-muted shrink-0" />
                      {event.venue}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={event.registerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-heading font-bold uppercase tracking-wider transition-colors ${
                        event.isMainEvent
                          ? 'bg-gold-500 text-navy-900 hover:bg-gold-400'
                          : 'bg-navy-700 text-text-primary hover:bg-navy-600'
                      }`}
                    >
                      {t('calendar.register')}
                      <ExternalLink size={12} />
                    </a>
                    {event.isMainEvent && (
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
        </div>
      </section>
    </div>
  );
}
