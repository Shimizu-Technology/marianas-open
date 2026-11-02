import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PhotoUpload from './PhotoUpload'
import { AdminAccessContext } from '../../../contexts/AdminAccessContext'
import { eventEditorFixture } from '../event-editor/eventEditorFixtures'

vi.mock('../../../contexts/GalleryUploadContext', () => ({ GALLERY_IMAGE_ACCEPT: 'image/*', isSupportedGalleryImage: () => true, useGalleryUploads: () => ({ startUpload: vi.fn() }) }))
vi.mock('./ZipIntake', () => ({ default: () => <div>ZIP intake</div> }))
afterEach(cleanup)
it('keeps review settings and uploads disabled for viewers', () => {
  const mutate = vi.fn()
  render(<AdminAccessContext.Provider value={{ readOnly: true }}><PhotoUpload event={eventEditorFixture()} albums={[]} settings={{ timezone: 'Pacific/Guam', hold_flagged: false }} selectedAlbum="" imports={[]} busy={false} refresh={() => {}} mutate={mutate} /></AdminAccessContext.Provider>)
  fireEvent.click(screen.getByText('Review and date settings'))
  const hold = screen.getByRole('checkbox', { name: /Hold flagged photos until approved/ }) as HTMLInputElement
  expect(hold.disabled).toBe(true)
  fireEvent.click(hold)
  expect(mutate).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Choose photos') as HTMLInputElement).disabled).toBe(true)
})
