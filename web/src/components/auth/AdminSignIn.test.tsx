import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminSignIn from './AdminSignIn'

vi.mock('@clerk/clerk-react', () => ({
  SignIn: ({ withSignUp }: { withSignUp: boolean }) => <div data-testid="sign-in" data-signup={String(withSignUp)} />,
  SignUp: () => <div data-testid="sign-up" />,
}))
afterEach(cleanup)

it.each([
  ['/admin', 'sign-in'],
  ['/admin?__clerk_status=sign_up', 'sign-in'],
  ['/admin?__clerk_ticket=', 'sign-in'],
  ['/admin?__clerk_ticket=ticket', 'sign-up'],
  ['/admin?__clerk_ticket=ticket&__clerk_status=sign_up', 'sign-up'],
  ['/admin?__clerk_ticket=ticket&__clerk_status=sign_in', 'sign-in'],
])('selects the invitation flow for %s', (path, flow) => {
  render(<MemoryRouter initialEntries={[path]}><AdminSignIn /></MemoryRouter>)
  expect(screen.getByTestId(flow)).toBeTruthy()
  if (flow === 'sign-in') expect(screen.getByTestId(flow).getAttribute('data-signup')).toBe('false')
})
