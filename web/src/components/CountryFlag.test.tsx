import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import CountryFlag from './CountryFlag'

afterEach(cleanup)
it('shows a text badge for an unknown country instead of requesting a broken URL', () => {
  render(<CountryFlag code=" xyz " />)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('XYZ')).toBeTruthy()
})
it('falls back to text on an image failure and recovers when the country changes', () => {
  const { rerender } = render(<CountryFlag code="GUM" />)
  expect(screen.getByRole('img').getAttribute('src')).toBe('https://flagcdn.com/w40/gu.png')
  fireEvent.error(screen.getByRole('img'))
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('GUM')).toBeTruthy()
  rerender(<CountryFlag code="JPN" label="Japan" />)
  expect(screen.getByRole('img', { name: 'Japan' }).getAttribute('src')).toBe('https://flagcdn.com/w40/jp.png')
})
it('renders nothing for an empty code', () => {
  const { container } = render(<CountryFlag code=" " />)
  expect(container.innerHTML).toBe('')
})
