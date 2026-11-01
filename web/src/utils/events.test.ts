import { describe, expect, it } from 'vitest';
import type { Event } from '../services/api';
import { cycleHasMainEvent, formatVenueAddress, getEventCycleYear } from './events';

describe('formatVenueAddress', () => {
  it('does not repeat a city or country already in the street address', () => {
    expect(formatVenueAddress('303 University Dr, Mangilao, 96913, Guam', 'Mangilao', 'Guam'))
      .toBe('303 University Dr, Mangilao, 96913, Guam');
  });

  it('appends city and country that the address does not mention', () => {
    expect(formatVenueAddress('No. 100, Songqin Street, Xinyi District, Taipei City 110', 'Taipei', 'Taiwan'))
      .toBe('No. 100, Songqin Street, Xinyi District, Taipei City 110, Taiwan');
    expect(formatVenueAddress('Komazawa Koen 1-1', 'Tokyo', 'Japan')).toBe('Komazawa Koen 1-1, Tokyo, Japan');
  });

  it('uses the untranslated names to detect parts on translated pages', () => {
    expect(formatVenueAddress(
      '303 University Dr, Mangilao, 96913, Guam',
      'マンギラオ',
      'グアム',
      { city: 'Mangilao', country: 'Guam' },
    )).toBe('303 University Dr, Mangilao, 96913, Guam');
  });

  it('handles missing values', () => {
    expect(formatVenueAddress(null, 'Tokyo', null)).toBe('Tokyo');
    expect(formatVenueAddress('', '', '')).toBe('');
  });
});

describe('cycleHasMainEvent', () => {
  const event = (overrides: Partial<Event>): Event => ({
    id: 1,
    name: 'Event',
    slug: 'event',
    date: '2027-01-30',
    status: 'upcoming',
    is_main_event: false,
    ...overrides,
  } as Event);

  it('is false when a season has only qualifier events', () => {
    expect(cycleHasMainEvent([event({}), event({ date: '2027-02-20' })], 2027)).toBe(false);
  });

  it('is true when the season includes a published main event', () => {
    expect(cycleHasMainEvent([event({}), event({ is_main_event: true, date: '2027-10-23' })], 2027)).toBe(true);
  });

  it('ignores main events from other seasons and cancelled main events', () => {
    expect(cycleHasMainEvent([event({ is_main_event: true, date: '2026-10-24', status: 'completed' })], 2027)).toBe(false);
    expect(cycleHasMainEvent([event({ is_main_event: true, status: 'cancelled' })], 2027)).toBe(false);
  });

  it('treats a new season of qualifiers as having no championship yet', () => {
    const events = [
      event({ id: 1, is_main_event: true, date: '2026-10-24', status: 'completed' }),
      event({ id: 2, date: '2027-01-30' }),
      event({ id: 3, date: '2027-02-20' }),
    ];
    const cycleYear = getEventCycleYear(events);
    expect(cycleYear).toBe(2027);
    expect(cycleHasMainEvent(events, cycleYear)).toBe(false);
  });
});
