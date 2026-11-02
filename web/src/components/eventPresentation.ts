import type { Event } from '../services/api';
import { eventPhase } from '../utils/events';
import { getEventHeroImage, resolveMediaUrl } from '../utils/images';

/** Compare canonical names, retaining place/series words and removing edition years only. */
export function eventSeriesName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/^guam\s+/, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function previousSeriesEdition(event: Event, events: Event[], now = new Date()): Event | null {
  const series = eventSeriesName(event.name);
  return [...events].filter(candidate => candidate.id !== event.id && candidate.date < event.date
    && eventPhase(candidate, now) === 'completed' && !!candidate.hero_image_url?.trim()
    && eventSeriesName(candidate.name) === series)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function eventHeroImage(event: Event, events: Event[], fallback?: string | null, now = new Date()): string {
  const photo = event.hero_image_url?.trim() || previousSeriesEdition(event, events, now)?.hero_image_url;
  return getEventHeroImage(event.slug, photo || null, fallback);
}

/** An archive photo always names its actual edition; generic flagship claims are never reused. */
export function previousEditionPhoto(event: Event, events: Event[], now = new Date()) {
  const edition = previousSeriesEdition(event, events, now);
  const src = resolveMediaUrl(edition?.hero_image_url);
  return edition && src ? { edition, src } : null;
}
