import { describe, expect, it } from 'vitest';
import type { Event } from '../services/api';
import { cycleHasMainEvent, eventPhase, formatVenueAddress, getEventCycleYear, getOfficialResultsLinks, hasEventResults, selectHomeState } from './events';

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

describe('season states', () => {
  const event = (overrides: Partial<Event> = {}): Event => ({
    id: 1, name: 'Published event', slug: 'published-event', status: 'upcoming',
    date: '2026-10-24', end_date: '2026-10-25', is_main_event: false,
    gallery_images_count: 0, results_count: 0, ...overrides,
  } as Event);
  const now = new Date('2026-11-02T00:00:00Z');

  it('uses Guam midnight and includes the entire final event day', () => {
    expect(eventPhase(event(), new Date('2026-10-23T13:59:59Z'))).toBe('upcoming');
    expect(eventPhase(event(), new Date('2026-10-23T14:00:00Z'))).toBe('live');
    expect(eventPhase(event(), new Date('2026-10-25T13:59:59Z'))).toBe('live');
    expect(eventPhase(event(), new Date('2026-10-25T14:00:00Z'))).toBe('completed');
  });
  it('handles one-day events, stale statuses and explicit completed/cancelled states', () => {
    expect(eventPhase(event({ end_date: null }), new Date('2026-10-24T14:00:00Z'))).toBe('completed');
    expect(eventPhase(event({ status: 'live' }), now)).toBe('completed');
    expect(eventPhase(event({ status: 'live', date: '2027-01-30', end_date: null }), now)).toBe('upcoming');
    expect(eventPhase(event({ status: 'cancelled' }), now)).toBe('cancelled');
    expect(eventPhase(event({ status: 'completed', date: '2027-01-30' }), now)).toBe('completed');
  });
  it('does not infer results from completion or an import timestamp', () => {
    expect(hasEventResults(event({ results_imported_at: '2026-10-26', results_count: 0 }))).toBe(false);
    expect(hasEventResults(event({ results_count: undefined }))).toBe(false);
    expect(hasEventResults(event({ results_count: 2 }))).toBe(true);
  });
  it('selects the earliest published upcoming event', () => {
    const copa = event({ id: 2, date: '2027-01-30', end_date: null });
    const tokyo = event({ id: 3, date: '2027-02-20', end_date: null });
    expect(selectHomeState([tokyo, event(), copa], now).nextEvent).toBe(copa);
    expect(selectHomeState([copa], now).kind).toBe('upcoming');
  });
  it('prioritizes live events, ignores cancellations and offers a factual recap off-season', () => {
    const past = event({ status: 'completed', results_count: 9, gallery_images_count: 8 });
    const cancelled = event({ date: '2027-01-01', status: 'cancelled' });
    expect(selectHomeState([past, cancelled], now)).toMatchObject({ kind: 'recap', seasonYear: 2026, latestResults: past, latestGallery: past });
    expect(selectHomeState([], now)).toMatchObject({ kind: 'empty', seasonYear: null, nextEvent: null });
    expect(selectHomeState([past, event({ date: '2026-11-02', end_date: null })], now).kind).toBe('live');
    expect(selectHomeState([event()], now).latestResults).toBeNull();
  });
  it('builds deduplicated official results links from source and registration IDs only', () => {
    expect(getOfficialResultsLinks({
      asjjf_source_urls: ['https://asjjf.org/main/eventResults/1837', 'https://evil.example/main/eventInfo/999'],
      asjjf_event_ids: [1837], registration_url: 'https://asjjf.org/main/eventNotice/1838',
      registration_url_gi: null, registration_url_nogi: 'javascript:alert(1)',
    })).toEqual(['https://asjjf.org/main/eventResults/1837', 'https://asjjf.org/main/eventResults/1838']);
  });
});
