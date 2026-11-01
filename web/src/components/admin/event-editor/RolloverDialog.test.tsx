import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../../services/api'
import RolloverDialog from './RolloverDialog'
import { eventEditorFixture } from './eventEditorFixtures'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function () {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function () {
      this.open = false
    },
  })
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (this: HTMLDialogElement) {
    this.open = false
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const source = eventEditorFixture({ season_year: null, date: '2026-10-24' })
const second = eventEditorFixture({ id: 8, name: 'Marianas Pro Tokyo', season_year: 2026 })

it('copies one event with an optional official info ID and preserves choices after failure', async () => {
  const onComplete = vi.fn()
  vi.spyOn(api.admin, 'cloneEvent')
    .mockRejectedValueOnce(new Error('Year already exists'))
    .mockResolvedValueOnce({
      event: eventEditorFixture({ id: 90 }),
      message: 'Draft created. Snapshot unavailable; fetch queued.',
    })
  render(<RolloverDialog events={[source, second]} initialEventId={7} onClose={vi.fn()} onComplete={onComplete} />)
  fireEvent.change(screen.getByLabelText('Target season year'), { target: { value: '2027' } })
  fireEvent.click(screen.getByLabelText('Keep taglines'))
  fireEvent.change(screen.getByLabelText(/New ASJJF info ID/), { target: { value: '2200' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create draft copies' }))
  await screen.findByText('Year already exists')
  expect((screen.getByLabelText('Target season year') as HTMLInputElement).value).toBe('2027')
  expect(api.admin.cloneEvent).toHaveBeenCalledWith(7, { target_year: 2027, keep_tagline: true, asjjf_event_id: 2200 })
  fireEvent.click(screen.getByRole('button', { name: 'Create draft copies' }))
  await waitFor(() =>
    expect(onComplete).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 90 })],
      'Draft created. Snapshot unavailable; fetch queued.'
    )
  )
})

it('rolls over a season using date-year fallback and sends only supplied source ID mappings', async () => {
  vi.spyOn(api.admin, 'rolloverEvents').mockResolvedValue({ events: [], message: 'Drafts prepared' })
  render(
    <RolloverDialog
      events={[source, second, eventEditorFixture({ id: 9, season_year: 2025 })]}
      onClose={vi.fn()}
      onComplete={vi.fn()}
    />
  )
  expect(screen.getByText('2 events will be copied as drafts.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Target season year'), { target: { value: '2027' } })
  fireEvent.change(screen.getByLabelText(/New ASJJF info ID — Marianas Pro Tokyo/), { target: { value: '2201' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create draft copies' }))
  await waitFor(() =>
    expect(api.admin.rolloverEvents).toHaveBeenCalledWith({
      source_year: 2026,
      target_year: 2027,
      keep_tagline: false,
      asjjf_event_ids: { 8: 2201 },
    })
  )
})

it('rejects an invalid target year and nonnumeric ASJJF IDs before requesting a copy', async () => {
  vi.spyOn(api.admin, 'cloneEvent')
  render(<RolloverDialog events={[source]} initialEventId={7} onClose={vi.fn()} onComplete={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Target season year'), { target: { value: '2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create draft copies' }))
  await screen.findByText(/Choose a target year after/)
  fireEvent.change(screen.getByLabelText('Target season year'), { target: { value: '2027' } })
  fireEvent.change(screen.getByLabelText(/New ASJJF info ID/), { target: { value: '22x' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create draft copies' }))
  await screen.findByText(/ASJJF IDs must be positive/)
  expect(api.admin.cloneEvent).not.toHaveBeenCalled()
})
