import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fetchApi } from '../../services/api'
import RankingSeasonSettings from './RankingSeasonSettings'

vi.mock('../../services/api', () => ({ fetchApi: vi.fn() }))
const { translate } = vi.hoisted(() => ({ translate: (key: string) => key }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
const season = { season_year: 2026, gi_ranking_id: 227, nogi_ranking_id: 234, team_ranking_id: 227, team_nogi_ranking_id: null, current: true }
const fixture = { seasons: [season], suggestions: [{ id: 1, season_year: 2027, asjjf_ranking_id: 300, discipline: 'gi', kind: 'individual', title: 'Marianas Pro Ranking 2027', source_url: 'https://asjjf.org/ranking/individualRanking/300' }] }
beforeEach(() => { vi.mocked(fetchApi).mockReset().mockResolvedValue(fixture) })
afterEach(cleanup)

it('fills a suggestion without saving or switching current season until explicit confirmation', async () => {
  render(<RankingSeasonSettings isAdmin />)
  fireEvent.click(await screen.findByRole('button', { name: 'rankingAdmin.useSuggestion' }))
  expect(screen.getByLabelText('rankingAdmin.season')).toHaveProperty('value', '2027')
  expect(screen.getByLabelText('rankingAdmin.gi_ranking_id')).toHaveProperty('value', '300')
  expect(screen.getByRole('checkbox')).toHaveProperty('checked', false)
  expect(fetchApi).toHaveBeenCalledTimes(1)
  vi.mocked(fetchApi).mockResolvedValueOnce({ season: { ...season, season_year: 2027, gi_ranking_id: 300 } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'rankingAdmin.save' }))
  await screen.findByText('rankingAdmin.saved')
  expect(fetchApi).toHaveBeenLastCalledWith('/api/v1/admin/asjjf/ranking_seasons/2027', expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"current":true') }), true)
})

it('shows a staff user read-only configuration', async () => {
  render(<RankingSeasonSettings isAdmin={false} />)
  await screen.findByText('rankingAdmin.adminOnly')
  expect(screen.queryByRole('button', { name: 'rankingAdmin.save' })).toBeNull()
  expect(screen.getByLabelText('rankingAdmin.gi_ranking_id')).toHaveProperty('disabled', true)
  expect(screen.queryByRole('button', { name: 'rankingAdmin.useSuggestion' })).toBeNull()
})

it('retains edits and allows retry after save failure', async () => {
  render(<RankingSeasonSettings isAdmin />)
  await screen.findByRole('button', { name: 'rankingAdmin.save' })
  fireEvent.change(screen.getByLabelText('rankingAdmin.gi_ranking_id'), { target: { value: '301' } })
  vi.mocked(fetchApi).mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(screen.getByRole('button', { name: 'rankingAdmin.save' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText('rankingAdmin.gi_ranking_id')).toHaveProperty('value', '301')
  await waitFor(() => expect(screen.getByRole('button', { name: 'rankingAdmin.save' })).toHaveProperty('disabled', false))
})
