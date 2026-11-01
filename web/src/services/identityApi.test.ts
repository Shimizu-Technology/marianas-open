import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, setAuthTokenGetter } from './api'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  setAuthTokenGetter(async () => 'test-token')
})
afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset(); setAuthTokenGetter(async () => null) })
it('uses authenticated merge-preview and explicit confirmed mutation contracts', async () => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }))
  await api.admin.previewAcademyMerge(1, 2)
  await api.admin.mergeAcademy(1, 2)
  await api.admin.previewCompetitorMerge(3, 4)
  await api.admin.mergeCompetitor(3, 4)
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/admin\/academies\/1\/merge_preview\?target_id=2$/)
  expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST', body: JSON.stringify({ target_id: 2, confirm: true }), headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }))
  expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/v1\/admin\/competitors\/3\/merge_preview\?target_id=4$/)
  expect(fetchMock.mock.calls[3][1]?.body).toBe(JSON.stringify({ target_id: 4, confirm: true, confirm_warnings: true }))
})
it('uses the review queue and both resolve contracts', async () => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }))
  await api.admin.getIdentityReviews()
  await api.admin.resolveIdentityReview(11, { academy_id: 2 })
  await api.admin.resolveIdentityReview(12, { create_new: true, confirm: true })
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/admin\/identity_reviews$/)
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/v1\/admin\/identity_reviews\/11\/resolve$/)
  expect(fetchMock.mock.calls[1][1]?.body).toBe('{"academy_id":2}')
  expect(fetchMock.mock.calls[2][1]?.body).toBe('{"create_new":true,"confirm":true}')
})
it.each([{ error: 'Cannot merge parent into child' }, { errors: ['Country is invalid', 'Name is required'] }])('surfaces API errors for %j', async body => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 422 }))
  await expect(api.admin.mergeAcademy(1, 2)).rejects.toThrow('error' in body ? body.error : JSON.stringify(body.errors))
})
it('refreshes auth on a 401 but surfaces an eventual authorization failure', async () => {
  const tokenGetter = vi.fn().mockResolvedValueOnce('expired').mockResolvedValueOnce('fresh')
  setAuthTokenGetter(tokenGetter)
  fetchMock.mockImplementation(async () => new Response('{"error":"Admin access required"}', { status: 401 }))
  await expect(api.admin.getIdentityReviews()).rejects.toThrow('Admin access required')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(tokenGetter).toHaveBeenLastCalledWith({ skipCache: true })
})
