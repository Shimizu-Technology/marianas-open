import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const client = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn(), get_property: vi.fn() }));
vi.mock('posthog-js', () => ({ default: client }));
const auth = vi.hoisted(() => ({ isSignedIn: false, userId: null as string | null, isLoading: false }));
vi.mock('../contexts/AuthContext', () => ({ useAuthContext: () => auth }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('waits for a paint and idle time, then captures one pageview without duplicating it on rerender', async () => {
  vi.resetModules();
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'phc_test');
  const frames: FrameRequestCallback[] = [];
  let idle: IdleRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => { idle = cb; return 1; });
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  const { PostHogProvider, PostHogPageView } = await import('./PostHogProvider');
  function NavigateBeforeIdle() { const navigate = useNavigate(); return <button onClick={() => navigate('/rankings?type=team')}>Navigate</button>; }
  const ui = <MemoryRouter initialEntries={['/calendar?year=2027']}><PostHogProvider><PostHogPageView /><NavigateBeforeIdle /></PostHogProvider></MemoryRouter>;
  const view = render(ui);
  expect(client.init).not.toHaveBeenCalled();
  act(() => frames.shift()!(0));
  expect(client.init).not.toHaveBeenCalled();
  act(() => frames.shift()!(16));
  expect(client.init).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  await act(async () => idle!({ didTimeout: false, timeRemaining: () => 50 }));
  await waitFor(() => expect(client.capture).toHaveBeenCalledTimes(1));
  expect(client.capture).toHaveBeenCalledWith('$pageview', expect.objectContaining({ $pathname: '/rankings', $search: '?type=team' }));
  view.rerender(ui);
  expect(client.init).toHaveBeenCalledTimes(1);
  expect(client.capture).toHaveBeenCalledTimes(1);
});

it('resets a persisted staff identity when returning to admin anonymously after an unmount', async () => {
  // Initialize a client through the same deferred provider path.
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'phc_test');
  vi.resetModules();
  const module = await import('./PostHogProvider');
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => { cb({ didTimeout: false, timeRemaining: () => 50 }); return 1; });
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  auth.isSignedIn = true; auth.userId = 'staff-123';
  const view = render(<module.PostHogProvider><module.PostHogIdentitySync /></module.PostHogProvider>);
  act(() => frames.shift()!(0)); act(() => frames.shift()!(16));
  await waitFor(() => expect(client.identify).toHaveBeenCalledWith('staff-123', { user_id: 'staff-123' }));
  view.rerender(<module.PostHogProvider><div>Public page</div></module.PostHogProvider>);
  auth.isSignedIn = false; auth.userId = null;
  client.get_property.mockReturnValue('staff-123');
  view.rerender(<module.PostHogProvider><module.PostHogIdentitySync /></module.PostHogProvider>);
  expect(client.get_property).toHaveBeenCalledWith('$user_id');
  expect(client.reset).toHaveBeenCalledTimes(1);
});
