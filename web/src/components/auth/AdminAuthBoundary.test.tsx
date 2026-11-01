import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import AdminAuthBoundary from './AdminAuthBoundary';
import { useAuthContext } from '../../contexts/AuthContext';

const mocks = vi.hoisted(() => ({ token: vi.fn(), setGetter: vi.fn(), provider: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: (props: { children: ReactNode; afterSignOutUrl: string }) => { mocks.provider(props.afterSignOutUrl); return props.children; },
  useAuth: () => ({ getToken: mocks.token, isLoaded: true, isSignedIn: true, userId: 'staff-123' }),
}));
vi.mock('../../services/api', () => ({ setAuthTokenGetter: mocks.setGetter }));
vi.mock('../../providers/PostHogProvider', () => ({ PostHogIdentitySync: () => null }));
function Consumer() { const auth = useAuthContext(); return <output>{JSON.stringify(auth)}</output>; }
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it('fails closed without a configured Clerk key', () => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '');
  render(<AdminAuthBoundary><Consumer /></AdminAuthBoundary>);
  expect(mocks.provider).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('"isClerkEnabled":false');
});

it('provides Clerk state on admin routes and removes the token getter on unmount', async () => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_example');
  mocks.token.mockResolvedValue('test-token');
  const view = render(<AdminAuthBoundary><Consumer /></AdminAuthBoundary>);
  expect(mocks.provider).toHaveBeenCalledWith('/');
  expect(screen.getByRole('status').textContent).toContain('"userId":"staff-123"');
  const getToken = mocks.setGetter.mock.calls.at(-1)![0];
  expect(await getToken({ skipCache: true })).toBe('test-token');
  expect(mocks.token).toHaveBeenCalledWith({ skipCache: true });
  view.unmount();
  expect(await mocks.setGetter.mock.calls.at(-1)![0]()).toBeNull();
});
