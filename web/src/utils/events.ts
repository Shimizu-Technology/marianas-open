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
