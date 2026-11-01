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
it('sends authenticated rollover, publication, and ASJJF fill payloads', async () => {
  await api.admin.cloneEvent(7, { target_year: 2027, keep_tagline: false, asjjf_event_id: 2200 })
  await api.admin.rolloverEvents({
    source_year: 2026,
    target_year: 2027,
    keep_tagline: true,
    asjjf_event_ids: { 7: 2200 },
  })
  await api.admin.publishEvent(7, { status: 'live', override_reason: 'Organizer approved this event.' })
  await api.admin.unpublishEvent(7)
  await api.admin.fillEventFromAsjjf(7, 2200)
  const calls = vi.mocked(fetch).mock.calls
  expect(calls.map(([url]) => String(url).replace(/^https?:\/\/[^/]+/, ''))).toEqual([
    '/api/v1/admin/events/7/clone',
    '/api/v1/admin/events/rollover',
    '/api/v1/admin/events/7/publish',
    '/api/v1/admin/events/7/unpublish',
    '/api/v1/admin/events/7/fill_asjjf',
  ])
  expect(calls.map(([, request]) => (request?.body ? JSON.parse(request.body as string) : null))).toEqual([
    { target_year: 2027, keep_tagline: false, asjjf_event_id: 2200 },
    { source_year: 2026, target_year: 2027, keep_tagline: true, asjjf_event_ids: { 7: 2200 } },
    { status: 'live', override_reason: 'Organizer approved this event.' },
    null,
    { asjjf_event_id: 2200 },
  ])
  calls.forEach(([, request]) => {
    expect(request?.method).toBe('POST')
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer test-token' })
  })
})

it('keeps overridden undated public events safe without guessing a date', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: 7, date: null, status: 'upcoming' }] } as Response)
  const events = await api.getEvents()
  expect(events[0].date).toBe('')
  expect(events[0].date.slice(0, 4)).toBe('')
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 7, date: null }) } as Response)
  expect((await api.getEvent('undated')).date).toBe('')
})
