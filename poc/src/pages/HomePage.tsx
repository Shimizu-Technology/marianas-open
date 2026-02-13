import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Calendar, Trophy, Users, Globe, ExternalLink } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ImageWithShimmer from '../components/ImageWithShimmer';
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

function getDateLocale(lang: string) {
  const map: Record<string, string> = { ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', tl: 'fil-PH' };
  return map[lang] || 'en-US';
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
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
        {/* Background image */}
        <div className="absolute inset-0">
          <ImageWithShimmer
            src="/images/action-match-1.webp"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-navy-900/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/40" />
        </div>

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
                {t('hero.asjjfBadge')}
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
                  {t('home.since2007')}
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
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src="/images/action-match-2.webp" alt="BJJ competition match" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-gold-500">{t('home.economicImpactValue')}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{t('home.economicImpact')}</div>
                  </div>
                </div>
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src="/images/venue-crowd.webp" alt="Marianas Open venue" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-text-primary">{t('home.spectatorsValue')}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{t('home.spectators')}</div>
                  </div>
                </div>
                <div className="relative col-span-2 overflow-hidden border border-white/5">
                  <ImageWithShimmer src="/images/podium-1.webp" alt="Podium ceremony" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-900/70 to-transparent" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={18} className="text-gold-500" />
                      <span className="text-sm text-gold-400 font-heading uppercase tracking-wider font-semibold">
                        {t('home.internationalReach')}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                      {t('home.internationalReachDesc')}
                    </p>
                  </div>
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
                      {new Date(event.date).toLocaleDateString(getDateLocale(i18n.language), { month: 'short' })}
                    </div>
                    <div className="text-2xl font-heading font-black">
                      {new Date(event.date).toLocaleDateString(getDateLocale(i18n.language), { day: 'numeric' })}
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
                          {t('home.mainEvent')}
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

      {/* Built by Shimizu Technology */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-12 h-px bg-gold-500/40 mx-auto" />
              <p className="text-sm font-heading font-semibold uppercase tracking-[0.2em] text-text-muted">
                {t('shimizu.title')}
              </p>
              <p className="text-text-secondary text-sm leading-relaxed max-w-lg mx-auto">
                {t('shimizu.description')}
              </p>
              <a
                href="mailto:leon@shimizu-technology.com"
                className="inline-flex items-center gap-2 text-gold-500 text-sm font-heading font-semibold uppercase tracking-wider hover:text-gold-400 transition-colors"
              >
                {t('shimizu.cta')}
                <ExternalLink size={14} />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
