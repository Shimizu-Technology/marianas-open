import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Calendar, Trophy, Users, Globe } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { events } from '../data/events';

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} className="fill-gold-500 text-gold-500" />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const stats = [
    { value: t('stats.competitors'), label: t('stats.competitorsLabel'), icon: Users },
    { value: t('stats.countries'), label: t('stats.countriesLabel'), icon: Globe },
    { value: t('stats.prizePpool'), label: t('stats.prizePoolLabel'), icon: Trophy },
    { value: t('stats.since'), label: t('stats.sinceLabel'), icon: Calendar },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-navy-700)_0%,_transparent_50%)] opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-gold-500)_0%,_transparent_40%)] opacity-[0.07]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-gold-500/30 rounded-full bg-gold-500/5">
              <Star size={14} className="text-gold-500 fill-gold-500" />
              <span className="text-sm text-gold-400 font-medium tracking-wide">
                ASJJF 5-Star Ranked Event
              </span>
            </div>
          </motion.div>

          <motion.p
            className="text-text-secondary text-lg sm:text-xl tracking-[0.2em] uppercase font-heading mb-4"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.h1
            className="text-5xl sm:text-7xl lg:text-8xl font-heading font-black uppercase tracking-tight leading-[0.9] mb-8"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-text-primary">{t('hero.title').split(' ').slice(0, -1).join(' ')}</span>
            <br />
            <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
              {t('hero.title').split(' ').slice(-1)}
            </span>
          </motion.h1>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <a
              href="https://asjjf.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-all duration-300"
            >
              {t('hero.cta')}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-text-primary font-heading font-medium uppercase tracking-wider text-sm hover:bg-white/5 transition-all duration-300"
            >
              {t('hero.learnMore')}
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 max-w-3xl mx-auto"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-navy-900/80 backdrop-blur-sm p-6 text-center">
                <stat.icon size={18} className="text-gold-500 mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl font-heading font-black text-text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-text-muted uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-5 h-8 border-2 border-white/20 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-gold-500 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Featured section — editorial asymmetric layout */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            <ScrollReveal className="lg:col-span-5">
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 border border-gold-500/30 text-gold-500 text-xs font-heading uppercase tracking-widest">
                  Since 2007
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black uppercase leading-tight">
                  {t('home.featuredTitle')}
                </h2>
                <p className="text-text-secondary text-lg leading-relaxed">
                  {t('home.featuredDesc')}
                </p>
                <div className="flex gap-4 pt-4">
                  <Link
                    to="/event"
                    className="inline-flex items-center gap-2 text-gold-500 font-heading font-semibold text-sm uppercase tracking-wider hover:text-gold-400 transition-colors"
                  >
                    {t('home.registerNow')}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* Bento grid of stats/images */}
            <ScrollReveal className="lg:col-span-7" delay={0.2}>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface border border-white/5 p-8 space-y-2">
                  <div className="text-5xl font-heading font-black text-gold-500">$2M</div>
                  <div className="text-sm text-text-muted uppercase tracking-wider">Economic Impact</div>
                </div>
                <div className="bg-surface border border-white/5 p-8 space-y-2">
                  <div className="text-5xl font-heading font-black text-text-primary">5K+</div>
                  <div className="text-sm text-text-muted uppercase tracking-wider">Spectators</div>
                </div>
                <div className="col-span-2 bg-gradient-to-r from-navy-700 to-navy-800 p-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-gold-500" />
                    <span className="text-sm text-gold-400 font-heading uppercase tracking-wider font-semibold">
                      International Reach
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Partners in Korea, Japan, Taiwan, Philippines, and Hong Kong. 
                    Featured in 30,000+ printed magazines across Asia.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 2026 Pro Series Timeline */}
      <section className="py-24 sm:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                {t('home.upcomingTitle')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('home.upcomingSubtitle')}
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {events.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 0.08}>
                <Link
                  to={event.isMainEvent ? '/event' : '/calendar'}
                  className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 p-6 border transition-all duration-300 hover:border-gold-500/30 ${
                    event.isMainEvent
                      ? 'bg-gradient-to-r from-gold-500/10 to-transparent border-gold-500/20'
                      : 'bg-navy-900/50 border-white/5 hover:bg-navy-900'
                  }`}
                >
                  {/* Date */}
                  <div className="shrink-0 w-28">
                    <div className="text-xs text-text-muted uppercase tracking-wider font-heading">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="text-2xl font-heading font-black">
                      {new Date(event.date).toLocaleDateString('en-US', { day: 'numeric' })}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-heading font-bold text-lg truncate ${
                        event.isMainEvent ? 'text-gold-500' : 'text-text-primary'
                      }`}>
                        {event.name}
                      </h3>
                      {event.isMainEvent && (
                        <span className="shrink-0 text-xs px-2 py-0.5 bg-gold-500 text-navy-900 font-bold uppercase tracking-wider">
                          Main Event
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {event.venue} · {event.location}
                    </p>
                  </div>

                  {/* Stars + Arrow */}
                  <div className="flex items-center gap-4 shrink-0">
                    <StarRating count={event.asjjfStars} />
                    <ArrowRight
                      size={16}
                      className="text-text-muted group-hover:text-gold-500 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="text-center mt-12">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gold-500/30 text-gold-500 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-500/10 transition-all duration-300"
            >
              {t('home.viewCalendar')}
              <ArrowRight size={16} />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Sponsors */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-sm font-heading font-semibold uppercase tracking-[0.3em] text-text-muted">
                {t('home.sponsorsTitle')}
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-40">
              {['ASJJF', 'GVB', 'United Airlines', 'Hyatt Regency', 'Dusit Thani'].map((name) => (
                <div
                  key={name}
                  className="text-lg font-heading font-bold uppercase tracking-wider text-text-secondary"
                >
                  {name}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
