import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { fetchApi } from '../../services/api'
import HeldRankingSnapshots from './HeldRankingSnapshots'
vi.mock('../../services/api', () => ({ fetchApi: vi.fn() }))
const { translate } = vi.hoisted(() => ({ translate: (key: string) => key }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('keeps Previous reachable when approvals shrink the last page', async () => {
  const held = { id: 26, url: 'https://asjjf.org/ranking/teamRank/227', fetched_at: '2026-11-02T00:00:00Z', ranking_apply_status: 'rejected', ranking_apply_error: 'Row count decreased', counts: { rows: 1 } }
  vi.mocked(fetchApi).mockResolvedValueOnce({ snapshots: [], total: 26, per_page: 25 })
    .mockResolvedValueOnce({ snapshots: [held], total: 26, per_page: 25 })
    .mockResolvedValueOnce({ snapshots: [], total: 25, per_page: 25 })
    .mockResolvedValueOnce({ snapshots: [{ ...held, id: 1 }], total: 25, per_page: 25 })
  render(<HeldRankingSnapshots isAdmin={false} />)
  fireEvent.click(await screen.findByRole('button', { name: 'officialRankings.next' }))
  await screen.findByRole('link', { name: /#26/ })
  fireEvent.click(screen.getByRole('button', { name: 'rankingAdmin.refresh' }))
  await waitFor(() => expect(screen.queryByRole('link', { name: /#26/ })).toBeNull())
  expect(screen.getByRole('button', { name: 'officialRankings.previous' })).toHaveProperty('disabled', false)
  fireEvent.click(screen.getByRole('button', { name: 'officialRankings.previous' }))
  await screen.findByRole('link', { name: /#1/ })
  expect(fetchApi).toHaveBeenLastCalledWith('/api/v1/admin/asjjf/ranking_holds?page=1', {}, true)
})
