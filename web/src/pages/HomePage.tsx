import { useOrg } from '../contexts/OrganizationContext';
import { usePublicLinks } from '../hooks/usePublicLinks';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Trophy, Users, Globe, ExternalLink, MapPin } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ImageWithShimmer from '../components/ImageWithShimmer';
import JourneySection from '../components/JourneySection';
import SEO from '../components/SEO';
import { useEvents } from '../hooks/useApi';
import { useSiteContent } from '../hooks/useSiteContent';

import { useSiteImages, getImageUrl } from '../hooks/useSiteImages';
import { FeaturedSponsorBar, SponsorTiers, SponsorPlacementsError } from '../components/SponsorPlacements';
import { useSponsorPlacements } from '../hooks/useSponsorPlacements';
import { eventPhase, getCurrentMainEvent, getEventCycleYear, selectHomeState } from '../utils/events';
import { useResultCounts } from '../hooks/useResultCounts';
import { useTranslatedField } from '../hooks/useTranslatedField';
import RegisterControl from '../components/RegisterControl';
import EventStars from '../components/EventStars';
import { eventHeroImage } from '../components/eventPresentation';
import { Button, buttonClassName } from '../components/ui';
import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';
import { getOrganizationSchema, getWebsiteSchema } from '../lib/seo';

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
    label: 'Annual Pro Series',
    src: '/images/logos/road-to-open-logo-white.png',
    url: 'https://marianasopen.com/calendar',
    heightClass: 'h-16 sm:h-20',
  },
] as const;

export default function HomePage() {
  const { t, i18n } = usePublicCopy();
  const { tf } = useTranslatedField();
  const publicLink = usePublicLinks();
  const org = useOrg();
  const { events, loading: eventsLoading } = useEvents();
  const { placements, error: placementsError, retry: retryPlacements } = useSponsorPlacements();
  const { images: siteImages } = useSiteImages();
  const { t: sc } = useSiteContent();

  const heroFallback = '/images/hero-podium.jpg';
  const state = selectHomeState(events);
  const nextEvent = state.nextEvent;
  const heroImage = nextEvent ? eventHeroImage(nextEvent, events, getImageUrl(siteImages, 'hero', heroFallback)) : getImageUrl(siteImages, 'hero', heroFallback);
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
  const currentMainEvent = getCurrentMainEvent(events);
  const primaryEventPath = currentMainEvent ? '/event' : '/calendar';

  return (
    <div className="min-h-screen">
      <SEO
        title="International Brazilian Jiu-Jitsu Championship"
        description={sc('hero_description', "Marianas Open is Guam's premier international Brazilian Jiu-Jitsu championship, featuring qualifier events across Asia-Pacific and a grand championship in Guam.")}
        path="/"
        image={heroImage}
        structuredData={[getWebsiteSchema(), getOrganizationSchema()]}
      />
      <section className="home-event-hero relative flex items-start overflow-hidden" aria-busy={eventsLoading}>
        <div className="absolute inset-0">{!eventsLoading && <img src={heroImage} alt="" className="w-full h-full object-cover" fetchPriority="high" decoding="async" />}<div className="event-hero-scrim absolute inset-0" /></div>
        <div className="public-container relative z-10 w-full pb-8 pt-28 sm:pb-16 sm:pt-36">
          {eventsLoading ? <div className="home-hero-content" /> : nextEvent ? <div className="home-hero-content max-w-3xl space-y-4">
            <div className="mb-6 space-y-1"><p className="font-heading text-sm font-semibold text-gold-400">{org.name}</p><p className="max-w-xl text-base leading-relaxed text-text-primary">{sc('hero_description', t('footer.tagline'))}</p></div>
            <div className="flex flex-wrap items-center gap-3"><span className="text-gold-400 text-sm font-medium">{t(state.kind === 'live' ? 'season.phase.live' : 'season.nextEvent')}</span><EventStars stars={nextEvent.asjjf_stars} /></div>
            <h1 className="event-hero-title">{tf(nextEvent, 'name')}</h1>
            <div className="space-y-2 text-base sm:text-lg text-text-primary">
              <p className="flex items-start gap-3"><Calendar size={20} className="mt-1 shrink-0 text-gold-400" />{new Intl.DateTimeFormat(getDateLocale(i18n.language), { year: 'numeric', month: 'long', day: 'numeric' }).formatRange(parseDateLocalSafe(nextEvent.date), parseDateLocalSafe(nextEvent.end_date || nextEvent.date))}</p>
              <p className="flex items-start gap-3"><MapPin size={20} className="mt-1 shrink-0 text-gold-400" />{tf(nextEvent, 'city')}, {tf(nextEvent, 'country')}</p>
            </div>
            <div className="flex flex-col items-stretch sm:items-start sm:flex-row gap-3 pt-2"><RegisterControl event={nextEvent} /><Button to="/calendar" variant="secondary">{t('visualRefresh.allEvents')}<ArrowRight size={16} aria-hidden="true" /></Button></div>
            <Link to={`/events/${nextEvent.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-gold-400">{t('calendar.details')}<ArrowRight size={16} aria-hidden="true" /></Link>
          </div> : <div className="max-w-3xl space-y-5"><h1 className="event-hero-title">{sc('hero_title_line1', t('hero.title').split(' ').slice(0, -1).join(' '))}{' '}{sc('hero_title_line2', t('hero.title').split(' ').slice(-1)[0])}</h1><p className="text-lg text-text-secondary">{t('season.nextSeasonNote')}</p><Button to="/events/past">{t('nav.pastEvents')}<ArrowRight size={16} aria-hidden="true" /></Button></div>}
        </div>
      </section>
      {/* Featured section — editorial asymmetric layout */}
      <section className="public-section">
        <div className="public-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            <ScrollReveal className="lg:col-span-5">
              <div className="space-y-6">
                <div className="text-base text-gold-400 font-heading">
                  {sc('featured_badge', t('home.since2007'))}
                </div>
                <h2 className="text-2xl sm:text-4xl font-heading font-semibold leading-tight">
                  {sc('featured_title', t('home.featuredTitle'))}
                </h2>
                <p className="text-text-secondary text-lg leading-relaxed">
                  {sc('featured_desc', t('home.featuredDesc'))}
                </p>
                <div className="flex gap-4 pt-4">
                  <Link
                    to={primaryEventPath}
                    className="inline-flex items-center gap-2 text-gold-500 font-heading font-semibold text-sm hover:text-gold-400 transition-colors"
                  >
                    {currentMainEvent ? t('calendar.details') : t('hero.learnMore')}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* Bento grid of stats/images */}
            <ScrollReveal className="lg:col-span-7" delay={0.2}>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src={featuredImages[0]} fallbackSrc={featuredFallbacks[0]} alt="BJJ competition match" className="w-full h-full object-cover" loading="lazy" lazyRootMargin="200px 0px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-gold-500">{sc('economic_impact_value', t('home.economicImpactValue'))}</div>
                    <div className="text-sm text-text-primary">{sc('economic_impact_label', t('home.economicImpact'))}</div>
                  </div>
                </div>
                <div className="relative overflow-hidden border border-white/5 aspect-[4/3]">
                  <ImageWithShimmer src={featuredImages[1]} fallbackSrc={featuredFallbacks[1]} alt="Marianas Open venue" className="w-full h-full object-cover" loading="lazy" lazyRootMargin="200px 0px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 space-y-1">
                    <div className="text-3xl font-heading font-black text-text-primary">{sc('spectators_value', t('home.spectatorsValue'))}</div>
                    <div className="text-sm text-text-primary">{sc('spectators_label', t('home.spectators'))}</div>
                  </div>
                </div>
                <div className="relative col-span-2 overflow-hidden border border-white/5">
                  <ImageWithShimmer src={featuredImages[2]} fallbackSrc={featuredFallbacks[2]} alt="Podium ceremony" className="w-full h-48 object-cover" loading="lazy" lazyRootMargin="200px 0px" />
                  <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-900/70 to-transparent" />
                  <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={18} className="text-gold-500" />
                      <span className="text-sm text-gold-400 font-heading font-semibold">
                        {sc('international_reach_title', t('home.internationalReach'))}
                      </span>
                    </div>
                    <p className="text-text-primary text-base leading-relaxed max-w-md">
                      {sc('international_reach_desc', t('home.internationalReachDesc'))}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <div className="public-container grid grid-cols-2 sm:grid-cols-4 py-6 gap-4 sm:gap-6">
        {stats.map(stat => <div key={stat.label} className="flex items-center gap-3 py-2"><stat.icon size={20} className="text-gold-400 shrink-0" /><div><div className="font-heading text-2xl sm:text-3xl font-semibold">{stat.value}</div><p className="text-sm text-text-secondary">{stat.label}</p></div></div>)}
      </div>
      <FeaturedSponsorBar placements={placements} />


      {!nextEvent && <SeasonOverview events={events} loading={eventsLoading} />}

      {/* Journey Section */}
      {!eventsLoading && events.some(event => ['upcoming', 'live'].includes(eventPhase(event))) && (
        <JourneySection events={events.filter(event => Number(event.date.slice(0, 4)) === getEventCycleYear(events))} />
      )}

      {/* Official Partners — logo strip */}
      <section className="public-section">
        <div className="public-container">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading font-semibold text-text-primary mb-3">
                {t('home.partnersTitle')}
              </h2>
              <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
                {t('home.partnersDesc')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-4xl mx-auto">
              {ORG_PARTNERS.map((partner) => (
                <a
                  key={partner.key}
                  href={publicLink(`partner_${partner.key}_url`, partner.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center justify-between text-center h-40 sm:h-44"
                >
                  <div className="flex-1 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity duration-150">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={partner.src}
                      alt={partner.name}
                      className={`${partner.heightClass} object-contain`}
                    />
                  </div>
                  <div className="text-xs font-heading font-semibold text-text-muted group-hover:text-text-secondary transition-colors duration-300 leading-tight mt-2">
                    {sc(`partner_${partner.key}_label`, partner.key === 'copademarianas' ? t('home.partnerChampionship') : partner.key === 'roadtotheopen' ? t('home.partnerSeries') : partner.label)}
                  </div>
                </a>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Official Sponsors Section */}
      <section className="public-section bg-surface">
        <div className="public-container">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-heading font-black mb-4">
                {t('home.sponsorsSectionHeading')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('home.sponsorsIntro')}
              </p>
            </div>
          </ScrollReveal>

          {placementsError && <SponsorPlacementsError retry={retryPlacements} />}
          <SponsorTiers placements={placements} />
        </div>
      </section>

      {/* Built by Shimizu Technology */}
      <section className="py-10">
        <div className="public-container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <p className="text-sm font-heading font-semibold text-text-muted">
                {t('shimizu.title')}
              </p>
              <p className="text-text-secondary text-sm leading-relaxed max-w-lg mx-auto">
                {t('shimizu.description')}
              </p>
              <a
                href="https://shimizu-technology.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gold-500 text-sm font-heading font-semibold hover:text-gold-400 transition-colors"
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


function SeasonOverview({ events: publishedEvents, loading }: { events: import('../services/api').Event[]; loading: boolean }) {
  const { t } = usePublicCopy();
  const { events, loading: countsLoading } = useResultCounts(publishedEvents, !publishedEvents.some(event => ['upcoming', 'live'].includes(eventPhase(event))));
  const state = selectHomeState(events);
  const buttonClass = buttonClassName('secondary');
  return (
    <section className="bg-surface py-12 sm:py-16" aria-busy={loading || countsLoading}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {loading || countsLoading ? <div className="h-24" /> : (
          <ScrollReveal>
            <h2 className="font-heading text-3xl font-bold text-text-primary sm:text-4xl">{state.seasonYear ? t('season.seasonComplete', { year: state.seasonYear }) : t('calendar.noUpcomingEvents')}</h2>
            <p className="mt-4 max-w-2xl text-text-secondary">{t('season.nextSeasonNote')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {state.latestResults && <Link to={`/events/${state.latestResults.slug}#results`} className={buttonClass}>{t('season.latestResults')}</Link>}
              {state.latestGallery && <Link to={`/events/${state.latestGallery.slug}/gallery`} className={buttonClass}>{t('season.latestGallery')}</Link>}
              <Link to="/events/past" className={buttonClass}>{t('nav.pastEvents')}<ArrowRight size={14} /></Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
