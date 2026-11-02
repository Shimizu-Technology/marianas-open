import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ImageUpload from './ImageUpload'
import { AdminAccessContext } from '../contexts/AdminAccessContext'

afterEach(cleanup)
it('prevents viewer file-selection and drop uploads across shared admin image pickers', () => {
  const upload = vi.fn()
  const { container } = render(<AdminAccessContext.Provider value={{ readOnly: true }}><ImageUpload currentUrl={null} onUpload={upload} /></AdminAccessContext.Provider>)
  const input = container.querySelector('input')!
  expect(input.disabled).toBe(true)
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.drop(container.querySelector('[aria-disabled="true"]')!, { dataTransfer: { files: [file] } })
  expect(upload).not.toHaveBeenCalled()
  expect(screen.getByText('Viewer access: image uploads are disabled')).toBeTruthy()
})
