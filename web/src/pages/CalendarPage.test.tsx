import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import CalendarPage from './CalendarPage'
import PastEventsPage from './PastEventsPage'
import EventGalleryPage from './EventGalleryPage'
import { api, type Event } from '../services/api'
import { eventEditorFixture } from '../components/admin/event-editor/eventEditorFixtures'

const fixtureState = vi.hoisted(() => ({ events: [] as Event[], language: 'en' }));
vi.mock('../hooks/useApi', () => ({
  useEvents: () => ({ events: fixtureState.events, loading: false }),
  useOrganization: () => ({ org: null, loading: false }),
}))
vi.mock('../hooks/useResultCounts', () => ({ useResultCounts: (events: Event[]) => ({ events, loading: false }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => key === 'event.date' ? 'Date to be announced' : key === 'pastEvents.event' ? (fixtureState.language === 'ja' ? '大会' : 'event') : key === 'pastEvents.events' ? (fixtureState.language === 'ja' ? '大会' : 'events') : (typeof fallback === 'string' ? fallback : key), i18n: { language: fixtureState.language } }) }))
vi.mock('../components/ScrollReveal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../hooks/usePublicCopy', async () => { const { useTranslation } = await import('react-i18next'); return { usePublicCopy: useTranslation } })
vi.mock('../components/SEO', () => ({ default: () => null }))
vi.mock('../components/SocialShare', () => ({ default: () => null }))
vi.mock('../components/QRShare', () => ({ default: () => null }))

beforeEach(() => {
  fixtureState.language = 'en';
  fixtureState.events = [eventEditorFixture({ date: '', status: 'upcoming', asjjf_stars: null }), eventEditorFixture({ id: 8, date: '', status: 'completed', asjjf_stars: null })];
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('shows an honest date placeholder for undated overrides in both calendar tabs', () => {
  render(<MemoryRouter><CalendarPage /></MemoryRouter>)
  expect(screen.getAllByText('Date to be announced').length).toBeGreaterThan(0)
  expect(screen.queryByText(/Invalid Date|October 18, 2026/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Past Results' }))
  expect(screen.getByRole('heading', { name: '2027' })).toBeTruthy()
  expect(screen.getAllByText('Date to be announced').length).toBeGreaterThan(0)
})


it('groups undated archive events by season and labels their missing date', () => {
  render(<MemoryRouter><PastEventsPage /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '2027' })).toBeTruthy()
  expect(screen.getByText('Date to be announced')).toBeTruthy()
  expect(screen.queryByText(/NaN|Invalid Date/)).toBeNull()
})

it('labels a gallery whose published event has no date', async () => {
  vi.spyOn(api, 'getEventGallery').mockResolvedValue({ gallery_images: [], categories: [], total: 0, page: 1, per_page: 24 })
  render(<MemoryRouter initialEntries={['/events/guam-copa-2027/gallery']}><Routes><Route path="/events/:slug/gallery" element={<EventGalleryPage />} /></Routes></MemoryRouter>)
  expect(await screen.findByText('Date to be announced')).toBeTruthy()
  expect(screen.queryByText(/Invalid Date|October 18, 2026/)).toBeNull()
})

it.each(['calendar', 'archive'])('sorts mixed dated and undated %s year groups newest first', page => {
  fixtureState.events = [eventEditorFixture({ id: 1, date: '2026-06-01', status: 'completed' }), eventEditorFixture({ id: 2, date: '', season_year: 2027, status: 'completed' })];
  render(<MemoryRouter>{page === 'calendar' ? <CalendarPage /> : <PastEventsPage />}</MemoryRouter>);
  if (page === 'calendar') fireEvent.click(screen.getByRole('button', { name: 'Past Results' }));
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['2027', '2026']);
});
it.each(['en', 'ja'])('shows the per-year singular and plural counts in %s', lang => {
  fixtureState.language = lang;
  fixtureState.events = [eventEditorFixture({ id: 1, date: '2026-06-01', status: 'completed' }), eventEditorFixture({ id: 2, date: '', season_year: 2027, status: 'completed' }), eventEditorFixture({ id: 3, date: '', season_year: 2027, status: 'completed' })];
  render(<MemoryRouter><PastEventsPage /></MemoryRouter>);
  const group2027 = screen.getByRole('heading', { name: '2027' }).parentElement!;
  const group2026 = screen.getByRole('heading', { name: '2026' }).parentElement!;
  expect(within(group2027).getByText(lang === 'ja' ? '2 大会' : '2 events')).toBeTruthy();
  expect(within(group2026).getByText(lang === 'ja' ? '1 大会' : '1 event')).toBeTruthy();
});
