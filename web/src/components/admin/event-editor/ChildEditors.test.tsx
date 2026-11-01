import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '../../../services/api'
import AccommodationsSection from './AccommodationsSection'
import EventGallerySection from './EventGallerySection'

vi.mock('../../ImageUpload', () => ({ default: () => <div>Image upload</div> }))
vi.mock('../../../contexts/GalleryUploadContext', async (original) => ({
  ...(await original<object>()),
  useGalleryUploads: () => ({ tasks: [], startUpload: vi.fn() }),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('keeps a hotel draft when discard is declined, validates it and clears dirty state after save', async () => {
  const onDirty = vi.fn()
  const onSaved = vi.fn().mockResolvedValue(undefined)
  vi.spyOn(api.admin, 'getAccommodations').mockResolvedValue({ accommodations: [] })
  vi.spyOn(api.admin, 'createAccommodation').mockResolvedValue(
    {} as Awaited<ReturnType<typeof api.admin.createAccommodation>>
  )
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<AccommodationsSection eventId={7} onDirtyChange={onDirty} onSaved={onSaved} />)
  await waitFor(() => expect(api.admin.getAccommodations).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  fireEvent.change(screen.getByLabelText('Hotel Name *'), { target: { value: 'Synthetic hotel' } })
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(window.confirm).toHaveBeenCalled()
  expect((screen.getByLabelText('Hotel Name *') as HTMLInputElement).value).toBe('Synthetic hotel')
  fireEvent.change(screen.getByLabelText('Check-in Date'), { target: { value: '2027-01-30' } })
  fireEvent.change(screen.getByLabelText('Check-out Date'), { target: { value: '2027-01-29' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Check-out must be on or after check-in.')
  expect(api.admin.createAccommodation).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Check-out Date'), { target: { value: '2027-01-31' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.admin.createAccommodation).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ hotel_name: 'Synthetic hotel', check_out_date: '2027-01-31' })
    )
  )
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false))
  expect(onSaved).toHaveBeenCalledOnce()
})

it('loads the extracted gallery and preserves an edited caption until explicitly discarded', async () => {
  const onDirty = vi.fn()
  vi.spyOn(api.admin, 'getEventGalleryImages').mockResolvedValue({
    gallery_images: [
      {
        id: 1,
        event_id: 7,
        title: 'Synthetic photo',
        caption: 'Original caption',
        alt_text: 'Athletes',
        category: 'Finals',
        sort_order: 0,
        active: true,
        status: 'ready',
        image_url: null,
        thumbnail_url: null,
        large_url: null,
        original_filename: null,
        content_type: null,
        byte_size: null,
        width: null,
        height: null,
        processed_at: null,
        processing_error: null,
      },
    ],
    total: 1,
    page: 1,
    per_page: 48,
    categories: [{ name: 'Finals', count: 1 }],
    uncategorized_count: 0,
  })
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<EventGallerySection eventId={7} eventName="Synthetic event" onDirtyChange={onDirty} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit photo details: Synthetic photo' }))
  fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'Updated caption' } })
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(window.confirm).toHaveBeenCalled()
  expect((screen.getByLabelText('Caption') as HTMLTextAreaElement).value).toBe('Updated caption')
})
