import type { Event } from '../services/api';

const CURRENT_EVENT_STATUSES = new Set(['upcoming', 'live']);

export function isCurrentMainEvent(event: Event | null | undefined): boolean {
  return !!event && event.is_main_event && CURRENT_EVENT_STATUSES.has(event.status);
}

export function getCurrentMainEvent(events: Event[]): Event | null {
  const candidates = events.filter(isCurrentMainEvent);

  return candidates.sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return (a.date || '').localeCompare(b.date || '');
  })[0] ?? null;
}

export function getEventDetailsPath(event: Event): string {
  return isCurrentMainEvent(event) ? '/event' : `/events/${event.slug}`;
}

export function getEventCycleYear(events: Event[]): number | null {
  const currentMainEvent = getCurrentMainEvent(events);
  const nextActiveEvent = [...events]
    .filter(event => CURRENT_EVENT_STATUSES.has(event.status) && event.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latestMainEvent = [...events]
    .filter(event => event.is_main_event && event.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const anchor = currentMainEvent || nextActiveEvent || latestMainEvent;

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
