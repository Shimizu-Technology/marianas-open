import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import { eventEditorFixture } from './admin/event-editor/eventEditorFixtures';
import PublicEventCard from './PublicEventCard';
import JourneySection from './JourneySection';

vi.mock('../hooks/usePublicCopy', async () => {
  const { useTranslation } = await import('react-i18next');
  return { usePublicCopy: useTranslation };
});
vi.mock('./ImageWithShimmer', () => ({ default: () => null }));
afterEach(cleanup);
async function setup(element: ReactNode, lang = 'en') {
  const i18n = createInstance();
  await i18n.init({ lng: lang, resources: { en: { translation: en }, ja: { translation: ja } }, interpolation: { escapeValue: false } });
  return render(<I18nextProvider i18n={i18n}><MemoryRouter>{element}</MemoryRouter></I18nextProvider>);
}
it.each(['en', 'ja'])('renders multi-day ranges and single dates in %s', async lang => {
  const range = eventEditorFixture({ id: 1, date: '2030-01-30', end_date: '2030-01-31' });
  const single = eventEditorFixture({ id: 2, name: 'Single-day event', date: '2030-02-02', end_date: '2030-02-02' });
  await setup(<><PublicEventCard event={range} /><PublicEventCard event={single} /></>, lang);
  const format = new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  expect(screen.getByText(format.formatRange(new Date(2030, 0, 30), new Date(2030, 0, 31)), { normalizer: value => value.trim() })).toBeTruthy();
  expect(screen.getByText(format.format(new Date(2030, 1, 2)))).toBeTruthy();
});
it('keeps the translated venue, city and country on photographic cards', async () => {
  const event = eventEditorFixture({ translations: { venue_name: { ja: 'グアム大学競技会場' }, city: { ja: 'マンギラオ' }, country: { ja: 'グアム' } } });
  await setup(<PublicEventCard event={event} />, 'ja');
  expect(screen.getByText('グアム大学競技会場')).toBeTruthy();
  expect(screen.getByText('マンギラオ, グアム')).toBeTruthy();
  expect(screen.queryByText(event.venue_name)).toBeNull();
});
it('exposes an organizer poster as a labelled thumbnail and full-image link', async () => {
  const event = eventEditorFixture({ poster_image_url: 'https://example.com/published-poster.jpg' });
  await setup(<PublicEventCard event={event} />);
  const link = screen.getByRole('link', { name: `Official Poster: ${event.name}` });
  expect(link.getAttribute('href')).toBe(event.poster_image_url);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toContain('noopener');
  expect(within(link).getByRole('img').getAttribute('alt')).toContain(event.name);
  expect(within(link).getByRole('img').getAttribute('src')).toBe(event.poster_image_url);
});
it.each(['en', 'ja'])('marks only the main event as the Grand Championship in the %s journey', async lang => {
  const main = eventEditorFixture({ id: 1, name: 'Guam Marianas Open 2030', is_main_event: true, date: '2030-10-10' });
  const qualifier = eventEditorFixture({ id: 2, name: 'Guam Copa 2030', date: '2030-01-30' });
  await setup(<JourneySection events={[qualifier, main]} />, lang);
  const label = lang === 'ja' ? ja.journey.grandChampionship : en.journey.grandChampionship;
  const mainCard = screen.getByRole('heading', { name: main.name }).closest('.event-card') as HTMLElement;
  const qualifierCard = screen.getByRole('heading', { name: qualifier.name }).closest('.event-card') as HTMLElement;
  expect(within(mainCard).getByText(label)).toBeTruthy();
  expect(within(qualifierCard).queryByText(label)).toBeNull();
});
