import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import IdentityRecordPicker from './IdentityRecordPicker'
import { academyFixture, listResponse } from './identityFixtures'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('searches server records outside the current table page and excludes self', async () => {
  vi.spyOn(api.admin, 'getAcademies').mockResolvedValue({ academies: [academyFixture(1, 'Source'), academyFixture(900, 'Remote Gym')], ...listResponse, total: 45 })
  const onChange = vi.fn()
  render(<IdentityRecordPicker kind="academies" label="Target" excludeId={1} value={null} onChange={onChange} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Remote' } })
  fireEvent.click(await screen.findByRole('button', { name: /Remote Gym \(ID 900\)/ }))
  expect(api.admin.getAcademies).toHaveBeenCalledWith(expect.objectContaining({ search: 'Remote', per_page: '20' }))
  expect(screen.queryByRole('button', { name: /Source/ })).toBeNull()
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 900, name: 'Remote Gym' }))
  expect(screen.getByText(/Refine the search/)).toBeTruthy()
})
it('ignores late responses for an earlier search', async () => {
  let resolveOld!: (value: Awaited<ReturnType<typeof api.admin.getAcademies>>) => void
  const oldResponse = new Promise<Awaited<ReturnType<typeof api.admin.getAcademies>>>(resolve => { resolveOld = resolve })
  vi.spyOn(api.admin, 'getAcademies').mockReturnValueOnce(oldResponse).mockResolvedValue({ academies: [academyFixture(3, 'New Match')], ...listResponse })
  render(<IdentityRecordPicker kind="academies" label="Target" value={null} onChange={vi.fn()} />)
  await waitFor(() => expect(api.admin.getAcademies).toHaveBeenCalledOnce())
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'New' } })
  await screen.findByRole('button', { name: /New Match/ })
  resolveOld({ academies: [academyFixture(2, 'Old Match')], ...listResponse })
  await waitFor(() => expect(screen.queryByRole('button', { name: /Old Match/ })).toBeNull())
  expect(screen.getByRole('button', { name: /New Match/ })).toBeTruthy()
})
it('recovers from search failures without losing the query', async () => {
  vi.spyOn(api.admin, 'getAcademies').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ academies: [], ...listResponse, total: 0 })
  render(<IdentityRecordPicker kind="academies" label="Target" value={null} onChange={vi.fn()} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Missing' } })
  expect((await screen.findByRole('alert')).textContent).toContain('Offline')
  fireEvent.click(screen.getByRole('button', { name: 'Retry search' }))
  await screen.findByText('No matches. Try another spelling.')
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Missing')
})
