import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import AsjjfIntakePanel from './AsjjfIntakePanel'

beforeEach(() => {
  vi.spyOn(api.admin, 'checkAsjjf').mockResolvedValue({ queued_count: 2 })
  vi.spyOn(api.admin, 'uploadAsjjfSnapshot').mockResolvedValue({ snapshot_id: 42, parse_status: 'pending' })
})
afterEach(cleanup)

function mount(onSnapshotSaved?: () => void) {
  return render(<MemoryRouter><AsjjfIntakePanel eventId={7} onSnapshotSaved={onSnapshotSaved} /></MemoryRouter>)
}

function fillUpload(file = new File(['<html>Results</html>'], 'results.html', { type: 'text/html' })) {
  fireEvent.click(screen.getByText('Upload saved ASJJF page'))
  fireEvent.change(screen.getByLabelText('Page type'), { target: { value: 'event_results' } })
  fireEvent.change(screen.getByLabelText('Original ASJJF URL'), { target: { value: 'https://asjjf.org/main/eventResults/7' } })
  fireEvent.change(screen.getByLabelText('Saved HTML file'), { target: { files: [file] } })
  return file
}

it('queues only an intake check and explains overnight fetching and published results', async () => {
  const importSpy = vi.spyOn(api.admin, 'importResults')
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Check ASJJF now' }))
  expect(await screen.findByText('Queued for the next nightly fetch at 02:30 ChST. This does not fetch ASJJF immediately.')).toBeTruthy()
  expect(api.admin.checkAsjjf).toHaveBeenCalledWith(7)
  expect(screen.getByText(/Complete snapshots sync published results automatically/)).toBeTruthy()
  expect(importSpy).not.toHaveBeenCalled()
})

it('does not claim to queue pages when the API returns zero', async () => {
  vi.mocked(api.admin.checkAsjjf).mockResolvedValue({ queued_count: 0 })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Check ASJJF now' }))
  expect(await screen.findByText(/No new pages queued/)).toBeTruthy()
})

it('allows retry after a failed check', async () => {
  vi.mocked(api.admin.checkAsjjf).mockRejectedValueOnce(new Error('Check unavailable'))
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Check ASJJF now' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Check unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Check ASJJF now' }))
  expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Queued for the next nightly fetch'))
  expect(screen.queryByRole('alert')).toBeNull()
})

it('uploads the exact multipart fields and reports asynchronous parsing', async () => {
  const onSnapshotSaved = vi.fn()
  mount(onSnapshotSaved)
  const file = fillUpload()
  // jsdom does not copy synthetic FileList changes into FormData; model native form serialization.
  const NativeFormData = globalThis.FormData
  vi.spyOn(globalThis, 'FormData').mockImplementation(function (form?: HTMLFormElement) {
    const data = new NativeFormData(form)
    data.set('file', file)
    return data
  })
  fireEvent.submit(screen.getByRole('button', { name: 'Upload saved page' }).closest('form')!)
  expect(await screen.findByText(/Snapshot #42 saved. Parse status: pending/)).toBeTruthy()
  const sent = vi.mocked(api.admin.uploadAsjjfSnapshot).mock.calls[0][0]
  expect([...sent.keys()].sort()).toEqual(['file', 'page_type', 'url'])
  expect(sent.get('file')).toBe(file)
  expect(sent.get('page_type')).toBe('event_results')
  expect(sent.get('url')).toBe('https://asjjf.org/main/eventResults/7')
  expect(onSnapshotSaved).toHaveBeenCalledTimes(1)
})

it('rejects files that are not saved HTML before sending', async () => {
  mount()
  fillUpload(new File(['bad'], 'results.txt', { type: 'text/plain' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Upload saved page' }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Choose a saved .html page with content.')
  expect(api.admin.uploadAsjjfSnapshot).not.toHaveBeenCalled()
})

it('preserves upload fields when the upload fails', async () => {
  vi.mocked(api.admin.uploadAsjjfSnapshot).mockRejectedValue(new Error('Upload unavailable'))
  mount()
  const file = fillUpload()
  const data = new FormData()
  data.set('file', file)
  vi.spyOn(globalThis, 'FormData').mockImplementation(function () { return data })
  fireEvent.submit(screen.getByRole('button', { name: 'Upload saved page' }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Upload unavailable')
  expect(screen.getByLabelText('Original ASJJF URL')).toHaveProperty('value', 'https://asjjf.org/main/eventResults/7')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Upload saved page' })).toHaveProperty('disabled', false))
})
