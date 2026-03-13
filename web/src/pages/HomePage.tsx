import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Calendar, Trophy, Users, Globe, ExternalLink } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ImageWithShimmer from '../components/ImageWithShimmer';
import LoadingSpinner from '../components/LoadingSpinner';
import JourneySection from '../components/JourneySection';
import { useEvents, useSponsors } from '../hooks/useApi';
import { useSiteContent } from '../hooks/useSiteContent';

import { useSiteImages, getImageUrl } from '../hooks/useSiteImages';
import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} className="fill-gold-500 text-gold-500" />
      ))}
    </div>
  );
}

function normalizeSponsorKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Static fallback logos for known commercial sponsors.
 * Used when the API returns no sponsors or when a sponsor has no logo_url.
 * Keys must match normalizeSponsorKey() output.
 *
 * License notes:
 *   - hyatt:           Wikimedia Commons (pd) https://commons.wikimedia.org/wiki/File:Hyatt_Logo.svg
 *   - dusit*:          Wikimedia Commons (pd-textlogo) https://commons.wikimedia.org/wiki/File:Dusit_Thani_Logo.svg
 *   - gvb:             Official GVB website https://www.guamvisitorsbureau.com/ (event sponsor)
 *   - unitedairlines:  PROVISIONAL — en.wikipedia.org fair-use; replace with sponsor-provided asset
 */
const SPONSOR_LOGO_FALLBACK: Record<string, { src: string; url: string }> = {
  gvb: {
    src: '/images/logos/sponsors/gvb-logo.png',
    url: 'https://www.visitguam.com',
  },
  unitedairlines: {
    src: '/images/logos/sponsors/united-airlines-logo.svg',
    url: 'https://www.united.com',
  },
  hyattregencyguam: {
    src: '/images/logos/sponsors/hyatt-logo.svg',
    url: 'https://www.hyatt.com',
  },
  hyatt: {
    src: '/images/logos/sponsors/hyatt-logo.svg',
    url: 'https://www.hyatt.com',
  },
  dusitthaniguam: {
    src: '/images/logos/sponsors/dusit-logo.svg',
    url: 'https://www.dusit.com',
  },
  dusit: {
    src: '/images/logos/sponsors/dusit-logo.svg',
    url: 'https://www.dusit.com',
  },
};

const ORG_PARTNERS = [
  {
    key: 'asjjf',
    name: 'ASJJF',
    src: '/images/logos/asjjf-logo.png',
    url: 'https://asjjf.org',
    heightClass: 'h-14',
  },
  {
    key: 'msjjf',
    name: 'MSJJF',
    src: '/images/logos/msjjf-logo-white.png',
    url: 'https://marianasopen.com',
    heightClass: 'h-12',
  },
  {
    key: 'copademarianas',
    name: 'Copa de Marianas',
    src: '/images/logos/copa-seal-logo.png',
    url: 'https://asjjf.org/main/eventInfo/1837',
    heightClass: 'h-14',
  },
  {
    key: 'roadtotheopen',
    name: 'Road to the Open',
    src: '/images/logos/road-to-open-logo-white.png',
    url: 'https://marianasopen.com/calendar',
    heightClass: 'h-10',
  },
] as const;

const ORG_PARTNER_KEY_SET = new Set<string>(ORG_PARTNERS.map((partner) => partner.key));


export default function HomePage() {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const { events, loading: eventsLoading } = useEvents();
  const { sponsors, loading: sponsorsLoading } = useSponsors();
  const { images: siteImages } = useSiteImages();
  const { t: sc } = useSiteContent();

  const heroImage = '/images/hero-podium.jpg';
  const galleryImages = [
    getImageUrl(siteImages, 'gallery', '/images/gallery/event-photo-4.jpg', 0),
    getImageUrl(siteImages, 'gallery', '/images/gallery/event-photo-2.jpg', 1),
    getImageUrl(siteImages, 'gallery', '/images/gallery/event-photo-3.jpg', 2),
  ];

  const stats = [
    { value: sc('stat_competitors', t('stats.competitors')), label: sc('stat_competitors_label', t('stats.competitorsLabel')), icon: Users },
    { value: sc('stat_countries', t('stats.countries')), label: sc('stat_countries_label', t('stats.countriesLabel')), icon: Globe },
    { value: sc('stat_prize_pool', t('stats.prizePool')), label: sc('stat_prize_pool_label', t('stats.prizePoolLabel')), icon: Trophy },
    { value: sc('stat_established', t('stats.since')), label: sc('stat_established_label', t('stats.sinceLabel')), icon: Calendar },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <ImageWithShimmer
            src={heroImage}
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
                {sc('hero_badge', t('hero.asjjfBadge'))}
              </span>
            </div>
          </motion.div>

          <motion.p
            className="text-text-secondary text-lg sm:text-xl tracking-[0.2em] uppercase font-heading mb-4"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {sc('hero_subtitle', t('hero.subtitle'))}
          </motion.p>

          <motion.h1
            className="text-5xl sm:text-7xl lg:text-8xl font-heading font-black uppercase tracking-tight leading-[0.9] mb-8"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-text-primary">{sc('hero_title_line1', t('hero.title').split(' ').slice(0, -1).join(' '))}</span>
            <br />
            <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
              {sc('hero_title_line2', t('hero.title').split(' ').slice(-1)[0])}
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
                  {sc('featured_badge', t('home.since2007'))}
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black uppercase leading-tight">
                  {sc('featured_title', t('home.featuredTitle'))}
                </h2>
                <p className="text-text-secondary text-lg leading-relaxed">
                  {sc('featured_desc', t('home.featuredDesc'))}
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
                  <ImageWithShimmer src={galleryImages[0]} alt="BJJ competition match" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-gold-500">{sc('economic_impact_value', t('home.economicImpactValue'))}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{sc('economic_impact_label', t('home.economicImpact'))}</div>
                  </div>
                </div>
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src={galleryImages[1]} alt="Marianas Open venue" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-text-primary">{sc('spectators_value', t('home.spectatorsValue'))}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{sc('spectators_label', t('home.spectators'))}</div>
                  </div>
                </div>
                <div className="relative col-span-2 overflow-hidden border border-white/5">
                  <ImageWithShimmer src={galleryImages[2]} alt="Podium ceremony" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-900/70 to-transparent" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={18} className="text-gold-500" />
                      <span className="text-sm text-gold-400 font-heading uppercase tracking-wider font-semibold">
                        {sc('international_reach_title', t('home.internationalReach'))}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                      {sc('international_reach_desc', t('home.internationalReachDesc'))}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      {!eventsLoading && events.length > 0 && (
        <JourneySection events={events} />
      )}

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

          {eventsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.08}>
                  <Link
                    to={event.is_main_event ? '/event' : '/calendar'}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 p-6 border transition-all duration-300 hover:border-gold-500/30 ${
                      event.is_main_event
                        ? 'bg-gradient-to-r from-gold-500/10 to-transparent border-gold-500/20'
                        : 'bg-navy-900/50 border-white/5 hover:bg-navy-900'
                    }`}
                  >
                    {/* Date */}
                    <div className="shrink-0 w-28">
                      <div className="text-xs text-text-muted uppercase tracking-wider font-heading">
                        {parseDateLocalSafe(event.date).toLocaleDateString(getDateLocale(i18n.language), { month: 'short' })}
                      </div>
                      <div className="text-2xl font-heading font-black">
                        {parseDateLocalSafe(event.date).toLocaleDateString(getDateLocale(i18n.language), { day: 'numeric' })}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-heading font-bold text-lg truncate ${
                          event.is_main_event ? 'text-gold-500' : 'text-text-primary'
                        }`}>
                          {event.name}
                        </h3>
                        {event.is_main_event && (
                          <span className="shrink-0 text-xs px-2 py-0.5 bg-gold-500 text-navy-900 font-bold uppercase tracking-wider">
                            {t('home.mainEvent')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {event.venue_name} · {event.city}, {event.country}
                      </p>
                    </div>

                    {/* Stars + Arrow */}
                    <div className="flex items-center gap-4 shrink-0">
                      <StarRating count={event.asjjf_stars} />
                      <ArrowRight
                        size={16}
                        className="text-text-muted group-hover:text-gold-500 group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}

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

      {/* Official Partners — logo strip */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-xs font-heading font-semibold uppercase tracking-[0.3em] text-text-muted mb-1">
                {t('home.sponsorsTitle')}
              </p>
              <div className="w-8 h-px bg-gold-500/30 mx-auto mt-3" />
            </div>
          </ScrollReveal>

          {/* Org partner logos */}
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 mb-10">
              {ORG_PARTNERS.map((partner) => (
                <a
                  key={partner.key}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity duration-300"
                >
                  <img
                    src={partner.src}
                    alt={partner.name}
                    className={`${partner.heightClass} object-contain`}
                  />
                </a>
              ))}
            </div>
          </ScrollReveal>

          {/* Commercial sponsors — text or logo from API */}
          <ScrollReveal delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-35">
              {sponsorsLoading ? (
                <div className="text-text-muted text-sm">...</div>
              ) : sponsors.length > 0 ? (
                sponsors
                  .filter((sponsor) => !ORG_PARTNER_KEY_SET.has(normalizeSponsorKey(sponsor.name)))
                  .map((sponsor) => {
                    const key = normalizeSponsorKey(sponsor.name);
                    const fallback = SPONSOR_LOGO_FALLBACK[key];
                    const logoSrc = sponsor.logo_url || fallback?.src || null;
                    const logoUrl = sponsor.website_url || fallback?.url || null;
                    return (
                      <div key={sponsor.id}>
                        {logoSrc ? (
                          logoUrl ? (
                            <a href={logoUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={logoSrc}
                                alt={sponsor.name}
                                className="h-8 object-contain"
                                style={{ filter: 'brightness(0) invert(1)' }}
                              />
                            </a>
                          ) : (
                            <img
                              src={logoSrc}
                              alt={sponsor.name}
                              className="h-8 object-contain"
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          )
                        ) : (
                          <div className="text-sm font-heading font-bold uppercase tracking-wider text-text-secondary">
                            {sponsor.name}
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                /* Static fallback: show logos when available, text otherwise */
                ['GVB', 'United Airlines', 'Hyatt Regency Guam', 'Dusit Thani Guam'].map((name) => {
                  const key = normalizeSponsorKey(name);
                  const fallback = SPONSOR_LOGO_FALLBACK[key];
                  if (fallback) {
                    return (
                      <a
                        key={name}
                        href={fallback.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <img
                          src={fallback.src}
                          alt={name}
                          className="h-8 object-contain"
                          style={{ filter: 'brightness(0) invert(1)' }}
                        />
                      </a>
                    );
                  }
                  return (
                    <div
                      key={name}
                      className="text-sm font-heading font-bold uppercase tracking-wider text-text-secondary"
                    >
                      {name}
                    </div>
                  );
                })
              )}
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
