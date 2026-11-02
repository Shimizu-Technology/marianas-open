import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminAccessContext } from '../../contexts/AdminAccessContext'
import { AdminWriteButton, AdminWriteForm, AdminWriteInput } from './AdminWriteControls'

afterEach(cleanup)
it('disables viewer write actions and upload inputs and blocks keyboard form submission', () => {
  const save = vi.fn((event: React.FormEvent) => event.preventDefault())
  render(<AdminAccessContext.Provider value={{ readOnly: true }}><AdminWriteForm aria-label="Edit content" onSubmit={save}><AdminWriteButton>Save</AdminWriteButton><AdminWriteInput aria-label="Upload photo" type="file" /></AdminWriteForm><button>Refresh list</button><input aria-label="Search" /></AdminAccessContext.Provider>)
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText('Upload photo') as HTMLInputElement).disabled).toBe(true)
  fireEvent.submit(screen.getByRole('form'))
  expect(save).not.toHaveBeenCalled()
  expect((screen.getByRole('button', { name: 'Refresh list' }) as HTMLButtonElement).disabled).toBe(false)
  expect((screen.getByLabelText('Search') as HTMLInputElement).disabled).toBe(false)
})
it('preserves staff writes and pre-existing disabled controls', () => {
  const save = vi.fn((event: React.FormEvent) => event.preventDefault())
  render(<AdminAccessContext.Provider value={{ readOnly: false }}><AdminWriteForm aria-label="Edit" onSubmit={save}><AdminWriteButton>Save</AdminWriteButton><AdminWriteButton disabled>Busy</AdminWriteButton></AdminWriteForm></AdminAccessContext.Provider>)
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)
  expect((screen.getByRole('button', { name: 'Busy' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.submit(screen.getByRole('form'))
  expect(save).toHaveBeenCalledOnce()
})
