import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, MapPin, Calendar, Trophy, Plane, Hotel, FileCheck, ExternalLink, Clock, Users, Share2 } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import SocialShare from '../components/SocialShare';
import ImageWithShimmer from '../components/ImageWithShimmer';
import QRShare from '../components/QRShare';
import LoadingSpinner from '../components/LoadingSpinner';
import EventResultsSection from '../components/EventResultsSection';
import { useEvents } from '../hooks/useApi';
import { getEventHeroImage } from '../utils/images';

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

export default function EventDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const shouldReduceMotion = useReducedMotion();
  const { events, loading } = useEvents();

  // If slug provided, show that event; otherwise show main event
  const mainEvent = slug
    ? events.find(e => e.slug === slug) || null
    : events.find(e => e.is_main_event) || null;

  const isCompleted = mainEvent?.status === 'completed';

  // Fallback schedule items from i18n if API has none
  const fallbackScheduleItems = [
    { time: '7:00 AM', event: t('event.schedule1') },
    { time: '8:00 AM', event: t('event.schedule2') },
    { time: '10:00 AM', event: t('event.schedule3') },
    { time: '1:00 PM', event: t('event.schedule4') },
    { time: '4:00 PM', event: t('event.schedule5') },
    { time: '6:00 PM', event: t('event.schedule6') },
    { time: '8:00 PM', event: t('event.schedule7') },
  ];

  const scheduleItems = mainEvent && mainEvent.event_schedule_items?.length > 0
    ? mainEvent.event_schedule_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(item => ({ time: item.time, event: item.description }))
    : fallbackScheduleItems;

  // Fallback prize breakdown from i18n if API has none
  const fallbackPrizeBreakdown = [
    { division: t('event.prizeBlackOpenM'), prize: '$10,000' },
    { division: t('event.prizeBlackOpenF'), prize: '$10,000' },
    { division: t('event.prizeBlackWeight'), prize: '$3,000' },
    { division: t('event.prizeBrownWeight'), prize: '$1,500' },
    { division: t('event.prizeTeam'), prize: '$2,500' },
    { division: t('event.prizeKids'), prize: '$500' },
  ];

  const prizeBreakdown = mainEvent && mainEvent.prize_categories?.length > 0
    ? mainEvent.prize_categories
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(cat => ({ division: cat.name, prize: `$${Number(cat.amount).toLocaleString()}` }))
    : fallbackPrizeBreakdown;

  const prizePoolDisplay = mainEvent?.prize_pool ? `$${Number(mainEvent.prize_pool).toLocaleString()}` : '$50,000';

  const heroImageUrl = getEventHeroImage(mainEvent?.slug || 'marianas-open-2026', mainEvent?.hero_image_url ?? null);

  const shareUrl = 'https://marianasopen.com';
  const shareText = t('event.shareText');

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
              {Array.from({ length: mainEvent?.asjjf_stars || 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-gold-500 text-gold-500" />
              ))}
              <span className="text-gold-400 text-sm font-heading ml-2 uppercase tracking-wider">
                {t('event.asjjfRank')}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              <span className="text-text-primary">Marianas</span>
              <br />
              <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
                Open 2026
              </span>
            </h1>

            <p className="text-xl text-text-secondary font-heading uppercase tracking-wider mb-8">
              {t('event.tagline')}
            </p>

            <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gold-500" />
                {t('event.date')}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gold-500" />
                {mainEvent ? `${mainEvent.venue_name}` : t('event.venue')}
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-gold-500" />
                {prizePoolDisplay}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Info */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Schedule — spans 2 cols */}
            <ScrollReveal className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Clock size={20} className="text-gold-500" />
                  <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                    {t('event.schedule')}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm mb-6">{t('event.scheduleDesc')}</p>
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
              </div>
            </ScrollReveal>

            {/* Prize Pool */}
            <ScrollReveal delay={0.1}>
              <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 p-8 h-full">
                <Trophy size={24} className="text-gold-500 mb-4" />
                <div className="text-5xl font-heading font-black text-gold-500 mb-2">{prizePoolDisplay}</div>
                <div className="text-sm text-text-muted uppercase tracking-wider mb-6">{t('event.totalPrizePool')}</div>
                <div className="space-y-3 text-sm">
                  {prizeBreakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-text-secondary">
                      <span>{item.division}</span>
                      <span className="text-gold-400 font-semibold">{item.prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Action photo */}
            <ScrollReveal delay={0.12}>
              <div className="relative overflow-hidden border border-white/5 h-full min-h-[250px]">
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
              </div>
            </ScrollReveal>

            {/* Venue + Map */}
            <ScrollReveal delay={0.15} className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin size={20} className="text-gold-500" />
                  <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                    {mainEvent ? mainEvent.venue_name : t('event.venue')}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm mb-4">
                  {mainEvent ? `${mainEvent.venue_address}, ${mainEvent.city}, ${mainEvent.country}` : t('event.location')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-navy-900 border border-white/5 p-4 text-center">
                    <Users size={20} className="text-gold-500 mx-auto mb-2" />
                    <div className="text-sm text-text-secondary">{t('event.competitionMats')}</div>
                    <div className="text-sm text-text-secondary">{t('event.venueCapacity')}</div>
                  </div>
                  <div className="bg-navy-900 border border-white/5 p-4 text-center">
                    <MapPin size={20} className="text-gold-500 mx-auto mb-2" />
                    <div className="text-sm text-text-secondary">{t('event.venueUniversity')}</div>
                    <div className="text-sm text-text-secondary">{t('event.venueAddress')}</div>
                  </div>
                </div>
                {/* Embedded Map */}
                <div className="relative overflow-hidden border border-white/5 aspect-[16/7]">
                  <iframe
                    title="UOG Calvo Fieldhouse Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3869.8!2d144.7937!3d13.4443!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x671f827d25a3a3a3%3A0x12345!2sUOG+Calvo+Fieldhouse!5e0!3m2!1sen!2sgu!4v1700000000000!5m2!1sen!2sgu"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* How to Register */}
            <ScrollReveal delay={0.2} className="lg:col-span-3">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-8">
                  {t('event.howToRegister')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: t('event.step1'), desc: t('event.step1Desc'), icon: ExternalLink },
                    { step: '02', title: t('event.step2'), desc: t('event.step2Desc'), icon: FileCheck },
                    { step: '03', title: t('event.step3'), desc: t('event.step3Desc'), icon: Trophy },
                  ].map((s) => (
                    <div key={s.step} className="relative">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-14 h-14 flex items-center justify-center bg-gold-500/10 border border-gold-500/20">
                          <span className="text-gold-500 font-heading font-black text-xl">{s.step}</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-heading font-bold text-sm uppercase tracking-wider">{s.title}</h4>
                          <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <a
                    href={mainEvent?.registration_url || 'https://asjjf.org'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                  >
                    {t('home.registerNow')}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Photo Gallery Strip */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: '/images/action-match-1.webp', alt: t('event.galleryMatch') },
              { src: '/images/ceremony-1.webp', alt: t('event.galleryCeremony') },
              { src: '/images/venue-mats.webp', alt: t('event.galleryVenue') },
              { src: '/images/podium-2.webp', alt: t('event.galleryPodium') },
            ].map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="relative overflow-hidden aspect-[3/2] border border-white/5 group">
                  <ImageWithShimmer src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Info */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                {t('event.travelTitle')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('event.travelDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScrollReveal>
              <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                <Plane size={24} className="text-gold-500 mb-4" />
                <h3 className="font-heading font-bold text-lg mb-3">{t('event.flights')}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">{t('event.flightsDesc')}</p>
                <div className="space-y-2 text-sm text-text-muted">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('event.flightTokyo')}</span>
                    <span className="text-text-secondary">3.5 hrs</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('event.flightManila')}</span>
                    <span className="text-text-secondary">3.5 hrs</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('event.flightSeoul')}</span>
                    <span className="text-text-secondary">4 hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('event.flightHonolulu')}</span>
                    <span className="text-text-secondary">7 hrs</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                <Hotel size={24} className="text-gold-500 mb-4" />
                <h3 className="font-heading font-bold text-lg mb-3">{t('event.hotels')}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">{t('event.hotelsDesc')}</p>
                <div className="space-y-3 text-sm">
                  <div className="bg-navy-800 p-3 border border-white/5">
                    <div className="font-heading font-semibold text-text-primary">Dusit Thani Guam</div>
                    <div className="text-text-muted text-xs mt-1">{t('event.hotelDusitDesc')}</div>
                  </div>
                  <div className="bg-navy-800 p-3 border border-white/5">
                    <div className="font-heading font-semibold text-text-primary">Hyatt Regency Guam</div>
                    <div className="text-text-muted text-xs mt-1">{t('event.hotelHyattDesc')}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                <FileCheck size={24} className="text-gold-500 mb-4" />
                <h3 className="font-heading font-bold text-lg mb-3">{t('event.visa')}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">{t('event.visaDesc')}</p>
                <div className="space-y-2 text-sm text-text-muted">
                  <div className="bg-navy-800 p-3 border border-white/5">
                    <div className="font-heading font-semibold text-gold-400 text-xs uppercase tracking-wider mb-1">{t('event.visaEsta')}</div>
                    <div className="text-text-secondary text-xs">{t('event.visaEstaDesc')}</div>
                  </div>
                  <div className="bg-navy-800 p-3 border border-white/5">
                    <div className="font-heading font-semibold text-gold-400 text-xs uppercase tracking-wider mb-1">{t('event.visaGuamCnmi')}</div>
                    <div className="text-text-secondary text-xs">{t('event.visaGuamCnmiDesc')}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Results Section — only for completed events */}
      {isCompleted && mainEvent && (
        <EventResultsSection eventSlug={mainEvent.slug} />
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
