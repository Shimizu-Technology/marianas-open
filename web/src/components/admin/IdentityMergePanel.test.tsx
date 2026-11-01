import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import type { IdentityMergePreview } from '../../services/api'
import IdentityMergePanel from './IdentityMergePanel'
import { academyFixture, competitorFixture, listResponse } from './identityFixtures'

const preview: IdentityMergePreview = {
  source: { id: 1, name: 'Source Gym' }, target: { id: 2, name: 'Target Gym' },
  results_count: 7, athletes_count: 3, warnings: [],
}
beforeEach(() => {
  vi.spyOn(api.admin, 'getAcademies').mockResolvedValue({ academies: [academyFixture()], ...listResponse })
  vi.spyOn(api.admin, 'getCompetitors').mockResolvedValue({ competitors: [competitorFixture()], ...listResponse })
  vi.spyOn(api.admin, 'previewAcademyMerge').mockResolvedValue(preview)
  vi.spyOn(api.admin, 'mergeAcademy').mockResolvedValue({ academy: academyFixture() })
  vi.spyOn(api.admin, 'previewCompetitorMerge').mockResolvedValue({ ...preview, athletes_count: undefined, blocked: false })
  vi.spyOn(api.admin, 'mergeCompetitor').mockResolvedValue({ competitor: competitorFixture() })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const disabled = (name: string) => (screen.getByRole('button', { name }) as HTMLButtonElement).disabled
const chooseTarget = async (name = 'Target Gym') => {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`${name} \\(ID 2\\)`) }))
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  await screen.findByText(/will move to the kept record/)
}

it('requires a preview and count confirmation, then merges in the selected direction', async () => {
  const onMerged = vi.fn()
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source Gym' }} onMerged={onMerged} />)
  expect(screen.queryByRole('button', { name: 'Permanently merge records' })).toBeNull()
  await chooseTarget()
  expect(api.admin.previewAcademyMerge).toHaveBeenCalledWith(1, 2)
  expect(screen.getByText('3 athletes')).toBeTruthy()
  expect(disabled('Permanently merge records')).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /Permanently merge Source Gym into Target Gym, moving 7 results and 3 athletes/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Permanently merge records' }))
  await waitFor(() => expect(onMerged).toHaveBeenCalledWith({ id: 2, name: 'Target Gym' }))
  expect(api.admin.mergeAcademy).toHaveBeenCalledWith(1, 2)
})
it('requires a separate acknowledgement of competitor warnings', async () => {
  vi.mocked(api.admin.previewCompetitorMerge).mockResolvedValue({ ...preview, warnings: ['Conflicting age divisions'], athletes_count: undefined })
  render(<IdentityMergePanel kind="competitors" source={{ id: 1, name: 'Source Athlete' }} onMerged={vi.fn()} />)
  await chooseTarget('Target Athlete')
  expect(screen.getByText('Conflicting age divisions')).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: /Permanently merge/ }))
  expect(disabled('Permanently merge records')).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed every warning/ }))
  expect(disabled('Permanently merge records')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Permanently merge records' }))
  await waitFor(() => expect(api.admin.mergeCompetitor).toHaveBeenCalledWith(1, 2))
})
it('never offers confirmation for a blocked competitor merge', async () => {
  vi.mocked(api.admin.previewCompetitorMerge).mockResolvedValue({ ...preview, blocked: true, warnings: ['Incompatible identities'] })
  render(<IdentityMergePanel kind="competitors" source={{ id: 1, name: 'Source' }} onMerged={vi.fn()} />)
  await chooseTarget('Target Athlete')
  expect(screen.getByRole('alert').textContent).toContain('blocked')
  expect(screen.queryByRole('button', { name: 'Permanently merge records' })).toBeNull()
  expect(api.admin.mergeCompetitor).not.toHaveBeenCalled()
})
it('preserves selection on a preview error and supports retry', async () => {
  vi.mocked(api.admin.previewAcademyMerge).mockRejectedValueOnce(new Error('Not authorized'))
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source' }} onMerged={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: /Target Gym \(ID 2\)/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Not authorized')
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  await screen.findByText(/will move to the kept record/)
  expect(disabled('Permanently merge records')).toBe(true)
})
it('invalidates the preview after a merge error to avoid a blind retry', async () => {
  vi.mocked(api.admin.mergeAcademy).mockRejectedValueOnce(new Error('Connection interrupted'))
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source' }} onMerged={vi.fn()} />)
  await chooseTarget()
  fireEvent.click(screen.getByRole('checkbox', { name: /Permanently merge/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Permanently merge records' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Reload the preview')
  expect(screen.queryByRole('button', { name: 'Permanently merge records' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  await screen.findByText(/will move to the kept record/)
  expect(disabled('Permanently merge records')).toBe(true)
})
it('clears the preview and confirmations when a target is changed', async () => {
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source' }} onMerged={vi.fn()} />)
  await chooseTarget()
  fireEvent.click(screen.getByRole('checkbox', { name: /Permanently merge/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Change selection' }))
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Preview merge' })).toBeNull()
  await chooseTarget()
  expect(disabled('Permanently merge records')).toBe(true)
})
it('rejects a preview for mismatched record IDs', async () => {
  vi.mocked(api.admin.previewAcademyMerge).mockResolvedValue({ ...preview, target: { id: 999, name: 'Wrong Gym' } })
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source' }} onMerged={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: /Target Gym \(ID 2\)/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  expect((await screen.findByRole('alert')).textContent).toContain('did not match')
  expect(screen.queryByRole('checkbox')).toBeNull()
})
it('locks selection and repeated submission while the merge is pending', async () => {
  let finish!: (value: { academy: ReturnType<typeof academyFixture> }) => void
  vi.mocked(api.admin.mergeAcademy).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const onMerged = vi.fn()
  const onBusyChange = vi.fn()
  render(<IdentityMergePanel kind="academies" source={{ id: 1, name: 'Source' }} onMerged={onMerged} onBusyChange={onBusyChange} />)
  await chooseTarget()
  fireEvent.click(screen.getByRole('checkbox', { name: /Permanently merge/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Permanently merge records' }))
  const pendingButton = screen.getByRole('button', { name: 'Merging…' })
  expect((pendingButton as HTMLButtonElement).disabled).toBe(true)
  expect(disabled('Change selection')).toBe(true)
  fireEvent.click(pendingButton)
  expect(api.admin.mergeAcademy).toHaveBeenCalledOnce()
  expect(onBusyChange).toHaveBeenLastCalledWith(true)
  finish({ academy: academyFixture() })
  await waitFor(() => expect(onMerged).toHaveBeenCalledOnce())
  expect(onBusyChange).toHaveBeenLastCalledWith(false)
})
