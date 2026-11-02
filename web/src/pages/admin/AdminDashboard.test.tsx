import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import { api, type AdminAttention } from '../../services/api'

const empty: AdminAttention = { checked_at: '2026-11-03T02:00:00Z', groups: [] }
const populated: AdminAttention = { ...empty, groups: [{ area: 'results', title: 'Results', items: [{ key: 'held_results_7', area: 'results', severity: 'warning', title: 'Results need approval: Copa 2027', explanation: 'An administrator needs to review the saved changes.', count: 2, href: '/admin/events/7/results' }] }] }
function dashboard() { render(<MemoryRouter><Routes><Route path="/" element={<AdminDashboard />} /><Route path="/admin/events/7/results" element={<h1>Event results destination</h1>} /></Routes></MemoryRouter>) }
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

it('shows a loading state, then an empty state with the server check time', async () => {
  let resolve!: (data: AdminAttention) => void
  vi.spyOn(api.admin, 'getAttention').mockImplementation(() => new Promise(done => { resolve = done }))
  dashboard()
  expect(screen.getByRole('status').textContent).toContain('Checking')
  resolve(empty)
  await screen.findByText('Nothing needs attention.')
  expect(document.querySelector('time')?.dateTime).toBe(empty.checked_at)
  expect((screen.getByRole('button', { name: 'Check again' }) as HTMLButtonElement).disabled).toBe(false)
})

it('groups actionable items, shows count and severity, and opens the deep link', async () => {
  vi.spyOn(api.admin, 'getAttention').mockResolvedValue(populated)
  dashboard()
  await screen.findByRole('heading', { name: 'Results' })
  expect(screen.getByText('2')).toBeTruthy()
  expect(screen.getByText('Review')).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Open: Results need approval: Copa 2027' }))
  await screen.findByRole('heading', { name: 'Event results destination' })
})

it('does not claim all clear when the request fails and supports retry', async () => {
  vi.spyOn(api.admin, 'getAttention').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(empty)
  dashboard()
  await screen.findByRole('alert')
  expect(screen.queryByText('Nothing needs attention.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Nothing needs attention.')
  expect(screen.queryByRole('alert')).toBeNull()
})

it('retains the last checked items when a later refresh fails', async () => {
  vi.spyOn(api.admin, 'getAttention').mockResolvedValueOnce(populated).mockRejectedValueOnce(new Error('offline'))
  dashboard()
  await screen.findByText('Results need approval: Copa 2027')
  fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Showing the last successful check'))
  expect(screen.getByText('Results need approval: Copa 2027')).toBeTruthy()
})

it('hides analytics when unset and opens the configured PostHog dashboard when set', async () => {
  vi.spyOn(api.admin, 'getAttention').mockResolvedValue(empty)
  vi.stubEnv('VITE_POSTHOG_DASHBOARD_URL', '')
  dashboard()
  await screen.findByText('Nothing needs attention.')
  expect(screen.queryByRole('link', { name: /PostHog/ })).toBeNull()
  cleanup()
  vi.stubEnv('VITE_POSTHOG_DASHBOARD_URL', 'https://us.posthog.com/project/123/dashboard/456')
  dashboard()
  expect(screen.getByRole('link', { name: /PostHog analytics dashboard/ }).getAttribute('href')).toBe('https://us.posthog.com/project/123/dashboard/456')
})
