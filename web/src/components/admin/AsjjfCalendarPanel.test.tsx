import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { api, type AsjjfCalendarResponse } from '../../services/api'
import AsjjfCalendarPanel from './AsjjfCalendarPanel'

const fixture = (): AsjjfCalendarResponse => ({
  last_checked_at: '2026-11-02T01:00:00Z', last_check_status: 'parsed', source_url: 'https://asjjf.org/main/eventsBySeason/381',
  total: 2, page: 1, per_page: 25,
  reviews: [
    { id: 1, kind: 'new_draft', status: 'pending', title: 'New Copa', event_id: 7, event_status: 'draft', snapshot_id: 4,
      source_url: 'https://asjjf.org/main/eventsBySeason/381', source_checked_at: '2026-11-02T01:00:00Z', old_values: {}, new_values: { date: '2027-01-30' } },
    { id: 2, kind: 'change', status: 'pending', title: 'Published Tokyo', event_id: 8, event_status: 'upcoming', snapshot_id: 4,
      source_url: 'https://asjjf.org/main/eventsBySeason/381', source_checked_at: '2026-11-02T01:00:00Z', old_values: { venue_name: 'Old venue' }, new_values: { venue_name: 'New venue' } },
  ],
})
let data: AsjjfCalendarResponse
beforeEach(() => {
  data = fixture()
  vi.spyOn(api.admin, 'getAsjjfCalendar').mockImplementation(async () => structuredClone(data))
  vi.spyOn(api.admin, 'decideAsjjfCalendar').mockImplementation(async (id, decision) => {
    const review = data.reviews.find(r => r.id === id)!
    data.reviews = data.reviews.filter(r => r.id !== id)
    return { review: { ...review, status: decision === 'apply' ? 'applied' : 'dismissed' } }
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function panel(isAdmin = true, onChanged = vi.fn()) {
  render(<MemoryRouter><Routes><Route element={<Outlet context={{ isAdmin }} />}><Route path="/" element={<AsjjfCalendarPanel onChanged={onChanged} />} /></Route></Routes></MemoryRouter>)
  return onChanged
}

it('explains new drafts, shows source and old to new facts, and opens the existing editor', async () => {
  panel()
  await screen.findByText('New Copa')
  expect(screen.getByText('ASJJF listed a new event. Review it, then publish.')).toBeTruthy()
  expect(screen.getByText('Old venue')).toBeTruthy()
  expect(screen.getByText(/New venue/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Open draft' }).getAttribute('href')).toBe('/admin/events?edit=7')
  expect(screen.getByRole('link', { name: 'Open ASJJF calendar' }).getAttribute('href')).toContain('eventsBySeason/381')
  expect(screen.getByText(/Last calendar check:/).textContent).toContain('ChST')
})

it('applies one change then refreshes the queue and events; dismiss preserves the event', async () => {
  const changed = panel()
  fireEvent.click(await screen.findByRole('button', { name: 'Apply changes' }))
  await waitFor(() => expect(api.admin.decideAsjjfCalendar).toHaveBeenCalledWith(2, 'apply'))
  await waitFor(() => expect(screen.queryByText('Published Tokyo')).toBeNull())
  expect(changed).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  await screen.findByText('Review dismissed. The event was kept.')
  await waitFor(() => expect(screen.queryByText('New Copa')).toBeNull())
  expect(api.admin.decideAsjjfCalendar).toHaveBeenCalledWith(1, 'dismiss')
})

it('staff can inspect drafts but cannot apply or dismiss', async () => {
  panel(false)
  await screen.findByText('New Copa')
  expect(screen.queryByRole('button', { name: 'Apply changes' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Open draft' })).toBeTruthy()
})

it('keeps failed decisions visible and disables actions until an explicit refresh', async () => {
  vi.mocked(api.admin.decideAsjjfCalendar).mockRejectedValue(new Error('The event has changed. Refresh.'))
  panel()
  fireEvent.click(await screen.findByRole('button', { name: 'Apply changes' }))
  expect((await screen.findByRole('alert')).textContent).toContain('The event has changed')
  expect((screen.getByRole('button', { name: 'Apply changes' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh calendar panel' }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(screen.getByText('Published Tokyo')).toBeTruthy()
})

it('recovers from a loading error and shows failed latest fetch and empty state', async () => {
  vi.mocked(api.admin.getAsjjfCalendar).mockRejectedValueOnce(new Error('Offline'))
  panel()
  await screen.findByText('Offline')
  data = { ...fixture(), reviews: [], total: 0, last_check_status: 'failed' }
  fireEvent.click(screen.getByRole('button', { name: 'Refresh calendar panel' }))
  await screen.findByText('No calendar items need review on this page.')
  expect(screen.getByText(/latest page could not be read/)).toBeTruthy()
})

it('paginates review items and does not offer apply for a missing listing', async () => {
  data = { ...fixture(), per_page: 1, total: 2, reviews: [{ ...fixture().reviews[1], kind: 'missing', new_values: { message: 'Missing from calendar' } }] }
  panel()
  await screen.findByText('Missing from calendar')
  expect(screen.queryByRole('button', { name: 'Apply changes' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(api.admin.getAsjjfCalendar).toHaveBeenCalledWith(2))
})
