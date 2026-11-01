import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, setAuthTokenGetter } from './api'

beforeEach(() => {
  setAuthTokenGetter(async () => 'test-token')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }))
})
afterEach(() => {
  setAuthTokenGetter(async () => null)
  vi.unstubAllGlobals()
})

it('authenticates status, event queue and admin breaker requests against the intake endpoints', async () => {
  await api.admin.getAsjjfStatus()
  await api.admin.checkAsjjf(7)
  await api.admin.closeAsjjfBreaker()
  const calls = vi.mocked(fetch).mock.calls
  expect(calls.map(([url]) => String(url).replace(/^https?:\/\/[^/]+/, ''))).toEqual([
    '/api/v1/admin/asjjf/status', '/api/v1/admin/events/7/asjjf_check', '/api/v1/admin/asjjf/close_breaker',
  ])
  expect(calls[1][1]?.method).toBe('POST')
  expect(calls[2][1]?.method).toBe('POST')
  for (const [, options] of calls) expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-token' })
})

it('sends the HTML upload as multipart without forcing a content type', async () => {
  const data = new FormData()
  data.set('file', new File(['<html></html>'], 'saved.html', { type: 'text/html' }))
  data.set('page_type', 'event_results')
  data.set('url', 'https://asjjf.org/main/eventResults/7')
  await api.admin.uploadAsjjfSnapshot(data)
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/asjjf/snapshots'), {
    method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: data,
  })
})
