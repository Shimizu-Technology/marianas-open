import { useMemo, useState } from 'react';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { useEvents, useOrganization } from '../hooks/useApi';
import { cycleHasMainEvent, eventPhase, getEventCycleYear } from '../utils/events';
import { normalizeExternalUrl } from '../utils/images';
import { useResultCounts } from '../hooks/useResultCounts';
import SEO from '../components/SEO';
import LoadingSpinner from '../components/LoadingSpinner';
import SocialShare from '../components/SocialShare';
import QRShare from '../components/QRShare';
import PublicEventCard from '../components/PublicEventCard';
import { Button, SectionHeading } from '../components/ui';

export default function CalendarPage() {
  const { t } = usePublicCopy();
  const { events: publishedEvents, loading } = useEvents();
  const { events } = useResultCounts(publishedEvents);
  const { org } = useOrganization();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const cycleYear = getEventCycleYear(events);
  const cycleEventCount = events.filter(event => cycleYear === null || Number((event.date?.slice(0, 4) || String(event.season_year || ''))) === cycleYear).length;
  const active = useMemo(() => events.filter(event => ['upcoming', 'live'].includes(eventPhase(event))).sort((a, b) => a.date.localeCompare(b.date)), [events]);
  const archive = useMemo(() => events.filter(event => eventPhase(event) === 'completed').sort((a, b) => b.date.localeCompare(a.date)), [events]);
  const cancelled = events.filter(event => eventPhase(event) === 'cancelled');
  const years = [...new Set(archive.map(event => (event.date?.slice(0, 4) || String(event.season_year || ''))))];
  if (loading) return <div className="min-h-screen pt-20"><LoadingSpinner /></div>;
  return <div className="min-h-screen pt-20">
    <SEO title="Event Calendar" description="Browse the Guam Marianas Pro Series, upcoming qualifier events across Asia-Pacific, and past results from Marianas Open tournaments." path="/calendar" image="/images/hero-podium.jpg" structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Marianas Open Event Calendar',
            url: 'https://marianasopen.com/calendar',
            description: 'Upcoming and past Marianas Open events, qualifiers, and championships.',
          },
        ]} />
    <section className="public-section"><div className="public-container">
      <h1 className="event-hero-title max-w-4xl">{cycleYear ? t('calendar.titleDynamic', { year: cycleYear }) : t('calendar.title')}</h1>
      <p className="text-text-secondary text-lg mt-5 max-w-2xl">{cycleEventCount ? t(cycleHasMainEvent(events, cycleYear) ? 'calendar.subtitleDynamic' : 'calendar.subtitleSeriesDynamic', { count: cycleEventCount }) : t('calendar.subtitle')}</p>
      <div className="flex items-center gap-3 mt-6"><SocialShare shareText={t('share.defaultText')} /><QRShare /></div>
    </div></section>
    <section className="public-section bg-surface/40"><div className="public-container">
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label={t('nav.events')}>
        <Button variant={activeTab === 'upcoming' ? 'primary' : 'secondary'} aria-pressed={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>{t('calendar.upcoming')}</Button>
        <Button variant={activeTab === 'past' ? 'primary' : 'secondary'} aria-pressed={activeTab === 'past'} onClick={() => setActiveTab('past')}>{t('calendar.pastResults', 'Past Results')}</Button>
      </div>
      {activeTab === 'upcoming' ? <>
        {active.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(event => <PublicEventCard key={event.id} event={event} events={events} />)}</div> : <div className="space-y-5"><SectionHeading title={t('calendar.noUpcomingEvents')} description={t('season.nextSeasonNote')} /><div className="flex flex-wrap gap-3"><Button to="/events/past">{t('nav.pastEvents')}</Button>{archive.find(event => event.gallery_images_count > 0) && <Button variant="secondary" to={`/events/${archive.find(event => event.gallery_images_count > 0)!.slug}/gallery`}>{t('season.latestGallery')}</Button>}{[{ href: normalizeExternalUrl(org?.instagram_url), name: 'Instagram' }, { href: normalizeExternalUrl(org?.youtube_url), name: 'YouTube' }].filter(link => link.href).map(link => <Button key={link.name} href={link.href!} target="_blank" rel="noopener noreferrer" variant="secondary">{link.name}</Button>)}</div></div>}
        {cancelled.length > 0 && <div className="mt-10"><SectionHeading title={t('season.phase.cancelled')} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cancelled.map(event => <PublicEventCard key={event.id} event={event} events={events} />)}</div></div>}
      </> : <div className="space-y-12">{years.length ? years.map(year => <div key={year}><SectionHeading title={year} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{archive.filter(event => (event.date?.slice(0, 4) || String(event.season_year || '')) === year).map(event => <PublicEventCard key={event.id} event={event} events={events} />)}</div></div>) : <p className="text-text-secondary">{t('pastEvents.noEvents')}</p>}</div>}
    </div></section>
  </div>;
}
