import { useMemo } from 'react';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { useEvents } from '../hooks/useApi';
import { eventPhase } from '../utils/events';
import { useResultCounts } from '../hooks/useResultCounts';
import LoadingSpinner from '../components/LoadingSpinner';
import SEO from '../components/SEO';
import PublicEventCard from '../components/PublicEventCard';
import { SectionHeading } from '../components/ui';

export default function PastEventsPage() {
  const { t, i18n } = usePublicCopy();
  const { events: publishedEvents, loading } = useEvents();
  const { events, loading: countsLoading } = useResultCounts(publishedEvents);
  const archive = useMemo(() => events.filter(event => eventPhase(event) === 'completed').sort((a, b) => b.date.localeCompare(a.date)), [events]);
  const years = [...new Set(archive.map(event => (event.date?.slice(0, 4) || String(event.season_year || ''))))].sort((a, b) => Number(b) - Number(a));
  const yearGroups = years.map(year => ({ year, events: archive.filter(event => (event.date?.slice(0, 4) || String(event.season_year || '')) === year) }));
  if (loading || countsLoading) return <div className="min-h-screen pt-20"><LoadingSpinner /></div>;
  return <div className="min-h-screen pt-20">
    <SEO title="Past Events" description="Review completed Marianas Open tournaments, past qualifier events, and championship history across Guam and Asia-Pacific." path="/events/past" image="/images/ceremony-1.webp" structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Marianas Open Past Events',
            url: 'https://marianasopen.com/events/past',
            description: 'Completed Marianas Open tournaments and past event archive.',
          },
        ]} />
    <section className="public-section"><div className="public-container"><h1 className="event-hero-title">{t('pastEvents.title')}</h1><p className="text-text-secondary text-lg mt-5 max-w-2xl">{t('pastEvents.subtitle')}</p></div></section>
    <section className="public-section bg-surface/40"><div className="public-container space-y-12">
      {yearGroups.length ? yearGroups.map(({ year, events: yearEvents }) => <div key={year}><SectionHeading title={year} description={`${new Intl.NumberFormat(i18n.language).format(yearEvents.length)} ${t(yearEvents.length === 1 ? 'pastEvents.event' : 'pastEvents.events')}`} /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{yearEvents.map(event => <PublicEventCard key={event.id} event={event} events={events} />)}</div></div>) : <p className="text-text-secondary">{t('pastEvents.noEvents')}</p>}
    </div></section>
  </div>;
}
