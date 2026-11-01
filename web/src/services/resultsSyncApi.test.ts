import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, setAuthTokenGetter } from './api'

beforeEach(() => {
  setAuthTokenGetter(async () => 'staff-token')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ run: null, status: null, last_checked_at: null }) }))
})
afterEach(() => {
  setAuthTokenGetter(async () => null)
  vi.unstubAllGlobals()
})

it('reads sync status, posts saved preview and targets the selected run for approval/discard', async () => {
  expect(await api.admin.getResultsSync(7)).toEqual({ run: null, status: null, last_checked_at: null })
  await api.admin.previewResultsSync(7)
  await api.admin.approveResultsSync(7, 12)
  await api.admin.discardResultsSync(7, 12)
  const calls = vi.mocked(fetch).mock.calls
  expect(calls.map(([url]) => String(url).replace(/^https?:\/\/[^/]+/, ''))).toEqual([
    '/api/v1/admin/events/7/results_sync', '/api/v1/admin/events/7/results_sync/preview',
    '/api/v1/admin/events/7/results_sync/12/approve', '/api/v1/admin/events/7/results_sync/12/discard',
  ])
  for (const [, options] of calls) expect(options?.headers).toMatchObject({ Authorization: 'Bearer staff-token' })
  for (const [, options] of calls.slice(1)) expect(options?.method).toBe('POST')
})

it('keeps compatibility preview read-only and sends the required run_id when importing', async () => {
  await api.admin.importResultsPreview(7)
  await api.admin.importResults(7, 12)
  expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/events/7/import_results_preview'), expect.not.objectContaining({ method: 'POST' }))
  expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/events/7/import_results'), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ run_id: 12 }),
    headers: expect.objectContaining({ 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' }),
  }))
})
