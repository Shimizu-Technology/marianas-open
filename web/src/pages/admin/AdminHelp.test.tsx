import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminHelp from './AdminHelp'

afterEach(cleanup)
it('renders every staff task with a relevant admin destination and role guidance', () => {
  render(<MemoryRouter><AdminHelp /></MemoryRouter>)
  expect(screen.getByRole('heading', { level: 1, name: 'Staff help' })).toBeTruthy()
  const destinations = ['/admin/events', '/admin/events', '/admin/photos', '/admin/sponsors', '/admin/videos', '/admin/users']
  const sections = screen.getAllByRole('region')
  expect(sections.length).toBe(6)
  sections.forEach((section, index) => {
    expect(within(section).getByRole('list').children.length).toBeGreaterThanOrEqual(2)
    expect(within(section).getAllByRole('link')[0].getAttribute('href')).toBe(destinations[index])
  })
  expect(screen.getByText(/Held means the proposed changes/)).toBeTruthy()
  expect(screen.getByText(/Viewer can read/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Open ASJJF sync' }).getAttribute('href')).toBe('/admin/asjjf')
})
