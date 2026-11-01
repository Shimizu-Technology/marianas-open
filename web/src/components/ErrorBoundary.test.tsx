import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { reportError } from '../monitoring'

vi.mock('../monitoring', () => ({ reportError: vi.fn() }))
afterEach(cleanup)

it('renders children when healthy', () => {
  render(createElement(ErrorBoundary, { children: createElement('p', null, 'Events') }))
  expect(screen.getByText('Events')).toBeTruthy()
})

it('offers recovery and reports render failures without exposing the error', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function Broken(): never { throw new Error('private debug details') }
  const onReload = vi.fn()
  render(createElement(ErrorBoundary, { onReload, children: createElement(Broken) }))
  expect(screen.getByRole('heading').textContent).toContain('back to the action')
  expect(screen.queryByText('private debug details')).toBeNull()
  expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Reload page' }))
  expect(onReload).toHaveBeenCalledTimes(1)
  expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.any(String))
})
