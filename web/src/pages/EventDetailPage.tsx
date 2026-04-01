import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, MapPin, Calendar, Trophy, Plane, Hotel, FileCheck, ExternalLink, Clock, Users, Share2, Mail, Phone } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import ImageWithShimmer from '../components/ImageWithShimmer';
import QRShare from '../components/QRShare';
import LoadingSpinner from '../components/LoadingSpinner';
import EventResultsSection from '../components/EventResultsSection';
import SEO from '../components/SEO';
import { useEvents, useSponsors } from '../hooks/useApi';
import { getEventHeroImage, resolveMediaUrl, getSponsorLogo, normalizeExternalUrl } from '../utils/images';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { useSiteImages, getImageUrl } from '../hooks/useSiteImages';

function ShareButton({ platform, onClick }: { platform: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    Facebook: 'hover:bg-[#1877F2]/20 hover:border-[#1877F2]/40 hover:text-[#1877F2]',
    Twitter: 'hover:bg-white/10 hover:border-white/20 hover:text-white',
    LINE: 'hover:bg-[#00B900]/20 hover:border-[#00B900]/40 hover:text-[#00B900]',
    KakaoTalk: 'hover:bg-[#FEE500]/20 hover:border-[#FEE500]/40 hover:text-[#FEE500]',
  };

  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 border border-white/10 text-text-secondary text-sm font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${colors[platform] || ''}`}
    >
      {platform}
    </button>
  );
}

const EVENT_POSTER_MAP: Record<string, { src: string; label: string }> = {
  'copa-de-marianas-2026': {
    src: '/images/poster-copa.jpg',
    label: 'Guam Copa de Marianas 2026',
  },
};

function splitCommaSeparated(value: string | null | undefined) {
  return value ? value.split(/\s*,\s*/).filter(Boolean) : [];
}

function hasMeaningfulText(value: string | null | undefined) {
  return !!value && value.trim().length > 0;
}

function getValidItems<T extends { title?: string | null; description?: string | null }>(items: T[] | null | undefined) {
  return (items ?? []).filter(item => hasMeaningfulText(item.title) && hasMeaningfulText(item.description));
}

export default function EventDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const shouldReduceMotion = useReducedMotion();
  const { events, loading } = useEvents();

  const { sponsors } = useSponsors();
  const { images: siteImages } = useSiteImages();

  const { tf, tfa } = useTranslatedField();

  // If slug provided, show that event; otherwise show main event
  const mainEvent = slug
    ? events.find(e => e.slug === slug) || null
    : events.find(e => e.is_main_event) || null;

  const isCompleted = mainEvent?.status === 'completed';

  // Translated dynamic fields (fall back to English original when translation unavailable)
  const eventName = tf(mainEvent, 'name') || mainEvent?.name || '';
  const eventDescription = tf(mainEvent, 'description');
  const eventVenueName = tf(mainEvent, 'venue_name') || mainEvent?.venue_name || '';
  const eventCity = tf(mainEvent, 'city') || mainEvent?.city || '';
  const eventCountry = tf(mainEvent, 'country') || mainEvent?.country || '';
  const eventScheduleNote = tf(mainEvent, 'schedule_note');
  const eventPrizeTitle = tf(mainEvent, 'prize_title');
  const eventPrizeDescription = tf(mainEvent, 'prize_description');
  const eventTravelDescription = tf(mainEvent, 'travel_description');
  const eventVisaDescription = tf(mainEvent, 'visa_description');
  const eventTaglineRaw = tf(mainEvent, 'tagline');

  // Schedule: only from API, no hardcoded fallback
  const hasRealScheduleItems = !!mainEvent && (mainEvent.event_schedule_items?.length ?? 0) > 0;
  const scheduleItems = hasRealScheduleItems
    ? [...mainEvent.event_schedule_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(item => ({ time: item.time, event: tf(item, 'description') || item.description }))
    : [];
  const scheduleDescription = hasRealScheduleItems
    ? (eventScheduleNote?.trim()
        || t(
          'event.scheduleOrganizerDesc',
          'Official match schedule provided by the organizer. Matches may begin up to 30 minutes early, so athletes should be in the warm-up area at least 40 minutes before their division.'
        ))
    : isCompleted
      ? t('event.scheduleUnavailablePast', 'Official schedule was not published for this event.')
      : t('event.scheduleComingSoon', 'Official schedule will be posted once it is released by the organizer.');

  // Prizes: only from API, no hardcoded fallback
  const hasCashPrizes = mainEvent?.prize_categories?.some(c => Number(c.amount) > 0) ?? false;
  const hasTripPackages = mainEvent?.prize_categories?.some(c => Number(c.amount) === 0) ?? false;

  const prizeBreakdown = mainEvent && mainEvent.prize_categories?.length > 0
    ? [...mainEvent.prize_categories]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(cat => {
          const amt = Number(cat.amount);
          return {
            division: tf(cat, 'name') || cat.name,
            prize: amt > 0 ? `$${amt.toLocaleString()}` : '',
          };
        })
    : [];

  const prizePoolDisplay = mainEvent?.prize_pool ? `$${Number(mainEvent.prize_pool).toLocaleString()}` : null;

  const activeAccommodations = (mainEvent?.event_accommodations ?? [])
    .filter(a => a.active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const accommodationImages = activeAccommodations
    .map(a => a.image_url ? resolveMediaUrl(a.image_url) : null)
    .filter((url): url is string => url !== null && url !== undefined);

  // Use translated JSONB arrays for current locale (falls back to English)
  const venueHighlightsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; description: string }>(mainEvent, 'venue_highlights' as keyof typeof mainEvent & string) : [];
  const venueHighlights = getValidItems(venueHighlightsRaw.length > 0 ? venueHighlightsRaw : mainEvent?.venue_highlights);

  const registrationStepsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; description: string; url?: string; link_label?: string }>(mainEvent, 'registration_steps' as keyof typeof mainEvent & string) : [];
  const registrationSteps = (registrationStepsRaw.length > 0 ? registrationStepsRaw : (mainEvent?.registration_steps ?? [])).filter(step => hasMeaningfulText(step.title) && hasMeaningfulText(step.description));

  const registrationFeeSectionsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; rows?: { deadline: string; fee: string; option: string }[] }>(mainEvent, 'registration_fee_sections' as keyof typeof mainEvent & string) : [];
  const registrationFeeSections = (registrationFeeSectionsRaw.length > 0 ? registrationFeeSectionsRaw : (mainEvent?.registration_fee_sections ?? []))
    .filter(section => hasMeaningfulText(section.title) && (section.rows ?? []).some(row => hasMeaningfulText(row.deadline) && hasMeaningfulText(row.fee) && hasMeaningfulText(row.option)));

  const registrationInfoItemsRaw = mainEvent ? tfa<typeof mainEvent, { label: string; value: string }>(mainEvent, 'registration_info_items' as keyof typeof mainEvent & string) : [];
  const registrationInfoItems = (registrationInfoItemsRaw.length > 0 ? registrationInfoItemsRaw : (mainEvent?.registration_info_items ?? []))
    .filter(item => hasMeaningfulText(item.label) && hasMeaningfulText(item.value));

  const travelItemsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; description: string; value?: string; url?: string; link_label?: string }>(mainEvent, 'travel_items' as keyof typeof mainEvent & string) : [];
  const travelItems = (travelItemsRaw.length > 0 ? travelItemsRaw : (mainEvent?.travel_items ?? [])).filter(item => hasMeaningfulText(item.title) && (hasMeaningfulText(item.description) || hasMeaningfulText(item.value)));

  const visaItemsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; description: string }>(mainEvent, 'visa_items' as keyof typeof mainEvent & string) : [];
  const visaItems = getValidItems(visaItemsRaw.length > 0 ? visaItemsRaw : mainEvent?.visa_items);

  const eventTagline = eventTaglineRaw
    || (mainEvent?.is_main_event ? t('event.tagline') : t('event.qualifierTagline', 'Official Qualifier'));
  const asjjfRankText = t('event.asjjfRankDynamic', {
    count: mainEvent?.asjjf_stars || 5,
    defaultValue: `ASJJF ${mainEvent?.asjjf_stars || 5}-Star Ranked Event`,
  });
  const shareUrl = mainEvent?.slug
    ? `https://marianasopen.com/events/${mainEvent.slug}`
    : 'https://marianasopen.com';
  // Registration steps: only from API
  const displayRegistrationSteps = registrationSteps.length > 0
    ? registrationSteps.map((step, idx) => ({
        step: String(idx + 1).padStart(2, '0'),
        title: step.title,
        desc: step.description,
        url: step.url || '',
        linkLabel: step.link_label || '',
      }))
    : [];
  const travelDescription = eventTravelDescription || '';
  const displayTravelItems = travelItems;
  const visaDescription = eventVisaDescription || '';
  const displayVisaItems = visaItems;
  const shouldShowTravelSection = hasMeaningfulText(travelDescription)
    || hasMeaningfulText(visaDescription)
    || displayTravelItems.length > 0
    || displayVisaItems.length > 0
    || activeAccommodations.length > 0;
  const displayVenueHighlights = venueHighlights.length > 0
    ? venueHighlights
    : mainEvent
      ? [{ title: eventCity, description: eventCountry }]
      : [];

  const galleryImages = (mainEvent?.event_gallery_images ?? [])
    .filter(image => image.active && resolveMediaUrl(image.image_url))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(image => ({
      src: resolveMediaUrl(image.image_url) || '',
      alt: image.alt_text || image.title || t('event.galleryMatch'),
      caption: image.caption || image.title || '',
    }));

  const formatEventDate = (event: typeof mainEvent) => {
    if (!event?.date) return t('event.date');
    const start = new Date(event.date + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    if (event.end_date && event.end_date !== event.date) {
      const end = new Date(event.end_date + 'T00:00:00');
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
    }
    return start.toLocaleDateString('en-US', opts);
  };
  const shareText = mainEvent
    ? `${eventName} — ${formatEventDate(mainEvent)} — ${eventVenueName}`
    : t('event.shareText');

  const eventDefaultImage = getImageUrl(siteImages, 'event_default', '', 0) || null;
  const heroImageUrl = getEventHeroImage(mainEvent?.slug || 'marianas-open-2026', mainEvent?.hero_image_url ?? null, eventDefaultImage);
  const canonicalPath = mainEvent?.slug
    ? `/events/${mainEvent.slug}`
    : slug
      ? `/events/${slug}`
      : '/events';
  const seoTitle = mainEvent
    ? `${eventName} ${formatEventDate(mainEvent)}`
    : 'Event Details';
  const seoDescription = mainEvent
    ? `${eventName} takes place at ${eventVenueName} in ${eventCity}, ${eventCountry} on ${formatEventDate(mainEvent)}.`
    : 'Official Marianas Open event details, schedule, venue information, registration, and results.';
  const eventSchema = mainEvent ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: eventName,
    description: seoDescription,
    startDate: mainEvent.date,
    endDate: mainEvent.end_date || mainEvent.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: mainEvent.status === 'completed'
      ? 'https://schema.org/EventCompleted'
      : mainEvent.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    image: heroImageUrl ? [heroImageUrl] : undefined,
    location: {
      '@type': 'Place',
      name: eventVenueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: mainEvent.venue_address,
        addressLocality: eventCity,
        addressCountry: mainEvent.country_code || eventCountry,
      },
    },
    organizer: {
      '@type': 'SportsOrganization',
      name: 'Marianas Open',
      url: 'https://marianasopen.com',
    },
    url: `https://marianasopen.com/events/${mainEvent.slug}`,
  } : null;

  const eventPoster = mainEvent?.slug ? EVENT_POSTER_MAP[mainEvent.slug] : undefined;

  const handleShare = (platform: string) => {
    const urls: Record<string, string> = {
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      Twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      LINE: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      KakaoTalk: `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={canonicalPath}
        image={heroImageUrl}
        type="website"
        structuredData={eventSchema ? [eventSchema] : []}
      />
      {/* Hero with background image */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageWithShimmer
              src="/images/action-match-3.webp"
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-navy-900/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 mb-6">
              {mainEvent?.asjjf_stars ? Array.from({ length: mainEvent.asjjf_stars }).map((_, i) => (
                <Star key={i} size={16} className="fill-gold-500 text-gold-500" />
              )) : null}
              <span className="text-gold-400 text-sm font-heading ml-2 uppercase tracking-wider">
                {asjjfRankText}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              {mainEvent ? (
                <>
                  <span className="text-text-primary">{eventName.split(' ').slice(0, -1).join(' ')}</span>
                  <br />
                  <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
                    {eventName.split(' ').slice(-1)[0]}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-text-primary">Marianas</span>
                  <br />
                  <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
                    Open
                  </span>
                </>
              )}
            </h1>

            <p className="text-xl text-text-secondary font-heading uppercase tracking-wider mb-8">
              {eventTagline}
            </p>

            <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gold-500" />
                {formatEventDate(mainEvent)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gold-500" />
                {mainEvent ? `${eventVenueName}` : t('event.venue')}
              </div>
              {(hasCashPrizes || hasTripPackages || prizePoolDisplay) && (
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-gold-500" />
                {hasCashPrizes ? (prizePoolDisplay || t('event.totalPrizePool')) : hasTripPackages ? t('event.tripPackages', 'Trip Packages to Guam') : prizePoolDisplay}
              </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Info */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* About — from admin description, spans full width */}
            {hasMeaningfulText(eventDescription) && (
            <ScrollReveal className="lg:col-span-3 md:col-span-2">
              <div className="bg-surface/50 border border-white/5 px-8 py-6">
                <p className="text-text-secondary text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {eventDescription}
                </p>
              </div>
            </ScrollReveal>
            )}

            {/* Schedule — spans 2 cols */}
            <ScrollReveal className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Clock size={20} className="text-gold-500" />
                  <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                    {t('event.schedule')}
                  </h3>
                </div>
                {scheduleItems.length > 0 ? (
                  <>
                    <p className="text-text-secondary text-sm mb-6">{scheduleDescription}</p>
                <div className="space-y-0">
                  {scheduleItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0"
                    >
                      <span className="text-gold-500 font-heading font-bold text-sm w-24 shrink-0">
                        {item.time}
                      </span>
                      <span className="text-text-primary text-sm">{item.event}</span>
                    </div>
                  ))}
                </div>
                  </>
                ) : (
                  <div className="border border-dashed border-white/10 px-4 py-5 text-sm text-text-muted">
                    {scheduleDescription}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Prize Pool / Trip Packages — only render when prize data exists */}
            {(hasCashPrizes || hasTripPackages || prizePoolDisplay) && (
            <ScrollReveal delay={0.1}>
              <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 p-8 h-full">
                <Trophy size={24} className="text-gold-500 mb-4" />
                {hasCashPrizes ? (
                  <>
                    {prizePoolDisplay && <div className="text-5xl font-heading font-black text-gold-500 mb-2">{prizePoolDisplay}</div>}
                    <div className="text-sm text-text-muted uppercase tracking-wider mb-6">{t('event.totalPrizePool')}</div>
                  </>
                ) : hasTripPackages ? (
                  <>
                    <div className="text-2xl sm:text-3xl font-heading font-black text-gold-500 mb-2">
                      {eventPrizeTitle?.trim() || t('event.winYourWay', 'Win Your Way to Guam!')}
                    </div>
                    <div className="text-sm text-text-secondary mb-6">
                      {eventPrizeDescription?.trim() || t('event.tripPackageDesc', `Compete for a trip package to the Marianas Open International Championship — ${prizePoolDisplay || '$50,000'} cash prize pool!`)}
                    </div>
                  </>
                ) : (
                  <>
                    {prizePoolDisplay && <div className="text-5xl font-heading font-black text-gold-500 mb-2">{prizePoolDisplay}</div>}
                <div className="text-sm text-text-muted uppercase tracking-wider mb-6">{t('event.totalPrizePool')}</div>
                  </>
                )}
                <div className="space-y-3 text-sm max-h-64 overflow-y-auto pr-2">
                  {prizeBreakdown.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2 text-text-secondary">
                      <span className="shrink">{item.division}</span>
                      {item.prize && <span className="text-gold-400 font-semibold shrink-0">{item.prize}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            )}

            {/* Event poster / action photo */}
            <ScrollReveal delay={0.12}>
              <div className="relative overflow-hidden border border-white/5 h-full min-h-[250px]">
                {eventPoster ? (
                  <>
                    <img
                      src={eventPoster.src}
                      alt={eventPoster.label}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-xs text-gold-400 font-heading uppercase tracking-wider">{t('event.officialPoster', 'Official Poster')}</div>
                      <div className="text-sm text-text-secondary">{eventPoster.label}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageWithShimmer
                      src="/images/action-match-4.webp"
                      alt="Marianas Open competition"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-xs text-gold-400 font-heading uppercase tracking-wider">{t('event.pastEventLabel')}</div>
                      <div className="text-sm text-text-secondary">{t('event.pastEventDesc')}</div>
                    </div>
                  </>
                )}
              </div>
            </ScrollReveal>

            {/* Venue + Map */}
            <ScrollReveal delay={0.15} className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin size={20} className="text-gold-500" />
                  <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                    {mainEvent ? eventVenueName : t('event.venue')}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm mb-4">
                  {mainEvent ? `${mainEvent.venue_address}, ${eventCity}, ${eventCountry}` : t('event.location')}
                </p>
                {displayVenueHighlights.length > 0 && (
                  <div className={`grid grid-cols-1 gap-4 mb-4 ${displayVenueHighlights.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                    {displayVenueHighlights.map((highlight, idx) => (
                      <div key={`${highlight.title}-${idx}`} className="bg-navy-900 border border-white/5 p-4 text-center">
                    <Users size={20} className="text-gold-500 mx-auto mb-2" />
                        <div className="text-sm text-text-primary font-medium">{highlight.title}</div>
                        <div className="text-sm text-text-secondary">{highlight.description}</div>
                  </div>
                    ))}
                  </div>
                )}
                <div className="relative overflow-hidden border border-white/5 aspect-[16/7]">
                  <div className="absolute inset-0 bg-navy-800 flex flex-col items-center justify-center gap-3 z-0">
                    <MapPin size={28} className="text-gold-500" />
                    <p className="text-text-secondary text-sm">{mainEvent ? `${eventVenueName} · ${eventCity}, ${eventCountry}` : `${t('event.venue')} · ${t('event.location')}`}</p>
                    <a
                      href={mainEvent?.latitude && mainEvent?.longitude
                        ? `https://maps.google.com/?q=${mainEvent.latitude},${mainEvent.longitude}`
                        : `https://maps.google.com/?q=${encodeURIComponent(mainEvent
                            ? (mainEvent.venue_address
                                ? `${mainEvent.venue_address}, ${eventCity}, ${eventCountry}`
                                : `${eventVenueName} ${eventCity} ${eventCountry}`)
                            : 'UOG Calvo Fieldhouse Guam')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-gold-500 text-xs font-heading font-semibold uppercase tracking-wider hover:text-gold-400 transition-colors"
                    >
                      {t('event.viewOnGoogleMaps')} <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Official Accommodation — dynamic from API (shown right after venue) */}
      {activeAccommodations.length > 0 && (
        <section className="relative py-16 sm:py-20 overflow-hidden">
          {accommodationImages[0] && (
            <div className="absolute inset-0 pointer-events-none">
              <img src={accommodationImages[0]} alt="" className="w-full h-full object-cover opacity-[0.12]" />
              <div className="absolute inset-0 bg-navy-900/70" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-900/60 to-navy-900" />
            </div>
          )}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-4xl font-heading font-black uppercase mb-3">
                  {t('event.officialAccommodation', 'Official Accommodation')}
                </h2>
                <p className="text-text-secondary text-sm max-w-lg mx-auto">
                  {t('event.accommodationDesc', 'Special rates available for competing athletes')}
                </p>
              </div>
            </ScrollReveal>

            {activeAccommodations.length === 1 && accommodationImages.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-4 max-w-6xl mx-auto items-stretch">
                <ScrollReveal>
                  <div className="grid grid-cols-2 gap-4 h-full min-h-[420px]">
                    <div className="col-span-2 relative overflow-hidden border border-white/10 bg-navy-900">
                      <img src={accommodationImages[0]} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent" />
                    </div>
                    {accommodationImages.slice(1, 3).map((src, index) => (
                      <div key={src} className="relative overflow-hidden border border-white/10 bg-navy-900 min-h-[180px]">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/50 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 text-[10px] font-heading uppercase tracking-[0.28em] text-white/70">
                          {index === 0 ? t('event.lobbyAndExterior', 'Lobby & Exterior') : t('event.roomAndAmenities', 'Room & Amenities')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollReveal>

                {activeAccommodations.map((acc) => {
                  const contactEmails = splitCommaSeparated(acc.contact_email);

                  return (
                    <ScrollReveal key={acc.id} delay={0.05}>
                      <div className="bg-surface/95 border border-gold-500/20 p-6 sm:p-8 h-full backdrop-blur-sm hover:border-gold-500/40 transition-colors duration-300">
                        <Hotel size={24} className="text-gold-500 mb-4" />
                        <h3 className="font-heading font-bold text-lg text-text-primary mb-2">{tf(acc, 'hotel_name')}</h3>

                        {(tf(acc, 'description') || acc.description) && (
                          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line mb-4">{tf(acc, 'description')}</p>
                        )}

                        <div className="space-y-2 text-sm mb-6">
                          {acc.room_types && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.roomTypes', 'Rooms')}</span>
                              <span className="text-text-secondary whitespace-pre-line">{tf(acc, 'room_types')}</span>
                            </div>
                          )}
                          {acc.rate_info && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.rates', 'Rates')}</span>
                              <span className="text-gold-400 font-semibold whitespace-pre-line">{tf(acc, 'rate_info')}</span>
                            </div>
                          )}
                          {acc.inclusions && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.inclusions', 'Includes')}</span>
                              <span className="text-text-secondary">{tf(acc, 'inclusions')}</span>
                            </div>
                          )}
                          {acc.check_in_date && acc.check_out_date && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.dates', 'Dates')}</span>
                              <span className="text-text-secondary">
                                {new Date(acc.check_in_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {' — '}
                                {new Date(acc.check_out_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          {acc.booking_code && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.promoCode', 'Code')}</span>
                              <span className="font-mono text-gold-400 bg-gold-500/10 px-2 py-0.5">{acc.booking_code}</span>
                            </div>
                          )}
                          {contactEmails.length > 0 && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.bookingEmails', 'Email')}</span>
                              <div className="space-y-1">
                                {contactEmails.map((email) => (
                                  <a
                                    key={email}
                                    href={`mailto:${email}`}
                                    className="flex items-center gap-2 text-text-secondary hover:text-gold-400 transition-colors break-all"
                                  >
                                    <Mail size={14} className="text-gold-500 shrink-0" />
                                    <span>{email}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {acc.contact_phone && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.bookingPhone', 'Phone')}</span>
                              <a
                                href={`tel:${acc.contact_phone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-2 text-text-secondary hover:text-gold-400 transition-colors"
                              >
                                <Phone size={14} className="text-gold-500 shrink-0" />
                                <span>{acc.contact_phone}</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {acc.booking_url && (
                          <a
                            href={acc.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-xs hover:bg-gold-400 transition-colors"
                          >
                            {t('event.bookNow', 'Book Now')}
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            ) : (
              <div className={`grid gap-4 ${activeAccommodations.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                {activeAccommodations.map((acc) => {
                  const contactEmails = splitCommaSeparated(acc.contact_email);

                  return (
                    <ScrollReveal key={acc.id}>
                      <div className="bg-surface border border-gold-500/20 p-6 sm:p-8 h-full hover:border-gold-500/40 transition-colors duration-300">
                        <Hotel size={24} className="text-gold-500 mb-4" />
                        <h3 className="font-heading font-bold text-lg text-text-primary mb-2">{tf(acc, 'hotel_name')}</h3>

                        {(tf(acc, 'description') || acc.description) && (
                          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line mb-4">{tf(acc, 'description')}</p>
                        )}

                        <div className="space-y-2 text-sm mb-6">
                          {acc.room_types && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.roomTypes', 'Rooms')}</span>
                              <span className="text-text-secondary whitespace-pre-line">{tf(acc, 'room_types')}</span>
                            </div>
                          )}
                          {acc.rate_info && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.rates', 'Rates')}</span>
                              <span className="text-gold-400 font-semibold whitespace-pre-line">{tf(acc, 'rate_info')}</span>
                            </div>
                          )}
                          {acc.inclusions && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.inclusions', 'Includes')}</span>
                              <span className="text-text-secondary">{tf(acc, 'inclusions')}</span>
                            </div>
                          )}
                          {acc.check_in_date && acc.check_out_date && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.dates', 'Dates')}</span>
                              <span className="text-text-secondary">
                                {new Date(acc.check_in_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {' — '}
                                {new Date(acc.check_out_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          {acc.booking_code && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.promoCode', 'Code')}</span>
                              <span className="font-mono text-gold-400 bg-gold-500/10 px-2 py-0.5">{acc.booking_code}</span>
                            </div>
                          )}
                          {contactEmails.length > 0 && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.bookingEmails', 'Email')}</span>
                              <div className="space-y-1">
                                {contactEmails.map((email) => (
                                  <a
                                    key={email}
                                    href={`mailto:${email}`}
                                    className="flex items-center gap-2 text-text-secondary hover:text-gold-400 transition-colors break-all"
                                  >
                                    <Mail size={14} className="text-gold-500 shrink-0" />
                                    <span>{email}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {acc.contact_phone && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.bookingPhone', 'Phone')}</span>
                              <a
                                href={`tel:${acc.contact_phone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-2 text-text-secondary hover:text-gold-400 transition-colors"
                              >
                                <Phone size={14} className="text-gold-500 shrink-0" />
                                <span>{acc.contact_phone}</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {acc.booking_url && (
                          <a
                            href={acc.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-xs hover:bg-gold-400 transition-colors"
                          >
                            {t('event.bookNow', 'Book Now')}
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* How to Register — only if steps or URL configured */}
      {(displayRegistrationSteps.length > 0 || mainEvent?.registration_url) && (
      <section className="py-16 sm:py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="bg-surface border border-white/5 p-8">
                <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-8">
                  {t('event.howToRegister')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {displayRegistrationSteps.map((s) => (
                    <div key={s.step} className="relative">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-14 h-14 flex items-center justify-center bg-gold-500/10 border border-gold-500/20">
                          <span className="text-gold-500 font-heading font-black text-xl">{s.step}</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-heading font-bold text-sm uppercase tracking-wider">{s.title}</h4>
                          <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 transition-colors"
                          >
                            {s.linkLabel || t('event.learnMoreLink', 'Learn more')}
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {(mainEvent?.registration_url_gi || mainEvent?.registration_url_nogi) ? (
                  <>
                    {mainEvent?.registration_url_gi && (
                      <a
                        href={mainEvent.registration_url_gi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                      >
                        {t('home.registerNowGi', 'Register Now (Gi)')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {mainEvent?.registration_url_nogi && (
                      <a
                        href={mainEvent.registration_url_nogi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 border border-gold-500 text-gold-500 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-500/10 transition-colors"
                      >
                        {t('home.registerNowNogi', 'Register Now (No-Gi)')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                ) : (
                  <a
                    href={mainEvent?.registration_url || 'https://asjjf.org'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                  >
                    {t('home.registerNow')}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
      )}

      {(registrationFeeSections.length > 0 || registrationInfoItems.length > 0) && (
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-4">
              {registrationFeeSections.length > 0 && (
                <ScrollReveal>
                  <div className="bg-navy-900 border border-white/5 p-6 sm:p-8 h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <Users size={20} className="text-gold-500" />
                      <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                        {t('event.registrationFees', 'Registration Fees')}
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {registrationFeeSections.map((section) => (
                        <div key={section.title}>
                          <h4 className="font-heading text-sm font-bold uppercase tracking-[0.24em] text-gold-400 mb-3">
                            {section.title}
                          </h4>
                          <div className="overflow-x-auto border border-white/5">
                            <table className="w-full min-w-[540px] text-left text-sm">
                              <thead className="bg-white/[0.03]">
                                <tr>
                                  <th className="px-4 py-3 font-heading uppercase tracking-[0.2em] text-[11px] text-text-muted">
                                    {t('event.deadline', 'Deadline')}
                                  </th>
                                  <th className="px-4 py-3 font-heading uppercase tracking-[0.2em] text-[11px] text-text-muted">
                                    {t('event.fee', 'Fee')}
                                  </th>
                                  <th className="px-4 py-3 font-heading uppercase tracking-[0.2em] text-[11px] text-text-muted">
                                    {t('event.divisionOption', 'Division Option')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(section.rows ?? []).map((row, index) => (
                                  <tr key={`${section.title}-${row.deadline}-${index}`} className="border-t border-white/5">
                                    <td className="px-4 py-3 text-text-secondary">{row.deadline}</td>
                                    <td className="px-4 py-3 text-gold-400 font-semibold whitespace-nowrap">{row.fee}</td>
                                    <td className="px-4 py-3 text-text-secondary">{row.option}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {registrationInfoItems.length > 0 && (
                <ScrollReveal delay={0.05}>
                  <div className="bg-surface border border-gold-500/15 p-6 sm:p-8 h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar size={20} className="text-gold-500" />
                      <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                        {t('event.importantRegistrationInfo', 'Important Registration Info')}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {registrationInfoItems.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="border border-white/5 bg-white/[0.02] px-4 py-3">
                          <div className="text-[11px] font-heading uppercase tracking-[0.22em] text-gold-400 mb-1">
                            {item.label}
                          </div>
                          <div className="text-sm text-text-secondary whitespace-pre-line">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>
                </div>
        </section>
      )}

      {/* Travel Information */}
      {shouldShowTravelSection && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                  {t('event.travelTitle')}
                </h2>
                {travelDescription && (
                  <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                    {travelDescription}
                  </p>
                )}
              </div>
            </ScrollReveal>

            <div className={`grid grid-cols-1 gap-3 ${(displayTravelItems.length > 0 || displayVisaItems.length > 0 || activeAccommodations.length > 0) ? 'md:grid-cols-2' : ''}`}>
              {displayTravelItems.map((item, index) => (
                <ScrollReveal key={`${item.title}-${index}`} delay={index * 0.05}>
                  <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                    <Plane size={24} className="text-gold-500 mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-3">{item.title}</h3>
                    {item.value && (
                      <div className="text-gold-400 font-heading font-semibold text-sm uppercase tracking-wider mb-3">
                        {item.value}
                      </div>
                    )}
                    {item.description && <p className="text-text-secondary text-sm leading-relaxed">{item.description}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-xs text-gold-400 hover:text-gold-300 transition-colors"
                      >
                        {item.link_label || t('event.learnMoreLink', 'Learn more')}
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </ScrollReveal>
              ))}

              {displayVisaItems.length > 0 && (
                <ScrollReveal delay={displayTravelItems.length * 0.05}>
                  <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                    <FileCheck size={24} className="text-gold-500 mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-3">{t('event.visa')}</h3>
                    {visaDescription && (
                      <p className="text-text-secondary text-sm leading-relaxed mb-4">{visaDescription}</p>
                    )}
                    <div className="space-y-2 text-sm text-text-muted">
                      {displayVisaItems.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="bg-navy-800 p-3 border border-white/5">
                          <div className="font-heading font-semibold text-gold-400 text-xs uppercase tracking-wider mb-1">{item.title}</div>
                          <div className="text-text-secondary text-xs">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>
        </div>
      </section>
      )}

      {/* Photo Gallery Strip — only when gallery images exist */}
      {galleryImages.length > 0 && (
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {galleryImages.map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="relative overflow-hidden aspect-[3/2] border border-white/5 group">
                  <ImageWithShimmer src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/90 to-transparent p-3">
                      <div className="text-xs text-text-secondary truncate">{img.caption}</div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Official Sponsors — from database */}
      {sponsors.length > 0 && (
      <section className="py-14 border-y border-white/5 bg-navy-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <p className="text-center text-xs font-heading font-semibold uppercase tracking-[0.3em] text-text-muted mb-8">
              {t('home.sponsorsTitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
              {[...sponsors]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((sponsor) => {
                const href = normalizeExternalUrl(sponsor.website_url)
                const logoSrc = getSponsorLogo(sponsor.name, sponsor.logo_url)
                const inner = logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={sponsor.name}
                    className="h-10 sm:h-12 object-contain"
                  />
                ) : (
                  <span className="text-sm font-medium text-text-muted">{sponsor.name}</span>
                )
                return href ? (
                <a
                  key={sponsor.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity duration-300"
                >
                  {inner}
                </a>
                ) : (
                <div
                  key={sponsor.id}
                  className="opacity-60"
                >
                  {inner}
                </div>
                )
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>
      )}

      {/* Results Section — only for completed events */}
      {isCompleted && mainEvent && (
        <EventResultsSection
          eventSlug={mainEvent.slug}
          sourceUrls={mainEvent.asjjf_source_urls}
          importedAt={mainEvent.results_imported_at}
        />
      )}

      {/* Share */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Share2 size={16} className="text-text-muted" />
              <h3 className="font-heading font-bold text-sm uppercase tracking-[0.3em] text-text-muted">
                {t('event.shareTitle')}
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {['Facebook', 'Twitter', 'LINE', 'KakaoTalk'].map((platform) => (
                <ShareButton key={platform} platform={platform} onClick={() => handleShare(platform)} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <SocialShare shareText={t('share.defaultText')} />
              <QRShare />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
