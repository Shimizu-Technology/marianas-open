import { describe, expect, it } from 'vitest';
import type { Event } from '../services/api';
import { selectHomeState } from '../utils/events';
import { eventHeroImage, previousEditionPhoto } from './eventPresentation';
const now = new Date('2026-11-02T00:00:00Z');
const event = (overrides: Partial<Event>) => ({ id: 1, name: 'Guam Copa de Marianas 2027', slug: 'copa-2027', date: '2027-01-30', status: 'upcoming', hero_image_url: null, ...overrides } as Event);
describe('event presentation', () => {
  const current = event({});
  const previous = event({ id: 2, name: 'Guam Copa de Marianas 2026', date: '2026-01-31', status: 'completed', hero_image_url: 'https://example.com/copa.jpg' });
  it('promotes the next event rather than a later flagship', () => {
    expect(selectHomeState([event({ id: 3, is_main_event: true, date: '2027-10-10' }), current], now).nextEvent?.id).toBe(current.id);
  });
  it('prefers the current photo, then the newest completed same-series edition', () => {
    expect(eventHeroImage(event({ hero_image_url: 'https://example.com/current.jpg' }), [previous], 'fallback', now)).toBe('https://example.com/current.jpg');
    const older = event({ ...previous, id: 5, name: 'Guam Copa de Marianas 2025', date: '2025-01-01', hero_image_url: 'older' });
    expect(eventHeroImage(current, [older, previous], 'fallback', now)).toBe(previous.hero_image_url);
  });
  it('does not borrow from another series, a future edition or a cancelled edition', () => {
    const unrelated = event({ ...previous, name: 'Guam Marianas Open 2026' });
    expect(eventHeroImage(current, [unrelated, event({ ...previous, status: 'cancelled' }), event({ ...previous, date: '2028-01-01' })], 'fallback', now)).toBe('fallback');
    expect(previousEditionPhoto(current, [unrelated], now)).toBeNull();
  });
  it('labels the previous photo with its actual edition and no invented attendance', () => {
    expect(previousEditionPhoto(current, [previous], now)).toEqual({ edition: previous, src: previous.hero_image_url });
  });
});
