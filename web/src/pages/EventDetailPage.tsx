import { SponsorTiers, SponsorPlacementsError } from '../components/SponsorPlacements';
import { useSponsorPlacements } from '../hooks/useSponsorPlacements';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, MapPin, Calendar, Trophy, Plane, Hotel, FileCheck, ExternalLink, Clock, Users, Share2, Mail, Phone, Image as ImageIcon, Ticket, Store, Check, Copy } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import ImageWithShimmer from '../components/ImageWithShimmer';
import QRShare from '../components/QRShare';
import LoadingSpinner from '../components/LoadingSpinner';
import EventResultsSection from '../components/EventResultsSection';
import SEO from '../components/SEO';
import NotFoundPage from './NotFoundPage';
import { useEvents } from '../hooks/useApi';
import { getEventHeroImage, isBrowserPreviewableImage, resolveMediaUrl, getSponsorLogo, normalizeExternalUrl } from '../utils/images';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { useSiteImages, getImageUrl } from '../hooks/useSiteImages';
import { getRegistrationLinks } from '../utils/registrationLinks';
import { eventPhase, formatVenueAddress, getCurrentMainEvent, getOfficialResultsLinks, hasEventResults } from '../utils/events';
import { getPublicImageLabel, isGeneratedImageName } from '../utils/gallery';
import { getDateLocale } from '../utils/dateLocale';
import { useResultCounts } from '../hooks/useResultCounts';
import { usePostHog } from '../providers/PostHogProvider';
import type { EventTicketOption, EventTravelItem } from '../services/api';

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

const EVENT_TICKET_FLYER_MAP: Record<string, { src: string; srcSet: string }> = {
  'marianas-open-2026': {
    src: '/images/tickets/marianas-open-2026-ticket-sales-1080.jpg',
    srcSet: '/images/tickets/marianas-open-2026-ticket-sales-640.jpg 640w, /images/tickets/marianas-open-2026-ticket-sales-1080.jpg 1081w',
  },
};

function formatTicketPrice(value: string | null | undefined, language: string) {
  if (!value) return '—';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(getDateLocale(language), { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
    : value;
}

function splitCommaSeparated(value: string | null | undefined) {
  return value ? value.split(/\s*,\s*/).filter(Boolean) : [];
}

function hasMeaningfulText(value: string | null | undefined) {
  return !!value && value.trim().length > 0;
}

function getValidItems<T extends { title?: string | null; description?: string | null }>(items: T[] | null | undefined) {
  return (items ?? []).filter(item => hasMeaningfulText(item.title) && hasMeaningfulText(item.description));
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy command was unavailable');
}

function TravelItemCard({
  item,
  onCodeCopied,
  onLinkClicked,
}: {
  item: EventTravelItem;
  onCodeCopied: (item: EventTravelItem) => void;
  onLinkClicked: (item: EventTravelItem, url: string) => void;
}) {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = item.code?.trim() || '';
  const href = normalizeExternalUrl(item.url);
  const isOffer = item.kind === 'offer' && code.length > 0;

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(code);
      setCopyStatus('copied');
      onCodeCopied(item);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopyStatus('idle'), 2_000);
    } catch {
      setCopyStatus('error');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopyStatus('idle'), 3_000);
    }
  };

  if (isOffer) {
    return (
      <div className="relative h-full overflow-hidden border border-gold-500/30 bg-gradient-to-br from-gold-500/[0.12] via-navy-900 to-navy-900 p-6 sm:p-8">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-gold-500/30 bg-gold-500/10 text-gold-400">
              <Plane size={22} aria-hidden="true" />
            </div>
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-[0.22em] text-gold-400">
                {t('event.travelOffer', 'Travel offer')}
              </div>
              <h3 className="font-heading text-xl font-bold text-text-primary">{item.title}</h3>
            </div>
          </div>

          {item.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">{item.description}</p>
          )}

          <div className="mt-6 flex flex-col gap-4 border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 text-[10px] font-heading font-semibold uppercase tracking-[0.22em] text-text-muted">
                {t('event.offerCode', 'Offer code')}
              </div>
              <code className="font-mono text-xl font-bold tracking-[0.08em] text-gold-300 sm:text-2xl">{code}</code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/40 bg-gold-500/10 px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider text-gold-300 transition-colors hover:border-gold-400 hover:bg-gold-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
              aria-label={`${t('event.copyOfferCode', 'Copy code')} ${code}`}
            >
              {copyStatus === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copyStatus === 'copied'
                ? t('event.offerCodeCopied', 'Copied')
                : copyStatus === 'error'
                  ? t('event.copyOfferCodeError', 'Try again')
                  : t('event.copyOfferCode', 'Copy code')}
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {copyStatus === 'copied'
                ? t('event.offerCodeCopiedStatus', 'Offer code copied to clipboard')
                : copyStatus === 'error'
                  ? t('event.copyOfferCodeErrorStatus', 'Unable to copy the offer code. Select the code and copy it manually.')
                  : ''}
            </span>
          </div>

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onLinkClicked(item, href)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-heading font-bold uppercase tracking-wider text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-4 focus-visible:ring-offset-navy-900"
            >
              {item.link_label || t('event.learnMoreLink', 'Learn more')}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border border-white/5 bg-navy-900 p-8 transition-colors duration-300 hover:border-gold-500/20">
      <Plane size={24} className="mb-4 text-gold-500" aria-hidden="true" />
      <h3 className="mb-3 font-heading text-lg font-bold">{item.title}</h3>
      {item.value && (
        <div className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold-400">
          {item.value}
        </div>
      )}
      {item.description && <p className="text-sm leading-relaxed text-text-secondary">{item.description}</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onLinkClicked(item, href)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        >
          {item.link_label || t('event.learnMoreLink', 'Learn more')}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

export default function EventDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { hash } = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const posthog = usePostHog();
  const { events, loading, error, retry } = useEvents();


  const { images: siteImages } = useSiteImages();

  const { tf, tfa } = useTranslatedField();

  const selectedEvents = useMemo(() => {
    const selected = slug ? events.find(e => e.slug === slug) : getCurrentMainEvent(events);
    return selected ? [selected] : [];
  }, [events, slug]);
  const { events: countedEvents, loading: resultsLoading } = useResultCounts(selectedEvents);
  const mainEvent = countedEvents[0] ?? null;
  const { placements: sponsorPlacements, error: placementsError, retry: retryPlacements } = useSponsorPlacements(mainEvent?.id, Boolean(mainEvent));
  const [readyResultsSlug, setReadyResultsSlug] = useState<string | null>(null);
  const onResultsReady = useCallback((eventSlug: string) => setReadyResultsSlug(eventSlug), []);
  useEffect(() => {
    if (hash !== '#results' || loading || resultsLoading || !mainEvent || eventPhase(mainEvent) !== 'completed') return;
    if (hasEventResults(mainEvent) && readyResultsSlug !== mainEvent.slug) return;
    // Wait until the archive is visible and the route's scroll reset has finished.
    const frame = requestAnimationFrame(() => document.getElementById('results')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [hash, loading, resultsLoading, mainEvent, readyResultsSlug]);

  if (loading || resultsLoading) {
    return <div className="min-h-screen pt-20"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-12">
        <section role="alert" className="w-full max-w-lg border border-gold/20 bg-navy-800 p-6 sm:p-10 text-center rounded-xl">
          <h1 className="font-heading text-3xl text-gold mb-4">{t('eventDetail.loadErrorTitle')}</h1>
          <p className="text-text-secondary mb-6">{t('eventDetail.loadErrorMessage')}</p>
          <button type="button" onClick={retry} className="min-h-11 px-6 py-3 bg-gold text-navy-900 font-semibold rounded-lg hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            {t('eventDetail.retry')}
          </button>
        </section>
      </div>
    );
  }

  if (!mainEvent) {
    return slug ? <NotFoundPage /> : <Navigate to="/calendar" replace />;
  }

  const phase = eventPhase(mainEvent);
  const isCompleted = phase === 'completed';
  const isCancelled = phase === 'cancelled';
  const isClosed = isCompleted || isCancelled;
  const officialResultsLinks = getOfficialResultsLinks(mainEvent);

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
            prize: amt > 0 ? `$${amt.toLocaleString(getDateLocale(i18n.language))}` : '',
          };
        })
    : [];

  const hasPrizeBreakdown = prizeBreakdown.length > 0;
  const prizePoolDisplay = mainEvent?.prize_pool ? `$${Number(mainEvent.prize_pool).toLocaleString(getDateLocale(i18n.language))}` : null;

  const activeAccommodations = (mainEvent?.event_accommodations ?? [])
    .filter(a => a.active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const accommodationImages = activeAccommodations
    .map(a => resolveMediaUrl(a.image_url) || getSponsorLogo(a.hotel_name))
    .filter((url): url is string => url !== null && url !== undefined);
  const accommodationBackdrop = activeAccommodations
    .map(a => resolveMediaUrl(a.image_url))
    .find((url): url is string => url !== null && url !== undefined);
  const featuredAccommodationUsesLogo = activeAccommodations.length === 1
    && !resolveMediaUrl(activeAccommodations[0].image_url)
    && accommodationImages.length > 0;

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

  const travelItemsRaw = mainEvent ? tfa<typeof mainEvent, EventTravelItem>(mainEvent, 'travel_items' as keyof typeof mainEvent & string) : [];
  const travelItems = (travelItemsRaw.length > 0 ? travelItemsRaw : (mainEvent?.travel_items ?? [])).filter(item => hasMeaningfulText(item.title) && (hasMeaningfulText(item.description) || hasMeaningfulText(item.value) || hasMeaningfulText(item.code)));

  const visaItemsRaw = mainEvent ? tfa<typeof mainEvent, { title: string; description: string }>(mainEvent, 'visa_items' as keyof typeof mainEvent & string) : [];
  const visaItems = getValidItems(visaItemsRaw.length > 0 ? visaItemsRaw : mainEvent?.visa_items);

  // Only the main championship has a standing tagline. Other events show a tagline
  // or star rating only when the organizers have actually published one.
  const eventTagline = isClosed ? '' : eventTaglineRaw;
  const eventStars = mainEvent?.asjjf_stars && mainEvent.asjjf_stars > 0 ? mainEvent.asjjf_stars : null;
  const asjjfRankText = eventStars
    ? t('event.asjjfRankDynamic', {
        count: eventStars,
        defaultValue: `ASJJF ${eventStars}-Star Ranked Event`,
      })
    : t('event.asjjfSanctioned', 'ASJJF Sanctioned Event');
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
  const registrationLinks = getRegistrationLinks(mainEvent);
  const isRegistrationClosed = isClosed;
  const canShowRegistrationActions = !isRegistrationClosed && registrationLinks.hasAny;
  const canShowRegistrationSection = !isRegistrationClosed && (displayRegistrationSteps.length > 0 || registrationLinks.hasAny);
  const ticketSalesUrl = normalizeExternalUrl(mainEvent?.ticket_sales_url);
  const translatedTicketOptions = mainEvent
    ? tfa<typeof mainEvent, EventTicketOption>(mainEvent, 'ticket_options')
    : [];
  const ticketOptions = translatedTicketOptions.length > 0
    ? translatedTicketOptions
    : (mainEvent?.ticket_options ?? []);
  const staticTicketFlyer = mainEvent?.slug ? EVENT_TICKET_FLYER_MAP[mainEvent.slug] : undefined;
  const uploadedTicketFlyer = resolveMediaUrl(mainEvent?.ticket_banner_image_url);
  const ticketFlyer = uploadedTicketFlyer
    ? { src: uploadedTicketFlyer, srcSet: undefined }
    : staticTicketFlyer;
  const ticketSalesStatus = mainEvent?.ticket_sales_status ?? 'unavailable';
  const ticketSalesAreActive = !isRegistrationClosed && ticketSalesStatus === 'on_sale';
  const canBuySpectatorTickets = ticketSalesAreActive && !!ticketSalesUrl;
  const canShowTicketSection = ticketSalesStatus !== 'unavailable'
    && (ticketSalesStatus !== 'on_sale'
      || !!ticketFlyer
      || ticketOptions.length > 0
      || !!ticketSalesUrl
      || !!mainEvent?.ticket_in_person_name);
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
    .map(image => {
      const src = image.thumbnail_url || (isBrowserPreviewableImage(image.content_type) ? image.image_url : null);
      return { image, src: resolveMediaUrl(src) };
    })
    .filter(({ image, src }) => image.active && src)
    .sort((a, b) => a.image.sort_order - b.image.sort_order)
    .map(({ image, src }) => ({
      id: image.id,
      src: src || '',
      alt: image.alt_text && !isGeneratedImageName(image.alt_text) ? image.alt_text : getPublicImageLabel(image) || eventName,
      caption: getPublicImageLabel(image),
    }));
  const galleryImagesCount = mainEvent?.gallery_images_count ?? galleryImages.length;

  const formatEventDate = (event: typeof mainEvent) => {
    if (!event?.date) return t('event.date');
    const start = new Date(event.date + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    if (event.end_date && event.end_date !== event.date) {
      const end = new Date(event.end_date + 'T00:00:00');
      return new Intl.DateTimeFormat(getDateLocale(i18n.language), opts).formatRange(start, end);
    }
    return start.toLocaleDateString(getDateLocale(i18n.language), opts);
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
  const seoDescription = isCompleted
    ? t('season.eventRecap', { event: eventName, date: formatEventDate(mainEvent), city: eventCity, country: eventCountry })
    : isCancelled
      ? `${eventName}. ${t('season.cancelledDescription')}`
      : `${eventName} takes place at ${eventVenueName} in ${eventCity}, ${eventCountry} on ${formatEventDate(mainEvent)}.`;
  const eventSchema = mainEvent ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: eventName,
    description: seoDescription,
    startDate: mainEvent.date,
    endDate: mainEvent.end_date || mainEvent.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: isCompleted
      ? 'https://schema.org/EventCompleted'
      : isCancelled
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

  const staticEventPoster = mainEvent?.slug ? EVENT_POSTER_MAP[mainEvent.slug] : undefined;
  const uploadedEventPoster = resolveMediaUrl(mainEvent?.poster_image_url);
  const eventPoster = uploadedEventPoster
    ? { src: uploadedEventPoster, label: eventName }
    : staticEventPoster;

  const trackTicketClick = (placement: 'hero' | 'details') => {
    posthog?.capture('spectator_ticket_clicked', {
      event_slug: mainEvent?.slug,
      ticket_provider: ticketSalesUrl ? new URL(ticketSalesUrl).hostname : undefined,
      placement,
    });
  };

  const trackTravelCodeCopy = (item: EventTravelItem) => {
    posthog?.capture('travel_offer_code_copied', {
      event_slug: mainEvent?.slug,
      offer_key: item.key,
      offer_title: item.title,
    });
  };

  const trackTravelLinkClick = (item: EventTravelItem, url: string) => {
    posthog?.capture('travel_link_clicked', {
      event_slug: mainEvent?.slug,
      travel_item_key: item.key,
      travel_item_kind: item.kind || 'info',
      destination_host: new URL(url).hostname,
    });
  };

  const handleShare = (platform: string) => {
    const urls: Record<string, string> = {
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      Twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      LINE: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      KakaoTalk: `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };


  const gallerySection = galleryImages.length > 0 ? (
      <section id="gallery" className="py-10 sm:py-14" aria-label={t('season.gallery')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-heading font-semibold uppercase tracking-[0.24em] text-gold-400">
                {t('season.gallery')}
              </p>
              {galleryImagesCount > galleryImages.length && (
                <p className="mt-1 text-xs text-text-muted">
                  {t('season.galleryPreview', { shown: galleryImages.length, count: galleryImagesCount })}
                </p>
              )}
            </div>
            {mainEvent && (
              <Link to={`/events/${mainEvent.slug}/gallery`} className="inline-flex min-h-11 items-center gap-2 text-sm text-gold-400 hover:text-gold-300">
                {t('season.viewAllPhotos')} <ExternalLink size={12} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {galleryImages.map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <Link to={`/events/${mainEvent.slug}/gallery?photo=${img.id}`} className="relative block overflow-hidden aspect-[3/2] border border-white/5 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400">
                  <ImageWithShimmer src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/90 to-transparent p-3">
                      <div className="text-xs text-text-secondary truncate">{img.caption}</div>
                    </div>
                  )}
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      ) : null;



  const awaitingResults = isCompleted && hasEventResults(mainEvent) && readyResultsSlug !== mainEvent.slug;
  return (
    <>
    {awaitingResults && <div className="min-h-screen pt-20"><LoadingSpinner /></div>}
    <div className={`min-h-screen pt-20 ${awaitingResults ? 'hidden' : ''}`}>
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
              {eventStars ? Array.from({ length: eventStars }).map((_, i) => (
                <Star key={i} size={16} className="fill-gold-500 text-gold-500" />
              )) : null}
              <span className={`text-gold-400 text-sm font-heading uppercase tracking-wider ${eventStars ? 'ml-2' : ''}`}>
                {asjjfRankText}
              </span>
            </div>

            <p className={`mb-5 inline-flex items-center border px-3 py-2 text-sm font-heading font-semibold uppercase tracking-wider ${isCancelled ? 'border-red-400/40 text-red-200' : 'border-gold-500/30 text-gold-300'}`}>
              {t(`season.phase.${phase}`)}
            </p>
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

            {eventTagline ? (
              <p className="text-xl text-text-secondary font-heading uppercase tracking-wider mb-8">
                {eventTagline}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gold-500" />
                {formatEventDate(mainEvent)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gold-500" />
                {mainEvent ? `${eventVenueName}` : t('event.venue')}
              </div>
              {!isClosed && (hasCashPrizes || hasTripPackages || prizePoolDisplay) && (
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-gold-500" />
                {hasCashPrizes ? (prizePoolDisplay || t('event.totalPrizePool')) : hasTripPackages ? t('event.tripPackages', 'Trip Packages to Guam') : prizePoolDisplay}
              </div>
              )}
            </div>

            {(canBuySpectatorTickets || canShowRegistrationActions) && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {canBuySpectatorTickets && (
                  <a
                    href={ticketSalesUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackTicketClick('hero')}
                    className="inline-flex min-h-12 items-center justify-center gap-2 bg-gold-500 px-6 py-3 text-sm font-heading font-bold uppercase tracking-wider text-navy-900 shadow-[0_0_40px_rgba(226,178,68,0.2)] transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                  >
                    <Ticket size={16} />
                    {t('event.buySpectatorTickets', 'Buy Spectator Tickets')}
                    <ExternalLink size={14} />
                  </a>
                )}
                {registrationLinks.hasDirect ? (
                  <>
                    {registrationLinks.gi && (
                      <a
                        href={registrationLinks.gi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/20 bg-navy-900/60 px-6 py-3 text-sm font-heading font-bold uppercase tracking-wider text-text-primary backdrop-blur-sm transition-colors hover:border-gold-500/50 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                      >
                        {t('event.registerToCompeteGi', 'Register to Compete (Gi)')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {registrationLinks.nogi && (
                      <a
                        href={registrationLinks.nogi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 items-center justify-center gap-2 border border-gold-500/70 bg-navy-900/50 px-6 py-3 text-sm font-heading font-bold uppercase tracking-wider text-gold-300 backdrop-blur-sm transition-colors hover:bg-gold-500/10 hover:text-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                      >
                        {t('event.registerToCompeteNogi', 'Register to Compete (No-Gi)')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                ) : (
                  <a
                    href={registrationLinks.legacy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/20 bg-navy-900/60 px-6 py-3 text-sm font-heading font-bold uppercase tracking-wider text-text-primary backdrop-blur-sm transition-colors hover:border-gold-500/50 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                  >
                    {t('event.registerToCompete', 'Register to Compete')}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
            {mainEvent && galleryImagesCount > 0 && (
              <Link
                to={`/events/${mainEvent.slug}/gallery`}
                className="mt-8 inline-flex items-center gap-2 border border-gold-500/30 bg-gold-500/10 px-5 py-3 text-sm font-heading font-semibold uppercase tracking-wider text-gold-300 transition-colors hover:border-gold-400/60 hover:bg-gold-500/15 hover:text-gold-200"
              >
                <ImageIcon size={16} />
                {t('season.viewGallery')}
                <span className="text-text-muted normal-case tracking-normal">
                  {t('season.photoCount', { count: galleryImagesCount })}
                </span>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {isCompleted && (
        <>
          <div id="results" className="min-h-72 scroll-mt-24">
            {hasEventResults(mainEvent) ? (
              <EventResultsSection eventSlug={mainEvent.slug} sourceUrls={officialResultsLinks} importedAt={mainEvent.results_imported_at} onReady={onResultsReady} />
            ) : (
              <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
                <div className="border border-gold-500/20 bg-surface p-6 sm:p-8">
                  <Trophy size={24} className="mb-4 text-gold-400" />
                  <h2 className="font-heading text-2xl font-bold text-text-primary">{t('results.title')}</h2>
                  <p className="mt-3 max-w-2xl text-text-secondary">{t(mainEvent.results_count === 0 ? 'season.resultsFinalizing' : 'season.resultsUnavailable')}</p>
                  {officialResultsLinks.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {officialResultsLinks.map((url, index) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-gold-500/30 px-4 py-2 text-sm text-gold-300 hover:bg-gold-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400">
                          {t('season.officialResults')}{officialResultsLinks.length > 1 ? ` (${index + 1})` : ''}<ExternalLink size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
          {gallerySection}
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <h2 className="font-heading text-2xl font-bold text-text-primary">{t('season.recap')}</h2>
            <p className="mt-3 max-w-3xl text-text-secondary leading-relaxed">{t('season.eventRecap', { event: eventName, date: formatEventDate(mainEvent), city: eventCity, country: eventCountry })}</p>
            {eventVenueName && <p className="mt-3 text-sm text-text-secondary">{eventVenueName}</p>}
            <Link to="/events/past" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold-300 hover:text-gold-200">{t('nav.pastEvents')}</Link>
          </section>
        </>
      )}
      {isCancelled && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="max-w-2xl text-text-secondary">{t('season.cancelledDescription')}</p>
          <Link to="/calendar" className="mt-5 inline-flex min-h-11 items-center border border-gold-500/30 px-5 py-3 text-sm text-gold-300 hover:bg-gold-500/10">{t('hero.learnMore')}</Link>
        </section>
      )}
      {!isClosed && <>
      {canShowTicketSection && (
        <section id="spectator-tickets" className="relative overflow-hidden border-y border-gold-500/15 bg-surface/35 py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(226,178,68,0.10),transparent_34%)]" />
          <div className={`relative mx-auto grid grid-cols-1 gap-10 px-4 sm:px-6 ${ticketSalesAreActive && ticketFlyer ? 'max-w-7xl lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16' : 'max-w-3xl'}`}>
            {ticketSalesAreActive && ticketFlyer && (
              <ScrollReveal>
                <div className="mx-auto max-w-xl overflow-hidden border border-gold-500/25 bg-navy-900 shadow-[0_24px_80px_rgba(0,0,0,0.35)] lg:sticky lg:top-28">
                  <img
                    src={ticketFlyer.src}
                    srcSet={ticketFlyer.srcSet}
                    sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 100vw"
                    width="1081"
                    height="1351"
                    loading="lazy"
                    decoding="async"
                    alt={t('event.ticketFlyerAlt', {
                      eventName,
                      defaultValue: `Official ${eventName} spectator ticket sales flyer`,
                    })}
                    className="h-auto w-full"
                  />
                </div>
              </ScrollReveal>
            )}

            <ScrollReveal delay={0.08}>
              <div className="flex h-full flex-col justify-center">
                <div className="mb-3 flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-[0.22em] text-gold-400">
                  <Ticket size={16} />
                  {t('event.spectatorAdmission', 'Spectator Admission')}
                </div>
                <h2 className="max-w-2xl font-heading text-4xl font-black uppercase leading-none text-text-primary sm:text-5xl">
                  {ticketSalesAreActive
                    ? t('event.ticketsOnSale', 'Tickets on sale now')
                    : ticketSalesStatus === 'sold_out'
                      ? t('event.ticketsSoldOut', 'Tickets Sold Out')
                      : t('event.ticketSalesClosed', 'Ticket Sales Closed')}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary">
                  {ticketSalesAreActive
                    ? t('event.ticketIntro', 'Purchase spectator admission online or in person. Competitors should use the separate ASJJF registration links.')
                    : ticketSalesStatus === 'sold_out'
                      ? t('event.ticketsSoldOutDescription', 'Spectator tickets for this event are sold out. Competitor registration is separate.')
                      : t('event.ticketSalesClosedDescription', 'Spectator ticket sales for this event are closed. Competitor registration is separate.')}
                </p>

                {ticketSalesAreActive && ticketOptions.length > 0 && (
                  <div className="mt-8 overflow-hidden border border-white/10 bg-navy-900/55">
                    <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-heading font-bold uppercase tracking-wider text-text-muted sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-5">
                      <span>{t('event.admissionOption', 'Admission')}</span>
                      <span className="text-right text-gold-400">{t('event.earlyBird', 'Early Bird')}</span>
                      <span className="text-right">{t('event.atTheDoor', 'At the Door')}</span>
                    </div>
                    {ticketOptions.map((option, index) => (
                      <div key={`${option.label}-${index}`} className="grid min-h-16 grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] items-center border-b border-white/5 px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-5">
                        <div className="min-w-0 pr-3">
                          <div className="text-sm font-semibold text-text-primary sm:text-base">{option.label}</div>
                          {option.description && <div className="mt-0.5 text-xs text-text-muted">{option.description}</div>}
                        </div>
                        <div className="text-right font-heading text-xl font-black text-gold-400 sm:text-2xl">{formatTicketPrice(option.early_bird_price, i18n.language)}</div>
                        <div className="text-right font-heading text-lg font-bold text-text-secondary sm:text-xl">{formatTicketPrice(option.regular_price, i18n.language)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {ticketSalesAreActive && (
                  <div className="mt-5 flex items-start gap-2 border-l-2 border-gold-500/60 bg-gold-500/[0.06] px-4 py-3 text-sm text-text-secondary">
                    <Clock size={16} className="mt-0.5 shrink-0 text-gold-400" />
                    {mainEvent?.ticket_early_bird_ends_on
                      ? t('event.earlyBirdDeadline', {
                          date: new Date(`${mainEvent.ticket_early_bird_ends_on}T00:00:00`).toLocaleDateString(getDateLocale(i18n.language), { month: 'long', day: 'numeric', year: 'numeric' }),
                          defaultValue: 'Early-bird pricing ends {{date}}.',
                        })
                      : t('event.earlyBirdLimited', 'Early-bird pricing is available for a limited time.')}
                  </div>
                )}

                {ticketSalesAreActive && mainEvent?.ticket_in_person_name && (
                  <div className="mt-6 border border-white/10 px-5 py-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                      <Store size={16} className="text-gold-400" />
                      {t('event.inPersonPurchase', 'Buy In Person')}
                    </div>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <div className="font-semibold text-text-primary">{mainEvent.ticket_in_person_name}</div>
                      {mainEvent.ticket_in_person_address && (
                        <div className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-gold-400" /><span>{mainEvent.ticket_in_person_address}</span></div>
                      )}
                      {mainEvent.ticket_in_person_phone && (
                        <a href={`tel:${mainEvent.ticket_in_person_phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2 hover:text-gold-300">
                          <Phone size={15} className="shrink-0 text-gold-400" />{mainEvent.ticket_in_person_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {canBuySpectatorTickets && (
                  <div className="mt-8">
                    <a
                      href={ticketSalesUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackTicketClick('details')}
                      className="inline-flex min-h-14 w-full items-center justify-center gap-2 bg-gold-500 px-7 py-4 font-heading text-sm font-black uppercase tracking-wider text-navy-900 transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 sm:w-auto"
                    >
                      {t('event.buyOnlineGuamTime', 'Buy Tickets Online')}
                      <ExternalLink size={16} />
                    </a>
                    <p className="mt-3 max-w-xl text-xs leading-relaxed text-text-muted">
                      {t('event.ticketProviderNote', 'Availability, service fees, and checkout terms are controlled by the official ticket provider.')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

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
            {!isClosed && (hasCashPrizes || hasTripPackages || prizePoolDisplay) && (
            <ScrollReveal delay={0.1}>
              <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 p-8 h-full">
                <Trophy size={24} className="text-gold-500 mb-4" />
                {hasCashPrizes ? (
                  <>
                    {prizePoolDisplay && <div className="text-5xl font-heading font-black text-gold-500 mb-2">{prizePoolDisplay}</div>}
                    <div className={`text-sm text-text-muted uppercase tracking-wider ${hasPrizeBreakdown ? 'mb-6' : ''}`}>{t('event.totalPrizePool')}</div>
                  </>
                ) : hasTripPackages ? (
                  <>
                    <div className="text-2xl sm:text-3xl font-heading font-black text-gold-500 mb-2">
                      {eventPrizeTitle?.trim() || t('event.winYourWay', 'Win Your Way to Guam!')}
                    </div>
                    <div className={`text-sm text-text-secondary ${hasPrizeBreakdown ? 'mb-6' : ''}`}>
                      {eventPrizeDescription?.trim()}
                    </div>
                  </>
                ) : (
                  <>
                    {prizePoolDisplay && <div className="text-5xl font-heading font-black text-gold-500 mb-2">{prizePoolDisplay}</div>}
                    <div className={`text-sm text-text-muted uppercase tracking-wider ${hasPrizeBreakdown ? 'mb-6' : ''}`}>{t('event.totalPrizePool')}</div>
                  </>
                )}
                {hasPrizeBreakdown && (
                  <div className="space-y-3 text-sm max-h-64 overflow-y-auto pr-2">
                    {prizeBreakdown.map((item, i) => (
                      <div key={i} className="flex justify-between gap-2 text-text-secondary">
                        <span className="shrink">{item.division}</span>
                        {item.prize && <span className="text-gold-400 font-semibold shrink-0">{item.prize}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>
            )}

            {/* Event poster / action photo */}
            <ScrollReveal delay={0.12}>
              <div className="relative overflow-hidden border border-white/5 h-full min-h-[250px]">
                {eventPoster ? (
                  // Show the whole poster: its bottom edge usually carries sponsors and ranking stars.
                  <a
                    href={eventPoster.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t('event.officialPoster', 'Official Poster')}: ${eventPoster.label}`}
                    className="flex h-full flex-col bg-navy-900 transition-colors hover:bg-navy-800"
                  >
                    <div className="flex flex-1 items-center justify-center">
                      <img
                        src={eventPoster.src}
                        alt={eventPoster.label}
                        className="block w-full h-auto lg:max-h-[560px] object-contain"
                      />
                    </div>
                    <div className="border-t border-white/5 px-4 py-3">
                      <div className="text-xs text-gold-400 font-heading uppercase tracking-wider">{t('event.officialPoster', 'Official Poster')}</div>
                      <div className="text-sm text-text-secondary">{eventPoster.label}</div>
                    </div>
                  </a>
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
                  {mainEvent ? formatVenueAddress(mainEvent.venue_address, eventCity, eventCountry, { city: mainEvent.city, country: mainEvent.country }) : t('event.location')}
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
          {accommodationBackdrop && (
            <div className="absolute inset-0 pointer-events-none">
              <img src={accommodationBackdrop} alt="" className="w-full h-full object-cover opacity-[0.12]" />
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
                    <div className={`col-span-2 relative overflow-hidden border border-white/10 bg-navy-900 ${featuredAccommodationUsesLogo ? 'flex items-center justify-center p-12 sm:p-16' : ''}`}>
                      <img
                        src={accommodationImages[0]}
                        alt=""
                        className={featuredAccommodationUsesLogo
                          ? 'relative z-10 w-full max-w-sm object-contain'
                          : 'w-full h-full object-cover'}
                      />
                      {featuredAccommodationUsesLogo ? (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,153,53,0.12),transparent_62%)]" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent" />
                      )}
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
                              <span className="text-text-secondary whitespace-pre-line">{tf(acc, 'inclusions')}</span>
                            </div>
                          )}
                          {acc.check_in_date && acc.check_out_date && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.dates', 'Dates')}</span>
                              <span className="text-text-secondary">
                                {new Date(acc.check_in_date + 'T00:00:00').toLocaleDateString(getDateLocale(i18n.language), { month: 'short', day: 'numeric' })}
                                {' — '}
                                {new Date(acc.check_out_date + 'T00:00:00').toLocaleDateString(getDateLocale(i18n.language), { month: 'short', day: 'numeric', year: 'numeric' })}
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
                              <span className="text-text-secondary whitespace-pre-line">{tf(acc, 'inclusions')}</span>
                            </div>
                          )}
                          {acc.check_in_date && acc.check_out_date && (
                            <div className="flex gap-2">
                              <span className="text-text-muted shrink-0 w-24">{t('event.dates', 'Dates')}</span>
                              <span className="text-text-secondary">
                                {new Date(acc.check_in_date + 'T00:00:00').toLocaleDateString(getDateLocale(i18n.language), { month: 'short', day: 'numeric' })}
                                {' — '}
                                {new Date(acc.check_out_date + 'T00:00:00').toLocaleDateString(getDateLocale(i18n.language), { month: 'short', day: 'numeric', year: 'numeric' })}
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
      {canShowRegistrationSection && (
      <section className="py-16 sm:py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="bg-surface border border-white/5 p-8">
                <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-8">
                  {t('event.howToRegister')}
                </h3>
                {displayRegistrationSteps.length > 0 && (
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
                )}
                {canShowRegistrationActions && (
                  <div className={`${displayRegistrationSteps.length > 0 ? 'mt-8' : ''} flex flex-wrap gap-3`}>
                    {registrationLinks.hasDirect ? (
                      <>
                        {registrationLinks.gi && (
                          <a
                            href={registrationLinks.gi}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                          >
                            {t('home.registerNowGi', 'Register Now (Gi)')}
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {registrationLinks.nogi && (
                          <a
                            href={registrationLinks.nogi}
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
                        href={registrationLinks.legacy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                      >
                        {t('home.registerNow')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}
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
                          {/* Phones: one row per fee so the deadline, option, and price stay together. */}
                          <ul className="sm:hidden border border-white/5 divide-y divide-white/5">
                            {(section.rows ?? []).map((row, index) => (
                              <li key={`${section.title}-${row.deadline}-${index}-mobile`} className="flex items-start justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="text-sm text-text-primary">{row.deadline}</div>
                                  <div className="text-xs text-text-secondary mt-0.5">{row.option}</div>
                                </div>
                                <div className="text-gold-400 font-semibold whitespace-nowrap">{row.fee}</div>
                              </li>
                            ))}
                          </ul>
                          <div className="hidden sm:block overflow-x-auto border border-white/5">
                            <table className="w-full text-left text-sm">
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
                <ScrollReveal
                  key={item.key || `${item.title}-${index}`}
                  delay={index * 0.05}
                  className={item.kind === 'offer' ? 'md:col-span-2' : undefined}
                >
                  <TravelItemCard
                    item={item}
                    onCodeCopied={trackTravelCodeCopy}
                    onLinkClicked={trackTravelLinkClick}
                  />
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

      </>}

      {!isClosed && gallerySection}

      {(sponsorPlacements.length > 0 || placementsError) && <section className="border-y border-white/5 bg-navy-900/60 px-4 py-14">
        <div className="mx-auto max-w-7xl">
          {placementsError && <SponsorPlacementsError retry={retryPlacements} />}
          <SponsorTiers placements={sponsorPlacements} event />
        </div>
      </section>}

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
    </>
  );
}
