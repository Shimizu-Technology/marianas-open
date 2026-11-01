import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { officialRankingsApi } from './officialRankingsApi';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }));
});
afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset(); });
it('uses official public endpoints and the selected division, without legacy computed rankings', async () => {
  const controller = new AbortController();
  await officialRankingsApi.getLists(controller.signal);
  await officialRankingsApi.getDivisions(9, controller.signal);
  await officialRankingsApi.getEntries(9, 12, 2, controller.signal);
  await officialRankingsApi.getEntries(10, undefined);
  await officialRankingsApi.getStandings(71);
  expect(fetchMock.mock.calls.map(c => new URL(String(c[0])).pathname + new URL(String(c[0])).search)).toEqual([
    '/api/v1/rankings/lists', '/api/v1/rankings/lists/9/divisions', '/api/v1/rankings/lists/9/entries?page=2&per_page=50&division_id=12', '/api/v1/rankings/lists/10/entries?page=1&per_page=50', '/api/v1/rankings/standings?competitor_id=71',
  ]);
  expect(fetchMock.mock.calls[2][1]?.signal).toBe(controller.signal);
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
});
it('preserves decimal point strings without recalculating them', async () => {
  fetchMock.mockResolvedValueOnce(new Response('{"entries":[{"points":"5351.25"}]}', { status: 200 }));
  expect((await officialRankingsApi.getEntries(1, 2)).entries[0].points).toBe('5351.25');
});
