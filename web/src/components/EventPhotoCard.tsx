import type { Event } from '../services/api';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { previousEditionPhoto } from './eventPresentation';

export default function EventPhotoCard({ event, events, poster }: { event: Event; events: Event[]; poster?: { src: string; label: string } }) {
  const { t } = usePublicCopy();
  const { tf } = useTranslatedField();
  const pastPhoto = previousEditionPhoto(event, events);
  if (!poster && !pastPhoto) return null;
  return <figure className="ui-card overflow-hidden h-full">
    <img src={poster?.src || pastPhoto!.src} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
    <figcaption className="p-5 text-sm text-text-secondary">{poster ? <>{t('event.officialPoster')}: {poster.label}</> : tf(pastPhoto!.edition, 'name')}</figcaption>
  </figure>;
}
