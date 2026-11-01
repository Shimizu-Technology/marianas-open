import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../../services/api'
import EventsAdmin from './EventsAdmin'
import { eventEditorFixture } from '../../components/admin/event-editor/eventEditorFixtures'

vi.mock('../../components/admin/event-editor/EventGallerySection', () => ({
  default: () => <div>Gallery fixture</div>,
}))
vi.mock('../../components/admin/event-editor/AccommodationsSection', () => ({
  default: () => <div>Hotels fixture</div>,
}))
let saved = eventEditorFixture()
beforeEach(() => {
  saved = eventEditorFixture()
  vi.spyOn(api.admin, 'getEvents').mockImplementation(async () => ({ events: [saved] }))
  vi.spyOn(api, 'getCurrentUser').mockResolvedValue({ user: { role: 'staff' } } as Awaited<
    ReturnType<typeof api.getCurrentUser>
  >)
  vi.spyOn(api.admin, 'updateEvent').mockImplementation(async (_id, data) => ({
    event: (saved = { ...saved, ...data } as typeof saved),
  }))
  vi.spyOn(api.admin, 'uploadEventImage').mockResolvedValue({ event: saved })
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
async function editor() {
  render(
    <MemoryRouter initialEntries={['/admin/events?edit=7']}>
      <EventsAdmin />
    </MemoryRouter>
  )
  await screen.findByRole('textbox', { name: 'Name' })
}
const section = (name: string) =>
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Event sections' })).getByRole('button', { name }))

it('navigates all ten sections while keeping unsaved values and guarding close and links', async () => {
  await editor()
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Reviewed Copa' } })
  expect(screen.getByText('Unsaved event changes')).toBeTruthy()
  for (const title of [
    'Dates & Registration',
    'Venue & Travel',
    'Tickets',
    'Schedule',
    'Prizes',
    'Hotels & Offers',
    'Gallery',
    'Results',
    'Publishing',
    'Basics',
  ]) {
    section(title)
    expect(screen.getByRole('region', { name: title })).toBeTruthy()
  }
  expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Reviewed Copa')
  fireEvent.click(screen.getByRole('button', { name: 'Close event editor' }))
  expect(window.confirm).toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Manage Results' }))
  expect(window.confirm).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy()
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(true)
}, 20000)

it('preserves a dirty form when an immediate image upload refreshes the event list', async () => {
  await editor()
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Keep my draft' } })
  const upload = screen.getByRole('button', { name: 'Upload Image' }).parentElement?.querySelector('input[type=file]')
  fireEvent.change(upload!, { target: { files: [new File(['image'], 'hero.jpg', { type: 'image/jpeg' })] } })
  await waitFor(() => expect(api.admin.getEvents).toHaveBeenCalledTimes(2))
  expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Keep my draft')
  expect(screen.getByText('Unsaved event changes')).toBeTruthy()
})

it('validates the appropriate section and keeps normal saves at the saved status with blank stars as null', async () => {
  await editor()
  section('Dates & Registration')
  fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-01-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('End date must be on or after the event date.')).toBeTruthy()
  expect(api.admin.updateEvent).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2027-01-31' } })
  section('Basics')
  fireEvent.change(screen.getByRole('spinbutton', { name: 'ASJJF Stars' }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.admin.updateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ asjjf_stars: null, status: 'draft', end_date: '2027-01-31' })
    )
  )
  await screen.findByText('Event updated')
  expect(screen.getByText('Event changes saved')).toBeTruthy()
})

it('defaults existing confirmations to true and creates unconfirmed schedule and prize rows', async () => {
  await editor()
  section('Schedule')
  expect((screen.getByRole('checkbox', { name: 'Confirmed' }) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Add Schedule Item' }))
  expect((screen.getAllByRole('checkbox', { name: 'Confirmed' })[1] as HTMLInputElement).checked).toBe(false)
  section('Prizes')
  fireEvent.click(screen.getByRole('button', { name: 'Add Prize Category' }))
  expect((screen.getAllByRole('checkbox', { name: 'Confirmed' })[1] as HTMLInputElement).checked).toBe(false)
})

it('routes a readiness fix to its section and prevents publishing dirty content', async () => {
  await editor()
  section('Publishing')
  expect((screen.getByRole('button', { name: 'Publish event' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Fix Confirm schedule' }))
  expect(screen.getByRole('region', { name: 'Schedule' })).toBeTruthy()
  section('Basics')
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Dirty' } })
  section('Publishing')
  expect(screen.getByText(/Save event changes and any open/)).toBeTruthy()
  expect(screen.queryByRole('checkbox', { name: 'Admin override' })).toBeNull()
})

it('locks public slugs and preserves public status on a normal save', async () => {
  saved = eventEditorFixture({ status: 'upcoming' })
  await editor()
  expect((screen.getByRole('textbox', { name: 'Slug' }) as HTMLInputElement).disabled).toBe(true)
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Updated public event' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.admin.updateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ status: 'upcoming' }))
  )
})

it('tracks result-ID typing immediately and rejects malformed IDs without losing the input', async () => {
  await editor()
  section('Results')
  fireEvent.change(screen.getByLabelText('ASJJF Event IDs (for results import)'), { target: { value: '2200, typo' } })
  expect(screen.getByText('Unsaved event changes')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Enter positive ASJJF IDs separated by commas.')
  expect(api.admin.updateEvent).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('ASJJF Event IDs (for results import)'), { target: { value: '2200, 2201' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.admin.updateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ asjjf_event_ids: [2200, 2201] }))
  )
})

it('preserves a failed save for retry', async () => {
  await editor()
  vi.mocked(api.admin.updateEvent).mockRejectedValueOnce(new Error('Session expired'))
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Keep after failure' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Session expired')
  expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Keep after failure')
  expect(screen.getByText('Unsaved event changes')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Event updated')
})

it('records an affirmative review of copied season content before saving', async () => {
  await editor()
  section('Publishing')
  const reviewed = screen.getByRole('checkbox', { name: 'I reviewed copied content for this season' })
  expect((reviewed as HTMLInputElement).checked).toBe(false)
  fireEvent.click(reviewed)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.admin.updateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ content_review_required: false, status: 'draft' })
    )
  )
})

it('blocks editing a saved record when loading fails and recovers through retry', async () => {
  vi.mocked(api.admin.getEvents).mockRejectedValueOnce(new Error('Session expired'))
  render(
    <MemoryRouter initialEntries={['/admin/events?edit=7']}>
      <EventsAdmin />
    </MemoryRouter>
  )
  await screen.findByText('Session expired')
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading events' }))
  await screen.findByRole('textbox', { name: 'Name' })
  expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe(saved.name)
})

it('renders a copied null prize amount as blank while keeping its confirmation false', async () => {
  saved = eventEditorFixture({ prize_categories: [{ id: 13, name: 'Adult black belt', amount: null, confirmed: false, sort_order: 0 }] })
  await editor()
  section('Prizes')
  expect((screen.getByRole('textbox', { name: 'Amount (0 if non-cash)' }) as HTMLInputElement).value).toBe('')
  expect((screen.getByRole('checkbox', { name: 'Confirmed' }) as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(api.admin.updateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ prize_categories_attributes: [expect.objectContaining({ amount: '', confirmed: false })] })))
})
