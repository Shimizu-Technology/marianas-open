import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, type AsjjfStatus } from '../../services/api'
import AsjjfSyncAdmin from './AsjjfSyncAdmin'

const fixture: AsjjfStatus = {
  queue_counts: { pending: 2, completed: 4, failed: 1 },
  breaker: { open: true, paused_until: '2026-11-03T00:00:00Z' },
  heartbeats: [{ fetcher_id: 'guam-fetcher', fetcher_version: '1.0', run_started_at: '2026-11-02T00:00:00Z', run_finished_at: null, fetched: 3, challenged: 1, errors: 2, updated_at: '2026-11-02T00:01:00Z' }],
  recent_snapshots: [{ id: 42, url: 'https://asjjf.org/results/7', page_type: 'results', source: 'upload', outcome: 'fetched', fetched_at: '2026-11-02T00:00:00Z', parse_status: 'failed', parse_error: 'No results table found', parsed_summary: { divisions: 3 } }],
}

beforeEach(() => {
  vi.spyOn(api.admin, 'getAsjjfStatus').mockResolvedValue(fixture)
  vi.spyOn(api.admin, 'closeAsjjfBreaker').mockResolvedValue({ breaker: { open: false, paused_until: null } })
})
afterEach(cleanup)

function mount(isAdmin = false) {
  render(<MemoryRouter initialEntries={['/admin/asjjf']}><Routes>
    <Route path="admin" element={<Outlet context={{ isAdmin }} />}>
      <Route path="asjjf" element={<AsjjfSyncAdmin />} />
    </Route>
  </Routes></MemoryRouter>)
}

it('shows queue, heartbeat, breaker, parse error and summary for staff without a reset action', async () => {
  mount()
  expect(await screen.findByText('guam-fetcher')).toBeTruthy()
  expect(screen.getByText('pending')).toBeTruthy()
  expect(screen.getByText('Fetched: 3 · Challenged: 1 · Errors: 2')).toBeTruthy()
  expect(screen.getByText('Not reported')).toBeTruthy()
  expect(screen.getByText('Parse error: No results table found')).toBeTruthy()
  expect(screen.getByText('failed', { selector: 'dd' })).toBeTruthy()
  fireEvent.click(screen.getByText('Parsed summary'))
  expect(screen.getByText(/"divisions": 3/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Reset safety pause' })).toBeNull()
  expect(screen.getByText('An administrator can reset this pause.')).toBeTruthy()
})

it('lets administrators reset an open breaker and displays the returned state', async () => {
  mount(true)
  fireEvent.click(await screen.findByRole('button', { name: 'Reset safety pause' }))
  expect(await screen.findByText('Ready — the circuit breaker is closed.')).toBeTruthy()
  expect(api.admin.closeAsjjfBreaker).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Reset safety pause' })).toBeNull()
})

it('keeps a failed breaker reset available for retry', async () => {
  vi.mocked(api.admin.closeAsjjfBreaker).mockRejectedValueOnce(new Error('Reset unavailable'))
  mount(true)
  fireEvent.click(await screen.findByRole('button', { name: 'Reset safety pause' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Reset unavailable Showing the last loaded status.')
  expect(screen.getByText('Paused — the circuit breaker is open.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Reset safety pause' })).toHaveProperty('disabled', false)
})

it('refreshes pending parse status and shows the new summary', async () => {
  vi.mocked(api.admin.getAsjjfStatus).mockResolvedValueOnce({ ...fixture, recent_snapshots: [{ ...fixture.recent_snapshots[0], parse_status: 'pending', parse_error: null, parsed_summary: null }] })
  mount()
  expect(await screen.findByText('pending', { selector: 'dd' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }))
  expect(await screen.findByText('Parse error: No results table found')).toBeTruthy()
  expect(api.admin.getAsjjfStatus).toHaveBeenCalledTimes(2)
})

it('recovers from initial load errors and explains empty states', async () => {
  vi.mocked(api.admin.getAsjjfStatus).mockRejectedValueOnce(new Error('Status unavailable')).mockResolvedValue({ ...fixture, heartbeats: [], recent_snapshots: [], queue_counts: {} })
  mount()
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Status unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }))
  expect(await screen.findByText('No fetcher has reported yet.')).toBeTruthy()
  expect(screen.getByText('No queue counts reported.')).toBeTruthy()
  expect(screen.getByText(/No snapshots yet/)).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})
