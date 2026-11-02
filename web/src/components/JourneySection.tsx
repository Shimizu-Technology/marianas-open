import { usePublicCopy } from '../hooks/usePublicCopy';
import type { Event } from '../services/api';
import { cycleHasMainEvent, getEventCycleYear } from '../utils/events';
import PublicEventCard from './PublicEventCard';
import { SectionHeading } from './ui';

export default function JourneySection({ events }: { events: Event[] }) {
  const { t } = usePublicCopy();
  const year = getEventCycleYear(events);
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date));
  return <section className="public-section bg-surface/40">
    <div className="public-container">
      <SectionHeading title={t('journey.title')} description={t(cycleHasMainEvent(events, year) ? 'journey.subtitle' : 'journey.subtitleSeries')} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{ordered.map(event => <PublicEventCard key={event.id} event={event} events={events} />)}</div>
    </div>
  </section>;
}
