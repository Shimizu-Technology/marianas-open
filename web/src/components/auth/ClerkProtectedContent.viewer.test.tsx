import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ClerkProtectedContent from './ClerkProtectedContent'
import { api, type UserProfile } from '../../services/api'

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => 'test' }), SignOutButton: ({ children }: { children: React.ReactNode }) => children }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each(['admin', 'staff', 'viewer'] as const)('admits an invited %s to shared admin routes', async role => {
  vi.spyOn(api, 'getCurrentUser').mockResolvedValue({ user: { role, is_admin: role === 'admin', is_staff: role !== 'viewer' } as UserProfile })
  render(<ClerkProtectedContent requiredRole="viewer"><h1>Shared admin page</h1></ClerkProtectedContent>)
  await screen.findByRole('heading', { name: 'Shared admin page' })
})
it('keeps admin-only pages unavailable to a viewer', async () => {
  vi.spyOn(api, 'getCurrentUser').mockResolvedValue({ user: { role: 'viewer', is_admin: false, is_staff: false } as UserProfile })
  render(<ClerkProtectedContent requiredRole="admin"><h1>Users</h1></ClerkProtectedContent>)
  await screen.findByRole('heading', { name: 'Access Denied' })
  expect(screen.queryByRole('heading', { name: 'Users' })).toBeNull()
})
