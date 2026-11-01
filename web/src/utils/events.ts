import type { Event } from '../services/api';

export type EventPhase = 'upcoming' | 'live' | 'completed' | 'cancelled';
type PhaseEvent = Pick<Event, 'status' | 'date' | 'end_date'>;

/** Dates are venue calendar dates, compared against Guam's day, never the viewer's timezone. */
export function eventPhase(event: PhaseEvent, now = new Date()): EventPhase {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'completed') return 'completed';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Guam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const start = event.date?.slice(0, 10);
  const end = event.end_date?.slice(0, 10) || start;
  if (start && end) {
    if (end < today) return 'completed';
    if (start <= today && today <= end) return 'live';
  }
  return 'upcoming';
}

export function hasEventResults(event: Pick<Event, 'results_count'>): boolean {
  return (event.results_count ?? 0) > 0;
}

/** Only published ASJJF IDs are converted to official results URLs. */
export function getOfficialResultsLinks(event: Pick<Event, 'asjjf_source_urls' | 'asjjf_event_ids' | 'registration_url' | 'registration_url_gi' | 'registration_url_nogi'>): string[] {
  const ids = new Set<number>();
  for (const id of event.asjjf_event_ids ?? []) {
    if (Number.isSafeInteger(id) && id > 0) ids.add(id);
  }
  const sources = [...(event.asjjf_source_urls ?? []), event.registration_url, event.registration_url_gi, event.registration_url_nogi];
  for (const source of sources) {
    if (!source) continue;
    try {
      const url = new URL(source);
      if (!['asjjf.org', 'www.asjjf.org'].includes(url.hostname) || url.protocol !== 'https:') continue;
      const match = url.pathname.match(/^\/main\/(?:eventResults|eventInfo|eventNotice)\/(\d+)\/?$/i);
      if (match && Number(match[1]) > 0) ids.add(Number(match[1]));
    } catch { /* Invalid source URLs are not public links. */ }
  }
  return [...ids].map(id => `https://asjjf.org/main/eventResults/${id}`);
}

export function selectHomeState(events: Event[], now = new Date()) {
  const active = events.filter(event => event.date && ['upcoming', 'live'].includes(eventPhase(event, now)))
    .sort((a, b) => Number(eventPhase(b, now) === 'live') - Number(eventPhase(a, now) === 'live') || a.date.localeCompare(b.date));
  const completed = events.filter(event => event.date && eventPhase(event, now) === 'completed')
    .sort((a, b) => (b.end_date || b.date).localeCompare(a.end_date || a.date));
  const nextEvent = active[0] ?? null;
  const latestEvent = completed[0] ?? null;
  return {
    kind: nextEvent ? eventPhase(nextEvent, now) : latestEvent ? 'recap' : 'empty',
    nextEvent,
    seasonYear: latestEvent ? Number((latestEvent.end_date || latestEvent.date).slice(0, 4)) : null,
    latestResults: completed.find(hasEventResults) ?? null,
    latestGallery: completed.find(event => event.gallery_images_count > 0) ?? null,
  };
}

export function isCurrentMainEvent(event: Event | null | undefined): boolean {
  return !!event && !!event.date && event.is_main_event && ['upcoming', 'live'].includes(eventPhase(event));
}

export function getCurrentMainEvent(events: Event[]): Event | null {
  const candidates = events.filter(isCurrentMainEvent);

  return candidates.sort((a, b) => {
    if (eventPhase(a) === 'live' && eventPhase(b) !== 'live') return -1;
    if (eventPhase(b) === 'live' && eventPhase(a) !== 'live') return 1;
    return (a.date || '').localeCompare(b.date || '');
  })[0] ?? null;
}

export function getEventDetailsPath(event: Event): string {
  return isCurrentMainEvent(event) ? '/event' : `/events/${event.slug}`;
}

export function getEventCycleYear(events: Event[]): number | null {
  const currentMainEvent = getCurrentMainEvent(events);
  const nextActiveEvent = [...events]
    .filter(event => ['upcoming', 'live'].includes(eventPhase(event)) && event.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latestMainEvent = [...events]
    .filter(event => event.is_main_event && event.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const anchor = nextActiveEvent || currentMainEvent || latestMainEvent;

  if (!anchor?.date) return null;
  return Number(anchor.date.slice(0, 4)) || null;
}

/**
 * Builds a one-line venue address without repeating the city or country when the
 * stored street address already includes them (e.g. "303 University Dr, Mangilao, 96913, Guam").
 */
export function formatVenueAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  country: string | null | undefined,
  canonical: { city?: string | null; country?: string | null } = {},
): string {
  const parts: string[] = [];
  const base = address?.trim() ?? '';
  if (base) parts.push(base);
  const haystack = base.toLowerCase();
  const mentioned = (value: string | null | undefined) =>
    !!value?.trim() && haystack.includes(value.trim().toLowerCase());
  // The stored address is in English, while city/country may be translated, so also
  // check the untranslated values before appending a part.
  for (const [display, original] of [[city, canonical.city], [country, canonical.country]] as const) {
    const value = display?.trim();
    if (!value) continue;
    if (mentioned(value) || mentioned(original)) continue;
    if (parts.some(existing => existing.toLowerCase() === value.toLowerCase())) continue;
    parts.push(value);
  }
  return parts.join(', ');
}

/** True when the given season includes a published main championship event. */
export function cycleHasMainEvent(events: Event[], cycleYear: number | null): boolean {
  return events.some(event =>
    event.is_main_event
    && event.status !== 'cancelled'
    && !!event.date
    && (cycleYear === null || Number(event.date.slice(0, 4)) === cycleYear));
}
