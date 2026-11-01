import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import EventDetailPage from './EventDetailPage'
import { EventsProvider } from '../contexts/EventsContext'
import { api } from '../services/api'

vi.mock('../services/api', () => ({ api: { getEvents: vi.fn() } }))
vi.mock('../hooks/useApi', async () => {
  const { usePublicEvents } = await import('../contexts/EventsContext')
  return { useEvents: usePublicEvents, useSponsors: () => ({ sponsors: [] }) }
})
vi.mock('../hooks/useSiteImages', () => ({ useSiteImages: () => ({ images: [] }), getImageUrl: vi.fn() }))
vi.mock('../hooks/useTranslatedField', () => ({ useTranslatedField: () => ({ tf: vi.fn(), tfa: vi.fn() }) }))
vi.mock('../providers/PostHogProvider', () => ({ usePostHog: () => null }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }))
afterEach(() => { cleanup(); vi.useRealTimers() })

it('keeps a failed event request retryable at the same URL and only renders 404 after a successful empty response', async () => {
  vi.useFakeTimers()
  vi.mocked(api.getEvents).mockRejectedValue(new Error('private backend error'))
  render(<HelmetProvider><MemoryRouter initialEntries={['/events/valid-event']}><EventsProvider><Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes></EventsProvider></MemoryRouter></HelmetProvider>)
  await act(async () => { await vi.runAllTimersAsync() })
  expect(api.getEvents).toHaveBeenCalledTimes(4)
  expect(screen.getByRole('alert').textContent).toContain('eventDetail.loadErrorMessage')
  expect(screen.queryByText('404')).toBeNull()
  expect(screen.queryByText('private backend error')).toBeNull()
  vi.mocked(api.getEvents).mockResolvedValue([])
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'eventDetail.retry' })) })
  expect(api.getEvents).toHaveBeenCalledTimes(5)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByText('404')).toBeTruthy()
})
