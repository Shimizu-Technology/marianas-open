import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { fetchApi } from '../../services/api'
import RankingSnapshotReview from './RankingSnapshotReview'
vi.mock('../../services/api', () => ({ fetchApi: vi.fn() }))
const { translate } = vi.hoisted(() => ({ translate: (key: string) => key }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('requires source verification before queuing a reviewed count reduction', async () => {
  vi.mocked(fetchApi).mockResolvedValue({ queued: true })
  render(<RankingSnapshotReview id={4} status="rejected" error="Row count decreased from 158 to 157" isAdmin />)
  expect(screen.getByRole('button')).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText('rankingAdmin.queued')
  expect(fetchApi).toHaveBeenCalledWith('/api/v1/admin/asjjf/snapshots/4/apply_ranking', { method: 'POST', body: '{"confirm":true}' }, true)
})
it('does not offer overrides to staff or for malformed source identities', () => {
  const view = render(<RankingSnapshotReview id={4} status="rejected" error="Row count decreased" isAdmin={false} />)
  expect(screen.queryByRole('button')).toBeNull()
  view.rerender(<RankingSnapshotReview id={4} status="rejected" error="Wrong season" isAdmin />)
  expect(screen.queryByRole('button')).toBeNull()
})
