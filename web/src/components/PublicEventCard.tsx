import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import type { Event } from '../services/api';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';
import { eventPhase, getEventDetailsPath, hasEventResults } from '../utils/events';
import { eventHeroImage } from './eventPresentation';
import ImageWithShimmer from './ImageWithShimmer';
import RegisterControl from './RegisterControl';
import EventStars from './EventStars';
import { Button, Card, Chip } from './ui';

export default function PublicEventCard({ event, events = [], compact = false }: { event: Event; events?: Event[]; compact?: boolean }) {
  const { t, i18n } = usePublicCopy();
  const { tf } = useTranslatedField();
  const phase = eventPhase(event);
  const active = phase === 'upcoming' || phase === 'live';
  const name = tf(event, 'name');
  const date = event.date ? parseDateLocalSafe(event.date).toLocaleDateString(getDateLocale(i18n.language), { year: 'numeric', month: 'long', day: 'numeric' }) : t('event.date');
  return <Card className="event-card flex h-full flex-col overflow-hidden">
    {!compact && <Link to={getEventDetailsPath(event)} tabIndex={-1} aria-hidden="true" className="block aspect-[16/7] overflow-hidden">
      <ImageWithShimmer src={eventHeroImage(event, events)} alt="" className="h-full w-full object-cover" />
    </Link>}
    <div className="flex flex-1 flex-col p-5 gap-4">
      <div className="flex flex-wrap items-center gap-2"><Chip>{t(`season.phase.${phase}`)}</Chip><EventStars stars={event.asjjf_stars} /></div>
      <h3 className="font-heading text-xl font-semibold leading-tight"><Link to={getEventDetailsPath(event)} className="hover:text-gold-400">{name}</Link></h3>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">
        <p className="flex items-start gap-2"><Calendar size={16} className="shrink-0 mt-0.5" />{date}</p>
        <p className="flex items-start gap-2"><MapPin size={16} className="shrink-0 mt-0.5" />{tf(event, 'city')}, {tf(event, 'country')}</p>
      </div>
      {phase === 'completed' && <p className="text-sm text-gold-400">{t(hasEventResults(event) ? 'results.viewResults' : event.results_count === 0 ? 'season.resultsPending' : 'season.resultsUnavailableShort')}</p>}
      <div className={`mt-auto gap-2 pt-2 ${compact ? 'flex flex-wrap items-center' : 'grid'}`}>
        {active && <RegisterControl event={event} className={compact ? '' : 'w-full'} />}
        <Button to={getEventDetailsPath(event)} variant={compact ? 'ghost' : 'secondary'}>{t('calendar.details')}<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>
    </div>
  </Card>;
}
