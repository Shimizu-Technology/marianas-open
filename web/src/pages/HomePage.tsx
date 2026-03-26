import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Calendar, Trophy, Users, Globe, ExternalLink, Handshake } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ImageWithShimmer from '../components/ImageWithShimmer';
import JourneySection from '../components/JourneySection';
import SEO from '../components/SEO';
import { useEvents, useSponsors } from '../hooks/useApi';
import { useSiteContent } from '../hooks/useSiteContent';

import { useSiteImages, getImageUrl } from '../hooks/useSiteImages';
import { resolveMediaUrl, getSponsorLogo, normalizeExternalUrl } from '../utils/images';
import { getOrganizationSchema, getWebsiteSchema } from '../lib/seo';

function normalizeSponsorKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ORG_PARTNERS = [
  {
    key: 'asjjf',
    name: 'ASJJF',
    label: 'Asian Sport Jiu-Jitsu Federation',
    src: '/images/logos/asjjf-logo.png',
    url: 'https://asjjf.org',
    heightClass: 'h-24 sm:h-28',
  },
  {
    key: 'msjjf',
    name: 'MSJJF',
    label: 'Marianas Sport Jiu-Jitsu Federation',
    src: '/images/logos/msjjf-logo-white.png',
    url: 'https://marianasopen.com',
    heightClass: 'h-20 sm:h-24',
  },
  {
    key: 'copademarianas',
    name: 'Copa de Marianas',
    label: 'International Championship',
    src: '/images/logos/copa-seal-logo.png',
    url: 'https://asjjf.org/main/eventInfo/1837',
    heightClass: 'h-24 sm:h-28',
  },
  {
    key: 'roadtotheopen',
    name: 'Road to the Open',
    label: '2026 Pro Series',
    src: '/images/logos/road-to-open-logo-white.png',
    url: 'https://marianasopen.com/calendar',
    heightClass: 'h-16 sm:h-20',
  },
] as const;

const OFFICIAL_SPONSORS_STATIC = [
  { name: 'Triple J' },
  { name: 'Pacific Points' },
  { name: "Foody's" },
  { name: 'Deal Depot' },
  { name: 'CFPT' },
  { name: 'Fokai' },
  { name: 'Jamz Media' },
  { name: 'Cherry Media' },
  { name: 'Mannge Pops' },
  { name: 'Aloha Maid' },
  { name: 'Fence Masters' },
  { name: 'ITE', url: 'https://shop.ite.net' },
  { name: 'Hertz & Dollar', url: 'https://www.hertz.com/us/en/location/guam/guam/gumt50' },
  { name: 'Stroll Guam', url: 'https://stroll.international' },
] as const;


export default function HomePage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const { events, loading: eventsLoading } = useEvents();
  const { sponsors } = useSponsors();
  const { images: siteImages } = useSiteImages();
  const { content: siteContent, t: sc, loading: siteContentLoading, hasCachedContent } = useSiteContent();

  const heroFallback = '/images/hero-podium.jpg';
  const heroImage = getImageUrl(siteImages, 'hero', heroFallback);
  const featuredFallbacks = [
    '/images/gallery/event-photo-4.jpg',
    '/images/gallery/event-photo-2.jpg',
    '/images/gallery/event-photo-3.jpg',
  ];

  const featuredImages = [
    getImageUrl(siteImages, 'featured', featuredFallbacks[0], 0),
    getImageUrl(siteImages, 'featured', featuredFallbacks[1], 1),
    getImageUrl(siteImages, 'featured', featuredFallbacks[2], 2),
  ];

  const stats = [
    { value: sc('stat_competitors', t('stats.competitors')), label: sc('stat_competitors_label', t('stats.competitorsLabel')), icon: Users },
    { value: sc('stat_countries', t('stats.countries')), label: sc('stat_countries_label', t('stats.countriesLabel')), icon: Globe },
    { value: sc('stat_prize_pool', t('stats.prizePool')), label: sc('stat_prize_pool_label', t('stats.prizePoolLabel')), icon: Trophy },
    { value: sc('stat_established', t('stats.since')), label: sc('stat_established_label', t('stats.sinceLabel')), icon: Calendar },
  ];
  const showHeroSkeleton = siteContentLoading && !hasCachedContent && !siteContent;

  return (
    <div className="min-h-screen">
      <SEO
        title="International Brazilian Jiu-Jitsu Championship"
        description={sc('hero_description', "Marianas Open is Guam's premier international Brazilian Jiu-Jitsu championship, featuring qualifier events across Asia-Pacific and a grand championship in Guam.")}
        path="/"
        image={heroImage}
        structuredData={[getWebsiteSchema(), getOrganizationSchema()]}
      />
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
          {showHeroSkeleton ? (
            <div className="animate-pulse">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-gold-500/20 rounded-full bg-gold-500/5">
                <div className="w-3.5 h-3.5 rounded-full bg-gold-500/40" />
                <div className="h-4 w-44 rounded bg-gold-500/20" />
              </div>

              <div className="h-5 sm:h-6 w-64 max-w-full mx-auto mb-4 rounded bg-white/10" />

              <div className="space-y-3 mb-8">
                <div className="h-14 sm:h-20 lg:h-24 w-full max-w-4xl mx-auto rounded bg-white/10" />
                <div className="h-14 sm:h-20 lg:h-24 w-3/4 max-w-3xl mx-auto rounded bg-gold-500/15" />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <div className="h-14 w-56 rounded bg-gold-500/25" />
                <div className="h-14 w-56 rounded bg-white/10" />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

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
                  <ImageWithShimmer src={featuredImages[0]} fallbackSrc={featuredFallbacks[0]} alt="BJJ competition match" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-gold-500">{sc('economic_impact_value', t('home.economicImpactValue'))}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{sc('economic_impact_label', t('home.economicImpact'))}</div>
                  </div>
                </div>
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src={featuredImages[1]} fallbackSrc={featuredFallbacks[1]} alt="Marianas Open venue" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-text-primary">{sc('spectators_value', t('home.spectatorsValue'))}</div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">{sc('spectators_label', t('home.spectators'))}</div>
                  </div>
                </div>
                <div className="relative col-span-2 overflow-hidden border border-white/5">
                  <ImageWithShimmer src={featuredImages[2]} fallbackSrc={featuredFallbacks[2]} alt="Podium ceremony" className="w-full h-48 object-cover" />
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

      {/* Official Partners — logo strip */}
      <section className="py-24 sm:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-14">
              <p className="text-xs font-heading font-semibold uppercase tracking-[0.3em] text-text-muted mb-2">
                {t('home.partnersTitle')}
              </p>
              <div className="w-8 h-px bg-gold-500/30 mx-auto mt-3 mb-5" />
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                {t('home.partnersDesc')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-4xl mx-auto">
              {ORG_PARTNERS.map((partner) => (
                <a
                  key={partner.key}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center justify-between text-center h-40 sm:h-44"
                >
                  <div className="flex-1 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-0.5">
                    <img
                      src={partner.src}
                      alt={partner.name}
                      className={`${partner.heightClass} object-contain`}
                    />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-heading font-semibold uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors duration-300 leading-tight mt-2">
                    {partner.label}
                  </div>
                </a>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Official Sponsors Section */}
      <section className="pt-16 sm:pt-20 pb-24 sm:pb-32 bg-surface border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 border border-gold-500/30 rounded-full bg-gold-500/5">
                <Handshake size={14} className="text-gold-500" />
                <span className="text-sm text-gold-400 font-medium tracking-wide">
                  {t('home.sponsorsTitle')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase mb-4">
                {t('home.sponsorsSectionHeading')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('home.sponsorsIntro')}
              </p>
            </div>
          </ScrollReveal>

          {/* Presenting Partner — GVB */}
          <ScrollReveal delay={0.1}>
            <div className="mb-16">
              <p className="text-xs font-heading font-semibold uppercase tracking-[0.3em] text-gold-500 text-center mb-8">
                {t('home.presentingPartner')}
              </p>
              {(() => {
                const gvbSponsor = sponsors.find(s => normalizeSponsorKey(s.name).includes('gvb'));
                const gvbLogo = resolveMediaUrl(gvbSponsor?.logo_url) || '/images/logos/sponsors/gvb-logo-white.png';
                const gvbUrl = gvbSponsor?.website_url || 'https://www.visitguam.com';
                return (
                  <div className="max-w-2xl mx-auto text-center">
                    <a
                      href={gvbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mb-6 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={gvbLogo}
                        alt="Guam Visitors Bureau"
                        className="h-24 sm:h-28 object-contain mx-auto"
                      />
                    </a>
                    <p className="text-text-secondary text-sm sm:text-base leading-relaxed italic max-w-xl mx-auto">
                      &ldquo;{t('home.gvbQuote')}&rdquo;
                    </p>
                  </div>
                );
              })()}
            </div>
          </ScrollReveal>

          {/* Official Sponsors Grid */}
          <ScrollReveal delay={0.2}>
            <div className="border-t border-white/5 pt-12">
              <p className="text-xs font-heading font-semibold uppercase tracking-[0.3em] text-text-muted text-center mb-10">
                {t('home.officialSponsors')}
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto">
                {(() => {
                  const officialFromApi = sponsors.filter(
                    s => s.tier === 'official' && !normalizeSponsorKey(s.name).includes('gvb')
                  );
                  const items = officialFromApi.length > 0
                    ? officialFromApi.map(s => ({
                        name: s.name,
                        url: s.website_url,
                        logoSrc: getSponsorLogo(s.name, s.logo_url),
                      }))
                    : OFFICIAL_SPONSORS_STATIC.map(s => ({
                        name: s.name,
                        url: ('url' in s ? s.url : null) as string | null,
                        logoSrc: getSponsorLogo(s.name),
                      }));

                  return items.map((item) => {
                    const inner = (
                      <div className="group/card bg-navy-900/80 border border-white/5 hover:border-gold-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/5 w-[calc(33.333vw-1.5rem)] sm:w-36 md:w-40 h-24 sm:h-28">
                        {item.logoSrc ? (
                          <div className="bg-white/95 rounded-md px-3 py-2 flex items-center justify-center w-full h-full">
                            <img
                              src={item.logoSrc}
                              alt={item.name}
                              className="max-h-14 sm:max-h-16 max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-text-primary group-hover/card:text-gold-400 transition-colors duration-300">
                            {item.name}
                          </div>
                        )}
                      </div>
                    );

                    return item.url ? (
                      <a
                        key={item.name}
                        href={normalizeExternalUrl(item.url) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div key={item.name}>{inner}</div>
                    );
                  });
                })()}
              </div>
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
                href="https://shimizu-technology.com"
                target="_blank"
                rel="noopener noreferrer"
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
