import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../../services/api'
import PublishingSection from './PublishingSection'
import { eventEditorFixture } from './eventEditorFixtures'

beforeEach(() => {
  vi.spyOn(api, 'getCurrentUser').mockResolvedValue({ user: { role: 'admin' } } as Awaited<
    ReturnType<typeof api.getCurrentUser>
  >)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('requires a meaningful admin reason, sends it, and displays audit history', async () => {
  const onUpdate = vi.fn()
  vi.spyOn(api.admin, 'publishEvent')
    .mockRejectedValueOnce(new Error('Permission denied'))
    .mockResolvedValueOnce({ event: eventEditorFixture({ status: 'upcoming' }) })
  render(
    <PublishingSection
      event={eventEditorFixture({
        audit_entries: [
          {
            id: 1,
            action: 'published',
            actor_name: 'Demo admin',
            from_status: 'draft',
            to_status: 'upcoming',
            reason: 'Organizer approved pending photo',
            metadata: {},
            created_at: '2026-11-02T00:00:00Z',
          },
        ],
      })}
      dirty={false}
      onSelect={vi.fn()}
      onUpdate={onUpdate}
    />
  )
  expect(screen.getByText('Reason: Organizer approved pending photo')).toBeTruthy()
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Admin override' }))
  fireEvent.change(screen.getByLabelText(/Override reason/), { target: { value: 'short' } })
  expect((screen.getByRole('button', { name: 'Publish event' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText(/Override reason/), { target: { value: 'Organizer verified this event.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Publish event' }))
  await screen.findByText('Permission denied')
  expect((screen.getByLabelText(/Override reason/) as HTMLInputElement).value).toBe('Organizer verified this event.')
  fireEvent.click(screen.getByRole('button', { name: 'Publish event' }))
  await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  expect(api.admin.publishEvent).toHaveBeenCalledWith(7, {
    status: 'upcoming',
    override_reason: 'Organizer verified this event.',
  })
})

it('publishes a ready saved draft and unpublishes an existing event', async () => {
  const onUpdate = vi.fn()
  vi.spyOn(api.admin, 'publishEvent').mockResolvedValue({ event: eventEditorFixture({ status: 'upcoming' }) })
  vi.spyOn(api.admin, 'unpublishEvent').mockResolvedValue({ event: eventEditorFixture() })
  const { rerender } = render(
    <PublishingSection
      event={eventEditorFixture({ readiness: { publishable: true, completed: 0, total: 0, checks: [] } })}
      dirty={false}
      onSelect={vi.fn()}
      onUpdate={onUpdate}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Publish event' }))
  await waitFor(() => expect(api.admin.publishEvent).toHaveBeenCalledWith(7, { status: 'upcoming' }))
  rerender(
    <PublishingSection
      event={eventEditorFixture({ status: 'upcoming' })}
      dirty={false}
      onSelect={vi.fn()}
      onUpdate={onUpdate}
    />
  )
  expect(screen.queryByRole('button', { name: 'Fill from ASJJF' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Verify against ASJJF' })).toBeTruthy()
  expect(screen.getByText(/Nothing on the public page changes/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Unpublish to draft' }))
  await waitFor(() => expect(api.admin.unpublishEvent).toHaveBeenCalledWith(7))
})

it('treats unavailable snapshots as a successful queued fill and reports server messages', async () => {
  const onUpdate = vi.fn()
  const event = eventEditorFixture({ asjjf_info_status: 'pending' })
  vi.spyOn(api.admin, 'fillEventFromAsjjf').mockResolvedValue({
    event,
    message: 'Snapshot unavailable; fetch queued.',
  })
  render(<PublishingSection event={event} dirty={false} onSelect={vi.fn()} onUpdate={onUpdate} />)
  fireEvent.change(screen.getByLabelText('ASJJF info ID'), { target: { value: '2202' } })
  fireEvent.click(screen.getByRole('button', { name: 'Fill from ASJJF' }))
  await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(event, 'Snapshot unavailable; fetch queued.'))
})

it('starts with the saved public status and reports action locks to the containing editor', async () => {
  const busy = vi.fn()
  let resolve!: (result: Awaited<ReturnType<typeof api.admin.publishEvent>>) => void
  vi.spyOn(api.admin, 'publishEvent').mockImplementation(
    () =>
      new Promise((result) => {
        resolve = result
      })
  )
  const event = eventEditorFixture({
    status: 'live',
    readiness: { publishable: true, completed: 0, total: 0, checks: [] },
  })
  render(<PublishingSection event={event} dirty={false} onSelect={vi.fn()} onUpdate={vi.fn()} onBusyChange={busy} />)
  expect((screen.getByRole('combobox', { name: 'Public status' }) as HTMLSelectElement).value).toBe('live')
  fireEvent.click(screen.getByRole('button', { name: 'Update public status' }))
  expect(busy).toHaveBeenLastCalledWith(true)
  resolve({ event })
  await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false))
})

it('verifies a published event against ASJJF without replacing its wording', async () => {
  const onUpdate = vi.fn()
  const event = eventEditorFixture({ status: 'upcoming', asjjf_info_id: null, asjjf_event_ids: [2258, 2259] })
  const verified = { ...event, asjjf_info_status: 'verified' }
  vi.spyOn(api.admin, 'verifyEventAgainstAsjjf').mockResolvedValue({ event: verified, message: 'Linked.' })
  render(<PublishingSection event={event} dirty={false} onSelect={vi.fn()} onUpdate={onUpdate} />)
  expect((screen.getByLabelText('ASJJF info ID') as HTMLInputElement).value).toBe('2258')
  fireEvent.click(screen.getByRole('button', { name: 'Verify against ASJJF' }))
  await waitFor(() => expect(api.admin.verifyEventAgainstAsjjf).toHaveBeenCalledWith(event.id, 2258))
  expect(onUpdate).toHaveBeenCalledWith(verified, 'Linked.')
})
