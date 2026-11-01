import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import CalendarPage from './CalendarPage'
import { eventEditorFixture } from '../components/admin/event-editor/eventEditorFixtures'

vi.mock('../hooks/useApi', () => ({
  useEvents: () => ({ events: [eventEditorFixture({ date: '', status: 'upcoming', asjjf_stars: null }), eventEditorFixture({ id: 8, date: '', status: 'completed', asjjf_stars: null })], loading: false }),
  useOrganization: () => ({ org: null, loading: false }),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => key === 'event.date' ? 'Date to be announced' : fallback || key, i18n: { language: 'en' } }) }))
vi.mock('../components/ScrollReveal', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/SEO', () => ({ default: () => null }))
vi.mock('../components/SocialShare', () => ({ default: () => null }))
vi.mock('../components/QRShare', () => ({ default: () => null }))

it('shows an honest date placeholder for undated overrides in both calendar tabs', () => {
  render(<MemoryRouter><CalendarPage /></MemoryRouter>)
  expect(screen.getByText('Date to be announced')).toBeTruthy()
  expect(screen.queryByText(/Invalid Date|October 18, 2026/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Past Results' }))
  expect(screen.getByRole('heading', { name: '2027' })).toBeTruthy()
  expect(screen.getByText('Date to be announced')).toBeTruthy()
})
